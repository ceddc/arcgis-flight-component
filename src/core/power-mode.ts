/**
 * Maps the UI's Slow, Normal, and Turbo power modes to flight controls.
 *
 * Slow requests braking, Turbo requests boost, and Normal requests neither.
 * The toolbar cycles through all three; gamepad steps stop at either end.
 */
/** Ordered names used by controls and the public power-mode configuration. */
export const FLIGHT_POWER_MODES = ["slow", "normal", "turbo"] as const;

export type FlightPowerMode = (typeof FLIGHT_POWER_MODES)[number];

export interface FlightPowerControl {
  brake: number;
  turboBoost: boolean;
}

/** Type guard for the three supported power modes. */
export function isFlightPowerMode(value: string | undefined): value is FlightPowerMode {
  return FLIGHT_POWER_MODES.includes(value as FlightPowerMode);
}

/** Converts a mode into its continuous brake and turbo control signals. */
export function flightPowerControl(mode: FlightPowerMode): FlightPowerControl {
  return {
    brake: mode === "slow" ? 1 : 0,
    turboBoost: mode === "turbo",
  };
}

/** Returns the next mode in the toolbar's slow -> normal -> turbo -> slow cycle. */
export function nextFlightPowerMode(mode: FlightPowerMode): FlightPowerMode {
  if (mode === "normal") return "turbo";
  if (mode === "turbo") return "slow";
  return "normal";
}

/** Moves one bounded step faster or slower without wrapping at either end. */
export function stepFlightPowerMode(
  mode: FlightPowerMode,
  direction: "faster" | "slower",
): FlightPowerMode {
  if (direction === "faster") {
    if (mode === "slow") return "normal";
    return "turbo";
  }
  if (mode === "turbo") return "normal";
  return "slow";
}
