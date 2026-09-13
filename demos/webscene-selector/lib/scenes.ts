import type { PlaneNavigationStartConfig } from "../../../src/config";

export const ARCGIS_ITEM_ID_PATTERN = /^[a-f0-9]{32}$/i;

export interface DemoScenePreset {
  key: string;
  title: string;
  description: string;
  location: string;
  start?: PlaneNavigationStartConfig;
}

export const DEMO_SCENE_PRESETS = [
  {
    key: "matterhorn",
    title: "Matterhorn",
    description: "Alpine terrain around the Matterhorn and Zermatt.",
    location: "Switzerland",
    start: {
      longitude: 7.6586,
      latitude: 45.9763,
      altitudeM: 3_800,
      headingDeg: 235,
      speedMps: 100,
    },
  },
  // Additional coordinates and headings come from World Sky Tour, src/world-starts.ts.
  {
    key: "redlands",
    title: "Redlands",
    description: "Approach Redlands from the southwest with Esri headquarters below the nose and the San Bernardino foothills beyond.",
    location: "United States",
    start: {
      longitude: -117.20858,
      latitude: 34.03895,
      altitudeM: 1150,
      headingDeg: 32,
      speedMps: 100,
    },
  },
  {
    key: "table-mountain",
    title: "Table Mountain",
    description: "Start above the flat-topped landmark with Cape Town and two oceans below.",
    location: "South Africa",
    start: {
      longitude: 18.45318,
      latitude: -33.9961,
      altitudeM: 2000,
      headingDeg: 322,
      speedMps: 100,
    },
  },
  {
    key: "santorini",
    title: "Santorini Caldera",
    description: "Cross the flooded volcanic caldera toward Santorini's crescent cliffs and white villages.",
    location: "Greece",
    start: {
      longitude: 25.38024,
      latitude: 36.3688,
      altitudeM: 1250,
      headingDeg: 19,
      speedMps: 100,
    },
  },
  {
    key: "bay-of-kotor",
    title: "Bay of Kotor",
    description: "Climb from the winding Adriatic bay toward the bare limestone heights of Lovcen.",
    location: "Montenegro",
    start: {
      longitude: 18.66266,
      latitude: 42.41711,
      altitudeM: 2400,
      headingDeg: 11,
      speedMps: 100,
    },
  },
  {
    key: "lake-atitlan",
    title: "Lake Atitlan",
    description: "Cross the blue caldera lake directly toward the Toliman and Atitlan volcanoes.",
    location: "Guatemala",
    start: {
      longitude: -91.20172,
      latitude: 14.71479,
      altitudeM: 2250,
      headingDeg: 157,
      speedMps: 100,
    },
  },
  {
    key: "douro-valley",
    title: "Douro Valley",
    description: "Trace the Douro through steep vineyard terraces and folded hills around Pinhao.",
    location: "Portugal",
    start: {
      longitude: -7.54584,
      latitude: 41.17763,
      altitudeM: 2200,
      headingDeg: 84,
      speedMps: 100,
    },
  },
  {
    key: "isles-of-scilly",
    title: "Isles of Scilly",
    description: "Cross turquoise shallows and pale sandbanks toward Tresco, with Bryher and the scattered rocky islands of Scilly around you.",
    location: "United Kingdom",
    start: {
      longitude: -6.385,
      latitude: 49.92,
      altitudeM: 750,
      headingDeg: 43,
      speedMps: 100,
    },
  },
  {
    key: "macritchie-reservoir",
    title: "MacRitchie Reservoir",
    description: "Fly over rainforest and the winding reservoir with Singapore beyond the trees.",
    location: "Singapore",
    start: {
      longitude: 103.843,
      latitude: 1.37,
      altitudeM: 650,
      headingDeg: 217,
      speedMps: 100,
    },
  },
] as const satisfies readonly DemoScenePreset[];

export function normalizeArcGISItemId(value: string): string | null {
  const itemId = value.trim();
  return ARCGIS_ITEM_ID_PATTERN.test(itemId) ? itemId.toLowerCase() : null;
}

export function demoScenePreset(key: string): DemoScenePreset | null {
  return DEMO_SCENE_PRESETS.find((preset) => preset.key === key) ?? null;
}
