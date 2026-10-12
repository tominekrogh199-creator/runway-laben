// ================= Runway gait engine v2 =================
// Pure functions: a footstep planner, a pose evaluator and bone frames for
// skinning. pose(t) is a deterministic function of time, so playback can be
// slowed, scrubbed and sampled backwards for trails.
// Coordinates: x = model's left, y = up, z = forward (at heading 0).

const UP = { x: 0, y: 1, z: 0 };
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const axpy = (a, v, s) => ({ x: a.x + v.x * s, y: a.y + v.y * s, z: a.z + v.z * s });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const vlen = a => Math.hypot(a.x, a.y, a.z);
const norm = a => { const l = vlen(a) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
const lerp3 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
const V = (x, y, z) => ({ x, y, z });
const fwd = p => ({ x: Math.sin(p), y: 0, z: Math.cos(p) });
const leftV = p => ({ x: Math.cos(p), y: 0, z: -Math.sin(p) });
const rightV = p => ({ x: -Math.cos(p), y: 0, z: Math.sin(p) });
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const minJerk = s => s * s * s * (10 - 15 * s + 6 * s * s);
const TAU = Math.PI * 2;
// rotation about +x (left axis): positive angle tips forward (+z) downward
function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }; }
function rotY(p, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c }; }

function smin(a, b, k) {
  const m = Math.min(a, b);
  return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k));
}
function alphaFn(t, t0) { if (t <= 0) return 0; const x = t / t0; return x * Math.exp(1 - x); }
function dampOsc(t, tau, per) { if (t <= 0) return 0; return Math.exp(-t / tau) * Math.sin(TAU * t / per); }
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeNoise(seed) {
  const r = mulberry32(seed); const v = [];
  for (let i = 0; i < 256; i++) v.push(r() * 2 - 1);
  return t => {
    const i = Math.floor(t), f = t - i;
    const a = v[((i % 256) + 256) % 256], b = v[(((i + 1) % 256) + 256) % 256];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}
function bsearch(arr, t) {
  let lo = 0, hi = arr.length - 1;
  if (t < arr[0]) return 0;
  if (t >= arr[hi]) return hi;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] <= t) lo = m; else hi = m; }
  return lo;
}
// cubic Hermite (non-uniform Catmull-Rom)
function herm(ts, vs, t) {
  let i = bsearch(ts, t);
  if (i < 1) i = 1; if (i > ts.length - 3) i = ts.length - 3;
  const t0 = ts[i], t1 = ts[i + 1], h = t1 - t0, u = (t - t0) / h;
  const m0 = (vs[i + 1] - vs[i - 1]) / (ts[i + 1] - ts[i - 1]) * h;
  const m1 = (vs[i + 2] - vs[i]) / (ts[i + 2] - ts[i]) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * m1;
}

// ---------- body geometry ----------
const G = {
  L1: 0.46, L2: 0.43, hipW: 0.085, shW: 0.165, ua: 0.31, fa: 0.255, handC: 0.085,
  ankleH: 0.072, lumbar: 0.10, chest: 0.27, neck: 0.44, shDrop: 0.06,
  neckLen: 0.075, headUp: 0.085, headFwd: 0.01,
};
G.restRoot = G.ankleH + G.L1 + G.L2;
// foot anatomy relative to the ankle joint (barefoot standing)
const FOOT = {
  ball: V(0, -0.072, 0.125),   // ground contact under the metatarsal heads
  mtp: V(0, -0.05, 0.125),     // toe joint
  heel: V(0, -0.072, -0.035),  // heel contact
};
// ponytail chain in head space (relative to head centre; x = left, y = up, z = forward)
const PONY = [V(0, 0.074, -0.078), V(0, 0.032, -0.122), V(0, -0.045, -0.13), V(0, -0.125, -0.118), V(0, -0.19, -0.112)];

// shoe frame: origin on the ground, sole plane y = 0, ball contact at z = 0.125
function makeShoe(kind) {
  const heel = kind === 'heel';
  const ts = 0.008, alpha = heel ? 0.56 : 0;
  const Bc = V(0, ts, 0.125);
  const A = add(Bc, rotX(mul(FOOT.ball, -1), alpha));
  const M = add(A, rotX(FOOT.mtp, alpha));
  const heelPt = add(Bc, rotX(sub(FOOT.heel, FOOT.ball), alpha));
  return {
    kind, heel, alpha, ts, A, M, heelPt,
    B: V(0, 0, M.z),
    H: heel ? V(0, 0, heelPt.z - 0.008) : V(0, 0, -0.05),
    toe: heel ? V(0, 0.012, 0.228) : V(0, 0.012, 0.205),
    ac: heel ? 0.07 : 0.22, aoff: heel ? -0.85 : -0.8, maxBend: heel ? 0.55 : 0.85, swingLift: heel ? 0.03 : 0.1,
  };
}
const SHOES = { flat: makeShoe('flat'), heel: makeShoe('heel') };

// swing-leg keyframes (s = swing phase): thigh angle from vertical, knee flexion (radians)
const SW = (() => {
  const k = [[-0.2, -16, 30], [0, -11, 40], [0.15, -1, 56], [0.3, 11, 63], [0.45, 21, 53], [0.6, 26, 33], [0.75, 27, 14], [0.9, 25, 5], [1, 24, 3], [1.2, 22, 2]];
  return { s: k.map(x => x[0]), th: k.map(x => x[1] * Math.PI / 180), ka: k.map(x => x[2] * Math.PI / 180) };
})();

// ---------- styles ----------
const BASE = {
  seed: 7, cadence: 1.85, stepLen: 0.64, width: 0.028, ds: 0.07, clearance: 0.05,
  bob: 0.004, smoothK: 0.014, sway: 0.022, lag: 0, midK: 0.5, brake: 0, legExt: 1.0,
  pelvisRot: 0.12, pelvisDrop: 0.065, pelvisTilt: 0, wobble: 0, hipThrow: 0, counter: 0.6, lean: 0.0,
  latComp: 0, counterSway: 0, retract: 0, protract: 0, shoulderLift: 0, shrug: 0,
  armAmp: 0.13, armBase: -0.02, armAsym: 0, elbow: 0.18, elbowAmp: 0.14, abduct: 0.09, crossBody: 0,
  wristFlip: 0, wrist: 0.12, armLock: 0, armHold: 0, armLag: 0.07,
  valgus: 0, ankleRoll: 0, crouch: 0, kneeLift: 1, swingFK: 1,
  headPitch: 0.05, lookDown: 0, scan: 0, nod: 0, headLead: 0.15, stab: 0.8, shock: 0, neckFwd: 0,
  tempoJitter: 0, lenJitter: 0, dwell: 0.16, dwellAt: null,
  panic: 0, turn: 'pivot', slump: 0, rushAfter: 0, turnFlail: 0, turnLook: 0,
  heel: 1, toeOut: 0.06, stomp: 0, nSteps: 8, heelOff: 0.62,
  // standing
  standW: 0.6, standFwd: 0.09, standCross: 0.02, pelvisFwd: 0, breathe: 1,
};

const PRESETS = {
  sterk: {},
  kompetent: { dwell: 0.03, stab: 0.62, pelvisRot: 0.09, pelvisDrop: 0.05, counter: 0.35, armAmp: 0.22, headPitch: 0.08, turn: 'arc', headLead: 0.05, bob: 0.01, kneeLift: 0.85, legExt: 0.985, width: 0.04 },
  svak: {
    cadence: 1.9, tempoJitter: 0.2, lenJitter: 0.12, width: -0.005, lag: 0.15, latComp: 1.1, midK: 0.6, brake: 0.022,
    bob: 0.016, smoothK: 0.01, nod: 0.09, shock: 0.010, shoulderLift: 0.018, armAmp: 0.30, armAsym: 0.35, crossBody: 0.3,
    wristFlip: 0.45, abduct: 0.2, elbow: 0.32, elbowAmp: 0.3, valgus: 0.08, ankleRoll: 0.08, headPitch: 0.16, lookDown: 0.5,
    scan: 0.4, dwell: 0, wobble: 0.05, panic: 1, turn: 'messy', slump: 1, rushAfter: 1, turnFlail: 1, turnLook: 1, stab: 0.3,
    headLead: 0, seed: 13, kneeLift: 0.7, legExt: 0.975, lean: 0.03, pelvisRot: 0.08, counter: 0.3,
  },
  signatur: { cadence: 1.72, dwell: 0.28, counter: 0.95, pelvisRot: 0.15, sway: 0.026, armAmp: 0.14, stab: 0.9, stepLen: 0.63, kneeLift: 1.08 },
  hodeSvak: { nod: 0.16, shock: 0.016, stab: 0.15, bob: 0.018, smoothK: 0.006, midK: 0.6, dwell: 0, headPitch: 0.08, headLead: 0 },
  laast: { retract: 1, armLock: 0.75, shrug: 0.012, lean: -0.06, stab: 0.7, dwell: 0.06, pelvisRot: 0.07, counter: 0.2, pelvisTilt: 0.12 },
  foran: { lean: 0.17, headPitch: -0.03, stab: 0.5, dwell: 0.04, midK: 0.42, protract: 0.6 },
  wobble: { wobble: 0.16, pelvisDrop: 0.11, hipThrow: 0.012, lag: 0.05, latComp: 0.3, dwell: 0.06 },
  kneInn: { valgus: 0.26, ankleRoll: 0.2, width: 0.015, dwell: 0.04 },
  'knebøy': { crouch: 0.075, lean: 0.07, bob: 0.004, dwell: 0.02, headPitch: 0.1, stab: 0.5 },
  senVekt: { lag: 0.22, latComp: 1.5, shoulderLift: 0.008, dwell: 0, stab: 0.45, sway: 0.026 },
  overstride: { stepLen: 0.72, midK: 0.6, brake: 0.04, smoothK: 0.006, lean: -0.035, nod: 0.07, dwell: 0, cadence: 1.8, stab: 0.45 },
  kort: { stepLen: 0.46, cadence: 2.15, clearance: 0.04, dwell: 0.02, armAmp: 0.12, pelvisRot: 0.07, kneeLift: 0.8 },
  sterkFlat: { heel: 0, stepLen: 0.67 },
  lang: { stepLen: 0.78, midK: 0.56, brake: 0.025, lean: -0.04, smoothK: 0.008, dwell: 0 },
  tilfeldig: { tempoJitter: 0.16, lenJitter: 0.08, dwell: 0, seed: 21 },
  valgt: { dwell: 0 },
  mikro: { dwell: 0.32 },
  tempoRolig: { cadence: 1.55, stepLen: 0.60, dwell: 0.2 },
  tempoRask: { cadence: 2.15, stepLen: 0.68, dwell: 0.1 },
  sakteUsikker: {
    cadence: 1.4, stepLen: 0.5, tempoJitter: 0.08, dwell: 0.42, dwellAt: 0.08, brake: 0.02, lookDown: 0.35,
    headPitch: 0.12, armLock: 0.3, stab: 0.4, nod: 0.05, seed: 5, kneeLift: 0.75,
  },
  armLaast: { armLock: 1, shrug: 0.018, retract: 0.4 },
  armUro: { armAmp: 0.44, armAsym: 0.45, crossBody: 0.6, wristFlip: 0.85, abduct: 0.3, elbow: 0.5, elbowAmp: 0.45, shoulderLift: 0.016 },
  armKontroll: { armAmp: 0.13, elbow: 0.2, elbowAmp: 0.12, abduct: 0.09 },
  blikkNed: { headPitch: 0.42, scan: 0.7, lookDown: 0.6, stab: 0.45, headLead: 0 },
  stamp: {
    stomp: 1, shock: 0.03, nod: 0.16, shoulderLift: 0.035, armAmp: 0.3, wristFlip: 0.3, stab: 0.1, cadence: 2.0,
    stepLen: 0.68, brake: 0.02, dwell: 0, smoothK: 0.008,
  },
  perkusiv: { stomp: 1, cadence: 2.05, stepLen: 0.66, lean: 0.03, clearance: 0.065, dwell: 0.08, armAmp: 0.2, pelvisRot: 0.13, stab: 0.9, crouch: 0.012, smoothK: 0.03, kneeLift: 1.15 },
  glidende: { cadence: 1.62, dwell: 0.3, pelvisRot: 0.17, counter: 1.0, pelvisDrop: 0.075, sway: 0.028, armAmp: 0.15, stab: 0.9, stepLen: 0.62 },
  kopiGlid: {
    cadence: 1.55, wobble: 0.12, pelvisDrop: 0.15, hipThrow: 0.03, lean: -0.06, counterSway: 0.5, lag: 0.1, latComp: 0.6,
    armAmp: 0.12, stab: 0.4, nod: 0.04, dwell: 0.12, width: -0.02,
  },
  kopiPerk: {
    stomp: 1, cadence: 2.15, stepLen: 0.72, shock: 0.024, nod: 0.15, shoulderLift: 0.03, armAmp: 0.36, abduct: 0.2,
    wristFlip: 0.3, brake: 0.03, midK: 0.6, stab: 0.2, dwell: 0,
  },
  tightrope: { width: -0.045, hipThrow: 0.026, counterSway: 0.7, pelvisDrop: 0.13, latComp: 0.4, valgus: 0.08, dwell: 0.08 },
  korridor: {},
  bred: { width: 0.085, sway: 0.034, pelvisRot: 0.07, pelvisDrop: 0.03, toeOut: 0.14, heel: 0, dwell: 0, armAmp: 0.22, stepLen: 0.66, kneeLift: 0.85 },
  vendSvak: { panic: 1, turn: 'messy', turnFlail: 1, turnLook: 1, slump: 1, rushAfter: 1, lenJitter: 0.05 },
  vendPivot: { turn: 'pivot' },
  vendBue: { turn: 'arc' },
  middels: { from: 'kompetent', nod: 0.06, bob: 0.014, smoothK: 0.012, stab: 0.45, dwell: 0 },
  ctxCouture: { armAmp: 0.09, cadence: 1.62, dwell: 0.26, pelvisRot: 0.07, pelvisDrop: 0.05, stab: 0.92, headPitch: 0.03 },
  ctxUndertoy: { cadence: 1.68, dwell: 0.32, pelvisRot: 0.15, pelvisDrop: 0.075, armAmp: 0.15, counter: 0.7, stab: 0.9, sway: 0.026 },
  ctxMinimal: { armAmp: 0.07, pelvisRot: 0.06, pelvisDrop: 0.035, dwell: 0.12, cadence: 1.9, stab: 0.96, elbowAmp: 0.06 },
  ctxAvant: { cadence: 1.45, dwell: 0.42, dwellAt: 0.06, stomp: 1, armHold: 1, armAmp: 0.06, pelvisRot: 0.05, stab: 0.95, headPitch: -0.04 },
  ctxKommersiell: { armAmp: 0.26, cadence: 1.95, pelvisRot: 0.14, headPitch: 0.0, stepLen: 0.68, dwell: 0.1, elbowAmp: 0.26 },
  // standing postures
  standStablet: { standW: 0.65, armAmp: 0 },
  standMilitar: { standW: 0.1, retract: 1, lean: -0.1, pelvisTilt: 0.22, headPitch: -0.07, shrug: 0.01, armLock: 0.5 },
  standSvai: { standW: 0.2, pelvisFwd: 0.07, lean: -0.17, neckFwd: 0.3, headPitch: -0.04, pelvisTilt: -0.12 },
  standSammensunket: { standW: 0.3, lean: 0.18, protract: 1, neckFwd: 0.32, headPitch: 0.14, pelvisTilt: -0.14, crouch: 0.012 },
};

function resolvePreset(id, overrides) {
  const chain = [];
  let cur = id;
  while (cur && PRESETS[cur] && chain.length < 5) { chain.unshift(PRESETS[cur]); cur = PRESETS[cur].from; }
  const P = Object.assign({}, BASE);
  for (const c of chain) Object.assign(P, c);
  if (overrides) Object.assign(P, overrides);
  delete P.from;
  if (P.dwellAt == null) P.dwellAt = P.midK;
  return P;
}

// ---------- footstep planner ----------
// mode 'straight': endless straight walk. mode 'runway': out, turn, back, turn.
function makePlan(P, mode, shoe) {
  const az = shoe ? shoe.A.z : 0;   // put the ankle, not the shoe origin, on the path
  const rnd = mulberry32(P.seed);
  const nz = makeNoise(P.seed * 3 + 1);
  const T0 = 1 / P.cadence;
  const base = [];
  let c = { x: 0, y: 0, z: 0 }, psi = 0, side = 1, k = 0;

  const durOf = m => {
    let j = 0;
    if (P.tempoJitter) j = nz(k * 0.45) * 1.5 + (rnd() * 2 - 1) * 0.8;
    k++;
    return T0 * Math.max(0.55, 1 + P.tempoJitter * j) * m;
  };
  function pushStep(sd, cc, ps, w, arr, extra) {
    const yaw = ps - sd * P.toeOut;
    const O = axpy(axpy(cc, rightV(ps), sd * w), fwd(yaw), -az);
    base.push(Object.assign({ side: sd, O, yaw, yawEnd: yaw, c: { x: cc.x, y: 0, z: cc.z }, psi: ps, arr, sway: 1, slump: 0, turn: 0 }, extra || {}));
  }
  function straight(n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      let len = P.stepLen * (1 + P.lenJitter * (rnd() * 2 - 1));
      let m = 1;
      if (o.panic) { if (i === n - 1) { len *= 0.5; m *= 0.78; } else if (i === n - 2) { len *= 0.74; m *= 0.88; } }
      if (o.rush && i < 3) m *= 0.84;
      if (o.slump) { len *= 0.92; m *= 1.06; }
      c = axpy(c, fwd(psi), len);
      pushStep(side, c, psi, P.width, durOf(m), { slump: o.slump ? 1 : 0 });
      side = -side;
    }
  }
  function pivot() {
    const sd = side, d = sd === -1 ? 1 : -1;
    const L = P.stepLen;
    const c1 = axpy(c, fwd(psi), 0.34 * L);
    const O1 = axpy(axpy(c1, rightV(psi), sd * P.width), fwd(psi - sd * P.toeOut), -az);
    const psiN = psi + d * Math.PI;
    base.push({
      side: sd, O: O1, yaw: psi - sd * P.toeOut, yawEnd: psiN - sd * P.toeOut, swivel: 1,
      c: { x: O1.x, y: 0, z: O1.z }, psi: psi + d * Math.PI / 2, arr: durOf(0.95), sway: 0, turn: 1, slump: 0,
    });
    const cN = axpy(axpy(O1, fwd(psi - sd * P.toeOut), az), rightV(psiN), -sd * P.width);
    const c2 = axpy(cN, fwd(psiN), 0.42 * L);
    pushStep(-sd, c2, psiN, P.width, durOf(1.75), { turn: 1 });
    psi = psiN; c = c2; side = sd;
  }
  function arc(K, rho, fr, ar, wMul, ahead) {
    const d = side === -1 ? 1 : -1;
    const g = mul(rightV(psi), -d);
    const Ot = axpy(axpy(c, fwd(psi), ahead), g, rho);
    const psi0 = psi;
    for (let j = 0; j < K; j++) {
      const ps = psi0 + d * Math.PI * fr[j];
      const gj = mul(rightV(ps), -d);
      const cj = axpy(Ot, gj, -rho);
      pushStep(side, cj, ps, P.width * wMul, durOf(ar[j]), { turn: 1 });
      side = -side; c = cj;
    }
    psi = psi0 + d * Math.PI;
  }
  const doTurn = () => {
    if (P.turn === 'pivot') pivot();
    else if (P.turn === 'arc') arc(3, 0.28, [1 / 3, 2 / 3, 1], [1.12, 1.18, 1.1], 1, 0.22);
    else arc(5, 0.12, [0.18, 0.4, 0.62, 0.82, 1], [0.62, 0.72, 0.56, 0.82, 0.66], 1.8, 0.1);
  };

  if (mode === 'straight') {
    straight(12);
    return finalize(P, base, { x: c.x, y: 0, z: c.z }, 0);
  }
  const K = { pivot: 2, arc: 3, messy: 5 }[P.turn] || 2;
  let N = P.nSteps; if ((N + K) % 2) N++;
  straight(N, { panic: P.panic });
  doTurn();
  straight(N, { panic: P.panic, rush: P.rushAfter, slump: P.slump });
  doTurn();
  const delta = { x: c.x, y: 0, z: c.z };
  const M = base.length;
  base.forEach((s, i) => {
    const fr = (i + 1) / M;
    s.O = axpy(s.O, delta, -fr);
    s.c = axpy(s.c, delta, -fr);
  });
  return finalize(P, base, { x: 0, y: 0, z: 0 }, psi);
}

function finalize(P, base, shift, dyaw) {
  let t = 0;
  base.forEach(s => { t += s.arr; s.t0 = t; });
  const period = t;
  const steps = [];
  for (let cp = 0; cp < 4; cp++) {
    for (let bi = 0; bi < base.length; bi++) {
      const s = base[bi];
      steps.push(Object.assign({}, s, {
        bi, cp,
        O: axpy(s.O, shift, cp), c: axpy(s.c, shift, cp),
        yaw: s.yaw + cp * dyaw, yawEnd: s.yawEnd + cp * dyaw, psi: s.psi + cp * dyaw,
        t: s.t0 + cp * period,
      }));
    }
  }
  const n = steps.length;
  for (let i = 0; i < n; i++) steps[i].dur = i < n - 1 ? steps[i + 1].t - steps[i].t : steps[i].arr;
  for (let i = 0; i < n; i++) {
    const s = steps[i];
    s.stanceEnd = i < n - 1 ? steps[i + 1].t + P.ds * steps[i + 1].dur : s.t + s.dur * 1.1;
    s.tau = s.t + P.midK * s.dur;
    s.lat = mul(rightV(s.psi), s.side * (P.sway * s.sway + P.hipThrow));
    s.nearTurn = s.turn || (i + 1 < n && steps[i + 1].turn) || (i > 0 && steps[i - 1].turn);
  }
  const tArr = steps.map(s => s.t), tau = steps.map(s => s.tau);
  const turns = [];
  for (let i = 0; i < n; i++) {
    if (steps[i].turn && !(i > 0 && steps[i - 1].turn)) {
      let j = i; while (j + 1 < n && steps[j + 1].turn) j++;
      turns.push({ s: steps[i].t, e: steps[j].t + steps[j].dur, i0: i, i1: j });
    }
  }
  return {
    steps, period, shift, dyaw, tArr, tau, turns, nBase: base.length,
    cx: steps.map(s => s.c.x), cz: steps.map(s => s.c.z),
    lx: steps.map(s => s.lat.x), lz: steps.map(s => s.lat.z),
    psi: steps.map(s => s.psi), slump: steps.map(s => s.slump),
  };
}

// ---------- feet ----------
function footBasis(yaw, a, b) {
  const f0 = fwd(yaw), l0 = leftV(yaw);
  const ca = Math.cos(a), sa = Math.sin(a);
  const f1 = { x: f0.x * ca, y: sa, z: f0.z * ca };
  const u1 = { x: -f0.x * sa, y: ca, z: -f0.z * sa };
  const cb = Math.cos(b), sb = Math.sin(b);
  const l2 = { x: l0.x * cb + u1.x * sb, y: l0.y * cb + u1.y * sb, z: l0.z * cb + u1.z * sb };
  const u2 = { x: u1.x * cb - l0.x * sb, y: u1.y * cb - l0.y * sb, z: u1.z * cb - l0.z * sb };
  return { l: l2, u: u2, f: f1 };
}
const applyB = (B, p) => ({
  x: B.l.x * p.x + B.u.x * p.y + B.f.x * p.z,
  y: B.l.y * p.x + B.u.y * p.y + B.f.y * p.z,
  z: B.l.z * p.x + B.u.z * p.y + B.f.z * p.z,
});

function stanceFoot(W, st, u) {
  const P = W.P, sh = W.shoe;
  u = clamp(u, 0, 1);
  const tl = P.stomp ? 0.035 : 0.11;
  let a;
  if (u < tl) a = sh.ac * (1 - smooth(0, 1, u / tl));
  else if (u < P.heelOff) a = 0;
  else a = sh.aoff * smooth(P.heelOff, 1, u);
  let yaw = st.yaw;
  if (st.swivel) {
    yaw = lerp(st.yaw, st.yawEnd, smooth(0.15, 0.8, u));
    a = Math.min(a, -0.3 * Math.sin(Math.PI * clamp((u - 0.08) / 0.84, 0, 1)));
  }
  const roll = -st.side * P.ankleRoll * Math.sin(Math.PI * clamp((u - 0.03) / 0.4, 0, 1));
  const B = footBasis(yaw, a, roll);
  let ankle, tb = 0;
  if (a > 0) {
    const Hw = add(st.O, rotY(sh.H, st.yaw));
    ankle = add(Hw, applyB(B, sub(sh.A, sh.H)));
  } else {
    // toes stay on the floor; past the bend limit the toe box tips onto its point
    tb = Math.min(-a, sh.maxBend);
    const pt = a + tb;
    const Tg = V(0, 0, sh.toe.z - 0.014);
    const Bt = pt < 0 ? footBasis(yaw, pt, roll) : footBasis(yaw, 0, roll);
    const Mw = add(add(st.O, rotY(Tg, st.yaw)), applyB(Bt, sub(sh.M, Tg)));
    ankle = add(Mw, applyB(B, sub(sh.A, sh.M)));
  }
  return { ankle, basis: B, a, yaw, stance: true, u, step: st, tb };
}

function swingFoot(W, from, to, s, other) {
  const p0 = stanceFoot(W, from, 1), p1 = stanceFoot(W, to, 0);
  const sm = minJerk(s);
  const pos = lerp3(p0.ankle, p1.ankle, sm);
  pos.y += W.P.clearance * Math.sin(Math.PI * s) * (1.15 - 0.3 * s);
  // keep the swing foot clear of the standing foot (frame of the standing foot)
  const r = rightV(other.yaw), f = fwd(other.yaw);
  const dv = sub(pos, other.ankle);
  const lat = dot(dv, r), fw = dot(dv, f);
  if (Math.abs(fw) < 0.16) {
    const need = 0.082 - Math.abs(lat);
    if (need > 0) {
      const sg = to.side;  // a foot always passes on its own side of the standing foot
      const amt = need * Math.sin(Math.PI * s) * (1 - Math.abs(fw) / 0.16);
      pos.x += r.x * sg * amt; pos.z += r.z * sg * amt;
    }
  }
  const a = lerp(p0.a, p1.a, smooth(0, 0.75, s)) + W.shoe.swingLift * Math.sin(Math.PI * s);
  const yaw = lerp(p0.yaw, p1.yaw, smooth(0.05, 0.85, s));
  const tb = p0.tb * (1 - smooth(0, 0.4, s));
  return { ankle: pos, basis: footBasis(yaw, a, 0), a, yaw, stance: false, s, step: to, from, tb };
}

// replace the mid-swing part of the path with hip-driven leg kinematics (knee lift)
function refineSwing(W, fB, hip, psiDir) {
  const P = W.P, s = fB.s;
  if (!P.swingFK || fB.step.nearTurn || fB.from.nearTurn) { liftToe(W, fB); return; }
  const w = smooth(0, 0.22, s) * (1 - smooth(0.58, 0.96, s));
  if (w <= 0) { liftToe(W, fB); return; }
  const thS = P.stepLen / 0.64;
  const th = herm(SW.s, SW.th, s) * thS, ka = herm(SW.s, SW.ka, s) * P.kneeLift;
  const f = fwd(psiDir), r = rightV(psiDir);
  const fc = G.L1 * Math.sin(th) + G.L2 * Math.sin(th - ka);
  const uc = -(G.L1 * Math.cos(th) + G.L2 * Math.cos(th - ka));
  const rel = sub(fB.ankle, hip);
  const fk = add(hip, add(add(mul(f, fc), V(0, uc, 0)), mul(r, dot(rel, r))));
  fB.ankle = lerp3(fB.ankle, fk, w);
  liftToe(W, fB);
}
// keep the (bent) toe box above the floor during swing
function liftToe(W, fB) {
  const sh = W.shoe;
  const Mw = add(fB.ankle, applyB(fB.basis, sub(sh.M, sh.A)));
  const pt = fB.a + fB.tb;
  const toeY = Mw.y + (sh.toe.y - sh.M.y) * Math.cos(pt) + (sh.toe.z - sh.M.z) * Math.sin(pt);
  const need = 0.02 * smooth(0, 0.3, fB.s) * (1 - smooth(0.85, 1, fB.s));
  if (toeY < need) fB.ankle.y += need - toeY;
}

function ik(h, a, pole, L1, L2) {
  const d = sub(a, h);
  let dist = vlen(d) || 1e-6;
  const u = mul(d, 1 / dist);
  dist = clamp(dist, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-4);
  const x = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const hh = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  const p = norm(sub(pole, mul(u, dot(pole, u))));
  return axpy(axpy(h, u, x), p, hh);
}

function turnEnv(pl, T) {
  let e = 0;
  for (const w of pl.turns) {
    if (T < w.s - 0.5 || T > w.e + 0.8) continue;
    e = Math.max(e, smooth(w.s - 0.35, w.s + 0.05, T) * (1 - smooth(w.e, w.e + 0.6, T)));
  }
  return e;
}

function planTime(pl, tRaw) {
  const kk = Math.floor(tRaw / pl.period);
  return { T: tRaw - kk * pl.period + pl.period, kk };
}
function warpT(P, S, i, T) {
  if (!(P.dwell > 0)) return T;
  const A = S[i];
  const u = (T - A.t) / A.dur, um = P.dwellAt, w = P.dwell;
  return A.t + A.dur * (u - w / TAU * (Math.sin(TAU * (u - um)) + Math.sin(TAU * um)));
}
// continuous gait phase signal: +1 when the right foot has just landed
function gaitSig(pl, P, T) {
  const S = pl.steps, i = bsearch(pl.tArr, T), A = S[i];
  const Tw = warpT(P, S, i, T);
  return A.side * Math.cos(Math.PI * clamp((Tw - A.t) / A.dur, 0, 1));
}

// ---------- arm forward kinematics ----------
function armFK(sh, down, fT, out, phi, abd, el, wr, cb) {
  const dU = norm(add(add(mul(down, Math.cos(phi) * Math.cos(abd)), mul(fT, Math.sin(phi))), mul(out, Math.sin(abd) * Math.cos(phi))));
  const elbow = axpy(sh, dU, G.ua);
  let perp = sub(fT, mul(dU, dot(fT, dU)));
  perp = norm(axpy(norm(perp), out, -0.15 - cb * 0.6));
  perp = norm(sub(perp, mul(dU, dot(perp, dU))));
  const dF = norm(add(mul(dU, Math.cos(el)), mul(perp, Math.sin(el))));
  const wrist = axpy(elbow, dF, G.fa);
  const pH = norm(sub(perp, mul(dF, dot(perp, dF))));
  const dH = norm(add(mul(dF, Math.cos(wr)), mul(pH, Math.sin(wr))));
  const pH2 = norm(sub(pH, mul(dH, dot(pH, dH))));
  const hand = axpy(wrist, dH, G.handC);
  return { elbow, wrist, hand, dU, dF, dH, perp, pH: pH2, out };
}

// ---------- upper body (shared by walking and standing) ----------
function upperBody(W, c) {
  const P = W.P;
  const f = fwd(c.psi), l = leftV(c.psi);
  const latLean = P.latComp * c.lagDiff * 5 - P.counterSway * c.latSig * 0.07;
  const leanF = P.lean + c.slumpE * 0.13 - P.retract * 0.05 + (P.turnFlail ? c.tE * 0.08 : 0) + (c.leanX || 0);
  const upT = norm({ x: f.x * leanF + l.x * latLean + (c.upX ? c.upX.x : 0), y: 1, z: f.z * leanF + l.z * latLean + (c.upX ? c.upX.z : 0) });
  const lumbar = axpy(c.root, c.upP, G.lumbar);
  const yawT = c.psi + P.counter * P.pelvisRot * c.legSig - c.wob * 0.3 + (c.yawTX || 0);
  const lT = norm(cross(upT, fwd(yawT)));
  const fT = cross(lT, upT);
  const chest = axpy(lumbar, upT, G.chest);
  const neck = axpy(lumbar, upT, G.neck + (c.breath || 0) * 0.002);

  // shoulders and clavicles
  const lift = P.shrug + P.shoulderLift * c.landE + P.retract * 0.012 + (c.breath || 0) * 0.003;
  const shBase = axpy(neck, upT, -G.shDrop + lift);
  const shBack = -P.retract * 0.035 + P.protract * 0.028;
  const sigL = c.sigArm, sigR = -c.sigArm;
  const shL = axpy(axpy(shBase, lT, G.shW - P.protract * 0.012), fT, shBack - 0.012 * c.legSig + 0.008 * sigL * (1 - P.armLock));
  const shR = axpy(axpy(shBase, lT, -G.shW + P.protract * 0.012), fT, shBack + 0.012 * c.legSig + 0.008 * sigR * (1 - P.armLock));
  const scL = axpy(axpy(axpy(neck, upT, -0.065), fT, 0.045), lT, 0.02);
  const scR = axpy(axpy(axpy(neck, upT, -0.065), fT, 0.045), lT, -0.02);

  // arms
  const down = mul(upT, -1);
  const arm = (sd, sh, sig, sigLag) => {
    const out = mul(lT, sd === -1 ? 1 : -1);
    const free = 1 - P.armLock;
    const amp = P.armAmp * (1 + P.armAsym * 0.5 * sd) * free;
    let phi = amp * sig + P.armBase * free;
    let abd = P.abduct * free - P.armLock * 0.02;
    let el = (P.elbow + P.elbowAmp * Math.pow(0.5 + 0.5 * sig, 1.6)) * free + P.armLock * 0.04;
    let wr = P.wrist * free + 0.22 * (sigLag - sig) * free;
    if (P.armHold && sd === -1) { phi = 0.18; abd = 0.14; el = 1.3; wr = 0.1; }
    if (P.turnFlail && c.tE > 0) {
      abd += c.tE * (0.45 + 0.25 * Math.sin(c.tRaw * 9 + sd));
      phi += c.tE * 0.3 * Math.sin(c.tRaw * 7.3 + sd * 1.7);
      el += c.tE * 0.4;
    }
    const cb = P.crossBody * Math.max(0, sig);
    abd -= cb * 0.35;
    wr += P.wristFlip * 0.7 * Math.sin(Math.PI * c.stepU) * c.stepSide * sd;
    return armFK(sh, down, fT, out, phi, abd, el, wr, cb);
  };
  const aL = arm(-1, shL, sigL, c.sigArm2), aR = arm(1, shR, sigR, -c.sigArm2);

  // head
  const lookE = P.lookDown ? smooth(0.2, 0.65, W.nz(c.tRaw * 0.5 + 11)) : 0;
  const pitch = P.headPitch + P.lookDown * 0.5 * lookE + P.nod * c.landE2 + c.slumpE * 0.2 + (P.turnLook ? c.tE * 0.55 : 0) - P.neckFwd * 0.6;
  const yawH = c.headPsi + 0.35 * (yawT - c.psi) + P.scan * 0.45 * W.nz(c.tRaw * 0.6 + 3.1);
  let hUp0 = norm(lerp3(upT, UP, P.stab));
  if (P.neckFwd) hUp0 = norm(axpy(hUp0, fT, P.neckFwd));
  const lH = norm(cross(hUp0, fwd(yawH)));
  const fHb = cross(lH, hUp0);
  const fH = norm(sub(mul(fHb, Math.cos(pitch)), mul(hUp0, Math.sin(pitch))));
  const uH = norm(add(mul(hUp0, Math.cos(pitch)), mul(fHb, Math.sin(pitch))));
  const neckTop = axpy(axpy(neck, hUp0, G.neckLen), fHb, 0.012);
  const head = axpy(axpy(neckTop, uH, G.headUp), fH, G.headFwd);
  const eye = axpy(axpy(head, fH, 0.078), uH, 0.008);
  const com = axpy(c.root, upT, 0.1);
  return {
    lumbar, chest, neck, upT, lT, fT, shL, shR, scL, scR,
    elL: aL.elbow, elR: aR.elbow, wrL: aL.wrist, wrR: aR.wrist, handL: aL.hand, handR: aR.hand,
    dHL: aL.dH, dHR: aR.dH, outL: aL.out, outR: aR.out, perpL: aL.perp, perpR: aR.perp, pHL: aL.pH, pHR: aR.pH,
    neckTop, head, fH, uH, lH, eye, com, pitch,
  };
}

function legSolve(W, P, hipL, hipR, fL, fR, lp, fp) {
  const leg = (hip, foot, sd) => {
    const med = mul(lp, sd === 1 ? 1 : -1);
    const load = foot.stance ? Math.sin(Math.PI * clamp(foot.u / 0.45, 0, 1)) : 0;
    const ff = fwd(foot.yaw);
    const pole = norm(axpy(norm(add(mul(fp, 0.55), mul(ff, 0.45))), med, P.valgus * (0.35 + 1.4 * load)));
    const d = sub(foot.ankle, hip), dist = vlen(d);
    if (!foot.stance && dist > W.Lsum * 0.998) foot.ankle = axpy(hip, d, W.Lsum * 0.998 / dist);
    const knee = ik(hip, foot.ankle, pole, G.L1, G.L2);
    const ball = add(foot.ankle, applyB(foot.basis, sub(W.shoe.B, W.shoe.A)));
    const ax = sub(ball, hip), axl = vlen(ax), axn = mul(ax, 1 / axl);
    const proj = axpy(hip, axn, clamp(dot(sub(knee, hip), axn), 0, axl));
    const dev = sub(knee, proj);
    return { knee, ball, proj, medial: dot(dev, med), pole };
  };
  return { L: leg(hipL, fL, -1), R: leg(hipR, fR, 1) };
}

function pelvisFrame(psi, yawP, drop, tilt) {
  const fp0 = fwd(yawP), lp0 = leftV(yawP);
  const lp = { x: lp0.x * Math.cos(drop), y: Math.sin(drop), z: lp0.z * Math.cos(drop) };
  let upP = { x: -lp0.x * Math.sin(drop), y: Math.cos(drop), z: -lp0.z * Math.sin(drop) };
  if (tilt) upP = norm(axpy(upP, fp0, tilt));
  const fpP = norm(cross(lp, upP));
  return { lp, upP, fpP, fp: fp0 };
}

// ---------- pose: walking ----------
function evalPose(W, tRaw) {
  if (W.mode === 'stand') return evalStand(W, tRaw);
  const P = W.P, pl = W.plan, S = pl.steps;
  const pt = planTime(pl, tRaw);
  let T = pt.T;
  const off = mul(pl.shift, pt.kk - 1);
  const i = bsearch(pl.tArr, T);
  const A = S[i], B = S[i - 1], Cn = S[i + 1];
  const Traw = T;
  T = warpT(P, S, i, T);
  // feet
  const fA = stanceFoot(W, A, (T - A.t) / (A.stanceEnd - A.t));
  let fB;
  if (T < B.stanceEnd) fB = stanceFoot(W, B, (T - B.t) / (B.stanceEnd - B.t));
  else fB = swingFoot(W, B, Cn, clamp((T - B.stanceEnd) / (Cn.t - B.stanceEnd), 0, 1), fA);
  const fL = A.side === -1 ? fA : fB, fR = A.side === -1 ? fB : fA;

  // pelvis (hip centre)
  const lagT = P.lag * A.dur;
  const cx = herm(pl.tau, pl.cx, T), cz = herm(pl.tau, pl.cz, T);
  const lx = herm(pl.tau, pl.lx, T - lagT), lz = herm(pl.tau, pl.lz, T - lagT);
  const lxN = herm(pl.tau, pl.lx, T), lzN = herm(pl.tau, pl.lz, T);
  const psi = herm(pl.tau, pl.psi, T);
  const f = fwd(psi), l = leftV(psi);
  let root = { x: cx + lx, y: 0, z: cz + lz };
  const br = P.brake * alphaFn(T - A.t, 0.09);
  root.x -= f.x * br; root.z -= f.z * br;
  const sgnA = A.side === -1 ? 1 : -1;
  const wob = P.wobble * dampOsc(T - A.t - 0.05, 0.2, 0.3) * sgnA;
  root.x += l.x * wob * 0.12; root.z += l.z * wob * 0.12;

  const dLR = sub(fL.ankle, fR.ankle);
  const legSig = clamp((dLR.x * f.x + dLR.z * f.z) / P.stepLen, -1.3, 1.3);
  const swayTot = P.sway + P.hipThrow + 1e-4;
  const latSig = clamp((lx * l.x + lz * l.z) / swayTot, -1.6, 1.6);
  const yawP = psi - P.pelvisRot * legSig + wob * 0.5;
  const drop = P.pelvisDrop * latSig + wob;
  const pf = pelvisFrame(psi, yawP, drop, P.pelvisTilt);
  const { lp, upP, fpP, fp } = pf;

  const jj = bsearch(pl.tau, T);
  const ph = (T - pl.tau[jj]) / (pl.tau[jj + 1] - pl.tau[jj]);
  const slumpE = P.slump ? clamp(herm(pl.tau, pl.slump, T), 0, 1) : 0;
  let y = W.H0 + P.bob * Math.cos(TAU * ph) - slumpE * 0.012;
  const cons = (foot, side, slack) => {
    const o = -G.hipW * side;
    const hx = root.x + lp.x * o, hz = root.z + lp.z * o, hy = lp.y * o;
    const dh = Math.hypot(hx - foot.ankle.x, hz - foot.ankle.z);
    const r = W.Lmax;
    return (dh < r ? foot.ankle.y + Math.sqrt(r * r - dh * dh) : foot.ankle.y) - hy + slack;
  };
  y = smin(y, cons(fA, A.side, 0), P.smoothK);
  if (fB.stance) y = smin(y, cons(fB, B.side, 0), P.smoothK);
  else y = smin(y, cons(fB, B.side, smooth(0, 0.25, fB.s) * (1 - smooth(0.55, 1, fB.s)) * 0.25), P.smoothK);
  y -= P.shock * alphaFn(T - A.t, 0.045);
  root.y = y;
  const hipL = axpy(root, lp, G.hipW), hipR = axpy(root, lp, -G.hipW);

  // swing leg: hip-driven knee lift
  if (!fB.stance) refineSwing(W, fB, B.side === -1 ? hipL : hipR, psi);

  const legs = legSolve(W, P, hipL, hipR, fL, fR, lp, fp);

  // upper body
  const tE = (P.turnFlail || P.turnLook) ? turnEnv(pl, Traw) : 0;
  const sigArm = gaitSig(pl, P, Traw - P.armLag);
  const sigArm2 = gaitSig(pl, P, Traw - P.armLag - 0.1);
  const ub = upperBody(W, {
    root, upP, psi, legSig, latSig, lagDiff: (lxN - lx) * l.x + (lzN - lz) * l.z, slumpE, tE, wob,
    landE: alphaFn(T - A.t, 0.07), landE2: alphaFn(T - A.t, 0.08), tRaw, sigArm, sigArm2,
    stepU: clamp((T - A.t) / A.dur, 0, 1), stepSide: A.side,
    headPsi: herm(pl.tau, pl.psi, T + P.headLead),
  });

  const pose = Object.assign(ub, {
    T, Traw, i, A, psi, f, l, legSig, latSig, drop, slumpE, tE,
    C: { x: cx, y: 0, z: cz }, root, hipL, hipR, upP, fp, fpP, lp,
    kneeL: legs.L.knee, kneeR: legs.R.knee, legL: legs.L, legR: legs.R, poleL: legs.L.pole, poleR: legs.R.pole,
    footL: fL, footR: fR, ankL: fL.ankle, ankR: fR.ankle, stanceA: A.side,
  });
  pose.off = off;
  if (off.x || off.z) shiftPose(pose, off);
  return pose;
}

const SHIFT_KEYS = ['C', 'root', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankL', 'ankR', 'lumbar', 'chest', 'neck', 'shL', 'shR', 'scL', 'scR',
  'elL', 'elR', 'wrL', 'wrR', 'handL', 'handR', 'neckTop', 'head', 'eye', 'com'];
function shiftPose(pose, off) {
  for (const key of SHIFT_KEYS) pose[key] = add(pose[key], off);
  for (const lg of [pose.legL, pose.legR]) { lg.ball = add(lg.ball, off); lg.proj = add(lg.proj, off); lg.knee = add(lg.knee, off); }
  pose.footL.ankle = pose.ankL; pose.footR.ankle = pose.ankR;
}

// ---------- pose: standing ----------
function evalStand(W, t) {
  const P = W.P, sh = W.shoe;
  const nz = W.nz;
  const wgt = P.standW;           // 0 = even, 1 = all weight on the left (back) leg
  const half = 0.075;
  const stL = { side: -1, O: V(half, 0, -0.02), yaw: 0.09, swivel: 0 };
  const stR = { side: 1, O: V(-half + P.standCross, 0, P.standFwd), yaw: -0.14, swivel: 0 };
  const fL = stanceFoot(W, stL, 0.3), fR = stanceFoot(W, stR, 0.3);
  fL.u = 0.3; fR.u = 0.3;
  // slow sway and breathing
  const sway = nz(t * 0.15) * 0.004, breath = Math.sin(TAU * t / 4.2) * P.breathe;
  const psi = 0, f = fwd(psi), l = leftV(psi);
  const midX = lerp((fL.ankle.x + fR.ankle.x) / 2, fL.ankle.x - 0.01, wgt);
  const midZ = lerp((fL.ankle.z + fR.ankle.z) / 2, fL.ankle.z + 0.005, wgt * 0.8);
  const drop = 0.09 * wgt;                       // left hip up, right hip down
  const yawP = -0.08 * wgt;
  const pf = pelvisFrame(psi, yawP, drop, P.pelvisTilt);
  const { lp, upP, fpP, fp } = pf;
  const root = V(midX + sway, 0, midZ + P.pelvisFwd + nz(t * 0.11 + 7) * 0.003);
  // height: the weight leg is straight
  const o = -G.hipW * -1;
  const hx = root.x + lp.x * o, hz = root.z + lp.z * o, hy = lp.y * o;
  const dh = Math.hypot(hx - fL.ankle.x, hz - fL.ankle.z);
  const r = W.Lsum * 0.9993 - P.crouch;
  root.y = fL.ankle.y + Math.sqrt(Math.max(0, r * r - dh * dh)) - hy;
  if (wgt < 0.3) {
    const o2 = -G.hipW;
    const dh2 = Math.hypot(root.x + lp.x * o2 - fR.ankle.x, root.z + lp.z * o2 - fR.ankle.z);
    const y2 = fR.ankle.y + Math.sqrt(Math.max(0, r * r - dh2 * dh2)) - lp.y * o2;
    root.y = Math.min(root.y, y2);
  }
  const hipL = axpy(root, lp, G.hipW), hipR = axpy(root, lp, -G.hipW);
  const legs = legSolve(W, P, hipL, hipR, fL, fR, lp, fp);
  const ub = upperBody(W, {
    root, upP, psi, legSig: 0, latSig: 0, lagDiff: 0, slumpE: 0, tE: 0, wob: 0,
    landE: 0, landE2: 0, tRaw: t, sigArm: 0, sigArm2: 0, stepU: 0, stepSide: 1,
    headPsi: 0, upX: mul(l, -0.05 * wgt), yawTX: 0.06 * wgt, breath,
  });
  return Object.assign(ub, {
    T: t, Traw: t, i: 0, A: stL, psi, f, l, legSig: 0, latSig: 0, drop, slumpE: 0, tE: 0,
    C: V(0, 0, 0.03), root, hipL, hipR, upP, fp, fpP, lp,
    kneeL: legs.L.knee, kneeR: legs.R.knee, legL: legs.L, legR: legs.R, poleL: legs.L.pole, poleR: legs.R.pole,
    footL: fL, footR: fR, ankL: fL.ankle, ankR: fR.ankle, stanceA: -1, off: V(0, 0, 0), stand: true,
  });
}

// ---------- rest pose (bind pose of the mesh) ----------
function restPose() {
  const root = V(0, G.restRoot, 0);
  const I = { lp: V(1, 0, 0), upP: V(0, 1, 0), fpP: V(0, 0, 1) };
  const lumbar = axpy(root, UP, G.lumbar);
  const neck = axpy(lumbar, UP, G.neck);
  const lT = V(1, 0, 0), upT = V(0, 1, 0), fT = V(0, 0, 1);
  const neckTop = add(neck, V(0, G.neckLen, 0.012));
  const head = add(neckTop, V(0, G.headUp, G.headFwd));
  const shBase = axpy(neck, UP, -G.shDrop);
  const shL = axpy(shBase, lT, G.shW), shR = axpy(shBase, lT, -G.shW);
  const scL = add(neck, V(0.02, -0.065, 0.045)), scR = add(neck, V(-0.02, -0.065, 0.045));
  const down = V(0, -1, 0);
  const aL = armFK(shL, down, fT, V(1, 0, 0), 0, 0.349, 0.1745, 0.1, 0);
  const aR = armFK(shR, down, fT, V(-1, 0, 0), 0, 0.349, 0.1745, 0.1, 0);
  const hipL = axpy(root, lT, G.hipW), hipR = axpy(root, lT, -G.hipW);
  const kneeL = add(hipL, V(0, -G.L1, 0)), kneeR = add(hipR, V(0, -G.L1, 0));
  const ankL = add(kneeL, V(0, -G.L2, 0)), ankR = add(kneeR, V(0, -G.L2, 0));
  const Bid = { l: V(1, 0, 0), u: V(0, 1, 0), f: V(0, 0, 1) };
  return {
    root, lp: I.lp, upP: I.upP, fpP: I.fpP, lumbar, neck, neckTop, head, lT, upT, fT, lH: lT, uH: upT, fH: fT,
    shL, shR, scL, scR, elL: aL.elbow, elR: aR.elbow, wrL: aL.wrist, wrR: aR.wrist, handL: aL.hand, handR: aR.hand,
    perpL: aL.perp, perpR: aR.perp, pHL: aL.pH, pHR: aR.pH, dHL: aL.dH, dHR: aR.dH, armL: aL, armR: aR,
    hipL, hipR, kneeL, kneeR, ankL, ankR, poleL: fT, poleR: fT,
    footL: { basis: Bid, tb: 0, ankle: ankL }, footR: { basis: Bid, tb: 0, ankle: ankR },
  };
}

// ---------- bone frames ----------
const BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'clavL', 'uarmL', 'farmL', 'handL', 'clavR', 'uarmR', 'farmR', 'handR',
  'thighL', 'shinL', 'footL', 'toeL', 'thighR', 'shinR', 'footR', 'toeR', 'pony1', 'pony2', 'pony3', 'pony4'];
const BONE_NEIGHBORS = {
  pelvis: ['spine', 'thighL', 'thighR'], spine: ['pelvis', 'chest'], chest: ['spine', 'neck', 'clavL', 'clavR'],
  neck: ['chest', 'head'], head: ['neck', 'pony1'],
  clavL: ['chest', 'uarmL', 'neck'], uarmL: ['clavL', 'farmL'], farmL: ['uarmL', 'handL'], handL: ['farmL'],
  clavR: ['chest', 'uarmR', 'neck'], uarmR: ['clavR', 'farmR'], farmR: ['uarmR', 'handR'], handR: ['farmR'],
  thighL: ['pelvis', 'shinL'], shinL: ['thighL', 'footL'], footL: ['shinL', 'toeL'], toeL: ['footL'],
  thighR: ['pelvis', 'shinR'], shinR: ['thighR', 'footR'], footR: ['shinR', 'toeR'], toeR: ['footR'],
  pony1: ['head', 'pony2'], pony2: ['pony1', 'pony3'], pony3: ['pony2', 'pony4'], pony4: ['pony3'],
};
function frameYZ(o, y, zRef) {
  const Y = norm(y);
  let Z = sub(zRef, mul(Y, dot(zRef, Y)));
  if (vlen(Z) < 1e-6) Z = sub(V(0, 0, 1), mul(Y, Y.z));
  Z = norm(Z);
  return { o, x: cross(Y, Z), y: Y, z: Z };
}
function footFrames(foot, alpha) {
  const B = foot.basis, ca = Math.cos(alpha), sa = Math.sin(alpha);
  const ff = { o: foot.ankle, x: B.l, y: add(mul(B.u, ca), mul(B.f, sa)), z: add(mul(B.u, -sa), mul(B.f, ca)) };
  const m = FOOT.mtp;
  const mtp = add(foot.ankle, add(add(mul(ff.x, m.x), mul(ff.y, m.y)), mul(ff.z, m.z)));
  const ct = Math.cos(foot.tb), st = Math.sin(foot.tb);
  const tf = { o: mtp, x: B.l, y: sub(mul(B.u, ct), mul(B.f, st)), z: add(mul(B.u, st), mul(B.f, ct)) };
  return [ff, tf];
}
// head-space chain points to world
function ponyRest(p) {
  return PONY.map(q => add(p.head, add(add(mul(p.lH, q.x), mul(p.uH, q.y)), mul(p.fH, q.z))));
}
function boneFrames(p, alpha, pony) {
  const F = [];
  F.push({ o: p.root, x: p.lp, y: p.upP, z: p.fpP });
  F.push(frameYZ(p.lumbar, add(p.upP, p.upT), add(p.fpP, p.fT)));
  F.push({ o: p.lumbar, x: p.lT, y: p.upT, z: p.fT });
  F.push(frameYZ(p.neck, sub(p.neckTop, p.neck), p.fT));
  F.push({ o: p.neckTop, x: p.lH, y: p.uH, z: p.fH });
  for (const s of ['L', 'R']) {
    F.push(frameYZ(p['sc' + s], sub(p['sh' + s], p['sc' + s]), p.upT));
    F.push(frameYZ(p['sh' + s], sub(p['sh' + s], p['el' + s]), p['perp' + s]));
    F.push(frameYZ(p['el' + s], sub(p['el' + s], p['wr' + s]), p['perp' + s]));
    F.push(frameYZ(p['wr' + s], sub(p['wr' + s], p['hand' + s]), p['pH' + s]));
  }
  for (const s of ['L', 'R']) {
    const knee = s === 'L' ? p.kneeL : p.kneeR;
    F.push(frameYZ(p['hip' + s], sub(p['hip' + s], knee), p['pole' + s]));
    F.push(frameYZ(knee, sub(knee, p['ank' + s]), p['pole' + s]));
    const ft = footFrames(p['foot' + s], alpha);
    F.push(ft[0], ft[1]);
  }
  const ch = pony || ponyRest(p);
  for (let k = 1; k <= 4; k++) F.push(frameYZ(ch[k - 1], sub(ch[k - 1], ch[k]), mul(p.fH, -1)));
  return F;
}

function makeWalkerState(presetId, overrides, mode) {
  const P = resolvePreset(presetId, overrides);
  const shoe = P.heel ? SHOES.heel : SHOES.flat;
  const Lsum = G.L1 + G.L2;
  const W = {
    presetId, P, mode, shoe, Lsum,
    Lmax: Lsum * 0.997,
    H0: shoe.A.y + P.legExt * Lsum - P.crouch,
    nz: makeNoise(P.seed * 7 + 3),
  };
  if (mode !== 'stand') W.plan = makePlan(P, mode, shoe);
  return W;
}

function camHeading(W, tRaw) {
  if (W.mode === 'stand') return 0;
  const pl = W.plan; const { T } = planTime(pl, tRaw);
  let s = 0;
  for (const d of [-0.8, -0.4, 0, 0.4, 0.8]) s += herm(pl.tau, pl.psi, T + d);
  return s / 5;
}
function lineCentre(W, tRaw) {
  if (W.mode === 'stand') return V(0, 0, 0.03);
  const pl = W.plan; const { T, kk } = planTime(pl, tRaw);
  const off = mul(pl.shift, kk - 1);
  return { x: herm(pl.tau, pl.cx, T) + off.x, y: 0, z: herm(pl.tau, pl.cz, T) + off.z };
}

if (typeof module !== 'undefined') {
  module.exports = {
    evalPose, makeWalkerState, PRESETS, resolvePreset, planTime, camHeading, lineCentre, G, SHOES, FOOT, PONY,
    restPose, boneFrames, BONES, BONE_NEIGHBORS, ponyRest, footFrames, armFK, rotX, V, add, sub, mul, norm, cross, dot, vlen, axpy,
  };
}
