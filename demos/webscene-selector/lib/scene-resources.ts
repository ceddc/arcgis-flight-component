/**
 * Releases ArcGIS objects created while the explorer loads or switches scenes.
 * Pending loads are cancelled when supported, and already destroyed objects
 * are skipped so callers can clean up timeout and rollback paths safely.
 */
/**
 * Minimal lifecycle contract shared by ArcGIS resources owned by this demo.
 * Optional cancelLoad allows a pending SDK request to be stopped before destroy.
 */
export interface ArcGISDisposableResource {
  readonly destroyed?: boolean;
  cancelLoad?(): unknown;
  destroy(): void;
}

/**
 * Cancels pending work and releases a demo-owned ArcGIS resource once.
 *
 * @param resource Resource to release; null, undefined, and already-destroyed
 *   values are treated as no-ops.
 * @returns True when destroy was invoked, false when there was nothing to do.
 * @throws Re-throws a cancelLoad error after still attempting destroy.
 */
export function disposeArcGISResource(
  resource: ArcGISDisposableResource | null | undefined,
): boolean {
  if (!resource || resource.destroyed) return false;
  try {
    resource.cancelLoad?.();
  } finally {
    resource.destroy();
  }
  return true;
}
