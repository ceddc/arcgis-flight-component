import type { DragAction, MouseWheelAction } from "@arcgis/core/views/navigation/types.js";

export interface NavigationActionMapSnapshot {
  dragPrimary: DragAction;
  dragSecondary: DragAction;
  dragTertiary: DragAction;
  mouseWheel: MouseWheelAction;
}

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
