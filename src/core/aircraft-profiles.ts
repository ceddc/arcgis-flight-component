/**
 * Defines the four built-in aircraft profiles used by flight physics and presentation.
 *
 * Each profile combines handling values with camera distance, propeller, and
 * exhaust defaults. These are game-tuned behaviors, not real aircraft data;
 * callers select one through the public `flight.model` option.
 */
import { FLIGHT_TUNING, type FlightTuning } from "./profile-flight";
import { PARAGLIDER_HANDLING, PARAGLIDER_SPEEDS } from "./paraglider-flight";


/** Stable identifiers accepted by the public `flight.model` option. */
export const AIRCRAFT_IDS = ["classic", "super-jet", "space-jet", "paraglider"] as const;
/** Union of built-in aircraft identifiers. */
export type AircraftId = typeof AIRCRAFT_IDS[number];

/** Simulation and presentation defaults associated with one aircraft model. */
export interface AircraftProfile {
  id: AircraftId;
  tuning: Readonly<FlightTuning>;
  propeller: boolean;
  exhaust: boolean;
  cruiseExhaustIntensity: number;
  cameraDistanceScale: number;
  cameraHeightOffset: number;
}

/** Runtime-frozen built-in profiles; values are game tuning, not real aircraft performance. */
export const AIRCRAFT: Readonly<Record<AircraftId, AircraftProfile>> = {
  classic: {
    id: "classic", tuning: FLIGHT_TUNING, propeller: true, exhaust: true,
    cruiseExhaustIntensity: 0,
    cameraDistanceScale: 1, cameraHeightOffset: 0,
  },
  "super-jet": {
    id: "super-jet", propeller: false, exhaust: true,
    cruiseExhaustIntensity: .2,
    cameraDistanceScale: 1.14, cameraHeightOffset: .2,
    tuning: {
      ...FLIGHT_TUNING, cruiseSpeed: 285, minimumSpeed: 105, maximumSpeed: 460,
      turboMaximumSpeed: 900, boostAcceleration: 100, turboAcceleration: 130,
      brakeDeceleration: 180, boostSpeedDelta: 165, brakeSpeedDelta: 155,
      speedResponse: 1.1, turboSpeedResponse: .55, turboRecoveryResponse: .5,
      highSpeedTurnScale: .65, brakeTurnAuthority: .45, turnDrag: 28, recoverToCruise: 1,
      pitchInputResponse: 3.2, pitchResponse: 4, bankResponse: 2.4,
      bankLevelResponse: 2.5, bankTurnAssistDeg: 43, yawRateDeg: 32,
      maximumBankDeg: 67, maximumTurnRateDeg: 80, maximumVerticalSpeed: 210,
    },
  },
  "space-jet": {
    id: "space-jet", propeller: false, exhaust: true,
    cruiseExhaustIntensity: .24,
    cameraDistanceScale: 1.14, cameraHeightOffset: .3,
    tuning: {
      ...FLIGHT_TUNING, cruiseSpeed: 650, minimumSpeed: 70, maximumSpeed: 1100,
      turboMaximumSpeed: 10000, boostAcceleration: 600, turboAcceleration: 6000,
      brakeDeceleration: 5000, boostSpeedDelta: 450, brakeSpeedDelta: 500,
      speedResponse: 5, turboSpeedResponse: 2.6, turboRecoveryResponse: 2.5,
      pitchInputResponse: 7, pitchResponse: 3, bankResponse: 3.5,
      bankLevelResponse: 4.5, pitchLevelResponse: 3.6, bankTurnAssistDeg: 48,
      yawRateDeg: 32, maximumBankDeg: 50, maximumPitchDeg: 75,
      maximumTurnRateDeg: 65, maximumVerticalSpeed: 1300, verticalResponse: 14,
      turboVerticalSpeedScale: 2.4,
    },
  },
  paraglider: {
    id: "paraglider", propeller: false, exhaust: false,
    cruiseExhaustIntensity: 0,
    cameraDistanceScale: 1.08, cameraHeightOffset: .9,
    tuning: {
      ...FLIGHT_TUNING, cruiseSpeed: PARAGLIDER_SPEEDS.cruise,
      minimumSpeed: PARAGLIDER_SPEEDS.minimum, maximumSpeed: PARAGLIDER_SPEEDS.maximum,
      turboMaximumSpeed: PARAGLIDER_SPEEDS.maximum, boostAcceleration: 3, turboAcceleration: 5,
      brakeDeceleration: 4, boostSpeedDelta: 7, brakeSpeedDelta: 5,
      speedResponse: 1.65, turboSpeedResponse: 1.65, turboRecoveryResponse: 1.6,
      pitchInputResponse: 1.7, pitchResponse: 1.6, pitchLevelResponse: .8,
      bankResponse: PARAGLIDER_HANDLING.bankResponse, bankLevelResponse: PARAGLIDER_HANDLING.bankLevelResponse,
      maximumBankDeg: PARAGLIDER_HANDLING.maximumBankDeg,
      maximumPitchDeg: 24, bankTurnAssistDeg: 8, yawRateDeg: 12,
      maximumTurnRateDeg: PARAGLIDER_HANDLING.maximumTurnRateDeg, maximumVerticalSpeed: 10, verticalResponse: 1.6,
      glideSink: 1.1,
    },
  },
};

/** Type guard for a built-in aircraft identifier. */
export function isAircraftId(value: unknown): value is AircraftId {
  return typeof value === "string" && AIRCRAFT_IDS.includes(value as AircraftId);
}


for (const profile of Object.values(AIRCRAFT)) { Object.freeze(profile.tuning); Object.freeze(profile); }
Object.freeze(AIRCRAFT);
