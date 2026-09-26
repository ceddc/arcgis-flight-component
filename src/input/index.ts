/**
 * Exposes scene-scoped flight input and its reusable normalization helpers.
 * Consumers can create a `FlightInputController` or reuse the gamepad,
 * keyboard, and settings utilities without importing its implementation path.
 */
export {
  applyGamepadDeadzone,
  DEFAULT_FLIGHT_INPUT_SETTINGS,
  FLIGHT_KEYBOARD_TUNING,
  FlightInputController,
  flightGamepadActivity,
  sanitizeFlightInputSettings,
  selectFlightGamepad,
  shouldCaptureFlightKey,
} from "./flight-input";

export type {
  FlightControlFrame,
  FlightControlPatch,
  FlightGamepadReading,
  FlightGamepadStatus,
  FlightInputControllerOptions,
  FlightInputSettings,
  FlightKeyTargetKind,
} from "./flight-input";
