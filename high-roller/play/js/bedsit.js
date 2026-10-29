/* Level 3: the bedsit. The true ending of the Meridian, if you look at your reflection on the roof.
   There was no Meridian, no town, no case. There's a bedsit over a bookmaker's, a man who hasn't been
   outside in months, a laptop, a fridge, and £500,000 of debt. Everything in the dreams came from
   this room: the people are off the television, the darts player is in your head, the casinos are
   on the laptop, and the thing that hunted you is in the mirror.
   - It's first person and fully 3D (three.js, js/vendor): walk with WASD, the arrows or the stick on
     the left of a phone screen; look by dragging; use things with E, Space, the ✋ button, or a tap.
   - One bar is left: the drink. It runs down all the time, faster at the laptop. The fridge has a few
     cans and the laptop can order more. Let it reach empty and you collapse (a bad true ending).
   - The laptop has every game from the dreams, with your real money (£850 to start). Make £500,000
     and you can clear the debt and check into rehab (the good true ending). Lose it all and that's
     the other bad true ending.
   - Things in the room are the dreams' sources: the TV's channels (Dolores, Lou, Mori, Vinnie, a film
     called The Seventeenth Card), the dartboard and the friend who isn't there to throw against, the
     stock photo in the frame, the letters by the door, the fridge postcards, the radio. */
const L3 = (() => {
  const GOAL = 500000, MIN_BET = 5, START = 850, DRAIN = 100 / 420; // the drink, per second: about seven minutes from full
  const fresh = (keep = {}) => ({ v: 1, cash: START, drink: 72, cans: 3, order: 0, radio: null, tv: 0, flags: {}, pos: null, atTable: false, endings: keep.endings || {}, lost: 0 });
  const S = () => { const s = App.state; if (!s.l3) s.l3 = fresh(); return s.l3; };
  const money = n => '£' + Math.round(n).toLocaleString('en-GB');
  let G = null; // the running room

  /* ---------- talking to yourself: narration and choices ---------- */
  function say(lines) {
    return lines.reduce((p, L) => p.then(() => new Promise(res => {
      const o = h('div.l3-say', h('div.l3-line', L.who ? h('b', L.who) : null, h('p', { html: UI.esc(L.text).replace(/\*([^*]+)\*/g, '<i>$1</i>') })), h('small', 'tap to continue'));
      const go = () => { o.remove(); document.removeEventListener('keydown', key); res(); };
      const key = e => { if ([' ', 'Enter', 'e', 'E', 'Escape'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); go(); } }; // not on to the room: the same key would use the thing again
      o.onclick = go; setTimeout(() => document.addEventListener('keydown', key), 120); document.body.append(o); if (G) G.busy++;
    }).then(() => { if (G) G.busy = Math.max(0, G.busy - 1); })), Promise.resolve());
  }
  function choose(text, opts) {
    return new Promise(res => {
      if (G) G.busy++;
      const o = h('div.l3-say.pick', h('div.l3-line', h('p', text), h('div.l3-opts', opts.map(([v, l]) => h('button.l3-btn', { onclick: () => { o.remove(); if (G) G.busy = Math.max(0, G.busy - 1); res(v); } }, l)))));
      document.body.append(o);
    });
  }
  const toast = t => { const e = h('div.l3-toast', t); document.body.append(e); setTimeout(() => e.remove(), 3200); };

  /* ---------- textures, painted on canvases ---------- */
  const T = (w, hh, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const TEX = {
    wall: () => T(256, 256, (g, w, hh) => { g.fillStyle = '#8a8268'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 32) for (let x = (y / 32) % 2 * 16; x < w; x += 32) { g.fillStyle = 'rgba(110,90,60,.35)'; g.beginPath(); g.arc(x + 8, y + 8, 5, 0, 7); g.fill(); g.fillStyle = 'rgba(80,100,70,.25)'; g.fillRect(x + 6, y + 13, 4, 8); } for (let i = 0; i < 6; i++) { const cx = rnd() * w, cy = rnd() * hh, r = g.createRadialGradient(cx, cy, 2, cx, cy, 40 + rnd() * 50); r.addColorStop(0, 'rgba(70,55,25,.25)'); r.addColorStop(1, 'rgba(70,55,25,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); } }, [6, 2.5]),
    carpet: () => T(256, 256, (g, w, hh) => { g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '90,70,50' : '30,22,16'},.35)`; g.fillRect(rnd() * w, rnd() * hh, 2, 2); } for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(25,18,10,.35)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * hh, 10 + rnd() * 25, 6 + rnd() * 14, rnd() * 3, 0, 7); g.fill(); } }, [4, 3]),
    ceiling: () => T(128, 128, (g, w, hh) => { g.fillStyle = '#b8b0a0'; g.fillRect(0, 0, w, hh); const r = g.createRadialGradient(80, 50, 4, 80, 50, 50); r.addColorStop(0, 'rgba(120,95,40,.45)'); r.addColorStop(1, 'rgba(120,95,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); }, [2, 2]),
    wood: () => T(128, 128, (g, w, hh) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 3) { g.fillStyle = `rgba(${rnd() < .5 ? '80,50,30' : '40,25,14'},.4)`; g.fillRect(0, y, w, 1 + rnd() * 2); } }),
    duvet: () => T(128, 128, (g, w, hh) => { g.fillStyle = '#5a6a7a'; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(30,40,55,.5)'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(0, rnd() * hh); g.bezierCurveTo(w * .3, rnd() * hh, w * .6, rnd() * hh, w, rnd() * hh); g.stroke(); } g.fillStyle = 'rgba(120,100,60,.3)'; g.beginPath(); g.ellipse(70, 60, 18, 10, .5, 0, 7); g.fill(); }),
    letters: () => T(256, 128, (g, w, hh) => { g.fillStyle = '#00000000'; g.clearRect(0, 0, w, hh); for (let i = 0; i < 9; i++) { g.save(); g.translate(30 + rnd() * 190, 20 + rnd() * 80); g.rotate((rnd() - .5) * 1.4); g.fillStyle = i % 3 ? '#e8e2d4' : '#f4f0e6'; g.fillRect(-28, -17, 56, 34); g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(-28, -17, 56, 34); g.fillStyle = '#b3222b'; g.font = 'bold 8px sans-serif'; g.fillText(i % 2 ? 'FINAL DEMAND' : 'URGENT', -24, -6); g.fillStyle = '#333'; g.fillRect(-24, 2, 30, 2); g.fillRect(-24, 7, 22, 2); g.restore(); } }),
    fridge: () => T(256, 512, (g, w, hh) => { g.fillStyle = '#e8e6de'; g.fillRect(0, 0, w, hh); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 150, w, 4);
      const card = (x, y, rot, col, txt, sub) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.fillRect(-40, -28, 80, 56); g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 11px Georgia'; g.textAlign = 'center'; g.fillText(txt, 0, -4); g.font = '8px Georgia'; g.fillText(sub, 0, 10); g.fillStyle = '#c62828'; g.beginPath(); g.arc(0, -30, 4, 0, 7); g.fill(); g.restore(); };
      card(70, 60, -.12, '#2a6a9a', 'GREETINGS FROM', 'the riverboat'); card(180, 80, .1, '#b8762a', 'LUCKY 17', 'a calendar, 2009'); card(90, 250, .06, '#3a7a4a', 'THE RUSTY SPUR', 'a beer mat');
      g.save(); g.translate(170, 290); g.rotate(-.05); g.fillStyle = '#f4f8ff'; g.fillRect(-48, -60, 96, 120); g.fillStyle = '#2a62c9'; g.fillRect(-48, -60, 96, 22); g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText("ST JUDE'S", 0, -44); g.fillStyle = '#2a3a5a'; g.font = '8px sans-serif'; ['Recovery Centre', 'Alcohol & gambling', 'You don\'t have to', 'do this alone.', '0800 17 17 17'].forEach((l, i) => g.fillText(l, 0, -20 + i * 14)); g.restore();
      g.fillStyle = '#9a9890'; g.fillRect(w - 26, 60, 8, 70); g.fillRect(w - 26, 200, 8, 120); }),
    photo: () => T(256, 200, (g, w, hh) => { const sky = g.createLinearGradient(0, 0, 0, hh); sky.addColorStop(0, '#8ac8f0'); sky.addColorStop(.6, '#d8eef8'); sky.addColorStop(.62, '#e8d8a8'); sky.addColorStop(1, '#d8c088'); g.fillStyle = sky; g.fillRect(0, 0, w, hh); g.fillStyle = '#3a8ab8'; g.fillRect(0, hh * .5, w, hh * .12);
      for (const [x, s, c] of [[70, 1, '#c84a3a'], [105, .72, '#f0d040'], [140, .55, '#4a9a5a'], [180, 1.05, '#2a4a7a']]) { g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(x, hh * .55 - 52 * s, 11 * s, 0, 7); g.fill(); g.fillStyle = c; g.fillRect(x - 12 * s, hh * .55 - 40 * s, 24 * s, 42 * s); g.fillStyle = '#5a3a22'; g.beginPath(); g.arc(x, hh * .55 - 58 * s, 11 * s, Math.PI, 0); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(8, hh - 24, 150, 16); g.fillStyle = '#c62828'; g.font = 'bold 10px sans-serif'; g.fillText('SAMPLE · FRAME £4.99', 14, hh - 12); }),
    calendar: () => T(160, 220, (g, w, hh) => { g.fillStyle = '#f4f0e4'; g.fillRect(0, 0, w, hh); g.fillStyle = '#b3222b'; g.fillRect(0, 0, w, 34); g.fillStyle = '#fff'; g.font = 'bold 16px Georgia'; g.textAlign = 'center'; g.fillText('OCTOBER', w / 2, 23); g.fillStyle = '#2a2a2a'; g.font = '10px sans-serif'; for (let d = 1; d <= 31; d++) { const c = (d + 2) % 7, r = Math.floor((d + 2) / 7); g.fillText(String(d), 14 + c * 21, 60 + r * 30); } const c = (17 + 2) % 7, r = Math.floor(19 / 7); g.strokeStyle = '#c62828'; g.lineWidth = 3; g.beginPath(); g.ellipse(14 + c * 21, 56 + r * 30, 11, 10, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(14 + c * 21, 56 + r * 30, 13, 11, .3, 0, 7); g.stroke(); }),
    blinds: () => T(128, 128, (g, w, hh) => { for (let y = 0; y < hh; y += 8) { const gr = g.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, '#d8d2c0'); gr.addColorStop(1, '#8a8478'); g.fillStyle = gr; g.fillRect(0, y, w, 7); g.fillStyle = 'rgba(120,160,255,.55)'; g.fillRect(0, y + 7, w, 1); } }),
    board: () => T(256, 256, (g, w) => { const c = w / 2, R = w / 2 - 4, ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]; g.fillStyle = '#111'; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill(); const k = R / 1.2;
      for (let i = 0; i < 20; i++) { const a0 = (i * 18 - 9 - 90) * Math.PI / 180, a1 = a0 + Math.PI / 10, dark = i % 2 === 0, ring = (r0, r1, col) => { g.beginPath(); g.arc(c, c, r1 * k, a0, a1); g.arc(c, c, r0 * k, a1, a0, true); g.closePath(); g.fillStyle = col; g.fill(); }; ring(.1, .58, dark ? '#1b1b1b' : '#efe2c0'); ring(.58, .64, dark ? '#c0392b' : '#1e7a44'); ring(.64, .95, dark ? '#1b1b1b' : '#efe2c0'); ring(.95, 1, dark ? '#c0392b' : '#1e7a44'); const am = (i * 18 - 90) * Math.PI / 180; g.fillStyle = '#e8e2d4'; g.font = 'bold 14px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(ORDER[i]), c + Math.cos(am) * 1.1 * k, c + Math.sin(am) * 1.1 * k); }
      g.fillStyle = '#1e7a44'; g.beginPath(); g.arc(c, c, .1 * k, 0, 7); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(c, c, .045 * k, 0, 7); g.fill(); }),
    books: () => T(256, 64, (g, w, hh) => { let x = 2; const cols = ['#7a2a2a', '#2a4a6a', '#3a5a3a', '#8a6a3a', '#5a3a5a', '#c8b88a', '#2a2a2a']; let i = 0; while (x < w) { const bw = 10 + rnd() * 14; g.fillStyle = cols[i++ % cols.length]; g.fillRect(x, hh - 50 - rnd() * 10, bw - 2, 60); x += bw; } }),
  };

  /* ---------- the television: what the dreams were made of ---------- */
  const CHANNELS = [
    { name: 'BBC Two · The Rusty Spur', col: ['#7a4a22', '#e8b85a'], line: '"Another one for the road, sugar?" The Rusty Spur, series four, a repeat. Dolores is played by an actress you once wrote a letter to. You know every episode. You know Sal dies in series five and comes back in six.', who: 'Dolores' },
    { name: 'ITV · Lucky Lou\'s Riverboat', col: ['#1f5f8b', '#f0d060'], line: 'A Saturday-night game show filmed on a paddle steamer, with a host in a captain\'s hat. "Spin to win, folks!" Lou. Of course it was Lou.', who: 'Lou' },
    { name: 'Channel 4 · Meridian Nights', col: ['#1a1a2a', '#c9a96a'], line: 'A crime drama. A detective called Mori, eleven years sober, works a case at a casino called the Meridian. You\'ve watched the box set three times this month.', who: 'Mori' },
    { name: 'Late-night advert', col: ['#3a1010', '#ffd34d'], line: '"NEED CASH FAST? Call VINNIE\'S LOANS: 0800 17 17 17! Bad credit? No problem!" A man in a sharp suit points at the camera. You owe them £120,000.', who: 'Vinnie' },
    { name: 'Film4 · The Seventeenth Card (1987)', col: ['#0a0a0a', '#d8d0c0'], line: 'An old thriller about a card game. A billionaire called Kessler, a dead man who isn\'t dead, a kid who wins the town back. You know how it ends. You\'ve dreamed it.', who: 'Kessler' },
  ];
  function drawTV(g, w, hh, t) {
    const ch = CHANNELS[S().tv % CHANNELS.length];
    const bg = g.createLinearGradient(0, 0, w, hh); bg.addColorStop(0, ch.col[0]); bg.addColorStop(1, '#050505'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
    // a scene: two silhouettes talking, or a spinning wheel, or a face to camera
    const k = S().tv % CHANNELS.length, cx = w / 2;
    if (k === 1) { g.save(); g.translate(cx, hh * .55); g.rotate(t * 1.4); for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? ch.col[1] : '#c0392b'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 70, i * Math.PI / 6, (i + 1) * Math.PI / 6); g.fill(); } g.restore(); }
    else if (k === 3) { g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(cx, hh * .62, 46, 60, 0, 0, 7); g.fill(); g.fillStyle = '#e0ac69'; g.beginPath(); g.arc(cx, hh * .36, 26, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(cx - 18, hh * .33, 36, 6); g.fillStyle = ch.col[1]; g.font = 'bold 22px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('NEED CASH FAST?', cx, 30 + Math.sin(t * 6) * 2); g.font = 'bold 18px Impact, sans-serif'; g.fillText('0800 17 17 17', cx, hh - 14); }
    else { for (const [x, s] of [[cx - 70, 1], [cx + 60, .9]]) { g.fillStyle = 'rgba(0,0,0,.7)'; g.beginPath(); g.ellipse(x, hh * .7, 30 * s, 56 * s, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + Math.sin(t * 2 + x) * 2, hh * .4, 20 * s, 0, 7); g.fill(); } g.fillStyle = ch.col[1]; g.globalAlpha = .25 + .1 * Math.sin(t * 3); g.fillRect(0, 0, w, hh); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, w, 24); g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'left'; g.fillText(ch.name, 10, 17);
    for (let y = 0; y < hh; y += 3) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 1); } // scanlines
  }
  function drawLaptop(g, w, hh, t) {
    g.fillStyle = '#0c1424'; g.fillRect(0, 0, w, hh); g.fillStyle = '#ffd34d'; g.font = 'bold 26px Georgia'; g.textAlign = 'center'; g.fillText('LuckyStrike.bet', w / 2, 46);
    g.fillStyle = '#9ab'; g.font = '14px sans-serif'; g.fillText('Welcome back. You have been playing for 412 days.', w / 2, 74);
    const names = ['Blackjack', 'Roulette', 'Craps', 'Slots', 'Poker', 'Baccarat']; names.forEach((n, i) => { const x = 40 + (i % 3) * 150, y = 100 + Math.floor(i / 3) * 70; g.fillStyle = i === Math.floor(t * .7) % 6 ? '#2a4a7a' : '#16233a'; g.fillRect(x, y, 130, 54); g.fillStyle = '#e8eef8'; g.font = 'bold 15px sans-serif'; g.fillText(n, x + 65, y + 33); });
    g.fillStyle = '#5aff9a'; g.font = 'bold 18px sans-serif'; g.fillText(`Balance ${money(S().cash)}`, w / 2, hh - 30);
  }

  /* ---------- the thing in the mirror: you ---------- */
  function demon() {
    const grp = new THREE.Group(), skin = new THREE.MeshStandardMaterial({ color: 0x4a3a38, roughness: .8 }), skin2 = new THREE.MeshStandardMaterial({ color: 0x5a4844, roughness: .65 }), jacket = new THREE.MeshStandardMaterial({ color: 0x6e6858, roughness: 1, side: THREE.DoubleSide }), eye = new THREE.MeshBasicMaterial({ color: 0xff2010 }), bone = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: .6 });
    const limb = (a, b, r0, r1, m) => { const d = new THREE.Vector3().subVectors(b, a), len = d.length(), c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 8), m); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); grp.add(c); const j = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.05, 8, 6), m); j.position.copy(a); grp.add(j); return c; };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // legs that bend backwards, feet like a dog's
    for (const k of [-1, 1]) { limb(V(k * .1, 1.0, 0), V(k * .12, .58, -.16), .07, .05, skin); limb(V(k * .12, .58, -.16), V(k * .11, .08, .02), .05, .03, skin); limb(V(k * .11, .08, .02), V(k * .11, .02, .16), .03, .02, skin); }
    // a starved, hunched body, ribs through a torn jacket
    const torso = limb(V(0, 1.0, 0), V(0, 1.62, .18), .14, .19, skin2); G.torso = torso;
    for (let i = 0; i < 5; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(.15 - i * .008, .008, 4, 12, Math.PI), bone); rib.position.set(0, 1.25 + i * .07, .08 + i * .022); rib.rotation.set(Math.PI / 2 - .4, 0, Math.PI); grp.add(rib); }
    for (let i = 0; i < 7; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(.022, 6, 4), bone); v.position.set(0, 1.08 + i * .08, -.13 + i * .045); grp.add(v); }
    for (const k of [-1, 1]) { const flap = new THREE.Mesh(new THREE.PlaneGeometry(.2, .55, 3, 4), jacket); const pos = flap.geometry.attributes.position; for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -.2) pos.setY(i, pos.getY(i) - Math.random() * .12); flap.position.set(k * .15, 1.32, .12); flap.rotation.set(-.35, k * .5, 0); grp.add(flap); }
    // arms with a joint too many, hanging past the knees
    for (const k of [-1, 1]) { const s = V(k * .2, 1.6, .16), e1 = V(k * .26, 1.28, .18), e2 = V(k * .25, .95, .22), w = V(k * .22, .62, .24); limb(s, e1, .045, .04, skin); limb(e1, e2, .04, .034, skin); limb(e2, w, .034, .026, skin); for (let f = 0; f < 4; f++) limb(w, V(k * (.2 + f * .015), .45 - f * .015, .26 + (f - 1.5) * .02), .012, .006, skin); }
    // the head hangs lower than the shoulders on a long neck: a skull with skin on
    limb(V(0, 1.64, .2), V(0, 1.6, .36), .05, .04, skin);
    const head = new THREE.Group(); head.position.set(0, 1.52, .42); grp.add(head); G.head = head;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 12), skin2); skull.scale.set(1, 1.25, 1.05); head.add(skull);
    for (const k of [-1, 1]) { const sock = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x000000 })); sock.position.set(k * .042, .03, .095); head.add(sock); const e = new THREE.Mesh(new THREE.SphereGeometry(.008, 6, 4), eye); e.position.set(k * .042, .03, .115); head.add(e); }
    const jaw = new THREE.Group(); jaw.position.set(0, -.08, .06); head.add(jaw); G.jaw = jaw;
    const jm = new THREE.Mesh(new THREE.BoxGeometry(.11, .03, .09), skin2); jm.position.set(0, -.04, .03); jaw.add(jm);
    for (let i = 0; i < 6; i++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(.007, .03, 4), bone); tooth.position.set(-.04 + i * .016, -.015, .07); jaw.add(tooth); const t2 = tooth.clone(); t2.position.set(-.04 + i * .016, -.07, .065); t2.rotation.z = Math.PI; head.add(t2); }
    grp.traverse(o => o.layers.set(1)); // only the mirror sees it
    return grp;
  }

  /* ---------- building the room ---------- */
  // the room runs x 0..6 (left to right), z 0..4.5 (back wall to the door), 2.5 high
  const RW = 6, RD = 4.5, RH = 2.5;
  function build(host) {
    seed = 7;
    const low = App.state.settings.gfx === 'low'; // the ☰ menu: a lighter room for slow phones
    const renderer = new THREE.WebGLRenderer({ antialias: !low }); renderer.setPixelRatio(low ? .6 : Math.min(1.5, devicePixelRatio || 1)); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    host.append(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030302); scene.fog = new THREE.Fog(0x050403, 5, 14);
    const camera = new THREE.PerspectiveCamera(72, 1, .05, 40);
    G = { renderer, scene, camera, uses: [], solids: [], busy: 0, t0: performance.now(), yaw: .35, pitch: -.12, x: 3.4, z: 2.3, keys: new Set(), stick: null, look: null, tvTex: null, lapTex: null };
    const st = S(); if (st.pos) { G.x = st.pos.x; G.z = st.pos.z; G.yaw = st.pos.yaw; }
    const M = (o) => new THREE.MeshStandardMaterial({ roughness: .85, metalness: 0, ...o });
    const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
    const box = (w, hh, d, mat, x, y, z, ry) => add(new THREE.BoxGeometry(w, hh, d), mat, x, y + hh / 2, z, ry);
    const solid = (x0, z0, x1, z1) => G.solids.push([x0, z0, x1, z1]);
    const use = (mesh, label, fn) => { mesh.userData.use = { label, fn }; G.uses.push(mesh); return mesh; };
    // walls, floor, ceiling
    const wallM = M({ map: TEX.wall() });
    add(new THREE.PlaneGeometry(RW, RH), wallM, RW / 2, RH / 2, 0);
    add(new THREE.PlaneGeometry(RW, RH), wallM, RW / 2, RH / 2, RD, Math.PI);
    add(new THREE.PlaneGeometry(RD, RH), wallM, 0, RH / 2, RD / 2, Math.PI / 2);
    add(new THREE.PlaneGeometry(RD, RH), wallM, RW, RH / 2, RD / 2, -Math.PI / 2);
    const floor = add(new THREE.PlaneGeometry(RW, RD), M({ map: TEX.carpet() }), RW / 2, 0, RD / 2); floor.rotation.x = -Math.PI / 2;
    const ceil = add(new THREE.PlaneGeometry(RW, RD), M({ map: TEX.ceiling() }), RW / 2, RH, RD / 2); ceil.rotation.x = Math.PI / 2;
    for (const [x, z, w, d] of [[RW / 2, .02, RW, .04], [RW / 2, RD - .02, RW, .04], [.02, RD / 2, .04, RD], [RW - .02, RD / 2, .04, RD]]) box(w, .1, d, M({ color: 0xd8d0c0 }), x, 0, z); // skirting
    // light: one bare bulb on a flex, and whatever glows
    scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x1a1410, .35));
    const bulb = new THREE.PointLight(0xffd59a, 1.2, 9, 2); bulb.position.set(3, 2.15, 2.2); scene.add(bulb); G.bulb = bulb;
    add(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), 3, 2.15, 2.2);
    add(new THREE.CylinderGeometry(.006, .006, .33, 4), M({ color: 0x111111 }), 3, 2.33, 2.2);
    // the front door, the chain, the letters
    const door = box(.9, 2.05, .06, M({ color: 0x8a6448, roughness: .7 }), 5.05, 0, RD - .04); box(.06, .06, .04, M({ color: 0xc9a14a, metalness: .6 }), 4.72, 1.0, RD - .09);
    for (const [w, hh, x, y] of [[.07, 2.12, 4.565, 0], [.07, 2.12, 5.535, 0], [1.04, .07, 5.05, 2.05]]) box(w, hh, .05, M({ color: 0xe0d8c8 }), x, y, RD - .03); // the frame
    for (const y of [.35, 1.25]) box(.6, .6, .012, M({ map: TEX.wood(), color: 0xb89878 }), 5.05, y, RD - .075); // panels
    add(new THREE.CylinderGeometry(.012, .012, .02, 10), M({ color: 0x222222, metalness: .5 }), 5.05, 1.55, RD - .08).rotation.x = Math.PI / 2; // the spyhole
    for (let i = 0; i < 7; i++) add(new THREE.TorusGeometry(.012, .003, 4, 8), M({ color: 0xb8b8b0, metalness: .8, roughness: .3 }), 4.66 + i * .022, 1.42 - Math.sin(i / 6 * Math.PI) * .05, RD - .085).rotation.y = Math.PI / 2; // the chain
    use(door, 'The front door', () => A.door());
    const lt = add(new THREE.PlaneGeometry(1.1, .55), new THREE.MeshStandardMaterial({ map: TEX.letters(), transparent: true, roughness: 1 }), 5.0, .012, RD - .45); lt.rotation.x = -Math.PI / 2;
    use(lt, 'The letters by the door', () => A.letters());
    // the mirror by the door, over a basin: what the dreams called the Barman
    const mirror = new THREE.Reflector(new THREE.PlaneGeometry(.6, .85), { clipBias: .003, textureWidth: low ? 256 : 512, textureHeight: low ? 362 : 725, color: 0x8c9496 }); mirror.position.set(RW - .012, 1.55, 3.3); mirror.rotation.y = -Math.PI / 2; scene.add(mirror); G.mirror = mirror;
    for (const [w, hh, y, z] of [[.68, .04, 1.98, 3.3], [.68, .04, 1.12, 3.3], [.04, .9, 1.55, 2.96], [.04, .9, 1.55, 3.64]]) { const f = add(new THREE.BoxGeometry(.02, hh, w === .04 ? .04 : w), M({ color: 0x9a8a6a, metalness: .3 }), RW - .012, y, z); }
    box(.45, .12, .55, M({ color: 0xe8e8e0 }), RW - .23, .82, 3.3); box(.12, .82, .12, M({ color: 0xd8d8d0 }), RW - .18, 0, 3.3);
    use(mirror, 'The mirror', () => A.mirror());
    box(.5, .05, .08, M({ color: 0xf0f0e8, emissive: 0xfff2d0, emissiveIntensity: .8 }), RW - .05, 2.02, 3.3, Math.PI / 2);
    const basinL = new THREE.PointLight(0xfff0d8, .9, 2.6, 2); basinL.position.set(RW - .3, 2.0, 3.3); scene.add(basinL);
    // the kitchenette: a counter, a sink, a two-ring hob, the fridge, the empties
    box(.6, .9, 1.6, M({ color: 0xb8b0a0 }), RW - .3, 0, .85); box(.62, .04, 1.62, M({ color: 0x7a7268 }), RW - .3, .9, .85); solid(RW - .62, 0, RW, 1.7);
    box(.4, .02, .4, M({ color: 0x8a949e, metalness: .5, roughness: .3 }), RW - .3, .94, .45);
    for (const z of [1.1, 1.38]) add(new THREE.CylinderGeometry(.09, .09, .01, 16), M({ color: 0x111111 }), RW - .3, .95, z);
    const fridge = box(.62, 1.6, .62, M({ map: TEX.fridge() }), RW - .32, 0, 2.05); solid(RW - .65, 1.72, RW, 2.38);
    use(fridge, 'The fridge', () => A.fridge());
    for (let i = 0; i < 9; i++) { const can = add(new THREE.CylinderGeometry(.033, .033, .12, 10), M({ color: [0xc0392b, 0x2a62c9, 0xd8d8d8][i % 3], metalness: .6, roughness: .35 }), RW - .5 - (i % 3) * .09 - (i > 5 ? .2 : 0), .96 + (i > 2 && i < 6 ? .12 : 0), .2 + Math.floor(i / 3) * .08); if (i % 4 === 3) { can.rotation.z = Math.PI / 2; can.position.y = .95; } }
    // the bed, unmade, against the left wall
    box(.95, .32, 2.05, M({ map: TEX.wood() }), .5, 0, 1.1); box(.9, .14, 1.95, M({ map: TEX.duvet() }), .5, .32, 1.1); box(.55, .1, .35, M({ color: 0xd8d4c8 }), .5, .44, .3); solid(0, .05, 1.0, 2.15);
    use(box(.9, .02, 1.6, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), .5, .46, 1.3), 'The bed', () => A.bed());
    // the desk and the laptop, the only bright thing in the room
    box(1.3, .04, .6, M({ map: TEX.wood() }), 2.7, .73, .32); for (const [x, z] of [[2.1, .07], [3.3, .07], [2.1, .57], [3.3, .57]]) box(.04, .73, .04, M({ color: 0x3a2a1a }), x, 0, z); solid(2.0, 0, 3.4, .66);
    box(.4, .45, .4, M({ color: 0x2a2a2e }), 2.7, 0, 1.0); box(.4, .5, .05, M({ color: 0x2a2a2e }), 2.7, .45, 1.2); solid(2.48, .8, 2.92, 1.24); // the chair
    box(.36, .015, .25, M({ color: 0x222226, metalness: .4 }), 2.7, .77, .34);
    const lapC = document.createElement('canvas'); lapC.width = 512; lapC.height = 320; G.lapCtx = lapC.getContext('2d'); G.lapTex = new THREE.CanvasTexture(lapC); G.lapTex.encoding = THREE.sRGBEncoding;
    const scr = add(new THREE.PlaneGeometry(.36, .23), new THREE.MeshBasicMaterial({ map: G.lapTex }), 2.7, .9, .23); scr.rotation.x = -.2;
    use(scr, 'The laptop', () => A.laptop());
    const lapLight = new THREE.PointLight(0x8ab4ff, .55, 2.6, 2); lapLight.position.set(2.7, .95, .5); scene.add(lapLight);
    const frame = box(.16, .2, .02, M({ color: 0x3a2a1a }), 3.15, .75, .18); const ph = add(new THREE.PlaneGeometry(.13, .1), new THREE.MeshBasicMaterial({ map: TEX.photo() }), 3.15, .86, .195); ph.rotation.x = -.15; frame.rotation.x = -.15;
    use(ph, 'A photo in a frame', () => A.photo());
    // the dartboard, and the line nobody but you stands on
    const bd = add(new THREE.CylinderGeometry(.23, .23, .04, 32), M({ map: TEX.board(), roughness: .8 }), 4.4, 1.73, .03); bd.rotation.x = Math.PI / 2; bd.rotation.y = 0; bd.material.map.center.set(.5, .5); bd.material.map.rotation = 0;
    box(.6, .6, .02, M({ color: 0x1a1210 }), 4.4, 1.43, .012);
    const oche = add(new THREE.PlaneGeometry(.6, .03), new THREE.MeshBasicMaterial({ color: 0xe8d8a0 }), 4.4, .004, 2.37); oche.rotation.x = -Math.PI / 2;
    use(bd, 'The dartboard', () => A.darts());
    const cal = add(new THREE.PlaneGeometry(.3, .42), M({ map: TEX.calendar() }), 3.6, 1.55, .012); use(cal, 'The calendar', () => A.calendar());
    // the bookshelf, the radio on it
    box(.8, 1.4, .28, M({ map: TEX.wood() }), 1.5, 0, .16); solid(1.08, 0, 1.92, .32);
    for (const y of [.15, .55, .95]) add(new THREE.PlaneGeometry(.74, .32), M({ map: TEX.books() }), 1.5, y + .17, .305);
    const radio = box(.3, .16, .14, M({ color: 0x6a4a2a }), 1.5, 1.4, .14); box(.1, .1, .01, M({ color: 0xc9a14a }), 1.42, 1.43, .215);
    use(radio, 'The radio', () => A.radio());
    use(box(.74, 1.1, .02, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), 1.5, .1, .31), 'The bookshelf', () => A.books());
    // the window, the blinds always down, a sign outside
    const win = add(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshStandardMaterial({ map: TEX.blinds(), emissive: 0x2a3a6a, emissiveIntensity: .35 }), .012, 1.55, 3.3, Math.PI / 2);
    use(win, 'The window', () => A.window());
    const outside = new THREE.PointLight(0x6a7aff, .35, 3, 2); outside.position.set(.4, 1.6, 3.3); scene.add(outside);
    // the TV and the armchair
    box(1.0, .5, .4, M({ map: TEX.wood() }), 1.1, 0, RD - .25); solid(.55, RD - .48, 1.65, RD);
    box(.9, .55, .08, M({ color: 0x111111 }), 1.1, .5, RD - .2);
    const tvC = document.createElement('canvas'); tvC.width = 512; tvC.height = 300; G.tvCtx = tvC.getContext('2d'); G.tvTex = new THREE.CanvasTexture(tvC); G.tvTex.encoding = THREE.sRGBEncoding;
    const tv = add(new THREE.PlaneGeometry(.82, .47), new THREE.MeshBasicMaterial({ map: G.tvTex }), 1.1, .775, RD - .245, Math.PI);
    use(tv, 'The television', () => A.tv());
    const tvLight = new THREE.PointLight(0xaabbff, .7, 3.4, 2); tvLight.position.set(1.1, .8, RD - .6); scene.add(tvLight); G.tvLight = tvLight;
    box(.75, .42, .75, M({ color: 0x5a3a3a }), 1.3, 0, 2.9); box(.75, .5, .16, M({ color: 0x5a3a3a }), 1.3, .42, 2.58); for (const k of [-1, 1]) box(.14, .2, .75, M({ color: 0x4a2e2e }), 1.3 + k * .3, .42, 2.9); solid(.9, 2.5, 1.7, 3.28);
    // the floor: a bin bag, a tower of empties, a pizza box
    box(.4, .45, .4, M({ color: 0x111114, roughness: .4 }), 4.9, 0, .5); solid(4.7, .3, 5.1, .7);
    for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(.033, .033, .12, 10), M({ color: 0xd8d8d8, metalness: .6, roughness: .35 }), 4.4 + (i % 3) * .07, .06 + Math.floor(i / 3) * .12, 3.0);
    box(.4, .04, .4, M({ color: 0xb08a5a }), 3.6, 0, 3.6);
    // you, in the mirror
    G.demon = demon(); scene.add(G.demon);
    resize(); window.addEventListener('resize', resize);
  }
  function resize() { if (!G) return; const host = G.renderer.domElement.parentNode; if (!host) return; const w = host.clientWidth || innerWidth, hh = host.clientHeight || innerHeight; G.renderer.setSize(w, hh); G.camera.aspect = w / hh; G.camera.updateProjectionMatrix(); }

  /* ---------- moving about, looking, using things ---------- */
  function blocked(x, z) { if (x < .25 || x > RW - .25 || z < .25 || z > RD - .25) return true; return G.solids.some(([a, b, c, d]) => x > a - .22 && x < c + .22 && z > b - .22 && z < d + .22); }
  function step(dt) {
    let fx = 0, fz = 0; const k = G.keys;
    if (k.has('w') || k.has('arrowup')) fz += 1; if (k.has('s') || k.has('arrowdown')) fz -= 1; if (k.has('a')) fx -= 1; if (k.has('d')) fx += 1;
    if (k.has('arrowleft')) G.yaw += dt * 1.8; if (k.has('arrowright')) G.yaw -= dt * 1.8;
    if (G.stick) { fx += G.stick.x; fz += -G.stick.y; }
    const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
    if (len > .05 && !G.busy) {
      const sp = 1.5 * dt, sx = -Math.sin(G.yaw), sz = -Math.cos(G.yaw), rx = Math.cos(G.yaw), rz = -Math.sin(G.yaw);
      const nx = G.x + (sx * fz + rx * fx) * sp, nz = G.z + (sz * fz + rz * fx) * sp;
      if (!blocked(nx, G.z)) G.x = nx; if (!blocked(G.x, nz)) G.z = nz;
      G.walk = (G.walk || 0) + dt * 7;
    }
  }
  let ray = null;
  function pick(ndcX = 0, ndcY = 0) {
    ray = ray || new THREE.Raycaster(); ray.setFromCamera({ x: ndcX, y: ndcY }, G.camera); ray.far = 2.6;
    const hit = ray.intersectObjects(G.uses, false)[0]; return hit ? hit.object.userData.use : null;
  }
  function useFocus(u) { if (!u || G.busy) return; u.fn(); }
  function bindInput(root) {
    const cv = G.renderer.domElement; cv.style.touchAction = 'none';
    G.kd = e => { const k = e.key.toLowerCase(); if (document.querySelector('.l3-say,.l3-laptop')) return; if (['e', ' ', 'enter'].includes(k)) { e.preventDefault(); useFocus(pick()); return; } G.keys.add(k); };
    G.ku = e => G.keys.delete(e.key.toLowerCase());
    addEventListener('keydown', G.kd); addEventListener('keyup', G.ku);
    const pts = new Map();
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { }
      const left = e.pointerType === 'touch' && e.clientX < innerWidth * .4 && e.clientY > innerHeight * .35;
      pts.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, stick: left, t0: performance.now(), moved: 0 });
      if (left) { G.stickEl.style.display = 'block'; G.stickEl.style.left = e.clientX - 50 + 'px'; G.stickEl.style.top = e.clientY - 50 + 'px'; }
    });
    cv.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.moved += Math.abs(dx) + Math.abs(dy);
      if (p.stick) { const sx = (p.x - p.x0) / 50, sy = (p.y - p.y0) / 50, l = Math.hypot(sx, sy); G.stick = { x: l > 1 ? sx / l : sx, y: l > 1 ? sy / l : sy }; G.stickEl.firstChild.style.transform = `translate(${G.stick.x * 32}px, ${G.stick.y * 32}px)`; }
      else { G.yaw -= dx * .0055; G.pitch = Math.max(-1.1, Math.min(1.1, G.pitch - dy * .0045)); }
    });
    const up = e => {
      const p = pts.get(e.pointerId); if (!p) return; pts.delete(e.pointerId);
      if (p.stick) { G.stick = null; G.stickEl.style.display = 'none'; }
      else if (p.moved < 10 && performance.now() - p.t0 < 400) { const r = cv.getBoundingClientRect(); useFocus(pick((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    root.querySelector('.l3-use').addEventListener('pointerdown', e => { e.preventDefault(); useFocus(pick()); });
  }

  /* ---------- the drink: the only bar left ---------- */
  const level = () => S().drink;
  const stateOf = v => v >= 60 ? 'Steady' : v >= 35 ? 'Shaky' : v >= 15 ? 'The shakes' : 'Collapsing';
  let lastThought = 0;
  const THOUGHTS = ['A can. Just one. Then you\'ll think.', 'The fridge hums like it knows.', 'You could win it back tonight. You\'ve done it before. Haven\'t you?', 'Nobody has knocked in four months.', 'Your hands won\'t hold still.'];
  function drain(sec) {
    const st = S(); if (st.ended) return;
    st.drink = Math.max(0, st.drink - sec * DRAIN);
    if (st.drink <= 0) { collapse(); return; }
    if (st.drink < 35 && Date.now() - lastThought > 40000) { lastThought = Date.now(); toast('🍺 ' + THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]); }
  }
  // a hand at the laptop takes time too
  function roundNeeds(kind, k = 1) { if (kind === 'round') { const st = S(); st.drink = Math.max(1, st.drink - 6 * k); } }

  /* ---------- the loop ---------- */
  function frame(now) {
    if (!G || !G.renderer) return;
    const dt = Math.min(.05, (now - (G.last || now)) / 1000); G.last = now; const t = (now - G.t0) / 1000;
    step(dt);
    if (!G.busy && !document.hidden) { G.acc = (G.acc || 0) + dt; if (G.acc >= 1) { drain(G.acc); G.acc = 0; hud(); } }
    const v = level(), shake = v < 35 ? (35 - v) / 35 : 0, bob = Math.sin(G.walk || 0) * .025;
    const cam = G.camera; cam.position.set(G.x + (Math.random() - .5) * shake * .012, 1.6 + bob + (Math.random() - .5) * shake * .01, G.z);
    cam.rotation.order = 'YXZ'; cam.rotation.set(G.pitch + Math.sin(t * 1.3) * shake * .03, G.yaw + Math.sin(t * .9) * shake * .025, Math.sin(t * .7) * shake * .02);
    // the bulb flickers; the TV and the laptop move
    G.bulb.intensity = 1.15 + (Math.random() < .02 ? -.6 : 0) + Math.sin(t * 50) * .01;
    if (G.tvCtx && Math.floor(t * 12) !== G.tvT) { G.tvT = Math.floor(t * 12); drawTV(G.tvCtx, 512, 300, t); G.tvTex.needsUpdate = true; const c = CHANNELS[S().tv % CHANNELS.length].col[1]; G.tvLight.color.set(c); G.tvLight.intensity = .5 + Math.random() * .15; }
    if (G.lapCtx && Math.floor(t * 4) !== G.lapT) { G.lapT = Math.floor(t * 4); drawLaptop(G.lapCtx, 512, 320, t); G.lapTex.needsUpdate = true; }
    // you: where you stand, the way you face, hunched and breathing
    const D = G.demon; D.position.set(G.x, 0, G.z); D.rotation.y = G.yaw + Math.PI; if (G.head) { G.head.rotation.set(G.pitch * .6 + .25 + Math.sin(t * 7) * .02, Math.sin(t * 3.1) * .05, Math.sin(t * 5) * .03); G.jaw.rotation.x = .35 + Math.sin(t * 1.7) * .1; }
    // focus
    if (Math.floor(t * 8) !== G.ft) { G.ft = Math.floor(t * 8); const u = G.busy ? null : pick(); const pr = G.root.querySelector('.l3-prompt'); pr.textContent = u ? u.label : ''; pr.classList.toggle('on', !!u); }
    G.root.style.setProperty('--blur', v < 15 ? ((15 - v) / 15 * 1.6).toFixed(2) + 'px' : '0px'); G.root.classList.toggle('sick', v < 35);
    G.renderer.render(G.scene, cam);
    G.raf = requestAnimationFrame(frame);
  }
  function hud() {
    if (!G) return; const st = S(), v = st.drink, r = G.root;
    r.querySelector('.l3-drink i').style.width = Math.round(v) + '%'; r.querySelector('.l3-drink em').textContent = stateOf(v); r.querySelector('.l3-drink').classList.toggle('low', v < 35);
    r.querySelector('.l3-cash').textContent = money(st.cash); r.querySelector('.l3-goal i').style.width = Math.min(100, st.cash / GOAL * 100) + '%';
    r.querySelector('.l3-cans').textContent = `🍺 ${st.cans} in the fridge${st.order ? ' · a delivery is coming' : ''}`;
  }

  /* ---------- things in the room ---------- */
  const A = {
    async fridge() {
      const st = S();
      const c = await choose(`The fridge. ${st.cans ? `${st.cans} can${st.cans > 1 ? 's' : ''} of the cheap lager on the shelf, and nothing else but a lemon gone grey.` : 'Empty, apart from a lemon gone grey. The light inside is the warmest thing in the room.'} Postcards on the door, and a leaflet.`, [...(st.cans ? [['drink', '🍺 Drink a can (the drink +30)']] : []), ['leaflet', '📄 Read the leaflet on the door'], ['cards', '🖼️ Look at the postcards'], ['no', 'Close it']]);
      if (c === 'drink') { st.cans--; st.drink = Math.min(100, st.drink + 30); App.count('l3_cans'); App.save(); hud(); await say([{ text: pickOne(['*Ssssk.* Warm before it\'s halfway down. Your hands stop. Your head stops. Everything stops, for a bit.', 'You drink it standing at the open fridge, in its light, like a man at a shrine.', 'It doesn\'t taste of anything any more. That isn\'t why you drink it.']) }]); if (!st.cans && !st.order) toast('🍺 That was the last one. The laptop can order more.'); }
      if (c === 'leaflet') await say([{ text: 'ST JUDE\'S RECOVERY CENTRE. Alcohol and gambling. "You don\'t have to do this alone." 0800 17 17 17.' }, { text: 'St Jude\'s. The clinic you woke up in, in the dream. Dr. Okafor was a voice on their helpline, once, at four in the morning. You hung up when she asked your name.' }, { text: 'They\'d want you sober. They\'d want the debt dealt with. Five hundred thousand pounds. You put the leaflet back under its magnet.' }]);
      if (c === 'cards') { S().flags.cards = 1; await say([{ text: 'A postcard of a paddle steamer, bought in a charity shop. A beer mat from a pub called the Rusty Spur, which closed in 2009. A calendar page with a lucky 17 on it.' }, { text: 'Sal sent you postcards, in the dream. Nobody has ever sent you a postcard.' }]); }
    },
    async laptop() { openLaptop(); },
    async mirror() {
      const st = S(); App.count('l3_mirror'); Career.checkAchievements();
      if (!st.flags.mirror) { st.flags.mirror = 1; App.save(); return say([{ text: '*You look up from the basin.*' }, { text: 'Too tall for the mirror. Starved thin, hunched, the ribs showing through a dressing gown gone grey. The head hangs forward on its neck like it\'s too heavy. Two red points where the eyes should be.' }, { text: 'It moves when you move. It\'s you. It was always you. The thing that hunted you through the Meridian was only ever this: a man in a room, and what the drink has made of him.' }]); }
      return say([{ text: pickOne(['It\'s still you.', 'You make yourself look. It looks back.', 'You try smiling. The jaw hangs open instead.']) }]);
    },
    async door() {
      S().drink = Math.max(1, S().drink - 2); hud();
      if (S().order === 'here') { S().order = 0; S().cans += 8; App.save(); hud(); return say([{ text: '*You open the door on the chain, just wide enough to pull the carrier bag in. Eight cans. The stairwell is empty. Nobody is ever there.*' }]); }
      await say([{ text: pickOne(['Your hand on the latch. The landing beyond it, the stairs, the street, the people. Your heart goes like a bird in a box. Not today.', 'You stand at the door for a long time. You don\'t open it.', 'The last time you went out was in June. You think it was June.']) }]);
    },
    async letters() {
      await say([{ text: 'A drift of envelopes nobody has opened since the spring. You open them now.' }, { text: 'VINNIE\'S LOANS LTD: £120,000. LUCKYSTRIKE.BET CREDIT: £88,400. KESSLER CAPITAL (debt purchase): £143,000. Three credit cards. The council. HMRC. A payday lender called Big Nico.' }, { text: 'At the bottom, in your own handwriting on the back of one: £500,000. Then a 17, underlined twice.' }, { text: 'Vinnie. Kessler. Nico. The dream gave them faces.' }]);
    },
    async photo() {
      await say([{ text: 'A family on a beach, laughing: a woman with her hair blowing across her face, a girl of about nine, a little boy on his dad\'s shoulders.' }, { text: 'Nora. Ellie. Sam.' }, { text: 'There\'s a sticker in the corner: SAMPLE, FRAME £4.99. It\'s the photo the frame came with. You bought it on the market and never took the picture out. You gave them names. You gave them a whole life.' }, { text: 'Nobody died. Nobody was ever here.' }]);
    },
    async calendar() { await say([{ text: 'October. Nothing in any of the squares except the 17th, circled so hard the pen went through. You can\'t remember why. You never could.' }]); },
    async bed() { const c = await choose('The bed. The sheets haven\'t been changed since the summer.', [['lie', 'Lie down for a while'], ['no', 'Not yet']]); if (c !== 'lie') return; S().drink = Math.max(1, S().drink - 12); hud(); await say([{ text: 'The ceiling has a stain shaped like a river. You lie and look at it until it stops looking like anything, and you dream, for a minute, of a bright little town where everyone you never had is only missing.' }]); },
    async window() { await say([{ text: '*You lift one slat of the blind.* Across the road, the bookmaker\'s sign: MERIDIAN BETS. Rain on the glass. A bus going somewhere. You let the slat fall.' }]); },
    async books() { await say([{ text: 'Paperbacks. "Beat the Dealer". A darts annual from 1984 with a man called Mick on the cover. A thriller, dog-eared: "The Seventeenth Card". A book about grief you bought for someone you never knew.' }, { text: 'All the stories you borrowed.' }]); },
    async radio() {
      const st = S(); const c = await choose('An old radio. One station comes in clearly.', [['spur', '📻 Country and honky-tonk'], ['riverboat', '📻 Old jazz'], ['off', 'Turn it off']]);
      st.radio = c === 'off' ? null : c; App.save(); if (typeof Music !== 'undefined' && Music.refresh) Music.refresh(); if (c !== 'off') toast(c === 'spur' ? '📻 A piano somewhere, and a woman laughing. It sounds like the Spur.' : '📻 A clarinet, a crackle. It sounds like the riverboat.');
    },
    async tv() {
      const st = S(); st.tv = (st.tv + 1) % CHANNELS.length; st.flags['tv' + st.tv] = 1; App.save();
      const ch = CHANNELS[st.tv]; await say([{ text: `*Click.* ${ch.name}.` }, { text: ch.line }]);
      if (CHANNELS.every((_, i) => st.flags['tv' + i]) && !st.flags.allTv) { st.flags.allTv = 1; await say([{ text: 'Every face from the dream is on this television. You took them, one by one, and gave them to yourself as friends.' }]); }
    },
    async darts() {
      const c = await choose('The dartboard. Three darts in the treble twenty, where you left them. Mick says he\'ll give you a game. Mick always says that.', [['play', '🎯 A leg of 301 with Mick'], ['no', 'Not now']]);
      if (c !== 'play') return;
      toGame(() => Darts.match({ mode: 'x01', start: 301, legs: 1, opp: { name: 'Mick (who isn\'t there)', face: '🎯', sigma: 12 }, stake: 0, title: 'Mick · 301 in the bedsit', l3: true }));
    },
  };
  const pickOne = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- the laptop: every game from the dreams, with real money ---------- */
  function toGame(go) {
    const st = S(); st.atTable = true; st.dreamBank = App.state.bank; st.dreamVenue = App.state.venue; st.before = st.cash;
    App.state.bank = st.cash; App.state.venue = 'palace'; if (G) st.pos = { x: G.x, z: G.z, yaw: G.yaw }; App.save(); go();
  }
  function back() {
    const st = S(); if (!st.atTable) return;
    st.cash = Math.round(App.state.bank * 100) / 100; App.state.bank = st.dreamBank; App.state.venue = st.dreamVenue || App.state.venue; st.atTable = false;
    const diff = st.cash - (st.before || st.cash); if (diff < 0) st.lost += -diff; App.save();
  }
  function openLaptop() {
    const st = S(); if (G) G.busy++;
    const o = h('div.l3-laptop'), close = () => { o.remove(); if (G) G.busy = Math.max(0, G.busy - 1); };
    const games = ['bj', 'uth', 'tcp', 'ms', 'lir', 'c4', 'bac', 'craps', 'roulette', 'war'].filter(g => GAMES[g]);
    const slots = ['spur', 'riverboat', 'palace', 'salon'].filter(v => SLOT_MACHINES[v]);
    const card = (icon, name, sub, fn) => h('button.l3-game', { onclick: () => { close(); fn(); } }, h('span', icon), h('b', name), h('small', sub));
    o.append(h('div.l3-lap',
      h('div.l3-lap-h', h('b', 'LuckyStrike.bet'), h('span', `Balance ${money(st.cash)}`), h('button.l3-x', { onclick: close, 'aria-label': 'Close the laptop' }, '×')),
      h('p.l3-lap-note', `You owe ${money(GOAL)}. Win it and you could clear the lot. Lose it all and that\'s the end of the money.`),
      h('div.l3-goal2', h('i', { style: { width: Math.min(100, st.cash / GOAL * 100) + '%' } }), h('span', `${money(st.cash)} of ${money(GOAL)}`)),
      h('h4', 'Tables'), h('div.l3-grid', games.map(g => card('🂡', GAMES[g].name, 'Live dealer', () => toGame(() => Router.openTable(g))))),
      h('h4', 'Slots'), h('div.l3-grid', slots.map(v => card('🎰', SLOT_MACHINES[v].name, 'Jackpots', () => toGame(() => Router.go('slots', v))))),
      h('h4', 'Poker'), h('div.l3-grid', card('♠', 'Tournaments', 'Sit and go, every hour', () => toGame(() => Router.go('poker')))),
      h('h4', 'Shop'), h('div.l3-grid', st.order ? h('p.l3-lap-note', st.order === 'here' ? 'Your delivery is outside the door.' : 'Your delivery is on its way.') : card('🍺', 'Order 8 cans', '£16 · to the door in a minute', () => order()))));
    document.body.append(o);
  }
  function order() {
    const st = S(); if (st.cash < 16) return toast('Not enough money for the cans.');
    st.cash -= 16; st.order = 'coming'; App.save(); hud(); toast('🍺 Ordered. To the door in about a minute.');
    setTimeout(() => { if (App.state && App.state.l3 && S().order === 'coming') { S().order = 'here'; App.save(); hud(); toast('🚪 A knock at the door. By the time you get there, nobody is there. Only a carrier bag.'); } }, 55000);
  }

  /* ---------- the three true endings ---------- */
  async function ending(kind) {
    const st = S(); if (st.ended) return; st.ended = kind; st.endings[kind] = 1; App.count('l3_end_' + kind); App.save(); Career.checkAchievements();
    if (G) G.busy++;
    const E = {
      rehab: { title: 'Day One', kind: 'The good true ending', lines: [
        { text: `${money(st.cash)}. You look at it for an hour. You don't play another hand.` },
        { text: 'You pay them. Vinnie\'s Loans, Kessler Capital, Big Nico, the cards, the council. One by one. The balance says £0.00 and the letters by the door say nothing at all.' },
        { text: 'Then you take the leaflet off the fridge and ring the number. A woman answers. Her voice is calm and unhurried, and she asks your name, and this time you tell her.' },
        { text: '*Two weeks later you open the front door, all the way, and walk down the stairs with a holdall. The rain has stopped. The bus is the 14.*' },
        { text: 'Day one. Day ninety. Day three hundred and sixty-five. You go to the meetings on Thursdays. You sit in the circle. You tell them about a town that never existed and the people in it, and somebody says: "It sounds like you loved them." You did.' },
        { text: 'You keep the photo in the frame. You never did take it out. You just stopped needing it to be true.' }] },
      collapse: { title: 'Last Orders', kind: 'A bad true ending', lines: [
        { text: 'The shaking stops being in your hands and starts being everywhere. The room tilts. The fridge hums. You are on the carpet, and the carpet is very soft, and very far away.' },
        { text: 'In the mirror over the basin, nothing moves.' },
        { text: 'It was four days before the neighbour downstairs noticed the television had been on the whole time.' }] },
      broke: { title: 'The House Always Wins', kind: 'A bad true ending', lines: [
        { text: 'The balance says £0.00. You refresh it. It says £0.00.' },
        { text: 'You sit in the dark with the laptop open until the screen goes to sleep, and the only light in the room is the fridge, and then the fridge is empty too.' },
        { text: 'The letters keep coming. Nobody opens them. In the mirror the thing with your face waits, patient as a debt.' }] },
    }[kind];
    await say(E.lines);
    const o = h('div.l3-end' + (kind === 'rehab' ? '.good' : ''),
      h('div.l3-end-box', h('small', E.kind), h('h2', E.title),
        h('p', kind === 'rehab' ? 'You cleared the debt, made the call, and walked out of the door.' : kind === 'collapse' ? 'The drink ran out before the money did.' : 'The money ran out before the drink did.'),
        h('p.muted', `True endings found: ${Object.keys(st.endings).length} of 3.`),
        h('div.l3-end-btns', h('button.l3-btn', { onclick: () => { o.remove(); restart(); } }, 'Wake up in the bedsit again'), h('button.l3-btn.ghost', { onclick: () => { o.remove(); unmount(); Router.go('title'); } }, 'Back to the title'))));
    document.body.append(o);
  }
  const collapse = () => ending('collapse');
  function restart() { const keep = S(); App.state.l3 = fresh({ endings: keep.endings }); App.save(); unmount(); Router.go('bedsit'); }
  function checkEnd() { const st = S(); if (st.ended) return; if (st.cash >= GOAL) return ending('rehab'); if (st.cash < MIN_BET) return ending('broke'); }

  /* ---------- the screen ---------- */
  function screen(main) {
    const st = S();
    document.body.classList.add('bedsit');
    back();
    const root = h('div.l3', h('div.l3-host'),
      h('div.l3-hud', h('div.l3-drink', h('span', '🍺'), h('div.l3-bar', h('i')), h('em')), h('div.l3-right', h('b.l3-cash'), h('div.l3-goal', h('i')), h('small', `owed ${money(GOAL)}`)), h('small.l3-cans')),
      h('div.l3-prompt'), h('div.l3-cross'), h('button.l3-use', { 'aria-label': 'Use' }, '✋'), h('div.l3-stick', h('i')),
      h('button.l3-menu', { onclick: menu, 'aria-label': 'Menu' }, '☰'), h('div.l3-hint', 'Drag to look. WASD, the arrows or the left of the screen to walk. E, Space, ✋ or a tap to use things.'),
      h('div.l3-vign'));
    main.append(root);
    if (typeof THREE === 'undefined') { root.append(h('p.l3-say', '3D is not available in this browser.')); return; }
    build(root.querySelector('.l3-host')); G.root = root; G.stickEl = root.querySelector('.l3-stick');
    bindInput(root); hud(); G.raf = requestAnimationFrame(frame);
    setTimeout(() => { const h2 = root.querySelector('.l3-hint'); if (h2) h2.classList.add('out'); }, 9000);
    if (st.ended) { setTimeout(() => ending(st.ended === 'rehab' ? 'rehab' : st.ended), 300); st.ended = null; return; }
    if (!st.flags.intro) { st.flags.intro = 1; App.save(); setTimeout(() => say([
      { text: '*The rain stops being rain. It\'s the hum of a fridge.*' },
      { text: 'You\'re on the end of a bed in a room above a bookmaker\'s. The laptop is open. It\'s always open. The light from it is blue and the light from the bulb is yellow and there isn\'t any other light.' },
      { text: 'There was no Meridian. No town. No case. You haven\'t been outside since the summer. You haven\'t had a job in three years, or a friend in longer. You owe five hundred thousand pounds, and you have eight hundred and fifty.' },
      { text: 'Your hands are shaking. There are three cans in the fridge.' }]), 600); }
    else setTimeout(checkEnd, 400);
  }
  async function menu() {
    const c = await choose('☰', [['save', '💾 Save'], ['gfx', `Graphics: ${App.state.settings.gfx === 'low' ? 'low (faster)' : 'high'}`], ['sound', `Sound: ${App.state.settings.sound !== false ? 'on' : 'off'}`], ['restart', '↺ Wake up in the bedsit again (start Level 3 over)'], ['title', 'Back to the title'], ['no', 'Close']]);
    if (c === 'save') { savePos(); App.save(); toast('Saved.'); }
    if (c === 'restart') restart();
    if (c === 'gfx') { App.state.settings.gfx = App.state.settings.gfx === 'low' ? 'high' : 'low'; savePos(); App.save(); unmount(); Router.go('bedsit'); }
    if (c === 'sound') { App.state.settings.sound = App.state.settings.sound === false; App.save(); }
    if (c === 'title') { savePos(); App.save(); unmount(); Router.go('title'); }
  }
  function savePos() { if (G) S().pos = { x: G.x, z: G.z, yaw: G.yaw }; }
  function unmount() {
    if (!G) return; savePos(); cancelAnimationFrame(G.raf); removeEventListener('keydown', G.kd); removeEventListener('keyup', G.ku); removeEventListener('resize', resize);
    try { G.renderer.dispose(); G.renderer.forceContextLoss && G.renderer.forceContextLoss(); } catch (_) { }
    G = null; document.body.classList.remove('bedsit'); document.querySelectorAll('.l3-say,.l3-laptop,.l3-toast').forEach(n => n.remove());
  }
  // the way in: the roof of the Meridian, a reflection in the black glass of the door
  async function begin() { if (!App.state.l3) App.state.l3 = fresh(); App.save(); Router.safeGo('bedsit'); } // safeGo: not from the middle of a hand // a room you've already woken in is as you left it (☰ starts it over)

  return { screen, unmount, begin, roundNeeds, back, checkEnd, ending, restart, GOAL, START, money, get state() { return S(); }, get G() { return G; }, A, openLaptop, CHANNELS };
})();
