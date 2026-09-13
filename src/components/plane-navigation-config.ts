import {
  DEFAULT_PLANE_NAVIGATION_CONFIG,
  isPlaneNavigationUiPosition,
  normalizePlaneNavigationUiControls,
  type PlaneNavigationConfig,
  type PlaneNavigationConfigInput,
} from "../config";
import { supportedFlightLocale } from "../i18n";

export const PLANE_NAVIGATION_OBSERVED_ATTRIBUTES = [
  "reference-element",
  "start-longitude",
  "start-latitude",
  "start-altitude-m",
  "start-heading-deg",
  "start-speed-mps",
  "camera-mode",
  "power-mode",
  "sensitivity",
  "fov-deg",
  "invert-pitch-disabled",
  "camera-roll-disabled",
  "keyboard-disabled",
  "gamepad-disabled",
  "capture-scene-navigation-disabled",
  "auto-start-disabled",
  "show-controls",
  "ui-position",
  "ui-controls",
  "show-speed",
  "locale",
] as const;

interface AttributeReader {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
}

function numericAttribute(
  element: AttributeReader,
  name: string,
): number | undefined {
  const raw = element.getAttribute(name);
  if (raw === null || raw.trim() === "") return undefined;

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return value;
}

function invalidAttribute(
  name: string,
  value: string,
  expected: string,
): never {
  throw new Error(`${name}="${value}" is invalid; expected ${expected}.`);
}

function coordinateAttributePatch(
  element: AttributeReader,
  name: "start-longitude" | "start-latitude",
  base: PlaneNavigationConfig,
): PlaneNavigationConfigInput {
  const longitudeChanged = name === "start-longitude";
  const otherKey = longitudeChanged ? "latitude" : "longitude";
  const otherName = longitudeChanged ? "start-latitude" : "start-longitude";
  const ownValue = numericAttribute(element, name);

  if (ownValue === undefined) {
    if (element.hasAttribute(otherName)) {
      throw new Error("start.longitude and start.latitude must be supplied together.");
    }
    return { start: { longitude: undefined, latitude: undefined } };
  }

  const otherValue = base.start[otherKey]
    ?? numericAttribute(element, otherName);
  if (otherValue === undefined) {
    throw new Error("start.longitude and start.latitude must be supplied together.");
  }

  return {
    start: longitudeChanged
      ? { longitude: ownValue, latitude: otherValue }
      : { longitude: otherValue, latitude: ownValue },
  };
}

function presentAttributePatch(
  element: AttributeReader,
  name: string,
): PlaneNavigationConfigInput {
  const value = element.getAttribute(name);
  if (value === null) return {};

  switch (name) {
    case "start-altitude-m":
      return { start: { altitudeM: numericAttribute(element, name) } };
    case "start-heading-deg":
      return { start: { headingDeg: numericAttribute(element, name) } };
    case "start-speed-mps":
      return { start: { speedMps: numericAttribute(element, name) } };
    case "camera-mode":
      if (value !== "cockpit" && value !== "chase") {
        invalidAttribute(name, value, '"chase" or "cockpit"');
      }
      return { camera: { mode: value } };
    case "power-mode":
      if (value !== "slow" && value !== "normal" && value !== "turbo") {
        invalidAttribute(name, value, '"slow", "normal", or "turbo"');
      }
      return { powerMode: value };
    case "sensitivity":
      return { controls: { sensitivity: numericAttribute(element, name) } };
    case "fov-deg":
      return { camera: { fovDeg: numericAttribute(element, name) } };
    case "invert-pitch-disabled":
      return { controls: { invertPitch: false } };
    case "camera-roll-disabled":
      return { camera: { bankedViewport: false } };
    case "keyboard-disabled":
      return { controls: { keyboard: false } };
    case "gamepad-disabled":
      return { controls: { gamepad: false } };
    case "capture-scene-navigation-disabled":
      return { controls: { captureSceneNavigation: false } };
    case "auto-start-disabled":
      return { autoStart: false };
    case "show-controls":
      return { ui: { enabled: true } };
    case "show-speed":
      return { ui: { showSpeed: true } };
    case "ui-position":
      if (!isPlaneNavigationUiPosition(value)) {
        invalidAttribute(name, value, "a documented ArcGIS scene slot");
      }
      return { ui: { position: value } };
    case "ui-controls": {
      const controls = value.split(/[\s,]+/).filter(Boolean);
      const normalized = normalizePlaneNavigationUiControls(controls);
      if (normalized.length !== new Set(controls).size) {
        invalidAttribute(name, value, 'power, pause, camera, and/or recover');
      }
      return {
        ui: {
          controls: normalized,
        },
      };
    }
    case "locale": {
      if (value === "auto") return { ui: { locale: "auto" } };
      const locale = supportedFlightLocale(value);
      if (!locale) {
        invalidAttribute(name, value, '"auto", "en", "de", "fr", "it", or "es"');
      }
      return { ui: { locale } };
    }
    default:
      return {};
  }
}

export function planeNavigationAttributePatch(
  element: AttributeReader,
  name: string,
  base: PlaneNavigationConfig,
): PlaneNavigationConfigInput {
  if (name === "start-longitude" || name === "start-latitude") {
    return coordinateAttributePatch(element, name, base);
  }
  if (!element.hasAttribute(name)) {
    return planeNavigationAttributeRemovalPatch(name);
  }
  return presentAttributePatch(element, name);
}

export function planeNavigationAttributeRemovalPatch(
  name: string,
): PlaneNavigationConfigInput {
  const defaults = DEFAULT_PLANE_NAVIGATION_CONFIG;

  switch (name) {
    case "start-longitude":
      return { start: { longitude: undefined } };
    case "start-latitude":
      return { start: { latitude: undefined } };
    case "start-altitude-m":
      return { start: { altitudeM: undefined } };
    case "start-heading-deg":
      return { start: { headingDeg: undefined } };
    case "start-speed-mps":
      return { start: { speedMps: defaults.start.speedMps } };
    case "camera-mode":
      return { camera: { mode: defaults.camera.mode } };
    case "power-mode":
      return { powerMode: defaults.powerMode };
    case "sensitivity":
      return { controls: { sensitivity: defaults.controls.sensitivity } };
    case "fov-deg":
      return { camera: { fovDeg: defaults.camera.fovDeg } };
    case "invert-pitch-disabled":
      return { controls: { invertPitch: defaults.controls.invertPitch } };
    case "camera-roll-disabled":
      return { camera: { bankedViewport: defaults.camera.bankedViewport } };
    case "keyboard-disabled":
      return { controls: { keyboard: defaults.controls.keyboard } };
    case "gamepad-disabled":
      return { controls: { gamepad: defaults.controls.gamepad } };
    case "capture-scene-navigation-disabled":
      return {
        controls: {
          captureSceneNavigation: defaults.controls.captureSceneNavigation,
        },
      };
    case "show-controls":
      return { ui: { enabled: defaults.ui.enabled } };
    case "ui-position":
      return { ui: { position: defaults.ui.position } };
    case "ui-controls":
      return { ui: { controls: defaults.ui.controls } };
    case "show-speed":
      return { ui: { showSpeed: defaults.ui.showSpeed } };
    case "locale":
      return { ui: { locale: defaults.ui.locale } };
    case "auto-start-disabled":
      return { autoStart: defaults.autoStart };
    default:
      return {};
  }
}

export function planeNavigationConfigRequiresRestart(
  previous: PlaneNavigationConfig,
  next: PlaneNavigationConfig,
): boolean {
  return JSON.stringify(previous.assets) !== JSON.stringify(next.assets)
    || JSON.stringify(previous.start) !== JSON.stringify(next.start)
    || previous.terrain.enabled !== next.terrain.enabled
    || previous.terrain.minimumClearanceM !== next.terrain.minimumClearanceM
    || previous.terrain.maximumAglM !== next.terrain.maximumAglM
    || previous.controls.captureSceneNavigation
      !== next.controls.captureSceneNavigation
    || previous.camera.submissionHz !== next.camera.submissionHz
    || previous.autoStart !== next.autoStart;
}
