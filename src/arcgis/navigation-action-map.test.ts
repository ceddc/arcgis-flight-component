/**
 * Verify navigation-action snapshots against accessor-backed properties.
 * The test guards the cleanup contract when ArcGIS exposes actions through
 * prototype getters instead of enumerable fields.
 */
import { describe, expect, it } from "vitest";
import {
  snapshotNavigationActionMap,
  type NavigationActionMapSnapshot,
} from "./navigation-action-map";

describe("navigation action-map ownership", () => {
  it("snapshots non-enumerable ArcGIS Accessor properties for exact restoration", () => {
    const actionMap = Object.defineProperties({}, {
      dragPrimary: { enumerable: false, value: "rotate" },
      dragSecondary: { enumerable: false, value: "pan" },
      dragTertiary: { enumerable: false, value: "none" },
      mouseWheel: { enumerable: false, value: "none" },
    });

    expect(Object.keys(actionMap)).toEqual([]);
    expect(
      snapshotNavigationActionMap(actionMap as NavigationActionMapSnapshot),
    ).toEqual({
      dragPrimary: "rotate",
      dragSecondary: "pan",
      dragTertiary: "none",
      mouseWheel: "none",
    });
  });
});
