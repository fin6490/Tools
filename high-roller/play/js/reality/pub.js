/* Pub games at the Low Tide, for real money.
   - Darts with Big Sean: three rounds of three darts each, highest total takes the stake. Hold your
     finger on the board to aim (the point you're aiming at sways, more with the shakes or a drink
     in you) and let go to throw. Scored on a real board (Darts.score from the dream).
   - Pool with Lou Marino: pub rules on a seven-ball table, reds and yellows and the black. Drag back
     from the cue ball like a catapult to aim and set the power; let go to shoot. Pot one of yours and
     you go again; pot the white and it's his turn; pot the black before your colours and you lose.
   Both pay out of (and into) your real wallet. */
const L2Pub = (() => {
  const S = () => L2.state;
  const say = (...a) => L2.ui.say(...a), choose = (...a) => L2.ui.choose(...a);
  const shaky = () => { const d = L2Bottle.state; return (d.path === 'sober' ? 0 : d.crave >= 80 ? 1 : d.crave >= 60 ? .5 : 0) + (d.buzz > 30 ? .6 : 0); };
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  async function stake(who, what) {
    const c = await choose(`${who}: "${what}" You have ${fmt(S().cash)}.`, [['20', '$20'], ['50', '$50'], ['100', '$100'], ['no', 'Not now']]);
    if (c === 'no' || !c) return 0; const n = +c; if (S().cash < n) { L2.toast('Not enough money.'); return 0; } return n;
  }

  /* ======================= darts ======================= */
  function drawBoard(g, W, mm, darts, aim) {
    const cx = W / 2, cy = W / 2, R = Darts.R, k = mm;
    g.fillStyle = '#1a120c'; g.fillRect(0, 0, W, W);
    g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, R.back * k, 0, 7); g.fill();
    for (let i = 0; i < 20; i++) {
      const a0 = (i * 18 - 9 - 90) * Math.PI / 180, a1 = a0 + 18 * Math.PI / 180, dark = i % 2 === 0;
      const ring = (r0, r1, col) => { g.beginPath(); g.arc(cx, cy, r1 * k, a0, a1); g.arc(cx, cy, r0 * k, a1, a0, true); g.closePath(); g.fillStyle = col; g.fill(); };
      ring(R.outer, R.tIn, dark ? '#1b1b1b' : '#efe2c0'); ring(R.tIn, R.tOut, dark ? '#c0392b' : '#1e7a44'); ring(R.tOut, R.dIn, dark ? '#1b1b1b' : '#efe2c0'); ring(R.dIn, R.dOut, dark ? '#c0392b' : '#1e7a44');
      const am = (i * 18 - 90) * Math.PI / 180; g.fillStyle = '#e8e2d4'; g.font = `bold ${Math.round(11 * W / 300)}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(Darts.ORDER[i]), cx + Math.cos(am) * (R.numbers + 12) * k, cy + Math.sin(am) * (R.numbers + 12) * k);
    }
    g.fillStyle = '#1e7a44'; g.beginPath(); g.arc(cx, cy, R.outer * k, 0, 7); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(cx, cy, R.bull * k, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,200,200,.5)'; g.lineWidth = 1; for (const r of [R.outer, R.tIn, R.tOut, R.dIn, R.dOut]) { g.beginPath(); g.arc(cx, cy, r * k, 0, 7); g.stroke(); }
    for (const d of darts) { const x = cx + d.x * k, y = cy + d.y * k; g.fillStyle = d.me ? '#ffd34d' : '#6fc3e8'; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 1; g.stroke(); g.strokeStyle = d.me ? 'rgba(255,211,77,.7)' : 'rgba(111,195,232,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y - 12); g.stroke(); }
    if (aim) { const x = cx + aim.x * k, y = cy + aim.y * k; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 9, 0, 7); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke(); }
  }
  async function darts(id) {
    const P = L2People.PEOPLE[id], n = await stake(P.name, 'Three darts a round, three rounds, highest total takes the pot.'); if (!n) return;
    L2Money.pay(n); App.count('l2_darts');
    const res = await L2.ui.panel(`🎯 Darts with ${P.name.split(' ').slice(-1)[0] === 'Doyle' ? 'Big Sean' : P.name}`, done => {
      const W = Math.min(320, innerWidth - 60), cv = h('canvas.l2-dartboard', { width: W * 2, height: W * 2, style: `width:${W}px;height:${W}px` }), g = cv.getContext('2d'); g.scale(2, 2);
      const mm = W / 2 / (Darts.R.back + 10), info = h('p.l2-read'), score = h('div.l2-dscore');
      const st = { round: 0, me: [0, 0, 0], him: [0, 0, 0], darts: [], thrown: 0, aim: null, hold: null, busy: false };
      const paint = () => { drawBoard(g, W, mm, st.darts, st.aim); score.textContent = `You ${st.me.reduce((a, b) => a + b)} · ${P.name.split(' ')[1] || P.name} ${st.him.reduce((a, b) => a + b)} · Round ${Math.min(3, st.round + 1)} of 3`; };
      let raf = 0, t0 = performance.now();
      const loop = () => { raf = requestAnimationFrame(loop); if (!cv.isConnected) { cancelAnimationFrame(raf); return; } if (st.hold) { const t = (performance.now() - t0) / 1000, amp = 9 + 26 * shaky(); st.aim = { x: st.hold.x + Math.sin(t * 2.3) * amp + Math.sin(t * 5.1) * amp * .35, y: st.hold.y + Math.cos(t * 1.7) * amp * .8 + Math.sin(t * 4.3) * amp * .3 }; paint(); } };
      raf = requestAnimationFrame(loop);
      const toMM = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - W / 2) / mm, y: (e.clientY - r.top - W / 2) / mm - 18 }; }; // aim a little above your finger so you can see it
      cv.addEventListener('pointerdown', e => { if (st.busy) return; cv.setPointerCapture(e.pointerId); st.hold = toMM(e); });
      cv.addEventListener('pointermove', e => { if (st.hold) st.hold = toMM(e); });
      cv.addEventListener('pointerup', async () => {
        if (!st.hold || st.busy) return; const a = st.aim || st.hold; st.hold = null; st.aim = null;
        const sig = 7 + 10 * shaky(), x = a.x + gauss() * sig, y = a.y + gauss() * sig, sc = Darts.score(x, y);
        st.darts.push({ x, y, me: true }); st.me[st.round] += sc.v; st.thrown++; SFX.click && SFX.click(); info.textContent = `${sc.label}${sc.v ? ` (${sc.v})` : ''}`; paint();
        if (st.thrown < 3) return;
        st.busy = true; await new Promise(r => setTimeout(r, 700)); st.darts = st.darts.filter(d => d.me);
        for (let i = 0; i < 3; i++) { await new Promise(r => setTimeout(r, 600)); const tg = Darts.spot(st.round === 2 && st.him.reduce((a2, b) => a2 + b) > st.me.reduce((a2, b) => a2 + b) + 60 ? 'T19' : 'T20'), s2 = 17, dx = tg.x + gauss() * s2, dy = tg.y + gauss() * s2, sc2 = Darts.score(dx, dy); st.darts.push({ x: dx, y: dy }); st.him[st.round] += sc2.v; info.textContent = `${P.name.split(' ').slice(-1)[0]}: ${sc2.label}${sc2.v ? ` (${sc2.v})` : ''}`; paint(); }
        await new Promise(r => setTimeout(r, 900));
        st.round++; st.thrown = 0; st.darts = []; st.busy = false;
        if (st.round >= 3) { const a2 = st.me.reduce((p, q) => p + q), b = st.him.reduce((p, q) => p + q); cancelAnimationFrame(raf); done(a2 > b ? 'win' : a2 < b ? 'lose' : 'draw'); return; }
        info.textContent = 'Your throw. Hold on the board to aim, let go to throw.'; paint();
      });
      info.textContent = 'Hold on the board to aim, let go to throw.' + (shaky() ? ' Your hands aren\'t steady tonight.' : ''); paint();
      return h('div.l2-pubgame', score, cv, info);
    }, { closeLabel: 'Concede' });
    if (res === 'win') { L2Money.earn(n * 2); App.count('l2_dartswin'); Career.checkAchievements(); return say([{ name: P.name, who: 'x', text: RNG.pick(['Ah, you jammy... Fair play. Fair play.', 'Somebody\'s been practising in their sleep. Here.', 'Double or nothing? ...No? Wise.']) }, { who: 'narr', text: `*${fmt(n * 2)} back in your wallet.*` }]); }
    if (res === 'draw') { L2Money.earn(n); return say([{ name: P.name, who: 'x', text: 'A draw! Nobody pays. Nobody\'s happy. Perfect.' }]); }
    return say([{ name: P.name, who: 'x', text: res ? RNG.pick(['Unlucky. Same again?', 'Treble twenty, my old friend. Never lets me down.', 'Pay the man. The man being me.']) : 'Giving up? I\'ll keep the stake, then.' }]);
  }

  /* ======================= pool ======================= */
  // the table runs up the screen: x across 0..1, y down 0..2; balls have radius r
  const r = .028, POCKETS = [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]];
  function rack() {
    const balls = [{ c: 'w', x: .5, y: 1.55 }], cols = ['r', 'y', 'r', 'y', 'r', 'y', 'y', 'r', 'r', 'y', 'r', 'y', 'r', 'y'];
    let i = 0; for (let row = 0; row < 5; row++) for (let j = 0; j <= row; j++) balls.push({ c: row === 2 && j === 1 ? 'k' : cols[i++], x: .5 + (j - row / 2) * r * 2.05, y: .5 - row * r * 1.78 });
    return balls.map(b => ({ ...b, vx: 0, vy: 0, in: false }));
  }
  function simulate(B, dt) {
    let moving = false; const pots = [], hits = [];
    for (let s = 0; s < 4; s++) {
      const h2 = dt / 4;
      for (const b of B) { if (b.in) continue; b.x += b.vx * h2; b.y += b.vy * h2; const sp = Math.hypot(b.vx, b.vy); if (sp > 0) { const f = Math.max(0, sp - .5 * h2) / sp; b.vx *= f; b.vy *= f; } if (sp < .004) { b.vx = b.vy = 0; }
        for (const [px, py] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < r * 1.9) { b.in = true; b.vx = b.vy = 0; pots.push(b); }
        if (b.in) continue;
        if (b.x < r) { b.x = r; b.vx = -b.vx * .8; } if (b.x > 1 - r) { b.x = 1 - r; b.vx = -b.vx * .8; } if (b.y < r) { b.y = r; b.vy = -b.vy * .8; } if (b.y > 2 - r) { b.y = 2 - r; b.vy = -b.vy * .8; } }
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j]; if (a.in || b.in) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= 2 * r || d === 0) continue;
        const nx = dx / d, ny = dy / d, ov = 2 * r - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rel <= 0) continue;
        a.vx -= rel * nx * .97; a.vy -= rel * ny * .97; b.vx += rel * nx * .97; b.vy += rel * ny * .97; hits.push([a, b]);
      }
    }
    for (const b of B) if (!b.in && (b.vx || b.vy)) moving = true;
    return { moving, pots, hits };
  }
  // Lou picks the shot with the best cut angle and a clear line, and plays it with a little error
  function aiShot(B, mine) {
    const cue = B[0]; let best = null;
    const clear = (x0, y0, x1, y1, skip) => B.every(b => { if (b.in || skip.includes(b)) return true; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), u = ((b.x - x0) * dx + (b.y - y0) * dy) / (L * L); if (u < 0 || u > 1) return true; return Math.hypot(x0 + dx * u - b.x, y0 + dy * u - b.y) > r * 2.05; });
    for (const b of B) { if (b.in || b === cue || !mine(b)) continue; for (const [px, py] of POCKETS) {
      const dx = px - b.x, dy = py - b.y, L = Math.hypot(dx, dy), gx = b.x - dx / L * 2 * r, gy = b.y - dy / L * 2 * r, cx = gx - cue.x, cy = gy - cue.y, CL = Math.hypot(cx, cy);
      const cut = (cx * dx + cy * dy) / (CL * L); if (cut < .35) continue;
      if (!clear(cue.x, cue.y, gx, gy, [cue, b]) || !clear(b.x, b.y, px, py, [b])) continue;
      const v = cut * 2 - L * .4 - CL * .3; if (!best || v > best.v) best = { v, a: Math.atan2(cy, cx), p: Math.min(3.2, 1.2 + (L + CL) * 1.3) };
    } }
    if (!best) { const t = B.find(b => !b.in && b !== cue && mine(b)) || B.find(b => !b.in && b !== cue); best = { a: Math.atan2(t.y - cue.y, t.x - cue.x), p: 1.8 }; }
    return { a: best.a + gauss() * .018, p: best.p };
  }
  async function pool(id) {
    const P = L2People.PEOPLE[id], n = await stake(P.name, 'Pub rules. Reds and yellows, black last. You break.'); if (!n) return;
    L2Money.pay(n); App.count('l2_pool');
    const res = await L2.ui.panel(`🎱 Pool with ${P.name.split(' ')[0]}`, done => {
      const H = Math.min(440, innerHeight - 260), W = H / 2, pad = 14, cv = h('canvas.l2-pooltable', { width: (W + pad * 2) * 2, height: (H + pad * 2) * 2, style: `width:${W + pad * 2}px;height:${H + pad * 2}px` }), g = cv.getContext('2d'); g.scale(2, 2);
      const info = h('p.l2-read'), score = h('div.l2-dscore');
      const B = rack(), st = { turn: 'me', mine: null, drag: null, rolling: false, firstHit: null, over: false };
      const sx = x => pad + x * W, sy = y => pad + y * W;
      const COL = { w: '#f4f4f4', r: '#c0392b', y: '#f1c40f', k: '#111' };
      const myCol = () => st.mine, hisCol = () => st.mine ? (st.mine === 'r' ? 'y' : 'r') : null;
      const left = c => B.filter(b => b.c === c && !b.in).length;
      const paint = () => {
        g.fillStyle = '#3a2214'; g.fillRect(0, 0, W + pad * 2, H + pad * 2); g.fillStyle = '#1e6a3a'; g.fillRect(pad, pad, W, H);
        g.strokeStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(pad, sy(1.5)); g.lineTo(pad + W, sy(1.5)); g.stroke();
        for (const [px, py] of POCKETS) { g.fillStyle = '#050505'; g.beginPath(); g.arc(sx(px), sy(py), r * W * 1.9, 0, 7); g.fill(); }
        for (const b of B) { if (b.in) continue; g.fillStyle = COL[b.c]; g.beginPath(); g.arc(sx(b.x), sy(b.y), r * W, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(sx(b.x) - r * W * .3, sy(b.y) - r * W * .3, r * W * .3, 0, 7); g.fill(); }
        if (st.drag && !st.rolling) { const cue = B[0], dx = st.drag.x0 - st.drag.x, dy = st.drag.y0 - st.drag.y, L = Math.hypot(dx, dy) || 1, pw = Math.min(1, L / 120);
          g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(sx(cue.x), sy(cue.y)); g.lineTo(sx(cue.x) + dx / L * 260, sy(cue.y) + dy / L * 260); g.stroke(); g.setLineDash([]);
          g.strokeStyle = '#c8a070'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(cue.x) - dx / L * (12 + pw * 30), sy(cue.y) - dy / L * (12 + pw * 30)); g.lineTo(sx(cue.x) - dx / L * (140 + pw * 30), sy(cue.y) - dy / L * (140 + pw * 30)); g.stroke(); g.lineWidth = 1;
          g.fillStyle = `hsl(${120 - pw * 120},70%,50%)`; g.fillRect(pad, H + pad + 4, W * pw, 5); }
        score.textContent = `${st.mine ? `You: ${st.mine === 'r' ? '🔴 reds' : '🟡 yellows'} (${left(st.mine)} left) · ${P.name.split(' ')[0]}: ${left(hisCol())} left` : 'Open table'} · ${st.turn === 'me' ? 'Your shot' : `${P.name.split(' ')[0]}'s shot`}`;
      };
      const shoot = (a, p) => { const cue = B[0]; cue.vx = Math.cos(a) * p; cue.vy = Math.sin(a) * p; st.rolling = true; st.firstHit = null; const pots = []; let last = performance.now();
        return new Promise(res2 => { const step = () => { if (!cv.isConnected) return res2(pots); const now = performance.now(), dt = Math.min(.03, (now - last) / 1000); last = now; const o = simulate(B, dt); pots.push(...o.pots); for (const [a2, b2] of o.hits) if (!st.firstHit && (a2 === cue || b2 === cue)) st.firstHit = a2 === cue ? b2 : a2; if (o.pots.length) SFX.chip && SFX.chip(); paint(); if (o.moving) requestAnimationFrame(step); else { st.rolling = false; res2(pots); } }; requestAnimationFrame(step); }); };
      // after a shot: who's on, what's won
      const after = async (pots, who) => {
        const me = who === 'me', cueIn = B[0].in, black = pots.find(b => b.c === 'k'), own = me ? myCol() : hisCol();
        if (!st.mine) { const first = pots.find(b => b.c === 'r' || b.c === 'y'); if (first && !cueIn) { st.mine = me ? first.c : (first.c === 'r' ? 'y' : 'r'); info.textContent = `${me ? 'You\'re' : `${P.name.split(' ')[0]}'s`} on ${first.c === 'r' ? 'reds' : 'yellows'}.`; } }
        if (black) { const ownLeft = own ? left(own) : 1; const win = ownLeft === 0 && !cueIn; st.over = true; done((win && me) || (!win && !me) ? 'win' : 'lose'); return; }
        if (cueIn) { B[0].in = false; B[0].x = .5; B[0].y = 1.55; B[0].vx = B[0].vy = 0; info.textContent = me ? 'In-off. Foul: his shot.' : 'He\'s gone in-off! Your shot.'; st.turn = me ? 'him' : 'me'; }
        else if (!st.firstHit) { info.textContent = me ? 'Missed everything. Foul: his shot.' : 'He missed everything. Your shot.'; st.turn = me ? 'him' : 'me'; }
        else { const potOwn = pots.some(b => (st.mine ? b.c === (me ? myCol() : hisCol()) : (b.c === 'r' || b.c === 'y'))); if (!potOwn) { st.turn = me ? 'him' : 'me'; info.textContent = me ? 'Nothing down. His shot.' : 'Nothing for him. Your shot.'; } else info.textContent = me ? 'Down! Go again.' : 'He pots one. He\'s still on.'; }
        paint();
        if (st.turn === 'him' && !st.over) { await new Promise(r2 => setTimeout(r2, 900)); if (!cv.isConnected) return; const s2 = aiShot(B, b => st.mine ? b.c === hisCol() || (left(hisCol()) === 0 && b.c === 'k') : b.c !== 'k'); const pots2 = await shoot(s2.a, s2.p); await after(pots2, 'him'); }
      };
      const pt = e => { const rc = cv.getBoundingClientRect(); return { x: e.clientX - rc.left, y: e.clientY - rc.top }; };
      cv.addEventListener('pointerdown', e => { if (st.rolling || st.turn !== 'me' || st.over) return; cv.setPointerCapture(e.pointerId); const p = pt(e); st.drag = { x0: p.x, y0: p.y, x: p.x, y: p.y }; paint(); });
      cv.addEventListener('pointermove', e => { if (!st.drag) return; const p = pt(e); st.drag.x = p.x; st.drag.y = p.y; paint(); });
      cv.addEventListener('pointerup', async () => {
        const d = st.drag; st.drag = null; if (!d) return; const dx = d.x0 - d.x, dy = d.y0 - d.y, L = Math.hypot(dx, dy); if (L < 10) { paint(); return; }
        const shake = shaky(), a = Math.atan2(dy, dx) + gauss() * (.006 + .03 * shake), p = Math.min(1, L / 120) * 3.6;
        const pots = await shoot(a, p); await after(pots, 'me');
      });
      info.textContent = 'Drag back from anywhere, like a catapult: the line shows where the white goes. Let go to shoot.'; paint();
      return h('div.l2-pubgame', score, cv, info);
    }, { closeLabel: 'Concede' });
    if (res === 'win') { L2Money.earn(n * 2); App.count('l2_poolwin'); Career.checkAchievements(); return say([{ name: P.name, who: 'x', text: RNG.pick(['Well, well. A shark in the Low Tide. Take it, take it.', 'Beginner\'s luck. That\'s what I\'m telling everyone.', 'Rematch. Not tonight. My ego needs a lie down.']) }, { who: 'narr', text: `*${fmt(n * 2)} back in your wallet.*` }]); }
    return say([{ name: P.name, who: 'x', text: res ? RNG.pick(['Unlucky, friend. Rack \'em again?', 'The black\'s a cruel ball. Pay up.', 'Nice try. Really. I mean it. Mostly.']) : 'Walking away? I\'ll take that as a win.' }]);
  }
  return { darts, pool, _rack: rack, _sim: simulate, _ai: aiShot };
})();
