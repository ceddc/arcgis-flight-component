import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { rollup } from 'rollup';
import { build } from 'vite';

// Every distribution contains only the flight component and its aircraft assets.
// Production ESM variants prune APIs missing from the selected host SDK family.
const input = 'dist/lib/arcgis-flight-component.js';
const directory = 'dist/component';
await mkdir(directory, { recursive: true });
const esm = await readFile(input, 'utf8');
if (esm.includes('@arcgis/map-components')) {
  throw new Error('The component-only entry must not load ArcGIS map components.');
}
await writeFile(`${directory}/arcgis-flight-component.js`, esm);
const bundle = await rollup({
  input,
  external: (id) => id.startsWith('@arcgis/core/'),
});
try {
  await bundle.write({
    file: `${directory}/arcgis-flight-component.amd.js`,
    format: 'amd',
    exports: 'named',
    // Reuse the host SDK through its existing esri/* loader.
    paths: (id) => id.startsWith('@arcgis/core/')
      ? id.replace('@arcgis/core/', 'esri/').replace(/\.js$/, '')
      : id,
  });
} finally {
  await bundle.close();
}
const profiles = [
  { target: '4.30', missing: ['geometry/operators/projectOperator.js', 'geometry/support/meshUtils.js'] },
  { target: '4.32', missing: ['geometry/projection.js', 'geometry/support/meshUtils.js'] },
  { target: '5.1', missing: ['geometry/projection.js'] },
];
for (const { target, missing } of profiles) {
  await build({ configFile: 'vite.lib.config.ts', mode: 'sdk-' + target });
  const output = await readFile(directory + '/arcgis-flight-component.sdk-' + target + '.js', 'utf8');
  for (const module of missing) {
    if (output.includes('@arcgis/core/' + module)) {
      throw new Error('SDK ' + target + ' ESM build retained an unavailable API: ' + module);
    }
  }
}
const sizes = {};
for (const filename of ['arcgis-flight-component.js', 'arcgis-flight-component.amd.js',
  ...profiles.map(({ target }) => 'arcgis-flight-component.sdk-' + target + '.js')]) {
  const content = await readFile(`${directory}/${filename}`);
  sizes[filename] = { bytes: content.length, gzipBytes: gzipSync(content).length };
}
await writeFile(`${directory}/sizes.json`, JSON.stringify(sizes, null, 2) + '\n');
console.log(JSON.stringify({ directory, sdkBundled: false, sizes }));
