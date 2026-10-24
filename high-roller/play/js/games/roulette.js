/* Roulette: American (0/00), European (0) or French (0 with La Partage) wheels.
   Inside bets via hotspots on the grid lines: straights, splits, streets, corners, six lines. */
GAMES.roulette = (() => {
  const ORDER = {
    european: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
    american: [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2],
  };
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const colorOf = n => (n === 0 || n === '00') ? 'green' : REDS.has(n) ? 'red' : 'black';
  const hist = {};
  let t, ctx, wheel, order, bets, angle = 0, history;

  function mount(table, c) {
    t = table; ctx = c; wheel = (ctx.rules && ctx.rules.wheel) || 'american';
    order = ORDER[wheel === 'american' ? 'american' : 'european'];
    history = hist[ctx.venueId] || (hist[ctx.venueId] = []);
    t.shoe.style.display = 'none';
    bets = [];
    const insideMax = Math.max(10, Math.round(ctx.limits.max / 20));
    const mk = (key, label, nums, pays, cls, max) => {
      const s = t.spot({ key, label, cls, max: max || ctx.limits.max });
      bets.push({ key, nums, pays, spot: s, even: pays === 1 });
      return s;
    };
    // number grid: 12 columns x 3 rows; top row is 3,6,9...
    const grid = h('div.rl-grid');
    const zeros = h('div.rl-zeros');
    (wheel === 'american' ? ['00', 0] : [0]).forEach(z => {
      const s = mk('n' + z, String(z), [z], 35, 'rl-num green', insideMax); zeros.append(s.el);
    });
    const cells = h('div.rl-cells');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) {
      const n = 3 * c + (3 - r);
      const s = mk('n' + n, String(n), [n], 35, 'rl-num ' + colorOf(n), insideMax);
      s.el.style.gridColumn = c + 1; s.el.style.gridRow = r + 1; s.el.dataset.c = c; s.el.dataset.r = r;
      cells.append(s.el);
    }
    const hot = (key, nums, pays, x, y, title) => {
      const s = mk(key, '', nums, pays, 'rl-hot', insideMax);
      s.el.style.left = (x / 12 * 100) + '%'; s.el.style.top = (y / 3 * 100) + '%'; s.el.title = title; s.el.dataset.x = x; s.el.dataset.y = y;
      cells.append(s.el);
    };
    const num = (c, r) => 3 * c + (3 - r);
    for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) {
      if (c < 11) hot(`sh${c}_${r}`, [num(c, r), num(c + 1, r)], 17, c + 1, r + 0.5, `Split ${num(c, r)}/${num(c + 1, r)}`);
      if (r < 2) hot(`sv${c}_${r}`, [num(c, r), num(c, r + 1)], 17, c + 0.5, r + 1, `Split ${num(c, r)}/${num(c, r + 1)}`);
      if (c < 11 && r < 2) hot(`co${c}_${r}`, [num(c, r), num(c + 1, r), num(c, r + 1), num(c + 1, r + 1)], 8, c + 1, r + 1, 'Corner');
    }
    for (let c = 0; c < 12; c++) {
      hot('st' + c, [num(c, 0), num(c, 1), num(c, 2)], 11, c + 0.5, 3, `Street ${num(c, 2)}-${num(c, 0)}`);
      if (c < 11) hot('sl' + c, [num(c, 0), num(c, 1), num(c, 2), num(c + 1, 0), num(c + 1, 1), num(c + 1, 2)], 5, c + 1, 3, `Six line ${num(c, 2)}-${num(c + 1, 0)}`);
    }
    if (wheel !== 'american') for (let r = 0; r < 3; r++) hot('z' + r, [0, num(0, r)], 17, 0, r + 0.5, `Split 0/${num(0, r)}`);
    const colsEl = h('div.rl-cols');
    for (let r = 0; r < 3; r++) { const nums = []; for (let c = 0; c < 12; c++) nums.push(num(c, r)); const cs = mk('col' + r, '2 to 1', nums, 2, 'rl-out'); cs.el.dataset.r = r; colsEl.append(cs.el); }
    const dz = h('div.rl-dozens');
    ['1st 12', '2nd 12', '3rd 12'].forEach((l, i) => dz.append(mk('dz' + i, l, Array.from({ length: 12 }, (_, k) => i * 12 + k + 1), 2, 'rl-out').el));
    const ev = h('div.rl-even');
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
    [['low', '1-18', range(1, 18)], ['even', 'EVEN', range(1, 36).filter(n => n % 2 === 0)], ['red', '◆', [...REDS]],
     ['black', '◆', range(1, 36).filter(n => !REDS.has(n))], ['odd', 'ODD', range(1, 36).filter(n => n % 2)], ['high', '19-36', range(19, 36)]]
      .forEach(([k, l, nums]) => ev.append(mk(k, l, nums, 1, 'rl-out ' + (k === 'red' ? 'redd' : k === 'black' ? 'blackd' : '')).el));
    grid.append(zeros, h('div.rl-main', cells, dz, ev), colsEl);

    // phones get the layout turned upright: three columns of numbers, twelve rows, like a mobile table
    const vert = innerWidth < 640;
    if (vert) {
      for (const el of cells.querySelectorAll('.rl-num')) { el.style.gridColumn = 3 - +el.dataset.r; el.style.gridRow = +el.dataset.c + 1; }
      for (const el of cells.querySelectorAll('.rl-hot')) { el.style.left = ((3 - +el.dataset.y) / 3 * 100) + '%'; el.style.top = (+el.dataset.x / 12 * 100) + '%'; }
      for (const el of colsEl.children) el.style.order = 2 - +el.dataset.r;
    }
    t.body.append(h('div.roulette' + (vert ? '.vert' : ''),
      h('div.rl-top',
        h('div.wheel-wrap', h('div.pointer'), h('div.wheel#rl-wheel', { html: wheelSVG() }), h('div.wheel-center#rl-res', '')),
        h('div.rl-info', h('div.area-l', `${wheel === 'american' ? 'Double-zero' : wheel === 'french' ? 'French single-zero · La Partage: half back on even-money bets when 0 hits' : 'Single-zero'} wheel`),
          h('div.rl-hist#rl-hist'), h('p.muted.small', vert ? 'Tap a number for a straight-up bet. Tap the lines between numbers for splits and corners, the outer edge for streets and six lines. Long-press a bet to take a chip back.' : 'Click a number for a straight-up bet. Click the lines between numbers for splits, corners, streets (bottom edge) and six lines. Right-click a bet to take a chip back.'))),
      grid));
    $('#rl-wheel').style.transform = `rotate(${angle}deg)`;
    drawHist(); idle();
  }

  function wheelSVG() {
    const N = order.length, R = 100, seg = 360 / N;
    let s = `<svg viewBox="-110 -110 220 220"><circle r="108" fill="#5a3a1a"/><circle r="103" fill="#2b1a0b"/>`;
    order.forEach((n, i) => {
      const a0 = (i * seg - seg / 2 - 90) * Math.PI / 180, a1 = ((i + 1) * seg - seg / 2 - 90) * Math.PI / 180;
      const fill = { red: '#b3122b', black: '#151515', green: '#0d7a3a' }[colorOf(n)];
      s += `<path d="M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)}Z" fill="${fill}" stroke="#c9a14a" stroke-width=".6"/>`;
      const am = (i * seg - 90) * Math.PI / 180, tr = 88;
      s += `<text x="${tr * Math.cos(am)}" y="${tr * Math.sin(am)}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle" dominant-baseline="central" transform="rotate(${i * seg} ${tr * Math.cos(am)} ${tr * Math.sin(am)})">${n}</text>`;
    });
    s += `<circle r="70" fill="#3b2410" stroke="#c9a14a" stroke-width="2"/><circle r="34" fill="#c9a14a"/><circle r="28" fill="#7b5524"/>`;
    for (let i = 0; i < 8; i++) { const a = i * 45 * Math.PI / 180; s += `<line x1="0" y1="0" x2="${60 * Math.cos(a)}" y2="${60 * Math.sin(a)}" stroke="#c9a14a" stroke-width="4"/>`; }
    return s + `<circle r="10" fill="#e8c76a"/></svg>`;
  }
  function drawHist() {
    const el = $('#rl-hist'); el.innerHTML = '';
    history.slice(-16).reverse().forEach(n => el.append(h('span.rh.' + colorOf(n), String(n))));
  }
  function idle() {
    t.busy = false; bets.forEach(b => b.spot.setLocked(false));
    t.msg('Place your chips and spin.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets() },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Spin', key: ' ', cls: 'primary', on: spin },
    ]);
  }
  async function spin() {
    const total = t.totalOn();
    if (!total) return UI.toast('Place a bet first', 'warn');
    if (total < ctx.limits.min) return UI.toast(`Table minimum is ${fmt(ctx.limits.min)} total`, 'warn');
    t.busy = true; t.setActions([]); bets.forEach(b => b.spot.setLocked(true));
    t.saveBets(bets.map(b => b.key));
    const idx = RNG.int(order.length), n = order[idx], seg = 360 / order.length;
    // rotate so the winning pocket lands under the pointer at the top
    const target = 360 - idx * seg;
    const cur = ((angle % 360) + 360) % 360;
    angle += 360 * 5 + ((target - cur + 360) % 360);
    const w = $('#rl-wheel'), dur = 3600 * App.speedFactor();
    $('#rl-res').textContent = '';
    w.style.transition = `transform ${dur}ms cubic-bezier(.12,.6,.15,1)`;
    w.style.transform = `rotate(${angle}deg)`;
    SFX.wheel(dur);
    await new Promise(r => setTimeout(r, dur + 80));
    const res = $('#rl-res'); res.textContent = String(n); res.className = 'wheel-center ' + colorOf(n);
    history.push(n); drawHist();
    const zero = n === 0 || n === '00';
    for (const b of bets) {
      if (!b.spot.amount) continue;
      if (b.nums.includes(n)) b.spot.win(b.pays);
      else if (zero && b.even && wheel === 'french') b.spot.refund(round2(b.spot.amount / 2), 'La Partage');
      else b.spot.lose();
    }
    t.finishRound();
    idle(); t.msg(`${n} ${colorOf(n).toUpperCase()}${zero ? '' : ` · ${n % 2 ? 'odd' : 'even'} · ${n <= 18 ? 'low' : 'high'}`}`);
  }
  return {
    id: 'roulette', name: 'Roulette', icon: '🎡', blurb: 'The wheel. Find a single-zero table, or better, La Partage.',
    mount,
    info(c) {
      const w = (c.rules && c.rules.wheel) || 'american', N = w === 'american' ? 38 : 37;
      return [
        { title: 'Wheel', text: w === 'american' ? 'Double zero (0 and 00): every bet except the 5-number basket has a 5.26% house edge.' : w === 'french' ? 'Single zero with La Partage: even-money bets lose only half when zero hits (1.35% edge); everything else 2.70%.' : 'Single zero: 2.70% house edge on every bet.' },
        { title: 'Payouts', rows: [['Straight up', '35 to 1'], ['Split', '17 to 1'], ['Street', '11 to 1'], ['Corner', '8 to 1'], ['Six line', '5 to 1'], ['Dozen / Column', '2 to 1'], ['Red/Black, Odd/Even, 1-18/19-36', '1 to 1']],
          rtp: w === 'french' ? 1 - 1 / 74 : 36 / N },
      ];
    },
  };
})();
