// Signed distance primitives, a narrow-band surface-nets mesher and helpers.
'use strict';

function sminP(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function smaxP(a, b, k) { return -sminP(-a, -b, k); }

const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlen = a => Math.hypot(a[0], a[1], a[2]);
const vnorm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const P3 = v => [v.x, v.y, v.z];

// ellipsoid with optional orientation (rows of an orthonormal basis)
function ell(c, r, axes) {
  const [cx, cy, cz] = c, [rx, ry, rz] = r;
  const A = axes || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const a00 = A[0][0], a01 = A[0][1], a02 = A[0][2], a10 = A[1][0], a11 = A[1][1], a12 = A[1][2], a20 = A[2][0], a21 = A[2][1], a22 = A[2][2];
  const rmin = Math.min(rx, ry, rz);
  return {
    bs: [cx, cy, cz, Math.max(rx, ry, rz)],
    f(x, y, z) {
      const dx = x - cx, dy = y - cy, dz = z - cz;
      const lx = (dx * a00 + dy * a01 + dz * a02) / rx, ly = (dx * a10 + dy * a11 + dz * a12) / ry, lz = (dx * a20 + dy * a21 + dz * a22) / rz;
      const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
      const k1 = Math.sqrt((lx / rx) * (lx / rx) + (ly / ry) * (ly / ry) + (lz / rz) * (lz / rz));
      return k1 > 1e-12 ? k0 * (k0 - 1) / k1 : -rmin;
    },
  };
}
// axes from a main (y) direction and a reference forward (z) direction
function axesYZ(yDir, zRef) {
  const Y = vnorm(yDir);
  let Z = vsub(zRef, vmul(Y, vdot(zRef, Y)));
  Z = vnorm(Z);
  const X = vcross(Y, Z);
  return [X, Y, Z];
}
// round cone (iq), with optional squash perpendicular to the axis
function rc(a, b, r1, r2, squash) {
  const ax = a[0], ay = a[1], az = a[2];
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  let w0 = 0, w1 = 0, w2 = 0, kq = 0;
  if (squash) {
    const u = vnorm([bax, bay, baz]);
    let w = vsub(squash.w, vmul(u, vdot(squash.w, u)));
    w = vnorm(w); w0 = w[0]; w1 = w[1]; w2 = w[2]; kq = 1 / squash.s - 1;
  }
  return {
    bs: [ax + bax / 2, ay + bay / 2, az + baz / 2, Math.sqrt(l2) / 2 + Math.max(r1, r2) / (squash ? Math.min(1, squash.s) : 1)],
    f(x, y, z) {
      let px = x - ax, py = y - ay, pz = z - az;
      if (kq) { const d = (px * w0 + py * w1 + pz * w2) * kq; px += w0 * d; py += w1 * d; pz += w2 * d; }
      const yy = px * bax + py * bay + pz * baz, zz = yy - l2;
      const xvx = px * l2 - bax * yy, xvy = py * l2 - bay * yy, xvz = pz * l2 - baz * yy;
      const x2 = xvx * xvx + xvy * xvy + xvz * xvz, y2 = yy * yy * l2, z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    },
  };
}
const sph = (c, r) => rc(c, [c[0], c[1] + 1e-4, c[2]], r, r);

// evaluate a chain of primitives (union with blend k; op 's' subtracts)
function evalChain(prims, x, y, z) {
  let d = 1e9;
  for (let i = 0; i < prims.length; i++) {
    const q = prims[i], bs = q.p.bs;
    const dx = x - bs[0], dy = y - bs[1], dz = z - bs[2];
    const lb = Math.sqrt(dx * dx + dy * dy + dz * dz) - bs[3];
    if (q.op === 's') {
      if (lb > q.k + Math.abs(d)) continue;
      d = smaxP(d, -q.p.f(x, y, z), q.k);
    } else if (q.op === 'i') {
      d = smaxP(d, q.p.f(x, y, z), q.k);
    } else {
      if (lb > d + q.k) continue;
      d = sminP(d, q.p.f(x, y, z), q.k);
    }
  }
  return d;
}

// narrow-band surface nets
function mesh(sdf, bmin, bmax, h, opts) {
  opts = opts || {};
  const m = 4;
  const ncx = Math.ceil((bmax[0] - bmin[0]) / (h * m)), ncy = Math.ceil((bmax[1] - bmin[1]) / (h * m)), ncz = Math.ceil((bmax[2] - bmin[2]) / (h * m));
  const nx = ncx * m + 1, ny = ncy * m + 1, nz = ncz * m + 1;
  const N = nx * ny * nz;
  const vals = new Float32Array(N).fill(NaN);
  const id = (i, j, k) => (k * ny + j) * nx + i;
  const X = i => bmin[0] + i * h, Y = j => bmin[1] + j * h, Z = k => bmin[2] + k * h;
  let evals = 0;
  const get = (i, j, k) => {
    const n = id(i, j, k);
    let v = vals[n];
    if (v !== v) { v = sdf(X(i), Y(j), Z(k)); vals[n] = v; evals++; }
    return v;
  };
  // coarse pass
  const thr = h * m * Math.sqrt(3) * 1.6;
  const marked = new Uint8Array(ncx * ncy * ncz);
  const cid = (a, b, c) => (c * ncy + b) * ncx + a;
  for (let c = 0; c < ncz; c++) for (let b = 0; b < ncy; b++) for (let a = 0; a < ncx; a++) {
    let near = false;
    for (let q = 0; q < 8 && !near; q++) {
      const v = get((a + (q & 1)) * m, (b + ((q >> 1) & 1)) * m, (c + ((q >> 2) & 1)) * m);
      if (Math.abs(v) < thr) near = true;
    }
    if (near) marked[cid(a, b, c)] = 1;
  }
  // vertices
  const cellV = new Map();
  const pos = [];
  const cornerOff = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float64Array(8);
  const cellKey = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
  for (let c = 0; c < ncz; c++) for (let b = 0; b < ncy; b++) for (let a = 0; a < ncx; a++) {
    if (!marked[cid(a, b, c)]) continue;
    for (let kk = 0; kk < m; kk++) for (let jj = 0; jj < m; jj++) for (let ii = 0; ii < m; ii++) {
      const i = a * m + ii, j = b * m + jj, k = c * m + kk;
      let neg = 0;
      for (let q = 0; q < 8; q++) { cv[q] = get(i + cornerOff[q][0], j + cornerOff[q][1], k + cornerOff[q][2]); if (cv[q] < 0) neg++; }
      if (neg === 0 || neg === 8) continue;
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (const [e0, e1] of edges) {
        const v0 = cv[e0], v1 = cv[e1];
        if ((v0 < 0) === (v1 < 0)) continue;
        const t = v0 / (v0 - v1);
        const o0 = cornerOff[e0], o1 = cornerOff[e1];
        sx += o0[0] + (o1[0] - o0[0]) * t; sy += o0[1] + (o1[1] - o0[1]) * t; sz += o0[2] + (o1[2] - o0[2]) * t; cnt++;
      }
      cellV.set(cellKey(i, j, k), pos.length / 3);
      pos.push(X(i) + sx / cnt * h, Y(j) + sy / cnt * h, Z(k) + sz / cnt * h);
    }
  }
  // faces
  const idx = [];
  const quad = (v0, v1, v2, v3, flip) => {
    if (v0 === undefined || v1 === undefined || v2 === undefined || v3 === undefined) return;
    const P = n => [pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]];
    const d02 = vlen(vsub(P(v0), P(v2))), d13 = vlen(vsub(P(v1), P(v3)));
    let t;
    if (d02 < d13) t = [v0, v1, v2, v0, v2, v3]; else t = [v0, v1, v3, v1, v2, v3];
    if (!flip) t = [t[0], t[2], t[1], t[3], t[5], t[4]];
    idx.push(...t);
  };
  for (const [key] of cellV) {
    const i = key % (nx - 1), j = Math.floor(key / (nx - 1)) % (ny - 1), k = Math.floor(key / ((nx - 1) * (ny - 1)));
    const v000 = vals[id(i, j, k)];
    // x edge from (i,j,k) to (i+1,j,k): shared by cells (i, j-1..j, k-1..k)
    if (j > 0 && k > 0) {
      const v1 = vals[id(i + 1, j, k)];
      if ((v000 < 0) !== (v1 < 0)) quad(cellV.get(cellKey(i, j - 1, k - 1)), cellV.get(cellKey(i, j, k - 1)), cellV.get(cellKey(i, j, k)), cellV.get(cellKey(i, j - 1, k)), v000 < 0);
    }
    if (i > 0 && k > 0) {
      const v1 = vals[id(i, j + 1, k)];
      if ((v000 < 0) !== (v1 < 0)) quad(cellV.get(cellKey(i - 1, j, k - 1)), cellV.get(cellKey(i - 1, j, k)), cellV.get(cellKey(i, j, k)), cellV.get(cellKey(i, j, k - 1)), v000 < 0);
    }
    if (i > 0 && j > 0) {
      const v1 = vals[id(i, j, k + 1)];
      if ((v000 < 0) !== (v1 < 0)) quad(cellV.get(cellKey(i - 1, j - 1, k)), cellV.get(cellKey(i, j - 1, k)), cellV.get(cellKey(i, j, k)), cellV.get(cellKey(i - 1, j, k)), v000 < 0);
    }
  }
  const P = new Float32Array(pos);
  // project onto the surface
  const e = h * 0.15;
  for (let it = 0; it < (opts.project || 3); it++) {
    for (let n = 0; n < P.length; n += 3) {
      const x = P[n], y = P[n + 1], z = P[n + 2];
      const d = sdf(x, y, z);
      const gx = (sdf(x + e, y, z) - sdf(x - e, y, z)) / (2 * e);
      const gy = (sdf(x, y + e, z) - sdf(x, y - e, z)) / (2 * e);
      const gz = (sdf(x, y, z + e) - sdf(x, y, z - e)) / (2 * e);
      const g2 = gx * gx + gy * gy + gz * gz;
      if (g2 < 1e-8) continue;
      let sx = d * gx / g2, sy = d * gy / g2, sz = d * gz / g2;
      const sl = Math.hypot(sx, sy, sz), lim = h * 0.75;
      if (sl > lim) { sx *= lim / sl; sy *= lim / sl; sz *= lim / sl; }
      P[n] = x - sx; P[n + 1] = y - sy; P[n + 2] = z - sz;
    }
  }
  return { pos: P, idx: new Uint32Array(idx), evals };
}

function gradNormal(sdf, x, y, z, e) {
  e = e || 0.0006;
  const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
  const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
  const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}

// compact: drop unused vertices
function compact(pos, idx, extra) {
  const map = new Int32Array(pos.length / 3).fill(-1);
  let n = 0;
  const out = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) { const v = idx[i]; if (map[v] < 0) map[v] = n++; out[i] = map[v]; }
  const P = new Float32Array(n * 3);
  const ex = extra ? extra.map(a => new Float32Array(n * a.stride)) : [];
  for (let v = 0; v < map.length; v++) {
    const t = map[v]; if (t < 0) continue;
    P[t * 3] = pos[v * 3]; P[t * 3 + 1] = pos[v * 3 + 1]; P[t * 3 + 2] = pos[v * 3 + 2];
    if (extra) extra.forEach((a, q) => { for (let s = 0; s < a.stride; s++) ex[q][t * a.stride + s] = a.data[v * a.stride + s]; });
  }
  return { pos: P, idx: out, extra: ex };
}

module.exports = { sminP, smaxP, ell, rc, sph, axesYZ, evalChain, mesh, gradNormal, compact, vsub, vadd, vmul, vdot, vlen, vnorm, vcross, P3 };
