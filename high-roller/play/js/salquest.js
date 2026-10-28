/* Sal's Last Secret: a side job for after the story, when Sal is back (Level 1).
   1. Sal says what he left you is in Room 7 at the Starlite, the room he hid in before he "died".
      Darlene won't open it for anyone, unless you bring her a slice of Mel's cherry pie, the way Sal
      used to every Sunday.
   2. In Room 7: a brass key stamped 17, and a note. "Behind the horns. The year I won it all. The
      room I hid in. The number I never stopped betting." The lock behind the longhorns on the Spur's
      back wall has three dials; the answers are in town (the Golden Arrow photo at Mel's: 1984; the
      room: 7; the number: 17), not in the note.
   3. Behind the wall: the Seventeen Club, a speakeasy from the twenties that Sal kept to himself for
      forty years. A mahogany bar, a player piano, a wall of photographs, his old safe, and a faro
      bank: the game the West played before poker, which nobody in town has dealt since 1950.
   Faro: thirteen spades on the layout. Put chips on any card. Each turn the dealer draws two cards:
   the first loses (the bank takes bets on that rank), the second wins (bets on that rank pay even
   money). If both are the same rank, the bank takes half. The case-keeper's beads show how many of
   each rank are left. With three cards left you can call the turn: name their order for 4 to 1. */
const SalQuest = (() => {
  const st = () => App.state, F = () => App.state.flags;
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const fmtc = n => fmt(n);

  /* ---------- the wall at the Spur ---------- */
  function spots(m) {
    if (m.id !== 'v:spur') return [];
    if (F().clubOpen) return [{ x: 15, y: 1, id: 'club', label: '🚪 The Seventeen Club', door: true, glyph: '17' }];
    if (Quests.status('salDials') === 'active') return [{ x: 15, y: 1, id: 'salLock', label: 'Behind the longhorns: a little brass lock with three dials' }];
    return [];
  }
  // three dials, two digits each
  async function lock() {
    const vals = [0, 0, 0], tries = F().salTries || 0;
    let opened = false;
    const dials = vals.map((_, i) => {
      const out = h('b.sq-num', '00'), set = d => { vals[i] = (vals[i] + d + 100) % 100; out.textContent = String(vals[i]).padStart(2, '0'); SFX.click && SFX.click(); };
      return h('div.sq-dial', h('button.btn.ghost.sm', { onclick: () => set(1), 'aria-label': 'Up' }, '▲'), out, h('button.btn.ghost.sm', { onclick: () => set(-1), 'aria-label': 'Down' }, '▼'),
        h('div.sq-quick', [10, -10].map(d => h('button.btn.ghost.sm', { onclick: () => set(d) }, d > 0 ? '+10' : '−10'))));
    });
    const msg = h('p.muted.small', 'Sal\'s note: "The year I won it all. The room I hid in. The number I never stopped betting."' + (tries >= 2 ? ' (Mel keeps an old photo of Sal by her register. Darlene told you which room was his.)' : ''));
    const v = await UI.modal({ title: '🔒 Behind the longhorns', body: h('div', h('p', 'You lift the longhorns off their hook. Behind them, set into the planks, a little brass lock with three dials, polished by somebody\'s thumb.'), h('div.sq-dials', dials), msg),
      buttons: [{ label: 'Leave it', value: false, cls: 'ghost' }, { label: '🔓 Try it', value: true, cls: 'primary' }] });
    if (!v) return;
    if (vals[0] === 84 && vals[1] === 7 && vals[2] === 17) {
      opened = true; F().clubOpen = st().day; Quests.complete('salDials'); if (!Quests.status('salClub')) Quests.accept('salClub'); App.count('salClub'); App.save();
      await UI.dialog([{ who: 'narrator', text: 'Eighty-four. Seven. Seventeen. Something heavy clunks inside the wall, and a section of the planking swings back on hinges nobody knew were there.' }, { who: 'narrator', text: 'Stairs, going down. Warm light. Somewhere below, a piano is playing by itself.' }, { who: 'dolores', text: '...Forty years I\'ve worked this bar. FORTY YEARS. That old so-and-so.' }]);
    } else { F().salTries = tries + 1; App.save(); UI.toast('Clunk. The dials spin back to zero.', 'warn', tries >= 1 ? 'The answers are around town, not in the note.' : ''); }
    return opened;
  }

  /* ---------- Room 7 at the Starlite ---------- */
  async function room7() {
    const q = Quests.status('salKey');
    if (q !== 'active') return UI.dialog([{ who: 'narrator', text: F().salKey ? 'Room 7. Darlene has made the bed again, and left the window open an inch, the way Sal liked it.' : 'Room 7. Sal\'s room, Darlene says. She still won\'t rent it to anyone else.' }]);
    if (!F().hasPie) return UI.dialog([{ who: 'darlene', text: 'Seven? Nobody goes in Seven, hon. *She taps her cigarette.* Sal used to bring me a slice of Mel\'s cherry pie every Sunday. Every single Sunday, for twenty years. I miss that pie more than I miss some husbands.' }]);
    F().hasPie = false; F().salKey = st().day; App.save();
    await UI.dialog([
      { who: 'darlene', text: '*She opens the box, smells the pie, and closes her eyes.* ...He sent you. Course he did. *She takes a key off the board without looking.* Go on. Don\'t touch the radio, it\'s been tuned to the same station since 1979.' },
      { who: 'narrator', text: 'Room 7 smells of old cigars and Brylcreem. Under the mattress, taped flat: a brass key stamped 17, and an index card in Sal\'s handwriting.' },
      { who: 'narrator', text: '"Kid. Behind the horns. Three dials. The year I won it all. The room I hid in. The number I never stopped betting. Don\'t tell Dolores. — S."' },
    ]);
    Quests.complete('salKey'); if (!Quests.status('salDials')) Quests.accept('salDials'); // straight on to the lock
  }

  /* ---------- the Seventeen Club ---------- */
  async function photos() {
    await UI.dialog([
      { who: 'narrator', text: 'A wall of photographs in mismatched frames. Sal at twenty, all hair and teeth, holding a hand of four aces to the camera. Sal and Mel at the Golden Arrow, 1984. Sal in a sailor\'s cap on the deck of Lou\'s boat, both of them young and sunburnt.' },
      { who: 'narrator', text: 'A faro table in sepia, men in bowler hats crowded round it: the Seventeen Club, 1926, the year the town went dry. And in the corner, a newer one: you, small, on Sal\'s shoulders at the county fair, holding a goldfish in a bag like it was the crown jewels.' },
    ]);
  }
  async function safe() {
    if (F().salSafe) return UI.dialog([{ who: 'narrator', text: 'The safe stands open. Empty, except for a pack of cards with the cellophane still on, and a note: "For the next one."' }]);
    if (Quests.status('salClub') !== 'done') return UI.dialog([{ who: 'narrator', text: 'An old Mosler safe with a gold-leaf 17 on the door. Locked. Sal will know.' }]);
    F().salSafe = st().day; App.credit(17000); st().items.salWatch = st().day; App.count('salSafe'); App.save(); Router.hud(); Career.checkAchievements();
    await UI.dialog([{ who: 'narrator', text: 'The dial turns sweetly: 17, 17, 17. Inside: seventeen thousand dollars in old notes with a paper band round them, and Sal\'s pocket watch, the one he checked before every big hand.' }, { who: 'narrator', text: 'Engraved on the back: "Time is the only bank you can\'t beat. Spend it on people."' }]);
    UI.toast('⌚ Sal\'s Pocket Watch · +$17,000', 'award');
  }
  async function bar() {
    const c = await UI.modal({ title: '🥃 The bar at the Seventeen Club', body: h('p', 'Mahogany, brass, and a mirror gone silver-grey with age. Bottles with labels from countries that don\'t exist any more. Sal keeps one bottle of bootleg rye for special occasions and won\'t say what counts.'), buttons: [{ label: '☕ Coffee (on the house)', value: 'coffee' }, { label: '🥃 A finger of the rye ($17)', value: 'rye' }, { label: 'Nothing', value: null, cls: 'ghost' }] });
    if (c === 'coffee') { st().stamina = Math.min(st().staminaMax || 100, (st().stamina || 0) + 15); UI.toast('☕ Sal\'s coffee. Strong enough to stand a spoon in.', 'good'); }
    if (c === 'rye') { if (!App.debit(17)) return UI.toast('Seventeen dollars, kid. Even for family.', 'warn'); if (typeof Mood !== 'undefined' && Mood.drink) Mood.drink(); UI.toast('🥃 Bootleg rye from 1931. It tastes like smoke and somebody else\'s secrets.', 'good'); }
    App.save(); Router.hud();
  }
  async function pianola() {
    const tunes = [['riverboat', '🎹 A rag (it plays itself)'], ['spur', '🎵 A honky-tonk roll'], ['salon', '🌙 A slow blues roll'], ['palace', '🎷 A dance-band roll']];
    const v = await UI.modal({ title: '🎹 The player piano', body: h('p', 'A paper roll punched in 1925, and the keys going down by themselves as if somebody invisible is sitting there.'), buttons: tunes.map(([k, l]) => ({ label: l, value: k })).concat([{ label: 'Leave it', value: null, cls: 'ghost' }]) });
    if (!v) return; F().clubTune = v; App.save(); if (typeof Music !== 'undefined' && Music.refresh) Music.refresh(); UI.toast('🎹 The roll clicks over and the keys start moving.', 'good');
  }

  /* ---------- Faro ---------- */
  function newDeck() { const d = []; for (const s of ['♠', '♥', '♦', '♣']) for (let r = 0; r < 13; r++) d.push({ r, s }); return RNG.shuffle(d); }
  async function faro() {
    App.count('faroPlayed');
    let deck = newDeck(), soda = deck.shift(), chip = 25, bets = Array(13).fill(0), log = [], callTurn = null;
    const left = Array(13).fill(4); left[soda.r]--;
    const box = h('div.faro');
    const paint = () => {
      box.innerHTML = '';
      const turns = Math.floor((deck.length - 1) / 2);
      box.append(h('p.small', `Soda card: ${RANKS[soda.r]}${soda.s}. ${deck.length} cards in the box, ${turns} turns to go. Chip: `, ...[25, 100, 500, 1000].map(v => h('button.btn.sm' + (chip === v ? '.primary' : '.ghost'), { onclick: () => { chip = v; paint(); } }, fmt(v)))));
      box.append(h('div.faro-layout', RANKS.map((r, i) => h('button.faro-card' + (bets[i] ? '.bet' : '') + (!left[i] ? '.dead' : ''), { disabled: !left[i] && !bets[i], onclick: () => { if (!left[i]) return; if (!App.debit(chip)) return UI.toast('Not enough bankroll', 'warn'); bets[i] += chip; Router.hud(); paint(); }, oncontextmenu: e => { e.preventDefault(); if (bets[i]) { App.credit(bets[i]); bets[i] = 0; Router.hud(); paint(); } } },
        h('b', r + '♠'), h('span.faro-beads', '●'.repeat(left[i]) + '○'.repeat(4 - left[i])), bets[i] ? h('small', fmt(bets[i])) : null))));
      box.append(h('div.faro-row', h('button.btn.ghost.sm', { onclick: () => { bets.forEach((b, i) => { if (b) App.credit(b); bets[i] = 0; }); Router.hud(); paint(); } }, 'Take my chips back'),
        deck.length === 3 ? h('button.btn.sm', { onclick: callTheTurn }, `📣 Call the turn (4 to 1, ${fmt(chip)})`) : null,
        h('button.btn.primary', { disabled: deck.length < 3, onclick: deal }, deck.length < 3 ? 'The box is done' : '🂠 Deal the turn')));
      box.append(h('div.faro-log', log.slice(0, 5).map(l => h('p.small', l))));
    };
    const deal = () => {
      if (deck.length < 3) return;
      const lose = deck.shift(), win = deck.shift(); left[lose.r]--; left[win.r]--;
      let net = 0;
      if (lose.r === win.r) { const b = bets[lose.r]; if (b) { App.credit(b / 2); net -= b / 2; bets[lose.r] = 0; } log.unshift(`Split! ${RANKS[lose.r]}${lose.s} and ${RANKS[win.r]}${win.s}: the bank takes half.`); }
      else {
        if (bets[lose.r]) { net -= bets[lose.r]; bets[lose.r] = 0; }
        if (bets[win.r]) { App.credit(bets[win.r] * 2); net += bets[win.r]; App.count('faroWins'); }
        log.unshift(`Loser ${RANKS[lose.r]}${lose.s}, winner ${RANKS[win.r]}${win.s}.${net ? ` You ${net > 0 ? 'win' : 'lose'} ${fmt(Math.abs(net))}.` : ''}`);
      }
      if (net > 0) SFX.win && SFX.win(); else SFX.click && SFX.click();
      if (deck.length < 3) { bets.forEach((b, i) => { if (b) App.credit(b); bets[i] = 0; }); log.unshift(`The last card, "in hoc", is ${RANKS[deck[0].r]}${deck[0].s}. Sal shuffles a new box.`); deck = newDeck(); soda = deck.shift(); left.fill(4); left[soda.r]--; }
      Router.hud(); App.save(); paint();
    };
    async function callTheTurn() {
      const order = deck.slice(0, 3), names = order.map(c => RANKS[c.r]);
      const opts = [...new Set([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(p => p.map(i => names[i]).join(' · ')))];
      const guess = await UI.modal({ title: '📣 Call the turn', body: h('p', `Three cards left: ${[...names].sort().join(', ')}. Name the order: loser, winner, and the last card. Pays 4 to 1.`), buttons: RNG.shuffle(opts.slice()).map(o => ({ label: o, value: o })).concat([{ label: 'Never mind', value: null, cls: 'ghost' }]) });
      if (!guess) return;
      if (!App.debit(chip)) return UI.toast('Not enough bankroll', 'warn');
      const right = names.join(' · ') === guess;
      if (right) { App.credit(chip * 5); App.count('faroCalls'); UI.toast(`📣 Called it! ${fmt(chip * 4)}`, 'award'); } else UI.toast(`📣 It came ${names.join(' · ')}.`, 'warn');
      deal(); Career.checkAchievements(); // the last turn still settles the layout, and the hoc card goes back in the box
    }
    paint();
    await UI.modal({ title: '🂡 Faro · Sal\'s bank', wide: true, body: h('div', h('p.muted.small', 'Put chips on any card on the layout (right-click or "take back" to remove). Each turn the first card loses and the second wins: bets on the winner pay even money, bets on the loser go to the bank, and a pair splits (the bank takes half). The beads count how many of each are left.'), box), buttons: [{ label: 'Leave the table', cls: 'primary' }] });
    bets.forEach(b => { if (b) App.credit(b); }); Router.hud(); App.save();
  }
  return { spots, lock, room7, photos, safe, bar, pianola, faro, RANKS };
})();
