import type SceneView from "@arcgis/core/views/SceneView.js";
import {
  flightHostForScene,
  flightHostForView,
  type FlightHost,
  type FlightSceneElement,
} from "../arcgis/flight-host";
import { getLocale as getArcgisLocale, onLocaleChange } from "@arcgis/core/intl.js";
import { assertFlightBrowserSupport } from "./browser-support";
import type { FlightViewMode } from "../core/camera-rig";
import {
  isFlightPowerMode,
  type FlightPowerMode,
} from "../core/power-mode";
import {
  mergePlaneNavigationConfig,
  normalizePlaneNavigationConfig,
  type PlaneNavigationConfig,
  type PlaneNavigationConfigInput,
  type PlaneNavigationUiPosition,
} from "../config";
import {
  FlightSession,
  type FlightSessionSnapshot,
} from "../controller";
import { initializeHostedFlightScene } from "../arcgis/hosted-flight-scene";
import {
  detectFlightFormatLocale,
  detectFlightLocale,
} from "../i18n";
import { FlightControlsOverlay } from "./flight-controls";
import {
  PLANE_NAVIGATION_OBSERVED_ATTRIBUTES,
  planeNavigationAttributePatch,
  planeNavigationConfigRequiresRestart,
} from "./plane-navigation-config";
import {
  resolveSceneReadyError,
  sceneReadyTransitionAction,
} from "./scene-ready-transition";

export const ARCGIS_PLANE_NAVIGATION_TAG = "arcgis-plane-navigation";

export type PlaneNavigationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "running"
  | "paused"
  | "error";

export interface PlaneNavigationReadyDetail {
  scene: FlightSceneElement | null;
  view: SceneView;
  snapshot: FlightSessionSnapshot;
}

export interface PlaneNavigationSnapshotDetail {
  snapshot: FlightSessionSnapshot;
}

export interface PlaneNavigationErrorDetail {
  error: Error;
}

export interface PlaneNavigationStoppedDetail {
  restoredCamera: boolean;
}

export type PlaneNavigationReadyEvent =
  CustomEvent<PlaneNavigationReadyDetail>;
export type PlaneNavigationSnapshotEvent =
  CustomEvent<PlaneNavigationSnapshotDetail>;
export type PlaneNavigationErrorEvent =
  CustomEvent<PlaneNavigationErrorDetail>;
export type PlaneNavigationStoppedEvent =
  CustomEvent<PlaneNavigationStoppedDetail>;

type InitializationCancellationKind = "superseded" | "stopped" | "disconnected";

class InitializationCancelledError extends Error {
  override readonly name = "AbortError";

  constructor(readonly kind: InitializationCancellationKind) {
    super(kind === "disconnected"
      ? "Plane navigation was disconnected before it could start."
      : kind === "stopped"
        ? "Plane navigation was stopped before it could start."
        : "Plane navigation initialization was superseded.");
  }
}

// The operation identity prevents a late load from attaching to a newer scene or session.
interface InitializationOperation {
  readonly controller: AbortController;
  promise: Promise<void>;
  restoreCamera: boolean;
}

interface SceneBinding {
  scene: FlightSceneElement;
  map: object | null;
  view: object | null;
  transitionPending: boolean;
}

function waitForInitialization<T>(
  step: PromiseLike<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(signal.reason);
    };
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    void Promise.resolve(step).then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) return;
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) return;
        reject(error);
      },
    );
  });
}

function assertFlightViewMode(mode: FlightViewMode): void {
  if (mode !== "chase" && mode !== "cockpit") {
    throw new TypeError(`Unsupported camera mode: ${String(mode)}.`);
  }
}

function assertFlightPowerMode(mode: FlightPowerMode): void {
  if (!isFlightPowerMode(mode)) {
    throw new TypeError(`Unsupported power mode: ${String(mode)}.`);
  }
}

function assertRuntimeConfigModes(patch: PlaneNavigationConfigInput): void {
  if (patch.camera?.mode !== undefined) {
    assertFlightViewMode(patch.camera.mode);
  }
  if (patch.powerMode !== undefined) {
    assertFlightPowerMode(patch.powerMode);
  }
}

export class ArcgisPlaneNavigationElement extends HTMLElement {
  static readonly observedAttributes = PLANE_NAVIGATION_OBSERVED_ATTRIBUTES;

  private explicitReference: FlightSceneElement | null = null;
  private explicitView: SceneView | null = null;
  private sessionHost: FlightHost | null = null;
  private configState = normalizePlaneNavigationConfig();
  private readonly attributeErrors = new Map<string, Error>();

  private session: FlightSession | null = null;
  private operation: InitializationOperation | null = null;
  private statusState: PlaneNavigationStatus = "idle";

  private controlsOverlay: FlightControlsOverlay | null = null;
  private controlsOverlayHost: FlightHost | null = null;
  private controlsOverlayPosition: PlaneNavigationUiPosition | null = null;
  private sceneBinding: SceneBinding | null = null;
  private localeChangeHandle: { remove(): void } | null = null;

  get status(): PlaneNavigationStatus {
    return this.statusState;
  }

  /** Assign an existing caller-owned 3D SceneView. */
  get view(): SceneView | null {
    return this.explicitView;
  }

  set view(value: SceneView | null) {
    if (value === this.explicitView) return;
    if (value !== null && value.type !== "3d") {
      throw new TypeError("Plane navigation view must be an ArcGIS SceneView (type 3d).");
    }
    this.explicitView = value;
    this.unbindSceneReadyChange();
    if (this.isConnected) this.beginInitialization();
  }

  get referenceElement(): FlightSceneElement | null {
    return this.explicitReference ?? this.resolveReferenceFromAttribute();
  }

  set referenceElement(value: FlightSceneElement | null) {
    const previous = this.referenceElement;
    this.explicitReference = value;
    if (this.referenceElement === previous || this.explicitView) return;
    this.unbindSceneReadyChange();
    if (this.isConnected) this.beginInitialization();
  }

  get config(): PlaneNavigationConfig {
    return normalizePlaneNavigationConfig(this.configState);
  }

  set config(value: PlaneNavigationConfigInput) {
    const patch = value ?? {};
    if (this.isConnected && this.session) {
      this.updateConfig(patch);
      return;
    }
    assertRuntimeConfigModes(patch);
    this.configState = mergePlaneNavigationConfig(this.configState, patch);
    if (this.isConnected) this.beginInitialization();
  }

  connectedCallback(): void {
    this.beginInitialization();
  }

  disconnectedCallback(): void {
    this.cancelOperation("disconnected", true);
    this.unbindSceneReadyChange();
    this.unbindLocaleChange();
    this.destroySession(true);
    this.setStatus("idle");
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (name === "reference-element") {
      if (this.explicitReference !== null || this.explicitView !== null) return;
      this.unbindSceneReadyChange();
      if (this.isConnected) this.beginInitialization();
      return;
    }

    try {
      const coordinateAttribute = name === "start-longitude"
        || name === "start-latitude";
      const patch = planeNavigationAttributePatch(
        this,
        name,
        this.configState,
      );
      const effective = mergePlaneNavigationConfig(
        this.configState,
        patch,
      );
      this.attributeErrors.delete(name);
      if (coordinateAttribute) {
        this.attributeErrors.delete("start-longitude");
        this.attributeErrors.delete("start-latitude");
      }
      if (!this.isConnected) {
        this.configState = effective;
        return;
      }
      if (!this.session) {
        this.configState = effective;
        this.beginInitialization();
        return;
      }
      this.updateConfig(effective);
    } catch (error) {
      this.attributeErrors.set(
        name,
        error instanceof Error ? error : new Error(String(error)),
      );
      if (this.isConnected) this.beginInitialization();
    }
  }

  async start(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Plane navigation must be connected before it can start.");
    }
    // Public start must reject directly even if automatic connection already reported the error.
    assertFlightBrowserSupport();
    for (;;) {
      const session = this.session;
      if (session) {
        const operation = this.operation;
        session.start();
        if (this.session === session) {
          this.setStatusFromSession(session);
          return;
        }
        const reason = operation?.controller.signal.reason;
        if (
          reason instanceof InitializationCancelledError
          && reason.kind === "superseded"
        ) continue;
        throw reason instanceof Error
          ? reason
          : new Error("Plane navigation was stopped before it could start.");
      }

      let operation = this.operation;
      if (!operation) {
        const target = this.resolveReferenceTarget();
        if (target instanceof Error) throw target;
        if (!target) {
          throw new Error(
            "Plane navigation requires view, referenceElement, or a reference-element attribute before it can start.",
          );
        }
        operation = this.beginInitialization();
      }
      if (!operation) continue;

      try {
        await operation.promise;
      } catch (error) {
        if (
          error instanceof InitializationCancelledError
          && error.kind === "superseded"
          && this.isConnected
        ) continue;
        throw error;
      }
    }
  }

  pause(): void {
    this.session?.pause();
    if (this.session?.phase === "paused") this.setStatus("paused");
  }

  resume(): void {
    this.session?.resume();
    if (this.session?.phase === "running") this.setStatus("running");
  }

  stop(options: { restoreCamera?: boolean } = {}): void {
    const restoreCamera = options.restoreCamera !== false;
    this.cancelOperation("stopped", restoreCamera);
    this.unbindSceneReadyChange();
    this.unbindLocaleChange();
    this.destroySession(restoreCamera);
    this.setStatus("idle");
    this.dispatchEvent(new CustomEvent<PlaneNavigationStoppedDetail>(
      "arcgisPlaneNavigationStopped",
      {
        detail: { restoredCamera: restoreCamera },
        bubbles: true,
        composed: true,
      },
    ));
  }

  recover(): void {
    this.session?.recover();
  }

  setCameraMode(mode: FlightViewMode, instant = false): void {
    assertFlightViewMode(mode);
    this.applyConfigUpdate(
      { camera: { mode } },
      { instantCamera: instant },
    );
  }

  setPowerMode(mode: FlightPowerMode): void {
    assertFlightPowerMode(mode);
    this.applyConfigUpdate({ powerMode: mode });
  }

  toggleTurbo(): boolean {
    const session = this.session;
    if (!session) {
      this.configState = mergePlaneNavigationConfig(this.configState, {
        powerMode: "normal",
      });
      return false;
    }

    session.toggleTurbo();
    if (this.session !== session) return false;
    this.configState = mergePlaneNavigationConfig(this.configState, {
      powerMode: session.powerMode,
    });
    return session.powerMode === "turbo";
  }

  updateConfig(patch: PlaneNavigationConfigInput): void {
    this.applyConfigUpdate(patch);
  }

  private applyConfigUpdate(
    patch: PlaneNavigationConfigInput,
    options: { instantCamera?: boolean } = {},
  ): void {
    assertRuntimeConfigModes(patch);
    const previous = this.configState;
    const next = mergePlaneNavigationConfig(previous, patch);
    const requiresRestart = planeNavigationConfigRequiresRestart(previous, next);
    if (!this.session || requiresRestart) {
      this.configState = next;
      if (this.isConnected) this.beginInitialization();
      return;
    }
    const session = this.session;
    const liveConfigChanged = previous.controls.sensitivity
        !== next.controls.sensitivity
      || previous.controls.invertPitch !== next.controls.invertPitch
      || previous.controls.keyboard !== next.controls.keyboard
      || previous.controls.gamepad !== next.controls.gamepad
      || previous.camera.fovDeg !== next.camera.fovDeg
      || previous.camera.mode !== next.camera.mode
      || previous.camera.bankedViewport !== next.camera.bankedViewport
      || previous.powerMode !== next.powerMode;
    if (liveConfigChanged || options.instantCamera) {
      session.applyLiveConfig(next, options);
    }
    this.configState = next;
    const snapshot = session.snapshot();
    const snapshotChanged = previous.camera.mode !== next.camera.mode
      || previous.powerMode !== next.powerMode
      || options.instantCamera === true;
    const host = this.sessionHost;
    if (snapshotChanged && host) {
      this.publishSessionSnapshot(
        host,
        session,
        snapshot,
      );
      return;
    }
    this.syncControlsUi(host, next, snapshot);
  }

  setControlPatch(
    patch: Parameters<FlightSession["setControlPatch"]>[0],
  ): void {
    this.session?.setControlPatch(patch);
  }

  clearControlPatch(
    fields?: Parameters<FlightSession["clearControlPatch"]>[0],
  ): void {
    this.session?.clearControlPatch(fields);
  }

  snapshot(): FlightSessionSnapshot | null {
    return this.session?.snapshot() ?? null;
  }

  debugSnapshot(): ReturnType<FlightSession["debugSnapshot"]> | null {
    return this.session?.debugSnapshot() ?? null;
  }

  private beginInitialization(
    restoreCamera = true,
  ): InitializationOperation | null {
    this.bindLocaleChange();
    this.cancelOperation("superseded", restoreCamera);
    this.destroySession(restoreCamera);

    const target = this.resolveReferenceTarget();
    if (!target && this.attributeErrors.size === 0) {
      this.setStatus("idle");
      return null;
    }

    // Fail before starting work that needs these built-ins.
    try {
      assertFlightBrowserSupport();
    } catch (error) {
      this.reportError(error);
      return null;
    }

    const operation: InitializationOperation = {
      controller: new AbortController(),
      promise: Promise.resolve(),
      restoreCamera,
    };
    this.operation = operation;
    this.setStatus("loading");
    operation.promise = this.initializeOperation(operation, target);
    void operation.promise.catch(() => undefined);
    return operation;
  }

  private async initializeOperation(
    operation: InitializationOperation,
    target: FlightSceneElement | SceneView | Error | null,
  ): Promise<void> {
    try {
      const attributeError = this.attributeErrors.values().next().value;
      if (attributeError) throw attributeError;
      if (target instanceof Error) throw target;
      if (!target) return;
      const host = "tagName" in target
        ? flightHostForScene(target)
        : flightHostForView(target);
      const scene = host.scene;
      const signal = operation.controller.signal;

      if (scene) {
        await waitForInitialization(customElements.whenDefined("arcgis-scene"), signal);
      }
      await waitForInitialization(host.whenReady(), signal);
      this.assertCurrentOperation(operation);
      if (scene) this.bindSceneReadyChange(scene);

      const config = normalizePlaneNavigationConfig(this.configState);
      this.configState = config;
      const hosted = await waitForInitialization(
        initializeHostedFlightScene(
          host,
          config,
          {
            signal,
            restoreCameraOnAbort: () => operation.restoreCamera,
          },
        ),
        signal,
      );
      this.assertCurrentOperation(operation);

      let session: FlightSession;
      try {
        session = new FlightSession({
          scene: hosted,
          config,
          onSnapshot: (snapshot) => {
            this.publishSessionSnapshot(host, session, snapshot);
          },
        });
      } catch (error) {
        hosted.destroy();
        throw error;
      }

      this.assertCurrentOperation(operation);
      this.session = session;
      this.sessionHost = host;
      session.initialize();
      if (!this.publishSessionSnapshot(
        host,
        session,
        session.snapshot(),
      )) throw this.operationError(operation);
      if (config.autoStart && session.phase === "ready") {
        session.start();
        if (!this.ownsSession(operation, session)) {
          throw this.operationError(operation);
        }
      }
      this.setStatusFromSession(session);
      const snapshot = session.snapshot();
      this.syncControlsUi(host, this.configState, snapshot);
      this.dispatchEvent(new CustomEvent<PlaneNavigationReadyDetail>(
        "arcgisPlaneNavigationReady",
        {
          detail: { scene, view: host.view, snapshot },
          bubbles: true,
          composed: true,
        },
      ));
    } catch (error) {
      if (this.operation !== operation) throw this.operationError(operation, error);
      this.destroySession(true);
      throw this.reportError(error);
    }
  }

  private bindLocaleChange(): void {
    if (this.localeChangeHandle) return;
    this.localeChangeHandle = onLocaleChange(() => {
      if (this.configState.ui.locale !== "auto") return;
      this.syncControlsUi(
        this.sessionHost,
        this.configState,
        this.snapshot(),
      );
    });
  }

  private unbindLocaleChange(): void {
    this.localeChangeHandle?.remove();
    this.localeChangeHandle = null;
  }

  private bindSceneReadyChange(scene: FlightSceneElement): void {
    if (this.sceneBinding?.scene !== scene) {
      this.unbindSceneReadyChange();
      scene.addEventListener("arcgisViewReadyChange", this.onSceneReadyChange);
      scene.addEventListener("arcgisViewReadyError", this.onSceneReadyError);
    }
    this.sceneBinding = {
      scene,
      map: scene.map ?? null,
      view: scene.view ?? null,
      transitionPending: false,
    };
  }

  private unbindSceneReadyChange(): void {
    this.sceneBinding?.scene.removeEventListener(
      "arcgisViewReadyChange",
      this.onSceneReadyChange,
    );
    this.sceneBinding?.scene.removeEventListener(
      "arcgisViewReadyError",
      this.onSceneReadyError,
    );
    this.sceneBinding = null;
  }

  private readonly onSceneReadyChange = (): void => {
    const binding = this.sceneBinding;
    if (!binding || !this.isConnected) return;
    const { scene } = binding;
    const map = scene.map ?? null;
    const view = scene.view ?? null;
    const identityChanged =
      map !== binding.map || view !== binding.view;
    const action = sceneReadyTransitionAction({
      ready: scene.ready,
      transitionPending: binding.transitionPending,
      identityChanged,
    });
    if (action === "teardown") {
      binding.transitionPending = true;
      this.cancelOperation("superseded", !identityChanged);
      this.destroySession(!identityChanged);
      this.setStatus("loading");
      return;
    }
    if (action === "ignore") return;
    binding.transitionPending = false;
    binding.map = map;
    binding.view = view;
    if (this.statusState === "loading" && this.operation) return;
    this.beginInitialization(false);
  };

  private readonly onSceneReadyError = (): void => {
    const binding = this.sceneBinding;
    if (!binding || !this.isConnected) return;
    const { scene } = binding;
    const error = resolveSceneReadyError(scene.fatalError);
    const operation = this.operation;
    if (operation) {
      this.operation = null;
      if (!operation.controller.signal.aborted) {
        operation.controller.abort(error);
      }
    }
    const identityChanged = (scene.map ?? null) !== binding.map
      || (scene.view ?? null) !== binding.view;
    binding.transitionPending = true;
    this.destroySession(!identityChanged);
    this.reportError(error);
  };

  private reportError(error: unknown): Error {
    const resolved = error instanceof Error ? error : new Error(String(error));
    this.setStatus("error");
    this.dispatchEvent(new CustomEvent<PlaneNavigationErrorDetail>(
      "arcgisPlaneNavigationError",
      { detail: { error: resolved }, bubbles: true, composed: true },
    ));
    return resolved;
  }

  private destroySession(restoreCamera: boolean): void {
    this.unmountControlsUi();
    const session = this.session;
    this.session = null;
    this.sessionHost = null;
    session?.destroy({ restoreCamera });
  }

  private ownsSession(
    operation: InitializationOperation,
    session: FlightSession,
  ): boolean {
    return this.isConnected
      && this.operation === operation
      && this.session === session;
  }

  private cancelOperation(
    reason: InitializationCancellationKind,
    restoreCamera: boolean,
  ): void {
    const operation = this.operation;
    if (!operation) return;
    this.operation = null;
    operation.restoreCamera = restoreCamera;
    if (!operation.controller.signal.aborted) {
      operation.controller.abort(new InitializationCancelledError(reason));
    }
  }

  private assertCurrentOperation(operation: InitializationOperation): void {
    if (!this.isConnected || this.operation !== operation) {
      throw this.operationError(operation);
    }
  }

  private operationError(
    operation: InitializationOperation,
    fallback?: unknown,
  ): Error {
    const reason = operation.controller.signal.reason;
    if (reason instanceof Error) return reason;
    if (fallback instanceof Error) return fallback;
    return new InitializationCancelledError("superseded");
  }

  private setStatusFromSession(session: FlightSession): void {
    if (session.phase === "running") this.setStatus("running");
    else if (session.phase === "paused") this.setStatus("paused");
    else this.setStatus("ready");
  }

  private publishSessionSnapshot(
    host: FlightHost,
    session: FlightSession,
    snapshot: FlightSessionSnapshot,
  ): boolean {
    if (!this.isConnected || this.session !== session) return false;
    if (snapshot.phase === "running") this.setStatus("running");
    else if (snapshot.phase === "paused") this.setStatus("paused");
    this.syncControlsUi(host, this.configState, snapshot);
    this.dispatchEvent(new CustomEvent<PlaneNavigationSnapshotDetail>(
      "arcgisPlaneNavigationSnapshot",
      {
        detail: { snapshot },
        bubbles: true,
        composed: true,
      },
    ));
    return this.isConnected && this.session === session;
  }

  private syncControlsUi(
    host: FlightHost | null,
    config: PlaneNavigationConfig,
    snapshot: FlightSessionSnapshot | null,
  ): void {
    if (!host || !config.ui.enabled) {
      this.unmountControlsUi();
      return;
    }

    const view = this.ownerDocument.defaultView;
    const configuredLocale = this.getAttribute("locale") ?? config.ui.locale;
    const arcgisLocale = getArcgisLocale();
    const localeOptions = {
      locale: configuredLocale === "auto" ? arcgisLocale : configuredLocale,
      documentLanguage: this.closest("[lang]")?.getAttribute("lang")
        ?? this.ownerDocument.documentElement.lang,
      navigatorLanguages: view?.navigator.languages ?? [],
      navigatorLanguage: view?.navigator.language ?? null,
      intlLocale: arcgisLocale,
    };
    const locale = detectFlightLocale(localeOptions);
    const formatLocale = detectFlightFormatLocale(localeOptions);
    if (!this.controlsOverlay) {
      this.controlsOverlay = new FlightControlsOverlay(
        this.ownerDocument,
        config.ui,
        locale,
        formatLocale,
        {
          setPowerMode: (mode) => this.setPowerMode(mode),
          togglePause: () => {
            if (this.session?.phase === "paused") this.resume();
            else if (this.session?.phase === "ready") void this.start();
            else this.pause();
          },
          setCameraMode: (mode) => this.setCameraMode(mode),
          recover: () => this.recover(),
        },
      );
    }

    const placementChanged = this.controlsOverlayHost !== host
      || this.controlsOverlayPosition !== config.ui.position;
    if (placementChanged && this.controlsOverlayHost) {
      this.controlsOverlayHost.unmountControls(this.controlsOverlay.element);
      this.controlsOverlayHost = null;
      this.controlsOverlayPosition = null;
    }
    this.controlsOverlay.update(config.ui, locale, formatLocale, snapshot);
    if (!this.controlsOverlayHost) {
      host.mountControls(this.controlsOverlay.element, config.ui.position);
      this.controlsOverlayHost = host;
      this.controlsOverlayPosition = config.ui.position;
    }
  }

  private unmountControlsUi(): void {
    const overlay = this.controlsOverlay;
    if (!overlay) return;
    this.controlsOverlayHost?.unmountControls(overlay.element);
    overlay.destroy();
    this.controlsOverlay = null;
    this.controlsOverlayHost = null;
    this.controlsOverlayPosition = null;
  }

  private setStatus(status: PlaneNavigationStatus): void {
    this.statusState = status;
    this.setAttribute("status", status);
  }

  private resolveReferenceFromAttribute(): FlightSceneElement | null {
    const id = this.getAttribute("reference-element")?.trim();
    if (!id) return null;
    const candidate = this.ownerDocument.getElementById(id);
    return candidate?.tagName.toLowerCase() === "arcgis-scene"
      ? candidate as FlightSceneElement
      : null;
  }

  private resolveReferenceTarget(): FlightSceneElement | SceneView | Error | null {
    if (this.explicitView) return this.explicitView;
    if (this.explicitReference) {
      return this.explicitReference.tagName?.toLowerCase() === "arcgis-scene"
        ? this.explicitReference
        : new Error("referenceElement must be an <arcgis-scene> element.");
    }

    const rawId = this.getAttribute("reference-element");
    if (rawId === null) return null;
    const id = rawId.trim();
    if (!id) {
      return new Error(
        "reference-element must contain the id of an <arcgis-scene> element.",
      );
    }
    const candidate = this.ownerDocument.getElementById(id);
    if (!candidate) {
      return new Error(
        `reference-element="${id}" did not match an element in this document.`,
      );
    }
    if (candidate.tagName.toLowerCase() !== "arcgis-scene") {
      return new Error(
        `reference-element="${id}" must reference an <arcgis-scene>; found <${candidate.tagName.toLowerCase()}>.`,
      );
    }
    return candidate as FlightSceneElement;
  }

}

if (!customElements.get(ARCGIS_PLANE_NAVIGATION_TAG)) {
  customElements.define(
    ARCGIS_PLANE_NAVIGATION_TAG,
    ArcgisPlaneNavigationElement,
  );
}

declare global {
  interface HTMLElementTagNameMap {
    "arcgis-plane-navigation": ArcgisPlaneNavigationElement;
  }

  interface HTMLElementEventMap {
    arcgisPlaneNavigationReady: PlaneNavigationReadyEvent;
    arcgisPlaneNavigationSnapshot: PlaneNavigationSnapshotEvent;
    arcgisPlaneNavigationError: PlaneNavigationErrorEvent;
    arcgisPlaneNavigationStopped: PlaneNavigationStoppedEvent;
  }
}
