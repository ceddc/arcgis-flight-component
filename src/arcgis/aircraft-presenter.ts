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

const PROPELLER_ANCHOR_M = 2.68;
const AIRCRAFT_ROTATION_ORDER = "yxz" as const;

export interface ActiveAircraftMesh {
  mesh: Mesh;
  motion: MeshMotionState;
  graphic: Graphic;
}

export interface AircraftPresenter {
  update(
    pose: VehicleRenderPose,
    visible: boolean,
    propellerAngleDeg: number,
    exhaust: AircraftExhaustFrame,
  ): void;
  destroy(): void;
  diagnostics(): {
    aircraftVisible: boolean;
    boostVisible: boolean;
  };
}

interface AircraftPresenterOptions {
  vehicle: ActiveAircraftMesh;
  propeller: ActiveAircraftMesh | null;
  boost: ActiveAircraftMesh | null;
  point: Point;
  webMercator: boolean;
}

export function createAircraftPresenter(
  options: AircraftPresenterOptions,
): AircraftPresenter {
  const { vehicle, propeller, boost, webMercator } = options;
  const spatialReference = options.point.spatialReference;
  // Reuse one position per mesh while flying; release these SDK objects on teardown.
  const vehiclePoint = options.point.clone();
  const propellerPoint = options.point.clone();
  const boostPoint = options.point.clone();
  let aircraftVisible = true;
  let boostVisible = false;
  const boostScale = boost ? [...boost.motion.transform.scale] : [1, 1, 1];
  let outletForwardM = 0;
  if (boost) {
    const positions = boost.mesh.vertexAttributes.position;
    let front = -Infinity;
    for (let i = 1; i < positions.length; i += 3) front = Math.max(front, positions[i] * boostScale[1]);
    if (Number.isFinite(front)) outletForwardM = front;
  }
  // Swap complete cached symbols: nested alpha edits can leave a hidden plume blank.
  const opacitySteps = 16;
  const boostSymbols = boost ? Array.from({ length: opacitySteps }, (_, index) => new MeshSymbol3D({
    symbolLayers: [new FillSymbol3DLayer({ castShadows: false,
      material: { color: [255, 255, 255, (index + 1) / opacitySteps], colorMixMode: "multiply" },
    })],
  })) : [];
  let opacityStep = 0;

  return {
    update(pose, visible, propellerAngleDeg, exhaust): void {
      const rotation = {
        x: pose.pitch,
        y: pose.roll,
        z: -pose.bodyHeading,
      };
      aircraftVisible = visible;
      boostVisible = visible && boost !== null && exhaust.visible;
      vehicle.graphic.visible = visible;
      if (propeller) propeller.graphic.visible = visible;
      if (boost) boost.graphic.visible = boostVisible;
      if (!visible) return;

      vehiclePoint.set({ ...pose.position, spatialReference });
      updateMeshMotion(vehicle.mesh, vehicle.motion, {
        rotation,
        rotationOrder: AIRCRAFT_ROTATION_ORDER,
      }, vehiclePoint);

      if (propeller) {
        // Rotate the nose offset with the body, then spin the propeller on its own axis.
        const offset = transformMeshLocalOffset(
          vehicle.motion.baseRotation,
          rotation,
          { x: 0, y: PROPELLER_ANCHOR_M, z: 0 },
          AIRCRAFT_ROTATION_ORDER,
        );
        const horizontalScale = webMercator
          ? webMercatorGroundScale(pose.position.y)
          : 1;
        propellerPoint.set({
          x: pose.position.x + offset[0] * horizontalScale,
          y: pose.position.y + offset[1] * horizontalScale,
          z: pose.position.z + offset[2],
          spatialReference,
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
          x: pose.position.x + offset[0] * horizontalScale,
          y: pose.position.y + offset[1] * horizontalScale,
          z: pose.position.z + offset[2], spatialReference,
        });
        updateMeshMotion(boost.mesh, boost.motion, {
          rotation,
          rotationOrder: AIRCRAFT_ROTATION_ORDER,
        }, boostPoint);
      }
    },
    destroy(): void {
      vehiclePoint.destroy();
      propellerPoint.destroy();
      boostPoint.destroy();
      for (const symbol of boostSymbols) if (!symbol.destroyed) symbol.destroy();
    },
    diagnostics: () => ({ aircraftVisible, boostVisible }),
  };
}
