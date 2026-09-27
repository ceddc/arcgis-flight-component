/**
 * Manual near/far clip distances for flight in global scenes. ArcGIS automatic
 * clipping pushes the near plane outward as the camera climbs, until it cuts
 * through the chase aircraft and the view breaks up (Space Jet at high
 * altitude, or very high terrain). During flight the near plane stays at a few
 * metres and the far plane follows the curved horizon in stable bands; the
 * host's own clip distance settings come back when flight stops.
 */
import type SceneView from "@arcgis/core/views/SceneView.js";
import { restoreBorrowedValue } from "./borrowed-state";

const EARTH_RADIUS_M = 6_378_137;
const FAR_DISTANCE_STEP_M = 25_000;
/** Near plane while the aircraft is visible; small enough to never clip the chase model. */
export const FLIGHT_NEAR_CLIP_DISTANCE_M = 2;
/** Lowest far plane, enough for low-level flight toward distant mountains. */
export const FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M = 160_000;

/**
 * Far distance covering the curved horizon from `cameraAltitudeM`, with room
 * for elevated terrain beyond sea level, rounded up to stable bands.
 */
export function flightFarClipDistance(cameraAltitudeM: number, minimumFarM: number): number {
  const altitude = Number.isFinite(cameraAltitudeM) ? Math.max(0, cameraAltitudeM) : 0;
  const horizonDistance = Math.sqrt(altitude * (2 * EARTH_RADIUS_M + altitude));
  const requiredDistance = horizonDistance * 1.5 + 10_000;
  // Stable bands avoid dirtying the ArcGIS constraint every animation frame.
  return Math.max(minimumFarM, Math.ceil(requiredDistance / FAR_DISTANCE_STEP_M) * FAR_DISTANCE_STEP_M);
}

/**
 * Near distance for the current altitude. Above 200 km, a hidden aircraft
 * (cockpit view) allows a larger near plane for better globe depth precision;
 * a visible aircraft always keeps the minimum so the model is never cut.
 */
export function flightNearClipDistance(
  cameraAltitudeM: number,
  aircraftVisible: boolean,
  minimumNearM = FLIGHT_NEAR_CLIP_DISTANCE_M,
): number {
  if (aircraftVisible || !Number.isFinite(cameraAltitudeM) || cameraAltitudeM <= 200_000) {
    return minimumNearM;
  }
  const altitudeNearM = Math.min(10, 2 + Math.floor((cameraAltitudeM - 200_000) / 100_000) * 2);
  return Math.max(minimumNearM, altitudeNearM);
}

/** Expand the far plane at once; shrink only after a full spare band to avoid chatter. */
export function shouldUpdateFarClipDistance(currentFarM: number, desiredFarM: number): boolean {
  return desiredFarM > currentFarM || desiredFarM < currentFarM - FAR_DISTANCE_STEP_M;
}

export interface FlightClipDistanceController {
  /** Apply the clip distances for a newly submitted camera frame. */
  update(cameraAltitudeM: number, aircraftVisible: boolean): void;
  /** Restore the host's settings unless the host changed them during flight. */
  restore(): void;
  diagnostics(): { mode: string; nearM: number; farM: number; updateCount: number };
}

/**
 * Switch `view` to manual clip distances for flight, starting at
 * `cameraAltitudeM`. The host's far distance acts as a floor, so scenes that
 * were already configured for long views keep them.
 */
export function createFlightClipDistance(
  view: SceneView,
  cameraAltitudeM: number,
): FlightClipDistanceController {
  const constraint = view.constraints.clipDistance;
  const original = { mode: constraint.mode, near: constraint.near, far: constraint.far };
  const minimumFarM = Math.max(
    FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M,
    Number.isFinite(original.far) ? original.far : 0,
  );
  let appliedNearM = flightNearClipDistance(cameraAltitudeM, true);
  let appliedFarM = flightFarClipDistance(cameraAltitudeM, minimumFarM);
  let updateCount = 0;
  view.constraints.clipDistance = { mode: "manual", near: appliedNearM, far: appliedFarM };

  return {
    update(altitudeM, aircraftVisible) {
      if (view.destroyed) return;
      const current = view.constraints.clipDistance;
      const nearM = flightNearClipDistance(altitudeM, aircraftVisible);
      if (current.near !== nearM) {
        current.near = nearM;
        appliedNearM = nearM;
      }
      const farM = flightFarClipDistance(altitudeM, minimumFarM);
      if (shouldUpdateFarClipDistance(appliedFarM, farM)) {
        current.far = farM;
        appliedFarM = farM;
        updateCount += 1;
      }
    },
    restore() {
      if (view.destroyed) return;
      const current = view.constraints.clipDistance;
      restoreBorrowedValue({
        current: { mode: current.mode, near: current.near, far: current.far },
        applied: { mode: "manual", near: appliedNearM, far: appliedFarM },
        original,
        equals: (left, right) => left.mode === right.mode && left.near === right.near && left.far === right.far,
        restore: (value) => {
          // Automatic mode recomputes near/far itself; manual hosts get their exact values back.
          view.constraints.clipDistance = value.mode === "auto"
            ? { mode: "auto" }
            : { mode: "manual", near: value.near, far: value.far };
        },
      });
    },
    diagnostics() {
      const current = view.constraints.clipDistance;
      return { mode: current.mode, nearM: current.near, farM: current.far, updateCount };
    },
  };
}
