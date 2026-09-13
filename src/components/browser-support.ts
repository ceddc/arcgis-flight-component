interface FlightBrowserFeatures {
  promiseWithResolvers: unknown;
  abortController: unknown;
  abortSignalThrowIfAborted: unknown;
}

/**
 * Matches World Sky Tour's capability check without guessing from browser names.
 * This checks flight initialization; the host remains responsible for loading ArcGIS itself.
 */
export function assertFlightBrowserSupport(features: FlightBrowserFeatures = {
  promiseWithResolvers: (Promise as unknown as { withResolvers?: unknown }).withResolvers,
  abortController: typeof AbortController === "undefined" ? undefined : AbortController,
  abortSignalThrowIfAborted: typeof AbortSignal === "undefined" ? undefined : AbortSignal.prototype.throwIfAborted,
}): void {
  const required = [
    ["Promise.withResolvers", features.promiseWithResolvers],
    ["AbortController", features.abortController],
    ["AbortSignal.throwIfAborted", features.abortSignalThrowIfAborted],
  ] as const;
  for (const [name, implementation] of required) {
    if (typeof implementation !== "function") {
      throw new Error(`Plane navigation requires browser support for ${name}. Update your browser before starting a flight.`);
    }
  }
}
