import { describe, expect, it } from "vitest";
import { createInitialFlightState } from "../core/flight";
import type { VehicleRenderPose } from "../core/runtime";
import { FlightCameraController } from "./flight-camera";

function pose(overrides: Partial<VehicleRenderPose> = {}): VehicleRenderPose {
  const state = createInitialFlightState({ x: 930_000, y: 5_900_000, z: 1_500 }, 118);
  return {
    position: { ...state.position },
    bodyHeading: state.heading,
    travelHeading: state.heading,
    pitch: state.pitch,
    roll: state.bank,
    speed: state.speed,
    interpolationAlpha: 0,
    ...overrides,
  };
}

describe("flight camera controller", () => {
  it("keeps the original FOV when cockpit roll is unavailable", () => {
    const initial = pose({ roll: 40 });
    const controller = new FlightCameraController(initial, 65);
    controller.setMode("cockpit", true);
    const frame = controller.update({
      pose: initial,
      verticalFovDegrees: 65,
      deltaSeconds: 1 / 60,
      viewport: { width: 1440, height: 900 },
      webMercator: true,
      bankedViewport: false,
    });
    expect(frame.roll).toBe(0);
    expect(frame.rollScale).toBe(1);
    expect(frame.fov).toBe(frame.baseFov);
    expect(frame.aircraftVisible).toBe(false);
  });

  it("keeps chase level and puts the camera behind the aircraft", () => {
    const initial = pose();
    const controller = new FlightCameraController(initial, 65);
    const frame = controller.update({
      pose: initial,
      verticalFovDegrees: 65,
      deltaSeconds: 1 / 60,
      viewport: { width: 1440, height: 900 },
      webMercator: true,
      bankedViewport: true,
      snap: true,
    });
    expect(frame.viewMode).toBe("chase");
    expect(frame.roll).toBe(0);
    expect(frame.fov).toBeGreaterThan(65);
    expect(Math.hypot(frame.x - initial.position.x, frame.y - initial.position.y)).toBeGreaterThan(17);
    expect(frame.aircraftVisible).toBe(true);
  });

  it("moves the chase camera with pitch during climbs and dives", () => {
    const climbing = pose({ pitch: 35 });
    const climbingController = new FlightCameraController(climbing, 65);
    const climbingFrame = climbingController.update({
      pose: climbing,
      verticalFovDegrees: 65,
      deltaSeconds: 1 / 60,
      viewport: { width: 1440, height: 900 },
      webMercator: true,
      bankedViewport: true,
      snap: true,
    });
    const diving = pose({ pitch: -35 });
    const divingController = new FlightCameraController(diving, 65);
    const divingFrame = divingController.update({
      pose: diving,
      verticalFovDegrees: 65,
      deltaSeconds: 1 / 60,
      viewport: { width: 1440, height: 900 },
      webMercator: true,
      bankedViewport: true,
      snap: true,
    });

    expect(climbingFrame.z - climbing.position.z).toBeLessThan(4);
    expect(divingFrame.z - diving.position.z).toBeGreaterThan(11);
    expect(climbingFrame.tilt).toBeGreaterThan(divingFrame.tilt);
    expect(divingFrame.tilt).toBeLessThan(80);
  });

  it("transitions to a banked cockpit and hides the aircraft near completion", () => {
    const initial = pose({ roll: 30 });
    const controller = new FlightCameraController(initial, 65);
    controller.setMode("cockpit");
    let frame = controller.update({
      pose: initial,
      verticalFovDegrees: 65,
      deltaSeconds: 1 / 60,
      viewport: { width: 1440, height: 900 },
      webMercator: true,
      bankedViewport: true,
    });
    for (let index = 0; index < 70; index += 1) {
      frame = controller.update({
        pose: initial,
        verticalFovDegrees: 65,
        deltaSeconds: 1 / 60,
        viewport: { width: 1440, height: 900 },
        webMercator: true,
        bankedViewport: true,
      });
    }
    expect(frame.transitionBlend).toBeCloseTo(1, 6);
    expect(frame.roll).toBeCloseTo(-30, 6);
    expect(frame.rollScale).toBeGreaterThan(1);
    expect(frame.aircraftVisible).toBe(false);
  });
});

it("orbits chase, clears sampled ground, and resets the look on cockpit entry", () => {
  const initial = pose();
  const controller = new FlightCameraController(initial, 65);
  const options = { pose: initial, verticalFovDegrees: 65, deltaSeconds: 1 / 60,
    viewport: { width: 1200, height: 800 }, webMercator: true, bankedViewport: true };
  const neutral = controller.update(options);
  controller.drag.begin(); controller.drag.move(200, -100);
  const orbit = controller.update({ ...options, elevationAtWorld: () => initial.position.z + 20 });
  expect(orbit.heading).toBeCloseTo(neutral.heading - 48, 8);
  expect(orbit.z).toBeGreaterThanOrEqual(initial.position.z + 22);
  controller.setMode("cockpit", true);
  expect(controller.canOrbit).toBe(false);
  expect(controller.drag.offset).toEqual({ yawDegrees: 0, pitchDegrees: 0 });
  const fixed = new FlightCameraController(initial, 65);
  fixed.setMode("cockpit", true);
  const actual = controller.update(options);
  const expected = fixed.update(options);
  expect(actual.heading).toBeCloseTo(expected.heading, 10);
  expect({ ...actual, heading: 0 }).toEqual({ ...expected, heading: 0 });
});
