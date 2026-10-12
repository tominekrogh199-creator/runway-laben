'use strict';
const S = require('./sdf.js');
const B = require('./body.js');
const SH = require('./shoes.js');
const E = require('../engine.js');
const { MeshoptSimplifier } = require('meshoptimizer');
const fs = require('fs');
const sm = B.smoothstep;
const args = process.argv.slice(2);
const H = parseFloat(args[0] || '0.0035');
const ERR = parseFloat(args[1] || '0.0004');
const REUSE = args.includes('reuse');

function adjacency(nv, idx) {
  const adj = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    adj[a].add(b); adj[a].add(c); adj[b].add(a); adj[b].add(c); adj[c].add(a); adj[c].add(b);
  }
  return adj.map(s => Int32Array.from(s));
}
const b64 = ta => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');

async function buildBody() {
  let pos, idx;
  if (REUSE && fs.existsSync('body_pos.bin')) {
    const pb = fs.readFileSync('body_pos.bin'), ib = fs.readFileSync('body_idx.bin');
    pos = new Float32Array(pb.buffer.slice(pb.byteOffset, pb.byteOffset + pb.byteLength));
    idx = new Uint32Array(ib.buffer.slice(ib.byteOffset, ib.byteOffset + ib.byteLength));
  } else {
    const t0 = Date.now();
    const raw = S.mesh(B.bodySDF, [-0.46, -0.004, -0.24], [0.46, 1.83, 0.27], H);
    console.log('body raw', raw.pos.length / 3, 's', (Date.now() - t0) / 1000);
    const nv = raw.pos.length / 3;
    const attr = new Float32Array(nv * 2);
    for (let v = 0; v < nv; v++) {
      const x = raw.pos[v * 3], y = raw.pos[v * 3 + 1], z = raw.pos[v * 3 + 2];
      attr[v * 2] = Math.max(-1, Math.min(1, B.suitField(x, y, z) / 0.01));
      attr[v * 2 + 1] = Math.max(-1, Math.min(1, B.hairField(x, y, z) / 0.006));
    }
    // magnify small detailed parts so the simplifier keeps more of them
    const P2 = new Float32Array(raw.pos);
    const Hc = B.Hc;
    for (let v = 0; v < nv; v++) {
      const x = raw.pos[v * 3], y = raw.pos[v * 3 + 1], z = raw.pos[v * 3 + 2];
      let sc = 1;
      if (y > 1.52) sc = 2.6;
      else if (y < 0.98 && Math.abs(x) > 0.27) sc = 1.8;   // hands
      else if (y < 0.1) sc = 1.4;                          // feet
      if (sc !== 1) { P2[v * 3] = x * sc; P2[v * 3 + 1] = y * sc; P2[v * 3 + 2] = z * sc; }
    }
    void Hc;
    const [sidx] = MeshoptSimplifier.simplifyWithAttributes(raw.idx, P2, 3, attr, 2, [0.006, 0.01], null, 0, ERR, ['ErrorAbsolute']);
    const c = S.compact(raw.pos, sidx);
    pos = c.pos; idx = c.idx;
    fs.writeFileSync('body_pos.bin', Buffer.from(pos.buffer));
    fs.writeFileSync('body_idx.bin', Buffer.from(idx.buffer));
  }
  const nv = pos.length / 3;
  console.log('body verts', nv, 'tris', idx.length / 3);
  // normals from the SDF
  const nrm = new Int8Array(nv * 4);
  for (let v = 0; v < nv; v++) {
    const n = S.gradNormal(B.bodySDF, pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], 0.0007);
    nrm[v * 4] = Math.round(n[0] * 127); nrm[v * 4 + 1] = Math.round(n[1] * 127); nrm[v * 4 + 2] = Math.round(n[2] * 127);
  }
  // skin weights
  const NB = E.BONES.length, BI = B.BI;
  const neighbors = E.BONES.map(b => E.BONE_NEIGHBORS[b].map(n => BI[n]));
  const torsoSet = new Set([BI.pelvis, BI.spine, BI.chest]);
  const W = new Float32Array(nv * NB);
  const dist = new Float64Array(NB);
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    B.boneDist(x, y, z, dist);
    let bs = 0;
    for (let b = 1; b < NB; b++) if (dist[b] < dist[bs]) bs = b;
    const cand = [bs, ...neighbors[bs]];
    // keep left and right apart
    let tot = 0;
    for (const b of cand) {
      const name = E.BONES[b];
      if (x > 0.012 && /R$/.test(name)) continue;
      if (x < -0.012 && /L$/.test(name)) continue;
      let tau = 0.012;
      if (torsoSet.has(b) && torsoSet.has(bs)) tau = 0.03;
      else if (/^clav/.test(name) || /^clav/.test(E.BONES[bs])) tau = 0.02;
      else if (name === 'neck' || name === 'head') tau = 0.015;
      else if (/^pony/.test(name)) tau = 0.008;
      const w = Math.exp(-(dist[b] - dist[bs]) / tau);
      W[v * NB + b] = w; tot += w;
    }
    for (let b = 0; b < NB; b++) W[v * NB + b] /= tot;
    void 0;
    // torso share distributed by height
    let share = 0;
    for (const b of torsoSet) share += W[v * NB + b];
    if (share > 0) {
      const wp = 1 - sm(0.99, 1.1, y), wc = sm(1.13, 1.25, y), ws = Math.max(0, 1 - wp - wc);
      W[v * NB + BI.pelvis] = share * wp; W[v * NB + BI.chest] = share * wc; W[v * NB + BI.spine] = share * ws;
    }
  }
  // toes: same bend zone as the shoes
  for (let v = 0; v < nv; v++) {
    for (const sd of ['L', 'R']) {
      const f = BI['foot' + sd], t = BI['toe' + sd];
      const tot = W[v * NB + f] + W[v * NB + t];
      if (tot < 0.05) continue;
      const wt = sm(0.098, 0.148, pos[v * 3 + 2]);
      W[v * NB + t] = tot * wt; W[v * NB + f] = tot * (1 - wt);
    }
  }
  // smooth weights over the mesh
  const adj = adjacency(nv, idx);
  for (let it = 0; it < 4; it++) {
    const W2 = new Float32Array(W.length);
    for (let v = 0; v < nv; v++) {
      const nb = adj[v];
      for (let b = 0; b < NB; b++) {
        let s = 0; for (let j = 0; j < nb.length; j++) s += W[nb[j] * NB + b];
        W2[v * NB + b] = W[v * NB + b] * 0.5 + (nb.length ? s / nb.length * 0.5 : W[v * NB + b] * 0.5);
      }
    }
    W.set(W2);
  }
  // pick four
  const si = new Uint8Array(nv * 4), sw = new Uint8Array(nv * 4);
  for (let v = 0; v < nv; v++) {
    const arr = [];
    for (let b = 0; b < NB; b++) arr.push([W[v * NB + b], b]);
    arr.sort((p, q) => q[0] - p[0]);
    const top = arr.slice(0, 4).filter(p => p[0] > 0.004);
    const t = top.reduce((s, p) => s + p[0], 0);
    let acc = 0;
    top.forEach((p, k) => {
      si[v * 4 + k] = p[1];
      const q = k === top.length - 1 ? 255 - acc : Math.round(p[0] / t * 255);
      sw[v * 4 + k] = q; acc += q;
    });
  }
  // regions
  const reg = new Uint8Array(nv * 2);
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let arm = 0, ponyW = 0, headW = 0;
    for (let k = 0; k < 4; k++) {
      const n = E.BONES[si[v * 4 + k]], w = sw[v * 4 + k] / 255;
      if (/^(uarm|farm|hand)/.test(n)) arm += w;
      if (/^pony/.test(n)) ponyW += w;
      if (n === 'head') headW += w;
    }
    let suit = 0.5 + B.suitField(x, y, z) / 0.02;
    if (arm > 0.55) suit = Math.min(suit, 0);
    let hair = 0.5 + B.hairField(x, y, z) / 0.006;
    if (headW + ponyW < 0.3) hair = 0;
    if (ponyW > 0.5) hair = 1;
    reg[v * 2] = Math.round(Math.max(0, Math.min(1, suit)) * 255);
    reg[v * 2 + 1] = Math.round(Math.max(0, Math.min(1, hair)) * 255);
  }
  const q = new Int16Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) q[i] = Math.round(pos[i] * 16000);
  const index = nv < 65536 ? new Uint16Array(idx) : idx;
  return { n: nv, pos: b64(q), nrm: b64(nrm), si: b64(si), sw: b64(sw), reg: b64(reg), idx: b64(index), i32: nv >= 65536 ? 1 : 0 };
}

function buildShoe(kind) {
  const { sdf, sh, M } = SH.makeShoeSDF(kind);
  const raw = S.mesh(sdf, [-0.07, -0.003, -0.11], [0.07, 0.2, 0.26], 0.0022, { project: 3 });
  const [sidx] = MeshoptSimplifier.simplify(raw.idx, raw.pos, 3, 0, 0.00025, ['ErrorAbsolute']);
  const c = S.compact(raw.pos, sidx);
  const pos = c.pos, nv = pos.length / 3;
  const nrm = new Int8Array(nv * 4), wt = new Uint8Array(nv);
  for (let v = 0; v < nv; v++) {
    const n = S.gradNormal(sdf, pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], 0.0006);
    nrm[v * 4] = Math.round(n[0] * 127); nrm[v * 4 + 1] = Math.round(n[1] * 127); nrm[v * 4 + 2] = Math.round(n[2] * 127);
    wt[v] = Math.round(sm(M[2] - 0.03, M[2] + 0.02, pos[v * 3 + 2]) * 255);
  }
  // footprint outline(s) at the floor
  const outline = (cx, cz, n) => {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const an = k / n * Math.PI * 2, dx = Math.sin(an), dz = Math.cos(an);
      let lo = 0, hi = 0.2;
      for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (sdf(cx + dx * mid, 0.002, cz + dz * mid) < 0) lo = mid; else hi = mid; }
      pts.push([+(cx + dx * lo).toFixed(4), +(cz + dz * lo).toFixed(4)]);
    }
    return pts;
  };
  const prints = kind === 'heel' ? [outline(0, 0.17, 40), outline(0, -0.025, 12)] : [outline(0, 0.075, 48)];
  const q = new Int16Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) q[i] = Math.round(pos[i] * 16000);
  console.log(kind, 'shoe verts', nv, 'tris', c.idx.length / 3);
  return { n: nv, pos: b64(q), nrm: b64(nrm), wt: b64(wt), idx: b64(new Uint16Array(c.idx)), prints, M: M.slice() };
}

async function main() {
  await MeshoptSimplifier.ready;
  MeshoptSimplifier.useExperimentalFeatures = true;
  const body = await buildBody();
  const shoes = { heel: buildShoe('heel'), flat: buildShoe('flat') };
  const out = { body, shoes };
  fs.writeFileSync('../meshdata.js', 'const MESH = ' + JSON.stringify(out) + ';\n');
  console.log('meshdata bytes', fs.statSync('../meshdata.js').size);
}
main();
