/**
 * Exercises map-switch commit, rollback, fallback, disposal, and serialization
 * using a small fake adapter so failures can be triggered deterministically.
 */
import { describe, expect, it, vi } from "vitest";
import {
  SceneActivationController,
  type ActivatableDemoScene,
  type SceneActivationAdapter,
} from "./scene-activation-controller";

interface TestMap {
  id: string;
  destroyed: boolean;
  destroy(): void;
}

type TestScene = ActivatableDemoScene<TestMap, { speed: number }, string>;

/** Creates a fake map whose destroy state and call count are observable. */
function testMap(id: string): TestMap {
  const map = {
    id,
    destroyed: false,
    destroy: vi.fn(() => { map.destroyed = true; }),
  };
  return map;
}

/**
 * Builds a controller adapter with configurable failures and a map replacement
 * gate; exposes its current map and disposal log for assertions.
 */
function harness(
  initialMap: TestMap,
  options: {
    startFailure?: (start?: { speed: number }) => boolean;
    replaceFailure?: (map: TestMap) => boolean;
    replaceGate?: Promise<void>;
  } = {},
) {
  let currentMap: TestMap | null = initialMap;
  const disposed: string[] = [];
  const fallback = testMap("fallback");
  const adapter: SceneActivationAdapter<TestMap, { speed: number }, string> = {
    getCurrentMap: () => currentMap,
    clearNavigation: vi.fn(),
    replaceMap: vi.fn(async (map, _viewConfiguration) => {
      await options.replaceGate;
      if (options.replaceFailure?.(map)) throw new Error("replace failed");
      currentMap = map;
    }),
    startNavigation: vi.fn(async (start) => {
      if (options.startFailure?.(start)) throw new Error("start failed");
    }),
    createFallbackMap: () => fallback,
    disposeMap: vi.fn((map) => {
      if (map.destroyed) return;
      map.destroy();
      disposed.push(map.id);
    }),
    isDestroyed: (map) => map.destroyed,
  };
  return { adapter, disposed, fallback, get currentMap() { return currentMap; } };
}

describe("scene activation controller", () => {
  it("destroys the retired map only after a successful switch", async () => {
    const oldMap = testMap("old");
    const nextMap = testMap("next");
    const previous: TestScene = { map: oldMap, title: "Old", itemId: null };
    const next: TestScene = { map: nextMap, title: "Next", itemId: null };
    const test = harness(oldMap);
    const controller = new SceneActivationController(test.adapter, previous);

    await controller.activate(next);

    expect(controller.activeScene).toBe(next);
    expect(test.currentMap).toBe(nextMap);
    expect(test.disposed).toEqual(["old"]);
    expect(test.adapter.startNavigation).toHaveBeenCalledWith(next.start, undefined);
  });

  it("rolls back and destroys a candidate after activation failure", async () => {
    const oldMap = testMap("old");
    const nextMap = testMap("next");
    const previous: TestScene = {
      map: oldMap,
      title: "Old",
      itemId: null,
      start: { speed: 80 },
      powerMode: "slow",
      viewConfiguration: "old-view",
    };
    const next: TestScene = {
      map: nextMap,
      title: "Next",
      itemId: null,
      start: { speed: 140 },
      powerMode: "turbo",
      viewConfiguration: "next-view",
    };
    const test = harness(oldMap, {
      startFailure: (start) => start?.speed === 140,
    });
    const controller = new SceneActivationController(test.adapter, previous);

    // The candidate has already replaced the map when startup fails, so rollback must restore the old scene and dispose only the candidate.
    await expect(controller.activate(next)).rejects.toThrow("start failed");

    expect(controller.activeScene).toBe(previous);
    expect(test.currentMap).toBe(oldMap);
    expect(test.disposed).toEqual(["next"]);
    expect(test.adapter.startNavigation).toHaveBeenNthCalledWith(1, next.start, "turbo");
    expect(test.adapter.startNavigation).toHaveBeenNthCalledWith(2, previous.start, "slow");
    expect(test.adapter.replaceMap).toHaveBeenNthCalledWith(
      1,
      nextMap,
      "next-view",
    );
    expect(test.adapter.replaceMap).toHaveBeenNthCalledWith(
      2,
      oldMap,
      "old-view",
    );
  });

  it("clears active state when restarting the previous scene fails", async () => {
    const oldMap = testMap("old");
    const nextMap = testMap("next");
    const previous: TestScene = {
      map: oldMap,
      title: "Old",
      itemId: null,
      start: { speed: 80 },
    };
    const next: TestScene = {
      map: nextMap,
      title: "Next",
      itemId: null,
      start: { speed: 140 },
    };
    const test = harness(oldMap, { startFailure: () => true });
    const controller = new SceneActivationController(test.adapter, previous);

    await expect(controller.activate(next)).rejects.toThrow("start failed");

    expect(controller.activeScene).toBeNull();
    expect(test.currentMap).toBe(oldMap);
    expect(test.disposed.filter((id) => id === "next")).toHaveLength(1);
    expect(nextMap.destroy).toHaveBeenCalledOnce();
  });

  it("uses a fallback and avoids double destroy when map rollback fails", async () => {
    const oldMap = testMap("old");
    const nextMap = testMap("next");
    const previous: TestScene = { map: oldMap, title: "Old", itemId: null };
    const next: TestScene = {
      map: nextMap,
      title: "Next",
      itemId: null,
      start: { speed: 140 },
    };
    const test = harness(oldMap, {
      startFailure: (start) => start?.speed === 140,
      replaceFailure: (map) => map === oldMap,
    });
    const controller = new SceneActivationController(test.adapter, previous);

    await expect(controller.activate(next)).rejects.toThrow("start failed");

    expect(controller.activeScene).toBeNull();
    expect(test.currentMap).toBe(test.fallback);
    expect(test.disposed.filter((id) => id === "next")).toHaveLength(1);
    expect(test.disposed.filter((id) => id === "old")).toHaveLength(1);
    expect(nextMap.destroy).toHaveBeenCalledOnce();
    expect(oldMap.destroy).toHaveBeenCalledOnce();
  });

  it("keeps the initial baseline map when a first activation rolls back", async () => {
    const baselineMap = testMap("baseline");
    const nextMap = testMap("next");
    const next: TestScene = {
      map: nextMap,
      title: "Next",
      itemId: null,
      start: { speed: 140 },
    };
    const test = harness(baselineMap, {
      startFailure: (start) => start?.speed === 140,
    });
    const controller = new SceneActivationController(test.adapter);

    await expect(controller.activate(next)).rejects.toThrow("start failed");

    expect(controller.activeScene).toBeNull();
    expect(test.currentMap).toBe(baselineMap);
    expect(baselineMap.destroy).not.toHaveBeenCalled();
    expect(nextMap.destroy).toHaveBeenCalledOnce();
    expect(test.adapter.clearNavigation).toHaveBeenCalledTimes(2);
  });

  it("rejects overlapping activation without disturbing the active request", async () => {
    let releaseReplacement!: () => void;
    const replaceGate = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const oldMap = testMap("old");
    const firstMap = testMap("first");
    const overlappingMap = testMap("overlapping");
    const previous: TestScene = { map: oldMap, title: "Old", itemId: null };
    const first: TestScene = { map: firstMap, title: "First", itemId: null };
    const overlapping: TestScene = {
      map: overlappingMap,
      title: "Overlapping",
      itemId: null,
    };
    const test = harness(oldMap, { replaceGate });
    const controller = new SceneActivationController(test.adapter, previous);

    // Keep the first replacement paused to prove a second request is rejected rather than racing the active transition.
    const activation = controller.activate(first);
    await expect(controller.activate(overlapping)).rejects.toThrow(
      "already in progress",
    );
    releaseReplacement();
    await activation;

    expect(controller.activeScene).toBe(first);
    expect(test.currentMap).toBe(firstMap);
    expect(overlappingMap.destroy).not.toHaveBeenCalled();
    expect(test.disposed).toEqual(["old"]);
  });
});
