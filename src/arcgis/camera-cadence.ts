/**
 * Choose a camera submission cadence from observed rendering.
 * Ordinary displays stay synchronized to rendered frames, including under
 * load; only displays measurably faster than 60 Hz keep the 60 Hz timer cap.
 */
export interface FlightFramePacing {
  /** Measured rendered frames per second over the sampling window. */
  averageFps: number | null;
  /** 95th-percentile frame duration in milliseconds over the same window. */
  p95FrameMs: number | null;
}

/** Camera submission rate used as the scheduling cap. */
export type CameraCadenceTargetHz = 60;

/** Current cadence decision and sample validity, exposed for diagnostics. */
export interface CameraCadenceDiagnostics {
  targetHz: CameraCadenceTargetHz;
  intervalMs: number;
  displaySynchronized: boolean;
  lastSampleValid: boolean | null;
  invalidSampleCount: number;
}

/** Camera submission cap on displays faster than 60 Hz. */
export const CAMERA_CADENCE_HIGH_HZ = 60;
/** At or below this measured FPS, match rendered frames instead of a timer. */
export const CAMERA_CADENCE_DISPLAY_SYNC_MAX_FPS = 65;

/** Reject incomplete, non-positive or non-finite performance samples. */
function validFramePacing(sample: Readonly<FlightFramePacing>): boolean {
  return Number.isFinite(sample.averageFps)
    && Number.isFinite(sample.p95FrameMs)
    && sample.averageFps !== null
    && sample.p95FrameMs !== null
    && sample.averageFps > 0
    && sample.p95FrameMs > 0;
}

/**
 * Keep camera submissions synchronized to rendered frames, including under load.
 *
 * Every rendered frame receives the pose for its own timestamp, so a slow frame
 * shows as a longer interval with a proportionally larger, correct camera step.
 * A timer-driven 30 Hz fallback was removed: it beat against a 35 to 50 FPS
 * render rate and repeated the previous heading on alternate frames, which read
 * as judder in turns. Only displays measurably faster than 60 Hz keep the cap.
 */
export class CameraCadenceGovernor {
  private readonly targetHz: CameraCadenceTargetHz = CAMERA_CADENCE_HIGH_HZ;
  private displaySynchronized = false;
  private lastSampleAtMs: number | null = null;
  private lastSampleValid: boolean | null = null;
  private invalidSampleCount = 0;

  /**
   * Apply one performance sample and update the display-synchronization decision.
   *
   * Invalid or time-reversed samples keep the previous decision.
   *
   * @param sample Frame-rate and frame-duration measurements.
   * @param nowMs Monotonic timestamp in milliseconds for the sample.
   * @returns Current target rate, sync decision and sample diagnostics.
   */
  update(sample: Readonly<FlightFramePacing>, nowMs: number): CameraCadenceDiagnostics {
    const validTime = Number.isFinite(nowMs)
      && nowMs >= 0
      && (this.lastSampleAtMs === null || nowMs >= this.lastSampleAtMs);
    if (!validTime || !validFramePacing(sample)) {
      this.invalidSampleCount += 1;
      this.lastSampleValid = false;
      this.lastSampleAtMs = null;
      return this.diagnostics();
    }

    this.lastSampleValid = true;
    this.lastSampleAtMs = nowMs;
    this.displaySynchronized = (sample.averageFps as number) <= CAMERA_CADENCE_DISPLAY_SYNC_MAX_FPS;
    return this.diagnostics();
  }

  /** Return the current rate decision and sample counters without mutating state. */
  diagnostics(): CameraCadenceDiagnostics {
    return {
      targetHz: this.targetHz,
      intervalMs: this.displaySynchronized ? 0 : 1_000 / this.targetHz,
      displaySynchronized: this.displaySynchronized,
      lastSampleValid: this.lastSampleValid,
      invalidSampleCount: this.invalidSampleCount,
    };
  }
}
