# Custom aircraft

Bring your own plane model, change how it flies, or do both.
Try the four aircraft in the [Other aircraft demo](../demos/aircraft/)
to get a feel for the different flight profiles.

## Load your model

Export your aircraft as a glTF 2.0 binary (`.glb`) with textures included. Put
it at `public/models/my-plane.glb` in a Vite app; Vite serves that file at
`/models/my-plane.glb`. Set the body URL and choose whether to use separate
propeller and boost meshes. Once you have an ArcGIS `SceneView` (as in
[Getting started](getting-started.md)), attach the flight element:

```ts
import "@ceddc/arcgis-flight-component";

const flight = document.createElement("arcgis-plane-navigation");
flight.view = existingSceneView;
flight.config = {
  flight: { model: "classic" },
  assets: {
    bodyUrl: `${import.meta.env.BASE_URL}models/my-plane.glb`,
    propellerUrl: null,
    boostUrl: null,
  },
};
document.body.append(flight);
```

The example disables the separate propeller and boost, leaving the GLB body on
its own. To keep the bundled optional meshes, omit `propellerUrl` and
`boostUrl`; to use your own, put those GLBs under `public/models/` and set their
URLs the same way. `import.meta.env.BASE_URL` keeps the paths correct when the
app is deployed below the domain root. Files served from another domain need
CORS access.

Before the element has started, assign the configuration as shown above. To
replace a model in an active session while keeping the current world and flight,
use `setAircraft()`:

```ts
await flight.setAircraft({
  assets: {
    bodyUrl: `${import.meta.env.BASE_URL}models/my-other-plane.glb`,
    propellerUrl: null,
    boostUrl: null,
  },
});
```

`setAircraft()` resolves to `true` when that aircraft becomes active, or `false`
when the request is superseded or the session is no longer active. Before
initialization, it stores the selection and returns `false`. It can also take
a `flight` profile and terrain clearance or ceiling in the same patch. To
change `terrain.enabled`, use `updateConfig()` and let the session restart.
Changing assets with `updateConfig()` also restarts the session. Changing
assets does not by itself change how the aircraft flies.

## Choose speed and handling

Choose how the aircraft flies with a flight profile. To apply it to an active
session without reloading the scene, use:

```ts
await flight.setAircraft({ flight: { model: "super-jet" } });
```

This keeps the current position and scene, but resets attitude, speed to the
new profile's cruise speed, and power to normal. Camera framing adjusts for
the new profile. Setting the same profile's tuning without changing its model
keeps the current motion.

| Profile | Cruise | Top speed | How it flies |
| --- | ---: | ---: | --- |
| `classic` | 360 km/h | 1,200 km/h | Self-leveling propeller-plane handling |
| `super-jet` | 1,026 km/h | 3,240 km/h | Wider turns at speed; braking tightens turns |
| `space-jet` | 2,340 km/h | 36,000 km/h | Independent vertical thrust; 200 km altitude ceiling |
| `paraglider` | 50 km/h | 80 km/h | Unpowered glide; speed bar and brakes, no turbo thrust |

The profiles are made for exploring the map and do not model real aircraft performance.
For the Space Jet, holding Shift increases speed up to its regular maximum;
Turbo power mode raises the speed cap to the profile's `turboMaximumSpeed`.
Terrain limits still apply: increase
`terrain.maximumAglM` from its 50,000 m default to reach higher altitudes.

A profile changes handling, not the visible model. To use a model from the
demo, copy its GLBs from [the sample assets](../public/models/fleet/SOURCE.md)
and set their URLs as above. They are not included in the installed component
package.

## Set your own speed

For a slower powered plane, override the profile's defaults:

```ts
flight.config = {
  flight: {
    model: "classic",
    tuning: {
      minimumSpeed: 25,
      cruiseSpeed: 60,
      maximumSpeed: 95,
      turboMaximumSpeed: 140,
      maximumBankDeg: 30,
      bankResponse: 2.5,
    },
  },
};
```

Configuration speeds are in **metres per second**; multiply by 3.6 for km/h.
Keep the speeds in ascending order: minimum, cruise, maximum, turbo maximum.
`flight.tuning` changes ongoing behavior. `start.speedMps` only changes the
initial speed, which otherwise defaults to the selected profile's cruise speed.

For powered aircraft, `AircraftTuning` also lets you adjust acceleration,
pitch, bank, and turns. The paraglider uses a fixed glide model and rejects
tuning overrides that change its defaults. A different kind of flight, such as a
helicopter, would need changes to the flight code.

Setting a profile through `config` or `updateConfig()` restarts flight;
`setAircraft()` applies it in place. Each profile update starts from that
profile's defaults, so include every tuning override you want to keep. Use
`flight: null` to return to the component's original flight behavior.

## Prepare scale, origin, and orientation

- Model in metres, with the origin at the intended flight pivot.
- After ArcGIS imports the GLB, the nose should point along +Y, the wings across X,
  and up along +Z. Check that heading 0 faces north and the model sits upright.
- Bake size and pivot adjustments into the GLB. There is no automatic camera fit.
- For larger aircraft, increase `terrain.minimumClearanceM` as needed.

Use the [bundled model](../src/assets/aircraft/) as a reference.

## Optional parts and their current defaults

| Setting | Purpose |
| --- | --- |
| `assets.propellerUrl` | Separate propeller model, centered on its spin axis; rotates around local Y. |
| `assets.propellerAnchorM` | Propeller position relative to the body, in metres. Default: `{ x: 0, y: 2.68, z: 0 }`. |
| `assets.boostUrl` | Exhaust model, positioned relative to the body and pointing along -Y. Appears during turbo. |
| `assets.visualPitchDeg` | Visual nose tilt, in degrees. Default: 0. Does not alter the flight path. |
| `assets.preserveFinish` | Set to `true` to keep the model's original material roughness. |

Embedded GLB animation clips are not played. Only the separate propeller and
boost parts are animated by the component. Multiple propellers or rotors need
changes to the rendering code.

## Check your aircraft

Take your model for a short flight in a small scene. Check its size and
orientation, watch the propeller during turns, try both cameras, and make
sure it has enough ground clearance.

For camera and control settings, see [Common changes](configuration-recipes.md).
For changes to the component itself, see [Development](development.md).
