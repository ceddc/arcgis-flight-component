import { defineConfig } from "vitest/config";

export default defineConfig({
  // Tests use the installed SDK; migration boundaries inject their own module loaders.
  define: { __ARCGIS_FLIGHT_SDK_TARGET__: JSON.stringify("5.1") },
  test: {
    include: ["src/**/*.test.ts", "demos/**/*.test.ts"],
    exclude: [".tmp/**", "node_modules/**", "dist/**"],
  },
});
