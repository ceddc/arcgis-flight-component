import type { CameraDrag } from "../core/camera-drag";

/** One-pointer scene orbit; UI controls and the flight stick keep their own input. */
export function bindCameraDrag(surface: HTMLElement, camera: CameraDrag, enabled: () => boolean): { reset(): void; destroy(): void } {
  let pointer: number | null = null;
  const sceneTouches = new Set<number>();
  let x = 0;
  let y = 0;
  const release = (): void => {
    const previous = pointer;
    pointer = null;
    camera.release();
    if (previous !== null && surface.hasPointerCapture(previous)) surface.releasePointerCapture(previous);
  };
  const consumeTouch = (event: PointerEvent): void => {
    event.preventDefault();
    // The flight loop owns the view. Do not pass touch gestures to ArcGIS navigation.
    event.stopPropagation();
  };
  const down = (event: PointerEvent): void => {
    for (const target of event.composedPath()) {
      if (target === surface) break;
      if (target instanceof Element && (target.localName?.startsWith("calcite-") || target.matches(
        "button, a, input, select, textarea, [contenteditable], [role='button'], [role='radio'], [role='checkbox'], [role='switch'], [role='slider'], [role='combobox'], [role='tab'], [role='toolbar'], [role='menu'], [role='dialog'], [data-flight-stick], arcgis-plane-navigation",
      ))) return;
    }
    if (event.pointerType === "touch") {
      sceneTouches.add(event.pointerId);
      consumeTouch(event);
      // A second finger ends the look; lifting it never hands off to another finger.
      if (sceneTouches.size > 1) { release(); return; }
    }
    if (!enabled() || pointer !== null || !["mouse", "touch"].includes(event.pointerType)
      || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    pointer = event.pointerId;
    x = event.clientX; y = event.clientY;
    camera.begin();
    surface.setPointerCapture(pointer);
    surface.focus({ preventScroll: true });
    event.preventDefault();
  };
  const move = (event: PointerEvent): void => {
    if (event.pointerType === "touch" && sceneTouches.has(event.pointerId)) consumeTouch(event);
    if (event.pointerId !== pointer) return;
    if (!enabled() || (event.pointerType !== "touch" && !(event.buttons & 1))) { release(); return; }
    camera.move(event.clientX - x, event.clientY - y);
    x = event.clientX; y = event.clientY;
    event.preventDefault();
  };
  const end = (event: PointerEvent): void => {
    sceneTouches.delete(event.pointerId);
    if (event.pointerId === pointer) release();
  };
  const lostCapture = (event: PointerEvent): void => { if (event.pointerId === pointer) release(); };
  const cancel = (): void => { sceneTouches.clear(); release(); };
  const visibility = (): void => { if (document.hidden) cancel(); };
  const reset = (): void => { cancel(); camera.reset(); };
  surface.addEventListener("pointerdown", down, { capture: true });
  surface.addEventListener("pointermove", move, { capture: true });
  surface.addEventListener("lostpointercapture", lostCapture);
  window.addEventListener("pointerup", end, { capture: true });
  window.addEventListener("pointercancel", end, { capture: true });
  window.addEventListener("blur", cancel);
  document.addEventListener("visibilitychange", visibility);
  return { reset, destroy(): void {
    reset();
    surface.removeEventListener("pointerdown", down, { capture: true });
    surface.removeEventListener("pointermove", move, { capture: true });
    surface.removeEventListener("lostpointercapture", lostCapture);
    window.removeEventListener("pointerup", end, { capture: true });
    window.removeEventListener("pointercancel", end, { capture: true });
    window.removeEventListener("blur", cancel);
    document.removeEventListener("visibilitychange", visibility);
  } };
}
