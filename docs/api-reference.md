# API reference

Import the package once to register `<arcgis-plane-navigation>`. Use this
page to look up its methods, events, and TypeScript types. For examples you
can try in your app, start with [Common changes](configuration-recipes.md).

## Import

```ts
import {
  ArcgisPlaneNavigationElement,
  DEFAULT_PLANE_NAVIGATION_CONFIG,
  type PlaneNavigationConfigInput,
  type FlightSessionSnapshot,
} from "@ceddc/arcgis-flight-component";
```

The default import targets SDK 5.1. For an older SDK, use the matching
`sdk-4.30` or `sdk-4.32` subpath described in [SDK integration](sdk-compatibility.md).
Import `arcgis-scene` separately if your app uses that element. An existing
`SceneView` works without ArcGIS Map Components.

## HTML editor help

The [HTML attribute table](configuration.md#html-attributes) shows each
attribute's value type. This package also includes `custom-elements.json` for
editors that read Custom Elements Manifest files and `html-data.json` for VS
Code's HTML attribute suggestions and hover descriptions. In a consuming VS
Code project, add:

```json
{
  "html.customData": [
    "./node_modules/@ceddc/arcgis-flight-component/html-data.json"
  ]
}
```

Place that JSON in `.vscode/settings.json`. This repository already includes
the equivalent setting for its own HTML files. HTML attributes are strings or
presence flags in markup; `view`, `referenceElement`, and `config` are typed
JavaScript properties described below.

## Element status

`PlaneNavigationStatus` is one of:

| Status | Meaning |
| --- | --- |
| `idle` | No active session, including deferred scene binding, disconnect, or `stop()` |
| `loading` | Waiting for the host view or initializing component resources |
| `ready` | Initialized with automatic start disabled |
| `running` | Flight animation and input sampling are active |
| `paused` | Physics and camera presentation are paused; gamepad buttons are still polled |
| `error` | Initialization or host scene transition failed |

The current status is available through `flight.status` and is reflected to the element's `status` attribute.

## Properties

| Property | Read type | Assignment type |
| --- | --- | --- |
| `status` | `PlaneNavigationStatus` | Read-only |
| `referenceElement` | `FlightSceneElement \| null` | `FlightSceneElement \| null` |
| `view` | `SceneView \| null` | `SceneView \| null` |
| `config` | `PlaneNavigationConfig` | `PlaneNavigationConfigInput` |

In TypeScript, `document.createElement("arcgis-plane-navigation")` returns
`ArcgisPlaneNavigationElement` when the package's types are included. The
properties above are checked when used from script; HTML editors use the
attribute metadata described above.

### `status`

`readonly status: PlaneNavigationStatus` returns one of the states listed above.

### `referenceElement`

`referenceElement: FlightSceneElement | null` gets or sets the caller-owned `<arcgis-scene>`. A non-null value overrides `reference-element`. Changes while connected reinitialize the session. With no reference, the element stays `idle`; an explicit missing or wrong-type target reports an error.

### `view`

`view: SceneView | null` gets or sets a caller-owned 3D view with an HTML container. It overrides both scene-element references; set it to `null` to use them again. Changes while connected reinitialize the session. The component waits for `view.when()` and uses its container for input. It never creates or destroys the view.

### `config`

Assign a `PlaneNavigationConfigInput` to change settings. Reading `config`
returns the full `PlaneNavigationConfig`, with defaults and validation
applied. You can pass just the fields you want to change; they follow the
same [live-update and restart rules](configuration.md#live-updates-and-session-restarts)
as `updateConfig()`.

## Methods

### `start()`

`start(): Promise<void>` initializes if needed, resets the aircraft to its configured start state, and starts flight. It rejects when disconnected, missing a valid host, unable to initialize, or explicitly stopped before completion. Stop and disconnect cancel that request; it cannot attach to a later restart. Initialization failures reject with the same `Error` emitted by `arcgisPlaneNavigationError`.

### `pause()`

`pause(): void` pauses physics and camera presentation, preserving the aircraft state. Gamepad buttons remain active so Menu can resume. No effect outside a running session.

### `resume()`

`resume(): void` resumes a paused flight. No effect outside a paused session.

### `stop()`

`stop(options?: { restoreCamera?: boolean }): void` aborts initialization, destroys the session, and returns to `idle`. It removes only component-owned resources, releases listeners, animation work, and the SceneView lease, and restores borrowed navigation state.

`restoreCamera` defaults to `true`. Use `false` when intentionally replacing the host map or view. Explicit stop always emits `arcgisPlaneNavigationStopped`, even without an active session. Disconnect also cleans up; the caller's view, map, and layers remain caller-owned.

### `recover()`

`recover(): void` moves to the last safe position, resets attitude and smoothed pitch input, restores initial speed, and presents immediately. It preserves the paused or running state. No effect without a session.

### `setCameraMode()`

`setCameraMode(mode: "chase" | "cockpit", instant?: boolean): void` stores and applies the mode. Transitions animate unless `instant` is `true`. A paused session updates immediately without resuming. Invalid values throw `TypeError` before state changes.

### `setPowerMode()`

`setPowerMode(mode: "slow" | "normal" | "turbo"): void` stores and applies braking, normal power, or turbo boost. Invalid values throw `TypeError` before state changes.

### `toggleTurbo()`

`toggleTurbo(): boolean` switches turbo on, or returns from turbo to normal, and reports whether turbo is enabled. Without a session, it selects normal power and returns `false`.

### `updateConfig()`

`updateConfig(patch: PlaneNavigationConfigInput): void` merges and normalizes a partial configuration. See [live updates and restarts](configuration.md#live-updates-and-session-restarts) for each field.

Invalid camera or power modes throw `TypeError` before mutation. If a live camera update fails, it restores the previous camera mode and frame, leaves configuration and input unchanged, and rethrows the error.

### `setAircraft()`

`setAircraft(patch: Pick<PlaneNavigationConfigInput, "flight" | "assets" | "terrain">): Promise<boolean>`
loads and applies an aircraft in the current session without recreating the
scene. Supply any combination of the flight profile, model assets, and terrain
clearance or ceiling:

```ts
const changed = await flight.setAircraft({
  flight: { model: "super-jet" },
  assets: { bodyUrl: "/models/my-jet.glb", propellerUrl: null, boostUrl: null },
  terrain: { maximumAglM: 100_000 },
});
```

It returns `true` when the selection becomes active. It returns `false` if a
newer selection supersedes it, the session ends, or no session exists yet. In
the last case, it stores the settings and starts initialization if connected.
A load or configuration error rejects the promise.

Changing only assets retains the aircraft's current position, motion, and
power mode. Changing the profile's model keeps the position and scene but resets
attitude and speed to the new profile's cruise speed, and sets power to normal.
The element temporarily reports `loading` during the swap, then reflects
the session's `ready`, `running`, or `paused` status. The swap does not
emit another `arcgisPlaneNavigationReady` event.

`terrain.minimumClearanceM` and `terrain.maximumAglM` apply in place.
`terrain.enabled` is captured when the session starts: do not change it with
`setAircraft()`. Use `updateConfig()` to change it and restart the session. See
[Custom aircraft](custom-aircraft.md) for model preparation.

### `setControlPatch()`

`setControlPatch(patch: ControlFramePatch): void` overrides sampled keyboard or gamepad fields until cleared. No effect without a session.

| Fields | Values |
| --- | --- |
| `pitch`, `bank`, `yaw` | Clamped to `-1` through `1` |
| `accelerate`, `brake` | Clamped to `0` through `1` |
| `turboBoost`, `airbrake` | Boolean |
| `respawn` | `true` recovers immediately, including while paused; it is not a persistent override |

For example: `flight.setControlPatch({ pitch: 0.25, bank: -0.4, accelerate: 1 })`.

### `clearControlPatch()`

`clearControlPatch(fields?: readonly (keyof ControlFrame)[]): void` clears the named overrides, or all overrides when omitted. The selected power mode is then reapplied. No effect without a session.

### `snapshot()`

`snapshot(): FlightSessionSnapshot | null` returns the current session state, or `null` without an active session.

### `debugSnapshot()`

Returns integration diagnostics, or `null` without a session: layer ownership, camera submission, terrain sampling, view lease, roll renderer, `sessionPhase`, and `simulationStep`. This diagnostic shape may change; use `snapshot()` for application state.

## Events

All four events are typed `CustomEvent` instances with `bubbles: true` and `composed: true`.

### `arcgisPlaneNavigationReady`

Emitted after initialization. With `autoStart: true`, the snapshot may already be `running`.

```ts
interface PlaneNavigationReadyDetail {
  scene: FlightSceneElement | null;
  view: SceneView;
  snapshot: FlightSessionSnapshot;
}
```

### `arcgisPlaneNavigationSnapshot`

Emitted on immediate state changes and periodically while running, at most once per 50 ms for periodic updates.

```ts
interface PlaneNavigationSnapshotDetail {
  snapshot: FlightSessionSnapshot;
}
```

### `arcgisPlaneNavigationError`

Emitted when initialization or a scene-ready transition fails; the element enters `error`.

```ts
interface PlaneNavigationErrorDetail {
  error: Error;
}
```

### `arcgisPlaneNavigationStopped`

Emitted by explicit `stop()`. `restoredCamera` reports the requested restoration policy, including when no session was active.

```ts
interface PlaneNavigationStoppedDetail {
  restoredCamera: boolean;
}
```

## Flight snapshot

```ts
interface FlightSessionSnapshot {
  phase: "ready" | "running" | "paused" | "stopped";
  vehicle: VehicleState;
  renderVehicle: VehicleState;
  altitudeMslM: number;
  aglM: number | null;
  cameraMode: "chase" | "cockpit";
  powerMode: "slow" | "normal" | "turbo";
  turboActive: boolean;
  braking: boolean;
  simulationStep: number;
  presentedTick: number;
  gamepad: Readonly<FlightGamepadStatus>;
  camera: PresentedFlightCameraFrame | null;
}
```

`vehicle` contains the deterministic physics state. `renderVehicle` is the
interpolated position and attitude you see on screen. `aglM` is `null` when
the ground height is unknown.

### `VehicleState`

```ts
interface VehicleState {
  position: { x: number; y: number; z: number };
  heading: number;
  pitch: number;
  bank: number;
  driftAngle: number;
  speed: number;
  throttle: number;
  launchBoost: number;
  cornerAssist: number;
  verticalSpeed: number;
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

The optional fields hold the Paraglider's controls and motion rates, and
the Space Jet's turn and pitch rates.

Local snapshot positions use metres: projected XY is multiplied by the spatial reference's metres-per-unit scale. Local speed is metres per second. This supports any local projected linear coordinate system with a finite, positive scale, including views in feet. Global Web Mercator retains projected XY and projected units per second. Vertical position uses metres and vertical speed uses metres per second. Angles use degrees. See [Scene distance semantics](configuration.md#scene-distance-semantics).

### Gamepad status

```ts
interface FlightGamepadStatus {
  connected: boolean;
  index: number | null;
  id: string | null;
  mapping: string | null;
}
```

### Presented camera frame

When available, the camera snapshot contains `x`, `y`, `z`, `heading`, `tilt`, `roll`, `rollScale`, `baseFov`, `fov`, `aircraftVisible`, `viewMode`, and `transitionBlend`.

## Exported helpers and types

The root entry point also exports:

- `ARCGIS_PLANE_NAVIGATION_TAG`
- `DEFAULT_AIRCRAFT_ASSETS`
- `DEFAULT_PLANE_NAVIGATION_CONFIG`
- `AIRCRAFT_FLIGHT_PROFILES` and the aircraft profile and tuning types
- configuration merge, normalization, and UI validation helpers
- supported UI control and position constants
- localization catalogs, locale detection, and text helpers
- configuration, event, snapshot, vehicle, view-mode, power-mode, and control-frame types

The exported default objects, their nested groups, and the UI option tuples are frozen at runtime and typed through `DeepReadonly`. `normalizePlaneNavigationConfig()` returns an independent mutable configuration for application use.

Use the root entry point instead of importing internal source paths. Internal modules are not declared as package subpath exports.
