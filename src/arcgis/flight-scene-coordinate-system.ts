export type FlightSceneCoordinateMode = "web-mercator" | "local-meters";

export interface FlightSceneSpatialReference {
  isGeographic: boolean;
  isWebMercator: boolean;
  metersPerUnit: number;
}

const METRE_UNIT_TOLERANCE = 1e-9;

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
    && Math.abs(spatialReference.metersPerUnit - 1) <= METRE_UNIT_TOLERANCE
  ) {
    return "local-meters";
  }
  throw new Error(
    "Plane navigation requires either a global Web Mercator scene or a local scene with metre-based projected coordinates.",
  );
}
