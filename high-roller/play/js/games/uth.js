/* Ultimate Texas Hold'em: Ante = Blind, raise 4x/3x pre-flop, 2x on the flop, 1x on the river.
   Side bets: Trips, Pocket Bonus (hole cards) and a Hold'em Jackpot on hole cards + flop. */
GAMES.uth = (() => {
  let t, ctx, shoe, sp, rows, st;
  const sideMax = () => Math.max(25, ctx.limits.max / 4);
  const CK = ['high', 'pair', 'twopair', 'trips', 'straight', 'flush', 'fh', 'quads', 'sf', 'royal'];

  function mount(table, c) {
    t = table; ctx = c; shoe = new Shoe(1, 1);
    t.shoe.classList.add('single');
    t.body.append(h('div.poker',
      h('div.dealer-area', h('div.area-l', 'Dealer ', h('span.tot#u-dl')), h('div.cards#u-dealer')),
      h('div.board-area', h('div.cards.board#u-board')),
      h('div.felt-arc', 'DEALER NEEDS A PAIR TO QUALIFY · BLIND PAYS ON A STRAIGHT OR BETTER'),
      h('div.player-area', h('div.cards#u-player'), h('div.area-l', h('span.tot#u-pl'))),
      h('div.spots-row', h('div.col', h('div.spots-row.tight#u-main')), h('div.col.sides#u-sides'))));
    rows = { d: new UI.CardRow($('#u-dealer')), b: new UI.CardRow($('#u-board')), p: new UI.CardRow($('#u-player')) };
    const syncBlind = () => { // blind always mirrors the ante
      const diff = round2(sp.ante.amount - sp.blind.amount);
      if (diff > 0) { if (!sp.blind.force(diff)) { sp.ante.undo(); UI.toast('Ante needs a matching Blind', 'warn'); } }
      else if (diff < 0) { App.credit(-diff); sp.blind.amount = sp.ante.amount; sp.blind.history = [sp.ante.amount]; sp.blind.render(); }
    };
    sp = {
      trips: t.spot({ key: 'trips', label: 'Trips', sub: 'up to 100:1', cls: 'side', max: sideMax }),
      ante: t.spot({ key: 'ante', label: 'Ante', cls: 'main', max: ctx.limits.max, onChange: syncBlind }),
      blind: t.spot({ key: 'blind', label: 'Blind', cls: 'main', passive: true }),
      play: t.spot({ key: 'play', label: 'Play', cls: 'main', passive: true }),
      pocket: t.spot({ key: 'pocket', label: 'Pocket Bonus', sub: 'AA pays 35:1', cls: 'side', max: sideMax }),
      prog: t.spot({ key: 'prog', label: 'Jackpot', sub: fmt(PAY.uth.prog.cost), cls: 'side prog', fixed: PAY.uth.prog.cost }),
    };
    $('#u-main').append(sp.trips.el, sp.ante.el, sp.blind.el, sp.play.el);
    $('#u-sides').append(sp.pocket.el, sp.prog.el, UI.meter('uth', PAY.uth.prog.name));
    betPhase();
  }

  function betPhase() {
    t.busy = false;
    ['trips', 'ante', 'pocket', 'prog'].forEach(k => sp[k].setLocked(false));
    t.msg('Bet the Ante (the Blind matches it automatically). Trips, Pocket Bonus and the Jackpot are optional.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => { t.clearBets(['trips', 'ante', 'pocket', 'prog']); } },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }

  async function deal() {
    if (sp.ante.amount < ctx.limits.min) return UI.toast(`Minimum ante is ${fmt(ctx.limits.min)}`, 'warn');
    if (App.bank < sp.ante.amount - 1e-9) return UI.toast('Keep enough to raise at least 1x your ante', 'warn');
    t.busy = true; t.setActions([]);
    Object.values(sp).forEach(s => s.setLocked(true));
    t.saveBets(['trips', 'ante', 'pocket', 'prog']);
    if (sp.prog.amount) Progressives.contribute('uth');
    shoe.shuffle();
    Object.values(rows).forEach(r => r.clear()); $('#u-dl').textContent = ''; $('#u-pl').textContent = '';
    st = { p: [], d: [], b: [], raised: false };
    for (let i = 0; i < 2; i++) {
      const pc = shoe.draw(); st.p.push(pc); await rows.p.add(pc);
      const dc = shoe.draw(); st.d.push(dc); await rows.d.add(dc, true);
    }
    for (let i = 0; i < 5; i++) st.b.push(shoe.draw());
    settlePocket();
    decision(0);
  }

  function settlePocket() {
    if (!sp.pocket.amount) return;
    const [a, b] = st.p, hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r), s = a.s === b.s;
    let k = null;
    if (a.r === b.r) k = a.r === 14 ? 'AA' : 'pair';
    else if (hi === 14 && lo === 13) k = s ? 'AKs' : 'AKo';
    else if (hi === 14 && (lo === 12 || lo === 11)) k = s ? 'AQJs' : 'AQJo';
    const row = k && PAY.uth.pocket.find(r => r.key === k);
    row ? (sp.pocket.win(row.pays, row.name), row.pays >= 25 && App.count('bigSide')) : sp.pocket.lose();
  }

  /* ---------- strategy hints ---------- */
  function preflopHint() {
    const [a, b] = st.p, hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r), s = a.s === b.s;
    if (a.r === b.r) return a.r >= 3 ? 4 : 0;
    if (hi === 14) return 4;
    if (hi === 13) return (s ? lo >= 2 : lo >= 5) ? 4 : 0;
    if (hi === 12) return (s ? lo >= 6 : lo >= 8) ? 4 : 0;
    if (hi === 11) return (s ? lo >= 8 : lo >= 10) ? 4 : 0;
    return 0;
  }
  function flopHint() {
    const all = st.p.concat(st.b.slice(0, 3)), e = Poker.best(all);
    if (e.cat >= 3) return 2;
    if (e.cat === 2 && st.p.some(c => e.groups.slice(0, 2).includes(c.r))) return 2;
    if (e.cat === 1 && st.p.some(c => c.r === e.groups[0]) && e.groups[0] > 2) return 2;
    for (let s = 0; s < 4; s++) {
      const n = all.filter(c => c.s === s).length;
      if (n >= 4 && st.p.some(c => c.s === s && c.r >= 10)) return 2;
    }
    return 0;
  }
  // exact: compare betting 1x with folding by enumerating every dealer hand
  function riverHint() {
    const used = new Set(st.p.concat(st.b).map(cardName));
    const rest = []; for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!used.has(rankLabel(r) + SUIT_SYM[s])) rest.push({ r, s });
    const me = Poker.best(st.p.concat(st.b)), blindPay = blindMult(me);
    let ev = 0, n = 0;
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
      const d = Poker.best([rest[i], rest[j]].concat(st.b)); n++;
      const q = d.cat >= 1;
      if (me.score > d.score) ev += 1 + (q ? 1 : 0) + blindPay;
      else if (me.score < d.score) ev -= 1 + (q ? 1 : 0) + 1;
    }
    return ev / n > -2 ? 1 : 0;
  }
  function blindMult(e) { const row = PAY.uth.blind.find(r => r.key === CK[e.cat]); return row ? row.pays : 0; }

  function decision(stage) {
    const hint = App.perk('pokerhint') && App.state.settings.hints;
    const a = sp.ante.amount;
    const raise = async m => {
      t.setActions([]);
      if (!sp.play.force(round2(a * m))) { UI.toast('Not enough bankroll for that raise', 'warn'); return decision(stage); }
      st.raised = true; await runOut(stage); showdown(false);
    };
    const check = async () => { t.setActions([]); await reveal(stage); decision(stage + 1); };
    if (stage === 0) {
      const hv = hint ? preflopHint() : -1;
      t.msg(hint ? `Pre-flop. 📓 Doc says: ${hv ? 'RAISE 4x' : 'check'}.` : 'Pre-flop: raise 4x or 3x now, or check.');
      t.setActions([
        { label: 'Check', key: 'k', hint: hv === 0, on: check },
        { label: 'Bet 3x', key: '3', disabled: App.bank < a * 3, on: () => raise(3) },
        { label: 'Bet 4x', key: '4', cls: 'primary', hint: hv === 4, disabled: App.bank < a * 4, on: () => raise(4) },
      ]);
    } else if (stage === 1) {
      const hv = hint ? flopHint() : -1;
      t.msg(hint ? `The flop. 📓 Doc says: ${hv ? 'BET 2x' : 'check'}.` : 'The flop: bet 2x or check.');
      t.setActions([
        { label: 'Check', key: 'k', hint: hv === 0, on: check },
        { label: 'Bet 2x', key: '2', cls: 'primary', hint: hv === 2, disabled: App.bank < a * 2, on: () => raise(2) },
      ]);
    } else {
      const hv = hint ? riverHint() : -1;
      t.msg(hint ? `The river. 📓 Doc ran the numbers: ${hv ? 'BET 1x' : 'fold'}.` : 'The river: bet 1x or fold.');
      t.setActions([
        { label: 'Fold', key: 'f', cls: 'ghost', hint: hv === 0, on: () => { t.setActions([]); showdown(true); } },
        { label: 'Bet 1x', key: '1', cls: 'primary', hint: hv === 1, on: () => raise(1) },
      ]);
    }
  }

  async function reveal(stage) { // stage 0 -> flop, 1 -> turn+river
    if (stage === 0) { for (let i = 0; i < 3; i++) await rows.b.add(st.b[i]); settleProg(); }
    else if (stage === 1) { for (let i = 3; i < 5; i++) await rows.b.add(st.b[i]); }
    $('#u-pl').textContent = Poker.best(st.p.concat(st.b.slice(0, rows.b.cards.length))).name;
  }
  async function runOut(stage) { for (let s = stage; s < 2; s++) await reveal(s); }

  function settleProg() {
    if (!sp.prog.amount) return;
    const e = Poker.eval5(st.p.concat(st.b.slice(0, 3)));
    Progressives.settle('uth', sp.prog, CK[e.cat]);
  }

  async function showdown(folded) {
    if (rows.b.cards.length < 5) await runOut(rows.b.cards.length ? 1 : 0);
    await rows.d.flip(0); await rows.d.flip(1);
    const me = Poker.best(st.p.concat(st.b)), dl = Poker.best(st.d.concat(st.b));
    $('#u-pl').textContent = me.name; $('#u-dl').textContent = dl.name + (dl.cat < 1 ? ' (does not qualify)' : '');
    if (me.cat === 9) App.count('royals');
    rows.p.highlight(me.cards); rows.b.highlight(me.cards);
    // trips pays on the player's hand even after a fold
    if (sp.trips.amount) {
      const row = PAY.uth.trips.find(r => r.key === CK[me.cat]);
      row ? (sp.trips.win(row.pays, row.name), row.pays >= 25 && App.count('bigSide')) : sp.trips.lose();
    }
    let text;
    if (folded) { sp.ante.lose(); sp.blind.lose(); text = 'You folded.'; }
    else {
      const q = dl.cat >= 1;
      if (me.score > dl.score) {
        sp.play.win(1);
        q ? sp.ante.win(1) : sp.ante.push('No qualify');
        const bm = blindMult(me); bm ? sp.blind.win(bm, me.name) : sp.blind.push();
        text = `You win with ${me.name}!`;
      } else if (me.score < dl.score) {
        sp.play.lose(); q ? sp.ante.lose() : sp.ante.push('No qualify'); sp.blind.lose();
        text = `Dealer wins with ${dl.name}.`;
      } else { sp.play.push(); sp.ante.push(); sp.blind.push(); text = 'Split pot. Everything pushes.'; }
    }
    t.finishRound();
    betPhase(); t.msg(text);
  }

  return {
    id: 'uth', name: "Ultimate Texas Hold'em", icon: '🤠', blurb: 'Heads-up hold\'em against the dealer. Raise big early, or wait for the river.',
    mount,
    info: () => [
      { title: 'How to play', text: 'Bet equal Ante and Blind. After your two cards: raise 3x or 4x the ante, or check. After the flop: raise 2x or check. After the river: raise 1x or fold. You may only raise once. The dealer needs a pair to qualify; if not, the Ante pushes. The Blind pays on a winning straight or better and otherwise pushes on a win.' },
      { title: 'Blind paytable', rows: UI.payRows(PAY.uth.blind) },
      { title: 'Trips (your best 7-card hand, win or lose)', rows: UI.payRows(PAY.uth.trips), rtp: RTP['uth.trips'] },
      { title: 'Pocket Bonus (your two hole cards)', rows: UI.payRows(PAY.uth.pocket), rtp: RTP['uth.pocket'] },
      { title: `Hold'em Jackpot (${fmt(PAY.uth.prog.cost)}): your hole cards + the flop`, rows: PAY.uth.prog.tiers.map(x => [x.name, x.pct ? (x.pct * 100) + '% of meter' : fmt(x.amt)]), rtp: Progressives.rtp('uth') },
    ],
  };
})();
