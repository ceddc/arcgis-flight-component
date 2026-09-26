# Common changes

Once you have [a scene with an aircraft](getting-started.md), try these small
changes to make it your own. In the JavaScript examples, `flight` is your
`arcgis-plane-navigation` element.

## WebScene and aircraft only

```ts
import "@arcgis/map-components/components/arcgis-scene";
import "@ceddc/arcgis-flight-component";
```

```html
<style>html, body, arcgis-scene { width: 100%; height: 100%; margin: 0; } arcgis-scene { display: block; }</style>
<arcgis-scene id="scene" item-id="YOUR_PUBLIC_WEBSCENE_ITEM_ID"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene"></arcgis-plane-navigation>
```

This gives you keyboard and gamepad controls, ground-clearance checks, and
a camera behind the plane. See [Getting started](getting-started.md) for
connecting and removing the component.

## Choose an explicit start pose

```html
<arcgis-plane-navigation
  reference-element="scene"
  start-longitude="8.25613" start-latitude="46.97915"
  start-altitude-m="2750" start-heading-deg="118"
></arcgis-plane-navigation>
```

Set longitude and latitude together. Leave them out to use the loaded view
center. Heading defaults to the scene camera heading; altitude defaults to
300 m above the sampled ground.

## Change camera behavior

```html
<arcgis-plane-navigation reference-element="scene"
  camera-mode="cockpit" fov-deg="62" camera-roll-disabled>
</arcgis-plane-navigation>
```

Camera mode, field of view, and camera roll can also change live:

```ts
flight.updateConfig({ camera: { mode: "cockpit", fovDeg: 62, bankedViewport: false } });
```

## Tune input

```html
<arcgis-plane-navigation reference-element="scene"
  sensitivity="1.1" invert-pitch-disabled>
</arcgis-plane-navigation>
```

For an autopilot or your own input controls, see
[programmatic input](api-reference.md#setcontrolpatch).

## Add the optional flight overlay

```html
<arcgis-plane-navigation reference-element="scene"
  show-controls show-speed ui-position="bottom-end"
  ui-controls="power pause camera recover" locale="auto">
</arcgis-plane-navigation>
```

The toolbar disappears when you remove the flight element. You can also
set `ui.enabled`, `ui.showSpeed`, `ui.position`, and `ui.controls` through the
typed `config` property.

## Delay automatic flight

Add `auto-start-disabled` to the element. Then call `start()` when the user
chooses to fly, for example from a button in your application:

```ts
startButton.addEventListener("click", async () => {
  await flight.start();
});
```

## Set ground clearance

Use the scene's ground height to keep the aircraft above the surface and limit
its height above ground (AGL). This example uses a 5 m lower threshold and a
3500 m ceiling:

```ts
flight.updateConfig({
  terrain: { enabled: true, minimumClearanceM: 5, maximumAglM: 3500 },
});
```

Changing these settings restarts the flight with the new ground limits. Your
scene keeps its existing terrain data. To turn off the flight ground checks,
set `terrain.enabled` to `false`. Also set `start.altitudeM` if you want to
skip the initial ground query. See [Terrain settings](configuration.md#terrain)
for the full list of limits.

## Use your own aircraft

```ts
await flight.setAircraft({
  assets: { bodyUrl: "/models/aircraft.glb", propellerUrl: null, boostUrl: null },
});
```

The body is required; `null` removes the optional parts. In an active
session, `setAircraft()` replaces the model without restarting flight or
reloading the scene. If no session exists yet, it stores the selection for
initialization and returns `false`. Follow
[Custom aircraft](custom-aircraft.md) for scale, orientation, part placement,
and changes to the flight model.

## Change power mode

```ts
flight.setPowerMode("turbo");
```

Use `"normal"` for cruise or `"slow"` to brake. To change the aircraft's
speed limits, use a [flight profile](custom-aircraft.md#choose-speed-and-handling).

## Know whether a change is live

Camera, input, power, and optional UI settings apply live. With `config` or
`updateConfig()`, aircraft assets, flight profiles, start pose, terrain
settings, navigation capture, camera submission rate, and automatic start
restart the session. `setAircraft()` changes the aircraft and the terrain
clearance/ceiling in place; `terrain.enabled` still needs a restart. Your
scene and map stay in place.

See [Configuration](configuration.md) for every field, range, attribute, and
normalization rule, and [API reference](api-reference.md) for methods and events.
