// ================= Skinned mannequin (three.js r128) =================
const MANNEQUIN = (function () {
  function dec(s, T) {
    const bin = atob(s), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new T(u8.buffer);
  }
  const col = h => new THREE.Color(h).convertSRGBToLinear();
  let bodyGeo = null, shoeGeo = null, restInv = null, shoeRestInv = null;

  function buildGeometry(D, mirror) {
    const n = D.n;
    const q = dec(D.pos, Int16Array), nr = dec(D.nrm, Int8Array);
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = q[i * 3] / 16000 * (mirror ? -1 : 1); pos[i * 3 + 1] = q[i * 3 + 1] / 16000; pos[i * 3 + 2] = q[i * 3 + 2] / 16000;
      nrm[i * 3] = nr[i * 4] / 127 * (mirror ? -1 : 1); nrm[i * 3 + 1] = nr[i * 4 + 1] / 127; nrm[i * 3 + 2] = nr[i * 4 + 2] / 127;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    let idx = D.i32 ? dec(D.idx, Uint32Array) : dec(D.idx, Uint16Array);
    if (mirror) { idx = idx.slice(); for (let t = 0; t < idx.length; t += 3) { const a = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = a; } }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }

  function frameMatrix(F, m) {
    return m.set(
      F.x.x, F.y.x, F.z.x, F.o.x,
      F.x.y, F.y.y, F.z.y, F.o.y,
      F.x.z, F.y.z, F.z.z, F.o.z,
      0, 0, 0, 1);
  }

  function init() {
    if (bodyGeo) return;
    const B = MESH.body;
    bodyGeo = buildGeometry(B, false);
    bodyGeo.setAttribute('skinIndex', new THREE.BufferAttribute(dec(B.si, Uint8Array), 4));
    bodyGeo.setAttribute('skinWeight', new THREE.BufferAttribute(dec(B.sw, Uint8Array), 4, true));
    bodyGeo.setAttribute('aReg', new THREE.BufferAttribute(dec(B.reg, Uint8Array), 2, true));
    const RF = boneFrames(restPose(), 0);
    restInv = RF.map(F => frameMatrix(F, new THREE.Matrix4()).invert());
    shoeGeo = {};
    shoeRestInv = {};
    for (const kind of ['heel', 'flat']) {
      const D = MESH.shoes[kind];
      const wt = dec(D.wt, Uint8Array);
      shoeGeo[kind] = [false, true].map(mir => {
        const g = buildGeometry(D, mir);
        const si = new Uint8Array(D.n * 4), sw = new Uint8Array(D.n * 4);
        for (let i = 0; i < D.n; i++) { si[i * 4] = 0; si[i * 4 + 1] = 1; sw[i * 4] = 255 - wt[i]; sw[i * 4 + 1] = wt[i]; }
        g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
        g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true));
        return g;
      });
      const M = D.M;
      shoeRestInv[kind] = [new THREE.Matrix4(), new THREE.Matrix4().makeTranslation(-M[0], -M[1], -M[2])];
    }
  }

  function skinMaterial(suitHex) {
    const m = new THREE.MeshStandardMaterial({ skinning: true, roughness: 0.55, metalness: 0, color: 0xffffff });
    m.extensions = { derivatives: true };
    const U = {
      uSkin: { value: col('#C9967A') }, uSuit: { value: col(suitHex) }, uHair: { value: col('#2A1D17') },
      uRough: { value: new THREE.Vector3(0.52, 0.42, 0.32) }, uSheen: { value: 0.0 },
    };
    m.userData.U = U;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aReg;\nvarying vec2 vReg;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvReg = aReg;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uSkin;\nuniform vec3 uSuit;\nuniform vec3 uHair;\nuniform vec3 uRough;\nvarying vec2 vReg;\nfloat gSuit; float gHair;')
        .replace('#include <color_fragment>', [
          '#include <color_fragment>',
          'float fwS = max(fwidth(vReg.x) * 1.2, 0.002);',
          'float fwH = max(fwidth(vReg.y) * 1.2, 0.002);',
          'gSuit = smoothstep(0.5 - fwS, 0.5 + fwS, vReg.x);',
          'gHair = smoothstep(0.5 - fwH, 0.5 + fwH, vReg.y);',
          'float seam = 1.0 - smoothstep(0.0, fwS * 3.0, abs(vReg.x - 0.53));',
          'vec3 cc = mix(uSkin, uSuit * (1.0 - 0.25 * seam * gSuit), gSuit);',
          'cc = mix(cc, uHair, gHair);',
          'diffuseColor.rgb *= cc;',
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(uRough.x, uRough.y, gSuit), uRough.z, gHair);');
    };
    return m;
  }

  const SHOE_MAT = {};
  function shoeMaterial(kind) {
    if (!SHOE_MAT[kind]) SHOE_MAT[kind] = new THREE.MeshStandardMaterial({ skinning: true, color: col(kind === 'heel' ? '#141215' : '#1E1A1B'), roughness: kind === 'heel' ? 0.17 : 0.48, metalness: 0 });
    return SHOE_MAT[kind];
  }

  class Mannequin {
    constructor(suitHex, kind) {
      init();
      this.group = new THREE.Group();
      this.kind = kind;
      this.bones = restInv.map(() => new THREE.Bone());
      this.skeleton = new THREE.Skeleton(this.bones, restInv);
      this.material = skinMaterial(suitHex);
      this.body = new THREE.SkinnedMesh(bodyGeo, this.material);
      this.body.bind(this.skeleton, new THREE.Matrix4());
      this.body.frustumCulled = false;
      this.body.castShadow = true; this.body.receiveShadow = true;
      this.group.add(this.body);
      this.shoes = [0, 1].map(side => {
        const bones = [new THREE.Bone(), new THREE.Bone()];
        const sk = new THREE.Skeleton(bones, shoeRestInv[kind]);
        const m = new THREE.SkinnedMesh(shoeGeo[kind][side], shoeMaterial(kind));
        m.bind(sk, new THREE.Matrix4());
        m.frustumCulled = false; m.castShadow = true;
        this.group.add(m);
        return { mesh: m, bones };
      });
      this._m = new THREE.Matrix4();
    }
    setSuit(hex) { this.material.userData.U.uSuit.value.copy(col(hex)); }
    setXray(on) {
      this.material.transparent = on; this.material.opacity = on ? 0.42 : 1; this.material.depthWrite = !on; this.material.needsUpdate = true;
      this.body.castShadow = !on;
      this.shoes.forEach(s => {
        if (on && !s.xmat) { s.xmat = s.mesh.material.clone(); s.xmat.transparent = true; s.xmat.opacity = 0.5; s.xmat.depthWrite = false; }
        s.mesh.material = on ? s.xmat : shoeMaterial(this.kind);
      });
    }
    pose(p, shoe, pony) {
      const F = boneFrames(p, shoe.alpha, pony);
      for (let i = 0; i < F.length; i++) {
        const b = this.bones[i];
        frameMatrix(F[i], b.matrixWorld);
      }
      ['footL', 'footR'].forEach((k, side) => {
        const ft = p[k], B = ft.basis;
        const o = sub(ft.ankle, applyB(B, shoe.A));
        const bs = this.shoes[side].bones;
        frameMatrix({ o, x: B.l, y: B.u, z: B.f }, bs[0].matrixWorld);
        const ct = Math.cos(ft.tb), st = Math.sin(ft.tb);
        const mo = add(o, applyB(B, shoe.M));
        frameMatrix({ o: mo, x: B.l, y: sub(mul(B.u, ct), mul(B.f, st)), z: add(mul(B.u, st), mul(B.f, ct)) }, bs[1].matrixWorld);
      });
    }
    dispose() { this.material.dispose(); this.shoes.forEach(s => { if (s.xmat) s.xmat.dispose(); }); }
  }

  // ponytail: chain follows the head with lag (deterministic in time)
  function ponyChain(W, t, p) {
    const base = ponyRest(p);
    const dt = 0.045, past = [p.head];
    for (let k = 1; k <= 4; k++) past.push(evalPose(W, t - k * dt).head);
    const vbar = mul(sub(past[0], past[4]), 1 / (4 * dt));
    const pts = [base[0]];
    for (let k = 1; k < base.length; k++) {
      const rest = norm(sub(base[k], base[k - 1]));
      const L = vlen(sub(base[k], base[k - 1]));
      const lagK = Math.min(k, 4);
      const inert = add(sub(past[lagK], past[0]), mul(vbar, lagK * dt));
      const dir = norm(add(add(rest, V(0, -0.12 * k, 0)), mul(inert, 7)));
      pts.push(axpy(pts[k - 1], dir, L));
    }
    return pts;
  }

  return { Mannequin, ponyChain, init };
})();
