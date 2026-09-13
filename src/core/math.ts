import type { Vec3 } from "./types";

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function shortestAngleDelta(current: number, target: number): number {
  return ((target - current + 540) % 360) - 180;
}

export function lerpDegrees(current: number, target: number, amount: number): number {
  return normalizeDegrees(current + shortestAngleDelta(current, target) * clamp(amount, 0, 1));
}

export function lerp(current: number, target: number, amount: number): number {
  return current + (target - current) * clamp(amount, 0, 1);
}

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
