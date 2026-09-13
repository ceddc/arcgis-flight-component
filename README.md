# ArcGIS Flight Component

Add a flyable aircraft to your ArcGIS 3D scene. The component handles keyboard
and gamepad input, ground clearance, and chase or cockpit cameras.

## Quick start

Install the component and the ArcGIS packages used by an `<arcgis-scene>` host:

```bash
npm install github:ceddc/arcgis-flight-component @arcgis/core @arcgis/map-components
```

In your browser entry point:

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

The component waits for the 3D view, loads its aircraft, and starts
automatically. The scene must use global Web Mercator or a metre-based local
projected spatial reference. For an existing `SceneView`, see
[Getting started](docs/getting-started.md#add-the-component-to-an-existing-application).

![Basic flight demo with the classic plane over the Grand Canyon](docs/images/sample-no-ui.jpg)

## Examples

From a clone of this repository, run `npm install` and `npm run dev`.
Open `http://127.0.0.1:3116/`, or try the hosted demos:

- [Basic flight demo](https://ceddc.github.io/arcgis-flight-component/demos/simple/) - minimal scene with no component controls.
- [Flight controls demo](https://ceddc.github.io/arcgis-flight-component/demos/simple-controls/) - host-owned blue Calcite toolbar.
- [Scene explorer demo](https://ceddc.github.io/arcgis-flight-component/demos/webscene-selector/) - scene selection, address search, and public WebScene loading.

See [Samples](docs/demo.md) for local paths and source links.

Not all 3D datasets can load fast enough at high flight speeds. If scene detail
lags behind, reduce the flight speed.

## Control and clean up

```ts
const flight = document.querySelector("arcgis-plane-navigation")!;
await flight.start();
flight.pause();
flight.setCameraMode("cockpit");
flight.setPowerMode("turbo");
flight.stop();
```

Remove the element from the host teardown path. Cleanup removes only the
component's aircraft layer, graphics, listeners, and animation state, and
restores borrowed camera and navigation state when appropriate. It does not
destroy the host view, map, or WebScene.

Keyboard input works while the scene is focused: W/S or Up/Down pitch, A/D or
Left/Right bank, Q/E yaw, Shift accelerates, Space brakes, Escape pauses or
resumes, and Alt+R recovers. Standard-mapped gamepads are supported.

## More

- [Getting started](docs/getting-started.md) - lifecycle and integration.
- [Flight concepts](docs/flight-concepts.md) - plane behavior, defaults, camera, and terrain.
- [Custom aircraft](docs/custom-aircraft.md) - use your own model or change its handling.
- [Configuration recipes](docs/configuration-recipes.md) - start pose, camera, input, controls, terrain, and assets.
- [Configuration reference](docs/configuration.md) and [API reference](docs/api-reference.md) - complete typed API.
- [SDK integration](docs/sdk-compatibility.md) - supported SDK families, AMD, and self-hosted standalone builds.
- [Troubleshooting](docs/troubleshooting.md) and [Architecture](docs/architecture.md).

## Requirements and license

Node.js 20+ for local development, ArcGIS Maps SDK for JavaScript 4.30 through
5.1, and a browser with WebGL. The default import targets SDK 5.1; use a
matching subpath for older supported SDKs. Source and bundled aircraft assets
use the [MIT License](LICENSE); ArcGIS services and data retain their own terms.
