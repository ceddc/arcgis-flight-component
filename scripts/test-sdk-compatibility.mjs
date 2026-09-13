import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from '@playwright/test';

// Override with SDK_FUNCTIONAL_CASES="4.32:amd:3857,5.1.24:esm:2056".
// A fourth field, "terrain", also checks the caller's flat ground elevation.
const installedSdk = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).devDependencies['@arcgis/core'];
const defaultCases = '4.30:amd:2056,4.32:amd:3857,4.30:esm:2056,4.31:esm:2056,4.32:esm:2056,5.0:esm:2056,' + installedSdk + ':esm:2056';
const cases = (process.env.SDK_FUNCTIONAL_CASES ?? defaultCases).split(',').map(value => {
  const [sdk, loader, wkidText, ground] = value.trim().split(':');
  const wkid = Number(wkidText);
  if (!/^\d+\.\d+(\.\d+)?$/.test(sdk) || !['amd', 'esm'].includes(loader)
      || ![3857, 2056].includes(wkid) || (ground !== undefined && ground !== 'terrain')) {
    throw new Error('Invalid functional case: ' + value);
  }
  return { sdk, loader, wkid, terrain: ground === 'terrain' };
});
const output = resolve(process.env.SDK_FUNCTIONAL_OUTPUT ?? 'output/playwright/sdk-functional');
const componentRoot = resolve('dist/component');
const fixtureRoot = resolve('tests/sdk');
await mkdir(output, { recursive: true });
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const component = url.pathname.startsWith('/component/');
  const root = component ? componentRoot : fixtureRoot;
  const name = component ? url.pathname.slice(11) : url.pathname.slice(1) || 'functional.html';
  const path = resolve(root, name);
  if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const content = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const displacement = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
console.log(JSON.stringify({ base, cases, output }));

try {
  for (const testCase of cases) {
    const { sdk, loader, wkid, terrain } = testCase;
    const key = sdk + '-' + loader + '-' + wkid + (terrain ? '-terrain' : '');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errors = [], warnings = [], sdkRoots = new Set();
    let esmSdkRequested = false;
    const result = { ...testCase, browser: browser.version(), status: 'failed' };
    let tornDown = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text());
      if (message.type() === 'warning') warnings.push(message.text());
    });
    page.on('request', request => {
      const match = request.url().match(/^https:\/\/js\.arcgis\.com\/([^/]+)\/(.*)/);
      if (!match) return;
      sdkRoots.add(match[1]);
      if (match[2].startsWith('@arcgis/core/')) esmSdkRequested = true;
    });
    try {
      const query = new URLSearchParams({ sdk, loader, wkid: String(wkid), terrain: String(terrain) });
      await page.goto(base + '/functional.html?' + query);
      await page.waitForFunction(() => !!window.flightCompatibility || !!window.functionalError, null, { timeout: 120_000 });
      const initialization = await page.evaluate(() => ({
        error: window.functionalError,
        version: window.flightCompatibility?.version,
        initial: window.flightCompatibility?.initial,
      }));
      assert(!initialization.error, initialization.error);
      result.actualSdk = initialization.version;
      result.initial = initialization.initial;
      assert(result.actualSdk === sdk || result.actualSdk.startsWith(sdk + '.'), 'Unexpected host SDK version');
      for (const key of ['readyUsesHostView', 'usesHostSdkClasses', 'controlsMounted', 'sceneComponentNotLoaded', 'projectionCorrect', 'terrainCorrect']) {
        assert(result.initial[key], 'Initial compatibility check failed: ' + key);
      }
      console.log(JSON.stringify({ key, stage: 'keyboard-and-controls', actualSdk: result.actualSdk }));

      const before = await page.evaluate(() => window.flightCompatibility.navigation.snapshot());
      await page.getByRole('button', { name: 'Continue flying', exact: true }).click();
      await page.locator('#view').focus();
      await page.keyboard.down('d');
      try {
        await page.waitForFunction(origin => {
          const snapshot = window.flightCompatibility.navigation.snapshot();
          return Math.abs(snapshot.vehicle.bank) > 18
            && Math.hypot(snapshot.vehicle.position.x - origin.x, snapshot.vehicle.position.y - origin.y) > 100;
        }, before.vehicle.position, { timeout: 10_000 });
        result.motion = await page.evaluate(() => ({
          snapshot: window.flightCompatibility.navigation.snapshot(),
          debug: window.flightCompatibility.navigation.debugSnapshot(),
        }));
        await page.getByRole('button', { name: 'Pause', exact: true }).click();
      } finally { await page.keyboard.up('d'); }
      assert(result.motion.snapshot.simulationStep > before.simulationStep, 'Keyboard flight did not advance the simulation');
      assert(displacement(result.motion.snapshot.vehicle.position, before.vehicle.position) > 100, 'Aircraft did not move');
      assert(Math.abs(result.motion.snapshot.vehicle.bank) > 18, 'Native keyboard input did not bank the aircraft');

      const paused = await page.evaluate(() => window.flightCompatibility.navigation.snapshot());
      await page.waitForTimeout(300);
      const stillPaused = await page.evaluate(() => window.flightCompatibility.navigation.snapshot());
      result.pause = {
        paused: stillPaused.phase === 'paused',
        simulationStopped: stillPaused.simulationStep === paused.simulationStep,
        positionStopped: displacement(stillPaused.vehicle.position, paused.vehicle.position) === 0,
      };
      assert(Object.values(result.pause).every(Boolean), 'Pause did not stop flight simulation');
      result.aircraft = await page.evaluate(() => window.flightCompatibility.aircraftPixels());
      assert(result.aircraft.visible, 'Aircraft produced no meaningful visible pixels after keyboard-driven movement');
      await page.screenshot({ path: resolve(output, key + '-banked-chase.png') });

      await page.getByRole('button', { name: 'Switch to cockpit view', exact: true }).click();
      // Camera blending advances with presentation frames during normal flight.
      await page.getByRole('button', { name: 'Continue flying', exact: true }).click();
      await page.locator('#view').focus();
      await page.keyboard.down('d');
      try {
        await page.waitForFunction(() => {
          const debug = window.flightCompatibility.navigation.debugSnapshot();
          return debug.cameraFrame.transitionBlend > 0.999 && !debug.aircraftVisible
            && debug.sceneRoll.renderCount > 0 && Math.abs(debug.cameraFrame.roll) > 18;
        }, null, { timeout: 10_000 });
        await page.getByRole('button', { name: 'Pause', exact: true }).click();
      } finally { await page.keyboard.up('d'); }
      result.cockpit = await page.evaluate(() => window.flightCompatibility.cockpitEvidence());
      assert(result.cockpit.cockpitActive && result.cockpit.aircraftHidden && result.cockpit.rollRendered,
        'Cockpit did not hide the models and render banked camera roll');
      await page.screenshot({ path: resolve(output, key + '-cockpit.png') });
      const beforeResume = await page.evaluate(() => window.flightCompatibility.navigation.snapshot());

      await page.getByRole('button', { name: 'Continue flying', exact: true }).click();
      await page.waitForFunction(step => window.flightCompatibility.navigation.snapshot().simulationStep > step + 6,
        beforeResume.simulationStep, { timeout: 5000 });
      const resumed = await page.evaluate(() => window.flightCompatibility.navigation.snapshot());
      result.resume = {
        running: resumed.phase === 'running',
        moved: displacement(resumed.vehicle.position, beforeResume.vehicle.position) > 1,
      };
      assert(Object.values(result.resume).every(Boolean), 'Resume did not continue the same flight');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      result.teardown = await page.evaluate(() => window.flightCompatibility.teardown());
      tornDown = true;
      assert(Object.values(result.teardown.checks).every(Boolean), 'Caller-owned scene was not fully restored');
      await page.screenshot({ path: resolve(output, key + '-restored-host.png') });
      result.status = 'passed';
    } catch (error) {
      result.failure = error.message;
      await page.screenshot({ path: resolve(output, key + '-failure.png') }).catch(() => {});
    } finally {
      if (!tornDown) {
        await page.evaluate(async () => window.flightCompatibility?.teardown()).catch(() => {});
      }
      result.sdkRoots = [...sdkRoots];
      result.singleSdk = sdkRoots.size === 1 && sdkRoots.has(sdk);
      result.amdReusesHostLoader = loader !== 'amd' || !esmSdkRequested;
      result.errors = [...new Set(errors)];
      result.warnings = [...new Set(warnings)];
      if (result.status === 'passed' && (!result.singleSdk || !result.amdReusesHostLoader || result.errors.length)) {
        result.status = 'failed';
        result.failure = 'SDK identity, loading, or browser error check failed';
      }
      await browser.close();
      results.push(result);
      await writeFile(resolve(output, key + '.json'), JSON.stringify(result, null, 2));
      await writeFile(resolve(output, 'results.json'), JSON.stringify({
        recordedAt: new Date().toISOString(),
        scope: 'Functional checks only: public component lifecycle, native keyboard and controls, visible aircraft, cockpit roll, host SDK reuse, and optional EPSG:2056 projection. AMD validation uses the official ArcGIS SDK loader.',
        results,
      }, null, 2));
      console.log(JSON.stringify({ key, status: result.status, actualSdk: result.actualSdk, failure: result.failure }));
    }
  }
} finally { await new Promise(resolve => server.close(resolve)); }
if (results.some(result => result.status !== 'passed')) process.exitCode = 1;
