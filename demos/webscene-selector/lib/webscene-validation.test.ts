/**
 * Checks the admission boundary for user supplied ArcGIS WebScenes. Public
 * Web Scene items in global Web Mercator or a local projected coordinate
 * system pass; private, wrong-type, geographic, and local Web Mercator
 * examples are rejected.
 */
import { describe, expect, it } from "vitest";
import {
  validateFlightWebScene,
  validatePublicWebSceneItem,
} from "./webscene-validation";

const webMercator = { isWebMercator: true, isGeographic: false, metersPerUnit: 1 };
const utm32 = { isWebMercator: false, isGeographic: false, metersPerUnit: 1 };
const wgs84 = { isWebMercator: false, isGeographic: true, metersPerUnit: Number.NaN };

describe("custom WebScene validation", () => {
  it("accepts a public WebScene with a global Web Mercator view", () => {
    expect(() => validatePublicWebSceneItem({
      type: "Web Scene",
      access: "public",
    })).not.toThrow();
    expect(validateFlightWebScene({ viewingMode: "global", spatialReference: webMercator }))
      .toBe("web-mercator");
    expect(validateFlightWebScene({ viewingMode: "global" })).toBe("web-mercator");
  });

  it("accepts a local WebScene in projected linear coordinates", () => {
    expect(validateFlightWebScene({ viewingMode: "local", spatialReference: utm32 }))
      .toBe("local-projected");
    expect(validateFlightWebScene({
      viewingMode: "local",
      spatialReference: { ...utm32, metersPerUnit: 0.3048 },
    })).toBe("local-projected");
  });

  it("rejects inaccessible and wrong-type items", () => {
    expect(() => validatePublicWebSceneItem({
      type: "Web Map",
      access: "public",
    })).toThrow(/not an ArcGIS WebScene/);
    expect(() => validatePublicWebSceneItem({
      type: "Web Scene",
      access: "private",
    })).toThrow(/public WebScenes only/);
  });

  it("rejects unsupported scene modes and coordinate systems", () => {
    expect(() => validateFlightWebScene({ viewingMode: "global", spatialReference: wgs84 }))
      .toThrow(/global Web Mercator WebScene or a local WebScene/);
    expect(() => validateFlightWebScene({ viewingMode: "local", spatialReference: webMercator }))
      .toThrow(/projected coordinates/);
    expect(() => validateFlightWebScene({ viewingMode: "local" }))
      .toThrow(/does not declare a projected coordinate system/);
  });
});
