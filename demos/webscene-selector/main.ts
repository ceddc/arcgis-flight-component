import ArcGISMap from "@arcgis/core/Map.js";
import SpatialReference from "@arcgis/core/geometry/SpatialReference.js";
import * as projectOperator from "@arcgis/core/geometry/operators/projectOperator.js";
import Constraints from "@arcgis/core/views/3d/constraints/Constraints.js";
import PortalItem from "@arcgis/core/portal/PortalItem.js";
import WebScene from "@arcgis/core/WebScene.js";
import "@arcgis/map-components/components/arcgis-scene";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-block";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-chip";
import "@esri/calcite-components/components/calcite-dialog";
import "@esri/calcite-components/components/calcite-input-text";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-list";
import "@esri/calcite-components/components/calcite-list-item";
import "@esri/calcite-components/components/calcite-navigation";
import "@esri/calcite-components/components/calcite-navigation-logo";
import "@esri/calcite-components/components/calcite-notice";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-slider";
import "@esri/calcite-components/components/calcite-switch";
import "@esri/calcite-components/components/calcite-tab";
import "@esri/calcite-components/components/calcite-tab-nav";
import "@esri/calcite-components/components/calcite-tab-title";
import "@esri/calcite-components/components/calcite-tabs";
import "@esri/calcite-components/main.css";
import "../../src/components/arcgis-plane-navigation";
import type { ArcgisPlaneNavigationElement } from "../../src/components/arcgis-plane-navigation";
import type { PlaneNavigationStartConfig } from "../../src/config";
import {
  DEMO_SCENE_PRESETS,
  normalizeArcGISItemId,
  type DemoScenePreset,
} from "./lib/scenes";
import {
  loadPublicWebScene,
  withLoadTimeout,
} from "./lib/public-webscene-loader";
import {
  SceneActivationController,
  type ActivatableDemoScene,
} from "./lib/scene-activation-controller";
import { disposeArcGISResource } from "./lib/scene-resources";
import {
  searchAddresses,
  type AddressSearchResult,
} from "./lib/address-search";
import { supportedFlightLocale } from "../../src/i18n";
import { setupDemoUi } from "../shared/demo-ui";
import { mountFlightControls } from "../shared/flight-controls";
import "./style.css";

const SCENE_LOAD_TIMEOUT_MS = 60_000;
const PUBLIC_WEBSCENE_FALLBACK_ALTITUDE_M = 1_200;
const DEFAULT_START_SPEED_MPS = 100;

type StatusTone = "loading" | "ready" | "error";

const STATUS_APPEARANCE = {
  loading: { icon: "information", noticeKind: "brand" },
  ready: { icon: "check-circle", noticeKind: "brand" },
  error: { icon: "exclamation-mark-triangle", noticeKind: "danger" },
} as const;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`The ArcGIS flight demo is missing ${selector}.`);
  return element;
}

let scene = requiredElement<HTMLArcgisSceneElement>("#flight-scene");
let retiredScene: HTMLArcgisSceneElement | null = null;
const navigation = requiredElement<ArcgisPlaneNavigationElement>("#plane-navigation");
const statusOutput = document.querySelector<HTMLCalciteChipElement>("[data-status]");
const sceneTitle = document.querySelector<HTMLCalciteNavigationLogoElement>(
  "[data-scene-title]",
);
const settingsPanel = document.querySelector<HTMLCalcitePanelElement>("#settings-panel");
const settingsShellPanel = document.querySelector<HTMLCalciteShellPanelElement>(
  "#settings-shell-panel",
);
const settingsToggle = document.querySelector<HTMLCalciteActionElement>("#settings-toggle");
const sceneToggle = document.querySelector<HTMLCalciteActionElement>("#scene-toggle");
const sensitivity = document.querySelector<HTMLCalciteSliderElement>("#sensitivity");
const fov = document.querySelector<HTMLCalciteSliderElement>("#fov");
const invertPitch = document.querySelector<HTMLCalciteSwitchElement>("#invert-pitch");
const cameraRoll = document.querySelector<HTMLCalciteSwitchElement>("#camera-roll");
const scenePicker = requiredElement<HTMLCalciteDialogElement>("#scene-picker");
const sceneGrid = requiredElement<HTMLCalciteListElement>("[data-scene-grid]");
const addressSearchForm = requiredElement<HTMLFormElement>("#address-search-form");
const addressSearchInput = requiredElement<HTMLCalciteInputTextElement>("#address-search");
const addressSearchButton = requiredElement<HTMLCalciteButtonElement>(
  "#address-search-submit",
);
const addressSearchResults = requiredElement<HTMLCalciteListElement>(
  "#address-search-results",
);
const addressSearchSummary = requiredElement<HTMLElement>(
  "[data-address-search-summary]",
);
const itemIdForm = requiredElement<HTMLFormElement>("#item-id-form");
const itemIdInput = requiredElement<HTMLCalciteInputTextElement>("#webscene-item-id");
const sceneLoadNotice = requiredElement<HTMLCalciteNoticeElement>("#scene-load-notice");
const sceneLoadStatus = requiredElement<HTMLElement>("[data-scene-load-status]");
const requestedLocale = supportedFlightLocale(
  new URL(window.location.href).searchParams.get("lang"),
);
if (requestedLocale) {
  navigation.updateConfig({ ui: { locale: requestedLocale } });
}

interface DemoSceneViewConfiguration {
  viewingMode: "global" | "local";
  spatialReference: SpatialReference;
}

const GLOBAL_VIEW_CONFIGURATION: DemoSceneViewConfiguration = {
  viewingMode: "global",
  spatialReference: SpatialReference.WebMercator,
};

type ActiveDemoScene = ActivatableDemoScene<
  ArcGISMap,
  PlaneNavigationStartConfig,
  DemoSceneViewConfiguration
>;

let activeScene: ActiveDemoScene | null = null;
let busy = false;
let resumeAfterPicker = false;
let sceneLayerWarning: string | null = null;
let addressSearchController: AbortController | null = null;
const narrowLayout = window.matchMedia("(max-width: 720px)");

function syncSettingsDisplayMode(): void {
  if (!settingsShellPanel) return;
  settingsShellPanel.displayMode = narrowLayout.matches ? "overlay" : "dock";
}

syncSettingsDisplayMode();
narrowLayout.addEventListener("change", syncSettingsDisplayMode);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function disposeDemoResource(
  resource: Parameters<typeof disposeArcGISResource>[0],
): void {
  try {
    disposeArcGISResource(resource);
  } catch (error) {
    console.warn("ArcGIS demo resource cleanup failed.", error);
  }
}

function createBaseSceneMap(): ArcGISMap {
  return new ArcGISMap({
    basemap: "satellite",
    ground: "world-elevation",
  });
}

function createBaseDemoScene(
  title: string,
  start?: PlaneNavigationStartConfig,
): ActiveDemoScene {
  return {
    map: createBaseSceneMap(),
    title,
    start,
    itemId: null,
    viewConfiguration: GLOBAL_VIEW_CONFIGURATION,
  };
}

function setStatus(
  label: string,
  tone: StatusTone = "loading",
): void {
  if (!statusOutput) return;
  statusOutput.textContent = label;
  statusOutput.label = label;
  statusOutput.icon = STATUS_APPEARANCE[tone].icon;
}

function setSceneLoadStatus(
  label: string,
  tone: StatusTone = "loading",
): void {
  sceneLoadStatus.textContent = label;
  const appearance = STATUS_APPEARANCE[tone];
  sceneLoadNotice.kind = appearance.noticeKind;
  sceneLoadNotice.icon = appearance.icon;
  sceneLoadNotice.open = busy || tone === "error";
}

function setReadyStatus(label: string): void {
  if (sceneLayerWarning) setStatus(sceneLayerWarning, "error");
  else setStatus(label, "ready");
}

function syncPickerDismissal(): void {
  const dismissalDisabled = busy || activeScene === null;
  scenePicker.closeDisabled = dismissalDisabled;
  scenePicker.escapeDisabled = dismissalDisabled;
  scenePicker.outsideCloseDisabled = dismissalDisabled;
}

function setBusy(next: boolean): void {
  busy = next;
  if (!next && sceneLoadNotice.kind !== "danger") sceneLoadNotice.open = false;
  scenePicker.loading = next;
  syncPickerDismissal();
  for (const control of scenePicker.querySelectorAll<HTMLElement & { disabled?: boolean }>(
    "calcite-button, calcite-input-text, calcite-list-item",
  )) {
    control.disabled = next;
  }
}

function toggleSettings(open: boolean): void {
  if (!settingsShellPanel) return;
  settingsShellPanel.hidden = !open;
  settingsToggle?.toggleAttribute("active", open);
}

function openScenePicker(): void {
  if (scenePicker.open || busy) return;
  toggleSettings(false);
  resumeAfterPicker = navigation.status === "running";
  if (resumeAfterPicker) navigation.pause();
  syncPickerDismissal();
  if (sceneLayerWarning) setSceneLoadStatus(sceneLayerWarning, "error");
  else {
    setSceneLoadStatus(
      activeScene
        ? `Currently flying ${activeScene.title}.`
        : "Choose a starting point to begin.",
      activeScene ? "ready" : "loading",
    );
  }
  scenePicker.open = true;
}

function selectionListItem(
  label: string,
  description: string,
  select: () => void,
): HTMLCalciteListItemElement {
  const item = document.createElement("calcite-list-item");
  item.label = label;
  item.description = description;
  item.iconStart = "pin";
  item.iconEnd = "chevron-right";
  item.addEventListener("click", select);
  return item;
}

function presetListItem(preset: DemoScenePreset): HTMLCalciteListItemElement {
  return selectionListItem(
    preset.title,
    preset.location,
    () => void loadPreset(preset),
  );
}

sceneGrid.append(...DEMO_SCENE_PRESETS.map(presetListItem));

function addressResultListItem(
  result: AddressSearchResult,
): HTMLCalciteListItemElement {
  return selectionListItem(
    result.label,
    result.description,
    () => void loadSelection(result.label, () => createBaseDemoScene(
      result.label,
      {
        longitude: result.longitude,
        latitude: result.latitude,
        headingDeg: 90,
        speedMps: DEFAULT_START_SPEED_MPS,
      },
    )),
  );
}

function emptySearchResult(message: string): HTMLElement {
  const empty = document.createElement("div");
  empty.slot = "empty-content";
  empty.className = "empty-results";
  empty.textContent = message;
  return empty;
}

async function refreshAddressSearch(searchText: string): Promise<void> {
  const query = searchText.trim();
  if (!query) {
    addressSearchInput.status = "invalid";
    addressSearchInput.validationIcon = "exclamation-mark-triangle";
    addressSearchInput.validationMessage = "Enter a place or address.";
    addressSearchSummary.textContent = "A place or address is required.";
    addressSearchResults.replaceChildren(
      emptySearchResult("Enter a place, landmark, or address."),
    );
    await addressSearchInput.setFocus();
    return;
  }
  addressSearchInput.status = "idle";
  addressSearchInput.validationIcon = false;
  addressSearchInput.validationMessage = "";
  addressSearchController?.abort();
  const controller = new AbortController();
  addressSearchController = controller;
  addressSearchInput.loading = true;
  addressSearchButton.loading = true;
  addressSearchResults.loading = true;
  addressSearchSummary.textContent = `Searching for "${query}"...`;
  try {
    const results = await searchAddresses(query, {
      signal: controller.signal,
    });
    if (addressSearchController !== controller) return;
    addressSearchResults.replaceChildren(
      emptySearchResult("No matching places or addresses were found."),
      ...results.map(addressResultListItem),
    );
    addressSearchSummary.textContent = `${results.length} address ${
      results.length === 1 ? "match" : "matches"
    }. Select one to start flying there.`;
  } catch (error) {
    if (isAbortError(error)) return;
    addressSearchResults.replaceChildren();
    addressSearchSummary.textContent = `Address search unavailable: ${errorMessage(error)}`;
  } finally {
    if (addressSearchController === controller) {
      addressSearchController = null;
      addressSearchInput.loading = false;
      addressSearchButton.loading = false;
      addressSearchResults.loading = false;
    }
  }
}

async function publicWebScene(itemId: string): Promise<ActiveDemoScene> {
  const loaded = await loadPublicWebScene(itemId, {
    createPortalItem: (id) => new PortalItem({ id }),
    createWebScene: (portalItem) => new WebScene({ portalItem }),
    timeoutMs: SCENE_LOAD_TIMEOUT_MS,
    onCleanupError: (error) => {
      console.warn("ArcGIS demo resource cleanup failed.", error);
    },
  });
  return {
    ...loaded,
    start: { altitudeM: PUBLIC_WEBSCENE_FALLBACK_ALTITUDE_M },
    viewConfiguration: GLOBAL_VIEW_CONFIGURATION,
  };
}

function startPatch(start?: PlaneNavigationStartConfig): PlaneNavigationStartConfig {
  return {
    longitude: start?.longitude,
    latitude: start?.latitude,
    altitudeM: start?.altitudeM,
    headingDeg: start?.headingDeg,
    speedMps: start?.speedMps ?? DEFAULT_START_SPEED_MPS,
  };
}

function matchesViewConfiguration(
  targetScene: HTMLArcgisSceneElement,
  viewConfiguration: DemoSceneViewConfiguration,
): boolean {
  return (
    targetScene.viewingMode === viewConfiguration.viewingMode
    && targetScene.spatialReference.wkid === viewConfiguration.spatialReference.wkid
  );
}

async function replaceSceneHost(
  map: ArcGISMap,
  viewConfiguration: DemoSceneViewConfiguration,
): Promise<void> {
  if (retiredScene?.map === map && matchesViewConfiguration(
    retiredScene,
    viewConfiguration,
  )) {
    const failedScene = scene;
    const restoredScene = retiredScene;
    retiredScene = null;
    failedScene.autoDestroyDisabled = true;
    restoredScene.autoDestroyDisabled = false;
    scene = restoredScene;
    failedScene.replaceWith(restoredScene);
    await failedScene.destroy();
    return;
  }

  // SceneView viewing mode is fixed after creation. Keep the previous host
  // alive until navigation starts so a failed activation can restore it.
  const previousScene = scene;
  previousScene.autoDestroyDisabled = true;
  retiredScene = previousScene;

  const replacement = document.createElement("arcgis-scene");
  replacement.id = previousScene.id;
  replacement.popupDisabled = true;
  replacement.setAttribute("aria-label", "ArcGIS 3D flight scene");
  replacement.viewingMode = viewConfiguration.viewingMode;
  replacement.spatialReference = viewConfiguration.spatialReference;
  if (viewConfiguration.viewingMode === "local") {
    // The automatic horizon clip can hide the aircraft about 20 m ahead.
    // This demo owns the view and its local-scene clipping policy.
    replacement.constraints = new Constraints({ clipDistance: { near: 1, far: 1_000_000 } });
  }
  replacement.map = map;
  attachSceneLoadErrorListener(replacement);
  scene = replacement;
  previousScene.replaceWith(replacement);
}

async function destroyRetiredScene(): Promise<void> {
  const target = retiredScene;
  if (!target) return;
  retiredScene = null;
  await target.destroy();
}

async function replaceSceneMap(
  map: ArcGISMap,
  viewConfiguration = GLOBAL_VIEW_CONFIGURATION,
): Promise<void> {
  const coordinateSystemChanged = !matchesViewConfiguration(
    scene,
    viewConfiguration,
  );
  if (coordinateSystemChanged && !projectOperator.isLoaded()) {
    await projectOperator.load();
  }

  if (coordinateSystemChanged) {
    await replaceSceneHost(map, viewConfiguration);
  } else {
    scene.map = map;
  }

  const targetScene = scene;
  let removeErrorListener = (): void => undefined;
  const fatalError = new Promise<never>((_resolve, reject) => {
    const onReadyError = (): void => {
      if (targetScene.map !== map) return;
      reject(
        targetScene.fatalError
        ?? new Error("The ArcGIS scene failed to initialize."),
      );
    };
    targetScene.addEventListener("arcgisViewReadyError", onReadyError);
    removeErrorListener = () => targetScene.removeEventListener(
      "arcgisViewReadyError",
      onReadyError,
    );
  });
  try {
    const ready = (async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await targetScene.viewOnReady();
      if (scene !== targetScene || targetScene.map !== map) {
        throw new Error("A newer scene replaced this request.");
      }
      if (
        targetScene.view.viewingMode !== viewConfiguration.viewingMode
        || targetScene.view.spatialReference.wkid
          !== viewConfiguration.spatialReference.wkid
      ) {
        throw new Error("The ArcGIS scene did not apply the requested coordinate system.");
      }
    })();
    await withLoadTimeout(Promise.race([ready, fatalError]), {
      timeoutMs: SCENE_LOAD_TIMEOUT_MS,
      message: "The ArcGIS scene did not become ready within 60 seconds.",
    });
  } finally {
    removeErrorListener();
  }
}

const sceneController = new SceneActivationController<
  ArcGISMap,
  PlaneNavigationStartConfig,
  DemoSceneViewConfiguration
>({
  getCurrentMap: () => scene.map ?? null,
  clearNavigation: () => {
    navigation.stop({ restoreCamera: true });
    navigation.referenceElement = null;
  },
  replaceMap: replaceSceneMap,
  async startNavigation(start, powerMode) {
    navigation.updateConfig({ start: startPatch(start), powerMode: powerMode ?? "normal" });
    if (navigation.referenceElement !== scene) navigation.referenceElement = scene;
    await navigation.start();
    await destroyRetiredScene();
  },
  createFallbackMap: createBaseSceneMap,
  disposeMap: disposeDemoResource,
  isDestroyed: (map) => map.destroyed,
  onActiveSceneChange(next) {
    activeScene = next;
    if (sceneTitle) {
      sceneTitle.description = next?.title ?? "Choose a starting point";
    }
    syncPickerDismissal();
  },
});

async function activateScene(next: ActiveDemoScene): Promise<void> {
  await sceneController.activate(next);
  resumeAfterPicker = false;
  scenePicker.open = false;
  scene.focus();
  setReadyStatus("Ready to fly");
}

async function loadSelection(
  label: string,
  create: () => ActiveDemoScene | Promise<ActiveDemoScene>,
): Promise<void> {
  if (busy) return;
  setBusy(true);
  sceneLayerWarning = null;
  setStatus(`Loading ${label}`, "loading");
  setSceneLoadStatus(`Loading ${label}...`, "loading");
  try {
    const candidate = await create();
    await activateScene(candidate);
    if (sceneLayerWarning) setSceneLoadStatus(sceneLayerWarning, "error");
    else setSceneLoadStatus(`${candidate.title} is ready.`, "ready");
  } catch (error) {
    const message = errorMessage(error);
    setStatus("Scene load failed", "error");
    setSceneLoadStatus(message, "error");
  } finally {
    setBusy(false);
  }
}

async function loadPreset(preset: DemoScenePreset): Promise<void> {
  await loadSelection(preset.title, () => createBaseDemoScene(preset.title, preset.start));
}

settingsToggle?.addEventListener("click", () => {
  toggleSettings(Boolean(settingsShellPanel?.hidden));
});
settingsPanel?.addEventListener("calcitePanelClose", () => toggleSettings(false));
sceneToggle?.addEventListener("click", openScenePicker);
scenePicker.addEventListener("calciteDialogClose", () => {
  if (resumeAfterPicker && navigation.status === "paused") navigation.resume();
  resumeAfterPicker = false;
});

addressSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void refreshAddressSearch(addressSearchInput.value);
});
addressSearchInput.addEventListener("calciteInputTextInput", () => {
  if (!addressSearchInput.value.trim()) return;
  addressSearchInput.status = "idle";
  addressSearchInput.validationIcon = false;
  addressSearchInput.validationMessage = "";
});

itemIdForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const itemId = normalizeArcGISItemId(itemIdInput.value);
  if (!itemId) {
    setSceneLoadStatus("Enter exactly 32 hexadecimal characters.", "error");
    void itemIdInput.setFocus();
    return;
  }
  void loadSelection("WebScene", () => publicWebScene(itemId));
});

sensitivity?.addEventListener("calciteSliderInput", () => {
  navigation.updateConfig({
    controls: { sensitivity: Number(sensitivity.value) },
  });
});

fov?.addEventListener("calciteSliderInput", () => {
  navigation.updateConfig({
    camera: { fovDeg: Number(fov.value) },
  });
});

invertPitch?.addEventListener("calciteSwitchChange", () => {
  navigation.updateConfig({
    controls: { invertPitch: invertPitch.checked },
  });
});

cameraRoll?.addEventListener("calciteSwitchChange", () => {
  navigation.updateConfig({
    camera: { bankedViewport: cameraRoll.checked },
  });
});

navigation.addEventListener("arcgisPlaneNavigationReady", () => {
  setReadyStatus("Scene ready");
});

navigation.addEventListener("arcgisPlaneNavigationSnapshot", (event) => {
  if (event.detail.snapshot.phase === "paused") {
    setReadyStatus("Flight paused");
  } else if (event.detail.snapshot.phase === "running") {
    setReadyStatus("Ready to fly");
  }
});

navigation.addEventListener("arcgisPlaneNavigationError", (event) => {
  setStatus(event.detail.error.message, "error");
});

function attachSceneLoadErrorListener(targetScene: HTMLArcgisSceneElement): void {
  targetScene.addEventListener("arcgisLoadError", () => {
    const count = targetScene.loadErrorSources?.length ?? 0;
    if (count === 0) return;
    sceneLayerWarning = `The scene opened with ${count} ArcGIS layer ${
      count === 1 ? "warning" : "warnings"
    }.`;
    setStatus(sceneLayerWarning, "error");
    setSceneLoadStatus(sceneLayerWarning, "error");
  });
}

attachSceneLoadErrorListener(scene);

setupDemoUi();
mountFlightControls(navigation, requiredElement<HTMLElement>(".flight-stage"));
queueMicrotask(openScenePicker);
