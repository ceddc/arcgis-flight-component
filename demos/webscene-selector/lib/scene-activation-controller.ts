/**
 * Coordinates scene changes for the explorer through an ArcGIS-independent
 * adapter. It installs a candidate map, starts flight, and commits only after
 * both steps succeed; failed activation restores the previous scene or a fresh
 * fallback while disposing maps that are no longer attached.
 */
import type { FlightPowerMode } from "../../../src/core/power-mode";
import type { ArcGISDisposableResource } from "./scene-resources";

/** Map, title, and optional flight/view settings selected for activation. */
export interface ActivatableDemoScene<TMap, TStart, TView = never> {
  map: TMap;
  title: string;
  start?: TStart;
  powerMode?: FlightPowerMode;
  itemId: string | null;
  viewConfiguration?: TView;
}

/**
 * Host operations required to switch maps without binding the controller to DOM
 * or ArcGIS classes. The demo supplies these functions for its concrete types.
 */
export interface SceneActivationAdapter<TMap, TStart, TView = never> {
  getCurrentMap(): TMap | null;
  clearNavigation(): void;
  replaceMap(map: TMap, viewConfiguration?: TView): Promise<void>;
  startNavigation(start: TStart | undefined, powerMode?: FlightPowerMode): Promise<void>;
  createFallbackMap(): TMap;
  disposeMap(map: TMap): void;
  isDestroyed(map: TMap): boolean;
  onActiveSceneChange?(
    scene: ActivatableDemoScene<TMap, TStart, TView> | null,
  ): void;
}

/**
 * Activation failure with the scene that remains active after rollback.
 * The original failure is available as the standard Error cause.
 */
export class SceneActivationError<TMap, TStart, TView = never> extends Error {
  readonly activeScene: ActivatableDemoScene<TMap, TStart, TView> | null;

  constructor(
    cause: unknown,
    activeScene: ActivatableDemoScene<TMap, TStart, TView> | null,
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = "SceneActivationError";
    this.activeScene = activeScene;
  }
}

/**
 * Serializes scene switches and coordinates navigation, map replacement,
 * rollback, and disposal while leaving ArcGIS-specific work to an adapter.
 *
 * A candidate is committed as active only after its map is installed and
 * navigation starts. If either step fails, the controller tries to restore the
 * previous scene; when that scene cannot be reused, it installs a fresh
 * fallback map before disposing detached resources.
 */
export class SceneActivationController<
  TMap extends ArcGISDisposableResource,
  TStart,
  TView = never,
> {
  private activeState: ActivatableDemoScene<TMap, TStart, TView> | null;
  private activationInProgress = false;

  constructor(
    private readonly adapter: SceneActivationAdapter<TMap, TStart, TView>,
    initialActiveScene: ActivatableDemoScene<TMap, TStart, TView> | null = null,
  ) {
    this.activeState = initialActiveScene;
  }

  /** Scene whose map and navigation have most recently activated successfully. */
  get activeScene(): ActivatableDemoScene<TMap, TStart, TView> | null {
    return this.activeState;
  }

  /**
   * Activates one candidate and retires the previous map only after success.
   *
   * @param next Candidate map and the flight/view settings to apply.
   * @throws SceneActivationError with rollback state when activation fails;
   *   rejects overlapping switches before modifying the in-flight activation.
   */
  async activate(next: ActivatableDemoScene<TMap, TStart, TView>): Promise<void> {
    if (this.activationInProgress) {
      throw new Error("A demo scene activation is already in progress.");
    }
    this.activationInProgress = true;
    try {
      const previous = this.activeState;
      const previousMap = this.adapter.getCurrentMap();
      try {
        this.adapter.clearNavigation();
        await this.adapter.replaceMap(next.map, next.viewConfiguration);
        await this.adapter.startNavigation(next.start, next.powerMode);
        this.setActive(next);
        if (previousMap && previousMap !== next.map) {
          this.adapter.disposeMap(previousMap);
        }
      } catch (error) {
        await this.rollback(previous, previousMap, next.map);
        throw new SceneActivationError(error, this.activeState);
      }
    } finally {
      this.activationInProgress = false;
    }
  }

  /** Restores the last active map or a fresh baseline, then cleans detached maps. */
  private async rollback(
    previous: ActivatableDemoScene<TMap, TStart, TView> | null,
    previousMap: TMap | null,
    candidateMap: TMap,
  ): Promise<void> {
    const rollbackMap = previous?.map ?? previousMap;
    try {
      if (rollbackMap && !this.adapter.isDestroyed(rollbackMap)) {
        if (this.adapter.getCurrentMap() !== rollbackMap) {
          await this.adapter.replaceMap(
            rollbackMap,
            previous?.viewConfiguration,
          );
        }
        if (previous) await this.adapter.startNavigation(previous.start, previous.powerMode);
        else this.adapter.clearNavigation();
        this.setActive(previous);
      } else {
        throw new Error("No reusable scene is available for rollback.");
      }
    } catch {
      this.setActive(null);
      if (this.adapter.getCurrentMap() === candidateMap) {
        const fallbackMap = this.adapter.createFallbackMap();
        try {
          await this.adapter.replaceMap(fallbackMap);
          this.adapter.clearNavigation();
        } catch {
          if (this.adapter.getCurrentMap() !== fallbackMap) {
            this.adapter.disposeMap(fallbackMap);
          }
        }
      }
    }
    this.disposeDetached([candidateMap, rollbackMap]);
  }

  /** Disposes unique maps that are neither active nor already destroyed. */
  private disposeDetached(maps: readonly (TMap | null)[]): void {
    const currentMap = this.adapter.getCurrentMap();
    for (const map of new Set(maps)) {
      if (!map || map === currentMap || this.adapter.isDestroyed(map)) continue;
      this.adapter.disposeMap(map);
    }
  }

  /** Updates internal state and notifies the host after an activation outcome. */
  private setActive(
    scene: ActivatableDemoScene<TMap, TStart, TView> | null,
  ): void {
    this.activeState = scene;
    this.adapter.onActiveSceneChange?.(scene);
  }
}
