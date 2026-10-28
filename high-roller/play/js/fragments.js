/* Fragments: seventeen small things hidden around town that don't belong in this world. A child's
   drawing, half a theatre ticket, a tiny hospital bracelet. Each one glints faintly now and then;
   walk up to it and press A. They are pieces of a life the dream is keeping from you, and they
   matter when you wake up (Level 2): each has a torn piece of a photograph taped to its back, and
   put together in Level 2 they show what Nora saw out of the window that night. */
const FRAGMENTS = [
  { map: 'town', icon: '🖍️', name: 'A crayon drawing', text: 'Four stick figures and a dog, under a purple sun. Across the top, in careful capitals: MY FAMLY.' },
  { map: 'town', icon: '🎟️', name: 'Half a theatre ticket', text: 'Row F, seat 17. The other half is gone. You can almost hear someone laughing in the seat beside you.' },
  { map: 'town', icon: '🌻', name: 'A sunflower hair tie', text: 'Yellow, stretched out of shape, two long dark hairs still caught in it.' },
  { map: 'town', icon: '🦕', name: 'A plastic dinosaur', text: 'A green stegosaurus with its tail chewed off. Somebody loved it very hard.' },
  { map: 'town', icon: '🐚', name: 'A seashell', text: 'Worn smooth, with a hole right through it, the kind you thread onto string for someone small.' },
  { map: 'town', icon: '🔑', name: 'A key on a ribbon', text: 'A front door key on a faded blue ribbon. Not the motel. Not the apartment. A house.' },
  { map: 'town', icon: '🌸', name: 'A pressed forget-me-not', text: 'Flattened between two pages of something, a long time ago. It still holds its colour.' },
  { map: 'v:spur', icon: '📇', name: 'A recipe card', text: '"Nora\'s pancakes. Double the vanilla, don\'t tell the kids." The handwriting is not yours, but you know it.' },
  { map: 'v:riverboat', icon: '📼', name: 'A cassette label', text: 'In felt tip: "Road trip mix. Side B is Ellie\'s. NO SKIPPING."' },
  { map: 'v:palace', icon: '💍', name: 'An empty ring box', text: 'Velvet, worn at the hinge. You open it. You close it again. You open it again.' },
  { map: 'v:salon', icon: '📝', name: 'A note in your handwriting', text: 'Two words, pressed so hard the pen tore the paper: "WAKE UP."' },
  { map: 'r:diner', icon: '🕯️', name: 'A birthday candle', text: 'Shaped like a 7, the wick black. Someone blew it out and made a wish.' },
  { map: 'r:motel', icon: '🏥', name: 'A tiny hospital bracelet', text: '"Baby boy. Sam." It would barely fit around two of your fingers.' },
  { map: 'r:pawn', icon: '📸', name: 'A faded Polaroid', text: 'Too sun-bleached to make out faces. A beach. Three shapes and one taking the picture.' },
  { map: 'r:shop', icon: '👟', name: 'A small shoe', text: 'Light-up trainer, size 11, laces in a double knot because they kept coming undone.' },
  { map: 'r:grand', icon: '⭐', name: 'A spelling test', text: '17 out of 20 and a gold star. At the bottom: "Ellie, so proud! Show Dad!"' },
  { map: 'r:apts', icon: '📞', name: 'A voicemail, written down', text: 'On the back of a receipt, in your writing: "Call me when you land. We love you. Sam says hi. Bye. Bye."' },
];
const Fragments = {
  st() { const s = App.state; if (!s.fragments) s.fragments = {}; return s.fragments; },
  has(i) { return !!this.st()[i]; },
  count() { return Object.keys(this.st()).length; },
  forMap(id) { return FRAGMENTS.map((k, i) => ({ ...k, i })).filter(k => k.map === id && !this.has(k.i)); },
  async take(i) {
    const k = FRAGMENTS[i]; if (!k || this.has(i)) return;
    this.st()[i] = App.state.day || 1; App.count('fragments');
    const n = this.count();
    SFX.flip();
    await UI.dialog([
      { who: 'narrator', text: `${k.icon} **${k.name}**. ${k.text}` },
      { who: 'narrator', text: '*Taped to the back, flat and careful: a torn square of a photograph. Night. Rain. Part of a window.*' },
      { who: 'narrator', text: n === FRAGMENTS.length ? '*All seventeen. You lay them out on the floor and look at them for a long time. You know these things. You know these people. The town goes very quiet, as if it is holding its breath.*' : RNG.pick(['*You don\'t know why your hands are shaking.*', '*It doesn\'t belong here. Neither, maybe, do you.*', '*For a second the street sounds very far away.*', '*You put it in your pocket. It feels heavier than it should.*', '*Somewhere, a long way off, someone is saying your name.*']) },
    ]);
    UI.toast(`Fragment ${n} of ${FRAGMENTS.length}`, 'award', n === FRAGMENTS.length ? 'You remember now. Some of it.' : 'Seventeen are hidden around town and in its buildings.');
    if (typeof Mood !== 'undefined') Mood.change(-2, 'memories');
    Career.checkAchievements(); App.save();
  },
  panel() {
    const n = this.count();
    if (!n) return null;
    return h('section.panel', h('h3', `Fragments · ${n}/${FRAGMENTS.length}`),
      h('div.frag-list', FRAGMENTS.map((k, i) => this.has(i) ? h('div.frag', { title: k.text }, h('span', k.icon), h('small', k.name)) : h('div.frag.unk', h('span', '?')))),
      h('p.muted.small', n < FRAGMENTS.length ? 'Things that don\'t belong in this town, each with a torn square of a photograph taped to the back. Some glint in the street, some hide inside its buildings.' : 'All of them. You remember.'));
  },
};
