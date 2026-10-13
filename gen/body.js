// Builds the mannequin body: SDF anatomy -> surface nets -> simplify -> weights + regions.
'use strict';
const E = require('../engine.js');
const S = require('./sdf.js');
const { ell, rc, sph, axesYZ, vsub, vadd, vmul, vdot, vnorm, vcross, P3 } = S;

const R = E.restPose();
const BI = Object.fromEntries(E.BONES.map((b, i) => [b, i]));

// ---------- anatomy ----------
const parts = [];   // { name, k, prims: [{p, bone, k, op}] }
function part(name, k) { const p = { name, k, prims: [] }; parts.push(p); return p; }
const U = (pt, p, bone, k, op) => { pt.prims.push({ p, bone: bone == null ? -1 : BI[bone], k: k || 0, op: op || 'u' }); };
const mx = (v, s) => [v[0] * s, v[1], v[2]];

// ---- torso ----
const torso = part('torso', 0);
U(torso, ell([0, 1.287, -0.01], [0.121, 0.158, 0.091]), 'chest');
U(torso, ell([0, 1.388, 0.012], [0.12, 0.07, 0.06]), 'chest', 0.05);
for (const s of [1, -1]) {
  const yaw = 0.22 * s;
  U(torso, ell([0.055 * s, 1.266, 0.064], [0.049, 0.046, 0.037], [[Math.cos(yaw), 0, -Math.sin(yaw)], [0, 1, 0], [Math.sin(yaw), 0, Math.cos(yaw)]]), 'chest', 0.042);
  U(torso, ell([0.062 * s, 1.34, -0.048], [0.062, 0.088, 0.04]), 'chest', 0.05);
  U(torso, rc([0.085 * s, 1.33, -0.05], [0.158 * s, 1.385, -0.03], 0.03, 0.025), s > 0 ? 'clavL' : 'clavR', 0.045);
  U(torso, rc([0.07 * s, 1.37, 0.035], [0.155 * s, 1.395, 0.02], 0.026, 0.022), s > 0 ? 'clavL' : 'clavR', 0.045);
  U(torso, ell([0.098 * s, 1.3, -0.02], [0.038, 0.1, 0.068]), 'chest', 0.05);
}
U(torso, ell([0, 1.11, -0.009], [0.097, 0.1, 0.076]), 'spine', 0.06);
U(torso, ell([0, 1.03, 0.019], [0.106, 0.085, 0.071]), 'pelvis', 0.05);
U(torso, ell([0, 0.955, -0.013], [0.144, 0.094, 0.096]), 'pelvis', 0.05);
U(torso, ell([0, 1.0, -0.06], [0.085, 0.08, 0.04]), 'pelvis', 0.045);
U(torso, ell([0, 0.888, 0.016], [0.048, 0.04, 0.048]), 'pelvis', 0.03);
for (const s of [1, -1]) {
  U(torso, ell([0.104 * s, 0.926, -0.007], [0.055, 0.09, 0.07]), 'pelvis', 0.05);
  U(torso, ell([0.055 * s, 0.904, -0.058], [0.065, 0.08, 0.06]), 'pelvis', 0.045);
  U(torso, ell([0.088 * s, 1.07, 0.0], [0.034, 0.07, 0.055]), 'spine', 0.06);
  // trapezius and collarbone
  U(torso, rc([0, 1.5, -0.04], [0.14 * s, 1.452, -0.016], 0.035, 0.021), s > 0 ? 'clavL' : 'clavR', 0.04);
  U(torso, rc([0.024 * s, 1.443, 0.048], [0.148 * s, 1.46, 0.01], 0.0075, 0.0085), s > 0 ? 'clavL' : 'clavR', 0.028);
}

// ---- neck ----
const neck = part('neck', 0.03);
U(neck, rc([0, 1.43, -0.014], [0, 1.6, 0.004], 0.05, 0.044), 'neck');
for (const s of [1, -1]) U(neck, rc([0.045 * s, 1.612, -0.012], [0.014 * s, 1.465, 0.046], 0.011, 0.012), 'neck', 0.02);

// ---- head (relative to the head centre) ----
const Hc = P3(R.head);
const hp = v => vadd(Hc, v);
const head = part('head', 0.016);
// stylized faceless head: smooth egg cranium, soft jaw, a whisper of a nose ridge
U(head, ell(hp([0, 0.018, -0.012]), [0.073, 0.088, 0.095]), 'head');
U(head, ell(hp([0, 0.03, 0.035]), [0.066, 0.06, 0.055]), 'head', 0.04);
U(head, ell(hp([0, -0.025, 0.03]), [0.058, 0.07, 0.064]), 'head', 0.05);
U(head, ell(hp([0, -0.072, 0.04]), [0.04, 0.042, 0.048]), 'head', 0.05);
U(head, ell(hp([0, -0.1, 0.064]), [0.017, 0.015, 0.016]), 'head', 0.04);
U(head, rc(hp([0, 0.01, 0.09]), hp([0, -0.03, 0.1]), 0.006, 0.008, { w: [1, 0, 0], s: 0.7 }), 'head', 0.03);
// sleek hair: a shell over the skull, cut at the hairline
const hairline = (y, z) => 0.9 * z - 0.008;
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
const skullA = ell(hp([0, 0.018, -0.012]), [0.073, 0.088, 0.095]), skullB = ell(hp([0, 0.03, 0.035]), [0.066, 0.06, 0.055]);
U(head, { bs: [Hc[0], Hc[1] + 0.02, Hc[2], 0.12], f(x, y, z) {
  const ly = y - Hc[1], lz = z - Hc[2];
  const shell = S.sminP(skullA.f(x, y, z), skullB.f(x, y, z), 0.03) - 0.0055;
  return S.smaxP(shell, (hairline(ly, lz) - ly) / 1.345, 0.004);
} }, 'head', 0.003);

// ---- ponytail ----
const PC = E.ponyRest(R).map(P3);
const pony = part('pony', 0.008);
const pr = [0.019, 0.025, 0.021, 0.014, 0.005];
U(pony, sph(PC[0], 0.021), 'head');
for (let k = 0; k < 4; k++) U(pony, rc(PC[k], PC[k + 1], pr[k], pr[k + 1], { w: [1, 0, 0], s: 0.82 }), 'pony' + (k + 1), 0.012);

// ---- legs ----
function leg(s) {
  const L = s > 0 ? 'L' : 'R';
  const pt = part('leg' + L, 0.022);
  const th = 'thigh' + L, sh = 'shin' + L, ft = 'foot' + L, to = 'toe' + L;
  const p = v => mx(v, s);
  U(pt, rc(p([0.095, 0.93, 0.0]), p([0.087, 0.53, 0.0]), 0.079, 0.05), th);
  U(pt, ell(p([0.117, 0.76, 0.006]), [0.04, 0.16, 0.05]), th, 0.03);
  U(pt, ell(p([0.09, 0.74, 0.03]), [0.054, 0.17, 0.05]), th, 0.03);
  U(pt, ell(p([0.067, 0.6, 0.026]), [0.033, 0.065, 0.034]), th, 0.025);
  U(pt, ell(p([0.063, 0.83, -0.005]), [0.044, 0.1, 0.054]), th, 0.03);
  U(pt, ell(p([0.09, 0.72, -0.03]), [0.054, 0.16, 0.045]), th, 0.03);
  U(pt, ell(p([0.086, 0.512, 0.043]), [0.023, 0.028, 0.013]), th, 0.015);
  U(pt, rc(p([0.086, 0.55, 0.0]), p([0.086, 0.47, -0.002]), 0.047, 0.045), sh, 0.02);
  U(pt, rc(p([0.086, 0.49, 0.0]), p([0.085, 0.1, -0.004]), 0.045, 0.024), sh, 0.02);
  U(pt, ell(p([0.097, 0.385, -0.028]), [0.035, 0.1, 0.039]), sh, 0.03);
  U(pt, ell(p([0.074, 0.37, -0.026]), [0.036, 0.095, 0.039]), sh, 0.03);
  U(pt, rc(p([0.08, 0.47, 0.034]), p([0.08, 0.14, 0.021]), 0.015, 0.012), sh, 0.02);
  U(pt, rc(p([0.086, 0.2, -0.033]), p([0.086, 0.056, -0.047]), 0.016, 0.012), sh, 0.02);
  U(pt, sph(p([0.108, 0.068, -0.008]), 0.013), sh, 0.012);
  U(pt, sph(p([0.064, 0.078, 0.0]), 0.013), sh, 0.012);
  // foot
  U(pt, ell(p([0.085, 0.037, -0.03]), [0.03, 0.037, 0.036]), ft, 0.02);
  U(pt, rc(p([0.085, 0.05, -0.01]), p([0.083, 0.03, 0.105]), 0.03, 0.03, { w: [0, 1, 0], s: 0.75 }), ft, 0.02);
  U(pt, rc(p([0.085, 0.074, 0.012]), p([0.08, 0.045, 0.1]), 0.027, 0.021), ft, 0.02);
  U(pt, rc(p([0.104, 0.02, -0.01]), p([0.109, 0.016, 0.108]), 0.016, 0.017), ft, 0.02);
  U(pt, ell(p([0.08, 0.022, 0.116]), [0.045, 0.022, 0.033]), ft, 0.02);
  U(pt, rc(p([0.065, 0.02, 0.132]), p([0.062, 0.017, 0.188]), 0.015, 0.012), to, 0.01);
  U(pt, rc(p([0.083, 0.017, 0.14]), p([0.087, 0.013, 0.178]), 0.012, 0.009), to, 0.006);
  U(pt, rc(p([0.097, 0.015, 0.136]), p([0.102, 0.012, 0.168]), 0.011, 0.008), to, 0.006);
  U(pt, rc(p([0.11, 0.014, 0.128]), p([0.115, 0.011, 0.155]), 0.0095, 0.007), to, 0.006);
  return pt;
}
leg(1); leg(-1);

// ---- arms ----
function arm(s) {
  const L = s > 0 ? 'L' : 'R';
  const pt = part('arm' + L, 0.022);
  const A = s > 0 ? R.armL : R.armR;
  const sh = P3(s > 0 ? R.shL : R.shR), el = P3(A.elbow), wr = P3(A.wrist);
  const dU = P3(A.dU), dF = P3(A.dF), dH = P3(A.dH), pp = P3(A.perp), out = P3(A.out);
  const ua = 'uarm' + L, fa = 'farm' + L, hd = 'hand' + L;
  const at = (o, dir, t, side, so, fw, fo) => {
    let r = vadd(o, vmul(dir, t));
    if (side) r = vadd(r, vmul(side, so || 0));
    if (fw) r = vadd(r, vmul(fw, fo || 0));
    return r;
  };
  U(pt, ell(at(sh, dU, 0.04, out, 0.014), [0.044, 0.08, 0.05], axesYZ(dU, pp)), ua, 0.03);
  U(pt, rc(at(sh, dU, 0.02), el, 0.04, 0.031), ua, 0.02);
  U(pt, ell(at(sh, dU, 0.17, out, 0, pp, 0.012), [0.03, 0.085, 0.03], axesYZ(dU, pp)), ua, 0.025);
  U(pt, ell(at(sh, dU, 0.14, out, 0, pp, -0.012), [0.032, 0.095, 0.032], axesYZ(dU, pp)), ua, 0.025);
  U(pt, rc(at(el, dU, -0.02), at(el, dF, 0.02), 0.031, 0.031), fa, 0.02);
  U(pt, rc(el, wr, 0.034, 0.021, { w: out, s: 0.78 }), fa, 0.02);
  U(pt, ell(at(el, dF, 0.07, out, 0, pp, 0.004), [0.033, 0.075, 0.035], axesYZ(dF, pp)), fa, 0.025);
  // hand: palm faces the body (-out), W points to the thumb side
  const hax = axesYZ(dH, pp);
  const Wv = hax[2];
  U(pt, ell(at(wr, dH, 0.048), [0.0145, 0.05, 0.04], hax), hd, 0.012);
  U(pt, ell(at(wr, dH, 0.03, Wv, 0.019, out, -0.007), [0.012, 0.027, 0.015], hax), hd, 0.01);
  const fingers = [[0.026, 0.042, 0.038], [0.009, 0.046, 0.042], [-0.008, 0.043, 0.039], [-0.024, 0.034, 0.029]];
  for (const [o, l1, l2] of fingers) {
    const k0 = at(wr, dH, 0.093, Wv, o);
    const d1 = vnorm(vsub(vmul(dH, Math.cos(0.28)), vmul(out, Math.sin(0.28))));
    const k1 = vadd(k0, vmul(d1, l1));
    const d2 = vnorm(vsub(vmul(dH, Math.cos(0.7)), vmul(out, Math.sin(0.7))));
    const k2 = vadd(k1, vmul(d2, l2));
    U(pt, rc(vadd(k0, vmul(dH, -0.012)), k1, 0.0088, 0.0072), hd, 0.004);
    U(pt, rc(k1, k2, 0.0072, 0.0058), hd, 0.003);
  }
  const t0 = at(wr, dH, 0.028, Wv, 0.024, out, -0.004);
  const t1 = vadd(t0, vmul(vnorm(vadd(vadd(vmul(dH, 0.75), vmul(Wv, 0.45)), vmul(out, -0.35))), 0.04));
  const t2 = vadd(t1, vmul(vnorm(vadd(vadd(vmul(dH, 0.85), vmul(Wv, 0.18)), vmul(out, -0.5))), 0.031));
  U(pt, rc(t0, t1, 0.0115, 0.0095), hd, 0.008);
  U(pt, rc(t1, t2, 0.0092, 0.0072), hd, 0.004);
  return pt;
}
arm(1); arm(-1);

// ---------- body SDF ----------
function bodySDF(x, y, z) {
  let d = S.evalChain(parts[0].prims, x, y, z);
  for (let i = 1; i < parts.length; i++) {
    const pt = parts[i];
    d = S.sminP(d, S.evalChain(pt.prims, x, y, z), pt.k);
  }
  return Math.max(d, -y);
}
// per-bone raw distances
const NB = E.BONES.length;
function boneDist(x, y, z, out) {
  out.fill(1e9);
  for (const pt of parts) for (const q of pt.prims) {
    if (q.op !== 'u' || q.bone < 0) continue;
    const bs = q.p.bs;
    const lb = Math.hypot(x - bs[0], y - bs[1], z - bs[2]) - bs[3];
    if (lb > 0.12 || lb > out[q.bone] + 0.001) continue;
    const v = q.p.f(x, y, z);
    if (v < out[q.bone]) out[q.bone] = v;
  }
  return out;
}

// ---------- regions (rest space) ----------
function suitField(x, y, z) {
  const ax = Math.abs(x);
  const fz = smoothstep(-0.05, 0.06, z);
  const sh = smoothstep(0.03, 0.09, ax);
  const fNeck = ((1.505 + 0.0 * sh) * (1 - fz) + (1.48 + 0.0 * sh) * fz) - y;   // mock neck
  const fAnkle = y - 0.125;                                                     // cropped at the ankle
  const ex = (ax - 0.2) / 0.075, ey = (y - 1.37) / 0.13;
  const s1 = (Math.sqrt(ex * ex + ey * ey) - 1) * 0.09;
  const fArm = Math.min(s1, Math.max(0.2 - ax, y - 1.37));                      // sleeveless, cut-in shoulders
  return Math.min(fNeck, fAnkle, fArm);
}
// trousers part of the outfit (below a high waistband)
function pantsField(x, y, z) { return (1.035 + 0.012 * smoothstep(-0.06, 0.06, -z)) - y; }
const earE = [1, -1].map(s => ell(hp([0.073 * s, -0.005, -0.006]), [0.009, 0.03, 0.018]));
function hairField(x, y, z) {
  const ly = y - Hc[1], lz = z - Hc[2];
  let f = (ly - hairline(ly, lz)) / 1.345 - 0.001;
  const de = Math.min(earE[0].f(x, y, z), earE[1].f(x, y, z));
  f = Math.min(f, de - 0.003);
  return f;
}

module.exports = { parts, bodySDF, boneDist, suitField, pantsField, hairField, Hc, NB, BI, R, smoothstep };
