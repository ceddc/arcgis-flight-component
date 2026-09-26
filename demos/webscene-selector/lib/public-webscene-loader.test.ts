/**
 * Covers successful loading and the timeout/validation cleanup paths without
 * constructing live ArcGIS objects or making network requests.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadPublicWebScene,
  verifyPublicWebSceneAccess,
  type DemoPortalItem,
  type DemoWebScene,
} from "./public-webscene-loader";

/** Adds observable cancel/destroy methods to lightweight resource fakes. */
function disposable<T extends object>(value: T) {
  const resource = {
    ...value,
    destroyed: false,
    cancelLoad: vi.fn(),
    destroy: vi.fn(() => { resource.destroyed = true; }),
  };
  return resource;
}

afterEach(() => vi.useRealTimers());

describe("public WebScene loader", () => {
  it("accepts anonymous public metadata and rejects inaccessible items before SDK load", async () => {
    const fetchItem = vi.fn(async () => ({ ok: true, json: async () => ({ type: "Web Scene", access: "public" }) }));
    await verifyPublicWebSceneAccess("a".repeat(32), { fetchItem });
    expect(fetchItem).toHaveBeenCalledWith(
      `https://www.arcgis.com/sharing/rest/content/items/${"a".repeat(32)}?f=json`,
      expect.objectContaining({ credentials: "omit", signal: expect.any(AbortSignal) }),
    );
    await expect(verifyPublicWebSceneAccess("b".repeat(32), {
      fetchItem: async () => ({ ok: true, json: async () => ({ error: { code: 400 } }) }),
    })).rejects.toThrow(/private or unavailable/);
    await expect(verifyPublicWebSceneAccess("c".repeat(32), {
      fetchItem: async () => ({ ok: true, json: async () => ({ type: "Web Scene", access: "private" }) }),
    })).rejects.toThrow(/public WebScenes only/);
  });

  it("cancels a replaced item load and releases its resource", async () => {
    const controller = new AbortController();
    const item = disposable({
      type: "Web Scene", access: "public", title: "Replaced scene",
      load: vi.fn(() => new Promise<DemoPortalItem>(() => undefined)),
    });
    const loading = loadPublicWebScene("a".repeat(32), {
      createPortalItem: () => item,
      createWebScene: () => { throw new Error("must not create"); },
      signal: controller.signal,
      timeoutMs: 100,
    });
    const rejection = expect(loading).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejection;
    expect(item.cancelLoad).toHaveBeenCalledOnce();
    expect(item.destroy).toHaveBeenCalledOnce();
  });

  it("loads and validates a public global WebScene", async () => {
    const item = disposable({
      type: "Web Scene",
      access: "public",
      title: "Test scene",
      load: vi.fn(async function (this: DemoPortalItem) { return this; }),
    });
    const map = disposable({
      initialViewProperties: {
        viewingMode: "global" as const,
        spatialReference: { isWebMercator: true, isGeographic: false, metersPerUnit: 1 },
      },
      load: vi.fn(async function (this: DemoWebScene) { return this; }),
    });

    await expect(loadPublicWebScene("a".repeat(32), {
      createPortalItem: () => item,
      createWebScene: () => map,
      timeoutMs: 100,
    })).resolves.toEqual({
      map,
      title: "Test scene",
      itemId: "a".repeat(32),
    });
    expect(item.destroy).not.toHaveBeenCalled();
    expect(map.destroy).not.toHaveBeenCalled();
  });

  it("cancels and destroys a timed-out item exactly once", async () => {
    vi.useFakeTimers();
    const item = disposable({
      type: "Web Scene",
      access: "public",
      title: "Slow scene",
      load: vi.fn(() => new Promise<DemoPortalItem>(() => undefined)),
    });
    const loading = loadPublicWebScene("b".repeat(32), {
      createPortalItem: () => item,
      createWebScene: () => { throw new Error("must not create"); },
      timeoutMs: 50,
    });
    const rejection = expect(loading).rejects.toThrow(/within 0.05 seconds/);

    await vi.advanceTimersByTimeAsync(50);
    await rejection;
    expect(item.cancelLoad).toHaveBeenCalledOnce();
    expect(item.destroy).toHaveBeenCalledOnce();
  });

  it("preserves the timeout reason when cancellation rejects the source load", async () => {
    vi.useFakeTimers();
    let rejectLoad!: (error: unknown) => void;
    const item = disposable({
      type: "Web Scene",
      access: "public",
      title: "Canceled scene",
      load: vi.fn(() => new Promise<DemoPortalItem>((_resolve, reject) => {
        rejectLoad = reject;
      })),
    });
    item.cancelLoad.mockImplementation(() => {
      rejectLoad(new DOMException("Canceled by cleanup", "AbortError"));
    });
    const loading = loadPublicWebScene("d".repeat(32), {
      createPortalItem: () => item,
      createWebScene: () => { throw new Error("must not create"); },
      timeoutMs: 50,
    });
    const rejection = expect(loading).rejects.toThrow(
      "ArcGIS did not return the item within 0.05 seconds.",
    );

    await vi.advanceTimersByTimeAsync(50);
    await rejection;
    expect(item.cancelLoad).toHaveBeenCalledOnce();
    expect(item.destroy).toHaveBeenCalledOnce();
  });

  it("destroys an item rejected by validation", async () => {
    const item = disposable({
      type: "Web Map",
      access: "public",
      title: "Wrong item",
      load: vi.fn(async function (this: DemoPortalItem) { return this; }),
    });

    await expect(loadPublicWebScene("c".repeat(32), {
      createPortalItem: () => item,
      createWebScene: () => { throw new Error("must not create"); },
      timeoutMs: 100,
    })).rejects.toThrow(/not an ArcGIS WebScene/);
    expect(item.destroy).toHaveBeenCalledOnce();
  });
});
