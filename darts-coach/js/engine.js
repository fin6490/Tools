// engine.js — Oche darts coach: board geometry, checkout routes, the five
// practice games, the visit engine, analysis and the board drawing. No DOM.
/* ---------- board geometry (mm, regulation steel-tip board) ---------- */
const SEGS=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const RAD={bull:6.35,ob:15.9,tIn:99,tOut:107,dIn:162,dOut:170};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const r2=n=>Math.round(n*100)/100;
function pt(r,deg){const a=deg*Math.PI/180;return[r*Math.sin(a),-r*Math.cos(a)];}
function hitXY(x,y){const r=Math.hypot(x,y);
  if(r<=RAD.bull)return{s:25,m:2};if(r<=RAD.ob)return{s:25,m:1};if(r>RAD.dOut)return{s:0,m:0};
  let a=Math.atan2(x,-y)*180/Math.PI;a=(a+369)%360;const s=SEGS[Math.floor(a/18)];
  return{s,m:(r>=RAD.tIn&&r<=RAD.tOut)?3:(r>=RAD.dIn?2:1)};}
const val=d=>d.s*d.m;
function lab(d){if(!d.s)return"MISS";if(d.s===25)return d.m===2?"BULL":"25";return(d.m===3?"T":d.m===2?"D":"S")+d.s;}
function parseT(t){if(t==="BULL")return{s:25,m:2};if(t==="25")return{s:25,m:1};return{s:+t.slice(1),m:{S:1,D:2,T:3}[t[0]]};}
function aimXY(t){const{s,m}=parseT(t);if(s===25)return m===2?[0,0]:[0,-11];return pt(m===3?103:m===2?166:78,SEGS.indexOf(s)*18);}
const isDbl=d=>d.m===2&&d.s>0;
const dblT=t=>t==="BULL"||(!!t&&t[0]==="D");
function hitT(d,t){if(!t)return false;const p=parseT(t);if(t[0]==="S"||t==="25")return d.s===p.s;return d.s===p.s&&d.m===p.m;}
const NB=Object.fromEntries(SEGS.map((s,i)=>[s,[SEGS[(i+19)%20],SEGS[(i+1)%20]]])); // [left, right]

/* ---------- checkout routes ---------- */
const THROWS=(()=>{const a=[];for(let n=20;n>=10;n--)a.push({t:"T"+n,v:3*n});for(let n=20;n>=1;n--)a.push({t:"S"+n,v:n});for(let n=9;n>=1;n--)a.push({t:"T"+n,v:3*n});a.push({t:"25",v:25},{t:"BULL",v:50});for(let n=20;n>=1;n--)a.push({t:"D"+n,v:2*n});return a;})();
const FIN=THROWS.filter(x=>dblT(x.t));
const DPREF=[20,16,18,12,10,8,14,4,6,2,19,17,15,13,11,9,7,5,3,1];
const dRank=t=>t==="BULL"?12:DPREF.indexOf(+t.slice(1));
const coCache={};
function checkout(R,k){const key=R+"|"+k;if(key in coCache)return coCache[key];let best=null,bs=1e9;
  const take=(r,c)=>{if(c<bs){bs=c;best=r;}};
  for(const f of FIN)if(f.v===R)take([f.t],dRank(f.t));
  if(!best&&k>=2)THROWS.forEach((a,i)=>{const r=R-a.v;if(r<2)return;for(const f of FIN)if(f.v===r)take([a.t,f.t],dRank(f.t)*10+i);});
  if(!best&&k>=3)THROWS.forEach((a,i)=>{const r1=R-a.v;if(r1<4)return;THROWS.forEach((b,j)=>{const r=r1-b.v;if(r<2)return;for(const f of FIN)if(f.v===r)take([a.t,b.t,f.t],dRank(f.t)*10+i+j);});});
  return coCache[key]=best;}
function aim(R,k){const c=checkout(R,k);if(c)return c[0];
  if(R<=60){for(const L of[40,32,36,24,16,20,8]){const s=R-L;if(s>=1&&s<=20)return"S"+s;}}
  for(const n of[20,19,18])if(R-3*n>=2)return"T"+n;return"S1";}

/* ---------- games ---------- */
const GAMES={
 scoring:{name:"Ton Machine",ic:"T20",blurb:"10 visits at treble 20. Pure scoring rhythm.",
  init:()=>({v:0,pts:0,n:0}),target:()=>"T20",
  step(st,d){st.pts+=val(d);st.n++;},endVisit(st){st.v++;if(st.v>=10)st.done=true;},
  big:st=>st.n?(st.pts/st.n*3).toFixed(1):"0.0",bigL:"3-dart avg",
  sub:st=>`Visit ${Math.min(st.v+1,10)} of 10 · ${st.pts} pts`,
  result:st=>({avg:r2(st.pts/st.n*3),pts:st.pts,darts:st.n}),
  key:"avg",hi:true,fmt:r=>r.avg.toFixed(1),pbL:"best avg",head:r=>`${r.avg.toFixed(1)} average`,
  kv:r=>[[r.avg.toFixed(1),"avg"],[r.pts,"points"],[r.darts,"darts"]]},
 x01:{name:"501 Leg",ic:"501",blurb:"A full leg, double out. Checkout routes shown as you go.",
  init:()=>({rem:501,vs:501,n:0,v:0,f9:null}),
  target:(st,vd)=>aim(st.rem,3-vd),
  step(st,d){if(st.vEnd)return;st.n++;const ns=st.rem-val(d);
    if(ns<0||ns===1||(ns===0&&!isDbl(d))){st.rem=st.vs;st.vEnd=true;st.bust=true;}
    else{st.rem=ns;if(!ns){st.vEnd=true;st.done=true;}}},
  endVisit(st){st.v++;if(st.v===3)st.f9=r2((501-st.rem)/3);st.vs=st.rem;st.bust=false;},
  big:st=>st.rem,bigL:"left",sub:st=>`Visit ${st.v+1} · ${st.n} darts${st.n?" · avg "+((501-st.rem)/st.n*3).toFixed(1):""}`,
  result:st=>({darts:st.n,avg:r2(501/st.n*3),f9:st.f9}),
  key:"darts",hi:false,fmt:r=>r.darts,pbL:"best leg",head:r=>`${r.darts}-dart leg`,
  kv:r=>[[r.darts,"darts"],[r.avg.toFixed(1),"avg"],[r.f9==null?"–":r.f9.toFixed(1),"first 9"]]},
 atc:{name:"Around the Clock",ic:"1–20",blurb:"1 to 20, then the bull, in order. Any bed counts.",
  init:()=>({i:0,n:0}),target:st=>st.i<20?"S"+(st.i+1):"25",
  step(st,d){if(st.vEnd)return;st.n++;if(d.s===(st.i<20?st.i+1:25)){st.i++;if(st.i>20){st.done=true;st.vEnd=true;}}},
  endVisit(){},big:st=>st.i<20?st.i+1:"B",bigL:"next",sub:st=>`${st.n} darts · ${st.i} of 21 done`,
  result:st=>({darts:st.n,rate:r2(21/st.n*100)}),
  key:"darts",hi:false,fmt:r=>r.darts,pbL:"fewest darts",head:r=>`${r.darts} darts`,
  kv:r=>[[r.darts,"darts"],[Math.round(r.rate)+"%","hit rate"],["21","targets"]]},
 bobs:{name:"Bob's 27",ic:"27",blurb:"Doubles 1 to 20 and bull. Hits add, a blank visit subtracts.",
  init:()=>({i:0,score:27,hv:0}),target:st=>st.i<20?"D"+(st.i+1):"BULL",
  step(st,d){if(st.vEnd)return;const t=st.i<20?"D"+(st.i+1):"BULL";if(hitT(d,t)){st.score+=st.i<20?2*(st.i+1):50;st.hv++;}},
  endVisit(st){if(!st.hv)st.score-=st.i<20?2*(st.i+1):50;st.hv=0;st.i++;if(st.score<=0||st.i>20)st.done=true;},
  big:st=>st.score,bigL:"score",sub:st=>`${st.i<20?"Double "+(st.i+1):"Bull"} · target ${Math.min(st.i+1,21)} of 21`,
  result:st=>({score:st.score,reached:Math.min(st.i,21)}),
  key:"score",hi:true,fmt:r=>r.score,pbL:"best score",head:r=>r.score>0?`${r.score} points`:`Out on ${r.reached<=20?"D"+r.reached:"bull"}`,
  kv:r=>[[r.score,"score"],[r.reached,"targets"],[r.score>0?"Yes":"No","survived"]]},
 c121:{name:"121 Checkout",ic:"121",blurb:"Nine darts to check out. Finish and it climbs by one; fail and it drops back.",
  init:()=>({tg:121,rem:121,vs:121,used:0,round:1,ok:0,best:0,hit:false,log:[]}),
  target:(st,vd)=>aim(st.rem,3-vd),
  step(st,d){if(st.vEnd)return;st.used++;const ns=st.rem-val(d);
    if(ns<0||ns===1||(ns===0&&!isDbl(d))){st.rem=st.vs;st.vEnd=true;st.bust=true;}
    else if(!ns){st.rem=0;st.vEnd=true;st.hit=true;}else st.rem=ns;},
  endVisit(st){st.bust=false;st.used=Math.ceil(st.used/3)*3;
    const nxt=()=>{st.round++;st.rem=st.vs=st.tg;st.used=0;st.hit=false;if(st.round>10)st.done=true;};
    if(st.hit){st.log.push([st.tg,1]);st.ok++;st.best=Math.max(st.best,st.tg);st.tg++;nxt();}
    else if(st.used>=9){st.log.push([st.tg,0]);st.tg=Math.max(121,st.tg-1);nxt();}
    else st.vs=st.rem;},
  big:st=>st.rem,bigL:st=>`of ${st.tg}`,sub:st=>`Round ${Math.min(st.round,10)}/10 · ${9-st.used} darts left · ${st.ok} done`,
  result:st=>({ok:st.ok,best:st.best,log:st.log}),
  key:"ok",hi:true,fmt:r=>r.ok+"/10",pbL:"most finishes",head:r=>`${r.ok} of 10 checked out`,
  kv:r=>[[r.ok+"/10","finishes"],[r.best||"–","highest"],[Math.round(r.ok*10)+"%","success"]]}
};
const GORDER=["scoring","x01","bobs","c121","atc"];
const SCORING_G=new Set(["scoring","x01"]);

/* ---------- engine ---------- */
const clone=o=>JSON.parse(JSON.stringify(o));
function newPlay(gid,at){return{gid,st:GAMES[gid].init(),visit:[],vi:0,darts:[],at:at||Date.now()};}
function pv(p){const G=GAMES[p.gid];const st=clone(p.st);st.vEnd=false;for(const d of p.visit)G.step(st,d);return{st,vd:p.visit.length};}
function full(p){const{st,vd}=pv(p);return st.vEnd||vd>=3;}
function pushDart(p,d){const{st,vd}=pv(p);if(st.vEnd||vd>=3)return false;d.t=GAMES[p.gid].target(st,vd);d.v=p.vi;p.visit.push(d);return true;}
function commitVisit(p){const G=GAMES[p.gid];const{st}=pv(p);G.endVisit(st);st.vEnd=false;p.st=st;p.darts.push(...p.visit);p.visit=[];p.vi++;return st.done;}
function toSession(p){return{id:"s"+p.at.toString(36)+Math.random().toString(36).slice(2,6),g:p.gid,at:p.at,end:Date.now(),d:p.darts,r:GAMES[p.gid].result(p.st)};}

/* ---------- board SVG ---------- */
function sector(r0,r1,a0,a1){const f=n=>n.toFixed(2);const[x0,y0]=pt(r1,a0),[x1,y1]=pt(r1,a1),[x2,y2]=pt(r0,a1),[x3,y3]=pt(r0,a0);
  return`M${f(x0)} ${f(y0)}A${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)}Z`;}
function bedsFor(s,m){ // [r0,r1] ranges for highlighting a target
  if(s===25)return m===2?[[0,RAD.bull]]:[[0,RAD.ob]];
  if(m===3)return[[RAD.tIn,RAD.tOut]];if(m===2)return[[RAD.dIn,RAD.dOut]];return[[RAD.ob,RAD.dOut]];}
function boardSVG({id="",target=null,heat=null,dots=null,dim=false,numbers=true}={}){
  const P=[];const op=dim?' opacity=".35"':"";
  P.push(`<circle r="${numbers?208:178}" fill="var(--b-rim)"/>`);
  SEGS.forEach((s,i)=>{const a0=i*18-9,a1=i*18+9,ev=i%2===0;const sg=ev?"var(--b-black)":"var(--b-sisal)",dt=ev?"var(--b-red)":"var(--b-green)";
    P.push(`<g${op}><path d="${sector(RAD.ob,RAD.tIn,a0,a1)}" fill="${sg}"/><path d="${sector(RAD.tIn,RAD.tOut,a0,a1)}" fill="${dt}"/><path d="${sector(RAD.tOut,RAD.dIn,a0,a1)}" fill="${sg}"/><path d="${sector(RAD.dIn,RAD.dOut,a0,a1)}" fill="${dt}"/></g>`);
    if(numbers){const[x,y]=pt(190,i*18);P.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="var(--b-num)" font-family="Big Shoulders Display,Arial Narrow,sans-serif" font-weight="800" font-size="24" text-anchor="middle" dominant-baseline="central">${s}</text>`);}});
  P.push(`<g${op}><circle r="${RAD.ob}" fill="var(--b-green)"/><circle r="${RAD.bull}" fill="var(--b-red)"/></g>`);
  // wires
  let w="";SEGS.forEach((s,i)=>{const[x0,y0]=pt(RAD.ob,i*18-9),[x1,y1]=pt(RAD.dOut,i*18-9);w+=`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;});
  P.push(`<path d="${w}" stroke="var(--b-wire)" stroke-width=".7" fill="none"/>`);
  [RAD.ob,RAD.tIn,RAD.tOut,RAD.dIn,RAD.dOut].forEach(r=>P.push(`<circle r="${r}" fill="none" stroke="var(--b-wire)" stroke-width=".7"/>`));
  if(heat){const mx=Math.max(1,...Object.values(heat));
    SEGS.forEach((s,i)=>{const a0=i*18-9,a1=i*18+9;[[1,RAD.ob,RAD.tIn],[3,RAD.tIn,RAD.tOut],[1,RAD.tOut,RAD.dIn],[2,RAD.dIn,RAD.dOut]].forEach(([m,a,b])=>{const c=heat[s+"-"+m]||0;if(c)P.push(`<path d="${sector(a,b,a0,a1)}" fill="var(--amber)" fill-opacity="${(0.15+0.8*c/mx).toFixed(2)}"/>`);});});
    if(heat["25-1"])P.push(`<circle r="${RAD.ob}" fill="var(--amber)" fill-opacity="${(0.15+0.8*heat["25-1"]/mx).toFixed(2)}"/>`);
    if(heat["25-2"])P.push(`<circle r="${RAD.bull}" fill="var(--amber)" fill-opacity="${(0.15+0.8*heat["25-2"]/mx).toFixed(2)}"/>`);}
  if(target){const{s,m}=parseT(target);const g=[];
    if(s===25)g.push(`<circle r="${m===2?RAD.bull:RAD.ob}" fill="none" stroke="#fff" stroke-width="3.2"/><circle r="${m===2?RAD.bull:RAD.ob}" fill="none" stroke="var(--red)" stroke-width="1.6"/>`);
    else{const i=SEGS.indexOf(s);bedsFor(s,m).forEach(([a,b])=>{const d=sector(a,b,i*18-9,i*18+9);g.push(`<path d="${d}" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-width="3.2"/><path d="${d}" fill="none" stroke="var(--red)" stroke-width="1.6"/>`);});}
    P.push(`<g>${g.join("")}</g>`);}
  if(dots)P.push(dots.map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="${c==="cur"?4.2:2.6}" fill="${c==="cur"?"#fff":"var(--amber)"}" stroke="${c==="cur"?"var(--ink)":"var(--b-rim)"}" stroke-width="${c==="cur"?1.6:.6}"/>`).join(""));
  return`<svg ${id?`id="${id}"`:""} viewBox="-212 -212 424 424" role="img" aria-label="Dartboard">${P.join("")}${id?`<g id="${id}Cross"></g>`:""}</svg>`;}

/* ---------- analysis ---------- */
function analyse(list){const ss=list.slice().sort((a,b)=>a.at-b.at);
  const A={sessions:ss,per:[],visits:[],dbl:{},tAtt:0,tHit:0,tNum:0,coAtt:0,coHit:0,dAtt:0,dHit:0,pts:0,n:0,f9:[],bias:[],nb:{},heat:{},darts:0,games:{}};
  for(const s of ss){A.games[s.g]=(A.games[s.g]||0)+1;A.darts+=s.d.length;
    if(SCORING_G.has(s.g)){const p=s.d.reduce((a,d)=>a+val(d),0);
      const pts=s.g==="x01"?501:p;A.pts+=pts;A.n+=s.d.length;A.per.push({at:s.at,avg:pts/s.d.length*3,g:s.g});
      const byV={};s.d.forEach(d=>{byV[d.v]=(byV[d.v]||0)+val(d);});
      if(s.g==="scoring")A.visits.push(...Object.values(byV));else{const vs=Object.entries(byV);vs.forEach(([v,sum])=>{const last=s.d.filter(d=>d.v==v).some(d=>dblT(d.t));if(!last)A.visits.push(sum);});}
      if(s.g==="x01"&&s.r.f9!=null)A.f9.push(s.r.f9);}
    for(const d of s.d){if(d.s)A.heat[d.s+"-"+d.m]=(A.heat[d.s+"-"+d.m]||0)+1;
      if(dblT(d.t)){const k=d.t;A.dbl[k]=A.dbl[k]||[0,0];A.dbl[k][0]++;A.dAtt++;if(hitT(d,d.t)){A.dbl[k][1]++;A.dHit++;}
        if(s.g==="x01"||s.g==="c121"){A.coAtt++;if(hitT(d,d.t))A.coHit++;}}
      if(d.t&&d.t[0]==="T"){A.tAtt++;if(hitT(d,d.t))A.tHit++;if(d.s===parseT(d.t).s)A.tNum++;}
      if(d.t==="T20"){if(d.x!=null){const[ax,ay]=aimXY("T20");A.bias.push([d.x-ax,d.y-ay,d.x,d.y]);}if(d.s!==20)A.nb[d.s]=(A.nb[d.s]||0)+1;}}}
  A.avg=A.n?A.pts/A.n*3:null;A.f9avg=A.f9.length?A.f9.reduce((a,b)=>a+b)/A.f9.length:null;
  A.dPct=A.dAtt?A.dHit/A.dAtt*100:null;A.coPct=A.coAtt?A.coHit/A.coAtt*100:null;A.tPct=A.tAtt?A.tHit/A.tAtt*100:null;A.tNumPct=A.tAtt?A.tNum/A.tAtt*100:null;
  if(A.bias.length>=6){A.bx=A.bias.reduce((a,b)=>a+b[0],0)/A.bias.length;A.by=A.bias.reduce((a,b)=>a+b[1],0)/A.bias.length;}
  A.ton=A.visits.filter(v=>v>=100).length;A.t140=A.visits.filter(v=>v>=140).length;A.t180=A.visits.filter(v=>v===180).length;
  return A;}
function inRange(list,r){if(r==="all")return list;const lim=Date.now()-(+r)*864e5;return list.filter(s=>s.at>=lim);}
function insights(A){const out=[];
  if(A.dPct!=null&&A.dAtt>=15){const weak=Object.entries(A.dbl).filter(([,v])=>v[0]>=4).map(([k,v])=>[k,v[1]/v[0]*100,v[0]]).sort((a,b)=>a[1]-b[1]).slice(0,3);
    if(A.dPct<35)out.push({sev:3,title:`Doubles at ${A.dPct.toFixed(0)}%`,body:`Club players who finish well sit around 35–40% on doubles. ${weak.length?"Weakest: "+weak.map(w=>`${w[0]} (${w[1].toFixed(0)}%)`).join(", ")+".":""}`,tip:"Aim at the inside wire of the double, not its centre. A dart that drops low still scores the single and leaves a finish.",drill:"bobs"});}
  if(A.bx!=null&&(Math.abs(A.bx)>3.5||Math.abs(A.by)>3.5)){const lr=Math.abs(A.bx)>3.5?`${Math.abs(A.bx).toFixed(0)}mm ${A.bx<0?"left (towards 5)":"right (towards 1)"}`:"";const ud=Math.abs(A.by)>3.5?`${Math.abs(A.by).toFixed(0)}mm ${A.by<0?"high":"low"}`:"";
    out.push({sev:2,title:"Your treble 20 grouping drifts",body:`On average your T20 darts land ${[lr,ud].filter(Boolean).join(" and ")} of the bed.`,tip:A.bx<-3.5?"Leftward drift for a right-hander is often the elbow flying out or the wrist turning in on release. Keep the elbow still and follow through straight at the target.":A.bx>3.5?"Rightward drift often comes from pulling across the body. Check your stance is side-on and your throwing line goes straight through the eye.":A.by>3.5?"Low darts usually mean an early release or a collapsing wrist. Hold the follow-through until the dart lands.":"High darts often come from a late release. Relax the grip and let the arm extend fully.",drill:"scoring"});}
  if(A.tPct!=null&&A.tAtt>=30&&A.tPct<15){const top=Object.entries(A.nb).sort((a,b)=>b[1]-a[1]).slice(0,2);
    out.push({sev:2,title:`Trebles landing ${A.tPct.toFixed(0)}% of the time`,body:`You hit the right number ${A.tNumPct.toFixed(0)}% of the time${top.length?", and stray most into "+top.map(t=>t[0]==="0"?"misses":t[0]).join(" and "):""}.`,tip:"Repeatable rhythm beats force. Same stance, same grip, same pace every dart, then let the treble come.",drill:"scoring"});}
  if(A.coPct!=null&&A.coAtt>=10&&A.coPct<30)out.push({sev:3,title:`Checkout rate ${A.coPct.toFixed(0)}%`,body:`${A.coHit} of ${A.coAtt} darts at a double in match play went in.`,tip:"Learn standard routes so you leave your favourite double. Go for 32 (D16): a single leaves 16, then 8, then 4.",drill:"c121"});
  if(A.f9avg!=null&&A.avg!=null&&A.f9avg-A.avg>10)out.push({sev:2,title:"Strong start, slow finish",body:`Your first-9 average (${A.f9avg.toFixed(1)}) is ${(A.f9avg-A.avg).toFixed(0)} points above your leg average, so legs are leaking darts on the way in.`,tip:"Practise setting up: from 100 or below, think about what each dart leaves rather than just scoring.",drill:"c121"});
  const p=A.per;if(p.length>=6){const h=Math.floor(p.length/2),a1=p.slice(0,h).reduce((a,b)=>a+b.avg,0)/h,a2=p.slice(h).reduce((a,b)=>a+b.avg,0)/(p.length-h);
    out.push(a2>=a1?{sev:1,title:`Average up ${(a2-a1).toFixed(1)}`,body:`Recent sessions average ${a2.toFixed(1)}, against ${a1.toFixed(1)} earlier.`,tip:"Keep the volume. Short daily sessions beat one long one.",drill:"x01"}:{sev:2,title:`Average down ${(a1-a2).toFixed(1)}`,body:`Recent sessions average ${a2.toFixed(1)}, against ${a1.toFixed(1)} earlier.`,tip:"Dips often follow tiredness or a changed setup. Check your oche distance (2.37m) and board height (1.73m to bull centre).",drill:"scoring"});}
  const atc=A.sessions.filter(s=>s.g==="atc");if(atc.length&&atc[atc.length-1].r.darts>60)out.push({sev:1,title:"Accuracy around the board",body:`Your last Around the Clock took ${atc[atc.length-1].r.darts} darts. Under 50 is a solid club standard.`,tip:"Move your feet, not just your arm, for the side numbers like 11 and 6.",drill:"atc"});
  if(!out.length)out.push({sev:1,title:"Not enough data yet",body:"Play a few games and the coach starts spotting patterns.",tip:"Bob's 27 and a 501 leg give the most useful data quickly.",drill:"bobs"});
  return out.sort((a,b)=>b.sev-a.sev);}


export {SEGS,RAD,pt,hitXY,val,lab,parseT,aimXY,isDbl,dblT,hitT,NB,checkout,aim,GAMES,GORDER,SCORING_G,clone,newPlay,pv,full,pushDart,commitVisit,toSession,boardSVG,sector,analyse,inRange,insights,esc,r2};
