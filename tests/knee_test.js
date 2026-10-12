const E = require('../engine.js');
const ang = (a,b,c) => { const u=E.sub(a,b), v=E.sub(c,b); return 180 - Math.acos(E.dot(u,v)/E.vlen(u)/E.vlen(v))*180/Math.PI; };
for (const id of ['sterk','kompetent','svak']) {
  const W = E.makeWalkerState(id, null, 'straight');
  const pl = W.plan; const S = pl.steps;
  // left foot cycle: from a left contact to the next left contact
  let i0 = S.findIndex((s,k)=> k>14 && s.side===-1);
  const t0 = S[i0].t, t1 = S[i0+2].t;
  let out=[], hipFl=[], ankY=[];
  for (let k=0;k<=20;k++){ const t=t0+(t1-t0)*k/20; const p=E.evalPose(W,t - pl.period); 
    out.push(ang(p.hipL,p.kneeL,p.ankL).toFixed(0));
    const th = Math.atan2(E.dot(E.sub(p.kneeL,p.hipL), p.f), -(p.kneeL.y-p.hipL.y))*180/Math.PI; hipFl.push(th.toFixed(0));
    ankY.push((p.ankL.y*100).toFixed(0)); }
  console.log(id.padEnd(10),'knee', out.join(' '));
  console.log(''.padEnd(10),'thigh', hipFl.join(' '));
  console.log(''.padEnd(10),'ankY', ankY.join(' '));
}
