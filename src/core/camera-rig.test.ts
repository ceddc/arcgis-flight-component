import { describe, expect, it } from "vitest";
import {
  aircraftVisibleForViewTransition,
  blendFlightCameraFrames,
  ChaseCameraRig,
  cockpitCameraFrame,
  FlightViewTransition,
  planeChaseFraming,
} from "./camera-rig";
import type { VehicleRenderPose } from "./runtime";

describe("camera transition and framing", () => {
  it("moves smoothly into and out of cockpit mode", () => {
    const transition = new FlightViewTransition();
    transition.setMode("cockpit");

    for (let index = 0; index < 5; index += 1) transition.update(0.1);
    expect(transition.active).toBe(true);
    expect(transition.blend).toBeGreaterThan(0);
    expect(transition.blend).toBeLessThan(1);
    expect(transition.zoomOffsetDegrees).toBeLessThan(0);
    expect(aircraftVisibleForViewTransition(transition.mode, transition.blend)).toBe(true);

    for (let index = 0; index < 6; index += 1) transition.update(0.1);
    expect(transition.blend).toBe(1);
    expect(transition.active).toBe(false);
    expect(aircraftVisibleForViewTransition(transition.mode, transition.blend)).toBe(false);

    transition.setMode("chase");
    for (let index = 0; index < 11; index += 1) transition.update(0.1);
    expect(transition.blend).toBe(0);
    expect(transition.mode).toBe("chase");
  });

  it("blends heading through north and keeps the aircraft fully framed", () => {
    const chase = { x: 0, y: 0, z: 10, heading: 350, tilt: 70, roll: 0, fovDegrees: 65 };
    const cockpit = { x: 10, y: 20, z: 20, heading: 10, tilt: 90, roll: -20, fovDegrees: 73 };
    const halfway = blendFlightCameraFrames(chase, cockpit, 0.5);
    const slow = planeChaseFraming(0, 0);
    const fastTurbo = planeChaseFraming(1, 1);

    expect(halfway.heading).toBe(0);
    expect(halfway.x).toBe(5);
    expect(slow).toEqual({ distanceM: 17.5, heightM: 6.8 });
    expect(fastTurbo.distanceM).toBe(22.5);
    expect(fastTurbo.heightM).toBeCloseTo(8.4);
  });

  it("places cockpit camera at the authored pilot eye and widens chase FOV with speed", () => {
    const pose: VehicleRenderPose = {
      position: { x: 100, y: 200, z: 1_000 },
      bodyHeading: 90,
      travelHeading: 90,
      pitch: 0,
      roll: 20,
      speed: 100,
      interpolationAlpha: 0,
      boost: 2,
    };
    const cockpit = cockpitCameraFrame(pose, 65);
    const rig = new ChaseCameraRig({
      distanceM: 7.7,
      heightM: 3.2,
      fovDegrees: 65,
      headingDegrees: 0,
    });
    const target = rig.targetForSpeed(90, 165, 165, 65);
    const settled = rig.update(target, 0, true);

    expect(cockpit.x).toBeCloseTo(100.4);
    expect(cockpit.y).toBeCloseTo(200);
    expect(cockpit.z).toBeCloseTo(1_000.58);
    expect(cockpit.roll).toBe(-20);
    expect(cockpit.fovDegrees).toBe(77);
    expect(target).toEqual({
      distanceM: 11.2,
      heightM: 4.3,
      fovDegrees: 77,
      headingDegrees: 90,
    });
    expect(settled.distanceVelocity).toBe(0);
  });
});
