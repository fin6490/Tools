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
  // craving per second: severe ~6½ minutes to the shakes, mild ~14; every recovery step eases it
  const rate = () => { const d = st(); return [0, 100 / 840, 100 / 560, 100 / 400][d.sev] * (1 - .15 * stepsDone()) * (d.path === 'gaveIn' ? 1.3 : 1) * (1 + .04 * d.drinks) * (needs().thirst < 25 ? 1.4 : 1) * L2Money.craveMul() * (typeof L2Life !== 'undefined' ? L2Life.craveMul() : 1); };

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
    s.stamina = Math.max(0, (s.stamina == null ? mx : s.stamina) - sec * mx / 2400 * L2Money.soak());
    const n = needs(), say = { hunger: ['🍔 Your stomach turns over. You can\'t remember the last thing you ate.', '🍔 Light-headed with hunger. The floor keeps tilting.'], thirst: ['💧 Your mouth is dry. A dry mouth makes the craving louder.', '💧 Parched. Your head is pounding.'], energy: ['⚡ You\'re running on empty. A coffee would help.', '⚡ Exhausted. Your legs won\'t run any more.'] };
    for (const k in say) { const lvl = n[k] <= 0 ? 2 : n[k] < 20 ? 1 : 0; if (lvl > (warned[k] || 0) && !R3.busy) L2.toast(say[k][lvl - 1]); warned[k] = lvl; }
  }
  // a round at one of the tables
  function roundNeeds(kind, k = 1) { if (kind === 'round') drainNeeds(25 * k); }

  function start() {
    stop(); init(); apply();
    timer = setInterval(() => {
      if (Router.screen !== 'reality' || document.hidden || !App.state || !App.state.l2) return;
      const d = st(); tick++; L2Money.tick(!!hunt); if (typeof L2Life !== 'undefined') L2Life.tick(!!hunt);
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
    if (R3.setFx) R3.setFx({ shake: c >= 80 ? .004 + (c - 80) / 20 * .008 : 0, sway: (c >= 60 ? .005 + (c - 60) / 40 * .007 : 0) + b / 100 * .02 + (n.hunger <= 0 ? .008 : 0), slow: (c >= 80 ? .88 : b > 50 ? .9 : 1) * body, noRun: n.energy <= 0, run: L2Money.runBoost() });
    document.body.classList.toggle('l2-weak', weak && (Router.screen === 'reality'));
    const cls = { 'l2-sweats': c >= 35, 'l2-nausea': c >= 60, 'l2-shakes': c >= 80, 'l2-drunk': b > 30 };
    const on = Router.screen === 'reality' || App.inReality(); // the shakes follow you to the tables
    for (const k in cls) document.body.classList.toggle(k, on && !!cls[k]);
    const el = root && root.querySelector('.l2-crave');
    if (el) { el.textContent = sober() ? '🕊️ Sober' : b > 30 ? '🥃 Drinking' : c >= 80 ? '🤚 The shakes' : c >= 60 ? '🤢 Nauseous' : c >= 35 ? '💧 Sweating' : '🥃 Steady'; el.className = 'l2-crave' + (c >= 60 ? ' bad' : sober() ? ' good' : ''); }
  }

  /* ---------- the Barman: what comes for you if you don't stop ---------- */
  // A hallucination: a starved figure in a barman's jacket with a black hole for a face. While the
  // craving is bad you catch it standing still in the dark spots of a place, and it's gone when you
  // get near or the light finds it. When the craving has been screaming for a while (or every few
  // minutes once you've given in) it hunts you for most of a minute: out from round a corner, at you
  // in bursts, gone, back again closer. Light drives it off and a torch slows it (wallet.js). Keep
  // moving, get out of the place, take a cab, or call Mori. If it catches you, you see its face; the
  // third time, you don't get up.
  const NO_HUNT = ['cemetery', 'spur', 'clinic'];
  let stalkCool = 40, stalking = null;
  function demons(d) {
    if (hunt) { if (R3.area !== hunt.area) endHunt('door'); return; }
    if (R3.busy || NO_HUNT.includes(R3.area) || L2.has('done')) { maxedFor = 0; return; }
    huntCool = Math.max(0, huntCool - 1); stalkCool = Math.max(0, stalkCool - 1);
    if (!d.glimpsed && d.crave >= 80) { d.glimpsed = 1; stalk(true); return; }
    // the bad hours: it watches you from the dark
    if (!stalking && !stalkCool && (d.crave >= 65 || d.path === 'gaveIn') && Math.random() < (L2Money.torchOn() ? .02 : .04)) { stalkCool = 35 + Math.random() * 40; stalk(false); }
    if (d.path === 'gaveIn') { d.hn = (d.hn == null ? 120 : d.hn) - 1; if (d.hn <= 0) { d.hn = (150 + Math.random() * 90) * (L2Money.owns('medal') ? 1.5 : 1); startHunt(); } return; }
    maxedFor = d.crave >= 95 ? maxedFor + 1 : 0;
    if (maxedFor >= (L2Money.owns('medal') ? 40 : 25) && !huntCool) { maxedFor = 0; startHunt(); }
  }
  let actx = null;
  function thump(v) { // a heartbeat, louder as it gets closer
    if (App.state.settings.sound === false) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime;
      for (const [dt, f] of [[0, 62], [.16, 52]]) { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, t + dt); g.gain.exponentialRampToValueAtTime(.35 * v, t + dt + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dt + .22); o.connect(g); g.connect(actx.destination); o.start(t + dt); o.stop(t + dt + .25); }
    } catch (e) { }
  }
  // somewhere dark, on screen, a fair way off
  function darkSpot(near, far) {
    const P = R3.player, M = R3.map; if (!M) return null;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = near + Math.random() * (far - near), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      if (!M.inside(Math.floor(x), Math.floor(y)) || M.blocked(Math.floor(x), Math.floor(y))) continue;
      if (M.lights.some(l => Math.hypot(l.x - x, l.y - y) < l.r * .6)) continue;
      const [sx, sy] = R3.toScreen(x, y); if (sx < 30 || sy < 120 || sx > innerWidth - 30 || sy > innerHeight - 60) continue;
      return [x, y];
    }
    return null;
  }
  // standing very still in the dark. Go towards it and it's gone.
  function stalk(first) {
    if (!R3.map) return;
    const at = darkSpot(6, 10); if (!at) return;
    const g = L2Demon.make(); g.x = at[0]; g.y = at[1];
    const S = stalking = { g, life: 0, seen: false, area: R3.area };
    R3.api.every((t, dt) => {
      if (stalking !== S) return;
      S.life += dt; const dist = Math.hypot(R3.player.x - g.x, R3.player.y - g.y); g.update(t, dt, dist);
      if (g.fade > .5 && !S.seen) { S.seen = true; L2Demon.sting(); }
      if ((S.seen && g.fade < .03 && g.want === 0) || S.life > 9 || R3.area !== S.area || hunt) { stalking = null; L2Demon.remove(g); }
    });
    if (first) L2.toast('🍸 Over there, in the dark: someone standing very still, black against a red glow. You walk towards it. Nobody.');
  }
  // a hunt lasts a while: it steps out from somewhere you can't see (round a corner, out of the
  // dark), comes at you in bursts, goes up in smoke, and steps out again closer. Light drives it off;
  // a torch slows it. Last it out and it's gone, for now.
  function hiddenSpot(near, far, ahead) {
    const P = R3.player, M = R3.map; if (!M) return null;
    const seen = (x, y) => { const n = Math.ceil(Math.hypot(x - P.x, y - P.y) * 3); for (let i = 1; i < n; i++) { const u = i / n; if (M.blocked(Math.floor(P.x + (x - P.x) * u), Math.floor(P.y + (y - P.y) * u))) return false; } return true; };
    let fallback = null;
    for (let i = 0; i < 80; i++) {
      const a = ahead != null && i < 50 ? ahead + (Math.random() - .5) * 1.6 : Math.random() * Math.PI * 2, r = near + Math.random() * (far - near), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; // running? it steps out ahead of you
      if (!M.inside(Math.floor(x), Math.floor(y)) || M.blocked(Math.floor(x), Math.floor(y)) || !R3.free(x, y)) continue;
      if (M.lights.some(l => Math.hypot(l.x - x, l.y - y) < l.r * .5 && (l.i || 1) > .4)) continue;
      if (!seen(x, y)) return [x, y]; // round a corner
      if (!fallback) fallback = [x, y];
    }
    return fallback || darkSpot(near, far + 2);
  }
  function startHunt() {
    if (hunt || !R3.map) return;
    if (stalking) { L2Demon.remove(stalking.g); stalking = null; }
    const g = L2Demon.make(), d = st(); g.mode = 'vanish'; g.fade = 0; g.x = -99; g.y = -99;
    const H = hunt = { g, area: R3.area, t: 0, beat: 0, dur: 38 + Math.random() * 14, phase: 'hidden', timer: 1.2, shows: 0 };
    document.body.classList.add('l2-hunted'); App.count('l2_hunted'); if (typeof L2Life !== 'undefined') L2Life.lift(-6, 'hunted');
    L2.toast(d.hunts ? '🍸 It\'s back. Keep moving. Stay in the light.' : `🍸 Something is hunting you. It comes out of the dark, round corners. Keep moving and stay in the light. (${R3.touch ? 'Tap 🏃 to run' : 'Hold Shift to run'}. Leaving this place, a cab or calling Mori ends it.)`);
    d.hunts = (d.hunts || 0) + 1;
    R3.api.every((t, dt) => {
      if (hunt !== H || R3.busy) return;
      H.t += dt; H.timer -= dt;
      const dx = R3.player.x - g.x, dy = R3.player.y - g.y, dist = Math.hypot(dx, dy) || .01;
      g.update(t, dt, dist);
      if (H.phase === 'hidden' && H.timer <= 0) {
        const still = Math.hypot(R3.player.vx || 0, R3.player.vy || 0) < .3; // standing still makes it bolder
        const pv = Math.hypot(R3.player.vx || 0, R3.player.vy || 0), ahead = pv > 1 ? Math.atan2(R3.player.vy, R3.player.vx) : null;
        const at = hiddenSpot(Math.max(still ? 2.2 : 3, (still ? 5.5 : 6.5) - H.shows * (still ? 1 : .7)), Math.max(still ? 3.5 : 5, 9 - H.shows * .6), ahead);
        if (at) { g.x = at[0]; g.y = at[1]; g.mode = 'appear'; g.fade = 0; H.phase = 'appear'; H.timer = .7; H.shows++; L2Demon.sting(); } else H.timer = .8;
      } else if (H.phase === 'appear' && H.timer <= 0) { g.mode = 'stalk'; H.phase = 'stalk'; H.timer = 3.2 + Math.random() * 2; }
      else if (H.phase === 'stalk') {
        const lit = g.inLight(), torch = L2Money.torchOn() && dist < 5;
        const burst = dist < 3 ? 1.45 : Math.sin(H.t * 5.5) > -.2 ? 1.25 : .3; // lurches, then stops dead; close in, it lunges
        const speed = Math.min(3.6, 2.5 + H.shows * .12) * burst * (torch ? .65 : 1) * (lit ? .45 : 1); // a lunge can match you at a run
        g.vx = dx / dist * speed; g.vy = dy / dist * speed; g.x += g.vx * dt; g.y += g.vy * dt; g.dir = dx - dy >= 0 ? 1 : -1;
        if (dist < .75) { caught(); return; }
        if ((H.timer <= 0 && dist > 2.4) || (lit && dist > 2 && Math.random() < dt * 1.5)) { g.mode = 'vanish'; H.phase = 'vanish'; H.timer = .8; }
      } else if (H.phase === 'vanish' && H.timer <= 0) { H.phase = 'hidden'; H.timer = .5 + Math.random() * 1.1; }
      const near = H.phase === 'stalk' || H.phase === 'appear' ? Math.max(0, 1 - dist / 10) : .08;
      L2Demon.tick(dt, near);
      H.beat -= dt; if (H.beat <= 0) { H.beat = .3 + (1 - near) * .6; thump(Math.max(.15, near)); }
      if (H.t > H.dur * (L2Money.torchOn() ? .75 : 1) && H.phase !== 'stalk' && H.phase !== 'appear') endHunt('outran');
    });
  }
  function endHunt(how) {
    const H = hunt; if (!H) return; hunt = null; huntCool = 90; L2Demon.quiet();
    L2Demon.remove(H.g);
    document.body.classList.remove('l2-hunted');
    if (how === 'outran') { App.count('l2_outran'); Career.checkAchievements(); if (typeof L2Life !== 'undefined') L2Life.lift(4, 'you made it'); }
    if (how === 'outran') L2.toast('🍸 The smoke thins, and doesn\'t come back. It\'s gone. For now. Your heart doesn\'t believe it.');
    if (how === 'door') L2.toast('🍸 The door closes behind you. It doesn\'t follow. Not yet.');
    if (how === 'mori') L2.toast('🍸 Mori\'s voice in your ear, steady, and the red goes out of the dark like it was never there.');
  }
  async function caught() {
    if (typeof L2Life !== 'undefined') L2Life.lift(-15, 'it caught you');
    const d = st(); endHunt('caught'); huntCool = 120; d.strikes = (d.strikes || 0) + 1; App.save();
    await L2Demon.scare(); apply();
    if (d.strikes >= 3) { await L2.death(); return; }
    await L2.ui.say(d.strikes === 1
      ? [{ who: 'narr', text: 'It has your face. Grey and starved, the eyes gone yellow in the skull, the lips split: you, a few years and a lot of bottles from now. The breath that comes out of it is your brand. Your knees go.' }, { who: 'narr', text: 'When you open your eyes you\'re on the floor and somebody is asking if you\'re all right. It\'s gone. The taste isn\'t.' }]
      : [{ who: 'narr', text: 'Your own dead face, so close you can see the broken veins. It takes you by the collar and lifts you off your feet. Something in your chest stutters and catches, like a song skipping on a jukebox.' }, { name: 'A security guard', who: 'x', text: 'Hey. Hey! Stay with me. Look at me.' }, { who: 'narr', text: 'You come back. Barely. Next time, you might not.' }]);
    d.crave = Math.max(d.crave, 85); apply();
  }

  /* ---------- drinking, and not ---------- */
  async function drink(where, cost = 0, strength = 60) {
    const d = st();
    if (cost && L2.state.cash < cost) { L2.toast('Not enough money.'); return false; }
    if (cost) L2.state.cash -= cost;
    if (hunt) endHunt('fed');
    d.drinks++; d.crave = 0; d.stage = 0; d.buzz = Math.min(100, d.buzz + strength); App.count('l2_drinks');
    await L2.ui.say([{ who: 'narr', text: pick(['The first swallow burns, and then the world goes quiet and kind. Your hands are still. You hate how much better you feel.', 'It goes down like an apology. The shakes stop before the glass is empty.', 'Warmth, and then nothing. The nothing is what you came for.']) }]);
    apply(); L2.hud(); check(); App.save(); return true;
  }
  function refuse(where) { const d = st(); if (d.refused[where]) return; d.refused[where] = 1; d.crave = Math.max(0, d.crave - 10); App.count('l2_refused'); if (typeof L2Life !== 'undefined') L2Life.lift(5, 'you said no'); L2.toast(`🕊️ You said no (${refusals()} of 3).`); check(); App.save(); }
  // a drink is offered: take it or don't
  async function offer(where, line, cost = 0) {
    const d = st(); if (d.path || d.refused[where]) return;
    const c = await L2.ui.choose(line, [['no', where === 'delia' ? '"Just water, Delia."' : 'Leave it.'], ['yes', cost ? `Drink it (${fmt(cost)})` : 'Drink it']]);
    if (c === 'yes') await drink(where, cost); else { refuse(where); await L2.ui.say([{ who: 'narr', text: pick(['You don\'t. It costs more than it should, saying no. It always will.', 'Your hand stops halfway. You put it in your pocket and leave it there.', 'Not tonight. You say it out loud, to make it true.']) }]); }
  }
  async function step(k) { const d = st(); if (d.steps[k] || d.path) return; d.steps[k] = 1; if (typeof L2Life !== 'undefined') L2Life.lift(8, 'one step'); App.save(); check(); }
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

  return { needs, feed, roundNeeds, _startHunt: startHunt, _stalk: stalk, get hunting() { return !!hunt; }, endHunt, init, start, stop, apply, drink, refuse, offer, step, callMori, panel, path, ready, severity, get state() { return st(); }, SEV };
})();
