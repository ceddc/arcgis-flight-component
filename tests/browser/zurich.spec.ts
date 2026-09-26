/**
 * Exercises the Zurich demo in a real browser against its public LV95 scene.
 * It checks projected coordinates, terrain and buildings, flight restart,
 * and cleanup that leaves the caller's map and view alive.
 */
import { expect, test } from "@playwright/test";
import type { ArcgisPlaneNavigationElement } from "../../src/index";

/** Confirms Swiss projected coordinates, visible terrain, and flight lifecycle behavior. */
test("Zurich loads its WebScene and starts one removable flight session", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) errors.push(message.text());
  });
  await page.goto("/demos/zurich/");
  const component = page.locator("arcgis-plane-navigation");
  await expect(component).toHaveAttribute("status", "running", { timeout: 90_000 });
  await component.evaluate(element => (element as ArcgisPlaneNavigationElement).pause());
  await page.getByRole("button", { name: "Recover", exact: true }).click();
  const initial = await component.evaluate(element => {
    const f = element as ArcgisPlaneNavigationElement;
    const v = f.view!;
    const scale = v.spatialReference.metersPerUnit;
    const debug = f.debugSnapshot()!;
    return {
      wkid: v.spatialReference.wkid, mode: v.viewingMode, scale,
      position: debug.planePosition,
    };
  });
  expect(initial.wkid).toBe(2056);
  expect(initial.mode).toBe("local");
  expect(initial.scale).toBe(1);
  expect(initial.position.z).toBe(650);

  // Sample the central skyline, excluding the information card and toolbar.
  await expect.poll(async () => {
    const screenshot = await page.screenshot();
    return page.evaluate(async base64 => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(image.width / 4, image.height * 0.4, image.width / 2, image.height * 0.3);
      const colors = new Set<string>();
      for (let i = 0; i < data.length; i += 64) colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
      return colors.size;
    }, screenshot.toString("base64"));
  }, { timeout: 30_000 }).toBeGreaterThan(12);

  await page.getByRole("button", { name: "Continue flying", exact: true }).click();
  await expect(component).toHaveAttribute("status", "running");
  await expect.poll(() => component.evaluate(element => {
    const p = (element as ArcgisPlaneNavigationElement).debugSnapshot()!.planePosition;
    return p.y;
  })).toBeGreaterThan(initial.position.y + 5);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
  await expect(component).toHaveAttribute("status", "paused");
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(component).toHaveAttribute("status", "running");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(component).toHaveAttribute("status", "paused");
  await page.getByRole("button", { name: "Switch to cockpit view" }).click();
  await expect.poll(() => component.evaluate(element => (element as ArcgisPlaneNavigationElement).debugSnapshot()?.aircraftVisible)).toBe(false);
  await page.getByRole("button", { name: "Switch to exterior view" }).click();
  await expect.poll(() => component.evaluate(element => (element as ArcgisPlaneNavigationElement).debugSnapshot()?.aircraftVisible)).toBe(true);
  await page.getByRole("button", { name: "Recover", exact: true }).click();
  const recovered = await component.evaluate(element => (element as ArcgisPlaneNavigationElement).debugSnapshot()!.planePosition);
  expect(recovered.z).toBe(650);
  await expect(component).toHaveAttribute("status", "paused");

  const cleanup = await component.evaluate(element => {
    const f = element as ArcgisPlaneNavigationElement;
    const v = f.view!, map = v.map!, buildings = map.layers.getItemAt(0)!;
    f.remove();
    return { viewAlive: !v.destroyed, mapAlive: !map.destroyed, buildingsAlive: !buildings.destroyed && map.layers.includes(buildings), flightLayers: map.layers.filter(l => l.title === "Plane navigation").length };
  });
  expect(cleanup).toEqual({ viewAlive: true, mapAlive: true, buildingsAlive: true, flightLayers: 0 });
  expect(errors).toEqual([]);
});
