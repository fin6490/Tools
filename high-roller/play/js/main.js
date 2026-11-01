/* Screens and navigation: title, hub, venue lobby, table, shop, loan shark, trophies, stats. */
// you, on the Status screen: the same portrait as the mirror (Your look: skin, hair, beard, glasses, outfit, and whichever
// of the hat, shades and chain you own and wear)
const Avatar = { svg() { return Looks.svg(); } };

const Router = {
  screen: 'title', table: null, game: null,
  go(screen, arg) {
    if (screen === 'world' && App.inReality()) screen = 'reality'; // leaving a table you sat down at in Level 2
    if (screen === 'world' && App.inLaptop()) screen = 'bedsit'; // closing a game on the laptop in Level 3
    if (this.screen === 'reality') L2.unmount();
    if (this.screen === 'bedsit' && screen !== 'bedsit') L3.unmount();
    if (this.screen === 'originals' && typeof Originals !== 'undefined') Originals.unmount();
    CUR = screen === 'bedsit' || App.inLaptop() ? '£' : '$';
    World.unmount();
    this.teardownTable();
    this.screen = screen; this.arg = arg;
    const app = $('#app'); app.innerHTML = '';
    document.body.dataset.screen = screen;
    if (App.state) document.body.dataset.back = App.state.equipped.back || 'red';
    if (screen !== 'title' && screen !== 'reality' && screen !== 'bedsit') app.append(this.hudEl());
    const main = h('main.screen');
    app.append(main);
    (Screens[screen] || Screens.title)(main, arg);
    this.hud();
    window.scrollTo(0, 0);
  },
  refresh() { if (this.screen !== 'table') this.go(this.screen, this.arg); else this.hud(); },
  teardownTable() {
    if (this.table) {
      if (this.game && this.game.unmount) this.game.unmount();
      this.table.refundAll(); this.table.destroy(); this.table = null; this.game = null; App.save();
    }
  },
  // navigation away from a table must respect bets in action
  safeGo(screen, arg) {
    if (Holdem.active() && this.screen === 'pokertable') return UI.toast('Use ← Leave to leave the tournament', 'warn');
    if (Darts.active() && this.screen === 'darts') return UI.toast('Finish the match first (or concede)', 'warn');
    if (Slots.busy() && this.screen === 'slots') return UI.toast('Let the reels stop first', 'warn');
    if (this.screen === 'originals' && typeof Originals !== 'undefined' && Originals.busy()) return UI.toast('Stop the autobet (or finish the round) first', 'warn');
    if (this.table) {
      if (this.table.busy) return UI.toast('Finish the round first', 'warn');
      const block = this.game && this.game.canLeave && this.game.canLeave();
      if (block) return UI.toast(block, 'warn');
    }
    this.go(screen, arg);
  },
  leaveTable() {
    const busy = this.table && this.table.busy;
    if (busy) return UI.toast('Finish the round first', 'warn');
    const block = this.game && this.game.canLeave && this.game.canLeave();
    if (block) return UI.toast(block, 'warn');
    this.go('world');
  },
  async openTable(gameId) {
    const st = App.state, v = VENUES[st.venue];
    const why = Career.canPlay();
    if (why) { UI.toast(why, 'warn'); return; }
    this.go('table');
    const g = GAMES[gameId];
    const ev = Career.eventAt(st.venue);
    let limits = ev && ev.limits ? { ...v.limits, max: v.limits.max * ev.limits } : v.limits, chips = v.chips;
    if (App.inLaptop()) { limits = { ...limits, min: 5, max: 100000 }; chips = [5, 25, 100, 1000, 5000, 25000]; } // LuckyStrike.bet: £5 to £100,000 a hand
    if (st.ending && st.venue === 'salon') { limits = { ...limits, max: Math.max(limits.max, 1000000) }; chips = [1000, 5000, 25000, 100000, 1000000]; }
    const ctx = { venue: App.inReality() ? { ...v, name: 'The Meridian' } : App.inLaptop() ? { ...v, name: 'LuckyStrike.bet' } : v, venueId: st.venue, limits, chips, rules: (v.rules && v.rules[gameId]) || {} };
    const main = $('main.screen');
    this.table = new UI.Table(main, g, ctx);
    this.game = g;
    g.mount(this.table, ctx);
    Rivals.onTableOpen(this.table);
  },
  hudEl() {
    const st = App.state;
    if (App.inLaptop()) return h('header.hud.hud-l2.hud-l3', h('button.logo', { onclick: () => this.safeGo('bedsit'), title: 'Back to the laptop' }, '←', h('span', 'LuckyStrike.bet')),
      h('div.hud-stats', h('div.hs.drink', h('small', '🍺 Drink'), h('b#hud-drink')), h('div.hs.bank', h('small', 'Your balance'), h('b#hud-bank'))));
    if (App.inReality()) return h('header.hud.hud-l2', h('button.logo', { onclick: () => this.safeGo('reality'), title: 'Back to the Meridian' }, '←', h('span', 'The Meridian')),
      h('div.hud-stats', h('div.hs.bank', h('small', 'Your money'), h('b#hud-bank'))));
    return h('header.hud',
      h('button.logo', { onclick: () => this.safeGo('world'), title: 'Back to the map' }, '🎲', h('span', 'The Meridian')),
      h('div.hud-stats',
        h('div.hs', h('small', st.name), h('b#hud-day', 'Day ' + st.day), h('em#hud-clock.hud-clock')),
        h('div.hs.bank', h('small', 'Bankroll'), h('b#hud-bank')),
        st.mode === 'career' ? h('div.hs.debt', { onclick: () => this.safeGo('loans'), title: 'Loans' }, h('small', 'Debt'), h('b#hud-debt')) : null,
        st.mode === 'career' ? h('div.hs.needs-h', { title: 'Hunger · Thirst · Energy' },
          ...[['hunger', '🍔'], ['thirst', '💧'], ['stam', '⚡']].map(([k, i]) => h('div.nb', h('span', i), h('div.bar', h('i#hud-' + k), k === 'stam' ? h('b.lock#hud-lock') : null))),
          h('div.nb.mood', h('span#hud-mood-face', '🙂'), h('div.bar', h('i#hud-mood')))) : null,
        st.mode === 'career' ? h('div.hs.swag', h('small', 'Swagger'), h('b#hud-swag')) : null),
      h('button.btn.ghost.sm.menu', { onclick: () => Screens.menu() }, '☰'));
  },
  hud() {
    if (!App.state) return;
    const st = App.state, set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
    if (App.inLaptop() && typeof L3 !== 'undefined') L3.lapHud();
    set('hud-bank', Math.abs(st.bank) >= 1e5 && innerWidth < 700 ? CUR + (st.bank >= 1e9 ? (st.bank / 1e9).toFixed(2) + 'B' : st.bank >= 995e3 ? (st.bank / 1e6).toFixed(2) + 'M' : (st.bank / 1e3).toFixed(1) + 'K') : fmt(st.bank)); set('hud-day', 'Day ' + st.day); set('hud-clock', (World.isNight() ? '🌙 ' : '☀️ ') + World.clockText());
    set('hud-debt', fmt(App.debt)); set('hud-swag', '★ ' + Career.swagger());
    const d = document.getElementById('hud-debt'); if (d) d.parentElement.classList.toggle('zero', App.debt === 0);
    const tired = Career.tiredness(), emax = Career.energyMax();
    for (const [id, v, max] of [['hud-hunger', st.hunger, 100], ['hud-thirst', st.thirst, 100], ['hud-stam', st.stamina, emax]]) {
      const e = document.getElementById(id); if (!e) continue;
      const p = clamp(v / max, 0, 1); e.style.width = (p * 100) + '%'; e.className = p < 0.2 ? 'low' : '';
      e.parentElement.parentElement.title = id === 'hud-stam' && tired >= 5 ? `${Math.round(v)} / ${max} · tiredness ${Math.round(tired)}%: sleep to unlock the striped part` : `${Math.round(v)} / ${max}`;
    }
    const lk = document.getElementById('hud-lock'); if (lk) lk.style.width = tired + '%';
    Mood.paint();
    if (this.table) $$('.meter').forEach(m => m.update && m.update());
  },
};

const Screens = {
  table() { }, // the Table component fills this screen
  world(main) { World.mount(main); },
  reality(main) { L2.screen(main); },
  bedsit(main) { L3.screen(main); },
  originals(main, game) { Originals.screen(main, game); },
  poker(main) { Holdem.lobby(main); },
  pokertable(main) { Holdem.table(main); },
  darts(main) { Darts.screen(main); },
  slots(main, venueId) { Slots.screen(main, venueId); },
  case(main) { Mystery.screen(main); },
  title(main) {
    document.body.dataset.screen = 'title';
    const slots = App.listSlots();
    const slotRow = ({ i, s }) => h('div.slot',
      h('div.slot-info', h('b', `Slot ${i}`), s
        ? h('span', Screens.slotLine(s))
        : h('span.muted', 'Empty')),
      h('div.slot-btns',
        s ? h('button.btn.primary.sm', { onclick: () => { App.start(s, i); Router.go('world'); } }, 'Continue') : null,
        s && (s.l2 || s.ending) ? h('button.btn.sm.l2-go', { onclick: () => { App.start(s, i); Router.go('reality'); } }, s.l2 ? 'Level 2' : 'Wake up') : null,
        s ? h('button.btn.sm.l3-go', { onclick: () => { App.start(s, i); L3.begin(); }, title: s.l3 ? 'The bedsit' : 'For testing: go straight to Level 3' }, s.l3 ? 'Level 3' : '🧪 Level 3') : null, // testing: open to every save for now
        h('button.btn.sm', { onclick: () => Screens.newGame(i, 'career') }, 'New Career'),
        h('button.btn.ghost.sm', { onclick: () => Screens.newGame(i, 'free') }, 'Free Play'),
        s ? h('button.btn.ghost.sm.danger', { onclick: async () => { if (await UI.confirm('Delete save?', `Erase slot ${i} (${s.name})? This can't be undone.`, 'Delete')) { App.deleteSlot(i); Router.go('title'); } } }, 'Delete') : null));
    const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      const free = slots.find(s => !s.s);
      const slot = free ? free.i : await UI.modal({ title: 'Import into which slot?', body: 'All slots are full. Pick one to overwrite.', buttons: [1, 2, 3].map(i => ({ label: 'Slot ' + i, value: i })) });
      if (!slot) return;
      try { await App.importSave(f, slot); Router.go('world'); UI.toast('Save imported', 'good'); } catch (err) { UI.toast('Import failed: ' + err.message, 'warn'); }
    } });
    main.append(h('div.title.mer',
      h('div.mer-scene', { 'aria-hidden': 'true', html: Screens.skyline() }), h('div.mer-rain', { 'aria-hidden': 'true' }),
      h('div.mer-sign', h('small', 'THE'), h('h1', { 'aria-label': 'The Meridian' }, ...'MERIDIAN'.split('').map((c, i) => h('span' + (i === 3 ? '.flk' : ''), c))), h('span.mer-sub', 'a casino story')),
      h('p.tagline', 'Pay off Sal\'s debt. Beat the house. Find out what really happened to Sal.'),
      h('p.greeting', Me.greeting()),
      h('div.slots', slots.map(slotRow)),
      h('div.title-foot', h('button.btn.ghost.sm', { onclick: () => fileIn.click() }, '⤒ Import save file'), fileIn,
        h('p.muted.small', 'Your game autosaves in this browser after every hand. Use Export in the ☰ menu to keep a backup file.'))));
  },

  async newGame(slot, mode) {
    const existing = App.listSlots()[slot - 1].s;
    if (existing && !(await UI.confirm('Overwrite slot?', `Slot ${slot} has ${existing.name}'s game. Start over?`, 'Overwrite'))) return;
    const input = h('input.field', { value: existing ? existing.name : (Me.first() || (window.HR_HOST && !window.HR_HOST.owner ? 'Lucky' : 'Fin')), maxlength: 18, placeholder: 'Your name' });
    const body = h('div', h('p', mode === 'career'
      ? 'Career: start with $500 and your late Uncle Sal\'s debt to a loan shark. Work your way from a dive bar to the high-limit salon.'
      : 'Free Play: every casino open, all helpers on, $10,000 bankroll with free refills. No story, no stamina.'),
      h('label.lbl', 'Name'), input);
    setTimeout(() => input.select(), 50);
    const ok = await UI.modal({ title: mode === 'career' ? 'New Career' : 'Free Play', body, buttons: [{ label: 'Cancel', value: false, cls: 'ghost' }, { label: 'Start', value: true, cls: 'primary' }] });
    if (!ok) return;
    const st = App.defaultState(mode, input.value.trim() || 'Lucky');
    if (mode === 'free') for (const v in VENUES) st.unlocked[v] = true;
    App.start(st, slot);
    Router.go('world');
    await Looks.edit(true);
    if (mode === 'career') {
      const fin = Me.known().length ? [{ who: 'dolores', text: () => `And you're the one with the betting programs, aren't you, ${App.state.name}? Word gets around. Sal kept his systems on bar napkins. He'd have loved you.` }] : [];
      await UI.dialog(CHAPTERS[0].intro.concat(fin, [{ who: 'narrator', text: 'Walk with the arrow keys or WASD (the on-screen pad on a phone). Press **Space** or **A** to talk, sit at a table or buy something. Hold **Shift** or **B** to run. Keep an eye on hunger 🍔, thirst 💧 and energy ⚡ at the top.' }]));
      Router.refresh();
    }
  },

  status(main) {
    const st = App.state, career = st.mode === 'career';
    const ch = CHAPTERS[st.chapter];
    const owned = Object.keys(st.items).filter(k => st.items[k] && ITEMS[k]);
    main.append(h('div.hub',
      h('section.panel.me',
        h('div.avatar', { html: Avatar.svg() }),
        h('div.me-info',
          h('h2', st.name), career ? h('div.muted', `Swagger ★ ${Career.swagger()} · Credit line ${fmt(Career.creditLimit())}`) : h('div.muted', 'Free Play'),
          h('div.inv', owned.length ? owned.map(k => h('span.inv-i', { title: ITEMS[k].name }, ITEMS[k].icon)) : h('span.muted.small', 'Nothing yet. The shop awaits.')),
          h('div.net', 'Net worth ', h('b', fmt(App.netWorth()))))),
      career ? Mood.panel() : null,
      career ? Rel.panel() : null,
      career ? Fragments.panel() : null,
      career && ch ? h('section.panel.story',
        h('div.kicker', `Chapter ${st.chapter + 1}`), h('h3', ch.title), h('p', ch.goalText),
        Screens.goalProgress()) : null,
      h('section.locs',
        h('div.lobby-h', h('button.btn.ghost.sm', { onclick: () => Router.go('world') }, '← Back to the map'), h('h2', 'Status')),
        h('div.grid',
          h('button.loc', { onclick: () => Router.go('trophies') }, h('div.loc-i', '🏅'), h('div.loc-t', h('b', 'Trophy Room'), h('span', `${Object.keys(st.achievements).length}/${ACHIEVEMENTS.length} achievements`))),
          h('button.loc', { onclick: () => Router.go('case') }, h('div.loc-i', '🔎'), h('div.loc-t', h('b', 'Case file'), h('span', App.state.ending ? 'Case closed' : `Act ${Mystery.act()} · ${Object.keys(Mystery.st().clues).length} pieces of evidence`))),
          h('button.loc', { onclick: () => Router.go('stats') }, h('div.loc-i', '📊'), h('div.loc-t', h('b', 'Stats'), h('span', `${st.stats.rounds.toLocaleString()} rounds played`))),
          !career ? h('button.loc', { onclick: () => { if (st.bank < 10000) { st.bank = 10000; App.save(); Router.refresh(); UI.toast('Bankroll refilled', 'good'); } else UI.toast('You already have $10,000+', 'warn'); } }, h('div.loc-i', '💵'), h('div.loc-t', h('b', 'Refill bankroll'), h('span', 'Top up to $10,000'))) : null),
        career ? Screens.legendBoard() : null,
        career ? Screens.rivalBoard() : null,
        career ? Screens.jobBoard() : null,
        h('h3.sec', 'Getting around'),
        h('ul.howto',
          h('li', 'Walk into a door to go inside. Casinos need their story and dress-code requirements first.'),
          h('li', 'Inside a casino, walk up to a dealer or table and press A / Space to sit down. The bar is on the left wall.'),
          h('li', 'Eat at Mel\'s Diner, the Quik-Stop, the steakhouse or any casino bar. Casino bars comp drinks once you\'ve been playing.'),
          h('li', 'Sleep at the Starlite Motel, the Grand Hotel, your own place, or a park bench if you\'re feeling lucky.'),
          h('li', 'Vinnie\'s Pawn & Loan is in Old Town. Lucky Strike Outfitters sells clothes, gear and the deeds.'))),
      h('section.panel.news', h('h3.sec', 'Town Crier'),
        st.news.length ? h('ul', st.news.slice(0, 6).map(n => h('li', h('small', 'Day ' + n.day), ' ', n.text))) : h('p.muted', 'Quiet night.'),
        h('h3.sec', 'Progressive meters'),
        h('div.meters-mini', Progressives.KEYS.map(k => {
          const r = Progressives.rtp(k);
          return h('div.mm', h('span', PAY[k].prog.name), h('b', fmt(Math.floor(st.progressives[k]))),
            App.perk('tracker') ? h('em.' + (r >= 1 ? 'good' : r > 0.97 ? 'ok' : 'bad'), pctStr(r, 1)) : null);
        })),
        h('h3.sec', 'Slot mystery jackpots (hottest meter per casino)'),
        h('div.meters-mini', Object.keys(SLOT_MACHINES).filter(v => st.mode !== 'career' || st.unlocked[v]).map(v => {
          const ms = Slots.meters(v), b = SLOT_MACHINES[v].b;
          const hot = MYSTERY.map(t => ({ t, p: (ms[t.key].v - t.reset * b) / ((t.cap - t.reset) * b) })).sort((x, y) => y.p - x.p)[0];
          return h('div.mm', h('span', `${SLOT_MACHINES[v].name} · ${hot.t.icon} ${hot.t.name}`), h('b', fmt(Math.floor(ms[hot.t.key].v))), h('em.' + (hot.p > .85 ? 'good' : hot.p > .6 ? 'ok' : 'bad'), `${Math.round(hot.p * 100)}% to cap`));
        })))));
  },

  // post-story targets, with progress
  legendBoard() {
    const st = App.state; if (!st.ending && st.chapter < 3) return null;
    const worth = Career.empire(), inc = Career.income();
    const rows = ACHIEVEMENTS.filter(a => a.legend);
    const target = { m10: 1e7, m100: 1e8, b1: 1e9, b10: 1e10 };
    return h('div', h('h3.sec', 'Legend goals'),
      h('p.small', `Empire value ${fmt(worth, { short: true })} (cash plus businesses at cost) · business income ${fmt(inc, { short: true })} a day`),
      h('div.legend', rows.map(a => h('div.lg' + (st.achievements[a.id] ? '.done' : ''), h('b', (st.achievements[a.id] ? '🏆 ' : '◻️ ') + a.name), h('span', a.desc),
        target[a.id] && !st.achievements[a.id] ? h('div.bar', h('i', { style: { width: clamp(worth / target[a.id], 0, 1) * 100 + '%' } })) : null))));
  },
  // your place in the net-worth race against the rivals (1 = top)
  rivalRank() {
    const st = App.state; Rivals.ensure();
    const me = App.netWorth();
    return 1 + Object.keys(RIVALS).filter(id => st.rivals[id].where !== 'jail' && st.rivals[id].bank > me).length;
  },
  rivalBoard() {
    const st = App.state; Rivals.ensure();
    const rows = Object.keys(RIVALS).filter(id => st.rivals[id].where !== 'jail').map(id => ({ id, name: CHARACTERS[id].name, face: CHARACTERS[id].face, bank: st.rivals[id].bank, where: Rivals.where(id) }));
    rows.push({ id: 'me', name: st.name + ' (you)', face: '🙂', bank: App.netWorth(), where: null });
    rows.sort((a, b) => b.bank - a.bank);
    return h('div', h('h3.sec', 'Rival standings (net worth)'),
      h('table.paytable', rows.map((r, i) => h('tr' + (r.id === 'me' ? '.me-row' : ''), h('td', `${i + 1}. ${r.face} ${r.name}`),
        h('td.muted.small', r.where ? (r.where === 'town' ? 'around town' : 'at ' + VENUES[r.where].name) : ''), h('td.num', fmt(r.bank))))));
  },
  jobBoard() {
    const ids = Object.keys(QUESTS).filter(id => Quests.status(id));
    return h('div', h('h3.sec', 'Side jobs'),
      ids.length ? h('ul.howto', ids.map(id => { const q = QUESTS[id], s = Quests.state()[id]; return h('li', (s.s === 'done' ? '✅ ' : '📝 ') + q.title + ': ' + q.desc + (q.need && s.s !== 'done' ? ` (${s.n || 0}/${q.need})` : '')); }))
        : h('p.muted.small', 'Talk to people around town. Some of them have work for you.'));
  },
  goalProgress() {
    const st = App.state, wrap = h('div.goal');
    const bar = (label, cur, target) => h('div.gbar', h('div.gl', h('span', label), h('span', `${fmt(Math.min(cur, target))} / ${fmt(target)}`)),
      h('div.bar', h('i', { style: { width: clamp(cur / target, 0, 1) * 100 + '%' } })));
    const sal = st.loans.find(l => l.id === 'sal');
    if (sal && sal.weekly) wrap.append(bar(`Sal's marker paid off (${fmt(sal.balance)} to go)`, Math.max(0, 500000 - sal.balance), 500000),
      h('p.small', Career.owedNow(sal) > 0 ? `This week: ${fmt(Career.owedNow(sal))} more to Vinnie by day ${sal.due} (${Math.max(0, sal.due - st.day)} days left)` : `✔ This week's payment is covered. Next due day ${sal.due + 7}.`));
    else if (st.chapter === 0 && sal) wrap.append(h('p.small', `Marker balance ${fmt(sal.balance)} · due day ${sal.due} (${Math.max(0, sal.due - st.day)} days left) · pay at Vinnie's`));
    if (st.chapter === 1) wrap.append(bar('Bankroll', st.bank, 25000), h('p.small', st.flags.metDoc ? '✔ Met Doc' : '✘ Find Doc on the Riverboat'));
    if (st.chapter === 2) wrap.append(bar('Bankroll', st.bank, 250000), h('p.small', App.has('platinum') ? '✔ Platinum card' : '✘ Platinum Players Card (shop)'));
    if (st.chapter === 3) wrap.append(bar('Deed fund', st.bank, 1000000));
    return wrap;
  },

  shop(main) {
    const st = App.state;
    const cats = [...new Set(Object.values(ITEMS).map(i => i.cat))];
    let cat = Screens._shopCat || cats[0];
    const grid = h('div.shopgrid'), tabs = h('div.tabs');
    const render = () => {
      tabs.innerHTML = ''; grid.innerHTML = '';
      cats.forEach(c => tabs.append(h('button.tab' + (c === cat ? '.on' : ''), { onclick: () => { cat = Screens._shopCat = c; render(); } }, c)));
      for (const id in ITEMS) {
        const it = ITEMS[id]; if (it.cat !== cat) continue;
        const owned = !!st.items[id], block = Career.itemAvailable(id);
        const tags = [];
        if (it.swagger) tags.push('★ +' + it.swagger);
        if (it.stamina) tags.push('⚡ +' + it.stamina);
        if (it.comp) tags.push(pctStr(it.comp, 2) + ' comps');
        if (it.upkeep) tags.push(fmt(it.upkeep) + '/day');
        grid.append(h('div.item' + (owned ? '.owned' : ''),
          h('div.item-i', it.icon), h('b', it.name), h('p', it.desc),
          tags.length ? h('div.tags', tags.map(t => h('span', t))) : null,
          owned ? (it.felt || it.back)
            ? h('button.btn.sm', { onclick: () => { if (it.felt) st.equipped.felt = it.felt; if (it.back) st.equipped.back = it.back; App.save(); UI.toast('Equipped', 'good'); render(); } },
              (st.equipped.felt === it.felt || st.equipped.back === it.back) ? '✔ Equipped' : 'Equip')
            : h('div.owned-l', '✔ Owned')
            : block ? h('div.muted.small', '🔒 ' + block)
              : h('button.btn.primary.sm', { disabled: st.bank < it.price, onclick: async () => {
                if (it.price >= 10000 && !(await UI.confirm('Buy ' + it.name + '?', `This costs ${fmt(it.price)}.`, 'Buy'))) return;
                Career.buy(id); render();
              } }, fmt(it.price))));
      }
      if (cat === 'Table Style') {
        grid.append(h('div.item', h('div.item-i', '🟩'), h('b', 'Classic Green Felt'), h('p', 'The original.'),
          h('button.btn.sm', { onclick: () => { st.equipped.felt = 'green'; App.save(); render(); } }, st.equipped.felt === 'green' ? '✔ Equipped' : 'Equip')),
          h('div.item', h('div.item-i', '🂠'), h('b', 'Red Card Backs'), h('p', 'The original.'),
            h('button.btn.sm', { onclick: () => { st.equipped.back = 'red'; App.save(); render(); } }, st.equipped.back === 'red' ? '✔ Equipped' : 'Equip')));
      }
    };
    main.append(h('div.shop', h('div.lobby-h', h('button.btn.ghost.sm', { onclick: () => Router.go('world') }, '← Map'),
      h('div', h('h2', '🛍️ Lucky Strike Outfitters'), h('p.muted', '"If you look like a high roller, the comps follow." — the sign in the window')),
      h('button.btn.sm.ghost', { onclick: () => Chat.open(Crowd.staff('rosa')) }, '💬 Talk to Rosa')),
      tabs, grid));
    render();
  },

  loans(main) {
    const st = App.state, limit = Career.creditLimit();
    const vin = st.loans.find(l => l.id === 'vinnie'), vinBal = vin ? vin.balance : 0;
    const room = Math.max(0, Math.floor(limit - vinBal));
    const amt = h('input.field', { type: 'number', min: 0, step: 100, 'aria-label': 'Amount to borrow', value: Math.min(room, 500) });
    main.append(h('div.loans',
      h('div.lobby-h', h('button.btn.ghost.sm', { onclick: () => Router.go('world') }, '← Map'),
        h('div', h('h2', "🦈 Vinnie's Back Room"), h('p.muted', 'Behind the pawn shop. Smells like cigars and bad decisions.'))),
      h('div.dialog.inline', h('div.portrait', Portrait.el('vinnie')),
        h('div.d-text', h('div.d-name', CHARACTERS.vinnie.name), h('p', App.debt === 0 ? '"Clean books! Makes me nervous. Need a little something?"'
          : `"You owe me ${fmt(App.debt)}. Pay on time and we stay friends. I'm not a monster. I'm a businessman."`))),
      h('section.panel', h('h3', 'Your markers'),
        st.loans.length ? h('div.loanlist', st.loans.map(l => {
          const owed = Career.owedNow(l);
          const pay = h('input.field.sm', { type: 'number', min: 0, value: Math.min(Math.floor(st.bank), Math.ceil(l.weekly ? (owed || l.weekly) : l.balance)) });
          const terms = l.weekly
            ? `${fmt(l.weekly)} a week, no interest while you pay on time · ${owed > 0 ? `${fmt(owed)} still due by day ${l.due}` : `this week covered, next due day ${l.due + 7}`} · miss one and three weeks' worth goes on the marker`
            : `${pctStr(l.rate, 0)} per day${l.due ? ` · due day ${l.due}` : ''}`;
          return h('div.loan', h('div', h('b', l.label), h('div.muted.small', `${terms}${l.strikes ? ` · ⚠ ${l.strikes} strike${l.strikes > 1 ? 's' : ''}` : ''}`)),
            h('div.num.big', fmt(l.balance)),
            h('div.payrow', pay,
              h('button.btn.primary.sm', { onclick: () => { Career.repay(l.id, +pay.value || 0); Router.refresh(); } }, 'Pay'),
              l.weekly && owed > 0 ? h('button.btn.sm', { onclick: () => { Career.repay(l.id, owed); Router.refresh(); } }, 'Pay this week') : null,
              h('button.btn.sm', { onclick: () => { Career.repay(l.id, l.balance); Router.refresh(); } }, 'Pay all')));
        })) : h('p.muted', 'You don\'t owe anybody. Enjoy the feeling.')),
      h('section.panel', h('h3', 'Borrow'),
        h('p', `Credit line ${fmt(limit)} (grows with swagger and story) · Vinnie's rate ${pctStr(Career.vinnieRate(), 0)} per day, compounding · go over 150% of your line and Nico pays a visit.`),
        h('div.payrow', amt,
          h('button.btn.primary.sm', { disabled: room <= 0, onclick: () => {
            const v = Math.floor(+amt.value || 0);
            if (v <= 0) return; if (v > room) return UI.toast(`Vinnie will only go to ${fmt(room)} more`, 'warn');
            Career.borrow(v); UI.toast(`Borrowed ${fmt(v)}`, 'good'); Router.refresh();
          } }, 'Borrow'),
          h('span.muted.small', `Available: ${fmt(room)}`)))));
  },

  trophies(main) {
    const st = App.state;
    main.append(h('div.trophies', h('div.lobby-h', h('button.btn.ghost.sm', { onclick: () => Router.go('world') }, '← Map'), h('h2', '🏅 Trophy Room')),
      h('div.shopgrid', ACHIEVEMENTS.map(a => h('div.item' + (st.achievements[a.id] ? '.owned' : '.dim'),
        h('div.item-i', st.achievements[a.id] ? '🏅' : '🔒'), h('b', a.name), h('p', a.desc),
        h('div.tags', a.reward ? h('span', fmt(a.reward)) : null, a.swagger ? h('span', '★ +' + a.swagger) : null,
          st.achievements[a.id] ? h('span', 'Day ' + st.achievements[a.id]) : null))))));
  },

  stats(main) {
    const s = App.state.stats;
    const rows = Object.keys(s.perGame).map(g => [GAMES[g] ? GAMES[g].name : g, s.perGame[g].rounds.toLocaleString(), fmt(s.perGame[g].wagered), fmt(s.perGame[g].net, { sign: true })]);
    main.append(h('div.statsp', h('div.lobby-h', h('button.btn.ghost.sm', { onclick: () => Router.go('world') }, '← Map'), h('h2', '📊 Stats')),
      h('div.statgrid',
        [['Rounds', s.rounds.toLocaleString()], ['Total wagered', fmt(s.wagered)], ['Net result', fmt(s.returned - s.wagered, { sign: true })],
         ['Return', s.wagered ? pctStr(s.returned / s.wagered) : '—'], ['Biggest win', fmt(s.biggestWin)], ['Peak bankroll', fmt(s.peakBank)],
         ['Best win streak', s.bestStreak], ['Blackjacks', App.counter('blackjacks')], ['Jackpots', App.counter('jackpots')]]
          .map(([k, v]) => h('div.stat', h('small', k), h('b', String(v))))),
      h('table.paytable.wide', h('tr', h('th', 'Game'), h('th', 'Rounds'), h('th', 'Wagered'), h('th', 'Net')),
        rows.map(r => h('tr', r.map((c, i) => h(i ? 'td.num' : 'td', c)))))));
  },

  // the title's night: a city of lit windows, and the Meridian's tower in the middle with its sign
  skyline() {
    let seed = 17; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let out = '', x = 0;
    while (x < 1200) {
      const w = 40 + r() * 70, hh = 90 + r() * 170, mid = x > 520 && x < 680;
      if (mid) { x = 680; continue; }
      out += `<rect x="${x}" y="${400 - hh}" width="${w}" height="${hh}" fill="#0c0b16"/>`;
      for (let wy = 400 - hh + 12; wy < 392; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 11) if (r() < .28) out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="5" height="7" fill="${r() < .8 ? '#e8b860' : '#8ab0ff'}" opacity="${(.35 + r() * .6).toFixed(2)}"/>`;
      x += w + 2;
    }
    // the tower
    out += `<rect x="540" y="60" width="120" height="340" fill="#100e1c"/><rect x="560" y="40" width="80" height="24" fill="#100e1c"/><rect x="596" y="8" width="8" height="34" fill="#100e1c"/><circle cx="600" cy="8" r="4" fill="#ff3a3a" class="mer-beacon"/>`;
    for (let wy = 80; wy < 392; wy += 16) for (let wx = 552; wx < 650; wx += 12) if (r() < .45) out += `<rect x="${wx}" y="${wy}" width="6" height="9" fill="#f0c070" opacity="${(.3 + r() * .7).toFixed(2)}"/>`;
    return `<svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="mersky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05040c"/><stop offset=".6" stop-color="#1c1030"/><stop offset="1" stop-color="#4a1a2a"/></linearGradient></defs><rect width="1200" height="400" fill="url(#mersky)"/>${out}<rect y="396" width="1200" height="4" fill="#ff3a5a" opacity=".25"/></svg>`;
  },
  // one line about a saved game
  slotLine(s) {
    if (!s) return 'Empty';
    const ago = s.saved ? Math.round((Date.now() - s.saved) / 60000) : null, when = ago == null ? '' : ago < 1 ? ' · just now' : ago < 60 ? ` · ${ago} min ago` : ago < 1440 ? ` · ${Math.round(ago / 60)} h ago` : ` · ${Math.round(ago / 1440)} d ago`;
    return `${s.name} · ${s.mode === 'free' ? 'Free Play' : s.l3 ? 'Level 3' : s.l2 ? 'Level 2' : 'Career, ch. ' + (s.chapter + 1)} · Day ${s.day} · ${fmt(s.bank)}${s.flags && s.flags.gameOver ? ' · 💀' : ''}${s.copyOf ? ` · a copy of slot ${s.copyOf}` : ''}${when}`;
  },
  // save a copy of this game to another slot (a checkpoint before something risky), or load another slot
  async saveSlots(mode) {
    const list = App.listSlots();
    const m = UI.modal({ title: mode === 'copy' ? '🗂️ Save a copy' : '📂 Load a slot',
      body: h('div', h('p.muted.small', mode === 'copy' ? `You keep playing in slot ${App.slot}; the copy waits in the slot you pick. If something goes badly, load it back.` : `Your game in slot ${App.slot} is saved first.`),
        h('div.slot-pick', list.map(({ i, s }) => h('button.btn.slot-opt' + (i === App.slot ? '.cur' : ''), { disabled: i === App.slot || (mode === 'load' && !s) ? true : null, onclick: () => m.close(i) },
          h('b', `Slot ${i}${i === App.slot ? ' (playing)' : ''}`), h('small', Screens.slotLine(s)))))),
      buttons: [{ label: 'Cancel', value: 0, cls: 'ghost' }] });
    const pick = await m;
    if (!pick) return;
    const target = list[pick - 1].s;
    if (mode === 'copy') {
      if (target && !(await UI.confirm('Overwrite?', `Slot ${pick} has ${target.name}'s game (${Screens.slotLine(target)}). Replace it with a copy of this one?`, 'Overwrite'))) return;
      if (App.saveCopy(pick)) UI.toast(`🗂️ A copy is safe in slot ${pick}. You're still playing slot ${App.slot}.`, 'good');
    } else {
      if (World.savePos) World.savePos(); App.save();
      if (Router.screen === 'world') World.unmount();
      App.start(target, pick); Router.go(target.l3 && target.l3.atTable ? 'bedsit' : 'world'); UI.toast(`📂 Slot ${pick}: ${target.name}, day ${target.day}`, 'good');
    }
  },
  menu() {
    const st = App.state;
    const sel = (key, opts) => h('select.field.sm', { onchange: e => { st.settings[key] = e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value; App.save(); } },
      opts.map(([v, l]) => h('option', { value: String(v), selected: String(st.settings[key]) === String(v) ? true : null }, l)));
    const body = h('div.menu',
      h('label.lbl', 'Sound'), sel('sound', [[true, 'On'], [false, 'Off']]),
      h('label.lbl', 'Background sound (casino murmur, river, crickets…)'), sel('ambient', [[true, 'On'], [false, 'Off']]),
      h('label.lbl', 'Music (a live band in every casino)'), sel('music', [[true, 'On'], [false, 'Off']]),
      h('label.lbl', 'Dealing speed'), sel('speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['turbo', 'Turbo']]),
      h('label.lbl', 'Strategy hints (when you own the guide)'), sel('hints', [[true, 'Show'], [false, 'Hide']]),
      h('div.menu-btns',
        h('button.btn', { onclick: () => { box.close(); Router.safeGo('status'); } }, '📋 Status, story & trophies'),
        h('button.btn', { onclick: () => { box.close(); Router.safeGo('case'); } }, '🔎 Case file: The Seventeenth Card'),
        st.ending || st.l2 ? h('button.btn', { onclick: () => { box.close(); Router.safeGo('reality'); } }, '👁️ Level 2: The Meridian') : null,
        h('button.btn', { onclick: () => { box.close(); L3.begin(); } }, st.l3 ? '🪞 Level 3: The bedsit' : '🧪 Try Level 3 (testing)'), // testing: open to every save for now
        h('button.btn', { onclick: () => { box.close(); World.townMap(); } }, '🗺️ Town map'),
        h('button.btn', { onclick: () => { box.close(); Chat.settings(); } }, '💬 AI chat with characters'),
        h('button.btn', { onclick: () => { box.close(); Looks.edit(); } }, '🪞 Your look'),
        h('button.btn', { onclick: () => { box.close(); Me.edit(); } }, '🗂️ Your file (make it personal)'),
        h('button.btn', { onclick: () => { App.save(); UI.toast('Saved to slot ' + App.slot, 'good'); } }, '💾 Save now'),
        h('button.btn', { onclick: () => { box.close(); Screens.saveSlots('copy'); } }, '🗂️ Save a copy to another slot'),
        h('button.btn', { onclick: () => { box.close(); Screens.saveSlots('load'); } }, '📂 Load another slot'),
        h('button.btn', { onclick: () => App.exportSave() }, '⤓ Export save file'),
        h('button.btn.ghost', { onclick: () => { box.close(); App.save(); Router.safeGo('title'); } }, '⏏ Quit to title')),
      h('p.muted.small', `Slot ${App.slot} · autosaves after every round`));
    const box = UI.modal({ title: 'Menu', body });
  },
};

/* ---------- boot ---------- */
document.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea') || document.querySelector('.modal-bg')) return;
  // a focused button, chip or bet spot handles its own Space/Enter
  if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('button, a, [role=button], [role=radio]')) return;
  if (Router.table) Router.table.key(e);
});
window.addEventListener('beforeunload', () => { if (Router.table) Router.table.refundAll(); App.save(); });
// installed iPhone apps rarely fire beforeunload: save whenever the app goes to the background
const saveQuiet = () => { if (!App.state) return; if (World.savePos) World.savePos(); App.save(); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveQuiet(); });
window.addEventListener('pagehide', saveQuiet);
window.addEventListener('DOMContentLoaded', () => { Me.apply(); Router.go('title'); });
// installable/offline when served over http(s); opening the file directly still works without it
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.HR_HOST) { // a host site runs its own
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { });
    // ask the browser not to evict saved games
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  });
}
