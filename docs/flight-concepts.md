# How it works

The component adds a plane to a 3D scene that your app already owns. This page
explains what it controls, what it leaves alone, and which scenes it supports.

## Your app and the component

| Your app owns | The component adds |
| --- | --- |
| The `SceneView` or `<arcgis-scene>` | A graphics layer with the aircraft |
| The map, ground, and layers | Keyboard, gamepad, and touch input |
| Sign-in and access to private content | Camera movement that follows the plane |
| The page layout and your own UI | The optional toolbar and joystick |

While flying, the component takes over the camera and the scene's mouse and
touch navigation. When the flight stops, it removes everything it added and
restores the camera and navigation settings. It never destroys your view, map,
or layers.

Only one flight can run in a view at a time.

## Default behavior

With no options set:

| | Default |
| --- | --- |
| Start | Center of the view, 300 m above the ground, in the camera's direction |
| Speed | 360 km/h, normal power mode |
| Camera | Chase view behind the plane, 65° field of view, horizon tilts in turns |
| Input | Keyboard and gamepad on, sensitivity `0.8`, pitch inverted like a flight stick |
| Touch | Joystick on touch screens only |
| Ground | Stays at least 2.8 m above the ground, at most 50 km above it |
| Toolbar | Hidden |
| Start time | As soon as the scene is ready |

## The camera

**Chase** view follows behind the plane. Drag the scene with the mouse or one
finger to look around; release to swing back behind the plane.

**Cockpit** view puts the camera at the plane's position and hides the model.
There is no instrument panel.

In turns, the horizon tilts with the plane. This uses an ArcGIS
[`RenderNode`](https://developers.arcgis.com/javascript/latest/references/core/views/3d/webgl/RenderNode/).
If it is not available, or you set `camera-roll-disabled`, the horizon stays
level and everything else works the same.

## Ground clearance

The component reads the ground height from the scene's elevation data:

- Below `terrain.minimumClearanceM` above the ground, it lifts the plane and
  raises its nose.
- Above `terrain.maximumAglM`, it caps the altitude.

AGL means *above ground level*: a plane at 1,300 m altitude over ground at
1,000 m is 300 m AGL.

These checks use the plane's position and the ground surface only. Buildings,
trees, and bridges are not obstacles, and the wing tips can touch a slope. When
elevation data is still loading, the checks wait. The component never treats
missing ground as sea level.

Without `start.altitudeM`, the start needs a ground height. If the scene cannot
supply one, the component reports an error.

## Supported scenes

| Scene | Supported |
| --- | --- |
| Global, Web Mercator | Yes |
| Local, Web Mercator | Yes |
| Local, projected coordinate system in metres or feet (for example LV95 or a State Plane system) | Yes |
| Local, geographic coordinates (WGS84) | No |
| 2D `MapView` | No |

For a local scene, set the coordinate system when you create the view. Your
layers must use it too:

```js
const view = new SceneView({
  container: "viewDiv",
  map,
  viewingMode: "local",
  spatialReference: { wkid: 2263 }, // New York Long Island, US feet
});
```

Start longitude and latitude are always WGS84 degrees. The component projects
them into the scene. The [Zurich sample](../demos/zurich/) shows a local scene
in Swiss LV95.

> [!TIP]
> In a large local scene, the plane can disappear behind the camera's near
> clipping plane. Set `view.constraints.clipDistance` in your app. The component
> manages clipping only in global scenes.

## Units

Configuration always uses metres, metres per second, and degrees, whatever the
scene's units.

- **Local scenes:** positions and speeds in snapshots are in metres and metres
  per second, converted from the scene's units.
- **Global scenes:** horizontal positions and speeds stay in Web Mercator
  units. Web Mercator stretches distances away from the equator, so the
  displayed km/h is a game speed, not a true ground speed. Compute real
  distances from longitude and latitude if you need them.

Altitude and height above the ground are always in metres.

## ArcGIS Enterprise and private content

The component uses whatever your view loads. To fly over ArcGIS Enterprise or
private content, sign in and load the scene in your app first, the way you
normally would. The services must allow requests from your domain (CORS).

The [Flight controls sample](../demos/simple-controls/) loads imagery and terrain
directly from an ArcGIS Enterprise server.
