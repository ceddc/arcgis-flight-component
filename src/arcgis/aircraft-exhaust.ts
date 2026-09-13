import { clamp } from "../core/math";

export interface AircraftExhaustFrame {
  lengthScale: number;
  opacity: number;
  visible: boolean;
}

/** Classic aircraft exhaust envelope from World Sky Tour. */
export class AircraftExhaustAnimation implements AircraftExhaustFrame {
  intensity = 0;
  lengthScale = 0.12;
  opacity = 0;
  visible = false;
  private phase = 0;
  private surge = 0;

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

  reset(): void {
    this.intensity = this.opacity = this.phase = this.surge = 0;
    this.lengthScale = 0.12;
    this.visible = false;
  }

  frame(): AircraftExhaustFrame {
    return { lengthScale: this.lengthScale, opacity: this.opacity, visible: this.visible };
  }
}

/** Keep the nozzle fixed as the imported plume scales along local Y. */
export function exhaustAnchorOffset(outletForwardM: number, lengthScale: number): number {
  return outletForwardM * (1 - lengthScale);
}
