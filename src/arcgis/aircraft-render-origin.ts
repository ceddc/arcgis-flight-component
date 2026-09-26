/**
 * Scope a smaller ArcGIS render-origin grid to the moving aircraft layer.
 * The adapter reduces float32 position error on validated SDK builds, bounds
 * cached origins and restores the original factory when the session ends.
 */
type Vector = ArrayLike<number>;
interface Origin { vec3: Vector }
interface OriginFactory {
  _gridSize: number;
  _rootOriginId: string;
  _origins: Map<string, Origin>;
  getOrigin(point: Vector): Origin;
  needsOriginUpdate(origin: Origin, point: Vector, objectSize: number): boolean;
}

const VALIDATED_SDK_VERSIONS = new Set(["5.1.21", "5.1.24"]);
const GRID_SIZE_M = 2_048;
const MAX_CACHED_ORIGINS = 64;

/** Read an unknown SDK object as a property record without throwing on null/primitives. */
function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

/**
 * Reduce position quantization for the moving player aircraft on validated SDK builds.
 *
 * The SDK's large render-origin grid can leave visible float32 error after long
 * flights. This adapter uses a smaller rebasing distance only for this layer,
 * keeps the SDK transform and camera paths intact, bounds cached origin records,
 * and restores the original factory on teardown. Unknown SDK versions or object
 * shapes keep native behavior and report the reason through `diagnostics()`.
 *
 * @param layerView Layer view whose mesh-origin factory is being inspected.
 * @param sdkVersion ArcGIS Maps SDK version; only explicitly validated versions are patched.
 * @returns Diagnostics and a cleanup method that restores the captured SDK state.
 */
export function installAircraftRenderOrigin(layerView: unknown, sdkVersion: string) {
  const processor = record(record(layerView)?.processor);
  const context = record(record(processor?.graphicsCore)?.symbolCreationContext);
  const candidate = record(context?.localOriginFactory);
  let status = !VALIDATED_SDK_VERSIONS.has(sdkVersion) ? "unsupported-version" : "unsupported-api";
  let factory: OriginFactory | null = null;
  let restore = (): void => {};
  if (VALIDATED_SDK_VERSIONS.has(sdkVersion) && candidate
    && candidate._gridSize === 500_000
    && typeof candidate._rootOriginId === "string" && candidate._origins instanceof Map
    && typeof candidate.getOrigin === "function" && typeof candidate.needsOriginUpdate === "function") {
    factory = candidate as unknown as OriginFactory;
    const target = factory;
    const originalGridSize = target._gridSize;
    const originalGetOrigin = target.getOrigin;
    const originalNeedsUpdate = target.needsOriginUpdate;
    target._gridSize = GRID_SIZE_M;
    const getOrigin = (point: Vector): Origin => {
      const origin = originalGetOrigin.call(target, point);
      // Cached origins can be evicted safely: active GPU geometry keeps its own
      // reference. Preserve the SDK root entry and bound long Super Turbo flights.
      for (const key of target._origins.keys()) {
        if (target._origins.size <= MAX_CACHED_ORIGINS) break;
        if (key !== target._rootOriginId) target._origins.delete(key);
      }
      return origin;
    };
    const needsUpdate = (origin: Origin, point: Vector): boolean =>
      Math.hypot(point[0] - origin.vec3[0], point[1] - origin.vec3[1], point[2] - origin.vec3[2]) > GRID_SIZE_M;
    target.getOrigin = getOrigin;
    target.needsOriginUpdate = needsUpdate;
    status = "active";
    restore = () => {
      if (target.getOrigin === getOrigin) target.getOrigin = originalGetOrigin;
      if (target.needsOriginUpdate === needsUpdate) target.needsOriginUpdate = originalNeedsUpdate;
      if (target._gridSize === GRID_SIZE_M) target._gridSize = originalGridSize;
    };
  }
  return {
    diagnostics: () => ({ status, sdkVersion, scope: "player-aircraft-layer",
      gridSizeM: factory?._gridSize ?? null, cachedOrigins: factory?._origins.size ?? 0,
      maximumCachedOrigins: MAX_CACHED_ORIGINS }),
    destroy(): void { restore(); status = "destroyed"; },
  };
}
