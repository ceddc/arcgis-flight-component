import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type SceneView from "@arcgis/core/views/SceneView.js";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import type { AircraftPresenter } from "./aircraft-presenter";
import { prewarmAircraftExhaust } from "./aircraft-shader-warmup";

/** Simulate a drawable view without a GPU; timers expose cancellation leaks. */
function fixture() {
  const performanceInfo = { totalFrameCount: 0 };
  const view = {
    stage: { renderer: { performanceInfo } },
    whenLayerView: vi.fn(async () => ({ updating: false })),
  };
  const draw = vi.fn(async (waitForDraw: () => Promise<boolean>) => {
    await waitForDraw();
    await waitForDraw();
  });
  const presenter = { prewarmExhaust: draw } as unknown as AircraftPresenter;
  const controller = new AbortController();
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => {
    performanceInfo.totalFrameCount += 1;
    callback(performance.now());
  }, 16));
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => clearTimeout(handle));
  return { view, draw, controller,
    run: () => prewarmAircraftExhaust(view as unknown as SceneView, {} as GraphicsLayer, presenter, controller.signal) };
}

describe("bounded exhaust shader warm-up", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("waits for both material passes to draw, then releases every timer", async () => {
    const { view, draw, run } = fixture();
    const pending = run();
    await vi.advanceTimersByTimeAsync(150);
    await pending;
    expect(draw).toHaveBeenCalledOnce();
    expect(view.stage.renderer.performanceInfo.totalFrameCount).toBe(6);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ends after two seconds when the layer never becomes ready", async () => {
    const { view, run } = fixture();
    view.whenLayerView.mockImplementation(() => new Promise(() => {}));
    const pending = run();
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a pending frame immediately when the flight stops", async () => {
    const { view, controller, run } = fixture();
    const pending = run();
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();
    await pending;
    expect(view.stage.renderer.performanceInfo.totalFrameCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
