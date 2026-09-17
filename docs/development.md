# Development guide

This guide is for changing the component. For using it in an application, start with [Getting started](getting-started.md).

To build your own plane, use [Custom aircraft](custom-aircraft.md) for the asset contract, default flight limits, and the files to change. [Flight concepts](flight-concepts.md) explains how the visible plane, camera, and terrain checks fit together.

## Local setup

Use the Node.js version in [package.json](../package.json) and the locked dependencies:

```sh
npm ci
npm run dev
```

Documentation and the four samples share a top menu and run at [127.0.0.1:3116](http://127.0.0.1:3116/). Reuse an existing server for this checkout. WebGL and access to the demos' ArcGIS services are required.

## Commands

| Change | Validation |
| --- | --- |
| Code | Run the relevant file with `npm run test -- <path>`, then `npm run verify` for tests, type checking, and builds. |
| Flight or camera math | Also run `npm run test:ab`; preserve the reference fixture during refactors. |
| Rendering, lifecycle, input, or demo UI | Run `npm run test:browser` and inspect the affected state in a real browser. Install Chromium once with `npx playwright install chromium`. |
| SDK or packaging | Run `npm run test:sdk` for the affected SDKs and check the matching ESM family and AMD loader. Validate aircraft motion, viewport roll, and host cleanup before updating dependency pins or the supported range. |
| Documentation | Run `npm run docs:build`; inspect the changed pages and links. |

Use `git diff --check` before handing off changes. Mocked tests cover contracts; they do not prove that a scene renders correctly.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `src/components/` | Public element, attributes, configuration, lifecycle, and optional built-in controls. |
| `src/controller/` | Flight session, input/simulation orchestration, recovery, and snapshots. |
| `src/core/` | Deterministic flight, camera math, and interpolation, without ArcGIS or DOM dependencies. |
| `src/arcgis/` | Host binding, aircraft graphics, terrain, camera presentation, SDK compatibility, and resource cleanup. |
| `src/input/`, `src/i18n/` | Scene-scoped input and translated component controls. |
| `src/index.ts`, `src/browser.ts` | Component-only entry and standalone entry that also supplies ArcGIS. |
| `demos/` | Host applications; shared Calcite UI lives in `demos/shared/`. |
| `scripts/build-component-distributions.mjs` | External SDK mapping and ESM/AMD build output. |

## Implementation rules

- Use direct TypeScript and public SDK APIs, except for the guarded aircraft-origin adapter documented below. Keep scene selection, authentication, search, and page layout in the host application.
- Preserve the [ownership and lifecycle contract](architecture.md). Cleanup must cover cancellation, repeated connection, host callbacks, and map/view replacement; never destroy caller-owned resources.
- Keep the SDK external in component-only builds. Follow [SDK integration](sdk-compatibility.md) for API-family boundaries; runtime version checks alone do not stop bundlers resolving unsupported imports.
- Keep configuration typed. Document public changes in [Configuration](configuration.md) and the [API reference](api-reference.md). README examples should explain usage.

## Camera and presentation rules

Keep camera and aircraft updates in one `FlightPresentationFrame`. Cancel pending presentation work on snap, cadence changes, and teardown. Assign a complete public `Camera` through `SceneView.camera`; do not mutate its properties separately or use `goTo()` in the flight loop.

The classic model, exhaust, camera drag, glazing, and aircraft-origin fix were ported from World Sky Tour commit `83134508352f48b385e3a49e7a8d39add390d899`. The original flight/camera parity fixtures remain unchanged.

`aircraft-render-origin.ts` is a guarded private SDK adapter for global Web Mercator scenes. On validated SDK versions 5.1.21 and 5.1.24, it keeps mesh origins close to the moving aircraft and bounds its origin cache. It touches only the component-owned layer and restores its changes on teardown. Unknown SDK versions or API shapes retain native behavior. Revalidate this adapter when updating the SDK.

Viewport roll uses the optional `scene-roll.ts` adapter. Preserve its framebuffer attachments, restore modified WebGL state, and release its resources. Verify both roll-enabled and level-camera behavior. See the official [RenderNode reference](https://developers.arcgis.com/javascript/latest/references/core/views/3d/webgl/RenderNode/) for shared-context rules.

## Elevation rules

Initialization makes an abortable ground query when terrain is enabled or altitude is omitted. Missing elevation is fatal only without an explicit altitude. Continuous flight uses the live `view.groundView.elevationSampler` and watches for replacement.

Reject non-finite and `noDataValue` samples. Never turn unknown ground into zero. Reuse a last-safe sample only within its age and distance limits; otherwise return `null`. The host owns terrain resolution, streaming, and caching.

## Debugging

Capture the first `arcgisPlaneNavigationError` and check `flight.status`. Use `flight.snapshot()` for flight state and `flight.debugSnapshot()` for layer ownership, the view lease, terrain, camera scheduling, and roll diagnostics.

For lifecycle failures, check whether the host replaced the map or view. Direct-view hosts must assign the new `flight.view` or disconnect the old element. Reproduce with the smallest demo and a public scene before adding logging or changing lifecycle code.

## Build and host the compiled files

| Command | Output |
| --- | --- |
| `npm run build:component` | `dist/component/`: SDK-family ESM files and universal AMD/ESM files with embedded aircraft assets and controls styles. |
| `npm run build:pages` | `dist/pages/`: docs, demos, component-only files under `component/`, and the full browser build under `browser/` with shared `assets/`. |

Use a matching family file with a bundler, or AMD with an existing host loader. Git package installs run `prepare` to build the component files automatically.

Serve the complete `dist/pages/` directory over HTTP or HTTPS. Keep its directory structure intact and use your host's script and stylesheet URLs in the consuming page. Copying only the browser entry file is insufficient.

### Publish to GitHub Pages

`npm run deploy:pages` builds and publishes to the `gh-pages` branch. The build commands alone do not publish. After an authorized deployment, check the hosted demos and compiled entry URLs in a consuming page before updating their availability in the usage guides.
