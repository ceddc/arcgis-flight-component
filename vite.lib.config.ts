import { defineConfig } from "vite";

const sdkTargets = new Set(["4.30", "4.32", "5.1"]);

export default defineConfig(({ mode }) => {
  const requestedTarget = mode.startsWith("sdk-") ? mode.slice(4) : "runtime";
  if (requestedTarget !== "runtime" && !sdkTargets.has(requestedTarget)) {
    throw new Error(`Unknown component SDK target: ${requestedTarget}`);
  }
  const productionVariant = requestedTarget !== "runtime";
  return {
    define: { __ARCGIS_FLIGHT_SDK_TARGET__: JSON.stringify(requestedTarget) },
    build: {
      outDir: productionVariant ? "dist/component" : "dist/lib",
      emptyOutDir: false,
      lib: {
        entry: "src/index.ts",
        formats: ["es"],
        fileName: productionVariant
          ? `arcgis-flight-component.sdk-${requestedTarget}`
          : "arcgis-flight-component",
      },
      rollupOptions: {
        external: (id) => id.startsWith("@arcgis/") || id.startsWith("@esri/"),
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
