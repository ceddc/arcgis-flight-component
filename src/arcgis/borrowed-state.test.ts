import { describe, expect, it, vi } from "vitest";
import { restoreBorrowedValue } from "./borrowed-state";

describe("borrowed host state", () => {
  it("restores a value that still matches the component setting", () => {
    const restore = vi.fn();
    expect(restoreBorrowedValue({
      current: false,
      applied: false,
      original: true,
      restore,
    })).toBe(true);
    expect(restore).toHaveBeenCalledWith(true);
  });

  it("preserves a newer host value", () => {
    const restore = vi.fn();
    expect(restoreBorrowedValue({
      current: true,
      applied: false,
      original: false,
      restore,
    })).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  it("uses identity for an action-map lease", () => {
    const applied = { dragPrimary: "none" };
    const hostReplacement = { dragPrimary: "none" };
    const restore = vi.fn();
    expect(restoreBorrowedValue({
      current: hostReplacement,
      applied,
      original: { dragPrimary: "pan" },
      restore,
    })).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  it("preserves an in-place host mutation to an applied action map", () => {
    const applied = { dragPrimary: "none", mouseWheel: "none" };
    const restore = vi.fn();
    applied.mouseWheel = "zoom";
    expect(restoreBorrowedValue({
      current: applied,
      applied,
      original: { dragPrimary: "pan", mouseWheel: "zoom" },
      restore,
      equals: (current, expected) => (
        current === expected
        && current.dragPrimary === "none"
        && current.mouseWheel === "none"
      ),
    })).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });
});
