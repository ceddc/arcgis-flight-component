/**
 * Verify manual flight clip distances: the near plane never cuts a visible
 * chase aircraft, the far plane covers the curved horizon in stable bands,
 * and the host's own clip distance settings come back after flight.
 */
import { describe, expect, it } from "vitest";
import type SceneView from "@arcgis/core/views/SceneView.js";
import {
  FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M,
  FLIGHT_NEAR_CLIP_DISTANCE_M,
  createFlightClipDistance,
  flightFarClipDistance,
  flightNearClipDistance,
  shouldUpdateFarClipDistance,
} from "./flight-clip-distance";

/** Minimal stand-in for SceneView clip distance constraints. */
function fakeView(initial: { mode: "auto" | "manual"; near: number; far: number }) {
  const makeConstraint = (value: { mode: "auto" | "manual"; near?: number; far?: number }) => {
    let near = value.near ?? 12;
    let far = value.far ?? 90_000;
    let mode = value.mode;
    return {
      get mode() { return mode; },
      set mode(next) { mode = next; },
      get near() { return near; },
      // Like ArcGIS, setting near or far switches the constraint to manual.
      set near(next: number) { near = next; mode = "manual"; },
      get far() { return far; },
      set far(next: number) { far = next; mode = "manual"; },
    };
  };
  let clipDistance = makeConstraint(initial);
  const view = {
    destroyed: false,
    constraints: {
      get clipDistance() { return clipDistance; },
      set clipDistance(value) { clipDistance = makeConstraint(value); },
    },
  };
  return view as typeof view & SceneView;
}

describe("flight near clip distance", () => {
  it("keeps the minimum near plane while the aircraft is visible, at any altitude", () => {
    expect(flightNearClipDistance(1_000, true)).toBe(FLIGHT_NEAR_CLIP_DISTANCE_M);
    expect(flightNearClipDistance(150_000, true)).toBe(FLIGHT_NEAR_CLIP_DISTANCE_M);
    expect(flightNearClipDistance(1_000_000, true)).toBe(FLIGHT_NEAR_CLIP_DISTANCE_M);
  });

  it("raises the near plane in bands above 200 km only when the aircraft is hidden", () => {
    expect(flightNearClipDistance(200_000, false)).toBe(2);
    expect(flightNearClipDistance(550_000, false)).toBe(8);
    expect(flightNearClipDistance(580_000, false)).toBe(8);
    expect(flightNearClipDistance(5_000_000, false)).toBe(10);
    expect(flightNearClipDistance(Number.NaN, false)).toBe(2);
  });
});

describe("flight far clip distance", () => {
  it("keeps the floor near the ground and grows with altitude", () => {
    expect(flightFarClipDistance(100, FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M)).toBe(FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M);
    expect(flightFarClipDistance(Number.NaN, 200_000)).toBe(200_000);
    // At 1 km the horizon (~113 km) already needs more than the floor.
    expect(flightFarClipDistance(1_000, FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M)).toBe(200_000);
  });

  it("covers the curved horizon at the 50 km and 200 km ceilings", () => {
    const at50 = flightFarClipDistance(50_000, FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M);
    // Sea-level horizon is about 800 km; high peaks remain visible well beyond it.
    expect(at50).toBeGreaterThan(1_140_000);
    expect(at50).toBeLessThan(1_400_000);
    const at200 = flightFarClipDistance(200_000, FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M);
    expect(at200).toBeGreaterThan(2_400_000);
    expect(at200).toBeLessThan(2_600_000);
  });

  it("uses 25 km bands and only shrinks after a full spare band", () => {
    expect(flightFarClipDistance(50_000, 0) % 25_000).toBe(0);
    expect(shouldUpdateFarClipDistance(200_000, 225_000)).toBe(true);
    expect(shouldUpdateFarClipDistance(225_000, 200_000)).toBe(false);
    expect(shouldUpdateFarClipDistance(250_000, 200_000)).toBe(true);
    expect(shouldUpdateFarClipDistance(200_000, 200_000)).toBe(false);
  });
});

describe("flight clip distance controller", () => {
  it("switches to manual clipping for flight and follows the climb", () => {
    const view = fakeView({ mode: "auto", near: 40, far: 90_000 });
    const clip = createFlightClipDistance(view, 3_000);
    expect(view.constraints.clipDistance.mode).toBe("manual");
    expect(view.constraints.clipDistance.near).toBe(FLIGHT_NEAR_CLIP_DISTANCE_M);
    expect(view.constraints.clipDistance.far).toBe(flightFarClipDistance(3_000, FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M));

    clip.update(150_000, true);
    expect(view.constraints.clipDistance.near).toBe(FLIGHT_NEAR_CLIP_DISTANCE_M);
    expect(view.constraints.clipDistance.far).toBe(flightFarClipDistance(150_000, FLIGHT_MINIMUM_FAR_CLIP_DISTANCE_M));
    expect(clip.diagnostics().updateCount).toBe(1);
  });

  it("keeps a longer host far distance as its floor", () => {
    const view = fakeView({ mode: "manual", near: 1, far: 500_000 });
    createFlightClipDistance(view, 1_000);
    expect(view.constraints.clipDistance.far).toBe(500_000);
  });

  it("restores automatic clipping after flight", () => {
    const view = fakeView({ mode: "auto", near: 40, far: 90_000 });
    const clip = createFlightClipDistance(view, 3_000);
    clip.update(80_000, true);
    clip.restore();
    expect(view.constraints.clipDistance.mode).toBe("auto");
  });

  it("restores a host's manual values exactly", () => {
    const view = fakeView({ mode: "manual", near: 0.5, far: 300_000 });
    const clip = createFlightClipDistance(view, 3_000);
    clip.update(120_000, true);
    clip.restore();
    expect(view.constraints.clipDistance.mode).toBe("manual");
    expect(view.constraints.clipDistance.near).toBe(0.5);
    expect(view.constraints.clipDistance.far).toBe(300_000);
  });

  it("leaves clip distances the host changed during flight", () => {
    const view = fakeView({ mode: "auto", near: 40, far: 90_000 });
    const clip = createFlightClipDistance(view, 3_000);
    view.constraints.clipDistance.far = 777_000;
    clip.restore();
    expect(view.constraints.clipDistance.mode).toBe("manual");
    expect(view.constraints.clipDistance.far).toBe(777_000);
  });
});
