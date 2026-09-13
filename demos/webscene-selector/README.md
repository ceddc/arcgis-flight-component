# Scene explorer demo

This Calcite host application demonstrates scene selection and replacement
around the standalone flight component. The host-side controller lives beside
the sample and keeps scene selection separate from the reusable element.

The demo shares a light Calcite theme, blue accent, flight toolbar, and keyboard
help with the other samples. Choose a destination under Places, Search, or
WebScene, then use the toolbar to change power, pause, switch camera, or recover.

Run `npm run dev`, then open
`http://127.0.0.1:3116/demos/webscene-selector/`.

The sample supports nine curated places using imagery and elevation, a non-stored
Esri World Geocoder lookup, and exact public ArcGIS Online WebScene item IDs. It
validates WebScene item type, access, viewing mode, and spatial reference before
activation. Its controller stops the flight, restores the host camera, replaces
the map, waits for the new view, and rolls back when activation fails.

See `docs/demo.md` for the complete flow and file responsibilities.
