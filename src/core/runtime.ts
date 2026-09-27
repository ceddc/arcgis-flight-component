/**
 * Runs deterministic physics at a fixed step while display frames arrive at variable times.
 *
 * `GameRuntime` bounds catch-up work after a slow frame, records discarded
 * time, and interpolates the last two physics poses for smooth rendering.
 * Pausing and resetting clear elapsed-time debt so a resumed flight does not jump.
 */
import type { Vec3 } from "./types";

/** Default deterministic simulation step; rendering may occur at another cadence. */
export const GAME_FIXED_STEP_SECONDS = 1 / 60;
/** Maximum simulation steps processed for one rendered frame before excess time is dropped. */
export const GAME_MAX_CATCH_UP_STEPS = 5;

/** Physics state passed between fixed simulation steps; position is metres and angles are degrees. */
export interface PhysicsPose {
  position: Vec3;
  bodyHeading: number;
  travelHeading: number;
  pitch: number;
  roll: number;
  speed: number;
}

/** Interpolated physics pose plus render-only values for one displayed frame. */
export interface VehicleRenderPose extends PhysicsPose {
  /** Fractional progress between the previous and current fixed-step states. */
  interpolationAlpha: number;
  boost?: number;
}

/** Simulation result and interpolated pose emitted for one display frame. */
export interface GameRuntimeFrame {
  previousPose: PhysicsPose;
  currentPose: PhysicsPose;
  renderPose: VehicleRenderPose;
  interpolationAlpha: number;
  /** Number of fixed simulation updates performed for this display frame. */
  simulatedSteps: number;
  simulationStep: number;
  /** Elapsed time discarded when the catch-up bound was reached. */
  droppedSeconds: number;
  paused: boolean;
}

/** Optional simulation step and catch-up bounds. */
export interface GameRuntimeOptions {
  fixedStepSeconds?: number;
  maxCatchUpSteps?: number;
}

/** Pure transition function called once per fixed simulation step. */
export type PhysicsStep = (
  currentPose: Readonly<PhysicsPose>,
  fixedStepSeconds: number,
  simulationStep: number,
) => PhysicsPose;

function normalizeHeading(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function clonePose(pose: Readonly<PhysicsPose>): PhysicsPose {
  return {
    position: { ...pose.position },
    bodyHeading: normalizeHeading(pose.bodyHeading),
    travelHeading: normalizeHeading(pose.travelHeading),
    pitch: pose.pitch,
    roll: pose.roll,
    speed: pose.speed,
  };
}

function assertFinitePose(pose: Readonly<PhysicsPose>): void {
  const values = [
    pose.position.x,
    pose.position.y,
    pose.position.z,
    pose.bodyHeading,
    pose.travelHeading,
    pose.pitch,
    pose.roll,
    pose.speed,
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("GameRuntime received a pose containing a non-finite value.");
  }
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function lerpHeading(from: number, to: number, alpha: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return normalizeHeading(from + delta * alpha);
}

/** Interpolates adjacent physics states for smooth display without altering simulation state. */
export function interpolatePhysicsPose(
  previous: Readonly<PhysicsPose>,
  current: Readonly<PhysicsPose>,
  alpha: number,
): VehicleRenderPose {
  const clampedAlpha = Math.min(1, Math.max(0, alpha));
  return {
    position: {
      x: lerp(previous.position.x, current.position.x, clampedAlpha),
      y: lerp(previous.position.y, current.position.y, clampedAlpha),
      z: lerp(previous.position.z, current.position.z, clampedAlpha),
    },
    bodyHeading: lerpHeading(previous.bodyHeading, current.bodyHeading, clampedAlpha),
    travelHeading: lerpHeading(previous.travelHeading, current.travelHeading, clampedAlpha),
    pitch: lerp(previous.pitch, current.pitch, clampedAlpha),
    roll: lerp(previous.roll, current.roll, clampedAlpha),
    speed: lerp(previous.speed, current.speed, clampedAlpha),
    interpolationAlpha: clampedAlpha,
  };
}

/**
 * Physics advances in fixed steps; rendering interpolates between the last two poses.
 * A slow display frame can therefore skip drawings without changing flight behaviour.
 */
export class GameRuntime {
  readonly fixedStepSeconds: number;
  readonly maxCatchUpSteps: number;

  private previous: PhysicsPose;
  private current: PhysicsPose;
  private accumulatorSeconds = 0;
  private lastTimestampMs: number | null = null;
  private stepIndex = 0;
  private pausedState = false;

  /** Creates a simulation clock around an initial pose and deterministic step function. */
  constructor(
    initialPose: Readonly<PhysicsPose>,
    private readonly stepPhysics: PhysicsStep,
    options: GameRuntimeOptions = {},
  ) {
    this.fixedStepSeconds = options.fixedStepSeconds ?? GAME_FIXED_STEP_SECONDS;
    this.maxCatchUpSteps = options.maxCatchUpSteps ?? GAME_MAX_CATCH_UP_STEPS;
    if (!Number.isFinite(this.fixedStepSeconds) || this.fixedStepSeconds <= 0) {
      throw new Error("GameRuntime fixedStepSeconds must be greater than zero.");
    }
    if (!Number.isInteger(this.maxCatchUpSteps) || this.maxCatchUpSteps < 1) {
      throw new Error("GameRuntime maxCatchUpSteps must be a positive integer.");
    }
    assertFinitePose(initialPose);
    this.previous = clonePose(initialPose);
    this.current = clonePose(initialPose);
  }

  /** Whether fixed-step updates are currently suspended. */
  get paused(): boolean {
    return this.pausedState;
  }

  /** Number of fixed steps completed since construction or reset. */
  get simulationStep(): number {
    return this.stepIndex;
  }

  /** Returns a defensive copy of the latest simulated pose. */
  get currentPose(): PhysicsPose {
    return clonePose(this.current);
  }

  /** Advances using a display timestamp in milliseconds; the first call only establishes a baseline. */
  tick(timestampMs: number): GameRuntimeFrame {
    if (!Number.isFinite(timestampMs)) {
      throw new Error("GameRuntime timestamp must be finite.");
    }
    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = timestampMs;
      return this.createFrame(0, 0);
    }
    const elapsedSeconds = Math.max(0, (timestampMs - this.lastTimestampMs) / 1000);
    this.lastTimestampMs = timestampMs;
    return this.advanceFrame(elapsedSeconds);
  }

  /** Advances from elapsed wall time, dropping catch-up excess after a long stall. */
  advanceFrame(elapsedSeconds: number): GameRuntimeFrame {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new Error("GameRuntime elapsedSeconds must be a finite non-negative value.");
    }
    if (this.pausedState) {
      return this.createFrame(0, 0);
    }

    const totalSeconds = this.accumulatorSeconds + elapsedSeconds;
    const availableSteps = Math.floor(totalSeconds / this.fixedStepSeconds + 1e-9);
    // Drop excess elapsed time after a long stall instead of running an unbounded catch-up loop.
    const simulatedSteps = Math.min(availableSteps, this.maxCatchUpSteps);
    const droppedSteps = Math.max(0, availableSteps - simulatedSteps);
    const droppedSeconds = droppedSteps * this.fixedStepSeconds;

    for (let index = 0; index < simulatedSteps; index += 1) {
      this.simulateOneStep();
    }

    this.accumulatorSeconds = totalSeconds
      - simulatedSteps * this.fixedStepSeconds
      - droppedSeconds;
    if (this.accumulatorSeconds < 0 && this.accumulatorSeconds > -1e-10) {
      this.accumulatorSeconds = 0;
    }
    this.accumulatorSeconds = Math.min(
      Math.max(0, this.accumulatorSeconds),
      this.fixedStepSeconds * (1 - Number.EPSILON),
    );

    return this.createFrame(simulatedSteps, droppedSeconds);
  }

  /** Advances an exact number of fixed steps, primarily for deterministic replay. */
  advanceFixedSteps(count = 1): GameRuntimeFrame {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error("GameRuntime fixed-step count must be a non-negative integer.");
    }
    if (this.pausedState) {
      return this.createFrame(0, 0);
    }
    for (let index = 0; index < count; index += 1) {
      this.simulateOneStep();
    }
    this.accumulatorSeconds = 0;
    return this.createFrame(count, 0);
  }

  /** Pauses simulation and clears timing remainder so resume cannot catch up old time. */
  pause(): GameRuntimeFrame {
    this.pausedState = true;
    this.clearTimingRemainder();
    return this.createFrame(0, 0);
  }

  /** Resumes with a clean timing baseline, avoiding a jump on the next display frame. */
  resume(): GameRuntimeFrame {
    this.pausedState = false;
    this.clearTimingRemainder();
    return this.createFrame(0, 0);
  }

  /** Replaces simulation state and step index, optionally retaining a paused state. */
  reset(pose: Readonly<PhysicsPose>, paused = this.pausedState): GameRuntimeFrame {
    assertFinitePose(pose);
    this.previous = clonePose(pose);
    this.current = clonePose(pose);
    this.accumulatorSeconds = 0;
    this.lastTimestampMs = null;
    this.stepIndex = 0;
    this.pausedState = paused;
    return this.createFrame(0, 0);
  }

  private simulateOneStep(): void {
    this.previous = clonePose(this.current);
    const next = this.stepPhysics(this.current, this.fixedStepSeconds, this.stepIndex);
    assertFinitePose(next);
    this.current = clonePose(next);
    this.stepIndex += 1;
  }

  private clearTimingRemainder(): void {
    this.accumulatorSeconds = 0;
    this.lastTimestampMs = null;
    this.previous = clonePose(this.current);
  }

  private createFrame(simulatedSteps: number, droppedSeconds: number): GameRuntimeFrame {
    const interpolationAlpha = this.accumulatorSeconds / this.fixedStepSeconds;
    return {
      previousPose: clonePose(this.previous),
      currentPose: clonePose(this.current),
      renderPose: interpolatePhysicsPose(this.previous, this.current, interpolationAlpha),
      interpolationAlpha,
      simulatedSteps,
      simulationStep: this.stepIndex,
      droppedSeconds,
      paused: this.pausedState,
    };
  }
}
