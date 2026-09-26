/**
 * Enforces the public scene explorer's admission rules for custom WebScenes.
 * Portal metadata must describe a publicly shared Web Scene, and the loaded
 * scene must use a coordinate system the flight component supports: Web
 * Mercator in either view mode or a local view with projected coordinates.
 */
import {
  flightSceneCoordinateMode,
  type FlightSceneCoordinateMode,
} from "../../../src/arcgis/flight-scene-coordinate-system";

/** Portal metadata fields used to restrict the public demo to shareable scenes. */
export interface ArcGISItemMetadata {
  type: string | null | undefined;
  access: string | null | undefined;
}

/** Scene settings that constrain ArcGIS SceneView and flight compatibility. */
export interface WebSceneMetadata {
  viewingMode: "local" | "global";
  spatialReference?: {
    isWebMercator: boolean;
    isGeographic: boolean;
    metersPerUnit: number;
  } | null;
}

/**
 * Rejects portal items that cannot be opened anonymously as a WebScene.
 *
 * @param item Metadata loaded from the ArcGIS item.
 * @throws When the item is another content type or is not shared publicly.
 */
export function validatePublicWebSceneItem(item: ArcGISItemMetadata): void {
  if (item.type !== "Web Scene") {
    throw new Error("The item exists, but it is not an ArcGIS WebScene.");
  }
  if (item.access !== "public") {
    throw new Error("This WebScene is not shared with everyone. Choose another scene.");
  }
}

/**
 * Checks whether the WebScene can host plane navigation, using the same rule
 * as the flight component. Global scenes without a declared spatial reference
 * open in Web Mercator.
 *
 * @param scene Initial viewing mode and optional spatial-reference metadata.
 * @returns The flight coordinate mode the scene will use.
 * @throws When the coordinate system is not supported for flight.
 */
export function validateFlightWebScene(scene: WebSceneMetadata): FlightSceneCoordinateMode {
  const spatialReference = scene.spatialReference
    ?? (scene.viewingMode === "global"
      ? { isWebMercator: true, isGeographic: false, metersPerUnit: 1 }
      : null);
  if (!spatialReference) {
    throw new Error("This local WebScene does not declare a projected coordinate system.");
  }
  try {
    return flightSceneCoordinateMode(scene.viewingMode, spatialReference);
  } catch {
    throw new Error(
      "Plane navigation needs Web Mercator or a local WebScene with projected coordinates.",
    );
  }
}
