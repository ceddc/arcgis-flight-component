import type {
  PlaneNavigationUiConfig,
  PlaneNavigationUiControl,
} from "../config";
import type { FlightSessionSnapshot } from "../controller";
import type { FlightViewMode } from "../core/camera-rig";
import type { FlightPowerMode } from "../core/power-mode";
import {
  flightCameraModeActionLabel,
  flightCameraModeLabel,
  flightPowerModeActionLabel,
  flightPowerModeLabel,
  flightText,
  translateFlightMessage,
  type FlightLocale,
} from "../i18n";

export interface FlightControlsActions {
  setPowerMode(mode: FlightPowerMode): void;
  togglePause(): void;
  setCameraMode(mode: FlightViewMode): void;
  recover(): void;
}

const POWER_MODES = ["slow", "normal", "turbo"] as const;

const COMPONENT_STYLE = `
  :host {
    display: block;
    color: #f7faf8;
    color-scheme: dark;
    font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif;
    pointer-events: auto;
  }

  * { box-sizing: border-box; }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: min(650px, calc(100vw - 30px));
    padding: 7px;
    border: 1px solid rgba(235, 242, 237, 0.2);
    border-radius: 16px;
    background: rgba(17, 31, 25, 0.9);
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(16px) saturate(0.9);
  }

  .speed {
    min-width: 78px;
    padding-inline: 8px 10px;
    color: rgba(247, 250, 248, 0.82);
    font-variant-numeric: tabular-nums;
    font-size: 0.78rem;
    font-weight: 650;
    letter-spacing: 0.01em;
    text-align: end;
    white-space: nowrap;
  }

  .power {
    display: flex;
    align-items: stretch;
    padding: 3px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.07);
  }

  button {
    min-height: 34px;
    margin: 0;
    padding: 6px 11px;
    border: 1px solid transparent;
    border-radius: 9px;
    color: rgba(247, 250, 248, 0.8);
    background: transparent;
    font: inherit;
    font-size: 0.73rem;
    font-weight: 620;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    color: #fff;
    background: rgba(255, 255, 255, 0.09);
  }

  button:focus-visible {
    outline: 2px solid #a9d6ae;
    outline-offset: 2px;
  }

  button:disabled {
    cursor: default;
    opacity: 0.46;
  }

  [role="radio"][aria-checked="true"] {
    border-color: rgba(194, 230, 197, 0.2);
    color: #14211a;
    background: #c8e4ca;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }

  [role="radio"][data-mode="turbo"][aria-checked="true"] {
    border-color: rgba(255, 220, 159, 0.3);
    color: #2b1d0c;
    background: #f4c879;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 3px;
    padding-inline-start: 3px;
    border-inline-start: 1px solid rgba(235, 242, 237, 0.14);
  }

  .action { background: rgba(255, 255, 255, 0.035); }

  @media (max-width: 680px) {
    .toolbar {
      flex-wrap: wrap;
      justify-content: flex-end;
      max-width: calc(100vw - 20px);
      border-radius: 14px;
    }

    .speed {
      min-width: auto;
      flex: 1 0 auto;
      text-align: start;
    }

    .power { flex: 0 0 auto; }

    .actions {
      width: 100%;
      justify-content: flex-end;
      padding-block-start: 4px;
      padding-inline-start: 0;
      border-block-start: 1px solid rgba(235, 242, 237, 0.14);
      border-inline-start: 0;
    }

    button {
      min-height: 36px;
      padding-inline: 10px;
    }
  }
`;

function includesControl(
  controls: readonly PlaneNavigationUiControl[],
  control: PlaneNavigationUiControl,
): boolean {
  return controls.includes(control);
}

export class FlightControlsOverlay {
  readonly element: HTMLDivElement;
  private readonly shadow: ShadowRoot;
  private readonly actions: FlightControlsActions;
  private eventController = new AbortController();
  private config: PlaneNavigationUiConfig;
  private locale: FlightLocale;
  private formatLocale: string;
  private speedFormatter: Intl.NumberFormat;
  private lastSpeedText = "";
  private snapshot: FlightSessionSnapshot | null = null;
  private structureKey = "";
  private speedOutput: HTMLSpanElement | null = null;
  private powerButtons = new Map<FlightPowerMode, HTMLButtonElement>();
  private pauseButton: HTMLButtonElement | null = null;
  private cameraButton: HTMLButtonElement | null = null;
  private recoverButton: HTMLButtonElement | null = null;

  constructor(
    ownerDocument: Document,
    config: PlaneNavigationUiConfig,
    locale: FlightLocale,
    formatLocale: string,
    actions: FlightControlsActions,
  ) {
    this.element = ownerDocument.createElement("div");
    this.element.dataset.arcgisFlightControls = "";
    this.element.className = "arcgis-flight-controls";
    this.shadow = this.element.attachShadow({ mode: "open" });
    this.actions = actions;
    this.config = config;
    this.locale = locale;
    this.formatLocale = formatLocale;
    this.speedFormatter = new Intl.NumberFormat(formatLocale, { maximumFractionDigits: 0 });
    this.rebuild();
  }

  update(
    config: PlaneNavigationUiConfig,
    locale: FlightLocale,
    formatLocale: string,
    snapshot: FlightSessionSnapshot | null,
  ): void {
    this.config = config;
    this.locale = locale;
    if (this.formatLocale !== formatLocale) {
      this.formatLocale = formatLocale;
      this.speedFormatter = new Intl.NumberFormat(formatLocale, { maximumFractionDigits: 0 });
      this.lastSpeedText = "";
    }
    this.snapshot = snapshot;
    const nextStructureKey = JSON.stringify({
      controls: config.controls,
      showSpeed: config.showSpeed,
      locale,
    });
    if (nextStructureKey !== this.structureKey) this.rebuild();
    this.renderState();
  }

  destroy(): void {
    this.eventController.abort();
    this.element.remove();
  }

  private rebuild(): void {
    this.eventController.abort();
    this.eventController = new AbortController();
    this.powerButtons.clear();
    this.pauseButton = null;
    this.cameraButton = null;
    this.recoverButton = null;
    this.speedOutput = null;
    this.lastSpeedText = "";
    this.structureKey = JSON.stringify({
      controls: this.config.controls,
      showSpeed: this.config.showSpeed,
      locale: this.locale,
    });

    const document = this.element.ownerDocument;
    const style = document.createElement("style");
    style.textContent = COMPONENT_STYLE;
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", flightText(this.locale, "controlsAria"));
    toolbar.lang = this.locale;

    if (this.config.showSpeed) {
      const speed = document.createElement("span");
      speed.className = "speed";
      speed.setAttribute("role", "meter");
      speed.setAttribute(
        "aria-label",
        translateFlightMessage(this.locale, "flight.speedAria"),
      );
      speed.setAttribute("aria-valuemin", "0");
      speed.setAttribute("aria-valuemax", "1200");
      speed.setAttribute("aria-valuenow", "0");
      speed.setAttribute("aria-valuetext", "0 km/h");
      speed.textContent = "0 km/h";
      toolbar.append(speed);
      this.speedOutput = speed;
    }

    if (includesControl(this.config.controls, "power")) {
      const group = document.createElement("div");
      group.className = "power";
      group.setAttribute("role", "radiogroup");
      group.setAttribute(
        "aria-label",
        translateFlightMessage(this.locale, "flight.speed"),
      );
      for (const [index, mode] of POWER_MODES.entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.mode = mode;
        button.dataset.index = String(index);
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.tabIndex = -1;
        button.textContent = flightPowerModeLabel(this.locale, mode);
        button.addEventListener(
          "click",
          () => this.actions.setPowerMode(mode),
          { signal: this.eventController.signal },
        );
        button.addEventListener(
          "keydown",
          (event) => this.handlePowerKey(event, index),
          { signal: this.eventController.signal },
        );
        group.append(button);
        this.powerButtons.set(mode, button);
      }
      toolbar.append(group);
    }

    const actionControls = this.config.controls.filter(
      (control) => control !== "power",
    );
    if (actionControls.length > 0) {
      const actionGroup = document.createElement("div");
      actionGroup.className = "actions";
      for (const control of actionControls) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "action";
        if (control === "pause") {
          button.addEventListener(
            "click",
            () => this.actions.togglePause(),
            { signal: this.eventController.signal },
          );
          this.pauseButton = button;
        } else if (control === "camera") {
          button.addEventListener(
            "click",
            () => this.actions.setCameraMode(
              this.snapshot?.cameraMode === "cockpit" ? "chase" : "cockpit",
            ),
            { signal: this.eventController.signal },
          );
          this.cameraButton = button;
        } else {
          button.addEventListener(
            "click",
            () => this.actions.recover(),
            { signal: this.eventController.signal },
          );
          this.recoverButton = button;
        }
        actionGroup.append(button);
      }
      toolbar.append(actionGroup);
    }

    this.shadow.replaceChildren(style, toolbar);
    this.renderState();
  }

  private renderState(): void {
    const snapshot = this.snapshot;
    const disabled = snapshot === null || snapshot.phase === "stopped";

    if (this.speedOutput) {
      const speedKmh = Math.round(Math.max(0, snapshot?.vehicle.speed ?? 0) * 3.6);
      const speedText = this.speedFormatter.format(speedKmh) + " km/h";
      if (speedText !== this.lastSpeedText) {
        this.lastSpeedText = speedText;
        this.speedOutput.textContent = speedText;
        this.speedOutput.setAttribute("aria-valuenow", String(speedKmh));
        this.speedOutput.setAttribute("aria-valuetext", speedText);
      }
    }

    for (const [mode, button] of this.powerButtons) {
      const selected = snapshot?.powerMode === mode;
      button.disabled = disabled;
      button.setAttribute("aria-checked", String(selected));
      button.setAttribute(
        "aria-label",
        selected
          ? flightPowerModeLabel(this.locale, mode)
          : flightPowerModeActionLabel(this.locale, mode),
      );
      button.tabIndex = selected ? 0 : -1;
    }
    if (!snapshot && this.powerButtons.size > 0) {
      const first = this.powerButtons.values().next().value;
      if (first) first.tabIndex = 0;
    }

    if (this.pauseButton) {
      const paused = snapshot?.phase === "paused";
      const label = flightText(
        this.locale,
        snapshot?.phase === "ready" ? "start" : paused ? "resume" : "pause",
      );
      this.pauseButton.disabled = disabled;
      this.pauseButton.textContent = label;
      this.pauseButton.setAttribute("aria-label", label);
      this.pauseButton.title = label;
    }

    if (this.cameraButton) {
      const targetMode: FlightViewMode =
        snapshot?.cameraMode === "cockpit" ? "chase" : "cockpit";
      this.cameraButton.disabled = disabled;
      this.cameraButton.textContent =
        flightCameraModeLabel(this.locale, targetMode);
      const label = flightCameraModeActionLabel(this.locale, targetMode);
      this.cameraButton.setAttribute("aria-label", label);
      this.cameraButton.title = label;
    }

    if (this.recoverButton) {
      const label = flightText(this.locale, "recover");
      this.recoverButton.disabled = disabled;
      this.recoverButton.textContent = label;
      this.recoverButton.setAttribute("aria-label", label);
      this.recoverButton.title = label;
    }
  }

  private handlePowerKey(event: KeyboardEvent, currentIndex: number): void {
    let nextIndex: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex + POWER_MODES.length - 1) % POWER_MODES.length;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % POWER_MODES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = POWER_MODES.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    const mode = POWER_MODES[nextIndex];
    this.actions.setPowerMode(mode);
    this.powerButtons.get(mode)?.focus();
  }
}
