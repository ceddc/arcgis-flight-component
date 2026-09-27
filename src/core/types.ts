/**
 * Defines the SDK-independent data exchanged between input, physics, and cameras.
 *
 * Positions are metres in the flight world's local plane, angles are degrees,
 * and speeds are metres per second. Control axes use [-1, 1] while throttle
 * and brake actions use [0, 1]; optional state fields belong to specific models.
 */
/** Two-dimensional flight-plane coordinates; position values are metres. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Flight-world position with altitude in metres. */
export interface Vec3 extends Vec2 {
  z: number;
}

/** Persistent simulation state; headings, pitch, and bank are degrees, speed is m/s. */
export interface VehicleState {
  position: Vec3;
  heading: number;
  pitch: number;
  bank: number;
  driftAngle: number;
  speed: number;
  throttle: number;
  launchBoost: number;
  cornerAssist: number;
  verticalSpeed: number;
  speedBar?: number;
  wingBrake?: number;
  speedBarRate?: number;
  wingBrakeRate?: number;
  wingRollRate?: number;
  wingPitchRate?: number;
  spaceTurnRate?: number;
  spacePitchRate?: number;
}

/** Normalized input sampled once per simulation frame; axes use `[-1, 1]`, actions `[0, 1]`. */
export interface ControlFrame {
  pitch: number;
  bank: number;
  yaw: number;
  accelerate: number;
  turboBoost?: boolean;
  brake: number;
  airbrake: boolean;
  respawn: boolean;
}

/** Partial host-supplied controls, merged over sampled hardware input. */
export type ControlFramePatch = Partial<ControlFrame>;
