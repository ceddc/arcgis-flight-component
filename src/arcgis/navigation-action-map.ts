/**
 * Snapshot the ArcGIS navigation actions replaced while flight controls run.
 * Reading named properties explicitly also captures accessor-backed actions,
 * giving session teardown the values it needs to restore the caller's view.
 */
import type { DragAction, MouseWheelAction } from "@arcgis/core/views/navigation/types.js";

/** A shallow snapshot of the four ArcGIS navigation actions temporarily replaced during flight. */
export interface NavigationActionMapSnapshot {
  dragPrimary: DragAction;
  dragSecondary: DragAction;
  dragTertiary: DragAction;
  mouseWheel: MouseWheelAction;
}

/**
 * Copy the known navigation action properties, including accessor-backed values.
 *
 * ArcGIS action maps may expose these properties through accessors rather than
 * enumerable own fields, so an explicit property read gives cleanup a reliable
 * snapshot to restore.
 *
 * @param actionMap The live ArcGIS navigation map to snapshot.
 * @returns A plain object containing the original drag and wheel actions.
 */
export function snapshotNavigationActionMap(
  actionMap: NavigationActionMapSnapshot,
): NavigationActionMapSnapshot {
  return {
    dragPrimary: actionMap.dragPrimary,
    dragSecondary: actionMap.dragSecondary,
    dragTertiary: actionMap.dragTertiary,
    mouseWheel: actionMap.mouseWheel,
  };
}
