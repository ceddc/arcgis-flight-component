import { bindCameraDrag } from "./camera-drag-input";
import * as kernel from "@arcgis/core/kernel.js";
import { installAircraftRenderOrigin } from "./aircraft-render-origin";
import { AircraftExhaustAnimation, type AircraftExhaustFrame } from "./aircraft-exhaust";
import { FLIGHT_TUNING } from "../core/flight";
import Camera from "@arcgis/core/Camera.js";
import Graphic from "@arcgis/core/Graphic.js";
import { isAbortError } from "@arcgis/core/core/promiseUtils.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import Point from "@arcgis/core/geometry/Point.js";
import type Mesh from "@arcgis/core/geometry/Mesh.js";
import { createGltfMesh, projectPoint } from "./sdk-compatibility";
import {
  normalizeFlightHost,
  type FlightHost,
  type FlightSceneElement,
} from "./flight-host";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import type ElevationSampler from "@arcgis/core/layers/support/ElevationSampler.js";
import FillSymbol3DLayer from "@arcgis/core/symbols/FillSymbol3DLayer.js";
import MeshSymbol3D from "@arcgis/core/symbols/MeshSymbol3D.js";
import { createInitialFlightState } from "../core/flight";
import { normalizeDegrees } from "../core/math";
import type { VehicleRenderPose } from "../core/runtime";
import type { Vec2, Vec3, VehicleState } from "../core/types";
import type { FlightViewMode } from "../core/camera-rig";
import type { PlaneNavigationConfig } from "../config";
import { applyProductionAircraftFinish } from "./aircraft-finish";
import {
  createAircraftPresenter,
  type ActiveAircraftMesh,
} from "./aircraft-presenter";
import {
  type ArcGISCameraFrame,
  CameraSubmissionScheduler,
} from "./camera-submission";
import {
  CameraCadenceGovernor,
  type FlightFramePacing,
} from "./camera-cadence";
import {
  FlightCameraController,
  type PresentedFlightCameraFrame,
} from "./flight-camera";
import {
  createMeshMotionState,
} from "./mesh-motion";
import { createSceneRoll, type SceneRollController } from "./scene-roll";
import { flightSceneCoordinateMode } from "./flight-scene-coordinate-system";
import {
  loadAircraftMeshes,
  queryInitialGroundElevation,
} from "./initialization-resources";
import { snapshotNavigationActionMap } from "./navigation-action-map";
import {
  sampleElevationWithPriority,
  type LastSafeElevation,
} from "./elevation-sampling";
import { restoreBorrowedValue } from "./borrowed-state";
import { Disposer } from "./disposer";

const LAYER_TITLE = "Plane navigation";
const VIEW_LEASES = new WeakMap<object, symbol>();
const DISPOSAL_ORDER = {
  runtime: 10,
  navigation: 20,
  camera: 30,
  layerRemoval: 40,
  graphic: 50,
  mesh: 60,
  layer: 70,
  accessor: 80,
  lease: 90,
} as const;

interface FlightPresentationFrame extends ArcGISCameraFrame {
  tick: number;
  pose: VehicleRenderPose;
  aircraftVisible: boolean;
  propellerAngleDeg: number;
  exhaust: AircraftExhaustFrame;
}

export interface HostedFlightSceneDebugSnapshot {
  hostSceneId: string;
  planeLayerPresent: boolean;
  planeLayerCount: number;
  cameraUpdateCount: number;
  cameraAccessorStrategy: "fresh-public-camera";
  lastPresentationTick: number;
  cameraFrame: PresentedFlightCameraFrame | null;
  planePosition: Vec3;
  aircraftVisible: boolean;
  boostVisible: boolean;
  viewMode: FlightViewMode;
  aircraftRenderOrigin: ReturnType<ReturnType<typeof installAircraftRenderOrigin>["diagnostics"]> | null;
  cameraDrag: { yawDegrees: number; pitchDegrees: number; dragging: boolean };
  terrainSamplerReady: boolean;
  leaseActive: boolean;
  cameraScheduler: ReturnType<CameraSubmissionScheduler["diagnostics"]>;
  cameraCadence: ReturnType<CameraCadenceGovernor["diagnostics"]>;
  sceneRoll: ReturnType<SceneRollController["diagnostics"]>;
}

export interface HostedFlightScene {
  readonly sceneElement: HTMLElement;
  readonly startState: VehicleState;
  elevationAtWorld(point: Vec2): number | null;
  present(
    pose: VehicleRenderPose,
    verticalFovDegrees: number,
    deltaSeconds: number,
    tick: number,
    snap?: boolean,
  ): void;
  setBankedViewport(enabled: boolean): void;
  setViewMode(mode: FlightViewMode, instant?: boolean): void;
  setFramePacing(sample: Readonly<FlightFramePacing>): void;
  debugSnapshot(): HostedFlightSceneDebugSnapshot;
  destroy(options?: { restoreCamera?: boolean }): void;
}

function finite(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function cloneVehicle(vehicle: VehicleState): VehicleState {
  return { ...vehicle, position: { ...vehicle.position } };
}

async function startPointForScene(
  host: FlightHost,
  config: PlaneNavigationConfig,
): Promise<Point> {
  const { longitude, latitude } = config.start;
  if (longitude !== undefined && latitude !== undefined) {
    const geographicPoint = new Point({
      longitude,
      latitude,
      spatialReference: { wkid: 4326 },
    });
    const spatialReference = host.view.spatialReference;
    if (spatialReference.isWebMercator) {
      return webMercatorUtils.geographicToWebMercator(geographicPoint) as Point;
    }
    if (spatialReference.isWGS84) return geographicPoint;
    const projected = await projectPoint(geographicPoint, spatialReference);
    if (!projected || projected.type !== "point") {
      throw new Error("The configured flight start could not be projected into the scene.");
    }
    projected.spatialReference = spatialReference;
    return projected;
  }
  return host.view.center.clone();
}

export interface HostedFlightSceneInitializationOptions {
  signal?: AbortSignal;
  restoreCameraOnAbort?: () => boolean;
}

export async function initializeHostedFlightScene(
  target: FlightSceneElement | FlightHost,
  config: PlaneNavigationConfig,
  options: HostedFlightSceneInitializationOptions = {},
): Promise<HostedFlightScene> {
  const { signal } = options;
  const restoreCameraOnAbort = options.restoreCameraOnAbort ?? (() => true);
  const assertNotAborted = (): void => signal?.throwIfAborted();
  assertNotAborted();
  const host = normalizeFlightHost(target);
  await host.whenReady();
  assertNotAborted();
  const map = host.map;
  if (!map) throw new Error("The referenced ArcGIS scene has no map.");
  const view = host.view;
  const sceneElement = host.inputElement;
  const coordinateMode = flightSceneCoordinateMode(
    view.viewingMode,
    view.spatialReference,
  );

  // Only one flight session may drive a view. The lease covers asynchronous loading too.
  const lease = Symbol("arcgis-plane-navigation");
  if (VIEW_LEASES.has(view)) {
    throw new Error("This ArcGIS scene already has an active plane navigation instance.");
  }
  VIEW_LEASES.set(view, lease);
  const resources = new Disposer();
  resources.add("view lease", DISPOSAL_ORDER.lease, () => {
    if (VIEW_LEASES.get(view) === lease) VIEW_LEASES.delete(view);
  });

  let restoreCameraDuringCleanup = true;
  let destroyed = false;
  const cleanup = (restoreCamera = true): void => {
    restoreCameraDuringCleanup = restoreCamera;
    destroyed = true;
    resources.dispose();
  };

  let originalCamera: Camera;
  let originalNavigation: {
    gamepadEnabled: boolean;
    browserTouchPanEnabled: boolean;
    momentumEnabled: boolean;
    actionMap: ReturnType<typeof snapshotNavigationActionMap> | null;
  };
  let layer: GraphicsLayer;
  try {
    originalCamera = view.camera.clone();
    resources.add("initial camera", DISPOSAL_ORDER.accessor, () => {
      if (
        !originalCamera.destroyed
        && (view.destroyed || view.camera !== originalCamera)
      ) originalCamera.destroy();
    });
    originalNavigation = {
      gamepadEnabled: view.navigation.gamepad.enabled,
      browserTouchPanEnabled: view.navigation.browserTouchPanEnabled,
      momentumEnabled: view.navigation.momentumEnabled,
      actionMap: view.navigation.actionMap
        ? snapshotNavigationActionMap(view.navigation.actionMap)
        : null,
    };
    layer = new GraphicsLayer({
      title: LAYER_TITLE,
      elevationInfo: { mode: "absolute-height" },
      listMode: "hide",
    });
    resources.add("flight layer", DISPOSAL_ORDER.layer, () => {
      if (!layer.destroyed) layer.destroy();
    });
    resources.add("flight layer removal", DISPOSAL_ORDER.layerRemoval, () => {
      if (!map.destroyed && map.layers.includes(layer)) map.remove(layer);
    });
  } catch (error) {
    cleanup();
    throw error;
  }

  const flightActionMap = {
    dragPrimary: "none",
    dragSecondary: "none",
    dragTertiary: "none",
    mouseWheel: "none",
  } as const;
  let componentAddedTabIndex = false;
  const preventContextMenu = (event: Event): void => event.preventDefault();
  const cameraCadence = new CameraCadenceGovernor();
  let aircraftRenderOrigin: ReturnType<typeof installAircraftRenderOrigin> | null = null;
  let terrainSampler: ElevationSampler | null = null;
  let lastSafeElevation: LastSafeElevation | null = null;
  let lastCameraFrame: PresentedFlightCameraFrame | null = null;
  let lastPose: VehicleRenderPose | null = null;
  let cameraUpdateCount = 0;
  let lastPresentationTick = 0;
  const abortHandler = (): void => {
    cleanup(restoreCameraOnAbort());
  };
  resources.add("abort listener", DISPOSAL_ORDER.runtime, () => {
    signal?.removeEventListener("abort", abortHandler);
  });

  try {
    signal?.addEventListener("abort", abortHandler, { once: true });
    assertNotAborted();
    const startPoint = await startPointForScene(host, config);
    assertNotAborted();
    const initialGroundM = (
      config.terrain.enabled || config.start.altitudeM === undefined
    )
      ? await queryInitialGroundElevation(
          map.ground,
          startPoint,
          signal,
        )
      : null;
    assertNotAborted();
    if (
      initialGroundM === null
      && config.start.altitudeM === undefined
    ) {
      throw new Error(
        "Initial ground elevation is unavailable. Set start.altitudeM or provide an accessible ground elevation source.",
      );
    }
    const startAltitudeM = finite(
      config.start.altitudeM,
      (initialGroundM ?? 0) + 300,
    );
    startPoint.z = initialGroundM === null
      ? startAltitudeM
      : Math.max(
          startAltitudeM,
          initialGroundM + config.terrain.minimumClearanceM + 1,
        );
    startPoint.spatialReference = view.spatialReference;
    if (initialGroundM !== null) {
      lastSafeElevation = {
        position: { x: startPoint.x, y: startPoint.y },
        elevationM: initialGroundM,
        timestampMs: performance.now(),
      };
    }
    const defaultStartState = createInitialFlightState({
      x: startPoint.x,
      y: startPoint.y,
      z: Number(startPoint.z),
    }, finite(config.start.headingDeg, view.camera.heading));
    const startState: VehicleState = {
      ...defaultStartState,
      speed: finite(config.start.speedMps, defaultStartState.speed),
    };

    map.add(layer);
    // Optional, per-layer precision fix. Unknown SDKs retain native rendering.
    if (coordinateMode === "web-mercator" && view.viewingMode === "global") {
      void view.whenLayerView(layer).then(layerView => {
        if (destroyed) return;
        aircraftRenderOrigin = installAircraftRenderOrigin(layerView, kernel.fullVersion ?? kernel.version);
        resources.add("aircraft render origin", DISPOSAL_ORDER.runtime, () => aircraftRenderOrigin?.destroy());
      }, () => { /* Layer removal during startup can cancel its view. */ });
    }
    if (!sceneElement.hasAttribute("tabindex")) {
      componentAddedTabIndex = true;
      sceneElement.tabIndex = 0;
      resources.add("component tabindex", DISPOSAL_ORDER.navigation, () => {
        if (
          componentAddedTabIndex
          && sceneElement.getAttribute("tabindex") === "0"
        ) sceneElement.removeAttribute("tabindex");
      });
    }

    if (config.controls.captureSceneNavigation) {
      resources.add("gamepad navigation", DISPOSAL_ORDER.navigation, () => {
        restoreBorrowedValue({
          current: view.navigation.gamepad.enabled,
          applied: false,
          original: originalNavigation.gamepadEnabled,
          restore: (value) => { view.navigation.gamepad.enabled = value; },
        });
      });
      view.navigation.gamepad.enabled = false;
      resources.add("touch navigation", DISPOSAL_ORDER.navigation, () => {
        restoreBorrowedValue({
          current: view.navigation.browserTouchPanEnabled,
          applied: false,
          original: originalNavigation.browserTouchPanEnabled,
          restore: (value) => { view.navigation.browserTouchPanEnabled = value; },
        });
      });
      view.navigation.browserTouchPanEnabled = false;
      resources.add("navigation momentum", DISPOSAL_ORDER.navigation, () => {
        restoreBorrowedValue({
          current: view.navigation.momentumEnabled,
          applied: false,
          original: originalNavigation.momentumEnabled,
          restore: (value) => { view.navigation.momentumEnabled = value; },
        });
      });
      view.navigation.momentumEnabled = false;
      // actionMap was added after the older SDK releases. Public view event
      // suppression below captures their navigation without adding SDK properties.
      if (originalNavigation.actionMap) {
        const originalActionMap = originalNavigation.actionMap;
        view.navigation.actionMap = flightActionMap;
        const appliedActionMap = view.navigation.actionMap;
        resources.add("navigation action map", DISPOSAL_ORDER.navigation, () => {
          const current = view.navigation.actionMap;
          if (
            current === appliedActionMap
            && current.dragPrimary === "none"
            && current.dragSecondary === "none"
            && current.dragTertiary === "none"
            && current.mouseWheel === "none"
          ) {
            view.navigation.actionMap = originalActionMap;
          }
        });
      }
      for (const [eventName, label] of [
        ["drag", "drag navigation listener"],
        ["mouse-wheel", "mouse-wheel navigation listener"],
        ["double-click", "double-click navigation listener"],
        ["key-down", "key-down navigation listener"],
      ] as const) {
        const handle = view.on(eventName, (event) => event.stopPropagation());
        resources.add(label, DISPOSAL_ORDER.runtime, () => handle.remove());
      }
      sceneElement.addEventListener("contextmenu", preventContextMenu);
      resources.add("context menu listener", DISPOSAL_ORDER.runtime, () => {
        sceneElement.removeEventListener("contextmenu", preventContextMenu);
      });
    }

    const loadedMeshes = await loadAircraftMeshes(
      createGltfMesh,
      startPoint,
      config.assets,
      signal,
    );
    for (const mesh of loadedMeshes) {
      if (!mesh) continue;
      resources.add("aircraft mesh", DISPOSAL_ORDER.mesh, () => {
        if (!mesh.destroyed) mesh.destroy();
      });
    }
    const [planeMesh, propellerMesh, boostMesh] = loadedMeshes;
    assertNotAborted();

    applyProductionAircraftFinish([
      ...(planeMesh.components ?? []),
      ...(propellerMesh?.components ?? []),
    ]);

    const createActiveMesh = (
      mesh: Mesh,
      castsShadows: boolean,
    ): ActiveAircraftMesh => {
      const graphic = new Graphic({
        geometry: mesh,
        symbol: new MeshSymbol3D({
          symbolLayers: [new FillSymbol3DLayer({ castShadows: castsShadows })],
        }),
      });
      resources.add("aircraft graphic", DISPOSAL_ORDER.graphic, () => {
        if (!graphic.destroyed) graphic.destroy();
      });
      layer.add(graphic);
      const motion = createMeshMotionState(mesh);
      return { mesh, motion, graphic };
    };

    const vehicle = createActiveMesh(planeMesh, true);
    const propeller = propellerMesh
      ? createActiveMesh(propellerMesh, true)
      : null;
    const boost = boostMesh ? createActiveMesh(boostMesh, false) : null;
    if (boost) boost.graphic.visible = false;
    const aircraftPresenter = createAircraftPresenter({
      vehicle,
      propeller,
      boost,
      point: startPoint,
      webMercator: coordinateMode === "web-mercator",
    });

    resources.add("aircraft positions", DISPOSAL_ORDER.accessor, () => aircraftPresenter.destroy());

    const initialPose: VehicleRenderPose = {
      position: { ...startState.position },
      bodyHeading: startState.heading,
      travelHeading: startState.heading,
      pitch: startState.pitch,
      roll: startState.bank,
      speed: startState.speed,
      interpolationAlpha: 0,
      boost: startState.launchBoost,
    };
    const flightCamera = new FlightCameraController(
      initialPose,
      config.camera.fovDeg,
    );
    flightCamera.setMode(config.camera.mode, true);
    const configuredCameraIntervalMs = 1_000 / config.camera.submissionHz;
    const intervalForCadence = (
      cadence: ReturnType<CameraCadenceGovernor["diagnostics"]>,
    ): number => config.camera.submissionHz < 60
      ? Math.max(configuredCameraIntervalMs, cadence.intervalMs)
      : cadence.intervalMs;
    const initialChaseCamera = new Camera({
      position: startPoint.clone(),
      heading: startState.heading,
      tilt: 78,
    });
    resources.add("initial chase camera", DISPOSAL_ORDER.accessor, () => {
      if (
        !initialChaseCamera.destroyed
        && (view.destroyed || view.camera !== initialChaseCamera)
      ) initialChaseCamera.destroy();
    });
    view.camera = initialChaseCamera;
    resources.add("camera restoration", DISPOSAL_ORDER.camera, () => {
      if (!view.destroyed && restoreCameraDuringCleanup) {
        view.camera = originalCamera;
      }
    });

    const sceneRoll = createSceneRoll(view, config.camera.bankedViewport);
    resources.add("scene roll", DISPOSAL_ORDER.runtime, () => sceneRoll.destroy());
    // Submit aircraft and camera together so reduced camera cadence never separates their poses.
    const scheduler = new CameraSubmissionScheduler<FlightPresentationFrame>({
      intervalMs: intervalForCadence(cameraCadence.diagnostics()),
      submit(frame) {
        if (destroyed) return;
        aircraftPresenter.update(
          frame.pose,
          frame.aircraftVisible,
          frame.propellerAngleDeg,
          frame.exhaust,
        );
        sceneRoll.setTransform(frame.roll, frame.rollScale);
        const submittedCamera = new Camera({
          position: new Point({
            x: frame.x,
            y: frame.y,
            z: frame.z,
            spatialReference: view.spatialReference,
          }),
          heading: frame.heading,
          tilt: frame.tilt,
          fov: frame.fov,
        });
        try {
          view.camera = submittedCamera;
        } catch (error) {
          if (!submittedCamera.destroyed && view.camera !== submittedCamera) {
            submittedCamera.destroy();
          }
          throw error;
        }
        cameraUpdateCount += 1;
        lastPresentationTick = frame.tick;
      },
      onError(error) {
        if (!isAbortError(error)) {
          console.warn("ArcGIS flight presentation failed.", error);
        }
      },
    });
    resources.add("camera scheduler", DISPOSAL_ORDER.runtime, () => {
      scheduler.destroy();
    });

    if (config.terrain.enabled) {
      terrainSampler = view.groundView.elevationSampler;
      const terrainSamplerHandle = reactiveUtils.watch(
        () => view.groundView.elevationSampler,
        (sampler) => { terrainSampler = sampler; },
      );
      resources.add("terrain sampler handle", DISPOSAL_ORDER.runtime, () => {
        terrainSamplerHandle.remove();
      });
    }
    const elevationAtWorld = (point: Vec2): number | null => {
      if (!config.terrain.enabled) return null;
      const result = sampleElevationWithPriority({
        point,
        ground: terrainSampler,
        lastSafe: lastSafeElevation,
      });
      if (result.elevationM !== null && result.source === "ground") {
        lastSafeElevation = {
          position: { ...point },
          elevationM: result.elevationM,
          timestampMs: performance.now(),
        };
      }
      return result.elevationM;
    };

    const cameraDragInput = config.controls.captureSceneNavigation
      ? bindCameraDrag(sceneElement, flightCamera.drag, () => flightCamera.canOrbit)
      : null;
    resources.add("camera drag input", DISPOSAL_ORDER.runtime, () => cameraDragInput?.destroy());
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const exhaust = new AircraftExhaustAnimation();
    let propellerAngleDeg = 0;
    let bankedViewport = config.camera.bankedViewport;
    const present = (
      pose: VehicleRenderPose,
      verticalFovDegrees: number,
      deltaSeconds: number,
      tick: number,
      snap = false,
    ): void => {
      if (destroyed) return;
      if (snap) { cameraDragInput?.reset(); exhaust.reset(); }
      exhaust.update(pose.boost ?? 0,
        Math.max(0, Math.abs(pose.speed) - Math.abs(lastPose?.speed ?? pose.speed))
          / Math.max(0.001, deltaSeconds * FLIGHT_TUNING.turboAcceleration),
        deltaSeconds, reducedMotion.matches);
      propellerAngleDeg = normalizeDegrees(
        propellerAngleDeg + (720 + pose.speed * 7.5) * deltaSeconds,
      );
      const frame = flightCamera.update({
        pose,
        verticalFovDegrees,
        deltaSeconds,
        viewport: { width: view.width, height: view.height },
        webMercator: coordinateMode === "web-mercator",
        bankedViewport: bankedViewport && sceneRoll.appliesRoll,
        reducedMotion: reducedMotion.matches,
        elevationAtWorld,
        snap,
      });
      lastCameraFrame = frame;
      lastPose = { ...pose, position: { ...pose.position } };
      scheduler.update({
        ...frame,
        tick,
        pose: lastPose,
        aircraftVisible: frame.aircraftVisible,
        propellerAngleDeg,
        exhaust: exhaust.frame(),
      }, snap);
    };

    present(initialPose, config.camera.fovDeg, 1 / 60, 0, true);

    return {
      sceneElement,
      startState: cloneVehicle(startState),
      elevationAtWorld,
      present,
      setBankedViewport(enabled): void {
        sceneRoll.setEnabled(enabled);
        bankedViewport = enabled;
      },
      setViewMode(mode, instant = false): void {
        cameraDragInput?.reset();
        flightCamera.setMode(mode, instant);
      },
      setFramePacing(sample): void {
        const cadence = cameraCadence.update(sample, performance.now());
        scheduler.setIntervalMs(intervalForCadence(cadence));
      },
      debugSnapshot: () => {
        const aircraft = aircraftPresenter.diagnostics();
        return {
          hostSceneId: sceneElement.id,
          planeLayerPresent: map.layers.includes(layer),
          planeLayerCount: map.layers.filter(
            (candidate) => candidate.title === LAYER_TITLE,
          ).length,
          cameraUpdateCount,
          cameraAccessorStrategy: "fresh-public-camera",
          lastPresentationTick,
          cameraFrame: lastCameraFrame ? { ...lastCameraFrame } : null,
          planePosition: lastPose
            ? { ...lastPose.position }
            : { ...startState.position },
          ...aircraft,
          viewMode: flightCamera.mode,
          aircraftRenderOrigin: aircraftRenderOrigin?.diagnostics() ?? null,
          cameraDrag: { ...flightCamera.drag.offset, dragging: flightCamera.drag.dragging },
          terrainSamplerReady: terrainSampler !== null,
          leaseActive: VIEW_LEASES.get(view) === lease,
          cameraScheduler: scheduler.diagnostics(),
          cameraCadence: cameraCadence.diagnostics(),
          sceneRoll: sceneRoll.diagnostics(),
        };
      },
      destroy(options = {}): void {
        cleanup(options.restoreCamera !== false);
      },
    };
  } catch (error) {
    cleanup(
      signal?.aborted
        ? restoreCameraOnAbort()
        : true,
    );
    throw error;
  }
}
