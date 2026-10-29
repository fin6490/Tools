/* Level 2 places, drawn isometric. The waking world is a real city at night, in the rain, and you
   can walk all of it: St Jude's (the sleep clinic) where you wake, the Meridian casino resort and its
   car park and hotel, Calder Street and the house that used to be yours, the Low Tide bar, Rosie's
   diner and the Kwik Mart, the police station, St Brigid's chapel, the park, the river, and
   Greenhill cemetery. Most buildings have an inside.
   Every builder lays out one place and returns where you start and its named entrances; anything you
   can use calls L2.act(name, arg), so the story decides what happens. */
const L2World = (() => {
  const act = (name, arg) => () => L2.act(name, arg);
  const has = k => () => L2.has(k);
  const S = () => L2.state;

  /* ---------- shared pieces ---------- */
  // an indoor room: floor, the two back walls, and a lit exit at the front edge
  function room(A, mk, w, h, o) {
    mk(w, h, o.floor || 'lino');
    A.wall(0, 0, w, 'n', { style: o.wall || 'plaster', height: o.height || 2.8, hang: o.hangN || [], stripes: o.stripes });
    A.wall(0, 0, h, 'w', { style: o.wall || 'plaster', height: o.height || 2.8, hang: o.hangW || [], stripes: o.stripes });
  }
  // a way out at the front edge of a room: a doormat, a glowing sign, and the walk-through
  function exit(A, x, y, label, fn, side = 's') {
    A.decal(x, y, (c) => { c.fillStyle = 'rgba(232,213,160,.18)'; c.beginPath(); c.moveTo(0, 4); c.lineTo(26, 17); c.lineTo(0, 30); c.lineTo(-26, 17); c.closePath(); c.fill(); c.fillStyle = 'rgba(232,213,160,.8)'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(side === 's' ? '↓' : '↘', 0, 21); });
    A.use(x + .5, y + .5, label, fn, { r: 1.4 });
  }
  const dealer = (x, y, face = 1, o = {}) => ({ x, y, face, skin: '#e0b090', hair: '#1a1210', coat: '#111', pants: '#111', shirt: '#f4f4f4', tie: '#c9a14a', ...o });
  const place = (A, id, x, y, o) => L2People.place(A, id, x, y, o);
  const lamp = (A, x, y, col = '#ffb45a') => { A.prop('lamp', x, y, { color: col }); A.light(x + .5, y, { r: 5.5, color: col, i: .95 }); };

  /* ======================= the city ======================= */
  // The city is laid out on a 72 x 66 plan, then stretched as it's built: every road becomes two
  // full lanes (4 tiles, so cars pass without overlapping) and the pavement either side of it 3 tiles
  // wide, so there's room to walk. SEG: from each coordinate on the plan, how much each tile stretches.
  const SEG = [[0, 1], [23, 1.5], [25, 2], [27, 1.5], [29, 1], [49, 1.5], [51, 2], [53, 1.5], [55, 1]];
  const ST = v => { if (v <= 0) return v; let out = 0; for (let i = 0; i < SEG.length; i++) { const [a, k] = SEG[i], b = i + 1 < SEG.length ? SEG[i + 1][0] : Infinity; if (v <= a) break; out += (Math.min(v, b) - a) * k; } return out; };
  const STi = v => Math.round(ST(v));
  // the build API, seen through the stretch
  function stretched(A) {
    const S2 = Object.create(A), rect = (x, y, w, h) => { const x0 = STi(x), y0 = STi(y); return [x0, y0, STi(x + w) - x0, STi(y + h) - y0]; };
    S2.floor = (x, y, w, h, kind) => A.floor(...rect(x, y, w, h), kind);
    S2.solid = (x, y, w = 1, h = 1) => A.solid(...rect(x, y, w, h));
    S2.block = (x, y, w, h, o = {}) => A.block(...rect(x, y, w, h), o.door ? { ...o, door: [STi(o.door[0]), STi(o.door[1]), o.door[2]] } : o);
    S2.decal = (x, y, draw) => A.decal(ST(x), ST(y), draw);
    S2.prop = (kind, x, y, o = {}) => { const o2 = { ...o }; if (o.len) o2.len = ST(x + o.len) - ST(x); if (kind === 'tape') { o2.x1 = ST(x + o.x1) - ST(x); o2.y1 = ST(y + o.y1) - ST(y); } return A.prop(kind, ST(x), ST(y), o2); };
    S2.use = (x, y, label, fn, o) => A.use(ST(x), ST(y), label, fn, o);
    S2.person = o => A.person({ ...o, x: ST(o.x), y: ST(o.y) });
    S2.light = (x, y, o) => A.light(ST(x), ST(y), o);
    S2.sign = (x, y, text, o = {}) => A.sign(ST(x), ST(y), text, o.depth != null ? { ...o, depth: o.depth + ST(x) - x + ST(y) - y } : o);
    return S2;
  }
  function city(A0, mk) {
    const A = stretched(A0), P2 = pts => pts.map(([x, y]) => [ST(x), ST(y)]);
    const place = (_, id, x, y, o = {}) => L2People.place(A0, id, ST(x), ST(y), o.walk ? { ...o, walk: P2(o.walk) } : o);
    const walker = (_, pts, o) => walkerAt(A0, P2(pts), o), cat = (_, pts) => catAt(A0, P2(pts));
    mk(STi(72), STi(66), 'pavement');
    // roads: Meridian Avenue and Harbour Road across, Calder Street and Ferry Lane down
    const road = (x, y, w, h) => A.floor(x, y, w, h, 'road');
    road(0, 25, 72, 2); road(0, 51, 72, 2); road(25, 0, 2, 58); road(51, 0, 2, 58);
    for (let x = 0; x < 72; x += 3) { if (x < 23 || x > 28 && x < 49 || x > 54) { A.decal(x, 25.9, dash); A.decal(x, 51.9, dash); } }
    for (let y = 0; y < 58; y += 3) { if (y < 23 || y > 28 && y < 49 || y > 54) { A.decal(25.9, y, dashV); A.decal(51.9, y, dashV); } }
    for (const [x, y] of [[23, 25], [27, 25], [49, 25], [53, 25], [23, 51], [27, 51], [49, 51], [53, 51]]) A.decal(x + .1, y + .1, zebra);
    // the river along the bottom, the embankment and its railing
    A.floor(0, 59, 72, 7, 'water'); A.solid(0, 59, 72, 7); A.prop('fence', 0, 58.9, { len: 72 }); L2Life.keeps(A, 'city');
    A.floor(0, 54, 72, 5, 'pavement');
    // a little rain standing everywhere
    for (let i = 0; i < 40; i++) A.prop('puddle', 2 + (i * 37) % 68, 2 + (i * 53) % 55, { r: .6 + (i % 4) * .3, solid: false, depth: -1 });

    // --- St Jude's: the sleep clinic, top left
    A.floor(1, 1, 22, 22, 'concrete');
    A.block(3, 4, 18, 18, { height: 9, style: 'hospital', door: [12, 21, 's'], lit: .55, doorColor: '#e8f4ff' });
    A.sign(12, 22, 'ST JUDE\'S · SLEEP CLINIC', { color: '#bfe6ff', z: 3.4, size: 12, depth: 41.7 });
    A.use(12.5, 23, 'St Jude\'s: the sleep clinic', act('enterClinic'), { r: 1.6 });
    for (const x of [4, 9, 15, 20]) A.prop('tree', x, 23.3);
    A.prop('bench', 7, 23.4); A.prop('bin', 17.5, 23.5);
    // --- the Meridian: casino, hotel tower and car park, top middle
    A.floor(28, 1, 22, 22, 'marble');
    A.block(30, 3, 19, 19, { height: 15, style: 'casino', door: [39, 21, 's'], lit: .55, doorColor: '#ffd98a', id: 'meridian' });
    A.sign(39.5, 22, 'MERIDIAN', { color: '#ffcf6a', z: 4.6, size: 30, font: '600', depth: 70.7 });
    A.sign(39.5, 22, 'CASINO · HOTEL', { color: '#ff5a8a', z: 3.4, size: 10, depth: 70.7 });
    A.use(39.5, 23, 'The Meridian casino', act('toFloor', 'street'), { r: 1.8 });
    A.sign(32, 22, 'CAR PARK ↓', { color: '#9fd3ff', z: 2.6, size: 9, depth: 70.7 });
    A.use(32.5, 23, 'The Meridian car park', act('toGarage', 'street'), { r: 1.6 });
    A.sign(46.5, 22, 'HOTEL', { color: '#e8d7a8', z: 2.8, size: 10, depth: 70.7 });
    A.use(46.5, 23, 'The hotel entrance', act('hotelLift'), { r: 1.6 });
    for (const x of [29, 34, 45, 48]) A.prop('column', x + .5, 22.6, { h: 3.4 });
    A.prop('canopy', 36.5, 21.9, { w: 6, d: 1.5, h: 3 });
    lamp(A, 34, 23.4, '#ffcf8a'); lamp(A, 44, 23.4, '#ffcf8a');
    A.prop('car', 37, 26, { color: '#111', rot: true }); // a limousine at the kerb
    // --- the police station, top right
    A.floor(54, 1, 18, 22, 'concrete');
    A.block(56, 6, 13, 15, { height: 9, style: 'stone', door: [62, 20, 's'], lit: .7, doorColor: '#cfe0ff' });
    A.sign(62.5, 21, 'POLICE', { color: '#7fb2ff', z: 3, size: 13, depth: 90.7 });
    A.use(62.5, 22, 'The police station', act('enter', 'police'), { r: 1.6 });
    A.prop('car', 58, 23, { color: '#e8e8e8', rot: true }); lamp(A, 66, 23.4, '#cfe0ff');

    // --- Calder Street: the houses, yours among them, and the bus shelter across the road
    A.floor(1, 29, 22, 21, 'grass');
    const houses = [[29, 'stucco'], [34, 'brick'], [39, 'brick'], [44, 'stucco']];
    houses.forEach(([y, style], i) => {
      A.block(15, y, 8, 4, { height: 6, style, door: [22, y + 1, 'e'], lit: i === 1 ? 0 : .5, doorColor: i === 1 ? '#1a1410' : '#ffd8a0', id: 'house' + i });
      A.floor(23, y + 1, 1, 1, 'pavement');
    });
    A.sign(23, 35.5, '17', { color: '#e8e2d4', z: 2.4, size: 9, side: 'e' });
    A.prop('tape', 23.2, 33.8, { x0: 0, y0: 0, x1: 0, y1: 3.4, solid: false });
    A.use(23.6, 35.5, '17 Calder Street. Home.', act('house'), { r: 1.6 });
    for (const y of [30, 37, 43]) A.prop('tree', 12, y);
    A.prop('shelter', 28.5, 36.5, { rot: true }); A.use(28.2, 36.5, 'The bus shelter on Calder Street', act('shelter'), { r: 1.6 });
    A.prop('phone', 28.4, 40.5); A.use(28.2, 39.8, 'The payphone', act('payphone'), { r: 1.4 });
    lamp(A, 24, 31, '#ffb45a'); lamp(A, 24, 41, '#ffb45a'); lamp(A, 28, 46, '#ffb45a');
    for (const [y, c] of [[30, '#3a4a3a'], [43, '#6a1e1e'], [47, '#2b3a55']]) A.prop('car', 25.5, y, { color: c }); // parked in the kerb lane

    // --- Harbour Road: the Low Tide, Rosie's diner, the Kwik Mart
    A.floor(28, 29, 22, 21, 'concrete');
    A.block(29, 41, 8, 9, { height: 6, style: 'brick', door: [33, 49, 's'], lit: .3, doorColor: '#ff9a5a', shop: 's', shopColor: '#c8703a', shopKind: 'pub' });
    A.sign(33, 50, 'THE LOW TIDE', { color: '#ff7a3a', z: 3.1, size: 12, depth: 87.7 });
    A.use(33.5, 50.6, 'The Low Tide', act('enter', 'lowtide'), { r: 1.6 });
    A.block(38, 43, 5, 7, { height: 4, style: 'stucco', door: [40, 49, 's'], shop: 's', shopColor: '#ffe9b0', shopKind: 'diner', awning: '#b3222b' });
    A.sign(40.5, 50, 'ROSIE\'S · OPEN ALL NIGHT', { color: '#ff5a8a', z: 2.7, size: 9, depth: 92.7 });
    A.use(40.5, 50.6, 'Rosie\'s diner', act('enter', 'diner'), { r: 1.6 });
    A.block(44, 43, 6, 7, { height: 4, style: 'glass', door: [47, 49, 's'], shop: 's', shopColor: '#d8f0ff', awning: '#1e7a44' });
    A.sign(47, 50, 'KWIK MART 24H', { color: '#5aff9a', z: 2.7, size: 9, depth: 100.7 });
    A.use(47.5, 50.6, 'The Kwik Mart', act('enter', 'shop'), { r: 1.6 });
    A.block(29, 29, 9, 9, { height: 5, style: 'brick', lit: .35, door: [33, 37, 's'], doorColor: '#ffd27a', shop: 's', shopColor: '#e0b060', awning: '#2a4a7a' });
    A.sign(33, 38, 'SULLY\'S PAWN · HARDWARE', { color: '#ffd27a', z: 2.9, size: 10, depth: 75.7 });
    A.use(33.5, 38.6, 'Sully\'s Pawn & Hardware', act('enter', 'pawn'), { r: 1.6 }); A.block(40, 29, 9, 11, { height: 6, style: 'stucco', lit: .4 });
    for (const x of [30, 38, 46]) A.prop('bin', x, 50.3);
    lamp(A, 36, 50.5, '#ffb45a'); lamp(A, 44, 50.5, '#ffb45a');

    // --- St Brigid's chapel and the park
    A.floor(54, 29, 18, 21, 'grass');
    A.block(58, 33, 9, 13, { height: 9, style: 'stone', door: [62, 45, 's'], lit: .8, doorColor: '#ffd8a0' });
    A.sign(62.5, 46, 'ST BRIGID\'S', { color: '#ffe6b0', z: 3.2, size: 10, depth: 112.7 });
    A.use(62.5, 46.6, 'St Brigid\'s chapel', act('enter', 'chapel'), { r: 1.6 });
    for (const [x, y] of [[55, 31], [69, 31], [55, 40], [69, 44], [56, 48], [68, 48]]) A.prop('tree', x, y);
    A.prop('bench', 60, 48.5); A.prop('bench', 65, 48.5);

    // --- Greenhill cemetery, along the river
    A.floor(2, 54, 22, 4, 'grass'); A.prop('fence', 2, 54, { len: 8 }); A.prop('fence', 14, 54, { len: 10 });
    A.sign(12, 54, 'GREENHILL', { color: '#e8e2d4', z: 2.2, size: 9 });
    for (let i = 0; i < 9; i++) A.prop('grave', 4 + i * 2.2, 56.5 + (i % 2) * .6, { h: .8 + (i % 3) * .2 });
    A.use(12, 53.6, 'Greenhill cemetery', act('toCemetery'), { r: 1.6 });
    A.prop('tree', 22, 55.5);
    // the embankment
    for (const x of [34, 46, 58, 66]) lamp(A, x, 57.5, '#ffcf8a');
    A.prop('bench', 40, 57.6); A.use(40.5, 57.2, 'The river', act('river'), { r: 1.6 });

    // people out in the rain, and the life of a city at night
    place(A, 'marcus', 43.2, 23.6, { face: -1 });
    A.prop('newsstand', 30.5, 27.9); place(A, 'ida', 30.5, 27.35, { face: 1, r: 1.4 });
    A.prop('hotdog', 44, 54.6); place(A, 'gus', 44, 54.0, { face: 1, r: 1.5 });
    A.prop('car', 49, 25.5, { color: '#d8a820', rot: true, taxi: true, lights: true }); place(A, 'raj', 49.2, 24.1, { face: -1, hold: 'cig' });
    place(A, 'shona', 31, 50.4, { face: 1 });
    place(A, 'danny', 2, 27.6, { walk: [[2, 27.6], [22, 27.6], [22, 24.2], [50, 24.2], [50, 27.6], [28, 27.6]], speed: 1 });
    place(A, 'carla', 24.4, 30, { walk: [[24.4, 30], [24.4, 49.5], [36, 50.3], [24.4, 49.5]], speed: 1.25 });
    place(A, 'pete', 30, 53.6, { walk: [[30, 53.6], [70, 53.6]], speed: 1 });
    walker(A, [[53.6, 30], [53.6, 50]], { coat: '#1f2a3a', skin: '#f0c9a8', hair: '#999', glasses: true, hold: 'umbrella', umbrella: '#203a5a' });
    walker(A, [[2, 24.3], [20, 24.3]], { coat: '#3a3f4a', skin: '#e0b090', hair: '#222', hat: 'fedora', coatLen: 'long' });
    cat(A, [[16, 52], [21, 52.6], [23, 48], [18, 50.5]]);
    for (const [x, y] of [[26, 40], [52, 12], [12, 52], [40, 25.6]]) A.prop('steam', x, y, { solid: false });
    for (const [x, y] of [[30.6, 50.6], [46.2, 50.6], [37.5, 38.2]]) A.prop('bags', x, y, { solid: false });
    A.prop('mailbox', 27.6, 33.5); A.prop('stopsign', 28.6, 34.6); A.prop('trafficlight', 23.6, 24.4); A.prop('trafficlight', 53.6, 24.4); A.prop('trafficlight', 27.6, 50.4); A.prop('trafficlight', 50.4, 53.4);
    traffic(A0, ST);
    // the dark: a little light from windows, more from the streetlamps
    return { spawn: [ST(12.5), ST(23.6), 0], entries: { hospital: [ST(12.5), ST(23.6), 0], casino: [ST(39.5), ST(23.7), 0], garage: [ST(32.5), ST(23.7), 0], hotel: [ST(46.5), ST(23.7), 0], police: [ST(62.5), ST(22.6), 0], house: [ST(24), ST(35.5), 0], lowtide: [ST(33.5), ST(50.7), 0], pawn: [ST(33.5), ST(38.8), 0], diner: [ST(40.5), ST(50.7), 0], shop: [ST(47.5), ST(50.7), 0], chapel: [ST(62.5), ST(46.7), 0], cemetery: [ST(12.5), ST(53.4), 0] },
      rain: true, dark: .62, bg: '#05070c', name: 'the city' };
  }
  const dash = c => { c.fillStyle = 'rgba(220,210,170,.35)'; c.beginPath(); c.moveTo(0, 15); c.lineTo(20, 25); c.lineTo(17, 26.5); c.lineTo(-3, 16.5); c.fill(); };
  const dashV = c => { c.fillStyle = 'rgba(220,210,170,.35)'; c.beginPath(); c.moveTo(0, 15); c.lineTo(-20, 25); c.lineTo(-17, 26.5); c.lineTo(3, 16.5); c.fill(); };
  const zebra = c => { c.fillStyle = 'rgba(230,230,230,.3)'; for (let i = 0; i < 4; i++) { c.save(); c.translate(-24 + i * 14, 10 + i * 7); c.fillRect(0, 0, 8, 16); c.restore(); } };
  // a black cat with somewhere to be
  function catAt(A, pts) {
    const t = A.prop('cat', pts[0][0], pts[0][1], { solid: false }); let i = 1, wait = 0; t.dir = 1;
    const u = A.use(t.x, t.y, 'A black cat', () => L2.act('cat'), { r: 1.2 });
    A.every((tt, dt) => { u.x = t.x; u.y = t.y; if (wait > 0) { wait -= dt; return; } const [tx, ty] = pts[i], dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy); if (d < .1) { i = (i + 1) % pts.length; wait = 2 + Math.random() * 6; return; } t.x += dx / d * .9 * dt; t.y += dy / d * .9 * dt; t.dir = dx - dy >= 0 ? 1 : -1; });
  }
  // cars going by on the avenues, headlights first, slowing for you if you're in the road
  function traffic(A, ST) { // one lane each way, a lane's width apart
    const W = ST(72) + 2, c1 = ST(26), c2 = ST(52);
    const lanes = [{ y: c1 - 1, dir: -1, x0: W, x1: -4 }, { y: c1 + 1, dir: 1, x0: -4, x1: W }, { y: c2 - 1, dir: -1, x0: W, x1: -4 }, { y: c2 + 1, dir: 1, x0: -4, x1: W }];
    const cols = ['#2b3a55', '#6b6b6b', '#7a1e1e', '#1c1c1c', '#3f5a3a', '#d8a820', '#e0e0e0'];
    lanes.forEach((L, k) => {
      const car = A.prop('car', L.x0 + (k * 23) % 60 * L.dir, L.y, { color: cols[k % cols.length], rot: true, lights: true, rev: L.dir < 0, solid: false, taxi: k === 2 });
      const head = A.light(car.x, car.y, { r: 3.4, color: '#fff2c0', i: .8 }), tail = A.light(car.x, car.y, { r: 1.6, color: '#ff3030', i: .6 });
      let wait = k * 4;
      A.every((t, dt) => {
        if (wait > 0) { wait -= dt; car.hidden = true; return; } car.hidden = false;
        const P = R3.player, ahead = (P.x - car.x) * L.dir, inLane = Math.abs(P.y - L.y) < 1.2 && ahead > 0 && ahead < 4.5;
        if (!inLane) car.x += L.dir * 7 * dt;
        car.box = [car.x - 2.1, car.y - .9, car.x + 2.1, car.y + .9];
        head.x = car.x + L.dir * 3; head.y = car.y; tail.x = car.x - L.dir * 2.3; tail.y = car.y;
        if ((L.dir > 0 && car.x > L.x1) || (L.dir < 0 && car.x < L.x1)) { car.x = L.x0; car.o.color = cols[(Math.random() * cols.length) | 0]; car.o.taxi = Math.random() < .25; wait = 3 + Math.random() * 10; }
      });
    });
  }
  // someone walking up and down in the rain
  function walkerAt(A, pts, o) {
    const p = A.person({ x: pts[0][0], y: pts[0][1], face: 1, ...o }); p.foot = null; let i = 1, wait = 0;
    A.every((t, dt) => {
      if (wait > 0) { wait -= dt; return; }
      const [tx, ty] = pts[i], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d < .1) { i = (i + 1) % pts.length; wait = 1 + Math.random() * 3; p.o.walking = 0; return; }
      p.x += dx / d * 1.2 * dt; p.y += dy / d * 1.2 * dt; p.face = (dx - dy) >= 0 ? 1 : -1; p.o.back = dx + dy < 0; p.o.walking = t;
    });
  }

  /* ======================= St Jude's sleep clinic ======================= */
  function clinic(A, mk) {
    room(A, mk, 12, 10, { floor: 'lino', wall: 'hospital', hangN: [{ kind: 'window', at: 6, w: 3, y: 1, h: 1.4 }], hangW: [{ kind: 'picture', at: 6, w: 1, y: 1.3, h: .8, color: '#f6f4ee', label: 'OCT 17', labelColor: '#b3222b' }] });
    A.prop('bed', 1, 1, { sheet: '#cfe0ee' }); A.use(1.8, 2.6, 'The bed you woke up in', act('clinicBed'), { r: 1.6 });
    A.prop('desk', 1, 4.2, { w: .6, d: .5, screen: true }); A.prop('plant', 11, 1);
    A.person({ x: 5.5, y: 3.5, face: -1, skin: '#6b4430', hair: '#1a1210', coat: '#eef1f3', pants: '#2c3440', glasses: true, shirt: '#4a6b8a', labCoat: true, bun: true });
    A.use(5.5, 3.5, 'Talk to Dr. Okafor', act('okafor'), { r: 1.8 });
    A.prop('desk', 8, 6.5, { w: 1.6, d: .8, lamp: true }); A.use(8.8, 7, 'Your discharge folder', act('folder'));
    A.prop('cooler', 10.6, 3); A.use(10, 3, 'Water cooler', act('cooler'), { r: 1.3 });
    A.prop('counter', 10, 6.4, { w: 1.4, d: .6, color: '#c8ccd0', top: '#e8ecef' }); A.use(10.4, 7.4, 'A pot of coffee', act('coffee'), { r: 1.2 });
    A.prop('chair', 3.5, 6); A.prop('ivstand', 3, 1.4); A.prop('monitor', 3.6, 1.2); place(A, 'adeyemi', 9, 5, { face: -1 });
    A.prop('bed', 1, 7, { sheet: '#cfe0ee' }); A.prop('plant', 11, 8.6); A.prop('radiator', 6.2, .1, { w: 2.4 }); L2Life.keeps(A, 'clinic');
    exit(A, 5, 9, 'Out into the city', act('leaveClinic'));
    A.light(5, 4, { r: 9, color: '#eef4ff', i: .9 });
    return { spawn: [2.6, 3.6, 0], entries: { street: [5.5, 8.4, 0] }, dark: .2, bg: '#0c0f12', soft: false, name: 'St Jude\'s' };
  }

  /* ======================= the Meridian car park ======================= */
  function garage(A, mk) {
    room(A, mk, 20, 14, { floor: 'concrete', wall: 'concrete', height: 3, hangN: [{ kind: 'door', at: 1.7, w: 1.6, y: 0, h: 2.3, color: '#9aa1a8', label: 'LIFT · CASINO', labelColor: '#e8d7a8' }] });
    for (const x of [4.5, 10.5, 16.5]) for (const y of [5.5, 9.5]) A.prop('pillar', x, y, { h: 3, color: '#6a6e74' });
    // a row of bays along the back wall, 3 m wide; the first one, by the ramp, is kept clear for the lift
    const iso = c => c.transform(32, 16, -32, 16, 0, 0); // draw on the floor in metres
    A.decal(1, .2, c => { iso(c); c.lineWidth = .06; c.strokeStyle = 'rgba(232,232,225,.55)'; for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(i * 3, 0); c.lineTo(i * 3, 4.4); c.stroke(); } });
    for (let i = 1; i < 6; i++) { A.decal(1.5 + i * 3, 1, c => { c.fillStyle = 'rgba(220,210,190,.6)'; c.font = 'bold 12px Arial'; c.textAlign = 'center'; c.fillText(String(12 + i), 0, 22); }); }
    A.decal(1.15, .25, c => { // the lift bay: yellow box, hatching, and a no-parking roundel painted on the floor
      iso(c); c.save(); c.beginPath(); c.rect(0, 0, 2.7, 4.3); c.clip();
      c.strokeStyle = 'rgba(226,182,40,.55)'; c.lineWidth = .14; for (let k = -5; k < 8; k += .7) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 4.3, 4.3); c.stroke(); }
      c.restore(); c.strokeStyle = 'rgba(232,190,50,.8)'; c.lineWidth = .1; c.strokeRect(0, 0, 2.7, 4.3);
      c.fillStyle = '#1b3f8a'; c.beginPath(); c.arc(1.35, 2.9, .62, 0, 7); c.fill(); c.strokeStyle = '#c62828'; c.lineWidth = .16; c.stroke();
      c.beginPath(); c.moveTo(1.35 - .42, 2.9 - .42); c.lineTo(1.35 + .42, 2.9 + .42); c.stroke();
    });
    const cars = [['#6b6b6b', 5], ['#7a1e1e', 8], ['#e0e0e0', 11], ['#3f5a3a', 14]];
    cars.forEach(([c, x]) => A.prop('car', x + .5, 2.6, { color: c }));
    // yours, bay 17, under a year of dust
    A.prop('car', 17.5, 2.6, { color: '#1c2733', plate: 'MRD 17', lights: true });
    A.use(17.5, 5, 'Open the boot', act('trunk'), { r: 1.5 }); A.use(16.3, 3, 'Sit in your car', act('driverSeat'), { r: 1.3 }); A.use(18.6, 3, 'The glovebox', act('glovebox'), { r: 1.2 });
    for (let i = 0; i < 5; i++) A.prop('car', 2.5 + i * 3.4, 12, { color: ['#1d1d1d', '#3a4252', '#5a4a2a', '#2b3a55', '#6a1e1e'][i] });
    A.prop('vending', 19, 7.5); A.use(18.2, 7.5, 'A vending machine', act('vending'), { r: 1.4 });
    A.use(2.5, .8, 'Take the lift up to the casino', act('toFloor', 'garage'), { r: 1.6 });
    A.prop('counter', 1.4, 9.4, { w: 1.2, d: .9, color: '#3a4250', top: '#5a6270' }); place(A, 'stan', 2, 9, { sit: true, face: 1, r: 1.4 });
    exit(A, 0, 7, 'The ramp up to the street', act('exitGarage'), 'e');
    if (L2.has('moriGarage') && !S().clues.drive) { A.person({ x: 13, y: 7, face: 1, skin: '#e8c4a8', hair: '#111', coat: '#2b2f36', pants: '#1c1f24', longHair: true }); A.use(13, 7, 'Detective Mori', () => L2.act(S().clues.rabbit ? 'password' : 'moriRabbit'), { r: 1.8 }); }
    for (const [x, y] of [[4, 4], [10, 4], [16, 4], [4, 10], [10, 10], [16, 10]]) A.light(x, y, { r: 5, color: '#d8ecff', i: .9, flicker: x === 10 && y === 4 ? .9 : 0 });
    return { spawn: [1.2, 7, 0], entries: { street: [1.2, 7, 0], lift: [2.5, 1.8, 0] }, dark: .6, bg: '#060709', name: 'the car park' };
  }

  /* ======================= the casino floor ======================= */
  function floor(A, mk) {
    room(A, mk, 26, 20, { floor: 'carpet', wall: 'paper', height: 3.6, stripes: true,
      hangN: [{ kind: 'door', at: 2, w: 1.4, y: 0, h: 2.4, color: '#2a1a12', label: 'STAFF ONLY', labelColor: '#ff6a6a' }, { kind: 'picture', at: 10, w: 2.4, y: 1.2, h: 1.8, color: '#3a2a1e', frame: '#c9a14a', draw: valePortrait }, { kind: 'door', at: 19, w: 2, y: 0, h: 2.6, color: '#1a0f14', label: 'THE SALON', labelColor: '#e8d7a8' }],
      hangW: [{ kind: 'door', at: 3, w: 1.6, y: 0, h: 2.4, color: '#9aa1a8', label: 'LIFT · CAR PARK', labelColor: '#cfe0ff' }, { kind: 'door', at: 12, w: 1.6, y: 0, h: 2.4, color: '#b89a5a', label: 'HOTEL LIFT', labelColor: '#e8d7a8' }] });
    A.use(2.7, .8, 'The staff door: The Eye', act('eyeDoor'), { r: 1.4 });
    A.use(11.2, .8, 'A portrait of Augustin Vale', act('portrait'), { r: 1.6 });
    A.use(20, .8, 'The Salon (high limit)', act('salonDoor'), { r: 1.6 });
    A.use(.8, 3.8, 'Lift down to the car park', act('toGarage'), { r: 1.4 });
    A.use(.8, 12.8, 'The hotel lift', act('hotelLift'), { r: 1.4 });
    // the tables: blackjack, roulette, Crazy 4, baccarat, and Tommy watching the pit
    const T = [['bj', 6, 5, 'Sit down at blackjack'], ['bj', 6, 9, 'Sit down at blackjack'], ['roulette', 11, 5, 'Sit down at roulette'], ['c4', 11, 9, 'Sit down at Crazy 4 Poker'], ['bac', 16, 5, 'Sit down at baccarat'],
      ['craps', 20.5, 5, 'Step up to the craps table'], ['uth', 10.5, 13, 'Sit down at Ultimate Texas Hold\'em'], ['tcp', 16.5, 13, 'Sit down at Three Card Poker'], ['lir', 21, 12, 'Sit down at Let It Ride']];
    for (const [g, x, y, label] of T) { A.prop(g === 'roulette' || g === 'craps' ? g : 'bj', x, y); A.person(dealer(x, y - 1, 1)); A.use(x, y + 1.1, label, act('table', g), { r: 1.4 }); }
    A.person({ x: 8.5, y: 7, face: 1, skin: '#e8b58f', hair: '#5a3a22', coat: '#26262c', pants: '#1a1a1e', shirt: '#dcdcdc', tie: '#203a6b', build: 'broad' });
    A.use(8.5, 7, 'Tommy Quinn, pit boss', act('tommy'), { r: 1.6 });
    // the floor games, the slots and the cashier
    A.prop('wheel', 20, 9); A.use(20, 10, 'Big Six money wheel', act('wheel'), { r: 1.5 });
    A.prop('sicbo', 16, 9.5); A.use(16, 10.6, 'Sic Bo', act('sicbo'), { r: 1.5 });
    A.prop('pusher', 23.5, 4, { label: 'HIGH TIDE' }); A.use(23.5, 5, 'High Tide coin pusher', act('pusher', 'a'), { r: 1.3 });
    A.prop('pusher', 23.5, 7, { label: 'LOW TIDE' }); A.use(23.5, 8, 'Low Tide coin pusher', act('pusher', 'b'), { r: 1.3 });
    for (let i = 0; i < 6; i++) { A.prop('slot', 3 + i * 1.1, 15.6, { hot: i === 2, label: ['777', 'BAR', '$$$', '777', 'BAR', '777'][i] }); }
    for (let i = 0; i < 6; i++) A.prop('slot', 3 + i * 1.1, 17.6, { label: ['$$$', '777', 'BAR', '$$$', '777', 'BAR'][i] });
    A.use(5.5, 16.6, 'The slots', act('slots'), { r: 2.2 });
    A.prop('cage', 20, 14, { w: 3, d: 1.4 }); A.person({ x: 21.5, y: 14.6, face: 1, skin: '#c48a64', hair: '#111', coat: '#111', pants: '#111', shirt: '#f4f4f4', tie: '#c9a14a' });
    A.use(21.5, 16, 'The cashier', act('cashier'), { r: 1.6 });
    for (const [x, y] of [[13, 13], [7, 13]]) A.prop('column', x, y, { h: 3.6 });
    // Meridian Rewards: tonight's promotions, and a host to pay the bounties
    A.prop('counter', 15.6, 17.4, { w: 2.4, d: .8, color: '#3a1020', top: '#c9a14a' }); place(A, 'tiff', 16.8, 16.9, { face: 1, r: 1 });
    A.prop('screens', 15.4, 16.6, { w: 2.6 });
    A.use(16.8, 16.6, 'Meridian Rewards: tonight\'s promotions', act('rewards'), { r: 1.6 });
    A.person({ x: 14, y: 16, face: -1, skin: '#d9a07a', hair: '#141010', coat: '#4a1030', pants: '#1a0a12', longHair: true, skirt: true, hold: 'glass' }); // punters
    place(A, 'glenda', 4.15, 16.5, { sit: true, back: true, r: 1.2 }); place(A, 'hollis', 18.2, 2.4, { face: 1, r: 1.3 });
    place(A, 'bree', 9.5, 11, { walk: [[9.5, 11], [14, 11], [14, 7.2], [9.5, 7.2]], speed: .9 });
    A.person({ x: 6, y: 6.2, face: 1, back: true, skin: '#f0c9a8', hair: '#3a2a1e', coat: '#2a3a5a', sit: true }); A.person({ x: 11.6, y: 6.2, face: -1, back: true, skin: '#8a5a3a', hair: '#111', coat: '#5a2a2a', sit: true, style: 'long' });
    A.person({ x: 18.6, y: 10.8, face: 1, skin: '#f0d0b0', hair: '#ddd', coat: '#222', pants: '#111', shirt: '#eee', tie: '#7a0f1e' });
    exit(A, 12, 19, 'Out to Meridian Avenue', act('toStreet', 'casino'));
    for (const [x, y] of [[6, 7], [12, 7], [18, 7], [6, 15], [14, 15], [21, 11]]) A.light(x, y, { r: 6, color: '#ffd9a0', i: .9 });
    return { spawn: [12.5, 18, 0], entries: { street: [12.5, 18, 0], garage: [1.6, 3.8, 0], lift: [1.6, 12.8, 0], eye: [2.7, 1.8, 0], salon: [20, 1.8, 0] }, dark: .32, bg: '#0a0604', soft: true, name: 'the Meridian' };
  }
  // Augustin Vale in oils, painted once off screen, then laid onto the wall's slant
  let valeImg = null;
  function paintVale() {
    const W = 240, H = 180, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const bg = g.createRadialGradient(W * .5, H * .38, 10, W * .5, H * .5, W * .7); bg.addColorStop(0, '#6a2a1e'); bg.addColorStop(.55, '#3a1410'); bg.addColorStop(1, '#120606'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${rnd() < .5 ? '120,50,30' : '20,6,4'},${.08 + rnd() * .1})`; g.lineWidth = 2 + rnd() * 5; const x = rnd() * W, y = rnd() * H, a = rnd() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); } // brushwork
    const cx = W * .5;
    // the white dinner jacket, black lapels, bow tie, a red silk square
    const jk = g.createLinearGradient(cx - 80, 0, cx + 80, 0); jk.addColorStop(0, '#d8d0c0'); jk.addColorStop(.5, '#f4efe4'); jk.addColorStop(1, '#a8a090'); g.fillStyle = jk;
    g.beginPath(); g.moveTo(cx - 92, H); g.quadraticCurveTo(cx - 86, 120, cx - 34, 108); g.lineTo(cx + 34, 108); g.quadraticCurveTo(cx + 86, 120, cx + 92, H); g.closePath(); g.fill();
    g.fillStyle = '#f8f6f0'; g.beginPath(); g.moveTo(cx - 18, 108); g.lineTo(cx + 18, 108); g.lineTo(cx + 10, H); g.lineTo(cx - 10, H); g.closePath(); g.fill(); // shirt front
    g.fillStyle = '#141414'; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(cx + k * 18, 108); g.lineTo(cx + k * 34, 110); g.lineTo(cx + k * 16, 160); g.closePath(); g.fill(); } // lapels
    g.beginPath(); g.moveTo(cx - 14, 112); g.lineTo(cx, 118); g.lineTo(cx + 14, 112); g.lineTo(cx + 14, 124); g.lineTo(cx, 119); g.lineTo(cx - 14, 124); g.closePath(); g.fill(); // bow tie
    g.fillStyle = '#b3222b'; g.beginPath(); g.moveTo(cx + 50, 138); g.lineTo(cx + 64, 134); g.lineTo(cx + 60, 146); g.closePath(); g.fill();
    // neck and head: lit from the left, a long jaw, a cleft chin
    const sk = g.createLinearGradient(cx - 30, 0, cx + 30, 0); sk.addColorStop(0, '#f0c8a4'); sk.addColorStop(.6, '#d09a76'); sk.addColorStop(1, '#8a5a40');
    g.fillStyle = sk; g.fillRect(cx - 13, 92, 26, 20);
    g.beginPath(); g.moveTo(cx - 27, 52); g.quadraticCurveTo(cx - 30, 92, cx - 6, 104); g.quadraticCurveTo(cx, 107, cx + 6, 104); g.quadraticCurveTo(cx + 30, 92, cx + 27, 52); g.quadraticCurveTo(cx + 26, 22, cx, 20); g.quadraticCurveTo(cx - 26, 22, cx - 27, 52); g.closePath(); g.fill();
    g.fillStyle = 'rgba(90,40,30,.35)'; g.beginPath(); g.ellipse(cx + 18, 74, 8, 16, 0, 0, 7); g.fill(); // shadowed cheek
    // silver hair swept back, grey at the temples
    const hr = g.createLinearGradient(cx - 30, 14, cx + 30, 40); hr.addColorStop(0, '#f2f2ee'); hr.addColorStop(1, '#8a8a88'); g.fillStyle = hr;
    g.beginPath(); g.moveTo(cx - 29, 56); g.quadraticCurveTo(cx - 34, 18, cx, 12); g.quadraticCurveTo(cx + 36, 16, cx + 29, 56); g.quadraticCurveTo(cx + 24, 34, cx + 4, 32); g.quadraticCurveTo(cx - 20, 30, cx - 29, 56); g.fill();
    g.strokeStyle = 'rgba(120,120,118,.6)'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(cx - 22 + i * 7, 30); g.quadraticCurveTo(cx - 10 + i * 6, 16, cx + 18 + i * 2, 18); g.stroke(); }
    // brows, eyes that follow you, the half smile
    g.strokeStyle = '#6a6a66'; g.lineWidth = 2.6; g.lineCap = 'round'; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(cx + k * 6, 50); g.quadraticCurveTo(cx + k * 13, 46 - (k > 0 ? 2 : 0), cx + k * 20, 50); g.stroke(); }
    for (const k of [-1, 1]) { g.fillStyle = '#f4ecdc'; g.beginPath(); g.ellipse(cx + k * 12, 57, 5.5, 2.6, 0, 0, 7); g.fill(); g.fillStyle = '#2a3a4a'; g.beginPath(); g.arc(cx + k * 12 + 1.5, 57, 2.2, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(cx + k * 12 + 1, 55.6, 1, 1); g.strokeStyle = 'rgba(80,40,30,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + k * 12 - 6, 55); g.quadraticCurveTo(cx + k * 12, 53, cx + k * 12 + 6, 55); g.stroke(); }
    g.strokeStyle = 'rgba(110,60,45,.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 2, 60); g.lineTo(cx - 4, 74); g.quadraticCurveTo(cx, 77, cx + 4, 75); g.stroke(); // the nose
    g.strokeStyle = '#7a3a30'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx - 11, 86); g.quadraticCurveTo(cx + 2, 90, cx + 13, 83); g.stroke(); // the smile: one side higher
    g.strokeStyle = 'rgba(110,60,45,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, 98); g.lineTo(cx, 103); g.stroke();
    // varnish, cracks, and the brass plate
    const vn = g.createRadialGradient(cx, H * .4, 20, cx, H * .5, W * .75); vn.addColorStop(0, 'rgba(255,200,120,.08)'); vn.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vn; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .7; for (let i = 0; i < 40; i++) { let x = rnd() * W, y = rnd() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (rnd() - .5) * 18; y += (rnd() - .5) * 18; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = '#b89040'; g.fillRect(cx - 40, H - 16, 80, 11); g.fillStyle = '#2a1a08'; g.font = 'bold 7px Georgia'; g.textAlign = 'center'; g.fillText('AUGUSTIN VALE · FOUNDER', cx, H - 8);
    return cv;
  }
  function valePortrait(c, q) {
    if (!valeImg) valeImg = paintVale();
    const [a, , cc, d] = q, W = valeImg.width, H = valeImg.height; // q: bottom-left, bottom-right, top-right, top-left
    c.save(); c.transform((cc[0] - d[0]) / W, (cc[1] - d[1]) / W, (a[0] - d[0]) / H, (a[1] - d[1]) / H, d[0], d[1]); c.drawImage(valeImg, 0, 0); c.restore();
  }

  /* ======================= The Eye ======================= */
  function eye(A, mk) {
    room(A, mk, 12, 9, { floor: 'kitchen', wall: 'dark', height: 2.8 });
    A.prop('screens', 1, .3, { w: 5 }); A.prop('screens', 6.5, .3, { w: 4 });
    A.prop('desk', 2, 2.4, { w: 4, d: .9, screen: true }); A.use(4, 3.8, 'The CCTV archive', act('cctv'), { r: 1.6 });
    A.prop('chair', 4, 4); A.prop('desk', 8, 4.5, { w: 1.6, d: .8, lamp: true }); A.use(8.8, 5.6, 'A mug on the desk', act('mug'), { r: 1.3 });
    exit(A, 2, 8, 'Back to the casino floor', act('toFloor', 'eye'));
    A.light(5, 1.5, { r: 6, color: '#6fc3e8', i: .9 }); A.light(8.5, 4.5, { r: 3, color: '#ffd9a0', i: .7 });
    return { spawn: [2.5, 7.3, 0], dark: .5, bg: '#020304', name: 'The Eye' };
  }

  /* ======================= the Salon ======================= */
  function salon(A, mk) {
    room(A, mk, 14, 11, { floor: 'hotel', wall: 'red', height: 3.2, stripes: true, hangN: [{ kind: 'door', at: 9, w: 1.6, y: 0, h: 2.5, color: '#1a0a0a', label: 'PRIVATE · A. VALE', labelColor: '#ffcf6a' }] });
    A.use(9.8, .8, 'A door marked Private', act('valeDoor'), { r: 1.4 });
    A.prop('bj', 4, 4); A.person(dealer(4, 3, 1)); A.use(4, 5.1, 'Sit down at high-limit blackjack', act('table', 'bj'), { r: 1.4 }); place(A, 'chen', 4.9, 5.1, { sit: true, back: true, r: 1 });
    A.prop('bj', 4, 8); A.person(dealer(4, 7, 1, { longHair: true })); A.use(4, 9.1, 'Sit down at Crazy 4 Poker', act('table', 'c4'), { r: 1.4 });
    A.prop('bj', 7.5, 3.5); A.person(dealer(7.5, 2.5, 1)); A.use(7.5, 4.6, 'Sit down at Mississippi Stud', act('table', 'ms'), { r: 1.3 });
    A.person({ x: 10, y: 5.5, face: -1, skin: '#f0c19a', hair: '#c9a070', coat: '#7a1a2a', pants: '#1a1a1a', longHair: true, skirt: true });
    A.use(10, 5.5, 'Margaux Reyes', act('margaux'), { r: 1.8 });
    A.prop('sofa', 9, 7.5, { color: '#3a0a14' }); A.prop('piano', 11.5, 1); A.prop('plant', 1, 1);
    exit(A, 6, 10, 'Back to the casino floor', act('toFloor', 'salon'));
    A.light(4, 6, { r: 6, color: '#ffcf8a', i: .9 }); A.light(10, 6, { r: 4, color: '#ffb0a0', i: .8 });
    return { spawn: [6.5, 9.4, 0], dark: .45, bg: '#060403', soft: true, name: 'the Salon' };
  }

  /* ======================= the hotel: the 17th floor, room 1717, the roof ======================= */
  function corridor(A, mk) {
    const horror = S().ending === 'horror' && !L2.has('done');
    mk(5, 30, horror ? 'carpet' : 'hotel');
    A.wall(0, 0, 5, 'n', { style: horror ? '#5a1010' : 'paper', height: 2.7, stripes: true, hang: [{ kind: 'door', at: 1.5, w: 2, y: 0, h: 2.3, color: '#5a1a1a', label: 'ROOF ACCESS', labelColor: '#ff6a6a' }] });
    const doors = []; for (let i = 0; i < 9; i++) doors.push({ kind: 'door', at: 2 + i * 3, w: 1, y: 0, h: 2.1, color: horror ? '#2a1414' : '#3a2a1e', label: horror ? '1717' : String(1701 + i * 2), labelColor: horror ? '#ff4a4a' : '#e8d7a8' });
    A.wall(0, 0, 30, 'w', { style: horror ? '#5a1010' : 'paper', height: 2.7, stripes: true, hang: doors });
    A.use(2.5, .9, horror ? 'The roof door' : 'Stairs to the roof', horror ? act('horrorLift') : act('toRoof'), { r: 1.4 });
    if (horror) for (let i = 0; i < 9; i++) A.use(.8, 2.5 + i * 3, 'Room 1717', act('horrorDoor'), { r: 1.2 });
    else A.use(.8, 2.5 + 8 * 3, 'Room 1717', act('room1717'), { r: 1.4 });
    if (!horror) { place(A, 'lupe', 3.4, 14, { face: -1 }); A.prop('trolley', 4.1, 12.8); A.use(4.2, 12, 'Lupe\'s trolley', async () => { await L2.ui.say([{ who: 'narr', text: '*Towels, little soaps, and a box of the mints they leave on pillows. You take one. Lupe pretends not to see.*' }]); L2Bottle.state.crave = Math.max(0, L2Bottle.state.crave - 3); L2Bottle.apply(); }, { r: 1.1 }); for (const y of [4.5, 20, 27]) A.prop('plant', 4.4, y); }
    exit(A, 2, 29, horror ? 'The lift' : 'Lift down to the casino', horror ? act('horrorLift') : act('toFloor', 'lift'));
    const ls = []; for (let i = 0; i < 6; i++) ls.push(A.light(2.5, 2 + i * 5, { r: 4.5, color: horror ? '#ff2a2a' : '#ffd9a0', i: .9, flicker: horror ? .9 : 0 }));
    return { spawn: [2.5, 28, 0], entries: { lift: [2.5, 28, 0], roof: [2.5, 1.6, 0], room: [1.6, 26.5, 0] }, dark: horror ? .7 : .5, darkColor: horror ? 'rgba(30,2,4,1)' : undefined, bg: '#0a0806', soft: true, name: 'the seventeenth floor' };
  }
  function hotelRoom(A, mk) {
    room(A, mk, 9, 8, { floor: 'hotel', wall: 'paper', stripes: true, hangN: [{ kind: 'window', at: 2, w: 4, y: .5, h: 2 }], hangW: [{ kind: 'tv', at: 3.2, w: 1.3, y: 1.2, h: .75 }, { kind: 'picture', at: 5.6, w: 1, y: 1.2, h: .8, color: '#3a5a6a', frame: '#c9a14a' }, { kind: 'door', at: .8, w: 1, y: 0, h: 2.2, color: '#e8e2d4', label: 'BATH', labelColor: '#c9a14a' }] });
    A.prop('bed2', 1, 2); A.use(2, 4.6, 'The bed', act('roomBed'), { r: 1.5 });
    A.prop('desk', 6, 1, { w: 1.6, d: .7, lamp: true }); A.use(6.8, 2.2, 'The desk', act('roomDesk'), { r: 1.4, when: () => true });
    A.prop('fridge', 7.6, 4, { w: .8 }); A.use(7.2, 4.6, 'The minibar', act('minibar'), { r: 1.3 });
    A.prop('rug', 3.2, 3.6, { w: 2.6, d: 1.8, color: '#6a2a2a' }); A.prop('armchair', 6.9, 6.2, { color: '#3a4a5a' }); A.prop('floorlamp', 8.3, 6.6); A.prop('bags', 3.4, 6.8);
    A.use(.8, 3.8, 'The television', () => L2.ui.say([{ who: 'narr', text: '*Hotel television: the casino\'s own channel, a man in a white suit smiling at a ribbon. AUGUSTIN VALE WELCOMES YOU. You turn it off. The room is better dark.*' }]), { r: 1.2 });
    A.use(.8, 1.3, 'The bathroom', async () => { await L2.ui.say([{ who: 'narr', text: '*Marble, too much of it. You run the tap as hot as it goes and hold your wrists under it until your hands stop shaking. Then you wash your face, and look at it, and keep looking.*' }]); L2Bottle.feed({ energy: 6 }); if (!L2.has('washed')) { L2.set('washed'); L2Life.lift(5, 'hot water'); } }, { r: 1.1 });
    A.use(4, 1.2, 'The window', () => L2.ui.say([{ who: 'narr', text: '*Seventeen floors down, the city is a spill of lights in the rain. Somewhere out there, Calder Street. From up here you could cover it with your thumb.*' }]), { r: 1.6 });
    exit(A, 4, 7, 'Back to the corridor', act('toCorridor'));
    A.light(6.5, 1.8, { r: 4.5, color: '#ffe0b0', i: .9 }); A.light(8.2, 6.4, { r: 3, color: '#ffd9a0', i: .7, z: 1.6 });
    return { spawn: [4.5, 6.3, 0], dark: .45, bg: '#0a0806', soft: true, name: 'room 1717' };
  }
  function roof(A, mk) {
    mk(16, 16, 'roof');
    A.decal(7, 7, c => { c.strokeStyle = 'rgba(240,210,90,.7)'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 16, 70, 35, 0, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.75)'; c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.fillText('H', 0, 27); });
    for (let i = 0; i < 16; i++) { A.prop('crate', i + .5, .3, { color: '#3a3d44', solid: false }); }
    A.block(0, 0, 16, 1, { height: .9, style: 'concrete' }); A.block(0, 1, 1, 15, { height: .9, style: 'concrete' });
    if (!L2.has('finale')) {
      A.person({ x: 7, y: 4, face: 1, skin: '#e0b090', hair: '#bbb', coat: '#f0ece0', pants: '#2a2a2a', shirt: '#f4f4f4', tie: '#7a0f1e' });
      A.person({ x: 9, y: 4.5, face: -1, skin: '#d8b090', hair: '#3a3a3a', coat: '#1c2228', pants: '#14181c', build: 'broad' });
      A.use(8, 5, 'Vale and Rourke', act('finale'), { r: 2.6 });
    }
    exit(A, 13, 14, 'Stairs down', act('toCorridor', 'roof'));
    A.light(8, 5, { r: 7, color: '#b8c8ff', i: .7 });
    return { spawn: [13.5, 13.5, 0], entries: { stairs: [13.5, 13.5, 0] }, rain: true, dark: .55, bg: '#05070c', name: 'the roof' };
  }

  /* ======================= Calder Street: home ======================= */
  function house(A, mk) {
    room(A, mk, 11, 9, { floor: 'wood', wall: '#5a5248', hangN: [{ kind: 'picture', at: 2, w: 2, y: 1.2, h: 1.2, color: '#d8d2c8', frame: '#3a2a1e', draw: familyPhoto }, { kind: 'window', at: 6, w: 2.4, y: .8, h: 1.6 }], hangW: [{ kind: 'picture', at: 4, w: 1.4, y: 1.1, h: 1, color: '#f4efe0', frame: '#8a5a3a', draw: crayon }] });
    A.prop('sofa', 2, 4, { color: '#8a8478' }); A.prop('rug', 2, 5.2, { w: 3, d: 2, color: '#4a3a5a' });
    A.prop('desk', 7, 2, { w: 2, d: .9, color: '#8a8478', top: '#9a9488' }); A.prop('chair', 7.5, 3.2);
    A.use(3, 5, 'The sofa, under a dust sheet', act('houseMemory', 'sofa'), { r: 1.6 });
    A.use(3, 1.2, 'The photo on the wall', act('houseMemory', 'photo'), { r: 1.6 });
    A.use(1, 4.7, 'Ellie\'s drawing, still on the wall', act('houseMemory', 'drawing'), { r: 1.4 });
    A.use(8, 2.6, 'The kitchen table', act('houseMemory', 'table'), { r: 1.6 });
    A.prop('kitchen', 8.4, .15, { w: 2.4, color: '#d8d0c0', kettle: true }); A.prop('bookcase', .2, .1, { w: 1.2 }); A.prop('radiator', 6, .1, { w: 2 });
    A.prop('floorlamp', 1.2, 3.6); A.prop('armchair', 5.6, 4.4, { color: '#5a4a6a' }); A.prop('toys', 4.2, 6.2); A.prop('plant', 10.4, 2.4);
    A.prop('boxes', 9.6, 6.4, { label: 'KITCHEN' }); A.prop('boxes', 1.3, 7.2, { label: 'KIDS' }); A.prop('coatrack', 6.8, 7.3, { coat: '#8a2a34' });
    A.use(9.6, 7.2, 'Boxes, half packed', () => L2.ui.say([{ who: 'narr', text: '*KITCHEN, in Nora\'s sister\'s handwriting. She started packing the house up and couldn\'t finish. The tape is still on the roll, the roll still on the box.*' }]), { r: 1.2 });
    A.use(6.8, 6.6, 'Nora\'s red coat', async () => { await L2.ui.say([{ who: 'narr', text: '*Her red coat, on the hook by the door, where it always was. You put your face in it. It still smells of her, very faintly, under the dust.*' }]); if (!L2.has('coat')) { L2.set('coat'); L2Life.lift(5, 'her coat'); } }, { r: 1.1 });
    L2Life.keeps(A, 'house');
    exit(A, 5, 8, 'Back out to Calder Street', act('toStreet', 'house'));
    A.light(5, 4, { r: 5, color: '#8a9ab8', i: .55 }); A.light(1.4, 3.4, { r: 3, color: '#ffd9a0', i: .6, z: 1.6 });
    return { spawn: [5.5, 7.3, 0], dark: .65, bg: '#05060a', soft: true, name: '17 Calder Street' };
  }
  function familyPhoto(c, q, z) { const [a, b, cc] = q; const mx = (a[0] + cc[0]) / 2, my = (a[1] + cc[1]) / 2; const ppl = [[-12, 0, 9], [-3, 3, 7], [5, 5, 5], [13, 0, 9]]; for (const [dx, dy, r] of ppl) { c.fillStyle = '#7a6a5a'; c.beginPath(); c.arc(mx + dx * z, my + (dy - 6) * z, r * .45 * z, 0, 7); c.fill(); c.fillRect(mx + (dx - r * .4) * z, my + (dy - 2) * z, r * .8 * z, r * 1.2 * z); } }
  function crayon(c, q, z) { const [a, b, cc] = q; const mx = (a[0] + cc[0]) / 2, my = (a[1] + cc[1]) / 2; c.fillStyle = '#8a3ab8'; c.beginPath(); c.arc(mx + 8 * z, my - 10 * z, 5 * z, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(mx + (-12 + i * 7) * z, my, 2 * z, 0, 7); c.moveTo(mx + (-12 + i * 7) * z, my + 2 * z); c.lineTo(mx + (-12 + i * 7) * z, my + 9 * z); c.stroke(); } }

  /* ======================= the Low Tide, Rosie's, the Kwik Mart ======================= */
  function lowtide(A, mk) {
    room(A, mk, 14, 11, { floor: 'wood', wall: '#3a2418', hangN: [{ kind: 'neon', at: 3.5, w: 4, y: 2.1, h: .6, text: 'The Low Tide', labelColor: '#ff8a3a', size: 14 }, { kind: 'tv', at: 10, w: 1.8, y: 1.6, h: 1 }, { kind: 'poster', at: 8.2, w: .9, y: 1.2, h: 1.2, color: '#c8a060' }],
      hangW: [{ kind: 'dartboard', at: 6, w: 1, y: 1.3, h: 1 }, { kind: 'board', at: 2, w: 1.6, y: 1.1, h: 1.1 }, { kind: 'picture', at: 9, w: 1.2, y: 1.2, h: .9, color: '#2a3a4a', frame: '#5a3a22' }] });
    A.prop('backbar', 1, .3, { w: 8 });
    A.prop('bar', 1, 2, { w: 8, d: 1 }); for (let i = 0; i < 6; i++) A.prop('stool', 1.8 + i * 1.3, 3.5);
    A.prop('bottles', 6.5, 2.4, { n: 3 }); A.prop('glass', 3, 2.5); A.prop('glass', 7.8, 2.6);
    A.person({ x: 4, y: 1.4, face: 1, skin: '#f0c19a', hair: '#7a2e1a', coat: '#1a1a1a', pants: '#1a1a1a', shirt: '#f4f4f4', longHair: true, apron: '#2a2a2a' });
    A.use(4, 3.4, 'Delia, behind the bar', act('delia'), { r: 1.6 });
    place(A, 'mags', 8.4, 3.75, { face: -1, r: 1.3 });
    // darts by the west wall, pool in the middle, a jukebox in the corner, Walt in his seat
    A.decal(3, 6, c => { c.strokeStyle = 'rgba(232,213,160,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, 22); c.lineTo(20, 2); c.stroke(); });
    place(A, 'sean', 2.2, 7.6, { face: -1 });
    A.prop('pool', 7, 6, { w: 2.4, d: 1.3 }); place(A, 'lou', 10.2, 7.6, { face: -1 });
    A.prop('jukebox', 12.6, 3); A.use(12, 3.6, 'The jukebox', act('jukebox'), { r: 1.3 }); L2Life.keeps(A, 'lowtide');
    A.prop('cafetable', 12, 8.6); A.prop('chair', 12.9, 8.6); place(A, 'walt', 11.3, 8.8, { sit: true });
    A.prop('booth', 4.2, 8.6, { w: 1.6, color: '#5a1a1a' });
    exit(A, 6, 10, 'Out to Harbour Road', act('toStreet', 'lowtide'));
    A.light(4.5, 2, { r: 6, color: '#ffa860', i: .95 }); A.light(8.2, 6.6, { r: 3.6, color: '#fff0c0', i: .85 }); A.light(12.4, 3.4, { r: 2.6, color: '#ff8040', i: .7 }); A.light(2, 7, { r: 3, color: '#ffd0a0', i: .6 });
    return { spawn: [6.5, 9.4, 0], dark: .42, bg: '#080503', soft: true, name: 'the Low Tide' };
  }
  function diner(A, mk) {
    room(A, mk, 12, 9, { floor: 'tile', wall: '#7a2a32', hangN: [{ kind: 'menu', at: 1.2, w: 3, y: 1.5, h: 1, label: 'TODAY: MEATLOAF', labelColor: '#ffdf6a' }, { kind: 'window', at: 5, w: 2, y: 1, h: 1, color: '#3a2a1a' }, { kind: 'neon', at: 8, w: 3, y: 2, h: .6, text: "Rosie's", labelColor: '#ff6ab0' }, { kind: 'clock', at: 7.3, w: .5, y: 2.1, h: .5 }],
      hangW: [{ kind: 'poster', at: 3, w: 1, y: 1.2, h: 1.2, color: '#e8c060', ink: '#b3222b' }, { kind: 'window', at: 6, w: 2, y: .9, h: 1.3 }] });
    A.prop('counter', 1, 2, { w: 7, d: .8, color: '#c8c0b0', top: '#e8e0d0' }); for (let i = 0; i < 5; i++) A.prop('stool', 1.8 + i * 1.3, 3.3);
    A.prop('coffee', 1.6, 2.3, { z: .95 }); A.prop('till', 7.2, 2.4, { z: .95 }); A.prop('piecase', 8.6, 1.9, { w: 1.2 });
    A.person({ x: 3.6, y: 1.3, face: 1, skin: '#8d5a3b', hair: '#111', coat: '#e8dcc8', pants: '#3a3a3a', bun: true, apron: '#f4f4f4' });
    A.use(3.6, 3.3, 'Rosie, at the counter', act('diner'), { r: 1.8 });
    place(A, 'benny', 5.8, .9, { face: -1, r: 1.2 });
    place(A, 'dale', 6.4, 3.55, { face: -1, sit: true, back: true, r: 1.1 });
    A.prop('booth', 9.6, 4.2, { w: 1.6 }); A.prop('booth', 9.6, 6.6, { w: 1.6 });
    A.prop('cafetable', 3, 6.2, { cup: true }); A.prop('chair', 2.2, 6.2, { color: '#a31a2a' }); place(A, 'priya', 3.8, 6.4, { face: -1, sit: true });
    A.prop('jukebox', .6, 5.5); A.prop('plant', .5, 8); L2Life.keeps(A, 'diner');
    exit(A, 5, 8, 'Out to Harbour Road', act('toStreet', 'diner'));
    A.light(4.5, 2.6, { r: 7, color: '#fff0d0', i: 1 }); A.light(10.4, 5.8, { r: 3.5, color: '#ffd0e0', i: .7 }); A.light(.8, 5.6, { r: 2.5, color: '#ffb050', i: .6 });
    return { spawn: [5.5, 8.2, 0], dark: .2, bg: '#0a0806', name: 'Rosie\'s' };
  }
  function shop(A, mk) {
    room(A, mk, 11, 9, { floor: 'lino', wall: '#c8ccd0', hangN: [{ kind: 'board', at: 1, w: 2, y: 1.4, h: .9, color: '#e8e8e8' }, { kind: 'neon', at: 3.6, w: 2.6, y: 2.1, h: .5, text: 'OPEN 24H', labelColor: '#5aff9a', size: 11 }] });
    A.prop('fridge', 6.5, .3, { w: 4 }); A.use(8.5, 1.5, 'The fridges: water, juice, energy drinks', act('shop', 'fridge'), { r: 1.6 });
    A.prop('counter', .8, 1.6, { w: 3.2, d: .9, color: '#4a6a5a', top: '#c8d0c8' }); A.prop('till', 1.6, 1.9, { z: .95 }); A.prop('bottles', 3, 1.9, { n: 2, z: .95 });
    A.person({ x: 2.3, y: .9, face: 1, skin: '#a5714a', hair: '#111', coat: '#2a6a3a', pants: '#222', glasses: true, beard: 'stubble' });
    A.use(2.3, 3, 'Omar, at the till', act('shop', 'till'), { r: 1.6 });
    A.prop('shelf', 5, 3.6, { w: 3 }); A.prop('shelf', 5, 5.8, { w: 3 }); A.prop('shelf', .5, 5.8, { w: 3, booze: true });
    A.use(6.5, 4.8, 'Crisps, chocolate, sandwiches, noodles', act('shop', 'food'), { r: 1.6 }); A.use(2, 7, 'The booze aisle', act('shop', 'booze'), { r: 1.6 });
    A.prop('newsstand', 9.6, 6.2); A.person({ x: 8.4, y: 4.9, face: -1, back: true, skin: '#e8c0a0', hair: '#c88a3a', coat: '#3a5a8a', style: 'pony', hold: 'bag' });
    exit(A, 5, 8, 'Out to Harbour Road', act('toStreet', 'shop'));
    A.light(5, 4, { r: 8, color: '#eaffff', i: 1 });
    return { spawn: [5.5, 8.2, 0], dark: .12, bg: '#0a0a0a', name: 'the Kwik Mart' };
  }

  // Sully's Pawn & Hardware: guitars on the wall, watches under glass, and a safe
  function pawn(A, mk) {
    room(A, mk, 11, 8, { floor: 'wood', wall: '#4a3a2a', hangN: [{ kind: 'guitar', at: 1, w: .8, y: 1.2, h: 1.2, body: '#a0522d' }, { kind: 'guitar', at: 2, w: .8, y: 1.2, h: 1.2, body: '#2a2a2a' }, { kind: 'guitar', at: 3, w: .8, y: 1.2, h: 1.2, body: '#c8a040' }, { kind: 'neon', at: 5, w: 3, y: 2, h: .5, text: 'WE BUY GOLD', labelColor: '#ffd27a', size: 11 }, { kind: 'clock', at: 8.6, w: .5, y: 2, h: .5 }],
      hangW: [{ kind: 'door', at: .6, w: 1.2, y: 0, h: 2.2, color: '#2a1a10', label: 'BACK ROOM', labelColor: '#e8d7a8' }, { kind: 'board', at: 3, w: 2, y: 1.2, h: 1, color: '#5a4a3a' }, { kind: 'tv', at: 6, w: 1.2, y: 1.4, h: .8 }] });
    A.use(.8, 1.3, 'The back room: the Thursday game', act('pokerGame', 'harbour'), { r: 1.2 });
    A.prop('display', 1, 2.2, { w: 4 }); A.prop('safe', 9.4, .9); A.prop('shelf', 6.6, .3, { w: 2.4 }); A.prop('crate', 9.6, 5); A.prop('crate', 9.6, 6); A.prop('bookcase', 6.4, 5.4, { w: 1.4, color: '#3a2a1a' }); A.prop('boxes', 1.2, 6.4); A.prop('tv', 8.8, 2.6);
    L2Life.keeps(A, 'pawn');
    place(A, 'sully', 3, 1.4, { face: 1, r: 1.2 });
    A.use(3, 3.4, 'Sully, behind the counter', act('pawn'), { r: 1.8 });
    exit(A, 5, 7, 'Out to Harbour Road', act('toStreet', 'pawn'));
    A.light(3, 2.6, { r: 6, color: '#ffe0a0', i: .95 }); A.light(8.5, 4, { r: 3.5, color: '#ffd090', i: .6 });
    return { spawn: [5.5, 6.4, 0], dark: .28, bg: '#0a0806', name: 'Sully\'s' };
  }

  /* ======================= the police station, the chapel ======================= */
  function police(A, mk) {
    room(A, mk, 12, 10, { floor: 'lino', wall: '#5a6470', hangN: [{ kind: 'board', at: 5.5, w: 3, y: 1, h: 1.3, color: '#8a7a5a' }, { kind: 'door', at: 9.5, w: 1.4, y: 0, h: 2.3, color: '#3a4250', label: 'CELLS', labelColor: '#cfd8e8' }, { kind: 'clock', at: 3, w: .5, y: 2.1, h: .5 }],
      hangW: [{ kind: 'poster', at: 6, w: 1, y: 1.1, h: 1.2, color: '#d8d0b0' }, { kind: 'window', at: 2, w: 2, y: .9, h: 1.3 }] });
    A.prop('counter', 1, 2.2, { w: 4, d: 1, color: '#4a4f58' }); place(A, 'hanley', 2.6, 1.3, { face: 1, r: 1.2 });
    A.use(2.6, 3.7, 'The desk sergeant', act('police', 'desk'), { r: 1.4 });
    A.prop('desk', 7, 4.2, { w: 2, d: .9, lamp: true }); A.prop('chair', 8, 5.4); A.prop('filing', 9.6, 3.6); A.prop('filing', 10.2, 3.6);
    A.use(8, 5.8, 'Detective Mori\'s desk', act('police', 'mori'), { r: 1.4 });
    for (let i = 0; i < 4; i++) A.prop('chair', 1.4 + i * .9, 7.2, { color: '#5a6470' });
    place(A, 'terry', 3.2, 7.5, { sit: true, face: 1 });
    A.prop('coffee', 10.4, 7.6); A.prop('plant', 11.2, 8.4); A.prop('filing', 10.8, 3.6);
    A.use(7, 1.4, 'The noticeboard', () => L2.ui.say([{ who: 'narr', text: '*MISSING: a grey cat called Admiral. A Neighbourhood Watch rota with nobody\'s name on it. And, under three newer notices, a curling sheet: CALDER STREET, 17/10. INFORMATION WANTED. Nobody ever took it down. Nobody ever followed it up.*' }]), { r: 1.6 });
    A.use(10.4, 8.2, 'The coffee machine', act('coffee'), { r: 1.1 });
    exit(A, 6, 9, 'Out to Meridian Avenue', act('toStreet', 'police'));
    A.light(5, 4, { r: 7, color: '#dfe8ff', i: .9 }); A.light(2, 7.4, { r: 3, color: '#dfe8ff', i: .5, flicker: .6 });
    return { spawn: [6.5, 9.2, 0], dark: .3, bg: '#06070a', name: 'the police station' };
  }
  function chapel(A, mk) {
    room(A, mk, 12, 12, { floor: 'wood', wall: '#6a665e', height: 4, hangN: [{ kind: 'window', at: 4, w: 4, y: 1.2, h: 2.4, color: '#2a3a6a', draw: (c, q) => { const g = c.createLinearGradient(q[0][0], q[0][1], q[2][0], q[2][1]); g.addColorStop(0, '#b83a3a'); g.addColorStop(.5, '#3a6ab8'); g.addColorStop(1, '#e8c860'); c.fillStyle = g; c.globalAlpha = .7; c.beginPath(); c.moveTo(...q[0]); for (const p of q.slice(1)) c.lineTo(...p); c.fill(); c.globalAlpha = 1; } }] });
    A.prop('altar', 6, 1.6); for (let i = 0; i < 3; i++) { A.prop('pew', 1.5, 4 + i * 1.6); A.prop('pew', 7, 4 + i * 1.6); }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); A.prop('chair', 3.2 + c * 1.35, 9.6 + s * 1.05, { color: '#5a4a3a', back: Math.abs(c) > Math.abs(s) ? (c > 0 ? 'e' : 'w') : (s > 0 ? 's' : 'n') }); } // facing in
    A.use(4.5, 9.6, 'A circle of chairs. A sign: "Thursdays, 8pm. All welcome."', act('chapel', 'circle'), { r: 1.8 });
    A.prop('column', 2, 2.4, { h: .95 }); L2Life.keeps(A, 'chapel'); A.prop('candles', 9, 2.4, { lit: 3 + (L2.has('candle') ? 4 : 0) }); A.use(9, 3.4, 'Light a candle', act('chapel', 'candle'), { r: 1.6 });
    place(A, 'tom', 4, 2.6, { face: 1 }); place(A, 'ruth', 6.4, 9.6, { face: -1 });
    exit(A, 6, 11, 'Out to the park', act('toStreet', 'chapel'));
    A.light(6, 2, { r: 6, color: '#ffd9a0', i: .9 }); A.light(5, 8, { r: 5, color: '#ffe0b0', i: .5 });
    return { spawn: [6.5, 10.4, 0], dark: .45, bg: '#060504', soft: true, name: 'St Brigid\'s' };
  }

  /* ======================= Greenhill, and the Rusty Spur ======================= */
  function cemetery(A, mk) {
    mk(18, 16, 'grass');
    const names = [['NORA', 4], ['ELLIE', 6.5], ['SAM', 9]];
    for (const [n, x] of names) A.prop('grave', x, 4, { name: n, h: 1.2 });
    for (let i = 0; i < 14; i++) A.prop('grave', 1 + (i * 7) % 16, 8 + (i % 3) * 2.4, { h: .7 + (i % 3) * .25 });
    for (const [x, y] of [[1, 1], [15, 2], [3, 14], [16, 13]]) A.prop('tree', x, y);
    if (S().clues.call || S().clues.eddie) { const stone = L2Money.state.stone; A.prop('grave', 13, 6, stone ? { name: 'E. MARSH', h: .9 } : { name: '417', h: .45 }); A.prop('tree', 14.5, 5); A.use(13.5, 7.2, stone ? 'Eddie Marsh' : 'A numbered marker', act('eddieGrave'), { r: 1.4 }); }
    A.use(6.5, 5.2, 'Kneel by the stones', act('graves'), { r: 2 });
    A.prop('bench', 11.5, 12.6); A.prop('lamp', 8, 12.4); A.prop('lamp', 3, 6.2); A.light(8, 12.4, { r: 4, color: '#ffe0b0', i: .7 }); A.light(3, 6.2, { r: 3.5, color: '#ffe0b0', i: .55 });
    A.use(11.5, 13.3, 'The bench', async () => { await L2.ui.say([{ who: 'narr', text: '*You sit on the bench in the rain and look at the three stones for a long time. Nobody tells you to leave. Nobody tells you anything. It helps, a little, that nobody does.*' }]); if (!L2.has('bench')) { L2.set('bench'); L2Life.lift(4, 'sitting with them'); } }, { r: 1.2 });
    L2Life.keeps(A, 'cemetery');
    exit(A, 8, 15, 'Back to the city', act('toStreet', 'cemetery'));
    const morning = S().ending === 'good';
    return { spawn: [8.5, 14.3, 0], dark: morning ? .05 : .55, bg: morning ? '#2a2a24' : '#05070a', darkColor: morning ? 'rgba(255,220,180,1)' : undefined, rain: !morning, name: 'Greenhill' };
  }
  function spur(A, mk) {
    room(A, mk, 12, 10, { floor: 'wood', wall: '#5a3a22', hangN: [{ kind: 'picture', at: 2, w: 3, y: 1.4, h: .9, color: '#1a1410', label: 'THE RUSTY SPUR', labelColor: '#ffcf6a' }] });
    A.prop('bar', 1, 1.6, { w: 8, d: 1 }); for (let i = 0; i < 6; i++) A.prop('stool', 2 + i * 1.3, 3.2);
    A.person({ x: 5, y: .9, face: 1, skin: (typeof Looks !== 'undefined' ? Looks.get().skin : '#e0b090'), hair: '#999', coat: '#5a3a22', pants: '#2a2a2a', shirt: '#e8e2d4' });
    A.use(5, 3.2, 'The man behind the bar', act('sal'), { r: 1.8 });
    A.prop('slot', 10.5, 2, { label: 'JUKE' }); A.use(10, 3, 'The jukebox', act('spurJukebox'), { r: 1.4 });
    A.light(5, 3, { r: 7, color: '#ffcf8a', i: 1 });
    return { spawn: [5.5, 8.4, 0], dark: .25, bg: '#0a0604', soft: true, name: 'the Rusty Spur' };
  }

  return { city, clinic, garage, floor, eye, salon, corridor, room: hotelRoom, roof, house, lowtide, diner, shop, pawn, police, chapel, cemetery, spur };
})();
