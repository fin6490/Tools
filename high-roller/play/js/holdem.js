/* The Back Room: No-Limit Texas Hold'em tournaments. Full betting rules (min-raises, all-ins,
   side pots, split pots), escalating blinds and antes, AI opponents with personalities that
   estimate equity by simulation and switch to push/fold when short. Multi-table events simulate
   the other tables, balance players onto yours, and play down to a final table. */
const Holdem = (() => {
  const LEVELS = [[25, 50, 0], [50, 100, 0], [75, 150, 0], [100, 200, 25], [150, 300, 25], [200, 400, 50], [300, 600, 75], [400, 800, 100], [600, 1200, 150], [800, 1600, 200], [1000, 2000, 300], [1500, 3000, 400], [2000, 4000, 500], [3000, 6000, 1000], [5000, 10000, 1000], [8000, 16000, 2000], [12000, 24000, 3000], [20000, 40000, 5000]];
  const TOURNEYS = {
    sng6: { name: 'Back Room Sit & Go', field: 6, seats: 6, buyin: 100, fee: 10, perLevel: 6, stack: 10000, desc: 'Six players, one table. Top two paid.' },
    sng9: { name: 'Nine-Handed Turbo', field: 9, seats: 9, buyin: 1000, fee: 100, perLevel: 5, stack: 10000, desc: 'A full ring that moves fast. Top three paid.' },
    daily: { name: 'The Spur Daily', field: 27, seats: 9, buyin: 5000, fee: 500, perLevel: 7, stack: 10000, desc: 'Three tables down to a final table. Top six paid.' },
    major: { name: 'The Tenth-Day Major', field: 45, seats: 9, buyin: 50000, fee: 5000, perLevel: 7, stack: 15000, desc: 'Five tables, deep stacks, the biggest regular field in town. Runs every tenth day (day 10, 20, 30...).', when: () => App.state.day % 10 === 0, req: () => App.state.chapter >= 2 ? null : 'Reach chapter 3 (the Gilded Palace)' },
    hr: { name: 'High Roller', field: 18, seats: 9, buyin: 500000, fee: 25000, perLevel: 6, stack: 20000, desc: 'Two tables of serious money.', req: () => App.state.chapter >= 3 ? null : 'Reach the Salon Privé (chapter 4)' },
    shr: { name: 'Super High Roller', field: 9, seats: 9, buyin: 5000000, fee: 100000, perLevel: 6, stack: 20000, desc: 'Nine players, five million each. Legends only.', req: () => App.state.ending ? null : 'Finish the story first' },
  };
  const PAYOUTS = n => n <= 6 ? [.65, .35] : n <= 10 ? [.5, .3, .2] : n <= 20 ? [.4, .26, .18, .1, .06] : n <= 30 ? [.36, .22, .15, .11, .09, .07] : [.3, .2, .14, .1, .08, .07, .06, .05];
  // personalities. loose: how many hands they play; agg: raise rather than call; bluff: how often
  // they fire with nothing; cbet: bet the flop after raising preflop; trap: slow-play monsters and
  // check-raise; stick: how hard they are to bet off a hand; size: their usual bet (share of the
  // pot); leak: +1 bets bigger with real hands, -1 bigger with bluffs, 0 balanced; adapt: how much
  // they adjust to how you play; tilt: how much a big lost pot unsettles them; honest: how often
  // their physical tells mean what they seem to.
  const STYLES = {
    rock: { label: 'tight-passive rock', loose: .15, agg: .35, bluff: .03, cbet: .45, trap: .3, stick: .1, size: .7, leak: 1, adapt: .1, tilt: .2, honest: .85 },
    nit: { label: 'nit', loose: .08, agg: .3, bluff: .01, cbet: .35, trap: .15, stick: .02, size: .8, leak: 1, adapt: 0, tilt: .1, honest: .9 },
    tag: { label: 'tight-aggressive regular', loose: .3, agg: .7, bluff: .1, cbet: .65, trap: .15, stick: .2, size: .62, leak: 0, adapt: .5, tilt: .3, honest: .6 },
    lag: { label: 'loose-aggressive', loose: .55, agg: .8, bluff: .2, cbet: .75, trap: .1, stick: .3, size: .7, leak: 0, adapt: .4, tilt: .5, honest: .55 },
    station: { label: 'calling station', loose: .6, agg: .15, bluff: .03, cbet: .3, trap: .05, stick: .7, size: .45, leak: 1, adapt: 0, tilt: .4, honest: .75 },
    maniac: { label: 'maniac', loose: .8, agg: .95, bluff: .35, cbet: .9, trap: .02, stick: .4, size: 1.1, leak: -1, adapt: 0, tilt: .8, honest: .7 },
    trapper: { label: 'trapper', loose: .25, agg: .45, bluff: .06, cbet: .4, trap: .65, stick: .25, size: .55, leak: 0, adapt: .3, tilt: .3, honest: .65 },
    shark: { label: 'shark', loose: .42, agg: .75, bluff: .16, cbet: .6, trap: .25, stick: .25, size: .65, leak: 0, adapt: 1, tilt: .05, honest: .5 },
  };
  const RIVAL_STYLE = {
    tex: { ...STYLES.maniac, label: 'wild cowboy', loose: .65, bluff: .25, tilt: 1 },
    mei: { ...STYLES.shark, label: 'calculating shark', honest: .5 },
    baron: { ...STYLES.rock, label: 'stiff aristocrat', bluff: .08, leak: 1, honest: .9 },
    rico: { ...STYLES.lag, label: 'showman', size: 1.2, bluff: .22, leak: -1 },
  };
  // what you might notice across the felt; each player has one habit for strength and one for
  // weakness, and how honest it is depends on who they are
  const TELLS = ['goes very still', 'stares right at you', 'stacks their chips neatly', 'riffles chips loudly', 'glances at their chips', 'starts talking a lot', 'sits back in their chair', 'leans forward', 'sips their drink', 'won\'t look at the board', 'drums their fingers', 'smiles a little too much'];
  const withTells = p => { const [a, b] = RNG.shuffle(TELLS.slice()); return Object.assign(p, { tellStrong: a, tellWeak: b, st: { hands: 0, vpip: 0, pfr: 0, faced: 0, ftb: 0, agg: 0, calls: 0 } }); };
  const NAMES = ['Big Mike', 'Grandma Rose', 'Dutch', 'Lefty Lou', 'The Professor', 'Jenny Jacks', 'Vegas Vic', 'Dmitri', 'Sully', 'Nadia', 'Boomer', 'The Kid', 'Chip Daley', 'Ace Ramirez', 'Lola', 'Priya', 'Hank', 'Moose', 'Whitney', 'Tommy Two-Pair', 'Sergio', 'Yuki', 'Otis', 'Mama Cass', 'Fast Eddie', 'Kat', 'Reno Ray', 'Duchess', 'Slim', 'Bubba', 'Ingrid', 'Paco', 'Doyle-ish', 'Marge', 'Benny', 'Tito', 'Vera', 'Cal', 'Junebug', 'Smokey', 'Lin', 'Gus', 'Rosa', 'Elvis (not that one)'];
  const FACES = ['🧔', '👵', '🧑‍🦰', '👨‍🦲', '🧓', '👩‍🦱', '🕶️', '🧑', '👨‍🦳', '👩', '🤠', '🧑‍🎤', '👱', '🧕', '👲', '🎅', '🧛', '🦹'];
  const COLORS = ['#7a2131', '#1f5f8b', '#2c7a7b', '#5b2c6f', '#8a6a24', '#3a5f8a', '#a0522d', '#556b2f'];

  /* ---------- hand reading helpers ---------- */
  function chen(a, b) {
    const hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r);
    let s = hi === 14 ? 10 : hi === 13 ? 8 : hi === 12 ? 7 : hi === 11 ? 6 : hi / 2;
    if (a.r === b.r) return Math.max(5, s * 2);
    if (a.s === b.s) s += 2;
    const gap = hi - lo - 1;
    s -= gap <= 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
    if (gap <= 1 && hi < 12) s += 1;
    return Math.ceil(s);
  }
  function equity(hole, board, nOpp, iters = 140) {
    const used = new Set(hole.concat(board).map(c => c.r * 4 + c.s));
    const deck = []; for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) if (!used.has(r * 4 + s)) deck.push({ r, s });
    nOpp = Math.max(1, Math.min(nOpp, 4));
    let score = 0;
    for (let it = 0; it < iters; it++) {
      // partial Fisher-Yates for just the cards we need
      const need = 2 * nOpp + (5 - board.length);
      for (let i = 0; i < need; i++) { const j = i + Math.floor(Math.random() * (deck.length - i)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      const b = board.concat(deck.slice(2 * nOpp, need));
      const me = Poker.best(hole.concat(b)).score;
      let best = 0, ties = 0, lost = false;
      for (let o = 0; o < nOpp; o++) {
        const sc = Poker.best([deck[2 * o], deck[2 * o + 1]].concat(b)).score;
        if (sc > me) { lost = true; break; }
        if (sc === me) ties++;
        best = Math.max(best, sc);
      }
      if (!lost) score += ties ? 1 / (ties + 1) : 1;
    }
    return score / iters;
  }

  /* ---------- tournament setup ---------- */
  let T = null;
  function newPlayer(i, def) {
    const style = RNG.pick(Object.keys(STYLES));
    return withTells({ id: 'p' + i, name: NAMES[i % NAMES.length], face: FACES[i % FACES.length], color: COLORS[i % COLORS.length], style: STYLES[style], styleName: STYLES[style].label, stack: def.stack });
  }
  function create(key) {
    const def = TOURNEYS[key], st = App.state;
    const names = RNG.shuffle(NAMES.slice());
    const players = [];
    // rivals who can afford it buy in
    for (const id of Object.keys(RIVALS)) {
      const r = st.rivals[id];
      if (players.length < def.field - 1 && r.where !== 'jail' && r.bank >= def.buyin * 2 && RNG.chance(.7)) {
        r.bank -= def.buyin + def.fee;
        players.push(withTells({ id, rival: id, name: CHARACTERS[id].name.replace(/^.*"(.+)".*$/, '$1').replace('Baron Felix von Hollow', 'The Baron'), face: CHARACTERS[id].face, color: CHARACTERS[id].color, style: RIVAL_STYLE[id], styleName: RIVAL_STYLE[id].label, stack: def.stack }));
      }
    }
    let i = 0;
    while (players.length < def.field - 1) { const p = newPlayer(i, def); p.name = names[i % names.length]; players.push(p); i++; }
    const me = withTells({ id: 'me', me: true, name: st.name, face: '🙂', color: '#2a6', stack: def.stack, style: STYLES.tag });
    RNG.shuffle(players);
    const seats = [me].concat(players.slice(0, def.seats - 1));
    const field = players.slice(def.seats - 1);
    T = { key, def, seats, field, btn: RNG.int(seats.length), level: 0, hand: 0, entrants: def.field, pool: def.buyin * def.field, busted: [], log: [], fast: false, over: false };
    return T;
  }
  const blinds = () => LEVELS[Math.min(T.level, LEVELS.length - 1)];
  const alive = () => T.seats.filter(p => p && p.stack > 0).length + T.field.filter(p => p.stack > 0).length;
  const log = t => { T.log.unshift(t); T.log.length = Math.min(T.log.length, 40); renderLog(); };

  // other tables in a multi-table event play "off camera"
  function simulateField() {
    const [, bb] = blinds();
    const live = T.field.filter(p => p.stack > 0);
    const tables = Math.ceil(live.length / T.def.seats);
    for (let t = 0; t < tables; t++) {
      if (live.length < 2) break;
      const a = RNG.pick(live), b = RNG.pick(live.filter(p => p !== a));
      const pressure = bb * 10 / Math.max(1, Math.min(a.stack, b.stack));
      if (RNG.chance(.08 + Math.min(.4, pressure * .25))) { // all-in confrontation
        const amt = Math.min(a.stack, b.stack), [w, l] = RNG.chance(a.stack / (a.stack + b.stack) * .3 + .35) ? [a, b] : [b, a];
        w.stack += amt; l.stack -= amt;
        if (l.stack <= 0) { eliminate(l); live.splice(live.indexOf(l), 1); }
      } else { const amt = Math.min(b.stack, Math.round(bb * (1 + RNG.float() * 3))); a.stack += amt; b.stack -= amt; if (b.stack <= 0) { eliminate(b); live.splice(live.indexOf(b), 1); } }
    }
  }
  function eliminate(p) { p.stack = 0; p.place = alive() + 1; T.busted.push(p); }
  // move players from the field into empty seats, keeping your table full until the final table
  function balance() {
    const fieldLive = T.field.filter(p => p.stack > 0);
    for (let i = 0; i < T.seats.length; i++) {
      if ((!T.seats[i] || T.seats[i].stack <= 0) && fieldLive.length) {
        const p = fieldLive.shift(); T.field.splice(T.field.indexOf(p), 1); T.seats[i] = p;
        log(`${p.name} moves to your table with ${fmtc(p.stack)}.`);
      }
    }
    T.field = T.field.filter(p => p.stack > 0);
  }
  const fmtc = n => Math.round(n).toLocaleString();

  /* ---------- one hand of hold'em ---------- */
  let H = null; // the hand in progress
  const live = () => T.seats.filter(p => p && p.stack + (p.inHand ? p.total : 0) > 0 && p.inHand);
  const contenders = () => T.seats.filter(p => p && p.inHand && !p.folded);
  const nextIdx = (from, pred) => { for (let k = 1; k <= T.seats.length; k++) { const i = (from + k) % T.seats.length; if (pred(T.seats[i], i)) return i; } return -1; };
  const inHand = p => p && p.inHand;

  async function playHand() {
    const [sb, bb, ante] = blinds();
    const shoe = new Shoe(1, 1);
    T.seats.forEach(p => { if (p) { p.inHand = p.stack > 0; p.cards = []; p.bet = 0; p.total = 0; p.folded = false; p.allin = false; p.acted = false; p.last = ''; p.shown = false; p._vp = p._pr = false; if (p.inHand && p.st) p.st.hands++; if (p.tilt) p.tilt--; } });
    const players = T.seats.filter(inHand);
    if (players.length < 2) return;
    T.btn = nextIdx(T.btn, p => inHand(p));
    H = { board: [], pot: 0, currentBet: 0, minRaise: bb, street: 0, shoe };
    const put = (p, amt) => { amt = Math.min(amt, p.stack); p.stack -= amt; p.bet += amt; p.total += amt; if (p.stack === 0) p.allin = true; return amt; };
    if (ante) players.forEach(p => { const a = Math.min(ante, p.stack); p.stack -= a; p.total += a; H.pot += a; if (p.stack === 0) p.allin = true; });
    const headsUp = players.length === 2;
    const sbi = headsUp ? T.btn : nextIdx(T.btn, inHand), bbi = nextIdx(sbi, inHand);
    put(T.seats[sbi], sb); put(T.seats[bbi], bb); T.seats[sbi].last = 'SB'; T.seats[bbi].last = 'BB';
    H.currentBet = bb; H.sbi = sbi; H.bbi = bbi;
    for (let k = 0; k < 2; k++) for (const p of order(nextIdx(T.btn, inHand))) p.cards.push(shoe.draw());
    render(); await pause(250);
    // preflop, flop, turn, river
    for (let street = 0; street < 4; street++) {
      H.street = street;
      if (street > 0) {
        collect();
        // all-in with nobody left to bet: turn the cards up and run the board out slowly enough to sweat
        const live = contenders();
        if (!H.runout && live.length > 1 && live.filter(p => !p.allin).length <= 1) {
          H.runout = true; live.forEach(p => { p.shown = true; });
          log('🃏 All in! Cards on their backs.'); render(); await pause(1600);
        }
        const n = street === 1 ? 3 : 1; for (let k = 0; k < n; k++) H.board.push(shoe.draw());
        T.seats.forEach(p => { if (p) { p.bet = 0; p.acted = false; if (p.inHand && !p.folded) p.last = p.allin ? 'All-in' : ''; } });
        if (H.runout) live.forEach(p => { p.eval = Poker.best(p.cards.concat(H.board)); });
        H.currentBet = 0; H.minRaise = bb;
        SFX.card(); render(); await pause(H.runout ? 1700 : 350);
      }
      if (contenders().length <= 1) break;
      const canAct = contenders().filter(p => !p.allin);
      if (canAct.length === 0 || (canAct.length === 1 && canAct[0].bet >= H.currentBet)) continue;
      const first = street === 0 ? (headsUp ? sbi : nextIdx(bbi, inHand)) : nextIdx(T.btn, p => inHand(p) && !p.folded);
      await bettingRound(first);
      if (contenders().length <= 1) break;
    }
    collect();
    await showdown();
    H = null;
  }
  function order(startIdx) { const out = []; if (startIdx < 0) return out; for (let k = 0; k < T.seats.length; k++) { const p = T.seats[(startIdx + k) % T.seats.length]; if (inHand(p)) out.push(p); } return out; }
  function collect() { T.seats.forEach(p => { if (p) { H.pot += p.bet; p.bet = 0; } }); }

  async function bettingRound(startIdx) {
    let i = startIdx;
    for (let guard = 0; guard < 200; guard++) {
      if (contenders().length <= 1) return;
      const p = T.seats[i];
      const needs = p && p.inHand && !p.folded && !p.allin && (!p.acted || p.bet < H.currentBet);
      if (needs) {
        const act = p.me ? await askMe(p) : await thinkAI(p);
        apply(p, act);
        render(); await pause(p.me ? 80 : 420);
      }
      const pending = T.seats.some(q => q && q.inHand && !q.folded && !q.allin && (!q.acted || q.bet < H.currentBet));
      if (!pending) return;
      i = (i + 1) % T.seats.length;
    }
  }
  function apply(p, act) {
    const toCall = H.currentBet - p.bet;
    track(p, act, toCall);
    // a short all-in doesn't reopen the betting for someone who already acted
    if (act.type === 'raise' && p.acted) act = { type: toCall > 0 ? 'call' : 'check' };
    if (act.type === 'raise' && act.to <= H.currentBet) act = { type: toCall > 0 ? 'call' : 'check' };
    if (act.type === 'check' && toCall > 0) act = { type: 'fold' };
    if (act.type === 'fold') { p.folded = true; p.last = 'Fold'; log(`${p.name} folds.`); if (p.me && App.state.settings.pkSkip !== false) T.fast = true; }
    else if (act.type === 'check') { p.last = 'Check'; }
    else if (act.type === 'call') { const amt = Math.min(toCall, p.stack); p.stack -= amt; p.bet += amt; p.total += amt; if (!p.stack) p.allin = true; p.last = p.allin ? 'All-in' : 'Call'; log(`${p.name} ${p.allin ? 'calls all-in' : 'calls'} ${fmtc(p.bet)}.`); SFX.chip(); }
    else if (act.type === 'raise') {
      const to = Math.min(act.to, p.bet + p.stack);
      const raiseBy = to - H.currentBet, add = to - p.bet;
      p.stack -= add; p.bet = to; p.total += add; if (!p.stack) p.allin = true;
      if (raiseBy >= H.minRaise) { H.minRaise = raiseBy; T.seats.forEach(q => { if (q && q !== p) q.acted = false; }); }
      H.currentBet = Math.max(H.currentBet, to);
      p.last = p.allin ? 'All-in' : toCall === 0 && H.street > 0 ? 'Bet' : 'Raise';
      log(`${p.name} ${p.allin ? 'goes all-in for' : p.last === 'Bet' ? 'bets' : 'raises to'} ${fmtc(to)}.`); SFX.chip();
      if (!p.me && H.street > 0 && act.tag && p.tellStrong && !T.fast && RNG.chance(.35)) {
        const truth = RNG.chance(p.style.honest), strong = act.tag === 'value';
        log(`👀 ${p.name} ${(strong === truth) ? p.tellStrong : p.tellWeak}.`);
      }
    }
    p.acted = true;
  }

  // what everyone at the table can see you do: hands played, raises, folds to bets
  function track(p, act, toCall) {
    const t = p.st; if (!t) return;
    if (H.street === 0) {
      if ((act.type === 'call' || act.type === 'raise') && !p._vp) { p._vp = true; t.vpip++; }
      if (act.type === 'raise') { if (!p._pr) { p._pr = true; t.pfr++; } H.aggr = p; }
    } else {
      if (toCall > 0) { t.faced++; if (act.type === 'fold') t.ftb++; }
      if (act.type === 'raise') t.agg++; else if (act.type === 'call') t.calls++;
    }
  }
  // the read you've built on someone: a stats line after a few hands, a style after more
  // short: "45/20 LAG", the way a poker HUD shows it; long: spelled out for the table-talk list
  function readOf(p, long) {
    const t = p.st; if (!t || t.hands < 6) return '';
    const v = t.vpip / t.hands, r = t.pfr / t.hands, af = t.agg / Math.max(1, t.calls);
    const loose = v < .18 ? 0 : v > .38 ? 2 : 1, aggr = r / Math.max(.01, v) > .55 || af > 1.5;
    const tag = t.hands < 15 ? '' : [['Rock', 'Nit-TAG'], ['Passive', 'Reg'], ['Fish', 'LAG']][loose][aggr ? 1 : 0];
    if (long) return `plays ${Math.round(v * 100)}% of hands, raises ${Math.round(r * 100)}%` + (tag ? ` · ${['tight', 'solid', 'loose'][loose]}-${aggr ? 'aggressive' : 'passive'}` : ' · still reading them');
    return `${Math.round(v * 100)}/${Math.round(r * 100)}${tag ? ' ' + tag : ''}`;
  }

  /* ---------- AI ---------- */
  // a draw on the board: four to a flush or four to a straight that the hole cards help make
  function drawOf(hole, board) {
    if (board.length < 3 || board.length > 4) return 0;
    const all = hole.concat(board);
    for (let su = 0; su < 4; su++) if (all.filter(c => c.s === su).length === 4 && hole.some(c => c.s === su)) return 2;
    const rs = new Set(all.map(c => c.r)); if (rs.has(14)) rs.add(1);
    for (let lo = 1; lo <= 10; lo++) {
      const win = [0, 1, 2, 3, 4].map(k => lo + k), have = win.filter(r => rs.has(r));
      if (have.length === 4 && hole.some(c => win.includes(c.r) || (c.r === 14 && lo === 1))) return 1;
    }
    return 0;
  }
  // how a player is playing right now: their nature, bent by tilt, and adjusted to your habits
  function mood(p) {
    const s = { ...p.style };
    if (p.tilt > 0) { const k = s.tilt; s.loose = Math.min(.95, s.loose + .3 * k); s.agg = Math.min(1, s.agg + .2 * k); s.bluff = Math.min(.6, s.bluff + .2 * k); s.stick += .15 * k; }
    const me = T.seats.find(q => q && q.me), t = me && me.st;
    if (t && s.adapt && t.hands >= 8) {
      const pfr = t.pfr / t.hands, ftb = t.faced >= 4 ? t.ftb / t.faced : .45;
      s.vsRaiser = Math.max(-1, Math.min(2.5, (pfr - .18) * 10)) * s.adapt;   // you raise a lot: fight back
      s.bluff *= 1 + Math.max(-.7, Math.min(1.5, (ftb - .45) * 3)) * s.adapt;   // you fold a lot: bluff you
      s.stick += Math.max(0, (t.agg / Math.max(1, t.calls)) - 1.2) * .08 * s.adapt; // you bet a lot: call you down
    }
    return s;
  }
  function late(p) { // on the button or the seat before it
    let k = 0; for (let j = 1; j <= T.seats.length; j++) { const q = T.seats[(T.seats.indexOf(p) + j) % T.seats.length]; if (q === T.seats[T.btn]) return k <= 1; if (q && q.inHand && !q.folded) k++; } return false;
  }
  async function thinkAI(p) {
    await pause(T.fast ? 0 : 200);
    const [, bb] = blinds(), toCall = H.currentBet - p.bet, s = mood(p);
    const pot = H.pot + T.seats.reduce((a, q) => a + (q ? q.bet : 0), 0);
    const eff = (p.stack + p.bet) / bb, minTo = H.currentBet + H.minRaise, maxTo = p.bet + p.stack;
    const raiseTo = (x, tag) => ({ type: 'raise', to: Math.max(Math.min(maxTo, Math.round(x / 25) * 25), Math.min(maxTo, minTo)), tag });
    const passive = () => (toCall === 0 ? { type: 'check' } : { type: 'fold' });
    const call = tag => ({ type: 'call', tag });
    if (H.street === 0) {
      const c = chen(p.cards[0], p.cards[1]) + (late(p) ? 1.5 : 0) + RNG.float() - .5;
      if (eff <= 12) { // push or fold
        const push = 13 - eff * .35 - s.loose * 4, callAt = 15 - eff * .3 - s.loose * 3;
        if (toCall <= bb && c >= push) return raiseTo(maxTo, c >= 12 ? 'value' : 'bluff');
        if (toCall > bb) return c >= callAt ? call() : { type: 'fold' };
        return toCall === 0 ? { type: 'check' } : (c >= push - 1 ? call() : { type: 'fold' });
      }
      if (H.currentBet <= bb) {
        // open: raise, limp (passive players) or fold; sizes vary by player
        const open = 9 - s.loose * 7;
        if (c >= open) return RNG.chance(.35 + s.agg * .65) ? raiseTo(bb * (2 + s.size + RNG.float() * .8), c >= 11 ? 'value' : 'bluff') : (toCall === 0 ? { type: 'check' } : call());
        if (toCall === 0) return RNG.chance(s.agg * .25 + s.bluff) && late(p) ? raiseTo(bb * 2.5, 'bluff') : { type: 'check' };
        if (RNG.chance(s.bluff * .5) && late(p)) return raiseTo(bb * 2.5, 'bluff');
        return passive();
      }
      // facing a raise: defend wider against small raises, good prices and the big blind;
      // re-raise the best hands and the odd bluff; fight back harder against frequent raisers
      const frac = toCall / (p.stack + p.bet), raiseBB = toCall / bb, price = toCall / (pot + toCall);
      const fight = s.vsRaiser || 0;
      if (c >= 12.5 - s.agg * 2.5 - fight * .5) return raiseTo(H.currentBet * (2.5 + RNG.float() * .8), 'value');
      if (c >= 6 && c <= 9 && frac < .25 && RNG.chance(s.bluff * .6 + fight * .05)) return raiseTo(H.currentBet * (2.6 + RNG.float() * .6), 'bluff');
      let need = 9.5 - s.loose * 5 + Math.min(4, Math.max(0, raiseBB - 3) * .5) + frac * 6 - fight;
      if (p === T.seats[H.bbi]) need -= 2;
      if (price < .3) need -= 1;
      if (c >= need && frac < .5) return call();
      if (c >= 11 && frac >= .5) return call();
      return passive();
    }
    // after the flop: how strong, how drawn, and who's betting
    const opp = contenders().length - 1;
    const eq = equity(p.cards, H.board, opp, T.fast ? 70 : 160);
    const draw = drawOf(p.cards, H.board), river = H.board.length === 5;
    const odds = toCall / Math.max(1, pot + toCall);
    const sizeFor = tag => { let f = s.size * (.75 + RNG.float() * .5); if (s.leak > 0 && tag === 'value') f *= 1.35; if (s.leak > 0 && tag === 'bluff') f *= .7; if (s.leak < 0 && tag === 'bluff') f *= 1.4; return Math.max(bb, pot * f); };
    const monster = eq > .85, strong = eq > .66, medium = eq > .45;
    const multi = opp >= 2 ? .5 : 1; // bluffs work worse against a crowd
    if (toCall === 0) {
      if (monster) return RNG.chance(s.trap * (river ? .3 : 1)) ? { type: 'check', tag: 'trap' } : raiseTo(sizeFor('value'), 'value');
      if (strong) return RNG.chance(.55 + s.agg * .4) ? raiseTo(sizeFor('value'), 'value') : { type: 'check' };
      if (medium) return RNG.chance(s.agg * .35) ? raiseTo(pot * (.3 + RNG.float() * .2), 'value') : { type: 'check' };
      if (draw && !river && RNG.chance(s.agg * .6 * multi)) return raiseTo(sizeFor('bluff'), 'bluff');
      if (H.aggr === p && H.board.length === 3 && RNG.chance(s.cbet * multi)) return raiseTo(pot * (.3 + s.size * .4), 'bluff');
      if (H.aggr === p && RNG.chance(s.bluff * 1.6 * multi)) return raiseTo(sizeFor('bluff'), 'bluff'); // second barrel
      if (opp === 1 && late(p) && RNG.chance(s.bluff * multi)) return raiseTo(sizeFor('bluff'), 'bluff');  // stab when checked to
      return { type: 'check' };
    }
    // facing a bet: a bettor's range is stronger than random cards, more so the bigger the bet
    const eqB = eq - .1 - Math.min(.18, toCall / Math.max(1, pot - toCall) * .15);
    if (eqB > .8) {
      const slow = s.trap > .5 && !river && RNG.chance(s.trap);
      return slow || !RNG.chance(.35 + s.agg * .55) ? call('trap') : raiseTo(H.currentBet + pot * (.6 + RNG.float() * .6), 'value');
    }
    if (eqB > .6) return RNG.chance(s.agg * .3) ? raiseTo(H.currentBet * (2.3 + RNG.float()), 'value') : call();
    if (draw && !river) {
      if (opp === 1 && RNG.chance(s.agg * s.bluff * 2)) return raiseTo(H.currentBet * 2.6, 'bluff'); // semi-bluff raise
      return odds < .38 + s.stick * .1 ? call() : { type: 'fold' };
    }
    if (eqB > odds + .05 - s.stick * .2 - s.loose * .03) return call();
    if (opp === 1 && RNG.chance(s.bluff * .3)) return raiseTo(H.currentBet * 2.5, 'bluff');           // bluff-raise
    if (opp === 1 && !river && late(p) && odds < .3 && RNG.chance(s.loose * .2)) return call('float'); // float to take it later
    return { type: 'fold' };
  }

  /* ---------- the human ---------- */
  let resolveMe = null;
  function askMe(p) {
    return new Promise(res => {
      resolveMe = act => { resolveMe = null; res(act); };
      renderControls(p);
    });
  }

  /* ---------- showdown, side pots ---------- */
  async function showdown() {
    const cs = contenders();
    if (cs.length === 1) {
      const w = cs[0], won = H.pot; w.stack += won; w.last = 'Wins'; log(`${w.name} wins ${fmtc(won)} uncontested.`);
      H.pot = 0; render(); await pause(700); return;
    }
    while (H.board.length < 5) { H.board.push(H.shoe.draw()); render(); await pause(1500); }
    cs.forEach(p => { p.shown = true; p.eval = Poker.best(p.cards.concat(H.board)); });
    render(); await pause(T.fast ? 200 : 1800);
    // side pots by contribution level
    const all = T.seats.filter(p => p && p.inHand);
    const levels = [...new Set(all.map(p => p.total))].sort((a, b) => a - b);
    let prev = 0;
    for (const lv of levels) {
      const contributors = all.filter(p => p.total >= lv);
      const amount = (lv - prev) * contributors.length; prev = lv;
      let eligible = contributors.filter(p => !p.folded);
      if (!amount) continue;
      if (!eligible.length) eligible = cs; // chips nobody live matched still go to someone at showdown
      const best = Math.max(...eligible.map(p => p.eval.score));
      const winners = eligible.filter(p => p.eval.score === best);
      const share = Math.floor(amount / winners.length);
      winners.forEach((w, k) => { w.stack += share + (k === 0 ? amount - share * winners.length : 0); w.last = 'Wins'; });
      log(`${winners.map(w => w.name).join(' & ')} win${winners.length > 1 ? '' : 's'} ${fmtc(amount)} with ${winners[0].eval.name}.`);
    }
    // folded players' extra chips beyond the last level were counted above; nothing is lost
    H.pot = 0;
    // losing a big pot gets under some people's skin
    for (const q of cs) if (!q.me && q.last !== 'Wins' && q.stack > 0 && q.total >= (q.stack + q.total) * .4 && q.style.tilt >= .3) { q.tilt = 3 + Math.round(q.style.tilt * 4); log(`😤 ${q.name} is steaming.`); }
    const meSeat = T.seats.find(p => p && p.me);
    const mine = meSeat && meSeat.inHand && !meSeat.folded;
    if (mine) { meSeat.last === 'Wins' ? SFX.win() : SFX.lose(); }
    render();
    // a showdown you played in waits for you; anyone else's gets a good look before the next deal
    if (mine && !T.fast) await nextHand(meSeat); else await pause(T.fast ? 400 : 3000);
  }
  function nextHand(me) {
    return new Promise(res => {
      if (!el) return res();
      const go = () => { clearTimeout(auto); document.removeEventListener('keydown', key); el.ctl.innerHTML = ''; res(); };
      const key = e => { if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('input, select, textarea')) { e.preventDefault(); go(); } };
      const auto = setTimeout(go, 30000);
      el.ctl.innerHTML = '';
      el.ctl.append(h('div.pk-msg', me.last === 'Wins' ? `🏆 You win with ${me.eval ? me.eval.name : 'the best hand'}.` : `${me.eval ? 'Your ' + me.eval.name + ' loses.' : 'You lose the pot.'}`),
        h('div.actions', h('button.btn.primary', { onclick: go }, 'Next hand ▶')));
      document.addEventListener('keydown', key);
    });
  }

  /* ---------- running the tournament ---------- */
  async function run() {
    while (!T.over) {
      // eliminations at your table
      // players busted on the same hand: the one who started it with more chips finishes higher
      const out = T.seats.filter(p => p && p.stack <= 0 && !p.place).sort((a, b) => (b.total || 0) - (a.total || 0));
      let nextPlace = alive() + out.length;
      for (const p of out.slice().reverse()) { p.stack = 0; p.place = nextPlace--; T.busted.push(p); }
      for (const p of out) if (!p.me) log(`💀 ${p.name} is out in ${ordinal(p.place)}.`);
      const me = T.seats.find(p => p && p.me);
      if (me.stack <= 0) { await finish(me.place); return; }
      if (alive() === 1) { await finish(1); return; }
      if (T.field.length) { simulateField(); balance(); }
      T.hand++;
      if (T.hand > 1 && (T.hand - 1) % T.def.perLevel === 0 && T.level < LEVELS.length - 1) { T.level++; const [s, b, a] = blinds(); log(`⏫ Blinds up: ${fmtc(s)}/${fmtc(b)}${a ? ' ante ' + fmtc(a) : ''}.`); }
      T.fast = false;
      Career.drain('round', .25); App.state.clock = (App.state.clock || 540) + 1.5;
      await playHand();
      if (T.quit) { await finish(alive() + 0); return; }
    }
  }
  const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  async function finish(place) {
    T.over = true;
    const pays = PAYOUTS(T.entrants), prize = place <= pays.length ? Math.round(T.pool * pays[place - 1]) : 0;
    const st = App.state;
    if (prize) App.credit(prize);
    Quests.event('poker', { place, prize });
    st.stats.poker = st.stats.poker || { played: 0, cashes: 0, wins: 0, won: 0, best: 0 };
    const P = st.stats.poker; P.played++; if (prize) { P.cashes++; P.won += prize; } if (place === 1) { P.wins++; App.count('pokerWin_' + T.key); } P.best = P.best ? Math.min(P.best, place) : place;
    if (place <= 9 && T.entrants > 9) App.count('finalTables');
    // rivals collect their results too
    const everyone = T.seats.filter(Boolean).concat(T.field, T.busted);
    // whoever is still in when you finish takes the places above yours, biggest stack first
    const left = T.seats.filter(p => p && !p.me && p.stack > 0 && !p.place).concat(T.field.filter(p => p.stack > 0 && !p.place)).sort((a, b) => b.stack - a.stack);
    left.forEach((p, i) => { p.place = i + 1; });
    for (const p of everyone) if (p.rival) {
      const pl = p.place || T.entrants;
      const rp = pl <= pays.length ? Math.round(T.pool * pays[pl - 1]) : 0;
      if (rp) { st.rivals[p.rival].bank += rp; st.rivals[p.rival].net += rp - T.def.buyin; }
      else st.rivals[p.rival].net -= T.def.buyin;
    }
    App.news(`♠️ ${T.def.name}: ${st.name} finished ${ordinal(place)} of ${T.entrants}${prize ? ' for ' + fmt(prize) : ''}.`);
    Career.checkAchievements(); App.save(); Router.hud();
    await UI.modal({ title: place === 1 ? '🏆 Champion!' : prize ? '💰 In the money' : '♠️ Knocked out',
      body: h('div', h('p', `You finished ${ordinal(place)} of ${T.entrants} in ${/^the /i.test(T.def.name) ? '' : 'the '}${T.def.name}.`), prize ? h('p.good', `Prize: ${fmt(prize)}`) : h('p.muted', 'No prize this time.'),
        h('table.paytable', PAYOUTS(T.entrants).map((pc, i) => h('tr' + (i + 1 === place ? '.me-row' : ''), h('td', ordinal(i + 1)), h('td.num', fmt(Math.round(T.pool * pc))))))),
      buttons: [{ label: 'Back to the lobby', cls: 'primary' }] });
    T = null; Router.go('poker');
  }

  /* ---------- rendering ---------- */
  let el = null;
  const pause = ms => sleep(T && T.fast ? Math.min(ms, 30) : ms);
  function seatPos(i, n) {
    const a = Math.PI / 2 + (i / n) * Math.PI * 2;
    return { left: 50 + 44 * Math.cos(a), top: 50 + 38 * Math.sin(a) };
  }
  function render() {
    if (!el || !T) return;
    const [sb, bb, ante] = blinds();
    el.info.textContent = `${T.def.name} · Level ${T.level + 1}: ${fmtc(sb)}/${fmtc(bb)}${ante ? ' ante ' + fmtc(ante) : ''} · Players left ${alive()}/${T.entrants} · Hand ${T.hand}`;
    el.pot.textContent = H ? 'Pot ' + fmtc(H.pot + T.seats.reduce((a, q) => a + (q ? q.bet : 0), 0)) : '';
    el.board.innerHTML = ''; if (H) H.board.forEach(c => el.board.append(UI.card(c)));
    el.seats.innerHTML = '';
    const n = T.seats.length;
    T.seats.forEach((p, i) => {
      const pos = seatPos(i, n);
      if (!p || p.stack <= 0 && !(p.inHand && H)) { el.seats.append(h('div.pk-seat.empty', { style: { left: pos.left + '%', top: pos.top + '%' } }, p && p.place ? `${p.name} · ${ordinal(p.place)}` : 'Empty')); return; }
      const cards = h('div.pk-cards');
      if (p.cards && p.cards.length && p.inHand && !p.folded) p.cards.forEach(c => { const ce = UI.card(c, !(p.me || p.shown)); ce.classList.add('pk-card'); cards.append(ce); });
      const turn = H && resolveMe && p.me;
      el.seats.append(h('div.pk-seat' + (p.me ? '.me' : '') + (p.folded ? '.folded' : '') + (p.last === 'Wins' ? '.wins' : '') + (turn ? '.turn' : ''), { style: { left: pos.left + '%', top: pos.top + '%' } },
        cards,
        h('div.pk-plate', { title: p.me ? '' : (readOf(p, true) || 'No read yet') + (p.tilt > 0 ? ' · steaming' : '') }, h('span.pk-face', Portrait.el(p.me ? 'me' : p)), h('div', h('b', p.name + (p.tilt > 0 ? ' 😤' : '')), h('span', fmtc(p.stack)), !p.me && readOf(p) ? h('small.pk-read', readOf(p)) : null)),
        p.last ? h('div.pk-act', p.last + (p.shown && p.eval ? ' · ' + p.eval.name : '')) : null,
        T.btn === i ? h('div.pk-btn', 'D') : null));
      if (p.bet > 0) { const bp = { left: 50 + (pos.left - 50) * .58, top: 50 + (pos.top - 50) * .55 }; el.seats.append(h('div.pk-bet', { style: { left: bp.left + '%', top: bp.top + '%' } }, UI.stack(p.bet), h('span', fmtc(p.bet)))); }
    });
    const me = T.seats.find(p => p && p.me);
    el.myhand.textContent = (H && H.runout ? '🃏 Running it out · ' : '') + (me && me.cards && me.cards.length && H ? (H.board.length ? Poker.best(me.cards.concat(H.board)).name : `${cardName(me.cards[0])} ${cardName(me.cards[1])}${me.cards[0].r === me.cards[1].r ? ' (pocket pair)' : me.cards[0].s === me.cards[1].s ? ' (suited)' : ''}`) : '');
  }
  function renderLog() { if (el) { el.log.innerHTML = ''; T.log.slice(0, 7).forEach(t => el.log.append(h('div', t))); } }
  function renderControls(p) {
    render();
    const [, bb] = blinds(), toCall = H.currentBet - p.bet;
    const pot = H.pot + T.seats.reduce((a, q) => a + (q ? q.bet : 0), 0);
    const minTo = Math.min(p.bet + p.stack, H.currentBet + H.minRaise), maxTo = p.bet + p.stack;
    const canRaise = maxTo > H.currentBet && !p.acted;
    const amt = h('input.field.sm#pk-amt', { type: 'number', min: minTo, max: maxTo, step: bb / 2, value: minTo });
    const slider = h('input#pk-slide', { type: 'range', min: minTo, max: maxTo, step: Math.max(25, bb / 2), value: minTo, oninput: e => { amt.value = e.target.value; } });
    amt.oninput = () => { slider.value = amt.value; };
    const preset = (label, to) => h('button.btn.sm.ghost', { onclick: () => { const v = Math.max(minTo, Math.min(maxTo, Math.round(to / 25) * 25)); amt.value = slider.value = v; } }, label);
    const done = act => { el.ctl.innerHTML = ''; resolveMe(act); };
    const odds = toCall > 0 ? ` · pot odds ${pctStr(toCall / (pot + toCall), 0)}` : '';
    el.ctl.innerHTML = '';
    el.ctl.append(
      h('div.pk-msg', toCall > 0 ? `${fmtc(toCall)} to call${odds}` : 'Check or bet'),
      h('div.actions',
        h('button.btn.ghost', { onclick: () => done({ type: 'fold' }) }, 'Fold'),
        toCall > 0 ? h('button.btn.primary', { onclick: () => done({ type: 'call' }) }, toCall >= p.stack ? `Call all-in ${fmtc(p.stack)}` : `Call ${fmtc(toCall)}`) : h('button.btn.primary', { onclick: () => done({ type: 'check' }) }, 'Check'),
        canRaise ? h('button.btn.primary', { onclick: () => done({ type: 'raise', to: Math.max(minTo, Math.min(maxTo, +amt.value || minTo)) }) }, H.currentBet > 0 ? 'Raise to' : 'Bet') : null),
      canRaise ? h('div.pk-sizer', slider, amt, preset('½ pot', H.currentBet + toCall + pot / 2), preset('Pot', H.currentBet + toCall + pot), preset('All-in', maxTo)) : null);
  }

  /* ---------- screens ---------- */
  function lobby(main) {
    const st = App.state, P = (st.stats.poker || {});
    const rows = Object.keys(TOURNEYS).map(k => {
      const d = TOURNEYS[k], why = d.req && d.req(), today = !d.when || d.when();
      const blocked = why || (!today && 'Not running today') || (st.bank < d.buyin + d.fee && `Needs ${fmt(d.buyin + d.fee)}`);
      return h('div.item' + (blocked ? '.dim' : ''), h('div.item-i', '♠️'), h('b', d.name), h('p', d.desc),
        h('div.tags', h('span', `${fmt(d.buyin)} + ${fmt(d.fee)}`), h('span', `${d.field} players`), h('span', `Pool ${fmt(d.buyin * d.field)}`), h('span', `1st ${fmt(Math.round(d.buyin * d.field * PAYOUTS(d.field)[0]))}`)),
        blocked ? h('div.muted.small', '🔒 ' + blocked) : h('button.btn.sm.primary', { onclick: () => start(k) }, 'Register'));
    });
    main.append(h('div.shop', h('div.lobby-h', h('button.btn.ghost.sm', { onclick: () => Router.go('world') }, '← Back to the Spur'),
      h('div', h('h2', '♠️ The Back Room'), h('p.muted', 'Smoke-stained felt, a busted jukebox, and the best poker in town.'))),
      h('p.muted.small', `Your record: ${P.played || 0} tournaments · ${P.cashes || 0} cashes · ${P.wins || 0} wins · ${fmt(P.won || 0)} won.${App.perk('odds') ? '' : ''} No-limit hold'em: starting stacks are tournament chips; blinds rise every few hands.`),
      h('div.shopgrid', rows)));
  }
  async function start(key) {
    const d = TOURNEYS[key];
    if (!(await UI.confirm(`Register: ${d.name}`, `Buy-in ${fmt(d.buyin)} plus ${fmt(d.fee)} fee. ${d.field} players, ${fmt(d.stack)} starting chips. Leaving before the end forfeits your seat.`, 'Register'))) return;
    if (!App.debit(d.buyin + d.fee)) return UI.toast('Not enough bankroll', 'warn');
    create(key);
    Router.go('pokertable');
  }
  function table(main) {
    if (!T) { Router.go('poker'); return; }
    el = {};
    main.append(h('div.pk',
      h('div.table-top', h('button.btn.ghost.sm', { onclick: async () => { if (await UI.confirm('Leave the tournament?', 'You\'ll be blinded out: you finish in the current last place, and win a prize only if that place is in the money.', 'Leave')) { T.quit = true; T.fast = true; if (resolveMe) resolveMe({ type: 'fold' }); } } }, '← Leave'),
        el.info = h('div.tt-title'), h('button.btn.ghost.sm', { onclick: tableTalk }, '💬 Table talk'), h('div.pk-ff', h('label.small', { title: 'After you fold, the rest of the hand plays out quickly' }, h('input', { type: 'checkbox', checked: App.state.settings.pkSkip !== false, onchange: e => { App.state.settings.pkSkip = e.target.checked; App.save(); } }), ' Auto-skip after I fold'),
          h('button.btn.ghost.sm', { onclick: () => { if (T) T.fast = true; } }, '⏩ Fast-forward'))),
      h('div.pk-felt', el.seats = h('div.pk-seats'), h('div.pk-center', el.board = h('div.cards.board'), el.pot = h('div.pk-pot'))),
      h('div.controls', h('div.pk-mine', 'Your hand: ', el.myhand = h('b')), el.ctl = h('div.pk-ctl'), el.log = h('div.pk-log'))));
    render(); renderLog();
    log(`Welcome to the ${T.def.name}. ${T.entrants} players, ${fmtc(T.def.stack)} chips each. Shuffle up and deal!`);
    run();
  }
  // chat with someone at your table between actions
  async function tableTalk() {
    if (!T) return;
    const others = T.seats.filter(p => p && !p.me && p.stack > 0);
    let pick = null;
    const body = h('div.menu-list', others.map(p => h('div.menu-row', h('span.mi', Portrait.el(p.me ? 'me' : p)), h('div.mn', h('b', p.name), h('small', `${fmtc(p.stack)} chips${!p.me ? ' · ' + (readOf(p, true) || 'no read yet') : ''}`)),
      h('button.btn.sm', { onclick: () => { pick = p; dlg.close(); } }, '💬 Talk'))));
    const dlg = UI.modal({ title: '💬 Who do you want to talk to?', body });
    await dlg;
    if (pick && T) Chat.open(Crowd.pokerOpp(pick, T));
  }
  // the Back Room door at the Spur
  function spots(m) {
    if (m.id !== 'v:spur' || !App.state.flags.pokerRoom) return [];
    return [{ x: 11, y: 1, id: 'backroom', label: '♠ The Back Room (poker tournaments)', door: true }];
  }
  return { lobby, table, spots, TOURNEYS, active: () => !!T, _T: () => T, _H: () => H, _equity: equity, _chen: chen };
})();
