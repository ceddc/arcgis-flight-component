/**
 * Builds the standalone documentation preview into dist/docs-site, the input
 * later assembled with demos for Pages. Preview binds to the configured host
 * and port for local inspection of generated documentation.
 */
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
