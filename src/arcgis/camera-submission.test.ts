/**
 * Exercise the camera write scheduler with a controlled clock and timers.
 * Checks coalescing, immediate snaps, cadence changes, failure diagnostics
 * and destruction while a frame or scheduled write is pending.
 */
import { describe, expect, it, vi } from "vitest";
import {
  type ArcGISCameraFrame,
  CameraSubmissionScheduler,
} from "./camera-submission";

interface TestCameraFrame extends ArcGISCameraFrame {
  tick: number;
}

function testFrame(x: number): TestCameraFrame {
  return {
    x, y: 2, z: 3, heading: 4, tilt: 5,
    roll: 6, rollScale: 1, baseFov: 65, fov: 65, tick: x,
  };
}

function invokeScheduled(callback: (() => void) | null): void {
  if (!callback) {
    throw new Error("Expected a scheduled camera callback.");
  }
  callback();
}

describe("Camera submission scheduler", () => {
  it("reports the configured 120 Hz cap", () => {
    const scheduler = new CameraSubmissionScheduler({
      intervalMs: 1_000 / 120,
      submit: () => undefined,
    });
    const diagnostics = scheduler.diagnostics();
    expect(diagnostics.intervalMs).toBe(1_000 / 120);
    expect(diagnostics.toleranceMs).toBe(0.25);
    expect(diagnostics.maximumHz).toBeCloseTo(120);
    expect(diagnostics.submissionCount).toBe(0);
    expect(diagnostics).toMatchObject({
      errorCount: 0,
      coalescedCount: 0,
      pending: false,
    });
    scheduler.destroy();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "rejects an invalid interval of %s",
    (intervalMs) => {
      expect(() => new CameraSubmissionScheduler({
        intervalMs,
        submit: () => undefined,
      })).toThrow(RangeError);
    },
  );

  it("submits synchronous frames immediately and reuses its detached buffer", () => {
    let now = 0;
    const submitted: Array<{ frame: object; x: number; tick: number }> = [];
    const scheduler = new CameraSubmissionScheduler<TestCameraFrame>({
      intervalMs: 0,
      now: () => now,
      submit: (frame) => {
        submitted.push({ frame, x: frame.x, tick: frame.tick });
      },
    });

    scheduler.update({
      x: 1, y: 2, z: 3, heading: 4, tilt: 5,
      roll: 6, rollScale: 1, baseFov: 65, fov: 65, tick: 1,
    });
    now += 1;
    scheduler.update({
      x: 10, y: 20, z: 30, heading: 40, tilt: 50,
      roll: 60, rollScale: 1.1, baseFov: 66, fov: 67, tick: 2,
    });

    expect(submitted).toHaveLength(2);
    expect(submitted.map(({ x, tick }) => ({ x, tick }))).toEqual([
      { x: 1, tick: 1 },
      { x: 10, tick: 2 },
    ]);
    expect(submitted[0]?.frame).toBe(submitted[1]?.frame);
    expect(scheduler.diagnostics()).toMatchObject({
      submissionCount: 2,
      errorCount: 0,
    });
    scheduler.destroy();
  });

  it("coalesces pending updates into one timer with the newest complete frame", () => {
    let now = 0;
    let scheduled: (() => void) | null = null;
    const submitted: TestCameraFrame[] = [];
    const schedule = vi.fn((callback: () => void) => {
      scheduled = callback;
      return 1;
    });
    const scheduler = new CameraSubmissionScheduler<TestCameraFrame>({
      intervalMs: 10,
      now: () => now,
      schedule,
      cancel: vi.fn(),
      submit: (frame) => { submitted.push({ ...frame }); },
    });

    scheduler.update(testFrame(1));
    now = 1;
    scheduler.update(testFrame(2));
    const newest = { ...testFrame(3), heading: 80, fov: 70 };
    // The caller is allowed to reuse its frame object after update; the queued submission must retain its own snapshot.
    scheduler.update(newest);
    newest.x = 999;
    expect(submitted).toEqual([testFrame(1)]);
    expect(schedule).toHaveBeenCalledOnce();
    expect(scheduler.diagnostics().coalescedCount).toBe(1);

    now = 10;
    invokeScheduled(scheduled);
    expect(submitted).toEqual([testFrame(1), { ...testFrame(3), heading: 80, fov: 70 }]);
    expect(scheduler.diagnostics().pending).toBe(false);
    scheduler.destroy();
  });

  it("releases the scheduler after a synchronous submission error", () => {
    const onError = vi.fn();
    let shouldThrow = true;
    const scheduler = new CameraSubmissionScheduler({
      intervalMs: 0,
      submit: () => {
        if (shouldThrow) throw new Error("camera write failed");
      },
      onError,
    });
    const frame = {
      x: 1, y: 2, z: 3, heading: 4, tilt: 5,
      roll: 6, rollScale: 1, baseFov: 65, fov: 65,
    };

    scheduler.update(frame);
    expect(onError).toHaveBeenCalledOnce();
    expect(scheduler.diagnostics()).toMatchObject({
      pending: false,
      errorCount: 1,
    });
    shouldThrow = false;
    scheduler.update({ ...frame, x: 2 });
    expect(scheduler.diagnostics()).toMatchObject({
      submissionCount: 2,
      errorCount: 1,
    });
    scheduler.destroy();
  });

  it("waits for cadence and honors the early tolerance window", () => {
    let now = 0;
    let scheduled: (() => void) | null = null;
    let scheduledDelay = 0;
    const submitted: number[] = [];
    const scheduler = new CameraSubmissionScheduler<TestCameraFrame>({
      intervalMs: 10,
      toleranceMs: 0.25,
      now: () => now,
      schedule: (callback, delayMs) => {
        scheduled = callback;
        scheduledDelay = delayMs;
        return 7;
      },
      cancel: vi.fn(),
      submit: (frame) => { submitted.push(frame.tick); },
    });

    scheduler.update(testFrame(1));
    now = 1;
    scheduler.update(testFrame(2));
    expect(submitted).toEqual([1]);
    expect(scheduledDelay).toBe(9);
    expect(scheduler.diagnostics().timerScheduled).toBe(true);

    now = 9.8;
    invokeScheduled(scheduled);
    expect(submitted).toEqual([1, 2]);
    expect(scheduler.diagnostics().timerScheduled).toBe(false);
    scheduler.destroy();
  });

  it("snaps immediately and cancels the pending cadence timer", () => {
    let now = 0;
    let scheduled: (() => void) | null = null;
    const cancel = vi.fn();
    const submitted: number[] = [];
    const scheduler = new CameraSubmissionScheduler<TestCameraFrame>({
      intervalMs: 10,
      now: () => now,
      schedule: (callback) => {
        scheduled = callback;
        return 8;
      },
      cancel,
      submit: (frame) => { submitted.push(frame.tick); },
    });

    scheduler.update(testFrame(1));
    now = 1;
    scheduler.update(testFrame(2));
    // A snap bypasses the cadence, and the stale callback must not submit the frame again when it fires later.
    scheduler.update(testFrame(3), true);

    expect(cancel).toHaveBeenCalledWith(8);
    expect(submitted).toEqual([1, 3]);
    expect(scheduler.diagnostics()).toMatchObject({
      pending: false,
      timerScheduled: false,
    });
    now = 10;
    invokeScheduled(scheduled);
    expect(submitted).toEqual([1, 3]);
    scheduler.destroy();
  });

  it("can change cadence without losing the newest pending frame", () => {
    let now = 0;
    let scheduled: (() => void) | null = null;
    const cancel = vi.fn();
    const submitted: number[] = [];
    const scheduler = new CameraSubmissionScheduler<TestCameraFrame>({
      intervalMs: 20,
      now: () => now,
      schedule: (callback) => {
        scheduled = callback;
        return 15;
      },
      cancel,
      submit: (frame) => { submitted.push(frame.tick); },
    });

    scheduler.update(testFrame(1));
    now = 2;
    scheduler.update(testFrame(2));
    expect(scheduled).not.toBeNull();

    scheduler.setIntervalMs(0);

    expect(cancel).toHaveBeenCalledWith(15);
    expect(submitted).toEqual([1, 2]);
    expect(scheduler.diagnostics()).toMatchObject({
      intervalMs: 0,
      maximumHz: null,
      pending: false,
    });
    scheduler.destroy();
  });

  it("cancels the timer and drops pending and future updates after destroy", () => {
    const cancel = vi.fn();
    let scheduled: (() => void) | null = null;
    let now = 0;
    const submitted: number[] = [];
    const scheduler = new CameraSubmissionScheduler<TestCameraFrame>({
      intervalMs: 10,
      now: () => now,
      schedule: (callback) => {
        scheduled = callback;
        return 11;
      },
      cancel,
      submit: (frame) => { submitted.push(frame.tick); },
    });

    scheduler.update(testFrame(1));
    now = 1;
    scheduler.update(testFrame(2));
    expect(scheduler.diagnostics().pending).toBe(true);
    scheduler.destroy();
    scheduler.destroy();
    expect(scheduler.diagnostics()).toMatchObject({
      destroyed: true,
      pending: false,
      timerScheduled: false,
    });
    expect(cancel).toHaveBeenCalledExactlyOnceWith(11);
    now = 20;
    scheduler.update(testFrame(3), true);
    invokeScheduled(scheduled);
    expect(submitted).toEqual([1]);
  });
});
