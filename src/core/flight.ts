/**
 * Implements the classic aircraft's deterministic fixed-step flight model.
 *
 * A step turns normalized pitch, bank, yaw, throttle, turbo, and brake input
 * into a new vehicle state. This module also creates initial/recovery states
 * and applies a simple terrain clearance correction; scene rendering is
 * handled elsewhere.
 */
import { clamp, DEG_TO_RAD, normalizeDegrees, RAD_TO_DEG } from "./math";
import type { ControlFrame, Vec3, VehicleState } from "./types";

const MAXIMUM_PITCH_DEG = 78;
const PITCH_LEVEL_SETTLE_SECONDS = 3.5;
const PITCH_LEVEL_SETTLE_THRESHOLD_DEG = 1;

/** Classic-aircraft baseline typed as read-only; speeds are m/s and angles are degrees. */
export const FLIGHT_TUNING = {
  fixedStepSeconds: 1 / 60,
  maxCatchUpSteps: 4,
  cruiseSpeed: 100,
  minimumSpeed: 48,
  maximumSpeed: 165,
  turboMaximumSpeed: 1_200 / 3.6,
  boostAcceleration: 48,
  turboAcceleration: 160,
  brakeDeceleration: 52,
  pitchInputResponse: 4,
  pitchResponse: 6.5,
  pitchLevelSettleSeconds: PITCH_LEVEL_SETTLE_SECONDS,
  pitchLevelResponse: Math.log(MAXIMUM_PITCH_DEG / PITCH_LEVEL_SETTLE_THRESHOLD_DEG)
    / PITCH_LEVEL_SETTLE_SECONDS,
  bankResponse: 3.2,
  bankLevelResponse: 4.6,
  bankTurnAssistDeg: 62,
  yawRateDeg: 60,
  maximumTurnRateDeg: 108,
  maximumPitchDeg: MAXIMUM_PITCH_DEG,
  maximumVerticalSpeed: 115,
  maximumBankDeg: 55,
  minimumAglM: 2.8,
  maximumAglM: 115,
} as const;

function damp(value: number, target: number, sharpness: number, deltaSeconds: number): number {
  return target + (value - target) * Math.exp(-sharpness * deltaSeconds);
}

/** Smooths a digital pitch command while leaving neutral return to the attitude model. */
export function smoothFlightPitchInput(
  current: number,
  target: number,
  deltaSeconds: number,
): number {
  const clampedTarget = clamp(target, -1, 1);
  if (Math.abs(clampedTarget) <= 0.04) return 0;
  return clamp(
    damp(
      clamp(current, -1, 1),
      clampedTarget,
      FLIGHT_TUNING.pitchInputResponse,
      clamp(deltaSeconds, 0, 0.1),
    ),
    -1,
    1,
  );
}

/** Bearing clockwise from north between two scene-plane positions. */
export function bearingDegrees(from: Pick<Vec3, "x" | "y">, to: Pick<Vec3, "x" | "y">): number {
  return normalizeDegrees(Math.atan2(to.x - from.x, to.y - from.y) * RAD_TO_DEG);
}

function normalizeSpeedScale(speedScale: number): number {
  return clamp(speedScale, 0.1, 2);
}

/** Returns a copied state with horizontal and vertical speeds scaled together. */
export function scaleFlightStateSpeed(state: VehicleState, speedScale: number): VehicleState {
  const scale = normalizeSpeedScale(speedScale);
  return {
    ...state,
    position: { ...state.position },
    speed: state.speed * scale,
    verticalSpeed: state.verticalSpeed * scale,
  };
}

/** Creates a level cruise state at a position and heading, with speed scale clamped to supported bounds. */
export function createInitialFlightState(
  position: Vec3,
  heading: number,
  speedScale = 1,
): VehicleState {
  const scale = normalizeSpeedScale(speedScale);
  return {
    position: { ...position },
    heading: normalizeDegrees(heading),
    pitch: 0,
    bank: 0,
    driftAngle: 0,
    speed: FLIGHT_TUNING.cruiseSpeed * scale,
    throttle: 0.52,
    launchBoost: 0,
    cornerAssist: 0,
    verticalSpeed: 0,
  };
}

/**
 * Advances classic flight by one bounded time step; does not mutate `current`.
 * @param deltaSeconds Elapsed simulation time in seconds.
 * @param speedScale Multiplier for the classic speed and acceleration values.
 * @param turboMaximumSpeedMps Turbo speed ceiling in metres per second.
 */
export function stepFlight(
  current: Readonly<VehicleState>,
  controls: Readonly<ControlFrame>,
  deltaSeconds: number,
  speedScale = 1,
  turboMaximumSpeedMps = FLIGHT_TUNING.turboMaximumSpeed,
): VehicleState {
  const dt = clamp(deltaSeconds, 0, 0.1);
  const scale = normalizeSpeedScale(speedScale);
  const pitchInput = clamp(controls.pitch, -1, 1);
  const bankInput = clamp(controls.bank, -1, 1);
  const yawInput = clamp(controls.yaw, -1, 1);
  const boost = clamp(controls.accelerate, 0, 1);
  const brake = clamp(Math.max(controls.brake, controls.airbrake ? 1 : 0), 0, 1);
  const turboBoost = controls.turboBoost && brake < 0.05 ? 1 : 0;

  const pitchTarget = pitchInput * FLIGHT_TUNING.maximumPitchDeg;
  const bankTarget = bankInput * FLIGHT_TUNING.maximumBankDeg;
  const pitch = clamp(
    damp(
      current.pitch,
      pitchTarget,
      Math.abs(pitchInput) > 0.04 ? FLIGHT_TUNING.pitchResponse : FLIGHT_TUNING.pitchLevelResponse,
      dt,
    ),
    -FLIGHT_TUNING.maximumPitchDeg,
    FLIGHT_TUNING.maximumPitchDeg,
  );
  const bank = clamp(
    damp(
      current.bank,
      bankTarget,
      Math.abs(bankInput) > 0.04 ? FLIGHT_TUNING.bankResponse : FLIGHT_TUNING.bankLevelResponse,
      dt,
    ),
    -FLIGHT_TUNING.maximumBankDeg,
    FLIGHT_TUNING.maximumBankDeg,
  );

  const normalMaximumSpeed = FLIGHT_TUNING.maximumSpeed * scale;
  const turboMaximumSpeed = clamp(
    turboMaximumSpeedMps,
    900 / 3.6,
    FLIGHT_TUNING.turboMaximumSpeed,
  ) * scale;
  const recoveringFromTurbo = !turboBoost && current.speed > normalMaximumSpeed + 0.5;
  const targetSpeed = turboBoost
    ? turboMaximumSpeed
    : recoveringFromTurbo
      ? normalMaximumSpeed
      : (FLIGHT_TUNING.cruiseSpeed + boost * 62 - brake * 34) * scale;
  const speedResponse = turboBoost ? 1.7 : recoveringFromTurbo ? 1.15 : 3.6;
  let speed = damp(current.speed, targetSpeed, speedResponse, dt);
  speed += (
    boost * FLIGHT_TUNING.boostAcceleration +
    turboBoost * FLIGHT_TUNING.turboAcceleration -
    brake * FLIGHT_TUNING.brakeDeceleration
  ) * scale * dt;
  speed -= (Math.max(0, pitch) / FLIGHT_TUNING.maximumPitchDeg) * 1.8 * scale * dt;
  speed = clamp(
    speed,
    FLIGHT_TUNING.minimumSpeed * scale,
    turboBoost ? turboMaximumSpeed : Math.max(normalMaximumSpeed, current.speed),
  );

  const bankRadians = bank * DEG_TO_RAD;
  const coordinatedTurnDeg = clamp(9.81 * Math.tan(bankRadians) / speed * RAD_TO_DEG, -42, 42);
  const arcadeBankTurnDeg = Math.sin(bankRadians) * FLIGHT_TUNING.bankTurnAssistDeg;
  const turnRateDeg = clamp(
    coordinatedTurnDeg + arcadeBankTurnDeg + yawInput * FLIGHT_TUNING.yawRateDeg,
    -FLIGHT_TUNING.maximumTurnRateDeg,
    FLIGHT_TUNING.maximumTurnRateDeg,
  );
  const heading = normalizeDegrees(current.heading + turnRateDeg * dt);
  const pitchRadians = pitch * DEG_TO_RAD;
  const steepBank = clamp(
    (Math.abs(bank) - 38) / (FLIGHT_TUNING.maximumBankDeg - 38),
    0,
    1,
  );
  const bankSink = steepBank * steepBank * 2.8;
  const verticalTarget = Math.sin(pitchRadians) * speed - bankSink;
  const verticalSpeed = clamp(
    damp(current.verticalSpeed, verticalTarget, 6, dt),
    -FLIGHT_TUNING.maximumVerticalSpeed * scale,
    FLIGHT_TUNING.maximumVerticalSpeed * scale,
  );
  const horizontalSpeed = Math.max(8 * scale, Math.cos(pitchRadians) * speed);
  const headingRadians = heading * DEG_TO_RAD;

  return {
    position: {
      x: current.position.x + Math.sin(headingRadians) * horizontalSpeed * dt,
      y: current.position.y + Math.cos(headingRadians) * horizontalSpeed * dt,
      z: current.position.z + verticalSpeed * dt,
    },
    heading,
    pitch,
    bank,
    driftAngle: 0,
    speed,
    throttle: turboBoost ? 1 : clamp(0.52 + boost * 0.48 - brake * 0.34, 0.18, 1),
    launchBoost: turboBoost ? 2 : boost,
    cornerAssist: 0,
    verticalSpeed,
  };
}

/** Prevents a classic aircraft from crossing below sampled terrain plus its clearance. */
export function applyArcadeGroundSkim(
  state: VehicleState,
  terrainM: number,
  clearanceM: number,
): VehicleState {
  const floorM = terrainM + clearanceM;
  if (state.position.z >= floorM) return state;
  return {
    ...state,
    position: { ...state.position, z: floorM + 0.8 },
    pitch: Math.max(5, state.pitch),
    verticalSpeed: Math.max(7, state.verticalSpeed),
  };
}

/** Builds a level recovery state facing an optional destination. */
export function flightRespawnState(
  position: Vec3,
  destination: Vec3 | undefined,
  speedScale = 1,
): VehicleState {
  return createInitialFlightState(
    position,
    destination ? bearingDegrees(position, destination) : 0,
    speedScale,
  );
}
