/**
 * Resolves an aircraft model's flight tuning and dispatches simulation to that model.
 *
 * Callers may override the supported powered-aircraft tuning fields. Validation
 * preserves the fixed simulation cadence and terrain limits; the paraglider
 * always uses its own fixed glide model. Each step returns a new vehicle state.
 */
import { stepFlight } from './profile-flight';
import { stepParagliderFlight } from './paraglider-flight';
import { stepSpaceFlight } from './space-flight';
import { AIRCRAFT, type AircraftId } from './aircraft-profiles';
import type { FlightTuning } from './profile-flight';
import type { ControlFrame, VehicleState } from './types';

/** A selected built-in model with its fully resolved tuning. */
export interface AircraftFlightConfig {
  model: AircraftId;
  tuning: Readonly<FlightTuning>;
}
/** Per-model tuning callers may override; simulation cadence and safety limits stay fixed. */
export type AircraftTuning = Omit<FlightTuning, 'fixedStepSeconds' | 'maxCatchUpSteps' | 'pitchLevelSettleSeconds' | 'minimumAglM' | 'maximumAglM'>;
/** Input form that starts from the selected model's defaults. */
export interface AircraftFlightConfigInput {
  model: AircraftId;
  tuning?: Partial<AircraftTuning>;
}
/**
 * Resolves and validates an aircraft profile plus tuning overrides.
 * @param input Model identifier and optional overrides for fields that support customization.
 * @returns A new configuration with defaults for every tuning field.
 * @throws {Error} If the model, tuning values, speed/attitude ordering, or model-specific constraints are invalid.
 */
export function normalizeAircraftFlight(input: AircraftFlightConfigInput): AircraftFlightConfig {
  if (!Object.hasOwn(AIRCRAFT, input.model)) throw new Error('Unknown flight.model.');
  const tuning = { ...AIRCRAFT[input.model].tuning, ...input.tuning };
  for (const [key, value] of Object.entries(tuning)) {
    if (!Object.hasOwn(AIRCRAFT.classic.tuning, key) || !Number.isFinite(value) || value < 0)
      throw new Error('flight.tuning.' + key + ' must be a finite non-negative number.');
  }
  for (const key of ['fixedStepSeconds', 'maxCatchUpSteps', 'pitchLevelSettleSeconds', 'minimumAglM', 'maximumAglM'] as const) {
    if (tuning[key] !== AIRCRAFT[input.model].tuning[key]) throw new Error('flight.tuning.' + key + ' is not configurable.');
  }
  if (!(tuning.minimumSpeed > 0 && tuning.minimumSpeed <= tuning.cruiseSpeed
    && tuning.cruiseSpeed <= tuning.maximumSpeed && tuning.maximumSpeed <= tuning.turboMaximumSpeed))
    throw new Error('Flight speeds must satisfy 0 < minimum <= cruise <= maximum <= turboMaximum.');
  if (!(tuning.maximumPitchDeg > 0 && tuning.maximumPitchDeg < 90
    && tuning.maximumBankDeg > 0 && tuning.maximumBankDeg < 90 && tuning.bankTurnAssistDeg > 0))
    throw new Error('Flight attitude limits must be between 0 and 90 degrees, with positive bank turn assistance.');
  if (input.model === 'paraglider' && input.tuning && Object.entries(input.tuning).some(([key, value]) => value !== AIRCRAFT.paraglider.tuning[key as keyof FlightTuning]))
    throw new Error('Paraglider uses its own fixed glide model; tuning overrides are not supported.');
  return { model: input.model, tuning };
}
/**
 * Advances one profile-specific simulation step and returns a new vehicle state.
 * @param dt Elapsed simulation time in seconds.
 */
export function stepAircraftFlight(profile: AircraftFlightConfig, state: Readonly<VehicleState>, control: Readonly<ControlFrame>, dt: number): VehicleState {
  const controls = { ...control, brake: Math.max(control.brake, control.airbrake ? 1 : 0) };
  if (profile.model === 'paraglider') return stepParagliderFlight(state, controls, dt);
  if (profile.model === 'space-jet') return stepSpaceFlight(state, controls, dt, profile.tuning);
  if (profile.model === 'super-jet' && controls.brake > .05) controls.accelerate = 0;
  return stepFlight(state, controls, dt, profile.tuning.turboMaximumSpeed, profile.tuning);
}
