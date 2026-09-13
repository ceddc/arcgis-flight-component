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

export type FlightSessionPhase = "ready" | "running" | "paused" | "stopped";

export interface FlightSessionSnapshot {
  phase: FlightSessionPhase;
  vehicle: VehicleState;
  renderVehicle: VehicleState;
  altitudeMslM: number;
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

export interface FlightSessionOptions {
  scene: HostedFlightScene;
  config: PlaneNavigationConfig;
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
  private readonly scene: HostedFlightScene;
  private readonly onSnapshot?: (snapshot: FlightSessionSnapshot) => void;
  private readonly minimumClearanceM: number;
  private readonly maximumAglM: number;
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

  constructor(options: FlightSessionOptions) {
    this.scene = options.scene;
    this.onSnapshot = options.onSnapshot;
    this.minimumClearanceM = options.config.terrain.minimumClearanceM;
    this.maximumAglM = options.config.terrain.maximumAglM;
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

  get phase(): FlightSessionPhase {
    return this.phaseState;
  }

  get cameraMode(): FlightViewMode {
    return this.cameraModeState;
  }

  get powerMode(): FlightPowerMode {
    return this.powerModeState;
  }

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

  pause(): void {
    if (this.phaseState !== "running" || this.destroyed) return;
    this.phaseState = "paused";
    this.runtimeFrame = this.runtime.pause();
    this.emit();
  }

  resume(options: { focusScene?: boolean } = {}): void {
    if (this.phaseState !== "paused" || this.destroyed) return;
    this.phaseState = "running";
    if (options.focusScene) this.scene.sceneElement.focus();
    this.runtimeFrame = this.runtime.resume();
    this.emit();
    this.startFrameLoop();
  }

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

  toggleTurbo(): boolean {
    const enabled = this.powerModeState !== "turbo";
    this.setPowerMode(enabled ? "turbo" : "normal");
    return enabled;
  }

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

  setControlPatch(patch: ControlFramePatch): void {
    this.requireInitializedInput().setControlPatch(patch);
  }

  clearControlPatch(fields?: readonly (keyof ControlFrame)[]): void {
    const input = this.requireInitializedInput();
    input.clearControlPatch(fields);
    this.applyPowerModeToInput(input, this.powerModeState);
  }

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
      speed: this.scene.startState.speed,
    };
    this.smoothedPitchInput = 0;
  }

  private simulateStep(control: ControlFrame): void {
    if (this.phaseState !== "running") return;
    if (control.respawn) {
      this.recoverVehicle();
      return;
    }
    const previous = cloneVehicle(this.vehicle);
    this.smoothedPitchInput = smoothFlightPitchInput(
      this.smoothedPitchInput,
      control.pitch,
      FLIGHT_TUNING.fixedStepSeconds,
    );
    let next = stepFlight(
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
