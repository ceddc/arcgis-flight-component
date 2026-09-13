# Configuration

`<arcgis-plane-navigation>` supports declarative HTML attributes and a typed `config` property. Both paths are normalized through the same configuration rules.

Read [Flight concepts](flight-concepts.md) for the plane, camera, and ground behavior. Start with [Configuration recipes](configuration-recipes.md) for copyable aircraft-only, camera, controls, terrain, UI, and runtime-update examples. Use this page as the exhaustive field reference.

## Typed configuration

Set `flight.config` or call `flight.updateConfig()` with a partial configuration. Both merge fields; reading `flight.config` returns the complete normalized result.

```ts
interface PlaneNavigationConfigInput {
  assets?: Partial<AircraftAssetConfig>;
  start?: PlaneNavigationStartConfig;
  camera?: Partial<PlaneNavigationCameraConfig>;
  controls?: Partial<PlaneNavigationControlsConfig>;
  terrain?: Partial<PlaneNavigationTerrainConfig>;
  ui?: Partial<PlaneNavigationUiConfig>;
  powerMode?: FlightPowerMode;
  autoStart?: boolean;
}
```

## Defaults and accepted values

### Aircraft assets

These files define the plane's appearance. The body follows flight movement; the optional propeller spins and the boost appears in turbo mode. Replacing a model preserves the flight rules. See [Custom aircraft](custom-aircraft.md) for model preparation and source changes.

| Field | Default | Rules |
| --- | --- | --- |
| `assets.bodyUrl` | Bundled `classic.glb` | Required non-empty URL |
| `assets.propellerUrl` | Bundled propeller GLB | URL or `null` |
| `assets.boostUrl` | Bundled boost GLB | URL or `null` |

The production library embeds the three default GLBs as data URLs. External URLs must be browser-accessible and need CORS permission when loaded from another origin.

### Start pose

The start pose is the aircraft's initial location, altitude, direction, and speed. `altitudeM` uses the scene's absolute vertical reference, while AGL measures height above the ground underneath. Heading 0 faces north and 90 faces east.

| Field | Default | Rules |
| --- | --- | --- |
| `start.longitude` | Loaded view center | Must be supplied with latitude |
| `start.latitude` | Loaded view center | Must be supplied with longitude, range `-90` to `90` |
| `start.altitudeM` | Sampled ground plus 300 m | Finite absolute altitude in metres |
| `start.headingDeg` | Host camera heading | Finite heading in degrees |
| `start.speedMps` | `100` | Clamped to `48` through `333.333...` horizontal scene units per second; local metric scenes use metres |

Omitted altitude requires valid ground elevation and starts 300 m above it. Explicit altitude is used if elevation is unavailable; when terrain is disabled, it skips the initial query. A valid ground sample raises the starting altitude if needed to clear `minimumClearanceM` plus 1 m.

### Camera

Chase follows behind the plane; cockpit moves the viewpoint near its origin and hides the model. `fovDeg` sets the base viewing angle. `bankedViewport` tilts the horizon during turns, while `submissionHz` limits camera writes rather than flight simulation.

| Field | Default | Accepted values |
| --- | --- | --- |
| `camera.mode` | `"chase"` | `"chase"` or `"cockpit"` |
| `camera.fovDeg` | `65` | Clamped to `58` through `76` degrees |
| `camera.bankedViewport` | `true` | Boolean |
| `camera.submissionHz` | `60` | Clamped to `30` through `60` Hz |

`submissionHz` is an upper bound. Camera updates can temporarily drop to 30 Hz under rendering pressure.

`bankedViewport` enables experimental viewport roll through ArcGIS `RenderNode`. Disabled or unavailable roll leaves the viewport level and flight continues.

### Controls

Keyboard and gamepad settings enable those input sources. Sensitivity changes keyboard response and gamepad pitch/bank strength. With inverted pitch enabled, W/Up lowers the nose and S/Down raises it.

| Field | Default | Accepted values |
| --- | --- | --- |
| `controls.keyboard` | `true` | Boolean |
| `controls.gamepad` | `true` | Boolean |
| `controls.sensitivity` | `0.8` | Clamped to `0.5` through `2` |
| `controls.invertPitch` | `true` | Boolean |
| `controls.captureSceneNavigation` | `true` | Boolean |

Input requires scene focus or interaction and excludes editable controls. `captureSceneNavigation` suppresses competing ArcGIS navigation, including touch pinch zoom. It also enables temporary left-button or one-finger camera orbit in chase view; release to return behind the aircraft. Teardown restores borrowed settings that still match the component's applied values.

### Terrain

These settings control the aircraft's response to the host scene's ground elevation. They do not load terrain, change its resolution, or hide it. The host supplies imagery and elevation through its Map or WebScene.

| Field | Default | What it does | Accepted values |
| --- | --- | --- | --- |
| `terrain.enabled` | `true` | Enables ground sampling and the clearance/ceiling checks during flight. | Boolean |
| `terrain.minimumClearanceM` | `2.8` m | Below this height above ground, lifts the aircraft and nudges its nose upward. | Clamped to 0.5 through 100 m |
| `terrain.maximumAglM` | `50000` m | Caps aircraft altitude at ground elevation plus this height. | Clamped to 100 through 200000 m |

**AGL means above ground level:** aircraft altitude minus ground elevation. Over ground at 1000 m, the default ceiling is altitude 51000 m; at aircraft altitude 1300 m, AGL is 300 m. Clearance uses the aircraft's position, not the full model's dimensions.

`enabled: false` disables these ongoing flight checks while the scene keeps rendering its terrain. An omitted start altitude still needs an initial ground query; provide `start.altitudeM` to avoid that query too.

During terrain updates, a [recent nearby ground sample](troubleshooting.md#terrain-clearance-is-temporarily-unavailable) can bridge a brief gap. Without a valid sample, ground limits are not applied. Buildings, trees, bridges, and integrated meshes are not detected as obstacles.

See [Set ground clearance](configuration-recipes.md#set-ground-clearance) for a working configuration example. Changing terrain settings restarts the flight session.

### Optional UI

| Field | Default | Accepted values |
| --- | --- | --- |
| `ui.enabled` | `false` | Boolean |
| `ui.position` | `"bottom-end"` | Any supported ArcGIS scene slot listed below |
| `ui.controls` | All four controls | Any unique subset of `power`, `pause`, `camera`, `recover` |
| `ui.showSpeed` | `false` | Boolean |
| `ui.locale` | `"auto"` | `auto`, `en`, `de`, `fr`, `it`, or `es` |

Supported positions are:

```text
top-left      top-right
bottom-left   bottom-right
top-start     top-end
bottom-start  bottom-end
```

Controls use the selected `<arcgis-scene>` slot or the direct view's `view.ui` position. Teardown removes only component-owned controls.

`auto` follows ArcGIS locale changes, then falls back through document and browser locales to English. Regional tags retain regional number formatting with the matching supported language.

### Session behavior

| Field | Default | Accepted values |
| --- | --- | --- |
| `powerMode` | `"normal"` | `"slow"`, `"normal"`, or `"turbo"` |
| `autoStart` | `true` | Boolean |

`powerMode` controls ongoing speed; `start.speedMps` sets initial speed only. Slow brakes toward the minimum, normal approaches `100`, and turbo approaches `333.333...` scene units per second (displayed as `1200` km/h).

When `autoStart` is `false`, initialization stops in the `ready` state until `start()` is called.

### Scene distance semantics

| Measurement | Units |
| --- | --- |
| Horizontal position, speed, and distance in a supported local scene | Metres, with speed in metres per second |
| Horizontal position, speed, and distance in a global scene | Projected Web Mercator units, with speed in units per second |
| Vertical position, terrain elevation, and clearance | Metres |

Global ground distance varies with latitude. `speedMps` and the km/h display describe arcade flight, not geodesic telemetry. Derive geodesic speed or route timing from geographic positions in the host application. The last-safe terrain radius uses the same horizontal scene units.

## HTML attributes

| Attribute | Configuration field | Notes |
| --- | --- | --- |
| `reference-element` | Host element reference | ID of the caller-owned `<arcgis-scene>` |
| `start-longitude` | `start.longitude` | Must be paired with `start-latitude` |
| `start-latitude` | `start.latitude` | Range `-90` to `90` |
| `start-altitude-m` | `start.altitudeM` | Absolute metres |
| `start-heading-deg` | `start.headingDeg` | Degrees |
| `start-speed-mps` | `start.speedMps` | Horizontal scene units per second; metres in supported local scenes |
| `camera-mode` | `camera.mode` | `chase` or `cockpit` |
| `power-mode` | `powerMode` | `slow`, `normal`, or `turbo` |
| `sensitivity` | `controls.sensitivity` | `0.5` through `2` |
| `fov-deg` | `camera.fovDeg` | `58` through `76` |
| `invert-pitch-disabled` | `controls.invertPitch` | Presence sets the field to `false` |
| `camera-roll-disabled` | `camera.bankedViewport` | Presence sets the field to `false` |
| `keyboard-disabled` | `controls.keyboard` | Presence sets the field to `false` |
| `gamepad-disabled` | `controls.gamepad` | Presence sets the field to `false` |
| `capture-scene-navigation-disabled` | `controls.captureSceneNavigation` | Presence sets the field to `false` |
| `auto-start-disabled` | `autoStart` | Presence sets the field to `false` |
| `show-controls` | `ui.enabled` | Presence sets the field to `true` |
| `show-speed` | `ui.showSpeed` | Presence sets the field to `true` |
| `ui-position` | `ui.position` | Standard ArcGIS scene slot |
| `ui-controls` | `ui.controls` | Space- or comma-separated control names |
| `locale` | `ui.locale` | `auto`, `en`, `de`, `fr`, `it`, or `es` |

There are no HTML attributes for aircraft URLs, terrain settings, or camera submission rate. Configure those through `config` or `updateConfig()`.

## Boolean attribute semantics

Boolean attributes depend on presence: `keyboard-disabled="false"` still disables the keyboard. Remove it with `flight.removeAttribute("keyboard-disabled")` to restore the default. True-by-default options use `-disabled`; false-by-default UI options use `show-*`.

## Live updates and session restarts

### Applied live

`camera.mode`, `camera.fovDeg`, `camera.bankedViewport`, `controls.keyboard`, `controls.gamepad`, `controls.sensitivity`, `controls.invertPitch`, all `ui` fields, and `powerMode`.

Camera changes present immediately while paused without resuming flight.

### Restart the session

Any `assets`, `start`, or `terrain` field; `controls.captureSceneNavigation`; `camera.submissionHz`; and `autoStart`.

Restart cleans up component-owned resources and restores borrowed host state, then enters `loading` and emits a new `arcgisPlaneNavigationReady` after initialization.

The latest field change wins. Attributes update only their mapped fields; removing an attribute restores that field's default. Configuration is retained while awaiting a host. See [host properties](api-reference.md#properties) for reference precedence and binding errors.

## Normalization and errors

- `start.speedMps` clamps to its range, including `0`. Non-finite programmatic start values are treated as omitted.
- For FOV, submission rate, sensitivity, and terrain distances, `0` falls back to the default before clamping. Other finite out-of-range values clamp.
- Non-finite numeric HTML attributes fail initialization; blank numeric attributes act as omitted values.
- Longitude and latitude must be supplied together; latitude outside `-90` to `90` and a blank body URL throw errors.
- Invalid HTML modes, UI positions, control names, or locales set `status` to `error` and emit `arcgisPlaneNavigationError`. Correct or remove the attribute to retry.
- Invalid camera or power modes passed to the element's configuration or mode methods throw `TypeError` before state changes.
- Programmatic UI configuration removes unknown controls and duplicates. Invalid programmatic UI positions or locales retain the previous value; declarative values are validated strictly.

Initialization failures emit `arcgisPlaneNavigationError` with an `Error` object. Awaited `start()` rejects with the initialization error.
