/**
 * Give flight turns ArcGIS's animation frame budget on validated SDK builds.
 *
 * ArcGIS 5.1 treats every programmatic `view.camera` write as user
 * interaction. In that state its scheduler sizes the per-frame streaming
 * budget against a 30 FPS frame: max(33.3 ms, frame duration) - elapsed -
 * 6.5 ms. A turn over dense content reveals new terrain and building tiles on
 * every frame, so that budget pins the turn near 30 FPS with frequent 50 ms
 * frames. A camera animation instead budgets against the real display frame.
 *
 * While the submitted camera is turning, request the SDK's animation render
 * state through its view-state test hook. Straight flight, pauses and loading
 * keep the native interaction/idle budgets: there streaming keeps up at a
 * smooth frame rate and catches up on the tiles a turn revealed. Holding the
 * animation budget for all flight measurably delayed streamed content.
 *
 * Known one-time cost: the first time a view leaves the animating state, ArcGIS
 * can link a set of shader programs synchronously, once per page.
 */
/** Smoothed camera heading rate that requests the animation budget. */
export const FLIGHT_FRAME_BUDGET_ENGAGE_DEG_PER_SEC = 8;
/** Lower rate that keeps an engaged budget, so gentle roll-outs do not flicker. */
export const FLIGHT_FRAME_BUDGET_RELEASE_DEG_PER_SEC = 4;
/** Hold after the turn rate falls below release, or after the last frame. */
export const FLIGHT_FRAME_BUDGET_RELEASE_MS = 400;
const TURN_RATE_TIME_CONSTANT_MS = 120;
const MAXIMUM_RATE_SAMPLE_GAP_MS = 250;
const ANIMATING_RENDER_STATE = 0;

interface ViewStateTestHooks { renderState: number | null }

/** Why the budget is or is not influencing ArcGIS scheduling. */
export type FlightFrameBudgetStatus =
  | "active"
  | "idle"
  | "unsupported-version"
  | "unsupported-api"
  | "removed";

/** Current budget state and counters, exposed for diagnostics. */
export interface FlightFrameBudgetDiagnostics {
  status: FlightFrameBudgetStatus;
  sdkVersion: string;
  engaged: boolean;
  engageCount: number;
  releaseCount: number;
  turnRateDegPerSec: number;
  engageDegPerSec: number;
  releaseDegPerSec: number;
  releaseMs: number;
}

/** Injectable clock and timers for deterministic tests. */
export interface FlightFrameBudgetOptions {
  now?: () => number;
  schedule?: (callback: () => void, delayMs: number) => number;
  cancel?: (handle: number) => void;
}

/** Read an unknown SDK object as a property record without throwing on null/primitives. */
function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

/**
 * Request ArcGIS's animation scheduling budget only while the flight camera turns.
 *
 * This is an isolated, undocumented compatibility hook for the 5.1 release
 * line. It only takes an unowned hook, so a test harness or another owner keeps
 * control, and it never clears a render state that someone else replaced.
 * Unknown SDK lines or object shapes keep native scheduling and report the
 * reason through `diagnostics()`.
 *
 * @param view SceneView whose view-state test hook is inspected.
 * @param sdkVersion ArcGIS Maps SDK version; only the 5.1 line is influenced.
 * @param options Optional clock and timer overrides for tests.
 * @returns A per-frame heading callback, diagnostics and a restoring `remove()`.
 */
export function installFlightFrameBudget(
  view: unknown,
  sdkVersion: string,
  options: FlightFrameBudgetOptions = {},
) {
  const now = options.now ?? (() => performance.now());
  const schedule = options.schedule ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));
  const cancel = options.cancel ?? ((handle) => window.clearTimeout(handle));
  const candidate = record(record(record(view)?.stateManager)?.test);
  let hooks: ViewStateTestHooks | null = null;
  let status: FlightFrameBudgetStatus;
  if (!sdkVersion.startsWith("5.1.")) status = "unsupported-version";
  else if (candidate && "renderState" in candidate && candidate.renderState === null) {
    hooks = candidate as unknown as ViewStateTestHooks;
    status = "idle";
  } else status = "unsupported-api";

  let engaged = false;
  let engageCount = 0;
  let releaseCount = 0;
  let turnRate = 0;
  let lastHeading: number | null = null;
  let lastSubmissionMs = Number.NEGATIVE_INFINITY;
  let lastTurningMs = Number.NEGATIVE_INFINITY;
  let timer = 0;

  /** Return scheduling to ArcGIS unless another owner replaced the render state. */
  const release = (): void => {
    if (!engaged || !hooks) return;
    if (hooks.renderState === ANIMATING_RENDER_STATE) hooks.renderState = null;
    engaged = false;
    releaseCount += 1;
    if (status === "active") status = "idle";
  };
  /** Release once the hold has elapsed since the last turning frame, else wait again. */
  const checkRelease = (): void => {
    timer = 0;
    const remainingMs = FLIGHT_FRAME_BUDGET_RELEASE_MS - (now() - lastTurningMs);
    // Sub-millisecond remainders release now instead of re-arming a zero timer.
    if (remainingMs < 1) release();
    else timer = schedule(checkRelease, remainingMs);
  };

  return {
    /** Call once per submitted flight camera frame with its heading in degrees. */
    noteCameraSubmission(headingDegrees: number): void {
      if (!hooks || (status !== "idle" && status !== "active") || !Number.isFinite(headingDegrees)) return;
      const nowMs = now();
      const gapMs = nowMs - lastSubmissionMs;
      if (lastHeading !== null && gapMs > 0 && gapMs <= MAXIMUM_RATE_SAMPLE_GAP_MS) {
        const deltaDegrees = ((headingDegrees - lastHeading) % 360 + 540) % 360 - 180;
        const rate = Math.abs(deltaDegrees) * 1_000 / gapMs;
        turnRate += (rate - turnRate) * (1 - Math.exp(-gapMs / TURN_RATE_TIME_CONSTANT_MS));
      } else if (gapMs > MAXIMUM_RATE_SAMPLE_GAP_MS) {
        // A resumed flight must not read the paused interval as a turn.
        turnRate = 0;
      }
      lastHeading = headingDegrees;
      lastSubmissionMs = nowMs;
      if (turnRate >= FLIGHT_FRAME_BUDGET_ENGAGE_DEG_PER_SEC
        || (engaged && turnRate >= FLIGHT_FRAME_BUDGET_RELEASE_DEG_PER_SEC)) {
        lastTurningMs = nowMs;
        if (!engaged) {
          hooks.renderState = ANIMATING_RENDER_STATE;
          engaged = true;
          engageCount += 1;
          status = "active";
        }
      }
      if (engaged && !timer) timer = schedule(checkRelease, FLIGHT_FRAME_BUDGET_RELEASE_MS);
    },
    diagnostics: (): FlightFrameBudgetDiagnostics => ({
      status, sdkVersion, engaged, engageCount, releaseCount,
      turnRateDegPerSec: Math.round(turnRate * 10) / 10,
      engageDegPerSec: FLIGHT_FRAME_BUDGET_ENGAGE_DEG_PER_SEC,
      releaseDegPerSec: FLIGHT_FRAME_BUDGET_RELEASE_DEG_PER_SEC,
      releaseMs: FLIGHT_FRAME_BUDGET_RELEASE_MS,
    }),
    /** Cancel the release timer and restore native scheduling; safe to repeat. */
    remove(): void {
      if (timer) cancel(timer);
      timer = 0;
      release();
      status = "removed";
    },
  };
}
