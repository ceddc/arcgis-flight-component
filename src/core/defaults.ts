export const DEFAULT_FLIGHT_SENSITIVITY = 0.8;
export const DEFAULT_FLIGHT_FOV_DEGREES = 65;
export const DEFAULT_INVERT_PITCH = true;
export const DEFAULT_INVERT_VERTICAL_CONTROLS = DEFAULT_INVERT_PITCH;

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
