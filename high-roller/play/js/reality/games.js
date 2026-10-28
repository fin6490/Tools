/* Level 2 floor games: the Big Six money wheel, Sic Bo under its glass dome, and the Tide coin
   pushers. They stand on the casino floor; when you play, the machine itself fills the top of the
   bet sheet, drawn and animated on a canvas, and the bets slide up from the bottom of the screen.
   All three play with the real money in your wallet.
   Odds are player-friendly like the rest of the game (about 96–98% back); the exact figures are in
   the paytables and checked by tools/l2-odds.js. */
const L2Games = (() => {
  const props = {};      // the pieces built into the current floor, by name
  const cash = () => L2.state.cash;
  const credit = n => { L2.state.cash = Math.round((L2.state.cash + n) * 100) / 100; L2.hud(); document.querySelectorAll('.l2-gcash').forEach(e => { e.textContent = fmt(L2.state.cash); }); };
  const store = () => { const s = L2.state; if (!s.games) s.games = {}; return s.games; };
  const CHIPS = [5, 25, 100, 500, 1000], MAX_SPOT = 5000;
  // 1.2 → '6 to 5', 7.5 → '15 to 2', 6.75 → '27 to 4'
  const odds = p => { for (const d of [1, 2, 4, 5]) if (Math.abs(p * d - Math.round(p * d)) < 1e-9) return `${Math.round(p * d)} to ${d}`; return p + ' to 1'; };

  /* ---------- the bottom sheet: chips, bets, and a big button ---------- */
  function sheet(title, build) {
    const o = h('div.l2-over.game'), box = h('div.l2-game'); o.append(box); document.body.append(o); R3.freeze(true);
    const chip = { v: 25 }, head = h('div.l2-gh', h('b', title), h('span.l2-gcash'), h('button.l2-x', { 'aria-label': 'Leave' }, '×'));
    const chipRow = h('div.l2-chips', CHIPS.map(v => h('button.l2-chip' + (v === chip.v ? '.on' : ''), { 'data-v': v, onclick: e => { chip.v = v; chipRow.querySelectorAll('.l2-chip').forEach(c => c.classList.toggle('on', +c.dataset.v === v)); } }, v >= 1000 ? v / 1000 + 'K' : String(v))));
    const msg = h('p.l2-gmsg');
    box.append(head, msg);
    const paint = () => { head.querySelector('.l2-gcash').textContent = fmt(cash()); };
    const api = { box, chip, chipRow, msg, paint, say: t => { msg.textContent = t; }, closed: false };
    let done;
    const closed = new Promise(r => { done = r; });
    api.close = () => { if (api.closed) return; api.closed = true; o.classList.add('out'); setTimeout(() => o.remove(), 300); setTimeout(() => R3.freeze(false), 500); document.removeEventListener('keydown', api.key); done(); };
    head.querySelector('.l2-x').onclick = () => { if (!api.busy) api.close(); };
    build(api); paint();
    api.key = e => { if (e.key === 'Escape' && !api.busy) api.close(); else if ((e.key === ' ' || e.key === 'Enter') && api.go && e.target.tagName !== 'BUTTON') { e.preventDefault(); api.go(); } };
    document.addEventListener('keydown', api.key);
    return closed;
  }
  // a set of bet spots: tap to add the selected chip, long-press or right-click to take it off
  function betBoard(api, spots, cls = '') {
    const bets = {}, els = {};
    const total = () => Object.values(bets).reduce((a, b) => a + b, 0);
    const paint = () => { for (const k in els) { const b = bets[k] || 0; els[k].querySelector('em').textContent = b ? fmt(b, { short: true }) : ''; els[k].classList.toggle('bet', !!b); } api.paint(); };
    const add = (k, v) => {
      if (api.busy) return;
      v = Math.min(v, MAX_SPOT - (bets[k] || 0), cash() - total());
      if (v <= 0) { api.say(cash() - total() <= 0 ? 'That\'s everything in your wallet.' : `${fmt(MAX_SPOT)} is the most on one spot.`); return; }
      bets[k] = (bets[k] || 0) + v; SFX.chip(); paint();
    };
    const grid = h('div.l2-board' + cls, spots.map(([k, label, sub]) => {
      const b = h('button.l2-spot', { onclick: () => add(k, api.chip.v), oncontextmenu: e => { e.preventDefault(); delete bets[k]; paint(); } }, h('b', label), sub ? h('small', sub) : null, h('em'));
      let t = 0; b.addEventListener('touchstart', () => { t = setTimeout(() => { delete bets[k]; paint(); t = -1; }, 550); }, { passive: true });
      b.addEventListener('touchend', e => { if (t === -1) e.preventDefault(); clearTimeout(t); });
      return (els[k] = b);
    }));
    return { grid, bets, total, paint, clear: () => { for (const k in bets) delete bets[k]; paint(); }, set: (b) => { for (const k in bets) delete bets[k]; Object.assign(bets, b); paint(); } };
  }
  function stage(api, draw, hgt = 190) {
    const cv = h('canvas.l2-stage'), dpr = Math.min(2, devicePixelRatio || 1); api.box.parentNode.insertBefore(cv, api.box); // the machine, above the bets
    let raf = 0, last = performance.now();
    const loop = now => { const w = cv.clientWidth || 320; if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = hgt * dpr; } const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); const dt = Math.min(.05, (now - last) / 1000); last = now; draw(g, w, hgt, dt, now / 1000); if (!api.closed) raf = requestAnimationFrame(loop); };
    cv.style.height = hgt + 'px'; raf = requestAnimationFrame(loop);
  }
  const settle = (api, staked, back, what) => {
    const net = back - staked;
    if (back > 0) credit(back);
    if (net > 0) { (net >= staked * 10 ? SFX.big : SFX.win)(); api.say(`${what} You win ${fmt(net)}.`); }
    else if (back > 0) api.say(`${what} You get ${fmt(back)} back.`);
    else { SFX.lose(); api.say(`${what} The house takes it.`); }
    App.count('l2_games'); App.save(); api.paint();
  };

  /* ================= the Big Six money wheel ================= */
  // 54 segments, as on a real wheel; paytable is kinder than a real one
  const WHEEL = { counts: { 1: 24, 2: 15, 5: 7, 10: 4, 20: 2, j: 1, m: 1 }, pays: { 1: 1.2, 2: 2.5, 5: 6.5, 10: 12, 20: 25, j: 52, m: 52 },
    label: { 1: '$1', 2: '$2', 5: '$5', 10: '$10', 20: '$20', j: 'JOKER', m: 'MERIDIAN' }, color: { 1: '#d9c27a', 2: '#4c7fd1', 5: '#8a4cc9', 10: '#2e9a58', 20: '#c8323c', j: '#141414', m: '#c9a14a' } };
  WHEEL.order = (() => {
    const n = 54, out = Array(n).fill(null);
    for (const k of ['j', 'm', 20, 10, 5, 2, 1]) {
      const c = WHEEL.counts[k], off = k === 'm' ? 27 : k === 20 ? 13 : k === 10 ? 6 : k === 5 ? 3 : 1;
      for (let i = 0; i < c; i++) { let p = Math.round(off + i * n / c) % n; while (out[p] != null) p = (p + 1) % n; out[p] = String(k); }
    }
    return out;
  })();
  const W = { theta: 0, spinning: null, flap: 0 };
  function wheel() {
    const n = 54, step = Math.PI * 2 / n;
    W.spin = idx => new Promise(done => {
      const cur = ((W.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), want = idx * step + (Math.random() - .5) * step * .7;
      const delta = ((want - cur) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2 * (4 + Math.floor(Math.random() * 2));
      W.spinning = { from: W.theta, to: W.theta + delta, t: 0, dur: 5 + Math.random(), seg: null, done };
    });
    const paintWheel = (g, w, hh, dt, t) => {
      if (W.spinning) { const S = W.spinning; S.t = Math.min(1, S.t + dt / S.dur); const k = 1 - Math.pow(1 - S.t, 3.2); W.theta = S.from + (S.to - S.from) * k; const seg = Math.floor((W.theta + step / 2) / step); if (seg !== S.seg) { S.seg = seg; W.flap = .5; SFX.click(); } if (S.t >= 1) { W.spinning = null; S.done(); } }
      W.flap *= .8;
      g.fillStyle = '#120a06'; g.fillRect(0, 0, w, hh);
      const cx = w / 2, cy = hh * .53, R = hh * .43;
      g.save(); g.translate(cx, cy); g.rotate(-W.theta);
      for (let i = 0; i < n; i++) { const k = WHEEL.order[i], a0 = -Math.PI / 2 + (i - .5) * step; g.fillStyle = WHEEL.color[k]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a0 + step); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
        g.save(); g.rotate(a0 + step / 2); g.translate(R * .78, 0); g.rotate(Math.PI / 2); g.fillStyle = k === 'j' ? '#fff' : '#1a1208'; g.font = `bold ${Math.max(7, R * .07)}px Georgia`; g.textAlign = 'center'; g.fillText(k === 'j' ? 'J' : k === 'm' ? 'M' : '$' + k, 0, 0); g.restore(); }
      g.fillStyle = '#c9a14a'; g.beginPath(); g.arc(0, 0, R * .2, 0, 7); g.fill(); g.restore();
      g.strokeStyle = '#d9b45a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R + 3, 0, 7); g.stroke();
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.fillStyle = W.spinning ? ((i + Math.floor(t * 12)) % 2 ? '#ffe9a8' : '#5a4a20') : '#ffe9a8'; g.beginPath(); g.arc(cx + Math.cos(a) * (R + 9), cy + Math.sin(a) * (R + 9), 2.5, 0, 7); g.fill(); }
      g.save(); g.translate(cx, cy - R - 6); g.rotate(W.flap); g.fillStyle = '#8a1a12'; g.beginPath(); g.moveTo(-5, -8); g.lineTo(5, -8); g.lineTo(0, 12); g.closePath(); g.fill(); g.restore();
    };
    return sheet('Big Six', api => {
      stage(api, paintWheel);
      const spots = Object.keys(WHEEL.pays).map(k => [k, WHEEL.label[k], `pays ${odds(WHEEL.pays[k])}`]);
      const B = betBoard(api, spots, '.bigsix'); let last = null;
      const spinBtn = h('button.l2-btn.go', { onclick: () => api.go() }, 'Spin');
      api.go = async () => {
        if (api.busy) return;
        if (!B.total() && last) { B.set(last); if (B.total() > cash()) { B.clear(); return api.say('Not enough for the same bets again.'); } }
        const staked = B.total(); if (!staked) return api.say('Put a chip on a spot first.');
        if (staked > cash()) return api.say('Not enough money.');
        credit(-staked); last = { ...B.bets }; api.busy = true; spinBtn.disabled = true; api.say('The dealer grabs a peg and pulls…');
        const idx = RNG.int(54); await W.spin(idx);
        const k = WHEEL.order[idx], won = B.bets[k] || 0, back = won ? won * (1 + WHEEL.pays[k]) : 0;
        settle(api, staked, back, `${WHEEL.label[k]}.`);
        if (k === 'j' || k === 'm') App.count('l2_bigsix_top');
        B.clear(); api.busy = false; spinBtn.disabled = false; spinBtn.textContent = 'Spin (same bets)';
      };
      api.say('Bet on the number the flapper stops on. Tap a spot to add a chip; right-click or hold to take bets off.');
      api.box.append(B.grid, h('div.l2-gfoot', api.chipRow, h('button.l2-btn.ghost', { onclick: () => { if (!api.busy) B.clear(); } }, 'Clear'), spinBtn));
    });
  }

  /* ================= Sic Bo: three dice under a dome ================= */
  const SUMS = { 4: 70, 5: 34, 6: 20, 7: 13, 8: 9, 9: 7.5, 10: 6.75, 11: 6.75, 12: 7.5, 13: 9, 14: 13, 15: 20, 16: 34, 17: 70 };
  // what a bet pays (profit per unit), or -1 if it loses
  function sicboPays(k, d) {
    const s = d[0] + d[1] + d[2], triple = d[0] === d[1] && d[1] === d[2];
    if (k === 'small') return !triple && s <= 10 ? 1 : -1;
    if (k === 'big') return !triple && s >= 11 ? 1 : -1;
    if (k === 'odd') return !triple && s % 2 ? 1 : -1;
    if (k === 'even') return !triple && !(s % 2) ? 1 : -1;
    if (k === 'any') return triple ? 34 : -1;
    if (k[0] === 't') return triple && d[0] === +k.slice(1) ? 210 : -1;
    if (k[0] === 's') return s === +k.slice(1) ? SUMS[s] : -1;
    if (k[0] === 'n') { const c = d.filter(x => x === +k.slice(1)).length; return c === 1 ? 1 : c === 2 ? 2 : c === 3 ? 12 : -1; }
    return -1;
  }
  const PIPS = { 1: [[.5, .5]], 2: [[.25, .25], [.75, .75]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.25, .22], [.75, .22], [.25, .5], [.75, .5], [.25, .78], [.75, .78]] };
  const DICE = { faces: [1, 1, 1], rolling: null };
  function die(g, x, y, s, v, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#f6f2ea'; g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect ? g.roundRect(-s / 2, -s / 2, s, s, s * .18) : g.rect(-s / 2, -s / 2, s, s); g.fill(); g.stroke(); g.fillStyle = v === 1 ? '#b3222b' : '#1a1a1a'; for (const [px, py] of PIPS[v]) { g.beginPath(); g.arc(-s / 2 + px * s, -s / 2 + py * s, s * .09, 0, 7); g.fill(); } g.restore(); }
  function sicbo() {
    const S = DICE;
    S.roll = out => new Promise(done => { SFX.dice(); setTimeout(() => SFX.dice(), 500); S.rolling = { t: 0, out, done }; });
    return sheet('Sic Bo', api => {
      stage(api, (g, w, hh, dt, t) => {
        const R = S.rolling; let shake = 0;
        if (R) { R.t += dt; if (R.t < 1.5) { shake = 1; if (Math.random() < .5) S.faces = S.faces.map(() => 1 + RNG.int(6)); } else { S.faces = R.out; S.rolling = null; R.done(); } }
        g.fillStyle = '#0e2a40'; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < w; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, hh); g.stroke(); }
        const cx = w / 2 + (shake ? Math.sin(t * 40) * 4 : 0), cy = hh * .6 - (shake ? Math.abs(Math.sin(t * 26)) * 8 : 0);
        g.fillStyle = '#c9a14a'; g.beginPath(); g.ellipse(cx, cy + 34, 90, 16, 0, 0, 7); g.fill();
        S.faces.forEach((v, i) => die(g, cx - 40 + i * 40 + (shake ? Math.sin(t * 31 + i) * 9 : 0), cy + 8 + (shake ? Math.cos(t * 27 + i) * 8 : 0), 30, v, shake ? t * (6 + i) : (i - 1) * .18));
        const gr = g.createRadialGradient(cx - 30, cy - 50, 10, cx, cy, 95); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(200,230,255,.08)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy + 30, 88, 110, 0, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(220,240,255,.5)'; g.stroke();
      });
      const spots = [['small', 'Small', '4–10 · 1 to 1'], ['big', 'Big', '11–17 · 1 to 1'], ['odd', 'Odd', '1 to 1'], ['even', 'Even', '1 to 1'], ['any', 'Any triple', '34 to 1'],
        ...[1, 2, 3, 4, 5, 6].map(n => ['t' + n, `${n} ${n} ${n}`, '210 to 1']),
        ...Object.keys(SUMS).map(s => ['s' + s, 'Total ' + s, odds(SUMS[s])]),
        ...[1, 2, 3, 4, 5, 6].map(n => ['n' + n, 'Number ' + n, '1·2·12 to 1'])];
      const B = betBoard(api, spots, '.sicbo'); let last = null;
      const rollBtn = h('button.l2-btn.go', { onclick: () => api.go() }, 'Roll');
      api.go = async () => {
        if (api.busy) return;
        if (!B.total() && last) { B.set(last); if (B.total() > cash()) { B.clear(); return api.say('Not enough for the same bets again.'); } }
        const staked = B.total(); if (!staked) return api.say('Put a chip on a spot first.');
        if (staked > cash()) return api.say('Not enough money.');
        credit(-staked); last = { ...B.bets }; api.busy = true; rollBtn.disabled = true; api.say('The dealer presses the button. The dome rattles.');
        const d = [1 + RNG.int(6), 1 + RNG.int(6), 1 + RNG.int(6)]; await S.roll(d);
        let back = 0; for (const k in B.bets) { const p = sicboPays(k, d); if (p >= 0) back += B.bets[k] * (1 + p); }
        const triple = d[0] === d[1] && d[1] === d[2];
        if (triple) App.count('l2_triple');
        settle(api, staked, back, `${d.join(' · ')}: ${triple ? 'a triple!' : 'total ' + (d[0] + d[1] + d[2]) + '.'}`);
        B.clear(); api.busy = false; rollBtn.disabled = false; rollBtn.textContent = 'Roll (same bets)';
      };
      api.say('Bet on the three dice under the dome. Small and Big lose to any triple.');
      api.box.append(B.grid, h('div.l2-gfoot', api.chipRow, h('button.l2-btn.ghost', { onclick: () => { if (!api.busy) B.clear(); } }, 'Clear'), rollBtn));
    });
  }

  /* ================= the Tide coin pushers ================= */
  // The shelf is a little 2D world, seen from above: x across (-1..1), y from the back (0) to the front
  // edge (1.5). The pusher's face sweeps forward and back; coins it touches are shoved, coins shove each
  // other, and anything past the front edge falls: into the tray if it's in the middle, the gutters if not.
  const PUSH = { r: .085, edge: 1.5, pay: .8, coin: 5, goldEvery: 60, goldWorth: 10, max: 190 };
  const pusherFace = t => .16 + .22 * (.5 - .5 * Math.cos(t * Math.PI * 2 / 2.6));
  function pusherNew() {
    const P = { t: 0, coins: [], drops: 0 };
    for (let i = 0; i < 120; i++) P.coins.push({ x: (Math.random() * 2 - 1) * .88, y: .45 + Math.random() * .95, g: 0 });
    for (let i = 0; i < 40; i++) pusherStep(P, 1 / 30, true);
    P.coins = P.coins.filter(c => c.y < PUSH.edge - .02);
    return P;
  }
  function pusherStep(P, dt, quiet) {
    P.t += dt; const f = pusherFace(P.t), r = PUSH.r, d2 = 4 * r * r, cs = P.coins;
    for (const c of cs) if (c.y - r < f) c.y = f + r;
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i], b = cs[j], dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy;
        if (dd >= d2 || dd === 0) continue;
        const dist = Math.sqrt(dd), push = (2 * r - dist), nx = dx / dist, ny = dy / dist;
        const aPin = a.y - r <= f + .002, bPin = b.y - r <= f + .002; // pressed against the pusher: it doesn't give
        const wa = aPin ? 0 : bPin ? 1 : .5, wb = 1 - wa;
        a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
      }
      for (const c of cs) { c.x = Math.max(-1 + r, Math.min(1 - r, c.x)); if (c.y - r < f) c.y = f + r; }
    }
    const fell = [];
    for (let i = cs.length - 1; i >= 0; i--) if (cs[i].y > PUSH.edge) { fell.push(cs[i]); cs.splice(i, 1); }
    return quiet ? [] : fell;
  }
  const aim = { x: 0 };
  function paintPusher(id, onFall) {
    const falling = [];
    return (g, w, hh, dt, t) => {
      const P = shelf(id), fell = pusherStep(P, Math.min(dt, 1 / 30));
      for (const c of fell) { falling.push({ x: c.x, g: c.g, life: 0 }); onFall(c); }
      aim.x = Math.sin(t * 1.25) * .85;
      g.fillStyle = '#1a1028'; g.fillRect(0, 0, w, hh);
      const sw = Math.min(w * .8, hh * 1.4), x0 = (w - sw) / 2, y0 = 22, sc = sw / 2, sy = (hh - y0 - 26) / PUSH.edge, X = x => x0 + (x + 1) * sc, Y = y => y0 + y * sy;
      g.fillStyle = '#2a5a7a'; g.fillRect(X(-1), Y(0), sw, PUSH.edge * sy);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(X(-1), Y(PUSH.edge) - 2, (1 - PUSH.pay) * sc, 8); g.fillRect(X(PUSH.pay), Y(PUSH.edge) - 2, (1 - PUSH.pay) * sc, 8); // the gutters
      g.fillStyle = '#d9b45a'; g.fillRect(X(-PUSH.pay), Y(PUSH.edge) + 6, PUSH.pay * 2 * sc, 6); // your tray
      const f = pusherFace(P.t); g.fillStyle = '#b8c0c8'; g.fillRect(X(-1), Y(0), sw, f * sy); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(X(-1), Y(f) - 3, sw, 3);
      for (const c of P.coins) { g.fillStyle = c.g ? '#ffcf3a' : '#d9b45a'; g.strokeStyle = 'rgba(80,50,0,.6)'; g.beginPath(); g.arc(X(c.x), Y(c.y), PUSH.r * sc, 0, 7); g.fill(); g.stroke(); }
      for (let i = falling.length - 1; i >= 0; i--) { const c = falling[i]; c.life += dt; g.globalAlpha = Math.max(0, 1 - c.life * 2); g.fillStyle = c.g ? '#ffcf3a' : '#d9b45a'; g.beginPath(); g.arc(X(c.x), Y(PUSH.edge) + c.life * 60, PUSH.r * sc, 0, 7); g.fill(); g.globalAlpha = 1; if (c.life > .5) falling.splice(i, 1); }
      g.fillStyle = '#ffd77a'; g.beginPath(); g.moveTo(X(aim.x) - 7, 4); g.lineTo(X(aim.x) + 7, 4); g.lineTo(X(aim.x), 18); g.closePath(); g.fill();
    };
  }
  const shelf = id => { const G = store(); if (!G['push' + id]) G['push' + id] = pusherNew(); return G['push' + id]; };
  function drop(id) {
    const P = shelf(id); if (P.coins.length >= PUSH.max) return false; P.drops++; const shaky = document.body.classList.contains('l2-shakes') ? .3 : .02; // trembling hands miss
    P.coins.push({ x: aim.x + (Math.random() - .5) * shaky, y: pusherFace(P.t) + PUSH.r + .01, g: 0 });
    if (P.drops % PUSH.goldEvery === 0) { P.coins.push({ x: (Math.random() - .5) * 1.2, y: pusherFace(P.t) + PUSH.r + .2, g: 1 }); return 'gold'; }
    return true;
  }
  function pusher(id) {
    const Pz = { playing: null };
    let won = 0, spent = 0;
    return sheet(id === 'a' ? 'High Tide pusher' : 'Low Tide pusher', api => {
      const info = h('p.l2-gsub', `${fmt(PUSH.coin)} a coin. Coins that fall in the middle drop into your tray; the sides are gutters. Every ${PUSH.goldEvery}th coin the machine adds a gold token worth ${PUSH.goldWorth} coins.`);
      const tally = h('div.l2-tally');
      const paintTally = () => { tally.textContent = `This visit: ${fmt(spent)} in · ${fmt(won)} out`; };
      Pz.playing = c => {
        const centre = Math.abs(c.x) <= PUSH.pay, v = PUSH.coin * (c.g ? PUSH.goldWorth : 1);
        if (centre) { won += v; credit(v); SFX.chip(); if (c.g) { SFX.big(); api.say(`A gold token drops! +${fmt(v)}.`); App.count('l2_gold'); } }
        paintTally(); api.paint();
      };
      const dropBtn = h('button.l2-btn.go', { onclick: () => api.go() }, `Drop a coin (${fmt(PUSH.coin)})`);
      api.go = () => {
        if (cash() < PUSH.coin) return api.say('Your wallet is empty.');
        const r = drop(id); if (!r) return api.say('The shelf is full. Give it a moment.');
        credit(-PUSH.coin); spent += PUSH.coin; SFX.click(); App.count('l2_coins'); paintTally();
        if (r === 'gold') api.say('The machine chimes and slides a gold token onto the shelf.');
      };
      stage(api, paintPusher(id, c => Pz.playing && Pz.playing(c)));
      api.say('Time the dropper and press Drop (or Space).');
      paintTally();
      api.box.append(info, tally, h('div.l2-gfoot', dropBtn));
    }).then(() => { Pz.playing = null; App.save(); });
  }

  return { wheel, sicbo, pusher, WHEEL, SUMS, sicboPays, PUSH, pusherNew, pusherStep, pusherFace, get props() { return props; } };
})();
