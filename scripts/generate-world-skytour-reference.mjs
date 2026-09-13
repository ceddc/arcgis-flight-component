import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { build } from 'esbuild';

// This generator reads immutable Git objects, including the actual upstream
// camera statements. It never derives expected results from component code.
const sourceRepository = process.argv[2];
if (!sourceRepository) throw new Error('Pass the local World Sky Tour repository path.');
const sourceCommit = 'bb86f3e9ac24b932c62230718ca8bad5b9d888df';
const root = process.cwd();
const scratch = resolve(root, '.tmp/codex/world-reference-source');
const paths = ['src/game/flight.ts', 'src/game/math.ts', 'src/scene/camera-rig.ts', 'src/scene/alpine-scene.ts'];
const sources = Object.fromEntries(paths.map(path => [path, execFileSync('git', ['show', `${sourceCommit}:${path}`], {
  cwd: sourceRepository, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
})]));
for (const path of paths.slice(0, 3)) {
  mkdirSync(dirname(resolve(scratch, path)), { recursive: true });
  writeFileSync(resolve(scratch, path), sources[path]);
}

const sceneSource = ts.createSourceFile('alpine-scene.ts', sources[paths[3]], ts.ScriptTarget.Latest, true);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node);
  ts.forEachChild(node, visit);
}
visit(sceneSource);
const update = declarations.get('updateVehiclePose')?.initializer;
if (!update || !ts.isArrowFunction(update) || !ts.isBlock(update.body)) throw new Error('Upstream camera function changed.');
const statements = [...update.body.statements];
const variableName = node => ts.isVariableStatement(node) ? node.declarationList.declarations[0]?.name.getText(sceneSource) : null;
const start = statements.findIndex(node => variableName(node) === 'cameraTarget');
const end = statements.findIndex(node => variableName(node) === 'cameraFrame');
if (start < 0 || end <= start) throw new Error('Upstream camera boundaries changed.');
const projectionNames = ['baseDiagonalFov', 'appliedCameraRoll', 'cameraRollScale'];
const projection = projectionNames.map(name => {
  const statement = statements.find(node => variableName(node) === name);
  if (!statement) throw new Error(`Missing upstream projection: ${name}`);
  return statement.getText(sceneSource);
});
const submission = statements.find(node => ts.isExpressionStatement(node)
  && ts.isCallExpression(node.expression)
  && node.expression.expression.getText(sceneSource) === 'cameraSubmissionScheduler.update');
if (!submission) throw new Error('Upstream camera submission changed.');
const frameExpression = submission.expression.arguments[0].getText(sceneSource);
const cameraStatements = statements.slice(start, end + 1).map(node => node.getText(sceneSource)).join('\n');
const cameraRigDeclaration = declarations.get('cameraRig').getText(sceneSource);
const pitchDeclaration = declarations.get('cameraPitchSmoother').getText(sceneSource);

const entry = `
import * as flight from './src/game/flight.ts';
import { clamp, forwardVector, lerp, normalizeDegrees, RAD_TO_DEG } from './src/game/math.ts';
import { aircraftVisibleForViewTransition, blendFlightCameraFrames, chaseCameraHeight, chaseCameraTiltDegrees,
  ChaseCameraRig, ChasePitchSmoother, cockpitCameraFrame, compensatedFovForViewportScale, FlightViewTransition,
  planeChaseFraming, rolledViewportScale, verticalFovToDiagonal, webMercatorGroundScale } from './src/scene/camera-rig.ts';
export { flight };
const { FLIGHT_TUNING } = flight;
export function makeCamera(startState, viewport) {
  const ${cameraRigDeclaration};
  const ${pitchDeclaration};
  const sceneElement = { view: viewport };
  const sceneRoll = { appliesRoll: true };
  const viewTransition = new FlightViewTransition();
  let previousSpeed = startState.speed;
  let smoothedLongitudinalAcceleration = 0;
  let launchCameraKick = 0;
  return {
    setMode: mode => viewTransition.setMode(mode),
    update(pose, fov, dt, snap = false) {
      const cameraViewBlend = viewTransition.update(dt);
      ${cameraStatements}
      ${projection.join('\n')}
      previousSpeed = pose.speed;
      return {
        ...${frameExpression},
        aircraftVisible: aircraftVisibleForViewTransition(viewTransition.mode, cameraViewBlend),
        viewMode: viewTransition.mode,
        transitionBlend: cameraViewBlend,
      };
    },
  };
}
`;
writeFileSync(resolve(scratch, 'entry.ts'), entry);
const bundled = await build({ entryPoints: [resolve(scratch, 'entry.ts')], bundle: true, write: false, platform: 'node', format: 'esm' });
const { flight, makeCamera } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const replay = JSON.parse(readFileSync(resolve(root, 'src/ab/sky-tour-bavaria.reference.json'), 'utf8'));
const fovDegrees = 62; // The upstream rig's actual initial FOV.
const dt = flight.FLIGHT_TUNING.fixedStepSeconds;
let vehicle = flight.createInitialFlightState({ x: 919152, y: 5941300, z: 2500 }, 118);
let smoothedPitch = 0;
const camera = makeCamera(vehicle, replay.metadata.viewport);
const frames = replay.frames.map(({ step, control }) => {
  if (step === 301) camera.setMode('cockpit');
  if (step === 631) camera.setMode('chase');
  smoothedPitch = flight.smoothFlightPitchInput(smoothedPitch, control.pitch, dt);
  vehicle = flight.stepFlight(vehicle, { ...control, pitch: smoothedPitch }, dt);
  const pose = {
    position: { ...vehicle.position }, bodyHeading: vehicle.heading, travelHeading: vehicle.heading,
    pitch: vehicle.pitch, roll: vehicle.bank, speed: vehicle.speed, interpolationAlpha: 0, boost: vehicle.launchBoost,
  };
  return { step, control, vehicle, camera: camera.update(pose, fovDegrees, dt) };
});
const fixture = {
  metadata: {
    ...replay.metadata,
    sourceRepository: 'ceddc/arcgisskytourworld', sourceCommit, sdkVersion: '5.1.21', fovDegrees,
    generatedFrom: paths,
    sourceSha256: Object.fromEntries(paths.map(path => [path, createHash('sha256').update(sources[path]).digest('hex')])),
    generator: 'scripts/generate-world-skytour-reference.mjs',
  },
  frames,
};
const output = resolve(root, 'src/ab/world-skytour.reference.json');
writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Generated ${frames.length} frames from ${sourceCommit} into ${output}`);
