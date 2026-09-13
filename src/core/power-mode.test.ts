import { describe, expect, it } from "vitest";
import {
  flightPowerControl,
  isFlightPowerMode,
  nextFlightPowerMode,
  stepFlightPowerMode,
} from "./power-mode";

describe("three-position flight power control", () => {
  it("maps Slow, Normal, and Turbo to the source flight inputs", () => {
    expect(flightPowerControl("slow")).toEqual({ brake: 1, turboBoost: false });
    expect(flightPowerControl("normal")).toEqual({ brake: 0, turboBoost: false });
    expect(flightPowerControl("turbo")).toEqual({ brake: 0, turboBoost: true });
  });

  it("cycles from Normal toward Turbo and steps without wrapping", () => {
    expect(nextFlightPowerMode("normal")).toBe("turbo");
    expect(nextFlightPowerMode("turbo")).toBe("slow");
    expect(nextFlightPowerMode("slow")).toBe("normal");
    expect(stepFlightPowerMode("slow", "faster")).toBe("normal");
    expect(stepFlightPowerMode("normal", "faster")).toBe("turbo");
    expect(stepFlightPowerMode("turbo", "faster")).toBe("turbo");
    expect(stepFlightPowerMode("turbo", "slower")).toBe("normal");
    expect(stepFlightPowerMode("normal", "slower")).toBe("slow");
    expect(stepFlightPowerMode("slow", "slower")).toBe("slow");
    expect(isFlightPowerMode("normal")).toBe(true);
    expect(isFlightPowerMode("boost")).toBe(false);
  });
});
