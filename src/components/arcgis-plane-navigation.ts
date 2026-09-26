/**
 * Public `<arcgis-plane-navigation>` custom element and its session lifecycle.
 *
 * This element validates declarative/programmatic configuration, waits for a
 * caller-owned ArcGIS scene or SceneView, coordinates cancellable initialization,
 * and exposes flight controls/events. Importing this module registers the custom
 * element once. It never creates or destroys the host view; the caller owns it.
 */
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
import { FlightJoystickOverlay } from "./flight-joystick";
import {
  PLANE_NAVIGATION_OBSERVED_ATTRIBUTES,
  planeNavigationAttributePatch,
  planeNavigationConfigRequiresRestart,
} from "./plane-navigation-config";
import {
  resolveSceneReadyError,
  sceneReadyTransitionAction,
} from "./scene-ready-transition";

/** Custom-element tag registered by this module. */
export const ARCGIS_PLANE_NAVIGATION_TAG = "arcgis-plane-navigation";

/** Lifecycle states reflected by the element's `status` property/attribute. */
export type PlaneNavigationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "running"
  | "paused"
  | "error";

/** Detail of `arcgisPlaneNavigationReady` after the host and session initialize. */
export interface PlaneNavigationReadyDetail {
  /** Referenced scene element, or null for a directly assigned SceneView. */
  scene: FlightSceneElement | null;
  /** Caller-owned view used by the flight session. */
  view: SceneView;
  /** Session state captured when readiness is reported. */
  snapshot: FlightSessionSnapshot;
}

/** Detail emitted when the session publishes a new flight snapshot. */
export interface PlaneNavigationSnapshotDetail {
  snapshot: FlightSessionSnapshot;
}

/** Error from startup, invalid configuration or an active scene failure. */
export interface PlaneNavigationErrorDetail {
  error: Error;
}

/** Detail of `arcgisPlaneNavigationStopped` after session teardown. */
export interface PlaneNavigationStoppedDetail {
  restoredCamera: boolean;
}

/** Typed custom event aliases emitted by the plane-navigation element. */
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

  /** Preserve why the pending operation was cancelled for the public start promise. */
  constructor(readonly kind: InitializationCancellationKind) {
    super(kind === "disconnected"
      ? "Plane navigation was disconnected before it could start."
      : kind === "stopped"
        ? "Plane navigation was stopped before it could start."
        : "Plane navigation initialization was superseded.");
  }
}

/** Identity token and abort state for one asynchronous scene initialization attempt. */
interface InitializationOperation {
  readonly controller: AbortController;
  promise: Promise<void>;
  restoreCamera: boolean;
}

/** Current identity/readiness state for scene-element lifecycle event handling. */
interface SceneBinding {
  scene: FlightSceneElement;
  map: object | null;
  view: object | null;
  transitionPending: boolean;
}

/**
 * Race an SDK readiness/load promise against cancellation without leaving an abort listener.
 *
 * @param step Readiness or initialization work that may not resolve promptly.
 * @param signal Operation signal whose reason rejects the wait immediately.
 * @returns The step result if it completes before cancellation.
 */
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

/** Validate a programmatic camera mode before mutating component state. */
function assertFlightViewMode(mode: FlightViewMode): void {
  if (mode !== "chase" && mode !== "cockpit") {
    throw new TypeError(`Unsupported camera mode: ${String(mode)}.`);
  }
}

/** Validate a programmatic power mode before mutating component state. */
function assertFlightPowerMode(mode: FlightPowerMode): void {
  if (!isFlightPowerMode(mode)) {
    throw new TypeError(`Unsupported power mode: ${String(mode)}.`);
  }
}

/** Validate runtime mode fields in a partial config without validating unrelated fields. */
function assertRuntimeConfigModes(patch: PlaneNavigationConfigInput): void {
  if (patch.camera?.mode !== undefined) {
    assertFlightViewMode(patch.camera.mode);
  }
  if (patch.powerMode !== undefined) {
    assertFlightPowerMode(patch.powerMode);
  }
}

/**
 * Connect a caller-owned 3D ArcGIS view to the flight controller.
 *
 * The custom element owns its controls and flight session, not the ArcGIS map or
 * view. It can attach to either a scene element or a directly assigned SceneView,
 * emits lifecycle/snapshot/error events, and tears down borrowed state on stop or
 * disconnection.
 */
export class ArcgisPlaneNavigationElement extends HTMLElement {
  /** Declarative attributes parsed and watched by the custom element. */
  static readonly observedAttributes = PLANE_NAVIGATION_OBSERVED_ATTRIBUTES;

  private explicitReference: FlightSceneElement | null = null;
  private explicitView: SceneView | null = null;
  private sessionHost: FlightHost | null = null;
  private configState = normalizePlaneNavigationConfig();
  private readonly attributeErrors = new Map<string, Error>();

  private session: FlightSession | null = null;
  private aircraftRequest = 0;
  private operation: InitializationOperation | null = null;
  private statusState: PlaneNavigationStatus = "idle";

  private controlsOverlay: FlightControlsOverlay | null = null;
  private controlsOverlayHost: FlightHost | null = null;
  private controlsOverlayPosition: PlaneNavigationUiPosition | null = null;
  private joystickOverlay: FlightJoystickOverlay | null = null;
  private joystickHost: FlightHost | null = null;
  private joystickPosition: PlaneNavigationUiPosition | null = null;
  private touchMedia: MediaQueryList | null = null;
  /** Keep automatic joystick visibility in sync with coarse-pointer media changes. */
  private readonly onTouchMediaChange = (): void => {
    this.syncControlsUi(this.sessionHost, this.configState, this.snapshot());
  };
  private sceneBinding: SceneBinding | null = null;
  private localeChangeHandle: { remove(): void } | null = null;

  /** Current initialization/session phase; also mirrored to the `status` attribute. */
  get status(): PlaneNavigationStatus {
    return this.statusState;
  }

  /** Caller-owned 3D SceneView assigned for direct-view integration, if any. */
  get view(): SceneView | null {
    return this.explicitView;
  }

  /**
   * Assign a caller-owned 3D SceneView, taking precedence over scene references.
   * Replaces the active flight session when connected; the view itself is retained.
   * @throws {TypeError} If a non-3D view is supplied.
   */
  set view(value: SceneView | null) {
    if (value === this.explicitView) return;
    if (value !== null && value.type !== "3d") {
      throw new TypeError("Plane navigation view must be an ArcGIS SceneView (type 3d).");
    }
    this.explicitView = value;
    this.unbindSceneReadyChange();
    if (this.isConnected) this.beginInitialization();
  }

  /** Scene element reference selected explicitly or resolved from `reference-element`. */
  get referenceElement(): FlightSceneElement | null {
    return this.explicitReference ?? this.resolveReferenceFromAttribute();
  }

  /**
   * Assign a caller-owned scene element. An explicit reference takes precedence
   * over `reference-element`, and a direct `view` takes precedence over both.
   */
  set referenceElement(value: FlightSceneElement | null) {
    const previous = this.referenceElement;
    this.explicitReference = value;
    if (this.referenceElement === previous || this.explicitView) return;
    this.unbindSceneReadyChange();
    if (this.isConnected) this.beginInitialization();
  }

  /** Return a normalized copy of the effective configuration. */
  get config(): PlaneNavigationConfig {
    return normalizePlaneNavigationConfig(this.configState);
  }

  /**
   * Merge programmatic settings into the current configuration.
   *
   * While running, restart-required fields reinitialize the hosted session;
   * live presentation/control values are applied without replacing it.
   */
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

  /** Attach listeners and begin initialization when the custom element enters the document. */
  connectedCallback(): void {
    this.touchMedia = this.ownerDocument.defaultView?.matchMedia("(any-pointer: coarse)") ?? null;
    this.touchMedia?.addEventListener("change", this.onTouchMediaChange);
    this.beginInitialization();
  }

  /** Cancel pending initialization and release overlays/session resources on removal. */
  disconnectedCallback(): void {
    this.touchMedia?.removeEventListener("change", this.onTouchMediaChange);
    this.touchMedia = null;
    this.cancelOperation("disconnected", true);
    this.unbindSceneReadyChange();
    this.unbindLocaleChange();
    this.destroySession(true);
    this.setStatus("idle");
  }

  /**
   * Parse an observed attribute and apply its patch live or restart as needed.
   * Malformed attributes are retained as startup errors so the element can
   * recover when their values change.
   */
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

  /**
   * Start or await the current initialization, then start the active flight session.
   *
   * Superseded initialization is followed until the newest scene/config is ready;
   * explicit stop, disconnect, and real startup errors reject the returned promise.
   *
   * @returns A promise that resolves once the current session has started.
   */
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

  /** Pause the current flight session and reflect the paused state. */
  pause(): void {
    this.session?.pause();
    if (this.session?.phase === "paused") this.setStatus("paused");
  }

  /** Resume the current session when it is paused. */
  resume(): void {
    this.session?.resume();
    if (this.session?.phase === "running") this.setStatus("running");
  }

  /**
   * Stop initialization or the active flight and dispatch a stopped event.
   *
   * @param options Set `restoreCamera` false to leave the latest submitted camera attached.
   */
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

  /** Ask the active session to recover its aircraft state, if one exists. */
  recover(): void {
    this.session?.recover();
  }

  /**
   * Switch between chase and cockpit views, applying it live when possible.
   * @param mode Supported target camera mode.
   * @param instant Skip the session's camera transition when true.
   * @throws {TypeError} If the mode is unsupported.
   */
  setCameraMode(mode: FlightViewMode, instant = false): void {
    assertFlightViewMode(mode);
    this.applyConfigUpdate(
      { camera: { mode } },
      { instantCamera: instant },
    );
  }

  /** Apply a supported power mode and synchronize configuration and UI state. */
  setPowerMode(mode: FlightPowerMode): void {
    assertFlightPowerMode(mode);
    this.applyConfigUpdate({ powerMode: mode });
  }

  /** Toggle turbo and return whether it is active; return false without a session. */
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

  /** Merge a partial configuration, restarting only for session-captured settings. */
  updateConfig(patch: PlaneNavigationConfigInput): void {
    this.applyConfigUpdate(patch);
  }

  /**
   * Select/load aircraft assets and flight tuning without recreating the scene.
   *
   * Requests are sequenced so a slower stale load cannot replace a later choice.
   *
   * @param patch Aircraft, assets and terrain fields to merge into the config.
   * @returns Whether the requested aircraft became active in the current session.
   */
  async setAircraft(
    patch: Pick<PlaneNavigationConfigInput, "flight" | "assets" | "terrain">,
  ): Promise<boolean> {
    assertRuntimeConfigModes(patch);
    const previous = this.configState;
    let next = normalizePlaneNavigationConfig(
      mergePlaneNavigationConfig(previous, patch),
    );
    const session = this.session;
    if (!session) {
      this.configState = next;
      if (this.isConnected) this.beginInitialization();
      return false;
    }

    const aircraftTypeChanged = previous.flight?.model !== next.flight?.model;
    if (aircraftTypeChanged && next.powerMode !== "normal") {
      next = mergePlaneNavigationConfig(next, { powerMode: "normal" });
    }
    const request = ++this.aircraftRequest;
    this.setStatus("loading");
    try {
      const changed = await session.setAircraft(next);
      if (
        !changed
        || request !== this.aircraftRequest
        || this.session !== session
      ) return false;
      this.configState = next;
      const snapshot = session.snapshot();
      const host = this.sessionHost;
      if (host) {
        this.publishSessionSnapshot(host, session, snapshot);
        this.syncControlsUi(host, next, snapshot);
      }
      this.setStatusFromSession(session);
      return true;
    } catch (error) {
      if (request === this.aircraftRequest && this.session === session) {
        this.setStatusFromSession(session);
      }
      throw error;
    }
  }

  /** Apply a patch live where possible, otherwise store it and restart initialization. */
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

  /** Set temporary control axes/buttons on the active session, if present. */
  setControlPatch(
    patch: Parameters<FlightSession["setControlPatch"]>[0],
  ): void {
    this.session?.setControlPatch(patch);
  }

  /** Clear temporary control overrides on the active session, optionally by field. */
  clearControlPatch(
    fields?: Parameters<FlightSession["clearControlPatch"]>[0],
  ): void {
    this.session?.clearControlPatch(fields);
  }

  /** Return the current flight snapshot, or `null` before a session exists. */
  snapshot(): FlightSessionSnapshot | null {
    return this.session?.snapshot() ?? null;
  }

  /** Return controller/host diagnostics, or `null` before a session exists. */
  debugSnapshot(): ReturnType<FlightSession["debugSnapshot"]> | null {
    return this.session?.debugSnapshot() ?? null;
  }

  /** Cancel any prior attempt and create an operation for the currently selected host/config. */
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

  /** Resolve the host, initialize its scene, create the session and emit the ready event. */
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

  /** Subscribe to ArcGIS locale changes while automatic UI localization is active. */
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

  /** Remove the global ArcGIS locale subscription. */
  private unbindLocaleChange(): void {
    this.localeChangeHandle?.remove();
    this.localeChangeHandle = null;
  }

  /** Track map/view identity and readiness events for an ArcGIS scene element. */
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

  /** Detach readiness/error listeners and clear the active scene binding. */
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

  /** Teardown or restart when the referenced scene's ready state or identity changes. */
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

  /** Convert an ArcGIS fatal scene error, cancel pending work and publish the failure. */
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

  /** Set error status and emit the public error event using a normalized Error. */
  private reportError(error: unknown): Error {
    const resolved = error instanceof Error ? error : new Error(String(error));
    this.setStatus("error");
    this.dispatchEvent(new CustomEvent<PlaneNavigationErrorDetail>(
      "arcgisPlaneNavigationError",
      { detail: { error: resolved }, bubbles: true, composed: true },
    ));
    return resolved;
  }

  /** Unmount overlays before destroying the session that owns their host UI. */
  private destroySession(restoreCamera: boolean): void {
    this.unmountJoystick();
    this.unmountControlsUi();
    const session = this.session;
    this.session = null;
    this.sessionHost = null;
    session?.destroy({ restoreCamera });
  }

  /** Check that an async initialization still owns the active element/session pair. */
  private ownsSession(
    operation: InitializationOperation,
    session: FlightSession,
  ): boolean {
    return this.isConnected
      && this.operation === operation
      && this.session === session;
  }

  /** Invalidate and abort the current initialization with its specific cancellation reason. */
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

  /** Throw when the operation completed after disconnect or was replaced by a newer one. */
  private assertCurrentOperation(operation: InitializationOperation): void {
    if (!this.isConnected || this.operation !== operation) {
      throw this.operationError(operation);
    }
  }

  /** Select the original abort/error reason to reject a stale initialization with. */
  private operationError(
    operation: InitializationOperation,
    fallback?: unknown,
  ): Error {
    const reason = operation.controller.signal.reason;
    if (reason instanceof Error) return reason;
    if (fallback instanceof Error) return fallback;
    return new InitializationCancelledError("superseded");
  }

  /** Mirror the active session phase into the custom-element status. */
  private setStatusFromSession(session: FlightSession): void {
    if (session.phase === "running") this.setStatus("running");
    else if (session.phase === "paused") this.setStatus("paused");
    else this.setStatus("ready");
  }

  /** Update status/UI and dispatch a snapshot only while this session remains current. */
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

  /** Mount/update toolbar and joystick overlays according to config, locale, host and phase. */
  private syncControlsUi(
    host: FlightHost | null,
    config: PlaneNavigationConfig,
    snapshot: FlightSessionSnapshot | null,
  ): void {
    const showJoystick = config.ui.joystick === "always"
      || (config.ui.joystick === "auto" && this.touchMedia?.matches === true);
    if (!host || (!config.ui.enabled && !showJoystick)) {
      this.unmountJoystick();
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
    if (showJoystick) {
      this.joystickOverlay ??= new FlightJoystickOverlay(this.ownerDocument,
        (bank, pitch) => this.session?.setTouchStick(bank, pitch));
      if (this.joystickHost !== host || this.joystickPosition !== config.ui.joystickPosition) {
        // Moving the control during a drag must release its previous input first.
        this.joystickOverlay.reset();
        this.joystickHost?.unmountControls(this.joystickOverlay.element);
        host.mountControls(this.joystickOverlay.element, config.ui.joystickPosition);
        this.joystickHost = host;
        this.joystickPosition = config.ui.joystickPosition;
      }
      this.joystickOverlay.update(snapshot?.phase === "running", locale);
    } else this.unmountJoystick();

    if (!config.ui.enabled) {
      this.unmountControlsUi();
      return;
    }
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

  /** Detach and destroy the toolbar overlay. */
  private unmountControlsUi(): void {
    const overlay = this.controlsOverlay;
    if (!overlay) return;
    this.controlsOverlayHost?.unmountControls(overlay.element);
    overlay.destroy();
    this.controlsOverlay = null;
    this.controlsOverlayHost = null;
    this.controlsOverlayPosition = null;
  }

  /** Detach and destroy the touch joystick overlay. */
  private unmountJoystick(): void {
    if (!this.joystickOverlay) return;
    this.joystickHost?.unmountControls(this.joystickOverlay.element);
    this.joystickOverlay.destroy();
    this.joystickOverlay = null;
    this.joystickHost = null;
    this.joystickPosition = null;
  }

  /** Update both internal status state and its observable DOM attribute. */
  private setStatus(status: PlaneNavigationStatus): void {
    this.statusState = status;
    this.setAttribute("status", status);
  }

  /** Resolve a scene custom element by the declarative `reference-element` ID if present. */
  private resolveReferenceFromAttribute(): FlightSceneElement | null {
    const id = this.getAttribute("reference-element")?.trim();
    if (!id) return null;
    const candidate = this.ownerDocument.getElementById(id);
    return candidate?.tagName.toLowerCase() === "arcgis-scene"
      ? candidate as FlightSceneElement
      : null;
  }

  /**
   * Resolve explicit view/scene references or validate the declarative element ID.
   *
   * Returning an Error keeps invalid references distinct from the absence of a target.
   */
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
