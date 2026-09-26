/**
 * Main Vite configuration for the local demo server and multi-page production
 * bundle. Also wires generated navigation into HTML and filters the
 * development SDK branch to the installed ArcGIS SDK version.
 */
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { siteNavigation } from "./scripts/site-navigation.mjs";
import { defineConfig, transformWithEsbuild } from "vite";

/** Resolve a project-relative path from this config, independent of shell cwd. */
const projectFile = (relativePath: string): string => fileURLToPath(
  new URL(relativePath, import.meta.url),
);

export default defineConfig({
  // This distribution bundles the installed SDK 5.1 and excludes removed 4.x modules.
  define: { __ARCGIS_FLIGHT_SDK_TARGET__: JSON.stringify("5.1") },
  // Prune unavailable SDK branches before the dev server analyzes imports.
  // Production Rollup builds already remove these branches.
  plugins: [{
    name: "flight-site-navigation",
    // Add navigation to every page using links relative to that page.
    transformIndexHtml(html, context) {
      const sample = context.filename.replaceAll("\\", "/").split("/demos/")[1]?.split("/")[0];
      return html.replace("<!-- site-navigation -->", siteNavigation(sample ? "../../" : "./", sample ?? "docs"));
    },
    // Serve generated documentation pages from the built docs tree during Vite development.
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const { pathname, search } = new URL(request.url ?? "/", "http://localhost");
        const file = pathname === "/" ? "/index.html" : pathname;
        if (/^\/(?:[^/]+\.html|search-index\.json|llms\.txt|doc-assets\/[^/]+|images\/[^/]+)$/.test(file)
          && existsSync(projectFile("./dist/docs-site" + file))) {
          request.url = "/dist/docs-site" + file + search;
        }
        next();
      });
    },
  }, {
    name: "flight-sdk-development-imports",
    apply: "serve",
    enforce: "pre",
    // Replace the compile-time SDK target before dependency analysis sees the branch.
    transform(source, id) {
      if (!id.replaceAll("\\", "/").endsWith("/src/arcgis/sdk-compatibility.ts")) return;
      return transformWithEsbuild(source, id, {
        loader: "ts",
        define: { __ARCGIS_FLIGHT_SDK_TARGET__: JSON.stringify("5.1") },
        minifySyntax: true,
      });
    },
  }],
  optimizeDeps: {
    esbuildOptions: {
      define: { __ARCGIS_FLIGHT_SDK_TARGET__: JSON.stringify("5.1") },
      minifySyntax: true,
    },
  },
  base: "./",
  server: {
    host: "0.0.0.0",
    allowedHosts: [".ts.net"],
    port: 3116,
    strictPort: false,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: [".ts.net"],
    port: 3116,
    strictPort: false,
  },
  build: {
    manifest: true,
    rollupOptions: {
      // The public browser entry shares the demos' ArcGIS modules. Preserve its
      // exports so consumers can also import configuration helpers by URL.
      preserveEntrySignatures: "exports-only",
      output: {
        // Group the scene component's static dependencies into one shared file.
        // ArcGIS features loaded through dynamic imports remain on demand.
        manualChunks: {
          "arcgis-scene": ["@arcgis/map-components/components/arcgis-scene"],
        },
        entryFileNames: (chunk) => chunk.name === "flightComponent"
          ? "browser/arcgis-flight-component.js"
          : "assets/[name]-[hash].js",
      },
      input: {
        flightComponent: projectFile("./src/browser.ts"),
        samples: projectFile("./index.html"),
        simple: projectFile("./demos/simple/index.html"),
        simpleControls: projectFile("./demos/simple-controls/index.html"),
        aircraft: projectFile("./demos/aircraft/index.html"),
        zurich: projectFile("./demos/zurich/index.html"),
        enterprise: projectFile("./demos/enterprise/index.html"),
        websceneSelector: projectFile("./demos/webscene-selector/index.html"),
      },
    },
  },
});
