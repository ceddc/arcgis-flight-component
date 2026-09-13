import { describe, expect, it } from "vitest";
import { CameraDrag, clearCameraGround, orbitFlightCamera } from "./camera-drag";
import type { FlightCameraFrame } from "./camera-rig";

const frame: FlightCameraFrame = { x: 0, y: -20, z: 108, heading: 0, tilt: 75, roll: 0, fovDegrees: 62 };
const pivot = { x: 0, y: 0, z: 100 };

describe("temporary camera look", () => {
  it("holds the dragged position, then eases home without a release jump", () => {
    const camera = new CameraDrag();
    camera.begin(); camera.move(300, 100);
    const held = camera.offset;
    expect(Math.abs(held.yawDegrees)).toBeGreaterThan(60);
    expect(camera.update(.1)).toEqual(held);
    camera.release();
    expect(camera.update(0)).toEqual(held);
    const first = camera.update(1 / 60);
    expect(Math.abs(first.yawDegrees - held.yawDegrees)).toBeLessThan(.02);
    for (let i = 0; i < 24; i++) camera.update(1 / 60);
    const halfway = camera.offset;
    expect(Math.abs(halfway.yawDegrees)).toBeGreaterThan(Math.abs(held.yawDegrees) * .4);
    expect(Math.abs(halfway.yawDegrees)).toBeLessThan(Math.abs(held.yawDegrees) * .6);
    for (let i = 0; i < 30; i++) camera.update(1 / 60);
    expect(camera.offset).toEqual({ yawDegrees: 0, pitchDegrees: 0 });
  });

  it("can be grabbed again during return without jumping", () => {
    const camera = new CameraDrag();
    camera.begin(); camera.move(300, -40); camera.release(); camera.update(.1);
    const returning = camera.offset;
    camera.begin();
    expect(camera.update(.1)).toEqual(returning);
    camera.move(-10, 0);
    expect(camera.offset.yawDegrees).toBeCloseTo(returning.yawDegrees + 2.4);
  });

  it("bounds large drags and reverses immediately at a limit", () => {
    const camera = new CameraDrag();
    camera.begin(); camera.move(100_000, -100_000);
    expect(camera.offset).toEqual({ yawDegrees: -170, pitchDegrees: -55 });
    camera.move(-10, 10);
    expect(camera.offset.yawDegrees).toBeGreaterThan(-170);
    expect(camera.offset.pitchDegrees).toBeGreaterThan(-55);
  });

  it("returns immediately with reduced motion and resets both held and returning looks", () => {
    const camera = new CameraDrag();
    camera.begin(); camera.move(40, 70); camera.release();
    expect(camera.update(0, true)).toEqual({ yawDegrees: 0, pitchDegrees: 0 });
    camera.begin(); camera.move(40, 70); camera.reset();
    expect(camera.dragging).toBe(false);
    expect(camera.update(.1)).toEqual({ yawDegrees: 0, pitchDegrees: 0 });
  });

  it("returns consistently at 30, 60 and 144 FPS", () => {
    const results = [30, 60, 144].map(fps => {
      const camera = new CameraDrag();
      camera.begin(); camera.move(300, 80); camera.release();
      for (let i = 0; i < fps / 2; i++) camera.update(1 / fps);
      return camera.offset.yawDegrees;
    });
    expect(results[1]).toBeCloseTo(results[0], 9);
    expect(results[2]).toBeCloseTo(results[0], 9);
  });
});

describe("camera orbit geometry", () => {
  it("leaves the normal chase frame exactly unchanged at neutral", () => {
    const neutral = { yawDegrees: 0, pitchDegrees: 0 };
    expect(orbitFlightCamera(frame, pivot, neutral, 1)).toBe(frame);
  });

  it.each([1, 1.44, 3])("orbits in real metres at map scale %s", scale => {
    const result = orbitFlightCamera({ ...frame, y: frame.y * scale }, pivot,
      { yawDegrees: 90, pitchDegrees: 0 }, scale);
    expect(result.x / scale).toBeCloseTo(-20, 8);
    expect(result.y).toBeCloseTo(0, 8);
    expect(result.z).toBeCloseTo(frame.z, 8);
    expect(result.heading).toBe(90);
    expect(result.tilt).toBeCloseTo(frame.tilt, 8);
  });

  it("preserves camera distance and framing as a vertical orbit rises", () => {
    const result = orbitFlightCamera(frame, pivot, { yawDegrees: -120, pitchDegrees: 25 }, 1);
    expect(Math.hypot(result.x, result.y, result.z - pivot.z)).toBeCloseTo(Math.hypot(20, 8), 9);
    expect(result.z).toBeGreaterThan(frame.z);
    expect(result.tilt).toBeCloseTo(50, 9);
    expect(result.heading).toBe(240);
    expect(result.fovDegrees).toBe(frame.fovDegrees);
  });

  it("keeps steep orbits finite and away from the pole", () => {
    const result = orbitFlightCamera(frame, pivot, { yawDegrees: 170, pitchDegrees: 65 }, 1);
    expect(Math.hypot(result.x, result.y)).toBeGreaterThan(1);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
  });

  it("raises a low camera above ground and keeps its original sightline target", () => {
    const corrected = clearCameraGround(frame, 112, 30);
    const targetZ = frame.z + Math.sin((frame.tilt - 90) * Math.PI / 180) * 30;
    const horizontal = Math.cos((frame.tilt - 90) * Math.PI / 180) * 30;
    expect(corrected.z).toBe(112);
    expect(corrected.z + Math.tan((corrected.tilt - 90) * Math.PI / 180) * horizontal).toBeCloseTo(targetZ, 9);
    expect(clearCameraGround(frame, 100, 30)).toBe(frame);
  });
});
