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
  const P = { x: 0, z: 0, y: 1.62, yaw: 0, pitch: 0, bob: 0 };
  const keys = new Set(), stick = { x: 0, y: 0 }, look = { dx: 0, dy: 0 };
  const lowPower = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  /* ---------- textures drawn on canvases ---------- */
  const texCache = {};
  function canvasTex(key, w, h, draw, repeat) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return (texCache[key] = t);
  }
  const noise = (g, w, h, n, a, col = '#000') => { g.fillStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = Math.random() * a; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } g.globalAlpha = 1; };
  const TEX = {
    concrete: r => canvasTex('concrete' + r, 256, 256, (g, w, h) => { g.fillStyle = '#5b5d60'; g.fillRect(0, 0, w, h); noise(g, w, h, 2600, .25); noise(g, w, h, 900, .18, '#fff'); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(30,30,30,.18)'; g.beginPath(); g.moveTo(Math.random() * w, 0); g.lineTo(Math.random() * w, h); g.stroke(); } }, r),
    asphalt: r => canvasTex('asphalt' + r, 256, 256, (g, w, h) => { g.fillStyle = '#2b2d30'; g.fillRect(0, 0, w, h); noise(g, w, h, 4000, .35); noise(g, w, h, 1200, .12, '#9aa'); }, r),
    carpet: r => canvasTex('carpet' + r, 256, 256, (g, w, h) => {
      g.fillStyle = '#4a0f1c'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 64 + 32, cy = y * 64 + 32;
        g.strokeStyle = '#b8862b'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.closePath(); g.stroke();
        g.fillStyle = '#0f3d3a'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill(); g.fillStyle = '#d9a441'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
        g.strokeStyle = 'rgba(217,164,65,.35)'; g.lineWidth = 1; g.strokeRect(x * 64 + 4, y * 64 + 4, 56, 56); }
      noise(g, w, h, 3000, .25); }, r),
    marble: r => canvasTex('marble' + r, 512, 512, (g, w, h) => {
      g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(110,100,90,${.06 + Math.random() * .12})`; g.lineWidth = .6 + Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (Math.random() - .5) * 40; y += 20 + Math.random() * 30; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, r),
    wood: r => canvasTex('wood' + r, 256, 256, (g, w, h) => { g.fillStyle = '#4a2c18'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(${90 + Math.random() * 40},${50 + Math.random() * 25},${25 + Math.random() * 15},.35)`; g.fillRect(0, y, w, 1 + Math.random() * 2); } for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 64, w, 1); } }, r),
    felt: r => canvasTex('felt' + r, 128, 128, (g, w, h) => { g.fillStyle = '#0e5a3a'; g.fillRect(0, 0, w, h); noise(g, w, h, 1500, .2); }, r),
    wallpaper: r => canvasTex('wallpaper' + r, 256, 256, (g, w, h) => { g.fillStyle = '#20140f'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(184,134,43,.22)'; g.lineWidth = 2; for (let x = 0; x < w; x += 32) { g.beginPath(); for (let y = 0; y <= h; y += 8) g.lineTo(x + 16 + Math.sin(y / 16) * 8, y); g.stroke(); } noise(g, w, h, 1200, .2); }, r),
    corridor: r => canvasTex('corridor' + r, 256, 256, (g, w, h) => { g.fillStyle = '#2a3a40'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = x % 32 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 8, h); } noise(g, w, h, 1500, .2); }, r),
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
  function mat(key, opts) { return mats[key] || (mats[key] = new THREE.MeshStandardMaterial(opts)); }

  /* ---------- building blocks ---------- */
  function box(w, h, d, m, x, y, z, solid) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); root.add(mesh);
    if (solid) colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
    return mesh;
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
    const hairM = mat('hair' + o.hair, { color: o.hair || '#2a1d14', roughness: .85 });
    const add = (geo, m, x, y, z, parent = g) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
    const cap = (r, len, seg = 10) => new THREE.CapsuleGeometry(r, len, 4, seg);
    // legs and shoes
    for (const lx of [-.1, .1]) { add(cap(.075, .7), pants, lx, .46, 0); add(new THREE.BoxGeometry(.12, .07, .27), mat('shoe', { color: '#121212', roughness: .35, metalness: .2 }), lx, .035, .045); }
    if (o.skirt) add(new THREE.CylinderGeometry(.19, .3, .55, 18), coat, 0, .66, 0);
    // torso: a tapered body with shoulders
    const torso = new THREE.Group(); torso.position.y = 1.18; g.add(torso);
    const tw = broad ? 1.22 : 1;
    const body = add(new THREE.CylinderGeometry(.2 * tw, (o.skirt ? .2 : .17) * tw, .62, 18), coat, 0, 0, 0, torso); body.scale.z = .72;
    add(new THREE.SphereGeometry(.2 * tw, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), coat, 0, .3, 0, torso).scale.set(1, .38, .72);
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(.075, 10, 8), coat, sx * .2 * tw, .27, 0, torso);
    // shirt and tie in the opening of the coat, lapels either side
    if (o.shirt) { const v = add(new THREE.PlaneGeometry(.12, .26), mat('shirt' + o.shirt, { color: o.shirt, roughness: .7, side: THREE.DoubleSide }), 0, .17, .128 * tw, torso); v.rotation.x = -.18; }
    if (o.tie) { const t = add(new THREE.BoxGeometry(.04, .26, .012), mat('tie' + o.tie, { color: o.tie, roughness: .5 }), 0, .13, .134 * tw, torso); t.rotation.x = -.16; }
    if (o.shirt) for (const sx of [-1, 1]) { const l = add(new THREE.BoxGeometry(.06, .24, .012), mat('lapel' + o.coat, { color: new THREE.Color(o.coat || '#333').multiplyScalar(.75), roughness: .6 }), sx * .07, .16, .132 * tw, torso); l.rotation.set(-.18, 0, sx * .28); }
    // arms hang from the shoulders so they can swing
    const arm = sx => { const p = new THREE.Group(); p.position.set(sx * .23 * tw, .26, 0); torso.add(p); add(cap(.058, .5), coat, 0, -.3, 0, p); add(new THREE.SphereGeometry(.05, 10, 8), skin, 0, -.62, .01, p).scale.set(.8, 1.15, .7); p.rotation.z = sx * .08; return p; };
    const armL = arm(-1), armR = arm(1);
    // neck and head
    add(new THREE.CylinderGeometry(.048, .056, .12, 10), skin, 0, 1.56, 0);
    const head = new THREE.Group(); head.position.set(0, 1.72, 0); g.add(head);
    const skull = add(new THREE.SphereGeometry(.118, 24, 18), skin, 0, 0, 0, head); skull.scale.set(.92, 1.12, 1);
    add(new THREE.SphereGeometry(.07, 14, 10), skin, 0, -.07, .035, head).scale.set(1.15, .8, 1); // jaw
    for (const ex of [-1, 1]) add(new THREE.SphereGeometry(.024, 8, 6), skin, ex * .11, 0, -.005, head).scale.set(.5, 1, .8); // ears
    const hair = add(new THREE.SphereGeometry(.124, 24, 12, 0, Math.PI * 2, 0, Math.PI * (o.bald ? .2 : .52)), hairM, 0, .018, -.008, head); hair.scale.set(.95, 1.13, 1.04);
    if (o.longHair) { const back = add(new THREE.CylinderGeometry(.11, .135, .32, 16, 1, false, Math.PI * .6, Math.PI * .8), hairM, 0, -.12, -.025, head); back.scale.z = .9; }
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
    if (busy || !focus) return; busy = true; keys.clear(); stick.x = stick.y = 0;
    try { await focus.fn(); } finally { busy = false; }
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
    const speed = (keys.has('shift') ? 3.6 : 2.1) * dt * (FX && FX.slow || 1);
    const dx = (Math.sin(P.yaw) * f - Math.cos(P.yaw) * s) * speed, dz = (Math.cos(P.yaw) * f + Math.sin(P.yaw) * s) * speed;
    if (!blocked(P.x + dx, P.z)) P.x += dx; if (!blocked(P.x, P.z + dz)) P.z += dz;
    if (len > .05) P.bob += dt * (keys.has('shift') ? 11 : 7.5); else P.bob *= .9;
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
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(68, 1, .05, 220); scene.add(cam);
    const cv = renderer.domElement; cv.className = 'r3-cv';
    el = { host, cv, prompt: h('div.r3-prompt'), useBtn: h('button.r3-use', { 'aria-label': 'Use', onclick: () => activate() }, '✋'), joy: h('div.r3-joy', h('i')), hint: h('div.r3-hint', lowPower ? 'Left thumb to walk, drag on the right to look, ✋ to use.' : 'Click (or drag) to look around. WASD to walk, Shift to hurry, E to use, Esc to let go of the mouse.') };
    host.append(cv, h('div.r3-cross'), el.prompt, el.useBtn, el.joy, el.hint);
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
    cv.addEventListener('touchmove', e => { for (const t of e.changedTouches) { const s = touches[t.identifier]; if (!s) continue; if (s.left) { const dx = (t.clientX - s.x) / 50, dy = (t.clientY - s.y) / 50; const l = Math.hypot(dx, dy); stick.x = l > 1 ? dx / l : dx; stick.y = l > 1 ? dy / l : dy; el.joy.firstChild.style.transform = `translate(${stick.x * 26}px, ${stick.y * 26}px)`; } else { look.dx += (t.clientX - s.lx) * 1.6; look.dy += (t.clientY - s.ly) * 1.6; s.lx = t.clientX; s.ly = t.clientY; } } e.preventDefault(); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { const s = touches[t.identifier]; if (s && s.left) { stick.x = stick.y = 0; el.joy.classList.remove('on'); el.joy.firstChild.style.transform = ''; } delete touches[t.identifier]; } };
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
    scene.background = new THREE.Color(info.bg || '#050608');
    scene.fog = new THREE.FogExp2(info.fogColor || info.bg || '#050608', info.fog != null ? info.fog : .045);
    renderer.toneMappingExposure = info.exposure || 1;
    const sp = at || info.spawn || [0, 0, 0]; P.x = sp[0]; P.z = sp[1]; P.yaw = sp[2] || 0; P.pitch = 0;
    if (el) { el.host.classList.remove('fading'); el.prompt.textContent = ''; }
  }
  // look at something from a fixed spot (pos and look are world [x, y, z]); view(null) hands the camera back
  function view(pos, look) {
    if (!cam) return;
    const from = { p: cam.position.clone(), q: cam.quaternion.clone() };
    if (!pos) { V = V ? { from, to: null, t: 0 } : null; return; }
    const d = new THREE.PerspectiveCamera(); d.position.set(pos[0], pos[1], pos[2]); d.lookAt(look[0], look[1], look[2]); // a camera's lookAt faces -z, as ours does
    V = { from, to: { p: d.position.clone(), q: d.quaternion.clone() }, t: 0 };
  }
  const api = { THREE: null, TEX, mat, box, cyl, plane, wall, light, sign, person, rain, use, shadowBlob, canvasTex, add: o => root.add(o), every: fn => updaters.push(fn), get root() { return root; }, get player() { return P; }, collide: r => colliders.push(r) };
  return { mount, unmount, go, api, view, setFx(v) { FX = v; }, get area() { return area; }, get busy() { return busy; }, set busy(v) { busy = v; }, player: P, freeze(v) { busy = v; if (v) { keys.clear(); stick.x = stick.y = 0; if (document.pointerLockElement) document.exitPointerLock(); } }, activate, get focus() { return focus; } };
})();
