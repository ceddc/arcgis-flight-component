import type Map from "@arcgis/core/Map.js";
import type SceneView from "@arcgis/core/views/SceneView.js";
import type { PlaneNavigationUiPosition } from "../config";

/** The small portion of an arcgis-scene element that flight navigation uses. */
export interface FlightSceneElement extends HTMLElement {
  readonly view: SceneView;
  readonly map: Map | null | undefined;
  readonly ready: boolean;
  readonly fatalError: Error | null | undefined;
  viewOnReady(): Promise<unknown>;
}

/** Adapts either caller-owned scene surface without creating or destroying a view. */
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

export function normalizeFlightHost(target: FlightSceneElement | FlightHost): FlightHost {
  return "kind" in target ? target : flightHostForScene(target);
}
