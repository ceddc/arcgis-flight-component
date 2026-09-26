/**
 * Provide the touch flight joystick that the owning element mounts in ArcGIS UI.
 * This module builds the isolated accessible button, binds pointer gestures to
 * bank and pitch input, and releases input when disabled, moved or destroyed.
 */
import { bindTouchFlightStick } from "../input/touch-flight-stick";
import type { FlightLocale } from "../i18n";

/** Localized accessible name for each supported flight-control locale. */
const LABELS: Record<FlightLocale, string> = {
  en: "Flight joystick", fr: "Joystick de vol", de: "Flugjoystick",
  it: "Joystick di volo", es: "Joystick de vuelo",
};

/**
 * Create and manage the touch-stick DOM overlay used to steer the flight session.
 *
 * The button lives in a shadow root to isolate its compact styles from the host
 * page and is mounted in ArcGIS UI by the owning component. Input is disabled
 * outside the running phase.
 */
export class FlightJoystickOverlay {
  /** Wrapper element inserted into the host view's UI. */
  readonly element: HTMLDivElement;
  private readonly stick: HTMLButtonElement;
  private readonly binding: ReturnType<typeof bindTouchFlightStick>;

  /**
   * Build the stick and bind pointer movement to bank and pitch input.
   *
   * @param document Document that owns the overlay nodes.
   * @param onMove Receives the current normalized bank and pitch axes.
   */
  constructor(document: Document, onMove: (bank: number, pitch: number) => void) {
    this.element = document.createElement("div");
    this.element.dataset.flightStick = "";
    this.element.className = "arcgis-flight-joystick";
    const shadow = this.element.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { display:block; pointer-events:auto; padding:4px;
        margin-bottom:env(safe-area-inset-bottom, 0px); }
      button { position:relative; display:block; width:112px; height:112px;
        padding:0; border:1px solid #ffffffb3; border-radius:50%;
        background:#193b4d88; box-shadow:0 3px 16px #102f3940;
        touch-action:none; user-select:none; -webkit-user-select:none; cursor:grab; }
      button::before { content:""; position:absolute; inset:14px;
        border:1px solid #ffffff55; border-radius:50%; pointer-events:none; }
      button::after { content:""; position:absolute; width:46px; height:46px;
        left:50%; top:50%; border:1px solid #fff; border-radius:50%;
        background:#f4f8f4e8; box-shadow:0 2px 8px #102f3944; pointer-events:none;
        transform:translate(calc(-50% + var(--stick-x, 0px)), calc(-50% + var(--stick-y, 0px))); }
      button:active { cursor:grabbing; }
      button:disabled { opacity:.45; cursor:default; }
      button:focus-visible { outline:3px solid #55caff; outline-offset:3px; }
      @media (max-width:360px), (max-height:500px) { button { width:92px; height:92px; } }
    `;
    this.stick = document.createElement("button");
    this.stick.type = "button";
    this.stick.disabled = true;
    shadow.append(style, this.stick);
    this.binding = bindTouchFlightStick(this.stick, onMove);
  }

  /** Enable only during flight and reset an active gesture when flight stops. */
  update(running: boolean, locale: FlightLocale): void {
    if (!running && !this.stick.disabled) this.binding.reset();
    this.stick.disabled = !running;
    this.stick.setAttribute("aria-label", LABELS[locale]);
    this.stick.title = LABELS[locale];
  }

  /** Release a gesture and return the input and visible thumb to center. */
  reset(): void { this.binding.reset(); }
  /** Remove pointer listeners and the overlay element. */
  destroy(): void { this.binding.destroy(); this.element.remove(); }
}
