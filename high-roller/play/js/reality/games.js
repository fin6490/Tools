/* Level 2 floor games that only make sense in a room you can walk around: the Big Six money wheel,
   Sic Bo under its glass dome, and the Tide coin pushers. They're built into the casino floor as
   real objects; when you play, the camera moves to look at the machine and the bets slide up from
   the bottom of the screen. All three play with the real money in your wallet.
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
    api.close = () => { if (api.closed) return; api.closed = true; o.classList.add('out'); setTimeout(() => o.remove(), 300); R3.view(null); setTimeout(() => R3.freeze(false), 500); document.removeEventListener('keydown', api.key); done(); };
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
  function buildWheel(A, x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; A.add(g);
    const R = 1.5, cy = 2.55, n = 54, step = Math.PI * 2 / n;
    const tex = A.canvasTex('bigsix', 1024, 1024, (c, w) => {
      const cx = w / 2, r = w / 2 - 6;
      WHEEL.order.forEach((k, i) => {
        const a = Math.PI / 2 - i * step; // segment 0 sits at the top
        c.beginPath(); c.moveTo(cx, cx); c.arc(cx, cx, r, -(a + step / 2), -(a - step / 2)); c.closePath(); c.fillStyle = WHEEL.color[k]; c.fill();
        c.strokeStyle = '#e8d29a'; c.lineWidth = 3; c.stroke();
        c.save(); c.translate(cx, cx); c.rotate(-a + Math.PI / 2); c.fillStyle = k === '1' ? '#2a1a05' : '#fff';
        c.font = `bold ${k.length > 2 ? 22 : 38}px Georgia`; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (k.length > 2) { [...WHEEL.label[k]].forEach((ch, j) => c.fillText(ch, 0, -r + 30 + j * 22)); } else c.fillText(WHEEL.label[k], 0, -r + 52);
        c.restore();
      });
      const gr = c.createRadialGradient(cx, cx, 0, cx, cx, 170); gr.addColorStop(0, '#f6dd8a'); gr.addColorStop(1, '#8a6a24');
      c.beginPath(); c.arc(cx, cx, 170, 0, 7); c.fillStyle = gr; c.fill(); c.fillStyle = '#2a1a05'; c.font = 'bold 54px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BIG SIX', cx, cx);
    });
    const gold = A.mat('wheelgold', { color: '#c9a14a', metalness: .85, roughness: .3 });
    const spinner = new THREE.Group(); spinner.position.set(0, cy, 0); g.add(spinner);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 108), new THREE.MeshStandardMaterial({ map: tex, roughness: .45, metalness: .1 })); face.position.z = .06; spinner.add(face);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(R + .06, R + .06, .1, 72), A.mat('wheelwood', { map: A.TEX.wood([4, 1]), roughness: .5 })); back.rotation.x = Math.PI / 2; spinner.add(back);
    for (let i = 0; i < n; i++) { const a = Math.PI / 2 - i * step + step / 2, p = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .12, 6), gold); p.rotation.x = Math.PI / 2; p.position.set(Math.cos(a) * (R - .02), Math.sin(a) * (R - .02), .1); spinner.add(p); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .14, 24), gold); hub.rotation.x = Math.PI / 2; hub.position.z = .1; spinner.add(hub);
    // the stand, the leather flapper at the top, and lights round the rim
    const post = new THREE.Mesh(new THREE.BoxGeometry(.5, cy, .4), A.mat('wheelwood', {})); post.position.set(0, cy / 2, -.25); g.add(post);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(.06, .3, .04), A.mat('flapper', { color: '#5a1a12', roughness: .6 })); flap.position.set(0, cy + R + .08, .16); g.add(flap);
    const bulbs = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe9a8', toneMapped: false })); b.position.set(Math.cos(a) * (R + .16), cy + Math.sin(a) * (R + .16), 0); g.add(b); bulbs.push(b); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + .16, .03, 8, 72), gold); ring.position.y = cy; g.add(ring);
    const sign = A.sign('BIG SIX', { color: '#ffd77a', w: 2.2, h: .5, font: '600 110px Georgia' }); sign.position.set(0, cy + R + .55, 0); g.add(sign);
    A.light('#ffe2a8', .8, 7, x + Math.sin(rot) * 2, 3.4, z + Math.cos(rot) * 2);
    A.collide([x - 1.1, z - 1.1, x + 1.1, z + 1.1]);
    const W = { spinner, theta: 0, spinning: null, flap, bulbs };
    A.every((t, dt) => {
      bulbs.forEach((b, i) => b.material.color.set(W.spinning ? ((i + Math.floor(t * 12)) % 2 ? '#ffe9a8' : '#5a4a20') : (Math.sin(t * 2 + i) > -.3 ? '#ffe9a8' : '#8a7a48')));
      if (!W.spinning) return;
      const S = W.spinning; S.t = Math.min(1, S.t + dt / S.dur);
      const k = 1 - Math.pow(1 - S.t, 3.2), th = S.from + (S.to - S.from) * k;
      const seg = Math.floor((th + step / 2) / step); if (seg !== S.seg) { S.seg = seg; flap.rotation.z = .35; SFX.click(); }
      flap.rotation.z *= .82; W.theta = th; spinner.rotation.z = th;
      if (S.t >= 1) { W.spinning = null; flap.rotation.z = 0; S.done(); }
    });
    W.spin = idx => new Promise(done => {
      const cur = ((W.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), want = idx * step + (Math.random() - .5) * step * .7;
      const delta = ((want - cur) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2 * (4 + Math.floor(Math.random() * 2));
      W.spinning = { from: W.theta, to: W.theta + delta, t: 0, dur: 6 + Math.random(), seg: null, done };
    });
    const fx = Math.sin(rot), fz = Math.cos(rot);
    W.cam = [[x + fx * 4.6, 2.2, z + fz * 4.6], [x, cy - 1.15, z]];
    props.wheel = W;
    return { use: [x + fx * 1.6, z + fz * 1.6] };
  }
  function wheel() {
    const W = props.wheel; if (!W) return;
    R3.view(...W.cam);
    return sheet('Big Six', api => {
      const spots = Object.keys(WHEEL.pays).map(k => [k, WHEEL.label[k], `pays ${odds(WHEEL.pays[k])}`]);
      const B = betBoard(api, spots, '.wheel'); let last = null;
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
  function dieTex(A) {
    const pips = { 1: [[.5, .5]], 2: [[.25, .25], [.75, .75]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.25, .22], [.75, .22], [.25, .5], [.75, .5], [.25, .78], [.75, .78]] };
    return [2, 5, 1, 6, 3, 4].map(v => new THREE.MeshStandardMaterial({ roughness: .35, map: A.canvasTex('die' + v, 128, 128, c => { c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, 128, 128); c.fillStyle = v === 1 || v === 4 ? '#b3222b' : '#151515'; pips[v].forEach(([x, y]) => { c.beginPath(); c.arc(x * 128, y * 128, v === 1 ? 17 : 12, 0, 7); c.fill(); }); }) }));
  }
  // the rotation that puts value v on top (+x 2, -x 5, +y 1, -y 6, +z 3, -z 4)
  const FACE = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [0, 0, Math.PI / 2], 5: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };
  function buildSicbo(A, x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; A.add(g);
    const layout = A.canvasTex('sicbo', 1024, 512, (c, w, hh) => {
      c.fillStyle = '#0e4a34'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#d9c27a'; c.lineWidth = 4; c.fillStyle = '#e8d8a8'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const box = (x0, y0, ww, h0, t, f = 34) => { c.strokeRect(x0, y0, ww, h0); c.font = `bold ${f}px Georgia`; c.fillText(t, x0 + ww / 2, y0 + h0 / 2); };
      box(20, 20, 240, 140, 'SMALL'); box(764, 20, 240, 140, 'BIG'); box(280, 20, 464, 140, 'ANY TRIPLE  ·  35 for 1');
      for (let i = 4; i <= 17; i++) box(20 + (i - 4) * 70.3, 180, 66, 120, String(i), 30);
      for (let i = 1; i <= 6; i++) box(20 + (i - 1) * 164, 320, 156, 170, '⚀⚁⚂⚃⚄⚅'[i - 1], 90);
    });
    const felt = new THREE.MeshStandardMaterial({ map: layout, roughness: .95 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, .08, 1.3), [A.mat('rail', { color: '#2a160c', roughness: .5 }), A.mat('rail', {}), felt, A.mat('rail', {}), A.mat('rail', {}), A.mat('rail', {})]); top.position.y = .88; g.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, .84, 1.1), A.mat('rail', {})); base.position.y = .42; g.add(base);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.7, .08, .12), A.mat('rail', {})); rail.position.set(0, .94, .66); g.add(rail);
    // the shaker: a gold plate, a glass dome, three dice
    const gold = A.mat('wheelgold', { color: '#c9a14a', metalness: .85, roughness: .3 });
    const shaker = new THREE.Group(); shaker.position.set(0, .93, -.85); g.add(shaker);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, .06, 32), gold); shaker.add(plate);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.28, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#dfefff', transparent: true, opacity: .22, roughness: .05, metalness: .1, depthWrite: false })); dome.position.y = .03; shaker.add(dome);
    const mats = dieTex(A), dice = [0, 1, 2].map(i => { const d = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .09), mats); d.position.set(Math.cos(i * 2.1) * .1, .08, Math.sin(i * 2.1) * .1); shaker.add(d); return d; });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(.05, .12, .9, 12), gold); stand.position.set(0, .45, -.85); g.add(stand);
    const turned = Math.abs(Math.sin(rot)) > .5, hx = turned ? 1.1 : 1.4, hz = turned ? 1.4 : 1.1; A.collide([x - hx, z - hz, x + hx, z + hz]);
    const S = { dice, shaker, rolling: null };
    A.every((t, dt) => {
      const R = S.rolling; if (!R) return;
      R.t += dt;
      if (R.t < 1.5) { // shake: the dome jumps, the dice tumble
        shaker.position.y = .93 + Math.abs(Math.sin(R.t * 26)) * .05; shaker.rotation.z = Math.sin(R.t * 31) * .08;
        dice.forEach((d, i) => { d.rotation.x += dt * (9 + i * 3); d.rotation.y += dt * (7 + i * 2); d.position.y = .08 + Math.abs(Math.sin(R.t * 18 + i)) * .1; d.position.x = Math.cos(R.t * 9 + i * 2.1) * .11; d.position.z = Math.sin(R.t * 7 + i * 2.1) * .11; });
      } else if (!R.settled) { // land: each die eases onto its face
        shaker.position.y = .93; shaker.rotation.z = 0; R.settled = true;
        dice.forEach((d, i) => { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...FACE[R.out[i]])); const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28); d.userData.to = yaw.multiply(q); d.userData.from = d.quaternion.clone(); d.userData.px = [Math.cos(i * 2.1 + .4) * .11, Math.sin(i * 2.1 + .4) * .11]; });
        R.k = 0;
      } else {
        R.k = Math.min(1, R.k + dt * 4);
        dice.forEach(d => { d.quaternion.slerpQuaternions(d.userData.from, d.userData.to, R.k); d.position.y = .08 - .035 + .035 * (1 - R.k) + .035; d.position.x += (d.userData.px[0] - d.position.x) * R.k; d.position.z += (d.userData.px[1] - d.position.z) * R.k; });
        if (R.k >= 1) { S.rolling = null; R.done(); }
      }
    });
    S.roll = out => new Promise(done => { SFX.dice(); setTimeout(() => SFX.dice(), 500); S.rolling = { t: 0, out, done }; });
    const fx = Math.sin(rot), fz = Math.cos(rot), w = (lx, ly, lz) => [x + lx * Math.cos(rot) + lz * fx, ly, z - lx * Math.sin(rot) + lz * fz];
    S.cam = [w(0, 1.95, 1.05), w(0, .72, -.5)];
    props.sicbo = S;
    return { use: [x + fx * 1.25, z + fz * 1.25] };
  }
  function sicbo() {
    const S = props.sicbo; if (!S) return;
    R3.view(...S.cam);
    return sheet('Sic Bo', api => {
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
  function buildPusher(A, id, x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; A.add(g);
    const s = .36, shelfY = 1.02, map = (cx, cy) => [cx * s, (cy - .75) * s]; // shelf coords to local x, z
    const body = A.mat('pusherbody', { color: '#10233a', metalness: .5, roughness: .35 }), chrome = A.mat('chrome', { color: '#d8dde2', metalness: .95, roughness: .15 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(.9, shelfY, .75), body); cab.position.set(0, shelfY / 2, 0); g.add(cab);
    for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.1, .75), body); side.position.set(sx * .45, shelfY + .55, 0); g.add(side); }
    const backArt = A.canvasTex('pusherback' + id, 256, 256, (c, w, hh) => { const gr = c.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, id === 'a' ? '#0a3a5a' : '#4a0a3a'); gr.addColorStop(1, '#05080c'); c.fillStyle = gr; c.fillRect(0, 0, w, hh); c.strokeStyle = id === 'a' ? 'rgba(77,210,255,.6)' : 'rgba(255,122,217,.6)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, 60 + i * 30 + Math.sin(x / 20 + i) * 8); c.stroke(); } c.fillStyle = '#ffe9a8'; c.font = 'bold 40px Georgia'; c.textAlign = 'center'; c.fillText('★ GOLD = 10 ★', w / 2, 40); });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(.84, 1.1), new THREE.MeshBasicMaterial({ map: backArt, toneMapped: false })); backWall.position.set(0, shelfY + .55, -.36); g.add(backWall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(.96, .3, .8), body); roof.position.set(0, shelfY + 1.2, 0); g.add(roof);
    const marquee = A.sign(id === 'a' ? 'HIGH TIDE' : 'LOW TIDE', { color: id === 'a' ? '#4dd2ff' : '#ff7ad9', w: .9, h: .24, font: 'italic bold 120px Georgia', bg: 'rgba(5,10,20,1)' }); marquee.position.set(0, shelfY + 1.2, .41); g.add(marquee);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(.84, .62), new THREE.MeshStandardMaterial({ color: '#cfe6ff', transparent: true, opacity: .12, roughness: .05, depthWrite: false })); glass.position.set(0, shelfY + .75, .38); g.add(glass);
    const shelf = new THREE.Mesh(new THREE.PlaneGeometry(2 * s, PUSH.edge * s), A.mat('pushershelf', { color: '#2a5a7a', metalness: .6, roughness: .3 })); shelf.rotation.x = -Math.PI / 2; shelf.position.set(0, shelfY, (PUSH.edge / 2 - .75) * s); g.add(shelf);
    const gutterM = A.mat('gutter', { color: '#05080c' });
    for (const sx of [-1, 1]) { const gt = new THREE.Mesh(new THREE.BoxGeometry((1 - PUSH.pay) * s, .02, .06), gutterM); gt.position.set(sx * (PUSH.pay + (1 - PUSH.pay) / 2) * s, shelfY + .002, (PUSH.edge - .75) * s + .02); g.add(gt); }
    const tray = new THREE.Mesh(new THREE.BoxGeometry(.6, .08, .16), chrome); tray.position.set(0, .55, .42); g.add(tray);
    const pusher = new THREE.Mesh(new THREE.BoxGeometry(2 * s, .1, .5 * s), chrome); g.add(pusher);
    const dropper = new THREE.Mesh(new THREE.ConeGeometry(.06, .13, 14), A.mat('dropper', { color: '#ffd77a', emissive: '#ffb84d', emissiveIntensity: .6 })); dropper.rotation.x = Math.PI; g.add(dropper);
    const light = A.light(id === 'a' ? '#7fd8ff' : '#ff9ae6', .7, 3.5, x + Math.sin(rot) * .6, shelfY + 1, z + Math.cos(rot) * .6);
    A.collide([x - .5, z - .42, x + .5, z + .42]);
    const coinGeo = new THREE.CylinderGeometry(PUSH.r * s, PUSH.r * s, .012, 18);
    const coins = new THREE.InstancedMesh(coinGeo, A.mat('coin', { color: '#d9b45a', metalness: .9, roughness: .3 }), PUSH.max + 10); g.add(coins);
    const golds = new THREE.InstancedMesh(coinGeo, A.mat('goldcoin', { color: '#ffcf3a', metalness: .9, roughness: .2, emissive: '#7a4a00', emissiveIntensity: .6 }), 12); g.add(golds);
    const falling = []; // coins tipping over the edge, for a moment
    const store_ = () => { const G = store(); if (!G['push' + id]) G['push' + id] = pusherNew(); return G['push' + id]; };
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
    const Pz = { id, playing: null, aim: 0 };
    A.every((t, dt) => {
      const P = store_();
      // the shelf only moves while someone is near enough to see it (it's the slowest thing on the floor)
      const near = Pz.playing || Math.hypot(R3.player.x - x, R3.player.z - z) < 9;
      const fell = near ? pusherStep(P, Math.min(dt, 1 / 30)) : [];
      if (fell.length) for (const c of fell) { falling.push({ x: c.x, y: PUSH.edge, g: c.g, v: 0, life: 0 }); if (Pz.playing) Pz.playing(c); }
      // draw: stack coins that overlap slightly so the pile reads as a pile
      let n = 0, ng = 0;
      for (const c of P.coins) { const [lx, lz] = map(c.x, c.y); V3.set(lx, shelfY + .007, lz); M.compose(V3, Q, ONE); if (c.g && ng < 12) golds.setMatrixAt(ng++, M); else if (n < PUSH.max + 10) coins.setMatrixAt(n++, M); }
      for (let i = falling.length - 1; i >= 0; i--) { const f = falling[i]; f.life += dt; f.v += dt * 3; const [lx, lz] = map(f.x, f.y + f.life * .4); V3.set(lx, shelfY - f.life * f.v, lz); M.compose(V3, Q, ONE); if (f.g && ng < 12) golds.setMatrixAt(ng++, M); else if (n < PUSH.max + 10) coins.setMatrixAt(n++, M); if (f.life > .5) falling.splice(i, 1); }
      coins.count = n; golds.count = ng; coins.instanceMatrix.needsUpdate = true; golds.instanceMatrix.needsUpdate = true;
      const f = pusherFace(P.t), [, pz] = map(0, f); pusher.position.set(0, shelfY + .05, pz - .25 * s);
      Pz.aim = Math.sin(t * 1.25) * .85; const [ax, az] = map(Pz.aim, .2); dropper.position.set(ax, shelfY + .3, az);
    });
    Pz.drop = () => { const P = store_(); if (P.coins.length >= PUSH.max) return false; P.drops++; const shaky = document.body.classList.contains('l2-shakes') ? .3 : .02; // trembling hands miss
      P.coins.push({ x: Pz.aim + (Math.random() - .5) * shaky, y: pusherFace(P.t) + PUSH.r + .01, g: 0 }); if (P.drops % PUSH.goldEvery === 0) { P.coins.push({ x: (Math.random() - .5) * 1.2, y: pusherFace(P.t) + PUSH.r + .2, g: 1 }); return 'gold'; } return true; };
    const fx = Math.sin(rot), fz = Math.cos(rot), w = (lx, ly, lz) => [x + lx * Math.cos(rot) + lz * fx, ly, z - lx * Math.sin(rot) + lz * fz];
    Pz.cam = [w(0, shelfY + .62, .78), w(0, shelfY - .3, -.05)];
    props['pusher' + id] = Pz;
    return { use: [x + fx * .9, z + fz * .9] };
  }
  function pusher(id) {
    const Pz = props['pusher' + id]; if (!Pz) return;
    R3.view(...Pz.cam);
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
        const r = Pz.drop(); if (!r) return api.say('The shelf is full. Give it a moment.');
        credit(-PUSH.coin); spent += PUSH.coin; SFX.click(); App.count('l2_coins'); paintTally();
        if (r === 'gold') api.say('The machine chimes and slides a gold token onto the shelf.');
      };
      api.say('Time the dropper and press Drop (or Space).');
      paintTally();
      api.box.append(info, tally, h('div.l2-gfoot', dropBtn));
    }).then(() => { Pz.playing = null; App.save(); });
  }

  return { buildWheel, buildSicbo, buildPusher, wheel, sicbo, pusher, WHEEL, SUMS, sicboPays, PUSH, pusherNew, pusherStep, pusherFace, get props() { return props; } };
})();
