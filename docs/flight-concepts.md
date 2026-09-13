# Flight concepts

The host application supplies the ArcGIS scene. The component adds a moving
aircraft and a camera that follows it. These are the ideas behind the
[configuration settings](configuration.md).

## The plane

The aircraft has a position, heading, pitch, bank, and speed. Heading is the
direction of travel, pitch raises or lowers the nose, and bank tilts the wings
and turns the aircraft. Releasing the controls gradually levels pitch and bank.
Flight continues forward until paused or stopped.

This is an arcade flight model for exploring a scene. Its motion comes from
the component's flight rules; the GLB supplies its appearance. Replacing the
model does not change speed, handling, or ground clearance. There are no
configurable mass, lift, engine, or stall parameters.

The default aircraft has a body, a separately spinning propeller, and a boost
effect that grows and fades in turbo mode. They share one ArcGIS graphics layer. To replace
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

Demo pages set their own locations and may override these defaults. Speed uses
scene coordinates; see [distance semantics](configuration.md#scene-distance-semantics)
before using it for real-world distance or timing.

## The camera

Chase view follows behind the plane with smoothed movement. Cockpit view moves
the camera near the aircraft's origin and hides the aircraft model; it does
not render an instrument panel. Switching views preserves the flight.

Drag the scene with the left mouse button or one finger to look around in chase view. Release to ease back behind the plane in 0.85 seconds. Cockpit view stays fixed. Two-finger gestures do not zoom during flight. This requires `controls.captureSceneNavigation`, enabled by default.

`fovDeg` sets the base viewing angle: larger values show more of the scene.
Camera transitions and boost can adjust the presented angle. Viewport banking
tilts the horizon during turns; disabling it leaves the horizon level while
the plane still banks. `submissionHz` caps camera updates, not the simulation
rate or guaranteed frame rate.

## Terrain and height above ground

The scene's imagery supplies the surface picture, and its ground elevation
supplies the shape of hills and valleys. The host loads both. The component's
`terrain` settings control the aircraft's response to that ground; they do
not load elevation, change terrain detail, or turn the visible ground off.

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
