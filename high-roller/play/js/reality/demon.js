/* The Barman, what the bottle sends after you in Level 2. You never get a good look at it. It's too
   tall and starved thin, hunched forward on legs that bend wrong, arms hanging past its knees, in a
   barman's white jacket gone grey and stained, a towel over one arm. Where its face should be there's
   only black, two red points, and a split that might be a grin. Smoke comes off it, and a low red
   heat. It hides: you catch it standing very still at the far end of a room, and when you look again
   there's nothing there. When it hunts you it does it for a while: it steps out from round a corner,
   comes at you in jerky stop-motion bursts, goes up in smoke, and steps out again somewhere closer.
   It doesn't like the light.
   When it catches you, you see its face for the first time. It's yours: your skin, your hair, your
   glasses, a few years and a lot of bottles from now. Grey, gaunt, eyes sunk into the skull,
   lips cracked. Dead.
   Everything it sounds like is made here with Web Audio (no files): a low drone that swells as it
   closes in, wet ragged breathing, scraping whispers, and a scream when it gets you. */
const L2Demon = (() => {
  const mix = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.replace('#', '').padEnd(6, '0').slice(i - 1, i + 1), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const looks = () => (typeof Looks !== 'undefined' ? Looks.get() : { skin: '#f0c19a', hair: '#3a2a1e', style: 'short', beard: '', glasses: false, shirt: '#4a7a46' });

  /* ---------- the shape ---------- */
  // a thing in the world (engine.js draws it in depth order with everything else)
  // modes: 'stand' (watching from the dark), 'appear', 'stalk' (coming for you in jerky bursts),
  // 'vanish' (gone into smoke). It draws itself; engine.js sorts it in among everything else.
  function make() {
    const d = { kind: 'demon', x: 0, y: 0, mode: 'stand', fade: 0, want: 1, pace: 1, phase: Math.random() * 9, smoke: [], dir: 1, pose: 0 };
    d.inLight = () => (R3.map ? R3.map.lights : []).some(l => Math.hypot(l.x - d.x, l.y - d.y) < l.r * .5 && (l.i || 1) > .4);
    d.update = (t, dt, dist) => {
      d.phase += dt;
      const lit = d.inLight();
      if (d.mode === 'stand') d.want = dist < 5 || lit ? 0 : 1;
      else if (d.mode === 'vanish') d.want = 0;
      else d.want = 1;
      d.fade += (d.want - d.fade) * Math.min(1, dt * (d.want < d.fade ? (d.mode === 'vanish' ? 3 : 5) : 2.5));
      d.pose = Math.floor(d.phase / .16) % 4; // stop-motion: it doesn't move smoothly, it jumps between poses
      if (d.want < d.fade || d.mode === 'appear' || Math.random() < dt * 4) d.smoke.push({ x: (Math.random() - .5) * 26, y: -Math.random() * 20, r: 6 + Math.random() * 10, life: 1, vy: -10 - Math.random() * 20 });
      for (const p of d.smoke) { p.life -= dt * 1.2; p.y += p.vy * dt; p.r += dt * 8; } d.smoke = d.smoke.filter(p => p.life > 0).slice(-30);
    };
    d.draw = (c, sx, sy, z, t) => {
      if (d.fade < .02 && !d.smoke.length) return;
      c.save(); c.translate(sx, sy); c.scale(z * 1.45, z * 1.45);
      // smoke at its feet, and a low red heat
      const g = c.createRadialGradient(0, -6, 2, 0, -6, 40); g.addColorStop(0, `rgba(200,20,10,${.45 * d.fade})`); g.addColorStop(1, 'rgba(60,0,0,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(-40, -46, 80, 80); c.globalCompositeOperation = 'source-over';
      for (const p of d.smoke) { c.fillStyle = `rgba(10,4,6,${.5 * p.life * Math.max(.3, d.fade)})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
      c.globalAlpha = d.fade;
      // flickers like a bad signal when it's coming or going
      if ((d.mode === 'vanish' || d.mode === 'appear') && Math.random() < .3) { c.restore(); return; }
      c.scale(d.dir, 1);
      const stalk = d.mode === 'stalk', P = d.pose, lean = stalk ? .22 : .12, step = stalk ? [-5, 3, 5, -3][P] : 0, twitch = [0, 1.5, -1, .5][P];
      c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(0, 0, 13, 5, 0, 0, 7); c.fill();
      // legs: too long, bent the wrong way
      const leg = (k) => { c.beginPath(); c.moveTo(k * 4, -40); c.lineTo(k * 6 + step * k, -20); c.lineTo(k * 3 + step * k * 1.4, 0); c.lineWidth = 5; c.strokeStyle = '#050304'; c.lineCap = 'round'; c.stroke(); };
      leg(-1); leg(1);
      c.save(); c.translate(0, -40); c.rotate(lean);
      // the jacket: a barman's white, gone grey and stained, hanging off a body like a coat hanger
      const jacket = new Path2D(); jacket.moveTo(-11, -44); jacket.quadraticCurveTo(0, -50, 12, -44); jacket.lineTo(10, 2); jacket.lineTo(-10, 2); jacket.closePath();
      c.fillStyle = '#4e493d'; c.fill(jacket); c.fillStyle = 'rgba(60,10,10,.55)'; c.beginPath(); c.ellipse(4, -18, 5, 9, .3, 0, 7); c.ellipse(-5, -6, 4, 6, 0, 0, 7); c.fill();
      c.fillStyle = '#0a0606'; c.beginPath(); c.moveTo(-3, -46); c.lineTo(3, -46); c.lineTo(1, 0); c.lineTo(-1, 0); c.fill(); // black under the jacket
      c.strokeStyle = 'rgba(170,20,10,.55)'; c.lineWidth = 1.4; c.shadowColor = '#ff1a0a'; c.shadowBlur = 6; c.stroke(jacket); c.shadowBlur = 0;
      // arms: down past its knees, fingers like wet twigs; reaching when it comes for you
      for (const k of [-1, 1]) {
        const reach = stalk && k === 1, ax = reach ? 30 : k * 13 + twitch, ay = reach ? -24 + twitch * 2 : 34;
        c.beginPath(); c.moveTo(k * 11, -42); c.quadraticCurveTo(k * 16, -10, ax, ay); c.lineWidth = 4.5; c.strokeStyle = k === -1 ? '#36322a' : '#45403a'; c.stroke();
        c.lineWidth = 1.4; c.strokeStyle = '#140c0c'; for (let f = -1; f <= 1; f++) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + (reach ? 9 : f * 3), ay + (reach ? f * 4 : 9)); c.stroke(); }
      }
      if (!stalk) { c.fillStyle = '#6e6858'; c.fillRect(-15, -26, 5, 12); } // a bar towel over one arm
      // the head: hanging forward on a long neck, no face at all, just two red points and a long split
      c.translate(0, -48); c.rotate(.25 + twitch * .04);
      c.fillStyle = '#060304'; c.beginPath(); c.ellipse(3, -8, 8, 10.5, .2, 0, 7); c.fill();
      c.strokeStyle = 'rgba(120,0,0,.6)'; c.lineWidth = 1; c.beginPath(); c.ellipse(3, -8, 8, 10.5, .2, 0, 7); c.stroke();
      const eye = .7 + Math.sin(t * 9) * .3; c.fillStyle = `rgba(255,${40 * eye | 0},20,${eye})`; c.shadowColor = '#ff2010'; c.shadowBlur = 8; c.beginPath(); c.arc(5, -10, 1.3, 0, 7); c.arc(9.5, -9.5, 1.1, 0, 7); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = `rgba(160,10,10,${.6 * d.fade})`; c.lineWidth = 1; c.beginPath(); c.moveTo(1, -3); c.quadraticCurveTo(6, 1, 11, -4); c.stroke(); // a grin that goes too far
      c.fillStyle = 'rgba(10,4,6,.8)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(1 + i * 4, 3 + ((t * 20 + i * 7) % 14), .8, 1.8, 0, 0, 7); c.fill(); } // it drips
      c.restore(); c.restore();
    };
    d.vx = d.vy = 0; d.top = () => false;
    R3.api.add(d); return d;
  }
  function remove(d) { const M = R3.map; if (M) { const i = M.things.indexOf(d); if (i >= 0) M.things.splice(i, 1); } }

  /* ---------- its face, which is yours ---------- */
  // painted, not modelled: a close-up portrait of you, dead. Your skin drained grey-green, your hair
  // thinned and greyed, your beard and glasses if you have them, eyes sunk into black sockets,
  // cheeks fallen in, lips shrunk back off the teeth. Painted on a gently curved surface in two
  // halves, so the jaw can drop away from the face onto black.
  const W = 512, H = 704, MOUTH = .655; // the split between face and jaw, as a fraction of the height
  const faceCache = {};
  function paintFace(L) {
    const key = [L.skin, L.hair, L.style, L.beard, L.glasses].join(); if (faceCache[key]) return faceCache[key];
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const cx = W / 2, sk = mix(mix(L.skin, '#7d8a76', .55), '#4b5048', .1), rgb = [1, 3, 5].map(i => parseInt(sk.slice(i, i + 2), 16));
    const tone = (k, a = 1) => `rgba(${Math.min(255, rgb[0] * k) | 0},${Math.min(255, rgb[1] * k) | 0},${Math.min(255, rgb[2] * k) | 0},${a})`;
    const blob = (x, y, rx, ry, col, col2 = 'rgba(0,0,0,0)') => { g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, col); gr.addColorStop(1, col2); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
    // the head: long and narrow, pinched at the temples and under the cheekbones
    const head = new Path2D(); head.moveTo(cx, 40); head.bezierCurveTo(cx + 175, 40, cx + 200, 200, cx + 168, 270); head.bezierCurveTo(cx + 150, 330, cx + 175, 400, cx + 150, 470);
    head.bezierCurveTo(cx + 125, 590, cx + 70, 690, cx, 700); head.bezierCurveTo(cx - 70, 690, cx - 125, 590, cx - 150, 470); head.bezierCurveTo(cx - 175, 400, cx - 150, 330, cx - 168, 270); head.bezierCurveTo(cx - 200, 200, cx - 175, 40, cx, 40);
    g.save(); g.clip(head);
    const base = g.createRadialGradient(cx, 330, 40, cx, 330, 330); base.addColorStop(0, tone(1.05)); base.addColorStop(.6, tone(.8)); base.addColorStop(1, tone(.25)); g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) blob(Math.random() * W, Math.random() * H, 8 + Math.random() * 40, 8 + Math.random() * 40, `rgba(${50 + Math.random() * 50},${30 + Math.random() * 30},${40 + Math.random() * 30},.16)`); // mottled
    // hollow temples and cheeks, a jaw you can see the bone of
    for (const sx of [-1, 1]) { blob(cx + sx * 150, 250, 70, 110, 'rgba(10,6,10,.75)'); blob(cx + sx * 105, 470, 70, 95, 'rgba(12,6,12,.8)'); blob(cx + sx * 110, 395, 60, 22, tone(1.35, .8)); blob(cx + sx * 85, 600, 60, 40, 'rgba(10,5,10,.5)'); }
    // the forehead, lined
    g.strokeStyle = 'rgba(20,10,15,.45)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - 110, 150 + i * 22); g.quadraticCurveTo(cx, 138 + i * 22 + (i % 2) * 6, cx + 110, 150 + i * 22); g.stroke(); }
    // the sockets: deep and black, the bone of the brow catching the light above them
    for (const sx of [-1, 1]) {
      blob(cx + sx * 72, 292, 88, 70, 'rgba(0,0,0,.98)', 'rgba(20,5,15,0)'); blob(cx + sx * 72, 296, 50, 36, 'rgba(0,0,0,1)', 'rgba(0,0,0,.6)');
      blob(cx + sx * 70, 232, 85, 18, tone(1.4, .7)); blob(cx + sx * 75, 350, 70, 26, 'rgba(70,20,50,.65)'); // brow, and the bruised bags under the eyes
    }
    // the nose: a thin bridge, a sharp tip, black nostrils
    blob(cx, 360, 16, 90, tone(1.35, .55)); blob(cx - 22, 435, 12, 7, 'rgba(0,0,0,.95)'); blob(cx + 22, 435, 12, 7, 'rgba(0,0,0,.95)'); blob(cx, 418, 24, 16, tone(1.2, .6));
    // broken veins across the cheeks and nose
    g.lineWidth = 1.3; for (let i = 0; i < 160; i++) { const sx = Math.random() < .5 ? -1 : 1; let x = cx + sx * (20 + Math.random() * 110), y = 340 + Math.random() * 140; g.strokeStyle = `rgba(${130 + Math.random() * 70},15,${40 + Math.random() * 40},.5)`; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - .5) * 16; y += (Math.random() - .5) * 12; g.lineTo(x, y); } g.stroke(); }
    // the mouth: lips shrunk back off long, yellow teeth, some gone
    const my = H * MOUTH;
    g.fillStyle = 'rgba(25,8,12,1)'; g.beginPath(); g.ellipse(cx, my, 78, 26, 0, 0, 7); g.fill();
    for (let i = 0; i < 9; i++) { if (i === 2 || i === 6) continue; const x = cx - 64 + i * 16, up = my - 2; g.fillStyle = `rgb(${150 + Math.random() * 30},${130 + Math.random() * 20},${70 + Math.random() * 20})`; g.fillRect(x, up - 20, 13, 20); g.fillRect(x + 1, my + 2, 12, 16 + Math.random() * 4); g.fillStyle = 'rgba(60,30,10,.6)'; g.fillRect(x, up - 20, 13, 3); }
    g.strokeStyle = '#3a1c22'; g.lineWidth = 7; g.beginPath(); g.ellipse(cx, my, 80, 28, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.beginPath(); g.ellipse(cx, my, 76, 26, 0, Math.PI * .1, Math.PI * .9); g.stroke(); // what's left of the lips
    g.strokeStyle = 'rgba(10,0,4,.9)'; g.lineWidth = 1; for (let i = 0; i < 16; i++) { const x = cx - 70 + i * 9; g.beginPath(); g.moveTo(x, my - 30); g.lineTo(x + 2, my - 20); g.stroke(); } // cracks
    blob(cx + 76, my + 6, 12, 10, 'rgba(140,20,30,.95)'); // a sore at the corner
    // stubble, or what the beard has become
    if (L.beard) { g.fillStyle = mix(L.hair, '#8c8c8c', .55); g.globalAlpha = .55; for (let i = 0; i < (L.beard === 'stubble' ? 4000 : 8000); i++) { const a = Math.random() * Math.PI, r = 90 + Math.random() * 90; const x = cx + Math.cos(a) * r * 1.05, y = 470 + Math.sin(a) * r * 1.15; if (y > 440) g.fillRect(x, y, 1.6, 3.4); } g.globalAlpha = 1; }
    g.restore();
    // hair: thin, greasy, greyed, in strands
    if (L.style !== 'bald') { const hc = mix(L.hair, '#8a8a8a', .45); g.strokeStyle = hc; g.globalAlpha = .7; for (let i = 0; i < 220; i++) { const a = -Math.PI * .95 + Math.random() * Math.PI * .9, x0 = cx + Math.cos(a) * 160, y0 = 175 + Math.sin(a) * 140; g.lineWidth = .8 + Math.random() * 1.4; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (Math.random() - .5) * 40, y0 + 60, x0 + (x0 < cx ? -10 : 10) + (Math.random() - .5) * 30, y0 + 90 + Math.random() * (L.style === 'long' || L.style === 'bob' ? 260 : 80)); g.stroke(); } g.globalAlpha = 1; }
    // the glasses, one lens cracked
    if (L.glasses) { g.strokeStyle = '#111'; g.lineWidth = 6; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 72, 296, 62, 46, 0, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(cx - 12, 290); g.quadraticCurveTo(cx, 280, cx + 12, 290); g.stroke(); g.strokeStyle = 'rgba(230,230,230,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx + 40, 265); g.lineTo(cx + 70, 300); g.lineTo(cx + 62, 330); g.moveTo(cx + 70, 300); g.lineTo(cx + 108, 290); g.stroke(); }
    return (faceCache[key] = c);
  }
  // the eyes are separate so the lids can open over them: yellowed, bloodshot, the pupils pinned
  let eyeCanvas = null;
  function paintEye() {
    if (eyeCanvas) return eyeCanvas;
    const c = document.createElement('canvas'); c.width = 128; c.height = 96; const g = c.getContext('2d'), w = 128, h = 96;
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * .45); gr.addColorStop(0, '#e6dc9a'); gr.addColorStop(.7, '#b8a24a'); gr.addColorStop(1, '#5a1a10'); g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h / 2, w * .42, h * .34, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(170,10,10,.8)'; g.lineWidth = 1; for (let i = 0; i < 30; i++) { const a = Math.random() * 7; let x = w / 2 + Math.cos(a) * w * .4, y = h / 2 + Math.sin(a) * h * .3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (w / 2 - x) * .2 + (Math.random() - .5) * 6; y += (h / 2 - y) * .2 + (Math.random() - .5) * 6; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = '#4a3a10'; g.beginPath(); g.arc(w / 2, h / 2, 13, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(w / 2, h / 2, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(w / 2 + 7, h / 2 - 6, 3, 0, 7); g.fill();
    return (eyeCanvas = c);
  }

  /* ---------- the sound of it ---------- */
  let ax = null, bus = null, drone = null, breathT = 0, whisperT = 0, near = 0;
  const on = () => App.state && App.state.settings.sound !== false;
  function ctx() {
    if (!ax) { ax = new (window.AudioContext || window.webkitAudioContext)(); bus = ax.createGain(); bus.gain.value = .9; bus.connect(ax.destination); }
    if (ax.state === 'suspended') ax.resume();
    return ax;
  }
  function noiseBuf(sec = 2) {
    const a = ctx(), b = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  const curve = k => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; };
  // a low, sour drone: detuned saws through a lowpass that opens as it closes in
  function startDrone() {
    if (!on() || drone) return;
    try {
      const a = ctx(), out = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.Q.value = 6;
      out.gain.value = 0; out.connect(bus); lp.connect(out);
      const oscs = [41, 43.6, 58.3, 82.4].map(f => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .23; lg.gain.value = 60; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      out.gain.linearRampToValueAtTime(.12, a.currentTime + 2);
      drone = { out, lp, oscs: [...oscs, lfo] };
    } catch (e) { drone = null; }
  }
  function stopDrone() {
    if (!drone) return; const d = drone; drone = null;
    try { const t = ax.currentTime; d.out.gain.cancelScheduledValues(t); d.out.gain.setValueAtTime(d.out.gain.value, t); d.out.gain.linearRampToValueAtTime(0, t + 1.2); d.oscs.forEach(o => o.stop(t + 1.3)); } catch (e) { }
  }
  // one ragged breath, in or out: filtered noise with a shaky envelope
  function breath(v, inhale) {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), len = inhale ? .9 : 1.3;
      src.buffer = noiseBuf(2); bp.type = 'bandpass'; bp.frequency.setValueAtTime(inhale ? 900 : 520, t); bp.frequency.linearRampToValueAtTime(inhale ? 1500 : 300, t + len); bp.Q.value = 2.5;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5 * v, t + len * .35);
      for (let k = 1; k < 6; k++) g.gain.setValueAtTime(.5 * v * (.55 + Math.random() * .45), t + len * (.35 + k * .1)); // the rattle in it
      g.gain.exponentialRampToValueAtTime(.0001, t + len);
      src.connect(bp); bp.connect(g); g.connect(bus); src.start(t); src.stop(t + len + .05);
      if (!inhale) { const o = a.createOscillator(), og = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(52, t + len); og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.09 * v, t + .3); og.gain.exponentialRampToValueAtTime(.0001, t + len); o.connect(og); og.connect(bus); o.start(t); o.stop(t + len); } // a growl under the out-breath
    } catch (e) { }
  }
  // a scrape, or a whisper you almost understand
  function whisper(v) {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, src = a.createBufferSource(), hp = a.createBiquadFilter(), g = a.createGain(), pan = a.createStereoPanner ? a.createStereoPanner() : null;
      src.buffer = noiseBuf(2); hp.type = 'bandpass'; hp.Q.value = 9; hp.frequency.setValueAtTime(2400 + Math.random() * 1800, t);
      for (let k = 0; k < 6; k++) hp.frequency.setValueAtTime(1600 + Math.random() * 3200, t + k * .12);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35 * v, t + .1); g.gain.exponentialRampToValueAtTime(.0001, t + .8);
      src.connect(hp); hp.connect(g);
      if (pan) { pan.pan.value = Math.random() * 2 - 1; g.connect(pan); pan.connect(bus); } else g.connect(bus);
      src.start(t); src.stop(t + .85);
    } catch (e) { }
  }
  // the scream: a cluster of detuned saws bending up and down, run through distortion, with a crack of noise
  function scream() {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, sh = a.createWaveShaper(), g = a.createGain(); sh.curve = curve(40); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .04); g.gain.setValueAtTime(.55, t + .9); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
      sh.connect(g); g.connect(bus);
      for (const [f, d] of [[340, 0], [361, 3], [452, -4], [610, 7], [173, 0]]) {
        const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .6, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + .18); o.frequency.exponentialRampToValueAtTime(f * .9 + d, t + 1.5);
        const v = a.createOscillator(), vg = a.createGain(); v.frequency.value = 11 + Math.random() * 6; vg.gain.value = f * .05; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t + 1.6);
        o.connect(sh); o.start(t); o.stop(t + 1.6);
      }
      const n = a.createBufferSource(), ng = a.createGain(); n.buffer = noiseBuf(1); ng.gain.setValueAtTime(.8, t); ng.gain.exponentialRampToValueAtTime(.0001, t + .5); n.connect(ng); ng.connect(bus); n.start(t); n.stop(t + .5);
    } catch (e) { }
  }
  // a stinger for the first glimpse: a dissonant cluster that swells and is cut off
  function sting() {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .9); g.gain.setValueAtTime(.0001, t + 1.05); g.connect(bus);
      for (const f of [196, 207.7, 277.2, 293.7, 415.3]) { const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 1.1); }
    } catch (e) { }
  }
  // called every frame of a hunt with how close it is (0 far, 1 on you)
  function tick(dt, v) {
    near = v; startDrone();
    if (drone) { try { const t = ax.currentTime; drone.out.gain.setTargetAtTime(.06 + v * .22, t, .3); drone.lp.frequency.setTargetAtTime(150 + v * 900, t, .3); } catch (e) { } }
    breathT -= dt; if (breathT <= 0) { breathT = 2.6 - v * 1.4; breath(.25 + v * .75, true); setTimeout(() => near > 0 && breath(.25 + near * .75, false), 950); }
    whisperT -= dt; if (whisperT <= 0) { whisperT = 1.6 + Math.random() * 3; whisper(.3 + v * .5); }
  }
  function quiet() { near = 0; stopDrone(); }

  /* ---------- when it gets you ---------- */
  // the dark goes out of it and there's a face an arm's length from yours: your own, dead. Its eyes
  // open. Its mouth opens too far. A flash, the scream, the screen shaking, then black. Then the words.
  async function scare() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, L = looks();
    R3.freeze(true); quiet();
    const face = paintFace(L), eye = paintEye(), lidCol = mix(mix(L.skin, '#7d8a76', .55), '#141414', .55), sc = mix(mix(L.skin, '#7d8a76', .55), '#1e1e1e', .45);
    const cv = document.createElement('canvas'); cv.className = 'l2-scareface'; document.body.append(cv);
    const dpr = Math.min(2, devicePixelRatio || 1), vw = innerWidth, vh = innerHeight; cv.width = vw * dpr; cv.height = vh * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const flash = h('div.l2-scare'); document.body.append(flash);
    scream(); if (navigator.vibrate) try { navigator.vibrate([90, 40, 220]); } catch (e) { }
    const t0 = performance.now();
    await new Promise(done => {
      const draw = () => {
        const k = (performance.now() - t0) / 1000;
        const fh = Math.min(vh * .92, vw * 1.25) * (1 + Math.min(.18, k * .35)), fw = fh * W / H, x0 = vw / 2 - fw / 2 + (reduce ? 0 : (Math.random() - .5) * 8), y0 = vh / 2 - fh / 2 + (reduce ? 0 : (Math.random() - .5) * 8);
        const open = Math.min(1, Math.max(0, k - .22) * 3) * fh * .17, my = y0 + fh * MOUTH;
        g.fillStyle = '#000'; g.fillRect(0, 0, vw, vh);
        const vg = g.createRadialGradient(vw / 2, vh / 2, fh * .2, vw / 2, vh / 2, fh * .8); vg.addColorStop(0, 'rgba(90,0,0,.5)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
        // the inside of the mouth, the skin stretched over it, then the jaw dropped below
        const sg = g.createLinearGradient(x0 + fw * .17, 0, x0 + fw * .83, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(.12, sc); sg.addColorStop(.88, sc); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(x0 + fw * .17, my - 6, fw * .66, open + 12);
        g.fillStyle = '#000'; g.beginPath(); g.ellipse(vw / 2, my + open / 2, fw * .3, open / 2 + fh * .04, 0, 0, 7); g.fill();
        g.drawImage(face, 0, H * MOUTH, W, H * (1 - MOUTH), x0, my + open, fw, fh * (1 - MOUTH));
        g.drawImage(face, 0, 0, W, H * MOUTH, x0, y0, fw, fh * MOUTH);
        // the eyes, and the lids snapping open over them
        const lid = Math.min(1, Math.max(0, k - .12) * 12);
        for (const sx of [-1, 1]) {
          const ex = vw / 2 + sx * 72 / W * fw, ey = y0 + 296 / H * fh, ew = fw * .17, eh = fw * .12;
          g.drawImage(eye, ex - ew / 2, ey - eh / 2, ew, eh);
          if (lid < 1) { g.globalAlpha = 1 - lid; g.fillStyle = lidCol; g.beginPath(); g.ellipse(ex, ey - lid * eh * .4, ew * .55, eh * .55 * (1 - lid * .8), 0, 0, 7); g.fill(); g.globalAlpha = 1; }
        }
        if (Math.random() < .25) { g.fillStyle = 'rgba(255,40,20,.12)'; g.fillRect(0, 0, vw, vh); }
        if (k < 1.25) requestAnimationFrame(draw); else done();
      };
      draw();
    });
    flash.classList.add('black'); cv.remove();
    await new Promise(r => setTimeout(r, 700));
    flash.classList.add('out'); setTimeout(() => flash.remove(), 600);
    R3.freeze(false);
  }

  return { make, remove, paintFace, tick, quiet, scream, sting, scare };
})();
