# Configure the flight

Short recipes for common changes. Each one works with the page from
[Get started](getting-started.md). In the JavaScript examples, `flight` is the
`<arcgis-plane-navigation>` element:

```js
const flight = document.querySelector("arcgis-plane-navigation");
```

Most options exist both as an HTML attribute and as a field of the `config`
property. The [API reference](api-reference.md) lists them all.

## Set the start position

```html
<arcgis-plane-navigation reference-element="scene"
  start-longitude="8.256" start-latitude="46.979"
  start-altitude-m="2750" start-heading-deg="118" start-speed-mps="60">
</arcgis-plane-navigation>
```

Or in JavaScript, before the flight starts:

```js
flight.config = {
  start: { longitude: 8.256, latitude: 46.979, altitudeM: 2750, headingDeg: 118, speedMps: 60 },
};
```

Leave out any value to use its default: the view center, 300 m above the
ground, the camera's heading, and the aircraft's cruise speed.

## Change the camera

Start in the cockpit, narrow the field of view, and keep the horizon level in
turns:

```html
<arcgis-plane-navigation reference-element="scene"
  camera-mode="cockpit" fov-deg="60" camera-roll-disabled>
</arcgis-plane-navigation>
```

Camera changes apply immediately, even during a flight:

```js
flight.setCameraMode("chase");
flight.updateConfig({ camera: { fovDeg: 70, bankedViewport: true } });
```

## Adjust the controls

```html
<arcgis-plane-navigation reference-element="scene"
  sensitivity="1.2" invert-pitch-disabled gamepad-disabled>
</arcgis-plane-navigation>
```

`sensitivity` goes from `0.5` to `2` (default `0.8`). `invert-pitch-disabled`
makes W and ↑ raise the nose. `keyboard-disabled` and `gamepad-disabled` turn
off an input.

## Show the toolbar

The component has a small built-in toolbar with speed, power, pause, camera,
and recover buttons. It is hidden by default.

```html
<arcgis-plane-navigation reference-element="scene"
  show-controls show-speed ui-position="bottom-end" ui-controls="power pause">
</arcgis-plane-navigation>
```

`ui-controls` picks the buttons and their order: `power`, `pause`, `camera`,
`recover`. `locale` sets the language: `en`, `de`, `fr`, `it`, or `es`. By
default the toolbar follows the page language.

## Move or hide the touch joystick

The joystick appears on touch screens only. You can move it, always show it,
or hide it and build your own:

```html
<arcgis-plane-navigation reference-element="scene"
  joystick="always" joystick-position="bottom-right">
</arcgis-plane-navigation>
```

`joystick` accepts `auto` (default), `always`, or `never`.

## Change speed

Switch between the three power modes. `slow` brakes, `normal` cruises, and
`turbo` speeds up to the top speed:

```js
flight.setPowerMode("turbo");
```

To change the speed limits themselves, use a
[flight profile](custom-aircraft.md#change-speed-and-handling).

## Keep the plane above the ground

The component samples the scene's elevation and pushes the plane up when it
gets too close to the ground. It also caps the height above the ground.

```js
flight.updateConfig({
  terrain: { minimumClearanceM: 20, maximumAglM: 3000 },
});
```

These checks use the ground surface only. Buildings, trees, and bridges are
not obstacles. Set `terrain.enabled` to `false` to turn the checks off.

## Start flying on demand

By default, the flight starts as soon as the scene is ready. Add
`auto-start-disabled` to wait, then call `start()`:

```html
<arcgis-plane-navigation reference-element="scene" auto-start-disabled>
</arcgis-plane-navigation>
<button id="fly">Take off</button>
```

```js
document.querySelector("#fly").addEventListener("click", () => flight.start());
```

## Show flight data in your own UI

Listen to `arcgisPlaneNavigationSnapshot`. It fires on every state change and
up to 20 times a second during flight.

```js
flight.addEventListener("arcgisPlaneNavigationSnapshot", (event) => {
  const { vehicle, aglM, phase } = event.detail.snapshot;
  const speedKmh = Math.round(vehicle.speed * 3.6);
  const height = aglM === null ? "?" : Math.round(aglM);
  label.textContent = `${phase}: ${speedKmh} km/h, ${height} m above ground`;
});
```

To read the state once, call `flight.snapshot()`.

## Drive the plane from code

`setControlPatch()` overrides the keyboard and gamepad. Use it for an
autopilot, your own buttons, or a scripted tour:

```js
// Gentle right turn with full throttle
flight.setControlPatch({ bank: 0.4, accelerate: 1 });

// Give control back to the user
flight.clearControlPatch();
```

`pitch`, `bank`, and `yaw` go from `-1` to `1`. `accelerate` and `brake` go
from `0` to `1`.

## Handle errors

The component fires `arcgisPlaneNavigationError` if it cannot start, for
example when a model URL is wrong or the scene has no elevation data:

```js
flight.addEventListener("arcgisPlaneNavigationError", (event) => {
  console.error("Flight could not start:", event.detail.error);
});
```

## Which changes restart the flight

Changing the start position, the terrain settings, the aircraft, or
`autoStart` restarts the flight from its start position. Most other changes,
such as camera, controls, toolbar, and power, apply immediately. The scene
itself is never reloaded. The [API reference](api-reference.md#live-updates)
has the full list.

To change the aircraft without a restart, use
[`setAircraft()`](custom-aircraft.md#swap-the-aircraft-during-a-flight).
