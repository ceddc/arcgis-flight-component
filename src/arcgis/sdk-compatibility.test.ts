import type Mesh from "@arcgis/core/geometry/Mesh.js";
import type Point from "@arcgis/core/geometry/Point.js";
import type SpatialReference from "@arcgis/core/geometry/SpatialReference.js";
import { describe, expect, it, vi } from "vitest";
import {
  createSdkCompatibility,
  type SdkCompatibilityModules,
} from "./sdk-compatibility";

function moduleHarness() {
  const meshResult = {} as Mesh;
  const pointResult = { type: "point" } as Point;
  const legacyCreate = vi.fn(async () => meshResult);
  const modernCreate = vi.fn(async () => meshResult);
  const project = vi.fn(() => pointResult);
  const execute = vi.fn(() => pointResult);
  const legacyLoad = vi.fn(async () => undefined);
  const modernLoad = vi.fn(async () => undefined);
  const legacyLoaded = vi.fn(() => false);
  const modernLoaded = vi.fn(() => false);
  const modules = {
    mesh: vi.fn(async () => ({ default: { createFromGLTF: legacyCreate } })),
    meshUtils: vi.fn(async () => ({ createFromGLTF: modernCreate })),
    projection: vi.fn(async () => ({
      isLoaded: legacyLoaded,
      load: legacyLoad,
      project,
    })),
    projectOperator: vi.fn(async () => ({
      isLoaded: modernLoaded,
      load: modernLoad,
      execute,
    })),
  } satisfies SdkCompatibilityModules;
  return {
    modules, meshResult, pointResult, legacyCreate, modernCreate,
    project, execute, legacyLoad, modernLoad, legacyLoaded, modernLoaded,
  };
}

describe("ArcGIS public API compatibility", () => {
  it.each(["4.29", "4.30", "4.31", "4.32", "4.33", "4.34", "5.0.19"])(
    "uses Mesh.createFromGLTF on %s without requesting the 5.1 function",
    async (version) => {
      const h = moduleHarness();
      const sdk = createSdkCompatibility(version, h.modules);
      const point = {} as Point;
      const parameters = { signal: new AbortController().signal, vertexSpace: "local" as const };

      await expect(sdk.createGltfMesh(point, "plane.glb", parameters)).resolves.toBe(h.meshResult);

      expect(h.legacyCreate).toHaveBeenCalledWith(point, "plane.glb", parameters);
      expect(h.modules.meshUtils).not.toHaveBeenCalled();
    },
  );

  it("uses meshUtils on 5.1 without loading the deprecated Mesh factory", async () => {
    const h = moduleHarness();
    const sdk = createSdkCompatibility("5.1.21", h.modules);
    const point = {} as Point;

    await expect(sdk.createGltfMesh(point, "plane.glb")).resolves.toBe(h.meshResult);

    expect(h.modernCreate).toHaveBeenCalledWith(point, "plane.glb", undefined);
    expect(h.modules.mesh).not.toHaveBeenCalled();
  });

  it.each(["4.29", "4.30", "4.31"])(
    "loads legacy projection on %s without requesting projectOperator",
    async (version) => {
      const h = moduleHarness();
      const sdk = createSdkCompatibility(version, h.modules);
      const point = {} as Point;
      const sr = {} as SpatialReference;

      await expect(sdk.projectPoint(point, sr)).resolves.toBe(h.pointResult);

      expect(h.legacyLoad).toHaveBeenCalledOnce();
      expect(h.project).toHaveBeenCalledWith(point, sr);
      expect(h.legacyLoad.mock.invocationCallOrder[0]).toBeLessThan(h.project.mock.invocationCallOrder[0]);
      expect(h.modules.projectOperator).not.toHaveBeenCalled();
    },
  );

  it.each(["4.32", "4.33", "4.34", "5.0", "5.1"])(
    "loads projectOperator on %s without requesting the removed projection module",
    async (version) => {
      const h = moduleHarness();
      const sdk = createSdkCompatibility(version, h.modules);
      const point = {} as Point;
      const sr = {} as SpatialReference;

      await expect(sdk.projectPoint(point, sr)).resolves.toBe(h.pointResult);

      expect(h.modernLoad).toHaveBeenCalledOnce();
      expect(h.execute).toHaveBeenCalledWith(point, sr);
      expect(h.modernLoad.mock.invocationCallOrder[0]).toBeLessThan(h.execute.mock.invocationCallOrder[0]);
      expect(h.modules.projection).not.toHaveBeenCalled();
    },
  );

  it.each(["4.29", "5.1"])("does not reload an initialized projection engine on %s", async (version) => {
    const h = moduleHarness();
    h.legacyLoaded.mockReturnValue(true);
    h.modernLoaded.mockReturnValue(true);

    await createSdkCompatibility(version, h.modules).projectPoint({} as Point, {} as SpatialReference);

    expect(h.legacyLoad).not.toHaveBeenCalled();
    expect(h.modernLoad).not.toHaveBeenCalled();
  });

  it("propagates a mesh load failure without trying the other SDK factory", async () => {
    const h = moduleHarness();
    const error = new DOMException("Flight stopped", "AbortError");
    h.modernCreate.mockRejectedValue(error);

    await expect(createSdkCompatibility("5.1", h.modules).createGltfMesh({} as Point, "plane.glb"))
      .rejects.toBe(error);
    expect(h.modules.mesh).not.toHaveBeenCalled();
  });

  it("propagates projection initialization failure without requesting another API", async () => {
    const h = moduleHarness();
    const error = new Error("Projection data could not be loaded");
    h.legacyLoad.mockRejectedValue(error);

    await expect(createSdkCompatibility("4.29", h.modules).projectPoint({} as Point, {} as SpatialReference))
      .rejects.toBe(error);
    expect(h.project).not.toHaveBeenCalled();
    expect(h.modules.projectOperator).not.toHaveBeenCalled();
  });
});
