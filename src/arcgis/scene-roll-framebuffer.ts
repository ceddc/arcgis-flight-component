import type ManagedColorAttachment from "@arcgis/core/views/3d/webgl/ManagedColorAttachment.js";
import type ManagedDepthAttachment from "@arcgis/core/views/3d/webgl/ManagedDepthAttachment.js";

export interface DepthAttachmentInput {
  getAttachment(attachment: number): unknown;
}

export interface FramebufferAttachmentOutput {
  attachDepth(attachment: ManagedDepthAttachment | null | undefined): unknown;
  attachColor(attachment: ManagedColorAttachment, colorAttachment: number): unknown;
}

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
