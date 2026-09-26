var yP = Object.defineProperty;
var GP = (e, A, P) => A in e ? yP(e, A, { enumerable: !0, configurable: !0, writable: !0, value: P }) : e[A] = P;
var w = (e, A, P) => GP(e, typeof A != "symbol" ? A + "" : A, P);
import { onLocaleChange as fP, getLocale as UP } from "@arcgis/core/intl.js";
import * as qe from "@arcgis/core/kernel.js";
import { version as wP } from "@arcgis/core/kernel.js";
import Oe from "@arcgis/core/Camera.js";
import kP from "@arcgis/core/Graphic.js";
import { isAbortError as aP } from "@arcgis/core/core/promiseUtils.js";
import * as RP from "@arcgis/core/core/reactiveUtils.js";
import nP from "@arcgis/core/geometry/Point.js";
import * as FP from "@arcgis/core/geometry/support/webMercatorUtils.js";
import SP from "@arcgis/core/layers/GraphicsLayer.js";
import DP from "@arcgis/core/symbols/FillSymbol3DLayer.js";
import gP from "@arcgis/core/symbols/MeshSymbol3D.js";
import xP from "@arcgis/core/geometry/support/MeshTransform.js";
import { subclass as NP } from "@arcgis/core/core/accessorSupport/decorators.js";
import HP from "@arcgis/core/views/3d/webgl/RenderNode.js";
const S = Math.PI / 180, sA = 180 / Math.PI;
function v(e, A, P) {
  return Math.min(P, Math.max(A, e));
}
function AA(e) {
  return (e % 360 + 360) % 360;
}
function XP(e, A) {
  return (A - e + 540) % 360 - 180;
}
function vP(e, A, P) {
  return AA(e + XP(e, A) * v(P, 0, 1));
}
function N(e, A, P) {
  return e + (A - e) * v(P, 0, 1);
}
function cP(e, A) {
  const P = e * S, t = A * S, s = Math.cos(t);
  return {
    x: Math.sin(P) * s,
    y: Math.cos(P) * s,
    z: Math.sin(t)
  };
}
const Ye = 78, ye = 3.5, WP = 1, lA = {
  fixedStepSeconds: 1 / 60,
  maxCatchUpSteps: 4,
  cruiseSpeed: 100,
  minimumSpeed: 48,
  maximumSpeed: 165,
  turboMaximumSpeed: 1200 / 3.6,
  boostAcceleration: 48,
  turboAcceleration: 160,
  brakeDeceleration: 52,
  boostSpeedDelta: 62,
  brakeSpeedDelta: 34,
  speedResponse: 3.6,
  turboSpeedResponse: 1.7,
  turboRecoveryResponse: 1.15,
  verticalResponse: 6,
  glideSink: 0,
  highSpeedTurnScale: 1,
  brakeTurnAuthority: 0,
  turnDrag: 0,
  recoverToCruise: 0,
  pitchInputResponse: 4,
  pitchResponse: 6.5,
  pitchLevelSettleSeconds: ye,
  pitchLevelResponse: Math.log(Ye / WP) / ye,
  bankResponse: 3.2,
  bankLevelResponse: 4.6,
  bankTurnAssistDeg: 62,
  yawRateDeg: 60,
  maximumTurnRateDeg: 108,
  maximumPitchDeg: Ye,
  maximumVerticalSpeed: 115,
  turboVerticalSpeedScale: 1,
  maximumBankDeg: 55,
  minimumAglM: 2.8,
  maximumAglM: 115
};
function TA(e, A, P, t) {
  return A + (e - A) * Math.exp(-P * t);
}
function JP(e, A, P, t = lA.pitchInputResponse) {
  const s = v(A, -1, 1);
  return Math.abs(s) <= 0.04 ? 0 : v(
    TA(
      v(e, -1, 1),
      s,
      t,
      v(P, 0, 0.1)
    ),
    -1,
    1
  );
}
function KP(e, A, P, t = lA.turboMaximumSpeed, s = lA) {
  const i = v(P, 0, 0.1), r = v(A.pitch, -1, 1), a = v(A.bank, -1, 1), o = v(A.yaw, -1, 1), n = v(A.accelerate, 0, 1), D = v(A.brake, 0, 1), g = A.turboBoost && D < 0.05 ? 1 : 0, u = r * s.maximumPitchDeg, l = a * s.maximumBankDeg, C = v(
    TA(
      e.pitch,
      u,
      Math.abs(r) > 0.04 ? s.pitchResponse : s.pitchLevelResponse,
      i
    ),
    -s.maximumPitchDeg,
    s.maximumPitchDeg
  ), d = v(
    TA(
      e.bank,
      l,
      Math.abs(a) > 0.04 ? s.bankResponse : s.bankLevelResponse,
      i
    ),
    -s.maximumBankDeg,
    s.maximumBankDeg
  ), M = s.maximumSpeed, c = v(
    t,
    Math.min(900 / 3.6, s.turboMaximumSpeed),
    s.turboMaximumSpeed
  ), j = !g && e.speed > M + 0.5, p = g ? c : j ? s.recoverToCruise ? s.cruiseSpeed : M : s.cruiseSpeed + n * s.boostSpeedDelta - D * s.brakeSpeedDelta, z = g ? s.turboSpeedResponse : j ? s.turboRecoveryResponse : s.speedResponse;
  let m = TA(e.speed, p, z, i);
  m += (n * s.boostAcceleration + g * s.turboAcceleration - D * s.brakeDeceleration) * i;
  const I = Math.max(Math.abs(a), Math.abs(o));
  m -= s.turnDrag * I * D * i, m -= Math.max(0, C) / s.maximumPitchDeg * 1.8 * i, m = v(
    m,
    s.minimumSpeed,
    g ? c : Math.max(M, e.speed)
  );
  const q = d * S, O = v(9.81 * Math.tan(q) / m * sA, -42, 42), T = v((m - s.cruiseSpeed) / Math.max(1, c - s.cruiseSpeed), 0, 1), Q = (1 + (s.highSpeedTurnScale - 1) * T) * (1 + s.brakeTurnAuthority * D * I), b = Math.sin(q) * s.bankTurnAssistDeg * Q, G = v(
    O + b + o * s.yawRateDeg * Q,
    -s.maximumTurnRateDeg,
    s.maximumTurnRateDeg
  ), y = AA(e.heading + G * i), f = C * S, k = Math.min(38, s.maximumBankDeg - 10), R = v(
    (Math.abs(d) - k) / (s.maximumBankDeg - k),
    0,
    1
  ), L = R * R * 2.8, F = Math.sin(f) * m - L - s.glideSink, Z = v(
    TA(e.verticalSpeed, F, s.verticalResponse, i),
    -s.maximumVerticalSpeed,
    s.maximumVerticalSpeed
  ), nA = Math.max(Math.min(8, s.minimumSpeed), Math.cos(f) * m), oA = y * S;
  return {
    position: {
      x: e.position.x + Math.sin(oA) * nA * i,
      y: e.position.y + Math.cos(oA) * nA * i,
      z: e.position.z + Z * i
    },
    heading: y,
    driftAngle: 0,
    cornerAssist: 0,
    pitch: C,
    bank: d,
    speed: m,
    throttle: g ? 1 : v(0.52 + n * 0.48 - D * 0.34, 0.18, 1),
    launchBoost: g ? 2 : n,
    verticalSpeed: Z
  };
}
const Ae = 9.81, H = {
  cruise: 50 / 3.6,
  minimum: 30 / 3.6,
  maximum: 80 / 3.6
}, ZP = 38 / 3.6, X = {
  maximumBankDeg: 32,
  maximumTurnRateDeg: 28,
  bankResponse: 2.4,
  bankLevelResponse: 3.2,
  controlResponse: 3.5,
  pitchResponse: 3,
  maximumFlareDeg: 8
};
function _P(e, A, P, t) {
  return A + (e - A) * Math.exp(-P * t);
}
function fA(e, A, P, t, s, i, r) {
  const a = e - P, o = A + t * a, n = Math.exp(-t * s), D = P + (a + o * s) * n, g = v(D, i, r);
  return [g, g === D ? (A - t * o * s) * n : 0];
}
function $P(e, A, P) {
  const t = v(P, 0, 0.1);
  if (t === 0) return { ...e, position: { ...e.position } };
  const s = v(A.pitch, -1, 1), i = v(A.bank, -1, 1), r = v(A.yaw, -1, 1), a = Math.max(v(A.brake, 0, 1), Math.max(0, s)), o = a > 0.01 ? 0 : Math.max(v(A.accelerate, 0, 1), Math.max(0, -s)), [n, D] = fA(
    e.speedBar ?? 0,
    e.speedBarRate ?? 0,
    o,
    X.controlResponse,
    t,
    0,
    1
  ), [g, u] = fA(
    e.wingBrake ?? 0,
    e.wingBrakeRate ?? 0,
    a,
    X.controlResponse,
    t,
    0,
    1
  ), l = n * (1 - g), C = v(i + r * 0.45, -1, 1), d = v((H.minimum * 1.05 / Math.max(H.minimum, e.speed)) ** 2, 0, 1), M = v(
    Math.acos(d) * sA,
    18,
    X.maximumBankDeg
  ), c = (0.7 * C + 0.3 * C ** 3) * M, p = Math.abs(c) < Math.abs(e.bank) || c * e.bank < 0 ? X.bankLevelResponse : X.bankResponse, [z, m] = fA(
    e.bank,
    e.wingRollRate ?? 0,
    c,
    p,
    t,
    -32,
    X.maximumBankDeg
  ), I = Math.abs(i) * 0.06, q = v(
    H.cruise + (H.maximum - H.cruise) * l - (H.cruise - H.minimum) * Math.max(g, I),
    H.minimum,
    H.maximum
  ), O = _P(e.speed, q, q > e.speed ? 1.65 : 1.6, t), T = (e.speed + O) / 2, Q = (e.bank + z) / 2 * S, b = 1 / Math.cos(Q), G = v((g - 0.65) / 0.35, 0, 1), y = (0.85 + 8e-3 * (T - ZP) ** 2 + 0.45 * l ** 2 + 0.65 * G ** 2) * b ** 1.2, f = v(
    (e.speed ** 2 - O ** 2) / (2 * Ae * t) - y,
    -10,
    5
  ), k = Math.min(O, Math.sqrt(Math.max(
    0,
    e.speed ** 2 - 2 * Ae * (f + y) * t
  ))), R = v(Ae * Math.tan(Q) / Math.max(H.minimum, T) * sA, -28, X.maximumTurnRateDeg), L = AA(e.heading + R * t), F = (e.heading + R * t / 2) * S, Z = Math.sqrt(Math.max(0, k ** 2 - f ** 2)), nA = Math.atan2(f, Math.max(1, Z)) * sA, oA = v(
    nA * 0.55 + g * 3,
    -12,
    X.maximumFlareDeg
  ), [OA, K] = fA(
    e.pitch,
    e.wingPitchRate ?? 0,
    oA,
    X.pitchResponse,
    t,
    -12,
    X.maximumFlareDeg
  );
  return {
    driftAngle: 0,
    cornerAssist: 0,
    position: {
      x: e.position.x + Math.sin(F) * Z * t,
      y: e.position.y + Math.cos(F) * Z * t,
      z: e.position.z + f * t
    },
    heading: L,
    pitch: OA,
    bank: z,
    speed: k,
    speedBar: n,
    wingBrake: g,
    wingRollRate: m,
    wingPitchRate: K,
    speedBarRate: D,
    wingBrakeRate: u,
    throttle: v(0.52 - g * 0.34, 0.18, 1),
    launchBoost: 0,
    verticalSpeed: f
  };
}
const tA = {
  classic: {
    id: "classic",
    tuning: lA,
    propeller: !0,
    exhaust: !0,
    cruiseExhaustIntensity: 0,
    cameraDistanceScale: 1,
    cameraHeightOffset: 0
  },
  "super-jet": {
    id: "super-jet",
    propeller: !1,
    exhaust: !0,
    cruiseExhaustIntensity: 0.2,
    cameraDistanceScale: 1.14,
    cameraHeightOffset: 0.2,
    tuning: {
      ...lA,
      cruiseSpeed: 285,
      minimumSpeed: 105,
      maximumSpeed: 460,
      turboMaximumSpeed: 900,
      boostAcceleration: 100,
      turboAcceleration: 130,
      brakeDeceleration: 180,
      boostSpeedDelta: 165,
      brakeSpeedDelta: 155,
      speedResponse: 1.1,
      turboSpeedResponse: 0.55,
      turboRecoveryResponse: 0.5,
      highSpeedTurnScale: 0.65,
      brakeTurnAuthority: 0.45,
      turnDrag: 28,
      recoverToCruise: 1,
      pitchInputResponse: 3.2,
      pitchResponse: 4,
      bankResponse: 2.4,
      bankLevelResponse: 2.5,
      bankTurnAssistDeg: 43,
      yawRateDeg: 32,
      maximumBankDeg: 67,
      maximumTurnRateDeg: 80,
      maximumVerticalSpeed: 210
    }
  },
  "space-jet": {
    id: "space-jet",
    propeller: !1,
    exhaust: !0,
    cruiseExhaustIntensity: 0.24,
    cameraDistanceScale: 1.14,
    cameraHeightOffset: 0.3,
    tuning: {
      ...lA,
      cruiseSpeed: 650,
      minimumSpeed: 70,
      maximumSpeed: 1100,
      turboMaximumSpeed: 1e4,
      boostAcceleration: 600,
      turboAcceleration: 6e3,
      brakeDeceleration: 5e3,
      boostSpeedDelta: 450,
      brakeSpeedDelta: 500,
      speedResponse: 5,
      turboSpeedResponse: 2.6,
      turboRecoveryResponse: 2.5,
      pitchInputResponse: 7,
      pitchResponse: 3,
      bankResponse: 3.5,
      bankLevelResponse: 4.5,
      pitchLevelResponse: 3.6,
      bankTurnAssistDeg: 48,
      yawRateDeg: 32,
      maximumBankDeg: 50,
      maximumPitchDeg: 75,
      maximumTurnRateDeg: 65,
      maximumVerticalSpeed: 1300,
      verticalResponse: 14,
      turboVerticalSpeedScale: 2.4
    }
  },
  paraglider: {
    id: "paraglider",
    propeller: !1,
    exhaust: !1,
    cruiseExhaustIntensity: 0,
    cameraDistanceScale: 1.08,
    cameraHeightOffset: 0.9,
    tuning: {
      ...lA,
      cruiseSpeed: H.cruise,
      minimumSpeed: H.minimum,
      maximumSpeed: H.maximum,
      turboMaximumSpeed: H.maximum,
      boostAcceleration: 3,
      turboAcceleration: 5,
      brakeDeceleration: 4,
      boostSpeedDelta: 7,
      brakeSpeedDelta: 5,
      speedResponse: 1.65,
      turboSpeedResponse: 1.65,
      turboRecoveryResponse: 1.6,
      pitchInputResponse: 1.7,
      pitchResponse: 1.6,
      pitchLevelResponse: 0.8,
      bankResponse: X.bankResponse,
      bankLevelResponse: X.bankLevelResponse,
      maximumBankDeg: X.maximumBankDeg,
      maximumPitchDeg: 24,
      bankTurnAssistDeg: 8,
      yawRateDeg: 12,
      maximumTurnRateDeg: X.maximumTurnRateDeg,
      maximumVerticalSpeed: 10,
      verticalResponse: 1.6,
      glideSink: 1.1
    }
  }
};
for (const e of Object.values(tA))
  Object.freeze(e.tuning), Object.freeze(e);
Object.freeze(tA);
function lP(e) {
  return {
    kind: "scene-element",
    scene: e,
    get view() {
      return e.view;
    },
    get map() {
      return e.map;
    },
    get inputElement() {
      return e;
    },
    whenReady: () => e.viewOnReady(),
    mountControls(A, P) {
      A.slot = P, e.append(A);
    },
    unmountControls(A) {
      A.remove();
    }
  };
}
function At(e) {
  if (e.type !== "3d")
    throw new TypeError("Plane navigation view must be an ArcGIS SceneView (type 3d).");
  return {
    kind: "scene-view",
    scene: null,
    view: e,
    get map() {
      return e.map;
    },
    get inputElement() {
      const A = e.container;
      if (!A || typeof A == "string")
        throw new Error("Plane navigation requires the SceneView to have an HTML container.");
      return A;
    },
    async whenReady() {
      if (e.destroyed) throw new Error("Plane navigation cannot use a destroyed SceneView.");
      if (await e.when(), e.destroyed) throw new Error("Plane navigation cannot use a destroyed SceneView.");
    },
    mountControls(A, P) {
      A.removeAttribute("slot");
      const t = P.replace("-start", "-leading").replace("-end", "-trailing");
      e.ui.add(A, t);
    },
    unmountControls(A) {
      e.destroyed || e.ui.remove(A), A.remove();
    }
  };
}
function et(e) {
  return "kind" in e ? e : lP(e);
}
function Ge(e = {
  promiseWithResolvers: Promise.withResolvers,
  abortController: typeof AbortController > "u" ? void 0 : AbortController,
  abortSignalThrowIfAborted: typeof AbortSignal > "u" ? void 0 : AbortSignal.prototype.throwIfAborted
}) {
  const A = [
    ["Promise.withResolvers", e.promiseWithResolvers],
    ["AbortController", e.abortController],
    ["AbortSignal.throwIfAborted", e.abortSignalThrowIfAborted]
  ];
  for (const [P, t] of A)
    if (typeof t != "function")
      throw new Error(`Plane navigation requires browser support for ${P}. Update your browser before starting a flight.`);
}
const Pt = ["slow", "normal", "turbo"];
function Me(e) {
  return Pt.includes(e);
}
function tt(e) {
  return {
    brake: e === "slow" ? 1 : 0,
    turboBoost: e === "turbo"
  };
}
function st(e, A) {
  return A === "faster" ? e === "slow" ? "normal" : "turbo" : e === "turbo" ? "normal" : "slow";
}
const BP = 0.8, uP = 65, it = !0, fe = 78, Ue = 3.5, ot = 1, h = {
  fixedStepSeconds: 1 / 60,
  maxCatchUpSteps: 4,
  cruiseSpeed: 100,
  minimumSpeed: 48,
  maximumSpeed: 165,
  turboMaximumSpeed: 1200 / 3.6,
  boostAcceleration: 48,
  turboAcceleration: 160,
  brakeDeceleration: 52,
  pitchInputResponse: 4,
  pitchResponse: 6.5,
  pitchLevelSettleSeconds: Ue,
  pitchLevelResponse: Math.log(fe / ot) / Ue,
  bankResponse: 3.2,
  bankLevelResponse: 4.6,
  bankTurnAssistDeg: 62,
  yawRateDeg: 60,
  maximumTurnRateDeg: 108,
  maximumPitchDeg: fe,
  maximumVerticalSpeed: 115,
  maximumBankDeg: 55,
  minimumAglM: 2.8,
  maximumAglM: 115
};
function LA(e, A, P, t) {
  return A + (e - A) * Math.exp(-P * t);
}
function rt(e, A, P) {
  const t = v(A, -1, 1);
  return Math.abs(t) <= 0.04 ? 0 : v(
    LA(
      v(e, -1, 1),
      t,
      h.pitchInputResponse,
      v(P, 0, 0.1)
    ),
    -1,
    1
  );
}
function CP(e) {
  return v(e, 0.1, 2);
}
function dP(e, A, P = 1) {
  const t = CP(P);
  return {
    position: { ...e },
    heading: AA(A),
    pitch: 0,
    bank: 0,
    driftAngle: 0,
    speed: h.cruiseSpeed * t,
    throttle: 0.52,
    launchBoost: 0,
    cornerAssist: 0,
    verticalSpeed: 0
  };
}
function wt(e, A, P, t = 1, s = h.turboMaximumSpeed) {
  const i = v(P, 0, 0.1), r = CP(t), a = v(A.pitch, -1, 1), o = v(A.bank, -1, 1), n = v(A.yaw, -1, 1), D = v(A.accelerate, 0, 1), g = v(Math.max(A.brake, A.airbrake ? 1 : 0), 0, 1), u = A.turboBoost && g < 0.05 ? 1 : 0, l = a * h.maximumPitchDeg, C = o * h.maximumBankDeg, d = v(
    LA(
      e.pitch,
      l,
      Math.abs(a) > 0.04 ? h.pitchResponse : h.pitchLevelResponse,
      i
    ),
    -h.maximumPitchDeg,
    h.maximumPitchDeg
  ), M = v(
    LA(
      e.bank,
      C,
      Math.abs(o) > 0.04 ? h.bankResponse : h.bankLevelResponse,
      i
    ),
    -h.maximumBankDeg,
    h.maximumBankDeg
  ), c = h.maximumSpeed * r, j = v(
    s,
    900 / 3.6,
    h.turboMaximumSpeed
  ) * r, p = !u && e.speed > c + 0.5, z = u ? j : p ? c : (h.cruiseSpeed + D * 62 - g * 34) * r, m = u ? 1.7 : p ? 1.15 : 3.6;
  let I = LA(e.speed, z, m, i);
  I += (D * h.boostAcceleration + u * h.turboAcceleration - g * h.brakeDeceleration) * r * i, I -= Math.max(0, d) / h.maximumPitchDeg * 1.8 * r * i, I = v(
    I,
    h.minimumSpeed * r,
    u ? j : Math.max(c, e.speed)
  );
  const q = M * S, O = v(9.81 * Math.tan(q) / I * sA, -42, 42), T = Math.sin(q) * h.bankTurnAssistDeg, Q = v(
    O + T + n * h.yawRateDeg,
    -h.maximumTurnRateDeg,
    h.maximumTurnRateDeg
  ), b = AA(e.heading + Q * i), G = d * S, y = v(
    (Math.abs(M) - 38) / (h.maximumBankDeg - 38),
    0,
    1
  ), f = y * y * 2.8, k = Math.sin(G) * I - f, R = v(
    LA(e.verticalSpeed, k, 6, i),
    -h.maximumVerticalSpeed * r,
    h.maximumVerticalSpeed * r
  ), L = Math.max(8 * r, Math.cos(G) * I), F = b * S;
  return {
    position: {
      x: e.position.x + Math.sin(F) * L * i,
      y: e.position.y + Math.cos(F) * L * i,
      z: e.position.z + R * i
    },
    heading: b,
    pitch: d,
    bank: M,
    driftAngle: 0,
    speed: I,
    throttle: u ? 1 : v(0.52 + D * 0.48 - g * 0.34, 0.18, 1),
    launchBoost: u ? 2 : D,
    cornerAssist: 0,
    verticalSpeed: R
  };
}
function at(e, A, P) {
  const t = A + P;
  return e.position.z >= t ? e : {
    ...e,
    position: { ...e.position, z: t + 0.8 },
    pitch: Math.max(5, e.pitch),
    verticalSpeed: Math.max(7, e.verticalSpeed)
  };
}
function nt(e, A, P = 1) {
  return dP(
    e,
    0,
    P
  );
}
const Dt = ["en", "de", "fr", "it", "es"], MP = "en", Hi = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  es: "Español"
}, gt = {
  "language.label": "Language",
  "language.select": "Choose language",
  "language.current": "Language: {language}. Choose another language",
  "flight.settings": "Settings",
  "flight.hideInterface": "Hide interface",
  "flight.showInterface": "Show interface",
  "flight.controls": "Flight controls",
  "flight.controlsAria": "Flight and scene controls",
  "flight.speed": "Speed",
  "flight.speedAria": "Flight speed",
  "flight.paused": "Flight paused",
  "flight.continue": "Continue flying",
  "flight.turbo": "Turbo",
  "flight.cruise": "Cruise",
  "flight.slow": "Slow",
  "flight.speedOptionAria": "{mode} speed{selected}",
  "flight.speedSelectedSuffix": ", selected",
  "flight.selectSpeed": "Select {mode} speed",
  "flight.turboSpeed": "Turbo speed",
  "flight.turboSpeedSelected": "Turbo speed, selected",
  "flight.cruiseSpeed": "Cruise speed",
  "flight.cruiseSpeedSelected": "Cruise speed, selected",
  "flight.slowSpeed": "Slow speed",
  "flight.slowSpeedSelected": "Slow speed, selected",
  "flight.selectTurboSpeed": "Select Turbo speed",
  "flight.selectCruiseSpeed": "Select Cruise speed",
  "flight.selectSlowSpeed": "Select Slow speed",
  "flight.cockpit": "Cockpit",
  "flight.exterior": "Exterior",
  "flight.switchCockpit": "Switch to cockpit view",
  "flight.switchExterior": "Switch to exterior view",
  "flight.start": "Start flying",
  "flight.pause": "Pause",
  "flight.recover": "Recover",
  "flight.toast.cockpit": "Cockpit view",
  "flight.toast.exterior": "Exterior view",
  "flight.toast.turbo": "Turbo armed",
  "flight.toast.slow": "Slow speed",
  "flight.toast.cruise": "Cruise speed",
  "flight.toast.recovered": "Plane recovered",
  "settings.title": "Flight settings",
  "settings.close": "Close settings",
  "settings.actions": "Flight actions",
  "settings.actionsHelp": "Pause or safely place the aircraft back above the terrain.",
  "settings.controlsCamera": "Controls and camera",
  "settings.sensitivity": "Control sensitivity",
  "settings.sensitivityHelp": "How quickly the aircraft responds",
  "settings.gentle": "Gentle",
  "settings.quick": "Quick",
  "settings.fov": "Field of view",
  "settings.fovHelp": "Width of the flight camera",
  "settings.narrow": "Narrow",
  "settings.wide": "Wide",
  "settings.planePitch": "Plane-style pitch",
  "settings.planePitchHelp": "Pull back to climb, push forward to descend",
  "status.label": "Status",
  "status.idle": "Idle",
  "status.loading": "Loading",
  "status.ready": "Ready",
  "status.running": "Flying",
  "status.paused": "Paused",
  "status.error": "Error"
}, vt = {
  "language.label": "Sprache",
  "language.select": "Sprache auswählen",
  "language.current": "Sprache: {language}. Andere Sprache auswählen",
  "flight.settings": "Einstellungen",
  "flight.hideInterface": "Bedienoberfläche ausblenden",
  "flight.showInterface": "Bedienoberfläche einblenden",
  "flight.controls": "Flugsteuerung",
  "flight.controlsAria": "Flug- und Szenensteuerung",
  "flight.speed": "Tempo",
  "flight.speedAria": "Fluggeschwindigkeit",
  "flight.paused": "Flug pausiert",
  "flight.continue": "Weiterfliegen",
  "flight.turbo": "Turbo",
  "flight.cruise": "Reiseflug",
  "flight.slow": "Langsam",
  "flight.speedOptionAria": "{mode}-Geschwindigkeit{selected}",
  "flight.speedSelectedSuffix": ", ausgewählt",
  "flight.selectSpeed": "{mode}-Geschwindigkeit wählen",
  "flight.turboSpeed": "Turbogeschwindigkeit",
  "flight.turboSpeedSelected": "Turbogeschwindigkeit, ausgewählt",
  "flight.cruiseSpeed": "Reisegeschwindigkeit",
  "flight.cruiseSpeedSelected": "Reisegeschwindigkeit, ausgewählt",
  "flight.slowSpeed": "Niedrige Geschwindigkeit",
  "flight.slowSpeedSelected": "Niedrige Geschwindigkeit, ausgewählt",
  "flight.selectTurboSpeed": "Turbogeschwindigkeit wählen",
  "flight.selectCruiseSpeed": "Reisegeschwindigkeit wählen",
  "flight.selectSlowSpeed": "Niedrige Geschwindigkeit wählen",
  "flight.cockpit": "Cockpit",
  "flight.exterior": "Aussenansicht",
  "flight.switchCockpit": "Zur Cockpitansicht wechseln",
  "flight.switchExterior": "Zur Aussenansicht wechseln",
  "flight.start": "Flug starten",
  "flight.pause": "Pause",
  "flight.recover": "Zurücksetzen",
  "flight.toast.cockpit": "Cockpitansicht",
  "flight.toast.exterior": "Aussenansicht",
  "flight.toast.turbo": "Turbo aktiviert",
  "flight.toast.slow": "Langsamflug",
  "flight.toast.cruise": "Reisegeschwindigkeit",
  "flight.toast.recovered": "Flugzeug neu positioniert",
  "settings.title": "Flugeinstellungen",
  "settings.close": "Einstellungen schliessen",
  "settings.actions": "Flugaktionen",
  "settings.actionsHelp": "Flug pausieren oder das Flugzeug sicher über dem Gelände neu positionieren.",
  "settings.controlsCamera": "Steuerung und Kamera",
  "settings.sensitivity": "Steuerempfindlichkeit",
  "settings.sensitivityHelp": "Wie schnell das Flugzeug reagiert",
  "settings.gentle": "Sanft",
  "settings.quick": "Direkt",
  "settings.fov": "Sichtfeld",
  "settings.fovHelp": "Blickwinkel der Flugkamera",
  "settings.narrow": "Eng",
  "settings.wide": "Weit",
  "settings.planePitch": "Flugzeugtypische Höhensteuerung",
  "settings.planePitchHelp": "Zum Steigen ziehen, zum Sinken drücken",
  "status.label": "Status",
  "status.idle": "Inaktiv",
  "status.loading": "Wird geladen",
  "status.ready": "Bereit",
  "status.running": "Im Flug",
  "status.paused": "Pausiert",
  "status.error": "Fehler"
}, ct = {
  "language.label": "Langue",
  "language.select": "Choisir la langue",
  "language.current": "Langue : {language}. Choisir une autre langue",
  "flight.settings": "Paramètres",
  "flight.hideInterface": "Masquer l’interface",
  "flight.showInterface": "Afficher l’interface",
  "flight.controls": "Commandes de vol",
  "flight.controlsAria": "Commandes de vol et de la scène",
  "flight.speed": "Vitesse",
  "flight.speedAria": "Vitesse de vol",
  "flight.paused": "Vol en pause",
  "flight.continue": "Reprendre le vol",
  "flight.turbo": "Turbo",
  "flight.cruise": "Croisière",
  "flight.slow": "Réduite",
  "flight.speedOptionAria": "Vitesse : {mode}{selected}",
  "flight.speedSelectedSuffix": ", sélectionnée",
  "flight.selectSpeed": "Sélectionner la vitesse : {mode}",
  "flight.turboSpeed": "Vitesse Turbo",
  "flight.turboSpeedSelected": "Vitesse Turbo, sélectionnée",
  "flight.cruiseSpeed": "Vitesse de croisière",
  "flight.cruiseSpeedSelected": "Vitesse de croisière, sélectionnée",
  "flight.slowSpeed": "Vitesse réduite",
  "flight.slowSpeedSelected": "Vitesse réduite, sélectionnée",
  "flight.selectTurboSpeed": "Sélectionner la vitesse Turbo",
  "flight.selectCruiseSpeed": "Sélectionner la vitesse de croisière",
  "flight.selectSlowSpeed": "Sélectionner la vitesse réduite",
  "flight.cockpit": "Cockpit",
  "flight.exterior": "Extérieur",
  "flight.switchCockpit": "Passer en vue cockpit",
  "flight.switchExterior": "Passer en vue extérieure",
  "flight.start": "Démarrer le vol",
  "flight.pause": "Pause",
  "flight.recover": "Replacer",
  "flight.toast.cockpit": "Vue cockpit",
  "flight.toast.exterior": "Vue extérieure",
  "flight.toast.turbo": "Turbo activé",
  "flight.toast.slow": "Vitesse réduite",
  "flight.toast.cruise": "Vitesse de croisière",
  "flight.toast.recovered": "Avion replacé",
  "settings.title": "Paramètres de vol",
  "settings.close": "Fermer les paramètres",
  "settings.actions": "Actions de vol",
  "settings.actionsHelp": "Mettez le vol en pause ou replacez l’avion en sécurité au-dessus du terrain.",
  "settings.controlsCamera": "Commandes et caméra",
  "settings.sensitivity": "Sensibilité des commandes",
  "settings.sensitivityHelp": "Réactivité de l’avion aux commandes",
  "settings.gentle": "Douce",
  "settings.quick": "Vive",
  "settings.fov": "Champ de vision",
  "settings.fovHelp": "Largeur du champ de la caméra",
  "settings.narrow": "Étroit",
  "settings.wide": "Large",
  "settings.planePitch": "Pilotage type avion",
  "settings.planePitchHelp": "Tirez pour monter, poussez pour descendre",
  "status.label": "État",
  "status.idle": "Inactif",
  "status.loading": "Chargement",
  "status.ready": "Prêt",
  "status.running": "En vol",
  "status.paused": "En pause",
  "status.error": "Erreur"
}, lt = {
  "language.label": "Lingua",
  "language.select": "Seleziona lingua",
  "language.current": "Lingua: {language}. Scegli un’altra lingua",
  "flight.settings": "Impostazioni",
  "flight.hideInterface": "Nascondi interfaccia",
  "flight.showInterface": "Mostra interfaccia",
  "flight.controls": "Comandi di volo",
  "flight.controlsAria": "Comandi di volo e della scena",
  "flight.speed": "Velocità",
  "flight.speedAria": "Velocità di volo",
  "flight.paused": "Volo in pausa",
  "flight.continue": "Riprendi il volo",
  "flight.turbo": "Turbo",
  "flight.cruise": "Crociera",
  "flight.slow": "Ridotta",
  "flight.speedOptionAria": "Velocità {mode}{selected}",
  "flight.speedSelectedSuffix": ", selezionata",
  "flight.selectSpeed": "Seleziona la velocità {mode}",
  "flight.turboSpeed": "Velocità turbo",
  "flight.turboSpeedSelected": "Velocità turbo, selezionata",
  "flight.cruiseSpeed": "Velocità di crociera",
  "flight.cruiseSpeedSelected": "Velocità di crociera, selezionata",
  "flight.slowSpeed": "Velocità ridotta",
  "flight.slowSpeedSelected": "Velocità ridotta, selezionata",
  "flight.selectTurboSpeed": "Seleziona la velocità turbo",
  "flight.selectCruiseSpeed": "Seleziona la velocità di crociera",
  "flight.selectSlowSpeed": "Seleziona la velocità ridotta",
  "flight.cockpit": "Cabina",
  "flight.exterior": "Esterna",
  "flight.switchCockpit": "Passa alla visuale dalla cabina",
  "flight.switchExterior": "Passa alla visuale esterna",
  "flight.start": "Avvia il volo",
  "flight.pause": "Pausa",
  "flight.recover": "Riposiziona",
  "flight.toast.cockpit": "Visuale dalla cabina",
  "flight.toast.exterior": "Visuale esterna",
  "flight.toast.turbo": "Turbo attivato",
  "flight.toast.slow": "Velocità ridotta",
  "flight.toast.cruise": "Velocità di crociera",
  "flight.toast.recovered": "Aereo riposizionato",
  "settings.title": "Impostazioni di volo",
  "settings.close": "Chiudi impostazioni",
  "settings.actions": "Azioni di volo",
  "settings.actionsHelp": "Metti in pausa oppure riposiziona l’aereo in sicurezza sopra il terreno.",
  "settings.controlsCamera": "Comandi e visuale",
  "settings.sensitivity": "Sensibilità dei comandi",
  "settings.sensitivityHelp": "Rapidità di risposta dell’aereo",
  "settings.gentle": "Bassa",
  "settings.quick": "Alta",
  "settings.fov": "Campo visivo",
  "settings.fovHelp": "Ampiezza della visuale di volo",
  "settings.narrow": "Stretto",
  "settings.wide": "Ampio",
  "settings.planePitch": "Beccheggio aeronautico",
  "settings.planePitchHelp": "Tira indietro per salire, spingi avanti per scendere",
  "status.label": "Stato",
  "status.idle": "Inattivo",
  "status.loading": "Caricamento",
  "status.ready": "Pronto",
  "status.running": "In volo",
  "status.paused": "In pausa",
  "status.error": "Errore"
}, Bt = {
  "language.label": "Idioma",
  "language.select": "Elegir idioma",
  "language.current": "Idioma: {language}. Elegir otro idioma",
  "flight.settings": "Ajustes",
  "flight.hideInterface": "Ocultar interfaz",
  "flight.showInterface": "Mostrar interfaz",
  "flight.controls": "Controles de vuelo",
  "flight.controlsAria": "Controles de vuelo y de la escena",
  "flight.speed": "Velocidad",
  "flight.speedAria": "Velocidad de vuelo",
  "flight.paused": "Vuelo en pausa",
  "flight.continue": "Reanudar el vuelo",
  "flight.turbo": "Turbo",
  "flight.cruise": "Crucero",
  "flight.slow": "Reducida",
  "flight.speedOptionAria": "Velocidad {mode}{selected}",
  "flight.speedSelectedSuffix": ", seleccionada",
  "flight.selectSpeed": "Seleccionar velocidad {mode}",
  "flight.turboSpeed": "Velocidad turbo",
  "flight.turboSpeedSelected": "Velocidad turbo, seleccionada",
  "flight.cruiseSpeed": "Velocidad de crucero",
  "flight.cruiseSpeedSelected": "Velocidad de crucero, seleccionada",
  "flight.slowSpeed": "Velocidad reducida",
  "flight.slowSpeedSelected": "Velocidad reducida, seleccionada",
  "flight.selectTurboSpeed": "Seleccionar velocidad turbo",
  "flight.selectCruiseSpeed": "Seleccionar velocidad de crucero",
  "flight.selectSlowSpeed": "Seleccionar velocidad reducida",
  "flight.cockpit": "Cabina",
  "flight.exterior": "Exterior",
  "flight.switchCockpit": "Cambiar a vista de cabina",
  "flight.switchExterior": "Cambiar a vista exterior",
  "flight.start": "Iniciar el vuelo",
  "flight.pause": "Pausa",
  "flight.recover": "Reposicionar",
  "flight.toast.cockpit": "Vista de cabina",
  "flight.toast.exterior": "Vista exterior",
  "flight.toast.turbo": "Turbo activado",
  "flight.toast.slow": "Velocidad reducida",
  "flight.toast.cruise": "Velocidad de crucero",
  "flight.toast.recovered": "Avión reposicionado",
  "settings.title": "Ajustes de vuelo",
  "settings.close": "Cerrar ajustes",
  "settings.actions": "Acciones de vuelo",
  "settings.actionsHelp": "Pausa el vuelo o reposiciona el avión de forma segura sobre el terreno.",
  "settings.controlsCamera": "Controles y cámara",
  "settings.sensitivity": "Sensibilidad de los controles",
  "settings.sensitivityHelp": "Rapidez de respuesta del avión",
  "settings.gentle": "Suave",
  "settings.quick": "Rápida",
  "settings.fov": "Campo de visión",
  "settings.fovHelp": "Amplitud de la cámara de vuelo",
  "settings.narrow": "Estrecho",
  "settings.wide": "Amplio",
  "settings.planePitch": "Cabeceo tipo avión",
  "settings.planePitchHelp": "Tira hacia atrás para subir, empuja hacia delante para bajar",
  "status.label": "Estado",
  "status.idle": "Inactivo",
  "status.loading": "Cargando",
  "status.ready": "Listo",
  "status.running": "En vuelo",
  "status.paused": "En pausa",
  "status.error": "Error"
}, ut = {
  en: gt,
  de: vt,
  fr: ct,
  it: lt,
  es: Bt
};
function qA(e) {
  if (!(e != null && e.trim())) return null;
  const A = e.trim().toLowerCase().split(/[-_]/, 1)[0];
  return Dt.find((P) => P === A) ?? null;
}
function ke(e) {
  const A = qA(e);
  if (!A || !(e != null && e.trim())) return null;
  try {
    return Intl.getCanonicalLocales(e.trim().replaceAll("_", "-"))[0] ?? A;
  } catch {
    return A;
  }
}
function Ct(e = "auto", A = {}) {
  if (e !== "auto") {
    const t = ke(e);
    if (t) return t;
  }
  const P = [
    A.documentLanguage,
    ...A.navigatorLanguages ?? [],
    A.navigatorLanguage,
    A.intlLocale
  ];
  for (const t of P) {
    const s = ke(t);
    if (s) return s;
  }
  return A.fallback ?? MP;
}
function dt(e = "auto", A = {}) {
  if (e !== "auto") {
    const t = qA(e);
    if (t) return t;
  }
  const P = [
    A.documentLanguage,
    ...A.navigatorLanguages ?? [],
    A.navigatorLanguage,
    A.intlLocale
  ];
  for (const t of P) {
    const s = qA(t);
    if (s) return s;
  }
  return A.fallback ?? MP;
}
function hP() {
  return typeof document > "u" ? null : document.documentElement.lang || null;
}
function mP() {
  return typeof navigator > "u" ? [] : navigator.languages;
}
function zP() {
  return typeof navigator > "u" ? null : navigator.language;
}
function EP() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return null;
  }
}
function Mt(e = {}) {
  const A = e.documentLanguage === void 0 ? hP() : e.documentLanguage, P = e.navigatorLanguages === void 0 ? mP() : e.navigatorLanguages ?? [], t = e.navigatorLanguage === void 0 ? zP() : e.navigatorLanguage, s = e.intlLocale === void 0 ? EP() : e.intlLocale;
  return dt(e.locale ?? "auto", {
    documentLanguage: A,
    navigatorLanguages: P,
    navigatorLanguage: t,
    intlLocale: s,
    fallback: e.fallback
  });
}
function ht(e = {}) {
  const A = e.documentLanguage === void 0 ? hP() : e.documentLanguage, P = e.navigatorLanguages === void 0 ? mP() : e.navigatorLanguages ?? [], t = e.navigatorLanguage === void 0 ? zP() : e.navigatorLanguage, s = e.intlLocale === void 0 ? EP() : e.intlLocale;
  return Ct(e.locale ?? "auto", {
    documentLanguage: A,
    navigatorLanguages: P,
    navigatorLanguage: t,
    intlLocale: s,
    fallback: e.fallback
  });
}
function iA(e, A, P = {}) {
  return Object.entries(P).reduce(
    (t, [s, i]) => t.replaceAll("{" + s + "}", String(i)),
    ut[e][A]
  );
}
const mt = {
  controlsAria: "flight.controlsAria",
  start: "flight.start",
  pause: "flight.pause",
  resume: "flight.continue",
  slow: "flight.slow",
  cruise: "flight.cruise",
  turbo: "flight.turbo",
  selectSpeed: "flight.selectSpeed",
  cockpit: "flight.cockpit",
  exterior: "flight.exterior",
  switchCockpit: "flight.switchCockpit",
  switchExterior: "flight.switchExterior",
  recover: "flight.recover",
  settings: "flight.settings",
  settingsTitle: "settings.title",
  status: "status.label",
  statusIdle: "status.idle",
  statusLoading: "status.loading",
  statusReady: "status.ready",
  statusRunning: "status.running",
  statusPaused: "status.paused",
  statusError: "status.error"
};
function ee(e, A, P = {}) {
  return iA(e, mt[A], P);
}
function Xi(e) {
  return (A, P = {}) => iA(e, A, P);
}
function Re(e, A) {
  return iA(e, {
    slow: "flight.slow",
    normal: "flight.cruise",
    turbo: "flight.turbo"
  }[A]);
}
function Wi(e, A, P) {
  return iA(e, {
    slow: ["flight.slowSpeed", "flight.slowSpeedSelected"],
    normal: ["flight.cruiseSpeed", "flight.cruiseSpeedSelected"],
    turbo: ["flight.turboSpeed", "flight.turboSpeedSelected"]
  }[A][P ? 1 : 0]);
}
function zt(e, A) {
  return iA(e, {
    slow: "flight.selectSlowSpeed",
    normal: "flight.selectCruiseSpeed",
    turbo: "flight.selectTurboSpeed"
  }[A]);
}
function Et(e, A) {
  return iA(e, A === "cockpit" ? "flight.cockpit" : "flight.exterior");
}
function jt(e, A) {
  return iA(
    e,
    A === "cockpit" ? "flight.switchCockpit" : "flight.switchExterior"
  );
}
const Pe = 2e5, It = 2.2, UA = (e, A, P, t) => A + (e - A) * Math.exp(-P * t);
function pt(e, A, P, t) {
  const s = v(P, 0, 0.1);
  if (s === 0) return { ...e, position: { ...e.position } };
  const i = v(A.pitch, -1, 1), r = v(A.bank, -1, 1), a = v(A.yaw, -1, 1), o = v(A.brake, 0, 1), n = !!A.turboBoost && o < 0.05, D = o < 0.05 ? v(A.accelerate, 0, 1) : 0, g = n ? t.turboMaximumSpeed : v(
    t.cruiseSpeed + D * t.boostSpeedDelta - o * t.brakeSpeedDelta,
    t.minimumSpeed,
    t.maximumSpeed
  ), u = o > 0.05 ? t.brakeDeceleration : e.speed > g ? t.brakeDeceleration * 0.6 : n ? t.turboAcceleration : t.boostAcceleration, l = UA(e.speed, g, o > 0.05 ? 8 : 4, s) - e.speed, C = v(
    e.speed + v(l, -u * s, u * s),
    t.minimumSpeed,
    t.turboMaximumSpeed
  ), d = i * t.maximumVerticalSpeed * (n ? t.turboVerticalSpeedScale : 1), M = Math.abs(i) < 0.01 ? 18 : i * e.verticalSpeed < 0 ? 22 : t.verticalResponse, c = UA(e.verticalSpeed, d, M, s), j = Math.min(
    Pe,
    e.position.z + c * s
  ), p = j >= Pe ? Math.min(0, c) : c, z = j >= Pe && i > 0 ? 0 : i * t.maximumPitchDeg, m = Math.abs(i) < 0.01 ? t.pitchLevelResponse : t.pitchResponse, I = e.pitch - z, q = (e.spacePitchRate ?? 0) + m * I, O = Math.exp(-m * s), T = z + (I + q * s) * O, Q = v(T, -t.maximumPitchDeg, t.maximumPitchDeg), b = Q === T ? ((e.spacePitchRate ?? 0) - m * q * s) * O : 0, G = v(
    r * t.bankTurnAssistDeg + a * t.yawRateDeg,
    -t.maximumTurnRateDeg,
    t.maximumTurnRateDeg
  ), y = e.spaceTurnRate ?? 0, f = G * y < 0 ? 4.8 : It, k = Math.abs(G) < 0.01 ? 0 : UA(y, G, f, s), R = Math.abs(G) < 0.01 ? 0 : G + (y - G) * (1 - Math.exp(-f * s)) / (f * s), L = AA(e.heading + R * s), F = (e.heading + R * s / 2) * S, Z = v(k / t.bankTurnAssistDeg, -1, 1) * t.maximumBankDeg;
  return {
    driftAngle: 0,
    cornerAssist: 0,
    position: {
      x: e.position.x + Math.sin(F) * C * s,
      y: e.position.y + Math.cos(F) * C * s,
      z: j
    },
    heading: L,
    speed: C,
    verticalSpeed: p,
    spaceTurnRate: k,
    pitch: Q,
    spacePitchRate: b,
    bank: UA(e.bank, Z, k === 0 ? t.bankLevelResponse : t.bankResponse, s),
    throttle: n ? 1 : v(0.52 + D * 0.48 - o * 0.34, 0.18, 1),
    launchBoost: n ? 2 : D
  };
}
function Qt(e) {
  if (!Object.hasOwn(tA, e.model)) throw new Error("Unknown flight.model.");
  const A = { ...tA[e.model].tuning, ...e.tuning };
  for (const [P, t] of Object.entries(A))
    if (!Object.hasOwn(tA.classic.tuning, P) || !Number.isFinite(t) || t < 0)
      throw new Error("flight.tuning." + P + " must be a finite non-negative number.");
  for (const P of ["fixedStepSeconds", "maxCatchUpSteps", "pitchLevelSettleSeconds", "minimumAglM", "maximumAglM"])
    if (A[P] !== tA[e.model].tuning[P]) throw new Error("flight.tuning." + P + " is not configurable.");
  if (!(A.minimumSpeed > 0 && A.minimumSpeed <= A.cruiseSpeed && A.cruiseSpeed <= A.maximumSpeed && A.maximumSpeed <= A.turboMaximumSpeed))
    throw new Error("Flight speeds must satisfy 0 < minimum <= cruise <= maximum <= turboMaximum.");
  if (!(A.maximumPitchDeg > 0 && A.maximumPitchDeg < 90 && A.maximumBankDeg > 0 && A.maximumBankDeg < 90 && A.bankTurnAssistDeg > 0))
    throw new Error("Flight attitude limits must be between 0 and 90 degrees, with positive bank turn assistance.");
  if (e.model === "paraglider" && e.tuning && Object.entries(e.tuning).some(([P, t]) => t !== tA.paraglider.tuning[P]))
    throw new Error("Paraglider uses its own fixed glide model; tuning overrides are not supported.");
  return { model: e.model, tuning: A };
}
function Tt(e, A, P, t) {
  const s = { ...P, brake: Math.max(P.brake, P.airbrake ? 1 : 0) };
  return e.model === "paraglider" ? $P(A, s, t) : e.model === "space-jet" ? pt(A, s, t, e.tuning) : (e.model === "super-jet" && s.brake > 0.05 && (s.accelerate = 0), KP(A, s, t, e.tuning.turboMaximumSpeed, e.tuning));
}
const jP = Object.freeze([
  "power",
  "pause",
  "camera",
  "recover"
]), Lt = Object.freeze([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "top-start",
  "top-end",
  "bottom-start",
  "bottom-end"
]), bt = Object.freeze({
  bodyUrl: new URL("data:model/gltf-binary;base64,Z2xURgIAAABMfQMAdCYAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6Iktocm9ub3MgZ2xURiBCbGVuZGVyIEkvTyB2NS4yLjM5IiwidmVyc2lvbiI6IjIuMCJ9LCJzY2VuZSI6MCwic2NlbmVzIjpbeyJuYW1lIjoiY2xhc3NpYyB3b3Jrc2hvcCIsIm5vZGVzIjpbMF19XSwibm9kZXMiOlt7Im1lc2giOjAsIm5hbWUiOiJjbGFzc2ljIn1dLCJtYXRlcmlhbHMiOlt7Im5hbWUiOiJNYXRlcmlhbF8wIiwicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC44MDY5NTIyMzgwODI4ODU3LDAuNzM3OTEwMzg5OTAwMjA3NSwwLjYwMzgyNzM1NzI5MjE3NTMsMV0sIm1ldGFsbGljRmFjdG9yIjowLjI1LCJyb3VnaG5lc3NGYWN0b3IiOjAuMzEwMDAwMDAyMzg0MTg1OH19LHsiZG91YmxlU2lkZWQiOnRydWUsIm5hbWUiOiJDb2NrcGl0IGxlYXRoZXIiLCJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjAzMjk5OTk5OTgyMTE4NjA2NiwwLjA0NTAwMDAwMTc4ODEzOTM0LDAuMDUwMDAwMDAwNzQ1MDU4MDYsMV0sIm1ldGFsbGljRmFjdG9yIjowLCJyb3VnaG5lc3NGYWN0b3IiOjAuNjgwMDAwMDA3MTUyNTU3NH19LHsibmFtZSI6Ik1hdGVyaWFsXzEiLCJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjAxNTIwODUxNDQwNzI3NzEwNywwLjA3NDIxMzU3MTg0NjQ4NTE0LDAuMTA0NjE2NDg1NTM2MDk4NDgsMV0sIm1ldGFsbGljRmFjdG9yIjowLjI1LCJyb3VnaG5lc3NGYWN0b3IiOjAuMzEwMDAwMDAyMzg0MTg1OH19LHsibmFtZSI6Ik1hdGVyaWFsXzIiLCJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjU3MTEyNDg1MTcwMzY0MzgsMC4xMzI4NjgzMTk3NDk4MzIxNSwwLjA1OTUxMTIzNjg0NjQ0Njk5LDFdLCJtZXRhbGxpY0ZhY3RvciI6MC4yNSwicm91Z2huZXNzRmFjdG9yIjowLjMxMDAwMDAwMjM4NDE4NTh9fSx7Im5hbWUiOiJNYXRlcmlhbF81IiwicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC40MjMyNjc2NjI1MjUxNzcsMC40ODUxNDk5NDk3ODkwNDcyNCwwLjQ2Nzc4MzgwODcwODE5MDksMV0sIm1ldGFsbGljRmFjdG9yIjowLjgxOTk5OTk5Mjg0NzQ0MjYsInJvdWdobmVzc0ZhY3RvciI6MC4yMzk5OTk5OTQ2MzU1ODE5N319LHsibmFtZSI6Ik1hdGVyaWFsXzYiLCJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjAwNTYwNTM5MTY5MjM3MDE3NiwwLjAwOTcyMTIxNzY3Njk5NzE4NSwwLjAxMjI4NjQ4Nzk2Njc3NTg5NCwxXSwibWV0YWxsaWNGYWN0b3IiOjAsInJvdWdobmVzc0ZhY3RvciI6MC44OTk5OTk5NzYxNTgxNDIxfX0seyJhbHBoYU1vZGUiOiJCTEVORCIsIm5hbWUiOiJCbHVlIGNvY2twaXQgZ2xhc3MiLCJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjA0NTAwMDAwMTc4ODEzOTM0LDAuMTg5OTk5OTk3NjE1ODE0MiwwLjM0MDAwMDAwMzU3NjI3ODcsMC40NjAwMDAwMDgzNDQ2NTAyN10sIm1ldGFsbGljRmFjdG9yIjowLCJyb3VnaG5lc3NGYWN0b3IiOjAuNTUwMDAwMDExOTIwOTI5fX0seyJkb3VibGVTaWRlZCI6dHJ1ZSwibmFtZSI6IlBvbGlzaGVkIGFsdW1pbml1bSIsInBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuNTc5OTk5OTgzMzEwNjk5NSwwLjY3MDAwMDAxNjY4OTMwMDUsMC43MDk5OTk5Nzg1NDIzMjc5LDFdLCJtZXRhbGxpY0ZhY3RvciI6MC44NTAwMDAwMjM4NDE4NTc5LCJyb3VnaG5lc3NGYWN0b3IiOjAuMTgwMDAwMDA3MTUyNTU3Mzd9fSx7ImRvdWJsZVNpZGVkIjp0cnVlLCJlbWlzc2l2ZUZhY3RvciI6WzAuMDE3NDk5OTk5OTYyNzQ3MDkzLDAuMTUzOTk5OTk2NTQyOTMwNjIsMC4xMzI5OTk5OTYwNjYwOTM0N10sIm5hbWUiOiJDb2NrcGl0IGRpc3BsYXlzIiwicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC4wMjUwMDAwMDAzNzI1MjkwMywwLjIxOTk5OTk5ODgwNzkwNzEsMC4xODk5OTk5OTc2MTU4MTQyLDFdLCJtZXRhbGxpY0ZhY3RvciI6MC4xMDAwMDAwMDE0OTAxMTYxMiwicm91Z2huZXNzRmFjdG9yIjowLjI1OTk5OTk5MDQ2MzI1Njg0fX0seyJkb3VibGVTaWRlZCI6dHJ1ZSwibmFtZSI6IlRpbnkgZnV0dXJlIGluc2NyaXB0aW9uIHBhaW50IiwicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC44Mjk5OTk5ODMzMTA2OTk1LDAuNzc5OTk5OTcxMzg5NzcwNSwwLjYzOTk5OTk4NTY5NDg4NTMsMV0sIm1ldGFsbGljRmFjdG9yIjowLjI1LCJyb3VnaG5lc3NGYWN0b3IiOjAuMjg5OTk5OTkxNjU1MzQ5NzN9fV0sIm1lc2hlcyI6W3sibmFtZSI6Ik1lc2hfMCIsInByaW1pdGl2ZXMiOlt7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjAsIk5PUk1BTCI6MSwiVEVYQ09PUkRfMCI6Mn0sImluZGljZXMiOjMsIm1hdGVyaWFsIjowfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjQsIk5PUk1BTCI6NSwiVEVYQ09PUkRfMCI6Nn0sImluZGljZXMiOjcsIm1hdGVyaWFsIjoxfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjgsIk5PUk1BTCI6OSwiVEVYQ09PUkRfMCI6MTB9LCJpbmRpY2VzIjoxMSwibWF0ZXJpYWwiOjJ9LHsiYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MTIsIk5PUk1BTCI6MTMsIlRFWENPT1JEXzAiOjE0fSwiaW5kaWNlcyI6MTUsIm1hdGVyaWFsIjozfSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjE2LCJOT1JNQUwiOjE3LCJURVhDT09SRF8wIjoxOH0sImluZGljZXMiOjE5LCJtYXRlcmlhbCI6NH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoyMCwiTk9STUFMIjoyMSwiVEVYQ09PUkRfMCI6MjJ9LCJpbmRpY2VzIjoyMywibWF0ZXJpYWwiOjV9LHsiYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MjQsIk5PUk1BTCI6MjUsIlRFWENPT1JEXzAiOjI2fSwiaW5kaWNlcyI6MjcsIm1hdGVyaWFsIjo2fSx7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjI4LCJOT1JNQUwiOjI5LCJURVhDT09SRF8wIjozMH0sImluZGljZXMiOjMxLCJtYXRlcmlhbCI6N30seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjozMiwiTk9STUFMIjozMywiVEVYQ09PUkRfMCI6MzR9LCJpbmRpY2VzIjozNSwibWF0ZXJpYWwiOjh9LHsiYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MzYsIk5PUk1BTCI6MzcsIlRFWENPT1JEXzAiOjM4fSwiaW5kaWNlcyI6MzksIm1hdGVyaWFsIjo5fV19XSwiYWNjZXNzb3JzIjpbeyJidWZmZXJWaWV3IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MjY2LCJtYXgiOlswLjQ4OTYwMDAzMjU2Nzk3NzksMC40MzIwMDAwNDEwMDc5OTU2LDIuNDYyNDAwMTk3OTgyNzg4XSwibWluIjpbLTAuNDg5NjAwMDMyNTY3OTc3OSwtMC4zNDU2MDAwMDg5NjQ1Mzg2LC0yLjY3ODQwMDAzOTY3Mjg1MTZdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MSwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI2NiwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNjYsInR5cGUiOiJWRUMyIn0seyJidWZmZXJWaWV3IjozLCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6NjU0LCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3Ijo0LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MTM4MCwibWF4IjpbMi4zNjAyNzI2NDU5NTAzMTc0LDAuNTM3OTk5OTg3NjAyMjMzOSwwLjQ0Njk5OTk2NzA5ODIzNjFdLCJtaW4iOlstMi4zNjAyNzI2NDU5NTAzMTc0LDAuMTA1MDE5MzUzMzMwMTM1MzUsLTAuNzMwMDAwMDE5MDczNDg2M10sInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo1LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MTM4MCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjYsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoxMzgwLCJ0eXBlIjoiVkVDMiJ9LHsiYnVmZmVyVmlldyI6NywiY29tcG9uZW50VHlwZSI6NTEyMywiY291bnQiOjIxNjAsInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjgsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50Ijo1NTIsIm1heCI6WzIuNzM1NDk3NzEzMDg4OTg5MywxLjE4ODAwMDA4Mjk2OTY2NTUsMi4zNzYwMDAxNjU5MzkzMzFdLCJtaW4iOlstMi43MzU0OTc3MTMwODg5ODkzLC0wLjM4ODc5OTkzNTU3OTI5OTksLTIuNjIwODAwMjU2NzI5MTI2XSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjksImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50Ijo1NTIsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxMCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjU1MiwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjExLCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6NzU2LCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3IjoxMiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI3MiwibWF4IjpbMi4zNzk4MDQzNzI3ODc0NzU2LDAuOTM1OTk5OTg5NTA5NTgyNSwyLjMzMjgwMDE0OTkxNzYwMjVdLCJtaW4iOlstMi4zNzk4MDQzNzI3ODc0NzU2LC0wLjc0NTE5OTk3ODM1MTU5MywtMC40MTQwMDAwMDQ1Mjk5NTNdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTMsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNzIsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoxNCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI3MiwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjE1LCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6NDU2LCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3IjoxNiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjM0NSwibWF4IjpbMC40NjMzMzAyOTg2NjIxODU2NywwLjM4NTIwMDAyMzY1MTEyMzA1LDEuOTE4Nzk5OTk2Mzc2MDM3Nl0sIm1pbiI6Wy0wLjQ2MzMzMDI5ODY2MjE4NTY3LC0wLjY5MzE2MTkwNDgxMTg1OTEsLTIuNjUzMjAwMTQ5NTM2MTMzXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE3LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MzQ1LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTgsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjozNDUsInR5cGUiOiJWRUMyIn0seyJidWZmZXJWaWV3IjoxOSwiY29tcG9uZW50VHlwZSI6NTEyMywiY291bnQiOjEyNDgsInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjIwLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6Mjc2LCJtYXgiOlswLjUxODQwMDAxMzQ0NjgwNzksLTAuMzM4NDAwMDM2MDk2NTcyOSwyLjA1MjAwMDA0NTc3NjM2N10sIm1pbiI6Wy0wLjUxODQwMDAxMzQ0NjgwNzksLTAuODQ5NjAwMDc2Njc1NDE1LC0wLjUxODQwMDAxMzQ0NjgwNzldLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MjEsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNzYsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyMiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI3NiwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjIzLCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6NTI4LCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3IjoyNCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjMyMywibWF4IjpbMC4zODg5OTk5Mzg5NjQ4NDM3NSwwLjgwMDAwMDAxMTkyMDkyOSwwLjIyNjk5OTg2Mzk4MjIwMDYyXSwibWluIjpbLTAuMzg4OTk5Nzg5OTUzMjMxOCwwLjIwMDAwMDAwMjk4MDIzMjI0LC0xLjAxOTAwMDA1MzQwNTc2MTddLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MjUsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjozMjMsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyNiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjMyMywidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjI3LCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6MTU4NCwidHlwZSI6IlNDQUxBUiJ9LHsiYnVmZmVyVmlldyI6MjgsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyMDQ3LCJtYXgiOlswLjU2OTk5OTk5Mjg0NzQ0MjYsMC43ODcwNzg5MTcwMjY1MTk4LDIuMzAyNzcyNzYwMzkxMjM1NF0sIm1pbiI6Wy0wLjU2OTk5OTk5Mjg0NzQ0MjYsLTAuNzIzOTk5OTc3MTExODE2NCwtMi4wNTc5OTk4NDkzMTk0NThdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MjksImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyMDQ3LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MzAsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyMDQ3LCJ0eXBlIjoiVkVDMiJ9LHsiYnVmZmVyVmlldyI6MzEsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50Ijo2NDY4LCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3IjozMiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjE1MCwibWF4IjpbMC4yMTAwNjAwMDA0MTk2MTY3LDAuNDk2OTAwMDIyMDI5ODc2NywtMC43MDEyNjk5ODQyNDUzMDAzXSwibWluIjpbLTAuMjEwMDYwMDAwNDE5NjE2NywwLjQxOTA5OTk4NjU1MzE5MjE0LC0wLjcwNzQ5OTk4MDkyNjUxMzddLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MzMsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoxNTAsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjozNCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjE1MCwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjM1LCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6Mzk2LCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3IjozNiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI4OSwibWF4IjpbMS42NTAzNjY0MjU1MTQyMjEyLDAuMTUwMzY3NzM2ODE2NDA2MjUsMC4xMjA0NzEwNjc3MjY2MTIwOV0sIm1pbiI6WzEuMjkwMzY2NDExMjA5MTA2NCwwLjEzNDE1Njc5MzM1NTk0MTc3LDAuMDgzODMyNTAyMzY1MTEyM10sInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjozNywiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI4OSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjM4LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6Mjg5LCJ0eXBlIjoiVkVDMiJ9LHsiYnVmZmVyVmlldyI6MzksImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50Ijo3NTYsInR5cGUiOiJTQ0FMQVIifV0sImJ1ZmZlclZpZXdzIjpbeyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjMxOTIsImJ5dGVPZmZzZXQiOjAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozMTkyLCJieXRlT2Zmc2V0IjozMTkyLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MjEyOCwiYnl0ZU9mZnNldCI6NjM4NCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjEzMDgsImJ5dGVPZmZzZXQiOjg1MTIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoxNjU2MCwiYnl0ZU9mZnNldCI6OTgyMCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjE2NTYwLCJieXRlT2Zmc2V0IjoyNjM4MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjExMDQwLCJieXRlT2Zmc2V0Ijo0Mjk0MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjQzMjAsImJ5dGVPZmZzZXQiOjUzOTgwLCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6NjYyNCwiYnl0ZU9mZnNldCI6NTgzMDAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo2NjI0LCJieXRlT2Zmc2V0Ijo2NDkyNCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjQ0MTYsImJ5dGVPZmZzZXQiOjcxNTQ4LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MTUxMiwiYnl0ZU9mZnNldCI6NzU5NjQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozMjY0LCJieXRlT2Zmc2V0Ijo3NzQ3NiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjMyNjQsImJ5dGVPZmZzZXQiOjgwNzQwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MjE3NiwiYnl0ZU9mZnNldCI6ODQwMDQsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo5MTIsImJ5dGVPZmZzZXQiOjg2MTgwLCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6NDE0MCwiYnl0ZU9mZnNldCI6ODcwOTIsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo0MTQwLCJieXRlT2Zmc2V0Ijo5MTIzMiwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjI3NjAsImJ5dGVPZmZzZXQiOjk1MzcyLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MjQ5NiwiYnl0ZU9mZnNldCI6OTgxMzIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozMzEyLCJieXRlT2Zmc2V0IjoxMDA2MjgsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozMzEyLCJieXRlT2Zmc2V0IjoxMDM5NDAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyMjA4LCJieXRlT2Zmc2V0IjoxMDcyNTIsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoxMDU2LCJieXRlT2Zmc2V0IjoxMDk0NjAsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozODc2LCJieXRlT2Zmc2V0IjoxMTA1MTYsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozODc2LCJieXRlT2Zmc2V0IjoxMTQzOTIsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyNTg0LCJieXRlT2Zmc2V0IjoxMTgyNjgsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozMTY4LCJieXRlT2Zmc2V0IjoxMjA4NTIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyNDU2NCwiYnl0ZU9mZnNldCI6MTI0MDIwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MjQ1NjQsImJ5dGVPZmZzZXQiOjE0ODU4NCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjE2Mzc2LCJieXRlT2Zmc2V0IjoxNzMxNDgsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoxMjkzNiwiYnl0ZU9mZnNldCI6MTg5NTI0LCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MTgwMCwiYnl0ZU9mZnNldCI6MjAyNDYwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MTgwMCwiYnl0ZU9mZnNldCI6MjA0MjYwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MTIwMCwiYnl0ZU9mZnNldCI6MjA2MDYwLCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6NzkyLCJieXRlT2Zmc2V0IjoyMDcyNjAsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozNDY4LCJieXRlT2Zmc2V0IjoyMDgwNTIsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjozNDY4LCJieXRlT2Zmc2V0IjoyMTE1MjAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyMzEyLCJieXRlT2Zmc2V0IjoyMTQ5ODgsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoxNTEyLCJieXRlT2Zmc2V0IjoyMTczMDAsInRhcmdldCI6MzQ5NjN9XSwiYnVmZmVycyI6W3siYnl0ZUxlbmd0aCI6MjE4ODEyfV19vFYDAEJJTgD77eu9++3rvehqK8D77eu9++3rvehqK8D77eu9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AABAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA///+fPv//Xz8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAP/7/fz4AACA//v9/PgAAQD/+/38+//9fPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA//v8/PgAAID8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAP/7/Pz4AAEA//v8/Pv//Xz8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA//P//PQAAID/4//89AABAP/j//z3//18/8P9/PQAAID/w/389AABAP/D/fz3//18/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAAAgPwAAgD8AACA/AAAAAAEAQD8AAIA/AQBAPwAAAAD//18/AACAP///Xz///28/AAAgP/7/bz8BAEA//v9vP///Xz8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD/+/18/AAAgPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA//v9fPwEAQD/+/18///9fP/7/Tz8AACA//v9PPwEAQD/+/08///9fP/7/Pz8BAEA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAAAAAAIA/6HJ0P9NfGT8AAAAAAACAPwAAcD/W0xk/AAAAAAAAgD/+/08/uxscPwAAAAAAAIA///9fP6oyGz8AAAAAAACAPwAAAAAAAIA/Go0LP9RfGT8AAAAAAACAPwAAED/U0xk/AAAAAAAAgD+F9x8/7DEbPwAAAAAAAIA/tzY6P8RPHD8AAEA/U20cPwAAAAAAAIA/AAAAAAAAgD8AADA/vBscPwAAAAAAAIA/AAAgP6wyGz8AAAAAAACAP/v//z2uDBw/AAAAAAAAgD/w/389sCsbPwAAAAAAAIA/jeSdO9I1Gj8AAAAAAACAP/7/Pz51ohw/AAAAAAAAgD8AAKA+dKIcPwAAAAAAAIA//8CzPghGHD/9/38+8tYcPwAAAAAAAIA/AAAAAAAAgD8AAAAA/iAaPwAAgD/+IBo/AAAAAAAAgD////8+/iAaPwAAAAAAAIA///+/Pq4MHD8AAAAAAACAP///3z6xKxs/AQAEAAYAAQAGAAoAEAATACcAEAAnACwAAgAMABUAAgAVABEABQAtACkABQApAAgACwAHADIACwAyADcAFAA8AEAAFABAACgADQA5AD4ADQA+ABYACQAqAEIACQBCADQAOAAzAEoAOABKAE4APQBSAFcAPQBXAEEAOgBQAFQAOgBUAD8ANQBDAFkANQBZAEwATwBLAGEATwBhAGUA5ABvAOcAbwDpAOcA7gDrAFMAUwBqANsAUwDbAN4A4ADuAFMAUwDeAOIAUwDiAOAA8QDpAG8AWABTAOsA7wDxAG8AWADrAO8AbwBYAO8AUQBmAGwAUQBsAFUATQBaAHEATQBxAGIAZABgAHcAZAB3AHwA9QD3AGsAhgD9APsAhgD7AAAB9QBrAIIA8wD1AIIAggCGAAAB+QDzAIIAggAAAfkA3ABrAAEBawD3AAEBBgH9AIYAhgBwAOUAhgDlAAQBCAEGAYYAhgAEAQgBZwB+AIQAZwCEAG0AYwByAIgAYwCIAHkAewB2AJAAewCQAJQAgQCYAJwAgQCcAIUAfQCWAJoAfQCaAIMAeACHAJ4AeACeAJIAkwCPAKkAkwCpAK0AlwCxALYAlwC2AJsAlQCvALMAlQCzAJkAkQCdALgAkQC4AKsArACoAMAArADAAMQAsADIAMwAsADMALUArgDGAMoArgDKALIAqgC3AM4AqgDOAMIAwwC/ANAAwwDQANMAxwDWANkAxwDZAMsAxQDUANcAxQDXAMkAwQDNANoAwQDaANEAAAAPACsAAAArAAMA0gDPANgA0gDYANUAIgAwABIAvgAvAC4AvgAuAA4AEgAwAC8AEgAvAL4A7ADtAA4ADgAuAPAADgDwAOwAMAA7ADYAMAA2AC8ALgAxAPIALgDyAPAAIQA7ADAALwA2ADEALwAxAC4AOwBGAEUAOwBFADYA6gDyADEAMQBEAOgAMQDoAOoAIABGADsANgBFAEQANgBEADEAHwBJAEYARQBIAEcARQBHAEQARgBJAEgARgBIAEUA6ABEAEcARwAFAeYARwDmAOgASABbAFYASABWAEcASQBcAFsASQBbAEgARwBWAAkBRwAJAQUBHgBcAEkAXABfAF4AXABeAFsAVgBdAAcBVgAHAQkBHQBfAFwAWwBeAF0AWwBdAFYA/gAHAV0AXQBoAPwAXQD8AP4AHABuAF8AXgBpAGgAXgBoAF0AXwBuAGkAXwBpAF4AGwB1AG4AaQB0AHMAaQBzAGgAbgB1AHQAbgB0AGkAaABzAP8AaAD/APwAdQCAAH8AdQB/AHQAcwB6APoAcwD6AP8AGgCAAHUAdAB/AHoAdAB6AHMAgACLAIoAgACKAH8AegCJAPQAegD0APoAGQCLAIAAfwCKAIkAfwCJAHoAGACOAIsAigCNAIwAigCMAIkAiwCOAI0AiwCNAIoAiQCMAPYAiQD2APQAFwCjAI4AjQChAJ8AjQCfAIwAjgCjAKEAjgChAI0A9gCMAJ8AnwACAfgAnwD4APYApACnAKYApACmAKIA3QADAaAAoAClAN8AoADfAN0AJgCnAKQAogCmAKUAogClAKAApwC6ALkApwC5AKYA3wClALQA3wC0AOMAJQC6AKcApgC5ALQApgC0AKUAJAC9ALoAuQC8ALsAuQC7ALQAugC9ALwAugC8ALkA4wC0ALsA4wC7AOEAvAC+AA4AvAAOALsAvQASAL4AvQC+ALwAuwAOAO0AuwDtAOEAIwASAL0AZmZmvnsUjj7mUTi9ZmZmvnsUjj7mUTi9ZmZmvnsUjj7mUTi9ZmZmvnsUjj7mUTi9ZmZmvpDClT6MwvW8ZmZmvpDClT6MwvW8ZmZmvpDClT6MwvW8ZmZmvpDClT6MwvW8j8J1vpDClT7mUTi9j8J1vpDClT7mUTi9j8J1vpDClT7mUTi9j8J1vpDClT7mUTi9ZmZmvlVUkD4b4Ay9ZmZmvlVUkD4b4Ay9ZmZmvlVUkD4b4Ay9ZmZmvlVUkD4b4Ay9o0RvvnJTkT792BS9o0RvvnJTkT792BS9o0RvvnJTkT792BS920JxvpDClT4b4Ay920JxvpDClT4b4Ay920JxvpDClT4b4Ay920JxvpDClT4b4Ay920JxvlVUkD7sUTi920JxvlVUkD7sUTi920JxvlVUkD7sUTi920JxvlVUkD7sUTi9ZmZmvqRwnT6MwvW8ZmZmvqRwnT6MwvW8ZmZmvqRwnT6MwvW8ZmZmvqRwnT6MwvW8ZmZmvrkepT7mUTi9ZmZmvrkepT7mUTi9ZmZmvrkepT7mUTi9ZmZmvrkepT7mUTi9j8J1vqRwnT7mUTi9j8J1vqRwnT7mUTi9j8J1vqRwnT7mUTi9j8J1vqRwnT7mUTi9ZmZmvt/eoj4b4Ay9ZmZmvt/eoj4b4Ay9ZmZmvt/eoj4b4Ay9ZmZmvt/eoj4b4Ay9o0RvvsLfoT792BS9o0RvvsLfoT792BS9o0RvvsLfoT792BS920Jxvt/eoj7sUTi920Jxvt/eoj7sUTi920Jxvt/eoj7sUTi920Jxvt/eoj7sUTi920JxvqRwnT4b4Ay920JxvqRwnT4b4Ay920JxvqRwnT4b4Ay920JxvqRwnT4b4Ay9ZmZmvnsUjj49Cje/ZmZmvnsUjj49Cje/ZmZmvnsUjj49Cje/ZmZmvnsUjj49Cje/j8J1vpDClT49Cje/j8J1vpDClT49Cje/j8J1vpDClT49Cje/j8J1vpDClT49Cje/ZmZmvpDClT5I4Tq/ZmZmvpDClT5I4Tq/ZmZmvpDClT5I4Tq/ZmZmvpDClT5I4Tq/2EJxvlVUkD49Cje/2EJxvlVUkD49Cje/2EJxvlVUkD49Cje/2EJxvlVUkD49Cje/oERvvnJTkT7LQTm/oERvvnJTkT7LQTm/oERvvnJTkT7LQTm/2EJxvpDClT5awTm/2EJxvpDClT5awTm/2EJxvpDClT5awTm/2EJxvpDClT5awTm/ZGZmvlVUkD5awTm/ZGZmvlVUkD5awTm/ZGZmvlVUkD5awTm/ZGZmvlVUkD5awTm/ZmZmvrkepT49Cje/ZmZmvrkepT49Cje/ZmZmvrkepT49Cje/ZmZmvrkepT49Cje/ZmZmvqRwnT5I4Tq/ZmZmvqRwnT5I4Tq/ZmZmvqRwnT5I4Tq/ZmZmvqRwnT5I4Tq/j8J1vqRwnT49Cje/j8J1vqRwnT49Cje/j8J1vqRwnT49Cje/j8J1vqRwnT49Cje/ZmZmvt/eoj5awTm/ZmZmvt/eoj5awTm/ZmZmvt/eoj5awTm/ZmZmvt/eoj5awTm/o0RvvsLfoT7LQTm/o0RvvsLfoT7LQTm/o0RvvsLfoT7LQTm/20JxvqRwnT5awTm/20JxvqRwnT5awTm/20JxvqRwnT5awTm/20JxvqRwnT5awTm/20Jxvt/eoj49Cje/20Jxvt/eoj49Cje/20Jxvt/eoj49Cje/20Jxvt/eoj49Cje/ZmZmPnsUjj7mUTi9ZmZmPnsUjj7mUTi9ZmZmPnsUjj7mUTi9ZmZmPnsUjj7mUTi9j8J1PpDClT7mUTi9j8J1PpDClT7mUTi9j8J1PpDClT7mUTi9j8J1PpDClT7mUTi9ZmZmPpDClT6MwvW8ZmZmPpDClT6MwvW8ZmZmPpDClT6MwvW8ZmZmPpDClT6MwvW82EJxPlVUkD7sUTi92EJxPlVUkD7sUTi92EJxPlVUkD7sUTi92EJxPlVUkD7sUTi9oERvPnJTkT792BS9oERvPnJTkT792BS9oERvPnJTkT792BS92EJxPpDClT4b4Ay92EJxPpDClT4b4Ay92EJxPpDClT4b4Ay92EJxPpDClT4b4Ay9ZGZmPlVUkD4b4Ay9ZGZmPlVUkD4b4Ay9ZGZmPlVUkD4b4Ay9ZGZmPlVUkD4b4Ay9ZmZmPrkepT7mUTi9ZmZmPrkepT7mUTi9ZmZmPrkepT7mUTi9ZmZmPrkepT7mUTi9ZmZmPqRwnT6MwvW8ZmZmPqRwnT6MwvW8ZmZmPqRwnT6MwvW8ZmZmPqRwnT6MwvW8j8J1PqRwnT7mUTi9j8J1PqRwnT7mUTi9j8J1PqRwnT7mUTi9j8J1PqRwnT7mUTi9ZmZmPt/eoj4b4Ay9ZmZmPt/eoj4b4Ay9ZmZmPt/eoj4b4Ay9ZmZmPt/eoj4b4Ay9o0RvPsLfoT792BS9o0RvPsLfoT792BS9o0RvPsLfoT792BS920JxPqRwnT4b4Ay920JxPqRwnT4b4Ay920JxPqRwnT4b4Ay920JxPqRwnT4b4Ay920JxPt/eoj7sUTi920JxPt/eoj7sUTi920JxPt/eoj7sUTi920JxPt/eoj7sUTi9ZmZmPnsUjj49Cje/ZmZmPnsUjj49Cje/ZmZmPnsUjj49Cje/ZmZmPnsUjj49Cje/ZmZmPpDClT5I4Tq/ZmZmPpDClT5I4Tq/ZmZmPpDClT5I4Tq/ZmZmPpDClT5I4Tq/j8J1PpDClT49Cje/j8J1PpDClT49Cje/j8J1PpDClT49Cje/j8J1PpDClT49Cje/ZmZmPlVUkD5awTm/ZmZmPlVUkD5awTm/ZmZmPlVUkD5awTm/ZmZmPlVUkD5awTm/o0RvPnJTkT7LQTm/o0RvPnJTkT7LQTm/o0RvPnJTkT7LQTm/20JxPpDClT5awTm/20JxPpDClT5awTm/20JxPpDClT5awTm/20JxPpDClT5awTm/20JxPlVUkD49Cje/20JxPlVUkD49Cje/20JxPlVUkD49Cje/20JxPlVUkD49Cje/ZmZmPrkepT49Cje/ZmZmPrkepT49Cje/ZmZmPrkepT49Cje/ZmZmPrkepT49Cje/j8J1PqRwnT49Cje/j8J1PqRwnT49Cje/j8J1PqRwnT49Cje/j8J1PqRwnT49Cje/ZmZmPqRwnT5I4Tq/ZmZmPqRwnT5I4Tq/ZmZmPqRwnT5I4Tq/ZmZmPqRwnT5I4Tq/2EJxPt/eoj49Cje/2EJxPt/eoj49Cje/2EJxPt/eoj49Cje/2EJxPt/eoj49Cje/oERvPsLfoT7LQTm/oERvPsLfoT7LQTm/oERvPsLfoT7LQTm/2EJxPqRwnT5awTm/2EJxPqRwnT5awTm/2EJxPqRwnT5awTm/2EJxPqRwnT5awTm/ZGZmPt/eoj5awTm/ZGZmPt/eoj5awTm/ZGZmPt/eoj5awTm/ZGZmPt/eoj5awTm/woY3vjDdpD4XK+q9woY3vjDdpD4XK+q9woY3vjDdpD4XK+q9woY3vjDdpD4XK+q9woY3vvypsT7k97a9woY3vvypsT7k97a9woY3vvypsT7k97a9woY3vvypsT7k97a9XSBRvvypsT4XK+q9XSBRvvypsT4XK+q9XSBRvvypsT4XK+q9XSBRvvypsT4XK+q9woY3vu+cqD7n9sW9woY3vu+cqD7n9sW9woY3vu+cqD7n9sW9woY3vu+cqD7n9sW9e05GviBGqj6km8y9e05GviBGqj6km8y9e05GviBGqj6km8y93KBJvvypsT7n9sW93KBJvvypsT7n9sW93KBJvvypsT7n9sW93KBJvvypsT7n9sW93KBJvu+cqD4XK+q93KBJvu+cqD4XK+q93KBJvu+cqD4XK+q93KBJvu+cqD4XK+q9woY3vvhTAz/k97a9woY3vvhTAz/k97a9woY3vvhTAz/k97a9woY3vvhTAz/k97a9woY3vl66CT8XK+q9woY3vl66CT8XK+q9woY3vl66CT8XK+q9woY3vl66CT8XK+q9XSBRvvhTAz8XK+q9XSBRvvhTAz8XK+q9XSBRvvhTAz8XK+q9XSBRvvhTAz8XK+q9woY3vn7aBz/l9sW9woY3vn7aBz/l9sW9woY3vn7aBz/l9sW9woY3vn7aBz/l9sW9e05GvuYFBz+km8y9e05GvuYFBz+km8y9e05GvuYFBz+km8y93KBJvn7aBz8XK+q93KBJvn7aBz8XK+q93KBJvn7aBz8XK+q93KBJvn7aBz8XK+q93KBJvvhTAz/l9sW93KBJvvhTAz/l9sW93KBJvvhTAz/l9sW93KBJvvhTAz/l9sW9woY3vjDdpD5OCx6+woY3vjDdpD5OCx6+woY3vjDdpD5OCx6+woY3vjDdpD5OCx6+XSBRvvypsT5OCx6+XSBRvvypsT5OCx6+XSBRvvypsT5OCx6+XSBRvvypsT5OCx6+woY3vvypsT7opDe+woY3vvypsT7opDe+woY3vvypsT7opDe+woY3vvypsT7opDe+3KBJvu+cqD5OCx6+3KBJvu+cqD5OCx6+3KBJvu+cqD5OCx6+3KBJvu+cqD5OCx6+e05GviBGqj4H0yy+e05GviBGqj4H0yy+e05GviBGqj4H0yy+3KBJvvypsT5nJTC+3KBJvvypsT5nJTC+3KBJvvypsT5nJTC+3KBJvvypsT5nJTC+woY3vu+cqD5nJTC+woY3vu+cqD5nJTC+woY3vu+cqD5nJTC+woY3vu+cqD5nJTC+woY3vl66CT9OCx6+woY3vl66CT9OCx6+woY3vl66CT9OCx6+woY3vl66CT9OCx6+woY3vvhTAz/opDe+woY3vvhTAz/opDe+woY3vvhTAz/opDe+woY3vvhTAz/opDe+XSBRvvhTAz9OCx6+XSBRvvhTAz9OCx6+XSBRvvhTAz9OCx6+XSBRvvhTAz9OCx6+woY3vn7aBz9mJTC+woY3vn7aBz9mJTC+woY3vn7aBz9mJTC+woY3vn7aBz9mJTC+e05GvuYFBz8H0yy+e05GvuYFBz8H0yy+e05GvuYFBz8H0yy+3KBJvvhTAz9mJTC+3KBJvvhTAz9mJTC+3KBJvvhTAz9mJTC+3KBJvvhTAz9mJTC+3KBJvn7aBz9OCx6+3KBJvn7aBz9OCx6+3KBJvn7aBz9OCx6+3KBJvn7aBz9OCx6+woY3PjDdpD4XK+q9woY3PjDdpD4XK+q9woY3PjDdpD4XK+q9woY3PjDdpD4XK+q9XSBRPvypsT4XK+q9XSBRPvypsT4XK+q9XSBRPvypsT4XK+q9XSBRPvypsT4XK+q9woY3PvypsT7k97a9woY3PvypsT7k97a9woY3PvypsT7k97a9woY3PvypsT7k97a93KBJPu+cqD4XK+q93KBJPu+cqD4XK+q93KBJPu+cqD4XK+q93KBJPu+cqD4XK+q9e05GPiBGqj6km8y9e05GPiBGqj6km8y9e05GPiBGqj6km8y93KBJPvypsT7l9sW93KBJPvypsT7l9sW93KBJPvypsT7l9sW93KBJPvypsT7l9sW9woY3Pu+cqD7l9sW9woY3Pu+cqD7l9sW9woY3Pu+cqD7l9sW9woY3Pu+cqD7l9sW9woY3Pl66CT8XK+q9woY3Pl66CT8XK+q9woY3Pl66CT8XK+q9woY3Pl66CT8XK+q9woY3PvhTAz/k97a9woY3PvhTAz/k97a9woY3PvhTAz/k97a9woY3PvhTAz/k97a9XSBRPvhTAz8XK+q9XSBRPvhTAz8XK+q9XSBRPvhTAz8XK+q9XSBRPvhTAz8XK+q9woY3Pn7aBz/n9sW9woY3Pn7aBz/n9sW9woY3Pn7aBz/n9sW9woY3Pn7aBz/n9sW9e05GPuYFBz+km8y9e05GPuYFBz+km8y9e05GPuYFBz+km8y93KBJPvhTAz/n9sW93KBJPvhTAz/n9sW93KBJPvhTAz/n9sW93KBJPvhTAz/n9sW93KBJPn7aBz8XK+q93KBJPn7aBz8XK+q93KBJPn7aBz8XK+q93KBJPn7aBz8XK+q9woY3PjDdpD5OCx6+woY3PjDdpD5OCx6+woY3PjDdpD5OCx6+woY3PjDdpD5OCx6+woY3PvypsT7opDe+woY3PvypsT7opDe+woY3PvypsT7opDe+woY3PvypsT7opDe+XSBRPvypsT5OCx6+XSBRPvypsT5OCx6+XSBRPvypsT5OCx6+XSBRPvypsT5OCx6+woY3Pu+cqD5mJTC+woY3Pu+cqD5mJTC+woY3Pu+cqD5mJTC+woY3Pu+cqD5mJTC+e05GPiBGqj4H0yy+e05GPiBGqj4H0yy+e05GPiBGqj4H0yy+3KBJPvypsT5mJTC+3KBJPvypsT5mJTC+3KBJPvypsT5mJTC+3KBJPvypsT5mJTC+3KBJPu+cqD5OCx6+3KBJPu+cqD5OCx6+3KBJPu+cqD5OCx6+3KBJPu+cqD5OCx6+woY3Pl66CT9OCx6+woY3Pl66CT9OCx6+woY3Pl66CT9OCx6+woY3Pl66CT9OCx6+XSBRPvhTAz9OCx6+XSBRPvhTAz9OCx6+XSBRPvhTAz9OCx6+XSBRPvhTAz9OCx6+woY3PvhTAz/opDe+woY3PvhTAz/opDe+woY3PvhTAz/opDe+woY3PvhTAz/opDe+3KBJPn7aBz9OCx6+3KBJPn7aBz9OCx6+3KBJPn7aBz9OCx6+3KBJPn7aBz9OCx6+e05GPuYFBz8H0yy+e05GPuYFBz8H0yy+e05GPuYFBz8H0yy+3KBJPvhTAz9nJTC+3KBJPvhTAz9nJTC+3KBJPvhTAz9nJTC+3KBJPvhTAz9nJTC+woY3Pn7aBz9nJTC+woY3Pn7aBz9nJTC+woY3Pn7aBz9nJTC+woY3Pn7aBz9nJTC+e6U8vlCNtz6W7Bi+e6U8vlCNtz6W7Bi+e6U8vlCNtz6W7Bi+e6U8vlCNtz6W7Bi+e6U8vsHKwT61cQS+e6U8vsHKwT61cQS+e6U8vsHKwT61cQS+e6U8vsHKwT61cQS+XSBRvsHKwT6W7Bi+XSBRvsHKwT6W7Bi+XSBRvsHKwT6W7Bi+XSBRvsHKwT6W7Bi+e6U8vh6Nuj5QcQq+e6U8vh6Nuj5QcQq+e6U8vh6Nuj5QcQq+e6U8vh6Nuj5QcQq+dHhIvkThuz6cGQ2+dHhIvkThuz6cGQ2+dHhIvkThuz6cGQ2+vyBLvsHKwT5QcQq+vyBLvsHKwT5QcQq+vyBLvsHKwT5QcQq+vyBLvsHKwT5QcQq+vyBLvh6Nuj6W7Bi+vyBLvh6Nuj6W7Bi+vyBLvh6Nuj6W7Bi+vyBLvh6Nuj6W7Bi+e6U8vtZ4yT61cQS+e6U8vtZ4yT61cQS+e6U8vtZ4yT61cQS+e6U8vtZ4yT61cQS+e6U8vka20z6W7Bi+e6U8vka20z6W7Bi+e6U8vka20z6W7Bi+e6U8vka20z6W7Bi+XSBRvtZ4yT6W7Bi+XSBRvtZ4yT6W7Bi+XSBRvtZ4yT6W7Bi+XSBRvtZ4yT6W7Bi+e6U8vnm20D5QcQq+e6U8vnm20D5QcQq+e6U8vnm20D5QcQq+e6U8vnm20D5QcQq+dHhIvlJizz6cGQ2+dHhIvlJizz6cGQ2+dHhIvlJizz6cGQ2+vyBLvnm20D6W7Bi+vyBLvnm20D6W7Bi+vyBLvnm20D6W7Bi+vyBLvnm20D6W7Bi+vyBLvtZ4yT5QcQq+vyBLvtZ4yT5QcQq+vyBLvtZ4yT5QcQq+vyBLvtZ4yT5QcQq+e6U8vlCNtz7bOMK+e6U8vlCNtz7bOMK+e6U8vlCNtz7bOMK+e6U8vlCNtz7bOMK+XSBRvsHKwT7bOMK+XSBRvsHKwT7bOMK+XSBRvsHKwT7bOMK+XSBRvsHKwT7bOMK+e6U8vsHKwT5Ldsy+e6U8vsHKwT5Ldsy+e6U8vsHKwT5Ldsy+e6U8vsHKwT5Ldsy+wiBLvh6Nuj7bOMK+wiBLvh6Nuj7bOMK+wiBLvh6Nuj7bOMK+wiBLvh6Nuj7bOMK+dnhIvkThuz5ZIsi+dnhIvkThuz5ZIsi+dnhIvkThuz5ZIsi+wiBLvsHKwT5+dsm+wiBLvsHKwT5+dsm+wiBLvsHKwT5+dsm+wiBLvsHKwT5+dsm+fKU8vh6Nuj5+dsm+fKU8vh6Nuj5+dsm+fKU8vh6Nuj5+dsm+fKU8vh6Nuj5+dsm+e6U8vka20z7bOMK+e6U8vka20z7bOMK+e6U8vka20z7bOMK+e6U8vka20z7bOMK+e6U8vtZ4yT5Ldsy+e6U8vtZ4yT5Ldsy+e6U8vtZ4yT5Ldsy+e6U8vtZ4yT5Ldsy+XSBRvtZ4yT7bOMK+XSBRvtZ4yT7bOMK+XSBRvtZ4yT7bOMK+XSBRvtZ4yT7bOMK+e6U8vnm20D5+dsm+e6U8vnm20D5+dsm+e6U8vnm20D5+dsm+e6U8vnm20D5+dsm+dHhIvlJizz5ZIsi+dHhIvlJizz5ZIsi+dHhIvlJizz5ZIsi+vyBLvtZ4yT5+dsm+vyBLvtZ4yT5+dsm+vyBLvtZ4yT5+dsm+vyBLvtZ4yT5+dsm+vyBLvnm20D7bOMK+vyBLvnm20D7bOMK+vyBLvnm20D7bOMK+vyBLvnm20D7bOMK+e6U8PlCNtz6W7Bi+e6U8PlCNtz6W7Bi+e6U8PlCNtz6W7Bi+e6U8PlCNtz6W7Bi+XSBRPsHKwT6W7Bi+XSBRPsHKwT6W7Bi+XSBRPsHKwT6W7Bi+XSBRPsHKwT6W7Bi+e6U8PsHKwT61cQS+e6U8PsHKwT61cQS+e6U8PsHKwT61cQS+e6U8PsHKwT61cQS+wiBLPh6Nuj6W7Bi+wiBLPh6Nuj6W7Bi+wiBLPh6Nuj6W7Bi+wiBLPh6Nuj6W7Bi+dnhIPkThuz6cGQ2+dnhIPkThuz6cGQ2+dnhIPkThuz6cGQ2+wiBLPsHKwT5QcQq+wiBLPsHKwT5QcQq+wiBLPsHKwT5QcQq+wiBLPsHKwT5QcQq+fKU8Ph6Nuj5QcQq+fKU8Ph6Nuj5QcQq+fKU8Ph6Nuj5QcQq+fKU8Ph6Nuj5QcQq+e6U8Pka20z6W7Bi+e6U8Pka20z6W7Bi+e6U8Pka20z6W7Bi+e6U8Pka20z6W7Bi+e6U8PtZ4yT61cQS+e6U8PtZ4yT61cQS+e6U8PtZ4yT61cQS+e6U8PtZ4yT61cQS+XSBRPtZ4yT6W7Bi+XSBRPtZ4yT6W7Bi+XSBRPtZ4yT6W7Bi+XSBRPtZ4yT6W7Bi+e6U8Pnm20D5QcQq+e6U8Pnm20D5QcQq+e6U8Pnm20D5QcQq+e6U8Pnm20D5QcQq+dHhIPlJizz6cGQ2+dHhIPlJizz6cGQ2+dHhIPlJizz6cGQ2+vyBLPtZ4yT5QcQq+vyBLPtZ4yT5QcQq+vyBLPtZ4yT5QcQq+vyBLPtZ4yT5QcQq+vyBLPnm20D6W7Bi+vyBLPnm20D6W7Bi+vyBLPnm20D6W7Bi+vyBLPnm20D6W7Bi+e6U8PlCNtz7bOMK+e6U8PlCNtz7bOMK+e6U8PlCNtz7bOMK+e6U8PlCNtz7bOMK+e6U8PsHKwT5Ldsy+e6U8PsHKwT5Ldsy+e6U8PsHKwT5Ldsy+e6U8PsHKwT5Ldsy+XSBRPsHKwT7bOMK+XSBRPsHKwT7bOMK+XSBRPsHKwT7bOMK+XSBRPsHKwT7bOMK+e6U8Ph6Nuj5+dsm+e6U8Ph6Nuj5+dsm+e6U8Ph6Nuj5+dsm+e6U8Ph6Nuj5+dsm+dHhIPkThuz5ZIsi+dHhIPkThuz5ZIsi+dHhIPkThuz5ZIsi+vyBLPsHKwT5+dsm+vyBLPsHKwT5+dsm+vyBLPsHKwT5+dsm+vyBLPsHKwT5+dsm+vyBLPh6Nuj7bOMK+vyBLPh6Nuj7bOMK+vyBLPh6Nuj7bOMK+vyBLPh6Nuj7bOMK+e6U8Pka20z7bOMK+e6U8Pka20z7bOMK+e6U8Pka20z7bOMK+e6U8Pka20z7bOMK+XSBRPtZ4yT7bOMK+XSBRPtZ4yT7bOMK+XSBRPtZ4yT7bOMK+XSBRPtZ4yT7bOMK+e6U8PtZ4yT5Ldsy+e6U8PtZ4yT5Ldsy+e6U8PtZ4yT5Ldsy+e6U8PtZ4yT5Ldsy+wiBLPnm20D7bOMK+wiBLPnm20D7bOMK+wiBLPnm20D7bOMK+wiBLPnm20D7bOMK+dnhIPlJizz5ZIsi+dnhIPlJizz5ZIsi+dnhIPlJizz5ZIsi+wiBLPtZ4yT5+dsm+wiBLPtZ4yT5+dsm+wiBLPtZ4yT5+dsm+wiBLPtZ4yT5+dsm+fKU8Pnm20D5+dsm+fKU8Pnm20D5+dsm+fKU8Pnm20D5+dsm+fKU8Pnm20D5+dsm+woY3vjDdpD7aaOC+woY3vjDdpD7aaOC+woY3vjDdpD7aaOC+woY3vjDdpD7aaOC+woY3vvypsT4OnNO+woY3vvypsT4OnNO+woY3vvypsT4OnNO+woY3vvypsT4OnNO+XSBRvvypsT7aaOC+XSBRvvypsT7aaOC+XSBRvvypsT7aaOC+XSBRvvypsT7aaOC+woY3vu+cqD7PW9e+woY3vu+cqD7PW9e+woY3vu+cqD7PW9e+woY3vu+cqD7PW9e+e05GviBGqj7+BNm+e05GviBGqj7+BNm+e05GviBGqj7+BNm+3KBJvvypsT7PW9e+3KBJvvypsT7PW9e+3KBJvvypsT7PW9e+3KBJvvypsT7PW9e+3KBJvu+cqD7aaOC+3KBJvu+cqD7aaOC+3KBJvu+cqD7aaOC+3KBJvu+cqD7aaOC+woY3vvhTAz8OnNO+woY3vvhTAz8OnNO+woY3vvhTAz8OnNO+woY3vvhTAz8OnNO+woY3vl66CT/aaOC+woY3vl66CT/aaOC+woY3vl66CT/aaOC+woY3vl66CT/aaOC+XSBRvvhTAz/aaOC+XSBRvvhTAz/aaOC+XSBRvvhTAz/aaOC+XSBRvvhTAz/aaOC+woY3vn7aBz/PW9e+woY3vn7aBz/PW9e+woY3vn7aBz/PW9e+woY3vn7aBz/PW9e+e05GvuYFBz/+BNm+e05GvuYFBz/+BNm+e05GvuYFBz/+BNm+3KBJvn7aBz/aaOC+3KBJvn7aBz/aaOC+3KBJvn7aBz/aaOC+3KBJvn7aBz/aaOC+3KBJvvhTAz/PW9e+3KBJvvhTAz/PW9e+3KBJvvhTAz/PW9e+3KBJvvhTAz/PW9e+woY3vjDdpD684/S+woY3vjDdpD684/S+woY3vjDdpD684/S+woY3vjDdpD684/S+XSBRvvypsT684/S+XSBRvvypsT684/S+XSBRvvypsT684/S+XSBRvvypsT684/S+woY3vvypsT5E2AC/woY3vvypsT5E2AC/woY3vvypsT5E2AC/woY3vvypsT5E2AC/3KBJvu+cqD684/S+3KBJvu+cqD684/S+3KBJvu+cqD684/S+3KBJvu+cqD684/S+e05GviBGqj6ZR/y+e05GviBGqj6ZR/y+e05GviBGqj6ZR/y+3KBJvvypsT7I8P2+3KBJvvypsT7I8P2+3KBJvvypsT7I8P2+3KBJvvypsT7I8P2+woY3vu+cqD7I8P2+woY3vu+cqD7I8P2+woY3vu+cqD7I8P2+woY3vu+cqD7I8P2+woY3vl66CT+84/S+woY3vl66CT+84/S+woY3vl66CT+84/S+woY3vl66CT+84/S+woY3vvhTAz9E2AC/woY3vvhTAz9E2AC/woY3vvhTAz9E2AC/woY3vvhTAz9E2AC/XSBRvvhTAz+84/S+XSBRvvhTAz+84/S+XSBRvvhTAz+84/S+XSBRvvhTAz+84/S+woY3vn7aBz/I8P2+woY3vn7aBz/I8P2+woY3vn7aBz/I8P2+woY3vn7aBz/I8P2+e05GvuYFBz+ZR/y+e05GvuYFBz+ZR/y+e05GvuYFBz+ZR/y+3KBJvvhTAz/I8P2+3KBJvvhTAz/I8P2+3KBJvvhTAz/I8P2+3KBJvvhTAz/I8P2+3KBJvn7aBz+84/S+3KBJvn7aBz+84/S+3KBJvn7aBz+84/S+3KBJvn7aBz+84/S+woY3PjDdpD7aaOC+woY3PjDdpD7aaOC+woY3PjDdpD7aaOC+woY3PjDdpD7aaOC+XSBRPvypsT7aaOC+XSBRPvypsT7aaOC+XSBRPvypsT7aaOC+XSBRPvypsT7aaOC+woY3PvypsT4OnNO+woY3PvypsT4OnNO+woY3PvypsT4OnNO+woY3PvypsT4OnNO+3KBJPu+cqD7aaOC+3KBJPu+cqD7aaOC+3KBJPu+cqD7aaOC+3KBJPu+cqD7aaOC+e05GPiBGqj7+BNm+e05GPiBGqj7+BNm+e05GPiBGqj7+BNm+3KBJPvypsT7PW9e+3KBJPvypsT7PW9e+3KBJPvypsT7PW9e+3KBJPvypsT7PW9e+woY3Pu+cqD7PW9e+woY3Pu+cqD7PW9e+woY3Pu+cqD7PW9e+woY3Pu+cqD7PW9e+woY3Pl66CT/aaOC+woY3Pl66CT/aaOC+woY3Pl66CT/aaOC+woY3Pl66CT/aaOC+woY3PvhTAz8OnNO+woY3PvhTAz8OnNO+woY3PvhTAz8OnNO+woY3PvhTAz8OnNO+XSBRPvhTAz/aaOC+XSBRPvhTAz/aaOC+XSBRPvhTAz/aaOC+XSBRPvhTAz/aaOC+woY3Pn7aBz/PW9e+woY3Pn7aBz/PW9e+woY3Pn7aBz/PW9e+woY3Pn7aBz/PW9e+e05GPuYFBz/+BNm+e05GPuYFBz/+BNm+e05GPuYFBz/+BNm+3KBJPvhTAz/PW9e+3KBJPvhTAz/PW9e+3KBJPvhTAz/PW9e+3KBJPvhTAz/PW9e+3KBJPn7aBz/aaOC+3KBJPn7aBz/aaOC+3KBJPn7aBz/aaOC+3KBJPn7aBz/aaOC+woY3PjDdpD684/S+woY3PjDdpD684/S+woY3PjDdpD684/S+woY3PjDdpD684/S+woY3PvypsT5E2AC/woY3PvypsT5E2AC/woY3PvypsT5E2AC/woY3PvypsT5E2AC/XSBRPvypsT684/S+XSBRPvypsT684/S+XSBRPvypsT684/S+XSBRPvypsT684/S+woY3Pu+cqD7I8P2+woY3Pu+cqD7I8P2+woY3Pu+cqD7I8P2+woY3Pu+cqD7I8P2+e05GPiBGqj6ZR/y+e05GPiBGqj6ZR/y+e05GPiBGqj6ZR/y+3KBJPvypsT7I8P2+3KBJPvypsT7I8P2+3KBJPvypsT7I8P2+3KBJPvypsT7I8P2+3KBJPu+cqD684/S+3KBJPu+cqD684/S+3KBJPu+cqD684/S+3KBJPu+cqD684/S+woY3Pl66CT+84/S+woY3Pl66CT+84/S+woY3Pl66CT+84/S+woY3Pl66CT+84/S+XSBRPvhTAz+84/S+XSBRPvhTAz+84/S+XSBRPvhTAz+84/S+XSBRPvhTAz+84/S+woY3PvhTAz9E2AC/woY3PvhTAz9E2AC/woY3PvhTAz9E2AC/woY3PvhTAz9E2AC/3KBJPn7aBz+84/S+3KBJPn7aBz+84/S+3KBJPn7aBz+84/S+3KBJPn7aBz+84/S+e05GPuYFBz+ZR/y+e05GPuYFBz+ZR/y+e05GPuYFBz+ZR/y+3KBJPvhTAz/I8P2+3KBJPvhTAz/I8P2+3KBJPvhTAz/I8P2+3KBJPvhTAz/I8P2+woY3Pn7aBz/I8P2+woY3Pn7aBz/I8P2+woY3Pn7aBz/I8P2+woY3Pn7aBz/I8P2+e6U8vlCNtz5hVPK+e6U8vlCNtz5hVPK+e6U8vlCNtz5hVPK+e6U8vlCNtz5hVPK+e6U8vsHKwT7wFui+e6U8vsHKwT7wFui+e6U8vsHKwT7wFui+e6U8vsHKwT7wFui+XSBRvsHKwT5hVPK+XSBRvsHKwT5hVPK+XSBRvsHKwT5hVPK+XSBRvsHKwT5hVPK+e6U8vh6Nuj69Fuu+e6U8vh6Nuj69Fuu+e6U8vh6Nuj69Fuu+e6U8vh6Nuj69Fuu+dHhIvkThuz7jauy+dHhIvkThuz7jauy+dHhIvkThuz7jauy+vyBLvsHKwT69Fuu+vyBLvsHKwT69Fuu+vyBLvsHKwT69Fuu+vyBLvsHKwT69Fuu+vyBLvh6Nuj5hVPK+vyBLvh6Nuj5hVPK+vyBLvh6Nuj5hVPK+vyBLvh6Nuj5hVPK+e6U8vtZ4yT7wFui+e6U8vtZ4yT7wFui+e6U8vtZ4yT7wFui+e6U8vtZ4yT7wFui+e6U8vka20z5hVPK+e6U8vka20z5hVPK+e6U8vka20z5hVPK+e6U8vka20z5hVPK+XSBRvtZ4yT5hVPK+XSBRvtZ4yT5hVPK+XSBRvtZ4yT5hVPK+XSBRvtZ4yT5hVPK+e6U8vnm20D69Fuu+e6U8vnm20D69Fuu+e6U8vnm20D69Fuu+e6U8vnm20D69Fuu+dHhIvlJizz7jauy+dHhIvlJizz7jauy+dHhIvlJizz7jauy+vyBLvnm20D5hVPK+vyBLvnm20D5hVPK+vyBLvnm20D5hVPK+vyBLvnm20D5hVPK+vyBLvtZ4yT69Fuu+vyBLvtZ4yT69Fuu+vyBLvtZ4yT69Fuu+vyBLvtZ4yT69Fuu+e6U8vlCNtz54CzS/e6U8vlCNtz54CzS/e6U8vlCNtz54CzS/e6U8vlCNtz54CzS/XSBRvsHKwT54CzS/XSBRvsHKwT54CzS/XSBRvsHKwT54CzS/XSBRvsHKwT54CzS/e6U8vsHKwT4xKjm/e6U8vsHKwT4xKjm/e6U8vsHKwT4xKjm/e6U8vsHKwT4xKjm/wiBLvh6Nuj54CzS/wiBLvh6Nuj54CzS/wiBLvh6Nuj54CzS/wiBLvh6Nuj54CzS/dnhIvkThuz43ADe/dnhIvkThuz43ADe/dnhIvkThuz43ADe/wiBLvsHKwT5Kqje/wiBLvsHKwT5Kqje/wiBLvsHKwT5Kqje/wiBLvsHKwT5Kqje/fKU8vh6Nuj5Kqje/fKU8vh6Nuj5Kqje/fKU8vh6Nuj5Kqje/fKU8vh6Nuj5Kqje/e6U8vka20z54CzS/e6U8vka20z54CzS/e6U8vka20z54CzS/e6U8vka20z54CzS/e6U8vtZ4yT4xKjm/e6U8vtZ4yT4xKjm/e6U8vtZ4yT4xKjm/e6U8vtZ4yT4xKjm/XSBRvtZ4yT54CzS/XSBRvtZ4yT54CzS/XSBRvtZ4yT54CzS/XSBRvtZ4yT54CzS/e6U8vnm20D5Kqje/e6U8vnm20D5Kqje/e6U8vnm20D5Kqje/e6U8vnm20D5Kqje/dHhIvlJizz43ADe/dHhIvlJizz43ADe/dHhIvlJizz43ADe/vyBLvtZ4yT5Kqje/vyBLvtZ4yT5Kqje/vyBLvtZ4yT5Kqje/vyBLvtZ4yT5Kqje/vyBLvnm20D54CzS/vyBLvnm20D54CzS/vyBLvnm20D54CzS/vyBLvnm20D54CzS/e6U8PlCNtz5hVPK+e6U8PlCNtz5hVPK+e6U8PlCNtz5hVPK+e6U8PlCNtz5hVPK+XSBRPsHKwT5hVPK+XSBRPsHKwT5hVPK+XSBRPsHKwT5hVPK+XSBRPsHKwT5hVPK+e6U8PsHKwT7wFui+e6U8PsHKwT7wFui+e6U8PsHKwT7wFui+e6U8PsHKwT7wFui+wiBLPh6Nuj5hVPK+wiBLPh6Nuj5hVPK+wiBLPh6Nuj5hVPK+wiBLPh6Nuj5hVPK+dnhIPkThuz7jauy+dnhIPkThuz7jauy+dnhIPkThuz7jauy+wiBLPsHKwT69Fuu+wiBLPsHKwT69Fuu+wiBLPsHKwT69Fuu+wiBLPsHKwT69Fuu+fKU8Ph6Nuj69Fuu+fKU8Ph6Nuj69Fuu+fKU8Ph6Nuj69Fuu+fKU8Ph6Nuj69Fuu+e6U8Pka20z5hVPK+e6U8Pka20z5hVPK+e6U8Pka20z5hVPK+e6U8Pka20z5hVPK+e6U8PtZ4yT7wFui+e6U8PtZ4yT7wFui+e6U8PtZ4yT7wFui+e6U8PtZ4yT7wFui+XSBRPtZ4yT5hVPK+XSBRPtZ4yT5hVPK+XSBRPtZ4yT5hVPK+XSBRPtZ4yT5hVPK+e6U8Pnm20D69Fuu+e6U8Pnm20D69Fuu+e6U8Pnm20D69Fuu+e6U8Pnm20D69Fuu+dHhIPlJizz7jauy+dHhIPlJizz7jauy+dHhIPlJizz7jauy+vyBLPtZ4yT69Fuu+vyBLPtZ4yT69Fuu+vyBLPtZ4yT69Fuu+vyBLPtZ4yT69Fuu+vyBLPnm20D5hVPK+vyBLPnm20D5hVPK+vyBLPnm20D5hVPK+vyBLPnm20D5hVPK+e6U8PlCNtz54CzS/e6U8PlCNtz54CzS/e6U8PlCNtz54CzS/e6U8PlCNtz54CzS/e6U8PsHKwT4xKjm/e6U8PsHKwT4xKjm/e6U8PsHKwT4xKjm/e6U8PsHKwT4xKjm/XSBRPsHKwT54CzS/XSBRPsHKwT54CzS/XSBRPsHKwT54CzS/XSBRPsHKwT54CzS/e6U8Ph6Nuj5Kqje/e6U8Ph6Nuj5Kqje/e6U8Ph6Nuj5Kqje/e6U8Ph6Nuj5Kqje/dHhIPkThuz43ADe/dHhIPkThuz43ADe/dHhIPkThuz43ADe/vyBLPsHKwT5Kqje/vyBLPsHKwT5Kqje/vyBLPsHKwT5Kqje/vyBLPsHKwT5Kqje/vyBLPh6Nuj54CzS/vyBLPh6Nuj54CzS/vyBLPh6Nuj54CzS/vyBLPh6Nuj54CzS/e6U8Pka20z54CzS/e6U8Pka20z54CzS/e6U8Pka20z54CzS/e6U8Pka20z54CzS/XSBRPtZ4yT54CzS/XSBRPtZ4yT54CzS/XSBRPtZ4yT54CzS/XSBRPtZ4yT54CzS/e6U8PtZ4yT4xKjm/e6U8PtZ4yT4xKjm/e6U8PtZ4yT4xKjm/e6U8PtZ4yT4xKjm/wiBLPnm20D54CzS/wiBLPnm20D54CzS/wiBLPnm20D54CzS/wiBLPnm20D54CzS/dnhIPlJizz43ADe/dnhIPlJizz43ADe/dnhIPlJizz43ADe/wiBLPtZ4yT5Kqje/wiBLPtZ4yT5Kqje/wiBLPtZ4yT5Kqje/wiBLPtZ4yT5Kqje/fKU8Pnm20D5Kqje/fKU8Pnm20D5Kqje/fKU8Pnm20D5Kqje/fKU8Pnm20D5Kqje/7FE4vfDS7T7lSfK+7FE4vfDS7T7lSfK+7FE4vfDS7T7lSfK+7FE4vfDS7T7lSfK+7FE4vanx8j4sK+2+7FE4vanx8j4sK+2+7FE4vanx8j4sK+2+7FE4vanx8j4sK+2+r0dhvanx8j7lSfK+r0dhvanx8j7lSfK+r0dhvanx8j7lSfK+r0dhvanx8j7lSfK+7VE4vdhS7z4Tq+6+7VE4vdhS7z4Tq+6+7VE4vdhS7z4Tq+6+7VE4vdhS7z4Tq+6+4vdPvev87z4nVe++4vdPvev87z4nVe++4vdPvev87z4nVe++ekhVvanx8j4Tq+6+ekhVvanx8j4Tq+6+ekhVvanx8j4Tq+6+ekhVvanx8j4Tq+6+ekhVvdhS7z7lSfK+ekhVvdhS7z7lSfK+ekhVvdhS7z7lSfK+ekhVvdhS7z7lSfK+7FE4vb6f+j4sK+2+7FE4vb6f+j4sK+2+7FE4vb6f+j4sK+2+7FE4vb6f+j4sK+2+7FE4vXe+/z7lSfK+7FE4vXe+/z7lSfK+7FE4vXe+/z7lSfK+7FE4vXe+/z7lSfK+r0dhvb6f+j7lSfK+r0dhvb6f+j7lSfK+r0dhvb6f+j7lSfK+r0dhvb6f+j7lSfK+7VE4vY8+/j4Tq+6+7VE4vY8+/j4Tq+6+7VE4vY8+/j4Tq+6+7VE4vY8+/j4Tq+6+4vdPvXyU/T4nVe++4vdPvXyU/T4nVe++4vdPvXyU/T4nVe++ekhVvY8+/j7lSfK+ekhVvY8+/j7lSfK+ekhVvY8+/j7lSfK+ekhVvY8+/j7lSfK+ekhVvb6f+j4Tq+6+ekhVvb6f+j4Tq+6+ekhVvb6f+j4Tq+6+ekhVvb6f+j4Tq+6+7FE4vfDS7T5Wh/y+7FE4vfDS7T5Wh/y+7FE4vfDS7T5Wh/y+7FE4vfDS7T5Wh/y+r0dhvanx8j5Wh/y+r0dhvanx8j5Wh/y+r0dhvanx8j5Wh/y+r0dhvanx8j5Wh/y+7FE4vanx8j4H0wC/7FE4vanx8j4H0wC/7FE4vanx8j4H0wC/7FE4vanx8j4H0wC/ekhVvdhS7z5Wh/y+ekhVvdhS7z5Wh/y+ekhVvdhS7z5Wh/y+ekhVvdhS7z5Wh/y+4vdPvev87z4UfP++4vdPvev87z4UfP++4vdPvev87z4UfP++ekhVvanx8j4UEwC/ekhVvanx8j4UEwC/ekhVvanx8j4UEwC/ekhVvanx8j4UEwC/7VE4vdhS7z4UEwC/7VE4vdhS7z4UEwC/7VE4vdhS7z4UEwC/7VE4vdhS7z4UEwC/7FE4vXe+/z5Wh/y+7FE4vXe+/z5Wh/y+7FE4vXe+/z5Wh/y+7FE4vXe+/z5Wh/y+7FE4vb6f+j4H0wC/7FE4vb6f+j4H0wC/7FE4vb6f+j4H0wC/7FE4vb6f+j4H0wC/r0dhvb6f+j5Wh/y+r0dhvb6f+j5Wh/y+r0dhvb6f+j5Wh/y+r0dhvb6f+j5Wh/y+7VE4vY8+/j4UEwC/7VE4vY8+/j4UEwC/7VE4vY8+/j4UEwC/7VE4vY8+/j4UEwC/4vdPvXyU/T4UfP++4vdPvXyU/T4UfP++4vdPvXyU/T4UfP++ekhVvb6f+j4UEwC/ekhVvb6f+j4UEwC/ekhVvb6f+j4UEwC/ekhVvb6f+j4UEwC/ekhVvY8+/j5Wh/y+ekhVvY8+/j5Wh/y+ekhVvY8+/j5Wh/y+ekhVvY8+/j5Wh/y+7FE4PfDS7T7lSfK+7FE4PfDS7T7lSfK+7FE4PfDS7T7lSfK+7FE4PfDS7T7lSfK+r0dhPanx8j7lSfK+r0dhPanx8j7lSfK+r0dhPanx8j7lSfK+r0dhPanx8j7lSfK+7FE4Panx8j4sK+2+7FE4Panx8j4sK+2+7FE4Panx8j4sK+2+7FE4Panx8j4sK+2+ekhVPdhS7z7lSfK+ekhVPdhS7z7lSfK+ekhVPdhS7z7lSfK+ekhVPdhS7z7lSfK+4vdPPev87z4nVe++4vdPPev87z4nVe++4vdPPev87z4nVe++ekhVPanx8j4Tq+6+ekhVPanx8j4Tq+6+ekhVPanx8j4Tq+6+ekhVPanx8j4Tq+6+7VE4PdhS7z4Tq+6+7VE4PdhS7z4Tq+6+7VE4PdhS7z4Tq+6+7VE4PdhS7z4Tq+6+7FE4PXe+/z7lSfK+7FE4PXe+/z7lSfK+7FE4PXe+/z7lSfK+7FE4PXe+/z7lSfK+7FE4Pb6f+j4sK+2+7FE4Pb6f+j4sK+2+7FE4Pb6f+j4sK+2+7FE4Pb6f+j4sK+2+r0dhPb6f+j7lSfK+r0dhPb6f+j7lSfK+r0dhPb6f+j7lSfK+r0dhPb6f+j7lSfK+7VE4PY8+/j4Tq+6+7VE4PY8+/j4Tq+6+7VE4PY8+/j4Tq+6+7VE4PY8+/j4Tq+6+4vdPPXyU/T4nVe++4vdPPXyU/T4nVe++4vdPPXyU/T4nVe++ekhVPb6f+j4Tq+6+ekhVPb6f+j4Tq+6+ekhVPb6f+j4Tq+6+ekhVPb6f+j4Tq+6+ekhVPY8+/j7lSfK+ekhVPY8+/j7lSfK+ekhVPY8+/j7lSfK+ekhVPY8+/j7lSfK+7FE4PfDS7T5Wh/y+7FE4PfDS7T5Wh/y+7FE4PfDS7T5Wh/y+7FE4PfDS7T5Wh/y+7FE4Panx8j4H0wC/7FE4Panx8j4H0wC/7FE4Panx8j4H0wC/7FE4Panx8j4H0wC/r0dhPanx8j5Wh/y+r0dhPanx8j5Wh/y+r0dhPanx8j5Wh/y+r0dhPanx8j5Wh/y+7VE4PdhS7z4UEwC/7VE4PdhS7z4UEwC/7VE4PdhS7z4UEwC/7VE4PdhS7z4UEwC/4vdPPev87z4UfP++4vdPPev87z4UfP++4vdPPev87z4UfP++ekhVPanx8j4UEwC/ekhVPanx8j4UEwC/ekhVPanx8j4UEwC/ekhVPanx8j4UEwC/ekhVPdhS7z5Wh/y+ekhVPdhS7z5Wh/y+ekhVPdhS7z5Wh/y+ekhVPdhS7z5Wh/y+7FE4PXe+/z5Wh/y+7FE4PXe+/z5Wh/y+7FE4PXe+/z5Wh/y+7FE4PXe+/z5Wh/y+r0dhPb6f+j5Wh/y+r0dhPb6f+j5Wh/y+r0dhPb6f+j5Wh/y+r0dhPb6f+j5Wh/y+7FE4Pb6f+j4H0wC/7FE4Pb6f+j4H0wC/7FE4Pb6f+j4H0wC/7FE4Pb6f+j4H0wC/ekhVPY8+/j5Wh/y+ekhVPY8+/j5Wh/y+ekhVPY8+/j5Wh/y+ekhVPY8+/j5Wh/y+4vdPPXyU/T4UfP++4vdPPXyU/T4UfP++4vdPPXyU/T4UfP++ekhVPb6f+j4UEwC/ekhVPb6f+j4UEwC/ekhVPb6f+j4UEwC/ekhVPb6f+j4UEwC/7VE4PY8+/j4UEwC/7VE4PY8+/j4UEwC/7VE4PY8+/j4UEwC/7VE4PY8+/j4UEwC/7rpMv5zi7z1vEuM+7rpMv5zi7z1vEuM+7rpMv5zi7z3sfN8+zcxMv3974z0tst0+q95Mv2MU1z3sfN8+q95Mv2MU1z1vEuM+zcxMv3974z0u3eQ+xQUXwD7gPz5vEuM+xQUXwD7gPz5vEuM+xQUXwD7gPz7sfN8+PQoXwLCsOT4tst0+tQ4XwCJ5Mz7sfN8+tQ4XwCJ5Mz5vEuM+PQoXwLCsOT4u3eQ+g8CGv30lAj4+Ctc+g8CGv30lAj4+Ctc+SQyGv30lAj4+Ctc+LbKFv7iJ+j0+Ctc+SQyGv3bI8D0+Ctc+g8CGv3bI8D0+Ctc+nxqHv7iJ+j0+Ctc+g8CGv30lAj4K16O+g8CGv30lAj4K16O+SQyGv30lAj4K16O+LbKFv7iJ+j0K16O+SQyGv3bI8D0K16O+g8CGv3bI8D0K16O+nxqHv7iJ+j0K16O+qMYJwGLeND4+Ctc+qMYJwGLeND4+Ctc+jGwJwGLeND4+Ctc+fT8JwMH9Lz4+Ctc+jGwJwCAdKz4+Ctc+qMYJwCAdKz4+Ctc+t/MJwMH9Lz4+Ctc+qMYJwGLeND4K16O+qMYJwGLeND4K16O+jGwJwGLeND4K16O+fT8JwMH9Lz4K16O+jGwJwCAdKz4K16O+qMYJwCAdKz4K16O+t/MJwMH9Lz4K16O+7rpMP5zi7z3sfN8+7rpMP5zi7z3sfN8+7rpMP5zi7z1vEuM+zcxMP3974z0u3eQ+q95MP2MU1z1vEuM+q95MP2MU1z3sfN8+zcxMP3974z0tst0+xQUXQD7gPz7sfN8+xQUXQD7gPz7sfN8+xQUXQD7gPz5vEuM+PQoXQLCsOT4u3eQ+tQ4XQCJ5Mz5vEuM+tQ4XQCJ5Mz7sfN8+PQoXQLCsOT4tst0+SQyGP30lAj4+Ctc+SQyGP30lAj4+Ctc+g8CGP30lAj4+Ctc+nxqHP7iJ+j0+Ctc+g8CGP3bI8D0+Ctc+SQyGP3bI8D0+Ctc+LbKFP7iJ+j0+Ctc+SQyGP30lAj4K16O+SQyGP30lAj4K16O+g8CGP30lAj4K16O+nxqHP7iJ+j0K16O+g8CGP3bI8D0K16O+SQyGP3bI8D0K16O+LbKFP7iJ+j0K16O+jGwJQGLeND4+Ctc+jGwJQGLeND4+Ctc+qMYJQGLeND4+Ctc+t/MJQMH9Lz4+Ctc+qMYJQCAdKz4+Ctc+jGwJQCAdKz4+Ctc+fT8JQMH9Lz4+Ctc+jGwJQGLeND4K16O+jGwJQGLeND4K16O+qMYJQGLeND4K16O+t/MJQMH9Lz4K16O+qMYJQCAdKz4K16O+jGwJQCAdKz4K16O+fT8JQMH9Lz4K16O+AAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+kVdjv1hxpr5YcaY+WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+WHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAkVdjv1hxpr5YcaY+LoNsv/zvw74AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmvlhxpj6RV2M//O/DvgAAAAAug2w/AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsvwAAAAD878M+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+kVdjv1hxpj5YcaY+WHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsv/zvwz4AAAAAWHGmvlhxpj6RV2M//O/DvgAAAAAug2w/kVdjv1hxpj5YcaY+LoNsvwAAAAD878M+AAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/WHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsv/zvw74AAAAAWHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+kVdjv1hxpr5Ycaa+WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/kVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+AAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+AAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+kVdjv1hxpj5Ycaa+WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+WHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAkVdjv1hxpj5Ycaa+LoNsv/zvwz4AAAAAAAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsPwAAAAD878M+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/WHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsP/zvw74AAAAAWHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+kVdjP1hxpr5YcaY+WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/kVdjP1hxpr5YcaY+LoNsPwAAAAD878M+AAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+kVdjP1hxpj5YcaY+WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+WHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAkVdjP1hxpj5YcaY+LoNsP/zvwz4AAAAAAAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+kVdjP1hxpr5Ycaa+WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+WHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAkVdjP1hxpr5Ycaa+LoNsP/zvw74AAAAAAAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/WHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsP/zvwz4AAAAAWHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+kVdjP1hxpj5Ycaa+WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/kVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+AAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+AAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+kVdjv1hxpr5YcaY+WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+WHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAkVdjv1hxpr5YcaY+LoNsv/zvw74AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmvlhxpj6RV2M//O/DvgAAAAAug2w/AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsvwAAAAD878M+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+kVdjv1hxpj5YcaY+WHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsv/zvwz4AAAAAWHGmvlhxpj6RV2M//O/DvgAAAAAug2w/kVdjv1hxpj5YcaY+LoNsvwAAAAD878M+AAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/WHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsv/zvw74AAAAAWHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+kVdjv1hxpr5Ycaa+WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/kVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+AAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+AAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+kVdjv1hxpj5Ycaa+WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+WHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAkVdjv1hxpj5Ycaa+LoNsv/zvwz4AAAAAAAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsPwAAAAD878M+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/WHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsP/zvw74AAAAAWHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+kVdjP1hxpr5YcaY+WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/kVdjP1hxpr5YcaY+LoNsPwAAAAD878M+AAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+kVdjP1hxpj5YcaY+WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+WHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAkVdjP1hxpj5YcaY+LoNsP/zvwz4AAAAAAAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+kVdjP1hxpr5Ycaa+WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+WHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAkVdjP1hxpr5Ycaa+LoNsP/zvw74AAAAAAAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/WHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsP/zvwz4AAAAAWHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+kVdjP1hxpj5Ycaa+WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/kVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+AAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+AAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+kVdjv1hxpr5YcaY+WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+WHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAkVdjv1hxpr5YcaY+LoNsv/zvw74AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmvlhxpj6RV2M//O/DvgAAAAAug2w/AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsvwAAAAD878M+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+kVdjv1hxpj5YcaY+WHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsv/zvwz4AAAAAWHGmvlhxpj6RV2M//O/DvgAAAAAug2w/kVdjv1hxpj5YcaY+LoNsvwAAAAD878M+AAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/WHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsv/zvw74AAAAAWHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+kVdjv1hxpr5Ycaa+WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/kVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+AAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+AAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+kVdjv1hxpj5Ycaa+WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+WHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAkVdjv1hxpj5Ycaa+LoNsv/zvwz4AAAAAAAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsPwAAAAD878M+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/WHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsP/zvw74AAAAAWHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+kVdjP1hxpr5YcaY+WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/kVdjP1hxpr5YcaY+LoNsPwAAAAD878M+AAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+kVdjP1hxpj5YcaY+WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+WHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAkVdjP1hxpj5YcaY+LoNsP/zvwz4AAAAAAAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+kVdjP1hxpr5Ycaa+WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+WHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAkVdjP1hxpr5Ycaa+LoNsP/zvw74AAAAAAAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/WHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsP/zvwz4AAAAAWHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+kVdjP1hxpj5Ycaa+WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/kVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+AAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+AAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+kVdjv1hxpr5YcaY+WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+WHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAkVdjv1hxpr5YcaY+LoNsv/zvw74AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmvlhxpj6RV2M//O/DvgAAAAAug2w/AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsvwAAAAD878M+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+kVdjv1hxpj5YcaY+WHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsv/zvwz4AAAAAWHGmvlhxpj6RV2M//O/DvgAAAAAug2w/kVdjv1hxpj5YcaY+LoNsvwAAAAD878M+AAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/WHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsv/zvw74AAAAAWHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+kVdjv1hxpr5Ycaa+WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/kVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+AAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+AAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+kVdjv1hxpj5Ycaa+WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+WHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAkVdjv1hxpj5Ycaa+LoNsv/zvwz4AAAAAAAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsPwAAAAD878M+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/WHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsP/zvw74AAAAAWHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+kVdjP1hxpr5YcaY+WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/kVdjP1hxpr5YcaY+LoNsPwAAAAD878M+AAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+kVdjP1hxpj5YcaY+WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+WHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAkVdjP1hxpj5YcaY+LoNsP/zvwz4AAAAAAAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+kVdjP1hxpr5Ycaa+WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+WHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAkVdjP1hxpr5Ycaa+LoNsP/zvw74AAAAAAAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/WHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsP/zvwz4AAAAAWHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+kVdjP1hxpj5Ycaa+WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/kVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+AAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+AAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+kVdjv1hxpr5YcaY+WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+WHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAkVdjv1hxpr5YcaY+LoNsv/zvw74AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmvlhxpj6RV2M//O/DvgAAAAAug2w/AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsvwAAAAD878M+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+kVdjv1hxpj5YcaY+WHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsv/zvwz4AAAAAWHGmvlhxpj6RV2M//O/DvgAAAAAug2w/kVdjv1hxpj5YcaY+LoNsvwAAAAD878M+AAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/WHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsv/zvw74AAAAAWHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+kVdjv1hxpr5Ycaa+WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/kVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+AAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+AAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+kVdjv1hxpj5Ycaa+WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+WHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAkVdjv1hxpj5Ycaa+LoNsv/zvwz4AAAAAAAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsPwAAAAD878M+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/WHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsP/zvw74AAAAAWHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+kVdjP1hxpr5YcaY+WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/kVdjP1hxpr5YcaY+LoNsPwAAAAD878M+AAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+kVdjP1hxpj5YcaY+WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+WHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAkVdjP1hxpj5YcaY+LoNsP/zvwz4AAAAAAAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+kVdjP1hxpr5Ycaa+WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+WHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAkVdjP1hxpr5Ycaa+LoNsP/zvw74AAAAAAAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/WHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsP/zvwz4AAAAAWHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+kVdjP1hxpj5Ycaa+WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/kVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+AAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+AAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+WHGmvlhxpr6RV2M/WHGmvpFXY79YcaY+kVdjv1hxpr5YcaY+WHGmvlhxpr6RV2M//O/DvgAAAAAug2w/kVdjv1hxpr5YcaY+LoNsvwAAAAD878M+WHGmvpFXY79YcaY+/O/Dvi6DbL8AAAAAkVdjv1hxpr5YcaY+LoNsv/zvw74AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmvlhxpj6RV2M//O/DvgAAAAAug2w/AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsvwAAAAD878M+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+WHGmvlhxpj6RV2M/WHGmvpFXYz9YcaY+kVdjv1hxpj5YcaY+WHGmvpFXYz9YcaY+/O/Dvi6DbD8AAAAAkVdjv1hxpj5YcaY+LoNsv/zvwz4AAAAAWHGmvlhxpj6RV2M//O/DvgAAAAAug2w/kVdjv1hxpj5YcaY+LoNsvwAAAAD878M+AAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+LoNsv/zvw74AAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/WHGmvpFXY79Ycaa+/O/Dvi6DbL8AAAAAkVdjv1hxpr5Ycaa+LoNsv/zvw74AAAAAWHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+kVdjv1hxpr5Ycaa+WHGmvlhxpr6RV2O//O/DvgAAAAAug2y/kVdjv1hxpr5Ycaa+LoNsvwAAAAD878O+AAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmvlhxpr6RV2O/WHGmvpFXY79Ycaa+AAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+LoNsv/zvwz4AAAAAAACAvwAAAAAAAAAAAAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+WHGmvlhxpj6RV2O/WHGmvpFXYz9Ycaa+kVdjv1hxpj5Ycaa+WHGmvlhxpj6RV2O//O/DvgAAAAAug2y/kVdjv1hxpj5Ycaa+LoNsvwAAAAD878O+WHGmvpFXYz9Ycaa+/O/Dvi6DbD8AAAAAkVdjv1hxpj5Ycaa+LoNsv/zvwz4AAAAAAAAAAC6DbL/878M+AAAAAAAAgL8AAAAAWHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsPwAAAAD878M+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAPzvw74ug2w/WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/WHGmPpFXY79YcaY+/O/DPi6DbL8AAAAAkVdjP1hxpr5YcaY+LoNsP/zvw74AAAAAWHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+kVdjP1hxpr5YcaY+WHGmPlhxpr6RV2M//O/DPgAAAAAug2w/kVdjP1hxpr5YcaY+LoNsPwAAAAD878M+AAAAAPzvw74ug2w/AAAAAC6DbL/878M+WHGmPlhxpr6RV2M/WHGmPpFXY79YcaY+AAAAAC6DbD/878M+AAAAAAAAgD8AAAAAWHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAAAAAAAAAAAAAAIA/AAAAAPzvwz4ug2w/WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAPzvwz4ug2w/AAAAAC6DbD/878M+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+WHGmPlhxpj6RV2M/WHGmPpFXYz9YcaY+kVdjP1hxpj5YcaY+WHGmPlhxpj6RV2M//O/DPgAAAAAug2w/kVdjP1hxpj5YcaY+LoNsPwAAAAD878M+WHGmPpFXYz9YcaY+/O/DPi6DbD8AAAAAkVdjP1hxpj5YcaY+LoNsP/zvwz4AAAAAAAAAAC6DbL/878O+AAAAAAAAgL8AAAAAWHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAAAAAAAAAAAAAAIC/AAAAAPzvw74ug2y/WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+LoNsP/zvw74AAAAAAACAPwAAAAAAAAAAAAAAAPzvw74ug2y/AAAAAC6DbL/878O+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+WHGmPlhxpr6RV2O/WHGmPpFXY79Ycaa+kVdjP1hxpr5Ycaa+WHGmPlhxpr6RV2O//O/DPgAAAAAug2y/kVdjP1hxpr5Ycaa+LoNsPwAAAAD878O+WHGmPpFXY79Ycaa+/O/DPi6DbL8AAAAAkVdjP1hxpr5Ycaa+LoNsP/zvw74AAAAAAAAAAC6DbD/878O+AAAAAAAAgD8AAAAAWHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+LoNsP/zvwz4AAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAPzvwz4ug2y/WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/WHGmPpFXYz9Ycaa+/O/DPi6DbD8AAAAAkVdjP1hxpj5Ycaa+LoNsP/zvwz4AAAAAWHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+kVdjP1hxpj5Ycaa+WHGmPlhxpj6RV2O//O/DPgAAAAAug2y/kVdjP1hxpj5Ycaa+LoNsPwAAAAD878O+AAAAAPzvwz4ug2y/AAAAAC6DbD/878O+WHGmPlhxpj6RV2O/WHGmPpFXYz9Ycaa+H8AfPX15XT9UAQA/H8AfPX15XT9UAQA/H8AfPX15XT9UAQC/AAAAAAAAAAAAAIC/H8AfvX15Xb9UAQC/H8AfvX15Xb9UAQA/AAAAAAAAAAAAAIA/H8AfPX15XT9UAQA/H8AfPX15XT9UAQA/H8AfPX15XT9UAQC/AAAAAAAAAAAAAIC/H8AfvX15Xb9UAQC/H8AfvX15Xb9UAQA/AAAAAAAAAAAAAIA/uQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAuQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAuQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAuQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAH8AfvX15XT9UAQC/H8AfvX15XT9UAQC/H8AfvX15XT9UAQA/AAAAAAAAAAAAAIA/H8AfPX15Xb9UAQA/H8AfPX15Xb9UAQC/AAAAAAAAAAAAAIC/H8AfvX15XT9UAQC/H8AfvX15XT9UAQC/H8AfvX15XT9UAQA/AAAAAAAAAAAAAIA/H8AfPX15Xb9UAQA/H8AfPX15Xb9UAQC/AAAAAAAAAAAAAIC/uQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAuQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAuQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAuQAAv22zXT8AAAAAuQAAv22zXT8AAAAAuQAAP22zXT8AAAAAAACAPwAAAAAAAAAAuQAAP22zXb8AAAAAuQAAv22zXb8AAAAAAACAvwAAAAAAAAAAAAAIPiy+gj4AAAg+LL6CPgAACD4svoI+AAAIPiy+gj6rquo+AAAAPKuq6j4AAAA8q6rqPgAAADyrquo+AAAAPKuq6j7qoH4/q6rqPuqgfj+rquo+6qB+P6uq6j7qoH4/AADAPgAAADwBAAg+AACAPgAAwD4AAAA8AQAIPgAAgD50CNI+AAAAAJdhAz4AAIA+AADAPp1rfz+qquo+AAAAAKqq6j4AAAAArKrqPgAAgD+squo+AACAPwAAAD4qvoI+AAAAPiq+gj4AAMA+6qB+PwAAwD7qoH4/q6oKPwAAADyrqgo/AAAAPKuqCj8AAAA8q6oKPwAAADz//10/LL6CPv//XT8svoI+//9dPyy+gj7//10/LL6CPqyqCj/qoH4/rKoKP+qgfj+sqgo/6qB+P6yqCj/qoH4/AAAgPwAAADz//10/AgCAPgAAID8AAAA8//9dPwIAgD4AACA/AGZYOwAAYD/EKIE+xvsWPwAAgD8AAGA/LL6CPgAAYD8svoI+AAAgP+qgfj8AACA/6qB+P6uqCj8AAAAAq6oKPwAAAACrqgo/AACAP6uqCj8AAIA/AAAIPtRB/T4AAAg+1EH9PgAACD7UQf0+AAAIPtRB/T6qquo+Fl9BP6qq6j4WX0E/qqrqPhZfQT+qquo+Fl9BP6qq6j4AAD4/qqrqPgAAPj+qquo+AAA+P6qq6j4AAD4/AAAAPtRB/T4AAAA+1EH9PgAAwD4WX0E/AADAPhZfQT86BMk+zZM/PwAAAD461/4+OgTJPs2TPz+qquo+AABAP6qq6j4AAEA/qqrqPgAAQD+qquo+AABAPwAAwD4AAD4/AAAIPgAAAD8AAMA+AAA+PwAACD4AAAA///9dP9RB/T7//10/1EH9Pv//XT/UQf0+//9dP9RB/T6rqgo/AAA+P6uqCj8AAD4/q6oKPwAAPj+rqgo/AAA+P6qqCj8WX0E/qqoKPxZfQT+qqgo/Fl9BP6qqCj8WX0E/AAAgPwAAPj8AAF4/AAAAPwAAID8AAD4/AABePwAAAD/jfRs/MkpAP5onXz8AAAA/430bPzJKQD+rqgo/AABAP6uqCj8AAEA/q6oKPwAAQD+rqgo/AABAPwAAYD/UQf0+AABgP9RB/T4AACA/Fl9BPwAAID8WX0E/AAC8Piy+gj4AALw+LL6CPgAAvD4svoI+AAC8Piy+gj6qquo+Lr6CPqqq6j4uvoI+qqrqPi6+gj6qquo+Lr6CPqqq6j4AAHg+qqrqPgAAeD6qquo+AAB4Pqqq6j4AAHg+AADAPiy+gj4AAMA+LL6CPgAAwD4svoI+AADAPiy+gj7SAsY+UKV/PtICxj5QpX8+0gLGPlClfz6qquo+AACAPqqq6j4AAIA+qqrqPgAAgD6qquo+AACAPgAAvj4AAHw+AAC+PgAAfD4AAL4+AAB8PgAAvj4AAHw+//8hPyy+gj7//yE/LL6CPv//IT8svoI+//8hPyy+gj6rqgo/AAB4PquqCj8AAHg+q6oKPwAAeD6rqgo/AAB4PqqqCj8uvoI+qqoKPy6+gj6qqgo/Lr6CPqqqCj8uvoI+AAAhPwAAfD4AACE/AAB8PgAAIT8AAHw+AAAhPwAAfD66Rh0/6mKAPrpGHT/qYoA+ukYdP+pigD6qqgo/AACAPqqqCj8AAIA+qqoKPwAAgD6qqgo/AACAPgAAID8qvoI+AAAgPyq+gj4AACA/Kr6CPgAAID8qvoI+AAC8PtRB/T4AALw+1EH9PgAAvD7UQf0+AAC8PtRB/T6rquo+AAACP6uq6j4AAAI/q6rqPgAAAj+rquo+AAACP6uq6j7SQf0+q6rqPtJB/T6rquo+0kH9Pquq6j7SQf0+AAC+PgAAAT8AAL4+AAABPwAAvj4AAAE/AAC+PgAAAT+OcsU+Ep3/Po5yxT4Snf8+jnLFPhKd/z6qquo+AAAAP6qq6j4AAAA/qqrqPgAAAD+qquo+AAAAPwAAwD7UQf0+AADAPtRB/T4AAMA+1EH9PgAAwD7UQf0+AAAiP9RB/T4AACI/1EH9PgAAIj/UQf0+AAAiP9RB/T6sqgo/1EH9PqyqCj/UQf0+rKoKP9RB/T6sqgo/1EH9PquqCj8AAAI/q6oKPwAAAj+rqgo/AAACP6uqCj8AAAI/AAAgP9RB/T4AACA/1EH9PgAAID/UQf0+AAAgP9RB/T6Y/hw/qxYAP5j+HD+rFgA/mP4cP6sWAD+qqgo/AAAAP6qqCj8AAAA/qqoKPwAAAD+qqgo/AAAAPwAAIT8AAAE/AAAhPwAAAT8AACE/AAABPwAAIT8AAAE/RKsPPjqOoz5Eqw8+Oo6jPkSrDz46jqM+RKsPPjqOoz6X0M4+gLR6PJfQzj6AtHo8l9DOPoC0ejyX0M4+gLR6PJfQzj7kOG4/l9DOPuQ4bj+X0M4+5DhuP5fQzj7kOG4/AADAPgC0ejxDqw8+AACAPgAAwD4AtHo8Q6sPPgAAgD7wQsY+AAAAAFyfBj4AAIA+AADAPnp8eD+Y0M4+AAAAAJjQzj4AAAAAmNDOPgAAgD+Y0M4+AACAPwAAAD46jqM+AAAAPjqOoz4AAMA+5DhuPwAAwD7kOG4/tJcYP4C0ejy0lxg/gLR6PLSXGD+AtHo8tJcYP4C0ejwwFVw/OI6jPjAVXD84jqM+MBVcPziOoz4wFVw/OI6jPrOXGD/kOG4/s5cYP+Q4bj+zlxg/5DhuP7OXGD/kOG4/AAAgP0C0ejwvFVw/AACAPgAAID9AtHo8LxVcPwAAgD4AACA/gOvTOwAAYD8MB48+h94cPwAAgD8AAGA/OI6jPgAAYD84jqM+AAAgP+Q4bj8AACA/5DhuP7SXGD8AAAAAtJcYPwAAAAC1lxg/AACAP7WXGD8AAIA/RKsPPsZx3D5Eqw8+xnHcPkSrDz7Gcdw+RKsPPsZx3D6X0M4+HMdRP5fQzj4cx1E/l9DOPhzHUT+X0M4+HMdRP5fQzj4wFTw/l9DOPjAVPD+X0M4+MBU8P5fQzj4wFTw/AAAAPshx3D4AAAA+yHHcPgAAwD4cx1E/AADAPhzHUT94IcM+FCw/PwAAAD70+PA+eCHDPhQsPz+Y0M4+AABAP5jQzj4AAEA/mNDOPgAAQD+Y0M4+AABAPwAAwD4vFTw/RKsPPgAAAD8AAMA+LxU8P0SrDz4AAAA/LxVcP8hx3D4vFVw/yHHcPi8VXD/Icdw+LxVcP8hx3D60lxg/MBU8P7SXGD8wFTw/tJcYPzAVPD+0lxg/MBU8P7SXGD8cx1E/tJcYPxzHUT+0lxg/HMdRP7SXGD8cx1E/AAAgPy8VPD8vFVw/AAAAPwAAID8vFTw/LxVcPwAAAD9Ebx4/w8FDPypYXj8AAAA/RG8eP8PBQz+1lxg/AABAP7WXGD8AAEA/tZcYPwAAQD+1lxg/AABAP///Xz/Icdw+//9fP8hx3D4AACA/HMdRPwAAID8cx1E/Xyq4PjiOoz5fKrg+OI6jPl8quD44jqM+Xyq4PjiOoz6X0M4+Oo6jPpfQzj46jqM+l9DOPjqOoz6X0M4+Oo6jPpfQzj7AVHA+l9DOPsBUcD6X0M4+wFRwPpfQzj7AVHA+AADAPjiOoz4AAMA+OI6jPgAAwD44jqM+AADAPjiOoz5QFsI+yueDPlAWwj7K54M+UBbCPsrngz6Y0M4+AACAPpjQzj4AAIA+mNDOPgAAgD6Y0M4+AACAPjAVvD5gKng+MBW8PmAqeD4wFbw+YCp4PjAVvD5gKng+0uojPzqOoz7S6iM/Oo6jPtLqIz86jqM+0uojPzqOoz60lxg/wFRwPrSXGD/AVHA+tJcYP8BUcD60lxg/wFRwPrSXGD86jqM+tJcYPzqOoz60lxg/Oo6jPrSXGD86jqM+aPUhP2AqeD5o9SE/YCp4Pmj1IT9gKng+aPUhP2AqeD4fgh8/WgKFPh+CHz9aAoU+H4IfP1oChT61lxg/AACAPrWXGD8AAIA+tZcYPwAAgD61lxg/AACAPgAAID86jqM+AAAgPzqOoz4AACA/Oo6jPgAAID86jqM+Xiq4Pshx3D5eKrg+yHHcPl4quD7Icdw+Xiq4Pshx3D6X0M4+0eoDP5fQzj7R6gM/l9DOPtHqAz+X0M4+0eoDP5fQzj7Icdw+l9DOPshx3D6X0M4+yHHcPpfQzj7Icdw+MBW8Pmj1AT8wFbw+aPUBPzAVvD5o9QE/MBW8Pmj1AT/A+8A+pv36PsD7wD6m/fo+wPvAPqb9+j6Y0M4+AAAAP5jQzj4AAAA/mNDOPgAAAD+Y0M4+AAAAPwAAwD7Icdw+AADAPshx3D4AAMA+yHHcPgAAwD7Icdw+0uojP8Zx3D7S6iM/xnHcPtLqIz/Gcdw+0uojP8Zx3D6zlxg/yHHcPrOXGD/Icdw+s5cYP8hx3D6zlxg/yHHcPrSXGD/R6gM/tJcYP9HqAz+0lxg/0eoDP7SXGD/R6gM/AAAgP8hx3D4AACA/yHHcPgAAID/Icdw+AAAgP8hx3D7Y9B4/NBj8Ptj0Hj80GPw+2PQePzQY/D61lxg/AAAAP7WXGD8AAAA/tZcYPwAAAD+1lxg/AAAAP2j1IT9o9QE/aPUhP2j1AT9o9SE/aPUBP2j1IT9o9QE/AokMPkJ7iT4CiQw+QnuJPgKJDD5Ce4k+AokMPkJ7iT6ii+4+gJBIPKKL7j6AkEg8oovuPoCQSDyii+4+gJBIPKOL7j5fQns/o4vuPl9Cez+ji+4+X0J7P6OL7j5fQns/AADAPkCQSDwCiQw+AACAPgAAwD5AkEg8AokMPgAAgD4krNM+AAAAAEpMBT4AAIA+AADAPhD/fT+ki+4+AAAAAKSL7j4AAAAApIvuPgAAgD+ki+4+AACAPwAAAD5Ce4k+AAAAPkJ7iT4AAMA+X0J7PwAAwD5fQns/LroIP0CQSDwuugg/QJBIPC66CD9AkEg8LroIP0CQSDy/3Vw/QnuJPr/dXD9Ce4k+v91cP0J7iT6/3Vw/QnuJPi+6CD9fQns/L7oIP19Cez8vugg/X0J7Py+6CD9fQns/AAAgPwCQSDy/3Vw/AgCAPgAAID8AkEg8v91cPwIAgD4AACA/AImpOwAAYD/iAYQ+7SkWPwAAgD8AAGA/RHuJPgAAYD9Ee4k+AAAgP19Cez8AACA/X0J7Py66CD8AAAAALroIPwAAAAAuugg/AACAPy66CD8AAIA/AokMPryE9j4CiQw+vIT2PgKJDD68hPY+AokMPryE9j6ki+4+ob1EP6SL7j6hvUQ/pIvuPqG9RD+ki+4+ob1EP6OL7j7A3Tw/o4vuPsDdPD+ji+4+wN08P6OL7j7A3Tw/AAAAPr6E9j4AAAA+voT2PgAAwD6hvUQ/AADAPqG9RD8S1sk+d1Y/PwAAAD4g/vs+EtbJPndWPz+ki+4+AABAP6SL7j4AAEA/pIvuPgAAQD+ki+4+AABAPwAAwD7A3Tw/AYkMPgAAAD8AAMA+wN08PwGJDD4AAAA/v91cP7yE9j6/3Vw/vIT2Pr/dXD+8hPY+v91cP7yE9j4vugg/wN08Py+6CD/A3Tw/L7oIP8DdPD8vugg/wN08Py66CD+ivUQ/LroIP6K9RD8uugg/or1EPy66CD+ivUQ/AAAgP8DdPD+/3Vw/AAAAPwAAID/A3Tw/v91cPwAAAD/4FBs/eABBP+2sXj8AAAA/+BQbP3gAQT8uugg/AABAPy66CD8AAEA/LroIPwAAQD8uugg/AABAPwEAYD+8hPY+AQBgP7yE9j4AACA/ob1EPwAAID+hvUQ/gLu5PkJ7iT6Au7k+QnuJPoC7uT5Ce4k+gLu5PkJ7iT6ki+4+QHuJPqSL7j5Ae4k+pIvuPkB7iT6ki+4+QHuJPqOL7j4Ad3M+o4vuPgB3cz6ji+4+AHdzPqOL7j4Ad3M+AADAPkR7iT4AAMA+RHuJPgAAwD5Ee4k+AADAPkR7iT63jsY+6nOAPreOxj7qc4A+t47GPupzgD6ki+4+AACAPqSL7j4AAIA+pIvuPgAAgD6ki+4+AACAPsDdvD6Au3k+wN28PoC7eT7A3bw+gLt5PsDdvD6Au3k+QCIjP0J7iT5AIiM/QnuJPkAiIz9Ce4k+QCIjP0J7iT4vugg/AHdzPi+6CD8Ad3M+L7oIPwB3cz4vugg/AHdzPi66CD9Ee4k+LroIP0R7iT4uugg/RHuJPi66CD9Ee4k+IJEhP4C7eT4gkSE/gLt5PiCRIT+Au3k+IJEhP4C7eT6sKR0/9FWBPqwpHT/0VYE+rCkdP/RVgT4uugg/AACAPi66CD8AAIA+LroIPwAAgD4uugg/AACAPgAAID9Ee4k+AAAgP0R7iT4AACA/RHuJPgAAID9Ee4k+gLu5PryE9j6Au7k+vIT2PoC7uT68hPY+gLu5PryE9j6ii+4+QSIDP6KL7j5BIgM/oovuPkEiAz+ii+4+QSIDP6OL7j6+hPY+o4vuPr6E9j6ji+4+voT2PqOL7j6+hPY+wN28PiCRAT/A3bw+IJEBP8DdvD4gkQE/wN28PiCRAT+rrMU+Cqr+PqusxT4Kqv4+q6zFPgqq/j6ji+4+AAAAP6OL7j4AAAA/o4vuPgAAAD+ji+4+AAAAPwAAwD68hPY+AADAPryE9j4AAMA+vIT2PgAAwD68hPY+QCIjP7yE9j5AIiM/vIT2PkAiIz+8hPY+QCIjP7yE9j4vugg/voT2Pi+6CD++hPY+L7oIP76E9j4vugg/voT2Pi66CD9BIgM/LroIP0EiAz8uugg/QSIDPy66CD9BIgM/AAAgP76E9j4AACA/voT2PgAAID++hPY+AAAgP76E9j6kuBw/Foz/PqS4HD8WjP8+pLgcPxaM/z4uugg/AAAAPy66CD8AAAA/LroIPwAAAD8uugg/AAAAPyCRIT8gkQE/IJEhPyCRAT8gkSE/IJEBPyCRIT8gkQE/RKsPPjqOoz5Eqw8+Oo6jPkSrDz46jqM+RKsPPjqOoz6X0M4+gLR6PJfQzj6AtHo8l9DOPoC0ejyX0M4+gLR6PJfQzj7kOG4/l9DOPuQ4bj+X0M4+5DhuP5fQzj7kOG4/AADAPgC0ejxDqw8+AACAPgAAwD4AtHo8Q6sPPgAAgD7wQsY+AAAAAFyfBj4AAIA+AADAPnp8eD+Y0M4+AAAAAJjQzj4AAAAAmNDOPgAAgD+Y0M4+AACAPwAAAD46jqM+AAAAPjqOoz4AAMA+5DhuPwAAwD7kOG4/tJcYP4C0ejy0lxg/gLR6PLSXGD+AtHo8tJcYP4C0ejwwFVw/OI6jPjAVXD84jqM+MBVcPziOoz4wFVw/OI6jPrOXGD/kOG4/s5cYP+Q4bj+zlxg/5DhuP7OXGD/kOG4/AAAgP0C0ejwvFVw/AACAPgAAID9AtHo8LxVcPwAAgD4AACA/gOvTOwAAYD8MB48+h94cPwAAgD8AAGA/OI6jPgAAYD84jqM+AAAgP+Q4bj8AACA/5DhuP7SXGD8AAAAAtJcYPwAAAAC1lxg/AACAP7WXGD8AAIA/RKsPPsZx3D5Eqw8+xnHcPkSrDz7Gcdw+RKsPPsZx3D6X0M4+HMdRP5fQzj4cx1E/l9DOPhzHUT+X0M4+HMdRP5fQzj4wFTw/l9DOPjAVPD+X0M4+MBU8P5fQzj4wFTw/AAAAPshx3D4AAAA+yHHcPgAAwD4cx1E/AADAPhzHUT94IcM+FCw/PwAAAD70+PA+eCHDPhQsPz+Y0M4+AABAP5jQzj4AAEA/mNDOPgAAQD+Y0M4+AABAPwAAwD4vFTw/RKsPPgAAAD8AAMA+LxU8P0SrDz4AAAA/LxVcP8hx3D4vFVw/yHHcPi8VXD/Icdw+LxVcP8hx3D60lxg/MBU8P7SXGD8wFTw/tJcYPzAVPD+0lxg/MBU8P7SXGD8cx1E/tJcYPxzHUT+0lxg/HMdRP7SXGD8cx1E/AAAgPy8VPD8vFVw/AAAAPwAAID8vFTw/LxVcPwAAAD9Ebx4/w8FDPypYXj8AAAA/RG8eP8PBQz+1lxg/AABAP7WXGD8AAEA/tZcYPwAAQD+1lxg/AABAP///Xz/Icdw+//9fP8hx3D4AACA/HMdRPwAAID8cx1E/Xyq4PjiOoz5fKrg+OI6jPl8quD44jqM+Xyq4PjiOoz6X0M4+Oo6jPpfQzj46jqM+l9DOPjqOoz6X0M4+Oo6jPpfQzj7AVHA+l9DOPsBUcD6X0M4+wFRwPpfQzj7AVHA+AADAPjiOoz4AAMA+OI6jPgAAwD44jqM+AADAPjiOoz5QFsI+yueDPlAWwj7K54M+UBbCPsrngz6Y0M4+AACAPpjQzj4AAIA+mNDOPgAAgD6Y0M4+AACAPjAVvD5gKng+MBW8PmAqeD4wFbw+YCp4PjAVvD5gKng+0uojPzqOoz7S6iM/Oo6jPtLqIz86jqM+0uojPzqOoz60lxg/wFRwPrSXGD/AVHA+tJcYP8BUcD60lxg/wFRwPrSXGD86jqM+tJcYPzqOoz60lxg/Oo6jPrSXGD86jqM+aPUhP2AqeD5o9SE/YCp4Pmj1IT9gKng+aPUhP2AqeD4fgh8/WgKFPh+CHz9aAoU+H4IfP1oChT61lxg/AACAPrWXGD8AAIA+tZcYPwAAgD61lxg/AACAPgAAID84jqM+AAAgPziOoz4AACA/OI6jPgAAID84jqM+Xiq4Pshx3D5eKrg+yHHcPl4quD7Icdw+Xiq4Pshx3D6X0M4+0eoDP5fQzj7R6gM/l9DOPtHqAz+X0M4+0eoDP5fQzj7Icdw+l9DOPshx3D6X0M4+yHHcPpfQzj7Icdw+MBW8Pmj1AT8wFbw+aPUBPzAVvD5o9QE/MBW8Pmj1AT/A+8A+pv36PsD7wD6m/fo+wPvAPqb9+j6Y0M4+AAAAP5jQzj4AAAA/mNDOPgAAAD+Y0M4+AAAAPwAAwD7Icdw+AADAPshx3D4AAMA+yHHcPgAAwD7Icdw+0uojP8Zx3D7S6iM/xnHcPtLqIz/Gcdw+0uojP8Zx3D6zlxg/yHHcPrOXGD/Icdw+s5cYP8hx3D6zlxg/yHHcPrSXGD/R6gM/tJcYP9HqAz+0lxg/0eoDP7SXGD/R6gM/AAAgP8hx3D4AACA/yHHcPgAAID/Icdw+AAAgP8hx3D7Y9B4/NBj8Ptj0Hj80GPw+2PQePzQY/D61lxg/AAAAP7WXGD8AAAA/tZcYPwAAAD+1lxg/AAAAP2j1IT9o9QE/aPUhP2j1AT9o9SE/aPUBP2j1IT9o9QE/AokMPkJ7iT4CiQw+QnuJPgKJDD5Ce4k+AokMPkJ7iT6ii+4+gJBIPKKL7j6AkEg8oovuPoCQSDyii+4+gJBIPKOL7j5fQns/o4vuPl9Cez+ji+4+X0J7P6OL7j5fQns/AADAPkCQSDwCiQw+AACAPgAAwD5AkEg8AokMPgAAgD4krNM+AAAAAEpMBT4AAIA+AADAPhD/fT+ki+4+AAAAAKSL7j4AAAAApIvuPgAAgD+ki+4+AACAPwAAAD5Ce4k+AAAAPkJ7iT4AAMA+X0J7PwAAwD5fQns/LroIP0CQSDwuugg/QJBIPC66CD9AkEg8LroIP0CQSDy/3Vw/QnuJPr/dXD9Ce4k+v91cP0J7iT6/3Vw/QnuJPi+6CD9fQns/L7oIP19Cez8vugg/X0J7Py+6CD9fQns/AAAgPwCQSDy/3Vw/AgCAPgAAID8AkEg8v91cPwIAgD4AACA/AImpOwAAYD/iAYQ+7SkWPwAAgD8AAGA/RHuJPgAAYD9Ee4k+AAAgP19Cez8AACA/X0J7Py66CD8AAAAALroIPwAAAAAuugg/AACAPy66CD8AAIA/AokMPryE9j4CiQw+vIT2PgKJDD68hPY+AokMPryE9j6ki+4+ob1EP6SL7j6hvUQ/pIvuPqG9RD+ki+4+ob1EP6OL7j7A3Tw/o4vuPsDdPD+ji+4+wN08P6OL7j7A3Tw/AAAAPr6E9j4AAAA+voT2PgAAwD6hvUQ/AADAPqG9RD8S1sk+d1Y/PwAAAD4g/vs+EtbJPndWPz+ki+4+AABAP6SL7j4AAEA/pIvuPgAAQD+ki+4+AABAPwAAwD7A3Tw/AYkMPgAAAD8AAMA+wN08PwGJDD4AAAA/v91cP7yE9j6/3Vw/vIT2Pr/dXD+8hPY+v91cP7yE9j4vugg/wN08Py+6CD/A3Tw/L7oIP8DdPD8vugg/wN08Py66CD+ivUQ/LroIP6K9RD8uugg/or1EPy66CD+ivUQ/AAAgP8DdPD+/3Vw/AAAAPwAAID/A3Tw/v91cPwAAAD/4FBs/eABBP+2sXj8AAAA/+BQbP3gAQT8uugg/AABAPy66CD8AAEA/LroIPwAAQD8uugg/AABAPwEAYD+8hPY+AQBgP7yE9j4AACA/ob1EPwAAID+hvUQ/gLu5PkJ7iT6Au7k+QnuJPoC7uT5Ce4k+gLu5PkJ7iT6ki+4+QHuJPqSL7j5Ae4k+pIvuPkB7iT6ki+4+QHuJPqOL7j4Ad3M+o4vuPgB3cz6ji+4+AHdzPqOL7j4Ad3M+AADAPkR7iT4AAMA+RHuJPgAAwD5Ee4k+AADAPkR7iT63jsY+6nOAPreOxj7qc4A+t47GPupzgD6ki+4+AACAPqSL7j4AAIA+pIvuPgAAgD6ki+4+AACAPsDdvD6Au3k+wN28PoC7eT7A3bw+gLt5PsDdvD6Au3k+QCIjP0J7iT5AIiM/QnuJPkAiIz9Ce4k+QCIjP0J7iT4vugg/AHdzPi+6CD8Ad3M+L7oIPwB3cz4vugg/AHdzPi66CD9Ee4k+LroIP0R7iT4uugg/RHuJPi66CD9Ee4k+IJEhP4C7eT4gkSE/gLt5PiCRIT+Au3k+IJEhP4C7eT6sKR0/9FWBPqwpHT/0VYE+rCkdP/RVgT4uugg/AACAPi66CD8AAIA+LroIPwAAgD4uugg/AACAPgAAID9Ee4k+AAAgP0R7iT4AACA/RHuJPgAAID9Ee4k+gLu5PryE9j6Au7k+vIT2PoC7uT68hPY+gLu5PryE9j6ii+4+QSIDP6KL7j5BIgM/oovuPkEiAz+ii+4+QSIDP6OL7j6+hPY+o4vuPr6E9j6ji+4+voT2PqOL7j6+hPY+wN28PiCRAT/A3bw+IJEBP8DdvD4gkQE/wN28PiCRAT+rrMU+Cqr+PqusxT4Kqv4+q6zFPgqq/j6ji+4+AAAAP6OL7j4AAAA/o4vuPgAAAD+ji+4+AAAAPwAAwD68hPY+AADAPryE9j4AAMA+vIT2PgAAwD68hPY+QCIjP7yE9j5AIiM/vIT2PkAiIz+8hPY+QCIjP7yE9j4vugg/voT2Pi+6CD++hPY+L7oIP76E9j4vugg/voT2Pi66CD9BIgM/LroIP0EiAz8uugg/QSIDPy66CD9BIgM/AAAgP76E9j4AACA/voT2PgAAID++hPY+AAAgP76E9j6kuBw/Foz/PqS4HD8WjP8+pLgcPxaM/z4uugg/AAAAPy66CD8AAAA/LroIPwAAAD8uugg/AAAAPyCRIT8gkQE/IJEhPyCRAT8gkSE/IJEBPyCRIT8gkQE/0UUXPgIAoD7RRRc+AgCgPtFFFz4CAKA+0UUXPgIAoD5IkuQ+oC66PEiS5D6gLro8SJLkPqAuujxIkuQ+oC66PEqS5D4AAHA/SpLkPgAAcD9KkuQ+AABwP0qS5D4AAHA/AADAPoAuujzQRRc+AACAPgAAwD6ALro80EUXPgAAgD74dM8+AAAAABLWCT4AAIA+AADAPtQ8eT9KkuQ+AAAAAEqS5D4AAAAASZLkPgAAgD9JkuQ+AACAPwAAAD4AAKA+AAAAPgAAoD4AAMA+AABwPwAAwD4AAHA/27YNP4Auujzbtg0/gC66PNu2DT+ALro827YNP4AuujyLLlo/AgCgPosuWj8CAKA+iy5aPwIAoD6LLlo/AgCgPtu2DT8AAHA/27YNPwAAcD/btg0/AABwP9u2DT8AAHA/AAAgP4AuujyMLlo/AACAPgAAID+ALro8jC5aPwAAgD4AACA/QGEdPAAAYD9aho0+hEUYPwAAgD8AAGA/AACgPgAAYD8AAKA+AAAgPwAAcD8AACA/AABwP9u2DT8AAAAA27YNPwAAAADbtg0/AACAP9u2DT8AAIA/0UUXPgAA4D7RRRc+AADgPtFFFz4AAOA+0UUXPgAA4D5KkuQ+AABQP0qS5D4AAFA/SpLkPgAAUD9KkuQ+AABQP0iS5D6MLjo/SJLkPowuOj9IkuQ+jC46P0iS5D6MLjo/AAAAPgAA4D4AAAA+AADgPgAAwD4AAFA/AADAPgAAUD98usc+PsU+PwAAAD6oefI+fLrHPj7FPj9KkuQ+AABAP0qS5D4AAEA/SpLkPgAAQD9KkuQ+AABAPwAAwD6MLjo/0EUXPgAAAD8AAMA+jC46P9BFFz4AAAA/jC5aP/7/3z6MLlo//v/fPowuWj/+/98+jC5aP/7/3z7ctg0/jC46P9y2DT+MLjo/3LYNP4wuOj/ctg0/jC46P9y2DT8AAFA/3LYNPwAAUD/ctg0/AABQP9y2DT8AAFA///8fP4wuOj+MLlo/AAAAP///Hz+MLjo/jC5aPwAAAD/CIhw/lmFDP3uKXT8AAAA/wiIcP5ZhQz/ctg0/AABAP9y2DT8AAEA/3LYNPwAAQD/ctg0/AABAPwAAYD8AAOA+AABgPwAA4D4AACA/AABQPwAAID8AAFA/F120PgIAoD4XXbQ+AgCgPhddtD4CAKA+F120PgIAoD5KkuQ+AACgPkqS5D4AAKA+SpLkPgAAoD5KkuQ+AACgPkiS5D40umg+SJLkPjS6aD5IkuQ+NLpoPkiS5D40umg+AADAPgAAoD4AAMA+AACgPgAAwD4AAKA+AADAPgAAoD7+JsU+cN6CPv4mxT5w3oI+/ibFPnDegj5KkuQ+AACAPkqS5D4AAIA+SpLkPgAAgD5KkuQ+AACAPowuuj4YXXQ+jC66PhhddD6MLro+GF10Powuuj4YXXQ+dNElPwIAoD500SU/AgCgPnTRJT8CAKA+dNElPwIAoD7ctg0/LLpoPty2DT8sumg+3LYNPyy6aD7ctg0/LLpoPty2DT8AAKA+3LYNPwAAoD7ctg0/AACgPty2DT8AAKA+uugiPxhddD666CI/GF10PrroIj8YXXQ+uugiPxhddD5YPh4/HIKEPlg+Hj8cgoQ+WD4ePxyChD7ctg0/AACAPty2DT8AAIA+3LYNPwAAgD7ctg0/AACAPgAAID8AAKA+AAAgPwAAoD4AACA/AACgPgAAID8AAKA+GF20Pv7/3z4YXbQ+/v/fPhhdtD7+/98+GF20Pv7/3z5IkuQ+dNEFP0iS5D500QU/SJLkPnTRBT9IkuQ+dNEFP0qS5D4AAOA+SpLkPgAA4D5KkuQ+AADgPkqS5D4AAOA+jC66PrroAj+MLro+uugCP4wuuj666AI/jC66PrroAj9Qg8M+4n37PlCDwz7iffs+UIPDPuJ9+z5KkuQ+AAAAP0qS5D4AAAA/SpLkPgAAAD9KkuQ+AAAAPwAAwD4AAOA+AADAPgAA4D4AAMA+AADgPgAAwD4AAOA+dNElPwAA4D500SU/AADgPnTRJT8AAOA+dNElPwAA4D7btg0//v/fPtu2DT/+/98+27YNP/7/3z7btg0//v/fPtu2DT900QU/27YNP3TRBT/btg0/dNEFP9u2DT900QU/AAAgPwAA4D4AACA/AADgPgAAID8AAOA+AAAgPwAA4D6CbB0/kCH9PoJsHT+QIf0+gmwdP5Ah/T7ctg0/AAAAP9y2DT8AAAA/3LYNPwAAAD/ctg0/AAAAP7roIj+66AI/uugiP7roAj+66CI/uugCP7roIj+66AI/AAAAAAAAAAAAAAAAAACAPwAAAABVVVU/AAAAAKqqKj8AAAAAAAAAPwAAAACqqqo+AAAAAKyqKj4AAIA/AAAAAAAAgD8AAIA/AACAP1VVVT8AAIA/qqoqPwAAgD8AAAA/AACAP6qqqj4AAIA/rKoqPgAAAAAAAAAAAAAAAAAAgD8AAAAAVVVVPwAAAACqqio/AAAAAAAAAD8AAAAAqqqqPgAAAACsqio+AACAPwAAAAAAAIA/AACAPwAAgD9VVVU/AACAP6qqKj8AAIA/AAAAPwAAgD+qqqo+AACAP6yqKj4AAAAAAAAAAAAAAAAAAIA/AAAAAFVVVT8AAAAAqqoqPwAAAAAAAAA/AAAAAKqqqj4AAAAArKoqPgAAgD8AAAAAAACAPwAAgD8AAIA/VVVVPwAAgD+qqio/AACAPwAAAD8AAIA/qqqqPgAAgD+sqio+AAAAAAAAAAAAAAAAAACAPwAAAABVVVU/AAAAAKqqKj8AAAAAAAAAPwAAAACqqqo+AAAAAKyqKj4AAIA/AAAAAAAAgD8AAIA/AACAP1VVVT8AAIA/qqoqPwAAgD8AAAA/AACAP6qqqj4AAIA/rKoqPgAAAAAAAAAAAAAAAAAAgD8AAAAAVVVVPwAAAACqqio/AAAAAAAAAD8AAAAAqqqqPgAAAACsqio+AACAPwAAAAAAAIA/AACAPwAAgD9VVVU/AACAP6qqKj8AAIA/AAAAPwAAgD+qqqo+AACAP6yqKj4AAAAAAAAAAAAAAAAAAIA/AAAAAFVVVT8AAAAAqqoqPwAAAAAAAAA/AAAAAKqqqj4AAAAArKoqPgAAgD8AAAAAAACAPwAAgD8AAIA/VVVVPwAAgD+qqio/AACAPwAAAD8AAIA/qqqqPgAAgD+sqio+AgAPABEAAgARABcABgATABAABgAQAA4ACAAZABIACAASABUAHQApACsAHQArADIAIQAuACwAIQAsACoAIwA0AC0AIwAtADAAOABCAEcAOABHAFAAOgBLAEgAOgBIAEQAQABPAEYAQABGAEkAUwBgAGIAUwBiAGgAVwBkAGEAVwBhAF8AWQBqAGMAWQBjAGYAbgB4AH0AbgB9AIYAcACBAH4AcAB+AHoAdgCFAHwAdgB8AH8AiQCWAJgAiQCYAJ4AjQCaAJcAjQCXAJUAjwCgAJkAjwCZAJwApACxALMApACzALkAqAC1ALIAqACyALAAqgC7ALQAqgC0ALcAvwDJAM4AvwDOANcAwQDSAM8AwQDPAMsAxwDWAM0AxwDNANAAOQADABgAOQAYAEMARQAaAAoARQAKADwABwAeADMABwAzABQAFgA1ACQAFgAkAAkAIgBUAGkAIgBpAC8AMQBrAFsAMQBbACUAWABBAEoAWABKAGUAZwBMADsAZwA7AFoAogA2AE4AogBOAK8ArgBNAD8ArgA/AKcAUQC9ANUAUQDVAF4AXQDUAMYAXQDGAFYAwgCrALgAwgC4ANMA0QC2AKkA0QCpAMgAbwClALoAbwC6AHkAewC8AKwAewCsAHIAwACKAJ8AwACfAMoAzAChAJEAzACRAMMAjgB3AIAAjgCAAJsAnQCCAHEAnQBxAJAAAABsAIQAAACEAA0ADACDAHUADAB1AAUAhwAfACgAhwAoAJQAkwAnABwAkwAcAIwANwCjAG0ANwBtAAEACwAmAFwACwBcAD0AdACLABsAdAAbAAQAvgBSACAAvgAgAIgAPgBVAMUAPgDFAKYArQDEAJIArQCSAHMA2gDnAOkA2gDpAO8A3gDrAOgA3gDoAOYA4ADxAOoA4ADqAO0A9QABAQMB9QADAQoB+QAGAQQB+QAEAQIB+wAMAQUB+wAFAQgBEAEaAR8BEAEfASgBEgEjASABEgEgARwBGAEnAR4BGAEeASEBKwE4AToBKwE6AUABLwE8ATkBLwE5ATcBMQFCATsBMQE7AT4BRgFQAVUBRgFVAV4BSAFZAVYBSAFWAVIBTgFdAVQBTgFUAVcBYQFuAXABYQFwAXYBZQFyAW8BZQFvAW0BZwF4AXEBZwFxAXQBfAGJAYsBfAGLAZEBgAGNAYoBgAGKAYgBggGTAYwBggGMAY8BlwGhAaYBlwGmAa8BmQGqAacBmQGnAaMBnwGuAaUBnwGlAagBEQHbAPAAEQHwABsBHQHyAOIAHQHiABQB3wD2AAsB3wALAewA7gANAfwA7gD8AOEA+gAsAUEB+gBBAQcBCQFDATMBCQEzAf0AMAEZASIBMAEiAT0BPwEkARMBPwETATIBegEOASYBegEmAYcBhgElARcBhgEXAX8BKQGVAa0BKQGtATYBNQGsAZ4BNQGeAS4BmgGDAZABmgGQAasBqQGOAYEBqQGBAaABRwF9AZIBRwGSAVEBUwGUAYQBUwGEAUoBmAFiAXcBmAF3AaIBpAF5AWkBpAFpAZsBZgFPAVgBZgFYAXMBdQFaAUkBdQFJAWgB2ABEAVwB2ABcAeUA5ABbAU0B5ABNAd0AXwH3AAABXwEAAWwBawH/APQAawH0AGQBDwF7AUUBDwFFAdkA4wD+ADQB4wA0ARUBTAFjAfMATAHzANwAlgEqAfgAlgH4AGABFgEtAZ0BFgGdAX4BhQGcAWoBhQFqAUsBsgG/AcEBsgHBAccBtgHDAcABtgHAAb4BuAHJAcIBuAHCAcUBzQHZAdsBzQHbAeIB0QHeAdwB0QHcAdoB0wHkAd0B0wHdAeAB6AHyAfcB6AH3AQAC6gH7AfgB6gH4AfQB8AH/AfYB8AH2AfkBAwIQAhICAwISAhgCBwIUAhECBwIRAg8CCQIaAhMCCQITAhYCHgIoAi0CHgItAjYCIAIxAi4CIAIuAioCJgI1AiwCJgIsAi8COQJGAkgCOQJIAk4CPQJKAkcCPQJHAkUCPwJQAkkCPwJJAkwCVAJhAmMCVAJjAmkCWAJlAmICWAJiAmACWgJrAmQCWgJkAmcCbwJ5An4CbwJ+AocCcQKCAn8CcQJ/AnsCdwKGAn0CdwJ9AoAC6QGzAcgB6QHIAfMB9QHKAboB9QG6AewBtwHOAeMBtwHjAcQBxgHlAdQBxgHUAbkB0gEEAhkC0gEZAt8B4QEbAgsC4QELAtUBCALxAfoBCAL6ARUCFwL8AesBFwLrAQoCUgLmAf4BUgL+AV8CXgL9Ae8BXgLvAVcCAQJtAoUCAQKFAg4CDQKEAnYCDQJ2AgYCcgJbAmgCcgJoAoMCgQJmAlkCgQJZAngCHwJVAmoCHwJqAikCKwJsAlwCKwJcAiICcAI6Ak8CcAJPAnoCfAJRAkECfAJBAnMCPgInAjACPgIwAksCTQIyAiECTQIhAkACsAEcAjQCsAE0Ar0BvAEzAiUCvAElArUBNwLPAdgBNwLYAUQCQwLXAcwBQwLMATwC5wFTAh0C5wEdArEBuwHWAQwCuwEMAu0BJAI7AssBJALLAbQBbgICAtABbgLQATgC7gEFAnUC7gF1AlYCXQJ0AkICXQJCAiMCigKXApkCigKZAp8CjgKbApgCjgKYApYCkAKhApoCkAKaAp0CpQKxArMCpQKzAroCqQK2ArQCqQK0ArICqwK8ArUCqwK1ArgCwALKAs8CwALPAtgCwgLTAtACwgLQAswCyALXAs4CyALOAtEC2wLoAuoC2wLqAvAC3wLsAukC3wLpAucC4QLyAusC4QLrAu4C9gIAAwUD9gIFAw4D+AIJAwYD+AIGAwID/gINAwQD/gIEAwcDEQMeAyADEQMgAyYDFQMiAx8DFQMfAx0DFwMoAyEDFwMhAyQDLAM5AzsDLAM7A0EDMAM9AzoDMAM6AzgDMgNDAzwDMgM8Az8DRwNRA1YDRwNWA18DSQNaA1cDSQNXA1MDTwNeA1UDTwNVA1gDwQKLAqACwQKgAssCzQKiApICzQKSAsQCjwKmArsCjwK7ApwCngK9AqwCngKsApECqgLcAvECqgLxArcCuQLzAuMCuQLjAq0C4ALJAtIC4ALSAu0C7wLUAsMC7wLDAuICKgO+AtYCKgPWAjcDNgPVAscCNgPHAi8D2QJFA10D2QJdA+YC5QJcA04D5QJOA94CSgMzA0ADSgNAA1sDWQM+AzEDWQMxA1AD9wItA0ID9wJCAwEDAwNEAzQDAwM0A/oCSAMSAycDSAMnA1IDVAMpAxkDVAMZA0sDFgP/AggDFgMIAyMDJQMKA/kCJQP5AhgDiAL0AgwDiAIMA5UClAILA/0ClAL9Ao0CDwOnArACDwOwAhwDGwOvAqQCGwOkAhQDvwIrA/UCvwL1AokCkwKuAuQCkwLkAsUC/AITA6MC/AKjAowCRgPaAqgCRgOoAhADxgLdAk0DxgJNAy4DNQNMAxoDNQMaA/sCYgNvA3EDYgNxA3cDZgNzA3ADZgNwA24DaAN5A3IDaANyA3UDfQOJA4sDfQOLA5IDgQOOA4wDgQOMA4oDgwOUA40DgwONA5ADmAOiA6cDmAOnA7ADmgOrA6gDmgOoA6QDoAOvA6YDoAOmA6kDswPAA8IDswPCA8gDtwPEA8EDtwPBA78DuQPKA8MDuQPDA8YDzgPYA90DzgPdA+YD0APhA94D0APeA9oD1gPlA9wD1gPcA98D6QP2A/gD6QP4A/4D7QP6A/cD7QP3A/UD7wMABPkD7wP5A/wDBAQRBBMEBAQTBBkECAQVBBIECAQSBBAECgQbBBQECgQUBBcEHwQpBC4EHwQuBDcEIQQyBC8EIQQvBCsEJwQ2BC0EJwQtBDAEmQNjA3gDmQN4A6MDpQN6A2oDpQNqA5wDZwN+A5MDZwOTA3QDdgOVA4QDdgOEA2kDggO0A8kDggPJA48DkQPLA7sDkQO7A4UDuAOhA6oDuAOqA8UDxwOsA5sDxwObA7oDAgSWA64DAgSuAw8EDgStA58DDgSfAwcEsQMdBDUEsQM1BL4DvQM0BCYEvQMmBLYDIgQLBBgEIgQYBDMEMQQWBAkEMQQJBCgEzwMFBBoEzwMaBNkD2wMcBAwE2wMMBNIDIATqA/8DIAT/AyoELAQBBPEDLATxAyME7gPXA+AD7gPgA/sD/QPiA9ED/QPRA/ADYAPMA+QDYAPkA20DbAPjA9UDbAPVA2UD5wN/A4gD5wOIA/QD8wOHA3wD8wN8A+wDlwMDBM0DlwPNA2EDawOGA7wDawO8A50D1APrA3sD1AN7A2QDHgSyA4ADHgSAA+gDngO1AyUEngMlBAYEDQQkBPIDDQTyA9MDOgRHBEkEOgRJBE8EPgRLBEgEPgRIBEYEQARRBEoEQARKBE0EVQRhBGMEVQRjBGoEWQRmBGQEWQRkBGIEWwRsBGUEWwRlBGgEcAR6BH8EcAR/BIgEcgSDBIAEcgSABHwEeASHBH4EeAR+BIEEiwSYBJoEiwSaBKAEjwScBJkEjwSZBJcEkQSiBJsEkQSbBJ4EpgSwBLUEpgS1BL4EqAS5BLYEqAS2BLIErgS9BLQErgS0BLcEwQTOBNAEwQTQBNYExQTSBM8ExQTPBM0ExwTYBNEExwTRBNQE3ATpBOsE3ATrBPEE4ATtBOoE4ATqBOgE4gTzBOwE4gTsBO8E9wQBBQYF9wQGBQ8F+QQKBQcF+QQHBQMF/wQOBQUF/wQFBQgFcQQ7BFAEcQRQBHsEfQRSBEIEfQRCBHQEPwRWBGsEPwRrBEwETgRtBFwETgRcBEEEWgSMBKEEWgShBGcEaQSjBJMEaQSTBF0EkAR5BIIEkASCBJ0EnwSEBHMEnwRzBJIE2gRuBIYE2gSGBOcE5gSFBHcE5gR3BN8EiQT1BA0FiQQNBZYElQQMBf4ElQT+BI4E+gTjBPAE+gTwBAsFCQXuBOEECQXhBAAFpwTdBPIEpwTyBLEEswT0BOQEswTkBKoE+ATCBNcE+ATXBAIFBAXZBMkEBAXJBPsExgSvBLgExgS4BNME1QS6BKkE1QSpBMgEOASkBLwEOAS8BEUERAS7BK0ERAStBD0EvwRXBGAEvwRgBMwEywRfBFQEywRUBMQEbwTbBKUEbwSlBDkEQwReBJQEQwSUBHUErATDBFMErARTBDwE9gSKBFgE9gRYBMAEdgSNBP0EdgT9BN4E5QT8BMoE5QTKBKsEEAUXBR0FEAUdBRYFEgUZBRgFEgUYBREFEwUaBRkFEwUZBRIFFAUbBRoFFAUaBRMFFQUcBRsFFQUbBRQFFgUdBRwFFgUcBRUFHgUlBSsFHgUrBSQFIAUnBSYFIAUmBR8FIQUoBScFIQUnBSAFIgUpBSgFIgUoBSEFIwUqBSkFIwUpBSIFJAUrBSoFJAUqBSMFLAUzBTkFLAU5BTIFLgU1BTQFLgU0BS0FLwU2BTUFLwU1BS4FMAU3BTYFMAU2BS8FMQU4BTcFMQU3BTAFMgU5BTgFMgU4BTEFOgVBBUcFOgVHBUAFPAVDBUIFPAVCBTsFPQVEBUMFPQVDBTwFPgVFBUQFPgVEBT0FPwVGBUUFPwVFBT4FQAVHBUYFQAVGBT8FSAVPBVUFSAVVBU4FSgVRBVAFSgVQBUkFSwVSBVEFSwVRBUoFTAVTBVIFTAVSBUsFTQVUBVMFTQVTBUwFTgVVBVQFTgVUBU0FVgVdBWMFVgVjBVwFWAVfBV4FWAVeBVcFWQVgBV8FWQVfBVgFWgVhBWAFWgVgBVkFWwViBWEFWwVhBVoFXAVjBWIFXAViBVsFAAAAAOKDnj4xuyfAA6XyPexykj4xuyfAoyxgPp0sYD4xuyfA73KSPvik8j0xuyfA5YOePkCutrMwuyfA73KSPg+l8r0wuyfAoyxgPqksYL4wuyfAA6XyPfJykr4wuyfANtouJOiDnr4wuyfAA6XyvfJykr4wuyfAoyxgvqksYL4wuyfA73KSvg+l8r0wuyfA5YOevkCutrMwuyfA73KSvvik8j0xuyfAoyxgvp0sYD4xuyfAA6Xyvexykj4xuyfANtqupOKDnj4xuyfAAAAAAM8Qxz7wyQPAtFsYPqbptz7wyQPA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AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/T1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAkBN2Pi70MDyge3i/kBN2Pi70MDyge3i/kBN2Pi70MDyge3i/kBN2Pi70MDyge3i/kBN2Pi70MDyge3i/kBN2Pi70MDyge3i/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AAAAAAp5c7/JM56+AAAAAAp5c7/JM54+AAAAAEJ6Fr/lGk8/AAAAAAAAAAAAAIA/AACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAEJ6Fj/lGk8/AAAAAAp5cz/JM54+AAAAAAp5cz/JM56+AAAAAEJ6Fj/lGk+/AAAAAAAAAAAAAIC/AAAAAEJ6Fr/lGk+/AAAAAAp5c7/JM56+AAAAAAp5c7/JM54+AAAAAEJ6Fr/lGk8/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAEJ6Fj/lGk8/AAAAAAp5cz/JM54+AAAAAAp5cz/JM56+AAAAAEJ6Fj/lGk+/AAAAAAAAAAAAAIC/AAAAAEJ6Fr/lGk+/AAAAAAp5c7/JM56+AAAAAAp5c7/JM54+AAAAAEJ6Fr/lGk8/AAAAAAAAAAAAAIA/AACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAA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vgC/AMAAwQDCAMMAxADFAMYAxwDIAMkAygDLAMwAzQDOAM8A0ADRANIA0wDUANUA1gDXANgA2QDaANsA3ADdAN4A3wDgAOEA4gDjAOQA5QDmAOcA6ADpAOoA6wDsAO0A7gDvAPAA8QDyAPMA9AD1APYA9wD4APkA+gD7APwA/QD+AP8AAAEBAQIBAwEEAQUBBgEHAQgBCQEKAQsBDAENAQ4BDwEQAREBEgETARQBFQEWARcBGAEZARoBGwEcAR0BHgEfASABIQEiASMBJAElASYBJwEoASkBKgErASwBLQEuAS8BMAExATIBMwE0ATUBNgE3ATgBOQE6ATsBPAE9AT4BPwFAAUEBQgFDAUQBRQFGAUcBSAFJAUoBSwFMAU0BTgFPAVABUQFSAVMBVAFVAVYBVwFYAVkBWgFbAVwBXQFeAV8BYAFhAWIBYwFkAWUBZgFnAWgBaQFqAWsBbAFtAW4BbwFwAXEBcgFzAXQBdQF2AXcBeAF5AXoBewF8AX0BfgF/AYABgQGCAYMBhAGFAYYBhwGIAYkBigGLAYwBjQGOAY8BkAGRAZIBkwGUAZUBlgGXAZgBmQGaAZsBnAGdAZ4BnwGgAaEBogGjAaQBpQGmAacBqAGzAakBswG0AakBqQG0AaoBtAG1AaoBqgG1AasBtQG2AasBqwG2AawBtgG3AawBrAG3Aa0BtwG4Aa0BrQG4Aa4BuAG5Aa4BrgG5Aa8BuQG6Aa8BrwG6AbABugG7AbABsAG7AbEBuwG8AbEBsQG8AbIBvAG9AbIByAHJAb4ByQHKAb8BygHLAcABywHMAcEBzAHNAcIBzQHOAcMBzgHPAcQBzwHQAcUB0AHRAcYB0QHSAccB3gHdAdMB3wHeAdQB4AHfAdUB4QHgAdYB4gHhAdcB4wHiAdgB5AHjAdkB5QHkAdoB5gHlAdsB5wHmAdwB6AHzAekB8wH0AekB6QH0AeoB9AH1AeoB6gH1AesB9QH2AesB6wH2AewB9gH3AewB7AH3Ae0B9wH4Ae0B7QH4Ae4B+AH5Ae4B7gH5Ae8B+QH6Ae8B7wH6AfAB+gH7AfAB8AH7AfEB+wH8AfEB8QH8AfIB/AH9AfIBCAIJAv4BCQIKAv8BCgILAgACCwIMAgECDAINAgICDQIOAgMCDgIPAgQCDwIQAgUCEAIRAgYCEQISAgcCHgIdAhMCHwIeAhQC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AAAAAAAAgD8AAAAAAAAAAG2zXT+5AAC/AAAAALkAAD9ts12/AAAAAAAAAAAAAIC/AAAAALkAAL9ts12/AAAAAG2zXb+5AAC/AAAAAAAAgL8AAAAAAAAAAG2zXb+5AAA/AAAAALkAAL9ts10/AAAAABe30bgAAIA/AAAAABe30TgAAIA/AAAAALkAAD9ts10/AAAAAG2zXT+5AAA/AAAAAAAAgD8AAAAAAAAAAG2zXT+5AAC/AAAAALkAAD9ts12/AAAAAAAAAAAAAIC/AAAAALkAAL9ts12/AAAAAG2zXb+5AAC/AAAAAAAAgL8AAAAAAAAAAG2zXb+5AAA/AAAAALkAAL9ts10/AAAAABe30bgAAIA/AACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAnb1/P09ROD0AAAAAnb1/P09ROD0AAAAAnb1/P09ROD0AAAAAnb1/P09ROD0AAAAAnb1/v09ROL0AAAAAnb1/v09ROL0AAAAAnb1/v09ROL0AAAAAnb1/v09ROL0AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4vZ29fz8AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAT1E4PZ29f78AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAABe30TgAAIA/AAAAALkAAD9ts10/AAAAAG2zXT+5AAA/AAAAAAAAgD8AAAAAAAAAAG2zXT+5AAC/AAAAALkAAD9ts12/AAAAAAAAAAAAAIC/AAAAALkAAL9ts12/AAAAAG2zXb+5AAC/AAAAAAAAgL8AAAAAAAAAAG2zXb+5AAA/AAAAALkAAL9ts10/AAAAABe30bgAAIA/AAAAABe30TgAAIA/AAAAALkAAD9ts10/AAAAAG2zXT+5AAA/AAAAAAAAgD8AAAAAAAAAAG2zXT+5AAC/AAAAALkAAD9ts12/AAAAAAAAAAAAAIC/AAAAALkAAL9ts12/AAAAAG2zXb+5AAC/AAAAAAAAgL8AAAAAAAAAAG2zXb+5AAA/AAAAALkAAL9ts10/AAAAABe30bgAAIA/AACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAA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WwBZAFwAXgBdAF4AXwBdAGAAbQBhAG0AbgBhAGEAbgBiAG4AbwBiAGIAbwBjAG8AcABjAGMAcABkAHAAcQBkAGQAcQBlAHEAcgBlAGUAcgBmAHIAcwBmAGYAcwBnAHMAdABnAGcAdABoAHQAdQBoAGgAdQBpAHUAdgBpAGkAdgBqAHYAdwBqAGoAdwBrAHcAeABrAGsAeABsAHgAeQBsAIYAhwB6AIcAiAB7AIgAiQB8AIkAigB9AIoAiwB+AIsAjAB/AIwAjQCAAI0AjgCBAI4AjwCCAI8AkACDAJAAkQCEAJEAkgCFAKAAnwCTAKEAoACUAKIAoQCVAKMAogCWAKQAowCXAKUApACYAKYApQCZAKcApgCaAKgApwCbAKkAqACcAKoAqQCdAKsAqgCeAKwArgCtAK4ArwCtALAAsgCxALIAswCxALQAtgC1ALYAtwC1ALgAugC5ALoAuwC5ALwAvgC9AL4AvwC9AMAAwgDBAMIAwwDBAMQA0QDFANEA0gDFAMUA0gDGANIA0wDGAMYA0wDHANMA1ADHAMcA1ADIANQA1QDIAMgA1QDJANUA1gDJAMkA1gDKANYA1wDKAMoA1wDLANcA2ADLAMsA2ADMANgA2QDMAMwA2QDNANkA2gDNAM0A2gDOANoA2wDOAM4A2wDPANsA3ADPAM8A3ADQANwA3QDQAOoA6wDeAOsA7ADfAOwA7QDgAO0A7gDhAO4A7wDiAO8A8ADjAPAA8QDkAPEA8gDlAPIA8wDmAPMA9ADnAPQA9QDoAPUA9gDpAAQBAwH3AAUBBAH4AAYBBQH5AAcBBgH6AAgBBwH7AAkBCAH8AAoBCQH9AAsBCgH+AAwBCwH/AA0BDAEAAQ4BDQEBAQ8BDgECAfA4xT4AAAAAMbsnwNWRuz7Cx/M9MbsnwGmOnz5O2Wc+MbsnwE7ZZz5pjp8+MbsnwMLH8z3Vkbs+MbsnwISM2SPwOMU+MbsnwMLH873Vkbs+MbsnwE7ZZ75pjp8+MbsnwGmOn75O2Wc+MbsnwNWRu77Cx/M9MbsnwPA4xb6EjFkkMbsnwNWRu77Cx/O9MbsnwGmOn75O2We+MbsnwE7ZZ75pjp++MbsnwMLH873Vkbu+MbsnwGMpo6TwOMW+MbsnwMLH8z3Vkbu+MbsnwE7ZZz5pjp++MbsnwGmOnz5O2We+MbsnwNWRuz7Cx/O9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AAAAAAtONz5u3Xs/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAtON75u3Xu/AAAAAAAAAAAAAAAAAACAP/QENT8AAAAA9AQ1PwAAgD8AAAAAAAAAAPQENT8AAAAA9AQ1vwAAAAAAAAAAAACAv/QENb8AAAAA9AQ1vwAAgL8AAAAAAAAAAPQENb8AAAAA9AQ1PwAAAAAAAAAAAACAPwAAAAAAAAAAAACAP/QENT8AAAAA9AQ1PwAAgD8AAAAAAAAAAPQENT8AAAAA9AQ1vwAAAAAAAAAAAACAv/QENb8AAAAA9AQ1vwAAgL8AAAAAAAAAAPQENb8AAAAA9AQ1PwAAAAAAAAAAAACAPwAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAAAAzcxMPQAAAADNzMw9AAAAAJqZGT4AAAAAzcxMPgAAAAAAAIA+AAAAAJqZmT4AAAAAMzOzPgAAAADNzMw+AAAAAGZm5j4AAAAAAAAAPwAAAADNzAw/AAAAAJqZGT8AAAAAZmYmPwAAAAAzMzM/AAAAAAAAQD8AAAAAzcxMPwAAAACamVk/AAAAAGZmZj8AAAAAMzNzPwAAAAAAAIA/AAAAAAAAAAAAAAA+zcxMPQAAAD7NzMw9AAAAPpqZGT4AAAA+zcxMPgAAAD4AAIA+AAAAPpqZmT4AAAA+MzOzPgAAAD7NzMw+AAAAPmZm5j4AAAA+AAAAPwAAAD7NzAw/AAAAPpqZGT8AAAA+ZmYmPwAAAD4zMzM/AAAAPgAAQD8AAAA+zcxMPwAAAD6amVk/AAAAPmZmZj8AAAA+MzNzPwAAAD4AAIA/AAAAPgAAAAAAAIA+zcxMPQAAgD7NzMw9AACAPpqZGT4AAIA+zcxMPgAAgD4AAIA+AACAPpqZmT4AAIA+MzOzPgAAgD7NzMw+AACAPmZm5j4AAIA+AAAAPwAAgD7NzAw/AACAPpqZGT8AAIA+ZmYmPwAAgD4zMzM/AACAPgAAQD8AAIA+zcxMPwAAgD6amVk/AACAPmZmZj8AAIA+MzNzPwAAgD4AAIA/AACAPgAAAAAAAMA+zcxMPQAAwD7NzMw9AADAPpqZGT4AAMA+zcxMPgAAwD4AAIA+AADAPpqZmT4AAMA+MzOzPgAAwD7NzMw+AADAPmZm5j4AAMA+AAAAPwAAwD7NzAw/AADAPpqZGT8AAMA+ZmYmPwAAwD4zMzM/AADAPgAAQD8AAMA+zcxMPwAAwD6amVk/AADAPmZmZj8AAMA+MzNzPwAAwD4AAIA/AADAPgAAAAAAAAA/zcxMPQAAAD/NzMw9AAAAP5qZGT4AAAA/zcxMPgAAAD8AAIA+AAAAP5qZmT4AAAA/MzOzPgAAAD/NzMw+AAAAP2Zm5j4AAAA/AAAAPwAAAD/NzAw/AAAAP5qZGT8AAAA/ZmYmPwAAAD8zMzM/AAAAPwAAQD8AAAA/zcxMPwAAAD+amVk/AAAAP2ZmZj8AAAA/MzNzPwAAAD8AAIA/AAAAPwAAAAAAACA/zcxMPQAAID/NzMw9AAAgP5qZGT4AACA/zcxMPgAAID8AAIA+AAAgP5qZmT4AACA/MzOzPgAAID/NzMw+AAAgP2Zm5j4AACA/AAAAPwAAID/NzAw/AAAgP5qZGT8AACA/ZmYmPwAAID8zMzM/AAAgPwAAQD8AACA/zcxMPwAAID+amVk/AAAgP2ZmZj8AACA/MzNzPwAAID8AAIA/AAAgPwAAAAAAAEA/zcxMPQAAQD/NzMw9AABAP5qZGT4AAEA/zcxMPgAAQD8AAIA+AABAP5qZmT4AAEA/MzOzPgAAQD/NzMw+AABAP2Zm5j4AAEA/AAAAPwAAQD/NzAw/AABAP5qZGT8AAEA/ZmYmPwAAQD8zMzM/AABAPwAAQD8AAEA/zcxMPwAAQD+amVk/AABAP2ZmZj8AAEA/MzNzPwAAQD8AAIA/AABAPwAAAAAAAGA/zcxMPQAAYD/NzMw9AABgP5qZGT4AAGA/zcxMPgAAYD8AAIA+AABgP5qZmT4AAGA/MzOzPgAAYD/NzMw+AABgP2Zm5j4AAGA/AAAAPwAAYD/NzAw/AABgP5qZGT8AAGA/ZmYmPwAAYD8zMzM/AABgPwAAQD8AAGA/zcxMPwAAYD+amVk/AABgP2ZmZj8AAGA/MzNzPwAAYD8AAIA/AABgPwAAAAAAAIA/zcxMPQAAgD/NzMw9AACAP5qZGT4AAIA/zcxMPgAAgD8AAIA+AACAP5qZmT4AAIA/MzOzPgAAgD/NzMw+AACAP2Zm5j4AAIA/AAAAPwAAgD/NzAw/AACAP5qZGT8AAIA/ZmYmPwAAgD8zMzM/AACAPwAAQD8AAIA/zcxMPwAAgD+amVk/AACAP2ZmZj8AAIA/MzNzPwAAgD8AAIA/AACAPwAAAAAAAIA/AAAAPgAAgD8AAIA+AACAPwAAwD4AAIA/AAAAPwAAgD8AACA/AACAPwAAQD8AAIA/AABgPwAAgD8AAIA/AACAPwAAAAAAAAAAAAAAPgAAAAAAAIA+AAAAAAAAwD4AAAAAAAAAPwAAAAAAACA/AAAAAAAAQD8AAAAAAABgPwAAAAAAAIA/AAAAAAAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAIA/AAAAP3qCWj96glo/AAAAPwAAgD8a9hU+eoJaPwAAAAAAAAA/GvYVPhj2FT4AAAA/AAAAAHqCWj8Y9hU+AACAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AACAPwAAAD96glo/GPYVPgAAAD8AAAAAGvYVPhj2FT4AAAAAAAAAPxr2FT56glo/AAAAPwAAgD96glo/eoJaPwAAgD8AAAA/AAAAAAAAgD8AAAA+AACAPwAAgD4AAIA/AADAPgAAgD8AAAA/AACAPwAAID8AAIA/AABAPwAAgD8AAGA/AACAPwAAgD8AAIA/AAAAAAAAAAAAAAA+AAAAAAAAgD4AAAAAAADAPgAAAAAAAAA/AAAAAAAAID8AAAAAAABAPwAAAAAAAGA/AAAAAAAAgD8AAAAAAAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAgD8AAAA/eoJaP3qCWj8AAAA/AACAPxr2FT56glo/AAAAAAAAAD8a9hU+GPYVPgAAAD8AAAAAeoJaPxj2FT4AAIA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAIA/AAAAP3qCWj8Y9hU+AAAAPwAAAAAa9hU+GPYVPgAAAAAAAAA/GvYVPnqCWj8AAAA/AACAP3qCWj96glo/AACAPwAAAD8AAAAAAACAPwAAAD4AAIA/AACAPgAAgD8AAMA+AACAPwAAAD8AAIA/AAAgPwAAgD8AAEA/AACAPwAAYD8AAIA/AACAPwAAgD8AAAAAAAAAAAAAAD4AAAAAAACAPgAAAAAAAMA+AAAAAAAAAD8AAAAAAAAgPwAAAAAAAEA/AAAAAAAAYD8AAAAAAACAPwAAAAAAAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AACAPwAAAD96glo/eoJaPwAAAD8AAIA/GvYVPnqCWj8AAAAAAAAAPxr2FT4Y9hU+AAAAPwAAAAB6glo/GPYVPgAAgD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAgD8AAAA/eoJaPxj2FT4AAAA/AAAAABr2FT4Y9hU+AAAAAAAAAD8a9hU+eoJaPwAAAD8AAIA/eoJaP3qCWj8AAIA/AAAAPxUAAAAWAAAAAQAWABYAAQAXAAEAAgAXABcAAgAYAAIAAwAYABgAAwAZAAMABAAZABkABAAaAAQABQAaABoABQAbAAUABgAbABsABgAcAAYABwAcABwABwAdAAcACAAdAB0ACAAeAAgACQAeAB4ACQAfAAkACgAfAB8ACgAgAAoACwAgACAACwAhAAsADAAhACEADAAiAAwADQAiACIADQAjAA0ADgAjACMADgAkAA4ADwAkACQADwAlAA8AEAAlACUAEAAmABAAEQAmACYAEQAnABEAEgAnACcAEgAoABIAEwAoACgAEwApABMAFAApACoAFQArABUAFgArACsAFgAsABYAFwAsACwAFwAtABcAGAAtAC0AGAAuABgAGQAuAC4AGQAvABkAGgAvAC8AGgAwABoAGwAwADAAGwAxABsAHAAxADEAHAAyABwAHQAyADIAHQAzAB0AHgAzADMAHgA0AB4AHwA0ADQAHwA1AB8AIAA1ADUAIAA2ACAAIQA2ADYAIQA3ACEAIgA3ADcAIgA4ACIAIwA4ADgAIwA5ACMAJAA5ADkAJAA6ACQAJQA6ADoAJQA7ACUAJgA7ADsAJgA8ACYAJwA8ADwAJwA9ACcAKAA9AD0AKAA+ACgAKQA+AD8AKgBAACoAKwBAAEAAKwBBACsALABBAEEALABCACwALQBCAEIALQBDAC0ALgBDAEMALgBEAC4ALwBEAEQALwBFAC8AMABFAEUAMABGADAAMQBGAEYAMQBHADEAMgBHAEcAMgBIADIAMwBIAEgAMwBJADMANABJAEkANABKADQANQBKAEoANQBLADUANgBLAEsANgBMADYANwBMAEwANwBNADcAOABNAE0AOABOADgAOQBOAE4AOQBPADkAOgBPAE8AOgBQADoAOwBQAFAAOwBRADsAPABRAFEAPABSADwAPQBSAFIAPQBTAD0APgBTAFQAPwBVAD8AQABVAFUAQABWAEAAQQBWAFYAQQBXAEEAQgBXAFcAQgBYAEIAQwBYAFgAQwBZAEMARABZAFkARABaAEQARQBaAFoARQBbAEUARgBbAFsARgBcAEYARwBcAFwARwBdAEcASABdAF0ASABeAEgASQBeAF4ASQBfAEkASgBfAF8ASgBgAEoASwBgAGAASwBhAEsATABhAGEATABiAEwATQBiAGIATQBjAE0ATgBjAGMATgBkAE4ATwBkAGQATwBlAE8AUABlAGUAUABmAFAAUQBmAGYAUQBnAFEAUgBnAGcAUgBoAFIAUwBoAGkAVABqAFQAVQBqAGoAVQBrAFUAVgBrAGsAVgBsAFYAVwBsAGwAVwBtAFcAWABtAG0AWABuAFgAWQBuAG4AWQBvAFkAWgBvAG8AWgBwAFoAWwBwAHAAWwBxAFsAXABxAHEAXAByAFwAXQByAHIAXQBzAF0AXgBzAHMAXgB0AF4AXwB0AHQAXwB1AF8AYAB1AHUAYAB2AGAAYQB2AHYAYQB3AGEAYgB3AHcAYgB4AGIAYwB4AHgAYwB5AGMAZAB5AHkAZAB6AGQAZQB6AHoAZQB7AGUAZgB7AHsAZgB8AGYAZwB8AHwAZwB9AGcAaAB9AH4AaQB/AGkAagB/AH8AagCAAGoAawCAAIAAawCBAGsAbACBAIEAbACCAGwAbQCCAIIAbQCDAG0AbgCDAIMAbgCEAG4AbwCEAIQAbwCFAG8AcACFAIUAcACGAHAAcQCGAIYAcQCHAHEAcgCHAIcAcgCIAHIAcwCIAIgAcwCJAHMAdACJAIkAdACKAHQAdQCKAIoAdQCLAHUAdgCLAIsAdgCMAHYAdwCMAIwAdwCNAHcAeACNAI0AeACOAHgAeQCOAI4AeQCPAHkAegCPAI8AegCQAHoAewCQAJAAewCRAHsAfACRAJEAfACSAHwAfQCSAJMAfgCUAH4AfwCUAJQAfwCVAH8AgACVAJUAgACWAIAAgQCWAJYAgQCXAIEAggCXAJcAggCYAIIAgwCYAJgAgwCZAIMAhACZAJkAhACaAIQAhQCaAJoAhQCbAIUAhgCbAJsAhgCcAIYAhwCcAJwAhwCdAIcAiACdAJ0AiACeAIgAiQCeAJ4AiQCfAIkAigCfAJ8AigCgAIoAiwCgAKAAiwChAIsAjAChAKEAjACiAIwAjQCiAKIAjQCjAI0AjgCjAKMAjgCkAI4AjwCkAKQAjwClAI8AkAClAKUAkACmAJAAkQCmAKYAkQCnAJEAkgCnAKgAkwCpAJMAlACpAKkAlACqAJQAlQCqAKoAlQCrAJUAlgCrAKsAlgCsAJYAlwCsAKwAlwCtAJcAmACtAK0AmACuAJgAmQCuAK4AmQCvAJkAmgCvAK8AmgCwAJoAmwCwALAAmwCxAJsAnACxALEAnACyAJwAnQCyALIAnQCzAJ0AngCzALMAngC0AJ4AnwC0ALQAnwC1AJ8AoAC1ALUAoAC2AKAAoQC2ALYAoQC3AKEAogC3ALcAogC4AKIAowC4ALgAowC5AKMApAC5ALkApAC6AKQApQC6ALoApQC7AKUApgC7ALsApgC8AKYApwC8AL0AxgC+AMYAxwC+AL4AxwC/AMcAyAC/AL8AyADAAMgAyQDAAMAAyQDBAMkAygDBAMEAygDCAMoAywDCAMIAywDDAMsAzADDAMMAzADEAMwAzQDEAMQAzQDFAM0AzgDFANcA2ADPANgA2QDQANkA2gDRANoA2wDSANsA3ADTANwA3QDUAN0A3gDVAN4A3wDWAOkA6ADgAOoA6QDhAOsA6gDiAOwA6wDjAO0A7ADkAO4A7QDlAO8A7gDmAPAA7wDnAPEA+gDyAPoA+wDyAPIA+wDzAPsA/ADzAPMA/AD0APwA/QD0APQA/QD1AP0A/gD1APUA/gD2AP4A/wD2APYA/wD3AP8AAAH3APcAAAH4AAABAQH4APgAAQH5AAEBAgH5AAsBDAEDAQwBDQEEAQ0BDgEFAQ4BDwEGAQ8BEAEHARABEQEIAREBEgEJARIBEwEKAR0BHAEUAR4BHQEVAR8BHgEWASABHwEXASEBIAEYASIBIQEZASMBIgEaASQBIwEbASUBLgEmAS4BLwEmASYBLwEnAS8BMAEnAScBMAEoATABMQEoASgBMQEpATEBMgEpASkBMgEqATIBMwEqASoBMwErATMBNAErASsBNAEsATQBNQEsASwBNQEtATUBNgEtAT8BQAE3AUABQQE4AUEBQgE5AUIBQwE6AUMBRAE7AUQBRQE8AUUBRgE9AUYBRwE+AVEBUAFIAVIBUQFJAVMBUgFKAVQBUwFLAVUBVAFMAVYBVQFNAVcBVgFOAVgBVwFPAd21BL/oaiu/nDMivt21BL+XyBm/bTswvt21BL+J1Qq/DTBYvt21BL9i2AC/Iv6Jvt21BL/brPq+xEKtvt21BL9i2AC/Z4fQvt21BL+J1Qq/gm3uvt21BL+XyBm/6TMBv921BL/oaiu/3bUEv921BL86DT2/6TMBv921BL9IAEy/gm3uvt21BL9v/VW/Z4fQvty1BL9kf1m/xEKtvt21BL9v/VW/Iv6Jvt21BL9IAEy/DTBYvt21BL86DT2/bTswvt21BL/oaiu/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nDMivt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/xEKtvt21BD/oaiu/nDMivt21BD+XyBm/bTswvt21BD+J1Qq/DTBYvt21BD9h2AC/Iv6Jvty1BD/brPq+xEKtvt21BD9h2AC/Z4fQvt21BD+J1Qq/gm3uvt21BD+XyBm/6TMBv921BD/oaiu/3bUEv921BD86DT2/6TMBv921BD9IAEy/gm3uvt21BD9v/VW/Z4fQvt21BD9jf1m/xEKtvt21BD9v/VW/Iv6Jvt21BD9IAEy/DTBYvt21BD86DT2/bTswvt21BD/oaiu/nDMivr10E70cL92++FMDQL50E73wOMW+hIYCQMB0E71rrrO+M1UAQMF0E73FQq2+26z6P8B0E71rrrO+UK/0P750E73wOMW+rkzwP710E70cL92+xrHuP7x0E71HJfW+rkzwP7p0E73mVwO/UK/0P7l0E725jQa/26z6P7p0E73mVwO/M1UAQLx0E71HJfW+hIYCQL10E70cL92++FMDQL10Ez0cL92++FMDQLx0Ez3wOMW+hIYCQLp0Ez1qrrO+M1UAQLl0Ez3FQq2+26z6P7p0Ez1qrrO+UK/0P7x0Ez3wOMW+rkzwP710Ez0cL92+xrHuP750Ez1HJfW+rkzwP8B0Ez3mVwO/UK/0P8F0Ez25jQa/26z6P8B0Ez3mVwO/M1UAQL50Ez1HJfW+hIYCQL10Ez0cL92++FMDQL10E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92+26z6P710E70cL92++FMDQL50E73wOMW+hIYCQMB0E71rrrO+M1UAQMF0E73FQq2+26z6P8B0E71rrrO+UK/0P750E73wOMW+rkzwP710E70cL92+xrHuP7x0E71HJfW+rkzwP7p0E73mVwO/UK/0P7l0E725jQa/26z6P7p0E73mVwO/M1UAQLx0E71HJfW+hIYCQL10E70cL92++FMDQL10Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92+26z6P710Ez0cL92++FMDQLx0Ez3wOMW+hIYCQLp0Ez1qrrO+M1UAQLl0Ez3FQq2+26z6P7p0Ez1qrrO+UK/0P7x0Ez3wOMW+rkzwP710Ez0cL92+xrHuP750Ez1HJfW+rkzwP8B0Ez3mVwO/UK/0P8F0Ez25jQa/26z6P8B0Ez3mVwO/M1UAQL50Ez1HJfW+hIYCQL10Ez0cL92++FMDQAAAAAAAAAAAAACAPwAAAAD878M+LoNsPwAAAAD0BDU/9AQ1PwAAAAAug2w//O/DPgAAAAAAAIA/AAAAAAAAAAAug2w//O/DvgAAAAD0BDU/9AQ1vwAAAAD878M+LoNsvwAAAAAAAAAAAACAvwAAAAD878O+LoNsvwAAAAD0BDW/9AQ1vwAAAAAug2y//O/DvgAAAAAAAIC/AAAAAAAAAAAug2y//O/DPgAAAAD0BDW/9AQ1PwAAAAD878O+LoNsPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAD878M+LoNsPwAAAAD0BDU/9AQ1PwAAAAAug2w//O/DPgAAAAAAAIA/AAAAAAAAAAAug2w//O/DvgAAAAD0BDU/9AQ1vwAAAAD878M+LoNsvwAAAAAAAAAAAACAvwAAAAD878O+LoNsvwAAAAD0BDW/9AQ1vwAAAAAug2y//O/DvgAAAAAAAIC/AAAAAAAAAAAug2y//O/DPgAAAAD0BDW/9AQ1PwAAAAD878O+LoNsPwAAAAAAAAAAAACAPwAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAD878M+LoNsPwAAAAD0BDU/9AQ1PwAAAAAug2w//O/DPgAAAAAAAIA/AAAAAAAAAAAug2w//O/DvgAAAAD0BDU/9AQ1vwAAAAD878M+LoNsvwAAAAAAAAAAAACAvwAAAAD878O+LoNsvwAAAAD0BDW/9AQ1vwAAAAAug2y//O/DvgAAAAAAAIC/AAAAAAAAAAAug2y//O/DPgAAAAD0BDW/9AQ1PwAAAAD878O+LoNsPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAD878M+LoNsPwAAAAD0BDU/9AQ1PwAAAAAug2w//O/DPgAAAAAAAIA/AAAAAAAAAAAug2w//O/DvgAAAAD0BDU/9AQ1vwAAAAD878M+LoNsvwAAAAAAAAAAAACAvwAAAAD878O+LoNsvwAAAAD0BDW/9AQ1vwAAAAAug2y//O/DvgAAAAAAAIC/AAAAAAAAAAAug2y//O/DPgAAAAD0BDW/9AQ1PwAAAAD878O+LoNsPwAAAAAAAAAAAACAPwAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAC5AAA/bbNdPwAAAABts10/uQAAPwAAAAAAAIA/AAAAAAAAAABts10/uQAAvwAAAAC5AAA/bbNdvwAAAAAAAAAAAACAvwAAAAC5AAC/bbNdvwAAAABts12/uQAAvwAAAAAAAIC/AAAAAAAAAABts12/uQAAPwAAAAC5AAC/bbNdPwAAAAAXt9G4AACAPwAAAAAXt9E4AACAPwAAAAC5AAA/bbNdPwAAAABts10/uQAAPwAAAAAAAIA/AAAAAAAAAABts10/uQAAvwAAAAC5AAA/bbNdvwAAAAAAAAAAAACAvwAAAAC5AAC/bbNdvwAAAABts12/uQAAvwAAAAAAAIC/AAAAAAAAAABts12/uQAAPwAAAAC5AAC/bbNdPwAAAAAXt9G4AACAPwAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAA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cwBpAHMAdABmAGUAcABmAHAAcQBtAGwAdwBtAHcAeABqAGkAdABqAHQAdQBnAGYAcQBnAHEAcgBuAG0AeABuAHgAeQBkAAwAbwBrAGoAdQBrAHUAdgBoAGcAcgBoAHIAcwAsAG4AeQBlAGQAbwBlAG8AcABvAAsAegB2AHUAgAB2AIAAgQBzAHIAfQBzAH0AfgArAHkAhABwAG8AegBwAHoAewB3AHYAgQB3AIEAggB0AHMAfgB0AH4AfwBxAHAAewBxAHsAfAB4AHcAggB4AIIAgwB1AHQAfwB1AH8AgAByAHEAfAByAHwAfQB5AHgAgwB5AIMAhACDAIIAjQCDAI0AjgCAAH8AigCAAIoAiwB9AHwAhwB9AIcAiACEAIMAjgCEAI4AjwB6AAoAhQCBAIAAiwCBAIsAjAB+AH0AiAB+AIgAiQAqAIQAjwB7AHoAhQB7AIUAhgCCAIEAjACCAIwAjQB/AH4AiQB/AIkAigB8AHsAhgB8AIYAhwCGAIUAkACGAJAAkQCNAIwAlwCNAJcAmACKAIkAlACKAJQAlQCHAIYAkQCHAJEAkgCOAI0AmACOAJgAmQCLAIoAlQCLAJUAlgCIAIcAkgCIAJIAkwCPAI4AmQCPAJkAmgCFAAkAkACMAIsAlgCMAJYAlwCJAIgAkwCJAJMAlAApAI8AmgCaAJkApACaAKQApQCQAAgAmwCXAJYAoQCXAKEAogCUAJMAngCUAJ4AnwAoAJoApQCRAJAAmwCRAJsAnACYAJcAogCYAKIAowCVAJQAnwCVAJ8AoACSAJEAnACSAJwAnQCZAJgAowCZAKMApACWAJUAoACWAKAAoQCTAJIAnQCTAJ0AngCdAJwApwCdAKcAqACkAKMArgCkAK4ArwChAKAAqwChAKsArACeAJ0AqACeAKgAqQClAKQArwClAK8AsACbAAcApgCiAKEArACiAKwArQCfAJ4AqQCfAKkAqgAnAKUAsACcAJsApgCcAKYApwCjAKIArQCjAK0ArgCgAJ8AqgCgAKoAqwAmALAAuwCnAKYAsQCnALEAsgCuAK0AuACuALgAuQCrAKoAtQCrALUAtgCoAKcAsgCoALIAswCvAK4AuQCvALkAugCsAKsAtgCsALYAtwCpAKgAswCpALMAtACwAK8AugCwALoAuwCmAAYAsQCtAKwAtwCtALcAuACqAKkAtACqALQAtQC0ALMAvgC0AL4AvwC7ALoAxQC7AMUAxgCxAAUAvAC4ALcAwgC4AMIAwwC1ALQAvwC1AL8AwAAlALsAxgCyALEAvACyALwAvQC5ALgAwwC5AMMAxAC2ALUAwAC2AMAAwQCzALIAvQCzAL0AvgC6ALkAxAC6AMQAxQC3ALYAwQC3AMEAwgC+AL0AyAC+AMgAyQDFAMQAzwDFAM8A0ADCAMEAzADCAMwAzQC/AL4AyQC/AMkAygDGAMUA0ADGANAA0QC8AAQAxwDDAMIAzQDDAM0AzgDAAL8AygDAAMoAywAkAMYA0QC9ALwAxwC9AMcAyADEAMMAzgDEAM4AzwDBAMAAywDBAMsAzADLAMoA1QDLANUA1gAjANEA3ADIAMcA0gDIANIA0wDPAM4A2QDPANkA2gDMAMsA1gDMANYA1wDJAMgA0wDJANMA1ADQAM8A2gDQANoA2wDNAMwA1wDNANcA2ADKAMkA1ADKANQA1QDRANAA2wDRANsA3ADHAAMA0gDOAM0A2ADOANgA2QDVANQA3wDVAN8A4ADcANsA5gDcAOYA5wDSAAIA3QDZANgA4wDZAOMA5ADWANUA4ADWAOAA4QAiANwA5wDTANIA3QDTAN0A3gDaANkA5ADaAOQA5QDXANYA4QDXAOEA4gDUANMA3gDUAN4A3wDbANoA5QDbAOUA5gDYANcA4gDYAOIA4wDiAOEA7ADiAOwA7QDfAN4A6QDfAOkA6gDmAOUA8ADmAPAA8QDjAOIA7QDjAO0A7gDgAN8A6gDgAOoA6wDnAOYA8QDnAPEA8gDdAAEA6ADkAOMA7gDkAO4A7wDhAOAA6wDhAOsA7AAhAOcA8gDeAN0A6ADeAOgA6QDlAOQA7wDlAO8A8ADsAOsA+QDsAPkA+wAgAPIABwHpAOgA8wDpAPMA9QDwAO8AAQHwAAEBAwHtAOwA+wDtAPsA/QDqAOkA9QDqAPUA9wDxAPAAAwHxAAMBBQHuAO0A/QDuAP0A/wDrAOoA9wDrAPcA+QDyAPEABQHyAAUBBwHoAAAA8wDvAO4A/wDvAP8AAQEAAf4ADgEAAQ4BDwH6APgACwH6AAsBDAEIAQYBEgEIARIBEwH0ABcACQECAQABDwECAQ8BEAH8APoADAH8AAwBDQE3AAgBEwH2APQACQH2AAkBCgEEAQIBEAEEARABEQH+APwADQH+AA0BDgH4APYACgH4AAoBCwEGAQQBEQEGAREBEgEOAQ0BGAEOARgBGQELAQoBFQELARUBFgESAREBHAESARwBHQEPAQ4BGQEPARkBGgEMAQsBFgEMARYBFwETARIBHQETAR0BHgEJARYAFAEQAQ8BGgEQARoBGwENAQwBFwENARcBGAE2ABMBHgEKAQkBFAEKARQBFQERARABGwERARsBHAEbARoBJQEbASUBJgEYARcBIgEYASIBIwE1AB4BKQEVARQBHwEVAR8BIAEcARsBJgEcASYBJwEZARgBIwEZASMBJAEWARUBIAEWASABIQEdARwBJwEdAScBKAEaARkBJAEaASQBJQEXARYBIQEXASEBIgEeAR0BKAEeASgBKQEUARUAHwElASQBLwElAS8BMAEiASEBLAEiASwBLQEpASgBMwEpATMBNAEfARQAKgEmASUBMAEmATABMQEjASIBLQEjAS0BLgE0ACkBNAEgAR8BKgEgASoBKwEnASYBMQEnATEBMgEkASMBLgEkAS4BLwEhASABKwEhASsBLAEoAScBMgEoATIBMwEyATEBPAEyATwBPQEvAS4BOQEvATkBOgEsASsBNgEsATYBNwEzATIBPQEzAT0BPgEwAS8BOgEwAToBOwEtASwBNwEtATcBOAE0ATMBPgE0AT4BPwEqARMANQExATABOwExATsBPAEuAS0BOAEuATgBOQEzADQBPwErASoBNQErATUBNgE1ARIAGAA8ATsBHAA8ARwAHQA5ATgBGQA5ARkAGgAyAD8BHwA2ATUBGAA2ARgAQAE9ATwBHQA9AR0AHgA6ATkBGgA6ARoAGwA3ATYBQAE3AUABQQE+AT0BHgA+AR4AQgE7AToBGwA7ARsAHAA4ATcBQQE4AUEBGQA/AT4BQgE/AUIBHwCCUWm+ZmbGPpM6Qb+CUWm+ZmbGPpM6Qb+CUWm+ZmbGPpM6Qb+CUWm+ZmbGPpM6Qb+CUWm+MzPTPizUOr+CUWm+MzPTPizUOr+CUWm+MzPTPizUOr+CUWm+MzPTPizUOr+OdYG+MzPTPpM6Qb+OdYG+MzPTPpM6Qb+OdYG+MzPTPpM6Qb+OdYG+MzPTPpM6Qb+CUWm+JybKPg60PL+CUWm+JybKPg60PL+CUWm+JybKPg60PL+CUWm+JybKPg60PL88GXi+Vs/LPqWIPb88GXi+Vs/LPqWIPb88GXi+Vs/LPqWIPb+ba3u+MzPTPg60PL+ba3u+MzPTPg60PL+ba3u+MzPTPg60PL+ba3u+MzPTPg60PL+ba3u+JybKPpM6Qb+ba3u+JybKPpM6Qb+ba3u+JybKPpM6Qb+ba3u+JybKPpM6Qb+CUWm+Urj+PizUOr+CUWm+Urj+PizUOr+CUWm+Urj+PizUOr+CUWm+Urj+PizUOr+CUWm+j8IFP5M6Qb+CUWm+j8IFP5M6Qb+CUWm+j8IFP5M6Qb+CUWm+j8IFP5M6Qb+OdYG+Urj+PpM6Qb+OdYG+Urj+PpM6Qb+OdYG+Urj+PpM6Qb+OdYG+Urj+PpM6Qb+CUWm+r+IDPw60PL+CUWm+r+IDPw60PL+CUWm+r+IDPw60PL+CUWm+r+IDPw60PL88GXi+Fw4DP6WIPb88GXi+Fw4DP6WIPb88GXi+Fw4DP6WIPb+ba3u+r+IDP5M6Qb+ba3u+r+IDP5M6Qb+ba3u+r+IDP5M6Qb+ba3u+r+IDP5M6Qb+ba3u+Urj+Pg60PL+ba3u+Urj+Pg60PL+ba3u+Urj+Pg60PL+ba3u+Urj+Pg60PL+CUWm+ZmbGPqjoSL+CUWm+ZmbGPqjoSL+CUWm+ZmbGPqjoSL+CUWm+ZmbGPqjoSL+OdYG+MzPTPqjoSL+OdYG+MzPTPqjoSL+OdYG+MzPTPqjoSL+OdYG+MzPTPqjoSL+CUWm+MzPTPg5PT7+CUWm+MzPTPg5PT7+CUWm+MzPTPg5PT7+CUWm+MzPTPg5PT7+ba3u+JybKPqjoSL+ba3u+JybKPqjoSL+ba3u+JybKPqjoSL+ba3u+JybKPqjoSL88GXi+Vs/LPpaaTL88GXi+Vs/LPpaaTL88GXi+Vs/LPpaaTL+ba3u+MzPTPi1vTb+ba3u+MzPTPi1vTb+ba3u+MzPTPi1vTb+ba3u+MzPTPi1vTb+CUWm+JybKPi1vTb+CUWm+JybKPi1vTb+CUWm+JybKPi1vTb+CUWm+JybKPi1vTb+CUWm+j8IFP6joSL+CUWm+j8IFP6joSL+CUWm+j8IFP6joSL+CUWm+j8IFP6joSL+CUWm+Urj+Pg5PT7+CUWm+Urj+Pg5PT7+CUWm+Urj+Pg5PT7+CUWm+Urj+Pg5PT7+OdYG+Urj+PqjoSL+OdYG+Urj+PqjoSL+OdYG+Urj+PqjoSL+OdYG+Urj+PqjoSL+CUWm+r+IDPy1vTb+CUWm+r+IDPy1vTb+CUWm+r+IDPy1vTb+CUWm+r+IDPy1vTb88GXi+Fw4DP5aaTL88GXi+Fw4DP5aaTL88GXi+Fw4DP5aaTL+ba3u+Urj+Pi1vTb+ba3u+Urj+Pi1vTb+ba3u+Urj+Pi1vTb+ba3u+Urj+Pi1vTb+ba3u+r+IDP6joSL+ba3u+r+IDP6joSL+ba3u+r+IDP6joSL+ba3u+r+IDP6joSL+CUWk+ZmbGPpM6Qb+CUWk+ZmbGPpM6Qb+CUWk+ZmbGPpM6Qb+CUWk+ZmbGPpM6Qb+OdYE+MzPTPpM6Qb+OdYE+MzPTPpM6Qb+OdYE+MzPTPpM6Qb+OdYE+MzPTPpM6Qb+CUWk+MzPTPizUOr+CUWk+MzPTPizUOr+CUWk+MzPTPizUOr+CUWk+MzPTPizUOr+ba3s+JybKPpM6Qb+ba3s+JybKPpM6Qb+ba3s+JybKPpM6Qb+ba3s+JybKPpM6Qb88GXg+Vs/LPqWIPb88GXg+Vs/LPqWIPb88GXg+Vs/LPqWIPb+ba3s+MzPTPg60PL+ba3s+MzPTPg60PL+ba3s+MzPTPg60PL+ba3s+MzPTPg60PL+CUWk+JybKPg60PL+CUWk+JybKPg60PL+CUWk+JybKPg60PL+CUWk+JybKPg60PL+CUWk+j8IFP5M6Qb+CUWk+j8IFP5M6Qb+CUWk+j8IFP5M6Qb+CUWk+j8IFP5M6Qb+CUWk+Urj+PizUOr+CUWk+Urj+PizUOr+CUWk+Urj+PizUOr+CUWk+Urj+PizUOr+OdYE+Urj+PpM6Qb+OdYE+Urj+PpM6Qb+OdYE+Urj+PpM6Qb+OdYE+Urj+PpM6Qb+CUWk+r+IDPw60PL+CUWk+r+IDPw60PL+CUWk+r+IDPw60PL+CUWk+r+IDPw60PL88GXg+Fw4DP6WIPb88GXg+Fw4DP6WIPb88GXg+Fw4DP6WIPb+ba3s+Urj+Pg60PL+ba3s+Urj+Pg60PL+ba3s+Urj+Pg60PL+ba3s+Urj+Pg60PL+ba3s+r+IDP5M6Qb+ba3s+r+IDP5M6Qb+ba3s+r+IDP5M6Qb+ba3s+r+IDP5M6Qb+CUWk+ZmbGPqjoSL+CUWk+ZmbGPqjoSL+CUWk+ZmbGPqjoSL+CUWk+ZmbGPqjoSL+CUWk+MzPTPg5PT7+CUWk+MzPTPg5PT7+CUWk+MzPTPg5PT7+CUWk+MzPTPg5PT7+OdYE+MzPTPqjoSL+OdYE+MzPTPqjoSL+OdYE+MzPTPqjoSL+OdYE+MzPTPqjoSL+CUWk+JybKPi1vTb+CUWk+JybKPi1vTb+CUWk+JybKPi1vTb+CUWk+JybKPi1vTb88GXg+Vs/LPpaaTL88GXg+Vs/LPpaaTL88GXg+Vs/LPpaaTL+ba3s+MzPTPi1vTb+ba3s+MzPTPi1vTb+ba3s+MzPTPi1vTb+ba3s+MzPTPi1vTb+ba3s+JybKPqjoSL+ba3s+JybKPqjoSL+ba3s+JybKPqjoSL+ba3s+JybKPqjoSL+CUWk+j8IFP6joSL+CUWk+j8IFP6joSL+CUWk+j8IFP6joSL+CUWk+j8IFP6joSL+OdYE+Urj+PqjoSL+OdYE+Urj+PqjoSL+OdYE+Urj+PqjoSL+OdYE+Urj+PqjoSL+CUWk+Urj+Pg5PT7+CUWk+Urj+Pg5PT7+CUWk+Urj+Pg5PT7+CUWk+Urj+Pg5PT7+ba3s+r+IDP6joSL+ba3s+r+IDP6joSL+ba3s+r+IDP6joSL+ba3s+r+IDP6joSL88GXg+Fw4DP5aaTL88GXg+Fw4DP5aaTL88GXg+Fw4DP5aaTL+ba3s+Urj+Pi1vTb+ba3s+Urj+Pi1vTb+ba3s+Urj+Pi1vTb+ba3s+Urj+Pi1vTb+CUWk+r+IDPy1vTb+CUWk+r+IDPy1vTb+CUWk+r+IDPy1vTb+CUWk+r+IDPy1vTb+RRC++pDECPwZMPL+RRC++pDECPwZMPL+RRC++pDECPwZMPL+RRC++pDECPwK3Nr+RRC++pDECPwK3Nr+RRC++pDECPwK3Nr9BYBW+oXUAPwZMPL9BYBW+oXUAPwZMPL9BYBW+oXUAPwK3Nr9BYBW+oXUAPwK3Nr/+awK+IXH3PgZMPL/+awK+IXH3PgZMPL/+awK+IXH3PgK3Nr/+awK+IXH3PgK3Nr/k9/a9+n7qPgZMPL/k9/a9+n7qPgZMPL/k9/a9+n7qPgK3Nr/k9/a9+n7qPgK3Nr/+awK+0ozdPgZMPL/+awK+0ozdPgZMPL/+awK+0ozdPgK3Nr/+awK+0ozdPgK3Nr9BYBW+sRLUPgZMPL9BYBW+sRLUPgZMPL9BYBW+sRLUPgK3Nr9BYBW+sRLUPgK3Nr+RRC++q5rQPgZMPL+RRC++q5rQPgZMPL+RRC++q5rQPgK3Nr+RRC++q5rQPgK3Nr/hKEm+sRLUPgZMPL/hKEm+sRLUPgZMPL/hKEm+sRLUPgK3Nr/hKEm+sRLUPgK3Nr8jHVy+0ozdPgZMPL8jHVy+0ozdPgZMPL8jHVy+0ozdPgK3Nr8jHVy+0ozdPgK3Nr8wDWO++n7qPgZMPL8wDWO++n7qPgZMPL8wDWO++n7qPgK3Nr8wDWO++n7qPgK3Nr8jHVy+IXH3PgZMPL8jHVy+IXH3PgZMPL8jHVy+IXH3PgK3Nr8jHVy+IXH3PgK3Nr/hKEm+oXUAPwZMPL/hKEm+oXUAPwZMPL/hKEm+oXUAPwK3Nr/hKEm+oXUAPwK3Nr8AAAAApDECPwZMPL8AAAAApDECPwZMPL8AAAAApDECPwZMPL8AAAAApDECPwK3Nr8AAAAApDECPwK3Nr8AAAAApDECPwK3Nr99Is88oXUAPwZMPL99Is88oXUAPwZMPL99Is88oXUAPwK3Nr99Is88oXUAPwK3Nr9JYjM9IXH3PgZMPL9JYjM9IXH3PgZMPL9JYjM9IXH3PgK3Nr9JYjM9IXH3PgK3Nr99Ik89+n7qPgZMPL99Ik89+n7qPgZMPL99Ik89+n7qPgK3Nr99Ik89+n7qPgK3Nr9JYjM90ozdPgZMPL9JYjM90ozdPgZMPL9JYjM90ozdPgK3Nr9JYjM90ozdPgK3Nr99Is88sRLUPgZMPL99Is88sRLUPgZMPL99Is88sRLUPgK3Nr99Is88sRLUPgK3Nr8AAAAAq5rQPgZMPL8AAAAAq5rQPgZMPL8AAAAAq5rQPgK3Nr8AAAAAq5rQPgK3Nr99Is+8sRLUPgZMPL99Is+8sRLUPgZMPL99Is+8sRLUPgK3Nr99Is+8sRLUPgK3Nr9JYjO90ozdPgZMPL9JYjO90ozdPgZMPL9JYjO90ozdPgK3Nr9JYjO90ozdPgK3Nr99Ik+9+n7qPgZMPL99Ik+9+n7qPgZMPL99Ik+9+n7qPgK3Nr99Ik+9+n7qPgK3Nr9JYjO9IXH3PgZMPL9JYjO9IXH3PgZMPL9JYjO9IXH3PgK3Nr9JYjO9IXH3PgK3Nr99Is+8oXUAPwZMPL99Is+8oXUAPwZMPL99Is+8oXUAPwK3Nr99Is+8oXUAPwK3Nr+RRC8+pDECPwZMPL+RRC8+pDECPwZMPL+RRC8+pDECPwZMPL+RRC8+pDECPwK3Nr+RRC8+pDECPwK3Nr+RRC8+pDECPwK3Nr/hKEk+oXUAPwZMPL/hKEk+oXUAPwZMPL/hKEk+oXUAPwK3Nr/hKEk+oXUAPwK3Nr8jHVw+IXH3PgZMPL8jHVw+IXH3PgZMPL8jHVw+IXH3PgK3Nr8jHVw+IXH3PgK3Nr8wDWM++n7qPgZMPL8wDWM++n7qPgZMPL8wDWM++n7qPgK3Nr8wDWM++n7qPgK3Nr8jHVw+0ozdPgZMPL8jHVw+0ozdPgZMPL8jHVw+0ozdPgK3Nr8jHVw+0ozdPgK3Nr/hKEk+sRLUPgZMPL/hKEk+sRLUPgZMPL/hKEk+sRLUPgK3Nr/hKEk+sRLUPgK3Nr+RRC8+q5rQPgZMPL+RRC8+q5rQPgZMPL+RRC8+q5rQPgK3Nr+RRC8+q5rQPgK3Nr9BYBU+sRLUPgZMPL9BYBU+sRLUPgZMPL9BYBU+sRLUPgK3Nr9BYBU+sRLUPgK3Nr/+awI+0ozdPgZMPL/+awI+0ozdPgZMPL/+awI+0ozdPgK3Nr/+awI+0ozdPgK3Nr/k9/Y9+n7qPgZMPL/k9/Y9+n7qPgZMPL/k9/Y9+n7qPgK3Nr/k9/Y9+n7qPgK3Nr/+awI+IXH3PgZMPL/+awI+IXH3PgZMPL/+awI+IXH3PgK3Nr/+awI+IXH3PgK3Nr9BYBU+oXUAPwZMPL9BYBU+oXUAPwZMPL9BYBU+oXUAPwK3Nr9BYBU+oXUAPwK3Nr8AAAAAS6+9Pr2pCb8AAAAAS6+9Pr2pCb8AAAAAS6+9Pr2pCb8AAAAAt5b5PgAYAL8AAAAAt5b5PgAYAL8AAAAAt5b5PgAYAL/FiFA8/ty8Pp5gCL/FiFA8/ty8Pp5gCL/FiFA8asT4PsGd/b7FiFA8asT4PsGd/b68dJM8SOG6PgxGBb+8dJM8SOG6PgxGBb+8dJM8tcj2Pp1o9768dJM8tcj2Pp1o977FiFA8k+W4PnkrAr/FiFA8k+W4PnkrAr/FiFA8/sz0Pnkz8b7FiFA8/sz0Pnkz8b4AAAAARRO4PlriAL8AAAAARRO4PlriAL8AAAAAsfrzPjuh7r4AAAAAsfrzPjuh7r7FiFC8k+W4PnkrAr/FiFC8k+W4PnkrAr/FiFC8/sz0Pnkz8b7FiFC8/sz0Pnkz8b68dJO8SOG6PgxGBb+8dJO8SOG6PgxGBb+8dJO8tcj2Pp1o9768dJO8tcj2Pp1o977FiFC8/ty8Pp5gCL/FiFC8/ty8Pp5gCL/FiFC8asT4PsGd/b7FiFC8asT4PsGd/b7rVg++RIusPle3Or7rVg++RIusPle3Or7rVg++RIusPle3Or7rVg++RIusPle3Or7rVg++aJGtPg2rOL7rVg++aJGtPg2rOL7rVg++aJGtPg2rOL7rVg++aJGtPg2rOL41YxG+aJGtPlW3Or41YxG+aJGtPlW3Or41YxG+aJGtPlW3Or41YxG+aJGtPlW3Or7rVg++C9isPptEOb7rVg++C9isPptEOb7rVg++C9isPptEOb7rVg++C9isPptEOb6ehRC+D/qsPqSIOb6ehRC+D/qsPqSIOb6ehRC+D/qsPqSIOb6lyRC+aJGtPptEOb6lyRC+aJGtPptEOb6lyRC+aJGtPptEOb6lyRC+aJGtPptEOb6lyRC+C9isPlW3Or6lyRC+C9isPlW3Or6lyRC+C9isPlW3Or6lyRC+C9isPlW3Or7rVg++QmAFPw2rOL7rVg++QmAFPw2rOL7rVg++QmAFPw2rOL7rVg++QmAFPw2rOL7rVg++VOMFP1e3Or7rVg++VOMFP1e3Or7rVg++VOMFP1e3Or7rVg++VOMFP1e3Or41YxG+QmAFP1W3Or41YxG+QmAFP1W3Or41YxG+QmAFP1W3Or41YxG+QmAFP1W3Or7rVg++8bwFP5tEOb7rVg++8bwFP5tEOb7rVg++8bwFP5tEOb7rVg++8bwFP5tEOb6ehRC+7qsFP6SIOb6ehRC+7qsFP6SIOb6ehRC+7qsFP6SIOb6lyRC+8bwFP1W3Or6lyRC+8bwFP1W3Or6lyRC+8bwFP1W3Or6lyRC+8bwFP1W3Or6lyRC+QmAFP5tEOb6lyRC+QmAFP5tEOb6lyRC+QmAFP5tEOb6lyRC+QmAFP5tEOb7rVg++RIusPnzoQr7rVg++RIusPnzoQr7rVg++RIusPnzoQr7rVg++RIusPnzoQr41YxG+aJGtPn7oQr41YxG+aJGtPn7oQr41YxG+aJGtPn7oQr41YxG+aJGtPn7oQr7rVg++aJGtPsb0RL7rVg++aJGtPsb0RL7rVg++aJGtPsb0RL7rVg++aJGtPsb0RL6lyRC+C9isPn7oQr6lyRC+C9isPn7oQr6lyRC+C9isPn7oQr6lyRC+C9isPn7oQr6ehRC+D/qsPi8XRL6ehRC+D/qsPi8XRL6ehRC+D/qsPi8XRL6lyRC+aJGtPjhbRL6lyRC+aJGtPjhbRL6lyRC+aJGtPjhbRL6lyRC+aJGtPjhbRL7rVg++C9isPjhbRL7rVg++C9isPjhbRL7rVg++C9isPjhbRL7rVg++C9isPjhbRL7rVg++VOMFP3zoQr7rVg++VOMFP3zoQr7rVg++VOMFP3zoQr7rVg++VOMFP3zoQr7rVg++QmAFP8b0RL7rVg++QmAFP8b0RL7rVg++QmAFP8b0RL7rVg++QmAFP8b0RL41YxG+QmAFP37oQr41YxG+QmAFP37oQr41YxG+QmAFP37oQr41YxG+QmAFP37oQr7rVg++8bwFPzhbRL7rVg++8bwFPzhbRL7rVg++8bwFPzhbRL7rVg++8bwFPzhbRL6ehRC+7qsFPy8XRL6ehRC+7qsFPy8XRL6ehRC+7qsFPy8XRL6lyRC+QmAFPzhbRL6lyRC+QmAFPzhbRL6lyRC+QmAFPzhbRL6lyRC+QmAFPzhbRL6lyRC+8bwFP37oQr6lyRC+8bwFP37oQr6lyRC+8bwFP37oQr6lyRC+8bwFP37oQr7oMN+9RIusPle3Or7oMN+9RIusPle3Or7oMN+9RIusPle3Or7oMN+9RIusPle3Or5WGNu9aJGtPlW3Or5WGNu9aJGtPlW3Or5WGNu9aJGtPlW3Or5WGNu9aJGtPlW3Or7oMN+9aJGtPg2rOL7oMN+9aJGtPg2rOL7oMN+9aJGtPg2rOL7oMN+9aJGtPg2rOL50S9y9C9isPlW3Or50S9y9C9isPlW3Or50S9y9C9isPlW3Or50S9y9C9isPlW3Or6D09y9D/qsPqSIOb6D09y9D/qsPqSIOb6D09y9D/qsPqSIOb50S9y9aJGtPptEOb50S9y9aJGtPptEOb50S9y9aJGtPptEOb50S9y9aJGtPptEOb7oMN+9C9isPptEOb7oMN+9C9isPptEOb7oMN+9C9isPptEOb7oMN+9C9isPptEOb7oMN+9VOMFP1e3Or7oMN+9VOMFP1e3Or7oMN+9VOMFP1e3Or7oMN+9VOMFP1e3Or7oMN+9QmAFPw2rOL7oMN+9QmAFPw2rOL7oMN+9QmAFPw2rOL7oMN+9QmAFPw2rOL5WGNu9QmAFP1W3Or5WGNu9QmAFP1W3Or5WGNu9QmAFP1W3Or5WGNu9QmAFP1W3Or7oMN+98bwFP5tEOb7oMN+98bwFP5tEOb7oMN+98bwFP5tEOb7oMN+98bwFP5tEOb6D09y97qsFP6SIOb6D09y97qsFP6SIOb6D09y97qsFP6SIOb50S9y9QmAFP5tEOb50S9y9QmAFP5tEOb50S9y9QmAFP5tEOb50S9y9QmAFP5tEOb50S9y98bwFP1W3Or50S9y98bwFP1W3Or50S9y98bwFP1W3Or50S9y98bwFP1W3Or7oMN+9RIusPnzoQr7oMN+9RIusPnzoQr7oMN+9RIusPnzoQr7oMN+9RIusPnzoQr7oMN+9aJGtPsb0RL7oMN+9aJGtPsb0RL7oMN+9aJGtPsb0RL7oMN+9aJGtPsb0RL5WGNu9aJGtPn7oQr5WGNu9aJGtPn7oQr5WGNu9aJGtPn7oQr5WGNu9aJGtPn7oQr7oMN+9C9isPjhbRL7oMN+9C9isPjhbRL7oMN+9C9isPjhbRL7oMN+9C9isPjhbRL6D09y9D/qsPi8XRL6D09y9D/qsPi8XRL6D09y9D/qsPi8XRL50S9y9aJGtPjhbRL50S9y9aJGtPjhbRL50S9y9aJGtPjhbRL50S9y9aJGtPjhbRL50S9y9C9isPn7oQr50S9y9C9isPn7oQr50S9y9C9isPn7oQr50S9y9C9isPn7oQr7oMN+9VOMFP3zoQr7oMN+9VOMFP3zoQr7oMN+9VOMFP3zoQr7oMN+9VOMFP3zoQr5WGNu9QmAFP37oQr5WGNu9QmAFP37oQr5WGNu9QmAFP37oQr5WGNu9QmAFP37oQr7oMN+9QmAFP8b0RL7oMN+9QmAFP8b0RL7oMN+9QmAFP8b0RL7oMN+9QmAFP8b0RL50S9y98bwFP37oQr50S9y98bwFP37oQr50S9y98bwFP37oQr50S9y98bwFP37oQr6D09y97qsFPy8XRL6D09y97qsFPy8XRL6D09y97qsFPy8XRL50S9y9QmAFPzhbRL50S9y9QmAFPzhbRL50S9y9QmAFPzhbRL50S9y9QmAFPzhbRL7oMN+98bwFPzhbRL7oMN+98bwFPzhbRL7oMN+98bwFPzhbRL7oMN+98bwFPzhbRL7oMN89RIusPle3Or7oMN89RIusPle3Or7oMN89RIusPle3Or7oMN89RIusPle3Or7oMN89aJGtPg2rOL7oMN89aJGtPg2rOL7oMN89aJGtPg2rOL7oMN89aJGtPg2rOL5WGNs9aJGtPlW3Or5WGNs9aJGtPlW3Or5WGNs9aJGtPlW3Or5WGNs9aJGtPlW3Or7oMN89C9isPptEOb7oMN89C9isPptEOb7oMN89C9isPptEOb7oMN89C9isPptEOb6D09w9D/qsPqSIOb6D09w9D/qsPqSIOb6D09w9D/qsPqSIOb50S9w9aJGtPptEOb50S9w9aJGtPptEOb50S9w9aJGtPptEOb50S9w9aJGtPptEOb50S9w9C9isPlW3Or50S9w9C9isPlW3Or50S9w9C9isPlW3Or50S9w9C9isPlW3Or7oMN89QmAFPw2rOL7oMN89QmAFPw2rOL7oMN89QmAFPw2rOL7oMN89QmAFPw2rOL7oMN89VOMFP1e3Or7oMN89VOMFP1e3Or7oMN89VOMFP1e3Or7oMN89VOMFP1e3Or5WGNs9QmAFP1W3Or5WGNs9QmAFP1W3Or5WGNs9QmAFP1W3Or5WGNs9QmAFP1W3Or7oMN898bwFP5tEOb7oMN898bwFP5tEOb7oMN898bwFP5tEOb7oMN898bwFP5tEOb6D09w97qsFP6SIOb6D09w97qsFP6SIOb6D09w97qsFP6SIOb50S9w98bwFP1W3Or50S9w98bwFP1W3Or50S9w98bwFP1W3Or50S9w98bwFP1W3Or50S9w9QmAFP5tEOb50S9w9QmAFP5tEOb50S9w9QmAFP5tEOb50S9w9QmAFP5tEOb7oMN89RIusPnzoQr7oMN89RIusPnzoQr7oMN89RIusPnzoQr7oMN89RIusPnzoQr5WGNs9aJGtPn7oQr5WGNs9aJGtPn7oQr5WGNs9aJGtPn7oQr5WGNs9aJGtPn7oQr7oMN89aJGtPsb0RL7oMN89aJGtPsb0RL7oMN89aJGtPsb0RL7oMN89aJGtPsb0RL50S9w9C9isPn7oQr50S9w9C9isPn7oQr50S9w9C9isPn7oQr50S9w9C9isPn7oQr6D09w9D/qsPi8XRL6D09w9D/qsPi8XRL6D09w9D/qsPi8XRL50S9w9aJGtPjhbRL50S9w9aJGtPjhbRL50S9w9aJGtPjhbRL50S9w9aJGtPjhbRL7oMN89C9isPjhbRL7oMN89C9isPjhbRL7oMN89C9isPjhbRL7oMN89C9isPjhbRL7oMN89VOMFP3zoQr7oMN89VOMFP3zoQr7oMN89VOMFP3zoQr7oMN89VOMFP3zoQr7oMN89QmAFP8b0RL7oMN89QmAFP8b0RL7oMN89QmAFP8b0RL7oMN89QmAFP8b0RL5WGNs9QmAFP37oQr5WGNs9QmAFP37oQr5WGNs9QmAFP37oQr5WGNs9QmAFP37oQr7oMN898bwFPzhbRL7oMN898bwFPzhbRL7oMN898bwFPzhbRL7oMN898bwFPzhbRL6D09w97qsFPy8XRL6D09w97qsFPy8XRL6D09w97qsFPy8XRL50S9w9QmAFPzhbRL50S9w9QmAFPzhbRL50S9w9QmAFPzhbRL50S9w9QmAFPzhbRL50S9w98bwFP37oQr50S9w98bwFP37oQr50S9w98bwFP37oQr50S9w98bwFP37oQr7rVg8+RIusPle3Or7rVg8+RIusPle3Or7rVg8+RIusPle3Or7rVg8+RIusPle3Or41YxE+aJGtPlW3Or41YxE+aJGtPlW3Or41YxE+aJGtPlW3Or41YxE+aJGtPlW3Or7rVg8+aJGtPg2rOL7rVg8+aJGtPg2rOL7rVg8+aJGtPg2rOL7rVg8+aJGtPg2rOL6lyRA+C9isPlW3Or6lyRA+C9isPlW3Or6lyRA+C9isPlW3Or6lyRA+C9isPlW3Or6ehRA+D/qsPqSIOb6ehRA+D/qsPqSIOb6ehRA+D/qsPqSIOb6lyRA+aJGtPptEOb6lyRA+aJGtPptEOb6lyRA+aJGtPptEOb6lyRA+aJGtPptEOb7rVg8+C9isPptEOb7rVg8+C9isPptEOb7rVg8+C9isPptEOb7rVg8+C9isPptEOb7rVg8+VOMFP1e3Or7rVg8+VOMFP1e3Or7rVg8+VOMFP1e3Or7rVg8+VOMFP1e3Or7rVg8+QmAFPw2rOL7rVg8+QmAFPw2rOL7rVg8+QmAFPw2rOL7rVg8+QmAFPw2rOL41YxE+QmAFP1W3Or41YxE+QmAFP1W3Or41YxE+QmAFP1W3Or41YxE+QmAFP1W3Or7rVg8+8bwFP5tEOb7rVg8+8bwFP5tEOb7rVg8+8bwFP5tEOb7rVg8+8bwFP5tEOb6ehRA+7qsFP6SIOb6ehRA+7qsFP6SIOb6ehRA+7qsFP6SIOb6lyRA+QmAFP5tEOb6lyRA+QmAFP5tEOb6lyRA+QmAFP5tEOb6lyRA+QmAFP5tEOb6lyRA+8bwFP1W3Or6lyRA+8bwFP1W3Or6lyRA+8bwFP1W3Or6lyRA+8bwFP1W3Or7rVg8+RIusPnzoQr7rVg8+RIusPnzoQr7rVg8+RIusPnzoQr7rVg8+RIusPnzoQr7rVg8+aJGtPsb0RL7rVg8+aJGtPsb0RL7rVg8+aJGtPsb0RL7rVg8+aJGtPsb0RL41YxE+aJGtPn7oQr41YxE+aJGtPn7oQr41YxE+aJGtPn7oQr41YxE+aJGtPn7oQr7rVg8+C9isPjhbRL7rVg8+C9isPjhbRL7rVg8+C9isPjhbRL7rVg8+C9isPjhbRL6ehRA+D/qsPi8XRL6ehRA+D/qsPi8XRL6ehRA+D/qsPi8XRL6lyRA+aJGtPjhbRL6lyRA+aJGtPjhbRL6lyRA+aJGtPjhbRL6lyRA+aJGtPjhbRL6lyRA+C9isPn7oQr6lyRA+C9isPn7oQr6lyRA+C9isPn7oQr6lyRA+C9isPn7oQr7rVg8+VOMFP3zoQr7rVg8+VOMFP3zoQr7rVg8+VOMFP3zoQr7rVg8+VOMFP3zoQr41YxE+QmAFP37oQr41YxE+QmAFP37oQr41YxE+QmAFP37oQr41YxE+QmAFP37oQr7rVg8+QmAFP8b0RL7rVg8+QmAFP8b0RL7rVg8+QmAFP8b0RL7rVg8+QmAFP8b0RL6lyRA+8bwFP37oQr6lyRA+8bwFP37oQr6lyRA+8bwFP37oQr6lyRA+8bwFP37oQr6ehRA+7qsFPy8XRL6ehRA+7qsFPy8XRL6ehRA+7qsFPy8XRL6lyRA+QmAFPzhbRL6lyRA+QmAFPzhbRL6lyRA+QmAFPzhbRL6lyRA+QmAFPzhbRL7rVg8+8bwFPzhbRL7rVg8+8bwFPzhbRL7rVg8+8bwFPzhbRL7rVg8+8bwFPzhbRL64srw+qWQAP7snD764srw+qWQAP7snD764srw+qWQAP799Hb5dirY+AAAAP8GoJL4BYrA+rjb/Pr99Hb4BYrA+rjb/PrsnD75dirY+AAAAP7n8B77dC7k+roAOP7snD77dC7k+roAOP7snD77dC7k+roAOP799Hb50CLM+arsNP8GoJL4LBa0+JvYMP799Hb4LBa0+JvYMP7snD750CLM+arsNP7n8B74XH64++WUcP7snD74XH64++WUcP7snD74XH64++WUcP799Hb46pag+vO8aP8GoJL5dK6M+f3kZP799Hb5dK6M+f3kZP7snD746pag+vO8aP7n8B766epw+wSEpP7snD766epw+wSEpP7snD766epw+wSEpP799Hb7hxpc+DhsnP8GoJL4IE5M+WxQlP799Hb4IE5M+WxQlP7snD77hxpc+DhsnP7n8B77T4IQ+tjk0P7snD77T4IQ+tjk0P7snD77T4IQ+tjk0P799Hb5cE4E+qMUxP8GoJL7Ki3o+mlEvP799Hb7Ki3o+mlEvP7snD75cE4E+qMUxP7n8B74CiVA+Q0g9P7snD74CiVA+Q0g9P7snD74CiVA+Q0g9P799Hb4A1Eo+m4Y6P8GoJL7+HkU+8sQ3P799Hb7+HkU+8sQ3P7snD74A1Eo+m4Y6P7n8B76rgA8+YfxDP7snD76rgA8+YfxDP7snD76rgA8+YfxDP799Hb7ftQs+xgdBP8GoJL4T6wc+KhM+P799Hb4T6wc+KhM+P7snD77ftQs+xgdBP7n8B74pOpI9gRpIP7snD74pOpI9gRpIP7snD74oOpI9gRpIP799Hb6Rco49LwlFP8GoJL75qoo93PdBP799Hb76qoo93PdBP7snD76Rco49LwlFP7n8B74AAMAwAX5JP7snD74AAMAwAX5JP7snD74BAFixAX5JP799Hb4AAICxbWNGP8GoJL4AAMCw2EhDP799Hb4BAFgx2EhDP7snD74AAIAxbWNGP7n8B74pOpK9gRpIP7snD74pOpK9gRpIP7snD74pOpK9gRpIP799Hb6Sco69LwlFP8GoJL75qoq93PdBP799Hb75qoq93PdBP7snD76Qco69LwlFP7n8B76rgA++YfxDP7snD76rgA++YfxDP7snD76rgA++YfxDP799Hb7ftQu+xgdBP8GoJL4T6we+KhM+P799Hb4T6we+KhM+P7snD77ftQu+xgdBP7n8B74CiVC+Q0g9P7snD74CiVC+Q0g9P7snD74CiVC+Q0g9P799Hb4A1Eq+m4Y6P8GoJL7+HkW+8sQ3P799Hb7+HkW+8sQ3P7snD74A1Eq+m4Y6P7n8B77T4IS+tjk0P7snD77T4IS+tjk0P7snD77T4IS+tjk0P799Hb5cE4G+qMUxP8GoJL7Ki3q+mlEvP799Hb7Ki3q+mlEvP7snD75cE4G+qMUxP7n8B766epy+wSEpP7snD766epy+wSEpP7snD766epy+wSEpP799Hb7hxpe+DhsnP8GoJL4IE5O+WxQlP799Hb4IE5O+WxQlP7snD77hxpe+DhsnP7n8B74XH66++WUcP7snD74XH66++WUcP7snD74XH66++WUcP799Hb46pai+vO8aP8GoJL5dK6O+f3kZP799Hb5dK6O+f3kZP7snD746pai+vO8aP7n8B77dC7m+roAOP7snD77dC7m+roAOP7snD77dC7m+roAOP799Hb50CLO+arsNP8GoJL4LBa2+JvYMP799Hb4LBa2+JvYMP7snD750CLO+arsNP7n8B764sry+qWQAP7snD764sry+qWQAP7snD764sry+qWQAP799Hb5dira+AAAAP8GoJL4BYrC+rjb/Pr99Hb4BYrC+rjb/PrsnD75dira+AAAAP7n8B773faU+qWQAP91GQ7/3faU+qWQAP91GQ7/3faU+qWQAP17cRr+bVZ8+AAAAPx+nSL8/LZk+rjb/Pl7cRr8/LZk+rjb/Pt1GQ7+bVZ8+AAAAPxx8Qb9BSaI+xcEMP91GQ79BSaI+xcEMP91GQ79BSaI+xcEMP13cRr/YRZw+gfwLPx+nSL9vQpY+PTcLP17cRr9vQpY+PTcLP91GQ7/YRZw+gfwLPxx8Qb+Mrpg+VPkYP91GQ7+Mrpg+VPkYP91GQ7+Mrpg+VPkYP13cRr+vNJM+F4MXPx+nSL/Suo0+2gwWP17cRr/Suo0+2gwWP91GQ7+vNJM+F4MXPxx8Qb8qL4k+ECkkP91GQ78qL4k+ECkkP91GQ78qL4k+ECkkP13cRr9Re4Q+XSIiPx+nSL/wjn8+qhsgP17cRr/wjn8+qhsgP91GQ79Re4Q+XSIiPxx8Qb8l8Gg+4uUtP91GQ78l8Gg+4uUtP91GQ78l8Gg+4uUtP17cRr83VWE+1HErPx+nSL9Julk+xv0oP17cRr9Julk+xv0oP91GQ783VWE+1HErPxx8Qb/9vzY+i9c1P91GQ7/9vzY+i9c1P91GQ7/9vzY+i9c1P17cRr/7CjE+4xUzPx+nSL/5VSs+O1QwP17cRr/5VSs+O1QwP91GQ7/7CjE+4xUzPxx8Qb+ge/s9+bc7P91GQ7+ge/s9+bc7P91GQ7+ee/s9+bc7P17cRr8H5vM9XsM4Px+nSL9wUOw9ws41P17cRr9wUOw9ws41P91GQ78H5vM9XsM4Pxx8Qb85HoA9vVM/P91GQ785HoA9vVM/P91GQ784HoA9vVM/P13cRr9DrXg9a0I8Px+nSL8THnE9GDE5P17cRr8THnE9GDE5P91GQ79DrXg9a0I8Pxx8Qb8AAICwOYtAP91GQ78AAICwOYtAP91GQ78AAEixOYtAP13cRr8AAECxpHA9Px+nSL8AAIAwEFY6P17cRr8AAHgxEFY6P91GQ78AAEAxpHA9Pxx8Qb85HoC9vVM/P91GQ785HoC9vVM/P91GQ785HoC9vVM/P13cRr9DrXi9a0I8Px+nSL8SHnG9GDE5P17cRr8SHnG9GDE5P91GQ79BrXi9a0I8Pxx8Qb+ee/u9+bc7P91GQ7+ee/u9+bc7P91GQ7+ge/u9+bc7P13cRr8I5vO9XsM4Px+nSL9wUOy9ws41P17cRr9vUOy9ws41P91GQ78H5vO9XsM4Pxx8Qb/9vza+i9c1P91GQ7/9vza+i9c1P91GQ7/9vza+i9c1P13cRr/7CjG+4xUzPx+nSL/5VSu+O1QwP17cRr/5VSu+O1QwP91GQ7/7CjG+4xUzPxx8Qb8l8Gi+4uUtP91GQ78l8Gi+4uUtP91GQ78l8Gi+4uUtP17cRr83VWG+1HErPx+nSL9Julm+xv0oP17cRr9Hulm+xv0oP91GQ783VWG+1HErPxx8Qb8qL4m+ECkkP91GQ78qL4m+ECkkP91GQ78qL4m+ECkkP13cRr9Re4S+XSIiPx+nSL/wjn++qhsgP17cRr/wjn++qhsgP91GQ79Re4S+XSIiPxx8Qb+Mrpi+VPkYP91GQ7+Mrpi+VPkYP91GQ7+Mrpi+VPkYP13cRr+vNJO+F4MXPx+nSL/Suo2+2gwWP17cRr/Suo2+2gwWP91GQ7+vNJO+F4MXPxx8Qb9BSaK+xcEMP91GQ79BSaK+xcEMP91GQ79BSaK+xcEMP17cRr/YRZy+gfwLPx+nSL9vQpa+PTcLP17cRr9vQpa+PTcLP91GQ7/YRZy+gfwLPxx8Qb/3faW+qWQAP91GQ7/3faW+qWQAP91GQ7/3faW+qWQAP13cRr+bVZ++AAAAPx+nSL8/LZm+rjb/Pl7cRr8/LZm+rjb/Pt1GQ7+bVZ++AAAAPxx8Qb9uVcM+VlMDP+SKyr5uVcM+VlMDP+SKyr6VAMs+VlMDPyL2yr4o1s4+AAAAP8Ery76VAMs+U1n5PiL2yr5uVcM+U1n5PuSKyr7bf78+AAAAP0VVyr5TU8A+VlMDPxXcAL9TU8A+VlMDPxXcAL979cc+VlMDPytIAb+Qxss+AAAAPzZ+Ab979cc+U1n5PitIAb9RU8A+U1n5PhXcAL8+grw+AAAAPwqmAL/Babc+VlMDPyB/G7/Babc+VlMDPyB/G7955r4+VlMDPwRaHL/VpMI+AAAAP3bHHL955r4+U1n5PgRaHL/Babc+U1n5PiB/G79lq7M+AAAAP64RG7/Y36g+VlMDPzh3NL/Y36g+VlMDPzh3NL8+GLA+VlMDPzjGNb9wtLM+AAAAP7htNr8+GLA+U1n5PjjGNb/Y36g+U1n5Pjh3NL+mQ6U+AAAAP7jPM7+4LJU+VlMDP13/Sr+4LJU+VlMDP13/Sr/o95s+VlMDP87JTL+BXZ8+AAAAPwivTb/o95s+U1n5Ps7JTL+4LJU+U1n5Pl3/Sr8fx5E+AAAAPyQaSr9p5nk+VlMDPz1mXr9p5nk+VlMDPz1mXr9tGIM+VlMDP9OzYL8KK4Y+AAAAP57aYb9tGIM+U1n5PtOzYL9p5nk+U1n5Pj1mXr8wwXM+AAAAP3I/Xb9j+kE+VlMDP9cUbr9j+kE+VlMDP9cUbr+jW0w+VlMDP3PpcL9BjFE+AAAAP8FTcr+hW0w+U1n5PnPpcL9j+kE+U1n5PtcUbr/DyTw+AAAAP4mqbL9zZgQ+VlMDPy+Veb9zZgQ+VlMDPy+Veb/jEww+VlMDP53ofL+c6g8+AAAAP1WSfr/jEww+U1n5Pp3ofL9yZgQ+U1n5Pi+Veb+6jwA+AAAAP3jrd7+1NYY9VlMDP75LgL+1NYY9VlMDP75LgL+0eI49VlMDPyglgr80mpI9AAAAP9wRg7+0eI49U1n5Piglgr+0NYY9U1n5Pr5LgL80FII9AAAAPxO+fr8AAIAxVlMDP9V4gb8AAIAxVlMDP9V4gb8AAEAwVlMDP1tkg78AACCxAAAAPx1ahL///1+xU1n5Pltkg78AAICwU1n5PtV4gb8AACAxAAAAPxODgL+0NYa9VlMDP75LgL+0NYa9VlMDP75LgL+0eI69VlMDPyglgr80mpK9AAAAP9wRg7+0eI69U1n5Piglgr+0NYa9U1n5Pr5LgL80FIK9AAAAPxO+fr9yZgS+VlMDPy+Veb9yZgS+VlMDPy+Veb/jEwy+VlMDP53ofL+c6g++AAAAP1WSfr/kEwy+U1n5Pp3ofL9zZgS+U1n5Pi+Veb+6jwC+AAAAP3jrd79j+kG+VlMDP9cUbr9j+kG+VlMDP9cUbr+hW0y+VlMDP3PpcL9BjFG+AAAAP8FTcr+jW0y+U1n5PnPpcL9j+kG+U1n5PtcUbr/DyTy+AAAAP4mqbL9p5nm+VlMDPz1mXr9p5nm+VlMDPz1mXr9tGIO+VlMDP9OzYL8KK4a+AAAAP57aYb9tGIO+U1n5PtOzYL9p5nm+U1n5Pj1mXr8wwXO+AAAAP3I/Xb+4LJW+VlMDP13/Sr+4LJW+VlMDP13/Sr/o95u+VlMDP87JTL+BXZ++AAAAPwivTb/o95u+U1n5Ps7JTL+4LJW+U1n5Pl3/Sr8fx5G+AAAAPyQaSr/Y36i+VlMDPzh3NL/Y36i+VlMDPzh3NL8+GLC+VlMDPzjGNb9wtLO+AAAAP7htNr8+GLC+U1n5PjjGNb/Y36i+U1n5Pjh3NL+mQ6W+AAAAP7jPM7/Babe+VlMDPyB/G7/Babe+VlMDPyB/G7955r6+VlMDPwRaHL/VpMK+AAAAP3bHHL955r6+U1n5PgRaHL/Babe+U1n5PiB/G79lq7O+AAAAP64RG79TU8C+VlMDPxXcAL9TU8C+VlMDPxXcAL979ce+VlMDPytIAb+Qxsu+AAAAPzZ+Ab979ce+U1n5PitIAb9RU8C+U1n5PhXcAL8+gry+AAAAPwqmAL/4U8O+VlMDP4LAyr74U8O+VlMDP4LAyr4MAsu+VlMDP4LAyr4X2c6+AAAAP4LAyr4MAsu+U1n5PoLAyr74U8O+U1n5PoLAyr7vfL++AAAAP4LAyr5TU8C+VlMDP9zIk75TU8C+VlMDP9zIk7579ce+VlMDP7Dwkr6Qxsu+AAAAP5qEkr579ce+U1n5PrDwkr5RU8C+U1n5PtzIk74+gry+AAAAP/I0lL7Babe+VlMDP4wFPb7Babe+VlMDP4wFPb555r6+VlMDP/yZOb7VpMK+AAAAPzLkN7555r6+U1n5PvqZOb7Babe+U1n5PosFPb5lq7O+AAAAP1W7Pr7Y36i+VlMDP1dKsr3Y36i+VlMDP1dKsr0+GLC+VlMDP1XSp71wtLO+AAAAP1SWor0+GLC+U1n5PlXSp73Y36i+U1n5PldKsr2mQ6W+AAAAP1iGt724LJW+VlMDP2hmezq4LJW+VlMDP2hmezro95u+VlMDP+9SAjyBXZ++AAAAPzehOzzo95u+U1n5PvVSAjy4LJW+U1n5PpVmezofx5G+AAAAP3hfJrtq5nm+VlMDP80tnT1q5nm+VlMDP80tnT1uGIO+VlMDP3uarz0KK4a+AAAAP9LQuD1tGIO+U1n5Pnyarz1p5nm+U1n5Ps0tnT0wwXO+AAAAP3X3kz1j+kG+VlMDP1BRDT5j+kG+VlMDP1BRDT6jW0y+VlMDP8CjGD5BjFG+AAAAP/dMHj6hW0y+U1n5PsCjGD5j+kG+U1n5PlBRDT7DyTy+AAAAPxmoBz5zZgS+VlMDP69SOz5zZgS+VlMDP69SOz7kEwy+VlMDP2mgSD6c6g++AAAAP0RHTz7jEwy+U1n5PmmgSD5yZgS+U1n5Pq9SOz66jwC+AAAAP9SrND61NYa9VlMDP+lbVz61NYa9VlMDP+lbVz60eI69VlMDPzMnZj4zmpK9AAAAP9qMbT6zeI69U1n5PjMnZj60NYa9U1n5PulbVz41FIK9AAAAP0T2Tz4AAISxVlMDP5zEYD4AAISxVlMDP5zEYD4AAACxVlMDP8QgcD7///8wAAAAP9nOdz4AAJgxU1n5PsQgcD7///8wU1n5PpzEYD4AAACxAAAAP4gWWT60NYY9VlMDP+lbVz60NYY9VlMDP+lbVz6zeI49VlMDPzMnZj4zmpI9AAAAP9qMbT60eI49U1n5PjMnZj61NYY9U1n5PudbVz41FII9AAAAP0T2Tz5yZgQ+VlMDP69SOz5yZgQ+VlMDP69SOz7jEww+VlMDP2mgSD6c6g8+AAAAP0RHTz7kEww+U1n5PmmgSD5zZgQ+U1n5Pq9SOz66jwA+AAAAP9SrND5j+kE+VlMDP1FRDT5j+kE+VlMDP1FRDT6hW0w+VlMDP8CjGD5BjFE+AAAAP/dMHj6jW0w+U1n5Pr+jGD5j+kE+U1n5PlBRDT7DyTw+AAAAPxmoBz5p5nk+VlMDP80tnT1p5nk+VlMDP80tnT1tGIM+VlMDP3yarz0KK4Y+AAAAP9LQuD1tGIM+U1n5Pnuarz1p5nk+U1n5PswtnT0wwXM+AAAAP3b3kz24LJU+VlMDP9Bmezq4LJU+VlMDP9Bmezro95s+VlMDP/NSAjyBXZ8+AAAAPzShOzzo95s+U1n5Pu5SAjy4LJU+U1n5Plxmezofx5E+AAAAP25fJrvY36g+VlMDP1dKsr3Y36g+VlMDP1dKsr0+GLA+VlMDP1XSp71wtLM+AAAAP1SWor0+GLA+U1n5PlXSp73Y36g+U1n5PldKsr2mQ6U+AAAAP1iGt73Babc+VlMDP4sFPb7Babc+VlMDP4sFPb555r4+VlMDP/qZOb7VpMI+AAAAPzLkN7555r4+U1n5PvyZOb7Babc+U1n5PowFPb5lq7M+AAAAP1W7Pr5TU8A+VlMDP9zIk75TU8A+VlMDP9zIk7579cc+VlMDP7Dwkr6Qxss+AAAAP5qEkr579cc+U1n5PrDwkr5TU8A+U1n5PtzIk74+grw+AAAAP/I0lL5uVcM+VlMDPyL2yr5uVcM+VlMDPyL2yr6VAMs+VlMDP+SKyr4o1s4+AAAAP0VVyr6VAMs+U1n5PuSKyr5uVcM+U1n5PiL2yr7bf78+AAAAP8Ery75f/OM+16ZIOw4C279f/OM+16ZIOw4C279f/OM+3qZIO95P3b/2KNw+AAAQMcp23r+NVdQ+1KZIu95P3b+NVdQ+3qZIuw4C27/2KNw+AAAAsSLb2b8OyNg+lCrjPQ4C278OyNg+lCrjPQ4C278OyNg+lCrjPd5P3b91YtE+uizXPcp23r/c/Mk+4S7LPeBP3b/c/Mk+4S7LPQ4C2791YtE+uizXPSLb2b/SBbg+Ul9XPg4C27/SBbg+Ul9XPg4C27/SBbg+Ul9XPt5P3b/5HLI+sKRMPsp23r8gNKw+DupBPuBP3b8gNKw+DupBPg4C27/5HLI+sKRMPiLb2b8FaoU+bLyTPg4C278FaoU+bLyTPg4C278FaoU+bLyTPt5P3b8kaIE+bNWMPsp23r+GzHo+bO6FPuBP3b+GzHo+bO6FPg4C278kaIE+bNWMPiLb2b/4Egw+GkmtPg4C27/4Egw+GkmtPg4C27/4Egw+G0mtPt5P3b/9EAg+V4+lPsp23r8CDwQ+lNWdPuBP3b8CDwQ+lNWdPg4C27/9EAg+V4+lPiLb2b8AAAAwsQ+2Pg4C278AAAAwsQ+2Pg4C27///1+wsQ+2Pt5P3b8AAACxexSuPsp23r+82fIjRRmmPuBP3b8AAJAwRRmmPg4C278AAAAxexSuPiLb2b/4Egy+G0mtPg4C27/4Egy+G0mtPg4C27/4Egy+G0mtPt5P3b/9EAi+V4+lPsp23r8CDwS+lNWdPuBP3b8CDwS+k9WdPg4C27/9EAi+V4+lPiLb2b8FaoW+bLyTPg4C278FaoW+bLyTPg4C278FaoW+bLyTPt5P3b8kaIG+bNWMPsp23r+HzHq+bO6FPuBP3b+GzHq+bO6FPg4C278kaIG+bNWMPiLb2b/SBbi+Ul9XPg4C27/SBbi+Ul9XPg4C27/SBbi+Ul9XPt5P3b/5HLK+sKRMPsp23r8gNKy+DupBPuBP3b8gNKy+DupBPg4C27/5HLK+sKRMPiLb2b8OyNi+lCrjPQ4C278OyNi+lCrjPQ4C278OyNi+lCrjPd5P3b91YtG+uizXPcp23r/c/Mm+4S7LPeBP3b/c/Mm+4S7LPQ4C2791YtG+uizXPSLb2b8rJOS+t6XVMA4C278rJOS+t6XVMA4C278rJOS+mfzkL95P3b/2KNy+kmacsMp23r/BLdS+t6XVsOBP3b/BLdS+kvzkrw4C27/2KNy+k2acMCLb2b8OyNi+kirjvQ4C278OyNi+kirjvQ4C278OyNi+lCrjvd5P3b91YtG+uizXvcp23r/c/Mm+4i7LveBP3b/c/Mm+4S7LvQ4C2791YtG+uizXvSLb2b/SBbi+Ul9Xvg4C27/SBbi+Ul9Xvg4C27/SBbi+Ul9Xvt5P3b/5HLK+sKRMvsp23r8gNKy+DupBvuBP3b8gNKy+DupBvg4C27/5HLK+sKRMviLb2b8FaoW+bLyTvgwC278FaoW+bLyTvgwC278FaoW+bLyTvt5P3b8kaIG+bNWMvsp23r+GzHq+bO6FvuBP3b+GzHq+bO6Fvg4C278kaIG+bNWMviLb2b/4Egy+Gkmtvg4C27/4Egy+Gkmtvg4C27/4Egy+G0mtvt5P3b/9EAi+V4+lvsp23r8CDwS+lNWdvuBP3b8CDwS+k9Wdvg4C27/9EAi+V4+lviLb2b8BAMCwsQ+2vg4C278BAMCwsQ+2vg4C27/1//8usQ+2vt5P3b///38wexSuvsp23r///38wRRmmvuBP3b///x8wRRmmvg4C278BAICwexSuviLb2b/4Egw+GkmtvgwC27/4Egw+GkmtvgwC27/4Egw+G0mtvt5P3b/9EAg+V4+lvsp23r8CDwQ+lNWdvuBP3b8CDwQ+k9Wdvg4C27/9EAg+V4+lviLb2b8FaoU+bLyTvg4C278FaoU+bLyTvg4C278FaoU+bLyTvt5P3b8kaIE+bNWMvsp23r+HzHo+be6FvuBP3b+GzHo+bO6Fvg4C278kaIE+bNWMviLb2b/SBbg+Ul9Xvg4C27/SBbg+Ul9Xvg4C27/SBbg+Ul9Xvt5P3b/5HLI+sKRMvsp23r8gNKw+DupBvuBP3b8gNKw+DupBvg4C27/5HLI+sKRMviLb2b8OyNg+lCrjvQ4C278OyNg+lCrjvQ4C278OyNg+lCrjvd5P3b91YtE+uizXvcp23r/c/Mk+4S7LveBP3b/c/Mk+4S7LvQ4C2791YtE+uizXvSLb2b9f/OM+3qZIuw4C279f/OM+3qZIuw4C279f/OM+3qZIu95P3b/2KNw+AwCAr8p23r+NVdQ+3KZIO+BP3b+NVdQ+3qZIOw4C27/2KNw+DACAriLb2b9f/OM+16ZIO+f7AcBf/OM+16ZIO+f7AcBf/OM+3qZIO9EiA8D2KNw+AAAQMUW2A8CNVdQ+1KZIu9EiA8CNVdQ+3qZIu+f7AcD2KNw+AAAAsXNoAcAOyNg+lCrjPef7AcAOyNg+lCrjPef7AcAOyNg+lCrjPdEiA8B1YtE+uizXPUW2A8Dc/Mk+4S7LPdEiA8Dc/Mk+4S7LPef7AcB1YtE+uizXPXNoAcDSBbg+Ul9XPuf7AcDSBbg+Ul9XPuf7AcDSBbg+Ul9XPtEiA8D5HLI+sKRMPkW2A8AgNKw+DupBPtEiA8AgNKw+DupBPuf7AcD5HLI+sKRMPnNoAcAFaoU+bLyTPuf7AcAFaoU+bLyTPuf7AcAFaoU+bLyTPtEiA8AkaIE+bNWMPkW2A8CGzHo+bO6FPtEiA8CGzHo+bO6FPuf7AcAkaIE+bNWMPnNoAcD4Egw+GkmtPuf7AcD4Egw+GkmtPuf7AcD4Egw+G0mtPtEiA8D9EAg+V4+lPkW2A8ACDwQ+lNWdPtEiA8ACDwQ+lNWdPuf7AcD9EAg+V4+lPnNoAcAAAAAwsQ+2Puf7AcAAAAAwsQ+2Puf7AcD//1+wsQ+2PtEiA8AAAACxexSuPkW2A8C82fIjRRmmPtEiA8AAAJAwRRmmPuf7AcAAAAAxexSuPnNoAcD4Egy+G0mtPuf7AcD4Egy+G0mtPuf7AcD4Egy+G0mtPtEiA8D9EAi+V4+lPkW2A8ACDwS+lNWdPtEiA8ACDwS+k9WdPuf7AcD9EAi+V4+lPnNoAcAFaoW+bLyTPuf7AcAFaoW+bLyTPuf7AcAFaoW+bLyTPtEiA8AkaIG+bNWMPkW2A8CHzHq+bO6FPtEiA8CGzHq+bO6FPuf7AcAkaIG+bNWMPnNoAcDSBbi+Ul9XPuf7AcDSBbi+Ul9XPuf7AcDSBbi+Ul9XPtEiA8D5HLK+sKRMPkW2A8AgNKy+DupBPtEiA8AgNKy+DupBPuf7AcD5HLK+sKRMPnNoAcAOyNi+lCrjPef7AcAOyNi+lCrjPef7AcAOyNi+lCrjPdEiA8B1YtG+uizXPUW2A8Dc/Mm+4S7LPdEiA8Dc/Mm+4S7LPef7AcB1YtG+uizXPXNoAcArJOS+t6XVMOf7AcArJOS+t6XVMOf7AcArJOS+mfzkL9EiA8D2KNy+kmacsEW2A8DBLdS+t6XVsNEiA8DBLdS+kvzkr+f7AcD2KNy+k2acMHNoAcAOyNi+kirjvef7AcAOyNi+kirjvef7AcAOyNi+lCrjvdEiA8B1YtG+uizXvUW2A8Dc/Mm+4i7LvdEiA8Dc/Mm+4S7Lvef7AcB1YtG+uizXvXNoAcDSBbi+Ul9Xvuf7AcDSBbi+Ul9Xvuf7AcDSBbi+Ul9XvtEiA8D5HLK+sKRMvkW2A8AgNKy+DupBvtEiA8AgNKy+DupBvuf7AcD5HLK+sKRMvnNoAcAFaoW+bLyTvuf7AcAFaoW+bLyTvuf7AcAFaoW+bLyTvtEiA8AkaIG+bNWMvkW2A8CGzHq+bO6FvtEiA8CGzHq+bO6Fvuf7AcAkaIG+bNWMvnNoAcD4Egy+Gkmtvuf7AcD4Egy+Gkmtvuf7AcD4Egy+G0mtvtEiA8D9EAi+V4+lvkW2A8ACDwS+lNWdvtEiA8ACDwS+k9Wdvuf7AcD9EAi+V4+lvnNoAcABAMCwsQ+2vuf7AcABAMCwsQ+2vuf7AcD1//8usQ+2vtEiA8D//38wexSuvkW2A8D//38wRRmmvtEiA8D//x8wRRmmvuf7AcABAICwexSuvnNoAcD4Egw+Gkmtvuf7AcD4Egw+Gkmtvuf7AcD4Egw+G0mtvtEiA8D9EAg+V4+lvkW2A8ACDwQ+lNWdvtEiA8ACDwQ+k9Wdvuf7AcD9EAg+V4+lvnNoAcAFaoU+bLyTvuf7AcAFaoU+bLyTvuf7AcAFaoU+bLyTvtEiA8AkaIE+bNWMvkW2A8CHzHo+be6FvtEiA8CGzHo+bO6Fvuf7AcAkaIE+bNWMvnNoAcDSBbg+Ul9Xvuf7AcDSBbg+Ul9Xvuf7AcDSBbg+Ul9XvtEiA8D5HLI+sKRMvkW2A8AgNKw+DupBvtEiA8AgNKw+DupBvuf7AcD5HLI+sKRMvnNoAcAOyNg+lCrjvef7AcAOyNg+lCrjvef7AcAOyNg+lCrjvdEiA8B1YtE+uizXvUW2A8Dc/Mk+4S7LvdEiA8Dc/Mk+4S7Lvef7AcB1YtE+uizXvXNoAcBf/OM+3qZIu+f7AcBf/OM+3qZIu+f7AcBf/OM+3qZIu9EiA8D2KNw+AwCAr0W2A8CNVdQ+3KZIO9EiA8CNVdQ+3qZIO+f7AcD2KNw+DACArnNoAcBcsuK+8neMPfwZYb9csuK+8neMPfwZYb9csuK+8neMPfwZYb8jgg2/Ija7vWOAR78jgg2/Ija7vWOAR78jgg2/Ija7vWOAR7/cDdW+46N2PRwHXb/cDdW+46N2PRwHXb/jrwa/I1zMvYNtQ7/jrwa/I1zMvYNtQ78ok8i+C9cjPbVxXr8ok8i+C9cjPbVxXr+JcgC/j8L1vRzYRL+JcgC/j8L1vRzYRL+rkcS+aRSiPGCFZL+rkcS+aRSiPGCFZL+X4/y+fZQPvsfrSr+X4/y+fZQPvsfrSr8eYsu+v/g6PNKya78eYsu+v/g6PNKya78E2gG/ficYvjkZUr8E2gG/ficYvjkZUr+eBtm+ZhSiPLLFb7+eBtm+ZhSiPLLFb79ErAi/fpQPvhksVr9ErAi/fpQPvhksVr9SgeW+CdcjPRlbbr9SgeW+CdcjPRlbbr+e6Q6/j8L1vYDBVL+e6Q6/j8L1vYDBVL/Ngum+4KN2PW5HaL/Ngum+4KN2PW5HaL9d6hC/JFzMvdWtTr9d6hC/JFzMvdWtTr9csuK+8neMPaH9jb9csuK+8neMPaH9jb9csuK+8neMPaH9jb8jgg2/Hza7vdQwgb8jgg2/Hza7vdQwgb8jgg2/Hza7vdQwgb/cDdW+4KN2PTH0i7/cDdW+4KN2PTH0i7/jrwa/IVzMvclOfr/jrwa/IVzMvclOfr8ok8i+CdcjPX6pjL8ok8i+CdcjPX6pjL+KcgC/jML1vWK5f7+KcgC/jML1vWK5f7+rkcS+YBSiPFOzj7+rkcS+YBSiPFOzj7+X4/y+fJQPvofmgr+X4/y+fJQPvofmgr8eYsu+qPg6PAxKk78eYsu+qPg6PAxKk78E2gG/ficYvkB9hr8E2gG/ficYvkB9hr+eBtm+XRSiPHxTlb+eBtm+XRSiPHxTlb9ErAi/fZQPvrCGiL9ErAi/fZQPvrCGiL9QgeW+BtcjPS+elL9QgeW+BtcjPS+elL+e6Q6/j8L1vWPRh7+e6Q6/j8L1vWPRh7/Ngum+3aN2PVqUkb/Ngum+3aN2PVqUkb9d6hC/I1zMvY7HhL9d6hC/I1zMvY7HhL9csuK+8neMPUVuq79csuK+8neMPUVuq79csuK+8neMPUVuq78jgg2/Hza7vXihnr8jgg2/Hza7vXihnr8jgg2/Hza7vXihnr/cDdW+4KN2PdVkqb/cDdW+4KN2PdVkqb/jrwa/IVzMvQiYnL/jrwa/IVzMvQiYnL8ok8i+CdcjPSEaqr8ok8i+CdcjPSEaqr+KcgC/jML1vVVNnb+KcgC/jML1vVVNnb+rkcS+YBSiPPcjrb+rkcS+YBSiPPcjrb+X4/y+fJQPvipXoL+X4/y+fJQPvipXoL8eYsu+qPg6PLC6sL8eYsu+qPg6PLC6sL8E2gG/ficYvuPto78E2gG/ficYvuPto7+eBtm+XRSiPCDEsr+eBtm+XRSiPCDEsr9ErAi/fZQPvlP3pb9ErAi/fZQPvlP3pb9QgeW+BtcjPdMOsr9QgeW+BtcjPdMOsr+e6Q6/j8L1vQdCpb+e6Q6/j8L1vQdCpb/Ngum+3aN2Pf4Er7/Ngum+3aN2Pf4Er79d6hC/I1zMvTE4or9d6hC/I1zMvTE4or8kVOO+FXFXPuwqc78kVOO+FXFXPuwqc7+neOm+FXFXPno7c7/riuy+zcxMPsFDc7+neOm+hShCPno7c78kVOO+hShCPuwqc7/iQeC+zcxMPqYic7/Xku2+SXFXPnLFsbnXku2+SXFXPnLFsbmotPO+2XBXPpLb1Tmnxfa+XsxMPozQQzrXtPO+UihCPoPFsTkHk+2+wShCPpPb1bkIguq+O81MPozQQ7on+Xm+5jNNPhHavz8n+Xm+5jNNPhHavz9QBYO+XDNNPhkkwD+8CIa+0Y5CPghKwD9tA4O+0uo3Pu8lwD9h9Xm+XOs3Pujbvz+G7nO+5o9CPvi1vz9W9l29o3BXPncaE0BW9l29o3BXPncaE0Bc5Ia9IXFXPuVHE0B4ypK9S81MPqFgE0Bkx4a9+ShCPu9LE0BmvF29eihCPoEeE0As8EW9UcxMPsUFE0BALWe+0DIjvgsZY79ALWe+0DIjvgsZY79ALWe+0DIjvgsZY7+elvO+01EUv8Z5p76elvO+01EUv8Z5p76elvO+01EUv8Z5p76M61S+g2Ipvl84Yr+M61S+g2Ipvl84Yr/Edeq+wd0Vv224pb7Edeq+wd0Vv224pb5Y50m+7FE4voDKY79Y50m+7FE4voDKY7+r8+S+mpkZv7LcqL6r8+S+mpkZv7LcqL6ylEy+VUFHvuPjZr+ylEy+VUFHvuPjZr9YSua+dFUdv3QPr75YSua+dFUdv3QPr74fYlu+CHFNvsGzab8fYlu+CHFNvsGzab8Pse2+YuEevzOvtL4Pse2+YuEevzOvtL7Uo22+VUFHvm6Uar/Uo22+VUFHvm6Uar/p0fa+dFUdv4xwtr7p0fa+dFUdv4xwtr4IqHi+7FE4vksCab8IqHi+7FE4vksCab8CVPy+mpkZv0dMs74CVPy+mpkZv0dMs76u+nW+g2IpvuroZb+u+nW+g2IpvuroZb9V/fq+wd0Vv4UZrb5V/fq+wd0Vv4UZrb4Urse+LbIdv3sUrr4Urse+LbIdv3sUrr4Urse+LbIdv3sUrr6F6xG/LbIdv3sUrr6F6xG/LbIdv3sUrr6F6xG/LbIdv3sUrr4Urse+tr4hv6iHmr4Urse+tr4hv6iHmr6F6xG/tr4hv6mHmr6F6xG/tr4hv6mHmr4Urse+H4Urv5hukr4Urse+H4Urv5hukr6F6xG/H4Urv5hukr6F6xG/H4Urv5hukr4Urse+iEs1v6iHmr4Urse+iEs1v6iHmr6F6xG/iEs1v6mHmr6F6xG/iEs1v6mHmr4Urse+EFg5v3sUrr4Urse+EFg5v3sUrr6F6xG/EFg5v3sUrr6F6xG/EFg5v3sUrr4Urse+iEs1v02hwb4Urse+iEs1v02hwb6F6xG/iEs1v02hwb6F6xG/iEs1v02hwb4Urse+H4Urv166yb4Urse+H4Urv166yb6F6xG/H4Urv166yb6F6xG/H4Urv166yb4Urse+tr4hv02hwb4Urse+tr4hv02hwb6F6xG/tr4hv02hwb6F6xG/tr4hv02hwb7SIlu9ioDIPgCsC0DSIlu9ioDIPgCsC0D//3+9ioDIPgCsC0BMN4m9FK7HPvYoDEAAAIC9ntvGPuylDEDSIlu9ntvGPuylDEA4tEi9FK7HPvYoDEDSIlu984dFP7jKEEDSIlu984dFP7jKEED//3+984dFP7jKEEBMN4m9uR5FP65HEUAAAIC9fbVEP6TEEUDSIlu9fbVEP6TEEUA4tEi9uR5FP65HEUBcsuI+8neMPfwZYb9csuI+8neMPfwZYb9csuI+8neMPfwZYb8jgg0/Ija7vWOAR78jgg0/Ija7vWOAR78jgg0/Ija7vWOAR7/Nguk+4KN2PW5HaL/Nguk+4KN2PW5HaL9d6hA/JFzMvdWtTr9d6hA/JFzMvdWtTr9SgeU+CdcjPRlbbr9SgeU+CdcjPRlbbr+e6Q4/j8L1vYDBVL+e6Q4/j8L1vYDBVL+eBtk+ZhSiPLLFb7+eBtk+ZhSiPLLFb79ErAg/fpQPvhksVr9ErAg/fpQPvhksVr8eYss+v/g6PNKya78eYss+v/g6PNKya78E2gE/ficYvjkZUr8E2gE/ficYvjkZUr+rkcQ+aRSiPGCFZL+rkcQ+aRSiPGCFZL+X4/w+fZQPvsfrSr+X4/w+fZQPvsfrSr8ok8g+C9cjPbVxXr8ok8g+C9cjPbVxXr+JcgA/j8L1vRzYRL+JcgA/j8L1vRzYRL/cDdU+46N2PRwHXb/cDdU+46N2PRwHXb/jrwY/I1zMvYNtQ7/jrwY/I1zMvYNtQ79csuI+8neMPaH9jb9csuI+8neMPaH9jb9csuI+8neMPaH9jb8jgg0/Hza7vdQwgb8jgg0/Hza7vdQwgb8jgg0/Hza7vdQwgb/Nguk+3aN2PVqUkb/Nguk+3aN2PVqUkb9d6hA/I1zMvY7HhL9d6hA/I1zMvY7HhL9QgeU+BtcjPS+elL9QgeU+BtcjPS+elL+e6Q4/j8L1vWPRh7+e6Q4/j8L1vWPRh7+eBtk+XRSiPHxTlb+eBtk+XRSiPHxTlb9ErAg/fZQPvrCGiL9ErAg/fZQPvrCGiL8eYss+qPg6PAxKk78eYss+qPg6PAxKk78E2gE/ficYvkB9hr8E2gE/ficYvkB9hr+rkcQ+YBSiPFOzj7+rkcQ+YBSiPFOzj7+X4/w+fJQPvofmgr+X4/w+fJQPvofmgr8ok8g+CdcjPX6pjL8ok8g+CdcjPX6pjL+KcgA/jML1vWK5f7+KcgA/jML1vWK5f7/cDdU+4KN2PTH0i7/cDdU+4KN2PTH0i7/jrwY/IVzMvclOfr/jrwY/IVzMvclOfr9csuI+8neMPUVuq79csuI+8neMPUVuq79csuI+8neMPUVuq78jgg0/Hza7vXihnr8jgg0/Hza7vXihnr8jgg0/Hza7vXihnr/Nguk+3aN2Pf4Er7/Nguk+3aN2Pf4Er79d6hA/I1zMvTE4or9d6hA/I1zMvTE4or9QgeU+BtcjPdMOsr9QgeU+BtcjPdMOsr+e6Q4/j8L1vQdCpb+e6Q4/j8L1vQdCpb+eBtk+XRSiPCDEsr+eBtk+XRSiPCDEsr9ErAg/fZQPvlP3pb9ErAg/fZQPvlP3pb8eYss+qPg6PLC6sL8eYss+qPg6PLC6sL8E2gE/ficYvuPto78E2gE/ficYvuPto7+rkcQ+YBSiPPcjrb+rkcQ+YBSiPPcjrb+X4/w+fJQPvipXoL+X4/w+fJQPvipXoL8ok8g+CdcjPSEaqr8ok8g+CdcjPSEaqr+KcgA/jML1vVVNnb+KcgA/jML1vVVNnb/cDdU+4KN2PdVkqb/cDdU+4KN2PdVkqb/jrwY/IVzMvQiYnL/jrwY/IVzMvQiYnL+neOk+FXFXPno7c7+neOk+FXFXPno7c78kVOM+FXFXPuwqc7/iQeA+zcxMPqYic78kVOM+hShCPuwqc7+neOk+hShCPno7c7/riuw+zcxMPsFDc7+otPM+2XBXPpLb1TmotPM+2XBXPpLb1TnXku0+SXFXPnLFsbkIguo+O81MPorQQ7oHk+0+wShCPpPb1bnXtPM+UihCPnLFsTmnxfY+XsxMPozQQzpQBYM+XDNNPhkkwD9QBYM+XDNNPhkkwD8n+Xk+5jNNPhHavz+G7nM+5o9CPvi1vz9f9Xk+XOs3Pujbvz9tA4M+0uo3Pu8lwD+8CIY+0Y5CPghKwD9c5IY9IXFXPuVHE0Bc5IY9IXFXPuVHE0BW9l09o3BXPncaE0As8EU9UcxMPsUFE0BmvF09eihCPoEeE0Bkx4Y99yhCPu9LE0B4ypI9Ss1MPqFgE0BALWc+0DIjvgsZY79ALWc+0DIjvgsZY79ALWc+0DIjvgsZY7+elvM+01EUv8Z5p76elvM+01EUv8Z5p76elvM+01EUv8Z5p76u+nU+g2IpvuroZb+u+nU+g2IpvuroZb9V/fo+wd0Vv4UZrb5V/fo+wd0Vv4UZrb4IqHg+7FE4vksCab8IqHg+7FE4vksCab8CVPw+mpkZv0dMs74CVPw+mpkZv0dMs77Uo20+VUFHvm6Uar/Uo20+VUFHvm6Uar/p0fY+dFUdv4xwtr7p0fY+dFUdv4xwtr4fYls+CHFNvsGzab8fYls+CHFNvsGzab8Pse0+YuEevzOvtL4Pse0+YuEevzOvtL6ylEw+VUFHvuPjZr+ylEw+VUFHvuPjZr9YSuY+dFUdv3QPr75YSuY+dFUdv3QPr75Y50k+7FE4voDKY79Y50k+7FE4voDKY7+r8+Q+mpkZv7LcqL6r8+Q+mpkZv7LcqL6M61Q+g2Ipvl84Yr+M61Q+g2Ipvl84Yr/Edeo+wd0Vv224pb7Edeo+wd0Vv224pb4Ursc+LbIdv3sUrr4Ursc+LbIdv3sUrr4Ursc+LbIdv3sUrr6F6xE/LbIdv3sUrr6F6xE/LbIdv3sUrr6F6xE/LbIdv3sUrr4Ursc+tr4hv02hwb4Ursc+tr4hv02hwb6F6xE/tr4hv02hwb6F6xE/tr4hv02hwb4Ursc+H4Urv166yb4Ursc+H4Urv166yb6F6xE/H4Urv166yb6F6xE/H4Urv166yb4Ursc+iEs1v02hwb4Ursc+iEs1v02hwb6F6xE/iEs1v02hwb6F6xE/iEs1v02hwb4Ursc+EFg5v3sUrr4Ursc+EFg5v3sUrr6F6xE/EFg5v3sUrr6F6xE/EFg5v3sUrr4Ursc+iEs1v6iHmr4Ursc+iEs1v6iHmr6F6xE/iEs1v6mHmr6F6xE/iEs1v6mHmr4Ursc+H4Urv5hukr4Ursc+H4Urv5hukr6F6xE/H4Urv5hukr6F6xE/H4Urv5hukr4Ursc+tr4hv6iHmr4Ursc+tr4hv6iHmr6F6xE/tr4hv6mHmr6F6xE/tr4hv6mHmr7//389ioDIPgCsC0D//389ioDIPgCsC0DSIls9ioDIPgCsC0A4tEg9FK7HPvYoDEDQIls9ntvGPuylDED//389ntvGPuylDEBMN4k9FK7HPvYoDED//38984dFP7jKEED//38984dFP7jKEEDSIls984dFP7jKEEA4tEg9uR5FP65HEUDQIls9fbVEP6TEEUD//389fbVEP6TEEUBMN4k9uR5FP65HEUAAAAAALoNsv/zvwz4AAAAAAACAvwAAAABYcaa+kVdjv1hxpj7878O+LoNsvwAAAAAAAAAAAAAAAAAAgD8AAAAA/O/Dvi6DbD9Ycaa+WHGmvpFXYz/878O+AAAAAC6DbD+RV2O/WHGmvlhxpj4ug2y/AAAAAPzvwz4ug2y//O/DvgAAAAAAAIC/AAAAAAAAAAAAAAAA/O/Dvi6DbD8AAAAALoNsv/zvwz5Ycaa+WHGmvpFXYz9Ycaa+kVdjv1hxpj5Ycaa+WHGmvpFXYz9Ycaa+kVdjv1hxpj6RV2O/WHGmvlhxpj5Ycaa+WHGmvpFXYz/878O+AAAAAC6DbD+RV2O/WHGmvlhxpj4ug2y/AAAAAPzvwz5Ycaa+kVdjv1hxpj7878O+LoNsvwAAAACRV2O/WHGmvlhxpj4ug2y//O/DvgAAAAAAAAAAAAAAAAAAgD8AAAAA/O/DPi6DbD9Ycaa+WHGmPpFXYz/878O+AAAAAC6DbD8AAAAALoNsP/zvwz4AAAAAAACAPwAAAABYcaa+kVdjP1hxpj7878O+LoNsPwAAAACRV2O/WHGmPlhxpj4ug2y/AAAAAPzvwz4ug2y//O/DPgAAAAAAAIC/AAAAAAAAAAAAAAAA/O/DPi6DbD8AAAAALoNsP/zvwz5Ycaa+WHGmPpFXYz9Ycaa+kVdjP1hxpj5Ycaa+WHGmPpFXYz9Ycaa+kVdjP1hxpj6RV2O/WHGmPlhxpj5Ycaa+kVdjP1hxpj7878O+LoNsPwAAAACRV2O/WHGmPlhxpj4ug2y//O/DPgAAAABYcaa+WHGmPpFXYz/878O+AAAAAC6DbD+RV2O/WHGmPlhxpj4ug2y/AAAAAPzvwz4AAAAALoNsv/zvw74AAAAAAACAvwAAAABYcaa+kVdjv1hxpr7878O+LoNsvwAAAACRV2O/WHGmvlhxpr4ug2y/AAAAAPzvw74ug2y//O/DvgAAAAAAAIC/AAAAAAAAAAAAAAAAAAAAAAAAgL8AAAAA/O/Dvi6DbL9Ycaa+WHGmvpFXY7/878O+AAAAAC6DbL9Ycaa+kVdjv1hxpr7878O+LoNsvwAAAACRV2O/WHGmvlhxpr4ug2y//O/DvgAAAABYcaa+WHGmvpFXY79Ycaa+kVdjv1hxpr6RV2O/WHGmvlhxpr5Ycaa+WHGmvpFXY7/878O+AAAAAC6DbL+RV2O/WHGmvlhxpr4ug2y/AAAAAPzvw74AAAAA/O/Dvi6DbL8AAAAALoNsv/zvw75Ycaa+WHGmvpFXY79Ycaa+kVdjv1hxpr4AAAAALoNsP/zvw74AAAAAAACAPwAAAABYcaa+kVdjP1hxpr7878O+LoNsPwAAAAAAAAAAAAAAAAAAgL8AAAAA/O/DPi6DbL9Ycaa+WHGmPpFXY7/878O+AAAAAC6DbL+RV2O/WHGmPlhxpr4ug2y/AAAAAPzvw74ug2y//O/DPgAAAAAAAIC/AAAAAAAAAAAAAAAA/O/DPi6DbL8AAAAALoNsP/zvw75Ycaa+WHGmPpFXY79Ycaa+kVdjP1hxpr5Ycaa+WHGmPpFXY79Ycaa+kVdjP1hxpr6RV2O/WHGmPlhxpr5Ycaa+WHGmPpFXY7/878O+AAAAAC6DbL+RV2O/WHGmPlhxpr4ug2y/AAAAAPzvw75Ycaa+kVdjP1hxpr7878O+LoNsPwAAAACRV2O/WHGmPlhxpr4ug2y//O/DPgAAAAAAAAAALoNsv/zvwz4AAAAAAACAvwAAAABYcaY+kVdjv1hxpj7878M+LoNsvwAAAACRV2M/WHGmvlhxpj4ug2w/AAAAAPzvwz4ug2w//O/DvgAAAAAAAIA/AAAAAAAAAAAAAAAAAAAAAAAAgD8AAAAA/O/Dvi6DbD9YcaY+WHGmvpFXYz/878M+AAAAAC6DbD9YcaY+kVdjv1hxpj7878M+LoNsvwAAAACRV2M/WHGmvlhxpj4ug2w//O/DvgAAAABYcaY+WHGmvpFXYz9YcaY+kVdjv1hxpj6RV2M/WHGmvlhxpj5YcaY+WHGmvpFXYz/878M+AAAAAC6DbD+RV2M/WHGmvlhxpj4ug2w/AAAAAPzvwz4AAAAA/O/Dvi6DbD8AAAAALoNsv/zvwz5YcaY+WHGmvpFXYz9YcaY+kVdjv1hxpj4AAAAALoNsP/zvwz4AAAAAAACAPwAAAABYcaY+kVdjP1hxpj7878M+LoNsPwAAAAAAAAAAAAAAAAAAgD8AAAAA/O/DPi6DbD9YcaY+WHGmPpFXYz/878M+AAAAAC6DbD+RV2M/WHGmPlhxpj4ug2w/AAAAAPzvwz4ug2w//O/DPgAAAAAAAIA/AAAAAAAAAAAAAAAA/O/DPi6DbD8AAAAALoNsP/zvwz5YcaY+WHGmPpFXYz9YcaY+kVdjP1hxpj5YcaY+WHGmPpFXYz9YcaY+kVdjP1hxpj6RV2M/WHGmPlhxpj5YcaY+WHGmPpFXYz/878M+AAAAAC6DbD+RV2M/WHGmPlhxpj4ug2w/AAAAAPzvwz5YcaY+kVdjP1hxpj7878M+LoNsPwAAAACRV2M/WHGmPlhxpj4ug2w//O/DPgAAAAAAAAAALoNsv/zvw74AAAAAAACAvwAAAABYcaY+kVdjv1hxpr7878M+LoNsvwAAAAAAAAAAAAAAAAAAgL8AAAAA/O/Dvi6DbL9YcaY+WHGmvpFXY7/878M+AAAAAC6DbL+RV2M/WHGmvlhxpr4ug2w/AAAAAPzvw74ug2w//O/DvgAAAAAAAIA/AAAAAAAAAAAAAAAA/O/Dvi6DbL8AAAAALoNsv/zvw75YcaY+WHGmvpFXY79YcaY+kVdjv1hxpr5YcaY+WHGmvpFXY79YcaY+kVdjv1hxpr6RV2M/WHGmvlhxpr5YcaY+WHGmvpFXY7/878M+AAAAAC6DbL+RV2M/WHGmvlhxpr4ug2w/AAAAAPzvw75YcaY+kVdjv1hxpr7878M+LoNsvwAAAACRV2M/WHGmvlhxpr4ug2w//O/DvgAAAAAAAAAALoNsP/zvw74AAAAAAACAPwAAAABYcaY+kVdjP1hxpr7878M+LoNsPwAAAACRV2M/WHGmPlhxpr4ug2w/AAAAAPzvw74ug2w//O/DPgAAAAAAAIA/AAAAAAAAAAAAAAAAAAAAAAAAgL8AAAAA/O/DPi6DbL9YcaY+WHGmPpFXY7/878M+AAAAAC6DbL9YcaY+kVdjP1hxpr7878M+LoNsPwAAAACRV2M/WHGmPlhxpr4ug2w//O/DPgAAAABYcaY+WHGmPpFXY79YcaY+kVdjP1hxpr6RV2M/WHGmPlhxpr5YcaY+WHGmPpFXY7/878M+AAAAAC6DbL+RV2M/WHGmPlhxpr4ug2w/AAAAAPzvw74AAAAA/O/DPi6DbL8AAAAALoNsP/zvw75YcaY+WHGmPpFXY79YcaY+kVdjP1hxpr4AAAAAUddBP6U3J78AAAAAUddBP6U3J78AAAAAUddBP6U3J78AAAAAUddBP6U3Jz8AAAAAUddBP6U3Jz8AAAAAUddBP6U3Jz8V2cE+BN0nPys5J78V2cE+BN0nPys5J78V2cE+BN0nPys5Jz8V2cE+BN0nPys5Jz8E3Sc/FdnBPis5J78E3Sc/FdnBPis5J78E3Sc/FdnBPis5Jz8E3Sc/FdnBPis5Jz9R10E/AAAAAKU3J79R10E/AAAAAKU3J79R10E/AAAAAKU3Jz9R10E/AAAAAKU3Jz8E3Sc/FdnBvis5J78E3Sc/FdnBvis5J78E3Sc/FdnBvis5Jz8E3Sc/FdnBvis5Jz8V2cE+BN0nvys5J78V2cE+BN0nvys5J78V2cE+BN0nvys5Jz8V2cE+BN0nvys5Jz8AAAAAUddBv6U3J78AAAAAUddBv6U3J78AAAAAUddBv6U3Jz8AAAAAUddBv6U3Jz8V2cG+BN0nvys5J78V2cG+BN0nvys5J78V2cG+BN0nvys5Jz8V2cG+BN0nvys5Jz8E3Se/FdnBvis5J78E3Se/FdnBvis5J78E3Se/FdnBvis5Jz8E3Se/FdnBvis5Jz9R10G/AAAAAKU3J79R10G/AAAAAKU3J79R10G/AAAAAKU3Jz9R10G/AAAAAKU3Jz8E3Se/FdnBPis5J78E3Se/FdnBPis5J78E3Se/FdnBPis5Jz8E3Se/FdnBPis5Jz8V2cG+BN0nPys5J78V2cG+BN0nPys5J78V2cG+BN0nPys5Jz8V2cG+BN0nPys5Jz8AAAAAUddBP6U3J78AAAAAUddBP6U3J78AAAAAUddBP6U3J78AAAAAUddBP6U3Jz8AAAAAUddBP6U3Jz8AAAAAUddBP6U3Jz8V2cE+BN0nPys5J78V2cE+BN0nPys5J78V2cE+BN0nPys5Jz8V2cE+BN0nPys5Jz8E3Sc/FdnBPis5J78E3Sc/FdnBPis5J78E3Sc/FdnBPis5Jz8E3Sc/FdnBPis5Jz9R10E/AAAAAKU3J79R10E/AAAAAKU3J79R10E/AAAAAKU3Jz9R10E/AAAAAKU3Jz8E3Sc/FdnBvis5J78E3Sc/FdnBvis5J78E3Sc/FdnBvis5Jz8E3Sc/FdnBvis5Jz8V2cE+BN0nvys5J78V2cE+BN0nvys5J78V2cE+BN0nvys5Jz8V2cE+BN0nvys5Jz8AAAAAUddBv6U3J78AAAAAUddBv6U3J78AAAAAUddBv6U3Jz8AAAAA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AACAPgAAAAAAAIA+AACAPwAAgD5VVVU/AACAPqqqKj8AAIA+AAAAPwAAgD6qqqo+AACAPqyqKj4AAKA+AAAAAAAAoD4AAIA/AACgPlVVVT8AAKA+qqoqPwAAoD4AAAA/AACgPqqqqj4AAKA+rKoqPgAAwD4AAAAAAADAPgAAgD8AAMA+VVVVPwAAwD6qqio/AADAPgAAAD8AAMA+qqqqPgAAwD6sqio+AADgPgAAAAAAAOA+AACAPwAA4D5VVVU/AADgPqqqKj8AAOA+AAAAPwAA4D6qqqo+AADgPqyqKj4AAAA/AAAAAAAAAD8AAIA/AAAAP1VVVT8AAAA/qqoqPwAAAD8AAAA/AAAAP6qqqj4AAAA/rKoqPgAAED8AAAAAAAAQPwAAgD8AABA/VVVVPwAAED+qqio/AAAQPwAAAD8AABA/qqqqPgAAED+sqio+AAAgPwAAAAAAACA/AACAPwAAID9VVVU/AAAgP6qqKj8AACA/AAAAPwAAID+qqqo+AAAgP6yqKj4AADA/AAAAAAAAMD8AAIA/AAAwP1VVVT8AADA/qqoqPwAAMD8AAAA/AAAwP6qqqj4AADA/rKoqPgAAQD8AAAAAAABAPwAAgD8AAEA/VVVVPwAAQD+qqio/AABAPwAAAD8AAEA/qqqqPgAAQD+sqio+AABQPwAAAAAAAFA/AACAPwAAUD9VVVU/AABQP6qqKj8AAFA/AAAAPwAAUD+qqqo+AABQP6yqKj4AAGA/AAAAAAAAYD8AAIA/AABgP1VVVT8AAGA/qqoqPwAAYD8AAAA/AABgP6qqqj4AAGA/rKoqPgAAcD8AAAAAAABwPwAAgD8AAHA/VVVVPwAAcD+qqio/AABwPwAAAD8AAHA/qqqqPgAAcD+sqio+AACAPwAAAAAAAIA/AACAPwAAgD9VVVU/AACAP6qqKj8AAIA/AAAAPwAAgD+qqqo+AACAP6yqKj4AAAAAAAAAAAAAAAAAAIA/AAAAAFVVVT8AAAAAqqoqPwAAAAAAAAA/AAAAAKqqqj4AAAAArKoqPgAAgD0AAAAAAACAPQAAgD8AAIA9VVVVPwAAgD2qqio/AACAPQAAAD8AAIA9qqqqPgAAgD2sqio+AAAAPgAAAAAAAAA+AACAPwAAAD5VVVU/AAAAPqqqKj8AAAA+AAAAPwAAAD6qqqo+AAAAPqyqKj4AAEA+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PwCnAFEAvQDVAFEA1QBeAF0A1ADGAF0AxgBWAMIAqwC4AMIAuADTANEAtgCpANEAqQDIAG8ApQC6AG8AugB5AHsAvACsAHsArAByAMAAigCfAMAAnwDKAMwAoQCRAMwAkQDDAI4AdwCAAI4AgACbAJ0AggBxAJ0AcQCQAAAAbACEAAAAhAANAAwAgwB1AAwAdQAFAIcAHwAoAIcAKACUAJMAJwAcAJMAHACMADcAowBtADcAbQABAAsAJgBcAAsAXAA9AHQAiwAbAHQAGwAEAL4AUgAgAL4AIACIAD4AVQDFAD4AxQCmAK0AxACSAK0AkgBzANoA3QDhANoA4QDfAN8A4QDlAN8A5QDiAOIA5QDpAOIA6QDmAOYA6QDtAOYA7QDqAOoA7QDxAOoA8QDuAO4A8QD1AO4A9QDyAPIA9QD5APIA+QD2APYA+QD9APYA/QD6APoA/QABAfoAAQH+AP4AAQEFAf4ABQECAeQA4ADcANwACQEEAQQBAAH8APwA+AD0APQA8ADsAOwA6ADkAOQA3AAEAQQB/AD0APQA7ADkAAQB9ADkAAIBBQEIAQIBCAEGAQYBCAHbAAYB2wDYAAcB2QDeAN4A4wDnAOcA6wDvAO8A8wD3APcA+wD/AP8AAwEHAQcB3gDnAOcA7wD3APcA/wAHAecA9wAHAQwBDwETAQwBEwERAREBEwEXAREBFwEUARQBFwEbARQBGwEYARgBGwEfARgBHwEcARwBHwEjARwBIwEgASABIwEnASABJwEkASQBJwErASQBKwEoASgBKwEvASgBLwEsASwBLwEzASwBMwEwATABMwE3ATABNwE0ARYBEgEOAQ4BOwE2ATYBMgEuAS4BKgEmASYBIgEeAR4BGgEWARYBDgE2ATYBLgEmASYBHgEWATYBJgEWATQBNwE6ATQBOgE4ATgBOgENATgBDQEKATkBCwEQARABFQEZARkBHQEhASEBJQEpASkBLQExATEBNQE5ATkBEAEZARkBIQEpASkBMQE5ARkBKQE5AT4BQQFFAT4BRQFDAUMBRQFJAUMBSQFGAUYBSQFNAUYBTQFKAUoBTQFRAUoBUQFOAU4BUQFVAU4BVQFSAVIBVQFZAVIBWQFWAVYBWQFdAVYBXQFaAVoBXQFhAVoBYQFeAV4BYQFlAV4BZQFiAWIBZQFpAWIBaQFmAUgBRAFAAUABbQFoAWgBZAFgAWABXAFYAVgBVAFQAVABTAFIAUgBQAFoAWgBYAFYAVgBUAFIAWgBWAFIAWYBaQFsAWYBbAFqAWoBbAE/AWoBPwE8AWsBPQFCAUIBRwFLAUsBTwFTAVMBVwFbAVsBXwFjAWMBZwFrAWsBQgFLAUsBUwFbAVsBYwFrAUsBWwFrAXABcwF3AXABdwF0AXQBdwF7AXQBewF4AXgBewF/AXgBfwF8AXwBfwGDAXwBgwGAAYABgwGHAYABhwGEAYQBhwGLAYQBiwGIAXoBdgFyAXIBjgGKAYoBhgGCAYIBfgF6AXoBcgGKAYoBggF6AYgBiwGPAYgBjwGMAYwBjwFxAYwBcQFuAY0BbwF1AXUBeQF9AX0BgQGFAYUBiQGNAY0BdQF9AX0BhQGNAZIBngGgAZIBoAGnAZYBowGhAZYBoQGfAZgBqQGiAZgBogGlAa0BugG8Aa0BvAHCAbEBvgG7AbEBuwG5AbMBxAG9AbMBvQHAAcgB0gHWAcgB1gHfAcoB2wHYAcoB2AHUAdAB4AHXAdAB1wHZAeMB7wHxAeMB8QH4AecB9AHyAecB8gHwAekB+gHzAekB8wH2Af4BCAIMAv4BDAIVAgACEQIOAgACDgIKAgYCFgINAgYCDQIPAhkCJQInAhkCJwIuAh0CKgIoAh0CKAImAh8CMAIpAh8CKQIsAjQCQAJCAjQCQgJJAjgCRQJDAjgCQwJBAjoCSwJEAjoCRAJHAk8CWQJdAk8CXQJmAlECYgJfAlECXwJbAlcCZwJeAlcCXgJgAskBkwGoAckBqAHTAdUBqgGaAdUBmgHMAZcBrgHDAZcBwwGkAaYBxQG0AaYBtAGZAbIB5AH5AbIB+QG/AcEB+wHrAcEB6wG1AegB0QHaAegB2gH1AfcB3AHLAfcBywHqATICxgHeATIC3gE/Aj4C3QHPAT4CzwE3AuEBTQJlAuEBZQLuAe0BZAJWAu0BVgLmAVICOwJIAlICSAJjAmECRgI5AmECOQJYAv8BNQJKAv8BSgIJAgsCTAI8AgsCPAICAlACGgIvAlACLwJaAlwCMQIhAlwCIQJTAh4CBwIQAh4CEAIrAi0CEgIBAi0CAQIgApAB/AEUApABFAKdAZwBEwIFApwBBQKVARcCrwG4ARcCuAEkAiMCtwGsASMCrAEcAscBMwL9AccB/QGRAZsBtgHsAZsB7AHNAQQCGwKrAQQCqwGUAU4C4gGwAU4CsAEYAs4B5QFVAs4BVQI2Aj0CVAIiAj0CIgIDAmoCdgJ4AmoCeAJ/Am4CewJ5Am4CeQJ3AnACgQJ6AnACegJ9AoUCkgKUAoUClAKaAokClgKTAokCkwKRAosCnAKVAosClQKYAqACqgKuAqACrgK3AqICswKwAqICsAKsAqgCuAKvAqgCrwKxArsCxwLJArsCyQLQAr8CzALKAr8CygLIAsEC0gLLAsECywLOAtYC4ALkAtYC5ALtAtgC6QLmAtgC5gLiAt4C7gLlAt4C5QLnAvEC/QL/AvEC/wIGA/UCAgMAA/UCAAP+AvcCCAMBA/cCAQMEAwwDGAMaAwwDGgMhAxADHQMbAxADGwMZAxIDIwMcAxIDHAMfAycDMQM1AycDNQM+AykDOgM3AykDNwMzAy8DPwM2Ay8DNgM4A6ECawKAAqECgAKrAq0CggJyAq0CcgKkAm8ChgKbAm8CmwJ8An4CnQKMAn4CjAJxAooCvALRAooC0QKXApkC0wLDApkCwwKNAsACqQKyAsACsgLNAs8CtAKjAs8CowLCAgoDngK2AgoDtgIXAxYDtQKnAhYDpwIPA7kCJQM9A7kCPQPGAsUCPAMuA8UCLgO+AioDEwMgAyoDIAM7AzkDHgMRAzkDEQMwA9cCDQMiA9cCIgPhAuMCJAMUA+MCFAPaAigD8gIHAygDBwMyAzQDCQP5AjQD+QIrA/YC3wLoAvYC6AIDAwUD6gLZAgUD2QL4AmgC1ALsAmgC7AJ1AnQC6wLdAnQC3QJtAu8ChwKQAu8CkAL8AvsCjwKEAvsChAL0Ap8CCwPVAp8C1QJpAnMCjgLEAnMCxAKlAtwC8wKDAtwCgwJsAiYDugKIAiYDiALwAqYCvQItA6YCLQMOAxUDLAP6AhUD+gLbAkADRwNNA0ADTQNGA0IDSQNIA0IDSANBA0MDSgNJA0MDSQNCA0QDSwNKA0QDSgNDA0UDTANLA0UDSwNEA0YDTQNMA0YDTANFA0cDTgNUA0cDVANNA0kDUANPA0kDTwNIA0oDUQNQA0oDUANJA0sDUgNRA0sDUQNKA0wDUwNSA0wDUgNLA00DVANTA00DUwNMA04DVQNbA04DWwNUA1ADVwNWA1ADVgNPA1EDWANXA1EDVwNQA1IDWQNYA1IDWANRA1MDWgNZA1MDWQNSA1QDWwNaA1QDWgNTA1UDXANiA1UDYgNbA1cDXgNdA1cDXQNWA1gDXwNeA1gDXgNXA1kDYANfA1kDXwNYA1oDYQNgA1oDYANZA1sDYgNhA1sDYQNaA1wDYwNpA1wDaQNiA14DZQNkA14DZANdA18DZgNlA18DZQNeA2ADZwNmA2ADZgNfA2EDaANnA2EDZwNgA2IDaQNoA2IDaANhA2MDagNwA2MDcANpA2UDbANrA2UDawNkA2YDbQNsA2YDbANlA2cDbgNtA2cDbQNmA2gDbwNuA2gDbgNnA2kDcANvA2kDbwNoA2oDcQN3A2oDdwNwA2wDcwNyA2wDcgNrA20DdANzA20DcwNsA24DdQN0A24DdANtA28DdgN1A28DdQNuA3ADdwN2A3ADdgNvA3EDeAN+A3EDfgN3A3MDegN5A3MDeQNyA3QDewN6A3QDegNzA3UDfAN7A3UDewN0A3YDfQN8A3YDfAN1A3cDfgN9A3cDfQN2A3gDfwOFA3gDhQN+A3oDgQOAA3oDgAN5A3sDggOBA3sDgQN6A3wDgwOCA3wDggN7A30DhAODA30DgwN8A34DhQOEA34DhAN9A38DhgOMA38DjAOFA4EDiAOHA4EDhwOAA4IDiQOIA4IDiAOBA4MDigOJA4MDiQOCA4QDiwOKA4QDigODA4UDjAOLA4UDiwOEA4YDjQOTA4YDkwOMA4gDjwOOA4gDjgOHA4kDkAOPA4kDjwOIA4oDkQOQA4oDkAOJA4sDkgORA4sDkQOKA4wDkwOSA4wDkgOLA40DlAOaA40DmgOTA48DlgOVA48DlQOOA5ADlwOWA5ADlgOPA5EDmAOXA5EDlwOQA5IDmQOYA5IDmAORA5MDmgOZA5MDmQOSA5QDmwOhA5QDoQOaA5YDnQOcA5YDnAOVA5cDngOdA5cDnQOWA5gDnwOeA5gDngOXA5kDoAOfA5kDnwOYA5oDoQOgA5oDoAOZA5sDogOoA5sDqAOhA50DpAOjA50DowOcA54DpQOkA54DpAOdA58DpgOlA58DpQOeA6ADpwOmA6ADpgOfA6EDqAOnA6EDpwOgA6IDqQOvA6IDrwOoA6QDqwOqA6QDqgOjA6UDrAOrA6UDqwOkA6YDrQOsA6YDrAOlA6cDrgOtA6cDrQOmA6gDrwOuA6gDrgOnA6kDsAO2A6kDtgOvA6sDsgOxA6sDsQOqA6wDswOyA6wDsgOrA60DtAOzA60DswOsA64DtQO0A64DtAOtA68DtgO1A68DtQOuA7cDvgPEA7cDxAO9A7kDwAO/A7kDvwO4A7oDwQPAA7oDwAO5A7sDwgPBA7sDwQO6A7wDwwPCA7wDwgO7A70DxAPDA70DwwO8A74DxQPLA74DywPEA8ADxwPGA8ADxgO/A8EDyAPHA8EDxwPAA8IDyQPIA8IDyAPBA8MDygPJA8MDyQPCA8QDywPKA8QDygPDA8UDzAPSA8UD0gPLA8cDzgPNA8cDzQPGA8gDzwPOA8gDzgPHA8kD0APPA8kDzwPIA8oD0QPQA8oD0APJA8sD0gPRA8sD0QPKA8wD0wPZA8wD2QPSA84D1QPUA84D1APNA88D1gPVA88D1QPOA9AD1wPWA9AD1gPPA9ED2APXA9ED1wPQA9ID2QPYA9ID2APRA9MD2gPgA9MD4APZA9UD3APbA9UD2wPUA9YD3QPcA9YD3APVA9cD3gPdA9cD3QPWA9gD3wPeA9gD3gPXA9kD4APfA9kD3wPYA9oD4QPnA9oD5wPgA9wD4wPiA9wD4gPbA90D5APjA90D4wPcA94D5QPkA94D5APdA98D5gPlA98D5QPeA+AD5wPmA+AD5gPfA+ED6APuA+ED7gPnA+MD6gPpA+MD6QPiA+QD6wPqA+QD6gPjA+UD7APrA+UD6wPkA+YD7QPsA+YD7APlA+cD7gPtA+cD7QPmA+gD7wP1A+gD9QPuA+oD8QPwA+oD8APpA+sD8gPxA+sD8QPqA+wD8wPyA+wD8gPrA+0D9APzA+0D8wPsA+4D9QP0A+4D9APtA+8D9gP8A+8D/AP1A/ED+AP3A/ED9wPwA/ID+QP4A/ID+APxA/MD+gP5A/MD+QPyA/QD+wP6A/QD+gPzA/UD/AP7A/UD+wP0A/YD/QMDBPYDAwT8A/gD/wP+A/gD/gP3A/kDAAT/A/kD/wP4A/oDAQQABPoDAAT5A/sDAgQBBPsDAQT6A/wDAwQCBPwDAgT7A/0DBAQKBP0DCgQDBP8DBgQFBP8DBQT+AwAEBwQGBAAEBgT/AwEECAQHBAEEBwQABAIECQQIBAIECAQBBAMECgQJBAMECQQCBAQECwQRBAQEEQQKBAYEDQQMBAYEDAQFBAcEDgQNBAcEDQQGBAgEDwQOBAgEDgQHBAkEEAQPBAkEDwQIBAoEEQQQBAoEEAQJBAsEEgQYBAsEGAQRBA0EFAQTBA0EEwQMBA4EFQQUBA4EFAQNBA8EFgQVBA8EFQQOBBAEFwQWBBAEFgQPBBEEGAQXBBEEFwQQBBIEGQQfBBIEHwQYBBQEGwQaBBQEGgQTBBUEHAQbBBUEGwQUBBYEHQQcBBYEHAQVBBcEHgQdBBcEHQQWBBgEHwQeBBgEHgQXBBkEIAQmBBkEJgQfBBsEIgQhBBsEIQQaBBwEIwQiBBwEIgQbBB0EJAQjBB0EIwQcBB4EJQQkBB4EJAQdBB8EJgQlBB8EJQQeBCAEJwQtBCAELQQmBCIEKQQoBCIEKAQhBCMEKgQpBCMEKQQiBCQEKwQqBCQEKgQjBCUELAQrBCUEKwQkBCYELQQsBCYELAQlBC4ENQQ7BC4EOwQ0BDAENwQ2BDAENgQvBDEEOAQ3BDEENwQwBDIEOQQ4BDIEOAQxBDMEOgQ5BDMEOQQyBDQEOwQ6BDQEOgQzBDUEPARCBDUEQgQ7BDcEPgQ9BDcEPQQ2BDgEPwQ+BDgEPgQ3BDkEQAQ/BDkEPwQ4BDoEQQRABDoEQAQ5BDsEQgRBBDsEQQQ6BDwEQwRJBDwESQRCBD4ERQREBD4ERAQ9BD8ERgRFBD8ERQQ+BEAERwRGBEAERgQ/BEEESARHBEEERwRABEIESQRIBEIESARBBEMESgRQBEMEUARJBEUETARLBEUESwREBEYETQRMBEYETARFBEcETgRNBEcETQRGBEgETwROBEgETgRHBEkEUARPBEkETwRIBEoEUQRXBEoEVwRQBEwEUwRSBEwEUgRLBE0EVARTBE0EUwRMBE4EVQRUBE4EVARNBE8EVgRVBE8EVQROBFAEVwRWBFAEVgRPBFEEWAReBFEEXgRXBFMEWgRZBFMEWQRSBFQEWwRaBFQEWgRTBFUEXARbBFUEWwRUBFYEXQRcBFYEXARVBFcEXgRdBFcEXQRWBFgEXwRlBFgEZQReBFoEYQRgBFoEYARZBFsEYgRhBFsEYQRaBFwEYwRiBFwEYgRbBF0EZARjBF0EYwRcBF4EZQRkBF4EZARdBF8EZgRsBF8EbARlBGEEaARnBGEEZwRgBGIEaQRoBGIEaARhBGMEagRpBGMEaQRiBGQEawRqBGQEagRjBGUEbARrBGUEawRkBGYEbQRzBGYEcwRsBGgEbwRuBGgEbgRnBGkEcARvBGkEbwRoBGoEcQRwBGoEcARpBGsEcgRxBGsEcQRqBGwEcwRyBGwEcgRrBG0EdAR6BG0EegRzBG8EdgR1BG8EdQRuBHAEdwR2BHAEdgRvBHEEeAR3BHEEdwRwBHIEeQR4BHIEeARxBHMEegR5BHMEeQRyBHQEewSBBHQEgQR6BHYEfQR8BHYEfAR1BHcEfgR9BHcEfQR2BHgEfwR+BHgEfgR3BHkEgAR/BHkEfwR4BHoEgQSABHoEgAR5BHsEggSIBHsEiASBBH0EhASDBH0EgwR8BH4EhQSEBH4EhAR9BH8EhgSFBH8EhQR+BIAEhwSGBIAEhgR/BIEEiASHBIEEhwSABIIEiQSPBIIEjwSIBIQEiwSKBIQEigSDBIUEjASLBIUEiwSEBIYEjQSMBIYEjASFBIcEjgSNBIcEjQSGBIgEjwSOBIgEjgSHBIkEkASWBIkElgSPBIsEkgSRBIsEkQSKBIwEkwSSBIwEkgSLBI0ElASTBI0EkwSMBI4ElQSUBI4ElASNBI8ElgSVBI8ElQSOBJAElwSdBJAEnQSWBJIEmQSYBJIEmASRBJMEmgSZBJMEmQSSBJQEmwSaBJQEmgSTBJUEnASbBJUEmwSUBJYEnQScBJYEnASVBJcEngSkBJcEpASdBJkEoASfBJkEnwSYBJoEoQSgBJoEoASZBJsEogShBJsEoQSaBJwEowSiBJwEogSbBJ0EpASjBJ0EowScBJ4EpQSrBJ4EqwSkBKAEpwSmBKAEpgSfBKEEqASnBKEEpwSgBKIEqQSoBKIEqAShBKMEqgSpBKMEqQSiBKQEqwSqBKQEqgSjBKUErASyBKUEsgSrBKcErgStBKcErQSmBKgErwSuBKgErgSnBKkEsASvBKkErwSoBKoEsQSwBKoEsASpBKsEsgSxBKsEsQSqBKwEswS5BKwEuQSyBK4EtQS0BK4EtAStBK8EtgS1BK8EtQSuBLAEtwS2BLAEtgSvBLEEuAS3BLEEtwSwBLIEuQS4BLIEuASxBLMEugTABLMEwAS5BLUEvAS7BLUEuwS0BLYEvQS8BLYEvAS1BLcEvgS9BLcEvQS2BLgEvwS+BLgEvgS3BLkEwAS/BLkEvwS4BLoEwQTHBLoExwTABLwEwwTCBLwEwgS7BL0ExATDBL0EwwS8BL4ExQTEBL4ExAS9BL8ExgTFBL8ExQS+BMAExwTGBMAExgS/BMEEyATOBMEEzgTHBMMEygTJBMMEyQTCBMQEywTKBMQEygTDBMUEzATLBMUEywTEBMYEzQTMBMYEzATFBMcEzgTNBMcEzQTGBMgEzwTVBMgE1QTOBMoE0QTQBMoE0ATJBMsE0gTRBMsE0QTKBMwE0wTSBMwE0gTLBM0E1ATTBM0E0wTMBM4E1QTUBM4E1ATNBM8E1gTcBM8E3ATVBNEE2ATXBNEE1wTQBNIE2QTYBNIE2ATRBNME2gTZBNME2QTSBNQE2wTaBNQE2gTTBNUE3ATbBNUE2wTUBNYE3QTjBNYE4wTcBNgE3wTeBNgE3gTXBNkE4ATfBNkE3wTYBNoE4QTgBNoE4ATZBNsE4gThBNsE4QTaBNwE4wTiBNwE4gTbBN0E5ATqBN0E6gTjBN8E5gTlBN8E5QTeBOAE5wTmBOAE5gTfBOEE6ATnBOEE5wTgBOIE6QToBOIE6AThBOME6gTpBOME6QTiBOQE6wTxBOQE8QTqBOYE7QTsBOYE7ATlBOcE7gTtBOcE7QTmBOgE7wTuBOgE7gTnBOkE8ATvBOkE7wToBOoE8QTwBOoE8ATpBOsE8gT4BOsE+ATxBO0E9ATzBO0E8wTsBO4E9QT0BO4E9ATtBO8E9gT1BO8E9QTuBPAE9wT2BPAE9gTvBPEE+AT3BPEE9wTwBPIE+QT/BPIE/wT4BPQE+wT6BPQE+gTzBPUE/AT7BPUE+wT0BPYE/QT8BPYE/AT1BPcE/gT9BPcE/QT2BPgE/wT+BPgE/gT3BPkEAAUGBfkEBgX/BPsEAgUBBfsEAQX6BPwEAwUCBfwEAgX7BP0EBAUDBf0EAwX8BP4EBQUEBf4EBAX9BP8EBgUFBf8EBQX+BAAFBwUNBQAFDQUGBQIFCQUIBQIFCAUBBQMFCgUJBQMFCQUCBQQFCwUKBQQFCgUDBQUFDAULBQUFCwUEBQYFDQUMBQYFDAUFBQcFDgUUBQcFFAUNBQkFEAUPBQkFDwUIBQoFEQUQBQoFEAUJBQsFEgURBQsFEQUKBQwFEwUSBQwFEgULBQ0FFAUTBQ0FEwUMBQ4FFQUbBQ4FGwUUBRAFFwUWBRAFFgUPBREFGAUXBREFFwUQBRIFGQUYBRIFGAURBRMFGgUZBRMFGQUSBRQFGwUaBRQFGgUTBRUFHAUiBRUFIgUbBRcFHgUdBRcFHQUWBRgFHwUeBRgFHgUXBRkFIAUfBRkFHwUYBRoFIQUgBRoFIAUZBRsFIgUhBRsFIQUaBRwFIwUpBRwFKQUiBR4FJQUkBR4FJAUdBR8FJgUlBR8FJQUeBSAFJwUmBSAFJgUfBSEFKAUnBSEFJwUgBSIFKQUoBSIFKAUhBSMFKgUwBSMFMAUpBSUFLAUrBSUFKwUkBSYFLQUsBSYFLAUlBScFLgUtBScFLQUmBSgFLwUuBSgFLgUnBSkFMAUvBSkFLwUoBTEFOAU+BTEFPgU3BTMFOgU5BTMFOQUyBTQFOwU6BTQFOgUzBTUFPAU7BTUFOwU0BTYFPQU8BTYFPAU1BTcFPgU9BTcFPQU2BTgFPwVFBTgFRQU+BToFQQVABToFQAU5BTsFQgVBBTsFQQU6BTwFQwVCBTwFQgU7BT0FRAVDBT0FQwU8BT4FRQVEBT4FRAU9BT8FRgVMBT8FTAVFBUEFSAVHBUEFRwVABUIFSQVIBUIFSAVBBUMFSgVJBUMFSQVCBUQFSwVKBUQFSgVDBUUFTAVLBUUFSwVEBUYFTQVTBUYFUwVMBUgFTwVOBUgFTgVHBUkFUAVPBUkFTwVIBUoFUQVQBUoFUAVJBUsFUgVRBUsFUQVKBUwFUwVSBUwFUgVLBU0FVAVaBU0FWgVTBU8FVgVVBU8FVQVOBVAFVwVWBVAFVgVPBVEFWAVXBVEFVwVQBVIFWQVYBVIFWAVRBVMFWgVZBVMFWQVSBVQFWwVhBVQFYQVaBVYFXQVcBVYFXAVVBVcFXgVdBVcFXQVWBVgFXwVeBVgFXgVXBVkFYAVfBVkFXwVYBVoFYQVgBVoFYAVZBVsFYgVoBVsFaAVhBV0FZAVjBV0FYwVcBV4FZQVkBV4FZAVdBV8FZgVlBV8FZQVeBWAFZwVmBWAFZgVfBWEFaAVnBWEFZwVgBWIFaQVvBWIFbwVoBWQFawVqBWQFagVjBWUFbAVrBWUFawVkBWYFbQVsBWYFbAVlBWcFbgVtBWcFbQVmBWgFbwVuBWgFbgVnBWkFcAV2BWkFdgVvBWsFcgVxBWsFcQVqBWwFcwVyBWwFcgVrBW0FdAVzBW0FcwVsBW4FdQV0BW4FdAVtBW8FdgV1BW8FdQVuBXAFdwV9BXAFfQV2BXIFeQV4BXIFeAVxBXMFegV5BXMFeQVyBXQFewV6BXQFegVzBXUFfAV7BXUFewV0BXYFfQV8BXYFfAV1BXcFfgWEBXcFhAV9BXkFgAV/BXkFfwV4BXoFgQWABXoFgAV5BXsFggWBBXsFgQV6BXwFgwWCBXwFggV7BX0FhAWDBX0FgwV8BX4FhQWLBX4FiwWEBYAFhwWGBYAFhgV/BYEFiAWHBYEFhwWABYIFiQWIBYIFiAWBBYMFigWJBYMFiQWCBYQFiwWKBYQFigWDBYUFjAWSBYUFkgWLBYcFjgWNBYcFjQWGBYgFjwWOBYgFjgWHBYkFkAWPBYkFjwWIBYoFkQWQBYoFkAWJBYsFkgWRBYsFkQWKBYwFkwWZBYwFmQWSBY4FlQWUBY4FlAWNBY8FlgWVBY8FlQWOBZAFlwWWBZAFlgWPBZEFmAWXBZEFlwWQBZIFmQWYBZIFmAWRBZMFmgWgBZMFoAWZBZUFnAWbBZUFmwWUBZYFnQWcBZYFnAWVBZcFngWdBZcFnQWWBZgFnwWeBZgFngWXBZkFoAWfBZkFnwWYBZoFoQWnBZoFpwWgBZwFowWiBZwFogWbBZ0FpAWjBZ0FowWcBZ4FpQWkBZ4FpAWdBZ8FpgWlBZ8FpQWeBaAFpwWmBaAFpgWfBaEFqAWuBaEFrgWnBaMFqgWpBaMFqQWiBaQFqwWqBaQFqgWjBaUFrAWrBaUFqwWkBaYFrQWsBaYFrAWlBacFrgWtBacFrQWmBagFrwW1BagFtQWuBaoFsQWwBaoFsAWpBasFsgWxBasFsQWqBawFswWyBawFsgWrBa0FtAWzBa0FswWsBa4FtQW0Ba4FtAWtBa8FtgW8Ba8FvAW1BbEFuAW3BbEFtwWwBbIFuQW4BbIFuAWxBbMFugW5BbMFuQWyBbQFuwW6BbQFugWzBbUFvAW7BbUFuwW0BbYFvQXDBbYFwwW8BbgFvwW+BbgFvgW3BbkFwAW/BbkFvwW4BboFwQXABboFwAW5BbsFwgXBBbsFwQW6BbwFwwXCBbwFwgW7BcQFywXRBcQF0QXKBcYFzQXMBcYFzAXFBccFzgXNBccFzQXGBcgFzwXOBcgFzgXHBckF0AXPBckFzwXIBcoF0QXQBcoF0AXJBcsF0gXYBcsF2AXRBc0F1AXTBc0F0wXMBc4F1QXUBc4F1AXNBc8F1gXVBc8F1QXOBdAF1wXWBdAF1gXPBdEF2AXXBdEF1wXQBdIF2QXfBdIF3wXYBdQF2wXaBdQF2gXTBdUF3AXbBdUF2wXUBdYF3QXcBdYF3AXVBdcF3gXdBdcF3QXWBdgF3wXeBdgF3gXXBdkF4AXmBdkF5gXfBdsF4gXhBdsF4QXaBdwF4wXiBdwF4gXbBd0F5AXjBd0F4wXcBd4F5QXkBd4F5AXdBd8F5gXlBd8F5QXeBeAF5wXtBeAF7QXmBeIF6QXoBeIF6AXhBeMF6gXpBeMF6QXiBeQF6wXqBeQF6gXjBeUF7AXrBeUF6wXkBeYF7QXsBeYF7AXlBecF7gX0BecF9AXtBekF8AXvBekF7wXoBeoF8QXwBeoF8AXpBesF8gXxBesF8QXqBewF8wXyBewF8gXrBe0F9AXzBe0F8wXsBe4F9QX7Be4F+wX0BfAF9wX2BfAF9gXvBfEF+AX3BfEF9wXwBfIF+QX4BfIF+AXxBfMF+gX5BfMF+QXyBfQF+wX6BfQF+gXzBfUF/AUCBvUFAgb7BfcF/gX9BfcF/QX2BfgF/wX+BfgF/gX3BfkFAAb/BfkF/wX4BfoFAQYABvoFAAb5BfsFAgYBBvsFAQb6BfwFAwYJBvwFCQYCBv4FBQYEBv4FBAb9Bf8FBgYFBv8FBQb+BQAGBwYGBgAGBgb/BQEGCAYHBgEGBwYABgIGCQYIBgIGCAYBBgMGCgYQBgMGEAYJBgUGDAYLBgUGCwYEBgYGDQYMBgYGDAYFBgcGDgYNBgcGDQYGBggGDwYOBggGDgYHBgkGEAYPBgkGDwYIBgoGEQYXBgoGFwYQBgwGEwYSBgwGEgYLBg0GFAYTBg0GEwYMBg4GFQYUBg4GFAYNBg8GFgYVBg8GFQYOBhAGFwYWBhAGFgYPBhEGGAYeBhEGHgYXBhMGGgYZBhMGGQYSBhQGGwYaBhQGGgYTBhUGHAYbBhUGGwYUBhYGHQYcBhYGHAYVBhcGHgYdBhcGHQYWBhgGHwYlBhgGJQYeBhoGIQYgBhoGIAYZBhsGIgYhBhsGIQYaBhwGIwYiBhwGIgYbBh0GJAYjBh0GIwYcBh4GJQYkBh4GJAYdBh8GJgYsBh8GLAYlBiEGKAYnBiEGJwYgBiIGKQYoBiIGKAYhBiMGKgYpBiMGKQYiBiQGKwYqBiQGKgYjBiUGLAYrBiUGKwYkBiYGLQYzBiYGMwYsBigGLwYuBigGLgYnBikGMAYvBikGLwYoBioGMQYwBioGMAYpBisGMgYxBisGMQYqBiwGMwYyBiwGMgYrBi0GNAY6Bi0GOgYzBi8GNgY1Bi8GNQYuBjAGNwY2BjAGNgYvBjEGOAY3BjEGNwYwBjIGOQY4BjIGOAYxBjMGOgY5BjMGOQYyBjQGOwZBBjQGQQY6BjYGPQY8BjYGPAY1BjcGPgY9BjcGPQY2BjgGPwY+BjgGPgY3BjkGQAY/BjkGPwY4BjoGQQZABjoGQAY5BjsGQgZIBjsGSAZBBj0GRAZDBj0GQwY8Bj4GRQZEBj4GRAY9Bj8GRgZFBj8GRQY+BkAGRwZGBkAGRgY/BkEGSAZHBkEGRwZABkIGSQZPBkIGTwZIBkQGSwZKBkQGSgZDBkUGTAZLBkUGSwZEBkYGTQZMBkYGTAZFBkcGTgZNBkcGTQZGBkgGTwZOBkgGTgZHBkkGUAZWBkkGVgZPBksGUgZRBksGUQZKBkwGUwZSBkwGUgZLBk0GVAZTBk0GUwZMBk4GVQZUBk4GVAZNBk8GVgZVBk8GVQZOBlkGXAZgBlkGYAZdBl0GYAZkBl0GZAZhBmEGZAZoBmEGaAZlBmUGaAZsBmUGbAZpBmkGbAZwBmkGcAZtBm0GcAZ0Bm0GdAZxBmMGXwZbBlsGdwZzBnMGbwZrBmsGZwZjBmMGWwZzBnMGawZjBnEGdAZ4BnEGeAZ1BnUGeAZaBnUGWgZXBnYGWAZeBl4GYgZmBmYGagZuBm4GcgZ2BnYGXgZmBmYGbgZ2BnsGfgaCBnsGggZ/Bn8GggaGBn8GhgaDBoMGhgaKBoMGigaHBocGigaOBocGjgaLBosGjgaSBosGkgaPBo8GkgaWBo8GlgaTBoUGgQZ9Bn0GmQaVBpUGkQaNBo0GiQaFBoUGfQaVBpUGjQaFBpMGlgaaBpMGmgaXBpcGmgZ8BpcGfAZ5BpgGegaABoAGhAaIBogGjAaQBpAGlAaYBpgGgAaIBogGkAaYBp0GoAakBp0GpAahBqEGpAaoBqEGqAalBqUGqAasBqUGrAapBqkGrAawBqkGsAatBq0GsAa0Bq0GtAaxBrEGtAa4BrEGuAa1BqcGowafBp8Guwa3BrcGswavBq8GqwanBqcGnwa3BrcGrwanBrUGuAa8BrUGvAa5BrkGvAaeBrkGngabBroGnAaiBqIGpgaqBqoGrgayBrIGtga6BroGogaqBqoGsga6Br0GxAbKBr0GygbDBr8GxgbFBr8GxQa+BsAGxwbGBsAGxga/BsEGyAbHBsEGxwbABsIGyQbIBsIGyAbBBsMGygbJBsMGyQbCBsQGywbRBsQG0QbKBsYGzQbMBsYGzAbFBscGzgbNBscGzQbGBsgGzwbOBsgGzgbHBskG0AbPBskGzwbIBsoG0QbQBsoG0AbJBssG0gbYBssG2AbRBs0G1AbTBs0G0wbMBs4G1QbUBs4G1AbNBs8G1gbVBs8G1QbOBtAG1wbWBtAG1gbPBtEG2AbXBtEG1wbQBtsG3gbiBtsG4gbfBt8G4gbmBt8G5gbjBuMG5gbqBuMG6gbnBucG6gbuBucG7gbrBusG7gbyBusG8gbvBu8G8gb2Bu8G9gbzBuUG4QbdBt0G+Qb1BvUG8QbtBu0G6QblBuUG3Qb1BvUG7QblBvMG9gb6BvMG+gb3BvcG+gbcBvcG3AbZBvgG2gbgBuAG5AboBugG7AbwBvAG9Ab4BvgG4AboBugG8Ab4Bv0GAAcEB/0GBAcBBwEHBAcIBwEHCAcFBwUHCAcMBwUHDAcJBwkHDAcQBwkHEAcNBw0HEAcUBw0HFAcRBxEHFAcYBxEHGAcVBwcHAwf/Bv8GGwcXBxcHEwcPBw8HCwcHBwcH/wYXBxcHDwcHBxUHGAccBxUHHAcZBxkHHAf+BhkH/gb7BhoH/AYCBwIHBgcKBwoHDgcSBxIHFgcaBxoHAgcKBwoHEgcaBx0HJAcqBx0HKgcjBx8HJgclBx8HJQceByAHJwcmByAHJgcfByEHKAcnByEHJwcgByIHKQcoByIHKAchByMHKgcpByMHKQciBy0HMAc0By0HNAcxBzEHNAc4BzEHOAc1BzUHOAc8BzUHPAc5BzkHPAdABzkHQAc9Bz0HQAdEBz0HRAdBB0EHRAdIB0EHSAdFBzcHMwcvBy8HSwdHB0cHQwc/Bz8HOwc3BzcHLwdHB0cHPwc3B0UHSAdMB0UHTAdJB0kHTAcuB0kHLgcrB0oHLAcyBzIHNgc6BzoHPgdCB0IHRgdKB0oHMgc6BzoHQgdKB08HUgdWB08HVgdTB1MHVgdaB1MHWgdXB1cHWgdeB1cHXgdbB1sHXgdiB1sHYgdfB18HYgdmB18HZgdjB2MHZgdqB2MHagdnB1kHVQdRB1EHbQdpB2kHZQdhB2EHXQdZB1kHUQdpB2kHYQdZB2cHagduB2cHbgdrB2sHbgdQB2sHUAdNB2wHTgdUB1QHWAdcB1wHYAdkB2QHaAdsB2wHVAdcB1wHZAdsB3EHdAd4B3EHeAd1B3UHeAd8B3UHfAd5B3kHfAeAB3kHgAd9B30HgAeEB30HhAeBB4EHhAeIB4EHiAeFB4UHiAeMB4UHjAeJB3sHdwdzB3MHjweLB4sHhweDB4MHfwd7B3sHcweLB4sHgwd7B4kHjAeQB4kHkAeNB40HkAdyB40HcgdvB44HcAd2B3YHegd+B34HggeGB4YHigeOB44Hdgd+B34HhgeOB5EHmAeeB5EHngeXB5MHmgeZB5MHmQeSB5QHmweaB5QHmgeTB5UHnAebB5UHmweUB5YHnQecB5YHnAeVB5cHngedB5cHnQeWB5gHnwelB5gHpQeeB5oHoQegB5oHoAeZB5sHogehB5sHoQeaB5wHoweiB5wHogebB50HpAejB50HowecB54HpQekB54HpAedB58HpgesB58HrAelB6EHqAenB6EHpwegB6IHqQeoB6IHqAehB6MHqgepB6MHqQeiB6QHqweqB6QHqgejB6UHrAerB6UHqwekB68Hsge2B68HtgezB7MHtge6B7MHuge3B7cHuge+B7cHvge7B7sHvgfCB7sHwge/B78HwgfGB78HxgfDB8MHxgfKB8MHygfHB7kHtQexB7EHzQfJB8kHxQfBB8EHvQe5B7kHsQfJB8kHwQe5B8cHygfOB8cHzgfLB8sHzgewB8sHsAetB8wHrge0B7QHuAe8B7wHwAfEB8QHyAfMB8wHtAe8B7wHxAfMB9EH1AfYB9EH2AfVB9UH2AfcB9UH3AfZB9kH3AfgB9kH4AfdB90H4AfkB90H5AfhB+EH5AfoB+EH6AflB+UH6AfsB+UH7AfpB9sH1wfTB9MH7wfrB+sH5wfjB+MH3wfbB9sH0wfrB+sH4wfbB+kH7AfwB+kH8AftB+0H8AfSB+0H0gfPB+4H0AfWB9YH2gfeB94H4gfmB+YH6gfuB+4H1gfeB94H5gfuB/EH+Af+B/EH/gf3B/MH+gf5B/MH+QfyB/QH+wf6B/QH+gfzB/UH/Af7B/UH+wf0B/YH/Qf8B/YH/Af1B/cH/gf9B/cH/Qf2B5FEL76uaf4+uB41v5FEL76uaf4+uB41v5FEL76uaf4+uB41v5FEL76uaf4+boYzv5FEL76uaf4+boYzv5FEL76uaf4+boYzv95ZG76Uvvs+uB41v95ZG76Uvvs+uB41v95ZG76Uvvs+boYzv95ZG76Uvvs+boYzv1vFDL5UdPQ+uB41v1vFDL5UdPQ+uB41v1vFDL5UdPQ+boYzv1vFDL5UdPQ+boYzvypvB776fuo+uB41vypvB776fuo+uB41vypvB776fuo+boYzvypvB776fuo+boYzv1vFDL6gieA+uB41v1vFDL6gieA+uB41v1vFDL6gieA+boYzv1vFDL6gieA+boYzv95ZG75fP9k+uB41v95ZG75fP9k+uB41v95ZG75fP9k+boYzv95ZG75fP9k+boYzv5FEL75GlNY+uB41v5FEL75GlNY+uB41v5FEL75GlNY+boYzv5FEL75GlNY+boYzv0QvQ75fP9k+uB41v0QvQ75fP9k+uB41v0QvQ75fP9k+boYzv0QvQ75fP9k+boYzv8bDUb6gieA+uB41v8bDUb6gieA+uB41v8bDUb6gieA+boYzv8bDUb6gieA+boYzv/gZV776fuo+uB41v/gZV776fuo+uB41v/gZV776fuo+boYzv/gZV776fuo+boYzv8bDUb5UdPQ+uB41v8bDUb5UdPQ+uB41v8bDUb5UdPQ+boYzv8bDUb5UdPQ+boYzv0QvQ76Uvvs+uB41v0QvQ76Uvvs+uB41v0QvQ76Uvvs+boYzv0QvQ76Uvvs+boYzvwAAAACuaf4+uB41vwAAAACuaf4+uB41vwAAAACuaf4+uB41vwAAAACuaf4+boYzvwAAAACuaf4+boYzvwAAAACuaf4+boYzv5tVnzyUvvs+uB41v5tVnzyUvvs+uB41v5tVnzyUvvs+boYzv5tVnzyUvvs+boYzv9X8CT1UdPQ+uB41v9X8CT1UdPQ+uB41v9X8CT1UdPQ+boYzv9X8CT1UdPQ+boYzv5tVHz36fuo+uB41v5tVHz36fuo+uB41v5tVHz36fuo+boYzv5tVHz36fuo+boYzv9X8CT2gieA+uB41v9X8CT2gieA+uB41v9X8CT2gieA+boYzv9X8CT2gieA+boYzv5tVnzxfP9k+uB41v5tVnzxfP9k+uB41v5tVnzxfP9k+boYzv5tVnzxfP9k+boYzvwAAAABGlNY+uB41vwAAAABGlNY+uB41vwAAAABGlNY+boYzvwAAAABGlNY+boYzv5tVn7xfP9k+uB41v5tVn7xfP9k+uB41v5tVn7xfP9k+boYzv5tVn7xfP9k+boYzv9X8Cb2gieA+uB41v9X8Cb2gieA+uB41v9X8Cb2gieA+boYzv9X8Cb2gieA+boYzv5tVH736fuo+uB41v5tVH736fuo+uB41v5tVH736fuo+boYzv5tVH736fuo+boYzv9X8Cb1UdPQ+uB41v9X8Cb1UdPQ+uB41v9X8Cb1UdPQ+boYzv9X8Cb1UdPQ+boYzv5tVn7yUvvs+uB41v5tVn7yUvvs+uB41v5tVn7yUvvs+boYzv5tVn7yUvvs+boYzv5FELz6uaf4+uB41v5FELz6uaf4+uB41v5FELz6uaf4+uB41v5FELz6uaf4+boYzv5FELz6uaf4+boYzv5FELz6uaf4+boYzv0QvQz6Uvvs+uB41v0QvQz6Uvvs+uB41v0QvQz6Uvvs+boYzv0QvQz6Uvvs+boYzv8bDUT5UdPQ+uB41v8bDUT5UdPQ+uB41v8bDUT5UdPQ+boYzv8bDUT5UdPQ+boYzv/gZVz76fuo+uB41v/gZVz76fuo+uB41v/gZVz76fuo+boYzv/gZVz76fuo+boYzv8bDUT6gieA+uB41v8bDUT6gieA+uB41v8bDUT6gieA+boYzv8bDUT6gieA+boYzv0QvQz5fP9k+uB41v0QvQz5fP9k+uB41v0QvQz5fP9k+boYzv0QvQz5fP9k+boYzv5FELz5GlNY+uB41v5FELz5GlNY+uB41v5FELz5GlNY+boYzv5FELz5GlNY+boYzv95ZGz5fP9k+uB41v95ZGz5fP9k+uB41v95ZGz5fP9k+boYzv95ZGz5fP9k+boYzv1vFDD6gieA+uB41v1vFDD6gieA+uB41v1vFDD6gieA+boYzv1vFDD6gieA+boYzvypvBz76fuo+uB41vypvBz76fuo+uB41vypvBz76fuo+boYzvypvBz76fuo+boYzv1vFDD5UdPQ+uB41v1vFDD5UdPQ+uB41v1vFDD5UdPQ+boYzv1vFDD5UdPQ+boYzv95ZGz6Uvvs+uB41v95ZGz6Uvvs+uB41v95ZGz6Uvvs+boYzv95ZGz6Uvvs+boYzvwAAAABR10E/pTcnvwAAAABR10E/pTcnvwAAAABR10E/pTcnvwAAAABR10E/pTcnPwAAAABR10E/pTcnPwAAAABR10E/pTcnPxXZwT4E3Sc/KzknvxXZwT4E3Sc/KzknvxXZwT4E3Sc/KzknPxXZwT4E3Sc/KzknPwTdJz8V2cE+KzknvwTdJz8V2cE+KzknvwTdJz8V2cE+KzknPwTdJz8V2cE+KzknP1HXQT8AAAAApTcnv1HXQT8AAAAApTcnv1HXQT8AAAAApTcnP1HXQT8AAAAApTcnPwTdJz8V2cG+KzknvwTdJz8V2cG+KzknvwTdJz8V2cG+KzknPwTdJz8V2cG+KzknPxXZwT4E3Se/KzknvxXZwT4E3Se/KzknvxXZwT4E3Se/KzknPxXZwT4E3Se/KzknPwAAAABR10G/pTcnvwAAAABR10G/pTcnvwAAAABR10G/pTcnPwAAAABR10G/pTcnPxXZwb4E3Se/KzknvxXZwb4E3Se/KzknvxXZwb4E3Se/KzknPxXZwb4E3Se/KzknPwTdJ78V2cG+KzknvwTdJ78V2cG+KzknvwTdJ78V2cG+KzknPwTdJ78V2cG+KzknP1HXQb8AAAAApTcnv1HXQb8AAAAApTcnv1HXQb8AAAAApTcnP1HXQb8AAAAApTcnPwTdJ78V2cE+KzknvwTdJ78V2cE+KzknvwTdJ78V2cE+KzknPwTdJ78V2cE+KzknPxXZwb4E3Sc/KzknvxXZwb4E3Sc/KzknvxXZwb4E3Sc/KzknPxXZwb4E3Sc/KzknPwAAAABR10E/pTcnvwAAAABR10E/pTcnvwAAAABR10E/pTcnvwAAAABR10E/pTcnPwAAAABR10E/pTcnPwAAAABR10E/pTcnPxXZwT4E3Sc/KzknvxXZwT4E3Sc/KzknvxXZwT4E3Sc/KzknPxXZwT4E3Sc/KzknPwTdJz8V2cE+KzknvwTdJz8V2cE+KzknvwTdJz8V2cE+KzknPwTdJz8V2cE+KzknP1HXQT8AAAAApTcnv1HXQT8AAAAApTcnv1HXQT8AAAAApTcnP1HXQT8AAAAApTcnPwTdJz8V2cG+KzknvwTdJz8V2cG+KzknvwTdJz8V2cG+KzknPwTdJz8V2cG+KzknPxXZwT4E3Se/KzknvxXZwT4E3Se/KzknvxXZwT4E3Se/KzknPxXZwT4E3Se/KzknPwAAAABR10G/pTcnvwAAAABR10G/pTcnvwAAAABR10G/pTcnPwAAAABR10G/pTcnPxXZwb4E3Se/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AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAPO5OL1RvX8/JrZRuU9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAPO5OL1RvX8/JrZRuU9ROL2dvX8/AAAAAPO5OL1RvX8/JrZRuU9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAE9ROL2dvX8/AAAAAAAAAAAAAIA/zcxMPQAAgD/NzMw9AACAP5qZGT4AAIA/zcxMPgAAgD8AAIA+AACAP5qZmT4AAIA/MzOzPgAAgD/NzMw+AACAP2Zm5j4AAIA/AAAAPwAAgD/NzAw/AACAP5qZGT8AAIA/ZmYmPwAAgD8zMzM/AACAPwAAQD8AAIA/zcxMPwAAgD+amVk/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agBrAFwAXABfAGoAYABqAF8AYQBoAGkAaQBgAGEAcgBzAHQAdABxAHIAdAB1AHYAdgB3AHQAcQB0AHcAfgB/AGwAfgBsAH0AegB4AHkAbQB8AH0AfQBsAG0AeAB6AHcAcQB3AHoAcABxAHoAegB7AHAAbwBwAHsAewB8AG8AbgBvAHwAfABtAG4AiQCKAIQAkACHAI8AhACKAIMAiQCEAI4AiACJAI4AjgCPAIgAjwCHAIgAggCLAIwAjQCAAIEAjQCBAIwAggCMAIEAhQCGAJIAkQCSAIYAgwCKAIsAiwCCAIMAjgCEAJIAhwCQAJEAkQCGAIcAhQCSAIQAlgCXAJUAlACVAJcAmACiAJcAogCjAJcAlACXAKMAmgCgAJkAoQCZAKAAnQCeAJwAmwCcAJ4AmwCeAJoAngCfAJoAoACaAJ8AmQChAJgAogCYAKEAlACjAJMApQCmAKcAqQCxAKgApwCoALEAsQCyAKcAsgC1AKcApQCnALUAtQCkAKUAqwCvAKoAsACqAK8ArACtAK4ArACuAKsArwCrAK4AqgCwAKkAsQCpALAAtQCyALMAswC0ALUAwgC/AMEAwADBAL8AvwDCAL4AuwDIALoAyADJALoAuQC6AMkAyQDKALkAygC4ALkAvQDDAMQAvAC9AMQAxADFALwAxQDGALwAxwC8AMYAzQC2AMwAtgC3AMwAywDMALcAvgDCAMMAwwC9AL4AvADHALsAyAC7AMcAuADKAMsAywC3ALgA1wDVANYA0wDZANIAzwDQANEA0QDOAM8A1wDYANkA1QDXANkA2QDTANUA0wDUANUA3QDeANwA2wDcAN4A3wDpAN4A6QDqAN4A2wDeAOoA4QDnAOAA6ADgAOcA5ADlAOMA4gDjAOUA4gDlAOEA5QDmAOEA5wDhAOYA4ADoAN8A6QDfAOgA2wDqANoA7ADtAO4A8AD4AO8A7gDvAPgA+AD5AO4A+QD8AO4A7ADuAPwA/ADrAOwA8gD2APEA9wDxAPYA8wD0APUA8wD1APIA9gDyAPUA8QD3APAA+ADwAPcA/AD5APoA+gD7APwACQEGAQgBBwEIAQYBBgEJAQUBAgEPAQEBDwEQAQEBAAEBARABEAERAQABEQH/AAABBAEKAQsBAwEEAQsBCwEMAQMBDAENAQMBDgEDAQ0BFAH9ABMB/QD+ABMBEgETAf4ABQEJAQoBCgEEAQUBAwEOAQIBDwECAQ4B/wARARIBEgH+AP8AHgEcAR0BGgEgARkBFgEXARgBGAEVARYBHgEfASABHAEeASABIAEaARwBGgEbARwB", import.meta.url).href,
  propellerUrl: new URL("data:model/gltf-binary;base64,Z2xURgIAAAAYVQAAfBkAAEpTT057ImFzc2V0Ijp7InZlcnNpb24iOiIyLjAiLCJnZW5lcmF0b3IiOiJUSFJFRS5HTFRGRXhwb3J0ZXIgcjE4NSJ9LCJzY2VuZXMiOlt7Im5hbWUiOiJBdXhTY2VuZSIsIm5vZGVzIjpbMF19XSwic2NlbmUiOjAsIm5vZGVzIjpbeyJtYXRyaXgiOlswLjcyLDAsMCwwLDAsMC43MiwwLDAsMCwwLDAuNzIsMCwwLDAsMCwxXSwibmFtZSI6IkFyY0dJUyBsb3ctcG9seSB0aHJlZS1ibGFkZSB0b3kgcGxhbmUgcHJvcGVsbGVyIiwiY2hpbGRyZW4iOlsxLDIsMyw0LDUsNiw3LDgsOV19LHsibWF0cml4IjpbMSwwLDAsMCwwLDEsMCwwLDAsMCwxLDAsMCwwLjcyLC0wLjA4LDFdLCJtZXNoIjowfSx7Im1hdHJpeCI6WzEsMCwwLDAsMCwxLDAsMCwwLDAsMSwwLDAsMS4xOSwtMC4wODUsMV0sIm1lc2giOjF9LHsibWF0cml4IjpbLTAuNDk5OTk5OTk5OTk5OTk5OCwwLjg2NjAyNTQwMzc4NDQzODgsMCwwLC0wLjg2NjAyNTQwMzc4NDQzODgsLTAuNDk5OTk5OTk5OTk5OTk5OCwwLDAsMCwwLDEsMCwtMC42MjM1MzgyOTA3MjQ3OTU4LC0wLjM1OTk5OTk5OTk5OTk5OTgsLTAuMDgsMV0sIm1lc2giOjB9LHsibWF0cml4IjpbLTAuNDk5OTk5OTk5OTk5OTk5OCwwLjg2NjAyNTQwMzc4NDQzODgsMCwwLC0wLjg2NjAyNTQwMzc4NDQzODgsLTAuNDk5OTk5OTk5OTk5OTk5OCwwLDAsMCwwLDEsMCwtMS4wMzA1NzAyMzA1MDM0ODIsLTAuNTk0OTk5OTk5OTk5OTk5OCwtMC4wODUsMV0sIm1lc2giOjF9LHsibWF0cml4IjpbLTAuNTAwMDAwMDAwMDAwMDAwMiwtMC44NjYwMjU0MDM3ODQ0Mzg0LDAsMCwwLjg2NjAyNTQwMzc4NDQzODQsLTAuNTAwMDAwMDAwMDAwMDAwMiwwLDAsMCwwLDEsMCwwLjYyMzUzODI5MDcyNDc5NTcsLTAuMzYwMDAwMDAwMDAwMDAwMywtMC4wOCwxXSwibWVzaCI6MH0seyJtYXRyaXgiOlstMC41MDAwMDAwMDAwMDAwMDAyLC0wLjg2NjAyNTQwMzc4NDQzODQsMCwwLDAuODY2MDI1NDAzNzg0NDM4NCwtMC41MDAwMDAwMDAwMDAwMDAyLDAsMCwwLDAsMSwwLDEuMDMwNTcwMjMwNTAzNDgxOCwtMC41OTUwMDAwMDAwMDAwMDA1LC0wLjA4NSwxXSwibWVzaCI6MX0seyJtYXRyaXgiOlsxLDAsMCwwLDAsMi4yMjA0NDYwNDkyNTAzMTNlLTE2LDEsMCwwLC0xLDIuMjIwNDQ2MDQ5MjUwMzEzZS0xNiwwLDAsMCwwLDFdLCJtZXNoIjoyfSx7Im1hdHJpeCI6WzEsMCwwLDAsMCwxLDAsMCwwLDAsMSwwLDAsMCwtMC4wMywxXSwibWVzaCI6M30seyJtYXRyaXgiOlsxLDAsMCwwLDAsMi4yMjA0NDYwNDkyNTAzMTNlLTE2LC0xLDAsMCwxLDIuMjIwNDQ2MDQ5MjUwMzEzZS0xNiwwLDAsMCwtMC4yLDFdLCJtZXNoIjo0fV0sImJ1ZmZlclZpZXdzIjpbeyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjAsImJ5dGVMZW5ndGgiOjI4OCwidGFyZ2V0IjozNDk2MiwiYnl0ZVN0cmlkZSI6MTJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyODgsImJ5dGVMZW5ndGgiOjI4OCwidGFyZ2V0IjozNDk2MiwiYnl0ZVN0cmlkZSI6MTJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo1NzYsImJ5dGVMZW5ndGgiOjE5MiwidGFyZ2V0IjozNDk2MiwiYnl0ZVN0cmlkZSI6OH0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjc2OCwiYnl0ZUxlbmd0aCI6NzIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo4NDAsImJ5dGVMZW5ndGgiOjI4OCwidGFyZ2V0IjozNDk2MiwiYnl0ZVN0cmlkZSI6MTJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoxMTI4LCJieXRlTGVuZ3RoIjoyODgsInRhcmdldCI6MzQ5NjIsImJ5dGVTdHJpZGUiOjEyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MTQxNiwiYnl0ZUxlbmd0aCI6MTkyLCJ0YXJnZXQiOjM0OTYyLCJieXRlU3RyaWRlIjo4fSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MTYwOCwiYnl0ZUxlbmd0aCI6NzIsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoxNjgwLCJieXRlTGVuZ3RoIjoxMzQ0LCJ0YXJnZXQiOjM0OTYyLCJieXRlU3RyaWRlIjoxMn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjMwMjQsImJ5dGVMZW5ndGgiOjEzNDQsInRhcmdldCI6MzQ5NjIsImJ5dGVTdHJpZGUiOjEyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NDM2OCwiYnl0ZUxlbmd0aCI6ODk2LCJ0YXJnZXQiOjM0OTYyLCJieXRlU3RyaWRlIjo4fSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTI2NCwiYnl0ZUxlbmd0aCI6NDMyLCJ0YXJnZXQiOjM0OTYzfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTY5NiwiYnl0ZUxlbmd0aCI6MjA1MiwidGFyZ2V0IjozNDk2MiwiYnl0ZVN0cmlkZSI6MTJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0Ijo3NzQ4LCJieXRlTGVuZ3RoIjoyMDUyLCJ0YXJnZXQiOjM0OTYyLCJieXRlU3RyaWRlIjoxMn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjk4MDAsImJ5dGVMZW5ndGgiOjEzNjgsInRhcmdldCI6MzQ5NjIsImJ5dGVTdHJpZGUiOjh9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoxMTE2OCwiYnl0ZUxlbmd0aCI6MTcyOCwidGFyZ2V0IjozNDk2M30seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjEyODk2LCJieXRlTGVuZ3RoIjo4MDQsInRhcmdldCI6MzQ5NjIsImJ5dGVTdHJpZGUiOjEyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MTM3MDAsImJ5dGVMZW5ndGgiOjgwNCwidGFyZ2V0IjozNDk2MiwiYnl0ZVN0cmlkZSI6MTJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoxNDUwNCwiYnl0ZUxlbmd0aCI6NTM2LCJ0YXJnZXQiOjM0OTYyLCJieXRlU3RyaWRlIjo4fSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MTUwNDAsImJ5dGVMZW5ndGgiOjE5MiwidGFyZ2V0IjozNDk2M31dLCJidWZmZXJzIjpbeyJieXRlTGVuZ3RoIjoxNTIzMn1dLCJhY2Nlc3NvcnMiOlt7ImJ1ZmZlclZpZXciOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwibWF4IjpbMC4xMDk5OTk5OTk0MDM5NTM1NSwwLjU2MDAwMDAwMjM4NDE4NTgsMC4wNDUwMDAwMDE3ODgxMzkzNF0sIm1pbiI6Wy0wLjEwOTk5OTk5OTQwMzk1MzU1LC0wLjU2MDAwMDAwMjM4NDE4NTgsLTAuMDQ1MDAwMDAxNzg4MTM5MzRdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MSwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlsxLDEsMV0sIm1pbiI6Wy0xLC0xLC0xXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwibWF4IjpbMSwxXSwibWluIjpbMCwwXSwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjMsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjozNiwibWF4IjpbMjNdLCJtaW4iOlswXSwidHlwZSI6IlNDQUxBUiJ9LHsiYnVmZmVyVmlldyI6NCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlswLjEyNSwwLjExOTk5OTk5NzMxNzc5MDk5LDAuMDUwMDAwMDAwNzQ1MDU4MDZdLCJtaW4iOlstMC4xMjUsLTAuMTE5OTk5OTk3MzE3NzkwOTksLTAuMDUwMDAwMDAwNzQ1MDU4MDZdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NSwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlsxLDEsMV0sIm1pbiI6Wy0xLC0xLC0xXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjYsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwibWF4IjpbMSwxXSwibWluIjpbMCwwXSwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjcsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjozNiwibWF4IjpbMjNdLCJtaW4iOlswXSwidHlwZSI6IlNDQUxBUiJ9LHsiYnVmZmVyVmlldyI6OCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjExMiwibWF4IjpbMC4yMTY2NTc3MTMwNTU2MTA2NiwwLjE0MDAwMDAwMDU5NjA0NjQ1LDAuMjE5OTk5OTk4ODA3OTA3MV0sIm1pbiI6Wy0wLjIxNjY1NzcxMzA1NTYxMDY2LC0wLjE0MDAwMDAwMDU5NjA0NjQ1LC0wLjIxOTk5OTk5ODgwNzkwNzFdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6OSwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjExMiwibWF4IjpbMC45ODQ4MDc3Mjk3MjEwNjkzLDEsMV0sIm1pbiI6Wy0wLjk4NDgwNzcyOTcyMTA2OTMsLTEsLTFdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTAsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoxMTIsIm1heCI6WzEsMV0sIm1pbiI6WzAsMF0sInR5cGUiOiJWRUMyIn0seyJidWZmZXJWaWV3IjoxMSwiY29tcG9uZW50VHlwZSI6NTEyMywiY291bnQiOjIxNiwibWF4IjpbMTExXSwibWluIjpbMF0sInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjEyLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MTcxLCJtYXgiOlswLjI2MTk5OTk5NDUxNjM3MjcsMC4yNTgwMTk2MjYxNDA1OTQ1LDAuMDMyMDAwMDAxNTE5OTE4NDRdLCJtaW4iOlstMC4yNjE5OTk5OTQ1MTYzNzI3LC0wLjI1ODAxOTYyNjE0MDU5NDUsLTAuMDMyMDAwMDAxNTE5OTE4NDRdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MTMsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoxNzEsIm1heCI6WzEsMC45ODQ4MDc3Mjk3MjEwNjkzLDFdLCJtaW4iOlstMSwtMC45ODQ4MDc3Mjk3MjEwNjkzLC0xXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE0LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MTcxLCJtYXgiOlsxLDFdLCJtaW4iOlswLDBdLCJ0eXBlIjoiVkVDMiJ9LHsiYnVmZmVyVmlldyI6MTUsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50Ijo4NjQsIm1heCI6WzE3MF0sIm1pbiI6WzBdLCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3IjoxNiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjY3LCJtYXgiOlswLjI4OTk5OTk5MTY1NTM0OTczLDAuMjM5OTk5OTk0NjM1NTgxOTcsMC4yODk5OTk5OTE2NTUzNDk3M10sIm1pbiI6Wy0wLjI4OTk5OTk5MTY1NTM0OTczLC0wLjIzOTk5OTk5NDYzNTU4MTk3LC0wLjI4OTk5OTk5MTY1NTM0OTczXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE3LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6NjcsIm1heCI6WzAuODU1OTE1NTQ2NDE3MjM2MywwLjUxNzExNTY1MjU2MTE4NzcsMC44NTU5MTU1NDY0MTcyMzYzXSwibWluIjpbLTAuODU1OTE1NTQ2NDE3MjM2MywtMSwtMC44NTU5MTU1NDY0MTcyMzYzXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjE4LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6NjcsIm1heCI6WzEsMV0sIm1pbiI6WzAsMF0sInR5cGUiOiJWRUMyIn0seyJidWZmZXJWaWV3IjoxOSwiY29tcG9uZW50VHlwZSI6NTEyMywiY291bnQiOjk2LCJtYXgiOls2Nl0sIm1pbiI6WzFdLCJ0eXBlIjoiU0NBTEFSIn1dLCJtYXRlcmlhbHMiOlt7InBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuMTM4NDMxNjE1MDIyNjc1NDUsMC4wNjEyNDYwNTQyMjQxNzQwMzUsMC4wMzk1NDYyMzUyNzA1MjkyMywxXSwibWV0YWxsaWNGYWN0b3IiOjAsInJvdWdobmVzc0ZhY3RvciI6MC43OH19LHsicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC42NzI0NDMxNTY5NTEwMTMzLDAuMTQ0MTI4NDcwODQ4MTgxMjMsMC4wNjg0NzgxNjk4MzY2Mjc2MiwxXSwibWV0YWxsaWNGYWN0b3IiOjAsInJvdWdobmVzc0ZhY3RvciI6MC42OH19LHsicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC4zMzI0NTE1MzYzMzU0OTM4NSwwLjM5MTU3MjQ3NzczOTM5MjIsMC4zOTE1NzI0Nzc3MzkzOTIyLDFdLCJtZXRhbGxpY0ZhY3RvciI6MC4yOCwicm91Z2huZXNzRmFjdG9yIjowLjQ2fX0seyJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjAxNTIwODUxNDQxODk0OTQ3MiwwLjA3NDIxMzU2ODM3MjEzODY3LDAuMTA0NjE2NDg0MDgyMDg2NTcsMV0sIm1ldGFsbGljRmFjdG9yIjowLCJyb3VnaG5lc3NGYWN0b3IiOjAuNjR9fV0sIm1lc2hlcyI6W3sicHJpbWl0aXZlcyI6W3sibW9kZSI6NCwiYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MCwiTk9STUFMIjoxLCJURVhDT09SRF8wIjoyfSwiaW5kaWNlcyI6MywibWF0ZXJpYWwiOjB9XX0seyJwcmltaXRpdmVzIjpbeyJtb2RlIjo0LCJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo0LCJOT1JNQUwiOjUsIlRFWENPT1JEXzAiOjZ9LCJpbmRpY2VzIjo3LCJtYXRlcmlhbCI6MX1dfSx7InByaW1pdGl2ZXMiOlt7Im1vZGUiOjQsImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjgsIk5PUk1BTCI6OSwiVEVYQ09PUkRfMCI6MTB9LCJpbmRpY2VzIjoxMSwibWF0ZXJpYWwiOjJ9XX0seyJwcmltaXRpdmVzIjpbeyJtb2RlIjo0LCJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoxMiwiTk9STUFMIjoxMywiVEVYQ09PUkRfMCI6MTR9LCJpbmRpY2VzIjoxNSwibWF0ZXJpYWwiOjJ9XX0seyJwcmltaXRpdmVzIjpbeyJtb2RlIjo0LCJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjoxNiwiTk9STUFMIjoxNywiVEVYQ09PUkRfMCI6MTh9LCJpbmRpY2VzIjoxOSwibWF0ZXJpYWwiOjN9XX1dfSAgIIA7AABCSU4ArkfhPSlcDz/sUTg9rkfhPSlcDz/sUTi9rkfhPSlcD7/sUTg9rkfhPSlcD7/sUTi9rkfhvSlcDz/sUTi9rkfhvSlcDz/sUTg9rkfhvSlcD7/sUTi9rkfhvSlcD7/sUTg9rkfhvSlcDz/sUTi9rkfhPSlcDz/sUTi9rkfhvSlcDz/sUTg9rkfhPSlcDz/sUTg9rkfhvSlcD7/sUTg9rkfhPSlcD7/sUTg9rkfhvSlcD7/sUTi9rkfhPSlcD7/sUTi9rkfhvSlcDz/sUTg9rkfhPSlcDz/sUTg9rkfhvSlcD7/sUTg9rkfhPSlcD7/sUTg9rkfhPSlcDz/sUTi9rkfhvSlcDz/sUTi9rkfhPSlcD7/sUTi9rkfhvSlcD7/sUTi9AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAgD8AAIA/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAgD8AAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AACAPwAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAIA/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAgD8AAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AACAPwAAgD8AAAAAAAAAAAAAgD8AAAAAAAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAAAAPo/C9T3NzEw9AAAAPo/C9T3NzEy9AAAAPo/C9b3NzEw9AAAAPo/C9b3NzEy9AAAAvo/C9T3NzEy9AAAAvo/C9T3NzEw9AAAAvo/C9b3NzEy9AAAAvo/C9b3NzEw9AAAAvo/C9T3NzEy9AAAAPo/C9T3NzEy9AAAAvo/C9T3NzEw9AAAAPo/C9T3NzEw9AAAAvo/C9b3NzEw9AAAAPo/C9b3NzEw9AAAAvo/C9b3NzEy9AAAAPo/C9b3NzEy9AAAAvo/C9T3NzEw9AAAAPo/C9T3NzEw9AAAAvo/C9b3NzEw9AAAAPo/C9b3NzEw9AAAAPo/C9T3NzEy9AAAAvo/C9T3NzEy9AAAAPo/C9b3NzEy9AAAAvo/C9b3NzEy9AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAgD8AAIA/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAgD8AAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AACAPwAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAIA/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAA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RB2vPgAAAACyj3C/MjENJQAAAAAAAIC/RB2vvgAAAACyj3C/u40kvwAAAAB9G0S/17NdvwAAAAAAAAC/XBx8vwAAAADU0DG+XBx8vwAAAADU0DE+17NdvwAAAAAAAAA/u40kvwAAAAB9G0Q/RB2vvgAAAACyj3A/MjGNpQAAAAAAAIA/AAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAA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LAAYABkALAAsABkALQAZABoALQAtABoALgAaABsALgAuABsALwAbABwALwAvABwAMAAcAB0AMAAwAB0AMQAdAB4AMQAxAB4AMgAeAB8AMgAyAB8AMwAfACAAMwAzACAANAAgACEANAA0ACEANQAhACIANQA1ACIANgAiACMANgA2ACMANwAjACQANwA3ACQAOAAkACUAOAA5ACYAOgAmACcAOgA6ACcAOwAnACgAOwA7ACgAPAAoACkAPAA8ACkAPQApACoAPQA9ACoAPgAqACsAPgA+ACsAPwArACwAPwA/ACwAQAAsAC0AQABAAC0AQQAtAC4AQQBBAC4AQgAuAC8AQgBCAC8AQwAvADAAQwBDADAARAAwADEARABEADEARQAxADIARQBFADIARgAyADMARgBGADMARwAzADQARwBHADQASAA0ADUASABIADUASQA1ADYASQBJADYASgA2ADcASgBKADcASwA3ADgASwBMADkATQA5ADoATQBNADoATgA6ADsATgBOADsATwA7ADwATwBPADwAUAA8AD0AUABQAD0AUQA9AD4AUQBRAD4AUgA+AD8AUgBSAD8AUwA/AEAAUwBTAEAAVABAAEEAVABUAEEAVQBBAEIAVQBVAEIAVgBCAEMAVgBWAEMAVwBDAEQAVwBXAEQAWABEAEUAWABYAEUAWQBFAEYAWQBZAEYAWgBGAEcAWgBaAEcAWwBHAEgAWwBbAEgAXABIAEkAXABcAEkAXQBJAEoAXQBdAEoAXgBKAEsAXgBfAEwAYABMAE0AYABgAE0AYQBNAE4AYQBhAE4AYgBOAE8AYgBiAE8AYwBPAFAAYwBjAFAAZABQAFEAZABkAFEAZQBRAFIAZQBlAFIAZgBSAFMAZgBmAFMAZwBTAFQAZwBnAFQAaABUAFUAaABoAFUAaQBVAFYAaQBpAFYAagBWAFcAagBqAFcAawBXAFgAawBrAFgAbABYAFkAbABsAFkAbQBZAFoAbQBtAFoAbgBaAFsAbgBuAFsAbwBbAFwAbwBvAFwAcABcAF0AcABwAF0AcQBdAF4AcQByAF8AcwBfAGAAcwBzAGAAdABgAGEAdAB0AGEAdQBhAGIAdQB1AGIAdgBiAGMAdgB2AGMAdwBjAGQAdwB3AGQAeABkAGUAeAB4AGUAeQBlAGYAeQB5AGYAegBmAGcAegB6AGcA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AACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAPwAAgD0AAIA/AAAAPgAAgD8AAEA+AACAPwAAgD4AAIA/AACgPgAAgD8AAMA+AACAPwAA4D4AAIA/AAAAPwAAgD8AABA/AACAPwAAID8AAIA/AAAwPwAAgD8AAEA/AACAPwAAUD8AAIA/AABgPwAAgD8AAHA/AACAPwAAgD8AAIA/AAAAAAAAAAAAAIA9AAAAAAAAAD4AAAAAAABAPgAAAAAAAIA+AAAAAAAAoD4AAAAAAADAPgAAAAAAAOA+AAAAAAAAAD8AAAAAAAAQPwAAAAAAACA/AAAAAAAAMD8AAAAAAABAPwAAAAAAAFA/AAAAAAAAYD8AAAAAAABwPwAAAAAAAIA/AAAAAAAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAA/AACAPwAAAD+vQXY/dQiePnqCWj8a9hU+xfswPwzlGz0AAAA/AAAAAHUInj4M5Rs9GvYVPhr2FT4M5Rs9dQiePgAAAAAAAAA/DOUbPcX7MD8a9hU+eoJaP3UInj6vQXY/AAAAPwAAgD/F+zA/r0F2P3qCWj96glo/r0F2P8X7MD8AAIA/AAAAPxEAEgABABIAEwACABMAFAADABQAFQAEABUAFgAFABYAFwAGABcAGAAHABgAGQAIABkAGgAJABoAGwAKABsAHAALABwAHQAMAB0AHgANAB4AHwAOAB8AIAAPACAAIQAQADMAMgAiADQAMwAjADUANAAkADYANQAlADcANgAmADgANwAnADkAOAAoADoAOQApADsAOgAqADwAOwArAD0APAAsAD4APQAtAD8APgAuAEAAPwAvAEEAQAAwAEIAQQAxAA==", import.meta.url).href,
  boostUrl: new URL("data:model/gltf-binary;base64,Z2xURgIAAACkIQAA5AoAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6Iktocm9ub3MgZ2xURiBCbGVuZGVyIEkvTyB2NS4yLjM5IiwidmVyc2lvbiI6IjIuMCJ9LCJzY2VuZSI6MCwic2NlbmVzIjpbeyJuYW1lIjoiQWlyY3JhZnQgZXhoYXVzdCBleHBvcnQiLCJub2RlcyI6WzBdfSx7Im5hbWUiOiJTY2VuZSJ9XSwibm9kZXMiOlt7Im1lc2giOjAsIm5hbWUiOiJjbGFzc2ljIGFmdCB0dXJibyBwbHVtZSJ9XSwibWF0ZXJpYWxzIjpbeyJhbHBoYU1vZGUiOiJCTEVORCIsImVtaXNzaXZlRmFjdG9yIjpbMSwwLjE4MDAwMDAwNzE1MjU1NzM3LDAuMDE0OTk5OTk5NjY0NzIzODczXSwibmFtZSI6ImNsYXNzaWMgYWZ0ZXJidXJuZXIgc2hlYXRoIiwicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMSwwLjE4MDAwMDAwNzE1MjU1NzM3LDAuMDE0OTk5OTk5NjY0NzIzODczLDAuNDE5OTk5OTg2ODg2OTc4MTVdLCJtZXRhbGxpY0ZhY3RvciI6MH19LHsiYWxwaGFNb2RlIjoiQkxFTkQiLCJlbWlzc2l2ZUZhY3RvciI6WzEsMC40Nzk5OTk5ODkyNzExNjM5NCwwLjA1NDk5OTk5OTcwMTk3Njc3Nl0sIm5hbWUiOiJjbGFzc2ljIGdvbGRlbiBpbm5lciBmbGFtZSIsInBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzEsMC40Nzk5OTk5ODkyNzExNjM5NCwwLjA1NDk5OTk5OTcwMTk3Njc3NiwwLjY0OTk5OTk3NjE1ODE0MjFdLCJtZXRhbGxpY0ZhY3RvciI6MH19LHsiZW1pc3NpdmVGYWN0b3IiOlsxLDAuODk5OTk5OTc2MTU4MTQyMSwwLjU2OTk5OTk5Mjg0NzQ0MjZdLCJuYW1lIjoiY2xhc3NpYyBhZnRlcmJ1cm5lciBjb3JlIiwicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMSwwLjg5OTk5OTk3NjE1ODE0MjEsMC41Njk5OTk5OTI4NDc0NDI2LDFdLCJtZXRhbGxpY0ZhY3RvciI6MH19XSwibWVzaGVzIjpbeyJuYW1lIjoiY2xhc3NpYyBhbWJlciBzaGVhdGgiLCJwcmltaXRpdmVzIjpbeyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjowLCJOT1JNQUwiOjF9LCJpbmRpY2VzIjoyLCJtYXRlcmlhbCI6MH0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjozLCJOT1JNQUwiOjR9LCJpbmRpY2VzIjo1LCJtYXRlcmlhbCI6MX0seyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjo2LCJOT1JNQUwiOjd9LCJpbmRpY2VzIjo4LCJtYXRlcmlhbCI6Mn1dfV0sImFjY2Vzc29ycyI6W3siYnVmZmVyVmlldyI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjk2LCJtYXgiOlswLjE2NDU0NDgyMDc4NTUyMjQ2LDAuMDE5MTUwMDAwMDY1NTY1MTEsNC4zMjk5OTk5MjM3MDYwNTVdLCJtaW4iOlstMC4xNjQ1NDQ4MjA3ODU1MjI0NiwtMC4yOTI0NTAwMTA3NzY1MTk4LDIuNDMwMDAwMDY2NzU3MjAyXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50Ijo5NiwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjoxMzgsInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjMsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50Ijo3MiwibWF4IjpbMC4xMDY5NTQxMzUwMDA3MDU3MiwtMC4wMzUwMjk5OTk5MTE3ODUxMjYsMy45NTAwMDAwNDc2ODM3MTZdLCJtaW4iOlstMC4xMDY5NTQxMzUwMDA3MDU3MiwtMC4yMzc1NzAwMDI2NzUwNTY0NiwyLjQzMDAwMDA2Njc1NzIwMl0sInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo0LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6NzIsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3Ijo1LCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6MTAyLCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3Ijo2LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6NDgsIm1heCI6WzAuMDU0Mjk5Nzk0MTM3NDc3ODc1LC0wLjA4NTU4NTk5NjUwODU5ODMzLDMuNTEzMDAwMDExNDQ0MDkyXSwibWluIjpbLTAuMDU0Mjk5Nzk0MTM3NDc3ODc1LC0wLjE4ODQxNDAwNzQyNTMwODIzLDIuNDMwMDAwMDY2NzU3MjAyXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjcsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50Ijo0OCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjgsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50Ijo2NiwidHlwZSI6IlNDQUxBUiJ9XSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6MTE1MiwiYnl0ZU9mZnNldCI6MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjExNTIsImJ5dGVPZmZzZXQiOjExNTIsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyNzYsImJ5dGVPZmZzZXQiOjIzMDQsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo4NjQsImJ5dGVPZmZzZXQiOjI1ODAsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo4NjQsImJ5dGVPZmZzZXQiOjM0NDQsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyMDQsImJ5dGVPZmZzZXQiOjQzMDgsInRhcmdldCI6MzQ5NjN9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo1NzYsImJ5dGVPZmZzZXQiOjQ1MTIsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo1NzYsImJ5dGVPZmZzZXQiOjUwODgsInRhcmdl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", import.meta.url).href
}), IP = Object.freeze({
  flight: null,
  assets: bt,
  start: Object.freeze({
    speedMps: h.cruiseSpeed
  }),
  camera: Object.freeze({
    mode: "chase",
    fovDeg: uP,
    bankedViewport: !0,
    submissionHz: 60
  }),
  controls: Object.freeze({
    keyboard: !0,
    gamepad: !0,
    sensitivity: BP,
    invertPitch: it,
    captureSceneNavigation: !0
  }),
  terrain: Object.freeze({
    enabled: !0,
    minimumClearanceM: 2.8,
    maximumAglM: 5e4
  }),
  ui: Object.freeze({
    enabled: !1,
    joystick: "auto",
    joystickPosition: "bottom-left",
    position: "bottom-end",
    controls: jP,
    showSpeed: !1,
    locale: "auto"
  }),
  powerMode: "normal",
  autoStart: !0
});
function CA(e) {
  return Number.isFinite(e) ? Number(e) : void 0;
}
function Vt(e) {
  return jP.includes(e);
}
function HA(e) {
  return Lt.includes(e);
}
function pP(e) {
  return Array.from(new Set(e.filter(Vt)));
}
function qt(e, A) {
  return e === "auto" ? "auto" : qA(e) ?? A;
}
function bA(e = {}, A = IP) {
  var u, l, C, d;
  const P = { ...A.start, ...e.start }, t = CA(P.longitude), s = CA(P.latitude);
  if (t === void 0 != (s === void 0))
    throw new Error("start.longitude and start.latitude must be supplied together.");
  if (s !== void 0 && (s < -90 || s > 90))
    throw new Error("start.latitude must be between -90 and 90 degrees.");
  const i = { ...A.camera, ...e.camera }, r = { ...A.controls, ...e.controls }, a = { ...A.terrain, ...e.terrain }, o = { ...A.ui, ...e.ui }, n = { ...A.assets, ...e.assets };
  if (!((u = n.bodyUrl) != null && u.trim()))
    throw new Error("assets.bodyUrl is required.");
  const D = e.flight === void 0 ? A.flight : e.flight, g = D ? Qt(D) : null;
  if (n.propellerAnchorM && ![n.propellerAnchorM.x, n.propellerAnchorM.y, n.propellerAnchorM.z].every(Number.isFinite))
    throw new Error("assets.propellerAnchorM must contain finite metre offsets.");
  if (n.visualPitchDeg !== void 0 && !Number.isFinite(n.visualPitchDeg))
    throw new Error("assets.visualPitchDeg must be finite.");
  return {
    flight: g,
    assets: {
      propellerAnchorM: n.propellerAnchorM ? { ...n.propellerAnchorM } : void 0,
      preserveFinish: n.preserveFinish,
      visualPitchDeg: n.visualPitchDeg,
      bodyUrl: n.bodyUrl,
      propellerUrl: ((l = n.propellerUrl) == null ? void 0 : l.trim()) || null,
      boostUrl: ((C = n.boostUrl) == null ? void 0 : C.trim()) || null
    },
    start: {
      longitude: t,
      latitude: s,
      altitudeM: CA(P.altitudeM),
      headingDeg: CA(P.headingDeg),
      speedMps: v(
        CA((d = e.start) == null ? void 0 : d.speedMps) ?? (e.flight !== void 0 ? (g == null ? void 0 : g.tuning.cruiseSpeed) ?? h.cruiseSpeed : CA(P.speedMps) ?? h.cruiseSpeed),
        (g == null ? void 0 : g.tuning.minimumSpeed) ?? h.minimumSpeed,
        (g == null ? void 0 : g.tuning.turboMaximumSpeed) ?? h.turboMaximumSpeed
      )
    },
    camera: {
      mode: i.mode === "cockpit" ? "cockpit" : "chase",
      fovDeg: v(Number(i.fovDeg) || uP, 58, 76),
      bankedViewport: i.bankedViewport !== !1,
      submissionHz: v(Number(i.submissionHz) || 60, 30, 60)
    },
    controls: {
      keyboard: r.keyboard !== !1,
      gamepad: r.gamepad !== !1,
      sensitivity: v(
        Number(r.sensitivity) || BP,
        0.5,
        2
      ),
      invertPitch: r.invertPitch !== !1,
      captureSceneNavigation: r.captureSceneNavigation !== !1
    },
    terrain: {
      enabled: a.enabled !== !1,
      minimumClearanceM: v(
        Number(a.minimumClearanceM) || 2.8,
        0.5,
        100
      ),
      maximumAglM: v(
        Number(a.maximumAglM) || 5e4,
        100,
        2e5
      )
    },
    ui: {
      enabled: o.enabled === !0,
      joystick: ["auto", "always", "never"].includes(o.joystick) ? o.joystick : A.ui.joystick,
      joystickPosition: HA(o.joystickPosition) ? o.joystickPosition : A.ui.joystickPosition,
      position: HA(o.position) ? o.position : A.ui.position,
      controls: pP(
        Array.isArray(o.controls) ? o.controls : A.ui.controls
      ),
      showSpeed: o.showSpeed === !0,
      locale: qt(o.locale, A.ui.locale)
    },
    powerMode: Me(e.powerMode) ? e.powerMode : A.powerMode,
    autoStart: e.autoStart ?? A.autoStart
  };
}
function DA(e, A) {
  var P;
  return bA({
    ...A,
    assets: { ...e.assets, ...A.assets },
    start: { ...e.start, ...A.flight !== void 0 && ((P = A.start) == null ? void 0 : P.speedMps) === void 0 ? { speedMps: void 0 } : {}, ...A.start },
    camera: { ...e.camera, ...A.camera },
    controls: { ...e.controls, ...A.controls },
    terrain: { ...e.terrain, ...A.terrain },
    ui: { ...e.ui, ...A.ui },
    powerMode: A.powerMode ?? e.powerMode,
    autoStart: A.autoStart ?? e.autoStart
  }, e);
}
function mA(e) {
  return {
    position: { ...e.position },
    bodyHeading: e.heading,
    travelHeading: e.heading,
    pitch: e.pitch,
    roll: e.bank,
    speed: e.speed
  };
}
function Ot(e, A) {
  return {
    ...e,
    position: { ...e.position },
    boost: A.launchBoost
  };
}
function Yt(e, A) {
  return {
    ...e,
    position: { ...A.position },
    heading: A.bodyHeading,
    pitch: A.pitch,
    bank: A.roll,
    speed: A.speed
  };
}
const yt = 1 / 60, Gt = 5;
function Be(e) {
  const A = e % 360;
  return A < 0 ? A + 360 : A;
}
function $(e) {
  return {
    position: { ...e.position },
    bodyHeading: Be(e.bodyHeading),
    travelHeading: Be(e.travelHeading),
    pitch: e.pitch,
    roll: e.roll,
    speed: e.speed
  };
}
function te(e) {
  if ([
    e.position.x,
    e.position.y,
    e.position.z,
    e.bodyHeading,
    e.travelHeading,
    e.pitch,
    e.roll,
    e.speed
  ].some((P) => !Number.isFinite(P)))
    throw new Error("GameRuntime received a pose containing a non-finite value.");
}
function dA(e, A, P) {
  return e + (A - e) * P;
}
function Fe(e, A, P) {
  const t = (A - e + 540) % 360 - 180;
  return Be(e + t * P);
}
function ft(e, A, P) {
  const t = Math.min(1, Math.max(0, P));
  return {
    position: {
      x: dA(e.position.x, A.position.x, t),
      y: dA(e.position.y, A.position.y, t),
      z: dA(e.position.z, A.position.z, t)
    },
    bodyHeading: Fe(e.bodyHeading, A.bodyHeading, t),
    travelHeading: Fe(e.travelHeading, A.travelHeading, t),
    pitch: dA(e.pitch, A.pitch, t),
    roll: dA(e.roll, A.roll, t),
    speed: dA(e.speed, A.speed, t),
    interpolationAlpha: t
  };
}
class Ut {
  /** Creates a simulation clock around an initial pose and deterministic step function. */
  constructor(A, P, t = {}) {
    w(this, "fixedStepSeconds");
    w(this, "maxCatchUpSteps");
    w(this, "previous");
    w(this, "current");
    w(this, "accumulatorSeconds", 0);
    w(this, "lastTimestampMs", null);
    w(this, "stepIndex", 0);
    w(this, "pausedState", !1);
    if (this.stepPhysics = P, this.fixedStepSeconds = t.fixedStepSeconds ?? yt, this.maxCatchUpSteps = t.maxCatchUpSteps ?? Gt, !Number.isFinite(this.fixedStepSeconds) || this.fixedStepSeconds <= 0)
      throw new Error("GameRuntime fixedStepSeconds must be greater than zero.");
    if (!Number.isInteger(this.maxCatchUpSteps) || this.maxCatchUpSteps < 1)
      throw new Error("GameRuntime maxCatchUpSteps must be a positive integer.");
    te(A), this.previous = $(A), this.current = $(A);
  }
  /** Whether fixed-step updates are currently suspended. */
  get paused() {
    return this.pausedState;
  }
  /** Number of fixed steps completed since construction or reset. */
  get simulationStep() {
    return this.stepIndex;
  }
  /** Returns a defensive copy of the latest simulated pose. */
  get currentPose() {
    return $(this.current);
  }
  /** Advances using a display timestamp in milliseconds; the first call only establishes a baseline. */
  tick(A) {
    if (!Number.isFinite(A))
      throw new Error("GameRuntime timestamp must be finite.");
    if (this.lastTimestampMs === null)
      return this.lastTimestampMs = A, this.createFrame(0, 0);
    const P = Math.max(0, (A - this.lastTimestampMs) / 1e3);
    return this.lastTimestampMs = A, this.advanceFrame(P);
  }
  /** Advances from elapsed wall time, dropping catch-up excess after a long stall. */
  advanceFrame(A) {
    if (!Number.isFinite(A) || A < 0)
      throw new Error("GameRuntime elapsedSeconds must be a finite non-negative value.");
    if (this.pausedState)
      return this.createFrame(0, 0);
    const P = this.accumulatorSeconds + A, t = Math.floor(P / this.fixedStepSeconds + 1e-9), s = Math.min(t, this.maxCatchUpSteps), r = Math.max(0, t - s) * this.fixedStepSeconds;
    for (let a = 0; a < s; a += 1)
      this.simulateOneStep();
    return this.accumulatorSeconds = P - s * this.fixedStepSeconds - r, this.accumulatorSeconds < 0 && this.accumulatorSeconds > -1e-10 && (this.accumulatorSeconds = 0), this.accumulatorSeconds = Math.min(
      Math.max(0, this.accumulatorSeconds),
      this.fixedStepSeconds * (1 - Number.EPSILON)
    ), this.createFrame(s, r);
  }
  /** Advances an exact number of fixed steps, primarily for deterministic replay. */
  advanceFixedSteps(A = 1) {
    if (!Number.isInteger(A) || A < 0)
      throw new Error("GameRuntime fixed-step count must be a non-negative integer.");
    if (this.pausedState)
      return this.createFrame(0, 0);
    for (let P = 0; P < A; P += 1)
      this.simulateOneStep();
    return this.accumulatorSeconds = 0, this.createFrame(A, 0);
  }
  /** Pauses simulation and clears timing remainder so resume cannot catch up old time. */
  pause() {
    return this.pausedState = !0, this.clearTimingRemainder(), this.createFrame(0, 0);
  }
  /** Resumes with a clean timing baseline, avoiding a jump on the next display frame. */
  resume() {
    return this.pausedState = !1, this.clearTimingRemainder(), this.createFrame(0, 0);
  }
  /** Replaces simulation state and step index, optionally retaining a paused state. */
  reset(A, P = this.pausedState) {
    return te(A), this.previous = $(A), this.current = $(A), this.accumulatorSeconds = 0, this.lastTimestampMs = null, this.stepIndex = 0, this.pausedState = P, this.createFrame(0, 0);
  }
  simulateOneStep() {
    this.previous = $(this.current);
    const A = this.stepPhysics(this.current, this.fixedStepSeconds, this.stepIndex);
    te(A), this.current = $(A), this.stepIndex += 1;
  }
  clearTimingRemainder() {
    this.accumulatorSeconds = 0, this.lastTimestampMs = null, this.previous = $(this.current);
  }
  createFrame(A, P) {
    const t = this.accumulatorSeconds / this.fixedStepSeconds;
    return {
      previousPose: $(this.previous),
      currentPose: $(this.current),
      renderPose: ft(this.previous, this.current, t),
      interpolationAlpha: t,
      simulatedSteps: A,
      simulationStep: this.stepIndex,
      droppedSeconds: P,
      paused: this.pausedState
    };
  }
}
const QP = /* @__PURE__ */ new Set([
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
  "Escape"
]), kt = /* @__PURE__ */ new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space"
]), Rt = "input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox']", Ft = "button, a, [role='button'], [role='menuitem'], [role='radio']", XA = 0.18, Se = 0.28, gA = {
  attackResponse: 3.2,
  minimumAttackResponse: 2,
  maximumAttackResponse: 5,
  releaseResponse: 5.5,
  yawAuthority: 0.55
}, zA = Object.freeze({
  sensitivity: 0.8,
  invertPitch: !0,
  keyboardEnabled: !0,
  gamepadEnabled: !0,
  gamepadDeadzone: XA
});
function W(e, A, P) {
  return Math.min(P, Math.max(A, e));
}
function uA(e, A) {
  const P = Number(e);
  return Number.isFinite(P) ? P : A;
}
function _(e) {
  return W(uA(e, 0), -1, 1);
}
function VA(e) {
  return e != null && e.pressed ? 1 : W(uA(e == null ? void 0 : e.value, 0), 0, 1);
}
function se(e = {}) {
  return {
    sensitivity: W(
      uA(e.sensitivity, zA.sensitivity),
      0.5,
      2
    ),
    invertPitch: e.invertPitch ?? zA.invertPitch,
    keyboardEnabled: e.keyboardEnabled ?? zA.keyboardEnabled,
    gamepadEnabled: e.gamepadEnabled ?? zA.gamepadEnabled,
    gamepadDeadzone: W(
      uA(e.gamepadDeadzone, zA.gamepadDeadzone),
      0,
      0.75
    )
  };
}
function xe(e, A = XA) {
  const P = _(e), t = W(uA(A, XA), 0, 0.75), s = Math.abs(P);
  return s <= t ? 0 : Math.sign(P) * (s - t) / (1 - t);
}
function St(e, A = !0) {
  const P = A ? Math.hypot(_(e.axes[0]), _(e.axes[1])) : 0, t = e.buttons.reduce(
    // Some virtual controllers keep the system Guide button held. It is not flight input.
    (s, i, r) => e.mapping === "standard" && r === 16 ? s : Math.max(s, VA(i)),
    0
  );
  return Math.max(P, t);
}
function xt(e, A, P, t = XA) {
  const s = e.filter(
    (a) => !!(a != null && a.connected && a.mapping === "standard")
  ), i = s.find(({ index: a }) => a === A) ?? null;
  if (i) return i;
  if (s.length === 1) return s[0] ?? null;
  const r = (a) => St(
    a,
    (P == null ? void 0 : P.has(a.index)) ?? !0
  );
  return s.filter((a) => r(a) >= t).sort((a, o) => r(o) - r(a))[0] ?? null;
}
function Ne(e, A) {
  return !QP.has(e) || A === "editable" ? !1 : A !== "activation" || !kt.has(e);
}
function FA(e) {
  var P;
  const A = (P = e.composedPath) == null ? void 0 : P.call(e);
  return A != null && A.length ? A : e.target ? [e.target] : [];
}
function He(e, A) {
  var t;
  const P = e;
  try {
    return !!((t = P.matches) != null && t.call(P, A));
  } catch {
    return !1;
  }
}
function Xe(e) {
  const A = FA(e);
  return A.some((P) => He(P, Rt)) ? "editable" : A.some((P) => He(P, Ft)) ? "activation" : "none";
}
function ie(e, A, P, t) {
  const s = W(uA(t, 0.016666666666666666), 0, 0.1);
  return A + (e - A) * Math.exp(-P * s);
}
function Nt() {
  return {
    pitch: 0,
    bank: 0,
    yaw: 0,
    accelerate: 0,
    turboBoost: !1,
    brake: 0,
    airbrake: !1,
    respawn: !1
  };
}
class Ht {
  /** Installs capturing listeners on the target document's window and visibility events. */
  constructor(A) {
    w(this, "target");
    w(this, "document");
    w(this, "view");
    w(this, "getLiveSettings");
    w(this, "getGamepads");
    w(this, "onPauseRequested");
    w(this, "onRecoverRequested");
    w(this, "onPowerModeStepRequested");
    w(this, "settingsState");
    w(this, "keys", /* @__PURE__ */ new Set());
    w(this, "controlPatch", {});
    w(this, "interactionOwned", !1);
    w(this, "recoveryLatched", !1);
    w(this, "keyboardPitch", 0);
    w(this, "keyboardBank", 0);
    w(this, "keyboardYaw", 0);
    w(this, "touchBank", 0);
    w(this, "touchPitch", 0);
    w(this, "gamepadSlot", null);
    w(this, "gamepadId", null);
    w(this, "gamepadMapping", null);
    w(this, "gamepadAxesReady", /* @__PURE__ */ new Set());
    w(this, "gamepadAxesArmed", !1);
    w(this, "menuPressed", !1);
    w(this, "powerFasterPressed", !1);
    w(this, "powerSlowerPressed", !1);
    w(this, "destroyed", !1);
    w(this, "handleKeyDown", (A) => {
      const P = A.code === "KeyR" && A.altKey && !A.ctrlKey && !A.metaKey;
      if (this.destroyed || A.isComposing || A.ctrlKey || A.metaKey || A.altKey && !P || A.code === "KeyR" && !P || !this.resolveSettings().keyboardEnabled || !this.ownsInteraction(A) || !(A.repeat && this.keys.has(A.code)) && !Ne(A.code, Xe(A))) {
        this.keys.delete(A.code);
        return;
      }
      if (this.capture(A), A.code === "Escape") {
        A.repeat || this.requestPause();
        return;
      }
      if (P) {
        A.repeat || this.requestRecovery();
        return;
      }
      this.keys.add(A.code);
    });
    w(this, "handleKeyUp", (A) => {
      QP.has(A.code) && (this.keys.delete(A.code), A.code !== "KeyR" && (this.destroyed || A.isComposing || A.ctrlKey || A.metaKey || A.altKey || !this.resolveSettings().keyboardEnabled || !this.ownsInteraction(A) || !Ne(A.code, Xe(A)) || this.capture(A)));
    });
    w(this, "handlePointerDown", (A) => {
      const P = FA(A).includes(this.target);
      this.interactionOwned = P, P || (this.releaseKeyboard(), this.recoveryLatched = !1);
    });
    w(this, "handleFocusIn", (A) => {
      this.interactionOwned = FA(A).includes(this.target), this.interactionOwned || this.releaseKeyboard();
    });
    w(this, "handleWindowBlur", () => {
      this.interactionOwned = !1, this.setTouchStick(0, 0), this.releaseKeyboard(), this.recoveryLatched = !1;
    });
    w(this, "handleVisibilityChange", () => {
      this.document.visibilityState !== "visible" && this.handleWindowBlur();
    });
    w(this, "handleGamepadConnected", (A) => {
      A.gamepad.mapping === "standard" && Math.hypot(_(A.gamepad.axes[0]), _(A.gamepad.axes[1])) <= Se && this.gamepadAxesReady.add(A.gamepad.index);
    });
    w(this, "handleGamepadDisconnected", (A) => {
      this.gamepadAxesReady.delete(A.gamepad.index), A.gamepad.index === this.gamepadSlot && this.releaseGamepad();
    });
    this.target = A.target, this.document = A.target.ownerDocument;
    const P = this.document.defaultView;
    if (!P) throw new Error("FlightInputController requires a target in a browser document.");
    this.view = P, this.settingsState = se(A.settings), this.getLiveSettings = A.getSettings, this.getGamepads = A.getGamepads ?? (() => {
      var t, s;
      return Array.from(((s = (t = this.view.navigator).getGamepads) == null ? void 0 : s.call(t)) ?? []);
    }), this.onPauseRequested = A.onPauseRequested, this.onRecoverRequested = A.onRecoverRequested, this.onPowerModeStepRequested = A.onPowerModeStepRequested, this.view.addEventListener("keydown", this.handleKeyDown, !0), this.view.addEventListener("keyup", this.handleKeyUp, !0), this.view.addEventListener("pointerdown", this.handlePointerDown, !0), this.view.addEventListener("focusin", this.handleFocusIn, !0), this.view.addEventListener("blur", this.handleWindowBlur), this.view.addEventListener("gamepadconnected", this.handleGamepadConnected), this.view.addEventListener("gamepaddisconnected", this.handleGamepadDisconnected), this.document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }
  /** Current settings after combining constructor values and live settings. */
  get settings() {
    return this.resolveSettings();
  }
  /** Stores normalized touch axes separately so stick release preserves host patches. */
  setTouchStick(A, P) {
    this.touchBank = _(A), this.touchPitch = _(P);
  }
  /** Returns the currently selected gamepad identity, if any. */
  get gamepadStatus() {
    return {
      connected: this.gamepadSlot !== null,
      index: this.gamepadSlot,
      id: this.gamepadId,
      mapping: this.gamepadMapping
    };
  }
  /** Updates stored settings and releases disabled sources; `getSettings` still takes precedence. */
  updateSettings(A) {
    return this.settingsState = se({ ...this.settingsState, ...A }), this.settingsState.keyboardEnabled || this.releaseKeyboard(), this.settingsState.gamepadEnabled || this.releaseGamepad(), this.settings;
  }
  /** Adds validated host overrides; omitted patch fields retain their prior override. */
  setControlPatch(A) {
    const P = { ...this.controlPatch };
    this.setNumericPatch(P, "pitch", A.pitch, -1, 1), this.setNumericPatch(P, "bank", A.bank, -1, 1), this.setNumericPatch(P, "yaw", A.yaw, -1, 1), this.setNumericPatch(P, "accelerate", A.accelerate, 0, 1), this.setNumericPatch(P, "brake", A.brake, 0, 1), this.setBooleanPatch(P, "turboBoost", A.turboBoost), this.setBooleanPatch(P, "airbrake", A.airbrake), A.respawn === !0 && this.requestRecovery(), this.controlPatch = P;
  }
  /** Removes all host overrides or selected fields; recovery is a one-shot latch. */
  clearControlPatch(A) {
    if (!A) {
      this.controlPatch = {}, this.recoveryLatched = !1;
      return;
    }
    const P = { ...this.controlPatch };
    for (const t of A)
      t === "respawn" ? this.recoveryLatched = !1 : delete P[t];
    this.controlPatch = P;
  }
  /** Invokes the pause callback unless the controller has been destroyed. */
  requestPause() {
    var A;
    this.destroyed || (A = this.onPauseRequested) == null || A.call(this);
  }
  /** Latches a one-frame recovery request and notifies the session. */
  requestRecovery() {
    var A;
    this.destroyed || (this.recoveryLatched = !0, (A = this.onRecoverRequested) == null || A.call(this));
  }
  /** Polls button edges while paused so Menu can resume without advancing flight axes. */
  pollGamepadActions() {
    this.destroyed || this.pollGamepad(this.resolveSettings(), this.ownsInteraction());
  }
  /**
   * Samples owned input sources and merges host overrides into a normalized frame.
   * Digital keyboard axes are smoothed over `deltaSeconds`; gamepad sticks use a
   * dead zone and must first return near center after connection or selection.
   * Recovery is a one-frame latch and is cleared after sampling.
   */
  sample(A = 1 / 60) {
    if (this.destroyed) return Nt();
    const P = this.resolveSettings(), t = this.ownsInteraction(), s = this.pollGamepad(P, t), i = t && P.keyboardEnabled;
    !i && this.keys.size > 0 && this.releaseKeyboard();
    const r = i ? (this.hasEither("KeyW", "ArrowUp") ? 1 : 0) - (this.hasEither("KeyS", "ArrowDown") ? 1 : 0) : 0, a = i ? (this.hasEither("KeyD", "ArrowRight") ? 1 : 0) - (this.hasEither("KeyA", "ArrowLeft") ? 1 : 0) : 0, o = i ? (this.keys.has("KeyE") ? 1 : 0) - (this.keys.has("KeyQ") ? 1 : 0) : 0, n = W(
      gA.attackResponse * P.sensitivity,
      gA.minimumAttackResponse,
      gA.maximumAttackResponse
    );
    this.keyboardPitch = ie(
      this.keyboardPitch,
      r,
      r === 0 ? gA.releaseResponse : n,
      A
    ), this.keyboardBank = ie(
      this.keyboardBank,
      a,
      a === 0 ? gA.releaseResponse : n,
      A
    ), this.keyboardYaw = ie(
      this.keyboardYaw,
      o * gA.yawAuthority,
      o === 0 ? gA.releaseResponse : n,
      A
    );
    const D = xe((s == null ? void 0 : s.axes[0]) ?? 0, P.gamepadDeadzone), g = xe((s == null ? void 0 : s.axes[1]) ?? 0, P.gamepadDeadzone), u = P.invertPitch ? -1 : 1, l = {
      pitch: W(
        (this.keyboardPitch + (this.touchPitch - g) * P.sensitivity) * u,
        -1,
        1
      ) || 0,
      bank: W(this.keyboardBank + (D + this.touchBank) * P.sensitivity, -1, 1),
      yaw: W(
        this.keyboardYaw + VA(s == null ? void 0 : s.buttons[5]) - VA(s == null ? void 0 : s.buttons[4]),
        -1,
        1
      ),
      accelerate: W(
        (i && this.hasEither("ShiftLeft", "ShiftRight") ? 1 : 0) + VA(s == null ? void 0 : s.buttons[7]),
        0,
        1
      ),
      turboBoost: !1,
      brake: W(
        (i && this.keys.has("Space") ? 1 : 0) + VA(s == null ? void 0 : s.buttons[6]),
        0,
        1
      ),
      airbrake: i && this.keys.has("Space"),
      respawn: this.recoveryLatched
    };
    return this.recoveryLatched = !1, { ...l, ...this.controlPatch };
  }
  /** Releases held keys, pointer/gamepad ownership, touch values, and host overrides. */
  clear() {
    this.releaseKeyboard(), this.setTouchStick(0, 0), this.controlPatch = {}, this.recoveryLatched = !1, this.interactionOwned = !1, this.releaseGamepad(), this.gamepadAxesReady.clear();
  }
  /** Removes installed listeners and clears held input; safe to call more than once. */
  destroy() {
    this.destroyed || (this.destroyed = !0, this.view.removeEventListener("keydown", this.handleKeyDown, !0), this.view.removeEventListener("keyup", this.handleKeyUp, !0), this.view.removeEventListener("pointerdown", this.handlePointerDown, !0), this.view.removeEventListener("focusin", this.handleFocusIn, !0), this.view.removeEventListener("blur", this.handleWindowBlur), this.view.removeEventListener("gamepadconnected", this.handleGamepadConnected), this.view.removeEventListener("gamepaddisconnected", this.handleGamepadDisconnected), this.document.removeEventListener("visibilitychange", this.handleVisibilityChange), this.clear());
  }
  resolveSettings() {
    var A;
    return se({
      ...this.settingsState,
      ...(A = this.getLiveSettings) == null ? void 0 : A.call(this)
    });
  }
  setNumericPatch(A, P, t, s, i) {
    t !== void 0 && (A[P] = W(uA(t, 0), s, i));
  }
  setBooleanPatch(A, P, t) {
    t !== void 0 && (A[P] = !!t);
  }
  hasEither(A, P) {
    return this.keys.has(A) || this.keys.has(P);
  }
  ownsTarget(A) {
    if (!A) return !1;
    if (A === this.target) return !0;
    try {
      return this.target.contains(A) ? !0 : this.target.matches(":focus-within");
    } catch {
      return !1;
    }
  }
  ownsInteraction(A) {
    if (this.document.visibilityState !== "visible" || !this.document.hasFocus())
      return !1;
    if (A && FA(A).includes(this.target)) return !0;
    const P = this.document.activeElement;
    return P && P !== this.document.body ? this.ownsTarget(P) : this.interactionOwned || this.ownsTarget(P);
  }
  releaseKeyboard() {
    this.keys.clear(), this.keyboardPitch = 0, this.keyboardBank = 0, this.keyboardYaw = 0;
  }
  /** Selects and arms a standard pad, then emits Menu and D-pad actions on press edges. */
  pollGamepad(A, P) {
    var u, l, C, d, M, c, j, p;
    if (!A.gamepadEnabled)
      return this.releaseGamepad(), null;
    const t = Array.from(this.getGamepads()), s = W(
      Math.max(Se, A.gamepadDeadzone + 0.1),
      0,
      0.9
    );
    for (const z of t)
      !(z != null && z.connected) || z.mapping !== "standard" || Math.hypot(_(z.axes[0]), _(z.axes[1])) <= s && this.gamepadAxesReady.add(z.index);
    const i = t.find(
      (z) => (z == null ? void 0 : z.connected) && z.mapping === "standard" && z.index === this.gamepadSlot
    ) ?? null;
    if (this.gamepadSlot !== null && !i && this.releaseGamepad(), !P)
      return this.menuPressed = !!((u = i == null ? void 0 : i.buttons[9]) != null && u.pressed), this.powerFasterPressed = !!((l = i == null ? void 0 : i.buttons[12]) != null && l.pressed), this.powerSlowerPressed = !!((C = i == null ? void 0 : i.buttons[13]) != null && C.pressed), null;
    const r = xt(
      t,
      this.gamepadSlot,
      this.gamepadAxesReady,
      A.gamepadDeadzone
    );
    if (this.useGamepad(r), !r) return null;
    const a = _(r.axes[0]), o = _(r.axes[1]);
    !this.gamepadAxesArmed && Math.hypot(a, o) <= s && (this.gamepadAxesArmed = !0);
    const n = !!((d = r.buttons[9]) != null && d.pressed);
    n && !this.menuPressed && this.requestPause(), this.menuPressed = n;
    const D = !!((M = r.buttons[12]) != null && M.pressed);
    D && !this.powerFasterPressed && ((c = this.onPowerModeStepRequested) == null || c.call(this, "faster")), this.powerFasterPressed = D;
    const g = !!((j = r.buttons[13]) != null && j.pressed);
    return g && !this.powerSlowerPressed && ((p = this.onPowerModeStepRequested) == null || p.call(this, "slower")), this.powerSlowerPressed = g, this.gamepadAxesArmed ? r : { ...r, axes: r.axes.map(() => 0) };
  }
  useGamepad(A) {
    if ((A == null ? void 0 : A.index) === this.gamepadSlot) {
      this.gamepadId = A.id, this.gamepadMapping = A.mapping;
      return;
    }
    this.gamepadSlot = (A == null ? void 0 : A.index) ?? null, this.gamepadId = (A == null ? void 0 : A.id) ?? null, this.gamepadMapping = (A == null ? void 0 : A.mapping) ?? null, this.gamepadAxesArmed = A ? this.gamepadAxesReady.has(A.index) : !1, this.menuPressed = !1, this.powerFasterPressed = !1, this.powerSlowerPressed = !1;
  }
  releaseGamepad() {
    this.useGamepad(null), this.gamepadAxesArmed = !1, this.menuPressed = !1, this.powerFasterPressed = !1, this.powerSlowerPressed = !1;
  }
  capture(A) {
    A.preventDefault(), A.stopPropagation();
  }
}
const Xt = 30, EA = 180, Wt = 250;
class Jt {
  constructor() {
    w(this, "frameTimes", new Float64Array(EA));
    w(this, "count", 0);
    w(this, "cursor", 0);
    w(this, "totalFrameMs", 0);
  }
  /** Adds one display-frame duration; invalid or long-stall values clear the rolling window. */
  observe(A) {
    if (!Number.isFinite(A) || A <= 0 || A >= Wt) {
      this.clear();
      return;
    }
    this.count === EA ? this.totalFrameMs -= this.frameTimes[this.cursor] ?? 0 : this.count += 1, this.frameTimes[this.cursor] = A, this.totalFrameMs += A, this.cursor = (this.cursor + 1) % EA;
  }
  /** Returns average FPS and p95 duration once enough frames have been observed. */
  sample() {
    if (this.count < Xt)
      return { averageFps: null, p95FrameMs: null };
    const A = this.values().sort((P, t) => P - t);
    return {
      averageFps: 1e3 / (this.totalFrameMs / this.count),
      p95FrameMs: A[Math.max(0, Math.ceil(A.length * 0.95) - 1)] ?? null
    };
  }
  /** Discards accumulated frame history, for example when a session resumes. */
  clear() {
    this.count = 0, this.cursor = 0, this.totalFrameMs = 0;
  }
  values() {
    const A = new Array(this.count), P = this.count === EA ? this.cursor : 0;
    for (let t = 0; t < this.count; t += 1)
      A[t] = this.frameTimes[(P + t) % EA] ?? 0;
    return A;
  }
}
const Kt = {
  pitch: 0,
  bank: 0,
  yaw: 0,
  accelerate: 0,
  turboBoost: !1,
  brake: 0,
  airbrake: !1,
  respawn: !1
}, Zt = Object.freeze({
  connected: !1,
  index: null,
  id: null,
  mapping: null
});
function aA(e) {
  return { ...e, position: { ...e.position } };
}
function _t(e, A) {
  var t;
  const P = ((t = A.flight) == null ? void 0 : t.tuning) ?? h;
  return {
    ...e,
    position: { ...e.position },
    pitch: 0,
    bank: 0,
    driftAngle: 0,
    speed: P.cruiseSpeed,
    throttle: 0.52,
    launchBoost: 0,
    cornerAssist: 0,
    verticalSpeed: 0,
    speedBar: void 0,
    wingBrake: void 0,
    speedBarRate: void 0,
    wingBrakeRate: void 0,
    wingRollRate: void 0,
    wingPitchRate: void 0,
    spaceTurnRate: void 0,
    spacePitchRate: void 0
  };
}
function oe(e) {
  if (e !== "chase" && e !== "cockpit")
    throw new TypeError(`Unsupported camera mode: ${String(e)}.`);
}
function re(e) {
  if (!Me(e))
    throw new TypeError(`Unsupported power mode: ${String(e)}.`);
}
class $t {
  /** Creates a ready session; call `initialize()` before start or live updates. */
  constructor(A) {
    w(this, "flightProfile");
    w(this, "scene");
    w(this, "onSnapshot");
    w(this, "minimumClearanceM");
    w(this, "maximumAglM");
    w(this, "recoverSpeedMps");
    w(this, "initialInputSettings");
    w(this, "input", null);
    w(this, "phaseState", "ready");
    w(this, "vehicle");
    w(this, "safeVehicle");
    w(this, "runtime");
    w(this, "runtimeFrame");
    w(this, "smoothedPitchInput", 0);
    w(this, "debugControl", null);
    w(this, "cameraModeState");
    w(this, "bankedViewportState");
    w(this, "powerModeState");
    w(this, "fovDegrees");
    w(this, "animationFrame", 0);
    w(this, "lastFrameTime", performance.now());
    w(this, "lastSnapshotTime", 0);
    w(this, "lastFramePacingTime", 0);
    w(this, "framePacing", new Jt());
    w(this, "initialized", !1);
    w(this, "destroyed", !1);
    w(this, "aircraftRequest", 0);
    /** Runs one display frame; paused flights only poll gamepad button edges. */
    w(this, "onFrame", (A) => {
      if (this.animationFrame = 0, this.destroyed) return;
      if (this.phaseState === "paused") {
        this.requireInput().pollGamepadActions(), this.requestNextFrame();
        return;
      }
      if (this.phaseState !== "running") return;
      const P = A - this.lastFrameTime, t = Math.min(
        0.1,
        Math.max(1 / 240, P / 1e3)
      );
      if (this.lastFrameTime = A, this.framePacing.observe(P), A - this.lastFramePacingTime >= 500) {
        this.lastFramePacingTime = A;
        const s = document.visibilityState === "visible" && document.hasFocus();
        this.scene.setFramePacing(
          s ? this.framePacing.sample() : { averageFps: null, p95FrameMs: null }
        );
      }
      this.runtime.paused && this.runtime.resume(), this.runtimeFrame = this.runtime.tick(A), !this.destroyed && this.phaseState === "running" && (this.present(!1, t), A - this.lastSnapshotTime >= 50 && (this.lastSnapshotTime = A, this.emit())), this.requestNextFrame();
    });
    this.flightProfile = A.config.flight, this.scene = A.scene, this.onSnapshot = A.onSnapshot, this.minimumClearanceM = A.config.terrain.minimumClearanceM, this.maximumAglM = A.config.terrain.maximumAglM, this.recoverSpeedMps = A.scene.startState.speed, this.vehicle = aA(A.scene.startState), this.safeVehicle = aA(this.vehicle), this.cameraModeState = A.config.camera.mode, this.bankedViewportState = A.config.camera.bankedViewport, this.powerModeState = A.config.powerMode, this.fovDegrees = A.config.camera.fovDeg, oe(this.cameraModeState), re(this.powerModeState), this.initialInputSettings = {
      sensitivity: A.config.controls.sensitivity,
      invertPitch: A.config.controls.invertPitch,
      keyboardEnabled: A.config.controls.keyboard,
      gamepadEnabled: A.config.controls.gamepad
    }, this.runtime = new Ut(
      mA(this.vehicle),
      () => {
        const P = this.requireInput();
        return this.simulateStep(
          this.debugControl ?? P.sample(h.fixedStepSeconds)
        ), mA(this.vehicle);
      },
      {
        fixedStepSeconds: h.fixedStepSeconds,
        maxCatchUpSteps: h.maxCatchUpSteps
      }
    ), this.runtimeFrame = this.runtime.pause();
  }
  /** Installs input and presents the initial state without starting the simulation loop. */
  initialize() {
    if (this.assertAlive(), this.initialized) return;
    if (this.input)
      throw new Error("Plane navigation session initialization is already in progress.");
    const A = new Ht({
      target: this.scene.sceneElement,
      settings: this.initialInputSettings,
      onPauseRequested: () => this.togglePause(),
      onRecoverRequested: () => this.recover(),
      onPowerModeStepRequested: (P) => {
        this.setPowerMode(st(this.powerModeState, P));
      }
    });
    this.input = A;
    try {
      this.scene.setViewMode(this.cameraModeState, !0), this.assertAlive(), this.applyPowerModeToInput(A, this.powerModeState), this.present(!0, h.fixedStepSeconds), this.assertAlive(), this.initialized = !0;
    } catch (P) {
      throw this.input === A && (this.input = null), A.destroy(), P;
    }
  }
  /** Current lifecycle phase. */
  get phase() {
    return this.phaseState;
  }
  /** Current chase or cockpit camera mode. */
  get cameraMode() {
    return this.cameraModeState;
  }
  /** Current slow, normal, or turbo power mode. */
  get powerMode() {
    return this.powerModeState;
  }
  /** Resets to the hosted start state and begins fixed-step simulation. */
  start(A = {}) {
    const P = this.requireInitializedInput();
    this.vehicle = aA(this.scene.startState), this.safeVehicle = aA(this.vehicle), this.smoothedPitchInput = 0, P.clear(), this.applyPowerModeToInput(P, this.powerModeState), this.phaseState = "running", A.focusScene && this.scene.sceneElement.focus(), this.runtimeFrame = this.runtime.reset(
      mA(this.vehicle),
      !1
    ), this.present(!0, h.fixedStepSeconds), this.emit(), this.startFrameLoop();
  }
  /** Pauses simulation while retaining the session and input listeners. */
  pause() {
    this.phaseState !== "running" || this.destroyed || (this.phaseState = "paused", this.runtimeFrame = this.runtime.pause(), this.emit());
  }
  /** Resumes from the current state with a fresh timing baseline. */
  resume(A = {}) {
    this.phaseState !== "paused" || this.destroyed || (this.phaseState = "running", A.focusScene && this.scene.sceneElement.focus(), this.runtimeFrame = this.runtime.resume(), this.emit(), this.startFrameLoop());
  }
  /** Returns to the last safe state (or start state) and presents it immediately. */
  recover() {
    this.requireInitializedInput().clearControlPatch(["respawn"]), this.recoverVehicle(), this.runtimeFrame = this.runtime.reset(
      mA(this.vehicle),
      this.phaseState !== "running"
    ), this.present(!0, h.fixedStepSeconds), this.emit();
  }
  /** Changes chase/cockpit mode; `instant` skips the visual transition. */
  setCameraMode(A, P = !1) {
    oe(A);
    const t = this.requireInitializedInput();
    this.cameraModeState === A && !P || (this.applyLiveState({
      inputSettings: t.settings,
      fovDegrees: this.fovDegrees,
      cameraMode: A,
      bankedViewport: this.bankedViewportState,
      powerMode: this.powerModeState
    }, { instantCamera: P }), this.emit());
  }
  /** Replaces the power-mode control patch while preserving unrelated host patches. */
  setPowerMode(A) {
    re(A);
    const P = this.requireInitializedInput();
    this.powerModeState !== A && (this.applyLiveState({
      inputSettings: P.settings,
      fovDegrees: this.fovDegrees,
      cameraMode: this.cameraModeState,
      bankedViewport: this.bankedViewportState,
      powerMode: A
    }), this.emit());
  }
  /** Toggles between turbo and normal power; returns whether turbo is now selected. */
  toggleTurbo() {
    const A = this.powerModeState !== "turbo";
    return this.setPowerMode(A ? "turbo" : "normal"), A;
  }
  /**
   * Applies controls, FOV, view mode, viewport banking, and power changes to a live session.
   *
   * Camera-facing changes are attempted before input or stored state changes.
   * If scene presentation fails, the previous camera settings are restored and
   * the original error is rethrown. Asset/profile changes use `setAircraft()`.
   */
  applyLiveConfig(A, P = {}) {
    oe(A.camera.mode), re(A.powerMode);
    const t = this.requireInitializedInput();
    this.applyLiveState({
      inputSettings: {
        ...t.settings,
        sensitivity: A.controls.sensitivity,
        invertPitch: A.controls.invertPitch,
        keyboardEnabled: A.controls.keyboard,
        gamepadEnabled: A.controls.gamepad
      },
      fovDegrees: A.camera.fovDeg,
      cameraMode: A.camera.mode,
      bankedViewport: A.camera.bankedViewport,
      powerMode: A.powerMode
    }, P);
  }
  /**
   * Replaces the aircraft graphics and selected flight profile in the current scene.
   * A model change resets physics and power to the new profile's cruise state;
   * a mesh-only change keeps the current vehicle motion. Older async requests
   * cannot overwrite a newer aircraft selection.
   * @returns `true` when the new aircraft was applied; `false` when the scene
   *          declined the change, the session ended, or a newer request won.
   */
  async setAircraft(A) {
    var i, r, a;
    if (this.destroyed) return !1;
    const P = ++this.aircraftRequest, t = ((i = this.flightProfile) == null ? void 0 : i.model) !== ((r = A.flight) == null ? void 0 : r.model);
    if (!await this.scene.setAircraft(A.assets, A.flight) || this.destroyed || P !== this.aircraftRequest) return !1;
    if (this.flightProfile = A.flight, this.minimumClearanceM = A.terrain.minimumClearanceM, this.maximumAglM = A.terrain.maximumAglM, t) {
      this.recoverSpeedMps = ((a = A.flight) == null ? void 0 : a.tuning.cruiseSpeed) ?? h.cruiseSpeed, this.vehicle = _t(this.vehicle, A), this.safeVehicle = aA(this.vehicle), this.smoothedPitchInput = 0;
      const o = this.input;
      o == null || o.clear(), o && this.applyPowerModeToInput(o, "normal"), this.powerModeState = "normal", this.runtimeFrame = this.runtime.reset(
        mA(this.vehicle),
        this.phaseState !== "running"
      );
    }
    return this.present(t, h.fixedStepSeconds), this.emit(), !0;
  }
  /** Merges caller-supplied control values over sampled keyboard/gamepad input. */
  setControlPatch(A) {
    this.requireInitializedInput().setControlPatch(A);
  }
  /** Supplies normalized bank/pitch stick axes independently of other input sources. */
  setTouchStick(A, P) {
    this.requireInitializedInput().setTouchStick(A, P);
  }
  /** Clears all caller overrides, or only the listed fields. */
  clearControlPatch(A) {
    const P = this.requireInitializedInput();
    P.clearControlPatch(A), this.applyPowerModeToInput(P, this.powerModeState);
  }
  /** Returns a defensive snapshot of the current simulation and camera state. */
  snapshot() {
    var s;
    const A = Yt(
      this.vehicle,
      this.runtimeFrame.renderPose
    ), P = this.scene.elevationAtWorld(A.position), t = this.scene.debugSnapshot();
    return {
      phase: this.phaseState,
      vehicle: aA(this.vehicle),
      renderVehicle: A,
      altitudeMslM: A.position.z,
      aglM: P === null ? null : A.position.z - P,
      cameraMode: this.cameraModeState,
      powerMode: this.powerModeState,
      turboActive: this.vehicle.launchBoost > 1.5,
      braking: this.vehicle.throttle < 0.35,
      simulationStep: this.runtime.simulationStep,
      presentedTick: t.lastPresentationTick,
      gamepad: ((s = this.input) == null ? void 0 : s.gamepadStatus) ?? Zt,
      camera: t.cameraFrame
    };
  }
  /** Returns hosted-scene diagnostics plus session phase and simulation step. */
  debugSnapshot() {
    return {
      ...this.scene.debugSnapshot(),
      sessionPhase: this.phaseState,
      simulationStep: this.runtime.simulationStep
    };
  }
  /**
   * Advances a requested number of fixed physics steps for diagnostics and parity checks.
   * The supplied control patch is used only during this call, even if stepping
   * fails; the resulting state is presented once and returned as a snapshot.
   */
  debugAdvanceFixedSteps(A, P = {}) {
    this.requireInitializedInput(), this.phaseState = "running", this.debugControl = { ...Kt, ...P };
    try {
      this.runtime.paused && this.runtime.resume(), this.runtimeFrame = this.runtime.advanceFixedSteps(A);
    } finally {
      this.debugControl = null;
    }
    return this.present(!1, Math.max(
      h.fixedStepSeconds,
      A * h.fixedStepSeconds
    )), this.emit(), this.snapshot();
  }
  /** Stops timing/input work and releases hosted-scene resources. Safe to call repeatedly. */
  destroy(A = {}) {
    if (this.destroyed) return;
    this.destroyed = !0, this.initialized = !1, this.phaseState = "stopped", this.stopFrameLoop();
    const P = this.input;
    this.input = null, P == null || P.destroy(), this.scene.destroy(A);
  }
  assertAlive() {
    if (this.destroyed) throw new Error("Plane navigation session is stopped.");
  }
  requireInput() {
    const A = this.input;
    if (!A) throw new Error("Plane navigation session is not initialized.");
    return A;
  }
  requireInitializedInput() {
    if (this.assertAlive(), !this.initialized)
      throw new Error("Plane navigation session is not initialized.");
    return this.requireInput();
  }
  togglePause() {
    this.phaseState === "running" ? this.pause() : this.phaseState === "paused" && this.resume({ focusScene: !0 });
  }
  applyPowerModeToInput(A, P) {
    const t = tt(P);
    A.clearControlPatch(["brake", "turboBoost"]), t.brake > 0 && A.setControlPatch({ brake: t.brake }), t.turboBoost && A.setControlPatch({ turboBoost: !0 });
  }
  /** Commits a live configuration only after the corresponding scene updates succeed. */
  applyLiveState(A, P = {}) {
    const t = this.requireInitializedInput(), s = {
      inputSettings: { ...t.settings },
      fovDegrees: this.fovDegrees,
      cameraMode: this.cameraModeState,
      bankedViewport: this.bankedViewportState,
      powerMode: this.powerModeState
    }, i = s.cameraMode !== A.cameraMode || P.instantCamera === !0, r = s.bankedViewport !== A.bankedViewport, o = (i || r || s.fovDegrees !== A.fovDegrees) && this.phaseState !== "running", n = s.powerMode !== A.powerMode;
    let D = !1;
    try {
      i && this.scene.setViewMode(A.cameraMode, P.instantCamera === !0), r && this.scene.setBankedViewport(A.bankedViewport), this.assertAlive(), o && (D = !0, this.present(
        !0,
        h.fixedStepSeconds,
        A.fovDegrees
      ), this.assertAlive());
    } catch (g) {
      const u = [];
      if (i && !this.destroyed)
        try {
          this.scene.setViewMode(s.cameraMode, !0);
        } catch (l) {
          u.push(l);
        }
      if (r && !this.destroyed)
        try {
          this.scene.setBankedViewport(s.bankedViewport);
        } catch (l) {
          u.push(l);
        }
      if (D && !this.destroyed)
        try {
          this.present(
            !0,
            h.fixedStepSeconds,
            s.fovDegrees
          );
        } catch (l) {
          u.push(l);
        }
      throw u.length > 0 && console.warn("Plane navigation live configuration rollback was incomplete.", {
        cause: g,
        rollbackErrors: u
      }), g;
    }
    t.updateSettings(A.inputSettings), n && this.applyPowerModeToInput(t, A.powerMode), this.fovDegrees = A.fovDegrees, this.cameraModeState = A.cameraMode, this.bankedViewportState = A.bankedViewport, this.powerModeState = A.powerMode;
  }
  recoverVehicle() {
    this.vehicle = {
      ...nt(
        { ...this.safeVehicle.position }
      ),
      speed: this.recoverSpeedMps
    }, this.smoothedPitchInput = 0;
  }
  /** Dispatches one fixed input frame to the active flight model and enforces terrain clearance. */
  simulateStep(A) {
    var i, r;
    if (this.phaseState !== "running") return;
    if (A.respawn) {
      this.recoverVehicle();
      return;
    }
    const P = aA(this.vehicle);
    this.smoothedPitchInput = ((i = this.flightProfile) == null ? void 0 : i.model) === "space-jet" || ((r = this.flightProfile) == null ? void 0 : r.model) === "paraglider" ? A.pitch : this.flightProfile ? JP(this.smoothedPitchInput, A.pitch, h.fixedStepSeconds, this.flightProfile.tuning.pitchInputResponse) : rt(
      this.smoothedPitchInput,
      A.pitch,
      h.fixedStepSeconds
    );
    let t = this.flightProfile ? Tt(
      this.flightProfile,
      P,
      { ...A, pitch: this.smoothedPitchInput },
      h.fixedStepSeconds
    ) : wt(
      P,
      { ...A, pitch: this.smoothedPitchInput },
      h.fixedStepSeconds
    );
    const s = this.scene.elevationAtWorld(t.position);
    s !== null && t.position.z - s > this.maximumAglM && (t = {
      ...t,
      position: { ...t.position, z: s + this.maximumAglM }
    }), s !== null && t.position.z - s < this.minimumClearanceM ? t = at(
      t,
      s,
      this.minimumClearanceM
    ) : s !== null && t.position.z - s > 30 && (this.safeVehicle = aA(t)), this.vehicle = t;
  }
  present(A, P, t = this.fovDegrees) {
    this.scene.present(
      Ot(this.runtimeFrame.renderPose, this.vehicle),
      t,
      P,
      this.runtime.simulationStep,
      A
    );
  }
  emit() {
    var A;
    (A = this.onSnapshot) == null || A.call(this, this.snapshot());
  }
  startFrameLoop() {
    this.destroyed || this.phaseState !== "running" || (this.lastFrameTime = performance.now(), this.lastFramePacingTime = this.lastFrameTime, this.framePacing.clear(), this.requestNextFrame());
  }
  requestNextFrame() {
    this.destroyed || this.phaseState !== "running" && this.phaseState !== "paused" || this.animationFrame !== 0 || (this.animationFrame = requestAnimationFrame(this.onFrame));
  }
  stopFrameLoop() {
    this.animationFrame !== 0 && (cancelAnimationFrame(this.animationFrame), this.animationFrame = 0);
  }
}
function As(e, A, P) {
  const t = e.style.touchAction;
  e.style.touchAction = "none";
  let s = null;
  const i = /* @__PURE__ */ new Set();
  let r = 0, a = 0;
  const o = () => {
    const c = s;
    s = null, A.release(), c !== null && e.hasPointerCapture(c) && e.releasePointerCapture(c);
  }, n = (c) => {
    c.preventDefault(), c.stopPropagation();
  }, D = (c) => {
    var j;
    for (const p of c.composedPath()) {
      if (p === e) break;
      if (p instanceof Element && ((j = p.localName) != null && j.startsWith("calcite-") || p.matches(
        "button, a, input, select, textarea, [contenteditable], [role='button'], [role='radio'], [role='checkbox'], [role='switch'], [role='slider'], [role='combobox'], [role='tab'], [role='toolbar'], [role='menu'], [role='dialog'], [data-flight-stick], arcgis-plane-navigation"
      ))) return;
    }
    if (c.pointerType === "touch" && (i.add(c.pointerId), n(c), i.size > 1)) {
      o();
      return;
    }
    !P() || s !== null || !["mouse", "touch"].includes(c.pointerType) || c.button !== 0 || c.altKey || c.ctrlKey || c.metaKey || c.shiftKey || (s = c.pointerId, r = c.clientX, a = c.clientY, A.begin(), e.setPointerCapture(s), e.focus({ preventScroll: !0 }), c.preventDefault());
  }, g = (c) => {
    if (c.pointerType === "touch" && i.has(c.pointerId) && n(c), c.pointerId === s) {
      if (!P() || c.pointerType !== "touch" && !(c.buttons & 1)) {
        o();
        return;
      }
      A.move(c.clientX - r, c.clientY - a), r = c.clientX, a = c.clientY, c.preventDefault();
    }
  }, u = (c) => {
    i.delete(c.pointerId), c.pointerId === s && o();
  }, l = (c) => {
    c.pointerId === s && o();
  }, C = () => {
    i.clear(), o();
  }, d = () => {
    document.hidden && C();
  }, M = () => {
    C(), A.reset();
  };
  return e.addEventListener("pointerdown", D, { capture: !0 }), e.addEventListener("pointermove", g, { capture: !0 }), e.addEventListener("lostpointercapture", l), window.addEventListener("pointerup", u, { capture: !0 }), window.addEventListener("pointercancel", u, { capture: !0 }), window.addEventListener("blur", C), document.addEventListener("visibilitychange", d), { reset: M, destroy() {
    M(), e.style.touchAction === "none" && (e.style.touchAction = t), e.removeEventListener("pointerdown", D, { capture: !0 }), e.removeEventListener("pointermove", g, { capture: !0 }), e.removeEventListener("lostpointercapture", l), window.removeEventListener("pointerup", u, { capture: !0 }), window.removeEventListener("pointercancel", u, { capture: !0 }), window.removeEventListener("blur", C), document.removeEventListener("visibilitychange", d);
  } };
}
const We = /* @__PURE__ */ new Set(["5.1.21", "5.1.24"]), we = 2048, Je = 64;
function jA(e) {
  return typeof e == "object" && e !== null ? e : null;
}
function es(e, A) {
  var o, n;
  const P = jA((o = jA(e)) == null ? void 0 : o.processor), t = jA((n = jA(P == null ? void 0 : P.graphicsCore)) == null ? void 0 : n.symbolCreationContext), s = jA(t == null ? void 0 : t.localOriginFactory);
  let i = We.has(A) ? "unsupported-api" : "unsupported-version", r = null, a = () => {
  };
  if (We.has(A) && s && s._gridSize === 5e5 && typeof s._rootOriginId == "string" && s._origins instanceof Map && typeof s.getOrigin == "function" && typeof s.needsOriginUpdate == "function") {
    r = s;
    const D = r, g = D._gridSize, u = D.getOrigin, l = D.needsOriginUpdate;
    D._gridSize = we;
    const C = (M) => {
      const c = u.call(D, M);
      for (const j of D._origins.keys()) {
        if (D._origins.size <= Je) break;
        j !== D._rootOriginId && D._origins.delete(j);
      }
      return c;
    }, d = (M, c) => Math.hypot(c[0] - M.vec3[0], c[1] - M.vec3[1], c[2] - M.vec3[2]) > we;
    D.getOrigin = C, D.needsOriginUpdate = d, i = "active", a = () => {
      D.getOrigin === C && (D.getOrigin = u), D.needsOriginUpdate === d && (D.needsOriginUpdate = l), D._gridSize === we && (D._gridSize = g);
    };
  }
  return {
    diagnostics: () => ({
      status: i,
      sdkVersion: A,
      scope: "player-aircraft-layer",
      gridSizeM: (r == null ? void 0 : r._gridSize) ?? null,
      cachedOrigins: (r == null ? void 0 : r._origins.size) ?? 0,
      maximumCachedOrigins: Je
    }),
    destroy() {
      a(), i = "destroyed";
    }
  };
}
class Ps {
  constructor() {
    /** Smoothed turbo amount, ranging from 0 (off) to 1 (full effect). */
    w(this, "intensity", 0);
    /** Current local-Y plume scale; values approach zero when the effect is extinguished. */
    w(this, "lengthScale", 0.12);
    /** Current plume alpha sent to the renderer. */
    w(this, "opacity", 0);
    /** Whether the renderer should show the plume graphic for this frame. */
    w(this, "visible", !1);
    w(this, "phase", 0);
    w(this, "surge", 0);
  }
  /** Advance plume intensity and shape from boost/acceleration, respecting reduced-motion preferences. */
  update(A, P, t, s) {
    const i = Number.isFinite(t) ? v(t, 0, 0.1) : 0;
    if (i === 0) return;
    const r = Number.isFinite(A) && A > 1.5 ? v(A - 1, 0, 1) : 0, a = r > this.intensity ? 8 : 34;
    if (this.intensity = r + (this.intensity - r) * Math.exp(-a * i), this.visible = this.intensity >= 0.015, !this.visible && r === 0) {
      this.reset();
      return;
    }
    const o = !s && r > 0 && Number.isFinite(P) ? v(P, 0, 1) : 0;
    this.surge = o + (this.surge - o) * Math.exp(-7 * i), this.phase = (this.phase + i * Math.PI * 2) % (Math.PI * 2);
    const n = s ? 0 : Math.sin(this.phase * 2) * 0.045 + Math.sin(this.phase * 5) * 0.015;
    this.lengthScale = 0.12 + this.intensity * (0.92 + this.surge * 0.2 + n), this.opacity = v(this.intensity * (0.91 + this.surge * 0.07), 0, 1);
  }
  /** Clear all accumulated pulse and thrust state, such as when switching aircraft. */
  reset() {
    this.intensity = this.opacity = this.phase = this.surge = 0, this.lengthScale = 0.12, this.visible = !1;
  }
  /** Copy the renderer-facing properties without exposing internal animation state. */
  frame() {
    return { lengthScale: this.lengthScale, opacity: this.opacity, visible: this.visible };
  }
}
function ts(e, A) {
  return e * (1 - A);
}
function ss(e, A) {
  const P = /^(\d+)\.(\d+)(?:\.|$)/.exec(e);
  if (!P) throw new Error(`Invalid ArcGIS SDK version: ${e}`);
  const t = Number(P[1]), s = Number(P[2]), i = (r, a) => t > r || t === r && s >= a;
  return {
    async createGltfMesh(r, a, o) {
      if (i(5, 1))
        return (await A.meshUtils()).createFromGLTF(r, a, o);
      const { default: n } = await A.mesh();
      return n.createFromGLTF(r, a, o);
    },
    async projectPoint(r, a) {
      if (i(4, 32)) {
        const n = await A.projectOperator();
        return n.isLoaded() || await n.load(), n.execute(r, a);
      }
      const o = await A.projection();
      return o.isLoaded() || await o.load(), o.project(r, a);
    }
  };
}
function Ke(e) {
  throw new Error(
    `ArcGIS ${wP} requires ${e}, which is outside this component's SDK 4.32 build.`
  );
}
const TP = ss(wP, {
  async mesh() {
    return import("@arcgis/core/geometry/Mesh.js");
  },
  async meshUtils() {
    return Ke("meshUtils.createFromGLTF");
  },
  async projection() {
    return Ke("projection");
  },
  async projectOperator() {
    {
      const e = await import("@arcgis/core/geometry/operators/projectOperator.js");
      return {
        isLoaded: e.isLoaded,
        load: e.load,
        execute: (A, P) => e.execute(A, P)
      };
    }
  }
}), Ze = TP.createGltfMesh, is = TP.projectPoint;
function os(e) {
  return typeof e == "object" && e !== null && "metallic" in e && typeof e.metallic == "number" && "roughness" in e && typeof e.roughness == "number";
}
function rs(e) {
  return e ? (e.r * 0.2126 + e.g * 0.7152 + e.b * 0.0722) / 255 : 1;
}
function ws(e) {
  return e.metallic >= 0.2 ? Math.min(e.roughness, 0.34) : e.roughness > 0.5 ? Math.max(0.36, e.roughness * 0.58) : e.roughness;
}
function as(e) {
  var P;
  const A = /* @__PURE__ */ new Set();
  for (const t of e)
    t.shading = "source", t.trustSourceNormals = !0, os(t.material) && A.add(t.material);
  for (const t of A)
    typeof ((P = t.color) == null ? void 0 : P.a) == "number" && t.color.a < 1 || rs(t.color) < 0.15 || (t.roughness = ws(t));
}
const ns = 6378137, Ds = 1.05, gs = 10, vs = 0.82, cs = 0.72;
class ls {
  constructor() {
    w(this, "progress", 0);
    w(this, "targetMode", "chase");
  }
  /** Destination mode, which may differ from the current blended view mid-transition. */
  get mode() {
    return this.targetMode;
  }
  /** Eased blend from chase (`0`) to cockpit (`1`). */
  get blend() {
    return this.progress ** 3 * (this.progress * (this.progress * 6 - 15) + 10);
  }
  /** Whether the camera is between its settled endpoint modes. */
  get active() {
    return this.progress > 0 && this.progress < 1;
  }
  /** Temporary FOV pulse applied around the midpoint of a mode transition. */
  get zoomOffsetDegrees() {
    const A = Math.sin(Math.PI * this.blend);
    return this.targetMode === "cockpit" ? -13 * A : gs * A;
  }
  /** Selects a destination mode; a non-instant change continues from current progress. */
  setMode(A, P = !1) {
    this.targetMode = A, P && (this.progress = A === "cockpit" ? 1 : 0);
  }
  /** Advances the transition and returns its eased blend from chase (0) to cockpit (1). */
  update(A) {
    const P = this.targetMode === "cockpit" ? 1 : 0, t = v(A, 0, 0.1) / Ds;
    return this.progress = P > this.progress ? Math.min(P, this.progress + t) : Math.max(P, this.progress - t), this.blend;
  }
}
function Bs(e, A, P) {
  const t = v(P, 0, 1);
  return {
    x: N(e.x, A.x, t),
    y: N(e.y, A.y, t),
    z: N(e.z, A.z, t),
    heading: vP(e.heading, A.heading, t),
    tilt: N(e.tilt, A.tilt, t),
    roll: N(e.roll, A.roll, t),
    fovDegrees: N(e.fovDegrees, A.fovDegrees, t)
  };
}
function us(e) {
  return v(-e, -55, 55);
}
function Cs(e, A, P) {
  const t = Math.max(1, Math.abs(A)), s = Math.max(1, Math.abs(P)), i = Math.abs(e) * Math.PI / 180, r = Math.abs(Math.cos(i)), a = Math.abs(Math.sin(i));
  return Math.max(
    r + s / t * a,
    r + t / s * a
  );
}
function ds(e, A) {
  const P = v(e, 1, 169) * Math.PI / 180, t = Math.max(1, Math.abs(A));
  return v(
    2 * Math.atan(Math.tan(P / 2) * t) * 180 / Math.PI,
    1,
    169
  );
}
function Ms(e, A, P = 1) {
  const t = cP(e.bodyHeading, e.pitch), s = 0.4;
  return {
    x: e.position.x + t.x * s * P,
    y: e.position.y + t.y * s * P,
    z: e.position.z + 0.58 + t.z * s,
    heading: AA(e.bodyHeading),
    tilt: v(90 + e.pitch, 5, 175),
    roll: us(e.roll),
    fovDegrees: v(A + 8 + v((e.boost ?? 0) - 1, 0, 1) * 4, 58, 90)
  };
}
function hs(e, A) {
  return e === "cockpit" ? A < vs : A < cs;
}
function ms(e, A) {
  const P = Math.max(1, Math.min(170, e)) * Math.PI / 180, t = Math.max(0.01, Math.abs(A)), s = 2 * Math.atan(
    Math.tan(P / 2) * Math.sqrt(1 + t * t)
  );
  return Math.min(170, s * 180 / Math.PI);
}
function ue(e) {
  const A = Math.max(-Math.PI, Math.min(Math.PI, e / ns));
  return Math.cosh(A);
}
class zs {
  constructor(A = 0) {
    w(this, "pitchDegrees");
    this.pitchDegrees = A;
  }
  /** Returns the smoothed pitch, or the target immediately when `snap` is true. */
  update(A, P, t = !1) {
    if (t)
      return this.pitchDegrees = A, this.pitchDegrees;
    const s = Math.min(0.1, Math.max(0, P));
    return this.pitchDegrees = N(
      this.pitchDegrees,
      A,
      1 - Math.exp(-8 * s)
    ), this.pitchDegrees;
  }
}
function Es(e, A) {
  const P = Math.max(0, Math.min(1, e)), t = Math.max(0, Math.min(1, A));
  return {
    distanceM: N(17.5, 20.5, P) + t * 2,
    heightM: N(6.8, 8.2, P) + t * 0.2
  };
}
function ae(e, A, P, t, s) {
  const r = 2 / Math.max(1e-4, t), a = r * Math.max(0, s), o = 1 / (1 + a + 0.48 * a * a + 0.235 * a * a * a), n = e - A, D = (P + r * n) * s;
  return {
    value: A + (n + D) * o,
    velocity: (P - r * D) * o
  };
}
class js {
  constructor(A) {
    w(this, "pose");
    this.pose = {
      ...A,
      distanceVelocity: 0,
      heightVelocity: 0,
      fovVelocity: 0
    };
  }
  /** Advances the camera toward `target`; `snap` clears smoothing velocity immediately. */
  update(A, P, t = !1) {
    if (t)
      return this.pose = {
        ...A,
        distanceVelocity: 0,
        heightVelocity: 0,
        fovVelocity: 0
      }, { ...this.pose };
    const s = Math.min(0.1, Math.max(0, P)), i = ae(
      this.pose.distanceM,
      A.distanceM,
      this.pose.distanceVelocity,
      0.32,
      s
    ), r = ae(
      this.pose.heightM,
      A.heightM,
      this.pose.heightVelocity,
      0.32,
      s
    ), a = ae(
      this.pose.fovDegrees,
      A.fovDegrees,
      this.pose.fovVelocity,
      0.38,
      s
    );
    return this.pose = {
      distanceM: i.value,
      heightM: r.value,
      fovDegrees: a.value,
      headingDegrees: vP(
        this.pose.headingDegrees,
        A.headingDegrees,
        1 - Math.exp(-11 * s)
      ),
      distanceVelocity: i.velocity,
      heightVelocity: r.velocity,
      fovVelocity: a.velocity
    }, { ...this.pose };
  }
  /** Chooses baseline distance, height, and FOV for the current aircraft speed. */
  targetForSpeed(A, P, t, s) {
    const i = Math.min(1, Math.abs(P) / t);
    return {
      distanceM: N(7.7, 11.2, i),
      heightM: N(3.2, 4.3, i),
      fovDegrees: Math.min(80, N(s, s + 12, i)),
      headingDegrees: A
    };
  }
}
const SA = Math.PI / 180, Is = 180 / Math.PI;
function BA(e, A) {
  const [P, t, s, i] = e, [r, a, o, n] = A;
  return [
    i * r + P * n + t * o - s * a,
    i * a - P * o + t * n + s * r,
    i * o + P * a - t * r + s * n,
    i * n - P * r - t * a - s * o
  ];
}
function ps(e, A) {
  const P = Math.hypot(e[0] ?? 0, e[1] ?? 0, e[2] ?? 0);
  if (P < 1e-8 || Math.abs(A) < 1e-8) return [0, 0, 0, 1];
  const t = A * SA / 2, s = Math.sin(t) / P;
  return [
    (e[0] ?? 0) * s,
    (e[1] ?? 0) * s,
    (e[2] ?? 0) * s,
    Math.cos(t)
  ];
}
function Ce(e, A, P, t = "xyz") {
  const s = e * SA / 2, i = A * SA / 2, r = P * SA / 2, a = [Math.sin(s), 0, 0, Math.cos(s)], o = [0, Math.sin(i), 0, Math.cos(i)], n = [0, 0, Math.sin(r), Math.cos(r)];
  return t === "yxz" ? BA(n, BA(a, o)) : BA(n, BA(o, a));
}
function Qs(e, A) {
  const [P, t, s, i] = e, [r, a, o] = A, n = [
    t * o - s * a,
    s * r - P * o,
    P * a - t * r
  ], D = [
    t * n[2] - s * n[1],
    s * n[0] - P * n[2],
    P * n[1] - t * n[0]
  ];
  return [
    r + 2 * (i * n[0] + D[0]),
    a + 2 * (i * n[1] + D[1]),
    o + 2 * (i * n[2] + D[2])
  ];
}
function _e(e, A, P, t = "xyz") {
  const s = Ce(A.x, A.y, A.z, t);
  return Qs(
    BA(s, e),
    [P.x, P.y, P.z]
  );
}
function Ts(e) {
  const A = Math.hypot(...e);
  let [P, t, s, i] = A > 1e-8 ? e.map((n) => n / A) : [0, 0, 0, 1];
  i < 0 && (P = -P, t = -t, s = -s, i = -i);
  const r = Math.max(-1, Math.min(1, i)), a = 2 * Math.acos(r), o = Math.sqrt(Math.max(0, 1 - r * r));
  return o < 1e-6 ? { axis: [0, 0, 1], angle: 0 } : {
    axis: [P / o, t / o, s / o],
    angle: a * Is
  };
}
function Ls(e) {
  var t;
  const A = ((t = e.transform) == null ? void 0 : t.clone()) ?? new xP(), P = {
    transform: A,
    baseTranslation: [...A.translation],
    baseRotation: ps(A.rotationAxis, A.rotationAngle)
  };
  return e.transform = A, P;
}
function bs(e, A) {
  const P = Ce(
    A.rotation.x,
    A.rotation.y,
    A.rotation.z,
    A.rotationOrder
  ), t = A.localRotation ? Ce(A.localRotation.x, A.localRotation.y, A.localRotation.z) : [0, 0, 0, 1];
  return Ts(
    BA(P, BA(e.baseRotation, t))
  );
}
function ne(e, A, P, t) {
  const s = bs(A, P);
  e.centerAt(t);
  const i = A.transform.clone();
  i.set({
    translation: A.baseTranslation,
    rotationAxis: s.axis,
    rotationAngle: s.angle
  }), e.transform = i;
}
function Vs(e, A) {
  if (A.isWebMercator && (e === "global" || e === "local"))
    return "web-mercator";
  if (e === "local" && !A.isGeographic && !A.isWebMercator && Number.isFinite(A.metersPerUnit) && A.metersPerUnit > 0)
    return "local-projected";
  throw new Error(
    "Plane navigation requires Web Mercator or a local scene with projected linear coordinates."
  );
}
function qs(e, A) {
  return e === "web-mercator" ? 1 : A.metersPerUnit;
}
function Os(e, A) {
  return { x: e.x * A, y: e.y * A, z: e.z * A };
}
function xA(e, A) {
  return { x: e.x / A, y: e.y / A, z: e.z / A };
}
const Ys = 2.68, IA = "yxz";
function ys(e) {
  const { webMercator: A } = e;
  let { vehicle: P, propeller: t, boost: s } = e;
  const i = e.metersPerUnit ?? 1, r = e.point.spatialReference;
  let a = e.propellerAnchorM, o = e.visualPitchDeg;
  const n = e.point.clone(), D = e.point.clone(), g = e.point.clone();
  let u = !0, l = !1;
  const C = (m) => {
    const I = m ? [...m.motion.transform.scale] : [1, 1, 1];
    let q = 0;
    if (m) {
      const O = m.mesh.vertexAttributes.position;
      let T = -1 / 0;
      for (let Q = 1; Q < O.length; Q += 3) T = Math.max(T, O[Q] * I[1]);
      Number.isFinite(T) && (q = T * i);
    }
    return { scale: I, outletForwardM: q };
  };
  let { scale: d, outletForwardM: M } = C(s);
  const c = 16, j = (m) => m ? Array.from({ length: c }, (I, q) => new gP({
    symbolLayers: [new DP({
      castShadows: !1,
      material: { color: [255, 255, 255, (q + 1) / c], colorMixMode: "multiply" }
    })]
  })) : [];
  let p = j(s), z = 0;
  return {
    /**
     * Position and orient loaded graphics for the current frame.
     *
     * Vehicle visibility follows the camera transition; propeller spin is a
     * local-axis rotation. The plume is scaled and offset so its nozzle remains
     * attached to the aircraft while the effect grows.
     */
    update(m, I, q, O) {
      const T = {
        x: m.pitch + (o ?? 0),
        y: m.roll,
        z: -m.bodyHeading
      };
      if (u = I, l = I && s !== null && O.visible, P.graphic.visible = I, t && (t.graphic.visible = I), s && (s.graphic.visible = l), !!I) {
        if (n.set({ ...xA(m.position, i), spatialReference: r }), ne(P.mesh, P.motion, {
          rotation: T,
          rotationOrder: IA
        }, n), t) {
          const Q = _e(
            P.motion.baseRotation,
            T,
            a ?? { x: 0, y: Ys, z: 0 },
            IA
          ), b = A ? ue(m.position.y) : 1;
          D.set({
            ...xA({
              x: m.position.x + Q[0] * b,
              y: m.position.y + Q[1] * b,
              z: m.position.z + Q[2]
            }, i),
            spatialReference: r
          }), ne(t.mesh, t.motion, {
            rotation: T,
            rotationOrder: IA,
            localRotation: { x: 0, y: q, z: 0 }
          }, D);
        }
        if (s && l) {
          const Q = Math.max(1, Math.min(c, Math.round(O.opacity * c)));
          z !== Q && (s.graphic.symbol = p[Q - 1], z = Q), s.motion.transform.scale = [d[0], d[1] * O.lengthScale, d[2]];
          const b = _e(
            s.motion.baseRotation,
            T,
            { x: 0, y: ts(M, O.lengthScale), z: 0 },
            IA
          ), G = A ? ue(m.position.y) : 1;
          g.set({
            ...xA({
              x: m.position.x + b[0] * G,
              y: m.position.y + b[1] * G,
              z: m.position.z + b[2]
            }, i),
            spatialReference: r
          }), ne(s.mesh, s.motion, {
            rotation: T,
            rotationOrder: IA
          }, g);
        }
      }
    },
    /** Replace mesh handles and attachment tuning while retaining allocated scene points. */
    setAircraft(m) {
      for (const I of p) I.destroyed || I.destroy();
      P = m.vehicle, t = m.propeller, s = m.boost, a = m.propellerAnchorM, o = m.visualPitchDeg, { scale: d, outletForwardM: M } = C(s), p = j(s), z = 0, l = !1;
    },
    /** Destroy presenter-owned SDK objects and cached symbols. */
    destroy() {
      n.destroy(), D.destroy(), g.destroy();
      for (const m of p) m.destroyed || m.destroy();
    },
    /** Return the last visibility values applied by `update`. */
    diagnostics: () => ({ aircraftVisible: u, boostVisible: l })
  };
}
function $e(e) {
  if (!Number.isFinite(e) || e < 0)
    throw new RangeError(
      `Camera submission interval must be a finite non-negative number, received ${e}.`
    );
  return e;
}
class Gs {
  /** Capture scheduling dependencies and validate the initial write interval. */
  constructor(A) {
    w(this, "intervalMs");
    w(this, "toleranceMs");
    w(this, "now");
    w(this, "schedule");
    w(this, "cancel");
    w(this, "submitFrame");
    w(this, "onError");
    w(this, "frame", null);
    w(this, "pending", !1);
    w(this, "lastSubmitMs", Number.NEGATIVE_INFINITY);
    w(this, "timer", 0);
    w(this, "destroyed", !1);
    w(this, "submissionCount", 0);
    w(this, "errorCount", 0);
    w(this, "firstSubmitMs", null);
    w(this, "coalescedCount", 0);
    this.intervalMs = $e(A.intervalMs ?? 1e3 / 30), this.toleranceMs = Math.max(0, A.toleranceMs ?? 0.25), this.now = A.now ?? (() => performance.now()), this.schedule = A.schedule ?? ((P, t) => window.setTimeout(P, t)), this.cancel = A.cancel ?? ((P) => window.clearTimeout(P)), this.submitFrame = A.submit, this.onError = A.onError ?? (() => {
    });
  }
  /**
   * Offer a new camera pose; it is submitted now or replaces the pending pose.
   *
   * Set `snap` for transitions such as view-mode changes where the new camera
   * must not wait behind the normal cadence interval.
   *
   * @param frame Latest complete camera state.
   * @param snap Submit immediately by clearing the cadence wait.
   */
  update(A, P = !1) {
    this.destroyed || (this.pending && (this.coalescedCount += 1), this.frame ? Object.assign(this.frame, A) : this.frame = { ...A }, this.pending = !0, P && (this.clearTimer(), this.lastSubmitMs = Number.NEGATIVE_INFINITY), this.flush());
  }
  /** Report write-rate, coalescing, error and lifecycle counters. */
  diagnostics() {
    const A = this.firstSubmitMs === null ? 0 : this.now() - this.firstSubmitMs;
    return {
      intervalMs: this.intervalMs,
      toleranceMs: this.toleranceMs,
      maximumHz: this.intervalMs > 0 ? 1e3 / this.intervalMs : null,
      effectiveHz: A > 0 && this.submissionCount > 1 ? (this.submissionCount - 1) * 1e3 / A : null,
      submissionCount: this.submissionCount,
      errorCount: this.errorCount,
      coalescedCount: this.coalescedCount,
      pending: this.pending,
      timerScheduled: this.timer !== 0,
      destroyed: this.destroyed
    };
  }
  /** Stop pending work and discard the last pose; safe to call repeatedly. */
  destroy() {
    this.destroyed = !0, this.pending = !1, this.frame = null, this.clearTimer();
  }
  /** Submit the latest pose if the interval has elapsed, otherwise schedule one timer. */
  flush() {
    if (this.destroyed || !this.pending || !this.frame) return;
    const A = this.intervalMs - (this.now() - this.lastSubmitMs);
    if (A > this.toleranceMs) {
      this.timer || (this.timer = this.schedule(() => {
        this.timer = 0, this.flush();
      }, A));
      return;
    }
    this.clearTimer(), this.pending = !1, this.submissionCount += 1, this.lastSubmitMs = this.now(), this.firstSubmitMs ?? (this.firstSubmitMs = this.lastSubmitMs);
    try {
      this.submitFrame(this.frame);
    } catch (P) {
      this.errorCount += 1, this.onError(P);
    }
  }
  /** Change the throttle interval and reschedule pending work using the new rate. */
  setIntervalMs(A) {
    const P = $e(A);
    this.destroyed || P === this.intervalMs || (this.intervalMs = P, this.clearTimer(), this.flush());
  }
  /** Cancel the currently scheduled timer, if any. */
  clearTimer() {
    this.timer && (this.cancel(this.timer), this.timer = 0);
  }
}
const De = 60, ge = 30, fs = 5e3, Us = 4e3, ks = 50, Rs = 25, Fs = 55, Ss = 22, xs = 65;
function Ns(e) {
  return Number.isFinite(e.averageFps) && Number.isFinite(e.p95FrameMs) && e.averageFps !== null && e.p95FrameMs !== null && e.averageFps > 0 && e.p95FrameMs > 0;
}
class Hs {
  constructor() {
    w(this, "targetHz", De);
    w(this, "displaySynchronized", !1);
    w(this, "pressureSinceMs", null);
    w(this, "degradedAtMs", null);
    w(this, "recoverySinceMs", null);
    w(this, "recoveredAtMs", null);
    w(this, "lastSampleAtMs", null);
    w(this, "lastSampleValid", null);
    w(this, "invalidSampleCount", 0);
  }
  /**
   * Apply one performance sample and update transition timers.
   *
   * Invalid or time-reversed samples break a pending pressure/recovery window.
   *
   * @param sample Frame-rate and frame-duration measurements.
   * @param nowMs Monotonic timestamp in milliseconds for the sample.
   * @returns Current target rate, sync decision and transition diagnostics.
   */
  update(A, P) {
    if (!(Number.isFinite(P) && P >= 0 && (this.lastSampleAtMs === null || P >= this.lastSampleAtMs)) || !Ns(A))
      return this.invalidSampleCount += 1, this.lastSampleValid = !1, this.lastSampleAtMs = null, this.pressureSinceMs = null, this.recoverySinceMs = null, this.diagnostics();
    this.lastSampleValid = !0, this.lastSampleAtMs = P;
    const s = A.averageFps, i = A.p95FrameMs;
    return this.targetHz === ge ? (this.pressureSinceMs = null, s >= Fs && i <= Ss ? (this.recoverySinceMs ?? (this.recoverySinceMs = P), P - this.recoverySinceMs >= Us && (this.targetHz = De, this.degradedAtMs = null, this.recoveredAtMs = P, this.recoverySinceMs = null), this.updateDisplaySynchronization(s), this.diagnostics()) : (this.recoverySinceMs = null, this.diagnostics())) : (this.recoverySinceMs = null, s < ks && i > Rs ? (this.pressureSinceMs ?? (this.pressureSinceMs = P), P - this.pressureSinceMs >= fs && (this.targetHz = ge, this.degradedAtMs = P, this.recoveredAtMs = null, this.pressureSinceMs = null), this.updateDisplaySynchronization(s), this.diagnostics()) : (this.pressureSinceMs = null, this.updateDisplaySynchronization(s), this.diagnostics()));
  }
  /** Return the current rate decision and timing counters without mutating state. */
  diagnostics() {
    return {
      targetHz: this.targetHz,
      intervalMs: this.displaySynchronized ? 0 : 1e3 / this.targetHz,
      displaySynchronized: this.displaySynchronized,
      degraded: this.targetHz === ge,
      pressureSinceMs: this.pressureSinceMs,
      degradedAtMs: this.degradedAtMs,
      recoverySinceMs: this.recoverySinceMs,
      recoveredAtMs: this.recoveredAtMs,
      lastSampleValid: this.lastSampleValid,
      invalidSampleCount: this.invalidSampleCount
    };
  }
  /** Let the scheduler follow rendered frames on normal displays up to the 60 Hz cap. */
  updateDisplaySynchronization(A) {
    this.displaySynchronized = this.targetHz === De && A <= xs;
  }
}
const pA = 0.85;
class Xs {
  constructor() {
    w(this, "yaw", 0);
    w(this, "pitch", 0);
    w(this, "held", !1);
    w(this, "returnElapsed", pA);
    w(this, "releaseYaw", 0);
    w(this, "releasePitch", 0);
  }
  /** Whether a pointer currently owns the drag gesture. */
  get dragging() {
    return this.held;
  }
  /** Current look offset, returned as a copy. */
  get offset() {
    return { yawDegrees: this.yaw, pitchDegrees: this.pitch };
  }
  /** Begins a captured gesture; the offset is retained until release or reset. */
  begin() {
    this.held = !0;
  }
  /** Adds pointer deltas while a gesture is active. */
  move(A, P) {
    this.held && (this.yaw = v(this.yaw - A * 0.24, -170, 170), this.pitch = v(this.pitch + P * 0.2, -55, 65));
  }
  /** Starts easing the current look offset back to chase framing. */
  release() {
    this.held && (this.held = !1, this.releaseYaw = this.yaw, this.releasePitch = this.pitch, this.returnElapsed = 0);
  }
  /** Clears drag state immediately, for snaps, mode changes, and teardown. */
  reset() {
    this.held = !1, this.yaw = this.pitch = 0, this.returnElapsed = pA;
  }
  /** Advances the return animation; reduced-motion preference returns directly to neutral. */
  update(A, P = !1) {
    if (!this.held) {
      this.returnElapsed = P ? pA : Math.min(pA, this.returnElapsed + v(A, 0, 0.1));
      const t = this.returnElapsed / pA, s = 1 - t * t * t * (t * (t * 6 - 15) + 10);
      this.yaw = s === 0 ? 0 : this.releaseYaw * s, this.pitch = s === 0 ? 0 : this.releasePitch * s;
    }
    return this.offset;
  }
}
function Ws(e, A, P, t) {
  if (P.yawDegrees === 0 && P.pitchDegrees === 0) return e;
  const s = (e.x - A.x) / t, i = (e.y - A.y) / t, r = e.z - A.z, a = Math.hypot(s, i), o = Math.hypot(a, r), n = Math.atan2(r, a), D = v(n + P.pitchDegrees * S, -80 * S, 80 * S), g = Math.atan2(s, i) + P.yawDegrees * S;
  return {
    ...e,
    x: A.x + Math.sin(g) * Math.cos(D) * o * t,
    y: A.y + Math.cos(g) * Math.cos(D) * o * t,
    z: A.z + Math.sin(D) * o,
    heading: AA(e.heading + P.yawDegrees),
    tilt: e.tilt - (D - n) * sA
  };
}
function Js(e, A, P) {
  if (e.z >= A) return e;
  const t = (e.tilt - 90) * S;
  return {
    ...e,
    z: A,
    tilt: 90 + Math.atan2(
      Math.sin(t) * P + e.z - A,
      Math.cos(t) * P
    ) * sA
  };
}
class Ks {
  /**
   * Create a controller around the initial pose and view FOV.
   *
   * @param initialPose Flight pose used to seed heading, pitch smoothing and acceleration history.
   * @param verticalFovDegrees SceneView's base vertical field of view.
   * @param aircraft Optional aircraft-specific distance, height and speed tuning.
   */
  constructor(A, P, t = {
    cameraDistanceScale: 1,
    cameraHeightOffset: 0,
    maximumSpeed: h.maximumSpeed
  }) {
    /** Pointer-driven look state used by the settled chase view. */
    w(this, "drag", new Xs());
    w(this, "rig");
    w(this, "pitchSmoother");
    w(this, "transition", new ls());
    w(this, "aircraft");
    w(this, "previousSpeed");
    w(this, "smoothedLongitudinalAcceleration", 0);
    w(this, "launchCameraKick", 0);
    this.aircraft = t, this.rig = new js({
      distanceM: 17.5,
      heightM: 7.2,
      fovDegrees: P,
      headingDegrees: A.bodyHeading
    }), this.pitchSmoother = new zs(A.pitch), this.previousSpeed = A.speed;
  }
  /** Whether free camera orbit is currently allowed in the settled chase view. */
  get canOrbit() {
    return this.transition.mode === "chase" && this.transition.blend === 0;
  }
  /** Current chase or cockpit mode while any transition is in progress. */
  get mode() {
    return this.transition.mode;
  }
  /** Start a chase/cockpit transition, optionally jumping directly to the requested mode. */
  setMode(A, P = !1) {
    this.drag.reset(), this.transition.setMode(A, P);
  }
  /** Replace camera framing tuning after an aircraft change. */
  setAircraft(A) {
    this.aircraft = A ?? {
      cameraDistanceScale: 1,
      cameraHeightOffset: 0,
      maximumSpeed: h.maximumSpeed
    };
  }
  /**
   * Advance smoothing and calculate the next complete camera frame.
   *
   * Chase and cockpit frames are blended through transitions; optional terrain
   * sampling only raises an orbiting chase camera when it would intersect ground.
   *
   * @param options Current simulation pose, timing, viewport and scene capabilities.
   * @returns Camera coordinates, orientation, lens, roll scaling and aircraft visibility.
   */
  update(A) {
    var R;
    const { pose: P, viewport: t } = A, s = A.snap === !0, i = v(A.deltaSeconds, 1 / 240, 0.1);
    s && this.drag.reset();
    const r = this.drag.update(i, A.reducedMotion), a = this.transition.update(i), o = v(Math.abs(P.speed) / this.aircraft.maximumSpeed, 0, 1), n = v((P.boost ?? 0) - 1, 0, 1), D = this.rig.targetForSpeed(
      P.bodyHeading,
      P.speed,
      this.aircraft.maximumSpeed,
      A.verticalFovDegrees
    ), g = Es(o, n);
    D.distanceM = g.distanceM * this.aircraft.cameraDistanceScale, D.heightM = g.heightM + this.aircraft.cameraHeightOffset;
    const u = s ? 0 : v((Math.abs(P.speed) - Math.abs(this.previousSpeed)) / i, -20, 20);
    this.previousSpeed = P.speed, this.smoothedLongitudinalAcceleration = s ? 0 : N(
      this.smoothedLongitudinalAcceleration,
      u,
      1 - Math.exp(-6.5 * i)
    ), this.launchCameraKick = s ? 0 : N(
      this.launchCameraKick,
      v(this.smoothedLongitudinalAcceleration / 20, 0, 1) * 0.45,
      1 - Math.exp(-4.5 * i)
    ), D.headingDegrees = P.bodyHeading, D.distanceM += this.launchCameraKick * 0.45, D.fovDegrees = Math.min(94, D.fovDegrees + n * 12);
    const l = this.rig.update(D, i, s), d = this.pitchSmoother.update(P.pitch, i, s) * Math.PI / 180, M = cP(l.headingDegrees, 0), c = A.webMercator ? ue(P.position.y) : 1, j = N(4.5, 9.5, o) + n * 8, p = {
      x: P.position.x - M.x * l.distanceM * c,
      y: P.position.y - M.y * l.distanceM * c,
      z: P.position.z + l.heightM - Math.sin(d) * l.distanceM * 0.55
    }, z = {
      x: P.position.x + M.x * j * c,
      y: P.position.y + M.y * j * c,
      z: P.position.z + 0.8 + Math.sin(d) * j
    }, m = z.x - p.x, I = z.y - p.y, q = Math.max(
      1e-3,
      Math.hypot(m, I) / c
    ), O = AA(Math.atan2(m, I) * sA), T = Math.atan2(
      z.z - p.z,
      q
    ) * sA;
    let Q = Ws({
      ...p,
      heading: O,
      tilt: 90 + T,
      roll: 0,
      fovDegrees: l.fovDegrees
    }, { ...P.position, z: P.position.z + 0.8 }, r, c);
    if (r.yawDegrees !== 0 || r.pitchDegrees !== 0) {
      const L = (R = A.elevationAtWorld) == null ? void 0 : R.call(A, Q);
      L != null && (Q = Js(Q, L + 2, Math.hypot(
        q,
        z.z - p.z
      )));
    }
    const b = Bs(
      Q,
      Ms(P, A.verticalFovDegrees, c),
      a
    ), G = Math.max(1, t.width) / Math.max(1, t.height), y = ms(
      v(b.fovDegrees + this.transition.zoomOffsetDegrees, 46, 100),
      G
    ), f = A.bankedViewport ? b.roll : 0, k = Math.abs(f) < 0.01 ? 1 : Cs(f, t.width, t.height) + 0.012;
    return {
      x: b.x,
      y: b.y,
      z: b.z,
      heading: b.heading,
      tilt: b.tilt,
      roll: f,
      rollScale: k,
      baseFov: y,
      fov: ds(y, k),
      aircraftVisible: hs(
        this.transition.mode,
        a
      ),
      viewMode: this.transition.mode,
      transitionBlend: a
    };
  }
}
function Zs(e, A, P) {
  const t = e == null ? void 0 : e.width, s = e == null ? void 0 : e.height;
  return {
    width: Math.max(
      1,
      Math.round(typeof t == "number" && Number.isFinite(t) ? t : A)
    ),
    height: Math.max(
      1,
      Math.round(typeof s == "number" && Number.isFinite(s) ? s : P)
    )
  };
}
function _s(e, A, P, t) {
  if (A.attachDepth(
    e.getAttachment(P)
  ), t === void 0) return;
  const s = e.getAttachment(t);
  s && A.attachColor(s, t);
}
const $s = [
  "#version 300 es",
  "precision highp float;",
  "out vec2 vUv;",
  "void main() {",
  "  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));",
  "  vUv = position;",
  "  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);",
  "}"
].join(`
`), Ai = [
  "#version 300 es",
  "precision highp float;",
  "uniform sampler2D uColor;",
  "uniform float uRollRadians;",
  "uniform float uViewportScale;",
  "uniform float uAspectRatio;",
  "in vec2 vUv;",
  "layout(location=0) out vec4 outColor;",
  "void main() {",
  "  float aspect = max(0.01, uAspectRatio);",
  "  vec2 centered = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);",
  "  float cosine = cos(uRollRadians);",
  "  float sine = sin(uRollRadians);",
  "  vec2 sourceCentered = vec2(",
  "    cosine * centered.x - sine * centered.y,",
  "    sine * centered.x + cosine * centered.y",
  "  ) / max(1.0, uViewportScale);",
  "  vec2 sourceUv = clamp(",
  "    vec2(sourceCentered.x / aspect, sourceCentered.y) + vec2(0.5),",
  "    vec2(0.0),",
  "    vec2(1.0)",
  "  );",
  "  outColor = texture(uColor, sourceUv);",
  "}"
].join(`
`);
function AP(e, A, P, t) {
  const s = e.createShader(A);
  if (!s) throw new Error("Unable to allocate " + t + " shader.");
  let i = !1;
  try {
    if (e.shaderSource(s, P), e.compileShader(s), !e.getShaderParameter(s, e.COMPILE_STATUS)) {
      const r = e.getShaderInfoLog(s) ?? "unknown shader error";
      throw new Error(t + ": " + r);
    }
    return i = !0, s;
  } finally {
    i || e.deleteShader(s);
  }
}
function ei(e, A, P) {
  let t = null, s = null, i = null;
  try {
    if (t = AP(e, e.VERTEX_SHADER, A, "Scene roll vertex"), s = AP(e, e.FRAGMENT_SHADER, P, "Scene roll fragment"), i = e.createProgram(), !i) throw new Error("Unable to allocate scene-roll program.");
    if (e.attachShader(i, t), e.attachShader(i, s), e.linkProgram(i), !e.getProgramParameter(i, e.LINK_STATUS)) {
      const r = e.getProgramInfoLog(i) ?? "unknown link error";
      throw new Error("Scene roll: " + r);
    }
    return i;
  } catch (r) {
    throw i && e.deleteProgram(i), r;
  } finally {
    t && e.deleteShader(t), s && e.deleteShader(s);
  }
}
function Pi(e) {
  const A = e.getParameter(e.ACTIVE_TEXTURE);
  e.activeTexture(e.TEXTURE0);
  const P = e.getParameter(e.TEXTURE_BINDING_2D);
  return e.activeTexture(A), {
    activeTexture: A,
    blend: e.isEnabled(e.BLEND),
    colorMask: Array.from(
      e.getParameter(e.COLOR_WRITEMASK)
    ),
    cullFace: e.isEnabled(e.CULL_FACE),
    depthMask: e.getParameter(e.DEPTH_WRITEMASK),
    depthTest: e.isEnabled(e.DEPTH_TEST),
    program: e.getParameter(e.CURRENT_PROGRAM),
    scissorTest: e.isEnabled(e.SCISSOR_TEST),
    texture0: P,
    vao: e.getParameter(e.VERTEX_ARRAY_BINDING),
    viewport: Array.from(
      e.getParameter(e.VIEWPORT)
    )
  };
}
function kA(e, A, P) {
  P ? e.enable(A) : e.disable(A);
}
function ti(e, A) {
  e.viewport(...A.viewport), e.colorMask(...A.colorMask), e.depthMask(A.depthMask), kA(e, e.SCISSOR_TEST, A.scissorTest), kA(e, e.DEPTH_TEST, A.depthTest), kA(e, e.BLEND, A.blend), kA(e, e.CULL_FACE, A.cullFace), e.useProgram(A.program), e.bindVertexArray(A.vao), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, A.texture0), e.activeTexture(A.activeTexture);
}
class si extends HP {
  /** Register the node as a final-color-in/final-color-out post-process. */
  constructor({ view: P }) {
    super({
      view: P,
      consumes: { required: ["final-color"] },
      produces: "final-color"
    });
    w(this, "resourceGl", null);
    w(this, "program", null);
    w(this, "vao", null);
    w(this, "colorUniform", null);
    w(this, "rollUniform", null);
    w(this, "viewportScaleUniform", null);
    w(this, "aspectRatioUniform", null);
    w(this, "disabled", !1);
    w(this, "rollDegrees", 0);
    w(this, "viewportScale", 1);
    w(this, "renderCount", 0);
  }
  /** Update transform uniforms consumed on the next rendered frame. */
  setTransform(P, t) {
    this.rollDegrees = P, this.viewportScale = t;
  }
  /** Whether rendering is still active after setup/resource failures. */
  get appliesRoll() {
    return !this.disabled;
  }
  /** Report current transform and successful post-process draw count. */
  diagnostics() {
    return {
      enabled: !0,
      disabled: this.disabled,
      rollDegrees: this.rollDegrees,
      viewportScale: this.viewportScale,
      renderCount: this.renderCount
    };
  }
  /** Release resources using the context from which they were allocated. */
  disposeResources() {
    const P = this.resourceGl;
    P && (this.program && P.deleteProgram(this.program), this.vao && P.deleteVertexArray(this.vao)), this.program = null, this.vao = null, this.resourceGl = null;
  }
  /**
   * Process the current final-color framebuffer, returning it untouched when inactive.
   *
   * The output keeps the source depth/stencil and secondary color attachment;
   * all modified shared WebGL state is restored even if drawing throws.
   */
  render(P) {
    const t = P.find(({ name: a }) => a === "final-color");
    if (!t || this.disabled || Math.abs(this.rollDegrees) < 0.01 || !this.ensureResources())
      return t;
    const s = t.getTexture();
    if (!(s != null && s.glName)) return t;
    const i = this.gl, r = Pi(i);
    try {
      const a = this.acquireOutputFramebuffer(), o = Zs(
        s.descriptor,
        i.drawingBufferWidth,
        i.drawingBufferHeight
      );
      return i.viewport(0, 0, o.width, o.height), i.disable(i.SCISSOR_TEST), i.colorMask(!0, !0, !0, !0), i.disable(i.DEPTH_TEST), i.depthMask(!1), i.disable(i.BLEND), i.disable(i.CULL_FACE), i.useProgram(this.program), i.bindVertexArray(this.vao), i.activeTexture(i.TEXTURE0), i.bindTexture(i.TEXTURE_2D, s.glName), i.uniform1i(this.colorUniform, 0), i.uniform1f(this.rollUniform, this.rollDegrees * Math.PI / 180), i.uniform1f(this.viewportScaleUniform, this.viewportScale), i.uniform1f(this.aspectRatioUniform, o.width / o.height), i.drawArrays(i.TRIANGLES, 0, 3), _s(
        t,
        a,
        i.DEPTH_STENCIL_ATTACHMENT,
        i.COLOR_ATTACHMENT1
      ), this.renderCount += 1, a;
    } finally {
      ti(i, r);
    }
  }
  /** Lazily allocate shaders, vertex array and uniforms for the current context. */
  ensureResources() {
    const P = this.gl;
    if (this.resourceGl && this.resourceGl !== P && (this.disposeResources(), this.disabled = !1), this.program) return !0;
    if (this.disabled) return !1;
    try {
      if (this.resourceGl = P, this.program = ei(P, $s, Ai), this.vao = P.createVertexArray(), this.colorUniform = P.getUniformLocation(this.program, "uColor"), this.rollUniform = P.getUniformLocation(this.program, "uRollRadians"), this.viewportScaleUniform = P.getUniformLocation(this.program, "uViewportScale"), this.aspectRatioUniform = P.getUniformLocation(this.program, "uAspectRatio"), !this.vao || !this.colorUniform || !this.rollUniform || !this.viewportScaleUniform || !this.aspectRatioUniform)
        throw new Error("Unable to allocate scene-roll resources.");
      return !0;
    } catch (t) {
      return this.disabled = !0, console.warn("ArcGIS scene-roll RenderNode disabled:", t), this.disposeResources(), !1;
    }
  }
}
const ii = NP(
  "arcgisFlightComponent.SceneRollNode"
)(si);
function oi(e, A) {
  let P = null, t = !1, s = 0, i = 1;
  const r = () => {
    if (!A || t) return null;
    if (P) return P;
    try {
      return P = new ii({ view: e }), P.setTransform(s, i), P;
    } catch (a) {
      return t = !0, console.warn("ArcGIS scene-roll RenderNode unavailable; using a level viewport.", a), null;
    }
  };
  return r(), {
    /** True only while the enabled node can actually apply image roll. */
    get appliesRoll() {
      return A && !t && ((P == null ? void 0 : P.appliesRoll) ?? !1);
    },
    /** Enable the effect or release the node while retaining its latest transform. */
    setEnabled(a) {
      if (A = a, !A) {
        P == null || P.disposeResources(), P == null || P.destroy(), P = null;
        return;
      }
      r();
    },
    /** Clamp user-provided values before storing them for the node/shader. */
    setTransform(a, o) {
      Number.isFinite(a) ? s = Math.max(-60, Math.min(60, a)) : s = 0, Number.isFinite(o) ? i = Math.max(1, Math.min(2.2, Math.abs(o))) : i = 1, P == null || P.setTransform(s, i);
    },
    /** Return node diagnostics, or a lightweight state snapshot before creation/after failure. */
    diagnostics: () => (P == null ? void 0 : P.diagnostics()) ?? {
      enabled: A,
      disabled: t,
      rollDegrees: s,
      viewportScale: i,
      renderCount: 0
    },
    /** Disable the effect and release all node and WebGL resources. */
    destroy() {
      A = !1, P == null || P.disposeResources(), P == null || P.destroy(), P = null;
    }
  };
}
async function ri(e, A, P) {
  var t, s;
  if (!e) return null;
  try {
    await e.load({ signal: P }), P == null || P.throwIfAborted();
    const i = await e.queryElevation(A, {
      demResolution: "finest-contiguous",
      returnSampleInfo: !0,
      signal: P
    }), r = i == null ? void 0 : i.geometry;
    if (!Number.isFinite(r == null ? void 0 : r.z)) return null;
    const a = (t = i.sampleInfo) == null ? void 0 : t[0];
    if ((a == null ? void 0 : a.demResolution) === -1 || !a && (r == null ? void 0 : r.z) === i.noDataValue) return null;
    const o = a == null ? void 0 : a.source, n = (s = o == null ? void 0 : o.heightModelInfo) == null ? void 0 : s.heightUnit, D = n === "us-feet" ? 1200 / 3937 : n === "feet" ? 0.3048 : n === "meters" ? 1 : n ? NaN : o != null && o.spatialReference && !o.spatialReference.isGeographic ? o.spatialReference.metersPerUnit : 1;
    return Number.isFinite(D) && D > 0 ? Number(r == null ? void 0 : r.z) * D : null;
  } catch (i) {
    if (aP(i)) throw i;
    return null;
  }
}
async function eP(e, A, P, t, s = "global") {
  t == null || t.throwIfAborted();
  const i = new AbortController();
  let r = !1;
  const a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), n = (C) => {
    if (!(o.has(C) || C.destroyed)) {
      o.add(C);
      try {
        C.destroy();
      } catch (d) {
        console.warn("ArcGIS aircraft mesh cleanup failed.", d);
      }
    }
  }, D = (C) => {
    r || (r = !0, a.forEach(n), a.clear(), i.abort(C));
  };
  let g = null;
  const u = t ? new Promise((C, d) => {
    g = () => {
      const M = t.reason;
      D(M), d(M);
    }, t.addEventListener("abort", g, { once: !0 });
  }) : null, l = async (C) => {
    try {
      const d = await e(A, C, {
        signal: i.signal,
        vertexSpace: s !== "local" && (A.spatialReference.isGeographic || A.spatialReference.isWebMercator) ? "local" : "georeferenced"
      });
      return r ? n(d) : a.add(d), d;
    } catch (d) {
      throw D(d), d;
    }
  };
  try {
    const C = Promise.all([
      l(P.bodyUrl),
      P.propellerUrl ? l(P.propellerUrl) : Promise.resolve(null),
      P.boostUrl ? l(P.boostUrl) : Promise.resolve(null)
    ]), d = u ? await Promise.race([C, u]) : await C;
    return t == null || t.throwIfAborted(), d;
  } catch (C) {
    throw D(C), C;
  } finally {
    g && (t == null || t.removeEventListener("abort", g));
  }
}
function wi(e) {
  return {
    dragPrimary: e.dragPrimary,
    dragSecondary: e.dragSecondary,
    dragTertiary: e.dragTertiary,
    mouseWheel: e.mouseWheel
  };
}
function ai(e, A) {
  if (!e) return null;
  const P = e.elevationAt(A.x, A.y);
  return !Number.isFinite(P) || Number.isFinite(e.noDataValue) && P === e.noDataValue ? null : P;
}
function ni(e) {
  const A = ai(e.ground, e.point);
  if (A !== null)
    return { elevationM: A, source: "ground" };
  const P = e.lastSafe, t = e.nowMs ?? performance.now();
  return P && t - P.timestampMs <= (e.lastSafeAgeMs ?? 1500) && Math.hypot(
    e.point.x - P.position.x,
    e.point.y - P.position.y
  ) <= (e.lastSafeDistanceM ?? 120) ? { elevationM: P.elevationM, source: "last-safe" } : { elevationM: null, source: "none" };
}
function NA(e) {
  return (e.equals ?? Object.is)(e.current, e.applied) ? (e.restore(e.original), !0) : !1;
}
const Di = 6378137, de = 25e3, gi = 2, vi = 16e4;
function PP(e, A) {
  const P = Number.isFinite(e) ? Math.max(0, e) : 0, s = Math.sqrt(P * (2 * Di + P)) * 1.5 + 1e4;
  return Math.max(A, Math.ceil(s / de) * de);
}
function tP(e, A, P = gi) {
  if (A || !Number.isFinite(e) || e <= 2e5)
    return P;
  const t = Math.min(10, 2 + Math.floor((e - 2e5) / 1e5) * 2);
  return Math.max(P, t);
}
function ci(e, A) {
  return A > e || A < e - de;
}
function li(e, A) {
  const P = e.constraints.clipDistance, t = { mode: P.mode, near: P.near, far: P.far }, s = Math.max(
    vi,
    Number.isFinite(t.far) ? t.far : 0
  );
  let i = tP(A, !0), r = PP(A, s), a = 0;
  return e.constraints.clipDistance = { mode: "manual", near: i, far: r }, {
    update(o, n) {
      if (e.destroyed) return;
      const D = e.constraints.clipDistance, g = tP(o, n);
      D.near !== g && (D.near = g, i = g);
      const u = PP(o, s);
      ci(r, u) && (D.far = u, r = u, a += 1);
    },
    restore() {
      if (e.destroyed) return;
      const o = e.constraints.clipDistance;
      NA({
        current: { mode: o.mode, near: o.near, far: o.far },
        applied: { mode: "manual", near: i, far: r },
        original: t,
        equals: (n, D) => n.mode === D.mode && n.near === D.near && n.far === D.far,
        restore: (n) => {
          e.constraints.clipDistance = n.mode === "auto" ? { mode: "auto" } : { mode: "manual", near: n.near, far: n.far };
        }
      });
    },
    diagnostics() {
      const o = e.constraints.clipDistance;
      return { mode: o.mode, nearM: o.near, farM: o.far, updateCount: a };
    }
  };
}
class Bi {
  constructor() {
    w(this, "entries", []);
    w(this, "disposed", !1);
    w(this, "sequence", 0);
  }
  /**
   * Register one cleanup operation in an ownership phase.
   *
   * Entries in lower-numbered phases run first; within a phase, the newest
   * acquisition is released first. Adding after disposal runs the cleanup
   * immediately, which covers resources returned by late asynchronous loads.
   *
   * @param label Human-readable resource name included in cleanup warnings.
   * @param order Cleanup phase used to order dependencies.
   * @param dispose Synchronous operation that releases the acquired resource.
   */
  add(A, P, t) {
    const s = { label: A, order: P, sequence: this.sequence++, dispose: t };
    if (this.disposed) {
      this.run(s);
      return;
    }
    this.entries.push(s);
  }
  /** Release every registered resource once, in dependency-safe order. */
  dispose() {
    if (this.disposed) return;
    this.disposed = !0;
    const A = this.entries.sort((P, t) => P.order - t.order || t.sequence - P.sequence);
    this.entries = [];
    for (const P of A) this.run(P);
  }
  /** Run one cleanup independently so a failure cannot prevent later releases. */
  run(A) {
    try {
      A.dispose();
    } catch (P) {
      console.warn(`ArcGIS flight cleanup failed for ${A.label}.`, P);
    }
  }
}
const sP = "Plane navigation", QA = /* @__PURE__ */ new WeakMap(), Y = {
  runtime: 10,
  navigation: 20,
  camera: 30,
  layerRemoval: 40,
  graphic: 50,
  mesh: 60,
  layer: 70,
  accessor: 80,
  lease: 90
};
function ve(e, A) {
  return Number.isFinite(e) ? Number(e) : A;
}
function ui(e) {
  return { ...e, position: { ...e.position } };
}
async function Ci(e, A) {
  const { longitude: P, latitude: t } = A.start;
  if (P !== void 0 && t !== void 0) {
    const s = new nP({
      longitude: P,
      latitude: t,
      spatialReference: { wkid: 4326 }
    }), i = e.view.spatialReference;
    if (i.isWebMercator)
      return FP.geographicToWebMercator(s);
    if (i.isWGS84) return s;
    const r = await is(s, i);
    if (!r || r.type !== "point")
      throw new Error("The configured flight start could not be projected into the scene.");
    return r.spatialReference = i, r;
  }
  return e.view.center.clone();
}
async function di(e, A, P = {}) {
  const { signal: t } = P, s = P.restoreCameraOnAbort ?? (() => !0), i = () => t == null ? void 0 : t.throwIfAborted();
  i();
  const r = et(e);
  await r.whenReady(), i();
  const a = r.map;
  if (!a) throw new Error("The referenced ArcGIS scene has no map.");
  const o = r.view, n = r.inputElement, D = Vs(
    o.viewingMode,
    o.spatialReference
  ), g = qs(D, o.spatialReference), u = Symbol("arcgis-plane-navigation");
  if (QA.has(o))
    throw new Error("This ArcGIS scene already has an active plane navigation instance.");
  QA.set(o, u);
  const l = new Bi(), C = new AbortController();
  l.add("aircraft model loads", Y.runtime, () => {
    C.abort();
  }), l.add("view lease", Y.lease, () => {
    QA.get(o) === u && QA.delete(o);
  });
  let d = !0, M = !1;
  const c = (L = !0) => {
    d = L, M = !0, l.dispose();
  };
  let j, p, z;
  try {
    j = o.camera.clone(), l.add("initial camera", Y.accessor, () => {
      !j.destroyed && (o.destroyed || o.camera !== j) && j.destroy();
    }), p = {
      gamepadEnabled: o.navigation.gamepad.enabled,
      browserTouchPanEnabled: o.navigation.browserTouchPanEnabled,
      momentumEnabled: o.navigation.momentumEnabled,
      actionMap: o.navigation.actionMap ? wi(o.navigation.actionMap) : null
    }, z = new SP({
      title: sP,
      elevationInfo: { mode: "absolute-height" },
      listMode: "hide"
    }), l.add("flight layer", Y.layer, () => {
      z.destroyed || z.destroy();
    }), l.add("flight layer removal", Y.layerRemoval, () => {
      !a.destroyed && a.layers.includes(z) && a.remove(z);
    });
  } catch (L) {
    throw c(), L;
  }
  const m = {
    dragPrimary: "none",
    dragSecondary: "none",
    dragTertiary: "none",
    mouseWheel: "none"
  };
  let I = !1;
  const q = (L) => L.preventDefault(), O = new Hs();
  let T = null, Q = null, b = null, G = null, y = null, f = 0, k = 0;
  const R = () => {
    c(s());
  };
  l.add("abort listener", Y.runtime, () => {
    t == null || t.removeEventListener("abort", R);
  });
  try {
    t == null || t.addEventListener("abort", R, { once: !0 }), i();
    const L = await Ci(r, A);
    i();
    const F = A.terrain.enabled || A.start.altitudeM === void 0 ? await ri(
      a.ground,
      L,
      t
    ) : null;
    if (i(), F === null && A.start.altitudeM === void 0)
      throw new Error(
        "Initial ground elevation is unavailable. Set start.altitudeM or provide an accessible ground elevation source."
      );
    const Z = ve(
      A.start.altitudeM,
      (F ?? 0) + 300
    ), nA = F === null ? Z : Math.max(
      Z,
      F + A.terrain.minimumClearanceM + 1
    );
    L.z = nA / g, L.spatialReference = o.spatialReference;
    const oA = Os({ x: L.x, y: L.y, z: L.z }, g);
    F !== null && (b = {
      position: { x: oA.x, y: oA.y },
      elevationM: F,
      timestampMs: performance.now()
    });
    const OA = dP(oA, ve(A.start.headingDeg, o.camera.heading)), K = {
      ...OA,
      speed: ve(A.start.speedMps, OA.speed)
    };
    if (a.add(z), D === "web-mercator" && o.viewingMode === "global" && o.whenLayerView(z).then((B) => {
      M || (T = es(B, qe.fullVersion ?? qe.version), l.add("aircraft render origin", Y.runtime, () => T == null ? void 0 : T.destroy()));
    }, () => {
    }), n.hasAttribute("tabindex") || (I = !0, n.tabIndex = 0, l.add("component tabindex", Y.navigation, () => {
      I && n.getAttribute("tabindex") === "0" && n.removeAttribute("tabindex");
    })), A.controls.captureSceneNavigation) {
      if (l.add("gamepad navigation", Y.navigation, () => {
        NA({
          current: o.navigation.gamepad.enabled,
          applied: !1,
          original: p.gamepadEnabled,
          restore: (B) => {
            o.navigation.gamepad.enabled = B;
          }
        });
      }), o.navigation.gamepad.enabled = !1, l.add("touch navigation", Y.navigation, () => {
        NA({
          current: o.navigation.browserTouchPanEnabled,
          applied: !1,
          original: p.browserTouchPanEnabled,
          restore: (B) => {
            o.navigation.browserTouchPanEnabled = B;
          }
        });
      }), o.navigation.browserTouchPanEnabled = !1, l.add("navigation momentum", Y.navigation, () => {
        NA({
          current: o.navigation.momentumEnabled,
          applied: !1,
          original: p.momentumEnabled,
          restore: (B) => {
            o.navigation.momentumEnabled = B;
          }
        });
      }), o.navigation.momentumEnabled = !1, p.actionMap) {
        const B = p.actionMap;
        o.navigation.actionMap = m;
        const E = o.navigation.actionMap;
        l.add("navigation action map", Y.navigation, () => {
          const V = o.navigation.actionMap;
          V === E && V.dragPrimary === "none" && V.dragSecondary === "none" && V.dragTertiary === "none" && V.mouseWheel === "none" && (o.navigation.actionMap = B);
        });
      }
      for (const [B, E] of [
        ["drag", "drag navigation listener"],
        ["mouse-wheel", "mouse-wheel navigation listener"],
        ["double-click", "double-click navigation listener"],
        ["key-down", "key-down navigation listener"]
      ]) {
        const V = o.on(B, (U) => U.stopPropagation());
        l.add(E, Y.runtime, () => V.remove());
      }
      n.addEventListener("contextmenu", q), l.add("context menu listener", Y.runtime, () => {
        n.removeEventListener("contextmenu", q);
      });
    }
    const WA = (B, E) => {
      const V = new kP({
        geometry: B,
        symbol: new gP({
          symbolLayers: [new DP({ castShadows: E })]
        })
      });
      l.add("aircraft graphic", Y.graphic, () => {
        V.destroyed || V.destroy();
      }), V.visible = !1, z.add(V);
      const U = Ls(B);
      return { mesh: B, motion: U, graphic: V };
    }, qP = (B) => {
      for (const E of B)
        E && l.add("aircraft mesh", Y.mesh, () => {
          E.destroyed || E.destroy();
        });
    }, he = (B, E) => {
      const [V, U, x] = B;
      return qP(B), E.preserveFinish || as([
        ...V.components ?? [],
        ...(U == null ? void 0 : U.components) ?? []
      ]), {
        vehicle: WA(V, !0),
        propeller: U ? WA(U, !0) : null,
        boost: x ? WA(x, !1) : null,
        assets: E
      };
    }, JA = /* @__PURE__ */ new Map(), KA = /* @__PURE__ */ new Map(), me = (B) => JSON.stringify(B), OP = await eP(
      Ze,
      L,
      A.assets,
      t,
      o.viewingMode
    );
    i();
    const ze = he(OP, A.assets);
    JA.set(me(A.assets), ze);
    let J = ze, Ee = 0, YA = ys({
      ...J,
      propellerAnchorM: J.assets.propellerAnchorM,
      visualPitchDeg: J.assets.visualPitchDeg,
      point: L,
      metersPerUnit: g,
      webMercator: D === "web-mercator" && o.viewingMode === "global"
    });
    l.add("aircraft positions", Y.accessor, () => YA.destroy());
    const je = {
      position: { ...K.position },
      bodyHeading: K.heading,
      travelHeading: K.heading,
      pitch: K.pitch,
      roll: K.bank,
      speed: K.speed,
      interpolationAlpha: 0,
      boost: K.launchBoost
    }, eA = new Ks(
      je,
      A.camera.fovDeg,
      A.flight ? { ...tA[A.flight.model], maximumSpeed: A.flight.tuning.maximumSpeed } : void 0
    );
    eA.setMode(A.camera.mode, !0);
    const YP = 1e3 / A.camera.submissionHz, Ie = (B) => A.camera.submissionHz < 60 ? Math.max(YP, B.intervalMs) : B.intervalMs, yA = new Oe({
      position: L.clone(),
      heading: K.heading,
      tilt: 78
    });
    l.add("initial chase camera", Y.accessor, () => {
      !yA.destroyed && (o.destroyed || o.camera !== yA) && yA.destroy();
    }), o.camera = yA, l.add("camera restoration", Y.camera, () => {
      !o.destroyed && d && (o.camera = j);
    });
    const hA = oi(o, A.camera.bankedViewport);
    l.add("scene roll", Y.runtime, () => hA.destroy());
    const rA = D === "web-mercator" && o.viewingMode === "global" ? li(o, nA) : null;
    rA && l.add("clip distance", Y.navigation, () => rA.restore());
    const GA = new Gs({
      intervalMs: Ie(O.diagnostics()),
      submit(B) {
        if (M) return;
        YA.update(
          B.pose,
          B.aircraftVisible,
          B.propellerAngleDeg,
          B.exhaust
        ), hA.setTransform(B.roll, B.rollScale), rA == null || rA.update(B.z, B.aircraftVisible);
        const E = new Oe({
          position: new nP({
            ...xA(B, g),
            spatialReference: o.spatialReference
          }),
          heading: B.heading,
          tilt: B.tilt,
          fov: B.fov
        });
        try {
          o.camera = E;
        } catch (V) {
          throw !E.destroyed && o.camera !== E && E.destroy(), V;
        }
        f += 1, k = B.tick;
      },
      onError(B) {
        aP(B) || console.warn("ArcGIS flight presentation failed.", B);
      }
    });
    if (l.add("camera scheduler", Y.runtime, () => {
      GA.destroy();
    }), A.terrain.enabled) {
      Q = o.groundView.elevationSampler;
      const B = RP.watch(
        () => o.groundView.elevationSampler,
        (E) => {
          Q = E;
        }
      );
      l.add("terrain sampler handle", Y.runtime, () => {
        B.remove();
      });
    }
    const pe = (B) => {
      if (!A.terrain.enabled) return null;
      const E = ni({
        point: B,
        ground: Q ? {
          elevationAt: (V, U) => {
            const x = Q.elevationAt(V / g, U / g);
            return x === Q.noDataValue ? NaN : x * g;
          }
        } : null,
        lastSafe: b
      });
      return E.elevationM !== null && E.source === "ground" && (b = {
        position: { ...B },
        elevationM: E.elevationM,
        timestampMs: performance.now()
      }), E.elevationM;
    }, PA = A.controls.captureSceneNavigation ? As(n, eA.drag, () => eA.canOrbit) : null;
    l.add("camera drag input", Y.runtime, () => PA == null ? void 0 : PA.destroy());
    const Qe = window.matchMedia("(prefers-reduced-motion: reduce)"), ZA = new Ps();
    let _A = 0, Te = A.camera.bankedViewport;
    const Le = (B, E, V, U, x = !1) => {
      if (M) return;
      x && (PA == null || PA.reset(), ZA.reset()), ZA.update(
        B.boost ?? 0,
        Math.max(0, Math.abs(B.speed) - Math.abs((y == null ? void 0 : y.speed) ?? B.speed)) / Math.max(1e-3, V * h.turboAcceleration),
        V,
        Qe.matches
      ), _A = AA(
        _A + (720 + B.speed * 7.5) * V
      );
      const wA = eA.update({
        pose: B,
        verticalFovDegrees: E,
        deltaSeconds: V,
        viewport: { width: o.width, height: o.height },
        webMercator: D === "web-mercator" && o.viewingMode === "global",
        bankedViewport: Te && hA.appliesRoll,
        reducedMotion: Qe.matches,
        elevationAtWorld: pe,
        snap: x
      });
      G = wA, y = { ...B, position: { ...B.position } }, GA.update({
        ...wA,
        tick: U,
        pose: y,
        aircraftVisible: wA.aircraftVisible,
        propellerAngleDeg: _A,
        exhaust: ZA.frame()
      }, x);
    };
    return Le(je, A.camera.fovDeg, 1 / 60, 0, !0), {
      sceneElement: n,
      startState: ui(K),
      elevationAtWorld: pe,
      present: Le,
      /** Toggle the shader pass without rebuilding the flight scene. */
      setBankedViewport(B) {
        hA.setEnabled(B), Te = B;
      },
      /** Reset any in-progress drag before switching the camera mode. */
      setViewMode(B, E = !1) {
        PA == null || PA.reset(), eA.setMode(B, E);
      },
      /**
       * Reuse cached meshes or load the requested aircraft before switching graphics.
       *
       * A request sequence prevents a slower earlier load from replacing a newer
       * selection. `false` means the request was superseded or the scene stopped.
       */
      async setAircraft(B, E) {
        const V = ++Ee, U = me(B);
        let x = JA.get(U);
        if (!x) {
          let wA = KA.get(U);
          wA || (wA = eP(
            Ze,
            L,
            B,
            C.signal,
            o.viewingMode
          ).then((be) => {
            if (M) {
              for (const $A of be) $A && !$A.destroyed && $A.destroy();
              return null;
            }
            const Ve = he(be, B);
            return JA.set(U, Ve), Ve;
          }).finally(() => KA.delete(U)), KA.set(U, wA)), x = await wA ?? void 0;
        }
        return !x || M || V !== Ee ? !1 : (x !== J && (J.vehicle.graphic.visible = !1, J.propeller && (J.propeller.graphic.visible = !1), J.boost && (J.boost.graphic.visible = !1), J = x, YA.setAircraft({
          ...J,
          propellerAnchorM: J.assets.propellerAnchorM,
          visualPitchDeg: J.assets.visualPitchDeg
        })), eA.setAircraft(E ? { ...tA[E.model], maximumSpeed: E.tuning.maximumSpeed } : void 0), !0);
      },
      /** Feed performance telemetry to the cadence governor and apply its new interval. */
      setFramePacing(B) {
        const E = O.update(B, performance.now());
        GA.setIntervalMs(Ie(E));
      },
      /** Assemble an immutable snapshot of session, presentation and cleanup diagnostics. */
      debugSnapshot: () => {
        const B = YA.diagnostics();
        return {
          hostSceneId: n.id,
          planeLayerPresent: a.layers.includes(z),
          planeLayerCount: a.layers.filter(
            (E) => E.title === sP
          ).length,
          cameraUpdateCount: f,
          cameraAccessorStrategy: "fresh-public-camera",
          lastPresentationTick: k,
          cameraFrame: G ? { ...G } : null,
          planePosition: y ? { ...y.position } : { ...K.position },
          ...B,
          viewMode: eA.mode,
          aircraftRenderOrigin: (T == null ? void 0 : T.diagnostics()) ?? null,
          cameraDrag: { ...eA.drag.offset, dragging: eA.drag.dragging },
          terrainSamplerReady: Q !== null,
          leaseActive: QA.get(o) === u,
          cameraScheduler: GA.diagnostics(),
          cameraCadence: O.diagnostics(),
          sceneRoll: hA.diagnostics(),
          clipDistance: (rA == null ? void 0 : rA.diagnostics()) ?? null
        };
      },
      /** Release the view lease, restore borrowed state and destroy all owned resources. */
      destroy(B = {}) {
        c(B.restoreCamera !== !1);
      }
    };
  } catch (L) {
    throw c(
      t != null && t.aborted ? s() : !0
    ), L;
  }
}
const MA = ["slow", "normal", "turbo"], Mi = `
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
function hi(e, A) {
  return e.includes(A);
}
class mi {
  /**
   * Create the shadow-root toolbar and attach action handlers.
   *
   * @param ownerDocument Document used to create the overlay, including in embedded hosts.
   * @param config Initial toolbar contents and visibility settings.
   * @param locale Translation catalog used for accessible labels.
   * @param formatLocale Number-format locale for the speed display.
   * @param actions Callbacks that route button input to the flight element.
   */
  constructor(A, P, t, s, i) {
    /** Wrapper mounted into the ArcGIS view's UI. */
    w(this, "element");
    w(this, "shadow");
    w(this, "actions");
    w(this, "eventController", new AbortController());
    w(this, "config");
    w(this, "locale");
    w(this, "formatLocale");
    w(this, "speedFormatter");
    w(this, "lastSpeedText", "");
    w(this, "snapshot", null);
    w(this, "structureKey", "");
    w(this, "speedOutput", null);
    w(this, "powerButtons", /* @__PURE__ */ new Map());
    w(this, "pauseButton", null);
    w(this, "cameraButton", null);
    w(this, "recoverButton", null);
    this.element = A.createElement("div"), this.element.dataset.arcgisFlightControls = "", this.element.className = "arcgis-flight-controls", this.shadow = this.element.attachShadow({ mode: "open" }), this.actions = i, this.config = P, this.locale = t, this.formatLocale = s, this.speedFormatter = new Intl.NumberFormat(s, { maximumFractionDigits: 0 }), this.rebuild();
  }
  /**
   * Apply the latest UI config, localized labels and flight snapshot.
   *
   * Recreates number formatting only when its locale changes and rebuilds the
   * controls only when their structure or translated copy changes.
   *
   * @param config Toolbar visibility and enabled-control settings.
   * @param locale Translation catalog key.
   * @param formatLocale Locale tag passed to `Intl.NumberFormat`.
   * @param snapshot Current flight state, or `null` when no session is active.
   */
  update(A, P, t, s) {
    this.config = A, this.locale = P, this.formatLocale !== t && (this.formatLocale = t, this.speedFormatter = new Intl.NumberFormat(t, { maximumFractionDigits: 0 }), this.lastSpeedText = ""), this.snapshot = s, JSON.stringify({
      controls: A.controls,
      showSpeed: A.showSpeed,
      locale: P
    }) !== this.structureKey && this.rebuild(), this.renderState();
  }
  /** Abort toolbar listeners and remove its wrapper from the document. */
  destroy() {
    this.eventController.abort(), this.element.remove();
  }
  /** Replace toolbar nodes and listeners when controls, speed display or locale changes. */
  rebuild() {
    this.eventController.abort(), this.eventController = new AbortController(), this.powerButtons.clear(), this.pauseButton = null, this.cameraButton = null, this.recoverButton = null, this.speedOutput = null, this.lastSpeedText = "", this.structureKey = JSON.stringify({
      controls: this.config.controls,
      showSpeed: this.config.showSpeed,
      locale: this.locale
    });
    const A = this.element.ownerDocument, P = A.createElement("style");
    P.textContent = Mi;
    const t = A.createElement("div");
    if (t.className = "toolbar", t.setAttribute("role", "group"), t.setAttribute("aria-label", ee(this.locale, "controlsAria")), t.lang = this.locale, this.config.showSpeed) {
      const i = A.createElement("span");
      i.className = "speed", i.setAttribute("role", "meter"), i.setAttribute(
        "aria-label",
        iA(this.locale, "flight.speedAria")
      ), i.setAttribute("aria-valuemin", "0"), i.setAttribute("aria-valuemax", "1200"), i.setAttribute("aria-valuenow", "0"), i.setAttribute("aria-valuetext", "0 km/h"), i.textContent = "0 km/h", t.append(i), this.speedOutput = i;
    }
    if (hi(this.config.controls, "power")) {
      const i = A.createElement("div");
      i.className = "power", i.setAttribute("role", "radiogroup"), i.setAttribute(
        "aria-label",
        iA(this.locale, "flight.speed")
      );
      for (const [r, a] of MA.entries()) {
        const o = A.createElement("button");
        o.type = "button", o.dataset.mode = a, o.dataset.index = String(r), o.setAttribute("role", "radio"), o.setAttribute("aria-checked", "false"), o.tabIndex = -1, o.textContent = Re(this.locale, a), o.addEventListener(
          "click",
          () => this.actions.setPowerMode(a),
          { signal: this.eventController.signal }
        ), o.addEventListener(
          "keydown",
          (n) => this.handlePowerKey(n, r),
          { signal: this.eventController.signal }
        ), i.append(o), this.powerButtons.set(a, o);
      }
      t.append(i);
    }
    const s = this.config.controls.filter(
      (i) => i !== "power"
    );
    if (s.length > 0) {
      const i = A.createElement("div");
      i.className = "actions";
      for (const r of s) {
        const a = A.createElement("button");
        a.type = "button", a.className = "action", r === "pause" ? (a.addEventListener(
          "click",
          () => this.actions.togglePause(),
          { signal: this.eventController.signal }
        ), this.pauseButton = a) : r === "camera" ? (a.addEventListener(
          "click",
          () => {
            var o;
            return this.actions.setCameraMode(
              ((o = this.snapshot) == null ? void 0 : o.cameraMode) === "cockpit" ? "chase" : "cockpit"
            );
          },
          { signal: this.eventController.signal }
        ), this.cameraButton = a) : (a.addEventListener(
          "click",
          () => this.actions.recover(),
          { signal: this.eventController.signal }
        ), this.recoverButton = a), i.append(a);
      }
      t.append(i);
    }
    this.shadow.replaceChildren(P, t), this.renderState();
  }
  /** Reflect the last snapshot into speed text, radio selection and action availability. */
  renderState() {
    const A = this.snapshot, P = A === null || A.phase === "stopped";
    if (this.speedOutput) {
      const t = Math.round(Math.max(0, (A == null ? void 0 : A.vehicle.speed) ?? 0) * 3.6), s = this.speedFormatter.format(t) + " km/h";
      s !== this.lastSpeedText && (this.lastSpeedText = s, this.speedOutput.textContent = s, this.speedOutput.setAttribute("aria-valuenow", String(t)), this.speedOutput.setAttribute("aria-valuetext", s));
    }
    for (const [t, s] of this.powerButtons) {
      const i = (A == null ? void 0 : A.powerMode) === t;
      s.disabled = P, s.setAttribute("aria-checked", String(i)), s.setAttribute(
        "aria-label",
        i ? Re(this.locale, t) : zt(this.locale, t)
      ), s.tabIndex = i ? 0 : -1;
    }
    if (!A && this.powerButtons.size > 0) {
      const t = this.powerButtons.values().next().value;
      t && (t.tabIndex = 0);
    }
    if (this.pauseButton) {
      const t = (A == null ? void 0 : A.phase) === "paused", s = ee(
        this.locale,
        (A == null ? void 0 : A.phase) === "ready" ? "start" : t ? "resume" : "pause"
      );
      this.pauseButton.disabled = P, this.pauseButton.textContent = s, this.pauseButton.setAttribute("aria-label", s), this.pauseButton.title = s;
    }
    if (this.cameraButton) {
      const t = (A == null ? void 0 : A.cameraMode) === "cockpit" ? "chase" : "cockpit";
      this.cameraButton.disabled = P, this.cameraButton.textContent = Et(this.locale, t);
      const s = jt(this.locale, t);
      this.cameraButton.setAttribute("aria-label", s), this.cameraButton.title = s;
    }
    if (this.recoverButton) {
      const t = ee(this.locale, "recover");
      this.recoverButton.disabled = P, this.recoverButton.textContent = t, this.recoverButton.setAttribute("aria-label", t), this.recoverButton.title = t;
    }
  }
  /** Move radio focus with arrow/Home/End keys and request the newly selected mode. */
  handlePowerKey(A, P) {
    var i;
    let t = null;
    if (A.key === "ArrowLeft" || A.key === "ArrowUp" ? t = (P + MA.length - 1) % MA.length : A.key === "ArrowRight" || A.key === "ArrowDown" ? t = (P + 1) % MA.length : A.key === "Home" ? t = 0 : A.key === "End" && (t = MA.length - 1), t === null) return;
    A.preventDefault(), A.stopPropagation();
    const s = MA[t];
    this.actions.setPowerMode(s), (i = this.powerButtons.get(s)) == null || i.focus();
  }
}
function zi(e, A) {
  const P = e.ownerDocument, t = P.defaultView;
  let s = null, i = null;
  const r = () => {
    const g = s;
    s = null, i = null, g !== null && e.hasPointerCapture(g) && e.releasePointerCapture(g), e.style.setProperty("--stick-x", "0px"), e.style.setProperty("--stick-y", "0px"), A(0, 0);
  }, a = (g) => {
    if (g.pointerId !== s) return;
    if (g.pointerType !== "touch" && !(g.buttons & 1)) {
      r();
      return;
    }
    i ?? (i = e.getBoundingClientRect());
    const u = (g.clientX - i.left - i.width / 2) / (i.width * 0.36), l = -(g.clientY - i.top - i.height / 2) / (i.height * 0.36), C = Math.max(1, Math.hypot(u, l)), d = u / C, M = l / C;
    e.style.setProperty("--stick-x", `${d * i.width * 0.23}px`), e.style.setProperty("--stick-y", `${-M * i.height * 0.23}px`), A(d, M), g.preventDefault();
  }, o = (g) => {
    s !== null || g.button !== 0 || e.hasAttribute("disabled") || (g.preventDefault(), s = g.pointerId, i = e.getBoundingClientRect(), e.setPointerCapture(s), a(g));
  }, n = (g) => {
    g.pointerId === s && r();
  }, D = () => {
    P.hidden && r();
  };
  return e.addEventListener("pointerdown", o), e.addEventListener("pointermove", a), e.addEventListener("lostpointercapture", n), t.addEventListener("pointerup", n, !0), t.addEventListener("pointercancel", n, !0), t.addEventListener("blur", r), t.addEventListener("resize", r), P.addEventListener("visibilitychange", D), { reset: r, destroy() {
    r(), e.removeEventListener("pointerdown", o), e.removeEventListener("pointermove", a), e.removeEventListener("lostpointercapture", n), t.removeEventListener("pointerup", n, !0), t.removeEventListener("pointercancel", n, !0), t.removeEventListener("blur", r), t.removeEventListener("resize", r), P.removeEventListener("visibilitychange", D);
  } };
}
const iP = {
  en: "Flight joystick",
  fr: "Joystick de vol",
  de: "Flugjoystick",
  it: "Joystick di volo",
  es: "Joystick de vuelo"
};
class Ei {
  /**
   * Build the stick and bind pointer movement to bank and pitch input.
   *
   * @param document Document that owns the overlay nodes.
   * @param onMove Receives the current normalized bank and pitch axes.
   */
  constructor(A, P) {
    /** Wrapper element inserted into the host view's UI. */
    w(this, "element");
    w(this, "stick");
    w(this, "binding");
    this.element = A.createElement("div"), this.element.dataset.flightStick = "", this.element.className = "arcgis-flight-joystick";
    const t = this.element.attachShadow({ mode: "open" }), s = A.createElement("style");
    s.textContent = `
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
    `, this.stick = A.createElement("button"), this.stick.type = "button", this.stick.disabled = !0, t.append(s, this.stick), this.binding = zi(this.stick, P);
  }
  /** Enable only during flight and reset an active gesture when flight stops. */
  update(A, P) {
    !A && !this.stick.disabled && this.binding.reset(), this.stick.disabled = !A, this.stick.setAttribute("aria-label", iP[P]), this.stick.title = iP[P];
  }
  /** Release a gesture and return the input and visible thumb to center. */
  reset() {
    this.binding.reset();
  }
  /** Remove pointer listeners and the overlay element. */
  destroy() {
    this.binding.destroy(), this.element.remove();
  }
}
const ji = [
  "reference-element",
  "start-longitude",
  "start-latitude",
  "start-altitude-m",
  "start-heading-deg",
  "start-speed-mps",
  "camera-mode",
  "power-mode",
  "sensitivity",
  "fov-deg",
  "invert-pitch-disabled",
  "camera-roll-disabled",
  "keyboard-disabled",
  "gamepad-disabled",
  "capture-scene-navigation-disabled",
  "auto-start-disabled",
  "show-controls",
  "joystick",
  "joystick-position",
  "ui-position",
  "ui-controls",
  "show-speed",
  "locale"
];
function cA(e, A) {
  const P = e.getAttribute(A);
  if (P === null || P.trim() === "") return;
  const t = Number(P);
  if (!Number.isFinite(t))
    throw new Error(`${A} must be a finite number.`);
  return t;
}
function vA(e, A, P) {
  throw new Error(`${e}="${A}" is invalid; expected ${P}.`);
}
function Ii(e, A, P) {
  const t = A === "start-longitude", s = t ? "latitude" : "longitude", i = t ? "start-latitude" : "start-longitude", r = cA(e, A);
  if (r === void 0) {
    if (e.hasAttribute(i))
      throw new Error("start.longitude and start.latitude must be supplied together.");
    return { start: { longitude: void 0, latitude: void 0 } };
  }
  const a = P.start[s] ?? cA(e, i);
  if (a === void 0)
    throw new Error("start.longitude and start.latitude must be supplied together.");
  return {
    start: t ? { longitude: r, latitude: a } : { longitude: a, latitude: r }
  };
}
function pi(e, A) {
  const P = e.getAttribute(A);
  if (P === null) return {};
  switch (A) {
    case "start-altitude-m":
      return { start: { altitudeM: cA(e, A) } };
    case "start-heading-deg":
      return { start: { headingDeg: cA(e, A) } };
    case "start-speed-mps":
      return { start: { speedMps: cA(e, A) } };
    case "camera-mode":
      return P !== "cockpit" && P !== "chase" && vA(A, P, '"chase" or "cockpit"'), { camera: { mode: P } };
    case "power-mode":
      return P !== "slow" && P !== "normal" && P !== "turbo" && vA(A, P, '"slow", "normal", or "turbo"'), { powerMode: P };
    case "sensitivity":
      return { controls: { sensitivity: cA(e, A) } };
    case "fov-deg":
      return { camera: { fovDeg: cA(e, A) } };
    case "invert-pitch-disabled":
      return { controls: { invertPitch: !1 } };
    case "camera-roll-disabled":
      return { camera: { bankedViewport: !1 } };
    case "keyboard-disabled":
      return { controls: { keyboard: !1 } };
    case "gamepad-disabled":
      return { controls: { gamepad: !1 } };
    case "capture-scene-navigation-disabled":
      return { controls: { captureSceneNavigation: !1 } };
    case "auto-start-disabled":
      return { autoStart: !1 };
    case "show-controls":
      return { ui: { enabled: !0 } };
    case "joystick":
      return P !== "auto" && P !== "always" && P !== "never" && vA(A, P, '"auto", "always", or "never"'), { ui: { joystick: P } };
    case "joystick-position":
      return HA(P) || vA(A, P, "a documented ArcGIS scene slot"), { ui: { joystickPosition: P } };
    case "show-speed":
      return { ui: { showSpeed: !0 } };
    case "ui-position":
      return HA(P) || vA(A, P, "a documented ArcGIS scene slot"), { ui: { position: P } };
    case "ui-controls": {
      const t = P.split(/[\s,]+/).filter(Boolean), s = pP(t);
      return s.length !== new Set(t).size && vA(A, P, "power, pause, camera, and/or recover"), {
        ui: {
          controls: s
        }
      };
    }
    case "locale": {
      if (P === "auto") return { ui: { locale: "auto" } };
      const t = qA(P);
      return t || vA(A, P, '"auto", "en", "de", "fr", "it", or "es"'), { ui: { locale: t } };
    }
    default:
      return {};
  }
}
function Qi(e, A, P) {
  return A === "start-longitude" || A === "start-latitude" ? Ii(e, A, P) : e.hasAttribute(A) ? pi(e, A) : Ti(A);
}
function Ti(e) {
  const A = IP;
  switch (e) {
    case "start-longitude":
      return { start: { longitude: void 0 } };
    case "start-latitude":
      return { start: { latitude: void 0 } };
    case "start-altitude-m":
      return { start: { altitudeM: void 0 } };
    case "start-heading-deg":
      return { start: { headingDeg: void 0 } };
    case "start-speed-mps":
      return { start: { speedMps: A.start.speedMps } };
    case "camera-mode":
      return { camera: { mode: A.camera.mode } };
    case "power-mode":
      return { powerMode: A.powerMode };
    case "sensitivity":
      return { controls: { sensitivity: A.controls.sensitivity } };
    case "fov-deg":
      return { camera: { fovDeg: A.camera.fovDeg } };
    case "invert-pitch-disabled":
      return { controls: { invertPitch: A.controls.invertPitch } };
    case "camera-roll-disabled":
      return { camera: { bankedViewport: A.camera.bankedViewport } };
    case "keyboard-disabled":
      return { controls: { keyboard: A.controls.keyboard } };
    case "gamepad-disabled":
      return { controls: { gamepad: A.controls.gamepad } };
    case "capture-scene-navigation-disabled":
      return {
        controls: {
          captureSceneNavigation: A.controls.captureSceneNavigation
        }
      };
    case "show-controls":
      return { ui: { enabled: A.ui.enabled } };
    case "joystick":
      return { ui: { joystick: A.ui.joystick } };
    case "joystick-position":
      return { ui: { joystickPosition: A.ui.joystickPosition } };
    case "ui-position":
      return { ui: { position: A.ui.position } };
    case "ui-controls":
      return { ui: { controls: A.ui.controls } };
    case "show-speed":
      return { ui: { showSpeed: A.ui.showSpeed } };
    case "locale":
      return { ui: { locale: A.ui.locale } };
    case "auto-start-disabled":
      return { autoStart: A.autoStart };
    default:
      return {};
  }
}
function Li(e, A) {
  return JSON.stringify(e.flight) !== JSON.stringify(A.flight) || JSON.stringify(e.assets) !== JSON.stringify(A.assets) || JSON.stringify(e.start) !== JSON.stringify(A.start) || e.terrain.enabled !== A.terrain.enabled || e.terrain.minimumClearanceM !== A.terrain.minimumClearanceM || e.terrain.maximumAglM !== A.terrain.maximumAglM || e.controls.captureSceneNavigation !== A.controls.captureSceneNavigation || e.camera.submissionHz !== A.camera.submissionHz || e.autoStart !== A.autoStart;
}
const oP = "The referenced arcgis-scene encountered a content or rendering error.";
function bi(e) {
  if (!e || typeof e != "object")
    return new Error(oP);
  const A = e, P = typeof A.message == "string" && A.message.trim() ? A.message : oP, t = new Error(P, { cause: e });
  return typeof A.name == "string" && A.name.trim() && (t.name = A.name), t;
}
function Vi(e) {
  return e.ready ? e.transitionPending || e.identityChanged ? "restart" : "ignore" : e.transitionPending ? "ignore" : "teardown";
}
const rP = "arcgis-plane-navigation";
class RA extends Error {
  /** Preserve why the pending operation was cancelled for the public start promise. */
  constructor(P) {
    super(P === "disconnected" ? "Plane navigation was disconnected before it could start." : P === "stopped" ? "Plane navigation was stopped before it could start." : "Plane navigation initialization was superseded.");
    w(this, "name", "AbortError");
    this.kind = P;
  }
}
function ce(e, A) {
  return new Promise((P, t) => {
    const s = () => {
      t(A.reason);
    };
    if (A.aborted) {
      t(A.reason);
      return;
    }
    A.addEventListener("abort", s, { once: !0 }), Promise.resolve(e).then(
      (i) => {
        A.removeEventListener("abort", s), !A.aborted && P(i);
      },
      (i) => {
        A.removeEventListener("abort", s), !A.aborted && t(i);
      }
    );
  });
}
function LP(e) {
  if (e !== "chase" && e !== "cockpit")
    throw new TypeError(`Unsupported camera mode: ${String(e)}.`);
}
function bP(e) {
  if (!Me(e))
    throw new TypeError(`Unsupported power mode: ${String(e)}.`);
}
function le(e) {
  var A;
  ((A = e.camera) == null ? void 0 : A.mode) !== void 0 && LP(e.camera.mode), e.powerMode !== void 0 && bP(e.powerMode);
}
class VP extends HTMLElement {
  constructor() {
    super(...arguments);
    w(this, "explicitReference", null);
    w(this, "explicitView", null);
    w(this, "sessionHost", null);
    w(this, "configState", bA());
    w(this, "attributeErrors", /* @__PURE__ */ new Map());
    w(this, "session", null);
    w(this, "aircraftRequest", 0);
    w(this, "operation", null);
    w(this, "statusState", "idle");
    w(this, "controlsOverlay", null);
    w(this, "controlsOverlayHost", null);
    w(this, "controlsOverlayPosition", null);
    w(this, "joystickOverlay", null);
    w(this, "joystickHost", null);
    w(this, "joystickPosition", null);
    w(this, "touchMedia", null);
    /** Keep automatic joystick visibility in sync with coarse-pointer media changes. */
    w(this, "onTouchMediaChange", () => {
      this.syncControlsUi(this.sessionHost, this.configState, this.snapshot());
    });
    w(this, "sceneBinding", null);
    w(this, "localeChangeHandle", null);
    /** Teardown or restart when the referenced scene's ready state or identity changes. */
    w(this, "onSceneReadyChange", () => {
      const P = this.sceneBinding;
      if (!P || !this.isConnected) return;
      const { scene: t } = P, s = t.map ?? null, i = t.view ?? null, r = s !== P.map || i !== P.view, a = Vi({
        ready: t.ready,
        transitionPending: P.transitionPending,
        identityChanged: r
      });
      if (a === "teardown") {
        P.transitionPending = !0, this.cancelOperation("superseded", !r), this.destroySession(!r), this.setStatus("loading");
        return;
      }
      a !== "ignore" && (P.transitionPending = !1, P.map = s, P.view = i, !(this.statusState === "loading" && this.operation) && this.beginInitialization(!1));
    });
    /** Convert an ArcGIS fatal scene error, cancel pending work and publish the failure. */
    w(this, "onSceneReadyError", () => {
      const P = this.sceneBinding;
      if (!P || !this.isConnected) return;
      const { scene: t } = P, s = bi(t.fatalError), i = this.operation;
      i && (this.operation = null, i.controller.signal.aborted || i.controller.abort(s));
      const r = (t.map ?? null) !== P.map || (t.view ?? null) !== P.view;
      P.transitionPending = !0, this.destroySession(!r), this.reportError(s);
    });
  }
  /** Current initialization/session phase; also mirrored to the `status` attribute. */
  get status() {
    return this.statusState;
  }
  /** Caller-owned 3D SceneView assigned for direct-view integration, if any. */
  get view() {
    return this.explicitView;
  }
  /**
   * Assign a caller-owned 3D SceneView, taking precedence over scene references.
   * Replaces the active flight session when connected; the view itself is retained.
   * @throws {TypeError} If a non-3D view is supplied.
   */
  set view(P) {
    if (P !== this.explicitView) {
      if (P !== null && P.type !== "3d")
        throw new TypeError("Plane navigation view must be an ArcGIS SceneView (type 3d).");
      this.explicitView = P, this.unbindSceneReadyChange(), this.isConnected && this.beginInitialization();
    }
  }
  /** Scene element reference selected explicitly or resolved from `reference-element`. */
  get referenceElement() {
    return this.explicitReference ?? this.resolveReferenceFromAttribute();
  }
  /**
   * Assign a caller-owned scene element. An explicit reference takes precedence
   * over `reference-element`, and a direct `view` takes precedence over both.
   */
  set referenceElement(P) {
    const t = this.referenceElement;
    this.explicitReference = P, !(this.referenceElement === t || this.explicitView) && (this.unbindSceneReadyChange(), this.isConnected && this.beginInitialization());
  }
  /** Return a normalized copy of the effective configuration. */
  get config() {
    return bA(this.configState);
  }
  /**
   * Merge programmatic settings into the current configuration.
   *
   * While running, restart-required fields reinitialize the hosted session;
   * live presentation/control values are applied without replacing it.
   */
  set config(P) {
    const t = P ?? {};
    if (this.isConnected && this.session) {
      this.updateConfig(t);
      return;
    }
    le(t), this.configState = DA(this.configState, t), this.isConnected && this.beginInitialization();
  }
  /** Attach listeners and begin initialization when the custom element enters the document. */
  connectedCallback() {
    var P, t;
    this.touchMedia = ((P = this.ownerDocument.defaultView) == null ? void 0 : P.matchMedia("(any-pointer: coarse)")) ?? null, (t = this.touchMedia) == null || t.addEventListener("change", this.onTouchMediaChange), this.beginInitialization();
  }
  /** Cancel pending initialization and release overlays/session resources on removal. */
  disconnectedCallback() {
    var P;
    (P = this.touchMedia) == null || P.removeEventListener("change", this.onTouchMediaChange), this.touchMedia = null, this.cancelOperation("disconnected", !0), this.unbindSceneReadyChange(), this.unbindLocaleChange(), this.destroySession(!0), this.setStatus("idle");
  }
  /**
   * Parse an observed attribute and apply its patch live or restart as needed.
   * Malformed attributes are retained as startup errors so the element can
   * recover when their values change.
   */
  attributeChangedCallback(P, t, s) {
    if (t !== s) {
      if (P === "reference-element") {
        if (this.explicitReference !== null || this.explicitView !== null) return;
        this.unbindSceneReadyChange(), this.isConnected && this.beginInitialization();
        return;
      }
      try {
        const i = P === "start-longitude" || P === "start-latitude", r = Qi(
          this,
          P,
          this.configState
        ), a = DA(
          this.configState,
          r
        );
        if (this.attributeErrors.delete(P), i && (this.attributeErrors.delete("start-longitude"), this.attributeErrors.delete("start-latitude")), !this.isConnected) {
          this.configState = a;
          return;
        }
        if (!this.session) {
          this.configState = a, this.beginInitialization();
          return;
        }
        this.updateConfig(a);
      } catch (i) {
        this.attributeErrors.set(
          P,
          i instanceof Error ? i : new Error(String(i))
        ), this.isConnected && this.beginInitialization();
      }
    }
  }
  /**
   * Start or await the current initialization, then start the active flight session.
   *
   * Superseded initialization is followed until the newest scene/config is ready;
   * explicit stop, disconnect, and real startup errors reject the returned promise.
   *
   * @returns A promise that resolves once the current session has started.
   */
  async start() {
    if (!this.isConnected)
      throw new Error("Plane navigation must be connected before it can start.");
    for (Ge(); ; ) {
      const P = this.session;
      if (P) {
        const s = this.operation;
        if (P.start(), this.session === P) {
          this.setStatusFromSession(P);
          return;
        }
        const i = s == null ? void 0 : s.controller.signal.reason;
        if (i instanceof RA && i.kind === "superseded") continue;
        throw i instanceof Error ? i : new Error("Plane navigation was stopped before it could start.");
      }
      let t = this.operation;
      if (!t) {
        const s = this.resolveReferenceTarget();
        if (s instanceof Error) throw s;
        if (!s)
          throw new Error(
            "Plane navigation requires view, referenceElement, or a reference-element attribute before it can start."
          );
        t = this.beginInitialization();
      }
      if (t)
        try {
          await t.promise;
        } catch (s) {
          if (s instanceof RA && s.kind === "superseded" && this.isConnected) continue;
          throw s;
        }
    }
  }
  /** Pause the current flight session and reflect the paused state. */
  pause() {
    var P, t;
    (P = this.session) == null || P.pause(), ((t = this.session) == null ? void 0 : t.phase) === "paused" && this.setStatus("paused");
  }
  /** Resume the current session when it is paused. */
  resume() {
    var P, t;
    (P = this.session) == null || P.resume(), ((t = this.session) == null ? void 0 : t.phase) === "running" && this.setStatus("running");
  }
  /**
   * Stop initialization or the active flight and dispatch a stopped event.
   *
   * @param options Set `restoreCamera` false to leave the latest submitted camera attached.
   */
  stop(P = {}) {
    const t = P.restoreCamera !== !1;
    this.cancelOperation("stopped", t), this.unbindSceneReadyChange(), this.unbindLocaleChange(), this.destroySession(t), this.setStatus("idle"), this.dispatchEvent(new CustomEvent(
      "arcgisPlaneNavigationStopped",
      {
        detail: { restoredCamera: t },
        bubbles: !0,
        composed: !0
      }
    ));
  }
  /** Ask the active session to recover its aircraft state, if one exists. */
  recover() {
    var P;
    (P = this.session) == null || P.recover();
  }
  /**
   * Switch between chase and cockpit views, applying it live when possible.
   * @param mode Supported target camera mode.
   * @param instant Skip the session's camera transition when true.
   * @throws {TypeError} If the mode is unsupported.
   */
  setCameraMode(P, t = !1) {
    LP(P), this.applyConfigUpdate(
      { camera: { mode: P } },
      { instantCamera: t }
    );
  }
  /** Apply a supported power mode and synchronize configuration and UI state. */
  setPowerMode(P) {
    bP(P), this.applyConfigUpdate({ powerMode: P });
  }
  /** Toggle turbo and return whether it is active; return false without a session. */
  toggleTurbo() {
    const P = this.session;
    return P ? (P.toggleTurbo(), this.session !== P ? !1 : (this.configState = DA(this.configState, {
      powerMode: P.powerMode
    }), P.powerMode === "turbo")) : (this.configState = DA(this.configState, {
      powerMode: "normal"
    }), !1);
  }
  /** Merge a partial configuration, restarting only for session-captured settings. */
  updateConfig(P) {
    this.applyConfigUpdate(P);
  }
  /**
   * Select/load aircraft assets and flight tuning without recreating the scene.
   *
   * Requests are sequenced so a slower stale load cannot replace a later choice.
   *
   * @param patch Aircraft, assets and terrain fields to merge into the config.
   * @returns Whether the requested aircraft became active in the current session.
   */
  async setAircraft(P) {
    var o, n;
    le(P);
    const t = this.configState;
    let s = bA(
      DA(t, P)
    );
    const i = this.session;
    if (!i)
      return this.configState = s, this.isConnected && this.beginInitialization(), !1;
    ((o = t.flight) == null ? void 0 : o.model) !== ((n = s.flight) == null ? void 0 : n.model) && s.powerMode !== "normal" && (s = DA(s, { powerMode: "normal" }));
    const a = ++this.aircraftRequest;
    this.setStatus("loading");
    try {
      if (!await i.setAircraft(s) || a !== this.aircraftRequest || this.session !== i) return !1;
      this.configState = s;
      const g = i.snapshot(), u = this.sessionHost;
      return u && (this.publishSessionSnapshot(u, i, g), this.syncControlsUi(u, s, g)), this.setStatusFromSession(i), !0;
    } catch (D) {
      throw a === this.aircraftRequest && this.session === i && this.setStatusFromSession(i), D;
    }
  }
  /** Apply a patch live where possible, otherwise store it and restart initialization. */
  applyConfigUpdate(P, t = {}) {
    le(P);
    const s = this.configState, i = DA(s, P), r = Li(s, i);
    if (!this.session || r) {
      this.configState = i, this.isConnected && this.beginInitialization();
      return;
    }
    const a = this.session;
    (s.controls.sensitivity !== i.controls.sensitivity || s.controls.invertPitch !== i.controls.invertPitch || s.controls.keyboard !== i.controls.keyboard || s.controls.gamepad !== i.controls.gamepad || s.camera.fovDeg !== i.camera.fovDeg || s.camera.mode !== i.camera.mode || s.camera.bankedViewport !== i.camera.bankedViewport || s.powerMode !== i.powerMode || t.instantCamera) && a.applyLiveConfig(i, t), this.configState = i;
    const n = a.snapshot(), D = s.camera.mode !== i.camera.mode || s.powerMode !== i.powerMode || t.instantCamera === !0, g = this.sessionHost;
    if (D && g) {
      this.publishSessionSnapshot(
        g,
        a,
        n
      );
      return;
    }
    this.syncControlsUi(g, i, n);
  }
  /** Set temporary control axes/buttons on the active session, if present. */
  setControlPatch(P) {
    var t;
    (t = this.session) == null || t.setControlPatch(P);
  }
  /** Clear temporary control overrides on the active session, optionally by field. */
  clearControlPatch(P) {
    var t;
    (t = this.session) == null || t.clearControlPatch(P);
  }
  /** Return the current flight snapshot, or `null` before a session exists. */
  snapshot() {
    var P;
    return ((P = this.session) == null ? void 0 : P.snapshot()) ?? null;
  }
  /** Return controller/host diagnostics, or `null` before a session exists. */
  debugSnapshot() {
    var P;
    return ((P = this.session) == null ? void 0 : P.debugSnapshot()) ?? null;
  }
  /** Cancel any prior attempt and create an operation for the currently selected host/config. */
  beginInitialization(P = !0) {
    this.bindLocaleChange(), this.cancelOperation("superseded", P), this.destroySession(P);
    const t = this.resolveReferenceTarget();
    if (!t && this.attributeErrors.size === 0)
      return this.setStatus("idle"), null;
    try {
      Ge();
    } catch (i) {
      return this.reportError(i), null;
    }
    const s = {
      controller: new AbortController(),
      promise: Promise.resolve(),
      restoreCamera: P
    };
    return this.operation = s, this.setStatus("loading"), s.promise = this.initializeOperation(s, t), s.promise.catch(() => {
    }), s;
  }
  /** Resolve the host, initialize its scene, create the session and emit the ready event. */
  async initializeOperation(P, t) {
    try {
      const s = this.attributeErrors.values().next().value;
      if (s) throw s;
      if (t instanceof Error) throw t;
      if (!t) return;
      const i = "tagName" in t ? lP(t) : At(t), r = i.scene, a = P.controller.signal;
      r && await ce(customElements.whenDefined("arcgis-scene"), a), await ce(i.whenReady(), a), this.assertCurrentOperation(P), r && this.bindSceneReadyChange(r);
      const o = bA(this.configState);
      this.configState = o;
      const n = await ce(
        di(
          i,
          o,
          {
            signal: a,
            restoreCameraOnAbort: () => P.restoreCamera
          }
        ),
        a
      );
      this.assertCurrentOperation(P);
      let D;
      try {
        D = new $t({
          scene: n,
          config: o,
          onSnapshot: (u) => {
            this.publishSessionSnapshot(i, D, u);
          }
        });
      } catch (u) {
        throw n.destroy(), u;
      }
      if (this.assertCurrentOperation(P), this.session = D, this.sessionHost = i, D.initialize(), !this.publishSessionSnapshot(
        i,
        D,
        D.snapshot()
      )) throw this.operationError(P);
      if (o.autoStart && D.phase === "ready" && (D.start(), !this.ownsSession(P, D)))
        throw this.operationError(P);
      this.setStatusFromSession(D);
      const g = D.snapshot();
      this.syncControlsUi(i, this.configState, g), this.dispatchEvent(new CustomEvent(
        "arcgisPlaneNavigationReady",
        {
          detail: { scene: r, view: i.view, snapshot: g },
          bubbles: !0,
          composed: !0
        }
      ));
    } catch (s) {
      throw this.operation !== P ? this.operationError(P, s) : (this.destroySession(!0), this.reportError(s));
    }
  }
  /** Subscribe to ArcGIS locale changes while automatic UI localization is active. */
  bindLocaleChange() {
    this.localeChangeHandle || (this.localeChangeHandle = fP(() => {
      this.configState.ui.locale === "auto" && this.syncControlsUi(
        this.sessionHost,
        this.configState,
        this.snapshot()
      );
    }));
  }
  /** Remove the global ArcGIS locale subscription. */
  unbindLocaleChange() {
    var P;
    (P = this.localeChangeHandle) == null || P.remove(), this.localeChangeHandle = null;
  }
  /** Track map/view identity and readiness events for an ArcGIS scene element. */
  bindSceneReadyChange(P) {
    var t;
    ((t = this.sceneBinding) == null ? void 0 : t.scene) !== P && (this.unbindSceneReadyChange(), P.addEventListener("arcgisViewReadyChange", this.onSceneReadyChange), P.addEventListener("arcgisViewReadyError", this.onSceneReadyError)), this.sceneBinding = {
      scene: P,
      map: P.map ?? null,
      view: P.view ?? null,
      transitionPending: !1
    };
  }
  /** Detach readiness/error listeners and clear the active scene binding. */
  unbindSceneReadyChange() {
    var P, t;
    (P = this.sceneBinding) == null || P.scene.removeEventListener(
      "arcgisViewReadyChange",
      this.onSceneReadyChange
    ), (t = this.sceneBinding) == null || t.scene.removeEventListener(
      "arcgisViewReadyError",
      this.onSceneReadyError
    ), this.sceneBinding = null;
  }
  /** Set error status and emit the public error event using a normalized Error. */
  reportError(P) {
    const t = P instanceof Error ? P : new Error(String(P));
    return this.setStatus("error"), this.dispatchEvent(new CustomEvent(
      "arcgisPlaneNavigationError",
      { detail: { error: t }, bubbles: !0, composed: !0 }
    )), t;
  }
  /** Unmount overlays before destroying the session that owns their host UI. */
  destroySession(P) {
    this.unmountJoystick(), this.unmountControlsUi();
    const t = this.session;
    this.session = null, this.sessionHost = null, t == null || t.destroy({ restoreCamera: P });
  }
  /** Check that an async initialization still owns the active element/session pair. */
  ownsSession(P, t) {
    return this.isConnected && this.operation === P && this.session === t;
  }
  /** Invalidate and abort the current initialization with its specific cancellation reason. */
  cancelOperation(P, t) {
    const s = this.operation;
    s && (this.operation = null, s.restoreCamera = t, s.controller.signal.aborted || s.controller.abort(new RA(P)));
  }
  /** Throw when the operation completed after disconnect or was replaced by a newer one. */
  assertCurrentOperation(P) {
    if (!this.isConnected || this.operation !== P)
      throw this.operationError(P);
  }
  /** Select the original abort/error reason to reject a stale initialization with. */
  operationError(P, t) {
    const s = P.controller.signal.reason;
    return s instanceof Error ? s : t instanceof Error ? t : new RA("superseded");
  }
  /** Mirror the active session phase into the custom-element status. */
  setStatusFromSession(P) {
    P.phase === "running" ? this.setStatus("running") : P.phase === "paused" ? this.setStatus("paused") : this.setStatus("ready");
  }
  /** Update status/UI and dispatch a snapshot only while this session remains current. */
  publishSessionSnapshot(P, t, s) {
    return !this.isConnected || this.session !== t ? !1 : (s.phase === "running" ? this.setStatus("running") : s.phase === "paused" && this.setStatus("paused"), this.syncControlsUi(P, this.configState, s), this.dispatchEvent(new CustomEvent(
      "arcgisPlaneNavigationSnapshot",
      {
        detail: { snapshot: s },
        bubbles: !0,
        composed: !0
      }
    )), this.isConnected && this.session === t);
  }
  /** Mount/update toolbar and joystick overlays according to config, locale, host and phase. */
  syncControlsUi(P, t, s) {
    var l, C, d;
    const i = t.ui.joystick === "always" || t.ui.joystick === "auto" && ((l = this.touchMedia) == null ? void 0 : l.matches) === !0;
    if (!P || !t.ui.enabled && !i) {
      this.unmountJoystick(), this.unmountControlsUi();
      return;
    }
    const r = this.ownerDocument.defaultView, a = this.getAttribute("locale") ?? t.ui.locale, o = UP(), n = {
      locale: a === "auto" ? o : a,
      documentLanguage: ((C = this.closest("[lang]")) == null ? void 0 : C.getAttribute("lang")) ?? this.ownerDocument.documentElement.lang,
      navigatorLanguages: (r == null ? void 0 : r.navigator.languages) ?? [],
      navigatorLanguage: (r == null ? void 0 : r.navigator.language) ?? null,
      intlLocale: o
    }, D = Mt(n), g = ht(n);
    if (i ? (this.joystickOverlay ?? (this.joystickOverlay = new Ei(
      this.ownerDocument,
      (M, c) => {
        var j;
        return (j = this.session) == null ? void 0 : j.setTouchStick(M, c);
      }
    )), (this.joystickHost !== P || this.joystickPosition !== t.ui.joystickPosition) && (this.joystickOverlay.reset(), (d = this.joystickHost) == null || d.unmountControls(this.joystickOverlay.element), P.mountControls(this.joystickOverlay.element, t.ui.joystickPosition), this.joystickHost = P, this.joystickPosition = t.ui.joystickPosition), this.joystickOverlay.update((s == null ? void 0 : s.phase) === "running", D)) : this.unmountJoystick(), !t.ui.enabled) {
      this.unmountControlsUi();
      return;
    }
    this.controlsOverlay || (this.controlsOverlay = new mi(
      this.ownerDocument,
      t.ui,
      D,
      g,
      {
        setPowerMode: (M) => this.setPowerMode(M),
        togglePause: () => {
          var M, c;
          ((M = this.session) == null ? void 0 : M.phase) === "paused" ? this.resume() : ((c = this.session) == null ? void 0 : c.phase) === "ready" ? this.start() : this.pause();
        },
        setCameraMode: (M) => this.setCameraMode(M),
        recover: () => this.recover()
      }
    )), (this.controlsOverlayHost !== P || this.controlsOverlayPosition !== t.ui.position) && this.controlsOverlayHost && (this.controlsOverlayHost.unmountControls(this.controlsOverlay.element), this.controlsOverlayHost = null, this.controlsOverlayPosition = null), this.controlsOverlay.update(t.ui, D, g, s), this.controlsOverlayHost || (P.mountControls(this.controlsOverlay.element, t.ui.position), this.controlsOverlayHost = P, this.controlsOverlayPosition = t.ui.position);
  }
  /** Detach and destroy the toolbar overlay. */
  unmountControlsUi() {
    var t;
    const P = this.controlsOverlay;
    P && ((t = this.controlsOverlayHost) == null || t.unmountControls(P.element), P.destroy(), this.controlsOverlay = null, this.controlsOverlayHost = null, this.controlsOverlayPosition = null);
  }
  /** Detach and destroy the touch joystick overlay. */
  unmountJoystick() {
    var P;
    this.joystickOverlay && ((P = this.joystickHost) == null || P.unmountControls(this.joystickOverlay.element), this.joystickOverlay.destroy(), this.joystickOverlay = null, this.joystickHost = null, this.joystickPosition = null);
  }
  /** Update both internal status state and its observable DOM attribute. */
  setStatus(P) {
    this.statusState = P, this.setAttribute("status", P);
  }
  /** Resolve a scene custom element by the declarative `reference-element` ID if present. */
  resolveReferenceFromAttribute() {
    var s;
    const P = (s = this.getAttribute("reference-element")) == null ? void 0 : s.trim();
    if (!P) return null;
    const t = this.ownerDocument.getElementById(P);
    return (t == null ? void 0 : t.tagName.toLowerCase()) === "arcgis-scene" ? t : null;
  }
  /**
   * Resolve explicit view/scene references or validate the declarative element ID.
   *
   * Returning an Error keeps invalid references distinct from the absence of a target.
   */
  resolveReferenceTarget() {
    var i;
    if (this.explicitView) return this.explicitView;
    if (this.explicitReference)
      return ((i = this.explicitReference.tagName) == null ? void 0 : i.toLowerCase()) === "arcgis-scene" ? this.explicitReference : new Error("referenceElement must be an <arcgis-scene> element.");
    const P = this.getAttribute("reference-element");
    if (P === null) return null;
    const t = P.trim();
    if (!t)
      return new Error(
        "reference-element must contain the id of an <arcgis-scene> element."
      );
    const s = this.ownerDocument.getElementById(t);
    return s ? s.tagName.toLowerCase() !== "arcgis-scene" ? new Error(
      `reference-element="${t}" must reference an <arcgis-scene>; found <${s.tagName.toLowerCase()}>.`
    ) : s : new Error(
      `reference-element="${t}" did not match an element in this document.`
    );
  }
}
/** Declarative attributes parsed and watched by the custom element. */
w(VP, "observedAttributes", ji);
customElements.get(rP) || customElements.define(
  rP,
  VP
);
export {
  tA as AIRCRAFT_FLIGHT_PROFILES,
  rP as ARCGIS_PLANE_NAVIGATION_TAG,
  VP as ArcgisPlaneNavigationElement,
  bt as DEFAULT_AIRCRAFT_ASSETS,
  MP as DEFAULT_FLIGHT_LOCALE,
  IP as DEFAULT_PLANE_NAVIGATION_CONFIG,
  Hi as FLIGHT_LANGUAGE_NAMES,
  ut as FLIGHT_MESSAGES,
  jP as PLANE_NAVIGATION_UI_CONTROLS,
  Lt as PLANE_NAVIGATION_UI_POSITIONS,
  Dt as SUPPORTED_FLIGHT_LOCALES,
  Xi as createFlightTranslator,
  ht as detectFlightFormatLocale,
  Mt as detectFlightLocale,
  jt as flightCameraModeActionLabel,
  Et as flightCameraModeLabel,
  zt as flightPowerModeActionLabel,
  Wi as flightPowerModeAriaLabel,
  Re as flightPowerModeLabel,
  ee as flightText,
  Vt as isPlaneNavigationUiControl,
  HA as isPlaneNavigationUiPosition,
  DA as mergePlaneNavigationConfig,
  bA as normalizePlaneNavigationConfig,
  pP as normalizePlaneNavigationUiControls,
  Ct as resolveFlightFormatLocale,
  dt as resolveFlightLocale,
  qA as supportedFlightLocale,
  iA as translateFlightMessage
};
