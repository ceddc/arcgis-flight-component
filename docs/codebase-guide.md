# Codebase guide

Use this page to find the implementation behind a behavior, example, build
step, or public API. It indexes first-party code under `src/`, `demos/`,
`scripts/`, and `tests/`, plus root build/test configuration;
paired tests are listed with the source they protect. Generated output,
dependencies, media, and presentation-only styles are omitted. For the public
configuration and lifecycle contracts, see [Configuration](configuration.md),
[API reference](api-reference.md), and [Architecture](architecture.md). For
local commands and build output, see [Development](development.md).

## How a flight moves through the code

1. A host imports the component entry point and places
   `<arcgis-plane-navigation>` alongside its existing `SceneView` or
   `<arcgis-scene>`.
2. [`src/components/arcgis-plane-navigation.ts`](../src/components/arcgis-plane-navigation.ts) resolves the host, reads
   attributes and configuration, waits for the scene, and coordinates start,
   stop, and status events.
3. [`src/controller/flight-session.ts`](../src/controller/flight-session.ts) owns the session lifecycle. It combines
   normalized input with the deterministic simulation in `src/core/`, then
   sends each frame to the hosted scene.
4. [`src/arcgis/hosted-flight-scene.ts`](../src/arcgis/hosted-flight-scene.ts) creates and updates the component's
   aircraft layer, samples terrain, presents the aircraft and camera, and
   tears down the resources it owns. The host keeps ownership of its view, map,
   and other resources.

In short: **component and config -> session and input -> core simulation ->
ArcGIS presentation**. `src/core/` is the best starting point for flight or
camera math; `src/arcgis/` is the place for ArcGIS rendering, SDK integration,
and scene lifecycle changes.

## Source and test inventory

### `src/` entry points and configuration

| File | Purpose |
| --- | --- |
| [`src/index.ts`](../src/index.ts) | Package entry: exports the custom element, public config and types, profiles, localization, and snapshots. |
| [`src/browser.ts`](../src/browser.ts) | Standalone browser entry: loads the ArcGIS Scene component, then re-exports the package entry. |
| [`src/config.ts`](../src/config.ts) | Public configuration types, defaults, validation, normalization, and merge behavior. |
| [`src/config.test.ts`](../src/config.test.ts) | Checks documented defaults, immutable config, and normalization bounds. |

### `src/ab/` - deterministic reference comparison

| File | Purpose |
| --- | --- |
| [`src/ab/parity.ts`](../src/ab/parity.ts) | Replays fixed controls and compares simulated flight and camera frames with stored references. |
| [`src/ab/parity.test.ts`](../src/ab/parity.test.ts) | Checks both 720-frame references and rejects incompatible reference metadata. |

### `src/arcgis/` - ArcGIS scene integration and rendering

| File | Purpose |
| --- | --- |
| [`src/arcgis/aircraft-exhaust.ts`](../src/arcgis/aircraft-exhaust.ts) | Computes the classic aircraft's boost exhaust animation and anchor offset. |
| [`src/arcgis/aircraft-exhaust.test.ts`](../src/arcgis/aircraft-exhaust.test.ts) | Checks exhaust animation, reset behavior, and attachment placement. |
| [`src/arcgis/aircraft-finish.ts`](../src/arcgis/aircraft-finish.ts) | Applies the aircraft's authored shading and material finish while preserving glazing. |
| [`src/arcgis/aircraft-finish.test.ts`](../src/arcgis/aircraft-finish.test.ts) | Checks material finish rules, including translucent windows. |
| [`src/arcgis/aircraft-presenter.ts`](../src/arcgis/aircraft-presenter.ts) | Builds and updates aircraft meshes, propeller, and exhaust from render poses. |
| [`src/arcgis/aircraft-presenter.test.ts`](../src/arcgis/aircraft-presenter.test.ts) | Checks mesh visibility, orientation, scale, and attached propeller/exhaust behavior. |
| [`src/arcgis/aircraft-render-origin.ts`](../src/arcgis/aircraft-render-origin.ts) | Guarded private SDK adapter that reduces aircraft mesh precision error in supported global Web Mercator scenes. |
| [`src/arcgis/aircraft-render-origin.test.ts`](../src/arcgis/aircraft-render-origin.test.ts) | Checks adapter version/API guards, origin updates, bounds, and restoration. |
| [`src/arcgis/borrowed-state.ts`](../src/arcgis/borrowed-state.ts) | Saves and restores host camera and navigation state temporarily borrowed during flight. |
| [`src/arcgis/borrowed-state.test.ts`](../src/arcgis/borrowed-state.test.ts) | Checks borrowed-state restoration and ownership boundaries. |
| [`src/arcgis/camera-cadence.ts`](../src/arcgis/camera-cadence.ts) | Selects camera submission cadence from observed frame pacing and configured limits. |
| [`src/arcgis/camera-cadence.test.ts`](../src/arcgis/camera-cadence.test.ts) | Checks cadence selection, sampling, and recovery behavior. |
| [`src/arcgis/camera-drag-input.ts`](../src/arcgis/camera-drag-input.ts) | Binds a captured mouse or touch gesture on the scene to chase-camera orbit input. |
| [`src/arcgis/camera-drag-input.test.ts`](../src/arcgis/camera-drag-input.test.ts) | Checks gesture capture/release and that UI controls keep their own input. |
| [`src/arcgis/camera-submission.ts`](../src/arcgis/camera-submission.ts) | Schedules complete camera submissions and cancels pending updates when superseded. |
| [`src/arcgis/camera-submission.test.ts`](../src/arcgis/camera-submission.test.ts) | Checks camera scheduling, coalescing, cancellation, and cadence changes. |
| [`src/arcgis/disposer.ts`](../src/arcgis/disposer.ts) | Registers resources for ordered, idempotent teardown. |
| [`src/arcgis/disposer.test.ts`](../src/arcgis/disposer.test.ts) | Checks disposal order and cleanup despite individual disposal errors. |
| [`src/arcgis/elevation-sampling.ts`](../src/arcgis/elevation-sampling.ts) | Queries initial elevation and samples live ground, accounting for units and no-data values. |
| [`src/arcgis/elevation-sampling.test.ts`](../src/arcgis/elevation-sampling.test.ts) | Checks elevation conversion, invalid samples, and fallback behavior. |
| [`src/arcgis/flight-camera.ts`](../src/arcgis/flight-camera.ts) | Connects camera-rig math to ArcGIS camera frames and camera drag state. |
| [`src/arcgis/flight-camera.test.ts`](../src/arcgis/flight-camera.test.ts) | Checks camera transitions, chase orbit, cockpit entry, and camera framing. |
| [`src/arcgis/flight-clip-distance.ts`](../src/arcgis/flight-clip-distance.ts) | Keeps near/far clip distances suited to flight on the globe, so high altitude never clips the chase aircraft, and restores the host's settings. |
| [`src/arcgis/flight-clip-distance.test.ts`](../src/arcgis/flight-clip-distance.test.ts) | Checks near/far distances by altitude, stable far bands, and restoration of host clip settings. |
| [`src/arcgis/flight-host.ts`](../src/arcgis/flight-host.ts) | Adapts an existing `SceneView` or `<arcgis-scene>` into the common host interface. |
| [`src/arcgis/flight-scene-coordinate-system.ts`](../src/arcgis/flight-scene-coordinate-system.ts) | Determines scene coordinate units and converts flight distances and positions. |
| [`src/arcgis/flight-scene-coordinate-system.test.ts`](../src/arcgis/flight-scene-coordinate-system.test.ts) | Checks projected, geographic, and local scene coordinate handling. |
| [`src/arcgis/hosted-flight-scene.ts`](../src/arcgis/hosted-flight-scene.ts) | Initializes the ArcGIS-backed flight, updates terrain, aircraft and camera, and coordinates teardown. |
| [`src/arcgis/hosted-flight-scene.cleanup.test.ts`](../src/arcgis/hosted-flight-scene.cleanup.test.ts) | Checks resource ownership and cleanup for scene-element and direct-view hosts. |
| [`src/arcgis/initialization-resources.ts`](../src/arcgis/initialization-resources.ts) | Tracks abortable initialization work and resources created before startup completes. |
| [`src/arcgis/initialization-resources.test.ts`](../src/arcgis/initialization-resources.test.ts) | Checks cancellation and disposal during partial initialization. |
| [`src/arcgis/mesh-motion.ts`](../src/arcgis/mesh-motion.ts) | Applies render-pose rotations and translations to ArcGIS mesh transforms. |
| [`src/arcgis/navigation-action-map.ts`](../src/arcgis/navigation-action-map.ts) | Snapshots, modifies, and restores the host view's navigation action map. |
| [`src/arcgis/navigation-action-map.test.ts`](../src/arcgis/navigation-action-map.test.ts) | Checks that navigation overrides are scoped and restored. |
| [`src/arcgis/render-target-size.ts`](../src/arcgis/render-target-size.ts) | Resolves valid framebuffer dimensions with viewport fallbacks. |
| [`src/arcgis/scene-roll.ts`](../src/arcgis/scene-roll.ts) | Implements optional viewport roll through ArcGIS `RenderNode` and managed framebuffers. |
| [`src/arcgis/scene-roll-framebuffer.ts`](../src/arcgis/scene-roll-framebuffer.ts) | Preserves framebuffer depth/stencil attachments needed by the roll effect. |
| [`src/arcgis/scene-roll-framebuffer.test.ts`](../src/arcgis/scene-roll-framebuffer.test.ts) | Checks framebuffer attachment preservation and cleanup. |
| [`src/arcgis/scene-roll.integration.test.ts`](../src/arcgis/scene-roll.integration.test.ts) | Checks production wiring of the roll render node and framebuffer. |
| [`src/arcgis/sdk-compatibility.ts`](../src/arcgis/sdk-compatibility.ts) | Selects compatible public ArcGIS APIs and GLTF/projection loaders for each SDK family. |
| [`src/arcgis/sdk-compatibility.test.ts`](../src/arcgis/sdk-compatibility.test.ts) | Checks SDK-family API selection and supported public API behavior. |

### `src/components/` - custom element and built-in UI

| File | Purpose |
| --- | --- |
| [`src/components/arcgis-plane-navigation.ts`](../src/components/arcgis-plane-navigation.ts) | Defines the public custom element, observes configuration, starts/stops flight, and emits lifecycle events. |
| [`src/components/arcgis-plane-navigation.integration.test.ts`](../src/components/arcgis-plane-navigation.integration.test.ts) | Exercises custom-element behavior with ArcGIS scene and direct-view hosts. |
| [`src/components/browser-support.ts`](../src/components/browser-support.ts) | Checks browser APIs required to initialize flight. |
| [`src/components/browser-support.test.ts`](../src/components/browser-support.test.ts) | Checks browser capability errors and accepted environments. |
| [`src/components/flight-controls.ts`](../src/components/flight-controls.ts) | Renders the optional power, pause, camera, recovery, and speed controls. |
| [`src/components/flight-joystick.ts`](../src/components/flight-joystick.ts) | Renders and positions the built-in touch joystick overlay. |
| [`src/components/plane-navigation-config.ts`](../src/components/plane-navigation-config.ts) | Maps HTML attributes to config updates and decides when a change requires restart. |
| [`src/components/plane-navigation-config.test.ts`](../src/components/plane-navigation-config.test.ts) | Checks observed-attribute parsing and restart decisions. |
| [`src/components/scene-ready-transition.ts`](../src/components/scene-ready-transition.ts) | Resolves ready, loading, and failure transitions for ArcGIS scene initialization. |
| [`src/components/scene-ready-transition.test.ts`](../src/components/scene-ready-transition.test.ts) | Checks scene-ready transition and error resolution. |

### `src/controller/` - flight lifecycle and frame timing

| File | Purpose |
| --- | --- |
| [`src/controller/flight-session.ts`](../src/controller/flight-session.ts) | Coordinates input, simulation, hosted presentation, pause/recovery, status, and session cleanup. |
| [`src/controller/flight-session.test.ts`](../src/controller/flight-session.test.ts) | Checks session lifecycle, state transitions, and frame processing. |
| [`src/controller/frame-pacing.ts`](../src/controller/frame-pacing.ts) | Samples render frame times for camera cadence decisions. |
| [`src/controller/frame-pacing.test.ts`](../src/controller/frame-pacing.test.ts) | Checks frame-time sampling, invalid intervals, and sample windows. |
| [`src/controller/gamepad-pause.test.ts`](../src/controller/gamepad-pause.test.ts) | Checks gamepad pause/resume behavior while ensuring a paused session does not advance. |
| [`src/controller/index.ts`](../src/controller/index.ts) | Re-exports the controller API and public session snapshot types. |

### `src/core/` - SDK-independent flight and camera behavior

| File | Purpose |
| --- | --- |
| [`src/core/aircraft-flight.ts`](../src/core/aircraft-flight.ts) | Defines the optional aircraft flight profile configuration and tuning types. |
| [`src/core/aircraft-flight.test.ts`](../src/core/aircraft-flight.test.ts) | Checks aircraft profile configuration and tuning validation. |
| [`src/core/aircraft-profiles.ts`](../src/core/aircraft-profiles.ts) | Defines the built-in aircraft profiles and their speed/handling settings. |
| [`src/core/camera-drag.ts`](../src/core/camera-drag.ts) | Computes temporary chase-camera orbit from drag offsets. |
| [`src/core/camera-drag.test.ts`](../src/core/camera-drag.test.ts) | Checks drag offset and camera orbit geometry. |
| [`src/core/camera-rig.ts`](../src/core/camera-rig.ts) | Computes chase/cockpit camera poses, transitions, framing, and field of view. |
| [`src/core/camera-rig.test.ts`](../src/core/camera-rig.test.ts) | Checks camera transitions, framing, and mode changes. |
| [`src/core/defaults.ts`](../src/core/defaults.ts) | Holds shared flight and camera default constants. |
| [`src/core/flight.ts`](../src/core/flight.ts) | Implements the deterministic classic aircraft flight step and tuning. |
| [`src/core/flight.test.ts`](../src/core/flight.test.ts) | Checks deterministic motion, control response, and flight limits. |
| [`src/core/index.ts`](../src/core/index.ts) | Re-exports SDK-independent core behavior and types. |
| [`src/core/math.ts`](../src/core/math.ts) | Provides shared clamping, interpolation, angle, and vector math helpers. |
| [`src/core/paraglider-flight.ts`](../src/core/paraglider-flight.ts) | Implements the paraglider's glide, speed-bar, brake, and energy behavior. |
| [`src/core/pose.ts`](../src/core/pose.ts) | Converts vehicle state into render-ready aircraft pose data. |
| [`src/core/power-mode.ts`](../src/core/power-mode.ts) | Defines the slow, normal, and turbo power modes and their transitions. |
| [`src/core/power-mode.test.ts`](../src/core/power-mode.test.ts) | Checks power mode transitions and speed targets. |
| [`src/core/profile-flight.ts`](../src/core/profile-flight.ts) | Implements powered aircraft profile flight using configurable tuning. |
| [`src/core/runtime.ts`](../src/core/runtime.ts) | Runs fixed-step simulation, catch-up limits, and render-pose interpolation. |
| [`src/core/runtime.test.ts`](../src/core/runtime.test.ts) | Checks fixed-step timing, catch-up, and interpolation behavior. |
| [`src/core/space-flight.ts`](../src/core/space-flight.ts) | Adds independent vertical thrust and the Space Jet altitude ceiling. |
| [`src/core/types.ts`](../src/core/types.ts) | Defines shared vehicle, control-frame, and render-pose data types. |

### `src/i18n/` - translated component labels and messages

| File | Purpose |
| --- | --- |
| [`src/i18n/catalogs.ts`](../src/i18n/catalogs.ts) | Contains built-in translated labels and messages. |
| [`src/i18n/i18n.ts`](../src/i18n/i18n.ts) | Resolves locale preferences and formats translated UI text. |
| [`src/i18n/i18n.test.ts`](../src/i18n/i18n.test.ts) | Checks locale selection, fallback, and translated messages. |
| [`src/i18n/index.ts`](../src/i18n/index.ts) | Re-exports localization helpers and public locale types. |

### `src/input/` - keyboard, gamepad, and touch input

| File | Purpose |
| --- | --- |
| [`src/input/flight-input.ts`](../src/input/flight-input.ts) | Normalizes keyboard and gamepad readings into flight controls and session actions. |
| [`src/input/flight-input.test.ts`](../src/input/flight-input.test.ts) | Checks key ownership, gamepad selection, dead zones, Guide-button filtering, and control settings. |
| [`src/input/index.ts`](../src/input/index.ts) | Re-exports input controllers, helpers, settings, and reading types. |
| [`src/input/touch-flight-stick.ts`](../src/input/touch-flight-stick.ts) | Captures one touch pointer and maps stick movement to bank and pitch. |
| [`src/input/touch-flight-stick.test.ts`](../src/input/touch-flight-stick.test.ts) | Checks touch capture, movement, cancellation, and neutral reset. |

### `demos/` - runnable host applications

| File | Purpose |
| --- | --- |
| [`demos/simple/index.html`](../demos/simple/index.html) | Minimal Scene component and flight element markup. |
| [`demos/simple/main.ts`](../demos/simple/main.ts) | Loads the component and shared keyboard-help UI for the basic demo. |
| [`demos/simple-controls/index.html`](../demos/simple-controls/index.html) | Hosts the Geneva scene and flight controls. |
| [`demos/simple-controls/main.ts`](../demos/simple-controls/main.ts) | Loads SITG imagery, terrain, and 3D scene layers, then starts flight with shared controls. |
| [`demos/simple-controls/services.ts`](../demos/simple-controls/services.ts) | Lists the public SITG services used by Flight controls. |
| [`demos/aircraft/index.html`](../demos/aircraft/index.html) | Markup for aircraft selection, scene options, and controls. |
| [`demos/aircraft/main.ts`](../demos/aircraft/main.ts) | Runs the aircraft showcase and connects its demo controls to the component. |
| [`demos/enterprise/index.html`](../demos/enterprise/index.html) | Redirects the former Geneva sample URL to Flight controls. |
| [`demos/zurich/index.html`](../demos/zurich/index.html) | Markup for the local Swiss LV95 WebScene demo. |
| [`demos/zurich/main.ts`](../demos/zurich/main.ts) | Creates and owns the Zurich `WebScene` and `SceneView`, then attaches the component. |
| [`demos/webscene-selector/index.html`](../demos/webscene-selector/index.html) | Markup for scene selection, address search, and public WebScene loading. |
| [`demos/webscene-selector/main.ts`](../demos/webscene-selector/main.ts) | Coordinates selector UI, ArcGIS map/view setup, address search, and flight navigation. |
| [`demos/webscene-selector/lib/address-search.ts`](../demos/webscene-selector/lib/address-search.ts) | Calls the ArcGIS geocoder and validates/normalizes address results. |
| [`demos/webscene-selector/lib/address-search.test.ts`](../demos/webscene-selector/lib/address-search.test.ts) | Checks address query parameters, cancellation, and result normalization. |
| [`demos/webscene-selector/lib/public-webscene-loader.ts`](../demos/webscene-selector/lib/public-webscene-loader.ts) | Loads a public WebScene with validation, timeout, cancellation, and cleanup. |
| [`demos/webscene-selector/lib/public-webscene-loader.test.ts`](../demos/webscene-selector/lib/public-webscene-loader.test.ts) | Checks loading, timeout, failure cleanup, and cancellation. |
| [`demos/webscene-selector/lib/scene-activation-controller.ts`](../demos/webscene-selector/lib/scene-activation-controller.ts) | Replaces the active map, starts navigation, and restores a fallback scene after failure. |
| [`demos/webscene-selector/lib/scene-activation-controller.test.ts`](../demos/webscene-selector/lib/scene-activation-controller.test.ts) | Checks scene replacement, failure recovery, and resource ownership. |
| [`demos/webscene-selector/lib/scene-resources.ts`](../demos/webscene-selector/lib/scene-resources.ts) | Cancels and destroys demo-owned ArcGIS resources safely. |
| [`demos/webscene-selector/lib/scene-resources.test.ts`](../demos/webscene-selector/lib/scene-resources.test.ts) | Checks resource cancellation, destruction, and idempotence. |
| [`demos/webscene-selector/lib/scenes.ts`](../demos/webscene-selector/lib/scenes.ts) | Defines the built-in scene presets and their flight start positions. |
| [`demos/webscene-selector/lib/scenes.test.ts`](../demos/webscene-selector/lib/scenes.test.ts) | Checks preset scene metadata and start configuration. |
| [`demos/webscene-selector/lib/webscene-validation.ts`](../demos/webscene-selector/lib/webscene-validation.ts) | Validates public Portal item access and supported WebScene properties. |
| [`demos/webscene-selector/lib/webscene-validation.test.ts`](../demos/webscene-selector/lib/webscene-validation.test.ts) | Checks accepted and rejected Portal items and WebScenes. |
| [`demos/landing.ts`](../demos/landing.ts) | Boots the main demo gallery and its shared visual theme. |
| [`demos/shared/demo-ui.ts`](../demos/shared/demo-ui.ts) | Builds the shared keyboard and touch control help dialog. |
| [`demos/shared/flight-controls.ts`](../demos/shared/flight-controls.ts) | Builds host-owned toolbar controls and binds them to public component methods/events. |

### `tests/` - real-browser and SDK integration harnesses

| File | Purpose |
| --- | --- |
| [`tests/browser/aircraft.spec.ts`](../tests/browser/aircraft.spec.ts) | Exercises aircraft selection and presentation in a real browser. |
| [`tests/browser/enterprise.spec.ts`](../tests/browser/enterprise.spec.ts) | Checks the merged Geneva layers and flight controls. |
| [`tests/browser/fixtures/local-terrain.ts`](../tests/browser/fixtures/local-terrain.ts) | Provides local terrain fixture setup for browser tests. |
| [`tests/browser/simple-demo.spec.ts`](../tests/browser/simple-demo.spec.ts) | Checks basic demo startup, controls, and flight behavior in a browser. |
| [`tests/browser/world-sync.spec.ts`](../tests/browser/world-sync.spec.ts) | Checks flight and camera synchronization across view modes and UI actions. |
| [`tests/browser/zurich.spec.ts`](../tests/browser/zurich.spec.ts) | Exercises the Zurich local-scene integration in a browser. |
| [`tests/sdk/fixture.html`](../tests/sdk/fixture.html) | Minimal host page for loading the component against a selected ArcGIS SDK. |
| [`tests/sdk/fixture.mjs`](../tests/sdk/fixture.mjs) | Browser-side SDK fixture harness and interaction checks. |
| [`tests/sdk/functional.html`](../tests/sdk/functional.html) | Host page for public functional checks against SDK families. |
| [`tests/sdk/functional.mjs`](../tests/sdk/functional.mjs) | Functional SDK compatibility checks for scene setup, flight, and cleanup. |

### `scripts/` - site, bundle, reference, and release tooling

| File | Purpose |
| --- | --- |
| [`scripts/assemble-pages.mjs`](../scripts/assemble-pages.mjs) | Combines compiled demos, component bundles, and documentation into the publishable site tree. |
| [`scripts/benchmark-sdk.mjs`](../scripts/benchmark-sdk.mjs) | Measures SDK/component loading and runtime behavior for SDK comparisons. |
| [`scripts/build-component-distributions.mjs`](../scripts/build-component-distributions.mjs) | Builds component-only ESM/AMD distributions and SDK-specific ESM variants. |
| [`scripts/build-docs-site.mjs`](../scripts/build-docs-site.mjs) | Renders Markdown pages, builds navigation/search, resolves source links, and writes the docs site. |
| [`scripts/build-element-metadata.mjs`](../scripts/build-element-metadata.mjs) | Generates custom-element and HTML editor metadata from the public attributes and methods. |
| [`scripts/generate-world-skytour-reference.mjs`](../scripts/generate-world-skytour-reference.mjs) | Regenerates flight/camera reference JSON from a local reference checkout. |
| [`scripts/publish-pages.mjs`](../scripts/publish-pages.mjs) | Publishes the assembled Pages output to `gh-pages`, adding the optional local `site-analytics.local.html` head snippet to published pages only. |
| [`scripts/site-navigation.mjs`](../scripts/site-navigation.mjs) | Produces shared navigation links for the docs and demo pages. |
| [`scripts/test-sdk-compatibility.mjs`](../scripts/test-sdk-compatibility.mjs) | Builds and exercises the SDK compatibility matrix using local fixture pages. |

### Root and documentation-site code/configuration

| File | Purpose |
| --- | --- |
| [`index.html`](../index.html) | Root gallery page and links to runnable demos. |
| [`package.json`](../package.json) | Dependency and package metadata, public exports, and build/test commands. |
| [`playwright.config.ts`](../playwright.config.ts) | Browser test directory, browser settings, and local dev-server setup. |
| [`tsconfig.json`](../tsconfig.json) | TypeScript settings for application, tests, and development source. |
| [`tsconfig.lib.json`](../tsconfig.lib.json) | TypeScript settings for distributable component declarations and library build. |
| [`vite.config.ts`](../vite.config.ts) | Demo-site routes, ArcGIS bundling, browser entry, and development server configuration. |
| [`vite.docs.config.ts`](../vite.docs.config.ts) | Preview configuration for the generated docs site. |
| [`vite.lib.config.ts`](../vite.lib.config.ts) | Library build entry and SDK-family tree-shaking configuration. |
| [`vitest.config.ts`](../vitest.config.ts) | Unit test environment, discovery, and coverage settings. |
| [`docs/site/site.js`](../docs/site/site.js) | Implements docs navigation, search, copy-code actions, and keyboard handling. |
| [`docs/site/entry.ts`](../docs/site/entry.ts) | Bundles the documentation UI entry and presentation assets. |

## Non-code files that support the implementation

- `public/models/fleet/*.glb` are aircraft, propeller, and boost meshes loaded
  by the demo or by applications that supply their own asset URLs. The flight
  package does not include these public demo models. The adjacent PNG files are
  previews; [`public/models/fleet/SOURCE.md`](../public/models/fleet/SOURCE.md) explains asset provenance and use.
- `src/ab/*.reference.json` are fixed 720-frame flight and camera records used
  by the reference comparison. Their metadata records the SDK, viewport,
  settings, and control segments. They are test inputs, not runtime defaults.

## Common changes: where to start

| Change | Start here |
| --- | --- |
| Add or alter public config, defaults, attributes, or restart behavior | [`src/config.ts`](../src/config.ts), [`src/components/plane-navigation-config.ts`](../src/components/plane-navigation-config.ts), and [`src/components/arcgis-plane-navigation.ts`](../src/components/arcgis-plane-navigation.ts); update [Configuration](configuration.md) and the [API reference](api-reference.md) for public changes. |
| Tune powered aircraft or add a built-in profile | [`src/core/aircraft-profiles.ts`](../src/core/aircraft-profiles.ts), [`src/core/profile-flight.ts`](../src/core/profile-flight.ts), and [`src/core/aircraft-flight.ts`](../src/core/aircraft-flight.ts); see [Custom aircraft](custom-aircraft.md). |
| Change classic flight physics | [`src/core/flight.ts`](../src/core/flight.ts), then check [`src/core/runtime.ts`](../src/core/runtime.ts) and `src/ab/` for frame and camera effects. |
| Change paraglider or Space Jet behavior | [`src/core/paraglider-flight.ts`](../src/core/paraglider-flight.ts) or [`src/core/space-flight.ts`](../src/core/space-flight.ts), with shared profile settings in [`src/core/aircraft-profiles.ts`](../src/core/aircraft-profiles.ts). |
| Change chase/cockpit camera motion or drag | [`src/core/camera-rig.ts`](../src/core/camera-rig.ts), [`src/core/camera-drag.ts`](../src/core/camera-drag.ts), and [`src/arcgis/flight-camera.ts`](../src/arcgis/flight-camera.ts); for pointer capture use [`src/arcgis/camera-drag-input.ts`](../src/arcgis/camera-drag-input.ts). |
| Add keyboard, gamepad, or joystick behavior | [`src/input/flight-input.ts`](../src/input/flight-input.ts) or [`src/input/touch-flight-stick.ts`](../src/input/touch-flight-stick.ts); connect visible UI through [`src/components/flight-controls.ts`](../src/components/flight-controls.ts) or [`src/components/flight-joystick.ts`](../src/components/flight-joystick.ts). |
| Change a demo or its host-owned controls | Start in that demo's `main.ts`; shared UI and toolbar logic live in `demos/shared/`. |
| Change WebScene search, validation, loading, or fallback behavior | Start in the matching `demos/webscene-selector/lib/` module and its paired test. |
| Change browser acceptance coverage or SDK compatibility checks | Use `tests/browser/` or `tests/sdk/`; see [`playwright.config.ts`](../playwright.config.ts) and [`scripts/test-sdk-compatibility.mjs`](../scripts/test-sdk-compatibility.mjs). |
| Change package outputs, docs rendering, or published page assembly | Start in `scripts/` and the matching `vite*.config.ts`; see [Development](development.md). |
| Change aircraft model rendering, materials, or boost effects | [`src/arcgis/aircraft-presenter.ts`](../src/arcgis/aircraft-presenter.ts), [`src/arcgis/aircraft-finish.ts`](../src/arcgis/aircraft-finish.ts), or [`src/arcgis/aircraft-exhaust.ts`](../src/arcgis/aircraft-exhaust.ts); model files are under `public/models/fleet/`. |
| Change terrain, host integration, initialization, or cleanup | [`src/arcgis/hosted-flight-scene.ts`](../src/arcgis/hosted-flight-scene.ts), then follow its helpers for elevation, host adaptation, borrowed state, and resource disposal. See [Architecture](architecture.md). |
| Change ArcGIS SDK support or generated package variants | [`src/arcgis/sdk-compatibility.ts`](../src/arcgis/sdk-compatibility.ts), [`scripts/build-component-distributions.mjs`](../scripts/build-component-distributions.mjs), and [SDK integration](sdk-compatibility.md). |
| Change labels or add a locale | [`src/i18n/catalogs.ts`](../src/i18n/catalogs.ts) and [`src/i18n/i18n.ts`](../src/i18n/i18n.ts). |
| Change optional viewport roll | [`src/arcgis/scene-roll.ts`](../src/arcgis/scene-roll.ts) and its framebuffer helper; see the rendering constraints in [Development](development.md). |

For project setup and the check commands used by contributors, continue to
the [Development guide](development.md).
