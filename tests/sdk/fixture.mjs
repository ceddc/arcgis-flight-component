/**
 * Loads one ArcGIS SDK into a deterministic WebScene and exposes fixed-pose and
 * frame-timing hooks for browser performance comparisons.
 */
import WebScene from '@arcgis/core/WebScene.js';
import SceneView from '@arcgis/core/views/SceneView.js';
import Graphic from '@arcgis/core/Graphic.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import Polygon from '@arcgis/core/geometry/Polygon.js';
import * as kernel from '@arcgis/core/kernel.js';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils.js';
import RenderNode from '@arcgis/core/views/3d/webgl/RenderNode.js';
import '/component/arcgis-flight-component.js';

const start = performance.now();
const longitude = -112.1;
const latitude = 36.1;
const radius = 6378137;
const center = [radius * longitude * Math.PI / 180, radius * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360))];
const scale = Math.cosh(center[1] / radius);
const scenery = new GraphicsLayer({ title: 'Caller-owned benchmark scenery', elevationInfo: { mode: 'absolute-height' } });
// Fixed geometry and colors remove remote terrain, imagery and service latency
// from the timed workload. Every SDK receives the same 169 tiles and 25 blocks.
for (let row = -6; row <= 6; row++) {
  for (let column = -6; column <= 6; column++) {
    const size = 600 * scale;
    const x = center[0] + column * size, y = center[1] + row * size;
    scenery.add(new Graphic({
      geometry: new Polygon({ spatialReference: { wkid: 3857 }, rings: [[[x,y,1],[x+size,y,1],[x+size,y+size,1],[x,y+size,1],[x,y,1]]] }),
      symbol: { type: 'simple-fill', color: (row + column) % 2 ? '#91a79b' : '#c2cbb8', outline: { color: '#788b80', width: 0.25 } },
    }));
    if (Math.abs(row) <= 2 && Math.abs(column) <= 2) {
      const inset = 180 * scale;
      scenery.add(new Graphic({
        geometry: new Polygon({ spatialReference: { wkid: 3857 }, rings: [[[x+inset,y+inset,0],[x+2*inset,y+inset,0],[x+2*inset,y+2*inset,0],[x+inset,y+2*inset,0],[x+inset,y+inset,0]]] }),
        symbol: { type: 'polygon-3d', symbolLayers: [{ type: 'extrude', size: 80 + (row + column + 4) * 12, material: { color: '#768ca0' }, edges: { type: 'solid', color: '#344659', size: 0.5 } }] },
      }));
    }
  }
}
const map = new WebScene({ basemap: null, ground: { layers: [] }, layers: [scenery] });
const view = new SceneView({
  container: 'view', map, qualityProfile: 'high', spatialReference: { wkid: 3857 },
  camera: { position: { longitude, latitude, z: 700 }, heading: 0, tilt: 75 },
  environment: { lighting: { date: new Date('2025-06-21T19:00:00Z'), directShadowsEnabled: false }, atmosphereEnabled: false, starsEnabled: false },
  ui: { components: [] },
});
await view.when();
await reactiveUtils.whenOnce(() => !view.updating);
// Count SDK-rendered frames separately from browser animation callbacks. This
// public RenderNode returns its input unchanged and runs identically in each SDK.
let renderedFrames = 0;
const FrameCounter = RenderNode.createSubclass({
  consumes: { required: ['opaque-color'] }, produces: 'opaque-color',
  render(inputs) { renderedFrames++; return inputs.find(input => input.name === 'opaque-color'); },
});
const frameCounter = new FrameCounter({ view });
const originalCamera = view.camera.toJSON();
const navigationState = () => ({
  gamepad: view.navigation.gamepad.enabled,
  touch: view.navigation.browserTouchPanEnabled,
  momentum: view.navigation.momentumEnabled,
  actionMap: view.navigation.actionMap?.toJSON?.() ?? null,
});
const originalNavigation = navigationState();
const navigation = document.createElement('arcgis-plane-navigation');
navigation.view = view;
navigation.config = {
  autoStart: false,
  start: { longitude, latitude, altitudeM: 500, headingDeg: 0, speedMps: 100 },
  terrain: { enabled: false },
  controls: { keyboard: false, gamepad: false },
  ui: { enabled: true },
  camera: { bankedViewport: true },
};
document.body.append(navigation);
await navigation.start();
navigation.pause();
await reactiveUtils.whenOnce(() => !view.updating);
document.querySelector('#version').textContent = `ArcGIS ${kernel.fullVersion} | component only`;
let replayHandle = 0;
let replayStart = 0;
let frames = [];
let presentationTimes = [];
let firstRenderedFrame = 0;
const frameContext = navigation.session.scene;
const gl = view.container.querySelector('canvas')?.getContext('webgl2');
const debugRenderer = gl?.getExtension('WEBGL_debug_renderer_info');
const gpu = debugRenderer ? gl.getParameter(debugRenderer.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) ?? null;
const origin = { ...frameContext.startState.position };
/** Generate the same circular, banked trajectory for each measured replay. */
const makePose = (seconds) => {
  const angle = seconds / 60 * Math.PI * 2;
  const turnRadius = 100 * 60 / (2 * Math.PI) * scale;
  return {
    position: { x: origin.x + turnRadius * (1 - Math.cos(angle)), y: origin.y + turnRadius * Math.sin(angle), z: origin.z },
    bodyHeading: angle * 180 / Math.PI % 360, travelHeading: angle * 180 / Math.PI % 360,
    pitch: 0, roll: 25, speed: 100, boost: 0, interpolationAlpha: 0,
  };
};
/** Return Chromium's heap estimate when the browser exposes it, otherwise null. */
const heap = () => performance.memory?.usedJSHeapSize ?? null;
/** Stop the replay callback before fixing a pose or ending the benchmark. */
function stopReplay() { cancelAnimationFrame(replayHandle); replayHandle = 0; }
/** Hold a deterministic aircraft and camera pose for screenshots or parity checks. */
function fixedPose(cockpit = false, seconds = 0) {
  stopReplay();
  navigation.setCameraMode(cockpit ? 'cockpit' : 'chase', true);
  frameContext.present(makePose(seconds), navigation.config.camera.fovDeg, 1 / 60, 0, true);
}
/** Compare restored camera values with tolerance for ArcGIS render-coordinate rounding. */
function compareCamera(expected, actual) {
  const headingDifference = Math.abs(((actual.heading - expected.heading + 540) % 360) - 180);
  const positionDifference = Math.max(...['x','y','z'].map(key => Math.abs(actual.position[key] - expected.position[key])));
  const angleDifference = Math.max(headingDifference, Math.abs(actual.tilt - expected.tilt));
  // SceneView normalizes its camera through render coordinates. Sub-microdegree
  // round-off on reassignment is harmless; compare values rather than JSON bytes.
  return { positionDifference, angleDifference, restored: positionDifference < 1e-5 && angleDifference < 1e-5 && JSON.stringify(actual.position.spatialReference) === JSON.stringify(expected.position.spatialReference) };
}
window.flightBenchmark = {
  navigation, view, scenery,
  version: kernel.fullVersion,
  gpu,
  readyMs: performance.now() - start,
  fixedPose,
  /** Measure whether the banked aircraft changes rendered pixels in a fixed scene region. */
  async aircraftPixelsAtTurn() {
    fixedPose(false, 15);
    const layer = map.layers.find(layer => layer.title === 'Plane navigation');
    const settle = async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); await reactiveUtils.whenOnce(() => !view.updating); };
    await settle();
    const area = { x: Math.round(view.width * 0.35), y: Math.round(view.height * 0.35), width: Math.round(view.width * 0.3), height: Math.round(view.height * 0.4) };
    const withPlane = (await view.takeScreenshot({ area })).data.data;
    layer.visible = false; await settle();
    const withoutPlane = (await view.takeScreenshot({ area })).data.data;
    layer.visible = true; await settle();
    let changedPixels = 0;
    for (let index = 0; index < withPlane.length; index += 4) {
      if (Math.abs(withPlane[index] - withoutPlane[index]) + Math.abs(withPlane[index + 1] - withoutPlane[index + 1]) + Math.abs(withPlane[index + 2] - withoutPlane[index + 2]) > 24) changedPixels++;
    }
    return { area, changedPixels, visible: changedPixels > 100 };
  },
  /** Start the replay and capture baseline counters for end() to summarize. */
  begin() {
    stopReplay(); frames = []; presentationTimes = []; firstRenderedFrame = renderedFrames; let frame = 0;
    navigation.setCameraMode('chase', true);
    frameContext.setFramePacing({ averageFps: 60, p95FrameMs: 16.7 });
    replayStart = performance.now(); let previous = replayStart;
    const before = { heapBytes: heap(), cameraUpdates: frameContext.debugSnapshot().cameraUpdateCount };
    function tick(now) {
      const dt = now - previous; previous = now;
      frames.push(dt);
      const presentStart = performance.now();
      frameContext.present(makePose((now - replayStart) / 1000), navigation.config.camera.fovDeg, dt / 1000, ++frame);
      presentationTimes.push(performance.now() - presentStart);
      replayHandle = requestAnimationFrame(tick);
    }
    replayHandle = requestAnimationFrame(tick);
    return before;
  },
  /** Stop replay and return its frame, render, presentation, camera, and heap measurements. */
  end() {
    stopReplay();
    return { frameTimes: frames, presentationTimes, renderedFrames: renderedFrames - firstRenderedFrame, elapsedMs: performance.now() - replayStart, heapBytes: heap(), debug: navigation.debugSnapshot() };
  },
  /** Remove the flight component and verify its host-owned scene remains usable. */
  async teardown() {
    stopReplay(); navigation.stop(); navigation.remove();
    await new Promise(requestAnimationFrame);
    const restoredCamera = view.camera.toJSON();
    const checks = {
      viewSurvives: !view.destroyed && view.map === map,
      callerLayerSurvives: map.layers.length === 1 && map.layers.getItemAt(0) === scenery,
      cameraRestored: compareCamera(originalCamera, restoredCamera).restored,
      navigationRestored: JSON.stringify(navigationState()) === JSON.stringify(originalNavigation),
      componentUiRemoved: !view.container.querySelector('.arcgis-flight-controls'),
      sceneComponentNotLoaded: !customElements.get('arcgis-scene'),
    };
    const framesBefore = renderedFrames;
    const camera = view.camera.clone(); camera.heading += 2; view.camera = camera;
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    checks.hostStillRenders = renderedFrames > framesBefore;
    frameCounter.destroy();
    return { checks, originalCamera, restoredCamera, cameraDifference: compareCamera(originalCamera, restoredCamera) };
  },
};
fixedPose();
