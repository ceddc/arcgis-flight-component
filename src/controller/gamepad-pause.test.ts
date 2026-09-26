/**
 * Checks that a gamepad can pause and resume a flight through the session.
 * The suite protects button-edge handling while physics is paused, so holding
 * a button cannot repeatedly toggle the lifecycle state.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HostedFlightScene } from "../arcgis/hosted-flight-scene";
import { normalizePlaneNavigationConfig } from "../config";
import { createInitialFlightState } from "../core/flight";
import { GameRuntime } from "../core/runtime";
import { FlightInputController, type FlightGamepadReading } from "../input";
import { FlightSession } from "./flight-session";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("gamepad pause and resume", () => {
  it("observes Menu release and press while paused without stepping or presenting flight", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 0;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextFrameId;
      frames.set(id, callback);
      return id;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
    vi.spyOn(performance, "now").mockReturnValue(0);

    const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
    const gamepad: FlightGamepadReading = {
      index: 0,
      id: "Standard controller",
      mapping: "standard",
      connected: true,
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons,
    };
    const browser = Object.assign(new EventTarget(), {
      navigator: { getGamepads: () => [gamepad] },
    });
    const document = Object.assign(new EventTarget(), {
      defaultView: browser,
      activeElement: null as unknown,
      body: null,
      visibilityState: "visible",
      hasFocus: () => true,
    });
    const sceneElement = Object.assign(new EventTarget(), {
      ownerDocument: document,
      focus: vi.fn(),
    });
    document.activeElement = sceneElement;
    const scene = {
      sceneElement,
      startState: createInitialFlightState({ x: 0, y: 0, z: 300 }, 0),
      elevationAtWorld: vi.fn(() => 0),
      present: vi.fn(),
      setViewMode: vi.fn(),
      debugSnapshot: vi.fn(() => ({ lastPresentationTick: 0, cameraFrame: null })),
      destroy: vi.fn(),
    } as unknown as HostedFlightScene;
    const session = new FlightSession({ scene, config: normalizePlaneNavigationConfig() });
    const sample = vi.spyOn(FlightInputController.prototype, "sample");
    const tick = vi.spyOn(GameRuntime.prototype, "tick");

    function frame(time: number): void {
      expect(frames.size).toBe(1);
      const [id, callback] = [...frames.entries()][0]!;
      frames.delete(id);
      callback(time);
      expect(frames.size).toBe(1);
    }

    try {
      session.initialize();
      session.start();
      frame(0);
      frame(20);
      vi.mocked(scene.present).mockClear();
      buttons[9] = { pressed: true, value: 1 };
      frame(40);
      expect(session.phase).toBe("paused");
      expect(scene.present).not.toHaveBeenCalled();
      const paused = session.snapshot();
      sample.mockClear();
      tick.mockClear();

      frame(60);
      expect(session.phase).toBe("paused");
      buttons[9] = { pressed: false, value: 0 };
      frame(80);
      frame(100);
      expect(session.snapshot()).toMatchObject({
        phase: "paused",
        vehicle: paused.vehicle,
        simulationStep: paused.simulationStep,
      });
      expect(sample).not.toHaveBeenCalled();
      expect(tick).not.toHaveBeenCalled();
      expect(scene.present).not.toHaveBeenCalled();

      buttons[9] = { pressed: true, value: 1 };
      frame(120);
      expect(session.phase).toBe("running");
      expect(sample).not.toHaveBeenCalled();
      expect(tick).not.toHaveBeenCalled();
      expect(scene.present).not.toHaveBeenCalled();
      frame(140);
      frame(160);
      expect(session.phase).toBe("running");
      expect(session.snapshot().simulationStep).toBeGreaterThan(paused.simulationStep);
      expect(scene.present).toHaveBeenCalled();

      session.pause();
      vi.mocked(performance.now).mockReturnValue(1_000);
      session.resume();
      frame(1_000);
      expect(scene.present).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.any(Number),
        1 / 240,
        expect.any(Number),
        false,
      );
    } finally {
      session.destroy();
    }
    expect(frames.size).toBe(0);
  });
});
