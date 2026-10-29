/* Level 2 life: what gets you through the night besides the case.
   - Spirit: how you're holding up, a fourth bar beside hunger, thirst and energy. A hot meal, a cat,
     a song, a candle, saying no to a drink, a kind word, sleep, helping someone: it goes up. Hunger,
     thirst, exhaustion, the Barman, losing hard at the tables: it goes down. Low spirit makes the
     craving come faster; high spirit slows it.
   - Menus, like the dream's: every bar, diner, shop and machine shows what it sells, what it costs and
     what it does for you, and you buy as much as you like before you close it. At the Low Tide you pick
     your drink (or ask for water instead, which counts as saying no).
   - Sleep, like the dream's: an hour's nap, a proper sleep, or letting the dream take you back to the
     town. Where you sleep matters: the car is cold, the clinic is a hospital bed, a hotel bed is a bed.
   - Side jobs for the people of the city (ask them if they need a hand), and one story you'll only
     find by talking: who has been leaving white tulips at Greenhill every Saturday. */
const L2Life = (() => {
  const S = () => L2.state;
  const say = (...a) => L2.ui.say(...a), choose = (...a) => L2.ui.choose(...a);
  const has = k => L2.has(k), set = k => L2.set(k);

  /* ======================= spirit ======================= */
  const value = () => { const s = S(); if (s.spirit == null) s.spirit = 45; return s.spirit; };
  const label = v => v >= 75 ? 'Hopeful' : v >= 50 ? 'Holding on' : v >= 25 ? 'Low' : 'Hollow';
  function lift(d, why) {
    const s = S(), was = value(); s.spirit = Math.max(0, Math.min(100, Math.round((was + d) * 10) / 10));
    if (s.spirit >= 75 && was < 75) { App.count('l2_hopeful'); Career.checkAchievements(); }
    if (why && Math.abs(d) >= 1) spark(`${d > 0 ? '🙂 +' : '😞 '}${Math.round(d)}  ${why}`, d > 0);
    if (label(was) !== label(s.spirit)) L2.toast(s.spirit > was ? `🙂 You feel ${label(s.spirit).toLowerCase()}.` : `😞 ${label(s.spirit) === 'Hollow' ? 'Hollow. Everything is very far away.' : 'Your spirits sink. You feel ' + label(s.spirit).toLowerCase() + '.'}`);
    L2.hud(); App.save();
  }
  // a little line that floats up from the bars
  function spark(text, good) { const e = h('div.l2-spark' + (good ? '.good' : '.bad'), text); document.body.append(e); setTimeout(() => e.remove(), 2200); }
  const craveMul = () => { const v = value(); return v < 25 ? 1.3 : v < 45 ? 1.1 : v > 75 ? .8 : v > 60 ? .9 : 1; };
  let lowSaid = 0;
  const LOW = ['Nobody would notice if you just sat down here and didn\'t get up.', 'Ellie would be ten now.', 'What\'s the point of the truth if it doesn\'t bring them back?', 'You could stop. You could just stop.'];
  function tick(hunting) { // once a second, from the bottle's clock
    const n = L2Bottle.needs(); let d = 0;
    if (n.hunger < 20) d -= .03; if (n.thirst < 20) d -= .03; if (n.energy < 15) d -= .03;
    if (hunting) d -= .04;
    const M = R3.map; if (M && M.info.soft && value() < 60) d += .015; // warm, lit, people about
    if (d) S().spirit = Math.max(0, Math.min(100, value() + d));
    if (value() < 18 && !R3.busy && Date.now() - lowSaid > 80000) { lowSaid = Date.now(); L2.toast(`😞 ${LOW[Math.floor(Math.random() * LOW.length)]}`); }
  }

  /* ======================= menus ======================= */
  // [key, icon, name, price, { hunger, thirst, energy, sp }, { alc: buzz } ]
  const MENUS = {
    lowtide: { who: 'delia', title: 'The Low Tide', line: '"Kitchen\'s open till two, hon. What are you having?"', items: [
      ['lager', '🍺', 'A pint of lager', 6, {}, { alc: 45 }], ['stout', '🍺', 'A pint of stout', 7, { hunger: 6 }, { alc: 50 }], ['wine', '🍷', 'A glass of red', 9, {}, { alc: 50 }], ['whisky', '🥃', 'Whisky, neat', 14, {}, { alc: 70 }], ['rum', '🥃', 'Dark rum and cola', 11, { thirst: 10 }, { alc: 60 }],
      ['cola', '🥤', 'Cola', 3, { thirst: 30, energy: 6 }], ['lime', '🍋', 'Lime and soda', 3, { thirst: 35, sp: 1 }], ['ginger', '🫚', 'Ginger beer (the soft kind)', 3, { thirst: 30, sp: 1 }], ['coffee', '☕', 'Coffee', 3, { energy: 22, thirst: 5 }], ['tea', '🫖', 'A pot of tea', 2, { thirst: 25, energy: 8, sp: 2 }],
      ['chips', '🍟', 'A bowl of chips', 5, { hunger: 25, sp: 1 }], ['toastie', '🥪', 'Cheese toastie', 7, { hunger: 35, sp: 2 }], ['chilli', '🌶️', 'Delia\'s chilli', 9, { hunger: 50, thirst: -5, sp: 4 }], ['burger', '🍔', 'Burger and fries', 16, { hunger: 60, energy: 8, sp: 4 }], ['water', '💧', 'Water', 0, { thirst: 35 }]] },
    diner: { who: 'rosie', title: 'Rosie\'s', line: '"What\'ll it be, love?"', job: true, items: [
      ['burger', '🍔', 'Cheeseburger and fries', 14, { hunger: 60, energy: 6, sp: 4 }], ['pancakes', '🥞', 'A stack of pancakes', 8, { hunger: 45, energy: 10, sp: 5 }], ['eggs', '🍳', 'Eggs, bacon and toast', 10, { hunger: 55, energy: 8, sp: 4 }], ['blt', '🥪', 'A BLT', 9, { hunger: 40, sp: 2 }], ['soup', '🥣', 'Soup of the day', 7, { hunger: 35, thirst: 10, sp: 3 }],
      ['pie', '🥧', 'A slice of cherry pie', 6, { hunger: 25, sp: 4 }], ['shake', '🥤', 'A chocolate milkshake', 5, { hunger: 15, thirst: 25, energy: 8, sp: 3 }], ['oj', '🍊', 'Orange juice', 3, { thirst: 35, energy: 4 }], ['coffee', '☕', 'Coffee (refills free)', 3, { energy: 25, thirst: 5 }], ['tea', '🫖', 'Tea', 2, { thirst: 25, energy: 8, sp: 1 }], ['water', '💧', 'A glass of water', 0, { thirst: 35 }]] },
    kwik: { who: 'omar', title: 'Kwik Mart', line: '"Take your time."', items: [
      ['water', '💧', 'Bottle of water', 2, { thirst: 40 }], ['juice', '🧃', 'Orange juice', 3, { thirst: 35, energy: 5 }], ['milk', '🥛', 'Pint of milk', 2, { thirst: 25, hunger: 8 }], ['icedcoffee', '🧋', 'Iced coffee', 4, { energy: 25, thirst: 15 }], ['energy', '⚡', 'Energy drink', 4, { energy: 35, thirst: 10, sp: -1 }], ['cola', '🥤', 'Cola', 2, { thirst: 30, energy: 8 }],
      ['sandwich', '🥪', 'Sandwich', 5, { hunger: 35, sp: 1 }], ['roll', '🥐', 'Sausage roll', 3, { hunger: 25 }], ['noodles', '🍜', 'Pot noodle (they\'ll add hot water)', 3, { hunger: 30, thirst: 5, sp: 1 }], ['fruit', '🍎', 'An apple and a banana', 2, { hunger: 15, thirst: 5, sp: 1 }], ['choc', '🍫', 'Chocolate bar', 2, { hunger: 18, energy: 5, sp: 1 }], ['crisps', '🥔', 'Crisps', 2, { hunger: 12, thirst: -5 }],
      ['gum', '🍬', 'Mints', 1, { sp: 0 }, { crave: 2 }], ['flowers', '💐', 'A bunch of carnations', 6, { sp: 3 }, { flowers: 1 }], ['nicgum', '🟩', 'Nicotine gum', 8, {}, { job: 'shona' }]] },
    vending: { title: 'A vending machine', line: 'It hums. Half the lights are out.', items: [['water', '💧', 'Water', 2, { thirst: 40 }], ['bar', '🍫', 'A chocolate bar', 2, { hunger: 22, energy: 5 }], ['crisps', '🥔', 'Crisps', 2, { hunger: 15, thirst: -5 }], ['energy', '⚡', 'An energy drink', 4, { energy: 35, thirst: 10, sp: -1 }]] },
    minibar: { title: 'The minibar', line: 'Hotel prices. Nine times what it\'s worth.', items: [['water', '💧', 'A bottle of water', 6, { thirst: 40 }], ['nuts', '🥜', 'Nuts and a chocolate bar', 9, { hunger: 30, energy: 4 }], ['juice', '🧃', 'A little orange juice', 7, { thirst: 30, energy: 4 }]] },
    gus: { who: 'gus', title: 'Gus\'s hot dogs', line: 'Gus waves the tongs. "Onions? Of course onions."', items: [['dog', '🌭', 'A hot dog, everything on it', 4, { hunger: 35, sp: 2 }], ['two', '🌭', 'Two, and a cola', 9, { hunger: 65, thirst: 25, energy: 6, sp: 3 }], ['pretzel', '🥨', 'A warm pretzel', 3, { hunger: 22, sp: 1 }], ['coffee', '☕', 'Coffee from the flask', 2, { energy: 18, thirst: 4 }], ['cocoa', '🍫', 'Hot chocolate', 3, { thirst: 20, energy: 6, sp: 3 }]] },
  };
  const tagsOf = (e, x = {}) => [e.hunger && `🍔${e.hunger > 0 ? '+' : ''}${e.hunger}`, e.thirst && `💧${e.thirst > 0 ? '+' : ''}${e.thirst}`, e.energy && `⚡${e.energy > 0 ? '+' : ''}${e.energy}`, e.sp && `🙂${e.sp > 0 ? '+' : ''}${e.sp}`, x.alc && '🥃 alcohol', x.crave && 'eases the craving a touch'].filter(Boolean).join('  ');
  function needRows() {
    const n = L2Bottle.needs(), bar = (i, v, lbl) => h('div.l2-mneed', h('span', i), h('div.l2-bar', h('i', { style: { width: Math.round(v) + '%' } })), h('em', lbl || Math.round(v)));
    return h('div.l2-mneeds', bar('🍔', n.hunger), bar('💧', n.thirst), bar('⚡', n.energy), bar('🙂', value(), label(value())));
  }
  // what one thing does when you buy it
  function consume(key, it) {
    const [, icon, name, price, e, x = {}] = it;
    if (x.job === 'shona') { if (!L2Money.pay(price)) return false; S().nicgum = 1; L2.toast('🟩 Nicotine gum, for Shona.'); return true; }
    if (x.flowers) { if (!L2Money.pay(price)) return false; S().flowers = (S().flowers || 0) + 1; lift(e.sp, 'flowers'); L2.toast('💐 Carnations, wrapped in newspaper. For Greenhill.'); return true; }
    if (price && !L2Money.pay(price)) return false;
    if (x.crave) { L2Bottle.state.crave = Math.max(0, L2Bottle.state.crave - x.crave); L2Bottle.apply(); }
    const f = { hunger: e.hunger || 0, thirst: e.thirst || 0, energy: e.energy || 0 }; if (f.hunger || f.thirst || f.energy) L2Bottle.feed(f);
    if (e.sp) lift(e.sp, name.toLowerCase());
    if (e.hunger >= 25) App.count('l2_meals');
    SFX.chip && SFX.chip(); return true;
  }
  // a menu like the dream's: need bars on top, everything on offer with what it does, buy as you like
  function menu(key, extra = {}) {
    const Mn = MENUS[key]; if (!Mn) return;
    const sober = L2Bottle.path() === 'sober';
    return L2.ui.panel(Mn.title, done => {
      const body = h('div.l2-menu');
      const render = () => {
        body.innerHTML = '';
        body.append(h('p.l2-read', Mn.line), needRows());
        const list = h('div.l2-mlist');
        // Delia's usual: hers to pour, yours to refuse
        if (key === 'lowtide' && !sober && !L2Bottle.path() && !L2Bottle.state.refused.delia) {
          list.append(row('🥃', 'Your usual, neat', 'On the house. Delia remembers.', 'Pour it', async () => { done(); await say([{ who: 'delia', text: 'Neat, like you used to. Some things I remember.' }]); await L2Bottle.drink('delia', 0, 60); lift(3, 'a drink'); afterDrink(); }));
          list.append(row('💧', '"Just water, Delia."', 'Saying no counts', 'Say it', async () => { L2Bottle.refuse('delia'); L2Bottle.feed({ thirst: 35 }); lift(5, 'you said no'); render(); }, true));
        }
        for (const it of Mn.items) {
          const [k, icon, name, price, e, x = {}] = it;
          if (x.alc && (sober)) continue;
          if (x.job === 'shona' && !(jobOn('shona') && !S().nicgum)) continue;
          list.append(row(icon, name, tagsOf(e, x), price ? fmt(price) : 'Free', async () => {
            if (x.alc) { if (S().cash < price) return L2.toast('Not enough money.'); done(); await say([{ who: Mn.who || 'x', name: Mn.who ? undefined : Mn.title, text: pickOne(['Drink slow, hon.', 'There you go.', '...You sure? All right. Your call.']) }]); await L2Bottle.drink(key, price, x.alc); lift(3, 'a drink'); afterDrink(); return; }
            if (consume(k, it)) { if (extra.after) extra.after(k); render(); }
          }, !x.alc && price === 0, S().cash < price));
        }
        if (Mn.job && S().cash < 100) list.append(row('🧽', 'Ask if there\'s any work going', 'Wash up for an hour: $40 and a meal', 'Ask', async () => { done(); await L2Money.washUp(); lift(4, 'honest work'); }));
        if (extra.rows) extra.rows(list, done, row);
        if (Mn.who) list.append(row('💬', `Talk to ${Mn.who === 'delia' ? 'Delia' : L2People.PEOPLE[Mn.who] ? L2People.PEOPLE[Mn.who].name.split(' ')[0] : Mn.who}`, 'Catch up, ask about tonight', 'Talk', () => { done(); if (Mn.who === 'delia') L2.chatWith('delia'); else L2People.talk(Mn.who); }));
        body.append(list, h('p.l2-mfoot', `${fmt(S().cash)} in your wallet`));
      };
      render(); return body;
    }, { closeLabel: 'Done' });
  }
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  function row(icon, name, sub, btn, fn, primary, disabled) {
    return h('div.l2-mrow', h('span.l2-mi', icon), h('div.l2-mn', h('b', name), sub ? h('small', sub) : null), h('button.l2-btn' + (primary ? '.go' : ''), { disabled: !!disabled, onclick: fn }, btn));
  }
  // the drink wears off, and takes a little of you with it
  function afterDrink() { setTimeout(() => { if (App.state && App.state.l2 && !L2Bottle.path()) lift(-7, 'the drink wearing off'); }, 150000); }

  /* ======================= sleep ======================= */
  // q: how good a bed it is (car .4, clinic .7, hotel 1)
  async function sleep(where, q = .7) {
    const d = L2Bottle.state, shakes = !L2Bottle.path() && d.crave >= 80;
    const c = await choose(where, [['nap', `😴 Close your eyes for an hour (⚡+${Math.round(30 * (.6 + q * .4))})`], ['sleep', `🛏️ Sleep properly (⚡ full, 🙂+${Math.round(12 * q)}, 🍔💧−25)`], ['dream', '🌙 Let the dream take you back to the town'], ['no', 'Not yet']]);
    if (c === 'dream') return L2.feverDream();
    if (c !== 'nap' && c !== 'sleep') return;
    if (shakes) { await say([{ who: 'narr', text: '*You lie there with your hands jumping on the blanket like something trying to get out. Sleep won\'t come with the shakes. It never did.*' }]); lift(-4, 'a bad night'); L2Bottle.feed({ energy: 8 }); return; }
    await fade();
    if (c === 'nap') { L2Bottle.feed({ energy: Math.round(30 * (.6 + q * .4)), hunger: -8, thirst: -10 }); lift(3 * q, 'a rest'); }
    else { const s = App.state; L2Bottle.feed({ hunger: -25, thirst: -25 }); s.stamina = s.staminaMax || 100; lift(12 * q, 'sleep'); if (!L2Bottle.path()) d.crave = Math.min(100, d.crave + 20); }
    App.count('l2_sleep'); L2.hud();
    await say([{ who: 'narr', text: pickOne(q < .5 ? ['*You wake with a crick in your neck and the windows fogged. Cold, but rested. Sort of.*', '*The rain on the roof. You sleep in pieces, but you sleep.*'] : q < .9 ? ['*Hospital quiet: a monitor somewhere, rubber soles in a corridor. You sleep like a stone.*', '*You sleep, and for once you don\'t dream of anything at all.*'] : ['*A real bed. You sleep like someone who\'s allowed to.*', '*Clean sheets and the city far below. When you wake you lie still for a while, just breathing.*']) }]);
  }
  function fade() { return new Promise(r => { const o = h('div.l2-over.wake'); document.body.append(o); setTimeout(() => { o.classList.add('out'); setTimeout(() => o.remove(), 400); r(); }, 1200); }); }

  /* ======================= side jobs ======================= */
  const J = () => { const s = S(); if (!s.jobs) s.jobs = {}; return s.jobs; };
  const jobOn = id => (J()[id] || {}).s === 'active', jobDone = id => (J()[id] || {}).s === 'done';
  const JOBS = {
    marcus: { title: 'The Good Horn', ask: 'Ask if he needs anything',
      offer: [{ name: 'Marcus Bell', who: 'x', text: 'Need? *laughs* I need my good horn back. A Selmer, 1962. Sully\'s got it in the window: I pawned it the winter my girl was born and I\'ve been playing this school-band thing ever since.' }, { name: 'Marcus Bell', who: 'x', text: 'Six hundred to get it out. I make sixty on a good night. You do the maths, I can\'t bear to.' }],
      desc: 'Buy Marcus\'s Selmer saxophone back from Sully\'s window ($600) and bring it to him.', ready: () => S().sax,
      done: async () => { delete S().sax; await say([{ name: 'Marcus Bell', who: 'x', text: '*He opens the case and doesn\'t say anything for a long time. Then he plays.*' }, { who: 'narr', text: '*It\'s "Someone to Watch Over Me", and the whole of Meridian Avenue goes quiet to listen. A woman stops with her umbrella half-closed. The rain sounds like applause.*' }, { name: 'Marcus Bell', who: 'x', text: 'Every night you walk past here, that one\'s yours. No charge. Ever.' }]); lift(15, 'Marcus plays for you'); } },
    ida: { title: 'The Late Edition', ask: 'Ask if she needs a hand',
      offer: [{ name: 'Ida Kowalski', who: 'x', text: 'My grandson was meant to do the rounds tonight. Nineteen, and already unreliable. Three bundles: the Low Tide, Rosie\'s, and the Meridian staff door. Ten dollars a drop and you can keep the spare copies.' }],
      desc: 'Drop Ida\'s late editions at the Low Tide (Delia), Rosie\'s and the Meridian (Hollis on the floor), then go back to Ida.', drops: { delia: 'the Low Tide', rosie: 'Rosie\'s', hollis: 'the Meridian' }, ready: () => Object.keys(JOBS.ida.drops).every(k => (J().ida || {})[k]),
      done: async () => { L2Money.earn(30); await say([{ name: 'Ida Kowalski', who: 'x', text: 'All three? Before midnight? *She presses the money into your hand and folds your fingers over it.* You\'re hired. You\'re also too old for this, but you\'re hired.' }]); lift(6, 'a job done'); } },
    gus: { title: 'Mind the Stand', ask: 'Ask if he needs anything',
      offer: [{ name: 'Gus Petrakis', who: 'x', text: 'You want to help? Watch the stand. Ten minutes. My bladder is not what it was in Thessaloniki. Four customers, maybe five: you give them what they ask, you keep the tips.' }],
      desc: 'Serve Gus\'s customers while he\'s gone.', instant: true },
    raj: { title: 'Lost Property', ask: 'Ask about his night',
      offer: [{ name: 'Rajesh Nair', who: 'x', text: 'Strange night. A man in a very good coat left this in my back seat. *A leather briefcase, locked, the initials W.C. in gold.* He got out at the Meridian. Rich men don\'t come back to the rank for things. Will you find him? I can\'t leave the car.' }],
      desc: 'Find the owner of the briefcase with the initials W.C. (somebody at the Meridian), and give it back.', ready: () => jobDone('raj') },
    shona: { title: 'Last One', ask: 'Ask how she\'s doing',
      offer: [{ name: 'Shona Reilly', who: 'x', text: '*She looks at the cigarette like it insulted her.* Day three of quitting. This is my "last one". My eleventh last one. If somebody brought me that nicotine gum from the Kwik Mart I\'d marry them. Or at least not set fire to anything.' }],
      desc: 'Buy nicotine gum at the Kwik Mart ($8) and take it to Shona outside the Low Tide.', ready: () => S().nicgum,
      done: async () => { delete S().nicgum; await say([{ name: 'Shona Reilly', who: 'x', text: '*She snaps the cigarette in half and drops it in the gutter.* There. Witnessed. You have to check on me now, that\'s how this works.' }, { name: 'Shona Reilly', who: 'x', text: 'And whatever yours is, *she nods at your hands*, same deal. I\'ll check on you.' }]); lift(8, 'somebody\'s in your corner'); L2Bottle.state.crave = Math.max(0, L2Bottle.state.crave - 15); L2Bottle.apply(); } },
    ruth: { title: 'The Circle', ask: 'Offer to help with the chairs',
      offer: [{ name: 'Ruth Abrams', who: 'x', text: 'Help? Bless you. They go in a circle, eight of them, and then the hard part: you sit in one. That\'s all the meeting is, really. People sitting in a circle being honest. You don\'t have to talk.' }],
      desc: 'Sit in the circle of chairs at St Brigid\'s, then talk to Ruth.', ready: () => has('satCircle'),
      done: async () => { await say([{ name: 'Ruth Abrams', who: 'x', text: 'You sat. That\'s the whole first step: sitting down in the room. Thursdays, eight o\'clock. There\'ll be tea. There\'s always tea.' }]); lift(8, 'the circle'); } },
  };
  // offers, deliveries and hand-ins, as extra lines when you tap someone
  function rowsFor(id) {
    const out = [], j = JOBS[id];
    if (j && !J()[id] && !(id === 'raj' && !L2.state.clues.badge)) out.push(['job_' + id, `📝 ${j.ask}`]);
    if (j && jobOn(id) && j.ready && j.ready()) out.push(['jobdone_' + id, `✅ ${id === 'marcus' ? 'Give him the saxophone' : id === 'shona' ? 'Give her the gum' : id === 'ida' ? 'Tell her the papers are out' : 'Tell her you sat in the circle'}`]);
    if (jobOn('ida') && JOBS.ida.drops[id] && !(J().ida || {})[id]) out.push(['drop_' + id, '📰 Drop off Ida\'s papers']);
    if (id === 'chen' && jobOn('raj')) out.push(['case_chen', '💼 "Is this yours? The initials W.C."']);
    return out;
  }
  async function handle(id, c) {
    if (c.startsWith('job_')) { const j = JOBS[id]; await say(j.offer); if (j.instant) return standGame(); const a = await choose(j.desc, [['yes', 'I\'ll do it'], ['no', 'Not tonight']]); if (a !== 'yes') return; J()[id] = { s: 'active' }; App.save(); L2.toast(`📝 Side job: ${j.title}`); return; }
    if (c.startsWith('jobdone_')) { const j = JOBS[id]; await j.done(); J()[id] = { s: 'done' }; App.count('l2_jobs'); App.save(); L2.toast(`✅ Side job done: ${j.title}`); Career.checkAchievements(); return; }
    if (c.startsWith('drop_')) { (J().ida = J().ida || { s: 'active' })[id] = 1; App.save(); L2.toast(`📰 Papers dropped at ${JOBS.ida.drops[id]}.`); return say([{ who: 'narr', text: '*You set the bundle down. Somebody\'s already reading the front page.*' }]); }
    if (c === 'case_chen') { J().raj = { s: 'done' }; App.count('l2_jobs'); L2Money.earn(1000); lift(6, 'a good turn'); S().chenFavour = 1; App.save();
      await say([{ name: 'Mr. Chen', who: 'x', text: '*He doesn\'t open it. He doesn\'t need to.* William Chen. My father\'s initials, and his case. I would have paid the driver anything for it. I suspect he knew that and sent you instead, which says something about both of you.' }, { name: 'Mr. Chen', who: 'x', text: '*He counts out ten hundred-dollar bills without looking at them.* For your trouble. And if you ever want a seat at my table, you have one.' }]);
      L2.toast('✅ Side job done: Lost Property · +$1,000'); Career.checkAchievements(); }
  }
  // minding Gus's stand: give each customer what they ask for
  async function standGame() {
    const FOOD = [['dog', '🌭 A hot dog'], ['two', '🌭🌭 Two hot dogs'], ['pretzel', '🥨 A pretzel'], ['coffee', '☕ A coffee'], ['cocoa', '🍫 A hot chocolate']];
    const PEEPS = [['A cab driver, steaming', 'Two dogs, everything, and step on it.', 'two'], ['A girl in a sequinned dress, shoes in her hand', 'Something warm. Chocolate. Please.', 'cocoa'], ['A night nurse', 'Coffee. Black. The blacker the better.', 'coffee'], ['A drunk in a tuxedo', 'Thhhe twisty bread. The knotted one.', 'pretzel'], ['A cop on his break', 'One hot dog. Don\'t tell my wife.', 'dog']];
    let tips = 0, right = 0;
    for (const [who, ask, want] of RNG.shuffle(PEEPS.slice()).slice(0, 4)) {
      const c = await choose(`${who}: "${ask}"`, RNG.shuffle(FOOD.slice()).map(([k, l]) => [k, l]));
      if (c === want) { right++; const t = 2 + Math.floor(Math.random() * 4); tips += t; SFX.chip && SFX.chip(); L2.toast(`👍 +${fmt(t)} tip`); } else L2.toast('🙃 Not what they asked for. No tip.');
    }
    if (tips) L2Money.earn(tips);
    await say([{ name: 'Gus Petrakis', who: 'x', text: right >= 4 ? 'Four out of four? You\'re a natural. If the casino thing doesn\'t work out, I\'m hiring.' : right ? `${right} out of 4. Not bad. The customer is always right, even the drunk ones.` : 'You gave a cop a hot chocolate. He\'s going to tell everyone. *He laughs till he coughs.*' }]);
    if (!J().gus) { J().gus = { s: 'done' }; App.count('l2_jobs'); }
    lift(right * 1.5, 'Gus\'s stand'); App.save(); Career.checkAchievements();
  }

  /* ======================= the white tulips (found only by talking) ======================= */
  // See WHISPERS (whispers.js): Ida, then Hollis, then Ruth. This is how it ends, in the circle.
  async function circle() {
    if (has('circleTonight') && !has('hollisCame')) {
      set('hollisCame'); set('satCircle');
      await say([{ who: 'narr', text: '*You sit in the circle and wait. Ruth goes out into the rain without a coat. A minute. Five. Then the door, and a big man in a Meridian security jacket, cap in his hands, limping on his left side.*' },
        { name: 'Hollis', who: 'x', text: 'I\'ve sat outside this room every Thursday for a year. *He lowers himself into the chair opposite you like it might not hold him.* I was on the back door that night. 9:31, Mr. Vale\'s car out, Rourke driving. 10:52, back in. I logged it. Next morning Rourke tore the page out in front of me.' },
        { name: 'Hollis', who: 'x', text: 'I said nothing. I\'ve got a daughter at college and a mortgage and I said nothing. *He takes a folded paper out of a Bible.* I photocopied the page before the shift ended. I don\'t even know why. Maybe for this.' },
        { name: 'Hollis', who: 'x', text: 'The tulips are me. Every Saturday. It\'s not enough. It\'s what I had. *He puts an envelope on the chair between you.* And this was going in a jar for the flowers. Put it towards the boy\'s stone. Eddie\'s. I heard what you\'re doing.' },
        { who: 'narr', text: '*Nobody says anything for a while. Ruth pours three cups of tea. It\'s terrible tea. It\'s the best thing you\'ve tasted in a year.*' }]);
      L2Money.earn(2000); lift(20, 'the truth, out loud'); L2Bottle.state.crave = Math.max(0, L2Bottle.state.crave - 40); L2Bottle.apply(); App.count('l2_tulips'); App.save();
      L2.toast('🌷 The Night Watch: Hollis\'s photocopy of the door log, and $2,000 towards Eddie\'s stone.'); Career.checkAchievements(); return true;
    }
    if (!has('satCircle')) { set('satCircle'); L2Bottle.state.crave = Math.max(0, L2Bottle.state.crave - 20); L2Bottle.apply(); lift(6, 'the circle'); App.save(); }
    return false;
  }

  /* ======================= keepsakes ======================= */
  // ten small things of theirs, scattered through the city: each one is a memory, and a little of you back
  const KEEPS = [
    { id: 'tulip', area: 'house', x: .8, y: .55, h: 1.1, ux: .8, uy: 1.3, label: 'Nora\'s recipe book', name: 'A pressed white tulip', text: 'Between the pages of Nora\'s recipe book, at the lemon drizzle: a white tulip, pressed flat and brown at the edges. From your wedding. She kept one. You didn\'t know.' },
    { id: 'engine', area: 'house', x: 4.4, y: 6.5, h: .2, ux: 4.4, uy: 6.9, label: 'Sam\'s toys, under the dust sheet', name: 'Sam\'s fire engine', text: 'Sam\'s red fire engine, the ladder missing. He lost it the week before. He cried for an hour and then decided the fire engine was "on holiday from ladders".' },
    { id: 'drawing', area: 'house', x: 9.6, y: .85, h: 1.2, ux: 9.6, uy: 1.5, label: 'The kitchen cupboards', name: 'Ellie\'s drawing', text: 'Taped inside a cupboard door: Ellie\'s drawing of the five of you. "Me, Sam, Mum, Dad, and the cat we\'re not allowed." The cat is the biggest.' },
    { id: 'ladder', area: 'cemetery', x: 9.2, y: 4.6, h: .2, ux: 9.2, uy: 5.4, label: 'Something tied to Sam\'s stone', name: 'The missing ladder', text: 'Tied to Sam\'s stone with a red ribbon: a little plastic ladder. The fire engine\'s. Somebody found it, and knew. Delia, the ribbon says, in biro.' },
    { id: 'bike', area: 'pawn', x: 8.6, y: 6.3, h: .5, ux: 8.6, uy: 6.6, label: 'Behind the crates', name: 'Ellie\'s bike', text: 'A purple bike with streamers, behind Sully\'s crates. Ellie\'s. Sully sees you looking. "Your sister-in-law brought the house things in. I couldn\'t sell that one. Didn\'t try."' },
    { id: 'wedding', area: 'lowtide', x: .3, y: 9.6, h: 1.5, ux: .9, uy: 9.6, label: 'The photo by the door', name: 'Your wedding party', text: 'A photo by the door, in the frame Delia keeps polished: your wedding party, here, in the Low Tide. Nora on the bar in her dress, shoes in her hand, laughing at something you said. You can\'t remember what. You\'d give anything to remember what.' },
    { id: 'initials', area: 'diner', x: 10.2, y: 7.2, h: .5, ux: 9.4, uy: 7.6, label: 'The back booth', name: 'Initials in the booth', text: 'Carved into the back booth, under years of varnish: N + you, and a wonky heart. The night you asked her. Rosie pretended to be furious about the table for a whole week.' },
    { id: 'padlock', area: 'city', x: 40, y: 58.7, h: .8, ux: 40, uy: 58.1, label: 'A padlock on the railing', name: 'The padlock', text: 'A brass padlock on the river railing, gone green: N & you, 2011. You threw the key in. She said it was the most romantic thing you\'d ever done and also littering.' },
    { id: 'font', area: 'chapel', x: 2, y: 2.4, h: 1, ux: 2, uy: 3.2, label: 'The stone font', name: 'The christening font', text: 'Sam was christened here. He screamed so loudly Father Tom laughed in the middle of the blessing, and then everyone did, and then Sam did too.' },
    { id: 'bracelet', area: 'clinic', x: 1.3, y: 4.5, h: .8, ux: 1.6, uy: 5.1, label: 'A bag of your things', name: 'Ellie\'s bracelet', text: 'In the plastic bag of your things the clinic kept: a bracelet of alphabet beads that spells DADDY, one D upside down. Ellie made it at school. You wore it every day, it turns out. You\'d forgotten that too.' },
  ];
  const K = () => { const s = S(); if (!s.keeps) s.keeps = {}; return s.keeps; };
  // world.js calls this as it builds each place: a twinkle and something to look at, for what you haven't found
  function keeps(A, area) {
    for (const k of KEEPS) { if (k.area !== area) continue; if (!K()[k.id]) A.prop('glint', k.x, k.y, { h: k.h, seed: k.x * 7 + k.y, solid: false }); A.use(k.ux, k.uy, K()[k.id] ? k.name : `🔎 ${k.label}`, () => find(k.id), { r: 1.2 }); }
  }
  async function find(id) {
    const k = KEEPS.find(q => q.id === id); if (!k) return;
    const first = !K()[id]; K()[id] = 1;
    await say([{ who: 'narr', text: `*${k.text}*` }]);
    if (!first) return;
    App.count('l2_keeps'); lift(6, k.name.toLowerCase()); L2.toast(`🗝️ Keepsake: ${k.name} (${Object.keys(K()).length} of ${KEEPS.length})`);
    if (Object.keys(K()).length === KEEPS.length) { lift(15, 'all of them'); L2.toast('🗝️ All ten. You carry them out to the car in a shoebox, carefully, like eggs.'); }
    Career.checkAchievements(); App.save();
  }
  // the notebook's page: how you're doing, your side jobs, what you've found
  function panel() {
    const v = value(), wrap = h('div');
    wrap.append(h('p.l2-read', `🙂 Spirit: ${label(v)} (${Math.round(v)}). ${v < 25 ? 'The craving comes faster when you\'re this low. Eat something. Find a kind voice.' : v > 75 ? 'You feel almost like yourself. The craving is quieter.' : 'Food, rest, people and small kindnesses lift it; hunger, the Barman and losing drag it down.'}`));
    wrap.append(h('h4', 'Side jobs'));
    const js = Object.keys(JOBS).filter(id => J()[id]);
    wrap.append(js.length ? h('div', js.map(id => h('div.l2-clue', h('b', `${jobDone(id) ? '✅' : '📝'} ${JOBS[id].title}`), h('p', JOBS[id].desc)))) : h('p.l2-read', 'Nothing yet. Ask people if they need a hand.'));
    wrap.append(h('h4', `Keepsakes (${Object.keys(K()).length} of ${KEEPS.length})`));
    wrap.append(h('div', KEEPS.map(k => K()[k.id] ? h('div.l2-clue', h('b', `🗝️ ${k.name}`), h('p', k.text)) : h('div.l2-clue.dim', h('b', '🗝️ ?'), h('p', 'Somewhere in the city.')))));
    return wrap;
  }

  return { value, label, lift, craveMul, tick, menu, MENUS, sleep, rowsFor, handle, JOBS, jobOn, jobDone, circle, standGame, KEEPS, keeps, find, panel };
})();
