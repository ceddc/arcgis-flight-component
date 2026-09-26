/**
 * Convert positions between simulation metres and supported ArcGIS scene units.
 * Global Web Mercator keeps the existing metre-based coordinates; local
 * projected views use their spatial reference scale and reject unsupported modes.
 */
/** Converts positions between simulation metres and the supported ArcGIS scene units. */
export type FlightSceneCoordinateMode = "web-mercator" | "local-projected";

/** Spatial-reference facts needed to validate and scale a SceneView. */
export interface FlightSceneSpatialReference {
  isGeographic: boolean;
  isWebMercator: boolean;
  metersPerUnit: number;
}

/**
 * Select a supported coordinate strategy for the current 3D scene.
 *
 * Global Web Mercator scenes retain the component's established projected XY
 * behavior. Local scenes are accepted only for projected systems with a finite,
 * positive metres-per-unit scale; geographic and unsupported combinations fail
 * early rather than silently distorting camera motion.
 *
 * @param viewingMode ArcGIS view mode (`global` or `local`).
 * @param spatialReference Coordinate-system properties from the view.
 * @returns The conversion strategy used between flight metres and scene units.
 * @throws {Error} If the view is geographic or otherwise unsupported.
 */
export function flightSceneCoordinateMode(
  viewingMode: "global" | "local",
  spatialReference: FlightSceneSpatialReference,
): FlightSceneCoordinateMode {
  if (viewingMode === "global" && spatialReference.isWebMercator) {
    return "web-mercator";
  }
  if (
    viewingMode === "local"
    && !spatialReference.isGeographic
    && !spatialReference.isWebMercator
    && Number.isFinite(spatialReference.metersPerUnit)
    && spatialReference.metersPerUnit > 0
  ) {
    return "local-projected";
  }
  throw new Error(
    "Plane navigation requires either a global Web Mercator scene or a local scene with projected linear coordinates.",
  );
}

/**
 * Return the scale that converts flight metres to scene coordinate units.
 *
 * Local projected coordinates use the spatial reference's declared scale.
 * Global Web Mercator deliberately retains its established projected XY semantics.
 *
 * @param mode Coordinate mode selected for the view.
 * @param spatialReference View spatial reference containing the local unit scale.
 * @returns Number of metres represented by one scene coordinate unit.
 * @see https://developers.arcgis.com/javascript/latest/references/core/views/SceneView/#camera
 */
export function flightSceneMetersPerUnit(mode: FlightSceneCoordinateMode, spatialReference: FlightSceneSpatialReference): number {
  return mode === "web-mercator" ? 1 : spatialReference.metersPerUnit;
}

/** Convert an ArcGIS scene-space position into the flight simulation's metres. */
export function sceneToFlightPosition(point: { x: number; y: number; z: number }, metersPerUnit: number) {
  return { x: point.x * metersPerUnit, y: point.y * metersPerUnit, z: point.z * metersPerUnit };
}

/** Convert a flight position in metres into ArcGIS scene-space units. */
export function flightToScenePosition(point: { x: number; y: number; z: number }, metersPerUnit: number) {
  return { x: point.x / metersPerUnit, y: point.y / metersPerUnit, z: point.z / metersPerUnit };
}
