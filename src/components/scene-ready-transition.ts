export type SceneReadyTransitionAction = "ignore" | "teardown" | "restart";
export const DEFAULT_SCENE_READY_ERROR_MESSAGE =
  "The referenced arcgis-scene encountered a content or rendering error.";

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

export interface SceneReadyTransitionInput {
  ready: boolean;
  transitionPending: boolean;
  identityChanged: boolean;
}

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
