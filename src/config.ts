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

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export interface AircraftAssetConfig {
  bodyUrl: string;

  propellerUrl: string | null;

  boostUrl: string | null;
}

export interface PlaneNavigationStartConfig {
  longitude?: number;

  latitude?: number;

  altitudeM?: number;

  headingDeg?: number;

  speedMps?: number;
}

export interface PlaneNavigationCameraConfig {
  mode: FlightViewMode;

  fovDeg: number;

  bankedViewport: boolean;

  submissionHz: number;
}

export interface PlaneNavigationControlsConfig {
  keyboard: boolean;

  gamepad: boolean;

  sensitivity: number;

  invertPitch: boolean;

  captureSceneNavigation: boolean;
}

export interface PlaneNavigationTerrainConfig {
  enabled: boolean;

  minimumClearanceM: number;

  maximumAglM: number;
}

export const PLANE_NAVIGATION_UI_CONTROLS = Object.freeze([
  "power",
  "pause",
  "camera",
  "recover",
] as const);

export type PlaneNavigationUiControl =
  (typeof PLANE_NAVIGATION_UI_CONTROLS)[number];

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

export type PlaneNavigationUiPosition =
  (typeof PLANE_NAVIGATION_UI_POSITIONS)[number];

export interface PlaneNavigationUiConfig {
  enabled: boolean;

  position: PlaneNavigationUiPosition;

  controls: readonly PlaneNavigationUiControl[];

  showSpeed: boolean;

  locale: FlightLocalePreference;
}

export interface PlaneNavigationConfig {
  assets: AircraftAssetConfig;

  start: PlaneNavigationStartConfig;

  camera: PlaneNavigationCameraConfig;

  controls: PlaneNavigationControlsConfig;

  terrain: PlaneNavigationTerrainConfig;

  ui: PlaneNavigationUiConfig;

  powerMode: FlightPowerMode;

  autoStart: boolean;
}

export interface PlaneNavigationConfigInput {
  assets?: Partial<AircraftAssetConfig>;

  start?: PlaneNavigationStartConfig;

  camera?: Partial<PlaneNavigationCameraConfig>;

  controls?: Partial<PlaneNavigationControlsConfig>;

  terrain?: Partial<PlaneNavigationTerrainConfig>;

  ui?: Partial<PlaneNavigationUiConfig>;

  powerMode?: FlightPowerMode;

  autoStart?: boolean;
}

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

export const DEFAULT_PLANE_NAVIGATION_CONFIG: DeepReadonly<PlaneNavigationConfig> = Object.freeze({
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

export function isPlaneNavigationUiControl(
  value: string,
): value is PlaneNavigationUiControl {
  return (PLANE_NAVIGATION_UI_CONTROLS as readonly string[]).includes(value);
}

export function isPlaneNavigationUiPosition(
  value: string,
): value is PlaneNavigationUiPosition {
  return (PLANE_NAVIGATION_UI_POSITIONS as readonly string[]).includes(value);
}

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

  return {
    assets: {
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
        finiteOrUndefined(start.speedMps) ?? FLIGHT_TUNING.cruiseSpeed,
        FLIGHT_TUNING.minimumSpeed,
        FLIGHT_TUNING.turboMaximumSpeed,
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

export function mergePlaneNavigationConfig(
  current: DeepReadonly<PlaneNavigationConfig>,
  patch: PlaneNavigationConfigInput,
): PlaneNavigationConfig {
  return normalizePlaneNavigationConfig({
    ...patch,
    assets: { ...current.assets, ...patch.assets },
    start: { ...current.start, ...patch.start },
    camera: { ...current.camera, ...patch.camera },
    controls: { ...current.controls, ...patch.controls },
    terrain: { ...current.terrain, ...patch.terrain },
    ui: { ...current.ui, ...patch.ui },
    powerMode: patch.powerMode ?? current.powerMode,
    autoStart: patch.autoStart ?? current.autoStart,
  }, current);
}
