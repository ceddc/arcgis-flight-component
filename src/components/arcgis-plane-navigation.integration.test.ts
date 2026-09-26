/**
 * Safeguard the public custom element with ArcGIS-shaped scene and view doubles.
 * These cases cover async startup/cancellation, config updates, scene replacement,
 * error recovery, overlay ownership, and direct caller-owned SceneView use.
 * The suite exercises those contracts without contacting ArcGIS services.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type SceneView from "@arcgis/core/views/SceneView.js";
import type { FlightViewMode } from "../core/camera-rig";
import type { FlightPowerMode } from "../core/power-mode";

const harness = vi.hoisted(() => ({
  initializeHostedFlightScene: vi.fn(),
  localeSubscribe: vi.fn(),
  localeRemove: vi.fn(),
  joysticks: [] as Array<{
    element: { remove: ReturnType<typeof vi.fn>; removeAttribute: ReturnType<typeof vi.fn> };
    update: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }>,
  overlays: [] as Array<{
    element: { remove: ReturnType<typeof vi.fn>; removeAttribute: ReturnType<typeof vi.fn> };
    update: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }>,
  constructorError: null as Error | null,
  initializeError: null as Error | null,
  sessions: [] as Array<{
    phase: string;
    cameraMode: string;
    powerMode: string;
    initialize: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof vi.fn>;
    applyLiveConfig: ReturnType<typeof vi.fn>;
    setCameraMode: ReturnType<typeof vi.fn>;
    setPowerMode: ReturnType<typeof vi.fn>;
    toggleTurbo: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("@arcgis/map-components/components/arcgis-scene", () => ({}));
vi.mock("@arcgis/core/intl.js", () => ({
  getLocale: () => "en",
  onLocaleChange: () => {
    harness.localeSubscribe();
    return { remove: harness.localeRemove };
  },
}));
vi.mock("../arcgis/hosted-flight-scene", () => ({
  initializeHostedFlightScene: harness.initializeHostedFlightScene,
}));
vi.mock("../controller", () => ({
  FlightSession: class MockFlightSession {
    phase = "ready";
    cameraMode = "chase";
    powerMode = "normal";
    initialize = vi.fn(() => {
      if (harness.initializeError) throw harness.initializeError;
    });
    start = vi.fn(() => {
      this.phase = "running";
      this.onSnapshot?.({ phase: this.phase });
    });
    pause = vi.fn(() => {
      this.phase = "paused";
      this.onSnapshot?.({ phase: this.phase });
    });
    destroy = vi.fn((options?: { restoreCamera?: boolean }) => {
      this.scene.destroy(options);
    });
    snapshot = vi.fn(() => ({ phase: this.phase }));
    applyLiveConfig = vi.fn((config: {
      camera: { mode: string };
      powerMode: string;
    }) => {
      this.cameraMode = config.camera.mode;
      this.powerMode = config.powerMode;
    });
    setCameraMode = vi.fn((mode: string) => {
      this.cameraMode = mode;
      this.onSnapshot?.({ phase: this.phase });
    });
    setPowerMode = vi.fn((mode: string) => {
      this.powerMode = mode;
      this.onSnapshot?.({ phase: this.phase });
    });
    toggleTurbo = vi.fn(() => {
      this.powerMode = this.powerMode === "turbo" ? "normal" : "turbo";
      this.onSnapshot?.({ phase: this.phase });
      return this.powerMode === "turbo";
    });
    private readonly scene: { destroy(options?: { restoreCamera?: boolean }): void };
    private readonly onSnapshot?: (snapshot: { phase: string }) => void;

    constructor(options: {
      scene: { destroy(options?: { restoreCamera?: boolean }): void };
      config: { camera: { mode: string }; powerMode: string };
      onSnapshot?: (snapshot: { phase: string }) => void;
    }) {
      this.scene = options.scene;
      this.cameraMode = options.config.camera.mode;
      this.powerMode = options.config.powerMode;
      this.onSnapshot = options.onSnapshot;
      if (harness.constructorError) throw harness.constructorError;
      harness.sessions.push(this);
    }
  },
}));
vi.mock("./flight-controls", () => ({
  FlightControlsOverlay: class MockFlightControlsOverlay {
    element = { remove: vi.fn(), removeAttribute: vi.fn() };
    update = vi.fn();
    destroy = vi.fn();
    constructor() { harness.overlays.push(this); }
  },
}));
vi.mock("./flight-joystick", () => ({
  FlightJoystickOverlay: class {
    element = { remove: vi.fn(), removeAttribute: vi.fn() };
    update = vi.fn();
    reset = vi.fn();
    destroy = vi.fn();
    constructor() { harness.joysticks.push(this); }
  },
}));

class FakeHTMLElement extends EventTarget {
  private readonly attributes = new Map<string, string>();
  private connected = false;
  private referenceTarget: Element | null = null;
  readonly ownerDocument = {
    defaultView: null,
    documentElement: { lang: "en" },
    getElementById: () => this.referenceTarget,
  } as unknown as Document;

  get isConnected(): boolean {
    return this.connected;
  }

  setConnected(value: boolean): void {
    this.connected = value;
  }

  setReferenceTarget(value: Element | null): void {
    this.referenceTarget = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  closest(): Element | null {
    return null;
  }
}

class FakeScene extends EventTarget {
  readonly tagName = "ARCGIS-SCENE";
  ready = true;
  map: object = { id: "map" };
  view: object = { id: "view" };
  fatalError: unknown = null;
  readonly viewOnReady = vi.fn(async () => undefined);
  private readonly listenerSets = new Map<string, Set<EventListenerOrEventListenerObject>>();

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(type, callback, options);
    if (!callback) return;
    const listeners = this.listenerSets.get(type) ?? new Set();
    listeners.add(callback);
    this.listenerSets.set(type, listeners);
  }

  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(type, callback, options);
    if (callback) this.listenerSets.get(type)?.delete(callback);
  }

  listenerCount(type: string): number {
    return this.listenerSets.get(type)?.size ?? 0;
  }
}

const definitions = new Map<string, CustomElementConstructor>();
const nativeWithResolvers = Object.getOwnPropertyDescriptor(Promise, "withResolvers");
let PlaneNavigation: typeof import("./arcgis-plane-navigation")["ArcgisPlaneNavigationElement"];

function deferredHostedScene() {
  let resolve!: (value: { destroy: ReturnType<typeof vi.fn> }) => void;
  const promise = new Promise<{ destroy: ReturnType<typeof vi.fn> }>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

beforeAll(async () => {
  // This harness represents a modern browser, even when CI itself runs Node 20.
  // Missing-feature cases below temporarily remove this implementation explicitly.
  Object.defineProperty(Promise, "withResolvers", {
    configurable: true, writable: true,
    value: () => {
      let resolve!: (value: unknown) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
      return { promise, resolve, reject };
    },
  });
  vi.stubGlobal("HTMLElement", FakeHTMLElement);
  vi.stubGlobal("customElements", {
    define: (name: string, constructor: CustomElementConstructor) => {
      definitions.set(name, constructor);
    },
    get: (name: string) => definitions.get(name),
    whenDefined: vi.fn(async () => undefined),
  });
  PlaneNavigation = (await import("./arcgis-plane-navigation"))
    .ArcgisPlaneNavigationElement;
});

afterAll(() => {
  if (nativeWithResolvers) Object.defineProperty(Promise, "withResolvers", nativeWithResolvers);
  else Reflect.deleteProperty(Promise, "withResolvers");
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Each case gets a fresh mocked session/resource graph; otherwise late promises from one lifecycle test can leak into the next.
  harness.initializeHostedFlightScene.mockReset();
  harness.initializeHostedFlightScene.mockImplementation(async () => ({
    destroy: vi.fn(),
  }));
  harness.localeSubscribe.mockClear();
  harness.localeRemove.mockClear();
  harness.constructorError = null;
  harness.initializeError = null;
  harness.sessions.length = 0;
  harness.overlays.length = 0;
  harness.joysticks.length = 0;
  vi.mocked(customElements.whenDefined).mockClear();
});

describe("arcgis-plane-navigation ArcGIS scene lifecycle", () => {
  it("waits for a referenced scene element to be upgraded before reading its view", async () => {
    const scene = new FakeScene();
    const viewOnReady = scene.viewOnReady;
    Reflect.deleteProperty(scene, "viewOnReady");
    vi.mocked(customElements.whenDefined).mockImplementationOnce(async () => {
      Object.defineProperty(scene, "viewOnReady", { value: viewOnReady });
      return PlaneNavigation;
    });
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await element.start();
    expect(customElements.whenDefined).toHaveBeenCalledWith("arcgis-scene");
    expect(viewOnReady).toHaveBeenCalledOnce();
    expect(element.status).toBe("running");
    host.setConnected(false);
    element.disconnectedCallback();
  });

  it.each([
    ["Promise.withResolvers", Promise, "withResolvers"],
    ["AbortController", globalThis, "AbortController"],
    ["AbortSignal.throwIfAborted", AbortSignal.prototype, "throwIfAborted"],
  ] as const)("reports missing %s and rejects start before creating hosted resources", async (name, target, key) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);

    // Restore this property alone: the suite's HTMLElement/customElements stubs must survive.
    Object.defineProperty(target, key, { ...descriptor, value: undefined });
    try {
      element.connectedCallback();
      const message = `Plane navigation requires browser support for ${name}. Update your browser before starting a flight.`;

      expect(element.status).toBe("error");
      expect(errors.map((error) => error.message)).toEqual([message]);
      await expect(element.start()).rejects.toThrow(message);
      expect(errors).toHaveLength(1);
      expect(scene.viewOnReady).not.toHaveBeenCalled();
      expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();
      expect(harness.sessions).toHaveLength(0);
      expect(element.snapshot()).toBeNull();
    } finally {
      Object.defineProperty(target, key, descriptor);
      host.setConnected(false);
      element.disconnectedCallback();
    }
  });

  it("rejects start while detached without subscribing or leaving idle", async () => {
    const element = new PlaneNavigation();

    await expect(element.start()).rejects.toThrow(/must be connected/);

    expect(element.status).toBe("idle");
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();
    expect(harness.localeSubscribe).not.toHaveBeenCalled();
    expect(harness.localeRemove).not.toHaveBeenCalled();
  });

  it("stays idle without creating a hosted session until a scene is assigned", async () => {
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    host.setConnected(true);
    element.connectedCallback();
    await Promise.resolve();
    await Promise.resolve();

    expect(element.status).toBe("idle");
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();
    expect(harness.sessions).toHaveLength(0);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("rejects a public start promptly when stop aborts view readiness", async () => {
    const scene = new FakeScene();
    scene.viewOnReady.mockImplementationOnce(() => new Promise<undefined>(() => {}));
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const started = element.start();
    await vi.waitFor(() => expect(scene.viewOnReady).toHaveBeenCalledOnce());

    // viewOnReady never settles on its own, so stop must actively abort the public start promise.
    element.stop();

    await expect(started).rejects.toThrow(/stopped/);
    expect(element.status).toBe("idle");
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();
    expect(harness.sessions).toHaveLength(0);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("rejects a public start promptly when disconnect aborts view readiness", async () => {
    const scene = new FakeScene();
    scene.viewOnReady.mockImplementationOnce(() => new Promise<undefined>(() => {}));
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const started = element.start();
    await vi.waitFor(() => expect(scene.viewOnReady).toHaveBeenCalledOnce());

    host.setConnected(false);
    element.disconnectedCallback();

    await expect(started).rejects.toThrow(/disconnected/);
    expect(element.status).toBe("idle");
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();
    expect(harness.sessions).toHaveLength(0);
  });

  it("rejects start when stop aborts hosted initialization that never settles", async () => {
    harness.initializeHostedFlightScene.mockImplementationOnce(
      () => new Promise<never>(() => undefined),
    );
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.config = { autoStart: false };
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const started = element.start();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledOnce();
    });

    element.stop();

    await expect(started).rejects.toThrow(/stopped/);
    expect(element.status).toBe("idle");
    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("does not let a pre-stop start follow a later initialization", async () => {
    const second = deferredHostedScene();
    harness.initializeHostedFlightScene
      .mockImplementationOnce(() => new Promise<never>(() => undefined))
      .mockImplementationOnce(() => second.promise);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.config = { autoStart: false };
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const beforeStop = element.start();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });

    const stopped = expect(beforeStop).rejects.toThrow(/stopped/);
    element.stop();
    const afterStop = element.start();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(2);
    });
    await stopped;

    second.resolve({ destroy: vi.fn() });
    await afterStop;
    expect(element.status).toBe("running");
    expect(harness.sessions).toHaveLength(1);
    expect(harness.sessions[0].start).toHaveBeenCalledOnce();
    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("does not let a pre-disconnect start follow a reconnected initialization", async () => {
    const second = deferredHostedScene();
    harness.initializeHostedFlightScene
      .mockImplementationOnce(() => new Promise<never>(() => undefined))
      .mockImplementationOnce(() => second.promise);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.config = { autoStart: false };
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const beforeDisconnect = element.start();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });

    const disconnected = expect(beforeDisconnect).rejects.toThrow(/disconnected/);
    host.setConnected(false);
    element.disconnectedCallback();
    host.setConnected(true);
    element.connectedCallback();
    const afterReconnect = element.start();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(2);
    });
    await disconnected;

    second.resolve({ destroy: vi.fn() });
    await afterReconnect;
    expect(element.status).toBe("running");
    expect(harness.sessions).toHaveLength(1);
    expect(harness.sessions[0].start).toHaveBeenCalledOnce();
    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("destroys hosted resources exactly once when session construction throws", async () => {
    const failure = new Error("FlightSession constructor failed.");
    harness.constructorError = failure;
    const hosted = { destroy: vi.fn() };
    harness.initializeHostedFlightScene.mockResolvedValueOnce(hosted);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => expect(element.status).toBe("error"));

    expect(errors).toEqual([failure]);
    expect(harness.sessions).toHaveLength(0);
    expect(hosted.destroy).toHaveBeenCalledOnce();
    expect(element.snapshot()).toBeNull();

    host.setConnected(false);
    element.disconnectedCallback();
    expect(hosted.destroy).toHaveBeenCalledOnce();
  });

  it("owns the session before initialize and cleans up an initialize failure once", async () => {
    const failure = new Error("FlightSession initialize failed.");
    harness.initializeError = failure;
    const hosted = { destroy: vi.fn() };
    harness.initializeHostedFlightScene.mockResolvedValueOnce(hosted);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => expect(element.status).toBe("error"));

    const session = harness.sessions[0];
    expect(session.initialize).toHaveBeenCalledOnce();
    expect(session.destroy).toHaveBeenCalledOnce();
    expect(hosted.destroy).toHaveBeenCalledOnce();
    expect(errors).toEqual([failure]);
    expect(element.snapshot()).toBeNull();

    host.setConnected(false);
    element.disconnectedCallback();
    expect(session.destroy).toHaveBeenCalledOnce();
    expect(hosted.destroy).toHaveBeenCalledOnce();
  });

  it("reports the same initialization error through its event and start promise", async () => {
    const failure = new Error("Hosted scene initialization failed.");
    harness.initializeHostedFlightScene.mockRejectedValueOnce(failure);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const started = element.start();

    await expect(started).rejects.toBe(failure);
    expect(element.status).toBe("error");
    expect(errors).toEqual([failure]);
    expect(harness.sessions).toHaveLength(0);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("does not commit component configuration when session application fails", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => expect(element.status).toBe("running"));
    const session = harness.sessions[0];
    const failure = new Error("live configuration failed");
    session.applyLiveConfig.mockImplementationOnce(() => { throw failure; });

    expect(() => {
      element.updateConfig({
        camera: { mode: "cockpit" },
        powerMode: "turbo",
      });
    }).toThrow(failure);

    expect(element.config.camera.mode).toBe("chase");
    expect(element.config.powerMode).toBe("normal");
    expect(element.status).toBe("running");
    expect(session.destroy).not.toHaveBeenCalled();
    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("applies banked viewport changes without rebuilding the active scene", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => expect(element.status).toBe("running"));
    const session = harness.sessions[0];

    element.updateConfig({ camera: { bankedViewport: false } });

    expect(element.status).toBe("running");
    expect(element.config.camera.bankedViewport).toBe(false);
    expect(session.applyLiveConfig).toHaveBeenCalledOnce();
    expect(session.destroy).not.toHaveBeenCalled();
    expect(harness.initializeHostedFlightScene).toHaveBeenCalledOnce();

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("rejects invalid runtime mode values without mutating configuration", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => expect(element.status).toBe("running"));
    const session = harness.sessions[0];

    element.setCameraMode("cockpit");
    element.setPowerMode("turbo");
    session.applyLiveConfig.mockClear();
    session.setCameraMode.mockClear();
    session.setPowerMode.mockClear();

    expect(() => {
      element.setCameraMode("orbit" as FlightViewMode);
    }).toThrow(TypeError);
    expect(() => {
      element.setPowerMode("boost" as FlightPowerMode);
    }).toThrow(TypeError);
    expect(() => {
      element.updateConfig({ camera: { mode: "orbit" as FlightViewMode } });
    }).toThrow(TypeError);
    expect(() => {
      element.updateConfig({ powerMode: "boost" as FlightPowerMode });
    }).toThrow(TypeError);
    expect(() => {
      element.config = { camera: { mode: "orbit" as FlightViewMode } };
    }).toThrow(TypeError);
    expect(() => {
      element.config = { powerMode: "boost" as FlightPowerMode };
    }).toThrow(TypeError);

    expect(element.config.camera.mode).toBe("cockpit");
    expect(element.config.powerMode).toBe("turbo");
    expect(session.applyLiveConfig).not.toHaveBeenCalled();
    expect(session.setCameraMode).not.toHaveBeenCalled();
    expect(session.setPowerMode).not.toHaveBeenCalled();

    host.setConnected(false);
    element.disconnectedCallback();

    expect(() => {
      element.config = { camera: { mode: "orbit" as FlightViewMode } };
    }).toThrow(TypeError);
    expect(() => {
      element.config = { powerMode: "boost" as FlightPowerMode };
    }).toThrow(TypeError);
    expect(element.config.camera.mode).toBe("cockpit");
    expect(element.config.powerMode).toBe("turbo");
  });

  it("tears down once across false/true readiness, restarts, reports errors, and removes listeners", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Array<CustomEvent<{ error: Error }>> = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push(event as CustomEvent<{ error: Error }>);
    });

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => {
      expect(element.status).toBe("running");
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });
    expect(scene.listenerCount("arcgisViewReadyChange")).toBe(1);
    expect(scene.listenerCount("arcgisViewReadyError")).toBe(1);

    const firstSession = harness.sessions[0];
    scene.ready = false;
    scene.dispatchEvent(new Event("arcgisViewReadyChange"));

    expect(element.status).toBe("loading");
    expect(firstSession.destroy).toHaveBeenCalledOnce();
    expect(firstSession.destroy).toHaveBeenCalledWith({ restoreCamera: true });

    scene.dispatchEvent(new Event("arcgisViewReadyChange"));
    expect(firstSession.destroy).toHaveBeenCalledOnce();
    expect(scene.listenerCount("arcgisViewReadyChange")).toBe(1);
    expect(scene.listenerCount("arcgisViewReadyError")).toBe(1);

    scene.ready = true;
    scene.dispatchEvent(new Event("arcgisViewReadyChange"));

    await vi.waitFor(() => {
      expect(element.status).toBe("running");
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(2);
    });
    expect(harness.sessions).toHaveLength(2);
    expect(scene.listenerCount("arcgisViewReadyChange")).toBe(1);
    expect(scene.listenerCount("arcgisViewReadyError")).toBe(1);

    const fatalError = {
      name: "map-content-error",
      message: "Replacement WebScene failed.",
    };
    scene.fatalError = fatalError;
    scene.dispatchEvent(new Event("arcgisViewReadyError"));

    const secondSession = harness.sessions[1];
    expect(secondSession.destroy).toHaveBeenCalledOnce();
    expect(secondSession.destroy).toHaveBeenCalledWith({ restoreCamera: true });
    expect(element.status).toBe("error");
    expect(errors).toHaveLength(1);
    expect(errors[0].detail.error.name).toBe(fatalError.name);
    expect(errors[0].detail.error.message).toBe(fatalError.message);
    expect(scene.listenerCount("arcgisViewReadyChange")).toBe(1);
    expect(scene.listenerCount("arcgisViewReadyError")).toBe(1);

    host.setConnected(false);
    element.disconnectedCallback();

    expect(element.status).toBe("idle");
    expect(scene.listenerCount("arcgisViewReadyChange")).toBe(0);
    expect(scene.listenerCount("arcgisViewReadyError")).toBe(0);
    expect(harness.localeRemove).toHaveBeenCalledOnce();
  });

  it("rejects a pending start with the same fatal scene error it emits", async () => {
    const hosted = deferredHostedScene();
    harness.initializeHostedFlightScene.mockImplementationOnce(() => hosted.promise);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const started = element.start();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledOnce();
      expect(scene.listenerCount("arcgisViewReadyError")).toBe(1);
    });

    scene.fatalError = {
      name: "map-content-error",
      message: "The selected WebScene failed while loading.",
    };
    scene.dispatchEvent(new Event("arcgisViewReadyError"));

    expect(errors).toHaveLength(1);
    await expect(started).rejects.toBe(errors[0]);
    expect(element.status).toBe("error");
    expect(harness.sessions).toHaveLength(0);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("does not restore the old camera after map and view replacement", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => {
      expect(element.status).toBe("running");
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });

    const session = harness.sessions[0];
    scene.map = { id: "replacement-map" };
    scene.view = { id: "replacement-view" };
    scene.ready = false;
    scene.dispatchEvent(new Event("arcgisViewReadyChange"));

    // A replacement is a new host view, so restoring the previous view's camera would overwrite the caller's state.
    expect(element.status).toBe("loading");
    expect(session.destroy).toHaveBeenCalledOnce();
    expect(session.destroy).toHaveBeenCalledWith({ restoreCamera: false });

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("stop removes lifecycle listeners and ignores late ready changes", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => {
      expect(element.status).toBe("running");
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });
    expect(scene.listenerCount("arcgisViewReadyChange")).toBe(1);
    expect(scene.listenerCount("arcgisViewReadyError")).toBe(1);

    const session = harness.sessions[0];
    element.stop();

    expect(session.destroy).toHaveBeenCalledOnce();
    expect(session.destroy).toHaveBeenCalledWith({ restoreCamera: true });
    expect(element.status).toBe("idle");
    expect(scene.listenerCount("arcgisViewReadyChange")).toBe(0);
    expect(scene.listenerCount("arcgisViewReadyError")).toBe(0);

    scene.map = { id: "late-map" };
    scene.view = { id: "late-view" };
    scene.dispatchEvent(new Event("arcgisViewReadyChange"));
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    expect(harness.sessions).toHaveLength(1);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("awaits the connected initialization when start is called immediately", async () => {
    const hosted = deferredHostedScene();
    harness.initializeHostedFlightScene.mockImplementationOnce(() => hosted.promise);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;

    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    const started = element.start();

    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });
    hosted.resolve({ destroy: vi.fn() });
    await started;

    expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    expect(harness.sessions).toHaveLength(1);
    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("restarts a pending initialization when live config changes", async () => {
    const second = deferredHostedScene();
    harness.initializeHostedFlightScene
      .mockImplementationOnce((_scene, _config, options) => (
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          );
        })
      ))
      .mockImplementationOnce(() => second.promise);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });

    element.updateConfig({
      controls: { sensitivity: 1.4 },
      camera: { mode: "cockpit" },
    });
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(2);
    });
    const secondConfig = harness.initializeHostedFlightScene.mock.calls[1][1];
    expect(secondConfig.controls.sensitivity).toBe(1.4);
    expect(secondConfig.camera.mode).toBe("cockpit");
    expect(
      harness.initializeHostedFlightScene.mock.calls[0][2].signal.aborted,
    ).toBe(true);

    const secondResource = { destroy: vi.fn() };
    second.resolve(secondResource);
    await vi.waitFor(() => expect(element.status).toBe("running"));

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("makes start follow a newer structural restart", async () => {
    const first = deferredHostedScene();
    const second = deferredHostedScene();
    harness.initializeHostedFlightScene
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });
    let startSettled = false;
    const started = element.start().finally(() => { startSettled = true; });

    element.updateConfig({ start: { speedMps: 140 } });
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(2);
    });
    first.resolve({ destroy: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();
    expect(startSettled).toBe(false);

    second.resolve({ destroy: vi.fn() });
    await started;
    expect(element.status).toBe("running");

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("keeps newer programmatic config across a later scene restart", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    host.setAttribute("sensitivity", "0.7");
    element.attributeChangedCallback("sensitivity", null, "0.7");
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });
    element.updateConfig({ controls: { sensitivity: 1.4 } });

    scene.map = { id: "replacement-map" };
    scene.view = { id: "replacement-view" };
    scene.ready = false;
    scene.dispatchEvent(new Event("arcgisViewReadyChange"));
    scene.ready = true;
    scene.dispatchEvent(new Event("arcgisViewReadyChange"));

    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(2);
    });
    expect(harness.initializeHostedFlightScene.mock.calls[1][1].controls.sensitivity)
      .toBe(1.4);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("keeps an explicit reference when its matching attribute later changes", async () => {
    const firstScene = new FakeScene();
    const secondScene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    host.setReferenceTarget(firstScene as unknown as Element);
    host.setAttribute("reference-element", "first-scene");
    element.attributeChangedCallback("reference-element", null, "first-scene");
    element.referenceElement = firstScene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);
    });
    host.setReferenceTarget(secondScene as unknown as Element);
    host.setAttribute("reference-element", "second-scene");
    element.attributeChangedCallback(
      "reference-element",
      "first-scene",
      "second-scene",
    );
    await Promise.resolve();

    expect(element.referenceElement).toBe(firstScene);
    expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);

    element.referenceElement = null;
    await vi.waitFor(() => {
      expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(2);
    });
    expect(element.referenceElement).toBe(secondScene);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("reports an explicit reference-element that is missing or has the wrong type", async () => {
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });
    host.setAttribute("reference-element", "missing-scene");
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => expect(element.status).toBe("error"));
    expect(errors.at(-1)?.message).toMatch(/did not match/);
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();

    host.setReferenceTarget({ tagName: "DIV" } as Element);
    host.setAttribute("reference-element", "wrong-type");
    element.attributeChangedCallback(
      "reference-element",
      "missing-scene",
      "wrong-type",
    );
    await vi.waitFor(() => expect(errors).toHaveLength(2));
    expect(errors.at(-1)?.message).toMatch(/found <div>/);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("reports and recovers from an invalid declarative mode", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });
    host.setAttribute("camera-mode", "orbit");
    element.attributeChangedCallback("camera-mode", null, "orbit");
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => expect(element.status).toBe("error"));
    expect(errors.at(-1)?.message).toMatch(/camera-mode=.*invalid/);
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();

    host.setAttribute("camera-mode", "cockpit");
    element.attributeChangedCallback("camera-mode", "orbit", "cockpit");
    await vi.waitFor(() => expect(element.status).toBe("running"));
    expect(element.config.camera.mode).toBe("cockpit");

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("reports and recovers from an invalid numeric attribute before connection", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });
    host.setAttribute("sensitivity", "not-a-number");
    element.attributeChangedCallback("sensitivity", null, "not-a-number");
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();

    await vi.waitFor(() => expect(element.status).toBe("error"));
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();
    expect(errors[0]?.message).toMatch(/finite number/);

    host.setAttribute("sensitivity", "1.1");
    element.attributeChangedCallback("sensitivity", "not-a-number", "1.1");
    await vi.waitFor(() => expect(element.status).toBe("running"));
    expect(harness.initializeHostedFlightScene).toHaveBeenCalledTimes(1);

    host.setConnected(false);
    element.disconnectedCallback();
  });

  it("tears down and reports a live invalid numeric attribute", async () => {
    const scene = new FakeScene();
    const element = new PlaneNavigation();
    const host = element as unknown as FakeHTMLElement;
    const errors: Error[] = [];
    element.addEventListener("arcgisPlaneNavigationError", (event) => {
      errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });
    element.referenceElement = scene as unknown as HTMLArcgisSceneElement;
    host.setConnected(true);
    element.connectedCallback();
    await vi.waitFor(() => expect(element.status).toBe("running"));
    const session = harness.sessions[0];

    host.setAttribute("fov-deg", "Infinity");
    element.attributeChangedCallback("fov-deg", null, "Infinity");
    await vi.waitFor(() => expect(element.status).toBe("error"));

    expect(session.destroy).toHaveBeenCalledWith({ restoreCamera: true });
    expect(errors.at(-1)?.message).toMatch(/finite number/);

    host.setConnected(false);
    element.disconnectedCallback();
  });
});


function directSceneView() {
  const container = new FakeHTMLElement();
  const view = {
    type: "3d",
    destroyed: false,
    container,
    map: { destroy: vi.fn() },
    when: vi.fn(async () => undefined),
    ui: { add: vi.fn(), remove: vi.fn() },
    destroy: vi.fn(),
  };
  return { fake: view, view: view as unknown as SceneView };
}

describe("arcgis-plane-navigation caller-owned SceneView", () => {
  it("shows the touch joystick without a toolbar and updates placement and visibility without restarting", async () => {
    const { fake, view } = directSceneView();
    const element = new PlaneNavigation();
    const dom = element as unknown as FakeHTMLElement;
    const media = Object.assign(new EventTarget(), { matches: true });
    Object.assign(dom.ownerDocument, { defaultView: {
      matchMedia: () => media, navigator: { languages: ["en"], language: "en" },
    } });
    element.view = view;
    dom.setConnected(true);
    element.connectedCallback();
    await element.start();
    const joystick = harness.joysticks[0];
    expect(harness.overlays).toHaveLength(0);
    expect(fake.ui.add).toHaveBeenCalledWith(joystick.element, "bottom-left");
    expect(joystick.update).toHaveBeenLastCalledWith(true, "en");
    element.pause();
    expect(joystick.update).toHaveBeenLastCalledWith(false, "en");
    element.updateConfig({ ui: { joystickPosition: "bottom-right" } });
    expect(joystick.reset).toHaveBeenCalledTimes(2);
    expect(fake.ui.add).toHaveBeenLastCalledWith(joystick.element, "bottom-right");
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    expect(joystick.destroy).toHaveBeenCalledOnce();
    element.updateConfig({ ui: { joystick: "always" } });
    expect(harness.joysticks).toHaveLength(2);
    element.updateConfig({ ui: { joystick: "never" } });
    expect(harness.joysticks[1].destroy).toHaveBeenCalledOnce();
    expect(harness.sessions).toHaveLength(1);
    dom.setConnected(false);
    element.disconnectedCallback();
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    expect(harness.joysticks).toHaveLength(2);
    expect(fake.destroy).not.toHaveBeenCalled();
  });

  it("uses the assigned view without loading or waiting for an arcgis-scene element", async () => {
    const { fake, view } = directSceneView();
    const element = new PlaneNavigation();
    const dom = element as unknown as FakeHTMLElement;
    const ready = vi.fn();
    element.addEventListener("arcgisPlaneNavigationReady", ready);
    element.view = view;
    dom.setConnected(true);
    element.connectedCallback();
    await element.start();

    expect(element.status).toBe("running");
    expect(fake.when).toHaveBeenCalledOnce();
    expect(customElements.whenDefined).not.toHaveBeenCalled();
    const flightHost = harness.initializeHostedFlightScene.mock.calls[0][0];
    expect(flightHost.view).toBe(view);
    expect(flightHost.map).toBe(fake.map);
    expect(flightHost.inputElement).toBe(fake.container);
    expect(flightHost.scene).toBeNull();
    expect(ready.mock.calls[0][0].detail).toMatchObject({ scene: null, view });

    dom.setConnected(false);
    element.disconnectedCallback();
    expect(harness.sessions[0].destroy).toHaveBeenCalledWith({ restoreCamera: true });
    expect(fake.destroy).not.toHaveBeenCalled();
    expect(fake.map.destroy).not.toHaveBeenCalled();
  });

  it("moves its controls between view UI containers and removes them on disconnect", async () => {
    const first = directSceneView();
    const second = directSceneView();
    const element = new PlaneNavigation();
    const dom = element as unknown as FakeHTMLElement;
    element.config = { ui: { enabled: true, position: "bottom-start" } };
    element.view = first.view;
    dom.setConnected(true);
    element.connectedCallback();
    await element.start();
    const firstOverlay = harness.overlays[0];
    expect(first.fake.ui.add).toHaveBeenCalledWith(firstOverlay.element, "bottom-leading");

    element.view = second.view;
    await element.start();
    expect(first.fake.ui.remove).toHaveBeenCalledWith(firstOverlay.element);
    expect(firstOverlay.destroy).toHaveBeenCalledOnce();
    expect(harness.sessions[0].destroy).toHaveBeenCalledWith({ restoreCamera: true });
    const secondOverlay = harness.overlays[1];
    expect(second.fake.ui.add).toHaveBeenCalledWith(secondOverlay.element, "bottom-leading");
    element.updateConfig({ ui: { position: "top-end" } });
    expect(second.fake.ui.remove).toHaveBeenCalledWith(secondOverlay.element);
    expect(second.fake.ui.add).toHaveBeenLastCalledWith(secondOverlay.element, "top-trailing");

    dom.setConnected(false);
    element.disconnectedCallback();
    expect(second.fake.ui.remove).toHaveBeenLastCalledWith(secondOverlay.element);
    expect(secondOverlay.destroy).toHaveBeenCalledOnce();
    expect(first.fake.destroy).not.toHaveBeenCalled();
    expect(second.fake.destroy).not.toHaveBeenCalled();
  });

  it("cancels a pending view readiness wait when disconnected", async () => {
    const { fake, view } = directSceneView();
    fake.when.mockImplementation(() => new Promise<undefined>(() => {}));
    const element = new PlaneNavigation();
    const dom = element as unknown as FakeHTMLElement;
    element.view = view;
    dom.setConnected(true);
    element.connectedCallback();
    const start = element.start();
    await vi.waitFor(() => expect(fake.when).toHaveBeenCalledOnce());
    dom.setConnected(false);
    element.disconnectedCallback();
    await expect(start).rejects.toThrow("disconnected before it could start");
    expect(harness.initializeHostedFlightScene).not.toHaveBeenCalled();
    expect(fake.destroy).not.toHaveBeenCalled();
  });

  it("rejects a 2D view before changing the existing target", () => {
    const { view } = directSceneView();
    const element = new PlaneNavigation();
    element.view = view;
    expect(() => { element.view = { type: "2d" } as unknown as SceneView; })
      .toThrow("must be an ArcGIS SceneView");
    expect(element.view).toBe(view);
  });
});
