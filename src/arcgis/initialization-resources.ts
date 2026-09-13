import { isAbortError } from "@arcgis/core/core/promiseUtils.js";
import type Point from "@arcgis/core/geometry/Point.js";
import type Mesh from "@arcgis/core/geometry/Mesh.js";
import type { AircraftAssetConfig } from "../config";

export interface GroundElevationSource {
  load(options?: { signal?: AbortSignal }): Promise<unknown>;
  queryElevation(
    point: Point,
    options: {
      demResolution: "finest-contiguous";
      signal?: AbortSignal;
    },
  ): Promise<{ geometry?: { z?: number | null } }>;
}

export type GltfMeshLoader = (
  location: Point,
  url: string,
  parameters?: {
    signal?: AbortSignal;
    vertexSpace?: "local" | "georeferenced";
  },
) => Promise<Mesh>;

export async function queryInitialGroundElevation(
  ground: GroundElevationSource | null | undefined,
  point: Point,
  signal?: AbortSignal,
): Promise<number | null> {
  if (!ground) return null;
  try {
    await ground.load({ signal });
    signal?.throwIfAborted();
    const result = await ground.queryElevation(point, {
      demResolution: "finest-contiguous",
      signal,
    });
    const sampled = result?.geometry;
    return Number.isFinite(sampled?.z) ? Number(sampled?.z) : null;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

export async function loadAircraftMeshes(
  createFromGLTF: GltfMeshLoader,
  startPoint: Point,
  assets: AircraftAssetConfig,
  signal?: AbortSignal,
): Promise<[Mesh, Mesh | null, Mesh | null]> {
  signal?.throwIfAborted();

  const loadAbort = new AbortController();
  let failed = false;
  const fulfilled = new Set<Mesh>();
  const destroyedMeshes = new Set<Mesh>();
  const destroyMesh = (mesh: Mesh): void => {
    if (destroyedMeshes.has(mesh) || mesh.destroyed) return;
    destroyedMeshes.add(mesh);
    try {
      mesh.destroy();
    } catch (error) {
      console.warn("ArcGIS aircraft mesh cleanup failed.", error);
    }
  };
  // Promise.all rejects on the first failure. Loads that finish later still belong to this
  // failed batch, so destroy their meshes too instead of leaving partial aircraft resources.
  const failBatch = (reason: unknown): void => {
    if (failed) return;
    failed = true;
    fulfilled.forEach(destroyMesh);
    fulfilled.clear();
    loadAbort.abort(reason);
  };
  let forwardAbort: (() => void) | null = null;
  const callerAbort = signal
    ? new Promise<never>((_resolve, reject) => {
        forwardAbort = () => {
          const reason = signal.reason;
          failBatch(reason);
          reject(reason);
        };
        signal.addEventListener("abort", forwardAbort, { once: true });
      })
    : null;

  const load = async (url: string): Promise<Mesh> => {
    try {
      const mesh = await createFromGLTF(startPoint, url, {
        signal: loadAbort.signal,
        vertexSpace: (
          startPoint.spatialReference.isGeographic
          || startPoint.spatialReference.isWebMercator
        ) ? "local" : "georeferenced",
      });
      if (failed) destroyMesh(mesh);
      else fulfilled.add(mesh);
      return mesh;
    } catch (error) {
      failBatch(error);
      throw error;
    }
  };

  try {
    const pendingMeshes = Promise.all([
      load(assets.bodyUrl),
      assets.propellerUrl ? load(assets.propellerUrl) : Promise.resolve(null),
      assets.boostUrl ? load(assets.boostUrl) : Promise.resolve(null),
    ]);
    const meshes = callerAbort
      ? await Promise.race([pendingMeshes, callerAbort])
      : await pendingMeshes;
    signal?.throwIfAborted();
    return meshes;
  } catch (error) {
    failBatch(error);
    throw error;
  } finally {
    if (forwardAbort) signal?.removeEventListener("abort", forwardAbort);
  }
}
