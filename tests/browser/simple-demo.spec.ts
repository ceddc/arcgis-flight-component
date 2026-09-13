import { expect, test } from "@playwright/test";
import type { ArcgisPlaneNavigationElement } from "../../src/index";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";

interface ListenerStats {
  adds: Record<string, number>;
  removes: Record<string, number>;
}

declare global {
  interface Window {
    __flightOwnership: {
      map: HTMLArcgisSceneElement["map"];
      view: HTMLArcgisSceneElement["view"];
      callerLayer: GraphicsLayer;
      hostLayerCount: number;
    };
    __flightListenerStats: ListenerStats;
  }
}

test("simple demo owns one removable flight session without an empty accessible object", async ({ page }) => {
  const fatalErrors: string[] = [];
  page.on("pageerror", (error) => fatalErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!message.location().url.endsWith("/favicon.ico")) fatalErrors.push(text);
  });

  await page.goto("/demos/simple/");
  const component = page.locator("arcgis-plane-navigation");
  const scene = page.locator("arcgis-scene");
  await expect(component).toHaveAttribute("status", "running", { timeout: 90_000 });
  await expect.poll(() => component.evaluate((element) => (
    (element as ArcgisPlaneNavigationElement).debugSnapshot()?.planeLayerCount
  ))).toBe(1);

  const sceneImage = await scene.screenshot();
  const imageVariation = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return 0;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(
      Math.floor(image.width * 0.1),
      Math.floor(image.height * 0.1),
      Math.floor(image.width * 0.8),
      Math.floor(image.height * 0.7),
    ).data;
    let minimum = 255;
    let maximum = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const luminance = (pixels[index] ?? 0)
        + (pixels[index + 1] ?? 0)
        + (pixels[index + 2] ?? 0);
      minimum = Math.min(minimum, luminance / 3);
      maximum = Math.max(maximum, luminance / 3);
    }
    return maximum - minimum;
  }, sceneImage.toString("base64"));
  expect(imageVariation).toBeGreaterThan(20);

  const accessibilityTree = await page.locator("body").ariaSnapshot();
  expect(accessibilityTree).not.toContain('generic "Plane navigation"');
  await expect(component).not.toHaveAttribute("aria-label", /.+/);

  const ownership = await component.evaluate((element) => {
    const controller = element as ArcgisPlaneNavigationElement;
    const hostScene = document.querySelector("arcgis-scene")!;
    const map = hostScene.map!;
    const view = hostScene.view;
    const ownedLayer = map.layers.find((layer) => layer.title === "Plane navigation");
    if (!ownedLayer) throw new Error("Flight layer is missing.");
    const GraphicsLayerClass = ownedLayer.constructor as typeof GraphicsLayer;
    const callerLayer = new GraphicsLayerClass({ title: "Caller-owned test layer" });
    map.add(callerLayer);
    if (!map.layers.includes(callerLayer)) throw new Error("Caller layer was not added.");
    const hostLayerCount = map.layers.filter((layer) => layer.title !== "Plane navigation").length;
    window.__flightOwnership = { map, view, callerLayer, hostLayerCount };
    controller.stop();
    return {
      hostLayerCount,
      stoppedLayerCount: map.layers.filter((layer) => layer.title === "Plane navigation").length,
    };
  });
  expect(ownership.stoppedLayerCount).toBe(0);
  await expect(component).toHaveAttribute("status", "idle");

  await component.evaluate(async (element) => {
    const controller = element as ArcgisPlaneNavigationElement;
    const sceneElement = document.querySelector("arcgis-scene")!;
    const view = sceneElement.view;
    const stats: ListenerStats = { adds: {}, removes: {} };
    window.__flightListenerStats = stats;
    view.on = new Proxy(view.on, {
      apply(target, receiver, args) {
        const name = String(args[0]);
        stats.adds[name] = (stats.adds[name] ?? 0) + 1;
        const handle = Reflect.apply(target, receiver, args) as ReturnType<typeof view.on>;
        return {
          remove() {
            stats.removes[name] = (stats.removes[name] ?? 0) + 1;
            handle.remove();
          },
        };
      },
    });
    await controller.start();
  });
  await expect(component).toHaveAttribute("status", "running", { timeout: 90_000 });
  await expect.poll(() => component.evaluate((element) => (
    (element as ArcgisPlaneNavigationElement).debugSnapshot()?.planeLayerCount
  ))).toBe(1);

  const componentHandle = await component.elementHandle();
  expect(componentHandle).not.toBeNull();
  await component.evaluate((element) => element.remove());
  await expect.poll(() => page.locator("arcgis-scene").evaluate((element) => {
    const sceneElement = element as HTMLArcgisSceneElement;
    return sceneElement.map!.layers.filter((layer) => layer.title === "Plane navigation").length;
  })).toBe(0);
  await page.locator("body").evaluate(
    (body, element) => body.append(element),
    componentHandle!,
  );
  await expect(component).toHaveAttribute("status", "running", { timeout: 90_000 });

  const finalState = await component.evaluate((element) => {
    const controller = element as ArcgisPlaneNavigationElement;
    const sceneElement = document.querySelector("arcgis-scene")!;
    const expected = window.__flightOwnership;
    const beforeStop = controller.debugSnapshot()!;
    controller.stop();
    const result = {
      beforeStopLayerCount: beforeStop.planeLayerCount,
      mapPreserved: sceneElement.map === expected.map,
      viewPreserved: sceneElement.view === expected.view,
      callerLayerPreserved: sceneElement.map!.layers.includes(expected.callerLayer)
        && !expected.callerLayer.destroyed,
      hostLayerCount: sceneElement.map!.layers.filter(
        (layer) => layer.title !== "Plane navigation",
      ).length,
      stats: window.__flightListenerStats,
    };
    sceneElement.map!.remove(expected.callerLayer);
    expected.callerLayer.destroy();
    return result;
  });
  expect(finalState.beforeStopLayerCount).toBe(1);
  expect(finalState.mapPreserved).toBe(true);
  expect(finalState.viewPreserved).toBe(true);
  expect(finalState.callerLayerPreserved).toBe(true);
  expect(finalState.hostLayerCount).toBe(ownership.hostLayerCount);
  for (const name of ["drag", "mouse-wheel", "double-click", "key-down"]) {
    expect(finalState.stats.adds[name]).toBe(2);
    expect(finalState.stats.removes[name]).toBe(2);
  }
  expect(fatalErrors).toEqual([]);
});
