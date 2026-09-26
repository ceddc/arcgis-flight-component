/**
 * Supplies the scalar, angle, and forward-vector math shared by flight and camera code.
 *
 * Heading values use clockwise degrees from north. Angle interpolation takes
 * the shortest signed turn, including across the 0/360-degree boundary.
 */
import type { Vec3 } from "./types";

/** Multiplier for converting degrees to radians. */
export const DEG_TO_RAD = Math.PI / 180;
/** Multiplier for converting radians to degrees. */
export const RAD_TO_DEG = 180 / Math.PI;

/** Bounds a numeric value to the inclusive `[min, max]` interval. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Wraps an angle into `[0, 360)`. */
export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Signed shortest turn from `current` to `target`, in degrees. */
export function shortestAngleDelta(current: number, target: number): number {
  return ((target - current + 540) % 360) - 180;
}

/** Interpolates along the shortest angular path and returns a normalized angle. */
export function lerpDegrees(current: number, target: number, amount: number): number {
  return normalizeDegrees(current + shortestAngleDelta(current, target) * clamp(amount, 0, 1));
}

/** Clamped linear interpolation between two scalar values. */
export function lerp(current: number, target: number, amount: number): number {
  return current + (target - current) * clamp(amount, 0, 1);
}

/** Unit forward vector using clockwise-from-north heading and elevation pitch in degrees. */
export function forwardVector(heading: number, pitch: number): Vec3 {
  const headingRad = heading * DEG_TO_RAD;
  const pitchRad = pitch * DEG_TO_RAD;
  const horizontal = Math.cos(pitchRad);
  return {
    x: Math.sin(headingRad) * horizontal,
    y: Math.cos(headingRad) * horizontal,
    z: Math.sin(pitchRad),
  };
}
