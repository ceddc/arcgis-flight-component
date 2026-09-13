import {
  createInitialFlightState,
  smoothFlightPitchInput,
  stepFlight,
} from "../core/flight";
import type { VehicleRenderPose } from "../core/runtime";
import type { ControlFrame, VehicleState } from "../core/types";
import { FlightCameraController } from "../arcgis/flight-camera";

export const SKY_TOUR_REFERENCE_URL = new URL(
  "./sky-tour-bavaria.reference.json",
  import.meta.url,
);

export interface ReferenceCameraFrame {
  x: number;
  y: number;
  z: number;
  heading: number;
  tilt: number;
  roll: number;
  rollScale: number;
  baseFov: number;
  fov: number;
  aircraftVisible: boolean;
  viewMode: "chase" | "cockpit";
  transitionBlend: number;
}

export interface ReferenceFrame {
  step: number;
  control: ControlFrame;
  vehicle: VehicleState;
  camera: ReferenceCameraFrame;
}

export interface SkyTourReferenceFixture {
  metadata: {
    fixtureVersion: number;
    sourceRepository: string;
    sourceCommit: string;
    sdkVersion: string;
    fixedStepSeconds: number;
    viewport: { width: number; height: number };
    fovDegrees: number;
    bankedViewport: boolean;
    generatedFrom: string[];
    segments: string[];
  };
  frames: ReferenceFrame[];
}

export interface ParityDeltas {
  vehiclePositionM: number;
  vehicleState: number;
  cameraPositionM: number;
  cameraAngleDeg: number;
  cameraFovDeg: number;
  cameraScale: number;
  transitionBlend: number;
}

export interface ParityReport {
  passed: boolean;
  comparedFrames: number;
  tolerance: number;
  maxDeltas: ParityDeltas;
  mismatchCount: number;
  firstMismatchStep: number | null;
  sourceCommit: string;
  sdkVersion: string;
}

const REFERENCE_SDK_VERSIONS: Readonly<Record<string, string>> = {
  "3300e43491321070114dd120a1db0cde3e8c200b": "5.1.14",
  "bb86f3e9ac24b932c62230718ca8bad5b9d888df": "5.1.21",
};
const PARITY_TOLERANCE = 1e-9;

function renderPose(state: VehicleState): VehicleRenderPose {
  return {
    position: { ...state.position },
    bodyHeading: state.heading,
    travelHeading: state.heading,
    pitch: state.pitch,
    roll: state.bank,
    speed: state.speed,
    interpolationAlpha: 0,
    boost: state.launchBoost,
  };
}

function distance3(
  left: Readonly<{ x: number; y: number; z: number }>,
  right: Readonly<{ x: number; y: number; z: number }>,
): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function maxAbs(values: readonly number[]): number {
  return Math.max(0, ...values.map((value) => Math.abs(value)));
}

export async function loadSkyTourReferenceFixture(): Promise<SkyTourReferenceFixture> {
  const response = await fetch(SKY_TOUR_REFERENCE_URL);
  if (!response.ok) {
    throw new Error(`Unable to load Sky Tour reference fixture: ${response.status}.`);
  }
  return response.json() as Promise<SkyTourReferenceFixture>;
}

/**
 * Replays an immutable 720-tick Sky Tour baseline with the standalone modules.
 * The reference fixture was produced from the reviewed Sky Tour source.
 */
export function runSkyTourParity(
  fixture: SkyTourReferenceFixture,
): ParityReport {
  const expectedSdkVersion = REFERENCE_SDK_VERSIONS[fixture.metadata.sourceCommit];
  if (!expectedSdkVersion) {
    throw new Error("Unexpected Sky Tour reference commit.");
  }
  if (fixture.metadata.sdkVersion !== expectedSdkVersion) {
    throw new Error("Unexpected SDK version for the Sky Tour reference commit.");
  }

  const { fixedStepSeconds: dt, viewport, fovDegrees } = fixture.metadata;
  let vehicle = createInitialFlightState(
    { x: 919_152, y: 5_941_300, z: 2_500 },
    118,
  );
  let smoothedPitch = 0;
  const camera = new FlightCameraController(renderPose(vehicle), fovDegrees);
  const maxDeltas: ParityDeltas = {
    vehiclePositionM: 0,
    vehicleState: 0,
    cameraPositionM: 0,
    cameraAngleDeg: 0,
    cameraFovDeg: 0,
    cameraScale: 0,
    transitionBlend: 0,
  };
  let mismatchCount = 0;
  let firstMismatchStep: number | null = null;

  for (const reference of fixture.frames) {
    if (reference.step === 301) camera.setMode("cockpit");
    if (reference.step === 631) camera.setMode("chase");
    smoothedPitch = smoothFlightPitchInput(
      smoothedPitch,
      reference.control.pitch,
      dt,
    );
    vehicle = stepFlight(
      vehicle,
      { ...reference.control, pitch: smoothedPitch },
      dt,
    );
    const presented = camera.update({
      pose: renderPose(vehicle),
      verticalFovDegrees: fovDegrees,
      deltaSeconds: dt,
      viewport,
      webMercator: true,
      bankedViewport: fixture.metadata.bankedViewport,
    });

    const deltas: ParityDeltas = {
      vehiclePositionM: distance3(vehicle.position, reference.vehicle.position),
      vehicleState: maxAbs([
        vehicle.heading - reference.vehicle.heading,
        vehicle.pitch - reference.vehicle.pitch,
        vehicle.bank - reference.vehicle.bank,
        vehicle.speed - reference.vehicle.speed,
        vehicle.verticalSpeed - reference.vehicle.verticalSpeed,
        vehicle.throttle - reference.vehicle.throttle,
        vehicle.launchBoost - reference.vehicle.launchBoost,
      ]),
      cameraPositionM: distance3(presented, reference.camera),
      cameraAngleDeg: maxAbs([
        presented.heading - reference.camera.heading,
        presented.tilt - reference.camera.tilt,
        presented.roll - reference.camera.roll,
      ]),
      cameraFovDeg: maxAbs([
        presented.baseFov - reference.camera.baseFov,
        presented.fov - reference.camera.fov,
      ]),
      cameraScale: Math.abs(
        presented.rollScale - reference.camera.rollScale,
      ),
      transitionBlend: Math.abs(
        presented.transitionBlend - reference.camera.transitionBlend,
      ),
    };
    for (const key of Object.keys(maxDeltas) as Array<keyof ParityDeltas>) {
      maxDeltas[key] = Math.max(maxDeltas[key], deltas[key]);
    }
    const numericMismatch = Object.values(deltas).some(
      (delta) => delta > PARITY_TOLERANCE,
    );
    const structuralMismatch =
      presented.viewMode !== reference.camera.viewMode
      || presented.aircraftVisible !== reference.camera.aircraftVisible;
    if (numericMismatch || structuralMismatch) {
      mismatchCount += 1;
      firstMismatchStep ??= reference.step;
    }
  }

  return {
    passed: mismatchCount === 0,
    comparedFrames: fixture.frames.length,
    tolerance: PARITY_TOLERANCE,
    maxDeltas,
    mismatchCount,
    firstMismatchStep,
    sourceCommit: fixture.metadata.sourceCommit,
    sdkVersion: fixture.metadata.sdkVersion,
  };
}
