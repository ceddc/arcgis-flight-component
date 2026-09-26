# Getting started

On a phone or tablet, the flight joystick appears at the bottom left
automatically. Drag it to steer. Drag elsewhere in the scene to look around
in chase view; release to return behind the plane.

Start with a 3D scene, add the flight component, and take it for a spin. Your
application loads the map and data; the component adds an aircraft, flight
controls, and a camera that follows along.

You can also try one of the [demos](demo.md) before setting anything up.
To clone the source and adapt it for your own project, see
[Development](development.md#local-setup).

## Prerequisites

- Node.js 20+ for development.
- ArcGIS Maps SDK for JavaScript 4.30 through 5.1.
- A browser with WebGL and access to your scene's services.

The examples below use SDK 5.1. For an older SDK or a plain HTML page, choose
the matching option in [SDK integration](sdk-compatibility.md#choose-a-loading-option).

## Add the component to an existing application

If you already have a `SceneView`, this is all you need to connect it:

```bash
npm install github:ceddc/arcgis-flight-component
```

```ts
import "@ceddc/arcgis-flight-component";

const flight = document.createElement("arcgis-plane-navigation");
flight.view = existingSceneView;
document.body.append(flight);
```

Flight starts when the view is ready. Click the scene to steer with the keyboard.
The view needs a visible HTML container. A 2D `MapView` is not supported.

## Use an arcgis-scene element

For an application using ArcGIS Map Components, install matching packages:

```bash
npm install github:ceddc/arcgis-flight-component @arcgis/core@~5.1.24 @arcgis/map-components@~5.1.24
```

Import both components in your browser entry point:

```ts
import "@arcgis/map-components/components/arcgis-scene";
import "@ceddc/arcgis-flight-component";
```

Then connect them by ID. Replace the item ID with your public WebScene's ID:

```html
<style>
  html, body, arcgis-scene { width: 100%; height: 100%; margin: 0; }
  arcgis-scene { display: block; }
</style>
<arcgis-scene id="scene" item-id="YOUR_PUBLIC_WEBSCENE_ITEM_ID"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene" show-controls show-speed></arcgis-plane-navigation>
```

This example includes an on-screen toolbar. Leave out `show-controls` and
`show-speed` to remove the toolbar. The touch joystick still appears automatically;
[change its position or visibility](configuration.md#optional-ui) if needed.

## Choose the start pose

Set a position before adding the element to the page:

```ts
flight.config = {
  start: {
    longitude: 8.25613,
    latitude: 46.97915,
    altitudeM: 2750,
    headingDeg: 118,
  },
};
```

Give longitude and latitude together. Altitude is in metres, and heading is
in degrees, with 0 pointing north. Leave the position out to start at the
view center, 300 m above the sampled ground.

## How to use ArcGIS Enterprise

Load your Enterprise WebScene, then connect the component to its view:

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

For private content, set up ArcGIS sign-in in your application before loading
the scene. The flight component uses the same sign-in. Your services must allow
requests from your application's domain through CORS.

You can also load layers directly from service URLs. The
[Flight controls demo](../demos/simple-controls/) connects directly to SITG's
public Geneva imagery, terrain, and 3D building services. Its
[source](../demos/simple-controls/main.ts) shows the service connections.

## Local scenes in feet

Use Web Mercator in global or local mode, or another local projected view with
linear units such as metres, feet, or US survey feet. Geographic local scenes
are unsupported.

For a local view, set its coordinate system when you create it:

```ts
import SceneView from "@arcgis/core/views/SceneView.js";

const view = new SceneView({
  container: "scene",
  map,
  viewingMode: "local",
  spatialReference: { wkid: 2263 }, // New York Long Island, US survey feet
});
flight.config = { start: { altitudeM: 540 } };
flight.view = view;
```

Your layers must support that coordinate system. Keep flight distances in
metres and speeds in metres per second; the component converts them for the view.
The [Zurich local scene demo](../demos/zurich/) uses a ready-made WebScene in
Swiss LV95 (EPSG:2056), whose units are metres.

## Stop and clean up

Remove the element when leaving the page or destroying its view:

```ts
flight.remove();
```

Removing the element cleans up the aircraft and its controls and restores
the previous camera when appropriate. Your map, view, and data layers are
still yours to use.

## Next steps

- [Common changes](configuration-recipes.md): camera, speed, controls, and ground clearance.
- [Custom aircraft](custom-aircraft.md): use another model or change its handling.
- [Other aircraft](../demos/aircraft/): four aircraft, Esri 3D Buildings, weather and time, camera controls, and picture capture.
- [Troubleshooting](troubleshooting.md): help when something does not work.
- [API reference](api-reference.md): methods, events, and flight state.
