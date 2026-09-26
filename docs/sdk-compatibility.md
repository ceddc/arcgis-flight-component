# SDK integration

Use the component with ArcGIS Maps SDK for JavaScript 4.30 through 5.1.
Choose the import below to match the SDK your app already uses. You only
need ArcGIS Map Components if your app uses `<arcgis-scene>`.

## Choose a loading option

| Host | Import or file |
| --- | --- |
| Bundler with SDK 5.1 | `@ceddc/arcgis-flight-component` |
| Bundler with SDK 4.30-4.31 | `@ceddc/arcgis-flight-component/sdk-4.30` |
| Bundler with SDK 4.32-5.0 | `@ceddc/arcgis-flight-component/sdk-4.32` |
| Existing ArcGIS AMD loader | Universal `arcgis-flight-component.amd.js` |
| Standalone HTML | Full browser build and stylesheet from a self-hosted `dist/pages/` |

## Existing application with a bundler

Install from GitHub:

```bash
npm install github:ceddc/arcgis-flight-component
```

```ts
import "@ceddc/arcgis-flight-component";

const flight = document.createElement("arcgis-plane-navigation");
flight.view = existingSceneView;
document.body.append(flight);
```

The view must be a 3D `SceneView` with a visible HTML container. A 2D
`MapView` is rejected. Remove the element before destroying the view; assign a
replacement to `flight.view` when the active view changes.

For a local compiled file, run `npm run build:component` and copy the matching
file from `dist/component/`. Each generated ESM or AMD file embeds the
component code, aircraft assets, and controls styles, but excludes ArcGIS.
Your app supplies ArcGIS and any stylesheet its SDK version needs.
Family ESM files use package imports and need a bundler or a suitable import
map; they cannot be loaded by a bare browser script tag alone.

## Existing AMD host

Load the universal AMD file through the existing ArcGIS loader. It resolves
`esri/*` modules from that host. Create the element and assign its existing
3D view as in the bundler example.

## Standalone HTML page

Run `npm run build:pages`, then serve the complete `dist/pages/` directory over
HTTP or HTTPS. The `browser/` entry includes SDK 5.1.24, registers
`arcgis-scene`, and needs its companion stylesheet. Keep `browser/`,
`component/`, and `assets/` in their generated locations; copying one entry
file is insufficient.

Your HTML only needs the stylesheet and module below. The module loads its
dependencies automatically; the generated demo preload links are not part of
the setup you need to copy.

```html
<link rel="stylesheet" href="./browser/arcgis-flight-component.css" />
<script type="module" src="./browser/arcgis-flight-component.js"></script>
<style>html, body, arcgis-scene { width: 100%; height: 100%; margin: 0; } arcgis-scene { display: block; }</style>
<arcgis-scene id="scene" item-id="YOUR_PUBLIC_WEBSCENE_ITEM_ID"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene"></arcgis-plane-navigation>
```

## Scene ownership

Your app keeps its scene, map, view, sign-in, data layers, and surrounding UI.
The flight component cleans up only the aircraft layer, graphics, listeners,
animation state, and optional controls it adds. When flight ends, it restores
the previous camera and navigation settings when appropriate. Your view and
map remain available.

See [Getting started](getting-started.md) for start positions and lifecycle,
and [Configuration](configuration.md) for the typed API.
