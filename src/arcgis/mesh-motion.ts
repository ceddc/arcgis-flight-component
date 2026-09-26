/**
 * Compose aircraft attitude, model alignment and local attachment motion as
 * quaternions for ArcGIS meshes. Updates start from each mesh's authored
 * transform so repeated frames do not accumulate rotation or offset drift.
 */
import type Mesh from "@arcgis/core/geometry/Mesh.js";
import type Point from "@arcgis/core/geometry/Point.js";
import MeshTransform from "@arcgis/core/geometry/support/MeshTransform.js";

/** Degree/radian conversion constants used by quaternion construction. */
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Quaternion stored in ArcGIS-compatible x/y/z/w component order. */
export type Quaternion = readonly [x: number, y: number, z: number, w: number];
type Tuple3 = [x: number, y: number, z: number];
/** Euler order used when combining aircraft attitude with glTF model alignment. */
export type MeshRotationOrder = "xyz" | "yxz";

/** Original mesh transform components retained while applying per-frame motion. */
export interface MeshMotionState {
  transform: MeshTransform;
  baseTranslation: Tuple3;
  baseRotation: Quaternion;
}

/** Rotations to compose for one mesh update. Angles are in degrees. */
export interface MeshMotionPose {
  rotation: { x: number; y: number; z: number };
  localRotation?: { x: number; y: number; z: number };
  rotationOrder?: MeshRotationOrder;
}

/** Compose two quaternions, applying `second` before `first`. */
function multiplyQuaternion(first: Quaternion, second: Quaternion): Quaternion {
  const [ax, ay, az, aw] = first;
  const [bx, by, bz, bw] = second;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/** Build a normalized rotation quaternion from an arbitrary axis and angle. */
function axisAngleQuaternion(axis: readonly number[], angleDegrees: number): Quaternion {
  const length = Math.hypot(axis[0] ?? 0, axis[1] ?? 0, axis[2] ?? 0);
  if (length < 1e-8 || Math.abs(angleDegrees) < 1e-8) return [0, 0, 0, 1];
  const halfAngle = angleDegrees * DEG_TO_RAD / 2;
  const scale = Math.sin(halfAngle) / length;
  return [
    (axis[0] ?? 0) * scale,
    (axis[1] ?? 0) * scale,
    (axis[2] ?? 0) * scale,
    Math.cos(halfAngle),
  ];
}

/** Convert an Euler rotation to a quaternion in the requested application order. */
function eulerQuaternion(
  xDegrees: number,
  yDegrees: number,
  zDegrees: number,
  order: MeshRotationOrder = "xyz",
): Quaternion {
  const x = xDegrees * DEG_TO_RAD / 2;
  const y = yDegrees * DEG_TO_RAD / 2;
  const z = zDegrees * DEG_TO_RAD / 2;
  const qx: Quaternion = [Math.sin(x), 0, 0, Math.cos(x)];
  const qy: Quaternion = [0, Math.sin(y), 0, Math.cos(y)];
  const qz: Quaternion = [0, 0, Math.sin(z), Math.cos(z)];
  return order === "yxz"
    ? multiplyQuaternion(qz, multiplyQuaternion(qx, qy))
    : multiplyQuaternion(qz, multiplyQuaternion(qy, qx));
}

/** Rotate one 3D vector without allocating temporary quaternion products. */
function rotateQuaternionVector(quaternion: Quaternion, vector: Tuple3): Tuple3 {
  const [qx, qy, qz, qw] = quaternion;
  const [vx, vy, vz] = vector;
  const uv: Tuple3 = [
    qy * vz - qz * vy,
    qz * vx - qx * vz,
    qx * vy - qy * vx,
  ];
  const uuv: Tuple3 = [
    qy * uv[2] - qz * uv[1],
    qz * uv[0] - qx * uv[2],
    qx * uv[1] - qy * uv[0],
  ];
  return [
    vx + 2 * (qw * uv[0] + uuv[0]),
    vy + 2 * (qw * uv[1] + uuv[1]),
    vz + 2 * (qw * uv[2] + uuv[2]),
  ];
}

/**
 * Rotate an imported model-space offset by its authored orientation and current aircraft attitude.
 *
 * Used for attached propellers and exhaust so their anchor points follow the
 * aircraft rotation without changing their original mesh vertices.
 *
 * @param baseRotation Authored mesh orientation captured when motion state was created.
 * @param rotation Current aircraft Euler attitude in degrees.
 * @param localOffset Offset in the mesh's local coordinates.
 * @param order Euler application order used by the aircraft model.
 * @returns Rotated offset as an x/y/z tuple.
 */
export function transformMeshLocalOffset(
  baseRotation: Quaternion,
  rotation: MeshMotionPose["rotation"],
  localOffset: { x: number; y: number; z: number },
  order: MeshRotationOrder = "xyz",
): Tuple3 {
  const motion = eulerQuaternion(rotation.x, rotation.y, rotation.z, order);
  return rotateQuaternionVector(
    multiplyQuaternion(motion, baseRotation),
    [localOffset.x, localOffset.y, localOffset.z],
  );
}

/** Convert a quaternion into ArcGIS' axis plus angle representation. */
export function quaternionToAxisAngle(quaternion: Quaternion): {
  axis: Tuple3;
  angle: number;
} {
  const length = Math.hypot(...quaternion);
  let [x, y, z, w] = length > 1e-8
    ? quaternion.map((component) => component / length) as [number, number, number, number]
    : [0, 0, 0, 1];
  if (w < 0) {
    x = -x;
    y = -y;
    z = -z;
    w = -w;
  }
  const clampedW = Math.max(-1, Math.min(1, w));
  const angle = 2 * Math.acos(clampedW);
  const divisor = Math.sqrt(Math.max(0, 1 - clampedW * clampedW));
  return divisor < 1e-6
    ? { axis: [0, 0, 1], angle: 0 }
    : {
        axis: [x / divisor, y / divisor, z / divisor],
        angle: angle * RAD_TO_DEG,
      };
}

/** Capture a mesh's authored transform so animation can be applied without accumulating drift. */
export function createMeshMotionState(mesh: Mesh): MeshMotionState {
  const transform = mesh.transform?.clone() ?? new MeshTransform();
  const state: MeshMotionState = {
    transform,
    baseTranslation: [...transform.translation],
    baseRotation: axisAngleQuaternion(transform.rotationAxis, transform.rotationAngle),
  };
  mesh.transform = transform;
  return state;
}

/** Apply local spin in model coordinates, then model alignment and aircraft attitude. */
function rotationForPose(
  state: MeshMotionState,
  pose: MeshMotionPose,
): { axis: Tuple3; angle: number } {
  const motion = eulerQuaternion(
    pose.rotation.x,
    pose.rotation.y,
    pose.rotation.z,
    pose.rotationOrder,
  );
  const local = pose.localRotation
    ? eulerQuaternion(pose.localRotation.x, pose.localRotation.y, pose.localRotation.z)
    : [0, 0, 0, 1] as const;
  return quaternionToAxisAngle(
    multiplyQuaternion(motion, multiplyQuaternion(state.baseRotation, local)),
  );
}

/**
 * Apply a pose and location using a fresh transform based on the captured model transform.
 *
 * Rebuilding from `state.transform` avoids accumulating incremental rotation
 * error. Moving the mesh center keeps model vertices intact and lets ArcGIS
 * update the geometry through its supported mesh APIs.
 *
 * @param mesh ArcGIS mesh to move.
 * @param state Authored transform snapshot associated with the mesh.
 * @param pose Aircraft rotation and optional local component rotation.
 * @param location Scene-space center for this frame.
 */
export function updateMeshMotion(
  mesh: Mesh,
  state: MeshMotionState,
  pose: MeshMotionPose,
  location: Point,
): void {
  const rotation = rotationForPose(state, pose);
  // Move the mesh origin rather than rewriting every vertex on each frame.
  mesh.centerAt(location);
  const transform = state.transform.clone();
  transform.set({
    translation: state.baseTranslation,
    rotationAxis: rotation.axis,
    rotationAngle: rotation.angle,
  });
  mesh.transform = transform;
}
