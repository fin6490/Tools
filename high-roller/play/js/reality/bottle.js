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
  let timer = 0, tick = 0, lastThought = 0, maxedFor = 0, huntCool = 0, hunt = null;

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
  const rate = () => { const d = st(); return [0, 100 / 600, 100 / 360, 100 / 210][d.sev] * (1 - .15 * stepsDone()) * (d.path === 'gaveIn' ? 1.3 : 1) * (1 + .04 * d.drinks) * (needs().thirst < 25 ? 1.4 : 1); };

  /* ---------- food, water and sleep: the same bars as in the dream, carried over ---------- */
  // Level 2 uses the dream's own hunger, thirst and energy, so you wake up as hungry as you went to
  // sleep, and they come back with you when you dream again. Awake, they drain in real time
  // (hunger in about half an hour, thirst a bit faster, energy in forty minutes), and a little
  // more for each round at a table. Thirst makes the craving louder; hunger and tiredness slow you
  // down, and with no energy left you can't run.
  function needs() { const s = App.state; return { hunger: s.hunger == null ? 80 : s.hunger, thirst: s.thirst == null ? 80 : s.thirst, energy: s.stamina == null ? 100 : 100 * s.stamina / Math.max(1, s.staminaMax || 100) }; }
  function feed({ hunger = 0, thirst = 0, energy = 0 }) {
    const s = App.state;
    s.hunger = clamp((s.hunger == null ? 80 : s.hunger) + hunger, 0, 100); s.thirst = clamp((s.thirst == null ? 80 : s.thirst) + thirst, 0, 100);
    s.stamina = clamp((s.stamina == null ? 100 : s.stamina) + energy * (s.staminaMax || 100) / 100, 0, s.staminaMax || 100);
    warned = {}; apply(); L2.hud(); App.save();
  }
  let warned = {};
  function drainNeeds(sec) {
    const s = App.state, mx = s.staminaMax || 100;
    s.hunger = Math.max(0, (s.hunger == null ? 80 : s.hunger) - sec * 100 / 1800);
    s.thirst = Math.max(0, (s.thirst == null ? 80 : s.thirst) - sec * 100 / 1350);
    s.stamina = Math.max(0, (s.stamina == null ? mx : s.stamina) - sec * mx / 2400);
    const n = needs(), say = { hunger: ['🍔 Your stomach turns over. You can\'t remember the last thing you ate.', '🍔 Light-headed with hunger. The floor keeps tilting.'], thirst: ['💧 Your mouth is dry. A dry mouth makes the craving louder.', '💧 Parched. Your head is pounding.'], energy: ['⚡ You\'re running on empty. A coffee would help.', '⚡ Exhausted. Your legs won\'t run any more.'] };
    for (const k in say) { const lvl = n[k] <= 0 ? 2 : n[k] < 20 ? 1 : 0; if (lvl > (warned[k] || 0) && !R3.busy) L2.toast(say[k][lvl - 1]); warned[k] = lvl; }
  }
  // a round at one of the tables
  function roundNeeds(kind, k = 1) { if (kind === 'round') drainNeeds(25 * k); }

  function start() {
    stop(); init(); apply();
    timer = setInterval(() => {
      if (Router.screen !== 'reality' || document.hidden || !App.state || !App.state.l2) return;
      const d = st(); tick++;
      if (sober()) { drainNeeds(R3.busy ? .35 : 1); d.crave = 0; d.buzz = 0; apply(); L2.hud(); return; }
      drainNeeds(R3.busy ? .35 : 1);
      if (d.buzz > 0) d.buzz = Math.max(0, d.buzz - 100 / 180);
      else d.crave = Math.min(100, d.crave + rate() * (R3.busy ? .35 : 1));
      // getting worse: say so once per stage
      const stage = STAGES.filter(([at]) => d.crave >= at).length;
      if (stage > d.stage && !R3.busy) { d.stage = stage; L2.toast(STAGES[stage - 1][2]); }
      if (stage < d.stage) d.stage = stage;
      if (d.crave >= 60 && !R3.busy && tick - lastThought > 45) { lastThought = tick; L2.toast(`🥃 ${pick(THOUGHTS)}`); }
      apply(); L2.hud(); if (tick % 10 === 0) App.save();
      demons(d);
    }, 1000);
  }
  function stop(keepClasses) { clearInterval(timer); timer = 0; if (hunt) endHunt('door'); if (typeof R3 !== 'undefined' && R3.setFx) R3.setFx(null); if (!keepClasses) ['l2-sweats', 'l2-nausea', 'l2-shakes', 'l2-drunk', 'l2-hunted'].forEach(c => document.body.classList.remove(c)); }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // what you feel, on screen and in your legs
  function apply() {
    const d = st(), c = sober() ? 0 : d.crave, b = d.buzz, root = document.querySelector('.l2');
    const n = needs(), weak = n.hunger <= 0 || n.thirst <= 0 || n.energy <= 0;
    const body = (n.hunger < 20 ? .88 : 1) * (n.energy < 20 ? .85 : 1) * (weak ? .85 : 1);
    if (R3.setFx) R3.setFx({ shake: c >= 80 ? .006 + (c - 80) / 20 * .014 : 0, sway: (c >= 60 ? .01 + (c - 60) / 40 * .012 : 0) + b / 100 * .03 + (n.hunger <= 0 ? .012 : 0), slow: (c >= 80 ? .72 : b > 50 ? .85 : 1) * body, noRun: n.energy <= 0 });
    document.body.classList.toggle('l2-weak', weak && (Router.screen === 'reality'));
    const cls = { 'l2-sweats': c >= 35, 'l2-nausea': c >= 60, 'l2-shakes': c >= 80, 'l2-drunk': b > 30 };
    const on = Router.screen === 'reality' || App.inReality(); // the shakes follow you to the tables
    for (const k in cls) document.body.classList.toggle(k, on && !!cls[k]);
    const el = root && root.querySelector('.l2-crave');
    if (el) { el.textContent = sober() ? '🕊️ Sober' : b > 30 ? '🥃 Drinking' : c >= 80 ? '🤚 The shakes' : c >= 60 ? '🤢 Nauseous' : c >= 35 ? '💧 Sweating' : '🥃 Steady'; el.className = 'l2-crave' + (c >= 60 ? ' bad' : sober() ? ' good' : ''); }
  }

  /* ---------- the Barman: what comes for you if you don't stop ---------- */
  // A hallucination in a stained white apron. He comes when the craving has been screaming for a while,
  // or every few minutes once you've given in. He walks through walls. Outrun him for half a minute, get
  // out of the room, or call Mori. If he catches you, you go down; the third time, you don't get up.
  const NO_HUNT = ['cemetery', 'spur', 'clinic'];
  function demons(d) {
    if (hunt) { if (R3.area !== hunt.area) endHunt('door'); return; }
    if (R3.busy || NO_HUNT.includes(R3.area) || L2.has('done')) { maxedFor = 0; return; }
    huntCool = Math.max(0, huntCool - 1);
    if (!d.glimpsed && d.crave >= 80) { d.glimpsed = 1; glimpse(); return; }
    if (d.path === 'gaveIn') { d.hn = (d.hn == null ? 120 : d.hn) - 1; if (d.hn <= 0) { d.hn = 150 + Math.random() * 90; startHunt(); } return; }
    maxedFor = d.crave >= 95 ? maxedFor + 1 : 0;
    if (maxedFor >= 25 && !huntCool) { maxedFor = 0; startHunt(); }
  }
  const makeBarman = () => L2Demon.make();
  let actx = null;
  function thump(v) { // a heartbeat, louder as he gets closer
    if (App.state.settings.sound === false) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime;
      for (const [dt, f] of [[0, 62], [.16, 52]]) { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, t + dt); g.gain.exponentialRampToValueAtTime(.35 * v, t + dt + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dt + .22); o.connect(g); g.connect(actx.destination); o.start(t + dt); o.stop(t + dt + .25); }
    } catch (e) { }
  }
  // the first time: he's just standing there, at the edge of the light, and then he isn't
  function glimpse() {
    const P = R3.player, g = makeBarman(), id = {};
    g.position.set(P.x + Math.sin(P.yaw + .5) * 9, 0, P.z + Math.cos(P.yaw + .5) * 9); g.rotation.y = Math.atan2(P.x - g.position.x, P.z - g.position.z);
    let life = 0; R3.api.every((t, dt) => { if (!id) return; life += dt; if (g.parent) g.userData.animate(t, dt, 9, 0); g.visible = life < 2.4 && Math.random() > .05; if (life > 2.4 && g.parent) g.parent.remove(g); });
    L2Demon.sting();
    L2.toast('🍸 Something tall at the edge of the light, in a rotten barman\'s apron. Too many eyes. When you look again, it\'s gone.');
  }
  function startHunt() {
    if (hunt || typeof THREE === 'undefined' || !R3.api.root) return;
    const P = R3.player, g = makeBarman(), d = st();
    g.position.set(P.x - Math.sin(P.yaw) * 11, 0, P.z - Math.cos(P.yaw) * 11);
    const H = hunt = { g, area: R3.area, t: 0, beat: 0 };
    document.body.classList.add('l2-hunted'); App.count('l2_hunted');
    L2.toast(d.hunts ? '🍸 He\'s back. Run.' : `🍸 Something is behind you. Footsteps that don't echo. Don't look. Run. (${R3.touch ? 'Push the stick all the way out, or tap 🏃' : 'Hold Shift'}. Get out of the room, or call Mori.)`);
    d.hunts = (d.hunts || 0) + 1;
    R3.api.every((t, dt) => {
      if (hunt !== H || R3.busy) return;
      H.t += dt;
      const dx = R3.player.x - g.position.x, dz = R3.player.z - g.position.z, dist = Math.hypot(dx, dz);
      const speed = 2 + Math.min(.9, H.t * .035); // walk 2.1, run 3.6 (less with the shakes)
      g.position.x += dx / dist * speed * dt; g.position.z += dz / dist * speed * dt; g.rotation.y = Math.atan2(dx, dz);
      g.userData.animate(t, dt, dist, speed); L2Demon.tick(dt, Math.max(0, 1 - dist / 14));
      g.visible = Math.random() > .03;
      H.beat -= dt; if (H.beat <= 0) { H.beat = .35 + Math.min(.7, dist / 14); thump(Math.max(.2, 1 - dist / 14)); }
      if (dist < .75) caught();
      else if (H.t > 28) endHunt('outran');
    });
  }
  function endHunt(how) {
    const H = hunt; if (!H) return; hunt = null; huntCool = 90; L2Demon.quiet();
    if (H.g.parent) H.g.parent.remove(H.g);
    document.body.classList.remove('l2-hunted');
    if (how === 'outran') { App.count('l2_outran'); Career.checkAchievements(); }
    if (how === 'outran') L2.toast('🍸 You look back. Nothing. Just a coat on a hook. Your heart doesn\'t believe it.');
    if (how === 'door') L2.toast('🍸 The door closes behind you. He doesn\'t follow. Not yet.');
    if (how === 'mori') L2.toast('🍸 Mori\'s voice in your ear, steady, and he steps back into the dark like he was never there.');
  }
  async function caught() {
    const d = st(); endHunt('caught'); huntCool = 120; d.strikes = (d.strikes || 0) + 1; App.save();
    await L2Demon.scare(); apply();
    if (d.strikes >= 3) { await L2.death(); return; }
    await L2.ui.say(d.strikes === 1
      ? [{ who: 'narr', text: 'Fingers like cold nails close on your shoulder. Its face splits open an inch from yours, and the breath that comes out of it is your brand. Your knees go.' }, { who: 'narr', text: 'When you open your eyes you\'re on the floor and somebody is asking if you\'re all right. It\'s gone. The taste isn\'t.' }]
      : [{ who: 'narr', text: 'It catches you by the collar and lifts you off your feet. Something in your chest stutters and catches, like a song skipping on a jukebox.' }, { name: 'A security guard', who: 'x', text: 'Hey. Hey! Stay with me. Look at me.' }, { who: 'narr', text: 'You come back. Barely. Next time, you might not.' }]);
    d.crave = Math.max(d.crave, 85); apply();
  }

  /* ---------- drinking, and not ---------- */
  async function drink(where, cost = 0) {
    const d = st();
    if (cost && L2.state.cash < cost) { L2.toast('Not enough money.'); return false; }
    if (cost) L2.state.cash -= cost;
    if (hunt) endHunt('fed');
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
    d.lastCall = Date.now(); d.called++; d.crave = Math.max(0, d.crave - 45); if (hunt) endHunt('mori');
    await L2.ui.say([{ who: 'mori', text: pick(['Talk to me. What are you looking at right now? Describe it. ...Good. Keep talking.', 'It\'ll pass. It always passes. Twenty minutes. I\'ll stay on the line.', 'You don\'t have to not drink forever. Just not right now. Right now is all you have to do.', 'I wanted one every day for the first year. Then every other day. Then I forgot to want it, one Tuesday.']) }, { who: 'narr', text: 'The craving doesn\'t go. But it gets smaller, and further away.' }]);
    if (!d.steps.sponsor) await step('sponsor');
    apply();
  }
  // see if one of the two paths has ended
  async function check() {
    const d = st(); if (d.path) return;
    if (stepsDone() === 3 && refusals() >= 3) {
      d.path = 'sober'; d.crave = 0; App.count('l2_sober'); App.save(); if (hunt) endHunt('gone'); apply();
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
        d.strikes ? h('p.l2-mem', `The Barman has caught you ${d.strikes === 1 ? 'once' : 'twice'}. ${d.strikes >= 2 ? 'Once more and you won\'t get up.' : ''}`) : null,
        h('p', `${tick(d.steps.admit)} Tell Dr. Okafor the truth`), h('p', `${tick(d.steps.flask)} The flask in your glovebox`), h('p', `${tick(d.steps.sponsor)} ${d.steps.sponsorOffered ? 'Call Detective Mori when it gets loud (☰ menu)' : 'Someone who understands'}`), h('p', `${tick(refusals() >= 3)} Turn down three drinks (${refusals()} of 3)`)) : null,
      !d.path ? h('p.l2-hint', `Or don't. Six drinks and the struggle is over, one way.`) : null,
      h('p.l2-hint', 'If drinking is affecting your life, or the life of someone you love, talking to a doctor or a local support group is a good first step. You don\'t have to do it alone.'));
  }
  // for the endings
  const path = () => st().path;
  const ready = () => !!st().steps.sponsorOffered && !sober();

  return { needs, feed, roundNeeds, _startHunt: startHunt, get hunting() { return !!hunt; }, endHunt, init, start, stop, apply, drink, refuse, offer, step, callMori, panel, path, ready, severity, get state() { return st(); }, SEV };
})();
