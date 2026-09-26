/**
 * Safeguard the public configuration defaults and normalization contract.
 * The suite checks immutable exported defaults, independent normalized values,
 * geographic validation, numeric limits, and optional UI control settings.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_AIRCRAFT_ASSETS,
  DEFAULT_PLANE_NAVIGATION_CONFIG,
  PLANE_NAVIGATION_UI_CONTROLS,
  PLANE_NAVIGATION_UI_POSITIONS,
  normalizePlaneNavigationConfig,
} from "./config";

describe("plane navigation config", () => {
  it("matches the documented control and camera defaults", () => {
    expect(DEFAULT_PLANE_NAVIGATION_CONFIG.controls).toMatchObject({
      sensitivity: 0.8,
      invertPitch: true,
    });
    expect(DEFAULT_PLANE_NAVIGATION_CONFIG.camera).toMatchObject({
      mode: "chase",
      fovDeg: 65,
      submissionHz: 60,
    });
    expect(DEFAULT_PLANE_NAVIGATION_CONFIG.terrain.maximumAglM).toBe(50_000);
    expect(normalizePlaneNavigationConfig().terrain.maximumAglM).toBe(50_000);
    expect(DEFAULT_PLANE_NAVIGATION_CONFIG.powerMode).toBe("normal");
    expect(DEFAULT_PLANE_NAVIGATION_CONFIG.start.speedMps).toBe(100);
    expect(DEFAULT_PLANE_NAVIGATION_CONFIG.ui).toEqual({
      enabled: false,
      joystick: "auto",
      joystickPosition: "bottom-left",
      position: "bottom-end",
      controls: ["power", "pause", "camera", "recover"],
      showSpeed: false,
      locale: "auto",
    });
  });

  it("deep-freezes exported defaults and returns independent normalized values", () => {
    expect(Object.isFrozen(DEFAULT_AIRCRAFT_ASSETS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PLANE_NAVIGATION_CONFIG)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PLANE_NAVIGATION_CONFIG.assets)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PLANE_NAVIGATION_CONFIG.start)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PLANE_NAVIGATION_CONFIG.camera)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PLANE_NAVIGATION_CONFIG.controls)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PLANE_NAVIGATION_CONFIG.terrain)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PLANE_NAVIGATION_CONFIG.ui)).toBe(true);
    expect(Object.isFrozen(PLANE_NAVIGATION_UI_CONTROLS)).toBe(true);
    expect(Object.isFrozen(PLANE_NAVIGATION_UI_POSITIONS)).toBe(true);

    expect(() => {
      (DEFAULT_PLANE_NAVIGATION_CONFIG.camera as { fovDeg: number }).fovDeg = 10;
    }).toThrow(TypeError);
    const first = normalizePlaneNavigationConfig();
    first.camera.fovDeg = 72;
    first.ui.controls = ["camera"];
    const second = normalizePlaneNavigationConfig();
    expect(second.camera.fovDeg).toBe(65);
    expect(second.ui.controls).toEqual(["power", "pause", "camera", "recover"]);
  });

  it("validates geographic starts and clamps public tuning", () => {
    expect(() => normalizePlaneNavigationConfig({
      start: { longitude: 6.14 },
    })).toThrow(/together/);
    const normalized = normalizePlaneNavigationConfig({
      start: { longitude: 6.14, latitude: 46.2, speedMps: 999 },
      controls: { sensitivity: 9 },
      camera: { fovDeg: 100, submissionHz: 5 },
    });
    expect(normalized.start.speedMps).toBeCloseTo(1_200 / 3.6);
    expect(normalized.controls.sensitivity).toBe(2);
    expect(normalized.camera.fovDeg).toBe(76);
    expect(normalized.camera.submissionHz).toBe(30);

    expect(normalizePlaneNavigationConfig({
      camera: { submissionHz: 120 },
    }).camera.submissionHz).toBe(60);
  });

  it.each([
    [50, 100], [50_000, 50_000], [200_000, 200_000], [300_000, 200_000], [NaN, 50_000],
  ])("normalizes an AGL ceiling of %s to %s metres", (requested, expected) => {
    expect(normalizePlaneNavigationConfig({
      terrain: { maximumAglM: requested },
    }).terrain.maximumAglM).toBe(expected);
  });

  it("normalizes the optional in-scene controls without changing headless defaults", () => {
    const normalized = normalizePlaneNavigationConfig({
      ui: {
        enabled: true,
        position: "top-start",
        controls: ["power", "unknown", "power"] as never,
        showSpeed: true,
        locale: "es",
      },
    });
    expect(normalized.ui).toEqual({
      enabled: true,
      joystick: "auto",
      joystickPosition: "bottom-left",
      position: "top-start",
      controls: ["power"],
      showSpeed: true,
      locale: "es",
    });

    const invalid = normalizePlaneNavigationConfig({
      ui: { position: "middle" as never, locale: "xx" as never },
    });
    expect(invalid.ui.position).toBe("bottom-end");
    expect(invalid.ui.locale).toBe("auto");
  });
});
