/**
 * Exercise the aircraft layer's scoped render-origin adapter with SDK-shaped fakes.
 * Checks precision-grid installation, bounded cache behavior, version guards
 * and restoration of the original factory at teardown.
 */
import { describe, expect, it } from "vitest";
import { installAircraftRenderOrigin } from "./aircraft-render-origin";

function fixture() {
  const factory = {
    _gridSize: 500_000,
    _rootOriginId: "root/test",
    _origins: new Map<string, { vec3: number[] }>([["root/test", { vec3: [0, 0, 0] }]]),
    getOrigin(point: ArrayLike<number>) {
      const vec3 = Array.from(point, n => Math.round(n / this._gridSize) * this._gridSize);
      const key = vec3.join("/");
      if (!this._origins.has(key)) this._origins.set(key, { vec3 });
      return this._origins.get(key)!;
    },
    needsOriginUpdate(_origin: { vec3: ArrayLike<number> }, _point: ArrayLike<number>, _objectSize: number) { return false; },
  };
  return { factory, layerView: { processor: { graphicsCore: { symbolCreationContext: { localOriginFactory: factory } } } } };
}

describe("aircraft render origin precision", () => {
  it.each(["5.1.21", "5.1.24"])("rebases aircraft before float32 drift on SDK %s", sdkVersion => {
    const { factory, layerView } = fixture();
    installAircraftRenderOrigin(layerView, sdkVersion);
    const origin = { vec3: [-700_000, -5_600_000, 3_000_000] };
    for (const size of [1, 20, 200]) {
      expect(factory.needsOriginUpdate(origin, [-699_000, -5_600_000, 3_000_000], size)).toBe(false);
      expect(factory.needsOriginUpdate(origin, [-697_000, -5_600_000, 3_000_000], size)).toBe(true);
    }
    const point = [-1_008_543, -5_923_421, 3_043_765];
    const local = factory.getOrigin(point);
    expect(Math.hypot(...point.map((n, i) => n - local.vec3[i]))).toBeLessThan(2_048);
  });

  it("bounds cached origins during globe-scale turbo travel without invalidating active origins", () => {
    const { factory, layerView } = fixture();
    const adapter = installAircraftRenderOrigin(layerView, "5.1.21");
    const active = factory.getOrigin([10_000, 20_000, 200_000]);
    const coordinates = [...active.vec3];
    for (let n = 0; n < 10_000; n++) factory.getOrigin([n * 9_000, 20_000, 200_000]);
    expect(factory._origins.size).toBeLessThanOrEqual(64);
    expect(factory._origins.has("root/test")).toBe(true);
    expect(active.vec3).toEqual(coordinates);
    expect(adapter.diagnostics().status).toBe("active");
  });

  it("restores the native factory on cleanup and leaves another layer alone", () => {
    const { factory, layerView } = fixture();
    const other = fixture().factory;
    const getOrigin = factory.getOrigin, needsUpdate = factory.needsOriginUpdate;
    const adapter = installAircraftRenderOrigin(layerView, "5.1.21");
    expect(other._gridSize).toBe(500_000);
    adapter.destroy(); adapter.destroy();
    expect(factory._gridSize).toBe(500_000);
    expect(factory.getOrigin).toBe(getOrigin);
    expect(factory.needsOriginUpdate).toBe(needsUpdate);
  });

  it("does not patch unknown SDK versions or incomplete private APIs", () => {
    const { factory, layerView } = fixture();
    expect(installAircraftRenderOrigin(layerView, "5.2.0").diagnostics().status).toBe("unsupported-version");
    expect(factory._gridSize).toBe(500_000);
    expect(installAircraftRenderOrigin({}, "5.1.21").diagnostics().status).toBe("unsupported-api");
  });
});
