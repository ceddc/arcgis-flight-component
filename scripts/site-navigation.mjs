const destinations = [
  { id: "docs", label: "Docs", title: "Documentation", path: "index.html" },
  { id: "simple", label: "Basic flight", title: "Basic flight demo", path: "demos/simple/" },
  { id: "simple-controls", label: "Flight controls", title: "Flight controls demo", path: "demos/simple-controls/" },
  { id: "webscene-selector", label: "Scene explorer", title: "Scene explorer demo", path: "demos/webscene-selector/" },
];

export function siteNavigation(root, active) {
  const links = destinations.map(({ id, label, title, path }) =>
    '<calcite-button href="' + root + path + '" appearance="transparent" kind="' + (id === active ? 'brand' : 'neutral')
    + '" scale="s" label="' + title + '"' + (id === active ? ' aria-current="page"' : '') + '>' + (id === 'docs' ? label : '<span>' + label + '<span class="site-navigation-demo"> demo</span></span>') + '</calcite-button>',
  ).join("");
  return '<calcite-navigation slot="navigation-secondary" scale="s" class="site-navigation-bar">'
    + '<nav slot="content-start" class="site-navigation" aria-label="Documentation and samples">' + links + '</nav>'
    + '</calcite-navigation>';
}
