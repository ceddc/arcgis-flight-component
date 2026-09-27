/**
 * Exercise finish tuning on representative aircraft mesh materials.
 * Checks that reflective surfaces are restrained while authored normals,
 * dark colors and translucent glazing retain their intended appearance.
 */
import { describe, expect, it } from "vitest";
import { applyProductionAircraftFinish } from "./aircraft-finish";

describe("applyProductionAircraftFinish", () => {
  it("uses the model's authored normals for every mesh component", () => {
    const components = [
      { shading: "flat", trustSourceNormals: false },
      { material: null },
    ];

    applyProductionAircraftFinish(components);

    expect(components).toEqual([
      { shading: "source", trustSourceNormals: true },
      { material: null, shading: "source", trustSourceNormals: true },
    ]);
  });

  it("adds restrained highlights without polishing dark or already-smooth materials", () => {
    const brightMetal = {
      color: { r: 240, g: 240, b: 240 },
      metallic: 0.8,
      roughness: 0.9,
    };
    const sharedBrightPaint = {
      color: { r: 220, g: 220, b: 220 },
      metallic: 0.1,
      roughness: 0.9,
    };
    const darkMaterial = {
      color: { r: 20, g: 20, b: 20 },
      metallic: 0.8,
      roughness: 0.9,
    };
    const alreadySmoothPaint = {
      color: { r: 220, g: 220, b: 220 },
      metallic: 0.1,
      roughness: 0.4,
    };

    applyProductionAircraftFinish([
      { material: brightMetal },
      { material: sharedBrightPaint },
      { material: sharedBrightPaint },
      { material: darkMaterial },
      { material: alreadySmoothPaint },
    ]);

    expect(brightMetal.roughness).toBe(0.34);
    expect(sharedBrightPaint.roughness).toBeCloseTo(0.522);
    expect(darkMaterial.roughness).toBe(0.9);
    expect(alreadySmoothPaint.roughness).toBe(0.4);
  });
});

it("preserves authored translucent glazing", () => {
  const glazing = { color: { r: 220, g: 230, b: 240, a: 0.4 }, metallic: 0.7, roughness: 0.85 };
  applyProductionAircraftFinish([{ material: glazing }]);
  expect(glazing.roughness).toBe(0.85);
});
