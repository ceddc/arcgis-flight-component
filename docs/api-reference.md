# API reference

The package entry point registers `<arcgis-plane-navigation>` as an import side effect and exports its class, configuration helpers, localization helpers, and public TypeScript types.

## Import

```ts
import {
  ArcgisPlaneNavigationElement,
  DEFAULT_PLANE_NAVIGATION_CONFIG,
  type PlaneNavigationConfigInput,
  type FlightSessionSnapshot,
} from "@ceddc/arcgis-flight-component";
```

This default package entry targets SDK 5.1. For an older host, use the matching `sdk-4.30` or `sdk-4.32` subpath described in [Getting started](getting-started.md). Import `arcgis-scene` separately only when the host uses that element; direct `SceneView` integration does not need ArcGIS Map Components.

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

### `status`

`readonly status: PlaneNavigationStatus` returns the current lifecycle status.

### `referenceElement`

`referenceElement: FlightSceneElement | null` gets or sets the caller-owned `<arcgis-scene>`. A non-null value overrides `reference-element`. Changes while connected reinitialize the session. With no reference, the element stays `idle`; an explicit missing or wrong-type target reports an error.

### `view`

`view: SceneView | null` gets or sets a caller-owned 3D view with an HTML container. It overrides both scene-element references; set it to `null` to use them again. Changes while connected reinitialize the session. The component waits for `view.when()` and uses its container for input. It never creates or destroys the view.

### `config`

The setter accepts `PlaneNavigationConfigInput`; the getter returns a complete normalized `PlaneNavigationConfig`. Assignments merge a partial configuration and follow the same [live-update and restart rules](configuration.md#live-updates-and-session-restarts) as `updateConfig()`.

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

### `setControlPatch()`

`setControlPatch(patch: ControlFramePatch): void` overrides sampled keyboard or gamepad fields until cleared. No effect without a session.

| Fields | Values |
| --- | --- |
| `pitch`, `bank`, `yaw` | Clamped to `-1` through `1` |
| `accelerate`, `brake` | Clamped to `0` through `1` |
| `turboBoost`, `airbrake` | Boolean |
| `respawn` | `true` requests recovery for one frame |

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

`vehicle` is the deterministic physics state. `renderVehicle` is the interpolated pose used for presentation. `aglM` is `null` when terrain information is unavailable.

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
}
```

Horizontal position and speed use scene units: metres in supported local scenes, projected Web Mercator units in global scenes. Vertical position uses metres and vertical speed uses metres per second. Angles use degrees. See [Scene distance semantics](configuration.md#scene-distance-semantics).

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
- configuration merge, normalization, and UI validation helpers
- supported UI control and position constants
- localization catalogs, locale detection, and text helpers
- configuration, event, snapshot, vehicle, view-mode, power-mode, and control-frame types

The exported default objects, their nested groups, and the UI option tuples are frozen at runtime and typed through `DeepReadonly`. `normalizePlaneNavigationConfig()` returns an independent mutable configuration for application use.

Use the root entry point instead of importing internal source paths. Internal modules are not declared as package subpath exports.
