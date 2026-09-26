/**
 * Verifies the order and idempotence guarantees of demo-owned ArcGIS cleanup,
 * including the case where cancelLoad throws.
 */
import { describe, expect, it, vi } from "vitest";
import { disposeArcGISResource } from "./scene-resources";

describe("demo ArcGIS resource ownership", () => {
  it("cancels loading before destroying an owned resource", () => {
    const calls: string[] = [];
    const resource = {
      destroyed: false,
      cancelLoad: vi.fn(() => calls.push("cancel")),
      destroy: vi.fn(() => calls.push("destroy")),
    };

    expect(disposeArcGISResource(resource)).toBe(true);
    expect(calls).toEqual(["cancel", "destroy"]);
  });

  it("does not destroy an already destroyed resource", () => {
    const resource = {
      destroyed: true,
      cancelLoad: vi.fn(),
      destroy: vi.fn(),
    };

    expect(disposeArcGISResource(resource)).toBe(false);
    expect(resource.cancelLoad).not.toHaveBeenCalled();
    expect(resource.destroy).not.toHaveBeenCalled();
  });

  it("still destroys a resource when load cancellation throws", () => {
    const resource = {
      destroyed: false,
      cancelLoad: vi.fn(() => { throw new Error("cancel failed"); }),
      destroy: vi.fn(),
    };

    expect(() => disposeArcGISResource(resource)).toThrow("cancel failed");
    expect(resource.destroy).toHaveBeenCalledOnce();
  });
});
