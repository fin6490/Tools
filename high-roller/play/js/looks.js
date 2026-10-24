/* Your look: skin, hair, facial hair, glasses and everyday clothes, plus which of your bought
   wardrobe pieces you're wearing. Drives your walking sprite and your portrait. Saved with the
   game (it's just colours and choices, nothing personal). Edit it at the mirror in Lucky Strike
   Outfitters or from ☰ → Your look. */
const Looks = {
  SKIN: ['#f6d7bf', '#f0c19a', '#e0ac69', '#c68863', '#a5714a', '#7b4a2c', '#5a3622'],
  HAIR: ['#111', '#2b1d14', '#5a3a22', '#8a5a2b', '#c8913f', '#e6c56a', '#a0522d', '#999', '#e8e8e8', '#2e5c9a', '#b03a6e'],
  CLOTH: ['#4a7a46', '#2f3e5c', '#7a2131', '#1f5f8b', '#6b4f3a', '#5b2c6f', '#d35400', '#222', '#e8e8e8', '#2c7a7b'],
  STYLES: [['short', 'Short'], ['slick', 'Slicked'], ['pomp', 'Quiff'], ['curly', 'Curly'], ['buzz', 'Buzz'], ['long', 'Long'], ['bob', 'Bob'], ['bun', 'Bun'], ['pony', 'Ponytail'], ['bald', 'Bald']],
  BEARDS: [['', 'None'], ['stubble', 'Stubble'], ['stache', 'Moustache'], ['goatee', 'Goatee'], ['full', 'Full beard']],
  OUTFITS: [['casual', 'Everyday'], ['blazer', 'Thrift blazer'], ['suit', 'Sharp suit'], ['tux', 'Tuxedo']],
  DEFAULT: { skin: '#f0c19a', hair: '#3a2a1e', style: 'short', beard: '', glasses: false, shirt: '#4a7a46', pants: '#3b4a6b', outfit: 'best', wear: { fedora: true, shades: true, chain: true } },

  get() {
    const s = (App.state && App.state.looks) || {};
    return { ...this.DEFAULT, ...s, wear: { ...this.DEFAULT.wear, ...(s.wear || {}) } };
  },
  // the outfit actually on you: your pick if you still own it, otherwise your best
  outfit(L = this.get()) {
    const owned = k => k === 'casual' || App.has(k);
    if (L.outfit !== 'best' && owned(L.outfit)) return L.outfit;
    return ['tux', 'suit', 'blazer'].find(k => App.has(k)) || 'casual';
  },
  worn(k, L = this.get()) { return App.has(k) && L.wear[k] !== false; },

  // for the walking sprite in world.js
  sprite(L = this.get()) {
    const o = this.outfit(L);
    return {
      shirt: o === 'tux' ? '#111' : o === 'suit' ? '#2f3e5c' : o === 'blazer' ? '#6b4f3a' : L.shirt,
      pants: o === 'tux' ? '#111' : o === 'suit' ? '#25314a' : L.pants,
      skin: L.skin, hair: L.hair, style: L.style, beard: L.beard, glasses: L.glasses,
      hat: this.worn('fedora', L), shades: this.worn('shades', L), chain: this.worn('chain', L), bow: o === 'tux', tie: o === 'suit',
    };
  },
  // for the portrait
  portrait(L = this.get()) {
    const o = this.outfit(L), sp = this.sprite(L);
    return {
      style: L.style, skin: L.skin, hair: L.hair, beard: L.beard === 'stubble' ? '' : L.beard, stubble: L.beard === 'stubble',
      glasses: L.glasses && !sp.shades, shades: sp.shades, chain: sp.chain, hat: sp.hat ? 'fedora' : null,
      shirt: sp.shirt, collar: o === 'tux' ? 'bow' : o === 'suit' ? 'tie' : 'open',
      lips: false,
    };
  },
  svg(L) { return Portrait._raw({ key: 'me-look', color: CHARACTERS.me.color, look: this.portrait(L || this.get()) }); },

  /* ---------- the mirror ---------- */
  async edit(first) {
    const d = this.get(); d.wear = { ...d.wear };
    const pv = h('div.lk-pt'), cv = h('canvas.lk-sprite', { width: 192, height: 64 });
    const draw = () => {
      pv.innerHTML = this.svg(d);
      const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
      if (World.drawPerson) ['down', 'left', 'right', 'up'].forEach((dir, i) => World.drawPerson(c, 8 + i * 46, 8, 3, dir, 0, this.sprite(d)));
    };
    const rows = [];
    const swatches = (label, key, list) => {
      const row = h('div.lk-sw', list.map(col => h('button.sw', { type: 'button', style: { background: col }, 'aria-label': `${label} ${col}`, onclick: () => { d[key] = col; mark(); draw(); } })));
      const mark = () => row.querySelectorAll('.sw').forEach((b, i) => b.classList.toggle('on', list[i] === d[key]));
      mark(); rows.push(h('div.lk-row', h('label.lbl', label), row));
    };
    const choices = (label, list, get, set, avail = () => true) => {
      const row = h('div.lk-ch', list.map(([v, name]) => h('button.btn.sm.ghost', { type: 'button', disabled: !avail(v), onclick: () => { set(v); mark(); draw(); } }, name)));
      const mark = () => row.querySelectorAll('.btn').forEach((b, i) => b.classList.toggle('on', list[i][0] === get()));
      mark(); rows.push(h('div.lk-row', h('label.lbl', label), row));
    };
    swatches('Skin', 'skin', this.SKIN);
    choices('Hair', this.STYLES, () => d.style, v => { d.style = v; });
    swatches('Hair colour', 'hair', this.HAIR);
    choices('Face', this.BEARDS, () => d.beard, v => { d.beard = v; });
    choices('Glasses', [[false, 'None'], [true, 'Specs']], () => d.glasses, v => { d.glasses = v; });
    choices('Outfit', [['best', 'Best I own']].concat(this.OUTFITS), () => d.outfit, v => { d.outfit = v; }, v => v === 'best' || v === 'casual' || App.has(v));
    swatches('Shirt', 'shirt', this.CLOTH);
    swatches('Trousers', 'pants', this.CLOTH);
    const gear = [['fedora', 'Fedora'], ['shades', 'Aviators'], ['chain', 'Gold chain']].filter(([k]) => App.has(k));
    if (gear.length) rows.push(h('div.lk-row', h('label.lbl', 'Wearing'), h('div.lk-ch', gear.map(([k, name]) => {
      const b = h('button.btn.sm.ghost', { type: 'button', onclick: () => { d.wear[k] = d.wear[k] === false; b.classList.toggle('on', d.wear[k] !== false); draw(); } }, name);
      b.classList.toggle('on', d.wear[k] !== false); return b;
    }))));
    const body = h('div.looks',
      h('div.lk-prev', pv, cv),
      first ? h('p.muted.small', 'Who walks into town? You can change this any time at the mirror in Lucky Strike Outfitters, or from ☰ → Your look.') : null,
      h('div.lk-rows', rows));
    draw();
    const ok = await UI.modal({ title: first ? '🪞 Who\'s walking in?' : '🪞 The mirror', body, wide: true, buttons: [{ label: first ? 'Skip' : 'Cancel', value: false, cls: 'ghost' }, { label: 'Looking good', value: true, cls: 'primary' }] });
    if (!ok) return false;
    App.state.looks = d; App.save(); Router.refresh && Router.screen !== 'world' && Router.refresh();
    UI.toast(first ? 'Looking sharp.' : RNG.pick(['Looking sharp.', 'Rosa whistles.', 'The mirror approves.']), 'good');
    return true;
  },
};
