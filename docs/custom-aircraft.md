# Custom aircraft

Start with your own body model, then add moving parts if needed. Replacing
assets uses the public API. Changing attachment points, camera offsets, or the flight
model requires changes to the component source.

## Load your model

Export a glTF 2.0 model as a `.glb` with its textures included. Serve it with
your application, for example from Vite's `public/models/` directory:

```ts
import "@ceddc/arcgis-flight-component";

const flight = document.createElement("arcgis-plane-navigation");
flight.view = existingSceneView;
flight.config = {
  autoStart: false,
  assets: {
    bodyUrl: "/models/my-plane.glb",
    propellerUrl: null,
    boostUrl: null,
  },
};
document.body.append(flight);
await flight.start();
```

Use URLs appropriate to your deployment base path. Cross-origin URLs need
CORS access. Set both optional parts to `null` for a body-only model;
omitting those fields keeps the bundled propeller and boost. Changing any
asset URL restarts the flight session.

## Prepare scale, origin, and orientation

Use the [bundled aircraft](../src/assets/aircraft/) as a reference in your
modeling tool. Preserve metre scale and put the body origin at the intended
flight pivot. There are no public scale, rotation-offset, or pivot settings:
bake adjustments into your exported model.

After ArcGIS imports the model, the flight frame expects the nose along +Y,
wings across X, and up along +Z. These are the component's local axes, not
instructions to override your glTF exporter's axis conversion. Check the
imported result at heading 0: it should face north and sit upright.

The camera and clearance checks use the aircraft origin. A larger model may
need more `terrain.minimumClearanceM` and different camera offsets in source.
The component does not measure the model to fit its camera or ground limits.

## Optional parts and their current defaults

| Part | Asset and placement | Behavior |
| --- | --- | --- |
| Body | `assets.bodyUrl`, located at the aircraft origin | Required; follows heading, pitch, and bank. |
| Propeller | `assets.propellerUrl`, centered on its spin axis | Positioned 2.68 m forward of the body origin in the model's local +Y direction, then rotated with the body. Spins around local Y. |
| Boost | `assets.boostUrl`, authored relative to the body origin, pointing along local -Y | Grows and fades with turbo. The frontmost local Y plane stays fixed at the nozzle. |

The propeller offset is fixed in
[`aircraft-presenter.ts`](../src/arcgis/aircraft-presenter.ts). For another
nose length, a rotor, or multiple propellers, adapt that presenter and its
part-loading code. The exhaust presenter scales the plume along local Y without moving its nozzle; bake that orientation into a custom boost GLB. A single `propellerUrl` does not discover or animate parts
inside the body model.

Embedded animation clips are not played by this mesh-loading path; see the
[ArcGIS glTF loader](https://developers.arcgis.com/javascript/latest/references/core/geometry/support/meshUtils/#createFromGLTF).
The component animates the separate propeller itself. It also applies a finish
to body and propeller materials: source normals are retained and some PBR
roughness values are reduced, while translucent glazing is preserved. Adjust
[`aircraft-finish.ts`](../src/arcgis/aircraft-finish.ts) if you need the exported
material roughness preserved exactly.

## Change handling or camera behavior

| What you want to change | Public setting or source |
| --- | --- |
| Input response, inverted pitch | `controls.sensitivity`, `controls.invertPitch` |
| Starting speed and ongoing power | `start.speedMps`, `powerMode` |
| Ground clearance and flight ceiling | `terrain.minimumClearanceM`, `terrain.maximumAglM` |
| View mode, base field of view, horizon roll | `camera.mode`, `camera.fovDeg`, `camera.bankedViewport` |
| Temporary mouse/touch orbit and return | [`camera-drag.ts`](../src/core/camera-drag.ts), [`camera-drag-input.ts`](../src/arcgis/camera-drag-input.ts) |
| Chase distance, cockpit eye position, view transition | [`camera-rig.ts`](../src/core/camera-rig.ts) |
| Pitch/bank limits, turn response, acceleration | `FLIGHT_TUNING` and `stepFlight()` in [`flight.ts`](../src/core/flight.ts) |
| Part loading and graphics | [`initialization-resources.ts`](../src/arcgis/initialization-resources.ts), [`hosted-flight-scene.ts`](../src/arcgis/hosted-flight-scene.ts) |

Current internal flight defaults are a 60 Hz simulation, maximum pitch of
78 degrees, maximum bank of 55 degrees, and maximum vertical speed of
115 m/s. These are source constants, not extra `config` fields. The public
default AGL ceiling is 50000 m, configurable up to 200000 m. A custom GLB uses the same flight rules.

## Check your aircraft

Run it in a small scene with an explicit start position. Verify upright
orientation, heading, pitch and bank, propeller alignment during turns,
chase/cockpit framing, and terrain clearance. Check pause, resume, and removal
of the element so the host camera and navigation are restored.

For source changes, follow the [development checks](development.md#commands).
Flight or camera math changes also need the A/B comparison, with intentional
behavior changes reviewed before updating its reference.
