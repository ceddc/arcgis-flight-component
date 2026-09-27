# Development

How to run the project, find your way in the code, and check your changes.
To use the component in an app, see [Get started](getting-started.md) instead.

## Set up

```bash
git clone https://github.com/ceddc/arcgis-flight-component.git
cd arcgis-flight-component
npm ci
npm run dev
```

Open <http://127.0.0.1:3116/>. The site serves the docs and the samples, which
load the component straight from `src/`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Build the docs and start the local site. |
| `npm test` | Run the unit tests. Add a path to run one file: `npm test -- src/core/flight.test.ts`. |
| `npm run test:ab` | Compare flight and camera math with the reference recordings. |
| `npm run test:browser` | Run the samples in a real browser with Playwright. Run `npx playwright install chromium` once first. |
| `npm run test:sdk` | Test the builds against each supported SDK version. |
| `npm run typecheck` | Check the TypeScript types. |
| `npm run docs:build` | Build the docs into `dist/docs-site/`. |
| `npm run verify` | Tests, type check, and all builds. Run it before a pull request. |

For visual changes, also fly in the affected sample. Tests cannot tell you if
the scene looks right.

## Code map

| Folder | Contents |
| --- | --- |
| `src/components/` | The `<arcgis-plane-navigation>` element, its attributes, and the built-in toolbar and joystick. |
| `src/controller/` | The flight session: input, simulation, pause, recover, and snapshots. |
| `src/core/` | Flight and camera math. No ArcGIS or DOM code, so it is easy to test. |
| `src/arcgis/` | Everything that talks to ArcGIS: aircraft graphics, camera, terrain, and cleanup. |
| `src/input/` | Keyboard, gamepad, and touch input. |
| `src/i18n/` | Toolbar translations. |
| `src/config.ts` | Configuration types, defaults, and validation. |
| `src/index.ts` | The package entry point. `src/browser.ts` adds the SDK for the standalone build. |
| `demos/` | The samples. Shared UI is in `demos/shared/`. |
| `docs/` | These pages. `docs/site/` holds the site's CSS and JavaScript. |
| `scripts/` | Build scripts for the component, the docs site, and GitHub Pages. |
| `tests/` | Browser and SDK tests. Unit tests sit next to the code as `*.test.ts`. |

Each frame flows through the layers in one direction:

```text
input (keyboard, gamepad, touch, setControlPatch)
  -> fixed-step physics at 60 Hz (src/core)
  -> smoothed aircraft pose and camera
  -> one presentation frame (src/arcgis)
  -> aircraft graphics + SceneView.camera + optional horizon roll
```

### Where to start

| To change | Start in |
| --- | --- |
| A configuration option or attribute | `src/config.ts`, `src/components/plane-navigation-config.ts`, then update the [API reference](api-reference.md) |
| How a built-in aircraft flies | `src/core/aircraft-profiles.ts` and `src/core/profile-flight.ts` |
| The default plane's physics | `src/core/flight.ts` |
| The Paraglider or Space Jet | `src/core/paraglider-flight.ts` or `src/core/space-flight.ts` |
| Chase or cockpit camera | `src/core/camera-rig.ts` and `src/arcgis/flight-camera.ts` |
| Keyboard, gamepad, or touch | `src/input/flight-input.ts` or `src/input/touch-flight-stick.ts` |
| Aircraft rendering, propeller, exhaust | `src/arcgis/aircraft-presenter.ts` |
| Terrain, start-up, or cleanup | `src/arcgis/hosted-flight-scene.ts` |
| SDK version support | `src/arcgis/sdk-compatibility.ts` and `scripts/build-component-distributions.mjs` |
| Toolbar text or a new language | `src/i18n/catalogs.ts` |
| A sample | Its `demos/<name>/main.ts` |

## Rules to keep

**Cleanup.** The app owns the view, map, and layers; the component never
destroys them. Everything the component adds must be removed on stop,
disconnect, restart, or a failed start, including when it happens halfway
through loading. The saved camera and navigation settings are restored only if
the app has not changed them in the meantime.

**Camera.** Update the aircraft and the camera in the same presentation frame.
Assign a complete `Camera` to `view.camera`; do not change its properties one
by one or call `goTo()` during the flight.

**Terrain.** Never treat missing elevation as zero. Reject `NaN` and no-data
samples, and reuse an old sample only while it is recent and nearby.

**SDK.** Use public SDK APIs and keep the SDK external in the component builds.
The one exception is `src/arcgis/aircraft-render-origin.ts`, a guarded fix for
mesh precision in global scenes. It only runs on SDK versions it was checked
against (5.1.21 and 5.1.24). Check it again when you update the SDK.

**Reference recordings.** `src/ab/*.reference.json` hold two 720-frame
recordings of flight and camera output. `npm run test:ab` compares against
them. Update them only for an intended, reviewed change in flight behavior.

## Debugging

1. Log the first `arcgisPlaneNavigationError` and check `flight.status`.
2. Use `flight.snapshot()` for the flight state, and `flight.debugSnapshot()` for
   layers, camera timing, terrain sampling, and horizon roll.
3. If the problem appears after the app replaced its map or view, check that the
   app assigned the new `flight.view` or removed the old element.
4. Reproduce it in the smallest sample with a public scene before changing
   lifecycle code.

## Build and publish

| Command | Output |
| --- | --- |
| `npm run build:component` | `dist/component/`: one ES module per SDK range, plus an AMD file. The aircraft models and styles are embedded. |
| `npm run build:pages` | `dist/pages/`: the docs, the samples, and the standalone browser build. |
| `npm run deploy:pages` | Builds and publishes `dist/pages/` to the `gh-pages` branch. |

Installing the package from GitHub runs `build:component` automatically.

The published site counts page views with Matomo, without cookies. The
tracking code is not in the repository: `deploy:pages` adds it only when a
local, git-ignored `site-analytics.local.html` file exists. Local builds and
the component itself contain no analytics.
