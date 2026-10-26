/* "The Seventeenth Card": the mystery that runs under the whole career.
   Act I   The Last Hand    Sal's final game at Kessler's Salon was rigged... and Sal knew.
   Act II  The Drowning     The next night Sal "drowned" off Lou's dock. Rebuild the night from
                            testimony and catch the lies by presenting evidence.
   Act III The Ledger       Sal faked his death to get Kessler's books. Four pieces of a vault
                            code are hidden in a coin, a baccarat road, a dice record and a
                            stacked shoe.
   Finale  The Invitational Sit across from Kessler while your crew opens his vault. Four endings.
   Progress is decided by fixed rules (so it is fair and works offline); the AI chat is told the
   case state and each character's secrets so free conversation stays consistent. */
const CLUES = {
  dollar: { act: 1, icon: '🪙', name: "Sal's silver dollar", text: 'Sal left it to you. A 1921 Peace dollar, heavier than it should be. Four tiny suit symbols are stamped around the rim: ♠ ♥ ♦ ♣.' },
  key: { act: 1, icon: '🗝️', name: "Sal's locker key", text: 'A brass key stamped "STARLITE 7". Dolores says Sal kept a lockbox at the Starlite Motel and swore his last game was crooked.' },
  photo: { act: 1, icon: '📷', name: 'Birthday photo', text: 'Doc\'s photo of Sal at his 50th birthday party, dated June 17. Sal is grinning in front of a cake shaped like a poker chip.' },
  card: { act: 1, icon: '🂭', name: 'Marked Queen of Spades', text: 'From Sal\'s lockbox. Tiny pinpricks along one edge, so someone could feel it in the dark. The back carries the Monte Royale crest.' },
  note: { act: 1, icon: '📜', name: "Sal's coded note", text: 'Also in the lockbox: scrambled capital letters in Sal\'s handwriting. Underneath: "Shift back by the decks in Kessler\'s shoe."' },
  decoded: { act: 1, icon: '🔓', name: 'Decoded note', text: 'KESSLER BROUGHT HIS OWN DECKS. OSCAR DEALT. HE WAS PAID IN BLUE.' },
  oscar: { act: 1, icon: '🗣️', name: "Oscar's confession", text: 'Oscar dealt Sal\'s last hand with Kessler\'s marked decks and was paid with a blue chip he later lost to Rico. His last words: "Sal knew the deck was marked. He played anyway. He WANTED to lose. And the next night he was dead."' },
  report: { act: 2, icon: '🚔', name: 'Police report', text: 'Salvatore "Sal" Benedetto, presumed drowned off Lucky Lou\'s dock the night after losing the Rusty Spur. Body never recovered. Coat pulled from the river at 3:00 AM by Captain Lou Beaumont. Ruled an accident.' },
  receipt: { act: 2, icon: '🧾', name: "Dolores's closing receipt", text: 'THE RUSTY SPUR · 1:28 AM · 1 coffee, black · paid by Sal. Sal never drank coffee when he was drunk.' },
  enginelog: { act: 2, icon: '📒', name: 'Riverboat engine log', text: 'In Lou\'s handwriting: "Engine started 2:10 AM. Out 40 min. Fog. — L.B." Found on the lectern aboard the Riverboat.' },
  yachtlog: { act: 2, icon: '🛥️', name: 'Waterlogged yacht log', text: 'A page from the guest log of the Baron\'s yacht, the Hollow Crown, snagged on the dock pilings: "M. Laval aboard 1:15 to 2:30 AM. S. Benedetto aboard 1:45 to 2:05 AM."' },
  payoff: { act: 2, icon: '💵', name: "Tex's confession", text: 'A man in a Monte Royale blazer paid Tex $500 to tell the police that Sal was drunk that night.' },
  sighting: { act: 2, icon: '👁️', name: "Nico's sighting", text: 'At 2:10 AM Nico watched Sal step onto Lou\'s riverboat, alive, carrying his suitcase. Sal waved at him. Vinnie told Nico to forget it.' },
  chip: { act: 2, icon: '🔵', name: 'The blue chip', text: 'A blue $10,000 chip engraved "A.K. PRIVATE #17": Kessler\'s payment to Oscar for dealing the marked cards. Rico won it from Oscar.' },
  postcard: { act: 2, icon: '✉️', name: 'A postcard signed 17', text: 'One of the postcards Rico gets every month, postmarked three different states. It just says: "Keep the number warm. — 17".' },
  confession: { act: 3, icon: '🕯️', name: "Doc's confession", text: 'Sal is alive. He lost the Spur on purpose to get close to Kessler\'s books, then faked his drowning with Lou and Doc\'s help when Kessler caught on. He left you the silver dollar for a reason.' },
  badge: { act: 3, icon: '🪪', name: "Mei's badge", text: 'Mei Lin, Special Investigator, State Gaming Commission. Sal was their informant. Kessler launders money through the casinos, with the Baron as his bagman. Sal hid Kessler\'s ledger in the Salon vault, behind an 8-digit code in four pieces.' },
  road: { act: 3, icon: '🖼️', name: 'Framed bead plate', text: 'On the Riverboat wall: the baccarat scoreboard from Sal\'s last shoe aboard, signed "For L., read it like I taught you. S." The beads: P B B P · P P B B.' },
  dice: { act: 3, icon: '🎲', name: "Sal's last rolls", text: 'Doc remembers Sal\'s last six rolls on Lou\'s boat: 3-1, 4-4, 2-5, 2-2, 6-1, 5-3. Sal\'s note in the margin: "Only the hard ones count."' },
};
const CODE = [
  { k: 'c1', from: 'dollar', label: 'The silver dollar', digits: '17' },
  { k: 'c2', from: 'road', label: 'The bead plate', digits: '63' },
  { k: 'c3', from: 'dice', label: 'The hard ways', digits: '84' },
  { k: 'c4', from: 'badge', label: 'The seventeenth card', digits: '29' },
];
const VAULT = CODE.map(c => c.digits).join('');

// statements you collect; a lie is broken by presenting the right evidence
const TESTIMONY = {
  dolores: { act: 2, time: '1:28 AM', text: 'Sal left the Spur at half past one. Sober as a judge, carrying that beat-up suitcase of his. Here, I still have the closing receipt.', gives: 'receipt' },
  lou: { act: 2, time: 'Midnight to 3 AM', text: 'Turned in at midnight and slept like a log till I found Sal\'s coat floating at three. Terrible business.', lie: 'enginelog', reply: '...Aye. I took her out at ten past two. Sal asked me to. That\'s all I\'ll say. Ask Doc why.' },
  tex: { act: 2, time: '1:40 AM', text: 'Saw Sal at 1:40 behind the motel, drunk as a skunk and hollerin\' about Kessler. Told the cops the same.', lie: 'receipt', reply: 'Aw, hell. Fine. A feller in a Monte Royale blazer gave me five hundred bucks to say Sal was drunk. I needed it for Vinnie.', yields: 'payoff' },
  nico: { act: 2, time: '2:00 AM', text: 'Vinnie sent me to the dock to remind Sal about his marker. I waited all night. Sal never came.', lie: 'enginelog', reply: '...The boat. Okay. At ten past two I saw Sal get on Lou\'s boat. Alive. He waved at me. Vinnie said forget it.', yields: 'sighting' },
  margot: { act: 2, time: 'All night', text: 'I was at Augustus\'s side in the Salon all night, darling. Ask anyone.', lie: 'yachtlog', reply: '*sighs* Fine. I met Sal on the Baron\'s yacht. He had a copy of Augustus\'s books and I wanted it. He refused. That\'s all.', flag: 'margotCaught' },
  baron: { act: 2, time: 'All night', text: 'The Hollow Crown was empty that night. I was at the Salon, naturally.', lie: 'yachtlog', reply: 'Hmph. Guests come and go. One does not keep track of peasants. Now leave me be.', flag: 'baronCaught' },
  rico: { act: 2, time: '', text: 'Sal taught me everything. Seventeen was HIS number before it was mine. Funny thing: every month somebody sends me a postcard signed "17".', gives: 'postcard' },
};
const PLAIN = 'KESSLER BROUGHT HIS OWN DECKS. OSCAR DEALT. HE WAS PAID IN BLUE.';
const SHIFT = 6; // every blackjack shoe in town, the Salon's included, holds six decks
const caesar = (txt, k) => txt.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + k + 260) % 26 + 65));
const CIPHER = caesar(PLAIN, SHIFT);
const OSCAR_ID = 'dealer:palace:bj', STERLING_ID = 'dealer:salon:bj';
// Kessler's stacked shoe: plain basic strategy never draws card #17 (the Queen with the last digits),
// but a deliberate line of hits does (e.g. hit twice on hand one, once on hand two).
const STACK = [[14, 0], [14, 1], [6, 3], [3, 2], [14, 3], [12, 1], [14, 2], [9, 0], [10, 1], [7, 3], [13, 0], [7, 2], [10, 3], [5, 1], [4, 0], [12, 3], [12, 0], [8, 1], [8, 2], [11, 3], [12, 2], [6, 0], [10, 2], [5, 3], [7, 0], [2, 1], [2, 3], [11, 0], [8, 3], [14, 1]].map(([r, s]) => ({ r, s }));
const CREW = {
  mei: { role: 'Law', icon: '🪪', name: 'Mei Lin', text: 'Brings a warrant and watches the shoe, so Kessler can\'t stack the final table. Needed to put Kessler behind bars.', ok: () => Mystery.has('badge') },
  margot: { role: 'Inside', icon: '🗝️', name: 'Margot Laval', text: 'Has a keycard to the vault corridor. Wants the ledger for herself; you\'d better know that going in.', ok: () => Mystery.st().act2Solved },
  vinnie: { role: 'Muscle', icon: '🦈', name: 'Vinnie & Nico', text: 'Keep Kessler\'s guards busy. Only trusts people who never needed a visit from Nico and have made four weekly payments on Sal\'s marker (or cleared it).', ok: () => !App.state.flags.everStruck && App.state.chapter >= 1 && (!App.state.loans.find(l => l.id === 'sal') || App.counter('vigPaid') >= 4) },
  tex: { role: 'Distraction', icon: '🤠', name: 'Tex Calhoun', text: 'Starts the loudest scene the Salon has ever seen. Only if you got him out from under Vinnie\'s thumb.', ok: () => !!App.state.flags.texRescued },
  rico: { role: 'Distraction', icon: '🕺', name: 'Rico Suave', text: 'Dances on the craps table. Owes Sal everything, and you have his chip.', ok: () => Mystery.has('chip') },
};

const Mystery = {
  st() { const s = App.state; if (!s.mystery) s.mystery = { clues: {} }; const m = s.mystery; m.clues = m.clues || {}; m.said = m.said || {}; m.broken = m.broken || {}; m.code = m.code || {}; m.crew = m.crew || {}; if (!m.clues.dollar) m.clues.dollar = 1; return m; },
  has(k) { return !!this.st().clues[k]; },
  give(k, quiet) {
    if (this.has(k)) return;
    this.st().clues[k] = App.state.day;
    if (!quiet) { UI.toast(`🔎 New evidence: ${CLUES[k].icon} ${CLUES[k].name}`, 'big'); SFX.win(); }
    App.news(`🔎 Evidence: ${CLUES[k].name}.`);
    App.save();
  },
  act() {
    const m = this.st();
    if (App.state.ending) return 5;
    if (!this.has('oscar')) return 1;
    if (!m.act2Solved) return 2;
    if (!CODE.every(c => m.code[c.k])) return 3;
    return 4;
  },
  codeKnown() { const m = this.st(); return CODE.map(c => m.code[c.k] ? c.digits : '··').join(' '); },
  act2Ready() { const m = this.st(); return this.has('report') && m.broken.lou && this.has('sighting') && this.has('payoff'); },

  lead() {
    const m = this.st(), st = App.state;
    if (st.ending) return `Case closed: ${ENDINGS[st.ending].title}.`;
    // Act I
    if (!this.has('key')) return 'Dolores at the Rusty Spur knew Sal better than anyone. Ask her about him (the bar menu has a Talk option).';
    if (!this.has('photo')) return 'Sal\'s lockbox at the Starlite Motel has a 4-digit lock labelled "my birthday, backwards". Doc, on the Riverboat, knew Sal for forty years.';
    if (!this.has('card')) return 'You know Sal\'s birthday. Walk into the Starlite Motel and open his lockbox. Dates are written MMDD.';
    if (!this.has('decoded')) return 'Decode Sal\'s note in the case file. Shift back by the number of decks in a blackjack shoe; the Paytables button at any blackjack table says how many.';
    if (!this.has('oscar')) return 'Find the dealer named in the note. A man like that gets fired and lands somewhere fancy: maybe the blackjack table at the Gilded Palace. He\'ll only talk if you scare him with real proof.';
    // Act II
    if (!this.has('report')) return 'Sal "drowned" the night after his last game. Dolores was the last friend to see him: ask her about that night.';
    if (!this.act2Ready()) {
      const todo = [];
      if (!m.said.lou) todo.push('hear Lucky Lou\'s story on the dock');
      if (!this.has('enginelog')) todo.push('look around aboard the Riverboat');
      if (!m.said.tex) todo.push('find Tex, who claims he saw Sal that night');
      if (!m.said.nico) todo.push('find Nico, who was waiting at the dock (he hangs around Vinnie\'s shop)');
      if (m.said.lou && this.has('enginelog') && !m.broken.lou) todo.push('catch Lou\'s lie on the case board');
      if (m.said.tex && this.has('receipt') && !m.broken.tex) todo.push('catch Tex\'s lie');
      if (m.said.nico && this.has('enginelog') && !m.broken.nico) todo.push('catch Nico\'s lie');
      return 'Rebuild the night of the drowning: ' + (todo.join('; ') || 'keep digging') + '. Margot, the Baron and Rico know things too.';
    }
    if (!m.act2Solved) return 'You have enough to answer it: what really happened to Sal on the river? Make your deduction on the case board.';
    // Act III
    if (!this.has('confession')) return 'Doc helped. Go to the Riverboat and make him tell you the truth.';
    if (!this.has('chip')) return 'Rico Suave holds Kessler\'s blue chip, the payment trail. Find him (Status shows where rivals are today) and answer his riddle.';
    if (!this.has('badge')) return 'Someone slipped a note under your door: "Commission business. Find me at the Riverboat. — M.L."';
    const left = CODE.filter(c => !m.code[c.k]).map(c => ({ c1: 'open Sal\'s silver dollar (case board)', c2: 'find something Sal left on the Riverboat\'s wall', c3: 'ask Doc about Sal\'s last rolls', c4: 'play Kessler\'s stacked shoe at the Salon blackjack table (talk to the dealer, Sterling; the Salon opens at 8 PM)' }[c.k]));
    if (left.length) return `Vault code ${this.codeKnown()}. Still to find: ${left.join('; ')}.`;
    // Finale
    return `You have the whole code. Recruit your crew on the case board, be in the top three of the rival standings, carry the ${fmt(INVITE_BUYIN)} buy-in, and take your seat at the Salon Invitational: any night on a day ending in 7, from 8 PM.`;
  },

  /* ---------- who says what first ---------- */
  opener(id) {
    const m = this.st(), st = App.state, act = this.act();
    if (st.ending) return this.afterLine(id);
    // Act I
    if (id === 'dolores' && !this.has('key')) { this.give('key'); return 'Sal swore on his mother that his last game at Kessler\'s Salon was crooked. Nobody believed him. He kept a lockbox in room 7 at the Starlite. Here, sugar: his key.'; }
    if (id === 'doc' && this.has('key') && !this.has('photo')) { this.give('photo'); return 'A lockbox with a birthday code? That\'s Sal all over. Look: his fiftieth. June the seventeenth. Best cake I ever ate.'; }
    if (id === OSCAR_ID && this.has('decoded') && !this.has('oscar')) return 'I... I don\'t know anything about the Salon. I just deal cards here now. Bets, please.';
    // Act II
    if (act === 2 || act === 3) {
      if (id === 'dolores' && !this.has('report')) { this.give('report'); return 'Oscar said that? That Sal wanted to lose? *sets down a glass* Sugar, Sal drowned the very next night. Off Lou\'s dock. They never found him. Here\'s the police report. I never believed a word of it.'; }
      if (this.has('report') && TESTIMONY[id] && !m.said[id]) {
        m.said[id] = st.day; const t = TESTIMONY[id];
        if (t.gives) this.give(t.gives);
        UI.toast(`🗒️ Statement added: ${CHARACTERS[id].name}`, 'good'); App.save();
        return t.text;
      }
      if (act === 2 && id === 'rico' && !this.has('chip')) return 'The blue chip? Ha! I won it fair and square from that nervous dealer. Tell me my lucky number and it\'s yours, papi.';
    }
    // Act III
    if (act >= 3 || m.act2Solved) {
      if (id === 'doc' && !this.has('confession')) {
        this.give('confession');
        return '*long silence* Sal is alive. There. Forty years I kept that man\'s secrets. He lost the Spur on purpose to get inside Kessler\'s books, and when Kessler caught on, Lou and I put him on that boat in the fog. He left you the silver dollar. He always said you were the one.';
      }
      if (id === 'rico' && !this.has('chip')) return 'Sal\'s ALIVE? I knew it! The postcards! Okay, okay: tell me my lucky number and the chip is yours.';
      if (id === 'mei' && this.has('confession') && this.has('chip') && !this.has('badge')) {
        this.give('badge');
        return '*shows a badge under the table* State Gaming Commission. Sal was my informant. Kessler washes millions through these tables, and the Baron carries the cash. That chip of yours is the payment trail we needed. Sal hid Kessler\'s ledger in the Salon vault: eight digits, four pieces. One piece is in Kessler\'s own blackjack shoe. I counted it for you. Don\'t lose your nerve.';
      }
      if (id === 'doc' && this.has('badge') && !this.has('dice')) { this.give('dice'); return 'Sal\'s last night on the boat, he rolled six times and wrote them down: three-one, four-four, two-five, two-two, six-one, five-three. Then he wrote "only the hard ones count" and laughed like a fool.'; }
      if (id === 'dolores' && this.has('confession') && !m.said.doloresAngry) { m.said.doloresAngry = st.day; return 'Alive. ALIVE. Three years I poured one out for that man every night. When you find him, sugar, you tell Sal Benedetto he owes me a very long conversation.'; }
      if (id === 'vinnie' && this.has('confession') && !m.said.vinnieTruth) { m.said.vinnieTruth = st.day; return 'Okay, kid, cards on the table. I\'m the one who told Kessler that Sal was copying his books. Kessler paid my debts off for the tip. Next week Sal was "drowned". I\'m not proud of it. You want help with Kessler? Keep your nose clean with me and maybe I\'m there.'; }
      if (id === STERLING_ID && this.has('badge') && !m.code.c4) return 'Mr. Kessler\'s private shoe. Six decks, arranged by hand. *the faintest smile* Would you like to play it?';
    }
    if (act === 4 && id === 'kessler') return 'You have the look of someone holding a very good card. The Invitational is played on nights ending in seven. I do hope you come.';
    return null;
  },
  afterLine(id) {
    const e = App.state.ending;
    const L = {
      justice: { dolores: 'Sal\'s back behind his own bar, griping about my prices. Best sound I ever heard.', vinnie: 'Kessler in cuffs. Bad for business. Good for my sleep.', mei: 'Ledger\'s in evidence. The Baron is singing like a canary. Thank you.', margot: 'Augustus in prison. I find I don\'t miss him at all.' },
      takeover: { dolores: 'Sal stopped by. He wouldn\'t say your name. Give him time, sugar.', mei: 'You had the ledger and you kept it. I won\'t forget.', margot: 'Look at you. You\'re Augustus now. Does the crown fit?' },
      doublecross: { dolores: 'Margot owns the Palace now. Sal says he\'s seen this movie before.', margot: '*raises a glass* No hard feelings, darling. It\'s just business.' },
    }[e] || {};
    return L[id] || null;
  },

  /* ---------- widgets inside conversations ---------- */
  panel(id, api) {
    const m = this.st(), st = App.state, wrap = h('div.case-panels');
    const box = (title, ...kids) => wrap.append(h('div.job-card', h('b', title), ...kids));
    if (st.ending) return null;
    // Oscar: show the right evidence
    if (id === OSCAR_ID && this.has('decoded') && !this.has('oscar')) {
      const row = h('div.ev-row');
      for (const k of this.owned()) row.append(h('button.btn.sm', { onclick: () => {
        if (k === 'card') { this.give('oscar'); api.say('*goes pale* That\'s one of the Salon decks. All right. Kessler brought his own cards and I dealt them. He paid me in blue; I lost the chip to Rico Suave. But listen: Sal KNEW. He felt that card and played anyway. He wanted to lose. And the next night he was dead.'); row.parentElement.remove(); }
        else api.say({ photo: 'A birthday party? So Sal liked cake.', key: 'A motel key. Congratulations.', dollar: 'An old coin. Lovely. Bets, please.' }[k] || 'Scribbles. Anyone could have written that.');
      } }, CLUES[k].icon + ' ' + CLUES[k].name));
      box('🔎 Show Oscar some evidence', h('p.muted.small', 'Pick the one thing that proves the Salon game was rigged.'), row);
    }
    // any witness with a statement can be pressed with evidence
    if (TESTIMONY[id] && m.said[id] && TESTIMONY[id].lie && !m.broken[id]) {
      box('🔎 Present evidence', h('p.muted.small', `"${TESTIMONY[id].text}"`), this.presentRow(id, api));
    }
    // Rico's riddle
    if (id === 'rico' && this.has('oscar') && !this.has('chip')) {
      const inp = h('input.field.sm#rico-guess', { inputmode: 'numeric', placeholder: 'Number', maxlength: 12 });
      box('🔎 Rico\'s riddle: "What\'s my lucky number?"', h('form.ev-row', { onsubmit: e => {
        e.preventDefault();
        const v = inp.value.trim().toLowerCase();
        if (v === '17' || v === 'seventeen') { this.give('chip'); api.say('SEVENTEEN! You listen! Take the ugly blue chip, it\'s bad juju anyway.'); inp.closest('.job-card').remove(); }
        else { api.say(`${inp.value}? Nope. Watch me play sometime. I shout it when I win big.`); inp.value = ''; }
      } }, inp, h('button.btn.sm.primary', 'Answer')));
    }
    // Kessler's stacked shoe at the Salon
    if (id === STERLING_ID && this.has('badge') && !m.code.c4) box('🔎 Kessler\'s stacked shoe', h('p.muted.small', 'Mei counted the shoe for you: you\'ll see every card in order. Get the 17th card dealt into YOUR hand.'),
      h('button.btn.sm.primary', { onclick: async () => { api.close(); await this.stackedShoe(); } }, 'Play the stacked shoe'));
    // The Invitational
    if (id === 'kessler' && this.act() === 4) box('🃏 The Salon Invitational', h('p.muted.small', this.inviteStatus().join(' · ')),
      h('button.btn.sm.primary', { onclick: async () => { api.close(); await this.invitational(); } }, 'Take your seat'));
    // Tex: rescue him from Vinnie
    if (id === 'tex' && !st.flags.texRescued && st.chapter >= 1 && st.mode === 'career') box('🤝 Get Tex out from under Vinnie', h('p.muted.small', 'Tex owes Vinnie $3,000 and it\'s eating him alive. Pay it off and he\'ll owe you instead.'),
      h('button.btn.sm', { disabled: st.bank < 3000, onclick: e => { if (!App.debit(3000)) return; st.flags.texRescued = st.day; api.say('You... you did what? Partner, I owe you my life. Anything you need. ANYTHING.'); e.target.closest('.job-card').remove(); App.news('🤝 You paid off Tex\'s marker with Vinnie.'); App.save(); } }, 'Pay $3,000'));
    return wrap.childNodes.length ? wrap : null;
  },
  owned() { return Object.keys(CLUES).filter(k => this.has(k)); },
  presentRow(id, api) {
    const row = h('div.ev-row'), m = this.st(), t = TESTIMONY[id];
    for (const k of this.owned()) row.append(h('button.btn.sm', { onclick: () => {
      if (k === t.lie) {
        m.broken[id] = App.state.day; if (t.flag) App.state.flags[t.flag] = App.state.day;
        if (t.yields && !this.has(t.yields)) this.give(t.yields);
        api.say(t.reply); UI.toast('💥 Contradiction! The story cracks.', 'big'); SFX.big();
        row.closest('.job-card') && row.closest('.job-card').remove(); App.save();
      } else api.say(RNG.pick(['And? What\'s that got to do with anything?', 'That doesn\'t prove a thing.', 'I don\'t see your point.']));
    } }, CLUES[k].icon + ' ' + CLUES[k].name));
    return row;
  },

  /* ---------- objects to examine around town ---------- */
  spots(m) {
    const act = this.act(), out = [];
    if (m.id === 'town' && (act === 2 || act === 3) && this.has('report') && !this.has('yachtlog')) out.push({ x: 46, y: 22, id: 'yachtlog', label: 'Something snagged on the dock pilings' });
    if (m.id === 'v:riverboat' && act === 2 && !this.has('enginelog')) out.push({ x: 24, y: 15, id: 'enginelog', label: 'The captain\'s lectern' });
    if (m.id === 'v:riverboat' && this.has('badge') && !this.has('road')) out.push({ x: 20, y: 1, id: 'road', label: 'A framed baccarat scoreboard' });
    if (m.id === 'v:salon' && act === 4) out.push({ x: 13, y: 1, id: 'vault', label: 'A plain steel door marked PRIVATE' });
    return out;
  },
  async examine(spot) {
    if (spot.id === 'vault') { await UI.dialog([{ who: 'narrator', text: 'Brushed steel, a keypad, and a guard who never blinks. Not tonight. Not without a crew and Kessler busy at his own table.' }]); return; }
    const intro = { yachtlog: 'Caught between the pilings, a soggy page of a ship\'s guest log.', enginelog: 'Lou\'s engine log lies open on the lectern, coffee rings and all.', road: 'A framed baccarat scoreboard, with Sal\'s handwriting in the corner.' }[spot.id];
    await UI.dialog([{ who: 'narrator', text: intro }]);
    this.give(spot.id);
  },

  /* ---------- the case board ---------- */
  async deduce() {
    const sel = (id, opts) => h('select.field#' + id, opts.map(o => h('option', { value: o[0] }, o[1])));
    const what = sel('d-what', [['', 'Choose…'], ['accident', 'He drowned by accident, like the police said'], ['nico', 'Nico drowned him on Vinnie\'s orders'], ['kessler', 'Kessler\'s men drowned him'], ['faked', 'He faked his death and left on Lou\'s boat']]);
    const who = sel('d-who', [['', 'Choose…'], ['loudoc', 'Lou and Doc'], ['vinnie', 'Vinnie'], ['margot', 'Margot'], ['tex', 'Tex']]);
    const ok = await UI.modal({ title: '🧠 What happened on the river?', body: h('div', h('label.lbl', { for: 'd-what' }, 'What happened to Sal?'), what, h('label.lbl', { for: 'd-who' }, 'Who helped make it happen?'), who), buttons: [{ label: 'Not yet', value: false, cls: 'ghost' }, { label: 'That\'s my answer', value: true, cls: 'primary' }] });
    if (!ok) return;
    if (what.value === 'faked' && who.value === 'loudoc') {
      this.st().act2Solved = App.state.day;
      App.news('🧠 Sal Benedetto never drowned.');
      await UI.dialog([{ who: 'narrator', text: 'A coffee at 1:28. A paid-off witness. An engine that "never started" at 2:10, and a man who waved from the deck. **Sal Benedetto never drowned.** Lou took him downriver in the fog, and only one other person could have planned it: Doc.' }]);
    } else await UI.dialog([{ who: 'narrator', text: what.value === 'faked' ? 'You\'re close. Who had a boat, and who planned everything Sal ever did?' : 'That doesn\'t fit the evidence. Who lied about the boat, and why was the witness paid to say Sal was drunk?' }]);
    App.save(); Router.refresh();
  },
  async coin() {
    const order = [], want = ['♣', '♦', '♥', '♠'];
    const disp = h('div.keypad-disp', '· · · ·'), msg = h('p.muted.small', 'Four tiny suits around the rim. Each one is a button. Doc once said Sal ranked everything "low to high, like bridge".');
    let pop;
    const press = s => {
      order.push(s); disp.textContent = order.concat(['·', '·', '·', '·']).slice(0, 4).join(' ');
      if (order.length === 4) {
        if (order.join('') === want.join('')) { this.st().code.c1 = App.state.day; SFX.big(); UI.toast('🪙 The coin clicks open: a slip of film reads "17"', 'big'); App.save(); pop.close(true); }
        else { disp.classList.add('shake'); msg.textContent = 'Nothing. The coin stays shut.'; setTimeout(() => { disp.classList.remove('shake'); order.length = 0; disp.textContent = '· · · ·'; }, 500); }
      }
    };
    pop = UI.modal({ title: "🪙 Sal's silver dollar", body: h('div', disp, h('div.keypad.suits', ['♠', '♥', '♦', '♣'].map(s => h('button.btn' + (s === '♥' || s === '♦' ? '.redsuit' : ''), { onclick: () => press(s) }, s))), msg) });
    return pop;
  },
  async readPiece(k) {
    const prompts = { c2: ['🖼️ Read the bead plate', CLUES.road.text, 'Sal read roads like binary: Player is 0, Banker is 1, four beads to a digit.'], c3: ['🎲 Sal\'s last rolls', CLUES.dice.text, 'Two digits. What were the hard ways?'] }[k];
    const inp = h('input.field#piece-in', { inputmode: 'numeric', maxlength: 4, placeholder: 'Two digits' }), msg = h('p.muted.small', prompts[2]);
    const piece = CODE.find(c => c.k === k);
    let pop;
    const body = h('div', h('p', prompts[1]), h('form.ev-row', { onsubmit: e => {
      e.preventDefault();
      if (inp.value.replace(/\D/g, '') === piece.digits) { this.st().code[k] = App.state.day; UI.toast(`🔐 Vault code piece: ${piece.digits}`, 'big'); SFX.big(); App.save(); pop.close(true); }
      else { msg.textContent = 'That doesn\'t feel right. ' + prompts[2]; inp.value = ''; }
    } }, inp, h('button.btn.sm.primary', 'Note it down')), msg);
    pop = UI.modal({ title: prompts[0], body });
    return pop;
  },
  // Kessler's shoe: same rules as the real table (dealer stands on all 17s, blackjacks end the hand)
  stackedShoe() {
    const vals = r => (r >= 10 && r <= 13 ? 10 : r === 14 ? 11 : r);
    const tot = cs => { let v = 0, a = 0; for (const c of cs) { v += vals(c.r); if (c.r === 14) a++; } while (v > 21 && a) { v -= 10; a--; } return v; };
    let i = 0, P = [], D = [], hand = 0, over = false;
    const strip = h('div.stack-strip'), mine = h('div.cards'), dealer = h('div.cards'), msg = h('p'), btns = h('div.actions');
    const drawStrip = () => {
      strip.innerHTML = '';
      STACK.forEach((c, k) => { const el = UI.card(c); el.classList.add('tiny'); if (k < i) el.classList.add('gone'); if (k === 16) el.classList.add('target'); strip.append(h('div.sc', h('small', k + 1), el)); });
    };
    let pop;
    const end = (won, text) => {
      over = true; msg.textContent = text; drawStrip();
      btns.innerHTML = '';
      if (won) { this.st().code.c4 = App.state.day; SFX.big(); UI.toast('🂭 The 17th card: a Queen of Spades with "29" pencilled on the back', 'big'); App.save(); btns.append(h('button.btn.primary', { onclick: () => pop.close(true) }, 'Take the Queen')); }
      else btns.append(h('button.btn', { onclick: () => { i = 0; hand = 0; over = false; start(); } }, 'Reshuffle the stack and try again'), h('button.btn.ghost', { onclick: () => pop.close(false) }, 'Leave'));
    };
    const take = who => {
      if (i === 16) { const q = STACK[i++]; (who === 'P' ? P : D).push(q); (who === 'P' ? mine : dealer).append(UI.card(q)); end(who === 'P', who === 'P' ? 'The 17th card slides to YOU. Sterling\'s face doesn\'t move. Yours does.' : 'The 17th card went to the dealer. Sterling sweeps it away.'); return null; }
      const c = STACK[i++]; (who === 'P' ? P : D).push(c);
      (who === 'P' ? mine : dealer).append(UI.card(c)); drawStrip(); return c;
    };
    const finishHand = () => {
      if (over) return;
      if (tot(P) <= 21) while (!over && tot(D) < 17) take('D');
      if (over) return;
      hand++; msg.textContent = `Hand ${hand} done: you ${tot(P)}, dealer ${tot(D)}. Next hand...`;
      btns.innerHTML = ''; btns.append(h('button.btn.primary', { onclick: () => start() }, 'Deal the next hand'));
    };
    const start = () => {
      if (hand >= 5) return end(false, 'The shoe is cut. You never drew the 17th card.');
      P = []; D = []; mine.innerHTML = ''; dealer.innerHTML = '';
      for (const w of ['P', 'D', 'P', 'D']) { if (!take(w) && over) return; }
      if (tot(P) === 21 || tot(D) === 21) {
        hand++; msg.textContent = 'Blackjack ends the hand.';
        btns.innerHTML = ''; btns.append(h('button.btn.primary', { onclick: () => start() }, 'Deal the next hand')); return;
      }
      msg.textContent = `Hand ${hand + 1}: you have ${tot(P)}. Hit or stand?`;
      btns.innerHTML = '';
      btns.append(h('button.btn.primary', { onclick: () => { if (take('P') === null) return; if (tot(P) > 21) { msg.textContent = 'Bust.'; finishHand(); } else msg.textContent = `You have ${tot(P)}.`; } }, 'Hit'),
        h('button.btn.primary', { onclick: () => finishHand() }, 'Stand'));
    };
    const body = h('div.stacked', h('p.muted.small', 'Every card in Kessler\'s shoe, in order (Mei\'s count). The gold one is card #17. Dealer stands on all 17s; a blackjack ends the hand; a bust ends your turn without the dealer drawing.'), strip,
      h('div.area-l', 'Dealer'), dealer, h('div.area-l', 'You'), mine, msg, btns);
    pop = UI.modal({ title: '🂭 Kessler\'s stacked shoe', body, wide: true });
    drawStrip(); start();
    return pop;
  },

  /* ---------- the finale ---------- */
  isInviteNight() { return App.state.day % 10 === 7; },
  inviteStatus() {
    const st = App.state, rank = Screens.rivalRank();
    return [
      (this.isInviteNight() ? '✔' : '✘') + ` Tonight is${this.isInviteNight() ? '' : ' not'} Invitational night (days ending in 7)`,
      (World.clock() >= 20 * 60 ? '✔' : '✘') + ' After 8 PM',
      (rank <= 3 ? '✔' : '✘') + ` Rival standings: #${rank} (top 3 needed)`,
      (st.bank >= INVITE_BUYIN ? '✔' : '✘') + ` ${fmt(INVITE_BUYIN)} buy-in`,
      `Crew: ${Object.keys(this.st().crew).filter(k => this.st().crew[k]).map(k => CREW[k].name).join(', ') || 'nobody yet'}`,
    ];
  },
  async invitational() {
    const st = App.state, m = this.st();
    const problems = this.inviteStatus().filter(s => s.startsWith('✘'));
    if (problems.length) { await UI.modal({ title: '🃏 Not tonight', body: h('ul.reqs', problems.map(p => h('li', p))) }); return; }
    const crew = Object.keys(m.crew).filter(k => m.crew[k] && CREW[k].ok());
    if (!await UI.confirm('The Salon Invitational', `Buy in for ${fmt(INVITE_BUYIN)} and sit across from Augustus Kessler. Your crew: ${crew.map(k => CREW[k].name).join(', ') || 'nobody'}. There is no backing out once the cards are in the air.`, 'Take your seat')) return;
    App.debit(INVITE_BUYIN);
    const has = r => crew.some(k => CREW[k].role === r);
    await UI.dialog([
      { who: 'narrator', text: 'Midnight. One table, one lamp, one man. Kessler shuffles without looking at the cards.' },
      { who: 'kessler', text: 'Before we begin. I keep files on everyone who sits at my table. Yours made for... interesting reading.' },
      ...Me.dossierLines().map(t => ({ who: 'kessler', text: t })),
      { who: 'kessler', text: 'Eight hands. My shoe. Shall we?' },
    ]);
    if (has('Law')) await UI.dialog([{ who: 'mei', text: '*from the rail, barely audible* I\'m watching his shoe. He can\'t stack it tonight. Play your game.' }]);
    const res = await Duel.play({ title: '🃏 The Salon Invitational: heads-up vs Kessler', foe: 'kessler', style: 'basic', hands: 8, stack: 100000, bet: 10000, cheat: !has('Law'), onLine: k => Duel.LINES.kessler[k], intro: 'Every hand you keep him at this table is another minute for your crew.' });
    const heldHim = res.handsPlayed >= 6 && res.me > 0;
    const beatHim = res.me > res.foe;
    if (beatHim) { App.credit(INVITE_BUYIN * 2.5); UI.toast(`🏆 You won the Invitational pot: ${fmt(INVITE_BUYIN * 2.5)}`, 'big'); }
    // the vault
    const inner = has('Inside') || has('Muscle');
    const covered = has('Distraction') || heldHim;
    let ending = null;
    if (!inner || !covered) {
      await UI.dialog([{ who: 'narrator', text: !inner ? 'Nobody got your crew past the vault corridor. The door stays shut.' : 'Kessler stands up early. The guards turn back toward the corridor. Your crew scatters.' }]);
      ending = 'bust';
    } else {
      await UI.dialog([{ who: 'narrator', text: has('Distraction') ? (crew.includes('tex') ? 'Across the room, Tex climbs onto the roulette table and starts singing. Every guard in the Salon turns to look.' : 'Rico leaps onto the craps rail in a silk shirt, shouting SEVENTEEN! Every guard in the Salon turns to look.') : 'You keep Kessler at the table hand after hand. Nobody watches the corridor.' },
        { who: 'narrator', text: has('Inside') ? 'Margot\'s keycard blinks green. The vault door sighs.' : 'Nico leans on the guard. Vinnie leans on the door. A keypad glows in the dark.' }]);
      const code = await this.vaultPad();
      if (!code) { await UI.dialog([{ who: 'narrator', text: 'The keypad flashes red twice and an alarm starts to wail. Your crew runs.' }]); ending = 'bust'; }
      else {
        if (crew.includes('margot') && !st.flags.margotCaught) {
          await UI.dialog([{ who: 'margot', text: '*takes the ledger from your hands, gently* Thank you, darling. Augustus\'s empire, in one little book. Don\'t take it personally.' }, { who: 'narrator', text: 'By the time you understand, Margot is gone. You never caught her lie about the night Sal died.' }]);
          ending = 'doublecross';
        } else {
          if (crew.includes('margot')) await UI.dialog([{ who: 'margot', text: '*reaches for the ledger, then stops* You know what I wanted that night on the yacht. Fine. Keep it. I\'ll take my satisfaction watching him fall.' }]);
          await UI.dialog([
            { who: 'narrator', text: 'The ledger is heavier than it looks. Every page is a crime. Footsteps behind you. You turn.' },
            { who: 'sal', text: () => `${Me.first() ? Me.first() + '. ' : ''}Hey, kid. Nice work. Sorry about the funeral.` },
            { who: 'sal', text: 'Three years I watched you from postcards. I needed someone Kessler had never seen, someone who\'d earn their way into this room honest. You did. Now: what do we do with that book?' },
          ]);
          const choice = await UI.modal({ title: '📕 The ledger', closable: false, body: h('div', h('p', 'Hand it to the Gaming Commission and end Kessler for good, or keep it and own the man.')),
            buttons: [{ label: 'Keep it. Own Kessler.', value: 'takeover' }, { label: has('Law') ? 'Give it to Mei' : 'Mail it to the Gaming Commission', value: 'justice', cls: 'primary' }] });
          ending = choice;
        }
      }
    }
    await this.end(ending);
  },
  vaultPad() {
    return new Promise(resolve => {
      let code = '', tries = 0;
      const disp = h('div.keypad-disp', '_ _ _ _ _ _ _ _'), msg = h('p.muted.small', `Pieces you collected: ${this.codeKnown()}`), pad = h('div.keypad');
      let pop;
      const press = d => {
        if (d === '⌫') code = code.slice(0, -1); else if (code.length < 8) code += d;
        disp.textContent = (code + '________').slice(0, 8).split('').join(' ');
        if (code.length === 8) {
          if (code === VAULT) { SFX.big(); pop.close(true); }
          else if (++tries >= 2) pop.close(false);
          else { disp.classList.add('shake'); msg.textContent = 'Red light. One more try before the alarm.'; setTimeout(() => { disp.classList.remove('shake'); code = ''; disp.textContent = '_ _ _ _ _ _ _ _'; }, 500); }
        }
      };
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].forEach(d => pad.append(h('button.btn', { onclick: () => press(d) }, d)));
      pop = UI.modal({ title: '🔐 Kessler\'s vault', body: h('div', disp, pad, msg), closable: false });
      pop.then(v => resolve(!!v));
    });
  },
  async end(ending) {
    const st = App.state, E = ENDINGS[ending];
    if (ending === 'bust') {
      st.flags.salonBanUntil = st.day + 7;
      await UI.dialog([{ who: 'kessler', text: 'A pity. You are banned from my Salon for a week. Do come back for the next Invitational. I so enjoy these little games.' }]);
      App.news('🚨 Alarm at the Monte Royale. Kessler banned a guest for a week.'); App.save(); Router.go('world'); return;
    }
    st.ending = ending;
    if (ending === 'justice') {
      // parity with the takeover: a whistleblower's reward and an honest stake in Kessler's old house
      if (st.items.spurDeed) App.credit(1000000); else st.items.spurDeed = st.day;
      App.credit(5000000); st.items.trustee = st.day; st.flags.justiceReward = true;
      st.rivals.baron.bank = 0; st.rivals.baron.where = 'jail';
    }
    if (ending === 'takeover') { App.credit(5000000); st.items.palaceDeed = st.day; }
    if (ending === 'doublecross') App.credit(250000);
    await UI.dialog(E.scenes);
    await Postcards.afterEnding(ending);
    App.news(`📖 Ending: ${E.title}.`);
    Career.checkAchievements(); App.save();
    await Career.checkChapter();
    Router.go('case');
    if (!st.l2) setTimeout(() => L2.wakeUp(true), 1200); // the dream is over: you wake up
  },

  /* ---------- for Claude ---------- */
  brief(id) {
    const m = this.st(), found = this.owned().map(k => CLUES[k].name);
    const truths = {
      dolores: 'You gave the player Sal\'s motel locker key and the police report about Sal\'s "drowning". You believe Sal is dead unless the player has learned otherwise (then you are furious with him).',
      doc: 'You and Lou faked Sal\'s death: Lou took Sal downriver in the fog at 2:10 AM. You keep this secret until the game\'s story reveals it; until then deflect, gently.',
      lou: 'You took Sal downriver at 2:10 AM to fake his death. You claim you slept through the night until the player shows your engine log in the game.',
      nico: 'You saw Sal board Lou\'s boat alive at 2:10 AM; Vinnie told you to forget it. You only admit it when shown evidence in the game.',
      tex: 'A Monte Royale man paid you $500 to tell police Sal was drunk. You only admit it when shown evidence in the game.',
      margot: 'You secretly met Sal on the Baron\'s yacht to buy a copy of Kessler\'s books. You want Kessler\'s empire for yourself.',
      baron: 'You are a broke fake aristocrat who carries Kessler\'s laundered cash; your yacht hosted Sal and Margot that night. Deny everything.',
      mei: 'You are an undercover State Gaming Commission investigator; Sal was your informant. Never reveal this before the game does.',
      rico: 'Sal mentored you; you get monthly postcards signed "17". You won Kessler\'s blue chip from Oscar.',
      vinnie: 'You tipped Kessler off that Sal was copying his books, for money; that is why Sal had to fake his death. You are ashamed of it.',
      kessler: 'You rigged Sal\'s last game with marked decks and keep a ledger of laundered money in your Salon vault. You suspect the player is up to something. Never admit anything.',
      [OSCAR_ID]: 'You dealt Sal\'s rigged last game. You are terrified and admit nothing unless shown real evidence in the game.',
      [STERLING_ID]: 'You deal Kessler\'s private stacked shoe and are loyal to him.',
    };
    // a character only "knows" to share their secret once the story has uncovered it; until then they keep a cover story
    const out = App.state.ending || this.has('confession'), br = k => !!(m.broken && m.broken[k]);
    const gate = {
      doc: [this.has('confession'), 'Publicly, Sal drowned off the Riverboat three years ago. You were aboard that night and hate talking about it; if asked whether Sal could be alive, you change the subject sadly.'],
      lou: [out || br('lou'), 'You say you slept through the night Sal drowned and saw nothing; you get loud and jolly when pressed.'],
      nico: [out || br('nico'), 'You say you know nothing about the night Sal drowned and that it is none of the player\'s business.'],
      tex: [this.has('payoff'), 'You told the police Sal was blind drunk that night, and you stick to that story.'],
      margot: [br('margot') || this.has('yachtlog'), 'You say you were at a charity dinner the night Sal died. You admired Sal and loathe Kessler, politely.'],
      baron: [this.has('yachtlog') || !!App.state.ending, 'You present yourself as genuine old European nobility, rich beyond question.'],
      mei: [this.has('badge'), 'You are a sharp, competitive card counter and a rival gambler; you have no other role to admit, and you deflect personal questions with probability talk.'],
      rico: [this.has('chip') || this.has('postcard'), 'Sal was your mentor and you miss him; you keep the details private.'],
      vinnie: [out, 'Sal owed you, now the player owes you. You don\'t discuss how Kessler got hold of the Spur.'],
      [OSCAR_ID]: [this.has('oscar'), 'You are a nervous dealer who used to work at the Monte Royale; you don\'t talk about that, ever.'],
    }[id];
    const secrets = gate ? (gate[0] ? truths[id] : gate[1]) : truths[id];
    return [
      `The mystery ("The Seventeenth Card"), act ${this.act()} of 4: the player has found ${found.join(', ')}. Current lead: ${this.lead()}`,
      secrets ? 'Your private knowledge: ' + secrets : '',
      'Never give away puzzle answers or reveal secrets the player hasn\'t uncovered: not codes, digits, decoded text, lucky numbers, who did it or what really happened. You may drop gentle hints that point toward where to look.',
      this.postcardBrief(id),
      Me.brief(),
    ].filter(Boolean).join(' ');
  },

  // the postcard trail, for the characters it touches (never the answers)
  postcardBrief(id) {
    const p = Postcards.st(); if (!p.got) return '';
    const about = { mel: 'Sal played "Seventeen" on your jukebox every Thursday and taped something under it.', vinnie: 'Sal pawned his gold watch with you the week he lost the Spur.', sparky: 'The player may bring you a chewed cassette of Sal\'s to repair.',
      'staff:mel': 'Sal played "Seventeen" on your jukebox every Thursday and taped something under it.', 'staff:philippe': 'Sal left a bottle of 1971 Bordeaux in your cellar for someone who would ask by bin number.', 'staff:pemberton': 'A gentleman left something in the piano bench three years ago.' }[id];
    return `The player is following postcards signed "17" (${p.solved} of 4 solved). ${about || ''} Never give the answers to the postcard puzzles.`;
  },

  /* ---------- Sal's lockbox at the motel (Act I) ---------- */
  lockboxRow(onDone) {
    if (!this.has('key') || this.has('card')) return null;
    return h('div.menu-row', h('span.mi', '🔐'), h('div.mn', h('b', "Open Sal's lockbox (room 7)"), h('small', 'A 4-digit lock. Scratched on the lid: "my birthday, backwards. S."')),
      h('button.btn.sm', { onclick: async () => { const ok = await this.keypad(); if (ok && onDone) onDone(); } }, 'Try the lock'));
  },
  keypad() {
    let code = '';
    const disp = h('div.keypad-disp', '_ _ _ _'), msg = h('p.muted.small', 'Scratched on the lid: "my birthday, backwards. S."');
    const pad = h('div.keypad');
    let pop;
    const press = d => {
      if (d === '⌫') code = code.slice(0, -1); else if (code.length < 4) code += d;
      disp.textContent = (code + '____').slice(0, 4).split('').join(' ');
      if (code.length === 4) {
        if (code === '7160') { this.give('card', true); this.give('note', true); UI.toast('🔓 The lockbox opens: a marked Queen of Spades and a coded note', 'big'); SFX.big(); pop.close(true); }
        else { disp.classList.add('shake'); msg.textContent = 'Click. Nothing. Try again.'; SFX.lose(); setTimeout(() => { disp.classList.remove('shake'); code = ''; disp.textContent = '_ _ _ _'; }, 500); }
      }
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].forEach(d => pad.append(h('button.btn', { onclick: () => press(d) }, d)));
    pop = UI.modal({ title: "🔐 Sal's lockbox", body: h('div', disp, pad, msg) });
    return pop;
  },
  decoder() {
    let k = 0;
    const out = h('div.cipher-out'), num = h('b.num');
    const answer = h('input.field#cipher-ans', { placeholder: 'Name', maxlength: 20, autocomplete: 'off' });
    const msg = h('p.muted.small');
    const render = () => { out.textContent = caesar(CIPHER, -k); num.textContent = String(k); };
    render();
    let pop;
    const body = h('div', h('p.muted.small', 'Sal\'s note, as written:'), h('div.cipher-in', CIPHER), h('p.small', 'Underneath: "Shift back by the decks in Kessler\'s shoe."'),
      h('div.cipher-dial', h('button.btn.sm', { onclick: () => { k = (k + 25) % 26; render(); } }, '◀'), h('span', 'Shift back by ', num), h('button.btn.sm', { onclick: () => { k = (k + 1) % 26; render(); } }, '▶')),
      out, h('label.lbl', { for: 'cipher-ans' }, 'Who dealt Sal\'s last hand?'),
      h('form.ev-row', { onsubmit: e => {
        e.preventDefault();
        if (answer.value.trim().toUpperCase() === 'OSCAR') { this.give('decoded'); pop.close(true); }
        else msg.textContent = 'That name isn\'t in the note. Keep turning the dial until the words make sense.';
      } }, answer, h('button.btn.sm.primary', 'Submit')), msg);
    pop = UI.modal({ title: '📜 Decode the note', body });
    return pop;
  },

  /* ---------- the case file screen ---------- */
  screen(main) {
    const m = this.st(), act = this.act(), st = App.state;
    const tabs = ['Board', 'Evidence', 'Testimony', 'Crew'].concat(Postcards.st().got ? ['Postcards'] : [], ['Whispers']);
    let tab = Mystery._tab || 'Board';
    const content = h('div'), tabBar = h('div.tabs');
    const render = () => {
      tabBar.innerHTML = ''; content.innerHTML = '';
      tabs.forEach(t => tabBar.append(h('button.tab' + (t === tab ? '.on' : ''), { onclick: () => { tab = Mystery._tab = t; render(); } }, t)));
      if (tab === 'Board') {
        const acts = [['I', 'The Last Hand', this.has('oscar')], ['II', 'The Drowning', !!m.act2Solved], ['III', 'The Ledger', act >= 4], ['IV', 'The Invitational', !!st.ending]];
        content.append(h('div.acts', acts.map(([n, t, done], i) => h('div.act' + (done ? '.done' : i + 1 === Math.min(act, 4) ? '.now' : ''), h('small', 'Act ' + n), h('b', t), h('span', done ? '✔ solved' : i + 1 === Math.min(act, 4) ? 'in progress' : 'locked')))));
        content.append(h('section.panel.story', h('div.kicker', st.ending ? 'Closed' : 'Next lead'), h('p', this.lead())));
        if (act >= 3) content.append(h('div.vault-code', h('small', 'Vault code'), h('b', this.codeKnown())));
        const tools = h('div.ev-row');
        if (this.has('note') && !this.has('decoded')) tools.append(h('button.btn.primary', { onclick: async () => { await this.decoder(); render(); } }, '📜 Decode Sal\'s note'));
        if (this.act2Ready() && !m.act2Solved) tools.append(h('button.btn.primary', { onclick: async () => { await this.deduce(); } }, '🧠 What happened on the river?'));
        if (this.has('badge') && !m.code.c1) tools.append(h('button.btn', { onclick: async () => { await this.coin(); render(); } }, '🪙 Examine the silver dollar'));
        if (this.has('road') && !m.code.c2) tools.append(h('button.btn', { onclick: async () => { await this.readPiece('c2'); render(); } }, '🖼️ Read the bead plate'));
        if (this.has('dice') && !m.code.c3) tools.append(h('button.btn', { onclick: async () => { await this.readPiece('c3'); render(); } }, '🎲 Work out the hard ways'));
        if (tools.childNodes.length) content.append(tools);
        if (act === 2 || act === 3) content.append(this.timeline());
      }
      if (tab === 'Postcards') content.append(Postcards.panel());
      if (tab === 'Whispers') content.append(Whispers.panel());
      if (tab === 'Evidence') content.append(h('div.shopgrid', this.owned().map(k => h('div.item', h('div.item-i', CLUES[k].icon), h('b', CLUES[k].name), h('p', CLUES[k].text)))));
      if (tab === 'Testimony') {
        const ids = Object.keys(TESTIMONY).filter(id => m.said[id]);
        content.append(ids.length ? h('div.testimony', ids.map(id => {
          const t = TESTIMONY[id], broken = m.broken[id];
          return h('div.stmt' + (broken ? '.broken' : ''), h('div.stmt-h', h('span.duel-face', Portrait.el(id)), h('b', CHARACTERS[id].name), t.time ? h('small', t.time) : null),
            h('p', `"${t.text}"`), broken ? h('p.good.small', '💥 ' + t.reply) : t.lie ? h('details', h('summary', 'Present evidence against this'), this.presentRow(id, { say: txt => { UI.toast(txt); render(); }, close() { } })) : null);
        })) : h('p.muted', 'No statements yet. They come in Act II.'));
      }
      if (tab === 'Crew') {
        content.append(h('p.muted.small', 'For the Invitational you need someone to get you into the vault corridor (Inside or Muscle) and either a Distraction or the nerve to keep Kessler at the table for six hands. Law puts him in prison and stops him stacking the deck.'));
        content.append(h('div.shopgrid', Object.keys(CREW).map(k => {
          const c = CREW[k], ok = c.ok(), on = !!m.crew[k];
          return h('div.item' + (on ? '.owned' : ok ? '' : '.dim'), h('div.item-i', c.icon), h('b', `${c.name} · ${c.role}`), h('p', c.text),
            ok ? h('button.btn.sm' + (on ? '' : '.primary'), { onclick: () => { m.crew[k] = !on; App.save(); render(); } }, on ? 'Remove from crew' : 'Recruit') : h('div.muted.small', '🔒 Not available yet'));
        })));
      }
    };
    main.append(h('div.casefile',
      h('div.lobby-h', h('button.btn.ghost.sm', { onclick: () => Router.go('world') }, '← Back to the map'),
        h('div', h('h2', '🔎 The Seventeenth Card'), h('p.muted', 'Sal swore his last game was rigged. Then he "drowned". Find out what really happened.'))),
      tabBar, content));
    render();
  },
  // the night of the drowning, assembled from what you know
  timeline() {
    const m = this.st(), rows = [];
    const add = (t, text, ok) => rows.push(h('li' + (ok === false ? '.lie' : ''), h('b', t), ' ', text));
    if (this.has('receipt')) add('1:28', 'Sal pays for a black coffee at the Spur (Dolores\'s receipt).');
    if (m.said.tex) add('1:40', m.broken.tex ? 'Tex was PAID to say Sal was drunk.' : 'Tex: "Sal was drunk behind the motel."', m.broken.tex ? true : false);
    if (this.has('yachtlog')) add('1:45', 'Sal boards the Baron\'s yacht; Margot is aboard (yacht log).');
    if (m.said.lou) add('0:00–3:00', m.broken.lou ? 'Lou admits he took the boat out at 2:10.' : 'Lou: "I slept all night."', m.broken.lou ? true : false);
    if (this.has('enginelog')) add('2:10', 'Riverboat engine starts. Out 40 minutes (engine log).');
    if (this.has('sighting')) add('2:10', 'Nico sees Sal board Lou\'s boat, alive.');
    if (this.has('report')) add('3:00', 'Lou "finds" Sal\'s coat in the river (police report).');
    return h('div', h('h3.sec', 'The night Sal "drowned"'), rows.length ? h('ul.timeline', rows) : h('p.muted.small', 'Nothing pinned yet.'));
  },
};

const INVITE_BUYIN = 100000;
const ENDINGS = {
  justice: { title: 'Justice', scenes: [
    { who: 'mei', text: 'Augustus Kessler, you\'re under arrest for money laundering, fraud and conspiracy. Baron, don\'t bother running; your yacht has been impounded.' },
    { who: 'kessler', text: '*straightens his cuffs* The house always wins. Eventually.' },
    { who: 'dolores', text: 'They\'re hanging the sign now. SAL\'S. And look who\'s behind the bar, pretending he never left.' },
    { who: 'sal', text: () => `Free drinks for life${Me.first() ? ', ' + Me.first() : ', kid'}. Well. Free coffee. I've seen the prices.` },
    { who: 'mei', text: 'One more thing. The Commission pays whistleblowers ten percent of what it seizes: **$5,000,000**. And somebody honest has to run the Monte Royale while it\'s wound up. You\'re the court\'s **trustee**, at $300,000 a day.' },
    { who: 'narrator', text: '🏆 **The Seventeenth Card: Justice.** The Spur is yours again, free and clear. The meters still climb and the tables never close: keep playing as long as you like.' },
  ] },
  takeover: { title: 'The New Kessler', scenes: [
    { who: 'kessler', text: '*reads the first page* So. What do you want?' },
    { who: 'narrator', text: 'Everything. By morning you own a controlling stake in the Gilded Palace and five million dollars of Kessler\'s money.' },
    { who: 'sal', text: 'I didn\'t fake my death so you could become him. *walks out without looking back*' },
    { who: 'narrator', text: '🏆 **The Seventeenth Card: The New Kessler.** Rich beyond counting, and very alone at the top. The tables never close.' },
  ] },
  doublecross: { title: 'Double-Cross', scenes: [
    { who: 'narrator', text: 'Within a week Kessler is arrested on an anonymous tip, and Margot Laval buys the Gilded Palace for a song.' },
    { who: 'sal', text: 'You trusted the wrong woman, kid. Happens to the best of us. Happened to me twice.' },
    { who: 'narrator', text: '🏆 **The Seventeenth Card: Double-Cross.** Kessler fell, but Margot rose. You kept the Invitational pot and a story nobody will believe. The tables never close.' },
  ] },
  bust: { title: 'Bust', scenes: [] },
};

ACHIEVEMENTS.push(
  { id: 'case', name: 'Not Drowned', desc: 'Prove what really happened to Sal on the river', test: () => !!(App.state.mystery && App.state.mystery.act2Solved), reward: 2500, swagger: 3 },
  { id: 'vault', name: 'Safecracker', desc: 'Find all four pieces of the vault code', test: () => !!(App.state.mystery && App.state.mystery.code && CODE.every(c => App.state.mystery.code[c.k])), reward: 5000, swagger: 3 },
  { id: 'justice', name: 'Justice', desc: 'Put Kessler behind bars', test: () => App.state.ending === 'justice', reward: 0, swagger: 15 },
  { id: 'kingpin', name: 'The New Kessler', desc: 'Keep the ledger', test: () => App.state.ending === 'takeover', reward: 0, swagger: 15 },
  { id: 'crossed', name: 'Double-Crossed', desc: 'Trust the wrong partner', test: () => App.state.ending === 'doublecross', reward: 0, swagger: 5 },
);
CHARACTERS.sal = { name: 'Sal Benedetto', face: '🎰', color: '#6b4a12' };
