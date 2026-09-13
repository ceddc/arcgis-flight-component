import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/docs-site",
  },
  preview: {
    host: "0.0.0.0",
    port: 3117,
    strictPort: false,
  },
});
