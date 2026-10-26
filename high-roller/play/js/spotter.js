/* Spotting for Doc's team: a skill job for the middle of the career. Doc runs a quiet blackjack
   team on the Riverboat and pays spotters who can keep a Hi-Lo running count (2-6 is +1, 7-9 is 0,
   10-A is -1) while the cards fly. One paid session a day, practice is free, and the pay grows
   with each chapter so there's always a dependable, luck-free way to earn. */
const Spotter = (() => {
  const TIERS = {
    rookie: { name: 'Rookie table', cards: 16, ms: 1100, per: 1, mult: 1, desc: 'One card at a time, nice and slow.' },
    pro: { name: 'Busy table', cards: 24, ms: 1800, per: 2, mult: 2.2, desc: 'Cards come in pairs, like a real deal, with time to add them up.' },
    big: { name: 'Big player signal', cards: 30, ms: 2300, per: 3, mult: 4, desc: 'Three at a time. This is the count the big player bets on.' },
  };
  const BASE = [150, 500, 2500, 6000];
  const hilo = c => c.r >= 2 && c.r <= 6 ? 1 : c.r >= 10 ? -1 : 0;
  const pay = k => Math.round(BASE[Math.min(App.state.chapter, 3)] * TIERS[k].mult * (App.state.ending ? 3 : 1) / 10) * 10;
  const used = () => App.state.today && App.state.today.spot;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // deal a run of cards in the modal, then ask for the count; returns { exact, off, count, guess }
  async function drill(k, paid) {
    const T = TIERS[k], cards = [], deck = new Shoe(1, 1);
    for (let i = 0; i < T.cards; i++) cards.push(deck.draw());
    const stage = h('div.sp-stage'), prog = h('div.sp-prog'), body = h('div.sp-drill', h('p.muted.small', paid ? 'Count every card. Doc pays on the number you give him.' : 'Practice run: nobody\'s paying, so relax.'), stage, prog);
    let stop = false;
    const pop = UI.modal({ title: `🧮 ${T.name}`, body, closable: true, buttons: [] });
    pop.then(() => { stop = true; });
    await sleep(700);
    for (let i = 0; i < cards.length && !stop; i += T.per) {
      stage.innerHTML = '';
      cards.slice(i, i + T.per).forEach(c => stage.append(UI.card(c)));
      prog.textContent = `${Math.min(i + T.per, cards.length)} / ${cards.length}`;
      SFX.card && SFX.card();
      await sleep(T.ms);
      stage.innerHTML = ''; await sleep(90);
    }
    if (stop) return null;
    pop.close && pop.close();
    const count = cards.reduce((a, c) => a + hilo(c), 0);
    const inp = h('input.field#sp-guess', { type: 'number', inputmode: 'numeric', step: 1, placeholder: 'e.g. -2', autocomplete: 'off',
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); const bt = e.target.closest('.modal').querySelector('.modal-f .btn.primary'); bt && bt.click(); } } });
    const ask = h('div', h('p', 'Doc leans in: "What\'s the running count?"'), h('label.lbl', { for: 'sp-guess' }, 'Running count'), inp);
    setTimeout(() => inp.focus(), 60);
    const ok = await UI.modal({ title: '🧮 The count', body: ask, closable: false, buttons: [{ label: 'Tell Doc', value: true, cls: 'primary' }] });
    const guess = parseInt(inp.value, 10);
    const off = Number.isFinite(guess) ? Math.abs(guess - count) : 99;
    return ok ? { exact: off === 0, off, count, guess, cards } : null;
  }

  async function play(k, paid, api) {
    if (paid) {
      if (used()) { UI.toast('Doc only needs one spotter shift a day.', 'warn'); return; }
      const why = Career.canPlay && Career.canPlay(); if (why) { UI.toast(why, 'warn'); return; }
      if (App.state.stamina < 10) { UI.toast('You\'re too tired to keep count', 'warn'); return; }
    }
    const r = await drill(k, paid);
    if (!r) return;
    const st = App.state, full = pay(k);
    let won = 0, line;
    if (r.exact) { won = full; line = RNG.pick(['On the nose. The big player just tripled his bet on your signal.', 'Exactly right. Sal would\'ve bought you a drink.', 'Perfect. You\'ve got a head for it, kid.']); }
    else if (r.off === 1) { won = Math.round(full * .4 / 10) * 10; line = `Close: it was ${r.count > 0 ? '+' : ''}${r.count}. Close keeps us from losing, it doesn't make us money. Partial cut.`; }
    else line = `It was ${r.count > 0 ? '+' : ''}${r.count}. You said ${Number.isFinite(r.guess) ? r.guess : 'nothing'}. That kind of miss gets a big player burned. No cut today.`;
    if (paid) {
      st.today.spot = true; st.stamina = Math.max(0, st.stamina - 10); st.clock = (st.clock || 540) + 120;
      if (won) App.credit(won);
      App.count('spotShifts'); if (r.exact) App.count('spotPerfect');
      App.save(); Router.hud && Router.hud(); Career.checkAchievements && Career.checkAchievements();
    }
    const msg = paid ? `${line}${won ? ` **+${fmt(won)}**` : ''}` : `${line.replace(/ Partial cut\.| No cut today\./, '')} (Practice: no pay.)`;
    if (api) api.say(msg.replace(/\*\*/g, '')); else await UI.dialog([{ who: 'doc', text: msg }]);
    if (paid && won) UI.toast(`🧮 Doc's cut: ${fmt(won)}`, 'good');
  }

  return {
    TIERS, pay, hilo,
    // the card inside Doc's chat window
    card(api) {
      const wrap = h('div.job-card.sp-card');
      const render = () => {
        const st = App.state;
        wrap.innerHTML = '';
        wrap.append(h('b', '🧮 Spot for Doc\'s team'),
          h('p.small', 'Keep the Hi-Lo running count while cards fly: 2 to 6 is +1, 7 to 9 is 0, tens, faces and aces are −1. Get it exactly right and Doc pays your cut; one off earns a partial cut.'),
          h('p.muted.small', used() ? 'You\'ve already spotted today. Practice is free.' : `One paid shift a day (2 hours, a little energy). Perfect counts so far: ${App.counter('spotPerfect') || 0}.`));
        const row = h('div.sp-tiers');
        for (const k in TIERS) {
          const T = TIERS[k];
          row.append(h('div.sp-tier', h('b', T.name), h('small', T.desc),
            h('div.ev-row', h('button.btn.sm.primary', { disabled: used() || st.mode !== 'career' ? true : null, onclick: () => play(k, true, api).then(render) }, `Paid: ${fmt(pay(k))}`),
              h('button.btn.sm.ghost', { onclick: () => play(k, false, api).then(render) }, 'Practice'))));
        }
        wrap.append(row);
      };
      render();
      return wrap;
    },
  };
})();
