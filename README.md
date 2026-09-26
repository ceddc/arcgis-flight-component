# ArcGIS Flight Component

An open-source web component that integrates with the
[ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/latest/)
to add flight controls and a camera-following aircraft to 3D scenes.

Made with assistance from ChatGPT and Claude. This is a for-fun project I work
on in my free time to learn about AI agent-assisted development. It is not an
official Esri project. It works, though it could be better. If you spot
something to improve, please open an issue.

A small open-source project for flying around ArcGIS 3D scenes. Pick a place,
steer with a keyboard or gamepad, and see the map from a different angle.

On mobile, a joystick appears at the bottom left. Drag the scene to look
around the plane, then release to return to the normal chase view.

The flight component plugs into your existing `SceneView` or `<arcgis-scene>`.
Your application loads the map and data; the component adds the aircraft,
controls, and camera. It works with scenes and services from ArcGIS Online
and ArcGIS Enterprise, and you can bring your own aircraft model.

Still a work in progress, so the API may change before a stable release.

Use the [component in your app](#add-it-to-your-application), or
[take the source](#make-it-your-own) and change it for your own ideas.

[Documentation](https://ceddc.github.io/arcgis-flight-component/) | [Getting started](https://ceddc.github.io/arcgis-flight-component/getting-started.html)

![Flight over the Grand Canyon](docs/images/sample-no-ui.jpg)

## Demos

| Demo | What it shows |
| --- | --- |
| [Basic flight](https://ceddc.github.io/arcgis-flight-component/demos/simple/) | A minimal scene with a flyable aircraft. |
| [Flight controls](https://ceddc.github.io/arcgis-flight-component/demos/simple-controls/) | Fly over Geneva with SITG imagery, terrain, and 3D buildings while using speed, pause, camera, and recovery controls. |
| [Scene explorer](https://ceddc.github.io/arcgis-flight-component/demos/webscene-selector/) | Choose a place, search an address, or load a public WebScene. |
| [Other aircraft](https://ceddc.github.io/arcgis-flight-component/demos/aircraft/) | Four aircraft, Esri 3D Buildings, weather and time, camera controls, and picture capture. |
| [Zurich local scene](https://ceddc.github.io/arcgis-flight-component/demos/zurich/) | A local Swiss LV95 WebScene (EPSG:2056) with 3D buildings. |

Start with Basic flight for a quick trip toward the Matterhorn, or open Scene
explorer to choose somewhere else. If the scenery is struggling to keep up,
slow down and give the 3D data time to load.

## Add it to your application

To add flight to a bundled ArcGIS app using SDK 5.1, install from GitHub:

```bash
npm install github:ceddc/arcgis-flight-component @arcgis/core@~5.1.24 @arcgis/map-components@~5.1.24
```

Import the components in your browser entry point:

```ts
import "@arcgis/map-components/components/arcgis-scene";
import "@ceddc/arcgis-flight-component";
```

Add a scene and the flight component:

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

## Make it your own

Clone the repository to run the demos locally and change whatever you need:

```bash
git clone https://github.com/ceddc/arcgis-flight-component.git
cd arcgis-flight-component
npm ci
npm run dev
```

Open [the local site](http://127.0.0.1:3116/) and choose a demo from the menu.
If that port is busy, use the address printed by Vite.

Start with a demo in `demos/`, or adapt the flight code in `src/` for your own
project. [Development](https://ceddc.github.io/arcgis-flight-component/development.html)
maps out the code and checks. To swap the model or change its handling, see
[Custom aircraft](https://ceddc.github.io/arcgis-flight-component/custom-aircraft.html).

## ArcGIS Enterprise

Load your Enterprise WebScene or service layers in your application,
then connect the flight component to the view. See [How to use ArcGIS Enterprise](https://ceddc.github.io/arcgis-flight-component/getting-started.html#how-to-use-arcgis-enterprise)
for a short setup example and authentication guidance. The
[Flight controls source](demos/simple-controls/main.ts) shows direct connections
to SITG imagery, terrain, and building services.

## Documentation

- [Common changes](https://ceddc.github.io/arcgis-flight-component/configuration-recipes.html) - start position, camera, controls, and terrain.
- [Custom aircraft](https://ceddc.github.io/arcgis-flight-component/custom-aircraft.html) - models, speeds, and handling.
- [API reference](https://ceddc.github.io/arcgis-flight-component/api-reference.html) - methods, events, and flight state.
- [SDK integration](https://ceddc.github.io/arcgis-flight-component/sdk-compatibility.html) - supported versions and loading options.
- [Troubleshooting](https://ceddc.github.io/arcgis-flight-component/troubleshooting.html) - setup and rendering issues.

## Requirements

Node.js 20+ for development, ArcGIS Maps SDK for JavaScript 4.30 through 5.1,
and a browser with WebGL. The default import targets SDK 5.1; older supported
SDKs use a matching package subpath. Scenes may use Web Mercator in global or
local mode, or another local projected coordinate system with linear units
(including metres, feet, and US survey feet).
See [local scene setup](https://ceddc.github.io/arcgis-flight-component/getting-started.html#local-scenes-in-feet).

## Attribution

This project uses the [ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/latest/)
and the [Calcite Design System](https://developers.arcgis.com/calcite-design-system/),
both from [Esri](https://www.esri.com/).

## License

Source code and bundled aircraft assets use the [MIT License](LICENSE).
You can use, modify, and share them; keep the copyright and license notice
with copies or substantial portions of the code and assets you reuse.
ArcGIS services and geographic data retain their own terms.
