/**
 * Loads an anonymously accessible ArcGIS Portal item as a flight-ready WebScene.
 * This module owns the item and scene while they load, enforces timeouts and
 * validation, and transfers the loaded map to the caller on success. Failed
 * loads release the resource created so far through the shared disposal helper.
 */
import type { ArcGISItemMetadata, WebSceneMetadata } from "./webscene-validation";
import {
  validateFlightWebScene,
  validatePublicWebSceneItem,
} from "./webscene-validation";
import {
  disposeArcGISResource,
  type ArcGISDisposableResource,
} from "./scene-resources";

/** Portal item contract needed to validate and clean up a public WebScene item. */
export interface DemoPortalItem extends ArcGISDisposableResource, ArcGISItemMetadata {
  readonly title?: string | null;
  load(): Promise<this>;
}

/** WebScene contract needed to load its map and inspect flight compatibility. */
export interface DemoWebScene extends ArcGISDisposableResource {
  readonly initialViewProperties: WebSceneMetadata;
  load(): Promise<this>;
}

/** Factories and timing hooks that isolate ArcGIS construction from loader logic. */
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

/** Successfully loaded public map plus the label and requested item identity. */
export interface LoadedPublicWebScene<TScene extends DemoWebScene> {
  map: TScene;
  title: string;
  itemId: string;
}

/**
 * Races a load against a timeout and always clears the timeout handle.
 *
 * The underlying SDK promise cannot be forcibly rejected; on timeout the
 * optional callback lets the caller cancel and destroy its ArcGIS resource.
 *
 * @param promise SDK work to await.
 * @param options Timeout duration, user-facing error, and injectable timer hooks.
 * @returns The original value if loading wins.
 * @throws The original load error or a new error with options.message on timeout.
 */
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

/**
 * Loads a public Portal WebScene and validates it before returning its map.
 *
 * Item and scene objects are owned temporarily by this loader until success.
 * On timeout or validation failure it cancels pending work when possible and
 * destroys the object that has been created; successful resources transfer to
 * the caller for later disposal.
 *
 * @param itemId Exact ArcGIS item ID to resolve.
 * @param options ArcGIS factories, timeout, and optional cleanup hooks.
 * @returns The loaded map with a display title and original item ID.
 * @throws If item/scene loading times out or the item/view is unsupported.
 */
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
