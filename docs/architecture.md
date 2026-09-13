# Architecture

The host application owns its ArcGIS `SceneView` and `Map` or `WebScene`. The flight element attaches through `flight.view` or a reference to `<arcgis-scene>`. It adds one aircraft layer and temporarily controls navigation and the camera.

For the plane's behavior and defaults, read [Flight concepts](flight-concepts.md). For model preparation and extension points, read [Custom aircraft](custom-aircraft.md).

## Ownership contract

| Resource | Ownership |
| --- | --- |
| Scene, map, ground, layers, authentication, application UI | Host-owned; never destroyed by the component. |
| Aircraft layer, graphics, input listeners, animation, timers, optional controls and roll node | Component-owned; released when the session ends. |
| Camera and navigation settings | Borrowed; saved before takeover and restored on ordinary stop or disconnect. |
| View lease | One active flight session per SceneView; released on cleanup. |

Navigation settings and any added `tabindex` are restored only if they still match the component's values, preserving later host changes. Intentional map/view replacement skips restoring the old camera onto the replacement.

## Lifecycle

1. Wait for the caller's view, validate its coordinate system, and acquire its lease.
2. Save borrowed state, resolve the start pose, and load the aircraft.
3. Create the flight session and publish it before callbacks can trigger cleanup.
4. Start automatically, or wait in `ready` when `autoStart` is false. Pause preserves flight state; resume continues it.
5. Stop, disconnect, restart, or failure cancels initialization and releases the session's resources.

Initialization uses cancellation and operation identity checks so a late load cannot attach to a newer session. Direct-view hosts assign the replacement `flight.view`; scene-element hosts also receive ArcGIS readiness events.

See the [API reference](api-reference.md) for statuses, methods, and events.

## Runtime data flow

```text
Keyboard / gamepad / programmatic input
  -> fixed-step flight physics
  -> interpolated aircraft pose and camera
  -> one presentation frame
  -> aircraft graphics + SceneView.camera + optional viewport roll
```

Physics runs at 60 Hz. Display frames interpolate the pose, and the presentation scheduler applies camera and aircraft updates together. Camera writes are capped by `camera.submissionHz` and can temporarily slow under sustained rendering pressure.

Terrain comes from the host's live elevation sampler. Unknown terrain stays unknown; a recent nearby sample may cover a brief sampler replacement. Ground clearance does not detect buildings or other obstacles.

## Code and SDK boundaries

The [development guide](development.md#repository-layout) maps source folders to responsibilities and documents the camera, terrain, and cleanup rules.

Component-only builds keep ArcGIS external. The standalone browser build includes it. ESM family files remove imports unavailable in their target SDK; AMD resolves modules through the host loader. See [SDK integration](sdk-compatibility.md) for choosing a build.
