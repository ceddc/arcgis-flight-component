/**
 * Defines the destinations and Calcite navigation markup shared by generated
 * documentation and demo pages. Relative links are resolved from each page's
 * site root so the same menu works at different route depths.
 */
const destinations = [
  { id: "docs", label: "Docs", title: "Documentation", path: "index.html" },
  { id: "simple", label: "Basic flight", title: "Basic flight demo", path: "demos/simple/", demo: true },
  { id: "simple-controls", label: "Flight controls", title: "Flight controls demo", path: "demos/simple-controls/", demo: true },
  { id: "webscene-selector", label: "Scene explorer", title: "Scene explorer demo", path: "demos/webscene-selector/", demo: true },
  { id: "aircraft", label: "Other aircraft", title: "Other aircraft demo", path: "demos/aircraft/", demo: true },
  { id: "zurich", label: "Zurich local scene", title: "Zurich local scene demo", path: "demos/zurich/", demo: true },
  { id: "github", label: "GitHub", title: "GitHub repository", path: "https://github.com/ceddc/arcgis-flight-component" },
];

/**
 * Renders the Calcite desktop navigation and, on sample pages, its mobile menu.
 *
 * @param {string} root Relative prefix for local pages (for example "./").
 * @param {string} active Destination id used to mark the current page.
 * @returns {string} HTML fragment inserted inside the page's navigation shell.
 */
export function siteNavigation(root, active) {
  // Samples use the same destinations in a compact menu on phones.
  const mobileMenu = active === "docs" ? "" : '<calcite-dropdown slot="content-end" class="sample-menu" placement="bottom-end" width="m" scale="l">'
    + '<calcite-action slot="trigger" icon="hamburger" text="Samples and documentation"></calcite-action>'
    + '<calcite-dropdown-group selection-mode="none">' + destinations.map(({ id, label, path }) =>
      '<calcite-dropdown-item href="' + (path.startsWith("https://") ? path : root + path) + '"'
      + (id === active ? ' aria-current="page" icon-start="check"' : '') + '>' + label + '</calcite-dropdown-item>',
    ).join("") + '</calcite-dropdown-group></calcite-dropdown>';
  const links = destinations.map(({ id, label, title, path, demo }) => {
    const href = path.startsWith("https://") ? path : root + path;
    const text = demo ? '<span>' + label + '<span class="site-navigation-demo"> demo</span></span>' : label;
    return '<calcite-button href="' + href + '" appearance="transparent" kind="' + (id === active ? 'brand' : 'neutral')
      + '" scale="s" label="' + title + '"' + (id === active ? ' aria-current="page"' : '') + '>' + text + '</calcite-button>';
  }).join("");
  return mobileMenu + '<calcite-navigation slot="navigation-secondary" scale="s" class="site-navigation-bar">'
    + '<nav slot="content-start" class="site-navigation" aria-label="Documentation, samples, and source">' + links + '</nav>'
    + '</calcite-navigation>';
}
