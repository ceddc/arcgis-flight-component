import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { build } from "vite";
import { siteNavigation } from "./site-navigation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.resolve(repositoryRoot, "dist", "docs-site");
const siteAssetsDirectory = path.resolve(repositoryRoot, "docs", "site");
const documentationImagesDirectory = path.resolve(repositoryRoot, "docs", "images");
const githubSourceRoot = "https://github.com/ceddc/arcgis-flight-component/blob/main/";
const packageManifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const projectVersion = String(packageManifest.version);
const arcgisSdkRange = String(
  packageManifest.peerDependencies?.["@arcgis/core"]
    ?? packageManifest.devDependencies?.["@arcgis/core"]
    ?? "not declared",
);

const pages = [
  { group: "Start here", title: "Overview", source: "README.md", output: "index.html" },
  { group: "Start here", title: "Getting started", source: "docs/getting-started.md", output: "getting-started.html" },
  { group: "Start here", title: "Flight concepts", source: "docs/flight-concepts.md", output: "flight-concepts.html" },
  { group: "Start here", title: "Custom aircraft", source: "docs/custom-aircraft.md", output: "custom-aircraft.html" },
  { group: "Start here", title: "Sample guide", source: "docs/demo.md", output: "demo.html" },
  { group: "Reference", title: "SDK integration", source: "docs/sdk-compatibility.md", output: "sdk-compatibility.html" },
  { group: "Start here", title: "Recipes", source: "docs/configuration-recipes.md", output: "configuration-recipes.html" },
  { group: "Reference", title: "Configuration", source: "docs/configuration.md", output: "configuration.html" },
  { group: "Reference", title: "API reference", source: "docs/api-reference.md", output: "api-reference.html" },
  { group: "Reference", title: "Troubleshooting", source: "docs/troubleshooting.md", output: "troubleshooting.html" },
  { group: "Contribute", title: "Architecture", source: "docs/architecture.md", output: "architecture.html" },
  { group: "Contribute", title: "Development", source: "docs/development.md", output: "development.html" },
];

function assertSafeOutputPath() {
  const expectedParent = `${repositoryRoot}${path.sep}`;
  if (!outputDirectory.startsWith(expectedParent) || path.basename(outputDirectory) !== "docs-site") {
    throw new Error(`Refusing to replace unexpected output path: ${outputDirectory}`);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripMarkup(value) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section";
}

function addHeadingIds(html) {
  const seen = new Map();
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_match, level, content) => {
    const base = slugify(content);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    return `<h${level} id="${id}">${content}<a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`;
  });
}

function decorateCodeBlocks(html) {
  return html
    .replace(/<pre><code/g, '<div class="code-shell"><button class="copy-button" type="button">Copy</button><pre><code')
    .replace(/<\/code><\/pre>/g, "</code></pre></div>");
}

function resolveInternalLinks(html, page) {
  const sourceDirectory = path.dirname(path.resolve(repositoryRoot, page.source));
  return html.replace(/href="([^"]+)"/g, (match, href) => {
    if (/^(?:[a-z]+:|#|\/)/i.test(href)) return match;
    const [linkPath, fragment = ""] = href.split("#", 2);
    if (!linkPath) return match;
    const target = path.resolve(sourceDirectory, decodeURIComponent(linkPath));
    const targetPage = pages.find((candidate) => (
      path.resolve(repositoryRoot, candidate.source) === target
    ));
    const suffix = fragment ? `#${fragment}` : "";
    if (targetPage) return `href="${targetPage.output}${suffix}"`;
    const relativeSource = path.relative(repositoryRoot, target).replaceAll(path.sep, "/");
    if (!relativeSource.startsWith("..")) {
      return `href="${githubSourceRoot}${relativeSource}${suffix}"`;
    }
    return match;
  });
}

function resolveInternalMedia(html, page) {
  const sourceDirectory = path.dirname(path.resolve(repositoryRoot, page.source));
  return html.replace(/src="([^"]+)"/g, (match, source) => {
    if (/^(?:[a-z]+:|\/|#)/i.test(source)) return match;
    const target = path.resolve(sourceDirectory, decodeURIComponent(source));
    const relativeImage = path.relative(documentationImagesDirectory, target);
    if (!relativeImage.startsWith("..") && !path.isAbsolute(relativeImage)) {
      return `src="images/${relativeImage.replaceAll(path.sep, "/")}"`;
    }
    return match;
  });
}

function navigation(activeOutput) {
  const groups = Array.from(new Set(pages.map((page) => page.group)));
  return groups.map((group) => {
    const links = pages
      .filter((page) => page.group === group)
      .map((page) => {
        const current = page.output === activeOutput ? ' aria-current="page"' : "";
        return `<li><a href="${page.output}"${current}>${escapeHtml(page.title)}</a></li>`;
      })
      .join("");
    return `<section class="nav-group"><h2>${escapeHtml(group)}</h2><ul>${links}</ul></section>`;
  }).join("");
}

function pageTemplate(page, content) {
  const description = `ArcGIS Flight Component documentation: ${page.title}.`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="color-scheme" content="light">
    <meta name="theme-color" content="#ffffff">
    <title>${escapeHtml(page.title)} | ArcGIS Flight Component</title>
    <link rel="stylesheet" href="doc-assets/docs-ui.css?v=${uiRevision}">
    <script type="module" src="doc-assets/docs-ui.js?v=${uiRevision}"></script>
  </head>
  <body class="calcite-mode-light">
    <a class="skip-link" href="#content">Skip to documentation</a>
    <calcite-navigation class="app-header" scale="s" aria-label="ArcGIS Flight">
      <calcite-navigation-logo slot="logo" icon="plane" heading="ArcGIS Flight" description="Documentation"></calcite-navigation-logo>
      <div slot="content-end" class="header-actions">
        <calcite-button class="menu-button" appearance="transparent" scale="s" icon-start="list" aria-label="Documentation contents" aria-controls="site-nav" aria-expanded="false">Contents</calcite-button>
      </div>
      ${siteNavigation("./", "docs")}
    </calcite-navigation>
    <div class="shell">
      <aside class="sidebar" id="site-nav">
        <label class="search-label" for="doc-search">Search documentation</label>
        <input id="doc-search" type="search" autocomplete="off" placeholder="Search">
        <div id="search-results" class="search-results" hidden></div>
        <nav aria-label="Documentation topics">${navigation(page.output)}</nav>
        <p class="project-version">v${escapeHtml(projectVersion)} / SDK ${escapeHtml(arcgisSdkRange)}</p>
      </aside>
      <main id="content" class="content" tabindex="-1">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Documentation</a><span aria-hidden="true">/</span><span>${escapeHtml(page.title)}</span></nav>
        <article>${content}</article>
        <footer class="page-footer">
          <span>Source: <code>${escapeHtml(page.source)}</code></span>
          <a href="${githubSourceRoot}${page.source}">View on GitHub</a>
        </footer>
      </main>
    </div>
  </body>
</html>`;
}

assertSafeOutputPath();
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await build({
  configFile: false,
  publicDir: false,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  logLevel: "warn",
  build: {
    outDir: path.join(outputDirectory, "doc-assets"),
    emptyOutDir: false,
    lib: { entry: path.join(siteAssetsDirectory, "entry.ts"), formats: ["es"], fileName: "docs-ui", cssFileName: "docs-ui" },
  },
});
const uiAssets = await Promise.all(["docs-ui.css", "docs-ui.js"].map(file =>
  readFile(path.join(outputDirectory, "doc-assets", file)),
));
const uiRevision = uiAssets.reduce((hash, bytes) => hash.update(bytes), createHash("sha256"))
  .digest("hex").slice(0, 12);
await cp(documentationImagesDirectory, path.join(outputDirectory, "images"), { recursive: true });

const searchIndex = [];
for (const page of pages) {
  const markdown = await readFile(path.join(repositoryRoot, page.source), "utf8");
  const parsed = marked.parse(markdown, { gfm: true });
  if (typeof parsed !== "string") throw new Error(`Unexpected asynchronous Markdown output for ${page.source}.`);
  const content = decorateCodeBlocks(
    addHeadingIds(resolveInternalLinks(resolveInternalMedia(parsed, page), page)),
  );
  await writeFile(path.join(outputDirectory, page.output), pageTemplate(page, content), "utf8");
  searchIndex.push({
    title: page.title,
    url: page.output,
    text: stripMarkup(markdown).slice(0, 12_000),
  });
}

await writeFile(
  path.join(outputDirectory, "search-index.json"),
  `${JSON.stringify(searchIndex, null, 2)}\n`,
  "utf8",
);
await cp(path.join(repositoryRoot, "docs", "llms.txt"), path.join(outputDirectory, "llms.txt"));

console.log(`Built ${pages.length} documentation pages in ${path.relative(repositoryRoot, outputDirectory)}.`);
