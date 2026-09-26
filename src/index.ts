/**
 * Public entry point for the plane-navigation package. Re-export the custom
 * element, its event/configuration types, aircraft profiles, and flight control
 * types from their owning modules. Importing this entry point also evaluates
 * the custom-element module, which registers `<arcgis-plane-navigation>` once.
 */

/** Built-in aircraft profiles and public model/tuning types. */
export { AIRCRAFT as AIRCRAFT_FLIGHT_PROFILES } from './core/aircraft-profiles';
export type { AircraftId } from './core/aircraft-profiles';
export type { AircraftFlightConfig, AircraftFlightConfigInput, AircraftTuning } from './core/aircraft-flight';
export type { FlightTuning } from './core/profile-flight';
export type { FlightSceneElement } from "./arcgis/flight-host";
/** Custom element constructor, tag name, and lifecycle event payload types. */
export {
  ARCGIS_PLANE_NAVIGATION_TAG,
  ArcgisPlaneNavigationElement,
} from "./components/arcgis-plane-navigation";
export type {
  PlaneNavigationErrorDetail,
  PlaneNavigationErrorEvent,
  PlaneNavigationReadyDetail,
  PlaneNavigationReadyEvent,
  PlaneNavigationSnapshotDetail,
  PlaneNavigationSnapshotEvent,
  PlaneNavigationStatus,
  PlaneNavigationStoppedDetail,
  PlaneNavigationStoppedEvent,
} from "./components/arcgis-plane-navigation";
/** Defaults, configuration constants, validation, and normalization helpers. */
export {
  DEFAULT_AIRCRAFT_ASSETS,
  DEFAULT_PLANE_NAVIGATION_CONFIG,
  isPlaneNavigationUiControl,
  isPlaneNavigationUiPosition,
  mergePlaneNavigationConfig,
  normalizePlaneNavigationConfig,
  normalizePlaneNavigationUiControls,
  PLANE_NAVIGATION_UI_CONTROLS,
  PLANE_NAVIGATION_UI_POSITIONS,
} from "./config";
export type {
  AircraftAssetConfig,
  DeepReadonly,
  PlaneNavigationCameraConfig,
  PlaneNavigationConfig,
  PlaneNavigationConfigInput,
  PlaneNavigationControlsConfig,
  PlaneNavigationJoystickMode,
  PlaneNavigationStartConfig,
  PlaneNavigationTerrainConfig,
  PlaneNavigationUiConfig,
  PlaneNavigationUiControl,
  PlaneNavigationUiPosition,
} from "./config";
/** Supported locale catalogs and translated UI helpers. */
export * from "./i18n";
export type {
  FlightSessionPhase,
  FlightSessionSnapshot,
} from "./controller";
export type {
  ControlFrame,
  ControlFramePatch,
  FlightPowerMode,
  FlightViewMode,
  VehicleState,
} from "./core";
