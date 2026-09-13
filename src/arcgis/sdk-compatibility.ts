import { version } from "@arcgis/core/kernel.js";
import type Point from "@arcgis/core/geometry/Point.js";
import type SpatialReference from "@arcgis/core/geometry/SpatialReference.js";
import type { GltfMeshLoader } from "./initialization-resources";

// Production ESM entries remove APIs outside their SDK family before a host
// bundler resolves imports. The raw ESM and AMD entries select APIs at runtime.
declare const __ARCGIS_FLIGHT_SDK_TARGET__: "runtime" | "4.30" | "4.32" | "5.1";

type ProjectPoint = (
  point: Point,
  spatialReference: SpatialReference,
) => Point | null | undefined;

interface ProjectionModule {
  isLoaded(): boolean;
  load(): Promise<unknown>;
}

export interface SdkCompatibilityModules {
  mesh(): Promise<{ default: { createFromGLTF: GltfMeshLoader } }>;
  meshUtils(): Promise<{ createFromGLTF: GltfMeshLoader }>;
  projection(): Promise<ProjectionModule & { project: ProjectPoint }>;
  projectOperator(): Promise<ProjectionModule & { execute: ProjectPoint }>;
}

export interface SdkCompatibility {
  createGltfMesh: GltfMeshLoader;
  projectPoint(point: Point, spatialReference: SpatialReference): Promise<Point | null | undefined>;
}

/** Select public API replacements without requesting modules absent in the host SDK. */
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

export const createGltfMesh = compatibility.createGltfMesh;
export const projectPoint = compatibility.projectPoint;
