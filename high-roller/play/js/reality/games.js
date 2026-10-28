/* Level 2 floor games: the Big Six money wheel, Sic Bo under its glass dome, and the Tide coin
   pushers. They stand on the casino floor; when you play one it fills the screen like the tables in
   the dream: the machine, drawn and animated on a canvas, over the bets.
   All three play with the real money in your wallet, and all three feed the Meridian Jackpots: three
   progressive meters (Mini, Major, Grand) shown on every machine. A $5 jackpot bet on the wheel or the
   dice (or a JP chip falling into a pusher's tray) earns a spin of the Jackpot Wheel, which you spin
   yourself. Odds are player-friendly like the rest of the game (about 95–98% back); the exact figures
   are in the paytables and checked by tools/l2-odds.js. */
const L2Games = (() => {
  const props = {};      // the pieces built into the current floor, by name
  const cash = () => L2.state.cash;
  const credit = n => { L2.state.cash = Math.round((L2.state.cash + n) * 100) / 100; L2.hud(); document.querySelectorAll('.l2-gcash').forEach(e => { e.textContent = fmt(L2.state.cash); }); };
  const store = () => { const s = L2.state; if (!s.games) s.games = {}; return s.games; };
  const CHIPS = [5, 25, 100, 500, 1000], MAX_SPOT = 5000;
  // 1.2 → '6 to 5', 7.5 → '15 to 2', 6.75 → '27 to 4'
  const odds = p => { for (const d of [1, 2, 4, 5]) if (Math.abs(p * d - Math.round(p * d)) < 1e-9) return `${Math.round(p * d)} to ${d}`; return p + ' to 1'; };
  const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ================= the Meridian Jackpots ================= */
  // Three meters shared by every floor game. Each jackpot bet ($5) puts 60¢ on them, each pusher coin
  // 10¢, and the rest of the floor (the other players) nudges them up while you watch. Won meters go
  // back to their seed.
  const JP = { keys: ['mini', 'major', 'grand'], seed: { mini: 100, major: 500, grand: 2000 }, share: { mini: .25, major: .25, grand: .5 },
    drift: { mini: .004, major: .006, grand: .02 }, name: { mini: 'Mini', major: 'Major', grand: 'Grand' }, bet: 5, perBet: .6, perCoin: .1 };
  const jp = () => { const G = store(); if (!G.jp) G.jp = { ...JP.seed }; return G.jp; };
  const feedJP = d => { const j = jp(); for (const k of JP.keys) j[k] = Math.round((j[k] + d * JP.share[k]) * 100) / 100; };
  function jpStrip(api) {
    const el = h('div.l2-jp', JP.keys.map(k => h('div.l2-jpm.' + k, h('small', JP.name[k]), h('b', money(jp()[k])))));
    api.jpPaint = () => JP.keys.forEach((k, i) => { el.children[i].querySelector('b').textContent = money(jp()[k]); });
    api.slot.prepend(el);
    return el;
  }
  // the Jackpot Wheel: thirty segments, cash and the three meters; you spin it
  const JPW = { n: 30, plan: [['grand', 1, 0], ['major', 1, 15], ['mini', 2, 7], [60, 3, 4], [30, 8, 2], [15, 15, 1]],
    color: { grand: '#d9a72a', major: '#b3222b', mini: '#2a62c9', 60: '#7b3fb8', 30: '#1f7a4a', 15: '#2c3440' } };
  JPW.order = (() => { const out = Array(JPW.n).fill(null); for (const [k, c, off] of JPW.plan) for (let i = 0; i < c; i++) { let p = Math.round(off + i * JPW.n / c) % JPW.n; while (out[p] != null) p = (p + 1) % JPW.n; out[p] = k; } return out; })();
  JPW.ev = () => JPW.order.reduce((a, k) => a + (typeof k === 'number' ? k : JP.seed[k]), 0) / JPW.n; // with the meters at their seeds
  function jackpotWheel(why) {
    return new Promise(resolve => {
      const o = h('div.l2-jpw'), cv = h('canvas.l2-jpw-c'), title = h('h2', '★ Meridian Jackpot Wheel'), sub = h('p', why), btn = h('button.l2-btn.go', 'Spin the jackpot wheel'), meters = h('div.l2-jp');
      JP.keys.forEach(k => meters.append(h('div.l2-jpm.' + k, h('small', JP.name[k]), h('b', money(jp()[k])))));
      o.append(h('div.l2-jpw-box', title, sub, meters, cv, btn)); document.body.append(o); SFX.big();
      const n = JPW.n, step = Math.PI * 2 / n, S = { th: Math.random() * 6.28, spin: null, res: null, flap: 0, glow: 0 };
      let raf = 0, last = performance.now();
      const label = k => typeof k === 'number' ? '$' + k : k.toUpperCase();
      const draw = now => {
        const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
        const sz = Math.min(cv.clientWidth || 300, 520), dpr = Math.min(2, devicePixelRatio || 1); if (cv.width !== sz * dpr) { cv.width = cv.height = sz * dpr; }
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, sz, sz);
        if (S.spin) { const P = S.spin; P.t = Math.min(1, P.t + dt / P.dur); S.th = P.from + (P.to - P.from) * (1 - Math.pow(1 - P.t, 4)); const seg = Math.floor((S.th + step / 2) / step); if (seg !== P.seg) { P.seg = seg; S.flap = .5; SFX.click(); } if (P.t >= 1) { S.spin = null; P.done(); } }
        S.flap *= .82; S.glow = Math.max(0, S.glow - dt * .4);
        const cx = sz / 2, cy = sz / 2 + 6, R = sz * .42;
        for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; g.fillStyle = (i + Math.floor(t * (S.spin ? 14 : 3))) % 3 ? '#5a4a20' : '#ffe9a8'; g.beginPath(); g.arc(cx + Math.cos(a) * (R + 13), cy + Math.sin(a) * (R + 13), 3, 0, 7); g.fill(); }
        g.fillStyle = '#3a2410'; g.beginPath(); g.arc(cx, cy, R + 8, 0, 7); g.fill(); g.strokeStyle = '#d9b45a'; g.lineWidth = 3; g.stroke();
        g.save(); g.translate(cx, cy); g.rotate(-S.th);
        for (let i = 0; i < n; i++) {
          const k = JPW.order[i], a0 = -Math.PI / 2 + (i - .5) * step, hit = S.res != null && i === S.res && !S.spin;
          g.fillStyle = JPW.color[k]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a0 + step); g.closePath(); g.fill();
          if (hit) { g.fillStyle = `rgba(255,240,180,${.25 + .25 * Math.sin(t * 8)})`; g.fill(); }
          g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.stroke();
          g.save(); g.rotate(a0 + step / 2); g.translate(R * .64, 0); g.fillStyle = typeof k === 'number' ? '#f4ead0' : '#fff'; g.font = `bold ${typeof k === 'number' ? R * .085 : R * .07}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label(k), 0, 0); g.restore();
          const pg = [Math.cos(a0) * R * .97, Math.sin(a0) * R * .97]; g.fillStyle = '#e8d08a'; g.beginPath(); g.arc(pg[0], pg[1], 2.4, 0, 7); g.fill();
        }
        const sh = g.createRadialGradient(-R * .3, -R * .4, 4, 0, 0, R); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
        g.restore();
        const hub = g.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, R * .2); hub.addColorStop(0, '#fff2b8'); hub.addColorStop(1, '#a87a1e'); g.fillStyle = hub; g.beginPath(); g.arc(cx, cy, R * .2, 0, 7); g.fill();
        g.fillStyle = '#3a2410'; g.font = `bold ${R * .14}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', cx, cy + 1);
        g.save(); g.translate(cx, cy - R - 4); g.rotate(S.flap); g.fillStyle = '#b3222b'; g.strokeStyle = '#2a0a06'; g.beginPath(); g.moveTo(-9, -12); g.lineTo(9, -12); g.lineTo(0, 16); g.closePath(); g.fill(); g.stroke(); g.restore();
        if (S.glow > 0) { g.fillStyle = `rgba(255,220,120,${S.glow * .35})`; g.fillRect(0, 0, sz, sz); }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      btn.onclick = async () => {
        if (S.res != null && !S.spin) { cancelAnimationFrame(raf); o.classList.add('out'); setTimeout(() => o.remove(), 300); return resolve(S.won); }
        if (S.spin) return;
        btn.disabled = true; btn.textContent = 'Round she goes…';
        const idx = RNG.int(n), cur = ((S.th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), want = idx * step + (Math.random() - .5) * step * .6;
        const delta = ((want - cur) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2 * (5 + RNG.int(2));
        await new Promise(done => { S.spin = { from: S.th, to: S.th + delta, t: 0, dur: 6 + Math.random() * 1.5, seg: null, done }; });
        S.res = idx; const k = JPW.order[idx], j = jp(); let amt;
        if (typeof k === 'number') amt = k; else { amt = Math.round(j[k] * 100) / 100; j[k] = JP.seed[k]; App.count('l2_jp_' + k); }
        credit(amt); S.won = { k, amt }; S.glow = typeof k === 'number' ? .4 : 1; (typeof k === 'number' ? SFX.win : SFX.big)();
        JP.keys.forEach((kk, i) => { meters.children[i].querySelector('b').textContent = money(j[kk]); });
        title.textContent = typeof k === 'number' ? `★ ${fmt(amt)}` : `★ ${JP.name[k].toUpperCase()} JACKPOT! ★`;
        sub.textContent = typeof k === 'number' ? `The wheel pays ${fmt(amt)}.` : `The ${JP.name[k]} meter drops into your hands: ${money(amt)}.`;
        if (k !== 15 && k !== 30) o.classList.add('won');
        btn.disabled = false; btn.textContent = 'Collect'; App.count('l2_jpwheel'); App.save();
      };
    });
  }

  /* ---------- the game screen: the machine fills the screen, the bets sit underneath ---------- */
  function sheet(title, build) {
    const o = h('div.l2-over.game'), slot = h('div.l2-gstage'), box = h('div.l2-game'); document.body.append(o); R3.freeze(true);
    const chip = { v: 25 }, head = h('div.l2-gh', h('b', title), h('span.l2-gcash'), h('button.l2-x', { 'aria-label': 'Leave' }, '×'));
    o.append(head, slot, box);
    const chipRow = h('div.l2-chips', CHIPS.map(v => h('button.l2-chip' + (v === chip.v ? '.on' : ''), { 'data-v': v, onclick: e => { chip.v = v; chipRow.querySelectorAll('.l2-chip').forEach(c => c.classList.toggle('on', +c.dataset.v === v)); } }, v >= 1000 ? v / 1000 + 'K' : String(v))));
    const msg = h('p.l2-gmsg');
    box.append(msg);
    const paint = () => { head.querySelector('.l2-gcash').textContent = fmt(cash()); };
    const api = { box, slot, chip, chipRow, msg, paint, say: t => { msg.textContent = t; }, closed: false };
    let done;
    const closed = new Promise(r => { done = r; });
    // the rest of the floor keeps feeding the meters while you play
    const drift = setInterval(() => { if (api.jpPaint && !document.hidden) { const j = jp(); for (const k of JP.keys) j[k] = Math.round((j[k] + JP.drift[k] * .5) * 1000) / 1000; api.jpPaint(); } }, 500);
    api.close = () => { if (api.closed) return; api.closed = true; clearInterval(drift); o.classList.add('out'); setTimeout(() => o.remove(), 300); setTimeout(() => R3.freeze(false), 500); document.removeEventListener('keydown', api.key); done(); };
    head.querySelector('.l2-x').onclick = () => { if (!api.busy) api.close(); };
    build(api); paint();
    api.key = e => { if (document.querySelector('.l2-jpw')) return; if (e.key === 'Escape' && !api.busy) api.close(); else if ((e.key === ' ' || e.key === 'Enter') && api.go && e.target.tagName !== 'BUTTON') { e.preventDefault(); api.go(); } };
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
      v = Math.min(v, MAX_SPOT - (bets[k] || 0), cash() - total() - (api.jpOn && api.jpOn() ? JP.bet : 0));
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
  // the machine: a canvas that fills whatever room the bets leave
  function stage(api, draw) {
    const cv = h('canvas.l2-stage'), dpr = Math.min(2, devicePixelRatio || 1); api.slot.append(cv);
    let last = performance.now();
    const loop = now => { const w = cv.clientWidth || 320, hh = cv.clientHeight || 220; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); } const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); const dt = Math.min(.05, (now - last) / 1000); last = now; draw(g, w, hh, dt, now / 1000); if (!api.closed) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // the $5 jackpot bet: a switch that stays how you left it
  function jpToggle(api, game, label) {
    const G = store(); G.jpOn = G.jpOn || {};
    const b = h('button.l2-btn.jpbet', { 'aria-pressed': 'false' });
    const paint = () => { const on = !!G.jpOn[game]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = `★ Jackpot ${on ? 'ON' : 'off'} +${fmt(JP.bet)}`; b.title = label; };
    b.onclick = () => { if (api.busy) return; G.jpOn[game] = !G.jpOn[game]; paint(); App.save(); };
    api.jpOn = () => !!G.jpOn[game]; paint();
    return b;
  }
  const settle = (api, staked, back, what) => {
    const net = back - staked;
    if (back > 0) credit(back);
    if (net > 0) { (net >= staked * 10 ? SFX.big : SFX.win)(); api.say(`${what} You win ${fmt(net)}.`); }
    else if (back > 0) api.say(`${what} You get ${fmt(back)} back.`);
    else { SFX.lose(); api.say(`${what} The house takes it.`); }
    App.count('l2_games'); App.save(); api.paint();
  };
  // a run of the last results along the top of a machine
  function history(g, list, x, y, draw) { list.slice(-10).forEach((r, i, a) => draw(g, x + i * 30, y, r, i === a.length - 1)); }

  /* ================= the Big Six money wheel ================= */
  // 54 segments, as on a real wheel; paytable is kinder than a real one
  const WHEEL = { counts: { 1: 24, 2: 15, 5: 7, 10: 4, 20: 2, j: 1, m: 1 }, pays: { 1: 1.2, 2: 2.5, 5: 6.5, 10: 12, 20: 25, j: 52, m: 52 },
    label: { 1: '$1', 2: '$2', 5: '$5', 10: '$10', 20: '$20', j: 'JOKER', m: 'MERIDIAN' }, color: { 1: '#d9c27a', 2: '#3f74c9', 5: '#7d45c0', 10: '#2a8e52', 20: '#c22f3a', j: '#141414', m: '#c9a14a' } };
  WHEEL.order = (() => {
    const n = 54, out = Array(n).fill(null);
    for (const k of ['j', 'm', 20, 10, 5, 2, 1]) {
      const c = WHEEL.counts[k], off = k === 'm' ? 27 : k === 20 ? 13 : k === 10 ? 6 : k === 5 ? 3 : 1;
      for (let i = 0; i < c; i++) { let p = Math.round(off + i * n / c) % n; while (out[p] != null) p = (p + 1) % n; out[p] = String(k); }
    }
    return out;
  })();
  const W = { theta: 0, spinning: null, flap: 0, hist: [] };
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
      // a velvet booth with a spotlight on the wheel
      const bg = g.createRadialGradient(w / 2, hh * .45, 10, w / 2, hh * .5, Math.max(w, hh) * .75); bg.addColorStop(0, '#4a1a1e'); bg.addColorStop(.6, '#1e0a0c'); bg.addColorStop(1, '#070304'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 6; for (let x = 10; x < w; x += 26) { g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 6, hh * .5, x, hh); g.stroke(); }
      const R = Math.max(60, Math.min(w * .43, hh * .42)), cx = w / 2, cy = hh * .54;
      // the stand
      g.fillStyle = '#2a170c'; g.beginPath(); g.moveTo(cx - R * .18, cy); g.lineTo(cx + R * .18, cy); g.lineTo(cx + R * .42, hh); g.lineTo(cx - R * .42, hh); g.closePath(); g.fill();
      // the rim: wood, a gold band, and bulbs that chase while it spins
      const rim = g.createRadialGradient(cx, cy, R * .9, cx, cy, R * 1.16); rim.addColorStop(0, '#6a3a18'); rim.addColorStop(1, '#2a1408'); g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R * 1.16, 0, 7); g.fill();
      g.strokeStyle = '#d9b45a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * 1.02, 0, 7); g.stroke();
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, on = W.spinning ? (i + Math.floor(t * 14)) % 3 === 0 : (i + Math.floor(t * 2)) % 2 === 0; g.fillStyle = on ? '#fff0b0' : '#6a5420'; if (on) { g.shadowColor = '#ffd76a'; g.shadowBlur = 8; } g.beginPath(); g.arc(cx + Math.cos(a) * R * 1.09, cy + Math.sin(a) * R * 1.09, Math.max(2.2, R * .022), 0, 7); g.fill(); g.shadowBlur = 0; }
      g.save(); g.translate(cx, cy); g.rotate(-W.theta);
      for (let i = 0; i < n; i++) {
        const k = WHEEL.order[i], a0 = -Math.PI / 2 + (i - .5) * step;
        g.fillStyle = WHEEL.color[k]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a0 + step); g.closePath(); g.fill(); g.strokeStyle = 'rgba(30,18,6,.55)'; g.lineWidth = 1; g.stroke();
        g.save(); g.rotate(a0 + step / 2); g.translate(R * .8, 0); g.rotate(Math.PI / 2);
        const dark = k === '1' || k === 'm'; g.fillStyle = dark ? '#2a1a06' : '#fff'; g.font = `bold ${Math.max(8, R * (k === 'j' || k === 'm' ? .05 : .075))}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (k === 'j' || k === 'm') { g.fillText(k === 'j' ? 'JOKER' : '★', 0, 0); } else g.fillText('$' + k, 0, 0);
        g.restore();
        const pg = [Math.cos(a0) * R, Math.sin(a0) * R]; g.fillStyle = '#e8d08a'; g.beginPath(); g.arc(pg[0], pg[1], Math.max(1.6, R * .014), 0, 7); g.fill(); // the pegs
      }
      const sh = g.createRadialGradient(-R * .35, -R * .45, 4, 0, 0, R); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
      g.restore();
      const hub = g.createRadialGradient(cx - R * .05, cy - R * .05, 2, cx, cy, R * .22); hub.addColorStop(0, '#fff2b8'); hub.addColorStop(1, '#8a6418'); g.fillStyle = hub; g.beginPath(); g.arc(cx, cy, R * .22, 0, 7); g.fill(); g.strokeStyle = '#3a2410'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#3a2410'; g.font = `italic bold ${R * .1}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Meridian', cx, cy);
      // the leather flapper
      g.save(); g.translate(cx, cy - R * 1.13); g.rotate(W.flap); g.fillStyle = '#7a1a12'; g.strokeStyle = '#2a0805'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-R * .05, -R * .06); g.lineTo(R * .05, -R * .06); g.lineTo(0, R * .13); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#d9b45a'; g.beginPath(); g.arc(0, -R * .04, R * .02, 0, 7); g.fill(); g.restore();
      history(g, W.hist, 12, 12, (g2, x, y, k, newest) => { g2.fillStyle = WHEEL.color[k]; g2.globalAlpha = newest ? 1 : .75; g2.beginPath(); g2.roundRect ? g2.roundRect(x, y, 26, 18, 4) : g2.rect(x, y, 26, 18); g2.fill(); g2.globalAlpha = 1; g2.fillStyle = k === '1' || k === 'm' ? '#2a1a06' : '#fff'; g2.font = 'bold 10px Georgia'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(k === 'j' ? 'J' : k === 'm' ? '★' : '$' + k, x + 13, y + 9.5); });
    };
    return sheet('Big Six', api => {
      jpStrip(api); stage(api, paintWheel);
      const spots = Object.keys(WHEEL.pays).map(k => [k, WHEEL.label[k], `pays ${odds(WHEEL.pays[k])}`]);
      const B = betBoard(api, spots, '.bigsix'); let last = null;
      const spinBtn = h('button.l2-btn.go', { onclick: () => api.go() }, 'Spin');
      const jpBtn = jpToggle(api, 'bigsix', 'Jackpot spin');
      api.go = async () => {
        if (api.busy) return;
        if (!B.total() && last) { B.set(last); if (B.total() > cash()) { B.clear(); return api.say('Not enough for the same bets again.'); } }
        const side = api.jpOn() ? JP.bet : 0, staked = B.total() + side; if (!B.total()) return api.say('Put a chip on a spot first.');
        if (staked > cash()) return api.say('Not enough money.');
        credit(-staked); if (side) feedJP(JP.perBet); api.jpPaint(); last = { ...B.bets }; api.busy = true; spinBtn.disabled = true; api.say('The dealer grabs a peg and pulls…');
        const idx = RNG.int(54); await W.spin(idx);
        const k = WHEEL.order[idx], won = B.bets[k] || 0, back = won ? won * (1 + WHEEL.pays[k]) : 0;
        W.hist.push(k); if (W.hist.length > 20) W.hist.shift();
        settle(api, staked, back, `${WHEEL.label[k]}.`);
        if (k === 'j' || k === 'm') App.count('l2_bigsix_top');
        if (side && (k === 'j' || k === 'm')) { api.say(`${WHEEL.label[k]}, with your jackpot spin on: the lights go mad. The Jackpot Wheel!`); await jackpotWheel(`${WHEEL.label[k]} came in with your jackpot spin on.`); api.jpPaint(); api.paint(); }
        B.clear(); api.busy = false; spinBtn.disabled = false; spinBtn.textContent = 'Spin (same bets)';
      };
      api.say(`Bet on where the flapper stops. Turn on the ★ jackpot spin (+${fmt(JP.bet)}) and a JOKER or MERIDIAN spins the Jackpot Wheel for the meters.`);
      api.box.append(B.grid, h('div.l2-gfoot', api.chipRow, jpBtn, h('button.l2-btn.ghost', { onclick: () => { if (!api.busy) B.clear(); } }, 'Clear'), spinBtn));
    });
  }

  /* ================= Sic Bo: three dice under a dome ================= */
  const SUMS = { 4: 70, 5: 34, 6: 20, 7: 13, 8: 9, 9: 7.5, 10: 6.75, 11: 6.75, 12: 7.5, 13: 9, 14: 13, 15: 20, 16: 34, 17: 70 };
  const TRIPLE_BONUS = 40; // with the jackpot roll on, any triple also pays this, then spins the wheel
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
  const DICE = { faces: [1, 1, 1], rolling: null, hist: [], flash: 0 };
  function die(g, x, y, s, v, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(s * .08, s * .55, s * .55, s * .16, 0, 0, 7); g.fill(); const gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d9d2c4'); g.fillStyle = gr; g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect ? g.roundRect(-s / 2, -s / 2, s, s, s * .18) : g.rect(-s / 2, -s / 2, s, s); g.fill(); g.stroke(); g.fillStyle = v === 1 || v === 4 ? '#b3222b' : '#1a1a1a'; for (const [px, py] of PIPS[v]) { g.beginPath(); g.arc(-s / 2 + px * s, -s / 2 + py * s, s * .09, 0, 7); g.fill(); } g.restore(); }
  function sicbo() {
    const S = DICE;
    S.roll = out => new Promise(done => { SFX.dice(); setTimeout(() => SFX.dice(), 500); S.rolling = { t: 0, out, done }; });
    return sheet('Sic Bo', api => {
      jpStrip(api);
      stage(api, (g, w, hh, dt, t) => {
        const R = S.rolling; let shake = 0;
        if (R) { R.t += dt; if (R.t < 1.5) { shake = 1; if (Math.random() < .5) S.faces = S.faces.map(() => 1 + RNG.int(6)); } else { S.faces = R.out; S.rolling = null; R.done(); } }
        S.flash = Math.max(0, S.flash - dt * .6);
        const bg = g.createRadialGradient(w / 2, hh * .55, 10, w / 2, hh * .6, Math.max(w, hh) * .8); bg.addColorStop(0, '#16507a'); bg.addColorStop(.7, '#0b2236'); bg.addColorStop(1, '#050d16'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
        const k = Math.max(.6, Math.min(w / 330, hh / 250)), cx = w / 2 + (shake ? Math.sin(t * 40) * 4 * k : 0), cy = hh * .58 - (shake ? Math.abs(Math.sin(t * 26)) * 8 * k : 0);
        // the table edge and the lettering on the felt
        g.fillStyle = '#0e3a26'; g.beginPath(); g.ellipse(w / 2, hh * .58 + 52 * k, Math.min(w * .48, 220 * k), 46 * k, 0, 0, 7); g.fill(); g.strokeStyle = '#c9a14a'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(232,215,168,.5)'; g.font = `bold ${13 * k}px Georgia`; g.textAlign = 'center'; g.fillText('大 BIG   ·   小 SMALL', w / 2, hh * .58 + 82 * k);
        // the gold base, the dice, the dome
        const base = g.createLinearGradient(0, cy + 20 * k, 0, cy + 50 * k); base.addColorStop(0, '#f0cf7a'); base.addColorStop(1, '#8a6418'); g.fillStyle = base; g.beginPath(); g.ellipse(cx, cy + 34 * k, 96 * k, 18 * k, 0, 0, 7); g.fill();
        S.faces.forEach((v, i) => die(g, cx - 44 * k + i * 44 * k + (shake ? Math.sin(t * 31 + i) * 9 * k : 0), cy + 8 * k + (shake ? Math.cos(t * 27 + i) * 8 * k : 0), 34 * k, v, shake ? t * (6 + i) : (i - 1) * .18));
        const gr = g.createRadialGradient(cx - 30 * k, cy - 50 * k, 10, cx, cy, 100 * k); gr.addColorStop(0, 'rgba(255,255,255,.38)'); gr.addColorStop(1, 'rgba(200,230,255,.07)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy + 30 * k, 92 * k, 116 * k, 0, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(220,240,255,.55)'; g.lineWidth = 1.5; g.stroke();
        if (S.flash > 0) { g.fillStyle = `rgba(255,215,106,${S.flash * .3})`; g.fillRect(0, 0, w, hh); g.fillStyle = `rgba(255,236,170,${S.flash})`; g.font = `bold ${26 * k}px Georgia`; g.fillText('TRIPLE!', w / 2, cy - 100 * k); }
        history(g, S.hist, 12, 12, (g2, x, y, d, newest) => { const s = d[0] + d[1] + d[2], tr = d[0] === d[1] && d[1] === d[2]; g2.globalAlpha = newest ? 1 : .75; g2.fillStyle = tr ? '#c9a14a' : s >= 11 ? '#b3222b' : '#2a62c9'; g2.beginPath(); g2.roundRect ? g2.roundRect(x, y, 26, 18, 4) : g2.rect(x, y, 26, 18); g2.fill(); g2.globalAlpha = 1; g2.fillStyle = '#fff'; g2.font = 'bold 10px Georgia'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(tr ? '★' + d[0] : String(s), x + 13, y + 9.5); });
      });
      const spots = [['small', 'Small', '4–10 · 1 to 1'], ['big', 'Big', '11–17 · 1 to 1'], ['odd', 'Odd', '1 to 1'], ['even', 'Even', '1 to 1'], ['any', 'Any triple', '34 to 1'],
        ...[1, 2, 3, 4, 5, 6].map(n => ['t' + n, `${n} ${n} ${n}`, '210 to 1']),
        ...Object.keys(SUMS).map(s => ['s' + s, 'Total ' + s, odds(SUMS[s])]),
        ...[1, 2, 3, 4, 5, 6].map(n => ['n' + n, 'Number ' + n, '1·2·12 to 1'])];
      const B = betBoard(api, spots, '.sicbo'); let last = null;
      const rollBtn = h('button.l2-btn.go', { onclick: () => api.go() }, 'Roll');
      const jpBtn = jpToggle(api, 'sicbo', 'Jackpot roll');
      api.go = async () => {
        if (api.busy) return;
        if (!B.total() && last) { B.set(last); if (B.total() > cash()) { B.clear(); return api.say('Not enough for the same bets again.'); } }
        const side = api.jpOn() ? JP.bet : 0, staked = B.total() + side; if (!B.total()) return api.say('Put a chip on a spot first.');
        if (staked > cash()) return api.say('Not enough money.');
        credit(-staked); if (side) feedJP(JP.perBet); api.jpPaint(); last = { ...B.bets }; api.busy = true; rollBtn.disabled = true; api.say('The dealer presses the button. The dome rattles.');
        const d = [1 + RNG.int(6), 1 + RNG.int(6), 1 + RNG.int(6)]; await S.roll(d);
        let back = 0; for (const k in B.bets) { const p = sicboPays(k, d); if (p >= 0) back += B.bets[k] * (1 + p); }
        const triple = d[0] === d[1] && d[1] === d[2];
        if (triple) { App.count('l2_triple'); S.flash = 1; }
        if (triple && side) back += TRIPLE_BONUS;
        S.hist.push(d); if (S.hist.length > 20) S.hist.shift();
        settle(api, staked, back, `${d.join(' · ')}: ${triple ? 'a triple!' : 'total ' + (d[0] + d[1] + d[2]) + '.'}`);
        if (triple && side) { await jackpotWheel(`Triple ${d[0]}s with your jackpot roll on: ${fmt(TRIPLE_BONUS)}, and a spin of the Jackpot Wheel.`); api.jpPaint(); api.paint(); }
        B.clear(); api.busy = false; rollBtn.disabled = false; rollBtn.textContent = 'Roll (same bets)';
      };
      api.say(`Bet on the three dice. Small and Big lose to any triple. Turn on the ★ jackpot roll (+${fmt(JP.bet)}) and any triple pays ${fmt(TRIPLE_BONUS)} and spins the Jackpot Wheel.`);
      api.box.append(B.grid, h('div.l2-gfoot', api.chipRow, jpBtn, h('button.l2-btn.ghost', { onclick: () => { if (!api.busy) B.clear(); } }, 'Clear'), rollBtn));
    });
  }

  /* ================= the Tide coin pushers ================= */
  // The shelf is a little 2D world, seen from above: x across (-1..1), y from the back (0) to the front
  // edge (1.5). The pusher's face sweeps forward and back; coins it touches are shoved, coins shove each
  // other, and anything past the front edge falls: into the tray if it's in the middle, the gutters if not.
  // The machine draws it in perspective, with a bonus pocket sliding along the back wall: a coin that
  // drops into the pocket spins the three bonus reels, which can shower coins onto the shelf, add a gold
  // token (ten coins) or a JP chip; a JP chip that falls into your tray spins the Jackpot Wheel.
  const PUSH = { r: .085, edge: 1.5, pay: .82, coin: 5, goldWorth: 10, goldEvery: 150, max: 190, pocketW: .08, pocketIn: .4,
    reel: [['none', .72], ['shower3', .2], ['shower7', .05], ['gold', .025], ['jp', .005]] };
  const pusherFace = t => .16 + .22 * (.5 - .5 * Math.cos(t * Math.PI * 2 / 2.6));
  const pocketAt = t => Math.sin(t * Math.PI * 2 / 3.1) * .72 + Math.sin(t * 1.7) * .08;
  function pusherNew() {
    const P = { t: 0, coins: [], drops: 0 };
    for (let i = 0; i < 120; i++) P.coins.push({ x: (Math.random() * 2 - 1) * .88, y: .45 + Math.random() * .95, g: i % 40 === 7 ? 1 : i === 63 ? 2 : 0 });
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
  // what the bonus reels land on (a weighted pick from PUSH.reel)
  function reelPick(r = Math.random()) { for (const [k, p] of PUSH.reel) { if ((r -= p) < 0) return k; } return 'none'; }
  const REELSYM = { shower3: '🪙', shower7: '💰', gold: '⭐', jp: 'JP' }, SYMS = ['🪙', '💰', '⭐', 'JP'];
  const aim = { x: 0 };
  const shelf = id => { const G = store(); if (!G['push' + id]) G['push' + id] = pusherNew(); return G['push' + id]; };
  function pusher(id) {
    let won = 0, spent = 0, playing = true;
    const M = { falling: [], drops: [], shower: [], reels: null, light: 0, aligned: false };
    return sheet(id === 'a' ? 'High Tide pusher' : 'Low Tide pusher', api => {
      jpStrip(api);
      const tally = h('div.l2-tally');
      const paintTally = () => { tally.textContent = `This visit: ${fmt(spent)} in · ${fmt(won)} out`; };
      const queue = [];   // JP chips that fell in your tray, waiting for their wheel spin
      const pay = c => {
        const centre = Math.abs(c.x) <= PUSH.pay;
        if (!centre) return;
        if (c.g === 2) { queue.push(c); App.count('l2_jpchip'); return; }
        const v = PUSH.coin * (c.g ? PUSH.goldWorth : 1); won += v; credit(v); SFX.chip();
        if (c.g) { SFX.big(); api.say(`A gold token drops into your tray! +${fmt(v)}.`); App.count('l2_gold'); }
        paintTally(); api.paint();
      };
      const spinReels = () => {
        const out = reelPick();
        let syms; if (out === 'none') { do { syms = [0, 1, 2].map(() => SYMS[RNG.int(4)]); } while (syms[0] === syms[1] && syms[1] === syms[2]); if (Math.random() < .3) { syms[0] = syms[1] = 'JP'; syms[2] = SYMS[RNG.int(3)]; } } // sometimes two JPs: so close
        else syms = [REELSYM[out], REELSYM[out], REELSYM[out]];
        M.reels = { t: 0, syms, out, stop: [.7, 1.0, 1.45], done: false };
        SFX.click(); App.count('l2_pocket');
      };
      const reelsDone = out => {
        const P = shelf(id), f = pusherFace(P.t);
        if (out === 'shower3' || out === 'shower7') { const n = out === 'shower3' ? 3 : 7; for (let i = 0; i < n; i++) M.shower.push(.15 * i); api.say(`Bonus! ${n} coins shower onto the shelf.`); SFX.win(); }
        else if (out === 'gold') { P.coins.push({ x: (Math.random() - .5) * 1, y: f + PUSH.r + .25, g: 1 }); api.say('Bonus! A gold token (worth ten coins) slides onto the shelf.'); SFX.win(); }
        else if (out === 'jp') { P.coins.push({ x: (Math.random() - .5) * .6, y: f + PUSH.r + .3, g: 2 }); api.say('JP! A jackpot chip lands on the shelf. Push it into your tray and it spins the Jackpot Wheel.'); SFX.big(); }
        else api.say('The reels stop on nothing. The pocket swallows your coin.');
      };
      const dropBtn = h('button.l2-btn.go', { onclick: () => api.go() }, `Drop a coin (${fmt(PUSH.coin)})`);
      const five = h('button.l2-btn.ghost', { onclick: () => { for (let i = 0; i < 5; i++) setTimeout(() => { if (!api.closed) api.go(); }, i * 280); } }, 'Drop 5');
      api.go = () => {
        if (cash() < PUSH.coin) return api.say('Your wallet is empty.');
        const P = shelf(id); if (P.coins.length >= PUSH.max) return api.say('The shelf is full. Give it a moment.');
        credit(-PUSH.coin); spent += PUSH.coin; P.drops++; feedJP(JP.perCoin); api.jpPaint(); SFX.click(); App.count('l2_coins'); paintTally();
        const shaky = document.body.classList.contains('l2-shakes') ? .15 : .02, x = aim.x + (Math.random() - .5) * shaky; // trembling hands miss
        const inPocket = !M.reels && Math.abs(x - pocketAt(P.t)) < PUSH.pocketW && Math.random() < PUSH.pocketIn;
        M.drops.push({ x, life: 0, pocket: inPocket });
        if (inPocket) { M.light = 1; setTimeout(() => { if (!api.closed) spinReels(); }, 250); }
        else setTimeout(() => { if (!api.closed) shelf(id).coins.push({ x, y: pusherFace(shelf(id).t) + PUSH.r + .01, g: 0 }); }, 220);
        if (P.drops % PUSH.goldEvery === 0) { P.coins.push({ x: (Math.random() - .5) * 1.2, y: pusherFace(P.t) + PUSH.r + .2, g: 1 }); api.say(`Coin ${P.drops}: the machine chimes and slides a gold token onto the shelf.`); }
      };
      const draw = (g, w, hh, dt, t) => {
        const P = shelf(id), fell = pusherStep(P, Math.min(dt, 1 / 30));
        for (const c of fell) { M.falling.push({ x: c.x, g: c.g, life: 0 }); if (playing) pay(c); }
        if (queue.length && !M.wheel) { M.wheel = true; const c = queue.shift(); api.busy = true; api.say('The JP chip drops into your tray. The Jackpot Wheel lights up!'); jackpotWheel('A JP chip fell into your tray.').then(() => { M.wheel = false; api.busy = false; api.jpPaint(); api.paint(); }); }
        // showers: one coin at a time, from the back
        for (let i = M.shower.length - 1; i >= 0; i--) { M.shower[i] -= dt; if (M.shower[i] <= 0) { M.shower.splice(i, 1); P.coins.push({ x: (Math.random() - .5) * 1.5, y: pusherFace(P.t) + PUSH.r + .02, g: 0 }); SFX.chip(); } }
        aim.x = Math.sin(t * 1.25) * .85;
        const pk = pocketAt(P.t); M.aligned = Math.abs(aim.x - pk) < PUSH.pocketW && !M.reels; M.light = Math.max(0, M.light - dt);
        // ---- layout: backboard on top, the shelf in perspective, the tray along the bottom
        const hb = Math.max(96, hh * .3), ys0 = hb + 26, ys1 = hh - 34, halfW = Math.min(w * .44, (ys1 - ys0) * 1.05), kb = .6, E = PUSH.edge;
        const K = y => kb + (1 - kb) * (y / E), X = (x, y) => w / 2 + x * halfW * K(y), Y = y => { const u = y / E; return ys0 + (ys1 - ys0) * u * (.72 + .28 * u); };
        const bg = g.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, '#1a0f2c'); bg.addColorStop(1, '#07040e'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
        // the backboard: marquee, bulbs, the bonus reels
        const bx = w / 2 - halfW * kb - 18, bw = halfW * kb * 2 + 36;
        g.fillStyle = '#2a1640'; g.beginPath(); g.roundRect ? g.roundRect(bx, 6, bw, hb - 2, 10) : g.rect(bx, 6, bw, hb - 2); g.fill(); g.strokeStyle = '#c9a14a'; g.lineWidth = 2; g.stroke();
        for (let i = 0; i < 22; i++) { const u = i / 21, on = (i + Math.floor(t * (M.reels ? 12 : 3))) % 2 === 0; g.fillStyle = on ? '#ffe9a8' : '#5a4a20'; g.beginPath(); g.arc(bx + 8 + u * (bw - 16), 12, 2.6, 0, 7); g.fill(); }
        g.fillStyle = '#ffd34d'; g.shadowColor = '#ffb020'; g.shadowBlur = 10; g.font = `italic bold ${Math.min(22, hb * .2)}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(id === 'a' ? 'HIGH TIDE' : 'LOW TIDE', w / 2, 30); g.shadowBlur = 0;
        const rw = Math.min(54, bw * .17), rh = Math.min(46, hb * .4), ry = 46;
        for (let i = 0; i < 3; i++) {
          const rx = w / 2 + (i - 1) * (rw + 8) - rw / 2; g.fillStyle = '#f4efe2'; g.fillRect(rx, ry, rw, rh); g.strokeStyle = '#c9a14a'; g.lineWidth = 2; g.strokeRect(rx, ry, rw, rh);
          const R = M.reels, spinning = R && R.t < R.stop[i], sym = R ? (spinning ? SYMS[Math.floor(t * 18 + i * 2) % 4] : R.syms[i]) : ['🪙', '⭐', '💰'][i];
          g.save(); g.beginPath(); g.rect(rx, ry, rw, rh); g.clip(); const off = spinning ? ((t * 300) % rh) - rh / 2 : 0;
          g.fillStyle = sym === 'JP' ? '#b3222b' : '#222'; g.font = `bold ${rh * (sym === 'JP' ? .42 : .55)}px Georgia`; g.fillText(sym, rx + rw / 2, ry + rh / 2 + off); if (spinning) g.fillText(SYMS[(Math.floor(t * 18) + i + 1) % 4], rx + rw / 2, ry + rh / 2 + off - rh); g.restore();
        }
        if (M.reels) { const R = M.reels; R.t += dt; if (!R.done && R.t >= R.stop[2]) { R.done = true; reelsDone(R.out); } if (R.t > R.stop[2] + 1.6) M.reels = null; }
        g.fillStyle = '#cbbf96'; g.font = '10px sans-serif'; g.fillText(M.reels ? 'BONUS REELS' : 'Drop into the BONUS pocket to spin', w / 2, ry + rh + 12);
        // the back wall with the bonus pocket sliding along it, and the dropper on its rail
        const wy = ys0 - 18; g.fillStyle = '#1d1030'; g.fillRect(X(-1, 0), wy - 6, X(1, 0) - X(-1, 0), 24);
        const pkx = X(pk, 0), pw = PUSH.pocketW * halfW * kb; g.fillStyle = M.light > 0 || M.aligned ? '#5aff9a' : '#ffcf3a'; g.shadowColor = g.fillStyle; g.shadowBlur = M.aligned ? 14 : 6; g.fillRect(pkx - pw, wy - 2, pw * 2, 14); g.shadowBlur = 0; g.fillStyle = '#1a0a20'; g.font = 'bold 8px sans-serif'; g.fillText('BONUS', pkx, wy + 5);
        g.strokeStyle = '#8a8f98'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(-1, 0), wy - 10); g.lineTo(X(1, 0), wy - 10); g.stroke();
        const ax = X(aim.x, 0); g.fillStyle = M.aligned ? '#5aff9a' : '#ffd77a'; g.beginPath(); g.moveTo(ax - 8, wy - 18); g.lineTo(ax + 8, wy - 18); g.lineTo(ax, wy - 4); g.closePath(); g.fill();
        // the shelf, its gutters, the glass sides
        const quad = (pts, fill) => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.closePath(); g.fillStyle = fill; g.fill(); };
        const fl = g.createLinearGradient(0, Y(0), 0, Y(E)); fl.addColorStop(0, '#1d4a66'); fl.addColorStop(1, '#2f6d8e'); quad([[X(-1, 0), Y(0)], [X(1, 0), Y(0)], [X(1, E), Y(E)], [X(-1, E), Y(E)]], fl);
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; for (let i = 1; i < 10; i++) { const x = -1 + i * .2; g.beginPath(); g.moveTo(X(x, 0), Y(0)); g.lineTo(X(x, E), Y(E)); g.stroke(); }
        for (const s of [-1, 1]) quad([[X(s * PUSH.pay, E * .78), Y(E * .78)], [X(s, E * .78), Y(E * .78)], [X(s, E), Y(E)], [X(s * PUSH.pay, E), Y(E)]], 'rgba(0,0,0,.28)');
        // the pusher block
        const f = pusherFace(P.t), hB = 22;
        quad([[X(-1, 0), Y(0) - hB * K(0)], [X(1, 0), Y(0) - hB * K(0)], [X(1, f), Y(f) - hB * K(f)], [X(-1, f), Y(f) - hB * K(f)]], '#9aa3ad');
        const face = g.createLinearGradient(0, Y(f) - hB * K(f), 0, Y(f)); face.addColorStop(0, '#d8dee4'); face.addColorStop(1, '#6a737d'); quad([[X(-1, f), Y(f) - hB * K(f)], [X(1, f), Y(f) - hB * K(f)], [X(1, f), Y(f)], [X(-1, f), Y(f)]], face);
        // coins, back to front, with a little thickness
        const cs = P.coins.slice().sort((a, b) => a.y - b.y);
        for (const c of cs) {
          const k = K(c.y), cx = X(c.x, c.y), cy = Y(c.y), rx = PUSH.r * halfW * k * .98, ry = rx * .5, th = 3.4 * k;
          const col = c.g === 2 ? ['#7a0e14', '#d23a3a'] : c.g ? ['#9a6a08', '#ffd84a'] : ['#8a6a1e', '#e6c164'];
          g.fillStyle = col[0]; g.beginPath(); g.ellipse(cx, cy + th, rx, ry, 0, 0, 7); g.fill(); g.fillRect(cx - rx, cy, rx * 2, th);
          g.fillStyle = col[1]; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(80,50,0,.5)'; g.lineWidth = 1; g.stroke();
          if (c.g === 2) { g.strokeStyle = '#ffd84a'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, rx * .72, ry * .72, 0, 0, 7); g.stroke(); g.fillStyle = '#ffe9a8'; g.font = `bold ${rx * .75}px Georgia`; g.fillText('JP', cx, cy + 1); }
          else if (c.g) { g.fillStyle = '#fff6c0'; g.font = `bold ${rx * .9}px Georgia`; g.fillText('★', cx, cy + 1); }
          else { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - rx * .3, cy - ry * .3, rx * .35, ry * .25, 0, 0, 7); g.fill(); }
        }
        // coins dropping from the rail
        for (let i = M.drops.length - 1; i >= 0; i--) { const d = M.drops[i]; d.life += dt; const u = Math.min(1, d.life / .22), cx = X(d.x, 0), cy = d.pocket ? wy - 18 + u * 22 : wy - 18 + u * (Y(f) - wy + 18), rx = PUSH.r * halfW * kb; g.globalAlpha = d.pocket ? 1 - u * .8 : 1; g.fillStyle = '#e6c164'; g.beginPath(); g.ellipse(cx, cy, rx, rx * (d.pocket ? .9 : .5), 0, 0, 7); g.fill(); g.globalAlpha = 1; if (d.life > .25) M.drops.splice(i, 1); }
        // the glass sides and the brass lip
        for (const s of [-1, 1]) quad([[X(s, 0), Y(0) - 40 * kb], [X(s, 0), Y(0)], [X(s, E), Y(E)], [X(s, E), Y(E) - 40]], 'rgba(170,200,240,.08)');
        g.fillStyle = '#c9a14a'; g.fillRect(X(-1, E), Y(E), X(1, E) - X(-1, E), 5);
        // the tray and the gutters, and coins tumbling into them
        g.fillStyle = '#3a2a10'; g.fillRect(X(-1, E), Y(E) + 5, X(1, E) - X(-1, E), 22);
        const tg = g.createLinearGradient(0, Y(E) + 6, 0, Y(E) + 26); tg.addColorStop(0, '#f0cf7a'); tg.addColorStop(1, '#8a6418'); g.fillStyle = tg; g.fillRect(X(-PUSH.pay, E), Y(E) + 8, X(PUSH.pay, E) - X(-PUSH.pay, E), 16);
        g.fillStyle = '#3a2a10'; g.font = 'bold 10px sans-serif'; g.fillText('YOUR TRAY', w / 2, Y(E) + 17); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText('✕', (X(-1, E) + X(-PUSH.pay, E)) / 2, Y(E) + 17); g.fillText('✕', (X(1, E) + X(PUSH.pay, E)) / 2, Y(E) + 17);
        for (let i = M.falling.length - 1; i >= 0; i--) { const c = M.falling[i]; c.life += dt; g.globalAlpha = Math.max(0, 1 - c.life * 2); g.fillStyle = c.g === 2 ? '#d23a3a' : c.g ? '#ffd84a' : '#e6c164'; const rx = PUSH.r * halfW; g.beginPath(); g.ellipse(X(c.x, E), Y(E) + 4 + c.life * 50, rx, rx * .5, 0, 0, 7); g.fill(); g.globalAlpha = 1; if (c.life > .5) M.falling.splice(i, 1); }
      };
      stage(api, draw);
      api.say(`Drop coins (${fmt(PUSH.coin)} each) with Drop or Space. Time it so a coin drops into the sliding BONUS pocket to spin the reels. A JP chip pushed into your tray spins the Jackpot Wheel, and every ${PUSH.goldEvery}th coin the machine adds a gold token (ten coins).`);
      paintTally();
      api.box.append(tally, h('div.l2-gfoot', five, dropBtn));
    }).then(() => { playing = false; App.save(); });
  }

  return { wheel, sicbo, pusher, WHEEL, SUMS, sicboPays, PUSH, pusherNew, pusherStep, pusherFace, pocketAt, reelPick, JP, JPW, TRIPLE_BONUS, jackpotWheel, jp, get props() { return props; } };
})();
