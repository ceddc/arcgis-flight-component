/**
 * Route eligible scene pointer gestures into the flight camera's orbit state.
 * The binding excludes controls, owns pointer capture for one active gesture
 * and restores the host element's touch style and listeners on teardown.
 */
import type { CameraDrag } from "../core/camera-drag";

/**
 * Enable one-pointer mouse/touch orbit while keeping UI controls and the flight stick independent.
 *
 * Touch gestures on the scene are consumed so ArcGIS navigation cannot compete
 * with the flight loop. A second touch cancels the active drag rather than
 * transferring control, and cancellation paths release pointer capture.
 *
 * @param surface Scene element or view container receiving gestures.
 * @param camera Camera-drag state machine that converts deltas to orbit input.
 * @param enabled Predicate checked before starting and while continuing a drag.
 * @returns A reset operation and a teardown operation that removes listeners/restores touch-action.
 */
export function bindCameraDrag(surface: HTMLElement, camera: CameraDrag, enabled: () => boolean): { reset(): void; destroy(): void } {
  // preventDefault on pointer events alone cannot stop the browser cancelling a
  // touch drag for scrolling/zooming. Restore the host's style on teardown.
  const previousTouchAction = surface.style.touchAction;
  surface.style.touchAction = "none";
  let pointer: number | null = null;
  const sceneTouches = new Set<number>();
  let x = 0;
  let y = 0;
  /** End the active drag and release pointer capture if the surface owns it. */
  const release = (): void => {
    const previous = pointer;
    pointer = null;
    camera.release();
    if (previous !== null && surface.hasPointerCapture(previous)) surface.releasePointerCapture(previous);
  };
  /** Consume scene touch gestures before ArcGIS can interpret them as navigation. */
  const consumeTouch = (event: PointerEvent): void => {
    event.preventDefault();
    // The flight loop owns the view. Do not pass touch gestures to ArcGIS navigation.
    event.stopPropagation();
  };
  /** Start an orbit only for an unmodified primary mouse/touch gesture outside UI controls. */
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
  /** Apply deltas to the captured pointer while continuously validating drag ownership. */
  const move = (event: PointerEvent): void => {
    if (event.pointerType === "touch" && sceneTouches.has(event.pointerId)) consumeTouch(event);
    if (event.pointerId !== pointer) return;
    if (!enabled() || (event.pointerType !== "touch" && !(event.buttons & 1))) { release(); return; }
    camera.move(event.clientX - x, event.clientY - y);
    x = event.clientX; y = event.clientY;
    event.preventDefault();
  };
  /** Forget a touch and end the active orbit when its controlling pointer lifts. */
  const end = (event: PointerEvent): void => {
    sceneTouches.delete(event.pointerId);
    if (event.pointerId === pointer) release();
  };
  /** Release the drag if the browser or host unexpectedly takes pointer capture away. */
  const lostCapture = (event: PointerEvent): void => { if (event.pointerId === pointer) release(); };
  /** Clear all touch tracking and stop the current drag on cancellation or blur. */
  const cancel = (): void => { sceneTouches.clear(); release(); };
  /** Cancel the gesture when the page is backgrounded. */
  const visibility = (): void => { if (document.hidden) cancel(); };
  /** Stop the gesture and reset the camera-look offset to neutral. */
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
    if (surface.style.touchAction === "none") surface.style.touchAction = previousTouchAction;
    surface.removeEventListener("pointerdown", down, { capture: true });
    surface.removeEventListener("pointermove", move, { capture: true });
    surface.removeEventListener("lostpointercapture", lostCapture);
    window.removeEventListener("pointerup", end, { capture: true });
    window.removeEventListener("pointercancel", end, { capture: true });
    window.removeEventListener("blur", cancel);
    document.removeEventListener("visibilitychange", visibility);
  } };
}
