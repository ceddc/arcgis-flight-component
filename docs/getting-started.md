# Get started

This guide builds a page with a 3D scene and a plane you can fly. It then
shows how to set a start position, use your own `SceneView`, and remove the
component.

## Before you start

You need:

- Node.js 20 or later and a bundler, such as [Vite](https://vite.dev/).
- A browser with WebGL.

The steps use ArcGIS Maps SDK for JavaScript 5.1. For SDK 4.30 to 5.0, or a
page without a bundler, see [SDK versions](sdk-compatibility.md).

## 1. Install

```bash
npm install github:ceddc/arcgis-flight-component @arcgis/core@~5.1.24 @arcgis/map-components@~5.1.24
```

The component installs from GitHub. It is not published on npm.

## 2. Add a scene and the component

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fly over the Alps</title>
    <style>
      html, body { height: 100%; margin: 0; }
      arcgis-scene { display: block; height: 100%; }
    </style>
    <script type="module" src="./main.js"></script>
  </head>
  <body>
    <arcgis-scene id="scene" basemap="satellite" ground="world-elevation"
      camera-position="7.71, 46.01, 5600" camera-heading="235" camera-tilt="78">
    </arcgis-scene>
    <arcgis-plane-navigation reference-element="scene"></arcgis-plane-navigation>
  </body>
</html>
```

Create `main.js`:

```js
import "@arcgis/map-components/components/arcgis-scene";
import "@ceddc/arcgis-flight-component";
```

`reference-element` is the `id` of the scene to fly in. The plane appears and
starts flying as soon as the scene is ready.

## 3. Fly

Click the scene first, so it receives your key presses.

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Nose down / up | W / S or ↑ / ↓ | Left stick | Joystick |
| Turn left / right | A / D or ← / → | Left stick | Joystick |
| Rudder left / right | Q / E | LB / RB | |
| Accelerate | Shift | RT | |
| Brake | Space | LT | |
| Pause and resume | Esc | Menu | |
| Recover to a safe position | Alt + R | | |
| Slower / faster power mode | | D-pad down / up | |
| Look around the plane | Drag the scene | | Drag the scene |

Pitch works like a flight stick: push forward (W or ↑) to dive. To reverse it,
add `invert-pitch-disabled`. On phones and tablets, a joystick appears in the
bottom-left corner. Gamepads must use the browser's standard mapping.

## 4. Choose where to start

By default, the plane starts at the center of the view, 300 m above the
ground, and flies in the camera's direction. To pick the spot yourself, add
start attributes:

```html
<arcgis-plane-navigation reference-element="scene"
  start-longitude="7.71" start-latitude="46.01"
  start-altitude-m="5200" start-heading-deg="235">
</arcgis-plane-navigation>
```

Set longitude and latitude together. Altitude is an absolute elevation in
metres, not a height above the ground. Heading is in degrees clockwise from
north.

## 5. Use your own SceneView

If your app already creates a `SceneView`, skip `<arcgis-scene>` and assign the
view to the component's `view` property:

```js
import Map from "@arcgis/core/Map.js";
import SceneView from "@arcgis/core/views/SceneView.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import "@ceddc/arcgis-flight-component";

const view = new SceneView({
  container: "viewDiv",
  map: new Map({ basemap: "satellite", ground: "world-elevation" }),
});

const flight = document.createElement("arcgis-plane-navigation");
flight.config = {
  start: { longitude: 7.71, latitude: 46.01, altitudeM: 5200, headingDeg: 235 },
};
flight.view = view;
document.body.append(flight);
```

This setup does not need `@arcgis/map-components`. The view must be a 3D
`SceneView`; a 2D `MapView` does not work.

The same code works with a WebScene from ArcGIS Online or ArcGIS Enterprise.
Load it the usual way and sign in before loading private content. The component
uses your app's sign-in and never asks for credentials.

## 6. Remove the component

```js
flight.remove();
```

Removing the element stops the flight, removes the plane, and gives the camera
back to your app. Your scene, map, and layers stay as they are. To stop only
for a moment, use `flight.pause()` and `flight.resume()`.

## Next steps

- [Samples](samples.md): complete apps to copy from.
- [Configure the flight](configuration-recipes.md): camera, controls, toolbar, and more.
- [API reference](api-reference.md): every property, method, and event.
