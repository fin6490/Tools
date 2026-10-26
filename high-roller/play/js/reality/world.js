/* Level 2 places. Each builder makes one area out of simple shapes and returns where you start.
   Everything you can use calls L2.act(name), so the story decides what happens. */
const L2World = (() => {
  const act = (name, arg) => () => L2.act(name, arg);
  const has = k => () => L2.has(k);
  const not = k => () => !L2.has(k);

  // shared pieces
  function car(A, x, z, color, rot = 0, mine) {
    const g = new THREE.Group();
    const paint = A.mat('car' + color, { color, metalness: .55, roughness: .35 });
    const glass = A.mat('glass', { color: '#0b0f14', metalness: .8, roughness: .1 });
    const tyre = A.mat('tyre', { color: '#111', roughness: .9 });
    const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
    add(new THREE.BoxGeometry(1.86, .62, 4.4), paint, 0, .62, 0);
    add(new THREE.BoxGeometry(1.62, .5, 2.3), glass, 0, 1.15, -.2);
    add(new THREE.BoxGeometry(1.64, .06, 2.32), paint, 0, 1.42, -.2);
    for (const [wx, wz] of [[-.9, 1.35], [.9, 1.35], [-.9, -1.4], [.9, -1.4]]) { const w = add(new THREE.CylinderGeometry(.34, .34, .24, 16), tyre, wx, .34, wz); w.rotation.z = Math.PI / 2; }
    const hl = A.mat('headlight', { color: '#fff7e0', emissive: '#fff2c0', emissiveIntensity: mine ? .2 : .05 });
    add(new THREE.BoxGeometry(.38, .12, .05), hl, -.6, .72, 2.2); add(new THREE.BoxGeometry(.38, .12, .05), hl, .6, .72, 2.2);
    const tl = A.mat('taillight', { color: '#5a0a0a', emissive: '#ff1a1a', emissiveIntensity: .25 });
    add(new THREE.BoxGeometry(.4, .1, .05), tl, -.6, .74, -2.2); add(new THREE.BoxGeometry(.4, .1, .05), tl, .6, .74, -2.2);
    g.position.set(x, 0, z); g.rotation.y = rot; A.add(g); A.shadowBlob(x, z, 2.4, .55);
    const horiz = Math.abs(Math.sin(rot)) > .5; A.collide(horiz ? [x - 2.25, z - 1, x + 2.25, z + 1] : [x - 1, z - 2.25, x + 1, z + 2.25]);
    return g;
  }
  function chandelier(A, x, z, y = 4.4) {
    const gold = A.mat('gold', { color: '#d4af37', metalness: .9, roughness: .25, emissive: '#3a2a08' });
    const crystal = A.mat('crystal', { color: '#fff', emissive: '#ffe9b0', emissiveIntensity: 1.2, transparent: true, opacity: .9 });
    A.cyl(.02, .02, 1.2, gold, x, y + .6, z, false, 6);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.6, .03, 8, 32), gold); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); A.add(ring);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, c = new THREE.Mesh(new THREE.OctahedronGeometry(.06), crystal); c.position.set(x + Math.cos(a) * .6, y - .12 - (i % 2) * .08, z + Math.sin(a) * .6); A.add(c); }
    A.light('#ffd9a0', 1.1, 13, x, y - .3, z);
  }
  function slotBank(A, x, z, n, rot = 0, tag = 'a') {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const syms = ['7', '♦', 'BAR', '♣', '★', '♥', '$'], cols = ['#ff3355', '#ffd34d', '#4dd2ff', '#7dff8a', '#ff8af0'];
    let tick = 0;
    const draw = () => { g.fillStyle = '#05060a'; g.fillRect(0, 0, 256, 128); for (let r = 0; r < 3; r++) { g.fillStyle = '#10131c'; g.fillRect(8 + r * 82, 10, 76, 108); g.font = 'bold 44px Georgia'; g.textAlign = 'center'; g.fillStyle = cols[(r + tick) % cols.length]; g.fillText(syms[(r * 3 + tick) % syms.length], 46 + r * 82, 82); } g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, 256, 40); tex.needsUpdate = true; };
    draw(); A.every(t => { const k = Math.floor(t * 2.2); if (k !== tick) { tick = k; draw(); } });
    const body = A.mat('slotbody' + tag, { color: '#16161c', metalness: .6, roughness: .35 });
    const screen = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const trim = A.mat('slottrim', { color: '#d4af37', metalness: .9, roughness: .3, emissive: '#2a1c04' });
    const top = A.mat('slottop' + tag, { color: '#1a0508', emissive: tag === 'a' ? '#a0102a' : '#1a3a9a', emissiveIntensity: .45, roughness: .4 });
    const topper = new THREE.MeshBasicMaterial({ map: A.canvasTex('topper' + tag, 256, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, tag === 'a' ? '#3a0410' : '#04103a'); gr.addColorStop(1, '#000'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.font = 'bold 40px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = tag === 'a' ? '#ff4060' : '#4d8aff'; c.shadowBlur = 14; c.fillStyle = '#ffe9b0'; c.fillText(tag === 'a' ? 'MERIDIAN 7s' : 'DIAMOND TIDE', w / 2, h / 2 + 2); }), toneMapped: false });
    const stool = A.mat('slotstool', { color: '#3a0a12', roughness: .6 });
    for (let i = 0; i < n; i++) {
      const dx = Math.cos(rot) * i * 1.05, dz = -Math.sin(rot) * i * 1.05, g2 = new THREE.Group();
      const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g2.add(o); return o; };
      add(new THREE.BoxGeometry(.92, 1.75, .8), body, 0, .875, 0);
      add(new THREE.PlaneGeometry(.72, .42), screen, 0, 1.25, .405);
      add(new THREE.BoxGeometry(.96, .08, .84), trim, 0, 1.76, 0);
      add(new THREE.BoxGeometry(.84, .26, .7), top, 0, 1.93, -.02);
      add(new THREE.PlaneGeometry(.8, .22), topper, 0, 1.93, .335);
      add(new THREE.BoxGeometry(.8, .1, .3), trim, 0, .92, .5);
      add(new THREE.CylinderGeometry(.2, .22, .55, 14), stool, 0, .28, .95);
      g2.position.set(x + dx, 0, z + dz); g2.rotation.y = rot; A.add(g2);
      const back = g2.clone(); back.position.set(x + dx - Math.sin(rot) * .82, 0, z + dz - Math.cos(rot) * .82); back.rotateY(Math.PI); A.add(back);
    }
    const ex = Math.cos(rot) * (n - 1) * 1.05, ez = -Math.sin(rot) * (n - 1) * 1.05;
    const bx = -Math.sin(rot) * .82, bz = -Math.cos(rot) * .82;
    A.collide([Math.min(x, x + ex, x + bx) - .6, Math.min(z, z + ez, z + bz) - .6, Math.max(x, x + ex, x + bx) + .6, Math.max(z, z + ez, z + bz) + .6]);
  }
  function bjTable(A, x, z, rot = 0) {
    const g = new THREE.Group(), felt = A.mat('felt', { map: A.TEX.felt(), roughness: .95 }), rail = A.mat('rail', { color: '#2a160c', roughness: .5 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, .08, 32, 1, false, Math.PI / 2, Math.PI), felt); top.position.y = .86; g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, .07, 8, 32, Math.PI), rail); rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI; rim.position.y = .9; g.add(rim);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, .84, .3), rail); base.position.set(0, .42, -.1); g.add(base);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, .82, 12), rail); ped.position.set(0, .41, .5); g.add(ped);
    // a few chips on the felt
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .03 * (1 + i % 3), 12), A.mat('chip' + i, { color: ['#c8102e', '#138a3e', '#151515', '#6a2c91', '#f2f2f2'][i] })); c.position.set(-.9 + i * .45, .92, .7 + (i % 2) * .1); g.add(c); }
    g.position.set(x, 0, z); g.rotation.y = rot; A.add(g); A.shadowBlob(x, z + .3, 1.6, .4);
    A.collide([x - 1.4, z - .3, x + 1.4, z + 1.4]);
  }
  function roulette(A, x, z) {
    const felt = A.mat('felt', { map: A.TEX.felt(), roughness: .95 }), rail = A.mat('rail', { color: '#2a160c', roughness: .5 });
    A.box(3, .84, 1.4, rail, x, .42, z, true); A.box(2.9, .04, 1.3, felt, x, .86, z);
    const bowl = A.cyl(.62, .5, .2, A.mat('bowl', { color: '#3b2210', roughness: .4 }), x - 1.1, .95, z);
    const wheel = A.cyl(.5, .5, .06, A.mat('wheelnum', { map: A.canvasTex('rlwheel', 256, 256, (g) => { for (let i = 0; i < 37; i++) { g.fillStyle = i === 0 ? '#0a7a3a' : i % 2 ? '#b0101e' : '#111'; g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 128, i / 37 * Math.PI * 2, (i + 1) / 37 * Math.PI * 2); g.fill(); } g.fillStyle = '#c9a14a'; g.beginPath(); g.arc(128, 128, 60, 0, 7); g.fill(); }), metalness: .3, roughness: .35 }), x - 1.1, 1.06, z);
    A.every((t, dt) => { wheel.rotation.y += dt * .8; });
    A.shadowBlob(x, z, 1.8, .4);
  }
  function door(A, x, z, rot, label, color = '#3a2414', w = 1.2, hgt = 2.3) {
    const d = A.box(w, hgt, .08, A.mat('door' + color, { color, roughness: .6 }), x, hgt / 2, z); d.rotation.y = rot;
    const plate = A.sign(label, { color: '#f3e7c4', w: w * .9, h: .22, font: 'bold 90px Georgia', bg: 'rgba(20,14,8,.9)' }); plate.position.set(x + Math.sin(rot) * .06, hgt + .2, z + Math.cos(rot) * .06); plate.rotation.y = rot; A.add(plate);
    return d;
  }

  /* ---------- the sleep clinic, where you wake ---------- */
  function clinic(A) {
    const white = A.mat('clinicwall', { color: '#d9dde0', roughness: .9 }), floor = A.mat('clinicfloor', { color: '#b8bcc0', roughness: .6 });
    A.plane(8, 8, floor, 0, 0, 0); A.plane(8, 8, A.mat('ceil', { color: '#e8eaec' }), 0, 2.9, 0, Math.PI / 2);
    A.wall(-4, -4, 4, -4, 2.9, white); A.wall(-4, 4, 4, 4, 2.9, white); A.wall(-4, -4, -4, 4, 2.9, white); A.wall(4, -4, 4, 4, 2.9, white);
    // the bed you were in
    A.box(1.1, .5, 2.1, A.mat('bedframe', { color: '#8a9197', metalness: .5, roughness: .4 }), -2.6, .25, -1.8, true);
    A.box(1, .18, 2, A.mat('sheet', { color: '#f4f6f8', roughness: .95 }), -2.6, .59, -1.8);
    A.box(.6, .12, .4, A.mat('pillow', { color: '#fff' }), -2.6, .72, -2.5);
    // monitor with your heartbeat
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
    let x0 = 0; A.every((t, dt) => { x0 = (x0 + dt * 90) % 256; g.fillStyle = 'rgba(0,10,6,.12)'; g.fillRect(0, 0, 256, 128); const ph = (t * 1.2) % 1, y = ph < .06 ? 64 - Math.sin(ph / .06 * Math.PI) * 50 : ph < .1 ? 64 + 18 : 64; g.fillStyle = '#3dff8a'; g.fillRect(x0, y, 3, 3); g.font = 'bold 22px monospace'; g.fillText('72', 200, 30); tex.needsUpdate = true; });
    A.box(.5, .4, .3, A.mat('monitorbody', { color: '#222', metalness: .4 }), -3.5, 1.4, -2.6);
    const scr = A.plane(.42, .3, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), -3.5, 1.42, -2.44, 0);
    // a window with grey morning light
    A.plane(2.2, 1.4, new THREE.MeshBasicMaterial({ color: '#9fb4c4', toneMapped: false }), 2, 1.6, -3.89, 0);
    A.box(2.3, .06, .1, white, 2, .88, -3.85); A.box(.05, 1.4, .06, white, 2, 1.6, -3.86);
    A.light('#dfe8f0', .75, 12, 1.5, 2.6, -1); A.light('#b0c4d8', .45, 7, 2, 1.8, -3);
    A.add(new THREE.HemisphereLight('#dfe6ee', '#3a4046', .35));
    // blinds over the window, a ceiling panel, skirting, an IV stand, a chair, a calendar
    const slat = A.mat('slat', { color: '#e6e9ec', roughness: .6 });
    for (let i = 0; i < 9; i++) { const b = A.box(2.2, .025, .06, slat, 2, 2.22 - i * .155, -3.83); b.rotation.x = .5; }
    A.box(1.2, .04, .6, A.mat('clinicpanel', { color: '#fff', emissive: '#eef4ff', emissiveIntensity: .9 }), 0, 2.88, 0);
    const skirt = A.mat('skirt', { color: '#9aa3aa', roughness: .5 });
    A.box(8, .12, .03, skirt, 0, .06, -3.89); A.box(8, .12, .03, skirt, 0, .06, 3.89); A.box(.03, .12, 8, skirt, -3.89, .06, 0); A.box(.03, .12, 8, skirt, 3.89, .06, 0);
    const steel = A.mat('steel', { color: '#c0c6cc', metalness: .8, roughness: .3 });
    A.cyl(.015, .015, 1.9, steel, -1.7, .95, -2.6, false, 6); A.cyl(.22, .22, .02, steel, -1.7, .02, -2.6, false, 12);
    A.box(.14, .22, .05, A.mat('ivbag', { color: '#e8f4ff', transparent: true, opacity: .7, roughness: .1 }), -1.7, 1.75, -2.6);
    for (const sx of [-1, 1]) A.box(.04, .28, 1.6, steel, -2.6 + sx * .56, .78, -1.8);
    const chair = A.mat('chair', { color: '#4a5a6a', roughness: .7 });
    A.box(.5, .08, .5, chair, -1.3, .45, -.4, true); A.box(.5, .5, .08, chair, -1.3, .74, -.62); for (const [cx, cz] of [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]]) A.box(.04, .45, .04, steel, -1.3 + cx, .22, -.4 + cz);
    const cal = A.plane(.5, .62, new THREE.MeshBasicMaterial({ map: A.canvasTex('calendar', 160, 200, (g, w, h) => { g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3222b'; g.fillRect(0, 0, w, 46); g.fillStyle = '#fff'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText('OCTOBER', w / 2, 34); g.fillStyle = '#222'; g.font = 'bold 96px Georgia'; g.fillText('17', w / 2, 150); g.strokeStyle = '#b3222b'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, 118, 58, 50, 0, 0, 7); g.stroke(); }) }), -3.88, 1.7, 1, 0); cal.rotation.y = Math.PI / 2;
    A.cyl(.18, .14, .3, A.mat('pot', { color: '#d8d2c8' }), 3.4, .15, -3.3); const leaf = A.mat('plant', { color: '#3f6a3a', roughness: .8 }); for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), leaf); l.position.set(3.4 + Math.cos(i) * .12, .45 + (i % 3) * .14, -3.3 + Math.sin(i) * .12); l.scale.set(.6, 1.4, .3); l.rotation.z = Math.cos(i) * .6; A.add(l); }
    // Dr Okafor
    A.person({ x: .4, z: -1, face: -2.4, skin: '#6b4430', hair: '#1a1210', coat: '#e9edf0', pants: '#2c3440', glasses: true, shirt: '#4a6b8a' });
    A.use(.4, -1, 'Talk to Dr. Okafor', act('okafor'), { r: 2.2 });
    A.box(.9, .75, .6, A.mat('desk', { color: '#c8b89a', roughness: .7 }), 2.6, .375, 1.8, true);
    A.use(2.6, 1.8, 'Your discharge folder', act('folder'));
    A.use(-2.6, -1.6, 'The bed you woke up in', act('clinicBed'), { r: 1.5 });
    door(A, 0, 3.92, Math.PI, 'EXIT', '#9aa3aa');
    A.use(0, 3.6, 'Leave the clinic', act('leaveClinic'), { r: 1.4 });
    return { spawn: [-2.1, -.6, 2.2], bg: '#b8c0c8', fog: .02, exposure: .82 };
  }

  /* ---------- the car park under the Meridian ---------- */
  function garage(A) {
    const conc = A.mat('conc', { map: A.TEX.concrete([4, 4]), roughness: .9 }), floor = A.mat('gfloor', { map: A.TEX.asphalt([10, 8]), roughness: .55, metalness: .1 });
    A.plane(32, 26, floor, 0, 0, 0); A.plane(32, 26, A.mat('gceil', { map: A.TEX.concrete([6, 5]), roughness: 1 }), 0, 3.2, 0, Math.PI / 2);
    A.wall(-16, 13, 16, 13, 3.2, conc); A.wall(-16, -13, -16, 13, 3.2, conc); A.wall(16, -13, 16, 13, 3.2, conc);
    A.wall(-16, -13, -6, -13, 3.2, conc); A.wall(6, -13, 16, -13, 3.2, conc); A.box(12, .9, .3, conc, 0, 2.75, -13);
    // concrete pillars with hazard stripes
    const hazard = A.mat('hazard', { map: A.canvasTex('hazard', 128, 32, (g) => { g.fillStyle = '#f2c200'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#111'; for (let i = -1; i < 9; i++) { g.beginPath(); g.moveTo(i * 16, 32); g.lineTo(i * 16 + 8, 32); g.lineTo(i * 16 + 24, 0); g.lineTo(i * 16 + 16, 0); g.fill(); } }) });
    for (const x of [-9, 0, 9]) for (const z of [-5, 5]) { A.box(.7, 3.2, .7, conc, x, 1.6, z, true); A.box(.72, .45, .72, hazard, x, .23, z); A.shadowBlob(x, z, .8); }
    // bay lines and numbers
    const line = A.mat('bayline', { color: '#d8d2c0', roughness: .8 });
    for (let i = 0; i < 9; i++) { const x = -14 + i * 3.4; A.box(.08, .01, 4.6, line, x, .01, 9.6); A.box(.08, .01, 4.6, line, x, .01, -9.6); }
    const num = (n, x, z) => { const s = A.sign(String(n), { color: '#d8d2c0', w: 1.1, h: .55, font: 'bold 160px Arial' }); s.rotation.x = -Math.PI / 2; s.position.set(x, .02, z); A.add(s); };
    for (let i = 0; i < 8; i++) { num(10 + i, -12.3 + i * 3.4, 11.2); num(20 + i, -12.3 + i * 3.4, -11.2); }
    // cars, and yours in bay 17
    const colours = ['#2b3a55', '#6b6b6b', '#7a1e1e', '#e0e0e0', '#1d1d1d', '#3f5a3a'];
    for (let i = 0; i < 8; i++) if (i !== 7 && (i * 7) % 3 !== 1) car(A, -12.3 + i * 3.4, 9.6, colours[i % colours.length], Math.PI);
    for (let i = 0; i < 8; i++) if ((i * 5) % 4 !== 0) car(A, -12.3 + i * 3.4, -9.6, colours[(i + 3) % colours.length]);
    car(A, 11.5, 9.6, '#1c2733', Math.PI, true);
    A.use(11.5, 7.05, 'Open the boot', act('trunk'), { r: 1.8, y: .9 });
    A.use(10.3, 9.6, 'Sit in your car', act('driverSeat'), { r: 1.4 });
    A.use(12.6, 8.1, 'The glovebox', act('glovebox'), { r: 1.2 });
    // fluorescent tubes, one dying
    const tubeOn = A.mat('tube', { color: '#fff', emissive: '#e8f4ff', emissiveIntensity: 1.6 });
    const tubes = [];
    for (const x of [-9, 0, 9]) for (const z of [-8, 0, 8]) { tubes.push(A.box(1.6, .05, .14, tubeOn, x, 3.15, z)); }
    const flick = A.light('#d8ecff', 1.4, 13, 9, 2.9, 0), steady = [A.light('#d8ecff', 1.4, 15, -9, 2.9, 0), A.light('#d8ecff', 1.4, 15, 0, 2.9, 8), A.light('#d8ecff', 1.2, 15, 0, 2.9, -8), A.light('#d8ecff', 1.2, 13, 9, 2.9, 8), A.light('#d8ecff', 1, 13, -9, 2.9, 8)];
    const bad = A.mat('tubebad', { color: '#fff', emissive: '#e8f4ff', emissiveIntensity: 1.6 }); tubes[4].material = bad;
    A.every(t => { const on = Math.sin(t * 13) + Math.sin(t * 7.3) > -.6 || (t % 5) < 3.5; flick.intensity = on ? 1.4 : .05; bad.emissiveIntensity = on ? 1.6 : .1; });
    A.add(new THREE.HemisphereLight('#a8b8c8', '#2a2e33', .6));
    // the open side: rain and the city
    A.rain(0, -15.5, 14, 4, 900, 6);
    A.plane(14, 6, new THREE.MeshBasicMaterial({ map: A.canvasTex('cityfar', 512, 256, (g, w, h) => { g.fillStyle = '#05070c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const bx = Math.random() * w, bw = 10 + Math.random() * 30, bh = 40 + Math.random() * 160; g.fillStyle = '#0b0f18'; g.fillRect(bx, h - bh, bw, bh); for (let y = h - bh + 4; y < h - 4; y += 7) for (let x = bx + 3; x < bx + bw - 3; x += 6) if (Math.random() < .3) { g.fillStyle = Math.random() < .8 ? '#ffd38a' : '#9fd3ff'; g.fillRect(x, y, 2, 3); } } }), toneMapped: false }), 0, 2.4, -17, 0);
    A.light('#7aa0ff', .6, 12, 0, 2, -12);
    // the lift up to the casino
    const lift = A.mat('lift', { color: '#9aa1a8', metalness: .85, roughness: .25 });
    A.box(.08, 2.4, 1.8, lift, 15.9, 1.2, 0); A.box(.06, .3, .3, A.mat('liftbtn', { color: '#222', emissive: '#ffb84d', emissiveIntensity: .8 }), 15.85, 1.2, 1.3);
    const ls = A.sign('MERIDIAN · CASINO', { color: '#e8d7a8', w: 2.4, h: .4, font: '600 80px Georgia' }); ls.position.set(15.85, 2.75, 0); ls.rotation.y = -Math.PI / 2; A.add(ls);
    A.use(15.3, 0, 'Take the lift up to the casino', act('toFloor'), { r: 1.8 });
    const ex = A.sign('EXIT', { color: '#3dff6a', w: .8, h: .28, font: 'bold 110px Arial' }); ex.position.set(-15.85, 2.7, 0); ex.rotation.y = Math.PI / 2; A.add(ex);
    A.use(-15.3, 0, 'The way out', act('exitGarage'), { r: 1.8 });
    A.use(0, -12, 'Look at the rain', act('rain'), { r: 2.2 });
    if (L2.has('moriGarage') && !L2.state.clues.drive) {
      A.person({ x: 2.5, z: 3.6, face: Math.PI * .3, skin: '#e8c4a8', hair: '#111', coat: '#2b2f36', pants: '#1c1f24', longHair: true, skirt: false });
      A.use(2.5, 3.6, 'Detective Mori', () => L2.act(L2.state.clues.rabbit ? 'password' : 'moriRabbit'), { r: 2 });
    }
    return { spawn: [4.5, 6.8, 1.19], bg: '#06080b', fog: .032, exposure: 1.25 };
  }

  /* ---------- the casino floor and the Low Tide bar ---------- */
  function floor(A) {
    const carpet = A.mat('carpet', { map: A.TEX.carpet([10, 8]), roughness: .95 }), paper = A.mat('paper', { map: A.TEX.wallpaper([8, 2]), roughness: .9 });
    A.plane(44, 34, carpet, 0, 0, 0);
    const ceil = A.mat('fceil', { color: '#120c08', roughness: .9 }); A.plane(44, 34, ceil, 0, 5.2, 0, Math.PI / 2);
    for (let x = -18; x <= 18; x += 6) A.box(.25, .25, 34, A.mat('beam', { color: '#2a1c10', metalness: .3 }), x, 5.05, 0);
    A.wall(-22, -17, 22, -17, 5.2, paper); A.wall(-22, 17, 22, 17, 5.2, paper); A.wall(-22, -17, -22, 17, 5.2, paper); A.wall(22, -17, 22, 17, 5.2, paper);
    // gold columns
    const gold = A.mat('colgold', { color: '#b8923a', metalness: .85, roughness: .3 }), marble = A.mat('colmarble', { map: A.TEX.marble([1, 2]), roughness: .3 });
    for (const x of [-11, 11]) for (const z of [-8, 8]) { A.cyl(.45, .45, 5.2, marble, x, 2.6, z, true); A.cyl(.62, .62, .3, gold, x, .15, z); A.cyl(.62, .62, .3, gold, x, 5.05, z); }
    chandelier(A, -5, -4); chandelier(A, 5, -4); chandelier(A, -5, 6); chandelier(A, 5, 6);
    A.add(new THREE.HemisphereLight('#ffdcb0', '#1a0a06', .38));
    // slots
    slotBank(A, -7.6, 11.4, 7, Math.PI, 'a'); slotBank(A, 14.4, 11.4, 7, Math.PI, 'b'); slotBank(A, 20.6, -9.5, 6, -Math.PI / 2, 'a');
    A.use(-10.75, 10.2, 'Play the slots', act('slots'), { r: 2.2 }); A.use(11.25, 10.2, 'Play the slots', act('slots'), { r: 2.2 }); A.use(19.4, -6.9, 'Play the slots', act('slots'), { r: 2.2 });
    // the tables, with dealers
    bjTable(A, -5, -3); bjTable(A, 3, -3); roulette(A, -3, 4.5); bjTable(A, 5, 5, Math.PI);
    const dealer = { skin: '#d9a77f', hair: '#2a1d14', coat: '#111', pants: '#111', shirt: '#f4f4f4', tie: '#7a0f1e' };
    A.person({ ...dealer, x: -5, z: -3.55, face: 0 }); A.person({ ...dealer, x: 3, z: -3.55, face: 0, skin: '#8d5a3b', longHair: true }); A.person({ ...dealer, x: -.9, z: 5.2, face: -Math.PI / 2, skin: '#f0c9a8' }); A.person({ ...dealer, x: 5, z: 5.55, face: Math.PI, skin: '#c48a64' });
    A.use(-5, -1.6, 'Sit down at blackjack', act('table', 'bj'), { r: 1.8 }); A.use(3, -1.6, 'Sit down at blackjack', act('table', 'bj'), { r: 1.8 });
    A.use(-3, 3.6, 'Play roulette', act('table', 'roulette'), { r: 2 }); A.use(5, 3.6, 'Play baccarat', act('table', 'bac'), { r: 1.8 });
    // gamblers
    const g1 = [{ x: -5.9, z: -1.7, coat: '#4a3b6b', skin: '#e8c4a8', hair: '#6b4a2a' }, { x: -4, z: -1.6, coat: '#7a5a3a', skin: '#a5714a', hair: '#111', longHair: true, skirt: true }, { x: 2.1, z: -1.7, coat: '#2e4a3a', skin: '#f0d0b0', hair: '#bbb' }, { x: -3.8, z: 3.7, coat: '#5a1a1a', skin: '#c68863', hair: '#222' }, { x: -2.2, z: 3.7, coat: '#e0d4c0', skin: '#f3d1b5', hair: '#d8c070', longHair: true, skirt: true }, { x: 5.8, z: 3.6, coat: '#202830', skin: '#e0ac69', hair: '#3a2a1e' }];
    for (const p of g1) A.person({ ...p, pants: '#1b1b20', face: Math.PI });
    // games you can only play standing in the room: the Big Six wheel, Sic Bo, two coin pushers
    const wu = L2Games.buildWheel(A, 14.8, -.5, -Math.PI / 2); A.use(wu.use[0], wu.use[1], 'Big Six money wheel', act('wheel'), { r: 2.2 });
    A.person({ x: 14.2, z: 1.6, face: -Math.PI / 2, skin: '#c48a64', hair: '#111', coat: '#111', pants: '#111', shirt: '#f4f4f4', tie: '#c9a14a' });
    const su = L2Games.buildSicbo(A, -10.6, 1.5, Math.PI / 2); A.use(su.use[0], su.use[1], 'Sic Bo', act('sicbo'), { r: 2.2 });
    A.person({ x: -12.3, z: 1.5, face: Math.PI / 2, skin: '#f0c9a8', hair: '#2a1d14', coat: '#111', pants: '#111', shirt: '#f4f4f4', tie: '#7a0f1e', longHair: true });
    for (const [id, px] of [['a', 7.3], ['b', 8.5]]) { const pu = L2Games.buildPusher(A, id, px, -10.6, 0); A.use(pu.use[0], pu.use[1], id === 'a' ? 'High Tide coin pusher' : 'Low Tide coin pusher', act('pusher', id), { r: 1.3 }); }
    // Tommy, the pit boss
    A.person({ x: -1, z: -5.6, face: Math.PI * .1, skin: '#e8b58f', hair: '#5a3a22', coat: '#26262c', pants: '#1a1a1e', shirt: '#dcdcdc', tie: '#203a6b', build: 'broad' });
    A.use(-1, -5.6, 'Tommy Quinn, pit boss', act('tommy'), { r: 2 });
    // Low Tide bar
    const wood = A.mat('barwood', { map: A.TEX.wood([3, 1]), roughness: .45 });
    A.box(1, 1.1, 9, wood, -17.5, .55, 0, true); A.box(1.2, .06, 9.2, A.mat('bartop', { color: '#1a1a1a', metalness: .6, roughness: .2 }), -17.5, 1.13, 0);
    const shelf = A.mat('shelf', { color: '#120a06' }); A.box(.4, 3, 9, shelf, -21.7, 1.5, 0);
    const bottleCols = ['#3a7a3a', '#7a4a1a', '#c8c8d0', '#5a1a2a', '#c09030', '#2a4a7a'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 16; i++) { const b = A.cyl(.04, .05, .28, A.mat('bottle' + (i % 6), { color: bottleCols[i % 6], emissive: bottleCols[i % 6], emissiveIntensity: .35, transparent: true, opacity: .85, roughness: .1 }), -21.4, 1.15 + r * .7, -3.9 + i * .52, false, 8); }
    A.box(.05, .02, 9, A.mat('barled', { color: '#fff', emissive: '#4dd2ff', emissiveIntensity: 2 }), -21.45, .98, 0);
    const lt = A.sign('LOW TIDE', { color: '#4dd2ff', w: 4, h: 1, font: 'italic bold 140px Georgia' }); lt.position.set(-21.4, 3.7, 0); lt.rotation.y = Math.PI / 2; A.add(lt);
    A.light('#4dd2ff', .9, 9, -19.5, 2.6, 0);
    for (const z of [-3, -1, 1, 3]) { A.cyl(.2, .2, .06, A.mat('stooltop', { color: '#5a0f1a', roughness: .5 }), -16.4, .78, z); A.cyl(.04, .04, .76, A.mat('stoolleg', { color: '#888', metalness: .8 }), -16.4, .38, z); }
    A.person({ x: -19.4, z: -.6, face: Math.PI / 2, skin: '#f0c19a', hair: '#7a2e1a', coat: '#1a1a1a', pants: '#1a1a1a', shirt: '#f4f4f4', longHair: true, skirt: true });
    A.use(-16.4, -.6, 'Delia, behind the bar', act('delia'), { r: 2 });
    A.person({ x: -16.4, z: 2.1, face: -Math.PI / 2, skin: '#c68863', coat: '#3a3a3a', hair: '#111', pants: '#222' });
    // the cashier's cage
    const grille = A.mat('grille', { color: '#c9a14a', metalness: .9, roughness: .3 });
    A.box(8, 1.1, .5, wood, 0, .55, -15.6, true); for (let i = 0; i < 26; i++) A.cyl(.012, .012, 1.4, grille, -3.9 + i * .31, 1.85, -15.4, false, 4);
    A.person({ x: 1, z: -16.3, face: 0, skin: '#e8c4a8', hair: '#bbb', coat: '#2c2c34', pants: '#1a1a1e', glasses: true, shirt: '#ddd' });
    const cs = A.sign('CASHIER', { color: '#ffd77a', w: 2.6, h: .5, font: '600 100px Georgia' }); cs.position.set(0, 3.2, -16.85); A.add(cs);
    A.use(0, -14.8, 'The cashier', act('cashier'), { r: 2 });
    // staff door to The Eye
    door(A, 21.9, 8, -Math.PI / 2, 'STAFF ONLY', '#2a2a30');
    A.use(21.2, 8, 'Staff door: The Eye', act('eyeDoor'), { r: 1.8 });
    // the high-limit room
    const vel = A.mat('velvet', { color: '#5a0f1a', roughness: 1 });
    A.cyl(.04, .04, .9, grille, 15, .45, -13.5); A.cyl(.04, .04, .9, grille, 18.5, .45, -13.5);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.75, .04, 6, 20, Math.PI), vel); rope.position.set(16.75, .85, -13.5); rope.rotation.x = Math.PI; A.add(rope);
    A.collide([14.8, -13.7, 18.7, -13.3]);
    door(A, 16.75, -16.9, 0, 'THE SALON · HIGH LIMIT', '#1a0c06', 2.4);
    A.person({ x: 19.4, z: -13, face: -Math.PI * .8, skin: '#5a3a28', hair: '#111', coat: '#111', pants: '#111', build: 'broad', shirt: '#222' });
    A.use(16.75, -12.6, 'The Salon', act('salonDoor'), { r: 2.2 });
    // lifts: down to the car park, up to the hotel
    const lift = A.mat('lift', { color: '#9aa1a8', metalness: .85, roughness: .25 });
    A.box(1.8, 2.4, .08, lift, -12, 1.2, 16.9); A.use(-12, 16.3, 'Lift down to the car park', act('toGarage'), { r: 1.8 });
    A.box(1.8, 2.4, .08, lift, 18, 1.2, 16.9); A.use(18, 16.3, 'Hotel lift', act('hotelLift'), { r: 1.8 });
    const hs = A.sign('HOTEL · FLOORS 2–17 · ROOF', { color: '#e8d7a8', w: 3.4, h: .35, font: '600 70px Georgia' }); hs.position.set(18, 2.8, 16.85); hs.rotation.y = Math.PI; A.add(hs);
    // Vale's portrait over the floor
    const pt = A.plane(2.2, 2.8, A.mat('valeportrait', { map: A.canvasTex('valeport', 256, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1c10'); gr.addColorStop(1, '#0a0604'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#c9a26b'; g.beginPath(); g.ellipse(128, 120, 46, 58, 0, 0, 7); g.fill(); g.fillStyle = '#bbb'; g.beginPath(); g.ellipse(128, 78, 50, 26, 0, Math.PI, 0); g.fill(); g.fillStyle = '#111'; g.fillRect(70, 190, 116, 130); g.fillStyle = '#eee'; g.fillRect(118, 190, 20, 60); g.fillStyle = '#7a0f1e'; g.fillRect(124, 196, 8, 50); g.strokeStyle = '#c9a14a'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }), roughness: .5 }), 0, 3.2, 16.85, 0); pt.rotation.y = Math.PI;
    A.use(0, 15.6, 'A portrait of Augustin Vale', act('portrait'), { r: 3 });
    return { spawn: [-12, 15.6, Math.PI * 1.08], bg: '#0a0604', fog: .026, exposure: 1.1 };
  }

  /* ---------- The Eye: surveillance ---------- */
  function eye(A) {
    const wallM = A.mat('eyewall', { color: '#14171c', roughness: .9 }); A.plane(10, 8, A.mat('eyefloor', { color: '#1e2228', roughness: .8 }), 0, 0, 0); A.plane(10, 8, wallM, 0, 3, 0, Math.PI / 2);
    A.wall(-5, -4, 5, -4, 3, wallM); A.wall(-5, 4, 5, 4, 3, wallM); A.wall(-5, -4, -5, 4, 3, wallM); A.wall(5, -4, 5, 4, 3, wallM);
    // a wall of camera feeds
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
    const feeds = [];
    for (let i = 0; i < 8; i++) feeds.push({ x: Math.random(), v: (Math.random() - .5) * .1, cam: ['FLOOR 1', 'FLOOR 2', 'BAR', 'CAGE', 'GARAGE B', 'GARAGE EXIT', 'STAFF DOOR', 'SALON'][i] });
    let tk = 0;
    A.every((t, dt) => { if ((tk += dt) < .12) return; tk = 0; for (let i = 0; i < 8; i++) { const cx = (i % 4) * 128, cy = Math.floor(i / 4) * 128, f = feeds[i]; g.fillStyle = '#0b100d'; g.fillRect(cx, cy, 126, 126); for (let n = 0; n < 160; n++) { g.fillStyle = `rgba(160,190,170,${Math.random() * .12})`; g.fillRect(cx + Math.random() * 126, cy + Math.random() * 126, 2, 1); } f.x = (f.x + f.v * dt * 10 + 1) % 1; g.fillStyle = 'rgba(190,220,200,.5)'; g.fillRect(cx + 10 + f.x * 100, cy + 60, 8, 22); g.beginPath(); g.arc(cx + 14 + f.x * 100, cy + 54, 5, 0, 7); g.fill(); g.font = '10px monospace'; g.fillStyle = '#9fd'; g.fillText(f.cam, cx + 4, cy + 12); g.fillText(new Date().toTimeString().slice(0, 8), cx + 70, cy + 122); } tex.needsUpdate = true; });
    const screenM = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const scr = A.plane(6, 3, screenM, 0, 1.75, -3.88, 0);
    A.box(6.3, 3.2, .1, A.mat('bezel', { color: '#0a0a0c' }), 0, 1.75, -3.96);
    A.light('#7fffc0', .8, 8, 0, 1.6, -2.8);
    A.box(5, .8, 1, A.mat('console', { color: '#23272e', metalness: .5, roughness: .4 }), 0, .4, -2.2, true);
    A.box(5, .05, 1.1, A.mat('consoletop', { color: '#111', metalness: .3 }), 0, .82, -2.2);
    for (let i = 0; i < 3; i++) A.box(.7, .45, .05, new THREE.MeshBasicMaterial({ color: '#0c2a1c', toneMapped: false }), -1.5 + i * 1.5, 1.1, -2.45);
    A.cyl(.04, .04, .1, A.mat('mug', { color: '#ddd' }), 1.9, .9, -2);
    A.use(0, -1.4, 'Review the footage from that night', act('cctv'), { r: 2 });
    A.use(1.9, -1.6, 'A coffee mug: "ROURKE · HEAD OF SECURITY"', act('mug'), { r: 1.4 });
    door(A, 4.92, 2, -Math.PI / 2, 'CASINO FLOOR', '#2a2a30');
    A.use(4.3, 2, 'Back to the casino floor', act('toFloor', 'eye'), { r: 1.6 });
    A.add(new THREE.HemisphereLight('#4a6a5a', '#0a100c', .55)); A.light('#9fd3ff', .6, 9, 2, 2.6, 2);
    return { spawn: [3.4, 2.2, -2.63], bg: '#020304', fog: .045, exposure: 1.3 };
  }

  /* ---------- the Salon: high limit ---------- */
  function salon(A) {
    const green = A.mat('salonfloor', { map: A.canvasTex('salonc', 128, 128, (g, w, h) => { g.fillStyle = '#0d2a20'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(201,161,74,.25)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) g.strokeRect(i * 32 + 4, i * 32 + 4, 120 - i * 64 > 0 ? 120 - i * 64 : 8, 120 - i * 64 > 0 ? 120 - i * 64 : 8); }, [6, 5]), roughness: 1 });
    const panel = A.mat('panel', { map: A.TEX.wood([4, 1]), roughness: .5 });
    A.plane(14, 12, green, 0, 0, 0); A.plane(14, 12, A.mat('salonceil', { color: '#0c0806' }), 0, 4, 0, Math.PI / 2);
    A.wall(-7, -6, 7, -6, 4, panel); A.wall(-7, 6, 7, 6, 4, panel); A.wall(-7, -6, -7, 6, 4, panel); A.wall(7, -6, 7, 6, 4, panel);
    chandelier(A, 0, 0, 3.3);
    const felt = A.mat('felt', { map: A.TEX.felt(), roughness: .95 });
    A.cyl(1.6, 1.6, .08, felt, 0, .86, -.5); A.cyl(1.7, 1.7, .06, A.mat('rail', { color: '#2a160c' }), 0, .82, -.5); A.cyl(.3, .45, .8, A.mat('rail', { color: '#2a160c' }), 0, .4, -.5, true);
    A.collide([-1.7, -2.2, 1.7, 1.2]);
    A.person({ x: 1.9, z: -.5, face: -Math.PI / 2, skin: '#d9a07a', hair: '#141010', coat: '#4a1030', pants: '#1a0a12', longHair: true, skirt: true });
    A.use(1.9, -.5, 'Margaux Reyes', act('margaux'), { r: 2.2 });
    A.person({ x: -1.6, z: -1.6, face: Math.PI / 4, skin: '#f0d0b0', hair: '#ddd', coat: '#222', pants: '#111', shirt: '#eee', tie: '#7a0f1e' });
    // Vale's office door
    door(A, 0, -5.92, 0, 'PRIVATE', '#1a0c06', 1.3);
    A.use(0, -5.3, 'Augustin Vale\'s office', act('valeDoor'), { r: 1.6 });
    door(A, 0, 5.92, Math.PI, 'CASINO FLOOR', '#1a0c06', 1.4);
    A.use(0, 5.3, 'Back to the floor', act('toFloor', 'salon'), { r: 1.6 });
    A.add(new THREE.HemisphereLight('#ffd9a0', '#0a0604', .3));
    return { spawn: [0, 4.4, Math.PI], bg: '#060403', fog: .05 };
  }

  /* ---------- the 17th floor ---------- */
  function corridor(A) {
    const horror = L2.state.ending === 'horror' && !L2.has('done');
    if (horror) return corridorHorror(A);
    const paper = A.mat('corr', { map: A.TEX.corridor([10, 1]), roughness: .9 }), carpet = A.mat('corrcarpet', { map: A.TEX.carpet([2, 12]), roughness: 1 });
    A.plane(4, 44, carpet, 0, 0, -18); A.plane(4, 44, A.mat('corrceil', { color: '#d8d0c0' }), 0, 2.7, -18, Math.PI / 2);
    A.wall(-2, 4, -2, -40, 2.7, paper); A.wall(2, 4, 2, -40, 2.7, paper); A.wall(-2, 4, 2, 4, 2.7, paper); A.wall(-2, -40, 2, -40, 2.7, paper);
    for (let i = 0; i < 10; i++) {
      const z = -2 - i * 3.6;
      door(A, -1.93, z, Math.PI / 2, String(1701 + i * 2), '#3a2a1e', 1, 2.1); door(A, 1.93, z - 1.2, -Math.PI / 2, String(1702 + i * 2), '#3a2a1e', 1, 2.1);
      A.box(.5, .04, .5, A.mat('sconce', { color: '#fff', emissive: '#ffd9a0', emissiveIntensity: 1.2 }), 0, 2.66, z);
      if (i % 2 === 0) A.light('#ffd9a0', .6, 7, 0, 2.4, z);
    }
    // 1717 is the ninth door on the left, ajar
    A.use(-1.4, -2 - 8 * 3.6, 'Room 1717', act('room1717'), { r: 1.6 });
    door(A, 0, -39.92, 0, 'ROOF ACCESS', '#5a1a1a', 1.2);
    A.use(0, -39.2, 'Stairs to the roof', act('toRoof'), { r: 1.6 });
    A.box(1.8, 2.3, .08, A.mat('lift', { color: '#9aa1a8', metalness: .85, roughness: .25 }), 0, 1.15, 3.9);
    A.use(0, 3.2, 'Lift down to the casino', act('toFloor', 'lift'), { r: 1.6 });
    A.add(new THREE.HemisphereLight('#ffe8c8', '#2a2018', .35));
    return { spawn: [0, 2.4, Math.PI], bg: '#0a0806', fog: .06 };
  }

  // the horror ending: the same corridor, wrong. Every door is 1717 and the light is red.
  function corridorHorror(A) {
    const paper = A.mat('corrH', { map: A.TEX.corridor([10, 1]), roughness: .9, color: '#a06060' }), carpet = A.mat('corrcarpetH', { map: A.TEX.carpet([2, 12]), roughness: 1, color: '#804040' });
    A.plane(4, 44, carpet, 0, 0, -18); A.plane(4, 44, A.mat('corrceilH', { color: '#3a1a1a' }), 0, 2.7, -18, Math.PI / 2);
    A.wall(-2, 4, -2, -40, 2.7, paper); A.wall(2, 4, 2, -40, 2.7, paper); A.wall(-2, 4, 2, 4, 2.7, paper); A.wall(-2, -40, 2, -40, 2.7, paper);
    const lights = [];
    for (let i = 0; i < 10; i++) {
      const z = -2 - i * 3.6;
      door(A, -1.93, z, Math.PI / 2, '1717', '#2a1414', 1, 2.1); door(A, 1.93, z - 1.2, -Math.PI / 2, '1717', '#2a1414', 1, 2.1);
      A.use(-1.4, z, 'Room 1717', act('horrorDoor'), { r: 1.3 }); A.use(1.4, z - 1.2, 'Room 1717', act('horrorDoor'), { r: 1.3 });
      if (i % 2 === 0) lights.push(A.light('#ff2a2a', .7, 7, 0, 2.4, z));
    }
    A.every(t => lights.forEach((l, i) => { l.intensity = (Math.sin(t * 9 + i * 3) + Math.sin(t * 23 + i)) > 1.4 ? .05 : .7; }));
    door(A, 0, -39.92, 0, 'ROOF ACCESS', '#2a1414', 1.2); A.use(0, -39.2, 'The roof door', () => L2.act('horrorLift'), { r: 1.4 });
    A.box(1.8, 2.3, .08, A.mat('lift', { color: '#9aa1a8', metalness: .85, roughness: .25 }), 0, 1.15, 3.9); A.use(0, 3.2, 'The lift', act('horrorLift'), { r: 1.6 });
    A.add(new THREE.HemisphereLight('#ff6060', '#100404', .3));
    return { spawn: [0, -38.4, 0], bg: '#0a0202', fog: .09, fogColor: '#1a0404', exposure: 1.1 };
  }

  /* ---------- the mystery ending: the Rusty Spur, real, where the roof should be ---------- */
  function spur(A) {
    const plank = A.mat('spurplank', { map: A.TEX.wood([6, 2]), roughness: .7, color: '#b07a4a' }), floorM = A.mat('spurfloor', { map: A.TEX.wood([8, 6]), roughness: .8, color: '#9a6a3a' });
    A.plane(14, 10, floorM, 0, 0, 0); A.plane(14, 10, A.mat('spurceil', { map: A.TEX.wood([6, 4]), color: '#5a3a1e' }), 0, 3.2, 0, Math.PI / 2);
    A.wall(-7, -5, 7, -5, 3.2, plank); A.wall(-7, 5, 7, 5, 3.2, plank); A.wall(-7, -5, -7, 5, 3.2, plank); A.wall(7, -5, 7, 5, 3.2, plank);
    // the bar, the bottles, the mirror
    const bar = A.mat('spurbar', { map: A.TEX.wood([3, 1]), roughness: .4, color: '#7a4a24' });
    A.box(8, 1.1, .8, bar, 0, .55, -2.6, true); A.box(8.2, .08, 1, A.mat('spurtop', { color: '#3a1e0c', roughness: .3 }), 0, 1.12, -2.6);
    A.box(8, 2.2, .3, A.mat('shelf', { color: '#120a06' }), 0, 1.9, -4.8);
    const bc = ['#3a7a3a', '#7a4a1a', '#c8c8d0', '#5a1a2a', '#c09030'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 18; i++) A.cyl(.04, .05, .28, A.mat('bottle' + (i % 5), { color: bc[i % 5], emissive: bc[i % 5], emissiveIntensity: .35, transparent: true, opacity: .85 }), -3.6 + i * .42, 1.35 + r * .6, -4.6, false, 8);
    for (const x of [-3, -1.5, 0, 1.5, 3]) { A.cyl(.2, .2, .06, A.mat('stooltop', { color: '#5a0f1a' }), x, .78, -1.7); A.cyl(.04, .04, .76, A.mat('stoolleg', { color: '#888', metalness: .8 }), x, .38, -1.7); }
    const neon = A.sign('THE RUSTY SPUR', { color: '#ff8a3d', w: 4.4, h: .8, font: 'bold 120px Georgia' }); neon.position.set(0, 2.75, -4.62); A.add(neon);
    // the jukebox, glowing
    const jb = A.box(.9, 1.6, .6, A.mat('jukebox', { color: '#5a2a0a', emissive: '#ff7a1a', emissiveIntensity: .35, roughness: .4 }), 5.6, .8, -3.8, true);
    const jt = A.cyl(.45, .45, .6, A.mat('jbtop', { color: '#ffb84d', emissive: '#ffb84d', emissiveIntensity: .9 }), 5.6, 1.6, -3.8, false, 20); jt.rotation.x = Math.PI / 2;
    A.every(t => { jb.material.emissiveIntensity = .3 + Math.sin(t * 2.4) * .12; });
    A.use(5.6, -2.9, 'The jukebox', act('spurJukebox'), { r: 1.6 });
    // a window full of impossible sunshine: the dream town, outside
    A.plane(3, 1.6, new THREE.MeshBasicMaterial({ map: A.canvasTex('dreamwin', 256, 128, (c, w, hh) => { const g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, '#6ab8ff'); g.addColorStop(1, '#cfe9ff'); c.fillStyle = g; c.fillRect(0, 0, w, hh); c.fillStyle = '#7ac74f'; c.fillRect(0, hh * .72, w, hh); for (let i = 0; i < 7; i++) { c.fillStyle = ['#e85d5d', '#f2c14e', '#5da9e8', '#b36ae2'][i % 4]; c.fillRect(10 + i * 36, hh * .45, 26, hh * .3); c.fillStyle = '#8a3a2a'; c.beginPath(); c.moveTo(6 + i * 36, hh * .45); c.lineTo(23 + i * 36, hh * .32); c.lineTo(40 + i * 36, hh * .45); c.fill(); } c.fillStyle = '#fff6a8'; c.beginPath(); c.arc(w * .85, hh * .2, 14, 0, 7); c.fill(); }), toneMapped: false }), -6.88, 1.7, 1, 0).rotation.y = Math.PI / 2;
    A.light('#ffb070', 1.2, 12, 0, 2.8, -1); A.light('#ff8a3d', .8, 8, 0, 2.4, -4); A.light('#ffd9a0', .6, 9, -4, 2.6, 2);
    A.add(new THREE.HemisphereLight('#ffd0a0', '#3a2010', .5));
    // Dolores, and Sal behind the bar with his back to you
    A.person({ x: -2.4, z: -3.4, face: 0, skin: '#f0c19a', hair: '#c9a070', coat: '#7a1a2a', pants: '#1a1a1a', longHair: true, skirt: true });
    A.person({ x: .6, z: -3.5, face: Math.PI, still: true, skin: '#e0b090', hair: '#bbb', coat: '#f0ece0', pants: '#2a2a2a', shirt: '#f4f4f4', tie: '#7a0f1e' });
    A.use(.6, -2.0, 'The man behind the bar', act('sal'), { r: 2.2 });
    return { spawn: [0, 3.8, Math.PI], bg: '#1a0e06', fog: .03, fogColor: '#2a1a0c', exposure: 1.05 };
  }

  /* ---------- room 1717 ---------- */
  function room(A) {
    const paper = A.mat('roompaper', { map: A.TEX.wallpaper([3, 1]), roughness: .9 });
    A.plane(7, 6, A.mat('roomcarpet', { color: '#3a3430', roughness: 1 }), 0, 0, 0); A.plane(7, 6, A.mat('roomceil', { color: '#d8d0c0' }), 0, 2.7, 0, Math.PI / 2);
    A.wall(-3.5, -3, 3.5, -3, 2.7, paper); A.wall(-3.5, 3, 3.5, 3, 2.7, paper); A.wall(-3.5, -3, -3.5, 3, 2.7, paper); A.wall(3.5, -3, 3.5, 3, 2.7, paper);
    A.box(2, .5, 2.2, A.mat('bed', { color: '#e8e2d8' }), -1.8, .25, -1.6, true); A.box(2, .5, .2, A.mat('headboard', { color: '#3a2a1e' }), -1.8, .8, -2.8);
    A.plane(3, 1.8, new THREE.MeshBasicMaterial({ map: A.canvasTex('cityroom', 512, 256, (g, w, h) => { g.fillStyle = '#05070c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 50; i++) { const bx = Math.random() * w, bw = 8 + Math.random() * 26, bh = 30 + Math.random() * 200; g.fillStyle = '#0b0f18'; g.fillRect(bx, h - bh, bw, bh); for (let y = h - bh + 3; y < h - 3; y += 6) for (let x = bx + 2; x < bx + bw - 2; x += 5) if (Math.random() < .25) { g.fillStyle = Math.random() < .8 ? '#ffd38a' : '#9fd3ff'; g.fillRect(x, y, 2, 2); } } }), toneMapped: false }), 1.6, 1.5, -2.88, 0);
    A.rain(1.6, -3.4, 3, .6, 200, 2.7);
    A.box(1.2, .75, .6, A.mat('roomdesk', { map: A.TEX.wood([1, 1]), roughness: .5 }), 2.6, .375, 1.8, true);
    A.light('#ffd9a0', .9, 8, 2.2, 2.2, 1.2); A.light('#9fb8ff', .5, 6, 1.6, 1.6, -2.4);
    // a made bed with pillows and a runner, nightstands with a lamp, curtains, a chair, a picture, a TV
    A.box(1.9, .14, 2, A.mat('duvet', { color: '#f1ece2', roughness: .95 }), -1.8, .56, -1.5); A.box(1.92, .03, .45, A.mat('runner', { color: '#5a1a22', roughness: .9 }), -1.8, .64, -.8);
    for (const px of [-2.25, -1.35]) A.box(.7, .16, .36, A.mat('pillow2', { color: '#fbf8f2', roughness: 1 }), px, .7, -2.45);
    const ns = A.mat('nightstand', { map: A.TEX.wood([1, 1]), roughness: .5 });
    for (const nx of [-3.15, -.45]) A.box(.5, .55, .45, ns, nx, .275, -2.6, true);
    A.cyl(.08, .1, .3, A.mat('lampbase', { color: '#c9a14a', metalness: .8, roughness: .3 }), -.45, .7, -2.6); A.cyl(.14, .2, .22, A.mat('shade', { color: '#f4e6c8', emissive: '#ffcf8a', emissiveIntensity: .8 }), -.45, .96, -2.6); A.light('#ffcf8a', .6, 4, -.45, 1, -2.4);
    const cur = A.mat('curtain', { color: '#3a2830', roughness: 1 });
    for (const cx of [-.1, 3.3]) for (let i = 0; i < 4; i++) A.cyl(.06, .06, 2.4, cur, cx + i * .1, 1.3, -2.86, false, 6);
    A.box(1.4, .8, .05, A.mat('tvscreen', { color: '#050505', metalness: .5, roughness: .1 }), 3.44, 1.5, -.3).rotation.y = Math.PI / 2;
    const chairM = A.mat('armchair', { color: '#2e3a4a', roughness: .9 }); A.box(.7, .4, .7, chairM, 2.6, .2, 1, true); A.box(.7, .5, .15, chairM, 2.6, .65, 1.3);
    const art = A.plane(1.1, .8, A.mat('roomart', { map: A.canvasTex('roomart', 220, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9b38a'); gr.addColorStop(1, '#6a7a8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(40,50,60,.7)'; g.fillRect(0, h * .7, w, h * .3); g.strokeStyle = '#2a1c10'; g.lineWidth = 10; g.strokeRect(0, 0, w, h); }), roughness: .6 }), -3.47, 1.6, .9, 0); art.rotation.y = Math.PI / 2;
    // on the desk: a photograph and a note, until you pick them up
    if (!L2.has('roomSearched')) { A.plane(.2, .15, A.mat('photo', { color: '#ddd8cc', roughness: .4 }), 2.5, .76, 1.75); A.plane(.18, .24, A.mat('note', { color: '#f6f2e6', roughness: .9 }), 2.8, .76, 1.8); }
    A.plane(7, 6, A.mat('roomrug', { map: A.TEX.carpet([3, 3]), roughness: 1, color: '#7a6a6a' }), 0, .005, .4);
    if (!L2.has('roomSearched')) A.use(2.6, 1.8, 'The desk', act('roomDesk'), { r: 1.6 });
    A.use(-1.8, -1.6, 'The bed hasn\'t been slept in', act('roomBed'), { r: 1.8 });
    A.box(.5, .55, .45, A.mat('minibar', { color: '#1a1a1a', emissive: '#3a2a10', emissiveIntensity: .4 }), 3.1, .275, -1.2, true); A.use(2.6, -1.2, 'The minibar', act('minibar'), { r: 1.3 });
    A.use(0, 2.6, 'Back to the corridor', act('toCorridor'), { r: 1.4 });
    A.add(new THREE.HemisphereLight('#ffe8c8', '#1a1410', .3));
    return { spawn: [.4, 1.7, Math.PI * .82], bg: '#0a0806', fog: .04, exposure: 1.15 };
  }

  /* ---------- the roof, in the rain ---------- */
  function roof(A) {
    A.plane(40, 40, A.mat('rooffloor', { map: A.TEX.concrete([8, 8]), roughness: .35, metalness: .2, color: '#8a8f96' }), 0, 0, 0);
    const pad = A.sign('H', { color: '#e8e8e8', w: 5, h: 5, font: 'bold 200px Arial' }); pad.rotation.x = -Math.PI / 2; pad.position.set(0, .02, -4); A.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.6, 48), new THREE.MeshBasicMaterial({ color: '#d8c040', toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, .02, -4); A.add(ring);
    const rail = A.mat('railing', { color: '#555b62', metalness: .8, roughness: .4 });
    for (const [x1, z1, x2, z2] of [[-12, -14, 12, -14], [-12, 8, 12, 8], [-12, -14, -12, 8], [12, -14, 12, 8]]) { A.wall(x1, z1, x2, z2, 1.1, rail, .08); }
    // the city all around, lit windows in the rain
    const winTex = A.canvasTex('skywin', 64, 128, (g, w, h) => { g.fillStyle = '#080a10'; g.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 6) for (let x = 2; x < w; x += 5) if (Math.random() < .3) { g.fillStyle = Math.random() < .85 ? '#ffd38a' : '#9fd3ff'; g.fillRect(x, y, 2, 3); } });
    const bm = new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false });
    for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2, r = 45 + Math.random() * 60, w = 4 + Math.random() * 8, hh = 10 + Math.random() * 50; const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), bm); b.position.set(Math.cos(a) * r, hh / 2 - 22, Math.sin(a) * r); A.add(b); }
    A.rain(0, -3, 26, 26, 2600, 10);
    A.light('#9fb8ff', .9, 30, 0, 6, -4); A.light('#ff4d6b', .5, 14, 10, 3, -12);
    A.add(new THREE.HemisphereLight('#5a6a8a', '#0a0c10', .45));
    const beacon = A.box(.3, .3, .3, A.mat('beacon', { color: '#300', emissive: '#ff2222', emissiveIntensity: 2 }), 10, 3.2, -12);
    A.box(.2, 3, .2, rail, 10, 1.5, -12, true);
    A.every(t => { beacon.material.emissiveIntensity = (Math.sin(t * 3) > 0) ? 2.5 : .2; });
    // whoever is waiting up here
    if (!L2.has('finale')) {
      A.person({ x: -1.4, z: -8, face: 0, skin: '#f0d0b0', hair: '#ddd', coat: '#141414', pants: '#111', shirt: '#eee', tie: '#7a0f1e' });
      A.person({ x: 1.6, z: -8.4, face: -.3, skin: '#d8b090', hair: '#3a3a3a', coat: '#1c2228', pants: '#14181c', build: 'broad' });
      A.use(0, -7, 'Vale and Rourke', act('finale'), { r: 3.4 });
    }
    A.use(0, 7.2, 'Stairs down', act('toCorridor', 'roof'), { r: 1.6, when: () => !L2.has('finaleStarted') || L2.has('finale') });
    return { spawn: [0, 6.2, Math.PI], bg: '#05070c', fog: .03, fogColor: '#0a0e16' };
  }

  /* ---------- after: the cemetery at first light ---------- */
  function cemetery(A) {
    A.plane(60, 60, A.mat('grass', { map: A.canvasTex('grass', 128, 128, (g, w, h) => { g.fillStyle = '#3d5a2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${60 + Math.random() * 60},${90 + Math.random() * 60},${40 + Math.random() * 30},.6)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); } }, [20, 20]), roughness: 1 }), 0, 0, 0);
    const stone = A.mat('stone', { map: A.TEX.concrete([1, 1]), color: '#b8b4ac', roughness: .9 });
    const names = [['NORA', 'Beloved wife and mother'], ['ELLIE', 'Our brave girl, 9'], ['SAM', 'Our little star, 4']];
    names.forEach(([n, line], i) => {
      const x = -2 + i * 2;
      A.box(1, 1.2, .2, stone, x, .6, -3, true);
      const tx = A.sign(n, { color: '#2a2a2a', w: .9, h: .3, font: 'bold 120px Georgia' }); tx.material = new THREE.MeshBasicMaterial({ map: tx.material.map, transparent: true }); tx.position.set(x, .9, -2.89); A.add(tx);
      const l2 = A.sign(line, { color: '#3a3a3a', w: .9, h: .14, font: 'italic 70px Georgia' }); l2.material = new THREE.MeshBasicMaterial({ map: l2.material.map, transparent: true }); l2.position.set(x, .65, -2.89); A.add(l2);
    });
    for (let i = 0; i < 26; i++) { const x = (Math.random() - .5) * 40, z = -8 - Math.random() * 20; A.box(.7, .8 + Math.random() * .6, .15, stone, x, .45, z); }
    for (let i = 0; i < 12; i++) { const x = (Math.random() - .5) * 50, z = -15 - Math.random() * 20; A.cyl(.15, .2, 3, A.mat('trunk', { color: '#3a2a1e' }), x, 1.5, z); const crown = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), A.mat('leaves', { color: '#2e4a2a', roughness: 1 })); crown.position.set(x, 3.6, z); A.add(crown); }
    const sun = new THREE.DirectionalLight('#ffd9b0', 1.4); sun.position.set(-8, 7, 14); A.add(sun);
    A.add(new THREE.HemisphereLight('#ffe6c8', '#4a5a3a', .8));
    A.use(0, -2.2, 'Kneel by the stones', act('graves'), { r: 2.6 });
    return { spawn: [0, 4, Math.PI], bg: '#e9cfae', fog: .025, fogColor: '#e8d2b8' };
  }

  return { clinic, garage, floor, eye, salon, corridor, room, roof, cemetery, spur };
})();
