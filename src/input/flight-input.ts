const FLIGHT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "KeyR",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
  "Space",
  "Escape",
]);

const ACTIVATION_KEYS_TO_PRESERVE = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

const EDITABLE_SELECTOR =
  "input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox']";
const ACTIVATION_SELECTOR = "button, a, [role='button'], [role='menuitem'], [role='radio']";
const DEFAULT_GAMEPAD_DEADZONE = 0.18;
const GAMEPAD_ARM_THRESHOLD = 0.28;

export const FLIGHT_KEYBOARD_TUNING = {
  attackResponse: 3.2,
  minimumAttackResponse: 2,
  maximumAttackResponse: 5,
  releaseResponse: 5.5,
  yawAuthority: 0.55,
} as const;

export interface FlightControlFrame {
  pitch: number;
  bank: number;
  yaw: number;
  accelerate: number;
  turboBoost: boolean;
  brake: number;
  airbrake: boolean;
  respawn: boolean;
}

export type FlightControlPatch = Partial<FlightControlFrame>;

export interface FlightInputSettings {
  sensitivity: number;
  invertPitch: boolean;
  keyboardEnabled: boolean;
  gamepadEnabled: boolean;
  gamepadDeadzone: number;
}

export const DEFAULT_FLIGHT_INPUT_SETTINGS = Object.freeze({
  sensitivity: 0.8,
  invertPitch: true,
  keyboardEnabled: true,
  gamepadEnabled: true,
  gamepadDeadzone: DEFAULT_GAMEPAD_DEADZONE,
}) satisfies Readonly<FlightInputSettings>;

export interface FlightGamepadReading {
  readonly index: number;
  readonly id: string;
  readonly mapping: string;
  readonly connected: boolean;
  readonly timestamp: number;
  readonly axes: readonly number[];
  readonly buttons: readonly Pick<GamepadButton, "pressed" | "value">[];
}

export interface FlightGamepadStatus {
  connected: boolean;
  index: number | null;
  id: string | null;
  mapping: string | null;
}

export interface FlightInputControllerOptions {
  target: HTMLElement;
  settings?: Partial<FlightInputSettings>;
  getSettings?: () => Partial<FlightInputSettings>;
  getGamepads?: () => readonly (FlightGamepadReading | null)[];
  onPauseRequested?: () => void;
  onRecoverRequested?: () => void;
  onPowerModeStepRequested?: (direction: "faster" | "slower") => void;
}

export type FlightKeyTargetKind = "none" | "editable" | "activation";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function finiteAxis(value: number | undefined): number {
  return clamp(finiteNumber(value, 0), -1, 1);
}

function finiteButtonValue(
  button: Pick<GamepadButton, "pressed" | "value"> | undefined,
): number {
  if (button?.pressed) return 1;
  return clamp(finiteNumber(button?.value, 0), 0, 1);
}

export function sanitizeFlightInputSettings(
  settings: Partial<FlightInputSettings> = {},
): FlightInputSettings {
  return {
    sensitivity: clamp(
      finiteNumber(settings.sensitivity, DEFAULT_FLIGHT_INPUT_SETTINGS.sensitivity),
      0.5,
      2,
    ),
    invertPitch: settings.invertPitch ?? DEFAULT_FLIGHT_INPUT_SETTINGS.invertPitch,
    keyboardEnabled: settings.keyboardEnabled ?? DEFAULT_FLIGHT_INPUT_SETTINGS.keyboardEnabled,
    gamepadEnabled: settings.gamepadEnabled ?? DEFAULT_FLIGHT_INPUT_SETTINGS.gamepadEnabled,
    gamepadDeadzone: clamp(
      finiteNumber(settings.gamepadDeadzone, DEFAULT_FLIGHT_INPUT_SETTINGS.gamepadDeadzone),
      0,
      0.75,
    ),
  };
}

export function applyGamepadDeadzone(
  value: number,
  threshold = DEFAULT_GAMEPAD_DEADZONE,
): number {
  const axis = finiteAxis(value);
  const safeThreshold = clamp(finiteNumber(threshold, DEFAULT_GAMEPAD_DEADZONE), 0, 0.75);
  const magnitude = Math.abs(axis);
  if (magnitude <= safeThreshold) return 0;
  return Math.sign(axis) * (magnitude - safeThreshold) / (1 - safeThreshold);
}

export function flightGamepadActivity(
  gamepad: FlightGamepadReading,
  axesReady = true,
): number {
  const primaryStick = axesReady
    ? Math.hypot(finiteAxis(gamepad.axes[0]), finiteAxis(gamepad.axes[1]))
    : 0;
  const button = gamepad.buttons.reduce(
    (maximum, candidate) => Math.max(maximum, finiteButtonValue(candidate)),
    0,
  );
  return Math.max(primaryStick, button);
}

export function selectFlightGamepad(
  gamepads: readonly (FlightGamepadReading | null)[],
  currentIndex: number | null,
  axisReadyIndexes?: ReadonlySet<number>,
  activityThreshold = DEFAULT_GAMEPAD_DEADZONE,
): FlightGamepadReading | null {
  const connected = gamepads.filter(
    (candidate): candidate is FlightGamepadReading =>
      Boolean(candidate?.connected && candidate.mapping === "standard"),
  );
  const current = connected.find(({ index }) => index === currentIndex) ?? null;
  if (current) return current;
  if (connected.length === 1) return connected[0] ?? null;

  const activity = (candidate: FlightGamepadReading): number => flightGamepadActivity(
    candidate,
    axisReadyIndexes?.has(candidate.index) ?? true,
  );
  return connected
    .filter((candidate) => activity(candidate) >= activityThreshold)
    .sort((left, right) => activity(right) - activity(left))[0] ?? null;
}

export function shouldCaptureFlightKey(
  code: string,
  targetKind: FlightKeyTargetKind,
): boolean {
  if (!FLIGHT_KEYS.has(code) || targetKind === "editable") return false;
  return targetKind !== "activation" || !ACTIVATION_KEYS_TO_PRESERVE.has(code);
}

function eventPath(event: Event): readonly EventTarget[] {
  const path = event.composedPath?.();
  return path?.length ? path : event.target ? [event.target] : [];
}

function matchesSelector(candidate: EventTarget, selector: string): boolean {
  const matchable = candidate as EventTarget & { matches?: (value: string) => boolean };
  try {
    return Boolean(matchable.matches?.(selector));
  } catch {
    return false;
  }
}

function flightKeyTargetKind(event: Event): FlightKeyTargetKind {
  const path = eventPath(event);
  if (path.some((candidate) => matchesSelector(candidate, EDITABLE_SELECTOR))) return "editable";
  if (path.some((candidate) => matchesSelector(candidate, ACTIVATION_SELECTOR))) return "activation";
  return "none";
}

function smoothDigitalAxis(
  current: number,
  target: number,
  response: number,
  deltaSeconds: number,
): number {
  const dt = clamp(finiteNumber(deltaSeconds, 1 / 60), 0, 0.1);
  return target + (current - target) * Math.exp(-response * dt);
}

function zeroControlFrame(): FlightControlFrame {
  return {
    pitch: 0,
    bank: 0,
    yaw: 0,
    accelerate: 0,
    turboBoost: false,
    brake: 0,
    airbrake: false,
    respawn: false,
  };
}

export class FlightInputController {
  private readonly target: HTMLElement;
  private readonly document: Document;
  private readonly view: Window;
  private readonly getLiveSettings?: () => Partial<FlightInputSettings>;
  private readonly getGamepads: () => readonly (FlightGamepadReading | null)[];
  private readonly onPauseRequested?: () => void;
  private readonly onRecoverRequested?: () => void;
  private readonly onPowerModeStepRequested?: (
    direction: "faster" | "slower",
  ) => void;
  private settingsState: FlightInputSettings;
  private readonly keys = new Set<string>();
  private controlPatch: FlightControlPatch = {};
  private interactionOwned = false;
  private recoveryLatched = false;
  private keyboardPitch = 0;
  private keyboardBank = 0;
  private keyboardYaw = 0;
  private gamepadSlot: number | null = null;
  private gamepadId: string | null = null;
  private gamepadMapping: string | null = null;
  private readonly gamepadAxesReady = new Set<number>();
  private gamepadAxesArmed = false;
  private menuPressed = false;
  private powerFasterPressed = false;
  private powerSlowerPressed = false;
  private destroyed = false;

  constructor(options: FlightInputControllerOptions) {
    this.target = options.target;
    this.document = options.target.ownerDocument;
    const view = this.document.defaultView;
    if (!view) throw new Error("FlightInputController requires a target in a browser document.");
    this.view = view;
    this.settingsState = sanitizeFlightInputSettings(options.settings);
    this.getLiveSettings = options.getSettings;
    this.getGamepads = options.getGamepads
      ?? (() => Array.from(this.view.navigator.getGamepads?.() ?? []));
    this.onPauseRequested = options.onPauseRequested;
    this.onRecoverRequested = options.onRecoverRequested;
    this.onPowerModeStepRequested = options.onPowerModeStepRequested;

    this.view.addEventListener("keydown", this.handleKeyDown, true);
    this.view.addEventListener("keyup", this.handleKeyUp, true);
    this.view.addEventListener("pointerdown", this.handlePointerDown, true);
    this.view.addEventListener("focusin", this.handleFocusIn, true);
    this.view.addEventListener("blur", this.handleWindowBlur);
    this.view.addEventListener("gamepadconnected", this.handleGamepadConnected);
    this.view.addEventListener("gamepaddisconnected", this.handleGamepadDisconnected);
    this.document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  get settings(): Readonly<FlightInputSettings> {
    return this.resolveSettings();
  }

  get gamepadStatus(): Readonly<FlightGamepadStatus> {
    return {
      connected: this.gamepadSlot !== null,
      index: this.gamepadSlot,
      id: this.gamepadId,
      mapping: this.gamepadMapping,
    };
  }

  updateSettings(patch: Partial<FlightInputSettings>): Readonly<FlightInputSettings> {
    this.settingsState = sanitizeFlightInputSettings({ ...this.settingsState, ...patch });
    if (!this.settingsState.keyboardEnabled) this.releaseKeyboard();
    if (!this.settingsState.gamepadEnabled) this.releaseGamepad();
    return this.settings;
  }

  setControlPatch(patch: FlightControlPatch): void {
    const next = { ...this.controlPatch };
    this.setNumericPatch(next, "pitch", patch.pitch, -1, 1);
    this.setNumericPatch(next, "bank", patch.bank, -1, 1);
    this.setNumericPatch(next, "yaw", patch.yaw, -1, 1);
    this.setNumericPatch(next, "accelerate", patch.accelerate, 0, 1);
    this.setNumericPatch(next, "brake", patch.brake, 0, 1);
    this.setBooleanPatch(next, "turboBoost", patch.turboBoost);
    this.setBooleanPatch(next, "airbrake", patch.airbrake);
    if (patch.respawn === true) this.requestRecovery();
    this.controlPatch = next;
  }

  clearControlPatch(fields?: readonly (keyof FlightControlFrame)[]): void {
    if (!fields) {
      this.controlPatch = {};
      this.recoveryLatched = false;
      return;
    }
    const next = { ...this.controlPatch };
    for (const field of fields) {
      if (field === "respawn") this.recoveryLatched = false;
      else delete next[field];
    }
    this.controlPatch = next;
  }

  requestPause(): void {
    if (!this.destroyed) this.onPauseRequested?.();
  }

  requestRecovery(): void {
    if (this.destroyed) return;
    this.recoveryLatched = true;
    this.onRecoverRequested?.();
  }

  // Paused sessions still need button edges so releasing and pressing Menu can resume.
  pollGamepadActions(): void {
    if (this.destroyed) return;
    this.pollGamepad(this.resolveSettings(), this.ownsInteraction());
  }

  sample(deltaSeconds = 1 / 60): FlightControlFrame {
    if (this.destroyed) return zeroControlFrame();
    const settings = this.resolveSettings();
    const ownsInteraction = this.ownsInteraction();
    const gamepad = this.pollGamepad(settings, ownsInteraction);
    const keyboardActive = ownsInteraction && settings.keyboardEnabled;

    if (!keyboardActive && this.keys.size > 0) this.releaseKeyboard();

    const pitchKeys = keyboardActive
      ? (this.hasEither("KeyW", "ArrowUp") ? 1 : 0)
        - (this.hasEither("KeyS", "ArrowDown") ? 1 : 0)
      : 0;
    const bankKeys = keyboardActive
      ? (this.hasEither("KeyD", "ArrowRight") ? 1 : 0)
        - (this.hasEither("KeyA", "ArrowLeft") ? 1 : 0)
      : 0;
    const yawKeys = keyboardActive
      ? (this.keys.has("KeyE") ? 1 : 0) - (this.keys.has("KeyQ") ? 1 : 0)
      : 0;
    const keyboardAttackResponse = clamp(
      FLIGHT_KEYBOARD_TUNING.attackResponse * settings.sensitivity,
      FLIGHT_KEYBOARD_TUNING.minimumAttackResponse,
      FLIGHT_KEYBOARD_TUNING.maximumAttackResponse,
    );
    this.keyboardPitch = smoothDigitalAxis(
      this.keyboardPitch,
      pitchKeys,
      pitchKeys === 0 ? FLIGHT_KEYBOARD_TUNING.releaseResponse : keyboardAttackResponse,
      deltaSeconds,
    );
    this.keyboardBank = smoothDigitalAxis(
      this.keyboardBank,
      bankKeys,
      bankKeys === 0 ? FLIGHT_KEYBOARD_TUNING.releaseResponse : keyboardAttackResponse,
      deltaSeconds,
    );
    this.keyboardYaw = smoothDigitalAxis(
      this.keyboardYaw,
      yawKeys * FLIGHT_KEYBOARD_TUNING.yawAuthority,
      yawKeys === 0 ? FLIGHT_KEYBOARD_TUNING.releaseResponse : keyboardAttackResponse,
      deltaSeconds,
    );

    const gamepadBank = applyGamepadDeadzone(gamepad?.axes[0] ?? 0, settings.gamepadDeadzone);
    const gamepadPitch = applyGamepadDeadzone(gamepad?.axes[1] ?? 0, settings.gamepadDeadzone);
    const pitchDirection = settings.invertPitch ? -1 : 1;
    const hardware: FlightControlFrame = {
      pitch: clamp(
        (this.keyboardPitch - gamepadPitch * settings.sensitivity) * pitchDirection,
        -1,
        1,
      ) || 0,
      bank: clamp(this.keyboardBank + gamepadBank * settings.sensitivity, -1, 1),
      yaw: clamp(
        this.keyboardYaw
          + finiteButtonValue(gamepad?.buttons[5])
          - finiteButtonValue(gamepad?.buttons[4]),
        -1,
        1,
      ),
      accelerate: clamp(
        (keyboardActive && this.hasEither("ShiftLeft", "ShiftRight") ? 1 : 0)
          + finiteButtonValue(gamepad?.buttons[7]),
        0,
        1,
      ),
      turboBoost: false,
      brake: clamp(
        (keyboardActive && this.keys.has("Space") ? 1 : 0)
          + finiteButtonValue(gamepad?.buttons[6]),
        0,
        1,
      ),
      airbrake: keyboardActive && this.keys.has("Space"),
      respawn: this.recoveryLatched,
    };
    this.recoveryLatched = false;
    return { ...hardware, ...this.controlPatch };
  }

  clear(): void {
    this.releaseKeyboard();
    this.controlPatch = {};
    this.recoveryLatched = false;
    this.interactionOwned = false;
    this.releaseGamepad();
    this.gamepadAxesReady.clear();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.view.removeEventListener("keydown", this.handleKeyDown, true);
    this.view.removeEventListener("keyup", this.handleKeyUp, true);
    this.view.removeEventListener("pointerdown", this.handlePointerDown, true);
    this.view.removeEventListener("focusin", this.handleFocusIn, true);
    this.view.removeEventListener("blur", this.handleWindowBlur);
    this.view.removeEventListener("gamepadconnected", this.handleGamepadConnected);
    this.view.removeEventListener("gamepaddisconnected", this.handleGamepadDisconnected);
    this.document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.clear();
  }

  private resolveSettings(): FlightInputSettings {
    return sanitizeFlightInputSettings({
      ...this.settingsState,
      ...this.getLiveSettings?.(),
    });
  }

  private setNumericPatch<K extends "pitch" | "bank" | "yaw" | "accelerate" | "brake">(
    target: FlightControlPatch,
    key: K,
    value: FlightControlPatch[K],
    minimum: number,
    maximum: number,
  ): void {
    if (value === undefined) return;
    target[key] = clamp(finiteNumber(value, 0), minimum, maximum);
  }

  private setBooleanPatch<K extends "turboBoost" | "airbrake">(
    target: FlightControlPatch,
    key: K,
    value: FlightControlPatch[K],
  ): void {
    if (value !== undefined) target[key] = Boolean(value);
  }

  private hasEither(left: string, right: string): boolean {
    return this.keys.has(left) || this.keys.has(right);
  }

  private ownsTarget(node: Element | null): boolean {
    if (!node) return false;
    if (node === this.target) return true;
    try {
      if (this.target.contains(node)) return true;
      return this.target.matches(":focus-within");
    } catch {
      return false;
    }
  }

  private ownsInteraction(event?: Event): boolean {
    if (this.document.visibilityState !== "visible" || !this.document.hasFocus()) {
      return false;
    }
    if (event && eventPath(event).includes(this.target)) return true;
    const activeElement = this.document.activeElement;
    if (activeElement && activeElement !== this.document.body) {
      return this.ownsTarget(activeElement);
    }
    return this.interactionOwned || this.ownsTarget(activeElement);
  }

  private releaseKeyboard(): void {
    this.keys.clear();
    this.keyboardPitch = 0;
    this.keyboardBank = 0;
    this.keyboardYaw = 0;
  }

  private pollGamepad(
    settings: FlightInputSettings,
    ownsInteraction: boolean,
  ): FlightGamepadReading | null {
    if (!settings.gamepadEnabled) {
      this.releaseGamepad();
      return null;
    }
    const gamepads = Array.from(this.getGamepads());
    const armThreshold = clamp(
      Math.max(GAMEPAD_ARM_THRESHOLD, settings.gamepadDeadzone + 0.1),
      0,
      0.9,
    );
    for (const candidate of gamepads) {
      if (!candidate?.connected || candidate.mapping !== "standard") continue;
      if (Math.hypot(finiteAxis(candidate.axes[0]), finiteAxis(candidate.axes[1])) <= armThreshold) {
        this.gamepadAxesReady.add(candidate.index);
      }
    }

    const current = gamepads.find(
      (candidate) => candidate?.connected
        && candidate.mapping === "standard"
        && candidate.index === this.gamepadSlot,
    ) ?? null;
    if (this.gamepadSlot !== null && !current) this.releaseGamepad();
    if (!ownsInteraction) {
      this.menuPressed = Boolean(current?.buttons[9]?.pressed);
      this.powerFasterPressed = Boolean(current?.buttons[12]?.pressed);
      this.powerSlowerPressed = Boolean(current?.buttons[13]?.pressed);
      return null;
    }

    const selected = selectFlightGamepad(
      gamepads,
      this.gamepadSlot,
      this.gamepadAxesReady,
      settings.gamepadDeadzone,
    );
    this.useGamepad(selected);
    if (!selected) return null;

    const rawBank = finiteAxis(selected.axes[0]);
    const rawPitch = finiteAxis(selected.axes[1]);
    if (!this.gamepadAxesArmed && Math.hypot(rawBank, rawPitch) <= armThreshold) {
      this.gamepadAxesArmed = true;
    }
    const menuPressed = Boolean(selected.buttons[9]?.pressed);
    if (menuPressed && !this.menuPressed) this.requestPause();
    this.menuPressed = menuPressed;
    const powerFasterPressed = Boolean(selected.buttons[12]?.pressed);
    if (powerFasterPressed && !this.powerFasterPressed) {
      this.onPowerModeStepRequested?.("faster");
    }
    this.powerFasterPressed = powerFasterPressed;
    const powerSlowerPressed = Boolean(selected.buttons[13]?.pressed);
    if (powerSlowerPressed && !this.powerSlowerPressed) {
      this.onPowerModeStepRequested?.("slower");
    }
    this.powerSlowerPressed = powerSlowerPressed;

    if (this.gamepadAxesArmed) return selected;
    return { ...selected, axes: selected.axes.map(() => 0) };
  }

  private useGamepad(gamepad: FlightGamepadReading | null): void {
    if (gamepad?.index === this.gamepadSlot) {
      this.gamepadId = gamepad.id;
      this.gamepadMapping = gamepad.mapping;
      return;
    }
    this.gamepadSlot = gamepad?.index ?? null;
    this.gamepadId = gamepad?.id ?? null;
    this.gamepadMapping = gamepad?.mapping ?? null;
    this.gamepadAxesArmed = gamepad ? this.gamepadAxesReady.has(gamepad.index) : false;
    this.menuPressed = false;
    this.powerFasterPressed = false;
    this.powerSlowerPressed = false;
  }

  private releaseGamepad(): void {
    this.useGamepad(null);
    this.gamepadAxesArmed = false;
    this.menuPressed = false;
    this.powerFasterPressed = false;
    this.powerSlowerPressed = false;
  }

  private capture(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const isRecoveryShortcut = event.code === "KeyR"
      && event.altKey
      && !event.ctrlKey
      && !event.metaKey;
    if (
      this.destroyed
      || event.isComposing
      || event.ctrlKey
      || event.metaKey
      || (event.altKey && !isRecoveryShortcut)
      || (event.code === "KeyR" && !isRecoveryShortcut)
      || !this.resolveSettings().keyboardEnabled
      || !this.ownsInteraction(event)
      || !shouldCaptureFlightKey(event.code, flightKeyTargetKind(event))
    ) {
      this.keys.delete(event.code);
      return;
    }
    this.capture(event);
    if (event.code === "Escape") {
      if (!event.repeat) this.requestPause();
      return;
    }
    if (isRecoveryShortcut) {
      if (!event.repeat) this.requestRecovery();
      return;
    }
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!FLIGHT_KEYS.has(event.code)) return;
    this.keys.delete(event.code);
    if (event.code === "KeyR") return;
    if (
      this.destroyed
      || event.isComposing
      || event.ctrlKey
      || event.metaKey
      || event.altKey
      || !this.resolveSettings().keyboardEnabled
      || !this.ownsInteraction(event)
      || !shouldCaptureFlightKey(event.code, flightKeyTargetKind(event))
    ) return;
    this.capture(event);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const owned = eventPath(event).includes(this.target);
    this.interactionOwned = owned;
    if (!owned) {
      this.releaseKeyboard();
      this.recoveryLatched = false;
    }
  };

  private readonly handleFocusIn = (event: FocusEvent): void => {
    this.interactionOwned = eventPath(event).includes(this.target);
    if (!this.interactionOwned) this.releaseKeyboard();
  };

  private readonly handleWindowBlur = (): void => {
    this.interactionOwned = false;
    this.releaseKeyboard();
    this.recoveryLatched = false;
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.document.visibilityState === "visible") return;
    this.handleWindowBlur();
  };

  private readonly handleGamepadConnected = (event: GamepadEvent): void => {
    if (event.gamepad.mapping !== "standard") return;
    if (Math.hypot(finiteAxis(event.gamepad.axes[0]), finiteAxis(event.gamepad.axes[1])) <= GAMEPAD_ARM_THRESHOLD) {
      this.gamepadAxesReady.add(event.gamepad.index);
    }
  };

  private readonly handleGamepadDisconnected = (event: GamepadEvent): void => {
    this.gamepadAxesReady.delete(event.gamepad.index);
    if (event.gamepad.index === this.gamepadSlot) this.releaseGamepad();
  };
}
