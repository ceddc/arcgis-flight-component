/**
 * Own one flight session's ArcGIS resources and bridge simulation frames to a SceneView.
 *
 * Initialization adapts the caller's scene, borrows selected navigation/camera
 * state, loads aircraft graphics and installs one rate-limited presentation loop.
 * A phased disposer unwinds resources on cancellation or teardown while leaving
 * the ArcGIS view itself under application ownership.
 */
import { bindCameraDrag } from "./camera-drag-input";
import * as kernel from "@arcgis/core/kernel.js";
import { installAircraftRenderOrigin } from "./aircraft-render-origin";
import { AircraftExhaustAnimation, type AircraftExhaustFrame } from "./aircraft-exhaust";
import { FLIGHT_TUNING } from "../core/flight";
import { AIRCRAFT } from '../core/aircraft-profiles';
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
import type { AircraftAssetConfig, PlaneNavigationConfig } from "../config";
import type { AircraftFlightConfig } from "../core/aircraft-flight";
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
import { flightSceneCoordinateMode, flightSceneMetersPerUnit, sceneToFlightPosition, flightToScenePosition } from "./flight-scene-coordinate-system";
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
import { createFlightClipDistance, type FlightClipDistanceController } from "./flight-clip-distance";
import { Disposer } from "./disposer";

/** Layer identity and exclusive-view lease prevent overlapping flight sessions. */
const LAYER_TITLE = "Plane navigation";
const VIEW_LEASES = new WeakMap<object, symbol>();
/** Teardown phases: stop work first, restore host state, then free owned graphics/data. */
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

/** Complete unit submitted to the camera scheduler so aircraft and camera stay in sync. */
interface FlightPresentationFrame extends ArcGISCameraFrame {
  tick: number;
  pose: VehicleRenderPose;
  aircraftVisible: boolean;
  propellerAngleDeg: number;
  exhaust: AircraftExhaustFrame;
}

/** Runtime snapshot useful for examples, debugging and lifecycle verification. */
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
  clipDistance: ReturnType<FlightClipDistanceController["diagnostics"]> | null;
}

/** Operations exposed to the flight loop and UI after the ArcGIS scene is initialized. */
export interface HostedFlightScene {
  /** DOM scene/container used for input and control placement. */
  readonly sceneElement: HTMLElement;
  /** Initial simulation state copied from configuration and the resolved start point. */
  readonly startState: VehicleState;
  /** Return terrain elevation in flight metres, or `null` when terrain is unavailable/disabled. */
  elevationAtWorld(point: Vec2): number | null;
  /** Calculate and enqueue the camera plus aircraft presentation for one simulation frame. */
  present(
    pose: VehicleRenderPose,
    verticalFovDegrees: number,
    deltaSeconds: number,
    tick: number,
    snap?: boolean,
  ): void;
  /** Load or reuse an aircraft bundle and switch the presenter without recreating the scene. */
  setAircraft(assets: AircraftAssetConfig, flight: AircraftFlightConfig | null): Promise<boolean>;
  /** Enable/disable the shader-based viewport roll while retaining the current flight view. */
  setBankedViewport(enabled: boolean): void;
  /** Change between chase and cockpit views, optionally bypassing transition animation. */
  setViewMode(mode: FlightViewMode, instant?: boolean): void;
  /** Supply renderer timing samples so the camera scheduler can adapt its write rate. */
  setFramePacing(sample: Readonly<FlightFramePacing>): void;
  /** Return current state without exposing mutable presenter/controller internals. */
  debugSnapshot(): HostedFlightSceneDebugSnapshot;
  /** Stop the session and release its borrowed/owned resources; safe to repeat. */
  destroy(options?: { restoreCamera?: boolean }): void;
}

/** Replace missing or non-finite configuration with a known numeric default. */
function finite(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

/** Copy simulation state before retaining it or exposing it to callers. */
function cloneVehicle(vehicle: VehicleState): VehicleState {
  return { ...vehicle, position: { ...vehicle.position } };
}

/**
 * Resolve the configured geographic start into the view's spatial reference.
 *
 * The default is the current view center. Configured longitude/latitude is
 * converted with public ArcGIS projection APIs and fails explicitly when the
 * destination point cannot be produced.
 *
 * @param host Ready ArcGIS host exposing the target SceneView.
 * @param config Plane navigation configuration containing optional start coordinates.
 * @returns A point in the view's spatial reference.
 */
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

/** Cancellation and host-restoration options for asynchronous scene startup. */
export interface HostedFlightSceneInitializationOptions {
  signal?: AbortSignal;
  restoreCameraOnAbort?: () => boolean;
}

/**
 * Initialize the flight layer, camera controller, input capture and presentation scheduler.
 *
 * Startup is cancellable through terrain/model loading. The host view is leased
 * to one session at a time; all state and resources changed during setup are
 * registered for ordered restoration before the session is returned.
 *
 * @param target ArcGIS scene element or normalized host adapter.
 * @param config Validated plane navigation configuration.
 * @param options Optional abort signal and policy for restoring camera on abort.
 * @returns Initialized scene controls and idempotent teardown.
 * @throws {Error} When readiness, map/spatial reference, start terrain, or assets are invalid.
 */
export async function initializeHostedFlightScene(
  target: FlightSceneElement | FlightHost,
  config: PlaneNavigationConfig,
  options: HostedFlightSceneInitializationOptions = {},
): Promise<HostedFlightScene> {
  const { signal } = options;
  const restoreCameraOnAbort = options.restoreCameraOnAbort ?? (() => true);
  /** Throw at each async boundary so cancellation cannot install late resources. */
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

  const metersPerUnit = flightSceneMetersPerUnit(coordinateMode, view.spatialReference);

  // Only one flight session may drive a view. The lease covers asynchronous loading too.
  const lease = Symbol("arcgis-plane-navigation");
  if (VIEW_LEASES.has(view)) {
    throw new Error("This ArcGIS scene already has an active plane navigation instance.");
  }
  VIEW_LEASES.set(view, lease);
  const resources = new Disposer();
  const aircraftLoadController = new AbortController();
  resources.add("aircraft model loads", DISPOSAL_ORDER.runtime, () => {
    aircraftLoadController.abort();
  });
  resources.add("view lease", DISPOSAL_ORDER.lease, () => {
    if (VIEW_LEASES.get(view) === lease) VIEW_LEASES.delete(view);
  });

  let restoreCameraDuringCleanup = true;
  let destroyed = false;
  /** Mark the session dead before unwinding so async callbacks become no-ops. */
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
  /** Suppress the browser menu while the host surface is capturing flight input. */
  const preventContextMenu = (event: Event): void => event.preventDefault();
  const cameraCadence = new CameraCadenceGovernor();
  let aircraftRenderOrigin: ReturnType<typeof installAircraftRenderOrigin> | null = null;
  let terrainSampler: ElevationSampler | null = null;
  let lastSafeElevation: LastSafeElevation | null = null;
  let lastCameraFrame: PresentedFlightCameraFrame | null = null;
  let lastPose: VehicleRenderPose | null = null;
  let cameraUpdateCount = 0;
  let lastPresentationTick = 0;
  /** Stop startup/runtime work and apply the configured camera-abort policy. */
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
    const altitudeM = initialGroundM === null
      ? startAltitudeM
      : Math.max(
          startAltitudeM,
          initialGroundM + config.terrain.minimumClearanceM + 1,
        );
    startPoint.z = altitudeM / metersPerUnit;
    startPoint.spatialReference = view.spatialReference;
    const metricStart = sceneToFlightPosition({ x: startPoint.x, y: startPoint.y, z: startPoint.z }, metersPerUnit);
    if (initialGroundM !== null) {
      lastSafeElevation = {
        position: { x: metricStart.x, y: metricStart.y },
        elevationM: initialGroundM,
        timestampMs: performance.now(),
      };
    }
    const defaultStartState = createInitialFlightState(metricStart, finite(config.start.headingDeg, view.camera.heading));
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

    type AircraftBundle = {
      vehicle: ActiveAircraftMesh;
      propeller: ActiveAircraftMesh | null;
      boost: ActiveAircraftMesh | null;
      assets: AircraftAssetConfig;
    };
    /** Wrap one loaded mesh in a hidden Graphic and register both objects for teardown. */
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
      graphic.visible = false;
      layer.add(graphic);
      const motion = createMeshMotionState(mesh);
      return { mesh, motion, graphic };
    };
    /** Register loaded meshes once so bundle disposal releases their backing geometry. */
    const ownMeshes = (meshes: readonly (Mesh | null)[]): void => {
      for (const mesh of meshes) {
        if (!mesh) continue;
        resources.add("aircraft mesh", DISPOSAL_ORDER.mesh, () => {
          if (!mesh.destroyed) mesh.destroy();
        });
      }
    };
    /** Build the body/propeller/plume graphics and apply finish tuning to a loaded bundle. */
    const createAircraftBundle = (
      meshes: [Mesh, Mesh | null, Mesh | null],
      assets: AircraftAssetConfig,
    ): AircraftBundle => {
      const [planeMesh, propellerMesh, boostMesh] = meshes;
      ownMeshes(meshes);
      if (!assets.preserveFinish) applyProductionAircraftFinish([
        ...(planeMesh.components ?? []),
        ...(propellerMesh?.components ?? []),
      ]);
      return {
        vehicle: createActiveMesh(planeMesh, true),
        propeller: propellerMesh ? createActiveMesh(propellerMesh, true) : null,
        boost: boostMesh ? createActiveMesh(boostMesh, false) : null,
        assets,
      };
    };
    const aircraftMeshes = new Map<string, AircraftBundle>();
    const aircraftLoads = new Map<string, Promise<AircraftBundle | null>>();
    /** Stable cache key for reusing a previously loaded set of model URLs/settings. */
    const aircraftKey = (assets: AircraftAssetConfig): string => JSON.stringify(assets);
    const initialMeshes = await loadAircraftMeshes(
      createGltfMesh,
      startPoint,
      config.assets,
      signal,
    );
    assertNotAborted();
    const initialAircraft = createAircraftBundle(initialMeshes, config.assets);
    aircraftMeshes.set(aircraftKey(config.assets), initialAircraft);
    let activeAircraft = initialAircraft;
    let aircraftRequest = 0;
    let aircraftPresenter = createAircraftPresenter({
      ...activeAircraft,
      propellerAnchorM: activeAircraft.assets.propellerAnchorM,
      visualPitchDeg: activeAircraft.assets.visualPitchDeg,
      point: startPoint,
      metersPerUnit,
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
      config.flight ? { ...AIRCRAFT[config.flight.model], maximumSpeed: config.flight.tuning.maximumSpeed } : undefined,
    );
    flightCamera.setMode(config.camera.mode, true);
    const configuredCameraIntervalMs = 1_000 / config.camera.submissionHz;
    /** Respect an explicit user rate cap while allowing the adaptive governor to slow down. */
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
    // Automatic clipping cuts into the chase aircraft at high altitude on the globe.
    const clipDistance = coordinateMode === "web-mercator" && view.viewingMode === "global"
      ? createFlightClipDistance(view, altitudeM)
      : null;
    if (clipDistance) {
      resources.add("clip distance", DISPOSAL_ORDER.navigation, () => clipDistance.restore());
    }
    // Submit aircraft and camera together so reduced camera cadence never separates their poses.
    // This callback is the only place that writes a new public ArcGIS Camera.
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
        clipDistance?.update(frame.z, frame.aircraftVisible);
        const submittedCamera = new Camera({
          position: new Point({
            ...flightToScenePosition(frame, metersPerUnit),
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
    /** Query current terrain in metres and update the nearby last-safe fallback on success. */
    const elevationAtWorld = (point: Vec2): number | null => {
      if (!config.terrain.enabled) return null;
      const result = sampleElevationWithPriority({
        point,
        ground: terrainSampler ? {
          elevationAt: (x, y) => {
            // GroundView samples rendered heights in the local view's units.
            const z = terrainSampler!.elevationAt(x / metersPerUnit, y / metersPerUnit);
            return z === terrainSampler!.noDataValue ? NaN : z * metersPerUnit;
          },
        } : null,
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
    /** Derive exhaust, propeller and camera state, then submit one coherent frame. */
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
      /** Toggle the shader pass without rebuilding the flight scene. */
      setBankedViewport(enabled): void {
        sceneRoll.setEnabled(enabled);
        bankedViewport = enabled;
      },
      /** Reset any in-progress drag before switching the camera mode. */
      setViewMode(mode, instant = false): void {
        cameraDragInput?.reset();
        flightCamera.setMode(mode, instant);
      },
      /**
       * Reuse cached meshes or load the requested aircraft before switching graphics.
       *
       * A request sequence prevents a slower earlier load from replacing a newer
       * selection. `false` means the request was superseded or the scene stopped.
       */
      async setAircraft(assets, flight): Promise<boolean> {
        const request = ++aircraftRequest;
        const key = aircraftKey(assets);
        let nextAircraft = aircraftMeshes.get(key);
        if (!nextAircraft) {
          let pending = aircraftLoads.get(key);
          if (!pending) {
            pending = loadAircraftMeshes(
              createGltfMesh,
              startPoint,
              assets,
              aircraftLoadController.signal,
            ).then((meshes) => {
              if (destroyed) {
                for (const mesh of meshes) if (mesh && !mesh.destroyed) mesh.destroy();
                return null;
              }
              const bundle = createAircraftBundle(meshes, assets);
              aircraftMeshes.set(key, bundle);
              return bundle;
            }).finally(() => aircraftLoads.delete(key));
            aircraftLoads.set(key, pending);
          }
          nextAircraft = await pending ?? undefined;
        }
        if (!nextAircraft || destroyed || request !== aircraftRequest) return false;
        if (nextAircraft !== activeAircraft) {
          activeAircraft.vehicle.graphic.visible = false;
          if (activeAircraft.propeller) activeAircraft.propeller.graphic.visible = false;
          if (activeAircraft.boost) activeAircraft.boost.graphic.visible = false;
          activeAircraft = nextAircraft;
          aircraftPresenter.setAircraft({
            ...activeAircraft,
            propellerAnchorM: activeAircraft.assets.propellerAnchorM,
            visualPitchDeg: activeAircraft.assets.visualPitchDeg,
          });
        }
        flightCamera.setAircraft(flight
          ? { ...AIRCRAFT[flight.model], maximumSpeed: flight.tuning.maximumSpeed }
          : undefined);
        return true;
      },
      /** Feed performance telemetry to the cadence governor and apply its new interval. */
      setFramePacing(sample): void {
        const cadence = cameraCadence.update(sample, performance.now());
        scheduler.setIntervalMs(intervalForCadence(cadence));
      },
      /** Assemble an immutable snapshot of session, presentation and cleanup diagnostics. */
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
          clipDistance: clipDistance?.diagnostics() ?? null,
        };
      },
      /** Release the view lease, restore borrowed state and destroy all owned resources. */
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
