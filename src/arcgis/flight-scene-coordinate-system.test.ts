/**
 * Check coordinate strategy selection and conversion at the ArcGIS boundary.
 * Covers supported scene modes, metres-per-unit scaling and how the converted
 * aircraft position feeds camera presentation.
 */
import { describe, expect, it } from "vitest";
import { flightSceneCoordinateMode, flightSceneMetersPerUnit, flightToScenePosition, sceneToFlightPosition } from "./flight-scene-coordinate-system";
import { sampleElevationWithPriority } from "./elevation-sampling";
import { FlightCameraController } from "./flight-camera";

describe("flight scene coordinate systems", () => {
  it("keeps global Web Mercator coordinates unchanged", () => {
    const sr = { isGeographic: false, isWebMercator: true, metersPerUnit: 1 };
    const mode = flightSceneCoordinateMode("global", sr);
    expect(mode).toBe("web-mercator");
    const position = { x: 850000, y: 6000000, z: 3000 };
    expect(flightToScenePosition(position, flightSceneMetersPerUnit(mode, sr))).toEqual(position);
  });
  it.each([1, 0.3048, 1200 / 3937])("preserves physical movement, clearance, and camera distances at scale %s", scale => {
    const sr = { isGeographic: false, isWebMercator: false, metersPerUnit: scale };
    expect(flightSceneMetersPerUnit(flightSceneCoordinateMode("local", sr), sr)).toBe(scale);
    const scene = { x: 989022.743395025, y: 218769.838429796, z: 500 };
    const metric = sceneToFlightPosition(scene, scale);
    const roundtrip = flightToScenePosition(metric, scale);
    for (const axis of ["x", "y", "z"] as const) expect(roundtrip[axis]).toBeCloseTo(scene[axis], 8);
    const moved = flightToScenePosition({ x: metric.x + 70, y: metric.y, z: metric.z + 5 }, scale);
    expect((moved.x - scene.x) * scale).toBeCloseTo(70);
    expect((moved.z - scene.z) * scale).toBeCloseTo(5);
    const lastSafe = { position: metric, elevationM: 50, timestampMs: 0 };
    expect(sampleElevationWithPriority({ point: { x: metric.x + 119, y: metric.y }, lastSafe, nowMs: 100 }).elevationM).toBe(50);
    expect(sampleElevationWithPriority({ point: { x: metric.x + 121, y: metric.y }, lastSafe, nowMs: 100 }).elevationM).toBeNull();
    const pose = { position: metric, bodyHeading: 25, travelHeading: 25, pitch: 0, roll: 0, speed: 70, interpolationAlpha: 0 };
    const camera = new FlightCameraController(pose, 65);
    for (const mode of ["chase", "cockpit"] as const) {
      camera.setMode(mode, true);
      const frame = camera.update({ pose, verticalFovDegrees: 65, deltaSeconds: 1 / 60, viewport: { width: 1280, height: 720 }, webMercator: false, bankedViewport: false, snap: true });
      const sceneCamera = flightToScenePosition(frame, scale);
      const metricDistance = Math.hypot(frame.x - metric.x, frame.y - metric.y, frame.z - metric.z);
      const sceneDistance = Math.hypot(sceneCamera.x - scene.x, sceneCamera.y - scene.y, sceneCamera.z - scene.z);
      expect(sceneDistance * scale).toBeCloseTo(metricDistance, 7);
      expect(metricDistance).toBeGreaterThan(0);
    }
  });
  it("rejects geographic, local Web Mercator, other global, and invalid linear units", () => {
    const sr = { isGeographic: false, isWebMercator: false, metersPerUnit: 1 };
    for (const invalid of [{ ...sr, isGeographic: true }, { ...sr, isWebMercator: true },
      ...[0, -1, NaN, Infinity].map(metersPerUnit => ({ ...sr, metersPerUnit }))]) {
      expect(() => flightSceneCoordinateMode("local", invalid)).toThrow(/projected linear coordinates/);
    }
    expect(() => flightSceneCoordinateMode("global", sr)).toThrow(/projected linear coordinates/);
  });
});
