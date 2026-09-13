import { clamp, forwardVector, lerp, lerpDegrees, normalizeDegrees } from "./math";
import type { VehicleRenderPose } from "./runtime";

const WEB_MERCATOR_RADIUS_M = 6_378_137;

export type FlightViewMode = "chase" | "cockpit";

export interface FlightCameraFrame {
  x: number;
  y: number;
  z: number;
  heading: number;
  tilt: number;
  roll: number;
  fovDegrees: number;
}

export const FLIGHT_VIEW_TRANSITION_SECONDS = 1.05;
export const COCKPIT_ENTRY_ZOOM_DEGREES = 13;
export const COCKPIT_EXIT_ZOOM_DEGREES = 10;
export const COCKPIT_ENTRY_AIRCRAFT_HIDE_BLEND = 0.82;
export const COCKPIT_EXIT_AIRCRAFT_REVEAL_BLEND = 0.72;

export class FlightViewTransition {
  private progress = 0;
  private targetMode: FlightViewMode = "chase";

  get mode(): FlightViewMode {
    return this.targetMode;
  }

  get blend(): number {
    return this.progress ** 3 * (this.progress * (this.progress * 6 - 15) + 10);
  }

  get active(): boolean {
    return this.progress > 0 && this.progress < 1;
  }

  get zoomOffsetDegrees(): number {
    const pulse = Math.sin(Math.PI * this.blend);
    return this.targetMode === "cockpit"
      ? -COCKPIT_ENTRY_ZOOM_DEGREES * pulse
      : COCKPIT_EXIT_ZOOM_DEGREES * pulse;
  }

  setMode(mode: FlightViewMode, instant = false): void {
    this.targetMode = mode;
    if (instant) this.progress = mode === "cockpit" ? 1 : 0;
  }

  update(deltaSeconds: number): number {
    const target = this.targetMode === "cockpit" ? 1 : 0;
    const step = clamp(deltaSeconds, 0, 0.1) / FLIGHT_VIEW_TRANSITION_SECONDS;
    this.progress = target > this.progress
      ? Math.min(target, this.progress + step)
      : Math.max(target, this.progress - step);
    return this.blend;
  }
}

export function blendFlightCameraFrames(
  chase: FlightCameraFrame,
  cockpit: FlightCameraFrame,
  amount: number,
): FlightCameraFrame {
  const blend = clamp(amount, 0, 1);
  return {
    x: lerp(chase.x, cockpit.x, blend),
    y: lerp(chase.y, cockpit.y, blend),
    z: lerp(chase.z, cockpit.z, blend),
    heading: lerpDegrees(chase.heading, cockpit.heading, blend),
    tilt: lerp(chase.tilt, cockpit.tilt, blend),
    roll: lerp(chase.roll, cockpit.roll, blend),
    fovDegrees: lerp(chase.fovDegrees, cockpit.fovDegrees, blend),
  };
}

export function cockpitViewportRoll(bankDegrees: number): number {
  return clamp(-bankDegrees, -55, 55);
}

export function rolledViewportScale(
  rollDegrees: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const width = Math.max(1, Math.abs(viewportWidth));
  const height = Math.max(1, Math.abs(viewportHeight));
  const radians = Math.abs(rollDegrees) * Math.PI / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return Math.max(
    cosine + (height / width) * sine,
    cosine + (width / height) * sine,
  );
}

export function compensatedFovForViewportScale(
  diagonalFovDegrees: number,
  viewportScale: number,
): number {
  const fovRadians = clamp(diagonalFovDegrees, 1, 169) * Math.PI / 180;
  const scale = Math.max(1, Math.abs(viewportScale));
  return clamp(
    2 * Math.atan(Math.tan(fovRadians / 2) * scale) * 180 / Math.PI,
    1,
    169,
  );
}

export function cockpitCameraFrame(
  pose: VehicleRenderPose,
  verticalFovDegrees: number,
  horizontalScale = 1,
): FlightCameraFrame {
  const forward = forwardVector(pose.bodyHeading, pose.pitch);
  const cockpitForwardM = 0.4;
  const cockpitEyeHeightM = 0.58;
  return {
    x: pose.position.x + forward.x * cockpitForwardM * horizontalScale,
    y: pose.position.y + forward.y * cockpitForwardM * horizontalScale,
    z: pose.position.z + cockpitEyeHeightM + forward.z * cockpitForwardM,
    heading: normalizeDegrees(pose.bodyHeading),
    tilt: clamp(90 + pose.pitch, 5, 175),
    roll: cockpitViewportRoll(pose.roll),
    fovDegrees: clamp(verticalFovDegrees + 8 + clamp((pose.boost ?? 0) - 1, 0, 1) * 4, 58, 90),
  };
}

export function aircraftVisibleForViewTransition(mode: FlightViewMode, blend: number): boolean {
  return mode === "cockpit"
    ? blend < COCKPIT_ENTRY_AIRCRAFT_HIDE_BLEND
    : blend < COCKPIT_EXIT_AIRCRAFT_REVEAL_BLEND;
}

export function verticalFovToDiagonal(verticalDegrees: number, aspectRatio: number): number {
  const verticalRadians = Math.max(1, Math.min(170, verticalDegrees)) * Math.PI / 180;
  const aspect = Math.max(0.01, Math.abs(aspectRatio));
  const diagonalRadians = 2 * Math.atan(
    Math.tan(verticalRadians / 2) * Math.sqrt(1 + aspect * aspect),
  );
  return Math.min(170, diagonalRadians * 180 / Math.PI);
}

export function webMercatorGroundScale(projectedY: number): number {
  const normalizedY = Math.max(-Math.PI, Math.min(Math.PI, projectedY / WEB_MERCATOR_RADIUS_M));
  return Math.cosh(normalizedY);
}

export class ChasePitchSmoother {
  private pitchDegrees: number;

  constructor(initialPitchDegrees = 0) {
    this.pitchDegrees = initialPitchDegrees;
  }

  update(targetPitchDegrees: number, deltaSeconds: number, snap = false): number {
    if (snap) {
      this.pitchDegrees = targetPitchDegrees;
      return this.pitchDegrees;
    }
    const dt = Math.min(0.1, Math.max(0, deltaSeconds));
    this.pitchDegrees = lerp(
      this.pitchDegrees,
      targetPitchDegrees,
      1 - Math.exp(-8 * dt),
    );
    return this.pitchDegrees;
  }
}

export interface CameraRigTarget {
  distanceM: number;
  heightM: number;
  fovDegrees: number;
  headingDegrees: number;
}

export interface CameraRigPose extends CameraRigTarget {
  distanceVelocity: number;
  heightVelocity: number;
  fovVelocity: number;
}

export interface PlaneChaseFraming {
  distanceM: number;
  heightM: number;
}

export function planeChaseFraming(speedRatio: number, turboIntensity: number): PlaneChaseFraming {
  const speed = Math.max(0, Math.min(1, speedRatio));
  const turbo = Math.max(0, Math.min(1, turboIntensity));
  return {
    distanceM: lerp(17.5, 20.5, speed) + turbo * 2,
    heightM: lerp(6.8, 8.2, speed) + turbo * 0.2,
  };
}

function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  deltaSeconds: number,
): { value: number; velocity: number } {
  const safeTime = Math.max(0.0001, smoothTime);
  const omega = 2 / safeTime;
  const x = omega * Math.max(0, deltaSeconds);
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temporary = (velocity + omega * change) * deltaSeconds;
  return {
    value: target + (change + temporary) * decay,
    velocity: (velocity - omega * temporary) * decay,
  };
}

export class ChaseCameraRig {
  private pose: CameraRigPose;

  constructor(initial: CameraRigTarget) {
    this.pose = {
      ...initial,
      distanceVelocity: 0,
      heightVelocity: 0,
      fovVelocity: 0,
    };
  }

  update(target: CameraRigTarget, deltaSeconds: number, snap = false): CameraRigPose {
    if (snap) {
      this.pose = {
        ...target,
        distanceVelocity: 0,
        heightVelocity: 0,
        fovVelocity: 0,
      };
      return { ...this.pose };
    }
    const dt = Math.min(0.1, Math.max(0, deltaSeconds));
    const distance = smoothDamp(
      this.pose.distanceM,
      target.distanceM,
      this.pose.distanceVelocity,
      0.32,
      dt,
    );
    const height = smoothDamp(
      this.pose.heightM,
      target.heightM,
      this.pose.heightVelocity,
      0.32,
      dt,
    );
    const fov = smoothDamp(
      this.pose.fovDegrees,
      target.fovDegrees,
      this.pose.fovVelocity,
      0.38,
      dt,
    );
    this.pose = {
      distanceM: distance.value,
      heightM: height.value,
      fovDegrees: fov.value,
      headingDegrees: lerpDegrees(
        this.pose.headingDegrees,
        target.headingDegrees,
        1 - Math.exp(-11 * dt),
      ),
      distanceVelocity: distance.velocity,
      heightVelocity: height.velocity,
      fovVelocity: fov.velocity,
    };
    return { ...this.pose };
  }

  targetForSpeed(
    headingDegrees: number,
    speedMps: number,
    maxSpeedMps: number,
    baseFovDegrees: number,
  ): CameraRigTarget {
    const speedRatio = Math.min(1, Math.abs(speedMps) / maxSpeedMps);
    return {
      distanceM: lerp(7.7, 11.2, speedRatio),
      heightM: lerp(3.2, 4.3, speedRatio),
      fovDegrees: Math.min(80, lerp(baseFovDegrees, baseFovDegrees + 12, speedRatio)),
      headingDegrees,
    };
  }
}
