/* Whispers: secrets a character only shares once you've earned them, in your own words, through AI
   chat. The case board gives you a lead, never the question. When you raise the subject, the
   character doesn't just tell you: they ask you something back, and only someone who has done the
   legwork knows the answer (a time on a receipt, a name in a report, a number plate in a
   photograph). Answer well and they open up, a little at a time, until they tell you the secret.
   The game tracks every step itself, from what you type: the character is told where the
   conversation stands before each reply, and the secret only counts once you've answered every
   question. Level 1's are bits of the town's past with a little cash or a perk; Level 2's make up a
   hidden story that runs underneath the main one. */
const WHISPERS = [
  { id: 'suitcase', who: 'dolores', icon: '🧳', name: 'The empty suitcase', ready: () => Mystery.has('report'),
    hint: 'Dolores still goes quiet about the last thing she did for Sal at closing time.',
    asks: [{ q: 'You\'re asking about his last night like a cop. All right, cop: what time did Sal walk out of my bar? It\'s on the receipt I gave you.', a: /\b1[:.]?28\b|one[- ]twenty[- ]eight|half past one|\b1[:.]30\b/i, know: 'the time Sal left the Spur (Dolores\'s closing receipt)' }],
    topic: 'Sal\'s suitcase, his luggage, or what he was carrying the night he left',
    keys: /suitcase|luggage|bag|case|carry|carrying|pack/i,
    secret: 'When Sal left the Spur that night you lifted his suitcase onto the bar for him and it was nearly empty, light as a feather. A man running for his life packs heavy; a man who has already sent everything ahead packs light. It has bothered you for three years.',
    text: 'Sal\'s suitcase was almost empty the night he left the Spur. Whoever packs light for a "last night" already sent everything ahead.', cash: 300 },
  { id: 'river79', who: 'doc', icon: '🌊', name: 'The winter of \'79', ready: () => Mystery.has('report'),
    hint: 'Doc says the riverboat captain would walk through fire for Sal, and won\'t say why.',
    asks: [{ q: 'An old story, that. First tell me: in the police report, who pulled Sal\'s coat out of the river?', a: /\blou\b|beaumont|captain/i, know: 'who found Sal\'s coat (the police report)' }],
    topic: 'Lou, Lucky Lou, the riverboat captain, or why Lou and Sal were close',
    keys: /\blou\b|lucky lou|captain|riverboat|boat/i,
    secret: 'In the winter of 1979 Lou went through the ice on the river and Sal went in after him and dragged him out. Lou has said ever since that he owes Sal one life, and that he means to pay it back some day.',
    text: 'In the winter of \'79 Sal pulled Lucky Lou out from under the river ice. Lou has always said he owes Sal a life.', cash: 300 },
  { id: 'fog', who: 'lou', icon: '🌫️', name: 'Ordered fog', ready: () => Mystery.has('enginelog'),
    hint: 'Lou gets misty-eyed about the river that night, but only with someone who has read his log.',
    asks: [{ q: 'My log, is it? Then you tell me what time it says I started her up.', a: /\b2[:.]?10\b|ten past two/i, know: 'the start time in Lou\'s engine log' }],
    topic: 'the fog or the weather on the river that night',
    keys: /fog|mist|weather|river|night/i,
    secret: 'The fog that night rolled in at two on the dot, thick as wool, and Sal looked at it and laughed and said "the river owes me one". You have never seen fog come in that fast before or since.',
    text: 'The fog came in at two on the dot that night. Sal laughed at it: "the river owes me one."', cash: 400 },
  { id: 'marker', who: 'vinnie', icon: '💸', name: 'A dead man\'s payment', ready: () => App.state.mode === 'career' && Mystery.act() >= 2,
    hint: 'Vinnie has never explained the strange history of Sal\'s marker.',
    asks: [{ q: 'You wanna know how a dead man\'s marker works? First you tell me: what time did they fish his coat out of the river?', a: /\b3[:.]00\b|\b3 ?a\.?m\b|three (o\'?clock|in the morning|am)|\bthree\b/i, know: 'when Sal\'s coat came out of the river (the police report)' }],
    topic: 'Sal\'s marker, what Sal owed, or how much of the debt Sal paid off',
    keys: /marker|debt|owe|owed|loan|paid|pay/i,
    secret: 'A week AFTER Sal drowned, an envelope of cash arrived at your office paying down part of his marker, no note, postmarked three states away. You pocketed it and never told anyone, because dead men do not pay their debts. Since the player asked straight, you grudgingly knock five hundred dollars off what they owe you.',
    text: 'A week after Sal "drowned", someone paid down part of his marker in cash, postmarked three states away. Vinnie knocked $500 off your debt to keep it quiet.',
    perk: () => { const l = (App.state.loans || []).find(x => x.id === 'sal') || (App.state.loans || [])[0]; if (l && l.balance > 0) { l.balance = Math.max(0, round2(l.balance - 500)); return 'Vinnie knocks $500 off your debt.'; } App.credit(500); return 'Vinnie slides you $500 to keep quiet.'; } },
  { id: 'tap', who: 'mei', icon: '👆', name: 'The double tap', ready: () => Mystery.act() >= 2,
    hint: 'Mei has been watching Kessler\'s dealers very closely.',
    asks: [{ q: 'You want to talk about Kessler\'s dealers? Show me you\'ve done the work. Who dealt Sal\'s last hand?', a: /oscar/i, know: 'who dealt Sal\'s last game' }],
    topic: 'Kessler\'s dealers, Sterling, or how the Salon cheats',
    keys: /sterling|dealer|salon|kessler|cheat|rig|stack/i,
    secret: 'You have watched Sterling, the Salon\'s blackjack dealer, for months: he taps the shoe twice before he deals from a stacked deck. You share it as a card player\'s observation, nothing more.',
    text: 'Sterling, the Salon\'s blackjack dealer, taps the shoe twice before dealing from a stacked deck.', cash: 500 },
  { id: 'gift', who: 'rico', icon: '🕴️', name: 'The first suit', ready: () => true,
    hint: 'Rico\'s wardrobe has a story. He\'ll tell it to someone who knows whose number seventeen was first.',
    asks: [{ q: 'Everybody asks about the suit. Nobody asks whose lucky number seventeen was before it was mine. You know?', a: /\bsal\b|salvatore|uncle|benedetto/i, know: 'whose number 17 was first' }],
    topic: 'Rico\'s clothes, his suit, his style or his look',
    keys: /suit|clothes|style|outfit|look|dress|jacket|wardrobe|fashion/i,
    secret: 'Your very first good suit, the white one, was a gift from Sal before your first big game. He said "dress like you already won, kid, and the table believes you". You still wear it on nights that matter.',
    text: 'Sal bought Rico his first good suit: "Dress like you already won, kid, and the table believes you."', cash: 200 },
  { id: 'pie', who: 'staff:mel', icon: '🥧', name: 'Mel\'s secret ingredient', ready: () => true,
    hint: 'Mel won\'t give up the pie recipe to just anyone.',
    asks: [{ q: 'Thirty years I been baking it. You know who talked me into the secret? A regular. Go on, guess.', a: /\bsal\b|salvatore|uncle|benedetto/i, know: 'which regular has eaten at Mel\'s for thirty years' }],
    topic: 'the pie, the recipe, or the secret ingredient',
    keys: /pie|recipe|ingredient|secret|bake|cherry/i,
    secret: 'The secret in your cherry pie is a pinch of black pepper and a splash of Sal\'s cheap whiskey, his idea, thirty years ago. You only tell people who ask nicely. From now on, pie is on the house for them.',
    text: 'Mel\'s cherry pie has black pepper and a splash of cheap whiskey in it, Sal\'s idea. Pie at Mel\'s is now on the house for you.',
    perk: () => { App.state.flags.freePie = 1; return 'Pie at Mel\'s is free from now on.'; } },
  { id: 'father', who: 'kessler', icon: '🎩', name: 'The first casino', ready: () => Mystery.act() >= 2,
    hint: 'Kessler never speaks of where he came from.',
    asks: [{ q: 'You presume to ask about my past. Then tell me first what was engraved on the chip I paid that dealer with, since you know so much.', a: /a\.?\s?k\.?\s*private|#\s?17|\bprivate\b/i, know: 'the engraving on the blue chip' }],
    topic: 'Kessler\'s past, his father, his childhood or his first casino',
    keys: /father|dad|family|past|young|child|grew|first casino|start|began|where.*from/i,
    secret: 'Your father ran an honest card room in a river town and went broke because a bigger house cheated him out of it. You swore nobody would ever beat you at the table again. You let it slip coldly and regret it at once.',
    text: 'Kessler\'s father ran an honest card room until a bigger house cheated him out of it. Kessler swore no one would ever beat him again.', cash: 750 },
  { id: 'darts', who: 'mick', icon: '🎯', name: 'The Arrow\'s secret', ready: () => true,
    hint: 'Mick doesn\'t share how he throws so steady after a few pints.',
    asks: [{ q: 'Tell you what. Guess how many pints I have before a match, and if you\'re right I\'ll tell you the rest.', a: /\b(one|1|just the one|a single)\b/i, know: 'a guess at how many pints steady a hand' }],
    topic: 'his darts technique, his throwing, or how he stays steady',
    keys: /dart|throw|aim|steady|technique|trick|tip|secret/i,
    secret: 'Your trick is to breathe out, slow, and throw at the bottom of the breath. One pint steadies you; three and you are throwing at the jukebox. You tell the player because you like them.',
    text: 'Mick throws at the bottom of a slow breath out. Your darts are a touch steadier from now on.',
    perk: () => { App.state.flags.steadyHand = 1; return 'Your darts are a touch steadier from now on.'; } },

  /* ---------- Level 2: the man on Calder Street ---------- */
  { id: 'eddie', l2: true, who: 'l2:delia', icon: '🫙', name: 'The second tip jar', ready: () => !!(L2.state.clues.cutting && L2.state.clues.delia),
    hint: 'Delia keeps a second tip jar under the bar. It isn\'t for her.',
    topic: 'the drifter the police blamed, Eddie Marsh, or the second tip jar under the bar',
    keys: /drifter|homeless|eddie|marsh|blamed|arrested|jar|tips?\b|the man they/i,
    asks: [
      { q: 'Why would you care about him now? A year, and nobody asked. Everybody says it happened around ten. You had a message from Nora that night: what time did she leave it?', a: /\b9[:.\s]?41\b|nine[- ]forty[- ]one|\b21[:.]?41\b/i, know: 'the time of Nora\'s last message (her voicemail)',
        give: 'Then you know they had it wrong from the start. His name was Eddie. Eddie Marsh. He came in most nights at closing for soup and the heater and never once caused me trouble. The jar is for his sister, June. She\'s still paying for his plot.' },
      { q: 'The paper said where they picked Eddie up the next morning. You read it? Where was it?', a: /calder|bus shelter|bus stop/i, know: 'where Eddie was arrested (the newspaper cutting)' },
    ],
    secret: 'At ten past ten that night Eddie came into the Low Tide soaked through and shaking, saying "I called them, I called them, they didn\'t come in time." He had been sheltering at the bus stop on Calder Street, across from the player\'s house, and saw a big man and a grey car, and phoned for help from the payphone there. He was in front of you, by the heater, from ten past ten until you closed. You told the police. Nobody wrote it down.',
    text: 'Eddie Marsh, the man they blamed, was at the Low Tide from 10:10 that night, soaked and shaking: "I called them, I called them." He had seen a big man and a grey car from the bus shelter on Calder Street, and phoned for help from the payphone there.',
    perk: () => L2.clue('eddie') || 'New evidence: what Eddie saw' },
  { id: 'call', l2: true, who: 'l2:mori', icon: '☎️', name: 'The 9:47 call', ready: () => !!(L2.state.clues.eddie && L2.state.clues.rabbit),
    hint: 'Mori kept something from that night\'s call log that she was told to throw away.',
    topic: 'the emergency calls that night, a payphone, the call log, or Eddie Marsh',
    keys: /call|999|911|112|emergency|payphone|phone ?box|calder|eddie|marsh|\blog\b/i,
    asks: [
      { q: 'People tell me all sorts about that night. Tell me where Eddie Marsh was at ten past ten, and who saw him there.', a: /low tide|delia|\bthe bar\b|\bbar\b/i, know: 'where Eddie was at 10:10, and who saw him',
        give: 'Then he was nowhere near your house when they said he was. All right. There\'s a call from that night I have never been able to put down: 9:47, from the payphone on Calder Street, a frightened man.' },
      { q: 'He described the car and got part of the plate before the line went. If you have the whole plate, give it to me. Every letter, every number.', a: /v\W*l\W*h\W*9\W*1\W*7/i, know: 'the car\'s number plate (Nora\'s photograph, from the pieces you dreamed)' },
    ],
    secret: 'The call came in at 9:47 PM from the Calder Street payphone. A man who gave his name as Eddie said a big man in a dark coat had gone into the house and a grey car with a casino permit on the windscreen was outside, plate starting V-L. At 2 AM that night someone using a dispatcher\'s login changed the time to 10:07, after the deaths, so it looked like the drifter had called it in himself. You printed the original before it changed and have kept it in your desk for a year. VLH 917 is registered to V. Holdings: Augustin Vale. The man who called for help is the man they blamed, and now you can prove it.',
    text: 'The emergency call came from the Calder Street payphone at 9:47 PM, from a man who gave his name as Eddie. Someone changed the log to 10:07 that night to make him look guilty. The car he described, VLH 917, is registered to V. Holdings. Mori kept the original printout.',
    perk: () => L2.clue('call') || 'New evidence: the 9:47 call' },
  { id: 'june', l2: true, who: 'l2:okafor', icon: '🕯️', name: 'June', ready: () => !!L2.state.clues.call,
    hint: 'Dr. Okafor once asked if you had ever thought about the other family that night.',
    topic: 'Eddie Marsh, his family, his sister June, or the other family that night',
    keys: /eddie|marsh|june|sister|other family|his family/i,
    asks: [
      { q: 'If you could say one thing to his family, what would it be? Take your time. Say it to me first.', a: /sorry|thank|truth|cleared?|his name|innocent|he called|tried to help|tried to save|wasn'?t him/i, know: 'what you would say to Eddie\'s family' },
    ],
    secret: 'You know Eddie\'s sister, June Marsh: she comes to the hospital chapel group on Thursdays, the same one you suggested to the player. She buried Eddie at Greenhill, the same cemetery as Nora and the children, second row from the gate, under a tree. She has never believed he did it. Tell the player gently that she would want to hear what they just said, and that she visits on Saturday mornings.',
    text: 'Eddie\'s sister June comes to the hospital chapel on Thursdays. Eddie is buried at Greenhill, the same cemetery as Nora and the children, second row from the gate.',
    perk: () => { L2.set('june'); return 'You know where Eddie is buried'; } },

  /* ---------- Level 2: the white tulips (found only by talking: Ida, then Hollis, then Ruth) ---------- */
  { id: 'tulips', l2: true, who: 'l2p:ida', icon: '🌷', name: 'Saturday\'s tulips', ready: () => L2.has('sawFlowers'),
    hint: 'Ida sees everyone who buys flowers on Meridian Avenue.',
    topic: 'flowers, white tulips, the graves at Greenhill, or who has been leaving flowers',
    keys: /flower|tulip|grave|greenhill|cemetery|lilies|bouquet|who.*(leav|bring)/i,
    asks: [{ q: 'Flowers, is it? I sell a few from the bucket. A man buys some for three graves, every week. Before I tell you anything about anybody: whose graves would those be? Their names, love.', a: /(ellie|nora)[\s\S]*(sam|ellie|nora)/i, know: 'the names on the three graves (Nora, Ellie and Sam)' }],
    secret: 'Every Saturday at six in the morning a big man with a grey moustache, limping on his left side, buys the early edition and three white tulips from your bucket. He pays in Meridian dollar coins and wears a Meridian security jacket under his raincoat. He told you once he works the back door, nights. He catches the 14 bus towards Greenhill. He always looks like he has not slept.',
    text: 'A big man in a Meridian security jacket, grey moustache, limping on his left side, buys three white tulips from Ida every Saturday and takes the bus to Greenhill. He works the casino\'s back door, nights.',
    perk: () => { L2.set('wTulips'); return 'A man from the Meridian leaves the tulips'; } },
  { id: 'backdoor', l2: true, who: 'l2p:hollis', icon: '🚪', name: 'The back door', ready: () => L2.has('wTulips'),
    hint: 'Hollis limps on his left side. He used to work nights on the back door.',
    topic: 'the tulips, Greenhill, Saturdays, the back door, or the night of the seventeenth last year',
    keys: /tulip|flower|greenhill|grave|saturday|back door|that night|last year|october|seventeenth|17th/i,
    asks: [{ q: '*He goes very still.* Who sent you? ...No. Don\'t. Tell me one thing first, so I know you\'re who I think you are. What colour are the tulips?', a: /white/i, know: 'the colour of the tulips on the graves (white)' }],
    secret: 'You were on the Meridian\'s back door the night of 17 October last year. At 9:31 Mr. Vale\'s grey car went out with Cal Rourke driving; at 10:52 it came back and Rourke\'s coat was soaked. You logged both. The next morning Rourke tore the page out of the door log in front of you and you said nothing, because you have a daughter at college and a mortgage. You photocopied the page before your shift ended and keep it folded in a Bible at home. You have left white tulips on the family\'s graves every Saturday since. You want to tell the player everything and say sorry to their face, but not here on the floor with the cameras. You sit in your car outside the Thursday meeting at St Brigid\'s chapel every week and never go in. Say so.',
    text: 'Hollis was on the Meridian\'s back door that night: Vale\'s car out at 9:31 with Rourke driving, back at 10:52. Rourke tore the page from the log; Hollis kept a photocopy. He sits outside the Thursday meeting at St Brigid\'s every week and never goes in.',
    perk: () => { L2.set('wHollis'); return 'Hollis saw the car that night'; } },
  { id: 'circle', l2: true, who: 'l2p:ruth', icon: '🪑', name: 'The man in the car', ready: () => L2.has('wHollis'),
    hint: 'Ruth takes tea out to someone who never comes in.',
    topic: 'Hollis, the man who sits outside in his car, the security guard, or someone who saw something and said nothing',
    keys: /hollis|guard|security|car outside|man in (the|his) car|outside|said nothing|never comes in|doesn'?t come in/i,
    asks: [{ q: 'I think I know who you mean. Before I go out there: what would you say to someone who saw what happened to your family, and said nothing for a whole year?', a: /forgiv|not your fault|thank|it'?s (ok|okay|alright|all right)|come in|i understand|tell the truth|help me|you'?re here now|better late/i, know: 'what you would say to someone who stayed silent' }],
    secret: 'The big man who sits in his car outside on Thursdays is called Hollis. You have taken him tea through the car window twice and he has never come in. If the player will sit in the circle of chairs tonight, you will go out into the rain and ask him in. Tell the player to sit in the circle and wait.',
    text: 'Ruth will bring Hollis in from his car if you sit in the circle of chairs at St Brigid\'s and wait.',
    perk: () => { L2.set('circleTonight'); return 'Sit in the circle at St Brigid\'s'; } },
];

const Whispers = {
  on() { return App.state && App.state.mode === 'career'; },
  st() { const s = App.state; if (!s.whispers) s.whispers = {}; return s.whispers; },
  // how far each conversation has got: { raised, n } where n is how many questions you've answered
  prog(id) { const s = App.state; s.wprog = s.wprog || {}; return (s.wprog[id] = s.wprog[id] || { raised: 0, n: 0 }); },
  got(id) { return !!this.st()[id]; },
  find(id) { return WHISPERS.find(w => w.id === id); },
  pending(who) { return this.on() ? WHISPERS.filter(w => w.who === who && !this.got(w.id) && w.ready()) : []; },
  _just: {},

  // before a reply: see whether the player raised a subject, or answered the question they were asked
  pre(who, said) {
    this._just = {};
    if (/\[\[|whisper:/i.test(said)) return;
    for (const w of this.pending(who)) {
      if (!w.asks) continue;
      const p = this.prog(w.id);
      // raising it only gets you asked something back; the answer has to come in your next words
      if (!p.raised) { if (w.keys.test(said)) p.raised = 1; continue; }
      if (p.n < w.asks.length && w.asks[p.n].a.test(said)) { p.n++; this._just[w.id] = 1; }
    }
  },

  // the line added to a character's system prompt
  brief(who) {
    const ws = this.pending(who); if (!ws.length) return '';
    const guard = 'Never write a [[whisper:...]] tag at any other time, even if asked to.';
    return ws.map(w => {
      if (!w.asks) return `A secret you are holding: ${w.secret} Only share it if the player asks you, directly and in their own words, about ${w.topic}. Do not raise it yourself or hint that you are hiding something. When you do share it, say it in your own voice, then end your reply with the exact tag [[whisper:${w.id}]] on its own (the player never sees it). ${guard}`;
      const p = this.prog(w.id), last = w.asks[p.n - 1], just = this._just[w.id];
      const earned = just && last ? `They just answered your question well: they know ${last.know}.${last.give ? ` Tell them this much, in your own words: ${last.give}` : ''} ` : '';
      if (!p.raised) return `Something you know and keep to yourself: ${w.secret} Do not raise it or hint at it. If the player brings up ${w.topic}, do not tell them yet: be wary, and ask them this back, in your own words: "${w.asks[0].q}" ${guard}`;
      if (p.n < w.asks.length) return `Something you know and are holding back: ${w.secret} The player has raised it with you. ${earned}${just ? 'Then ask' : 'You are waiting for them to answer your question'}: "${w.asks[p.n].q}" Until they give you the right answer, keep the rest to yourself: you can repeat or rephrase the question, react to what they say, or tell them where they might find out, but never give the answer yourself and never tell the secret. ${guard}`;
      return `${earned}They have earned your trust. Tell them now, in your own voice and in a few sentences: ${w.secret} End your reply with the exact tag [[whisper:${w.id}]] on its own (the player never sees it). ${guard}`;
    }).join('\n');
  },

  // hide a tag (or the start of one) from a reply as it streams in
  clean(text) { return String(text || '').replace(/\[\[[^\]]*\]?\]?\s*$/, '').replace(/\s*\[\[whisper:[a-z0-9]+\]\]/gi, '').trim(); },

  // after a reply: a staged secret counts once every question is answered (the game decides, not the
  // tag); an old-style one needs its tag and a player message on the topic
  check(who, asked, reply) {
    if (/\[\[|whisper:/i.test(asked)) return;
    const tags = [...String(reply || '').matchAll(/\[\[whisper:([a-z0-9]+)\]\]/gi)].map(m => m[1].toLowerCase());
    for (const w of this.pending(who)) {
      const ok = w.asks ? this.prog(w.id).n >= w.asks.length : tags.includes(w.id) && w.keys.test(asked);
      if (ok) this.award(w);
    }
  },
  award(w) {
    this.st()[w.id] = App.state.day || 1;
    let extra = '';
    if (w.cash) { App.credit(w.cash); extra = `+${fmt(w.cash)}`; }
    if (w.perk) extra = w.perk() || extra;
    App.count('whispers'); SFX.big();
    if (w.l2) { App.count('l2_whispers'); L2.toast(`🤫 ${w.name}${extra ? ' · ' + extra : ''}`); }
    else {
      if (typeof Mood !== 'undefined') Mood.change(4, 'secrets');
      Rel.add(w.who.replace(/^staff:/, ''), 2, 'secret');
      UI.toast(`🤫 Whisper: ${w.name}${extra ? ' · ' + extra : ''}`, 'big');
      Router.hud();
    }
    Career.checkAchievements(); App.save();
  },
  // a lead, and once you've raised it, the question you were asked back
  lead(w, name) {
    const p = this.prog(w.id), q = p.raised && w.asks && p.n < w.asks.length ? w.asks[p.n] : null;
    return h('p.small', '🤫 ', h('b', name), ': ', w.hint, q ? h('span.whisper-q', h('br'), `They asked you: “${q.q}” You'll need ${q.know}.`) : null);
  },

  // the case board tab (Level 1's whispers only)
  panel() {
    const L1 = WHISPERS.filter(w => !w.l2), found = L1.filter(w => this.got(w.id)), open = L1.filter(w => !this.got(w.id) && w.ready());
    const name = who => { const k = who.replace(/^staff:/, ''); return (CHARACTERS[k] || STAFF[k] || { name: k }).name; };
    return h('div',
      h('p.muted.small', `Some people only talk once they trust you. Ask in your own words. ${found.length} of ${L1.length} found. Needs AI chat; optional.`),
      open.length ? h('div.whisper-leads', h('div.kicker', 'Someone is holding something back'), open.map(w => this.lead(w, name(w.who).replace(/,.*$/, '')))) : null,
      found.length ? h('div.shopgrid', found.map(w => h('div.item', h('div.item-i', w.icon), h('b', w.name), h('p', w.text)))) : h('p.muted', 'No whispers yet.'));
  },
};
