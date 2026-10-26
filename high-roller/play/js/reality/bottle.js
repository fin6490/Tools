/* The bottle: Level 2's drinking problem. You drank before the dream, and you drank in it; when you
   wake, your body remembers. How badly depends on how much you drank in the town (Level 1).
   - Craving builds while you play. Past a point you get a cold sweat, then nausea (the view sways
     and sours), then the shakes (the view trembles, you walk slower, cards and coins are harder).
   - A drink stops it, for a while. Each one makes the next craving come faster.
   - The side story has two ends. Recovery ("One Day at a Time") means telling Dr. Okafor the truth,
     pouring out the flask in your car, calling Detective Mori (eleven years sober) when it gets
     loud, and turning down three drinks you're offered. Giving in ("Last Call") is six drinks.
   It's told plainly and without judgement, and nothing in the main story is locked behind it. */
const L2Bottle = (() => {
  const st = () => { const s = L2.state; if (!s.drink) s.drink = { sev: 0, crave: 20, buzz: 0, drinks: 0, refused: {}, steps: {}, path: null, stage: 0, called: 0 }; return s.drink; };
  const SEV = ['', 'mild', 'moderate', 'severe'];
  const STAGES = [[35, 'sweats', 'A cold sweat. The air in here is too warm and then too cold.'], [60, 'nausea', 'Nausea comes up in a slow wave. The floor tilts, just slightly, and doesn\'t tilt back.'], [80, 'shakes', 'The shakes. You hold your hands out and watch them tremble like they belong to someone else.']];
  const THOUGHTS = ['Just one. Just to steady your hands.', 'Delia would pour you one. She wouldn\'t even ask.', 'Nobody would know.', 'You can stop tomorrow. You\'ve said that before.', 'Nora used to hide the good bottle behind the flour.', 'One drink and the noise stops.'];
  const OFFERS = { delia: 'Delia', margaux: 'Margaux', minibar: 'the minibar' };
  let timer = 0, tick = 0, lastThought = 0;

  // how hard it hits depends on the dream: drinks, nights you got tipsy, and hangovers, per day played
  function severity() {
    const s = App.state, score = App.counter('drinks') + 3 * App.counter('gotTipsy') + 4 * App.counter('hangovers');
    const perDay = score / Math.max(3, s.day || 1);
    return perDay < 1 ? 1 : perDay < 4 ? 2 : 3;
  }
  function init() { const d = st(); if (!d.path) d.sev = Math.max(d.sev || 0, severity()); return d; }
  const sober = () => st().path === 'sober';
  const stepsDone = () => { const d = st(); return ['admit', 'flask', 'sponsor'].filter(k => d.steps[k]).length; };
  const refusals = () => Object.keys(st().refused).length;
  // craving per second: severe ~3½ minutes to the shakes, mild ~10; every recovery step eases it
  const rate = () => { const d = st(); return [0, 100 / 600, 100 / 360, 100 / 210][d.sev] * (1 - .15 * stepsDone()) * (d.path === 'gaveIn' ? 1.3 : 1) * (1 + .04 * d.drinks); };

  function start() {
    stop(); init(); apply();
    timer = setInterval(() => {
      if (Router.screen !== 'reality' || document.hidden || !App.state || !App.state.l2) return;
      const d = st(); tick++;
      if (sober()) { d.crave = 0; d.buzz = 0; apply(); return; }
      if (d.buzz > 0) d.buzz = Math.max(0, d.buzz - 100 / 180);
      else d.crave = Math.min(100, d.crave + rate() * (R3.busy ? .35 : 1));
      // getting worse: say so once per stage
      const stage = STAGES.filter(([at]) => d.crave >= at).length;
      if (stage > d.stage && !R3.busy) { d.stage = stage; L2.toast(STAGES[stage - 1][2]); }
      if (stage < d.stage) d.stage = stage;
      if (d.crave >= 60 && !R3.busy && tick - lastThought > 45) { lastThought = tick; L2.toast(`🥃 ${pick(THOUGHTS)}`); }
      apply(); if (tick % 10 === 0) App.save();
    }, 1000);
  }
  function stop(keepClasses) { clearInterval(timer); timer = 0; if (typeof R3 !== 'undefined' && R3.setFx) R3.setFx(null); if (!keepClasses) ['l2-sweats', 'l2-nausea', 'l2-shakes', 'l2-drunk'].forEach(c => document.body.classList.remove(c)); }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // what you feel, on screen and in your legs
  function apply() {
    const d = st(), c = sober() ? 0 : d.crave, b = d.buzz, root = document.querySelector('.l2');
    if (R3.setFx) R3.setFx({ shake: c >= 80 ? .006 + (c - 80) / 20 * .014 : 0, sway: (c >= 60 ? .01 + (c - 60) / 40 * .012 : 0) + b / 100 * .03, slow: c >= 80 ? .72 : b > 50 ? .85 : 1 });
    const cls = { 'l2-sweats': c >= 35, 'l2-nausea': c >= 60, 'l2-shakes': c >= 80, 'l2-drunk': b > 30 };
    const on = Router.screen === 'reality' || App.inReality(); // the shakes follow you to the tables
    for (const k in cls) document.body.classList.toggle(k, on && !!cls[k]);
    const el = root && root.querySelector('.l2-crave');
    if (el) { el.textContent = sober() ? '🕊️ Sober' : b > 30 ? '🥃 Drinking' : c >= 80 ? '🤚 The shakes' : c >= 60 ? '🤢 Nauseous' : c >= 35 ? '💧 Sweating' : '🥃 Steady'; el.className = 'l2-crave' + (c >= 60 ? ' bad' : sober() ? ' good' : ''); }
  }

  /* ---------- drinking, and not ---------- */
  async function drink(where, cost = 0) {
    const d = st();
    if (cost && L2.state.cash < cost) { L2.toast('Not enough money.'); return false; }
    if (cost) L2.state.cash -= cost;
    d.drinks++; d.crave = 0; d.stage = 0; d.buzz = Math.min(100, d.buzz + 60); App.count('l2_drinks');
    await L2.ui.say([{ who: 'narr', text: pick(['The first swallow burns, and then the world goes quiet and kind. Your hands are still. You hate how much better you feel.', 'It goes down like an apology. The shakes stop before the glass is empty.', 'Warmth, and then nothing. The nothing is what you came for.']) }]);
    apply(); L2.hud(); check(); App.save(); return true;
  }
  function refuse(where) { const d = st(); if (d.refused[where]) return; d.refused[where] = 1; d.crave = Math.max(0, d.crave - 10); App.count('l2_refused'); L2.toast(`🕊️ You said no (${refusals()} of 3).`); check(); App.save(); }
  // a drink is offered: take it or don't
  async function offer(where, line, cost = 0) {
    const d = st(); if (d.path || d.refused[where]) return;
    const c = await L2.ui.choose(line, [['no', where === 'delia' ? '"Just water, Delia."' : 'Leave it.'], ['yes', cost ? `Drink it (${fmt(cost)})` : 'Drink it']]);
    if (c === 'yes') await drink(where, cost); else { refuse(where); await L2.ui.say([{ who: 'narr', text: pick(['You don\'t. It costs more than it should, saying no. It always will.', 'Your hand stops halfway. You put it in your pocket and leave it there.', 'Not tonight. You say it out loud, to make it true.']) }]); }
  }
  async function step(k) { const d = st(); if (d.steps[k] || d.path) return; d.steps[k] = 1; App.save(); check(); }
  async function callMori() {
    const d = st();
    if (!d.steps.sponsorOffered) return;
    if (Date.now() - (d.lastCall || 0) < 90000) return L2.toast('Mori\'s phone goes to voicemail. Try again in a minute.');
    d.lastCall = Date.now(); d.called++; d.crave = Math.max(0, d.crave - 45);
    await L2.ui.say([{ who: 'mori', text: pick(['Talk to me. What are you looking at right now? Describe it. ...Good. Keep talking.', 'It\'ll pass. It always passes. Twenty minutes. I\'ll stay on the line.', 'You don\'t have to not drink forever. Just not right now. Right now is all you have to do.', 'I wanted one every day for the first year. Then every other day. Then I forgot to want it, one Tuesday.']) }, { who: 'narr', text: 'The craving doesn\'t go. But it gets smaller, and further away.' }]);
    if (!d.steps.sponsor) await step('sponsor');
    apply();
  }
  // see if one of the two paths has ended
  async function check() {
    const d = st(); if (d.path) return;
    if (stepsDone() === 3 && refusals() >= 3) {
      d.path = 'sober'; d.crave = 0; App.count('l2_sober'); App.save(); apply();
      await L2.ui.say([{ who: 'narr', text: 'Somewhere between the lift and here, your hands stopped shaking. You notice it the way you notice rain has stopped.' }, { who: 'narr', text: 'It\'s not over. It\'s never over. It\'s today, and today you didn\'t.' }]);
      L2.toast('🕊️ One Day at a Time'); Career.checkAchievements();
    } else if (d.drinks >= 6) {
      d.path = 'gaveIn'; App.count('l2_gavein'); App.save(); apply();
      await L2.ui.say([{ who: 'narr', text: 'The shakes are gone. So is the part of you that was fighting it. You stop counting the glasses, because counting was a kind of hope.' }]);
      L2.toast('🥃 Last Call'); Career.checkAchievements();
    }
  }

  /* ---------- the notebook page ---------- */
  function panel() {
    const d = st(), tick = b => b ? '☑' : '☐';
    return h('div',
      h('p.l2-obj2', d.path === 'sober' ? 'Sober. One day at a time.' : d.path === 'gaveIn' ? 'You stopped fighting it.' : `A drinking problem (${SEV[d.sev]}).`),
      h('p.l2-read', d.path ? (d.path === 'sober' ? 'You told the truth, poured it out, called for help and said no. The cravings have let go of you, for today.' : `${d.drinks} drinks since you woke. The cravings come back faster each time, and you meet them at the bar.`) : `It comes back if you go without: sweats, then nausea, then the shakes. How hard it hits comes from how much you drank in the dream. ${d.drinks ? `${d.drinks} drink${d.drinks > 1 ? 's' : ''} since you woke.` : ''}`),
      !d.path ? h('div.l2-clue', h('b', 'Getting through it'),
        h('p', `${tick(d.steps.admit)} Tell Dr. Okafor the truth`), h('p', `${tick(d.steps.flask)} The flask in your glovebox`), h('p', `${tick(d.steps.sponsor)} ${d.steps.sponsorOffered ? 'Call Detective Mori when it gets loud (☰ menu)' : 'Someone who understands'}`), h('p', `${tick(refusals() >= 3)} Turn down three drinks (${refusals()} of 3)`)) : null,
      !d.path ? h('p.l2-hint', `Or don't. Six drinks and the struggle is over, one way.`) : null,
      h('p.l2-hint', 'If drinking is affecting your life, or the life of someone you love, talking to a doctor or a local support group is a good first step. You don\'t have to do it alone.'));
  }
  // for the endings
  const path = () => st().path;
  const ready = () => !!st().steps.sponsorOffered && !sober();

  return { init, start, stop, apply, drink, refuse, offer, step, callMori, panel, path, ready, severity, get state() { return st(); }, SEV };
})();
