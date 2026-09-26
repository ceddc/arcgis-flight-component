# Demos

Pick a demo and go flying. Each one starts when its scene is ready; click
the scene to steer. Demos with a toolbar also have a Pause button.

Basic flight is the smallest example to build on. The others show controls,
different scenes, and aircraft you can try in your own app.

## Run the samples

Clone this repository, then run:

```bash
npm ci
npm run dev
```

Open [the local site](http://127.0.0.1:3116/) and choose a demo from the top menu.
If that port is busy, use the address printed by Vite.

| Demo | Description | Source |
| --- | --- | --- |
| [Basic flight](../demos/simple/) | Fly toward the Matterhorn with keyboard or gamepad controls. | [HTML](../demos/simple/index.html) |
| [Flight controls](../demos/simple-controls/) | Fly over Geneva with SITG imagery, terrain, and 3D buildings while changing power, pause, recovery, and camera. | [TypeScript](../demos/simple-controls/main.ts) |
| [Scene explorer](../demos/webscene-selector/) | Choose a place, search an address, or load a public WebScene. | [TypeScript](../demos/webscene-selector/main.ts) |
| [Zurich local scene](../demos/zurich/) | Fly over a ready-made WebScene with 3D buildings. | [TypeScript](../demos/zurich/main.ts) |
| [Other aircraft](../demos/aircraft/) | Four aircraft, Esri 3D Buildings, weather and time, camera controls, and picture capture. | [TypeScript](../demos/aircraft/main.ts) |

## Scene explorer

Flight starts near Mount Fuji with the scene picker open. Choose a destination,
search for an address, or search public ArcGIS Online WebScenes and pick one
from the result cards (or paste an item ID). The picker accepts global Web
Mercator WebScenes and local WebScenes with projected coordinates.

The panel stays visible while you fly and when you switch destinations.
The scene remains interactive beside it.
**Settings** adjusts steering sensitivity, field of view, pitch direction, and camera roll.

## Flight controls over Geneva

The Flight controls demo loads public SITG imagery and terrain from ArcGIS
Enterprise, plus 3D building and landmark layers hosted by SITG on ArcGIS Online.
Use the controls to pause, recover, change power, or switch cameras while
flying over the 3D building scene.

## Zurich local scene

This demo adds the plane to the [Zurich LV95 WebScene](https://www.arcgis.com/home/item.html?id=067ada556ed84bb3aa5c65b4f2a7c15d).
The basemap, terrain, and 3D buildings are already part of the scene, so there
are no building queries or custom renderer to set up.
It uses Swiss LV95 (EPSG:2056) in local mode. The sample omits the trees layer,
which requires a subscription.

Ground clearance in these demos does not detect buildings or other obstacles.

## Other aircraft

Try Classic, Super Jet, Space Jet, or Paraglider. The demo starts over the Grand
Canyon. Choosing another aircraft swaps its model and flight profile in place,
keeping your current position, camera mode, and scene; the camera framing
adjusts for the new profile. The panel shows its speeds and controls.

**Buildings** toggles Esri worldwide 3D Buildings. The weather menu applies
seven ArcGIS weather presets and changes sun lighting with a 24-hour time
control. **Photo** downloads the scene with live ArcGIS provider credits.

To use another model or change its speed, follow
[Custom aircraft](custom-aircraft.md#choose-speed-and-handling).
