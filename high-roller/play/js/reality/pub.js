/* Pub games at the Low Tide, for real money.
   - Darts with Big Sean: the dream's own game (darts.js): one leg of 301, double out, two taps a dart.
     Your shakes, or a drink in you, make the sweeps faster.
   - Pool with Lou Marino: pub rules on a seven-ball table, reds and yellows and the black, full screen.
     Touch the table to aim (a guide shows the ghost ball and where the object ball goes), hold Shoot
     and let go when the power is right. Pot one of yours and you go again; pot the white and it's his
     turn; pot the black before your colours and you lose.
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
  // the same game as the Spur in the dream: two taps a dart (stop the pointer on a number, then stop
  // the marker on the ring), 301, double out; your shakes and a drink make the sweeps faster
  const DARTERS = { sean: { sigma: 14, start: 301, legs: 1 }, mags: { sigma: 19, start: 301, legs: 1 } };
  async function darts(id) {
    const P = L2People.PEOPLE[id], o = DARTERS[id] || { sigma: 17, start: 301, legs: 1 }, nm = id === 'sean' ? 'Big Sean' : P.name;
    const n = await stake(nm, `One leg of ${o.start}, double out. Two taps a dart, like you used to.`); if (!n) return;
    App.count('l2_dartsgame');
    const res = await new Promise(done => L2.toTable(() => Darts.match({ mode: 'x01', start: o.start, legs: o.legs, opp: { name: nm, face: '🎯', sigma: o.sigma }, stake: n, title: `${nm} · ${o.start} at the Low Tide`, l2: true }).then(done)));
    await new Promise(r => setTimeout(r, 900));
    if (res && res.won) { Career.checkAchievements(); return say([{ name: P.name, who: 'x', text: RNG.pick(['Ah, you jammy... Fair play. Fair play.', 'Somebody\'s been practising in their sleep. Here.', 'Double or nothing? ...No? Wise.']) }]); }
    return say([{ name: P.name, who: 'x', text: RNG.pick(['Unlucky. Same again?', 'Treble twenty, my old friend. Never lets me down.', 'Pay the man. The man being me.']) }]);
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
  // full screen, like the dream's tables: touch the table to aim (the guide shows where the white meets
  // the first ball and where that ball goes), then hold Shoot and let go when the power is right
  async function pool(id) {
    const P = L2People.PEOPLE[id], first = P.name.split(' ')[0], n = await stake(P.name, 'Pub rules. Reds and yellows, black last. You break.'); if (!n) return;
    L2Money.pay(n); App.count('l2_pool');
    const res = await new Promise(done => {
      const o = h('div.l2-over.game.pool'); document.body.append(o); R3.freeze(true);
      const head = h('div.l2-gh', h('b', `🎱 Pool with ${first} · ${fmt(n)} a side`), h('span.l2-gcash', fmt(S().cash)), h('button.l2-x', { 'aria-label': 'Concede' }, '×'));
      const score = h('div.l2-pscore'), cv = h('canvas.l2-stage.l2-pool'), info = h('p.l2-gmsg'), meter = h('div.l2-pmeter', h('i'));
      const shootBtn = h('button.l2-btn.go', 'Hold to shoot'), foot = h('div.l2-game', info, h('div.l2-gfoot', meter, shootBtn));
      const slot = h('div.l2-gstage', cv); o.append(head, score, slot, foot);
      const B = rack(), st = { turn: 'me', mine: null, rolling: false, firstHit: null, over: false, aim: -Math.PI / 2, power: 0, charging: null, aiAim: null };
      const COL = { w: ['#ffffff', '#c8c8c8'], r: ['#e0453a', '#7a1410'], y: ['#ffd84a', '#a87a08'], k: ['#3a3a3a', '#050505'] };
      const hisCol = () => st.mine ? (st.mine === 'r' ? 'y' : 'r') : null, left = c => B.filter(b => b.c === c && !b.in).length;
      const finish = r2 => { if (st.over === 'done') return; st.over = 'done'; o.classList.add('out'); setTimeout(() => o.remove(), 300); setTimeout(() => R3.freeze(false), 400); document.removeEventListener('keydown', key); document.removeEventListener('keyup', keyUp); done(r2); };
      head.querySelector('.l2-x').onclick = () => { if (!st.rolling) finish(null); };
      // the table on the screen: upright on a phone, on its side on a wide screen
      let L = { s: 100, ox: 0, oy: 0, rot: false, cw: 300, ch: 400 }, dpr = Math.min(2, devicePixelRatio || 1);
      const layout = () => { const cw = cv.clientWidth || 300, ch = cv.clientHeight || 400, rot = cw > ch * 1.1, rail = .09; const s = rot ? Math.min((cw - 20) / (2 + rail * 2), (ch - 20) / (1 + rail * 2)) : Math.min((cw - 20) / (1 + rail * 2), (ch - 20) / (2 + rail * 2)); L = { s, rot, cw, ch, ox: cw / 2, oy: ch / 2 }; if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); } };
      const toS = (x, y) => L.rot ? [L.ox + (y - 1) * L.s, L.oy + (.5 - x) * L.s] : [L.ox + (x - .5) * L.s, L.oy + (y - 1) * L.s];
      const fromS = (px, py) => L.rot ? [.5 - (py - L.oy) / L.s, (px - L.ox) / L.s + 1] : [(px - L.ox) / L.s + .5, (py - L.oy) / L.s + 1];
      // where the white, sent along an angle, meets its first ball: the ghost ball, and the line that ball takes
      const guide = a => { const c = B[0], dx = Math.cos(a), dy = Math.sin(a); let best = null; for (const b of B) { if (b.in || b === c) continue; const fx = b.x - c.x, fy = b.y - c.y, tca = fx * dx + fy * dy; if (tca <= 0) continue; const d2 = fx * fx + fy * fy - tca * tca, R2 = 4 * r * r; if (d2 > R2) continue; const t = tca - Math.sqrt(R2 - d2); if (!best || t < best.t) best = { t, b }; } let wall = 9; for (const [lim, v, p] of [[r, dx, c.x], [1 - r, dx, c.x], [r, dy, c.y], [2 - r, dy, c.y]]) { if (!v) continue; const t = (lim - p) / v; if (t > 1e-6 && t < wall) wall = t; } if (!best || best.t > wall) return { t: wall }; const gx = c.x + dx * best.t, gy = c.y + dy * best.t; return { t: best.t, b: best.b, gx, gy, nx: (best.b.x - gx) / (2 * r), ny: (best.b.y - gy) / (2 * r) }; };
      const draw = () => {
        if (!o.isConnected) return; layout(); const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); const s = L.s;
        g.fillStyle = '#0b0705'; g.fillRect(0, 0, L.cw, L.ch);
        const lamp = g.createRadialGradient(L.ox, L.oy, 10, L.ox, L.oy, Math.max(L.cw, L.ch) * .6); lamp.addColorStop(0, 'rgba(255,220,150,.12)'); lamp.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lamp; g.fillRect(0, 0, L.cw, L.ch);
        const [ax, ay] = toS(0, 0), [bx, by] = toS(1, 2), x0 = Math.min(ax, bx), y0 = Math.min(ay, by), w = Math.abs(bx - ax), hh = Math.abs(by - ay), rail = .09 * s;
        const wood = g.createLinearGradient(x0 - rail, y0 - rail, x0 + w + rail, y0 + hh + rail); wood.addColorStop(0, '#6a3a1a'); wood.addColorStop(.5, '#4a2610'); wood.addColorStop(1, '#2e160a');
        g.fillStyle = wood; g.beginPath(); g.roundRect ? g.roundRect(x0 - rail, y0 - rail, w + rail * 2, hh + rail * 2, rail * .6) : g.rect(x0 - rail, y0 - rail, w + rail * 2, hh + rail * 2); g.fill();
        g.fillStyle = '#e8d8a8'; for (let i = 1; i < 8; i++) { if (i === 4) continue; const u = i / 8; for (const [px, py] of L.rot ? [[x0 + u * w, y0 - rail / 2], [x0 + u * w, y0 + hh + rail / 2]] : [[x0 - rail / 2, y0 + u * hh], [x0 + w + rail / 2, y0 + u * hh]]) { g.beginPath(); g.arc(px, py, 2, 0, 7); g.fill(); } }
        const felt = g.createRadialGradient(x0 + w / 2, y0 + hh / 2, 10, x0 + w / 2, y0 + hh / 2, Math.max(w, hh) * .7); felt.addColorStop(0, '#2a8a52'); felt.addColorStop(1, '#155a32'); g.fillStyle = felt; g.fillRect(x0, y0, w, hh);
        g.strokeStyle = '#0e3e22'; g.lineWidth = 3; g.strokeRect(x0 + 1.5, y0 + 1.5, w - 3, hh - 3);
        const [l1x, l1y] = toS(0, 1.5), [l2x, l2y] = toS(1, 1.5); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(l1x, l1y); g.lineTo(l2x, l2y); g.stroke();
        for (const [px, py] of POCKETS) { const [qx, qy] = toS(px, py); g.fillStyle = '#2a1408'; g.beginPath(); g.arc(qx, qy, r * s * 2.3, 0, 7); g.fill(); g.fillStyle = '#020202'; g.beginPath(); g.arc(qx, qy, r * s * 1.8, 0, 7); g.fill(); }
        // the guide and the cue, on your shot
        const cue = B[0];
        if (!st.rolling && !st.over && !cue.in) {
          const a = st.turn === 'me' ? st.aim : st.aiAim; if (a != null) {
            const G2 = guide(a), [cx, cy] = toS(cue.x, cue.y), [ex, ey] = toS(G2.gx != null ? G2.gx : cue.x + Math.cos(a) * G2.t, G2.gy != null ? G2.gy : cue.y + Math.sin(a) * G2.t);
            g.strokeStyle = 'rgba(255,255,255,.6)'; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
            if (G2.b) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(ex, ey, r * s, 0, 7); g.stroke(); const [ox2, oy2] = toS(G2.b.x, G2.b.y), [tx, ty] = toS(G2.b.x + G2.nx * .35, G2.b.y + G2.ny * .35); g.strokeStyle = 'rgba(255,230,140,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox2, oy2); g.lineTo(tx, ty); g.stroke(); }
            const pull = 10 + (st.turn === 'me' ? st.power : .4) * 40, [dx, dy] = toS(cue.x - Math.cos(a), cue.y - Math.sin(a)), ux = (dx - cx), uy = (dy - cy), ul = Math.hypot(ux, uy) || 1;
            const c0 = [cx + ux / ul * (r * s + pull), cy + uy / ul * (r * s + pull)], c1 = [cx + ux / ul * (r * s + pull + s * .9), cy + uy / ul * (r * s + pull + s * .9)];
            g.lineCap = 'round'; g.strokeStyle = '#3a2210'; g.lineWidth = 7; g.beginPath(); g.moveTo(...c0); g.lineTo(...c1); g.stroke(); g.strokeStyle = '#d8b07a'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(...c0); g.lineTo(c0[0] + (c1[0] - c0[0]) * .7, c0[1] + (c1[1] - c0[1]) * .7); g.stroke(); g.strokeStyle = '#e8eef4'; g.lineWidth = 4; g.beginPath(); g.moveTo(...c0); g.lineTo(c0[0] + ux / ul * 4, c0[1] + uy / ul * 4); g.stroke(); g.lineCap = 'butt';
          }
        }
        for (const b of B) { if (b.in) continue; const [bx2, by2] = toS(b.x, b.y), R2 = r * s; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(bx2 + R2 * .25, by2 + R2 * .3, R2, R2 * .9, 0, 0, 7); g.fill(); const gr = g.createRadialGradient(bx2 - R2 * .35, by2 - R2 * .4, R2 * .1, bx2, by2, R2); gr.addColorStop(0, COL[b.c][0]); gr.addColorStop(1, COL[b.c][1]); g.fillStyle = gr; g.beginPath(); g.arc(bx2, by2, R2, 0, 7); g.fill(); if (b.c === 'k') { g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(bx2, by2, R2 * .42, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = `bold ${R2 * .7}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', bx2, by2 + .5); } g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(bx2 - R2 * .35, by2 - R2 * .4, R2 * .22, 0, 7); g.fill(); }
        if (st.charging) { st.power = (Math.sin((performance.now() - st.charging) / 1000 * 2.4 - Math.PI / 2) + 1) / 2; meter.firstChild.style.width = Math.round(st.power * 100) + '%'; meter.firstChild.style.background = `hsl(${120 - st.power * 120},70%,50%)`; }
        requestAnimationFrame(draw);
      };
      const paintScore = () => { score.innerHTML = ''; score.append(h('span' + (st.turn === 'me' ? '.on' : ''), `You ${st.mine ? (st.mine === 'r' ? '🔴' : '🟡') + ' ' + left(st.mine) + ' left' : ''}`), h('span.mid', st.mine ? '' : 'Open table'), h('span' + (st.turn === 'him' ? '.on' : ''), `${first} ${st.mine ? (hisCol() === 'r' ? '🔴' : '🟡') + ' ' + left(hisCol()) + ' left' : ''}`)); shootBtn.disabled = st.turn !== 'me' || st.rolling; };
      const shoot = (a, p) => { const cue = B[0]; cue.vx = Math.cos(a) * p; cue.vy = Math.sin(a) * p; st.rolling = true; st.firstHit = null; paintScore(); SFX.click && SFX.click(); const pots = []; let last = performance.now();
        return new Promise(res2 => { const step = () => { if (!o.isConnected) return res2(pots); const now = performance.now(), dt = Math.min(.03, (now - last) / 1000); last = now; const r2 = simulate(B, dt); for (const b of r2.pots) { pots.push(b); SFX.chip && SFX.chip(); } for (const [a2, b2] of r2.hits) if (!st.firstHit && (a2 === cue || b2 === cue)) st.firstHit = a2 === cue ? b2 : a2; if (r2.moving) requestAnimationFrame(step); else { st.rolling = false; res2(pots); } }; requestAnimationFrame(step); }); };
      const after = async (pots, who) => {
        const me = who === 'me', cueIn = B[0].in, black = pots.find(b => b.c === 'k'), own = me ? st.mine : hisCol();
        if (!st.mine) { const f = pots.find(b => b.c === 'r' || b.c === 'y'); if (f && !cueIn) { st.mine = me ? f.c : (f.c === 'r' ? 'y' : 'r'); info.textContent = `${me ? 'You\'re' : `${first}'s`} on ${f.c === 'r' ? 'reds' : 'yellows'}.`; } }
        if (black) { const ownLeft = own ? left(own) : 1, win = ownLeft === 0 && !cueIn; info.textContent = win ? (me ? 'The black goes down. Game!' : `${first} sinks the black.`) : (me ? 'The black, too early. That\'s the game.' : `${first} pots the black early! You win.`); paintScore(); setTimeout(() => finish((win && me) || (!win && !me) ? 'win' : 'lose'), 1400); st.over = true; return; }
        if (cueIn) { B[0].in = false; B[0].x = .5; B[0].y = 1.55; B[0].vx = B[0].vy = 0; info.textContent = me ? 'In-off. Foul: his shot.' : `${first}'s gone in-off! Your shot.`; st.turn = me ? 'him' : 'me'; }
        else if (!st.firstHit) { info.textContent = me ? 'Missed everything. Foul: his shot.' : `${first} missed everything. Your shot.`; st.turn = me ? 'him' : 'me'; }
        else { const potOwn = pots.some(b => (st.mine ? b.c === own : (b.c === 'r' || b.c === 'y'))); if (!potOwn) { st.turn = me ? 'him' : 'me'; info.textContent = me ? 'Nothing down. His shot.' : `Nothing for ${first}. Your shot.`; } else info.textContent = me ? 'Down! Go again.' : `${first} pots one. Still on.`; }
        paintScore();
        if (st.turn === 'him' && !st.over) {
          await new Promise(r2 => setTimeout(r2, 700)); if (!o.isConnected) return;
          const s2 = aiShot(B, b => st.mine ? b.c === hisCol() || (left(hisCol()) === 0 && b.c === 'k') : b.c !== 'k');
          const from = st.aim; for (let i = 1; i <= 20; i++) { st.aiAim = from + (((s2.a - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * i / 20; await new Promise(r2 => setTimeout(r2, 35)); } await new Promise(r2 => setTimeout(r2, 350));
          st.aiAim = null; const pots2 = await shoot(s2.a, s2.p); await after(pots2, 'him');
        } else if (st.turn === 'me' && !st.over) { const c = B[0]; const t = B.find(b => !b.in && b !== c && (st.mine ? b.c === st.mine || (left(st.mine) === 0 && b.c === 'k') : b.c !== 'k')); if (t) st.aim = Math.atan2(t.y - c.y, t.x - c.x); }
      };
      // aim: touch or drag on the table; shoot: hold the button (or Space) and let go
      const aimAt = e => { if (st.turn !== 'me' || st.rolling || st.over) return; const rc = cv.getBoundingClientRect(), [x, y] = fromS(e.clientX - rc.left, e.clientY - rc.top), c = B[0]; if (Math.hypot(x - c.x, y - c.y) > .01) st.aim = Math.atan2(y - c.y, x - c.x); };
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } cv._drag = true; aimAt(e); });
      cv.addEventListener('pointermove', e => { if (cv._drag) aimAt(e); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => cv.addEventListener(ev, () => { cv._drag = false; }));
      const charge = () => { if (st.turn !== 'me' || st.rolling || st.over || st.charging) return; st.charging = performance.now(); };
      const release = async () => { if (!st.charging) return; st.charging = null; const p = Math.max(.08, st.power), shake = shaky(), a = st.aim + gauss() * (.004 + .025 * shake); const pots = await shoot(a, p * 3.8); st.power = 0; meter.firstChild.style.width = '0'; await after(pots, 'me'); };
      shootBtn.addEventListener('pointerdown', e => { e.preventDefault(); charge(); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => shootBtn.addEventListener(ev, release));
      const key = e => { if (e.key === 'Escape' && !st.rolling) finish(null); if (st.turn !== 'me' || st.rolling) return; if (e.key === 'ArrowLeft') st.aim -= e.shiftKey ? .05 : .008; if (e.key === 'ArrowRight') st.aim += e.shiftKey ? .05 : .008; if (e.key === ' ' && !e.repeat) { e.preventDefault(); charge(); } };
      const keyUp = e => { if (e.key === ' ') release(); };
      document.addEventListener('keydown', key); document.addEventListener('keyup', keyUp);
      info.textContent = 'Touch the table to aim: the white line shows where the cue ball goes, the gold line where the ball it hits goes. Hold Shoot (or Space) and let go when the power is right.' + (shaky() ? ' Your hands aren\'t steady tonight.' : '');
      paintScore(); requestAnimationFrame(draw);
    });
    if (res === 'win') { L2Money.earn(n * 2); App.count('l2_poolwin'); Career.checkAchievements(); return say([{ name: P.name, who: 'x', text: RNG.pick(['Well, well. A shark in the Low Tide. Take it, take it.', 'Beginner\'s luck. That\'s what I\'m telling everyone.', 'Rematch. Not tonight. My ego needs a lie down.']) }, { who: 'narr', text: `*${fmt(n * 2)} back in your pocket.*` }]); }
    return say([{ name: P.name, who: 'x', text: res ? RNG.pick(['Unlucky, friend. Rack \'em again?', 'The black\'s a cruel ball. Pay up.', 'Nice try. Really. I mean it. Mostly.']) : 'Walking away? I\'ll take that as a win.' }]);
  }
  return { darts, pool, _rack: rack, _sim: simulate, _ai: aiShot };
})();
