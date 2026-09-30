import type SceneView from "@arcgis/core/views/SceneView.js";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import type { AircraftPresenter } from "./aircraft-presenter";

/**
 * Warm the exhaust while startup or an aircraft change is already waiting.
 * A shared two-second deadline prevents a hidden/suspended view from blocking
 * flight. Every watcher, timer and animation callback is cancelled on exit.
 */
export async function prewarmAircraftExhaust(
  view: SceneView,
  layer: GraphicsLayer,
  presenter: AircraftPresenter,
  signal: AbortSignal,
): Promise<void> {
  const wait = new AbortController();
  const abort = () => wait.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timeout = window.setTimeout(abort, 2_000);
  // Optional SDK counter distinguishes actual ArcGIS draws from browser frames.
  // Older SDKs use the public layer-update wait followed by two browser frames.
  const stage = (view as unknown as {
    stage?: { renderer?: { performanceInfo?: { totalFrameCount?: number } } };
  }).stage;
  const frameCount = () => stage?.renderer?.performanceInfo?.totalFrameCount;
  const whenLayerReady = async () => {
    wait.signal.throwIfAborted();
    let onAbort: () => void = () => {};
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(wait.signal.reason);
      wait.signal.addEventListener("abort", onAbort, { once: true });
    });
    try {
      return await Promise.race([view.whenLayerView(layer), cancelled]);
    } finally {
      wait.signal.removeEventListener("abort", onAbort);
    }
  };
  const nextFrame = (): Promise<void> => new Promise((resolve, reject) => {
    wait.signal.throwIfAborted();
    const onAbort = () => {
      cancelAnimationFrame(handle);
      reject(wait.signal.reason);
    };
    const handle = requestAnimationFrame(() => {
      wait.signal.removeEventListener("abort", onAbort);
      resolve();
    });
    wait.signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    await presenter.prewarmExhaust(async () => {
      // Layer creation/loading is abortable too; a failed/hidden layer is not
      // allowed to turn an optional warm-up into a failed flight startup.
      const layerView = await whenLayerReady();
      await nextFrame();
      await reactiveUtils.whenOnce(() => !layerView.updating, { signal: wait.signal });
      const first = frameCount();
      let frames = 0;
      do {
        await nextFrame();
        frames += 1;
      } while (typeof first === "number" && Number.isFinite(first)
        ? (frameCount() ?? first) - first < 2 : frames < 2);
      return true;
    });
  } catch {
    // Best effort: cancellation/failure still restores the ordinary plume.
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
    wait.abort();
  }
}
