/**
 * Adapt an `arcgis-scene` element or a direct SceneView to one flight host API.
 * The adapter waits for readiness and mounts controls on the appropriate UI
 * surface while creation and destruction of the view remain with the caller.
 */
import type Map from "@arcgis/core/Map.js";
import type SceneView from "@arcgis/core/views/SceneView.js";
import type { PlaneNavigationUiPosition } from "../config";

/** The ArcGIS custom element surface used when a `arcgis-scene` hosts flight controls. */
export interface FlightSceneElement extends HTMLElement {
  readonly view: SceneView;
  readonly map: Map | null | undefined;
  readonly ready: boolean;
  readonly fatalError: Error | null | undefined;
  viewOnReady(): Promise<unknown>;
}

/**
 * Common access and UI-mounting contract for supported, caller-owned scene surfaces.
 *
 * The adapter lets the flight controller handle `<arcgis-scene>` and `SceneView`
 * consistently while leaving view creation and destruction with the application.
 */
export interface FlightHost {
  readonly kind: "scene-element" | "scene-view";
  readonly scene: FlightSceneElement | null;
  readonly view: SceneView;
  readonly map: Map | null | undefined;
  readonly inputElement: HTMLElement;
  whenReady(): Promise<unknown>;
  mountControls(element: HTMLElement, position: PlaneNavigationUiPosition): void;
  unmountControls(element: HTMLElement): void;
}

/** Adapt an ArcGIS scene custom element while keeping its view ownership with the caller. */
export function flightHostForScene(scene: FlightSceneElement): FlightHost {
  return {
    kind: "scene-element",
    scene,
    get view() { return scene.view; },
    get map() { return scene.map; },
    get inputElement() { return scene; },
    whenReady: () => scene.viewOnReady(),
    mountControls(element, position) {
      element.slot = position;
      scene.append(element);
    },
    unmountControls(element) { element.remove(); },
  };
}

/**
 * Adapt an existing 3D SceneView for flight controls.
 *
 * Controls are mounted into the view's UI manager and positions are translated
 * from custom-element slot names to the equivalent SceneView UI names.
 *
 * @param view Existing ArcGIS view; this adapter never creates or destroys it.
 * @throws {TypeError} When the supplied view is not a 3D SceneView.
 * @returns Host operations for readiness, input targeting, and control mounting.
 */
export function flightHostForView(view: SceneView): FlightHost {
  if (view.type !== "3d") {
    throw new TypeError("Plane navigation view must be an ArcGIS SceneView (type 3d).");
  }
  return {
    kind: "scene-view",
    scene: null,
    view,
    get map() { return view.map; },
    get inputElement() {
      const container = view.container;
      if (!container || typeof container === "string") {
        throw new Error("Plane navigation requires the SceneView to have an HTML container.");
      }
      return container;
    },
    async whenReady() {
      if (view.destroyed) throw new Error("Plane navigation cannot use a destroyed SceneView.");
      await view.when();
      if (view.destroyed) throw new Error("Plane navigation cannot use a destroyed SceneView.");
    },
    mountControls(element, position) {
      element.removeAttribute("slot");
      // Map-component slots use start/end; SceneView UI uses leading/trailing.
      const viewPosition = position.replace("-start", "-leading").replace("-end", "-trailing");
      view.ui.add(element, viewPosition);
    },
    unmountControls(element) {
      if (!view.destroyed) view.ui.remove(element);
      element.remove();
    },
  };
}

/** Normalize a scene element or an already-adapted host to the shared host API. */
export function normalizeFlightHost(target: FlightSceneElement | FlightHost): FlightHost {
  return "kind" in target ? target : flightHostForScene(target);
}
