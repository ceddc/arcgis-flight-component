export interface ArcGISItemMetadata {
  type: string | null | undefined;
  access: string | null | undefined;
}

export interface WebSceneMetadata {
  viewingMode: "local" | "global";
  spatialReference?: { isWebMercator: boolean } | null;
}

export function validatePublicWebSceneItem(item: ArcGISItemMetadata): void {
  if (item.type !== "Web Scene") {
    throw new Error("The item exists, but it is not an ArcGIS WebScene.");
  }
  if (item.access !== "public") {
    throw new Error("This public demo can load public WebScenes only.");
  }
}

export function validateFlightWebScene(scene: WebSceneMetadata): void {
  if (scene.viewingMode !== "global") {
    throw new Error("Plane navigation requires a global WebScene.");
  }
  if (scene.spatialReference && !scene.spatialReference.isWebMercator) {
    throw new Error("Plane navigation currently requires Web Mercator.");
  }
}
