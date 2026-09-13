import type Mesh from "@arcgis/core/geometry/Mesh.js";
import type Point from "@arcgis/core/geometry/Point.js";
import { describe, expect, it, vi } from "vitest";
import {
  loadAircraftMeshes,
  queryInitialGroundElevation,
  type GltfMeshLoader,
  type GroundElevationSource,
} from "./initialization-resources";

const point = {
  z: 320,
  spatialReference: {
    isGeographic: false,
    isWebMercator: true,
  },
} as Point;

function groundWithQuery(
  queryElevation: GroundElevationSource["queryElevation"],
): GroundElevationSource {
  return {
    load: vi.fn(async () => undefined),
    queryElevation,
  };
}

describe("initialization resource cancellation", () => {
  it("passes the same AbortSignal to the initial ground query", async () => {
    const controller = new AbortController();
    const queryElevation = vi.fn(async () => ({ geometry: { z: 812 } }));
    const ground = groundWithQuery(queryElevation);

    await expect(queryInitialGroundElevation(
      ground,
      point,
      controller.signal,
    )).resolves.toBe(812);

    expect(ground.load).toHaveBeenCalledOnce();
    expect(ground.load).toHaveBeenCalledWith({ signal: controller.signal });
    expect(queryElevation).toHaveBeenCalledWith(point, {
      demResolution: "finest-contiguous",
      signal: controller.signal,
    });
  });

  it("rethrows AbortError from the ground query", async () => {
    const abortError = new DOMException("Stopped", "AbortError");
    const ground = groundWithQuery(vi.fn(async () => {
      throw abortError;
    }));

    await expect(queryInitialGroundElevation(
      ground,
      point,
      new AbortController().signal,
    )).rejects.toBe(abortError);
  });

  it("returns unknown after an ordinary ground error", async () => {
    const ground = groundWithQuery(vi.fn(async () => {
      throw new Error("Elevation service unavailable");
    }));

    await expect(queryInitialGroundElevation(
      ground,
      point,
      new AbortController().signal,
    )).resolves.toBeNull();
  });

  it("does not turn a missing elevation into zero or point z", async () => {
    const ground = groundWithQuery(vi.fn(async () => ({ geometry: {} })));

    await expect(queryInitialGroundElevation(
      ground,
      point,
      new AbortController().signal,
    )).resolves.toBeNull();
  });

  it("passes one linked AbortSignal to all three GLTF loads", async () => {
    const controller = new AbortController();
    const createFromGLTF: GltfMeshLoader = vi.fn(async (_location, url) => (
      { sourceUrl: url } as unknown as Mesh
    ));

    const meshes = await loadAircraftMeshes(
      createFromGLTF,
      point,
      {
        bodyUrl: "body.glb",
        propellerUrl: "propeller.glb",
        boostUrl: "boost.glb",
      },
      controller.signal,
    );

    expect(createFromGLTF).toHaveBeenCalledTimes(3);
    const meshSignal = vi.mocked(createFromGLTF).mock.calls[0][2]?.signal;
    expect(meshSignal).toBeInstanceOf(AbortSignal);
    expect(meshSignal).not.toBe(controller.signal);
    expect(createFromGLTF).toHaveBeenNthCalledWith(
      1,
      point,
      "body.glb",
      { signal: meshSignal, vertexSpace: "local" },
    );
    expect(createFromGLTF).toHaveBeenNthCalledWith(
      2,
      point,
      "propeller.glb",
      { signal: meshSignal, vertexSpace: "local" },
    );
    expect(createFromGLTF).toHaveBeenNthCalledWith(
      3,
      point,
      "boost.glb",
      { signal: meshSignal, vertexSpace: "local" },
    );
    expect(meshes).toHaveLength(3);
  });

  it("uses georeferenced vertex space in a projected local scene", async () => {
    const createFromGLTF: GltfMeshLoader = vi.fn(async () => (
      {} as Mesh
    ));
    const localPoint = {
      z: 800,
      spatialReference: {
        isGeographic: false,
        isWebMercator: false,
      },
    } as Point;

    await loadAircraftMeshes(createFromGLTF, localPoint, {
      bodyUrl: "body.glb",
      propellerUrl: null,
      boostUrl: null,
    });

    expect(createFromGLTF).toHaveBeenCalledWith(localPoint, "body.glb", {
      signal: expect.any(AbortSignal),
      vertexSpace: "georeferenced",
    });
  });

  it("does not start a GLTF load when the caller signal is already aborted", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Stopped", "AbortError");
    const createFromGLTF: GltfMeshLoader = vi.fn();
    controller.abort(abortError);

    await expect(loadAircraftMeshes(createFromGLTF, point, {
      bodyUrl: "body.glb",
      propellerUrl: "propeller.glb",
      boostUrl: "boost.glb",
    }, controller.signal)).rejects.toBe(abortError);

    expect(createFromGLTF).not.toHaveBeenCalled();
  });

  it("destroys fulfilled and late meshes when a sibling load fails", async () => {
    let resolveBody!: (mesh: Mesh) => void;
    let rejectPropeller!: (error: Error) => void;
    let resolveBoost!: (mesh: Mesh) => void;
    const bodyLoad = new Promise<Mesh>((resolve) => { resolveBody = resolve; });
    const propellerLoad = new Promise<Mesh>((_resolve, reject) => {
      rejectPropeller = reject;
    });
    const boostLoad = new Promise<Mesh>((resolve) => { resolveBoost = resolve; });
    const body = { destroyed: false, destroy: vi.fn() } as unknown as Mesh;
    const boost = { destroyed: false, destroy: vi.fn() } as unknown as Mesh;
    const loadError = new Error("propeller failed");
    const createFromGLTF: GltfMeshLoader = vi.fn((_point, url) => (
      url === "body.glb" ? bodyLoad
        : url === "propeller.glb" ? propellerLoad
          : boostLoad
    ));

    const loading = loadAircraftMeshes(createFromGLTF, point, {
      bodyUrl: "body.glb",
      propellerUrl: "propeller.glb",
      boostUrl: "boost.glb",
    });
    resolveBody(body);
    await Promise.resolve();
    rejectPropeller(loadError);

    await expect(loading).rejects.toBe(loadError);
    expect(body.destroy).toHaveBeenCalledOnce();
    const linkedSignal = vi.mocked(createFromGLTF).mock.calls[0][2]?.signal;
    expect(linkedSignal?.aborted).toBe(true);

    resolveBoost(boost);
    await Promise.resolve();
    await Promise.resolve();
    expect(boost.destroy).toHaveBeenCalledOnce();
  });

  it("rejects an externally aborted batch and destroys signal-ignoring loads", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Stopped", "AbortError");
    const resolvers = new Map<string, (mesh: Mesh) => void>();
    const createFromGLTF: GltfMeshLoader = vi.fn((_point, url) => (
      new Promise<Mesh>((resolve) => resolvers.set(url, resolve))
    ));
    const body = { destroyed: false, destroy: vi.fn() } as unknown as Mesh;
    const propeller = { destroyed: false, destroy: vi.fn() } as unknown as Mesh;
    const boost = { destroyed: false, destroy: vi.fn() } as unknown as Mesh;

    const loading = loadAircraftMeshes(createFromGLTF, point, {
      bodyUrl: "body.glb",
      propellerUrl: "propeller.glb",
      boostUrl: "boost.glb",
    }, controller.signal);
    resolvers.get("body.glb")?.(body);
    await Promise.resolve();
    controller.abort(abortError);
    expect(body.destroy).toHaveBeenCalledOnce();

    // Cancellation must settle even if an underlying loader ignores its signal.
    await expect(loading).rejects.toBe(abortError);

    resolvers.get("propeller.glb")?.(propeller);
    resolvers.get("boost.glb")?.(boost);
    await Promise.resolve();
    await Promise.resolve();
    expect(body.destroy).toHaveBeenCalledOnce();
    expect(propeller.destroy).toHaveBeenCalledOnce();
    expect(boost.destroy).toHaveBeenCalledOnce();
  });
});
