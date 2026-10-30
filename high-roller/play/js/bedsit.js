/* Level 3: the bedsit. The true ending of the Meridian, if you look at your reflection on the roof.
   There was no Meridian, no town, no case. There's a bedsit over a bookmaker's, a man who hasn't been
   outside in months, a laptop, a fridge, and £500,000 of debt. Everything in the dreams came from
   this room: the people are off the television, the darts player is in your head, the casinos are
   on the laptop, and the thing that hunted you is in the mirror.
   - It's first person and fully 3D (three.js, js/vendor): walk with WASD, the arrows or the stick on
     the left of a phone screen; look by dragging; use things with E, Space, the ✋ button, or a tap.
   - If you never drank in either dream, the drink is still here (it always was), but the story says so: the
     dreams were your subconscious telling you to deal with it (the intro, the mirror, the helpline, two endings).
   - One bar is left: the drink. It runs down all the time, faster at the laptop. The fridge has a few
     cans and the laptop can order more. Let it reach empty and you collapse (a bad true ending).
   - The laptop has every game from the dreams, with your real money (£850 to start). Make £500,000
     and you can clear the debt and check into rehab (the good true ending). Lose it all and that's
     the other bad true ending.
   - Things in the room are the dreams' sources: the TV's channels (Dolores, Lou, Mori, Vinnie, a film
     called The Seventeenth Card), the dartboard and the friend who isn't there to throw against, the
     stock photo in the frame, the letters by the door, the fridge postcards, the radio. */
const L3 = (() => {
  const GOAL = 500000, MIN_BET = 1, START = 850, DRAIN = 100 / 420; // the drink, per second: about seven minutes from full
  // did you stay off the drink in both dreams (no drinks in the town, none when you woke in the city)? Then the dreams were
  // the part of you that knows, telling you to deal with it: you wake in the same room with the same problem, told a little differently
  const dryDreams = () => typeof App !== 'undefined' && App.counter('drinks') === 0 && App.counter('l2_drinks') === 0;
  const fresh = (keep = {}) => ({ dry: dryDreams(), v: 1, cash: START, drink: 72, cans: 3, pills: 12, calm: 0, bathOpen: 0, order: 0, radio: null, tv: 0, flags: {}, pos: null, atTable: false, endings: keep.endings || {}, lost: 0 });
  const S = () => { const s = App.state; if (!s.l3) s.l3 = fresh(); if (s.l3.dry == null) s.l3.dry = dryDreams(); return s.l3; };
  const dry = () => !!S().dry;
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
    wall: () => T(512, 512, (g, w, hh) => { // faded paper: small sprigs, a stripe, nicotine up by the ceiling, scuffs at the skirting, damp
      g.fillStyle = '#7a705a'; g.fillRect(0, 0, w, hh);
      for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,240,200,.035)'; g.fillRect(x, 0, 22, hh); }
      for (let y = 0; y < hh; y += 26) for (let x = (y / 26) % 2 * 16; x < w; x += 32) { g.fillStyle = 'rgba(110,80,50,.34)'; g.beginPath(); g.arc(x + 6, y + 6, 3, 0, 7); g.fill(); g.fillStyle = 'rgba(70,90,60,.24)'; g.fillRect(x + 5, y + 9, 2, 6); }
      const nic = g.createLinearGradient(0, 0, 0, hh); nic.addColorStop(0, 'rgba(90,60,15,.55)'); nic.addColorStop(.3, 'rgba(90,60,15,.12)'); nic.addColorStop(.85, 'rgba(0,0,0,0)'); nic.addColorStop(1, 'rgba(30,20,10,.35)'); g.fillStyle = nic; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 5; i++) { const cx = rnd() * w, cy = rnd() * hh * .4, r = g.createRadialGradient(cx, cy, 2, cx, cy, 30 + rnd() * 60); r.addColorStop(0, 'rgba(60,45,20,.3)'); r.addColorStop(1, 'rgba(60,45,20,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(20,15,10,.12)'; g.fillRect(rnd() * w, hh - 20 - rnd() * 40, 10 + rnd() * 30, 2); } }),
    carpet: () => T(256, 256, (g, w, hh) => { g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '90,70,50' : '30,22,16'},.35)`; g.fillRect(rnd() * w, rnd() * hh, 2, 2); } for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(25,18,10,.35)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * hh, 10 + rnd() * 25, 6 + rnd() * 14, rnd() * 3, 0, 7); g.fill(); } }, [4, 3]),
    ceiling: () => T(128, 128, (g, w, hh) => { g.fillStyle = '#b8b0a0'; g.fillRect(0, 0, w, hh); const r = g.createRadialGradient(80, 50, 4, 80, 50, 50); r.addColorStop(0, 'rgba(120,95,40,.45)'); r.addColorStop(1, 'rgba(120,95,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); }, [2, 2]),
    wood: () => T(128, 128, (g, w, hh) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 3) { g.fillStyle = `rgba(${rnd() < .5 ? '80,50,30' : '40,25,14'},.4)`; g.fillRect(0, y, w, 1 + rnd() * 2); } }),
    duvet: () => T(256, 256, (g, w, hh) => { g.fillStyle = '#5a6a7a'; g.fillRect(0, 0, w, hh); for (let i = 0; i < w; i += 32) { g.fillStyle = 'rgba(40,50,65,.35)'; g.fillRect(i, 0, 10, hh); g.fillRect(0, i, w, 10); g.fillStyle = 'rgba(200,210,220,.08)'; g.fillRect(i + 16, 0, 2, hh); } for (let i = 0; i < 3; i++) { const cx = rnd() * w, cy = rnd() * hh, r = g.createRadialGradient(cx, cy, 2, cx, cy, 20 + rnd() * 30); r.addColorStop(0, 'rgba(130,105,60,.4)'); r.addColorStop(1, 'rgba(130,105,60,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); } }),
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
    // the bathroom: cream tiles gone grey in the grout, lino in a worn check, damp paint with mould where the steam goes, a shower curtain
    tiles: () => T(256, 256, (g, w, hh) => { const n = 4, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 186 + rnd() * 16; g.fillStyle = `rgb(${v},${v - 6},${v - 22})`; g.fillRect(i * s, j * s, s, s); const r = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s); r.addColorStop(0, 'rgba(255,255,255,.18)'); r.addColorStop(1, 'rgba(0,0,0,.06)'); g.fillStyle = r; g.fillRect(i * s, j * s, s, s); }
      g.fillStyle = '#5a5446'; for (let k = 0; k <= n; k++) { g.fillRect(k * s - 2, 0, 4, hh); g.fillRect(0, k * s - 2, w, 4); }
      for (let i = 0; i < 6; i++) { const cx = rnd() * w, cy = rnd() * hh, r = g.createRadialGradient(cx, cy, 2, cx, cy, 14 + rnd() * 30); r.addColorStop(0, 'rgba(110,90,50,.22)'); r.addColorStop(1, 'rgba(110,90,50,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); } // splashes, dried
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(40,50,30,.25)'; g.fillRect(Math.floor(rnd() * n) * s - 2, rnd() * hh, 4, 8 + rnd() * 30); }
      g.strokeStyle = 'rgba(60,55,45,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s * 1.2, s * 2.1); g.lineTo(s * 1.5, s * 2.5); g.lineTo(s * 1.45, s * 2.9); g.stroke(); }),
    bathPaint: () => T(256, 256, (g, w, hh) => { g.fillStyle = '#8f9a88'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '255,255,240' : '40,50,40'},.05)`; g.fillRect(rnd() * w, rnd() * hh, 3, 3); }
      for (let i = 0; i < 170; i++) { const x = rnd() < .5 ? rnd() * 50 : w - rnd() * 50, y = rnd() * hh * .4; g.fillStyle = `rgba(30,35,20,${.1 + rnd() * .25})`; g.beginPath(); g.arc(x, y, .6 + rnd() * 1.8, 0, 7); g.fill(); } // mould, up in the corners
      const r = g.createLinearGradient(0, 0, 0, hh); r.addColorStop(0, 'rgba(60,70,40,.35)'); r.addColorStop(.4, 'rgba(60,70,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); }),
    lino: () => T(256, 256, (g, w, hh) => { const s = w / 8; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#8a8476' : '#c8c0aa'; g.fillRect(i * s, j * s, s, s); }
      for (let i = 0; i < 2600; i++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(rnd() * w, rnd() * hh, 2, 2); }
      for (let i = 0; i < 4; i++) { const cx = rnd() * w, cy = rnd() * hh, r = g.createRadialGradient(cx, cy, 2, cx, cy, 20 + rnd() * 40); r.addColorStop(0, 'rgba(110,85,40,.4)'); r.addColorStop(1, 'rgba(110,85,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); } }),
    bathCeil: () => T(128, 128, (g, w, hh) => { g.fillStyle = '#c8c6b8'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 90; i++) { const x = rnd() < .6 ? w - rnd() * 40 : rnd() * w, y = rnd() * 50; g.fillStyle = `rgba(30,35,20,${.1 + rnd() * .25})`; g.beginPath(); g.arc(x, y, .5 + rnd() * 1.4, 0, 7); g.fill(); } }),
    curtain: () => T(128, 256, (g, w, hh) => { g.fillStyle = 'rgba(225,232,236,.92)'; g.fillRect(0, 0, w, hh); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(120,170,200,.35)'; g.fillRect(x, 0, 6, hh); } const r = g.createLinearGradient(0, hh * .6, 0, hh); r.addColorStop(0, 'rgba(30,35,20,0)'); r.addColorStop(1, 'rgba(30,35,20,.85)'); g.fillStyle = r; g.fillRect(0, 0, w, hh); for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(20,25,10,${.2 + rnd() * .5})`; g.beginPath(); g.arc(rnd() * w, hh * .62 + rnd() * hh * .38, .8 + rnd() * 2.4, 0, 7); g.fill(); } }),
    splash: () => T(256, 64, (g, w, hh) => { const s = 32; for (let i = 0; i < w / s; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 3 ? '#cfc6a4' : '#b8a878'; g.fillRect(i * s, j * s, s, s); } g.fillStyle = '#5a5444'; for (let i = 0; i <= w / s; i++) g.fillRect(i * s - 1, 0, 2, hh); g.fillRect(0, 31, w, 2); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,80,30,.25)'; g.beginPath(); g.arc(rnd() * w, rnd() * hh, 1 + rnd() * 3, 0, 7); g.fill(); } }),
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
  // The face from the Meridian's jump scare (L2Demon.paintFace: your own face, with what the drink
  // has done to it) wrapped round a long, narrow 3D head; yellowed eyes in black sockets, a jaw that
  // drops if you stare too long. Below it, you: starved thin, in a grey vest gone yellow and an open
  // dressing gown, pyjama bottoms, slippers, a can in your hand. Only the mirror sees it (layer 1).
  const mixHex = (a, b, k) => { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  function youTextures(L) {
    const sk = mixHex(mixHex(L.skin || '#f0c19a', '#7d8a76', .55), '#4b5048', .1);
    // the face: the scare's painting, cropped to the head and laid on mottled skin so nothing shows through
    const src = typeof L2Demon !== 'undefined' && L2Demon.paintFace ? L2Demon.paintFace(L) : null;
    const fc = document.createElement('canvas'); fc.width = 400; fc.height = 660; const g = fc.getContext('2d');
    g.fillStyle = sk; g.fillRect(0, 0, 400, 660);
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(${40 + rnd() * 40},${25 + rnd() * 25},${30 + rnd() * 25},.18)`; g.beginPath(); g.arc(rnd() * 400, rnd() * 660, 6 + rnd() * 30, 0, 7); g.fill(); }
    if (src) g.drawImage(src, 56, 40, 400, 660, 0, 0, 400, 660);
    const face = new THREE.CanvasTexture(fc); face.encoding = THREE.sRGBEncoding;
    // the back of the head: thin, greasy, greyed hair over the scalp
    const hc = document.createElement('canvas'); hc.width = hc.height = 256; const h2 = hc.getContext('2d'), hair = mixHex(L.hair || '#3a2a1e', '#8a8a8a', .45);
    h2.fillStyle = mixHex(sk, '#000000', .35); h2.fillRect(0, 0, 256, 256);
    if (L.style !== 'bald') { h2.strokeStyle = hair; h2.globalAlpha = .75; for (let i = 0; i < 520; i++) { const x = rnd() * 256, y = rnd() * 140; h2.lineWidth = .6 + rnd() * 1.4; h2.beginPath(); h2.moveTo(x, y); h2.quadraticCurveTo(x + (rnd() - .5) * 30, y + 50, x + (rnd() - .5) * 20, y + 70 + rnd() * 60); h2.stroke(); } }
    const back = new THREE.CanvasTexture(hc); back.encoding = THREE.sRGBEncoding;
    // the eye: yellowed, bloodshot, the pupil pinned (the iris small, facing +z once the sphere turns)
    const ec = document.createElement('canvas'); ec.width = 256; ec.height = 128; const e = ec.getContext('2d');
    const eg = e.createRadialGradient(128, 64, 4, 128, 64, 120); eg.addColorStop(0, '#e6dc9a'); eg.addColorStop(.5, '#c8b45a'); eg.addColorStop(1, '#6a2a12'); e.fillStyle = eg; e.fillRect(0, 0, 256, 128);
    e.strokeStyle = 'rgba(170,10,10,.75)'; e.lineWidth = 1; for (let i = 0; i < 40; i++) { let x = rnd() * 256, y = rnd() * 128; e.beginPath(); e.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (128 - x) * .15 + (rnd() - .5) * 8; y += (64 - y) * .15 + (rnd() - .5) * 8; e.lineTo(x, y); } e.stroke(); }
    e.fillStyle = '#4a3a10'; e.beginPath(); e.arc(128, 64, 9, 0, 7); e.fill(); e.fillStyle = '#000'; e.beginPath(); e.arc(128, 64, 3, 0, 7); e.fill();
    const eye = new THREE.CanvasTexture(ec); eye.encoding = THREE.sRGBEncoding;
    // the vest, gone yellow at the neck and under the arms; the gown's faded tartan; striped pyjamas
    const cloth = (w, hh, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    const vest = cloth(128, 128, (c, w, hh) => { c.fillStyle = '#8a8472'; c.fillRect(0, 0, w, hh); for (let i = 0; i < 9; i++) { const r = c.createRadialGradient(rnd() * w, rnd() * hh, 2, rnd() * w, rnd() * hh, 10 + rnd() * 22); r.addColorStop(0, 'rgba(120,95,40,.45)'); r.addColorStop(1, 'rgba(120,95,40,0)'); c.fillStyle = r; c.fillRect(0, 0, w, hh); } for (let y = 0; y < hh; y += 3) { c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(0, y, w, 1); } });
    const gown = cloth(128, 128, (c, w, hh) => { c.fillStyle = '#4a2a2a'; c.fillRect(0, 0, w, hh); for (let i = 0; i < w; i += 32) { c.fillStyle = 'rgba(30,40,30,.45)'; c.fillRect(i, 0, 12, hh); c.fillRect(0, i, w, 12); c.fillStyle = 'rgba(160,130,60,.25)'; c.fillRect(i + 20, 0, 2, hh); c.fillRect(0, i + 20, w, 2); } for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(rnd() * w, rnd() * hh, 6 + rnd() * 12, 0, 7); c.fill(); } });
    gown.repeat.set(3, 3);
    const pj = cloth(64, 64, (c, w, hh) => { c.fillStyle = '#3a4656'; c.fillRect(0, 0, w, hh); for (let i = 0; i < w; i += 16) { c.fillStyle = '#5a6a7a'; c.fillRect(i, 0, 4, hh); } });
    pj.repeat.set(4, 2);
    return { sk, face, back, eye, vest, gown, pj };
  }
  // a head profile, radius against height from the chin up, in canvas pixels of the painted face (y, half-width)
  const PROFILE = [[700, 4], [690, 60], [650, 98], [590, 124], [530, 140], [470, 150], [400, 168], [330, 152], [270, 168], [200, 182], [130, 168], [80, 128], [52, 80], [40, 8]];
  const HS = .27 / 660, EYE_Y = 296, MOUTH_Y = 461; // metres per pixel; the eyes' row and the mouth's in the painting
  function profile(y0, y1, n = 30) { // resampled evenly in height, so the texture's v runs with the height
    const at = y => { for (let i = 0; i < PROFILE.length - 1; i++) { const [ya, ra] = PROFILE[i], [yb, rb] = PROFILE[i + 1]; if (y <= ya && y >= yb) return ra + (rb - ra) * (ya - y) / (ya - yb); } return 4; };
    return Array.from({ length: n + 1 }, (_, i) => { const y = y0 - (y0 - y1) * i / n; return new THREE.Vector2(at(y) * HS, (700 - y) * HS); });
  }
  function you() {
    const L = typeof Looks !== 'undefined' ? Looks.get() : { skin: '#f0c19a', hair: '#3a2a1e', style: 'short' }, T = youTextures(L);
    const grp = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(); grp.add(body); body.add(head);
    const skin = new THREE.MeshStandardMaterial({ color: mixHex(T.sk, '#000000', .2), roughness: .85 }), skinDark = new THREE.MeshStandardMaterial({ color: mixHex(T.sk, '#000000', .45), roughness: .9 });
    const FACE_PHI = Math.PI * 1.1, EH = (700 - EYE_Y) * HS, MH = (700 - MOUTH_Y) * HS, ZS = 1.12;
    const lathe = (y0, y1, phiStart, phiLen, mat) => { const m = new THREE.Mesh(new THREE.LatheGeometry(profile(y0, y1), 40, phiStart, phiLen), mat); m.scale.z = ZS; return m; };
    // the head: pivot at your eyes (the camera), so it turns and nods with you
    const skull = new THREE.Group(); skull.position.set(0, -EH, -.045); head.add(skull);
    const faceTop = T.face.clone(); faceTop.needsUpdate = true; faceTop.repeat.set(1, 1 - MH / (660 * HS)); faceTop.offset.set(0, MH / (660 * HS));
    const faceJaw = T.face.clone(); faceJaw.needsUpdate = true; faceJaw.repeat.set(1, MH / (660 * HS) - .002); faceJaw.offset.set(0, 0);
    // the texture's u runs left to right across the front: lathe phi -FACE_PHI/2..+FACE_PHI/2 faces +z
    const faceM = (map) => new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .18, roughness: .65, side: THREE.DoubleSide }); // a little of its own light, so the mirror's gloom doesn't swallow it
    skull.add(lathe(MOUTH_Y, 40, -FACE_PHI / 2, FACE_PHI, faceM(faceTop)));
    skull.add(lathe(700, 40, FACE_PHI / 2, Math.PI * 2 - FACE_PHI, new THREE.MeshStandardMaterial({ map: T.back, roughness: .8, side: THREE.DoubleSide })));
    const jaw = new THREE.Group(); jaw.position.set(0, MH, -.02); skull.add(jaw);
    const jm = lathe(700, MOUTH_Y, -FACE_PHI / 2, FACE_PHI, faceM(faceJaw)); jm.position.set(0, -MH, .02); jaw.add(jm);
    // the mouth's insides: a dark cap where the head's shell meets the jaw, and one on the jaw, so opening it shows only black
    const mr = 150 * HS, cap = (y, up) => { const c = new THREE.Mesh(new THREE.CircleGeometry(mr * 1.02, 24), new THREE.MeshBasicMaterial({ color: 0x080203, side: THREE.DoubleSide })); c.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; c.scale.y = ZS; c.position.y = y; return c; };
    skull.add(cap(MH, false)); jaw.add(cap(0, true));
    const maw = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10), new THREE.MeshBasicMaterial({ color: 0x050102 })); maw.scale.set(1, .7, .75); maw.position.set(0, MH - .012, .012); skull.add(maw); // the inside of the mouth, for when it opens
    // the eyes, sunk in the sockets, catching what light there is
    const eyeM = new THREE.MeshStandardMaterial({ map: T.eye, roughness: .25, emissive: 0x2a1e06, emissiveIntensity: .7 });
    const er = PROFILE.reduce((b, [y, r]) => Math.abs(y - EYE_Y) < Math.abs(b[0] - EYE_Y) ? [y, r] : b)[1] * HS;
    for (const k of [-1, 1]) { const a = k * .18 * FACE_PHI, eb = new THREE.Mesh(new THREE.SphereGeometry(.0125, 16, 12), eyeM); eb.rotation.y = -Math.PI / 2 + a; eb.position.set(Math.sin(a) * (er - .012), EH, Math.cos(a) * (er - .012) * ZS); skull.add(eb); }
    // a nose: just the bone and the tip, the painting does the rest
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.009, 10, 8), skinDark); nose.scale.set(.75, 2.4, 1); nose.position.set(0, (700 - 390) * HS, 168 * HS * ZS - .006); skull.add(nose);
    for (const k of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(.02, 10, 8), skinDark); ear.scale.set(.25, 1.2, .7); ear.position.set(k * 166 * HS, (700 - 320) * HS, -.012); skull.add(ear); }
    // hair: what's left of it, greasy and grey, in strands from the crown down the back and over the ears
    if (L.style !== 'bald') {
      const rAt = y => { for (let i = 0; i < PROFILE.length - 1; i++) { const [ya, ra] = PROFILE[i], [yb, rb] = PROFILE[i + 1]; if (y <= ya && y >= yb) return ra + (rb - ra) * (ya - y) / (ya - yb); } return 8; };
      const hairM = new THREE.MeshStandardMaterial({ color: mixHex(L.hair || '#3a2a1e', '#8a8a8a', .45), roughness: .5, metalness: .15 });
      for (let i = 0; i < 54; i++) {
        const a = FACE_PHI * .42 + (i / 54) * (Math.PI * 2 - FACE_PHI * .84) + (rnd() - .5) * .1, y0 = 55 + rnd() * 40, y1 = Math.abs(Math.sin(a)) > .8 ? 300 + rnd() * 90 : 360 + rnd() * 160;
        const pts = []; for (let k = 0; k <= 5; k++) { const y = y0 + (y1 - y0) * k / 5, r = Math.max(rAt(Math.min(y, 560)), 110) * HS + .004 + k * .0015, aa = a + Math.sin(k + i) * .03; pts.push(new THREE.Vector3(Math.sin(aa) * r, (700 - y) * HS, Math.cos(aa) * r * ZS)); }
        skull.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, .0022 + rnd() * .0012, 3), hairM));
      }
    }
    // neck: thin, the cords standing out
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.034, .04, .13, 12), skinDark); neck.position.set(0, -EH - .03, -.05); head.add(neck);
    for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.007, .009, .15, 6), skinDark); c.position.set(k * .028, -EH - .05, -.02); c.rotation.set(-.35, 0, k * .35); head.add(c); }
    // the body hangs from the shoulders, below your eyes: shoulders at 1.38, hips at .92
    const P = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
    const limb = (a, b, r0, r1, mat) => { const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, d.length(), 10), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); body.add(m); return m; };
    const V = (x, y, z) => new THREE.Vector3(x, y - 1.6, z - .05);
    const vestM = new THREE.MeshStandardMaterial({ map: T.vest, roughness: .95 }), gownM = new THREE.MeshStandardMaterial({ map: T.gown, roughness: 1, side: THREE.DoubleSide }), pjM = new THREE.MeshStandardMaterial({ map: T.pj, roughness: .95 });
    const chest = P(new THREE.CylinderGeometry(.13, .125, .5, 16, 1, true), vestM, 0, 1.16 - 1.6, -.06); chest.scale.z = .62; // ribs under a vest (no lid: the bare chest closes it)
    const sternum = P(new THREE.SphereGeometry(.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin, 0, 1.36 - 1.6, -.06); sternum.scale.set(1.05, .5, .66); // the bare top of the chest
    for (const k of [-1, 1]) { limb(V(k * .015, 1.4, .02), V(k * .15, 1.41, -.02), .009, .007, skin); P(new THREE.SphereGeometry(.055, 12, 10), gownM, k * .17, 1.37 - 1.6, -.07).scale.set(1.35, .75, 1.15); } // collarbones, shoulders (the gown slopes off them)
    // the dressing gown: hanging open at the front, belt trailing
    const robe = P(new THREE.CylinderGeometry(.2, .26, 1.0, 20, 1, true, Math.PI * .22, Math.PI * 1.56), gownM, 0, .88 - 1.6, -.07); robe.scale.z = .7; // open at the front (theta 0 faces +z)
    for (const k of [-1, 1]) { const lap = P(new THREE.BoxGeometry(.06, .7, .012), gownM, k * .09, 1.06 - 1.6, .07); lap.rotation.set(-.08, k * -.3, k * .06); } // the lapels
    limb(V(-.12, .95, .05), V(-.1, .55, .1), .012, .012, gownM); limb(V(.13, .93, .04), V(.15, .62, .07), .012, .012, gownM); // the belt, both ends hanging
    { const collar = new THREE.CatmullRomCurve3([V(-.1, .9, .1), V(-.1, 1.12, .1), V(-.085, 1.33, .06), V(-.06, 1.43, -.03), V(0, 1.45, -.1), V(.06, 1.43, -.03), V(.085, 1.33, .06), V(.1, 1.12, .1), V(.1, .9, .1)]);
      const cm = new THREE.Mesh(new THREE.TubeGeometry(collar, 40, .026, 8), new THREE.MeshStandardMaterial({ map: T.gown, color: 0x9a8a8a, roughness: 1 })); cm.scale.z = 1; body.add(cm); } // the shawl collar
    P(new THREE.CylinderGeometry(.13, .12, .14, 14), pjM, 0, .9 - 1.6, -.06).scale.z = .7; // hips
    // arms: sleeves to the elbow, then bone and skin; the right hand holds a can
    for (const k of [-1, 1]) {
      const sh = V(k * .2, 1.36, -.02), el = V(k * .24, 1.07, .0), wr = V(k * .2, .83, .07);
      limb(sh, el, .052, .046, gownM); limb(el, wr, .024, .019, skin); P(new THREE.SphereGeometry(.023, 8, 6), skin, el.x, el.y, el.z);
      const hand = P(softGeo(.03, .07, .042, .012), skin, wr.x, wr.y - .04, wr.z); hand.rotation.z = k * .1; limb(V(k * .2, .81, .09), V(k * .19, .77, .11), .007, .006, skin); // a palm, a thumb
      for (let f = 0; f < 4; f++) limb(V(k * (.19 + f * .009), .79, .065 + (f - 1.5) * .008), V(k * (.19 + f * .009), .72 + (f % 2) * .01, .07 + (f - 1.5) * .008), .005, .004, skin);
    }
    const can = P(new THREE.CylinderGeometry(.033, .033, .12, 14), new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: .7, roughness: .3 }), .215, .77 - 1.6, .1); can.rotation.z = -.15;
    // legs in pyjama bottoms; slippers trodden flat at the back
    for (const k of [-1, 1]) { limb(V(k * .07, .9, -.02), V(k * .08, .48, .0), .055, .045, pjM); limb(V(k * .08, .48, .0), V(k * .08, .07, -.02), .045, .038, pjM); const sl = P(new THREE.BoxGeometry(.09, .05, .27), new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1 }), k * .08, .025 - 1.6, .02); sl.scale.y = .9; }
    grp.traverse(o => { o.layers.set(1); o.castShadow = false; }); // only the mirror sees it
    grp.userData = { head, jaw, body, jawY: MH };
    return grp;
  }

  /* ---------- building the room ---------- */
  // the room runs x 0..6 (left to right), z 0..4.5 (back wall to the door), 2.5 high
  const RW = 6, RD = 4.5, RH = 2.5;
  // the bathroom, through a door in the right-hand wall (a wall .1 thick): x 6.1..8.5, z 1.9..4.5. The door is in the wall at
  // z 2.95..3.8 and the mirror is on the far wall straight across from it, so the first time it opens, someone is standing there
  const BX0 = RW + .1, BX1 = 8.5, BZ0 = 1.9, BZ1 = RD, DZ0 = 2.95, DZ1 = 3.8, DZC = (DZ0 + DZ1) / 2, MZ = DZC, MX = BX1 - .36, DOOR_OPEN = -1.75;
  // a box with soft edges (a mattress, a cushion, a worktop): a rounded rectangle extruded, bevelled
  function softGeo(w, h, d, r = .03) {
    r = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001); const x = w / 2 - r, y = h / 2 - r, c = Math.min(r, x, y) * .5, s = new THREE.Shape();
    s.moveTo(-x + c, -y); s.lineTo(x - c, -y); s.quadraticCurveTo(x, -y, x, -y + c); s.lineTo(x, y - c); s.quadraticCurveTo(x, y, x - c, y); s.lineTo(-x + c, y); s.quadraticCurveTo(-x, y, -x, y - c); s.lineTo(-x, -y + c); s.quadraticCurveTo(-x, -y, -x + c, -y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 4 }); g.center(); return g;
  }
  // cloth: a sheet laid over a w x d top, hanging down by `hang`, rumpled
  function clothGeo(w, d, hang, seedv = 1, rumple = .03) {
    const W2 = w / 2 + hang, D2 = d / 2 + hang, g = new THREE.PlaneGeometry(W2 * 2, D2 * 2, 36, 36); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i); const ex = Math.max(0, Math.abs(x) - w / 2), ez = Math.max(0, Math.abs(z) - d / 2), e = Math.max(ex, ez);
      const n = Math.sin(x * 9 + seedv) * Math.cos(z * 7 + seedv * 2) * .5 + Math.sin(x * 21 + z * 17 + seedv) * .25;
      if (ex > 0) x = Math.sign(x) * (w / 2 + .012 + n * .01); if (ez > 0) z = Math.sign(z) * (d / 2 + .012 + n * .01);
      p.setXYZ(i, x, e > 0 ? -e + n * .012 : n * rumple + rumple, z);
    }
    g.computeVertexNormals(); return g;
  }
  // a soft dark patch on the floor under things, so they sit on it
  let blobTex = null;
  const blobT = () => blobTex || (blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 4, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.85)'); r.addColorStop(.6, 'rgba(0,0,0,.4)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })());
  function build(host) {
    seed = 7;
    const low = App.state.settings.gfx === 'low'; // the ☰ menu: a lighter room for slow phones
    const renderer = new THREE.WebGLRenderer({ antialias: !low }); renderer.setPixelRatio(low ? .6 : Math.min(1.5, devicePixelRatio || 1)); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    if (!low) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; } // the room doesn't move: its shadows are drawn once
    host.append(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030302); scene.fog = new THREE.Fog(0x050403, 6, 15);
    const camera = new THREE.PerspectiveCamera(70, 1, .05, 40);
    G = { renderer, scene, camera, uses: [], solids: [], busy: 0, t0: performance.now(), yaw: .35, pitch: -.12, x: 3.4, z: 2.3, keys: new Set(), stick: null, look: null, tvTex: null, lapTex: null, stare: 0 };
    const st = S(); if (st.pos) { G.x = st.pos.x; G.z = st.pos.z; G.yaw = st.pos.yaw; }
    const M = o => new THREE.MeshStandardMaterial({ roughness: .85, metalness: 0, ...o });
    const add = (geo, mat, x, y, z, ry = 0, par = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = !low; par.add(m); return m; };
    const box = (w, hh, d, mat, x, y, z, ry) => add(new THREE.BoxGeometry(w, hh, d), mat, x, y + hh / 2, z, ry);
    const soft = (w, hh, d, mat, x, y, z, ry, r) => add(softGeo(w, hh, d, r), mat, x, y + hh / 2, z, ry);
    const cyl = (r0, r1, hh, mat, x, y, z, seg = 16) => add(new THREE.CylinderGeometry(r0, r1, hh, seg), mat, x, y + hh / 2, z);
    const solid = (x0, z0, x1, z1) => G.solids.push([x0, z0, x1, z1]);
    const use = (mesh, label, fn) => { mesh.userData.use = { label, fn }; G.uses.push(mesh); return mesh; };
    const hit = (w, hh, d, x, y, z, label, fn) => { const m = add(new THREE.BoxGeometry(w, hh, d), new THREE.MeshBasicMaterial({ visible: false }), x, y + hh / 2, z); m.castShadow = m.receiveShadow = false; return use(m, label, fn); }; // an invisible handle to use something by
    const blob = (x, z, w, d, a = .55) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobT(), transparent: true, opacity: a, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, .004, z); scene.add(m); };
    const can = (x, y, z, col, lying, crushed) => { const c = add(new THREE.CylinderGeometry(.033, .033, crushed ? .06 : .12, 12), M({ color: col, metalness: .7, roughness: .3 }), x, y + (lying ? .033 : crushed ? .03 : .06), z); if (lying) { c.rotation.z = Math.PI / 2; c.rotation.y = rnd() * 3; } if (crushed) c.scale.x = .6; return c; };
    const CANS = [0xc0392b, 0x2a62c9, 0xd8d8d8, 0x2a7a3a];

    // --- walls, floor, ceiling: nicotine-yellow paper, a worn carpet, a stained ceiling
    const wood = TEX.wood(), steel = M({ color: 0xa8b0b8, metalness: .7, roughness: .3 }), white = M({ color: 0xe4e0d4, roughness: .5 }), black = M({ color: 0x141416, roughness: .4 }), chrome = M({ color: 0xd0d4d8, metalness: .9, roughness: .2 });
    // a wall: a panel of paper (or tiles, or paint) from y0 up; one painted canvas, cloned per panel so the pattern keeps its scale
    const wallTex = TEX.wall();
    const wall = (w, hh, x, y0, z, ry, tex = wallTex, perM = 1.5, cast = false) => { const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / perM, tex === wallTex ? hh / RH : hh / perM); if (tex === wallTex) t.offset.set(0, y0 / RH); const m = add(new THREE.PlaneGeometry(w, hh), M({ map: t, roughness: tex === wallTex ? .95 : .4 }), x, y0 + hh / 2, z, ry); m.castShadow = cast; return m; };
    for (const [w, x, z, ry] of [[RW, RW / 2, 0, 0], [RW, RW / 2, RD, Math.PI], [RD, 0, RD / 2, Math.PI / 2]]) wall(w, RH, x, 0, z, ry);
    wall(DZ0, RH, RW, 0, DZ0 / 2, -Math.PI / 2); wall(RD - DZ1, RH, RW, 0, (DZ1 + RD) / 2, -Math.PI / 2); wall(DZ1 - DZ0, RH - 2.04, RW, 2.04, DZC, -Math.PI / 2); // the right-hand wall, round the bathroom door
    const floor = add(new THREE.PlaneGeometry(RW, RD), M({ map: TEX.carpet(), roughness: 1 }), RW / 2, 0, RD / 2); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    const ceil = add(new THREE.PlaneGeometry(RW, RD), M({ map: TEX.ceiling(), roughness: 1 }), RW / 2, RH, RD / 2); ceil.rotation.x = Math.PI / 2; ceil.castShadow = false;
    const trimM = M({ color: 0xd8d0bc, roughness: .5 });
    for (const [x, z, w, d] of [[RW / 2, .015, RW, .03], [RW / 2, RD - .015, RW, .03], [.015, RD / 2, .03, RD], [RW - .015, DZ0 / 2, .03, DZ0], [RW - .015, (DZ1 + RD) / 2, .03, RD - DZ1]]) box(w, .12, d, trimM, x, 0, z); // skirting
    for (const [x, z, w, d] of [[RW / 2, .035, RW, .07], [RW / 2, RD - .035, RW, .07], [.035, RD / 2, .07, RD], [RW - .035, RD / 2, .07, RD]]) { const cv = box(w, .07, d, trimM, x, RH - .07, z); cv.castShadow = false; } // the coving, gone yellow with the rest
    for (const [x, z, w, d] of [[RW / 2, .01, RW, .02], [.01, RD / 2, .02, RD]]) box(w, .025, d, M({ map: wood, color: 0x8a6a4a }), x, 1.92, z); // a picture rail, with nothing hung from it
    for (const [x, z, ry] of [[1.95, .01, 0], [4.0, RD - .01, Math.PI], [.01, 2.2, Math.PI / 2]]) { box(.08, .12, .012, white, x, .3, z, ry); box(.02, .03, .015, black, x - .015, .35, z, ry); } // plug sockets
    box(.08, .08, .012, white, 4.42, 1.25, RD - .01); // the light switch by the door
    // the light: a bare bulb on a flex, a ceiling rose, and a smoke alarm with its battery out
    scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x1a1410, .28));
    const bulb = new THREE.PointLight(0xffd59a, 1.25, 10, 2); bulb.position.set(3, 2.12, 2.2); scene.add(bulb); G.bulb = bulb;
    if (!low) { bulb.castShadow = true; bulb.shadow.mapSize.set(1024, 1024); bulb.shadow.bias = -.004; bulb.shadow.radius = 3; bulb.shadow.camera.near = .1; bulb.shadow.camera.far = 9; }
    add(new THREE.SphereGeometry(.045, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), 3, 2.1, 2.2).castShadow = false;
    cyl(.018, .018, .05, chrome, 3, 2.14, 2.2).castShadow = false; cyl(.004, .004, .3, black, 3, 2.19, 2.2).castShadow = false; cyl(.05, .05, .02, white, 3, 2.48, 2.2);
    cyl(.06, .06, .03, white, 4.6, 2.47, 3.4); add(new THREE.BoxGeometry(.02, .025, .008), M({ color: 0x8a3a1a }), 4.6, 2.43, 3.45); // the smoke alarm, open, its battery hanging

    // --- the front door: painted panels, a chain, a spyhole, the letters on the mat
    const doorM = M({ color: 0xb8aa8a, roughness: .55 });
    const door = box(.88, 2.04, .05, doorM, 5.05, 0, RD - .03);
    for (const y of [.25, 1.15]) for (const x of [4.85, 5.25]) soft(.3, .75, .02, doorM, x, y, RD - .06, 0, .008); // the panels
    for (const [w, hh, x, y] of [[.07, 2.12, 4.575, 0], [.07, 2.12, 5.525, 0], [1.02, .07, 5.05, 2.05]]) box(w, hh, .06, M({ color: 0xe0d8c8, roughness: .5 }), x, y, RD - .03);
    box(.12, .02, .04, chrome, 4.72, 1.0, RD - .08); box(.03, .06, .02, chrome, 4.67, .97, RD - .07); // the lever handle
    box(.25, .05, .015, chrome, 5.05, .85, RD - .065); // the letterbox
    add(new THREE.CylinderGeometry(.01, .01, .02, 10), black, 5.05, 1.55, RD - .065).rotation.x = Math.PI / 2; // spyhole
    box(.8, .012, .5, M({ color: 0x5a4a2a, roughness: 1 }), 5.05, 0, RD - .35); // the doormat
    const lt = add(new THREE.PlaneGeometry(1.0, .5), new THREE.MeshStandardMaterial({ map: TEX.letters(), transparent: true, roughness: 1 }), 5.0, .016, RD - .4); lt.rotation.x = -Math.PI / 2; lt.castShadow = false;
    use(door, 'The front door', () => A.door()); use(lt, 'The letters by the door', () => A.letters());
    for (const [y, c, x, hood] of [[1.74, 0x2a2a30, 3.82, 0], [1.72, 0x2e3442, 4.0, 1]]) { // the coats on the hook nobody wears: hung by their loops
      const cM = M({ color: c, roughness: 1, side: THREE.DoubleSide }), prof = [[.19, 0], [.185, .25], [.165, .5], [.17, .66], [.16, .74], [.1, .8], [.04, .83], [.015, .85]].map(([r, h2]) => new THREE.Vector2(r, h2));
      const body = add(new THREE.LatheGeometry(prof, 18), cM, x, y - .86, RD - .12); body.scale.z = .32;
      for (const k of [-1, 1]) { const sl = add(new THREE.CylinderGeometry(.04, .05, .55, 10), cM, x + k * .15, y - .42, RD - .1); sl.rotation.z = k * .06; }
      for (let b = 0; b < 4; b++) add(new THREE.SphereGeometry(.009, 6, 4), M({ color: 0x1a1a1a, roughness: .4 }), x, y - .3 - b * .14, RD - .12 - .06);
      if (hood) { const hd = add(new THREE.SphereGeometry(.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cM, x, y - .14, RD - .07); hd.rotation.x = Math.PI * .55; hd.scale.set(1, .9, .6); }
      add(new THREE.TorusGeometry(.018, .004, 4, 10), cM, x, y - .005, RD - .05);
    }
    box(.3, .03, .04, M({ map: wood }), 3.91, 1.72, RD - .03);

    bathroom();

    // --- the kitchenette: cupboards, a worktop, a steel sink, two rings, a kettle; the fridge with the microwave on top
    const unitM = M({ color: 0x9a8a6a, roughness: .7 }), topM = M({ color: 0x5a5248, roughness: .5 });
    box(.58, .1, 1.66, M({ color: 0x2a2420 }), RW - .3, 0, .85); // plinth
    for (let i = 0; i < 3; i++) { const z = .3 + i * .55; soft(.03, .74, .53, unitM, RW - .6, .12, z, 0, .01); box(.02, .14, .02, chrome, RW - .62, .55, z + (i === 1 ? .2 : -.2)); }
    box(.56, .76, 1.62, M({ color: 0x6a5c44 }), RW - .3, .12, .85);
    soft(.64, .04, 1.68, topM, RW - .31, .88, .85, 0, .012); solid(RW - .64, 0, RW, 1.7);
    box(.44, .012, .48, steel, RW - .3, .918, .5); const bowlS = add(new THREE.PlaneGeometry(.36, .4), M({ color: 0x30343a, metalness: .6, roughness: .35 }), RW - .3, .932, .5); bowlS.rotation.x = -Math.PI / 2; bowlS.castShadow = false; // the sink, set in the worktop
    cyl(.012, .012, .22, chrome, RW - .08, .92, .5); box(.15, .015, .015, chrome, RW - .15, 1.12, .5); // the tap
    for (let i = 0; i < 4; i++) { const pl = cyl(.1, .09, .012, M({ color: 0xe8e4da, roughness: .3 }), RW - .3, .934 + i * .014, .48 + i * .01); pl.castShadow = false; } // the plates, waiting
    for (const z of [1.08, 1.4]) { cyl(.1, .1, .012, black, RW - .3, .92, z, 24); add(new THREE.TorusGeometry(.065, .006, 6, 24), M({ color: 0x2a2a2a }), RW - .3, .935, z).rotation.x = Math.PI / 2; }
    cyl(.07, .08, .2, M({ color: 0xd8d4cc, roughness: .3 }), RW - .45, .92, .9); box(.08, .04, .02, black, RW - .45, 1.08, .97); // the kettle
    // what's left of last night along the back of the worktop
    [[RW - .14, .15, 0], [RW - .2, .22, 1], [RW - .12, .3, 2], [RW - .5, 1.25, 0], [RW - .14, 1.58, 3], [RW - .22, 1.6, 1]].forEach(([x, z, c]) => can(x, .92, z, CANS[c]));
    can(RW - .42, .92, 1.55, CANS[2], true); can(RW - .5, .92, .2, CANS[0], false, true);
    const vodka = cyl(.04, .04, .26, M({ color: 0xd8e8f0, roughness: .05, transparent: true, opacity: .45 }), RW - .2, .92, .72); cyl(.015, .015, .05, M({ color: 0xc0392b }), RW - .2, 1.18, .72); // a bottle, nearly empty
    { const sp = TEX.splash(); sp.wrapS = sp.wrapT = THREE.RepeatWrapping; sp.repeat.set(1.65 / 1.6, 1); const m = add(new THREE.PlaneGeometry(1.65, .4), M({ map: sp, roughness: .35 }), RW - .004, 1.12, .855, -Math.PI / 2); m.castShadow = false; } // tiles behind the worktop, splashed
    // the wall cupboard
    box(.34, .62, 1.5, unitM, RW - .17, 1.48, .85); for (let i = 0; i < 2; i++) box(.02, .58, .72, M({ color: 0xa89878, roughness: .6 }), RW - .345, 1.5, .48 + i * .75); for (const z of [.82, .88]) box(.02, .1, .015, chrome, RW - .36, 1.55, z);
    const fridge = soft(.62, 1.6, .62, M({ color: 0xe4e2da, roughness: .35 }), RW - .32, 0, 2.05, 0, .03); // its door, postcards and all, is a picture on the front
    const ff = add(new THREE.PlaneGeometry(.58, 1.56), M({ map: TEX.fridge(), roughness: .35 }), RW - .632, .8, 2.05, -Math.PI / 2); ff.castShadow = false;
    box(.005, .006, .58, M({ color: 0x8a8a88 }), RW - .635, 1.15, 2.05); for (const [y, hh] of [[1.25, .25], [.5, .45]]) box(.03, hh, .03, M({ color: 0xb8b8b0, metalness: .5, roughness: .3 }), RW - .66, y, 1.82); // freezer line, handles
    use(ff, 'The fridge', () => A.fridge());
    const noteC = document.createElement('canvas'); noteC.width = 128; noteC.height = 176; { const g = noteC.getContext('2d'); g.fillStyle = '#f4ea9a'; g.fillRect(0, 0, 128, 176); g.strokeStyle = 'rgba(80,120,200,.35)'; for (let y = 36; y < 176; y += 14) { g.beginPath(); g.moveTo(6, y); g.lineTo(122, y); g.stroke(); } g.fillStyle = '#2a2a6a'; g.font = 'bold 18px "Bradley Hand", "Segoe Print", cursive'; g.fillText('TO DO', 30, 26); g.strokeStyle = '#2a2a6a'; g.lineWidth = 1.6; for (let i = 0; i < 9; i++) { const y = 33 + i * 14; g.beginPath(); g.moveTo(14, y); for (let x = 14; x < 50 + rnd() * 60; x += 6) g.lineTo(x, y - 2 - rnd() * 4); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(44, -4, 40, 14); }
    const note = add(new THREE.PlaneGeometry(.16, .22), M({ map: new THREE.CanvasTexture(noteC), roughness: .9 }), RW - .6345, 1.3, 2.24, -Math.PI / 2); note.castShadow = false; note.rotation.z = .05;
    use(note, 'The list on the fridge', () => A.list()); use(fridge, 'The fridge', () => A.fridge()); solid(RW - .66, 1.72, RW, 2.38);
    const mw = box(.5, .3, .36, M({ color: 0x2a2a2e, roughness: .4 }), RW - .3, 1.6, 2.05); box(.005, .2, .26, M({ color: 0x0a0c0e, roughness: .1, metalness: .4 }), RW - .552, 1.65, 2.0); box(.005, .03, .06, M({ color: 0x40ff80, emissive: 0x20a040, emissiveIntensity: 1 }), RW - .553, 1.82, 2.18); // the microwave, 12:00 blinking

    // --- the bed, unmade, against the left wall: a frame, a mattress, a rumpled duvet, one flat pillow
    const frameM = M({ map: wood, color: 0x8a6a4a });
    box(.98, .25, 2.06, frameM, .5, .08, 1.1); for (const [x, z] of [[.04, .1], [.96, .1], [.04, 2.1], [.96, 2.1]]) box(.06, .33, .06, frameM, x, 0, z);
    box(1.0, .85, .05, frameM, .5, .08, .07); soft(.9, .18, .05, frameM, .5, .78, .07, 0, .02); // the headboard
    soft(.92, .2, 1.96, M({ color: 0xc8c0a8, roughness: 1 }), .5, .33, 1.12, 0, .05); // the mattress, sagging
    const duvet = add(clothGeo(.92, 1.45, .2, 3, .045), M({ map: TEX.duvet(), roughness: 1, side: THREE.DoubleSide }), .52, .55, 1.4); duvet.rotation.y = .03;
    const pillow = soft(.6, .1, .36, M({ color: 0xd0cab8, roughness: 1 }), .48, .53, .32, .1, .05); pillow.scale.y = .8;
    hit(.95, .3, 2.0, .5, .3, 1.1, 'The bed', () => A.bed()); solid(0, .04, 1.02, 2.16); blob(.5, 1.1, 1.3, 2.4, .5);

    // --- the desk and the laptop, the only bright thing in the room
    const deskM = M({ map: wood, color: 0x9a7a5a });
    soft(1.3, .035, .62, deskM, 2.7, .72, .32, 0, .008);
    for (const [x, z] of [[2.09, .06], [2.09, .58]]) box(.04, .72, .04, M({ color: 0x3a2a1a }), x, 0, z);
    box(.42, .72, .58, deskM, 3.12, 0, .32); for (let i = 0; i < 3; i++) { box(.4, .2, .01, M({ map: wood, color: 0x8a6a4a }), 3.12, .06 + i * .23, .615); box(.1, .015, .02, chrome, 3.12, .18 + i * .23, .625); } // the drawers
    solid(2.0, 0, 3.4, .66); blob(2.7, .35, 1.6, .9, .45);
    // the office chair: a cushion, a back, a stem, five feet
    const chairM = M({ color: 0x2a2a30, roughness: .8 });
    soft(.46, .08, .44, chairM, 2.7, .44, 1.0, 0, .03); const back = soft(.44, .5, .06, chairM, 2.7, .56, 1.24, 0, .03); back.rotation.x = -.1;
    cyl(.025, .025, .38, chrome, 2.7, .06, 1.0); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, leg = box(.3, .03, .04, black, 2.7 + Math.cos(a) * .14, .04, 1.0 + Math.sin(a) * .14); leg.rotation.y = -a; cyl(.02, .02, .04, black, 2.7 + Math.cos(a) * .28, 0, 1.0 + Math.sin(a) * .28); }
    solid(2.46, .78, 2.94, 1.28); blob(2.7, 1.0, .8, .8, .35);
    // the laptop: a base with keys, a lid tipped back, the screen in it
    const lapC = document.createElement('canvas'); lapC.width = 512; lapC.height = 320; G.lapCtx = lapC.getContext('2d'); G.lapTex = new THREE.CanvasTexture(lapC); G.lapTex.encoding = THREE.sRGBEncoding;
    const kb = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#2a2c30'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#16181c'; for (let r = 0; r < 5; r++) for (let k = 0; k < 13; k++) g.fillRect(8 + k * 18.6, 8 + r * 18, 15, 14); g.fillRect(60, 100, 136, 46); return new THREE.CanvasTexture(c); })();
    const base = add(new THREE.BoxGeometry(.36, .018, .25), [steel, steel, M({ map: kb, roughness: .6 }), steel, steel, steel], 2.7, .765, .36);
    const lid = new THREE.Group(); lid.position.set(2.7, .774, .235); lid.rotation.x = -.28; scene.add(lid);
    add(new THREE.BoxGeometry(.36, .24, .012), M({ color: 0x8a9098, metalness: .6, roughness: .35 }), 0, .12, -.006, 0, lid);
    const scr = add(new THREE.PlaneGeometry(.33, .205), new THREE.MeshBasicMaterial({ map: G.lapTex }), 0, .122, .001, 0, lid); scr.castShadow = false;
    use(scr, 'The laptop', () => A.laptop()); use(base, 'The laptop', () => A.laptop());
    const lapLight = new THREE.PointLight(0x8ab4ff, .6, 2.6, 2); lapLight.position.set(2.7, .95, .55); scene.add(lapLight);
    cyl(.04, .035, .09, M({ color: 0xe8e0d0, roughness: .4 }), 2.3, .755, .38); cyl(.055, .05, .02, M({ color: 0x8a8a88, metalness: .4 }), 2.42, .755, .2); for (let i = 0; i < 4; i++) cyl(.004, .004, .03, M({ color: 0xe8dcc0 }), 2.4 + i * .012, .77, .2 + (i % 2) * .01); // a mug; an ashtray full
    const frame = box(.16, .2, .02, M({ color: 0x3a2a1a }), 3.15, .755, .16); frame.rotation.x = -.15;
    const ph = add(new THREE.PlaneGeometry(.13, .1), new THREE.MeshBasicMaterial({ map: TEX.photo() }), 3.15, .86, .174); ph.rotation.x = -.15; ph.castShadow = false;
    use(ph, 'A photo in a frame', () => A.photo());
    // --- the dartboard, three darts in the treble twenty, and the line on the carpet nobody but you stands on
    const bd = add(new THREE.CylinderGeometry(.23, .23, .04, 40), [M({ color: 0x1a1a1a }), M({ map: TEX.board(), roughness: .8 }), M({ color: 0x1a1a1a })], 4.4, 1.73, .04); bd.rotation.x = Math.PI / 2;
    box(.62, .62, .025, M({ map: wood, color: 0x5a3a22 }), 4.4, 1.42, .0125); for (const k of [-1, 1]) { const dr = box(.31, .62, .02, M({ map: wood, color: 0x6a4a2a }), 4.4 + k * .47, 1.42, .14, k * -.9); dr.castShadow = false; } // the cabinet, its doors open
    for (let i = 0; i < 3; i++) { const dt = new THREE.Group(); dt.position.set(4.4 - .02 + i * .02, 1.73 + .16 + (i - 1) * .008, .06); dt.rotation.x = Math.PI / 2 - .2; scene.add(dt); add(new THREE.CylinderGeometry(.003, .006, .12, 6), steel, 0, .06, 0, 0, dt); add(new THREE.PlaneGeometry(.035, .035), M({ color: [0xc0392b, 0x2a62c9, 0xf0c040][i], side: THREE.DoubleSide }), 0, .13, 0, 0, dt); }
    const oche = add(new THREE.PlaneGeometry(.6, .03), new THREE.MeshBasicMaterial({ color: 0xe8d8a0 }), 4.4, .005, 2.37); oche.rotation.x = -Math.PI / 2; oche.castShadow = false;
    use(bd, 'The dartboard', () => A.darts());
    const cal = add(new THREE.PlaneGeometry(.3, .42), M({ map: TEX.calendar() }), 3.6, 1.55, .012); cal.castShadow = false; use(cal, 'The calendar', () => A.calendar());
    // --- the bookshelf: real books, leaning; the radio on top
    const shelfM = M({ map: wood, color: 0x7a5a3a });
    box(.8, .03, .28, shelfM, 1.5, 1.37, .15); for (const x of [1.115, 1.885]) box(.03, 1.4, .28, shelfM, x, 0, .15); box(.8, 1.4, .02, shelfM, 1.5, 0, .02);
    const BK = [0x7a2a2a, 0x2a4a6a, 0x3a5a3a, 0x8a6a3a, 0x5a3a5a, 0xc8b88a, 0x2a2a2a, 0x6a2a1a, 0x1a3a5a];
    for (const y of [.03, .47, .91]) {
      box(.74, .025, .26, shelfM, 1.5, y, .15); let x = 1.14;
      while (x < 1.84) { const w = .02 + rnd() * .03, hh = .2 + rnd() * .12, d = .15 + rnd() * .06, lean = x > 1.75 ? .25 : 0; if (rnd() < .08) { x += .05; continue; } const b = box(w, hh, d, M({ color: BK[Math.floor(rnd() * BK.length)], roughness: .7 }), x + w / 2, y + .025, .17); if (lean) { b.rotation.z = -lean; b.position.x += .03; } x += w + .003; }
    }
    hit(.76, 1.3, .1, 1.5, .03, .26, 'The bookshelf', () => A.books()); solid(1.08, 0, 1.92, .32); blob(1.5, .2, 1.0, .5, .4);
    const radio = soft(.34, .18, .13, M({ color: 0x6a4a2a, roughness: .5 }), 1.5, 1.4, .14, 0, .03);
    const grille = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#c8b890'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#5a4a30'; for (let y = 4; y < 60; y += 6) g.fillRect(4, y, 70, 3); g.fillStyle = '#e8d8a0'; g.fillRect(82, 10, 40, 20); g.fillStyle = '#c0392b'; g.fillRect(100, 10, 2, 20); g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(102, 48, 10, 0, 7); g.fill(); return new THREE.CanvasTexture(c); })();
    const rf = add(new THREE.PlaneGeometry(.3, .14), M({ map: grille, roughness: .6 }), 1.5, 1.49, .207); rf.castShadow = false;
    use(radio, 'The radio', () => A.radio()); use(rf, 'The radio', () => A.radio());
    add(new THREE.CylinderGeometry(.003, .003, .3, 4), chrome, 1.62, 1.72, .12).rotation.z = -.5; // the aerial

    // --- the window: a frame, a sill, the blinds (one slat bent), the night and the bookmaker's sign beyond; a radiator under it, curtains either side
    const outC = document.createElement('canvas'); outC.width = 256; outC.height = 256; { const g = outC.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#0a1020'); sky.addColorStop(1, '#1a2040'); g.fillStyle = sky; g.fillRect(0, 0, 256, 256); g.fillStyle = '#05070c'; g.fillRect(0, 120, 256, 136); for (let i = 0; i < 30; i++) { g.fillStyle = rnd() < .5 ? '#e0b060' : '#6080c0'; g.fillRect(rnd() * 256, 130 + rnd() * 120, 6, 8); } const r = g.createRadialGradient(128, 110, 4, 128, 110, 90); r.addColorStop(0, 'rgba(255,40,40,.8)'); r.addColorStop(1, 'rgba(255,40,40,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); g.fillStyle = '#ff5050'; g.font = 'bold 22px Georgia'; g.textAlign = 'center'; g.fillText('MERIDIAN BETS', 128, 118); }
    const outT = new THREE.CanvasTexture(outC); outT.encoding = THREE.sRGBEncoding;
    add(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ map: outT }), .002, 1.55, 3.3, Math.PI / 2).castShadow = false;
    const wfM = M({ color: 0xe8e2d4, roughness: .5 });
    for (const [hh, w, y, z] of [[.06, 1.22, 2.08, 3.3], [.06, 1.22, 1.02, 3.3], [1.12, .06, 1.55, 2.72], [1.12, .06, 1.55, 3.88], [.04, 1.1, 1.55, 3.3]]) box(.06, hh, w, wfM, .03, y - hh / 2, z);
    box(.16, .04, 1.3, wfM, .08, .98, 3.3); // the sill
    can(.1, 1.02, 3.0, CANS[1]); cyl(.03, .03, .1, M({ color: 0x5a3a1a, roughness: .9 }), .09, 1.02, 3.6); // a can on the sill, a dead plant
    for (let i = 0; i < 18; i++) { const sl = box(.004, .045, 1.06, M({ color: 0xc8c0a8, roughness: .6 }), .09, 1.07 + i * .054, 3.3); sl.rotation.z = 1.1; if (i === 9) { sl.rotation.x = .25; sl.position.x += .02; } }
    box(.01, 1.0, .01, white, .09, 1.05, 3.0); // the blind's cord
    const win = hit(.08, 1.0, 1.1, .08, 1.05, 3.3, 'The window', () => A.window());
    const outside = new THREE.PointLight(0xff6060, .3, 3, 2); outside.position.set(.5, 1.6, 3.3); scene.add(outside); G.outside = outside;
    const curtM = M({ color: 0x8a6a2a, roughness: 1, side: THREE.DoubleSide });
    for (const z of [2.55, 4.05]) { const cg = new THREE.PlaneGeometry(.45, 1.65, 18, 4); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * .025); cg.computeVertexNormals(); add(cg, curtM, .12, 1.32, z, Math.PI / 2); }
    add(new THREE.CylinderGeometry(.012, .012, 1.9, 8), chrome, .1, 2.15, 3.3).rotation.x = Math.PI / 2; // the curtain rod
    const radM = M({ color: 0xe0dccc, roughness: .4 }); for (let i = 0; i < 12; i++) box(.06, .5, .045, radM, .1, .18, 2.92 + i * .07); for (const y of [.18, .68]) cyl(.02, .02, .84, radM, .1, y - .42, 3.31).rotation.x = Math.PI / 2;
    solid(0, 2.85, .2, 3.75);

    // --- the TV on a low cabinet, a box under it; the armchair; the rug
    const tvC = document.createElement('canvas'); tvC.width = 512; tvC.height = 300; G.tvCtx = tvC.getContext('2d'); G.tvTex = new THREE.CanvasTexture(tvC); G.tvTex.encoding = THREE.sRGBEncoding;
    soft(1.0, .46, .42, M({ map: wood, color: 0x5a3a22 }), 1.1, 0, RD - .25, 0, .015); for (const x of [.85, 1.35]) { box(.46, .36, .01, M({ map: wood, color: 0x6a4a2a }), x, .05, RD - .465); box(.06, .015, .02, chrome, x + (x < 1 ? .18 : -.18), .25, RD - .475); }
    box(.28, .06, .22, black, .76, .46, RD - .25); box(.02, .008, .005, M({ color: 0x40ff80, emissive: 0x20ff60, emissiveIntensity: 1 }), .68, .49, RD - .362); // the box
    box(.24, .04, .16, black, 1.1, .52, RD - .22); box(.04, .2, .04, black, 1.1, .52, RD - .17); // the stand
    soft(.9, .54, .05, black, 1.1, .64, RD - .17, 0, .01);
    const tv = add(new THREE.PlaneGeometry(.84, .48), new THREE.MeshBasicMaterial({ map: G.tvTex }), 1.1, .91, RD - .202, Math.PI); tv.castShadow = false;
    use(tv, 'The television', () => A.tv()); solid(.55, RD - .48, 1.65, RD);
    const tvLight = new THREE.PointLight(0xaabbff, .7, 3.6, 2); tvLight.position.set(1.1, .9, RD - .7); scene.add(tvLight); G.tvLight = tvLight;
    const rugC = document.createElement('canvas'); rugC.width = rugC.height = 256; { const g = rugC.getContext('2d'); g.fillStyle = '#5a2a22'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#c8a060'; g.lineWidth = 6; g.strokeRect(16, 16, 224, 224); g.lineWidth = 2; g.strokeRect(30, 30, 196, 196); g.fillStyle = 'rgba(200,160,96,.5)'; g.beginPath(); g.moveTo(128, 60); g.lineTo(190, 128); g.lineTo(128, 196); g.lineTo(66, 128); g.closePath(); g.fill(); for (let i = 0; i < 2500; i++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); } const r = g.createRadialGradient(128, 150, 10, 128, 150, 110); r.addColorStop(0, 'rgba(30,20,10,.5)'); r.addColorStop(1, 'rgba(30,20,10,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }
    const rugT = new THREE.CanvasTexture(rugC); rugT.encoding = THREE.sRGBEncoding;
    const rug = add(new THREE.PlaneGeometry(1.6, 2.0), M({ map: rugT, roughness: 1 }), 1.4, .006, 3.2); rug.rotation.x = -Math.PI / 2; rug.castShadow = false;
    const velM = M({ color: 0x5a3430, roughness: 1 });
    soft(.78, .22, .72, velM, 1.3, .12, 2.92, 0, .06); soft(.62, .12, .58, M({ color: 0x6a3e38, roughness: 1 }), 1.3, .33, 2.98, 0, .05); // the base, the seat cushion (a dent in it)
    const cb = soft(.78, .6, .2, velM, 1.3, .3, 2.6, 0, .07); cb.rotation.x = .12; for (const k of [-1, 1]) soft(.16, .32, .74, velM, 1.3 + k * .33, .12, 2.9, 0, .06);
    for (const [x, z] of [[.95, 2.6], [1.65, 2.6], [.95, 3.24], [1.65, 3.24]]) cyl(.025, .02, .12, M({ color: 0x2a1a10 }), x, 0, z);
    const throwM = add(clothGeo(.5, .3, .15, 5, .02), M({ color: 0x3a5a4a, roughness: 1, side: THREE.DoubleSide }), 1.45, .58, 2.62); throwM.rotation.set(.5, .2, 0); // a blanket over the back
    box(.05, .02, .16, black, 1.08, .46, 3.05); // the remote
    hit(.8, .9, .8, 1.3, 0, 2.9, 'The armchair', () => A.chair()); solid(.88, 2.48, 1.72, 3.3); blob(1.3, 2.9, 1.1, 1.1, .5);
    // --- the floor: a bin bag, a tower of empties, a pizza box, a pile of clothes, cans where they fell
    const bag = add(new THREE.SphereGeometry(.24, 16, 12), M({ color: 0x0c0c10, roughness: .25, metalness: .1 }), 4.9, .2, .45); { const p = bag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 30) * .06 + Math.cos(p.getZ(i) * 25) * .05; p.setXYZ(i, p.getX(i) * k, Math.max(-.2, p.getY(i) * k), p.getZ(i) * k); } bag.geometry.computeVertexNormals(); }
    cyl(.02, .03, .1, M({ color: 0x0c0c10, roughness: .3 }), 4.9, .42, .45); solid(4.68, .25, 5.12, .66); blob(4.9, .45, .7, .6, .5);
    for (let i = 0; i < 10; i++) can(4.35 + (i % 4) * .07, Math.floor(i / 4) * .12, 3.0 + (i % 2) * .03, CANS[i % 4]); // the tower
    for (const [x, z] of [[3.3, 2.0], [2.2, 1.6], [4.0, 3.9], [1.9, 3.7], [3.0, 3.3]]) can(x, 0, z, CANS[Math.floor(rnd() * 4)], true);
    const pz = box(.4, .045, .4, M({ color: 0xb08a5a, roughness: 1 }), 3.6, 0, 3.6); pz.rotation.y = .3; const lidp = box(.4, .01, .4, M({ color: 0xc09a6a, roughness: 1 }), 3.6, .2, 3.4); lidp.rotation.set(-1.1, .3, 0); // the box, open
    for (let i = 0; i < 4; i++) { const c = add(new THREE.SphereGeometry(.18, 10, 8), M({ color: [0x3a4a6a, 0x5a5a5a, 0x7a3a2a, 0x2a2a2a][i], roughness: 1 }), .55 + i * .12, .05, 2.45 + (i % 2) * .12); c.scale.set(1.2, .3, .9); c.rotation.y = i; } // the clothes
    blob(3.6, 3.6, .7, .7, .35);
    // --- the bathroom, through the door in the right-hand wall; the mirror is on its far wall, straight across from the door
    function bathroom() {
      const st = S(), W = BX1 - BX0, cx = (BX0 + BX1) / 2, cz = (BZ0 + BZ1) / 2, tiles = TEX.tiles(), paint = TEX.bathPaint(), TH = 1.25;
      // walls: tiles to shoulder height, damp paint above; they keep the bulb's light out of here (they cast its shadow)
      const panel = (w, x, z, ry, y0 = 0, hh = RH) => { if (y0 < TH) wall(w, Math.min(y0 + hh, TH) - y0, x, y0, z, ry, tiles, .6, true); if (y0 + hh > TH) wall(w, y0 + hh - Math.max(TH, y0), x, Math.max(TH, y0), z, ry, paint, 1.2, true); };
      panel(BZ1 - BZ0, BX1, cz, -Math.PI / 2); panel(W, cx, BZ0, 0); panel(W, cx, BZ1, Math.PI);
      panel(DZ0 - BZ0, BX0, (BZ0 + DZ0) / 2, Math.PI / 2); panel(BZ1 - DZ1, BX0, (DZ1 + BZ1) / 2, Math.PI / 2); panel(DZ1 - DZ0, BX0, DZC, Math.PI / 2, 2.04, RH - 2.04);
      const lino = TEX.lino(); lino.wrapS = lino.wrapT = THREE.RepeatWrapping; lino.repeat.set(W, BZ1 - BZ0);
      const fl = add(new THREE.PlaneGeometry(W + .1, BZ1 - BZ0), M({ map: lino, roughness: .6 }), cx - .05, 0, cz); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
      const ce = add(new THREE.PlaneGeometry(W, BZ1 - BZ0), M({ map: TEX.bathCeil(), roughness: 1 }), cx, RH, cz); ce.rotation.x = Math.PI / 2; ce.castShadow = false;
      for (const [x, z, w, d] of [[BX1 - .01, cz, .02, BZ1 - BZ0], [cx, BZ0 + .01, W, .02], [cx, BZ1 - .01, W, .02], [BX0 + .01, (BZ0 + DZ0) / 2, .02, DZ0 - BZ0], [BX0 + .01, (DZ1 + BZ1) / 2, .02, BZ1 - DZ1]]) box(w, .08, d, M({ color: 0xe8e4d8, roughness: .3 }), x, 0, z); // a tiled skirting
      // the doorway: its linings, the frames both sides, a strip of threshold
      for (const z of [DZ0 + .01, DZ1 - .01]) box(BX0 - RW, 2.04, .02, trimM, (RW + BX0) / 2, 0, z);
      box(BX0 - RW, .02, DZ1 - DZ0, trimM, (RW + BX0) / 2, 2.03, DZC);
      for (const x of [RW - .01, BX0 + .01]) { for (const z of [DZ0 - .035, DZ1 + .035]) box(.02, 2.11, .07, trimM, x, 0, z); box(.02, .07, DZ1 - DZ0 + .14, trimM, x, 2.04, DZC); }
      box(BX0 - RW + .04, .012, DZ1 - DZ0, M({ map: wood, color: 0x7a5a3a }), (RW + BX0) / 2, 0, DZC);
      // the door: a real one, on hinges at the end by the front door; it swings in, into the bathroom
      const LW = DZ1 - DZ0 - .03, leafM = M({ color: 0xd6d0be, roughness: .45 }), dg = new THREE.Group(); dg.position.set(RW + .05, 0, DZ1 - .015); scene.add(dg);
      const leaf = add(softGeo(.04, 2.0, LW, .008), leafM, 0, 1.01, -LW / 2, 0, dg);
      for (const k of [-1, 1]) { for (const [y, hh] of [[.55, .78], [1.47, .72]]) add(softGeo(.012, hh, LW - .26, .004), leafM, k * .024, y, -LW / 2, 0, dg); add(new THREE.BoxGeometry(.016, .02, .12), chrome, k * .045, 1.0, -LW + .13, 0, dg); add(new THREE.BoxGeometry(.02, .07, .035), chrome, k * .027, 1.0, -LW + .07, 0, dg); }
      for (const y of [.25, 1.75]) add(new THREE.BoxGeometry(.03, .1, .02), M({ color: 0x8a7a5a, metalness: .5 }), 0, y, -.005, 0, dg); // the hinges
      add(new THREE.BoxGeometry(.03, .03, .02), chrome, .03, 1.7, -LW / 2, 0, dg); // a hook on the back, with nothing on it
      use(leaf, 'The bathroom door', () => A.bathDoor());
      G.door = { grp: dg, t: st.bathOpen ? 1 : 0, to: st.bathOpen ? 1 : 0 }; dg.rotation.y = DOOR_OPEN * G.door.t;
      // the strip light over the mirror (off until the door first opens) and its pull cord by the door
      const stripM = M({ color: 0xf4f6f0, emissive: 0xeaf2ff, emissiveIntensity: 0 }); box(.56, .05, .08, stripM, BX1 - .06, 2.02, MZ, Math.PI / 2);
      const bl = new THREE.PointLight(0xe4ecff, 0, 5.5, 1.6); bl.position.set(BX1 - .45, 2.0, MZ); scene.add(bl); G.stripM = stripM;
      // and a bulkhead on the ceiling, on the same switch, for the rest of the room
      const bulkM = M({ color: 0xf0eee4, emissive: 0xfff4e0, emissiveIntensity: 0, roughness: .2 }), bk = add(new THREE.SphereGeometry(.13, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), bulkM, 7.1, RH, 3.25); bk.rotation.x = Math.PI; bk.scale.y = .35; bk.castShadow = false;
      const cl = new THREE.PointLight(0xfff0dc, 0, 5, 1.4); cl.position.set(7.1, RH - .15, 3.25); scene.add(cl);
      G.bathL = { set intensity(k) { bl.intensity = k * .85; cl.intensity = k * .75; bulkM.emissiveIntensity = Math.min(1, k) * .8; }, get intensity() { return bl.intensity / .85; } };
      if (st.flags.bathSeen) { G.bathL.intensity = 1.5; stripM.emissiveIntensity = .9; }
      cyl(.002, .002, .95, M({ color: 0xe8e0c8 }), BX0 + .14, RH - .95, DZ0 - .12).castShadow = false; cyl(.012, .012, .04, white, BX0 + .14, RH - .99, DZ0 - .12);
      add(new THREE.BoxGeometry(.22, .02, .22), M({ color: 0x9a968a, roughness: .6 }), 7.3, RH - .01, 3.9); // the extractor, clogged grey
      // the mirror over the basin: the only one in the flat
      const mirror = new THREE.Reflector(new THREE.PlaneGeometry(.6, .85), { clipBias: .003, textureWidth: low ? 256 : 640, textureHeight: low ? 362 : 906, color: 0xb4bcbe }); mirror.position.set(BX1 - .012, 1.55, MZ); mirror.rotation.y = -Math.PI / 2; scene.add(mirror); G.mirror = mirror;
      for (const [hh, w, y, z] of [[.04, .7, 1.995, MZ], [.04, .7, 1.105, MZ], [.93, .04, 1.55, MZ - .33], [.93, .04, 1.55, MZ + .33]]) box(.025, hh, w, M({ color: 0x8a7a5a, roughness: .6 }), BX1 - .014, y - hh / 2, z);
      use(mirror, 'The mirror', () => A.mirror());
      const porc = M({ color: 0xeeeee6, roughness: .2, side: THREE.DoubleSide });
      const bowl = add(new THREE.LatheGeometry([0, .05, .14, .2, .22, .225, .22].map((r, i) => new THREE.Vector2(r, [0, .005, .03, .08, .13, .15, .16][i])), 24), porc, BX1 - .24, .74, MZ); bowl.scale.z = 1.25;
      cyl(.05, .07, .74, M({ color: 0xe6e6de, roughness: .25 }), BX1 - .2, 0, MZ); // the pedestal
      for (const dz of [-.07, .07]) { cyl(.012, .012, .08, chrome, BX1 - .05, .88, MZ + dz); box(.05, .012, .012, chrome, BX1 - .07, .96, MZ + dz); }
      const lime = add(new THREE.CircleGeometry(.05, 16), M({ color: 0x8a7a4a, roughness: 1, transparent: true, opacity: .6 }), BX1 - .22, .76, MZ); lime.rotation.x = -Math.PI / 2; lime.castShadow = false; // a ring round the plughole
      box(.1, .015, .5, M({ color: 0xd8d4c8 }), BX1 - .06, 1.08, MZ); cyl(.025, .02, .09, M({ color: 0x7ab0c0, roughness: .2, transparent: true, opacity: .7 }), BX1 - .07, 1.095, MZ - .12);
      add(new THREE.CylinderGeometry(.005, .005, .17, 6), M({ color: 0x2a62c9 }), BX1 - .07, 1.16, MZ - .11).rotation.z = .2; cyl(.012, .012, .1, M({ color: 0xe8e8e0 }), BX1 - .07, 1.095, MZ + .13); // a toothbrush gone flat, a can of foam
      solid(BX1 - .45, MZ - .3, BX1, MZ + .3); blob(BX1 - .22, MZ, .6, .7, .35);
      // the cabinet beside the mirror: paracetamol, a brown bottle, a razor, toothpaste rolled to the end
      const cabM = M({ color: 0xe8e6dc, roughness: .4 }), CZ = 4.08, CW = .46, CY = 1.32, CH = .56, CD = .14;
      box(.01, CH, CW, cabM, BX1 - .005, CY, CZ); for (const z of [CZ - CW / 2 + .008, CZ + CW / 2 - .008]) box(CD, CH, .016, cabM, BX1 - CD / 2, CY, z); for (const y of [CY, CY + CH - .016]) box(CD, .016, CW, cabM, BX1 - CD / 2, y, CZ);
      box(CD - .02, .012, CW - .03, cabM, BX1 - CD / 2, CY + .27, CZ);
      G.pillsMesh = box(.08, .045, .05, M({ color: 0xf4f4f4, roughness: .5 }), BX1 - .07, CY + .016, CZ - .12); box(.081, .012, .051, M({ color: 0x2a62c9 }), BX1 - .07, CY + .035, CZ - .12);
      cyl(.025, .025, .11, M({ color: 0x6a3a10, roughness: .2, transparent: true, opacity: .85 }), BX1 - .07, CY + .016, CZ + .06); cyl(.026, .026, .02, white, BX1 - .07, CY + .126, CZ + .06);
      box(.04, .025, .14, M({ color: 0xe0e0e0, roughness: .4 }), BX1 - .06, CY + .282, CZ - .06); box(.02, .02, .09, M({ color: 0x3a3a3a }), BX1 - .06, CY + .282, CZ + .12);
      const cdg = new THREE.Group(); cdg.position.set(BX1 - CD, CY + CH / 2, CZ + CW / 2); scene.add(cdg);
      const cdoor = add(softGeo(.018, CH, CW, .005), cabM, -.009, 0, -CW / 2, 0, cdg); add(new THREE.SphereGeometry(.012, 8, 6), chrome, -.026, 0, -CW + .045, 0, cdg);
      G.cab = { grp: cdg, t: 0, to: 0 }; use(cdoor, 'The bathroom cabinet', () => A.cabinet());
      // the toilet, against the back wall: a pan, a seat, a lid on its hinge, the cistern, a roll and its empties
      const TX = 7.15, TZ = BZ1 - .44;
      const pan = add(new THREE.LatheGeometry([[.12, 0], [.11, .08], [.1, .2], [.14, .3], [.18, .36], [.19, .4], [.175, .405], [.12, .37], [.06, .26], [0, .25]].map(([r, y]) => new THREE.Vector2(r, y)), 28), porc, TX, 0, TZ); pan.scale.z = 1.3;
      const water = add(new THREE.CircleGeometry(.075, 16), M({ color: 0x6a6a48, roughness: .05, metalness: .2 }), TX, .275, TZ); water.rotation.x = -Math.PI / 2; water.scale.y = 1.3; water.castShadow = false;
      const seat = add(new THREE.TorusGeometry(.145, .022, 8, 28), M({ color: 0xd8d0b8, roughness: .35 }), TX, .42, TZ); seat.rotation.x = Math.PI / 2; seat.scale.set(1, 1.3, .6);
      const lg = new THREE.Group(); lg.position.set(TX, .44, TZ + .2); scene.add(lg);
      const lidm = add(new THREE.CylinderGeometry(.165, .165, .02, 28), M({ color: 0xd8d0b8, roughness: .35 }), 0, .01, -.2, 0, lg); lidm.scale.z = 1.3;
      G.lid = { grp: lg, t: 0, to: 0 };
      soft(.42, .36, .17, porc, TX, .44, BZ1 - .1, 0, .02); soft(.45, .03, .19, porc, TX, .8, BZ1 - .1, 0, .01); // the cistern and its lid
      box(.07, .014, .014, chrome, TX - .16, .74, BZ1 - .2); cyl(.02, .02, .1, porc, TX, .38, BZ1 - .17); // the flush lever, the pipe
      box(.03, .06, .1, chrome, TX - .42, .66, BZ1 - .05); const roll = add(new THREE.CylinderGeometry(.055, .055, .1, 16), M({ color: 0xf4f2ec, roughness: .9 }), TX - .42, .69, BZ1 - .1); roll.rotation.z = Math.PI / 2;
      for (const [x, z] of [[6.6, 4.3], [6.5, 4.15]]) { const tb = add(new THREE.CylinderGeometry(.022, .022, .1, 10), M({ color: 0xb08a5a, roughness: 1 }), x, .022, z); tb.rotation.z = Math.PI / 2; tb.rotation.y = x * 3; }
      box(.5, .012, .38, M({ color: 0x3a5a6a, roughness: 1 }), TX, 0, TZ - .5); // a pedestal mat, gone flat
      hit(.46, .98, .75, TX, 0, BZ1 - .38, 'The toilet', () => A.toilet()); solid(TX - .25, BZ1 - .74, TX + .25, BZ1); blob(TX, TZ, .7, .8, .35);
      // the shower, in the far corner: a tray gone black round the drain, a curtain grown a map of somewhere
      const SX0 = 7.62, SZ1 = 2.78, scx = (SX0 + BX1) / 2, scz = (BZ0 + SZ1) / 2;
      soft(BX1 - SX0, .07, SZ1 - BZ0, porc, scx, 0, scz, 0, .02);
      const dr = add(new THREE.CircleGeometry(.045, 16), M({ color: 0x1a1c18, metalness: .5, roughness: .4 }), scx, .0715, scz); dr.rotation.x = -Math.PI / 2; dr.castShadow = false;
      const mr = add(new THREE.RingGeometry(.045, .16, 24), M({ color: 0x1a1a10, roughness: 1, transparent: true, opacity: .55 }), scx, .071, scz); mr.rotation.x = -Math.PI / 2; mr.castShadow = false;
      wall(SZ1 - BZ0, 2.05 - TH, BX1 - .004, TH, scz, -Math.PI / 2, tiles, .6); wall(BX1 - SX0, 2.05 - TH, scx, TH, BZ0 + .004, 0, tiles, .6);
      box(.05, .12, .14, chrome, BX1 - .03, 1.05, 2.34); cyl(.012, .012, .7, chrome, BX1 - .04, 1.2, 2.34); // the mixer, the riser
      const head = add(new THREE.CylinderGeometry(.06, .045, .03, 18), chrome, BX1 - .1, 1.93, 2.34); head.rotation.z = -.6;
      const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(BX1 - .05, 1.08, 2.34), new THREE.Vector3(BX1 - .12, .75, 2.3), new THREE.Vector3(BX1 - .1, .62, 2.38), new THREE.Vector3(BX1 - .07, 1.3, 2.36), new THREE.Vector3(BX1 - .08, 1.9, 2.34)]);
      add(new THREE.TubeGeometry(hose, 40, .008, 6), M({ color: 0xb8bcc0, metalness: .7, roughness: .35 }), 0, 0, 0);
      add(new THREE.CylinderGeometry(.01, .01, SZ1 - BZ0, 8), chrome, SX0, 2.02, scz).rotation.x = Math.PI / 2; add(new THREE.CylinderGeometry(.01, .01, BX1 - SX0, 8), chrome, scx, 2.02, SZ1).rotation.z = Math.PI / 2;
      const curtT = TEX.curtain(), curtM = M({ map: curtT, roughness: .7, side: THREE.DoubleSide, transparent: true });
      const curtain = (w, n, amp) => { const g = new THREE.PlaneGeometry(w, 1.75, n, 4), q = g.attributes.position; for (let i = 0; i < q.count; i++) q.setZ(i, Math.sin(q.getX(i) / w * n * Math.PI) * amp); g.computeVertexNormals(); return g; };
      add(curtain(.62, 14, .03), curtM, SX0 + .31, 1.13, SZ1, 0).castShadow = false; // drawn half across
      add(curtain(.26, 10, .045), curtM, SX0, 1.13, BZ0 + .14, Math.PI / 2).castShadow = false; // and bunched at the wall
      for (let i = 0; i < 9; i++) add(new THREE.TorusGeometry(.016, .003, 4, 10), chrome, SX0 + .02 + i * .075, 2.0, SZ1, Math.PI / 2);
      hit(BX1 - SX0, 2.0, SZ1 - BZ0, scx, 0, scz, 'The shower', () => A.shower()); solid(SX0, BZ0, BX1, SZ1);
      // a towel rail on the door wall, a towel that dried stiff on it; a pedal bin
      for (const z of [2.2, 2.78]) box(.06, .03, .02, chrome, BX0 + .03, 1.12, z); add(new THREE.CylinderGeometry(.01, .01, .6, 8), chrome, BX0 + .06, 1.13, 2.49).rotation.x = Math.PI / 2;
      { const g = new THREE.PlaneGeometry(.46, .62, 10, 8), q = g.attributes.position; for (let i = 0; i < q.count; i++) q.setZ(i, Math.sin(q.getX(i) * 18) * .012 + (q.getY(i) > .28 ? .02 : 0)); g.computeVertexNormals(); add(g, M({ color: 0x7a8494, roughness: 1, side: THREE.DoubleSide }), BX0 + .075, .83, 2.49, Math.PI / 2).castShadow = false; }
      cyl(.11, .1, .3, M({ color: 0xc8c8c0, metalness: .5, roughness: .4 }), 6.4, 0, 4.3); blob(6.4, 4.3, .35, .35, .4);
    }
    // you, in the mirror
    G.you = you(); scene.add(G.you); G.head = G.you.userData.head; G.jaw = G.you.userData.jaw;
    if (!low) renderer.shadowMap.needsUpdate = true;
    resize(); window.addEventListener('resize', resize);
  }
  function resize() { if (!G) return; const host = G.renderer.domElement.parentNode; if (!host) return; const w = host.clientWidth || innerWidth, hh = host.clientHeight || innerHeight; G.renderer.setSize(w, hh); G.camera.aspect = w / hh; G.camera.updateProjectionMatrix(); }

  /* ---------- moving about, looking, using things ---------- */
  const doorOpen = () => G.door && G.door.t > .8;
  function blocked(x, z) {
    const room = x > .25 && x < RW - .25 && z > .25 && z < RD - .25, bath = x > BX0 + .22 && x < BX1 - .22 && z > BZ0 + .22 && z < BZ1 - .22;
    const doorway = doorOpen() && x > RW - .4 && x < BX0 + .4 && z > DZ0 + .17 && z < DZ1 - .17;
    if (!room && !bath && !doorway) return true;
    if (doorOpen() && x > BX0 - .1 && x < BX0 + .85 + .22 && z > DZ1 - .22) return true; // the door itself, open against the wall
    return G.solids.some(([a, b, c, d]) => x > a - .22 && x < c + .22 && z > b - .22 && z < d + .22);
  }
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
      if (doorOpen() && G.x > RW - .7 && G.x < BX0 + .7 && G.z > DZ0 - .3 && G.z < DZ1 + .3) { const cz = G.z + (DZC - G.z) * Math.min(1, dt * 4); if (!blocked(G.x, cz)) G.z = cz; } // eased into the doorway, so it's easy to walk through
      G.walk = (G.walk || 0) + dt * 7;
    }
  }
  let ray = null;
  function pick(ndcX = 0, ndcY = 0) {
    ray = ray || new THREE.Raycaster(); ray.setFromCamera({ x: ndcX, y: ndcY }, G.camera); ray.far = 2.6;
    const hit = ray.intersectObjects(G.uses, false)[0]; return hit ? hit.object.userData.use : null;
  }
  function useFocus(u) { if (!u || G.busy) return; u.fn(); }
  function tapUse(u) { if (u && !G.busy) G.guard = performance.now() + 500; useFocus(u); } // the browser's own click after a tap: not on what just opened
  function bindInput(root) {
    const cv = G.renderer.domElement; cv.style.touchAction = 'none';
    G.kd = e => { const k = e.key.toLowerCase(); if (document.querySelector('.l3-say,.l3-laptop')) return; if (['e', ' ', 'enter'].includes(k)) { e.preventDefault(); useFocus(pick()); return; } G.keys.add(k); };
    G.ku = e => G.keys.delete(e.key.toLowerCase());
    addEventListener('keydown', G.kd); addEventListener('keyup', G.ku);
    const pts = new Map();
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { }
      const left = e.pointerType === 'touch' && e.clientX < innerWidth * .4 && e.clientY > innerHeight * .35;
      pts.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, stick: left, t0: performance.now(), look: e.pointerType !== 'touch' });
      if (left) { G.stickEl.style.display = 'block'; G.stickEl.style.left = e.clientX - 50 + 'px'; G.stickEl.style.top = e.clientY - 50 + 'px'; }
    });
    cv.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (!p.look && !p.stick) { if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 9) return; p.look = true; } // a finger wobbles: don't turn the view until it's really dragging
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (p.stick) { const sx = (p.x - p.x0) / 50, sy = (p.y - p.y0) / 50, l = Math.hypot(sx, sy); G.stick = { x: l > 1 ? sx / l : sx, y: l > 1 ? sy / l : sy }; G.stickEl.firstChild.style.transform = `translate(${G.stick.x * 32}px, ${G.stick.y * 32}px)`; }
      else { G.yaw -= dx * .0055; G.pitch = Math.max(-1.1, Math.min(1.1, G.pitch - dy * .0045)); }
    });
    const up = e => {
      const p = pts.get(e.pointerId); if (!p) return; pts.delete(e.pointerId);
      if (p.stick) { G.stick = null; G.stickEl.style.display = 'none'; }
      else if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 16 && performance.now() - p.t0 < 700) { const r = cv.getBoundingClientRect(); tapUse(pick((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    root.querySelector('.l3-use').addEventListener('pointerdown', e => { e.preventDefault(); tapUse(pick()); });
    G.ck = e => { if (performance.now() < G.guard && e.target !== cv) { e.stopPropagation(); e.preventDefault(); } }; document.addEventListener('click', G.ck, true);
  }

  /* ---------- the drink: the only bar left ---------- */
  const level = () => S().drink;
  const stateOf = v => v >= 60 ? 'Steady' : v >= 35 ? 'Shaky' : v >= 15 ? 'The shakes' : 'Collapsing';
  let lastThought = 0;
  const THOUGHTS = ['A can. Just one. Then you\'ll think.', 'The fridge hums like it knows.', 'You could win it back tonight. You\'ve done it before. Haven\'t you?', 'Nobody has knocked in four months.', 'Your hands won\'t hold still.'];
  function drain(sec) {
    const st = S(); if (st.ended) return;
    st.drink = Math.max(0, st.drink - sec * DRAIN * calmK()); calmTick(sec);
    if (st.drink <= 0) { collapse(); return; }
    if (st.drink < 35 && Date.now() - lastThought > 40000) { lastThought = Date.now(); toast('🍺 ' + THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]); }
  }
  // a hand at the laptop takes time too
  // at the laptop the drink runs down with the clock, as it does in the room, not by the bet: an autobet
  // of a hundred costs no more than a minute's thinking (roundNeeds is kept so the tables have a hook)
  function roundNeeds() { }
  // two paracetamol from the bathroom cabinet: the shakes quieten, and the drink goes half as fast, for two and a half minutes
  const CALM = 150, calmK = () => S().calm > 0 ? .5 : 1;
  function calmTick(sec) { const st = S(); if (!(st.calm > 0)) return; st.calm = Math.max(0, st.calm - sec); if (!st.calm) (G ? toast : m => UI.toast(m, 'warn'))('💊 The paracetamol is wearing off.'); }
  let lapTimer = 0;
  function lapStart() { clearInterval(lapTimer); lapTimer = setInterval(lapTick, 1000); }
  function lapStop() { clearInterval(lapTimer); lapTimer = 0; }
  function lapTick() {
    if (!App.state || !App.inLaptop()) return lapStop();
    if (document.hidden) return;
    const st = S(); st.drink = Math.max(0, st.drink - DRAIN * calmK()); calmTick(1); lapHud(); notePeak(App.state.bank);
    if (st.drink < 35 && st.drink > 0 && Date.now() - lastThought > 40000) { lastThought = Date.now(); UI.toast('🍺 ' + THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)], 'warn'); }
    if (st.drink > 0) return;
    // empty: let the hand in play finish (stop an autobet), then back to the room, where you go down
    if (typeof Originals !== 'undefined' && Originals.busy()) { Originals.stopAuto(); return; }
    const scr = Router.screen; // only the game on screen can hold you: a hand in play, spinning reels, a seat in a tournament
    if ((scr === 'table' && Router.table && Router.table.busy) || (scr === 'slots' && typeof Slots !== 'undefined' && Slots.busy()) || (scr === 'pokertable' && typeof Holdem !== 'undefined' && Holdem.active()) || (scr === 'darts' && typeof Darts !== 'undefined' && Darts.active())) return;
    lapStop(); Router.go('bedsit');
  }
  function lapHud() { const e = document.getElementById('hud-drink'); if (!e) return; const v = S().drink; e.textContent = `${Math.round(v)}% · ${stateOf(v)}${S().calm > 0 ? ' · 💊' : ''}`; e.parentElement.classList.toggle('low', v < 35); }

  /* ---------- the loop ---------- */
  function frame(now) {
    if (!G || !G.renderer) return;
    const dt = Math.min(.05, (now - (G.last || now)) / 1000); G.last = now; const t = (now - G.t0) / 1000;
    step(dt);
    if (!G.busy && !document.hidden) { G.acc = (G.acc || 0) + dt; if (G.acc >= 1) { drain(G.acc); G.acc = 0; hud(); } }
    const v = level(), shake = (v < 35 ? (35 - v) / 35 : 0) * (S().calm > 0 ? .3 : 1) + (G.jolt || 0), bob = Math.sin(G.walk || 0) * .025;
    if (G.jolt) G.jolt = Math.max(0, G.jolt - dt * 1.2);
    // the doors: the bathroom's, the cabinet's, the toilet lid; eased, and the room's shadows redrawn while the big one moves
    for (const [d, open] of [[G.door, DOOR_OPEN], [G.cab, 1.6], [G.lid, 1.72]]) { if (!d || d.t === d.to) continue; d.t = d.to > d.t ? Math.min(d.to, d.t + dt * 1.4) : Math.max(d.to, d.t - dt * 1.8); const e = d.t * d.t * (3 - 2 * d.t); if (d === G.lid) d.grp.rotation.x = open * e; else d.grp.rotation.y = open * e; if (d === G.door && G.renderer.shadowMap.enabled) G.renderer.shadowMap.needsUpdate = true; }
    // leaning in over the basin to the mirror (when you use it): where you are and where you look, eased
    G.lean = (G.lean || 0) + ((G.leanT || 0) - (G.lean || 0)) * Math.min(1, dt * 2.5); const ln = G.lean;
    const ex = G.x + (MX - G.x) * ln, ez = G.z + (MZ - G.z) * ln, dy = ((-Math.PI / 2 - G.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI, eyaw = G.yaw + dy * ln, epitch = G.pitch * (1 - ln);
    const cam = G.camera; cam.position.set(ex + (Math.random() - .5) * shake * .012, 1.6 + bob + (Math.random() - .5) * shake * .01, ez);
    const fov = 70 - 30 * ln; if (Math.abs(cam.fov - fov) > .05) { cam.fov = fov; cam.updateProjectionMatrix(); } // and your eyes narrow on it
    cam.rotation.order = 'YXZ'; cam.rotation.set(epitch + Math.sin(t * 1.3) * shake * .03, eyaw + Math.sin(t * .9) * shake * .025, Math.sin(t * .7) * shake * .02);
    // the bulb flickers; the TV and the laptop move
    G.bulb.intensity = 1.15 + (Math.random() < .02 ? -.6 : 0) + Math.sin(t * 50) * .01;
    if (G.tvCtx && Math.floor(t * 12) !== G.tvT) { G.tvT = Math.floor(t * 12); drawTV(G.tvCtx, 512, 300, t); G.tvTex.needsUpdate = true; const c = CHANNELS[S().tv % CHANNELS.length].col[1]; G.tvLight.color.set(c); G.tvLight.intensity = .5 + Math.random() * .15; }
    if (G.lapCtx && Math.floor(t * 4) !== G.lapT) { G.lapT = Math.floor(t * 4); drawLaptop(G.lapCtx, 512, 320, t); G.lapTex.needsUpdate = true; }
    // you: where you stand, the way you face, hunched and breathing
    const Y = G.you; Y.position.set(ex, 1.6 + bob, ez); Y.rotation.y = eyaw + Math.PI;
    G.head.rotation.set(-epitch + Math.sin(t * 13) * shake * .03, Math.sin(t * 9) * shake * .03, Math.sin(t * .8) * .03);
    Y.userData.body.position.y = Math.sin(t * 1.7) * .004; Y.userData.body.rotation.z = Math.sin(t * 11) * shake * .006;
    // look into the mirror too long and your reflection's mouth starts to open
    const staring = -Math.sin(eyaw) > .85 && Math.abs(ez - MZ) < .8 && BX1 - ex < 2.6 && (ex > BX0 || doorOpen()) && Math.abs(epitch) < .5 && (!G.busy || ln > .5);
    G.stare = staring ? G.stare + dt : Math.max(0, G.stare - dt * 3);
    const open = Math.min(1, Math.max(0, (G.stare - 2.5) / 1.4)); G.jaw.position.y = Y.userData.jawY - open * .013; G.jaw.rotation.x = open * .1; // only a little: the painted mouth stays a black hole
    if (open >= 1 && !G.stung) { G.stung = 1; if (typeof L2Demon !== 'undefined' && L2Demon.sting) try { L2Demon.sting(); } catch (_) { } toast('🪞 Don\'t look at it for too long.'); }
    if (!G.stare) G.stung = 0;
    // focus
    if (Math.floor(t * 8) !== G.ft) { G.ft = Math.floor(t * 8); const u = G.busy ? null : pick(); const pr = G.root.querySelector('.l3-prompt'); pr.textContent = u ? u.label : ''; pr.classList.toggle('on', !!u); }
    G.root.style.setProperty('--blur', v < 15 ? ((15 - v) / 15 * 1.6).toFixed(2) + 'px' : '0px'); G.root.classList.toggle('sick', v < 35);
    G.renderer.render(G.scene, cam);
    G.raf = requestAnimationFrame(frame);
  }
  function hud() {
    if (!G) return; const st = S(), v = st.drink, r = G.root;
    r.querySelector('.l3-drink i').style.width = Math.round(v) + '%'; r.querySelector('.l3-drink em').textContent = stateOf(v) + (st.calm > 0 ? ' · 💊 calmer' : ''); r.querySelector('.l3-drink').classList.toggle('low', v < 35);
    r.querySelector('.l3-cash').textContent = money(st.cash); r.querySelector('.l3-goal i').style.width = Math.min(100, st.cash / GOAL * 100) + '%';
    r.querySelector('.l3-cans').textContent = `🍺 ${st.cans} in the fridge${st.order ? ' · a delivery is coming' : ''}`;
  }

  /* ---------- things in the room ---------- */
  const A = {
    async fridge() {
      const st = S();
      const c = await choose(`The fridge. ${st.cans ? `${st.cans} can${st.cans > 1 ? 's' : ''} of the cheap lager on the shelf, and nothing else but a lemon gone grey.` : 'Empty, apart from a lemon gone grey. The light inside is the warmest thing in the room.'} Postcards on the door, and a leaflet.`, [...(st.cans ? [['drink', '🍺 Drink a can (the drink +30)']] : []), ['leaflet', '📄 Read the leaflet on the door'], ['cards', '🖼️ Look at the postcards'], ['list', '📝 Read the list stuck to the door'], ['no', 'Close it']]);
      if (c === 'drink') { st.cans--; st.drink = Math.min(100, st.drink + 30); App.count('l3_cans'); App.save(); hud(); await say([{ text: pickOne(['*Ssssk.* Warm before it\'s halfway down. Your hands stop. Your head stops. Everything stops, for a bit.', 'You drink it standing at the open fridge, in its light, like a man at a shrine.', 'It doesn\'t taste of anything any more. That isn\'t why you drink it.']) }]); if (!st.cans && !st.order) toast('🍺 That was the last one. The laptop can order more.'); }
      if (c === 'leaflet') await say([{ text: 'ST JUDE\'S RECOVERY CENTRE. Alcohol and gambling. "You don\'t have to do this alone." 0800 17 17 17.' }, { text: 'St Jude\'s. The clinic you woke up in, in the dream. Dr. Okafor was a voice on their helpline, once, at four in the morning. You hung up when she asked your name.' }, { text: 'They\'d want you sober. They\'d want the debt dealt with. Five hundred thousand pounds. You put the leaflet back under its magnet.' }]).then(async () => { if (await choose('0800 17 17 17. Your phone is on the bed, on four per cent.', [['ring', '📞 Ring the number'], ['no', 'Not tonight']]) === 'ring') await ring(); });
      if (c === 'list') return A.list();
      if (c === 'cards') { S().flags.cards = 1; mark('src_cards'); await say([{ text: 'A postcard of a paddle steamer, bought in a charity shop. A beer mat from a pub called the Rusty Spur, which closed in 2009. A calendar page with a lucky 17 on it.' }, { text: 'Sal sent you postcards, in the dream. Nobody has ever sent you a postcard.' }]); }
    },
    async laptop() { openLaptop(); },
    // the bathroom door: it swings; the first time it opens the strip light ticks on, and there's someone in there
    async bathDoor() {
      const st = S(), d = G && G.door; if (!d) return;
      if (d.to) {
        if (G.x > BX0 - .45 && G.x < BX0 + 1.0 && G.z > DZ0 - .25 && G.z < DZ1 + .1) return toast('You\'re standing in the way of it.');
        d.to = 0; st.bathOpen = 0; App.save(); SFX.creak(); setTimeout(() => SFX.latch(), 650); return;
      }
      d.to = 1; st.bathOpen = 1; App.save(); SFX.latch(); setTimeout(() => SFX.creak(), 80);
      if (st.flags.bathSeen) return;
      st.flags.bathSeen = 1; App.save(); G.busy++;
      const set = k => { if (G && G.bathL) { G.bathL.intensity = 1.5 * k; G.stripM.emissiveIntensity = .9 * k; } };
      for (const [ms, k] of [[380, .7], [450, 0], [660, 1], [720, .1], [930, 1]]) setTimeout(() => set(k), ms); // a fluorescent tube, catching
      await new Promise(r => setTimeout(r, 1050)); if (!G) return;
      if (typeof L2Demon !== 'undefined' && L2Demon.sting) try { L2Demon.sting(); } catch (_) { }
      G.jolt = .9; G.busy = Math.max(0, G.busy - 1);
      await say([{ text: '*Someone is standing in there.*' }, { text: 'At the back of the bathroom, under the strip light: tall, thin, hunched, the face a grey smear, looking straight at you.' }, { text: 'It\'s the mirror. Only the mirror, over the basin. It\'s you.' }, { text: '*You knew that. Your heart didn\'t.*' }]);
    },
    async cabinet() {
      const st = S(); if (st.pills == null) st.pills = 12; if (G && G.cab) G.cab.to = 1; SFX.latch();
      const n = st.pills, shaky = st.drink < 35;
      const why = n < 2 ? '' : st.calm > 0 ? ' You took two not long ago. Any more and it\'s your liver, not your hands.' : !shaky ? ' Not yet. Save them for when the shakes come.' : '';
      const c = await choose(`The cabinet. A razor you don't use, a brown bottle of something prescribed to someone else, toothpaste rolled up to the end${n >= 2 ? `, and a box of paracetamol: ${n} left.` : '. The paracetamol box is empty.'}${why}`, [...(n >= 2 && shaky && !(st.calm > 0) ? [['take', '💊 Take two for the shakes']] : []), ['no', 'Close it']]);
      if (c === 'take') {
        st.pills -= 2; st.calm = CALM; App.count('l3_pills'); App.save(); hud(); SFX.pills();
        await say([{ text: pickOne(['Two, dry, with your head under the tap. They won\'t stop it. They take the edge off, for a while: long enough to think.', 'You swallow two and hold on to the basin until your hands are your own again. Nearly.']) }, { text: '*For a while the shakes are quieter, and the drink lasts longer.*' }]);
      }
      if (G && G.cab) G.cab.to = 0; setTimeout(() => SFX.latch(), 450);
    },
    async toilet() {
      const c = await choose('The toilet. The seat is cracked and the handle has to be held down.', [['use', '🚽 Use it'], ['flush', 'Just flush it'], ['no', 'Leave it']]);
      if (c === 'no') return;
      if (G && G.lid) G.lid.to = 1;
      if (c === 'use') { App.count('l3_loo'); SFX.trickle(); await say([{ text: pickOne(['*You go.* It takes a long time and it\'s a colour it shouldn\'t be. You don\'t look at it for long.', 'You sit, because standing is harder than it used to be. The tiles count themselves. Twenty-two across. Twenty-two.', '*You go.* The most useful thing you\'ve done all day.']) }]); }
      SFX.flush(); await say([{ text: pickOne(['*It takes three goes. The cistern fills like a long sigh.*', '*The flush roars and gurgles, and for a moment the flat sounds busy.*']) }]);
    },
    async shower() {
      SFX.shower();
      await say([{ text: 'The shower. The tray has gone black round the plughole and the curtain has grown a map of somewhere you\'ll never go. A bottle of shampoo, dried to a crust.' }, { text: '*You turn the dial. The pipes knock. You turn it off again.*' }, { text: 'What\'s the point? Nobody\'s going to see you. Nobody\'s going to smell you. You gave up on being clean around the time you gave up on being anyone.' }]);
    },
    async mirror() {
      const st = S(); mark('mirror'); Career.checkAchievements();
      if (G) { G.leanT = 1; G.stare = 0; } const back = () => { if (G) G.leanT = 0; };
      if (!st.flags.mirror) { st.flags.mirror = 1; App.save(); return say([{ text: '*You look up from the basin.*' }, { text: 'Too tall for the mirror. Starved thin, hunched, the ribs showing through a dressing gown gone grey. The head hangs forward on its neck like it\'s too heavy. Two red points where the eyes should be.' }, dry() ? { text: 'It moves when you move. It\'s you. In the dreams you kept it away: not a drop, not once, and it never got near you. But it was here all along, in the glass, waiting for you to wake up.' } : { text: 'It moves when you move. It\'s you. It was always you. The thing that hunted you through the Meridian was only ever this: a man in a room, and what the drink has made of him.' }]).then(back); }
      return say([{ text: pickOne(['It\'s still you.', 'You make yourself look. It looks back.', 'You try smiling. The jaw hangs open instead.']) }]).then(back);
    },
    async door() {
      S().drink = Math.max(1, S().drink - 2); hud();
      if (S().order === 'here') { S().order = 0; S().cans += 8; mark('delivered'); App.save(); hud(); return say([{ text: '*You open the door on the chain, just wide enough to pull the carrier bag in. Eight cans. The stairwell is empty. Nobody is ever there.*' }]); }
      await say([{ text: pickOne(['Your hand on the latch. The landing beyond it, the stairs, the street, the people. Your heart goes like a bird in a box. Not today.', 'You stand at the door for a long time. You don\'t open it.', 'The last time you went out was in June. You think it was June.']) }]);
    },
    async letters() {
      mark('src_letters');
      await say([{ text: 'A drift of envelopes nobody has opened since the spring. You open them now.' }, { text: 'VINNIE\'S LOANS LTD: £120,000. LUCKYSTRIKE.BET CREDIT: £88,400. KESSLER CAPITAL (debt purchase): £143,000. Three credit cards. The council. HMRC. A payday lender called Big Nico.' }, { text: 'At the bottom, in your own handwriting on the back of one: £500,000. Then a 17, underlined twice.' }, { text: 'Vinnie. Kessler. Nico. The dream gave them faces.' }]);
    },
    async photo() {
      mark('src_photo');
      await say([{ text: 'A family on a beach, laughing: a woman with her hair blowing across her face, a girl of about nine, a little boy on his dad\'s shoulders.' }, { text: 'Nora. Ellie. Sam.' }, { text: 'There\'s a sticker in the corner: SAMPLE, FRAME £4.99. It\'s the photo the frame came with. You bought it on the market and never took the picture out. You gave them names. You gave them a whole life.' }, { text: 'Nobody died. Nobody was ever here.' }]);
    },
    async list() { openList(); },
    async chair() {
      const c = await choose('The armchair. It has your shape worn into it.', [['sit', 'Sit and watch the television'], ['no', 'Not now']]);
      if (c !== 'sit') return; S().drink = Math.max(1, S().drink - 4); hud();
      await say([{ text: pickOne(['You sit. On the television, someone wins a car. The audience goes wild. You don\'t move for an hour.', 'You sit in the dent you\'ve made in it. The remote is where it always is. The channels are all the same people.', 'The springs complain. You look at the door for a long time, and then at the fridge, and then at the door.']) }]);
    },
    async calendar() { mark('src_calendar'); await say([{ text: 'October. Nothing in any of the squares except the 17th, circled so hard the pen went through. You can\'t remember why. You never could.' }]); },
    async bed() { const c = await choose('The bed. The sheets haven\'t been changed since the summer.', [['lie', 'Lie down for a while'], ['no', 'Not yet']]); if (c !== 'lie') return; S().drink = Math.max(1, S().drink - 12); hud(); await say([{ text: 'The ceiling has a stain shaped like a river. You lie and look at it until it stops looking like anything, and you dream, for a minute, of a bright little town where everyone you never had is only missing.' }]); },
    async window() { mark('src_window'); await say([{ text: '*You lift one slat of the blind.* Across the road, the bookmaker\'s sign: MERIDIAN BETS. Rain on the glass. A bus going somewhere. You let the slat fall.' }]); },
    async books() { mark('src_books'); await say([{ text: 'Paperbacks. "Beat the Dealer". A darts annual from 1984 with a man called Mick on the cover. A thriller, dog-eared: "The Seventeenth Card". A book about grief you bought for someone you never knew.' }, { text: 'All the stories you borrowed.' }]); },
    async radio() {
      mark('src_radio');
      const st = S(); const c = await choose('An old radio. One station comes in clearly.', [['spur', '📻 Country and honky-tonk'], ['riverboat', '📻 Old jazz'], ['off', 'Turn it off']]);
      st.radio = c === 'off' ? null : c; App.save(); if (typeof Music !== 'undefined' && Music.refresh) Music.refresh(); if (c !== 'off') toast(c === 'spur' ? '📻 A piano somewhere, and a woman laughing. It sounds like the Spur.' : '📻 A clarinet, a crackle. It sounds like the riverboat.');
    },
    async tv() {
      mark('src_tv');
      const st = S(); st.tv = (st.tv + 1) % CHANNELS.length; st.flags['tv' + st.tv] = 1; App.save();
      const ch = CHANNELS[st.tv]; await say([{ text: `*Click.* ${ch.name}.` }, { text: ch.line }]);
      if (CHANNELS.every((_, i) => st.flags['tv' + i]) && !st.flags.allTv) { st.flags.allTv = 1; mark('tvall'); await say([{ text: 'Every face from the dream is on this television. You took them, one by one, and gave them to yourself as friends.' }]); }
    },
    async darts() {
      const c = await choose('The dartboard. Three darts in the treble twenty, where you left them. Mick says he\'ll give you a game. Mick always says that.', [['play', '🎯 A leg of 301 with Mick'], ['no', 'Not now']]);
      if (c !== 'play') return;
      toGame(() => Darts.match({ mode: 'x01', start: 301, legs: 1, opp: { name: 'Mick (who isn\'t there)', face: '🎯', sigma: 12 }, stake: 0, title: 'Mick · 301 in the bedsit', l3: true }));
    },
  };
  const pickOne = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- the list on the fridge: Level 3's goals ---------- */
  // ticked by what you do (counters on the save, so they stay ticked if you wake up in the bedsit again)
  const SRC = ['tv', 'photo', 'letters', 'cards', 'books', 'calendar', 'window', 'radio'];
  const got = k => App.counter('l3_' + k) > 0, peak = () => App.counter('l3_peak');
  const GOALS = [
    ['mirror', 'Look yourself in the eye', () => got('mirror')],
    ['sources', 'Find where it all came from: the TV, the photo, the letters, the postcards, the books, the calendar, the window, the radio', () => SRC.every(k => got('src_' + k)), () => `${SRC.filter(k => got('src_' + k)).length} of 8`],
    ['tvall', 'Watch every channel', () => got('tvall')],
    ['mick', 'Beat Mick at darts', () => App.counter('l3_dartswin') > 0],
    ['called', 'Ring the number on the leaflet, and tell them your name', () => got('called')],
    ['delivered', 'Get a delivery to the door', () => got('delivered')],
    ['x10', 'Win ten times your stake on one bet', () => got('x10')],
    ['x100', 'Win a hundred times your stake on one bet', () => got('x100')],
    ['auto', 'Let an autobet run fifty bets', () => got('auto50')],
    ['k10', 'Get to £10,000', () => peak() >= 1e4, () => `best ${money(peak() || START)}`],
    ['k100', 'Get to £100,000', () => peak() >= 1e5, () => `best ${money(peak() || START)}`],
    ['out', 'Pay them all back. Walk out of the door.', () => !!(S().endings || {}).rehab, () => `${money(GOAL)}`],
  ];
  const goalsDone = () => GOALS.filter(g => g[2]()).length;
  function mark(k) {
    const before = GOALS.filter(g => g[2]()).map(g => g[0]);
    if (!got(k)) App.count('l3_' + k);
    const now = GOALS.filter(g => g[2]() && !before.includes(g[0]));
    for (const g of now) toast(`📝 Crossed off the list: ${g[1].split(':')[0]}`);
    if (now.length) Career.checkAchievements();
  }
  function notePeak(v) { const c = App.state.stats.counters; if (v > (c.l3_peak || 0)) { const was = c.l3_peak || 0; c.l3_peak = Math.round(v); for (const [k, n] of [['k10', 1e4], ['k100', 1e5]]) if (was < n && v >= n) toast(`📝 Crossed off the list: Get to ${money(n)}`); Career.checkAchievements(); } }
  function openList() {
    if (document.querySelector('.l3-listbg')) return;
    if (G) G.busy++;
    const close = () => { o.remove(); if (G) G.busy = Math.max(0, G.busy - 1); };
    const E = S().endings || {}, END = [['rehab', 'Day One'], ['collapse', 'Last Orders'], ['broke', 'The House Always Wins']];
    const o = h('div.l3-listbg', { onclick: e => { if (e.target === o) close(); } }, h('div.l3-paper',
      h('h3', 'THINGS TO DO'), h('small', `in your own handwriting · ${goalsDone()} of ${GOALS.length} crossed off`),
      h('ul', GOALS.map(([k, label, done, prog]) => h('li' + (done() ? '.done' : ''), h('span.l3-tick', done() ? '☑' : '☐'), h('span', label, prog && !done() ? h('em', ` (${prog()})`) : null)))),
      h('p.l3-ends', 'Ways it ends: ', END.map(([k, n]) => h('b' + (E[k] ? '.found' : ''), E[k] ? n : '?'))),
      h('button.l3-btn', { onclick: close }, 'Stick it back on the fridge')));
    document.body.append(o);
  }
  // the helpline: the same voice as the dream's doctor
  async function ring() {
    await say([{ text: '*It rings four times. Then a woman answers, and her voice is calm and unhurried, and you know it from somewhere.*' }, { who: 'St Jude\'s', text: 'St Jude\'s helpline, you\'re through to Dr. Okafor. Take your time. Are you safe tonight?' }, { who: 'You', text: '...I don\'t know.' }, { who: 'St Jude\'s', text: 'That\'s all right. That\'s an honest answer. Can you tell me your name?' }]);
    const c = await choose('She waits. She doesn\'t mind waiting.', [['name', 'Tell her your name'], ['hang', 'Hang up']]);
    if (c === 'hang') return say([{ text: 'You hang up. Your hand is shaking so much the phone rattles on the bed. But you rang. You\'ve never rung before.' }]);
    mark('called');
    await say([{ who: 'You', text: `It\'s ${(App.state.name || 'me').split(' ')[0]}.` }, { who: 'St Jude\'s', text: `Hello, ${(App.state.name || 'you').split(' ')[0]}. Thank you. Tell me about tonight.` }, { text: 'You tell her about the drink, and the money, and the laptop that\'s always open. You don\'t tell her about the town. She doesn\'t ask you to do anything except ring again.' }, ...(dry() ? [{ text: 'You do tell her one thing: in your dreams you never drink. You walk straight past it. She\'s quiet for a moment. "Then part of you already knows what it wants," she says. "That\'s the part we\'ll work with."' }] : []), { text: 'When you put the phone down an hour later nothing has changed, and something has.' }]);
  }

  /* ---------- the laptop: every game from the dreams, with real money ---------- */
  // lap: opened from the laptop, so leaving it comes back to the laptop's games
  function toGame(go, lap) {
    const st = S(); st.atTable = true; st.fromLaptop = !!lap; st.dreamBank = App.state.bank; st.dreamVenue = App.state.venue; st.before = st.cash;
    App.state.bank = st.cash; App.state.venue = 'palace'; if (G) st.pos = { x: G.x, z: G.z, yaw: G.yaw }; App.save(); go(); lapStart(); lapHud();
  }
  function back() {
    const st = S(); lapStop(); if (!st.atTable) return;
    st.cash = Math.round(App.state.bank * 100) / 100; notePeak(st.cash); App.state.bank = st.dreamBank; App.state.venue = st.dreamVenue || App.state.venue; st.atTable = false;
    const diff = st.cash - (st.before || st.cash); if (diff < 0) st.lost += -diff; App.save();
  }
  function openLaptop() {
    if (document.querySelector('.l3-laptop')) return; // already open
    const st = S(); if (G) G.busy++;
    const o = h('div.l3-laptop'), close = () => { o.remove(); if (G) G.busy = Math.max(0, G.busy - 1); };
    const games = ['bj', 'uth', 'tcp', 'ms', 'lir', 'c4', 'bac', 'craps', 'roulette', 'war'].filter(g => GAMES[g]);
    const slots = ['spur', 'riverboat', 'palace', 'salon'].filter(v => SLOT_MACHINES[v]);
    const card = (icon, name, sub, fn) => h('button.l3-game', { onclick: () => { close(); fn(); } }, h('span', icon), h('b', name), h('small', sub));
    o.append(h('div.l3-lap',
      h('div.l3-lap-h', h('b', 'LuckyStrike.bet'), h('span', `Balance ${money(st.cash)}`), h('button.l3-x', { onclick: close, 'aria-label': 'Close the laptop' }, '×')),
      h('p.l3-lap-note', `You owe ${money(GOAL)}. Win it and you could clear the lot. Lose it all and that\'s the end of the money.`),
      h('div.l3-goal2', h('i', { style: { width: Math.min(100, st.cash / GOAL * 100) + '%' } }), h('span', `${money(st.cash)} of ${money(GOAL)}`)),
      typeof Originals !== 'undefined' ? [h('h4', '⚡ Originals · autobet'), h('div.l3-grid', Object.entries(Originals.GAMES).map(([k, g]) => card(g.icon, g.name, g.blurb, () => toGame(() => Router.go('originals', k), true))))] : null,
      h('h4', 'Tables'), h('div.l3-grid', games.map(g => card('🂡', GAMES[g].name, 'Live dealer', () => toGame(() => Router.openTable(g), true)))),
      h('h4', 'Slots'), h('div.l3-grid', slots.map(v => card('🎰', SLOT_MACHINES[v].name, 'Jackpots', () => toGame(() => Router.go('slots', v), true)))),
      h('h4', 'Poker'), h('div.l3-grid', card('♠', 'Tournaments', 'Sit and go, every hour', () => toGame(() => Router.go('poker'), true))),
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
        ...(st.dry ? [{ text: 'In the dreams you\'d already said no a thousand times: to every bar in the town, to every bottle in the city. It turns out that was practice.' }] : []),
        { text: 'You keep the photo in the frame. You never did take it out. You just stopped needing it to be true.' }] },
      collapse: { title: 'Last Orders', kind: 'A bad true ending', lines: [
        { text: 'The shaking stops being in your hands and starts being everywhere. The room tilts. The fridge hums. You are on the carpet, and the carpet is very soft, and very far away.' },
        { text: 'In the mirror over the basin, nothing moves.' },
        ...(st.dry ? [{ text: 'You stayed dry in every dream. Some part of you was trying to tell you. You just couldn\'t hear it awake.' }] : []),
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
    const fromLap = st.atTable && st.fromLaptop; back();
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
      ...(dry() ? [{ text: 'In the dreams you never touched a drop. Not in the town, not in the city: you walked past every bar and every bottle and you never knew why.' }, { text: 'Now you do. That was the part of you that still knows, telling you the one thing you won\'t tell yourself awake: deal with it.' }] : []),
      { text: 'Your hands are shaking. There are three cans in the fridge.' }]), 600); }
    else setTimeout(() => { if (S().drink <= 0) return collapse(); checkEnd(); if (fromLap && G && !S().ended && !document.querySelector('.l3-say, .l3-laptop, .l3-end')) openLaptop(); }, 400); // back to the laptop's games, not the room
  }
  async function menu() {
    const c = await choose('☰', [['list', `📝 The list on the fridge (${goalsDone()} of ${GOALS.length})`], ['save', '💾 Save'], ['gfx', `Graphics: ${App.state.settings.gfx === 'low' ? 'low (faster)' : 'high'}`], ['sound', `Sound: ${App.state.settings.sound !== false ? 'on' : 'off'}`], ['restart', '↺ Wake up in the bedsit again (start Level 3 over)'], ['title', 'Back to the title'], ['no', 'Close']]);
    if (c === 'list') openList();
    if (c === 'save') { savePos(); App.save(); toast('Saved.'); }
    if (c === 'restart') restart();
    if (c === 'gfx') { App.state.settings.gfx = App.state.settings.gfx === 'low' ? 'high' : 'low'; savePos(); App.save(); unmount(); Router.go('bedsit'); }
    if (c === 'sound') { App.state.settings.sound = App.state.settings.sound === false; App.save(); }
    if (c === 'title') { savePos(); App.save(); unmount(); Router.go('title'); }
  }
  function savePos() { if (G) S().pos = { x: G.x, z: G.z, yaw: G.yaw }; }
  function unmount() {
    if (!G) return; savePos(); cancelAnimationFrame(G.raf); removeEventListener('keydown', G.kd); document.removeEventListener('click', G.ck, true); removeEventListener('keyup', G.ku); removeEventListener('resize', resize);
    try { G.renderer.dispose(); G.renderer.forceContextLoss && G.renderer.forceContextLoss(); } catch (_) { }
    G = null; document.body.classList.remove('bedsit'); document.querySelectorAll('.l3-say,.l3-laptop,.l3-toast').forEach(n => n.remove());
  }
  // the way in: the roof of the Meridian, a reflection in the black glass of the door
  async function begin() { if (!App.state.l3) App.state.l3 = fresh(); App.save(); Router.safeGo('bedsit'); } // safeGo: not from the middle of a hand // a room you've already woken in is as you left it (☰ starts it over)

  return { GOALS, goalsDone, openList, screen, unmount, begin, roundNeeds, lapHud, back, checkEnd, ending, restart, GOAL, START, money, get state() { return S(); }, get G() { return G; }, A, openLaptop, CHANNELS };
})();
