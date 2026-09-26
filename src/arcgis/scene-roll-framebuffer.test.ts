/**
 * Verify managed framebuffer attachment forwarding for the roll pass.
 * Checks that depth/stencil is retained and an optional color attachment is
 * forwarded only when the ArcGIS input actually provides it.
 */
import { describe, expect, it, vi } from "vitest";
import { preserveDepthStencil } from "./scene-roll-framebuffer";

const DEPTH_STENCIL_ATTACHMENT = 0x821a;
const COLOR_ATTACHMENT1 = 0x8ce1;

describe("scene-roll framebuffer ownership", () => {
  it("reattaches depth-stencil and an available secondary color attachment", () => {
    const depth = { id: "host-depth" };
    const emissive = { id: "host-emissive" };
    const getAttachment = vi.fn((attachment: number) =>
      attachment === DEPTH_STENCIL_ATTACHMENT ? depth : emissive
    );
    const attachDepth = vi.fn();
    const attachColor = vi.fn();

    preserveDepthStencil(
      { getAttachment },
      { attachDepth, attachColor },
      DEPTH_STENCIL_ATTACHMENT,
      COLOR_ATTACHMENT1,
    );

    expect(attachDepth).toHaveBeenCalledWith(depth);
    expect(attachColor).toHaveBeenCalledWith(emissive, COLOR_ATTACHMENT1);
  });

  it("does not invent a secondary color attachment when the input has none", () => {
    const depth = { id: "host-depth" };
    const getAttachment = vi.fn((attachment: number) =>
      attachment === DEPTH_STENCIL_ATTACHMENT ? depth : undefined
    );
    const attachDepth = vi.fn();
    const attachColor = vi.fn();

    preserveDepthStencil(
      { getAttachment },
      { attachDepth, attachColor },
      DEPTH_STENCIL_ATTACHMENT,
      COLOR_ATTACHMENT1,
    );

    expect(attachDepth).toHaveBeenCalledWith(depth);
    expect(attachColor).not.toHaveBeenCalled();
  });
});
