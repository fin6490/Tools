/* Level 2 engine: a small first-person 3D engine on three.js for the waking world.
   - Areas are built on demand (one at a time) from simple shapes and textures drawn on canvases,
     so nothing needs downloading beyond three.js itself.
   - You walk with WASD / arrows (or the left thumb on a phone), look with the mouse (click to
     capture it) or by dragging on the right, and use whatever is in front of you with E or Space
     (or the hand button).
   - Collisions are boxes on the floor plan; interactions are points with a radius you have to be
     near and roughly facing. */
const R3 = (() => {
  let renderer = null, scene = null, cam = null, root = null, raf = 0, last = 0, el = null;
  let area = null, colliders = [], uses = [], updaters = [], focus = null, busy = false, V = null, FX = null;
  const P = { x: 0, z: 0, y: 1.62, yaw: 0, pitch: 0, bob: 0, vx: 0, vz: 0 };
  const keys = new Set(), stick = { x: 0, y: 0, run: false }, look = { dx: 0, dy: 0 };
  let runLock = false; // the 🏃 button on touch screens
  const running = () => (keys.has('shift') || stick.run || runLock) && !(FX && FX.noRun);
  const lowPower = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  /* ---------- textures drawn on canvases ---------- */
  const texCache = {};
  function canvasTex(key, w, h, draw, repeat, bumpy) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = lowPower ? 2 : 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    if (bumpy) t.userData.normal = normalFrom(c, bumpy, t);
    return (texCache[key] = t);
  }
  // a normal map worked out from a texture's own light and dark, so concrete, carpet and wood catch the light like surfaces
  function normalFrom(c, strength, like) {
    const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data, out = document.createElement('canvas'); out.width = w; out.height = h;
    const g = out.getContext('2d'), img = g.createImageData(w, h), d = img.data, lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) lum[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
    const at = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      d[i] = (-dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const n = new THREE.CanvasTexture(out); n.wrapS = like.wrapS; n.wrapT = like.wrapT; n.repeat.copy(like.repeat); n.anisotropy = like.anisotropy;
    return n;
  }
  const noise = (g, w, h, n, a, col = '#000') => { g.fillStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = Math.random() * a; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } g.globalAlpha = 1; };
  const TEX = {
    concrete: r => canvasTex('concrete' + r, 256, 256, (g, w, h) => { g.fillStyle = '#5b5d60'; g.fillRect(0, 0, w, h); noise(g, w, h, 2600, .25); noise(g, w, h, 900, .18, '#fff'); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(30,30,30,.18)'; g.beginPath(); g.moveTo(Math.random() * w, 0); g.lineTo(Math.random() * w, h); g.stroke(); } }, r, 3),
    asphalt: r => canvasTex('asphalt' + r, 256, 256, (g, w, h) => { g.fillStyle = '#2b2d30'; g.fillRect(0, 0, w, h); noise(g, w, h, 4000, .35); noise(g, w, h, 1200, .12, '#9aa'); }, r, 2.5),
    carpet: r => canvasTex('carpet' + r, 256, 256, (g, w, h) => {
      g.fillStyle = '#4a0f1c'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 64 + 32, cy = y * 64 + 32;
        g.strokeStyle = '#b8862b'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.closePath(); g.stroke();
        g.fillStyle = '#0f3d3a'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill(); g.fillStyle = '#d9a441'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
        g.strokeStyle = 'rgba(217,164,65,.35)'; g.lineWidth = 1; g.strokeRect(x * 64 + 4, y * 64 + 4, 56, 56); }
      noise(g, w, h, 3000, .25); }, r, 2),
    marble: r => canvasTex('marble' + r, 512, 512, (g, w, h) => {
      g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(110,100,90,${.06 + Math.random() * .12})`; g.lineWidth = .6 + Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (Math.random() - .5) * 40; y += 20 + Math.random() * 30; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, r, 1),
    wood: r => canvasTex('wood' + r, 256, 256, (g, w, h) => { g.fillStyle = '#4a2c18'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(${90 + Math.random() * 40},${50 + Math.random() * 25},${25 + Math.random() * 15},.35)`; g.fillRect(0, y, w, 1 + Math.random() * 2); } for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 64, w, 1); } }, r, 2.5),
    felt: r => canvasTex('felt' + r, 128, 128, (g, w, h) => { g.fillStyle = '#0e5a3a'; g.fillRect(0, 0, w, h); noise(g, w, h, 1500, .2); }, r, 1.2),
    wallpaper: r => canvasTex('wallpaper' + r, 256, 256, (g, w, h) => { g.fillStyle = '#20140f'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(184,134,43,.22)'; g.lineWidth = 2; for (let x = 0; x < w; x += 32) { g.beginPath(); for (let y = 0; y <= h; y += 8) g.lineTo(x + 16 + Math.sin(y / 16) * 8, y); g.stroke(); } noise(g, w, h, 1200, .2); }, r, 1.5),
    corridor: r => canvasTex('corridor' + r, 256, 256, (g, w, h) => { g.fillStyle = '#2a3a40'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = x % 32 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 8, h); } noise(g, w, h, 1500, .2); }, r, 1.5),
  };
  // a glowing sign: text on a dark plate, unaffected by the lights
  function sign(text, { color = '#ff3b6b', w = 3, h = .7, font = 'bold 120px Georgia', bg = 'rgba(0,0,0,0)' } = {}) {
    const tex = canvasTex('sign:' + text + color + font, 1024, 256, (g, cw, ch) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = color; g.shadowBlur = 40; g.fillStyle = color; g.fillText(text, cw / 2, ch / 2); g.shadowBlur = 12; g.fillStyle = '#fff'; g.globalAlpha = .55; g.fillText(text, cw / 2, ch / 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
    return m;
  }
  const mats = {};
  function mat(key, opts) {
    if (mats[key]) return mats[key];
    if (opts && opts.map && opts.map.userData.normal && !opts.normalMap) opts = { ...opts, normalMap: opts.map.userData.normal, normalScale: new THREE.Vector2(.6, .6) };
    return (mats[key] = new THREE.MeshStandardMaterial(opts));
  }

  /* ---------- building blocks ---------- */
  // a box with rounded edges: nothing in the real world has perfectly sharp corners, and the light shows it
  const geoCache = {};
  function rbox(w, h, d, r, seg = 3) {
    r = Math.max(0, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    const key = [w, h, d, r, seg].map(v => +v.toFixed(4)).join(':'); if (geoCache[key]) return geoCache[key];
    if (r < .002) return (geoCache[key] = new THREE.BoxGeometry(w, h, d));
    const n = seg * 2 + 1, g = new THREE.BoxGeometry(1, 1, 1, n, n, n), pos = g.attributes.position, nor = g.attributes.normal;
    const half = [w / 2, h / 2, d / 2], inner = half.map(v => v - r), v = [0, 0, 0], q = [0, 0, 0];
    // spread each axis so the outer rows sit inside the rounded band, then push them out onto the curve
    const remap = (c, i) => { const a = Math.abs(c) * 2, k = seg / n; const t = a <= 1 - 2 * k ? a / (1 - 2 * k) * inner[i] : inner[i] + (a - (1 - 2 * k)) / (2 * k) * r; return Math.sign(c) * t; };
    for (let j = 0; j < pos.count; j++) {
      v[0] = remap(pos.getX(j), 0); v[1] = remap(pos.getY(j), 1); v[2] = remap(pos.getZ(j), 2);
      for (let i = 0; i < 3; i++) q[i] = Math.max(-inner[i], Math.min(inner[i], v[i]));
      let dx = v[0] - q[0], dy = v[1] - q[1], dz = v[2] - q[2], l = Math.hypot(dx, dy, dz);
      if (l < 1e-6) { pos.setXYZ(j, v[0], v[1], v[2]); continue; }
      dx /= l; dy /= l; dz /= l;
      pos.setXYZ(j, q[0] + dx * r, q[1] + dy * r, q[2] + dz * r); nor.setXYZ(j, dx, dy, dz);
    }
    g.computeBoundingSphere(); return (geoCache[key] = g);
  }
  function box(w, h, d, m, x, y, z, solid) {
    const r = Math.min(.035, Math.min(w, h, d) * .22);
    const mesh = new THREE.Mesh(rbox(w, h, d, r), m); mesh.position.set(x, y, z); root.add(mesh);
    if (solid) { colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]); if (y - h / 2 < .08 && h > .25) contact(x, z, w, d); }
    return mesh;
  }
  // a soft dark patch where something heavy meets the floor
  function contact(x, z, w, d, o = .5) {
    const tex = canvasTex('contact', 64, 64, (g) => { for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(0,0,0,${.07})`; const k = i * 2; g.beginPath(); g.roundRect ? g.roundRect(k, k, 64 - 2 * k, 64 - 2 * k, 12) : g.rect(k, k, 64 - 2 * k, 64 - 2 * k); g.fill(); } });
    const m = plane(w + .5, d + .5, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o, depthWrite: false }), x, .011, z); return m;
  }
  // a halo round a bright light, which is what your eye does with it
  function glow(x, y, z, color = '#fff2d8', size = 1, o = .6) {
    const tex = canvasTex('glow', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sp.position.set(x, y, z); sp.scale.set(size, size, 1); root.add(sp); return sp;
  }
  function cyl(rt, rb, h, m, x, y, z, solid, seg = 20) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); mesh.position.set(x, y, z); root.add(mesh);
    if (solid) colliders.push([x - rb, z - rb, x + rb, z + rb]);
    return mesh;
  }
  function plane(w, d, m, x, y, z, rx = -Math.PI / 2) { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); mesh.rotation.x = rx; mesh.position.set(x, y, z); root.add(mesh); return mesh; }
  // a soft dark blob under things so they sit on the floor
  function shadowBlob(x, z, r = .6, o = .45) {
    const tex = canvasTex('blob', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const m = plane(r * 2, r * 2, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o, depthWrite: false }), x, .012, z); return m;
  }
  function light(color, intensity, dist, x, y, z) { const l = new THREE.PointLight(color, intensity, dist, 2); l.position.set(x, y, z); root.add(l); return l; }
  function wall(x1, z1, x2, z2, h, m, thick = .2) {
    const len = Math.hypot(x2 - x1, z2 - z1), mesh = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), m);
    mesh.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2); mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1); root.add(mesh);
    const minX = Math.min(x1, x2) - thick / 2, maxX = Math.max(x1, x2) + thick / 2, minZ = Math.min(z1, z2) - thick / 2, maxZ = Math.max(z1, z2) + thick / 2;
    colliders.push([minX, minZ, maxX, maxZ]); return mesh;
  }
  // a person: legs, coat with lapels, arms and hands, a face, hair; idles, breathes and turns to face you
  function person(o) {
    const g = new THREE.Group(), s = o.height || 1, broad = o.build === 'broad';
    const skin = mat('skin' + o.skin, { color: o.skin || '#c99b7a', roughness: .62 });
    const coat = mat('coat' + o.coat, { color: o.coat || '#333', roughness: .78 });
    const pants = mat('pants' + o.pants, { color: o.pants || '#222', roughness: .85 });
    const hairM = mat('hair' + o.hair, { color: o.hair || '#2a1d14', roughness: .85, side: THREE.DoubleSide });
    const add = (geo, m, x, y, z, parent = g) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
    const cap = (r, len, seg = 10) => new THREE.CapsuleGeometry(r, len, 4, seg);
    // legs and shoes
    for (const lx of [-.1, .1]) { add(cap(.075, .7), pants, lx, .46, 0); add(new THREE.BoxGeometry(.12, .07, .27), mat('shoe', { color: '#121212', roughness: .35, metalness: .2 }), lx, .035, .045); }
    if (o.skirt) add(new THREE.CylinderGeometry(.19, .3, .55, 18), coat, 0, .66, 0);
    // torso: a tapered body with shoulders
    const torso = new THREE.Group(); torso.position.y = 1.18; g.add(torso);
    const tw = broad ? 1.22 : 1;
    // an open jacket (or a doctor's knee-length coat) is a real shell with a gap at the front, so the shirt and tie sit inside it
    const open = !!o.shirt, shirtM = open ? mat('shirt' + o.shirt, { color: o.shirt, roughness: .72 }) : coat;
    const body = add(new THREE.CylinderGeometry(.19 * tw, (o.skirt ? .2 : .165) * tw, .62, 18), shirtM, 0, 0, 0, torso); body.scale.z = .72;
    add(new THREE.SphereGeometry(.2 * tw, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), coat, 0, .3, 0, torso).scale.set(1, .38, .72);
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(.075, 10, 8), coat, sx * .2 * tw, .27, 0, torso);
    if (open) {
      const gap = o.labCoat ? .62 : .78, len = o.labCoat ? 1.02 : .68, rTop = .212 * tw, rBot = (o.labCoat ? .26 : .19) * tw;
      const shell = add(new THREE.CylinderGeometry(rTop, rBot, len, 28, 1, true, gap / 2, Math.PI * 2 - gap), mat('shell' + o.coat, { color: o.coat || '#333', roughness: .78, side: THREE.DoubleSide }), 0, .31 - len / 2, 0, torso);
      shell.scale.z = .76;
      // lapels fold back along both edges of the opening, a shade darker than the cloth
      const lap = mat('lapel' + o.coat, { color: new THREE.Color(o.coat || '#333').multiplyScalar(.82), roughness: .6, side: THREE.DoubleSide });
      for (const sx of [-1, 1]) { const l = add(new THREE.BoxGeometry(.05, .26, .01), lap, sx * Math.sin(gap / 2) * rTop * .96, .17, Math.cos(gap / 2) * rTop * .76 + .006, torso); l.rotation.set(-.12, sx * .5, sx * .22); }
      // a collar at the neck, and for a lab coat, two pockets and a pen
      const collar = add(new THREE.TorusGeometry(.07, .018, 6, 16, Math.PI * 1.3), mat('collar' + o.shirt, { color: o.shirt, roughness: .7 }), 0, .34, .01, torso); collar.rotation.set(Math.PI / 2 + .25, 0, -Math.PI * .15 + Math.PI);
      if (o.labCoat) {
        for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.1, .09, .012), lap, sx * .15 * tw, -.36, Math.cos(.6) * rBot * .76 + .02, torso).rotation.y = sx * .45;
        add(new THREE.CylinderGeometry(.007, .007, .09, 6), mat('pen', { color: '#1b3d8a', metalness: .4 }), .12 * tw, .1, .15, torso);
      }
    }
    if (o.tie) { const t = add(new THREE.BoxGeometry(.045, .3, .014), mat('tie' + o.tie, { color: o.tie, roughness: .5 }), 0, .11, .133 * tw, torso); t.rotation.x = -.14; add(new THREE.BoxGeometry(.035, .03, .02), mat('tie' + o.tie, { color: o.tie }), 0, .27, .136 * tw, torso); }
    // arms hang from the shoulders so they can swing
    const arm = sx => { const p = new THREE.Group(); p.position.set(sx * .23 * tw, .26, 0); torso.add(p); add(cap(.058, .5), coat, 0, -.3, 0, p); add(new THREE.SphereGeometry(.05, 10, 8), skin, 0, -.62, .01, p).scale.set(.8, 1.15, .7); p.rotation.z = sx * .08; return p; };
    const armL = arm(-1), armR = arm(1);
    // neck and head
    add(new THREE.CylinderGeometry(.048, .056, .12, 10), skin, 0, 1.56, 0);
    const head = new THREE.Group(); head.position.set(0, 1.72, 0); g.add(head);
    const skull = add(new THREE.SphereGeometry(.118, 24, 18), skin, 0, 0, 0, head); skull.scale.set(.92, 1.12, 1);
    add(new THREE.SphereGeometry(.07, 14, 10), skin, 0, -.066, .018, head).scale.set(1.12, .78, .92); // jaw
    for (const ex of [-1, 1]) add(new THREE.SphereGeometry(.024, 8, 6), skin, ex * .11, 0, -.005, head).scale.set(.5, 1, .8); // ears
    if (!o.bald) {
      const hair = add(new THREE.SphereGeometry(.127, 26, 14, 0, Math.PI * 2, 0, Math.PI * .56), hairM, 0, .02, -.012, head); hair.scale.set(.98, 1.1, 1.06); hair.rotation.x = -.62;
      add(new THREE.SphereGeometry(.125, 26, 10, 0, Math.PI * 2, 0, Math.PI * .4), hairM, 0, .02, -.01, head).scale.set(.98, 1.1, 1.04); // over the temples
      for (const ex of [-1, 1]) add(new THREE.BoxGeometry(.012, .05, .03), hairM, ex * .104, -.005, .02, head); // sideburns
      if (o.bun) add(new THREE.SphereGeometry(.055, 14, 10), hairM, 0, .1, -.1, head);
      if (o.longHair) { const back = add(new THREE.CylinderGeometry(.115, .135, .3, 16, 1, false, Math.PI * .62, Math.PI * .76), hairM, 0, -.12, -.03, head); back.scale.z = .9; }
    } else add(new THREE.SphereGeometry(.122, 20, 8, 0, Math.PI * 2, Math.PI * .45, Math.PI * .2), hairM, 0, 0, -.01, head).scale.set(.97, 1.1, 1.03); // a fringe of hair round the back
    const white = mat('eyewhite', { color: '#eee8e0', roughness: .3 }), iris = mat('iris', { color: '#1d1610', roughness: .15 });
    for (const ex of [-.04, .04]) { add(new THREE.SphereGeometry(.017, 10, 8), white, ex, .018, .1, head).scale.set(1, .7, .5); add(new THREE.SphereGeometry(.009, 8, 6), iris, ex, .018, .108, head); add(new THREE.BoxGeometry(.04, .008, .01), mat('brow' + o.hair, { color: o.hair || '#2a1d14' }), ex, .048, .106, head).rotation.z = ex > 0 ? -.08 : .08; }
    const nose = add(new THREE.ConeGeometry(.014, .045, 6), skin, 0, -.008, .117, head); nose.rotation.x = Math.PI / 2.4;
    add(new THREE.BoxGeometry(.035, .006, .006), mat('lip' + o.skin, { color: new THREE.Color(o.skin || '#c99b7a').multiplyScalar(.7) }), 0, -.05, .104, head);
    if (o.glasses) { const fr = mat('frames', { color: '#151515', metalness: .6, roughness: .3 }); for (const ex of [-.04, .04]) { const r = add(new THREE.TorusGeometry(.024, .003, 6, 18), fr, ex, .018, .118, head); r.scale.y = .78; } add(new THREE.BoxGeometry(.03, .003, .003), fr, 0, .022, .12, head); }
    g.scale.setScalar(s); g.position.set(o.x, 0, o.z); g.rotation.y = o.face || 0; root.add(g);
    shadowBlob(o.x, o.z, .42, .55);
    colliders.push([o.x - .3, o.z - .3, o.x + .3, o.z + .3]);
    const phase = Math.random() * 6, baseYaw = o.face || 0;
    updaters.push((t) => {
      const br = Math.sin(t * 1.5 + phase);
      torso.scale.set(1 + br * .006, 1 + br * .01, 1 + br * .012); head.position.y = 1.72 + br * .005;
      armL.rotation.x = Math.sin(t * .7 + phase) * .03; armR.rotation.x = -Math.sin(t * .7 + phase) * .03;
      // turn their head, then their body, towards you when you're close
      const dx = P.x - g.position.x, dz = P.z - g.position.z, d = Math.hypot(dx, dz);
      const want = d < 4.5 && !o.still ? Math.atan2(dx, dz) : baseYaw;
      const diff = ((want - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      g.rotation.y += diff * .03; head.rotation.y += (Math.max(-.6, Math.min(.6, diff)) - head.rotation.y) * .08;
      if (o.anim) o.anim(t, { armL, armR, head, torso });
    });
    return g;
  }

  /* ---------- weather ---------- */
  function rain(cx, cz, w, d, count = 1400, top = 9) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) { const x = cx + (Math.random() - .5) * w, z = cz + (Math.random() - .5) * d, y = Math.random() * top; pos.set([x, y, z, x - .02, y - .35, z], i * 6); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9ab4c8, transparent: true, opacity: .35 })); root.add(lines);
    updaters.push((t, dt) => { const a = geo.attributes.position.array; for (let i = 0; i < count; i++) { let y = a[i * 6 + 1] - dt * 11; if (y < 0) y += top; a[i * 6 + 1] = y; a[i * 6 + 4] = y - .35; } geo.attributes.position.needsUpdate = true; });
    return lines;
  }

  /* ---------- interaction ---------- */
  // something you can use: a point, a radius, and what happens
  function use(x, z, label, fn, { r = 1.6, y = 1.1, when } = {}) { const u = { x, z, y, label, fn, r, when }; uses.push(u); return u; }
  function pickFocus() {
    let best = null, bs = 1e9;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    for (const u of uses) {
      if (u.when && !u.when()) continue;
      const dx = u.x - P.x, dz = u.z - P.z, d = Math.hypot(dx, dz); if (d > u.r) continue;
      const dot = (dx * fx + dz * fz) / Math.max(.001, d); if (d > .7 && dot < .55) continue;
      const score = d - dot; if (score < bs) { bs = score; best = u; }
    }
    return best;
  }
  async function activate() {
    if (busy || !focus) return; busy = true; keys.clear(); stick.x = stick.y = 0; stick.run = false;
    try { await focus.fn(); } finally { busy = false; }
  }

  /* ---------- footsteps ---------- */
  // a soft scuff on every step, a little different each time, harder on concrete than on carpet
  let ax = null;
  function footstep(speed) {
    if (!App.state || App.state.settings.sound === false) return;
    try {
      ax = ax || new (window.AudioContext || window.webkitAudioContext)(); if (ax.state === 'suspended') ax.resume();
      const t = ax.currentTime, n = ax.createBufferSource(), b = ax.createBuffer(1, Math.floor(ax.sampleRate * .12), ax.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const soft = /floor|salon|corridor|room|cemetery/.test(area || ''), f = ax.createBiquadFilter(), g = ax.createGain();
      f.type = 'lowpass'; f.frequency.value = (soft ? 500 : 1400) * (.85 + Math.random() * .3); g.gain.value = (soft ? .05 : .09) * Math.min(1.4, speed / 2.1);
      n.buffer = b; n.connect(f); f.connect(g); g.connect(ax.destination); n.start(t);
    } catch (e) { }
  }

  /* ---------- movement ---------- */
  function blocked(x, z) { const r = .28; for (const [a, b, c, d] of colliders) if (x + r > a && x - r < c && z + r > b && z - r < d) return true; return false; }
  function step(dt) {
    if (busy) return;
    let f = 0, s = 0;
    if (keys.has('w') || keys.has('arrowup')) f += 1; if (keys.has('s') || keys.has('arrowdown')) f -= 1;
    if (keys.has('a')) s -= 1; if (keys.has('d')) s += 1;
    if (keys.has('arrowleft')) P.yaw += dt * 2.2; if (keys.has('arrowright')) P.yaw -= dt * 2.2;
    f += -stick.y; s += stick.x;
    P.yaw -= look.dx * .0042; P.pitch = Math.max(-1.1, Math.min(1.1, P.pitch - look.dy * .0036)); look.dx = look.dy = 0;
    const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    const top = (running() ? 3.6 : 2.1) * (FX && FX.slow || 1);
    const wx = (Math.sin(P.yaw) * f - Math.cos(P.yaw) * s) * top, wz = (Math.cos(P.yaw) * f + Math.sin(P.yaw) * s) * top;
    const k = 1 - Math.exp(-dt * (len > .05 ? 9 : 12)); P.vx += (wx - P.vx) * k; P.vz += (wz - P.vz) * k; // a body has weight: you speed up and slow down
    const dx = P.vx * dt, dz = P.vz * dt;
    // if you're already inside something (a spawn or a wake-up spot too close to furniture), you can always walk out
    const stuck = blocked(P.x, P.z);
    if (stuck || !blocked(P.x + dx, P.z)) P.x += dx; else P.vx = 0;
    if (stuck || !blocked(P.x, P.z + dz)) P.z += dz; else P.vz = 0;
    const sp = Math.hypot(P.vx, P.vz);
    if (sp > .3) { const before = Math.sin(P.bob); P.bob += dt * (running() ? 11 : 7.5) * Math.min(1, sp / 2); if ((before > 0) !== (Math.sin(P.bob) > 0)) footstep(sp); } else P.bob *= .9;
  }

  /* ---------- the loop ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; const t = now / 1000;
    step(dt);
    cam.position.set(P.x, P.y + Math.sin(P.bob) * .035, P.z);
    cam.rotation.set(P.pitch, P.yaw + Math.PI, 0, 'YXZ');
    if (V) { // a fixed camera for a game, eased in from wherever you were standing (and back out again)
      V.t = Math.min(1, V.t + dt * 1.6); const k = 1 - Math.pow(1 - V.t, 3);
      const toP = V.to ? V.to.p : cam.position.clone(), toQ = V.to ? V.to.q : cam.quaternion.clone();
      cam.position.lerpVectors(V.from.p, toP, k); cam.quaternion.slerpQuaternions(V.from.q, toQ, k);
      if (!V.to && V.t >= 1) V = null;
    }
    if (FX) { // what your body is doing to the view: trembling hands, a slow sick sway
      if (FX.sway) { cam.rotateZ(Math.sin(t * .63) * FX.sway); cam.rotateX(Math.sin(t * .41 + 1) * FX.sway * .6); }
      if (FX.shake) { cam.position.x += (Math.random() - .5) * FX.shake; cam.position.y += (Math.random() - .5) * FX.shake; cam.rotateZ((Math.random() - .5) * FX.shake * .8); }
    }
    for (const u of updaters) u(t, dt);
    const f = busy ? null : pickFocus();
    if (f !== focus) { focus = f; if (el) { el.prompt.textContent = f ? f.label : ''; el.prompt.classList.toggle('on', !!f); el.useBtn.classList.toggle('on', !!f); } }
    renderer.render(scene, cam);
  }

  /* ---------- mount, areas, input ---------- */
  function mount(host) {
    if (typeof THREE === 'undefined') { host.append(h('p', 'This part of the game needs 3D graphics, which did not load.')); return false; }
    renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(68, 1, .05, 220); scene.add(cam);
    const cv = renderer.domElement; cv.className = 'r3-cv';
    el = { host, cv, prompt: h('div.r3-prompt'), useBtn: h('button.r3-use', { 'aria-label': 'Use', onclick: () => activate() }, '✋'), runBtn: h('button.r3-run', { 'aria-label': 'Run', 'aria-pressed': 'false', onclick: e => { runLock = !runLock; e.currentTarget.classList.toggle('on', runLock); e.currentTarget.setAttribute('aria-pressed', runLock); } }, '🏃'), joy: h('div.r3-joy', h('i')), hint: h('div.r3-hint', lowPower ? 'Left thumb to walk (push it all the way out, or tap 🏃, to run), drag on the right to look, ✋ to use.' : 'Click (or drag) to look around. WASD to walk, Shift to hurry, E to use, Esc to let go of the mouse.') };
    host.append(cv, h('div.r3-cross'), el.prompt, el.useBtn, el.runBtn, el.joy, el.hint);
    setTimeout(() => el && el.hint.classList.add('fade'), 6000);
    const resize = () => { const w = host.clientWidth, hh = host.clientHeight; renderer.setSize(w, hh, false); cam.aspect = w / Math.max(1, hh); cam.fov = cam.aspect < 1 ? 84 : 68; cam.updateProjectionMatrix(); }; // phones in portrait get a wider view
    el.resize = resize; window.addEventListener('resize', resize); resize();
    // input
    el.kd = e => { if (document.querySelector('.modal-bg, .l2-over')) return; const k = e.key.toLowerCase(); if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); activate(); return; } if (['w', 'a', 's', 'd', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); keys.add(k); } };
    el.ku = e => keys.delete(e.key.toLowerCase());
    // mouse look: captured with pointer lock, or by dragging where the page can't capture the mouse (embedded frames)
    let drag = false;
    el.mm = e => { if (document.pointerLockElement === cv || drag) { look.dx += e.movementX; look.dy += e.movementY; } };
    el.mu = () => { drag = false; };
    cv.addEventListener('mousedown', () => { if (!busy) drag = true; }); window.addEventListener('mouseup', el.mu);
    window.addEventListener('keydown', el.kd); window.addEventListener('keyup', el.ku); window.addEventListener('mousemove', el.mm);
    cv.addEventListener('click', () => { if (lowPower || !cv.requestPointerLock || busy || document.pointerLockElement) return; try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } });
    // touch: left half is a joystick from wherever your thumb lands, right half drags the view
    const touches = {};
    cv.addEventListener('touchstart', e => { for (const t of e.changedTouches) { const left = t.clientX < innerWidth / 2; touches[t.identifier] = { left, x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY }; if (left) { el.joy.style.left = t.clientX + 'px'; el.joy.style.top = t.clientY + 'px'; el.joy.classList.add('on'); } } e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchmove', e => { for (const t of e.changedTouches) { const s = touches[t.identifier]; if (!s) continue; if (s.left) { const dx = (t.clientX - s.x) / 50, dy = (t.clientY - s.y) / 50; const l = Math.hypot(dx, dy); stick.x = l > 1 ? dx / l : dx; stick.y = l > 1 ? dy / l : dy; stick.run = l > 1.4; el.joy.classList.toggle('run', stick.run); el.joy.firstChild.style.transform = `translate(${stick.x * 26}px, ${stick.y * 26}px)`; } else { look.dx += (t.clientX - s.lx) * 1.6; look.dy += (t.clientY - s.ly) * 1.6; s.lx = t.clientX; s.ly = t.clientY; } } e.preventDefault(); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { const s = touches[t.identifier]; if (s && s.left) { stick.x = stick.y = 0; stick.run = false; el.joy.classList.remove('on', 'run'); el.joy.firstChild.style.transform = ''; } delete touches[t.identifier]; } };
    cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
    last = performance.now(); raf = requestAnimationFrame(frame);
    return true;
  }
  function unmount() {
    cancelAnimationFrame(raf); raf = 0;
    if (el) { window.removeEventListener('resize', el.resize); window.removeEventListener('keydown', el.kd); window.removeEventListener('keyup', el.ku); window.removeEventListener('mousemove', el.mm); window.removeEventListener('mouseup', el.mu); }
    if (document.pointerLockElement) document.exitPointerLock();
    clearArea(); if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); }
    renderer = scene = cam = el = null; keys.clear();
  }
  function clearArea() {
    if (root && scene) { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    root = null; colliders = []; uses = []; updaters = []; focus = null; area = null; V = null;
  }
  // build an area: fn(api) adds things and returns { spawn: [x, z, yaw], fog, bg, ... }
  async function go(name, build, at) {
    if (el) el.host.classList.add('fading'); await new Promise(r => setTimeout(r, el ? 450 : 0));
    clearArea(); root = new THREE.Group(); scene.add(root); area = name;
    const info = build(api) || {};
    const hi = !App.state || App.state.settings.gfx !== 'low'; // ☰ Graphics: low skips shadows and reflections for older phones
    if (hi) { environment(info); keyLight(info.shadow); } else { scene.environment = null; for (const key in mats) mats[key].envMapIntensity = 0; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, !hi ? 1 : lowPower ? 1.25 : 1.75));
    scene.background = new THREE.Color(info.bg || '#050608');
    scene.fog = new THREE.FogExp2(info.fogColor || info.bg || '#050608', info.fog != null ? info.fog : .045);
    renderer.toneMappingExposure = info.exposure || 1;
    const sp = at || info.spawn || [0, 0, 0]; P.x = sp[0]; P.z = sp[1]; P.yaw = sp[2] || 0; P.pitch = 0; P.vx = P.vz = 0;
    if (el) { el.host.classList.remove('fading'); el.prompt.textContent = ''; }
  }
  // one key light per area throws real shadows (people, furniture and cars stop floating). A spotlight
  // is a single shadow pass, cheap enough for phones at a lower resolution.
  function keyLight(S) {
    if (!S || !renderer) return;
    const l = new THREE.SpotLight(S.color || '#fff4e0', S.i != null ? S.i : 1, S.dist || 30, S.angle || 1, .55, 1.2);
    l.position.set(S.at[0], S.at[1], S.at[2]); l.target.position.set(S.to[0], S.to[1], S.to[2]); root.add(l, l.target);
    l.castShadow = true; const n = lowPower ? 512 : 1024; l.shadow.mapSize.set(n, n); l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3; l.shadow.camera.near = .3; l.shadow.camera.far = S.dist || 30;
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const flat = o.material.isMeshBasicMaterial || o.material.transparent;
      o.receiveShadow = !flat; if (!flat && o.geometry && o.geometry.type !== 'PlaneGeometry') o.castShadow = true;
    });
  }
  // what shiny things reflect: a soft room lit like this area (its own colours, a few bright panels
  // where its lights are), baked once per area into an environment map. It also gives everything a
  // gentle, believable fill light, which is most of what makes a scene look less like boxes.
  let pmrem = null, envRT = null;
  function environment(info) {
    if (!renderer) return;
    try {
      pmrem = pmrem || new THREE.PMREMGenerator(renderer);
      const es = new THREE.Scene(), bg = new THREE.Color(info.bg || '#050608'), lit = new THREE.Color(info.envLight || '#fff1dc');
      const top = bg.clone().lerp(lit, info.envTop != null ? info.envTop : .35), floor = bg.clone().multiplyScalar(.6);
      const room = new THREE.BoxGeometry(20, 10, 20), col = [], p = room.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + 5) / 10, c = floor.clone().lerp(top, k); col.push(c.r, c.g, c.b); }
      room.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      es.add(new THREE.Mesh(room, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
      const panel = new THREE.MeshBasicMaterial({ color: lit.clone().multiplyScalar(info.envPanels != null ? info.envPanels : 3) });
      for (const [x, z, w] of [[-4, -3, 4], [4, 2, 3], [0, 5, 5]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.2), panel); m.position.set(x, 4.9, z); m.rotation.x = Math.PI / 2; es.add(m); }
      const next = pmrem.fromScene(es, .04);
      if (envRT) envRT.dispose(); envRT = next; scene.environment = next.texture;
      const k = info.envI != null ? info.envI : .7; for (const key in mats) mats[key].envMapIntensity = k;
      room.dispose();
    } catch (e) { scene.environment = null; }
  }
  // look at something from a fixed spot (pos and look are world [x, y, z]); view(null) hands the camera back
  function view(pos, look) {
    if (!cam) return;
    const from = { p: cam.position.clone(), q: cam.quaternion.clone() };
    if (!pos) { V = V ? { from, to: null, t: 0 } : null; return; }
    const d = new THREE.PerspectiveCamera(); d.position.set(pos[0], pos[1], pos[2]); d.lookAt(look[0], look[1], look[2]); // a camera's lookAt faces -z, as ours does
    V = { from, to: { p: d.position.clone(), q: d.quaternion.clone() }, t: 0 };
  }
  const api = { THREE: null, TEX, mat, rbox, glow, contact, box, cyl, plane, wall, light, sign, person, rain, use, shadowBlob, canvasTex, add: o => root.add(o), every: fn => updaters.push(fn), get root() { return root; }, get player() { return P; }, collide: r => colliders.push(r) };
  return { mount, unmount, go, api, view, setFx(v) { FX = v; }, get area() { return area; }, get busy() { return busy; }, set busy(v) { busy = v; }, player: P, freeze(v) { busy = v; if (v) { keys.clear(); stick.x = stick.y = 0; stick.run = false; P.vx = P.vz = 0; if (document.pointerLockElement) document.exitPointerLock(); } }, activate, get focus() { return focus; }, get stuck() { return blocked(P.x, P.z); }, get running() { return running(); }, touch: lowPower };
})();
