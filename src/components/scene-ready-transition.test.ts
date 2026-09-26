/**
 * Safeguard lifecycle decisions after ArcGIS scene readiness changes.
 * Repeated not-ready notifications tear down once, ready map/view changes restart,
 * and ArcGIS-shaped fatal errors retain useful details or receive a fallback.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENE_READY_ERROR_MESSAGE,
  resolveSceneReadyError,
  sceneReadyTransitionAction,
} from "./scene-ready-transition";

describe("ArcGIS scene ready transitions", () => {
  it("tears down once while a replacement view is not ready", () => {
    expect(sceneReadyTransitionAction({
      ready: false,
      transitionPending: false,
      identityChanged: true,
    })).toBe("teardown");
    expect(sceneReadyTransitionAction({
      ready: false,
      transitionPending: true,
      identityChanged: true,
    })).toBe("ignore");
  });

  it("restarts after a pending transition even when view identity is reused", () => {
    expect(sceneReadyTransitionAction({
      ready: true,
      transitionPending: true,
      identityChanged: false,
    })).toBe("restart");
  });

  it("restarts only for a new ready map or view during steady state", () => {
    expect(sceneReadyTransitionAction({
      ready: true,
      transitionPending: false,
      identityChanged: true,
    })).toBe("restart");
    expect(sceneReadyTransitionAction({
      ready: true,
      transitionPending: false,
      identityChanged: false,
    })).toBe("ignore");
  });
});

describe("ArcGIS scene ready errors", () => {
  it("preserves an ArcGIS-shaped error without relying on instanceof Error", () => {
    const fatalError = {
      name: "map-content-error",
      message: "The WebScene failed to load.",
    };

    const error = resolveSceneReadyError(fatalError);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(fatalError.name);
    expect(error.message).toBe(fatalError.message);
    expect(error.cause).toBe(fatalError);
  });

  it("provides a stable fallback when ArcGIS supplies no fatal error", () => {
    expect(resolveSceneReadyError(null).message)
      .toBe(DEFAULT_SCENE_READY_ERROR_MESSAGE);
  });
});
