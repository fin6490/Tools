/* Relationships: how the people of the town feel about you.
   Every friend has a bar of points. You earn them by stopping to talk (once a day), buying them a
   drink (once a day), finishing their side jobs and hearing their whispers. The levels are
   Stranger, Acquaintance, Friend, Close friend, then Family. A Friend gives a perk and unlocks a
   personal side job; a Close friend gives a bigger perk. Their AI chat voice warms up with you too. */
const REL_LEVELS = [[0, 'Stranger'], [3, 'Acquaintance'], [10, 'Friend'], [20, 'Close friend'], [35, 'Family']];
const REL_PEOPLE = {
  dolores: { gift: 'a glass of the good bourbon', friend: 'Drinks at the Spur bar are on the house', close: 'Dolores\'s shifts pay half as much again' },
  doc: { gift: 'a slice of cherry pie and a coffee', friend: 'Doc\'s advice: you wake up in a better mood', close: 'The degen meter cools twice as fast overnight' },
  lou: { gift: 'a bottle of rum for the galley', friend: 'Drinks in the Paddlewheel Lounge are on the house', close: 'Food in the Paddlewheel Lounge is on the house too' },
  mick: { gift: 'a pint of stout', friend: 'Mick\'s coaching steadies your darts arm', close: 'Your darts arm is steadier still' },
  sparky: { gift: 'a bag of resistors and a soda', friend: 'Slot tech tips: +$100 a day', close: 'Slot tech tips: +$300 a day' },
  margot: { gift: 'a glass of vintage champagne', friend: 'Drinks at the Palace bar are on the house', close: '+5 swagger: Margot talks you up to the high rollers' },
};
const Rel = {
  on() { return App.state && App.state.mode === 'career'; },
  st() { const s = App.state; if (!s.rel) s.rel = {}; return s.rel; },
  is(who) { return !!REL_PEOPLE[who]; },
  points(who) { return (this.st()[who] || {}).p || 0; },
  level(who) { const p = this.points(who); let i = 0; REL_LEVELS.forEach(([at], k) => { if (p >= at) i = k; }); return i; },
  title(who) { return REL_LEVELS[this.level(who)][1]; },
  friend(who) { return this.on() && this.level(who) >= 2; },
  close(who) { return this.on() && this.level(who) >= 3; },
  name(who) { return (CHARACTERS[who] || { name: who }).name.replace(/,.*$/, '').replace(/^"([^"]+)" /, '$1 '); },
  add(who, n, why) {
    if (!this.on() || !this.is(who) || !n) return;
    const r = this.st()[who] || (this.st()[who] = { p: 0 }), before = this.level(who);
    r.p += n;
    const after = this.level(who);
    if (after > before) {
      const L = REL_LEVELS[after][1], P = REL_PEOPLE[who];
      UI.toast(`💛 ${this.name(who)}: ${L}`, 'award', after === 2 ? `Perk: ${P.friend}. They may have a personal job for you.` : after === 3 ? `Perk: ${P.close}.` : after === 4 ? 'They\'d do anything for you now.' : 'They know your name now.');
      SFX.big(); App.count('relUps');
      if (after >= 2) App.count('friends'); if (after >= 3) App.count('closeFriends'); if (after >= 4) App.count('family');
      Career.checkAchievements();
    }
    App.save();
  },
  // stopping to talk counts once a day
  visit(who) { if (!this.on() || !this.is(who)) return; const r = this.st()[who] || (this.st()[who] = { p: 0 }); if (r.talked === App.state.day) return; r.talked = App.state.day; this.add(who, 1, 'talk'); },
  giftCost() { return [15, 40, 120, 300, 500][Math.min(App.state.chapter, 4)]; },
  swagger() { if (!this.on()) return 0; let s = 0; for (const who in REL_PEOPLE) { const l = this.level(who); s += l >= 2 ? 2 : 0; s += l >= 3 ? (who === 'margot' ? 8 : 3) : 0; } return s; },
  income() { return !this.on() ? 0 : this.close('sparky') ? 300 : this.friend('sparky') ? 100 : 0; },
  // a bar comp from a friend behind (or near) the counter
  comps(place, m) {
    if (!place || !this.on()) return false;
    if (place.venue === 'spur' && m.drink && this.friend('dolores')) return true;
    if (place.venue === 'riverboat' && (m.drink ? this.friend('lou') : this.close('lou'))) return true;
    if (place.venue === 'palace' && m.drink && this.friend('margot')) return true;
    return false;
  },
  brief(who) {
    if (!this.on() || !this.is(who)) return '';
    const l = this.level(who);
    return `How you feel about the player: ${REL_LEVELS[l][1]}. ` + ['You barely know them: be polite but guarded.', 'You know them a little and are warming up.', 'You consider them a friend: speak warmly and share a little of yourself.', 'They are a close friend: you trust them, tease them affectionately, and confide in them.', 'They are family to you now: fiercely loyal, open-hearted.'][l];
  },
  hearts(who) { const l = this.level(who); return '💛'.repeat(l) + '🤍'.repeat(4 - l); },
  // the strip inside a chat: hearts, progress and the daily drink
  chatRow(who, api) {
    if (!this.on() || !this.is(who)) return null;
    const r = this.st()[who] || {}, l = this.level(who), next = REL_LEVELS[l + 1], cost = this.giftCost();
    const bought = r.gift === App.state.day;
    const row = h('div.rel-row', h('span.rel-h', { title: this.title(who) }, this.hearts(who)),
      h('span.muted.small', `${this.title(who)}${next ? ` · ${this.points(who)}/${next[0]} to ${next[1]}` : ''}`),
      h('button.btn.sm', { disabled: bought || App.state.bank < cost, onclick: () => {
        if (!App.debit(cost)) return UI.toast('Not enough cash', 'warn');
        r.gift = App.state.day; this.st()[who] = Object.assign(this.st()[who] || { p: 0 }, { gift: App.state.day });
        SFX.cash(); this.add(who, 2, 'gift'); Mood.change(2, 'friends');
        api.say(RNG.pick(['*raises the glass* Now that\'s how you make a friend.', 'For me? Well, aren\'t you sweet.', 'You remembered. That means something around here.', '*smiles despite themself* Thank you. Really.']));
        row.replaceWith(this.chatRow(who, api));
      } }, bought ? '🎁 Gift given today' : `🎁 Buy ${REL_PEOPLE[who].gift} (${fmt(cost)})`));
    return row;
  },
  // the status screen: everyone you know
  panel() {
    if (!this.on()) return null;
    const known = Object.keys(REL_PEOPLE).filter(w => this.points(w) > 0);
    return h('section.panel.rel-panel', h('h3', 'People in your life'),
      known.length ? h('div.rel-list', Object.keys(REL_PEOPLE).map(w => {
        const l = this.level(w), P = REL_PEOPLE[w];
        return h('div.rel-person', h('span.duel-face', Portrait.el(w)), h('div', h('b', this.name(w)), h('div.small', `${this.hearts(w)} ${this.title(w)} (${this.points(w)})`),
          h('div.muted.small', l >= 3 ? `✔ ${P.friend} · ✔ ${P.close}` : l >= 2 ? `✔ ${P.friend} · Close friend: ${P.close}` : `Friend: ${P.friend}`)));
      })) : h('p.muted.small', 'Talk to people around town, buy them a drink, help them out. Friends look after you.'));
  },
};
