/* Level 2's money. In the dream, money was the whole game: a debt to pay off, a ladder of casinos.
   Awake, it's what it really is: what you need to get through the night. You wake with $2,400, and
   the casino is still the only place in the city where it can turn into more.
   - Kit, at Sully's Pawn & Hardware on Harbour Road: a torch (light in the dark, which slows the
     Barman and helps you outlast it; batteries run down), running shoes (run faster), a raincoat
     (the rain stops wearing you out). Dr. Okafor can prescribe naltrexone (the craving comes slower),
     but your insurance lapsed while you slept, so the clinic pharmacy wants paying.
   - Things worth buying back: your wedding ring, pawned in the week after the funeral and kept for
     you by Sully ever since, and a headstone for Eddie Marsh, buried under a number at Greenhill.
   - Meridian Rewards: tonight's promotions on the casino floor pay cash bounties for the tables and
     floor games. Claim them at the Rewards desk.
   - A cab costs money and gets you across the city, even with something behind you.
   - Losing hurts more awake: walk away from a table down hard and the craving comes up like a wave.
     Broke? Rosie needs someone to wash up, and the cage will advance $5,000 against your cheque. */
const L2Money = (() => {
  const S = () => { const s = L2.state; if (!s.money) s.money = { kit: {}, battery: 0, promos: {}, washed: 0 }; return s.money; };
  const cash = () => L2.state.cash;
  const owns = k => !!S().kit[k];
  const pay = n => { if (cash() < n) { L2.toast(`Not enough money. You have ${fmt(cash())}.`); return false; } L2.state.cash = Math.round((cash() - n) * 100) / 100; L2.hud(); App.save(); return true; };
  const earn = n => { L2.state.cash = Math.round((cash() + n) * 100) / 100; L2.hud(); App.save(); };
  const say = (...a) => L2.ui.say(...a), choose = (...a) => L2.ui.choose(...a);

  /* ---------- kit ---------- */
  const KIT = {
    torch: { icon: '🔦', name: 'A torch', price: 120, desc: 'Your own light, wherever you go. The Barman slows in it, and you only have to outlast it for 20 seconds, not 30. Batteries run down (faster while it hunts you).' },
    shoes: { icon: '👟', name: 'Running shoes', price: 220, desc: 'Somebody\'s, barely worn. You run a quarter faster.' },
    coat: { icon: '🧥', name: 'A raincoat', price: 160, desc: 'Out in the rain without one, your energy drains half as fast again.' },
  };
  const BATTERY = 15, MEDS = 300, RING = 9500, STONE = 4500, ADVANCE = 5000;
  const torchOn = () => owns('torch') && S().battery > 0;
  // what the torch gives the engine: a wide cone of white light round you, flickering when it's low
  const lamp = () => torchOn() ? { r: 5.8, i: S().battery < 15 && Math.random() < .2 ? .3 : .95, color: '#fff4d8' } : null;
  // called once a second by the bottle's clock
  function tick(hunting) {
    if (!torchOn()) return;
    const dark = R3.map && (R3.map.info.dark || 0) >= .4;
    if (!dark && !hunting) return;
    const m = S(), was = m.battery; m.battery = Math.max(0, m.battery - (hunting ? 1.6 : .12));
    if (was >= 15 && m.battery < 15) L2.toast('🔦 The torch is going yellow. Batteries at the Kwik Mart or Sully\'s.');
    if (was > 0 && m.battery <= 0) L2.toast('🔦 The torch dies. The dark comes back in.');
  }
  // the rain soaks you without a coat
  const soak = () => (R3.map && R3.map.info.rain && !owns('coat')) ? 1.5 : 1;
  const runBoost = () => owns('shoes') ? 1.25 : 1;
  const craveMul = () => (S().meds ? .6 : 1) * (S().ring ? .85 : 1);

  /* ---------- Sully's Pawn & Hardware ---------- */
  async function sully() {
    const m = S();
    if (!L2.has('metSully')) {
      L2.set('metSully');
      await say([{ name: 'Sully', who: 'x', text: '*An old man in a cardigan looks up from a radio he\'s taking apart.* Well. I wondered if I\'d see you again.' },
        { name: 'Sully', who: 'x', text: 'You came in here two days after the funeral. Wanted forty dollars for your wedding ring. I gave you sixty, and I never put it in the window.' },
        { name: 'Sully', who: 'x', text: 'It\'s past the redemption date by ten months, so legally it\'s mine, and I\'ve had offers. But it\'s yours if you can pay what it\'s worth. I\'m not a charity. I\'m not a monster either.' }]);
    }
    for (;;) {
      const opts = [];
      for (const k in KIT) if (!owns(k)) opts.push([k, `${KIT[k].icon} ${KIT[k].name} (${fmt(KIT[k].price)})`]);
      if (owns('torch')) opts.push(['battery', `🔋 Batteries (${fmt(BATTERY)})`]);
      if (!m.ring) opts.push(['ring', `💍 Your wedding ring (${fmt(RING)})`]);
      opts.push(['sell', '🎲 What do you buy?'], ['bye', 'Leave']);
      const c = await choose(`Sully's Pawn & Hardware. ${fmt(cash())} in your wallet.`, opts);
      if (c === 'bye' || c == null) return;
      if (c === 'sell') { await say([{ name: 'Sully', who: 'x', text: 'Gold, watches, guitars. Not that. *He nods at your hands.* I don\'t buy shakes. And not your phone either, you\'ll need it tonight.' }]); continue; }
      if (c === 'battery') { if (pay(BATTERY)) { m.battery = 100; L2.toast('🔋 Fresh batteries. The torch throws a hard white circle.'); } continue; }
      if (c === 'ring') { await ring(); continue; }
      const it = KIT[c]; if (!it) return;
      const yes = await choose(`${it.icon} ${it.name}, ${fmt(it.price)}. ${it.desc}`, [['buy', `Buy it (${fmt(it.price)})`], ['no', 'Not now']]);
      if (yes !== 'buy' || !pay(it.price)) continue;
      m.kit[c] = 1; if (c === 'torch') m.battery = 100;
      App.count('l2_kit'); L2.toast(`${it.icon} ${it.name}: yours.`); Career.checkAchievements(); App.save();
      if (c === 'torch') await say([{ name: 'Sully', who: 'x', text: 'Good one, that. Police issue, near enough. Whatever you\'re scared of out there, it\'ll be smaller with the lights on.' }]);
    }
  }
  async function ring() {
    const m = S(); if (m.ring) return;
    await say([{ who: 'narr', text: '*He brings it out of the safe in a brown envelope with your name on it, in pencil. Plain gold. Nora had the inside engraved: "Eyes open. N." You\'d forgotten. You\'d made yourself forget.*' }]);
    const c = await choose(`${fmt(RING)} to have it back. You have ${fmt(cash())}.`, [['buy', `💍 Buy it back (${fmt(RING)})`], ['no', cash() < RING ? 'You haven\'t got it. Not yet.' : 'Not yet']]);
    if (c !== 'buy') return say([{ name: 'Sully', who: 'x', text: cash() < RING ? 'It\'s kept a year. It\'ll keep another night. The Meridian\'s still open, if you\'re feeling lucky. You used to be good, they say.' : 'It\'s not going anywhere.' }]);
    if (!pay(RING)) return;
    m.ring = 1; const d = L2Bottle.state; if (d.strikes) d.strikes--; App.count('l2_ring'); App.save();
    await say([{ who: 'narr', text: '*It goes back on like it never came off. There\'s a pale groove in your finger where it used to be. It fits the groove.*' }, { who: 'narr', text: '*The craving is still there. But there\'s something heavier on your hand now, and it\'s on your side.*' }]);
    L2.toast('💍 The ring. The craving comes a little slower now.'); Career.checkAchievements();
  }

  /* ---------- Eddie's headstone ---------- */
  async function eddieGrave() {
    const m = S();
    if (m.stone) return say([{ who: 'narr', text: '*EDWARD "EDDIE" MARSH. HE CALLED FOR HELP. Somebody has already left a can of cider on it, unopened, the way you\'d leave flowers.*' }]);
    await say([{ who: 'narr', text: '*No stone. A plastic marker on a stick, the number 417 printed on it, already fading. The council buries people with nobody under a number.*' }, { who: 'narr', text: '*He called for help. He was the only one who did.*' }]);
    const c = await choose(`A stone, cut and set, through the parish: ${fmt(STONE)}. You have ${fmt(cash())}.`, [['buy', `🪦 Pay for a headstone (${fmt(STONE)})`], ['no', 'Not yet']]);
    if (c !== 'buy' || !pay(STONE)) return;
    m.stone = 1; App.count('l2_stone'); App.save();
    await say([{ who: 'narr', text: '*You fill in the form at the chapel office in your own handwriting. Name: Edward Marsh. Inscription: HE CALLED FOR HELP.*' }, { who: 'narr', text: '*It doesn\'t fix anything. Some things you do anyway.*' }]);
    L2.toast('🪦 Eddie will have a name.'); Career.checkAchievements();
  }

  /* ---------- the clinic pharmacy ---------- */
  async function meds() {
    const m = S(); if (m.meds) return say([{ who: 'okafor', text: 'One a day, with food. It won\'t do the work for you. It makes the work possible.' }]);
    await say([{ who: 'okafor', text: 'There\'s a medication, naltrexone. It takes the edge off the wanting. It won\'t stop you if you decide to drink, but it can make the decision quieter.' }, { who: 'okafor', text: 'I\'ll write it. The trouble is, your insurance lapsed while you were with us. The pharmacy downstairs will want paying.' }]);
    const c = await choose(`Naltrexone, a month's supply: ${fmt(MEDS)}. You have ${fmt(cash())}.`, [['buy', `💊 Pay for it (${fmt(MEDS)})`], ['no', 'Not now']]);
    if (c !== 'buy' || !pay(MEDS)) return;
    m.meds = 1; App.count('l2_meds'); App.save(); L2.toast('💊 Naltrexone. The craving comes on slower.');
  }

  /* ---------- the cage: an advance against the cheque ---------- */
  async function advance() {
    await say([{ name: 'Cashier', who: 'x', text: 'I can\'t cash an insurance cheque at the cage, I\'m sorry. Not that size. That\'s the bank, and the bank wants five working days.' }, { name: 'Cashier', who: 'x', text: 'I can do an advance against it, if you like. Five thousand now. The house takes ten per cent when it clears.' }]);
    const c = await choose('An advance against the cheque?', [['no', 'Not here. Not for this.'], ['yes', `Take ${fmt(ADVANCE)}`]]);
    if (c !== 'yes') return say([{ who: 'you', text: 'Not tonight.' }, { who: 'narr', text: '*You put the envelope back. Ellie would have wanted a boat. Next summer.*' }]);
    L2.set('cashed'); earn(ADVANCE); App.count('l2_cashed');
    await say([{ name: 'Cashier', who: 'x', text: 'Five thousand. Would you like that in chips?' }, { who: 'narr', text: '*She counts it out. It doesn\'t feel like winning. Nothing ever will again.*' }]);
  }

  /* ---------- washing up at Rosie's ---------- */
  async function washUp() {
    const m = S();
    if (Date.now() - (m.washedAt || 0) < 120000) return say([{ name: 'Rosie', who: 'x', text: 'Sit down a minute, love, you\'ve only just finished. Have a coffee.' }]);
    await say([{ name: 'Rosie', who: 'x', text: 'Work? *She looks at you a long moment.* My pot washer walked out on Tuesday. Forty dollars and a bowl of soup for a sinkful. Don\'t break anything.' }]);
    const ok = await L2.ui.panel('The sink at Rosie\'s', done => {
      const plates = [], wrap = h('div.l2-sink'), left = h('p.l2-read', 'Scrub every plate till it shines: tap each one until it\'s clean.');
      let n = 8;
      for (let i = 0; i < 8; i++) {
        let dirt = 3; const p = h('button.l2-plate', { 'aria-label': 'Dirty plate', onclick: () => { if (!dirt) return; dirt--; p.style.setProperty('--dirt', dirt / 3); SFX.click && SFX.click(); if (!dirt) { p.classList.add('clean'); p.setAttribute('aria-label', 'Clean plate'); n--; left.textContent = n ? `${n} to go.` : 'Done. Rosie inspects one against the light and nods.'; if (!n) setTimeout(() => done(true), 600); } } });
        p.style.setProperty('--dirt', 1); plates.push(p); wrap.append(p);
      }
      return h('div', left, wrap);
    }, { closeLabel: 'Give up' });
    if (!ok) return;
    m.washedAt = Date.now(); m.washed++; earn(40); L2Bottle.feed({ hunger: 35, thirst: 10, energy: -12 }); App.count('l2_shift'); Career.checkAchievements();
    await say([{ name: 'Rosie', who: 'x', text: 'Forty, and the soup. You do good work. Come back any time you\'re short, I\'ll always have a sink.' }]);
  }

  /* ---------- Meridian Rewards: tonight's promotions ---------- */
  const PROMOS = [
    { id: 'six', name: 'Spin to Win', desc: 'Land the Joker or the Meridian logo on the Big Six wheel', prize: 1500, done: () => App.counter('l2_bigsix_top') > 0 },
    { id: 'gold', name: 'Golden Tide', desc: 'Push a gold token off a coin pusher', prize: 500, done: () => App.counter('l2_gold') > 0 },
    { id: 'triple', name: 'Three of a Kind', desc: 'Be at the Sic Bo table, with a bet down, when the dice roll a triple', prize: 2500, done: () => App.counter('l2_triple') > 0 },
    { id: 'walk', name: 'Walk Away a Winner', desc: 'Leave a table or the slots with more than you sat down with, three times', prize: 1000, done: () => App.counter('l2_walkup') >= 3, n: () => `${Math.min(3, App.counter('l2_walkup'))} of 3` },
    { id: 'big', name: 'High Roller', desc: 'Win $5,000 or more in one sitting at a table or the slots', prize: 2000, done: () => App.counter('l2_bigwin') > 0 },
  ];
  const ready = () => PROMOS.filter(p => p.done() && !S().promos[p.id]);
  let told = {};
  // called with the HUD: tell you once when a promotion is ready to claim
  function check() { if (!App.state || !App.state.l2) return; for (const p of ready()) if (!told[p.id]) { told[p.id] = 1; L2.toast(`🎟️ Promotion complete: ${p.name}. Claim ${fmt(p.prize)} at the Meridian Rewards desk.`); } }
  function promoList(claim) {
    return h('div.l2-promos', PROMOS.map(p => {
      const got = S().promos[p.id], done = p.done();
      return h('div.l2-clue' + (got ? '.got' : ''), h('b', `${got ? '✅' : done ? '🎟️' : '◻️'} ${p.name} · ${fmt(p.prize)}`), h('p', p.desc + (p.n && !done ? ` (${p.n()})` : '')),
        claim && done && !got ? h('button.l2-btn', { onclick: e => { S().promos[p.id] = 1; earn(p.prize); App.count('l2_promos'); SFX.big && SFX.big(); e.currentTarget.replaceWith(h('small', `Paid: ${fmt(p.prize)}`)); Career.checkAchievements(); } }, `Claim ${fmt(p.prize)}`) : null);
    }));
  }
  async function rewards() {
    if (!L2.has('rewardsIntro')) { L2.set('rewardsIntro'); await say([{ name: 'The Rewards host', who: 'x', text: 'Welcome to Meridian Rewards! Tonight\'s promotions are on the board. Hit one, come and see me, and the house pays a bounty. Cash, not chips.' }, { who: 'narr', text: '*You wrote the risk model for these promotions, once. Every one of them is priced so the house still wins on average. On average.*' }]); }
    await L2.ui.panel('Meridian Rewards · Tonight\'s promotions', () => h('div', h('p.l2-read', `${fmt(cash())} in your wallet. Bounties are paid in cash.`), promoList(true)), { wide: true });
  }

  /* ---------- the tables: what walking away feels like ---------- */
  function sat(amount) { S().sat = amount; }
  function back(now) {
    const m = S(), was = m.sat; if (was == null) return; m.sat = null;
    const diff = now - was;
    if (diff > 0) App.count('l2_walkup');
    if (diff >= 5000) App.count('l2_bigwin');
    if (diff < 0 && -diff >= Math.max(100, was * .4) && !L2Bottle.path()) {
      const d = L2Bottle.state; d.crave = Math.min(100, d.crave + 15);
      setTimeout(() => L2.toast(`🥃 Down ${fmt(-diff)}. The wanting comes up in you like a wave. One drink and you wouldn't care.`), 1200);
    } else if (diff > 0) setTimeout(() => L2.toast(`💵 Up ${fmt(diff)}. You walked away. That's the hard part.`), 1200);
    App.save();
  }

  /* ---------- a cab ---------- */
  const STOPS = [['hospital', 'St Jude\'s clinic'], ['casino', 'The Meridian'], ['house', '17 Calder Street'], ['lowtide', 'The Low Tide'], ['pawn', 'Sully\'s Pawn'], ['diner', 'Rosie\'s diner'], ['police', 'The police station'], ['chapel', 'St Brigid\'s'], ['cemetery', 'Greenhill cemetery']];
  async function taxi() {
    if (R3.area !== 'city') return L2.toast('🚕 You need to be out on the street to get a cab.');
    const E = R3.map.info.entries, P = R3.player;
    const fare = k => Math.round(8 + Math.hypot(E[k][0] - P.x, E[k][1] - P.y) * .5);
    const opts = STOPS.filter(([k]) => E[k] && Math.hypot(E[k][0] - P.x, E[k][1] - P.y) > 6).map(([k, l]) => [k, `${l} (${fmt(fare(k))})`]);
    const c = await choose(`🚕 A cab pulls over, wipers going. ${L2Bottle.hunting ? 'Behind you, the red in the dark. ' : ''}Where to?`, [...opts, ['no', 'Wave it on']]);
    if (!E[c] || !pay(fare(c))) return;
    App.count('l2_taxi');
    if (L2Bottle.hunting) L2Bottle.endHunt('door');
    await L2.go('city', c);
    L2.toast(RNG.pick(['🚕 The driver doesn\'t say a word the whole way. You like him for it.', '🚕 The radio plays something from a year ago. You ask him to turn it off.', '🚕 Rain on the cab roof like fingers drumming.']));
  }

  /* ---------- the notebook page ---------- */
  function panel(done) {
    const m = S(), kit = Object.keys(KIT).filter(owns);
    const goal = (icon, name, price, got, where) => h('div.l2-clue' + (got ? '.got' : ''), h('b', `${got ? '✅' : icon} ${name} · ${fmt(price)}`), got ? null : h('div.l2-goal', h('i', { style: `width:${Math.min(100, cash() / price * 100)}%` })), h('p', got ? 'Done.' : where));
    return h('div',
      h('p.l2-obj2', `${fmt(cash())} in your wallet`),
      h('p.l2-read', 'Awake, money is what it really is: what gets you through the night. The Meridian is still the only place in the city where it can turn into more. Floor games, the tables and the slots all use your real money.'),
      goal('💍', 'Your wedding ring', RING, m.ring, 'At Sully\'s Pawn & Hardware on Harbour Road. It makes the craving come slower, and takes back one of the times the Barman got you.'),
      L2.state.clues.call || L2.state.clues.eddie ? goal('🪦', 'A headstone for Eddie Marsh', STONE, m.stone, 'At Greenhill, where he\'s buried under a number.') : null,
      h('div.l2-clue', h('b', '🎒 Kit'), h('p', kit.length ? kit.map(k => `${KIT[k].icon} ${KIT[k].name}`).join(' · ') + (owns('torch') ? ` · 🔋 ${Math.round(m.battery)}%` : '') : 'Nothing yet. Sully\'s sells torches, running shoes and raincoats.'), m.meds ? h('p', '💊 Naltrexone') : null),
      h('b.l2-sub2', '🎟️ Tonight\'s promotions (claim at the Rewards desk on the casino floor)'), promoList(false),
      h('p.l2-hint', 'Short of money? Rosie\'s needs someone to wash up, and the cage will advance you money against your cheque. A cab (☰ menu, out on the street) gets you anywhere in the city, even with something behind you.'));
  }
  function hudText() { return owns('torch') ? `🔦${Math.round(S().battery)}%` : ''; }

  return { KIT, PROMOS, owns, pay, earn, lamp, tick, soak, runBoost, craveMul, torchOn, sully, ring, eddieGrave, meds, advance, washUp, rewards, check, sat, back, taxi, panel, hudText, get state() { return S(); }, RING, STONE };
})();
