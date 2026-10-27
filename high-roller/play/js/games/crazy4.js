/* Crazy 4 Poker: five cards each, best four count. Ante and Super Bonus go out together; then fold,
   play 1x, or play up to 3x with a pair of aces or better. The dealer needs king high to qualify.
   Super Bonus pays on a straight or better whatever the dealer has; otherwise it pushes when you beat
   or tie the dealer and loses when you don't. Queens Up is an optional side bet on your own hand. */
GAMES.c4 = (() => {
  let t, ctx, shoe, sp, rows, st;
  const sideMax = () => Math.max(25, ctx.limits.max / 4);
  const row = (table, key) => table.find(r => r.key === key);
  // the simple strategy: 3x with aces or better, 1x with any pair or K-Q-8-4 and up, otherwise fold
  function advice(e) {
    if (canTriple(e)) return 3;
    if (e.cat === 1) return 1;
    const g = e.groups, ref = [13, 12, 8, 4]; // high card: is it K-Q-8-4 or better?
    for (let i = 0; i < 4; i++) { if (g[i] > ref[i]) return 1; if (g[i] < ref[i]) return 0; }
    return 1;
  }
  const canTriple = e => e.cat >= 2 || (e.cat === 1 && e.groups[0] === 14);
  function mount(table, c) {
    t = table; ctx = c; shoe = new Shoe(1, 1); t.shoe.classList.add('single');
    t.body.append(h('div.poker',
      h('div.dealer-area', h('div.area-l', 'Dealer ', h('span.tot#c4-dl')), h('div.cards#c4-dealer')),
      h('div.felt-arc', 'BEST FOUR OF FIVE · DEALER QUALIFIES WITH KING HIGH · PLAY 3x WITH A PAIR OF ACES OR BETTER'),
      h('div.player-area', h('div.cards#c4-player'), h('div.area-l', h('span.tot#c4-pl'))),
      h('div.spots-row', h('div.col', h('div.spots-row.tight#c4-main')), h('div.col.sides#c4-sides'))));
    rows = { d: new UI.CardRow($('#c4-dealer')), p: new UI.CardRow($('#c4-player')) };
    sp = {
      ante: t.spot({ key: 'ante', label: 'Ante', cls: 'main', max: ctx.limits.max / 4 }),
      sb: t.spot({ key: 'sb', label: 'Super Bonus', sub: '= Ante · up to 200:1', cls: 'main', passive: true }),
      play: t.spot({ key: 'play', label: 'Play', sub: '1x, or 3x with AA+', cls: 'main', passive: true }),
      qu: t.spot({ key: 'qu', label: 'Queens Up', sub: 'up to 50:1', cls: 'side', max: sideMax }),
    };
    $('#c4-main').append(sp.ante.el, sp.sb.el, sp.play.el);
    $('#c4-sides').append(sp.qu.el);
    betPhase();
  }
  function betPhase() {
    t.busy = false; ['ante', 'qu'].forEach(k => sp[k].setLocked(false));
    t.msg('Bet the Ante: an equal Super Bonus goes out with it. Queens Up is optional.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets(['ante', 'qu']) },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }
  async function deal() {
    const a = sp.ante.amount;
    if (a < ctx.limits.min) return UI.toast(`Minimum ante is ${fmt(ctx.limits.min)}`, 'warn');
    if (App.bank < a) return UI.toast('The Super Bonus has to match your Ante: not enough bankroll', 'warn');
    t.busy = true; t.setActions([]); Object.values(sp).forEach(s => s.setLocked(true));
    t.saveBets(['ante', 'qu']);
    if (!sp.sb.force(a)) { t.busy = false; Object.values(sp).forEach(s => s.setLocked(false)); return UI.toast('Not enough bankroll for the Super Bonus', 'warn'); }
    shoe.shuffle(); rows.d.clear(); rows.p.clear(); $('#c4-dl').textContent = ''; $('#c4-pl').textContent = '';
    st = { p: [], d: [] };
    for (let i = 0; i < 5; i++) { const x = shoe.draw(); st.p.push(x); await rows.p.add(x); const y = shoe.draw(); st.d.push(y); await rows.d.add(y, true); }
    const me = Poker.best4(st.p); st.me = me;
    $('#c4-pl').textContent = me.name + (me.cat === 1 ? ` (${rankLabel(me.groups[0])}s)` : '');
    // Queens Up depends only on your five cards
    if (sp.qu.amount) {
      let k = me.key === 'aces4' ? 'quads' : me.key; if (k === 'pair') k = me.groups[0] >= 12 ? 'qup' : null;
      const r = k && row(PAY.c4.queensUp, k);
      r ? (sp.qu.win(r.pays, r.name), r.pays >= 25 && App.count('bigSide')) : sp.qu.lose();
    }
    const best = advice(me), hint = App.perk('pokerhint') && App.state.settings.hints, triple = canTriple(me);
    t.msg(hint ? h('span', `You have ${me.name}. 📓 Doc: 3x with aces or better, 1x with any pair or K-Q-8-4 → `, h('b', best === 3 ? 'PLAY 3x' : best ? 'PLAY 1x' : 'FOLD'))
      : `You have ${me.name}. Fold, play 1x${triple ? ', or play 3x' : ''}?`);
    t.setActions([
      { label: 'Fold', key: 'f', cls: 'ghost', hint: hint && best === 0, on: () => { t.setActions([]); reveal(true); } },
      { label: 'Play 1x', key: '1', hint: hint && best === 1, disabled: App.bank < a, on: () => { t.setActions([]); sp.play.force(a); reveal(false); } },
      triple ? { label: 'Play 3x', key: '3', cls: 'primary', hint: hint && best === 3, disabled: App.bank < a * 3, on: () => { t.setActions([]); sp.play.force(a * 3); reveal(false); } } : null,
    ].filter(Boolean));
  }
  async function reveal(folded) {
    for (let i = 0; i < 5; i++) await rows.d.flip(i);
    const me = st.me, dl = Poker.best4(st.d), qualifies = dl.cat > 0 || dl.high >= 13;
    $('#c4-dl').textContent = dl.name + (qualifies ? '' : ' (does not qualify)');
    if (me.key === 'aces4') App.count('c4Aces');
    let text;
    if (folded) { sp.ante.lose(); sp.sb.lose(); text = 'Folded.'; }
    else {
      const cmp = Math.sign(me.score - dl.score);
      // Ante: pushes if the dealer doesn't qualify; Play: always against the dealer's hand
      if (!qualifies) sp.ante.push(); else cmp > 0 ? sp.ante.win(1) : cmp < 0 ? sp.ante.lose() : sp.ante.push();
      cmp > 0 ? sp.play.win(1) : cmp < 0 ? sp.play.lose() : sp.play.push();
      const sb = row(PAY.c4.superBonus, me.key);
      if (sb) { sp.sb.win(sb.pays, sb.name); if (sb.pays >= 25) App.count('bigSide'); }
      else cmp >= 0 ? sp.sb.push() : sp.sb.lose();
      text = cmp > 0 ? `You win with ${me.name}${qualifies ? '' : ' (dealer didn\'t qualify: Ante pushes)'}.` : cmp < 0 ? `Dealer wins with ${dl.name}.` : 'Tie: push.';
      if (sb) text += ` Super Bonus: ${sb.name} pays ${sb.pays} to 1!`;
    }
    t.finishRound();
    betPhase(); t.msg(text);
  }
  return {
    id: 'c4', name: 'Crazy 4 Poker', icon: '4️⃣', blurb: 'Five cards, best four play. Raise 3x with aces, and a Super Bonus up to 200:1.',
    mount,
    info: () => [
      { title: 'How to play', text: 'Bet the Ante; an equal Super Bonus bet goes out with it. You and the dealer get five cards each and the best four count. Fold, play 1x your Ante, or play 3x with a pair of aces or better. The dealer needs king high to qualify: if not, the Ante pushes and the Play bet still goes against the dealer\'s hand. Four of a kind beats a straight flush in Crazy 4.' },
      { title: 'Super Bonus (straight or better pays whatever the dealer has; otherwise it pushes if you beat or tie the dealer)', rows: UI.payRows(PAY.c4.superBonus) },
      { title: 'Queens Up (your best four cards)', rows: UI.payRows(PAY.c4.queensUp), rtp: RTP['c4.queensUp'] },
      { title: 'Strategy', text: 'Play 3x with a pair of aces or better, 1x with any other pair or K-Q-8-4 and up, and fold the rest.' },
    ],
  };
})();
