/* Level 2 engine: an isometric world drawn on a canvas, in a noir, illustrated style.
   - Every place is a grid of one-metre tiles, built on demand by a builder in world.js that lays
     floors, raises buildings and walls, places props and people, and hangs lights.
   - The ground is drawn first; everything standing (walls, buildings, props, people) is then drawn
     back to front, a tile column at a time, so people walk in front of and behind things properly.
     Anything tall between you and the camera goes see-through so you never lose yourself.
   - Night comes from a darkness layer with lights cut out of it, then a coloured glow added on top;
     rain falls in screen space.
   - You tap (or click) where you want to go and walk there; drag anywhere to steer like a stick; or
     use WASD / the arrow keys. Tap something to walk up to it and use it, or use the ✋ button (E,
     Space or Enter) on whatever you're next to.
   It answers to the same calls the story makes of the old 3D engine (R3), so the story, puzzles and
   the bottle don't care how the world is drawn. */
const R3 = (() => {
  const TW = 64, TH = 32, V = 40; // a tile's diamond in art pixels, and art pixels per metre of height
  const lowPower = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  let host = null, cv = null, ctx = null, dark = null, dctx = null, el = null, raf = 0, last = 0;
  let M = null, area = null, busy = false, FX = null, updaters = [], uses = [], focus = null, zoom = 1, dpr = 1, W = 0, H = 0;
  let cam = { x: 0, y: 0 }, camTarget = null, fade = 0;
  const P = { x: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vy: 0, dir: 1, step: 0, moving: false, path: null, goal: null };
  Object.defineProperty(P, 'z', { get: () => P.y, set: v => { P.y = v; } }); // the story still speaks in x and z
  let lamp = null; // the light you carry: a function giving { r, i, color } (a torch), or null for the faint glow round you
  const keys = new Set(), stick = { on: false, x: 0, y: 0, run: false };
  let runLock = false;
  const low = () => App.state && App.state.settings.gfx === 'low';
  const running = () => (keys.has('shift') || stick.run || runLock) && !(FX && FX.noRun);
  const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

  /* ---------- projection ---------- */
  const iso = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z * V];
  const toScreen = (x, y, z = 0) => { const [ix, iy] = iso(x, y, z); return [(ix - cam.x) * zoom + W / 2, (iy - cam.y) * zoom + H / 2]; };
  function toWorld(sx, sy) { const ix = (sx - W / 2) / zoom + cam.x, iy = (sy - H / 2) / zoom + cam.y; const a = ix / (TW / 2), b = iy / (TH / 2); return [(a + b) / 2, (b - a) / 2]; }

  /* ---------- the map ---------- */
  function newMap(w, h, fill) {
    const m = { w, h, floor: new Array(w * h).fill(fill), solid: new Uint8Array(w * h), cubes: new Map(), things: [], lights: [], decals: [], info: {} };
    m.inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    m.blocked = (x, y) => !m.inside(x, y) || m.solid[y * w + x] === 1;
    return m;
  }
  // can you stand here (a circle of radius r, in tiles)?
  function free(x, y, r = .22) {
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]]) if (M.blocked(Math.floor(x + dx), Math.floor(y + dy))) return false;
    for (const t of M.things) if (t.foot && x + r > t.foot[0] && x - r < t.foot[2] && y + r > t.foot[1] && y - r < t.foot[3]) return false;
    return true;
  }

  /* ---------- building a place ---------- */
  const api = {
    get root() { return M; }, get player() { return P; },
    every: fn => updaters.push(fn),
    add: t => { M.things.push(t); return t; },
    // ground
    floor(x, y, w, h, kind) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (M.inside(i, j)) M.floor[j * M.w + i] = kind; },
    decal(x, y, draw) { M.decals.push({ x, y, draw }); },
    solid(x, y, w = 1, h = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (M.inside(i, j)) M.solid[j * M.w + i] = 1; },
    clear(x, y, w = 1, h = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (M.inside(i, j)) M.solid[j * M.w + i] = 0; },
    // a block of buildings: one cube per tile, faces painted where it meets the open air
    block(x, y, w, h, o = {}) {
      const id = o.id || ('b' + Math.random().toString(36).slice(2, 7));
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { M.cubes.set(i + ',' + j, { x: i, y: j, h: o.height || 3, style: o.style || 'brick', id, o }); }
      api.solid(x, y, w, h); return id;
    },
    // a thin wall along the north or west edge of a room, drawn with its face towards you
    wall(x, y, len, side, o = {}) { const t = { kind: 'wall', x, y, len, side, h: o.height || 2.8, style: o.style || 'plaster', o }; M.things.push(t); return t; },
    prop(kind, x, y, o = {}) { const t = { kind, x, y, o, foot: o.solid === false ? null : (o.foot || null) }; M.things.push(t); if (ISOART.solidProp(kind)) { const f = ISOART.foot(kind, x, y, o); t.box = f; if (o.solid !== false && !o.foot) t.foot = f; } return t; },
    person(o) { const t = { kind: 'person', x: o.x, y: o.y, o, face: o.face != null ? o.face : 1, phase: Math.random() * 9 }; t.foot = [o.x - .25, o.y - .25, o.x + .25, o.y + .25]; M.things.push(t); return t; },
    light(x, y, o = {}) { const l = { x, y, z: o.z != null ? o.z : 2.5, r: o.r || 5, color: o.color || '#ffcf8a', i: o.i != null ? o.i : 1, flicker: o.flicker || 0, base: o.i != null ? o.i : 1 }; M.lights.push(l); return l; },
    use(x, y, label, fn, o = {}) { const u = { x, y, label, fn, r: o.r || 1.3, when: o.when }; uses.push(u); return u; },
    sign(x, y, text, o = {}) { if (o.glow !== false) api.light(x + .5, y + .6, { r: Math.min(4, 1.5 + text.length * .12), color: o.color || '#ff3b6b', i: .55, z: o.z || 2.6 }); return api.add({ kind: 'sign', x, y, o: { text, ...o } }); },
  };

  /* ---------- drawing ---------- */
  const floorCache = {};
  function floorTile(kind, v) {
    const key = kind + v; if (floorCache[key]) return floorCache[key];
    const c = document.createElement('canvas'); c.width = TW; c.height = TH; const g = c.getContext('2d');
    g.beginPath(); g.moveTo(TW / 2, 0); g.lineTo(TW, TH / 2); g.lineTo(TW / 2, TH); g.lineTo(0, TH / 2); g.closePath(); g.clip();
    ISOART.floor(g, kind, v, TW, TH);
    return (floorCache[key] = c);
  }
  function drawFloor(t) {
    const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(W, H), [x2, y2] = toWorld(W, 0), [x3, y3] = toWorld(0, H);
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2, x3)) - 1), maxX = Math.min(M.w - 1, Math.ceil(Math.max(x0, x1, x2, x3)) + 1);
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2, y3)) - 1), maxY = Math.min(M.h - 1, Math.ceil(Math.max(y0, y1, y2, y3)) + 1);
    const tw = TW * zoom, th = TH * zoom;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const k = M.floor[y * M.w + x]; if (k == null || k === 'none') continue;
      const [sx, sy] = toScreen(x, y);
      ctx.drawImage(floorTile(k, (hash(x, y, 7) * 4) | 0), sx - tw / 2, sy, tw + .6, th + .6);
    }
    for (const d of M.decals) { const [sx, sy] = toScreen(d.x, d.y); if (sx > -200 && sx < W + 200 && sy > -200 && sy < H + 200) { ctx.save(); ctx.translate(sx, sy); ctx.scale(zoom, zoom); d.draw(ctx, t); ctx.restore(); } }
  }
  // everything that stands up, back to front. Buildings and furniture are boxes on the floor; people
  // are points. Boxes are sorted by depth; each person is then slotted in after every nearby box
  // they're in front of and before every one they're behind, so you stand behind a bar, not on it.
  function drawStanding(t) {
    const boxes = [], points = [];
    const [px, py] = toScreen(P.x, P.y, 0);
    for (const c of M.cubes.values()) { const [sx, sy] = toScreen(c.x + .5, c.y + .5); if (sx < -TW * 2 * zoom || sx > W + TW * 2 * zoom || sy < -40 * zoom || sy > H + (c.h * V + TH * 2) * zoom) continue; boxes.push({ d: c.x + c.y + 1.5, c, b: [c.x, c.y, c.x + 1, c.y + 1] }); }
    for (const th of M.things) {
      if (th.hidden) continue;
      if (th.kind === 'person' || th.kind === 'demon') { points.push({ d: th.x + th.y, th, x: th.x, y: th.y }); continue; }
      // a railing runs its whole length: sort it by where it ends, and let people and cars find their side of it
      const rail = th.kind === 'fence' && !th.box ? (th.o.rot ? [th.x - .05, th.y, th.x + .05, th.y + (th.o.len || 4)] : [th.x, th.y - .05, th.x + (th.o.len || 4), th.y + .05]) : null;
      const d = th.kind === 'wall' ? th.x + th.y - .2 : (th.o && th.o.depth != null ? th.o.depth : th.box ? th.box[2] + th.box[3] - .5 : rail ? rail[2] + rail[3] - .5 : th.x + th.y + .5);
      const b = th.kind === 'wall' ? null : th.box || th.foot || rail || (UPRIGHT.has(th.kind) ? [th.x - .2, th.y - .2, th.x + .2, th.y + .2] : null);
      // a stool, a chair, a bin: placed in front of or behind the long things round it (a bar, a counter, a building) the way people are, not by one depth number
      if (b && th.kind !== 'wall' && !(th.o && th.o.depth != null) && b[2] - b[0] <= 1.2 && b[3] - b[1] <= 1.2) { points.push({ d, th, x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 }); continue; }
      boxes.push({ d, th, b });
    }
    points.push({ d: P.x + P.y, me: true, x: P.x, y: P.y });
    boxes.sort((a, b) => a.d - b.d);
    const list = boxes.slice();
    points.sort((a, b) => a.d - b.d);
    for (const p of points) {
      if (p.th && p.th.top && p.th.top()) { list.push(p); continue; } // something that shows through walls
      let lo = 0, hi = list.length, at = list.findIndex(it => it.d > p.d); if (at < 0) at = list.length;
      for (let i = 0; i < list.length; i++) {
        const b = list[i].b; if (!b || p.x < b[0] - 3 || p.x > b[2] + 3 || p.y < b[1] - 3 || p.y > b[3] + 3) continue;
        const front = p.x >= b[2] - .05 || p.y >= b[3] - .05, behind = p.x <= b[0] + .05 || p.y <= b[1] + .05;
        if (front && !(behind && (b[0] - p.x) + (b[1] - p.y) > (p.x - b[2]) + (p.y - b[3]))) lo = Math.max(lo, i + 1);
        else if (behind) hi = Math.min(hi, i);
      }
      const idx = lo <= hi ? Math.max(lo, Math.min(hi, at)) : lo;
      list.splice(idx, 0, p);
    }
    for (const it of list) {
      if (it.me) { drawMe(t); continue; }
      ctx.save();
      if (it.c) {
        const c = it.c, [sx, sy] = toScreen(c.x, c.y);
        // see-through if it stands between you and the camera
        if (it.d > P.x + P.y + .3) { const ddx = Math.abs(sx - px) / (TW * 2.4 * zoom); if (ddx < 1 && py - 40 * zoom < sy + TH * zoom && py + 20 * zoom > sy - c.h * V * zoom) ctx.globalAlpha = .18 + .5 * ddx * ddx; } // a cutaway round you
        ISOART.cube(ctx, c, M, sx, sy, zoom, TW, TH, V, t);
      } else {
        const th = it.th, [sx, sy] = toScreen(th.x, th.y);
        if (th.kind === 'person' && th.o.sit && th.o._seat == null) th.o._seat = !M.things.some(q => ['stool', 'chair', 'sofa', 'booth', 'pew', 'bench', 'benchy'].includes(q.kind) && (([a, b, c, d]) => th.x > a - .35 && th.x < c + .35 && th.y > b - .35 && th.y < d + .35)(q.box || [q.x - .3, q.y - .3, q.x + .3, q.y + .3])); // seated on nothing? bring a stool
        if (th.kind === 'person') { ISOART.person(ctx, sx, sy, zoom, th.o, th.face, t + th.phase, th.o.walking ? t * 9 : 0, V); }
        else if (th.kind === 'wall') ISOART.wall(ctx, th, toScreen, zoom, TW, TH, V, t);
        else if (th.draw) th.draw(ctx, sx, sy, zoom, t);
        else ISOART.prop(ctx, th.kind, sx, sy, zoom, th.o, t, TW, TH, V, th);
      }
      ctx.restore();
    }
  }
  const UPRIGHT = new Set(['stool', 'chair', 'bin', 'lamp', 'plant', 'hydrant', 'mailbox', 'trafficlight', 'stopsign', 'floorlamp', 'ivstand', 'coatrack', 'cafetable', 'grave', 'tree', 'phone', 'column']); // small things that stand up, with no footprint of their own
  function drawMe(t) {
    const [sx, sy] = toScreen(P.x, P.y);
    ISOART.person(ctx, sx, sy, zoom, me(), P.dir, t, P.moving ? P.step : 0, V, true);
  }
  function me() {
    const L = typeof Looks !== 'undefined' ? Looks.get() : {}; const s = typeof Looks !== 'undefined' ? Looks.sprite(L) : {};
    return { skin: L.skin, hair: L.hair, style: L.style, beard: L.beard, glasses: L.glasses, coat: '#2a2f3a', shirt: s.shirt || L.shirt, pants: s.pants || L.pants, player: true, back: P.back };
  }
  // night: darkness with the lights cut out of it, then their colour laid over the top
  function drawLight(t) {
    const amb = M.info.dark != null ? M.info.dark : .55; if (amb <= 0 && !M.lights.length) return;
    dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = M.info.darkColor || 'rgba(6,9,22,1)'; dctx.globalAlpha = amb; dctx.fillRect(0, 0, W, H); dctx.globalAlpha = 1;
    dctx.globalCompositeOperation = 'destination-out';
    const glows = [];
    const lit = M.lights.concat([{ x: P.x, y: P.y, z: 1.2, r: 2.6, i: .55, color: '#b8c4e0', ...(lamp ? lamp() : null) }]);
    for (const l of lit) {
      const i = l.flicker ? l.base * (1 - l.flicker * (Math.sin(t * 13 + l.x) > .7 || Math.random() < .03 ? 1 : 0)) : l.i;
      const [sx, sy] = toScreen(l.x, l.y, 0), r = l.r * TW * .7 * zoom; if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
      const g = dctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, `rgba(0,0,0,${Math.min(1, i)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g; dctx.save(); dctx.translate(sx, sy); dctx.scale(1, .62); dctx.translate(-sx, -sy); dctx.fillRect(sx - r, sy - r, r * 2, r * 2); dctx.restore();
      glows.push([sx, sy, r, l.color, i]);
    }
    ctx.drawImage(dark, 0, 0, W, H);
    if (low()) return; // Graphics: low skips the coloured glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [sx, sy, r, col, i] of glows) { if (col === '#b8c4e0') continue; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * .8); g.addColorStop(0, hexA(col, .22 * i)); g.addColorStop(1, hexA(col, 0)); ctx.fillStyle = g; ctx.save(); ctx.translate(sx, sy); ctx.scale(1, .62); ctx.translate(-sx, -sy); ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.restore(); }
    ctx.restore();
  }
  const hexA = (hex, a) => { const c = parseInt(hex.slice(1), 16); return `rgba(${c >> 16 & 255},${c >> 8 & 255},${c & 255},${a})`; };
  // rain, falling across the screen at a slant, and splashing
  let drops = [];
  function drawRain(dt) {
    if (!M.info.rain) return;
    const n = low() ? 70 : lowPower ? 140 : 260; while (drops.length < n) drops.push({ x: Math.random() * W, y: Math.random() * H, s: .7 + Math.random() * .6 });
    ctx.save(); ctx.strokeStyle = 'rgba(170,190,220,.32)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const d of drops) { d.y += 900 * d.s * dt; d.x -= 160 * d.s * dt; if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 100); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 4 * d.s, d.y - 22 * d.s); }
    ctx.stroke(); ctx.fillStyle = 'rgba(190,210,240,.25)';
    for (let i = 0; i < (lowPower ? 10 : 20); i++) { const x = Math.random() * W, y = Math.random() * H; ctx.fillRect(x, y, 3, 1); }
    ctx.restore();
  }

  /* ---------- moving ---------- */
  // A* over the tile grid, eight ways, no cutting corners
  function findPath(tx, ty) {
    const sx = Math.floor(P.x), sy = Math.floor(P.y); tx = Math.floor(tx); ty = Math.floor(ty);
    if (!M.inside(tx, ty)) return null;
    if (M.blocked(tx, ty) || !free(tx + .5, ty + .5)) { // the nearest free tile next to it
      let best = null, bd = 1e9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = tx + dx, y = ty + dy; if (!M.blocked(x, y) && free(x + .5, y + .5)) { const d = Math.hypot(dx, dy) + Math.hypot(x - sx, y - sy) * .01; if (d < bd) { bd = d; best = [x, y]; } } }
      if (!best) return null; [tx, ty] = best;
    }
    const key = (x, y) => y * M.w + x, open = [[sx, sy, 0, Math.hypot(tx - sx, ty - sy)]], from = new Map(), g = new Map([[key(sx, sy), 0]]);
    let n = 0;
    while (open.length && n++ < 6000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][3] < open[bi][3]) bi = i;
      const [x, y, gc] = open.splice(bi, 1)[0];
      if (x === tx && y === ty) { const out = []; let k = key(x, y); while (k !== key(sx, sy)) { out.push([k % M.w + .5, Math.floor(k / M.w) + .5]); k = from.get(k); } return out.reverse(); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy; if (M.blocked(nx, ny) || !free(nx + .5, ny + .5, .2)) continue;
        if (dx && dy && (M.blocked(x + dx, y) || M.blocked(x, y + dy))) continue;
        const ng = gc + (dx && dy ? 1.414 : 1), k = key(nx, ny);
        if (g.has(k) && g.get(k) <= ng) continue; g.set(k, ng); from.set(k, key(x, y)); open.push([nx, ny, ng, ng + Math.hypot(tx - nx, ty - ny)]);
      }
    }
    return null;
  }
  function walkTo(x, y, then) { const p = findPath(x, y); P.path = p && p.length ? p : null; P.goal = then || null; if (!P.path && then) { P.goal = null; then(); } }
  function step(dt) {
    if (busy) { P.moving = false; return; }
    // where you want to go: keys, the stick, or the path you tapped
    let mx = 0, my = 0;
    const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0), ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    const sx = kx || (stick.on ? stick.x : 0), sy = ky || (stick.on ? stick.y : 0);
    if (sx || sy) { P.path = null; P.goal = null; mx = sx * .5 + sy; my = sy - sx * .5; } // screen directions, turned into the grid's diagonals
    else if (P.path) {
      const [nx, ny] = P.path[0], dx = nx - P.x, dy = ny - P.y, d = Math.hypot(dx, dy);
      if (d < .12) { P.path.shift(); if (!P.path.length) { P.path = null; const g = P.goal; P.goal = null; if (g) setTimeout(g, 0); } }
      else { mx = dx / d; my = dy / d; }
    }
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    const top = (running() ? 4.4 * (FX && FX.run || 1) : 2.2) * (FX && FX.slow || 1);
    const k = 1 - Math.exp(-dt * (l > .05 ? 10 : 14)); P.vx += (mx * top - P.vx) * k; P.vy += (my * top - P.vy) * k;
    const stuck = !free(P.x, P.y);
    const nx = P.x + P.vx * dt, ny = P.y + P.vy * dt;
    if (stuck || free(nx, P.y)) P.x = nx; else P.vx = 0;
    if (stuck || free(P.x, ny)) P.y = ny; else P.vy = 0;
    const sp = Math.hypot(P.vx, P.vy); P.moving = sp > .3;
    if (P.moving) { P.yaw = Math.atan2(P.vx, P.vy); const sdx = P.vx - P.vy; P.dir = sdx >= 0 ? 1 : -1; P.back = P.vx + P.vy < -.1; const was = Math.sin(P.step); P.step += dt * (running() ? 13 : 9); if ((was > 0) !== (Math.sin(P.step) > 0)) footstep(sp); }
    if (P.path && sp < .05 && l > .5) P.path = null; // walked into something
  }
  let ax = null;
  function footstep(speed) {
    if (!App.state || App.state.settings.sound === false) return;
    try {
      ax = ax || new (window.AudioContext || window.webkitAudioContext)(); if (ax.state === 'suspended') ax.resume();
      const b = ax.createBuffer(1, Math.floor(ax.sampleRate * .1), ax.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const n = ax.createBufferSource(), f = ax.createBiquadFilter(), g = ax.createGain(), soft = M.info.soft;
      f.type = 'lowpass'; f.frequency.value = (soft ? 420 : M.info.rain ? 1500 : 900) * (.85 + Math.random() * .3); g.gain.value = (soft ? .012 : .022) * Math.min(1.3, speed / 2.2);
      n.buffer = b; n.connect(f); f.connect(g); g.connect(ax.destination); n.start();
    } catch (e) { }
  }

  /* ---------- using things ---------- */
  function pickFocus() {
    let best = null, bd = 1e9;
    for (const u of uses) { if (u.when && !u.when()) continue; const d = Math.hypot(u.x - P.x, u.y - P.y); if (d < u.r && d < bd) { bd = d; best = u; } }
    return best;
  }
  async function activate(u = focus) {
    if (busy || !u) return; busy = true; keys.clear(); stick.on = false; P.vx = P.vy = 0; P.path = null;
    try { await u.fn(); } finally { busy = false; }
  }
  // a tap: on something you can use, walk up to it and use it; anywhere else, walk there
  function tap(sx, sy) {
    if (busy) return;
    const [wx, wy] = toWorld(sx, sy);
    let hit = null, hd = 1e9;
    for (const u of uses) { if (u.when && !u.when()) continue; const [ux, uy] = toScreen(u.x, u.y), d = Math.hypot(ux - sx, uy - (sy + 20 * zoom)); if (d < 46 * zoom && d < hd) { hd = d; hit = u; } }
    if (hit) { if (Math.hypot(hit.x - P.x, hit.y - P.y) < hit.r) return activate(hit); return walkTo(hit.x, hit.y, () => { if (Math.hypot(hit.x - P.x, hit.y - P.y) < hit.r + .6) activate(hit); }); }
    marker = { x: wx, y: wy, t: 0 };
    walkTo(wx, wy);
  }
  let marker = null;

  /* ---------- the loop ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; const t = now / 1000;
    if (!M) return;
    step(dt);
    for (const u of updaters) u(t, dt);
    for (const l of M.lights) if (l.flicker) l.i = l.base;
    // the camera follows you, smoothly, a little ahead of where you're going
    const [px, py] = iso(P.x + P.vx * .25, P.y + P.vy * .25, 1);
    let tx = camTarget ? iso(camTarget[0], camTarget[1], 1)[0] : px, ty = camTarget ? iso(camTarget[0], camTarget[1], 1)[1] : py;
    // a room small enough to see whole is framed whole; anything bigger follows you
    const spanX = (M.w + M.h) * TW / 2 * zoom, spanY = (M.w + M.h) * TH / 2 * zoom + 120 * zoom;
    if (!camTarget && spanX < W * 1.05) tx = iso(M.w / 2, M.h / 2)[0] * .75 + px * .25;
    if (!camTarget && spanY < H * .9) ty = iso(M.w / 2, M.h / 2, 1.4)[1] * .75 + py * .25;
    cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * 5);
    let shx = 0, shy = 0; if (FX && FX.shake) { const a = Math.min(4, FX.shake * 220); shx = (Math.sin(t * 31) + Math.sin(t * 17.3) * .6) * a * .6; shy = (Math.sin(t * 27.1) + Math.sin(t * 13.7) * .5) * a * .4; } // a fine tremor, not an earthquake
    ctx.setTransform(dpr, 0, 0, dpr, shx * dpr, shy * dpr);
    if (FX && FX.sway) { ctx.translate(W / 2, H / 2); ctx.rotate(Math.sin(t * .63) * FX.sway * 1.6); ctx.translate(-W / 2, -H / 2); }
    ctx.fillStyle = M.info.bg || '#05070c'; ctx.fillRect(-50, -50, W + 100, H + 100);
    drawFloor(t);
    if (marker) { marker.t += dt; const [mx, my] = toScreen(marker.x, marker.y); ctx.strokeStyle = `rgba(232,213,160,${Math.max(0, .8 - marker.t)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(mx, my, (10 + marker.t * 14) * zoom, (5 + marker.t * 7) * zoom, 0, 0, 7); ctx.stroke(); if (marker.t > .8) marker = null; }
    drawStanding(t);
    drawLight(t);
    drawRain(dt);
    const f = busy ? null : pickFocus();
    if (f !== focus) { focus = f; if (el) { el.prompt.textContent = f ? f.label : ''; el.prompt.classList.toggle('on', !!f); el.useBtn.classList.toggle('on', !!f); } }
  }

  /* ---------- mount, places, input ---------- */
  function mount(h_) {
    host = h_; cv = document.createElement('canvas'); cv.className = 'r3-cv'; ctx = cv.getContext('2d');
    dark = document.createElement('canvas'); dctx = dark.getContext('2d');
    el = { prompt: h('div.r3-prompt'), useBtn: h('button.r3-use', { 'aria-label': 'Use', onclick: () => activate() }, '✋'), runBtn: h('button.r3-run', { 'aria-label': 'Run', 'aria-pressed': 'false', onclick: e => { runLock = !runLock; e.currentTarget.classList.toggle('on', runLock); e.currentTarget.setAttribute('aria-pressed', runLock); if (runLock && FX && FX.noRun && typeof L2 !== 'undefined') L2.toast('⚡ Too exhausted to run. Eat something, or find a coffee.'); } }, '🏃'), joy: h('div.r3-joy', h('i')), hint: h('div.r3-hint', lowPower ? 'Tap where you want to go, or tap something to use it. Drag to steer; tap 🏃 to run.' : 'Click where you want to go, or click something to use it. WASD or arrows to walk, Shift to run, E to use.') };
    host.append(cv, el.prompt, el.useBtn, el.runBtn, el.joy, el.hint);
    setTimeout(() => el && el.hint.classList.add('fade'), 7000);
    const resize = () => { dpr = Math.min(devicePixelRatio || 1, lowPower ? 2 : 2); W = host.clientWidth; H = host.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; dark.width = W; dark.height = H; zoom = Math.max(.9, Math.min(1.45, Math.min(W, H) / 360)); };
    el.resize = resize; window.addEventListener('resize', resize); resize();
    const KEYS = ['w', 'a', 's', 'd', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    el.kd = e => { if (document.querySelector('.modal-bg, .l2-over')) return; const k = e.key.toLowerCase(); if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); activate(); return; } if (KEYS.includes(k)) { e.preventDefault(); keys.add(k); } };
    el.ku = e => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', el.kd); window.addEventListener('keyup', el.ku);
    // a pointer: a quick tap walks you there; a drag steers like a stick (drag further to run)
    let down = null;
    cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, drag: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
    cv.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y, l = Math.hypot(dx, dy);
      if (!down.drag && l > 14) { down.drag = true; stick.on = true; el.joy.style.left = down.x + 'px'; el.joy.style.top = down.y + 'px'; el.joy.classList.add('on'); }
      if (down.drag) { const k = Math.min(1, l / 50); stick.x = dx / l * k; stick.y = dy / l * k; stick.run = l > 95; el.joy.classList.toggle('run', stick.run); el.joy.firstChild.style.transform = `translate(${stick.x * 26}px, ${stick.y * 26}px)`; }
    });
    const up = e => { if (!down || e.pointerId !== down.id) return; const r = cv.getBoundingClientRect(); if (!down.drag && performance.now() - down.t < 450) tap(e.clientX - r.left, e.clientY - r.top); stick.on = false; stick.run = false; el.joy.classList.remove('on', 'run'); el.joy.firstChild.style.transform = ''; down = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.style.touchAction = 'none';
    last = performance.now(); raf = requestAnimationFrame(frame);
    return true;
  }
  function unmount() {
    cancelAnimationFrame(raf); raf = 0;
    if (el) { window.removeEventListener('resize', el.resize); window.removeEventListener('keydown', el.kd); window.removeEventListener('keyup', el.ku); }
    M = null; area = null; updaters = []; uses = []; host = cv = ctx = el = null; keys.clear();
  }
  // build a place: fn(api) lays it out and returns { spawn: [x, y, dir], entries, rain, dark, ... }
  async function go(name, build, at) {
    if (host) host.classList.add('fading'); await new Promise(r => setTimeout(r, host ? 380 : 0));
    updaters = []; uses = []; focus = null; camTarget = null; P.path = null; P.goal = null; drops = [];
    M = null; area = name;
    const info = build(api, (w, h, fill) => (M = newMap(w, h, fill))) || {};
    if (!M) M = newMap(10, 10, 'concrete');
    M.info = info;
    const sp = typeof at === 'string' ? (info.entries && info.entries[at]) || info.spawn : at || info.spawn || [1, 1, 0];
    P.x = sp[0]; P.y = sp[1]; P.yaw = sp[2] || 0; P.vx = P.vy = 0;
    const [cx, cy] = iso(P.x, P.y, 1); cam.x = cx; cam.y = cy;
    if (host) { host.classList.remove('fading'); if (el) { el.prompt.textContent = ''; el.prompt.classList.remove('on'); el.useBtn.classList.remove('on'); } }
  }
  // look at a spot (for the games on the floor); view(null) gives the camera back
  function view(pos) { camTarget = pos ? [pos[0], pos[2]] : null; }

  return {
    mount, unmount, go, api, view, walkTo, setFx(v) { FX = v; }, set lamp(f) { lamp = f; }, get area() { return area; }, get busy() { return busy; }, set busy(v) { busy = v; }, player: P,
    freeze(v) { busy = v; if (v) { keys.clear(); stick.on = false; stick.run = false; P.vx = P.vy = 0; P.path = null; } }, activate, get focus() { return focus; },
    get stuck() { return !free(P.x, P.y); }, get running() { return running(); }, get hfov() { return 1.2; }, touch: lowPower,
    toScreen, toWorld, iso, get zoom() { return zoom; }, get map() { return M; }, TW, TH, V, free,
  };
})();
