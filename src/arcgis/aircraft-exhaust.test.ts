import { describe, expect, it } from "vitest";
import { AircraftExhaustAnimation, exhaustAnchorOffset } from "./aircraft-exhaust";

function advance(animation: AircraftExhaustAnimation, seconds: number, hz: number, boost = 2,
  acceleration = 1, reducedMotion = false): void {
  for (let frame = 0; frame < Math.round(seconds * hz); frame += 1) {
    animation.update(boost, acceleration, 1 / hz, reducedMotion);
  }
}

describe("aircraft afterburner animation", () => {
  it("builds with turbo, lengthens under thrust, and extinguishes promptly when braking cuts turbo", () => {
    const animation = new AircraftExhaustAnimation();
    animation.update(2, 1, 1 / 60, false);
    const firstLength = animation.lengthScale;
    expect(animation.visible).toBe(true);
    expect(animation.opacity).toBeLessThan(0.2);
    advance(animation, 1, 60);
    expect(animation.lengthScale).toBeGreaterThan(firstLength * 2);
    expect(animation.lengthScale).toBeGreaterThan(1.1);
    expect(animation.opacity).toBeGreaterThan(0.9);
    advance(animation, 0.15, 60, 0, 0);
    expect(animation.visible).toBe(false);
    expect(animation.opacity).toBe(0);
  });

  it("advances the same envelope and pulse at 30, 60 and 120 Hz", () => {
    const samples = [30, 60, 120].map(hz => {
      const animation = new AircraftExhaustAnimation();
      advance(animation, 0.4, hz);
      return animation;
    });
    for (const sample of samples.slice(1)) {
      expect(sample.intensity).toBeCloseTo(samples[0].intensity, 10);
      expect(sample.lengthScale).toBeCloseTo(samples[0].lengthScale, 10);
      expect(sample.opacity).toBeCloseTo(samples[0].opacity, 10);
    }
  });

  it("suppresses pulses and acceleration surges with reduced motion while keeping turbo feedback", () => {
    const animation = new AircraftExhaustAnimation();
    advance(animation, 5, 60, 2, 1, true);
    const lengths: number[] = [];
    for (let frame = 0; frame < 60; frame += 1) {
      animation.update(2, frame % 2, 1 / 60, true);
      lengths.push(animation.lengthScale);
    }
    expect(animation.visible).toBe(true);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(1e-10);
    expect(animation.lengthScale).toBeCloseTo(1.04, 10);
  });

  it("clears all animation on aircraft switches and ignores ordinary acceleration", () => {
    const animation = new AircraftExhaustAnimation();
    advance(animation, 1, 60);
    animation.reset();
    advance(animation, 1, 60, 1, 1);
    expect(animation.visible).toBe(false);
    expect(animation.intensity).toBe(0);
    expect(animation.opacity).toBe(0);
  });

  it("flutters in length without changing the settled opacity", () => {
    const animation = new AircraftExhaustAnimation();
    advance(animation, 5, 60, 2, 0);
    const lengths: number[] = [];
    const opacities: number[] = [];
    for (let frame = 0; frame < 60; frame += 1) {
      animation.update(2, 0, 1 / 60, false);
      lengths.push(animation.lengthScale);
      opacities.push(animation.opacity);
    }
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.08);
    expect(Math.max(...opacities) - Math.min(...opacities)).toBeLessThan(1e-10);
  });

  it("keeps nozzle roots attached as the plume grows without accumulating scale", () => {
    for (const outlet of [-2.845, -3.9, -2.173]) {
      for (const scale of [0.12, 0.5, 1, 1.3, 0.12]) {
        expect(outlet * scale + exhaustAnchorOffset(outlet, scale)).toBeCloseTo(outlet, 12);
      }
    }
  });
});
