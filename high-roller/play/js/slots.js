/* Slots: four five-reel, 243-ways video slots, one per casino, each with its own bonus:
   Dusty Dollars (Gold Rush Hold & Spin + Wanted poster pick), Paddlewheel Gold (wheel bonus +
   multiplier-trail free spins), Gilded Dragon (sticky expanding wilds + Dragon Pearl Hold & Spin) and
   Kessler's Vault (match-three safe-cracker jackpots + multiplier free spins). Every machine also has
   Sal's Lucky 17 wild reels, an even-money gamble and four must-hit-by mystery jackpots per casino.
   The maths is plain functions so tools/slots-sim.js can simulate it. */
const SlotMath = (() => {
  // symbol ids
  const W = 0, S = 1, O = 2, H1 = 3, H2 = 4, H3 = 5, H4 = 6, A = 7, K_ = 8, Q = 9, J = 10, T = 11, B = 12;
  const PAYING = [H1, H2, H3, H4, A, K_, Q, J, T];
  // pays per way, in multiples of the total bet, for 3, 4 and 5 of a kind (before each machine's scale)
  const PAY0 = {
    [H1]: [0.50, 1.50, 5.00], [H2]: [0.40, 1.20, 4.00], [H3]: [0.30, 0.80, 2.50], [H4]: [0.25, 0.60, 2.00],
    [A]: [0.15, 0.40, 1.20], [K_]: [0.15, 0.40, 1.20], [Q]: [0.10, 0.30, 1.00], [J]: [0.10, 0.30, 1.00], [T]: [0.10, 0.25, 0.80],
  };
  const SCAT_PAY = { 3: 1, 4: 5, 5: 25 };
  const CAP = 5000; // biggest win on one spin, in bets
  const JP = { MINI: 20, MINOR: 50, MAJOR: 250, GRAND: 1000 };
  const LUCKY = 1 / 300;
  const MAKEUP = [
    { [W]: 0, [S]: 1, [O]: 3, [H1]: 2, [H2]: 3, [H3]: 3, [H4]: 4, [A]: 5, [K_]: 5, [Q]: 6, [J]: 6, [T]: 6 },
    { [W]: 2, [S]: 2, [O]: 3, [H1]: 2, [H2]: 3, [H3]: 4, [H4]: 4, [A]: 5, [K_]: 5, [Q]: 5, [J]: 6, [T]: 6 },
    { [W]: 2, [S]: 2, [O]: 3, [H1]: 2, [H2]: 3, [H3]: 4, [H4]: 4, [A]: 5, [K_]: 5, [Q]: 5, [J]: 6, [T]: 6 },
    { [W]: 2, [S]: 2, [O]: 3, [H1]: 2, [H2]: 3, [H3]: 4, [H4]: 4, [A]: 5, [K_]: 5, [Q]: 5, [J]: 6, [T]: 6 },
    { [W]: 0, [S]: 1, [O]: 3, [H1]: 2, [H2]: 3, [H3]: 3, [H4]: 4, [A]: 5, [K_]: 5, [Q]: 6, [J]: 6, [T]: 6 },
  ];
  // each machine's character. K scales the line pays (tuned by simulation to ~97.3% overall)
  const CFG = {
    spur: { K: 2.49, seed: 1700, fs: { type: 'mult', award: { 3: 8, 4: 12, 5: 20 }, extraWild: 1 }, hs: { land: .04 }, bonus: 'pick', bOn: 2 },
    riverboat: { K: 2.29, seed: 2100, fs: { type: 'trail', award: { 3: 8, 4: 12, 5: 20 }, extraWild: 1, cap: 6 }, hs: null, bonus: 'wheel', bOn: 2 },
    palace: { K: 1.94, seed: 2500, fs: { type: 'sticky', award: { 3: 6, 4: 8, 5: 12 }, wild: 1 }, hs: { land: .036 }, bonus: null, bOn: 0 },
    salon: { K: 2.27, seed: 2900, fs: { type: 'mult', award: { 3: 8, 4: 12, 5: 20 }, extraWild: 1 }, hs: null, bonus: 'vault', bOn: 2 },
  };
  // Hold & Spin orb values (multiples of the bet) and the fixed jackpots on the orbs
  const ORB = [[1, 400], [2, 250], [3, 150], [5, 120], [8, 70], [10, 50], [15, 30], [25, 15], ['MINI', 12], ['MINOR', 2.5], ['MAJOR', .5]];
  const ORB_TOTAL = ORB.reduce((a, [, w]) => a + w, 0);
  function orbValue(rng) { let x = rng() * ORB_TOTAL; for (const [v, w] of ORB) { if ((x -= w) < 0) return v; } return 1; }
  const orbPays = v => typeof v === 'number' ? v : JP[v];
  // the Paddlewheel: wedges sized by how often they come up
  const WHEEL = [[15, 14], [20, 14], [25, 12], [30, 11], [40, 10], [50, 9], [75, 7], [100, 6], ['FS', 8], [150, 4], [250, 3], ['MAJOR', 1.5], ['GRAND', .5]];
  // Crack the Vault: which jackpot you match three of
  const VAULT = [['MINI', 58], ['MINOR', 30], ['MAJOR', 10], ['GRAND', 2]];
  const VAULT_PAY = { MINI: 15, MINOR: 40, MAJOR: 150, GRAND: 1000 };
  // Wanted posters: 12 posters, three say COLLECT
  const POSTER = [[4, 25], [6, 22], [10, 18], [16, 12], [20, 10], [30, 6], [50, 4], [100, 2], [200, .6]];
  const pickW = (rng, list) => { const tot = list.reduce((a, [, w]) => a + w, 0); let x = rng() * tot; for (const [v, w] of list) { if ((x -= w) < 0) return v; } return list[0][0]; };

  // a fixed, seeded layout so every machine of a kind has the same reels
  function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function buildStrip(mk, seed) {
    const r = seeded(seed), bag = [];
    for (const s in mk) if (+s !== O && +s !== S && +s !== B) for (let i = 0; i < mk[s]; i++) bag.push(+s);
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    const strip = bag.slice();
    for (let k = 0; k < (mk[O] || 0) / 3; k++) { const at = Math.floor(r() * strip.length); strip.splice(at, 0, O, O, O); }
    // scatters and bonus symbols sit far apart
    for (const sym of [S, B]) for (let k = 0; k < (mk[sym] || 0); k++) {
      for (let tries = 0; tries < 300; tries++) {
        const at = Math.floor(r() * strip.length);
        const near = [-3, -2, -1, 0, 1, 2].some(d => { const g = strip[(at + d + strip.length) % strip.length]; return g === S || g === B; });
        if (!near) { strip.splice(at, 0, sym); break; }
      }
    }
    return strip;
  }

  function make(key) {
    const c = CFG[key];
    const PAY = {}; for (const s in PAY0) PAY[s] = PAY0[s].map(v => Math.round(v * c.K * 100) / 100);
    const mk = MAKEUP.map((m, i) => ({ ...m, [O]: c.hs ? m[O] : 0, [B]: c.bonus && i < 3 ? c.bOn : 0 }));
    const STRIPS = mk.map((m, i) => buildStrip(m, c.seed + i * 17));
    const STRIPS_FS = mk.map((m, i) => buildStrip({ ...m, [W]: m[W] ? (c.fs.wild != null ? c.fs.wild : m[W] + c.fs.extraWild) : 0, [O]: 0, [B]: 0 }, c.seed + 1200 + i * 31));
    const stops = (rng, set = STRIPS) => set.map(s => Math.floor(rng() * s.length));
    const view = (st, set = STRIPS) => st.map((p, r) => [0, 1, 2].map(k => set[r][(p + k) % set[r].length]));
    const count = (grid, sym) => { let n = 0; for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (grid[r][k] === sym) n++; return n; };
    // evaluate 243 ways. mults[r][row] holds wild multipliers (1 in the base game)
    function evaluate(grid, mults) {
      const wins = []; let total = 0;
      for (const s of PAYING) {
        let ways = 1, len = 0;
        for (let r = 0; r < 5; r++) {
          let n = 0;
          for (let k = 0; k < 3; k++) { const g = grid[r][k]; if (g === s) n += 1; else if (g === W) n += mults ? mults[r][k] : 1; }
          if (!n) break;
          ways *= n; len++;
        }
        if (len >= 3) { const p = PAY[s][len - 3] * ways; total += p; wins.push({ s, len, ways, pay: p }); }
      }
      const sc = count(grid, S), orbs = count(grid, O);
      // a bonus needs its symbol on each of the first three reels
      const bonus = !!c.bonus && [0, 1, 2].every(r => grid[r].includes(B));
      if (sc >= 3) total += SCAT_PAY[Math.min(5, sc)];
      return { wins, total, sc, orbs, bonus };
    }
    function spinBase(rng) {
      const st = stops(rng), grid = view(st);
      let lucky = null;
      if (rng() < LUCKY) { // Sal's Lucky 17: one or two middle reels go wild
        const n = rng() < .75 ? 1 : 2, reels = [1, 2, 3].sort(() => rng() - .5).slice(0, n).sort();
        lucky = reels; for (const r of reels) grid[r] = [W, W, W];
      }
      return { st, grid, lucky, ev: evaluate(grid) };
    }
    // one free spin; fs carries the feature's state between spins
    function spinFree(rng, fs) {
      const st = stops(rng, STRIPS_FS), grid = view(st, STRIPS_FS);
      let mults = null;
      if (c.fs.type === 'mult') mults = grid.map(col => col.map(g => g === W ? (rng() < .8 ? 2 : 3) : 1));
      if (c.fs.type === 'sticky') { // a wild on reels 2-4 fills its reel and stays for the rest of the feature
        for (let r = 1; r <= 3; r++) if (grid[r].includes(W)) fs.sticky[r] = true;
        for (let r = 1; r <= 3; r++) if (fs.sticky[r]) grid[r] = [W, W, W];
      }
      const ev = evaluate(grid, mults);
      if (c.fs.type === 'trail') { ev.mult = fs.mult; ev.total *= fs.mult; if (ev.total > 0) fs.mult = Math.min(c.fs.cap || 10, fs.mult + 1); }
      return { st, grid, mults, ev };
    }
    function freshFS() { return { mult: 1, sticky: {} }; }
    function playFree(rng, n) {
      const fs = freshFS(); let total = 0, played = 0;
      while (n > 0 && played < 300) { const f = spinFree(rng, fs); total += f.ev.total; if (f.ev.sc >= 3) n += c.fs.award[3]; n--; played++; }
      return { total, played };
    }
    function holdAndSpin(rng, startGrid) {
      const cells = startGrid.map(col => col.map(g => g === O ? orbValue(rng) : null));
      const rounds = []; let left = 3;
      while (left > 0) {
        let landed = false; const add = [];
        for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (cells[r][k] === null && rng() < c.hs.land) { cells[r][k] = orbValue(rng); landed = true; add.push([r, k]); }
        rounds.push(add);
        if (cells.every(col => col.every(v => v !== null))) break;
        left = landed ? 3 : left - 1;
      }
      const full = cells.every(col => col.every(v => v !== null));
      const total = cells.flat().reduce((a, v) => a + (v === null ? 0 : orbPays(v)), 0) + (full ? JP.GRAND : 0);
      return { cells, rounds, full, total };
    }
    // Wanted posters: 12 face down, three COLLECTs; prizes add up until you turn a COLLECT
    function pickBoard(rng) {
      const tiles = []; for (let i = 0; i < 9; i++) tiles.push(pickW(rng, POSTER)); tiles.push('COLLECT', 'COLLECT', 'COLLECT');
      for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
      return tiles;
    }
    function pickValue(tiles, order) { let t = 0; for (const i of order) { if (tiles[i] === 'COLLECT') break; t += tiles[i]; } return t; }
    function wheelSpin(rng) { const tot = WHEEL.reduce((a, [, w]) => a + w, 0); let x = rng() * tot; for (let i = 0; i < WHEEL.length; i++) { if ((x -= WHEEL[i][1]) < 0) return i; } return 0; }
    const wheelPays = v => v === 'FS' ? 0 : typeof v === 'number' ? v : JP[v];
    // Crack the Vault: decide the jackpot, then a reveal order where it is the first to reach three
    function vaultRun(rng) {
      const win = pickW(rng, VAULT), others = VAULT.map(([t]) => t).filter(t => t !== win);
      const seq = [win, win];
      for (const o of others) { const n = Math.floor(rng() * 3); for (let i = 0; i < n; i++) seq.push(o); }
      for (let i = seq.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [seq[i], seq[j]] = [seq[j], seq[i]]; }
      seq.push(win);
      return { win, seq: seq.slice(0, 12), pays: VAULT_PAY[win] };
    }
    // a whole spin's return in bets (for the simulator)
    function simulate(rng) {
      const b = spinBase(rng); let total = b.ev.total; const parts = { base: b.ev.total, fs: 0, hs: 0, bonus: 0, lucky: b.lucky ? b.ev.total : 0 };
      if (b.ev.sc >= 3) { const f = playFree(rng, c.fs.award[Math.min(5, b.ev.sc)]); total += f.total; parts.fs = f.total; }
      if (c.hs && b.ev.orbs >= 6) { const hs = holdAndSpin(rng, b.grid); total += hs.total; parts.hs = hs.total; parts.full = hs.full; }
      if (b.ev.bonus) {
        let v = 0;
        if (c.bonus === 'pick') { const t = pickBoard(rng); v = pickValue(t, t.map((_, i) => i).sort(() => rng() - .5)); }
        if (c.bonus === 'wheel') { const w = WHEEL[wheelSpin(rng)][0]; v = w === 'FS' ? playFree(rng, 8).total : wheelPays(w); }
        if (c.bonus === 'vault') v = vaultRun(rng).pays;
        total += v; parts.bonus = v;
      }
      return { total: Math.min(CAP, total), parts, trig: { fs: b.ev.sc >= 3, hs: !!c.hs && b.ev.orbs >= 6, bonus: b.ev.bonus, lucky: !!b.lucky } };
    }
    return { key, cfg: c, PAY, STRIPS, STRIPS_FS, stops, view, evaluate, spinBase, spinFree, freshFS, playFree, holdAndSpin, pickBoard, pickValue, wheelSpin, wheelPays, vaultRun, simulate };
  }
  const cache = {};
  const machine = key => cache[key] || (cache[key] = make(key));
  return { W, S, O, H1, H2, H3, H4, A, K: K_, Q, J, T, B, PAYING, SCAT_PAY, CAP, JP, ORB, WHEEL, VAULT, VAULT_PAY, POSTER, LUCKY, CFG, orbPays, machine };
})();

/* ======== machine ======== */
const SLOT_MACHINES = {
  spur: { name: 'Dusty Dollars', bets: [0.25, 0.5, 1, 2, 5, 10], b: 2, cls: 'western', tag: 'Gold Rush coins · Wanted poster pick · free spins with ×2/×3 wilds' },
  riverboat: { name: 'Paddlewheel Gold', bets: [1, 2, 5, 10, 25, 50], b: 10, cls: 'river', tag: 'Paddlewheel bonus · free spins with a growing multiplier' },
  palace: { name: 'Gilded Dragon', bets: [5, 10, 25, 50, 100, 250], b: 50, cls: 'dragon', tag: 'Sticky expanding wilds · Dragon Pearl coins' },
  salon: { name: 'Kessler\'s Vault', bets: [25, 100, 250, 500, 1000, 2500], b: 500, cls: 'vault', tag: 'Crack the Vault jackpots · free spins with ×2/×3 wilds' },
};
// must-hit-by mystery jackpots: each hits somewhere between reset and cap (in multiples of the machine's
// typical bet b), so a meter close to its cap is worth chasing
const MYSTERY = [
  { key: 'copper', name: 'Copper', icon: '🥉', reset: 5, cap: 10, rate: .004 },
  { key: 'silver', name: 'Silver', icon: '🥈', reset: 25, cap: 60, rate: .0025 },
  { key: 'gold', name: 'Gold', icon: '🥇', reset: 150, cap: 400, rate: .002 },
  { key: 'diamond', name: 'Diamond', icon: '💎', reset: 1500, cap: 5000, rate: .002 },
];
// reels and features per machine, from tools/slots-sim.js (millions of spins each)
const SLOT_RTPS = { spur: .977, riverboat: .977, palace: .970, salon: .978 };
const rtpOf = v => SLOT_RTPS[v] || .975;

const Slots = (() => {
  const M = SlotMath;
  let V = null, el = null, busy = false, auto = 0, betIdx = 1, gambleWin = 0, mach = null;
  const st = () => {
    const s = App.state;
    if (!s.slots) s.slots = { meters: {}, spins: 0, wagered: 0, won: 0, best: 0, fs: 0, hs: 0, grand: 0, mystery: {} };
    return s.slots;
  };
  /* ---------- mystery meters ---------- */
  function fresh(t, b, v) { const trig = (t.reset + RNG.float() * (t.cap - t.reset)) * b; return { v: v != null ? Math.min(v, trig - 0.01) : t.reset * b, trig }; }
  function meters(venueId) {
    const s = st(), m = SLOT_MACHINES[venueId];
    if (!s.meters[venueId]) {
      s.meters[venueId] = {};
      for (const t of MYSTERY) { const f = fresh(t, m.b); f.v = t.reset * m.b + RNG.float() * (f.trig - t.reset * m.b) * .9; s.meters[venueId][t.key] = f; }
    }
    return s.meters[venueId];
  }
  // feed the meters; returns the tiers you hit
  function feed(venueId, bet) {
    const m = SLOT_MACHINES[venueId], ms = meters(venueId), hits = [];
    for (const t of MYSTERY) {
      const x = ms[t.key];
      x.v += t.rate * bet;
      if (x.v >= x.trig) { hits.push({ t, amt: Math.round(x.trig * 100) / 100 }); Object.assign(x, fresh(t, m.b)); continue; }
      // other players around the floor
      x.v += t.rate * m.b * RNG.float() * 1.2;
      if (x.v >= x.trig) { const amt = Math.round(x.trig * 100) / 100; Object.assign(x, fresh(t, m.b)); App.news(`🎰 Someone at ${VENUES[venueId].name} hit the ${t.name} mystery jackpot (${fmt(amt)}).`); if (el) UI.toast(`${t.icon} Someone across the floor just hit the ${t.name} for ${fmt(amt)}`, 'warn'); }
    }
    return hits;
  }
  // overnight play by everyone else
  function dailyGrowth() {
    for (const venueId in SLOT_MACHINES) {
      const m = SLOT_MACHINES[venueId], ms = meters(venueId), vol = m.b * 1500 * (.5 + RNG.float());
      for (const t of MYSTERY) {
        const x = ms[t.key]; x.v += t.rate * vol;
        // strangers hit it as often as the night's play carries it past a trigger; never leave a meter parked just under one
        for (let guard = 0; x.v >= x.trig && guard < 20; guard++) {
          const amt = Math.round(x.trig * 100) / 100, over = x.v - x.trig;
          Object.assign(x, fresh(t, m.b)); x.v += over * .5;
          if (t.key !== 'copper') App.news(`🎰 Overnight, a ${RNG.pick(['retired dentist', 'bus-tour grandma', 'lucky tourist', 'off-duty dealer', 'honeymooner'])} hit ${m.name}'s ${t.name} jackpot at ${VENUES[venueId].name} for ${fmt(amt)}.`);
        }
      }
    }
  }
  // what the next spin is worth, including the chance of a mystery hit (needs the Meter Reader)
  function heat(venueId, bet) {
    const m = SLOT_MACHINES[venueId], ms = meters(venueId);
    let ev = rtpOf(venueId);
    for (const t of MYSTERY) { const x = ms[t.key], room = t.cap * m.b - x.v, inc = t.rate * bet; const p = Math.min(1, inc / Math.max(room, 1e-9)); ev += p * (p >= 1 ? (x.v + t.cap * m.b) / 2 : x.v + inc / 2) / bet; }
    return ev;
  }

  /* ---------- the screen ---------- */
  const bet = () => SLOT_MACHINES[V].bets[betIdx];
  const art = g => SlotArt.svg(SLOT_MACHINES[V].cls, g);
  const money = x => x >= 1000 || Number.isInteger(x) ? fmt(Math.round(x)) : '$' + x.toFixed(2);
  function screen(main, venueId) {
    V = venueId || App.state.venue || 'spur';
    if (!SLOT_MACHINES[V]) V = 'spur';
    const m = SLOT_MACHINES[V];
    mach = M.machine(V);
    betIdx = Math.min(App.state.flags['slotBet_' + V] ?? 1, m.bets.length - 1);
    el = { cells: [] };
    const reels = h('div.sl-reels');
    for (let r = 0; r < 5; r++) { const col = h('div.sl-reel'); el.cells.push([0, 1, 2].map(() => { const c = h('div.sl-cell'); col.append(c); return c; })); reels.append(col); }
    main.append(h('div.sl.' + m.cls,
      h('div.table-top', el.back = h('button.btn.ghost.sm', { onclick: () => { if (!busy) { auto = 0; Router.go('world'); } } }, '← Leave'),
        h('div.tt-title', h('b', m.name), h('span', `${VENUES[V].name} · ${m.tag}`)), h('button.btn.ghost.sm', { onclick: paytable }, 'Paytable')),
      el.meters = h('div.sl-meters'),
      h('div.sl-cab', h('div.sl-marquee', m.name), el.jps = h('div.sl-jps'), reels, el.over = h('div.sl-over'), el.banner = h('div.sl-banner'), el.msg = h('div.sl-msg', 'Good luck!')),
      h('div.sl-ctl',
        h('div.sl-bet', h('button.btn.sm', { onclick: () => setBet(-1), 'aria-label': 'Lower bet' }, '−'), el.bet = h('b'), h('button.btn.sm', { onclick: () => setBet(1), 'aria-label': 'Raise bet' }, '+')),
        el.spin = h('button.btn.primary.sl-spin', { onclick: () => spin() }, 'SPIN', h('kbd', 'Space')),
        el.auto = h('button.btn.sl-auto', { onclick: toggleAuto }, 'Auto'),
        el.gamble = h('button.btn.ghost.sl-gamble', { onclick: gamble, hidden: true }, '🃏 Gamble')),
      el.heat = h('p.small.sl-heat')));
    showGrid(mach.view(mach.stops(Math.random)));
    renderMeters(); renderBet();
  }
  function setBet(d) { if (busy) return; const m = SLOT_MACHINES[V]; betIdx = clamp(betIdx + d, 0, m.bets.length - 1); App.state.flags['slotBet_' + V] = betIdx; renderBet(); }
  function renderBet() {
    if (!el) return;
    el.bet.textContent = money(bet());
    el.jps.innerHTML = '';
    const tiers = mach.cfg.bonus === 'vault' ? M.VAULT_PAY : M.JP;
    for (const k of ['MINI', 'MINOR', 'MAJOR', 'GRAND']) el.jps.append(h('div.sl-jp.' + k.toLowerCase(), h('small', k), h('b', money(tiers[k] * bet()))));
    renderHeat();
  }
  function renderMeters() {
    if (!el) return;
    const ms = meters(V), m = SLOT_MACHINES[V];
    el.meters.innerHTML = '';
    for (const t of MYSTERY) {
      const x = ms[t.key], lo = t.reset * m.b, hi = t.cap * m.b, p = clamp((x.v - lo) / (hi - lo), 0, 1);
      el.meters.append(h('div.sl-mm.' + t.key + (p > .85 ? '.hot' : ''), h('div.sl-mm-h', h('span', `${t.icon} ${t.name}`), h('b', money(x.v))),
        h('div.bar', h('i', { style: { width: (p * 100) + '%' } })), h('small', `Must hit by ${money(hi)}`)));
    }
    renderHeat();
  }
  function renderHeat() {
    if (!el) return;
    if (App.has('meterReader')) {
      const e = heat(V, bet());
      el.heat.className = 'small sl-heat ' + (e >= 1.02 ? 'good' : e >= 1 ? 'ok' : 'muted');
      el.heat.textContent = `📟 Meter Reader: this spin returns ${(e * 100).toFixed(1)}% right now${e >= 1.02 ? ': the machine is HOT' : ''}.`;
    } else el.heat.textContent = `Every mystery meter must hit before its cap. This machine returns ${(rtpOf(V) * 100).toFixed(1)}% plus the mystery jackpots.`;
  }
  function showGrid(grid, mults, sticky) {
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) setCell(el.cells[r][k], grid[r][k], mults && mults[r][k], sticky && sticky[r]);
  }
  function setCell(c, g, mult, sticky) {
    c.className = 'sl-cell s' + g + (sticky ? ' sticky' : ''); c.innerHTML = art(g);
    if (mult > 1) c.append(h('em.x', '×' + mult));
  }

  /* ---------- spinning ---------- */
  async function animate(grid, mults, sticky) {
    const spinning = [0, 1, 2, 3, 4].filter(r => !(sticky && sticky[r]));
    for (let r = 0; r < 5; r++) if (sticky && sticky[r]) for (let k = 0; k < 3; k++) setCell(el.cells[r][k], M.W, 1, true);
    const blurs = [M.A, M.K, M.Q, M.J, M.T, M.H1, M.H2, M.H3, M.H4];
    const tick = setInterval(() => { for (const r of spinning) for (let k = 0; k < 3; k++) { const c = el.cells[r][k]; c.className = 'sl-cell blur'; c.innerHTML = art(RNG.pick(blurs)); } }, 80);
    let slowFrom = null;
    try {
      for (let r = 0; r < 5; r++) {
        if (sticky && sticky[r]) continue;
        await sleep(r === 0 ? 380 : slowFrom != null && r >= slowFrom ? 900 : 170);
        spinning.splice(spinning.indexOf(r), 1);
        for (let k = 0; k < 3; k++) { setCell(el.cells[r][k], grid[r][k], mults && mults[r][k], sticky && sticky[r]); el.cells[r][k].classList.add('land'); }
        SFX.chip();
        if (slowFrom == null && r === 1) {
          const sc = [0, 1].reduce((a, q) => a + grid[q].filter(g => g === M.S).length, 0);
          const bn = grid[0].includes(M.B) && grid[1].includes(M.B);
          if (sc >= 2 || bn) { slowFrom = 2; el.msg.textContent = bn ? 'BONUS … BONUS … one more!' : '⭐ ⭐ … one more!'; }
        }
      }
    } finally { clearInterval(tick); }
  }
  function highlight(grid, ev) {
    for (const w of ev.wins) for (let r = 0; r < w.len; r++) for (let k = 0; k < 3; k++) if (grid[r][k] === w.s || grid[r][k] === M.W) el.cells[r][k].classList.add('hit');
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) {
      if (grid[r][k] === M.S && ev.sc >= 3) el.cells[r][k].classList.add('hit');
      if (grid[r][k] === M.B && ev.bonus && r < 3) el.cells[r][k].classList.add('hit');
    }
  }
  function banner(text, cls = '', ms = 1600) {
    el.banner.className = 'sl-banner show ' + cls; el.banner.textContent = text;
    clearTimeout(banner._t); banner._t = setTimeout(() => el && (el.banner.className = 'sl-banner'), ms * Math.max(.6, App.speedFactor()));
  }
  async function countUp(amount, B) {
    const tier = amount >= 100 * B ? ['EPIC WIN', 'epic'] : amount >= 50 * B ? ['MEGA WIN', 'mega'] : amount >= 15 * B ? ['BIG WIN', 'big'] : null;
    if (tier) { banner(`${tier[0]}! ${money(amount)}`, tier[1], 2600); SFX.big(); }
    const steps = tier ? 24 : 8;
    for (let i = 1; i <= steps; i++) { el.msg.textContent = `WIN ${money(amount * i / steps)}`; await sleep(tier ? 60 : 30); }
  }
  async function spin() {
    if (busy || !el) return;
    const B = bet(), why = Career.canPlay();
    if (why) { auto = 0; renderAuto(); return UI.toast(why, 'warn'); }
    if (!App.debit(B)) { auto = 0; renderAuto(); return UI.toast('Not enough bankroll for that bet', 'warn'); }
    busy = true; el.spin.disabled = true; el.back.disabled = true; el.gamble.hidden = true; gambleWin = 0;
    const s = st(); s.spins++; s.wagered += B; App.count('slotSpins');
    let paid = 0, feature = false;
    try {
      const b = mach.spinBase(Math.random);
      el.msg.textContent = '';
      if (b.lucky) { banner('🍀 SAL\'S LUCKY 17!', 'lucky'); await sleep(700); }
      await animate(b.grid);
      const win = b.ev.total * B;
      highlight(b.grid, b.ev);
      if (win > 0) { App.credit(win); paid += win; await countUp(win, B); }
      if (b.ev.sc >= 3) { feature = true; paid += await freeSpins(mach.cfg.fs.award[Math.min(5, b.ev.sc)], B); }
      if (mach.cfg.hs && b.ev.orbs >= 6) { feature = true; paid += await holdSpin(b.grid, B); }
      if (b.ev.bonus) { feature = true; paid += await bonusGame(B); }
      // mystery jackpots
      for (const hit of feed(V, B)) {
        feature = true; paid += hit.amt; App.credit(hit.amt);
        s.mystery[hit.t.key] = (s.mystery[hit.t.key] || 0) + 1; App.count('slotMystery_' + hit.t.key);
        banner(`${hit.t.icon} ${hit.t.name.toUpperCase()} MYSTERY JACKPOT! ${money(hit.amt)}`, 'jackpot', 3200); SFX.big();
        App.news(`🎰 ${App.state.name} hit the ${hit.t.name} mystery jackpot on ${SLOT_MACHINES[V].name} for ${fmt(hit.amt)}!`);
        Quests.bump('slots2'); if (hit.t.key === 'gold' || hit.t.key === 'diamond') Quests.bump('slots4');
        await sleep(1800);
      }
      renderMeters();
      s.won += paid; if (paid / B > s.best) s.best = Math.round(paid / B);
      if (paid >= 100 * B) App.count('slotEpic');
      if (paid > 0 && !feature && paid <= 50 * B) { gambleWin = paid; el.gamble.hidden = false; }
      if (paid > 0 && !feature) el.msg.textContent = `WIN ${money(paid)}`;
      if (!paid) el.msg.textContent = RNG.pick(['So close.', 'Spin again?', '', 'Next one\'s the one.', '']);
      App.state.stats.biggestWin = Math.max(App.state.stats.biggestWin || 0, paid - B);
    } finally {
      Quests.bump('slots1'); Career.drain('round', .12);
      Career.checkAchievements(); App.save(); Router.hud();
      busy = false; if (el) { el.spin.disabled = false; el.back.disabled = false; }
    }
    if (feature && auto) { auto = 0; renderAuto(); }
    if (auto > 0 && el) { await sleep(350); if (auto > 0 && el && Router.screen === 'slots') { auto--; renderAuto(); spin(); } }
  }

  /* ---------- free spins: ×2/×3 wilds, a multiplier trail, or sticky expanding wilds ---------- */
  async function freeSpins(n, B) {
    const s = st(), type = mach.cfg.fs.type, retrig = mach.cfg.fs.award[3]; s.fs++; App.count('slotFS');
    banner(`⭐ ${n} FREE SPINS! ⭐`, 'fs', 2200); SFX.big(); await sleep(2000);
    const intro = { trail: 'Every winning spin raises the multiplier, up to ×' + (mach.cfg.fs.cap || 10) + '.', sticky: 'A wild on reels 2 to 4 fills its reel and stays there for every spin that follows.', mult: 'Every wild is ×2 or ×3, and they multiply together.' }[type];
    el.msg.textContent = intro; await sleep(1400);
    // resolve every free spin up front and bank the result, so closing the app mid-feature can't lose it
    const fs = mach.freshFS(), plays = []; let owed = 0;
    for (let k = n; k > 0 && plays.length < 300; k--) {
      const before = { ...fs.sticky }, f = mach.spinFree(Math.random, fs);
      f.stickyBefore = before; f.stickyAfter = { ...fs.sticky }; plays.push(f); owed += f.ev.total * B;
      if (f.ev.sc >= 3) k += retrig;
    }
    owed = Math.min(owed, M.CAP * B); App.credit(owed); App.save(); Router.hud();
    let total = 0, i = 0;
    for (const f of plays) {
      i++; n--;
      const tag = type === 'trail' ? ` · ×${f.ev.mult}` : '';
      el.msg.textContent = `FREE SPIN ${i} · ${Math.max(0, n)} left${tag} · won ${money(total)}`;
      await animate(f.grid, f.mults, type === 'sticky' ? f.stickyBefore : null);
      if (type === 'sticky') {
        const fresh = [1, 2, 3].filter(r => f.stickyAfter[r] && !f.stickyBefore[r]);
        if (fresh.length) { for (const r of fresh) for (let k = 0; k < 3; k++) { setCell(el.cells[r][k], M.W, 1, true); el.cells[r][k].classList.add('land'); } banner('WILD REEL LOCKED!', 'fs', 1200); await sleep(700); }
      }
      highlight(f.grid, f.ev);
      const w = f.ev.total * B;
      if (w > 0) { total += w; el.msg.textContent = `FREE SPIN ${i}${type === 'trail' ? ` · ×${f.ev.mult}` : ''} · +${money(w)} · total ${money(total)}`; await sleep(500); }
      if (f.ev.sc >= 3) { n += retrig; banner(`⭐ +${retrig} FREE SPINS! ⭐`, 'fs', 1800); await sleep(1500); }
      await sleep(350);
    }
    total = owed;
    await countUp(total, B);
    banner(`Free spins paid ${money(total)}`, 'fs', 2200);
    await sleep(900);
    return total;
  }
  async function holdSpin(grid, B) {
    const s = st(); s.hs++; App.count('slotHS');
    const name = V === 'palace' ? 'DRAGON PEARLS' : 'GOLD RUSH';
    banner(`${name}: HOLD & SPIN!`, 'hs', 2000); SFX.big(); await sleep(1800);
    const res = mach.holdAndSpin(Math.random, grid);
    App.credit(res.total * B); App.save(); Router.hud(); // banked before the show
    // replay: start with the triggering orbs, then each respin round
    const shown = grid.map(col => col.map(g => g === M.O));
    const paint = () => { for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) { const c = el.cells[r][k], v = res.cells[r][k]; c.className = 'sl-cell ' + (shown[r][k] ? 'orb' : 'empty'); c.innerHTML = shown[r][k] ? art(M.O) : ''; if (shown[r][k]) c.append(h('b.ov' + (typeof v === 'string' ? '.jpv' : ''), typeof v === 'string' ? v : money(v * B))); } };
    paint();
    let left = 3;
    for (const add of res.rounds) {
      el.msg.textContent = `${name} · respins left: ${left}`;
      await sleep(650);
      for (const [r, k] of add) { shown[r][k] = true; }
      paint(); for (const [r, k] of add) el.cells[r][k].classList.add('land');
      if (add.length) { SFX.chip(); left = 3; } else left--;
      el.msg.textContent = `${name} · respins left: ${left}`;
    }
    if (res.full) { s.grand++; App.count('slotGrand'); banner(`👑 GRAND JACKPOT! ${money(M.JP.GRAND * B)}`, 'jackpot', 3500); SFX.big(); await sleep(2500); Quests.bump('slots4'); }
    const total = res.total * B;
    await countUp(total, B);
    await sleep(900);
    return total;
  }

  /* ---------- bonus games: each outcome is decided when it triggers, and banked before the show ---------- */
  const tap = () => new Promise(res => { el._tap = res; });
  function overlay(title, sub, body) {
    el.over.innerHTML = ''; el.over.className = 'sl-over show';
    el.over.append(h('div.sl-over-h', h('b', title), h('small', sub)), body);
  }
  const closeOverlay = () => { if (el) el.over.className = 'sl-over'; };
  async function bonusGame(B) {
    const s = st(); s.bonus = (s.bonus || 0) + 1; App.count('slotBonus');
    const type = mach.cfg.bonus;
    banner({ pick: 'WANTED! POSTER BONUS', wheel: 'SPIN THE PADDLEWHEEL!', vault: 'CRACK THE VAULT!' }[type], 'jackpot', 2000); SFX.big(); await sleep(1800);
    if (type === 'pick') return pickBonus(B);
    if (type === 'wheel') return wheelBonus(B);
    return vaultBonus(B);
  }
  // twelve wanted posters: cash adds up until you turn over a COLLECT
  async function pickBonus(B) {
    const tiles = mach.pickBoard(Math.random), order = tiles.map((_, i) => i).sort(() => Math.random() - .5);
    const seq = order.map(i => tiles[i]), win = mach.pickValue(tiles, order) * B;
    App.credit(win); App.save(); Router.hud();
    let total = 0, n = 0, done = false;
    const grid = h('div.sl-picks');
    const cards = Array.from({ length: 12 }, (_, i) => h('button.sl-pick', { onclick: () => { if (!done && !cards[i].classList.contains('open') && el._tap) el._tap(i); } }, h('span.sl-pick-b', h('span', { html: art(M.B) }))));
    cards.forEach(c => grid.append(c));
    const status = h('div.sl-over-s', 'Pick a poster. Keep picking until you find a COLLECT.');
    overlay('WANTED: DEAD OR ALIVE', 'Every poster hides a bounty, three hide COLLECT', h('div', grid, status));
    while (!done) {
      const i = await tap(), v = seq[n++];
      cards[i].classList.add('open');
      cards[i].innerHTML = '';
      if (v === 'COLLECT') { cards[i].append(h('b.collect', 'COLLECT')); done = true; SFX.chip(); }
      else { total += v * B; cards[i].append(h('b', money(v * B))); SFX.win(); status.textContent = `Bounties so far: ${money(total)}. Pick again!`; }
    }
    // show what the other posters were hiding
    let rest = seq.slice(n); cards.forEach(c => { if (!c.classList.contains('open')) { const v = rest.shift(); c.classList.add('open', 'dim'); c.innerHTML = ''; c.append(h(v === 'COLLECT' ? 'b.collect' : 'b', v === 'COLLECT' ? 'COLLECT' : money(v * B))); } });
    status.textContent = `The sheriff pays ${money(win)}!`;
    await sleep(1800); closeOverlay();
    await countUp(win, B);
    return win;
  }
  // the Paddlewheel: wedges sized by how often they land
  async function wheelBonus(B) {
    const W = M.WHEEL, idx = mach.wheelSpin(Math.random), [val] = W[idx];
    const cash = val === 'FS' ? 0 : mach.wheelPays(val) * B;
    if (cash) { App.credit(cash); App.save(); Router.hud(); }
    const tot = W.reduce((a, [, w]) => a + w, 0);
    let a0 = 0; const wedges = W.map(([v, w], i) => { const a = a0, span = w / tot * 360; a0 += span; return { v, a, span, i }; });
    const col = (v, i) => v === 'GRAND' ? '#ffd34d' : v === 'MAJOR' ? '#ff8af0' : v === 'FS' ? '#7c4dff' : ['#c62828', '#1565c0', '#2e7d32', '#ef6c00'][i % 4];
    const P = (a, r) => [50 + r * Math.sin(a * Math.PI / 180), 50 - r * Math.cos(a * Math.PI / 180)];
    const svg = `<svg viewBox="0 0 100 100" class="sl-wheel-svg">${wedges.map(w => { const [x1, y1] = P(w.a, 48), [x2, y2] = P(w.a + w.span, 48), [tx, ty] = P(w.a + w.span / 2, 31); return `<path d="M50 50 L${x1} ${y1} A48 48 0 ${w.span > 180 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${col(w.v, w.i)}" stroke="#fff3c4" stroke-width=".6"/><text x="${tx}" y="${ty}" font-size="${w.span < 6 ? 3 : w.span < 12 ? 3.8 : 4.6}" font-weight="900" fill="${w.v === 'GRAND' || w.v === 'MAJOR' ? '#3a1d00' : '#fff'}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${w.a + w.span / 2 - 90} ${tx} ${ty})">${w.v === 'FS' ? '8 FREE SPINS' : typeof w.v === 'number' ? w.v + '×' : w.v}</text>`; }).join('')}<circle cx="50" cy="50" r="7" fill="#ffd34d" stroke="#7a4f06" stroke-width="1.5"/></svg>`;
    const wheel = h('div.sl-wheel', { html: svg }), btn = h('button.btn.primary', 'SPIN THE WHEEL');
    overlay('THE PADDLEWHEEL', 'Wedges are sized by how often they land', h('div.sl-wheel-wrap', h('div.sl-wheel-ptr'), wheel, h('div.sl-over-s', btn)));
    await new Promise(res => { btn.onclick = res; });
    btn.disabled = true;
    const target = wedges[idx], land = target.a + target.span * (.2 + Math.random() * .6);
    const turns = 360 * 5 + (360 - land);
    wheel.style.transition = `transform ${3.6 * Math.max(.5, App.speedFactor())}s cubic-bezier(.12,.7,.2,1)`;
    requestAnimationFrame(() => { wheel.style.transform = `rotate(${turns}deg)`; });
    await new Promise(r => setTimeout(r, 3900 * Math.max(.5, App.speedFactor()))); // the wheel's own transition time
    SFX.big();
    btn.textContent = val === 'FS' ? '8 FREE SPINS!' : `${typeof val === 'number' ? val + '×' : val}: ${money(cash)}`;
    await sleep(1600); closeOverlay();
    if (val === 'FS') return freeSpins(8, B);
    await countUp(cash, B);
    return cash;
  }
  // Crack the Vault: open safes until three match
  async function vaultBonus(B) {
    const run = mach.vaultRun(Math.random), win = run.pays * B;
    App.credit(win); App.save(); Router.hud();
    const pays = M.VAULT_PAY, found = { MINI: 0, MINOR: 0, MAJOR: 0, GRAND: 0 };
    const tally = h('div.sl-tally'), status = h('div.sl-over-s', 'Open safes. Match three jackpots to win that jackpot.');
    const drawTally = () => { tally.innerHTML = ''; for (const t of ['GRAND', 'MAJOR', 'MINOR', 'MINI']) tally.append(h('div.sl-t.' + t.toLowerCase(), h('b', t), h('span', money(pays[t] * B)), h('i', '●'.repeat(found[t]) + '○'.repeat(3 - found[t])))); };
    drawTally();
    const grid = h('div.sl-picks.safes'); let n = 0, done = false;
    const cards = Array.from({ length: 12 }, (_, i) => h('button.sl-pick', { onclick: () => { if (!done && !cards[i].classList.contains('open') && el._tap) el._tap(i); } }, h('span.sl-pick-b', h('span', { html: art(M.B) }))));
    cards.forEach(c => grid.append(c));
    overlay('CRACK THE VAULT', 'Kessler keeps his jackpots in twelve safes', h('div', tally, grid, status));
    while (!done) {
      const i = await tap(), v = run.seq[n++];
      cards[i].classList.add('open', 'jp-' + v.toLowerCase()); cards[i].innerHTML = ''; cards[i].append(h('b', v));
      found[v]++; drawTally(); SFX.chip();
      if (found[v] >= 3) done = true;
    }
    status.textContent = `${run.win}! The vault pays ${money(win)}.`;
    if (run.win === 'GRAND') App.count('slotVaultGrand');
    await sleep(2000); closeOverlay();
    await countUp(win, B);
    return win;
  }

  /* ---------- autoplay, gamble, paytable ---------- */
  function renderAuto() { if (el) el.auto.textContent = auto > 0 ? `Stop (${auto})` : 'Auto'; }
  async function toggleAuto() {
    if (auto > 0) { auto = 0; renderAuto(); return; }
    const n = await UI.modal({ title: '🔁 Autoplay', body: h('p.muted', 'Stops on any feature, bonus, mystery jackpot, or when you run short.'), buttons: [10, 25, 50, 100].map(v => ({ label: `${v} spins`, value: v })) });
    if (!n) return;
    auto = n - 1; renderAuto(); spin();
  }
  async function gamble() {
    if (busy || !gambleWin) return;
    let amount = gambleWin; gambleWin = 0; el.gamble.hidden = true;
    for (let round = 0; round < 5; round++) {
      const choice = await UI.modal({ title: '🃏 Double or nothing', body: h('div', h('p', `Stake: ${money(amount)}. Guess the colour of the next card: right doubles it, wrong loses it.`), h('p.muted.small', 'A fair 50/50: this doesn\'t change the machine\'s return.')),
        buttons: [{ label: `Collect ${money(amount)}`, value: 'take', cls: 'ghost' }, { label: '♥ Red', value: 'red' }, { label: '♠ Black', value: 'black', cls: 'primary' }] });
      if (choice !== 'red' && choice !== 'black') break;
      if (!App.debit(amount)) break;
      const red = Math.random() < .5, card = (red ? ['♥', '♦'] : ['♠', '♣'])[RNG.int(2)];
      if ((choice === 'red') === red) { st().won += amount; amount *= 2; App.credit(amount); UI.toast(`${card} ${red ? 'Red' : 'Black'}! Now ${money(amount)}`, 'good'); SFX.chip(); }
      else { st().won -= amount; UI.toast(`${card} ${red ? 'Red' : 'Black'}. Gone.`, 'warn'); amount = 0; break; }
    }
    if (el) el.msg.textContent = amount ? `COLLECTED ${money(amount)}` : 'Lost the gamble.';
    App.save(); Router.hud();
  }
  function paytable() {
    const B = bet(), m = SLOT_MACHINES[V], c = mach.cfg, icon = g => h('span.pt-sym', { html: art(g) });
    const row = g => h('tr', h('td', icon(g)), ...mach.PAY[g].map(p => h('td.num', money(p * B))));
    const fsText = {
      mult: `In free spins the reels carry extra wilds, every wild is ×2 or ×3 (multiplying together across a way)`,
      trail: `In free spins a multiplier starts at ×1 and grows by one after every winning spin, up to ×${c.fs.cap || 10}`,
      sticky: `In free spins any wild landing on reels 2 to 4 expands to fill its reel and stays locked there for the rest of the feature`,
    }[c.fs.type];
    const parts = [
      h('p', '243 ways: symbols pay left to right on adjacent reels, in any row. Each way pays the amount below; more matching symbols on a reel multiply the ways.'),
      h('table.paytable', h('tr', h('th'), h('th', '3'), h('th', '4'), h('th', '5')), M.PAYING.map(row)),
      h('p', icon(M.W), ' WILD (reels 2 to 4) substitutes for every symbol except scatters, coins and bonus symbols.'),
      h('p', icon(M.S), ` 3, 4 or 5 scatters anywhere pay ${money(B)}, ${money(5 * B)} or ${money(25 * B)} and award ${c.fs.award[3]}, ${c.fs.award[4]} or ${c.fs.award[5]} FREE SPINS. ${fsText}. Three more scatters add ${c.fs.award[3]} spins.`),
    ];
    if (c.hs) parts.push(h('p', icon(M.O), ` 6 or more ${V === 'palace' ? 'dragon pearls' : 'gold coins'} start HOLD & SPIN: they lock in place with cash values, and you get 3 respins, reset whenever a new one lands. They can carry the MINI (${money(20 * B)}), MINOR (${money(50 * B)}) or MAJOR (${money(250 * B)}); fill all 15 spots for the GRAND (${money(1000 * B)}).`));
    if (c.bonus === 'pick') parts.push(h('p', icon(M.B), ' A WANTED poster on each of reels 1, 2 and 3 starts the POSTER BONUS: pick from twelve posters, each a bounty, until you turn over one of three COLLECTs.'));
    if (c.bonus === 'wheel') parts.push(h('p', icon(M.B), ` A PADDLEWHEEL on each of reels 1, 2 and 3 spins the wheel: 15× to 250× your bet, 8 free spins, the MAJOR (${money(250 * B)}) or the GRAND (${money(1000 * B)}). Wedges are sized by how often they land.`));
    if (c.bonus === 'vault') parts.push(h('p', icon(M.B), ` A SAFE on each of reels 1, 2 and 3 starts CRACK THE VAULT: open safes until three jackpots match. MINI ${money(15 * B)}, MINOR ${money(40 * B)}, MAJOR ${money(150 * B)}, GRAND ${money(1000 * B)}.`));
    parts.push(h('p', '🍀 SAL\'S LUCKY 17: at random, one or two middle reels turn completely wild before they land.'),
      h('p', '🃏 After an ordinary win (up to 50× your bet) you can gamble it on red or black, up to five times.'),
      h('p', `Mystery jackpots (Copper, Silver, Gold, Diamond) build with every spin by everyone in ${VENUES[V].name}, and each one MUST hit before it reaches its cap. Whoever's spin crosses the hidden trigger wins it, whatever their bet.`),
      h('p.muted.small', `Return: ${(rtpOf(V) * 100).toFixed(1)}% from the reels and features (millions of simulated spins), plus about 2.6% from the mystery jackpots on average: roughly 100% overall, and more when a meter is close to its cap. Maximum win ${M.CAP.toLocaleString()}× bet per spin.`));
    UI.modal({ title: `🎰 ${m.name} · paytable at ${money(B)}`, wide: true, body: h('div.sl-pay', ...parts) });
  }
  document.addEventListener('keydown', e => {
    if (Router.screen !== 'slots' || !el || document.querySelector('.modal-bg') || e.target.tagName === 'INPUT') return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (el.over.classList.contains('show')) { // in a pick bonus, Space opens the next unopened tile
        const next = el.over.querySelector('.sl-pick:not(.open)'); if (next) next.click();
        const wb = el.over.querySelector('.sl-wheel-wrap .btn:not([disabled])'); if (wb) wb.click();
        return;
      }
      spin();
    }
  });
  function unmount() { auto = 0; el = null; }
  return { screen, dailyGrowth, meters, heat, busy: () => busy, unmount, MACHINES: SLOT_MACHINES, st, _el: () => el };
})();
