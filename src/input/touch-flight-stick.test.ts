/**
 * Guards the pointer binding used by the on-screen flight stick.
 * The suite checks normalized movement, pointer capture, and neutral reset
 * when a gesture ends, is canceled, or the binding is destroyed.
 */
import { describe, expect, it, vi } from "vitest";
import { bindTouchFlightStick } from "./touch-flight-stick";

function setup() {
  const view = new EventTarget();
  const document = Object.assign(new EventTarget(), { defaultView: view, hidden: false });
  let captured: number | null = null;
  const stick = Object.assign(new EventTarget(), {
    ownerDocument: document,
    style: { setProperty: vi.fn() },
    hasAttribute: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    setPointerCapture: (id: number) => { captured = id; },
    hasPointerCapture: (id: number) => captured === id,
    releasePointerCapture: () => { captured = null; },
  });
  const onMove = vi.fn();
  const binding = bindTouchFlightStick(stick as unknown as HTMLElement, onMove);
  const pointer = (type: string, patch = {}, target: EventTarget = stick): void => {
    target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), {
      pointerId: 1, pointerType: "touch", button: 0, buttons: 1, clientX: 86, clientY: 50, ...patch,
    }));
  };
  return { view, document, stick, onMove, binding, pointer };
}

describe("touch flight stick", () => {
  it("keeps one finger, bounds diagonal input, and releases without a stuck axis", () => {
    const { pointer, onMove, view, binding } = setup();
    pointer("pointerdown");
    expect(onMove).toHaveBeenLastCalledWith(1, -0);
    pointer("pointerdown", { pointerId: 2, clientX: 14 });
    pointer("pointermove", { pointerId: 2, clientX: 14 });
    expect(onMove).toHaveBeenCalledTimes(1);
    pointer("pointermove", { clientX: 200, clientY: -100 });
    const [bank, pitch] = onMove.mock.lastCall!;
    expect(Math.hypot(bank, pitch)).toBeCloseTo(1);
    pointer("pointerup", {}, view);
    expect(onMove).toHaveBeenLastCalledWith(0, 0);
    binding.destroy();
  });

  it.each(["pointercancel", "lostpointercapture", "blur", "resize", "hidden", "destroy"])(
    "releases a held stick on %s", reason => {
      const { pointer, onMove, view, document, stick, binding } = setup();
      pointer("pointerdown");
      if (reason === "hidden") {
        document.hidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
      } else if (reason === "destroy") binding.destroy();
      else if (reason === "blur" || reason === "resize") view.dispatchEvent(new Event(reason));
      else pointer(reason, {}, reason === "lostpointercapture" ? stick : view);
      expect(onMove).toHaveBeenLastCalledWith(0, 0);
      onMove.mockClear();
      pointer("pointermove", { clientX: 14 });
      expect(onMove).not.toHaveBeenCalled();
      binding.destroy();
    },
  );
});
