import { describe, expect, it } from "vitest";
import {
  DEMO_SCENE_PRESETS,
  demoScenePreset,
  normalizeArcGISItemId,
} from "./scenes";

describe("demo scene catalog", () => {
  it("contains nine destinations with valid start positions", () => {
    expect(DEMO_SCENE_PRESETS).toHaveLength(9);
    expect(new Set(DEMO_SCENE_PRESETS.map(preset => preset.key)).size).toBe(DEMO_SCENE_PRESETS.length);
    for (const preset of DEMO_SCENE_PRESETS) {
      expect(Number.isFinite(preset.start.altitudeM)).toBe(true);
      expect(Number.isFinite(preset.start.longitude)).toBe(true);
      expect(Number.isFinite(preset.start.latitude)).toBe(true);
    }
    expect(demoScenePreset("san-francisco")).toBeNull();
  });

  it("normalizes exact ArcGIS item IDs and rejects other input", () => {
    expect(normalizeArcGISItemId(" 2E95AEE2A0D04E1A9EF72ACB9F0A9C65 "))
      .toBe("2e95aee2a0d04e1a9ef72acb9f0a9c65");
    expect(normalizeArcGISItemId("short-id")).toBeNull();
    expect(normalizeArcGISItemId("https://www.arcgis.com/home/item.html?id=abc"))
      .toBeNull();
  });

  it("resolves presets without inventing a fallback", () => {
    expect(demoScenePreset("redlands")?.title).toBe("Redlands");
    expect(demoScenePreset("missing")).toBeNull();
  });
});
