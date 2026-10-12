const E = require('../engine.js');
const ids = Object.keys(E.PRESETS);
let bad = 0;
for (const mode of ['straight','runway']) {
  for (const id of ids) {
    const W = E.makeWalkerState(id, null, mode);
    const dt = 1/120; const tEnd = W.plan.period*2.2;
    let prev = null; let maxJump = {root:0, ank:0, head:0, hand:0}; let reachErr = 0; let minFootY = 9, maxStanceY=-9;
    let headMin=9, headMax=-9; let nan=false;
    for (let t=0.5; t<tEnd; t+=dt) {
      const p = E.evalPose(W, t);
      for (const k of ['root','ankL','ankR','head','handL','kneeL','eye']) { const v=p[k]; if(!isFinite(v.x+v.y+v.z)) nan=true; }
      if (prev) {
        const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)/dt;
        maxJump.root=Math.max(maxJump.root,d(p.root,prev.root));
        maxJump.ank=Math.max(maxJump.ank,d(p.ankL,prev.ankL),d(p.ankR,prev.ankR));
        maxJump.head=Math.max(maxJump.head,d(p.head,prev.head));
        maxJump.hand=Math.max(maxJump.hand,d(p.handL,prev.handL),d(p.handR,prev.handR));
      }
      for (const [h,a] of [[p.hipL,p.ankL],[p.hipR,p.ankR]]) { const L=Math.hypot(h.x-a.x,h.y-a.y,h.z-a.z); reachErr=Math.max(reachErr, L-(E.G.L1+E.G.L2)); }
      for (const ft of [p.footL,p.footR]) { if (ft.stance) { /* lowest sole point approx */ } }
      if (t> W.plan.period*0.5 && t < W.plan.period*1.5){ headMin=Math.min(headMin,p.head.y); headMax=Math.max(headMax,p.head.y); }
      prev = p;
    }
    const flag = nan || maxJump.root>4 || maxJump.ank>12 || maxJump.head>5 || reachErr>0.01;
    if (flag) bad++;
    console.log((flag?'!! ':'   ')+mode.padEnd(9)+id.padEnd(14), 'period',W.plan.period.toFixed(2),'vel root',maxJump.root.toFixed(2),'ank',maxJump.ank.toFixed(2),'head',maxJump.head.toFixed(2),'hand',maxJump.hand.toFixed(2),'reach+',(reachErr*100).toFixed(1)+'cm','headRange',((headMax-headMin)*100).toFixed(1)+'cm', nan?'NaN':'');
  }
}
console.log('bad', bad);
