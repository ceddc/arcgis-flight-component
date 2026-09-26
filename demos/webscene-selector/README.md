# Scene explorer demo

A small Calcite app for picking a place and flying around it. Try one of the
suggested destinations, search for an address, or search public ArcGIS Online
WebScenes (or paste an item ID). Flight starts near Mount Fuji with the place picker open; the
picker stays available when you change destinations. **Settings** adjusts
steering sensitivity, field of view, pitch direction, and camera roll.

Run `npm run dev`, then open
`http://127.0.0.1:3116/demos/webscene-selector/`.

The suggested places use imagery and elevation. Address search uses Esri
World Geocoder without storing queries or results. The WebScene tab searches
public WebScenes on ArcGIS Online and shows each match as a card with its
thumbnail, owner, update date, and a link to the item page. The picker checks
that the item is a public Web Scene, then loads it and applies the flight
component's rule: Web Mercator in either view mode, or a local scene with
projected linear coordinates. Flight starts from the scene's initial camera, a little
short of what it looks at and 150 m above the ground.

Scene switching lives in the controller beside this demo, so the reusable
flight component only needs to handle flying. When you choose another scene,
the controller stops flight, restores the camera, replaces the map, and waits
for the new view. If loading fails, it tries to return to the previous scene.

See [Demos](../../docs/demo.md) for a tour of the controls.
