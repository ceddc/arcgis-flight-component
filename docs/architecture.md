# Architecture

The split is simple: your application looks after the scene, and the
component looks after the flight. Connect it to your `SceneView` through
`flight.view`, or point it at an `<arcgis-scene>`. It adds one aircraft layer
and takes control of navigation and the camera while you fly. Your
application keeps ownership of the view and its `Map` or `WebScene`.

This page explains how the parts fit together. For what you see while
flying, read [Flight concepts](flight-concepts.md). To bring your own model,
start with [Custom aircraft](custom-aircraft.md).

## Ownership contract

| Resource | Ownership |
| --- | --- |
| Scene, map, ground, layers, authentication, application UI | Host-owned; never destroyed by the component. |
| Aircraft layer, graphics, input listeners, animation, timers, optional controls and roll node | Component-owned; released when the session ends. |
| Camera and navigation settings | Borrowed; saved before takeover and restored on ordinary stop or disconnect. |
| View lease | One active flight session per SceneView; released on cleanup. |

On cleanup, navigation settings and any added `tabindex` are restored only
if they still match the values the component set. This keeps changes your
application made in the meantime. The saved camera is restored by default;
call `stop({ restoreCamera: false })` when you want to keep the current camera
while replacing the map or view.

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

Ground height comes from the scene's live elevation sampler. A recent
nearby sample can fill a short gap while the sampler is replaced. Otherwise,
missing ground data stays unknown. These checks do not detect buildings or
other obstacles.

## Code and SDK boundaries

The [development guide](development.md#repository-layout) maps source folders to responsibilities and documents the camera, terrain, and cleanup rules.

Component-only builds keep ArcGIS external. The standalone browser build includes it. ESM family files remove imports unavailable in their target SDK; AMD resolves modules through the host loader. See [SDK integration](sdk-compatibility.md) for choosing a build.
