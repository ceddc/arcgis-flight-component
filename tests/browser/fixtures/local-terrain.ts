/**
 * Supplies deterministic local elevation for browser demos that need to test
 * terrain sampling without depending on an external elevation service.
 */
import BaseElevationLayer from "@arcgis/core/layers/BaseElevationLayer.js";

// A known 100 US survey foot surface tests SDK query and rendered-sampler units.
const ConstantTerrain = BaseElevationLayer.createSubclass({
  fetchTile() {
    return Promise.resolve({ values: new Float32Array(257 * 257).fill(100), width: 257, height: 257, noDataValue: -9999 });
  },
});

/** Create a repeatable 100-survey-foot elevation surface covering the test area. */
export function createLocalTerrain(): BaseElevationLayer {
  return new ConstantTerrain({
    spatialReference: { wkid: 2263 },
    fullExtent: { xmin: 975000, ymin: 200000, xmax: 1010000, ymax: 240000, spatialReference: { wkid: 2263 } },
    tileInfo: {
      spatialReference: { wkid: 2263 }, size: [256, 256], origin: { x: 900000, y: 300000 },
      lods: Array.from({ length: 12 }, (_, level) => ({ level, resolution: 512 / 2 ** level, scale: 512 / 2 ** level * 96 * 39.37 * 1200 / 3937 })),
    },
  }) as BaseElevationLayer;
}
