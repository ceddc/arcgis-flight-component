/**
 * Public SITG services for the Geneva flight-controls demo. Imagery and
 * terrain come from SITG Enterprise; 3D scene layers are hosted by SITG on
 * ArcGIS Online. These layers are lighter than the full Geneva photomesh.
 */
export const SITG_SERVICES = {
  imagery: "https://raster.sitg.ge.ch/arcgis/rest/services/ORTHOPHOTOS_2024_EPSG3857/MapServer",
  terrain: "https://raster.sitg.ge.ch/arcgis/rest/services/MNA_TERRAIN_2023_03_EPSG3857/ImageServer",
  buildings: "https://tiles.arcgis.com/tiles/Yw7hmHuxwtA1GVg6/arcgis/rest/services/BATIMENT_3D/SceneServer/layers/0",
  landmarks: "https://tiles.arcgis.com/tiles/Yw7hmHuxwtA1GVg6/arcgis/rest/services/BATIMENTS_REMARQUABLES_NB/SceneServer/layers/0",
  fountain: "https://tiles.arcgis.com/tiles/Yw7hmHuxwtA1GVg6/arcgis/rest/services/JET_DEAU_3D_WGS84/SceneServer/layers/0",
} as const;
