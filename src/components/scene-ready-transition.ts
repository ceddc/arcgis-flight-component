/**
 * Decide how a flight session responds to ArcGIS scene readiness notifications.
 * These pure helpers normalize fatal scene errors and distinguish a temporary
 * not-ready state from a new map/view identity that requires reinitialization.
 */

/** Action the custom element should take after a ready-state notification. */
export type SceneReadyTransitionAction = "ignore" | "teardown" | "restart";
/** Stable error text used when ArcGIS reports no usable fatal-error object. */
export const DEFAULT_SCENE_READY_ERROR_MESSAGE =
  "The referenced arcgis-scene encountered a content or rendering error.";

/**
 * Normalize ArcGIS-shaped fatal errors into an Error with the original as its cause.
 *
 * Some SDK error values are plain objects rather than `Error` instances, so the
 * message/name are copied based on their shape and the source object is retained.
 *
 * @param value Error-like value from `arcgisViewReadyError`.
 * @returns A usable Error instance for status/events and rejected start promises.
 */
export function resolveSceneReadyError(value: unknown): Error {
  if (!value || typeof value !== "object") {
    return new Error(DEFAULT_SCENE_READY_ERROR_MESSAGE);
  }
  const candidate = value as { name?: unknown; message?: unknown };
  const message = typeof candidate.message === "string" && candidate.message.trim()
    ? candidate.message
    : DEFAULT_SCENE_READY_ERROR_MESSAGE;
  const error = new Error(message, { cause: value });
  if (typeof candidate.name === "string" && candidate.name.trim()) {
    error.name = candidate.name;
  }
  return error;
}

/** Facts needed to decide whether a ready-state change requires restart or teardown. */
export interface SceneReadyTransitionInput {
  ready: boolean;
  transitionPending: boolean;
  identityChanged: boolean;
}

/**
 * Choose how to react to readiness and scene-identity changes.
 *
 * A not-ready transition tears down a current session once. Readiness returning
 * or a map/view identity change restarts initialization; repeated notifications
 * for an unchanged stable scene are ignored.
 *
 * @param input Current readiness, pending-transition and identity state.
 * @returns `teardown`, `restart` or `ignore` for the custom-element lifecycle.
 */
export function sceneReadyTransitionAction(
  input: SceneReadyTransitionInput,
): SceneReadyTransitionAction {
  if (!input.ready) {
    return input.transitionPending ? "ignore" : "teardown";
  }
  return input.transitionPending || input.identityChanged
    ? "restart"
    : "ignore";
}
