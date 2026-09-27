/**
 * Forward managed framebuffer attachments through the camera-roll render node.
 * The roll shader changes color pixels only; reusing depth/stencil lets later
 * ArcGIS render passes continue with the same scene depth information.
 */
import type ManagedColorAttachment from "@arcgis/core/views/3d/webgl/ManagedColorAttachment.js";
import type ManagedDepthAttachment from "@arcgis/core/views/3d/webgl/ManagedDepthAttachment.js";

/** Minimal input framebuffer contract needed to forward existing render attachments. */
export interface DepthAttachmentInput {
  getAttachment(attachment: number): unknown;
}

/** Minimal output framebuffer contract used by the scene-roll post-process node. */
export interface FramebufferAttachmentOutput {
  attachDepth(attachment: ManagedDepthAttachment | null | undefined): unknown;
  attachColor(attachment: ManagedColorAttachment, colorAttachment: number): unknown;
}

/**
 * Preserve the input depth/stencil buffer and, when present, a requested color buffer.
 *
 * The roll pass transforms only the rendered color. Reusing the input depth
 * attachment keeps later 3D scene passes and depth-aware composition consistent;
 * the optional color attachment is copied only when ArcGIS actually supplied it.
 *
 * @param input Framebuffer whose attachments should be retained.
 * @param output Framebuffer receiving the attachments.
 * @param depthStencilAttachment ArcGIS attachment enum for depth/stencil.
 * @param optionalColorAttachment Optional color attachment enum to retain.
 */
export function preserveDepthStencil(
  input: DepthAttachmentInput,
  output: FramebufferAttachmentOutput,
  depthStencilAttachment: number,
  optionalColorAttachment?: number,
): void {
  output.attachDepth(
    input.getAttachment(depthStencilAttachment) as
      | ManagedDepthAttachment
      | null
      | undefined,
  );
  if (optionalColorAttachment === undefined) return;
  const color = input.getAttachment(optionalColorAttachment) as
    | ManagedColorAttachment
    | null
    | undefined;
  if (color) output.attachColor(color, optionalColorAttachment);
}
