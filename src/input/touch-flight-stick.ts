/**
 * Binds a touch or pressed-pointer gesture to a visual flight stick element.
 *
 * Pointer capture keeps one gesture active at a time. Movement is converted
 * to normalized bank/pitch axes and reflected in CSS variables; cancellation,
 * visibility loss, reset, and teardown all return the stick to neutral.
 */
/**
 * Binds a one-finger stick gesture and reports normalized bank/pitch axes.
 * The binding returns to neutral and releases capture on cancellation, focus loss, or teardown.
 * @param stick Element that captures the pointer and displays the stick position.
 * @param onMove Receives normalized bank and pitch values in `[-1, 1]`.
 * @returns Reset and teardown operations for the binding.
 */
export function bindTouchFlightStick(
  stick: HTMLElement,
  onMove: (bank: number, pitch: number) => void,
): { reset(): void; destroy(): void } {
  const document = stick.ownerDocument;
  const view = document.defaultView!;
  let pointer: number | null = null;
  let bounds: DOMRect | null = null;
  const reset = (): void => {
    const released = pointer;
    pointer = null;
    bounds = null;
    if (released !== null && stick.hasPointerCapture(released)) stick.releasePointerCapture(released);
    stick.style.setProperty("--stick-x", "0px");
    stick.style.setProperty("--stick-y", "0px");
    onMove(0, 0);
  };
  const move = (event: PointerEvent): void => {
    if (event.pointerId !== pointer) return;
    if (event.pointerType !== "touch" && !(event.buttons & 1)) { reset(); return; }
    bounds ??= stick.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width * .36);
    const y = -(event.clientY - bounds.top - bounds.height / 2) / (bounds.height * .36);
    // Clamp to a circle so diagonal drags stay inside the pad.
    const length = Math.max(1, Math.hypot(x, y));
    const bank = x / length;
    const pitch = y / length;
    stick.style.setProperty("--stick-x", `${bank * bounds.width * .23}px`);
    stick.style.setProperty("--stick-y", `${-pitch * bounds.height * .23}px`);
    onMove(bank, pitch);
    event.preventDefault();
  };
  const down = (event: PointerEvent): void => {
    if (pointer !== null || event.button !== 0 || stick.hasAttribute("disabled")) return;
    event.preventDefault();
    pointer = event.pointerId;
    bounds = stick.getBoundingClientRect();
    stick.setPointerCapture(pointer);
    move(event);
  };
  const release = (event: PointerEvent): void => { if (event.pointerId === pointer) reset(); };
  const visibility = (): void => { if (document.hidden) reset(); };
  stick.addEventListener("pointerdown", down);
  stick.addEventListener("pointermove", move);
  stick.addEventListener("lostpointercapture", release);
  view.addEventListener("pointerup", release, true);
  view.addEventListener("pointercancel", release, true);
  view.addEventListener("blur", reset);
  // Rotation can move the pad under a held finger; require a fresh gesture.
  view.addEventListener("resize", reset);
  document.addEventListener("visibilitychange", visibility);
  return { reset, destroy(): void {
    reset();
    stick.removeEventListener("pointerdown", down);
    stick.removeEventListener("pointermove", move);
    stick.removeEventListener("lostpointercapture", release);
    view.removeEventListener("pointerup", release, true);
    view.removeEventListener("pointercancel", release, true);
    view.removeEventListener("blur", reset);
    view.removeEventListener("resize", reset);
    document.removeEventListener("visibilitychange", visibility);
  } };
}
