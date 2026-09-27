# Scene explorer sample

Pick a place and fly around it. The app starts near Mount Fuji with the place
picker open. You can:

- choose one of the suggested places,
- search for an address (Esri World Geocoder; queries are not stored), or
- search public WebScenes on ArcGIS Online, or paste an item ID.

**Settings** changes the steering sensitivity, field of view, pitch direction,
and horizon roll.

Run `npm run dev`, then open <http://127.0.0.1:3116/demos/webscene-selector/>.

## How scene switching works

The flight component only flies. Choosing and loading scenes is the app's job,
in [`lib/scene-activation-controller.ts`](lib/scene-activation-controller.ts):

1. Stop the flight, which restores the camera.
2. Replace the map, or the whole view when the coordinate system changes.
3. Wait for the view, then start the flight again.

If the new scene fails to load, the controller goes back to the previous one.

A WebScene must be public and use Web Mercator, or a local projected
coordinate system (see [supported scenes](../../docs/flight-concepts.md#supported-scenes)).
The flight starts from the scene's initial camera, a little in front of it and
150 m above the ground.

See [Samples](../../docs/samples.md) for the other samples.
