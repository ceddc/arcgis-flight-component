# Development guide

Clone the source to change a demo, adapt the flight behavior, or build your
own project from it. This guide shows where the code lives and how to check
your changes. To use the component in an existing app, start with
[Getting started](getting-started.md).

For a different aircraft model or flight settings, try
[Custom aircraft](custom-aircraft.md) first. [Flight concepts](flight-concepts.md)
explains how the plane, camera, and ground checks fit together.

## Local setup

Use Node.js 20 or newer, as required by [package.json](../package.json).
Clone the repository, install the dependencies, and start the local site:

```sh
git clone https://github.com/ceddc/arcgis-flight-component.git
cd arcgis-flight-component
npm ci
npm run dev
```

Open [127.0.0.1:3116](http://127.0.0.1:3116/) to browse the docs and demos
from the same menu. If you already have this checkout running, use that
server. The demos need WebGL and access to their ArcGIS services.

## Commands

| Change | Validation |
| --- | --- |
| Code | Run the relevant file with `npm run test -- <path>`, then `npm run verify` for tests, type checking, and builds. |
| Flight or camera math | Also run `npm run test:ab`; preserve the reference fixture during refactors. |
| Rendering, lifecycle, input, or demo UI | Run `npm run test:browser` and inspect the affected state in a real browser. Install Chromium once with `npx playwright install chromium`. |
| SDK or packaging | Run `npm run test:sdk` for the affected SDKs and check the matching ESM family and AMD loader. Validate aircraft motion, viewport roll, and host cleanup before updating dependency pins or the supported range. |
| Documentation | Run `npm run docs:build`; inspect the changed pages and links. |

Run `git diff --check` before handing off changes. For visual changes, spend
some time in the affected demo too: mocked tests cannot tell you whether
the scene looks right.

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
| `scripts/build-element-metadata.mjs` | Generates editor metadata for the component's HTML attributes and public API. |

## Implementation rules

- Use direct TypeScript and public SDK APIs, except for the guarded aircraft-origin adapter documented below. Keep scene selection, authentication, search, and page layout in the host application.
- Preserve the [ownership and lifecycle contract](architecture.md). Cleanup must cover cancellation, repeated connection, host callbacks, and map/view replacement; never destroy caller-owned resources.
- Keep the SDK external in component-only builds. Follow [SDK integration](sdk-compatibility.md) for API-family boundaries; runtime version checks alone do not stop bundlers resolving unsupported imports.
- Keep configuration typed. Document public changes in [Configuration](configuration.md) and the [API reference](api-reference.md). README examples should explain usage.

## Camera and presentation rules

Keep camera and aircraft updates in one `FlightPresentationFrame`. Cancel pending presentation work on snap, cadence changes, and teardown. Assign a complete public `Camera` through `SceneView.camera`; do not mutate its properties separately or use `goTo()` in the flight loop.

Preserve the presentation behavior when changing aircraft rendering: the
classic aircraft uses its authored finish, translucent windows keep their
roughness, and boost drives a pulsing exhaust effect. Mouse or one-finger drags
orbit the chase camera; pointer capture keeps the drag active until release,
and releasing or cancelling the gesture returns the camera behind the plane.
The aircraft-origin adapter is only needed for the documented large-world
precision issue and stays limited to the component-owned aircraft layer.

The touch flight stick captures one finger at a time and returns to neutral on
release, cancellation, focus loss, or a hidden page. Its position is set by the
component. A held keyboard flight key remains active if key-repeat events move
over a scene control, while new presses on controls remain available to those
controls. Standard gamepad Guide-button activity is ignored because some
virtual controllers report that system button as permanently held.

The component has two fixed flight/camera reference fixtures, each spanning
720 frames. They are regression baselines for the deterministic flight and
camera math. Preserve them through refactors; update one only for an
intentional, reviewed behavior change.

`aircraft-render-origin.ts` is a guarded private SDK adapter for global Web Mercator scenes. On validated SDK versions 5.1.21 and 5.1.24, it keeps mesh origins close to the moving aircraft and bounds its origin cache. It touches only the component-owned layer and restores its changes on teardown. Unknown SDK versions or API shapes retain native behavior. Revalidate this adapter when updating the SDK.

Viewport roll uses the optional `scene-roll.ts` adapter. Preserve its framebuffer attachments, restore modified WebGL state, and release its resources. Verify both roll-enabled and level-camera behavior. See the official [RenderNode reference](https://developers.arcgis.com/javascript/latest/references/core/views/3d/webgl/RenderNode/) for shared-context rules.

## Elevation rules

Initialization makes an abortable ground query when terrain is enabled or altitude is omitted. Missing elevation is fatal only without an explicit altitude. Continuous flight uses the live `view.groundView.elevationSampler` and watches for replacement.

Reject non-finite and `noDataValue` samples. Never turn unknown ground into zero. Reuse a last-safe sample only within its age and distance limits; otherwise return `null`. Terrain resolution, streaming, and caching stay with the application.

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

The official docs and demos use Matomo for page views and link clicks, with
cookies disabled. The tracking snippet is not part of this repository: when
`npm run deploy:pages` finds a local, git-ignored `site-analytics.local.html`,
it adds that markup to the published pages only. Local builds, previews, other
hosts, and the reusable component contain no analytics.

### Publish to GitHub Pages

`npm run deploy:pages` builds the site and publishes it to the `gh-pages`
branch. Use it when you are ready and authorized to publish; the build
commands above only create local files. After publishing, open the hosted
demos and try the compiled entry URLs in an application before listing
them as available in the guides.
