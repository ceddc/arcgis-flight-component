/**
 * Check the camera cadence governor's display-synchronization decisions.
 * Samples cover ordinary and high-refresh displays, sustained frame pressure
 * and invalid measurements, which must never change the submission rate.
 */
import { describe, expect, it } from "vitest";
import { CameraCadenceGovernor } from "./camera-cadence";

const HEALTHY = { averageFps: 60, p95FrameMs: 16.8 } as const;
const HIGH_REFRESH = { averageFps: 90, p95FrameMs: 11.2 } as const;
const PRESSURED = { averageFps: 38, p95FrameMs: 33.4 } as const;

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
    });
  });

  it("caps high-refresh displays at 60 Hz", () => {
    expect(new CameraCadenceGovernor().update(HIGH_REFRESH, 1_000)).toMatchObject({
      targetHz: 60,
      intervalMs: 1_000 / 60,
      displaySynchronized: false,
    });
  });

  it("keeps every rendered frame under sustained frame pressure", () => {
    const governor = new CameraCadenceGovernor();

    for (let nowMs = 0; nowMs <= 30_000; nowMs += 500) governor.update(PRESSURED, nowMs);
    expect(governor.diagnostics()).toMatchObject({
      targetHz: 60,
      intervalMs: 0,
      displaySynchronized: true,
    });
  });

  it("keeps the previous decision on missing, non-finite, or time-regressing samples", () => {
    const governor = new CameraCadenceGovernor();

    governor.update(HEALTHY, 0);
    expect(governor.update({ averageFps: null, p95FrameMs: 30 }, 2_500)).toMatchObject({
      displaySynchronized: true,
      lastSampleValid: false,
    });
    governor.update(HIGH_REFRESH, 3_000);
    expect(governor.update({ averageFps: Number.NaN, p95FrameMs: 30 }, 4_000)).toMatchObject({
      intervalMs: 1_000 / 60,
      displaySynchronized: false,
      lastSampleValid: false,
    });
    governor.update(HEALTHY, 5_000);
    expect(governor.update(HEALTHY, 4_999).lastSampleValid).toBe(false);
    expect(governor.diagnostics().invalidSampleCount).toBe(3);
  });
});
