/**
 * Check when the flight frame budget takes and returns ArcGIS scheduling.
 * A fake clock drives 60 Hz camera submissions through straight flight, turns,
 * pauses and teardown, plus SDK versions and hook owners it must not touch.
 */
import { describe, expect, it } from "vitest";
import { FLIGHT_FRAME_BUDGET_RELEASE_MS, installFlightFrameBudget } from "./flight-frame-budget";

const FRAME_MS = 1_000 / 60;

function harness(renderState: unknown = null) {
  const view = { stateManager: { test: { renderState } } };
  let nowMs = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  let nextHandle = 1;
  const options = {
    now: () => nowMs,
    schedule: (callback: () => void, delayMs: number) => {
      const handle = nextHandle++;
      timers.set(handle, { at: nowMs + delayMs, callback });
      return handle;
    },
    cancel: (handle: number) => { timers.delete(handle); },
  };
  const advance = (ms: number): void => {
    const target = nowMs + ms;
    for (;;) {
      const due = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      nowMs = due[1].at;
      due[1].callback();
    }
    nowMs = target;
  };
  return { view, options, advance, timers };
}

type Budget = ReturnType<typeof installFlightFrameBudget>;
/** Submits 60 Hz frames turning at a constant rate; returns the final heading. */
function fly(budget: Budget, advance: (ms: number) => void, ms: number, degPerSec: number, heading = 0): number {
  for (let elapsed = 0; elapsed < ms; elapsed += FRAME_MS) {
    advance(FRAME_MS);
    heading = (heading + degPerSec * FRAME_MS / 1_000 + 360) % 360;
    budget.noteCameraSubmission(heading);
  }
  return heading;
}

describe("flight frame budget", () => {
  it("keeps ArcGIS's native budget in straight flight and gentle drift", () => {
    const { view, options, advance } = harness();
    const budget = installFlightFrameBudget(view, "5.1.24", options);

    fly(budget, advance, 3_000, 0);
    fly(budget, advance, 3_000, 3);
    expect(view.stateManager.test.renderState).toBeNull();
    expect(budget.diagnostics()).toMatchObject({ status: "idle", engaged: false, engageCount: 0 });
  });

  it("requests the animation budget during a turn and releases it after rolling out", () => {
    const { view, options, advance } = harness();
    const budget = installFlightFrameBudget(view, "5.1.24", options);

    let heading = fly(budget, advance, 500, 0, 350);
    heading = fly(budget, advance, 2_000, 55, heading);
    expect(view.stateManager.test.renderState).toBe(0);
    expect(budget.diagnostics()).toMatchObject({ status: "active", engaged: true, engageCount: 1 });
    expect(budget.diagnostics().turnRateDegPerSec).toBeCloseTo(55, 0);

    // Leftward turns across north count the same way.
    heading = fly(budget, advance, 1_000, -40, heading);
    expect(budget.diagnostics().engageCount).toBe(1);

    heading = fly(budget, advance, 300, 0, heading);
    expect(view.stateManager.test.renderState).toBe(0);
    fly(budget, advance, FLIGHT_FRAME_BUDGET_RELEASE_MS + 200, 0, heading);
    expect(view.stateManager.test.renderState).toBeNull();
    expect(budget.diagnostics()).toMatchObject({ status: "idle", engaged: false, releaseCount: 1 });
  });

  it("releases when camera submissions stop, as when the flight pauses", () => {
    const { view, options, advance } = harness();
    const budget = installFlightFrameBudget(view, "5.1.24", options);

    fly(budget, advance, 1_000, 60);
    expect(view.stateManager.test.renderState).toBe(0);
    advance(FLIGHT_FRAME_BUDGET_RELEASE_MS);
    expect(view.stateManager.test.renderState).toBeNull();
    // Resuming after a long gap does not treat the gap as a turn.
    budget.noteCameraSubmission(200);
    advance(FRAME_MS);
    budget.noteCameraSubmission(200);
    expect(budget.diagnostics()).toMatchObject({ engaged: false, turnRateDegPerSec: 0 });
  });

  it("restores native scheduling on removal and ignores later submissions", () => {
    const { view, options, advance, timers } = harness();
    const budget = installFlightFrameBudget(view, "5.1.21", options);

    fly(budget, advance, 1_000, 60);
    budget.remove();
    expect(view.stateManager.test.renderState).toBeNull();
    expect(timers.size).toBe(0);
    fly(budget, advance, 1_000, 60);
    expect(view.stateManager.test.renderState).toBeNull();
    expect(budget.diagnostics().status).toBe("removed");
  });

  it("leaves other SDK lines, foreign owners and missing hooks native", () => {
    const cases = [
      { state: harness(), version: "4.32.10", status: "unsupported-version" },
      { state: harness(), version: "5.2.0", status: "unsupported-version" },
      { state: harness(2), version: "5.1.24", status: "unsupported-api" },
    ] as const;
    for (const { state, version, status } of cases) {
      const before = state.view.stateManager.test.renderState;
      const budget = installFlightFrameBudget(state.view, version, state.options);
      fly(budget, state.advance, 1_000, 60);
      expect(budget.diagnostics().status).toBe(status);
      expect(state.view.stateManager.test.renderState).toBe(before);
    }
    const missing = harness();
    const budget = installFlightFrameBudget({}, "5.1.24", missing.options);
    fly(budget, missing.advance, 1_000, 60);
    expect(budget.diagnostics().status).toBe("unsupported-api");
  });

  it("does not clear a render state that another owner replaced", () => {
    const { view, options, advance } = harness();
    const budget = installFlightFrameBudget(view, "5.1.24", options);

    fly(budget, advance, 1_000, 60);
    view.stateManager.test.renderState = 2;
    advance(FLIGHT_FRAME_BUDGET_RELEASE_MS);
    expect(view.stateManager.test.renderState).toBe(2);
  });
});
