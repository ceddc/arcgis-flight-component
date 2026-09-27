/**
 * Check the browser primitives required by asynchronous flight startup. The
 * custom element calls this before initialization so unsupported runtimes fail
 * with a specific API name instead of failing later during scene setup.
 */
interface FlightBrowserFeatures {
  promiseWithResolvers: unknown;
  abortController: unknown;
  abortSignalThrowIfAborted: unknown;
}

/**
 * Verify the built-in browser APIs used by flight initialization are available.
 *
 * This checks `Promise.withResolvers`, `AbortController` and
 * `AbortSignal.throwIfAborted`; ArcGIS SDK loading remains the host application's
 * responsibility. Injected features let tests exercise unsupported browsers.
 *
 * @param features Browser API implementations to check; defaults to the current global APIs.
 * @throws {Error} If any required API is missing or is not callable.
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
