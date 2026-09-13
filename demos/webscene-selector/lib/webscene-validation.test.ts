import { describe, expect, it } from "vitest";
import {
  validateFlightWebScene,
  validatePublicWebSceneItem,
} from "./webscene-validation";

describe("custom WebScene validation", () => {
  it("accepts a public WebScene with a global Web Mercator view", () => {
    expect(() => validatePublicWebSceneItem({
      type: "Web Scene",
      access: "public",
    })).not.toThrow();
    expect(() => validateFlightWebScene({
      viewingMode: "global",
      spatialReference: { isWebMercator: true },
    })).not.toThrow();
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
    expect(() => validateFlightWebScene({
      viewingMode: "local",
      spatialReference: { isWebMercator: true },
    })).toThrow(/global WebScene/);
    expect(() => validateFlightWebScene({
      viewingMode: "global",
      spatialReference: { isWebMercator: false },
    })).toThrow(/Web Mercator/);
  });
});
