# Configuration

You can set options with HTML attributes or the typed `config` property.
Both produce the same normalized configuration. HTML attributes reject
unsupported values during initialization; some invalid programmatic UI values
instead retain the previous setting.

For examples to copy, start with [Common changes](configuration-recipes.md).
This page is the full reference for fields, defaults, and limits.
[Flight concepts](flight-concepts.md) explains what the settings feel like
when you fly.

## Typed configuration

Set `flight.config` or call `flight.updateConfig()` with a partial configuration. Settings merge with the current configuration, except `flight`, which replaces the selected profile and its tuning. Reading `flight.config` returns the full configuration with defaults applied.

```ts
interface PlaneNavigationConfigInput {
  flight?: AircraftFlightConfigInput | null;
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

These files define the plane's appearance. The body follows flight movement; the optional propeller spins and the boost appears in turbo mode. Replacing a model preserves the flight rules. Use [`setAircraft()`](api-reference.md#setaircraft) to swap models in an active session without restarting it. See [Custom aircraft](custom-aircraft.md) for model preparation.

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
| `start.speedMps` | `100`, or the selected profile's cruise speed | Clamped to the profile's minimum/turbo limits; without a profile, `48` through `333.333...`. Metres per second in local scenes; the global scene retains its Web Mercator motion convention. |

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

Click or focus the scene to use flight controls. Editable fields keep their
normal input. With `captureSceneNavigation` enabled, the component takes
over ArcGIS navigation, including touch pinch zoom. In chase view, drag
with the left mouse button or one finger to look around; release to return
behind the aircraft. Cleanup restores previous settings if your application
has not changed them in the meantime.

### Terrain

These settings control how the aircraft responds to the ground. Your Map or
WebScene still supplies the imagery and elevation, including terrain loading,
resolution, and visibility.

| Field | Default | What it does | Accepted values |
| --- | --- | --- | --- |
| `terrain.enabled` | `true` | Enables ground sampling and the clearance/ceiling checks during flight. | Boolean |
| `terrain.minimumClearanceM` | `2.8` m | Below this height above ground, lifts the aircraft and nudges its nose upward. | Clamped to 0.5 through 100 m |
| `terrain.maximumAglM` | `50000` m | Caps aircraft altitude at ground elevation plus this height. | Clamped to 100 through 200000 m |

**AGL means above ground level:** aircraft altitude minus ground elevation. Over ground at 1000 m, the default ceiling is altitude 51000 m; at aircraft altitude 1300 m, AGL is 300 m. Clearance uses the aircraft's position, not the full model's dimensions.

`enabled: false` disables these ongoing flight checks while the scene keeps rendering its terrain. An omitted start altitude still needs an initial ground query; provide `start.altitudeM` to avoid that query too.

During terrain updates, a [recent nearby ground sample](troubleshooting.md#terrain-clearance-is-temporarily-unavailable) can bridge a brief gap. Without a valid sample, ground limits are not applied. Buildings, trees, bridges, and integrated meshes are not detected as obstacles.

See [Set ground clearance](configuration-recipes.md#set-ground-clearance) for a working configuration example. Changing terrain settings through `config` or `updateConfig()` restarts the flight session. `setAircraft()` can change the clearance and ceiling in place, but `terrain.enabled` still requires a restart through `config` or `updateConfig()`.

### Optional UI

| Field | Default | Accepted values |
| --- | --- | --- |
| `ui.enabled` | `false` | Boolean |
| `ui.joystick` | `"auto"` | `"auto"` on touch devices, `"always"`, or `"never"`; independent of `ui.enabled` |
| `ui.joystickPosition` | `"bottom-left"` | Any supported ArcGIS scene slot listed below |
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

The toolbar goes in the selected `<arcgis-scene>` slot or the direct view's
`view.ui` position. Cleanup removes only the controls added by the component.

The joystick appears automatically when the browser reports a coarse pointer
(phones, tablets, and touch laptops). It works without `show-controls`.
Move it or override automatic visibility with HTML:

```html
<arcgis-plane-navigation reference-element="scene"
  joystick="always" joystick-position="bottom-right">
</arcgis-plane-navigation>
```

Use `joystick="never"` for your own controls. You can also change it live with
`flight.updateConfig({ ui: { joystick: "auto", joystickPosition: "bottom-left" } })`.
It follows the same sensitivity and pitch inversion as the gamepad. Releasing
the stick, pausing, or leaving the page clears its input. A second finger can
look around the scene while the first continues steering.

`auto` follows ArcGIS locale changes, then falls back through document and browser locales to English. Regional tags retain regional number formatting with the matching supported language.

### Session behavior

| Field | Default | Accepted values |
| --- | --- | --- |
| `powerMode` | `"normal"` | `"slow"`, `"normal"`, or `"turbo"` |
| `autoStart` | `true` | Boolean |

`powerMode` controls ongoing speed; `start.speedMps` sets initial speed only. Without a flight profile, slow brakes toward the minimum, normal approaches `100`, and turbo approaches `333.333...` (displayed as `1200` km/h). With a profile, these modes use its speed and handling rules. The paraglider ignores turbo thrust.

When `autoStart` is `false`, initialization stops in the `ready` state until `start()` is called.

### Scene distance semantics

| Measurement | Units |
| --- | --- |
| Horizontal position, speed, and distance in a supported local scene | Metres, with speed in metres per second; the view's projected linear units are converted using its finite, positive metres-per-unit scale |
| Horizontal position, speed, and distance in a global scene | Projected Web Mercator units, with speed in units per second |
| Vertical position, terrain elevation, and clearance | Metres |

Global ground distance varies with latitude. `speedMps` and the km/h display describe arcade flight, not geodesic telemetry. Derive geodesic speed or route timing from geographic positions in the host application. The last-safe terrain radius uses the same horizontal scene units.

## HTML attributes

| Attribute | HTML value type | Configuration field | Notes |
| --- | --- | --- | --- |
| `reference-element` | Element ID string | Host element reference | ID of the caller-owned `<arcgis-scene>` |
| `start-longitude` | Number | `start.longitude` | Degrees; must be paired with `start-latitude` |
| `start-latitude` | Number | `start.latitude` | Degrees; range `-90` to `90` |
| `start-altitude-m` | Number | `start.altitudeM` | Absolute metres |
| `start-heading-deg` | Number | `start.headingDeg` | Degrees clockwise from north |
| `start-speed-mps` | Number | `start.speedMps` | Metres per second in supported local scenes; projected units per second in global Web Mercator |
| `camera-mode` | `chase` \| `cockpit` | `camera.mode` | Camera view |
| `power-mode` | `slow` \| `normal` \| `turbo` | `powerMode` | Flight power |
| `sensitivity` | Number | `controls.sensitivity` | `0.5` through `2` |
| `fov-deg` | Number | `camera.fovDeg` | Degrees; `58` through `76` |
| `invert-pitch-disabled` | Boolean presence | `controls.invertPitch` | Presence sets the field to `false` |
| `camera-roll-disabled` | Boolean presence | `camera.bankedViewport` | Presence sets the field to `false` |
| `keyboard-disabled` | Boolean presence | `controls.keyboard` | Presence sets the field to `false` |
| `gamepad-disabled` | Boolean presence | `controls.gamepad` | Presence sets the field to `false` |
| `capture-scene-navigation-disabled` | Boolean presence | `controls.captureSceneNavigation` | Presence sets the field to `false` |
| `auto-start-disabled` | Boolean presence | `autoStart` | Presence sets the field to `false` |
| `show-controls` | Boolean presence | `ui.enabled` | Presence sets the field to `true` |
| `joystick` | `auto` \| `always` \| `never` | `ui.joystick` | Touch joystick visibility |
| `joystick-position` | ArcGIS scene slot | `ui.joystickPosition` | Default `bottom-left` |
| `show-speed` | Boolean presence | `ui.showSpeed` | Presence sets the field to `true` |
| `ui-position` | ArcGIS scene slot | `ui.position` | Built-in toolbar position |
| `ui-controls` | Control name list | `ui.controls` | Space- or comma-separated `power`, `pause`, `camera`, `recover` |
| `locale` | `auto` \| `en` \| `de` \| `fr` \| `it` \| `es` | `ui.locale` | Built-in controls language |

There are no HTML attributes for aircraft URLs, terrain settings, or camera submission rate. Configure those through `config` or `updateConfig()`; use `setAircraft()` for an in-place aircraft swap.

## Boolean attribute semantics

Boolean attributes depend on presence: `keyboard-disabled="false"` still disables the keyboard. Remove it with `flight.removeAttribute("keyboard-disabled")` to restore the default. True-by-default options use `-disabled`; false-by-default UI options use `show-*`.

## Live updates and session restarts

### Applied live

`camera.mode`, `camera.fovDeg`, `camera.bankedViewport`, `controls.keyboard`, `controls.gamepad`, `controls.sensitivity`, `controls.invertPitch`, all `ui` fields, and `powerMode`.

You can change the camera while paused. The view updates immediately, and
flight stays paused.

### Restart the session

With `config` or `updateConfig()`, any `assets`, `flight`, `start`, or `terrain`
field restarts the session, as do `controls.captureSceneNavigation`,
`camera.submissionHz`, and `autoStart`.

A restart cleans up the current flight and restores the scene settings it
borrowed. The component then enters `loading` and emits
`arcgisPlaneNavigationReady` when the new session is ready.

For an active session, [`setAircraft()`](api-reference.md#setaircraft) instead
applies aircraft assets and flight profiles without replacing the scene or
session. A model/profile change keeps the current position but resets attitude,
speed to the new profile's cruise speed, and power to normal. Changing only the
mesh keeps the current flight motion. It can also update
`terrain.minimumClearanceM` and `terrain.maximumAglM` in place;
`terrain.enabled` must be changed through `config` or `updateConfig()`.

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

## Aircraft profiles

`flight` defaults to `null` (existing simulation). Set `{ model: "classic" | "super-jet" | "space-jet" | "paraglider", tuning?: Partial<AircraftTuning> }`
to opt into one of the component's built-in aircraft profiles. Profile or
asset changes through `config` or `updateConfig()` restart the session;
`setAircraft()` changes them in place.
Powered profiles support ongoing speed and handling overrides; the paraglider uses
its fixed glide model. See [Custom aircraft](custom-aircraft.md#choose-speed-and-handling).

Optional asset settings: `propellerAnchorM` is a metre XYZ offset (default 0, 2.68, 0),
`visualPitchDeg` is a visual body tilt (default 0), and `preserveFinish` retains
authored material roughness (default false). These restart the session through
`config` or `updateConfig()` and apply in place through `setAircraft()`.
