/**
 * Runs the multi-aircraft demo: configures its ArcGIS scene, swaps aircraft in
 * place, and connects weather, building, camera, flight, and image-capture UI.
 */
import '@arcgis/map-components/components/arcgis-scene';
import '@esri/calcite-components/components/calcite-icon';
import ColorBackground from '@arcgis/core/webscene/background/ColorBackground.js';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils.js';
import SceneLayer from '@arcgis/core/layers/SceneLayer.js';
import '../../src/components/arcgis-plane-navigation';
import type { ArcgisPlaneNavigationElement } from '../../src/components/arcgis-plane-navigation';
import type { FlightSessionSnapshot } from '../../src/controller/flight-session';
import { AIRCRAFT, AIRCRAFT_IDS, type AircraftId } from '../../src/core/aircraft-profiles';
import type { VehicleState } from '../../src/core/types';
import { setupDemoUi } from '../shared/demo-ui';
import './style.css';

setupDemoUi();

type WeatherId = 'clear' | 'wispy' | 'scattered' | 'cloudy' | 'rain' | 'snow' | 'fog';

const aircraftCopy: Record<AircraftId, { name: string; kind: string; description: string; controls: string }> = {
  classic: { name: 'Classic', kind: 'Propeller plane', description: 'Easy banking, self-leveling pitch and an animated propeller.', controls: 'Arrows or WASD steer. Shift accelerates; Space brakes.' },
  'super-jet': { name: 'Super Jet', kind: 'Fast touring', description: 'More momentum and wider turns at speed.', controls: 'Brake into a turn to tighten the arc.' },
  'space-jet': { name: 'Space Jet', kind: 'Vertical thrusters', description: 'Independent vertical thrust with a 200 km altitude ceiling.', controls: 'Up/down control vertical thrust. Shift accelerates.' },
  paraglider: { name: 'Paraglider', kind: 'Unpowered flight', description: 'An assisted glider with gentle banks and natural sink.', controls: 'Shift applies speed bar. Space brakes and flares.' },
};

const weatherPresets = {
  clear: { label: 'Clear', icon: 'brightness', color: '#77b6e5', weather: { type: 'sunny' as const, cloudCover: 0 } },
  wispy: { label: 'Wispy', icon: 'partly-cloudy', color: '#93bfdc', weather: { type: 'sunny' as const, cloudCover: 0.65 } },
  scattered: { label: 'Scattered', icon: 'cloudy', color: '#91c0e3', weather: { type: 'cloudy' as const, cloudCover: 0.04 } },
  cloudy: { label: 'Cloudy', icon: 'cloud', color: '#b7cfe0', weather: { type: 'cloudy' as const, cloudCover: 0.32 } },
  rain: { label: 'Rain', icon: 'rain', color: '#b5c4ce', weather: { type: 'rainy' as const, cloudCover: 0.2, precipitation: 0.1 } },
  snow: { label: 'Snow', icon: 'snow', color: '#c5d5df', weather: { type: 'snowy' as const, cloudCover: 0.2, precipitation: 0.1, snowCover: 'disabled' as const } },
  fog: { label: 'Fog', icon: 'effects', color: '#c4d5df', weather: { type: 'foggy' as const, fogStrength: 0.1 } },
} satisfies Record<WeatherId, { label: string; icon: string; color: string; weather: object }>;

/** Resolve a required demo element while preserving its concrete DOM type. */
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const scene = byId<HTMLArcgisSceneElement>('scene');
const flight = byId<ArcgisPlaneNavigationElement>('flight');
const fly = byId<HTMLButtonElement>('fly');
const camera = byId<HTMLButtonElement>('camera');
const recover = byId<HTMLButtonElement>('recover');
const power = byId<HTMLSelectElement>('power');
const status = byId('status');
const notice = byId('notice');
const captureButton = byId<HTMLButtonElement>('capture');
const buildingsButton = byId<HTMLButtonElement>('buildings');
const aircraftTrigger = byId<HTMLButtonElement>('aircraft-control');
const weatherTrigger = byId<HTMLButtonElement>('weather-control');
const aircraftPanel = byId('aircraft-panel');
const weatherPanel = byId('weather-panel');
const weatherTime = byId<HTMLInputElement>('weather-time');
const weatherTimeValue = byId<HTMLOutputElement>('weather-time-value');
const weatherNoon = byId<HTMLButtonElement>('weather-noon');

let selected: AircraftId = 'classic';
let selectedWeather: WeatherId = 'clear';
let aircraftSwapPending = false;
let aircraftSwapRequest = 0;
type FlightStart = {
  longitude: number;
  latitude: number;
  altitudeM: number;
  headingDeg: number;
  speedMps: number;
};
const initialFlightStart: FlightStart = {
  longitude: -112.112,
  latitude: 36.099,
  altitudeM: 2600,
  headingDeg: 95,
  speedMps: AIRCRAFT.classic.tuning.cruiseSpeed,
};
let retainedSnapshot: FlightSessionSnapshot | null = null;

/** Convert the live Web Mercator vehicle pose back to the geographic start config. */
function flightStartAtVehicle(vehicle: VehicleState): FlightStart {
  const [longitude, latitude] = webMercatorUtils.xyToLngLat(
    vehicle.position.x,
    vehicle.position.y,
  );
  return {
    longitude,
    latitude,
    altitudeM: vehicle.position.z,
    headingDeg: vehicle.heading,
    speedMps: vehicle.speed,
  };
}
let noticeTimer = 0;

/** Resolve a fleet asset against the demo URL so nested routes work when hosted. */
const modelUrl = (name: string) => new URL('../../models/fleet/' + name, document.baseURI).href;
/** Format the component's metres-per-second values for this demo's km/h labels. */
const kmh = (mps: number) => Math.round(mps * 3.6).toLocaleString('en') + ' km/h';
/** Update button text, accessible name, and icon together for the current flight action. */
const setFlyLabel = (text: string) => {
  fly.querySelector('span')!.textContent = text;
  // Mobile hides the text, so keep both the icon and accessible name in sync.
  fly.setAttribute('aria-label', text);
  fly.querySelector('calcite-icon')!.icon = text === 'Pause' ? 'pause' : 'play';
};

/** Show a short-lived status message and replace any earlier notice timer. */
function showNotice(message: string): void {
  notice.textContent = message;
  notice.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 2400);
}

/** Place a floating selector below its trigger while keeping it inside the viewport. */
function positionPanel(panel: HTMLElement, trigger: HTMLElement): void {
  const triggerBox = trigger.getBoundingClientRect();
  const panelBox = panel.getBoundingClientRect();
  panel.style.top = `${Math.min(triggerBox.bottom + 10, innerHeight - panelBox.height - 12)}px`;
  panel.style.left = `${Math.max(12, Math.min(triggerBox.right - panelBox.width, innerWidth - panelBox.width - 12))}px`;
}

/** Hide one selector and optionally return focus when it was inside the dialog. */
function closePanel(panel: HTMLElement, trigger: HTMLButtonElement, restoreFocus = false): void {
  const containedFocus = panel.contains(document.activeElement);
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus && containedFocus) trigger.focus();
}

/** Ensure the aircraft and weather popovers are mutually exclusive. */
function closePanels(restoreFocus = false): void {
  closePanel(aircraftPanel, aircraftTrigger, restoreFocus);
  closePanel(weatherPanel, weatherTrigger, restoreFocus);
}

/** Toggle a selector, close its sibling, then focus the current radio choice. */
function togglePanel(panel: HTMLElement, trigger: HTMLButtonElement): void {
  const open = panel.hidden;
  closePanels();
  if (!open) return;
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  positionPanel(panel, trigger);
  const checkedOption = panel.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
  (checkedOption ?? panel.querySelector<HTMLElement>('button'))?.focus();
}

// Selector listeners coordinate focus, outside-click dismissal, Escape, and viewport changes.
aircraftTrigger.addEventListener('click', () => togglePanel(aircraftPanel, aircraftTrigger));
weatherTrigger.addEventListener('click', () => togglePanel(weatherPanel, weatherTrigger));
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-close-panel]')) button.addEventListener('click', () => closePanels(true));
document.addEventListener('pointerdown', event => {
  if (!(event.target instanceof Node)) return;
  if (!aircraftPanel.contains(event.target) && !weatherPanel.contains(event.target)
    && !aircraftTrigger.contains(event.target) && !weatherTrigger.contains(event.target)) closePanels();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!aircraftPanel.hidden || !weatherPanel.hidden) {
    event.preventDefault();
    closePanels(true);
  }
});
window.addEventListener('resize', () => closePanels(true));

/** Refresh all labels, radio states, and power controls for one aircraft profile. */
function renderAircraftChoice(id: AircraftId): void {
  selected = id;
  const profile = AIRCRAFT[id];
  const info = aircraftCopy[id];
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-aircraft]')) {
    const checked = button.dataset.aircraft === id;
    button.setAttribute('aria-checked', String(checked));
    button.tabIndex = checked ? 0 : -1;
  }
  byId<HTMLImageElement>('active-aircraft-image').src = modelUrl(id + '.png');
  byId('aircraft-name').textContent = info.name;
  byId('aircraft-kind').textContent = info.kind;
  byId('aircraft-description').textContent = info.description;
  byId('aircraft-controls').textContent = info.controls;
  byId('cruise').textContent = kmh(profile.tuning.cruiseSpeed);
  byId('top-label').textContent = id === 'paraglider' ? 'Speed bar' : 'Turbo';
  byId('top-speed').textContent = kmh(profile.tuning.turboMaximumSpeed);
  byId('bank').textContent = profile.tuning.maximumBankDeg + ' degrees';
  byId('power-label').hidden = id === 'paraglider';
}

/**
 * Select an aircraft while preserving the current flight when a session already
 * exists; before first start, configure the chosen model and initial scene pose.
 * @param id Profile whose model assets, terrain ceiling, and tuning should be used.
 */
async function chooseAircraft(id: AircraftId): Promise<void> {
  const snapshot = flight.snapshot() ?? retainedSnapshot;
  if (snapshot) retainedSnapshot = snapshot;
  const previousSelected = selected;
  renderAircraftChoice(id);
  const profile = AIRCRAFT[id];
  const info = aircraftCopy[id];
  power.value = snapshot?.powerMode ?? 'normal';
  fly.disabled = camera.disabled = recover.disabled = power.disabled = true;
  setFlyLabel('Loading...');
  status.textContent = 'Loading ' + info.name + '...';

  const assets = {
    bodyUrl: modelUrl(id + (id === 'classic' ? '-body' : '') + '.glb'),
    propellerUrl: id === 'classic' ? modelUrl('classic-propeller.glb') : null,
    boostUrl: id === 'paraglider' ? null : modelUrl(id + '-boost.glb'),
    propellerAnchorM: { x: 0, y: 2.48, z: .025 },
    preserveFinish: true,
    visualPitchDeg: id === 'classic' ? 6 : 0,
  };
  const terrain = { maximumAglM: id === 'space-jet' ? 200000 : 50000 };
  if (flight.snapshot()) {
    const request = ++aircraftSwapRequest;
    aircraftSwapPending = true;
    try {
      // Swap the GLB in the existing flight scene so the world and camera stay put.
      const changed = await flight.setAircraft({ flight: { model: id }, assets, terrain });
      if (!changed || request !== aircraftSwapRequest) return;
      power.value = flight.snapshot()?.powerMode ?? 'normal';
      status.textContent = aircraftCopy[id].name + ' in flight. Click the scene to steer.';
    } catch (error) {
      if (request === aircraftSwapRequest) {
        renderAircraftChoice(previousSelected);
        status.textContent = 'Aircraft could not load: ' + (error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (request === aircraftSwapRequest) {
        aircraftSwapPending = false;
        fly.disabled = camera.disabled = recover.disabled = power.disabled = false;
      }
    }
    return;
  }

  // Before the first session exists, configure its model and initial scene position.
  flight.config = {
    autoStart: true,
    flight: { model: id },
    powerMode: snapshot?.powerMode ?? 'normal',
    start: snapshot
      ? flightStartAtVehicle(snapshot.vehicle)
      : { ...initialFlightStart, speedMps: profile.tuning.cruiseSpeed },
    terrain,
    camera: { mode: snapshot?.cameraMode ?? 'chase' },
    assets,
  };
}

/** Apply the arrow/Home/End keys used by both custom radio groups in this demo. */
function moveRadioSelection(
  event: KeyboardEvent,
  buttons: HTMLButtonElement[],
  select: (button: HTMLButtonElement) => void,
): void {
  const current = buttons.indexOf(event.currentTarget as HTMLButtonElement);
  if (current < 0) return;
  let next: number | undefined;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % buttons.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = buttons.length - 1;
  if (next === undefined) return;
  event.preventDefault();
  select(buttons[next]);
  buttons[next].focus();
}

// Keep click and keyboard selection behavior aligned with native radio-group expectations.
const aircraftButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-aircraft]')];
for (const button of aircraftButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.aircraft;
    if (AIRCRAFT_IDS.includes(id as AircraftId)) chooseAircraft(id as AircraftId);
    closePanels(true);
  });
  button.addEventListener('keydown', event => moveRadioSelection(event, aircraftButtons, next => {
    const id = next.dataset.aircraft;
    if (AIRCRAFT_IDS.includes(id as AircraftId)) chooseAircraft(id as AircraftId);
  }));
}

// Mirror component readiness, errors, and snapshots into the visible flight controls.
flight.addEventListener('arcgisPlaneNavigationReady', () => {
  fly.disabled = camera.disabled = recover.disabled = power.disabled = false;
  setFlyLabel('Pause');
  status.textContent = aircraftCopy[selected].name + ' starting. Click the scene to steer.';
});
flight.addEventListener('arcgisPlaneNavigationError', event => { status.textContent = 'Aircraft could not load: ' + event.detail.error.message; });
flight.addEventListener('arcgisPlaneNavigationSnapshot', event => {
  const snapshot = event.detail.snapshot;
  retainedSnapshot = snapshot;
  byId('speed').textContent = kmh(snapshot.vehicle.speed);
  setFlyLabel(snapshot.phase === 'running' ? 'Pause' : snapshot.phase === 'paused' ? 'Resume' : 'Start');
  camera.setAttribute('aria-pressed', String(snapshot.cameraMode === 'cockpit'));
  power.value = snapshot.powerMode;
  if (!aircraftSwapPending) {
    status.textContent = aircraftCopy[selected].name + (snapshot.phase === 'running' ? ' in flight. Click the scene to steer.' : ' ready.');
  }
});
// These handlers delegate state changes to the component instead of duplicating flight logic here.
fly.addEventListener('click', async () => {
  if (flight.status === 'running') flight.pause();
  else if (flight.status === 'paused') flight.resume();
  else await flight.start();
});
camera.addEventListener('click', () => flight.setCameraMode(flight.snapshot()?.cameraMode === 'cockpit' ? 'chase' : 'cockpit', flight.status !== 'running'));
recover.addEventListener('click', () => flight.recover());
power.addEventListener('change', () => flight.setPowerMode(power.value as 'slow' | 'normal' | 'turbo'));

const buildingsLayer = new SceneLayer({
  id: 'sky-tour-buildings',
  title: 'Esri 3D Buildings',
  url: 'https://basemaps3d.arcgis.com/arcgis/rest/services/Esri3D_Buildings_v1/SceneServer/layers/0',
  popupEnabled: false,
  visible: false,
});

/** Add the optional Esri buildings only after the scene view is ready. */
async function initializeBuildings(): Promise<void> {
  await scene.view.when();
  scene.map!.add(buildingsLayer);
  await buildingsLayer.load();
  await scene.view.whenLayerView(buildingsLayer);
  buildingsButton.disabled = false;
  setSceneTime(Number(weatherTime.value));
}

// The buildings layer remains loaded after first use; later clicks only toggle visibility.
buildingsButton.addEventListener('click', () => {
  buildingsLayer.visible = !buildingsLayer.visible;
  buildingsButton.setAttribute('aria-pressed', String(buildingsLayer.visible));
  buildingsButton.setAttribute('aria-label', `${buildingsLayer.visible ? 'Hide' : 'Show'} Esri 3D Buildings`);
  showNotice(buildingsLayer.visible ? '3D buildings shown' : '3D buildings hidden');
});

/** Apply a weather preset to both the scene environment and its selector UI. */
function setWeather(id: WeatherId): void {
  const preset = weatherPresets[id];
  selectedWeather = id;
  scene.view.environment.weather = { ...preset.weather };
  scene.view.environment.background = new ColorBackground({ color: preset.color });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-weather]')) {
    const checked = button.dataset.weather === id;
    button.setAttribute('aria-checked', String(checked));
    button.tabIndex = checked ? 0 : -1;
  }
  byId('active-weather-icon').setAttribute('icon', preset.icon);
  weatherTrigger.setAttribute('aria-label', 'Choose weather and time. Current: ' + preset.label);
  showNotice(preset.label + ' weather selected');
}

// Share the aircraft selector's roving-tabindex and arrow-key behavior.
const weatherButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-weather]')];
for (const button of weatherButtons) {
  button.addEventListener('click', () => { setWeather(button.dataset.weather as WeatherId); closePanels(true); });
  button.addEventListener('keydown', event => moveRadioSelection(event, weatherButtons, next => {
    setWeather(next.dataset.weather as WeatherId);
  }));
}

/** Display a minute-of-day value, retaining the slider's explicit 24:00 endpoint. */
function formatTime(minutes: number): string {
  if (minutes === 1440) return '24:00';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Update the scene's sun date from the selected local solar time at the departure. */
function setSceneTime(minutes: number): void {
  weatherTimeValue.value = formatTime(minutes);
  const lighting = scene.view.environment.lighting;
  if (lighting.type !== 'sun') return;
  const date = new Date(lighting.date);
  date.setUTCHours(0, 0, 0, 0);
  // Convert local solar time at 112.112 W to UTC for ArcGIS sun lighting.
  date.setUTCMinutes(minutes - Math.round(initialFlightStart.longitude * 4));
  lighting.date = date;
  weatherTrigger.setAttribute('aria-label', `Choose weather and time. Current: ${weatherPresets[selectedWeather].label}, ${formatTime(minutes)}`);
}

weatherTime.addEventListener('input', () => setSceneTime(Number(weatherTime.value)));
weatherNoon.addEventListener('click', () => {
  weatherTime.value = '720';
  setSceneTime(720);
  weatherTime.focus();
});

/** Remove markup from ArcGIS attribution fragments before drawing them into a PNG. */
function plainAttribution(text: string): string {
  const holder = document.createElement('span');
  holder.innerHTML = text;
  return (holder.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Break long provider-credit text into canvas lines that fit the screenshot width. */
function wrapText(context: CanvasRenderingContext2D, value: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(' ')) {
    const candidate = line ? line + ' ' + word : word;
    if (line && context.measureText(candidate).width > width) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Export the live scene image with the current provider credits rendered beneath
 * it, since ArcGIS scene screenshots do not include the surrounding app chrome.
 */
async function captureScene(): Promise<void> {
  captureButton.disabled = true;
  try {
    const view = scene.view;
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const shot = await view.takeScreenshot({ format: 'png', ignorePadding: true, width: Math.round(view.width * ratio), height: Math.round(view.height * ratio) });
    const credit = [...new Set(view.attributionItems.map(item => plainAttribution(item.text)).filter(Boolean))].join(' | ') || 'Powered by Esri';
    const padding = Math.round(12 * ratio);
    const lineHeight = Math.round(17 * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = shot.data.width;
    canvas.height = 1;
    let context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.font = `${Math.max(11, Math.round(11 * ratio))}px system-ui, sans-serif`;
    const lines = wrapText(context, credit, canvas.width - padding * 2);
    canvas.height = shot.data.height + padding * 2 + lines.length * lineHeight;
    context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.putImageData(shot.data, 0, 0);
    context.fillStyle = '#102934';
    context.fillRect(0, shot.data.height, canvas.width, canvas.height - shot.data.height);
    context.fillStyle = '#f5fbfd';
    context.font = `${Math.max(11, Math.round(11 * ratio))}px system-ui, sans-serif`;
    lines.forEach((line, index) => context!.fillText(line, padding, shot.data.height + padding + index * lineHeight));
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed.')), 'image/png'));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'arcgis-sky-tour-' + new Date().toISOString().slice(0, 10) + '.png';
    link.href = url;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice('Scene picture saved');
  } catch (error) {
    console.error(error);
    showNotice('Scene picture could not be saved');
  } finally {
    captureButton.disabled = false;
  }
}

// Initialize the selected aircraft, optional scene layer, weather, and default-open selector.
captureButton.addEventListener('click', () => { void captureScene(); });
chooseAircraft('classic');
void initializeBuildings().catch(error => {
  console.error(error);
  buildingsButton.title = 'Esri 3D Buildings unavailable';
  buildingsButton.setAttribute('aria-label', 'Esri 3D Buildings unavailable');
  showNotice('3D Buildings could not be loaded');
});
setWeather('clear');
// Wait for the page layout to settle so the default-open panel aligns with its toolbar button.
requestAnimationFrame(() => {
  aircraftPanel.hidden = false;
  aircraftTrigger.setAttribute('aria-expanded', 'true');
  positionPanel(aircraftPanel, aircraftTrigger);
});
// Pause during BFCache suspension, but fully stop when the document is discarded.
let resumeAfterHistoryRestore = false;
window.addEventListener('pagehide', event => {
  if (event.persisted) {
    resumeAfterHistoryRestore = flight.status === 'running';
    flight.pause();
    return;
  }
  flight.stop();
});
window.addEventListener('pageshow', event => {
  if (event.persisted && resumeAfterHistoryRestore && flight.status === 'paused') flight.resume();
  resumeAfterHistoryRestore = false;
});
