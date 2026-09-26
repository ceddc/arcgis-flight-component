/**
 * Bound ArcGIS camera writes while retaining the newest complete flight frame.
 * The scheduler coalesces intermediate poses, supports immediate snaps and
 * exposes diagnostics so the hosted scene can track write cadence and failures.
 */
/** Complete camera pose accepted by the ArcGIS view setter. */
export interface ArcGISCameraFrame {
  x: number;
  y: number;
  z: number;
  heading: number;
  tilt: number;
  roll: number;
  rollScale: number;
  baseFov: number;
  fov: number;
}

/** Observable scheduler state used to diagnose write rate, lag and failures. */
export interface CameraSubmissionDiagnostics {
  intervalMs: number;
  toleranceMs: number;
  maximumHz: number | null;
  effectiveHz: number | null;
  submissionCount: number;
  errorCount: number;
  coalescedCount: number;
  pending: boolean;
  timerScheduled: boolean;
  destroyed: boolean;
}

/** Clock, timer and camera-write dependencies for the throttled frame scheduler. */
export interface CameraSubmissionOptions<TFrame extends ArcGISCameraFrame = ArcGISCameraFrame> {
  /** Minimum time between writes; zero disables throttling. */
  intervalMs?: number;
  /** Small timing tolerance to avoid scheduling near-zero-delay timer churn. */
  toleranceMs?: number;
  /** Monotonic clock, injectable to make scheduling deterministic. */
  now?: () => number;
  /** Timer scheduler, injectable alongside `now` for controlled environments. */
  schedule?: (callback: () => void, delayMs: number) => number;
  /** Cancels handles returned by `schedule`. */
  cancel?: (handle: number) => void;
  /** Applies a complete frame to the ArcGIS camera. */
  submit: (frame: Readonly<TFrame>) => void;
  /** Receives write failures without stopping future camera updates. */
  onError?: (error: unknown) => void;
}

/** Validate scheduler interval values before storing or applying them. */
function validIntervalMs(intervalMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new RangeError(
      `Camera submission interval must be a finite non-negative number, received ${intervalMs}.`,
    );
  }
  return intervalMs;
}

/**
 * Rate-limit camera writes while retaining only the newest complete pose.
 *
 * Intermediate poses are coalesced instead of queued, keeping latency bounded
 * when the simulation produces frames faster than the ArcGIS view should receive them.
 */
export class CameraSubmissionScheduler<TFrame extends ArcGISCameraFrame = ArcGISCameraFrame> {
  private intervalMs: number;
  private readonly toleranceMs: number;
  private readonly now: () => number;
  private readonly schedule: (callback: () => void, delayMs: number) => number;
  private readonly cancel: (handle: number) => void;
  private readonly submitFrame: CameraSubmissionOptions<TFrame>["submit"];
  private readonly onError: (error: unknown) => void;
  private frame: TFrame | null = null;
  private pending = false;
  private lastSubmitMs = Number.NEGATIVE_INFINITY;
  private timer = 0;
  private destroyed = false;
  private submissionCount = 0;
  private errorCount = 0;
  private firstSubmitMs: number | null = null;
  private coalescedCount = 0;

  /** Capture scheduling dependencies and validate the initial write interval. */
  constructor(options: CameraSubmissionOptions<TFrame>) {
    this.intervalMs = validIntervalMs(options.intervalMs ?? 1_000 / 30);
    this.toleranceMs = Math.max(0, options.toleranceMs ?? 0.25);
    this.now = options.now ?? (() => performance.now());
    this.schedule = options.schedule ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));
    this.cancel = options.cancel ?? ((handle) => window.clearTimeout(handle));
    this.submitFrame = options.submit;
    this.onError = options.onError ?? (() => undefined);
  }

  /**
   * Offer a new camera pose; it is submitted now or replaces the pending pose.
   *
   * Set `snap` for transitions such as view-mode changes where the new camera
   * must not wait behind the normal cadence interval.
   *
   * @param frame Latest complete camera state.
   * @param snap Submit immediately by clearing the cadence wait.
   */
  update(frame: Readonly<TFrame>, snap = false): void {
    if (this.destroyed) return;
    // Replace a waiting frame rather than queueing stale poses that would increase input lag.
    if (this.pending) this.coalescedCount += 1;
    if (this.frame) Object.assign(this.frame, frame);
    else this.frame = { ...frame } as TFrame;
    this.pending = true;
    if (snap) {
      this.clearTimer();
      this.lastSubmitMs = Number.NEGATIVE_INFINITY;
    }
    this.flush();
  }

  /** Report write-rate, coalescing, error and lifecycle counters. */
  diagnostics(): CameraSubmissionDiagnostics {
    const elapsedMs = this.firstSubmitMs === null ? 0 : this.now() - this.firstSubmitMs;
    return {
      intervalMs: this.intervalMs,
      toleranceMs: this.toleranceMs,
      maximumHz: this.intervalMs > 0 ? 1_000 / this.intervalMs : null,
      effectiveHz: elapsedMs > 0 && this.submissionCount > 1
        ? (this.submissionCount - 1) * 1_000 / elapsedMs
        : null,
      submissionCount: this.submissionCount,
      errorCount: this.errorCount,
      coalescedCount: this.coalescedCount,
      pending: this.pending,
      timerScheduled: this.timer !== 0,
      destroyed: this.destroyed,
    };
  }

  /** Stop pending work and discard the last pose; safe to call repeatedly. */
  destroy(): void {
    this.destroyed = true;
    this.pending = false;
    this.frame = null;
    this.clearTimer();
  }

  /** Submit the latest pose if the interval has elapsed, otherwise schedule one timer. */
  private flush(): void {
    if (this.destroyed || !this.pending || !this.frame) return;
    const remainingMs = this.intervalMs - (this.now() - this.lastSubmitMs);
    if (remainingMs > this.toleranceMs) {
      if (!this.timer) {
        this.timer = this.schedule(() => {
          this.timer = 0;
          this.flush();
        }, remainingMs);
      }
      return;
    }

    this.clearTimer();
    this.pending = false;
    this.submissionCount += 1;
    this.lastSubmitMs = this.now();
    this.firstSubmitMs ??= this.lastSubmitMs;
    try {
      this.submitFrame(this.frame);
    } catch (error) {
      this.errorCount += 1;
      this.onError(error);
    }
  }

  /** Change the throttle interval and reschedule pending work using the new rate. */
  setIntervalMs(intervalMs: number): void {
    const nextIntervalMs = validIntervalMs(intervalMs);
    if (this.destroyed || nextIntervalMs === this.intervalMs) return;
    this.intervalMs = nextIntervalMs;
    this.clearTimer();
    this.flush();
  }

  /** Cancel the currently scheduled timer, if any. */
  private clearTimer(): void {
    if (!this.timer) return;
    this.cancel(this.timer);
    this.timer = 0;
  }
}
