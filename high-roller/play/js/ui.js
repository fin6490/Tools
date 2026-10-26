/* Shared UI pieces: playing cards, chips, betting spots, table scaffold, modals, toasts. */
const UI = {};

/* ---------- Playing cards ---------- */
const PIP_LAYOUT = {
  2: [[50, 16], [50, 84]],
  3: [[50, 16], [50, 50], [50, 84]],
  4: [[30, 16], [70, 16], [30, 84], [70, 84]],
  5: [[30, 16], [70, 16], [50, 50], [30, 84], [70, 84]],
  6: [[30, 16], [70, 16], [30, 50], [70, 50], [30, 84], [70, 84]],
  7: [[30, 16], [70, 16], [50, 33], [30, 50], [70, 50], [30, 84], [70, 84]],
  8: [[30, 16], [70, 16], [50, 33], [30, 50], [70, 50], [50, 67], [30, 84], [70, 84]],
  9: [[30, 16], [70, 16], [30, 39], [70, 39], [50, 50], [30, 61], [70, 61], [30, 84], [70, 84]],
  10: [[30, 16], [70, 16], [50, 28], [30, 39], [70, 39], [30, 61], [70, 61], [50, 72], [30, 84], [70, 84]],
};
const FACE_GLYPH = { 11: '♞', 12: '♛', 13: '♚' };

UI.card = function (card, faceDown = false) {
  const red = isRed(card.s), sym = SUIT_SYM[card.s], lab = rankLabel(card.r);
  const face = h('div.face');
  const corner = cls => h('div.corner.' + cls, h('span.cr' + (lab.length > 1 ? '.ten' : ''), lab), h('span.cs', sym));
  face.append(corner('tl'), corner('br'));
  if (card.r === 14) face.append(h('div.ace', sym));
  else if (card.r > 10) face.append(h('div.court', h('div.court-in', h('span.glyph', FACE_GLYPH[card.r]), h('span.court-l', lab), h('span.court-s', sym))));
  else {
    const pips = h('div.pips' + (card.r >= 9 ? '.many.dense' : card.r >= 7 ? '.many' : ''));
    for (const [x, y] of PIP_LAYOUT[card.r]) pips.append(h('span.pip' + (y > 55 ? '.flip' : ''), { style: { left: x + '%', top: y + '%' } }, sym));
    face.append(pips);
  }
  const el = h('div.card' + (red ? '.red' : '.black') + (faceDown ? '.down' : ''),
    h('div.card-in', face, h('div.back')));
  el.dataset.card = cardName(card);
  el.card = card;
  return el;
};

// A row of cards with deal/flip animation. `shoe` is an element cards fly out of.
class CardRow {
  constructor(el, opts = {}) { this.el = el; this.cards = []; this.opts = opts; }
  async add(card, faceDown = false, from) {
    const c = UI.card(card, faceDown);
    this.el.appendChild(c); this.cards.push(c);
    SFX.card();
    const src = from || UI.shoeEl;
    if (src && c.animate) {
      const a = src.getBoundingClientRect(), b = c.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
      c.animate([
        { transform: `translate(${dx}px, ${dy}px) rotate(-25deg) scale(.7)`, opacity: 0.4 },
        { transform: 'none', opacity: 1 },
      ], { duration: 320 * App.speedFactor(), easing: 'cubic-bezier(.2,.8,.25,1)' });
    }
    await sleep(260);
    return c;
  }
  async flip(i, card) {
    const c = this.cards[i]; if (!c) return;
    if (card) { const n = UI.card(card, true); c.replaceWith(n); this.cards[i] = n; await sleep(20); n.classList.remove('down'); }
    else c.classList.remove('down');
    SFX.flip(); await sleep(280);
  }
  highlight(cards) { // mark the cards that make a hand
    const keys = new Set(cards.map(cardName)); const used = new Set();
    this.cards.forEach(c => {
      const k = c.dataset.card;
      if (keys.has(k) && !used.has(k)) { used.add(k); c.classList.add('hl'); } else c.classList.add('dim');
    });
  }
  clear() { this.el.innerHTML = ''; this.cards = []; }
}
UI.CardRow = CardRow;

/* ---------- Chips ---------- */
const CHIP_DENOMS = [1, 5, 25, 100, 500, 1000, 5000, 25000, 100000, 1000000];
const chipLabel = v => v >= 1e6 ? (v / 1e6) + 'M' : v >= 1000 ? (v / 1000) + 'K' : String(v);
UI.chip = (v, extra = '') => h('div.chip.c' + v + extra, h('span', chipLabel(v)));
// a chip you can pick from the rack, by tap or keyboard
UI.chipButton = (v, on, pick) => {
  const c = UI.chip(v, on ? '.sel' : '');
  Object.assign(c, { tabIndex: 0, onclick: pick, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(); } } });
  c.setAttribute('role', 'radio'); c.setAttribute('aria-checked', on ? 'true' : 'false'); c.setAttribute('aria-label', `${fmt(v)} chip`);
  return c;
};
UI.chipsFor = function (amount, limit = 10) { // greedy decomposition for stack display
  const out = []; let left = Math.round(amount);
  for (let i = CHIP_DENOMS.length - 1; i >= 0 && out.length < limit; i--) {
    while (left >= CHIP_DENOMS[i] && out.length < limit) { out.push(CHIP_DENOMS[i]); left -= CHIP_DENOMS[i]; }
  }
  if (!out.length && amount > 0) out.push(1);
  return out.reverse();
};
UI.stack = function (amount) {
  const st = h('div.stack');
  // each chip sits on the one below it: later chips cover earlier ones, and only the top chip
  // shows its value (the rest show their striped edges)
  const vals = UI.chipsFor(amount, 9);
  vals.forEach((v, i) => { const c = UI.chip(v, '.mini' + (i < vals.length - 1 ? '.under' : '')); c.style.bottom = (i * 4) + 'px'; c.style.zIndex = i + 1; st.append(c); });
  return st;
};

/* ---------- Betting spot ---------- */
class BetSpot {
  // opts: key, label, sub, cls, min, max, fixed (exact amount toggle), table (Table), locked
  constructor(opts) {
    this.o = opts; this.key = opts.key; this.amount = 0; this.history = []; this.locked = false;
    this.el = h('div.spot' + (opts.cls ? '.' + opts.cls.split(' ').filter(Boolean).join('.') : ''),
      { title: opts.title || '', role: 'button', tabindex: 0, onclick: e => this.click(e), oncontextmenu: e => { e.preventDefault(); this.undo(); },
        onkeydown: e => {
          // keep these keys off the table's own shortcuts (Space deals)
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this.click(e); }
          else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '-') { e.preventDefault(); e.stopPropagation(); this.undo(); }
        } },
      h('div.spot-label', opts.label), opts.sub ? h('div.spot-sub', opts.sub) : null,
      this.stackEl = h('div.spot-stack'), this.amtEl = h('div.spot-amt'));
    this.el.dataset.key = opts.key;
    if (opts.passive) this.el.classList.add('passive');
    let t; // long-press removes a chip on touch screens
    this.el.addEventListener('touchstart', () => { t = setTimeout(() => { this.undo(); t = 'done'; }, 550); }, { passive: true });
    this.el.addEventListener('touchend', e => { if (t === 'done') e.preventDefault(); clearTimeout(t); });
    this.render();
  }
  get table() { return this.o.table; }
  click(e) {
    if (this.locked || this.o.passive) { if (this.o.onLockedClick) this.o.onLockedClick(); return; }
    if (e.shiftKey || e.altKey) return this.undo();
    if (this.o.fixed) { this.amount ? this.clear() : this.place(this.o.fixed); return; }
    this.place(this.table.chip);
  }
  place(v) {
    const max = typeof this.o.max === 'function' ? this.o.max() : this.o.max;
    if (max != null && this.amount + v > max + 1e-9) {
      v = Math.max(0, max - this.amount);
      if (v <= 0) { UI.toast(`${this.o.label}: table max is ${fmt(max)}`, 'warn'); return false; }
    }
    if (!App.debit(v)) { UI.toast('Not enough bankroll for that chip', 'warn'); return false; }
    this.amount = round2(this.amount + v); this.history.push(v);
    SFX.chip(); this.render(); this.o.onChange && this.o.onChange(this);
    return true;
  }
  undo() {
    if (this.locked || !this.history.length) return;
    const v = this.history.pop(); this.amount = round2(this.amount - v); App.credit(v);
    SFX.chip(); this.render(); this.o.onChange && this.o.onChange(this);
  }
  clear() { // refund everything on the spot
    if (this.amount > 0) App.credit(this.amount);
    this.amount = 0; this.history = []; this.render(); this.o.onChange && this.o.onChange(this);
  }
  // put money down programmatically (blind, play, double...). Returns false if bankroll short.
  force(v) {
    if (!App.debit(v)) return false;
    this.amount = round2(this.amount + v); this.history.push(v); SFX.chip(); this.render(); return true;
  }
  setLocked(l) { this.locked = l; this.el.classList.toggle('locked', l); this.el.setAttribute('aria-disabled', l ? 'true' : 'false'); this.label(); }
  render() {
    this.stackEl.innerHTML = '';
    if (this.amount > 0) this.stackEl.append(UI.stack(this.amount));
    this.amtEl.textContent = this.amount > 0 ? fmt(this.amount, { short: true }) : '';
    this.el.classList.toggle('has-bet', this.amount > 0);
    this.el.classList.remove('won', 'lost', 'pushed');
    this.label();
  }
  // what a screen reader announces for this spot
  label(extra) {
    const name = [this.o.label, this.o.sub].filter(Boolean).join(', ');
    const bet = this.amount > 0 ? `${fmt(this.amount)} bet` : 'no bet';
    const how = this.locked || this.o.passive ? 'locked' : this.o.fixed ? 'Enter to toggle' : 'Enter adds a chip, Backspace removes one';
    this.el.setAttribute('aria-label', `${name}: ${bet}${extra ? ', ' + extra : ''}. ${how}`);
  }
  // settlement helpers: return the amount credited back to the bankroll
  settle(back, cls, text, note) {
    const wager = this.amount;
    if (back > 0) App.credit(back);
    this.table && this.table.addResult(wager, back, this, note);
    this.amount = 0; this.history = [];
    this.flash(cls, text, note, back);
    return back;
  }
  win(mult, note) { return this.settle(round2(this.amount * (1 + mult)), 'won', '+' + fmt(round2(this.amount * mult)), note); }
  payFixed(amount, note) { return this.settle(amount, 'won', '+' + fmt(amount), note); } // progressive: stake taken, flat amount paid
  lose(note) { return this.amount > 0 ? this.settle(0, 'lost', '-' + fmt(this.amount), note) : 0; }
  push(note) { return this.amount > 0 ? this.settle(this.amount, 'pushed', 'Push', note) : 0; }
  refund(back, label) { return this.settle(back, 'pushed', label || ('+' + fmt(back))); } // surrender, la partage, pull back
  flash(cls, text, note, back = 0) {
    this.render(); this.el.classList.add(cls);
    if (back > 0 && cls === 'won') { // winnings slide off the spot toward the rack
      const st = UI.stack(back); st.classList.add('payout'); this.stackEl.append(st);
      setTimeout(() => st.remove(), 1100 * App.speedFactor());
    }
    const slow = Math.max(1, App.speedFactor()); // results stay readable even in turbo
    clearTimeout(this._mark); this._mark = setTimeout(() => this.el.classList.remove('won', 'lost', 'pushed'), 3200 * slow);
    const f = h('div.float.' + cls, text, note ? h('small', note) : null);
    this.el.appendChild(f); setTimeout(() => f.remove(), 2600 * slow);
  }
}
UI.BetSpot = BetSpot;

/* ---------- Table scaffold ---------- */
class Table {
  constructor(root, game, ctx) {
    this.game = game; this.ctx = ctx; this.spots = {}; this.chip = ctx.chips[1] || ctx.chips[0];
    this.round = { wagered: 0, returned: 0 }; this.session = { main: 0, side: 0 }; this.roundLog = [];
    const felt = App.state.equipped.felt || 'green';
    this.el = h('div.table-screen',
      h('div.table-top',
        h('button.btn.ghost.sm', { onclick: () => Router.leaveTable() }, '← Leave table'),
        h('div.tt-title', GameArt.has(game.id) ? GameArt.el(game.id, 'tt-ga') : '', h('b', game.name), h('span', `${ctx.venue.name} · ${fmt(ctx.limits.min)}–${fmt(ctx.limits.max, { short: true })}`)),
        h('div.tt-right',
          this.plEl = h('div.pl', { role: 'status', 'aria-label': 'Session profit and loss' }),
          this.extraEl = h('div.tt-extra'),
          App.inReality() ? null : h('button.btn.ghost.sm.talk', { onclick: () => Chat.open(Dealers.spec(ctx.venueId, game.id, this)), title: 'Chat with the dealer' }, '💬 ' + Dealers.name(ctx.venueId, game.id)),
          h('button.btn.ghost.sm', { onclick: () => this.showInfo() }, 'Paytables'))),
      this.seatsEl = h('div.seats'),
      this.felt = h('div.felt.felt-' + felt,
        h('div.felt-brand', ctx.venue.name),
        this.shoe = h('div.shoe', h('div.shoe-card')),
        this.body = h('div.felt-body'),
        this.banner = h('div.banner')),
      h('div.controls',
        this.resultsEl = h('div.results', { role: 'status', 'aria-live': 'polite', 'aria-label': 'Results this round' }),
        this.msgEl = h('div.msg'),
        h('div.ctl-row',
          this.rack = h('div.rack', { role: 'radiogroup', 'aria-label': 'Chip value', onkeydown: e => {
            const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
            const cs = this.ctx.chips, i = cs.indexOf(this.chip), v = cs[(i + d + cs.length) % cs.length]; e.preventDefault();
            this.chip = v; SFX.click(); this.renderRack(); const n = this.rack.querySelector('.chip.sel'); n && n.focus();
          } }),
          this.actionsEl = h('div.actions'))));
    root.appendChild(this.el);
    UI.shoeEl = this.shoe;
    this.renderRack(); this.renderPL();
  }
  renderRack() {
    this.rack.innerHTML = '';
    for (const v of this.ctx.chips) {
      this.rack.append(UI.chipButton(v, v === this.chip, () => { this.chip = v; SFX.click(); this.renderRack(); const n = this.rack.querySelector('.chip.sel'); n && n.focus(); }));
    }
  }
  spot(opts) { const s = new BetSpot({ ...opts, table: this }); this.spots[opts.key] = s; return s; }
  msg(t) { this.msgEl.innerHTML = ''; this.msgEl.append(typeof t === 'string' ? document.createTextNode(t) : t); }
  setActions(list) {
    const rb = list.findIndex(a => a && a.label === 'Rebet');
    if (rb >= 0 && !list.some(a => a && a.label === '×2')) list = list.slice(0, rb + 1).concat([{ label: '×2', key: 'x', cls: 'ghost', title: 'Double every bet on the table', on: () => { this.doubleBets(); const r = list[rb]; if (r && r.after) r.after(); } }], list.slice(rb + 1));
    this.actions = list;
    this.actionsEl.innerHTML = '';
    for (const a of list) {
      if (!a) continue;
      // the deal/spin/roll button is held back when you're starving, parched or exhausted
      const run = () => {
        if (a.key === ' ') {
          const why = Career.canPlay(), stuck = this.game.canLeave && this.game.canLeave();
          if (why && !stuck) { UI.toast(why, 'warn'); return; }
        }
        SFX.click(); a.on();
      };
      const b = h('button.btn' + (a.cls ? '.' + a.cls : ''), { disabled: a.disabled, onclick: () => { if (!b.disabled) run(); } },
        a.label, a.key ? h('kbd', a.key === ' ' ? 'Space' : a.key.toUpperCase()) : null);
      if (a.hint) b.classList.add('hint');
      a.btn = b; this.actionsEl.append(b);
    }
  }
  key(e) {
    if (!this.actions) return false;
    const k = e.key === 'Enter' ? ' ' : e.key.toLowerCase();
    const a = this.actions.find(a => a && a.key === k && !a.disabled);
    if (a) { e.preventDefault(); a.btn.click(); return true; }
    return false;
  }
  showBanner(text, cls = '', ms = 1800) {
    this.banner.className = 'banner show ' + cls; this.banner.textContent = text;
    clearTimeout(this._bt); this._bt = setTimeout(() => this.banner.classList.remove('show'), ms * App.speedFactor());
  }
  addResult(wager, back, spot, note) {
    if (this._roundDone) { this._roundDone = false; this.roundLog = []; this.renderResults(); }
    this.round.wagered += wager; this.round.returned += back;
    if (spot && spot.o.noComp) this.round.noComp = (this.round.noComp || 0) + wager; // zero-edge bets earn no comps
    if (spot && wager > 0) {
      const side = /\b(side|prog)\b/.test(spot.o.cls || '') || !!spot.o.sideBet;
      (this.roundLog = this.roundLog || []).push({ key: spot.o.key, label: spot.o.label, note, wager, net: round2(back - wager), side });
      this.renderResults();
    }
  }
  // what every bet did this round; stays up until the next round's bets settle
  renderResults() {
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = '';
    for (const r of this.roundLog || []) {
      const cls = r.net > 0 ? 'won' : r.net < 0 ? 'lost' : 'push';
      this.resultsEl.append(h('span.res.' + cls + (r.side ? '.side' : ''), h('b', r.label), r.note && !/^(win|lose|push)$/i.test(r.note) ? h('em', r.note) : null,
        h('i', r.net > 0 ? '+' + fmt(r.net) : r.net < 0 ? '−' + fmt(-r.net) : 'push')));
    }
  }
  renderPL() {
    if (!this.plEl) return;
    const S = this.session, f = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(v), { short: true }), c = v => v > 0 ? '.pos' : v < 0 ? '.neg' : '';
    this.plEl.innerHTML = '';
    this.plEl.append(h('span.pl-l', 'Session'), h('span.pl-v' + c(S.main), h('small', 'Main'), f(S.main)), h('span.pl-v' + c(S.side), h('small', 'Side'), f(S.side)),
      h('span.pl-v.tot' + c(S.main + S.side), h('small', 'Total'), f(S.main + S.side)));
  }
  // called by games when every bet is settled
  finishRound(extra = {}) {
    const r = this.round; this.round = { wagered: 0, returned: 0 };
    const net = round2(r.returned - r.wagered);
    if (r.wagered > 0) { this.sessionRounds = (this.sessionRounds || 0) + 1; this.sessionNet = round2((this.sessionNet || 0) + net); }
    for (const x of this.roundLog || []) { if (x.counted) continue; x.counted = true; if (x.side) this.session.side = round2(this.session.side + x.net); else this.session.main = round2(this.session.main + x.net); }
    this._roundDone = true; this.renderPL();
    if (r.wagered > 0) {
      if (net > 0) { this.showBanner('WIN ' + fmt(net), 'win'); net >= 20 * this.ctx.limits.min ? SFX.big() : SFX.win(); }
      else if (net < 0) { this.showBanner('LOSE ' + fmt(-net), 'lose', 1200); SFX.lose(); }
      else this.showBanner('PUSH', 'push', 1000);
    }
    const bets = (this.roundLog || []).map(x => ({ key: x.key, label: x.label, wager: x.wager, net: x.net }));
    App.roundDone(this.game.id, { wagered: r.wagered, returned: r.returned, net, compWagered: round2(r.wagered - (r.noComp || 0)), bets, ...extra });
    Rivals.afterRound(this, { net });
    return net;
  }
  saveBets(keys) {
    const b = {}; for (const k of keys) if (this.spots[k] && this.spots[k].amount) b[k] = this.spots[k].amount;
    if (Object.keys(b).length) App.state.lastBets[this.game.id] = b;
  }
  rebet() {
    const b = App.state.lastBets[this.game.id]; if (!b) return UI.toast('No previous bet', 'warn');
    for (const k in b) { const s = this.spots[k]; if (s && !s.locked && !s.amount) { if (!s.force(b[k])) { UI.toast('Not enough for full rebet', 'warn'); break; } s.o.onChange && s.o.onChange(s); } }
  }
  doubleBets() {
    const live = Object.values(this.spots).filter(s => !s.locked && !s.o.passive && !s.o.fixed && s.amount > 0);
    if (!live.length) { this.rebet(); if (!Object.values(this.spots).some(s => !s.locked && s.amount > 0)) return; return this.doubleBets(); }
    for (const s of live) { if (!s.place(s.amount)) break; }
  }
  clearBets(keys) { for (const k of keys || Object.keys(this.spots)) this.spots[k] && !this.spots[k].locked && this.spots[k].clear(); }
  totalOn(keys) { return (keys || Object.keys(this.spots)).reduce((a, k) => a + (this.spots[k] ? this.spots[k].amount : 0), 0); }
  // returns bets still on the layout (used when leaving mid-round)
  // Leaving the table: bets not yet in play go back to the bankroll. Mid-round (only possible by
  // closing the page) the bets in action are forfeited, so reloading can't undo a bad hand.
  refundAll() {
    const forfeit = this.busy || (this.game.canLeave && this.game.canLeave());
    for (const k in this.spots) { const s = this.spots[k]; if (s.amount > 0 && !forfeit) App.credit(s.amount); s.amount = 0; }
    (this.extraSpots || []).forEach(s => { s.amount = 0; });
  }
  showInfo() {
    const body = h('div.info');
    for (const sec of this.game.info(this.ctx)) {
      body.append(h('h3', sec.title));
      if (sec.text) body.append(h('p', sec.text));
      if (sec.rows) {
        const t = h('table.paytable');
        for (const row of sec.rows) t.append(h('tr', h('td', row[0]), h('td.num', row[1])));
        body.append(t);
      }
      if (sec.rtp != null) body.append(UI.rtpBadge(sec.rtp));
    }
    UI.modal({ title: this.game.name + ' — Rules & Paytables', body, wide: true });
  }
  destroy() { this.el.remove(); }
}
UI.Table = Table;

// RTP shown only once the player owns the Odds Book (or in free play)
UI.rtpBadge = function (rtp) {
  if (!App.perk('odds')) return h('p.muted.small', '🔒 Buy the Pit Boss Odds Book to see the exact return.');
  const edge = 1 - rtp;
  const cls = rtp >= 1 ? 'good' : rtp >= 0.98 ? 'ok' : 'bad';
  return h('p.rtp.' + cls, `Return to player ${pctStr(rtp)} · ${edge > 0 ? 'house edge ' + pctStr(edge) : 'player edge ' + pctStr(-edge)}`);
};
UI.payRows = (table, suffix = ' to 1') => table.map(t => [t.name, (t.pays === 0 ? 'Push' : t.pays + suffix)]);

/* ---------- Progressive meter ---------- */
UI.meter = function (key, label) {
  const el = h('div.meter', h('div.meter-l', label), h('div.meter-v'), h('div.meter-ev'));
  el.update = () => {
    const prog = Progressives.def(key), m = App.state.progressives[key];
    el.querySelector('.meter-v').textContent = fmt(Math.floor(m));
    const evEl = el.querySelector('.meter-ev');
    if (App.perk('tracker')) {
      const r = Progressives.rtp(key);
      evEl.textContent = 'RTP ' + pctStr(r, 1); evEl.className = 'meter-ev ' + (r >= 1 ? 'good' : r > 0.97 ? 'ok' : 'bad');
    } else evEl.textContent = '';
  };
  el.update();
  return el;
};

/* ---------- Toasts and modals ---------- */
UI.esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// big news (achievements, side jobs, chapters) stays up long enough to read, with an optional
// second line; everyday messages slip away after a few seconds. Taps pass through toasts, so they
// never block the joystick or the table buttons underneath.
UI.toast = function (msg, type = '', sub = '') {
  let box = $('#toasts'); if (!box) { box = h('div#toasts'); document.body.append(box); }
  const long = type === 'big' || type === 'award', ms = long ? 8000 : 3200;
  const t = h('div.toast.' + (type || 'info'), { role: long ? 'status' : null }, sub ? [h('div', msg), h('small.toast-sub', sub)] : msg);
  let gone = false;
  const go = () => { if (gone) return; gone = true; t.classList.add('out'); setTimeout(() => t.remove(), 450); };
  box.append(t);
  setTimeout(go, ms);
};

UI.modal = function ({ title, body, buttons, wide, closable = true, cls }) {
  let closer;
  const p = new Promise(resolve => {
    const close = v => { bg.remove(); document.removeEventListener('keydown', esc); resolve(v); };
    const esc = e => { if (e.key !== 'Escape' || !closable) return; const all = $$('.modal-bg'); if (all[all.length - 1] !== bg) return; e.stopImmediatePropagation(); close(null); }; // only the top modal closes
    const box = h('div.modal' + (wide ? '.wide' : '') + (cls ? '.' + cls : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': typeof title === 'string' ? title : 'Dialog' },
      title ? h('div.modal-h', h('h2', title), closable ? h('button.x', { onclick: () => close(null), 'aria-label': 'Close' }, '×') : null) : null,
      h('div.modal-b', typeof body === 'string' ? h('p', body) : body),
      buttons ? h('div.modal-f', buttons.map(b => h('button.btn' + (b.cls ? '.' + b.cls : ''), { disabled: b.disabled, onclick: () => close(b.value !== undefined ? b.value : b.label) }, b.label))) : null);
    // ignore the tap that opened this (a phone sends its click when the finger lifts)
    const opened = performance.now();
    const bg = h('div.modal-bg', { onclick: e => { if (e.target === bg && closable && performance.now() - opened > 450) close(null); } }, box);
    document.body.append(bg); document.addEventListener('keydown', esc);
    closer = close;
    const first = box.querySelector('.modal-f .btn.primary') || box.querySelector('.modal-f .btn');
    first && setTimeout(() => first.focus(), 30);
  });
  p.close = v => closer && closer(v);
  return p;
};

/* Story dialogue: lines = [{who, text}] ; optional choices at the end. */
UI.dialog = async function (lines, choices) {
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i], ch = CHARACTERS[L.who] || (typeof STAFF !== 'undefined' && STAFF[L.who]) || CHARACTERS.narrator;
    const last = i === lines.length - 1;
    const text = typeof L.text === 'function' ? L.text() : L.text;
    const body = h('div.dialog',
      h('div.portrait', Portrait.el(ch === CHARACTERS.narrator ? 'narrator' : L.who)),
      h('div.d-text', h('div.d-name', ch.name), h('p', { html: UI.esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') })));
    const btns = last && choices ? choices.map(c => ({ label: c.label, value: c.value, cls: c.cls || 'primary' })) : [{ label: last ? 'Okay' : 'Next ›', cls: 'primary', value: 'next' }];
    // story scenes are voiced when you've turned voices on (your own lines stay silent)
    const vp = typeof Voice !== 'undefined' && Voice.prefs();
    if (vp && vp.speak && vp.story !== false && L.who !== 'me') Voice.say({ id: ch === CHARACTERS.narrator ? 'narrator' : L.who, name: ch.name }, text);
    const v = await UI.modal({ body, buttons: btns, closable: false, cls: 'dlg' });
    if (vp && vp.speak) Voice.stop();
    if (last && choices) return v;
  }
  return 'next';
};

UI.confirm = (title, text, yes = 'Yes', no = 'Cancel') =>
  UI.modal({ title, body: text, buttons: [{ label: no, value: false, cls: 'ghost' }, { label: yes, value: true, cls: 'primary' }] });
