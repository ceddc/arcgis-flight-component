/**
 * Animate the aircraft's afterburner plume from boost and acceleration.
 * Frame-rate independent smoothing controls length, opacity and visibility;
 * a separate offset helper keeps the scaled plume attached to its nozzle.
 */
import { clamp } from "../core/math";

/** Values needed by the renderer to draw one frame of the afterburner plume. */
export interface AircraftExhaustFrame {
  lengthScale: number;
  opacity: number;
  visible: boolean;
}

/** Frame-rate independent animation state for the classic aircraft afterburner plume. */
export class AircraftExhaustAnimation implements AircraftExhaustFrame {
  /** Smoothed turbo amount, ranging from 0 (off) to 1 (full effect). */
  intensity = 0;
  /** Current local-Y plume scale; values approach zero when the effect is extinguished. */
  lengthScale = 0.12;
  /** Current plume alpha sent to the renderer. */
  opacity = 0;
  /** Whether the renderer should show the plume graphic for this frame. */
  visible = false;
  private phase = 0;
  private surge = 0;

  /** Advance plume intensity and shape from boost/acceleration, respecting reduced-motion preferences. */
  update(boost: number, acceleration: number, deltaSeconds: number, reducedMotion: boolean): void {
    const dt = Number.isFinite(deltaSeconds) ? clamp(deltaSeconds, 0, 0.1) : 0;
    if (dt === 0) return;
    const target = Number.isFinite(boost) && boost > 1.5 ? clamp(boost - 1, 0, 1) : 0;
    const response = target > this.intensity ? 8 : 34;
    this.intensity = target + (this.intensity - target) * Math.exp(-response * dt);
    this.visible = this.intensity >= 0.015;
    if (!this.visible && target === 0) { this.reset(); return; }
    const accelerationTarget = !reducedMotion && target > 0 && Number.isFinite(acceleration)
      ? clamp(acceleration, 0, 1) : 0;
    this.surge = accelerationTarget + (this.surge - accelerationTarget) * Math.exp(-7 * dt);
    this.phase = (this.phase + dt * Math.PI * 2) % (Math.PI * 2);
    const pulse = reducedMotion ? 0 : Math.sin(this.phase * 2) * 0.045 + Math.sin(this.phase * 5) * 0.015;
    this.lengthScale = 0.12 + this.intensity * (0.92 + this.surge * 0.20 + pulse);
    this.opacity = clamp(this.intensity * (0.91 + this.surge * 0.07), 0, 1);
  }

  /** Clear all accumulated pulse and thrust state, such as when switching aircraft. */
  reset(): void {
    this.intensity = this.opacity = this.phase = this.surge = 0;
    this.lengthScale = 0.12;
    this.visible = false;
  }

  /** Copy the renderer-facing properties without exposing internal animation state. */
  frame(): AircraftExhaustFrame {
    return { lengthScale: this.lengthScale, opacity: this.opacity, visible: this.visible };
  }
}

/** Keep the plume outlet aligned with the engine nozzle as its local-Y scale changes. */
export function exhaustAnchorOffset(outletForwardM: number, lengthScale: number): number {
  return outletForwardM * (1 - lengthScale);
}
