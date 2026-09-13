# Configuration recipes

These examples start with the smallest integration and add options only when
needed. The component renders no controls by default.

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

This enables keyboard and gamepad input, ground-clearance checks, and the chase
camera. See [Getting started](getting-started.md) for lifecycle details.

## Choose an explicit start pose

```html
<arcgis-plane-navigation
  reference-element="scene"
  start-longitude="8.25613" start-latitude="46.97915"
  start-altitude-m="2750" start-heading-deg="118"
></arcgis-plane-navigation>
```

Longitude and latitude must be paired. Omitted values use the loaded view
center, host camera heading, or sampled ground as appropriate.

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
  sensitivity="1.1" invert-pitch-disabled keyboard-disabled>
</arcgis-plane-navigation>
```

Programmatic clients can drive normalized controls on an active session:

```ts
flight.setControlPatch({ pitch: 0.25, bank: -0.4, accelerate: 1 });
flight.clearControlPatch(["pitch", "bank", "accelerate"]);
```

## Add the optional flight overlay

```html
<arcgis-plane-navigation reference-element="scene"
  show-controls show-speed ui-position="bottom-end"
  ui-controls="power pause camera recover" locale="auto">
</arcgis-plane-navigation>
```

The overlay is component-owned and is removed during teardown. A host can also
set `ui.enabled`, `ui.showSpeed`, `ui.position`, and `ui.controls` through the
typed `config` property.

## Delay automatic flight

Use `auto-start-disabled`, then start after the ready event:

```ts
flight.addEventListener("arcgisPlaneNavigationReady", async () => {
  if (flight.status === "ready") await flight.start();
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

This restarts the flight. The host still owns the elevation source and its
visible detail. To disable flight ground checks, set `terrain.enabled` to
`false`; set an explicit `start.altitudeM` too if you want to skip the initial
ground query. See [Terrain settings](configuration.md#terrain) for limits.

## Use your own aircraft

```ts
flight.updateConfig({
  assets: { bodyUrl: "/models/aircraft.glb", propellerUrl: null, boostUrl: null },
});
```

The body is required; `null` removes the optional parts. Asset changes restart
the session. Follow [Custom aircraft](custom-aircraft.md) for scale, orientation,
part placement, and changes to the flight model.

## Change power mode

```ts
flight.setPowerMode("slow");
flight.setPowerMode("normal");
flight.setPowerMode("turbo");
```

## Know whether a change is live

Camera, input, power, and optional UI settings apply live. Aircraft URLs, start
pose, terrain settings, navigation capture, camera submission rate, and
automatic start restart the session. The caller-owned scene and map are never
destroyed.

See [Configuration](configuration.md) for every field, range, attribute, and
normalization rule, and [API reference](api-reference.md) for methods and events.