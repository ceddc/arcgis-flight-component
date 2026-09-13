export interface ArcGISDisposableResource {
  readonly destroyed?: boolean;
  cancelLoad?(): unknown;
  destroy(): void;
}

/** Cancels pending work and releases a demo-owned ArcGIS resource exactly once. */
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
