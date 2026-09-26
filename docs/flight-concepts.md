# Flight concepts

The aircraft, camera, and ground checks work together to let you explore
your scene. Here is how they behave, and what the
[configuration settings](configuration.md) change.

## The plane

The default plane moves forward as you steer. Heading is the
direction of travel, pitch raises or lowers the nose, and bank tilts the wings
and turns the aircraft. Releasing the controls gradually levels pitch and bank.
Flight continues forward until paused or stopped.

Think of it as a playful way to explore maps. The flight model is simplified
and is not suitable for pilot training.
The GLB file gives the aircraft its appearance. A [flight profile](custom-aircraft.md#choose-speed-and-handling)
controls speed and handling. The Space Jet and Paraglider have different controls
from the default plane.

The default aircraft has a body, a separately spinning propeller, and a boost
effect that grows and fades in turbo mode. To replace
them or change the flight rules, see [Custom aircraft](custom-aircraft.md).

## What happens with no options

| Setting | Default behavior |
| --- | --- |
| Start | Use the loaded view center and camera heading, 300 m above sampled ground. |
| Motion | Start automatically at speed `100`, displayed as 360 km/h, in normal power mode. |
| Camera | Chase view behind the aircraft, base field of view 65 degrees, viewport banking enabled. |
| Input | Keyboard and gamepad enabled, sensitivity `0.8`, inverted pitch. W/Up lowers the nose; S/Down raises it. |
| Ground limits | Clearance enabled, a 2.8 m lower threshold, and a 50000 m ceiling above ground. |
| Controls on screen | Hidden. The controls demo supplies its own toolbar. |

Without `start.altitudeM`, startup needs a ground elevation sample. If ArcGIS
cannot supply one, flight reports an error instead of assuming ground is at
zero.

Demos can choose different defaults. Local scenes use metre-based flight
distances. Global scenes retain Web Mercator movement; see
[distance units](configuration.md#scene-distance-semantics) if you need accurate travel distances.

## The camera

Chase view follows behind the plane with smoothed movement. Cockpit view moves
the camera near the aircraft's origin and hides the aircraft model; it does
not render an instrument panel. Switching views preserves the flight.

Drag the scene with the left mouse button or one finger to look around in chase view. Release to return behind the plane. Cockpit view stays fixed. Two-finger gestures do not zoom during flight. This requires `controls.captureSceneNavigation`, enabled by default.

`fovDeg` sets the base viewing angle: larger values show more of the scene.
Camera transitions and boost can adjust the presented angle. Viewport banking
tilts the horizon during turns; disabling it leaves the horizon level while
the plane still banks. `submissionHz` caps camera updates, not the simulation
rate or guaranteed frame rate.

## Terrain and height above ground

The hills and valleys come from your scene's elevation data. The component
uses that data to check the aircraft's height above the ground. Its `terrain`
settings control those checks; your scene still supplies and loads the terrain.

**AGL means above ground level.** It is aircraft altitude minus the sampled
ground elevation underneath. For example, altitude 1300 m over ground at
1000 m means 300 m AGL. Altitude uses the host scene's vertical reference.

When a valid ground height is available, flying below `minimumClearanceM`
lifts the aircraft and nudges its nose upward. Flying above `maximumAglM`
limits its altitude to ground height plus that ceiling. These checks use the
aircraft's position, not its wing tips or a collision shape.

Ground samples can be unavailable while ArcGIS loads data. Clearance and
ceiling checks then wait for usable data; the component never assumes missing
ground is at zero. Buildings, trees, bridges, and integrated meshes are not
obstacles detected by these checks. See [Terrain settings](configuration.md#terrain)
for defaults and an example.

`recover()` returns to the last safe flight position, resets the attitude and
initial speed, and preserves pause state. It does not plan a route around
obstacles.
