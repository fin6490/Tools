/* Mississippi Stud, Three Card Poker, Let It Ride: the "no dealer bluffing" poker family. */

// shared: cards left in a 52-card deck after removing `used`
function remainingDeck(used) {
  const u = new Set(used.map(cardName)), out = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!u.has(rankLabel(r) + SUIT_SYM[s])) out.push({ r, s });
  return out;
}
const CAT_KEYS = ['high', 'pair', 'twopair', 'trips', 'straight', 'flush', 'fh', 'quads', 'sf', 'royal'];
const tcpKey = e => e.miniRoyal ? 'mini' : ['high', 'pair', 'flush', 'straight', 'trips', 'sf'][e.cat];
const payRow = (table, key) => table.find(r => r.key === key);

/* ======================= Mississippi Stud ======================= */
GAMES.ms = (() => {
  let t, ctx, shoe, sp, rows, st;
  const sideMax = () => Math.max(25, ctx.limits.max / 4);
  function mult(e) { // multiplier on every bet for a final 5-card hand; -1 = lose
    if (e.cat === 1) { const p = e.groups[0]; return p >= 11 ? 1 : p >= 6 ? 0 : -1; }
    if (e.cat === 0) return -1;
    return payRow(PAY.ms.main, CAT_KEYS[e.cat]).pays;
  }
  // exact optimal play: value per unit of ante given known cards and units committed
  function emFinal(cards4, rest) { let s = 0; for (const c of rest) s += mult(Poker.eval5(cards4.concat([c]))); return s / rest.length; }
  function bestAt(stage, cards, C) { // returns {ev, r}: r = 0 fold, else raise size
    const rest = remainingDeck(cards);
    if (stage === 2) {
      const em = emFinal(cards, rest);
      let best = { ev: -C, r: 0 };
      for (const r of [1, 3]) { const ev = (C + r) * em; if (ev > best.ev) best = { ev, r }; }
      return best;
    }
    // stage 1: need V2 for each next card, as a function of C (piecewise linear via em)
    const ems = rest.map(c => { const r2 = rest.filter(x => x !== c); return emFinal(cards.concat([c]), r2); });
    const v2 = C2 => ems.reduce((a, em) => a + Math.max(-C2, (C2 + 1) * em, (C2 + 3) * em), 0) / ems.length;
    if (stage === 1) {
      let best = { ev: -C, r: 0 };
      for (const r of [1, 3]) { const ev = v2(C + r); if (ev > best.ev) best = { ev, r }; }
      return best;
    }
  }
  function bestStage0(cards) {
    const rest = remainingDeck(cards);
    // for each possible first community card compute the stage-1 value function at C = 2 and C = 4
    let s2 = 0, s4 = 0;
    for (const c of rest) {
      const r1 = rest.filter(x => x !== c), cards3 = cards.concat([c]);
      const ems = r1.map(d => emFinal(cards3.concat([d]), r1.filter(x => x !== d)));
      const v2 = C2 => ems.reduce((a, em) => a + Math.max(-C2, (C2 + 1) * em, (C2 + 3) * em), 0) / ems.length;
      const v1 = C1 => Math.max(-C1, v2(C1 + 1), v2(C1 + 3));
      s2 += v1(2); s4 += v1(4);
    }
    s2 /= rest.length; s4 /= rest.length;
    let best = { ev: -1, r: 0 };
    if (s2 > best.ev) best = { ev: s2, r: 1 };
    if (s4 > best.ev) best = { ev: s4, r: 3 };
    return best;
  }

  function mount(table, c) {
    t = table; ctx = c; shoe = new Shoe(1, 1); t.shoe.classList.add('single');
    t.body.append(h('div.poker',
      h('div.board-area', h('div.area-l', 'Community cards'), h('div.cards.board#m-board')),
      h('div.felt-arc', 'PAIR OF JACKS OR BETTER WINS · 6s THROUGH 10s PUSH · NO DEALER HAND'),
      h('div.player-area', h('div.cards#m-player'), h('div.area-l', h('span.tot#m-pl'))),
      h('div.spots-row', h('div.col', h('div.spots-row.tight#m-main')), h('div.col.sides#m-sides'))));
    rows = { b: new UI.CardRow($('#m-board')), p: new UI.CardRow($('#m-player')) };
    sp = {
      ante: t.spot({ key: 'ante', label: 'Ante', cls: 'main', max: ctx.limits.max / 3 }),
      s3: t.spot({ key: 's3', label: '3rd', cls: 'main', passive: true }),
      s4: t.spot({ key: 's4', label: '4th', cls: 'main', passive: true }),
      s5: t.spot({ key: 's5', label: '5th', cls: 'main', passive: true }),
      bonus: t.spot({ key: 'bonus', label: '3-Card Bonus', sub: 'up to 100:1', cls: 'side', max: sideMax }),
      prog: t.spot({ key: 'prog', label: 'Jackpot', sub: fmt(PAY.ms.prog.cost), cls: 'side prog', fixed: PAY.ms.prog.cost }),
    };
    $('#m-main').append(sp.ante.el, sp.s3.el, sp.s4.el, sp.s5.el);
    $('#m-sides').append(sp.bonus.el, sp.prog.el, UI.meter('ms', PAY.ms.prog.name));
    betPhase();
  }
  function betPhase() {
    t.busy = false; ['ante', 'bonus', 'prog'].forEach(k => sp[k].setLocked(false));
    t.msg('Bet the Ante. You\'ll raise 1x to 3x on each street, or fold.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets(['ante', 'bonus', 'prog']) },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }
  async function deal() {
    if (sp.ante.amount < ctx.limits.min) return UI.toast(`Minimum ante is ${fmt(ctx.limits.min)}`, 'warn');
    t.busy = true; t.setActions([]); Object.values(sp).forEach(s => s.setLocked(true));
    t.saveBets(['ante', 'bonus', 'prog']);
    if (sp.prog.amount) Progressives.contribute('ms');
    shoe.shuffle(); rows.b.clear(); rows.p.clear(); $('#m-pl').textContent = '';
    st = { p: [shoe.draw(), shoe.draw()], b: [shoe.draw(), shoe.draw(), shoe.draw()], units: 1 };
    for (const c of st.p) await rows.p.add(c);
    for (const c of st.b) await rows.b.add(c, true);
    decide(0);
  }
  function known() { return st.p.concat(st.b.slice(0, st.stage)); }
  async function decide(stage) {
    st.stage = stage;
    const a = sp.ante.amount, spot = [sp.s3, sp.s4, sp.s5][stage];
    const cards = known();
    $('#m-pl').textContent = cards.length >= 2 ? describe(cards) : '';
    let hint = null;
    if (App.perk('pokerhint') && App.state.settings.hints) {
      t.msg('📓 Doc is working the numbers…'); await sleep(30);
      hint = stage === 0 ? bestStage0(cards) : bestAt(stage, cards, st.units);
    }
    const street = ['3rd', '4th', '5th'][stage];
    t.msg(hint ? h('span', `${street} street. 📓 Best play: `, h('b', hint.r ? `RAISE ${hint.r}x` : 'FOLD'), ` (EV ${hint.ev >= 0 ? '+' : ''}${(hint.ev * a).toFixed(2)})`) : `${street} street: raise 1x, 2x or 3x your ante, or fold.`);
    const raise = async m => {
      t.setActions([]);
      if (!spot.force(round2(a * m))) { UI.toast('Not enough bankroll', 'warn'); return decide(stage); }
      st.units += m;
      await rows.b.flip(stage);
      if (stage === 0) settleBonus();
      if (stage < 2) decide(stage + 1); else settle(false);
    };
    t.setActions([
      { label: 'Fold', key: 'f', cls: 'ghost', hint: hint && hint.r === 0, on: () => { t.setActions([]); settle(true); } },
      { label: '1x', key: '1', hint: hint && hint.r === 1, disabled: App.bank < a, on: () => raise(1) },
      { label: '2x', key: '2', disabled: App.bank < a * 2, on: () => raise(2) },
      { label: '3x', key: '3', cls: 'primary', hint: hint && hint.r === 3, disabled: App.bank < a * 3, on: () => raise(3) },
    ]);
  }
  function describe(cards) {
    if (cards.length >= 5) return Poker.best(cards).name;
    const rs = cards.map(c => c.r), counts = {};
    rs.forEach(r => counts[r] = (counts[r] || 0) + 1);
    const m = Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    if (m[0][1] === 4) return 'Four of a Kind';
    if (m[0][1] === 3) return 'Three of a Kind';
    if (m[0][1] === 2 && m[1] && m[1][1] === 2) return 'Two Pair';
    if (m[0][1] === 2) return 'Pair of ' + rankLabel(+m[0][0]) + 's';
    return rankLabel(Math.max(...rs)) + ' high';
  }
  function settleBonus() {
    if (!sp.bonus.amount) return;
    const e = Poker.eval3(st.p.concat([st.b[0]])), row = payRow(PAY.ms.bonus3, tcpKey(e));
    row ? (sp.bonus.win(row.pays, row.name), row.pays >= 25 && App.count('bigSide')) : sp.bonus.lose();
  }
  async function settle(folded) {
    for (let i = 0; i < 3; i++) if (rows.b.cards[i].classList.contains('down')) { await rows.b.flip(i); if (i === 0) settleBonus(); }
    const e = Poker.eval5(st.p.concat(st.b));
    $('#m-pl').textContent = e.name + (e.cat === 1 ? ` (${rankLabel(e.groups[0])}s)` : '');
    if (e.cat === 9) App.count('royals');
    if (sp.prog.amount) Progressives.settle('ms', sp.prog, CAT_KEYS[e.cat]);
    const main = [sp.ante, sp.s3, sp.s4, sp.s5];
    let text;
    if (folded) { main.forEach(s => s.lose()); text = 'Folded.'; }
    else {
      const m = mult(e);
      if (m > 0) { main.forEach(s => s.amount && s.win(m)); text = `${e.name} pays ${m} to 1 on every bet!`; }
      else if (m === 0) { main.forEach(s => s.push()); text = 'Mid pair: push.'; }
      else { main.forEach(s => s.lose()); text = `${e.name}. No luck.`; }
    }
    t.finishRound();
    betPhase(); t.msg(text);
  }
  return {
    id: 'ms', name: 'Mississippi Stud', icon: '🛶', blurb: 'Five-card stud with no dealer hand. Raise up to 3x on every street.',
    mount,
    info: () => [
      { title: 'How to play', text: 'Bet the Ante and get two cards; three community cards are dealt face down. Before each one is turned, raise 1x, 2x or 3x the ante, or fold. Your final five-card hand pays every bet on the layout.' },
      { title: 'Paytable (all bets)', rows: UI.payRows(PAY.ms.main) },
      { title: '3-Card Bonus (your two cards + the first community card)', rows: UI.payRows(PAY.ms.bonus3), rtp: RTP['ms.bonus3'] },
      { title: `Stud Jackpot (${fmt(PAY.ms.prog.cost)}): your final five cards`, rows: PAY.ms.prog.tiers.map(x => [x.name, x.pct ? (x.pct * 100) + '% of meter' : fmt(x.amt)]), rtp: Progressives.rtp('ms') },
    ],
  };
})();

/* ======================= Three Card Poker ======================= */
GAMES.tcp = (() => {
  let t, ctx, shoe, sp, rows, st;
  const sideMax = () => Math.max(25, ctx.limits.max / 4);
  function mount(table, c) {
    t = table; ctx = c; shoe = new Shoe(1, 1); t.shoe.classList.add('single');
    t.body.append(h('div.poker',
      h('div.dealer-area', h('div.area-l', 'Dealer ', h('span.tot#t-dl')), h('div.cards#t-dealer')),
      h('div.felt-arc', 'DEALER QUALIFIES WITH QUEEN HIGH · ANTE BONUS PAYS REGARDLESS OF DEALER'),
      h('div.player-area', h('div.cards#t-player'), h('div.area-l', h('span.tot#t-pl'))),
      h('div.spots-row', h('div.col', h('div.spots-row.tight#t-main')), h('div.col.sides#t-sides'))));
    rows = { d: new UI.CardRow($('#t-dealer')), p: new UI.CardRow($('#t-player')) };
    sp = {
      pp: t.spot({ key: 'pp', label: 'Pair Plus', sub: 'up to 200:1', cls: 'side', max: sideMax }),
      ante: t.spot({ key: 'ante', label: 'Ante', cls: 'main', max: ctx.limits.max }),
      play: t.spot({ key: 'play', label: 'Play', cls: 'main', passive: true }),
      six: t.spot({ key: 'six', label: '6-Card Bonus', sub: 'up to 1000:1', cls: 'side', max: sideMax }),
      prog: t.spot({ key: 'prog', label: 'Jackpot', sub: fmt(PAY.tcp.prog.cost), cls: 'side prog', fixed: PAY.tcp.prog.cost }),
    };
    $('#t-main').append(sp.pp.el, sp.ante.el, sp.play.el);
    $('#t-sides').append(sp.six.el, sp.prog.el, UI.meter('tcp', PAY.tcp.prog.name));
    betPhase();
  }
  function betPhase() {
    t.busy = false; ['pp', 'ante', 'six', 'prog'].forEach(k => sp[k].setLocked(false));
    t.msg('Bet the Ante and/or Pair Plus. 6-Card Bonus and the Jackpot are optional.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets(['pp', 'ante', 'six', 'prog']) },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }
  async function deal() {
    if (!sp.ante.amount && !sp.pp.amount) return UI.toast('Bet the Ante or Pair Plus', 'warn');
    if (sp.ante.amount && sp.ante.amount < ctx.limits.min) return UI.toast(`Minimum ante is ${fmt(ctx.limits.min)}`, 'warn');
    if ((sp.six.amount || sp.prog.amount) && !sp.ante.amount && !sp.pp.amount) return UI.toast('Side bets need a main bet', 'warn');
    t.busy = true; t.setActions([]); Object.values(sp).forEach(s => s.setLocked(true));
    t.saveBets(['pp', 'ante', 'six', 'prog']);
    if (sp.prog.amount) Progressives.contribute('tcp');
    shoe.shuffle(); rows.d.clear(); rows.p.clear(); $('#t-dl').textContent = ''; $('#t-pl').textContent = '';
    st = { p: [], d: [] };
    for (let i = 0; i < 3; i++) { const a = shoe.draw(); st.p.push(a); await rows.p.add(a); const b = shoe.draw(); st.d.push(b); await rows.d.add(b, true); }
    const me = Poker.eval3(st.p); $('#t-pl').textContent = me.name;
    // Pair Plus and the jackpot depend only on the player's cards
    if (sp.pp.amount) { const row = payRow(PAY.tcp.pairPlus, tcpKey(me)); row ? (sp.pp.win(row.pays, row.name), row.pays >= 25 && App.count('bigSide')) : sp.pp.lose(); }
    if (sp.prog.amount) {
      const k = me.miniRoyal ? (st.p.every(c => c.s === 0) ? 'spadeRoyal' : 'mini') : tcpKey(me);
      Progressives.settle('tcp', sp.prog, k);
    }
    if (!sp.ante.amount) return reveal(true);
    const good = me.cat > 0 || me.ranks[0] > 12 || (me.ranks[0] === 12 && (me.ranks[1] > 6 || (me.ranks[1] === 6 && me.ranks[2] >= 4)));
    const hint = App.perk('pokerhint') && App.state.settings.hints;
    t.msg(hint ? h('span', `You have ${me.name}. 📓 Doc: play Q-6-4 or better → `, h('b', good ? 'PLAY' : 'FOLD')) : `You have ${me.name}. Play (match your ante) or fold?`);
    t.setActions([
      { label: 'Fold', key: 'f', cls: 'ghost', hint: hint && !good, on: () => { t.setActions([]); reveal(true); } },
      { label: 'Play', key: 'p', cls: 'primary', hint: hint && good, disabled: App.bank < sp.ante.amount, on: () => { t.setActions([]); sp.play.force(sp.ante.amount); reveal(false); } },
    ]);
  }
  async function reveal(folded) {
    for (let i = 0; i < 3; i++) await rows.d.flip(i);
    const me = Poker.eval3(st.p), dl = Poker.eval3(st.d);
    const q = dl.cat > 0 || dl.high >= 12;
    $('#t-dl').textContent = dl.name + (q ? '' : ' (does not qualify)');
    if (sp.six.amount) {
      const e = Poker.best(st.p.concat(st.d)), row = payRow(PAY.tcp.six, CAT_KEYS[e.cat]);
      if (e.cat === 9) App.count('royals');
      row ? (sp.six.win(row.pays, row.name), row.pays >= 25 && App.count('bigSide')) : sp.six.lose();
    }
    let text = '';
    if (sp.ante.amount) {
      if (folded) { sp.ante.lose(); text = 'Folded.'; }
      else {
        const ab = payRow(PAY.tcp.anteBonus, tcpKey(me) === 'mini' ? 'sf' : tcpKey(me));
        if (ab) { App.credit(round2(sp.ante.amount * ab.pays)); t.addResult(0, round2(sp.ante.amount * ab.pays)); UI.toast(`Ante bonus: ${me.name} pays ${ab.pays} to 1`, 'good'); }
        if (!q) { sp.ante.win(1, 'No qualify'); sp.play.push(); text = 'Dealer doesn\'t qualify: Ante wins, Play pushes.'; }
        else if (me.score > dl.score) { sp.ante.win(1); sp.play.win(1); text = `You win with ${me.name}!`; }
        else if (me.score < dl.score) { sp.ante.lose(); sp.play.lose(); text = `Dealer wins with ${dl.name}.`; }
        else { sp.ante.push(); sp.play.push(); text = 'Tie: push.'; }
      }
    }
    t.finishRound();
    betPhase(); text && t.msg(text);
  }
  return {
    id: 'tcp', name: 'Three Card Poker', icon: '🃏', blurb: 'Fast three-card hands. Pair Plus up to 200:1 and a 6-Card Bonus.',
    mount,
    info: () => [
      { title: 'How to play', text: 'Bet the Ante and you get three cards. Play (bet equal to the Ante) or fold. Dealer needs Queen high to qualify; if not, the Ante pays 1:1 and Play pushes. Note: in three-card poker a straight beats a flush.' },
      { title: 'Ante Bonus (paid whenever you play)', rows: UI.payRows(PAY.tcp.anteBonus) },
      { title: 'Pair Plus (your three cards)', rows: UI.payRows(PAY.tcp.pairPlus), rtp: RTP['tcp.pairPlus'] },
      { title: '6-Card Bonus (best 5 of your 3 + dealer\'s 3)', rows: UI.payRows(PAY.tcp.six), rtp: RTP['tcp.six'] },
      { title: `Mini Royal Jackpot (${fmt(PAY.tcp.prog.cost)}): your three cards`, rows: PAY.tcp.prog.tiers.map(x => [x.name, x.pct ? (x.pct * 100) + '% of meter' : fmt(x.amt)]), rtp: Progressives.rtp('tcp') },
    ],
  };
})();

/* ======================= Let It Ride ======================= */
GAMES.lir = (() => {
  let t, ctx, shoe, sp, rows, st;
  const sideMax = () => Math.max(25, ctx.limits.max / 4);
  function mult(e) {
    if (e.cat === 1) return e.groups[0] >= 10 ? 1 : -1;
    if (e.cat === 0) return -1;
    return payRow(PAY.lir.main, CAT_KEYS[e.cat]).pays;
  }
  function evRide(cards) { // expected multiplier of a bet that rides from here to the end
    const rest = remainingDeck(cards); let s = 0, n = 0;
    if (cards.length === 4) { for (const c of rest) { s += mult(Poker.eval5(cards.concat([c]))); n++; } }
    else for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) { s += mult(Poker.eval5(cards.concat([rest[i], rest[j]]))); n++; }
    return s / n;
  }
  function mount(table, c) {
    t = table; ctx = c; shoe = new Shoe(1, 1); t.shoe.classList.add('single');
    t.body.append(h('div.poker',
      h('div.board-area', h('div.area-l', 'Community cards'), h('div.cards.board#l-board')),
      h('div.felt-arc', 'PAIR OF 10s OR BETTER PAYS · PULL BACK UP TO TWO BETS'),
      h('div.player-area', h('div.cards#l-player'), h('div.area-l', h('span.tot#l-pl'))),
      h('div.spots-row', h('div.col', h('div.spots-row.tight#l-main')), h('div.col.sides#l-sides'))));
    rows = { b: new UI.CardRow($('#l-board')), p: new UI.CardRow($('#l-player')) };
    const sync = () => { // the three main bets are always equal
      for (const k of ['b2', 'b3']) {
        const d = round2(sp.b1.amount - sp[k].amount);
        if (d > 0) { if (!sp[k].force(d)) { sp.b1.undo(); UI.toast('You need three equal bets', 'warn'); return; } }
        else if (d < 0) { App.credit(-d); sp[k].amount = sp.b1.amount; sp[k].history = [sp.b1.amount]; sp[k].render(); }
      }
    };
    sp = {
      b1: t.spot({ key: 'b1', label: '1', cls: 'main', max: ctx.limits.max / 3, onChange: sync }),
      b2: t.spot({ key: 'b2', label: '2', cls: 'main', passive: true }),
      b3: t.spot({ key: 'b3', label: '$', cls: 'main', passive: true }),
      bonus: t.spot({ key: 'bonus', label: '3-Card Bonus', sub: 'up to 100:1', cls: 'side', max: sideMax }),
    };
    $('#l-main').append(sp.b1.el, sp.b2.el, sp.b3.el); $('#l-sides').append(sp.bonus.el);
    betPhase();
  }
  function betPhase() {
    t.busy = false; ['b1', 'bonus'].forEach(k => sp[k].setLocked(false));
    t.msg('Place your bet on spot 1; spots 2 and $ match it. You can pull back 1 and 2 later.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets(['b1', 'bonus']) },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }
  async function deal() {
    if (sp.b1.amount < ctx.limits.min) return UI.toast(`Minimum is ${fmt(ctx.limits.min)} per spot`, 'warn');
    t.busy = true; t.setActions([]); Object.values(sp).forEach(s => s.setLocked(true));
    t.saveBets(['b1', 'bonus']);
    shoe.shuffle(); rows.b.clear(); rows.p.clear();
    st = { p: [shoe.draw(), shoe.draw(), shoe.draw()], b: [shoe.draw(), shoe.draw()] };
    for (const c of st.p) await rows.p.add(c);
    for (const c of st.b) await rows.b.add(c, true);
    $('#l-pl').textContent = Poker.eval3(st.p).name;
    if (sp.bonus.amount) { const row = payRow(PAY.lir.bonus3, tcpKey(Poker.eval3(st.p))); row ? (sp.bonus.win(row.pays, row.name), row.pays >= 25 && App.count('bigSide')) : sp.bonus.lose(); }
    decide(0);
  }
  function decide(stage) {
    const spot = stage === 0 ? sp.b1 : sp.b2, cards = st.p.concat(st.b.slice(0, stage));
    let hint = null;
    if (App.perk('pokerhint') && App.state.settings.hints) hint = evRide(cards) >= 0 ? 'ride' : 'pull';
    t.msg(hint ? h('span', `Bet ${stage + 1}. 📓 Doc: `, h('b', hint === 'ride' ? 'LET IT RIDE' : 'PULL IT BACK')) : `Pull back bet ${stage + 1}, or let it ride?`);
    const next = async pull => {
      t.setActions([]);
      if (pull) spot.refund(spot.amount, 'Pulled back');
      await rows.b.flip(stage);
      if (stage === 0) decide(1); else settle();
    };
    t.setActions([
      { label: 'Pull Back', key: 'p', hint: hint === 'pull', on: () => next(true) },
      { label: 'Let It Ride', key: 'l', cls: 'primary', hint: hint === 'ride', on: () => next(false) },
    ]);
  }
  function settle() {
    // pulled-back bets were already refunded; refund() counted them as wagered & returned, which is fine for stats
    const e = Poker.eval5(st.p.concat(st.b)), m = mult(e);
    $('#l-pl').textContent = e.name;
    if (e.cat === 9) App.count('royals');
    for (const s of [sp.b1, sp.b2, sp.b3]) if (s.amount) m > 0 ? s.win(m) : s.lose();
    t.finishRound();
    betPhase(); t.msg(m > 0 ? `${e.name} pays ${m} to 1!` : `${e.name}. Better luck next hand.`);
  }
  return {
    id: 'lir', name: 'Let It Ride', icon: '🎠', blurb: 'Three bets, two chances to pull them back. Royals pay 1000:1.',
    mount,
    info: () => [
      { title: 'How to play', text: 'Make three equal bets. You get three cards, and two community cards are face down. After seeing your cards you may pull back bet 1; after the first community card, bet 2. The $ bet always rides. Your five-card hand pays every bet still up.' },
      { title: 'Paytable', rows: UI.payRows(PAY.lir.main) },
      { title: '3-Card Bonus (your three cards)', rows: UI.payRows(PAY.lir.bonus3), rtp: RTP['lir.bonus3'] },
    ],
  };
})();

/* ======================= Casino War ======================= */
GAMES.war = (() => {
  const shoes = {};
  let t, ctx, shoe, sp, rows;
  function mount(table, c) {
    t = table; ctx = c; shoe = shoes[ctx.venueId] || (shoes[ctx.venueId] = new Shoe(6, 0.8));
    t.body.append(h('div.war',
      h('div.dealer-area', h('div.area-l', 'Dealer'), h('div.cards#w-dealer')),
      h('div.felt-arc', `TIE PAYS ${PAY.war.tie} TO 1 · SUITED TIE PAYS ${PAY.war.suitedTie} TO 1 · ACES HIGH`),
      h('div.player-area', h('div.cards#w-player'), h('div.area-l', 'You')),
      h('div.spots-row#w-spots')));
    rows = { d: new UI.CardRow($('#w-dealer')), p: new UI.CardRow($('#w-player')) };
    sp = {
      bet: t.spot({ key: 'bet', label: 'WAR', cls: 'main', max: ctx.limits.max }),
      raise: t.spot({ key: 'raise', label: 'Raise', cls: 'main', passive: true }),
      tie: t.spot({ key: 'tie', label: 'Tie', sub: `${PAY.war.tie}:1`, cls: 'side', max: Math.max(25, ctx.limits.max / 4) }),
    };
    $('#w-spots').append(sp.bet.el, sp.raise.el, sp.tie.el);
    betPhase();
  }
  function betPhase() {
    t.busy = false; sp.bet.setLocked(false); sp.tie.setLocked(false);
    t.msg('High card wins. Ties: surrender half or go to war.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets(['bet', 'tie']) },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }
  async function deal() {
    if (sp.bet.amount < ctx.limits.min) return UI.toast(`Minimum bet is ${fmt(ctx.limits.min)}`, 'warn');
    t.busy = true; t.setActions([]); Object.values(sp).forEach(s => s.setLocked(true));
    t.saveBets(['bet', 'tie']);
    if (shoe.needsShuffle) shoe.shuffle();
    rows.d.clear(); rows.p.clear();
    const p = shoe.draw(), d = shoe.draw();
    await rows.p.add(p); await rows.d.add(d);
    if (sp.tie.amount) {
      if (p.r === d.r) { const s = p.s === d.s; sp.tie.win(s ? PAY.war.suitedTie : PAY.war.tie, s ? 'Suited tie!' : 'Tie'); }
      else sp.tie.lose();
    }
    if (p.r > d.r) { sp.bet.win(1); return done('You win!'); }
    if (p.r < d.r) { sp.bet.lose(); return done('Dealer wins.'); }
    t.msg('It\'s a tie! Go to war (match your bet) or surrender half?');
    t.setActions([
      { label: 'Surrender', key: 's', cls: 'ghost', on: () => { t.setActions([]); sp.bet.refund(round2(sp.bet.amount / 2), 'Half back'); done('Surrendered.'); } },
      { label: 'Go to War!', key: 'w', cls: 'primary', disabled: App.bank < sp.bet.amount, on: war },
    ]);
  }
  async function war() {
    t.setActions([]); sp.raise.force(sp.bet.amount);
    t.showBanner('⚔️ WAR!', 'push', 900);
    for (let i = 0; i < 3; i++) shoe.draw(); // burn three
    const p = shoe.draw(), d = shoe.draw();
    await rows.p.add(p); await rows.d.add(d);
    if (p.r >= d.r) { // win or tie in war: raise wins, original pushes (tie: both win)
      sp.raise.win(1);
      p.r === d.r ? sp.bet.win(1, 'Tie at war bonus') : sp.bet.push();
      done(p.r === d.r ? 'Tie at war! Both bets win.' : 'You win the war!');
    } else { sp.raise.lose(); sp.bet.lose(); done('Dealer wins the war.'); }
  }
  function done(text) { t.finishRound(); betPhase(); t.msg(text); }
  return {
    id: 'war', name: 'Casino War', icon: '⚔️', blurb: 'The simplest game in the house. High card wins.',
    mount,
    info: () => [
      { title: 'How to play', text: 'You and the dealer each get one card; high card wins 1:1 (aces high). On a tie you can surrender half your bet, or go to war: match your bet, three cards are burned and one more is dealt to each. Win or tie the war and your raise wins 1:1 (a tie at war pays the original bet too); lose and both bets lose.' },
      { title: 'Tie bet', rows: [['Suited Tie', PAY.war.suitedTie + ' to 1'], ['Tie', PAY.war.tie + ' to 1']], rtp: RTP['war.tie'] },
    ],
  };
})();
