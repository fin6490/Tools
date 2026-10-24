/* Punto Banco baccarat: 8-deck shoe, standard tableau, pairs, Dragon 7, Panda 8,
   a Four of a Kind jackpot, and a bead-plate scoreboard. */
GAMES.bac = (() => {
  const shoes = {}, roads = {};
  let t, ctx, R, shoe, sp, rows, road;
  const val = c => (c.r >= 10 && c.r <= 13 ? 0 : c.r === 14 ? 1 : c.r);
  const tot = cs => cs.reduce((a, c) => a + val(c), 0) % 10;
  function bankerDraws(b, third) {
    if (third == null) return b <= 5;
    const t3 = val(third);
    if (b <= 2) return true;
    if (b === 3) return t3 !== 8;
    if (b === 4) return t3 >= 2 && t3 <= 7;
    if (b === 5) return t3 >= 4 && t3 <= 7;
    if (b === 6) return t3 === 6 || t3 === 7;
    return false;
  }
  const sideMax = () => Math.max(25, ctx.limits.max / 4);

  function mount(table, c) {
    t = table; ctx = c; R = Object.assign({ ez: false, commission: 0.05 }, ctx.rules);
    shoe = shoes[ctx.venueId] || (shoes[ctx.venueId] = new Shoe(8, 0.9));
    road = roads[ctx.venueId] || (roads[ctx.venueId] = []);
    const m = PAY.bac;
    t.body.append(h('div.bac',
      h('div.bac-hands',
        h('div.bac-hand.player', h('div.area-l', 'PLAYER ', h('span.tot#b-pt')), h('div.cards#b-player')),
        h('div.bac-hand.banker', h('div.area-l', 'BANKER ', h('span.tot#b-bt')), h('div.cards#b-banker'))),
      h('div.felt-arc', R.ez ? 'EZ BACCARAT · NO COMMISSION · BANKER THREE-CARD 7 PUSHES' : `BANKER PAYS 1 TO 1 LESS ${Math.round(R.commission * 100)}% COMMISSION · TIE PAYS ${m.main.tie} TO 1`),
      h('div.spots-row.bac-spots#b-spots'),
      h('div.road-wrap', h('div.area-l', 'Bead plate'), h('div.road#b-road'))));
    rows = { p: new UI.CardRow($('#b-player')), b: new UI.CardRow($('#b-banker')) };
    const one = () => { // only one of Player/Banker at a time
      if (sp.player.amount && sp.banker.amount) UI.toast('Betting both sides just pays commission!', 'warn');
    };
    sp = {
      ppair: t.spot({ key: 'ppair', label: 'P Pair', sub: `${m.pair[1].pays}:1`, cls: 'side', max: sideMax }),
      player: t.spot({ key: 'player', label: 'PLAYER', sub: '1:1', cls: 'main blue', max: ctx.limits.max, onChange: one }),
      tie: t.spot({ key: 'tie', label: 'TIE', sub: `${m.main.tie}:1`, cls: 'side green', max: sideMax }),
      banker: t.spot({ key: 'banker', label: 'BANKER', sub: R.ez ? '1:1*' : `0.${100 - Math.round(R.commission * 100)}:1`, cls: 'main red', max: ctx.limits.max, onChange: one }),
      bpair: t.spot({ key: 'bpair', label: 'B Pair', sub: `${m.pair[1].pays}:1`, cls: 'side', max: sideMax }),
      dragon: t.spot({ key: 'dragon', label: 'Dragon 7', sub: `${m.dragon7}:1`, cls: 'side', max: sideMax }),
      panda: t.spot({ key: 'panda', label: 'Panda 8', sub: `${m.panda8}:1`, cls: 'side', max: sideMax }),
      prog: t.spot({ key: 'prog', label: 'Jackpot', sub: fmt(m.prog.cost), cls: 'side prog', fixed: m.prog.cost }),
    };
    $('#b-spots').append(...['dragon', 'ppair', 'player', 'tie', 'banker', 'bpair', 'panda', 'prog'].map(k => sp[k].el), UI.meter('bac', m.prog.name));
    drawRoad(); betPhase();
  }
  function drawRoad() {
    const el = $('#b-road'); el.innerHTML = '';
    road.slice(-72).forEach(r => el.append(h('span.bead.' + r.w, { title: `${r.p}-${r.b}` }, r.w === 'p' ? 'P' : r.w === 'b' ? 'B' : 'T')));
    const n = road.length, cnt = w => road.filter(r => r.w === w).length;
    t.extraEl.textContent = n ? `P ${cnt('p')} · B ${cnt('b')} · T ${cnt('t')}` : '';
  }
  function betPhase() {
    t.busy = false; Object.values(sp).forEach(s => s.setLocked(false));
    t.msg('Bet on Player, Banker or Tie. Pairs, Dragon 7, Panda 8 and the Jackpot are side bets.');
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => t.clearBets() },
      { label: 'Rebet', key: 'r', cls: 'ghost', on: () => t.rebet() },
      { label: 'Deal', key: ' ', cls: 'primary', on: deal },
    ]);
  }
  async function deal() {
    const main = sp.player.amount + sp.banker.amount + sp.tie.amount;
    if (!main) return UI.toast('Bet on Player, Banker or Tie', 'warn');
    if ((sp.player.amount && sp.player.amount < ctx.limits.min) || (sp.banker.amount && sp.banker.amount < ctx.limits.min) || (!sp.player.amount && !sp.banker.amount && sp.tie.amount < ctx.limits.min))
      return UI.toast(`Table minimum is ${fmt(ctx.limits.min)}`, 'warn');
    t.busy = true; t.setActions([]); Object.values(sp).forEach(s => s.setLocked(true));
    t.saveBets(Object.keys(sp));
    if (sp.prog.amount) Progressives.contribute('bac');
    if (shoe.needsShuffle) { shoe.shuffle(); road.length = 0; drawRoad(); t.showBanner('NEW SHOE', 'push', 900); await sleep(900); }
    rows.p.clear(); rows.b.clear(); $('#b-pt').textContent = ''; $('#b-bt').textContent = '';
    const P = [shoe.draw()], B = [shoe.draw()]; P.push(shoe.draw()); B.push(shoe.draw());
    await rows.p.add(P[0]); await rows.b.add(B[0]); await rows.p.add(P[1]); await rows.b.add(B[1]);
    $('#b-pt').textContent = tot(P); $('#b-bt').textContent = tot(B);
    settleFour(P, B);
    let p3 = null;
    if (tot(P) < 8 && tot(B) < 8) {
      if (tot(P) <= 5) { p3 = shoe.draw(); P.push(p3); await sleep(250); (await rows.p.add(p3)).classList.add('third'); $('#b-pt').textContent = tot(P); }
      if (bankerDraws(tot(B), p3)) { const b3 = shoe.draw(); B.push(b3); await sleep(250); (await rows.b.add(b3)).classList.add('third'); $('#b-bt').textContent = tot(B); }
    }
    const pt = tot(P), bt = tot(B), w = pt > bt ? 'p' : bt > pt ? 'b' : 't';
    const natural = (P.length === 2 && pt >= 8) || (B.length === 2 && bt >= 8);
    // main bets
    if (w === 'p') { sp.player.win(PAY.bac.main.player); sp.banker.lose(); sp.tie.lose(); }
    else if (w === 'b') {
      if (R.ez) { B.length === 3 && bt === 7 ? sp.banker.push('Banker 3-card 7') : sp.banker.win(1); }
      else sp.banker.win(1 - R.commission);
      sp.player.lose(); sp.tie.lose();
    } else { sp.player.push(); sp.banker.push(); sp.tie.win(PAY.bac.main.tie, 'Tie!'); }
    const dragon = w === 'b' && B.length === 3 && bt === 7, panda = w === 'p' && P.length === 3 && pt === 8;
    if (sp.dragon.amount) dragon ? (sp.dragon.win(PAY.bac.dragon7, 'Dragon 7!'), App.count('bigSide')) : sp.dragon.lose();
    if (sp.panda.amount) panda ? (sp.panda.win(PAY.bac.panda8, 'Panda 8!'), App.count('bigSide')) : sp.panda.lose();
    road.push({ w, p: pt, b: bt }); drawRoad();
    const name = { p: 'Player', b: 'Banker', t: 'Tie' }[w];
    t.finishRound();
    betPhase();
    t.msg(`${name}${w === 't' ? '' : ' wins'} ${Math.max(pt, bt)} to ${Math.min(pt, bt)}${natural ? ' (natural)' : ''}${dragon ? ' · Dragon 7!' : ''}${panda ? ' · Panda 8!' : ''}`);
  }
  function settleFour(P, B) {
    const pair = (cs, spot) => {
      if (!spot.amount) return;
      if (cs[0].r === cs[1].r) { const s = cs[0].s === cs[1].s, row = PAY.bac.pair[s ? 0 : 1]; spot.win(row.pays, row.name); }
      else spot.lose();
    };
    pair(P, sp.ppair); pair(B, sp.bpair);
    if (sp.prog.amount) {
      const [a, b] = P, [c, d] = B, pt = tot(P), bt = tot(B);
      let k = null;
      if (a.r === b.r && b.r === c.r && c.r === d.r) k = a.s === b.s && b.s === c.s && c.s === d.s ? 'q4s' : 'q4';
      else if (pt === 9 && bt === 9) k = 'n99';
      else if (pt === 8 && bt === 8) k = 'n88';
      else if ((pt === 9 && bt === 8) || (pt === 8 && bt === 9)) k = 'n98';
      else if ((pt >= 8 && a.s === b.s) || (bt >= 8 && c.s === d.s)) k = 'sn';
      else if (a.r === b.r || c.r === d.r) k = 'pair';
      Progressives.settle('bac', sp.prog, k);
    }
  }
  return {
    id: 'bac', name: 'Baccarat', icon: '🎴', blurb: 'Player or Banker, closest to 9. Pairs, Dragon 7, Panda 8.',
    mount,
    info(c) {
      const r = Object.assign({ ez: false, commission: 0.05 }, c.rules), m = PAY.bac;
      return [
        { title: 'How to play', text: 'Bet on Player, Banker or Tie. Cards count face value, tens and faces count 0, and only the last digit of the total matters. Third cards follow the fixed tableau; you never make a decision. ' + (r.ez ? 'EZ rules: Banker pays 1:1 with no commission, but a Banker win with a three-card 7 pushes.' : `Banker wins pay 1:1 less ${Math.round(r.commission * 100)}% commission.`) },
        { title: 'Player', rows: [['Player wins', '1 to 1']], rtp: RTP['bac.player'] },
        { title: 'Banker', rows: [['Banker wins', r.ez ? '1 to 1 (3-card 7 pushes)' : (1 - r.commission) + ' to 1']],
          rtp: r.ez ? RTP['bac.bankerEZ'] : (RTP['bac.banker'] - 0.4586 * (r.commission - 0.05)) },
        { title: 'Player Pair / Banker Pair (first two cards)', rows: UI.payRows(m.pair), rtp: RTP['bac.pair'] },
        { title: 'Dragon 7: Banker wins with a three-card 7', rows: [['Dragon 7', m.dragon7 + ' to 1']], rtp: RTP['bac.dragon7'] },
        { title: 'Panda 8: Player wins with a three-card 8', rows: [['Panda 8', m.panda8 + ' to 1']], rtp: RTP['bac.panda8'] },
        { title: 'Tie', rows: [['Tie', m.main.tie + ' to 1']], rtp: RTP['bac.tie'] },
        { title: `Four of a Kind Jackpot (${fmt(m.prog.cost)}): first four cards dealt`, rows: m.prog.tiers.map(x => [x.name, x.pct ? (x.pct * 100) + '% of meter' : fmt(x.amt)]), rtp: Progressives.rtp('bac') },
      ];
    },
  };
})();
