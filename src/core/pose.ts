import type { PhysicsPose, VehicleRenderPose } from "./runtime";
import type { VehicleState } from "./types";

export function physicsPoseFromVehicle(vehicle: Readonly<VehicleState>): PhysicsPose {
  return {
    position: { ...vehicle.position },
    bodyHeading: vehicle.heading,
    travelHeading: vehicle.heading,
    pitch: vehicle.pitch,
    roll: vehicle.bank,
    speed: vehicle.speed,
  };
}

export function renderPoseWithVehicleBoost(
  renderPose: Readonly<VehicleRenderPose>,
  vehicle: Readonly<VehicleState>,
): VehicleRenderPose {
  return {
    ...renderPose,
    position: { ...renderPose.position },
    boost: vehicle.launchBoost,
  };
}

export function renderVehicleFromPose(
  vehicle: Readonly<VehicleState>,
  renderPose: Readonly<VehicleRenderPose>,
): VehicleState {
  return {
    ...vehicle,
    position: { ...renderPose.position },
    heading: renderPose.bodyHeading,
    pitch: renderPose.pitch,
    bank: renderPose.roll,
    speed: renderPose.speed,
  };
}
