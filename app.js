(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const DEG = Math.PI / 180;
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('rwlab.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rwlab.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const stage = $('#stage'), glCanvas = $('#gl'), ovCanvas = $('#ov'), labelsEl = $('#vpLabels');
  const ctx = ovCanvas.getContext('2d');
  const article = $('#lesson');

  if (typeof THREE === 'undefined') {
    stage.insertAdjacentHTML('beforeend', '<p class="paused-badge">3D-biblioteket lastet ikke. Last inn siden på nytt.</p>');
    return;
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
  } catch (e) {
    stage.insertAdjacentHTML('beforeend', '<p class="paused-badge">Denne enheten støtter ikke WebGL.</p>');
    return;
  }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const col = h => new THREE.Color(h).convertSRGBToLinear();
  const STAGE_BG = '#0C0B0E';
  const MOBILE = Math.min(screen.width, screen.height) < 700;
  const scene = new THREE.Scene();
  scene.background = col(STAGE_BG);
  scene.fog = new THREE.Fog(col(STAGE_BG), 9, 26);

  // soft studio environment (procedural softboxes, prefiltered once)
  (function studioEnv() {
    const env = new THREE.Scene();
    env.background = col('#141218');
    const box = (w, h, x, y, z, c, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col(c), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 1, 0); env.add(m);
    };
    box(6, 3, 0, 7, 4, '#FFF4EA');      // big overhead key softbox (front)
    box(2.2, 6, -6, 2.5, -1, '#C9D4FF'); // cool strip (left back)
    box(2.2, 6, 6, 2.5, -2, '#FFE2EC');  // warm strip (right back)
    box(8, 1.5, 0, -1.5, 5, '#1E1B22');  // floor bounce
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  })();

  // backdrop: vertical gradient haze behind the runway
  (function backdrop() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#060507'); gr.addColorStop(0.5, '#1A1720'); gr.addColorStop(0.78, '#2A2531'); gr.addColorStop(1, '#0C0B0E');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    scene.background = t;
  })();

  scene.add(new THREE.HemisphereLight(col('#F2EEF6'), col('#201C24'), 0.32));
  const key = new THREE.DirectionalLight(col('#FFF3E8'), 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.012;
  Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 0.5, far: 9 });
  scene.add(key); scene.add(key.target);
  const rim = new THREE.DirectionalLight(col('#B4C2FF'), 1.3); rim.position.set(-3, 3.5, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(col('#FFD6C4'), 0.8); rim2.position.set(3.5, 2.5, -3.5); scene.add(rim2);
  const fill = new THREE.DirectionalLight(col('#FFE6EE'), 0.3); fill.position.set(-2, 1.4, 3); scene.add(fill);

  // ---------- floor ----------
  function floorTexture() {
    const c = document.createElement('canvas'); c.width = 640; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#0F0E11'; g.fillRect(0, 0, 640, 512);
    const px = 64, cx = 320, hw = 1.1 * px;
    g.fillStyle = '#1E1C21'; g.fillRect(cx - hw, 0, hw * 2, 512);
    g.fillStyle = '#4A4550'; g.fillRect(cx - hw - 1, 0, 2, 512); g.fillRect(cx + hw - 1, 0, 2, 512);
    g.fillStyle = '#4E4858';
    for (let y = 0; y < 512; y += 32) { const L = y % 64 === 0 ? 14 : 8; g.fillRect(cx - hw, y, L, 2); g.fillRect(cx + hw - L, y, L, 2); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 5);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.74, metalness: 0.0, envMapIntensity: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const tapeMat = new THREE.MeshBasicMaterial({ color: col('#FF3D8B') });
  const planeGeo = new THREE.PlaneGeometry(1, 1);

  // ---------- cameras ----------
  const CAMS = {
    front: { az: 0, el: 3, fov: 24 },
    side: { az: 90, el: 3, fov: 26 },
    back: { az: 180, el: 6, fov: 26 },
    top: { az: 0, el: 58, fov: 40, ty: 0.2, fixed: 4.2, lead: -0.5 },
    threeq: { az: 34, el: 7, fov: 26 },
    low: { az: 18, el: -8, fov: 70, ty: 0.45, fixed: 2.2 },
    eye: { az: 18, el: 4, fov: 30 },
    tele: { az: 18, el: 3, fov: 7 },
    turn: { az: 40, el: 22, fov: 36, ty: 0.75, fixed: 5.3 },
  };
  const CAM_CHIPS = [['front', 'Forfra'], ['side', 'Siden'], ['back', 'Bakfra'], ['threeq', '¾'], ['top', 'Ovenfra'], ['low', 'Lav']];
  const FOCUS = {
    full: { name: 'Hele kroppen', ty: 0.95, hh: 1.0 },
    head: { name: 'Hode', ty: 1.58, hh: 0.24 },
    upper: { name: 'Overkropp', ty: 1.25, hh: 0.42 },
    hips: { name: 'Hofter', ty: 0.95, hh: 0.34 },
    knees: { name: 'Knær', ty: 0.52, hh: 0.34 },
    feet: { name: 'Føtter', ty: 0.16, hh: 0.3 },
  };
  const SUIT = { svak: ['#C9553A', '#B8732E', '#A6463E', '#D9845E'], sterk: ['#1E8F7B', '#2C7FA0', '#3B8A5A', '#4E9C98'], noytral: ['#6C7594', '#8B7FA0', '#7D8A9C', '#9A8F86'] };
  const TAGNAME = { svak: 'Svak', sterk: 'Sterk', noytral: 'Nøytral' };
  const GC = { floor: '#8EA8FF', footL: '#C6B3FF', footR: '#8FDDF5', com: '#FFC94D', head: '#FF6FB5', lines: '#6EE7C8', knee: '#B48CFF', gaze: '#7FD7FF', hands: '#FF9F5A', warn: '#FF5A4F', skel: '#F4F1FA', trail: '#FF8FC6', angle: '#FFE08A' };
  const GUIDES = [
    ['skel', 'Skjelett', GC.skel], ['trail', 'Bevegelsesspor', GC.trail], ['angles', 'Leddvinkler', GC.angle],
    ['floor', 'Midtlinje', GC.floor], ['feet', 'Fotspor', GC.footR], ['com', 'Tyngdepunkt', GC.com], ['head', 'Hodebane', GC.head],
    ['lines', 'Skulder og hofte', GC.lines], ['knee', 'Kne over fot', GC.knee], ['gaze', 'Blikk', GC.gaze], ['hands', 'Hender', GC.hands],
    ['timeline', 'Tidslinje', '#E9E4F2'],
  ];

  // ---------- state ----------
  const state = {
    idx: 0, cam: 'front', focus: 'full', userAz: 0, userEl: 0, zoom: 1, speed: 1, playing: !reduceMotion, simT: 0,
    guides: new Set(), mode: 'straight',
    sandbox: store.get('sandbox', {}), score: store.get('score', {}), ctx: 'ctxCouture',
  };
  let vps = [];

  class Viewport {
    constructor(cfg, lesson, colorHex) {
      this.cfg = Object.assign({}, cfg);
      this.lesson = lesson;
      this.color = colorHex;
      this.speed = cfg.speed || 1;
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
      this.rect = { x: 0, y: 0, w: 1, h: 1 };
      this.reach = { i: -1, v: 0 };
      this.build();
    }
    build() {
      const over = this.cfg.sandbox ? state.sandbox : this.cfg.over;
      const mode = this.lesson.mode === 'stand' ? 'stand' : state.mode;
      const W = makeWalkerState(this.cfg.w, over, mode);
      const kind = W.P.heel ? 'heel' : 'flat';
      if (!this.man || this.man.kind !== kind) {
        if (this.man) { scene.remove(this.man.group); this.man.dispose(); }
        this.man = new MANNEQUIN.Mannequin(this.color, kind);
        scene.add(this.man.group);
      }
      this.W = W;
      this.reach = { i: -1, v: 0 };
      if (this.tape) { scene.remove(this.tape); this.tape = null; }
      if (mode === 'runway') {
        const tg = new THREE.Group();
        const pl = W.plan;
        for (const w of pl.turns) {
          if (w.s < pl.period || w.s >= pl.period * 2) continue;
          const s0 = pl.steps[w.i0], ps = pl.steps[w.i0 - 1].psi;
          const mk = (sx, sz, ox) => {
            const q = new THREE.Mesh(planeGeo, tapeMat); q.rotation.x = -Math.PI / 2; q.scale.set(sx, sz, 1);
            const holder = new THREE.Group(); holder.add(q); q.position.set(0, 0, ox);
            holder.position.set(s0.c.x, 0.004, s0.c.z); holder.rotation.y = ps; tg.add(holder);
          };
          mk(0.34, 0.045, 0.06); mk(0.045, 0.2, -0.04);
        }
        this.tape = tg; scene.add(tg);
      }
      this.segment = null;
      if (this.lesson.segment && mode === 'runway') {
        const pl = W.plan; const w = pl.turns.find(x => x.s >= pl.period);
        if (w) this.segment = { a: w.s - 2.3, b: w.e + 2.6 };
      }
      this.t0 = this.segment ? 0 : 0.6;
    }
    time(simT) {
      const t = simT * this.speed + this.t0;
      if (this.segment) { const L = this.segment.b - this.segment.a; return this.segment.a + ((t % L) + L) % L; }
      return t;
    }
    setVisible(on) { this.man.group.visible = on; if (this.tape) this.tape.visible = on; }
    dispose() { scene.remove(this.man.group); this.man.dispose(); if (this.tape) scene.remove(this.tape); }
  }

  function placeCamera(vp, tRaw) {
    const forced = !!vp.cfg.cam;
    const pr = CAMS[vp.cfg.cam || state.cam] || CAMS.front;
    const fo = FOCUS[forced ? 'full' : state.focus] || FOCUS.full;
    const track = !!vp.lesson.camTrack;
    const heading = track ? 0 : camHeading(vp.W, tRaw);
    const C = lineCentre(vp.W, tRaw);
    const cam = vp.camera, r = vp.rect;
    cam.fov = pr.fov; cam.aspect = r.w / Math.max(1, r.h);
    const useFixed = pr.fixed && (forced || state.focus === 'full');
    let dist, ty;
    if (useFixed) { dist = pr.fixed; ty = pr.ty; }
    else {
      const tv = Math.tan(pr.fov * DEG / 2), th = tv * cam.aspect;
      dist = Math.max(fo.hh * 1.03 / tv, fo.hh * 0.6 / th) * 1.04;
      ty = fo.ty;
    }
    if (!forced) dist *= state.zoom;
    const az = (pr.az + (forced ? 0 : state.userAz)) * DEG;
    const el = clamp(pr.el + (forced ? 0 : state.userEl), -20, 86) * DEG;
    const hf = fwd(heading);
    const lead = useFixed ? (pr.lead || 0) : 0;
    const tgt = { x: C.x + hf.x * lead, y: ty, z: C.z + hf.z * lead };
    const dir = fwd(heading + az);
    cam.position.set(tgt.x + dir.x * Math.cos(el) * dist, tgt.y + Math.sin(el) * dist, tgt.z + dir.z * Math.cos(el) * dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(tgt.x, tgt.y, tgt.z);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    vp.camDist = dist; vp.target = tgt; vp.heading = heading;
  }

  // ---------- overlay guides ----------
  const _v = new THREE.Vector3(), _va = new THREE.Vector3(), _vb = new THREE.Vector3();
  function proj(cam, r, p) {
    _v.set(p.x, p.y, p.z).project(cam);
    return { x: r.x + (_v.x + 1) * 0.5 * r.w, y: r.y + (1 - _v.y) * 0.5 * r.h, ok: _v.z < 1 && _v.z > -1 };
  }
  function segClip(cam, r, a, b) {
    _va.set(a.x, a.y, a.z).applyMatrix4(cam.matrixWorldInverse);
    _vb.set(b.x, b.y, b.z).applyMatrix4(cam.matrixWorldInverse);
    const n = -cam.near - 0.02;
    if (_va.z > n && _vb.z > n) return null;
    if (_va.z > n) _va.lerp(_vb, (_va.z - n) / (_va.z - _vb.z));
    else if (_vb.z > n) _vb.lerp(_va, (_vb.z - n) / (_vb.z - _va.z));
    _va.applyMatrix4(cam.projectionMatrix); _vb.applyMatrix4(cam.projectionMatrix);
    return [r.x + (_va.x + 1) * 0.5 * r.w, r.y + (1 - _va.y) * 0.5 * r.h, r.x + (_vb.x + 1) * 0.5 * r.w, r.y + (1 - _vb.y) * 0.5 * r.h];
  }
  function line3(cam, r, a, b) {
    const s = segClip(cam, r, a, b); if (!s) return;
    ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]);
  }
  function poly3(cam, r, pts) {
    let started = false;
    for (const p of pts) {
      const q = proj(cam, r, p);
      if (!q.ok) { started = false; continue; }
      if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
    }
  }
  function dot2(cam, r, p, rad, fillStyle) {
    const q = proj(cam, r, p); if (!q.ok) return;
    ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fillStyle = fillStyle; ctx.fill();
  }
  function label(x, y, text, color, bg) {
    ctx.font = '600 10.5px "JetBrains Mono", ui-monospace, monospace';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = bg || 'rgba(16,14,20,.74)';
    ctx.fillRect(x - 3, y - 11, w + 6, 15);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function drawFloor(vp, p) {
    const cam = vp.camera, r = vp.rect, f = fwd(vp.heading), rt = rightV(vp.heading);
    const C = p.C, y = 0.003;
    const A = (s, o) => ({ x: C.x + f.x * s + rt.x * o, y, z: C.z + f.z * s + rt.z * o });
    ctx.save();
    ctx.lineWidth = 1.2; ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(236,233,242,.55)';
    ctx.beginPath(); line3(cam, r, A(-9, 0), A(9, 0)); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = GC.floor; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5;
    ctx.beginPath(); line3(cam, r, A(-9, 0.06), A(9, 0.06)); line3(cam, r, A(-9, -0.06), A(9, -0.06)); ctx.stroke();
    ctx.restore();
  }

  function drawFeet(vp, p) {
    if (vp.W.mode === 'stand') return;
    const cam = vp.camera, r = vp.rect, pl = vp.W.plan, S = pl.steps, T = p.Traw;
    const prints = MESH.shoes[vp.W.P.heel ? 'heel' : 'flat'].prints;
    const i1 = p.i, i0 = bsearch(pl.tArr, T - 3.6);
    for (let i = i0; i <= i1; i++) {
      const s = S[i];
      const age = Math.max(0, T - s.t);
      const a = clamp(1 - age / 3.6, 0, 1) * (i === i1 ? 1 : 0.8);
      const yaw = s.swivel && T > s.t + 0.55 * (s.stanceEnd - s.t) ? s.yawEnd : s.yaw;
      const colr = s.side === -1 ? GC.footL : GC.footR;
      const mir = s.side === -1 ? 1 : -1;
      const toW = (x, z) => { const q = rotY({ x: x * mir, y: 0.002, z }, yaw); return { x: s.O.x + q.x + p.off.x, y: 0.002, z: s.O.z + q.z + p.off.z }; };
      ctx.save();
      ctx.lineWidth = i === i1 ? 2.2 : 1.5;
      for (const poly of prints) {
        ctx.beginPath();
        poly3(cam, r, poly.map(q => toW(q[0], q[1])));
        ctx.closePath();
        ctx.globalAlpha = a * 0.45; ctx.fillStyle = colr; ctx.fill();
        ctx.globalAlpha = a * 0.95; ctx.strokeStyle = colr; ctx.stroke();
      }
      ctx.restore();
      if (vp.lesson.numberTurn && s.turn) {
        const w = pl.turns.find(t => i >= t.i0 && i <= t.i1);
        if (w) {
          const q = proj(cam, r, toW(0, 0.08));
          if (q.ok) {
            ctx.save(); ctx.globalAlpha = Math.max(0.35, a);
            ctx.beginPath(); ctx.arc(q.x, q.y, 8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(16,14,20,.85)'; ctx.fill();
            ctx.strokeStyle = colr; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = '700 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(i - w.i0 + 1), q.x, q.y + 0.5);
            ctx.restore();
          }
        }
      }
    }
  }

  function drawCom(vp, p) {
    const cam = vp.camera, r = vp.rect;
    const g = { x: p.com.x, y: 0.003, z: p.com.z };
    const ank = p.stanceA === -1 ? p.ankL : p.ankR;
    const ag = { x: ank.x, y: 0.003, z: ank.z };
    ctx.save();
    ctx.strokeStyle = GC.com; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
    ctx.beginPath(); line3(cam, r, axpy(p.com, UP, 0.75), g); ctx.stroke();
    ctx.setLineDash([2, 3]); ctx.lineWidth = 1.4;
    if (!p.stand) { ctx.beginPath(); line3(cam, r, g, ag); ctx.stroke(); }
    ctx.setLineDash([]);
    dot2(cam, r, p.com, 4, GC.com);
    dot2(cam, r, g, 3.5, GC.com);
    if (!p.stand) {
      const d = (ank.x - p.com.x) * p.f.x + (ank.z - p.com.z) * p.f.z;
      const m = proj(cam, r, lerp3(g, ag, 0.5));
      if (m.ok && Math.abs(d) > 0.06) label(m.x + 6, m.y - 6, cmTxt(Math.abs(d)), GC.com);
      if (vp.W.P.brake > 0.015 && p.T - p.A.t >= 0 && p.T - p.A.t < 0.22) {
        const q = proj(cam, r, { x: ank.x, y: 0.25, z: ank.z });
        if (q.ok) label(q.x + 8, q.y, 'BREMS', '#fff', 'rgba(255,90,79,.9)');
      }
    }
    ctx.restore();
  }

  function drawHead(vp, p, S) {
    if (!S) return;
    const cam = vp.camera, r = vp.rect;
    ctx.save();
    ctx.strokeStyle = GC.head; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); poly3(cam, r, S.map(q => q.head)); ctx.stroke();
    let lo = 9, hi = -9; for (const q of S) { lo = Math.min(lo, q.head.y); hi = Math.max(hi, q.head.y); }
    const a = proj(cam, r, { x: p.head.x, y: lo, z: p.head.z }), b = proj(cam, r, { x: p.head.x, y: hi, z: p.head.z });
    if (a.ok && b.ok) {
      const x = Math.max(a.x, b.x) + 22;
      ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(x - 4, a.y); ctx.lineTo(x + 4, a.y); ctx.moveTo(x - 4, b.y); ctx.lineTo(x + 4, b.y); ctx.moveTo(x, a.y); ctx.lineTo(x, b.y);
      ctx.stroke();
    }
    dot2(cam, r, p.head, 3.5, GC.head);
    ctx.restore();
  }

  function drawLines(vp, p) {
    const cam = vp.camera, r = vp.rect;
    const ext = (a, b, k) => [axpy(a, sub(a, b), k), axpy(b, sub(b, a), k)];
    const ref = (a, b, k) => {
      const m = lerp3(a, b, 0.5), d = sub(a, b); d.y = 0; const L = vlen(d) * (0.5 + k); const n = norm(d);
      return [axpy(m, n, L), axpy(m, n, -L)];
    };
    ctx.save();
    ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(110,231,200,.45)';
    ctx.beginPath();
    let q = ref(p.shL, p.shR, 0.35); line3(cam, r, q[0], q[1]);
    q = ref(p.hipL, p.hipR, 0.9); line3(cam, r, q[0], q[1]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 2.2; ctx.strokeStyle = GC.lines;
    ctx.beginPath();
    q = ext(p.shL, p.shR, 0.35); line3(cam, r, q[0], q[1]);
    q = ext(p.hipL, p.hipR, 0.9); line3(cam, r, q[0], q[1]);
    ctx.stroke();
    ctx.restore();
  }

  function drawKnee(vp, p) {
    const cam = vp.camera, r = vp.rect;
    ctx.save();
    for (const [hip, lg, knee] of [[p.hipL, p.legL, p.kneeL], [p.hipR, p.legR, p.kneeR]]) {
      ctx.strokeStyle = GC.knee; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5;
      ctx.beginPath(); line3(cam, r, hip, lg.ball); ctx.stroke();
      ctx.globalAlpha = 1;
      const bad = lg.medial > 0.012;
      if (bad) { ctx.strokeStyle = GC.warn; ctx.lineWidth = 2.5; ctx.beginPath(); line3(cam, r, lg.proj, knee); ctx.stroke(); }
      dot2(cam, r, knee, 4, bad ? GC.warn : GC.knee);
    }
    ctx.restore();
  }

  function drawGaze(vp, p) {
    const cam = vp.camera, r = vp.rect, d = p.fH, e = p.eye;
    let t = 6; if (d.y < -0.02) t = Math.min(6, -e.y / d.y);
    const end = axpy(e, d, t);
    ctx.save();
    ctx.strokeStyle = GC.gaze; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]);
    ctx.beginPath(); line3(cam, r, e, end); ctx.stroke(); ctx.setLineDash([]);
    const q = proj(cam, r, end);
    if (q.ok) { ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.stroke(); }
    dot2(cam, r, e, 3, GC.gaze);
    ctx.restore();
  }

  function drawHands(vp, p, S) {
    if (!S) return;
    const cam = vp.camera, r = vp.rect, n = Math.min(S.length, 25);
    ctx.save(); ctx.strokeStyle = GC.hands; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); poly3(cam, r, S.slice(0, n).map(q => q.handL)); ctx.stroke();
    ctx.beginPath(); poly3(cam, r, S.slice(0, n).map(q => q.handR)); ctx.stroke();
    dot2(cam, r, p.handL, 3.5, GC.hands); dot2(cam, r, p.handR, 3.5, GC.hands);
    ctx.restore();
  }

  function drawTimeline(vp, p) {
    if (vp.W.mode === 'stand') return;
    const r = vp.rect, pl = vp.W.plan, S = pl.steps, T = p.Traw;
    const h = 34, x0 = r.x + 22, x1 = r.x + r.w - 8, y0 = r.y + r.h - h - 4;
    const ws = T - 3.2, we = T + 0.35, sx = t => x0 + (t - ws) / (we - ws) * (x1 - x0);
    ctx.save();
    ctx.fillStyle = 'rgba(16,14,20,.74)'; ctx.fillRect(r.x + 4, y0 - 2, r.w - 8, h + 2);
    ctx.font = '600 9px "JetBrains Mono", monospace'; ctx.fillStyle = '#BDB7C9'; ctx.textBaseline = 'middle';
    ctx.fillText('H', r.x + 9, y0 + 9); ctx.fillText('V', r.x + 9, y0 + 23);
    const i0 = bsearch(pl.tArr, ws - 1.5), i1 = bsearch(pl.tArr, we);
    for (let i = i0; i <= i1; i++) {
      const s = S[i]; const a = Math.max(s.t, ws), b = Math.min(s.stanceEnd, we);
      if (b <= a) continue;
      const yy = s.side === 1 ? y0 + 4 : y0 + 18;
      ctx.fillStyle = s.side === 1 ? GC.footR : GC.footL; ctx.globalAlpha = 0.85;
      ctx.fillRect(sx(a), yy, Math.max(1, sx(b) - sx(a)), 10);
      ctx.globalAlpha = 1;
      if (s.t >= ws) { ctx.fillStyle = '#fff'; ctx.fillRect(sx(s.t) - 0.5, yy - 2, 1.5, 14); }
    }
    ctx.fillStyle = '#FF3D8B'; ctx.fillRect(sx(T) - 1, y0, 2, h - 2);
    ctx.restore();
  }

  // skeleton as joints and segments
  function joints(vp, p) {
    const sh = vp.W.shoe;
    const foot = ft => {
      const fr = footFrames(ft, sh.alpha);
      const toe = axpy(fr[1].o, fr[1].z, 0.06);
      const heel = add(ft.ankle, add(mul(fr[0].y, FOOT.heel.y), mul(fr[0].z, FOOT.heel.z)));
      return { mtp: fr[1].o, toe, heel };
    };
    return { fl: foot(p.footL), fr: foot(p.footR) };
  }
  function skelSegments(vp, p) {
    const J = joints(vp, p);
    return [
      [p.root, p.lumbar], [p.lumbar, p.chest], [p.chest, p.neck], [p.neck, p.neckTop], [p.neckTop, p.head],
      [p.hipL, p.hipR], [p.scL, p.scR], [p.scL, p.shL], [p.scR, p.shR],
      [p.shL, p.elL], [p.elL, p.wrL], [p.wrL, p.handL], [p.shR, p.elR], [p.elR, p.wrR], [p.wrR, p.handR],
      [p.hipL, p.kneeL], [p.kneeL, p.ankL], [p.ankL, J.fl.mtp], [J.fl.mtp, J.fl.toe], [p.ankL, J.fl.heel],
      [p.hipR, p.kneeR], [p.kneeR, p.ankR], [p.ankR, J.fr.mtp], [J.fr.mtp, J.fr.toe], [p.ankR, J.fr.heel],
    ];
  }
  function drawSkeleton(vp, p) {
    const cam = vp.camera, r = vp.rect;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(14,12,18,.6)'; ctx.lineWidth = 4.5;
    ctx.beginPath(); for (const [a, b] of skelSegments(vp, p)) line3(cam, r, a, b); ctx.stroke();
    ctx.strokeStyle = GC.skel; ctx.lineWidth = 2;
    ctx.beginPath(); for (const [a, b] of skelSegments(vp, p)) line3(cam, r, a, b); ctx.stroke();
    for (const j of [p.root, p.lumbar, p.chest, p.neck, p.head, p.shL, p.shR, p.elL, p.elR, p.wrL, p.wrR, p.hipL, p.hipR, p.kneeL, p.kneeR, p.ankL, p.ankR]) {
      dot2(cam, r, j, 4.2, 'rgba(14,12,18,.7)'); dot2(cam, r, j, 3, j === p.kneeL || j === p.kneeR ? GC.knee : '#FF3D8B');
    }
    ctx.restore();
  }
  function drawTrail(vp, p, S) {
    if (!S) return;
    const cam = vp.camera, r = vp.rect;
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = GC.trail;
    for (let k = 6; k >= 1; k--) {
      const q = S[k * 2]; if (!q) continue;
      ctx.globalAlpha = 0.6 * (1 - k / 7.5); ctx.lineWidth = 1.6;
      ctx.beginPath(); for (const [a, b] of skelSegments(vp, q)) line3(cam, r, a, b); ctx.stroke();
    }
    ctx.restore();
  }
  const kneeFlex = (h, k, a) => { const u = sub(h, k), v = sub(a, k); return 180 - Math.acos(clamp(dot(u, v) / vlen(u) / vlen(v), -1, 1)) / DEG; };
  const hipFlex = (p, hip, knee) => { const d = norm(sub(knee, hip)); return Math.atan2(dot(d, p.fpP), -dot(d, p.upP)) / DEG; };
  function drawAngles(vp, p) {
    const cam = vp.camera, r = vp.rect;
    ctx.save();
    const arc = (center, a, b, txt, dy) => {
      const c = proj(cam, r, center), pa = proj(cam, r, a), pb = proj(cam, r, b);
      if (!c.ok || !pa.ok || !pb.ok) return;
      const a1 = Math.atan2(pa.y - c.y, pa.x - c.x), a2 = Math.atan2(pb.y - c.y, pb.x - c.x);
      let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      ctx.strokeStyle = GC.angle; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.x, c.y, 14, a1, a1 + d, d < 0); ctx.stroke();
      label(c.x + 12, c.y + 16 + (dy || 0), txt, GC.angle);
    };
    for (const s of ['L', 'R']) {
      const hip = p['hip' + s], knee = p['knee' + s], ank = p['ank' + s];
      const nm = s === 'L' ? 'V' : 'H', dy = s === 'L' ? 0 : 15;
      const kf = kneeFlex(hip, knee, ank);
      const extHip = axpy(knee, norm(sub(knee, hip)), 0.12);
      arc(knee, extHip, ank, nm + ' kne ' + Math.round(kf) + '°', dy);
      const hf = hipFlex(p, hip, knee);
      const down = axpy(hip, mul(p.upP, -1), 0.14);
      arc(hip, down, axpy(hip, norm(sub(knee, hip)), 0.14), nm + ' hofte ' + Math.round(hf) + '°', dy);
    }
    ctx.restore();
  }

  function drawGuides(vp, p, S) {
    const g = state.guides;
    if (g.has('floor')) drawFloor(vp, p);
    if (g.has('feet')) drawFeet(vp, p);
    if (g.has('trail')) drawTrail(vp, p, S);
    if (g.has('skel')) drawSkeleton(vp, p);
    if (g.has('knee')) drawKnee(vp, p);
    if (g.has('lines')) drawLines(vp, p);
    if (g.has('com')) drawCom(vp, p);
    if (g.has('hands')) drawHands(vp, p, S);
    if (g.has('gaze')) drawGaze(vp, p);
    if (g.has('head')) drawHead(vp, p, S);
    if (g.has('angles')) drawAngles(vp, p);
    if (g.has('timeline')) drawTimeline(vp, p);
  }

  // ---------- metrics ----------
  const nf = (x, d) => x.toFixed(d).replace('.', ',').replace('-', '−');
  const cmTxt = m => nf(m * 100, 1) + ' cm';
  const degTxt = a => Math.round(a / DEG) + '°';
  const range = (S, fn) => { let lo = Infinity, hi = -Infinity; for (const q of S) { const v = fn(q); lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi - lo; };
  const meanOf = (S, fn) => S.reduce((s, q) => s + fn(q), 0) / S.length;
  const nextTurn = (vp, s) => { const St = vp.W.plan.steps, k = St.indexOf(s); return k >= 0 && k + 1 < St.length && St[k + 1].turn; };
  function recentSteps(vp, p, n) { const St = vp.W.plan.steps, out = []; for (let k = p.i - n; k < p.i; k++) out.push(St[k]); return out; }
  const walking = vp => vp.W.mode !== 'stand';
  function phaseName(vp, ft) {
    if (ft.stance) {
      const u = ft.u;
      if (u < 0.1) return 'fotisett';
      if (u < 0.32) return 'tar imot vekten';
      if (u < vp.W.P.heelOff) return 'kroppen over foten';
      return 'hælen løftes, fraskyv';
    }
    const s = ft.s;
    if (s < 0.3) return 'kneet går frem';
    if (s < 0.72) return 'beinet svinger';
    return 'strekker ut mot fotisett';
  }
  const METRICS = {
    head: { s: 1, f: (vp, p, S) => {
      const T = S.filter(q => !(q.A && q.A.nearTurn));
      if (T.length < 12) return vp.headTxt || 'Hode ↕ –';
      vp.headTxt = 'Hode ↕ ' + cmTxt(range(T, q => q.head.y));
      return vp.headTxt;
    } },
    tempo: { f: (vp, p) => { if (!walking(vp)) return ''; const d = recentSteps(vp, p, 8).filter(s => !s.turn && !nextTurn(vp, s)).map(s => s.dur); if (d.length < 3) return 'Takt ±–'; const m = d.reduce((a, b) => a + b, 0) / d.length; const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) * (b - m), 0) / d.length); return 'Takt ±' + Math.round(sd / m * 100) + ' %'; } },
    cad: { f: (vp, p) => { if (!walking(vp)) return ''; const d = recentSteps(vp, p, 8).filter(s => !s.turn && !nextTurn(vp, s)).map(s => s.dur); if (d.length < 2) return '– steg/min'; const m = d.reduce((a, b) => a + b, 0) / d.length; return Math.round(60 / m) + ' steg/min'; } },
    width: { f: (vp, p) => { if (!walking(vp)) return ''; const st = recentSteps(vp, p, 6); const w = st.reduce((a, s) => a + dot(sub(s.O, s.c), rightV(s.psi)) * s.side, 0) / st.length; return w < 0 ? 'Kryss ' + cmTxt(-w) : 'Bredde ' + cmTxt(w); } },
    arm: { s: 1, f: (vp, p, S) => 'Armsving ' + cmTxt(Math.max(range(S, q => dot(sub(q.handL, q.root), q.f)), range(S, q => dot(sub(q.handR, q.root), q.f)))) },
    pelvis: { s: 1, f: (vp, p, S) => 'Bekkenvipp ' + degTxt(range(S, q => q.drop)) },
    knee: { s: 1, f: (vp, p, S) => 'Kne inn ' + cmTxt(Math.max(0, ...S.map(q => Math.max(q.legL.medial, q.legR.medial)))) },
    tilt: { s: 1, f: (vp, p, S) => 'Skuldervipp ' + degTxt(range(S, q => Math.atan2(q.shL.y - q.shR.y, Math.hypot(q.shL.x - q.shR.x, q.shL.z - q.shR.z)))) },
    lean: { s: 1, f: (vp, p, S) => { const a = meanOf(S, q => Math.asin(clamp(dot(q.upT, q.f), -1, 1))); return 'Overkropp ' + degTxt(Math.abs(a)) + (a >= 0 ? ' frem' : ' bak'); } },
    stack: { f: (vp, p) => { const d = dot(sub(p.chest, p.root), p.f); const h = dot(sub(p.head, p.root), p.f); return 'Brystkasse ' + cmTxt(Math.abs(d)) + (d >= 0 ? ' foran' : ' bak') + '\nHode ' + cmTxt(Math.abs(h)) + (h >= 0 ? ' foran' : ' bak') + ' bekken'; } },
    reach: { f: (vp, p) => {
      if (!walking(vp)) return '';
      if (vp.reach.i !== p.i) {
        const q = evalPose(vp.W, vp.tRaw - (p.Traw - p.A.t) + 0.0005);
        const ank = q.stanceA === -1 ? q.ankL : q.ankR;
        vp.reach = { i: p.i, v: dot(sub(ank, q.root), q.f) };
      }
      return 'Landing ' + cmTxt(vp.reach.v) + ' foran';
    } },
    step: { f: (vp, p) => { if (!walking(vp)) return ''; const st = recentSteps(vp, p, 8); let s = 0, n = 0; for (let k = 1; k < st.length; k++) { if (st[k].turn || st[k - 1].turn) continue; s += Math.hypot(st[k].c.x - st[k - 1].c.x, st[k].c.z - st[k - 1].c.z); n++; } return n ? 'Steglengde ' + cmTxt(s / n) : 'Steglengde –'; } },
    gaze: { s: 1, f: (vp, p, S) => 'Blikk ' + degTxt(meanOf(S, q => q.pitch)) + ' ned' },
    turnsteps: { f: vp => { const w = vp.W.plan && vp.W.plan.turns[0]; return w ? (w.i1 - w.i0 + 1) + ' steg i vendingen' : ''; } },
    phase: { f: (vp, p) => walking(vp) ? 'V: ' + phaseName(vp, p.footL) + '\nH: ' + phaseName(vp, p.footR) : '' },
    kneeAng: { f: (vp, p) => 'Kne V ' + Math.round(kneeFlex(p.hipL, p.kneeL, p.ankL)) + '° · H ' + Math.round(kneeFlex(p.hipR, p.kneeR, p.ankR)) + '°' },
  };
  function lessonNeedsSamples() {
    const L = LESSONS[state.idx];
    return (L.metrics || []).some(k => METRICS[k] && METRICS[k].s);
  }
  function samplePoses(vp, tRaw) {
    const out = [];
    for (let k = 0; k < 33; k++) out.push(evalPose(vp.W, tRaw - k * 0.05));
    return out;
  }

  // ---------- labels ----------
  function placeLabels() {
    labelsEl.textContent = '';
    const tl = state.guides.has('timeline');
    vps.forEach(vp => {
      const r = vp.rect;
      const l = document.createElement('div'); l.className = 'vpl';
      l.style.left = (r.x + 6) + 'px'; l.style.top = (r.y + 6) + 'px'; l.style.maxWidth = (r.w - 12) + 'px';
      l.innerHTML = '<span class="dot" style="background:' + vp.color + '"></span><span class="t"></span>';
      l.querySelector('.t').textContent = vp.cfg.label;
      labelsEl.appendChild(l);
      const m = document.createElement('div'); m.className = 'vpm';
      m.style.left = (r.x + 6) + 'px'; m.style.bottom = (SH - (r.y + r.h) + 6 + (tl && vp.W.mode !== 'stand' ? 40 : 0)) + 'px'; m.style.maxWidth = (r.w - 12) + 'px';
      m.hidden = !(LESSONS[state.idx].metrics || []).length;
      labelsEl.appendChild(m);
      vp.labelEl = l; vp.metricEl = m;
    });
  }
  function updateMetrics(vp, p, S) {
    const keys = LESSONS[state.idx].metrics || [];
    if (!keys.length || !vp.metricEl) return;
    const lines = keys.map(k => METRICS[k] && (!METRICS[k].s || S) ? METRICS[k].f(vp, p, S) : '').filter(Boolean);
    vp.metricEl.textContent = lines.join('\n');
  }

  // ---------- layout ----------
  let SW = 1, SH = 1, DPR = 1;
  function computeRects() {
    const n = vps.length, g = 3;
    let cols, rows;
    if (n <= 1) { cols = 1; rows = 1; }
    else if (n === 2) { cols = 2; rows = 1; }
    else if (n === 3) { cols = 3; rows = 1; }
    else { cols = SW / SH > 1.6 ? 4 : 2; rows = Math.ceil(n / cols); }
    const w = (SW - g * (cols - 1)) / cols, h = (SH - g * (rows - 1)) / rows;
    vps.forEach((vp, i) => {
      const c = i % cols, rr = Math.floor(i / cols);
      vp.rect = { x: Math.round(c * (w + g)), y: Math.round(rr * (h + g)), w: Math.round(w), h: Math.round(h) };
    });
  }
  function layout() {
    const rc = stage.getBoundingClientRect();
    SW = Math.max(1, Math.round(rc.width)); SH = Math.max(1, Math.round(rc.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(DPR); renderer.setSize(SW, SH, false);
    ovCanvas.width = Math.round(SW * DPR); ovCanvas.height = Math.round(SH * DPR);
    computeRects(); placeLabels();
    if (!state.playing) renderFrame();
  }

  // ---------- render loop ----------
  let lastMetric = 0;
  function renderFrame() {
    renderer.setScissorTest(false); renderer.setClearColor(col('#08070A'), 1); renderer.clear(); renderer.setScissorTest(true);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, SW, SH);
    const now = performance.now();
    const doMetrics = now - lastMetric > 240 || !state.playing;
    if (doMetrics) lastMetric = now;
    const xray = state.guides.has('skel');
    const wantS = state.guides.has('head') || state.guides.has('hands') || state.guides.has('trail') || (doMetrics && lessonNeedsSamples());
    for (const vp of vps) {
      const tRaw = vp.time(state.simT); vp.tRaw = tRaw;
      const pose = evalPose(vp.W, tRaw);
      const pony = MANNEQUIN.ponyChain(vp.W, tRaw, pose);
      vp.man.pose(pose, vp.W.shoe, pony);
      if (vp.man.xray !== xray) { vp.man.setXray(xray); vp.man.xray = xray; }
      placeCamera(vp, tRaw);
      for (const o of vps) o.setVisible(o === vp);
      floor.position.set(Math.round(vp.target.x / 8) * 8, 0, Math.round(vp.target.z / 8) * 8);
      scene.fog.near = vp.camDist + 2.5; scene.fog.far = vp.camDist + 18;
      key.target.position.set(pose.root.x, 0.8, pose.root.z);
      key.position.set(pose.root.x + 1.7, 3.6, pose.root.z + 2.4);
      key.target.updateMatrixWorld();
      const r = vp.rect;
      renderer.setViewport(r.x, SH - r.y - r.h, r.w, r.h);
      renderer.setScissor(r.x, SH - r.y - r.h, r.w, r.h);
      renderer.render(scene, vp.camera);
      const S = wantS ? samplePoses(vp, tRaw) : null;
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      drawGuides(vp, pose, S);
      ctx.restore();
      if (doMetrics) updateMetrics(vp, pose, S);
    }
    tcEl.textContent = fmtTC(state.simT);
  }
  let lastT = 0;
  function loop(now) {
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0; lastT = now;
    if (state.playing) { state.simT += dt * state.speed; renderFrame(); }
    requestAnimationFrame(loop);
  }

  // ---------- controls ----------
  const tcEl = $('#tc');
  function fmtTC(t) {
    t = Math.max(0, t);
    const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 30);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ':' + String(f).padStart(2, '0');
  }
  const ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx=".6" fill="currentColor"/><rect x="9.5" y="2.5" width="3" height="11" rx=".6" fill="currentColor"/></svg>';
  const playBtn = $('#play');
  function syncPlay() {
    playBtn.innerHTML = state.playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute('aria-label', state.playing ? 'Pause' : 'Spill av');
  }
  playBtn.addEventListener('click', () => { state.playing = !state.playing; syncPlay(); if (!state.playing) renderFrame(); });
  $('#stepB').addEventListener('click', () => { state.playing = false; syncPlay(); state.simT = Math.max(0, state.simT - 1 / 30); renderFrame(); });
  $('#stepF').addEventListener('click', () => { state.playing = false; syncPlay(); state.simT += 1 / 30; renderFrame(); });
  const speedSeg = $('#speed');
  speedSeg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.speed = parseFloat(b.dataset.s); syncSeg(speedSeg, 's', state.speed);
  });
  const modeSeg = $('#mode');
  modeSeg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (state.mode === b.dataset.m) return;
    state.mode = b.dataset.m; syncSeg(modeSeg, 'm', state.mode);
    vps.forEach(v => v.build()); placeLabels(); renderFrame();
  });
  function syncSeg(seg, k, val) {
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(b.dataset[k]) === String(val))));
  }
  const camRow = $('#cams');
  CAM_CHIPS.forEach(([k, name]) => {
    const b = document.createElement('button'); b.className = 'chip'; b.dataset.cam = k; b.textContent = name;
    b.addEventListener('click', () => { state.cam = k; state.userAz = 0; state.userEl = 0; state.zoom = 1; syncCams(); if (!state.playing) renderFrame(); });
    camRow.appendChild(b);
  });
  const resetBtn = document.createElement('button'); resetBtn.className = 'chip'; resetBtn.textContent = 'Nullstill vinkel';
  resetBtn.addEventListener('click', () => { state.cam = LESSONS[state.idx].cam; state.focus = LESSONS[state.idx].focus || 'full'; state.userAz = 0; state.userEl = 0; state.zoom = 1; syncCams(); if (!state.playing) renderFrame(); });
  camRow.appendChild(resetBtn);
  const focusRow = $('#focus');
  Object.keys(FOCUS).forEach(k => {
    const b = document.createElement('button'); b.className = 'chip'; b.dataset.focus = k; b.textContent = FOCUS[k].name;
    b.addEventListener('click', () => { state.focus = k; state.zoom = 1; syncCams(); if (!state.playing) renderFrame(); });
    focusRow.appendChild(b);
  });
  function syncCams() {
    const locked = !!LESSONS[state.idx].camLocked;
    camRow.querySelectorAll('[data-cam]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.cam === state.cam)); b.disabled = locked; });
    focusRow.querySelectorAll('[data-focus]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.focus === state.focus)); b.disabled = locked; });
    resetBtn.disabled = locked;
  }
  const guideRow = $('#guideChips');
  GUIDES.forEach(([k, name, c]) => {
    const b = document.createElement('button'); b.className = 'chip'; b.dataset.g = k;
    b.innerHTML = '<span class="gd" style="background:' + c + '"></span>' + name;
    b.addEventListener('click', () => {
      if (state.guides.has(k)) state.guides.delete(k); else state.guides.add(k);
      syncGuides(); placeLabels(); if (!state.playing) renderFrame();
    });
    guideRow.appendChild(b);
  });
  function syncGuides() { guideRow.querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-pressed', String(state.guides.has(b.dataset.g)))); }

  // orbit by dragging sideways
  let drag = null;
  const hint = $('#hint');
  setTimeout(() => { if (hint) hint.style.opacity = '0'; }, 4500);
  stage.addEventListener('pointerdown', e => {
    if (LESSONS[state.idx].camLocked) return;
    drag = { x: e.clientX, y: e.clientY, az: state.userAz, el: state.userEl, mouse: e.pointerType === 'mouse' };
  });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    state.userAz = drag.az - (e.clientX - drag.x) * 0.45;
    if (drag.mouse) state.userEl = clamp(drag.el + (e.clientY - drag.y) * 0.3, -15, 70);
    if (hint) hint.style.opacity = '0';
    if (!state.playing) renderFrame();
  });
  const endDrag = () => { drag = null; };
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
  stage.addEventListener('wheel', e => {
    if (LESSONS[state.idx].camLocked) return;
    e.preventDefault(); state.zoom = clamp(state.zoom * (1 + e.deltaY * 0.001), 0.4, 2.4); if (!state.playing) renderFrame();
  }, { passive: false });
  stage.addEventListener('dblclick', () => { state.userAz = 0; state.userEl = 0; state.zoom = 1; if (!state.playing) renderFrame(); });
  $('#zoomIn').addEventListener('click', () => { state.zoom = clamp(state.zoom / 1.25, 0.4, 2.4); if (!state.playing) renderFrame(); });
  $('#zoomOut').addEventListener('click', () => { state.zoom = clamp(state.zoom * 1.25, 0.4, 2.4); if (!state.playing) renderFrame(); });

  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
    else if (e.key === 'ArrowRight' && e.shiftKey) { e.preventDefault(); $('#stepF').click(); }
    else if (e.key === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); $('#stepB').click(); }
  });

  // ---------- lessons ----------
  const lsel = $('#lsel');
  GROUPS.forEach((gname, gi) => {
    const og = document.createElement('optgroup'); og.label = gname;
    LESSONS.forEach((L, i) => { if (L.group !== gi) return; const o = document.createElement('option'); o.value = i; o.textContent = (i + 1) + '. ' + L.title; og.appendChild(o); });
    lsel.appendChild(og);
  });
  lsel.addEventListener('change', () => loadLesson(parseInt(lsel.value, 10), true));
  $('#prev').addEventListener('click', () => loadLesson(Math.max(0, state.idx - 1), true));
  $('#next').addEventListener('click', () => loadLesson(Math.min(LESSONS.length - 1, state.idx + 1), true));

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function legendItem(vp, i) {
    return '<li id="lg' + i + '"><span class="sw" style="background:' + vp.color + '"></span><div><b>' + esc(vp.cfg.label) + '</b><span class="tagtxt">' + TAGNAME[vp.cfg.tag] + '</span><span class="n">' + esc(vp.cfg.note || '') + '</span></div></li>';
  }
  function renderLesson(L) {
    const i = state.idx, N = LESSONS.length;
    const prev = LESSONS[i - 1], next = LESSONS[i + 1];
    article.innerHTML =
      '<p class="kicker">Leksjon ' + (i + 1) + ' av ' + N + ' · ' + GROUPS[L.group] + '</p>' +
      '<h2>' + esc(L.title) + '</h2><p class="lead">' + L.lead + '</p>' +
      '<section class="legend"><h3>I rutene</h3><ul>' + vps.map(legendItem).join('') + '</ul></section>' +
      '<section><h3>Se etter</h3><ul class="looklist">' + L.look.map(x => '<li>' + x + '</li>').join('') + '</ul></section>' +
      '<div id="lessonExtra"></div>' +
      '<div class="body">' + L.body + '</div>' +
      '<nav class="lfoot" aria-label="Leksjoner">' +
      (prev ? '<button type="button" data-go="' + (i - 1) + '"><small>Forrige</small><span>' + esc(prev.title) + '</span></button>' : '') +
      (next ? '<button type="button" class="nx" data-go="' + (i + 1) + '"><small>Neste</small><span>' + esc(next.title) + '</span></button>' : '') +
      '</nav>';
    article.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => loadLesson(parseInt(b.dataset.go, 10), true)));
    const ex = $('#lessonExtra', article);
    if (L.context) mountContext(ex);
    if (L.sandbox) mountSandbox(ex);
    if (L.selftest) mountScore($('#scoreBox', article));
  }

  function mountContext(ex) {
    ex.innerHTML = '<h3>Velg kontekst</h3><div class="ctx-chips" role="group" aria-label="Kontekst">' +
      Object.keys(CONTEXTS).map(k => '<button type="button" class="chip" data-ctx="' + k + '">' + CONTEXTS[k].name + '</button>').join('') +
      '</div><div class="ctx-panel" id="ctxPanel"></div>';
    const paint = () => {
      const c = CONTEXTS[state.ctx];
      ex.querySelectorAll('[data-ctx]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ctx === state.ctx)));
      $('#ctxPanel', ex).innerHTML = '<dl><dt>Skru opp og ned</dt><dd>' + c.turn + '</dd><dt>Kroppslig prioritet</dt><dd>' + c.prio + '</dd><dt>Det som ødelegger</dt><dd>' + c.ruin + '</dd></dl><p style="margin-top:10px">' + c.extra + '</p>';
    };
    ex.querySelectorAll('[data-ctx]').forEach(b => b.addEventListener('click', () => {
      state.ctx = b.dataset.ctx;
      const vp = vps[1]; vp.cfg.w = state.ctx; vp.cfg.label = CONTEXTS[state.ctx].name; vp.build();
      const li = $('#lg1', article); if (li) li.outerHTML = legendItem(vp, 1);
      placeLabels(); paint(); if (!state.playing) renderFrame();
    }));
    paint();
  }

  const SLIDERS = [
    { k: 'cad', label: 'Kadens', min: 80, max: 135, step: 1, fmt: v => v + ' steg/min', get: P => Math.round(P.cadence * 60), set: (o, v) => { o.cadence = v / 60; } },
    { k: 'len', label: 'Steglengde', min: 44, max: 82, step: 1, fmt: v => v + ' cm', get: P => Math.round(P.stepLen * 100), set: (o, v) => { o.stepLen = v / 100; } },
    { k: 'width', label: 'Stegbredde (minus = kryss)', min: -6, max: 9, step: 0.5, fmt: v => nf(v, 1) + ' cm', get: P => P.width * 100,
      set: (o, v) => { o.width = v / 100; o.hipThrow = v < 0 ? -v / 100 * 0.55 : 0; o.counterSway = v < 0 ? Math.min(0.8, -v / 6) : 0; o.pelvisDrop = 0.065 + (v < 0 ? -v / 100 * 1.6 : 0); } },
    { k: 'knee', label: 'Knekløft i svingfasen', min: 60, max: 130, step: 1, fmt: v => v + ' %', get: P => Math.round(P.kneeLift * 100), set: (o, v) => { o.kneeLift = v / 100; } },
    { k: 'lag', label: 'Vektflytting: tidlig → sen', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.lag / 0.24 * 100), set: (o, v) => { o.lag = v / 100 * 0.24; o.latComp = v / 100 * 1.6; } },
    { k: 'dwell', label: 'Mikropause i standbeinet', min: 0, max: 40, step: 1, fmt: v => v + ' %', get: P => Math.round(P.dwell * 100), set: (o, v) => { o.dwell = v / 100; } },
    { k: 'reach', label: 'Fot foran kroppen (brems)', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round((P.midK - 0.5) / 0.12 * 100), set: (o, v) => { o.midK = 0.5 + v / 100 * 0.12; o.dwellAt = o.midK; o.brake = v / 100 * 0.045; } },
    { k: 'stab', label: 'Hodestabilitet', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.stab * 100), set: (o, v) => { o.stab = v / 100; o.nod = (1 - v / 100) * 0.16; } },
    { k: 'shock', label: 'Sjokk opp i kroppen ved landing', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.shock / 0.03 * 100), set: (o, v) => { o.shock = v / 100 * 0.03; o.shoulderLift = v / 100 * 0.03; } },
    { k: 'hip', label: 'Hoftebevegelse (rotasjon)', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.pelvisRot / 0.24 * 100), set: (o, v) => { o.pelvisRot = v / 100 * 0.24; o.pelvisDrop = 0.03 + v / 100 * 0.08; } },
    { k: 'wob', label: 'Hoftekast etter landing', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.wobble / 0.18 * 100), set: (o, v) => { o.wobble = v / 100 * 0.18; } },
    { k: 'arm', label: 'Armsving', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.armAmp / 0.45 * 100), set: (o, v) => { o.armAmp = v / 100 * 0.45; } },
    { k: 'uro', label: 'Uro i armer og hender', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.crossBody / 0.6 * 100),
      set: (o, v) => { const x = v / 100; o.crossBody = 0.6 * x; o.wristFlip = 0.85 * x; o.abduct = 0.09 + 0.2 * x; o.armAsym = 0.45 * x; } },
    { k: 'look', label: 'Blikk ned og skanning', min: 0, max: 100, step: 1, fmt: v => v + ' %', get: P => Math.round(P.headPitch / 0.45 * 100), set: (o, v) => { o.headPitch = v / 100 * 0.45; o.scan = v / 100 * 0.6; } },
  ];
  function mountSandbox(ex) {
    const P0 = resolvePreset('sterk', state.sandbox);
    const vals = {}; SLIDERS.forEach(s => { vals[s.k] = s.get(P0); });
    ex.innerHTML = '<h3>Glidebrytere</h3><div class="sliders">' + SLIDERS.map(s =>
      '<div class="sl"><label for="sl-' + s.k + '"><span>' + s.label + '</span><output id="out-' + s.k + '">' + s.fmt(vals[s.k]) + '</output></label>' +
      '<input type="range" id="sl-' + s.k + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + vals[s.k] + '"></div>').join('') +
      '<div class="sl-row"><span class="lbl">Sko</span><div class="seg" id="sbShoe"><button type="button" data-v="1">Hæl</button><button type="button" data-v="0">Flat</button></div></div>' +
      '<div class="sl-row"><span class="lbl">Vending</span><div class="seg" id="sbTurn"><button type="button" data-v="pivot">Pivot</button><button type="button" data-v="arc">Bue</button><button type="button" data-v="messy">Rotete</button></div></div>' +
      '<p class="note" style="margin:0">Vendingen synes når du velger Runway under scenen.</p>' +
      '<div><button type="button" class="btn-text" id="sbReset">Tilbake til sterk walk</button></div></div>';
    let pending = 0;
    const rebuild = () => { if (pending) return; pending = requestAnimationFrame(() => { pending = 0; vps[0].build(); store.set('sandbox', state.sandbox); if (!state.playing) renderFrame(); }); };
    SLIDERS.forEach(s => {
      const inp = $('#sl-' + s.k, ex), out = $('#out-' + s.k, ex);
      inp.addEventListener('input', () => { const v = parseFloat(inp.value); out.textContent = s.fmt(v); s.set(state.sandbox, v); rebuild(); });
    });
    const shoe = $('#sbShoe', ex), turn = $('#sbTurn', ex);
    const P0h = () => resolvePreset('sterk', state.sandbox).heel;
    const sync = () => { syncSeg(shoe, 'v', P0h()); syncSeg(turn, 'v', resolvePreset('sterk', state.sandbox).turn); };
    shoe.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.sandbox.heel = parseInt(b.dataset.v, 10); sync(); rebuild(); });
    turn.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const m = b.dataset.v === 'messy';
      Object.assign(state.sandbox, { turn: b.dataset.v, panic: m ? 1 : 0, turnFlail: m ? 1 : 0, turnLook: m ? 1 : 0, slump: m ? 1 : 0, rushAfter: m ? 1 : 0 });
      sync(); rebuild();
    });
    $('#sbReset', ex).addEventListener('click', () => { state.sandbox = {}; store.set('sandbox', {}); vps[0].build(); mountSandbox(ex); if (!state.playing) renderFrame(); });
    sync();
  }

  function mountScore(box) {
    if (!box) return;
    const paint = () => {
      let total = 0, n = 0;
      const low = [];
      const minV = Math.min(...SCORE_AREAS.map(a => state.score[a.k] == null ? 9 : state.score[a.k]));
      SCORE_AREAS.forEach(a => { const v = state.score[a.k]; if (v != null) { total += v; n++; if (v === minV) low.push(a.name.toLowerCase()); } });
      box.innerHTML = '<div class="score">' + SCORE_AREAS.map(a => {
        const v = state.score[a.k];
        return '<div class="score-row"><span class="nm">' + a.name + '</span><div class="seg" data-area="' + a.k + '">' +
          [0, 1, 2].map(x => '<button type="button" data-v="' + x + '" aria-pressed="' + (v === x) + '" aria-label="' + a.name + ': ' + x + ' poeng">' + x + '</button>').join('') +
          '</div><span class="ds">' + (v == null ? a.d.join(' · ') : a.d[v]) + '</span></div>';
      }).join('') +
        '<div class="score-total"><b>' + total + '</b><span>av ' + (SCORE_AREAS.length * 2) + (n < SCORE_AREAS.length ? ' · ' + (SCORE_AREAS.length - n) + ' områder igjen' : '') + '</span></div>' +
        (n === SCORE_AREAS.length && minV < 2 ? '<p>Start med: ' + low.join(', ') + '.</p>' : '') +
        (n ? '<div><button type="button" class="btn-text" id="scoreReset">Nullstill poeng</button></div>' : '') + '</div>';
      box.querySelectorAll('[data-area]').forEach(seg => seg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        state.score[seg.dataset.area] = parseInt(b.dataset.v, 10); store.set('score', state.score); paint();
      }));
      const rs = $('#scoreReset', box); if (rs) rs.addEventListener('click', () => { state.score = {}; store.set('score', {}); paint(); });
    };
    paint();
  }

  function loadLesson(i, scroll) {
    const L = LESSONS[i];
    state.idx = i; store.set('lesson', i);
    vps.forEach(v => v.dispose()); vps = [];
    state.mode = L.mode === 'runway' ? 'runway' : 'straight';
    state.cam = L.cam || 'front'; state.focus = L.focus || 'full'; state.userAz = 0; state.userEl = 0; state.zoom = 1;
    state.guides = new Set(L.guides || []);
    state.speed = L.speed || 1; state.simT = 0;
    const used = {};
    L.vps.forEach(c => {
      const k = used[c.tag] = (used[c.tag] || 0); used[c.tag]++;
      const cfg = Object.assign({}, c);
      if (L.context && cfg.w.indexOf('ctx') === 0) { cfg.w = state.ctx; cfg.label = CONTEXTS[state.ctx].name; }
      vps.push(new Viewport(cfg, L, (SUIT[c.tag] || SUIT.noytral)[k % 4]));
    });
    lsel.value = String(i);
    $('#prev').disabled = i === 0; $('#next').disabled = i === LESSONS.length - 1;
    syncSeg(speedSeg, 's', state.speed); syncSeg(modeSeg, 'm', state.mode);
    modeSeg.querySelectorAll('button').forEach(b => { b.disabled = (!!L.lockMode || L.mode === 'stand') && b.dataset.m !== state.mode; });
    if (L.mode === 'stand') modeSeg.querySelectorAll('button').forEach(b => { b.disabled = true; b.setAttribute('aria-pressed', 'false'); });
    syncCams(); syncGuides(); syncPlay();
    computeRects(); placeLabels();
    renderLesson(L);
    renderFrame();
    if (scroll) {
      const top = $('#lessonTop'), sc = $('.stage-col');
      const stacked = window.innerWidth < 980;
      const y = top.getBoundingClientRect().top + window.scrollY - (stacked ? sc.offsetHeight : 0) - 4;
      if (window.scrollY > y) window.scrollTo(0, Math.max(0, y));
    }
  }

  window.__rwDebug = { scene, renderer, state, floor, key, get vps() { return vps; }, renderFrame };
  // ---------- boot ----------
  new ResizeObserver(() => layout()).observe(stage);
  let start = store.get('lesson', 0);
  const hm = /^#l(\d+)$/.exec(location.hash || '');
  if (hm) start = parseInt(hm[1], 10) - 1;
  if (!(start >= 0 && start < LESSONS.length)) start = 0;
  layout();
  loadLesson(start, false);
  requestAnimationFrame(loop);
})();
