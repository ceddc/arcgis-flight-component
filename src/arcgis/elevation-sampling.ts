/**
 * Sample terrain for a moving aircraft while ArcGIS elevation tiles load.
 * Live ground wins; a recent nearby valid sample bridges temporary gaps, and
 * missing data is reported explicitly once that bounded fallback expires.
 */
import type { Vec2 } from "../core/types";

/** Terrain sampler subset consumed by the flight controller. */
export interface ElevationSamplerLike {
  elevationAt(x: number, y: number): number;
  noDataValue?: number | null;
}

/** Last valid terrain height retained briefly to bridge tile-loading gaps. */
export interface LastSafeElevation {
  position: Vec2;
  elevationM: number;
  timestampMs: number;
}

/** Terrain lookup result, including which fallback supplied the height. */
export interface ElevationSampleResult {
  elevationM: number | null;
  source: "ground" | "last-safe" | "none";
}

/** Return a valid terrain height, treating missing data sentinels as unavailable. */
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

/**
 * Sample ground height, falling back briefly to a nearby recent valid sample.
 *
 * The age and distance bounds prevent stale terrain from following the aircraft
 * over a long route. When neither source is trustworthy, the result is `null`
 * rather than zero so callers can distinguish missing terrain from sea level.
 *
 * @param options Current point and optional ground/last-safe samples with limits.
 * @returns Chosen elevation in metres and the source used, or no height.
 */
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
