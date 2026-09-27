/**
 * Holds the input sensitivity, pitch direction, and field-of-view defaults.
 *
 * Configuration normalization and new input controllers use these values so
 * an omitted setting behaves consistently across the component and demos.
 */
/** Default input sensitivity multiplier. */
export const DEFAULT_FLIGHT_SENSITIVITY = 0.8;
/** Default camera field of view in degrees. */
export const DEFAULT_FLIGHT_FOV_DEGREES = 65;
/** Keyboard/gamepad pitch is inverted by default. */
export const DEFAULT_INVERT_PITCH = true;
/** Compatibility alias for the default pitch inversion setting. */
export const DEFAULT_INVERT_VERTICAL_CONTROLS = DEFAULT_INVERT_PITCH;

/** Minimal shared input and camera defaults used by configuration helpers. */
export interface FlightInputDefaults {
  sensitivity: number;
  fovDegrees: number;
  invertPitch: boolean;
}

export const DEFAULT_FLIGHT_INPUTS: Readonly<FlightInputDefaults> = Object.freeze({
  sensitivity: DEFAULT_FLIGHT_SENSITIVITY,
  fovDegrees: DEFAULT_FLIGHT_FOV_DEGREES,
  invertPitch: DEFAULT_INVERT_PITCH,
});
