/**
 * Generate editor metadata for the public custom element from one description
 * of its HTML attributes. The observed-attribute check catches API drift before
 * a build can publish stale completions or a stale custom-elements manifest.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const positions = [
  "top-left", "top-right", "bottom-left", "bottom-right",
  "top-start", "top-end", "bottom-start", "bottom-end",
];
const attributes = [
  { name: "reference-element", type: "string", description: "ID of a caller-owned `<arcgis-scene>` in the same document. A directly assigned `view` or `referenceElement` property takes precedence." },
  { name: "start-longitude", type: "number", description: "Starting longitude in degrees. Supply together with `start-latitude`." },
  { name: "start-latitude", type: "number", description: "Starting latitude in degrees, from -90 to 90. Supply together with `start-longitude`." },
  { name: "start-altitude-m", type: "number", description: "Starting absolute altitude in metres. Omit to start above sampled terrain." },
  { name: "start-heading-deg", type: "number", description: "Starting heading in degrees clockwise from north." },
  { name: "start-speed-mps", type: "number", description: "Initial forward speed. Uses metres per second in local scenes and projected scene units per second in global Web Mercator scenes." },
  { name: "camera-mode", type: '"chase" | "cockpit"', values: ["chase", "cockpit"], description: "Initial camera view. Changes to this attribute update the active flight without restarting it." },
  { name: "power-mode", type: '"slow" | "normal" | "turbo"', values: ["slow", "normal", "turbo"], description: "Initial flight power mode: brake toward slow speed, cruise normally, or use turbo boost." },
  { name: "sensitivity", type: "number", description: "Keyboard, gamepad, and touch control sensitivity, clamped to 0.5 through 2." },
  { name: "fov-deg", type: "number", description: "Base camera field of view in degrees, clamped to 58 through 76." },
  { name: "invert-pitch-disabled", type: "boolean", description: "Presence disables the default inverted pitch control. Remove the attribute to restore the default; `=\"false\"` still counts as present." },
  { name: "camera-roll-disabled", type: "boolean", description: "Presence disables banked viewport roll during turns." },
  { name: "keyboard-disabled", type: "boolean", description: "Presence disables keyboard flight input." },
  { name: "gamepad-disabled", type: "boolean", description: "Presence disables gamepad flight input." },
  { name: "capture-scene-navigation-disabled", type: "boolean", description: "Presence leaves ArcGIS scene navigation gestures under the host's control." },
  { name: "auto-start-disabled", type: "boolean", description: "Presence initializes flight in the ready state; call `start()` to begin flying." },
  { name: "show-controls", type: "boolean", description: "Presence shows the built-in flight toolbar." },
  { name: "joystick", type: '"auto" | "always" | "never"', values: ["auto", "always", "never"], description: "Touch joystick visibility. `auto` shows it on coarse-pointer devices, independently of the toolbar." },
  { name: "joystick-position", type: positions.map((value) => `"${value}"`).join(" | "), values: positions, description: "ArcGIS scene slot for the touch joystick; defaults to `bottom-left`." },
  { name: "ui-position", type: positions.map((value) => `"${value}"`).join(" | "), values: positions, description: "ArcGIS scene slot for the built-in toolbar; defaults to `bottom-end`." },
  { name: "ui-controls", type: "string", description: "Unique toolbar controls separated by spaces or commas: `power`, `pause`, `camera`, `recover`." },
  { name: "show-speed", type: "boolean", description: "Presence shows the speed readout in the built-in toolbar." },
  { name: "locale", type: '"auto" | "en" | "de" | "fr" | "it" | "es"', values: ["auto", "en", "de", "fr", "it", "es"], description: "Language for built-in controls. `auto` follows ArcGIS, document, then browser language." },
];

const source = await readFile(path.join(root, "src/components/plane-navigation-config.ts"), "utf8");
const observedBlock = source.match(/export const PLANE_NAVIGATION_OBSERVED_ATTRIBUTES = \[([\s\S]*?)\] as const;/)?.[1];
if (!observedBlock) throw new Error("Could not read observed plane-navigation attributes.");
const observed = [...observedBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
if (JSON.stringify(observed) !== JSON.stringify(attributes.map(({ name }) => name))) {
  throw new Error("Element metadata attributes differ from PLANE_NAVIGATION_OBSERVED_ATTRIBUTES.");
}

const members = [
  { kind: "field", name: "status", readonly: true, type: { text: "PlaneNavigationStatus" }, description: "Current lifecycle state. Read-only; reflected to the `status` HTML attribute." },
  { kind: "field", name: "view", type: { text: "SceneView | null" }, description: "Caller-owned 3D SceneView. Takes precedence over scene-element references and is never destroyed by the component." },
  { kind: "field", name: "referenceElement", type: { text: "FlightSceneElement | null" }, description: "Caller-owned `<arcgis-scene>` element. Takes precedence over `reference-element`; an assigned `view` takes precedence over both." },
  { kind: "field", name: "config", type: { text: "PlaneNavigationConfig" }, description: "Reading returns the complete normalized configuration. Assign a partial `PlaneNavigationConfigInput` to update it." },
];

const className = "ArcgisPlaneNavigationElement";
const tagName = "arcgis-plane-navigation";
const elementSource = await readFile(path.join(root, "src/components/arcgis-plane-navigation.ts"), "utf8");
for (const member of members) {
  const getterType = elementSource.match(new RegExp(`\\bget ${member.name}\\(\\): ([^\\r\\n{]+)\\s*\\{`))?.[1].trim();
  if (getterType !== member.type.text) {
    throw new Error(`Element metadata type for ${member.name} differs from its getter.`);
  }
}
if (!/set config\(value: PlaneNavigationConfigInput\)/.test(elementSource)) {
  throw new Error("Element metadata config assignment type differs from its setter.");
}
const declaration = {
  kind: "class",
  name: className,
  customElement: true,
  tagName,
  description: "Adds aircraft flight, camera controls, and optional UI to a caller-owned ArcGIS 3D scene or SceneView. Import the package once to register the element.",
  superclass: { name: "HTMLElement", package: "global:" },
  members,
  attributes: [
    ...attributes.map(({ name, type, description }) => ({ name, type: { text: type }, description })),
    { name: "status", type: { text: "PlaneNavigationStatus" }, fieldName: "status", description: "Read-only reflected lifecycle state; set by the component." },
  ],
  events: [
    { name: "arcgisPlaneNavigationReady", type: { text: "PlaneNavigationReadyEvent" }, description: "Session initialized; detail contains the scene, view, and initial snapshot." },
    { name: "arcgisPlaneNavigationSnapshot", type: { text: "PlaneNavigationSnapshotEvent" }, description: "Flight state changed; detail contains the current snapshot." },
    { name: "arcgisPlaneNavigationError", type: { text: "PlaneNavigationErrorEvent" }, description: "Initialization or active scene failed; detail contains the Error." },
    { name: "arcgisPlaneNavigationStopped", type: { text: "PlaneNavigationStoppedEvent" }, description: "Explicit stop completed; detail reports the camera restoration policy." },
  ],
};
const reference = { name: className };
const manifest = {
  schemaVersion: "2.1.0",
  modules: [{
    kind: "javascript-module",
    path: "dist/component/arcgis-flight-component.sdk-5.1.js",
    declarations: [declaration],
    exports: [
      { kind: "js", name: className, declaration: reference },
      { kind: "custom-element-definition", name: tagName, declaration: reference },
    ],
  }],
};
const htmlData = {
  version: 1.1,
  tags: [{
    name: tagName,
    description: "Fly an aircraft in a caller-owned ArcGIS 3D scene. Set the scene with `reference-element` in HTML; assign `view`, `referenceElement`, or `config` as JavaScript properties. See the API reference for methods and events.",
    references: [{ name: "API reference", url: "https://ceddc.github.io/arcgis-flight-component/api-reference.html" }],
    attributes: attributes.map(({ name, type, description, values }) => ({
      name,
      description: `Type: ${type === "boolean" ? "boolean (presence)" : type}. ${description}`,
      ...(values ? { values: values.map((value) => ({ name: value })) } : {}),
    })),
  }],
};
await writeFile(path.join(root, "custom-elements.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(path.join(root, "html-data.json"), JSON.stringify(htmlData, null, 2) + "\n");
