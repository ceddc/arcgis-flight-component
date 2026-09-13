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

export interface CameraSubmissionOptions<TFrame extends ArcGISCameraFrame = ArcGISCameraFrame> {
  intervalMs?: number;
  toleranceMs?: number;
  now?: () => number;
  schedule?: (callback: () => void, delayMs: number) => number;
  cancel?: (handle: number) => void;
  submit: (frame: Readonly<TFrame>) => void;
  onError?: (error: unknown) => void;
}

function validIntervalMs(intervalMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new RangeError(
      `Camera submission interval must be a finite non-negative number, received ${intervalMs}.`,
    );
  }
  return intervalMs;
}

/** Keeps the newest complete frame while waiting for the next allowed ArcGIS camera write. */
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

  constructor(options: CameraSubmissionOptions<TFrame>) {
    this.intervalMs = validIntervalMs(options.intervalMs ?? 1_000 / 30);
    this.toleranceMs = Math.max(0, options.toleranceMs ?? 0.25);
    this.now = options.now ?? (() => performance.now());
    this.schedule = options.schedule ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));
    this.cancel = options.cancel ?? ((handle) => window.clearTimeout(handle));
    this.submitFrame = options.submit;
    this.onError = options.onError ?? (() => undefined);
  }

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

  destroy(): void {
    this.destroyed = true;
    this.pending = false;
    this.frame = null;
    this.clearTimer();
  }

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

  setIntervalMs(intervalMs: number): void {
    const nextIntervalMs = validIntervalMs(intervalMs);
    if (this.destroyed || nextIntervalMs === this.intervalMs) return;
    this.intervalMs = nextIntervalMs;
    this.clearTimer();
    this.flush();
  }

  private clearTimer(): void {
    if (!this.timer) return;
    this.cancel(this.timer);
    this.timer = 0;
  }
}
