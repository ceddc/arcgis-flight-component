/**
 * Coordinates one playable flight from input sampling through fixed-step physics to ArcGIS presentation.
 *
 * The hosted scene owns ArcGIS graphics and camera resources; this session owns
 * input listeners, the simulation clock, and the animation frame loop. It also
 * keeps a recoverable vehicle state and applies live settings without rebuilding
 * the scene. Call `initialize()` before starting or changing a flight, and
 * `destroy()` when the host releases it.
 */
import { stepAircraftFlight } from '../core/aircraft-flight';
import { smoothFlightPitchInput as smoothProfilePitchInput } from '../core/profile-flight';
import {
  applyArcadeGroundSkim,
  FLIGHT_TUNING,
  flightRespawnState,
  smoothFlightPitchInput,
  stepFlight,
} from "../core/flight";
import {
  physicsPoseFromVehicle,
  renderPoseWithVehicleBoost,
  renderVehicleFromPose,
} from "../core/pose";
import {
  flightPowerControl,
  isFlightPowerMode,
  stepFlightPowerMode,
  type FlightPowerMode,
} from "../core/power-mode";
import {
  GameRuntime,
  type GameRuntimeFrame,
} from "../core/runtime";
import type {
  ControlFrame,
  ControlFramePatch,
  VehicleState,
} from "../core/types";
import type { FlightViewMode } from "../core/camera-rig";
import type { PlaneNavigationConfig } from "../config";
import {
  FlightInputController,
  type FlightGamepadStatus,
  type FlightInputSettings,
} from "../input";
import type {
  HostedFlightScene,
  HostedFlightSceneDebugSnapshot,
} from "../arcgis/hosted-flight-scene";
import { FramePacingSampler } from "./frame-pacing";

/** Lifecycle phase of a single initialized flight session. */
export type FlightSessionPhase = "ready" | "running" | "paused" | "stopped";

/** Read-only view of simulation, presentation, input, and altitude state. */
export interface FlightSessionSnapshot {
  /** Current lifecycle state. */
  phase: FlightSessionPhase;
  /** Latest fixed-step simulation state. */
  vehicle: VehicleState;
  /** Render-interpolated state for the most recently presented frame. */
  renderVehicle: VehicleState;
  /** Aircraft altitude above sea level in metres. */
  altitudeMslM: number;
  /** Height above sampled ground in metres, or null while ground is unavailable. */
  aglM: number | null;
  cameraMode: FlightViewMode;
  powerMode: FlightPowerMode;
  turboActive: boolean;
  braking: boolean;
  simulationStep: number;
  presentedTick: number;
  gamepad: Readonly<FlightGamepadStatus>;
  camera: HostedFlightSceneDebugSnapshot["cameraFrame"];
}

/** Required hosted scene and normalized settings used to construct a session. */
export interface FlightSessionOptions {
  scene: HostedFlightScene;
  config: PlaneNavigationConfig;
  /** Called after state changes with a defensive snapshot. */
  onSnapshot?: (snapshot: FlightSessionSnapshot) => void;
}

const NEUTRAL_CONTROL: ControlFrame = {
  pitch: 0,
  bank: 0,
  yaw: 0,
  accelerate: 0,
  turboBoost: false,
  brake: 0,
  airbrake: false,
  respawn: false,
};

const DISCONNECTED_GAMEPAD: Readonly<FlightGamepadStatus> = Object.freeze({
  connected: false,
  index: null,
  id: null,
  mapping: null,
});

interface FlightSessionLiveState {
  inputSettings: Readonly<FlightInputSettings>;
  fovDegrees: number;
  cameraMode: FlightViewMode;
  bankedViewport: boolean;
  powerMode: FlightPowerMode;
}

interface ApplyLiveStateOptions {
  instantCamera?: boolean;
}

function cloneVehicle(vehicle: VehicleState): VehicleState {
  return { ...vehicle, position: { ...vehicle.position } };
}

function vehicleForAircraftProfile(
  vehicle: Readonly<VehicleState>,
  config: PlaneNavigationConfig,
): VehicleState {
  const tuning = config.flight?.tuning ?? FLIGHT_TUNING;
  return {
    ...vehicle,
    position: { ...vehicle.position },
    pitch: 0,
    bank: 0,
    driftAngle: 0,
    speed: tuning.cruiseSpeed,
    throttle: 0.52,
    launchBoost: 0,
    cornerAssist: 0,
    verticalSpeed: 0,
    speedBar: undefined,
    wingBrake: undefined,
    speedBarRate: undefined,
    wingBrakeRate: undefined,
    wingRollRate: undefined,
    wingPitchRate: undefined,
    spaceTurnRate: undefined,
    spacePitchRate: undefined,
  };
}

function assertFlightViewMode(mode: FlightViewMode): void {
  if (mode !== "chase" && mode !== "cockpit") {
    throw new TypeError(`Unsupported camera mode: ${String(mode)}.`);
  }
}

function assertFlightPowerMode(mode: FlightPowerMode): void {
  if (!isFlightPowerMode(mode)) {
    throw new TypeError(`Unsupported power mode: ${String(mode)}.`);
  }
}

/** Owns input and the fixed-step loop; HostedFlightScene owns the corresponding ArcGIS resources. */
export class FlightSession {
  private flightProfile: PlaneNavigationConfig['flight'];
  private readonly scene: HostedFlightScene;
  private readonly onSnapshot?: (snapshot: FlightSessionSnapshot) => void;
  private minimumClearanceM: number;
  private maximumAglM: number;
  private recoverSpeedMps: number;
  private readonly initialInputSettings: Pick<
    FlightInputSettings,
    "sensitivity" | "invertPitch" | "keyboardEnabled" | "gamepadEnabled"
  >;

  private input: FlightInputController | null = null;
  private phaseState: FlightSessionPhase = "ready";
  private vehicle: VehicleState;
  private safeVehicle: VehicleState;
  private runtime: GameRuntime;
  private runtimeFrame: GameRuntimeFrame;
  private smoothedPitchInput = 0;
  private debugControl: ControlFrame | null = null;
  private cameraModeState: FlightViewMode;
  private bankedViewportState: boolean;
  private powerModeState: FlightPowerMode;
  private fovDegrees: number;

  private animationFrame = 0;
  private lastFrameTime = performance.now();
  private lastSnapshotTime = 0;
  private lastFramePacingTime = 0;
  private readonly framePacing = new FramePacingSampler();
  private initialized = false;
  private destroyed = false;
  private aircraftRequest = 0;

  /** Creates a ready session; call `initialize()` before start or live updates. */
  constructor(options: FlightSessionOptions) {
    this.flightProfile = options.config.flight;
    this.scene = options.scene;
    this.onSnapshot = options.onSnapshot;
    this.minimumClearanceM = options.config.terrain.minimumClearanceM;
    this.maximumAglM = options.config.terrain.maximumAglM;
    this.recoverSpeedMps = options.scene.startState.speed;
    this.vehicle = cloneVehicle(options.scene.startState);
    this.safeVehicle = cloneVehicle(this.vehicle);
    this.cameraModeState = options.config.camera.mode;
    this.bankedViewportState = options.config.camera.bankedViewport;
    this.powerModeState = options.config.powerMode;
    this.fovDegrees = options.config.camera.fovDeg;
    assertFlightViewMode(this.cameraModeState);
    assertFlightPowerMode(this.powerModeState);
    this.initialInputSettings = {
      sensitivity: options.config.controls.sensitivity,
      invertPitch: options.config.controls.invertPitch,
      keyboardEnabled: options.config.controls.keyboard,
      gamepadEnabled: options.config.controls.gamepad,
    };
    this.runtime = new GameRuntime(
      physicsPoseFromVehicle(this.vehicle),
      () => {
        const input = this.requireInput();
        this.simulateStep(
          this.debugControl
            ?? input.sample(FLIGHT_TUNING.fixedStepSeconds),
        );
        return physicsPoseFromVehicle(this.vehicle);
      },
      {
        fixedStepSeconds: FLIGHT_TUNING.fixedStepSeconds,
        maxCatchUpSteps: FLIGHT_TUNING.maxCatchUpSteps,
      },
    );
    this.runtimeFrame = this.runtime.pause();
  }

  /** Installs input and presents the initial state without starting the simulation loop. */
  initialize(): void {
    this.assertAlive();
    if (this.initialized) return;
    if (this.input) {
      throw new Error("Plane navigation session initialization is already in progress.");
    }

    const input = new FlightInputController({
      target: this.scene.sceneElement,
      settings: this.initialInputSettings,
      onPauseRequested: () => this.togglePause(),
      onRecoverRequested: () => this.recover(),
      onPowerModeStepRequested: (direction) => {
        this.setPowerMode(stepFlightPowerMode(this.powerModeState, direction));
      },
    });
    this.input = input;
    try {
      this.scene.setViewMode(this.cameraModeState, true);
      this.assertAlive();
      this.applyPowerModeToInput(input, this.powerModeState);
      this.present(true, FLIGHT_TUNING.fixedStepSeconds);
      this.assertAlive();
      this.initialized = true;
    } catch (error) {
      if (this.input === input) this.input = null;
      input.destroy();
      throw error;
    }
  }

  /** Current lifecycle phase. */
  get phase(): FlightSessionPhase {
    return this.phaseState;
  }

  /** Current chase or cockpit camera mode. */
  get cameraMode(): FlightViewMode {
    return this.cameraModeState;
  }

  /** Current slow, normal, or turbo power mode. */
  get powerMode(): FlightPowerMode {
    return this.powerModeState;
  }

  /** Resets to the hosted start state and begins fixed-step simulation. */
  start(options: { focusScene?: boolean } = {}): void {
    const input = this.requireInitializedInput();
    this.vehicle = cloneVehicle(this.scene.startState);
    this.safeVehicle = cloneVehicle(this.vehicle);
    this.smoothedPitchInput = 0;
    input.clear();
    this.applyPowerModeToInput(input, this.powerModeState);
    this.phaseState = "running";
    if (options.focusScene) this.scene.sceneElement.focus();
    this.runtimeFrame = this.runtime.reset(
      physicsPoseFromVehicle(this.vehicle),
      false,
    );
    this.present(true, FLIGHT_TUNING.fixedStepSeconds);
    this.emit();
    this.startFrameLoop();
  }

  /** Pauses simulation while retaining the session and input listeners. */
  pause(): void {
    if (this.phaseState !== "running" || this.destroyed) return;
    this.phaseState = "paused";
    this.runtimeFrame = this.runtime.pause();
    this.emit();
  }

  /** Resumes from the current state with a fresh timing baseline. */
  resume(options: { focusScene?: boolean } = {}): void {
    if (this.phaseState !== "paused" || this.destroyed) return;
    this.phaseState = "running";
    if (options.focusScene) this.scene.sceneElement.focus();
    this.runtimeFrame = this.runtime.resume();
    this.emit();
    this.startFrameLoop();
  }

  /** Returns to the last safe state (or start state) and presents it immediately. */
  recover(): void {
    const input = this.requireInitializedInput();
    input.clearControlPatch(["respawn"]);
    this.recoverVehicle();
    this.runtimeFrame = this.runtime.reset(
      physicsPoseFromVehicle(this.vehicle),
      this.phaseState !== "running",
    );
    this.present(true, FLIGHT_TUNING.fixedStepSeconds);
    this.emit();
  }

  /** Changes chase/cockpit mode; `instant` skips the visual transition. */
  setCameraMode(mode: FlightViewMode, instant = false): void {
    assertFlightViewMode(mode);
    const input = this.requireInitializedInput();
    if (this.cameraModeState === mode && !instant) return;
    this.applyLiveState({
      inputSettings: input.settings,
      fovDegrees: this.fovDegrees,
      cameraMode: mode,
      bankedViewport: this.bankedViewportState,
      powerMode: this.powerModeState,
    }, { instantCamera: instant });
    this.emit();
  }

  /** Replaces the power-mode control patch while preserving unrelated host patches. */
  setPowerMode(mode: FlightPowerMode): void {
    assertFlightPowerMode(mode);
    const input = this.requireInitializedInput();
    if (this.powerModeState === mode) return;
    this.applyLiveState({
      inputSettings: input.settings,
      fovDegrees: this.fovDegrees,
      cameraMode: this.cameraModeState,
      bankedViewport: this.bankedViewportState,
      powerMode: mode,
    });
    this.emit();
  }

  /** Toggles between turbo and normal power; returns whether turbo is now selected. */
  toggleTurbo(): boolean {
    const enabled = this.powerModeState !== "turbo";
    this.setPowerMode(enabled ? "turbo" : "normal");
    return enabled;
  }

  /**
   * Applies controls, FOV, view mode, viewport banking, and power changes to a live session.
   *
   * Camera-facing changes are attempted before input or stored state changes.
   * If scene presentation fails, the previous camera settings are restored and
   * the original error is rethrown. Asset/profile changes use `setAircraft()`.
   */
  applyLiveConfig(
    config: PlaneNavigationConfig,
    options: { instantCamera?: boolean } = {},
  ): void {
    assertFlightViewMode(config.camera.mode);
    assertFlightPowerMode(config.powerMode);
    const input = this.requireInitializedInput();
    this.applyLiveState({
      inputSettings: {
        ...input.settings,
        sensitivity: config.controls.sensitivity,
        invertPitch: config.controls.invertPitch,
        keyboardEnabled: config.controls.keyboard,
        gamepadEnabled: config.controls.gamepad,
      },
      fovDegrees: config.camera.fovDeg,
      cameraMode: config.camera.mode,
      bankedViewport: config.camera.bankedViewport,
      powerMode: config.powerMode,
    }, options);
  }

  /**
   * Replaces the aircraft graphics and selected flight profile in the current scene.
   * A model change resets physics and power to the new profile's cruise state;
   * a mesh-only change keeps the current vehicle motion. Older async requests
   * cannot overwrite a newer aircraft selection.
   * @returns `true` when the new aircraft was applied; `false` when the scene
   *          declined the change, the session ended, or a newer request won.
   */
  async setAircraft(config: PlaneNavigationConfig): Promise<boolean> {
    if (this.destroyed) return false;
    const request = ++this.aircraftRequest;
    const aircraftTypeChanged = this.flightProfile?.model !== config.flight?.model;
    const changed = await this.scene.setAircraft(config.assets, config.flight);
    if (!changed || this.destroyed || request !== this.aircraftRequest) return false;

    this.flightProfile = config.flight;
    this.minimumClearanceM = config.terrain.minimumClearanceM;
    this.maximumAglM = config.terrain.maximumAglM;
    if (aircraftTypeChanged) {
      this.recoverSpeedMps = config.flight?.tuning.cruiseSpeed
        ?? FLIGHT_TUNING.cruiseSpeed;
      this.vehicle = vehicleForAircraftProfile(this.vehicle, config);
      this.safeVehicle = cloneVehicle(this.vehicle);
      this.smoothedPitchInput = 0;
      const input = this.input;
      input?.clear();
      if (input) {
        this.applyPowerModeToInput(input, "normal");
      }
      this.powerModeState = "normal";
      this.runtimeFrame = this.runtime.reset(
        physicsPoseFromVehicle(this.vehicle),
        this.phaseState !== "running",
      );
    }
    this.present(aircraftTypeChanged, FLIGHT_TUNING.fixedStepSeconds);
    this.emit();
    return true;
  }

  /** Merges caller-supplied control values over sampled keyboard/gamepad input. */
  setControlPatch(patch: ControlFramePatch): void {
    this.requireInitializedInput().setControlPatch(patch);
  }

  /** Supplies normalized bank/pitch stick axes independently of other input sources. */
  setTouchStick(bank: number, pitch: number): void {
    this.requireInitializedInput().setTouchStick(bank, pitch);
  }

  /** Clears all caller overrides, or only the listed fields. */
  clearControlPatch(fields?: readonly (keyof ControlFrame)[]): void {
    const input = this.requireInitializedInput();
    input.clearControlPatch(fields);
    this.applyPowerModeToInput(input, this.powerModeState);
  }

  /** Returns a defensive snapshot of the current simulation and camera state. */
  snapshot(): FlightSessionSnapshot {
    const renderVehicle = renderVehicleFromPose(
      this.vehicle,
      this.runtimeFrame.renderPose,
    );
    const terrain = this.scene.elevationAtWorld(renderVehicle.position);
    const debug = this.scene.debugSnapshot();
    return {
      phase: this.phaseState,
      vehicle: cloneVehicle(this.vehicle),
      renderVehicle,
      altitudeMslM: renderVehicle.position.z,
      aglM: terrain === null ? null : renderVehicle.position.z - terrain,
      cameraMode: this.cameraModeState,
      powerMode: this.powerModeState,
      turboActive: this.vehicle.launchBoost > 1.5,
      braking: this.vehicle.throttle < 0.35,
      simulationStep: this.runtime.simulationStep,
      presentedTick: debug.lastPresentationTick,
      gamepad: this.input?.gamepadStatus ?? DISCONNECTED_GAMEPAD,
      camera: debug.cameraFrame,
    };
  }

  /** Returns hosted-scene diagnostics plus session phase and simulation step. */
  debugSnapshot(): HostedFlightSceneDebugSnapshot & {
    sessionPhase: FlightSessionPhase;
    simulationStep: number;
  } {
    return {
      ...this.scene.debugSnapshot(),
      sessionPhase: this.phaseState,
      simulationStep: this.runtime.simulationStep,
    };
  }

  /**
   * Advances a requested number of fixed physics steps for diagnostics and parity checks.
   * The supplied control patch is used only during this call, even if stepping
   * fails; the resulting state is presented once and returned as a snapshot.
   */
  debugAdvanceFixedSteps(
    steps: number,
    control: ControlFramePatch = {},
  ): FlightSessionSnapshot {
    this.requireInitializedInput();
    this.phaseState = "running";
    this.debugControl = { ...NEUTRAL_CONTROL, ...control };
    try {
      if (this.runtime.paused) this.runtime.resume();
      this.runtimeFrame = this.runtime.advanceFixedSteps(steps);
    } finally {
      this.debugControl = null;
    }
    this.present(false, Math.max(
      FLIGHT_TUNING.fixedStepSeconds,
      steps * FLIGHT_TUNING.fixedStepSeconds,
    ));
    this.emit();
    return this.snapshot();
  }

  /** Stops timing/input work and releases hosted-scene resources. Safe to call repeatedly. */
  destroy(options: { restoreCamera?: boolean } = {}): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.initialized = false;
    this.phaseState = "stopped";
    this.stopFrameLoop();
    const input = this.input;
    this.input = null;
    input?.destroy();
    this.scene.destroy(options);
  }

  private assertAlive(): void {
    if (this.destroyed) throw new Error("Plane navigation session is stopped.");
  }

  private requireInput(): FlightInputController {
    const input = this.input;
    if (!input) throw new Error("Plane navigation session is not initialized.");
    return input;
  }

  private requireInitializedInput(): FlightInputController {
    this.assertAlive();
    if (!this.initialized) {
      throw new Error("Plane navigation session is not initialized.");
    }
    return this.requireInput();
  }

  private togglePause(): void {
    if (this.phaseState === "running") this.pause();
    else if (this.phaseState === "paused") this.resume({ focusScene: true });
  }

  private applyPowerModeToInput(
    input: FlightInputController,
    mode: FlightPowerMode,
  ): void {
    const power = flightPowerControl(mode);
    input.clearControlPatch(["brake", "turboBoost"]);
    if (power.brake > 0) input.setControlPatch({ brake: power.brake });
    if (power.turboBoost) {
      input.setControlPatch({ turboBoost: true });
    }
  }

  /** Commits a live configuration only after the corresponding scene updates succeed. */
  private applyLiveState(
    next: FlightSessionLiveState,
    options: ApplyLiveStateOptions = {},
  ): void {
    const input = this.requireInitializedInput();
    const previous: FlightSessionLiveState = {
      inputSettings: { ...input.settings },
      fovDegrees: this.fovDegrees,
      cameraMode: this.cameraModeState,
      bankedViewport: this.bankedViewportState,
      powerMode: this.powerModeState,
    };
    const cameraAttempted = previous.cameraMode !== next.cameraMode
      || options.instantCamera === true;
    const bankedViewportAttempted = previous.bankedViewport
      !== next.bankedViewport;
    const cameraPresentationChanged = cameraAttempted
      || bankedViewportAttempted
      || previous.fovDegrees !== next.fovDegrees;
    const presentCameraImmediately = cameraPresentationChanged
      && this.phaseState !== "running";
    const powerAttempted = previous.powerMode !== next.powerMode;
    let presentationAttempted = false;

    // Apply the renderer changes before publishing state. If one fails, restore the previous
    // view settings and propagate the error; this is a single rollback, not an automatic retry.
    try {
      if (cameraAttempted) {
        this.scene.setViewMode(next.cameraMode, options.instantCamera === true);
      }
      if (bankedViewportAttempted) {
        this.scene.setBankedViewport(next.bankedViewport);
      }
      this.assertAlive();
      if (presentCameraImmediately) {
        presentationAttempted = true;
        this.present(
          true,
          FLIGHT_TUNING.fixedStepSeconds,
          next.fovDegrees,
        );
        this.assertAlive();
      }
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      if (cameraAttempted && !this.destroyed) {
        try {
          this.scene.setViewMode(previous.cameraMode, true);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (bankedViewportAttempted && !this.destroyed) {
        try {
          this.scene.setBankedViewport(previous.bankedViewport);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (presentationAttempted && !this.destroyed) {
        try {
          this.present(
            true,
            FLIGHT_TUNING.fixedStepSeconds,
            previous.fovDegrees,
          );
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length > 0) {
        console.warn("Plane navigation live configuration rollback was incomplete.", {
          cause: error,
          rollbackErrors,
        });
      }
      throw error;
    }

    input.updateSettings(next.inputSettings);
    if (powerAttempted) {
      this.applyPowerModeToInput(input, next.powerMode);
    }
    this.fovDegrees = next.fovDegrees;
    this.cameraModeState = next.cameraMode;
    this.bankedViewportState = next.bankedViewport;
    this.powerModeState = next.powerMode;
  }

  private recoverVehicle(): void {
    this.vehicle = {
      ...flightRespawnState(
        { ...this.safeVehicle.position },
        undefined,
      ),
      speed: this.recoverSpeedMps,
    };
    this.smoothedPitchInput = 0;
  }

  /** Dispatches one fixed input frame to the active flight model and enforces terrain clearance. */
  private simulateStep(control: ControlFrame): void {
    if (this.phaseState !== "running") return;
    if (control.respawn) {
      this.recoverVehicle();
      return;
    }
    const previous = cloneVehicle(this.vehicle);
    this.smoothedPitchInput = this.flightProfile?.model === 'space-jet' || this.flightProfile?.model === 'paraglider'
      ? control.pitch : this.flightProfile
      ? smoothProfilePitchInput(this.smoothedPitchInput, control.pitch, FLIGHT_TUNING.fixedStepSeconds, this.flightProfile.tuning.pitchInputResponse)
      : smoothFlightPitchInput(
      this.smoothedPitchInput,
      control.pitch,
      FLIGHT_TUNING.fixedStepSeconds,
    );
    let next = this.flightProfile ? stepAircraftFlight(this.flightProfile, previous,
      { ...control, pitch: this.smoothedPitchInput }, FLIGHT_TUNING.fixedStepSeconds) : stepFlight(
      previous,
      { ...control, pitch: this.smoothedPitchInput },
      FLIGHT_TUNING.fixedStepSeconds,
    );
    const terrain = this.scene.elevationAtWorld(next.position);
    if (terrain !== null && next.position.z - terrain > this.maximumAglM) {
      next = {
        ...next,
        position: { ...next.position, z: terrain + this.maximumAglM },
      };
    }
    if (terrain !== null && next.position.z - terrain < this.minimumClearanceM) {
      next = applyArcadeGroundSkim(
        next,
        terrain,
        this.minimumClearanceM,
      );
    } else if (terrain !== null && next.position.z - terrain > 30) {
      this.safeVehicle = cloneVehicle(next);
    }
    this.vehicle = next;
  }

  private present(
    snap: boolean,
    deltaSeconds: number,
    fovDegrees = this.fovDegrees,
  ): void {
    this.scene.present(
      renderPoseWithVehicleBoost(this.runtimeFrame.renderPose, this.vehicle),
      fovDegrees,
      deltaSeconds,
      this.runtime.simulationStep,
      snap,
    );
  }

  private emit(): void {
    this.onSnapshot?.(this.snapshot());
  }

  private startFrameLoop(): void {
    if (this.destroyed || this.phaseState !== "running") return;
    this.lastFrameTime = performance.now();
    this.lastFramePacingTime = this.lastFrameTime;
    this.framePacing.clear();
    this.requestNextFrame();
  }

  private requestNextFrame(): void {
    if (
      this.destroyed
      || (this.phaseState !== "running" && this.phaseState !== "paused")
      || this.animationFrame !== 0
    ) return;
    this.animationFrame = requestAnimationFrame(this.onFrame);
  }

  private stopFrameLoop(): void {
    if (this.animationFrame === 0) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  /** Runs one display frame; paused flights only poll gamepad button edges. */
  private readonly onFrame = (time: number): void => {
    this.animationFrame = 0;
    if (this.destroyed) return;
    if (this.phaseState === "paused") {
      // Keep the same loop alive for gamepad buttons, without advancing or drawing flight.
      this.requireInput().pollGamepadActions();
      this.requestNextFrame();
      return;
    }
    if (this.phaseState !== "running") return;
    const frameMs = time - this.lastFrameTime;
    const deltaSeconds = Math.min(
      0.1,
      Math.max(1 / 240, frameMs / 1_000),
    );
    this.lastFrameTime = time;
    this.framePacing.observe(frameMs);
    if (time - this.lastFramePacingTime >= 500) {
      this.lastFramePacingTime = time;
      const foreground = document.visibilityState === "visible" && document.hasFocus();
      this.scene.setFramePacing(
        foreground
          ? this.framePacing.sample()
          : { averageFps: null, p95FrameMs: null },
      );
    }
    if (this.runtime.paused) this.runtime.resume();
    this.runtimeFrame = this.runtime.tick(time);
    // A sampled gamepad action can pause or destroy this session during the tick.
    if (!this.destroyed && this.phaseState === "running") {
      this.present(false, deltaSeconds);
      if (time - this.lastSnapshotTime >= 50) {
        this.lastSnapshotTime = time;
        this.emit();
      }
    }
    this.requestNextFrame();
  };
}
