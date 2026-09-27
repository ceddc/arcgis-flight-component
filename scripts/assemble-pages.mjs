/**
 * Combines generated documentation, Vite demo assets, and browser-module
 * distributions into the single directory used by GitHub Pages publication.
 * The docs are copied last at the site root; component bundles and demo output
 * remain available under their own URLs.
 */
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const documentationDirectory = path.join(repositoryRoot, "dist", "docs-site");
const pagesDirectory = path.join(repositoryRoot, "dist", "pages");

if (
  path.dirname(pagesDirectory) !== path.join(repositoryRoot, "dist")
  || path.basename(pagesDirectory) !== "pages"
) {
  throw new Error(`Unexpected GitHub Pages output path: ${pagesDirectory}`);
}

/**
 * Recursively copies a source tree into a destination, creating directories
 * and replacing same-named files while preserving unrelated destination files.
 *
 * @param {string} source Existing directory to read.
 * @param {string} destination Directory to merge into.
 */
async function mergeDirectory(source, destination) {
  await mkdir(destination, { recursive: true });

  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await mergeDirectory(sourcePath, destinationPath);
    } else {
      await cp(sourcePath, destinationPath, { force: true });
    }
  }
}

// Vite has already written the demos, the browser entry under browser/, and their
// shared modules and assets. Keep that output intact and merge the documentation
// over it so the documentation becomes the site root.
await mergeDirectory(documentationDirectory, pagesDirectory);
await mergeDirectory(path.join(repositoryRoot, "dist", "component"), path.join(pagesDirectory, "component"));

// A direct module URL has no Vite-generated HTML to load its extracted CSS.
// Follow the entry's static imports in the manifest, in dependency order, and
// expose those styles through one stable URL without including demo page styles.
const manifest = JSON.parse(
  await readFile(path.join(pagesDirectory, ".vite", "manifest.json"), "utf8"),
);
const visitedChunks = new Set();
const browserStyles = new Set();

/**
 * Follows a Vite entry's static import graph and accumulates its extracted CSS.
 * A set prevents repeated traversal when multiple chunks share dependencies.
 *
 * @param {string} entryName Key in Vite's generated manifest.
 */
function collectBrowserStyles(entryName) {
  if (visitedChunks.has(entryName)) return;
  visitedChunks.add(entryName);
  const entry = manifest[entryName];
  for (const dependency of entry.imports ?? []) collectBrowserStyles(dependency);
  for (const stylesheet of entry.css ?? []) browserStyles.add(stylesheet);
}

collectBrowserStyles("src/browser.ts");
await writeFile(
  path.join(pagesDirectory, "browser", "arcgis-flight-component.css"),
  [...browserStyles].map((stylesheet) => '@import "../' + stylesheet + '";').join("\n") + "\n",
  "utf8",
);
await writeFile(path.join(pagesDirectory, ".nojekyll"), "", "utf8");

console.log("Assembled GitHub Pages documentation, demos, and browser module in dist/pages.");
