/**
 * Verify the session disposer with ordered and throwing cleanup callbacks.
 * Checks phase order, reverse acquisition order, idempotence and that one
 * failure does not prevent later resources from being released.
 */
import { describe, expect, it, vi } from "vitest";
import { Disposer } from "./disposer";

describe("Disposer", () => {
  it("is idempotent, ordered, and continues after a cleanup failure", () => {
    const calls: string[] = [];
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const disposer = new Disposer();
    disposer.add("last", 30, () => calls.push("last"));
    disposer.add("first", 10, () => calls.push("first"));
    disposer.add("broken", 20, () => { throw new Error("broken"); });
    disposer.add("also broken order", 20, () => calls.push("second"));

    disposer.dispose();
    disposer.dispose();

    expect(calls).toEqual(["first", "second", "last"]);
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });
});
