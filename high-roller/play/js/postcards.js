/* The Seventeen Postcards: a side trail that runs alongside the main mystery. Once Oscar talks,
   postcards signed only "17" start reaching you. Each is a different puzzle that points at a room
   in town, and each solved card gives up a keepsake from Sal's life and the next card. The trail
   ends with a tape Sal recorded for you, which Sparky can only bring back to life once you know
   Sal is alive. Everything is decided by fixed rules, so it works offline and is always fair. */
const POSTCARDS = [
  { n: 1, front: '📮 A jukebox, glowing in the dark', place: "Mel's Diner",
    back: 'Some songs only play once a night. Ours lives where the pie is honest. Pick it, and tell Mel I sent you. — 17' },
  { n: 2, front: '📮 A pawn shop window, rain on the glass', place: "Vinnie's Pawn & Loan",
    back: 'My watch is in hock with a friend who isn\'t one. The ticket number is what a natural pays on a $10 bet at an honest table, times the decks in a crooked shoe. Four digits, zeros first. — 17' },
  { n: 3, front: '📮 A cellar door, a single candle', place: 'Prime Cut Steakhouse',
    back: 'Philippe keeps a bottle of mine in his cellar. The bin: the hard eight\'s dice side by side, then the hard ten\'s. Ask him nicely; he likes that. — 17' },
  { n: 4, front: '📮 A grand piano under a chandelier', place: 'The Grand Hotel',
    back: 'On the Grand\'s piano, spell what I ordered the night I "drowned". Say it the French way: the keys only know seven letters. — 17' },
];
const KEEPSAKES = {
  napkin: { icon: '🧻', name: 'A cocktail napkin', text: 'From the Spur, covered in Sal\'s handwriting: a doubling system, worked out to the last dollar and crossed out hard enough to tear the paper. Underneath: "Systems lose. People win. Find the watch."' },
  watch: { icon: '⌚', name: "Sal's gold watch", text: 'Engraved "S. — 17". It stopped at ten past two, and nobody ever wound it again.' },
  wine: { icon: '🍷', name: 'A 1971 Bordeaux', text: 'The year Sal and Doc met at a card table on the river. A tag on the neck: "For the night it\'s over. Not before."' },
  tape: { icon: '📼', name: 'A cassette marked "FIN — play last"', text: 'Found in the Grand\'s piano bench. The tape is chewed where the hinge caught it. Sparky at the Spur fixes anything with wires.' },
};
const Postcards = {
  st() { const m = Mystery.st(); if (!m.pc) m.pc = { got: 0, solved: 0, keep: {} }; return m.pc; },
  active() { const p = this.st(); return p.got > p.solved ? p.got : 0; }, // the card you're working on, if any
  keep(k) { return !!this.st().keep[k]; },
  give(k) { const p = this.st(); if (p.keep[k]) return; p.keep[k] = App.state.day; UI.toast(`🗝️ Keepsake: ${KEEPSAKES[k].icon} ${KEEPSAKES[k].name}`, 'big'); SFX.win(); App.save(); },
  async show(n, how) {
    const c = POSTCARDS[n - 1];
    await UI.modal({ title: `📮 Postcard ${n} of 4`, body: h('div.postcard', how ? h('p.muted.small', how) : null,
      h('div.pc-front', h('span', c.front)), h('div.pc-back', h('p', c.back), h('small', `Points to: ${c.place}`))), buttons: [{ label: 'Keep it', cls: 'primary' }] });
  },
  async receive(n, how) {
    const p = this.st(); if (p.got >= n) return;
    p.got = n; App.news(`📮 A postcard signed "17" (${n} of 4).`); App.save();
    await this.show(n, how);
  },
  // the first card arrives the morning after Oscar talks (or is waiting in Room 12)
  async morning() {
    if (App.state.mode !== 'career' || App.state.ending === 'bust') return;
    if (Mystery.has('oscar') && this.st().got === 0) await this.receive(1, 'Slipped under your door in the night. No stamp, no return address. The handwriting looks like the lockbox note.');
  },
  async solve(n, keep, lines, nextHow) {
    const p = this.st(); if (p.solved >= n) return;
    p.solved = n; App.count('postcards');
    await UI.dialog(lines);
    this.give(keep);
    if (n < 4) await this.receive(n + 1, nextHow);
    Career.checkAchievements(); App.save();
  },

  /* ---------- the four places ---------- */
  async jukebox() {
    const songs = ['Luck Be a Lady', 'The Gambler', 'Viva Las Vegas', 'Seventeen', 'Ace of Spades', 'Money (That\'s What I Want)'];
    const pick = await UI.modal({ title: '🎵 The jukebox', body: h('p.muted', 'A quarter a play. The selection hasn\'t changed since 1984.'), buttons: songs.map(s => ({ label: s, value: s })).concat([{ label: 'Walk away', value: null, cls: 'ghost' }]) });
    if (!pick) return;
    SFX.win(); UI.toast(`🎵 The jukebox plays "${pick}".`, 'good');
    if (pick === 'Seventeen' && this.active() === 1) {
      await this.solve(1, 'napkin', [
        { who: 'mel', text: '*stops wiping the counter* Haven\'t heard that one since... Sal played it every Thursday, regular as rent. *quiet* He taped something under that jukebox years ago. Said one day somebody would play our song and I should let them look.' },
        { who: 'narrator', text: 'Under the jukebox, held by yellowed tape: a napkin from the Spur, and another postcard.' },
      ], 'Folded inside the napkin.');
    } else if (pick === 'Seventeen') UI.toast('Mel smiles. "That was his song."', 'good');
  },
  async watchcase() {
    if (this.active() !== 2) { await UI.dialog([{ who: 'narrator', text: 'A glass case of pawned treasures: a saxophone, three wedding rings, and a gold watch engraved "S. — 17". The tag says NOT FOR SALE.' }]); return; }
    const inp = h('input.field#pc-ticket', { inputmode: 'numeric', maxlength: 4, placeholder: '0000', autocomplete: 'off' });
    const ok = await UI.modal({ title: '🎟️ Redeem a pawn ticket', body: h('div', h('p', 'Vinnie leans on the safe. "Ticket number, kid. No ticket, no watch."'), h('label.lbl', { for: 'pc-ticket' }, 'Ticket number'), inp), buttons: [{ label: 'Never mind', value: false, cls: 'ghost' }, { label: 'Hand it over', value: true, cls: 'primary' }] });
    if (!ok) return;
    if (inp.value.trim() === '0090') {
      await this.solve(2, 'watch', [
        { who: 'vinnie', text: 'Ticket ninety. *long look* Sal\'s watch. He hocked it the week he lost the Spur and never came back for it. Take it. And if you tell anybody I\'m sentimental, I\'ll deny it.' },
        { who: 'narrator', text: 'The watch stopped at 2:10. When you pry open the case back, a postcard folded small as a stamp falls into your palm.' },
      ], 'Folded inside the case back of the watch.');
    } else await UI.dialog([{ who: 'vinnie', text: RNG.pick(['That ticket\'s for a saxophone. You don\'t look like a sax guy.', 'Nope. Do the math again, kid. Honest table, crooked shoe.', 'Wrong ticket. Natural pays three to two, last I checked.']) }]);
  },
  async cellar(inside) {
    if (this.active() !== 3) { await UI.dialog([{ who: 'narrator', text: inside ? 'The bin book: every bottle down here, by its number, in Philippe\'s copperplate. Nothing in it is asking for you. Yet.' : 'The wine cellar. Philippe guards the key like a state secret.' }]); return; }
    const inp = h('input.field#pc-bin', { inputmode: 'numeric', maxlength: 4, placeholder: 'Bin', autocomplete: 'off' });
    const ok = await UI.modal({ title: '🍷 The wine cellar', body: h('div', h('p', 'Philippe raises one eyebrow. "Monsieur wishes to request a bin? By number, naturally."'), h('label.lbl', { for: 'pc-bin' }, 'Bin number'), inp), buttons: [{ label: 'Never mind', value: false, cls: 'ghost' }, { label: 'Ask nicely', value: true, cls: 'primary' }] });
    if (!ok) return;
    if (inp.value.trim() === '4455') {
      await this.solve(3, 'wine', [
        { who: 'philippe', text: 'Forty-four fifty-five. *a sharp breath* Monsieur Benedetto\'s Bordeaux. He told me one day someone would ask for it by its number, and that I should not be rude to them. *pause* I will try.' },
        { who: 'narrator', text: 'The bottle is thick with dust. Tucked behind the label, a postcard.' },
      ], 'Tucked behind the wine label.');
    } else await UI.dialog([{ who: 'philippe', text: RNG.pick(['That bin holds cooking wine. I am insulted on its behalf.', 'Non. The hard ways, monsieur. The dice must match.', 'There is no such bin. There is barely such a guest.']) }]);
  },
  // a playable piano: seven white keys; the right word opens the bench
  async piano() {
    const notes = { C: 261.6, D: 293.7, E: 329.6, F: 349.2, G: 392, A: 440, B: 493.9 }, played = [];
    const shown = h('div.pc-played', '…');
    let solved = false;
    const press = k => {
      tone(notes[k]); played.push(k); if (played.length > 8) played.shift();
      shown.textContent = played.join(' ');
      if (!solved && this.active() === 4 && played.slice(-4).join('') === 'CAFE') { solved = true; setTimeout(() => pop.close(), 500); }
    };
    const tone = f => {
      try {
        const ac = Postcards._ac || (Postcards._ac = new (window.AudioContext || window.webkitAudioContext)());
        const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
        o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.connect(g); o2.connect(g); g.connect(ac.destination); o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
      } catch (e) { }
    };
    const keys = h('div.pc-keys', Object.keys(notes).map(k => h('button.pc-key', { type: 'button', onclick: () => press(k), 'aria-label': 'Note ' + k }, k)));
    const pop = UI.modal({ title: '🎹 The Grand\'s piano', body: h('div', h('p.muted.small', this.active() === 4 ? 'Seven white keys, C to B. Mr. Pemberton pretends not to listen.' : 'You play whatever comes to mind. Mr. Pemberton applauds, politely.'), keys, shown), buttons: [{ label: 'Close the lid', cls: 'ghost' }] });
    await pop;
    if (solved) {
      await this.solve(4, 'tape', [
        { who: 'narrator', text: 'C. A. F. E. On the last note something clicks inside the piano bench. The lid lifts an inch.' },
        { who: 'pemberton', text: 'Oh dear. That bench has not opened in three years. A gentleman left something in it and asked me to forget he had. *clears throat* I have a very poor memory, sir.' },
        { who: 'narrator', text: 'Inside: a cassette in a cracked case. On the label, in the same hand as every postcard: "FIN — play last." The tape is chewed where the hinge caught it.' },
      ]);
    }
  },

  /* ---------- Sparky fixes the tape ---------- */
  sparkyPanel(api) {
    const p = this.st(), st = App.state;
    if (!this.keep('tape') || p.heard) return null;
    const box = h('div.job-card', h('b', '📼 The chewed cassette'));
    if (!p.fixDay) {
      if (!Mystery.has('confession')) box.append(h('p.small', 'Sparky turns it over in his hands and goes quiet. "I know this handwriting. I can fix it... but I think Doc should tell you something first. Go see him on the Riverboat."'));
      else box.append(h('p.small', '"Sal\'s tape. *swallows* Yeah. Leave it with me overnight. I\'ll splice it and put it on something that still plays."'),
        h('button.btn.sm.primary', { onclick: () => { p.fixDay = st.day; App.save(); api.say('Overnight. I promise I won\'t listen. ...Much.'); box.remove(); } }, 'Leave the tape with Sparky'));
    } else if (st.day <= p.fixDay) box.append(h('p.small', '"Still splicing. Come back tomorrow."'));
    else box.append(h('p.small', '"It\'s done. I put it on your laptop too, Room 12 at the Starlite. Or... I can play it right here. I\'ll step outside."'),
      h('button.btn.sm.primary', { onclick: async () => { api.close(); await this.playTape(); } }, 'Listen now'));
    return box;
  },
  tapeReady() { const p = this.st(); return this.keep('tape') && p.fixDay && App.state.day > p.fixDay; },

  /* ---------- the tape: Sal, to you ---------- */
  async playTape() {
    const p = this.st(), st = App.state, name = Me.first(), now = Me.now(), proj = Me.known();
    const perGame = st.stats.perGame || {}, fav = Object.keys(perGame).sort((a, b) => (perGame[b].rounds || 0) - (perGame[a].rounds || 0))[0];
    const favName = fav && GAMES[fav] ? GAMES[fav].name : null;
    const lines = [
      { who: 'narrator', text: 'Hiss. A chair creaks. Somebody clears their throat, a long way away and three years ago.' },
      { who: 'sal', text: `${name || 'Kid'}. If you're hearing this, you found all four. I knew you would. You always did read the table better than me.` },
      { who: 'sal', text: 'First thing: I\'m sorry about the funeral. Mine, I mean. I hear the flowers were cheap. Vinnie paid. Figures.' },
      { who: 'sal', text: `Doc keeps me posted. Day ${st.day} by now, maybe. You walked into this town with five hundred bucks and my debt, and ${st.stats.rounds ? `since then you've played ${st.stats.rounds.toLocaleString()} hands${favName ? `, mostly ${favName}` : ''}${st.stats.biggestWin > 0 ? `, and your best hand paid ${fmt(st.stats.biggestWin)}` : ''}` : 'and somehow you\'ve chased my ghost all over town without playing a single hand. Smart'}. He exaggerates, Doc. Not about you.` },
      proj.length ? { who: 'sal', text: 'He says you built yourself a machine to test doubling systems, and it told you the truth: every one of them loses. Took me forty years and a bar to learn that. Systems lose, kid. People win. Remember the napkin.' }
        : { who: 'sal', text: 'I used to think there was a system for everything. There isn\'t. There\'s people, and who you trust. Remember the napkin.' },
      { who: 'sal', text: 'The watch stopped at ten past two. That\'s when I stopped being Sal Benedetto. I let you think I was gone. I\'m not proud of that.' },
      { who: 'sal', text: 'Whatever you decide about Kessler, decide it like you, not like me. And the wine\'s for after. Open it with Dolores. Tell her I\'m sorry. Tell her first.' },
      { who: 'sal', text: `I don't know when you'll hear this. ${now.hour < 5 ? 'Late, I bet. Go to bed after, okay? You need it.' : now.hour < 12 ? 'Morning, maybe. Get some breakfast at Mel\'s on me.' : 'Evening, maybe. The tables are open. Go win something.'} Seventeen was always my number. Go make your own.` },
      { who: 'narrator', text: 'Click. The tape runs out into hiss. For a long moment, the only sound is the buzzing of the motel sign outside.' },
    ];
    await UI.dialog(lines);
    if (!p.heard) {
      p.heard = st.day; st.items.backSal = st.day;
      App.news('📼 You listened to Sal\'s tape.');
      UI.toast('🂠 Sal\'s card backs are yours (Shop → Table Style to equip)', 'big');
      Career.checkAchievements(); App.save();
    }
  },
  // after the story ends, the bottle gets opened
  async afterEnding(ending) {
    if (!this.keep('wine') || ending === 'bust' || this.st().opened) return;
    this.st().opened = App.state.day; App.save();
    const sal = ending !== 'takeover';
    await UI.dialog(sal ? [
      { who: 'narrator', text: 'That night, after the doors close, Dolores locks up and sets three glasses on the bar. You put the 1971 Bordeaux beside them.' },
      { who: 'sal', text: '*reads the tag, very quietly* "For the night it\'s over." *pours* Dolores, I\'m sorry. I should\'ve told you first.' },
      { who: 'dolores', text: 'You should\'ve told me EVER, you old fool. *clinks his glass anyway* Welcome home, Sal.' },
      { who: 'sal', text: `And you, ${Me.first() || 'kid'}. Four postcards and three years of trouble. Worth every one.` },
    ] : [
      { who: 'narrator', text: 'You open the 1971 Bordeaux alone in Kessler\'s old office. It\'s the best wine you\'ve ever tasted, and nobody is there to tell.' },
    ]);
  },

  /* ---------- the case file tab ---------- */
  panel() {
    const p = this.st(), out = h('div.postcards');
    const hint = { 1: 'Mel\'s Diner has a jukebox.', 2: 'A blackjack natural pays 3 to 2. The Paytables button at any blackjack table says how many decks are in a shoe.', 3: 'The hard ways are pairs: hard eight is 4 and 4. The craps paytables list them.', 4: 'What did Sal order at the Spur at 1:28 AM? Dolores\'s receipt knows. The piano only has keys A to G.' }[this.active()];
    if (this.active()) out.append(h('section.panel.story', h('div.kicker', 'Current postcard'), h('p', POSTCARDS[this.active() - 1].back), h('details', h('summary', 'Need a nudge?'), h('p.small', hint))));
    else if (p.solved >= 4 && !p.heard) out.append(h('section.panel.story', h('div.kicker', 'The tape'), h('p', this.st().fixDay ? (this.tapeReady() ? 'Sparky fixed the tape. It\'s on your laptop in Room 12 at the Starlite, or ask Sparky at the Spur to play it.' : 'Sparky is splicing the tape overnight.') : 'The cassette is chewed. Sparky, at the Spur, fixes anything with wires.')));
    else if (p.heard) out.append(h('section.panel.story', h('div.kicker', 'The tape'), h('p', 'You\'ve heard Sal\'s message.'), h('button.btn.sm', { onclick: () => this.playTape() }, '📼 Play it again')));
    out.append(h('h3.sec', 'Postcards'), h('div.shopgrid', POSTCARDS.filter(c => c.n <= p.got).map(c => h('div.item.pc-item', { onclick: () => this.show(c.n) }, h('div.item-i', '📮'), h('b', `${c.n}. ${c.place}`), h('p', c.back), c.n <= p.solved ? h('div.owned-l', '✔ Solved') : null))));
    const ks = Object.keys(KEEPSAKES).filter(k => p.keep[k]);
    if (ks.length) out.append(h('h3.sec', 'Sal\'s keepsakes'), h('div.shopgrid', ks.map(k => h('div.item', h('div.item-i', KEEPSAKES[k].icon), h('b', KEEPSAKES[k].name), h('p', KEEPSAKES[k].text)))));
    return out;
  },
};
