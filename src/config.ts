/**
 * Define the public flight-element settings and turn partial input into a complete
 * configuration. Normalization validates required assets and coordinate pairs,
 * clamps supported numeric ranges, and copies nested values so callers can keep
 * their input objects. Merge operations use the current config as their base.
 */
import {
  DEFAULT_FLIGHT_FOV_DEGREES,
  DEFAULT_FLIGHT_SENSITIVITY,
  DEFAULT_INVERT_PITCH,
} from "./core/defaults";
import { FLIGHT_TUNING } from "./core/flight";
import { clamp } from "./core/math";
import {
  isFlightPowerMode,
  type FlightPowerMode,
} from "./core/power-mode";
import type { FlightViewMode } from "./core/camera-rig";
import {
  supportedFlightLocale,
  type FlightLocalePreference,
} from "./i18n";

/** Recursively exposes configuration values as readonly without changing runtime objects. */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

import { normalizeAircraftFlight, type AircraftFlightConfig, type AircraftFlightConfigInput } from './core/aircraft-flight';

/** Asset URLs and model-specific presentation offsets loaded by the flight session. */
export interface AircraftAssetConfig {
  /** Propeller pivot offset in metres in the aircraft model's local axes. */
  propellerAnchorM?: { x: number; y: number; z: number };
  /** Keep source roughness values instead of applying the component's aircraft finish. */
  preserveFinish?: boolean;
  /** Visual-only pitch offset in degrees; it does not change flight direction. */
  visualPitchDeg?: number;
  /** Required aircraft body GLB URL. */
  bodyUrl: string;

  /** Optional propeller GLB URL; null disables the separate propeller mesh. */
  propellerUrl: string | null;

  /** Optional boost-effect GLB URL; null disables the separate effect mesh. */
  boostUrl: string | null;
}

/** Geographic or session-state defaults used when flight starts or recovers. */
export interface PlaneNavigationStartConfig {
  /** Starting longitude in degrees; supply it together with latitude. */
  longitude?: number;

  /** Starting latitude in degrees; supply it together with longitude. */
  latitude?: number;

  /** Starting altitude above sea level in metres. */
  altitudeM?: number;

  /** Initial heading clockwise from north, in degrees. */
  headingDeg?: number;

  /** Initial forward speed in metres per second. */
  speedMps?: number;
}

/** Camera presentation settings; submission rate limits ArcGIS writes, not simulation steps. */
export interface PlaneNavigationCameraConfig {
  mode: FlightViewMode;

  /** Vertical field of view in degrees. */
  fovDeg: number;

  bankedViewport: boolean;

  /** Maximum ArcGIS camera submissions per second; simulation remains fixed-step. */
  submissionHz: number;
}

/** Input enablement and host-scene gesture ownership. */
export interface PlaneNavigationControlsConfig {
  keyboard: boolean;

  gamepad: boolean;

  /** Multiplier applied to keyboard, gamepad, and touch axes. */
  sensitivity: number;

  invertPitch: boolean;

  /** Whether one-finger scene gestures orbit the camera instead of ArcGIS navigation. */
  captureSceneNavigation: boolean;
}

/** Ground sampling, clearance, and maximum height above ground. */
export interface PlaneNavigationTerrainConfig {
  enabled: boolean;

  /** Minimum aircraft clearance above sampled ground, in metres. */
  minimumClearanceM: number;

  /** Maximum permitted altitude above sampled ground, in metres. */
  maximumAglM: number;
}

/** Control names accepted by the built-in toolbar configuration. */
export const PLANE_NAVIGATION_UI_CONTROLS = Object.freeze([
  "power",
  "pause",
  "camera",
  "recover",
] as const);

/** A built-in toolbar control name. */
export type PlaneNavigationUiControl =
  (typeof PLANE_NAVIGATION_UI_CONTROLS)[number];

/** Corners and logical inline-start/end positions supported by component overlays. */
export const PLANE_NAVIGATION_UI_POSITIONS = Object.freeze([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "top-start",
  "top-end",
  "bottom-start",
  "bottom-end",
] as const);

/** A supported overlay corner or logical inline-start/end position. */
export type PlaneNavigationUiPosition =
  (typeof PLANE_NAVIGATION_UI_POSITIONS)[number];

/** Whether the touch joystick is hidden, always shown, or shown on coarse-pointer devices. */
export type PlaneNavigationJoystickMode = "auto" | "always" | "never";

/** Visibility, placement, contents, and locale of the component-owned overlays. */
export interface PlaneNavigationUiConfig {
  enabled: boolean;

  /** Independent of the toolbar; auto shows the stick on touch-capable devices. */
  joystick: PlaneNavigationJoystickMode;

  joystickPosition: PlaneNavigationUiPosition;

  position: PlaneNavigationUiPosition;

  controls: readonly PlaneNavigationUiControl[];

  showSpeed: boolean;

  locale: FlightLocalePreference;
}

/** Complete, normalized settings consumed by the custom element and flight session. */
export interface PlaneNavigationConfig {
  /** Optional built-in simulation profile; null uses the classic default simulation. */
  flight: AircraftFlightConfig | null;
  assets: AircraftAssetConfig;

  /** Start defaults; unset coordinates inherit the host camera position and heading. */
  start: PlaneNavigationStartConfig;

  camera: PlaneNavigationCameraConfig;

  controls: PlaneNavigationControlsConfig;

  /** Terrain clearance and ceiling checks used during flight. */
  terrain: PlaneNavigationTerrainConfig;

  ui: PlaneNavigationUiConfig;

  powerMode: FlightPowerMode;

  autoStart: boolean;
}

/** Partial element settings; omitted fields inherit the current values when merged. */
export interface PlaneNavigationConfigInput {
  flight?: AircraftFlightConfigInput | null;
  assets?: Partial<AircraftAssetConfig>;

  start?: PlaneNavigationStartConfig;

  camera?: Partial<PlaneNavigationCameraConfig>;

  controls?: Partial<PlaneNavigationControlsConfig>;

  terrain?: Partial<PlaneNavigationTerrainConfig>;

  ui?: Partial<PlaneNavigationUiConfig>;

  powerMode?: FlightPowerMode;

  autoStart?: boolean;
}

/** Default GLB URLs shipped with the component distribution. */
export const DEFAULT_AIRCRAFT_ASSETS: DeepReadonly<AircraftAssetConfig> = Object.freeze({
  bodyUrl: new URL("./assets/aircraft/classic.glb", import.meta.url).href,
  propellerUrl: new URL(
    "./assets/aircraft/funky-toy-plane-propeller.glb",
    import.meta.url,
  ).href,
  boostUrl: new URL(
    "./assets/aircraft/classic-boost.glb",
    import.meta.url,
  ).href,
});

/** Default settings for a new element, before attributes or programmatic patches. */
export const DEFAULT_PLANE_NAVIGATION_CONFIG: DeepReadonly<PlaneNavigationConfig> = Object.freeze({
  flight: null,
  assets: DEFAULT_AIRCRAFT_ASSETS,
  start: Object.freeze({
    speedMps: FLIGHT_TUNING.cruiseSpeed,
  }),
  camera: Object.freeze({
    mode: "chase",
    fovDeg: DEFAULT_FLIGHT_FOV_DEGREES,
    bankedViewport: true,
    submissionHz: 60,
  }),
  controls: Object.freeze({
    keyboard: true,
    gamepad: true,
    sensitivity: DEFAULT_FLIGHT_SENSITIVITY,
    invertPitch: DEFAULT_INVERT_PITCH,
    captureSceneNavigation: true,
  }),
  terrain: Object.freeze({
    enabled: true,
    minimumClearanceM: 2.8,
    maximumAglM: 50_000,
  }),
  ui: Object.freeze({
    enabled: false,
    joystick: "auto",
    joystickPosition: "bottom-left",
    position: "bottom-end",
    controls: PLANE_NAVIGATION_UI_CONTROLS,
    showSpeed: false,
    locale: "auto",
  }),
  powerMode: "normal",
  autoStart: true,
});

function finiteOrUndefined(value: number | undefined): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

/** Returns whether `value` names one of the built-in toolbar controls. */
export function isPlaneNavigationUiControl(
  value: string,
): value is PlaneNavigationUiControl {
  return (PLANE_NAVIGATION_UI_CONTROLS as readonly string[]).includes(value);
}

/** Returns whether `value` is a supported overlay position. */
export function isPlaneNavigationUiPosition(
  value: string,
): value is PlaneNavigationUiPosition {
  return (PLANE_NAVIGATION_UI_POSITIONS as readonly string[]).includes(value);
}

/** Filters unknown controls and preserves the first occurrence of each valid name. */
export function normalizePlaneNavigationUiControls(
  values: readonly string[],
): readonly PlaneNavigationUiControl[] {
  return Array.from(new Set(values.filter(isPlaneNavigationUiControl)));
}

function normalizeLocalePreference(
  value: FlightLocalePreference | string,
  fallback: FlightLocalePreference,
): FlightLocalePreference {
  if (value === "auto") return "auto";
  return supportedFlightLocale(value) ?? fallback;
}

/**
 * Apply defaults and validate a full configuration snapshot.
 *
 * Coordinates must be supplied as a pair and latitude must be in range. Numeric
 * flight settings are clamped to supported limits; invalid optional start
 * numbers become absent. Nested values are copied into the returned snapshot.
 * @param input Partial settings to normalize.
 * @param base Defaults/current snapshot from which omitted fields inherit.
 * @returns A fully populated mutable copy safe for internal use.
 * @throws {Error} If coordinates are incomplete, required assets are missing, or flight input is invalid.
 */
export function normalizePlaneNavigationConfig(
  input: PlaneNavigationConfigInput = {},
  base: DeepReadonly<PlaneNavigationConfig> = DEFAULT_PLANE_NAVIGATION_CONFIG,
): PlaneNavigationConfig {
  const start = { ...base.start, ...input.start };
  const longitude = finiteOrUndefined(start.longitude);
  const latitude = finiteOrUndefined(start.latitude);
  if ((longitude === undefined) !== (latitude === undefined)) {
    throw new Error("start.longitude and start.latitude must be supplied together.");
  }
  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    throw new Error("start.latitude must be between -90 and 90 degrees.");
  }

  const camera = { ...base.camera, ...input.camera };
  const controls = { ...base.controls, ...input.controls };
  const terrain = { ...base.terrain, ...input.terrain };
  const ui = { ...base.ui, ...input.ui };
  const assets = { ...base.assets, ...input.assets };
  if (!assets.bodyUrl?.trim()) {
    throw new Error("assets.bodyUrl is required.");
  }

  const flightInput = input.flight === undefined ? base.flight : input.flight;
  const flight = flightInput ? normalizeAircraftFlight(flightInput) : null;
  if (assets.propellerAnchorM && ![assets.propellerAnchorM.x, assets.propellerAnchorM.y, assets.propellerAnchorM.z].every(Number.isFinite))
    throw new Error('assets.propellerAnchorM must contain finite metre offsets.');
  if (assets.visualPitchDeg !== undefined && !Number.isFinite(assets.visualPitchDeg))
    throw new Error('assets.visualPitchDeg must be finite.');
  return {
    flight,
    assets: {
      propellerAnchorM: assets.propellerAnchorM ? { ...assets.propellerAnchorM } : undefined,
      preserveFinish: assets.preserveFinish,
      visualPitchDeg: assets.visualPitchDeg,
      bodyUrl: assets.bodyUrl,
      propellerUrl: assets.propellerUrl?.trim() || null,
      boostUrl: assets.boostUrl?.trim() || null,
    },
    start: {
      longitude,
      latitude,
      altitudeM: finiteOrUndefined(start.altitudeM),
      headingDeg: finiteOrUndefined(start.headingDeg),
      speedMps: clamp(
        finiteOrUndefined(input.start?.speedMps) ?? (input.flight !== undefined
          ? flight?.tuning.cruiseSpeed ?? FLIGHT_TUNING.cruiseSpeed
          : finiteOrUndefined(start.speedMps) ?? FLIGHT_TUNING.cruiseSpeed),
        flight?.tuning.minimumSpeed ?? FLIGHT_TUNING.minimumSpeed,
        flight?.tuning.turboMaximumSpeed ?? FLIGHT_TUNING.turboMaximumSpeed,
      ),
    },
    camera: {
      mode: camera.mode === "cockpit" ? "cockpit" : "chase",
      fovDeg: clamp(Number(camera.fovDeg) || DEFAULT_FLIGHT_FOV_DEGREES, 58, 76),
      bankedViewport: camera.bankedViewport !== false,
      submissionHz: clamp(Number(camera.submissionHz) || 60, 30, 60),
    },
    controls: {
      keyboard: controls.keyboard !== false,
      gamepad: controls.gamepad !== false,
      sensitivity: clamp(
        Number(controls.sensitivity) || DEFAULT_FLIGHT_SENSITIVITY,
        0.5,
        2,
      ),
      invertPitch: controls.invertPitch !== false,
      captureSceneNavigation: controls.captureSceneNavigation !== false,
    },
    terrain: {
      enabled: terrain.enabled !== false,
      minimumClearanceM: clamp(
        Number(terrain.minimumClearanceM) || 2.8,
        0.5,
        100,
      ),
      maximumAglM: clamp(
        Number(terrain.maximumAglM) || 50_000,
        100,
        200_000,
      ),
    },
    ui: {
      enabled: ui.enabled === true,
      joystick: ["auto", "always", "never"].includes(ui.joystick)
        ? ui.joystick : base.ui.joystick,
      joystickPosition: isPlaneNavigationUiPosition(ui.joystickPosition)
        ? ui.joystickPosition : base.ui.joystickPosition,
      position: isPlaneNavigationUiPosition(ui.position)
        ? ui.position
        : base.ui.position,
      controls: normalizePlaneNavigationUiControls(
        Array.isArray(ui.controls) ? ui.controls : base.ui.controls,
      ),
      showSpeed: ui.showSpeed === true,
      locale: normalizeLocalePreference(ui.locale, base.ui.locale),
    },
    powerMode: isFlightPowerMode(input.powerMode)
      ? input.powerMode
      : base.powerMode,
    autoStart: input.autoStart ?? base.autoStart,
  };
}

/**
 * Merge a partial patch into the current snapshot and normalize the result.
 *
 * Each supplied section is shallow-merged with the corresponding current
 * section. Changing the flight profile without an explicit start speed selects
 * that profile's cruise speed. A null flight profile selects classic tuning.
 * @param current Current complete configuration.
 * @param patch Fields to replace or merge into the current value.
 * @returns A new fully normalized configuration; the inputs are not mutated.
 */
export function mergePlaneNavigationConfig(
  current: DeepReadonly<PlaneNavigationConfig>,
  patch: PlaneNavigationConfigInput,
): PlaneNavigationConfig {
  return normalizePlaneNavigationConfig({
    ...patch,
    assets: { ...current.assets, ...patch.assets },
    start: { ...current.start, ...(patch.flight !== undefined && patch.start?.speedMps === undefined ? { speedMps: undefined } : {}), ...patch.start },
    camera: { ...current.camera, ...patch.camera },
    controls: { ...current.controls, ...patch.controls },
    terrain: { ...current.terrain, ...patch.terrain },
    ui: { ...current.ui, ...patch.ui },
    powerMode: patch.powerMode ?? current.powerMode,
    autoStart: patch.autoStart ?? current.autoStart,
  }, current);
}
