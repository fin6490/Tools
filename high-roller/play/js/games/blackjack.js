/* Blackjack: 6-deck shoe, splits/doubles/surrender/insurance by venue rules,
   Perfect Pairs, 21+3 and the Blazing 7s progressive. */
GAMES.bj = (() => {
  const shoes = {};
  let t, ctx, R, shoe, dealer, hands, active, sp, insSpot;

  const cv = c => (c.r >= 10 && c.r <= 13 ? 10 : c.r === 14 ? 11 : c.r);
  function total(cards) {
    let v = 0, aces = 0;
    for (const c of cards) { v += cv(c); if (c.r === 14) aces++; }
    while (v > 21 && aces) { v -= 10; aces--; }
    return { v, soft: aces > 0 && v <= 21 };
  }
  const isBJ = cards => cards.length === 2 && total(cards).v === 21;
  const totalLabel = cards => { const t2 = total(cards); return t2.soft && t2.v < 21 ? `${t2.v - 10}/${t2.v}` : String(t2.v); };

  /* ---------- basic strategy (multi-deck) ---------- */
  function strategy(hand, up) {
    const cards = hand.cards, d = up.r === 14 ? 11 : cv(up), { v, soft } = total(cards);
    const two = cards.length === 2, canDbl = two && (!hand.split || R.das);
    const canSplit = two && cv(cards[0]) === cv(cards[1]) && hands.length < R.maxHands;
    const canSur = two && !hand.split && R.surrender;
    const D = alt => (canDbl ? 'D' : alt);
    if (canSplit) {
      const p = cv(cards[0]);
      if (p === 11 || p === 8) return 'P';
      if (p === 9 && ![7, 10, 11].includes(d)) return 'P';
      if (p === 7 && d <= 7) return 'P';
      if (p === 6 && d <= 6 && (R.das || d >= 3)) return 'P';
      if (p === 4 && R.das && (d === 5 || d === 6)) return 'P';
      if ((p === 2 || p === 3) && d <= 7 && (R.das || d >= 4)) return 'P';
    }
    if (canSur) {
      if (!soft && v === 16 && d >= 9) return 'R';
      if (!soft && v === 15 && (d === 10 || (R.h17 && d === 11))) return 'R';
      if (!soft && v === 17 && R.h17 && d === 11) return 'R';
    }
    if (soft) {
      if (v >= 20) return 'S';
      if (v === 19) return R.h17 && d === 6 ? D('S') : 'S';
      if (v === 18) { if (d <= 6 && (R.h17 || d >= 3)) return D('S'); return d <= 8 ? 'S' : 'H'; }
      if (v === 17) return d >= 3 && d <= 6 ? D('H') : 'H';
      if (v === 15 || v === 16) return d >= 4 && d <= 6 ? D('H') : 'H';
      return d === 5 || d === 6 ? D('H') : 'H';
    }
    if (v >= 17) return 'S';
    if (v >= 13) return d <= 6 ? 'S' : 'H';
    if (v === 12) return d >= 4 && d <= 6 ? 'S' : 'H';
    if (v === 11) return d === 11 && !R.h17 ? 'H' : D('H');
    if (v === 10) return d <= 9 ? D('H') : 'H';
    if (v === 9) return d >= 3 && d <= 6 ? D('H') : 'H';
    return 'H';
  }

  function sideMax() { return Math.max(25, ctx.limits.max / 4); }

  function mount(table, c) {
    t = table; ctx = c;
    R = Object.assign({ bjPays: 1.5, h17: true, das: true, surrender: false, maxHands: 4, rsa: false }, ctx.rules);
    shoe = shoes[ctx.venueId] || (shoes[ctx.venueId] = new Shoe(6, 0.75));
    const prog = PAY.bj.prog;
    t.body.append(h('div.bj',
      h('div.dealer-area', h('div.area-l', 'Dealer ', h('span.tot#bj-dtot')), h('div.cards#bj-dealer')),
      h('div.felt-arc', `BLACKJACK PAYS ${R.bjPays === 1.5 ? '3 TO 2' : '6 TO 5'} · DEALER ${R.h17 ? 'HITS' : 'STANDS ON'} SOFT 17 · INSURANCE PAYS 2 TO 1`),
      h('div.hands#bj-hands'),
      h('div.spots-row#bj-spots')));
    dealer = new UI.CardRow($('#bj-dealer'));
    sp = {
      pp: t.spot({ key: 'pp', label: 'Perfect Pairs', sub: `up to ${PAY.bj.perfectPairs[0].pays}:1`, cls: 'side', max: sideMax }),
      main: t.spot({ key: 'main', label: 'BET', sub: `${fmt(ctx.limits.min)}–${fmt(ctx.limits.max, { short: true })}`, cls: 'main', max: ctx.limits.max }),
      p3: t.spot({ key: 'p3', label: '21+3', sub: `up to ${PAY.bj.plus3[0].pays}:1`, cls: 'side', max: sideMax }),
      prog: t.spot({ key: 'prog', label: 'Blazing 7s', sub: fmt(prog.cost), cls: 'side prog', fixed: prog.cost }),
      main2: t.spot({ key: 'main2', label: 'HAND 2', sub: `${fmt(ctx.limits.min)}+`, cls: 'main', max: ctx.limits.max }),
      main3: t.spot({ key: 'main3', label: 'HAND 3', sub: `${fmt(ctx.limits.min)}+`, cls: 'main', max: ctx.limits.max }),
    };
    insSpot = new UI.BetSpot({ key: 'ins', label: 'Insurance', cls: 'side', passive: true, table: t });
    $('#bj-spots').append(sp.pp.el, sp.main.el, sp.p3.el, sp.main2.el, sp.main3.el, sp.prog.el, h('div.meter-wrap', UI.meter('bj', prog.name)));
    // play one, two or three hands at once; side bets ride on hand 1
    const pickN = n => { App.state.flags.bjHands = n; for (const [k, i] of [['main2', 2], ['main3', 3]]) { sp[k].el.hidden = n < i; if (n < i && !sp[k].locked) sp[k].clear(); } sp.main.el.querySelector('.spot-label').textContent = n > 1 ? 'HAND 1' : 'BET'; $$('.bj-n button').forEach(b => b.classList.toggle('on', +b.dataset.n === n)); };
    t.extraEl.after(h('div.bj-n', h('span.muted.small', 'Hands'), ...[1, 2, 3].map(n => h('button.btn.sm.ghost', { 'data-n': n, onclick: () => { if (!t.busy) pickN(n); } }, n))));
    pickN(App.state.flags.bjHands || 1);
    t.extraSpots = [insSpot];
    hands = []; updateCount();
    betPhase();
  }

  function updateCount() {
    if (!App.perk('count')) { t.extraEl.textContent = `Shoe ${Math.round(shoe.remaining / 52 * 10) / 10} decks`; return; }
    const tc = shoe.trueCount;
    t.extraEl.innerHTML = '';
    t.extraEl.append(h('span.count' + (tc >= 2 ? '.good' : tc <= -1 ? '.bad' : ''), `RC ${shoe.running > 0 ? '+' : ''}${shoe.running} · TC ${tc >= 0 ? '+' : ''}${tc.toFixed(1)}`),
      h('span.muted', ` · ${(shoe.remaining / 52).toFixed(1)} decks left`));
  }
  const see = c => { shoe.see(c); updateCount(); };

  function betPhase() {
    t.busy = false;
    Object.values(sp).forEach(s => s.setLocked(false));
    t.msg(App.perk('count') && shoe.trueCount >= 2 ? 'The count is hot. Place your bets.' : 'Place your bets. Click a spot to add the selected chip; right-click or long-press to remove.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets() },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }

  async function deal() {
    if (sp.main.amount < ctx.limits.min) return UI.toast(`Minimum bet is ${fmt(ctx.limits.min)}`, 'warn');
    t.busy = true; t.setActions([]);
    Object.values(sp).forEach(s => s.setLocked(true));
    const extra = [sp.main2, sp.main3].filter(s => !s.el.hidden && s.amount > 0);
    if (extra.some(s => s.amount < ctx.limits.min)) { t.busy = false; Object.values(sp).forEach(s => s.setLocked(false)); betPhase(); return UI.toast(`Each hand needs at least ${fmt(ctx.limits.min)}`, 'warn'); }
    t.saveBets(['pp', 'main', 'p3', 'prog', 'main2', 'main3']);
    if (sp.prog.amount) Progressives.contribute('bj');
    if (shoe.needsShuffle) { t.msg('Shuffling a fresh shoe…'); shoe.shuffle(); updateCount(); t.showBanner('NEW SHOE', 'push', 900); await sleep(900); }
    dealer.clear(); $('#bj-hands').innerHTML = ''; $('#bj-dtot').textContent = '';
    hands = [newHand(sp.main, extra.length ? 'Hand 1' : '')].concat(extra.map((s, i) => newHand(s, 'Hand ' + (i + 2))));
    const h0 = hands[0];
    // one card to each hand, the dealer's up card, a second card each, then the hole card
    for (const hd of hands) { const c = shoe.draw(); await addCard(hd, c); see(c); }
    const p1 = h0.cards[0];
    const up = shoe.draw(); await dealer.add(up); see(up);
    for (const hd of hands) { const c = shoe.draw(); await addCard(hd, c); see(c); }
    const p2 = h0.cards[1];
    const hole = shoe.draw(); await dealer.add(hole, true);
    dealer.hole = hole; dealer.up = up;
    $('#bj-dtot').textContent = totalLabel([up]);
    settleSides(p1, p2, up);
    // insurance / even money
    const mainTotal = hands.reduce((a, hd) => a + hd.spot.amount, 0);
    if (up.r === 14 && App.bank >= mainTotal / 2 - 1e-9) {
      const single = hands.length === 1 && isBJ(h0.cards);
      const take = await choice(single ? 'Dealer shows an Ace. Even money?' : `Dealer shows an Ace. Insurance${hands.length > 1 ? ' on all your hands' : ''}?`,
        [{ label: single ? 'Even Money' : 'Insurance', key: 'i', v: true, cls: 'primary' }, { label: 'No thanks', key: 'n', v: false }]);
      if (take) { insSpot.force(round2(mainTotal / 2)); $('#bj-spots').prepend(insSpot.el); }
    }
    // dealer peeks with an Ace or ten up
    if (up.r === 14 || cv(up) === 10) {
      const dbj = isBJ([up, hole]);
      if (insSpot.amount) { dbj ? insSpot.win(2, 'Insurance') : insSpot.lose('Insurance'); }
      if (dbj) {
        await dealer.flip(1); see(hole); $('#bj-dtot').textContent = 'Blackjack';
        for (const hd of hands) isBJ(hd.cards) ? hd.spot.push('Both blackjack') : hd.spot.lose('Dealer blackjack');
        return endRound('Dealer has blackjack.');
      } else if (up.r === 14) t.msg('Dealer peeks… no blackjack.');
      await sleep(300);
    }
    for (const hd of hands) if (isBJ(hd.cards)) { App.count('blackjacks'); hd.spot.win(R.bjPays, 'Blackjack!'); hd.done = true; markHand(hd, 'BLACKJACK'); }
    if (hands.every(hd => hd.done)) {
      await dealer.flip(1); see(hole); $('#bj-dtot').textContent = totalLabel([up, hole]);
      return endRound('Blackjack!');
    }
    active = 0; playTurn();
  }

  function settleSides(p1, p2, up) {
    if (sp.pp.amount) {
      if (p1.r === p2.r) {
        const k = p1.s === p2.s ? 0 : isRed(p1.s) === isRed(p2.s) ? 1 : 2, row = PAY.bj.perfectPairs[k];
        sp.pp.win(row.pays, row.name.split(' (')[0]); if (row.pays >= 25) App.count('bigSide');
      } else sp.pp.lose();
    }
    if (sp.p3.amount) {
      const e = Poker.eval3([p1, p2, up]);
      let key = null;
      if (e.cat === 4) key = p1.s === p2.s && p2.s === up.s ? 'suitedTrips' : 'trips';
      else if (e.cat === 5) key = 'straightFlush'; else if (e.cat === 3) key = 'straight'; else if (e.cat === 2) key = 'flush';
      const row = key && PAY.bj.plus3.find(r => r.key === key);
      if (row) { sp.p3.win(row.pays, row.name); if (row.pays >= 25) App.count('bigSide'); } else sp.p3.lose();
    }
    if (sp.prog.amount) {
      const n7 = [p1, p2, up].filter(c => c.r === 7).length;
      let k = null;
      if (n7 === 3) k = p1.s === p2.s && p2.s === up.s ? 's777' : '777';
      else if (p1.r === 7 && p2.r === 7) k = p1.s === p2.s ? 's77' : '77';
      else if (p1.r === 7 || p2.r === 7) k = '7';
      Progressives.settle('bj', sp.prog, k);
    }
    Router.hud();
  }

  function newHand(spot, name) {
    const wrap = h('div.hand', name ? h('div.hand-name', name) : null, h('div.cards'), h('div.hand-tot'), h('div.hand-bet'));
    $('#bj-hands').append(wrap);
    const hd = { cards: [], row: new UI.CardRow(wrap.querySelector('.cards')), wrap, spot, split: false, done: false, doubled: false };
    return hd;
  }
  async function addCard(hd, c) {
    hd.cards.push(c); await hd.row.add(c);
    hd.wrap.querySelector('.hand-tot').textContent = totalLabel(hd.cards);
  }
  function markHand(hd, text, cls = '') { const tEl = hd.wrap.querySelector('.hand-tot'); tEl.textContent = text; tEl.className = 'hand-tot ' + cls; }
  function showHandBet(hd) { const b = hd.wrap.querySelector('.hand-bet'); b.textContent = fmt(hd.spot.amount) + (hd.doubled ? ' ×2' : ''); }

  function choice(msg, opts) {
    return new Promise(res => { t.msg(msg); t.setActions(opts.map(o => ({ ...o, on: () => { t.setActions([]); res(o.v); } }))); });
  }

  function playTurn() {
    const hd = hands[active];
    if (!hd) return dealerTurn();
    if (hd.done) { active++; return playTurn(); }
    $$('.hand').forEach((w, i) => w.classList.toggle('active', i === active));
    const { v } = total(hd.cards), two = hd.cards.length === 2;
    if (v >= 21) { hd.done = true; if (v > 21) { markHand(hd, 'BUST', 'bad'); hd.spot.lose('Bust'); } active++; return playTurn(); }
    const canDbl = two && (!hd.split || R.das) && !hd.splitAces && App.bank >= hd.spot.amount - 1e-9;
    const canHit = !hd.splitAces;
    const canSplit = two && cv(hd.cards[0]) === cv(hd.cards[1]) && hands.length < R.maxHands && App.bank >= hd.spot.amount - 1e-9
      && !(hd.splitAces && !R.rsa);
    const canSur = two && !hd.split && R.surrender;
    const hint = App.perk('bjhint') && App.state.settings.hints && !Mood.drunk() ? strategy(hd, dealer.up) : null; // the strategy card blurs when you're drunk
    t.msg(hands.length > 1 ? `Hand ${active + 1} of ${hands.length}: ${totalLabel(hd.cards)}` : `You have ${totalLabel(hd.cards)} against a ${rankLabel(dealer.up.r)}.` + (hint ? '' : ''));
    if (hint) t.msg(h('span', `${hands.length > 1 ? `Hand ${active + 1}: ` : ''}${totalLabel(hd.cards)} vs ${rankLabel(dealer.up.r)} · 🃏 Strategy card says `, h('b', { H: 'HIT', S: 'STAND', D: 'DOUBLE', P: 'SPLIT', R: 'SURRENDER' }[hint])));
    t.setActions([
      { label: 'Hit', key: 'h', cls: 'primary', disabled: !canHit, hint: hint === 'H', on: () => act('H') },
      { label: 'Stand', key: 's', cls: 'primary', hint: hint === 'S', on: () => act('S') },
      { label: 'Double', key: 'd', disabled: !canDbl, hint: hint === 'D', on: () => act('D') },
      { label: 'Split', key: 'p', disabled: !canSplit, hint: hint === 'P', on: () => act('P') },
      R.surrender ? { label: 'Surrender', key: 'u', disabled: !canSur, hint: hint === 'R', on: () => act('R') } : null,
    ]);
  }

  async function act(a) {
    const hd = hands[active]; t.setActions([]);
    if (a === 'H') { const c = shoe.draw(); await addCard(hd, c); see(c); }
    else if (a === 'S') { hd.done = true; active++; }
    else if (a === 'D') {
      hd.spot.force(hd.spot.amount); hd.doubled = true; showHandBet(hd);
      const c = shoe.draw(); await addCard(hd, c); see(c); hd.done = true;
      if (total(hd.cards).v > 21) { markHand(hd, 'BUST', 'bad'); hd.spot.lose('Bust'); }
      active++;
    } else if (a === 'P') {
      const amt = hd.spot.amount;
      const nspot = new UI.BetSpot({ key: 'split' + hands.length, label: '', cls: 'mini', passive: true, table: t });
      nspot.force(amt);
      t.extraSpots = (t.extraSpots || []).concat(nspot);
      const nh = newHand(nspot);
      nh.split = hd.split = true;
      const moved = hd.cards.pop(); hd.row.clear(); const keep = hd.cards; hd.cards = [];
      for (const c of keep) { hd.cards.push(c); hd.row.el.append(UI.card(c)); hd.row.cards.push(hd.row.el.lastChild); }
      nh.cards.push(moved); nh.row.el.append(UI.card(moved)); nh.row.cards.push(nh.row.el.lastChild);
      hands.splice(active + 1, 0, nh);
      $('#bj-hands').insertBefore(nh.wrap, hd.wrap.nextSibling);
      const aces = moved.r === 14;
      hd.splitAces = nh.splitAces = aces;
      const c1 = shoe.draw(); await addCard(hd, c1); see(c1);
      const c2 = shoe.draw(); await addCard(nh, c2); see(c2);
      showHandBet(hd); showHandBet(nh);
      // split aces get one card each; a hand only stays live if it can resplit another ace
      if (aces) { hd.done = !(R.rsa && c1.r === 14); nh.done = !(R.rsa && c2.r === 14); }
    } else if (a === 'R') {
      hd.done = true; markHand(hd, 'SURRENDER', 'bad'); hd.spot.refund(round2(hd.spot.amount / 2), 'Surrender: half back'); active++;
    }
    playTurn();
  }

  async function dealerTurn() {
    $$('.hand').forEach(w => w.classList.remove('active'));
    await dealer.flip(1); see(dealer.hole);
    const dc = [dealer.up, dealer.hole];
    const live = hands.filter(hd => hd.spot.amount > 0);
    $('#bj-dtot').textContent = totalLabel(dc);
    if (live.length) {
      for (;;) {
        const { v, soft } = total(dc);
        if (v > 17 || (v === 17 && !(soft && R.h17))) break;
        await sleep(250);
        const c = shoe.draw(); dc.push(c); await dealer.add(c); see(c);
        $('#bj-dtot').textContent = totalLabel(dc);
      }
    }
    const dv = total(dc).v;
    if (dv > 21) $('#bj-dtot').textContent = 'BUST';
    for (const hd of live) {
      const pv = total(hd.cards).v;
      if (dv > 21 || pv > dv) { hd.spot.win(1, hd.doubled ? 'Double win' : 'Win'); markHand(hd, pv + ' · WIN', 'good'); }
      else if (pv === dv) { hd.spot.push(); markHand(hd, pv + ' · PUSH'); }
      else { hd.spot.lose(); markHand(hd, pv + ' · LOSE', 'bad'); }
    }
    endRound(dv > 21 ? 'Dealer busts!' : `Dealer has ${dv}.`);
  }

  function endRound(text) {
    t.msg(text);
    t.finishRound();
    t.extraSpots = [insSpot];
    insSpot.el.remove();
    betPhase(); t.msg(text);
  }

  return {
    id: 'bj', name: 'Blackjack', icon: '🂡', blurb: 'Beat the dealer to 21. Perfect Pairs, 21+3 and a Blazing 7s jackpot.',
    mount, strategy, total,
    info(c) {
      const r = Object.assign({ bjPays: 1.5, h17: true, das: true, surrender: false, maxHands: 4 }, c.rules);
      return [
        { title: 'Table rules', text: `6 decks, cut card at 75%. Blackjack pays ${r.bjPays === 1.5 ? '3:2' : '6:5'}. Dealer ${r.h17 ? 'hits' : 'stands on'} soft 17 and peeks for blackjack. Split up to ${r.maxHands} hands${r.das ? ', double after split allowed' : ''}. Split aces get one card${r.rsa ? ' (resplit aces allowed)' : ''}. ${r.surrender ? 'Late surrender offered.' : ''} Insurance pays 2:1.` },
        { title: 'Perfect Pairs (your first two cards)', rows: UI.payRows(PAY.bj.perfectPairs), rtp: RTP['bj.perfectPairs'] },
        { title: '21+3 (your two cards + dealer up card, as a poker hand)', rows: UI.payRows(PAY.bj.plus3), rtp: RTP['bj.plus3'] },
        { title: `Blazing 7s Jackpot (${fmt(PAY.bj.prog.cost)})`, text: 'Judged on your first two cards and the dealer\'s up card. Percent tiers pay from the meter.', rows: PAY.bj.prog.tiers.map(x => [x.name, x.pct ? (x.pct * 100) + '% of meter' : fmt(x.amt)]), rtp: Progressives.rtp('bj') },
      ];
    },
  };
})();
