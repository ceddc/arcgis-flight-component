import { describe, expect, it, vi } from "vitest";
import type { HostedFlightScene } from "../arcgis/hosted-flight-scene";
import {
  DEFAULT_PLANE_NAVIGATION_CONFIG,
  normalizePlaneNavigationConfig,
} from "../config";
import type { FlightViewMode } from "../core/camera-rig";
import { createInitialFlightState } from "../core/flight";
import type { FlightPowerMode } from "../core/power-mode";
import { FlightInputController } from "../input";
import { FlightSession } from "./flight-session";

function createHostedScene(): {
  browser: EventTarget;
  documentTarget: EventTarget;
  scene: HostedFlightScene;
} {
  const browser = new EventTarget() as EventTarget & {
    navigator: { getGamepads(): readonly null[] };
  };
  browser.navigator = { getGamepads: () => [] };
  const documentTarget = new EventTarget() as EventTarget & {
    defaultView: typeof browser;
    hasFocus(): boolean;
    visibilityState: DocumentVisibilityState;
  };
  documentTarget.defaultView = browser;
  documentTarget.hasFocus = () => true;
  documentTarget.visibilityState = "visible";
  const sceneElement = new EventTarget() as EventTarget & {
    ownerDocument: typeof documentTarget;
  };
  sceneElement.ownerDocument = documentTarget;
  const scene = {
    sceneElement,
    startState: createInitialFlightState({ x: 0, y: 0, z: 300 }, 0),
    elevationAtWorld: vi.fn(() => 0),
    present: vi.fn(),
    setBankedViewport: vi.fn(),
    setViewMode: vi.fn(),
    debugSnapshot: vi.fn(() => ({
      lastPresentationTick: 0,
      cameraFrame: null,
    })),
    destroy: vi.fn(),
  } as unknown as HostedFlightScene;
  return { browser, documentTarget, scene };
}

function inputFor(session: FlightSession): FlightInputController {
  const input = (session as unknown as {
    input: FlightInputController | null;
  }).input;
  if (!input) throw new Error("Expected an initialized flight input.");
  return input;
}

describe("FlightSession lifecycle", () => {
  it.each([undefined, 200_000])("applies the %s AGL ceiling relative to sampled ground", maximumAglM => {
    const { scene } = createHostedScene();
    const ceiling = maximumAglM ?? 50_000;
    scene.startState.position.z = ceiling + 1_500;
    vi.mocked(scene.elevationAtWorld).mockReturnValue(1_000);
    const session = new FlightSession({ scene, config: normalizePlaneNavigationConfig(
      maximumAglM === undefined ? {} : { terrain: { maximumAglM } },
    ) });
    try {
      session.initialize();
      const snapshot = session.debugAdvanceFixedSteps(2);
      expect(snapshot.vehicle.position.z).toBe(ceiling + 1_000);
      expect(snapshot.aglM).toBe(ceiling);
    } finally { session.destroy(); }
  });

  it("returns to live input after a debug advance rejects an invalid step count", () => {
    const requestFrame = vi.fn((_callback: FrameRequestCallback) => 1);
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { scene } = createHostedScene();
    const session = new FlightSession({ scene, config: normalizePlaneNavigationConfig() });

    try {
      session.initialize();
      session.start();
      session.setControlPatch({ pitch: -0.5 });
      const sample = vi.spyOn(inputFor(session), "sample");

      expect(() => session.debugAdvanceFixedSteps(-1, { pitch: 1 })).toThrow(
        "GameRuntime fixed-step count must be a non-negative integer.",
      );
      expect(session.snapshot().simulationStep).toBe(0);

      // Drive the next normal animation frames, without another debug call overwriting its input.
      const now = performance.now();
      requestFrame.mock.calls.at(-1)![0](now);
      requestFrame.mock.calls.at(-1)![0](now + 20);

      expect(session.snapshot().simulationStep).toBe(1);
      expect(sample).toHaveBeenCalledOnce();
      expect(sample.mock.results[0].value.pitch).toBe(-0.5);
    } finally {
      session.destroy();
      vi.unstubAllGlobals();
    }
  });

  it("keeps construction internal and attaches effects only when initialized", () => {
    const { browser, documentTarget, scene } = createHostedScene();
    const onSnapshot = vi.fn();
    const addBrowserListener = vi.spyOn(browser, "addEventListener");
    const addDocumentListener = vi.spyOn(documentTarget, "addEventListener");

    const session = new FlightSession({
      scene,
      config: normalizePlaneNavigationConfig(),
      onSnapshot,
    });

    expect(session.phase).toBe("ready");
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(addBrowserListener).not.toHaveBeenCalled();
    expect(addDocumentListener).not.toHaveBeenCalled();
    expect(scene.setViewMode).not.toHaveBeenCalled();
    expect(scene.present).not.toHaveBeenCalled();

    session.initialize();

    expect(addBrowserListener).toHaveBeenCalledTimes(7);
    expect(addDocumentListener).toHaveBeenCalledOnce();
    expect(scene.setViewMode).toHaveBeenCalledWith("chase", true);
    expect(scene.present).toHaveBeenCalledOnce();
    expect(onSnapshot).not.toHaveBeenCalled();
    session.destroy();
  });

  it("removes input listeners when initial presentation throws", () => {
    const { browser, documentTarget, scene } = createHostedScene();
    const removeBrowserListener = vi.spyOn(browser, "removeEventListener");
    const removeDocumentListener = vi.spyOn(
      documentTarget,
      "removeEventListener",
    );
    const presentationError = new Error("initial presentation failed");
    vi.mocked(scene.present).mockImplementation(() => {
      throw presentationError;
    });

    const session = new FlightSession({
      scene,
      config: DEFAULT_PLANE_NAVIGATION_CONFIG,
    });

    expect(() => session.initialize()).toThrow(presentationError);

    expect(removeBrowserListener).toHaveBeenCalledTimes(7);
    expect(removeDocumentListener).toHaveBeenCalledOnce();
    expect(scene.destroy).not.toHaveBeenCalled();
    session.destroy();
    expect(scene.destroy).toHaveBeenCalledOnce();
  });

  it("rejects invalid camera and power modes before changing session state", () => {
    const { scene } = createHostedScene();
    const onSnapshot = vi.fn();
    const session = new FlightSession({
      scene,
      config: normalizePlaneNavigationConfig(),
      onSnapshot,
    });
    session.initialize();
    vi.mocked(scene.setViewMode).mockClear();

    expect(() => {
      session.setCameraMode("orbit" as FlightViewMode);
    }).toThrow(TypeError);
    expect(() => {
      session.setPowerMode("boost" as FlightPowerMode);
    }).toThrow(TypeError);

    expect(session.cameraMode).toBe("chase");
    expect(session.powerMode).toBe("normal");
    expect(scene.setViewMode).not.toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
    session.destroy();
  });

  it("applies live settings before publishing one observable state change", () => {
    const { scene } = createHostedScene();
    const onSnapshot = vi.fn();
    const session = new FlightSession({
      scene,
      config: normalizePlaneNavigationConfig(),
      onSnapshot,
    });
    session.initialize();
    const next = normalizePlaneNavigationConfig({
      camera: { mode: "cockpit", fovDeg: 72, bankedViewport: false },
      controls: { sensitivity: 1.2, invertPitch: false },
      powerMode: "turbo",
    });
    vi.mocked(scene.setViewMode).mockClear();

    session.applyLiveConfig(next);

    expect(session.cameraMode).toBe("cockpit");
    expect(session.powerMode).toBe("turbo");
    expect(scene.setViewMode).toHaveBeenCalledOnce();
    expect(scene.setViewMode).toHaveBeenCalledWith("cockpit", false);
    expect(scene.setBankedViewport).toHaveBeenCalledWith(false);
    expect(onSnapshot).not.toHaveBeenCalled();
    session.destroy();
  });

  it("changes banked viewport without interrupting a running flight", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { scene } = createHostedScene();
    const session = new FlightSession({
      scene,
      config: normalizePlaneNavigationConfig(),
    });

    try {
      session.initialize();
      session.start();
      vi.mocked(scene.setBankedViewport).mockClear();

      session.applyLiveConfig(normalizePlaneNavigationConfig({
        camera: { bankedViewport: false },
      }));

      expect(session.phase).toBe("running");
      expect(scene.setBankedViewport).toHaveBeenCalledOnce();
      expect(scene.setBankedViewport).toHaveBeenCalledWith(false);
    } finally {
      session.destroy();
      vi.unstubAllGlobals();
    }
  });

  it("does not mutate held or programmatic input when a camera update fails", () => {
    const { scene } = createHostedScene();
    const onSnapshot = vi.fn();
    const session = new FlightSession({
      scene,
      config: normalizePlaneNavigationConfig(),
      onSnapshot,
    });
    session.initialize();
    session.setControlPatch({ brake: 0.65, turboBoost: false });
    const input = inputFor(session);
    vi.mocked(scene.setViewMode).mockClear();
    vi.mocked(scene.present).mockClear();
    const updateSettings = vi.spyOn(
      FlightInputController.prototype,
      "updateSettings",
    );
    const failure = new Error("camera update failed");
    vi.mocked(scene.setViewMode)
      .mockImplementationOnce(() => { throw failure; })
      .mockImplementation(() => undefined);
    const next = normalizePlaneNavigationConfig({
      camera: { mode: "cockpit", fovDeg: 72 },
      controls: {
        sensitivity: 1.2,
        invertPitch: false,
        keyboard: false,
      },
      powerMode: "turbo",
    });

    expect(() => session.applyLiveConfig(next)).toThrow(failure);

    expect(session.cameraMode).toBe("chase");
    expect(session.powerMode).toBe("normal");
    expect(updateSettings).not.toHaveBeenCalled();
    expect(input.settings).toMatchObject({
      sensitivity: DEFAULT_PLANE_NAVIGATION_CONFIG.controls.sensitivity,
      invertPitch: DEFAULT_PLANE_NAVIGATION_CONFIG.controls.invertPitch,
      keyboardEnabled: true,
    });
    expect(input.sample().brake).toBe(0.65);
    expect(scene.setViewMode).toHaveBeenNthCalledWith(1, "cockpit", false);
    expect(scene.setViewMode).toHaveBeenNthCalledWith(2, "chase", true);
    expect(scene.present).not.toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
    updateSettings.mockRestore();
    session.destroy();
  });

  it("presents camera and FOV changes immediately while paused", () => {
    const requestFrame = vi.fn(() => 1);
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { scene } = createHostedScene();
    const session = new FlightSession({
      scene,
      config: normalizePlaneNavigationConfig(),
    });

    try {
      session.initialize();
      session.start();
      session.pause();
      vi.mocked(scene.setViewMode).mockClear();
      vi.mocked(scene.present).mockClear();
      requestFrame.mockClear();

      session.applyLiveConfig(normalizePlaneNavigationConfig({
        camera: { mode: "cockpit", fovDeg: 72 },
      }));

      expect(session.phase).toBe("paused");
      expect(session.cameraMode).toBe("cockpit");
      expect(scene.setViewMode).toHaveBeenCalledWith("cockpit", false);
      expect(scene.present).toHaveBeenCalledOnce();
      expect(vi.mocked(scene.present).mock.calls[0][1]).toBe(72);
      expect(vi.mocked(scene.present).mock.calls[0][4]).toBe(true);
      expect(requestFrame).not.toHaveBeenCalled();
    } finally {
      session.destroy();
      vi.unstubAllGlobals();
    }
  });

  it("restores the paused camera frame when immediate presentation fails", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { scene } = createHostedScene();
    const session = new FlightSession({
      scene,
      config: normalizePlaneNavigationConfig(),
    });

    try {
      session.initialize();
      session.start();
      session.pause();
      session.setControlPatch({ brake: 0.65 });
      const input = inputFor(session);
      vi.mocked(scene.setViewMode).mockClear();
      vi.mocked(scene.present).mockClear();
      const failure = new Error("camera presentation failed");
      vi.mocked(scene.present)
        .mockImplementationOnce(() => { throw failure; })
        .mockImplementation(() => undefined);

      const next = normalizePlaneNavigationConfig({
        camera: { mode: "cockpit", fovDeg: 72 },
        controls: { keyboard: false },
        powerMode: "turbo",
      });

      expect(() => session.applyLiveConfig(next)).toThrow(failure);

      expect(session.cameraMode).toBe("chase");
      expect(session.powerMode).toBe("normal");
      expect(input.settings.keyboardEnabled).toBe(true);
      expect(input.sample().brake).toBe(0.65);
      expect(scene.setViewMode).toHaveBeenNthCalledWith(1, "cockpit", false);
      expect(scene.setViewMode).toHaveBeenNthCalledWith(2, "chase", true);
      expect(scene.present).toHaveBeenCalledTimes(2);
      expect(vi.mocked(scene.present).mock.calls[0][1]).toBe(72);
      expect(vi.mocked(scene.present).mock.calls[0][4]).toBe(true);
      expect(vi.mocked(scene.present).mock.calls[1][1]).toBe(
        DEFAULT_PLANE_NAVIGATION_CONFIG.camera.fovDeg,
      );
      expect(vi.mocked(scene.present).mock.calls[1][4]).toBe(true);
    } finally {
      session.destroy();
      vi.unstubAllGlobals();
    }
  });
});
