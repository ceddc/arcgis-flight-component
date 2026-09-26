/**
 * Simulates the paraglider's unpowered glide, turns, speed bar, and brake.
 *
 * Forward speed and sink are coupled: asking for more speed spends altitude,
 * and brake/weight shift change the wing's response. The model is tuned for
 * accessible touring flight rather than a measured paraglider polar.
 */
import { clamp, DEG_TO_RAD, normalizeDegrees, RAD_TO_DEG } from "./math";
import type { ControlFrame, VehicleState } from "./types";

const GRAVITY = 9.81;
/** Assisted touring speeds in m/s; this simplified wing model is not a real polar. */
export const PARAGLIDER_SPEEDS = {
  cruise: 50 / 3.6,
  minimum: 30 / 3.6,
  maximum: 80 / 3.6,
} as const;
const MINIMUM_SINK_SPEED = 38 / 3.6;
/** Attitude response and bank limits used by the sport-glide model. */
export const PARAGLIDER_HANDLING = {
  maximumBankDeg: 32,
  maximumTurnRateDeg: 28,
  bankResponse: 2.4,
  bankLevelResponse: 3.2,
  controlResponse: 3.5,
  pitchResponse: 3,
  maximumDiveDeg: 12,
  maximumFlareDeg: 8,
} as const;

function damp(value: number, target: number, response: number, dt: number): number {
  return target + (value - target) * Math.exp(-response * dt);
}

/** Exact critically damped motion with continuous velocity when the target changes. */
function easeMotion(
  value: number, velocity: number, target: number, response: number,
  dt: number, minimum: number, maximum: number,
): readonly [number, number] {
  const offset = value - target;
  const term = velocity + response * offset;
  const decay = Math.exp(-response * dt);
  const requested = target + (offset + term * dt) * decay;
  const next = clamp(requested, minimum, maximum);
  return [next, next === requested ? (velocity - response * term * dt) * decay : 0];
}

/**
 * Advances an unpowered glide step; no turbo input can add thrust or energy.
 * @param deltaSeconds Elapsed simulation time in seconds.
 */
export function stepParagliderFlight(
  current: Readonly<VehicleState>,
  controls: Readonly<ControlFrame>,
  deltaSeconds: number,
): VehicleState {
  const dt = clamp(deltaSeconds, 0, 0.1);
  if (dt === 0) return { ...current, position: { ...current.position } };

  const pitchInput = clamp(controls.pitch, -1, 1);
  const bankInput = clamp(controls.bank, -1, 1);
  const weightShift = clamp(controls.yaw, -1, 1);
  // Up/Space pulls both brakes. Down or Shift/right trigger applies speed bar.
  // Brakes take priority, and the turbo toggle never supplies thrust.
  const brakeDemand = Math.max(clamp(controls.brake, 0, 1), Math.max(0, pitchInput));
  const barDemand = brakeDemand > .01 ? 0
    : Math.max(clamp(controls.accelerate, 0, 1), Math.max(0, -pitchInput));
  const [speedBar, speedBarRate] = easeMotion(current.speedBar ?? 0,
    current.speedBarRate ?? 0, barDemand, PARAGLIDER_HANDLING.controlResponse, dt, 0, 1);
  const [wingBrake, wingBrakeRate] = easeMotion(current.wingBrake ?? 0,
    current.wingBrakeRate ?? 0, brakeDemand, PARAGLIDER_HANDLING.controlResponse, dt, 0, 1);
  // Brake demand releases the bar, but its applied effect fades with the eased
  // controls instead of cutting off in one frame when reversing forward/back.
  const effectiveBar = speedBar * (1 - wingBrake);
  const turnDemand = clamp(bankInput + weightShift * .45, -1, 1);
  // Brake travel requests bank; slower flight has less margin for a steep turn.
  // The small assisted floor keeps steering available near the game's brake limit.
  const liftMargin = clamp((PARAGLIDER_SPEEDS.minimum * 1.05
    / Math.max(PARAGLIDER_SPEEDS.minimum, current.speed)) ** 2, 0, 1);
  const availableBank = clamp(Math.acos(liftMargin) * RAD_TO_DEG,
    18, PARAGLIDER_HANDLING.maximumBankDeg);
  const bankTarget = (.7 * turnDemand + .3 * turnDemand ** 3) * availableBank;
  const recovering = Math.abs(bankTarget) < Math.abs(current.bank)
    || bankTarget * current.bank < 0;
  const bankResponse = recovering ? PARAGLIDER_HANDLING.bankLevelResponse
    : PARAGLIDER_HANDLING.bankResponse;
  // Critically damped roll: continuous angular velocity gives a soft entry,
  // reversal and release without oscillation or an immediate jump in roll rate.
  const [bank, wingRollRate] = easeMotion(current.bank, current.wingRollRate ?? 0,
    bankTarget, bankResponse, dt,
    -PARAGLIDER_HANDLING.maximumBankDeg, PARAGLIDER_HANDLING.maximumBankDeg);
  // Brake steering costs a little speed; Q/E weight shift makes a gentler turn.
  const steeringBrake = Math.abs(bankInput) * .06;
  const targetSpeed = clamp(
    PARAGLIDER_SPEEDS.cruise
      + (PARAGLIDER_SPEEDS.maximum - PARAGLIDER_SPEEDS.cruise) * effectiveBar
      - (PARAGLIDER_SPEEDS.cruise - PARAGLIDER_SPEEDS.minimum) * Math.max(wingBrake, steeringBrake),
    PARAGLIDER_SPEEDS.minimum, PARAGLIDER_SPEEDS.maximum,
  );
  const candidateSpeed = damp(current.speed, targetSpeed, targetSpeed > current.speed ? 1.65 : 1.6, dt);
  const meanSpeed = (current.speed + candidateSpeed) / 2;
  // Use the same bank for the visible wing, turn curvature and increased sink.
  const meanBank = (current.bank + bank) / 2 * DEG_TO_RAD;
  const loadFactor = 1 / Math.cos(meanBank);
  // Approximate still-air polar: light brakes minimize sink, full bar worsens glide,
  // heavy braking adds drag, and bank increases the lift/drag needed to turn.
  const deepBrake = clamp((wingBrake - .65) / .35, 0, 1);
  const sink = (.85 + .008 * (meanSpeed - MINIMUM_SINK_SPEED) ** 2
    + .45 * effectiveBar ** 2 + .65 * deepBrake ** 2) * loadFactor ** 1.2;

  // z + v^2/(2g) always decreases in still air. A flare can briefly gain height,
  // but neither repeated pumping nor a descent/climb cap can add free energy.
  const verticalSpeed = clamp(
    (current.speed ** 2 - candidateSpeed ** 2) / (2 * GRAVITY * dt) - sink, -10, 5,
  );
  // Brakes can dissipate excess energy instead of forcing a long climb at the cap.
  const speed = Math.min(candidateSpeed, Math.sqrt(Math.max(0,
    current.speed ** 2 - 2 * GRAVITY * (verticalSpeed + sink) * dt,
  )));
  const turnRateDeg = clamp(GRAVITY * Math.tan(meanBank)
    / Math.max(PARAGLIDER_SPEEDS.minimum, meanSpeed) * RAD_TO_DEG, -PARAGLIDER_HANDLING.maximumTurnRateDeg, PARAGLIDER_HANDLING.maximumTurnRateDeg);
  const heading = normalizeDegrees(current.heading + turnRateDeg * dt);
  const headingRadians = (current.heading + turnRateDeg * dt / 2) * DEG_TO_RAD;
  const horizontalSpeed = Math.sqrt(Math.max(0, speed ** 2 - verticalSpeed ** 2));
  // Let the nose follow the glide/flare, including descent through a banked turn.
  const flightPathPitch = Math.atan2(verticalSpeed, Math.max(1, horizontalSpeed)) * RAD_TO_DEG;
  const pitchTarget = clamp(flightPathPitch * .55 + wingBrake * 3,
    -PARAGLIDER_HANDLING.maximumDiveDeg, PARAGLIDER_HANDLING.maximumFlareDeg);
  const [pitch, wingPitchRate] = easeMotion(current.pitch, current.wingPitchRate ?? 0,
    pitchTarget, PARAGLIDER_HANDLING.pitchResponse, dt,
    -PARAGLIDER_HANDLING.maximumDiveDeg, PARAGLIDER_HANDLING.maximumFlareDeg);

  return {
    driftAngle: 0, cornerAssist: 0,
    position: {
      x: current.position.x + Math.sin(headingRadians) * horizontalSpeed * dt,
      y: current.position.y + Math.cos(headingRadians) * horizontalSpeed * dt,
      z: current.position.z + verticalSpeed * dt,
    },
    heading, pitch, bank, speed, speedBar, wingBrake, wingRollRate, wingPitchRate, speedBarRate, wingBrakeRate,
    throttle: clamp(.52 - wingBrake * .34, .18, 1),
    launchBoost: 0,
    verticalSpeed,
  };
}
