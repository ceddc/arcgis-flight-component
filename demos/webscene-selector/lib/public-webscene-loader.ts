import type { ArcGISItemMetadata, WebSceneMetadata } from "./webscene-validation";
import {
  validateFlightWebScene,
  validatePublicWebSceneItem,
} from "./webscene-validation";
import {
  disposeArcGISResource,
  type ArcGISDisposableResource,
} from "./scene-resources";

export interface DemoPortalItem extends ArcGISDisposableResource, ArcGISItemMetadata {
  readonly title?: string | null;
  load(): Promise<this>;
}

export interface DemoWebScene extends ArcGISDisposableResource {
  readonly initialViewProperties: WebSceneMetadata;
  load(): Promise<this>;
}

export interface PublicWebSceneLoaderOptions<
  TItem extends DemoPortalItem,
  TScene extends DemoWebScene,
> {
  createPortalItem(itemId: string): TItem;
  createWebScene(item: TItem): TScene;
  timeoutMs?: number;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
  onCleanupError?: (error: unknown) => void;
}

export interface LoadedPublicWebScene<TScene extends DemoWebScene> {
  map: TScene;
  title: string;
  itemId: string;
}

export function withLoadTimeout<T>(
  promise: Promise<T>,
  options: {
    timeoutMs: number;
    message: string;
    onTimeout?: () => void;
    setTimer?: PublicWebSceneLoaderOptions<DemoPortalItem, DemoWebScene>["setTimer"];
    clearTimer?: PublicWebSceneLoaderOptions<DemoPortalItem, DemoWebScene>["clearTimer"];
    onCleanupError?: (error: unknown) => void;
  },
): Promise<T> {
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimer(() => {
      reject(new Error(options.message));
      try {
        options.onTimeout?.();
      } catch (error) {
        options.onCleanupError?.(error);
      }
    }, options.timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimer(timer);
  });
}

export async function loadPublicWebScene<
  TItem extends DemoPortalItem,
  TScene extends DemoWebScene,
>(
  itemId: string,
  options: PublicWebSceneLoaderOptions<TItem, TScene>,
): Promise<LoadedPublicWebScene<TScene>> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const dispose = (resource: ArcGISDisposableResource): void => {
    try {
      disposeArcGISResource(resource);
    } catch (error) {
      options.onCleanupError?.(error);
    }
  };
  const item = options.createPortalItem(itemId);
  let webScene: TScene | null = null;
  try {
    await withLoadTimeout(item.load(), {
      timeoutMs,
      message: `ArcGIS did not return the item within ${timeoutMs / 1_000} seconds.`,
      onTimeout: () => dispose(item),
      setTimer: options.setTimer,
      clearTimer: options.clearTimer,
      onCleanupError: options.onCleanupError,
    });
    validatePublicWebSceneItem(item);

    webScene = options.createWebScene(item);
    await withLoadTimeout(webScene.load(), {
      timeoutMs,
      message: `The WebScene did not load within ${timeoutMs / 1_000} seconds.`,
      onTimeout: () => dispose(webScene!),
      setTimer: options.setTimer,
      clearTimer: options.clearTimer,
      onCleanupError: options.onCleanupError,
    });
    validateFlightWebScene(webScene.initialViewProperties);
    return {
      map: webScene,
      title: item.title || "Custom WebScene",
      itemId,
    };
  } catch (error) {
    dispose(webScene ?? item);
    throw error;
  }
}
