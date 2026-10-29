/* Game state, saving/loading, bankroll accounting, progressive meters and stats. */
const SAVE_KEY = 'highroller.slot.';
const SLOTS = 3;

const Progressives = {
  KEYS: ['bj', 'uth', 'ms', 'tcp', 'bac'],
  def: key => PAY[key].prog,
  meter: key => App.state.progressives[key],
  // return to player at the current meter, from the exact odds in rtp.js
  rtp(key) {
    const o = PROG_ODDS[key], p = PAY[key].prog, m = App.state.progressives[key];
    return (o.fixed + o.jp.reduce((a, [pr, f]) => a + pr * f * m, 0)) / p.cost;
  },
  contribute(key) { App.state.progressives[key] += PAY[key].prog.cost * 0.25; },
  // other (simulated) players feed the meters a little every round
  networkTick() {
    for (const k of this.KEYS) App.state.progressives[k] += RNG.float() * PAY[k].prog.seed * 0.0004;
  },
  dailyGrowth() {
    for (const k of this.KEYS) {
      const seed = PAY[k].prog.seed;
      // someone else occasionally hits it overnight
      if (App.state.progressives[k] > seed * 1.6 && RNG.chance(0.2)) {
        App.state.progressives[k] = seed;
        App.news(`📰 A tourist hit the ${PAY[k].prog.name}! The meter resets to ${fmt(seed)}.`);
      } else App.state.progressives[k] += seed * (0.02 + RNG.float() * 0.05);
    }
  },
  // pay a percentage tier. Full jackpot resets to seed.
  hit(key, pct) {
    const m = App.state.progressives[key], amt = Math.floor(m * pct);
    App.state.progressives[key] = pct >= 1 ? PAY[key].prog.seed : Math.max(PAY[key].prog.seed, m - amt);
    return amt;
  },
  // resolve a progressive bet on `spot` for tier key; returns paid amount
  settle(key, spot, tierKey) {
    const tier = tierKey && PAY[key].prog.tiers.find(t => t.key === tierKey);
    if (!tier) { spot.lose(); return 0; }
    const amt = tier.pct ? this.hit(key, tier.pct) : tier.amt;
    spot.payFixed(amt, tier.name);
    App.count('progHits');
    if (tier.pct) { App.count('jackpots'); UI.toast(`🎰 JACKPOT! ${tier.name} pays ${fmt(amt)}!`, 'big'); SFX.big(); }
    return amt;
  },
};

const App = {
  state: null, slot: null,

  defaultState(mode, name) {
    const career = mode === 'career';
    const progressives = {}; for (const k of Progressives.KEYS) progressives[k] = PAY[k].prog.seed * (1 + RNG.float() * 0.3);
    return {
      version: 1, mode, name: name || 'Lucky', created: Date.now(), saved: Date.now(),
      bank: career ? 500 : 10000, day: 1,
      stamina: 100, staminaMax: 100, hunger: 80, thirst: 80,
      world: { map: 'town', x: 5, y: 30, dir: 'down' }, clock: 540, event: null, ending: null,
      loans: career ? [{ id: 'sal', label: "Uncle Sal's marker", balance: 500000, rate: 0, weekly: 1500, paidWeek: 0, due: 7, strikes: 0 }] : [],
      items: {}, consumables: {}, equipped: { felt: 'green', back: 'red' },
      chapter: 0, flags: {}, achievements: {},
      venue: 'spur', unlocked: { spur: true },
      progressives,
      stats: { rounds: 0, wagered: 0, returned: 0, biggestWin: 0, peakBank: career ? 500 : 10000, perGame: {}, counters: {}, streak: 0, bestStreak: 0 },
      today: { wagered: 0, net: 0, rounds: 0 },
      lastBets: {}, quests: {}, chats: {},
      news: [],
      settings: { sound: true, speed: 'normal', hints: true, ambient: true },
    };
  },

  /* ---------- persistence ---------- */
  slotKey: i => SAVE_KEY + i,
  listSlots() {
    const out = [];
    for (let i = 1; i <= SLOTS; i++) {
      try { const s = JSON.parse(localStorage.getItem(this.slotKey(i)) || 'null'); out.push(s ? { i, s } : { i, s: null }); }
      catch (e) { out.push({ i, s: null }); }
    }
    return out;
  },
  start(state, slot) {
    this.state = this.migrate(state); this.slot = slot; Rivals.ensure(); this.save();
  },
  migrate(s) {
    const d = this.defaultState(s.mode, s.name);
    for (const k in d) if (s[k] === undefined) s[k] = d[k];
    for (const k in d.stats) if (s.stats[k] === undefined) s.stats[k] = d.stats[k];
    for (const k in d.settings) if (s.settings[k] === undefined) s.settings[k] = d.settings[k];
    if (!s.world || !s.world.map) s.world = d.world;
    for (const k of Progressives.KEYS) if (!(s.progressives[k] > 0)) s.progressives[k] = PAY[k].prog.seed;
    // the Justice ending used to pay far less than the takeover: top up finished games once
    if (s.ending === 'justice' && !s.flags.justiceReward) { s.flags.justiceReward = true; s.bank += 5000000; s.items.trustee = s.day; s.news = [{ day: s.day, text: '⚖️ The Gaming Commission paid your $5,000,000 whistleblower reward and named you trustee of the Monte Royale.' }].concat(s.news || []); }
    return s;
  },
  save() {
    if (!this.state || !this.slot) return;
    this.state.saved = Date.now();
    try { localStorage.setItem(this.slotKey(this.slot), JSON.stringify(this.state)); }
    catch (e) { UI.toast('Could not save (browser storage blocked). Use Export to keep your game.', 'warn'); }
  },
  deleteSlot(i) { try { localStorage.removeItem(this.slotKey(i)); } catch (e) { } },
  exportSave() {
    // conversations can quote your personal details, so they stay in this browser and out of exports
    const out = { ...this.state, chats: {} };
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `high-roller-${this.state.name.replace(/\W+/g, '_')}-day${this.state.day}.json` });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  async importSave(file, slot) {
    const txt = await file.text();
    const s = JSON.parse(txt);
    if (!s || typeof s.bank !== 'number' || !s.mode) throw new Error('Not a High Roller save file');
    this.start(s, slot);
  },

  /* ---------- money ---------- */
  get bank() { return this.state.bank; },
  debit(x) {
    x = round2(x);
    if (x < 0 || this.state.bank + 1e-9 < x) return false;
    this.state.bank = round2(this.state.bank - x); Router.hud(); return true;
  },
  credit(x) { this.state.bank = round2(this.state.bank + x); Router.hud(); },
  get debt() { return round2(this.state.loans.reduce((a, l) => a + l.balance, 0)); },
  netWorth() { return round2(this.state.bank - this.debt); },

  speedFactor() { const s = this.state && this.state.settings.speed; return s === 'fast' ? 0.45 : s === 'slow' ? 1.6 : s === 'turbo' ? 0.2 : 1; },

  // perks come from items in career mode, and are all on in free play
  perk(id) {
    if (!this.state) return false;
    if (this.state.mode === 'free') return id !== 'none';
    return Object.keys(this.state.items).some(k => this.state.items[k] && ITEMS[k] && (ITEMS[k].perks || []).includes(id));
  },
  has(item) { return !!(this.state && this.state.items[item]); },
  count(key, n = 1) { const c = this.state.stats.counters; c[key] = (c[key] || 0) + n; },
  counter(key) { return this.state.stats.counters[key] || 0; },
  news(text) { this.state.news.unshift({ day: this.state.day, text }); this.state.news.length = Math.min(this.state.news.length, 40); },

  /* ---------- after every settled round ---------- */
  inReality() { return !!(this.state && this.state.l2 && this.state.l2.atTable); },
  inLaptop() { return !!(this.state && this.state.l3 && this.state.l3.atTable); }, // a game on the laptop in Level 3
  offStory() { return this.inReality() || this.inLaptop(); }, // no Level 1 quests, needs or mood at these tables
  roundDone(gameId, r) {
    const st = this.state, s = st.stats;
    s.rounds++; s.wagered = round2(s.wagered + r.wagered); s.returned = round2(s.returned + r.returned);
    const g = s.perGame[gameId] || (s.perGame[gameId] = { rounds: 0, wagered: 0, net: 0 });
    g.rounds++; g.wagered = round2(g.wagered + r.wagered); g.net = round2(g.net + r.net);
    const cw = r.compWagered != null ? r.compWagered : r.wagered; // what the players club rates
    st.today.wagered = round2(st.today.wagered + cw); st.today.net = round2(st.today.net + r.net); st.today.rounds++;
    st.today.byVenue = st.today.byVenue || {}; st.today.byVenue[st.venue] = round2((st.today.byVenue[st.venue] || 0) + cw);
    if (r.net > s.biggestWin) s.biggestWin = r.net;
    if (r.wagered > 0) {
      if (r.net > 0) { s.streak = Math.max(0, s.streak) + 1; s.bestStreak = Math.max(s.bestStreak, s.streak); }
      else if (r.net < 0) s.streak = Math.min(0, s.streak) - 1;
    }
    if (st.bank > s.peakBank) s.peakBank = st.bank;
    Progressives.networkTick();
    if (r.wagered > 0 || r.stamina) Career.drain('round', r.stamina != null ? r.stamina : 1);
    Mood.round(gameId, r, round2(st.bank - r.net));
    Career.afterRound(gameId, r);
    if (r.wagered > 0 && !this.offStory()) Quests.event('round', { gameId, venue: st.venue, ...r });
    this.save(); Router.hud();
  },
};
