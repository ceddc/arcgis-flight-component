/**
 * Normalize ArcGIS render-target dimensions before allocating roll-pass buffers.
 * Each missing or invalid axis uses its own fallback, then rounds and clamps to
 * a positive pixel count accepted by viewport and texture APIs.
 */
export interface RenderTargetDescriptor {
  height?: number;
  width?: number;
}

/**
 * Read finite dimensions from a render target, falling back independently per axis.
 *
 * Dimensions are rounded and clamped to at least one pixel because downstream
 * viewport and texture allocation APIs cannot use zero-sized targets.
 *
 * @param descriptor Optional target metadata supplied by the render pipeline.
 * @param fallbackWidth Width to use when the descriptor has no valid width.
 * @param fallbackHeight Height to use when the descriptor has no valid height.
 * @returns Positive integer dimensions safe for graphics allocation.
 */
export function resolveRenderTargetSize(
  descriptor: RenderTargetDescriptor | undefined,
  fallbackWidth: number,
  fallbackHeight: number,
): { height: number; width: number } {
  const descriptorWidth = descriptor?.width;
  const descriptorHeight = descriptor?.height;
  return {
    width: Math.max(
      1,
      Math.round(typeof descriptorWidth === "number" && Number.isFinite(descriptorWidth)
        ? descriptorWidth
        : fallbackWidth),
    ),
    height: Math.max(
      1,
      Math.round(typeof descriptorHeight === "number" && Number.isFinite(descriptorHeight)
        ? descriptorHeight
        : fallbackHeight),
    ),
  };
}
