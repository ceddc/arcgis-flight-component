# Custom aircraft

An aircraft has two independent parts:

- **The model**: the glTF files you see (`config.assets`).
- **The flight profile**: how it flies, its speeds and handling (`config.flight`).

You can change either one, or both. The
[Other aircraft sample](../demos/aircraft/) shows four combinations.

## Pick a flight profile

```js
flight.config = { flight: { model: "super-jet" } };
```

| Profile | Cruise | Top speed | How it flies |
| --- | ---: | ---: | --- |
| `classic` | 360 km/h | 1,200 km/h | Propeller plane that levels itself when you let go |
| `super-jet` | 1,026 km/h | 3,240 km/h | Wider turns at speed; brake to turn tighter |
| `space-jet` | 2,340 km/h | 36,000 km/h | Up and down control vertical thrust; climbs up to 200 km |
| `paraglider` | 50 km/h | 80 km/h | No engine: Shift is the speed bar, Space brakes |

Top speed is reached in turbo mode. These profiles are made for exploring
maps, not for realistic flight.

Without a profile (`flight: null`, the default), the component uses its
original propeller-plane model, close to `classic`.

> [!TIP]
> The ground-clearance ceiling defaults to 50 km above the ground. To let the
> Space Jet climb higher, also set `terrain: { maximumAglM: 200000 }`.

## Use your own model

Export your aircraft as a binary glTF file (`.glb`) with its textures included.
In a Vite app, put it in `public/models/`, then set its URL:

```js
flight.config = {
  assets: {
    bodyUrl: "/models/my-plane.glb",
    propellerUrl: null, // no separate propeller
    boostUrl: null,     // no turbo exhaust
  },
};
```

If your app is not served from the domain root, build the URL from
`import.meta.env.BASE_URL` instead. Files on another domain need CORS.

### Prepare the model

- Use metres, with the origin where the plane should pivot.
- Point the nose along +Y, the wings along X, and up along +Z (after ArcGIS
  imports the file). With heading 0, the plane should face north.
- Bake the scale and pivot into the file. The camera distance does not adapt
  to the model size.
- Large models may need a higher `terrain.minimumClearanceM`.

The bundled model in [`src/assets/aircraft`](../src/assets/aircraft/) is a
working reference.

### Optional parts

| Field | Default | Description |
| --- | --- | --- |
| `assets.propellerUrl` | Bundled propeller | A separate model that spins around its local Y axis. `null` for none. |
| `assets.propellerAnchorM` | `{ x: 0, y: 2.68, z: 0 }` | Propeller position relative to the body, in metres. |
| `assets.boostUrl` | Bundled exhaust | A model shown in turbo mode, pointing along -Y. `null` for none. |
| `assets.visualPitchDeg` | `0` | Tilts the model's nose, in degrees. The flight path does not change. |
| `assets.preserveFinish` | `false` | `true` keeps the model's own material roughness. |

Animations inside the GLB file are not played. Only the propeller and the
exhaust move.

The sample models in [`public/models/fleet`](../public/models/fleet/SOURCE.md)
are not part of the installed package. Copy the ones you want into your app.

## Swap the aircraft during a flight

Setting `config` restarts the flight. `setAircraft()` changes the model, the
profile, or both, and keeps the plane where it is:

```js
const changed = await flight.setAircraft({
  flight: { model: "paraglider" },
  assets: { bodyUrl: "/models/paraglider.glb", propellerUrl: null, boostUrl: null },
});
```

It resolves to `true` once the new aircraft flies. It resolves to `false` if
another swap replaced it or the flight has stopped. If the model fails to
load, the promise rejects and the current aircraft keeps flying.

A new profile resets the speed to its cruise speed. A new model alone keeps the
current speed and attitude.

## Change speed and handling

Override any value of a powered profile with `tuning`. Speeds are in metres
per second (multiply by 3.6 for km/h):

```js
flight.config = {
  flight: {
    model: "classic",
    tuning: {
      minimumSpeed: 25,
      cruiseSpeed: 60,
      maximumSpeed: 95,
      turboMaximumSpeed: 140,
      maximumBankDeg: 30,
    },
  },
};
```

Keep the speeds in order: minimum, cruise, maximum, turbo maximum. Every
update starts from the profile's defaults, so include all the overrides you
want to keep. The paraglider does not accept tuning.

See `AircraftTuning` in [`src/core/profile-flight.ts`](../src/core/profile-flight.ts)
for every value. A different kind of aircraft, such as a helicopter, needs
changes to the flight code; see [Development](development.md).
