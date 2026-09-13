import { expect, test } from "@playwright/test";
import type { ArcgisPlaneNavigationElement } from "../../src/index";

test("manual flight, power modes and cockpit roll", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/demos/simple-controls/");
  const navigation = page.locator("arcgis-plane-navigation");
  await expect(navigation).toHaveAttribute("status", "running", { timeout: 90_000 });
  const snapshot = () => navigation.evaluate(element => (element as ArcgisPlaneNavigationElement).snapshot());

  await page.locator('[data-mode="slow"]').click();
  await expect.poll(async () => (await snapshot())?.powerMode).toBe("slow");
  await expect.poll(async () => (await snapshot())?.vehicle.speed).toBeLessThan(75);
  await page.locator('[data-mode="turbo"]').click();
  await expect.poll(async () => (await snapshot())?.vehicle.speed).toBeGreaterThan(200);
  const headingBefore = (await snapshot())!.vehicle.heading;
  await page.locator("arcgis-scene").click({ position: { x: 320, y: 240 } });
  await page.keyboard.down("d");
  try {
    await expect.poll(async () => (await snapshot())?.vehicle.bank).toBeGreaterThan(10);
    await expect.poll(async () => (await snapshot())!.vehicle.heading - headingBefore).toBeGreaterThan(2);
    await page.getByRole("button", { name: "Switch to cockpit view" }).click();
    await expect.poll(async () => (await snapshot())?.camera?.transitionBlend).toBeGreaterThan(0.999);
    await expect.poll(async () => (await snapshot())?.camera?.aircraftVisible).toBe(false);
    await expect.poll(async () => Math.abs((await snapshot())?.camera?.roll ?? 0)).toBeGreaterThan(5);
    await page.screenshot({ path: testInfo.outputPath("banked-cockpit.png") });
  } finally {
    await page.keyboard.up("d");
  }
  await page.getByRole("button", { name: "Switch to exterior view" }).click();
  await expect.poll(async () => (await snapshot())?.camera?.transitionBlend).toBeLessThan(0.001);
  await page.locator('[data-mode="normal"]').click();
  await expect.poll(async () => (await snapshot())?.powerMode).toBe("normal");
  await expect.poll(async () => (await snapshot())?.camera?.aircraftVisible).toBe(true);

  // Calcite's radio keyboard controls must retain focus without becoming flight input.
  await page.getByRole("radio", { name: "Cruise", exact: true }).press("ArrowRight");
  await expect.poll(async () => (await snapshot())?.powerMode).toBe("turbo");
  await page.getByRole("radio", { name: "Turbo", exact: true }).press("ArrowLeft");
  await expect.poll(async () => (await snapshot())?.powerMode).toBe("normal");

  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(navigation).toHaveAttribute("status", "paused");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Continue flying", exact: true })).toBeVisible();
  const actionBounds = await page.locator(".flight-actions calcite-button").evaluateAll(buttons =>
    buttons.map(button => ({ left: button.getBoundingClientRect().left, right: button.getBoundingClientRect().right })),
  );
  for (const bounds of actionBounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: testInfo.outputPath("mobile-paused-controls.png") });
  expect(errors).toEqual([]);
});

test("switching imagery and elevation presets restores cruise and keeps one aircraft", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/demos/webscene-selector/");
  const navigation = page.locator("arcgis-plane-navigation");
  await page.locator("calcite-list-item").filter({ hasText: "Redlands" }).click({ timeout: 15000 });
  await expect(navigation).toHaveAttribute("status", "running", { timeout: 90_000 });
  await page.locator('[data-mode="slow"]').click();
  await expect.poll(() => navigation.evaluate(element => (element as ArcgisPlaneNavigationElement).snapshot()?.vehicle.speed)).toBeLessThan(75);
  const first = await navigation.evaluate(element => {
    const controller = element as ArcgisPlaneNavigationElement;
    const view = controller.referenceElement!.view;
    return {
      powerMode: controller.snapshot()?.powerMode,
      speed: controller.snapshot()?.vehicle.speed,
      viewingMode: view.viewingMode,
      layerCount: controller.debugSnapshot()?.planeLayerCount,
      contentLayerTypes: view.map!.layers.map(layer => layer.type),
    };
  });
  expect(first).toMatchObject({ powerMode: "slow", viewingMode: "global", layerCount: 1, contentLayerTypes: ["graphics"] });
  expect(first.speed).toBeLessThan(75);
  await navigation.evaluate(element => (element as ArcgisPlaneNavigationElement).pause());
  await expect.poll(() => navigation.evaluate(element => (
    (element as ArcgisPlaneNavigationElement).referenceElement!.view.updating
  )), { timeout: 90_000 }).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("redlands-imagery.png") });
  await page.getByRole("button", { name: "Choose another starting point" }).click();
  await page.locator("calcite-list-item").filter({ hasText: "Matterhorn" }).click({ timeout: 15000 });
  await expect(navigation).toHaveAttribute("status", "running", { timeout: 90_000 });
  const global = await navigation.evaluate(element => {
    const controller = element as ArcgisPlaneNavigationElement;
    const view = controller.referenceElement!.view;
    return {
      powerMode: controller.snapshot()?.powerMode,
      viewingMode: view.viewingMode,
      webMercator: view.spatialReference.isWebMercator,
      layerCount: controller.debugSnapshot()?.planeLayerCount,
      contentLayerTypes: view.map!.layers.map(layer => layer.type),
    };
  });
  expect(global).toEqual({ powerMode: "normal", viewingMode: "global", webMercator: true, layerCount: 1, contentLayerTypes: ["graphics"] });
  await navigation.evaluate(element => (element as ArcgisPlaneNavigationElement).pause());
  await expect.poll(() => navigation.evaluate(element => (
    (element as ArcgisPlaneNavigationElement).referenceElement!.view.updating
  )), { timeout: 90_000 }).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("matterhorn-after-redlands.png") });
  expect(errors).toEqual([]);
});
