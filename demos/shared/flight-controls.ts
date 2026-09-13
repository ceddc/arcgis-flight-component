import "@esri/calcite-components/components/calcite-card";
import "@esri/calcite-components/components/calcite-chip";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-segmented-control";
import "@esri/calcite-components/components/calcite-segmented-control-item";
import type { ArcgisPlaneNavigationElement } from "../../src/components/arcgis-plane-navigation";
import type { FlightSessionSnapshot } from "../../src/controller";
import { detectFlightLocale, flightCameraModeActionLabel, flightCameraModeLabel, flightPowerModeLabel, flightText, translateFlightMessage } from "../../src/i18n";

/** Host-owned Calcite UI using the component's public methods and events. */
export function mountFlightControls(navigation: ArcgisPlaneNavigationElement, stage: HTMLElement): void {
  const locale = detectFlightLocale({ locale: navigation.config.ui.locale });
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const card = document.createElement("calcite-card");
  card.className = "demo-flight-controls";
  card.hidden = true;
  const toolbar = document.createElement("div");
  toolbar.className = "flight-toolbar";
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", flightText(locale, "controlsAria"));
  toolbar.lang = locale;

  const speed = document.createElement("calcite-chip");
  speed.className = "flight-speed";
  speed.kind = "neutral";
  speed.appearance = "outline-fill";
  speed.label = translateFlightMessage(locale, "flight.speedAria");

  const power = document.createElement("calcite-segmented-control");
  power.className = "flight-power";
  power.setAttribute("aria-label", translateFlightMessage(locale, "flight.speed"));
  power.scale = "m";
  power.appearance = "outline-fill";
  power.width = "full";
  for (const mode of ["slow", "normal", "turbo"] as const) {
    const item = document.createElement("calcite-segmented-control-item");
    item.value = flightPowerModeLabel(locale, mode);
    item.dataset.mode = mode;
    item.textContent = flightPowerModeLabel(locale, mode);
    power.append(item);
  }
  power.addEventListener("calciteSegmentedControlChange", () => {
    const mode = power.selectedItem?.dataset.mode;
    if (mode === "slow" || mode === "normal" || mode === "turbo") navigation.setPowerMode(mode);
  });

  const actions = document.createElement("div");
  actions.className = "flight-actions";
  const pause = document.createElement("calcite-button");
  const camera = document.createElement("calcite-button");
  const recover = document.createElement("calcite-button");
  for (const button of [pause, camera, recover]) {
    button.appearance = "transparent";
    button.kind = "neutral";
    actions.append(button);
  }
  recover.iconStart = "reset";
  recover.textContent = flightText(locale, "recover");
  pause.addEventListener("click", () => {
    if (navigation.status === "paused") navigation.resume();
    else if (navigation.status === "ready") void navigation.start();
    else navigation.pause();
  });
  camera.addEventListener("click", () => {
    navigation.setCameraMode(navigation.snapshot()?.cameraMode === "cockpit" ? "chase" : "cockpit");
  });
  recover.addEventListener("click", () => navigation.recover());
  toolbar.append(speed, power, actions);
  card.append(toolbar);

  function render(snapshot: FlightSessionSnapshot | null): void {
    // Keep controls inside the scene's interaction boundary, including when
    // the selector replaces the scene element for another coordinate system.
    const scene = navigation.referenceElement ?? stage.querySelector("arcgis-scene");
    if (scene && card.parentElement !== scene) scene.append(card);
    card.hidden = !snapshot || snapshot.phase === "stopped";
    if (!snapshot) return;
    const speedText = formatter.format(Math.max(0, snapshot.vehicle.speed) * 3.6) + " km/h";
    if (speed.textContent !== speedText) {
      speed.textContent = speedText;
      speed.label = translateFlightMessage(locale, "flight.speedAria") + ": " + speedText;
    }
    const powerLabel = flightPowerModeLabel(locale, snapshot.powerMode);
    if (power.value !== powerLabel) power.value = powerLabel;
    const paused = snapshot.phase === "paused" || snapshot.phase === "ready";
    const pauseText = flightText(locale, snapshot.phase === "ready" ? "start" : paused ? "resume" : "pause");
    if (pause.textContent !== pauseText) {
      pause.textContent = pauseText;
      pause.iconStart = paused ? "play" : "pause";
    }
    const target = snapshot.cameraMode === "cockpit" ? "chase" : "cockpit";
    const cameraText = flightCameraModeLabel(locale, target);
    if (camera.textContent !== cameraText) {
      camera.textContent = cameraText;
      camera.label = flightCameraModeActionLabel(locale, target);
      camera.iconStart = "video";
    }
  }
  navigation.addEventListener("arcgisPlaneNavigationReady", event => render(event.detail.snapshot));
  navigation.addEventListener("arcgisPlaneNavigationSnapshot", event => render(event.detail.snapshot));
  navigation.addEventListener("arcgisPlaneNavigationStopped", () => { card.hidden = true; });
  render(navigation.snapshot());
}
