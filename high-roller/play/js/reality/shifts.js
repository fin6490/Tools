/* Level 2 shifts: honest work for honest money, when the tables have taken it. Nobody in this city
   will lend you a cent (your credit died while you slept: the cage, the bank and the loan shops all
   say no), but four places will give you an hour's work whenever you ask, as often as you can stand it.
   - Rosie's diner: wash up a sinkful of plates. $40 and a bowl of soup.
   - The Kwik Mart: put the night delivery on the right shelves for Omar. $45.
   - Sully's Pawn & Hardware: count the stock in the back. $50.
   - The Low Tide: pull pints behind Delia's bar. $55 and tips, and the hardest hour of the night,
     because the craving comes up with every pint you pour (unless you're already sober).
   Do it well and the pay goes up (up to half again). Each one takes energy and makes you hungry and
   thirsty, and the boss wants you to rest a minute and a half before the next one. */
const L2Shifts = (() => {
  const REST = 90000, TIRED = 15;
  const S = () => { const m = L2Money.state; m.shifts = m.shifts || {}; return m.shifts; };
  const say = (...a) => L2.ui.say(...a);
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const SHIFTS = {
    rosie: { boss: 'Rosie', title: 'The sink at Rosie\'s', icon: '🧽', name: 'Wash up for an hour', pay: 40, extra: 'and a bowl of soup', feed: { hunger: 35, thirst: 10, energy: -12 }, game: sink,
      first: 'Work? *She looks at you a long moment.* My pot washer walked out on Tuesday. Forty dollars and a bowl of soup for a sinkful. Don\'t break anything.',
      again: ['Sink\'s yours, love. Same as before.', 'There\'s a stack from the night-shift taxi drivers. Go on.'], rest: 'Sit down a minute, love, you\'ve only just finished. Have a coffee.',
      thanks: ['Forty, and the soup. You do good work. Come back any time you\'re short, I\'ll always have a sink.', 'That\'s my girl\'s favourite mug you didn\'t break. Here.'] },
    kwik: { boss: 'Omar', title: 'The night delivery', icon: '📦', name: 'Stack the shelves', pay: 45, feed: { hunger: -6, thirst: -8, energy: -14 }, game: shelves,
      first: 'You want work? *He looks at the pallet by the door, then at you.* The delivery came at midnight and my nephew didn\'t. Everything on the right shelf, forty-five dollars.',
      again: ['Another pallet came. Same deal.', 'Bread with bread, tins with tins. You know the drill now.'], rest: 'Have a breather, my friend. The shelves aren\'t going anywhere.',
      thanks: ['Forty-five. Tidier than my nephew ever left it.', 'Good. My mother would approve, and she approved of nobody.'] },
    sully: { boss: 'Sully', title: 'The stocktake', icon: '🔩', name: 'Do the stocktake in the back', pay: 50, feed: { hunger: -6, thirst: -6, energy: -10 }, game: count,
      first: 'Work? *He considers you over his glasses.* The stocktake\'s six months overdue. Count the bins, write it down, don\'t guess. Fifty dollars.',
      again: ['The back shelf this time. Count, don\'t guess.', 'Another row of bins. The pencil\'s on the string.'], rest: 'Rest your eyes a minute. Counting\'s harder than it looks.',
      thanks: ['Fifty. And you didn\'t guess. I can always tell.', 'Good. *He checks one bin, nods, doesn\'t check the rest.*'] },
    lowtide: { boss: 'Delia', title: 'Behind the bar', icon: '🍺', name: 'Pull pints for an hour', pay: 55, extra: 'and tips', feed: { hunger: -8, thirst: -8, energy: -12 }, game: pints, crave: 14,
      first: 'You want to work the bar? *Delia stops polishing.* ...Hon. You know what that is, for you. Every pint through your hands. *She sighs.* Fifty-five and tips. Fill to the line, no froth over the top.',
      again: ['Taps are yours. Fill to the line.', 'Friday crowd\'s in. Go steady.'], rest: 'Take ten, hon. Out the back, get some air. Not here.',
      thanks: ['Fifty-five, and the tips jar. You\'ve got a steady hand when you want one.', 'You did good. Now go home before the smell gets in your coat.'] },
  };

  async function work(key) {
    const J = SHIFTS[key], m = S(), w = m[key] || (m[key] = { n: 0, at: 0 });
    if (L2Bottle.needs().energy < TIRED) return say([{ name: J.boss, who: 'x', text: 'You\'re dead on your feet. Go and sleep, then come back and I\'ll find you something.' }]);
    if (Date.now() - w.at < REST) return say([{ name: J.boss, who: 'x', text: J.rest }]);
    await say([{ name: J.boss, who: 'x', text: w.n ? pickOne(J.again) : J.first }]);
    const res = await L2.ui.panel(J.title, done => J.game(done), { closeLabel: 'Stop' });
    if (!res) return say([{ name: J.boss, who: 'x', text: 'No harm done. Come back when you\'re ready.' }]);
    const pay = Math.round(J.pay * (1 + .5 * Math.max(0, Math.min(1, res.score))));
    w.n++; w.at = Date.now(); S().total = (S().total || 0) + pay;
    L2Money.earn(pay); L2Bottle.feed(J.feed);
    if (J.crave && !L2Bottle.path()) { L2Bottle.state.crave = Math.min(100, L2Bottle.state.crave + J.crave); L2Bottle.apply(); }
    App.count('l2_shift'); App.count('l2_shift_' + key); Career.checkAchievements();
    if (typeof L2Life !== 'undefined') L2Life.lift(4, 'honest work');
    await say([{ name: J.boss, who: 'x', text: `${pickOne(J.thanks)} *${fmt(pay)}${J.extra ? ' ' + J.extra : ''}.*` }]);
    if (J.crave && !L2Bottle.path()) L2.toast('🍺 Your hands smell of it. The craving is up.');
    return pay;
  }
  // a row on a menu or in a shop: "ask for a shift"
  function row(key) { const J = SHIFTS[key]; return { icon: J.icon, name: J.name, sub: `${fmt(J.pay)}${J.extra ? ' ' + J.extra : ''}, more if you do it well`, go: () => work(key) }; }

  /* ---------- the four jobs: each calls done({ score }) with 0..1 ---------- */
  function sink(done) {
    const wrap = h('div.l2-sink'), left = h('p.l2-read', 'Scrub every plate till it shines: tap each one until it\'s clean.'); let n = 8;
    for (let i = 0; i < 8; i++) {
      let dirt = 3; const p = h('button.l2-plate', { 'aria-label': 'Dirty plate', onclick: () => { if (!dirt) return; dirt--; p.style.setProperty('--dirt', dirt / 3); SFX.click && SFX.click(); if (!dirt) { p.classList.add('clean'); p.setAttribute('aria-label', 'Clean plate'); n--; left.textContent = n ? `${n} to go.` : 'Done. Rosie inspects one against the light and nods.'; if (!n) setTimeout(() => done({ score: 1 }), 600); } } });
      p.style.setProperty('--dirt', 1); wrap.append(p);
    }
    return h('div', left, wrap);
  }
  const STOCK = [['🥫', 'Baked beans', 'tins'], ['🥫', 'Tomato soup', 'tins'], ['🐟', 'Tinned tuna', 'tins'], ['🧃', 'Apple juice', 'drinks'], ['🥤', 'Cola', 'drinks'], ['💧', 'Spring water', 'drinks'], ['🍞', 'A white loaf', 'bread'], ['🥐', 'Croissants', 'bread'], ['🍩', 'Doughnuts', 'bread'], ['🧻', 'Toilet roll', 'home'], ['🧼', 'Washing-up liquid', 'home'], ['🔋', 'Batteries', 'home']];
  const AISLES = [['tins', '🥫 Tins'], ['drinks', '🧃 Drinks'], ['bread', '🍞 Bread & cakes'], ['home', '🧻 Household']];
  function shelves(done) {
    const items = Array.from({ length: 10 }, () => pickOne(STOCK)); let i = 0, miss = 0;
    const item = h('div.l2-job-item'), note = h('p.l2-read', 'Put each thing from the pallet on the right shelf.'), prog = h('p.l2-job-n');
    const show = () => { const [ic, nm] = items[i]; item.innerHTML = ''; item.append(h('span', ic), h('b', nm)); prog.textContent = `${i + 1} of ${items.length}${miss ? ` · ${miss} put back` : ''}`; };
    const btns = h('div.l2-job-opts', AISLES.map(([k, label]) => h('button.l2-btn', { onclick: () => {
      if (items[i][2] !== k) { miss++; note.textContent = pickOne(['Not there. Omar raises an eyebrow.', 'Wrong shelf. Try again.', '"That doesn\'t go there, my friend."']); item.classList.remove('shake'); void item.offsetWidth; item.classList.add('shake'); show(); return; }
      SFX.chip && SFX.chip(); i++; note.textContent = pickOne(['Good.', 'Right.', 'Next.']);
      if (i >= items.length) { note.textContent = 'The pallet is empty. Omar walks the aisles and nods.'; btns.querySelectorAll('button').forEach(b => { b.disabled = true; }); setTimeout(() => done({ score: Math.max(0, 1 - miss / 5) }), 700); return; }
      show();
    } }, label)));
    show(); return h('div.l2-job', note, item, prog, btns);
  }
  function count(done) {
    let round = 0, right = 0; const ROUNDS = 5, KINDS = [['🔩', 'bolts'], ['🔧', 'spanners'], ['🪛', 'screwdrivers'], ['🔑', 'key blanks'], ['🪝', 'hooks'], ['🔌', 'plugs']];
    const box = h('div.l2-bin'), note = h('p.l2-read', 'Count what\'s in each bin and tick the right number. Don\'t guess.'), prog = h('p.l2-job-n'), opts = h('div.l2-job-opts');
    const next = () => {
      if (round >= ROUNDS) { note.textContent = `${right} of ${ROUNDS} right. Sully writes it all down in pencil.`; setTimeout(() => done({ score: right / ROUNDS }), 700); return; }
      const [ic, nm] = pickOne(KINDS), n = 6 + Math.floor(Math.random() * 12);
      box.innerHTML = ''; for (let k = 0; k < n; k++) box.append(h('span', { style: { transform: `rotate(${Math.floor(Math.random() * 360)}deg)` } }, ic));
      prog.textContent = `Bin ${round + 1} of ${ROUNDS}: ${nm}`;
      const choices = [n, n + (Math.random() < .5 ? 1 : -1), n + (Math.random() < .5 ? 2 : -2)].sort(() => Math.random() - .5);
      opts.innerHTML = ''; choices.forEach(c => opts.append(h('button.l2-btn', { onclick: () => { if (c === n) { right++; SFX.chip && SFX.chip(); } round++; next(); } }, String(c))));
    };
    next(); return h('div.l2-job', note, prog, box, opts);
  }
  function pints(done) {
    const N = 5; let k = 0, good = 0, fill = 0, pouring = false, raf = 0, last = 0;
    const beer = h('i'), glass = h('div.l2-pint', beer, h('em')), note = h('p.l2-read', 'Hold the tap to pour. Let go between the two lines: not short, not over.'), prog = h('p.l2-job-n', `Pint 1 of ${N}`);
    const tick = now => { const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; if (pouring) { fill = Math.min(1.12, fill + dt * .42); beer.style.height = Math.min(100, fill * 100) + '%'; glass.classList.toggle('over', fill > 1); } raf = requestAnimationFrame(tick); };
    const start = e => { if (e) e.preventDefault(); if (k >= N) return; pouring = true; };
    const stop = () => {
      if (!pouring) return; pouring = false;
      const ok = fill >= .8 && fill <= .97; if (ok) good++;
      note.textContent = ok ? pickOne(['A good pint. Delia slides it down the bar.', 'Right on the line.', 'Perfect head on it.']) : fill < .8 ? 'Short. The man at the bar looks at it, then at you.' : 'Over the top. Froth down your wrist, and the smell of it.';
      k++;
      if (k >= N) { cancelAnimationFrame(raf); tap.disabled = true; setTimeout(() => done({ score: good / N }), 900); return; }
      setTimeout(() => { fill = 0; beer.style.height = '0%'; glass.classList.remove('over'); prog.textContent = `Pint ${k + 1} of ${N}`; }, 700);
    };
    const tap = h('button.l2-btn.go.l2-tap', { onpointerdown: start, onpointerup: stop, onpointerleave: stop, onpointercancel: stop, onkeydown: e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); }, onkeyup: e => { if (e.key === ' ' || e.key === 'Enter') stop(); } }, '🍺 Hold to pour');
    raf = requestAnimationFrame(tick);
    const el = h('div.l2-job', note, prog, glass, tap);
    new MutationObserver((_, ob) => { if (!el.isConnected) { cancelAnimationFrame(raf); ob.disconnect(); } }).observe(document.body, { childList: true, subtree: true });
    return el;
  }

  return { SHIFTS, work, row, get state() { return S(); } };
})();
