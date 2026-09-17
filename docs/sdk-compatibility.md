# SDK integration

The component supports ArcGIS Maps SDK for JavaScript 4.30 through 5.1.
Component-only builds use the SDK already loaded by the host. ArcGIS Map
Components is needed only when the host uses `<arcgis-scene>`.

## Choose a loading option

| Host | Import or file |
| --- | --- |
| Bundler with SDK 5.1 | `@ceddc/arcgis-flight-component` |
| Bundler with SDK 4.30-4.31 | `@ceddc/arcgis-flight-component/sdk-4.30` |
| Bundler with SDK 4.32-5.0 | `@ceddc/arcgis-flight-component/sdk-4.32` |
| Existing ArcGIS AMD loader | Universal `arcgis-flight-component.amd.js` |
| Standalone HTML | Full browser build and stylesheet from a self-hosted `dist/pages/` |

## Existing application with a bundler

```bash
npm install git+https://github.com/ceddc/arcgis-flight-component.git
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
The host supplies ArcGIS and any stylesheet required by its SDK version.
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

```html
<link rel="stylesheet" href="./browser/arcgis-flight-component.css" />
<script type="module" src="./browser/arcgis-flight-component.js"></script>
<style>html, body, arcgis-scene { width: 100%; height: 100%; margin: 0; } arcgis-scene { display: block; }</style>
<arcgis-scene id="scene" item-id="YOUR_PUBLIC_WEBSCENE_ITEM_ID"></arcgis-scene>
<arcgis-plane-navigation reference-element="scene"></arcgis-plane-navigation>
```

## Scene ownership

The host owns the scene, map, view, authentication, layers, and surrounding UI.
The flight component adds and removes only its aircraft layer, graphics,
listeners, animation state, and optional controls. Teardown restores borrowed
camera and navigation state when appropriate and leaves the host view and map
available.

See [Getting started](getting-started.md) for start positions and lifecycle,
and [Configuration](configuration.md) for the typed API.
