/* Work around town, for when the tables have been cruel, and two rooms you have to earn your way into.
   - Vinnie's errands (ask him in the pawn shop): he names a person and a place; you walk it over and hand it to them
     (they wait with a 💼 until the day ends). Two a day. Usually it pays, more in later chapters; about one in four goes
     wrong and costs you. Deliver five and he gives you the key to his back office.
   - Vinnie's back office (behind KNOCK. THEN LEAVE.): a secret room. His desk and his ledger (read it while he's out and
     you might learn what he did to Sal; get caught and it's a rudeness tax), the safe, the racehorse, and his phone: the
     big errands, once a day, for real money.
   - Prime Cut's wine cellar: Philippe opens it to regulars (dinner there on three separate days; money won't do it). Inside: the bins (the
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

  /* ---------- errands you go out and do: Vinnie's, the big ones off his phone, and Philippe's wine ----------
     Take it, walk it to the person waiting somewhere in town (they stand there with a 💼 until the
     day ends), hand it over. That's when it pays, or goes wrong. */
  const RUNS = [
    { what: 'a shoebox', contact: 'The purser', where: 'on the Riverboat', map: 'v:riverboat', at: [12, 14], look: { shirt: '#f4f4f4', vest: '#1f5f8b', pants: '#1d1d1d', skin: '#e0ac69', hair: '#555', hat: true },
      good: 'The purser counts it twice and gives you a cigar you don\'t smoke.', bad: 'The purser isn\'t alone. Lou has questions, and so, it turns out, do the river police.' },
    { what: 'an envelope', contact: 'A man in a grey suit', where: 'in the Grand Hotel lobby', map: 'r:grand', at: [9, 7], look: { shirt: '#6b6b6b', pants: '#4a4a4a', skin: '#f0c19a', hair: '#222', tie: true },
      good: 'He tips you like you\'re the bellhop. You take it.', bad: 'He isn\'t the man. The man was the one watching from the stairs. You lose the envelope, and then some.' },
    { what: 'a message about what Tex owes', contact: 'Tex\'s cousin Earl', where: 'by the fountain in Lucky Park', map: 'town', at: [11, 37], look: { shirt: '#c0392b', pants: '#34495e', skin: '#e0ac69', hair: '#7a4a1e', hat: true },
      good: 'Earl pays, mostly to stop you talking.', bad: 'Earl talks louder than you, and his friends are bigger. It costs you to get out of the park.' },
    { what: 'a sealed crate', contact: 'The guest in room 6', where: 'at the Starlite Motel', map: 'r:motel', at: [8, 6], look: { shirt: '#2d3436', pants: '#2d3436', skin: '#c68863', hair: '#111', shades: true },
      good: 'Heavy, clinking, none of your business. Delivered.', bad: 'The crate splits on the motel stairs. Darlene saw. Darlene wants paying.' },
    { what: 'a wristwatch', contact: 'A jeweller with no shop', where: 'on River Road, by the steakhouse', map: 'town', at: [38, 33], look: { shirt: '#8e44ad', pants: '#2d3436', skin: '#f0c19a', hair: '#ccc', glasses: true },
      good: 'He looks at it through his eyeglass for a long time and pays without a word.', bad: 'The watch is a fake. Somebody has to cover the difference, and it isn\'t Vinnie.' },
    { what: 'a parcel "for the back"', contact: 'Raj\'s brother', where: 'in the Quik-Stop', map: 'r:store', at: [9, 6], look: { shirt: '#16a085', pants: '#2d3436', skin: '#a0673f', hair: '#111' },
      good: 'He doesn\'t look in it. Neither do you. Everybody\'s happy.', bad: 'His cousin is in the shop. His cousin is a cop. You leave the parcel and a little more besides.' },
    { what: 'a folded racing paper', contact: 'The man in the back booth', where: 'at Mel\'s Diner', map: 'r:diner', at: [12, 8], look: { shirt: '#7f8c8d', pants: '#2d3436', skin: '#f0c19a', hair: '#888', hat: true },
      good: 'He reads the paper, finds what\'s folded inside it, and leaves Mel a very large tip.', bad: 'Mel sees what falls out of the paper. Mel wants it gone, and wants paying for her trouble.' },
    { what: 'a bolt of cloth that\'s heavier than cloth', contact: 'The tailor', where: 'at Lucky Strike Outfitters', map: 'r:shop', at: [12, 6], look: { shirt: '#f4f4f4', vest: '#6b4a2a', pants: '#2d3436', skin: '#c68863', hair: '#3a2a1e', glasses: true },
      good: 'He measures it, nods, and pays you from the till like it was a hem.', bad: 'Rosa comes in early. The tailor hands it back to you, loudly. You buy something on the way out to make it go away.' },
    { what: 'a birthday card with something thick in it', contact: 'The woman in 2B', where: 'at the Downtown Apartments', map: 'r:apts', at: [6, 6], look: { shirt: '#e84393', pants: '#2d3436', skin: '#8d5524', hair: '#111' },
      good: 'She opens it on the landing, counts it, and wishes you a happy birthday too.', bad: 'Her husband is home. He has questions about the card. You answer them with money.' },
    { what: 'a bottle wrapped in newspaper', contact: 'Rémy the waiter', where: 'at Prime Cut', map: 'r:steak', at: [11, 7], look: { shirt: '#f4f4f4', vest: '#111', pants: '#111', skin: '#f0c19a', hair: '#3a2a1e', bow: true },
      good: 'Rémy takes it through the kitchen door and comes back with an envelope on a silver tray.', bad: 'Philippe takes it before Rémy can. "Monsieur. In my restaurant?" You pay for the insult.' },
    { what: 'a deck still in its cellophane', contact: 'A croupier on her break', where: 'at the Gilded Palace', map: 'v:palace', at: [3, 10], look: { shirt: '#f4f4f4', vest: '#5e1430', pants: '#111', skin: '#e0ac69', hair: '#7a2e1a' },
      good: 'She slips it into her apron without looking at it and hands you a chip she\'s cashed for you.', bad: 'Margot\'s floor man sees the cellophane. Margot sends you a bill for "the inconvenience".' },
    { what: 'an envelope for the regular at the end of the bar', contact: 'The man at the end of the bar', where: 'at the Rusty Spur', map: 'v:spur', at: [3, 12], look: { shirt: '#5d4037', pants: '#2d3436', skin: '#f0c19a', hair: '#555', hat: true },
      good: 'He tucks it in his hat. Dolores pretends not to see, and pours him another.', bad: 'Nico\'s there, drinking. He takes the envelope and a little extra for his memory.' },
    { what: 'a key on a red ribbon', contact: 'A woman in a red scarf', where: 'by the phone booth on River Road', map: 'town', at: [10, 29], look: { shirt: '#c0392b', pants: '#2d3436', skin: '#f0c19a', hair: '#111' },
      good: 'She takes it without a word, steps into the phone booth and dials. Your money\'s under the phone.', bad: 'The phone in the booth rings. It\'s for you. It\'s expensive.' },
    { what: 'a rolled newspaper with no news in it', contact: 'The newsstand kid', where: 'at the newsstand on Main Street', map: 'town', at: [23, 16], look: { shirt: '#f39c12', pants: '#2c3e50', skin: '#c68863', hair: '#3a2a1e', hat: true },
      good: 'The kid swaps it for an identical paper with your money in it. Smooth.', bad: 'The kid\'s mum runs the stand today. She knows what that paper is. So does her purse, now.' },
    { what: 'a bag of bread for the ducks', contact: 'An old man by the duck pond', where: 'in Lucky Park', map: 'town', at: [19, 38], look: { shirt: '#6d4c41', pants: '#3e2723', skin: '#f0c19a', hair: '#eee', hat: true },
      good: 'He feeds the ducks one slice and puts the rest, and what was under it, in his coat.', bad: 'A duck takes the bag. You have to buy it back from a park keeper who saw everything.' },
    { what: 'a set of motel keys', contact: 'A trucker by the motel sign', where: 'outside the Starlite Motel', map: 'town', at: [4, 30], look: { shirt: '#2980b9', pants: '#34495e', skin: '#e0ac69', hair: '#7a4a1e', hat: true },
      good: 'He tosses you a roll of bills and climbs back into his cab.', bad: 'The keys are for the wrong room. Darlene charges for the door he kicks in.' },
    { what: 'a pair of opera tickets', contact: 'A valet off duty', where: 'on the Strip, by the Monte Royale', map: 'town', at: [41, 17], look: { shirt: '#c9a14a', vest: '#1d1a14', pants: '#111', skin: '#8d5524', hair: '#111' },
      good: 'He smiles, slips the tickets in his jacket and pays in crisp Monte Royale cash.', bad: 'Kessler\'s doorman watches the whole thing. Your name is in a book now, and it cost you to get it out.' },
  ];
  const BIG = [
    { what: 'a briefcase', contact: 'A man in a long coat', where: 'down on the dock', map: 'town', at: [46, 23], look: { shirt: '#1d1d1d', pants: '#1d1d1d', skin: '#f0c19a', hair: '#333', hat: true },
      good: 'Nobody follows you. Nobody is ever there. Vinnie counts it twice.', bad: 'Kessler\'s men were waiting at the dock. You get away. The money doesn\'t.' },
    { what: 'a set of car keys', contact: 'A driver who doesn\'t give a name', where: 'by the dusty sedan on the east side', map: 'town', at: [43, 27], look: { shirt: '#34495e', pants: '#1d1d1d', skin: '#8d5524', hair: '#111', shades: true },
      good: 'He takes the keys and drives off without checking the mirrors. You get paid.', bad: 'The sedan has a broken tail light and a cop behind it before it\'s left the kerb. It costs you to walk away.' },
    { what: 'a locked document case', contact: 'A man on the far park bench', where: 'in Lucky Park', map: 'town', at: [20, 38], look: { shirt: '#2c3e50', pants: '#1d1d1d', skin: '#f0c19a', hair: '#bbb', glasses: true },
      good: 'He opens it on his knee, reads one page, closes it, and hands you more money than you\'ve ever held in a park.', bad: 'The bench is empty. The man is behind you. He takes the case and leaves you a bruise and a bill.' },
    { what: 'a sports bag that clinks', contact: 'Two men in the alley', where: 'behind the Quik-Stop', map: 'town', at: [24, 13], look: { shirt: '#1d1d1d', pants: '#1d1d1d', skin: '#c68863', hair: '#111', shades: true },
      good: 'One counts, one watches the street. Then they\'re gone, and you\'re richer.', bad: 'A squad car turns into the alley. Everybody runs. You run slowest, and it costs you.' },
  ];
  const WINE = [
    { what: 'a case of the 2005', contact: 'Margot\'s assistant', where: 'at the Gilded Palace', map: 'v:palace', at: [6, 13], look: { shirt: '#f4f4f4', vest: '#5e1430', pants: '#111', skin: '#f0c19a', hair: '#3a2a1e' },
      good: 'She signs for it without looking up, and tips like a duchess.', bad: 'A bottle breaks on the Palace steps. The doorman charges for the smell. Philippe charges for the bottle.' },
    { what: 'six bottles of the \'96', contact: 'Mr. Pemberton\'s butler', where: 'at the Grand Hotel', map: 'r:grand', at: [13, 6], look: { shirt: '#111', vest: '#111', pants: '#111', skin: '#e0ac69', hair: '#bbb', bow: true },
      good: 'He takes them up in the lift personally and comes back with an envelope he pretends not to have.', bad: 'The penthouse guest was expecting champagne. He makes his disappointment financial.' },
    { what: 'a bottle of "cooking sherry" that is nothing of the kind', contact: 'Mel\'s cook', where: 'at Mel\'s Diner', map: 'r:diner', at: [4, 7], look: { shirt: '#f4f4f4', pants: '#2d3436', skin: '#c68863', hair: '#111' },
      good: 'He pours a thimble into the gravy and the rest into a teacup. Pays in cash and pie.', bad: 'Mel finds it. Mel does not hold with wine in her kitchen. You pay for her principles.' },
    { what: 'a bottle of champagne on ice', contact: 'A couple celebrating', where: 'on the Riverboat', map: 'v:riverboat', at: [10, 6], look: { shirt: '#f4f4f4', vest: '#c9a14a', pants: '#111', skin: '#8d5524', hair: '#111', bow: true },
      good: 'They pop it before you\'re out of earshot. The tip is very generous and slightly damp.', bad: 'The ice melted, the label slid off, and the groom thinks you\'re a fraud. You refund him.' },
    { what: 'a magnum for a party upstairs', contact: 'The doorman', where: 'at the Downtown Apartments', map: 'r:apts', at: [6, 7], look: { shirt: '#2c3e50', pants: '#2c3e50', skin: '#f0c19a', hair: '#555', hat: true },
      good: 'He carries it up himself, like a baby. Philippe\'s envelope is waiting with him.', bad: 'The party was last night. The host is not in the mood, and you pay to make the magnum go away.' },
  ];
  // the errand in hand, if any (it lapses when the day ends)
  function job() {
    const o = st(), j = o.job; if (!j) return null;
    if (j.day !== App.state.day) { o.job = null; o.lapsed = j; App.save(); return null; }
    return j;
  }
  const label = j => `💼 ${j.what} → ${j.contact}, ${j.where}`;
  const lc = c => /^(A|The) /.test(c) ? c.charAt(0).toLowerCase() + c.slice(1) : c; // 'a man in a grey suit', but 'Tex\'s cousin Earl'
  // whoever gave you the errand mentions it the next time you see them
  async function lapsed(by = 'vinnie') {
    const o = st(), j = o.lapsed; if (!j || (j.from === 'philippe') !== (by === 'philippe')) return; o.lapsed = null; App.save();
    if (typeof Mood !== 'undefined') Mood.change(-2, 'a no-show');
    if (j.from === 'philippe') return say([{ who: 'philippe', text: `${j.contact} waited ${j.where} all evening, monsieur. *He takes ${j.what} back without a word, which is worse than any word.*` }]);
    await say([{ who: 'vinnie', text: `${j.contact} waited ${j.where} all day. You never showed. *He takes ${j.what} back.* Don't make me look stupid twice.` }]);
  }
  async function offer({ from, list, pay, risk }) {
    const why = busy(); if (why) { UI.toast(why, 'warn'); return false; }
    const open = list.filter(r => r.map === 'town' || ((!r.map.startsWith('v:') || !Career.venueOpen || Career.venueOpen(r.map.slice(2))) && (!World.openNow || World.openNow(r.map.slice(2))))); // only somewhere you can get into right now
    const r = RNG.pick(open.length ? open : list.filter(r => r.map === 'town'));
    const c = await UI.modal({ title: '💼 An errand', body: h('div', h('p', `"Take ${r.what} to ${lc(r.contact)}, ${r.where}. Today. Don't open anything."`), h('p.muted.small', `About ${fmt(pay)} on delivery · ${risk > .25 ? 'risky' : risk > .15 ? 'usually fine' : 'safe enough'}`)),
      buttons: [{ label: 'Not now', value: false, cls: 'ghost' }, { label: 'Take it', value: true, cls: 'primary' }] });
    if (!c) return false;
    st().job = { ...r, from, pay, risk, day: App.state.day }; App.save();
    UI.toast(label(st().job), 'big', 'Find them before the day is out. They\'ll have a 💼 over their head.');
    if (World.refreshGoal) World.refreshGoal();
    return true;
  }
  // walking up to the contact: hand it over
  async function handOver() {
    const o = st(), j = job(); if (!j) return;
    spend(.5); o.job = null;
    if (RNG.chance(1 - j.risk)) {
      App.credit(j.pay); App.count('errandsDone'); SFX.cash();
      if (j.from === 'vinnie') o.errands++;
      await say([{ who: 'narrator', text: `You hand ${lc(j.contact)} ${j.what}. ${j.good}` }, { who: 'narrator', text: j.from === 'philippe' ? `${fmt(j.pay)}, in Philippe's envelope.` : `${fmt(j.pay)}, Vinnie's cut already taken.` }]);
    } else {
      const lost = r2(Math.min(App.state.bank * .12, 400 + 800 * ch())); App.state.bank = Math.max(0, r2(App.state.bank - lost)); App.count('errandsBad'); if (typeof Mood !== 'undefined') Mood.change(-4, 'an errand gone wrong'); SFX.lose();
      await say([{ who: 'narrator', text: j.bad }, { who: 'narrator', text: lost ? `It costs you ${fmt(lost)}.` : 'You get out with nothing but a story.' }]);
    }
    App.save(); Router.hud(); Career.checkAchievements(); if (World.refreshGoal) World.refreshGoal();
    if (j.from === 'vinnie' && !o.key && o.errands >= KEY_AT) {
      o.key = App.state.day; App.count('officeKey'); App.save(); Career.checkAchievements();
      await say([{ who: 'narrator', text: 'Back at the pawn shop, Vinnie slides a key across the counter on a ring with a tiny brass horse.' }, { who: 'vinnie', text: 'The back office. You\'ve earned a chair in there. Don\'t sit in mine.' },
        { who: 'narrator', text: '🗝️ Vinnie\'s back office is open to you now: the door behind the counter.' }]);
    }
  }
  // a free tile for the contact to stand on, near where they like to be
  function spotIn(m, at) {
    const seen = new Set(), q = [at];
    while (q.length) {
      const [x, y] = q.shift(), k = x + ',' + y; if (seen.has(k)) continue; seen.add(k);
      if (x < 1 || y < 2 || x >= m.w - 1 || y >= m.h - 1 || seen.size > 400) continue;
      if (!m.solid(x, y) && !m.acts[k] && !m.doors[k] && !(m.npcs || []).some(n => !n.errand && n.x === x && n.y === y)) return [x, y];
      q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return at;
  }
  // Vinnie, in the shop: two a day; the fifth delivered earns the key
  async function vinnieErrand() {
    await lapsed();
    const o = st(), d = App.state.day, j = job();
    if (o.errandDay !== d) { o.errandDay = d; o.errandsToday = 0; }
    if (j) return say([{ who: 'vinnie', text: `Why are you still here? ${j.contact} is waiting ${j.where}.` }]);
    if (iced()) return say([{ who: 'vinnie', text: 'Somebody\'s been in my safe. Until I know who, nobody works for me. Nobody.' }]);
    if (o.errandsToday >= 2) return say([{ who: 'vinnie', text: 'Two\'s plenty. Come back tomorrow. People notice a face that keeps coming back.' }]);
    if (await offer({ from: 'vinnie', list: RUNS, pay: Math.round((250 + 450 * ch()) * (1 + RNG.float() * .6)), risk: .22 })) { o.errandsToday++; App.save(); }
  }

  /* ---------- the back office: a secret room ---------- */
  async function door() {
    const o = st();
    if (o.key) return World.enter('r:office');
    return say([{ who: 'narrator', text: 'You knock. The door opens four inches and fills with Nico.' }, { who: 'nico', text: 'Sign says leave.' }, { who: 'narrator', text: 'The door closes.' }]);
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
    if (job()) return say([{ who: 'narrator', text: 'You\'ve already got something to deliver. One thing at a time.' }]);
    const done = await offer({ from: 'phone', list: BIG, pay: Math.round((1200 + 2000 * ch()) * (1 + RNG.float() * .5)), risk: .3 });
    if (done) { o.phoneDay = App.state.day; App.count('officePhone'); App.save(); }
  }

  /* ---------- Prime Cut's wine cellar ---------- */
  async function cellarDoor() {
    const o = st();
    if (o.cellar) return World.enter('r:cellar');
    // a regular: dinner here on three different days (no amount of money will do it)
    const evenings = Object.keys(App.state.flags.steakDays || {}).length;
    if (evenings >= 3) {
      o.cellar = App.state.day; App.count('cellarOpen'); App.save(); Career.checkAchievements();
      await say([{ who: 'philippe', text: 'Three evenings, monsieur, and not once did you ask for ketchup. *He produces a key the size of a spoon.* The cellar. Touch nothing with a year on it before 1990.' }]);
      return World.enter('r:cellar');
    }
    return say([{ who: 'philippe', text: RNG.pick(['*He steps, very politely, between you and the door.* The cellar is for our regulars, monsieur.', 'Our regulars, monsieur. Only our regulars.', '*He does not look at the door, so neither should you.* May I bring monsieur the menu?']) }]);
  }
  // the tasting table: once a day, for a price, Philippe sets you right. A lift in mood, your needs topped up to a good
  // level, and light on your feet (faster walking and running) for three hours.
  const TASTING = 150, FLEET_MIN = 180;
  const nowMin = () => (App.state.day || 1) * 1440 + (App.state.clock || 0);
  const fleet = () => nowMin() < (App.state.flags.fleetUntil || 0);
  async function cellarGlass() {
    const f = App.state.flags;
    if (frosty()) return say([{ who: 'philippe', text: '*He doesn\'t pour.* The brick, monsieur. I counted.' }]);
    if (f.tastingDay === App.state.day) return say([{ who: 'philippe', text: 'One tasting a day, monsieur. Tomorrow there will be something else open.' }]);
    const c = await UI.modal({ title: '🍷 The tasting table', body: h('div', h('p', 'Five small glasses, a plate of bread and cheese, and Philippe explaining each one.'), h('p.muted.small', `${fmt(TASTING)} · lifts your mood, sets you up for the evening and puts a spring in your step`)),
      buttons: [{ label: 'Not now', value: false, cls: 'ghost' }, { label: `Sit down (${fmt(TASTING)})`, value: true, cls: 'primary', disabled: App.state.bank < TASTING }] });
    if (!c) return;
    if (!App.debit(TASTING)) return UI.toast(`The tasting is ${fmt(TASTING)}.`, 'warn');
    const s = App.state, good = 85;
    s.hunger = Math.max(s.hunger, good); s.thirst = Math.max(s.thirst, good);
    s.stamina = Math.max(s.stamina, Math.min(Career.energyCap ? Career.energyCap() : 100, good * (Career.energyMax ? Career.energyMax() : 100) / 100));
    if (typeof Mood !== 'undefined') { Mood.consume('wine', { drink: true }); Mood.change(12, 'a tasting at Prime Cut'); }
    f.tastingDay = s.day; f.fleetUntil = nowMin() + FLEET_MIN; App.count('tastings');
    SFX.cash && SFX.cash(); Router.hud(); App.save();
    UI.toast('🍷 Light on your feet for the next three hours', 'good');
    return say([{ who: 'philippe', text: RNG.pick(['A Burgundy for the soul, a Rioja for the legs, and a little Sauternes so you remember me fondly. Go, monsieur. The night is young.', 'Five glasses, five regions, one very good evening. You walk out of here like you own the place, which, for tonight, you might as well.']) }]);
  }
  /* ---------- more to do in Vinnie's back office ---------- */
  // Hi-Lo with Nico: a card, higher or lower, the pot grows with every right call. Cash out whenever. Three games a day.
  const CARD = r => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] || String(r));
  async function hiLo() {
    const f = App.state.flags; if (f.hiloDay !== App.state.day) { f.hiloDay = App.state.day; f.hiloGames = 0; }
    if (f.hiloGames >= 3) return say([{ who: 'nico', text: 'Three\'s enough. Vinnie says I get a headache when I lose.' }]);
    const stakes = [50, 100, 250].filter(n => n <= App.state.bank);
    if (!stakes.length) return say([{ who: 'nico', text: 'Fifty to sit down. You haven\'t got fifty.' }]);
    const stake = await UI.modal({ title: '🃏 Hi-Lo with Nico', body: h('div', h('p', 'Nico turns a card. You call the next one higher or lower. A tie goes to Nico.'), h('p.muted.small', 'Every right call grows the pot. Cash out whenever you like; five calls is the most he\'ll let you run.')),
      buttons: [{ label: 'Not now', value: null, cls: 'ghost' }, ...stakes.map(n => ({ label: fmt(n), value: n }))] });
    if (!stake || !App.debit(stake)) return;
    f.hiloGames++; App.save(); Router.hud();
    let card = 2 + RNG.int(13), pot = stake, calls = 0;
    for (;;) {
      const pUp = (14 - card) / 13, pDown = (card - 2) / 13, mUp = pUp > 0 ? .95 / pUp : 0, mDown = pDown > 0 ? .95 / pDown : 0;
      const pick = await UI.modal({ title: `🃏 ${CARD(card)} · pot ${fmt(pot)}`, closable: false, body: h('p', calls ? `${calls} right so far.` : 'Nico flips the first card.'),
        buttons: [{ label: `Cash out ${fmt(pot)}`, value: 'out', cls: 'ghost', disabled: !calls }, { label: `Higher (×${mUp.toFixed(2)})`, value: 'up', disabled: !pUp || calls >= 5 }, { label: `Lower (×${mDown.toFixed(2)})`, value: 'down', disabled: !pDown || calls >= 5 }] });
      if (pick === 'out' || calls >= 5) { App.credit(pot); App.count('hiloWins'); SFX.cash && SFX.cash(); App.save(); Router.hud(); Career.checkAchievements(); return say([{ who: 'nico', text: `${fmt(pot)}. *He counts it out slowly, like each one hurts.*` }]); }
      const next = 2 + RNG.int(13), right = pick === 'up' ? next > card : next < card;
      if (!right) { App.save(); return say([{ who: 'narrator', text: `${CARD(next)}. ${next === card ? 'A tie. Nico\'s.' : 'Wrong way.'}` }, { who: 'nico', text: RNG.pick(['House wins. Vinnie\'s house, anyway.', 'Unlucky. Same again?', '*He doesn\'t smile. He doesn\'t need to.*']) }]); }
      pot = r2(pot * (pick === 'up' ? mUp : mDown)); calls++; card = next;
    }
  }
  // Vinnie's book: today's races. Back a horse; the result comes in on the wire by tomorrow.
  const HORSES = [['Lucky Strike', .40], ['Gin Rummy', .27], ['Second Mortgage', .20], ['Seventeen Hands II', .13]];
  async function book() {
    const f = App.state.flags, b = f.vinBet;
    if (b && App.state.day > b.day) {
      f.vinBet = null; let r = RNG.float(), win = HORSES[HORSES.length - 1][0]; for (const [nm, p] of HORSES) { if (r < p) { win = nm; break; } r -= p; }
      const odds = .85 / HORSES.find(h2 => h2[0] === b.horse)[1], paid = win === b.horse ? r2(b.stake * odds) : 0;
      if (paid) { App.credit(paid); App.count('bookWins'); SFX.cash && SFX.cash(); }
      App.save(); Router.hud(); Career.checkAchievements();
      await say([{ who: 'narrator', text: `The wire came in overnight. ${win} by a length.` }, { who: 'vinnie', text: paid ? `${b.horse}. Don't get used to it. ${fmt(paid)}.` : `${b.horse} is still running, I hear. Better luck next time, kid.` }]);
    }
    if (f.vinBet) return say([{ who: 'vinnie', text: `${f.vinBet.horse}, ${fmt(f.vinBet.stake)}. They race tonight. Come back tomorrow.` }]);
    const horse = await UI.modal({ title: '📋 Vinnie\'s book', body: h('div', h('p', 'Tonight at Saratoga, chalked on the board in Vinnie\'s small, careful hand.'), h('p.muted.small', 'The result comes in on the wire overnight. Come back tomorrow to collect.')),
      buttons: [{ label: 'Not tonight', value: null, cls: 'ghost' }, ...HORSES.map(([nm, p]) => ({ label: `${nm} · ${(.85 / p).toFixed(1)} to 1`, value: nm }))] });
    if (!horse) return;
    const stakes = [50, 100, 250, 500].filter(n => n <= App.state.bank); if (!stakes.length) return UI.toast('Vinnie takes $50 or more.', 'warn');
    const stake = await UI.modal({ title: `📋 ${horse}`, body: h('p', 'How much?'), buttons: [{ label: 'Never mind', value: null, cls: 'ghost' }, ...stakes.map(n => ({ label: fmt(n), value: n }))] });
    if (!stake || !App.debit(stake)) return;
    f.vinBet = { day: App.state.day, horse, stake }; App.save(); Router.hud();
    return say([{ who: 'vinnie', text: `${horse}, ${fmt(stake)}. *He writes it in the book.* Tomorrow.` }]);
  }
  // the big safe: the code is somewhere in this room, if you look. What's inside is Vinnie's.
  const SAFE_CODE = '1979';
  async function safe() {
    const f = App.state.flags;
    if (f.safeOpen) return say([{ who: 'narrator', text: f.safeTook ? 'The safe. Lighter than it used to be. Vinnie checks it twice a day now.' : 'The safe, shut, exactly as you left it. You know what\'s in it. That\'s enough.' }]);
    if (f.safeTries === App.state.day) return say([{ who: 'narrator', text: 'Nico is in the doorway, watching you look at the safe. Not today.' }]);
    const input = h('input.field', { maxlength: 4, inputmode: 'numeric', placeholder: '· · · ·', autocomplete: 'off' });
    const c = await UI.modal({ title: '🔒 The big safe', body: h('div', h('p', 'Four dials. Vinnie is out front, on the phone.'), input), buttons: [{ label: 'Leave it', value: false, cls: 'ghost' }, { label: 'Try it', value: true, cls: 'primary' }] });
    if (!c) return;
    if (input.value.trim() !== SAFE_CODE) { f.wrongSafe = (f.wrongSafe || 0) + 1; if (f.wrongSafe % 3 === 0) f.safeTries = App.state.day; App.save(); return say([{ who: 'narrator', text: 'Nothing. The dials spin back to zero with a little click that sounds very loud.' }]); }
    f.safeOpen = App.state.day; App.count('officeSafe'); Career.checkAchievements();
    await say([{ who: 'narrator', text: 'Click. Inside: a stack of old bills, and a yellowed betting slip. "Seventeen Hands, Saratoga, 1979. $1,000 to win." He never cashed it in. There was nothing to cash.' }]);
    const t = await UI.modal({ title: '🔒 The big safe', closable: false, body: h('p', 'About two thousand dollars, in old notes.'), buttons: [{ label: 'Close it', value: 'leave', cls: 'ghost' }, { label: 'Take the money', value: 'take', cls: 'primary' }] });
    if (t === 'take') { f.safeTook = App.state.day; App.credit(2000); App.save(); Router.hud(); return say([{ who: 'narrator', text: '$2,000 in your pocket. You spin the dials back. Your hands aren\'t quite steady.' }]); }
    App.save(); return say([{ who: 'narrator', text: 'You put the slip back on top of the money and close it. Some things are just a man\'s business.' }]);
  }
  const iced = () => { const t = App.state.flags.safeTook; return t && App.state.day > t && App.state.day - t <= 3; };
  // the humidor: one of Vinnie's cigars, once a day
  async function cigar() {
    const f = App.state.flags;
    if (f.cigarDay === App.state.day) return say([{ who: 'narrator', text: 'One a day. Vinnie counts them.' }]);
    if (App.state.bank < 30) return UI.toast('A cigar is $30. Vinnie counts those too.', 'warn');
    const c = await UI.modal({ title: '🚬 The humidor', body: h('p', 'Cedar-lined, and better stocked than the shop. $30 in the jar on the shelf.'), buttons: [{ label: 'Leave them', value: false, cls: 'ghost' }, { label: 'Take one ($30)', value: true, cls: 'primary' }] });
    if (!c || !App.debit(30)) return;
    f.cigarDay = App.state.day; if (typeof Mood !== 'undefined') Mood.change(5, 'one of Vinnie\'s cigars'); App.save(); Router.hud();
    return say([{ who: 'narrator', text: RNG.pick(['You sit in Vinnie\'s chair for exactly as long as it takes to smoke it. Nobody says anything.', 'Nico lights it for you without being asked, which is the nicest thing he\'s ever done.']) }]);
  }

  /* ---------- more to do in the cellar ---------- */
  // blind tasting: Philippe pours, gives you three clues, you name the region. Once a day, $25 a go.
  const BLIND = [
    ['Inky purple. Blackcurrant, cedar, a little pencil shaving. Firm, and in no hurry.', 'Bordeaux', ['Rioja', 'Barossa']],
    ['Pale ruby, almost see-through. Cherries and wet leaves. It whispers.', 'Burgundy', ['Chianti', 'Napa']],
    ['Deep and dark. Vanilla, dill, old leather. American oak, if monsieur is paying attention.', 'Rioja', ['Bordeaux', 'Burgundy']],
    ['Golden. Honey, apricot, a hint of marmalade. Sweet, but it doesn\'t cloy.', 'Sauternes', ['Champagne', 'Mosel']],
    ['Tiny bubbles, toast, green apple, something like brioche.', 'Champagne', ['Sauternes', 'Mosel']],
    ['Black as ink and twice as loud. Plums, pepper, a eucalyptus breeze.', 'Barossa', ['Rioja', 'Burgundy']],
    ['Sour cherry, tomato leaf, a dry finish that wants pasta.', 'Chianti', ['Burgundy', 'Rioja']],
    ['Pale gold, low alcohol. Lime, slate, a whiff of petrol in a good way.', 'Mosel', ['Champagne', 'Sauternes']],
  ];
  const BLIND_STAKE = 25, BLIND_WIN = 100;
  const frosty = () => { const t = App.state.flags.brickTook; return t && App.state.day - t < 3; };
  async function blindTasting() {
    const f = App.state.flags;
    if (frosty()) return say([{ who: 'philippe', text: '*He doesn\'t pour.* The brick, monsieur. I counted.' }]);
    if (f.blindDay === App.state.day) return say([{ who: 'philippe', text: 'Your palate has had enough excitement for one day.' }]);
    const [nose, answer, wrong] = RNG.pick(BLIND), opts = RNG.shuffle ? RNG.shuffle([answer, ...wrong]) : [answer, ...wrong].sort(() => Math.random() - .5);
    const go = await UI.modal({ title: '🍷 Blind tasting', body: h('div', h('p', 'Philippe pours from a bottle wrapped in a napkin.'), h('p', `"${nose}"`), h('p.muted.small', `${fmt(BLIND_STAKE)} to play · name it and win ${fmt(BLIND_WIN)}`)),
      buttons: [{ label: 'Not today', value: null, cls: 'ghost' }, ...opts.map(o => ({ label: o, value: o, disabled: App.state.bank < BLIND_STAKE }))] });
    if (!go) return;
    if (!App.debit(BLIND_STAKE)) return;
    f.blindDay = App.state.day;
    if (go === answer) {
      App.credit(BLIND_WIN); App.count('blindRight'); SFX.cash && SFX.cash(); if (typeof Mood !== 'undefined') Mood.change(3, 'a good nose');
      await say([{ who: 'philippe', text: RNG.pick([`${answer}. *He unwraps the napkin.* Monsieur has a nose. ${fmt(BLIND_WIN)}.`, `*A very small bow.* ${answer}, exactly. I may have to stop liking you.`]) }]);
    } else await say([{ who: 'philippe', text: `${answer}, monsieur. *He unwraps the napkin, slowly.* ${go}? I will pretend I did not hear that.` }]);
    App.save(); Router.hud(); Career.checkAchievements();
  }
  // the investment rack: put a case down, let it age, sell it back to Philippe. Some cases go corked.
  async function invest() {
    const f = App.state.flags, k = f.wineCase, price = 400 + 400 * ch();
    if (!k) {
      const c = await UI.modal({ title: '🍾 The investment rack', body: h('div', h('p', 'Philippe lays down cases for people who can wait. He\'ll buy them back when you can\'t.'), h('p.muted.small', `A case is ${fmt(price)} today. It gains a little every day it rests. Every now and then one turns.`)),
        buttons: [{ label: 'Not now', value: false, cls: 'ghost' }, { label: `Lay down a case (${fmt(price)})`, value: true, cls: 'primary', disabled: App.state.bank < price }] });
      if (!c || !App.debit(price)) return;
      f.wineCase = { paid: price, day: App.state.day, rate: .03 + RNG.float() * .05 }; App.save(); Router.hud();
      return say([{ who: 'philippe', text: 'Your name on the label, monsieur. Patience is the only ingredient you supply.' }]);
    }
    const days = App.state.day - k.day, value = r2(k.paid * Math.min(2.5, 1 + k.rate * days));
    const c = await UI.modal({ title: '🍾 Your case', body: h('div', h('p', `Laid down ${days ? `${days} day${days === 1 ? '' : 's'} ago` : 'today'} for ${fmt(k.paid)}.`), h('p', `Philippe would give you ${fmt(value)} for it today.`)),
      buttons: [{ label: 'Let it rest', value: false, cls: 'ghost' }, { label: `Sell it back (${fmt(value)})`, value: true, cls: 'primary' }] });
    if (!c) return;
    f.wineCase = null;
    if (days >= 1 && RNG.chance(.12)) {
      const v = r2(value * .4); App.credit(v); App.save(); Router.hud();
      return say([{ who: 'philippe', text: `*He pulls a cork and sniffs it, and his face falls.* Corked. Wet cardboard. I can give you ${fmt(v)} for the rest, and my condolences.` }]);
    }
    App.credit(value); if (value >= k.paid * 1.5) App.count('cellarInvest'); SFX.cash && SFX.cash(); App.save(); Router.hud(); Career.checkAchievements();
    return say([{ who: 'philippe', text: value > k.paid ? `${fmt(value)}. The wine did the work; you did the waiting. A partnership.` : `${fmt(value)}. You did not wait very long, monsieur. Neither did the wine.` }]);
  }
  // the gramophone: a record, a better mood, once a day
  const RECORDS = ['Édith Piaf, "La Vie en rose"', 'Django Reinhardt, "Minor Swing"', 'Billie Holiday, "The Very Thought of You"', 'Chet Baker, "My Funny Valentine"', 'Sal\'s own 78 of "Seventeen", which Philippe says he has never heard of'];
  async function gramophone() {
    const f = App.state.flags;
    if (f.gramDay === App.state.day) return say([{ who: 'narrator', text: 'The record is still turning, crackling gently. Philippe hums along when he thinks nobody can hear.' }]);
    f.gramDay = App.state.day; if (typeof Mood !== 'undefined') Mood.change(5, 'a record in the cellar'); App.save(); Router.hud();
    return say([{ who: 'narrator', text: `You wind the handle and drop the needle: ${RNG.pick(RECORDS)}. For three minutes, nothing in the world is owed to anyone.` }]);
  }
  // a loose brick in the wall, with something behind it. Take it, or put it back.
  async function brick() {
    const f = App.state.flags;
    if (f.brickTook || f.brickLeft) return say([{ who: 'narrator', text: f.brickTook ? 'The brick sits a little proud of the wall now. Anyone who looks would know.' : 'The brick, back where it was. Nobody will ever know you looked. You will.' }]);
    await say([{ who: 'narrator', text: 'One brick is loose. Behind it, a tobacco tin, and in the tin a roll of old banknotes and a cork with "P. — for a rainy day" written on it.' }]);
    const c = await UI.modal({ title: 'A loose brick', body: h('p', 'About three hundred dollars, by the feel of it. Philippe\'s rainy-day money.'), buttons: [{ label: 'Put it back', value: 'back', cls: 'ghost' }, { label: 'Take it', value: 'take', cls: 'primary' }], closable: false });
    if (c === 'take') { f.brickTook = App.state.day; App.credit(300); App.save(); Router.hud(); return say([{ who: 'narrator', text: '$300 in your pocket. The brick doesn\'t go back quite flush.' }]); }
    f.brickLeft = App.state.day; if (typeof Mood !== 'undefined') Mood.change(3, 'the right thing'); App.count('brickHonest'); App.save(); Career.checkAchievements();
    return say([{ who: 'narrator', text: 'You put the tin back and the brick after it, exactly as it was.' }]);
  }

  async function delivery() {
    const o = st();
    if (o.deliveryDay === App.state.day) return say([{ who: 'philippe', text: 'One delivery a day, monsieur. The wine needs its rest. So do I.' }]);
    await lapsed('philippe');
    const j = job(); if (j) return say([{ who: 'philippe', text: j.from === 'philippe' ? `${j.contact} is still waiting ${j.where}, monsieur. The wine does not improve in your hands.` : 'Monsieur is already carrying something for someone. One thing at a time.' }]);
    const done = await offer({ from: 'philippe', list: WINE, pay: Math.round((180 + 300 * ch()) * (1 + RNG.float() * .4)), risk: .12 });
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
      h('p', `${r.name}: ${r.hours} hours, ${fmt(pay)}${r.tips ? ' + tips' : ''}.`),
      h('p.muted.small', nx ? `${nx.at - o.shifts} more shift${nx.at - o.shifts === 1 ? '' : 's'} to ${nx.name}. Two a day.` : 'You run the place at night. Two shifts a day.')),
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
  // the Spur Ladder: four challenges chalked on the board by the table
  const LADDER = [
    { title: 'The Ladder', desc: 'Beat Hank, Lola and Moose.', pay: 300, count: 'spurLadder',
      prog: q => `${['Hank the trucker', 'Lola', 'Moose'].filter(n => q.beat[n]).length} of 3`, done: q => ['Hank the trucker', 'Lola', 'Moose'].every(n => q.beat[n]),
      paid: 'Dolores reaches under the bar and comes up with a cue in a battered case. "Sal\'s. Straightest stick in town. Your hands stay steady with it, even after a drink." And $300 off the ladder.' },
    { title: 'Clean Sheet', desc: 'Win a game without a foul, and win one with your opponent still on 5 or more balls.', pay: 750,
      prog: q => `${(q.clean ? 1 : 0) + (q.white ? 1 : 0)} of 2`, done: q => q.clean && q.white,
      paid: 'Lola chalks your name above hers on the board. "Don\'t get used to it." $750 from the regulars\' kitty.' },
    { title: 'Dutch\'s Grudge', ch: 1, desc: 'Beat Dutch twice.', pay: 1500,
      prog: q => `${Math.min(2, q.dutch || 0)} of 2`, done: q => (q.dutch || 0) >= 2,
      paid: 'Dutch puts $1,500 on the rail and his hat on top of it. "I don\'t lose. I\'m going to need a new line."' },
    { title: 'The Professor\'s Lesson', ch: 2, desc: 'Beat The Professor without a foul.', pay: 5000, count: 'spurPoolChamp',
      prog: q => q.prof ? 'done' : 'not yet', done: q => !!q.prof,
      paid: 'The Professor shakes your hand. "Geometry with consequences. The consequence is $5,000." Your name goes at the top of the board, in Sal\'s old spot.' },
  ];
  const ladder = () => { const o = st(); if (!o.poolQ) o.poolQ = { stage: 0, beat: {} }; return o.poolQ; };
  function ladderCard() {
    const q = ladder(), L = LADDER[q.stage];
    if (!L) return h('div.job-card', h('b', '🎱 The Spur Ladder'), h('p.muted.small', 'Top of the board. Nobody\'s left to beat.'));
    const locked = (L.ch || 0) > ch();
    return h('div.job-card', h('b', `🎱 Ladder ${q.stage + 1} of ${LADDER.length}: ${L.title}`), h('p.small', L.desc), h('p.muted.small', locked ? 'Not here yet. Come back later in the story.' : `${L.prog(q)} · ${fmt(L.pay)}`));
  }
  async function ladderAfter(s, res) {
    const q = ladder(), L = LADDER[q.stage], g = L2Pub.last || {};
    if (!L || (L.ch || 0) > ch() || res !== 'win') return;
    if (q.stage === 0) q.beat[s.name] = (q.beat[s.name] || 0) + 1;
    if (q.stage === 1) { if (!g.fouls) q.clean = 1; if (g.hisLeft >= 5) q.white = 1; }
    if (q.stage === 2 && s.name === 'Dutch') q.dutch = (q.dutch || 0) + 1;
    if (q.stage === 3 && s.name === 'The Professor' && !g.fouls) q.prof = 1;
    if (!L.done(q)) return;
    q.stage++; App.credit(L.pay); if (L.count) App.count(L.count); if (q.stage === 1) App.state.flags.salCue = App.state.day;
    App.save(); Router.hud(); Career.checkAchievements(); SFX.big();
    await say([{ who: 'dolores', text: L.paid }]);
  }
  async function pool() {
    const why = busy(); if (why) return UI.toast(why, 'warn');
    const opts = SHARKS.filter(s => (s.ch || 0) <= ch());
    const pick = await UI.modal({ title: '🎱 The pool table', body: h('div', h('p.muted.small', 'Reds and yellows, black last. Pick your opponent.'), ladderCard()),
      buttons: [{ label: 'Not now', value: null, cls: 'ghost' }, ...opts.map((s, i) => ({ label: `${s.name} · ${fmt(s.stake)}`, value: i, disabled: App.state.bank < s.stake }))] });
    if (pick == null) return;
    const s = opts[pick];
    await say([{ who: 'narrator', text: `${s.name}: "${s.line}"` }]);
    if (!App.debit(s.stake)) return UI.toast('Not enough cash for the stake.', 'warn');
    App.count('spurPool'); Router.hud();
    const res = await L2Pub.table({ first: s.name.split(' ')[0], n: s.stake, cash: () => fmt(App.state.bank), shaky: () => (App.state.flags.salCue ? 0 : typeof Mood !== 'undefined' && Mood.st().buzz > 45 ? .5 : 0), freeze: on => World.freeze && World.freeze(on), err: s.err });
    spend(.75);
    if (res === 'win') { App.credit(s.stake * 2); App.count('spurPoolWin'); SFX.big(); Career.checkAchievements(); }
    App.save(); Router.hud();
    if (res === 'win') { await say([{ who: 'narrator', text: `${s.name} pays up. ${RNG.pick(['"Again tomorrow. I want my money back."', '"Lucky. Nobody\'s that good."', 'Dolores slides you a beer on the house.'])}` }]); return ladderAfter(s, res); }
    return say([{ who: 'narrator', text: res === 'win' ? `${s.name} pays up. ${RNG.pick(['"Again tomorrow. I want my money back."', '"Lucky. Nobody\'s that good."', 'Dolores slides you a beer on the house.'])}` : res ? `${s.name} pockets your ${fmt(s.stake)}. "Rack 'em again whenever you like."` : 'You lay your cue down. It counts as a loss.' }]);
  }

  return { vinnieErrand, door, ledger, phone, cellarDoor, cellarGlass, delivery, spurBoard, pool, rank, RANKS, SHARKS, LADDER, ladder, st, KEY_AT, job, handOver, spotIn, lapsed, label, RUNS, BIG, WINE, fleet, TASTING, blindTasting, invest, gramophone, brick, BLIND, hiLo, book, safe, cigar, HORSES, SAFE_CODE };
})();
