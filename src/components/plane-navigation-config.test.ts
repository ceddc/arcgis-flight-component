/**
 * Safeguard declarative attribute parsing for the plane-navigation element.
 * The suite covers paired coordinates, invalid values, control and locale lists,
 * removal defaults, and which changes need a new flight session.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLANE_NAVIGATION_CONFIG,
  mergePlaneNavigationConfig,
} from "../config";
import {
  PLANE_NAVIGATION_OBSERVED_ATTRIBUTES,
  planeNavigationAttributePatch,
  planeNavigationAttributeRemovalPatch,
  planeNavigationConfigRequiresRestart,
} from "./plane-navigation-config";

/** Build a minimal attribute reader for declarative configuration tests. */
function attributes(values: Record<string, string>) {
  const entries = new Map(Object.entries(values));
  return {
    getAttribute: (name: string) => entries.get(name) ?? null,
    hasAttribute: (name: string) => entries.has(name),
  };
}

describe("plane navigation attribute changes", () => {
  it("moves and hides the joystick live, and restores automatic mobile defaults", () => {
    const base = mergePlaneNavigationConfig(DEFAULT_PLANE_NAVIGATION_CONFIG, {});
    const next = mergePlaneNavigationConfig(base, {
      ...planeNavigationAttributePatch(attributes({ joystick: "always" }), "joystick", base),
    });
    const moved = mergePlaneNavigationConfig(next,
      planeNavigationAttributePatch(attributes({ "joystick-position": "bottom-right" }), "joystick-position", next));
    expect(moved.ui).toMatchObject({ enabled: false, joystick: "always", joystickPosition: "bottom-right" });
    expect(planeNavigationConfigRequiresRestart(base, moved)).toBe(false);
    expect(planeNavigationAttributeRemovalPatch("joystick")).toEqual({ ui: { joystick: "auto" } });
    expect(planeNavigationAttributeRemovalPatch("joystick-position")).toEqual({ ui: { joystickPosition: "bottom-left" } });
    expect(() => planeNavigationAttributePatch(attributes({ joystick: "sometimes" }), "joystick", base)).toThrow(/invalid/);
    expect(() => planeNavigationAttributePatch(attributes({ "joystick-position": "middle" }), "joystick-position", base)).toThrow(/invalid/);
  });

  it("keeps the banked viewport attribute live when added then removed", () => {
    const disabled = mergePlaneNavigationConfig(DEFAULT_PLANE_NAVIGATION_CONFIG, {
      camera: { bankedViewport: false },
    });
    const restored = mergePlaneNavigationConfig(
      disabled,
      planeNavigationAttributeRemovalPatch("camera-roll-disabled"),
    );
    expect(disabled.camera.bankedViewport).toBe(false);
    expect(restored.camera.bankedViewport).toBe(true);
    expect(planeNavigationConfigRequiresRestart(disabled, restored)).toBe(false);
  });

  it("restores initial speed and navigation capture through restart paths", () => {
    const changed = mergePlaneNavigationConfig(DEFAULT_PLANE_NAVIGATION_CONFIG, {
      start: { speedMps: 200 },
      controls: { captureSceneNavigation: false },
    });
    const restoredSpeed = mergePlaneNavigationConfig(
      changed,
      planeNavigationAttributeRemovalPatch("start-speed-mps"),
    );
    const restoredCapture = mergePlaneNavigationConfig(
      changed,
      planeNavigationAttributeRemovalPatch("capture-scene-navigation-disabled"),
    );
    expect(restoredSpeed.start.speedMps).toBe(100);
    expect(restoredCapture.controls.captureSceneNavigation).toBe(true);
    expect(planeNavigationConfigRequiresRestart(changed, restoredSpeed)).toBe(true);
    expect(planeNavigationConfigRequiresRestart(changed, restoredCapture)).toBe(true);
  });

  it("keeps presentation-only changes live", () => {
    const next = mergePlaneNavigationConfig(DEFAULT_PLANE_NAVIGATION_CONFIG, {
      ui: { enabled: true, locale: "es" },
      powerMode: "turbo",
    });
    expect(planeNavigationConfigRequiresRestart(
      DEFAULT_PLANE_NAVIGATION_CONFIG,
      next,
    )).toBe(false);
  });

  it("keeps the observed attribute list unique", () => {
    expect(new Set(PLANE_NAVIGATION_OBSERVED_ATTRIBUTES).size).toBe(
      PLANE_NAVIGATION_OBSERVED_ATTRIBUTES.length,
    );
  });

  it("parses a complete start coordinate as one patch", () => {
    // Longitude and latitude are intentionally atomic: applying either half would create an invalid start position.
    const element = attributes({
      "start-longitude": "-112.14",
      "start-latitude": "36.06",
    });

    expect(planeNavigationAttributePatch(
      element,
      "start-longitude",
      DEFAULT_PLANE_NAVIGATION_CONFIG,
    )).toEqual({
      start: { longitude: -112.14, latitude: 36.06 },
    });
  });

  it("rejects a partial start coordinate and non-finite numbers", () => {
    expect(() => planeNavigationAttributePatch(
      attributes({ "start-longitude": "-112.14" }),
      "start-longitude",
      DEFAULT_PLANE_NAVIGATION_CONFIG,
    )).toThrow("must be supplied together");

    expect(() => planeNavigationAttributePatch(
      attributes({ sensitivity: "fast" }),
      "sensitivity",
      DEFAULT_PLANE_NAVIGATION_CONFIG,
    )).toThrow("sensitivity must be a finite number");
  });

  it("normalizes controls and locale attributes", () => {
    expect(planeNavigationAttributePatch(
      attributes({ "ui-controls": "power, pause camera power" }),
      "ui-controls",
      DEFAULT_PLANE_NAVIGATION_CONFIG,
    )).toEqual({
      ui: { controls: ["power", "pause", "camera"] },
    });

    expect(planeNavigationAttributePatch(
      attributes({ locale: "fr-CH" }),
      "locale",
      DEFAULT_PLANE_NAVIGATION_CONFIG,
    )).toEqual({ ui: { locale: "fr" } });
  });

  it("rejects unsupported declarative enum and list values", () => {
    const invalidValues = [
      ["camera-mode", "orbit"],
      ["power-mode", "boost"],
      ["ui-position", "middle"],
      ["ui-controls", "power eject"],
      ["locale", "xx"],
    ] as const;

    // Keep each invalid attribute covered through the same public parser used by observed-attribute updates.
    for (const [name, value] of invalidValues) {
      expect(() => planeNavigationAttributePatch(
        attributes({ [name]: value }),
        name,
        DEFAULT_PLANE_NAVIGATION_CONFIG,
      )).toThrow(new RegExp(`${name}=.*invalid`));
    }
  });
});
