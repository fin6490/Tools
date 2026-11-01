/* Work around town, for when the tables have been cruel, and two rooms you have to earn your way into.
   - Vinnie's errands (ask him in the pawn shop): carry something across town for him, two a day. Usually it pays, more
     in later chapters; about one in four goes wrong and costs you. Run five and he gives you the key to his back office.
   - Vinnie's back office (behind KNOCK. THEN LEAVE.): a secret room. His desk and his ledger (read it while he's out and
     you might learn what he did to Sal; get caught and it's a rudeness tax), the safe, the racehorse, and his phone: the
     big errands, once a day, for real money.
   - Prime Cut's wine cellar: Philippe opens it to regulars (three dinners) or for a consideration. Inside: the bins (the
     postcard trail's bin is down here), a glass of the good stuff, and his deliveries (an errand, once a day).
   - The Rusty Spur pays for work (spurwork in this file): shifts behind the bar, a step up the ladder every few, and pool
     against the regulars for money. */
const Office = (() => {
  const st = () => { const f = App.state.flags; if (!f.office) f.office = { errands: 0, errandDay: -1, errandsToday: 0, key: 0, ledger: 0, phoneDay: -1, cellar: 0, deliveryDay: -1, shifts: 0, shiftDay: -1, shiftsToday: 0 }; return f.office; };
  const say = lines => UI.dialog(lines);
  const ch = () => App.state.chapter || 0;
  const marker = () => App.state.loans.find(l => l.id === 'sal' && l.balance > 0.005);
  const KEY_AT = 5;
  const r2 = n => Math.round(n * 100) / 100;
  const busy = () => Career.canPlay && Career.canPlay(); // too hungry, too tired, too late
  // work takes time and wears you out like everything else (four minutes a 'round')
  const spend = hours => Career.drain('round', hours * 15);

  /* ---------- errands: Vinnie's, the phone's, Philippe's ---------- */
  const ERRANDS = [
    ['a shoebox to the Riverboat\'s purser', 'The purser counts it twice and gives you a cigar you don\'t smoke.', 'The purser isn\'t there. Lou is. Lou has questions, and so, it turns out, do the river police.'],
    ['an envelope to a man in the Grand Hotel bar', 'He tips you like you\'re the bellhop. You take it.', 'He isn\'t the man. The man was the one watching from the lobby. You lose the envelope, and then some.'],
    ['a word with Tex Calhoun about what he owes', 'Tex pays, mostly to stop you talking. Vinnie takes his cut and gives you yours.', 'Tex talks louder than you do, and his friends are bigger. It costs you to get out of the parking lot.'],
    ['a sealed crate from the motel to the pawn shop\'s back door', 'Heavy, clinking, none of your business. Delivered.', 'The crate breaks on the motel stairs. Darlene saw. Darlene wants paying.'],
    ['a watch to a jeweller who doesn\'t keep a shop', 'He looks at it through his eyeglass for a long time and pays without a word.', 'The watch is a fake. Somebody has to cover the difference, and it isn\'t Vinnie.'],
    ['a parcel to the Quik-Stop, for Raj, "for the back"', 'Raj doesn\'t look in it. Neither do you. Everybody\'s happy.', 'Raj\'s cousin is in the shop. Raj\'s cousin is a cop. You leave the parcel and a little more besides.'],
  ];
  async function runErrand({ who, pay, risk, lines = RNG.pick(ERRANDS), hours = 2, onWin }) {
    const [what, good, bad] = lines;
    const why = busy(); if (why) return UI.toast(why, 'warn');
    const c = await UI.modal({ title: '💼 An errand', body: h('div', h('p', `"Take ${what}. Don't open anything. Don't be clever."`), h('p.muted.small', `About ${hours} hours. Pays about ${fmt(pay)}. ${risk > .3 ? 'It goes wrong more often than not-quite-never.' : 'It usually goes fine. Usually.'}`)),
      buttons: [{ label: 'Not now', value: false, cls: 'ghost' }, { label: 'Do it', value: true, cls: 'primary' }] });
    if (!c) return false;
    spend(hours);
    if (RNG.chance(1 - risk)) {
      App.credit(pay); App.count('errandsDone'); SFX.cash(); if (onWin) onWin();
      await say([{ who: 'narrator', text: good }, { who, text: RNG.pick([`${fmt(pay)}. You didn't open anything. I can tell.`, `${fmt(pay)}. Same time tomorrow, maybe.`, `There. ${fmt(pay)}. Don't spend it all at the Spur.`]) }]);
    } else {
      const lost = r2(Math.min(App.state.bank * .12, 400 + 800 * ch())); App.state.bank = Math.max(0, r2(App.state.bank - lost)); App.count('errandsBad'); if (typeof Mood !== 'undefined') Mood.change(-4, 'an errand gone wrong'); SFX.lose();
      await say([{ who: 'narrator', text: bad }, { who: 'narrator', text: lost ? `It costs you ${fmt(lost)}.` : 'You get out with nothing but a story.' }, { who, text: 'That\'s why it pays.' }]);
    }
    App.save(); Router.hud(); Career.checkAchievements(); return true;
  }
  // Vinnie, in the shop: two a day; the fifth earns the key
  async function vinnieErrand() {
    const o = st(), d = App.state.day;
    if (o.errandDay !== d) { o.errandDay = d; o.errandsToday = 0; }
    if (o.errandsToday >= 2) return say([{ who: 'vinnie', text: 'Two\'s plenty. Come back tomorrow. People notice a face that keeps coming back.' }]);
    const done = await runErrand({ who: 'vinnie', pay: Math.round((250 + 450 * ch()) * (1 + RNG.float() * .6)), risk: .22, onWin: () => { o.errands++; } });
    if (!done) return;
    o.errandsToday++; App.save();
    if (!o.key && o.errands >= KEY_AT) {
      o.key = App.state.day; App.count('officeKey'); App.save(); Career.checkAchievements();
      await say([{ who: 'vinnie', text: '*He slides a key across the counter on a ring with a tiny brass horse.* The back office. You\'ve earned a chair in there. Don\'t sit in mine.' },
        { who: 'narrator', text: '🗝️ Vinnie\'s back office is open to you now: the door behind the counter.' }]);
    } else if (!o.key) UI.toast(`💼 Errands for Vinnie: ${Math.min(o.errands, KEY_AT)} of ${KEY_AT} towards the back office key`, 'good');
  }

  /* ---------- the back office: a secret room ---------- */
  async function door() {
    const o = st();
    if (o.key) return World.enter('r:office');
    return say([{ who: 'narrator', text: 'You knock. The door opens four inches and fills with Nico.' }, { who: 'nico', text: 'Sign says leave.' },
      { who: 'narrator', text: `Vinnie only gives that key to people who are useful to him. Ask him for an errand at the counter (${Math.min(o.errands, KEY_AT)} of ${KEY_AT} done).` }]);
  }
  async function ledger() {
    const o = st();
    if (o.ledger) return say([{ who: 'narrator', text: o.ledger === 2 ? 'The ledger is locked in the desk drawer now. Vinnie looks at you when you look at it.' : 'The ledger, face down, exactly where he leaves it. You already know what\'s on Sal\'s page.' }]);
    await say([{ who: 'narrator', text: 'Vinnie\'s on the shop phone, out front. Nico\'s in the doorway, facing out. The ledger is right there, face down, open.' }]);
    const c = await UI.modal({ title: '📒 The ledger', body: h('p', 'Nico has his back to you. Probably.'), buttons: [{ label: 'Leave it', value: false, cls: 'ghost' }, { label: 'Turn it over', value: true, cls: 'primary' }] });
    if (!c) return;
    if (RNG.chance(.6)) {
      o.ledger = 1; App.count('officeLedger'); App.save(); Career.checkAchievements();
      return say([{ who: 'narrator', text: 'Columns of names and numbers in Vinnie\'s small, careful hand. Tex. The Baron. A page for Sal, in red, going back twenty years.' },
        { who: 'narrator', text: 'At the bottom of Sal\'s page, a different pen: "K. — paid in full. For the name of the man copying his books." Then, smaller: "God forgive me."' },
        { who: 'narrator', text: 'You turn it back over a second before Vinnie comes in. He looks at you, then at the ledger, then at you. He doesn\'t say anything. He doesn\'t have to.' }]);
    }
    o.ledger = 2; const m = marker(), tax = m ? 10000 : Math.min(1500, App.state.bank);
    if (m) m.balance = r2(m.balance + tax); else App.state.bank = r2(App.state.bank - tax);
    App.count('officeCaught'); App.save(); Router.hud();
    return say([{ who: 'nico', text: '*very quietly, very close* Hands.' }, { who: 'vinnie', text: `*from the doorway* That's ${fmt(tax)} for the rudeness, kid. ${m ? 'It\'s on the marker.' : 'Cash.'} Sal never learned either.` }]);
  }
  // the phone on the desk: the big errands, once a day
  async function phone() {
    const o = st();
    if (o.phoneDay === App.state.day) return say([{ who: 'narrator', text: 'The phone sits there. It only rings once a day in here, and it already has.' }]);
    await say([{ who: 'narrator', text: 'The desk phone rings. Vinnie nods at you to pick it up.' }, { who: 'narrator', text: RNG.pick(['A voice you don\'t know gives you an address and hangs up.', 'Somebody breathes for a while, then reads out a licence plate.', '"Is he there? No? You\'ll do."']) }]);
    const big = [['a briefcase from the Salon\'s loading dock to the riverbank, before midnight', 'Nobody follows you. Nobody is ever there. Vinnie counts it twice.', 'Kessler\'s men were waiting at the dock. You get away. The money doesn\'t.'],
      ['a car, keys in it, from the Grand\'s garage to a lot by the river', 'The car is very clean and smells of nothing. You leave it, walk back, get paid.', 'The car has a broken tail light and a cop behind it for six blocks. It costs you to make the cop go away.']];
    const done = await runErrand({ who: 'vinnie', pay: Math.round((1200 + 2000 * ch()) * (1 + RNG.float() * .5)), risk: .3, lines: RNG.pick(big), hours: 3 });
    if (done) { o.phoneDay = App.state.day; App.count('officePhone'); App.save(); }
  }

  /* ---------- Prime Cut's wine cellar ---------- */
  async function cellarDoor() {
    const o = st();
    if (o.cellar) return World.enter('r:cellar');
    const meals = App.counter('steakMeals');
    if (meals >= 3) {
      o.cellar = App.state.day; App.count('cellarOpen'); App.save(); Career.checkAchievements();
      await say([{ who: 'philippe', text: 'Monsieur has dined with us three times without once asking for ketchup. *He produces a key the size of a spoon.* The cellar. Touch nothing with a year on it before 1990.' }]);
      return World.enter('r:cellar');
    }
    const c = await UI.modal({ title: '🍷 The wine cellar', body: h('div', h('p', '"The cellar is for our regulars, monsieur." Philippe guards the key like a state secret.'), h('p.muted.small', `Dine at Prime Cut (${meals} of 3), or offer him a consideration.`)),
      buttons: [{ label: 'Not now', value: false, cls: 'ghost' }, { label: 'A consideration ($250)', value: true, cls: 'primary' }] });
    if (!c) return;
    if (!App.debit(250)) return UI.toast('You don\'t have $250 to be considerate with.', 'warn');
    o.cellar = App.state.day; App.count('cellarOpen'); App.save(); Router.hud(); Career.checkAchievements();
    await say([{ who: 'philippe', text: '*The note vanishes. A key appears.* How generous. Mind the third step. It has opinions.' }]);
    return World.enter('r:cellar');
  }
  async function cellarGlass() {
    if (!App.debit(40)) return UI.toast('A glass of the good stuff is $40.', 'warn');
    if (typeof Mood !== 'undefined') Mood.consume('wine', { drink: true });
    Router.hud(); App.save();
    return say([{ who: 'narrator', text: RNG.pick(['Something red and old, poured from a bottle with no label. It tastes like a good decision.', 'Philippe pours exactly one glass and watches you drink it, the way a man watches a dog with his slippers.']) }]);
  }
  async function delivery() {
    const o = st();
    if (o.deliveryDay === App.state.day) return say([{ who: 'philippe', text: 'One delivery a day, monsieur. The wine needs its rest. So do I.' }]);
    const lines = RNG.pick([['a case of the 2005 to Madame Laval at the Palace', 'Margot signs for it without looking up, and tips like a duchess.', 'A bottle breaks in the cab. The driver charges for the smell. Philippe charges for the bottle.'],
      ['six bottles to the Grand Hotel\'s penthouse', 'Mr. Pemberton takes them personally and gives you an envelope he pretends not to have.', 'The penthouse guest was expecting champagne. He makes his disappointment financial.']]);
    const done = await runErrand({ who: 'philippe', pay: Math.round((180 + 300 * ch()) * (1 + RNG.float() * .4)), risk: .12, lines, hours: 2 });
    if (done) { o.deliveryDay = App.state.day; App.save(); }
  }

  /* ---------- the Rusty Spur: shifts, and a step up every few ---------- */
  const RANKS = [
    { at: 0, name: 'Glass collector', pay: 60, hours: 2, tips: 0 },
    { at: 4, name: 'Barback', pay: 140, hours: 3, tips: 30 },
    { at: 10, name: 'Bartender', pay: 260, hours: 4, tips: 120 },
    { at: 20, name: 'Floor manager', pay: 600, hours: 4, tips: 200 },
    { at: 35, name: 'Night manager', pay: 1300, hours: 5, tips: 300 },
  ];
  const rank = (n = st().shifts) => RANKS.filter(r => n >= r.at).pop();
  const nextRank = (n = st().shifts) => RANKS.find(r => r.at > n);
  const shiftPay = r => Math.round(r.pay * (1 + .2 * ch()));
  async function spurBoard() {
    const o = st(), d = App.state.day; if (o.shiftDay !== d) { o.shiftDay = d; o.shiftsToday = 0; }
    const r = rank(), nx = nextRank(), pay = shiftPay(r);
    const c = await UI.modal({ title: '📋 Staff wanted', body: h('div',
      h('p', `Dolores has you down as: ${r.name}.`), h('p', `A shift is ${r.hours} hours for ${fmt(pay)}${r.tips ? ' plus tips' : ''}.`),
      h('p.muted.small', `${o.shifts} shift${o.shifts === 1 ? '' : 's'} worked. ${nx ? `${nx.at - o.shifts} more and you're ${nx.name} (${fmt(shiftPay(nx))} a shift).` : 'You run the place at night now.'} Two shifts a day at most; pay rises with each chapter too.`)),
      buttons: [{ label: 'Not now', value: false, cls: 'ghost' }, { label: o.shiftsToday >= 2 ? 'Done for today' : `Work a shift (${r.hours}h)`, value: true, cls: 'primary', disabled: o.shiftsToday >= 2 }] });
    if (!c) return;
    const why = busy(); if (why) return UI.toast(why, 'warn');
    spend(r.hours); o.shifts++; o.shiftsToday++; const tips = r.tips ? Math.round(r.tips * (.5 + RNG.float())) : 0; App.credit(pay + tips); App.count('spurShifts'); SFX.cash();
    const lines = { 'Glass collector': 'You collect glasses, wipe tables and laugh at Tex\'s jokes for the tip he never leaves.', Barback: 'You change kegs, cut limes and carry ice until your arms forget they ever didn\'t.', Bartender: 'You pour, you listen, you remember who drinks what. Dolores watches you like a hawk and says "not bad, sugar" once.', 'Floor manager': 'You run the floor: the dealers, the doors, the drunk at table three. Nothing catches fire.', 'Night manager': 'The Spur is yours from ten till close. You count the till at four and it\'s right to the cent.' }[r.name];
    const up = rank(o.shifts); App.save(); Router.hud(); Career.checkAchievements();
    await say([{ who: 'narrator', text: lines }, { who: 'dolores', text: `${fmt(pay)}${tips ? ` and ${fmt(tips)} in tips` : ''}, sugar. ${up !== r ? `And from tomorrow you're ${up.name}. Sal would be proud. Don't tell him I said so.` : RNG.pick(['Same time tomorrow?', 'You\'re better at this than at blackjack.', 'Go eat something.'])}` }]);
  }

  /* ---------- pool at the Spur: hustle the regulars ---------- */
  const SHARKS = [
    { name: 'Hank the trucker', stake: 20, err: .075, line: 'Twenty says I\'m better drunk than you are sober.' },
    { name: 'Lola', stake: 50, err: .06, line: 'Fifty a rack. I break, you cry.' },
    { name: 'Moose', stake: 100, err: .05, line: 'A hundred. Don\'t touch my chalk.' },
    { name: 'Dutch', stake: 250, err: .038, ch: 1, line: 'Two-fifty. I don\'t play for less, and I don\'t lose.' },
    { name: 'The Professor', stake: 500, err: .028, ch: 2, line: 'Five hundred. Angles, my friend, are just geometry with consequences.' },
  ];
  async function pool() {
    const why = busy(); if (why) return UI.toast(why, 'warn');
    const opts = SHARKS.filter(s => (s.ch || 0) <= ch());
    const pick = await UI.modal({ title: '🎱 The pool table', body: h('div', h('p', 'Seven reds, seven yellows, the black last. Somebody\'s always waiting for a game.'), h('p.muted.small', 'Pot your colour and go again; pot the black last. The better the player, the bigger the stake.')),
      buttons: [{ label: 'Not now', value: null, cls: 'ghost' }, ...opts.map((s, i) => ({ label: `${s.name} · ${fmt(s.stake)}`, value: i, disabled: App.state.bank < s.stake }))] });
    if (pick == null) return;
    const s = opts[pick];
    await say([{ who: 'narrator', text: `${s.name}: "${s.line}"` }]);
    if (!App.debit(s.stake)) return UI.toast('Not enough cash for the stake.', 'warn');
    App.count('spurPool'); Router.hud();
    const res = await L2Pub.table({ first: s.name.split(' ')[0], n: s.stake, cash: () => fmt(App.state.bank), shaky: () => (typeof Mood !== 'undefined' && Mood.st().buzz > 45 ? .5 : 0), freeze: on => World.freeze && World.freeze(on), err: s.err });
    spend(.75);
    if (res === 'win') { App.credit(s.stake * 2); App.count('spurPoolWin'); SFX.big(); Career.checkAchievements(); }
    App.save(); Router.hud();
    return say([{ who: 'narrator', text: res === 'win' ? `${s.name} pays up. ${RNG.pick(['"Again tomorrow. I want my money back."', '"Lucky. Nobody\'s that good."', 'Dolores slides you a beer on the house.'])}` : res ? `${s.name} pockets your ${fmt(s.stake)}. "Rack 'em again whenever you like."` : 'You lay your cue down. It counts as a loss.' }]);
  }

  return { vinnieErrand, door, ledger, phone, cellarDoor, cellarGlass, delivery, spurBoard, pool, rank, RANKS, SHARKS, st, KEY_AT };
})();
