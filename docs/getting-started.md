# Getting started

`<arcgis-plane-navigation>` connects a caller-owned ArcGIS `SceneView` or
`<arcgis-scene>` to aircraft rendering, flight input, terrain handling, and a
chase or cockpit camera.

## Prerequisites

- Node.js 20+ for a bundled application.
- ArcGIS Maps SDK for JavaScript 4.30 through 5.1; the default import targets
  5.1. See [SDK integration](sdk-compatibility.md) for older SDK families.
- A browser with WebGL and network access to the scene services you use.

## Add the component to an existing application

Install the component, then import it with your current SDK:

```bash
npm install github:ceddc/arcgis-flight-component
```

```ts
import "@ceddc/arcgis-flight-component";

const flight = document.createElement("arcgis-plane-navigation");
flight.view = existingSceneView;
flight.config = { autoStart: false };
document.body.append(flight);
await flight.start();
```

The view must be a 3D `SceneView` with an HTML container. Input uses that
container and optional controls use `view.ui`.

### Applications using an older SDK

Use the matching `sdk-4.30` or `sdk-4.32` package subpath described in the
[SDK integration guide](sdk-compatibility.md). An existing `SceneView` does
not require ArcGIS Map Components.

## Load a compiled component file

From a repository checkout, run `npm ci` and `npm run build:component`.
Choose the matching file from `dist/component/`. These files keep ArcGIS
external and include the aircraft assets and controls styles. Use the universal AMD file in
an existing ArcGIS AMD host; use a family ESM file with a bundler. See
[SDK integration](sdk-compatibility.md).

## Use an arcgis-scene element

For a new SDK 5.1 host, install matching packages:

```bash
npm install github:ceddc/arcgis-flight-component @arcgis/core@~5.1.24 @arcgis/map-components@~5.1.24
```

For an existing application, keep its SDK version and select the matching
component entry from [SDK integration](sdk-compatibility.md). Register both
custom elements, size the scene, and connect by ID:

```ts
import "@arcgis/map-components/components/arcgis-scene";
import "@ceddc/arcgis-flight-component";
```

```html
<style>
  html, body, arcgis-scene { width: 100%; height: 100%; margin: 0; }
  arcgis-scene { display: block; }
</style>
<arcgis-scene id="scene" item-id="YOUR_PUBLIC_WEBSCENE_ITEM_ID"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene"></arcgis-plane-navigation>
```

The element waits for `viewOnReady()`, adds its private aircraft layer, and
starts automatically. The host owns the WebScene and its layers.

## How to use ArcGIS Enterprise

Load your Enterprise WebScene in the host application, then connect the flight
component to its view. Set the portal URL on the WebScene's portal item:

```ts
import WebScene from "@arcgis/core/WebScene.js";
import "@ceddc/arcgis-flight-component";

const webScene = new WebScene({
  portalItem: {
    id: "YOUR_WEBSCENE_ITEM_ID",
    portal: { url: "https://your-organization.example.com/portal" },
  },
});
await webScene.load();
existingSceneView.map = webScene;

const flight = document.createElement("arcgis-plane-navigation");
flight.view = existingSceneView;
document.body.append(flight);
```

Use a view with a [supported coordinate system](troubleshooting.md#supported-scene-coordinate-systems).
For secured content, configure ArcGIS authentication in your host application
before loading the scene. The component uses the host's authenticated SDK;
it does not manage sign-in. Services must allow your application's origin
through CORS.

You can also build the host map directly from service URLs with `SceneLayer`,
`TileLayer`, and `ElevationLayer`. Try the [SITG demo](../demos/enterprise/)
at `http://127.0.0.1:3116/demos/enterprise/` after running `npm run dev`.
Its [source](../demos/enterprise/main.ts) shows this approach with public
Enterprise imagery and terrain, plus SITG buildings hosted on ArcGIS Online.

## Choose the start pose

```html
<arcgis-plane-navigation
  reference-element="scene"
  start-longitude="8.25613"
  start-latitude="46.97915"
  start-altitude-m="2750"
  start-heading-deg="118"
  start-speed-mps="100"
></arcgis-plane-navigation>
```

Longitude and latitude must be paired. Without a position, the loaded view
center is used; without altitude, the component samples the host ground.

## Configure and control it

```ts
flight.config = {
  camera: { mode: "cockpit", fovDeg: 62 },
  controls: { sensitivity: 1.1 },
  terrain: { minimumClearanceM: 5, maximumAglM: 3500 },
};

flight.setPowerMode("turbo");
flight.setControlPatch({ pitch: 0.25, bank: -0.4 });
flight.clearControlPatch(["pitch", "bank"]);
```

Use [configuration recipes](configuration-recipes.md) for copyable options and
[configuration reference](configuration.md) for every field and range.

## Listen for readiness and errors

```ts
flight.addEventListener("arcgisPlaneNavigationReady", () => {
  console.log("Flight is ready", flight.snapshot());
});
flight.addEventListener("arcgisPlaneNavigationError", (event) => {
  console.error(event.detail.error);
});
```

The element also emits snapshot and stopped events. See the [API reference](api-reference.md).

## Stop and clean up

Remove the element from the host teardown path, or call `flight.stop()` when
flight ends. Cleanup removes only the component's aircraft layer, graphics,
listeners, and animation state, and restores borrowed camera and navigation
state when appropriate. The host view, map, WebScene, and layers remain alive.

## Use custom aircraft models

See [Custom aircraft](custom-aircraft.md) for model scale, orientation, optional parts, and source changes. [Flight concepts](flight-concepts.md) explains the default handling and terrain behavior.

```ts
flight.config = {
  assets: {
    bodyUrl: "/models/aircraft.glb",
    propellerUrl: "/models/aircraft-propeller.glb",
    boostUrl: null,
  },
};
```

The body URL is required; propeller and boost are optional. Cross-origin assets
need suitable CORS headers. Changing assets restarts the component session.

## Next steps

- [Configuration recipes](configuration-recipes.md)
- [Configuration reference](configuration.md)
- [API reference](api-reference.md)
- [Samples](demo.md)
- [Troubleshooting](troubleshooting.md)
