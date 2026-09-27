/**
 * Simulates the Space Jet's powered horizontal travel and independent vertical thrust.
 *
 * Pitch input drives climb or descent even at low forward speed, while nose
 * attitude is eased separately for presentation. The step respects the model's
 * altitude ceiling and returns a new vehicle state.
 */
import { clamp, DEG_TO_RAD, normalizeDegrees } from "./math";
import type { FlightTuning } from "./profile-flight";
import type { ControlFrame, VehicleState } from "./types";

/** Hard altitude cap for the Space Jet flight model, in metres above scene origin. */
export const SPACE_FLIGHT_ALTITUDE_CEILING_M = 200_000;

/** Exponential response used to ease space steering toward its requested turn rate. */
export const SPACE_STEERING_RESPONSE = 2.2;

const damp = (value: number, target: number, response: number, dt: number): number =>
  target + (value - target) * Math.exp(-response * dt);

/**
 * Advances the space model; pitch controls vertical thrust independently of forward speed.
 * @param deltaSeconds Elapsed simulation time in seconds.
 * @param tuning Resolved tuning for this aircraft profile.
 */
export function stepSpaceFlight(
  current: Readonly<VehicleState>, controls: Readonly<ControlFrame>, deltaSeconds: number,
  tuning: Readonly<FlightTuning>,
): VehicleState {
  const dt = clamp(deltaSeconds, 0, .1);
  if (dt === 0) return { ...current, position: { ...current.position } };
  const vertical = clamp(controls.pitch, -1, 1);
  const turn = clamp(controls.bank, -1, 1);
  const yaw = clamp(controls.yaw, -1, 1);
  const brake = clamp(controls.brake, 0, 1);
  const turbo = Boolean(controls.turboBoost) && brake < .05;
  const boost = brake < .05 ? clamp(controls.accelerate, 0, 1) : 0;
  const targetSpeed = turbo ? tuning.turboMaximumSpeed : clamp(
    tuning.cruiseSpeed + boost * tuning.boostSpeedDelta - brake * tuning.brakeSpeedDelta,
    tuning.minimumSpeed, tuning.maximumSpeed,
  );
  const acceleration = brake > .05 ? tuning.brakeDeceleration
    : current.speed > targetSpeed ? tuning.brakeDeceleration * .6
    : turbo ? tuning.turboAcceleration : tuning.boostAcceleration;
  const speedDelta = damp(current.speed, targetSpeed, brake > .05 ? 8 : 4, dt) - current.speed;
  const speed = clamp(current.speed + clamp(speedDelta, -acceleration * dt, acceleration * dt),
    tuning.minimumSpeed, tuning.turboMaximumSpeed);
  const verticalTarget = vertical * tuning.maximumVerticalSpeed * (turbo ? tuning.turboVerticalSpeedScale : 1);
  const response = Math.abs(vertical) < .01 ? 18
    : vertical * current.verticalSpeed < 0 ? 22 : tuning.verticalResponse;
  const requestedVerticalSpeed = damp(current.verticalSpeed, verticalTarget, response, dt);
  const altitude = Math.min(SPACE_FLIGHT_ALTITUDE_CEILING_M,
    current.position.z + requestedVerticalSpeed * dt);
  const verticalSpeed = altitude >= SPACE_FLIGHT_ALTITUDE_CEILING_M
    ? Math.min(0, requestedVerticalSpeed) : requestedVerticalSpeed;
  // More visible climb/dive attitude, with continuous angular velocity on
  // entry, reversal and release. Vertical thrust remains independent of tilt.
  // Input sets nose attitude independently of airspeed and power mode.
  const pitchTarget = altitude >= SPACE_FLIGHT_ALTITUDE_CEILING_M && vertical > 0
    ? 0 : vertical * tuning.maximumPitchDeg;
  const pitchResponse = Math.abs(vertical) < .01 ? tuning.pitchLevelResponse : tuning.pitchResponse;
  const pitchOffset = current.pitch - pitchTarget;
  const pitchTerm = (current.spacePitchRate ?? 0) + pitchResponse * pitchOffset;
  const pitchDecay = Math.exp(-pitchResponse * dt);
  const requestedPitch = pitchTarget + (pitchOffset + pitchTerm * dt) * pitchDecay;
  const pitch = clamp(requestedPitch, -tuning.maximumPitchDeg, tuning.maximumPitchDeg);
  const spacePitchRate = pitch === requestedPitch
    ? ((current.spacePitchRate ?? 0) - pitchResponse * pitchTerm * dt) * pitchDecay : 0;
  // Ease actual steering, not just the cosmetic roll: 95% authority in 1.36 s.
  // Reversals settle faster, while neutral immediately ends an unwanted turn.
  const turnTarget = clamp(turn * tuning.bankTurnAssistDeg + yaw * tuning.yawRateDeg,
    -tuning.maximumTurnRateDeg, tuning.maximumTurnRateDeg);
  const previousTurnRate = current.spaceTurnRate ?? 0;
  const turnResponse = turnTarget * previousTurnRate < 0 ? 4.8 : SPACE_STEERING_RESPONSE;
  const spaceTurnRate = Math.abs(turnTarget) < .01 ? 0
    : damp(previousTurnRate, turnTarget, turnResponse, dt);
  const meanTurnRate = Math.abs(turnTarget) < .01 ? 0
    : turnTarget + (previousTurnRate - turnTarget) * (1 - Math.exp(-turnResponse * dt)) / (turnResponse * dt);
  const heading = normalizeDegrees(current.heading + meanTurnRate * dt);
  const headingRadians = (current.heading + meanTurnRate * dt / 2) * DEG_TO_RAD;
  const bankTarget = clamp(spaceTurnRate / tuning.bankTurnAssistDeg, -1, 1) * tuning.maximumBankDeg;
  return {
    driftAngle: 0, cornerAssist: 0,
    position: {
      x: current.position.x + Math.sin(headingRadians) * speed * dt,
      y: current.position.y + Math.cos(headingRadians) * speed * dt,
      z: altitude,
    },
    heading, speed, verticalSpeed, spaceTurnRate, pitch, spacePitchRate,
    bank: damp(current.bank, bankTarget, spaceTurnRate === 0 ? tuning.bankLevelResponse : tuning.bankResponse, dt),
    throttle: turbo ? 1 : clamp(.52 + boost * .48 - brake * .34, .18, 1),
    launchBoost: turbo ? 2 : boost,
  };
}
