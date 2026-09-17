# ArcGIS Flight Component

> **Work in progress:** This project is still under development and may temporarily be made private again.

Add a flyable aircraft to an ArcGIS 3D scene with a reusable web component.
Explore with keyboard or gamepad controls, switch between chase and cockpit
cameras, and use your own aircraft model. Your application supplies the scene
and its data; the component handles flight.

Works with an existing `SceneView` or `<arcgis-scene>`, including scenes and
services from ArcGIS Online and ArcGIS Enterprise.

[Documentation](https://ceddc.github.io/arcgis-flight-component/) | [Getting started](https://ceddc.github.io/arcgis-flight-component/getting-started.html)

![Flight over the Grand Canyon](docs/images/sample-no-ui.jpg)

## Try it

| Demo | What it shows |
| --- | --- |
| [Basic flight](https://ceddc.github.io/arcgis-flight-component/demos/simple/) | A minimal scene with a flyable aircraft. |
| [Flight controls](https://ceddc.github.io/arcgis-flight-component/demos/simple-controls/) | A toolbar for speed, pause, camera, and recovery. |
| [Scene explorer](https://ceddc.github.io/arcgis-flight-component/demos/webscene-selector/) | Choose a place, search an address, or load a public WebScene. |
| [SITG Geneva](demos/enterprise/) | Enterprise imagery and terrain with SITG 3D buildings from ArcGIS Online. Run locally below. |

To run the demos from a clone of this repository:

```bash
npm ci
npm run dev
```

Open [the local site](http://127.0.0.1:3116/) or go straight to the
[SITG Geneva demo](http://127.0.0.1:3116/demos/enterprise/).

## Add it to your application

For a bundled application using ArcGIS SDK 5.1:

```bash
npm install github:ceddc/arcgis-flight-component @arcgis/core@~5.1.24 @arcgis/map-components@~5.1.24
```

Import the components in your browser entry point:

```ts
import "@arcgis/map-components/components/arcgis-scene";
import "@ceddc/arcgis-flight-component";
```

Add a scene and connect the flight component to its ID:

```html
<style>
  html, body, arcgis-scene { width: 100%; height: 100%; margin: 0; }
  arcgis-scene { display: block; }
</style>
<arcgis-scene id="scene" item-id="YOUR_PUBLIC_WEBSCENE_ITEM_ID"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene"></arcgis-plane-navigation>
```

Flight starts when the scene is ready. For an existing `SceneView`, custom
settings, and cleanup, follow [Getting started](https://ceddc.github.io/arcgis-flight-component/getting-started.html).

## ArcGIS Enterprise

Load your Enterprise WebScene or service layers in the host application, then
attach the flight component. See [How to use ArcGIS Enterprise](docs/getting-started.md#how-to-use-arcgis-enterprise)
for a short setup example and authentication guidance. The
[SITG demo source](demos/enterprise/main.ts) shows direct service connections.

## Documentation

- [Configuration recipes](https://ceddc.github.io/arcgis-flight-component/configuration-recipes.html) - start position, camera, controls, and terrain.
- [Custom aircraft](https://ceddc.github.io/arcgis-flight-component/custom-aircraft.html) - bring your own model.
- [API reference](https://ceddc.github.io/arcgis-flight-component/api-reference.html) - methods, events, and flight state.
- [SDK integration](https://ceddc.github.io/arcgis-flight-component/sdk-compatibility.html) - supported versions and loading options.
- [Troubleshooting](https://ceddc.github.io/arcgis-flight-component/troubleshooting.html) - setup and rendering issues.

## Requirements

Node.js 20+ for development, ArcGIS Maps SDK for JavaScript 4.30 through 5.1,
and a browser with WebGL. The default import targets SDK 5.1; older supported
SDKs use a matching package subpath. Scenes must use global Web Mercator or
a metre-based local projected coordinate system.

## License

Source code and bundled aircraft assets use the [MIT License](LICENSE).
ArcGIS services and geographic data retain their own terms.
