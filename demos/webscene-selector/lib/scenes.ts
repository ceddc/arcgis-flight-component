/**
 * Defines the scene explorer's curated flight starts and public item-ID input.
 * Presets carry display text and geographic start settings; helpers resolve a
 * selected preset or validate a raw ArcGIS Online WebScene ID from the UI.
 */
import type { PlaneNavigationStartConfig } from "../../../src/config";

/** Accepted syntax for a plain 32-character ArcGIS item ID. */
export const ARCGIS_ITEM_ID_PATTERN = /^[a-f0-9]{32}$/i;

/** Display metadata and optional aircraft start for a built-in destination. */
export interface DemoScenePreset {
  key: string;
  title: string;
  description: string;
  location: string;
  start?: PlaneNavigationStartConfig;
}

/**
 * Curated destinations shown in the Places tab.
 *
 * The start locations describe where flight begins; the ArcGIS basemap and
 * world elevation service supply the actual scene content.
 */
export const DEMO_SCENE_PRESETS = [
  {
    key: "grand-canyon",
    title: "Grand Canyon",
    description: "Follow the Colorado River above layered cliffs and the desert rim.",
    location: "United States",
    start: {
      longitude: -112.05217,
      latitude: 36.11055,
      altitudeM: 3_850,
      headingDeg: 251,
      speedMps: 100,
    },
  },
  {
    key: "mount-fuji",
    title: "Mount Fuji",
    description: "Approach Mount Fuji from the southeast with its summit ahead.",
    location: "Japan",
    start: {
      longitude: 138.78,
      latitude: 35.31,
      altitudeM: 4_550,
      headingDeg: 320,
      speedMps: 100,
    },
  },
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
    key: "fitz-roy",
    title: "Fitz Roy",
    description: "Approach Patagonia's granite peaks above glaciers and valleys.",
    location: "Argentina",
    start: {
      longitude: -72.977,
      latitude: -49.2941,
      altitudeM: 4_500,
      headingDeg: 288,
      speedMps: 100,
    },
  },
  {
    key: "uluru",
    title: "Uluru",
    description: "Cross the red desert plain toward Uluru's sandstone slopes.",
    location: "Australia",
    start: {
      longitude: 131.00464,
      latitude: -25.35452,
      altitudeM: 1_500,
      headingDeg: 69,
      speedMps: 100,
    },
  },
  {
    key: "aoraki",
    title: "Aoraki / Mount Cook",
    description: "Fly toward New Zealand's highest peak above the Tasman glaciers.",
    location: "New Zealand",
    start: {
      longitude: 170.16816,
      latitude: -43.55616,
      altitudeM: 4_800,
      headingDeg: 206,
      speedMps: 100,
    },
  },
  {
    key: "ha-long-bay",
    title: "Ha Long Bay",
    description: "Fly south between limestone islands over the Gulf of Tonkin.",
    location: "Vietnam",
    start: {
      longitude: 107.065,
      latitude: 20.885,
      altitudeM: 750,
      headingDeg: 185,
      speedMps: 100,
    },
  },
] as const satisfies readonly DemoScenePreset[];

/**
 * Trims and validates a plain ArcGIS item ID, normalizing valid IDs to lowercase.
 *
 * @param value Raw field contents.
 * @returns A normalized 32-character hexadecimal ID, or null for any other text.
 */
export function normalizeArcGISItemId(value: string): string | null {
  const itemId = value.trim();
  return ARCGIS_ITEM_ID_PATTERN.test(itemId) ? itemId.toLowerCase() : null;
}

/**
 * Looks up a built-in destination by its stable key.
 *
 * @param key Preset key from the scene catalog.
 * @returns The matching preset or null; there is deliberately no fallback.
 */
export function demoScenePreset(key: string): DemoScenePreset | null {
  return DEMO_SCENE_PRESETS.find((preset) => preset.key === key) ?? null;
}
