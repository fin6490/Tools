/* The look of Level 2: noir, illustrated. Everything here is painted with canvas paths, no image
   files: wet tarmac and paving, carpets and lino, brick and stucco and casino-cream buildings with
   lit and dark windows, neon, and people with an inked outline and flat shading. Night does the
   rest (engine.js lays darkness over it all and cuts the lights out of it).
   Coordinates: a prop is drawn from the screen point of its anchor tile corner; box() works in
   metres relative to that anchor, so props are built out of shaded boxes, cylinders and paths. */
const ISOART = (() => {
  const INK = 'rgba(8,8,14,.7)';
  const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const shade = (hex, k) => { const c = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(c >> 16 & 255)},${f(c >> 8 & 255)},${f(c & 255)})`; };
  const rgba = (hex, a) => { const c = parseInt(hex.slice(1), 16); return `rgba(${c >> 16 & 255},${c >> 8 & 255},${c & 255},${a})`; };

  /* ---------- floors ---------- */
  const FLOORS = {
    tarmac: ['#1d2230', '#232a3a'], pavement: ['#3b4150', '#454c5c'], road: ['#191d28', '#1e2330'], carpet: ['#4a0f1c', '#56121f'], lino: ['#a9b8b0', '#b4c2ba'],
    tile: ['#c7ccd0', '#d2d6da'], wood: ['#4a2e1c', '#56361f'], grass: ['#1f3322', '#26402a'], gravel: ['#4a4842', '#55524b'], concrete: ['#3f4246', '#484b50'],
    felt: ['#0e4a32', '#0e4a32'], water: ['#0a1828', '#0c1c2e'], marble: ['#d8d2c4', '#e2dccf'], roof: ['#2a2d36', '#30333c'], hotel: ['#3a1420', '#431826'], kitchen: ['#2c3238', '#343b42'],
  };
  function floor(g, kind, v, w, h) {
    const [a, b] = FLOORS[kind] || FLOORS.concrete;
    g.fillStyle = v % 2 ? a : b; g.fillRect(0, 0, w, h);
    const r = (i) => hash(v * 31 + i, kind.length * 7 + i);
    if (kind === 'pavement' || kind === 'tile' || kind === 'marble' || kind === 'lino') { // slabs
      g.strokeStyle = kind === 'pavement' ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.12)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(w / 4, h / 4); g.lineTo(w * 3 / 4, h * 3 / 4); g.moveTo(w * 3 / 4, h / 4); g.lineTo(w / 4, h * 3 / 4); g.stroke();
      if (kind === 'marble') for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(120,110,100,.25)'; g.beginPath(); g.moveTo(r(i) * w, 0); g.quadraticCurveTo(r(i + 3) * w, h / 2, r(i + 6) * w, h); g.stroke(); }
    }
    if (kind === 'tarmac' || kind === 'road' || kind === 'gravel' || kind === 'concrete') { for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r(i) > .5 ? '255,255,255' : '0,0,0'},${.05 + r(i + 40) * .08})`; g.fillRect(r(i + 1) * w, r(i + 2) * h, 1.5, 1.5); } }
    if (kind === 'tarmac' || kind === 'road') { g.fillStyle = 'rgba(120,150,200,.07)'; g.beginPath(); g.ellipse(w * (.3 + r(9) * .4), h / 2, w * .25, h * .12, 0, 0, 7); g.fill(); } // wet sheen
    if (kind === 'carpet' || kind === 'hotel') { g.strokeStyle = 'rgba(200,150,60,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(w / 2, h * .2); g.lineTo(w * .8, h / 2); g.lineTo(w / 2, h * .8); g.lineTo(w * .2, h / 2); g.closePath(); g.stroke(); g.fillStyle = 'rgba(20,70,60,.6)'; g.beginPath(); g.ellipse(w / 2, h / 2, 5, 2.5, 0, 0, 7); g.fill(); }
    if (kind === 'wood') { g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + w / 2, h); g.stroke(); } }
    if (kind === 'grass') { for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${60 + r(i) * 40},${100 + r(i + 1) * 60},${50},.35)`; g.fillRect(r(i + 2) * w, r(i + 3) * h, 1, 3); } }
    if (kind === 'water') { g.strokeStyle = 'rgba(140,170,210,.18)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(r(i) * w * .6, h * (.3 + i * .2)); g.quadraticCurveTo(w / 2, h * (.25 + i * .2), w * (.5 + r(i + 4) * .4), h * (.3 + i * .2)); g.stroke(); } }
    if (kind === 'felt') { g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(0, 0, w, h); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h / 2); g.lineTo(w / 2, h); g.lineTo(0, h / 2); g.closePath(); g.stroke();
  }

  /* ---------- buildings: one cube per tile ---------- */
  const STYLE = {
    brick: { wall: '#5a2e26', roof: '#24262e', trim: '#2b1714', win: 1 }, stucco: { wall: '#6e6a5e', roof: '#2a2c33', trim: '#3c3a33', win: 1 },
    casino: { wall: '#c9b48a', roof: '#3a3326', trim: '#8a6d2e', win: 1, gold: true }, glass: { wall: '#1f3448', roof: '#1c232c', trim: '#0f1a26', win: 2 },
    hospital: { wall: '#b9c3c3', roof: '#4a5258', trim: '#7f8b8d', win: 1 }, concrete: { wall: '#5d6168', roof: '#33363c', trim: '#3f4248', win: 0 },
    dark: { wall: '#2a2e36', roof: '#1d2026', trim: '#15171c', win: 0 }, wood: { wall: '#4a3020', roof: '#2a1d14', trim: '#24170f', win: 1 },
    stone: { wall: '#7a776e', roof: '#3d3b36', trim: '#55524b', win: 0 }, hedge: { wall: '#1d3320', roof: '#24402a', trim: '#132416', win: 0 },
    counter: { wall: '#3a2416', roof: '#5a3a22', trim: '#20140c', win: 0 }, partition: { wall: '#8a8478', roof: '#9a9488', trim: '#5a564e', win: 0 },
  };
  function cube(ctx, c, M, sx, sy, z, TW, TH, V, t) {
    const S = STYLE[c.style] || STYLE.brick, hpx = c.h * V * z, hw = TW / 2 * z, hh = TH / 2 * z;
    const N = [sx, sy], E = [sx + hw, sy + hh], Sx = [sx, sy + TH * z], Wc = [sx - hw, sy + hh];
    const up = p => [p[0], p[1] - hpx];
    const same = (x, y) => { const o = M.cubes.get(x + ',' + y); return o && o.id === c.id; };
    const poly = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const showS = !same(c.x, c.y + 1), showE = !same(c.x + 1, c.y);
    // a face: its corners, then windows across each storey
    const face = (a, b, col, side) => {
      poly([a, b, up(b), up(a)], col);
      const lerp = (u, v) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - v * V * z];
      const floors = Math.max(1, Math.floor(c.h / 3)), door = c.o.door && c.o.door[0] === c.x && c.o.door[1] === c.y && c.o.door[2] === side;
      if (door) { // a doorway, lit from inside
        const q = [lerp(.22, 0), lerp(.78, 0), lerp(.78, 2.2), lerp(.22, 2.2)]; poly(q, c.o.doorColor || '#ffcf8a');
        ctx.strokeStyle = S.trim; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke();
      }
      if (S.win && c.h >= 2.5) for (let f = 0; f < floors; f++) {
        if (door && f === 0) continue;
        if (f === 0 && c.o.shop && side === c.o.shop) { const q = [lerp(.08, .3), lerp(.92, .3), lerp(.92, 2.4), lerp(.08, 2.4)]; poly(q, c.o.shopColor || '#e8c87a'); poly(q, 'rgba(255,255,255,.08)'); continue; }
        const lit = hash(c.x * 3 + (side === 'e' ? 1 : 0), c.y * 5 + f, 11) < (c.o.lit != null ? c.o.lit : .45);
        const wx0 = S.win === 2 ? .06 : .28, wx1 = S.win === 2 ? .94 : .72, y0 = f * 3 + (S.win === 2 ? .3 : .9), y1 = f * 3 + (S.win === 2 ? 2.8 : 2.3);
        const q = [lerp(wx0, y0), lerp(wx1, y0), lerp(wx1, y1), lerp(wx0, y1)];
        poly(q, lit ? (hash(c.x, c.y + f, 3) < .7 ? '#f2c66d' : '#9fc7ef') : '#0d1118');
        if (!lit) { ctx.save(); ctx.globalAlpha = .25; poly([q[0], lerp(wx0 + .15, y0), lerp(wx0 + .3, y1), q[3]], '#6c7f9a'); ctx.restore(); }
        ctx.strokeStyle = S.trim; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (const p of q.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.stroke();
      }
      if (S.gold) { ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 2 * z; const m = lerp(0, c.h - .3), n = lerp(1, c.h - .3); ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(n[0], n[1]); ctx.stroke(); }
      // the edge, inked
      ctx.strokeStyle = INK; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    if (showS) face(Wc, Sx, shade(S.wall, .8), 's');
    if (showE) face(Sx, E, shade(S.wall, .58), 'e');
    // the roof, with a parapet line where it meets the air
    poly([up(N), up(E), up(Sx), up(Wc)], S.roof);
    ctx.strokeStyle = shade(S.roof, 1.5); ctx.lineWidth = 2 * z; ctx.beginPath();
    if (!same(c.x, c.y - 1)) { ctx.moveTo(...up(N)); ctx.lineTo(...up(E)); }
    if (!same(c.x - 1, c.y)) { ctx.moveTo(...up(N)); ctx.lineTo(...up(Wc)); }
    if (showE) { ctx.moveTo(...up(E)); ctx.lineTo(...up(Sx)); }
    if (showS) { ctx.moveTo(...up(Wc)); ctx.lineTo(...up(Sx)); }
    ctx.stroke();
    if (showS && showE) { ctx.strokeStyle = INK; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.moveTo(...Sx); ctx.lineTo(...up(Sx)); ctx.stroke(); }
  }

  /* ---------- the back walls of a room ---------- */
  const WALLS = { plaster: '#8f8a80', paper: '#3a1e1a', hospital: '#c4cfcd', tile: '#9aa6a8', wood: '#4a2e1c', dark: '#262a33', concrete: '#55595f', red: '#5a1420', green: '#24403a' };
  function wall(ctx, w, toScreen, z, TW, TH, V, t) {
    const col = WALLS[w.style] || w.style || WALLS.plaster, hpx = w.h * V * z;
    const a = toScreen(w.x, w.y), b = w.side === 'n' ? toScreen(w.x + w.len, w.y) : toScreen(w.x, w.y + w.len);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0], b[1] - hpx); ctx.lineTo(a[0], a[1] - hpx); ctx.closePath();
    ctx.fillStyle = shade(col, w.side === 'n' ? .75 : .95); ctx.fill();
    // wallpaper stripes, a skirting board and a dado rail
    const lerp = (u, v) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - v * V * z];
    if (w.o.stripes) { ctx.strokeStyle = 'rgba(200,150,60,.18)'; ctx.lineWidth = 1; for (let i = 0; i < w.len * 3; i++) { const p = lerp(i / (w.len * 3), 0), q = lerp(i / (w.len * 3), w.h); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); const s0 = lerp(0, 0), s1 = lerp(1, 0), s2 = lerp(1, .15), s3 = lerp(0, .15); ctx.moveTo(...s0); ctx.lineTo(...s1); ctx.lineTo(...s2); ctx.lineTo(...s3); ctx.fill();
    if (w.o.rail !== false) { ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2 * z; const r0 = lerp(0, 1), r1 = lerp(1, 1); ctx.beginPath(); ctx.moveTo(...r0); ctx.lineTo(...r1); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(a[0], a[1] - hpx); ctx.lineTo(b[0], b[1] - hpx); ctx.stroke();
    // things hung on it: windows, pictures, doors
    for (const it of w.o.hang || []) {
      const [u0, u1, v0, v1] = [it.at / w.len, (it.at + it.w) / w.len, it.y || 1, (it.y || 1) + it.h];
      const q = [lerp(u0, v0), lerp(u1, v0), lerp(u1, v1), lerp(u0, v1)];
      ctx.beginPath(); ctx.moveTo(...q[0]); for (const p of q.slice(1)) ctx.lineTo(...p); ctx.closePath();
      ctx.fillStyle = it.color || (it.kind === 'window' ? '#16243a' : it.kind === 'door' ? '#2a1a12' : '#3a3020'); ctx.fill();
      if (it.kind === 'window') { ctx.save(); ctx.clip(); for (let i = 0; i < 18; i++) { const p = lerp(u0 + (u1 - u0) * ((i * 37) % 17) / 17, v0 + (v1 - v0) * ((i * 23) % 11) / 11); ctx.fillStyle = i % 3 ? '#f2c66d' : '#9fd3ff'; ctx.fillRect(p[0], p[1], 2 * z, 3 * z); } ctx.restore(); }
      if (it.draw) it.draw(ctx, q, z, t);
      ctx.strokeStyle = it.frame || '#1a1410'; ctx.lineWidth = 3 * z; ctx.stroke();
      if (it.label) { ctx.save(); const m = lerp((u0 + u1) / 2, v1 + .25); ctx.translate(m[0], m[1]); ctx.transform(1, w.side === 'n' ? .5 : -.5, 0, 1, 0, 0); ctx.font = `bold ${11 * z}px Georgia`; ctx.textAlign = 'center'; ctx.fillStyle = it.labelColor || '#e8d7a8'; ctx.shadowColor = it.labelColor || '#e8d7a8'; ctx.shadowBlur = 8; ctx.fillText(it.label, 0, 0); ctx.restore(); }
    }
  }

  /* ---------- people ---------- */
  // an inked figure seen from above at an angle: legs that walk, a coat, arms, a head with your hair
  function person(ctx, sx, sy, z, o, dir, t, step, V, isMe) {
    const s = z * (o.height || 1) * V / 40;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(s * (dir < 0 ? -1 : 1), s);
    const ink = 'rgba(6,6,12,.75)';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, 0, 7); ctx.fill();
    const walk = step ? Math.sin(step) : 0, breathe = Math.sin(t * 1.6) * .6;
    const coat = o.coat || '#333', pants = o.pants || '#222', skin = o.skin || '#c99b7a', hair = o.hair || '#2a1d14', broad = o.build === 'broad' ? 1.18 : 1;
    const R = (x, y, w, h, r, fill) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.stroke(); };
    // legs and shoes
    for (const k of [-1, 1]) { const sw = walk * 4 * k; R(k * 5 - 3.5 + sw * .3, -32 + Math.abs(sw) * .2, 7, 30 - Math.abs(sw) * .3, 3, pants); R(k * 5 - 4.5 + sw * .5, -4, 9, 5, 2.5, '#141418'); }
    if (o.skirt) { ctx.beginPath(); ctx.moveTo(-10 * broad, -38); ctx.lineTo(10 * broad, -38); ctx.lineTo(13, -14); ctx.lineTo(-13, -14); ctx.closePath(); ctx.fillStyle = coat; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }
    // the back arm, the body, the front arm
    const armSwing = walk * 5;
    R(-14 * broad - 1, -55 + breathe, 7, 25, 3.5, shade(coat, .7)); R(-15 * broad + 1 - armSwing * .25, -32 + breathe, 6, 6, 3, skin);
    const long = o.labCoat ? 22 : 0;
    ctx.beginPath(); ctx.moveTo(-12 * broad, -58 + breathe); ctx.lineTo(12 * broad, -58 + breathe); ctx.lineTo(10 * broad + (long ? 3 : 0), -28 + long * .1 + (long ? 14 : 0)); ctx.lineTo(-10 * broad - (long ? 3 : 0), -28 + long * .1 + (long ? 14 : 0)); ctx.closePath();
    ctx.fillStyle = coat; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.stroke();
    if (!o.back && (o.shirt || o.tie)) { ctx.beginPath(); ctx.moveTo(-4, -57 + breathe); ctx.lineTo(4, -57 + breathe); ctx.lineTo(0, -42 + breathe); ctx.closePath(); ctx.fillStyle = o.shirt || '#ddd'; ctx.fill(); if (o.tie) { ctx.fillStyle = o.tie; ctx.fillRect(-1.2, -55 + breathe, 2.4, 11); } }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(4 * broad, -56 + breathe, 5, 26); // the light catching one side
    R(9 * broad - 1 + armSwing * .4, -55 + breathe, 7, 25, 3.5, shade(coat, 1.05)); R(9 * broad + armSwing * .5, -32 + breathe, 6, 6, 3, skin);
    // the head
    const hy = -66 + breathe;
    R(-2.5, hy + 6, 5, 5, 2, skin);
    ctx.beginPath(); ctx.ellipse(0, hy, 8.5, 9.5, 0, 0, 7); ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.stroke();
    const style = o.style || (o.longHair ? 'long' : o.bun ? 'bun' : o.bald ? 'bald' : 'short');
    ctx.fillStyle = hair;
    if (style !== 'bald' && style !== 'buzz') { ctx.beginPath(); ctx.ellipse(0, hy - 3.5, 9, 7, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-9, hy - 4, 3, 7); if (o.back) { ctx.beginPath(); ctx.ellipse(0, hy, 9, 9.5, 0, 0, 7); ctx.fill(); } }
    if (style === 'buzz') { ctx.globalAlpha = .6; ctx.beginPath(); ctx.ellipse(0, hy - 3, 8.6, 6, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1; }
    if (style === 'long' || style === 'bob' || style === 'pony') { ctx.beginPath(); ctx.moveTo(-9, hy - 3); ctx.quadraticCurveTo(-12, hy + (style === 'bob' ? 8 : 16), -6, hy + (style === 'bob' ? 9 : 18)); ctx.lineTo(-4, hy + 2); ctx.closePath(); ctx.fill(); }
    if (style === 'bun') { ctx.beginPath(); ctx.arc(-4, hy - 10, 4, 0, 7); ctx.fill(); }
    if (style === 'curly') for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-7 + i * 2.3, hy - 7 + (i % 2), 3, 0, 7); ctx.fill(); }
    if (!o.back) {
      ctx.fillStyle = '#16120f'; ctx.fillRect(2, hy - 1, 1.8, 2); ctx.fillRect(5.5, hy - 1, 1.6, 2); // eyes, looking the way you face
      if (o.beard === 'full' || o.beard === 'goatee') { ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(3, hy + 6, o.beard === 'full' ? 6.5 : 3, 3.5, 0, 0, 7); ctx.fill(); }
      if (o.beard === 'stubble') { ctx.fillStyle = 'rgba(30,25,20,.25)'; ctx.beginPath(); ctx.ellipse(2.5, hy + 5, 6, 3.5, 0, 0, 7); ctx.fill(); }
      if (o.beard === 'stache') { ctx.fillStyle = hair; ctx.fillRect(1.5, hy + 3.2, 7, 1.8); }
      if (o.glasses) { ctx.strokeStyle = '#0c0c0c'; ctx.lineWidth = 1; ctx.strokeRect(1, hy - 2.2, 3.4, 3); ctx.strokeRect(4.8, hy - 2.2, 3.4, 3); }
    }
    ctx.restore();
    if (isMe) { ctx.save(); ctx.strokeStyle = 'rgba(232,213,160,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx, sy, 17 * z, 7 * z, 0, 0, 7); ctx.stroke(); ctx.restore(); } // so you can always find yourself
  }

  /* ---------- props ---------- */
  // a shaded box in metres from the prop's anchor: dx, dy along the floor, dz up; w, d, h its size
  function boxer(ctx, sx, sy, z, TW, TH, V) {
    const pj = (x, y, h = 0) => [sx + (x - y) * TW / 2 * z, sy + (x + y) * TH / 2 * z - h * V * z];
    const poly = (pts, fill, stroke) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke !== false) { ctx.strokeStyle = INK; ctx.lineWidth = .9 * z; ctx.stroke(); } };
    const box = (x, y, h0, w, d, hgt, col, top) => {
      poly([pj(x, y + d, h0), pj(x + w, y + d, h0), pj(x + w, y + d, h0 + hgt), pj(x, y + d, h0 + hgt)], shade(col, .78));
      poly([pj(x + w, y, h0), pj(x + w, y + d, h0), pj(x + w, y + d, h0 + hgt), pj(x + w, y, h0 + hgt)], shade(col, .6));
      poly([pj(x, y, h0 + hgt), pj(x + w, y, h0 + hgt), pj(x + w, y + d, h0 + hgt), pj(x, y + d, h0 + hgt)], top || col);
    };
    const cyl = (x, y, h0, r, hgt, col, top) => { const [cx, cy] = pj(x, y, h0), rx = r * TW * .71 * z, ry = r * TH * .71 * z, hp = hgt * V * z; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); ctx.lineTo(cx - rx, cy - hp); ctx.ellipse(cx, cy - hp, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fillStyle = shade(col, .7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = .9 * z; ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy - hp, rx, ry, 0, 0, 7); ctx.fillStyle = top || col; ctx.fill(); ctx.stroke(); };
    const glowAt = (x, y, h, col, r) => { const [cx, cy] = pj(x, y, h); const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * z); g.addColorStop(0, rgba(col, .8)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(cx - r * z, cy - r * z, r * 2 * z, r * 2 * z); };
    const text = (x, y, h, str, col, size, side = 's', font = 'bold') => { const [cx, cy] = pj(x, y, h); ctx.save(); ctx.translate(cx, cy); ctx.transform(1, side === 's' ? .5 : side === 'e' ? -.5 : 0, 0, 1, 0, 0); ctx.font = `${font} ${size * z}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = col; ctx.shadowBlur = 10 * z; ctx.fillStyle = col; ctx.fillText(str, 0, 0); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(str, 0, 0); ctx.restore(); };
    return { pj, poly, box, cyl, glowAt, text };
  }
  const FOOT = { // footprints [dx0, dy0, dx1, dy1] from the anchor, for props you can't walk through
    car: [-.9, -2.1, .9, 2.1], carx: [-2.1, -.9, 2.1, .9], bj: [-1.2, -.7, 1.2, .7], poker: [-1.4, -.9, 1.4, .9], roulette: [-1.4, -.7, 1.4, .7], slot: [-.4, -.4, .4, .4], bar: [0, 0, 1, 1],
    bed: [0, 0, 1.4, 2.1], desk: [0, 0, 1.4, .7], sofa: [0, 0, 2, .8], plant: [-.25, -.25, .25, .25], lamp: [-.15, -.15, .15, .15], bench: [-.8, -.25, .8, .25], benchy: [-.25, -.8, .25, .8], tree: [-.3, -.3, .3, .3],
    phone: [-.3, -.3, .3, .3], shelter: [-1.2, -.5, 1.2, .5], vending: [-.45, -.4, .45, .4], cooler: [-.2, -.2, .2, .2], shelf: [0, 0, 2, .6], fridge: [0, 0, 1, .7], counter: [0, 0, 1, 1], cage: [0, 0, 1, 1],
    grave: [-.4, -.15, .4, .15], pillar: [-.4, -.4, .4, .4], screens: [0, 0, 3, .4], chair: [-.25, -.25, .25, .25], wheel: [-.6, -.3, .6, .3], pusher: [-.6, -.5, .6, .5], sicbo: [-1, -.6, 1, .6],
    bin: [-.25, -.25, .25, .25], crate: [-.4, -.4, .4, .4], hydrant: [-.15, -.15, .15, .15], piano: [0, 0, 1.6, .8], pew: [0, 0, 2.4, .5], altar: [-.8, -.4, .8, .4], bus: [-1.2, -4, 1.2, 4],
  };
  const solidProp = k => !!FOOT[k];
  const foot = (k, x, y, o) => { const f = (o && o.rot && FOOT[k + 'x']) || FOOT[k]; return [x + f[0], y + f[1], x + f[2], y + f[3]]; };
  function prop(ctx, kind, sx, sy, z, o, t, TW, TH, V, th) {
    const B = boxer(ctx, sx, sy, z, TW, TH, V), { pj, poly, box, cyl, glowAt, text } = B;
    const col = o.color;
    switch (kind) {
      case 'car': { // a saloon parked along the street (o.rot: across), body, glass, wheels, lights
        const c = col || '#3a4252', L = o.rot ? [-2.1, -.85, 4.2, 1.7] : [-.85, -2.1, 1.7, 4.2], [x0, y0, w, d] = L;
        ctx.fillStyle = 'rgba(0,0,0,.4)'; poly([pj(x0 - .1, y0 - .1), pj(x0 + w + .1, y0 - .1), pj(x0 + w + .1, y0 + d + .1), pj(x0 - .1, y0 + d + .1)], 'rgba(0,0,0,.4)', false);
        for (const [wx, wy] of o.rot ? [[-1.3, -.85], [1.3, -.85], [-1.3, .85], [1.3, .85]] : [[-.85, -1.3], [.85, -1.3], [-.85, 1.3], [.85, 1.3]]) cyl(wx, wy, 0, .3, .2, '#0e0e10');
        box(x0, y0, .25, w, d, .55, c);
        const [gx, gy, gw, gd] = o.rot ? [-1.1, -.75, 2.1, 1.5] : [-.75, -1.1, 1.5, 2.1];
        box(gx, gy, .8, gw, gd, .45, '#121a26', shade(c, 1.1));
        poly(o.rot ? [pj(gx + gw, gy, .82), pj(gx + gw, gy + gd, .82), pj(gx + gw - .3, gy + gd, 1.22), pj(gx + gw - .3, gy, 1.22)] : [pj(gx, gy + gd, .82), pj(gx + gw, gy + gd, .82), pj(gx + gw, gy + gd - .3, 1.22), pj(gx, gy + gd - .3, 1.22)], 'rgba(150,180,220,.22)', false); // glass sheen
        if (o.lights) { glowAt(o.rot ? 2.1 : -.5, o.rot ? -.5 : 2.1, .55, '#fff2c0', 18); glowAt(o.rot ? 2.1 : .5, o.rot ? .5 : 2.1, .55, '#fff2c0', 18); }
        if (o.plate) text(o.rot ? 2.12 : 0, o.rot ? 0 : 2.12, .38, o.plate, '#efe9c8', 7, o.rot ? 'e' : 's', 'bold');
        break;
      }
      case 'bj': case 'poker': case 'roulette': { // a table: wooden rail, felt, chips, a little lamp glow
        const [w, d] = kind === 'poker' ? [2.8, 1.8] : kind === 'roulette' ? [2.8, 1.4] : [2.4, 1.4];
        box(-w / 2, -d / 2, 0, w, d, .78, '#3a2214', '#5a3a22');
        poly([pj(-w / 2 + .15, -d / 2 + .15, .79), pj(w / 2 - .15, -d / 2 + .15, .79), pj(w / 2 - .15, d / 2 - .15, .79), pj(-w / 2 + .15, d / 2 - .15, .79)], '#0e5a3a');
        if (kind === 'roulette') { const [cx, cy] = pj(-.7, 0, .82); ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .5); ctx.rotate(t * 1.4); for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 2 ? '#8a1010' : '#111'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 22 * z, i / 18 * 6.283, (i + 1) / 18 * 6.283); ctx.fill(); } ctx.fillStyle = '#c9a14a'; ctx.beginPath(); ctx.arc(0, 0, 7 * z, 0, 7); ctx.fill(); ctx.restore(); }
        else { ctx.strokeStyle = 'rgba(230,220,180,.35)'; ctx.lineWidth = 1.2 * z; ctx.beginPath(); const a = pj(-.6, .2, .8), b = pj(.6, .2, .8); ctx.moveTo(...a); ctx.quadraticCurveTo(pj(0, .6, .8)[0], pj(0, .6, .8)[1], ...b); ctx.stroke(); }
        for (let i = 0; i < 5; i++) cyl(-.6 + i * .3, .35, .8, .06, .05 + (i % 3) * .03, ['#c0392b', '#2471a3', '#1e8449', '#7d3c98', '#e8e8e8'][i]);
        break;
      }
      case 'slot': { box(-.35, -.35, 0, .7, .7, 1.7, '#2a1018', '#3a1620'); const s = poly; s([pj(-.25, .36, .8), pj(.25, .36, .8), pj(.25, .36, 1.3), pj(-.25, .36, 1.3)], (t * 3 | 0) % 2 && o.hot ? '#ffdf6a' : '#16202e'); text(0, .36, 1.5, o.label || '777', '#ff3b6b', 7, 's'); glowAt(0, .4, 1.4, '#ff3b6b', 20); break; }
      case 'bar': box(0, 0, 0, o.w || 1, o.d || 1, 1.05, '#3a2214', '#6a4426'); break;
      case 'counter': box(0, 0, 0, o.w || 1, o.d || 1, .95, col || '#4a4f58', o.top || '#8a8f98'); break;
      case 'stool': cyl(0, 0, 0, .08, .7, '#222'); cyl(0, 0, .7, .2, .08, '#7a1a2a'); break;
      case 'chair': box(-.22, -.22, 0, .44, .44, .45, col || '#3a4a5a'); box(-.22, -.22, .45, .44, .08, .5, col || '#3a4a5a'); break;
      case 'bed': box(0, 0, 0, 1.4, 2.1, .45, '#7a8188', '#e8ecef'); box(.2, .1, .45, 1, .45, .12, '#fff', '#fff'); box(0, 1, .46, 1.4, 1.05, .06, o.sheet || '#9fb2c4'); break;
      case 'desk': box(0, 0, 0, o.w || 1.4, o.d || .7, .75, col || '#5a3a22', o.top || '#6e4a2c'); if (o.lamp) { cyl(.25, .2, .75, .08, .35, '#c9a14a'); glowAt(.25, .2, 1.15, '#ffd9a0', 30); } if (o.screen) { box(.6, .1, .75, .5, .06, .35, '#111', '#222'); poly([pj(.62, .17, .8), pj(1.08, .17, .8), pj(1.08, .17, 1.07), pj(.62, .17, 1.07)], '#3d7a8a', false); } break;
      case 'sofa': box(0, 0, 0, 2, .8, .45, col || '#5a1a2a'); box(0, 0, .45, 2, .25, .4, col || '#5a1a2a'); break;
      case 'plant': cyl(0, 0, 0, .2, .35, '#d8d2c8'); for (let i = 0; i < 7; i++) { const [cx, cy] = pj(Math.cos(i) * .12, Math.sin(i) * .12, .6 + (i % 3) * .2); ctx.fillStyle = i % 2 ? '#2e5a2a' : '#3f6a3a'; ctx.beginPath(); ctx.ellipse(cx, cy, 6 * z, 11 * z, Math.cos(i) * .6, 0, 7); ctx.fill(); } break;
      case 'lamp': { cyl(0, 0, 0, .06, 4.2, '#1c1e24'); box(-.05, -.05, 4.2, .6, .12, .1, '#1c1e24'); glowAt(.5, 0, 4.15, o.color || '#ffcf8a', 34); const [cx, cy] = pj(.5, 0, 0); const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70 * z); g.addColorStop(0, rgba(o.color || '#ffcf8a', .22)); g.addColorStop(1, rgba(o.color || '#ffcf8a', 0)); ctx.fillStyle = g; ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .5); ctx.translate(-cx, -cy); ctx.fillRect(cx - 70 * z, cy - 70 * z, 140 * z, 140 * z); ctx.restore(); break; }
      case 'bench': box(o.rot ? -.25 : -.8, o.rot ? -.8 : -.25, .4, o.rot ? .5 : 1.6, o.rot ? 1.6 : .5, .08, '#4a3020'); break;
      case 'tree': { cyl(0, 0, 0, .12, 1.8, '#2a1d14'); for (let i = 0; i < 6; i++) { const [cx, cy] = pj(Math.cos(i * 1.7) * .4, Math.sin(i * 1.7) * .4, 2.3 + (i % 3) * .35); ctx.fillStyle = ['#152a18', '#1c3520', '#203d24'][i % 3]; ctx.beginPath(); ctx.arc(cx, cy, 22 * z, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = .8 * z; ctx.stroke(); } break; }
      case 'phone': box(-.3, -.3, 0, .6, .6, 2.2, '#8a1414', '#a31a1a'); poly([pj(-.2, .31, .9), pj(.2, .31, .9), pj(.2, .31, 2), pj(-.2, .31, 2)], 'rgba(160,200,230,.3)'); text(0, .31, 2.1, 'PHONE', '#ffe6a8', 5, 's'); glowAt(0, .3, 1.9, '#ffe6a8', 16); break;
      case 'shelter': box(-1.2, -.5, 0, 2.4, .1, 2.2, '#2a3440', 'rgba(150,180,220,.25)'); box(-1.2, -.5, 2.2, 2.4, 1, .1, '#20262e'); box(-1.1, -.3, .45, 2.2, .35, .08, '#444'); text(0, -.38, 1.9, 'CALDER ST', '#cfe0f0', 6, 's'); glowAt(0, 0, 2.1, '#cfe0f0', 26); break;
      case 'vending': box(-.45, -.4, 0, .9, .8, 1.9, '#8a1420'); poly([pj(-.35, .41, .4), pj(.25, .41, .4), pj(.25, .41, 1.7), pj(-.35, .41, 1.7)], '#0f1a24'); for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) { const [x, y] = pj(-.3 + c * .18, .42, 1.55 - r * .25); ctx.fillStyle = ['#3fa9f5', '#f5c83f', '#e04040', '#5fd36a'][(r + c) % 4]; ctx.fillRect(x, y, 5 * z, 7 * z); } glowAt(0, .5, 1.1, '#9fd3ff', 30); break;
      case 'cooler': box(-.2, -.2, 0, .4, .4, 1, '#e8ecef'); cyl(0, 0, 1, .15, .42, '#9cc8ee'); break;
      case 'shelf': box(0, 0, 0, o.w || 2, .6, 1.8, '#3a3f48'); for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) { const [x, y] = pj(.1 + i * ((o.w || 2) - .2) / 8, .62, .25 + r * .42); ctx.fillStyle = o.booze ? ['#5a2a10', '#2a5a2a', '#8a6a20', '#c8c0a0'][(i + r) % 4] : ['#e04040', '#3fa9f5', '#f5c83f', '#5fd36a', '#e8e8e8'][(i * 3 + r) % 5]; ctx.fillRect(x, y - 12 * z, 5 * z, 12 * z); } break;
      case 'fridge': box(0, 0, 0, o.w || 1, .7, 2, '#d8dde2'); poly([pj(.05, .71, .2), pj((o.w || 1) - .05, .71, .2), pj((o.w || 1) - .05, .71, 1.9), pj(.05, .71, 1.9)], 'rgba(170,220,255,.35)'); glowAt((o.w || 1) / 2, .75, 1.1, '#bfe6ff', 26); break;
      case 'cage': box(0, 0, 0, o.w || 1, o.d || 1, 1.1, '#4a3a1a', '#8a6d2e'); for (let i = 0; i <= 6; i++) { const a = pj(i * (o.w || 1) / 6, o.d || 1, 1.1), b = pj(i * (o.w || 1) / 6, o.d || 1, 2.3); ctx.strokeStyle = '#c9a14a'; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } text((o.w || 1) / 2, o.d || 1, 2.5, 'CASHIER', '#e8d7a8', 8, 's'); break;
      case 'grave': box(-.4, -.12, 0, .8, .24, o.h || 1.1, '#8a877e', '#9a978e'); if (o.name) text(0, .13, (o.h || 1.1) * .65, o.name, '#2a2a2a', 6, 's', 'bold'); break;
      case 'pillar': box(-.4, -.4, 0, .8, .8, o.h || 4, col || '#c9b48a'); break;
      case 'screens': { box(0, 0, 0, o.w || 3, .4, .8, '#1a1e24'); for (let r = 0; r < 3; r++) for (let i = 0; i < (o.w || 3) * 2; i++) { const q = [pj(.05 + i * .5, .1, 1 + r * .55), pj(.45 + i * .5, .1, 1 + r * .55), pj(.45 + i * .5, .1, 1.45 + r * .55), pj(.05 + i * .5, .1, 1.45 + r * .55)]; poly(q, `hsl(${190 + ((i + r) * 13) % 40},40%,${18 + ((t * 2 + i + r) | 0) % 3 * 4}%)`); } glowAt((o.w || 3) / 2, .2, 1.8, '#6fc3e8', 60); break; }
      case 'rug': poly([pj(0, 0, .01), pj(o.w || 2, 0, .01), pj(o.w || 2, o.d || 1.4, .01), pj(0, o.d || 1.4, .01)], col || '#5a1a2a'); break;
      case 'wheel': { box(-.15, -.15, 0, .3, .3, 1.2, '#2a1a10'); const [cx, cy] = pj(0, 0, 2.4); ctx.save(); ctx.translate(cx, cy); ctx.transform(1, .5, 0, 1, 0, 0); ctx.rotate(o.spin || 0); const segs = 27; for (let i = 0; i < segs; i++) { ctx.fillStyle = ['#e8d9a8', '#3a7ad9', '#7b3fb8', '#2f9d55', '#c0392b'][i % 5]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 34 * z, i / segs * 6.283, (i + 1) / segs * 6.283); ctx.fill(); } ctx.fillStyle = '#c9a14a'; ctx.beginPath(); ctx.arc(0, 0, 10 * z, 0, 7); ctx.fill(); ctx.restore(); text(0, .1, 3.5, 'BIG SIX', '#f0d78c', 8, 's'); break; }
      case 'pusher': box(-.6, -.5, 0, 1.2, 1, 1.2, '#2a1a3a'); poly([pj(-.5, .51, .5), pj(.5, .51, .5), pj(.5, .51, 1.1), pj(-.5, .51, 1.1)], 'rgba(200,230,255,.25)'); for (let i = 0; i < 12; i++) { const [x, y] = pj(-.4 + (i % 6) * .16, .5, .6 + (i / 6 | 0) * .12); ctx.fillStyle = '#e8c860'; ctx.beginPath(); ctx.ellipse(x, y, 4 * z, 2 * z, 0, 0, 7); ctx.fill(); } text(0, .5, 1.45, o.label || 'COIN PUSHER', '#ffd34d', 6, 's'); glowAt(0, .55, 1, '#ffd34d', 26); break;
      case 'sicbo': box(-1, -.6, 0, 2, 1.2, .8, '#3a2214', '#5a3a22'); poly([pj(-.85, -.45, .81), pj(.85, -.45, .81), pj(.85, .45, .81), pj(-.85, .45, .81)], '#123a5a'); for (let i = 0; i < 3; i++) box(-.2 + i * .15, -.05, .82, .1, .1, .1, '#f4f0e6'); break;
      case 'bin': cyl(0, 0, 0, .22, .8, '#2a3038'); break;
      case 'crate': box(-.4, -.4, 0, .8, .8, .8, '#5a4428'); break;
      case 'hydrant': cyl(0, 0, 0, .12, .6, '#a31a1a'); break;
      case 'pew': box(0, 0, 0, 2.4, .5, .45, '#4a2e1c'); box(0, 0, .45, 2.4, .1, .5, '#4a2e1c'); break;
      case 'altar': box(-.8, -.4, 0, 1.6, .8, 1, '#e8e2d4'); for (const x of [-.5, .5]) { cyl(x, 0, 1, .03, .3, '#f4f0e6'); glowAt(x, 0, 1.35, '#ffd9a0', 14); } break;
      case 'piano': box(0, 0, 0, 1.6, .8, 1.1, '#111'); break;
      case 'fence': { const n = o.len || 4; for (let i = 0; i <= n * 3; i++) { const a = pj(o.rot ? 0 : i / 3, o.rot ? i / 3 : 0, 0), b = pj(o.rot ? 0 : i / 3, o.rot ? i / 3 : 0, 1.3); ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } break; }
      case 'puddle': { const [cx, cy] = pj(0, 0, 0); ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .5); const g = ctx.createRadialGradient(0, 0, 2, 0, 0, (o.r || 1) * 40 * z); g.addColorStop(0, 'rgba(120,150,200,.22)'); g.addColorStop(1, 'rgba(60,80,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, (o.r || 1) * 40 * z, 0, 7); ctx.fill(); ctx.restore(); break; }
      case 'tape': { const a = pj(o.x0 || 0, o.y0 || 0, 1), b = pj(o.x1 || 2, o.y1 || 0, 1); ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 3 * z; ctx.setLineDash([8 * z, 6 * z]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.setLineDash([]); break; }
      case 'bed2': box(0, 0, 0, 1.6, 2.1, .5, '#4a2a1a', '#e8e0d0'); box(.2, .1, .5, 1.2, .45, .12, '#fff', '#fff'); break;
      case 'tv': box(0, 0, .8, o.w || 1.2, .08, .7, '#0a0a0a'); break;
      case 'mirror': break;
      case 'sign': text(0, 0, o.z || 2.6, o.text, o.color || '#ff3b6b', o.size || 10, o.side || 's', o.font || 'bold'); break;
      case 'bus': box(-1.2, -4, 0, 2.4, 8, 2.8, '#c9a03a'); break;
      default: box(-.3, -.3, 0, .6, .6, .6, col || '#555');
    }
  }
  return { floor, cube, wall, person, prop, solidProp, foot, boxer, shade, rgba, hash, FLOORS, STYLE };
})();
