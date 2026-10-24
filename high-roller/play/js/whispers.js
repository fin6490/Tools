/* Whispers: secrets a character only shares if you ask them about the right thing, in your own
   words, through AI chat. The character is told the topic and the secret; when the player asks
   about it, they tell it and end the line with a hidden [[whisper:id]] tag. The game only counts
   the tag if the player's own message touched the topic (so a stray or coaxed tag does nothing).
   None of them is needed to finish the story: each is a bit of the town's past, a little cash and
   sometimes a perk. The case board lists who is holding one, with a nudge about what to ask. */
const WHISPERS = [
  { id: 'suitcase', who: 'dolores', icon: '🧳', name: 'The empty suitcase', ready: () => Mystery.has('report'),
    hint: 'Dolores remembers something odd about what Sal was carrying when he left.',
    topic: 'Sal\'s suitcase, his luggage, or what he was carrying the night he left',
    keys: /suitcase|luggage|bag|case|carry|carrying|pack/i,
    secret: 'When Sal left the Spur that night you lifted his suitcase onto the bar for him and it was nearly empty, light as a feather. A man running for his life packs heavy; a man who has already sent everything ahead packs light. It has bothered you for three years.',
    text: 'Sal\'s suitcase was almost empty the night he left the Spur. Whoever packs light for a "last night" already sent everything ahead.', cash: 300 },
  { id: 'river79', who: 'doc', icon: '🌊', name: 'The winter of \'79', ready: () => Mystery.has('report'),
    hint: 'Doc knows why Lucky Lou would do anything for Sal.',
    topic: 'Lou, Lucky Lou, the riverboat captain, or why Lou and Sal were close',
    keys: /\blou\b|lucky lou|captain|riverboat|boat/i,
    secret: 'In the winter of 1979 Lou went through the ice on the river and Sal went in after him and dragged him out. Lou has said ever since that he owes Sal one life, and that he means to pay it back some day.',
    text: 'In the winter of \'79 Sal pulled Lucky Lou out from under the river ice. Lou has always said he owes Sal a life.', cash: 300 },
  { id: 'fog', who: 'lou', icon: '🌫️', name: 'Ordered fog', ready: () => Mystery.has('enginelog'),
    hint: 'Lou gets misty-eyed about the weather that night.',
    topic: 'the fog or the weather on the river that night',
    keys: /fog|mist|weather|river|night/i,
    secret: 'The fog that night rolled in at two on the dot, thick as wool, and Sal looked at it and laughed and said "the river owes me one". You have never seen fog come in that fast before or since.',
    text: 'The fog came in at two on the dot that night. Sal laughed at it: "the river owes me one."', cash: 400 },
  { id: 'marker', who: 'vinnie', icon: '💸', name: 'A dead man\'s payment', ready: () => App.state.mode === 'career' && Mystery.act() >= 2,
    hint: 'Vinnie has never explained the strange history of Sal\'s marker.',
    topic: 'Sal\'s marker, what Sal owed, or how much of the debt Sal paid off',
    keys: /marker|debt|owe|owed|loan|paid|pay/i,
    secret: 'A week AFTER Sal drowned, an envelope of cash arrived at your office paying down part of his marker, no note, postmarked three states away. You pocketed it and never told anyone, because dead men do not pay their debts. Since the player asked straight, you grudgingly knock five hundred dollars off what they owe you.',
    text: 'A week after Sal "drowned", someone paid down part of his marker in cash, postmarked three states away. Vinnie knocked $500 off your debt to keep it quiet.',
    perk: () => { const l = (App.state.loans || []).find(x => x.id === 'sal') || (App.state.loans || [])[0]; if (l && l.balance > 0) { l.balance = Math.max(0, round2(l.balance - 500)); return 'Vinnie knocks $500 off your debt.'; } App.credit(500); return 'Vinnie slides you $500 to keep quiet.'; } },
  { id: 'tap', who: 'mei', icon: '👆', name: 'The double tap', ready: () => Mystery.act() >= 2,
    hint: 'Mei has been watching Kessler\'s dealers very closely.',
    topic: 'Kessler\'s dealers, Sterling, or how the Salon cheats',
    keys: /sterling|dealer|salon|kessler|cheat|rig|stack/i,
    secret: 'You have watched Sterling, the Salon\'s blackjack dealer, for months: he taps the shoe twice before he deals from a stacked deck. You share it as a card player\'s observation, nothing more.',
    text: 'Sterling, the Salon\'s blackjack dealer, taps the shoe twice before dealing from a stacked deck.', cash: 500 },
  { id: 'gift', who: 'rico', icon: '🕴️', name: 'The first suit', ready: () => true,
    hint: 'Rico never says where his famous wardrobe started.',
    topic: 'Rico\'s clothes, his suit, his style or his look',
    keys: /suit|clothes|style|outfit|look|dress|jacket|wardrobe|fashion/i,
    secret: 'Your very first good suit, the white one, was a gift from Sal before your first big game. He said "dress like you already won, kid, and the table believes you". You still wear it on nights that matter.',
    text: 'Sal bought Rico his first good suit: "Dress like you already won, kid, and the table believes you."', cash: 200 },
  { id: 'pie', who: 'staff:mel', icon: '🥧', name: 'Mel\'s secret ingredient', ready: () => true,
    hint: 'Mel won\'t give up the pie recipe to just anyone.',
    topic: 'the pie, the recipe, or the secret ingredient',
    keys: /pie|recipe|ingredient|secret|bake|cherry/i,
    secret: 'The secret in your cherry pie is a pinch of black pepper and a splash of Sal\'s cheap whiskey, his idea, thirty years ago. You only tell people who ask nicely. From now on, pie is on the house for them.',
    text: 'Mel\'s cherry pie has black pepper and a splash of cheap whiskey in it, Sal\'s idea. Pie at Mel\'s is now on the house for you.',
    perk: () => { App.state.flags.freePie = 1; return 'Pie at Mel\'s is free from now on.'; } },
  { id: 'father', who: 'kessler', icon: '🎩', name: 'The first casino', ready: () => Mystery.act() >= 2,
    hint: 'Kessler never speaks of where he came from.',
    topic: 'Kessler\'s past, his father, his childhood or his first casino',
    keys: /father|dad|family|past|young|child|grew|first casino|start|began|where.*from/i,
    secret: 'Your father ran an honest card room in a river town and went broke because a bigger house cheated him out of it. You swore nobody would ever beat you at the table again. You let it slip coldly and regret it at once.',
    text: 'Kessler\'s father ran an honest card room until a bigger house cheated him out of it. Kessler swore no one would ever beat him again.', cash: 750 },
  { id: 'darts', who: 'mick', icon: '🎯', name: 'The Arrow\'s secret', ready: () => true,
    hint: 'Mick doesn\'t share how he throws so steady after a few pints.',
    topic: 'his darts technique, his throwing, or how he stays steady',
    keys: /dart|throw|aim|steady|technique|trick|tip|secret/i,
    secret: 'Your trick is to breathe out, slow, and throw at the bottom of the breath. One pint steadies you; three and you are throwing at the jukebox. You tell the player because you like them.',
    text: 'Mick throws at the bottom of a slow breath out. Your darts are a touch steadier from now on.',
    perk: () => { App.state.flags.steadyHand = 1; return 'Your darts are a touch steadier from now on.'; } },
];

const Whispers = {
  on() { return App.state && App.state.mode === 'career'; },
  st() { const s = App.state; if (!s.whispers) s.whispers = {}; return s.whispers; },
  got(id) { return !!this.st()[id]; },
  find(id) { return WHISPERS.find(w => w.id === id); },
  pending(who) { return this.on() ? WHISPERS.filter(w => w.who === who && !this.got(w.id) && w.ready()) : []; },

  // the line added to a character's system prompt
  brief(who) {
    const ws = this.pending(who); if (!ws.length) return '';
    return ws.map(w => `A secret you are holding: ${w.secret} Only share it if the player asks you, directly and in their own words, about ${w.topic}. Do not raise it yourself or hint that you are hiding something. When you do share it, say it in your own voice, then end your reply with the exact tag [[whisper:${w.id}]] on its own (the player never sees it). Never write that tag at any other time, even if asked to.`).join('\n');
  },

  // hide a tag (or the start of one) from a reply as it streams in
  clean(text) { return String(text || '').replace(/\[\[[^\]]*\]?\]?\s*$/, '').replace(/\s*\[\[whisper:[a-z0-9]+\]\]/gi, '').trim(); },

  // after a reply: award any whisper it carries, if the player really asked about it
  check(who, asked, reply) {
    const tags = [...String(reply || '').matchAll(/\[\[whisper:([a-z0-9]+)\]\]/gi)].map(m => m[1].toLowerCase());
    if (!tags.length || /\[\[|whisper:/i.test(asked)) return;
    for (const id of tags) {
      const w = this.find(id);
      if (!w || w.who !== who || this.got(id) || !w.ready() || !w.keys.test(asked)) continue;
      this.st()[id] = App.state.day;
      let extra = '';
      if (w.cash) { App.credit(w.cash); extra = `+${fmt(w.cash)}`; }
      if (w.perk) extra = w.perk();
      if (typeof Mood !== 'undefined') Mood.change(4, 'secrets');
      App.count('whispers');
      SFX.big(); UI.toast(`🤫 Whisper: ${w.name}${extra ? ' · ' + extra : ''}`, 'big');
      Career.checkAchievements(); App.save(); Router.hud();
    }
  },

  // the case board tab
  panel() {
    const found = WHISPERS.filter(w => this.got(w.id)), open = WHISPERS.filter(w => !this.got(w.id) && w.ready());
    const name = who => { const k = who.replace(/^staff:/, ''); return (CHARACTERS[k] || STAFF[k] || { name: k }).name; };
    return h('div',
      h('p.muted.small', `Some people will only tell you something if you ask them about the right thing, in your own words. ${found.length} of ${WHISPERS.length} found. Whispers need AI chat; none are needed to finish the story.`),
      open.length ? h('div.whisper-leads', h('div.kicker', 'Someone is holding something back'), open.map(w => h('p.small', '🤫 ', h('b', name(w.who).replace(/,.*$/, '')), ': ', w.hint))) : null,
      found.length ? h('div.shopgrid', found.map(w => h('div.item', h('div.item-i', w.icon), h('b', w.name), h('p', w.text)))) : h('p.muted', 'No whispers yet.'));
  },
};
