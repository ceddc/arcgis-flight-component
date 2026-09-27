/**
 * Exercises the aircraft showcase against a live ArcGIS scene in a browser.
 * The checks cover aircraft selection, building and weather controls, flight
 * state, image export, and errors surfaced by the page.
 */
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { ArcgisPlaneNavigationElement } from '../../src/index';

/** Exercises visible controls against a live ArcGIS scene and checks runtime errors. */
test('Other aircraft controls change aircraft, buildings, weather, and save a picture', async ({ page }) => {
 const errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('console', message => {
  if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) errors.push(message.text());
 });

 await page.goto('/demos/aircraft/');
 const flight = page.locator('arcgis-plane-navigation');
 await expect(flight).toHaveAttribute('status', 'running', { timeout: 90_000 });

 const buildingsButton = page.getByRole('button', { name: 'Show Esri 3D Buildings' });
 await expect(buildingsButton).toBeEnabled({ timeout: 90_000 });
 await buildingsButton.click();
 const buildingsState = await page.locator('arcgis-scene').evaluate(async element => {
  const view = (element as HTMLArcgisSceneElement).view;
  const layer = view.map!.layers.find(candidate => candidate.id === 'sky-tour-buildings');
  if (!layer) return null;
  await layer.load();
  const layerView = await view.whenLayerView(layer);
  return { visible: layer.visible, loadStatus: layer.loadStatus, hasLayerView: Boolean(layerView) };
 });
 expect(buildingsState).toEqual({ visible: true, loadStatus: 'loaded', hasLayerView: true });

 await page.getByRole('button', { name: /Choose weather/ }).click();
 await page.getByRole('radio', { name: 'Rain', exact: true }).click();
 await expect(page.getByRole('button', { name: /Choose weather and time/ })).toBeFocused();
 const weather = await page.locator('arcgis-scene').evaluate(element =>
  (element as HTMLArcgisSceneElement).view.environment.weather?.type);
 expect(weather).toBe('rainy');

 await page.getByRole('button', { name: /Choose weather and time/ }).click();
 const lightingBefore = await page.locator('arcgis-scene').evaluate(element => {
  const lighting = (element as HTMLArcgisSceneElement).view.environment.lighting;
  return lighting.type === 'sun' ? lighting.date.getTime() : 0;
 });
 await page.locator('#weather-time').fill('1080');
 await expect(page.locator('#weather-time-value')).toHaveText('18:00');
 const lightingAfter = await page.locator('arcgis-scene').evaluate(element => {
  const lighting = (element as HTMLArcgisSceneElement).view.environment.lighting;
  return lighting.type === 'sun' ? lighting.date.getTime() : 0;
 });
 expect(lightingAfter).not.toBe(lightingBefore);

 const aircraftTrigger = page.getByRole('button', { name: 'Choose aircraft', exact: true });
 await aircraftTrigger.click();
 await expect(page.getByRole('radio', { name: /Classic/ })).toBeFocused();
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('radio', { name: /Super Jet/ })).toBeFocused();
 await expect(page.getByRole('radio', { name: /Super Jet/ })).toHaveAttribute('aria-checked', 'true');
 await page.keyboard.press('Escape');
 await expect(aircraftTrigger).toBeFocused();
 await aircraftTrigger.click();
 await page.getByRole('radio', { name: /Space Jet/ }).click();
 await expect(aircraftTrigger).toBeFocused();
 await expect(flight).toHaveAttribute('status', 'running', { timeout: 90_000 });
 await expect(page.locator('#cruise')).toHaveText('2,340 km/h');
 await expect(page.locator('#top-speed')).toHaveText('36,000 km/h');

 const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Save picture', exact: true }).click(),
 ]);
 expect(download.suggestedFilename()).toMatch(/^arcgis-sky-tour-\d{4}-\d{2}-\d{2}\.png$/);
 const downloadPath = await download.path();
 expect(downloadPath).not.toBeNull();
 const png = await readFile(downloadPath!);
 expect(png.byteLength).toBeGreaterThan(10_000);
 expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

 await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
 await expect(flight).toHaveAttribute('status', 'paused');
 await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
 await expect(flight).toHaveAttribute('status', 'running');
 expect(await flight.evaluate(element => (element as ArcgisPlaneNavigationElement).status)).toBe('running');
 expect(errors).toEqual([]);
});
