/* Ambient sound: a quiet bed of sound for wherever you are, built live with Web Audio (no files).
   Bars murmur and clink, the Riverboat laps and thumps, the Palace chimes, Vinnie's shop ticks,
   the motel sign buzzes, and the town has wind by day and crickets by night. Follows the sound
   setting, and can be switched off on its own in the ☰ menu. */
const Ambient = (() => {
  let ac = null, master = null, cur = null, scene = '', timer = 0;
  const SCENES = {
    // bed: [kind, filter Hz, gain]; fx: [kind, every ms (random up to double)]
    spur: { bed: [['murmur', 420, .5], ['hum', 60, .05]], fx: [['clink', 2600], ['chips', 3800], ['laugh', 9000]] },
    riverboat: { bed: [['murmur', 380, .4], ['water', 700, .35]], fx: [['thump', 1500], ['clink', 4000], ['chips', 3000]] },
    palace: { bed: [['murmur', 520, .45], ['air', 1800, .08]], fx: [['chime', 2600], ['chips', 2600], ['clink', 5000]] },
    salon: { bed: [['murmur', 300, .25], ['air', 1200, .06]], fx: [['chips', 4500], ['clink', 7000]] },
    slots: { bed: [['murmur', 500, .3]], fx: [['chime', 1400]] },
    street: { bed: [['wind', 400, .22]], fx: [['car', 9000]] },
    night: { bed: [['wind', 300, .12]], fx: [['cricket', 900]] },
    diner: { bed: [['hum', 50, .08], ['murmur', 600, .18]], fx: [['clink', 2400]] },
    store: { bed: [['hum', 60, .12]], fx: [] },
    motel: { bed: [['buzz', 120, .05], ['wind', 300, .06]], fx: [] },
    pawn: { bed: [['hum', 50, .04]], fx: [['tick', 1000]] },
    shop: { bed: [['murmur', 650, .12]], fx: [] },
    grand: { bed: [['air', 900, .1], ['murmur', 420, .12]], fx: [['clink', 6000]] },
    apts: { bed: [['hum', 55, .06]], fx: [] },
    // Level 2
    clinic: { bed: [['hum', 60, .05], ['air', 2400, .03]], fx: [['beep', 1100]] },
    garage: { bed: [['rain', 900, .32], ['hum', 50, .05]], fx: [['drip', 1400], ['car', 14000]] },
    floor: { bed: [['murmur', 480, .32], ['air', 1600, .07]], fx: [['chime', 1800], ['chips', 3200], ['clink', 5200]] },
    eye: { bed: [['hum', 55, .1], ['buzz', 120, .015]], fx: [['tick', 2600]] },
    l2salon: { bed: [['murmur', 300, .18], ['air', 1200, .05]], fx: [['chips', 5200]] },
    hotel: { bed: [['hum', 50, .06], ['air', 900, .04]], fx: [] },
    roof: { bed: [['rain', 1400, .5], ['wind', 260, .3]], fx: [['thump', 16000]] },
    cemetery: { bed: [['wind', 320, .18], ['rain', 2200, .05]], fx: [] },
    steak: { bed: [['murmur', 360, .3]], fx: [['clink', 2200]] },
    // Level 3: the bedsit, and the laptop in it: the fridge, rain on the window, the tap dripping (no casino floor)
    bedsit: { bed: [['hum', 50, .07], ['rain', 1100, .1]], fx: [['drip', 6500], ['car', 18000]] },
  };
  const noiseBuf = () => {
    const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    let l = 0; for (let i = 0; i < n; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } // brown-ish noise
    return b;
  };
  function bed(kind, f, g, out) {
    const gain = ac.createGain(); gain.gain.value = g; gain.connect(out);
    const nodes = [gain];
    if (kind === 'hum' || kind === 'buzz') {
      for (const m of kind === 'hum' ? [1, 2] : [1, 2, 3]) { const o = ac.createOscillator(); o.type = kind === 'buzz' ? 'sawtooth' : 'sine'; o.frequency.value = f * m; const og = ac.createGain(); og.gain.value = 1 / (m * m); o.connect(og); og.connect(gain); o.start(); nodes.push(o); }
      return nodes;
    }
    const src = ac.createBufferSource(); src.buffer = Ambient._noise || (Ambient._noise = noiseBuf()); src.loop = true;
    const flt = ac.createBiquadFilter(); flt.type = kind === 'air' ? 'highpass' : kind === 'murmur' || kind === 'rain' ? 'bandpass' : 'lowpass'; flt.frequency.value = f; flt.Q.value = kind === 'murmur' ? .8 : kind === 'rain' ? .3 : .5;
    src.connect(flt); flt.connect(gain); src.start(); nodes.push(src);
    // slow swells: a crowd breathing, waves, gusts
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = kind === 'water' ? .25 : kind === 'wind' ? .08 : .13; lg.gain.value = g * .45; lfo.connect(lg); lg.connect(gain.gain); lfo.start(); nodes.push(lfo);
    return nodes;
  }
  // one-off sounds layered on top
  function fx(kind) {
    if (!ac || !cur) return;
    const t = ac.currentTime, out = cur.out;
    const env = (node, peak, dur, at = t) => { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + .005); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); node.connect(g); g.connect(out); return g; };
    const tone = (f, peak, dur, type = 'sine', at = t) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; env(o, peak, dur, at); o.start(at); o.stop(at + dur + .05); };
    const burst = (hp, peak, dur, at = t) => { const s = ac.createBufferSource(); s.buffer = Ambient._noise; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); env(f, peak, dur, at); s.start(at, Math.random()); s.stop(at + dur + .05); };
    if (kind === 'clink') { const f = 2400 + Math.random() * 1600; tone(f, .05, .5); tone(f * 1.5, .02, .3); }
    else if (kind === 'chips') { for (let i = 0; i < 3 + Math.random() * 4; i++) burst(2500, .06, .035, t + i * (.03 + Math.random() * .03)); }
    else if (kind === 'chime') { const base = [523, 659, 784, 1046]; base.forEach((f, i) => tone(f, .03, .35, 'triangle', t + i * .09)); }
    else if (kind === 'thump') { tone(55, .25, .35); }
    else if (kind === 'beep') { tone(988, .025, .12); }
    else if (kind === 'drip') { const f = 1400 + Math.random() * 900; tone(f, .04, .08); tone(f * .7, .02, .1, 'sine', t + .03); }
    else if (kind === 'tick') { burst(3000, .05, .02); }
    else if (kind === 'cricket') { for (let i = 0; i < 3; i++) tone(4400 + Math.random() * 300, .015, .04, 'sine', t + i * .06); }
    else if (kind === 'car') { const s = ac.createBufferSource(); s.buffer = Ambient._noise; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; s.connect(f); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5); f.connect(g); g.connect(out); s.start(t); s.stop(t + 3.6); }
    else if (kind === 'laugh') { for (let i = 0; i < 4; i++) tone(260 + Math.random() * 80, .025, .12, 'sawtooth', t + i * .14); }
  }
  function stopScene(fade = .8) {
    if (!cur) return;
    const old = cur; cur = null; clearInterval(old.timer); (old.fxTimers || []).forEach(clearTimeout);
    try { old.out.gain.setTargetAtTime(0.0001, ac.currentTime, fade / 3); } catch (e) { }
    setTimeout(() => old.nodes.forEach(n => { try { n.stop && n.stop(); n.disconnect(); } catch (e) { } }), fade * 1000 + 200);
  }
  function startScene(name) {
    const S = SCENES[name]; if (!S) return;
    const out = ac.createGain(); out.gain.value = 0.0001; out.connect(master);
    out.gain.setTargetAtTime(1, ac.currentTime, .4);
    const nodes = [out]; for (const [k, f, g] of S.bed) nodes.push(...bed(k, f, g, out));
    cur = { name, out, nodes, fxTimers: [] };
    for (const [k, every] of S.fx) { const loop = () => { if (!cur || cur.name !== name) return; fx(k); cur.fxTimers.push(setTimeout(loop, every * (.5 + Math.random() * 1.5))); }; cur.fxTimers.push(setTimeout(loop, Math.random() * every)); }
  }
  // which soundscape fits where you are right now
  function where() {
    const st = App.state, scr = Router.screen; if (!st) return '';
    if (scr === 'bedsit' || App.inLaptop()) return 'bedsit'; // a game on the laptop is still in the room, not on a casino floor
    if (scr === 'reality') { const a = R3.area; return a === 'salon' ? 'l2salon' : a === 'corridor' || a === 'room' ? 'hotel' : a || ''; }
    if (scr === 'world') {
      const w = World.where(); if (!w) return '';
      if (w.map === 'town') return World.isNight && World.isNight() ? 'night' : 'street';
      if (w.map.startsWith('v:')) return w.map.slice(2);
      if (w.map.startsWith('r:')) return w.map.slice(2);
    }
    if (scr === 'table' && Router.table && Router.table.ctx) return Router.table.ctx.venueId || 'spur';
    if (scr === 'slots') return 'slots';
    if (scr === 'poker' || scr === 'darts') return 'spur';
    return '';
  }
  const on = () => App.state && App.state.settings.sound !== false && App.state.settings.ambient !== false && !document.hidden;
  function tick() {
    const want = on() ? where() : '';
    if (want === scene) return;
    scene = want; stopScene();
    if (want && ac) startScene(want);
  }
  return {
    SCENES,
    // audio can only start after a tap
    start() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination);
      scene = ''; tick(); timer = setInterval(tick, 800);
    },
    refresh() { scene = '__'; tick(); },
    get scene() { return scene; },
  };
})();
document.addEventListener('pointerdown', () => Ambient.start(), true);
document.addEventListener('keydown', () => Ambient.start(), true);
