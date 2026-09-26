/**
 * Scene-explorer demo controller. Connects the Calcite tabs/settings UI to a
 * reusable ArcGIS scene host, built-in and geocoded flight starts, and public
 * WebScenes. Scene switching is isolated behind SceneActivationController so
 * failed map/view setup can roll back before the old resources are destroyed.
 */
import ArcGISMap from "@arcgis/core/Map.js";
import esriConfig from "@arcgis/core/config.js";
import Point from "@arcgis/core/geometry/Point.js";
import SpatialReference from "@arcgis/core/geometry/SpatialReference.js";
import * as projectOperator from "@arcgis/core/geometry/operators/projectOperator.js";
import Constraints from "@arcgis/core/views/3d/constraints/Constraints.js";
import PortalItem from "@arcgis/core/portal/PortalItem.js";
import WebScene from "@arcgis/core/WebScene.js";
import "@arcgis/map-components/components/arcgis-scene";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-block";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-card";
import "@esri/calcite-components/components/calcite-chip";
import "@esri/calcite-components/components/calcite-input-text";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-link";
import "@esri/calcite-components/components/calcite-list";
import "@esri/calcite-components/components/calcite-list-item";
import "@esri/calcite-components/components/calcite-navigation";
import "@esri/calcite-components/components/calcite-navigation-logo";
import "@esri/calcite-components/components/calcite-notice";
import "@esri/calcite-components/components/calcite-option";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-select";
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
  verifyPublicWebSceneAccess,
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
import {
  DEFAULT_WEBSCENE_QUERY,
  DEFAULT_WEBSCENE_SORT,
  searchPublicWebScenes,
  type WebSceneSearchResult,
  type WebSceneSearchSort,
} from "./lib/webscene-search";
import { supportedFlightLocale } from "../../src/i18n";
import { setupDemoUi } from "../shared/demo-ui";
import { mountFlightControls } from "../shared/flight-controls";
import "./style.css";

const SCENE_LOAD_TIMEOUT_MS = 60_000;
// This public demo never requests ArcGIS credentials, including for private layers inside a shared WebScene.
esriConfig.request.useIdentity = false;
const DEFAULT_START_SPEED_MPS = 100;
/** Custom WebScenes start this high above the ground, below most city skylines. */
const WEBSCENE_START_HEIGHT_M = 150;
/** Start this far short of the point the scene's camera looks at, so flight heads into it. */
const WEBSCENE_APPROACH_DISTANCE_M = 1_500;

type StatusTone = "loading" | "ready" | "error";

const STATUS_APPEARANCE = {
  loading: { icon: "information", noticeKind: "brand" },
  ready: { icon: "check-circle", noticeKind: "brand" },
  error: { icon: "exclamation-mark-triangle", noticeKind: "danger" },
} as const;

/**
 * Reads a required page element and fails early when the HTML/entry point drift.
 *
 * @param selector CSS selector for the element.
 * @returns The matched element with the caller's expected element type.
 * @throws If no matching element exists.
 */
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
const sensitivity = document.querySelector<HTMLCalciteSliderElement>("#sensitivity");
const fov = document.querySelector<HTMLCalciteSliderElement>("#fov");
const invertPitch = document.querySelector<HTMLCalciteSwitchElement>("#invert-pitch");
const cameraRoll = document.querySelector<HTMLCalciteSwitchElement>("#camera-roll");
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
const websceneSearchForm = requiredElement<HTMLFormElement>("#webscene-search-form");
const websceneSearchInput = requiredElement<HTMLCalciteInputTextElement>("#webscene-search");
const websceneSearchButton = requiredElement<HTMLCalciteButtonElement>("#webscene-search-submit");
const websceneSort = requiredElement<HTMLCalciteSelectElement>("#webscene-sort");
const websceneResults = requiredElement<HTMLElement>("#webscene-results");
const websceneSearchSummary = requiredElement<HTMLElement>("[data-webscene-search-summary]");
const gaussianSearchButton = requiredElement<HTMLCalciteButtonElement>("#webscene-gaussian-search");
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

let busy = false;
let activeSelection: AbortController | null = null;
let activating = false;
let sceneLayerWarning: string | null = null;
let addressSearchController: AbortController | null = null;
let websceneSearchController: AbortController | null = null;
const narrowLayout = window.matchMedia("(max-width: 720px)");

/** Switches the settings shell between a docked desktop panel and mobile overlay. */
function syncSettingsDisplayMode(): void {
  if (!settingsShellPanel) return;
  settingsShellPanel.displayMode = narrowLayout.matches ? "overlay" : "dock";
}

syncSettingsDisplayMode();
narrowLayout.addEventListener("change", syncSettingsDisplayMode);

/** Converts thrown values to readable status text without losing strings. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Identifies user/request cancellation so it does not appear as a search error. */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Releases an owned ArcGIS object while keeping cleanup errors non-fatal to UI. */
function disposeDemoResource(
  resource: Parameters<typeof disposeArcGISResource>[0],
): void {
  try {
    disposeArcGISResource(resource);
  } catch (error) {
    console.warn("ArcGIS demo resource cleanup failed.", error);
  }
}

/** Creates the common satellite/world-elevation map used by place searches. */
function createBaseSceneMap(): ArcGISMap {
  return new ArcGISMap({
    basemap: "satellite",
    ground: "world-elevation",
  });
}

/**
 * Creates a built-in/search result scene around the common basemap.
 *
 * @param title Display title for the selected destination.
 * @param start Optional coordinates and heading for the flight component.
 * @returns Scene activation data with global Web Mercator view settings.
 */
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

/** Updates the compact Calcite status chip when it is present in the page. */
function setStatus(
  label: string,
  tone: StatusTone = "loading",
): void {
  if (!statusOutput) return;
  statusOutput.textContent = label;
  statusOutput.label = label;
  statusOutput.icon = STATUS_APPEARANCE[tone].icon;
}

/** Updates the expanded scene-load notice and its loading/error appearance. */
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

/** Shows normal ready state unless one or more scene layers failed to load. */
function setReadyStatus(label: string): void {
  if (sceneLayerWarning) setStatus(sceneLayerWarning, "error");
  else setStatus(label, "ready");
}

/** Keeps the status notice visible while a scene is being loaded or activated. */
function setBusy(next: boolean): void {
  busy = next;
  if (!next && sceneLoadNotice.kind !== "danger") sceneLoadNotice.open = false;
}

/** Shows or hides the optional settings shell and synchronizes its action state. */
function toggleSettings(open: boolean): void {
  if (!settingsShellPanel) return;
  settingsShellPanel.hidden = !open;
  settingsToggle?.toggleAttribute("active", open);
}

/**
 * Creates one clickable Calcite list row for a destination.
 *
 * @param label Primary destination name.
 * @param description Secondary location text.
 * @param select Action invoked when the row is selected.
 * @returns A configured list item for the scene picker.
 */
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

/** Adapts a built-in preset into the common scene-selection row. */
function presetListItem(preset: DemoScenePreset): HTMLCalciteListItemElement {
  return selectionListItem(
    preset.title,
    preset.location,
    () => void loadPreset(preset),
  );
}

sceneGrid.append(...DEMO_SCENE_PRESETS.map(presetListItem));

/** Adapts a geocoder result and its WGS84 coordinates into a start row. */
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

/** Creates the list's slotted empty/loading/help message element. */
function emptySearchResult(message: string): HTMLElement {
  const empty = document.createElement("div");
  empty.slot = "empty-content";
  empty.className = "empty-results";
  empty.textContent = message;
  return empty;
}

/**
 * Searches for a place, replacing prior requests and rendering selectable hits.
 *
 * Empty input is reported locally. A new AbortController cancels the previous
 * request, and the identity check prevents an older response from replacing a
 * newer search's results.
 *
 * @param searchText Raw Calcite input value.
 */
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

/**
 * Derives a flight start from the WebScene's initial camera: facing the same
 * way, a little short of the point the camera looks at, and low above the
 * ground there. Returns `undefined` to use the component's default start
 * (view center, 300 m above ground) when the scene has no usable camera.
 *
 * @param webScene Loaded WebScene whose initial viewpoint frames its content.
 */
async function startFromSceneCamera(webScene: WebScene): Promise<PlaneNavigationStartConfig | undefined> {
  const camera = webScene.initialViewProperties.viewpoint?.camera;
  const position = camera?.position;
  if (!camera || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return undefined;
  const heading = Number.isFinite(camera.heading) ? camera.heading : 0;
  const tiltRadians = Math.min(Math.max(camera.tilt ?? 0, 0), 85) * Math.PI / 180;
  // Horizontal distance from the camera to where its view ray meets the ground.
  const lookDistance = Math.max(0, position.z ?? 0) * Math.tan(tiltRadians);
  const advance = Math.max(0, lookDistance - WEBSCENE_APPROACH_DISTANCE_M);
  const headingRadians = heading * Math.PI / 180;
  const startPoint = new Point({
    x: position.x + Math.sin(headingRadians) * advance,
    y: position.y + Math.cos(headingRadians) * advance,
    spatialReference: position.spatialReference,
  });
  if (!projectOperator.isLoaded()) await projectOperator.load();
  const geographic = projectOperator.execute(startPoint, SpatialReference.WGS84) as Point | null;
  if (!geographic || !Number.isFinite(geographic.longitude) || !Number.isFinite(geographic.latitude)) {
    return undefined;
  }
  let altitudeM: number | undefined;
  // Only metre-based scenes: the component handles other units with its default start.
  if ((startPoint.spatialReference?.metersPerUnit ?? 1) === 1) {
    try {
      await webScene.ground.load();
      const sampled = await webScene.ground.queryElevation(startPoint);
      const groundZ = (sampled.geometry as Point).z;
      if (groundZ !== undefined && Number.isFinite(groundZ)) altitudeM = groundZ + WEBSCENE_START_HEIGHT_M;
    } catch {
      // Without a ground sample the component starts 300 m above sampled ground.
    }
  }
  return {
    longitude: geographic.longitude!,
    latitude: geographic.latitude!,
    altitudeM,
    headingDeg: heading,
  };
}

/**
 * Loads and validates a public ArcGIS WebScene for plane navigation.
 *
 * @param itemId Normalized 32-character ArcGIS item ID.
 * @returns Activation data with a start near the scene's content and the
 *   scene's own view mode (global Web Mercator or local projected).
 * @throws On timeout, private/non-WebScene content, or incompatible coordinates.
 */
async function publicWebScene(itemId: string, signal: AbortSignal): Promise<ActiveDemoScene> {
  await verifyPublicWebSceneAccess(itemId, { signal });
  const loaded = await loadPublicWebScene(itemId, {
    createPortalItem: (id) => new PortalItem({ id, portal: { url: "https://www.arcgis.com", authMode: "no-prompt" } }),
    createWebScene: (portalItem) => new WebScene({ portalItem }),
    timeoutMs: SCENE_LOAD_TIMEOUT_MS,
    signal,
    onCleanupError: (error) => {
      console.warn("ArcGIS demo resource cleanup failed.", error);
    },
  });
  const initial = loaded.map.initialViewProperties;
  const viewConfiguration: DemoSceneViewConfiguration = initial.viewingMode === "local" && initial.spatialReference
    ? { viewingMode: "local", spatialReference: initial.spatialReference }
    : GLOBAL_VIEW_CONFIGURATION;
  return {
    ...loaded,
    start: await startFromSceneCamera(loaded.map),
    viewConfiguration,
  };
}

/** Builds a complete start object while defaulting only the omitted speed. */
function startPatch(start?: PlaneNavigationStartConfig): PlaneNavigationStartConfig {
  return {
    longitude: start?.longitude,
    latitude: start?.latitude,
    altitudeM: start?.altitudeM,
    headingDeg: start?.headingDeg,
    speedMps: start?.speedMps ?? DEFAULT_START_SPEED_MPS,
  };
}

/** Checks the SceneView settings that cannot be changed on an existing host. */
function matchesViewConfiguration(
  targetScene: HTMLArcgisSceneElement,
  viewConfiguration: DemoSceneViewConfiguration,
): boolean {
  return (
    targetScene.viewingMode === viewConfiguration.viewingMode
    && targetScene.spatialReference?.wkid === viewConfiguration.spatialReference.wkid
  );
}

/**
 * Reuses a compatible retired scene on rollback or replaces the scene element.
 *
 * SceneView viewing mode/projection are fixed at creation. The old host is kept
 * alive until flight activation succeeds so the activation controller can put
 * it back if the replacement fails.
 *
 * @param map Candidate ArcGIS map.
 * @param viewConfiguration Viewing mode and spatial reference for its host.
 */
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

/** Destroys the previous scene element once its replacement is active. */
async function destroyRetiredScene(): Promise<void> {
  const target = retiredScene;
  if (!target) return;
  retiredScene = null;
  await target.destroy();
}

/**
 * Assigns a map to a compatible host and waits for the corresponding view.
 *
 * When the requested projection/view mode differs, this first creates a new
 * scene host (loading projection support if needed); otherwise it reuses the
 * current scene element. A timeout and view-ready error reject the activation
 * promise, allowing the controller to roll back.
 *
 * @param map Candidate map to display.
 * @param viewConfiguration SceneView mode and projection; defaults to global
 *   Web Mercator for the curated and public-scene flows.
 */
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

// The adapter is the boundary between generic activation/rollback policy and
// this page's ArcGIS view, flight element, and resource lifecycle.
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
    if (sceneTitle) {
      sceneTitle.description = next?.title ?? "Choose a starting point";
    }
  },
});

/**
 * Activates a scene, then returns keyboard focus to the scene for steering.
 *
 * @param next Scene map, flight start, and optional view settings to activate.
 */
async function activateScene(next: ActiveDemoScene): Promise<void> {
  await sceneController.activate(next);
  scene.focus();
  setReadyStatus("Ready to fly");
}

/**
 * Runs one user selection through the shared loading/status/error lifecycle.
 *
 * A new choice cancels a pending load. Scene activation remains serialized;
 * stale candidates are discarded before they can replace the active map.
 *
 * @param label Text shown while the choice loads.
 * @param create Factory for either an immediate map or asynchronous WebScene.
 */
async function loadSelection(
  label: string,
  create: (signal: AbortSignal) => ActiveDemoScene | Promise<ActiveDemoScene>,
): Promise<void> {
  if (activating) return;
  activeSelection?.abort();
  const selection = new AbortController();
  activeSelection = selection;
  setBusy(true);
  sceneLayerWarning = null;
  setStatus(`Loading ${label}`, "loading");
  setSceneLoadStatus(`Loading ${label}...`, "loading");
  try {
    const candidate = await create(selection.signal);
    if (activeSelection !== selection) {
      disposeArcGISResource(candidate.map);
      return;
    }
    activating = true;
    await activateScene(candidate);
    if (sceneLayerWarning) setSceneLoadStatus(sceneLayerWarning, "error");
    else setSceneLoadStatus(`${candidate.title} is ready.`, "ready");
  } catch (error) {
    if (activeSelection !== selection) return;
    const message = errorMessage(error);
    setStatus("Scene load failed", "error");
    setSceneLoadStatus(message, "error");
  } finally {
    if (activeSelection === selection) {
      activeSelection = null;
      activating = false;
      setBusy(false);
    }
  }
}

/** Formats an item's update date for its card, or an empty string when unknown. */
function updatedLabel(modified: Date | null): string {
  if (!modified) return "";
  return `Updated ${modified.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
}

/**
 * Creates a Calcite card for one WebScene search result: thumbnail, title,
 * owner and update date, a link to its ArcGIS Online item page, and a button
 * that loads it for flight.
 */
function webSceneCard(result: WebSceneSearchResult): HTMLCalciteCardElement {
  const card = document.createElement("calcite-card");
  card.className = "webscene-card";
  card.thumbnailPosition = "inline-start";
  if (result.thumbnailUrl) {
    const thumbnail = document.createElement("img");
    thumbnail.slot = "thumbnail";
    thumbnail.src = result.thumbnailUrl;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    card.append(thumbnail);
  }
  const heading = document.createElement("span");
  heading.slot = "heading";
  heading.textContent = result.title;
  const description = document.createElement("span");
  description.slot = "description";
  description.textContent = [
    result.owner,
    result.numViews === null ? "" : `${result.numViews.toLocaleString()} views`,
    updatedLabel(result.modified),
  ].filter(Boolean).join(" · ");
  const link = document.createElement("calcite-link");
  link.slot = "footer-start";
  link.href = result.itemPageUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.iconEnd = "launch";
  link.title = "Open the item page on ArcGIS Online";
  link.textContent = "Item page";
  const fly = document.createElement("calcite-button");
  fly.slot = "footer-end";
  fly.scale = "s";
  fly.iconStart = "plane";
  fly.label = `Fly in ${result.title}`;
  fly.textContent = "Fly";
  fly.addEventListener("click", () => void loadSelection(result.title, (signal) => publicWebScene(result.id, signal)));
  card.append(heading, description, link, fly);
  return card;
}

/**
 * Searches public WebScenes and renders the matches as cards. A newer search
 * cancels an older one, and the identity check stops stale responses.
 *
 * @param searchText Words to search for on ArcGIS Online.
 */
async function refreshWebSceneSearch(searchText: string): Promise<void> {
  const query = searchText.trim();
  if (!query) {
    websceneSearchSummary.textContent = "Enter a place or topic to search.";
    await websceneSearchInput.setFocus();
    return;
  }
  websceneSearchController?.abort();
  const controller = new AbortController();
  websceneSearchController = controller;
  websceneSearchInput.loading = true;
  websceneSearchButton.loading = true;
  websceneSearchSummary.textContent = `Searching ArcGIS Online for "${query}"...`;
  try {
    const results = await searchPublicWebScenes(query, {
      signal: controller.signal,
      sort: websceneSort.value as WebSceneSearchSort,
    });
    if (websceneSearchController !== controller) return;
    websceneResults.replaceChildren(...results.map(webSceneCard));
    websceneSearchSummary.textContent = results.length
      ? `${results.length} ${results.length === 1 ? "WebScene" : "WebScenes"} found. Choose Fly to load one.`
      : "No matching WebScenes. Try another place or topic.";
  } catch (error) {
    if (isAbortError(error)) return;
    websceneResults.replaceChildren();
    websceneSearchSummary.textContent = `WebScene search unavailable: ${errorMessage(error)}`;
  } finally {
    if (websceneSearchController === controller) {
      websceneSearchController = null;
      websceneSearchInput.loading = false;
      websceneSearchButton.loading = false;
    }
  }
}

/** Selects one curated destination using the normal base demo map. */
async function loadPreset(preset: DemoScenePreset): Promise<void> {
  await loadSelection(preset.title, () => createBaseDemoScene(preset.title, preset.start));
}

settingsToggle?.addEventListener("click", () => {
  toggleSettings(Boolean(settingsShellPanel?.hidden));
});
settingsPanel?.addEventListener("calcitePanelClose", () => toggleSettings(false));

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

websceneSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void refreshWebSceneSearch(websceneSearchInput.value);
});
websceneSort.addEventListener("calciteSelectChange", () => {
  void refreshWebSceneSearch(websceneSearchInput.value);
});
gaussianSearchButton.addEventListener("click", () => {
  websceneSearchInput.value = "Gaussian splat";
  websceneSort.value = "recent";
  void refreshWebSceneSearch(websceneSearchInput.value);
});
websceneSearchInput.value = DEFAULT_WEBSCENE_QUERY;
websceneSort.value = DEFAULT_WEBSCENE_SORT;
void refreshWebSceneSearch(DEFAULT_WEBSCENE_QUERY);

itemIdForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const itemId = normalizeArcGISItemId(itemIdInput.value);
  if (!itemId) {
    setSceneLoadStatus("Enter exactly 32 hexadecimal characters.", "error");
    void itemIdInput.setFocus();
    return;
  }
  void loadSelection("WebScene", (signal) => publicWebScene(itemId, signal));
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

/** Reports layer load warnings without failing an otherwise usable scene. */
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
// Start flying automatically; the destination panel stays open.
void loadPreset(DEMO_SCENE_PRESETS[0]);
