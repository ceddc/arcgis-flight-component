/**
 * Acquire startup terrain height and aircraft glTF meshes for a flight session.
 * Queries honor cancellation, normalize elevation units and release meshes
 * that complete after startup has been aborted or another load has failed.
 */
import { isAbortError } from "@arcgis/core/core/promiseUtils.js";
import type Point from "@arcgis/core/geometry/Point.js";
import type Mesh from "@arcgis/core/geometry/Mesh.js";
import type { AircraftAssetConfig } from "../config";

/** Ground layer methods needed to obtain a starting terrain height. */
export interface GroundElevationSource {
  load(options?: { signal?: AbortSignal }): Promise<unknown>;
  queryElevation(
    point: Point,
    options: {
      demResolution: "finest-contiguous";
      returnSampleInfo: true;
      signal?: AbortSignal;
    },
  ): Promise<{
    geometry?: { z?: number | null };
    noDataValue?: number | null;
    sampleInfo?: { demResolution: number; source?: {
      heightModelInfo?: { heightUnit?: string | null } | null;
      spatialReference?: { isGeographic: boolean; metersPerUnit: number } | null;
    } | null }[] | null;
  }>;
}

/** ArcGIS public API signature used to load glTF meshes for the aircraft. */
export type GltfMeshLoader = (
  location: Point,
  url: string,
  parameters?: {
    signal?: AbortSignal;
    vertexSpace?: "local" | "georeferenced";
  },
) => Promise<Mesh>;

/**
 * Query terrain for the starting point and return a valid height in metres.
 *
 * Ground queries may return source vertical units even after horizontal
 * coordinates are projected. This function therefore inspects the reported
 * height units instead of inferring the Z scale from the query point's XY system.
 * Missing/NoData samples return `null`; cancellation is propagated to the caller.
 *
 * @param ground Ground layer or sampler supplied by the active scene.
 * @param point Starting location to query.
 * @param signal Optional cancellation signal for scene initialization.
 * @returns Terrain elevation in metres, or `null` when unavailable.
 */
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
      returnSampleInfo: true,
      signal,
    });
    const sampled = result?.geometry;
    if (!Number.isFinite(sampled?.z)) return null;
    const sample = result.sampleInfo?.[0];
    if (sample?.demResolution === -1 || (!sample && sampled?.z === result.noDataValue)) return null;
    // Ground.queryElevation reprojects XY but preserves source elevation values.
    // Prefer vertical units; the query point's XY units say nothing about Z.
    const source = sample?.source;
    const heightUnit = source?.heightModelInfo?.heightUnit;
    const verticalScale = heightUnit === "us-feet" ? 1200 / 3937
      : heightUnit === "feet" ? 0.3048
      : heightUnit === "meters" ? 1
      : heightUnit ? NaN
      : source?.spatialReference && !source.spatialReference.isGeographic
        ? source.spatialReference.metersPerUnit : 1;
    return Number.isFinite(verticalScale) && verticalScale > 0
      ? Number(sampled?.z) * verticalScale : null;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

/**
 * Load the body and optional attached aircraft meshes as one cancellable batch.
 *
 * If any member fails or the caller aborts, meshes that already resolved are
 * destroyed and the remaining requests are cancelled. This prevents late
 * successful loads from leaking resources after the flight scene has stopped.
 *
 * @param createFromGLTF SDK-compatible public mesh loader.
 * @param startPoint Scene location used as the mesh's load anchor.
 * @param assets URLs for the body and optional propeller/boost meshes.
 * @param signal Optional cancellation signal owned by scene initialization.
 * @param viewingMode Local scenes need georeferenced mesh vertices, including Web Mercator.
 * @returns Body, propeller and boost mesh slots in that order; optional slots are `null`.
 */
export async function loadAircraftMeshes(
  createFromGLTF: GltfMeshLoader,
  startPoint: Point,
  assets: AircraftAssetConfig,
  signal?: AbortSignal,
  viewingMode: "global" | "local" = "global",
): Promise<[Mesh, Mesh | null, Mesh | null]> {
  signal?.throwIfAborted();

  const loadAbort = new AbortController();
  let failed = false;
  const fulfilled = new Set<Mesh>();
  const destroyedMeshes = new Set<Mesh>();
  /** Destroy each mesh at most once and keep cleanup failures from masking the load error. */
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
  /** Stop sibling loads and dispose any meshes already produced by this batch. */
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

  /** Load one URL in local/georeferenced vertex space appropriate for the scene. */
  const load = async (url: string): Promise<Mesh> => {
    try {
      const mesh = await createFromGLTF(startPoint, url, {
        signal: loadAbort.signal,
        vertexSpace: (
          viewingMode !== "local" && (
            startPoint.spatialReference.isGeographic
            || startPoint.spatialReference.isWebMercator
          )
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
