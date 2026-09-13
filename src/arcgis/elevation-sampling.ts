import type { Vec2 } from "../core/types";

export interface ElevationSamplerLike {
  elevationAt(x: number, y: number): number;
  noDataValue?: number | null;
}

export interface LastSafeElevation {
  position: Vec2;
  elevationM: number;
  timestampMs: number;
}

export interface ElevationSampleResult {
  elevationM: number | null;
  source: "ground" | "last-safe" | "none";
}

function safeElevation(
  sampler: ElevationSamplerLike | null | undefined,
  point: Vec2,
): number | null {
  if (!sampler) return null;
  const elevation = sampler.elevationAt(point.x, point.y);
  if (!Number.isFinite(elevation)) return null;
  if (Number.isFinite(sampler.noDataValue) && elevation === sampler.noDataValue) {
    return null;
  }
  return elevation;
}

export function sampleElevationWithPriority(options: {
  point: Vec2;
  ground?: ElevationSamplerLike | null;
  lastSafe?: LastSafeElevation | null;
  nowMs?: number;
  lastSafeDistanceM?: number;
  lastSafeAgeMs?: number;
}): ElevationSampleResult {
  const groundElevationM = safeElevation(options.ground, options.point);
  if (groundElevationM !== null) {
    return { elevationM: groundElevationM, source: "ground" };
  }

  // Bridge a short gap while elevation tiles load, but never carry an old height far away.
  // Returning null lets the caller distinguish unavailable terrain from sea level.
  const lastSafe = options.lastSafe;
  const nowMs = options.nowMs ?? performance.now();
  if (
    lastSafe
    && nowMs - lastSafe.timestampMs <= (options.lastSafeAgeMs ?? 1_500)
    && Math.hypot(
      options.point.x - lastSafe.position.x,
      options.point.y - lastSafe.position.y,
    ) <= (options.lastSafeDistanceM ?? 120)
  ) {
    return { elevationM: lastSafe.elevationM, source: "last-safe" };
  }

  return { elevationM: null, source: "none" };
}
