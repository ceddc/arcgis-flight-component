/**
 * Runs the loader, SDK, projection, and terrain case selected by functional.html;
 * reports setup, rendering, and resource-restoration evidence to Playwright.
 */
const configuration = window.functionalConfiguration;
const modules = [
  'WebScene', 'views/SceneView', 'Graphic', 'layers/GraphicsLayer',
  'geometry/Polygon', 'geometry/Mesh', 'kernel', 'core/reactiveUtils',
  'views/3d/webgl/RenderNode', 'layers/BaseElevationLayer',
];
/** Bridge AMD's callback loader to a Promise for shared setup code below. */
const requireModules = ids => new Promise((resolve, reject) => {
  window.require(ids, (...loaded) => resolve(loaded), reject);
});
const loaded = configuration.loader === 'amd'
  ? await requireModules(modules.map(id => 'esri/' + id))
  : await Promise.all(modules.map(async id => {
      const module = await import('@arcgis/core/' + id + '.js');
      return module.default ?? module;
    }));
const [WebScene, SceneView, Graphic, GraphicsLayer, Polygon, Mesh, kernel, reactiveUtils, RenderNode, BaseElevationLayer] = loaded;
if (configuration.loader === 'amd') {
  await requireModules(['/component/arcgis-flight-component.amd.js']);
} else {
  const [major, minor] = configuration.sdk.split('.').map(Number);
  const family = major === 4 && minor < 32 ? '4.30' : major < 5 || minor < 1 ? '4.32' : '5.1';
  configuration.componentFile = 'arcgis-flight-component.sdk-' + family + '.js';
  await import('/component/' + configuration.componentFile);
}

// The Swiss LV95 origin near Bern is an independent, metre-scale projection
// checkpoint: this approximate WGS84 position must land near E=2600000,N=1200000.
const longitude = 7.438632;
const latitude = 46.951083;
const radius = 6378137;
const local = configuration.wkid === 2056;
const center = local ? [2600000, 1200000] : [
  radius * longitude * Math.PI / 180,
  radius * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)),
];
const spatialReference = { wkid: configuration.wkid };
const scenery = new GraphicsLayer({
  title: 'Caller-owned compatibility scenery', elevationInfo: { mode: 'absolute-height' },
});
for (let row = -3; row <= 3; row++) {
  for (let column = -3; column <= 3; column++) {
    const x = center[0] + column * 600;
    const y = center[1] + row * 600;
    scenery.add(new Graphic({
      geometry: new Polygon({ spatialReference, rings: [
        [[x, y, 1], [x + 600, y, 1], [x + 600, y + 600, 1], [x, y + 600, 1], [x, y, 1]],
      ] }),
      symbol: { type: 'simple-fill', color: (row + column) % 2 ? '#91a79b' : '#c2cbb8', outline: { width: 0.25, color: '#788b80' } },
    }));
  }
}
// An empty Ground has no elevation sampler. Supply real SDK elevation tiles
// so terrain checks exercise the component against available ground data.
const FlatGround = BaseElevationLayer.createSubclass({
  async fetchTile() {
    const size = this.tileInfo.size[0] + 1;
    return { values: new Float32Array(size * size), width: size, height: size, noDataValue: -9999 };
  },
});
const groundLayer = configuration.terrain ? new FlatGround({
  title: 'Caller-owned flat ground',
  ...(local ? {
    spatialReference,
    fullExtent: {
      xmin: center[0] - 32768, ymin: center[1] - 32768,
      xmax: center[0] + 32768, ymax: center[1] + 32768, spatialReference,
    },
    tileInfo: {
      spatialReference, size: [256, 256],
      origin: { x: center[0] - 32768, y: center[1] + 32768 },
      lods: Array.from({ length: 16 }, (_, level) => ({
        level, resolution: 256 / 2 ** level, scale: 256 / 2 ** level * 96 * 39.37,
      })),
    },
  } : {}),
}) : null;
const map = new WebScene({ basemap: null, ground: { layers: groundLayer ? [groundLayer] : [] }, layers: [scenery] });
const view = new SceneView({
  container: 'view', map, spatialReference,
  viewingMode: local ? 'local' : 'global',
  ...(local ? { clippingArea: {
    xmin: center[0] - 7000, ymin: center[1] - 7000,
    xmax: center[0] + 7000, ymax: center[1] + 7000, spatialReference,
  } } : {}),
  camera: { position: { x: center[0], y: center[1], z: 800, spatialReference }, heading: 0, tilt: 75 },
  qualityProfile: 'high', ui: { components: [] },
  environment: {
    lighting: { date: new Date('2025-06-21T12:00:00Z'), directShadowsEnabled: false },
    atmosphereEnabled: false, starsEnabled: false,
  },
});
/** Wait for one browser animation frame before sampling view state. */
const nextFrame = () => new Promise(requestAnimationFrame);
/** Wait for paint and for ArcGIS to finish drawing before taking a screenshot. */
const settle = async () => {
  await nextFrame(); await nextFrame();
  await reactiveUtils.whenOnce(() => !view.updating);
};
await view.when();
if (groundLayer) await view.whenLayerView(groundLayer);
await settle();
let renderedFrames = 0;
const Counter = RenderNode.createSubclass({
  consumes: { required: ['opaque-color'] }, produces: 'opaque-color',
  render(inputs) {
    renderedFrames++;
    return inputs.find(input => input.name === 'opaque-color');
  },
});
const counter = new Counter({ view });
const originalCamera = { ...view.camera.toJSON(), fov: view.camera.fov };
/** Capture host navigation options so teardown can prove borrowed state was restored. */
const navigationState = () => ({
  gamepad: view.navigation.gamepad.enabled,
  touch: view.navigation.browserTouchPanEnabled,
  momentum: view.navigation.momentumEnabled,
  actionMap: view.navigation.actionMap?.toJSON?.() ?? null,
});
const originalNavigation = navigationState();
const originalTabindex = view.container.getAttribute('tabindex');
const navigation = document.createElement('arcgis-plane-navigation');
let readyDetail;
navigation.addEventListener('arcgisPlaneNavigationReady', event => { readyDetail = event.detail; });
navigation.view = view;
navigation.config = {
  autoStart: false,
  start: { longitude, latitude, altitudeM: 500, headingDeg: 0, speedMps: 100 },
  terrain: { enabled: configuration.terrain },
  controls: { keyboard: true, gamepad: false },
  ui: { enabled: true, locale: 'en' },
  camera: { bankedViewport: true },
};
document.body.append(navigation);
await navigation.start();
navigation.pause();
await settle();
const startSnapshot = navigation.snapshot();
const planeLayer = map.layers.find(layer => layer.title === 'Plane navigation');
const ownedGraphics = planeLayer.graphics.toArray();
const ownedMeshes = ownedGraphics.map(graphic => graphic.geometry);
const projectedStartErrorM = Math.hypot(
  startSnapshot.vehicle.position.x - center[0],
  startSnapshot.vehicle.position.y - center[1],
);
document.querySelector('#version').textContent = 'ArcGIS ' + kernel.fullVersion + ' | ' + configuration.loader + ' | WKID ' + configuration.wkid;

/** Compare camera properties within rendering tolerance rather than JSON byte equality. */
function compareCamera(expected, actual) {
  const headingError = Math.abs(((actual.heading - expected.heading + 540) % 360) - 180);
  const positionError = Math.max(...['x', 'y', 'z'].map(key => Math.abs(actual.position[key] - expected.position[key])));
  const angularError = Math.max(headingError, Math.abs(actual.tilt - expected.tilt), Math.abs(actual.fov - expected.fov));
  return {
    positionError, angularError,
    restored: positionError < 1e-5 && angularError < 1e-5
      && JSON.stringify(actual.position.spatialReference) === JSON.stringify(expected.position.spatialReference),
  };
}

window.flightCompatibility = {
  navigation, view, startSnapshot, configuration,
  version: kernel.fullVersion,
  initial: {
    readyUsesHostView: readyDetail?.view === view && readyDetail?.scene === null,
    usesHostSdkClasses: planeLayer instanceof GraphicsLayer
      && ownedGraphics.every(graphic => graphic instanceof Graphic)
      && ownedMeshes.every(mesh => mesh instanceof Mesh),
    controlsMounted: !!view.container.querySelector('.arcgis-flight-controls'),
    componentFile: configuration.componentFile ?? 'arcgis-flight-component.amd.js',
    sceneComponentNotLoaded: !customElements.get('arcgis-scene'),
    projectedStartErrorM,
    projectionCorrect: projectedStartErrorM < (local ? 40 : 0.001),
    terrainAglM: startSnapshot.aglM,
    terrainCorrect: !configuration.terrain || (Number.isFinite(startSnapshot.aglM) && Math.abs(startSnapshot.aglM - 500) < 5),
  },
  /** Check that the plane layer contributes visible pixels to a stable scene crop. */
  async aircraftPixels() {
    if (navigation.status !== 'paused') throw new Error('Pause flight before comparing aircraft pixels.');
    await settle();
    const area = {
      x: Math.round(view.width * 0.35), y: Math.round(view.height * 0.35),
      width: Math.round(view.width * 0.3), height: Math.round(view.height * 0.4),
    };
    const withAircraft = (await view.takeScreenshot({ area })).data.data;
    let withoutAircraft;
    try {
      planeLayer.visible = false;
      await settle();
      withoutAircraft = (await view.takeScreenshot({ area })).data.data;
    } finally {
      planeLayer.visible = true;
      await settle();
    }
    let changedPixels = 0;
    for (let i = 0; i < withAircraft.length; i += 4) {
      const difference = Math.abs(withAircraft[i] - withoutAircraft[i])
        + Math.abs(withAircraft[i + 1] - withoutAircraft[i + 1])
        + Math.abs(withAircraft[i + 2] - withoutAircraft[i + 2]);
      if (difference > 24) changedPixels++;
    }
    return { area, changedPixels, visible: changedPixels > 100 };
  },
  /** Report cockpit visibility, bank roll, and renderer evidence for the integration case. */
  async cockpitEvidence() {
    await settle();
    const debug = navigation.debugSnapshot();
    return {
      debug, renderedFrames,
      cockpitActive: navigation.snapshot().cameraMode === 'cockpit',
      aircraftHidden: ownedGraphics.every(graphic => !graphic.visible),
      rollRendered: debug.sceneRoll.disabled === false && debug.sceneRoll.renderCount > 0
        && Math.abs(debug.cameraFrame.roll) > 1,
    };
  },
  /** Stop flight, then check caller-owned scene state and continued host rendering. */
  async teardown() {
    navigation.stop(); navigation.remove();
    await settle();
    const restoredCamera = { ...view.camera.toJSON(), fov: view.camera.fov };
    const cameraDifference = compareCamera(originalCamera, restoredCamera);
    const checks = {
      viewSurvives: !view.destroyed && view.map === map,
      callerLayerSurvives: map.layers.length === 1 && map.layers.getItemAt(0) === scenery,
      ownedGraphicsDestroyed: ownedGraphics.every(graphic => graphic.destroyed),
      ownedMeshesDestroyed: ownedMeshes.every(mesh => mesh.destroyed),
      cameraRestored: cameraDifference.restored,
      callerGroundPreserved: !groundLayer || (map.ground.layers.includes(groundLayer) && !groundLayer.destroyed),
      navigationRestored: JSON.stringify(navigationState()) === JSON.stringify(originalNavigation),
      tabindexRestored: view.container.getAttribute('tabindex') === originalTabindex,
      componentUiRemoved: !view.container.querySelector('.arcgis-flight-controls'),
    };
    const before = renderedFrames;
    const camera = view.camera.clone(); camera.heading += 2; view.camera = camera;
    await settle();
    checks.hostStillRenders = renderedFrames > before;
    counter.destroy();
    return { checks, cameraDifference, originalCamera, restoredCamera };
  },
};
