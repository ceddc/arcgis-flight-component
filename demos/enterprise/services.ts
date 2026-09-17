// Terrain/scene layers from SITG's public 3D scene; imagery from its raster directory.
// Service metadata verified on 2026-09-17.
// Terrain and imagery are Enterprise services; scene layers are hosted on ArcGIS Online.
export const SITG_SERVICES = {
  imagery: "https://raster.sitg.ge.ch/arcgis/rest/services/ORTHOPHOTOS_2024_EPSG3857/MapServer",
  terrain: "https://raster.sitg.ge.ch/arcgis/rest/services/MNA_TERRAIN_2023_03_EPSG3857/ImageServer",
  buildings: "https://tiles.arcgis.com/tiles/Yw7hmHuxwtA1GVg6/arcgis/rest/services/BATIMENT_3D/SceneServer/layers/0",
  landmarks: "https://tiles.arcgis.com/tiles/Yw7hmHuxwtA1GVg6/arcgis/rest/services/BATIMENTS_REMARQUABLES_NB/SceneServer/layers/0",
  fountain: "https://tiles.arcgis.com/tiles/Yw7hmHuxwtA1GVg6/arcgis/rest/services/JET_DEAU_3D_WGS84/SceneServer/layers/0",
} as const;
