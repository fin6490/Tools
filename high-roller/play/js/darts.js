/* Darts at the Rusty Spur: a regulation board, x01 double-out and Around the Clock, money matches
   with the regulars, and Mick Doyle's side quests ending in the Golden Arrow knockout.
   Coordinates are millimetres from the bullseye, y pointing down. */
const Darts = (() => {
  /* ---------- the board ---------- */
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const R = { bull: 6.35, outer: 15.9, tIn: 99, tOut: 107, dIn: 162, dOut: 170, numbers: 192, back: 226 };
  const segAngle = i => (i * 18) * Math.PI / 180; // centre of segment i, clockwise from the top

  function score(x, y) {
    const r = Math.hypot(x, y);
    if (r <= R.bull) return { v: 50, n: 25, mult: 2, label: 'BULL', dbl: true };
    if (r <= R.outer) return { v: 25, n: 25, mult: 1, label: '25' };
    if (r > R.dOut) return { v: 0, n: 0, mult: 0, label: 'Miss' };
    const deg = (Math.atan2(x, -y) * 180 / Math.PI + 360 + 9) % 360;
    const n = ORDER[Math.floor(deg / 18) % 20];
    if (r >= R.dIn) return { v: n * 2, n, mult: 2, label: 'D' + n, dbl: true };
    if (r >= R.tIn && r <= R.tOut) return { v: n * 3, n, mult: 3, label: 'T' + n };
    return { v: n, n, mult: 1, label: String(n) };
  }
  // where to aim for a named bed: T20, D16, S5 (fat outer single), 25, BULL
  function spot(name) {
    if (name === 'BULL' || name === '25') return { x: 0, y: 0 };
    const kind = name[0], n = +name.slice(1), i = ORDER.indexOf(n), a = segAngle(i);
    const r = kind === 'T' ? (R.tIn + R.tOut) / 2 : kind === 'D' ? (R.dIn + R.dOut) / 2 : (R.tOut + R.dIn) / 2;
    return { x: Math.sin(a) * r, y: -Math.cos(a) * r };
  }
  const value = name => name === 'BULL' ? 50 : name === '25' ? 25 : (+name.slice(1)) * ({ T: 3, D: 2, S: 1 }[name[0]]);

  /* ---------- checkout chart, built once ---------- */
  // favourite doubles first: the ones a missed dart still leaves a double after
  const DPREF = [20, 16, 8, 18, 12, 10, 4, 2, 6, 14, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
  const FINISH = DPREF.map(n => 'D' + n).concat(['BULL']);
  const ALL = [];
  for (let n = 20; n >= 1; n--) ALL.push('T' + n);
  ALL.push('BULL', '25');
  for (let n = 20; n >= 1; n--) ALL.push('S' + n);
  for (let n = 20; n >= 1; n--) ALL.push('D' + n);
  const cost = t => t[0] === 'S' ? 1 + (+t.slice(1) < 5 ? .5 : 0) : t === '25' ? 3 : t[0] === 'T' ? 1.6 + (20 - +t.slice(1)) * .02 : t === 'BULL' ? 4 : 3;
  const finCost = t => t === 'BULL' ? 9 : FINISH.indexOf(t) * .35;
  const CHART = [null, {}, {}, {}]; // CHART[darts][remaining] = [targets]
  (function build() {
    for (const f of FINISH) CHART[1][value(f)] = { path: [f], c: finCost(f) };
    for (let d = 2; d <= 3; d++) {
      for (const k in CHART[d - 1]) CHART[d][k] = CHART[d - 1][k];
      for (const a of ALL) for (const k in CHART[d - 1]) {
        const rem = +k + value(a), prev = CHART[d - 1][k], c = cost(a) + prev.c + 2;
        if (rem > 170) continue;
        if (!CHART[d][rem] || CHART[d][rem].c > c) CHART[d][rem] = { path: [a].concat(prev.path), c };
      }
    }
  })();
  const checkout = (rem, darts) => (CHART[Math.min(3, darts)] || {})[rem] ? CHART[Math.min(3, darts)][rem].path : null;
  // no finish on: score heavily but leave something that's on next visit
  function setup(rem, darts) {
    const co = checkout(rem, darts); if (co) return co[0];
    if (rem > 100) { const bad = [159, 162, 163, 165, 166, 168, 169]; return bad.includes(rem - 60) && rem - 57 >= 2 ? 'T19' : 'T20'; }
    // leave the best double we can with a single
    let best = null;
    for (let n = 20; n >= 1; n--) {
      for (const t of ['S' + n, 'T' + n]) {
        const left = rem - value(t);
        if (left < 2) continue;
        const sc = left <= 40 && left % 2 === 0 ? 10 - DPREF.indexOf(left / 2) * .4 : checkout(left, 3) ? 3 - left / 100 : -left / 50;
        if (!best || sc > best.sc) best = { t, sc };
      }
    }
    return best ? best.t : 'S1';
  }

  /* ---------- throwing ---------- */
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function aiThrow(target, sigma) { const p = spot(target); return { x: p.x + gauss() * sigma, y: p.y + gauss() * sigma }; }
  // the player's wobble: smooth, so a steady hand can time the release
  function sway(t, amp, seed) {
    return {
      x: amp * (.62 * Math.sin(t * 1.9 + seed) + .38 * Math.sin(t * 3.3 + seed * 2.1)),
      y: amp * (.62 * Math.sin(t * 1.5 + seed * 1.7 + 1) + .38 * Math.sin(t * 2.9 + seed * .6)),
    };
  }

  /* ---------- people ---------- */
  // sigma: millimetres of scatter. ~8 is a TV pro, ~14 a strong league player, 25+ a barfly
  const OPPONENTS = {
    benny: { name: 'Benny the Barfly', face: '🍺', sigma: 27, stake: 50, start: 301, legs: 1, line: 'Fifty bucks says I hit the board. Most of the time.' },
    sheila: { name: 'Shotgun Sheila', face: '🤠', sigma: 19, stake: 250, start: 301, legs: 2, line: 'Best of three, sweetheart. I throw fast and I don\'t miss twice.' },
    prof: { name: 'The Professor', face: '🧐', sigma: 14, stake: 1000, start: 501, legs: 1, line: 'One leg of 501. I have calculated my odds and I do not like yours.' },
    mick: { name: 'Mick "The Arrow" Doyle', face: '🎯', sigma: 9.5, stake: 5000, start: 501, legs: 2, line: 'Best of three, for real money this time. Don\'t cry when I check out on the bull.' },
  };
  const RIVAL_SIGMA = { tex: 17, mei: 12.5, baron: 21, rico: 15 };
  const BRACKET_NAMES = [['Dutch Joost', '🇳🇱', 11], ['Big Lou Harkin', '🐻', 18], ['Shotgun Sheila', '🤠', 19], ['The Professor', '🧐', 14], ['Fat Freddie', '🍔', 22], ['Lady Bullseye', '💃', 13], ['Kid Flint', '🧢', 16]];
  const st = () => {
    const s = App.state;
    if (!s.darts) s.darts = { xp: 0, legs: 0, legsWon: 0, matches: 0, wins: 0, best: 0, hiOut: 0, t80: 0, atcBest: 0, darts: 0, scored: 0 };
    return s.darts;
  };
  // your steadiness: practice, Sal's darts and sleep all help
  function wobble() {
    const s = App.state, d = st();
    let a = 30 * (1 - Math.min(.35, d.xp / 2500 * .35));
    if (App.has('salDarts')) a *= .78;
    if (App.has('flights')) a *= .9;
    if (s.mode === 'career') { const e = s.stamina / (s.staminaMax || 100); if (e < .5) a *= 1 + (.5 - e) * 1.2; }
    return a * Mood.wobbleMult();
  }
  const armLabel = a => a < 15 ? 'Tour pro' : a < 18 ? 'County player' : a < 22 ? 'League regular' : a < 27 ? 'Pub thrower' : 'Wobbly';
  const noise = a => 5 + a * .2; // release error on top of the wobble you time

  /* ---------- a match ---------- */
  let M = null, el = null;
  const I = { aim: { x: 0, y: -103 }, waiting: false, resolve: null, seed: 0, t0: 0, touching: false };
  const active = () => !!(M && !M.over);

  function makePlayer(o) { return { name: o.name, face: o.face, me: !!o.me, sigma: o.sigma, rem: 0, legs: 0, thrown: 0, scored: 0, last: '', target: 1, rival: o.rival || null }; }

  // opts: { mode: 'x01'|'atc', start, legs, opp: {name, face, sigma, rival}, stake, title, quest, tournament, bullUp }
  function match(opts) {
    return new Promise(resolve => {
      const me = makePlayer({ name: App.state.name, face: '🙂', me: true });
      M = { ...opts, players: opts.mode === 'atc' ? [me] : [me, makePlayer(opts.opp)], turn: 0, legStarter: 0, stuck: [], log: [], over: false, resolve, call: '', aimText: '', visit: [] };
      if (opts.stake) { App.debit(opts.stake); if (opts.opp.rival) App.state.rivals[opts.opp.rival].bank -= opts.stake; }
      Router.go('darts');
    });
  }

  function screen(main) {
    if (!M) { Router.go('world'); return; }
    el = {};
    const wrap = h('div.dt',
      h('div.table-top',
        h('button.btn.ghost.sm', { onclick: concede }, M.mode === 'atc' ? '← Done' : '🏳️ Concede'),
        h('div.tt-title', M.title),
        M.mode === 'atc' ? null : h('button.btn.ghost.sm', { onclick: () => { if (M && !M.over) Chat.open(Crowd.dartsOpp(M.players[1], M)); } }, '💬 Talk')),
      el.score = h('div.dt-score'),
      h('div.dt-main',
        el.wrap = h('div.dt-boardwrap', el.cv = h('canvas.dt-board'), el.call = h('div.dt-call')),
        h('div.dt-side',
          el.visit = h('div.dt-visit'),
          el.hint = h('div.dt-hint'),
          el.aims = h('div.dt-aims'),
          el.throwBtn = h('button.btn.primary.dt-throw', { onclick: e => { e.currentTarget.blur(); release(); } }, '🎯 Throw', h('kbd', 'Space')),
          h('p.muted.small.dt-help', 'Two taps per dart: first stop the sweeping pointer on the number you want, then stop the marker as it runs in to the bull and back out. The outer thin ring is the double, the inner thin ring the treble. Tap the board, press Space, or use the button.'),
          el.arm = h('p.muted.small'),
          el.log = h('div.dt-log'))));
    main.append(wrap);
    bindInput();
    renderScore(); renderSide(); renderLog();
    requestAnimationFrame(frame);
    if (!M.started) { M.started = true; run(); }
  }

  /* ---------- the game loop ---------- */
  async function run() {
    try {
      if (M.mode === 'atc') await runATC();
      else await runX01();
    } catch (e) { if (e !== 'concede') throw e; }
    if (!M) return; // finished normally
    if (M.conceded && M.mode !== 'atc') await finish(false);
    else if (M.mode === 'atc' && !M.over) { M.over = true; const res = M.resolve; M = null; res({ won: false }); Router.go('world'); }
  }
  const stop = () => { if (M.conceded) throw 'concede'; };

  async function runX01() {
    const [me, op] = M.players;
    if (M.bullUp !== false) {
      say(`Bull up: closest to the bullseye throws first.`);
      M.aimText = 'Throw one dart at the bull';
      const a = await myDart(); stop(); stick(a, true); const da = Math.hypot(a.x, a.y);
      await sleep(450);
      M.aimText = `${op.name} throws for the bull`; renderSide();
      await sleep(500); const b = aiThrow('BULL', op.sigma); stick(b, false); const db = Math.hypot(b.x, b.y);
      await sleep(700);
      M.legStarter = da <= db ? 0 : 1;
      say(M.legStarter === 0 ? 'You win the bull and throw first.' : `${op.name} wins the bull and throws first.`);
      call(M.legStarter === 0 ? 'You throw first' : `${op.name} throws first`);
      await sleep(900); M.stuck = []; M.aimText = '';
    }
    for (;;) {
      for (const p of M.players) { p.rem = M.start; p.last = ''; }
      M.turn = M.legStarter; M.legNo = (M.legNo || 0) + 1;
      say(`Leg ${M.legNo}: ${M.start}, double out. ${M.players[M.turn].name} to throw.`);
      renderScore();
      let winner = null;
      while (!winner) {
        const p = M.players[M.turn];
        const out = await visit(p); stop();
        if (out === 'win') winner = p;
        else M.turn = 1 - M.turn;
        renderScore();
      }
      winner.legs++; st().legs++;
      renderScore();
      if (winner.legs >= M.legs) { await sleep(900); await finish(winner.me); return; }
      call(winner.me ? 'Game shot! You take the leg' : `Game shot: ${winner.name} takes the leg`);
      await sleep(1600);
      M.legStarter = 1 - M.legStarter;
    }
  }

  // one visit of up to three darts; returns 'win' when the leg is checked out
  async function visit(p) {
    const start = p.rem; M.visit = []; M.stuck = []; renderSide();
    if (!p.me) { M.aimText = `${p.name} steps up`; renderSide(); await sleep(600); stop(); }
    let result = 'ok';
    for (let k = 0; k < 3; k++) {
      const target = setup(p.rem, 3 - k);
      let pos;
      if (p.me) { M.aimText = ''; pos = await myDart(); stop(); }
      else { M.aimText = `${p.name} aims at ${bedName(target)}`; renderSide(); await sleep(520); stop(); pos = aiThrow(target, p.sigma); }
      stick(pos, p.me);
      const sc = score(pos.x, pos.y); p.thrown++; if (p.me) { st().xp++; st().darts++; }
      M.visit.push(sc);
      const left = p.rem - sc.v;
      if (left < 0 || left === 1 || (left === 0 && !sc.dbl)) { result = 'bust'; break; }
      p.rem = left; renderScore(); renderSide();
      if (left === 0) { result = 'win'; break; }
      if (!p.me) await sleep(380);
    }
    const total = M.visit.reduce((a, d) => a + d.v, 0);
    if (result === 'bust') { p.rem = start; p.last = 'Bust'; call('No score! (bust)'); say(`${p.name}: bust on ${start}.`); }
    else {
      p.scored += total; p.last = String(total);
      if (p.me) st().scored += total;
      if (total === 180) { call('ONE HUNDRED AND EIGHTYYY!'); SFX.big(); if (p.me) { st().t80++; App.count('dart180'); } }
      else if (total >= 100 && result !== 'win') call(total >= 140 ? `Ton-${total - 100}!` : total === 100 ? 'Ton!' : `Ton-${total - 100}`);
      if (result === 'win') {
        const lastDart = M.visit[M.visit.length - 1];
        say(`${p.name} checks out ${start} on ${lastDart.label === 'BULL' ? 'the bull' : lastDart.label}!`);
        if (p.me) {
          st().hiOut = Math.max(st().hiOut, start);
          if (lastDart.label === 'BULL') App.count('dartBullOut');
          if (start === 170) App.count('dart170');
          if (start >= 100) App.count('dartTonOut');
          st().legsWon++;
        }
        call(start >= 100 ? `${start} checkout!` : 'Game shot!'); SFX.big();
      } else say(`${p.name}: ${total}${total ? ` (${M.visit.map(d => d.label).join(', ')})` : ''}, ${p.rem} left.`);
    }
    if (App.state.mode === 'career') Career.drain('round', .12);
    renderScore(); renderSide();
    await sleep(result === 'win' ? 700 : p.me ? 650 : 1000);
    M.stuck = []; M.visit = []; M.aimText = '';
    return result;
  }

  async function runATC() {
    const me = M.players[0]; me.target = 1;
    say('Around the Clock: hit 1 through 20 in order, then the bull. Any part of the bed counts.');
    while (me.target <= 21) {
      M.visit = []; M.stuck = [];
      for (let k = 0; k < 3 && me.target <= 21; k++) {
        const pos = await myDart(); stop(); stick(pos, true); me.thrown++; st().xp++; st().darts++;
        const sc = score(pos.x, pos.y); M.visit.push(sc);
        const want = me.target === 21 ? 25 : me.target;
        if (sc.n === want) { me.target++; SFX.chip(); }
        renderScore(); renderSide();
      }
      if (App.state.mode === 'career') Career.drain('round', .1);
      await sleep(500);
    }
    M.over = true; M.stuck = [];
    const best = st().atcBest; if (!best || me.thrown < best) st().atcBest = me.thrown;
    App.count('dartATC'); if (me.thrown <= 35) App.count('dartATCfast');
    Career.checkAchievements(); App.save();
    await UI.modal({ title: '🕐 Round the clock!', body: h('div', h('p', `All the way round in ${me.thrown} darts.`), h('p.muted', `Your best: ${st().atcBest} darts. Practice makes your arm steadier: ${armLabel(wobble())}.`)), buttons: [{ label: 'Back to the Spur', cls: 'primary' }] });
    const res = M.resolve; M = null; res({ won: true }); Router.go('world');
  }

  async function finish(won) {
    M.over = true;
    const s = App.state, d = st(), [me, op] = M.players;
    const avg = me.thrown ? me.scored / me.thrown * 3 : 0;
    d.matches++; if (won) d.wins++;
    if (avg > d.best && me.thrown >= 9) d.best = Math.round(avg * 10) / 10;
    let money = '';
    if (M.stake) {
      if (won) { App.credit(M.stake * 2); money = `You collect ${fmt(M.stake * 2)}.`; }
      else money = `${op.name} pockets your ${fmt(M.stake)}.`;
      if (op.rival) { const r = s.rivals[op.rival]; if (won) r.net -= M.stake; else { r.bank += M.stake * 2; r.net += M.stake; } }
      if (won && !M.tournament) Quests.bump('darts2');
      if (won && M.oppKey === 'mick') App.count('dartBeatMick');
      App.count('dartWagered', M.stake);
    }
    if (won) { App.count('dartWins'); if (M.quest) Quests.bump(M.quest); }
    if (!M.tournament) App.news(`🎯 Darts: ${won ? 'beat' : 'lost to'} ${op.name}${M.stake ? ` for ${fmt(M.stake)}` : ''}.`);
    Career.checkAchievements(); App.save(); Router.hud();
    const lines = [h('p', M.conceded ? `You conceded to ${op.name}.` : won ? `You beat ${op.name} ${me.legs}–${op.legs}.` : `${op.name} beats you ${op.legs}–${me.legs}.`)];
    if (money) lines.push(h('p' + (won ? '.good' : '.muted'), money));
    lines.push(h('table.paytable', h('tr', h('td'), h('th', 'You'), h('th', op.name)),
      h('tr', h('td', '3-dart average'), h('td.num', avg.toFixed(1)), h('td.num', (op.thrown ? op.scored / op.thrown * 3 : 0).toFixed(1))),
      h('tr', h('td', 'Darts thrown'), h('td.num', me.thrown), h('td.num', op.thrown))));
    if (!M.tournament) lines.push(h('p.muted.small', `Your arm: ${armLabel(wobble())}. Every dart you throw steadies it a little.`));
    if (won && M.quest === 'darts1') lines.push(h('p', '"Ha! Left hand or not, you earned that. Now: real games, real money. The regulars play for stakes; find me at the board."'));
    const tour = M.tournament;
    await UI.modal({ title: won ? '🎯 Game shot, and the match!' : '🎯 Beaten', body: h('div', ...lines), buttons: [{ label: tour ? 'Continue' : 'Back to the Spur', cls: 'primary' }] });
    const res = M.resolve; M = null; res({ won });
    if (!tour) Router.go('world');
  }

  async function concede() {
    if (!M || M.over) return;
    if (M.mode !== 'atc' && !(await UI.confirm('Concede the match?', M.stake ? `You lose your ${fmt(M.stake)} stake.` : M.tournament ? 'You\'ll be knocked out of the tournament.' : 'It counts as a loss.', 'Concede'))) return;
    M.conceded = true;
    if (I.waiting) { I.waiting = false; I.resolve({ x: 999, y: 999 }); }
  }

  /* ---------- your throws ---------- */
  // the sweeps speed up when your arm is shaky and slow down as it steadies
  const sweep = () => { const k = clamp(wobble() / 22, .6, 1.6); return { deg: 110 * k, mm: 130 * k }; };
  function myDart() {
    return new Promise(res => { I.waiting = true; I.resolve = res; I.stage = 'angle'; I.a0 = Math.random() * 360; I.t0 = performance.now(); renderSide(); });
  }
  // where the pointer is right now: angle in degrees clockwise from the top, radius in mm from the bull
  function angleNow() { return (I.a0 + sweep().deg * (performance.now() - I.t0) / 1000) % 360; }
  function radiusNow() {
    const span = R.dOut + 8, d = sweep().mm * (performance.now() - I.t0) / 1000 % (2 * span);
    return d < span ? span - d : d - span; // from the rim in to the bull, then back out
  }
  const polar = (deg, r) => ({ x: Math.sin(deg * Math.PI / 180) * r, y: -Math.cos(deg * Math.PI / 180) * r });
  function release() {
    if (!I.waiting || !M) return;
    const now = performance.now();
    if (I.stage === 'angle') {
      if (now - I.t0 < 200) return;
      I.angle = angleNow(); I.stage = 'radius'; I.t0 = now; SFX.click(); renderSide(); return;
    }
    if (now - I.t0 < 150) return;
    const r = radiusNow(), n = noise(wobble()) * .35, p = polar(I.angle, r);
    I.waiting = false; I.touching = false;
    SFX.chip();
    I.resolve({ x: p.x + gauss() * n, y: p.y + gauss() * n });
  }
  const bedName = t => t === 'BULL' ? 'the bull' : t === '25' ? 'the 25' : t[0] === 'T' ? 'treble ' + t.slice(1) : t[0] === 'D' ? 'double ' + t.slice(1) : t.slice(1);

  function bindInput() {
    // a tap or click anywhere on the board stops the sweep
    el.cv.addEventListener('pointerdown', e => { if (!I.waiting || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); release(); });
  }
  document.addEventListener('keydown', e => {
    if (Router.screen !== 'darts' || !M || !I.waiting || document.querySelector('.modal-bg')) return;
    if (e.key === ' ' || e.key === 'Enter') { release(); e.preventDefault(); }
  });

  /* ---------- drawing ---------- */
  function stick(pos, mine) { M.stuck.push({ x: pos.x, y: pos.y, mine, t0: performance.now() }); }
  let boardCache = null;
  function drawBoard(size) {
    if (boardCache && boardCache.size === size) return boardCache.cv;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d'), k = size / (2 * R.back), o = size / 2;
    c.translate(o, o);
    c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, R.back * k, 0, 7); c.fill();
    const ring = (r0, r1, col, i) => { const a0 = (i * 18 - 9 - 90) * Math.PI / 180, a1 = a0 + Math.PI / 10; c.fillStyle = col; c.beginPath(); c.arc(0, 0, r1 * k, a0, a1); c.arc(0, 0, r0 * k, a1, a0, true); c.closePath(); c.fill(); };
    for (let i = 0; i < 20; i++) {
      const even = i % 2 === 0, single = even ? '#1c1c1c' : '#efe0bf', bed = even ? '#c8102e' : '#0b7a3b';
      ring(R.tOut, R.dIn, single, i); ring(R.outer, R.tIn, single, i);
      ring(R.dIn, R.dOut, bed, i); ring(R.tIn, R.tOut, bed, i);
    }
    c.fillStyle = '#0b7a3b'; c.beginPath(); c.arc(0, 0, R.outer * k, 0, 7); c.fill();
    c.fillStyle = '#c8102e'; c.beginPath(); c.arc(0, 0, R.bull * k, 0, 7); c.fill();
    c.strokeStyle = 'rgba(205, 205, 210, .75)'; c.lineWidth = Math.max(.6, size / 600);
    for (const r of [R.bull, R.outer, R.tIn, R.tOut, R.dIn, R.dOut]) { c.beginPath(); c.arc(0, 0, r * k, 0, 7); c.stroke(); }
    for (let i = 0; i < 20; i++) { const a = (i * 18 - 9 - 90) * Math.PI / 180; c.beginPath(); c.moveTo(Math.cos(a) * R.outer * k, Math.sin(a) * R.outer * k); c.lineTo(Math.cos(a) * R.dOut * k, Math.sin(a) * R.dOut * k); c.stroke(); }
    c.fillStyle = '#f4f1e8'; c.font = `bold ${Math.round(17 * k)}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) { const a = (i * 18 - 90) * Math.PI / 180; c.fillText(ORDER[i], Math.cos(a) * 194 * k, Math.sin(a) * 194 * k); }
    boardCache = { size, cv };
    return cv;
  }
  function frame(now) {
    if (!el || !el.cv.isConnected) return;
    const cv = el.cv, css = cv.clientWidth || 360, dpr = window.devicePixelRatio || 1, size = Math.round(css * dpr);
    if (cv.width !== size) cv.width = cv.height = size;
    const c = cv.getContext('2d'), k = size / (2 * R.back), o = size / 2, X = x => o + x * k;
    c.clearRect(0, 0, size, size);
    c.drawImage(drawBoard(size), 0, 0);
    if (M) {
      for (const d of M.stuck) {
        const p = Math.min(1, (now - d.t0) / 170), x = X(d.x), y = X(d.y) + (1 - p) * 120 * dpr, s = (1 + (1 - p) * 1.4) * dpr;
        c.save(); c.translate(x, y); c.rotate(-.5);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(2 * s, 2 * s, 22 * s, 3 * s);
        c.fillStyle = '#b8b8c0'; c.fillRect(0, -1 * s, 6 * s, 2 * s);
        c.fillStyle = d.mine ? '#e9c25a' : '#5aa9e9'; c.fillRect(6 * s, -1.6 * s, 10 * s, 3.2 * s);
        c.beginPath(); c.moveTo(16 * s, 0); c.lineTo(26 * s, -6 * s); c.lineTo(26 * s, 6 * s); c.closePath(); c.fill();
        c.restore();
      }
      if (I.waiting) {
        const ang = I.stage === 'angle' ? angleNow() : I.angle, rim = polar(ang, R.back - 4), hub = polar(ang, 0);
        // the aiming line from the bull to the rim, glowing while it sweeps
        c.lineCap = 'round';
        c.strokeStyle = I.stage === 'angle' ? 'rgba(255, 233, 168, .95)' : 'rgba(255, 233, 168, .45)'; c.lineWidth = (I.stage === 'angle' ? 3.5 : 2) * dpr;
        c.shadowColor = 'rgba(255, 210, 90, .9)'; c.shadowBlur = I.stage === 'angle' ? 12 * dpr : 0;
        c.beginPath(); c.moveTo(X(hub.x), X(hub.y)); c.lineTo(X(rim.x), X(rim.y)); c.stroke(); c.shadowBlur = 0;
        // an arrowhead riding the rim
        const tip = polar(ang, R.back - 2), l = polar(ang - 4, R.back - 20), rr = polar(ang + 4, R.back - 20);
        c.fillStyle = '#ffe9a8'; c.beginPath(); c.moveTo(X(tip.x), X(tip.y)); c.lineTo(X(l.x), X(l.y)); c.lineTo(X(rr.x), X(rr.y)); c.closePath(); c.fill();
        if (I.stage === 'radius') {
          const pt = polar(ang, radiusNow()), r = 9 * dpr;
          c.lineWidth = 3.5 * dpr; c.strokeStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.arc(X(pt.x), X(pt.y), r, 0, 7); c.stroke();
          c.lineWidth = 2 * dpr; c.strokeStyle = '#fff'; c.beginPath(); c.arc(X(pt.x), X(pt.y), r, 0, 7);
          c.moveTo(X(pt.x) - r * 1.6, X(pt.y)); c.lineTo(X(pt.x) + r * 1.6, X(pt.y)); c.moveTo(X(pt.x), X(pt.y) - r * 1.6); c.lineTo(X(pt.x), X(pt.y) + r * 1.6); c.stroke();
          // name the bed under the marker so doubles and trebles are easy to read
          const sc = score(pt.x, pt.y);
          c.font = `800 ${14 * dpr}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'bottom';
          c.lineWidth = 4 * dpr; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(sc.label, X(pt.x), X(pt.y) - r * 1.8);
          c.fillStyle = sc.mult === 3 ? '#7dffae' : sc.mult === 2 ? '#ffd34d' : '#fff'; c.fillText(sc.label, X(pt.x), X(pt.y) - r * 1.8);
        }
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- panels ---------- */
  function renderScore() {
    if (!el || !M) return;
    el.score.innerHTML = '';
    for (let i = 0; i < M.players.length; i++) {
      const p = M.players[i], on = M.turn === i && !M.over;
      const avg = p.thrown ? (p.scored / p.thrown * 3).toFixed(1) : '–';
      el.score.append(h('div.dt-p' + (on ? '.on' : '') + (p.me ? '.me' : ''),
        h('div.dt-who', h('span.dt-face', Portrait.el(p)), h('b', p.me ? 'You' : p.name)),
        M.mode === 'atc'
          ? h('div.dt-rem', p.target > 21 ? '✓' : p.target === 21 ? 'Bull' : p.target, h('small', 'target'))
          : h('div.dt-rem', p.rem, h('small', 'left')),
        h('div.dt-meta', M.mode === 'atc' ? `${p.thrown} darts` : `Legs ${p.legs}/${M.legs} · avg ${avg}${p.last ? ' · last ' + p.last : ''}`)));
    }
  }
  function renderSide() {
    if (!el || !M) return;
    el.visit.innerHTML = '';
    for (let k = 0; k < 3; k++) { const d = M.visit[k]; el.visit.append(h('span.dt-dart' + (d ? '' : '.empty'), d ? d.label : '·')); }
    const tot = M.visit.reduce((a, d) => a + d.v, 0);
    el.visit.append(h('b.dt-tot', M.visit.length ? (M.mode === 'atc' ? '' : String(tot)) : ''));
    const me = M.players[0], mine = M.mode === 'atc' || M.turn === 0;
    let hint = M.aimText;
    if (!hint && mine && M.mode === 'x01' && I.waiting) {
      const left = 3 - M.visit.length, co = checkout(me.rem, left);
      hint = co ? `You require ${me.rem}: ${co.map(t => t === 'BULL' ? 'Bull' : t[0] === 'S' ? t.slice(1) : t).join(' · ')}` : me.rem <= 170 ? `${me.rem} left: no checkout with ${left} dart${left > 1 ? 's' : ''}, set one up` : `${me.rem} left: go for the big trebles`;
    }
    if (!hint && M.mode === 'atc') hint = me.target === 21 ? 'Now the bull!' : `Next: ${me.target}`;
    el.hint.textContent = hint || '';
    el.aims.textContent = !I.waiting ? '' : I.stage === 'angle' ? '① Tap to stop the pointer on your number' : '② Tap to stop the marker: in for the bull, out for the doubles';
    el.aims.className = 'dt-aims' + (I.waiting ? ' ' + I.stage : '');
    el.throwBtn.disabled = !I.waiting;
    el.throwBtn.firstChild.textContent = I.waiting && I.stage === 'radius' ? '🎯 Throw ' : '🎯 Lock angle ';
    const a = wobble();
    el.arm.textContent = `Your arm: ${armLabel(a)}${App.state.mode === 'career' && App.state.stamina / (App.state.staminaMax || 100) < .5 ? ' (tired: shakier)' : ''}`;
  }
  function say(t) { M.log.unshift(t); M.log.length = Math.min(M.log.length, 6); renderLog(); }
  function renderLog() { if (!el || !M) return; el.log.innerHTML = ''; for (const t of M.log) el.log.append(h('div', t)); }
  function call(t) {
    if (!el) return;
    el.call.textContent = t; el.call.classList.remove('show'); void el.call.offsetWidth; el.call.classList.add('show');
    clearTimeout(call._t); call._t = setTimeout(() => el && el.call.classList.remove('show'), 1700 * App.speedFactor());
  }

  /* ---------- the board on the wall, and Mick's games ---------- */
  function spots(m) {
    if (m.id !== 'v:spur') return [];
    return [{ x: 17, y: 1, id: 'dartboard', label: '🎯 The dartboard', board: true }];
  }
  const canStake = n => App.state.bank >= n;
  function oppRows() {
    const rows = [], q1 = Quests.status('darts1') === 'done' || App.state.mode !== 'career', q2 = Quests.status('darts2') === 'done' || App.state.mode !== 'career';
    for (const key of ['benny', 'sheila', 'prof', 'mick']) {
      const o = OPPONENTS[key];
      if (key === 'mick' && !q2) continue;
      rows.push({ key, ...o, lock: q1 ? null : 'Beat Mick first' });
    }
    if (App.state.mode === 'career' && App.state.rivals) for (const id of Rivals.at('spur')) {
      const r = App.state.rivals[id], stake = { tex: 500, rico: 750, mei: 1500, baron: 2500 }[id] || 500;
      if (r.bank < stake) continue;
      rows.push({ key: id, rival: id, name: CHARACTERS[id].name, face: CHARACTERS[id].face, sigma: RIVAL_SIGMA[id] || 16, stake, start: 501, legs: 1, line: 'Here, at the Spur? Fine. One leg of 501.', lock: q1 ? null : 'Beat Mick first' });
    }
    return rows;
  }
  async function lobby() {
    const s = App.state, career = s.mode === 'career';
    if (career && Quests.status('darts1') === null && !s.flags.metMick) {
      await UI.dialog([{ who: 'mick', text: 'That\'s my board, friend. Sal and I used to hustle tourists on it. Practise all you like; if you fancy a proper game, come and have a word with me. I\'m the fella in the cardigan.' }]);
      s.flags.metMick = 1;
    }
    let pick = null;
    const body = h('div.dt-lobby');
    const row = (title, sub, label, fn, lock) => body.append(h('div.dt-row', h('div', h('b', title), h('p.muted.small', sub)),
      h('button.btn.sm' + (lock ? '.ghost' : '.primary'), { disabled: !!lock, onclick: () => { pick = fn; dlg.close(); } }, lock || label)));
    body.append(h('p.muted.small', `Your arm: ${armLabel(wobble())}. Darts thrown: ${st().darts}. Matches won: ${st().wins}/${st().matches}.${st().best ? ' Best average: ' + st().best + '.' : ''}`));
    row('🕐 Around the Clock', `Practice: 1 to 20, then the bull. Free. Best: ${st().atcBest || '–'} darts.`, 'Practice', () => match({ mode: 'atc', title: 'Around the Clock (practice)' }));
    if (career && Quests.status('darts1') === 'active') row('🎯 Mick Doyle, left-handed', 'One leg of 301, double out. Mick throws with his wrong hand. Beat him and the regulars will play you for money.', 'Play Mick', () => match({ mode: 'x01', start: 301, legs: 1, opp: { name: 'Mick (left-handed)', face: '🎯', sigma: 17 }, title: 'Mick Doyle · 301 · one leg', quest: 'darts1' }));
    for (const o of oppRows()) {
      const lock = o.lock || (!canStake(o.stake) ? 'Need ' + fmt(o.stake) : null);
      row(`${o.face} ${o.name}`, `${o.line} ${o.start}, ${o.legs > 1 ? 'best of ' + (o.legs * 2 - 1) + ' legs' : 'one leg'}. Stake ${fmt(o.stake)} each.`, `Play for ${fmt(o.stake)}`,
        () => match({ mode: 'x01', start: o.start, legs: o.legs, opp: { name: o.name, face: o.face, sigma: o.sigma, rival: o.rival }, stake: o.stake, oppKey: o.key, title: `${o.name} · ${o.start} · ${fmt(o.stake)} a side` }), lock);
    }
    const ga = goldenArrowStatus();
    if (ga) row('🏹 The Golden Arrow', ga.text, `Enter (${fmt(GA.entry)})`, () => goldenArrow(), ga.lock || (!canStake(GA.entry) ? 'Need ' + fmt(GA.entry) : null));
    const dlg = UI.modal({ title: '🎯 The Spur dartboard', body, buttons: [{ label: 'Not now', cls: 'ghost' }] });
    await dlg;
    if (!pick) return;
    const why = Career.canPlay(); if (why) return UI.toast(why, 'warn');
    await pick();
  }

  /* ---------- the Golden Arrow ---------- */
  const GA = { entry: 2000, prizes: { 1: 18000, 2: 6000, 3: 1000 } };
  function goldenArrowStatus() {
    const s = App.state;
    if (s.mode !== 'career') return { text: 'Eight-player knockout. Quarter-finals 301, semis 501, best-of-five final.' };
    if (!s.flags.goldenArrow) return null;
    if (Quests.status('darts4') === 'active') return { text: 'Eight-player knockout, tonight. Quarter-finals 301, semis 501, best-of-five final. Winner takes $18,000 and the arrow.' };
    if (Quests.status('darts4') !== 'done') return { text: 'Ask Mick about it.', lock: 'Ask Mick' };
    const next = Math.ceil(s.day / 7) * 7;
    return next === s.day ? { text: 'Weekly knockout, tonight. Winner takes $18,000.' } : { text: `Runs every 7th day. Next: day ${next}.`, lock: 'Day ' + next };
  }
  function simLeg(sigma, start) {
    let rem = start, darts = 0;
    for (let v = 0; v < 120 && rem > 0; v++) {
      const s0 = rem;
      for (let k = 0; k < 3; k++) {
        const p = aiThrow(setup(rem, 3 - k), sigma), sc = score(p.x, p.y), left = rem - sc.v; darts++;
        if (left < 0 || left === 1 || (left === 0 && !sc.dbl)) { rem = s0; break; }
        rem = left; if (!rem) break;
      }
    }
    return darts;
  }
  function simMatch(a, b, start, legs) {
    let wa = 0, wb = 0, first = RNG.chance(.5);
    while (wa < legs && wb < legs) { const da = simLeg(a.sigma, start) - (first ? .5 : 0), db = simLeg(b.sigma, start) - (first ? 0 : .5); if (da < db) wa++; else wb++; first = !first; }
    return wa > wb ? a : b;
  }
  async function goldenArrow() {
    if (!App.debit(GA.entry)) return UI.toast('Not enough bankroll', 'warn');
    App.count('dartGA');
    const field = BRACKET_NAMES.map(([name, face, sigma]) => ({ name, face, sigma }));
    // you open against a random draw; Dutch Joost is seeded into the other half
    const joost = field.shift(); field.sort(() => Math.random() - .5);
    const me = { name: App.state.name, face: '🙂', me: true };
    let bracket = [me, field[0], field[1], field[2], field[3], field[4], field[5], joost];
    const ROUNDS = [['Quarter-final', 301, 2], ['Semi-final', 501, 2], ['Final', 501, 3]];
    let place = 0, joostOut = '', joostOut0 = '';
    for (let r = 0; r < ROUNDS.length; r++) {
      const [rname, start, legs] = ROUNDS[r];
      const pairs = []; for (let i = 0; i < bracket.length; i += 2) pairs.push([bracket[i], bracket[i + 1]]);
      await UI.modal({ title: `🏹 The Golden Arrow · ${rname}`, body: h('div', h('p', r === 2 && pairs[0][1] === joost ? '"Dutch Joost," Mick mutters. "Kessler flies him in every year. He beat Sal in the \'89 final with a dart that bounced out and somehow counted. Bury him."'
          : r === 0 ? 'Mick taps the microphone. "Eight throwers, one arrow. Game on!" Over by the bar, Dutch Joost is polishing his darts on Kessler\'s handkerchief.'
          : !bracket.includes(joost) && !joostOut ? (joostOut = `Into the ${rname.toLowerCase()}. And the news is all round the bar: Dutch Joost is OUT, beaten by ${joostOut0}. Mick does a little jig behind the oche.`)
          : `Into the ${rname.toLowerCase()}.`),
        h('table.paytable', pairs.map(([a, b]) => h('tr', h('td', `${a.face} ${a.me ? 'You' : a.name}`), h('td.muted', 'vs'), h('td', `${b.face} ${b.me ? 'You' : b.name}`)))),
        h('p.muted.small', `${start}, double out, first to ${legs} legs.`)), buttons: [{ label: 'Step up to the oche', cls: 'primary' }] });
      const opp = pairs[0][1];
      const res = await match({ mode: 'x01', start, legs, opp, tournament: true, title: `Golden Arrow ${rname} · ${opp.name}` });
      if (!res.won) { place = r === 2 ? 2 : r === 1 ? 3 : 0; break; }
      const next = [me]; for (let i = 1; i < pairs.length; i++) { const w = simMatch(pairs[i][0], pairs[i][1], start, legs); next.push(w); if (pairs[i].includes(joost) && w !== joost) joostOut0 = w.name; }
      bracket = next;
      if (r === 2) place = 1;
    }
    const prize = GA.prizes[place] || 0;
    if (prize) App.credit(prize);
    if (place === 1) { App.count('dartGAwin'); Quests.bump('darts4'); }
    App.news(`🏹 The Golden Arrow: ${App.state.name} ${place === 1 ? 'wins it' : place === 2 ? 'loses the final' : place === 3 ? 'goes out in the semis' : 'goes out in the quarter-finals'}${prize ? ' (' + fmt(prize) + ')' : ''}.`);
    Career.checkAchievements(); App.save();
    await UI.modal({ title: place === 1 ? '🏹 Golden Arrow champion!' : '🏹 The Golden Arrow',
      body: h('div', h('p', place === 1 ? 'Mick hands you the golden arrow and gets a little misty. "Sal won this in \'84. Now it\'s yours. Hang it behind the bar."' : place === 2 ? 'Runner-up. Mick buys you a drink. "Next week."' : 'Knocked out. "It\'s a cruel game," says Mick. "That\'s why we love it."'),
        prize ? h('p.good', `Prize: ${fmt(prize)}`) : null),
      buttons: [{ label: 'Back to the Spur', cls: 'primary' }] });
    Router.go('world');
  }

  return { ORDER, R, score, spot, value, checkout, setup, aiThrow, sway, gauss, OPPONENTS, RIVAL_SIGMA, BRACKET_NAMES, st, wobble, armLabel, noise, simLeg,
    match, screen, lobby, spots, active, goldenArrow, _M: () => M, _I: I, _release: release, _aim: () => ({ stage: I.stage, angle: I.waiting && I.stage === 'angle' ? angleNow() : I.angle, radius: I.waiting && I.stage === 'radius' ? radiusNow() : null }) };
})();
