// Shoe SDFs (left shoe, shoe frame: x = left, y = up, z = forward, sole on y = 0)
'use strict';
const S = require('./sdf.js');
const B = require('./body.js');
const E = require('../engine.js');
const { rc, ell } = S;
const sm = B.smoothstep;

const footPrims = [], toePrims = [];
for (const pt of B.parts) {
  if (pt.name !== 'legL') continue;
  for (const q of pt.prims) {
    if (q.bone === B.BI.footL) footPrims.push(q);
    else if (q.bone === B.BI.toeL) toePrims.push(q);
  }
}
const ANK = [0.085, E.G.ankleH, 0];
const MTP = [0.085 + E.FOOT.mtp.x, E.G.ankleH + E.FOOT.mtp.y, E.FOOT.mtp.z];

function makeShoeSDF(kind) {
  const sh = E.SHOES[kind];
  const a = sh.alpha, ca = Math.cos(a), sa = Math.sin(a);
  const A = [sh.A.x, sh.A.y, sh.A.z], M = [sh.M.x, sh.M.y, sh.M.z];
  // shoe -> foot-local (inverse of rotX(alpha))
  const toFoot = (x, y, z) => { const dx = x - A[0], dy = y - A[1], dz = z - A[2]; return [dx, dy * ca + dz * sa, -dy * sa + dz * ca]; };
  function foot(x, y, z) {
    const f = toFoot(x, y, z);
    const fx = f[0] + ANK[0], fy = f[1] + ANK[1], fz = f[2] + ANK[2];
    let d = S.evalChain(footPrims, fx, fy, fz);
    const tx = x - M[0] + MTP[0], ty = y - M[1] + MTP[1], tz = z - M[2] + MTP[2];
    d = S.sminP(d, S.evalChain(toePrims, tx, ty, tz), 0.01);
    return d;
  }
  const heel = kind === 'heel';
  const toeBox = heel
    ? rc([0, M[1] - 0.005, M[2] + 0.03], [0, 0.011, sh.toe.z + 0.004], 0.031, 0.0035, { w: [0, 1, 0], s: 0.5 })
    : rc([0, M[1] - 0.006, M[2] + 0.03], [0, 0.012, sh.toe.z - 0.004], 0.031, 0.013, { w: [0, 1, 0], s: 0.62 });
  const topline = zl => heel
    ? 0.056 - 0.032 * sm(-0.045, 0.0, zl) + 0.08 * sm(0.07, 0.108, zl)
    : 0.046 - 0.024 * sm(-0.045, 0.0, zl) + 0.08 * sm(0.088, 0.122, zl);
  function upper(x, y, z) {
    let d = foot(x, y, z) - (heel ? 0.0034 : 0.0032) - 0.002 * sm(M[2] - 0.02, M[2] + 0.03, z);
    d = S.sminP(d, toeBox.f(x, y, z), 0.025);
    const f = toFoot(x, y, z);
    const cut = f[1] - (-E.G.ankleH + topline(f[2]));
    return S.smaxP(d, cut, 0.002);
  }
  const stil = heel ? rc([0, 0.088, -0.021], [0, 0.0, -0.025], 0.0135, 0.0042, { w: [1, 0, 0], s: 0.85 }) : null;
  const heelCap = heel ? ell([0, 0.087, -0.02], [0.021, 0.011, 0.025]) : null;
  function sdf(x, y, z) {
    let d = upper(x, y, z);
    // sole
    let sole;
    if (heel) {
      const fore = Math.max(upper(x, 0.012, z) - 0.0008, Math.abs(y - 0.0045) - 0.0045, (M[2] - 0.055) - z);
      const f = toFoot(x, y, z);
      const fx = f[0] + ANK[0], fz = f[2] + ANK[2];
      const outline = S.evalChain(footPrims, fx, ANK[1] - E.G.ankleH + 0.006, fz) - 0.003;
      const rear = Math.max(outline, Math.abs(f[1] + E.G.ankleH + 0.0045) - 0.0045, f[2] - 0.11);
      sole = S.sminP(fore, rear, 0.012);
      sole = S.sminP(sole, stil.f(x, y, z), 0.006);
    } else {
      sole = Math.max(upper(x, 0.013, z) - 0.0006, Math.abs(y - 0.0045) - 0.0045);
    }
    d = S.sminP(d, sole, 0.003);
    return Math.max(d, -y);
  }
  return { sdf, sh, M };
}
module.exports = { makeShoeSDF };
