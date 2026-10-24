/* Mood, buzz, jitters and the degen meter.
   - Mood (0-100): how you feel. Good nights, good meals and nice drinks lift it; debt, bad sleep,
     going hungry and losing streaks drag it down. Happy players tire more slowly and throw steadier
     darts; miserable ones burn out fast.
   - Buzz (0-100): alcohol. A drink or two lifts your mood and steadies your nerves; past "tipsy" your
     darts wobble, strategy hints switch off and the classy casinos won't let you in; at 100 you pass
     out. It wears off with time, water and food, and a big night means a hangover.
   - Jitters: more than three caffeinated drinks in a day make you anxious.
   - Degen (0-100): how recklessly you're gambling. Huge bets, chasing losses, borrowing to play,
     playing drunk or at dawn push it up; sleep, meals and walking away bring it down. Lonnie "Dice"
     Price keeps a diary of degens, and Mel would rather you didn't make it in. */
const DEGEN_TITLES = [[0, 'Recreational'], [20, 'Regular'], [40, 'Grinder'], [60, 'Degenerate'], [80, 'Full Degen']];
// what a drink does: buzz added (alcohol) and mood lift
const BOOZE = { beer: 14, whiskey: 22, cocktail: 18, champagne: 16, martini: 24, wine: 16 };
// how a plate of food feels, by place
const TREAT = { steak: 12, lobster: 12, wagyu: 14, caviar: 14, buffet: 9, shrimp: 6, breakfast: 6, burger: 5, pie: 6, shake: 5, nachos: 3, sandwich: 1, candy: 1 };
const DEGEN_TASKS = [
  { k: 'chase', name: 'Chase it', desc: 'Be down $500 or more on the day, then claw your way back to even.' },
  { k: 'beer', name: 'Hold my beer', desc: 'Win a hand while you\'re tipsy.' },
  { k: 'dawn', name: 'Sunrise session', desc: 'Play a hand between 4 and 6 in the morning.' },
  { k: 'allin', name: 'Send it', desc: 'Win a single hand where you bet half your bankroll or more.' },
];

const Mood = {
  on() { return App.state && App.state.mode === 'career'; },
  st() {
    const s = App.state;
    if (s.mood == null) s.mood = 60;
    if (s.buzz == null) s.buzz = 0;
    if (s.degen == null) s.degen = 10;
    s.moodLog = s.moodLog || {};
    return s;
  },
  clamp(v) { return Math.max(0, Math.min(100, v)); },
  face(v = this.st().mood) { return v >= 80 ? '😄' : v >= 60 ? '🙂' : v >= 40 ? '😐' : v >= 20 ? '😟' : '😫'; },
  label(v = this.st().mood) { return v >= 80 ? 'On top of the world' : v >= 60 ? 'Good spirits' : v >= 40 ? 'Getting by' : v >= 20 ? 'Down' : 'Rock bottom'; },
  buzzLabel(b = this.st().buzz) { return b >= 85 ? 'Hammered' : b >= 60 ? 'Drunk' : b >= 35 ? 'Tipsy' : b >= 12 ? 'Merry' : 'Sober'; },
  degenTitle(d = this.st().degen) { let t = DEGEN_TITLES[0][1]; for (const [at, name] of DEGEN_TITLES) if (d >= at) t = name; return t; },
  tipsy() { return this.on() && this.st().buzz >= 35; },
  drunk() { return this.on() && this.st().buzz >= 60; },
  jittery() { return this.on() && (App.state.today.caf || 0) >= 4; },

  // nudge mood, with a toast when you cross into a new state
  change(d, why) {
    if (!this.on() || !d) return;
    const s = this.st(), before = this.label();
    s.mood = this.clamp(s.mood + d);
    if (why) s.moodLog[why] = (s.moodLog[why] || 0) + d;
    const after = this.label();
    if (after !== before) UI.toast(`${this.face()} ${after}`, d > 0 ? 'good' : 'warn');
    this.paint();
  },
  degen(d) {
    if (!this.on() || !d) return;
    const s = this.st(), before = this.degenTitle();
    s.degen = this.clamp(s.degen + d);
    const after = this.degenTitle();
    if (after !== before && d > 0) UI.toast(`🎲 Degen meter: ${after}`, 'warn');
    if (s.degen >= 100) App.count('fullDegen');
  },

  /* ---------- time passing (called from Career.drain) ---------- */
  tick(minutes) {
    if (!this.on() || minutes <= 0) return;
    const s = this.st(), hrs = minutes / 60;
    const was = this.buzzLabel();
    s.buzz = Math.max(0, s.buzz - 12 * hrs);
    if (this.buzzLabel() !== was && s.buzz < 35 && was !== 'Merry') UI.toast('🍺 The room stops spinning.', 'good');
    // mood drifts gently toward "getting by"; hunger, thirst and exhaustion drag it down
    s.mood += (55 - s.mood) * Math.min(1, .04 * hrs);
    if (s.hunger <= 10 || s.thirst <= 10) s.mood -= 4 * hrs;
    if (s.stamina <= 5) s.mood -= 3 * hrs;
    s.mood = this.clamp(s.mood);
    // a long session without a break creeps the degen meter up; time away eases it
    s.degen = this.clamp(s.degen - 1.5 * hrs);
    this.paint();
  },

  /* ---------- eating and drinking (called from Career.consume) ---------- */
  consume(id, m) {
    if (!this.on()) return;
    const s = this.st();
    if (BOOZE[id]) {
      const was = this.buzzLabel();
      s.buzz = this.clamp(s.buzz + BOOZE[id]);
      // the first few lift you; after that every drink is borrowed against tomorrow
      this.change(s.buzz < 45 ? Math.round(BOOZE[id] / 3) : s.buzz < 70 ? 1 : -3, 'drinks');
      App.count('drinks');
      const now = this.buzzLabel();
      if (now !== was) UI.toast({ Merry: '🍺 Merry. Everything is a little funnier.', Tipsy: '🍺 Tipsy. Your darts arm feels... confident.', Drunk: '🥴 Drunk. The cards are swimming and the bouncers are watching you.', Hammered: '🥴 Hammered. One more and you\'re on the floor.' }[now] || now, now === 'Merry' ? 'good' : 'warn');
      if (now === 'Tipsy' || now === 'Drunk') App.count('gotTipsy');
      if (s.buzz >= 100) setTimeout(() => this.blackout(), 300);
    } else {
      if (m.drink && !m.caf) s.buzz = Math.max(0, s.buzz - 10); // water and soft drinks help
      if (m.hunger) s.buzz = Math.max(0, s.buzz - 6);
      if (TREAT[id]) this.change(TREAT[id], 'food');
      if (m.caf) {
        const n = App.state.today.caf || 0;
        if (n === 4) UI.toast('😬 Jittery. Your hands won\'t sit still and your heart is racing.', 'warn');
        if (n >= 4) { this.change(-4, 'jitters'); App.count(n >= 6 ? 'beanSix' : 'jitters'); }
        else this.change(1, 'coffee');
      }
    }
    this.paint();
  },
  async blackout() {
    if (!this.on() || this._out) return;
    this._out = true;
    await UI.dialog([{ who: 'narrator', text: 'The floor comes up to meet you. The last thing you hear is Dolores sighing, "Not again, sugar."' }]);
    this._out = false;
    App.state.flags.hangover = 2;
    await Career.passOut();
  },

  /* ---------- the night (called from Career.endDay) ---------- */
  night(L) {
    if (!this.on()) return [];
    const s = this.st(), lines = [], add = (d, why) => { if (!d) return; s.mood = this.clamp(s.mood + d); lines.push([why, (d > 0 ? '+' : '') + d]); };
    const quality = { motel: 6, apartment: 10, grand: 14, penthouse: 18 }[L.id] != null ? { motel: 6, apartment: 10, grand: 14, penthouse: 18 }[L.id] : L.risky ? -8 : -15;
    add(quality, L.risky ? 'A night on a bench' : L.name === 'The sidewalk' ? 'A night on the sidewalk' : 'A good night\'s sleep');
    if ((s.today.caf || 0) >= 3 && (s.clock || 540) < 1500) add(-4, 'Too much coffee to sleep well');
    const hung = s.buzz >= 50 || s.flags.hangover;
    if (hung) { add(-10, 'Hangover'); s.flags.hangover = 1; App.count('hangovers'); } else s.flags.hangover = 0;
    s.buzz = 0;
    // what keeps you up is a payment you can't cover, strikes, and Vinnie's walking-around money
    const loans = s.loans || [], strikes = loans.reduce((a, l) => a + (l.strikes || 0), 0);
    const dueSoon = loans.some(l => l.due && l.due - s.day <= 1 && Career.owedNow(l) > 0);
    const street = loans.filter(l => !l.weekly).reduce((a, l) => a + l.balance, 0);
    const worry = strikes * 4 + (dueSoon ? 6 : 0) + (street > 0 ? 3 + Math.floor(street / 5000) : 0);
    if (worry) add(-Math.min(15, worry), dueSoon ? 'Lying awake about Vinnie\'s payment' : 'Lying awake about the debt');
    else if (!App.debt) add(2, 'No debts');   // the big marker, paid up this week, doesn't cost sleep
    if (s.today.net > 0) add(Math.min(8, 2 + Math.floor(s.today.net / 2000)), 'A winning day');
    else if (s.today.net < -500) add(-Math.min(8, 2 + Math.floor(-s.today.net / 2000)), 'A losing day');
    // the degen meter cools overnight, faster after a clean day
    const was = s.degen;
    s.degen = this.clamp(s.degen - (s.today.rounds ? 8 : 15));
    s.flags.cleanNights = s.degen < 15 ? (s.flags.cleanNights || 0) + 1 : 0;
    if (s.flags.cleanNights >= 7) App.count('cleanWeek');
    if (s.mood >= 90) App.count('livingWell');
    if (s.mood <= 5) App.count('rockBottom');
    lines.push([`Mood ${this.face()} ${Math.round(s.mood)} · Degen ${Math.round(s.degen)} (${this.degenTitle()})`, was > s.degen ? `−${Math.round(was - s.degen)} degen` : '']);
    return lines;
  },

  /* ---------- every hand (called from App.roundDone) ---------- */
  round(gameId, r, bankBefore) {
    if (!this.on() || !(r.wagered > 0)) return;
    const s = this.st(), share = bankBefore > 0 ? r.wagered / bankBefore : 1, t = (s.clock || 540) % 1440;
    // reckless signs
    let d = 0.4;                                               // every hand is a little bit of degen
    if (share >= .5) d += 6; else if (share >= .25) d += 3; else if (share >= .1) d += 1;
    if (s.today.net < 0 && r.wagered > (s.lastBet || 0) * 1.9 && s.lastBet) d += 2;   // chasing
    if (this.drunk()) d += 2;
    if (s.stamina <= 10) d += 1;
    if (t >= 180 && t < 360) d += 1.5;                          // the 3 AM session
    if (App.debt > 0 && (s.flags.borrowedToday === s.day)) d += 1.5;
    this.degen(d);
    s.lastBet = r.wagered;
    // how it felt
    if (r.net >= r.wagered * 5 && r.net > 100) this.change(5, 'wins');
    else if (r.net > 0) this.change(.6, 'wins');
    else if (r.net < 0) this.change(s.stats.streak <= -5 ? -2 : -.5, 'losses');
    // Lonnie's degen diary
    const q = s.degenQuest;
    if (q && q.on) {
      const hit = k => { if (!q.done[k]) { q.done[k] = s.day; UI.toast(`📓 Degen diary: ${DEGEN_TASKS.find(x => x.k === k).name}`, 'big'); } };
      if (s.today.net <= -500) q.chaseLow = s.day;
      if (q.chaseLow === s.day && s.today.net >= 0) hit('chase');
      if (r.net > 0 && this.tipsy()) hit('beer');
      if (t >= 240 && t < 360) hit('dawn');
      if (r.net > 0 && share >= .5) hit('allin');
    }
  },
  // being drunk or wired makes the darts worse; a happy, merry thrower is a touch steadier
  wobbleMult() {
    if (!this.on()) return 1;
    const s = this.st();
    let k = 1;
    if (s.buzz >= 12 && s.buzz < 35) k *= .92;          // Dutch courage
    else if (s.buzz >= 35) k *= 1 + (s.buzz - 30) / 70;
    if (this.jittery()) k *= 1.25;
    if (s.mood >= 75) k *= .95; else if (s.mood < 25) k *= 1.1;
    if (s.flags.steadyHand) k *= .92;                     // Mick's breathing trick
    return k;
  },
  // happy people tire slower
  drainMult() { if (!this.on()) return 1; const m = this.st().mood; return m >= 75 ? .85 : m < 25 ? 1.25 : 1; },

  /* ---------- how it looks ---------- */
  paint() {
    if (!App.state) return;
    const b = document.body, s = App.state;
    b.classList.toggle('tipsy', this.tipsy() && !this.drunk());
    b.classList.toggle('drunk', this.drunk());
    b.classList.toggle('jittery', this.jittery());
    const e = document.getElementById('hud-mood');
    if (e) { const v = this.on() ? this.st().mood : 70; e.style.width = v + '%'; e.className = v < 20 ? 'low' : ''; e.parentElement.parentElement.title = `${this.label()} (${Math.round(v)})${this.on() && s.buzz >= 12 ? ` · ${this.buzzLabel()}` : ''}${this.jittery() ? ' · Jittery' : ''}`; }
    const f = document.getElementById('hud-mood-face'); if (f) f.textContent = this.on() ? (this.drunk() ? '🥴' : this.jittery() ? '😬' : this.face()) : '🙂';
  },
  // for characters in chat: they notice
  brief() {
    if (!this.on()) return '';
    const s = this.st();
    return `The player's mood: ${this.label()} (${Math.round(s.mood)}/100). Sobriety: ${this.buzzLabel()}.${this.jittery() ? ' They are jittery from too much coffee.' : ''} Degen meter: ${Math.round(s.degen)}/100 (${this.degenTitle()}). React to how they seem if it fits, kindly.`;
  },

  /* ---------- the status screen panel ---------- */
  panel() {
    if (!this.on()) return null;
    const s = this.st(), bar = (v, cls) => h('div.bar' + (cls ? '.' + cls : ''), h('i', { style: { width: this.clamp(v) + '%' } }));
    const top = Object.entries(s.moodLog).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${Math.round(v)}`).join(' · ');
    return h('section.panel.mood-panel', h('h3', 'How you\'re doing'),
      h('div.mood-row', h('span', `${this.face()} Mood`), bar(s.mood), h('b', `${Math.round(s.mood)} · ${this.label()}`)),
      h('div.mood-row', h('span', '🍺 Buzz'), bar(s.buzz, 'buzz'), h('b', this.buzzLabel())),
      h('div.mood-row', h('span', '🎲 Degen'), bar(s.degen, 'degen'), h('b', `${Math.round(s.degen)} · ${this.degenTitle()}`)),
      top ? h('p.muted.small', 'Lately: ' + top) : null,
      h('p.muted.small', 'Good nights in a real bed, restaurant meals, a drink or two and winning days lift your mood; debt, hangovers, going hungry and losing streaks wear it down. Happy players tire slower and throw steadier darts. The degen meter rises with big bets, chasing losses, borrowing to play, playing drunk or at dawn; sleep and time away cool it.'));
  },

  /* ---------- Lonnie's degen diary (side quest) ---------- */
  questPanel(api) {
    if (!this.on()) return null;
    const s = this.st(), q = s.degenQuest;
    const box = h('div.job-card', h('b', '📓 The Degen Diaries'));
    if (!q) {
      box.append(h('p.small', '"Every legend in this town has a page in my diary. Chased a loss and caught it. Won with a beer in hand. Played the sunrise. Sent half the roll on one hand. Do all four and you\'re in the book, champ."'),
        h('button.btn.sm.primary', { onclick: () => { s.degenQuest = { on: true, done: {} }; App.save(); api.say('That\'s the spirit! Don\'t tell Mel I said that.'); box.replaceWith(this.questPanel(api)); } }, 'Start a page'));
      return box;
    }
    const done = DEGEN_TASKS.filter(t => q.done[t.k]).length;
    box.append(h('ul.degen-list', DEGEN_TASKS.map(t => h('li' + (q.done[t.k] ? '.ok' : ''), (q.done[t.k] ? '✔ ' : '○ ') + t.name + ': ', h('span.muted', t.desc)))));
    if (done === DEGEN_TASKS.length && !q.paid) box.append(h('button.btn.sm.primary', { onclick: () => {
      q.paid = s.day; App.credit(2500); App.count('degenDiaries'); Career.checkAchievements(); App.save();
      api.say('*writes your name in gold pen* THE BOOK, champ. You\'re in it forever. Here, $2,500 from the Degen Fund. Spend it irresponsibly.'); box.replaceWith(this.questPanel(api));
    } }, 'Get in the book ($2,500)'));
    else if (q.paid) box.append(h('p.muted.small', 'You\'re in the book. Lonnie salutes you every time you walk past.'));
    else box.append(h('p.muted.small', `${done} of ${DEGEN_TASKS.length} done.`));
    return box;
  },
};
