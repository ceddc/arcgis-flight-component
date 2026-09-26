/**
 * Check terrain sampling during gaps in ArcGIS elevation tile coverage.
 * Live ground must take priority; cached heights are usable only within their
 * age and distance limits, after which the result reports missing data.
 */
import { describe, expect, it } from "vitest";
import { sampleElevationWithPriority } from "./elevation-sampling";

describe("live elevation sampling", () => {
  it("prefers a finite ground sample", () => {
    expect(sampleElevationWithPriority({
      point: { x: 10, y: 20 },
      ground: { elevationAt: () => 1_240 },
    })).toEqual({ elevationM: 1_240, source: "ground" });
  });

  it("bridges only recent, nearby ground gaps", () => {
    const lastSafe = {
      position: { x: 0, y: 0 },
      elevationM: 860,
      timestampMs: 1_000,
    };
    const noData = { elevationAt: () => Number.NaN };

    expect(sampleElevationWithPriority({
      point: { x: 100, y: 0 }, ground: noData, lastSafe, nowMs: 2_400,
    })).toEqual({ elevationM: 860, source: "last-safe" });
    expect(sampleElevationWithPriority({
      point: { x: 121, y: 0 }, ground: noData, lastSafe, nowMs: 2_400,
    })).toEqual({ elevationM: null, source: "none" });
    expect(sampleElevationWithPriority({
      point: { x: 100, y: 0 }, ground: noData, lastSafe, nowMs: 2_501,
    })).toEqual({ elevationM: null, source: "none" });
  });

  it("rejects a sampler no-data sentinel", () => {
    expect(sampleElevationWithPriority({
      point: { x: 10, y: 20 },
      ground: { elevationAt: () => -9999, noDataValue: -9999 },
    })).toEqual({ elevationM: null, source: "none" });
  });
});
