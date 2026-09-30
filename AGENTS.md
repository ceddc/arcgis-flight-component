# ArcGIS Flight Component

## Project

`<arcgis-plane-navigation>` adds aircraft, camera, and flight controls to an
application-owned ArcGIS 3D scene. Samples and documentation are published at
https://ceddc.github.io/arcgis-flight-component/.

Use Node.js 20 or later and npm. The project uses TypeScript, Vite, Vitest,
Playwright, ArcGIS SDK 5.1.24, and Calcite 5.1.2. The component supports SDK
versions `>=4.30 <5.2` through its SDK-specific builds.

## Structure

- `src/components/`: custom element, attributes, toolbar, and joystick.
- `src/controller/`, `src/core/`: flight sessions and deterministic flight/camera math.
- `src/arcgis/`: rendering, camera updates, terrain, SDK integration, and cleanup.
- `src/input/`, `src/i18n/`: controls and component translations.
- `demos/`: sample applications; shared UI is in `demos/shared/`.
- `docs/`, `docs/site/`: documentation source and site UI.
- `scripts/`: component, metadata, documentation, and Pages builds.
- Unit tests sit beside source files; browser tests are in `tests/browser/`.

## Commands and checks

- `npm ci`, then `npm run dev`: docs and samples at `http://127.0.0.1:3116/`.
- `npm test -- <path>`: focused unit tests; `npm run typecheck`: TypeScript checks.
- `npm run verify`: unit tests, type checks, and all builds before a pull request.
- Flight/camera math changes: also run `npm run test:ab`; preserve reference recordings unless flight behavior intentionally changes.
- Sample UI or lifecycle changes: run the relevant `npm run test:browser -- <file>` and inspect the affected sample in a real browser.
- SDK/build changes: run the relevant `npm run test:sdk` checks.
- Documentation changes: `npm run docs:build` and inspect generated links/pages.
- `npm run build:pages`: assemble `dist/pages/` locally.
- `npm run deploy:pages`: build locally and publish the generated `gh-pages` branch.

## Constraints

- Keep the view, map, and application layers caller-owned. Clean up only component resources and restore borrowed state when appropriate.
- Present aircraft and camera together; assign a complete `Camera` to `view.camera` rather than using `goTo()` in the flight loop.
- Keep ArcGIS external in component-only builds. Revalidate the guarded aircraft-origin, frame-budget, and terrain-retention adapters when updating the SDK.
- Global scenes retain nearby terrain during flight; out-of-view retention is desktop only. Exhaust shader warm-up is cancellable, bounded to two seconds, and must never block cleanup.
- Reject missing/non-finite elevation; never substitute zero for unknown ground.
- Keep scene search, authentication, and page layout in the samples/host application. The Scene Explorer picker stays visible; the fleet sample is named Other aircraft.
- Analytics are injected only during publication from the git-ignored `site-analytics.local.html`; keep tracking out of source, local builds, and component exports.
- See `docs/development.md` for implementation details and `docs/sdk-compatibility.md` for supported SDK integration.
