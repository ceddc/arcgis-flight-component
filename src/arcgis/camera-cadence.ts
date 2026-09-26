/**
 * Choose a camera submission cadence from observed rendering pressure.
 * The governor requires sustained pressure before dropping to 30 Hz and a
 * recovery window before returning to 60 Hz, avoiding rapid rate changes.
 */
export interface FlightFramePacing {
  /** Measured rendered frames per second over the sampling window. */
  averageFps: number | null;
  /** 95th-percentile frame duration in milliseconds over the same window. */
  p95FrameMs: number | null;
}

/** Discrete camera submission rates chosen by the governor. */
export type CameraCadenceTargetHz = 60 | 30;

/** Current cadence decision and transition history, exposed for diagnostics. */
export interface CameraCadenceDiagnostics {
  targetHz: CameraCadenceTargetHz;
  intervalMs: number;
  displaySynchronized: boolean;
  degraded: boolean;
  pressureSinceMs: number | null;
  degradedAtMs: number | null;
  recoverySinceMs: number | null;
  recoveredAtMs: number | null;
  lastSampleValid: boolean | null;
  invalidSampleCount: number;
}

/** Normal responsive target before sustained performance pressure. */
export const CAMERA_CADENCE_HIGH_HZ = 60;
/** Reduced target used only after the pressure window has elapsed. */
export const CAMERA_CADENCE_LOW_HZ = 30;
/** Required time with both pressure signals before reducing camera writes. */
export const CAMERA_CADENCE_PRESSURE_MS = 5_000;
/** Required time within recovery limits before restoring the higher target. */
export const CAMERA_CADENCE_RECOVERY_MS = 4_000;
/** Average FPS below which a sample is considered pressured. */
export const CAMERA_CADENCE_LOW_FPS_THRESHOLD = 50;
/** p95 frame duration above which a sample is considered pressured. */
export const CAMERA_CADENCE_HIGH_P95_MS_THRESHOLD = 25;
/** Minimum average FPS required throughout recovery. */
export const CAMERA_CADENCE_RECOVERY_FPS_THRESHOLD = 55;
/** Maximum p95 frame duration allowed throughout recovery. */
export const CAMERA_CADENCE_RECOVERY_P95_MS_THRESHOLD = 22;
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
 * Reduce camera submissions only when performance pressure is sustained, then recover cautiously.
 *
 * Pressure requires both low average FPS and a slow p95 frame duration for a
 * full window. Recovery has stricter thresholds and its own window to avoid
 * rapidly switching between rates around a boundary.
 */
export class CameraCadenceGovernor {
  private targetHz: CameraCadenceTargetHz = CAMERA_CADENCE_HIGH_HZ;
  private displaySynchronized = false;
  private pressureSinceMs: number | null = null;
  private degradedAtMs: number | null = null;
  private recoverySinceMs: number | null = null;
  private recoveredAtMs: number | null = null;
  private lastSampleAtMs: number | null = null;
  private lastSampleValid: boolean | null = null;
  private invalidSampleCount = 0;

  /**
   * Apply one performance sample and update transition timers.
   *
   * Invalid or time-reversed samples break a pending pressure/recovery window.
   *
   * @param sample Frame-rate and frame-duration measurements.
   * @param nowMs Monotonic timestamp in milliseconds for the sample.
   * @returns Current target rate, sync decision and transition diagnostics.
   */
  update(sample: Readonly<FlightFramePacing>, nowMs: number): CameraCadenceDiagnostics {
    const validTime = Number.isFinite(nowMs)
      && nowMs >= 0
      && (this.lastSampleAtMs === null || nowMs >= this.lastSampleAtMs);
    if (!validTime || !validFramePacing(sample)) {
      this.invalidSampleCount += 1;
      this.lastSampleValid = false;
      this.lastSampleAtMs = null;
      // Do not let invalid or time-reversed samples count toward a later transition.
      this.pressureSinceMs = null;
      this.recoverySinceMs = null;
      return this.diagnostics();
    }

    this.lastSampleValid = true;
    this.lastSampleAtMs = nowMs;
    const averageFps = sample.averageFps as number;
    const p95FrameMs = sample.p95FrameMs as number;

    if (this.targetHz === CAMERA_CADENCE_LOW_HZ) {
      this.pressureSinceMs = null;
      const recovering = averageFps >= CAMERA_CADENCE_RECOVERY_FPS_THRESHOLD
        && p95FrameMs <= CAMERA_CADENCE_RECOVERY_P95_MS_THRESHOLD;
      if (!recovering) {
        this.recoverySinceMs = null;
        return this.diagnostics();
      }
      this.recoverySinceMs ??= nowMs;
      if (nowMs - this.recoverySinceMs >= CAMERA_CADENCE_RECOVERY_MS) {
        this.targetHz = CAMERA_CADENCE_HIGH_HZ;
        this.degradedAtMs = null;
        this.recoveredAtMs = nowMs;
        this.recoverySinceMs = null;
      }
      this.updateDisplaySynchronization(averageFps);
      return this.diagnostics();
    }

    this.recoverySinceMs = null;
    const pressured = averageFps < CAMERA_CADENCE_LOW_FPS_THRESHOLD
      && p95FrameMs > CAMERA_CADENCE_HIGH_P95_MS_THRESHOLD;
    if (!pressured) {
      this.pressureSinceMs = null;
      this.updateDisplaySynchronization(averageFps);
      return this.diagnostics();
    }

    this.pressureSinceMs ??= nowMs;
    if (nowMs - this.pressureSinceMs >= CAMERA_CADENCE_PRESSURE_MS) {
      this.targetHz = CAMERA_CADENCE_LOW_HZ;
      this.degradedAtMs = nowMs;
      this.recoveredAtMs = null;
      this.pressureSinceMs = null;
    }
    this.updateDisplaySynchronization(averageFps);
    return this.diagnostics();
  }

  /** Return the current rate decision and timing counters without mutating state. */
  diagnostics(): CameraCadenceDiagnostics {
    return {
      targetHz: this.targetHz,
      intervalMs: this.displaySynchronized ? 0 : 1_000 / this.targetHz,
      displaySynchronized: this.displaySynchronized,
      degraded: this.targetHz === CAMERA_CADENCE_LOW_HZ,
      pressureSinceMs: this.pressureSinceMs,
      degradedAtMs: this.degradedAtMs,
      recoverySinceMs: this.recoverySinceMs,
      recoveredAtMs: this.recoveredAtMs,
      lastSampleValid: this.lastSampleValid,
      invalidSampleCount: this.invalidSampleCount,
    };
  }

  /** Let the scheduler follow rendered frames on normal displays up to the 60 Hz cap. */
  private updateDisplaySynchronization(averageFps: number): void {
    this.displaySynchronized = this.targetHz === CAMERA_CADENCE_HIGH_HZ
      && averageFps <= CAMERA_CADENCE_DISPLAY_SYNC_MAX_FPS;
  }
}
