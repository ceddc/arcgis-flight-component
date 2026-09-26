/**
 * Safeguard the browser feature gate used before flight initialization.
 * Callable startup APIs pass; each missing API produces an error that names the
 * unsupported feature and tells the caller how to proceed.
 */
import { describe, expect, it } from "vitest";
import { assertFlightBrowserSupport } from "./browser-support";

const supportedFeatures = {
  promiseWithResolvers: () => undefined,
  abortController: () => undefined,
  abortSignalThrowIfAborted: () => undefined,
};

describe("flight browser requirements", () => {
  it("accepts callable implementations of the required built-ins", () => {
    expect(() => assertFlightBrowserSupport(supportedFeatures)).not.toThrow();
  });

  it.each([
    ["promiseWithResolvers", "Promise.withResolvers"],
    ["abortController", "AbortController"],
    ["abortSignalThrowIfAborted", "AbortSignal.throwIfAborted"],
  ] as const)("names the missing %s capability in an actionable error", (key, name) => {
    expect(() => assertFlightBrowserSupport({
      ...supportedFeatures,
      [key]: undefined,
    })).toThrow(
      `Plane navigation requires browser support for ${name}. Update your browser before starting a flight.`,
    );
  });
});
