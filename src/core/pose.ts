/**
 * Adapts full vehicle state to the smaller physics and render-pose contracts.
 *
 * Fixed-step interpolation operates only on pose fields. Presentation then
 * combines that interpolated pose with current non-interpolated details such
 * as boost, without mutating the source vehicle state.
 */
import type { PhysicsPose, VehicleRenderPose } from "./runtime";
import type { VehicleState } from "./types";

/** Copies a vehicle state into the smaller pose shape consumed by the fixed-step runtime. */
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

/** Adds non-interpolated boost state to an interpolated render pose. */
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

/** Copies interpolated pose fields back over a vehicle state for presentation-side calculations. */
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
