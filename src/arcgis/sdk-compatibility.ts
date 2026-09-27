/**
 * Isolate ArcGIS SDK differences behind glTF loading and point projection calls.
 * Distribution builds select an SDK family at build time; source bundles detect
 * it at runtime. Modules load only when needed so unsupported API branches stay
 * out of a prebuilt bundle and errors reach the caller unchanged.
 */
import { version } from "@arcgis/core/kernel.js";
import type Point from "@arcgis/core/geometry/Point.js";
import type SpatialReference from "@arcgis/core/geometry/SpatialReference.js";
import type { GltfMeshLoader } from "./initialization-resources";

/** SDK family selected by a prebuilt distribution; raw bundles use runtime selection. */
declare const __ARCGIS_FLIGHT_SDK_TARGET__: "runtime" | "4.30" | "4.32" | "5.1";

type ProjectPoint = (
  point: Point,
  spatialReference: SpatialReference,
) => Point | null | undefined;

/** Public methods shared by the ArcGIS projection API versions supported here. */
interface ProjectionModule {
  isLoaded(): boolean;
  load(): Promise<unknown>;
}

/** Lazy module loaders needed to bridge version-specific ArcGIS public APIs. */
export interface SdkCompatibilityModules {
  mesh(): Promise<{ default: { createFromGLTF: GltfMeshLoader } }>;
  meshUtils(): Promise<{ createFromGLTF: GltfMeshLoader }>;
  projection(): Promise<ProjectionModule & { project: ProjectPoint }>;
  projectOperator(): Promise<ProjectionModule & { execute: ProjectPoint }>;
}

/** Version-neutral glTF loading and point projection operations. */
export interface SdkCompatibility {
  createGltfMesh: GltfMeshLoader;
  projectPoint(point: Point, spatialReference: SpatialReference): Promise<Point | null | undefined>;
}

/**
 * Select public API replacements for the supplied ArcGIS SDK version.
 *
 * Modules are lazy-loaded only inside their compatible branch. This matters for
 * standalone builds where unsupported SDK exports may be absent at bundle time.
 *
 * @param sdkVersion Runtime ArcGIS SDK version string.
 * @param modules Lazy factories for the old/new API modules.
 * @returns Version-neutral mesh creation and point projection methods.
 * @throws {Error} If the version string is malformed or a prebuilt branch requests an absent API.
 */
export function createSdkCompatibility(
  sdkVersion: string,
  modules: SdkCompatibilityModules,
): SdkCompatibility {
  const match = /^(\d+)\.(\d+)(?:\.|$)/.exec(sdkVersion);
  if (!match) throw new Error(`Invalid ArcGIS SDK version: ${sdkVersion}`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const atLeast = (targetMajor: number, targetMinor: number): boolean => (
    major > targetMajor || (major === targetMajor && minor >= targetMinor)
  );

  return {
    async createGltfMesh(location, url, parameters) {
      // meshUtils.createFromGLTF was added in 5.1; Mesh's static method is
      // the public API through 5.0 and is deprecated starting with 5.1.
      if (atLeast(5, 1)) {
        const meshUtils = await modules.meshUtils();
        return meshUtils.createFromGLTF(location, url, parameters);
      }
      const { default: Mesh } = await modules.mesh();
      return Mesh.createFromGLTF(location, url, parameters);
    },
    async projectPoint(point, spatialReference) {
      // projectOperator arrived in 4.32. The old projection module was
      // removed in 5.0, so neither branch can be an eager cross-version import.
      if (atLeast(4, 32)) {
        const operator = await modules.projectOperator();
        if (!operator.isLoaded()) await operator.load();
        return operator.execute(point, spatialReference);
      }
      const projection = await modules.projection();
      if (!projection.isLoaded()) await projection.load();
      return projection.project(point, spatialReference);
    },
  };
}

/** Fail clearly if a prebuilt SDK-family bundle reaches an API excluded from that build. */
function incompatibleSdkApi(api: string): never {
  throw new Error(
    `ArcGIS ${version} requires ${api}, which is outside this component's SDK ${__ARCGIS_FLIGHT_SDK_TARGET__} build.`,
  );
}

const compatibility = createSdkCompatibility(version, {
  async mesh() {
    if (__ARCGIS_FLIGHT_SDK_TARGET__ === "5.1") {
      return incompatibleSdkApi("Mesh.createFromGLTF");
    } else {
      return import("@arcgis/core/geometry/Mesh.js");
    }
  },
  async meshUtils() {
    if (__ARCGIS_FLIGHT_SDK_TARGET__ === "4.30" || __ARCGIS_FLIGHT_SDK_TARGET__ === "4.32") {
      return incompatibleSdkApi("meshUtils.createFromGLTF");
    } else {
      return import("@arcgis/core/geometry/support/meshUtils.js");
    }
  },
  async projection() {
    if (__ARCGIS_FLIGHT_SDK_TARGET__ === "4.32" || __ARCGIS_FLIGHT_SDK_TARGET__ === "5.1") {
      return incompatibleSdkApi("projection");
    } else {
      // @ts-expect-error The public 4.x module and its types were removed at 5.0.
      return import("@arcgis/core/geometry/projection.js");
    }
  },
  async projectOperator() {
    if (__ARCGIS_FLIGHT_SDK_TARGET__ === "4.30") {
      return incompatibleSdkApi("projectOperator");
    } else {
      const operator = await import("@arcgis/core/geometry/operators/projectOperator.js");
      return {
        isLoaded: operator.isLoaded,
        load: operator.load,
        execute: (point, spatialReference) => (
          operator.execute(point, spatialReference) as Point | null | undefined
        ),
      };
    }
  },
});

/** SDK-version-compatible public API for loading one glTF mesh. */
export const createGltfMesh = compatibility.createGltfMesh;
/** SDK-version-compatible public API for projecting a point into a spatial reference. */
export const projectPoint = compatibility.projectPoint;
