/* LuckyStrike Originals: the house games on the laptop in Level 3, the kind an online casino makes
   for itself. Five of them, each returning 99% (a 1% edge), all with autobet:
   - Dice: roll 0.00 to 100.00, over or under a line you drag. The closer the odds, the smaller the multiplier.
   - Limbo: name a multiplier; the result has to reach it.
   - Crash: a line climbs and multiplies your stake until it crashes. Cash out before it does (or set
     an auto cash-out).
   - Plinko: drop a ball through 8, 12 or 16 rows of pegs into a multiplier, low, medium or high risk.
   - Mines: a 5x5 grid hiding 1 to 24 mines. Every gem you turn raises the multiplier; a mine takes the lot.
   Autobet: how many bets (0 for no limit), what to do to the stake after a win and after a loss (back
   to the base, or raise it by a percentage), and when to stop (a profit or a loss for the run).
   Every bet costs a little of the drink (the hours go by at the laptop). Money is App.state.bank,
   which the bedsit swaps for your real money while you're at the laptop. */
const Originals = (() => {
  const EDGE = .99, MIN = 1, MAX = 100000;
  const GAMES = {
    dice: { icon: '🎲', name: 'Dice', blurb: 'Over or under the line' },
    limbo: { icon: '🚀', name: 'Limbo', blurb: 'Name your multiplier' },
    crash: { icon: '📈', name: 'Crash', blurb: 'Cash out before it crashes' },
    plinko: { icon: '🔻', name: 'Plinko', blurb: 'Drop the ball' },
    mines: { icon: '💣', name: 'Mines', blurb: 'Find the gems' },
  };
  // Plinko's multipliers by rows and risk (each table returns about 99%)
  const PLINKO = {
    8: { low: [5.6, 2.1, 1.1, 1, .5, 1, 1.1, 2.1, 5.6], medium: [13, 3, 1.3, .7, .4, .7, 1.3, 3, 13], high: [29, 4, 1.5, .3, .2, .3, 1.5, 4, 29] },
    12: { low: [10, 3, 1.6, 1.4, 1.1, 1, .5, 1, 1.1, 1.4, 1.6, 3, 10], medium: [33, 11, 4, 2, 1.1, .6, .3, .6, 1.1, 2, 4, 11, 33], high: [170, 24, 8.1, 2, .7, .2, .2, .2, .7, 2, 8.1, 24, 170] },
    16: { low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, .5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16], medium: [110, 41, 10, 5, 3, 1.5, 1, .5, .3, .5, 1, 1.5, 3, 5, 10, 41, 110], high: [1000, 130, 26, 9, 4, 2, .2, .2, .2, .2, .2, 2, 4, 9, 26, 130, 1000] },
  };
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  const plinkoRTP = (rows, risk) => PLINKO[rows][risk].reduce((s, m, k) => s + m * binom(rows, k) / 2 ** rows, 0);
  const minesMult = (mines, k) => { let m = EDGE; for (let i = 0; i < k; i++) m *= (25 - i) / (25 - mines - i); return Math.floor(m * 100) / 100; };
  // a result shaped like 0.99 / U: reaches t with probability 0.99 / t (Limbo and Crash)
  const fall = () => Math.max(1, Math.min(1e6, Math.floor(EDGE / (1 - Math.random()) * 100) / 100));
  const r2 = x => Math.round(x * 100) / 100;
  const xs = m => (m >= 1000 ? Math.round(m).toLocaleString('en-GB') : m.toFixed(2)) + '×';

  let S = null; // the session on screen
  const bal = () => App.state.bank;
  const busy = () => !!(S && (S.auto.on || S.live));

  /* ---------- money: a bet settles into the bank and the stats ---------- */
  function settle(bet, payout, mult) {
    const st = App.state; st.bank = r2(st.bank - bet + payout);
    App.roundDone('orig_' + S.game, { wagered: bet, returned: payout, net: r2(payout - bet) });
    S.stats.wagered = r2(S.stats.wagered + bet); S.stats.profit = r2(S.stats.profit + payout - bet); S.stats[payout > bet ? 'wins' : 'losses']++; S.stats.curve.push(S.stats.profit); if (S.stats.curve.length > 200) S.stats.curve.shift();
    S.hist.unshift({ mult, win: payout > bet }); S.hist.length = Math.min(S.hist.length, 14);
    paintStats(); paintHist();
    if (payout >= bet * 50 && payout - bet >= 500) UI.toast(`${GAMES[S.game].icon} ${xs(mult)} · +${fmt(payout - bet)}`, 'good');
    return payout > bet;
  }
  const readBet = () => { const v = r2(+S.betIn.value || 0); return v; };
  const setBet = v => { S.betIn.value = r2(Math.max(MIN, Math.min(MAX, v))).toFixed(2); };
  function canBet(bet) {
    if (!(bet >= MIN)) { UI.toast(`The minimum bet is ${fmt(MIN)}`, 'warn'); return false; }
    if (bet > MAX) { UI.toast(`The maximum bet is ${fmt(MAX)}`, 'warn'); return false; }
    if (bet > bal()) { UI.toast('Not enough balance', 'warn'); return false; }
    return true;
  }

  /* ---------- autobet ---------- */
  // What to do after a bet. "Chance" means the win chance of the game's target (Dice's line, Limbo's
  // target, Crash's auto cash-out; in Mines, fewer or more mines). Values are a percentage (relative to
  // the current bet or chance), pounds, or nothing.
  const ACTIONS = [['reset', 'Reset the bet', ''], ['betInc', 'Increase the bet by', '%'], ['betDec', 'Decrease the bet by', '%'], ['betAdd', 'Add to the bet', '£'], ['betSub', 'Take off the bet', '£'], ['betSet', 'Set the bet to', '£'],
    ['chInc', 'Increase win chance by', '%'], ['chDec', 'Decrease win chance by', '%'], ['chSet', 'Set win chance to', '%'], ['chReset', 'Reset win chance', ''], ['flip', 'Switch over / under', ''], ['stop', 'Stop the autobet', '']];
  const unitOf = a => (ACTIONS.find(x => x[0] === a) || [])[2] || '';
  function act(A, a, v) {
    const clampB = b => r2(Math.max(MIN, Math.min(MAX, b))), C = S.chance;
    if (a === 'reset') A.bet = A.base;
    else if (a === 'betInc') A.bet = clampB(A.bet * (1 + v / 100));
    else if (a === 'betDec') A.bet = clampB(A.bet * (1 - Math.min(99, v) / 100));
    else if (a === 'betAdd') A.bet = clampB(A.bet + v);
    else if (a === 'betSub') A.bet = clampB(A.bet - v);
    else if (a === 'betSet') A.bet = clampB(v);
    else if (C && a === 'chInc') C.set(C.get() * (1 + v / 100));
    else if (C && a === 'chDec') C.set(C.get() * (1 - Math.min(99, v) / 100));
    else if (C && a === 'chSet') C.set(v);
    else if (C && a === 'chReset') C.set(A.baseChance);
    else if (a === 'flip' && S.flip) S.flip();
    else if (a === 'stop') A.stopNow = true;
  }
  // does an advanced rule fire after this bet?
  function fires(R, A, won) {
    const n = Math.max(1, +R.n || 1);
    if (R.of === 'profit' || R.of === 'loss') { const run = r2(S.stats.profit - A.start), hit = R.of === 'profit' ? run >= n : -run >= n; const f = hit && !R.armed; R.armed = hit; return f; }
    if (R.of === 'bets') return R.when === 'first' ? A.count === n : R.when === 'above' ? A.count > n : A.count % n === 0;
    const mine = R.of === 'wins' ? won : !won; if (!mine) return false;
    const total = R.of === 'wins' ? A.wins : A.losses, streak = R.of === 'wins' ? A.winRun : A.lossRun;
    return R.when === 'every' ? total % n === 0 : R.when === 'streak' ? streak % n === 0 : R.when === 'first' ? streak === n : streak > n;
  }
  async function runAuto() {
    const A = S.auto, f = S.autoForm, me = S;
    Object.assign(A, { on: true, base: readBet(), bet: readBet(), left: Math.max(0, parseInt(f.n.value, 10) || 0), count: 0, wins: 0, losses: 0, winRun: 0, lossRun: 0, start: S.stats.profit, stopNow: false, baseChance: S.chance ? S.chance.get() : 0 });
    const onWin = [f.winAct.value, +f.winVal.value || 0], onLoss = [f.lossAct.value, +f.lossVal.value || 0], rules = f.rules.map(R => ({ when: R.when.value, n: +R.n.value, of: R.of.value, act: R.act.value, v: +R.v.value || 0, armed: false }));
    const stopP = +f.stopP.value || 0, stopL = +f.stopL.value || 0;
    if (f.nLeft) f.nLeft.textContent = ''; paintButton();
    while (me === S && A.on) {
      if (!canBet(A.bet)) break;
      setBet(A.bet);
      const won = await S.play(A.bet, true); if (me !== S) return;
      A.count++; if (won) { A.wins++; A.winRun++; A.lossRun = 0; } else { A.losses++; A.lossRun++; A.winRun = 0; }
      if (A.count >= 50) { App.count('l3_auto50'); Career.checkAchievements(); }
      const run = r2(S.stats.profit - A.start);
      act(A, ...(won ? onWin : onLoss));
      for (const R of rules) if (fires(R, A, won)) act(A, R.act, R.v);
      if (f.nLeft) f.nLeft.textContent = `${A.left ? `${A.left - A.count} left` : `${A.count} bets`} · run ${run >= 0 ? '+' : ''}${fmt(run)}`;
      if (A.stopNow) { UI.toast('Autobet stopped by a rule', 'good'); break; }
      if (A.left && A.count >= A.left) break;
      if (stopP && run >= stopP) { UI.toast(`Stop on profit: +${fmt(run)}`, 'good'); break; }
      if (stopL && -run >= stopL) { UI.toast(`Stop on loss: ${fmt(run)}`, 'warn'); break; }
      await new Promise(r => setTimeout(r, S.game === 'plinko' || S.game === 'crash' ? 60 : 160));
    }
    if (me === S) { A.on = false; paintButton(); }
  }
  // the autobet panel, once the game has said whether it has a win chance to change
  function autoPanel(box) {
    const f = S.autoForm, C = S.chance, sel = (opts, v) => { const s2 = h('select.orig-in'); opts.forEach(([k, l]) => s2.append(h('option', { value: k, selected: k === v }, l))); return s2; };
    const acts = ACTIONS.filter(([k]) => !(k.startsWith('ch') && !C) && !(k === 'flip' && !S.flip));
    const pair = (a0, v0) => { const a = sel(acts.map(([k, l]) => [k, l]), a0), v = h('input.orig-in.pct', { type: 'number', min: 0, step: 'any', value: v0 }), u = h('span.orig-unit'); const sync = () => { const un = unitOf(a.value); u.textContent = un; v.style.visibility = un ? 'visible' : 'hidden'; }; a.onchange = sync; sync(); return { a, v, row: h('div.orig-row', a, v, u) }; };
    const w = pair('reset', 0), l = pair('reset', 100); f.winAct = w.a; f.winVal = w.v; f.lossAct = l.a; f.lossVal = l.v;
    f.rules = []; const list = h('div.orig-rules');
    const addRule = () => {
      const R = { when: sel([['every', 'Every'], ['streak', 'Every streak of'], ['first', 'First streak of'], ['above', 'Streak above']], 'streak'), n: h('input.orig-in.pct', { type: 'number', min: 1, value: 3 }), of: sel([['wins', 'wins'], ['losses', 'losses'], ['bets', 'bets'], ['profit', '£ profit (run)'], ['loss', '£ loss (run)']], 'losses') };
      const ap = pair('betInc', 100); R.act = ap.a; R.v = ap.v;
      const row = h('div.orig-rule', h('div.orig-row', h('span.orig-on', 'On'), R.when, R.n, R.of), h('div.orig-row', h('span.orig-on', '→'), ap.a, ap.v, ap.row.lastChild, h('button.orig-x', { 'aria-label': 'Remove the rule', onclick: () => { f.rules.splice(f.rules.indexOf(R), 1); row.remove(); } }, '×')));
      const tidy = () => { const money = R.of.value === 'profit' || R.of.value === 'loss'; R.when.style.display = money ? 'none' : ''; }; R.of.onchange = tidy; tidy();
      f.rules.push(R); list.append(row);
    };
    box.append(
      h('div.orig-field', h('label', 'Number of bets (0 = until you stop)'), f.n, f.nLeft),
      h('div.orig-field', h('label', 'On win'), w.row), h('div.orig-field', h('label', 'On loss'), l.row),
      h('details.orig-adv', h('summary', 'Advanced rules (streaks, every N bets, profit)'), list, h('button.orig-sub', { onclick: addRule }, '＋ Add a rule'), h('small.orig-note', C ? `Win chance is ${C.label}. Changes are relative: "increase by 10%" makes 49.5% into 54.45%.` : 'This game has no win chance to change: rules can change the bet or stop the autobet.')),
      h('div.orig-field', h('label', 'Stop on profit (£)'), f.stopP), h('div.orig-field', h('label', 'Stop on loss (£)'), f.stopL));
  }
  function stopAuto() { if (S) S.auto.on = false; }

  /* ---------- the screen ---------- */
  function screen(main, game) {
    unmount();
    game = GAMES[game] ? game : 'dice';
    S = { game, mode: 'manual', auto: { on: false }, live: null, hist: [], stats: { wagered: 0, profit: 0, wins: 0, losses: 0, curve: [0] }, timers: [] };
    const el = h('div.orig');
    const tabs = h('div.orig-tabs', Object.entries(GAMES).map(([k, g]) => h('button' + (k === game ? '.on' : ''), { onclick: () => { if (busy()) return UI.toast('Stop the autobet (or finish the round) first', 'warn'); Router.go('originals', k); } }, h('span', g.icon), g.name)));
    S.betIn = h('input.orig-in', { type: 'number', min: MIN, step: '0.01', value: Math.max(MIN, Math.min(10, Math.floor(bal()))).toFixed(2), inputmode: 'decimal' });
    const betRow = h('div.orig-field', h('label', 'Bet amount'), h('div.orig-bet', S.betIn, h('button', { onclick: () => setBet(readBet() / 2) }, '½'), h('button', { onclick: () => setBet(readBet() * 2) }, '2×'), h('button', { onclick: () => setBet(Math.min(MAX, bal())) }, 'Max')));
    const modeTabs = h('div.orig-mode', ['manual', 'auto'].map(m => h('button' + (m === S.mode ? '.on' : ''), { onclick: e => { if (busy()) return; S.mode = m; modeTabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); autoBox.style.display = m === 'auto' ? '' : 'none'; paintButton(); if (S.onMode) S.onMode(m); } }, m === 'manual' ? 'Manual' : 'Auto')));
    const sel = (opts, v) => { const s = h('select.orig-in'); opts.forEach(([k, l]) => s.append(h('option', { value: k, selected: k === v }, l))); return s; };
    S.autoForm = { n: h('input.orig-in', { type: 'number', min: 0, value: 20 }), stopP: h('input.orig-in', { type: 'number', min: 0, value: 0 }), stopL: h('input.orig-in', { type: 'number', min: 0, value: 0 }), nLeft: h('small.orig-left') };
    const autoBox = h('div.orig-auto', { style: { display: 'none' } }); // filled once the game is set up (autoPanel)
    S.ctl = h('div.orig-ctl'); S.btn = h('button.orig-go', { onclick: () => press() });
    S.stage = h('div.orig-stage'); S.histEl = h('div.orig-hist');
    S.statsEl = h('div.orig-stats');
    el.append(h('div.orig-head', h('b', '⚡ LuckyStrike Originals'), h('span.orig-rtp', '99% RTP · provably random'), h('span.orig-bal')), tabs,
      h('div.orig-main', h('div.orig-side', modeTabs, betRow, S.ctl, autoBox, S.btn), h('div.orig-right', S.histEl, S.stage)), S.statsEl);
    main.append(el); S.el = el;
    ({ dice, limbo, crash, plinko, mines })[game]();
    autoPanel(autoBox);
    paintButton(); paintStats(); paintHist();
  }
  function press() {
    if (S.mode === 'auto') { if (S.auto.on) stopAuto(); else if (!S.live) runAuto(); return; }
    if (S.manual) return S.manual(); // a game with its own manual button (crash's cash out, mines' cash out)
    if (S.live) return;
    const bet = readBet(); if (!canBet(bet)) return; S.play(bet, false);
  }
  function paintButton() {
    if (!S) return; const b = S.btn;
    if (S.mode === 'auto') { b.textContent = S.auto.on ? 'Stop autobet' : 'Start autobet'; b.classList.toggle('stop', S.auto.on); b.disabled = false; return; }
    b.classList.remove('stop');
    b.textContent = S.label ? S.label() : 'Bet'; b.disabled = !!(S.live && !S.manual);
  }
  function paintStats() {
    if (!S) return; const st = S.stats;
    S.el.querySelector('.orig-bal').textContent = `Balance ${fmt(bal())}`;
    S.statsEl.innerHTML = '';
    const cv = h('canvas', { width: 300, height: 60 }), g = cv.getContext('2d'), c = st.curve, lo = Math.min(0, ...c), hi = Math.max(0, ...c), sy = v => 56 - (v - lo) / ((hi - lo) || 1) * 52;
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(0, sy(0)); g.lineTo(300, sy(0)); g.stroke();
    g.strokeStyle = st.profit >= 0 ? '#4dff7a' : '#ff4d5a'; g.lineWidth = 2; g.beginPath(); c.forEach((v, i) => { const x = i / Math.max(1, c.length - 1) * 300; i ? g.lineTo(x, sy(v)) : g.moveTo(x, sy(v)); }); g.stroke();
    S.statsEl.append(h('div', h('small', 'Profit'), h('b' + (st.profit >= 0 ? '.up' : '.down'), (st.profit >= 0 ? '+' : '') + fmt(st.profit))), h('div', h('small', 'Wagered'), h('b', fmt(st.wagered))), h('div', h('small', 'Wins'), h('b.up', st.wins)), h('div', h('small', 'Losses'), h('b.down', st.losses)), cv);
  }
  function paintHist() { if (!S) return; S.histEl.innerHTML = ''; S.hist.forEach(r => S.histEl.append(h('span' + (r.win ? '.win' : ''), xs(r.mult)))); }
  const later = (fn, ms) => { const t = setTimeout(fn, ms); S.timers.push(t); return t; };
  const wait = ms => new Promise(r => later(r, ms));
  const field = (label, input, extra) => h('div.orig-field', h('label', label), extra ? h('div.orig-row', input, extra) : input);

  /* ---------- Dice ---------- */
  function dice() {
    let target = 50.5, over = true;
    const chance = () => over ? 100 - target : target, mult = () => Math.floor(EDGE * 100 / chance() * 10000) / 10000;
    const range = h('input.orig-range', { type: 'range', min: 2, max: 98, step: .01, value: target, 'aria-label': 'Roll line' });
    const track = h('div.orig-track'), marker = h('div.orig-marker', h('b', '—')), out = { mult: h('input.orig-in', { type: 'number', step: .0001 }), line: h('input.orig-in', { type: 'number', step: .01 }), chance: h('input.orig-in', { type: 'number', step: .01 }) };
    const flip = h('button.orig-flip', { onclick: () => { over = !over; target = r2(100 - target); sync(); } });
    const sync = () => {
      target = Math.max(2, Math.min(98, target)); range.value = target;
      track.style.setProperty('--at', target + '%'); track.classList.toggle('under', !over);
      out.mult.value = mult().toFixed(4); out.line.value = target.toFixed(2); out.chance.value = chance().toFixed(2); flip.textContent = over ? 'Roll over ⇄' : 'Roll under ⇄';
    };
    range.oninput = () => { target = +range.value; sync(); };
    S.chance = { label: 'the chance of the roll landing on your side of the line', get: () => chance(), set: c => { c = Math.max(2, Math.min(98, c)); target = r2(over ? 100 - c : c); sync(); } };
    S.flip = () => { over = !over; target = r2(100 - target); sync(); };
    out.line.onchange = () => { target = +out.line.value; sync(); };
    out.chance.onchange = () => { const c = Math.max(2, Math.min(98, +out.chance.value)); target = over ? 100 - c : c; sync(); };
    out.mult.onchange = () => { const c = Math.max(2, Math.min(98, EDGE * 100 / Math.max(1.0102, +out.mult.value))); target = over ? 100 - c : c; sync(); };
    track.append(h('div.orig-fill'), marker, range, h('div.orig-ticks', [0, 25, 50, 75, 100].map(n => h('span', n))));
    S.stage.append(h('div.orig-dice', track, h('div.orig-trio', field('Multiplier', out.mult), field(over ? 'Roll over' : 'Roll under', out.line, flip), field('Win chance', out.chance, h('span', '%')))));
    S.ctl.append(h('p.orig-note', 'Drag the line. The result is a number from 0.00 to 100.00.'));
    S.play = async (bet, auto) => {
      S.live = 1; paintButton();
      const roll = Math.floor(Math.random() * 10001) / 100, win = over ? roll > target : roll < target, m = mult();
      marker.style.left = roll + '%'; marker.querySelector('b').textContent = roll.toFixed(2); marker.className = 'orig-marker show ' + (win ? 'win' : 'lose');
      SFX.click && SFX.click(); await wait(auto ? 120 : 260);
      const ok = settle(bet, win ? r2(bet * m) : 0, win ? m : 0); if (win && SFX.win) SFX.win();
      S.live = null; paintButton(); return ok;
    };
    sync();
  }

  /* ---------- Limbo ---------- */
  function limbo() {
    let target = 2;
    const tIn = h('input.orig-in', { type: 'number', min: 1.01, step: .01, value: '2.00' }), chance = h('input.orig-in', { type: 'number', readonly: true });
    const big = h('div.orig-big', '1.00×');
    const sync = () => { target = Math.max(1.01, Math.min(1e6, +tIn.value || 2)); chance.value = (EDGE / target * 100).toFixed(6).replace(/0+$/, ''); };
    tIn.onchange = sync;
    S.chance = { label: '99% ÷ your target', get: () => EDGE / target * 100, set: c => { c = Math.max(.0001, Math.min(98, c)); tIn.value = Math.max(1.01, Math.floor(EDGE * 100 / c * 100) / 100).toFixed(2); sync(); } };
    S.stage.append(h('div.orig-limbo', big, h('div.orig-trio', field('Target multiplier', tIn), field('Win chance', chance, h('span', '%')))));
    S.ctl.append(h('p.orig-note', 'The result has to reach your target. 2× wins about half the time.'));
    S.play = async (bet, auto) => {
      S.live = 1; paintButton(); big.className = 'orig-big';
      const r = fall(), win = r >= target, steps = auto ? 6 : 14;
      for (let i = 1; i <= steps; i++) { big.textContent = xs(1 + (r - 1) * (i / steps) ** 3); await wait(auto ? 12 : 22); }
      big.textContent = xs(r); big.classList.add(win ? 'win' : 'lose');
      const ok = settle(bet, win ? r2(bet * target) : 0, win ? target : r); if (win && SFX.win) SFX.win();
      S.live = null; paintButton(); return ok;
    };
    sync();
  }

  /* ---------- Crash ---------- */
  function crash() {
    const cash = h('input.orig-in', { type: 'number', min: 1.01, step: .01, value: '2.00' }), cv = h('canvas.orig-crash', { width: 640, height: 360 }), g = cv.getContext('2d');
    S.stage.append(cv, h('div.orig-trio', field('Auto cash-out', cash, h('span', '×'))));
    S.ctl.append(h('p.orig-note', 'Bet, and the multiplier climbs from 1.00×. Cash out before it crashes. In autobet it cashes out at your auto cash-out.'));
    const draw = (m, t, crashed, cashedAt) => {
      const W = 640, H = 360; g.fillStyle = '#0f212e'; g.fillRect(0, 0, W, H);
      const top = Math.max(2, m * 1.15), tx = Math.max(6, t * 1.1), X = s => 40 + s / tx * (W - 60), Y = v => H - 30 - (v - 1) / (top - 1) * (H - 60);
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '12px system-ui'; for (let i = 0; i <= 4; i++) { const v = 1 + (top - 1) * i / 4, y = Y(v); g.beginPath(); g.moveTo(40, y); g.lineTo(W - 20, y); g.stroke(); g.fillText(v.toFixed(2) + '×', 2, y + 4); }
      g.beginPath(); g.moveTo(X(0), Y(1)); for (let s = 0; s <= t; s += t / 60 || 1) g.lineTo(X(s), Y(Math.exp(.12 * s))); g.lineTo(X(t), Y(m));
      g.strokeStyle = crashed ? '#ff4d5a' : '#ffb84d'; g.lineWidth = 4; g.stroke(); g.lineTo(X(t), Y(1)); g.lineTo(X(0), Y(1)); g.fillStyle = crashed ? 'rgba(255,77,90,.15)' : 'rgba(255,184,77,.15)'; g.fill();
      g.font = '28px system-ui'; g.fillText(crashed ? '💥' : '🚀', X(t) - 14, Y(m) - 8);
      g.textAlign = 'center'; g.font = 'bold 54px system-ui'; g.fillStyle = crashed ? '#ff4d5a' : cashedAt ? '#4dff7a' : '#fff'; g.fillText(m.toFixed(2) + '×', W / 2, H / 2 - 10);
      g.font = '18px system-ui'; g.fillStyle = 'rgba(255,255,255,.8)'; if (crashed) g.fillText('Crashed', W / 2, H / 2 + 22); else if (cashedAt) g.fillText(`Cashed out at ${cashedAt.toFixed(2)}×`, W / 2, H / 2 + 22); g.textAlign = 'left';
    };
    draw(1, 0);
    S.label = () => S.live ? `Cash out ${fmt(r2(S.live.bet * S.live.m))}` : 'Bet';
    S.chance = { label: '99% ÷ your auto cash-out', get: () => EDGE / Math.max(1.01, +cash.value || 2) * 100, set: c => { c = Math.max(.0001, Math.min(98, c)); cash.value = Math.max(1.01, Math.floor(EDGE * 100 / c * 100) / 100).toFixed(2); } };
    S.play = (bet, auto) => new Promise(done => {
      const at = fall(), auto2 = Math.max(1.01, +cash.value || 2), speed = auto ? 3 : 1, t0 = performance.now();
      const L = S.live = { bet, m: 1, out: null }; paintButton();
      const finish = (win, mult) => { cancelAnimationFrame(L.raf); S.live = null; S.manual = null; const ok = settle(bet, win ? r2(bet * mult) : 0, win ? mult : at); if (win && SFX.win) SFX.win(); paintButton(); done(ok); };
      S.manual = auto ? null : () => { if (L.out || !S.live) return; L.out = L.m; }; // cash out now
      const step = now => {
        if (S === null || S.live !== L) return;
        const t = (now - t0) / 1000 * speed, m = Math.min(at, Math.floor(Math.exp(.12 * t) * 100) / 100); L.m = m;
        const target = auto ? auto2 : (+cash.value > 1 ? +cash.value : Infinity);
        if (!L.out && m >= target && target <= at) L.out = target;
        if (L.out) { draw(L.out, t, false, L.out); return finish(true, L.out); }
        if (m >= at) { draw(at, t, true); SFX.lose && SFX.lose(); return later(() => finish(false, 0), auto ? 250 : 900); }
        draw(m, t); if (!auto) paintButton(); L.raf = requestAnimationFrame(step);
      };
      L.raf = requestAnimationFrame(step);
    });
    S.onMode = () => { S.manual = null; };
  }

  /* ---------- Plinko ---------- */
  function plinko() {
    let rows = 16, risk = 'medium';
    const cv = h('canvas.orig-plinko', { width: 640, height: 560 }), g = cv.getContext('2d'), balls = [];
    const rowsSel = h('select.orig-in', { onchange: e => { rows = +e.target.value; paint(); } }, [8, 12, 16].map(n => h('option', { value: n, selected: n === rows }, n)));
    const riskSel = h('select.orig-in', { onchange: e => { risk = e.target.value; paint(); } }, ['low', 'medium', 'high'].map(n => h('option', { value: n, selected: n === risk }, n[0].toUpperCase() + n.slice(1))));
    const rtp = h('small.orig-note');
    S.ctl.append(field('Risk', riskSel), field('Rows', rowsSel), rtp);
    S.stage.append(cv);
    const geo = () => { const W = 640, top = 40, gap = (560 - 110) / rows, dx = Math.min(36, (W - 40) / (rows + 2)); return { W, top, gap, dx, x: (r, i) => W / 2 + (i - r / 2) * dx, y: r => top + r * gap }; };
    const colour = m => m >= 100 ? '#ff2d55' : m >= 10 ? '#ff6b3d' : m >= 3 ? '#ff9f2d' : m >= 1.5 ? '#ffc93d' : m >= 1 ? '#e6d84d' : '#c8d84d';
    let hitBin = -1, hitT = 0;
    function paint() {
      const G2 = geo(); g.fillStyle = '#0f212e'; g.fillRect(0, 0, 640, 560);
      g.fillStyle = '#fff'; for (let r = 1; r <= rows; r++) for (let i = 0; i <= r; i++) { g.beginPath(); g.arc(G2.x(r, i) , G2.y(r), 4, 0, 7); g.fill(); }
      const T = PLINKO[rows][risk], bw = G2.dx - 4;
      T.forEach((m, k) => { const x = G2.x(rows, k) - G2.dx / 2 + G2.dx / 2, y = G2.y(rows) + 22, lift = k === hitBin && performance.now() - hitT < 300 ? 5 : 0; g.fillStyle = colour(m); g.beginPath(); g.roundRect ? g.roundRect(x - bw / 2, y - lift, bw, 24, 5) : g.rect(x - bw / 2, y - lift, bw, 24); g.fill(); g.fillStyle = '#1a1a1a'; g.font = `bold ${rows === 16 ? 9 : 11}px system-ui`; g.textAlign = 'center'; g.fillText(m >= 100 ? Math.round(m) : m, x, y + 16 - lift); });
      g.textAlign = 'left';
      for (const b of balls) { g.fillStyle = '#ff2d55'; g.beginPath(); g.arc(b.x, b.y, 7, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; g.stroke(); }
      rtp.textContent = `Returns ${(plinkoRTP(rows, risk) * 100).toFixed(2)}% · top ${xs(PLINKO[rows][risk][0])}`;
    }
    let raf = 0; const loop = () => { paint(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    S.stopLoop = () => cancelAnimationFrame(raf);
    S.play = (bet, auto) => new Promise(done => {
      S.live = 1; paintButton();
      const path = Array.from({ length: rows }, () => Math.random() < .5 ? 0 : 1), bin = path.reduce((a, b) => a + b, 0), G2 = geo(), b = { x: G2.x(0, 0), y: G2.y(0) - 20 }; balls.push(b);
      const T = auto ? 45 : 95; let r = 0, i = 0, t0 = performance.now();
      const tick = now => {
        if (!S) return; const k = Math.min(1, (now - t0) / T);
        const x0 = r === 0 ? G2.x(0, 0) : G2.x(r, i), y0 = r === 0 ? G2.y(0) - 20 : G2.y(r), ni = r < rows ? i + path[r] : i, x1 = r < rows ? G2.x(r + 1, ni) : x0, y1 = r < rows ? G2.y(r + 1) : y0 + 30;
        b.x = x0 + (x1 - x0) * k; b.y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * G2.gap * .35;
        if (k >= 1) { if (r >= rows) { balls.splice(balls.indexOf(b), 1); hitBin = bin; hitT = performance.now(); const m = PLINKO[rows][risk][bin]; S.live = null; const ok = settle(bet, r2(bet * m), m); if (m >= 2 && SFX.win) SFX.win(); paintButton(); return done(ok); } i = ni; r++; t0 = now; SFX.click && !auto && SFX.click(); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Mines ---------- */
  function mines() {
    let n = 3, picks = new Set(), board = null, k = 0;
    const minesSel = h('select.orig-in', { onchange: e => { n = +e.target.value; paintInfo(); } }, Array.from({ length: 24 }, (_, i) => h('option', { value: i + 1, selected: i + 1 === n }, i + 1)));
    const info = h('p.orig-note'), grid = h('div.orig-mines'), cells = [];
    S.ctl.append(field('Mines', minesSel), info, h('button.orig-sub', { onclick: () => randomPick() }, 'Pick a random tile'));
    S.stage.append(grid);
    for (let i = 0; i < 25; i++) { const c = h('button.orig-tile', { 'aria-label': 'Tile ' + (i + 1), onclick: () => tap(i) }); cells.push(c); grid.append(c); }
    const paintInfo = () => { info.textContent = S.mode === 'auto' ? `Autobet: tick the tiles to turn every round (${picks.size} picked, ${picks.size ? xs(minesMult(n, picks.size)) : 'pick some'}).` : board ? `${k} gem${k === 1 ? '' : 's'} · next ${xs(minesMult(n, k + 1))} · now ${xs(k ? minesMult(n, k) : 1)}` : `Turn tiles: 1 gem pays ${xs(minesMult(n, 1))}, 3 pay ${xs(minesMult(n, 3))}, 5 pay ${xs(minesMult(n, Math.min(5, 25 - n)))}.`; };
    const reset = () => cells.forEach((c, i) => { c.className = 'orig-tile' + (S.mode === 'auto' && picks.has(i) ? ' pick' : ''); c.textContent = ''; c.disabled = false; });
    const deal = () => { const m = new Set(); while (m.size < n) m.add(Math.floor(Math.random() * 25)); return m; };
    const reveal = (bm, hit) => cells.forEach((c, i) => { c.textContent = bm.has(i) ? '💣' : '💎'; c.classList.add(bm.has(i) ? 'mine' : 'gem'); if (!(c.classList.contains('open'))) c.classList.add('dim'); if (i === hit) c.classList.add('boom'); c.disabled = true; });
    S.label = () => board ? (k ? `Cash out ${fmt(r2(board.bet * minesMult(n, k)))}` : 'Pick a tile') : 'Bet';
    function tap(i) {
      if (S.mode === 'auto') { if (S.auto.on) return; picks.has(i) ? picks.delete(i) : picks.add(i); reset(); paintInfo(); return; }
      if (!board || cells[i].classList.contains('open')) return;
      const c = cells[i]; c.classList.add('open');
      if (board.m.has(i)) { reveal(board.m, i); SFX.lose && SFX.lose(); const b = board; board = null; S.live = null; S.manual = null; settle(b.bet, 0, 0); paintButton(); paintInfo(); minesSel.disabled = false; return; }
      c.textContent = '💎'; c.classList.add('gem'); k++; SFX.chip && SFX.chip();
      if (k >= 25 - n) return cashOut();
      paintButton(); paintInfo();
    }
    function randomPick() { if (S.mode === 'auto') { const free = [...Array(25).keys()].filter(i => !picks.has(i)); if (free.length) { picks.add(free[Math.floor(Math.random() * free.length)]); reset(); paintInfo(); } return; } if (!board) return; const free = cells.map((c, i) => i).filter(i => !cells[i].classList.contains('open')); tap(free[Math.floor(Math.random() * free.length)]); }
    function cashOut() { if (!board || !k) return; const b = board, m = minesMult(n, k); reveal(b.m); board = null; S.live = null; S.manual = null; settle(b.bet, r2(b.bet * m), m); if (SFX.win) SFX.win(); paintButton(); paintInfo(); minesSel.disabled = false; }
    S.onMode = m => { picks = new Set(); reset(); paintInfo(); };
    S.chance = { label: 'the share of the board without a mine (more chance, fewer mines)', get: () => (25 - n) / 25 * 100, set: c => { n = Math.max(1, Math.min(24, 25 - Math.max(1, picks.size), Math.round(25 - c / 100 * 25))); minesSel.value = n; paintInfo(); } }; // never so many mines that the picked tiles can't all be gems
    S.play = async (bet, auto) => {
      if (!auto) { reset(); board = { bet, m: deal() }; k = 0; S.live = board; S.manual = () => cashOut(); minesSel.disabled = true; paintButton(); paintInfo(); return null; }
      if (!picks.size) { UI.toast('Pick the tiles to turn first', 'warn'); S.auto.on = false; return false; }
      reset(); const bm = deal(); let hit = -1;
      for (const i of picks) { cells[i].classList.add('open'); if (bm.has(i)) { hit = i; break; } cells[i].textContent = '💎'; cells[i].classList.add('gem'); await wait(40); }
      reveal(bm, hit); const win = hit < 0, m = minesMult(n, picks.size);
      const ok = settle(bet, win ? r2(bet * m) : 0, win ? m : 0); await wait(260); reset(); return ok;
    };
    reset(); paintInfo();
  }

  function unmount() {
    if (!S) return; S.auto.on = false; if (S.live && S.live.raf) cancelAnimationFrame(S.live.raf);
    // a round still in the air when you leave: a crash bet is lost, an open Mines board is cashed out at what it shows
    if (S.manual && S.live && S.game === 'mines') S.manual();
    if (S.stopLoop) S.stopLoop(); S.timers.forEach(clearTimeout); S = null;
  }
  // what the laptop shows for each game
  return { GAMES, PLINKO, plinkoRTP, minesMult, screen, unmount, busy, stopAuto, get session() { return S; } };
})();
