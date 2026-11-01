/* The overworld: a tile map you walk around Pokémon-style. The town has casinos, food, shops and
   places to sleep; each casino has an interior where you walk up to a dealer to sit down.
   Everything is drawn procedurally on a canvas, so there are no image files. */
const World = (() => {
  const T = 16; // tile size in art pixels
  const G = { GRASS: 0, FLOWERS: 1, TREE: 2, ROAD: 3, WALK: 4, WATER: 5, PLANK: 6, WOOD: 7, CARPET: 8, WALL: 9, HEDGE: 10, SAND: 11, VOID: 12, TILE: 13 };
  const SOLID = new Set([G.TREE, G.WATER, G.WALL, G.HEDGE, G.VOID]);
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

  /* ======================= map building ======================= */
  function blank(id, w, h, fill) {
    const m = { id, w, h, tiles: new Uint8Array(w * h).fill(fill), block: new Uint8Array(w * h), buildings: [], props: [], npcs: [], doors: {}, acts: {}, labels: [], areas: [], tables: [] };
    m.at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? G.VOID : m.tiles[y * w + x];
    m.set = (x, y, t) => { if (x >= 0 && y >= 0 && x < w && y < h) m.tiles[y * w + x] = t; };
    m.rect = (x, y, rw, rh, t) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) m.set(i, j, t); };
    m.solid = (x, y) => SOLID.has(m.at(x, y)) || (x >= 0 && y >= 0 && x < w && y < h && m.block[y * w + x] === 1);
    m.blockRect = (x, y, rw, rh) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (i >= 0 && j >= 0 && i < w && j < h) m.block[j * w + i] = 1; };
    m.act = (x, y, a) => { m.acts[x + ',' + y] = a; };
    return m;
  }

  function buildTown() {
    const m = blank('town', 56, 42, G.GRASS);
    // flowers and trees in the open grass
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (hash(x, y, 1) < 0.08) m.set(x, y, G.FLOWERS);
    m.rect(0, 0, 56, 1, G.TREE); m.rect(0, 41, 56, 1, G.TREE); m.rect(0, 0, 1, 42, G.TREE);
    for (let x = 1; x < 26; x++) for (let y = 1; y < 9; y++) if (hash(x, y, 2) < 0.22) m.set(x, y, G.TREE);
    for (let x = 30; x < 47; x++) for (let y = 1; y < 6; y++) if (hash(x, y, 3) < 0.25) m.set(x, y, G.TREE);
    m.rect(30, 6, 17, 1, G.HEDGE);
    // river and the dock
    m.rect(48, 0, 8, 42, G.WATER); m.rect(47, 0, 1, 42, G.SAND);
    // roads and sidewalks
    m.rect(0, 17, 47, 1, G.WALK); m.rect(0, 18, 44, 2, G.ROAD); m.rect(0, 20, 47, 1, G.WALK);
    m.rect(26, 1, 1, 40, G.WALK); m.rect(27, 1, 2, 40, G.ROAD); m.rect(29, 1, 1, 40, G.WALK);
    m.rect(0, 30, 47, 1, G.WALK); m.rect(0, 31, 47, 2, G.ROAD); m.rect(0, 33, 47, 1, G.WALK);
    // the two junctions: open road through the middle (no pavement across it), corners stay
    // pavement, and a zebra crossing on each arm
    m.cross = {};
    for (const y0 of [17, 30]) {
      m.rect(27, y0, 2, 4, G.ROAD); m.rect(26, y0 + 1, 4, 2, G.ROAD);
      for (const y of [y0 + 1, y0 + 2]) { m.cross[25 + ',' + y] = 'h'; m.cross[30 + ',' + y] = 'h'; }
      for (const x of [27, 28]) { m.cross[x + ',' + (y0 - 1)] = 'v'; m.cross[x + ',' + (y0 + 4)] = 'v'; }
      m.junction = (m.junction || []).concat([[26, y0, 4, 4]]);
    }
    m.rect(29, 40, 12, 1, G.WALK);
    m.rect(44, 17, 4, 5, G.PLANK); m.rect(47, 18, 1, 3, G.PLANK);
    // Lucky Park
    m.rect(1, 34, 25, 7, G.GRASS);
    for (let x = 1; x < 26; x++) for (let y = 34; y < 41; y++) if (hash(x, y, 4) < 0.1) m.set(x, y, G.FLOWERS);
    m.rect(3, 37, 21, 1, G.WALK); m.rect(13, 34, 1, 7, G.WALK);
    [[2, 35], [5, 39], [22, 35], [24, 39], [19, 40], [7, 34]].forEach(([x, y]) => m.set(x, y, G.TREE));

    const B = (key, name, x, y, w, h, door, style, action) => {
      m.buildings.push({ key, name, x, y, w, h, door, style });
      m.blockRect(x, y, w, h);
      const dx = x + door, dy = y + h - 1;
      m.block[dy * m.w + dx] = 0;
      m.doors[dx + ',' + dy] = { ...action, out: [dx, dy + 1], label: name };
    };
    B('spur', 'The Rusty Spur', 2, 10, 8, 7, 3, 'spur', { venue: 'spur' });
    B('diner', "Mel's Diner", 11, 12, 6, 5, 2, 'diner', { room: 'diner' });
    B('store', 'Quik-Stop', 18, 12, 6, 5, 2, 'store', { room: 'store' });
    B('palace', 'The Gilded Palace', 31, 7, 10, 10, 4, 'palace', { venue: 'palace' });
    B('salon', 'Monte Royale', 42, 9, 5, 8, 2, 'salon', { venue: 'salon' });
    B('motel', 'Starlite Motel', 2, 23, 7, 7, 3, 'motel', { room: 'motel' });
    B('pawn', "Vinnie's Pawn & Loan", 10, 24, 6, 6, 2, 'pawn', { room: 'pawn' });
    B('shop', 'Lucky Strike Outfitters', 17, 23, 8, 7, 3, 'shop', { room: 'shop' });
    B('grand', 'Grand Hotel', 31, 22, 7, 8, 3, 'grand', { room: 'grand' });
    B('apts', 'Downtown Apartments', 39, 23, 5, 7, 2, 'apts', { room: 'apts' });
    B('steak', 'Prime Cut', 31, 35, 6, 5, 2, 'steak', { room: 'steak' });
    // the riverboat moored at the dock; the gangplank is its door
    m.props.push({ type: 'boat', x: 48, y: 14, w: 7, h: 10 });
    m.doors['47,19'] = { venue: 'riverboat', out: [46, 19], label: "Lucky Lou's Riverboat" };
    // park furniture
    m.props.push({ type: 'fountain', x: 12, y: 36, w: 3, h: 3 }); m.blockRect(12, 36, 3, 3);
    m.rect(13, 36, 1, 3, G.GRASS);
    [[6, 36], [19, 36], [6, 38], [19, 38]].forEach(([x, y]) => { m.props.push({ type: 'bench', x, y }); m.blockRect(x, y, 1, 1); m.act(x, y, { sleep: ['bench'], label: 'Park bench' }); });
    for (let x = 3; x < 46; x += 6) { m.props.push({ type: 'lamp', x, y: 17 }); m.props.push({ type: 'lamp', x, y: 30 }); }
    // street furniture
    const furn = (kind, x, y, w, hh, act) => { m.props.push({ type: 'furn', kind, x, y, w, h: hh }); m.blockRect(x, y, w, hh); if (act) for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) m.act(x + i, y + j, act); };
    furn('rack', 24, 16, 1, 1, { fn: 'paper', label: 'Newsstand: the morning paper' });
    furn('machine', 16, 29, 1, 1, { fn: 'atm', label: 'ATM' });
    furn('phone', 9, 29, 1, 1, { fn: 'phone', label: 'Phone booth' });
    furn('car', 44, 25, 2, 2, { talk: 'A dusty sedan with a parking ticket from three weeks ago. The plate reads LUCKY7.', label: 'Parked car' });
    // a duck pond in Lucky Park
    m.rect(20, 39, 3, 2, G.WATER);
    m.act(19, 39, { talk: 'Three ducks paddle over, hoping you have bread. You do not. They seem to know.', label: 'Duck pond' });
    m.labels.push({ x: 14, y: 18.5, text: 'MAIN STREET', street: true }, { x: 14, y: 31.5, text: 'RIVER ROAD', street: true });
    // signposts
    m.props.push({ type: 'sign', x: 25, y: 16, text: 'OLD TOWN' }); m.blockRect(25, 16, 1, 1);
    m.act(25, 16, { talk: 'Old Town: the Spur, Mel\'s, the motel, and Vinnie. The Strip is north-east, the Riverboat is at the east dock.', label: 'Signpost' });
    m.props.push({ type: 'sign', x: 30, y: 16, text: 'THE STRIP' }); m.blockRect(30, 16, 1, 1);
    m.act(30, 16, { talk: 'The Strip: The Gilded Palace and the Monte Royale. Dress code strictly enforced.', label: 'Signpost' });
    m.areas = [
      { name: 'Old Town', x: 0, y: 0, w: 26, h: 34 }, { name: 'The Strip', x: 29, y: 0, w: 19, h: 17 },
      { name: 'Riverfront', x: 29, y: 17, w: 27, h: 17 }, { name: 'Lucky Park', x: 0, y: 34, w: 26, h: 8 }, { name: 'Steakhouse Row', x: 29, y: 34, w: 19, h: 8 },
    ];
    // townsfolk
    const lines = [
      'They say the Blazing 7s meter at the Spur hasn\'t hit in weeks. Somebody\'s due.',
      'Mel\'s pie is the only sure thing in this town.',
      'Don\'t borrow from Vinnie. Or do. I\'m not your mother.',
      'The Palace craps table pays triple on the twelve. Triple!',
      'If you\'re gonna sleep in the park, sleep with one eye open.',
      'I bought a rabbit\'s foot. Lost forty bucks in ten minutes. Great rabbit.',
      'The Riverboat comps drinks once you\'ve put some action down.',
      'Kessler\'s Salon has no clocks. People go in Tuesday and come out Friday.',
    ];
    const looks = [['#c0392b', '#2c3e50'], ['#8e44ad', '#34495e'], ['#16a085', '#2d3436'], ['#d35400', '#4b3b2a'], ['#2980b9', '#3d3d3d'], ['#f1c40f', '#5d4037']];
    [[8, 17], [21, 20], [33, 20], [15, 30], [40, 33], [10, 37], [29, 12], [44, 19]].forEach(([x, y], i) =>
      m.npcs.push({ x, y, dir: 'down', wander: true, home: [x, y], look: { shirt: looks[i % 6][0], pants: looks[i % 6][1], skin: ['#f0c19a', '#c68863', '#8d5524', '#e0ac69'][i % 4], hair: ['#3a2a1e', '#111', '#a0522d', '#d9c27a'][i % 4] }, line: lines[i % lines.length], name: TOWNSFOLK[i % TOWNSFOLK.length].name, crowd: () => Crowd.townsfolk(i, lines[i % lines.length]) }));
    m.start = [5, 30];
    return m;
  }

  const INTERIOR = {
    spur: { floor: G.WOOD, wall: '#5a3a22', trim: '#2e1d10', carpet: '#8a5a33', accent: '#e74c3c', bar: 'bar_spur', npc: { who: 'dolores', x: 2, y: 6, bartender: true } },
    riverboat: { floor: G.CARPET, wall: '#3b2414', trim: '#c9a14a', carpet: '#7a1d2a', accent: '#f1c40f', bar: 'bar_riverboat', npc: { who: 'doc', x: 5, y: 13 } },
    palace: { floor: G.CARPET, wall: '#d8c38a', trim: '#8a6a24', carpet: '#5e1430', accent: '#f6d88d', bar: 'bar_palace', npc: { who: 'margot', x: 5, y: 14 } },
    salon: { floor: G.CARPET, wall: '#1d1a14', trim: '#c9a14a', carpet: '#15151c', accent: '#c9a14a', bar: 'bar_salon', npc: { who: 'kessler', x: 23, y: 14 } },
  };
  function buildInterior(venueId) {
    const v = VENUES[venueId], I = INTERIOR[venueId];
    const W = 26, H = 17, m = blank('v:' + venueId, W, H, I.floor);
    m.venue = venueId; m.theme = I;
    m.rect(0, 0, W, 2, G.WALL); m.rect(0, 0, 1, H, G.WALL); m.rect(W - 1, 0, 1, H, G.WALL); m.rect(0, H - 1, W, 1, G.WALL);
    const doorX = 13; m.set(doorX, H - 1, G.CARPET === I.floor ? G.CARPET : G.WOOD);
    m.doors[doorX + ',' + (H - 1)] = { exit: venueId, label: 'Exit to the street' };
    // the bar along the left wall
    m.props.push({ type: 'counter', x: 3, y: 4, h: 6 }); m.blockRect(3, 4, 1, 6);
    for (let y = 4; y < 10; y++) m.act(3, y, { place: I.bar, label: PLACES[I.bar].name });
    m.props.push({ type: 'shelf', x: 1, y: 1, w: 3 });
    // slot machines on the right wall
    for (let y = 3; y < 14; y += 1) { m.props.push({ type: 'slot', x: W - 2, y }); m.blockRect(W - 2, y, 1, 1); m.act(W - 2, y, { slots: venueId, label: `🎰 ${SLOT_MACHINES[venueId].name}` }); }
    // tables, 3 x 3 grid
    const cols = [7, 13, 19], rows = [4, 8, 12];
    let reg = 0; // regulars standing by the tables
    v.games.forEach((g, i) => {
      const x = cols[i % 3], y = rows[Math.floor(i / 3)];
      m.tables.push({ game: g, x, y, w: 4, h: 2 });
      m.blockRect(x, y, 4, 2);
      for (let j = 0; j < 2; j++) for (let k = 0; k < 4; k++) m.act(x + k, y + j, { table: g, label: GAMES[g].name });
      m.npcs.push({ x: x + 1 + (i % 2), y: y - 1, dir: 'down', dealer: true, look: { shirt: '#f4f4f4', pants: '#111', vest: venueId === 'spur' ? '#7a2131' : '#111', skin: ['#f0c19a', '#c68863', '#8d5524'][i % 3], hair: ['#111', '#3a2a1e', '#a0522d'][i % 3], bow: true }, line: null, table: g });
      const ri = hash(i, 7, venueId.length) < 0.45 ? reg++ : -1;
      if (ri >= 0) m.npcs.push({ x: x + (hash(i, 9) < 0.5 ? 0 : 3), y: y + 2, dir: 'up', look: { shirt: ['#2980b9', '#8e44ad', '#c0392b', '#16a085'][i % 4], pants: '#2d3436', skin: '#e0ac69', hair: '#3a2a1e' }, line: RNG.pick(['Shh. I\'m counting.', 'Dealer\'s been hot all night.', 'One more hand. Then dinner. Probably.', 'You want my seat? Tough.']), name: (REGULARS[venueId] || REGULARS.spur)[ri % 4].name, crowd() { return Crowd.regular(venueId, ri, this.line); } });
    });
    // whoever keeps the bar stands behind it (Dolores does at the Spur; she's a story character)
    const bk = STAFF_AT[I.bar];
    if (bk && STAFF[bk]) { const s2 = STAFF[bk]; m.npcs.push({ x: 2, y: 6, dir: 'right', name: s2.name, look: { shirt: '#f4f4f4', vest: s2.color, pants: '#1d1d1d', bow: true, skin: ['#f0c19a', '#c68863', '#8d5524', '#e0ac69'][bk.length % 4], hair: ['#3a2a1e', '#111', '#a0522d', '#ccc'][bk.length % 4] }, crowd: () => Crowd.staff(bk) }); }
    // a rug under every table, a plant by the door, and at the Spur a jukebox in the corner
    m.tables.forEach(tb => m.props.unshift({ type: 'furn', kind: 'rug', x: tb.x - 1, y: tb.y - 1, w: tb.w + 2, h: tb.h + 2 }));
    for (const [px2, py2] of [[1, H - 2]]) { m.props.push({ type: 'furn', kind: 'plant', x: px2, y: py2, w: 1, h: 1 }); m.blockRect(px2, py2, 1, 1); }
    if (venueId === 'spur') {
      m.props.push({ type: 'furn', kind: 'jukebox', x: 1, y: 12, w: 1, h: 1 }); m.blockRect(1, 12, 1, 1); m.act(1, 12, { fn: 'spurJukebox', label: '🎵 Jukebox' });
      m.props.unshift({ type: 'furn', kind: 'rug', x: 18, y: 7, w: 6, h: 4 }); m.props.push({ type: 'furn', kind: 'pooltable', x: 19, y: 8, w: 4, h: 2 }); m.blockRect(19, 8, 4, 2);
      for (let j = 0; j < 2; j++) for (let k = 0; k < 4; k++) m.act(19 + k, 8 + j, { fn: 'spurPool', label: '🎱 Pool: hustle the regulars' });
      m.props.push({ type: 'furn', kind: 'board', x: 5, y: 1, w: 1, h: 1 }); m.act(5, 1, { fn: 'spurWork', label: '📋 Staff wanted: work a shift' });
    }
    m.decor = venueId;
    const n = I.npc, ch = CHARACTERS[n.who];
    m.npcs.push({ x: n.x, y: n.y, dir: n.bartender ? 'right' : 'down', look: { shirt: ch.color, pants: '#222', skin: n.who === 'kessler' ? '#e8c4a0' : '#f0c19a', hair: { dolores: '#a0522d', doc: '#ddd', margot: '#111', kessler: '#999' }[n.who], hat: n.who === 'kessler' }, who: n.who, name: ch.name, story: true });
    m.labels.push({ x: W / 2, y: 0.9, text: v.name.toUpperCase(), neon: true });
    m.start = [doorX, H - 2];
    return m;
  }

  /* ======================= the other buildings: walk-in rooms ======================= */
  // every shop, restaurant and hotel has an inside: staff behind the counter, people to talk to,
  // and things to look at or use. f: furniture [kind, x, y, w, h, act]
  const ROOMS = {
    diner: { name: "Mel's Diner", W: 16, H: 11, floor: 'tile', theme: { wall: '#c94f4f', trim: '#7a1d1d', tileA: '#f3efe6', tileB: '#2b2b2b' }, staff: ['mel', 5, 3],
      f: [['hcounter', 2, 4, 9, 1, { place: 'diner', label: 'Counter: order food (Mel)' }], ['shelf', 2, 2, 9, 1], ['case', 11, 4, 2, 1, { talk: 'The pie case. Cherry, apple, pecan. The cherry is Doc\'s favourite: Mel says he used to send Sal to fetch it.', label: 'Pie case' }],
        ['jukebox', 14, 2, 1, 1, { fn: 'jukebox', label: 'Jukebox' }], ['photo', 7, 1, 2, 1, { talk: 'A faded photo by the register: Sal and Mel in 1984, Sal holding a golden dart. "Golden Arrow champ," it says in marker. "Paid his tab in full that week."', label: 'Old photo' }],
        ['booth', 2, 7, 2, 2], ['booth', 6, 7, 2, 2], ['booth', 11, 7, 2, 2], ['plant', 14, 8, 1, 1], ['window', 1, 1, 2, 1], ['clock', 4, 1, 1, 1], ['neon', 10, 1, 2, 1, null, { text: 'EAT', col: '#ff4d6d' }], ['window', 12, 1, 2, 1], ['stool', 3, 5, 1, 1], ['stool', 5, 5, 1, 1, null, { col: '#c62828' }], ['stool', 9, 5, 1, 1]],
      folk: [[4, 8, 0], [13, 6, 1]] },
    store: { name: 'Quik-Stop', W: 14, H: 10, floor: 'tile', theme: { wall: '#2e86c1', trim: '#154360', tileA: '#e8eef2', tileB: '#c9d6df' }, staff: ['raj', 3, 3],
      f: [['hcounter', 1, 4, 5, 1, { place: 'store', label: 'Register: snacks and drinks (Raj)' }], ['fridge', 8, 2, 5, 1, { place: 'store', label: 'Drinks cooler' }], ['rack', 1, 7, 2, 1, { fn: 'paper', label: 'Newspaper rack: today\'s paper' }],
        ['machine', 11, 6, 1, 1, { fn: 'scratch', label: 'Scratch-card machine ($5)' }], ['shelf', 5, 7, 5, 1, { talk: 'Aisle 3: chips, jerky, aspirin, playing cards. Somebody has stacked the decks of cards in perfect suit order. Raj swears it wasn\'t him.', label: 'Shelves' }], ['poster', 2, 1, 2, 1, null, { text: 'LOTTO', col: '#ffe066' }], ['clock', 5, 1, 1, 1], ['poster', 11, 1, 2, 1, null, { text: '2 FOR $3', col: '#b3e5fc' }]],
      folk: [[10, 8, 2]] },
    motel: { name: 'Starlite Motel', W: 14, H: 10, floor: 'carpet', theme: { wall: '#6c3483', trim: '#2e1338', carpet: '#5b4a3a' }, staff: ['darlene', 3, 3],
      f: [['hcounter', 1, 4, 5, 1, { sleep: ['motel'], label: 'Front desk: a room for the night (Darlene)' }], ['door', 8, 1, 1, 1, { fn: 'room7', label: 'Room 7' }],
        ['door', 10, 1, 1, 1, { talk: 'Room 8. A Do Not Disturb sign and a lot of snoring.', label: 'Room 8' }], ['door', 6, 1, 1, 1, { fn: 'laptop', label: 'Room 12: your room' }], ['machine', 12, 3, 1, 1, { fn: 'ice', label: 'Ice machine' }], ['machine', 12, 6, 1, 1, { place: 'vending', label: 'Vending machine' }],
        ['plant', 1, 7, 1, 1], ['tv', 6, 7, 2, 1, { talk: 'The lobby TV is showing the late news: "Gaming Commission denies probe into Monte Royale." Darlene snorts.', label: 'Lobby TV' }], ['keys', 1, 1, 2, 1], ['clock', 4, 1, 1, 1], ['frame', 12, 1, 1, 1], ['sofa', 9, 7, 2, 1, null, { col: '#7a4a6a' }], ['lamp', 11, 7, 1, 1]],
      folk: [] },
    pawn: { name: "Vinnie's Pawn & Loan", W: 14, H: 10, floor: 'wood', theme: { wall: '#3d3d3d', trim: '#1d1d1d' }, staff: null,
      f: [['hcounter', 3, 4, 8, 1, { screen: 'loans', label: 'Loan counter: borrow or repay' }], ['case', 1, 6, 3, 1, { fn: 'watchcase', label: 'Display case' }],
        ['case', 10, 6, 3, 1, { talk: 'Guitars, a taxidermied armadillo, a slot-machine handle. Everything in town ends up here eventually, kid.', label: 'Display case' }], ['safe', 12, 2, 1, 1, { fn: 'vinnieErrand', label: 'Vinnie, leaning on the safe: ask for an errand' }],
        ['door', 2, 1, 1, 1, { fn: 'office', label: 'Vinnie\'s back office (KNOCK. THEN LEAVE.)' }], ['neon', 5, 1, 3, 1, null, { text: 'LOANS', col: '#ffd54f' }], ['guitar', 9, 1, 2, 1], ['clock', 4, 1, 1, 1], ['frame', 11, 1, 1, 1]],
      folk: [] },
    shop: { name: 'Lucky Strike Outfitters', W: 16, H: 11, floor: 'carpet', theme: { wall: '#b03a2e', trim: '#5a1a14', carpet: '#3b2a40' }, staff: ['rosa', 7, 3],
      f: [['hcounter', 5, 4, 6, 1, { screen: 'shop', label: 'Counter: shop with Rosa' }], ['rack', 1, 3, 3, 1, { screen: 'shop', label: 'Suits and hats' }], ['mirror', 13, 2, 1, 1, { fn: 'mirror', label: 'Full-length mirror' }],
        ['car', 1, 7, 4, 2, { talk: 'A cherry-red convertible on a rotating stand. A tag on the mirror says SOLD... SOON?', label: 'Showroom car' }], ['case', 11, 7, 3, 1, { screen: 'shop', label: 'Watches, rings and gear' }], ['plant', 14, 8, 1, 1], ['poster', 9, 1, 2, 1, null, { text: 'NEW IN', col: '#f8bbd0' }], ['frame', 3, 1, 2, 1], ['sconce', 12, 1, 1, 1], ['sconce', 1, 1, 1, 1]],
      folk: [] },
    grand: { name: 'Grand Hotel', W: 18, H: 12, floor: 'carpet', theme: { wall: '#d8c38a', trim: '#8a6a24', carpet: '#7a1d2a' }, staff: ['pemberton', 4, 3],
      f: [['hcounter', 2, 4, 6, 1, { sleep: ['grand', 'penthouse'], label: 'Reception: rooms and suites (Mr. Pemberton)' }], ['piano', 12, 3, 3, 2, { fn: 'piano', label: 'Grand piano' }], ['elevator', 16, 2, 1, 1, { sleep: ['penthouse'], label: 'Elevator to the penthouse' }],
        ['fountain2', 8, 7, 2, 2, { talk: 'A marble fountain full of coins. Somebody has thrown in a casino chip from the Salon. Bold.', label: 'Lobby fountain' }], ['plant', 1, 8, 1, 1], ['plant', 16, 8, 1, 1], ['rug', 5, 6, 8, 4], ['frame', 7, 1, 2, 1], ['clock', 5, 1, 1, 1], ['sconce', 3, 1, 1, 1], ['sconce', 10, 1, 1, 1], ['sconce', 14, 1, 1, 1], ['sofa', 3, 9, 2, 1, null, { col: '#6a2a2a' }], ['sofa', 12, 10, 2, 1, null, { col: '#6a2a2a' }]],
      folk: [[13, 8, 3]] },
    apts: { name: 'Downtown Apartments', W: 12, H: 10, floor: 'wood', theme: { wall: '#7f8c8d', trim: '#34495e' }, staff: null,
      f: [['mailbox', 1, 3, 2, 1, { fn: 'mail', label: 'Mailboxes' }], ['door', 5, 1, 1, 1, { sleep: ['apartment'], label: 'Your apartment' }], ['door', 8, 1, 1, 1, { talk: 'Apartment 2B. Someone inside is practising the trumpet. Badly.', label: 'Apartment 2B' }],
        ['elevator', 10, 2, 1, 1, { sleep: ['penthouse'], label: 'Elevator' }], ['plant', 1, 7, 1, 1], ['board', 2, 1, 2, 1], ['frame', 7, 1, 1, 1], ['rug', 3, 4, 5, 3], ['bench', 7, 6, 2, 1]],
      folk: [] },
    steak: { name: 'Prime Cut Steakhouse', W: 16, H: 11, floor: 'carpet', theme: { wall: '#3e2723', trim: '#c9a14a', carpet: '#4a1c1c' }, staff: ['philippe', 3, 7],
      f: [['desk', 2, 8, 3, 1, { place: 'steak', label: 'Maître d\': a table for one (Philippe)' }], ['table', 6, 3, 2, 2], ['table', 10, 3, 2, 2], ['table', 10, 7, 2, 2], ['tank', 13, 2, 2, 1, { talk: 'A lobster tank. One of them is wearing a tiny rubber band and an expression of deep resignation.', label: 'Lobster tank' }],
        ['door', 2, 1, 1, 1, { fn: 'cellar', label: 'The wine cellar' }], ['plant', 14, 8, 1, 1], ['wine', 5, 1, 3, 1], ['frame', 9, 1, 2, 1], ['sconce', 12, 1, 1, 1], ['sconce', 4, 1, 1, 1]],
      folk: [[8, 3, 4], [12, 7, 5]] },
    // behind KNOCK. THEN LEAVE. in the pawn shop, once Vinnie gives you the key (office.js)
    office: { name: "Vinnie's Back Office", W: 12, H: 9, floor: 'carpet', theme: { wall: '#3a2a1e', trim: '#1a120c', carpet: '#3a1414' }, staff: null,
      f: [['rug', 3, 3, 6, 4], ['frame', 4, 1, 2, 1, { talk: 'A racehorse called Seventeen Hands. It came last at Saratoga in 1979 with a thousand of Vinnie\'s dollars on its nose. He keeps the painting so he never forgets.', label: 'The racehorse' }],
        ['photo', 8, 1, 2, 1, { talk: 'A photo, curled at the corners: Vinnie and Sal, young, outside the Spur, arms round each other\'s shoulders. Somebody has drawn a tiny 17 on Sal\'s jacket in biro.', label: 'A photo on the wall' }], ['clock', 2, 1, 1, 1],
        ['desk', 4, 3, 3, 1, { fn: 'officeLedger', label: 'Vinnie\'s desk and the ledger' }], ['deskphone', 7, 3, 1, 1, { fn: 'officePhone', label: 'The phone: the big errands' }],
        ['safe', 10, 2, 1, 1, { talk: 'The safe. Vinnie leans on its little brother in the shop. Nobody knows this combination but Vinnie, and Nico can\'t count that high.', label: 'The big safe' }],
        ['shelf', 1, 2, 2, 1], ['sofa', 1, 6, 2, 1, null, { col: '#5a2a1a' }], ['lamp', 9, 6, 1, 1], ['plant', 10, 6, 1, 1]],
      folk: [] },
    // under Prime Cut, down the stairs behind Philippe's desk (office.js)
    cellar: { name: 'The Wine Cellar', W: 12, H: 9, floor: 'tile', theme: { wall: '#3a2c20', trim: '#1a120c', tileA: '#4a3a2a', tileB: '#3a2c20' }, staff: null,
      f: [['wine', 1, 1, 4, 1], ['wine', 7, 1, 4, 1], ['sconce', 6, 1, 1, 1], ['barrel', 1, 3, 1, 1], ['barrel', 1, 4, 1, 1], ['barrel', 10, 3, 1, 1], ['barrel', 10, 4, 1, 1],
        ['table', 5, 3, 2, 2, { fn: 'cellarGlass', label: 'The tasting table: a glass of the good stuff ($40)' }], ['desk', 8, 6, 2, 1, { fn: 'cellarBins', label: 'The bin book: every bottle by its bin number' }],
        ['crates', 2, 6, 2, 1, { fn: 'cellarDelivery', label: 'Philippe\'s deliveries (an errand)' }]],
      folk: [] },
    // behind the longhorns at the Spur, down a flight of stairs: Sal's secret, after the story (salquest.js)
    club: { name: 'The Seventeen Club', W: 16, H: 11, floor: 'carpet', theme: { wall: '#1e3a2f', trim: '#c9a14a', carpet: '#3a1414' }, staff: null,
      f: [['rug', 5, 3, 6, 4], ['shelf', 1, 2, 4, 1], ['bar2', 1, 3, 4, 1, { fn: 'clubBar', label: 'The bar (mahogany, and Sal\'s rye)' }], ['photowall', 6, 1, 3, 1, { fn: 'salPhotos', label: 'A wall of old photographs' }],
        ['faro', 6, 4, 4, 2, { fn: 'faro', label: '🂡 Faro: Sal\'s bank' }], ['pianola', 12, 2, 3, 1, { fn: 'pianola', label: '🎹 The player piano' }], ['safe', 14, 5, 1, 1, { fn: 'salSafe', label: 'Sal\'s old safe' }],
        ['table', 2, 6, 2, 2], ['table', 11, 7, 2, 2], ['plant', 1, 9, 1, 1], ['plant', 14, 9, 1, 1]],
      folk: [] },
  };
  function buildRoom(key) {
    const R = ROOMS[key], W = R.W, H = R.H;
    const floor = R.floor === 'tile' ? G.TILE : R.floor === 'carpet' ? G.CARPET : G.WOOD;
    const m = blank('r:' + key, W, H, floor);
    m.room = key; m.theme = { carpet: '#5b4a3a', ...R.theme };
    m.rect(0, 0, W, 2, G.WALL); m.rect(0, 0, 1, H, G.WALL); m.rect(W - 1, 0, 1, H, G.WALL); m.rect(0, H - 1, W, 1, G.WALL);
    const doorX = Math.floor(W / 2); m.set(doorX, H - 1, floor);
    m.doors[doorX + ',' + (H - 1)] = { exit: key, label: 'Back to the street' };
    for (const [kind, x, y, w, hh, act, o] of R.f) {
      m.props.push({ type: 'furn', kind, x, y, w, h: hh, ...(o || {}) });
      if (!['rug', 'photo', 'photowall', ...WALL_ART].includes(kind)) m.blockRect(x, y, w, hh);
      if (act) for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) m.act(x + i, y + j, act);
    }
    if (R.staff && STAFF[R.staff[0]]) {
      const s = STAFF[R.staff[0]], k = R.staff[0];
      m.npcs.push({ x: R.staff[1], y: R.staff[2], dir: 'down', name: s.name, look: { shirt: s.color, pants: '#2d2d2d', skin: ['#f0c19a', '#c68863', '#8d5524', '#e0ac69'][k.length % 4], hair: ['#3a2a1e', '#111', '#a0522d', '#ccc'][k.length % 4] }, crowd: () => Crowd.staff(k) });
    }
    for (const [x, y, i] of R.folk) m.npcs.push({ x, y, dir: 'down', name: TOWNSFOLK[i % TOWNSFOLK.length].name, look: { shirt: ['#2980b9', '#8e44ad', '#16a085', '#d35400', '#c0392b', '#7f8c8d'][i % 6], pants: '#2d3436', skin: ['#f0c19a', '#c68863', '#8d5524', '#e0ac69'][i % 4], hair: ['#3a2a1e', '#111', '#a0522d', '#ddd'][i % 4] }, line: 'Nice to see a friendly face.', crowd: () => Crowd.townsfolk(i, 'Nice to see a friendly face in here.') });
    m.labels.push({ x: W / 2, y: 0.9, text: R.name.toUpperCase(), neon: false });
    m.start = [doorX, H - 2];
    return m;
  }
  // things that hang on the wall, not stand on the floor
  const WALL_ART = ['window', 'clock', 'frame', 'poster', 'neon', 'sconce', 'board', 'keys', 'guitar', 'wine'];
  // furniture, drawn in the same chunky pixel style as the rest of the town
  function paintFurn(c, p) {
    const px = p.x * T, py = p.y * T, w = p.w * T, hh = p.h * T, R = (x, y, ww, h2, col) => { c.fillStyle = col; c.fillRect(px + x, py + y, ww, h2); };
    switch (p.kind) {
      case 'hcounter': R(0, 2, w, hh - 2, '#5a3418'); R(0, 0, w, 5, '#8a5a33'); R(0, 4, w, 1, '#c9a14a'); for (let i = 0; i < p.w; i += 2) R(i * T + 5, 7, 6, 6, '#3a2010'); break;
      case 'desk': R(0, 2, w, hh - 2, '#3e2723'); R(0, 0, w, 4, '#c9a14a'); R(w / 2 - 3, 6, 6, 4, '#f5f5f5'); break;
      case 'case': R(0, 4, w, hh - 4, '#4a3020'); R(1, 1, w - 2, 9, 'rgba(180, 220, 255, .55)'); R(1, 1, w - 2, 1, '#fff'); for (let i = 0; i < p.w * 2; i++) R(4 + i * 7, 5, 4, 3, ['#f1c40f', '#e74c3c', '#ecf0f1', '#27ae60'][i % 4]); break;
      case 'jukebox': R(1, 0, 14, 16, '#7a1d2a'); R(3, 2, 10, 6, '#ffe066'); R(4, 3, 8, 4, '#ff7043'); for (let i = 0; i < 3; i++) R(3 + i * 4, 10, 2, 4, ['#4fc3f7', '#ab47bc', '#66bb6a'][i]); break;
      case 'photo': R(4, 3, w - 8, 9, '#8a6a24'); R(6, 5, w - 12, 5, '#d7ccc8'); R(9, 6, 3, 3, '#5d4037'); R(w - 13, 6, 3, 3, '#5d4037'); break;
      case 'booth': R(0, 0, w, 5, '#b71c1c'); R(0, hh - 5, w, 5, '#b71c1c'); R(4, 6, w - 8, hh - 12, '#eceff1'); R(w / 2 - 2, hh / 2 - 2, 4, 4, '#ff7043'); break;
      case 'plant': R(5, 10, 6, 6, '#8d6e63'); c.fillStyle = '#2e7d32'; c.beginPath(); c.arc(px + 8, py + 7, 6, 0, 7); c.fill(); c.fillStyle = '#43a047'; c.beginPath(); c.arc(px + 6, py + 5, 3, 0, 7); c.fill(); break;
      case 'shelf': R(0, 10, w, 4, '#5d4037'); for (let i = 0; i < p.w * 4; i++) R(2 + i * 4, 3 + (i % 2), 2, 7, ['#27ae60', '#c0392b', '#f1c40f', '#8e44ad', '#ecf0f1'][i % 5]); break;
      case 'fridge': R(0, 0, w, hh, '#cfd8dc'); for (let i = 0; i < p.w; i++) { R(i * T + 1, 1, T - 2, hh - 2, 'rgba(130, 200, 255, .6)'); for (let k = 0; k < 3; k++) R(i * T + 3 + k * 4, 6, 2, 6, ['#e53935', '#43a047', '#fdd835'][k]); } break;
      case 'rack': R(0, 6, w, 8, '#6d4c41'); for (let i = 0; i < p.w * 3; i++) R(2 + i * 5, 1, 4, 8, ['#eceff1', '#ffe082', '#b3e5fc'][i % 3]); break;
      case 'machine': R(2, 0, 12, 16, '#455a64'); R(4, 2, 8, 6, '#80deea'); R(4, 10, 8, 2, '#ffd54f'); R(6, 13, 4, 2, '#212121'); break;
      case 'door': R(3, 1, 10, 15, '#5d4037'); R(4, 2, 8, 13, '#795548'); R(10, 8, 2, 2, '#ffd54f'); break;
      case 'tv': R(0, 2, w, 10, '#212121'); R(2, 4, w - 4, 6, '#4fc3f7'); R(w / 2 - 2, 12, 4, 3, '#424242'); break;
      case 'safe': R(1, 1, 14, 15, '#37474f'); R(3, 3, 10, 11, '#546e7a'); c.fillStyle = '#ffd54f'; c.beginPath(); c.arc(px + 8, py + 8, 3, 0, 7); c.fill(); break;
      case 'mirror': R(3, 0, 10, 16, '#c9a14a'); R(4, 1, 8, 14, '#b3e5fc'); R(5, 2, 2, 8, 'rgba(255,255,255,.7)'); break;
      case 'car': c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px + 2, py + hh - 6, w - 4, 5); R(2, 8, w - 4, 14, '#c62828'); R(10, 2, w - 20, 9, '#e53935'); R(12, 4, w - 24, 5, '#b3e5fc'); R(6, 20, 8, 8, '#212121'); R(w - 14, 20, 8, 8, '#212121'); break;
      case 'piano': R(0, 4, w, hh - 6, '#111'); R(2, 0, w - 4, 6, '#222'); for (let i = 0; i < 12; i++) R(4 + i * 3.4, hh - 10, 2, 5, i % 3 === 1 ? '#111' : '#fafafa'); break;
      case 'elevator': R(1, 0, 14, 16, '#9e9e9e'); R(3, 2, 4, 14, '#cfd8dc'); R(9, 2, 4, 14, '#cfd8dc'); R(6, 0, 4, 2, '#ffd54f'); break;
      case 'fountain2': c.fillStyle = '#eceff1'; c.beginPath(); c.arc(px + w / 2, py + hh / 2, w / 2, 0, 7); c.fill(); c.fillStyle = '#4fc3f7'; c.beginPath(); c.arc(px + w / 2, py + hh / 2, w / 2 - 4, 0, 7); c.fill(); R(w / 2 - 2, 4, 4, hh / 2, '#cfd8dc'); break;
      case 'phone': R(2, -6, 12, 22, '#c62828'); R(4, -3, 8, 9, '#b3e5fc'); R(4, 8, 8, 6, '#b3e5fc'); R(5, -5, 6, 1, '#ffeb3b'); break;
      case 'window': { R(0, 1, w, 14, '#d8d0c0'); const g = c.createLinearGradient(0, py + 2, 0, py + 13); g.addColorStop(0, '#16233a'); g.addColorStop(1, '#34466a'); c.fillStyle = g; c.fillRect(px + 2, py + 2, w - 4, 11); for (let i = 0; i < p.w * 3; i++) R(4 + i * 5, 8 + (i % 3), 2, 2, i % 2 ? '#ffd27a' : '#9ec5ff'); R(w / 2 - .5, 2, 1, 11, '#d8d0c0'); R(2, 7, w - 4, 1, '#d8d0c0'); R(-1, 13, w + 2, 2, '#bfb6a4'); R(2, 2, 3, 3, 'rgba(255,255,255,.15)'); break; }
      case 'clock': c.fillStyle = '#3e2723'; c.beginPath(); c.arc(px + 8, py + 7, 5.5, 0, 7); c.fill(); c.fillStyle = '#f5efe0'; c.beginPath(); c.arc(px + 8, py + 7, 4.5, 0, 7); c.fill(); R(7.5, 3.5, 1, 4, '#222'); R(8, 6.5, 3, 1, '#222'); break;
      case 'frame': { R(1, 1, w - 2, 12, '#c9a14a'); R(2, 2, w - 4, 10, '#2a1a10'); const g = c.createLinearGradient(0, py + 3, 0, py + 11); g.addColorStop(0, '#7aa0c8'); g.addColorStop(.6, '#d8c8a0'); g.addColorStop(1, '#5a7a4a'); c.fillStyle = g; c.fillRect(px + 3, py + 3, w - 6, 8); R(3, 9, w - 6, 2, '#4a6a3a'); c.fillStyle = 'rgba(255,240,200,.6)'; c.beginPath(); c.arc(px + w - 7, py + 5, 1.5, 0, 7); c.fill(); break; }
      case 'poster': R(1, 2, w - 2, 11, p.col || '#f1c40f'); R(2, 3, w - 4, 3, '#c0392b'); c.fillStyle = '#222'; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(p.text || 'SALE', px + w / 2, py + 11); break;
      case 'neon': c.save(); c.font = 'bold 9px Georgia'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.shadowColor = p.col || '#ff4d6d'; c.shadowBlur = 6; c.fillStyle = p.col || '#ff4d6d'; c.fillText(p.text || 'OPEN', px + w / 2, py + 11); c.fillText(p.text || 'OPEN', px + w / 2, py + 11); c.restore(); break;
      case 'sconce': { const g = c.createRadialGradient(px + 8, py + 5, 1, px + 8, py + 5, 11); g.addColorStop(0, 'rgba(255,220,150,.7)'); g.addColorStop(1, 'rgba(255,220,150,0)'); c.fillStyle = g; c.fillRect(px - 4, py - 4, 24, 22); R(6, 6, 4, 5, '#c9a14a'); R(7, 3, 2, 3, '#fff3c4'); break; }
      case 'board': R(0, 2, w, 11, '#8d6e63'); R(1, 3, w - 2, 9, '#c8a27a'); for (let i = 0; i < p.w * 3; i++) { R(2 + i * 5, 4 + (i % 2) * 3, 4, 4, ['#fff9c4', '#ffffff', '#b3e5fc', '#ffcdd2'][i % 4]); R(3 + i * 5, 4 + (i % 2) * 3, 1, 1, '#c0392b'); } break;
      case 'keys': R(0, 2, w, 11, '#5d4037'); R(1, 3, w - 2, 9, '#6d4c41'); for (let i = 0; i < p.w * 4; i++) for (const ky of [4, 8]) { R(2 + i * 4, ky, 1, 1, '#bdbdbd'); if ((i + ky) % 3) R(1.5 + i * 4, ky + 1, 2, 2, '#ffd54f'); } break;
      case 'guitar': for (let i = 0; i < p.w; i++) { const gx = px + i * T + 8; R(i * T + 7.5, 0, 1, 6, '#3e2723'); c.fillStyle = ['#c0392b', '#d4a35a'][i % 2]; c.beginPath(); c.ellipse(gx, py + 11, 4, 4, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(gx, py + 7, 3, 3, 0, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(gx, py + 9, 1.2, 0, 7); c.fill(); } break;
      case 'wine': R(0, 1, w, 14, '#3e2723'); for (let i = 0; i < p.w * 3; i++) for (let j = 0; j < 3; j++) { R(1 + i * 5, 2 + j * 4, 4, 3, '#1a0f0a'); R(2 + i * 5, 3 + j * 4, 2, 2, ['#5a1020', '#2a4a20', '#6a1a2a'][(i + j) % 3]); } break;
      case 'sofa': c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px + 1, py + 12, w, 4); R(0, 1, w, 7, p.col || '#6d4c41'); R(0, 7, w, 7, p.col || '#795548'); R(0, 7, w, 1, 'rgba(0,0,0,.25)'); R(0, 3, 3, 11, 'rgba(0,0,0,.25)'); R(w - 3, 3, 3, 11, 'rgba(0,0,0,.25)'); for (let i = 0; i < p.w; i++) R(i * T + 3, 8, T - 5, 3, 'rgba(255,255,255,.1)'); break;
      case 'stool': c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(px + 9, py + 13, 4, 2, 0, 0, 7); c.fill(); R(7, 7, 2, 7, '#9e9e9e'); R(5, 13, 6, 1, '#757575'); c.fillStyle = p.col || '#c62828'; c.beginPath(); c.ellipse(px + 8, py + 6, 5, 3, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(px + 5, py + 4, 4, 1); break;
      case 'lamp': { const g = c.createRadialGradient(px + 8, py + 3, 1, px + 8, py + 3, 16); g.addColorStop(0, 'rgba(255,214,140,.45)'); g.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = g; c.fillRect(px - 10, py - 12, 36, 34); R(7, 5, 2, 9, '#5d4037'); R(4, 13, 8, 2, '#3e2723'); R(4, 0, 8, 6, '#f3e0b5'); R(4, 5, 8, 1, '#c9a14a'); break; }
      case 'bench': c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px + 2, py + 11, w - 2, 3); R(0, 3, w, 3, '#8d6e63'); R(0, 7, w, 4, '#a1887f'); R(0, 7, w, 1, 'rgba(255,255,255,.15)'); R(2, 11, 2, 4, '#4e342e'); R(w - 4, 11, 2, 4, '#4e342e'); break;
      case 'barrel': c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(px + 9, py + 14, 7, 2, 0, 0, 7); c.fill(); c.fillStyle = '#6a3a1a'; c.beginPath(); c.ellipse(px + 8, py + 8, 7, 7, 0, 0, 7); c.fill(); c.fillStyle = '#8a5028'; c.beginPath(); c.ellipse(px + 8, py + 8, 5, 5, 0, 0, 7); c.fill(); c.strokeStyle = '#2a1a0a'; c.lineWidth = 1; c.beginPath(); c.arc(px + 8, py + 8, 6.5, 0, 7); c.stroke(); R(7, 7, 2, 2, '#c9a14a'); break;
      case 'crates': for (let i = 0; i < p.w; i++) { R(i * T + 1, 3, 14, 12, '#a07040'); R(i * T + 1, 3, 14, 2, '#c09060'); R(i * T + 1, 8, 14, 1, '#6a4020'); R(i * T + 6, 4, 4, 2, '#3a2010'); } break;
      case 'deskphone': R(1, 6, 14, 9, '#4a2a14'); R(1, 6, 14, 2, '#6a3e20'); R(4, 2, 8, 5, '#111'); R(3, 2, 10, 2, '#222'); R(6, 4, 4, 2, '#d8d0b8'); break;
      case 'pooltable': { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(px + 3, py + 4, w, hh); R(0, 0, w, hh, '#5a2e12'); R(3, 3, w - 6, hh - 6, '#1f7a44'); R(3, 3, w - 6, 1, 'rgba(255,255,255,.12)');
        for (const [qx, qy] of [[3, 3], [w / 2, 2], [w - 3, 3], [3, hh - 3], [w / 2, hh - 2], [w - 3, hh - 3]]) { c.fillStyle = '#050505'; c.beginPath(); c.arc(px + qx, py + qy, 2.2, 0, 7); c.fill(); }
        const balls = [['#ffffff', 14, 16], ['#e0453a', 40, 12], ['#ffd84a', 44, 15], ['#e0453a', 44, 9], ['#111', 48, 12], ['#ffd84a', 48, 18], ['#e0453a', 52, 14]];
        for (const [col, bx, by] of balls) { c.fillStyle = col; c.beginPath(); c.arc(px + bx, py + by, 2, 0, 7); c.fill(); }
        R(8, 24, 30, 1, '#d8b07a'); break; }
      case 'rug': c.fillStyle = 'rgba(201, 161, 74, .35)'; c.fillRect(px, py, w, hh); c.strokeStyle = 'rgba(201, 161, 74, .8)'; c.lineWidth = 2; c.strokeRect(px + 3, py + 3, w - 6, hh - 6); break;
      case 'table': for (const sx2 of [-4, w - 4]) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(px + sx2 + 1, py + hh / 2 - 1, 9, 9); R(sx2, hh / 2 - 6, 8, 3, '#4e2a1a'); R(sx2, hh / 2 - 3, 8, 7, '#7a3a24'); R(sx2 + 1, hh / 2 - 2, 6, 1, 'rgba(255,255,255,.15)'); } // a chair either side
        c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(px + w / 2 + 2, py + hh / 2 + 3, w / 2 - 2, hh / 2 - 4, 0, 0, 7); c.fill(); c.fillStyle = '#f5f5f5'; c.beginPath(); c.ellipse(px + w / 2, py + hh / 2, w / 2 - 2, hh / 2 - 4, 0, 0, 7); c.fill(); R(w / 2 - 1, hh / 2 - 6, 2, 6, '#ffd54f'); break;
      case 'tank': R(0, 2, w, hh - 2, '#263238'); R(2, 3, w - 4, hh - 6, 'rgba(79, 195, 247, .7)'); R(8, 8, 5, 3, '#e53935'); R(18, 6, 5, 3, '#e53935'); break;
      case 'bar2': R(0, 2, w, hh - 2, '#4a1f10'); R(0, 0, w, 5, '#7a3a1c'); R(0, 4, w, 1, '#c9a14a'); R(0, hh - 2, w, 2, '#c9a14a'); for (let i = 0; i < p.w; i++) R(i * T + 6, 7, 4, 6, '#2a0f06'); break;
      case 'faro': c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(px + 3, py + 4, w - 2, hh - 2); R(0, 0, w, hh - 2, '#4a2a14'); R(2, 2, w - 4, hh - 6, '#1d5a3a'); for (let i = 0; i < 13; i++) { const cx = 5 + (i % 7) * 7, cy = i < 7 ? 5 : 16; R(cx, cy, 5, 8, '#f5f0e0'); R(cx + 2, cy + 3, 1, 2, '#111'); } R(w - 10, 5, 6, 18, '#c9a14a'); R(w - 9, 6, 4, 16, '#8a1d1d'); break;
      case 'pianola': R(0, -8, w, hh + 8, '#3a1d0e'); R(2, -6, w - 4, 8, '#5a3018'); R(8, -5, w - 16, 6, '#f2e6c8'); for (let i = 0; i < 9; i++) R(10 + i * 3, -4, 1, 4, '#8a6a24'); R(0, hh - 7, w, 4, '#fafafa'); for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) R(2 + i * 3.3, hh - 7, 2, 2, '#111'); break;
      case 'photowall': for (let i = 0; i < 6; i++) { const fx = 3 + (i % 3) * 15 + (i > 2 ? 4 : 0), fy = i > 2 ? 9 : 1, fw = i % 2 ? 9 : 11; R(fx, fy, fw, 7, '#c9a14a'); R(fx + 1, fy + 1, fw - 2, 5, ['#d7ccc8', '#bcaaa4', '#a1887f', '#efebe9', '#cdb79e', '#d7ccc8'][i]); R(fx + 3, fy + 2, 2, 3, '#5d4037'); } break;
      case 'mailbox': for (let i = 0; i < p.w * 3; i++) R(1 + i * 5, 2, 4, 5, '#b0bec5'), R(1 + i * 5, 8, 4, 5, '#b0bec5'); break;
      default: R(0, 0, w, hh, '#666');
    }
  }
  // the things you can do with furniture that isn't just a menu
  async function roomFx(fn) {
    const st = App.state;
    if (fn === 'paper') return Chat.newspaper();
    if (fn === 'laptop') {
      if (Mystery.has('oscar') && Postcards.st().got === 0) return Postcards.morning();
      if (Postcards.tapeReady() && !Postcards.st().heard) {
        const go = await UI.modal({ title: '💻 Room 12', body: h('p', 'Your laptop is open. On the desktop, a new file from Sparky: SAL_TAPE.wav. Your cursor hovers over it for a long time.'), buttons: [{ label: 'Not yet', value: false, cls: 'ghost' }, { label: '▶ Play it', value: true, cls: 'primary' }] });
        if (go) return Postcards.playTape();
        return;
      }
      const name = Me.first(), proj = Me.known();
      const lines = proj.length ? [
        { who: 'narrator', text: `Room 12. Your room, for as long as the $25 a night holds out. The bed is made, badly. Your laptop is open on the desk.` },
        { who: 'narrator', text: 'Three tabs: an **Auto-Dice simulator** still running its millionth Martingale (still broke), a **Betfair bot** in paper mode politely declining every race, and the **Value & Reload Finder** with a lay calculated to the penny.' },
        { who: 'narrator', text: `A fourth tab is a chat window. The last message reads: "${RNG.pick(['Make the slots more exciting', 'Can I go inside every building?', 'Add a double option', 'Always merge without prompting'])}". A sticky note on the screen, in your handwriting: **NO EDGE, NO BET.**` },
        { who: 'me', text: name ? `${name}, you absolute nerd.` : 'Absolute nerd.' },
      ] : [{ who: 'narrator', text: 'Room 12. Your room, for as long as the $25 a night holds out. A lumpy bed, a TV bolted to the dresser, and a Gideon Bible with a racing form tucked inside.' }];
      return UI.dialog(lines);
    }
    if (fn === 'jukebox') return Postcards.jukebox();
    if (fn === 'spurJukebox') { // a dollar a song: it changes what the Spur's band plays
      const songs = [['spur', '🎹 Honky-tonk (the house band)'], ['diner', '🎵 Doo-wop, like Mel\'s'], ['palace', '🎷 Lounge jazz'], ['salon', '🌙 Slow and noir'], ['riverboat', '🪕 Ragtime stride']];
      const v = await UI.modal({ title: '🎵 The Spur\'s jukebox', body: h('p', 'Chrome and bubbling coloured light, and a dollar a song. Dolores pretends she isn\'t watching what you pick.'), buttons: songs.map(([k, l]) => ({ label: l, value: k })).concat([{ label: 'Leave it', value: null, cls: 'ghost' }]) });
      if (!v) return; if (!App.debit(1)) return UI.toast('A song costs $1', 'warn');
      st.flags.spurJuke = v; App.count('spurJukebox'); App.save(); Router.hud(); if (typeof Music !== 'undefined' && Music.refresh) Music.refresh();
      return UI.toast(v === 'spur' ? '🎹 Back to the house band.' : RNG.pick(['🎵 The needle drops. Somebody at the bar starts humming.', '🎵 Dolores turns it up a notch without being asked.', '🎵 Mick taps his darts in time against the bar.']), 'good');
    }
    if (fn === 'piano') return Postcards.piano();
    if (fn === 'room7') return SalQuest.room7();
    if (fn === 'faro') { const why = Career.canPlay(); if (why) return UI.toast(why, 'warn'); return SalQuest.faro(); }
    if (fn === 'pianola') return SalQuest.pianola();
    if (fn === 'salPhotos') return SalQuest.photos();
    if (fn === 'salSafe') return SalQuest.safe();
    if (fn === 'clubBar') return SalQuest.bar();
    if (fn === 'watchcase') return Postcards.watchcase();
    if (fn === 'office') return Office.door();
    if (fn === 'officeLedger') return Office.ledger();
    if (fn === 'officePhone') return Office.phone();
    if (fn === 'vinnieErrand') return Office.vinnieErrand();
    if (fn === 'cellarBins') return Postcards.cellar(true);
    if (fn === 'cellarGlass') return Office.cellarGlass();
    if (fn === 'cellarDelivery') return Office.delivery();
    if (fn === 'spurWork') return Office.spurBoard();
    if (fn === 'spurPool') return Office.pool();
    if (fn === 'cellar') return Office.cellarDoor();
    if (fn === 'ice') {
      if (st.flags.iceDay === st.day) return UI.toast('The ice machine coughs. Come back tomorrow.', 'warn');
      st.flags.iceDay = st.day; st.thirst = Math.min(100, st.thirst + 15); Router.hud(); App.save(); UI.toast('🧊 A cup of ice water. 💧+15', 'good'); return;
    }
    if (fn === 'mirror') { if (typeof Looks !== 'undefined') return Looks.edit(); UI.toast('Looking sharp.'); return; }
    if (fn === 'mail') {
      const me = typeof Me !== 'undefined' ? Me.first() : '';
      const letters = [`A postcard with no stamp, just a big "17" on the front. On the back: "${me ? me + ', k' : 'K'}eep your chin up and your bets small. The house always wins, until it doesn't. — S."`,
        'Junk mail: "YOU MAY ALREADY BE A WINNER!" You may not.', `A bill from Vinnie, with a handwritten note: "Just a reminder, kid. Love, V."`];
      await UI.dialog([{ who: 'narrator', text: '📬 ' + (st.flags.mailDay === st.day ? 'Nothing new today.' : RNG.pick(letters)) }]); st.flags.mailDay = st.day; return;
    }
    if (fn === 'scratch') return scratchCard();
    if (fn === 'atm') return UI.modal({ title: '🏧 ATM', body: h('div', h('p', `Balance: ${fmt(st.bank)}`), App.debt > 0 ? h('p.muted', `Owed to Vinnie: ${fmt(App.debt)}`) : h('p.muted', 'No debts. The machine seems impressed.'), h('p.muted.small', `Net worth with your businesses: ${fmt(Career.empire ? Career.empire() : st.bank)}`)) });
    if (fn === 'phone') { await UI.dialog([{ who: 'narrator', text: RNG.pick(['You lift the receiver. A dial tone, and faint jazz from somewhere down the line.', 'Someone has scratched "17" into the coin slot.', 'A sticker reads: NEED CASH FAST? CALL VINNIE. The number has been crossed out and rewritten in a neater hand.']) }]); return; }
  }
  // Quik-Stop scratch cards: $5, honest odds printed on the back
  async function scratchCard() {
    const price = 5;
    if (!App.debit(price)) return UI.toast('A scratch card costs $5', 'warn');
    App.count('scratchCards');
    const prizes = [[1000, 1 / 5000], [100, 1 / 300], [20, 1 / 30], [10, 1 / 12], [5, 1 / 6]];
    let r = Math.random(), win = 0; for (const [v, p] of prizes) { if ((r -= p) < 0) { win = v; break; } }
    const syms = ['🍒', '💰', '🍀', '⭐', '🔔', '7️⃣'], pick = win ? syms[[1000, 100, 20, 10, 5].indexOf(win) + 1] : null;
    // lay out nine symbols: three of the prize symbol if it won, never three of anything otherwise
    const cells = []; if (pick) cells.push(pick, pick, pick);
    while (cells.length < 9) { const s = RNG.pick(syms); if (cells.filter(x => x === s).length < 2 && s !== pick) cells.push(s); }
    for (let i = cells.length - 1; i > 0; i--) { const j = RNG.int(i + 1); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    if (win) App.credit(win);
    const names = { '💰': '$1,000', '🍀': '$100', '⭐': '$20', '🔔': '$10', '7️⃣': '$5' };
    let left = 9; const grid = h('div.scratch'), status = h('p.small', 'Scratch all nine. Match three to win.');
    const tiles = cells.map(s => { const b = h('button.sc', { onclick: () => { if (b.classList.contains('open')) return; b.classList.add('open'); b.textContent = s; if (--left === 0) status.textContent = win ? `Three ${s === pick ? s : pick}: you win ${fmt(win)}!` : 'No match. Raj shrugs: "A tax on hope."'; } }, '?'); grid.append(b); return b; });
    await UI.modal({ title: '🎟️ Lucky Strike scratch card', body: h('div', grid, status, h('p.muted.small', `Prizes: three 💰 ${names['💰']}, 🍀 ${names['🍀']}, ⭐ ${names['⭐']}, 🔔 ${names['🔔']}, 7️⃣ ${names['7️⃣']}. Returns about 57% of what you spend (printed on the back, in very small type).`)),
      buttons: [{ label: 'Scratch all', value: 'all' }, { label: 'Done', cls: 'primary' }] }).then(v => { if (v === 'all') tiles.forEach(t => t.click()); });
    if (win) UI.toast(`🎟️ Scratch card win: ${fmt(win)}`, 'good');
    Router.hud(); App.save();
  }

  /* ======================= static art ======================= */
  function paintTile(c, m, x, y) {
    const t = m.at(x, y), px = x * T, py = y * T, r = (s) => hash(x, y, s);
    const fill = (col, a = 0, b = 0, w = T, h2 = T) => { c.fillStyle = col; c.fillRect(px + a, py + b, w, h2); };
    const theme = m.theme;
    switch (t) {
      case G.GRASS: case G.FLOWERS: case G.TREE: case G.HEDGE: {
        fill('#4f9a45');
        for (let i = 0; i < 4; i++) fill(r(i) < .5 ? '#5fae52' : '#43873b', Math.floor(r(i + 10) * 15), Math.floor(r(i + 20) * 15), 1, 2);
        if (t === G.FLOWERS) for (let i = 0; i < 3; i++) fill(['#ffe26b', '#ff7aa8', '#ffffff'][i], 2 + Math.floor(r(i + 30) * 12), 2 + Math.floor(r(i + 40) * 12), 2, 2);
        if (t === G.TREE) {
          c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(px + 8, py + 14, 6, 2, 0, 0, 7); c.fill();
          fill('#6b4423', 7, 10, 2, 5);
          c.fillStyle = '#2d6b2a'; c.beginPath(); c.arc(px + 8, py + 7, 7, 0, 7); c.fill();
          c.fillStyle = '#3d8a37'; c.beginPath(); c.arc(px + 6, py + 5, 4, 0, 7); c.fill();
          fill('#5cae4f', 4, 3, 2, 1);
        }
        if (t === G.HEDGE) { fill('#2f6e2c', 0, 3, 16, 12); fill('#3d8a37', 0, 3, 16, 3); for (let i = 0; i < 4; i++) fill('#4d9d46', i * 4 + 1, 5, 2, 2); }
        break;
      }
      case G.ROAD: {
        fill('#3a3b44');
        for (let i = 0; i < 3; i++) fill('#44454f', Math.floor(r(i) * 15), Math.floor(r(i + 5) * 15), 1, 1);
        const zebra = m.cross && m.cross[x + ',' + y], inJ = (m.junction || []).some(([jx, jy, jw, jh]) => x >= jx - 1 && x < jx + jw + 1 && y >= jy - 1 && y < jy + jh + 1);
        if (zebra === 'h') for (let k = 0; k < 4; k++) fill('#e9e6dc', 2, k * 4 + 1, 12, 2);
        else if (zebra === 'v') for (let k = 0; k < 4; k++) fill('#e9e6dc', k * 4 + 1, 2, 2, 12);
        else if (!inJ) {
          if (m.at(x, y - 1) === G.WALK && m.at(x, y + 1) === G.ROAD && x % 2 === 0) fill('#e8c547', 2, 15, 10, 1);
          if (m.at(x - 1, y) === G.WALK && m.at(x + 1, y) === G.ROAD && y % 2 === 0) fill('#e8c547', 15, 2, 1, 10);
        }
        // a white stop line where each road meets the junction
        if (m.cross && m.cross[(x + 1) + ',' + y] === 'h' && !zebra) fill('#e9e6dc', 14, 0, 2, 16);
        if (m.cross && m.cross[(x - 1) + ',' + y] === 'h' && !zebra) fill('#e9e6dc', 0, 0, 2, 16);
        break;
      }
      case G.WALK: if (m.junction && m.junction.some(([jx, jy, jw, jh]) => (x === jx || x === jx + jw - 1) && (y === jy || y === jy + jh - 1))) {
        // rounded kerb on the corners of a junction
        fill('#3a3b44'); c.fillStyle = '#b9b0a0'; c.beginPath();
        const cxk = x === m.junction[0][0] ? 0 : 16, cyk = (m.junction.find(j => y === j[1]) ? 0 : 16);
        c.save(); c.beginPath(); c.rect(px, py, 16, 16); c.clip(); c.beginPath(); c.arc(px + cxk, py + cyk, 16, 0, 7); c.fill(); c.restore(); break;
      } else { fill('#b9b0a0'); fill('#a39a8a', 0, 15, 16, 1); fill('#a39a8a', 15, 0, 1, 16); if (r(1) < .2) fill('#c8c0b0', 3, 4, 3, 2); } break;
      case G.SAND: fill('#d8c28c'); for (let i = 0; i < 3; i++) fill('#c9b07a', Math.floor(r(i) * 15), Math.floor(r(i + 3) * 15), 1, 1); break;
      case G.WATER: fill('#2d6aa8'); for (let i = 0; i < 2; i++) fill('#3b7ec0', Math.floor(r(i) * 12), Math.floor(r(i + 4) * 15), 4, 1); break;
      case G.PLANK: fill('#8a6038'); for (let i = 0; i < 4; i++) fill('#6e4a2a', 0, i * 4 + 3, 16, 1); fill('#5a3a1f', (y % 2) * 8 + 3, 0, 1, 16); break;
      case G.TILE: fill((x + y) % 2 ? theme.tileA : theme.tileB); fill('rgba(255,255,255,.14)', 1, 1, 7, 1); fill('rgba(255,255,255,.08)', 1, 1, 1, 6); fill('rgba(0,0,0,.1)', 0, 15, 16, 1); fill('rgba(0,0,0,.06)', 15, 0, 1, 16); break;
      case G.WOOD: { // boards in rows, each its own shade, the joints staggered, a knot here and there
        const tones = ['#8a5a33', '#83552f', '#91613a', '#7d4f2c'];
        for (let i = 0; i < 4; i++) { fill(tones[Math.floor(r(i + 50) * 4)], 0, i * 4, 16, 4); fill('rgba(255,225,180,.07)', 0, i * 4, 16, 1); fill('#5e3a1f', 0, i * 4 + 3, 16, 1); if (r(i + 70) < .55) fill('#5e3a1f', Math.floor(r(i + 60) * 16), i * 4, 1, 3); if (r(i + 80) < .25) fill('rgba(60,30,10,.4)', Math.floor(r(i + 90) * 12), i * 4 + 1, 3, 1); }
        break;
      }
      case G.CARPET: {
        fill(theme ? theme.carpet : '#7a1d2a');
        const acc = theme ? theme.trim : '#c9a14a';
        if ((x + y) % 2 === 0) { c.fillStyle = acc; c.globalAlpha = .35; c.fillRect(px + 7, py + 3, 2, 2); c.fillRect(px + 3, py + 7, 2, 2); c.fillRect(px + 11, py + 7, 2, 2); c.fillRect(px + 7, py + 11, 2, 2); c.globalAlpha = 1; }
        for (let i = 0; i < 7; i++) fill(r(i + 100) < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)', Math.floor(r(i + 110) * 15), Math.floor(r(i + 120) * 15), 1, 1); // the pile
        break;
      }
      case G.WALL: {
        const col = theme ? theme.wall : '#555', trim = theme ? theme.trim : '#333';
        fill(col);
        if (y === 1 && m.at(x, y + 1) !== G.WALL) { // the back wall: paper above a panelled dado, a skirting board
          for (let k = 0; k < 2; k++) fill('rgba(255,255,255,.05)', 2 + k * 8, 1, 3, 6); fill('rgba(0,0,0,.2)', 0, 8, 16, 5); fill('rgba(255,255,255,.1)', 0, 8, 16, 1); fill('rgba(0,0,0,.18)', 2, 9, 12, 3); fill('rgba(255,255,255,.05)', 2, 9, 12, 1);
          fill(trim, 0, 13, 16, 3); fill('rgba(255,255,255,.08)', 0, 0, 16, 2); if (x % 4 === 0) fill(trim, 7, 0, 2, 13);
        }
        else if (y === 0 && m.room) { fill('rgba(0,0,0,.22)', 0, 0, 16, 4); fill(trim, 0, 4, 16, 1); fill('rgba(255,255,255,.04)', (x % 2) * 8, 5, 8, 11); } // a cornice
        else if (y >= 2) { fill(trim, 0, 0, 16, 1); fill('rgba(0,0,0,.25)'); }
        break;
      }
      default: fill('#000');
    }
  }

  function paintBuilding(c, b) {
    const S = {
      spur: { wall: '#8b5a2b', roof: '#5b2c16', trim: '#d9a066', sign: '#e74c3c' },
      diner: { wall: '#e8e2d0', roof: '#c0392b', trim: '#2c3e50', sign: '#e74c3c' },
      store: { wall: '#dfe6e9', roof: '#2980b9', trim: '#2d3436', sign: '#27ae60' },
      palace: { wall: '#f1e3b5', roof: '#b8862b', trim: '#8a6a24', sign: '#f6d88d' },
      salon: { wall: '#1d1a14', roof: '#0c0a08', trim: '#c9a14a', sign: '#c9a14a' },
      motel: { wall: '#e4c99a', roof: '#6b7b8c', trim: '#7a5230', sign: '#ff5fa2' },
      pawn: { wall: '#9a8c78', roof: '#4a4a4a', trim: '#2d2d2d', sign: '#f1c40f' },
      shop: { wall: '#f5e6d3', roof: '#16a085', trim: '#0e5e4e', sign: '#f39c12' },
      grand: { wall: '#d4d0c8', roof: '#5d6d7e', trim: '#8a6a24', sign: '#f6d88d' },
      apts: { wall: '#b07d62', roof: '#5d4037', trim: '#3e2723', sign: '#bdc3c7' },
      steak: { wall: '#4e342e', roof: '#212121', trim: '#c9a14a', sign: '#e67e22' },
    }[b.style];
    const px = b.x * T, py = b.y * T, w = b.w * T, hgt = b.h * T, roofH = Math.max(2, Math.round(b.h * 0.42)) * T;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(px + 3, py + 4, w, hgt);
    // roof
    c.fillStyle = S.roof; c.fillRect(px, py, w, roofH);
    c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < roofH; i += 4) c.fillRect(px, py + i, w, 1);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px, py + roofH - 2, w, 2);
    // facade
    c.fillStyle = S.wall; c.fillRect(px, py + roofH, w, hgt - roofH);
    c.fillStyle = S.trim; c.fillRect(px, py + roofH, w, 2); c.fillRect(px, py + hgt - 2, w, 2);
    // sign board
    c.fillStyle = '#111'; c.fillRect(px + 6, py + roofH + 4, w - 12, 9);
    c.fillStyle = S.sign; c.fillRect(px + 7, py + roofH + 5, w - 14, 1);
    // windows
    const doorPx = px + b.door * T;
    if (b.style !== 'palace') for (let wx = px + 4; wx < px + w - 10; wx += 14) {
      if (wx + 10 > doorPx - 2 && wx < doorPx + T + 2) continue;
      const wy = py + roofH + 18; if (wy + 10 > py + hgt - 3) continue;
      (b.wins = b.wins || []).push([wx, wy]);
      c.fillStyle = S.trim; c.fillRect(wx - 1, wy - 1, 12, 11);
      c.fillStyle = b.style === 'salon' ? '#3a2f10' : '#9fd3f0'; c.fillRect(wx, wy, 10, 9);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(wx + 1, wy + 1, 3, 2);
    }
    // door with awning
    const dy = py + hgt - T;
    c.fillStyle = S.trim; c.fillRect(doorPx + 1, dy - 1, T - 2, T + 1);
    c.fillStyle = ['palace', 'grand', 'salon'].includes(b.style) ? '#6b4a12' : '#3b2414'; c.fillRect(doorPx + 3, dy + 1, T - 6, T - 1);
    c.fillStyle = '#f6d88d'; c.fillRect(doorPx + T - 6, dy + 8, 1, 2);
    c.fillStyle = S.sign; c.fillRect(doorPx - 2, dy - 4, T + 4, 3);
    if (b.style === 'palace') paintColonnade(c, b, px, py, w, hgt, roofH, doorPx, S);
  }

  // the Gilded Palace: a portico of fluted columns with bases and capitals, tall windows between
  // them, and a pediment over the doors
  function paintColonnade(c, b, px, py, w, hgt, roofH, doorPx, S) {
    const top = py + roofH + 15, base = py + hgt - 3, cw = 7;
    const slots = []; const n = 6, gap = (w - 16) / (n - 1);
    for (let i = 0; i < n; i++) { const x = Math.round(px + 8 + i * gap - cw / 2); if (x + cw > doorPx - 3 && x < doorPx + T + 3) continue; slots.push(x); }
    // windows between neighbouring columns
    for (let i = 0; i < slots.length - 1; i++) {
      const wx = slots[i] + cw + 2, ww = slots[i + 1] - wx - 2; if (ww < 6 || (wx < doorPx + T + 2 && wx + ww > doorPx - 2)) continue;
      c.fillStyle = S.trim; c.fillRect(wx - 1, top + 3, ww + 2, base - top - 10);
      c.fillStyle = '#9fd3f0'; c.fillRect(wx, top + 4, ww, base - top - 12);
      c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(wx + 1, top + 5, 2, base - top - 16);
      c.fillStyle = S.trim; c.fillRect(wx, top + 4 + Math.round((base - top - 12) / 2), ww, 1);
    }
    for (const x of slots) {
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + 2, top + 2, cw, base - top);   // shadow on the wall
      c.fillStyle = '#efe2b8'; c.fillRect(x, top + 3, cw, base - top - 4);            // shaft
      c.fillStyle = '#fffaf0'; c.fillRect(x + 1, top + 3, 2, base - top - 4);         // lit edge
      c.fillStyle = '#cdb67a'; c.fillRect(x + cw - 2, top + 3, 2, base - top - 4);    // shaded edge
      c.fillStyle = 'rgba(160, 130, 60, .35)'; c.fillRect(x + 3, top + 4, 1, base - top - 6); // fluting
      c.fillStyle = '#d9c48a'; c.fillRect(x - 2, top, cw + 4, 3); c.fillStyle = '#fff3cc'; c.fillRect(x - 2, top, cw + 4, 1); // capital
      c.fillStyle = '#d9c48a'; c.fillRect(x - 2, base - 2, cw + 4, 3); c.fillStyle = '#b89c55'; c.fillRect(x - 2, base, cw + 4, 1);    // base
    }
    // entablature across the top of the columns
    c.fillStyle = '#e8d8a8'; c.fillRect(px + 2, top - 3, w - 4, 3); c.fillStyle = '#b89c55'; c.fillRect(px + 2, top - 1, w - 4, 1);
    // pediment over the doors
    const mid = doorPx + T / 2, pw = T * 1.6, pt = py + hgt - T - 12;
    c.fillStyle = '#efe2b8'; c.beginPath(); c.moveTo(mid - pw / 2, pt + 8); c.lineTo(mid, pt); c.lineTo(mid + pw / 2, pt + 8); c.closePath(); c.fill();
    c.strokeStyle = '#b89c55'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#d4af37'; c.fillRect(mid - 1, pt + 3, 2, 3);
    // steps
    c.fillStyle = '#e4d7b0'; c.fillRect(doorPx - 4, py + hgt - 2, T + 8, 2);
  }

  function paintBoat(c, p) {
    const px = p.x * T, py = p.y * T, w = p.w * T, hh = p.h * T;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(px + 6, py + 10, w - 4, hh - 6);
    c.fillStyle = '#f4f1ea'; c.fillRect(px + 4, py + 18, w - 10, hh - 26);
    c.fillStyle = '#b3122b'; c.fillRect(px + 4, py + hh - 14, w - 10, 6);
    c.fillStyle = '#e8e2d0'; c.fillRect(px + 12, py + 30, w - 28, hh - 60);
    c.fillStyle = '#c9a14a'; for (let i = 0; i < 5; i++) c.fillRect(px + 16, py + 38 + i * 18, w - 36, 2);
    c.fillStyle = '#1b2631'; c.fillRect(px + 24, py + 2, 8, 30); c.fillRect(px + 46, py + 2, 8, 30);
    c.fillStyle = '#c9a14a'; c.fillRect(px + 22, py + 2, 12, 3); c.fillRect(px + 44, py + 2, 12, 3);
    c.fillStyle = '#b3122b'; c.fillRect(px + 10, py + hh - 6, w - 22, 8);
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#7a0c1c' : '#c0392b'; c.fillRect(px + 12 + i * 12, py + hh - 4, 6, 10); }
    // gangplank
    c.fillStyle = '#8a6038'; c.fillRect(px - 2, py + 5 * T + 2, 10, 12);
  }

  function paintProp(c, p) {
    const px = p.x * T, py = p.y * T;
    if (p.type === 'fountain') {
      c.fillStyle = '#9e9e9e'; c.beginPath(); c.arc(px + 24, py + 24, 22, 0, 7); c.fill();
      c.fillStyle = '#3b7ec0'; c.beginPath(); c.arc(px + 24, py + 24, 17, 0, 7); c.fill();
      c.fillStyle = '#bdbdbd'; c.fillRect(px + 21, py + 14, 6, 14);
    } else if (p.type === 'bench') {
      c.fillStyle = '#6b4423'; c.fillRect(px + 1, py + 6, 14, 3); c.fillRect(px + 1, py + 10, 14, 3);
      c.fillStyle = '#333'; c.fillRect(px + 2, py + 13, 2, 3); c.fillRect(px + 12, py + 13, 2, 3);
    } else if (p.type === 'lamp') {
      c.fillStyle = '#2d2d2d'; c.fillRect(px + 7, py + 2, 2, 12); c.fillRect(px + 5, py + 13, 6, 2);
      c.fillStyle = '#ffe08a'; c.fillRect(px + 5, py, 6, 4);
    } else if (p.type === 'sign') {
      c.fillStyle = '#6b4423'; c.fillRect(px + 7, py + 8, 2, 8);
      c.fillStyle = '#a0522d'; c.fillRect(px + 1, py + 2, 14, 8); c.fillStyle = '#f3e0b5'; c.fillRect(px + 3, py + 4, 10, 1); c.fillRect(px + 3, py + 7, 8, 1);
    } else if (p.type === 'counter') {
      c.fillStyle = '#4a2a14'; c.fillRect(px, py, T, p.h * T); c.fillStyle = '#7a4a24'; c.fillRect(px + 2, py, T - 4, p.h * T);
      c.fillStyle = '#c9a14a'; c.fillRect(px + 2, py, 1, p.h * T);
      for (let i = 0; i < p.h; i++) { c.fillStyle = ['#d35400', '#27ae60', '#f1c40f'][i % 3]; c.fillRect(px + 6, py + i * T + 5, 3, 5); }
    } else if (p.type === 'shelf') {
      for (let i = 0; i < p.w * 4; i++) { c.fillStyle = ['#27ae60', '#c0392b', '#f1c40f', '#8e44ad', '#ecf0f1'][i % 5]; c.fillRect(px + 2 + i * 4, py + 8 + (i % 2), 2, 6); }
      c.fillStyle = '#3b2414'; c.fillRect(px, py + 14, p.w * T, 2);
    } else if (p.type === 'slot') {
      c.fillStyle = '#2c2c34'; c.fillRect(px + 2, py, 12, 15); c.fillStyle = '#c9a14a'; c.fillRect(px + 2, py, 12, 2);
      c.fillStyle = '#111'; c.fillRect(px + 4, py + 4, 8, 5); c.fillStyle = '#b3122b'; c.fillRect(px + 3, py + 11, 10, 2);
    }
  }

  function paintTable(c, tb) {
    const px = tb.x * T, py = tb.y * T, w = tb.w * T, hh = tb.h * T;
    const felt = { green: '#16703f', blue: '#1b4f8a', red: '#8a1c2b', black: '#1a1a1a' }[App.state.equipped.felt] || '#16703f';
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px + 2, py + 4, w, hh);
    if (tb.game === 'craps') {
      c.fillStyle = '#4a2a14'; c.fillRect(px - 2, py - 2, w + 4, hh + 4);
      c.fillStyle = felt; c.fillRect(px + 2, py + 2, w - 4, hh - 4);
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(px + 6, py + 6, w - 12, 1); c.fillRect(px + 6, py + hh - 8, w - 12, 1); c.fillRect(px + w / 2, py + 6, 1, hh - 14);
      c.fillStyle = '#fff'; c.fillRect(px + 20, py + 12, 4, 4); c.fillRect(px + 27, py + 14, 4, 4);
    } else if (tb.game === 'roulette') {
      c.fillStyle = '#4a2a14'; c.fillRect(px - 1, py - 1, w + 2, hh + 2);
      c.fillStyle = felt; c.fillRect(px + 1, py + 1, w - 2, hh - 2);
      c.fillStyle = '#5a3a1a'; c.beginPath(); c.arc(px + 12, py + 16, 11, 0, 7); c.fill();
      for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#b3122b' : '#111'; c.beginPath(); c.moveTo(px + 12, py + 16); c.arc(px + 12, py + 16, 9, i * Math.PI / 6, (i + 1) * Math.PI / 6); c.fill(); }
      c.fillStyle = '#c9a14a'; c.beginPath(); c.arc(px + 12, py + 16, 3, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 4; i++) c.fillRect(px + 28 + i * 8, py + 6, 1, 20); c.fillRect(px + 28, py + 6, 32, 1); c.fillRect(px + 28, py + 26, 32, 1);
    } else {
      c.fillStyle = '#4a2a14'; c.beginPath(); c.moveTo(px - 2, py - 1); c.lineTo(px + w + 2, py - 1); c.lineTo(px + w + 2, py + 8); c.quadraticCurveTo(px + w / 2, py + hh + 12, px - 2, py + 8); c.closePath(); c.fill();
      c.fillStyle = felt; c.beginPath(); c.moveTo(px + 2, py + 2); c.lineTo(px + w - 2, py + 2); c.lineTo(px + w - 2, py + 8); c.quadraticCurveTo(px + w / 2, py + hh + 6, px + 2, py + 8); c.closePath(); c.fill();
      c.fillStyle = '#2b2b2b'; c.fillRect(px + w / 2 - 10, py + 2, 20, 4);
      for (let i = 0; i < 4; i++) { c.fillStyle = ['#c8102e', '#138a3e', '#151515', '#f2f2f2'][i]; c.fillRect(px + w / 2 - 9 + i * 5, py + 3, 3, 2); }
      c.fillStyle = '#fbf8f1'; c.fillRect(px + 22, py + 12, 5, 7); c.fillRect(px + 30, py + 12, 5, 7); c.fillRect(px + 38, py + 12, 5, 7);
      c.fillStyle = 'rgba(255,230,160,.5)'; c.fillRect(px + 10, py + 20, 6, 1); c.fillRect(px + 48, py + 20, 6, 1);
    }
  }

  function prerender(m) {
    const cv = document.createElement('canvas'); cv.width = m.w * T; cv.height = m.h * T;
    const c = cv.getContext('2d');
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) paintTile(c, m, x, y);
    // draw trees again so canopies overlap neighbouring tiles nicely
    m.buildings.forEach(b => paintBuilding(c, b));
    if (m.room) { // pools of warm light from the ceiling, and a soft shadow under everything that stands on the floor
      for (let x = 3; x < m.w - 1; x += 5) { const g = c.createRadialGradient(x * T, m.h * T * .55, 4, x * T, m.h * T * .55, 5 * T); g.addColorStop(0, 'rgba(255,228,170,.13)'); g.addColorStop(1, 'rgba(255,228,170,0)'); c.fillStyle = g; c.fillRect(0, 2 * T, m.w * T, m.h * T); }
      c.fillStyle = 'rgba(0,0,0,.2)'; for (const p of m.props) if (p.type === 'furn' && p.y >= 2 && !['rug', 'table', 'stool', 'sofa', 'bench', 'lamp', 'car', 'fountain2'].includes(p.kind)) c.fillRect(p.x * T + 2, p.y * T + 4, p.w * T, p.h * T);
    }
    m.props.forEach(p => p.type === 'boat' ? paintBoat(c, p) : p.type === 'furn' ? paintFurn(c, p) : paintProp(c, p));
    m.tables.forEach(tb => paintTable(c, tb));
    paintDecor(c, m);
    if (m.room) { const g = c.createRadialGradient(m.w * T / 2, m.h * T * .55, m.h * T * .3, m.w * T / 2, m.h * T * .55, m.w * T * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = g; c.fillRect(0, 0, m.w * T, m.h * T); }
    // street names are painted on the road itself so people walk over them
    c.font = `bold ${T * .55}px "Trebuchet MS", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255, 255, 255, .4)';
    m.labels.filter(L => L.street).forEach(L => c.fillText(L.text, L.x * T, L.y * T));
    m.canvas = cv;
  }

  // around a room smaller than the screen: its wallpaper above and its floor's shadow below
  function backdrop(c, cv, m, u, ox, oy, TS) {
    const th = m.theme || {}, wall = th.wall || '#3a2a20', trim = th.trim || '#1d140c';
    c.fillStyle = wall; c.fillRect(0, 0, cv.width, cv.height);
    if (![ox, oy, TS, u].every(Number.isFinite) || !TS) return; // not laid out yet
    c.fillStyle = trim; c.globalAlpha = .3; for (let x = ox % (12 * u); x < cv.width; x += 12 * u) c.fillRect(x, 0, 2 * u, cv.height); c.globalAlpha = 1;
    // the back wall carries on up, lit near the room and fading into shadow; the floor's edge drops away below
    const top = Math.max(0, oy - 4 * TS), g = c.createLinearGradient(0, top, 0, oy);
    g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,.05)'); c.fillStyle = g; c.fillRect(0, top, cv.width, oy - top);
    c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(0, 0, cv.width, top);
    if (oy > 6 * u) { c.fillStyle = trim; c.fillRect(0, oy - 3 * u, cv.width, 3 * u); for (let x = ox + 2 * TS; x < ox + m.w * TS; x += 4 * TS) { const gl = c.createRadialGradient(x, oy - TS * .9, 0, x, oy - TS * .9, TS * 1.4); gl.addColorStop(0, 'rgba(255,214,140,.35)'); gl.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = gl; c.fillRect(x - TS * 1.5, oy - TS * 2.4, TS * 3, TS * 3); c.fillStyle = '#ffe2a8'; c.fillRect(x - 2 * u, oy - TS - 2 * u, 4 * u, 3 * u); c.fillStyle = trim; c.fillRect(x - 3 * u, oy - TS + u, 6 * u, 2 * u); } } // wall lights
    const bot = oy + m.h * TS; if (bot < cv.height) { c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(0, bot, cv.width, cv.height - bot); }
  }
  // what hangs on a casino's back wall
  function paintDecor(c, m) {
    const v = m.decor, W = m.w; if (!v) return;
    const R = (x, y, w, h2, col) => { c.fillStyle = col; c.fillRect(x, y, w, h2); };
    const frame = (x, w, art) => { R(x, 6, w, 14, '#c9a14a'); R(x + 1, 7, w - 2, 12, '#2a1a10'); art(x + 2, 8, w - 4, 10); };
    if (v === 'spur') {
      frame(5 * T, 22, (x, y, w, h2) => { R(x, y, w, h2, '#e8d5a8'); R(x + 3, y + 1, w - 6, 2, '#5a3a22'); R(x + 7, y + 4, 8, 5, '#6b4a2a'); });
      frame(9 * T, 22, (x, y, w, h2) => { R(x, y, w, h2, '#e8d5a8'); R(x + 3, y + 1, w - 6, 2, '#5a3a22'); R(x + 6, y + 4, 10, 5, '#8a5a33'); });
      const lx = 15 * T - 7; R(lx, 6, 30, 3, '#d8c8a8'); R(lx + 2, 3, 3, 6, '#d8c8a8'); R(lx + 25, 3, 3, 6, '#d8c8a8'); R(lx + 12, 8, 6, 8, '#6b4423'); // longhorns (Sal's lock is behind them)
      c.font = 'bold 9px Georgia'; c.fillStyle = '#ff6b4d'; c.fillText('COLD BEER', 20 * T + 16, 14);
    }
    if (v === 'riverboat') for (let i = 0; i < 6; i++) { const x = (4 + i * 3.6) * T; c.fillStyle = '#c9a14a'; c.beginPath(); c.arc(x, 13, 7, 0, 7); c.fill(); c.fillStyle = '#1f4a6a'; c.beginPath(); c.arc(x, 13, 5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x - 3, 10, 2, 2); }
    if (v === 'riverboat') { c.strokeStyle = '#8a5a33'; c.lineWidth = 2; c.beginPath(); c.arc(W * T - 3 * T, 14, 8, 0, 7); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(W * T - 3 * T, 14); c.lineTo(W * T - 3 * T + Math.cos(a) * 11, 14 + Math.sin(a) * 11); c.stroke(); } }
    if (v === 'palace') for (let i = 0; i < 4; i++) { const x = (4 + i * 5) * T; frame(x, 20, (x2, y, w, h2) => { R(x2, y, w, h2, ['#6a3a2a', '#2a4a6a', '#4a6a3a', '#6a2a4a'][i]); c.fillStyle = 'rgba(255,240,200,.5)'; c.beginPath(); c.arc(x2 + w / 2, y + h2 / 2, 3, 0, 7); c.fill(); }); R(x + 26, 2, 6, 26, '#7a1d2a'); R(x + 27, 2, 1, 26, '#a33a4a'); }
    if (v === 'salon') for (let i = 0; i < W; i += 2) { R(i * T, 4, T * 2 - 2, 22, '#2a2018'); R(i * T + 2, 6, T * 2 - 6, 18, '#1d1a14'); if (i % 6 === 2) { c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(i * T + T, 12, 3, 0, 7); c.fill(); } }
  }

  /* ======================= sprites ======================= */
  function playerLook() { return Looks.sprite(); }
  // 16x16 pixel person; u = screen pixels per art pixel
  function drawPerson(c, sx, sy, u, dir, frame, L, sil) {
    const p = (x, y, w, hh, col) => { c.fillStyle = sil || col; c.fillRect(Math.round(sx + x * u), Math.round(sy + y * u), Math.ceil(w * u), Math.ceil(hh * u)); };
    if (!sil) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(sx + 8 * u, sy + 15 * u, 5 * u, 1.6 * u, 0, 0, 7); c.fill(); }
    const step = frame % 2 ? 1 : 0, side = dir === 'left' || dir === 'right';
    // legs
    if (side) { p(6, 11, 2, 4 - step, L.pants); p(9, 11, 2, 3 + step, L.pants); p(6, 15 - step, 2, 1, '#222'); p(9, 14 + step, 2, 1, '#222'); }
    else { p(5, 11, 2, frame % 2 ? 3 : 4, L.pants); p(9, 11, 2, frame % 2 ? 4 : 3, L.pants); p(5, 14, 2, 1, '#222'); p(9, 14, 2, 1, '#222'); }
    // body + arms
    p(4, 7, 8, 5, L.shirt);
    if (L.vest) p(5, 7, 6, 5, L.vest);
    if (dir === 'down') { p(7, 7, 2, 2, '#f4f4f4'); if (L.tie) p(7.5, 8, 1, 3, '#a3242e'); if (L.bow) p(6.5, 7, 3, 1, '#111'); if (L.chain) p(5, 9, 6, 1, '#f5c542'); }
    if (!side) { p(3, 7.5, 1.5, 4, L.shirt); p(11.5, 7.5, 1.5, 4, L.shirt); p(3, 11, 1.5, 1.2, L.skin); p(11.5, 11, 1.5, 1.2, L.skin); }
    else p(dir === 'left' ? 6 : 8, 8, 2, 4, L.shirt);
    // head; hair styles and facial hair come from Looks (or default to a short cut)
    const st = L.style || 'short', H = L.hair, bald = st === 'bald', long = st === 'long' || st === 'bob';
    const len = st === 'long' ? 7 : st === 'bob' ? 5.5 : 4;
    if (st === 'bun') p(6.5, -1.2, 3, 2.2, H);
    if (st === 'pony' && dir !== 'down') p(dir === 'left' ? 11 : dir === 'right' ? 3 : 7, 3, 2, 5, H);
    p(4, 1, 8, 7, L.skin);
    if (dir === 'up') { if (!bald) p(4, st === 'pomp' ? 0 : 1, 8, long ? len : st === 'buzz' ? 4 : 6, H); }
    else {
      if (!bald) p(st === 'curly' ? 3.5 : 4, st === 'pomp' ? 0 : st === 'curly' ? .4 : 1, st === 'curly' ? 9 : 8, st === 'buzz' ? 1.2 : st === 'pomp' ? 2.8 : 2, H);
      if (side) { if (!bald && st !== 'buzz') p(dir === 'left' ? 9 : 4, 1, 3, long ? len : 4, H); p(dir === 'left' ? 5 : 10, 4, 1, 1, '#222'); }
      else { if (long) { p(3.5, 1, 1.5, len, H); p(11, 1, 1.5, len, H); } else if (!bald && st !== 'buzz') { p(4, 1, 1, 4, H); p(11, 1, 1, 4, H); } p(6, 4, 1, 1, '#222'); p(9, 4, 1, 1, '#222'); }
      const fx = side ? (dir === 'left' ? 4 : 7) : 5, fw = side ? 5 : 6;
      if (L.beard === 'full') { p(4, 5.4, 8, 2.6, H); p(6.5, 6, 3, .8, L.skin); }
      else if (L.beard === 'goatee') p(side ? fx + 2 : 7, 6.4, 2, 1.4, H);
      else if (L.beard === 'stache') p(side ? fx + 1 : 6, 5.6, side ? 3 : 4, .8, H);
      else if (L.beard === 'stubble' && !sil) { c.globalAlpha = .3; p(4, 5.2, 8, 2.8, H); c.globalAlpha = 1; }
      if (L.glasses && !L.shades) { if (side) p(dir === 'left' ? 4 : 9, 3.6, 3, .5, '#222'); else { p(5, 3.4, 2.6, .5, '#222'); p(8.4, 3.4, 2.6, .5, '#222'); p(5, 3.4, .5, 1.8, '#222'); p(10.5, 3.4, .5, 1.8, '#222'); } }
      if (L.shades && !side) { p(5, 3.6, 2.5, 1.4, '#111'); p(8.5, 3.6, 2.5, 1.4, '#111'); p(7.5, 4, 1, .5, '#111'); }
      if (L.shades && side) p(dir === 'left' ? 4 : 9, 3.6, 3, 1.4, '#111');
    }
    if (L.hat) { p(2.5, 1, 11, 1.2, '#3b2f2a'); p(4.5, -1.5, 7, 2.6, '#4b3b33'); p(4.5, .2, 7, .8, '#1d1715'); }
  }

  /* ======================= runtime ======================= */
  const maps = {};
  function getMap(id) {
    if (!maps[id]) { maps[id] = id === 'town' ? buildTown() : id.startsWith('r:') ? buildRoom(id.slice(2)) : buildInterior(id.slice(2)); prerender(maps[id]); }
    return maps[id];
  }
  let S = null; // live state while the world screen is up

  function mount(main) {
    const st = App.state, w = st.world;
    const root = h('div.world',
      h('canvas.world-cv'),
      h('div.w-top',
        h('div.w-chips', h('button.w-goal', { onclick: () => Router.go('status') }), h('button.w-goal.w-case', { onclick: () => Router.go('case'), title: 'Case file' }, '🔎'), h('button.w-goal.w-case', { onclick: () => townMap(), title: 'Town map', 'aria-label': 'Town map' }, '🗺️')),
        h('div.w-right', h('div.w-area'), h('div.w-event'))),
      h('div.w-prompt', { onclick: () => interact() }),
      h('div.pad', ['up', 'left', 'right', 'down'].map(d => h('button.pad-' + d, { 'aria-label': d, 'data-dir': d }, { up: '▲', down: '▼', left: '◀', right: '▶' }[d]))),
      h('div.ab', h('button.ab-b', { 'aria-label': 'Run' }, 'B'), h('button.ab-a', { 'aria-label': 'Interact' }, 'A')),
      h('div.w-fade'));
    main.append(root);
    const cv = root.querySelector('canvas');
    const m = getMap(w.map);
    populate(m);
    if (!Number.isFinite(w.x) || !Number.isFinite(w.y) || (m.solid(w.x, w.y) && !m.doors[w.x + ',' + w.y])) [w.x, w.y] = m.start;
    S = { root, cv, c: cv.getContext('2d'), m, p: { x: w.x, y: w.y, dir: w.dir || 'down', fx: w.x, fy: w.y, moving: null, frame: 0 }, keys: new Set(), run: false, area: null, lastStep: 0, steps: 0, raf: 0, busy: false };
    resize();
    bindInput();
    updateGoal();
    showArea(true);
    S.raf = requestAnimationFrame(loop);
    setTimeout(() => worldBeats(), 400);
  }
  // story beats that happen to you rather than being started by you
  async function worldBeats() {
    const st = App.state;
    if (!S || st.mode !== 'career' || document.querySelector('.modal-bg')) return;
    if (Mystery.has('confession') && Mystery.has('chip') && !Mystery.has('badge') && !st.flags.meiNote) {
      st.flags.meiNote = st.day; App.save();
      await UI.dialog([{ who: 'narrator', text: 'Someone slipped an envelope into your pocket. Inside, in tidy block capitals: "COMMISSION BUSINESS. FIND ME AT THE RIVERBOAT. DON\'T TELL KESSLER. — M.L."' }]);
    }
    const n = Me.now(), stamp = n.d.toDateString();
    if (n.birthday && st.flags.bday !== stamp) {
      st.flags.bday = stamp; st.hunger = 100; st.thirst = 100; st.stamina = Math.max(st.stamina, st.staminaMax); App.credit(1717);
      await UI.dialog([{ who: 'dolores', text: () => `Happy birthday${Me.first() ? ', ' + Me.first() : ', sugar'}! Don't look so surprised, Kessler isn't the only one who keeps files. Cake's on the house, and there's $1,717 in that card. Sal's idea of a joke.` }]);
      App.save(); Router.hud();
    }
  }
  function unmount() {
    if (!S) return;
    cancelAnimationFrame(S.raf);
    window.removeEventListener('keydown', S.kd); window.removeEventListener('keyup', S.ku); window.removeEventListener('resize', S.rs);
    savePos(); S = null;
  }
  function savePos() { if (!S) return; Object.assign(App.state.world, { map: S.m.id, x: S.p.x, y: S.p.y, dir: S.p.dir }); }

  function resize() {
    const r = S.root.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); // pixel art gains nothing past 2x
    S.cv.width = Math.round(r.width * dpr); S.cv.height = Math.round(r.height * dpr);
    S.cv.style.width = r.width + 'px'; S.cv.style.height = r.height + 'px';
    let css = Math.max(2, Math.floor(Math.min(r.width / (16 * 18), r.height / (16 * 12))));
    if (S.m && S.m.room) css = Math.max(css, Math.min(css + 2, Math.floor(Math.min(r.width / (16 * (S.m.w + .5)), r.height / (16 * (S.m.h + .5))) * 4) / 4)); // a small room fills the screen, not a corner of it
    S.u = css * dpr; S.dpr = dpr;
  }

  function bindInput() {
    const map = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    S.kd = e => {
      if (document.querySelector('.modal-bg') || e.target.matches('input,select,textarea')) return;
      if (map[e.key]) { S.keys.add(map[e.key]); S.lastDir = map[e.key]; e.preventDefault(); }
      else if ([' ', 'Enter', 'e', 'E', 'z', 'Z'].includes(e.key)) { e.preventDefault(); if (!e.repeat) interact(); }
      else if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') S.run = true;
      else if (e.key === 'm' || e.key === 'M') townMap();
    };
    S.ku = e => { if (map[e.key]) S.keys.delete(map[e.key]); if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') S.run = false; };
    S.rs = () => resize();
    window.addEventListener('keydown', S.kd); window.addEventListener('keyup', S.ku); window.addEventListener('resize', S.rs);
    S.root.querySelectorAll('.pad button').forEach(b => {
      const d = b.dataset.dir;
      const on = e => { e.preventDefault(); S.keys.add(d); S.lastDir = d; b.classList.add('on'); };
      const off = () => { S.keys.delete(d); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    const A = S.root.querySelector('.ab-a'), Bb = S.root.querySelector('.ab-b');
    // act on the press, and keep the finger's release from landing on whatever opens underneath it
    A.addEventListener('pointerdown', e => { e.preventDefault(); A.classList.add('on'); try { A.setPointerCapture(e.pointerId); } catch (_) { } interact(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => A.addEventListener(ev, () => A.classList.remove('on')));
    [A, Bb, ...S.root.querySelectorAll('.pad button')].forEach(b => { b.addEventListener('contextmenu', e => e.preventDefault()); b.addEventListener('touchend', e => e.preventDefault(), { passive: false }); });
    Bb.addEventListener('pointerdown', e => { e.preventDefault(); S.run = true; Bb.classList.add('on'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => Bb.addEventListener(ev, () => { S.run = false; Bb.classList.remove('on'); }));
    S.root.querySelector('canvas').addEventListener('contextmenu', e => e.preventDefault());
  }

  // story characters and rivals move around with the story and the day, so refresh them on entry
  function populate(m) { m.npcs = m.npcs.filter(n => !n.dyn).concat(Cast.forMap(m)); const fixed = Mystery.spots(m).concat(Holdem.spots(m), Darts.spots(m), SalQuest.spots(m)); m.caseSpots = fixed.concat(keepSpots(m, fixed)); }
  // a fragment hides on a fixed, out-of-the-way floor tile: the same one every visit
  function keepSpots(m, fixed) {
    if (typeof Fragments === 'undefined' || App.state.mode !== 'career') return [];
    if (!m.fragCand) { // worked out once per map: floor you can actually walk to from the way in
      const floor = [G.WALK, G.GRASS, G.FLOWERS, G.PLANK, G.WOOD, G.CARPET, G.TILE, G.SAND];
      const used = new Set(Object.keys(m.doors).concat(Object.keys(m.acts), m.npcs.filter(n => !n.dyn).map(n => n.x + ',' + n.y)));
      const seen = new Set(), q = [m.start]; seen.add(m.start.join());
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && x + dx >= 0 && y + dy >= 0 && x + dx < m.w && y + dy < m.h && !m.solid(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
      m.fragCand = []; for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (seen.has(x + ',' + y) && floor.includes(m.at(x, y)) && !used.has(x + ',' + y) && !(m.cross && m.cross[x + ',' + y])) m.fragCand.push([x, y]);
    }
    const busy = new Set(fixed.map(c => c.x + ',' + c.y)), cand = m.fragCand.filter(([x, y]) => !busy.has(x + ',' + y));
    // spread them out: each one goes to the candidate farthest from the ones already placed, from a
    // fixed starting point per map, so they never bunch up and never move between visits
    const placed = [], all = FRAGMENTS.map((k, i) => ({ ...k, i })).filter(k => k.map === m.id);
    let seed = cand[Math.floor(hash(m.w, m.h, 17) * cand.length)];
    for (const k of all) {
      let best = seed, bd = -1;
      if (placed.length) for (let j = 0; j < cand.length; j += 3) { const c0 = cand[j], d = Math.min(...placed.map(([x, y]) => Math.abs(x - c0[0]) + Math.abs(y - c0[1]))) + hash(c0[0], c0[1], k.i) * 2; if (d > bd) { bd = d; best = c0; } }
      placed.push(best || [1, 1]); if (!Fragments.has(k.i)) placed[placed.length - 1].k = k.i;
    }
    return placed.filter(p => p.k != null).map(([x, y, k]) => ({ x, y, id: 'keep', keep: placed.find(q => q[0] === x && q[1] === y).k, label: 'Something glints', hidden: true }));
  }
  function npcAt(m, x, y) { return m.npcs.find(n => n.x === x && n.y === y); }
  function passable(m, x, y) { return !m.solid(x, y) && !npcAt(m, x, y); }

  function tryMove(now) {
    const p = S.p;
    const held = S.keys.has(S.lastDir) ? S.lastDir : [...S.keys][0];
    if (!held) return;
    if (p.dir !== held) { p.dir = held; S.turnAt = now; return; }
    if (S.turnAt && now - S.turnAt < 70) return;
    const [dx, dy] = DIRS[held], nx = p.x + dx, ny = p.y + dy;
    if (!passable(S.m, nx, ny)) return;
    p.moving = { fx: p.x, fy: p.y, tx: nx, ty: ny, t0: now, dur: S.run ? 95 : 165 };
    p.x = nx; p.y = ny;
  }

  async function arrive() {
    const p = S.p, m = S.m;
    S.steps++;
    Career.drain('step', S.run ? 1.5 : 1);
    if (S.steps % 15 === 0) { savePos(); App.save(); }
    showArea();
    const door = m.doors[p.x + ',' + p.y];
    if (door) { await useDoor(door); return; }
    if (Career.needsOn() && App.state.stamina <= 0) { S.busy = true; await Career.passOut(); }
  }

  // leave the player on the tile outside a door after using it
  function stepOut(door) {
    if (door.out) { S.p.x = door.out[0]; S.p.y = door.out[1]; S.p.dir = 'down'; }
    savePos();
  }

  // opening hours for the places that keep them (everything else never closes)
  const HOURS = { diner: [360, 1380], steak: [1020, 1500], pawn: [600, 1320], shop: [600, 1260], riverboat: [720, 1680] };
  function openNow(key) {
    const h = HOURS[key]; if (!h || !Career.needsOn()) return true;
    const t = clock() % 1440, t2 = t + 1440;
    return (t >= h[0] && t < h[1]) || (t2 >= h[0] && t2 < h[1]);
  }
  const hhmm = m => { const t = ((m % 1440) + 1440) % 1440, hh = Math.floor(t / 60), mm = t % 60; return `${(hh + 11) % 12 + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${hh < 12 ? 'AM' : 'PM'}`; };
  function hoursText(key) { const h = HOURS[key]; return h ? `${hhmm(h[0])} to ${hhmm(h[1])}` : 'all hours'; }
  async function useDoor(door) {
    S.busy = true; S.keys.clear();
    try {
      if (door.venue) {
        const id = door.venue;
        if (!Career.venueOpen(id) && !Career.tryUnlock(id)) {
          stepOut(door);
          const v = VENUES[id], reqs = Career.venueReqs(id);
          await UI.modal({ title: `${v.icon} ${v.name}`, body: h('div', h('p', v.tag), h('p', 'The doorman stops you. To get in:'), h('ul.reqs', reqs.map(([t, ok]) => h('li' + (ok ? '.ok' : ''), (ok ? '✔ ' : '✘ ') + t)))) });
          return;
        }
        const st = App.state;
        if ((id === 'palace' || id === 'salon') && Mood.drunk()) { stepOut(door); App.count('bounced'); await UI.dialog([{ who: 'narrator', text: `The doorman puts a hand on your chest. "Not tonight, friend. Come back when you can say ${id === 'salon' ? '\'Salon Privé\'' : '\'Gilded Palace\''} without swaying." Some water and a bite to eat would help.` }]); return; }
        if (!openNow(id)) { stepOut(door); await UI.dialog([{ who: 'narrator', text: `The gangplank is up. A sign on the rail: "${VENUES[id].name} · open ${hoursText(id)}." It's ${clockText()}.` }]); return; }
        if (id === 'salon' && st.mode === 'career') {
          if ((st.flags.salonBanUntil || 0) > st.day) { stepOut(door); await UI.dialog([{ who: 'narrator', text: `The doorman doesn't even look up. "Mr. Kessler says you're not welcome until day ${st.flags.salonBanUntil}."` }]); return; }
          if (!isNight()) { stepOut(door); await UI.dialog([{ who: 'narrator', text: `A brass plaque by the door: "Salon Privé · 8 PM until dawn." It's ${clockText()}.` }]); return; }
        }
        App.state.venue = id;
        App.state.world.returnTo = door.out;
        await go('v:' + id);
        await Career.enterVenue(id);
        return;
      }
      if (door.room) {
        if (!openNow(door.room)) { stepOut(door); await UI.dialog([{ who: 'narrator', text: `The lights are off and the sign on the door says CLOSED. ${(ROOMS[door.room] || {}).name || 'It'} is open ${hoursText(door.room)}. It's ${clockText()}.` }]); return; }
        App.state.world.returnTo = door.out; await go('r:' + door.room); return;
      }
      const SUB = { club: ['v:spur', 15, 2], office: ['r:pawn', 2, 2], cellar: ['r:steak', 2, 2] }; // rooms inside rooms: back the way you came
      if (SUB[door.exit]) { await go(...SUB[door.exit], 'down'); return; }
      if (door.exit) {
        const town = getMap('town');
        const back = App.state.world.returnTo || Object.values(town.doors).find(d => d.venue === door.exit || d.room === door.exit).out;
        await go('town', back[0], back[1], 'down');
        return;
      }
      stepOut(door);
      if (door.place) await foodMenu(door.place);
      else if (door.sleep) await sleepMenu(door.sleep, door.label);
      else if (door.screen) { savePos(); App.save(); Router.go(door.screen); return; }
    } finally { if (S) S.busy = false; }
  }

  async function go(mapId, x, y, dir) {
    const fade = S.root.querySelector('.w-fade');
    fade.classList.add('on'); await new Promise(r => setTimeout(r, 180));
    const m = getMap(mapId);
    populate(m);
    S.m = m; S.p.x = x != null ? x : m.start[0]; S.p.y = y != null ? y : m.start[1]; S.p.dir = dir || 'up'; S.p.moving = null;
    resize();
    savePos(); App.save(); updateGoal(); showArea(true);
    fade.classList.remove('on');
  }

  function facing() {
    const p = S.p, [dx, dy] = DIRS[p.dir], fx = p.x + dx, fy = p.y + dy, m = S.m;
    const n = npcAt(m, fx, fy);
    if (n && n.table) return { kind: 'table', game: n.table, label: GAMES[n.table].name };
    if (n) return { kind: 'npc', npc: n, label: n.name || 'Talk' };
    const spot = (m.caseSpots || []).find(c => c.x === fx && c.y === fy);
    if (spot) return { kind: 'clue', spot, label: (spot.board || spot.door ? '' : '🔎 ') + spot.label };
    const a = m.acts[fx + ',' + fy];
    if (a) return { kind: a.table ? 'table' : 'act', ...a, game: a.table };
    const d = m.doors[fx + ',' + fy];
    if (d) { const key = d.room || d.venue; return { kind: 'door', door: d, label: d.label + (key && !openNow(key) ? ` (closed · opens ${hoursText(key).split(' to ')[0]})` : '') }; }
    return null;
  }

  async function interact() {
    if (!S) return;
    // pressed mid-step: remember it and act as soon as the step lands
    if (S.p.moving) { S.wantA = performance.now(); return; }
    if (S.busy || document.querySelector('.modal-bg')) return;
    const f = facing(); if (!f) return;
    S.busy = true; S.keys.clear();
    try {
      if (f.kind === 'table') {
        const why = Career.canPlay(); if (why) { UI.toast(why, 'warn'); return; }
        savePos(); App.save(); Router.openTable(f.game); return;
      }
      if (f.kind === 'door') { await useDoor(f.door); return; }
      if (f.kind === 'clue' && f.spot.id === 'backroom') { savePos(); App.save(); Router.go('poker'); return; }
      if (f.kind === 'clue' && f.spot.id === 'dartboard') { savePos(); App.save(); await Darts.lobby(); return; }
      if (f.kind === 'clue' && f.spot.id === 'salLock') { await SalQuest.lock(); populate(S.m); return; }
      if (f.kind === 'clue' && f.spot.id === 'club') { await go('r:club'); return; }
      if (f.kind === 'clue' && f.spot.keep != null) { await Fragments.take(f.spot.keep); populate(S.m); return; }
      if (f.kind === 'clue') { await Mystery.examine(f.spot); populate(S.m); return; }
      if (f.kind === 'npc') {
        const n = f.npc;
        const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[S.p.dir];
        if (!n.dealer) n.dir = back;
        if (n.who) await Chat.open(n.who);
        else if (n.crowd) await Chat.open(n.crowd());
        else await UI.dialog([{ who: 'narrator', text: `**${n.name}:** "${n.line}"` }]);
        return;
      }
      if (f.slots) { const why = Career.canPlay(); if (why) { UI.toast(why, 'warn'); return; } savePos(); App.save(); Router.go('slots', f.slots); return; }
      if (f.screen) { savePos(); App.save(); Router.go(f.screen); return; }
      if (f.fn) { await roomFx(f.fn); return; }
      if (f.place) await foodMenu(f.place);
      else if (f.sleep) await sleepMenu(f.sleep, f.label);
      else if (f.talk) await UI.dialog([{ who: 'narrator', text: f.talk }]);
    } finally { if (S) S.busy = false; }
  }

  /* ---------- menus ---------- */
  function needBars() {
    const st = App.state;
    if (!Career.needsOn()) return h('p.muted.small', 'Free Play: no hunger, thirst or tiredness.');
    const bar = (icon, v, max, lock = 0) => h('div.need', h('span', icon), h('div.bar', h('i', { style: { width: clamp(v / max, 0, 1) * 100 + '%' } }), lock ? h('b.lock', { style: { width: lock * 100 + '%' } }) : null), h('em', Math.round(v)));
    const t = Career.tiredness(), max = Career.energyMax();
    return h('div', h('div.needs', bar('🍔', st.hunger, 100), bar('💧', st.thirst, 100), bar('⚡', st.stamina, max, t / 100)),
      t >= 5 ? h('p.muted.small', `🥱 Tiredness ${Math.round(t)}%: the striped part of your energy only comes back with sleep.`) : null,
      (st.today.caf || 0) >= 2 ? h('p.muted.small', `☕ ${st.today.caf} caffeinated drinks today: each one does less from here.`) : null);
  }
  function foodMenu(placeId) {
    const P = PLACES[placeId];
    const body = h('div');
    const render = () => {
      body.innerHTML = '';
      const comp = P.comp && P.venue && App.state.today.wagered >= VENUES[P.venue].limits.min * 20;
      body.append(h('p', h('i', `"${P.line}"`)), needBars());
      if (P.comp && Career.happyHour(P.venue)) body.append(h('p.muted.small', '🍻 Happy hour until 7 PM: every drink is on the house.'));
      else if (P.comp) body.append(h('p.muted.small', comp ? '🎟️ You\'ve been playing: drinks are comped.' : `Drinks are comped once you've wagered ${fmt(VENUES[P.venue].limits.min * 20)} here today.${P.venue === 'spur' ? ' Happy hour is 5 to 7 PM.' : ''}`));
      const list = h('div.menu-list');
      for (const id of P.items) {
        const it = MENU[id], free = Career.isComped(P, it);
        // what the energy is actually worth right now, after caffeine tolerance
        const n = (App.state.today.caf || 0) + 1, en = it.caf ? Math.round(it.energy * ([1, 1, .5, .25, .1][n - 1] || 0)) : it.energy;
        const tags = [it.hunger && `🍔+${it.hunger}`, it.thirst && `💧+${it.thirst}`, it.energy && `⚡${en > 0 ? '+' : ''}${en}${it.caf ? ' ☕' : ''}`].filter(Boolean);
        list.append(h('div.menu-row', h('span.mi', it.icon), h('div.mn', h('b', it.name), h('small', tags.join('  '))),
          h('button.btn.sm' + (free ? '.primary' : ''), { disabled: !free && App.state.bank < it.price, onclick: () => { if (Career.consume(id, placeId)) render(); } }, free ? 'Free' : fmt(it.price))));
      }
      const usual = Me.get().drink;
      if (P.usual && usual) {
        const had = App.state.flags.usualDay === App.state.day;
        list.prepend(h('div.menu-row', h('span.mi', '🥃'), h('div.mn', h('b', `Your usual: ${usual}`), h('small', had ? 'Dolores already poured you one today' : 'On the house, once a day · 💧+40 ⚡+5')),
          h('button.btn.sm.primary', { disabled: had, onclick: () => { const st = App.state; st.flags.usualDay = st.day; st.thirst = Math.min(100, st.thirst + 40); st.stamina = Math.max(st.stamina, Math.min(Career.energyCap(), st.stamina + 5)); UI.toast(`🥃 "${usual}, just how you like it, sugar."`, 'good'); App.save(); Router.hud(); render(); } }, 'Free')));
      }
      if (P.npc) list.append(h('div.menu-row', h('span.mi', Portrait.el(P.npc)), h('div.mn', h('b', `Talk to ${CHARACTERS[P.npc].name.split(',')[0]}`), h('small', 'Catch up, ask for advice, or ask if there\'s any work')),
        h('button.btn.sm', { onclick: () => { pop.close(); Chat.open(P.npc); } }, 'Talk')));
      else if (STAFF_AT[placeId]) list.append(talkRow(STAFF_AT[placeId], () => pop.close()));
      if (P.job) list.append(h('div.menu-row', h('span.mi', '🧽'), h('div.mn', h('b', 'Work a shift washing glasses'), h('small', `Earn ${fmt(120 + App.state.chapter * 80)} · ⚡−40 🍔−15 💧−15`)),
        h('button.btn.sm', { onclick: async () => { await Career.oddJob(); render(); } }, 'Work')));
      body.append(list);
    };
    render();
    const pop = UI.modal({ title: `${P.icon} ${P.name}`, body });
    return pop;
  }
  // a Talk row for whoever works the counter
  function talkRow(key, close) {
    const s = STAFF[key];
    return h('div.menu-row', h('span.mi', Portrait.el(s)), h('div.mn', h('b', `Talk to ${s.name}`), h('small', 'Chat, ask questions, get the local gossip')),
      h('button.btn.sm', { onclick: () => { close(); Chat.open(Crowd.staff(key)); } }, '💬 Talk'));
  }
  function sleepMenu(options, label) {
    const st = App.state;
    const body = h('div', needBars());
    const list = h('div.menu-list'); body.append(list);
    let any = false;
    for (const id of options) {
      const L = LODGING[id];
      if (L.item && !App.has(L.item)) {
        list.append(h('div.menu-row.dim', h('span.mi', L.icon), h('div.mn', h('b', L.name), h('small', `You don't own one yet. Buy the ${ITEMS[L.item].name} at Lucky Strike Outfitters.`))));
        continue;
      }
      any = true;
      const early = !Career.bedtimeOk();
      list.append(h('div.menu-row', h('span.mi', L.icon), h('div.mn', h('b', L.name), h('small', early ? `It's ${clockText()}: too early for bed. Come back after 6 PM, or once you're properly tired.` : L.text)),
        h('button.btn.sm.primary', { disabled: early || L.cost > st.bank, onclick: async () => { pop.close(); await Career.sleep(id); } }, L.cost ? `Sleep · ${fmt(L.cost)}` : 'Sleep')));
      if (L.nap != null && Career.needsOn() && !st.today.nap) list.append(h('div.menu-row', h('span.mi', '💤'), h('div.mn', h('b', 'Nap for two hours'), h('small', 'Takes the edge off tiredness without ending the day. Once a day. Handy before a night at the Salon.')),
        h('button.btn.sm', { disabled: (L.nap || 0) > st.bank, onclick: async () => { pop.close(); await Career.nap(id); } }, L.nap ? `Nap · ${fmt(L.nap)}` : 'Nap')));
    }
    if (options.includes('motel')) { const lb = Mystery.lockboxRow(() => pop.close()); if (lb) list.append(lb); }
    const desk = STAFF_AT[options.find(o => STAFF_AT[o])]; if (desk) list.append(talkRow(desk, () => pop.close()));
    if (!any) body.append(h('p.muted.small', 'Nowhere to sleep here yet.'));
    body.append(h('p.muted.small', `Sleeping ends day ${st.day}: loan interest compounds, rent is due, and your players club pays out. You wake about ${options.includes('bench') ? 6 : 8} hours after you go to bed, so a late night costs you the morning.`));
    const pop = UI.modal({ title: `🛏️ ${label}`, body });
    return pop;
  }

  /* ---------- HUD bits ---------- */
  function updateGoal() {
    if (!S) return;
    const e = App.state.event, ev = S.root.querySelector('.w-event');
    ev.textContent = e && e.day === App.state.day ? `🎉 ${EVENTS[e.id].name} · ${VENUES[e.venue].name}` : '';
    const st = App.state, ch = CHAPTERS[st.chapter], el = S.root.querySelector('.w-goal');
    el.textContent = st.mode === 'career' && ch ? `📖 ${ch.title}` : '🎲 Free Play';
    el.title = ch ? ch.goalText : '';
  }
  function areaName() {
    const m = S.m, p = S.p;
    if (m.venue) return VENUES[m.venue].name;
    const a = m.areas.find(a => p.x >= a.x && p.x < a.x + a.w && p.y >= a.y && p.y < a.y + a.h);
    return a ? a.name : '';
  }
  function showArea(force) {
    const n = areaName();
    if (n === S.area && !force) return;
    S.area = n;
    const el = S.root.querySelector('.w-area'); el.textContent = n;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  /* ---------- frame loop ---------- */
  function wander(m, now) {
    for (const n of m.npcs) {
      if (!n.wander) continue;
      if (n.moving) { const k = (now - n.moving.t0) / 260; if (k >= 1) n.moving = null; continue; }
      if (!n.next) n.next = now + 800 + Math.random() * 2500;
      if (now < n.next) continue;
      n.next = 0;
      const d = RNG.pick(Object.keys(DIRS)), [dx, dy] = DIRS[d], nx = n.x + dx, ny = n.y + dy;
      n.dir = d;
      if (Math.abs(nx - n.home[0]) + Math.abs(ny - n.home[1]) > 4) continue;
      const t = m.at(nx, ny);
      if (m.solid(nx, ny) || npcAt(m, nx, ny) || (nx === S.p.x && ny === S.p.y) || m.doors[nx + ',' + ny] || ![G.WALK, G.GRASS, G.FLOWERS, G.PLANK].includes(t)) continue;
      n.moving = { fx: n.x, fy: n.y, t0: now }; n.x = nx; n.y = ny;
    }
  }

  function loop(now) {
    if (!S) return;
    if (S.busy && !document.querySelector('.modal-bg')) { S.busyIdle = S.busyIdle || now; if (now - S.busyIdle > 2500) { S.busy = false; S.busyIdle = 0; } } else S.busyIdle = 0;
    S.raf = requestAnimationFrame(loop);
    const p = S.p, m = S.m;
    if (p.moving) {
      const k = Math.min(1, (now - p.moving.t0) / p.moving.dur);
      p.fx = p.moving.fx + (p.moving.tx - p.moving.fx) * k; p.fy = p.moving.fy + (p.moving.ty - p.moving.fy) * k;
      p.frame = Math.floor(now / 120);
      if (k >= 1) { p.moving = null; p.fx = p.x; p.fy = p.y; arrive().then(() => { }); }
    } else if (!S.busy && !document.querySelector('.modal-bg')) {
      if (S.wantA) { const w = S.wantA; S.wantA = 0; if (now - w < 600) interact(); else tryMove(now); }
      else tryMove(now);
    }
    if (!p.moving) { p.fx = p.x; p.fy = p.y; }
    wander(m, now);
    draw(now);
    const f = !p.moving && !S.busy ? facing() : null;
    const pr = S.root.querySelector('.w-prompt');
    const txt = f ? (f.kind === 'table' ? `${f.label} · ${fmt(VENUES[m.venue].limits.min)}–${fmt(VENUES[m.venue].limits.max, { short: true })}` : f.label) : '';
    if (pr.dataset.t !== txt) { pr.dataset.t = txt; pr.innerHTML = ''; if (txt) pr.append(f.kind === 'table' && GameArt.has(f.game) ? GameArt.el(f.game, 'ga-pr') : '', h('span', txt), h('kbd', 'A')); pr.classList.toggle('show', !!txt); }
  }

  function draw(now) {
    const { c, cv, m, p, u } = S, TS = T * u;
    c.imageSmoothingEnabled = false;
    c.fillStyle = m.id === 'town' ? '#2d6aa8' : '#000'; c.fillRect(0, 0, cv.width, cv.height);
    // camera centred on the player, clamped to the map
    const vw = cv.width / TS, vh = cv.height / TS;
    let cx = p.fx + 0.5 - vw / 2, cy = p.fy + 0.5 - vh / 2;
    cx = m.w <= vw ? (m.w - vw) / 2 : clamp(cx, 0, m.w - vw);
    cy = m.h <= vh ? (m.h - vh) / 2 : clamp(cy, 0, m.h - vh);
    const ox = -cx * TS, oy = -cy * TS;
    if (m.id !== 'town') backdrop(c, cv, m, u, ox, oy, TS); // the room's own wallpaper round it, not a black void
    c.drawImage(m.canvas, Math.round(ox), Math.round(oy), m.w * TS, m.h * TS);
    const sx = x => ox + x * TS, sy = y => oy + y * TS;
    // animated bits
    const blink = Math.floor(now / 400) % 2;
    for (const b of m.buildings) if (['spur', 'palace', 'salon', 'motel'].includes(b.style)) {
      const roofH = Math.max(2, Math.round(b.h * 0.42));
      for (let i = 0; i < b.w * 2; i++) { c.fillStyle = (i + blink) % 2 ? '#fff3b0' : '#e0a030'; c.fillRect(sx(b.x + i / 2 + .2), sy(b.y + roofH) - 2 * u, 2 * u, 2 * u); }
    }
    if (m.id === 'town') { // water glints
      for (let i = 0; i < 18; i++) { const wx = 48 + ((i * 7 + Math.floor(now / 900)) % 8), wy = (i * 5 + Math.floor(now / 1300)) % 42; c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(sx(wx) + 3 * u, sy(wy) + 6 * u, 5 * u, u); }
      const smoke = (now / 40) % 30; c.fillStyle = 'rgba(220,220,220,.5)'; c.beginPath(); c.arc(sx(49.7), sy(14) - smoke * u, (3 + smoke / 6) * u, 0, 7); c.fill();
    }
    for (const pr of m.props) if (pr.type === 'slot') { c.fillStyle = ['#ff4d4d', '#ffe066', '#4dff88'][(Math.floor(now / 250) + pr.y) % 3]; c.fillRect(sx(pr.x) + 5 * u, sy(pr.y) + 5 * u, 6 * u, 3 * u); }
    // people, sorted by row so overlaps look right
    const people = m.npcs.map(n => {
      let fx = n.x, fy = n.y, fr = 0;
      if (n.moving) { const k = Math.min(1, (now - n.moving.t0) / 260); fx = n.moving.fx + (n.x - n.moving.fx) * k; fy = n.moving.fy + (n.y - n.moving.fy) * k; fr = Math.floor(now / 130); }
      return { fx, fy, dir: n.dir, fr, look: n.look, story: n.story, rival: n.rival };
    });
    people.push({ fx: p.fx, fy: p.fy, dir: p.dir, fr: p.moving ? p.frame : 0, look: playerLook(), me: true });
    people.sort((a, b) => a.fy - b.fy);
    for (const q of people) {
      // an inked outline first, so people read clearly against busy floors
      for (const [ox2, oy2] of [[-.6, 0], [.6, 0], [0, -.6], [0, .6]]) drawPerson(c, sx(q.fx) + ox2 * u, sy(q.fy) - 3 * u + oy2 * u, u, q.dir, q.fr, q.look, 'rgba(14,10,8,.75)');
      drawPerson(c, sx(q.fx), sy(q.fy) - 3 * u, u, q.dir, q.fr, q.look);
      if (q.rival) { c.fillStyle = '#ff6b6b'; c.font = `bold ${6 * u}px sans-serif`; c.textAlign = 'center'; c.fillText('♦', sx(q.fx + .5), sy(q.fy) - 4 * u + Math.sin(now / 260) * u); }
      if (q.story) { c.fillStyle = '#ffe066'; c.font = `bold ${7 * u}px sans-serif`; c.textAlign = 'center'; c.fillText('!', sx(q.fx + .5), sy(q.fy) - 4 * u + Math.sin(now / 200) * u); }
    }
    for (const c0 of m.caseSpots || []) { // something worth a closer look
      if (c0.board) { // a dartboard on the wall, with an oche line on the floor
        const bx = sx(c0.x + .5), by = sy(c0.y + .45);
        c.fillStyle = '#111'; c.beginPath(); c.arc(bx, by, 6.5 * u, 0, 7); c.fill();
        for (let i = 0; i < 20; i++) { c.fillStyle = i % 2 ? '#efe0bf' : '#1c1c1c'; c.beginPath(); c.moveTo(bx, by); c.arc(bx, by, 5.2 * u, i * Math.PI / 10, (i + 1) * Math.PI / 10); c.fill(); }
        c.strokeStyle = '#c8102e'; c.lineWidth = u; c.beginPath(); c.arc(bx, by, 4.8 * u, 0, 7); c.stroke(); c.strokeStyle = '#0b7a3b'; c.beginPath(); c.arc(bx, by, 2.8 * u, 0, 7); c.stroke();
        c.fillStyle = '#c8102e'; c.beginPath(); c.arc(bx, by, 1 * u, 0, 7); c.fill();
        c.fillStyle = 'rgba(240, 210, 120, .7)'; c.fillRect(sx(c0.x) - 4 * u, sy(c0.y + 2) - u, 24 * u, 1.2 * u);
        continue;
      }
      if (c0.door) { c.fillStyle = '#2a170a'; c.fillRect(sx(c0.x) + 2 * u, sy(c0.y) - 6 * u, 12 * u, 22 * u); c.fillStyle = '#c9a14a'; c.fillRect(sx(c0.x) + 11 * u, sy(c0.y) + 6 * u, 2 * u, 2 * u); c.fillStyle = '#ffe9a8'; c.font = `bold ${7 * u}px sans-serif`; c.textAlign = 'center'; c.fillText(c0.glyph || '♠', sx(c0.x + .5), sy(c0.y) + 2 * u); continue; }
      if (c0.hidden) { // a fragment: only the faintest glint, once every few seconds
        const ph = ((now + c0.x * 997 + c0.y * 331) % 5200) / 5200; if (ph > .12) continue;
        const a = Math.sin(ph / .12 * Math.PI), cx0 = sx(c0.x + .5), cy0 = sy(c0.y + .55), r = (1 + a * 2.5) * u;
        c.fillStyle = `rgba(255, 255, 255, ${a * .85})`; c.fillRect(cx0 - r, cy0 - u / 3, r * 2, u * .7); c.fillRect(cx0 - u / 3, cy0 - r, u * .7, r * 2);
        continue;
      }
      const tw = Math.sin(now / 180 + c0.x) * .5 + .5;
      c.fillStyle = `rgba(255, 236, 140, ${.45 + tw * .5})`;
      const cx0 = sx(c0.x + .5), cy0 = sy(c0.y + .5), r = (2 + tw * 2) * u;
      c.fillRect(cx0 - r, cy0 - u / 2, r * 2, u); c.fillRect(cx0 - u / 2, cy0 - r, u, r * 2);
    }
    if (m.venue || m.room) { // inside: warm light pooled over the tables and the counters, and the corners in shadow
      c.save(); c.globalCompositeOperation = 'lighter';
      const pool = (x, y, r, a, col = '255,200,120') => { const g = c.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r * TS); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(sx(x - r), sy(y - r), 2 * r * TS, 2 * r * TS); };
      for (const tb of m.tables) pool(tb.x + tb.w / 2, tb.y + tb.h / 2, 3.2, .1 + .02 * Math.sin(now / 900 + tb.x));
      if (m.venue) pool(3, 7, 3.5, .1, '255,170,90');
      for (const pr of m.props) if (pr.type === 'furn' && (pr.kind === 'jukebox' || pr.kind === 'tv')) pool(pr.x + .5, pr.y + .5, 2, .14, pr.kind === 'tv' ? '120,190,255' : '255,120,200');
      c.restore();
      const vg = c.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .35, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); c.fillStyle = vg; c.fillRect(0, 0, cv.width, cv.height);
    }
    if (m.id === 'town') { // the sky follows the in-game clock
      const t = (App.state.clock || 540) % 1440, dark = t >= 1260 || t < 300 ? .42 : t >= 1140 ? (t - 1140) / 120 * .42 : t < 420 ? (420 - t) / 120 * .42 : 0;
      if (dark > 0) {
        c.fillStyle = `rgba(10, 16, 48, ${dark})`; c.fillRect(0, 0, cv.width, cv.height);
        // doorways glow when the place behind them is open; closed ones stay dark
        for (const [k, d] of Object.entries(m.doors)) {
          const key = d.room || d.venue; if (!key || !openNow(key) || (d.venue === 'salon' && !isNight() && Career.needsOn())) continue;
          const [x, y] = k.split(',').map(Number), g = c.createRadialGradient(sx(x + .5), sy(y + .5), 0, sx(x + .5), sy(y + .5), 1.6 * TS);
          g.addColorStop(0, `rgba(255, 200, 110, ${dark * 1.1})`); g.addColorStop(1, 'rgba(255,200,110,0)'); c.fillStyle = g; c.fillRect(sx(x - 1.5), sy(y - 1.5), 4 * TS, 4 * TS);
        }
        // lit windows: warm at night, most of them, and a few that stay dark
        for (const b of m.buildings) for (const [wx, wy] of b.wins || []) { if (hash(wx, wy, 5) < .25) continue; c.fillStyle = `rgba(255, 214, 130, ${Math.min(.85, dark * 1.9)})`; c.fillRect(ox + wx * u, oy + wy * u, 10 * u, 9 * u); const g = c.createRadialGradient(ox + (wx + 5) * u, oy + (wy + 5) * u, 0, ox + (wx + 5) * u, oy + (wy + 5) * u, 14 * u); g.addColorStop(0, `rgba(255,200,110,${dark * .5})`); g.addColorStop(1, 'rgba(255,200,110,0)'); c.fillStyle = g; c.fillRect(ox + (wx - 9) * u, oy + (wy - 9) * u, 28 * u, 28 * u); }
        for (const pr of m.props) if (pr.type === 'lamp') { const g = c.createRadialGradient(sx(pr.x + .5), sy(pr.y + .2), 0, sx(pr.x + .5), sy(pr.y + .2), 2.5 * TS); g.addColorStop(0, `rgba(255, 220, 120, ${dark * .9})`); g.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = g; c.fillRect(sx(pr.x - 2), sy(pr.y - 2), 5 * TS, 5 * TS); }
      }
    }
    // signs and labels (crisp text at screen resolution)
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const fs = Math.max(9 * S.dpr, 3.6 * u);
    for (const b of m.buildings) {
      const roofH = Math.max(2, Math.round(b.h * 0.42));
      c.font = `bold ${fs}px "Trebuchet MS", sans-serif`;
      c.fillStyle = '#fff'; c.fillText(b.name, sx(b.x + b.w / 2), sy(b.y + roofH) + 8.5 * u);
      const locked = { spur: 'spur', palace: 'palace', salon: 'salon' }[b.key];
      if (locked && !Career.venueOpen(locked)) { c.font = `${fs * 1.1}px sans-serif`; c.fillText('🔒', sx(b.x + b.door + .5), sy(b.y + b.h - 1.6)); }
    }
    if (m.id === 'town') {
      c.font = `bold ${fs}px "Trebuchet MS", sans-serif`; c.fillStyle = '#fff';
      c.fillText("LUCKY LOU'S", sx(51.5), sy(17.4)); c.fillText('RIVERBOAT', sx(51.5), sy(18.1));
      if (!Career.venueOpen('riverboat')) c.fillText('🔒', sx(47.5), sy(18.4));
    }
    for (const tb of m.tables) {
      const g = GAMES[tb.game];
      c.font = `bold ${fs * .95}px "Trebuchet MS", sans-serif`;
      // a drawn crest beside the game's name, once its image has loaded
      const art = GameArt.img(tb.game), ic = art ? fs * 1.25 : 0, gap = art ? 3 * u : 0;
      const label = art ? g.name.replace("Ultimate Texas Hold'em", "Ultimate Hold'em") : `${g.icon} ${g.name.replace("Ultimate Texas Hold'em", "Ultimate Hold'em")}`;
      const tw = c.measureText(label).width + 6 * u + ic + gap, cx0 = sx(tb.x + tb.w / 2), top = sy(tb.y + tb.h) + 1 * u;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(cx0 - tw / 2, top, tw, fs * 1.4);
      if (art) c.drawImage(art, cx0 - tw / 2 + 3 * u - ic * .05, top + fs * .7 - ic / 2, ic, ic);
      c.fillStyle = '#ffe9a8'; c.fillText(label, cx0 + (ic + gap) / 2, top + fs * .72);
    }
    for (const L of m.labels) {
      if (L.street) continue;
      const acc = (m.theme && m.theme.accent) || '#ffe9a8';
      c.font = `bold ${fs * 1.5}px Georgia, serif`;
      c.shadowColor = acc; c.shadowBlur = L.neon === false ? 0 : 8 * S.dpr * (blink ? 1 : .6);
      c.fillStyle = acc; c.fillText(L.text, sx(L.x), sy(L.y));
      c.shadowBlur = 0;
    }
  }

  // the whole town at a glance, with a you-are-here marker
  function townMap() {
    const m = getMap('town'), wpx = Math.min(innerWidth - 48, 640), k = wpx / (m.w * T);
    const cv = h('canvas.town-map'); cv.width = Math.round(m.w * T * k * 2); cv.height = Math.round(m.h * T * k * 2); cv.style.width = wpx + 'px';
    const c = cv.getContext('2d'), z = k * 2;
    c.imageSmoothingEnabled = false; c.drawImage(m.canvas, 0, 0, cv.width, cv.height);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const tag = (text, x, y) => { c.font = `bold ${Math.max(10, 7.5 * z)}px "Trebuchet MS", sans-serif`; const tw = c.measureText(text).width + 8; c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(x - tw / 2, y - 9 * Math.max(1, z / 2), tw, 18 * Math.max(1, z / 2)); c.fillStyle = '#ffe9a8'; c.fillText(text, x, y); };
    for (const b of m.buildings) tag(b.name.replace("Lucky Strike Outfitters", 'Outfitters').replace("Vinnie's Pawn & Loan", "Vinnie's").replace('Downtown Apartments', 'Apartments'), (b.x + b.w / 2) * T * z, (b.y + b.h / 2) * T * z);
    tag('Riverboat', 51.5 * T * z, 19 * T * z); tag('Lucky Park', 8 * T * z, 39.5 * T * z);
    // where you are: here in town, or the door of the building you're inside
    let px = null, py = null;
    if (S && S.m.id === 'town') { px = S.p.x; py = S.p.y; }
    else if (App.state.world.returnTo) [px, py] = App.state.world.returnTo;
    if (px != null) { c.fillStyle = '#ff5252'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc((px + .5) * T * z, (py + .5) * T * z, 7 * Math.max(1, z / 1.5), 0, 7); c.fill(); c.stroke(); }
    UI.modal({ title: '🗺️ Town map', wide: true, body: h('div.town-map-wrap', cv, h('p.muted.small', '🔴 You are here. Walk through any door to go inside: every building has people to meet and things to find.')) });
  }
  function clock() { return App.state.clock || 540; }
  function isNight() { const t = clock() % 1440; return t >= 1200 || t < 360; }
  function clockText() { const t = Math.floor(clock()) % 1440; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  // where a fragment is hidden, in the words somebody in town would use: the building it's in, or what it's near outside
  function fragWhere(i) {
    const k = FRAGMENTS[i]; if (!k) return 'somewhere in town';
    if (k.map.startsWith('v:')) return 'somewhere inside ' + ((VENUES[k.map.slice(2)] || {}).name || 'one of the casinos');
    if (k.map.startsWith('r:')) return 'somewhere inside ' + ((ROOMS[k.map.slice(2)] || {}).name || 'one of the buildings');
    const m = getMap('town'), fixed = Mystery.spots(m).concat(Holdem.spots(m), Darts.spots(m), SalQuest.spots(m)), sp = keepSpots(m, fixed).find(q => q.keep === i);
    if (!sp) return 'out on the streets somewhere';
    let near = null, nd = 1e9;
    for (const d in m.doors) { const [dx, dy] = d.split(',').map(Number), dd = Math.hypot(dx - sp.x, dy - sp.y); if (dd < nd && m.doors[d].label) { nd = dd; near = m.doors[d].label; } }
    const t = m.at(sp.x, sp.y), on = t === G.GRASS || t === G.FLOWERS ? 'in the grass' : t === G.SAND ? 'down on the riverbank' : t === G.PLANK ? 'out on the boards' : 'on the pavement';
    return `${on}${near ? `${nd < 5 ? ' just outside' : nd < 10 ? ' not far from' : ' a fair walk from'} ${near}` : ''}`;
  }
  // somewhere outside you could plausibly have ended up after a night you don't remember
  function wakeSomewhere() {
    const m = getMap('town'); if (!m.fragCand) keepSpots(m, []);
    const cand = (m.fragCand || []).filter(([x, y]) => [G.WALK, G.GRASS, G.FLOWERS, G.SAND, G.PLANK].includes(m.at(x, y)));
    if (!cand.length) return null;
    const [x, y] = cand[Math.floor(Math.random() * cand.length)], t = m.at(x, y);
    let near = null, nd = 1e9;
    for (const k in m.doors) { const [dx, dy] = k.split(',').map(Number), d = Math.hypot(dx - x, dy - y); if (d < nd && m.doors[k].label) { nd = d; near = m.doors[k].label; } }
    const where = t === G.GRASS || t === G.FLOWERS ? RNG.pick(['face-down in the grass', 'curled up in a flowerbed', 'on your back in the grass, staring at the sky']) : t === G.SAND ? 'half buried in sand on the riverbank' : t === G.PLANK ? 'on the planks of the dock, one shoe missing' : RNG.pick(['on the pavement', 'propped against a lamppost', 'in a doorway', 'flat on the sidewalk']);
    return { x, y, text: `${where}${near ? `${nd < 6 ? ' outside' : ' not far from'} ${near}` : ''}` };
  }
  // put back what belongs on the current map now (a door a side job just opened), without leaving and coming back
  function repopulate() { if (S && S.m) populate(S.m); }
  const enter = (id, x, y, dir) => S ? go(id, x, y, dir) : null;
  const freeze = on => { if (S) { S.busy = !!on; S.keys.clear(); } };
  return { mount, unmount, townMap, wakeSomewhere, fragWhere, repopulate, enter, freeze, drawPerson, openNow, hoursText, refreshGoal: () => updateGoal(), roomName: k => (ROOMS[k] || {}).name || 'indoors', savePos, clock, isNight, clockText, where: () => S && { map: S.m.id, x: S.p.x, y: S.p.y, dir: S.p.dir }, _map: () => S && S.m };
})();
