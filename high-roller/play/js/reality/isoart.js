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
  // a texture per style (brick courses, stucco speckle, stone blocks, glass mullions, casino panels),
  // painted once, then sheared onto each face so it runs continuously across a building
  const TEX = {};
  function tex(ctx, style) {
    if (TEX[style] !== undefined) return TEX[style];
    const c = document.createElement('canvas'), g = c.getContext('2d'); let w = 32, h = 12;
    if (style === 'brick' || style === 'wood') { c.width = w = 32; c.height = h = 12; for (let r = 0; r < 2; r++) for (let i = -1; i < 3; i++) { const x = i * 16 + (r ? 8 : 0); g.fillStyle = `rgba(${hash(i, r, 3) > .5 ? '255,220,200' : '0,0,0'},${.03 + hash(i, r, 5) * .06})`; g.fillRect(x + 1, r * 6 + 1, 14, 4); } g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 5, w, 1); g.fillRect(0, 11, w, 1); g.fillRect(7, 0, 1, 6); g.fillRect(23, 0, 1, 6); g.fillRect(15, 6, 1, 6); g.fillRect(31, 6, 1, 6); }
    else if (style === 'stucco' || style === 'hospital' || style === 'partition') { c.width = w = 24; c.height = h = 24; for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${hash(i, 1) > .5 ? '255,255,255' : '0,0,0'},${.04 + hash(i, 2) * .05})`; g.fillRect(hash(i, 3) * w, hash(i, 4) * h, 1.5, 1.5); } if (style === 'hospital') { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 23, w, 1); } }
    else if (style === 'stone') { c.width = w = 40; c.height = h = 20; g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 9, w, 1); g.fillRect(0, 19, w, 1); g.fillRect(12, 0, 1, 10); g.fillRect(32, 10, 1, 10); for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(255,255,255,${.02 + hash(i, 9) * .05})`; g.fillRect((i % 2) * 20 + 2, (i >> 1) * 10 + 1, 16, 7); } }
    else if (style === 'casino') { c.width = w = 32; c.height = h = 40; g.fillStyle = 'rgba(255,240,200,.12)'; g.fillRect(2, 0, 3, h); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(5, 0, 1, h); g.fillRect(0, 39, w, 1); }
    else if (style === 'glass') { c.width = w = 16; c.height = h = 20; g.fillStyle = 'rgba(150,190,230,.08)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 1, h); g.fillRect(0, 0, w, 1); }
    else if (style === 'concrete' || style === 'dark') { c.width = w = 48; c.height = h = 40; g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 39, w, 1); g.fillRect(47, 0, 1, h); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${hash(i, 7) * .08})`; g.fillRect(hash(i, 8) * w, hash(i, 9) * h, 2, 1); } }
    else return (TEX[style] = null);
    return (TEX[style] = ctx.createPattern(c, 'repeat'));
  }
  function cube(ctx, c, M, sx, sy, z, TW, TH, V, t) {
    const S = STYLE[c.style] || STYLE.brick, hpx = c.h * V * z, hw = TW / 2 * z, hh = TH / 2 * z;
    const N = [sx, sy], E = [sx + hw, sy + hh], Sx = [sx, sy + TH * z], Wc = [sx - hw, sy + hh];
    const up = p => [p[0], p[1] - hpx];
    const same = (x, y) => { const o = M.cubes.get(x + ',' + y); return o && o.id === c.id; };
    const poly = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const line = (p, q, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w * z; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
    const showS = !same(c.x, c.y + 1), showE = !same(c.x + 1, c.y);
    const ox = sx - (c.x - c.y) * hw, oy = sy - (c.x + c.y) * hh; // where the world's origin is on screen, so textures line up
    const T = tex(ctx, c.style);
    // a face: its corners, then windows across each storey
    const face = (a, b, col, side) => {
      poly([a, b, up(b), up(a)], col);
      if (T) { T.setTransform(new DOMMatrix([z, side === 's' ? .5 * z : -.5 * z, 0, z, ox, oy])); ctx.save(); ctx.globalAlpha = .9; poly([a, b, up(b), up(a)], T); ctx.restore(); }
      const lerp = (u, v) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - v * V * z];
      const floors = Math.max(1, Math.floor(c.h / 3)), door = c.o.door && c.o.door[0] === c.x && c.o.door[1] === c.y && c.o.door[2] === side;
      // a darker plinth at the foot, a ledge at every storey, a cornice at the top
      poly([lerp(0, 0), lerp(1, 0), lerp(1, .35), lerp(0, .35)], 'rgba(0,0,0,.22)');
      for (let f = 1; f < floors; f++) { line(lerp(0, f * 3), lerp(1, f * 3), 'rgba(255,255,255,.08)', 2); line(lerp(0, f * 3 - .06), lerp(1, f * 3 - .06), 'rgba(0,0,0,.25)', 1); }
      if (c.h >= 2.5) { poly([lerp(0, c.h - .32), lerp(1, c.h - .32), lerp(1, c.h), lerp(0, c.h)], shade(S.trim, 1.25)); line(lerp(0, c.h - .32), lerp(1, c.h - .32), 'rgba(0,0,0,.4)', 1); }
      if (door) { // a doorway, lit from inside, with a step and a lamp over it
        const q = [lerp(.2, .05), lerp(.8, .05), lerp(.8, 2.3), lerp(.2, 2.3)]; poly(q, c.o.doorColor || '#ffcf8a');
        const g = ctx.createLinearGradient(0, q[3][1], 0, q[0][1]); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); poly(q, g);
        ctx.strokeStyle = shade(S.trim, .8); ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[3]); ctx.lineTo(...q[2]); ctx.lineTo(...q[1]); ctx.stroke();
        poly([lerp(.12, 0), lerp(.88, 0), lerp(.88, .1), lerp(.12, .1)], shade(S.trim, 1.4));
        const l = lerp(.5, 2.6); ctx.fillStyle = '#ffe2a8'; ctx.beginPath(); ctx.arc(l[0], l[1], 2.4 * z, 0, 7); ctx.fill();
      }
      if (S.win && c.h >= 2.5) for (let f = 0; f < floors; f++) {
        if (door && f === 0) continue;
        if (f === 0 && c.o.shop && side === c.o.shop) { // a shop window: lit, with shelves and stock inside
          const q = [lerp(.06, .45), lerp(.94, .45), lerp(.94, 2.3), lerp(.06, 2.3)]; poly(q, c.o.shopColor || '#e8c87a');
          if (c.o.shopKind === 'pub' || c.o.shopKind === 'diner') { // warm light, people at tables, a hanging lamp
            const g = ctx.createLinearGradient(0, q[3][1], 0, q[0][1]); g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(90,40,10,.35)'); poly(q, g);
            for (let i = 0; i < 2; i++) if (hash(c.x, c.y, i + 30) < .7) { const m = lerp(.28 + i * .42, .45); ctx.fillStyle = 'rgba(40,20,10,.6)'; ctx.beginPath(); ctx.arc(m[0], m[1] - 34 * z, 5 * z, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(m[0] - 8 * z, m[1]); ctx.lineTo(m[0] - 7 * z, m[1] - 26 * z); ctx.lineTo(m[0] + 7 * z, m[1] - 26 * z); ctx.lineTo(m[0] + 8 * z, m[1]); ctx.fill(); }
            const lp = lerp(.5, 2.1); ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(lp[0], lp[1], 3 * z, 0, 7); ctx.fill();
            if (c.o.shopKind === 'pub') poly([lerp(.06, .45), lerp(.94, .45), lerp(.94, 1.1), lerp(.06, 1.1)], 'rgba(120,60,20,.55)');
          } else for (let r = 0; r < 3; r++) { line(lerp(.08, .9 + r * .5), lerp(.92, .9 + r * .5), 'rgba(60,40,20,.45)', 1.5); for (let i = 0; i < 6; i++) { const p = lerp(.12 + i * .13 + hash(c.x, r, i) * .04, .95 + r * .5); ctx.fillStyle = ['#c0392b', '#2471a3', '#e8e8e8', '#1e8449', '#d4a017'][(i + r + c.x) % 5]; ctx.fillRect(p[0] - 1.5 * z, p[1] - 4 * z, 3 * z, 4 * z); } }
          poly([q[0], lerp(.3, .45), lerp(.55, 2.3), q[3]], 'rgba(255,255,255,.1)');
          ctx.strokeStyle = shade(S.trim, .7); ctx.lineWidth = 2.5 * z; ctx.beginPath(); ctx.moveTo(...q[0]); for (const p of q.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.stroke();
          if (c.o.awning) { // a striped awning, out over the pavement
            const out = side === 's' ? [0, 1] : [1, 0], A0 = lerp(0, 2.75), A1 = lerp(1, 2.75), dx = (out[0] - out[1]) * hw * .75, dy = (out[0] + out[1]) * hh * .75 + .55 * V * z;
            const B0 = [A0[0] + dx, A0[1] + dy], B1 = [A1[0] + dx, A1[1] + dy];
            for (let i = 0; i < 6; i++) { const u0 = i / 6, u1 = (i + 1) / 6, m = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]; poly([m(A0, A1, u0), m(A0, A1, u1), m(B0, B1, u1), m(B0, B1, u0)], i % 2 ? c.o.awning : '#e8e2d4'); }
            ctx.strokeStyle = INK; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(...A0); ctx.lineTo(...B0); ctx.lineTo(...B1); ctx.lineTo(...A1); ctx.stroke();
            for (let i = 0; i < 6; i++) { const p = [B0[0] + (B1[0] - B0[0]) * (i + .5) / 6, B0[1] + (B1[1] - B0[1]) * (i + .5) / 6]; ctx.fillStyle = i % 2 ? c.o.awning : '#e8e2d4'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2 * z, 0, Math.PI); ctx.fill(); }
          }
          continue;
        }
        const k = hash(c.x * 3 + (side === 'e' ? 1 : 0), c.y * 5 + f, 11), lit = k < (c.o.lit != null ? c.o.lit : .45);
        const wx0 = S.win === 2 ? .08 : .27, wx1 = S.win === 2 ? .92 : .73, y0 = f * 3 + (S.win === 2 ? .35 : .85), y1 = f * 3 + (S.win === 2 ? 2.75 : 2.35);
        const q = [lerp(wx0, y0), lerp(wx1, y0), lerp(wx1, y1), lerp(wx0, y1)];
        const warm = hash(c.x, c.y + f, 3) < .72;
        poly(q, lit ? (warm ? '#f4c768' : '#a8cdf0') : '#0d1118');
        if (lit) { // what's behind the glass: curtains, blinds, now and then someone
          const kind = (k * 97 | 0) % 4;
          if (kind === 0) { poly([q[0], lerp(wx0 + .1, y0), lerp(wx0 + .12, y1), q[3]], warm ? '#a8402a' : '#3a5a8a'); poly([lerp(wx1 - .1, y0), q[1], q[2], lerp(wx1 - .12, y1)], warm ? '#a8402a' : '#3a5a8a'); }
          if (kind === 1) for (let i = 1; i < 6; i++) line(lerp(wx0, y0 + (y1 - y0) * i / 6), lerp(wx1, y0 + (y1 - y0) * i / 6), 'rgba(80,50,20,.35)', 1);
          if (kind === 2 && hash(c.x, c.y, f + 7) < .5) { const m = lerp((wx0 + wx1) / 2, y0); ctx.fillStyle = 'rgba(30,20,15,.55)'; ctx.beginPath(); ctx.arc(m[0], m[1] - 30 * z, 5 * z, 0, 7); ctx.fill(); ctx.fillRect(m[0] - 7 * z, m[1] - 25 * z, 14 * z, 25 * z); }
          if (kind === 3) { const g = ctx.createLinearGradient(0, q[3][1], 0, q[0][1]); g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(0,0,0,.15)'); poly(q, g); }
        } else { ctx.save(); ctx.globalAlpha = .22; poly([q[0], lerp(wx0 + .15, y0), lerp(wx0 + .3, y1), q[3]], '#6c7f9a'); ctx.restore(); }
        ctx.strokeStyle = shade(S.trim, .9); ctx.lineWidth = 1.6 * z; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (const p of q.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.stroke();
        if (S.win === 1) { line(lerp((wx0 + wx1) / 2, y0), lerp((wx0 + wx1) / 2, y1), shade(S.trim, .9), 1); line(lerp(wx0 - .04, y0 - .05), lerp(wx1 + .04, y0 - .05), shade(S.trim, 1.5), 2.2); }
      }
      if (S.gold) { line(lerp(0, c.h - .45), lerp(1, c.h - .45), '#d9b45a', 2); line(lerp(0, 3.2), lerp(1, 3.2), 'rgba(217,180,90,.6)', 1.5); }
      // the edge, inked
      line(a, b, INK, 1);
    };
    if (showS) face(Wc, Sx, shade(S.wall, .82), 's');
    if (showE) face(Sx, E, shade(S.wall, .6), 'e');
    // the roof, with a parapet where it meets the air, and the clutter of a city roof
    poly([up(N), up(E), up(Sx), up(Wc)], S.roof);
    ctx.strokeStyle = shade(S.roof, 1.6); ctx.lineWidth = 2.4 * z; ctx.beginPath();
    if (!same(c.x, c.y - 1)) { ctx.moveTo(...up(N)); ctx.lineTo(...up(E)); }
    if (!same(c.x - 1, c.y)) { ctx.moveTo(...up(N)); ctx.lineTo(...up(Wc)); }
    if (showE) { ctx.moveTo(...up(E)); ctx.lineTo(...up(Sx)); }
    if (showS) { ctx.moveTo(...up(Wc)); ctx.lineTo(...up(Sx)); }
    ctx.stroke();
    const inner = same(c.x - 1, c.y) && same(c.x + 1, c.y) && same(c.x, c.y - 1) && same(c.x, c.y + 1), r = hash(c.x, c.y, 21);
    if (inner && c.h >= 4 && r < .16) { // an air-conditioning unit, a vent, or a water tank
      const B = boxer(ctx, sx, sy - hpx, z, TW, TH, V);
      if (r < .07) { B.box(.25, .25, 0, .5, .4, .35, '#6a7078', '#8a9098'); const [fx, fy] = B.pj(.5, .45, .2); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.ellipse(fx, fy, 4 * z, 2 * z, 0, 0, 7); ctx.stroke(); }
      else if (r < .12) { B.cyl(.5, .5, 0, .08, .5, '#555a62'); B.box(.38, .38, .5, .24, .24, .06, '#3a3e44'); }
      else { B.cyl(.5, .5, .4, .32, .7, '#5a4030', '#6a4a36'); for (const [lx, ly] of [[.3, .3], [.7, .3], [.3, .7], [.7, .7]]) B.cyl(lx, ly, 0, .03, .4, '#2a2a2a'); }
    }
    if (showS && showE) line(Sx, up(Sx), INK, 1.2);
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
      const y0 = it.y ?? 1, [u0, u1, v0, v1] = [it.at / w.len, (it.at + it.w) / w.len, y0, y0 + it.h]; // y: 0 is the floor (doors), not 'unset'
      const q = [lerp(u0, v0), lerp(u1, v0), lerp(u1, v1), lerp(u0, v1)];
      ctx.beginPath(); ctx.moveTo(...q[0]); for (const p of q.slice(1)) ctx.lineTo(...p); ctx.closePath();
      if (it.kind === 'neon' || it.kind === 'dartboard' || it.kind === 'guitar' || it.kind === 'clock') ctx.fillStyle = 'rgba(0,0,0,0)'; else ctx.fillStyle = it.color || (it.kind === 'window' ? '#16243a' : it.kind === 'door' ? '#2a1a12' : it.kind === 'tv' ? '#0a0a0a' : it.kind === 'menu' ? '#1a1a1a' : it.kind === 'board' ? '#8a6a40' : '#3a3020'); ctx.fill();
      if (it.kind === 'window') { ctx.save(); ctx.clip(); for (let i = 0; i < 18; i++) { const p = lerp(u0 + (u1 - u0) * ((i * 37) % 17) / 17, v0 + (v1 - v0) * ((i * 23) % 11) / 11); ctx.fillStyle = i % 3 ? '#f2c66d' : '#9fd3ff'; ctx.fillRect(p[0], p[1], 2 * z, 3 * z); } ctx.restore(); }
      if (it.kind === 'dartboard') { const m = lerp((u0 + u1) / 2, (v0 + v1) / 2); ctx.save(); ctx.translate(m[0], m[1]); ctx.transform(1, w.side === 'n' ? .5 : -.5, 0, 1, 0, 0); for (const [r, c2] of [[16, '#111'], [14, '#c0392b'], [12.5, '#e8dcb0'], [8, '#1e6a3a'], [6.5, '#e8dcb0'], [2.5, '#c0392b']]) { ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, r * z, 0, 7); ctx.fill(); } for (let i = 0; i < 20; i++) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .6 * z; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * .314) * 14 * z, Math.sin(i * .314) * 14 * z); ctx.stroke(); } ctx.restore(); }
      if (it.kind === 'neon') { const m = lerp((u0 + u1) / 2, (v0 + v1) / 2); ctx.save(); ctx.translate(m[0], m[1]); ctx.transform(1, w.side === 'n' ? .5 : -.5, 0, 1, 0, 0); ctx.font = `italic bold ${(it.size || 13) * z}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const on = !it.flicker || Math.sin(t * 7) > -.9 || Math.random() > .3; ctx.shadowColor = it.labelColor || '#ff3b6b'; ctx.shadowBlur = on ? 14 : 0; ctx.fillStyle = on ? (it.labelColor || '#ff3b6b') : '#3a2a2a'; ctx.fillText(it.text || '', 0, 0); ctx.restore(); }
      if (it.kind === 'tv') { ctx.save(); ctx.clip(); const m = lerp((u0 + u1) / 2, (v0 + v1) / 2); ctx.fillStyle = `rgba(${120 + Math.sin(t * 3) * 40},${170 + Math.sin(t * 2.2) * 30},${120 + Math.sin(t * 1.3) * 40},.8)`; ctx.fillRect(m[0] - 40 * z, m[1] - 30 * z, 80 * z, 60 * z); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(m[0] + Math.sin(t) * 10 * z, m[1] + Math.cos(t * 1.3) * 5 * z, 2 * z, 2 * z); ctx.restore(); }
      if (it.kind === 'menu' || it.kind === 'board') { ctx.save(); ctx.clip(); for (let i = 0; i < 5; i++) { const a = lerp(u0 + (u1 - u0) * .1, v1 - (v1 - v0) * (.22 + i * .16)), b = lerp(u0 + (u1 - u0) * (.5 + hash(i, 4) * .4), v1 - (v1 - v0) * (.22 + i * .16)); ctx.strokeStyle = it.kind === 'menu' ? 'rgba(240,230,200,.7)' : 'rgba(30,30,30,.6)'; ctx.lineWidth = 1.4 * z; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } if (it.kind === 'board') for (let i = 0; i < 6; i++) { const p = lerp(u0 + (u1 - u0) * (.1 + (i % 3) * .3), v1 - (v1 - v0) * (.2 + (i / 3 | 0) * .45)); ctx.fillStyle = ['#f4f0e6', '#f2e28a', '#cfe8f4'][i % 3]; ctx.fillRect(p[0], p[1], 9 * z, 11 * z); } ctx.restore(); }
      if (it.kind === 'guitar') { const m = lerp((u0 + u1) / 2, v0 + .2); ctx.save(); ctx.translate(m[0], m[1]); ctx.fillStyle = it.body || '#a0522d'; ctx.beginPath(); ctx.ellipse(0, 0, 6 * z, 8 * z, 0, 0, 7); ctx.fill(); ctx.fillRect(-1.2 * z, -28 * z, 2.4 * z, 22 * z); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -1 * z, 2 * z, 0, 7); ctx.fill(); ctx.restore(); }
      if (it.kind === 'poster') { ctx.save(); ctx.clip(); const m = lerp((u0 + u1) / 2, (v0 + v1) / 2); ctx.fillStyle = it.ink || 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(m[0], m[1] - 4 * z, 6 * z, 0, 7); ctx.fill(); ctx.restore(); }
      if (it.kind === 'clock') { const m = lerp((u0 + u1) / 2, (v0 + v1) / 2); ctx.fillStyle = '#f4f0e6'; ctx.beginPath(); ctx.ellipse(m[0], m[1], 7 * z, 7 * z, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0], m[1] - 5 * z); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0] + 3 * z, m[1] + 1 * z); ctx.stroke(); }
      if (it.kind === 'door') { // two raised panels, a handle, and a lit sill where it meets the floor
        const P = (a, b, c2, d) => { ctx.beginPath(); ctx.moveTo(...lerp(a, c2)); ctx.lineTo(...lerp(b, c2)); ctx.lineTo(...lerp(b, d)); ctx.lineTo(...lerp(a, d)); ctx.closePath(); };
        const du = u1 - u0, ia = u0 + du * .16, ib = u1 - du * .16; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5 * z;
        if (it.color !== '#9aa1a8') { P(ia, ib, v0 + it.h * .08, v0 + it.h * .44); ctx.stroke(); P(ia, ib, v0 + it.h * .52, v0 + it.h * .9); ctx.stroke(); }
        else { P(u0 + du / 2 - .002, u0 + du / 2 + .002, v0, v1); ctx.stroke(); } // a lift: the seam between its two doors
        const kn = lerp(u0 + du * .84, v0 + it.h * .45); ctx.fillStyle = '#d8b25a'; ctx.beginPath(); ctx.arc(kn[0], kn[1], 2 * z, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,170,.25)'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(...lerp(u0, v0)); ctx.lineTo(...lerp(u1, v0)); ctx.stroke();
      }
      if (it.draw) it.draw(ctx, q, z, t);
      if (!(it.kind === 'neon' || it.kind === 'dartboard' || it.kind === 'guitar' || it.kind === 'clock')) { ctx.strokeStyle = it.frame || '#1a1410'; ctx.lineWidth = 3 * z; ctx.stroke(); }
      if (it.label) { ctx.save(); const m = lerp((u0 + u1) / 2, v1 + .25); ctx.translate(m[0], m[1]); ctx.transform(1, w.side === 'n' ? .5 : -.5, 0, 1, 0, 0); ctx.font = `bold ${11 * z}px Georgia`; ctx.textAlign = 'center'; ctx.fillStyle = it.labelColor || '#e8d7a8'; ctx.shadowColor = it.labelColor || '#e8d7a8'; ctx.shadowBlur = 8; ctx.fillText(it.label, 0, 0); ctx.restore(); }
    }
  }

  /* ---------- people ---------- */
  // An inked figure, three-quarter view: legs that walk, a coat lit from one side, hands, a face that
  // looks the way you're going. Options: coat, shirt, tie, pants, skin, hair, style (short, long, bob,
  // pony, bun, curly, buzz, bald), beard, glasses, build (broad, slim), height, skirt, labCoat,
  // apron (a colour), coatLen ('short' | 'long'), hat (fedora, cap, beanie, flatcap, police, chef),
  // hold (umbrella, tray, cig, glass, phone, bag, cue, dart), back (seen from behind), sit.
  function person(ctx, sx, sy, z, o, dir, t, step, V, isMe) {
    const s = z * (o.height || 1) * V / 40;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(s * (dir < 0 ? -1 : 1), s);
    const ink = 'rgba(6,6,12,.8)';
    ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 5.5, 0, 0, 7); ctx.fill();
    const walk = step ? Math.sin(step) : 0, breathe = Math.sin(t * 1.6) * .5, sit = o.sit ? 12 : 0;
    const coat = o.coat || '#333', pants = o.pants || '#222', skin = o.skin || '#c99b7a', hair = o.hair || '#2a1d14';
    const wide = o.build === 'broad' ? 1.16 : o.build === 'slim' ? .9 : 1;
    const path = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]) : ctx.lineTo(p[0], p[1]); ctx.closePath(); };
    const fillInk = (fill, lw = 1.3) => { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke(); };
    const lit = (col, x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, shade(col, 1.18)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, .7)); return g; };
    const top = -60 + sit + breathe; // shoulders
    if (o.sit && o._seat !== false) { // something to sit on, unless the room already has a chair there
      ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.ellipse(-1, -1, 7, 2.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1a1e'; ctx.fillRect(-2.5, -19, 3, 18);
      ctx.fillStyle = '#7a1a2a'; ctx.beginPath(); ctx.ellipse(-1, -20, 11, 4, 0, 0, 7); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(-3, -21, 6, 1.6, 0, 0, 7); ctx.fill();
    }
    // legs and shoes (seated: knees forward)
    if (o.sit) { for (const k of [-1, 1]) { path([[k * 4 - 4, -26], [k * 4 + 4, -26], [k * 4 + 13, -20], [k * 4 + 13, -2], [k * 4 + 7, -2], [k * 4 + 7, -16], [k * 4 - 4, -18]]); fillInk(lit(pants, -8, 14)); path([[k * 4 + 6, -3], [k * 4 + 16, -3], [k * 4 + 16, 0], [k * 4 + 6, 0]]); fillInk('#141418', 1); } }
    else for (const k of [-1, 1]) {
      const sw = walk * 5 * k, lift = Math.max(0, -walk * k) * 2;
      path([[k * 4.6 - 3.8 + sw * .25, -31], [k * 4.6 + 3.8 + sw * .25, -31], [k * 4.6 + 3.2 + sw * .6, -4 - lift], [k * 4.6 - 3.2 + sw * .6, -4 - lift]]); fillInk(lit(pants, -8, 10));
      path([[k * 4.6 - 4 + sw * .6, -5 - lift], [k * 4.6 + 5.5 + sw * .6, -5 - lift], [k * 4.6 + 7 + sw * .6, -1 - lift, k * 4.6 + 4.5 + sw * .6, -.5 - lift], [k * 4.6 - 4 + sw * .6, -.5 - lift]]); fillInk('#121216', 1);
    }
    const hem = o.skirt ? -14 : o.labCoat || o.coatLen === 'long' ? -16 + sit : o.coatLen === 'short' ? -32 + sit : -27 + sit;
    if (o.skirt) { path([[-10 * wide, -36 + sit], [10 * wide, -36 + sit], [13, hem], [-13, hem]]); fillInk(lit(coat, -12, 12)); }
    // the far arm, behind the body
    const swing = walk * 6, armTop = top + 3;
    path([[-12 * wide - 2, armTop], [-12 * wide + 4, armTop], [-12 * wide + 3 - swing * .3, armTop + 25], [-12 * wide - 3 - swing * .3, armTop + 25]]); fillInk(shade(coat, .62));
    ctx.beginPath(); ctx.arc(-12 * wide - swing * .3, armTop + 27, 3.2, 0, 7); fillInk(shade(skin, .8), 1);
    // the body: a coat with shoulders, lit from the left
    path([[-13 * wide, top + 2], [-9 * wide, top - 1], [9 * wide, top - 1], [13 * wide, top + 2], [11 * wide, hem], [-11 * wide, hem]]); fillInk(lit(coat, -13, 13), 1.4);
    if (o.labCoat || o.coatLen === 'long') { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1, top + 14); ctx.lineTo(1, hem); ctx.stroke(); }
    if (!o.back) {
      // shirt and lapels, a tie, buttons
      if (o.shirt || o.tie) { path([[-5, top - 1], [5, top - 1], [2, top + 16], [0, top + 18], [-2, top + 16]]); fillInk(o.shirt || '#ddd', .8); if (o.tie) { path([[-1.6, top + 1], [1.6, top + 1], [2.2, top + 13], [0, top + 16], [-2.2, top + 13]]); fillInk(o.tie, .6); } }
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-5, top - 1); ctx.lineTo(-1, top + 17); ctx.moveTo(5, top - 1); ctx.lineTo(1, top + 17); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.4)'; for (const by of [top + 20, top + 26]) { ctx.beginPath(); ctx.arc(0, by, .9, 0, 7); ctx.fill(); }
      if (o.apron) { path([[-8, top + 14], [8, top + 14], [9, hem + 4], [-9, hem + 4]]); fillInk(o.apron, 1); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(-4, top + 22); ctx.lineTo(4, top + 22); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(-6 * wide, top + 1, 6, 1.6, -.2, 0, 7); ctx.fill(); // light on the shoulder
    // the near arm, and what's in that hand
    const hx = 12 * wide + swing * .45, hy = armTop + 26;
    const holdUp = o.hold === 'glass' || o.hold === 'cig' || o.hold === 'phone';
    if (holdUp) { path([[12 * wide - 3, armTop], [12 * wide + 3, armTop], [10, armTop + 14], [5, armTop + 12]]); fillInk(lit(coat, 5, 14)); path([[5, armTop + 12], [10, armTop + 14], [8, armTop + 2], [3, armTop + 3]]); fillInk(shade(coat, .9)); ctx.beginPath(); ctx.arc(5, armTop + 1, 3, 0, 7); fillInk(skin, 1); }
    else { path([[12 * wide - 3, armTop], [12 * wide + 3, armTop], [hx + 3, hy - 1], [hx - 3, hy - 1]]); fillInk(lit(coat, 8, 16)); ctx.beginPath(); ctx.arc(hx, hy + 1, 3.2, 0, 7); fillInk(skin, 1); }
    if (o.hold === 'glass') { path([[2, armTop - 8], [8, armTop - 8], [7, armTop + 1], [3, armTop + 1]]); fillInk('rgba(220,190,120,.85)', .7); }
    if (o.hold === 'cig') { ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(6, armTop); ctx.lineTo(11, armTop - 2); ctx.stroke(); ctx.fillStyle = (t * 2 | 0) % 3 ? '#ff7a2a' : '#ffb05a'; ctx.beginPath(); ctx.arc(11.5, armTop - 2.2, 1.3, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(200,200,210,.25)'; ctx.beginPath(); ctx.arc(13 + Math.sin(t) * 2, armTop - 8 - (t * 6 % 10), 3, 0, 7); ctx.fill(); }
    if (o.hold === 'phone') { ctx.fillStyle = '#9fd3ff'; ctx.fillRect(3, armTop - 6, 4, 6); }
    if (o.hold === 'tray') { ctx.beginPath(); ctx.ellipse(hx + 2, hy - 3, 9, 2.6, 0, 0, 7); fillInk('#c8c8c8', .8); for (const gx of [-2, 3, 7]) { ctx.fillStyle = 'rgba(230,200,120,.9)'; ctx.fillRect(hx + gx - 1, hy - 9, 2.5, 6); } }
    if (o.hold === 'bag') { path([[hx - 5, hy], [hx + 5, hy], [hx + 6, hy + 10], [hx - 6, hy + 10]]); fillInk('#5a3a22', 1); }
    if (o.hold === 'cue') { ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.lineTo(hx + 4, hy - 48); ctx.stroke(); }
    // head: neck, jaw, ear, then hair and face
    const hy0 = top - 9;
    ctx.fillStyle = shade(skin, .82); ctx.fillRect(-2.6, top - 4, 5.2, 5);
    path([[-8, hy0 - 5], [-8.5, hy0 + 2, -5, hy0 + 7.5], [0, hy0 + 9.5, 5.5, hy0 + 7.5], [8.5, hy0 + 2, 8, hy0 - 5], [0, hy0 - 12, -8, hy0 - 5]]); fillInk(skin, 1.3);
    if (!o.back) { ctx.fillStyle = shade(skin, .82); ctx.beginPath(); ctx.ellipse(-6.5, hy0, 2, 3, 0, 0, 7); ctx.fill(); }
    const style = o.style || (o.longHair ? 'long' : o.bun ? 'bun' : o.bald ? 'bald' : 'short');
    ctx.fillStyle = hair;
    if (style === 'long' || style === 'bob' || style === 'pony') { path([[-9, hy0 - 4], [-12, hy0 + (style === 'bob' ? 7 : 15), -7, hy0 + (style === 'bob' ? 8 : 18)], [-4, hy0 + 2]]); ctx.fill(); }
    if (style !== 'bald' && style !== 'buzz') { ctx.beginPath(); ctx.ellipse(0, hy0 - 5, 9, 7.2, 0, Math.PI * .95, Math.PI * 2.05); ctx.fill(); ctx.fillRect(-9, hy0 - 6, 3.4, 7); if (style !== 'short') { ctx.beginPath(); ctx.ellipse(-1, hy0 - 6, 8.6, 5, 0, Math.PI, 0); ctx.fill(); } if (o.back) { ctx.beginPath(); ctx.ellipse(0, hy0 - 1, 8.8, 9, 0, 0, 7); ctx.fill(); } ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-1, hy0 - 4, 6, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke(); }
    if (style === 'buzz') { ctx.globalAlpha = .55; ctx.beginPath(); ctx.ellipse(0, hy0 - 4, 8.6, 6, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1; }
    if (style === 'bun') { ctx.beginPath(); ctx.arc(-4, hy0 - 12, 4, 0, 7); ctx.fill(); }
    if (style === 'pony') { ctx.beginPath(); ctx.ellipse(-10, hy0 + 2, 2.5, 6, .3, 0, 7); ctx.fill(); }
    if (style === 'curly') for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-8 + i * 2.3, hy0 - 8 + (i % 2) * 1.5, 3, 0, 7); ctx.fill(); }
    if (!o.back) {
      // eyes, brows, nose, mouth: looking the way you face
      ctx.fillStyle = '#16120f'; ctx.beginPath(); ctx.ellipse(2.2, hy0 - 1, .95, 1.25, 0, 0, 7); ctx.ellipse(6, hy0 - 1, .85, 1.2, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = shade(hair, .9); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(.8, hy0 - 3.6); ctx.lineTo(3.6, hy0 - 3.9); ctx.moveTo(4.8, hy0 - 3.9); ctx.lineTo(7.2, hy0 - 3.5); ctx.stroke();
      ctx.strokeStyle = shade(skin, .7); ctx.beginPath(); ctx.moveTo(5.2, hy0); ctx.lineTo(6.8, hy0 + 2.6); ctx.lineTo(5.2, hy0 + 2.8); ctx.stroke();
      ctx.strokeStyle = shade(skin, .55); ctx.beginPath(); ctx.moveTo(2.4, hy0 + 5); ctx.quadraticCurveTo(4.2, hy0 + 5.6, 6, hy0 + 4.8); ctx.stroke();
      if (o.beard === 'full' || o.beard === 'goatee') { ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(3, hy0 + 6, o.beard === 'full' ? 6.5 : 3, 3.6, 0, 0, 7); ctx.fill(); }
      if (o.beard === 'stubble') { ctx.fillStyle = 'rgba(30,25,20,.22)'; ctx.beginPath(); ctx.ellipse(2.5, hy0 + 5, 6, 3.6, 0, 0, 7); ctx.fill(); }
      if (o.beard === 'stache') { ctx.fillStyle = hair; ctx.fillRect(1.5, hy0 + 3, 7, 1.8); }
      if (o.glasses) { ctx.strokeStyle = '#0c0c0c'; ctx.lineWidth = 1; ctx.strokeRect(.4, hy0 - 2.6, 3.6, 3); ctx.strokeRect(4.6, hy0 - 2.6, 3.6, 3); ctx.beginPath(); ctx.moveTo(4, hy0 - 1.4); ctx.lineTo(4.6, hy0 - 1.4); ctx.stroke(); }
    }
    // hats
    const hat = o.hat;
    if (hat === 'fedora') { ctx.fillStyle = o.hatColor || '#1e1e22'; ctx.beginPath(); ctx.ellipse(0, hy0 - 6, 13, 3, 0, 0, 7); ctx.fill(); path([[-7, hy0 - 6], [-6, hy0 - 15], [6, hy0 - 15], [7, hy0 - 6]]); fillInk(o.hatColor || '#1e1e22', 1); ctx.fillStyle = '#5a3a22'; ctx.fillRect(-7, hy0 - 8.5, 14, 2); }
    if (hat === 'cap' || hat === 'police') { const c = hat === 'police' ? '#1a2440' : (o.hatColor || '#2a3a5a'); path([[-8.5, hy0 - 5], [-8, hy0 - 13, 0, hy0 - 14], [8, hy0 - 13, 8.5, hy0 - 5]]); fillInk(c, 1); ctx.fillStyle = shade(c, .7); ctx.beginPath(); ctx.ellipse(6, hy0 - 5, 7, 2, .1, 0, 7); ctx.fill(); if (hat === 'police') { ctx.fillStyle = '#d9c06a'; ctx.beginPath(); ctx.arc(0, hy0 - 9.5, 1.8, 0, 7); ctx.fill(); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-8.5, hy0 - 6.5, 17, 1.6); } }
    if (hat === 'beanie' || hat === 'flatcap') { const c = o.hatColor || (hat === 'beanie' ? '#6a2a2a' : '#5a5040'); path([[-9, hy0 - 4], [-8.5, hy0 - 14, 0, hy0 - 14.5], [8.5, hy0 - 14, 9, hy0 - 4]]); fillInk(c, 1); if (hat === 'flatcap') { ctx.fillStyle = shade(c, .75); ctx.beginPath(); ctx.ellipse(6, hy0 - 4.5, 6, 1.8, .1, 0, 7); ctx.fill(); } else { ctx.fillStyle = shade(c, .8); ctx.fillRect(-9, hy0 - 6.5, 18, 2.6); } }
    if (hat === 'chef') { path([[-6.5, hy0 - 6], [-8, hy0 - 16, -3, hy0 - 18], [0, hy0 - 21, 3, hy0 - 18], [8, hy0 - 16, 6.5, hy0 - 6]]); fillInk('#f2f2f2', 1); }
    if (o.hold === 'umbrella') { // over the head, raindrops running off it
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx - 1, hy); ctx.lineTo(1, hy0 - 22); ctx.stroke();
      const uc = o.umbrella || '#1a1a1e'; ctx.beginPath(); ctx.moveTo(-20, hy0 - 12); ctx.quadraticCurveTo(-18, hy0 - 32, 1, hy0 - 33); ctx.quadraticCurveTo(20, hy0 - 32, 22, hy0 - 12);
      for (let i = 4; i >= 0; i--) ctx.quadraticCurveTo(-20 + (i + .5) * 8.4, hy0 - 15, -20 + i * 8.4, hy0 - 12);
      ctx.closePath(); ctx.fillStyle = uc; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(-14, hy0 - 22); ctx.quadraticCurveTo(-6, hy0 - 31, 2, hy0 - 31); ctx.stroke();
    }
    ctx.restore();
    if (isMe) { ctx.save(); ctx.strokeStyle = 'rgba(232,213,160,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx, sy, 17 * z, 7 * z, 0, 0, 7); ctx.stroke(); ctx.restore(); } // so you can always find yourself
    if (o.name && o.showName) { ctx.save(); ctx.font = `${10 * z}px Georgia`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(232,213,160,.8)'; ctx.fillText(o.name, sx, sy - 88 * z); ctx.restore(); }
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
    column: [-.35, -.35, .35, .35], jukebox: [-.35, -.25, .35, .25], newsstand: [-.6, -.3, .6, .3], hotdog: [-.6, -.35, .6, .35], candles: [-.4, -.2, .4, .2], safe: [-.35, -.35, .35, .35], arcade: [-.35, -.3, .35, .3], filing: [0, 0, .5, .6], ivstand: [-.15, -.15, .15, .15], cafetable: [-.35, -.35, .35, .35], mailbox: [-.2, -.2, .2, .2], trafficlight: [-.1, -.1, .1, .1], stopsign: [-.1, -.1, .1, .1], floorlamp: [-.15, -.15, .15, .15], bin: [-.25, -.25, .25, .25], crate: [-.4, -.4, .4, .4], hydrant: [-.15, -.15, .15, .15], piano: [0, 0, 1.6, .8], pew: [0, 0, 2.4, .5], altar: [-.8, -.4, .8, .4], bus: [-1.2, -4, 1.2, 4],
  };
  const solidProp = k => !!FOOT[k] || !!SIZED[k];
  // furniture with a size (a long bar, a shelf unit) takes up all of it
  const SIZED = { piecase: [1, .6], display: [1.6, .6], booth: [1.6, 1.7], counter: [1, 1], bar: [1, 1], desk: [1.4, .7], shelf: [2, .6], fridge: [1, .7], cage: [1, 1], screens: [3, .4], sofa: [2, .8], piano: [1.6, .8], pew: [2.4, .5], backbar: [3, .5], pool: [2.4, 1.3] };
  const foot = (k, x, y, o = {}) => { if (SIZED[k]) { const [w, d] = SIZED[k]; return [x, y, x + (o.w || w), y + (o.d || d)]; } const f = (o.rot && FOOT[k + 'x']) || FOOT[k]; return [x + f[0], y + f[1], x + f[2], y + f[3]]; };
  function prop(ctx, kind, sx, sy, z, o, t, TW, TH, V, th) {
    const B = boxer(ctx, sx, sy, z, TW, TH, V), { pj, poly, box, cyl, glowAt, text } = B;
    const col = o.color;
    switch (kind) {
      case 'car': { // a saloon parked along the street (o.rot: across), body, glass, wheels, lights
        const c = col || '#3a4252', L = o.rot ? [-2.1, -.85, 4.2, 1.7] : [-.85, -2.1, 1.7, 4.2], [x0, y0, w, d] = L;
        ctx.fillStyle = 'rgba(0,0,0,.4)'; poly([pj(x0 - .1, y0 - .1), pj(x0 + w + .1, y0 - .1), pj(x0 + w + .1, y0 + d + .1), pj(x0 - .1, y0 + d + .1)], 'rgba(0,0,0,.4)', false);
        box(x0, y0, .25, w, d, .55, c);
        // wheels stand upright on the two sides you can see, turned the way the car points
        const wheel = (cx, cy) => { ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * 6.283, u = Math.cos(a) * .32, v = .32 + Math.sin(a) * .32; const p = o.rot ? pj(cx + u, cy, v) : pj(cx, cy + u, v); i ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.closePath(); ctx.fillStyle = '#0c0c0e'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = .8 * z; ctx.stroke();
          ctx.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * 6.283, u = Math.cos(a) * .14, v = .32 + Math.sin(a) * .14; const p = o.rot ? pj(cx + u, cy, v) : pj(cx, cy + u, v); i ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.closePath(); ctx.fillStyle = '#6a6e76'; ctx.fill(); };
        for (const k of [-1.3, 1.3]) o.rot ? wheel(k, y0 + d + .01) : wheel(x0 + w + .01, k);
        const [gx, gy, gw, gd] = o.rot ? [-1.1, -.75, 2.1, 1.5] : [-.75, -1.1, 1.5, 2.1];
        box(gx, gy, .8, gw, gd, .45, '#121a26', shade(c, 1.1));
        poly(o.rot ? [pj(gx + gw, gy, .82), pj(gx + gw, gy + gd, .82), pj(gx + gw - .3, gy + gd, 1.22), pj(gx + gw - .3, gy, 1.22)] : [pj(gx, gy + gd, .82), pj(gx + gw, gy + gd, .82), pj(gx + gw, gy + gd - .3, 1.22), pj(gx, gy + gd - .3, 1.22)], 'rgba(150,180,220,.22)', false); // glass sheen
        const fx = o.rev ? -1 : 1; // which end is the front
        if (o.lights) { glowAt(o.rot ? 2.1 * fx : -.5, o.rot ? -.5 : 2.1, .55, '#fff2c0', 18); glowAt(o.rot ? 2.1 * fx : .5, o.rot ? .5 : 2.1, .55, '#fff2c0', 18); glowAt(o.rot ? -2.1 * fx : -.5, o.rot ? 0 : -2.1, .55, '#ff3030', 10); }
        if (o.taxi) { box(-.3, -.2, 1.25, .6, .4, .18, '#f4e8a0'); text(0, .21, 1.34, 'TAXI', '#2a2a2a', 4, 's'); }
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
      case 'chair': { const cc = col || '#3a4a5a', bk = o.back || 'n'; if (bk === 'n' || bk === 'w') box(bk === 'w' ? -.22 : -.22, -.22, .45, bk === 'w' ? .08 : .44, bk === 'w' ? .44 : .08, .5, cc); box(-.22, -.22, 0, .44, .44, .45, cc); if (bk === 's' || bk === 'e') box(bk === 'e' ? .14 : -.22, bk === 's' ? .14 : -.22, .45, bk === 'e' ? .08 : .44, bk === 's' ? .08 : .44, .5, cc); break; } // its back on the side it says
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
      case 'cage': { // the cashier's cage: a wood counter with a marble top, a brass grille, a lit sign
        const w = o.w || 1, d = o.d || 1;
        box(0, 0, 0, w, d, 1.05, '#3a2214', '#e2dccf');
        for (let i = 0; i < 3; i++) { const x0 = .12 + i * (w - .24) / 3, x1 = x0 + (w - .24) / 3 - .1; poly([pj(x0, d, .15), pj(x1, d, .15), pj(x1, d, .88), pj(x0, d, .88)], '#4a2c16'); }
        poly([pj(0, d - .04, 1.05), pj(w, d - .04, 1.05), pj(w, d - .04, 2.35), pj(0, d - .04, 2.35)], 'rgba(170,200,230,.14)', false);
        ctx.strokeStyle = '#c9a14a'; ctx.lineWidth = 1 * z; for (let i = 0; i <= 18; i++) { const x = i * w / 18; if (i % 6 > 1 && i % 6 < 5 && i > 0 && i < 18) continue; const a = pj(x, d - .04, 1.05), b = pj(x, d - .04, 2.35); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } // bars, with three windows
        for (const hgt of [1.05, 1.7, 2.35]) { const a = pj(0, d - .04, hgt), b = pj(w, d - .04, hgt); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
        for (let k = 0; k < 3; k++) { const x = (k + .5) * w / 3; box(x - .22, d - .3, 1.05, .44, .26, .04, '#c9a14a'); }
        box(0, d - .24, 2.35, w, .24, .4, '#2a170c', '#3a2214'); text(w / 2, d + .01, 2.55, 'CASHIER', '#ffd98a', 9, 's'); glowAt(w / 2, d, 2.55, '#ffd98a', 34); glowAt(w / 2, d - .4, 1.6, '#fff0c0', 30);
        break;
      }
      case 'grave': box(-.4, -.12, 0, .8, .24, o.h || 1.1, '#8a877e', '#9a978e'); if (o.name) text(0, .13, (o.h || 1.1) * .65, o.name, '#2a2a2a', 6, 's', 'bold'); break;
      case 'pillar': cyl(0, 0, 0, .36, .2, shade(col || '#c9b48a', .8)); cyl(0, 0, .2, .3, (o.h || 4) - .45, col || '#c9b48a'); box(-.38, -.38, (o.h || 4) - .25, .76, .76, .25, shade(col || '#c9b48a', .9)); break;
      case 'screens': { box(0, 0, 0, o.w || 3, .4, .8, '#1a1e24'); for (let r = 0; r < 3; r++) for (let i = 0; i < (o.w || 3) * 2; i++) { const q = [pj(.05 + i * .5, .1, 1 + r * .55), pj(.45 + i * .5, .1, 1 + r * .55), pj(.45 + i * .5, .1, 1.45 + r * .55), pj(.05 + i * .5, .1, 1.45 + r * .55)]; poly(q, `hsl(${190 + ((i + r) * 13) % 40},40%,${18 + ((t * 2 + i + r) | 0) % 3 * 4}%)`); } glowAt((o.w || 3) / 2, .2, 1.8, '#6fc3e8', 60); break; }
      case 'rug': poly([pj(0, 0, .01), pj(o.w || 2, 0, .01), pj(o.w || 2, o.d || 1.4, .01), pj(0, o.d || 1.4, .01)], col || '#5a1a2a'); break;
      case 'wheel': { // a Big Six money wheel, upright on its cabinet and facing into the room, its bulbs chasing
        box(-.5, -.25, 0, 1, .5, 1.05, '#2a170c', '#4a2a14'); poly([pj(-.42, .26, .15), pj(.42, .26, .15), pj(.42, .26, .9), pj(-.42, .26, .9)], '#3a2010'); text(0, .27, .55, 'BIG SIX', '#f0d78c', 5.5, 's');
        const cz = 2.05, R = .8, yy = .02, N = 24, ang = t * .12, P = (a, r) => pj(Math.cos(a) * r, yy, cz + Math.sin(a) * r);
        box(-.07, -.05, 1.05, .14, .1, .3, '#2a170c');
        const ring = (r, fill, stroke) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const p = P(i / 40 * 6.283, r); i ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.6 * z; ctx.stroke(); } };
        ring(R * 1.17, '#3a1e0c', INK); ring(R * 1.03, '#d9b45a');
        const cols = ['#d9c27a', '#3f74c9', '#d9c27a', '#7d45c0', '#d9c27a', '#3f74c9', '#2a8e52', '#d9c27a', '#c22f3a', '#3f74c9', '#d9c27a', '#7d45c0'];
        for (let i = 0; i < N; i++) { const a0 = ang + i / N * 6.283, a1 = a0 + 6.283 / N, pts = [pj(0, yy, cz)]; for (let k = 0; k <= 3; k++) pts.push(P(a0 + (a1 - a0) * k / 3, R)); poly(pts, i === 0 ? '#c9a14a' : i === 12 ? '#141414' : cols[i % cols.length], false); }
        for (let i = 0; i < N; i++) { const [px, py] = P(ang + i / N * 6.283, R); ctx.fillStyle = '#f0e0a0'; ctx.beginPath(); ctx.arc(px, py, 1.1 * z, 0, 7); ctx.fill(); }
        for (let i = 0; i < 18; i++) { const [px, py] = P(i / 18 * 6.283, R * 1.1), on = (i + Math.floor(t * 3)) % 2 === 0; ctx.fillStyle = on ? '#ffe9a8' : '#7a6020'; ctx.beginPath(); ctx.arc(px, py, 1.7 * z, 0, 7); ctx.fill(); }
        ring(R * .2, '#c9a14a', INK); text(0, yy + .01, cz, '★', '#3a2410', 5, 's');
        { const a = P(Math.PI / 2, R * 1.24), b = P(Math.PI / 2, R * .93), l = P(Math.PI / 2 + .07, R * 1.2), r = P(Math.PI / 2 - .07, R * 1.2); poly([l, r, b], '#8a1a12'); ctx.fillStyle = '#d9b45a'; ctx.beginPath(); ctx.arc(a[0], a[1], 1.6 * z, 0, 7); ctx.fill(); }
        box(-.55, -.12, 3.05, 1.1, .2, .32, '#2a170c', '#4a2a14'); text(0, .09, 3.21, 'BIG SIX', '#ffd98a', 7, 's'); glowAt(0, .1, 2.05, '#ffd76a', 46);
        break;
      }
      case 'pusher': { // a coin pusher cabinet: base, a glass playfield full of coins, a lit backboard
        box(-.6, -.5, 0, 1.2, 1, .85, '#2a1640', '#3a2050'); glowAt(0, .52, .45, '#ffd34d', 16); poly([pj(-.3, .51, .3), pj(.3, .51, .3), pj(.3, .51, .55), pj(-.3, .51, .55)], '#c9a14a');
        poly([pj(-.6, -.5, .86), pj(.6, -.5, .86), pj(.6, .5, .86), pj(-.6, .5, .86)], '#2f6d8e');
        for (let i = 0; i < 22; i++) { const [x, y] = pj(-.5 + (i % 6) * .2 + (i / 6 | 0) % 2 * .1, -.25 + (i / 6 | 0) * .2, .88); ctx.fillStyle = i === 9 ? '#d23a3a' : i % 7 === 3 ? '#ffd84a' : '#e6c164'; ctx.beginPath(); ctx.ellipse(x, y, 4 * z, 2 * z, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(80,50,0,.6)'; ctx.lineWidth = .6 * z; ctx.stroke(); }
        box(-.6, -.5, .86, 1.2, .18, .3, '#9aa3ad', '#d8dee4');
        poly([pj(-.6, .5, .86), pj(.6, .5, .86), pj(.6, .5, 1.55), pj(-.6, .5, 1.55)], 'rgba(170,200,240,.16)', false); poly([pj(.6, -.5, .86), pj(.6, .5, .86), pj(.6, .5, 1.55), pj(.6, -.5, 1.55)], 'rgba(170,200,240,.1)', false);
        box(-.6, -.5, 1.55, 1.2, .3, .85, '#2a1640', '#3a2050');
        for (let i = 0; i < 10; i++) { const [x, y] = pj(-.55 + i * .122, -.19, 2.36); ctx.fillStyle = (i + Math.floor(t * 4)) % 2 ? '#ffe9a8' : '#5a4a20'; ctx.beginPath(); ctx.arc(x, y, 1.4 * z, 0, 7); ctx.fill(); }
        text(0, -.19, 2.1, o.label || 'COIN PUSHER', '#ffd34d', 6, 's'); text(0, -.19, 1.78, 'JACKPOTS', '#ff6a6a', 4.5, 's'); glowAt(0, -.1, 2, '#ffd34d', 26);
        break;
      }
      case 'sicbo': box(-1, -.6, 0, 2, 1.2, .8, '#3a2214', '#5a3a22'); poly([pj(-.85, -.45, .81), pj(.85, -.45, .81), pj(.85, .45, .81), pj(-.85, .45, .81)], '#123a5a'); for (let i = 0; i < 3; i++) box(-.2 + i * .15, -.05, .82, .1, .1, .1, '#f4f0e6'); break;
      case 'bin': cyl(0, 0, 0, .22, .8, '#2a3038'); break;
      case 'crate': box(-.4, -.4, 0, .8, .8, .8, '#5a4428'); break;
      case 'hydrant': cyl(0, 0, 0, .12, .6, '#a31a1a'); break;
      case 'pew': box(0, 0, 0, 2.4, .5, .45, '#4a2e1c'); box(0, 0, .45, 2.4, .1, .5, '#4a2e1c'); break;
      case 'altar': box(-.8, -.4, 0, 1.6, .8, 1, '#e8e2d4'); for (const x of [-.5, .5]) { cyl(x, 0, 1, .03, .3, '#f4f0e6'); glowAt(x, 0, 1.35, '#ffd9a0', 14); } break;
      case 'piano': box(0, 0, 0, 1.6, .8, 1.1, '#111'); break;
      case 'fence': { const n = o.len || 4; for (let i = 0; i <= n * 3; i++) { const a = pj(o.rot ? 0 : i / 3, o.rot ? i / 3 : 0, 0), b = pj(o.rot ? 0 : i / 3, o.rot ? i / 3 : 0, 1.3); ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } break; }
      case 'puddle': { const [cx, cy] = pj(0, 0, 0); ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .5); const g = ctx.createRadialGradient(0, 0, 2, 0, 0, (o.r || 1) * 40 * z); g.addColorStop(0, 'rgba(120,150,200,.22)'); g.addColorStop(1, 'rgba(60,80,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, (o.r || 1) * 40 * z, 0, 7); ctx.fill(); ctx.restore(); break; }
      case 'tape': { // old police tape, tied between two gateposts and sagging, faded and torn
        const x0 = o.x0 || 0, y0 = o.y0 || 0, x1 = o.x1 != null ? o.x1 : 2, y1 = o.y1 || 0;
        for (const [px, py] of [[x0, y0], [x1, y1]]) box(px - .08, py - .08, 0, .16, .16, 1.05, '#3a3226');
        const a = pj(x0, y0, .95), b = pj(x1, y1, .95), m = pj((x0 + x1) / 2, (y0 + y1) / 2, .7);
        ctx.strokeStyle = 'rgba(200,170,40,.75)'; ctx.lineWidth = 2.4 * z; ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(m[0], m[1], ...b); ctx.stroke();
        ctx.strokeStyle = 'rgba(20,20,20,.55)'; ctx.lineWidth = 2.4 * z; ctx.setLineDash([3 * z, 9 * z]); ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(m[0], m[1], ...b); ctx.stroke(); ctx.setLineDash([]);
        break; }
      case 'bed2': box(0, 0, 0, 1.6, 2.1, .5, '#4a2a1a', '#e8e0d0'); box(.2, .1, .5, 1.2, .45, .12, '#fff', '#fff'); break;
      case 'tv': box(0, 0, .8, o.w || 1.2, .08, .7, '#0a0a0a'); break;
      case 'mirror': break;
      case 'sign': text(0, 0, o.z || 2.6, o.text, o.color || '#ff3b6b', o.size || 10, o.side || 's', o.font || 'bold'); break;
      case 'bus': box(-1.2, -4, 0, 2.4, 8, 2.8, '#c9a03a'); break;
      case 'column': { cyl(0, 0, 0, .34, .25, '#b8a47a', '#cbb88e'); cyl(0, 0, .25, .26, (o.h || 3.4) - .5, col || '#d8c8a0'); for (let i = 0; i < 5; i++) { const a = pj(Math.cos(i * .7 + .3) * .22, Math.sin(i * .7 + .3) * .22, .3), b = pj(Math.cos(i * .7 + .3) * .22, Math.sin(i * .7 + .3) * .22, (o.h || 3.4) - .3); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } box(-.38, -.38, (o.h || 3.4) - .25, .76, .76, .25, '#cbb88e'); break; }
      case 'canopy': { // a casino marquee: gold edge, a row of bulbs chasing round underneath
        const w = o.w || 6, d = o.d || 1.6, hgt = o.h || 3.1;
        for (const [px, py] of [[.2, d - .2], [w - .2, d - .2]]) cyl(px, py, 0, .06, hgt, '#c9a14a');
        box(0, 0, hgt, w, d, .3, '#2a1a10', '#3a2416');
        for (let i = 0; i < w * 4; i++) { const on = ((t * 8 | 0) + i) % 3 === 0; const [bx, by] = pj(i / 4 + .1, d, hgt + .12); ctx.fillStyle = on ? '#fff2b0' : '#a07a30'; ctx.beginPath(); ctx.arc(bx, by, 2 * z, 0, 7); ctx.fill(); }
        if (o.text) text(w / 2, d + .02, hgt + .5, o.text, o.textColor || '#ffcf6a', 10, 's');
        break; }
      case 'backbar': { // shelves of bottles behind a bar, a mirror, a little glow
        const w = o.w || 3; box(0, 0, 0, w, .5, 1, '#2a1a10', '#3a2416'); box(0, 0, 1, w, .25, 1.4, '#1a120c');
        poly([pj(.1, .26, 1.1), pj(w - .1, .26, 1.1), pj(w - .1, .26, 2.3), pj(.1, .26, 2.3)], 'rgba(160,140,110,.25)', false);
        for (let r = 0; r < 3; r++) { const [a0, a1] = [pj(.05, .27, 1.15 + r * .42), pj(w - .05, .27, 1.15 + r * .42)]; ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(...a0); ctx.lineTo(...a1); ctx.stroke();
          for (let i = 0; i < w * 5; i++) { const [bx, by] = pj(.12 + i * .2, .27, 1.15 + r * .42), hh = (8 + hash(i, r) * 6) * z; ctx.fillStyle = ['#5a2a10', '#2a5a2a', '#8a6a20', '#c8c0a0', '#6a1a2a', '#c9a14a'][(i * 7 + r * 3) % 6]; ctx.fillRect(bx - 2 * z, by - hh, 4 * z, hh); ctx.fillRect(bx - 1 * z, by - hh - 3 * z, 2 * z, 3 * z); } }
        glowAt(w / 2, .3, 1.8, '#ffb060', 40); break; }
      case 'pool': { // a pool table: wood rails, green cloth, pockets, the balls racked or scattered
        const w = o.w || 2.4, d = o.d || 1.3; for (const [lx, ly] of [[.15, .15], [w - .15, .15], [.15, d - .15], [w - .15, d - .15]]) box(lx - .08, ly - .08, 0, .16, .16, .62, '#3a2214');
        box(0, 0, .62, w, d, .2, '#4a2a16', '#5a3a1e'); poly([pj(.12, .12, .83), pj(w - .12, .12, .83), pj(w - .12, d - .12, .83), pj(.12, d - .12, .83)], o.cloth || '#1e6a3a');
        for (const [px, py] of [[.14, .14], [w / 2, .1], [w - .14, .14], [.14, d - .14], [w / 2, d - .1], [w - .14, d - .14]]) { const [cx, cy] = pj(px, py, .84); ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.ellipse(cx, cy, 4 * z, 2.5 * z, 0, 0, 7); ctx.fill(); }
        const balls = o.balls || [[w * .7, d / 2, '#fff'], [w * .3, d / 2, '#c0392b'], [w * .26, d / 2 - .07, '#f1c40f'], [w * .26, d / 2 + .07, '#c0392b'], [w * .22, d / 2, '#111'], [w * .22, d / 2 - .14, '#f1c40f'], [w * .22, d / 2 + .14, '#c0392b']];
        for (const [bx, by, bc] of balls) { const [cx, cy] = pj(bx, by, .88); ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(cx, cy, 2.6 * z, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = .6 * z; ctx.stroke(); }
        if (o.lamp !== false) { const [lx, ly] = pj(w / 2, d / 2, 2.4); ctx.strokeStyle = '#111'; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(lx, ly - 60 * z); ctx.lineTo(lx, ly); ctx.stroke(); box(w / 2 - .5, d / 2 - .15, 2.3, 1, .3, .14, '#1a3a1a', '#2a4a2a'); glowAt(w / 2, d / 2, 1, '#fff0c0', 50); }
        break; }
      case 'jukebox': { box(-.35, -.25, 0, .7, .5, 1.3, '#5a1a10', '#7a2a14'); const [cx, cy] = pj(0, .26, 1.3); ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 14 * z, 10 * z, 0, Math.PI, 0); ctx.fillStyle = `hsl(${(t * 40) % 360},80%,60%)`; ctx.fill(); ctx.restore(); poly([pj(-.25, .26, .5), pj(.25, .26, .5), pj(.25, .26, 1.1), pj(-.25, .26, 1.1)], '#ffd98a'); for (let i = 0; i < 4; i++) { const [lx, ly] = pj(-.2 + i * .13, .27, .8); ctx.fillStyle = '#8a4a14'; ctx.fillRect(lx, ly, 3 * z, 8 * z); } glowAt(0, .3, 1, '#ffb050', 34); break; }
      case 'piecase': { box(0, 0, 0, o.w || 1, .6, .9, '#c8c0b0', '#e8e0d0'); box(.05, .05, .9, (o.w || 1) - .1, .5, .5, 'rgba(200,230,255,.3)', 'rgba(220,240,255,.25)'); for (let i = 0; i < 3; i++) { const [px, py] = pj(.25 + i * .3, .3, 1); ctx.fillStyle = ['#b3222b', '#d4a017', '#8a4a2a'][i]; ctx.beginPath(); ctx.ellipse(px, py, 7 * z, 3.5 * z, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e8c890'; ctx.beginPath(); ctx.ellipse(px, py - 1.5 * z, 7 * z, 3 * z, 0, 0, Math.PI); ctx.fill(); } glowAt((o.w || 1) / 2, .3, 1.1, '#fff0c0', 20); break; }
      case 'coffee': { box(-.2, -.15, o.z || .95, .4, .3, .45, '#2a2a2e', '#3a3a40'); cyl(-.08, .1, (o.z || .95) + .05, .07, .18, 'rgba(120,70,30,.8)'); const [sx2, sy2] = pj(0, 0, (o.z || .95) + .7); ctx.fillStyle = 'rgba(220,220,230,.18)'; ctx.beginPath(); ctx.arc(sx2 + Math.sin(t * 2) * 3 * z, sy2 - (t * 10 % 12) * z, 4 * z, 0, 7); ctx.fill(); break; }
      case 'till': { box(-.2, -.15, o.z || .95, .4, .3, .2, '#2a2a2e', '#3a3a40'); box(-.15, -.05, (o.z || .95) + .2, .3, .1, .18, '#1a1a1e'); poly([pj(-.12, .06, (o.z || .95) + .24), pj(.12, .06, (o.z || .95) + .24), pj(.12, .06, (o.z || .95) + .34), pj(-.12, .06, (o.z || .95) + .34)], '#5aff9a', false); break; }
      case 'bottles': { for (let i = 0; i < (o.n || 3); i++) { const [bx, by] = pj(i * .18, 0, o.z || 1.05), hh = 9 * z; ctx.fillStyle = ['#5a2a10', '#2a5a2a', '#c8c0a0', '#8a6a20'][i % 4]; ctx.fillRect(bx - 2 * z, by - hh, 4 * z, hh); } break; }
      case 'glass': { const [gx, gy] = pj(0, 0, o.z || 1.05); ctx.fillStyle = 'rgba(230,200,120,.85)'; ctx.fillRect(gx - 2 * z, gy - 6 * z, 4 * z, 6 * z); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .6 * z; ctx.strokeRect(gx - 2 * z, gy - 6 * z, 4 * z, 6 * z); break; }
      case 'cafetable': { cyl(0, 0, 0, .06, .72, '#222'); cyl(0, 0, .72, .38, .05, col || '#e8e0d0'); if (o.cup) { cyl(.1, 0, .77, .05, .07, '#f4f4f4'); } break; }
      case 'booth': { const c2 = col || '#a31a2a', w = o.w || 1.6; box(0, 0, 0, w, .5, .45, c2); box(0, 0, .45, w, .18, .55, shade(c2, .9)); box(0, .55, 0, w, .6, .74, '#c8c0b0', '#e8e0d0'); box(0, 1.2, 0, w, .5, .45, c2); box(0, 1.52, .45, w, .18, .55, shade(c2, .9)); break; }
      case 'newsstand': { box(-.6, -.3, 0, 1.2, .6, 1, '#1e3a5a', '#2a4a6a'); box(-.65, -.35, 1.9, 1.3, .7, .08, '#1a2a3a'); for (const x of [-.55, .55]) cyl(x, .25, 1, .03, .9, '#111'); for (let i = 0; i < 4; i++) poly([pj(-.5 + i * .27, .31, .45), pj(-.28 + i * .27, .31, .45), pj(-.28 + i * .27, .31, .85), pj(-.5 + i * .27, .31, .85)], ['#e8e2d4', '#d8c040', '#e8e2d4', '#c04030'][i], false); text(0, .31, 1.6, 'NEWS', '#e8e2d4', 7, 's'); break; }
      case 'hotdog': { box(-.6, -.35, .3, 1.2, .7, .7, '#c8c8c8', '#d8d8d8'); for (const x of [-.4, .4]) cyl(x, .35, 0, .15, .1, '#111'); box(-.65, -.4, 1.9, 1.3, .8, .06, '#c0392b'); for (const x of [-.6, .6]) cyl(x, -.35, 1, .03, .9, '#888'); text(0, .36, .75, 'HOT DOGS', '#c0392b', 6, 's'); const [sx2, sy2] = pj(0, 0, 1.2); ctx.fillStyle = 'rgba(230,230,240,.2)'; ctx.beginPath(); ctx.arc(sx2 + Math.sin(t * 1.5) * 4 * z, sy2 - (t * 12 % 16) * z, 6 * z, 0, 7); ctx.fill(); glowAt(0, 0, 1.6, '#ffd0a0', 30); break; }
      case 'candles': { box(-.4, -.2, 0, .8, .4, .9, '#3a2a1a', '#4a3a2a'); for (let i = 0; i < 12; i++) { const lit = (o.lit || 4) > i; const [cx, cy] = pj(-.32 + (i % 6) * .13, -.1 + (i / 6 | 0) * .2, .92); ctx.fillStyle = '#e8e2d4'; ctx.fillRect(cx - 1.5 * z, cy - 5 * z, 3 * z, 5 * z); if (lit) { ctx.fillStyle = Math.sin(t * 9 + i) > 0 ? '#ffd27a' : '#ffb04a'; ctx.beginPath(); ctx.ellipse(cx, cy - 7 * z, 1.4 * z, 2.4 * z, 0, 0, 7); ctx.fill(); } } glowAt(0, 0, 1.1, '#ffc070', 36); break; }
      case 'display': { box(0, 0, 0, o.w || 1.6, .6, .9, '#3a2a1a', '#c8d8e0'); box(.05, .05, .9, (o.w || 1.6) - .1, .5, .05, 'rgba(200,230,255,.35)', 'rgba(220,240,255,.3)'); for (let i = 0; i < (o.w || 1.6) * 4; i++) { const [gx, gy] = pj(.12 + i * .22, .3, .92); ctx.fillStyle = ['#d4af37', '#c0c0c0', '#d4af37', '#e8e8e8'][i % 4]; ctx.beginPath(); ctx.arc(gx, gy, 2.2 * z, 0, 7); ctx.fill(); } break; }
      case 'safe': box(-.35, -.35, 0, .7, .7, 1, '#2a2e34', '#3a3e44'); { const [cx, cy] = pj(0, .36, .55); ctx.strokeStyle = '#c9a14a'; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.arc(cx, cy, 5 * z, 0, 7); ctx.stroke(); } break;
      case 'arcade': { box(-.35, -.3, 0, .7, .6, 1.8, '#1a1a3a', '#2a2a4a'); poly([pj(-.25, .31, 1), pj(.25, .31, 1), pj(.25, .31, 1.5), pj(-.25, .31, 1.5)], `hsl(${(t * 60) % 360},70%,45%)`, false); box(-.3, .3, .8, .6, .2, .08, '#111'); text(0, .31, 1.68, o.label || 'GALAXIA', '#9fd3ff', 5, 's'); glowAt(0, .35, 1.25, '#9fd3ff', 26); break; }
      case 'filing': box(0, 0, 0, .5, .6, 1.3, '#6a7078', '#7a8088'); break;
      case 'ivstand': cyl(0, 0, 0, .2, .04, '#888'); cyl(0, 0, 0, .025, 1.9, '#bbb'); box(-.08, -.03, 1.6, .16, .06, .25, 'rgba(200,230,255,.6)'); break;
      case 'monitor': box(-.15, -.1, .8, .3, .2, .3, '#222'); { const [mx, my] = pj(0, .11, .95); ctx.strokeStyle = '#5aff9a'; ctx.lineWidth = 1 * z; ctx.beginPath(); for (let i = 0; i < 10; i++) { const y = my + (i === 5 ? -4 : i === 6 ? 3 : 0) * z; i ? ctx.lineTo(mx - 8 * z + i * 1.6 * z, y) : ctx.moveTo(mx - 8 * z, y); } ctx.stroke(); } cyl(0, 0, 0, .04, .8, '#555'); break;
      case 'floorlamp': cyl(0, 0, 0, .15, .04, '#222'); cyl(0, 0, 0, .025, 1.5, '#222'); cyl(0, 0, 1.4, .2, .3, '#e8d8b0', '#f4ead0'); glowAt(0, 0, 1.5, '#ffe0a0', 40); break;
      case 'bags': for (let i = 0; i < 3; i++) { const [bx, by] = pj((i % 2) * .3, (i / 2 | 0) * .3, 0); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(bx, by - 8 * z, 9 * z, 9 * z, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.arc(bx - 3 * z, by - 12 * z, 3 * z, 0, 7); ctx.fill(); } break;
      case 'steam': { const [cx, cy] = pj(0, 0, 0); ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(cx, cy, 12 * z, 6 * z, 0, 0, 7); ctx.fill(); for (let i = 0; i < 5; i++) { const k = ((t * .4 + i / 5) % 1); ctx.fillStyle = `rgba(200,205,215,${.25 * (1 - k)})`; ctx.beginPath(); ctx.arc(cx + Math.sin(t + i) * 8 * z * k, cy - k * 70 * z, (8 + k * 16) * z, 0, 7); ctx.fill(); } break; }
      case 'mailbox': box(-.2, -.2, 0, .4, .4, 1.1, '#2a3a8a', '#3a4a9a'); break;
      case 'stopsign': cyl(0, 0, 0, .03, 2.4, '#888'); box(-.25, -.03, 2.2, .5, .06, .35, '#c0392b'); text(0, .04, 2.4, 'BUS', '#fff', 5, 's'); break;
      case 'cat': { // a black cat, wandering or sitting with its tail going
        const [cx, cy] = pj(0, 0, 0); ctx.save(); ctx.translate(cx, cy); ctx.scale((th && th.dir) || 1, 1); ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.ellipse(0, -6 * z, 9 * z, 5 * z, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(8 * z, -11 * z, 4 * z, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(6 * z, -14 * z); ctx.lineTo(7 * z, -18 * z); ctx.lineTo(9 * z, -14 * z); ctx.moveTo(9 * z, -14 * z); ctx.lineTo(11 * z, -17 * z); ctx.lineTo(12 * z, -13 * z); ctx.fill();
        ctx.strokeStyle = '#0c0c0e'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(-8 * z, -7 * z); ctx.quadraticCurveTo(-14 * z, -12 * z + Math.sin(t * 3) * 3 * z, -12 * z, -20 * z); ctx.stroke(); ctx.fillStyle = '#c8d84a'; ctx.fillRect(8.5 * z, -12 * z, 1.5 * z, 1.2 * z); ctx.restore(); break; }
      case 'trafficlight': { cyl(0, 0, 0, .05, 2.6, '#222'); box(-.12, -.08, 2.6, .24, .16, .7, '#1a1a1a'); const ph = (t / 6 | 0) % 3; ['#ff3030', '#ffb030', '#30ff70'].forEach((cc, i) => { const [lx, ly] = pj(0, .09, 3.15 - i * .2); ctx.fillStyle = (2 - ph) === i ? cc : '#222'; ctx.beginPath(); ctx.arc(lx, ly, 2.6 * z, 0, 7); ctx.fill(); if ((2 - ph) === i) glowAt(0, .1, 3.15 - i * .2, cc, 14); }); break; }
      default: box(-.3, -.3, 0, .6, .6, .6, col || '#555');
    }
  }
  return { floor, cube, wall, person, prop, solidProp, foot, boxer, shade, rgba, hash, FLOORS, STYLE };
})();
