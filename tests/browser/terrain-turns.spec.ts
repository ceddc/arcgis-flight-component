import { expect, test } from "@playwright/test";
import type { ArcgisPlaneNavigationElement } from "../../src/index";

interface TerrainTile { key: string }
interface TerrainSurface {
  _loadTile(tile: TerrainTile): unknown;
  _unloadTile(tile: TerrainTile): unknown;
  _updateAllTilesStatus: unknown;
}
interface TurnRun {
  laps: number;
  turned: number;
  reloads: number[];
}
declare global { interface Window { __componentTerrainTurns: TurnRun } }

// A continuous turn used to unload the terrain behind the plane and load the
// same tiles on every lap. Measure actual SDK loads, not just the hook status.
test("Matterhorn turns keep loaded terrain and release the host hook on stop", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/demos/simple/");
  const flight = page.locator("arcgis-plane-navigation");
  await expect(flight).toHaveAttribute("status", "running", { timeout: 90_000 });
  await page.locator("arcgis-scene").evaluate(element => {
    (element as HTMLArcgisSceneElement).view.qualityProfile = "high";
  });
  await page.waitForTimeout(2_500);
  await flight.evaluate(element => {
    const controller = element as ArcgisPlaneNavigationElement;
    const view = document.querySelector("arcgis-scene")!.view;
    const surface = (view as unknown as { basemapTerrain: TerrainSurface }).basemapTerrain;
    const load = surface._loadTile;
    const unload = surface._unloadTile;
    const unloaded = new Set<string>();
    const run: TurnRun = { laps: 0, turned: 0, reloads: [0] };
    window.__componentTerrainTurns = run;
    surface._loadTile = function(tile) {
      if (unloaded.delete(tile.key)) run.reloads[run.laps] = (run.reloads[run.laps] ?? 0) + 1;
      return load.call(this, tile);
    };
    surface._unloadTile = function(tile) {
      unloaded.add(tile.key);
      return unload.call(this, tile);
    };
    let heading = view.camera.heading;
    const tick = () => {
      const current = view.camera.heading;
      // Wrapped headings such as 359 -> 1 represent a two-degree turn.
      run.turned += Math.abs(((current - heading + 540) % 360) - 180);
      heading = current;
      run.laps = Math.floor(run.turned / 360);
      if (run.laps < 3) requestAnimationFrame(tick);
      else {
        controller.setControlPatch({ bank: 0, yaw: 0 });
        controller.pause();
        surface._loadTile = load;
        surface._unloadTile = unload;
      }
    };
    controller.setControlPatch({ bank: 1, yaw: 0.3 });
    requestAnimationFrame(tick);
  });
  await page.waitForFunction(() => window.__componentTerrainTurns.laps >= 3, null, { timeout: 80_000 });
  const result = await flight.evaluate(element => ({
    ...window.__componentTerrainTurns,
    retention: (element as ArcgisPlaneNavigationElement).debugSnapshot()!.terrainDetailRetention,
  }));
  expect(result.retention).toMatchObject({ status: "active", outOfView: true });
  expect(result.retention!.outOfViewHeldDecisions).toBeGreaterThan(0);
  // The first lap loads the surroundings. Later laps should reuse them;
  // native selection reloaded about 500 tiles per lap in the same demo.
  expect(result.reloads[1] ?? 0).toBeLessThanOrEqual(40);
  expect(result.reloads[2] ?? 0).toBeLessThanOrEqual(40);
  await page.screenshot({ path: testInfo.outputPath("matterhorn-terrain-turns.png") });
  const restored = await flight.evaluate(element => {
    const view = document.querySelector("arcgis-scene")!.view;
    const surface = (view as unknown as { basemapTerrain: TerrainSurface }).basemapTerrain;
    (element as ArcgisPlaneNavigationElement).stop();
    return !Object.hasOwn(surface, "_updateAllTilesStatus");
  });
  expect(restored).toBe(true);
  expect(errors).toEqual([]);
});
