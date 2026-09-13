export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 extends Vec2 {
  z: number;
}

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
}

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

export type ControlFramePatch = Partial<ControlFrame>;
