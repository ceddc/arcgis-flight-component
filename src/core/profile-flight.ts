/**
 * Advances the tunable powered-aircraft model used by the built-in plane profiles.
 *
 * Per-profile tuning controls speed response, bank/yaw authority, pitch, and
 * vertical motion. A fixed delta and immutable input state keep the simulation
 * reproducible; rendering and ArcGIS scene work happen in other modules.
 */
import { clamp, DEG_TO_RAD, normalizeDegrees, RAD_TO_DEG } from "./math";
import type { ControlFrame, VehicleState } from "./types";

const MAXIMUM_PITCH_DEG = 78;
const PITCH_LEVEL_SETTLE_SECONDS = 3.5;
const PITCH_LEVEL_SETTLE_THRESHOLD_DEG = 1;

/** Baseline powered-aircraft tuning; speed values are m/s and attitude values are degrees. */
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
  boostSpeedDelta: 62,
  brakeSpeedDelta: 34,
  speedResponse: 3.6,
  turboSpeedResponse: 1.7,
  turboRecoveryResponse: 1.15,
  verticalResponse: 6,
  glideSink: 0,
  highSpeedTurnScale: 1,
  brakeTurnAuthority: 0,
  turnDrag: 0,
  recoverToCruise: 0,
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
  turboVerticalSpeedScale: 1,
  maximumBankDeg: 55,
  minimumAglM: 2.8,
  maximumAglM: 115,
} as const;

/** Numeric tuning fields shared by powered aircraft profiles. */
export type FlightTuning = { [K in keyof typeof FLIGHT_TUNING]: number };

function damp(value: number, target: number, sharpness: number, deltaSeconds: number): number {
  return target + (value - target) * Math.exp(-sharpness * deltaSeconds);
}

/** Eases abrupt keyboard/touch pitch changes before they reach the attitude model. */
export function smoothFlightPitchInput(
  current: number,
  target: number,
  deltaSeconds: number,
  inputResponse: number = FLIGHT_TUNING.pitchInputResponse,
): number {
  const clampedTarget = clamp(target, -1, 1);
  // Once the pilot releases pitch, let the attitude model own the full,
  // explicitly timed return to the horizon instead of extending the command
  // with a decaying input tail.
  if (Math.abs(clampedTarget) <= 0.04) return 0;
  return clamp(
    damp(
      clamp(current, -1, 1),
      clampedTarget,
      inputResponse,
      clamp(deltaSeconds, 0, 0.1),
    ),
    -1,
    1,
  );
}

/**
 * Advances powered profile flight by one bounded step without mutating the input state.
 * @param deltaSeconds Elapsed simulation time in seconds.
 * @param turboMaximumSpeedMps Turbo speed limit in metres per second.
 * @param tuning Fully resolved values for the selected powered aircraft profile.
 */
export function stepFlight(
  current: Readonly<VehicleState>,
  controls: Readonly<ControlFrame>,
  deltaSeconds: number,
  turboMaximumSpeedMps: number = FLIGHT_TUNING.turboMaximumSpeed,
  tuning: Readonly<FlightTuning> = FLIGHT_TUNING,
): VehicleState {
  const dt = clamp(deltaSeconds, 0, 0.1);
  const pitchInput = clamp(controls.pitch, -1, 1);
  const bankInput = clamp(controls.bank, -1, 1);
  const yawInput = clamp(controls.yaw, -1, 1);
  const boost = clamp(controls.accelerate, 0, 1);
  const brake = clamp(controls.brake, 0, 1);
  // Keep the turbo switch armed, but let braking temporarily interrupt
  // its thrust. Releasing the brake resumes turbo without another toggle.
  const turboBoost = controls.turboBoost && brake < 0.05 ? 1 : 0;

  const pitchTarget = pitchInput * tuning.maximumPitchDeg;
  const bankTarget = bankInput * tuning.maximumBankDeg;
  const pitch = clamp(
    damp(
      current.pitch,
      pitchTarget,
      Math.abs(pitchInput) > 0.04 ? tuning.pitchResponse : tuning.pitchLevelResponse,
      dt,
    ),
    -tuning.maximumPitchDeg,
    tuning.maximumPitchDeg,
  );
  const bank = clamp(
    damp(
      current.bank,
      bankTarget,
      Math.abs(bankInput) > 0.04 ? tuning.bankResponse : tuning.bankLevelResponse,
      dt,
    ),
    -tuning.maximumBankDeg,
    tuning.maximumBankDeg,
  );

  const normalMaximumSpeed = tuning.maximumSpeed;
  const turboMaximumSpeed = clamp(
    turboMaximumSpeedMps,
    Math.min(900 / 3.6, tuning.turboMaximumSpeed),
    tuning.turboMaximumSpeed,
  );
  const recoveringFromTurbo = !turboBoost && current.speed > normalMaximumSpeed + 0.5;
  const targetSpeed = turboBoost
    ? turboMaximumSpeed
    : recoveringFromTurbo
      ? tuning.recoverToCruise ? tuning.cruiseSpeed : normalMaximumSpeed
      : tuning.cruiseSpeed + boost * tuning.boostSpeedDelta - brake * tuning.brakeSpeedDelta;
  const speedResponse = turboBoost ? tuning.turboSpeedResponse : recoveringFromTurbo ? tuning.turboRecoveryResponse : tuning.speedResponse;
  let speed = damp(current.speed, targetSpeed, speedResponse, dt);
  speed += (
    boost * tuning.boostAcceleration +
    turboBoost * tuning.turboAcceleration -
    brake * tuning.brakeDeceleration
  ) * dt;
  const steering = Math.max(Math.abs(bankInput), Math.abs(yawInput));
  speed -= tuning.turnDrag * steering * brake * dt;
  speed -= (Math.max(0, pitch) / tuning.maximumPitchDeg) * 1.8 * dt;
  speed = clamp(
    speed,
    tuning.minimumSpeed,
    turboBoost ? turboMaximumSpeed : Math.max(normalMaximumSpeed, current.speed),
  );

  const bankRadians = bank * DEG_TO_RAD;
  const coordinatedTurnDeg = clamp(9.81 * Math.tan(bankRadians) / speed * RAD_TO_DEG, -42, 42);
  const highSpeedRatio = clamp((speed - tuning.cruiseSpeed) / Math.max(1, turboMaximumSpeed - tuning.cruiseSpeed), 0, 1);
  const turnAuthority = (1 + (tuning.highSpeedTurnScale - 1) * highSpeedRatio)
    * (1 + tuning.brakeTurnAuthority * brake * steering);
  const arcadeBankTurnDeg = Math.sin(bankRadians) * tuning.bankTurnAssistDeg * turnAuthority;
  const turnRateDeg = clamp(
    coordinatedTurnDeg + arcadeBankTurnDeg + yawInput * tuning.yawRateDeg * turnAuthority,
    -tuning.maximumTurnRateDeg,
    tuning.maximumTurnRateDeg,
  );
  const heading = normalizeDegrees(current.heading + turnRateDeg * dt);
  const pitchRadians = pitch * DEG_TO_RAD;
  const sinkThreshold = Math.min(38, tuning.maximumBankDeg - 10);
  const steepBank = clamp(
    (Math.abs(bank) - sinkThreshold) / (tuning.maximumBankDeg - sinkThreshold),
    0,
    1,
  );
  const bankSink = steepBank * steepBank * 2.8;
  const verticalTarget = Math.sin(pitchRadians) * speed - bankSink - tuning.glideSink;
  const verticalSpeed = clamp(
    damp(current.verticalSpeed, verticalTarget, tuning.verticalResponse, dt),
    -tuning.maximumVerticalSpeed,
    tuning.maximumVerticalSpeed,
  );
  const horizontalSpeed = Math.max(Math.min(8, tuning.minimumSpeed), Math.cos(pitchRadians) * speed);
  const headingRadians = heading * DEG_TO_RAD;

  return {
    position: {
      x: current.position.x + Math.sin(headingRadians) * horizontalSpeed * dt,
      y: current.position.y + Math.cos(headingRadians) * horizontalSpeed * dt,
      z: current.position.z + verticalSpeed * dt,
    },
    heading,
    driftAngle: 0, cornerAssist: 0,
    pitch,
    bank,
    speed,
    throttle: turboBoost ? 1 : clamp(0.52 + boost * 0.48 - brake * 0.34, 0.18, 1),
    launchBoost: turboBoost ? 2 : boost,
    verticalSpeed,
  };
}
