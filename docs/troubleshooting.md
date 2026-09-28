# Troubleshooting

Start by logging the error. Add this listener before the flight starts:

```js
flight.addEventListener("arcgisPlaneNavigationError", (event) => {
  console.error(event.detail.error);
});
```

Also look at the browser console for ArcGIS layer or network errors.

## Setup

### Nothing happens and `status` stays `idle`

The component has no scene to fly in. Either:

- set `reference-element` to the `id` of an `<arcgis-scene>` on the same page, or
- assign a 3D `SceneView` to `flight.view`.

A 2D `MapView` does not work.

### "The referenced ArcGIS scene has no map"

Give the scene a map before the flight starts: an `item-id`, a `basemap`, or
assign `scene.map` in JavaScript.

### The bundler cannot resolve `projectOperator`, `projection`, or `meshUtils`

The component build does not match your SDK version. Pick the right import in
[SDK versions](sdk-compatibility.md#choose-an-import).

### The page loads the SDK twice

The standalone `browser/` build includes the SDK. In an app that already loads
the SDK, import the component from the package instead.

### Import fails during server-side rendering

The component needs a browser. In frameworks such as Next.js, import it on the
client only:

```js
if (typeof window !== "undefined") {
  await import("@ceddc/arcgis-flight-component");
}
```

### The error mentions `Promise.withResolvers` or `AbortSignal`

The browser is too old. Update it.

## Flying

### The keys do nothing

Click the scene first, so it has keyboard focus. Text fields keep their normal
typing, and buttons keep Space and the arrow keys.

### The gamepad does nothing

Click the scene, then move both sticks back to the center once. The browser must
report the gamepad with the `standard` mapping. Check `flight.snapshot().gamepad`
to see which controller is in use.

### I can't pan or zoom the map while flying

That is on purpose: the component replaces the scene's navigation during a
flight. To keep it, add `capture-scene-navigation-disabled`.

### The plane starts in the wrong place

Without start coordinates, the plane starts at the center of the view. Set
`start-longitude` and `start-latitude` together; see
[Set the start position](configuration-recipes.md#set-the-start-position).

### The flight fails at the start with an elevation error

Without `start-altitude-m`, the component needs the ground height below the
start point. If the scene has no elevation there, set an altitude.

### The plane flies through buildings

Ground clearance uses the elevation surface only. Buildings, trees, and bridges
are not obstacles. Raise `terrain.minimumClearanceM` or fly higher.

### The horizon does not tilt in turns

Check that `camera-roll-disabled` is not set, and look for `RenderNode` or
WebGL warnings in the console. Without them, the horizon stays level and the
flight continues normally.

### Buildings appear late after a turn

Turns favor a smooth frame rate over loading, so buildings revealed by a long
turn can appear a moment later. They catch up in straight flight. In some
scenes, the first turn after the page loads ends with a short pause; later
turns do not.

### The plane disappears in a large local scene

The camera's near clipping plane can hide the plane. Set
`view.constraints.clipDistance` in your app.

### The aircraft model does not load

Open the model URL in the browser to check that it returns the `.glb` file. A
model on another domain needs CORS. Check that your build did not change the
path.

### A second flight component is rejected

Only one flight can run in a view. Call `stop()` on the first one, or remove it,
before starting the second.

### The camera jumps back when the flight stops

`stop()` restores the camera from before the flight. To keep the current view,
call `flight.stop({ restoreCamera: false })`.

## Report a problem

Include this output in your [issue](https://github.com/ceddc/arcgis-flight-component/issues):

```js
console.log(flight.status);
console.dir(flight.snapshot(), { depth: null });
console.dir(flight.debugSnapshot(), { depth: null });
```

Also include the SDK version, the browser, your configuration, the error
message, and, if you can, a small public scene that shows the problem.
