import type { FlightPowerMode } from "../../../src/core/power-mode";
import type { ArcGISDisposableResource } from "./scene-resources";

export interface ActivatableDemoScene<TMap, TStart, TView = never> {
  map: TMap;
  title: string;
  start?: TStart;
  powerMode?: FlightPowerMode;
  itemId: string | null;
  viewConfiguration?: TView;
}

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

/** Owns demo map replacement, rollback, and disposal. */
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

  get activeScene(): ActivatableDemoScene<TMap, TStart, TView> | null {
    return this.activeState;
  }

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

  private disposeDetached(maps: readonly (TMap | null)[]): void {
    const currentMap = this.adapter.getCurrentMap();
    for (const map of new Set(maps)) {
      if (!map || map === currentMap || this.adapter.isDestroyed(map)) continue;
      this.adapter.disposeMap(map);
    }
  }

  private setActive(
    scene: ActivatableDemoScene<TMap, TStart, TView> | null,
  ): void {
    this.activeState = scene;
    this.adapter.onActiveSceneChange?.(scene);
  }
}
