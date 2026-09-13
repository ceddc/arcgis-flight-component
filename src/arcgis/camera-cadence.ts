export interface FlightFramePacing {
  averageFps: number | null;
  p95FrameMs: number | null;
}

export type CameraCadenceTargetHz = 60 | 30;

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

export const CAMERA_CADENCE_HIGH_HZ = 60;
export const CAMERA_CADENCE_LOW_HZ = 30;
export const CAMERA_CADENCE_PRESSURE_MS = 5_000;
export const CAMERA_CADENCE_RECOVERY_MS = 4_000;
export const CAMERA_CADENCE_LOW_FPS_THRESHOLD = 50;
export const CAMERA_CADENCE_HIGH_P95_MS_THRESHOLD = 25;
export const CAMERA_CADENCE_RECOVERY_FPS_THRESHOLD = 55;
export const CAMERA_CADENCE_RECOVERY_P95_MS_THRESHOLD = 22;
export const CAMERA_CADENCE_DISPLAY_SYNC_MAX_FPS = 65;

function validFramePacing(sample: Readonly<FlightFramePacing>): boolean {
  return Number.isFinite(sample.averageFps)
    && Number.isFinite(sample.p95FrameMs)
    && sample.averageFps !== null
    && sample.p95FrameMs !== null
    && sample.averageFps > 0
    && sample.p95FrameMs > 0;
}

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

  update(sample: Readonly<FlightFramePacing>, nowMs: number): CameraCadenceDiagnostics {
    const validTime = Number.isFinite(nowMs)
      && nowMs >= 0
      && (this.lastSampleAtMs === null || nowMs >= this.lastSampleAtMs);
    if (!validTime || !validFramePacing(sample)) {
      this.invalidSampleCount += 1;
      this.lastSampleValid = false;
      this.lastSampleAtMs = null;
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

  private updateDisplaySynchronization(averageFps: number): void {
    this.displaySynchronized = this.targetHz === CAMERA_CADENCE_HIGH_HZ
      && averageFps <= CAMERA_CADENCE_DISPLAY_SYNC_MAX_FPS;
  }
}
