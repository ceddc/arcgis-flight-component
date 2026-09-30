import type SceneView from "@arcgis/core/views/SceneView.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installTerrainDetailRetention } from "./terrain-detail-retention";

type Budget = { done: boolean };

class FakeTile {
  key: string;
  leaf = true;
  loaded = true;
  _visible: unknown = true;
  _intersectsClippingArea: unknown = true;
  elevationLevel: unknown = 15;
  parent: FakeTile | null = null;
  children: FakeTile[] = [];
  radius = 0;
  _center: [unknown, { center: number[] }] = [null, { center: [100, 0, 0] }];
  /** The native distance decision this tile receives while in view. */
  decision = 0;
  calls: { receiver: FakeTile; args: unknown[] }[] = [];

  get visible(): boolean { return this._visible === true; }
  set visible(value: boolean) { this._visible = value; }

  constructor(key: string, parent: FakeTile | null = null) {
    this.key = key;
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
      parent.leaf = false;
      parent.loaded = false;
    }
  }

  shouldSplit(...args: unknown[]): number {
    this.calls.push({ receiver: this, args });
    // Like ArcGIS, a frustum-culled tile never splits.
    return this.visible ? this.decision : 0;
  }
}

const nativeSplitDescriptor = Object.getOwnPropertyDescriptor(FakeTile.prototype, "shouldSplit");

class FakeSurface {
  destroyed = false;
  _viewChanged = true;
  _eyePosRenderSR = [0, 0, 0];
  _rootTiles: FakeTile[] | null;
  readonly splitLimits = { maxLod: 19 };
  readonly nativeResult = { native: true };
  readonly decisions = new Map<FakeTile, number>();
  readonly requestUpdate = vi.fn();
  readonly _allTiles: { readonly length: number; forAll: (visit: (tile: FakeTile) => void) => void };
  reportedLength: number | undefined;
  nativeCalls = 0;
  scans = 0;
  lastBudget: Budget | undefined;
  afterDecision: ((tile: FakeTile, decision: number) => void) | undefined;

  constructor(readonly tiles: FakeTile[], root: FakeTile) {
    this._rootTiles = [root];
    const surface = this;
    this._allTiles = {
      get length() { return surface.reportedLength ?? tiles.length; },
      forAll(visit) { surface.scans += 1; tiles.forEach(visit); },
    };
  }

  _updateAllTilesStatus(budget: Budget): object {
    this.nativeCalls += 1;
    this.lastBudget = budget;
    if (!this._viewChanged || !this._rootTiles || budget.done) return this.nativeResult;
    this._viewChanged = false;
    this.decisions.clear();
    const visit = (tile: FakeTile) => {
      const decision = tile.shouldSplit(this.splitLimits, this._eyePosRenderSR, 15.25);
      this.decisions.set(tile, decision);
      this.afterDecision?.(tile, decision);
      // The SDK bypasses descendants when a parent is marked for merging.
      if (!tile.leaf && decision === 1) tile.children.forEach(visit);
    };
    this._rootTiles.forEach(visit);
    return this.nativeResult;
  }

  run(budget: Budget = { done: false }): object {
    this._viewChanged = true;
    return this._updateAllTilesStatus(budget);
  }
}

function fixture() {
  const root = new FakeTile("0/0/0");
  root.decision = 1;
  const branch = new FakeTile("14/1/1", root);
  const leaf = new FakeTile("15/2/2", branch);
  const surface = new FakeSurface([root, branch, leaf], root);
  const view = { basemapTerrain: surface, quality: 1, qualityProfile: "medium" };
  return { root, branch, leaf, surface, view };
}

function install(view: unknown, options: { holdMs?: number; radiusM?: number; outOfView?: boolean } = {}, version = "5.1.24") {
  return installTerrainDetailRetention(view as SceneView, version, { now: () => Date.now(), ...options });
}

function retreat(surface: FakeSurface) {
  surface._eyePosRenderSR[0]! -= 1000;
}

describe("nearby terrain detail retention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    expect(Object.getOwnPropertyDescriptor(FakeTile.prototype, "shouldSplit")).toEqual(nativeSplitDescriptor);
  });

  it.each(["5.1.21", "5.1.24", "5.1.999"])("retains nearby detail on compatible 5.1 patch %s", version => {
    const { view, surface, branch } = fixture();
    const handle = install(view, {}, version);
    surface.run();
    expect(handle.diagnostics().status).toBe("active");
    expect(surface.decisions.get(branch)).toBe(1);
    handle.remove();
  });

  it.each([0, 1, 2])("preserves native refinement and leaf decision %i with the original receiver and arguments", decision => {
    const { view, surface, branch, leaf } = fixture();
    branch.decision = 1;
    leaf.decision = decision;
    const handle = install(view);
    const budget = { done: false };

    expect(surface.run(budget)).toBe(surface.nativeResult);
    expect(surface.lastBudget).toBe(budget);
    expect(surface.decisions.get(branch)).toBe(1);
    expect(surface.decisions.get(leaf)).toBe(decision);
    expect(branch.calls).toEqual([{ receiver: branch, args: [surface.splitLimits, surface._eyePosRenderSR, 15.25] }]);
    expect(handle.diagnostics().heldDecisions).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps nearby detail after the single grace wakeup, then releases when moving away", () => {
    const { view, surface, root, branch, leaf } = fixture();
    root.decision = 0;
    const handle = install(view);

    surface.run();
    expect(root.loaded).toBe(false);
    expect(branch.loaded).toBe(false);
    expect([...surface.decisions.values()]).toEqual([1, 1, 0]);
    expect(surface.decisions.has(leaf)).toBe(true);
    expect(handle.diagnostics()).toMatchObject({ heldDecisions: 2, maximumHeldBranches: 2 });
    expect(vi.getTimerCount()).toBe(1);
    expect(Object.hasOwn(root, "shouldSplit")).toBe(false);
    expect(Object.hasOwn(branch, "shouldSplit")).toBe(false);

    vi.advanceTimersByTime(1799);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    expect(surface.requestUpdate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(surface._viewChanged).toBe(true);
    expect(surface.requestUpdate).toHaveBeenCalledTimes(1);
    expect(handle.diagnostics().timerWakeups).toBe(1);
    surface._updateAllTilesStatus({ done: false });
    expect(surface.decisions.get(root)).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    surface.run();
    expect(surface.decisions.get(root)).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(root)).toBe(0);
    expect(surface.decisions.has(branch)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(5000);
    surface.run();
    expect(surface.decisions.get(root)).toBe(0);
    expect(surface.requestUpdate).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh hold after native refinement resumes", () => {
    const { view, surface, branch } = fixture();
    install(view);
    surface.run();
    vi.advanceTimersByTime(1000);
    branch.decision = 1;
    surface.run();
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(200);
    branch.decision = 0;
    surface.run();
    vi.advanceTimersByTime(1000);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    vi.advanceTimersByTime(801);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it("measures retreat from the closest camera approach, using a 25 percent margin", () => {
    const { view, surface, branch } = fixture();
    branch._center[1].center = [4000, 0, 0];
    install(view);
    surface.run();
    vi.advanceTimersByTime(1801);
    surface._eyePosRenderSR[0] = 2000;
    surface.run();
    surface._eyePosRenderSR[0] = 1501;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    surface._eyePosRenderSR[0] = 1500;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it("keeps a minimum 250 m retreat margin and the short grace period", () => {
    const { view, surface, branch } = fixture();
    install(view);
    surface.run();
    surface._eyePosRenderSR[0] = -250;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    vi.advanceTimersByTime(1801);
    surface._eyePosRenderSR[0] = -249;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    surface._eyePosRenderSR[0] = -250;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it("does not confuse a DEM bounds-center change with camera retreat", () => {
    const { view, surface, branch } = fixture();
    install(view);
    surface.run();
    vi.advanceTimersByTime(1801);
    branch._center[1].center = [4000, 0, 0];
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves detail during a quality upgrade and releases a deferred downgrade until refinement resumes", () => {
    const { view, surface, branch } = fixture();
    const handle = install(view);
    surface.run();
    vi.advanceTimersByTime(1801);
    view.qualityProfile = "high";
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    view.qualityProfile = "medium";
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(handle.diagnostics().activeBranches).toBe(0);
    expect(handle.diagnostics().releasedBranches).toBe(1);
    for (let i = 0; i < 10; i++) surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    branch.decision = 1;
    surface.run();
    expect(handle.diagnostics().releasedBranches).toBe(0);
    branch.decision = 0;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
  });

  it.each(["offscreen", "far", "pressure", "tree-cap", "branch-cap"] as const)("forgets spatial history after %s", cause => {
    const { view, surface, root, branch, leaf } = fixture();
    const handle = install(view);
    surface.run();
    vi.advanceTimersByTime(1801);
    if (cause === "offscreen") leaf.visible = false;
    if (cause === "far") leaf._center[1].center = [7000, 0, 0];
    if (cause === "pressure") view.quality = 0.9;
    if (cause === "tree-cap") surface.reportedLength = 4097;
    if (cause === "branch-cap") for (let i = 0; i < 256; i++) {
      const parent = new FakeTile(`14/${i + 10}/0`, root);
      surface.tiles.push(parent, new FakeTile(`15/${i + 20}/0`, parent));
    }
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(handle.diagnostics().activeBranches).toBe(0);
    expect(handle.diagnostics().releasedBranches).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    handle.remove();
  });

  it.each(["offscreen", "unloaded", "far", "invisible-parent"] as const)("delegates %s terrain to native selection", kind => {
    const { view, surface, branch, leaf } = fixture();
    if (kind === "offscreen") leaf.visible = false;
    if (kind === "unloaded") leaf.loaded = false;
    if (kind === "far") leaf._center[1].center = [7000, 0, 0];
    if (kind === "invisible-parent") branch.visible = false;
    const handle = install(view);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(handle.diagnostics().heldDecisions).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the rendered tile's bounds for proximity and leaves unrelated far sibling branches native", () => {
    const { view, surface, root, branch, leaf } = fixture();
    leaf._center[1].center = [6500, 0, 0];
    leaf.radius = 1000;
    const farBranch = new FakeTile("14/9/9", root);
    const farLeaf = new FakeTile("15/18/18", farBranch);
    farLeaf._center[1].center = [20000, 0, 0];
    surface.tiles.push(farBranch, farLeaf);
    install(view);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    expect(surface.decisions.get(farBranch)).toBe(0);
    expect(surface.decisions.has(farLeaf)).toBe(false);
  });

  it.each(["low", "medium", "high"])("retains detail out to 6 km at %s quality", qualityProfile => {
    const { view, surface, branch, leaf } = fixture();
    view.qualityProfile = qualityProfile;
    leaf._center[1].center = [5500, 0, 0];
    const handle = install(view);
    surface.run();
    expect(handle.diagnostics().radiusM).toBe(6000);
    expect(surface.decisions.get(branch)).toBe(1);
    leaf._center[1].center = [6100, 0, 0];
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it("honors an explicit radius override", () => {
    const { view, surface, branch, leaf } = fixture();
    leaf._center[1].center = [3500, 0, 0];
    install(view, { radiusM: 3000 });
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it.each([0.979, Number.NaN, undefined])("releases the hold under memory quality %s and cancels its wakeup", quality => {
    const { view, surface, branch } = fixture();
    const handle = install(view);
    surface.run();
    expect(vi.getTimerCount()).toBe(1);
    (view as { quality: number | undefined }).quality = quality;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(handle.diagnostics().budgetSkips).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("delegates an oversized tile tree without scanning it", () => {
    const { view, surface, branch } = fixture();
    surface.reportedLength = 4097;
    const handle = install(view);
    surface.run();
    expect(surface.scans).toBe(0);
    expect(surface.decisions.get(branch)).toBe(0);
    expect(handle.diagnostics().budgetSkips).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("delegates an oversized eligible set once, including when native selection throws", () => {
    const { view, surface, root, branch } = fixture();
    for (let index = 0; index < 256; index += 1) {
      const parent = new FakeTile(`14/${index + 10}/0`, root);
      const child = new FakeTile(`15/${index + 20}/0`, parent);
      surface.tiles.push(parent, child);
    }
    const failure = new Error("native selection failed");
    surface.afterDecision = () => { throw failure; };
    const handle = install(view);
    expect(() => surface.run()).toThrow(failure);
    expect(surface.nativeCalls).toBe(1);
    expect(handle.diagnostics().budgetSkips).toBe(1);
    expect(Object.hasOwn(branch, "shouldSplit")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("replaces the shared split method only during native selection and never reshapes tiles", () => {
    const { view, surface, root, branch, leaf } = fixture();
    root.decision = 0;
    install(view);
    let replaced = false;
    surface.afterDecision = () => { replaced ||= FakeTile.prototype.shouldSplit !== nativeSplitDescriptor?.value; };
    surface.run();
    expect(replaced).toBe(true);
    expect(surface.decisions.get(branch)).toBe(1);
    expect(Object.getOwnPropertyDescriptor(FakeTile.prototype, "shouldSplit")).toEqual(nativeSplitDescriptor);
    for (const tile of [root, branch, leaf]) expect(Object.hasOwn(tile, "shouldSplit")).toBe(false);
  });

  it("leaves a tile with its own split method to native selection and keeps that method", () => {
    const { view, surface, root, branch } = fixture();
    root.decision = 0;
    Object.defineProperty(branch, "shouldSplit", {
      configurable: true, enumerable: true, writable: false, value: FakeTile.prototype.shouldSplit,
    });
    const original = Object.getOwnPropertyDescriptor(branch, "shouldSplit");
    install(view);
    surface.run();
    expect(surface.decisions.get(root)).toBe(1);
    expect(surface.decisions.get(branch)).toBe(0);
    expect(Object.getOwnPropertyDescriptor(branch, "shouldSplit")).toEqual(original);
  });

  it("restores temporary tile methods and propagates a native exception without retrying selection", () => {
    const { view, surface, branch, root } = fixture();
    const failure = new Error("native geometry decision failed");
    const handle = install(view);
    surface.afterDecision = tile => { if (tile === branch) throw failure; };
    expect(() => surface.run()).toThrow(failure);
    expect(surface.nativeCalls).toBe(1);
    expect(Object.hasOwn(branch, "shouldSplit")).toBe(false);
    expect(Object.hasOwn(root, "shouldSplit")).toBe(false);
    handle.remove();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves native selection in control when the shared split method cannot be replaced", () => {
    class LockedTile extends FakeTile {}
    Object.defineProperty(LockedTile.prototype, "shouldSplit", { configurable: false, writable: false, value: FakeTile.prototype.shouldSplit });
    const root = new LockedTile("0/0/0");
    root.decision = 1;
    const branch = new LockedTile("14/1/1", root);
    const leaf = new LockedTile("15/2/2", branch);
    const surface = new FakeSurface([root, branch, leaf], root);
    const handle = install({ basemapTerrain: surface, quality: 1, qualityProfile: "medium" });
    surface.run();
    expect(handle.diagnostics().status).toBe("unsupported");
    expect(surface.nativeCalls).toBe(1);
    expect(surface.decisions.get(branch)).toBe(0);
    expect(Object.hasOwn(surface, "_updateAllTilesStatus")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps an out-of-view branch while it would still split in view, without splitting its leaves", () => {
    const { view, surface, branch, leaf } = fixture();
    branch.visible = false;
    branch.decision = 1;
    leaf.visible = false;
    leaf.decision = 1;
    const handle = install(view, { outOfView: true });
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    expect(surface.decisions.get(leaf)).toBe(0);
    expect(branch._visible).toBe(false);
    expect(handle.diagnostics()).toMatchObject({ outOfView: true, outOfViewHeldDecisions: 1, maximumOutOfViewHeldBranches: 1, heldDecisions: 0 });
    expect(vi.getTimerCount()).toBe(0);
    for (const tile of [branch, leaf]) expect(Object.hasOwn(tile, "shouldSplit")).toBe(false);
    // Back in view, the native decision is the same one.
    branch.visible = true;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    expect(handle.diagnostics().outOfViewHeldDecisions).toBe(1);
  });

  it("merges an out-of-view branch once it would coarsen in view", () => {
    const { view, surface, branch } = fixture();
    branch.visible = false;
    branch.decision = 1;
    install(view, { outOfView: true });
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    branch.decision = 0;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it("keeps the native out-of-view merge unless enabled", () => {
    const { view, surface, branch } = fixture();
    branch.visible = false;
    branch.decision = 1;
    const handle = install(view);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(handle.diagnostics()).toMatchObject({ outOfView: false, outOfViewHeldDecisions: 0 });
  });

  it.each(["clipped", "private-visibility", "elevation-level", "pressure", "tree-cap"] as const)("does not hold out-of-view terrain with %s", cause => {
    const { view, surface, branch } = fixture();
    branch.visible = false;
    branch.decision = 1;
    if (cause === "clipped") branch._intersectsClippingArea = false;
    if (cause === "private-visibility") branch._visible = undefined;
    if (cause === "elevation-level") branch.elevationLevel = undefined;
    if (cause === "pressure") view.quality = 0.9;
    if (cause === "tree-cap") surface.reportedLength = 4097;
    const handle = install(view, { outOfView: true });
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(handle.diagnostics().outOfViewHeldDecisions).toBe(0);
  });

  it("restores the visibility and elevation level written by the in-view evaluation", () => {
    class LevelTile extends FakeTile {
      override shouldSplit(...args: unknown[]): number {
        this.calls.push({ receiver: this, args });
        if (!this.visible) return 0;
        this.elevationLevel = 17;
        return this.decision;
      }
    }
    const root = new LevelTile("0/0/0");
    root.decision = 1;
    const branch = new LevelTile("14/1/1", root);
    const leaf = new LevelTile("15/2/2", branch);
    const surface = new FakeSurface([root, branch, leaf], root);
    branch.visible = false;
    leaf.visible = false;
    branch.decision = 2;
    install({ basemapTerrain: surface, quality: 1, qualityProfile: "medium" }, { outOfView: true });
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    expect(branch.calls).toHaveLength(2);
    expect(branch.elevationLevel).toBe(15);
    expect(branch._visible).toBe(false);
  });

  it.each([false, true])("removal restores the surface descriptor (own: %s) and cancels its timer", own => {
    const { view, surface, branch } = fixture();
    if (own) Object.defineProperty(surface, "_updateAllTilesStatus", {
      configurable: true, enumerable: true, writable: false, value: FakeSurface.prototype._updateAllTilesStatus,
    });
    const original = Object.getOwnPropertyDescriptor(surface, "_updateAllTilesStatus");
    const handle = install(view);
    surface.run();
    handle.remove();
    handle.remove();
    expect(Object.getOwnPropertyDescriptor(surface, "_updateAllTilesStatus")).toEqual(original);
    expect(handle.diagnostics().status).toBe("removed");
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(3000);
    expect(surface.requestUpdate).not.toHaveBeenCalled();
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it("does not replace a successor's surface hook on removal", () => {
    const { view, surface } = fixture();
    const handle = install(view);
    const successor = vi.fn(() => surface.nativeResult);
    surface._updateAllTilesStatus = successor;
    handle.remove();
    expect(surface._updateAllTilesStatus).toBe(successor);
  });

  it("does not wake a destroyed surface", () => {
    const { view, surface } = fixture();
    const handle = install(view);
    surface.run();
    surface.destroyed = true;
    vi.advanceTimersByTime(1801);
    expect(surface.requestUpdate).not.toHaveBeenCalled();
    expect(handle.diagnostics().timerWakeups).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    handle.remove();
  });

  it("does not inherit an expired hold when a pooled tile is reused at another key", () => {
    const { view, surface, branch } = fixture();
    install(view);
    surface.run();
    vi.advanceTimersByTime(1801);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
    branch.key = "14/8/8";
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    vi.advanceTimersByTime(1801);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it("rearms the same branch object and key after native merge, leaf refinement, and coarsening", () => {
    const { view, surface, branch, leaf } = fixture();
    const originalKey = branch.key;
    install(view);
    surface.run();
    vi.advanceTimersByTime(1801);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);

    // Native _mergeTile purges children but keeps the parent object and key.
    surface.tiles.splice(surface.tiles.indexOf(leaf), 1);
    branch.children.length = 0;
    branch.leaf = true;
    branch.loaded = true;
    branch.decision = 1;
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    expect(Object.hasOwn(branch, "shouldSplit")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    // Native _splitTile creates children on that same parent after selection.
    const replacement = new FakeTile(leaf.key, branch);
    surface.tiles.push(replacement);
    branch.decision = 0;
    surface.run();
    expect(branch.key).toBe(originalKey);
    expect(surface.decisions.get(branch)).toBe(1);
    expect(surface.decisions.has(replacement)).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1799);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(1);
    vi.advanceTimersByTime(2);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it.each(["invisible", "unloaded"] as const)("clears expired history when a same-key pooled object is observed as an %s leaf", phase => {
    const { view, surface, branch, leaf } = fixture();
    const originalKey = branch.key;
    install(view);
    surface.run();
    vi.advanceTimersByTime(1801);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);

    surface.tiles.splice(surface.tiles.indexOf(leaf), 1);
    branch.children.length = 0;
    branch.leaf = true;
    branch.loaded = phase !== "unloaded";
    branch.visible = phase !== "invisible";
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);

    // A pooled leaf can receive its native split decision during tile creation,
    // outside _updateAllTilesStatus. The earlier leaf scan must clear history.
    branch.loaded = true;
    branch.visible = true;
    branch.decision = 1;
    expect(branch.shouldSplit(surface.splitLimits, surface._eyePosRenderSR, 15.25)).toBe(1);
    const replacement = new FakeTile(leaf.key, branch);
    surface.tiles.push(replacement);
    branch.decision = 0;
    surface.run();
    expect(branch.key).toBe(originalKey);
    expect(surface.decisions.get(branch)).toBe(1);
    expect(surface.decisions.has(replacement)).toBe(true);
    vi.advanceTimersByTime(1801);
    retreat(surface);
    surface.run();
    expect(surface.decisions.get(branch)).toBe(0);
  });

  it.each(["unchanged", "no-roots", "done"] as const)("preserves native early exit for %s", condition => {
    const { view, surface } = fixture();
    const handle = install(view);
    if (condition === "unchanged") surface._viewChanged = false;
    if (condition === "no-roots") surface._rootTiles = null;
    const budget = { done: condition === "done" };
    expect(surface._updateAllTilesStatus(budget)).toBe(surface.nativeResult);
    expect(surface.nativeCalls).toBe(1);
    expect(surface.scans).toBe(0);
    expect(handle.diagnostics().passes).toBe(0);
  });

  it.each(["version", "missing-surface", "missing-iterator", "missing-status", "missing-request", "sealed", "invalid-options"] as const)("leaves unsupported %s unchanged", condition => {
    const { view, surface } = fixture();
    const input: { basemapTerrain?: unknown; quality: number } = { ...view };
    if (condition === "missing-surface") delete input.basemapTerrain;
    if (condition === "missing-iterator") input.basemapTerrain = { ...surface, _allTiles: {} };
    if (condition === "missing-status") input.basemapTerrain = { ...surface };
    if (condition === "missing-request") input.basemapTerrain = { ...surface, _updateAllTilesStatus: FakeSurface.prototype._updateAllTilesStatus, requestUpdate: undefined };
    if (condition === "sealed") Object.preventExtensions(surface);
    const target = input.basemapTerrain as object | undefined;
    const original = target && Object.getOwnPropertyDescriptors(target);
    const handle = install(input, condition === "invalid-options" ? { holdMs: Number.NaN } : {}, condition === "version" ? "5.2.0" : "5.1.24");
    expect(handle.diagnostics().status).toBe("unsupported");
    if (target) expect(Object.getOwnPropertyDescriptors(target)).toEqual(original);
    expect(vi.getTimerCount()).toBe(0);
    handle.remove();
    if (target) expect(Object.getOwnPropertyDescriptors(target)).toEqual(original);
  });
});
