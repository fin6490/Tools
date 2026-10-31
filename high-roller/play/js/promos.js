/* LuckyStrike.bet promotions (Level 3): what a real online casino dangles in front of you, except these are worth taking.
   Clearing £500,000 from £850 is meant to be hard, so the site's offers are tilted the player's way:
   - Welcome bonus (once): 100% of your balance, up to £1,000, released as cash after you've wagered 5× it.
   - Reload bonus (every 30 minutes, when no bonus is running): 50% of your balance, up to £5,000, after wagering 4× it.
   - Free spins (every 15 minutes): 25 spins on any LuckyStrike slot, each paying up to £2 of the stake.
   - Cashback (every 10 minutes): 20% of what you've lost since the last claim, up to £25,000.
   - Rakeback (any time): 2% of everything you wager, on every game.
   - Originals Power Hour (every 30 minutes, lasts 10): every Originals win pays 3% more (the games return 102%).
   Timers run on the real clock. Wagering counts every hand, spin and bet at the laptop; bonus money waits until its
   wagering is met, then lands in your balance. */
const L3Promo = (() => {
  const MIN = 60000, r2 = n => Math.round(n * 100) / 100;
  const C = {
    welcomeMax: 1000, welcomeX: 5,
    reloadPct: .5, reloadMax: 5000, reloadX: 4, reloadEvery: 30 * MIN,
    spins: 25, spinVal: 2, spinsEvery: 15 * MIN,
    cb: .2, cbCap: 25000, cbEvery: 10 * MIN,
    rake: .02,
    boost: 1.03, boostLen: 10 * MIN, boostEvery: 30 * MIN,
  };
  const P = () => { const s = L3.state; if (!s.promo) s.promo = { welcome: 0, bonus: null, reloadAt: 0, spins: 0, spinsAt: 0, cbNet: 0, cbAt: 0, rake: 0, wagered: 0, boostUntil: 0, boostAt: 0, paid: 0 }; return s.promo; };
  const now = () => Date.now();
  const left = at => Math.max(0, at - now());
  const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  // at the laptop's list the money is L3's cash; inside a game it's the bankroll the game is playing with
  const balance = () => App.inLaptop() ? App.state.bank : L3.state.cash;
  function pay(v, why) {
    v = r2(v); if (v <= 0) return;
    if (App.inLaptop()) App.state.bank = r2(App.state.bank + v); else L3.state.cash = r2(L3.state.cash + v);
    P().paid = r2(P().paid + v); App.count('l3_promo'); App.save();
    if (typeof SFX !== 'undefined') SFX.cash();
    UI.toast(`🎁 ${why}: +${L3.money(v)}`, 'good');
    if (App.inLaptop()) Router.hud();
  }

  /* ---------- what every bet feeds ---------- */
  // called from App.roundDone (tables, Originals) and from the slots, at the laptop only
  function round(r) {
    const w = r.wagered || 0; if (!(w > 0)) return;
    const p = P(); p.wagered = r2(p.wagered + w); p.rake = r2(p.rake + w * C.rake); p.cbNet = r2(p.cbNet + (r.net != null ? r.net : (r.returned || 0) - w));
    if (p.bonus) { p.bonus.done = r2(p.bonus.done + w); if (p.bonus.done >= p.bonus.need) { const b = p.bonus; p.bonus = null; pay(b.amt, `${b.name} released`); } }
  }
  // a free spin covers up to £2 of a slot stake
  function spinCover(stake) { const p = P(); if (!App.inLaptop() || !(p.spins > 0)) return 0; p.spins--; return Math.min(stake, C.spinVal); }
  const boost = () => App.inLaptop() && now() < P().boostUntil ? C.boost : 1;

  /* ---------- the offers ---------- */
  const offers = () => {
    const p = P(), bal = balance();
    return [
      { id: 'welcome', icon: '🎉', name: 'Welcome back bonus', what: `100% of your balance, up to ${L3.money(C.welcomeMax)}. Paid out once you've wagered ${C.welcomeX}× the bonus.`,
        state: p.welcome ? 'used' : p.bonus ? 'busy' : bal < 1 ? 'none' : 'ready', btn: `Claim ${L3.money(Math.min(bal, C.welcomeMax))}`,
        claim: () => { const amt = r2(Math.min(balance(), C.welcomeMax)); p.welcome = 1; p.bonus = { name: 'Welcome bonus', amt, need: r2(amt * C.welcomeX), done: 0 }; } },
      { id: 'reload', icon: '🔁', name: 'Reload bonus', what: `50% of your balance, up to ${L3.money(C.reloadMax)}, every 30 minutes. Paid out once you've wagered ${C.reloadX}× it.`,
        state: p.bonus ? 'busy' : !p.welcome ? 'after' : left(p.reloadAt) ? 'wait' : bal < 1 ? 'none' : 'ready', wait: left(p.reloadAt), btn: `Claim ${L3.money(Math.min(bal * C.reloadPct, C.reloadMax))}`,
        claim: () => { const amt = r2(Math.min(balance() * C.reloadPct, C.reloadMax)); p.reloadAt = now() + C.reloadEvery; p.bonus = { name: 'Reload bonus', amt, need: r2(amt * C.reloadX), done: 0 }; } },
      { id: 'spins', icon: '🎰', name: `${C.spins} free spins`, what: `On any LuckyStrike slot, each paying up to ${L3.money(C.spinVal)} of your stake. Every 15 minutes.${p.spins ? ` You have ${p.spins} left.` : ''}`,
        state: left(p.spinsAt) ? 'wait' : 'ready', wait: left(p.spinsAt), btn: 'Claim the spins',
        claim: () => { p.spins += C.spins; p.spinsAt = now() + C.spinsEvery; } },
      { id: 'cashback', icon: '💸', name: '20% cashback', what: `On what you've lost since your last claim (now ${L3.money(Math.max(0, -p.cbNet))}), up to ${L3.money(C.cbCap)}. Every 10 minutes.`,
        state: left(p.cbAt) ? 'wait' : p.cbNet < -.04 ? 'ready' : 'none', wait: left(p.cbAt), btn: `Claim ${L3.money(Math.min(-p.cbNet * C.cb, C.cbCap))}`,
        claim: () => { const v = Math.min(-p.cbNet * C.cb, C.cbCap); p.cbNet = 0; p.cbAt = now() + C.cbEvery; pay(v, 'Cashback'); } },
      { id: 'rake', icon: '♻️', name: '2% rakeback', what: `On everything you wager, every game. ${L3.money(p.wagered)} wagered so far.`,
        state: p.rake >= .5 ? 'ready' : 'none', btn: `Claim ${L3.money(p.rake)}`,
        claim: () => { const v = p.rake; p.rake = 0; pay(v, 'Rakeback'); } },
      { id: 'boost', icon: '⚡', name: 'Originals Power Hour', what: 'For ten minutes every Originals win pays 3% more (Dice, Limbo, Crash, Plinko and Mines return 102%). Every 30 minutes.',
        state: now() < p.boostUntil ? 'on' : left(p.boostAt) ? 'wait' : 'ready', wait: left(p.boostAt), on: left(p.boostUntil), btn: 'Start it',
        claim: () => { p.boostUntil = now() + C.boostLen; p.boostAt = now() + C.boostEvery; } },
    ];
  };
  const ready = () => offers().filter(o => o.state === 'ready').length;

  // the promotions shelf on the laptop; refresh() redraws the laptop (balance and all) after a claim
  function panel(refresh) {
    const box = h('div.l3-promos');
    const draw = () => {
      if (!box.isConnected && box._drawn) return clearInterval(box._t);
      box._drawn = 1; box.innerHTML = ''; const p = P();
      if (p.bonus) box.append(h('div.l3-bonus', h('b', `🎁 ${p.bonus.name}: ${L3.money(p.bonus.amt)}`), h('div.l3-goal2', h('i', { style: { width: Math.min(100, p.bonus.done / p.bonus.need * 100) + '%' } }), h('span', `${L3.money(p.bonus.done)} of ${L3.money(p.bonus.need)} wagered`))));
      for (const o of offers()) {
        const sub = o.state === 'wait' ? `Back in ${mmss(o.wait)}` : o.state === 'on' ? `On: ${mmss(o.on)} left` : o.state === 'used' ? 'Claimed' : o.state === 'busy' ? 'Finish your bonus first' : o.state === 'after' ? 'After the welcome bonus' : '';
        box.append(h('div.l3-promo' + (o.state === 'ready' ? '.ready' : o.state === 'on' ? '.on' : ''), h('span.l3-pi', o.icon), h('div', h('b', o.name), h('small', o.what)),
          o.state === 'ready' ? h('button.l3-btn', { onclick: () => { o.claim(); App.save(); if (o.id !== 'cashback' && o.id !== 'rake') UI.toast(`🎁 ${o.name}: claimed`, 'good'); refresh(); } }, o.btn) : h('em', sub)));
      }
    };
    draw(); box._t = setInterval(draw, 1000);
    return box;
  }

  return { C, round, spinCover, boost, panel, ready, offers, get state() { return P(); } };
})();
