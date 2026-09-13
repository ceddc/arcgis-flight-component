export const FLIGHT_POWER_MODES = ["slow", "normal", "turbo"] as const;

export type FlightPowerMode = (typeof FLIGHT_POWER_MODES)[number];

export interface FlightPowerControl {
  brake: number;
  turboBoost: boolean;
}

export function isFlightPowerMode(value: string | undefined): value is FlightPowerMode {
  return FLIGHT_POWER_MODES.includes(value as FlightPowerMode);
}

export function flightPowerControl(mode: FlightPowerMode): FlightPowerControl {
  return {
    brake: mode === "slow" ? 1 : 0,
    turboBoost: mode === "turbo",
  };
}

export function nextFlightPowerMode(mode: FlightPowerMode): FlightPowerMode {
  if (mode === "normal") return "turbo";
  if (mode === "turbo") return "slow";
  return "normal";
}

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
