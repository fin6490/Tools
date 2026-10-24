/* Craps: pass/don't pass with odds, come bets with odds, place bets, field, hardways,
   true-odds props, Fire Bet and All/Tall/Small. */
GAMES.craps = (() => {
  let t, ctx, R, sp, st, place = {}, come = {}, hard = {};
  const NUMS = [4, 5, 6, 8, 9, 10];
  const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
  const TRUE_ODDS = { 4: 2, 5: 1.5, 6: 1.2, 8: 1.2, 9: 1.5, 10: 2 }; // taking odds pays
  const takeMult = n => R.odds === 345 ? ({ 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5 })[n] : R.odds;
  const PP = () => PAY.craps.props;
  const sideMax = () => Math.max(25, ctx.limits.max / 4);
  const persist = {}; // shooter state survives leaving and coming back during a session

  function mount(table, c) {
    t = table; ctx = c; R = Object.assign({ odds: 2, field2: 2, field12: 2 }, ctx.rules);
    st = persist[ctx.venueId] || (persist[ctx.venueId] = { point: null, shooterRolls: 0, firePts: [], ats: [], history: [] });
    t.shoe.style.display = 'none';
    const P = PAY.craps;
    sp = {
      pass: t.spot({ key: 'pass', label: 'PASS LINE', cls: 'cr-pass', max: ctx.limits.max, onChange: () => sync(), onLockedClick: () => UI.toast('Pass line is a contract bet once a point is set', 'warn') }),
      passOdds: t.spot({ noComp: true, key: 'passOdds', label: 'Odds', sub: 'behind the line', cls: 'cr-odds', onChange: () => sync(), onLockedClick: () => UI.toast(st.point ? 'Put a bet on the pass line first' : 'Odds open once the shooter sets a point', 'warn'), max: () => st.point && sp.pass.amount ? sp.pass.amount * takeMult(st.point) : 0 }),
      dp: t.spot({ key: 'dp', label: "DON'T PASS BAR 12", cls: 'cr-dp', max: ctx.limits.max }),
      dpOdds: t.spot({ noComp: true, key: 'dpOdds', label: 'Lay', cls: 'cr-odds', max: () => st.point && sp.dp.amount ? round2(sp.dp.amount * takeMult(st.point) / (1 / TRUE_ODDS[st.point])) : 0 }),
      come: t.spot({ key: 'come', label: 'COME', cls: 'cr-come', max: ctx.limits.max }),
      field: t.spot({ key: 'field', label: 'FIELD', sub: `2·3·4·9·10·11·12 — 2 pays ${R.field2}x, 12 pays ${R.field12}x`, cls: 'cr-field', max: ctx.limits.max }),
      any7: t.spot({ noComp: true, key: 'any7', label: 'Any 7', sub: PP().any7 + ':1', cls: 'prop', max: sideMax }),
      anyCraps: t.spot({ noComp: true, key: 'anyCraps', label: 'Any Craps', sub: PP().anyCraps + ':1', cls: 'prop', max: sideMax }),
      yo: t.spot({ noComp: true, key: 'yo', label: 'Yo 11', sub: PP().yo + ':1', cls: 'prop', max: sideMax }),
      aceDeuce: t.spot({ noComp: true, key: 'aceDeuce', label: 'Ace-Deuce', sub: PP().aceDeuce + ':1', cls: 'prop', max: sideMax }),
      aces: t.spot({ noComp: true, key: 'aces', label: 'Aces', sub: PP().aces + ':1', cls: 'prop', max: sideMax }),
      boxcars: t.spot({ noComp: true, key: 'boxcars', label: 'Boxcars', sub: PP().boxcars + ':1', cls: 'prop', max: sideMax }),
      fire: t.spot({ key: 'fire', label: '🔥 Fire Bet', sub: 'new shooter only', cls: 'prop fire', max: () => Math.min(sideMax(), 100), onLockedClick: () => UI.toast('Fire Bet only before a new shooter\'s first roll', 'warn') }),
      small: t.spot({ key: 'small', label: 'Small', sub: P.ats.small + ':1', cls: 'prop ats', max: () => Math.min(sideMax(), 100) }),
      tall: t.spot({ key: 'tall', label: 'Tall', sub: P.ats.tall + ':1', cls: 'prop ats', max: () => Math.min(sideMax(), 100) }),
      all: t.spot({ key: 'all', label: 'All', sub: P.ats.all + ':1', cls: 'prop ats', max: () => Math.min(sideMax(), 100) }),
    };
    place = {}; come = {}; hard = {};
    for (const n of NUMS) {
      place[n] = t.spot({ key: 'place' + n, label: 'Place', sub: placeLabel(n), cls: 'cr-place', max: ctx.limits.max });
      come[n] = { flat: t.spot({ key: 'come' + n, label: 'Come', cls: 'cr-cp', passive: true }), odds: t.spot({ noComp: true, key: 'comeOdds' + n, label: 'Odds', cls: 'cr-cpo', max: () => come[n].flat.amount * takeMult(n) }) };
    }
    for (const n of [4, 6, 8, 10]) hard[n] = t.spot({ noComp: true, key: 'hard' + n, label: `Hard ${n}`, sub: (n === 4 || n === 10 ? PP().hard4 : PP().hard6) + ':1', cls: 'prop', max: sideMax });

    const phone = innerWidth < 640;
    t.body.append(h('div.craps',
      h('div.cr-status',
        h('div.dice-tray', h('div.dice', h('div.die#d1'), h('div.die#d2')), h('div.roll-total#cr-total')),
        h('div.cr-puck#cr-puck', 'OFF'), h('div.history#cr-hist')),
      h('div.cr-guide#cr-guide'),
      h('div.cr-line',
        h('div.cr-passwrap', sp.pass.el, h('div.cr-behind', sp.passOdds.el, h('small#cr-oddsnote', 'Odds go behind the line once a point is set'))),
        h('div.cr-dpwrap', sp.dp.el, sp.dpOdds.el)),
      h('div.cr-mid', sp.come.el, sp.field.el),
      h('div.cr-board', h('div.cr-nums', NUMS.map(n => h('div.cr-num#cr-n' + n, h('div.cr-n', n === 6 ? 'SIX' : n === 9 ? 'NINE' : String(n), h('span.puck')), place[n].el, h('div.cr-cps', come[n].flat.el, come[n].odds.el))))),
      h('details.cr-more', { open: !phone },
        h('summary', h('span', 'Props & side bets'), h('span.cr-more-n#cr-more-n')),
        h('div.cr-props', h('div.area-l', 'Hardways & props (true odds)'), h('div.grid4', hard[4].el, hard[6].el, hard[8].el, hard[10].el, sp.any7.el, sp.anyCraps.el, sp.yo.el, sp.aceDeuce.el, sp.aces.el, sp.boxcars.el)),
        h('div.cr-props', h('div.area-l', 'Fire Bet & All/Tall/Small'), h('div.grid4', sp.fire.el, sp.small.el, sp.tall.el, sp.all.el),
          h('div.fire-pts#cr-fire'), h('div.ats-track#cr-ats')))));
    setDie($('#d1'), 3); setDie($('#d2'), 4);
    sync(); idle();
  }
  const placeLabel = n => ({ 4: '9:5', 5: '7:5', 6: '7:6', 8: '7:6', 9: '7:5', 10: '9:5' })[n];

  function setDie(el, v) {
    const pips = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[v];
    el.innerHTML = ''; for (let i = 1; i <= 9; i++) el.append(h('i' + (pips.includes(i) ? '.on' : '')));
  }

  // which bets may be touched right now
  function sync() {
    const on = !!st.point;
    for (const k in t.spots) if (!t.spots[k].o.passive) t.spots[k].setLocked(false);
    sp.pass.setLocked(on); sp.dp.setLocked(on);
    sp.passOdds.setLocked(!(on && sp.pass.amount)); sp.dpOdds.setLocked(!(on && sp.dp.amount));
    sp.come.setLocked(!on);
    for (const n of NUMS) come[n].odds.setLocked(!come[n].flat.amount);
    sp.fire.setLocked(st.shooterRolls !== 0);
    const atsOpen = st.ats.length === 0;
    ['small', 'tall', 'all'].forEach(k => sp[k].setLocked(!atsOpen));
    $$('.cr-num').forEach(e => e.classList.remove('point'));
    if (on) $('#cr-n' + st.point).classList.add('point');
    $('.craps').classList.toggle('point-on', on);
    $('#cr-fire').innerHTML = '';
    $('#cr-fire').append(h('span.area-l', 'Fire points: '), ...NUMS.map(n => h('span.fp' + (st.firePts.includes(n) ? '.lit' : ''), n)));
    $('#cr-ats').innerHTML = '';
    $('#cr-ats').append(h('span.area-l', 'Rolled: '), ...[2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map(n => h('span.fp' + (st.ats.includes(n) ? '.lit' : ''), n)));
    $('#cr-hist').innerHTML = ''; st.history.slice(-14).forEach(r => $('#cr-hist').append(h('span.hr' + (r === 7 ? '.seven' : ''), r)));
    // puck, coaching line, and a nudge toward the zero-edge odds bet
    const puck = $('#cr-puck'); puck.textContent = on ? 'ON ' + st.point : 'OFF'; puck.classList.toggle('on', on);
    const oddsMax = on && sp.pass.amount ? sp.pass.amount * takeMult(st.point) : 0;
    const invite = on && sp.pass.amount > 0 && sp.passOdds.amount < oddsMax - 1e-9 && !t.busy;
    sp.passOdds.el.classList.toggle('invite', invite);
    $('#cr-oddsnote').textContent = on && sp.pass.amount ? `Pays ${({ 4: '2:1', 10: '2:1', 5: '3:2', 9: '3:2', 6: '6:5', 8: '6:5' })[st.point]}, no house edge · up to ${fmt(oddsMax)}` : 'Odds go behind the line once a point is set';
    const g = $('#cr-guide');
    g.textContent = !on
      ? (sp.pass.amount || sp.dp.amount ? 'Come-out roll: 7 or 11 wins the pass line, 2, 3 or 12 loses; anything else becomes the point. Roll!' : 'Come-out roll: put chips on the PASS LINE, then roll.')
      : invite ? `The point is ${st.point}. Back your pass line with ODDS (tap the Odds spot behind it): it pays true odds, the best bet in the house.`
      : `The point is ${st.point}: roll ${st.point === 8 ? 'an' : 'a'} ${st.point} before a 7 to win the pass line. Come bets work like a new pass line; place bets pick a number.`;
    const more = ['any7', 'anyCraps', 'yo', 'aceDeuce', 'aces', 'boxcars', 'fire', 'small', 'tall', 'all'].filter(k => sp[k].amount).length + [4, 6, 8, 10].filter(n => hard[n].amount).length;
    $('#cr-more-n').textContent = more ? `${more} bet${more > 1 ? 's' : ''} on` : '';
  }

  function idle() {
    t.busy = false;
    t.msg(st.point ? `Point is ${st.point}. Press your luck: odds, come and place bets are open.` : (st.shooterRolls === 0 ? 'New shooter coming out. Pass line, Fire Bet and All/Tall/Small are open.' : 'Come-out roll. Bet the pass line or don\'t pass.'));
    t.setActions([
      { label: 'Clear', key: 'c', cls: 'ghost', on: () => { for (const k in t.spots) { const s = t.spots[k]; if (!s.locked && !s.o.passive) s.clear(); } sync(); } },
      { label: 'Rebet', key: 'r', cls: 'ghost', after: () => sync(), on: () => { t.rebet(); sync(); } },
      { label: '🎲 Roll', key: ' ', cls: 'primary', on: roll },
    ]);
  }

  async function roll() {
    const any = Object.values(t.spots).some(s => s.amount > 0);
    if (!any) return UI.toast('Put some money on the layout first', 'warn');
    if (sp.pass.amount && sp.pass.amount < ctx.limits.min && !st.point) return UI.toast(`Pass line minimum is ${fmt(ctx.limits.min)}`, 'warn');
    t.busy = true; t.setActions([]);
    Object.values(t.spots).forEach(s => s.setLocked(true));
    if (!st.point) t.saveBets(['pass', 'dp', 'field', 'fire', 'small', 'tall', 'all', ...NUMS.map(n => 'place' + n)]);
    // tumble
    SFX.dice();
    const d1 = $('#d1'), d2 = $('#d2');
    d1.classList.add('rolling'); d2.classList.add('rolling');
    for (let i = 0; i < 8; i++) { setDie(d1, 1 + RNG.int(6)); setDie(d2, 1 + RNG.int(6)); await sleep(70); }
    const a = 1 + RNG.int(6), b = 1 + RNG.int(6), n = a + b, isHard = a === b;
    setDie(d1, a); setDie(d2, b); d1.classList.remove('rolling'); d2.classList.remove('rolling');
    $('#cr-total').textContent = n + (isHard && [4, 6, 8, 10].includes(n) ? ' the hard way' : '');
    st.history.push(n);
    resolve(n, a, b);
    st.shooterRolls++;
    t.finishRound({ stamina: 0.35 });
    idle(); sync();
    t.msg(lastMsg);
  }

  let lastMsg = '';
  function resolve(n, a, b) {
    const comeOut = st.point == null, msgs = [];
    const P = PP();
    // one-roll props
    const one = (spot, hit, pays) => { if (spot.amount) hit ? (spot.win(pays), pays >= 25 && App.count('bigSide')) : spot.lose(); };
    one(sp.any7, n === 7, P.any7); one(sp.anyCraps, n === 2 || n === 3 || n === 12, P.anyCraps);
    one(sp.yo, n === 11, P.yo); one(sp.aceDeuce, n === 3, P.aceDeuce); one(sp.aces, n === 2, P.aces); one(sp.boxcars, n === 12, P.boxcars);
    if (sp.field.amount) {
      if ([3, 4, 9, 10, 11].includes(n)) sp.field.win(1);
      else if (n === 2) sp.field.win(R.field2); else if (n === 12) sp.field.win(R.field12);
      else sp.field.lose();
    }
    // hardways (off on the come-out)
    for (const hn of [4, 6, 8, 10]) {
      const s = hard[hn]; if (!s.amount || comeOut) continue;
      if (n === hn && a === b) { const amt = s.amount; s.win(hn === 4 || hn === 10 ? P.hard4 : P.hard6, 'Hard ' + hn); s.force(amt); }
      else if (n === hn || n === 7) s.lose(n === 7 ? 'Seven' : 'Easy ' + hn);
    }
    // All / Tall / Small
    if (n === 7) {
      ['small', 'tall', 'all'].forEach(k => sp[k].lose()); st.ats = [];
    } else {
      if (!st.ats.includes(n)) st.ats.push(n);
      const has = arr => arr.every(x => st.ats.includes(x));
      if (sp.small.amount && has([2, 3, 4, 5, 6])) { sp.small.win(PAY.craps.ats.small, 'Small!'); App.count('bigSide'); }
      if (sp.tall.amount && has([8, 9, 10, 11, 12])) { sp.tall.win(PAY.craps.ats.tall, 'Tall!'); App.count('bigSide'); }
      if (sp.all.amount && has([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])) { sp.all.win(PAY.craps.ats.all, 'ALL!'); App.count('bigSide'); }
      if (has([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])) st.ats = [];
    }
    // place bets (off on the come-out), stay up after a win
    if (!comeOut) for (const pn of NUMS) {
      const s = place[pn]; if (!s.amount) continue;
      if (n === pn) { const amt = s.amount; s.win(PAY.craps.place[pn], 'Place ' + pn); s.force(amt); }
      else if (n === 7) s.lose();
    }
    // existing come points
    for (const cn of NUMS) {
      const c = come[cn]; if (!c.flat.amount) continue;
      if (n === cn) { c.flat.win(1, 'Come ' + cn); if (c.odds.amount) comeOut ? c.odds.push('Odds off') : c.odds.win(TRUE_ODDS[cn]); }
      else if (n === 7) { c.flat.lose(); if (c.odds.amount) comeOut ? c.odds.push('Odds off') : c.odds.lose(); }
    }
    // new come bet travels
    if (sp.come.amount && !comeOut) {
      if (n === 7 || n === 11) sp.come.win(1);
      else if (n === 2 || n === 3 || n === 12) sp.come.lose();
      else { const amt = sp.come.amount; sp.come.amount = 0; sp.come.history = []; sp.come.render(); come[n].flat.amount = round2(come[n].flat.amount + amt); come[n].flat.history = [come[n].flat.amount]; come[n].flat.render(); }
    }
    // line bets and the point
    if (comeOut) {
      if (n === 7 || n === 11) { sp.pass.amount && sp.pass.win(1); sp.dp.amount && sp.dp.lose(); msgs.push(n + '! Front-line winner.'); }
      else if (n === 2 || n === 3 || n === 12) {
        sp.pass.amount && sp.pass.lose();
        if (sp.dp.amount) n === 12 ? sp.dp.push('Bar 12') : sp.dp.win(1);
        msgs.push(`Craps ${n}.`);
      } else { st.point = n; msgs.push(`The point is ${n}.`); }
    } else if (n === st.point) {
      sp.pass.amount && sp.pass.win(1); sp.passOdds.amount && sp.passOdds.win(TRUE_ODDS[n]);
      sp.dp.amount && sp.dp.lose(); sp.dpOdds.amount && sp.dpOdds.lose();
      if (!st.firePts.includes(n)) { st.firePts.push(n); App.state.stats.counters.firePoints = Math.max(App.counter('firePoints'), st.firePts.length); if (st.firePts.length >= 3) Quests.bump('louDice'); }
      msgs.push(`${n}! The shooter made the point.`);
      st.point = null;
      if (st.firePts.length === 6 && sp.fire.amount) settleFire();
    } else if (n === 7) {
      sp.pass.amount && sp.pass.lose(); sp.passOdds.amount && sp.passOdds.lose();
      sp.dp.amount && sp.dp.win(1); sp.dpOdds.amount && sp.dpOdds.win(1 / TRUE_ODDS[st.point]);
      msgs.push('Seven out! New shooter.');
      settleFire();
      st.point = null; st.firePts = []; st.shooterRolls = -1; // becomes 0 after this roll
    } else msgs.push(`${n}. Point is still ${st.point}.`);
    lastMsg = msgs.join(' ');
  }
  function settleFire() {
    if (!sp.fire.amount) return;
    const k = st.firePts.length, row = PAY.craps.fire.find(r => r.pts === k);
    row ? (sp.fire.win(row.pays, `Fire Bet: ${k} points!`), App.count('bigSide')) : sp.fire.lose('Fire Bet');
  }

  return {
    id: 'craps', name: 'Craps', icon: '🎲', blurb: 'The loudest table in the house. True-odds props, Fire Bet, All/Tall/Small.',
    mount,
    // contract bets can't be taken down, so you can't walk away from a shooter mid-hand
    canLeave() {
      if (!st) return null;
      if (st.point && (sp.pass.amount || sp.dp.amount || NUMS.some(n => come[n].flat.amount))) return 'Your line and come bets are working. Wait for the point or a seven.';
      if (sp.come.amount) return 'Your come bet is in action. Roll once more.';
      if (sp.fire.amount && st.shooterRolls > 0) return 'Your Fire Bet rides until this shooter sevens out.';
      if (st.ats.length && (sp.small.amount || sp.tall.amount || sp.all.amount)) return 'All/Tall/Small is in action until the next 7.';
      return null;
    },
    info(c) {
      const r = Object.assign({ odds: 2, field2: 2, field12: 2 }, c.rules), P = PAY.craps;
      return [
        { title: 'Line bets', text: `Pass Line wins on a come-out 7 or 11 and loses on 2, 3 or 12; any other number becomes the point, and Pass wins if the point repeats before a 7. Don't Pass is the reverse (12 pushes). Come and Don't-style odds work the same once a point is on. Odds pay true odds with no house edge; this table allows ${r.odds === 345 ? '3-4-5x' : r.odds + 'x'} odds.` },
        { title: 'Place bets (off on the come-out)', rows: [['4 or 10', '9 to 5'], ['5 or 9', '7 to 5'], ['6 or 8', '7 to 6']], rtp: null },
        { title: 'Field (one roll)', rows: [['3, 4, 9, 10, 11', '1 to 1'], ['2', r.field2 + ' to 1'], ['12', r.field12 + ' to 1']], rtp: (28 + r.field2 + 1 + r.field12 + 1) / 36 },
        { title: 'Hardways & props (true odds, zero edge)', rows: [['Hard 4 / Hard 10', P.props.hard4 + ' to 1'], ['Hard 6 / Hard 8', P.props.hard6 + ' to 1'], ['Any 7', P.props.any7 + ' to 1'], ['Any Craps', P.props.anyCraps + ' to 1'], ['Yo 11 / Ace-Deuce', P.props.yo + ' to 1'], ['Aces / Boxcars', P.props.aces + ' to 1']], rtp: 1 },
        { title: 'Fire Bet: unique points made by one shooter', text: 'Place before a new shooter\'s first roll. Pays when the shooter sevens out (or immediately at 6 points).', rows: P.fire.map(f => [f.name, f.pays + ' to 1']), rtp: RTP['craps.fire'] },
        { title: 'All / Tall / Small', text: 'Small: roll 2-3-4-5-6 before a 7. Tall: 8-9-10-11-12 before a 7. All: every one of them. Place when no numbers have been rolled since the last 7.', rows: [['Small', P.ats.small + ' to 1'], ['Tall', P.ats.tall + ' to 1'], ['All', P.ats.all + ' to 1']], rtp: RTP['craps.small'] },
      ];
    },
  };
})();
