export interface RenderTargetDescriptor {
  height?: number;
  width?: number;
}

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
