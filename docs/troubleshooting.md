# Troubleshooting

If something is not working, start with the closest symptom below. To see
the error itself, add this listener before connecting the flight element:

```ts
flight.addEventListener("arcgisPlaneNavigationError", (event) => {
  console.error(event.detail.error);
});
```

Also check the browser console for ArcGIS service or model-loading errors.

## Aircraft is missing in a large local scene

Check `view.constraints.clipDistance`. Automatic clipping can hide the
aircraft when it is close to the chase camera. Set a suitable near distance
in your application; the component leaves your clipping constraints alone.

## Dependencies cannot be installed

Use Node.js 20 or newer and follow [Getting started](getting-started.md). Git installs need local Git credentials if repository access is restricted. For a checkout, install locked dependencies with `npm ci`.

## SDK mismatch or duplicate SDK instances

The supported peer range is `@arcgis/core >=4.30 <5.2`; the default npm entry targets SDK 5.1. Select the [matching SDK family](sdk-compatibility.md) for older hosts. Unresolved `projectOperator`, `projection`, or `meshUtils` imports usually indicate a wrong family.

Use component-only ESM with a bundler or `arcgis-flight-component.amd.js`
through your existing AMD loader, then assign your 3D `SceneView`. The
standalone `browser/` build includes ArcGIS, so adding it to an app that
already loads the SDK would create a second runtime.

## A required browser feature is unavailable

Update the browser if an error names `Promise.withResolvers`, `AbortController`, or `AbortSignal.throwIfAborted`. Initialization requires all three; `start()` rejects if one is absent. Errors while loading ArcGIS itself need to be handled by your application.

## The component stays idle or `start()` says it is not ready

Configure a host before calling `start()`:

- Direct view: assign `flight.view = existingSceneView`. It must be an undestroyed 3D view with an HTML container.
- Scene element: assign `flight.referenceElement = scene`, or set `reference-element` to an `<arcgis-scene>` ID in the same document.

`view` takes precedence; set it to `null` to return to scene-element binding. No configured host leaves the component `idle`. An explicit blank, missing, or wrong-type reference reports an error.

## `The referenced ArcGIS scene has no map`

Assign a Map or WebScene to your view before starting flight. The component requires a map and ready 3D view; a portal item is optional.

## Supported scene coordinate systems

Use a global Web Mercator view or a local projected view with a finite,
positive linear unit scale (`metersPerUnit`). This includes views in metres,
international feet, and US survey feet. Geographic local scenes and local Web
Mercator are unsupported. Explicit start longitude and latitude are WGS84 and
are projected into the local scene.

A view's global/local mode is fixed at creation. To change it, create and assign a replacement view or scene element. See [Scene distance semantics](configuration.md#scene-distance-semantics) for horizontal and vertical units.

## Address search is unavailable or returns no matches

In the selector demo, check access to `geocode.arcgis.com`, the host's Content Security Policy, and the address text. Searches use Esri's World Geocoding Service with `forStorage: false`; the demo does not persist queries or results.

Results supply longitude and latitude only. If initial ground elevation fails, retry or choose a preset with an explicit altitude.

## A developer item ID is rejected

The selector demo accepts a 32-character hexadecimal item ID, not a portal URL. It requires a public `Web Scene` in global mode with Web Mercator when a spatial reference is declared. Authenticated scenes require the host's own identity flow and scene picker.

## Scene loading times out

The selector demo allows 60 seconds for portal items, WebScenes, and view readiness. Inspect failed or blocked network requests and layer errors. Try the Basic flight demo to isolate portal-item failures. This timeout belongs to the demo.

## A WebScene opens with layer warnings

A view can become ready with failed layers. Inspect the failing URL, access policy, CORS, and service availability. These layer problems need to be fixed in your application or the service.

## A second component is rejected

Only one flight component can control a SceneView at a time. For `This ArcGIS scene already has an active plane navigation instance.`, call `firstFlight.stop()` or disconnect it before `await secondFlight.start()`.

## Aircraft models do not load

`assets.bodyUrl` must be non-empty; propeller and boost URLs may be `null`. Check that each URL returns the intended GLB, permits browser access and cross-origin requests, and survives production asset-path rewriting. Model-load cancellation during scene replacement or disconnect is expected.

## The component runs but the aircraft does not follow

Confirm the supported SDK version and [matching component build](sdk-compatibility.md). Check `arcgisPlaneNavigationError` and the browser console for model or rendering failures.

## The aircraft starts in the wrong place

Omitted coordinates use the loaded view center. Set `start.longitude` and `start.latitude` together for an explicit position; optionally set altitude, heading, and speed. Any start-field change restarts the session. See [Start pose](configuration.md#start-pose).

## Terrain clearance is temporarily unavailable

The live ground sampler may briefly lack data. The component can reuse a ground value for at most 1.5 seconds and within 120 horizontal scene units: metres locally, projected Web Mercator units globally. Otherwise `snapshot().aglM` may be `null`. Vertical elevation and clearance remain metres.

Terrain clearance does not detect buildings, trees, or bridges. Increase `terrain.minimumClearanceM` or reduce speed for more ground clearance; obstacle avoidance belongs in the host application.

## Camera roll is missing

Check that `camera.bankedViewport` is `true`, `camera-roll-disabled` is absent, and the console has no RenderNode or WebGL warnings. Unavailable roll leaves flight running with a level viewport.

To request a level viewport, use `flight.updateConfig({ camera: { bankedViewport: false } })`. It applies immediately and preserves the session phase.

## Flight keys do not respond

Click or focus the scene or direct view's container. Keyboard input must be enabled and the session active. Editable fields keep normal typing; buttons retain normal Arrow and Space activation.

## Gamepad input does not respond

Enable gamepad input, focus the scene, and use a controller exposed with `mapping === "standard"`. Return sticks to neutral once to arm the axes. Deliberate input selects a controller slot when duplicates appear; that slot stays selected until the controller disconnects. Inspect `snapshot().gamepad` for its connection, index, ID, and mapping.

## ArcGIS navigation is unavailable during flight

`controls.captureSceneNavigation` defaults to `true`, suppressing competing ArcGIS navigation. Set it to `false` or add `capture-scene-navigation-disabled` to allow concurrent navigation; this restarts the session. Stopping flight restores the previous navigation settings unless your application has changed them meanwhile.

## The old camera is restored after stopping

Stop and disconnect restore the borrowed camera by default. Use `flight.stop({ restoreCamera: false })` when intentionally replacing the map or view. Cleanup always preserves the caller-owned view, map, and layers.

## Import fails during server rendering

The package registers a custom element and needs browser APIs. Import it from the host framework's client-only entry point. For example:

```ts
if (typeof window !== "undefined") {
  await import("@ceddc/arcgis-flight-component");
}
```

## Development server port changes

`npm run dev` requests port `3116` but may choose another if occupied. Use the URL printed by Vite.

## Diagnose with snapshots

```ts
console.table(flight.snapshot());
console.dir(flight.debugSnapshot(), { depth: null });
```

Use `snapshot()` for the flight state and `debugSnapshot()` for details
about layers, camera, terrain, roll, and the view lease. Both return `null`
when there is no active session. If you report a problem, include your SDK
version, configuration, error message, and a small scene that shows it. The
[development guide](development.md#debugging) has more debugging tips.

## Increasing memory use during long flights

Record the SDK version, flight duration, and a minimal scene that reproduces the increase. Check whether memory remains elevated after `stop()` and whether the host itself retains replaced views or layers. Include what you find when reporting the problem.
