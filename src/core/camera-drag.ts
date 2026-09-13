import { clamp, DEG_TO_RAD, normalizeDegrees, RAD_TO_DEG } from "./math";
import type { Vec3 } from "./types";
import type { FlightCameraFrame } from "./camera-rig";

export const CAMERA_DRAG_RETURN_SECONDS = .85;
export interface CameraDragOffset { yawDegrees: number; pitchDegrees: number }

/** A temporary look offset, advanced by the existing flight render loop. */
export class CameraDrag {
  private yaw = 0;
  private pitch = 0;
  private held = false;
  private returnElapsed = CAMERA_DRAG_RETURN_SECONDS;
  private releaseYaw = 0;
  private releasePitch = 0;

  get dragging(): boolean { return this.held; }
  get offset(): CameraDragOffset { return { yawDegrees: this.yaw, pitchDegrees: this.pitch }; }

  begin(): void { this.held = true; }
  move(deltaX: number, deltaY: number): void {
    if (!this.held) return;
    this.yaw = clamp(this.yaw - deltaX * .24, -170, 170);
    this.pitch = clamp(this.pitch + deltaY * .2, -55, 65);
  }
  release(): void {
    if (!this.held) return;
    this.held = false;
    this.releaseYaw = this.yaw;
    this.releasePitch = this.pitch;
    this.returnElapsed = 0;
  }
  reset(): void {
    this.held = false;
    this.yaw = this.pitch = 0;
    this.returnElapsed = CAMERA_DRAG_RETURN_SECONDS;
  }
  update(dt: number, reducedMotion = false): CameraDragOffset {
    if (!this.held) {
      this.returnElapsed = reducedMotion ? CAMERA_DRAG_RETURN_SECONDS
        : Math.min(CAMERA_DRAG_RETURN_SECONDS, this.returnElapsed + clamp(dt, 0, .1));
      const t = this.returnElapsed / CAMERA_DRAG_RETURN_SECONDS;
      // Zero velocity and acceleration at both ends; finish exactly at neutral.
      const remaining = 1 - t * t * t * (t * (t * 6 - 15) + 10);
      this.yaw = remaining === 0 ? 0 : this.releaseYaw * remaining;
      this.pitch = remaining === 0 ? 0 : this.releasePitch * remaining;
    }
    return this.offset;
  }
}

/** Rotate the chase frame around the aircraft in real metres, preserving framing. */
export function orbitFlightCamera(
  frame: FlightCameraFrame, pivot: Vec3, offset: CameraDragOffset, horizontalScale: number,
): FlightCameraFrame {
  if (offset.yawDegrees === 0 && offset.pitchDegrees === 0) return frame;
  const dx = (frame.x - pivot.x) / horizontalScale;
  const dy = (frame.y - pivot.y) / horizontalScale;
  const dz = frame.z - pivot.z;
  const horizontal = Math.hypot(dx, dy);
  const radius = Math.hypot(horizontal, dz);
  const elevation = Math.atan2(dz, horizontal);
  const nextElevation = clamp(elevation + offset.pitchDegrees * DEG_TO_RAD, -80 * DEG_TO_RAD, 80 * DEG_TO_RAD);
  const bearing = Math.atan2(dx, dy) + offset.yawDegrees * DEG_TO_RAD;
  return {
    ...frame,
    x: pivot.x + Math.sin(bearing) * Math.cos(nextElevation) * radius * horizontalScale,
    y: pivot.y + Math.cos(bearing) * Math.cos(nextElevation) * radius * horizontalScale,
    z: pivot.z + Math.sin(nextElevation) * radius,
    heading: normalizeDegrees(frame.heading + offset.yawDegrees),
    tilt: frame.tilt - (nextElevation - elevation) * RAD_TO_DEG,
  };
}

/** Lift an orbit camera above sampled ground without changing its look target. */
export function clearCameraGround(frame: FlightCameraFrame, minimumZ: number, lookDistanceM: number): FlightCameraFrame {
  if (frame.z >= minimumZ) return frame;
  const lookPitch = (frame.tilt - 90) * DEG_TO_RAD;
  return {
    ...frame, z: minimumZ,
    tilt: 90 + Math.atan2(
      Math.sin(lookPitch) * lookDistanceM + frame.z - minimumZ,
      Math.cos(lookPitch) * lookDistanceM,
    ) * RAD_TO_DEG,
  };
}
