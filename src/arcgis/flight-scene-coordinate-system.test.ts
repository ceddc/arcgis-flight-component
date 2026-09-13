import { describe, expect, it } from "vitest";
import { flightSceneCoordinateMode } from "./flight-scene-coordinate-system";

describe("flight scene coordinate systems", () => {
  it("keeps global Web Mercator behavior", () => {
    expect(flightSceneCoordinateMode("global", {
      isGeographic: false,
      isWebMercator: true,
      metersPerUnit: 1,
    })).toBe("web-mercator");
  });

  it("accepts a metre-based projected local scene", () => {
    expect(flightSceneCoordinateMode("local", {
      isGeographic: false,
      isWebMercator: false,
      metersPerUnit: 1,
    })).toBe("local-meters");
  });

  it("rejects geographic and non-metric local scenes", () => {
    expect(() => flightSceneCoordinateMode("local", {
      isGeographic: true,
      isWebMercator: false,
      metersPerUnit: 111_319,
    })).toThrow(/metre-based projected coordinates/);
    expect(() => flightSceneCoordinateMode("local", {
      isGeographic: false,
      isWebMercator: false,
      metersPerUnit: 0.3048,
    })).toThrow(/metre-based projected coordinates/);
  });
});
