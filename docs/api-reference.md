# API reference

```js
import "@ceddc/arcgis-flight-component";
```

The `<arcgis-plane-navigation>` element adds a plane you can fly to a 3D scene.
Connect it to an `<arcgis-scene>` with the `reference-element` attribute, or
to a `SceneView` with the `view` property.

```html
<arcgis-scene id="scene" basemap="satellite" ground="world-elevation"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene" show-controls></arcgis-plane-navigation>
```

```js
const flight = document.querySelector("arcgis-plane-navigation");
flight.addEventListener("arcgisPlaneNavigationReady", () => {
  console.log("Ready to fly");
});
```

The element and its events are typed for TypeScript: `document.querySelector("arcgis-plane-navigation")`
returns an `ArcgisPlaneNavigationElement`.

## Properties

| Property | Attribute | Type | Default |
| --- | --- | --- | --- |
| [`config`](#config) | | `PlaneNavigationConfig` | See [Configuration](#configuration) |
| [`referenceElement`](#referenceelement) | `reference-element` | `FlightSceneElement \| null` | `null` |
| [`status`](#status) | `status` | `PlaneNavigationStatus` | `"idle"` |
| [`view`](#view) | | `SceneView \| null` | `null` |

### config

All flight settings. Assign an object with only the fields you want to change;
the other fields keep their current values. Reading `config` returns the full
configuration, with defaults filled in.

```js
flight.config = { camera: { mode: "cockpit" }, powerMode: "slow" };
flight.config.camera.fovDeg; // 65
```

Assigning `config` is the same as calling [`updateConfig()`](#methods). See
[Configuration](#configuration) for every field.

### referenceElement

The `<arcgis-scene>` to fly in. In HTML, set `reference-element` to the
scene's `id`. Changing it restarts the flight.

### status

Read-only. The state of the flight, also reflected to the `status` attribute.

| Value | Meaning |
| --- | --- |
| `idle` | No scene connected yet, or the flight was stopped |
| `loading` | Waiting for the scene, or loading the aircraft |
| `ready` | Loaded and waiting for `start()`, because `autoStart` is `false` |
| `running` | Flying |
| `paused` | Paused with `pause()`, Esc, or the gamepad Menu button |
| `error` | Could not start; see the [`arcgisPlaneNavigationError`](#events) event |

### view

A `SceneView` to fly in. It takes precedence over `referenceElement`; set it
back to `null` to use `referenceElement` again. Changing it restarts the
flight. The view must have a visible container. The component never creates or
destroys the view.

## Attributes

These attributes are shortcuts for the most common [`config`](#configuration)
fields. Boolean attributes are on when present, whatever their value:
`keyboard-disabled="false"` still disables the keyboard.

| Attribute | Config field | Values |
| --- | --- | --- |
| `start-longitude` | `start.longitude` | Degrees |
| `start-latitude` | `start.latitude` | Degrees |
| `start-altitude-m` | `start.altitudeM` | Metres |
| `start-heading-deg` | `start.headingDeg` | Degrees |
| `start-speed-mps` | `start.speedMps` | Metres per second |
| `camera-mode` | `camera.mode` | `chase`, `cockpit` |
| `fov-deg` | `camera.fovDeg` | `58` to `76` |
| `camera-roll-disabled` | `camera.bankedViewport: false` | Boolean |
| `sensitivity` | `controls.sensitivity` | `0.5` to `2` |
| `invert-pitch-disabled` | `controls.invertPitch: false` | Boolean |
| `keyboard-disabled` | `controls.keyboard: false` | Boolean |
| `gamepad-disabled` | `controls.gamepad: false` | Boolean |
| `capture-scene-navigation-disabled` | `controls.captureSceneNavigation: false` | Boolean |
| `power-mode` | `powerMode` | `slow`, `normal`, `turbo` |
| `auto-start-disabled` | `autoStart: false` | Boolean |
| `show-controls` | `ui.enabled: true` | Boolean |
| `show-speed` | `ui.showSpeed: true` | Boolean |
| `ui-position` | `ui.position` | A [position](#ui) |
| `ui-controls` | `ui.controls` | `power`, `pause`, `camera`, `recover`, separated by spaces or commas |
| `joystick` | `ui.joystick` | `auto`, `always`, `never` |
| `joystick-position` | `ui.joystickPosition` | A [position](#ui) |
| `locale` | `ui.locale` | `auto`, `en`, `de`, `fr`, `it`, `es`, `pt` |

Removing an attribute restores the default. An invalid value sets `status` to
`error`. The aircraft, the terrain settings, and the camera update rate have no
attributes; set them through `config`.

## Configuration

The `config` object has these groups. Every field is optional.

```js
flight.config = {
  start: { longitude: 7.71, latitude: 46.01, altitudeM: 5200, headingDeg: 235 },
  camera: { mode: "chase", fovDeg: 65 },
  controls: { sensitivity: 0.8 },
  terrain: { minimumClearanceM: 2.8 },
  ui: { enabled: true, showSpeed: true },
  flight: { model: "classic" },
  assets: { bodyUrl: "/models/my-plane.glb" },
  powerMode: "normal",
  autoStart: true,
};
```

### start

Where and how the plane starts. Read again at each start and restart.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `longitude` | `number` | Center of the view | WGS84 degrees. Set together with `latitude`. |
| `latitude` | `number` | Center of the view | WGS84 degrees, `-90` to `90`. |
| `altitudeM` | `number` | 300 m above the ground | Absolute altitude in metres. |
| `headingDeg` | `number` | Camera heading | Degrees clockwise from north. |
| `speedMps` | `number` | Cruise speed (`100`) | Starting speed in metres per second, limited to the aircraft's speed range. |

### camera

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `"chase" \| "cockpit"` | `"chase"` | Behind the plane, or from the plane. |
| `fovDeg` | `number` | `65` | Field of view in degrees, `58` to `76`. |
| `bankedViewport` | `boolean` | `true` | Tilt the horizon in turns. |
| `submissionHz` | `number` | `60` | Maximum camera updates per second, `30` to `60`. Slow rendering does not lower it. |

### controls

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `keyboard` | `boolean` | `true` | Keyboard input. |
| `gamepad` | `boolean` | `true` | Gamepad input. |
| `sensitivity` | `number` | `0.8` | Steering strength, `0.5` to `2`. |
| `invertPitch` | `boolean` | `true` | Forward lowers the nose, like a flight stick. |
| `captureSceneNavigation` | `boolean` | `true` | Replace the scene's mouse and touch navigation during the flight. `false` keeps the normal ArcGIS navigation. |

### terrain

See [Ground clearance](flight-concepts.md#ground-clearance).

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Keep the plane above the ground. |
| `minimumClearanceM` | `number` | `2.8` | Lowest height above the ground, `0.5` to `100` m. |
| `maximumAglM` | `number` | `50000` | Highest height above the ground, `100` to `200000` m. |

### ui

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `false` | Show the toolbar. |
| `showSpeed` | `boolean` | `false` | Show the speed in the toolbar. |
| `position` | `string` | `"bottom-end"` | Toolbar position. |
| `controls` | `string[]` | All four | Toolbar buttons, in order: `"power"`, `"pause"`, `"camera"`, `"recover"`. |
| `joystick` | `"auto" \| "always" \| "never"` | `"auto"` | Touch joystick. `auto` shows it on touch screens. |
| `joystickPosition` | `string` | `"bottom-left"` | Joystick position. |
| `locale` | `string` | `"auto"` | `"en"`, `"de"`, `"fr"`, `"it"`, `"es"`, `"pt"`, or `"auto"` to follow the page and browser language. |

Positions are the same as the ArcGIS view UI: `top-left`, `top-right`,
`bottom-left`, `bottom-right`, `top-start`, `top-end`, `bottom-start`, and
`bottom-end`.

### flight

The flight profile. `null` (default) uses the original propeller-plane model.

```js
flight.config = { flight: { model: "super-jet", tuning: { maximumBankDeg: 45 } } };
```

`model` is `"classic"`, `"super-jet"`, `"space-jet"`, `"paraglider"`, or `"airliner"`.
`tuning` overrides profile values. Unlike other groups, `flight` replaces the
previous value instead of merging. See
[Custom aircraft](custom-aircraft.md#pick-a-flight-profile).

### assets

The aircraft model files. `bodyUrl` is required; the others are optional.
See [Custom aircraft](custom-aircraft.md#use-your-own-model).

| Field | Type | Default |
| --- | --- | --- |
| `bodyUrl` | `string` | Bundled plane |
| `propellerUrl` | `string \| null` | Bundled propeller |
| `boostUrl` | `string \| null` | Bundled exhaust |
| `propellerAnchorM` | `{ x, y, z }` | `{ x: 0, y: 2.68, z: 0 }` |
| `visualPitchDeg` | `number` | `0` |
| `preserveFinish` | `boolean` | `false` |

### powerMode and autoStart

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `powerMode` | `"slow" \| "normal" \| "turbo"` | `"normal"` | Brake, cruise, or accelerate to top speed. |
| `autoStart` | `boolean` | `true` | Start flying when the scene is ready. With `false`, wait for `start()`. |

### Invalid values

- Numbers outside their range are clamped. For `fovDeg`, `submissionHz`,
  `sensitivity`, and the terrain distances, `0` means the default.
- A longitude without a latitude, a latitude outside `-90` to `90`, or an empty
  `bodyUrl` throws an `Error`.
- An unknown camera or power mode throws a `TypeError`.
- In `config`, unknown toolbar buttons are ignored, and an unknown position or
  locale keeps the previous value. In HTML, the same values set `status` to
  `error`.

### Live updates

| Applied immediately | Restart the flight |
| --- | --- |
| `camera.mode`, `camera.fovDeg`, `camera.bankedViewport` | `start` |
| `controls.keyboard`, `controls.gamepad`, `controls.sensitivity`, `controls.invertPitch` | `terrain` |
| All `ui` fields | `flight` and `assets` |
| `powerMode` | `camera.submissionHz`, `controls.captureSceneNavigation`, `autoStart` |

A restart stops the flight, restores the camera, loads again, and fires
`arcgisPlaneNavigationReady`. The scene is not reloaded.
[`setAircraft()`](#setaircraft) changes `flight`, `assets`,
`terrain.minimumClearanceM`, and `terrain.maximumAglM` without a restart.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| [`start()`](#start) | `Promise<void>` | Start flying from the start position. |
| `pause()` | `void` | Pause the flight. |
| `resume()` | `void` | Resume a paused flight. |
| [`stop(options?)`](#stop) | `void` | End the flight and remove the plane. |
| `recover()` | `void` | Move back to the last safe position, level the wings, and return to the starting speed. |
| `setCameraMode(mode, instant?)` | `void` | Switch to `"chase"` or `"cockpit"`. Animated unless `instant` is `true`. |
| `setPowerMode(mode)` | `void` | Switch to `"slow"`, `"normal"`, or `"turbo"`. |
| `toggleTurbo()` | `boolean` | Switch between turbo and normal. Returns `true` if turbo is now on. |
| `updateConfig(patch)` | `void` | Change some [configuration](#configuration) fields. |
| [`setAircraft(patch)`](#setaircraft) | `Promise<boolean>` | Change the aircraft without restarting. |
| [`setControlPatch(patch)`](#setcontrolpatch) | `void` | Override the user's input from code. |
| `clearControlPatch(fields?)` | `void` | Remove overrides: the named fields, or all of them. |
| `snapshot()` | `FlightSessionSnapshot \| null` | The current [flight state](#flightsessionsnapshot), or `null` when not flying. |
| `debugSnapshot()` | `object \| null` | Internal diagnostics for bug reports. The shape can change between versions. |

`pause()`, `resume()`, `recover()`, and the control patch methods do nothing
when there is no flight.

### start()

Starts the flight from the start position. If the plane is already flying, it
goes back to the start. You only need `start()` when `autoStart` is `false`, or
to fly again after `stop()`.

```js
await flight.start();
```

The promise rejects if no scene is connected, if loading fails (with the same
error as the `arcgisPlaneNavigationError` event), or if `stop()` is called
first.

### stop()

Ends the flight, removes the plane, and restores the camera and navigation
settings. `status` becomes `idle` and `arcgisPlaneNavigationStopped` fires.
Removing the element from the page does the same.

```js
flight.stop();                          // restore the camera
flight.stop({ restoreCamera: false });  // keep the current camera
```

Use `restoreCamera: false` when you are about to replace the map or view, so
the camera does not jump back first.

### setAircraft()

Loads a new model, flight profile, or ground-clearance setting, and keeps the
plane where it is.

```js
const changed = await flight.setAircraft({
  flight: { model: "super-jet" },
  assets: { bodyUrl: "/models/jet.glb", propellerUrl: null, boostUrl: null },
  terrain: { maximumAglM: 100000 },
});
```

Resolves to `true` when the new aircraft flies. Resolves to `false` if a newer
call replaced it or the flight stopped. Before the first flight, it saves the
settings for the start and resolves to `false`. Rejects if a model cannot load;
the previous aircraft keeps flying.

A new `flight.model` resets the speed to the profile's cruise speed and the
power mode to `normal`. A new model file alone keeps the current speed. To
change `terrain.enabled`, use `updateConfig()`.

### setControlPatch()

Overrides the keyboard, gamepad, and joystick until you clear it.

```js
flight.setControlPatch({ bank: 0.4, accelerate: 1 });
flight.clearControlPatch(["bank"]);
```

| Field | Values |
| --- | --- |
| `pitch`, `bank`, `yaw` | `-1` to `1` |
| `accelerate`, `brake` | `0` to `1` |
| `turboBoost`, `airbrake` | `boolean` |
| `respawn` | `true` recovers once, like `recover()` |

## Events

All events are `CustomEvent`s that bubble and cross shadow DOM boundaries.

| Event | `event.detail` | Fires when |
| --- | --- | --- |
| `arcgisPlaneNavigationReady` | `{ scene, view, snapshot }` | The flight has loaded. Fires again after each restart. |
| `arcgisPlaneNavigationSnapshot` | `{ snapshot }` | The state changes, and up to every 50 ms while flying. |
| `arcgisPlaneNavigationError` | `{ error }` | The flight could not start. `status` is `error`. |
| `arcgisPlaneNavigationStopped` | `{ restoredCamera }` | `stop()` was called. |

In the ready event, `scene` is the `<arcgis-scene>`, or `null` when you set
`view` directly.

```js
flight.addEventListener("arcgisPlaneNavigationError", (event) => {
  console.error(event.detail.error);
});
```

## Types

### FlightSessionSnapshot

```ts
interface FlightSessionSnapshot {
  phase: "ready" | "running" | "paused" | "stopped";
  vehicle: VehicleState;           // physics state
  renderVehicle: VehicleState;     // smoothed state shown on screen
  altitudeMslM: number;            // altitude above sea level, metres
  aglM: number | null;             // height above the ground, or null if unknown
  cameraMode: "chase" | "cockpit";
  powerMode: "slow" | "normal" | "turbo";
  turboActive: boolean;
  braking: boolean;
  simulationStep: number;          // physics steps since the start (60 per second)
  presentedTick: number;           // simulation step of the last frame shown
  gamepad: {
    connected: boolean;
    index: number | null;
    id: string | null;
    mapping: string | null;
  };
  camera: PresentedFlightCameraFrame | null;
}
```

`camera` holds the current camera position (`x`, `y`, `z`), `heading`,
`tilt`, `roll`, and field of view (`fov`).

### VehicleState

```ts
interface VehicleState {
  position: { x: number; y: number; z: number };
  heading: number;        // degrees
  pitch: number;          // degrees
  bank: number;           // degrees
  speed: number;          // see Units below
  verticalSpeed: number;  // metres per second
  throttle: number;
  driftAngle: number;
  launchBoost: number;
  cornerAssist: number;
  // Paraglider and Space Jet only:
  speedBar?: number;
  wingBrake?: number;
  speedBarRate?: number;
  wingBrakeRate?: number;
  wingRollRate?: number;
  wingPitchRate?: number;
  spaceTurnRate?: number;
  spacePitchRate?: number;
}
```

**Units.** `position.z` is in metres. In local scenes, `position.x`,
`position.y`, and `speed` are in metres and metres per second. In global
scenes, they are in Web Mercator units. See [Units](flight-concepts.md#units).

## Other exports

The package also exports:

- `ARCGIS_PLANE_NAVIGATION_TAG`: the tag name, `"arcgis-plane-navigation"`.
- `DEFAULT_PLANE_NAVIGATION_CONFIG` and `DEFAULT_AIRCRAFT_ASSETS`: the defaults (frozen).
- `AIRCRAFT_FLIGHT_PROFILES`: the built-in profiles and their tuning values.
- `mergePlaneNavigationConfig()` and `normalizePlaneNavigationConfig()`: build a
  full configuration from partial ones.
- `PLANE_NAVIGATION_UI_CONTROLS` and `PLANE_NAVIGATION_UI_POSITIONS`: the
  accepted toolbar buttons and positions.
- The toolbar translations and locale helpers.
- TypeScript types for the configuration, events, and snapshots.

Import them from the package root. Internal files are not part of the API.

## Editor support

The package includes `custom-elements.json`, which many editors read for HTML
autocomplete. For VS Code, add this to your project's `.vscode/settings.json`
to get attribute suggestions and descriptions:

```json
{
  "html.customData": ["./node_modules/@ceddc/arcgis-flight-component/html-data.json"]
}
```
