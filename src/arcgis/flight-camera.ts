/**
 * Turn simulation poses into chase or cockpit camera frames for ArcGIS.
 * The controller owns transition and orbit smoothing, terrain clearance and
 * viewport/FOV compensation; the hosted scene submits the resulting frame.
 */
import {
  aircraftVisibleForViewTransition,
  blendFlightCameraFrames,
  ChaseCameraRig,
  ChasePitchSmoother,
  cockpitCameraFrame,
  compensatedFovForViewportScale,
  FlightViewTransition,
  planeChaseFraming,
  rolledViewportScale,
  verticalFovToDiagonal,
  webMercatorGroundScale,
  type FlightViewMode,
} from "../core/camera-rig";
import { CameraDrag, clearCameraGround, orbitFlightCamera } from "../core/camera-drag";
import type { Vec2 } from "../core/types";
import { FLIGHT_TUNING } from "../core/flight";
import { clamp, forwardVector, lerp, normalizeDegrees, RAD_TO_DEG } from "../core/math";
import type { VehicleRenderPose } from "../core/runtime";

/** Pixel dimensions used to convert camera FOV and viewport roll compensation. */
export interface FlightCameraViewport {
  width: number;
  height: number;
}

/** Inputs needed to derive one camera frame from the current aircraft pose. */
export interface FlightCameraUpdate {
  pose: VehicleRenderPose;
  verticalFovDegrees: number;
  deltaSeconds: number;
  viewport: FlightCameraViewport;
  webMercator: boolean;
  bankedViewport: boolean;
  snap?: boolean;
  reducedMotion?: boolean;
  elevationAtWorld?: (point: Vec2) => number | null;
}

/** Camera state ready for the hosted-scene adapter to submit to ArcGIS. */
export interface PresentedFlightCameraFrame {
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
  viewMode: FlightViewMode;
  transitionBlend: number;
}

/** Aircraft-specific tuning that affects chase-camera framing. */
interface FlightCameraAircraft {
  cameraDistanceScale: number;
  cameraHeightOffset: number;
  maximumSpeed: number;
}

/**
 * Compute chase/cockpit camera poses and smooth transitions without writing to ArcGIS.
 *
 * This keeps simulation-side camera math deterministic and lets the host adapter
 * own the rate-limited view updates. It also tracks drag look, pitch smoothing,
 * launch acceleration framing and the temporary roll viewport scale.
 */
export class FlightCameraController {
  /** Pointer-driven look state used by the settled chase view. */
  readonly drag = new CameraDrag();

  /** Whether free camera orbit is currently allowed in the settled chase view. */
  get canOrbit(): boolean {
    return this.transition.mode === "chase" && this.transition.blend === 0;
  }
  private readonly rig: ChaseCameraRig;
  private readonly pitchSmoother: ChasePitchSmoother;
  private readonly transition = new FlightViewTransition();
  private aircraft: FlightCameraAircraft;
  private previousSpeed: number;
  private smoothedLongitudinalAcceleration = 0;
  private launchCameraKick = 0;

  /**
   * Create a controller around the initial pose and view FOV.
   *
   * @param initialPose Flight pose used to seed heading, pitch smoothing and acceleration history.
   * @param verticalFovDegrees SceneView's base vertical field of view.
   * @param aircraft Optional aircraft-specific distance, height and speed tuning.
   */
  constructor(initialPose: VehicleRenderPose, verticalFovDegrees: number, aircraft: FlightCameraAircraft = {
    cameraDistanceScale: 1,
    cameraHeightOffset: 0,
    maximumSpeed: FLIGHT_TUNING.maximumSpeed,
  }) {
    this.aircraft = aircraft;
    this.rig = new ChaseCameraRig({
      distanceM: 17.5,
      heightM: 7.2,
      fovDegrees: verticalFovDegrees,
      headingDegrees: initialPose.bodyHeading,
    });
    this.pitchSmoother = new ChasePitchSmoother(initialPose.pitch);
    this.previousSpeed = initialPose.speed;
  }

  /** Current chase or cockpit mode while any transition is in progress. */
  get mode(): FlightViewMode {
    return this.transition.mode;
  }

  /** Start a chase/cockpit transition, optionally jumping directly to the requested mode. */
  setMode(mode: FlightViewMode, instant = false): void {
    this.drag.reset();
    this.transition.setMode(mode, instant);
  }

  /** Replace camera framing tuning after an aircraft change. */
  setAircraft(aircraft?: FlightCameraAircraft): void {
    this.aircraft = aircraft ?? {
      cameraDistanceScale: 1,
      cameraHeightOffset: 0,
      maximumSpeed: FLIGHT_TUNING.maximumSpeed,
    };
  }

  /**
   * Advance smoothing and calculate the next complete camera frame.
   *
   * Chase and cockpit frames are blended through transitions; optional terrain
   * sampling only raises an orbiting chase camera when it would intersect ground.
   *
   * @param options Current simulation pose, timing, viewport and scene capabilities.
   * @returns Camera coordinates, orientation, lens, roll scaling and aircraft visibility.
   */
  update(options: FlightCameraUpdate): PresentedFlightCameraFrame {
    const { pose, viewport } = options;
    const snap = options.snap === true;
    const dt = clamp(options.deltaSeconds, 1 / 240, 0.1);
    if (snap) this.drag.reset();
    const lookOffset = this.drag.update(dt, options.reducedMotion);
    const transitionBlend = this.transition.update(dt);
    const speedRatio = clamp(Math.abs(pose.speed) / this.aircraft.maximumSpeed, 0, 1);
    const turboIntensity = clamp((pose.boost ?? 0) - 1, 0, 1);
    const target = this.rig.targetForSpeed(
      pose.bodyHeading,
      pose.speed,
      this.aircraft.maximumSpeed,
      options.verticalFovDegrees,
    );
    const framing = planeChaseFraming(speedRatio, turboIntensity);
    target.distanceM = framing.distanceM * this.aircraft.cameraDistanceScale;
    target.heightM = framing.heightM + this.aircraft.cameraHeightOffset;

    const acceleration = snap
      ? 0
      : clamp((Math.abs(pose.speed) - Math.abs(this.previousSpeed)) / dt, -20, 20);
    this.previousSpeed = pose.speed;
    this.smoothedLongitudinalAcceleration = snap
      ? 0
      : lerp(
          this.smoothedLongitudinalAcceleration,
          acceleration,
          1 - Math.exp(-6.5 * dt),
        );
    this.launchCameraKick = snap
      ? 0
      : lerp(
          this.launchCameraKick,
          clamp(this.smoothedLongitudinalAcceleration / 20, 0, 1) * 0.45,
          1 - Math.exp(-4.5 * dt),
        );
    target.headingDegrees = pose.bodyHeading;
    target.distanceM += this.launchCameraKick * 0.45;
    target.fovDegrees = Math.min(94, target.fovDegrees + turboIntensity * 12);

    const rigPose = this.rig.update(target, dt, snap);
    const pitchDegrees = this.pitchSmoother.update(pose.pitch, dt, snap);
    const pitchRadians = pitchDegrees * Math.PI / 180;
    const forward = forwardVector(rigPose.headingDegrees, 0);
    // Web Mercator distorts horizontal metres with latitude. Altitude stays in real metres.
    const horizontalScale = options.webMercator
      ? webMercatorGroundScale(pose.position.y)
      : 1;
    const lookAhead = lerp(4.5, 9.5, speedRatio) + turboIntensity * 8;
    const cameraPosition = {
      x: pose.position.x - forward.x * rigPose.distanceM * horizontalScale,
      y: pose.position.y - forward.y * rigPose.distanceM * horizontalScale,
      z: pose.position.z + rigPose.heightM
        - Math.sin(pitchRadians) * rigPose.distanceM * 0.55,
    };
    const lookTarget = {
      x: pose.position.x + forward.x * lookAhead * horizontalScale,
      y: pose.position.y + forward.y * lookAhead * horizontalScale,
      z: pose.position.z + 0.8 + Math.sin(pitchRadians) * lookAhead,
    };
    const lookDx = lookTarget.x - cameraPosition.x;
    const lookDy = lookTarget.y - cameraPosition.y;
    const horizontalDistance = Math.max(
      0.001,
      Math.hypot(lookDx, lookDy) / horizontalScale,
    );
    const lookHeading = normalizeDegrees(Math.atan2(lookDx, lookDy) * RAD_TO_DEG);
    const lookPitch = Math.atan2(
      lookTarget.z - cameraPosition.z,
      horizontalDistance,
    ) * RAD_TO_DEG;
    // Both views follow the same aircraft pose; blending avoids a jump on cockpit entry.
    let chaseFrame = orbitFlightCamera({
      ...cameraPosition,
      heading: lookHeading,
      tilt: 90 + lookPitch,
      roll: 0,
      fovDegrees: rigPose.fovDegrees,
    }, { ...pose.position, z: pose.position.z + 0.8 }, lookOffset, horizontalScale);
    if (lookOffset.yawDegrees !== 0 || lookOffset.pitchDegrees !== 0) {
      const ground = options.elevationAtWorld?.(chaseFrame);
      if (ground != null) chaseFrame = clearCameraGround(chaseFrame, ground + 2, Math.hypot(
        horizontalDistance, lookTarget.z - cameraPosition.z,
      ));
    }
    const blended = blendFlightCameraFrames(chaseFrame,
      cockpitCameraFrame(pose, options.verticalFovDegrees, horizontalScale), transitionBlend);

    const aspectRatio = Math.max(1, viewport.width) / Math.max(1, viewport.height);
    const baseFov = verticalFovToDiagonal(
      clamp(blended.fovDegrees + this.transition.zoomOffsetDegrees, 46, 100),
      aspectRatio,
    );
    // Rotating the viewport exposes its corners. Enlarge the image and compensate the FOV
    // only when the roll renderer is active, preserving the apparent zoom.
    const roll = options.bankedViewport ? blended.roll : 0;
    const rollScale = Math.abs(roll) < 0.01
      ? 1
      : rolledViewportScale(roll, viewport.width, viewport.height) + 0.012;

    return {
      x: blended.x,
      y: blended.y,
      z: blended.z,
      heading: blended.heading,
      tilt: blended.tilt,
      roll,
      rollScale,
      baseFov,
      fov: compensatedFovForViewportScale(baseFov, rollScale),
      aircraftVisible: aircraftVisibleForViewTransition(
        this.transition.mode,
        transitionBlend,
      ),
      viewMode: this.transition.mode,
      transitionBlend,
    };
  }
}
