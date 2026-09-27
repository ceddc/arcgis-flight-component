# SDK versions

The component works with ArcGIS Maps SDK for JavaScript 4.30 to 5.1. It does
not include the SDK: your app loads it, and the component uses the same copy.

## Choose an import

| Your app uses | Import |
| --- | --- |
| SDK 5.1 with a bundler | `@ceddc/arcgis-flight-component` |
| SDK 4.32 to 5.0 with a bundler | `@ceddc/arcgis-flight-component/sdk-4.32` |
| SDK 4.30 or 4.31 with a bundler | `@ceddc/arcgis-flight-component/sdk-4.30` |
| The ArcGIS AMD loader (`require([...])`) | `arcgis-flight-component.amd.js` |
| No bundler, plain HTML | The standalone browser build, which includes the SDK |

Each SDK version range has its own build because the SDK added and removed
modules along the way. The wrong build shows up as a bundler error about
`projectOperator`, `projection`, or `meshUtils`.

`@arcgis/map-components` is only needed if you use `<arcgis-scene>`.

## With a bundler

```bash
npm install github:ceddc/arcgis-flight-component
```

```js
// SDK 4.32 to 5.0
import "@ceddc/arcgis-flight-component/sdk-4.32";

const flight = document.createElement("arcgis-plane-navigation");
flight.view = view;
document.body.append(flight);
```

Installing from GitHub builds the component automatically.

## With the AMD loader

Build the files, then copy `dist/component/arcgis-flight-component.amd.js`
into your app:

```bash
npm run build:component
```

Load it with the same `require` you use for ArcGIS modules. It gets its
`esri/*` modules from your loader. Then create the element and assign your view
as above.

## Without a bundler

The standalone build includes SDK 5.1.24 and `<arcgis-scene>`. Build the site
and host the whole `dist/pages/` folder:

```bash
npm run build:pages
```

Then add the stylesheet and script to your page:

```html
<link rel="stylesheet" href="./browser/arcgis-flight-component.css" />
<script type="module" src="./browser/arcgis-flight-component.js"></script>

<arcgis-scene id="scene" basemap="satellite" ground="world-elevation"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene"></arcgis-plane-navigation>
```

Keep the `browser/`, `component/`, and `assets/` folders together; the script
loads files from all three.

> [!WARNING]
> Do not add the standalone build to a page that already loads the ArcGIS SDK.
> The page would run two copies of the SDK. Use one of the imports above instead.
