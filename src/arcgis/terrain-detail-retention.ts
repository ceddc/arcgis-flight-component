import type SceneView from "@arcgis/core/views/SceneView.js";

// Adapted from World Sky Tour 4fcebc5. Keep this SDK workaround isolated so
// hosts and unsupported SDK versions can retain their native terrain behavior.

interface TerrainTile {
  key: string;
  leaf: boolean;
  loaded: boolean;
  visible: boolean;
  parent: TerrainTile | null;
  radius: number;
  elevationLevel?: unknown;
  _visible?: unknown;
  _intersectsClippingArea?: unknown;
  _center: [unknown, { center: ArrayLike<number> }];
  shouldSplit(...args: unknown[]): number;
}
interface TerrainSurface {
  destroyed?: boolean;
  _viewChanged: boolean;
  _rootTiles: unknown;
  _eyePosRenderSR: ArrayLike<number>;
  _allTiles: { length: number; forAll(callback: (tile: TerrainTile) => void): void };
  _updateAllTilesStatus(budget: { done: boolean }): unknown;
  requestUpdate(): void;
}
interface TerrainView { basemapTerrain?: TerrainSurface; quality?: number; qualityProfile?: string }

/** The prototype that owns the SDK tile class's split predicate. */
function splitOwner(tile: object): { owner: object; descriptor: PropertyDescriptor } | null {
  for (let owner = Object.getPrototypeOf(tile) as object | null; owner && owner !== Object.prototype; owner = Object.getPrototypeOf(owner) as object | null) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, "shouldSplit");
    if (!descriptor) continue;
    return typeof descriptor.value === "function" && descriptor.configurable ? { owner, descriptor } : null;
  }
  return null;
}

/**
 * ArcGIS 5.1 selects terrain detail with a split predicate that depends on the
 * eye position, but it merges every branch that leaves the view frustum at
 * once. Turning therefore discards the refined terrain behind the aircraft and
 * loads, meshes and uploads the same tiles again half a turn later.
 *
 * Out-of-view retention keeps an existing branch outside the frustum while the
 * native predicate would still split it if it were in view. Detail behind the
 * aircraft coarsens with distance exactly as it would ahead, and nothing new
 * is split or requested out of view.
 *
 * The same predicate also merges refined terrain when its tilt-dependent LOD
 * term changes, so a short pitch reversal can discard and reload the nearby
 * mesh. Retain EXISTING visible detail until the camera moves away by 25% (at
 * least 250 m), with a minimum 1.8 s pitch-reversal grace period. Merely
 * waiting must not discard detail in front of a stationary/approaching camera.
 * Only native camera/visibility updates reevaluate the spatial hold.
 *
 * This is an isolated, undocumented compatibility hook, not a terrain quality
 * cap. Native leaf/refinement decisions, distant terrain, stitching, requests,
 * elevation arrival, camera motion and the SDK memory-quality budget stay owned
 * by ArcGIS. The predicate is replaced on the tile class prototype only during
 * one synchronous native selection call: tile objects are never reshaped, since
 * adding and deleting an own property turns them into slow dictionary objects.
 */
export function installTerrainDetailRetention(
  sceneView: SceneView,
  sdkVersion: string,
  options: { holdMs?: number; radiusM?: number; outOfView?: boolean; now?: () => number } = {},
) {
  const view = sceneView as unknown as TerrainView;
  const surface = view.basemapTerrain;
  const holdMs = options.holdMs ?? 1800;
  const radiusM = options.radiusM ?? 6000;
  const outOfView = options.outOfView ?? false;
  const now = options.now ?? (() => performance.now());
  const pending = new Map<TerrainTile, { key: string; expires: number; closestDistance: number; center: number[] }>();
  const released = new Map<TerrainTile, string>();
  let profile = view.qualityProfile;
  const stats = {
    status: "unsupported" as "unsupported" | "active" | "removed", passes: 0, heldDecisions: 0, maximumHeldBranches: 0,
    outOfViewHeldDecisions: 0, maximumOutOfViewHeldBranches: 0, timerWakeups: 0, budgetSkips: 0,
  };
  let timer: ReturnType<typeof setTimeout> | null = null;
  let removed = false;
  let removeOverride = () => {};
  const cancelTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const handle = {
    remove() { removed = true; pending.clear(); released.clear(); cancelTimer(); removeOverride(); if (stats.status === "active") stats.status = "removed"; },
    diagnostics: () => ({ ...stats, activeBranches: pending.size, releasedBranches: released.size, holdMs, radiusM, outOfView, sdkVersion }),
  };
  if (!sdkVersion.startsWith("5.1.") || !surface || typeof surface._allTiles?.forAll !== "function"
    || typeof surface._updateAllTilesStatus !== "function" || typeof surface.requestUpdate !== "function"
    || !Number.isFinite(holdMs) || holdMs <= 0 || !Number.isFinite(radiusM) || radiusM <= 0) return handle;

  const ownStatus = Object.getOwnPropertyDescriptor(surface, "_updateAllTilesStatus");
  const nativeStatus = surface._updateAllTilesStatus;
  const disable = () => {
    pending.clear();
    released.clear();
    cancelTimer();
    stats.status = "unsupported";
    removed = true;
    removeOverride();
  };
  function update(this: TerrainSurface, budget: { done: boolean }) {
    if (removed || !this._viewChanged || !this._rootTiles || budget.done) return nativeStatus.call(this, budget);
    // Explicit/automatic quality changes must remain free to shed terrain.
    const profileRank = (value: string | undefined) => value === "high" ? 2 : value === "medium" ? 1 : 0;
    const profileDowngraded = profileRank(view.qualityProfile) < profileRank(profile);
    profile = view.qualityProfile;
    // Do not resist the SDK's memory-pressure response or scan an oversized tree.
    if (!Number.isFinite(view.quality) || view.quality! < 0.98 || this._allTiles.length > 4096) {
      pending.clear();
      released.clear();
      stats.budgetSkips += 1;
      cancelTimer();
      return nativeStatus.call(this, budget);
    }
    const eligible = new Set<TerrainTile>();
    let split: ReturnType<typeof splitOwner> | undefined;
    const timestamp = now();
    let earliest = Infinity;
    let held = 0;
    let heldOutOfView = 0;
    const eye = this._eyePosRenderSR;
    try {
      this._allTiles.forAll(tile => {
        split ??= splitOwner(tile);
        // A merge turns the same branch object/key back into a leaf. Its next
        // native split is deliberately not held: clear the old deadline here
        // so newly refined detail can receive a fresh hold on a later reversal.
        if (tile.leaf) { pending.delete(tile); released.delete(tile); }
        if (!tile.leaf || !tile.loaded || !tile.visible) return;
        const center = tile._center[1].center;
        const distance = Math.hypot(center[0]! - eye[0]!, center[1]! - eye[1]!, center[2]! - eye[2]!) - tile.radius;
        if (!Number.isFinite(distance) || distance > radiusM) return;
        // A native merging ancestor would skip its children's predicates.
        // Protect that chain, but not unrelated far or invisible sibling trees.
        for (let parent = tile.parent; parent; parent = parent.parent) eligible.add(parent);
      });
    } catch {
      disable();
      return nativeStatus.call(this, budget);
    }
    if (!split) {
      disable();
      return nativeStatus.call(this, budget);
    }
    if (eligible.size > 256) { stats.budgetSkips += 1; eligible.clear(); }
    // Strong references are bounded by the current eligible set (<=256).
    // Leaving the frustum/radius must also forget spatial-hysteresis history.
    for (const tile of pending.keys()) if (!eligible.has(tile)) pending.delete(tile);
    for (const tile of released.keys()) if (!eligible.has(tile)) released.delete(tile);
    // SDK merging can be deferred by its frame budget. Keep downgraded
    // branches released until actually merged or natively refined again.
    if (profileDowngraded) {
      pending.clear();
      for (const tile of eligible) released.set(tile, tile.key);
    }
    const { owner, descriptor } = split;
    const nativeSplit = descriptor.value as TerrainTile["shouldSplit"];
    // The native predicate as if this frustum-culled tile were in view. It
    // reads only the eye position and tile bounds, so the answer matches the
    // one this tile will receive when the aircraft turns back towards it.
    const splitsInView = (tile: TerrainTile, args: unknown[]): boolean => {
      const elevationLevel = tile.elevationLevel;
      if (tile._visible !== false || tile._intersectsClippingArea !== true || typeof elevationLevel !== "number") return false;
      tile._visible = true;
      try { return nativeSplit.apply(tile, args) === 1; }
      finally { tile._visible = false; tile.elevationLevel = elevationLevel; }
    };
    const decide = function(this: TerrainTile, ...args: unknown[]) {
      const decision = nativeSplit.apply(this, args);
      if (decision !== 0 || this.leaf) { pending.delete(this); released.delete(this); return decision; }
      if (!this.visible) {
        pending.delete(this);
        released.delete(this);
        // Existing branch only: native code never splits a leaf anew here.
        if (!outOfView || !splitsInView(this, args)) return decision;
        heldOutOfView += 1;
        return 1;
      }
      if (!eligible.has(this) || released.get(this) === this.key) return decision;
      released.delete(this);
      let state = pending.get(this);
      // Freeze the reference point: DEM arrivals can move the SDK's bounds
      // center, which must not be mistaken for the camera moving away.
      const center = state?.key === this.key ? state.center : Array.from(this._center[1].center);
      const distance = Math.hypot(center[0]! - eye[0]!, center[1]! - eye[1]!, center[2]! - eye[2]!);
      if (!Number.isFinite(distance)) { pending.delete(this); return decision; }
      // SDK tile objects are pooled: never inherit another location's hold.
      if (!state || state.key !== this.key) { state = { key: this.key, expires: timestamp + holdMs, closestDistance: distance, center }; pending.set(this, state); }
      state.closestDistance = Math.min(state.closestDistance, distance);
      // A timer alone produced a visible startup cliff after 1.8 seconds.
      // Keep existing nearby detail while approaching or hovering; release
      // once moving materially away (25%, at least 250 m), after the short
      // pitch-reversal grace period. Out-of-radius and budget exits above
      // still use native selection immediately. Never split a leaf.
      const movingAway = distance >= state.closestDistance + Math.max(250, state.closestDistance * 0.25);
      if (timestamp >= state.expires && movingAway) return decision;
      if (timestamp < state.expires) earliest = Math.min(earliest, state.expires);
      held += 1;
      return 1; // Existing non-leaf only: native code does not split it anew.
    };
    try {
      Object.defineProperty(owner, "shouldSplit", { ...descriptor, value: decide });
    } catch {
      disable();
      return nativeStatus.call(this, budget);
    }
    stats.passes += 1;
    try { return nativeStatus.call(this, budget); }
    finally {
      Object.defineProperty(owner, "shouldSplit", descriptor);
      stats.heldDecisions += held;
      stats.maximumHeldBranches = Math.max(stats.maximumHeldBranches, held);
      stats.outOfViewHeldDecisions += heldOutOfView;
      stats.maximumOutOfViewHeldBranches = Math.max(stats.maximumOutOfViewHeldBranches, heldOutOfView);
      cancelTimer();
      // One grace-period wakeup per surface, not per tile. A stationary spatial
      // hold has no timer after this deadline; never reschedule a past deadline.
      if (Number.isFinite(earliest) && !removed) timer = setTimeout(() => {
        timer = null;
        if (removed || surface!.destroyed) return;
        stats.timerWakeups += 1;
        surface!._viewChanged = true;
        surface!.requestUpdate();
      }, Math.max(1, earliest - now() + 1));
    }
  }
  try {
    Object.defineProperty(surface, "_updateAllTilesStatus", { configurable: true, writable: true, value: update });
    stats.status = "active";
    removeOverride = () => {
      if (surface._updateAllTilesStatus !== update) return;
      if (ownStatus) Object.defineProperty(surface, "_updateAllTilesStatus", ownStatus);
      else Reflect.deleteProperty(surface, "_updateAllTilesStatus");
    };
  } catch { /* Unknown object shape: preserve the native implementation. */ }
  return handle;
}
