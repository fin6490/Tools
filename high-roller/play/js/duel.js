/* Heads-up duels: you and one opponent each play blackjack against the same dealer and shoe for a
   fixed number of hands, betting from equal stacks. Whoever ends with more chips wins. Used for
   rival challenges and for the final table of the Salon Invitational. */
const Duel = (() => {
  const cv = r => (r >= 10 && r <= 13 ? 10 : r === 14 ? 11 : r);
  const total = cs => { let v = 0, a = 0; for (const c of cs) { v += cv(c.r); if (c.r === 14) a++; } while (v > 21 && a) { v -= 10; a--; } return v; };
  const soft = cs => { let v = 0, a = 0; for (const c of cs) { v += cv(c.r); if (c.r === 14) a++; } while (v > 21 && a) { v -= 10; a--; } return a > 0 && v <= 21; };
  // how each opponent plays a hand: return true to hit
  const STYLES = {
    basic: (cs, up) => { const v = total(cs), u = cv(up.r); if (soft(cs)) return v <= 17 || (v === 18 && u >= 9); if (v <= 11) return true; if (v >= 17) return false; if (v >= 13) return u >= 7; return !(u >= 4 && u <= 6); },
    reckless: cs => total(cs) < 17 || (soft(cs) && total(cs) < 19),
    timid: cs => total(cs) < 13,
    streaky: (cs, up, mood) => total(cs) < (mood > 0 ? 18 : 15),
  };

  /* opts: { title, foe: who (CHARACTERS key), style, hands, stack, bet, cheat (foe gets help),
             onLine(kind) -> scripted line, intro } -> resolves { me, foe, handsPlayed, busted } */
  function play(opts) {
    return new Promise(resolve => {
      const shoe = new Shoe(6, 0.9);
      const ch = CHARACTERS[opts.foe];
      let me = opts.stack, foe = opts.stack, hand = 0, mood = 0;
      let state = null;
      const meRow = h('div.cards.duel-row'), foeRow = h('div.cards.duel-row'), dRow = h('div.cards.duel-row');
      const meTot = h('span.tot'), foeTot = h('span.tot'), dTot = h('span.tot');
      const meStack = h('b'), foeStack = h('b'), handNo = h('span');
      const msg = h('p.duel-msg'), btns = h('div.actions');
      const bubble = h('div.duel-bubble');
      const say = t => { bubble.textContent = t || ''; bubble.classList.toggle('show', !!t); };
      const body = h('div.duel',
        h('div.duel-top', h('div', h('small', 'You'), meStack), h('div.duel-mid', handNo), h('div.duel-foe', h('small', ch.name), foeStack)),
        h('div.duel-felt',
          h('div.area-l', 'Dealer ', dTot), dRow,
          h('div.duel-split',
            h('div', h('div.area-l', 'You ', meTot), meRow),
            h('div', h('div.area-l', h('span.duel-face', Portrait.el(ch)), ' ', ch.name.split(' ')[0].replace(/"/g, ''), ' ', foeTot), foeRow, bubble))),
        msg, btns);
      const rowAdd = (row, c, down) => { const el = UI.card(c, down); row.append(el); SFX.card(); return el; };
      const render = () => {
        meStack.textContent = fmt(me); foeStack.textContent = fmt(foe);
        handNo.textContent = `Hand ${Math.min(hand + 1, opts.hands)} of ${opts.hands}`;
      };
      const setBtns = list => { btns.innerHTML = ''; list.forEach(b => btns.append(h('button.btn' + (b.cls ? '.' + b.cls : ''), { onclick: b.on, disabled: b.disabled }, b.label))); };
      const draw = () => { if (shoe.needsShuffle) shoe.shuffle(); return shoe.draw(); };
      const finish = () => {
        render();
        const busted = me <= 0 || foe <= 0;
        msg.textContent = me > foe ? 'You win the match!' : me < foe ? `${ch.name} wins the match.` : 'Dead even.';
        say(opts.onLine && opts.onLine(me > foe ? 'lose' : me < foe ? 'win' : 'push'));
        setBtns([{ label: 'Done', cls: 'primary', on: () => { pop.close(); } }]);
        result = { me, foe, handsPlayed: hand, busted };
      };
      let result = null;
      const deal = async () => {
        if (hand >= opts.hands || me <= 0 || foe <= 0) return finish();
        const bet = Math.min(opts.bet, me), fbet = Math.min(opts.bet, foe);
        meRow.innerHTML = foeRow.innerHTML = dRow.innerHTML = ''; meTot.textContent = foeTot.textContent = dTot.textContent = '';
        say('');
        state = { P: [draw(), draw()], F: [draw(), draw()], D: [draw(), draw()], bet, fbet, doubled: false };
        state.P.forEach(c => rowAdd(meRow, c)); state.F.forEach(c => rowAdd(foeRow, c)); rowAdd(dRow, state.D[0]); state.hole = rowAdd(dRow, state.D[1], true);
        meTot.textContent = total(state.P); foeTot.textContent = total(state.F); dTot.textContent = cv(state.D[0].r);
        msg.textContent = `Bets: ${fmt(bet)} each. Your move.`;
        if (total(state.P) === 21) return foeTurn();
        setBtns([
          { label: 'Hit', cls: 'primary', on: () => { state.P.push(draw()); rowAdd(meRow, state.P.at(-1)); meTot.textContent = total(state.P); if (total(state.P) >= 21) foeTurn(); } },
          { label: 'Stand', cls: 'primary', on: () => foeTurn() },
          { label: 'Double', disabled: me < bet * 2, on: () => { state.doubled = true; state.bet *= 2; state.P.push(draw()); rowAdd(meRow, state.P.at(-1)); meTot.textContent = total(state.P); foeTurn(); } },
        ]);
      };
      const foeTurn = async () => {
        setBtns([]);
        const style = STYLES[opts.style] || STYLES.basic;
        while (total(state.F) < 21 && style(state.F, state.D[0], mood)) {
          await sleep(320);
          let c = draw();
          // the house looks after its owner unless someone at the table is watching the shoe
          if (opts.cheat && total(state.F) + cv(c.r) > 21 && RNG.chance(0.5)) c = { r: 21 - total(state.F) >= 10 ? 10 : Math.max(2, 21 - total(state.F)), s: c.s };
          state.F.push(c); rowAdd(foeRow, c); foeTot.textContent = total(state.F);
        }
        dealerTurn();
      };
      const dealerTurn = async () => {
        await sleep(300); state.hole.classList.remove('down'); SFX.flip();
        const live = total(state.P) <= 21 || total(state.F) <= 21;
        while (live && total(state.D) < 17) { await sleep(300); const c = draw(); state.D.push(c); rowAdd(dRow, c); }
        const d = total(state.D); dTot.textContent = d > 21 ? 'BUST' : d;
        const settle = (cs, bet) => { const v = total(cs); if (v > 21) return -bet; if (cs.length === 2 && v === 21 && !(state.D.length === 2 && d === 21)) return bet * 1.5; if (d > 21 || v > d) return bet; if (v < d) return -bet; return 0; };
        const dm = settle(state.P, state.bet), df = settle(state.F, state.fbet);
        me = round2(me + dm); foe = round2(foe + df);
        mood = df > 0 ? mood + 1 : df < 0 ? mood - 1 : mood;
        msg.textContent = `You ${dm > 0 ? 'win ' + fmt(dm) : dm < 0 ? 'lose ' + fmt(-dm) : 'push'} · ${ch.name.split(' ')[0].replace(/"/g, '')} ${df > 0 ? 'wins ' + fmt(df) : df < 0 ? 'loses ' + fmt(-df) : 'pushes'}`;
        if (opts.onLine && RNG.chance(0.6)) say(opts.onLine(df > dm ? 'ahead' : df < dm ? 'behind' : 'even'));
        hand++; render();
        if (dm > df) SFX.win(); else if (dm < df) SFX.lose();
        setBtns([{ label: hand >= opts.hands || me <= 0 || foe <= 0 ? 'See result' : 'Next hand', cls: 'primary', on: deal }]);
      };
      const pop = UI.modal({ title: opts.title, body, wide: true, closable: false, cls: 'duel-modal' });
      pop.then(() => resolve(result || { me, foe, handsPlayed: hand, busted: me <= 0 || foe <= 0 }));
      render();
      if (opts.intro) msg.textContent = opts.intro;
      setBtns([{ label: 'Deal the first hand', cls: 'primary', on: deal }]);
    });
  }

  /* ---------- rival challenges ---------- */
  const STYLE_OF = { tex: 'reckless', mei: 'basic', baron: 'timid', rico: 'streaky' };
  const LINES = {
    tex: { win: 'Yeehaw! Told ya I can feel \'em!', lose: 'Well, shoot. You got me fair.', push: 'A tie? That\'s like kissin\' your sister.', ahead: 'Keep \'em comin\'!', behind: 'Dang cards.', even: 'Neck and neck, partner.' },
    mei: { win: 'Expected value prevails.', lose: 'Hm. Variance. Well played.', push: 'A statistically unremarkable result.', ahead: 'As modelled.', behind: 'Noise.', even: 'Converging.' },
    baron: { win: 'Naturally. Run along, peasant.', lose: 'I let you win. For charity.', push: 'How tedious.', ahead: 'Breeding tells.', behind: 'An aberration.', even: 'Hmph.' },
    rico: { win: 'SEVENTEEN, BABY!', lose: 'Ay, you\'re on fire tonight!', push: 'Tie! Let\'s call it destiny.', ahead: 'The streak!', behind: 'Bad juju...', even: 'Ooh, close!' },
    kessler: { win: 'The house always wins. I am the house.', lose: 'Interesting.', push: 'A draw. How disappointing for you.', ahead: 'You play like Sal. That is not a compliment.', behind: 'Enjoy it.', even: 'Patience.' },
  };
  async function challenge(rivalId) {
    const st = App.state, r = st.rivals[rivalId];
    const stake = Math.max(500, Math.min(50000, Math.floor(Math.min(st.bank, r.bank) * 0.1 / 100) * 100));
    if (st.bank < stake || r.bank < stake) { UI.toast('Not enough money on one side of the table for a challenge', 'warn'); return; }
    if ((st.flags.lastChallenge || {})[rivalId] === st.day) { UI.toast(`${CHARACTERS[rivalId].name} already played you today`, 'warn'); return; }
    const go = await UI.confirm('Heads-up challenge', `Six hands of blackjack, side by side, against ${CHARACTERS[rivalId].name}. Each of you puts up ${fmt(stake)}; whoever ends with more chips takes the pot.`, `Put up ${fmt(stake)}`);
    if (!go) return;
    st.flags.lastChallenge = Object.assign({}, st.flags.lastChallenge, { [rivalId]: st.day });
    App.debit(stake); r.bank -= stake;
    const res = await play({ title: `⚔️ Heads-up vs ${CHARACTERS[rivalId].name}`, foe: rivalId, style: STYLE_OF[rivalId], hands: 6, stack: 10000, bet: 1000, onLine: k => LINES[rivalId][k] });
    if (res.me > res.foe) { App.credit(stake * 2); r.net -= stake; App.count('duelsWon'); UI.toast(`🏆 You beat ${CHARACTERS[rivalId].name}: +${fmt(stake)}`, 'big'); App.news(`⚔️ ${st.name} beat ${CHARACTERS[rivalId].name} heads-up for ${fmt(stake)}.`); }
    else if (res.me < res.foe) { r.bank += stake * 2; r.net += stake; UI.toast(`${CHARACTERS[rivalId].name} takes the pot`, 'warn'); }
    else { App.credit(stake); r.bank += stake; UI.toast('Dead even: stakes returned'); }
    App.save(); Router.hud();
  }
  return { play, challenge, LINES, total };
})();
