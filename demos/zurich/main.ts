/**
 * Zurich local-scene demo. Loads a public WebScene, points flight navigation
 * at its scene host, and handles load failures and browser page lifecycle.
 */
import WebScene from "@arcgis/core/WebScene.js";
import SceneView from "@arcgis/core/views/SceneView.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import "../../src/components/arcgis-plane-navigation";
import { setupDemoUi } from "../shared/demo-ui";
import { mountFlightControls } from "../shared/flight-controls";
import "./style.css";

setupDemoUi();
const flight = document.querySelector("arcgis-plane-navigation")!;
const stage = document.querySelector<HTMLElement>(".flight-stage")!;
const status = document.querySelector<HTMLElement>("#load-status")!;
const retry = document.querySelector<HTMLButtonElement>("#retry")!;

flight.config = {
  autoStart: true,
  start: { longitude: 8.54, latitude: 47.37, altitudeM: 650, headingDeg: 5, speedMps: 70 },
  powerMode: "slow", ui: { locale: "en" },
};
mountFlightControls(flight, stage);
flight.addEventListener("arcgisPlaneNavigationReady", () => {
  status.textContent = "Use the joystick or W/S and A/D to steer. Drag the scene to look around.";
});
flight.addEventListener("arcgisPlaneNavigationError", () => {
  status.textContent = "The scene could not load. Check your connection and reload.";
  retry.hidden = false;
});
retry.addEventListener("click", () => window.location.reload());

// Remove the subscription-only trees before attaching the WebScene to a view.
// The public buildings, terrain and hillshade remain as authored in the scene.
const webscene = new WebScene({ portalItem: { id: "067ada556ed84bb3aa5c65b4f2a7c15d" } });
let view: SceneView | undefined;
let disposed = false;
let resumeAfterHistoryRestore = false;

/**
 * Loads the authored WebScene, removes only its heavyweight tree layer, and
 * creates the SceneView that the flight component will use.
 *
 * @throws Propagates load or view creation failures to the page error handler.
 */
async function initialize(): Promise<void> {
  await webscene.load();
  if (disposed) return;
  const trees = webscene.layers.find(layer => layer.title === "LV95 Trees and Bushes Switzerland");
  if (trees) { webscene.remove(trees); trees.destroy(); }
  view = new SceneView({ container: "scene", map: webscene, ui: { components: [] } });
  await view.when();
  if (!disposed) flight.view = view;
}
void initialize().catch(() => {
  if (disposed) return;
  status.textContent = "The Zurich scene could not load. Check your connection and reload.";
  retry.hidden = false;
});
window.addEventListener("pagehide", event => {
  if (event.persisted) {
    resumeAfterHistoryRestore = flight.status === "running";
    flight.pause();
    return;
  }
  disposed = true;
  flight.remove();
  view?.destroy();
  webscene.destroy();
});
window.addEventListener("pageshow", event => {
  if (event.persisted && resumeAfterHistoryRestore && flight.status === "paused") flight.resume();
  resumeAfterHistoryRestore = false;
});
