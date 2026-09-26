/**
 * Guards scene-owned keyboard, gamepad, touch, and host control normalization.
 * Simulated DOM and gamepad inputs cover focus/editable handling, multi-pad
 * selection, dead zones, one-shot actions, patch precedence, and listener cleanup.
 */
import { describe, expect, it, vi } from "vitest";
import {
  applyGamepadDeadzone,
  DEFAULT_FLIGHT_INPUT_SETTINGS,
  FlightInputController,
  flightGamepadActivity,
  sanitizeFlightInputSettings,
  selectFlightGamepad,
  shouldCaptureFlightKey,
  type FlightGamepadReading,
} from "./flight-input";

type TestListener = EventListenerOrEventListenerObject;

class FakeEventHub {
  readonly listeners = new Map<string, Set<TestListener>>();
  readonly navigator = { getGamepads: () => [] as (FlightGamepadReading | null)[] };

  addEventListener(type: string, listener: TestListener): void {
    const listeners = this.listeners.get(type) ?? new Set<TestListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: TestListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }

  get listenerCount(): number {
    return [...this.listeners.values()].reduce((total, listeners) => total + listeners.size, 0);
  }
}

interface FakeElement {
  ownerDocument?: Document;
  matches(selector: string): boolean;
  contains(candidate: unknown): boolean;
}

interface TestKeyboardState {
  readonly event: KeyboardEvent;
  readonly prevented: () => boolean;
  readonly stopped: () => boolean;
}

function fakeElement(kind = "none"): FakeElement {
  return {
    matches: (selector) => kind === "editable"
      ? selector.includes("input")
      : kind === "radio"
        ? selector.includes("[role='radio']")
        : kind === "activation" && selector.includes("button"),
    contains: () => false,
  };
}

function keyboardEvent(
  code: string,
  path: readonly EventTarget[],
  options: { repeat?: boolean; ctrlKey?: boolean; altKey?: boolean } = {},
): TestKeyboardState {
  let prevented = false;
  let stopped = false;
  const event = {
    code,
    key: code,
    repeat: options.repeat ?? false,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: false,
    altKey: options.altKey ?? false,
    isComposing: false,
    target: path[0] ?? null,
    composedPath: () => [...path],
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  } as unknown as KeyboardEvent;
  return { event, prevented: () => prevented, stopped: () => stopped };
}

function pointerEvent(path: readonly EventTarget[]): PointerEvent {
  return {
    target: path[0] ?? null,
    composedPath: () => [...path],
  } as unknown as PointerEvent;
}

function gamepad(
  index: number,
  options: Partial<FlightGamepadReading> = {},
): FlightGamepadReading {
  return {
    index,
    id: "Gamepad " + index,
    mapping: "standard",
    connected: true,
    timestamp: index,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
    ...options,
  };
}

function harness(options: {
  settings?: ConstructorParameters<typeof FlightInputController>[0]["settings"];
  getGamepads?: () => readonly (FlightGamepadReading | null)[];
  onPauseRequested?: () => void;
  onRecoverRequested?: () => void;
  onPowerModeStepRequested?: (direction: "faster" | "slower") => void;
} = {}) {
  const view = new FakeEventHub();
  const document = new FakeEventHub() as FakeEventHub & {
    activeElement: Element | null;
    body: HTMLElement;
    defaultView: Window;
    visibilityState: DocumentVisibilityState;
    hasFocus: () => boolean;
  };
  const body = fakeElement();
  document.activeElement = body as unknown as Element;
  document.body = body as unknown as HTMLElement;
  document.defaultView = view as unknown as Window;
  document.visibilityState = "visible";
  document.hasFocus = () => true;
  const scene = fakeElement() as FakeElement & { ownerDocument: Document };
  scene.ownerDocument = document as unknown as Document;
  scene.contains = (candidate) => candidate === scene;
  const controller = new FlightInputController({
    target: scene as unknown as HTMLElement,
    ...options,
  });
  return { body, controller, document, scene, view };
}

describe("flight input settings and helpers", () => {
  it("ignores a stuck Guide button when choosing between gamepads", () => {
    const virtual = gamepad(0);
    (virtual.buttons as GamepadButton[])[16] = { pressed: true, value: 1 } as GamepadButton;
    const physical = gamepad(1, { axes: [.6, 0] });
    expect(flightGamepadActivity(virtual)).toBe(0);
    expect(selectFlightGamepad([virtual, physical], null)).toBe(physical);
  });

  it("applies sensitivity and inversion to touch without clearing a host control patch", () => {
    const { controller, view, scene } = harness({ settings: { sensitivity: .5, invertPitch: true } });
    view.emit("pointerdown", pointerEvent([scene as unknown as EventTarget]));
    controller.setControlPatch({ accelerate: .7 });
    controller.setTouchStick(1, 1);
    expect(controller.sample()).toMatchObject({ bank: .5, pitch: -.5, accelerate: .7 });
    controller.setTouchStick(0, 0);
    expect(controller.sample()).toMatchObject({ bank: 0, pitch: 0, accelerate: .7 });
    controller.setTouchStick(1, 1);
    view.emit("blur", new Event("blur"));
    expect(controller.sample()).toMatchObject({ bank: 0, pitch: 0 });
    controller.destroy();
  });

  it("keeps a held arrow through repeats on scene controls, but ignores new presses there", () => {
    const { controller, view, scene } = harness();
    const sceneTarget = scene as unknown as EventTarget;
    const button = fakeElement("activation") as unknown as EventTarget;
    view.emit("pointerdown", pointerEvent([sceneTarget]));
    view.emit("keydown", keyboardEvent("ArrowRight", [sceneTarget]).event);
    expect(controller.sample(.1).bank).toBeGreaterThan(0);
    view.emit("keydown", keyboardEvent("ArrowRight", [button, sceneTarget], { repeat: true }).event);
    expect(controller.sample(.1).bank).toBeGreaterThan(0);
    view.emit("keyup", keyboardEvent("ArrowRight", [button, sceneTarget]).event);
    controller.clear();
    view.emit("keydown", keyboardEvent("ArrowRight", [button, sceneTarget]).event);
    expect(controller.sample(.1).bank).toBe(0);
    controller.destroy();
  });

  it("uses the documented defaults and clamps configurable ranges", () => {
    expect(DEFAULT_FLIGHT_INPUT_SETTINGS).toMatchObject({
      sensitivity: 0.8,
      invertPitch: true,
      keyboardEnabled: true,
      gamepadEnabled: true,
    });
    expect(sanitizeFlightInputSettings({ sensitivity: 9, gamepadDeadzone: -1 })).toMatchObject({
      sensitivity: 2,
      gamepadDeadzone: 0,
      invertPitch: true,
    });
    expect(sanitizeFlightInputSettings({ sensitivity: 0.1, invertPitch: false }).sensitivity).toBe(0.5);
  });

  it("uses a rescaled gamepad deadzone", () => {
    expect(applyGamepadDeadzone(0.17, 0.18)).toBe(0);
    expect(applyGamepadDeadzone(0.59, 0.18)).toBeCloseTo(0.5);
    expect(applyGamepadDeadzone(-1, 0.18)).toBe(-1);
  });

  it("does not capture typing or unrelated keys", () => {
    expect(shouldCaptureFlightKey("KeyW", "editable")).toBe(false);
    expect(shouldCaptureFlightKey("ArrowLeft", "editable")).toBe(false);
    expect(shouldCaptureFlightKey("KeyW", "activation")).toBe(true);
    expect(shouldCaptureFlightKey("Tab", "none")).toBe(false);
  });

  it.each(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"])(
    "leaves %s available to activation controls",
    (code) => expect(shouldCaptureFlightKey(code, "activation")).toBe(false),
  );
});

describe("flight gamepad locking", () => {
  it("waits for deliberate input between duplicates and keeps the chosen slot", () => {
    const idle = gamepad(0);
    const duplicate = gamepad(2);
    expect(selectFlightGamepad([idle, null, duplicate], null, new Set([0, 2]))).toBeNull();

    const active = gamepad(2, { axes: [0.72, -0.64, 0, 0] });
    expect(selectFlightGamepad([idle, null, active], null, new Set([0, 2]))).toBe(active);
    expect(selectFlightGamepad([gamepad(0, { buttons: [{ pressed: true, value: 1 }] }), null, active], 2)).toBe(active);
  });

  it("ignores non-standard controllers and unarmed pinned axes", () => {
    const nonStandard = gamepad(0, { mapping: "", axes: [0.8, 0, 0, 0] });
    const ready = gamepad(1, { axes: [0.6, 0, 0, 0] });
    const pinned = gamepad(2, { axes: [1, 0.05, 0, 0] });
    expect(selectFlightGamepad([nonStandard, ready, pinned], null, new Set([1]))).toBe(ready);
  });
});

describe("scene-scoped FlightInputController", () => {
  it("captures flight keys only after the target scene owns interaction", () => {
    const { body, controller, scene, view } = harness();
    const beforeInteraction = keyboardEvent("KeyW", [body as unknown as EventTarget, view as unknown as EventTarget]);
    view.emit("keydown", beforeInteraction.event);
    expect(beforeInteraction.prevented()).toBe(false);
    expect(controller.sample(0.1).pitch).toBe(0);

    view.emit("pointerdown", pointerEvent([scene as unknown as EventTarget, view as unknown as EventTarget]));
    const owned = keyboardEvent("KeyW", [body as unknown as EventTarget, view as unknown as EventTarget]);
    view.emit("keydown", owned.event);
    expect(owned.prevented()).toBe(true);
    expect(owned.stopped()).toBe(true);
    expect(controller.sample(0.1).pitch).toBeLessThan(0);

    view.emit("pointerdown", pointerEvent([body as unknown as EventTarget, view as unknown as EventTarget]));
    const unrelated = keyboardEvent("KeyD", [body as unknown as EventTarget, view as unknown as EventTarget]);
    view.emit("keydown", unrelated.event);
    expect(unrelated.prevented()).toBe(false);
    expect(controller.sample(0.1).bank).toBe(0);
  });

  it("never consumes an editable control inside the scene", () => {
    const { controller, scene, view } = harness();
    const editable = fakeElement("editable");
    const event = keyboardEvent("ArrowLeft", [
      editable as unknown as EventTarget,
      scene as unknown as EventTarget,
      view as unknown as EventTarget,
    ]);
    view.emit("keydown", event.event);
    expect(event.prevented()).toBe(false);
    expect(controller.sample(0.1).bank).toBe(0);
  });

  it.each(["activation", "radio"].flatMap(kind =>
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].map(code => ({ kind, code })),
  ))("leaves $code available to a $kind control inside the scene", ({ kind, code }) => {
      const { controller, scene, view } = harness();
      const activation = fakeElement(kind);
      const event = keyboardEvent(code, [
        activation as unknown as EventTarget,
        scene as unknown as EventTarget,
        view as unknown as EventTarget,
      ]);

      view.emit("keydown", event.event);

      expect(event.prevented()).toBe(false);
      expect(event.stopped()).toBe(false);
      expect(controller.sample(0.1)).toMatchObject({
        pitch: 0,
        bank: 0,
        yaw: 0,
        brake: 0,
        airbrake: false,
      });
    },
  );

  it("uses Alt+R for one-frame recovery without key-repeat duplication", () => {
    const onPauseRequested = vi.fn();
    const onRecoverRequested = vi.fn();
    const { controller, scene, view } = harness({ onPauseRequested, onRecoverRequested });
    const path = [scene as unknown as EventTarget, view as unknown as EventTarget];
    view.emit("keydown", keyboardEvent("Escape", path).event);
    view.emit("keydown", keyboardEvent("Escape", path, { repeat: true }).event);
    const plainR = keyboardEvent("KeyR", path);
    view.emit("keydown", plainR.event);
    const plainRUp = keyboardEvent("KeyR", path);
    view.emit("keyup", plainRUp.event);
    view.emit("keydown", keyboardEvent("KeyR", path, { altKey: true }).event);
    view.emit("keydown", keyboardEvent("KeyR", path, { altKey: true, repeat: true }).event);

    expect(onPauseRequested).toHaveBeenCalledTimes(1);
    expect(plainR.prevented()).toBe(false);
    expect(plainR.stopped()).toBe(false);
    expect(plainRUp.prevented()).toBe(false);
    expect(plainRUp.stopped()).toBe(false);
    expect(onRecoverRequested).toHaveBeenCalledTimes(1);
    expect(controller.sample().respawn).toBe(true);
    expect(controller.sample().respawn).toBe(false);
  });

  it("applies and selectively clears authoritative programmatic patches", () => {
    const onRecoverRequested = vi.fn();
    const { controller } = harness({ onRecoverRequested });
    controller.setControlPatch({
      pitch: 4,
      bank: -0.4,
      accelerate: 0.7,
      turboBoost: true,
      respawn: true,
    });
    expect(controller.sample()).toMatchObject({
      pitch: 1,
      bank: -0.4,
      accelerate: 0.7,
      turboBoost: true,
      respawn: true,
    });
    expect(onRecoverRequested).toHaveBeenCalledTimes(1);

    controller.clearControlPatch(["pitch", "turboBoost"]);
    expect(controller.sample()).toMatchObject({ pitch: 0, bank: -0.4, turboBoost: false, respawn: false });
  });

  it("uses and retains one active standard gamepad only while the scene is active", () => {
    let gamepads: readonly (FlightGamepadReading | null)[] = [gamepad(0), null, gamepad(2)];
    const { body, controller, scene, view } = harness({ getGamepads: () => gamepads });
    view.emit("pointerdown", pointerEvent([scene as unknown as EventTarget, view as unknown as EventTarget]));
    controller.sample();
    expect(controller.gamepadStatus.index).toBeNull();

    const active = gamepad(2, { axes: [0.7, -0.7, 0, 0] });
    gamepads = [gamepad(0), null, active];
    const frame = controller.sample();
    expect(controller.gamepadStatus.index).toBe(2);
    expect(frame.bank).toBeGreaterThan(0);
    expect(frame.pitch).toBeLessThan(0);

    gamepads = [gamepad(0, { buttons: [{ pressed: false, value: 0 }, { pressed: false, value: 0 }, { pressed: false, value: 0 }, { pressed: false, value: 0 }, { pressed: false, value: 0 }, { pressed: true, value: 1 }] }), null, gamepad(2)];
    expect(controller.sample().yaw).toBe(0);
    expect(controller.gamepadStatus.index).toBe(2);

    view.emit("pointerdown", pointerEvent([body as unknown as EventTarget, view as unknown as EventTarget]));
    expect(controller.sample().bank).toBe(0);
    expect(controller.gamepadStatus.index).toBe(2);
  });

  it.each(["unfocused", "hidden"] as const)(
    "releases hardware input when %s with the scene still active",
    (state) => {
      let gamepads = [gamepad(0)];
      const onPauseRequested = vi.fn();
      const { controller, document, scene, view } = harness({
        getGamepads: () => gamepads,
        onPauseRequested,
      });
      document.activeElement = scene as unknown as Element;
      controller.sample();
      gamepads = [gamepad(0, { axes: [0.8, 0, 0, 0] })];
      const path = [scene as unknown as EventTarget, view as unknown as EventTarget];
      view.emit("keydown", keyboardEvent("KeyE", path).event);
      expect(controller.sample(0.1).bank).toBeGreaterThan(0);

      if (state === "unfocused") document.hasFocus = () => false;
      else document.visibilityState = "hidden";
      (state === "unfocused" ? view : document).emit(
        state === "unfocused" ? "blur" : "visibilitychange",
        new Event(state),
      );
      controller.setControlPatch({ pitch: 0.4 });
      const buttons = gamepad(0).buttons.map((button) => ({ ...button }));
      buttons[9] = { pressed: true, value: 1 };
      gamepads = [gamepad(0, { axes: [0.8, 0, 0, 0], buttons })];

      const key = keyboardEvent("KeyD", path);
      view.emit("keydown", key.event);
      expect(document.activeElement).toBe(scene);
      expect(controller.sample(0.1)).toMatchObject({ pitch: 0.4, bank: 0, yaw: 0 });
      expect(key.prevented()).toBe(false);
      expect(onPauseRequested).not.toHaveBeenCalled();

      document.hasFocus = () => true;
      document.visibilityState = "visible";
      expect(controller.sample().bank).toBeGreaterThan(0);
      expect(onPauseRequested).not.toHaveBeenCalled();
      controller.destroy();
    },
  );

  it("steps power mode once per D-pad press", () => {
    const onPowerModeStepRequested = vi.fn();
    let gamepads: readonly (FlightGamepadReading | null)[] = [gamepad(0)];
    const { controller, scene, view } = harness({
      getGamepads: () => gamepads,
      onPowerModeStepRequested,
    });
    view.emit("pointerdown", pointerEvent([
      scene as unknown as EventTarget,
      view as unknown as EventTarget,
    ]));

    const fasterButtons = gamepad(0).buttons.map((button) => ({ ...button }));
    fasterButtons[12] = { pressed: true, value: 1 };
    gamepads = [gamepad(0, { buttons: fasterButtons })];
    controller.sample();
    controller.sample();

    gamepads = [gamepad(0)];
    controller.sample();
    const slowerButtons = gamepad(0).buttons.map((button) => ({ ...button }));
    slowerButtons[13] = { pressed: true, value: 1 };
    gamepads = [gamepad(0, { buttons: slowerButtons })];
    controller.sample();

    expect(onPowerModeStepRequested.mock.calls).toEqual([
      ["faster"],
      ["slower"],
    ]);
  });

  it("detaches every listener and becomes inert on destroy", () => {
    const onPauseRequested = vi.fn();
    const { controller, document, scene, view } = harness({ onPauseRequested });
    expect(view.listenerCount).toBeGreaterThan(0);
    expect(document.listenerCount).toBe(1);
    controller.destroy();
    controller.destroy();
    expect(view.listenerCount).toBe(0);
    expect(document.listenerCount).toBe(0);

    view.emit("keydown", keyboardEvent("Escape", [scene as unknown as EventTarget]).event);
    expect(onPauseRequested).not.toHaveBeenCalled();
    expect(controller.sample()).toEqual({
      pitch: 0,
      bank: 0,
      yaw: 0,
      accelerate: 0,
      turboBoost: false,
      brake: 0,
      airbrake: false,
      respawn: false,
    });
  });
});
