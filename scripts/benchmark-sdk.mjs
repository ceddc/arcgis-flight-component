/**
 * Runs repeated headed-browser performance captures against the SDK matrix.
 * Each run records host/browser identity, frame timing, visible aircraft and
 * cockpit evidence, SDK loading, teardown checks, screenshots, and raw data.
 * Set SDK_VERSIONS/SDK_SECONDS/SDK_REPEATS/SDK_WARMUP/SDK_OUTPUT to tune a run.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { cpus, totalmem } from 'node:os';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const installedSdk = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).devDependencies['@arcgis/core'];
const versions = (process.env.SDK_VERSIONS ?? '4.29,4.30,4.31,4.32,4.33,4.34,5.0,' + installedSdk).split(',');
const seconds = Number(process.env.SDK_SECONDS ?? 60);
const repeats = Number(process.env.SDK_REPEATS ?? 2);
const warmupSeconds = Number(process.env.SDK_WARMUP ?? 15);
const output = resolve(process.env.SDK_OUTPUT ?? 'output/playwright/sdk-matrix');
await mkdir(output, { recursive: true });
const componentRoot = resolve('dist/component');
const fixtureRoot = resolve('tests/sdk');
const componentSha256 = createHash('sha256').update(await readFile(resolve(componentRoot, 'arcgis-flight-component.js'))).digest('hex');
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css' };
// Serve only the built component and its SDK fixture. Resolved paths must stay
// under one of those roots so a malformed request cannot read other files.
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const root = url.pathname.startsWith('/component/') ? componentRoot : fixtureRoot;
  const name = url.pathname.startsWith('/component/') ? url.pathname.slice(11) : url.pathname.slice(1) || 'fixture.html';
  const path = resolve(root, name);
  if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try { const content = await readFile(path); response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content); }
  catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const results = [];
console.log(JSON.stringify({ base, versions, seconds, repeats, warmupSeconds, output }));
try {
  for (let repeat = 0; repeat < repeats; repeat++) {
    // Reverse the second pass to reduce systematic first/last version bias.
    for (const sdk of repeat % 2 ? [...versions].reverse() : versions) {
      const key = `${sdk}-run${repeat + 1}`;
      const browser = await chromium.launch({ headless: false });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const errors = [], warnings = [], sdkRoots = new Set();
      page.on('pageerror', error => { errors.push(error.message); console.log(JSON.stringify({ key, stage: 'pageerror', error: error.message })); });
      page.on('console', message => {
        if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text());
        if (message.type() === 'warning') warnings.push(message.text());
      });
      page.on('request', request => { const match = request.url().match(/^https:\/\/js\.arcgis\.com\/([^/]+)\//); if (match) sdkRoots.add(match[1]); });
      let result = { requestedSdk: sdk, repeat: repeat + 1, browser: browser.version(), seconds, warmupSeconds, viewport: { width: 1280, height: 720, deviceScaleFactor: 1 } };
      try {
        // Initialization and warm-up are outside the measured interval. The
        // second begin() below starts the capture that feeds frame percentiles.
        await page.goto(`${base}/fixture.html?sdk=${sdk}`);
        await page.waitForFunction(() => !!window.flightBenchmark || !!window.fixtureError, null, { timeout: 120_000 });
        const fixtureError = await page.evaluate(() => window.fixtureError);
        if (fixtureError) throw new Error(fixtureError);
        result.actualSdk = await page.evaluate(() => window.flightBenchmark.version);
        result.gpu = await page.evaluate(() => window.flightBenchmark.gpu);
        console.log(JSON.stringify({ key, stage: 'warmup', actualSdk: result.actualSdk }));
        await page.evaluate(() => window.flightBenchmark.begin());
        await page.waitForTimeout(warmupSeconds * 1000);
        await page.evaluate(() => window.flightBenchmark.end());
        result.before = await page.evaluate(() => window.flightBenchmark.begin());
        for (let elapsed = 0; elapsed < seconds; elapsed += 30) {
          await page.waitForTimeout(Math.min(30, seconds - elapsed) * 1000);
          console.log(JSON.stringify({ key, stage: 'measuring', elapsed: Math.min(elapsed + 30, seconds) }));
        }
        const raw = await page.evaluate(() => window.flightBenchmark.end());
        // Frame FPS includes all simulation frames; renderedFps reflects frames
        // actually presented by the view. Percentiles expose stutter separately.
        const sorted = [...raw.frameTimes].sort((a, b) => a - b);
        const sum = raw.frameTimes.reduce((a, b) => a + b, 0);
        const presentSorted = [...raw.presentationTimes].sort((a, b) => a - b);
        result = { ...result, status: 'measured', fps: raw.frameTimes.length * 1000 / sum, renderedFps: raw.renderedFrames * 1000 / raw.elapsedMs, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], p99Ms: sorted[Math.ceil(sorted.length * 0.99) - 1], presentationP95Ms: presentSorted[Math.ceil(presentSorted.length * 0.95) - 1], over50Ms: sorted.filter(value => value > 50).length, over100Ms: sorted.filter(value => value > 100).length, afterHeapBytes: raw.heapBytes, debug: raw.debug };
        await writeFile(resolve(output, `${key}-frames.json`), JSON.stringify(raw.frameTimes));
        await page.evaluate(() => window.flightBenchmark.fixedPose());
        await page.waitForTimeout(1000);
        await page.screenshot({ path: resolve(output, `${key}-chase.png`) });
        await page.evaluate(() => window.flightBenchmark.fixedPose(false, 15));
        await page.waitForTimeout(1000);
        await page.screenshot({ path: resolve(output, `${key}-chase-turn.png`) });
        result.aircraftAtTurn = await page.evaluate(() => window.flightBenchmark.aircraftPixelsAtTurn());
        await page.evaluate(() => window.flightBenchmark.fixedPose(true));
        await page.waitForTimeout(1000);
        result.cockpit = await page.evaluate(() => window.flightBenchmark.navigation.debugSnapshot());
        await page.screenshot({ path: resolve(output, `${key}-cockpit.png`) });
        result.teardown = await page.evaluate(() => window.flightBenchmark.teardown());
        result.compatibility = {
          aircraftFollowsCamera: result.aircraftAtTurn.visible,
          renderedFrames: result.renderedFps > 1,
          cameraRoll: result.cockpit.sceneRoll.disabled === false && result.cockpit.sceneRoll.renderCount > 0 && Math.abs(result.cockpit.cameraFrame.roll) > 1,
          singleSdk: sdkRoots.size === 1 && sdkRoots.has(sdk),
        };
        if (Object.values(result.compatibility).some(value => value !== true)) result.status = 'unsupported';
        if (Object.values(result.teardown.checks).some(value => value !== true)) result.status = 'failed-teardown';
      } catch (error) {
        result.status = 'failed'; result.failure = error.message;
        await page.screenshot({ path: resolve(output, `${key}-failure.png`) }).catch(() => {});
      } finally {
        result.errors = [...new Set(errors)]; result.warnings = [...new Set(warnings)]; result.sdkRoots = [...sdkRoots];
        if (result.errors.length && result.status === 'measured') result.status = 'measured-with-errors';
        await browser.close();
        results.push(result);
        await writeFile(resolve(output, `${key}.json`), JSON.stringify(result, null, 2));
        await writeFile(resolve(output, 'results.json'), JSON.stringify({ recordedAt: new Date().toISOString(), componentSha256, hardware: { cpu: cpus()[0].model, logicalProcessors: cpus().length, ramBytes: totalmem() }, methodology: { seconds, repeats, warmupSeconds, scene: '194 fixed graphics; no remote terrain or imagery; identical circular presentation replay; headed Chromium; sequential fresh browsers' }, results }, null, 2));
        console.log(JSON.stringify({ key, status: result.status, actualSdk: result.actualSdk, fps: result.fps, p95Ms: result.p95Ms, p99Ms: result.p99Ms, failure: result.failure, errors: result.errors }));
      }
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
if (results.some(result => result.status !== 'measured')) process.exitCode = 1;
