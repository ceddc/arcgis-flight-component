/**
 * Flight-controls demo over SITG's Geneva imagery, terrain, and 3D building
 * layers. The host owns the map; the reusable component adds the aircraft and
 * shared Calcite toolbar after those lighter scene layers are ready.
 */
import "@arcgis/map-components/components/arcgis-scene";
import Map from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import Ground from "@arcgis/core/Ground.js";
import Camera from "@arcgis/core/Camera.js";
import TileLayer from "@arcgis/core/layers/TileLayer.js";
import ElevationLayer from "@arcgis/core/layers/ElevationLayer.js";
import SceneLayer from "@arcgis/core/layers/SceneLayer.js";
import "../../src/components/arcgis-plane-navigation";
import { setupDemoUi } from "../shared/demo-ui";
import { mountFlightControls } from "../shared/flight-controls";
import { SITG_SERVICES } from "./services";
import "./style.css";

setupDemoUi();
const scene = document.querySelector("arcgis-scene")!;
const flight = document.querySelector("arcgis-plane-navigation")!;
const stage = document.querySelector<HTMLElement>(".flight-stage")!;
const info = document.querySelector<HTMLElement>(".scene-info")!;
const status = document.querySelector<HTMLElement>("#load-status")!;
const retry = document.querySelector<HTMLButtonElement>("#retry")!;
let disposed = false;
let failed = false;
let resumeAfterHistoryRestore = false;

flight.config = {
  autoStart: true,
  start: { longitude: 6.148, latitude: 46.202, altitudeM: 650, headingDeg: 40, speedMps: 70 },
  powerMode: "slow",
  ui: { locale: "en" },
};
mountFlightControls(flight, stage);

/** Show one recoverable load error without leaving a partly active flight. */
function showError(error: unknown): void {
  if (disposed || failed) return;
  failed = true;
  flight.stop();
  status.textContent = "The SITG scene could not load. Check your connection and reload.";
  retry.hidden = false;
  console.error("SITG scene initialization failed", error);
}
retry.addEventListener("click", () => window.location.reload());
flight.addEventListener("arcgisPlaneNavigationError", event => showError(event.detail.error));
flight.addEventListener("arcgisPlaneNavigationReady", () => {
  status.textContent = "Flight is starting. Click the scene to steer.";
});
flight.addEventListener("arcgisPlaneNavigationSnapshot", event => {
  if (failed) return;
  if (event.detail.snapshot.phase === "running") {
    info.dataset.ready = "true";
  } else if (event.detail.snapshot.phase === "paused") {
    delete info.dataset.ready;
    status.textContent = "Flight paused. Select Continue flying to explore.";
  }
});

// The host owns these layers and the map; the component only borrows the view.
const imagery = new TileLayer({ url: SITG_SERVICES.imagery, title: "SITG orthophotos 2024", copyright: "SITG / Etat de Geneve" });
const terrain = new ElevationLayer({ url: SITG_SERVICES.terrain, title: "SITG terrain 2023", copyright: "SITG / Etat de Geneve" });
const buildings = new SceneLayer({ url: SITG_SERVICES.buildings, title: "SITG buildings", popupEnabled: false, copyright: "SITG / Etat de Geneve" });
const landmarks = new SceneLayer({ url: SITG_SERVICES.landmarks, title: "SITG landmarks", popupEnabled: false, copyright: "SITG / Etat de Geneve" });
const fountain = new SceneLayer({ url: SITG_SERVICES.fountain, title: "SITG Jet d'Eau", popupEnabled: false, copyright: "SITG / Etat de Geneve" });
const map = new Map({
  basemap: new Basemap({ baseLayers: [imagery], title: "SITG orthophotos" }),
  ground: new Ground({ layers: [terrain] }),
  layers: [buildings, landmarks, fountain],
});

/** Load the public layers and their views before connecting flight controls. */
async function initialize(): Promise<void> {
  await Promise.all([imagery, terrain, buildings, landmarks, fountain].map(layer => layer.load()));
  if (disposed) return;
  scene.map = map;
  scene.camera = new Camera({ position: { longitude: 6.145, latitude: 46.199, z: 850 }, heading: 40, tilt: 70 });
  await scene.viewOnReady();
  await Promise.all([imagery, buildings, landmarks, fountain].map(layer => scene.view.whenLayerView(layer)));
  if (!disposed) flight.referenceElement = scene;
}
void initialize().catch(showError);

window.addEventListener("pagehide", event => {
  if (event.persisted) {
    resumeAfterHistoryRestore = flight.status === "running";
    flight.pause();
    return;
  }
  disposed = true;
  flight.remove();
  scene.remove();
  map.destroy();
});
window.addEventListener("pageshow", event => {
  if (event.persisted && resumeAfterHistoryRestore && flight.status === "paused") flight.resume();
  resumeAfterHistoryRestore = false;
});
