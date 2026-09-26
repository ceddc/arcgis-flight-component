/**
 * Guards the fixed-step simulation clock and render interpolation.
 * The suite checks deterministic stepping, bounded catch-up after a slow
 * frame, reported dropped time, and shortest-path heading interpolation.
 */
import { describe, expect, it } from "vitest";
import {
  GAME_FIXED_STEP_SECONDS,
  GameRuntime,
  interpolatePhysicsPose,
  type PhysicsPose,
} from "./runtime";

const initialPose = (): PhysicsPose => ({
  position: { x: 0, y: 0, z: 1_000 },
  bodyHeading: 359,
  travelHeading: 359,
  pitch: 0,
  roll: 0,
  speed: 100,
});

const deterministicStep = (pose: Readonly<PhysicsPose>, deltaSeconds: number): PhysicsPose => ({
  ...pose,
  position: {
    x: pose.position.x + pose.speed * deltaSeconds,
    y: pose.position.y + 2 * deltaSeconds,
    z: pose.position.z,
  },
  bodyHeading: pose.bodyHeading + 2,
  travelHeading: pose.travelHeading + 2,
});

describe("fixed-step flight runtime", () => {
  it("produces the same pose for identical fixed-step sequences", () => {
    const first = new GameRuntime(initialPose(), deterministicStep);
    const second = new GameRuntime(initialPose(), deterministicStep);

    const firstFrame = first.advanceFixedSteps(120);
    const secondFrame = second.advanceFixedSteps(120);

    expect(firstFrame.currentPose).toEqual(secondFrame.currentPose);
    expect(firstFrame.currentPose.position.x).toBeCloseTo(200, 10);
    expect(firstFrame.currentPose.bodyHeading).toBe(239);
    expect(firstFrame.simulationStep).toBe(120);
  });

  it("caps catch-up work and reports discarded simulation time", () => {
    const runtime = new GameRuntime(initialPose(), deterministicStep, {
      fixedStepSeconds: GAME_FIXED_STEP_SECONDS,
      maxCatchUpSteps: 4,
    });

    const frame = runtime.advanceFrame(10 * GAME_FIXED_STEP_SECONDS);

    expect(frame.simulatedSteps).toBe(4);
    expect(frame.droppedSeconds).toBeCloseTo(6 * GAME_FIXED_STEP_SECONDS, 12);
    expect(frame.interpolationAlpha).toBeCloseTo(0, 12);
  });

  it("interpolates headings through north along the shortest arc", () => {
    const previous = initialPose();
    const current = { ...initialPose(), bodyHeading: 1, travelHeading: 1 };
    const render = interpolatePhysicsPose(previous, current, 0.5);

    expect(render.bodyHeading).toBe(0);
    expect(render.travelHeading).toBe(0);
    expect(render.interpolationAlpha).toBe(0.5);
  });
});
