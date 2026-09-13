import { describe, expect, it } from "vitest";
import {
  createInitialFlightState,
  FLIGHT_TUNING,
  smoothFlightPitchInput,
  stepFlight,
} from "./flight";
import type { ControlFrame, VehicleState } from "./types";

const neutral: ControlFrame = {
  pitch: 0,
  bank: 0,
  yaw: 0,
  accelerate: 0,
  brake: 0,
  airbrake: false,
  respawn: false,
};

function advance(
  initial: VehicleState,
  controls: Readonly<ControlFrame>,
  steps: number,
): VehicleState {
  let state = initial;
  for (let index = 0; index < steps; index += 1) {
    state = stepFlight(state, controls, FLIGHT_TUNING.fixedStepSeconds);
  }
  return state;
}

describe("deterministic flight behavior", () => {
  it("advances an identical input sequence deterministically", () => {
    const run = () => advance(
      createInitialFlightState({ x: 2_000, y: 3_000, z: 4_500 }, 30),
      { ...neutral, pitch: 0.25, bank: 0.6, accelerate: 0.4 },
      180,
    );

    const first = run();
    const second = run();

    expect(first).toEqual(second);
    expect(Object.values(first.position).every(Number.isFinite)).toBe(true);
    expect(first.heading).toBeGreaterThan(30);
    expect(first.position.x).toBeCloseTo(2_304.9521495976664, 10);
    expect(first.position.y).toBeCloseTo(3_075.186029277062, 10);
    expect(first.position.z).toBeCloseTo(4_615.439611859098, 10);
    expect(first.heading).toBeCloseTo(129.08734570195787, 10);
    expect(first.speed).toBeCloseTo(130.1655334542419, 10);
  });

  it("preserves the normal speed envelope and turbo/brake behavior", () => {
    const initial = createInitialFlightState({ x: 0, y: 0, z: 4_500 }, 0);
    const fast = advance(initial, { ...neutral, accelerate: 1 }, 600);
    const slow = advance(initial, { ...neutral, brake: 1, airbrake: true }, 600);
    const turbo = advance(initial, { ...neutral, turboBoost: true }, 300);
    const interrupted = stepFlight(
      turbo,
      { ...neutral, turboBoost: true, brake: 1, airbrake: true },
      FLIGHT_TUNING.fixedStepSeconds,
    );

    expect(fast.speed).toBeLessThanOrEqual(FLIGHT_TUNING.maximumSpeed);
    expect(slow.speed).toBeCloseTo(51.11788914886666, 10);
    expect(turbo.speed).toBeGreaterThan(FLIGHT_TUNING.maximumSpeed);
    expect(turbo.launchBoost).toBe(2);
    expect(interrupted.speed).toBeLessThan(turbo.speed);
    expect(interrupted.launchBoost).not.toBe(2);
  });

  it("reaches commanded pitch and bank, then self-levels on release", () => {
    const initial = createInitialFlightState({ x: 0, y: 0, z: 4_500 }, 0);
    const commanded = advance(initial, { ...neutral, pitch: 1, bank: -1 }, 180);
    const levelled = advance(commanded, neutral, 210);

    expect(commanded.pitch).toBeCloseTo(FLIGHT_TUNING.maximumPitchDeg, 4);
    expect(commanded.bank).toBeCloseTo(-FLIGHT_TUNING.maximumBankDeg, 2);
    expect(levelled.pitch).toBeCloseTo(1, 4);
    expect(Math.abs(levelled.bank)).toBeLessThan(0.001);
    expect(smoothFlightPitchInput(1, 0, FLIGHT_TUNING.fixedStepSeconds)).toBe(0);
  });
});
