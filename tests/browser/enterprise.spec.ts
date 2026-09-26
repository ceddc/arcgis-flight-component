/**
 * Checks the Flight controls demo against its public SITG Geneva services.
 * It verifies scene-layer startup and browser history restoration.
 */
import { expect, test } from "@playwright/test";

/** Confirms SITG layers and flight survive BFCache restoration. */
test("Flight controls load Geneva's 3D buildings and resume after history restore", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) errors.push(message.text());
  });

  await page.goto("/demos/simple-controls/");
  const flight = page.locator("arcgis-plane-navigation");
  await expect(flight).toHaveAttribute("status", "running", { timeout: 120_000 });

  const sceneState = await page.locator("arcgis-scene").evaluate(element => {
    const view = (element as HTMLArcgisSceneElement).view;
    return {
      viewingMode: view.viewingMode,
      imagery: view.map!.basemap!.baseLayers.at(0)?.title,
      terrain: view.map!.ground?.layers.at(0)?.title,
      layers: view.map!.layers.map(layer => layer.title).toArray(),
      flightLayers: view.map!.layers.filter(layer => layer.title === "Plane navigation").length,
    };
  });
  expect(sceneState).toEqual({
    viewingMode: "global",
    imagery: "SITG orthophotos 2024",
    terrain: "SITG terrain 2023",
    layers: ["SITG buildings", "SITG landmarks", "SITG Jet d'Eau", "Plane navigation"],
    flightLayers: 1,
  });

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
  await expect(flight).toHaveAttribute("status", "paused");
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(flight).toHaveAttribute("status", "running");
  expect(errors).toEqual([]);
});
