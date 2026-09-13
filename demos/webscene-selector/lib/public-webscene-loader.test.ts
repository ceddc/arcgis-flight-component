import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadPublicWebScene,
  type DemoPortalItem,
  type DemoWebScene,
} from "./public-webscene-loader";

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
        spatialReference: { isWebMercator: true },
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
