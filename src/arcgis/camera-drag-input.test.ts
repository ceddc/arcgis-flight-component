import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraDrag } from "../core/camera-drag";
import { bindCameraDrag } from "./camera-drag-input";

class Surface extends EventTarget {
  captured: number | null = null;
  interactive = false;
  classList = { add: vi.fn(), remove: vi.fn() };
  focus = vi.fn();
  matches(): boolean { return this.interactive; }
  setPointerCapture(id: number): void { this.captured = id; }
  hasPointerCapture(id: number): boolean { return this.captured === id; }
  releasePointerCapture(): void { this.captured = null; }
}
function setup(enabled = () => true) {
  const surface = new Surface();
  const windowTarget = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("window", windowTarget);
  vi.stubGlobal("document", documentTarget);
  vi.stubGlobal("Element", Surface);
  const camera = new CameraDrag();
  const binding = bindCameraDrag(surface as unknown as HTMLElement, camera, enabled);
  const pointer = (type: string, patch = {}, target: EventTarget = surface): void => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, pointerType: "mouse", button: 0, buttons: 1,
      clientX: 0, clientY: 0, composedPath: () => surface.interactive ? [Object.assign(new Surface(), { interactive: true }), surface] : [surface], ...patch });
    target.dispatchEvent(event);
  };
  return { surface, camera, binding, pointer, windowTarget, documentTarget };
}
afterEach(() => vi.unstubAllGlobals());

describe("scene camera gesture", () => {
  it.each(["mouse", "touch"])("ignores %s drags in FPV or during a camera transition", pointerType => {
    let exterior = false;
    const { camera, binding, pointer } = setup(() => exterior);
    pointer("pointerdown", { pointerType }); pointer("pointermove", { pointerType, clientX: 100 });
    expect(camera.dragging).toBe(false);
    expect(camera.offset.yawDegrees).toBe(0);
    exterior = true;
    pointer("pointerdown", { pointerType }); pointer("pointermove", { pointerType, clientX: 100 });
    expect(camera.dragging).toBe(true);
    exterior = false;
    binding.reset();
    pointer("pointermove", { clientX: 200 });
    expect(camera.dragging).toBe(false);
    expect(camera.offset.yawDegrees).toBe(0);
    binding.destroy();
  });

  it("captures a left drag and releases outside the scene", () => {
    const { surface, camera, binding, pointer, windowTarget } = setup();
    pointer("pointerdown"); pointer("pointermove", { clientX: 100, clientY: 30 });
    expect(surface.captured).toBe(1);
    expect(camera.offset.yawDegrees).not.toBe(0);
    pointer("pointerup", {}, windowTarget);
    expect(camera.dragging).toBe(false);
    expect(surface.captured).toBeNull();
    for (let i = 0; i < 60; i++) camera.update(1 / 60);
    expect(camera.offset).toEqual({ yawDegrees: 0, pitchDegrees: 0 });
    binding.destroy();
  });

  it.each([{ pointerType: "pen" }, { button: 2 }, { ctrlKey: true }])(
    "leaves other gestures alone: %o", patch => {
      const { camera, binding, pointer } = setup();
      pointer("pointerdown", patch); pointer("pointermove", { clientX: 100 });
      expect(camera.dragging).toBe(false);
      expect(camera.offset.yawDegrees).toBe(0);
      binding.destroy();
    },
  );

  it("leaves scene links alone and ignores a second pointer", () => {
    const { surface, camera, binding, pointer } = setup();
    surface.interactive = true; pointer("pointerdown");
    expect(camera.dragging).toBe(false);
    surface.interactive = false; pointer("pointerdown");
    pointer("pointermove", { pointerId: 2, clientX: 100 });
    expect(camera.offset.yawDegrees).toBe(0);
    binding.destroy();
  });

  it.each(["pointercancel", "lostpointercapture", "blur", "visibilitychange", "missing-button"])(
    "releases a held look on %s", reason => {
      const { camera, binding, pointer, windowTarget, documentTarget } = setup();
      pointer("pointerdown"); pointer("pointermove", { clientX: 100 });
      if (reason === "blur") windowTarget.dispatchEvent(new Event("blur"));
      else if (reason === "visibilitychange") {
        documentTarget.hidden = true; documentTarget.dispatchEvent(new Event("visibilitychange"));
      } else if (reason === "missing-button") pointer("pointermove", { buttons: 0 });
      else pointer(reason, {}, reason === "pointercancel" ? windowTarget : undefined);
      expect(camera.dragging).toBe(false);
      for (let i = 0; i < 60; i++) camera.update(1 / 60);
      expect(camera.offset.yawDegrees).toBe(0);
      binding.destroy();
    },
  );

  it("orbits with a non-primary touch while the other hand uses a control, then eases home", () => {
    const { surface, camera, binding, pointer, windowTarget } = setup();
    pointer("pointerdown", { pointerType: "touch", isPrimary: false, pointerId: 2 });
    pointer("pointermove", { pointerType: "touch", pointerId: 2, buttons: 0, clientX: 100, clientY: 30 });
    expect(surface.captured).toBe(2);
    expect(camera.offset).toEqual({ yawDegrees: -24, pitchDegrees: 6 });
    pointer("pointerup", { pointerId: 1 }, windowTarget);
    expect(camera.dragging).toBe(true);
    pointer("pointerup", { pointerId: 2 }, windowTarget);
    expect(camera.dragging).toBe(false);
    expect(surface.captured).toBeNull();
    expect(camera.update(0)).toEqual({ yawDegrees: -24, pitchDegrees: 6 });
    for (let i = 0; i < 60; i++) camera.update(1 / 60);
    expect(camera.offset).toEqual({ yawDegrees: 0, pitchDegrees: 0 });
    binding.destroy();
  });

  it("ends the orbit on a second scene finger and waits for a fresh gesture", () => {
    const { camera, binding, pointer, windowTarget } = setup();
    pointer("pointerdown", { pointerType: "touch" });
    pointer("pointermove", { pointerType: "touch", clientX: 80 });
    pointer("pointerdown", { pointerType: "touch", pointerId: 2 });
    const held = camera.offset;
    expect(camera.dragging).toBe(false);
    pointer("pointermove", { pointerType: "touch", clientX: 200 });
    pointer("pointermove", { pointerType: "touch", pointerId: 2, clientX: -100 });
    expect(camera.offset).toEqual(held);
    pointer("pointerup", { pointerId: 2 }, windowTarget);
    pointer("pointermove", { pointerType: "touch", clientX: 250 });
    expect(camera.dragging).toBe(false);
    pointer("pointerup", {}, windowTarget);
    pointer("pointerdown", { pointerType: "touch", pointerId: 3 });
    expect(camera.dragging).toBe(true);
    binding.destroy();
  });

  it.each(["pointercancel", "lostpointercapture", "blur"])("recovers from interrupted touch input: %s", reason => {
    const { camera, binding, pointer, windowTarget } = setup();
    pointer("pointerdown", { pointerType: "touch" });
    pointer("pointermove", { pointerType: "touch", clientX: 100 });
    if (reason === "blur") windowTarget.dispatchEvent(new Event("blur"));
    else pointer(reason, { pointerType: "touch" }, reason === "pointercancel" ? windowTarget : undefined);
    expect(camera.dragging).toBe(false);
    pointer("pointerup", {}, windowTarget);
    pointer("pointerdown", { pointerType: "touch", pointerId: 2 });
    expect(camera.dragging).toBe(true);
    binding.destroy();
  });

  it("cleans up capture and event listeners on teardown", () => {
    const { surface, camera, binding, pointer } = setup();
    pointer("pointerdown"); pointer("pointermove", { clientX: 100 }); binding.destroy();
    expect(surface.captured).toBeNull();
    pointer("pointerdown"); pointer("pointermove", { clientX: 200 });
    expect(camera.dragging).toBe(false);
    expect(camera.offset.yawDegrees).toBe(0);
  });
});

it.each(["mouse", "touch"])("leaves Calcite shadow controls and their %s events alone", pointerType => {
  const { camera, binding, pointer } = setup();
  const calcite = Object.assign(new Surface(), { localName: "calcite-radio-group-item" });
  const preventDefault = vi.fn();
  pointer("pointerdown", { pointerType, composedPath: () => [calcite], preventDefault });
  pointer("pointermove", { pointerType, clientX: 100, preventDefault });
  expect(camera.dragging).toBe(false);
  expect(preventDefault).not.toHaveBeenCalled();
  binding.destroy();
});
