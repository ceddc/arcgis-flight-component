import type SceneView from "@arcgis/core/views/SceneView.js";
import { flightHostForView } from "./flight-host";
import type Mesh from "@arcgis/core/geometry/Mesh.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePlaneNavigationConfig } from "../config";

const harness = vi.hoisted(() => ({
  meshes: [] as Mesh[],
  graphics: [] as Array<{
    destroyed: boolean;
    destroy: ReturnType<typeof vi.fn>;
    failDestroy: boolean;
  }>,
  layers: [] as Array<{
    title: string;
    destroyed: boolean;
    destroy: ReturnType<typeof vi.fn>;
    failDestroy: boolean;
    add: ReturnType<typeof vi.fn>;
  }>,
  cameras: [] as Array<{
    destroyed: boolean;
    destroy: ReturnType<typeof vi.fn>;
    failDestroy: boolean;
    failClone: boolean;
  }>,
  cameraConstructionCount: 0,
  cameraThrowAt: null as number | null,
  applyFinishError: null as Error | null,
  snapshotError: null as Error | null,
  rollAvailable: true,
  cameraBankRequested: null as boolean | null,
}));

vi.mock("@arcgis/core/Camera.js", () => ({
  default: class MockCamera {
    destroyed = false;
    failDestroy = false;
    failClone = false;
    position: { x: number; y: number; z: number };
    heading: number;
    tilt: number;
    fov = 55;
    destroy = vi.fn(() => {
      if (this.failDestroy) throw new Error("camera destroy failed");
      this.destroyed = true;
    });

    constructor(properties: {
      position?: { x?: number; y?: number; z?: number };
      heading?: number;
      tilt?: number;
      fov?: number;
    } = {}) {
      harness.cameraConstructionCount += 1;
      if (harness.cameraThrowAt === harness.cameraConstructionCount) {
        throw new Error("camera construction failed");
      }
      this.position = {
        x: properties.position?.x ?? 0,
        y: properties.position?.y ?? 0,
        z: properties.position?.z ?? 0,
      };
      this.heading = properties.heading ?? 0;
      this.tilt = properties.tilt ?? 0;
      this.fov = properties.fov ?? 55;
      harness.cameras.push(this);
    }

    clone(): MockCamera {
      if (this.failClone) throw new Error("camera clone failed");
      return new MockCamera({
        position: this.position,
        heading: this.heading,
        tilt: this.tilt,
      });
    }
  },
}));

vi.mock("@arcgis/core/Graphic.js", () => ({
  default: class MockGraphic {
    destroyed = false;
    failDestroy = false;
    visible = true;
    readonly geometry: Mesh;
    destroy = vi.fn(() => {
      if (this.failDestroy) throw new Error("graphic destroy failed");
      this.destroyed = true;
    });

    constructor(properties: { geometry: Mesh }) {
      this.geometry = properties.geometry;
      harness.graphics.push(this);
    }
  },
}));

vi.mock("@arcgis/core/core/promiseUtils.js", () => ({
  isAbortError: (error: unknown) => (
    error instanceof DOMException && error.name === "AbortError"
  ),
}));

vi.mock("@arcgis/core/core/reactiveUtils.js", () => ({
  watch: vi.fn(() => ({ remove: vi.fn() })),
}));

vi.mock("@arcgis/core/geometry/Point.js", () => ({
  default: class MockPoint {
    x = 0;
    y = 0;
    z: number | undefined;
    spatialReference: object = { wkid: 3857 };
    destroy = vi.fn();

    constructor(properties: Partial<MockPoint> = {}) {
      Object.assign(this, properties);
    }

    clone(): MockPoint {
      return new MockPoint({
        x: this.x,
        y: this.y,
        z: this.z,
        spatialReference: this.spatialReference,
      });
    }

    set(properties: Partial<MockPoint>): void {
      Object.assign(this, properties);
    }
  },
}));

vi.mock("./sdk-compatibility", () => ({
  createGltfMesh: vi.fn(),
  projectPoint: vi.fn(async (point: unknown) => point),
}));

vi.mock("@arcgis/core/geometry/support/meshUtils.js", () => ({
  createFromGLTF: vi.fn(),
}));

vi.mock("@arcgis/core/geometry/operators/projectOperator.js", () => ({
  isLoaded: () => true,
  load: vi.fn(async () => undefined),
  execute: (point: unknown) => point,
}));

vi.mock("@arcgis/core/geometry/support/webMercatorUtils.js", () => ({
  geographicToWebMercator: (point: unknown) => point,
}));

vi.mock("@arcgis/core/layers/GraphicsLayer.js", () => ({
  default: class MockGraphicsLayer {
    title: string;
    destroyed = false;
    failDestroy = false;
    readonly graphics: unknown[] = [];
    add = vi.fn((graphic: unknown) => this.graphics.push(graphic));
    destroy = vi.fn(() => {
      if (this.failDestroy) throw new Error("layer destroy failed");
      this.destroyed = true;
    });

    constructor(properties: { title: string }) {
      this.title = properties.title;
      harness.layers.push(this);
    }
  },
}));

vi.mock("@arcgis/core/symbols/FillSymbol3DLayer.js", () => ({
  default: class MockFillSymbol3DLayer {},
}));

vi.mock("@arcgis/core/symbols/MeshSymbol3D.js", () => ({
  default: class MockMeshSymbol3D { destroy = vi.fn(); },
}));

vi.mock("./aircraft-finish", () => ({
  applyProductionAircraftFinish: () => {
    if (harness.applyFinishError) throw harness.applyFinishError;
  },
}));

vi.mock("./camera-submission", () => ({
  CameraSubmissionScheduler: class MockCameraSubmissionScheduler<T> {
    private readonly submit: (frame: T) => void;
    destroy = vi.fn();

    constructor(options: { submit(frame: T): void }) {
      this.submit = options.submit;
    }

    update(frame: T, immediate = false): void {
      if (immediate) this.submit(frame);
    }

    diagnostics(): object {
      return {};
    }
  },
}));

vi.mock("./flight-camera", () => ({
  FlightCameraController: class MockFlightCameraController {
    drag = { reset: vi.fn(), release: vi.fn(), offset: { yawDegrees: 0, pitchDegrees: 0 }, dragging: false };
    canOrbit = true;
    mode = "chase";

    setMode(mode: string): void {
      this.mode = mode;
    }

    update(options: {
      pose: { position: { x: number; y: number; z: number } };
      verticalFovDegrees: number;
      bankedViewport: boolean;
    }): object {
      harness.cameraBankRequested = options.bankedViewport;
      return {
        x: options.pose.position.x,
        y: options.pose.position.y,
        z: options.pose.position.z,
        heading: 0,
        tilt: 78,
        fov: options.verticalFovDegrees,
        roll: 0,
        rollScale: 1,
        aircraftVisible: true,
      };
    }
  },
}));

vi.mock("./initialization-resources", () => ({
  loadAircraftMeshes: vi.fn(async () => (
    harness.meshes as [Mesh, Mesh | null, Mesh | null]
  )),
  queryInitialGroundElevation: vi.fn(async () => null),
}));

vi.mock("./mesh-motion", () => ({
  createMeshMotionState: () => ({ baseRotation: [0, 0, 0, 1], transform: { scale: [1, 1, 1] } }),
  transformMeshLocalOffset: () => [0, 0, 0],
  updateMeshMotion: vi.fn(),
}));

vi.mock("./navigation-action-map", () => ({
  snapshotNavigationActionMap: (actionMap: object) => {
    if (harness.snapshotError) throw harness.snapshotError;
    return { ...actionMap };
  },
}));

vi.mock("./scene-roll", () => ({
  createSceneRoll: () => ({
    get appliesRoll() { return harness.rollAvailable; },
    setEnabled: vi.fn(),
    setTransform: vi.fn(),
    destroy: vi.fn(),
    diagnostics: () => ({}),
  }),
}));

import { initializeHostedFlightScene } from "./hosted-flight-scene";
import { loadAircraftMeshes } from "./initialization-resources";

interface DestroyableCamera {
  destroyed: boolean;
  heading: number;
  destroy: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
}

function createCamera(): DestroyableCamera {
  const camera = {
    destroyed: false,
    heading: 20,
    destroy: vi.fn(() => { camera.destroyed = true; }),
    clone: vi.fn(() => createCamera()),
  };
  return camera;
}

function createMesh(name: string): Mesh {
  const mesh = {
    name,
    components: [],
    vertexAttributes: { position: [] },
    destroyed: false,
    destroy: vi.fn(() => { mesh.destroyed = true; }),
  };
  return mesh as unknown as Mesh;
}

function createScene(options: {
  viewOnThrowAt?: number;
  cameraSetThrowsFrom?: number;
} = {}) {
  const layers: Array<{ title: string }> = [];
  const handles: Array<{
    remove: ReturnType<typeof vi.fn>;
    failRemove: boolean;
  }> = [];
  let onCallCount = 0;
  let cameraSetCount = 0;
  const initialCamera = createCamera();
  let currentCamera = initialCamera;
  const view = {
    whenLayerView: vi.fn(async () => ({})),
    viewingMode: "global",
    spatialReference: { isWebMercator: true, wkid: 3857 },
    destroyed: false,
    get camera() { return currentCamera; },
    set camera(value: DestroyableCamera) {
      cameraSetCount += 1;
      if (
        options.cameraSetThrowsFrom !== undefined
        && cameraSetCount >= options.cameraSetThrowsFrom
      ) {
        throw new Error("camera assignment failed");
      }
      currentCamera = value;
    },
    center: {
      x: 2_000,
      y: 3_000,
      z: 0,
      spatialReference: { wkid: 3857 },
      clone() {
        return {
          x: this.x,
          y: this.y,
          z: this.z,
          spatialReference: this.spatialReference,
          clone: this.clone,
          destroy: vi.fn(),
          set(properties: object) { Object.assign(this, properties); },
        };
      },
    },
    width: 1_200,
    height: 800,
    navigation: {
      gamepad: { enabled: true },
      browserTouchPanEnabled: true,
      momentumEnabled: true,
      actionMap: {
        dragPrimary: "pan",
        dragSecondary: "rotate",
        dragTertiary: "zoom",
        mouseWheel: "zoom",
      },
    },
    groundView: { elevationSampler: null },
    on: vi.fn((_eventName: string, _listener: unknown) => {
      onCallCount += 1;
      if (options.viewOnThrowAt === onCallCount) {
        throw new Error("view.on failed");
      }
      const handle = {
        failRemove: false,
        remove: vi.fn(function (this: { failRemove: boolean }) {
          if (this.failRemove) throw new Error("handle remove failed");
        }),
      };
      handles.push(handle);
      return handle;
    }),
  };
  const attributes = new Map<string, string>();
  const map = {
    destroyed: false,
    ground: null,
    layers,
    add: vi.fn((layer: { title: string }) => {
      layers.push(layer);
    }),
    remove: vi.fn((layer: { title: string }) => {
      const index = layers.indexOf(layer);
      if (index >= 0) layers.splice(index, 1);
    }),
  };
  const scene = {
    id: "test-scene",
    map,
    view,
    viewOnReady: vi.fn(async () => undefined),
    focus: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn() },
    hasPointerCapture: () => false,
    hasAttribute: (name: string) => attributes.has(name),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    removeAttribute: (name: string) => attributes.delete(name),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    set tabIndex(value: number) { attributes.set("tabindex", String(value)); },
    set camera(value: DestroyableCamera) { view.camera = value; },
  };
  return { scene, view, map, handles, initialCamera };
}

function flightConfig() {
  return normalizePlaneNavigationConfig({
    assets: {
      bodyUrl: "body.glb",
      propellerUrl: "propeller.glb",
      boostUrl: "boost.glb",
    },
    start: { altitudeM: 1_000 },
    terrain: { enabled: false },
    controls: { captureSceneNavigation: true },
    camera: { bankedViewport: false },
  });
}

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.stubGlobal("window", Object.assign(new EventTarget(), { matchMedia: () => ({ matches: false }) }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  harness.meshes = [
    createMesh("body"),
    createMesh("propeller"),
    createMesh("boost"),
  ];
  harness.graphics.length = 0;
  harness.layers.length = 0;
  harness.cameras.length = 0;
  harness.cameraConstructionCount = 0;
  harness.cameraThrowAt = null;
  harness.applyFinishError = null;
  harness.snapshotError = null;
  harness.rollAvailable = true;
  harness.cameraBankRequested = null;
  vi.mocked(loadAircraftMeshes).mockClear();
});

describe("hosted flight scene resource ownership", () => {
  it("removes cockpit roll compensation when the renderer fails during a session", async () => {
    const { scene } = createScene();
    const config = flightConfig();
    config.camera.bankedViewport = true;
    const hosted = await initializeHostedFlightScene(scene as unknown as HTMLArcgisSceneElement, config);
    const state = hosted.startState;
    const pose = {
      position: { ...state.position }, bodyHeading: state.heading, travelHeading: state.heading,
      pitch: 0, roll: 35, speed: state.speed, interpolationAlpha: 0, boost: 0,
    };
    try {
      hosted.setViewMode("cockpit", true);
      hosted.present(pose, 65, 1 / 60, 1, true);
      expect(harness.cameraBankRequested).toBe(true);
      harness.rollAvailable = false;
      hosted.present(pose, 65, 1 / 60, 2, true);
      expect(harness.cameraBankRequested).toBe(false);
    } finally {
      hosted.destroy();
    }
  });

  it.each([true, false])("keeps cancellation active through resource handoff (restore camera: %s)", async (restoreCamera) => {
    const { scene, view } = createScene();
    const abort = new AbortController();
    const removeListener = vi.spyOn(abort.signal, "removeEventListener");
    const pending = initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
      { signal: abort.signal, restoreCameraOnAbort: () => restoreCamera },
    );
    let flightCamera: unknown;
    const hosted = await pending.then((result) => {
      flightCamera = view.camera;
      abort.abort();
      return result;
    });

    expect(hosted.debugSnapshot()).toMatchObject({ planeLayerPresent: false, leaseActive: false });
    expect(view.camera === flightCamera).toBe(!restoreCamera);
    expect(removeListener).toHaveBeenCalledOnce();
    hosted.destroy();
    harness.meshes.forEach((mesh) => expect(mesh.destroy).toHaveBeenCalledOnce());
    expect(harness.layers[0].destroy).toHaveBeenCalledOnce();
  });

  it("destroys every owned Graphic and Mesh exactly once", async () => {
    const { scene } = createScene();
    const hosted = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );

    expect(hosted.debugSnapshot()).toMatchObject({
      cameraAccessorStrategy: "fresh-public-camera",
    });

    hosted.destroy();
    hosted.destroy();

    expect(harness.graphics).toHaveLength(3);
    harness.graphics.forEach((graphic) => {
      expect(graphic.destroy).toHaveBeenCalledOnce();
    });
    harness.meshes.forEach((mesh) => {
      expect(mesh.destroy).toHaveBeenCalledOnce();
    });
    expect(harness.layers[0].destroy).toHaveBeenCalledOnce();
    expect(harness.cameras).toHaveLength(2);
    expect(harness.cameras[0].destroy).toHaveBeenCalledOnce();
    expect(harness.cameras[1].destroy).not.toHaveBeenCalled();
    expect(hosted.debugSnapshot().leaseActive).toBe(false);
  });

  it("submits a complete fresh public Camera for every accepted frame", async () => {
    const { scene, view } = createScene();
    const hosted = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    const firstSubmittedCamera = view.camera as unknown as (typeof harness.cameras)[number];
    const state = hosted.startState;
    const pose = {
      position: { ...state.position },
      bodyHeading: state.heading,
      travelHeading: state.heading,
      pitch: state.pitch,
      roll: state.bank,
      speed: state.speed,
      interpolationAlpha: 0,
      boost: state.launchBoost,
    };

    hosted.present(pose, 65, 1 / 60, 1, true);
    const secondSubmittedCamera = view.camera as unknown as (typeof harness.cameras)[number];
    expect(secondSubmittedCamera).not.toBe(firstSubmittedCamera);
    expect(firstSubmittedCamera.destroy).not.toHaveBeenCalled();

    hosted.present(pose, 65, 1 / 60, 2, true);
    const thirdSubmittedCamera = view.camera as unknown as (typeof harness.cameras)[number];
    expect(thirdSubmittedCamera).not.toBe(secondSubmittedCamera);
    expect(harness.cameras).toHaveLength(4);
    expect(hosted.debugSnapshot().cameraAccessorStrategy).toBe("fresh-public-camera");

    hosted.destroy();
    expect(view.camera).not.toBe(thirdSubmittedCamera);
    expect(view.camera.heading).toBe(20);
    expect(harness.cameras[0].destroy).toHaveBeenCalledOnce();
    expect(thirdSubmittedCamera.destroy).not.toHaveBeenCalled();
  });

  it("destroys loaded meshes when setup fails before handoff", async () => {
    const { scene } = createScene();
    const failure = new Error("finish failed");
    harness.applyFinishError = failure;

    await expect(initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    )).rejects.toBe(failure);

    harness.meshes.forEach((mesh) => {
      expect(mesh.destroy).toHaveBeenCalledOnce();
    });
    expect(harness.graphics).toHaveLength(0);
    expect(harness.layers[0].destroy).toHaveBeenCalledOnce();

    harness.applyFinishError = null;
    harness.meshes = [createMesh("retry-body")];
    const retry = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    retry.destroy();
  });

  it("releases the lease when the initial Camera clone fails", async () => {
    const { scene, view } = createScene();
    const failure = new Error("camera clone failed");
    view.camera.clone.mockImplementationOnce(() => { throw failure; });

    await expect(initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    )).rejects.toBe(failure);

    view.camera.clone.mockImplementationOnce(() => createCamera());
    const retry = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    retry.destroy();
  });

  it("destroys the cloned Camera when later lease setup fails", async () => {
    const { scene, view } = createScene();
    const clonedCamera = createCamera();
    view.camera.clone.mockReturnValueOnce(clonedCamera);
    const failure = new Error("action map snapshot failed");
    harness.snapshotError = failure;

    await expect(initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    )).rejects.toBe(failure);

    expect(clonedCamera.destroy).toHaveBeenCalledOnce();
    harness.snapshotError = null;
    const retry = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    retry.destroy();
  });

  it("removes earlier view handles when a later registration throws", async () => {
    const { scene, handles } = createScene({ viewOnThrowAt: 2 });

    await expect(initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    )).rejects.toThrow("view.on failed");

    expect(handles).toHaveLength(1);
    expect(handles[0].remove).toHaveBeenCalledOnce();

    const retry = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    retry.destroy();
  });

  it("retains the attached setup Camera when its first frame assignment fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { scene } = createScene();
    const failingScene = createScene({ cameraSetThrowsFrom: 2 });

    await expect(initializeHostedFlightScene(
      failingScene.scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    )).rejects.toThrow("camera assignment failed");

    expect(harness.cameras).toHaveLength(2);
    expect(harness.cameras[0].destroy).not.toHaveBeenCalled();
    expect(harness.cameras[1].destroy).toHaveBeenCalledOnce();
    harness.meshes.forEach((mesh) => {
      expect(mesh.destroy).toHaveBeenCalledOnce();
    });
    expect(warning).toHaveBeenCalledWith(
      "ArcGIS flight cleanup failed for camera restoration.",
      expect.any(Error),
    );

    harness.meshes = [createMesh("retry-body")];
    const retry = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    retry.destroy();
    warning.mockRestore();
  });

  it("retains the submitted Camera when host-camera restoration fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { scene, view } = createScene({ cameraSetThrowsFrom: 3 });
    const hosted = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    const attachedCamera = view.camera as unknown as (typeof harness.cameras)[number];

    expect(() => hosted.destroy()).not.toThrow();

    expect(view.camera).toBe(attachedCamera);
    expect(attachedCamera.destroy).not.toHaveBeenCalled();
    expect(harness.cameras).toHaveLength(2);
    expect(harness.cameras[0].destroy).toHaveBeenCalledOnce();
    expect(harness.cameras[1].destroy).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      "ArcGIS flight cleanup failed for camera restoration.",
      expect.any(Error),
    );
    warning.mockRestore();
  });

  it("leaves the latest submitted Camera attached when restoration is disabled", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { scene, view } = createScene();
    const hosted = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    const attachedCamera = view.camera as unknown as (typeof harness.cameras)[number];
    expect(() => hosted.destroy({ restoreCamera: false })).not.toThrow();

    expect(view.camera).toBe(attachedCamera);
    expect(attachedCamera.destroy).not.toHaveBeenCalled();
    harness.cameras
      .filter((camera) => camera !== attachedCamera)
      .forEach((camera) => expect(camera.destroy).toHaveBeenCalledOnce());
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it("does not overwrite navigation values changed by the host", async () => {
    const { scene, view } = createScene();
    const hosted = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    const appliedActionMap = view.navigation.actionMap;

    view.navigation.gamepad.enabled = true;
    appliedActionMap.dragPrimary = "rotate";
    hosted.destroy();

    expect(view.navigation.gamepad.enabled).toBe(true);
    expect(view.navigation.actionMap).toBe(appliedActionMap);
    expect(view.navigation.actionMap.dragPrimary).toBe("rotate");
    expect(view.navigation.browserTouchPanEnabled).toBe(true);
    expect(view.navigation.momentumEnabled).toBe(true);
  });

  it("continues cleanup after individual resource failures and releases the lease", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { scene, handles } = createScene();
    const hosted = await initializeHostedFlightScene(
      scene as unknown as HTMLArcgisSceneElement,
      flightConfig(),
    );
    handles[0].failRemove = true;
    harness.graphics[0].failDestroy = true;
    harness.layers[0].failDestroy = true;
    harness.cameras[0].failDestroy = true;

    expect(() => hosted.destroy()).not.toThrow();
    expect(() => hosted.destroy()).not.toThrow();

    expect(handles[0].remove).toHaveBeenCalledOnce();
    expect(handles[1].remove).toHaveBeenCalledOnce();
    expect(harness.graphics[0].destroy).toHaveBeenCalledOnce();
    expect(harness.graphics[1].destroy).toHaveBeenCalledOnce();
    harness.meshes.forEach((mesh) => {
      expect(mesh.destroy).toHaveBeenCalledOnce();
    });
    expect(harness.layers[0].destroy).toHaveBeenCalledOnce();
    expect(harness.cameras).toHaveLength(2);
    expect(harness.cameras[0].destroy).toHaveBeenCalledOnce();
    expect(harness.cameras[1].destroy).not.toHaveBeenCalled();
    expect(hosted.debugSnapshot().leaseActive).toBe(false);
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });
});


describe("direct SceneView resource ownership", () => {
  it("captures older navigation without actionMap and restores the caller-owned view", async () => {
    const { scene, view, map, handles, initialCamera } = createScene();
    Reflect.deleteProperty(view.navigation, "actionMap");
    const directView = Object.assign(view, {
      type: "3d",
      container: scene,
      map,
      when: vi.fn(async () => undefined),
      destroy: vi.fn(),
    });
    const host = flightHostForView(directView as unknown as SceneView);
    const hosted = await initializeHostedFlightScene(host, flightConfig());

    expect(hosted.sceneElement).toBe(scene);
    expect(scene.viewOnReady).not.toHaveBeenCalled();
    expect(directView.when).toHaveBeenCalledOnce();
    expect("actionMap" in view.navigation).toBe(false);
    expect(view.navigation.gamepad.enabled).toBe(false);
    expect(view.on.mock.calls.map((call) => call[0])).toEqual([
      "drag", "mouse-wheel", "double-click", "key-down",
    ]);
    expect(map.layers).toHaveLength(1);
    expect(scene.hasAttribute("tabindex")).toBe(true);

    hosted.destroy();
    expect(map.layers).toHaveLength(0);
    expect(view.camera).toBe(initialCamera.clone.mock.results[0].value);
    expect(view.navigation.gamepad.enabled).toBe(true);
    expect(view.navigation.browserTouchPanEnabled).toBe(true);
    expect(view.navigation.momentumEnabled).toBe(true);
    expect("actionMap" in view.navigation).toBe(false);
    expect(scene.hasAttribute("tabindex")).toBe(false);
    handles.forEach((handle) => expect(handle.remove).toHaveBeenCalledOnce());
    expect(directView.destroy).not.toHaveBeenCalled();
    expect(hosted.debugSnapshot().leaseActive).toBe(false);
  });
});

it("leaves scene pointer gestures to the host when navigation capture is disabled", async () => {
  const { scene, view } = createScene();
  const config = flightConfig();
  config.controls.captureSceneNavigation = false;
  const hosted = await initializeHostedFlightScene(scene as unknown as HTMLArcgisSceneElement, config);
  expect(scene.addEventListener.mock.calls.some(call => call[0] === "pointerdown")).toBe(false);
  expect(view.navigation.browserTouchPanEnabled).toBe(true);
  hosted.destroy();
});

it("does not install an origin adapter when the layer view arrives after destruction", async () => {
  const { scene, view } = createScene();
  let resolve!: (value: object) => void;
  view.whenLayerView.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const hosted = await initializeHostedFlightScene(scene as unknown as HTMLArcgisSceneElement, flightConfig());
  hosted.destroy();
  const factory = { _gridSize: 500_000, _rootOriginId: "root", _origins: new Map(), getOrigin: vi.fn(), needsOriginUpdate: vi.fn() };
  resolve({ processor: { graphicsCore: { symbolCreationContext: { localOriginFactory: factory } } } });
  await Promise.resolve();
  expect(factory._gridSize).toBe(500_000);
  expect(hosted.debugSnapshot().aircraftRenderOrigin).toBeNull();
});
