/**
 * Check the camera cadence governor's time-based transitions.
 * Samples cover sustained pressure, recovery and invalid measurements so a
 * brief spike or incomplete data cannot spuriously change submission rate.
 */
import { describe, expect, it } from "vitest";
import {
  CAMERA_CADENCE_RECOVERY_MS,
  CameraCadenceGovernor,
} from "./camera-cadence";

const HEALTHY = { averageFps: 60, p95FrameMs: 16.8 } as const;
const HIGH_REFRESH = { averageFps: 90, p95FrameMs: 11.2 } as const;
const PRESSURED = { averageFps: 49, p95FrameMs: 33.4 } as const;

describe("Camera cadence governor", () => {
  it("synchronizes a healthy ordinary display to rendered frames", () => {
    const governor = new CameraCadenceGovernor();

    expect(governor.diagnostics()).toMatchObject({
      targetHz: 60,
      intervalMs: 1_000 / 60,
      displaySynchronized: false,
    });
    expect(governor.update(HEALTHY, 1_000)).toMatchObject({
      targetHz: 60,
      intervalMs: 0,
      displaySynchronized: true,
      degraded: false,
    });
  });

  it("caps high-refresh displays at 60 Hz", () => {
    expect(new CameraCadenceGovernor().update(HIGH_REFRESH, 1_000)).toMatchObject({
      targetHz: 60,
      intervalMs: 1_000 / 60,
      displaySynchronized: false,
    });
  });

  it("uses 30 Hz only after sustained combined pressure and then recovers", () => {
    const governor = new CameraCadenceGovernor();
    governor.update(PRESSURED, 1_000);
    expect(governor.update(PRESSURED, 5_999).targetHz).toBe(60);
    expect(governor.update(PRESSURED, 6_000)).toMatchObject({
      targetHz: 30,
      intervalMs: 1_000 / 30,
      degraded: true,
    });

    governor.update(HEALTHY, 7_000);
    expect(governor.update(HEALTHY, 7_000 + CAMERA_CADENCE_RECOVERY_MS)).toMatchObject({
      targetHz: 60,
      intervalMs: 0,
      displaySynchronized: true,
      degraded: false,
    });
  });

  it("does not let invalid samples advance a pressure window", () => {
    const governor = new CameraCadenceGovernor();
    governor.update(PRESSURED, 0);
    expect(governor.update({ averageFps: null, p95FrameMs: 30 }, 2_500)).toMatchObject({
      targetHz: 60,
      pressureSinceMs: null,
      lastSampleValid: false,
      invalidSampleCount: 1,
    });
    governor.update(PRESSURED, 3_000);
    expect(governor.update(PRESSURED, 7_999).targetHz).toBe(60);
    expect(governor.update(PRESSURED, 8_000).targetHz).toBe(30);
  });
});
