/**
 * Present simulation poses through loaded aircraft, propeller and exhaust meshes.
 * The presenter updates ArcGIS graphics in place, aligns attachments with the
 * aircraft transform and releases only the resources it creates.
 */
import type Graphic from "@arcgis/core/Graphic.js";
import type Mesh from "@arcgis/core/geometry/Mesh.js";
import FillSymbol3DLayer from "@arcgis/core/symbols/FillSymbol3DLayer.js";
import MeshSymbol3D from "@arcgis/core/symbols/MeshSymbol3D.js";
import { exhaustAnchorOffset, type AircraftExhaustFrame } from "./aircraft-exhaust";
import type Point from "@arcgis/core/geometry/Point.js";
import { webMercatorGroundScale } from "../core/camera-rig";
import type { VehicleRenderPose } from "../core/runtime";
import {
  transformMeshLocalOffset,
  updateMeshMotion,
  type MeshMotionState,
} from "./mesh-motion";

import { flightToScenePosition } from "./flight-scene-coordinate-system";

/** Local model-space location where the default propeller attaches to the aircraft. */
const PROPELLER_ANCHOR_M = 2.68;
/** Euler composition matching the ArcGIS aircraft and attached mesh convention. */
const AIRCRAFT_ROTATION_ORDER = "yxz" as const;

/** Loaded glTF mesh and its ArcGIS graphic, with reusable transform state. */
export interface ActiveAircraftMesh {
  mesh: Mesh;
  motion: MeshMotionState;
  graphic: Graphic;
}

/** Operations exposed to the hosted scene for presenting aircraft meshes. */
export interface AircraftPresenter {
  /** Update vehicle and attached meshes from one simulation pose. */
  update(
    pose: VehicleRenderPose,
    visible: boolean,
    propellerAngleDeg: number,
    exhaust: AircraftExhaustFrame,
  ): void;
  /** Replace loaded mesh objects/tuning without replacing the presenter or scene. */
  setAircraft(options: Pick<AircraftPresenterOptions,
    "vehicle" | "propeller" | "boost" | "propellerAnchorM" | "visualPitchDeg">): void;
  /** Release reusable ArcGIS Points and cached exhaust symbols owned by this presenter. */
  destroy(): void;
  /** Report current visibility of the aircraft and its afterburner mesh. */
  diagnostics(): {
    aircraftVisible: boolean;
    boostVisible: boolean;
  };
}

/** Meshes, coordinate settings and model-specific attachment offsets for one aircraft. */
interface AircraftPresenterOptions {
  vehicle: ActiveAircraftMesh;
  propeller: ActiveAircraftMesh | null;
  boost: ActiveAircraftMesh | null;
  point: Point;
  webMercator: boolean;
  metersPerUnit?: number;
  propellerAnchorM?: { x: number; y: number; z: number };
  visualPitchDeg?: number;
}

/**
 * Build a presenter that moves the aircraft, propeller and plume graphics in place.
 *
 * Reusable `Point` instances avoid allocating scene geometry on each frame.
 * The afterburner uses a small set of cached opacity symbols because mutating
 * nested material alpha after hiding can fail to restore the ArcGIS rendering state.
 *
 * @param options Loaded graphics/meshes and the coordinate context of the SceneView.
 * @returns In-place update, aircraft replacement, teardown and visibility diagnostics.
 */
export function createAircraftPresenter(
  options: AircraftPresenterOptions,
): AircraftPresenter {
  const { webMercator } = options;
  let { vehicle, propeller, boost } = options;
  const metersPerUnit = options.metersPerUnit ?? 1;
  const spatialReference = options.point.spatialReference;
  let propellerAnchorM = options.propellerAnchorM;
  let visualPitchDeg = options.visualPitchDeg;
  // Reuse one position per mesh while flying; release these SDK objects on teardown.
  const vehiclePoint = options.point.clone();
  const propellerPoint = options.point.clone();
  const boostPoint = options.point.clone();
  let aircraftVisible = true;
  let boostVisible = false;
  /** Cache the plume's authored scale and find its forward-most model-space vertex. */
  const exhaustAnchor = (activeBoost: ActiveAircraftMesh | null): { scale: number[]; outletForwardM: number } => {
    const scale = activeBoost ? [...activeBoost.motion.transform.scale] : [1, 1, 1];
    let outletForwardM = 0;
    if (activeBoost) {
      const positions = activeBoost.mesh.vertexAttributes.position;
      let front = -Infinity;
      for (let i = 1; i < positions.length; i += 3) front = Math.max(front, positions[i] * scale[1]);
      if (Number.isFinite(front)) outletForwardM = front * metersPerUnit;
    }
    return { scale, outletForwardM };
  };
  let { scale: boostScale, outletForwardM } = exhaustAnchor(boost);
  // Swap complete cached symbols: nested alpha edits can leave a hidden plume blank.
  const opacitySteps = 16;
  /** Prebuild discrete opacity variants so visibility changes do not depend on nested alpha edits. */
  const createBoostSymbols = (activeBoost: ActiveAircraftMesh | null): MeshSymbol3D[] => activeBoost ? Array.from({ length: opacitySteps }, (_, index) => new MeshSymbol3D({
    symbolLayers: [new FillSymbol3DLayer({ castShadows: false,
      material: { color: [255, 255, 255, (index + 1) / opacitySteps], colorMixMode: "multiply" },
    })],
  })) : [];
  let boostSymbols = createBoostSymbols(boost);
  let opacityStep = 0;

  return {
    /**
     * Position and orient loaded graphics for the current frame.
     *
     * Vehicle visibility follows the camera transition; propeller spin is a
     * local-axis rotation. The plume is scaled and offset so its nozzle remains
     * attached to the aircraft while the effect grows.
     */
    update(pose, visible, propellerAngleDeg, exhaust): void {
      const rotation = {
        x: pose.pitch + (visualPitchDeg ?? 0),
        y: pose.roll,
        z: -pose.bodyHeading,
      };
      aircraftVisible = visible;
      boostVisible = visible && boost !== null && exhaust.visible;
      vehicle.graphic.visible = visible;
      if (propeller) propeller.graphic.visible = visible;
      if (boost) boost.graphic.visible = boostVisible;
      if (!visible) return;

      vehiclePoint.set({ ...flightToScenePosition(pose.position, metersPerUnit), spatialReference });
      updateMeshMotion(vehicle.mesh, vehicle.motion, {
        rotation,
        rotationOrder: AIRCRAFT_ROTATION_ORDER,
      }, vehiclePoint);

      if (propeller) {
        // Rotate the nose offset with the body, then spin the propeller on its own axis.
        const offset = transformMeshLocalOffset(
          vehicle.motion.baseRotation,
          rotation,
          propellerAnchorM ?? { x: 0, y: PROPELLER_ANCHOR_M, z: 0 },
          AIRCRAFT_ROTATION_ORDER,
        );
        const horizontalScale = webMercator
          ? webMercatorGroundScale(pose.position.y)
          : 1;
        propellerPoint.set({
          ...flightToScenePosition({
            x: pose.position.x + offset[0] * horizontalScale,
            y: pose.position.y + offset[1] * horizontalScale,
            z: pose.position.z + offset[2],
          }, metersPerUnit), spatialReference,
        });
        updateMeshMotion(propeller.mesh, propeller.motion, {
          rotation,
          rotationOrder: AIRCRAFT_ROTATION_ORDER,
          localRotation: { x: 0, y: propellerAngleDeg, z: 0 },
        }, propellerPoint);
      }

      if (boost && boostVisible) {
        const nextOpacityStep = Math.max(1, Math.min(opacitySteps, Math.round(exhaust.opacity * opacitySteps)));
        if (opacityStep !== nextOpacityStep) {
          boost.graphic.symbol = boostSymbols[nextOpacityStep - 1];
          opacityStep = nextOpacityStep;
        }
        boost.motion.transform.scale = [boostScale[0], boostScale[1] * exhaust.lengthScale, boostScale[2]];
        const offset = transformMeshLocalOffset(boost.motion.baseRotation, rotation,
          { x: 0, y: exhaustAnchorOffset(outletForwardM, exhaust.lengthScale), z: 0 }, AIRCRAFT_ROTATION_ORDER);
        const horizontalScale = webMercator ? webMercatorGroundScale(pose.position.y) : 1;
        boostPoint.set({
          ...flightToScenePosition({
            x: pose.position.x + offset[0] * horizontalScale,
            y: pose.position.y + offset[1] * horizontalScale,
            z: pose.position.z + offset[2],
          }, metersPerUnit), spatialReference,
        });
        updateMeshMotion(boost.mesh, boost.motion, {
          rotation,
          rotationOrder: AIRCRAFT_ROTATION_ORDER,
        }, boostPoint);
      }
    },
    /** Replace mesh handles and attachment tuning while retaining allocated scene points. */
    setAircraft(next): void {
      for (const symbol of boostSymbols) if (!symbol.destroyed) symbol.destroy();
      vehicle = next.vehicle;
      propeller = next.propeller;
      boost = next.boost;
      propellerAnchorM = next.propellerAnchorM;
      visualPitchDeg = next.visualPitchDeg;
      ({ scale: boostScale, outletForwardM } = exhaustAnchor(boost));
      boostSymbols = createBoostSymbols(boost);
      opacityStep = 0;
      boostVisible = false;
    },
    /** Destroy presenter-owned SDK objects and cached symbols. */
    destroy(): void {
      vehiclePoint.destroy();
      propellerPoint.destroy();
      boostPoint.destroy();
      for (const symbol of boostSymbols) if (!symbol.destroyed) symbol.destroy();
    },
    /** Return the last visibility values applied by `update`. */
    diagnostics: () => ({ aircraftVisible, boostVisible }),
  };
}
