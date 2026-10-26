/* Music: a quiet live band for each venue, composed on the fly with Web Audio (no files).
   - The Rusty Spur: honky-tonk piano shuffle with a boom-chick bass and brushed backbeat.
   - The Riverboat: ragtime stride, oom-pah left hand and a syncopated right.
   - The Gilded Palace: lounge jazz, electric piano 7th chords, walking bass, brushes on the ride.
   - The Salon Privé: slow minor noir, upright bass, a lonely vibraphone.
   - Mel's Diner: a jukebox doo-wop ballad in triplets.
   Each bar follows the venue's chord progression; the melody is built from short motifs that
   repeat and vary, so it sounds like a tune rather than random notes. Plays under the ambient
   bed, follows the sound setting, and has its own switch in the ☰ menu. */
const Music = (() => {
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // chords are [root midi, ...intervals]; melody scales are intervals from the key
  const STYLES = {
    spur: { bpm: 112, div: 3, key: 55, scale: [0, 2, 4, 7, 9], gain: .9,
      prog: [[55, 0, 4, 7], [55, 0, 4, 7], [60, 0, 4, 7], [60, 0, 4, 7], [55, 0, 4, 7], [62, 0, 4, 7, 10], [55, 0, 4, 7], [62, 0, 4, 7, 10]],
      bass: 'boomchick', comp: 'offbeat', lead: 'piano', keys: 'piano', drums: 'brushback', density: .55 },
    riverboat: { bpm: 100, div: 4, key: 65, scale: [0, 2, 4, 5, 7, 9], gain: .85,
      prog: [[65, 0, 4, 7], [62, 0, 4, 7, 10], [67, 0, 4, 7, 10], [60, 0, 4, 7, 10], [65, 0, 4, 7], [70, 0, 4, 7], [60, 0, 4, 7, 10], [65, 0, 4, 7]],
      bass: 'stride', comp: 'stride', lead: 'piano', keys: 'piano', drums: 'none', density: .7 },
    palace: { bpm: 76, div: 3, key: 63, scale: [0, 2, 3, 5, 7, 9, 10], gain: .8,
      prog: [[65, 0, 3, 7, 10, 14], [70, 0, 4, 7, 10, 14], [63, 0, 4, 7, 11, 14], [60, 0, 3, 7, 10]],
      bass: 'walk', comp: 'charleston', lead: 'vibes', keys: 'rhodes', drums: 'ride', density: .35 },
    salon: { bpm: 62, div: 3, key: 62, scale: [0, 2, 3, 5, 7, 8, 10], gain: .8,
      prog: [[62, 0, 3, 7, 14], [58, 0, 4, 7, 11], [67, 0, 3, 7, 10], [57, 0, 4, 7, 10, 13]],
      bass: 'half', comp: 'pad', lead: 'vibes', keys: 'rhodes', drums: 'softride', density: .22 },
    // Level 2: one slow piano in A minor, a soft pad, no drums, lots of silence
    reality: { bpm: 52, div: 2, key: 57, scale: [0, 2, 3, 5, 7, 8, 10], gain: .7,
      prog: [[57, 0, 3, 7, 14], [53, 0, 4, 7, 11], [60, 0, 4, 7, 14], [55, 0, 4, 7, 10], [57, 0, 3, 7], [62, 0, 3, 7, 10], [53, 0, 4, 7, 11], [52, 0, 4, 7, 10]],
      bass: 'half', comp: 'pad', lead: 'piano', keys: 'rhodes', drums: 'none', density: .16 },
    diner: { bpm: 66, div: 3, key: 60, scale: [0, 2, 4, 7, 9], gain: .8,
      prog: [[60, 0, 4, 7], [57, 0, 3, 7], [65, 0, 4, 7], [67, 0, 4, 7, 10]],
      bass: 'boomchick', comp: 'triplets', lead: 'sax', keys: 'piano', drums: 'brushback', density: .4 },
  };
  let ac = null, out = null, style = null, name = '', step = 0, nextT = 0, timer = 0, motif = null, lastNote = 0;

  /* ---------- instruments ---------- */
  function voice(f, t, dur, { type = 'triangle', peak = .1, attack = .005, decay = dur, cut = 2600, vib = 0, trem = 0, partial = 0 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain(), flt = ac.createBiquadFilter();
    o.type = type; o.frequency.value = f; flt.type = 'lowpass'; flt.frequency.value = cut;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(flt); flt.connect(g); g.connect(out);
    const nodes = [o];
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5; lg.gain.value = f * vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + attack + decay + .1); nodes.push(l); }
    if (trem) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = trem; lg.gain.value = peak * .35; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + attack + decay + .1); nodes.push(l); }
    if (partial) { const p = ac.createOscillator(), pg = ac.createGain(); p.type = 'sine'; p.frequency.value = f * partial; pg.gain.setValueAtTime(peak * .3, t); pg.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(.4, decay)); p.connect(pg); pg.connect(out); p.start(t); p.stop(t + decay + .1); nodes.push(p); }
    o.start(t); o.stop(t + attack + decay + .1);
  }
  const INST = {
    piano: (m, t, v = 1) => voice(mtof(m), t, 1.1, { type: 'triangle', peak: .07 * v, cut: 3200, partial: 2 }),
    rhodes: (m, t, v = 1) => voice(mtof(m), t, 1.8, { type: 'sine', peak: .06 * v, attack: .01, trem: 4.5, partial: 3 }),
    vibes: (m, t, v = 1) => voice(mtof(m), t, 1.6, { type: 'sine', peak: .06 * v, trem: 5.5, partial: 4 }),
    sax: (m, t, v = 1, d = .5) => voice(mtof(m), t, d, { type: 'sawtooth', peak: .035 * v, attack: .05, cut: 1300, vib: .006 }),
    bass: (m, t, v = 1, d = .5) => voice(mtof(m), t, d, { type: 'triangle', peak: .16 * v, cut: 700 }),
  };
  function noise(t, hp, peak, dur) {
    const s = ac.createBufferSource(); s.buffer = Music._noise; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  const kick = (t, v = 1) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(45, t + .12); g.gain.setValueAtTime(.12 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .25); o.connect(g); g.connect(out); o.start(t); o.stop(t + .3); };

  /* ---------- the band ---------- */
  const chordNotes = (c, base = 48) => { const [root, ...iv] = c; let r = root; while (r > base + 11) r -= 12; while (r < base) r += 12; return iv.map(i => r + i); };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // a two-bar motif: rhythm positions and scale-step moves, reused and varied across a phrase
  function newMotif(S) {
    const per = S.div * 4, notes = [];
    for (let s = 0; s < per * 2; s++) {
      const beat = s % S.div === 0, strong = s % (S.div * 2) === 0;
      if (Math.random() < S.density * (strong ? 1.2 : beat ? .8 : S.div === 3 && s % 3 === 2 ? .55 : .25)) notes.push({ s, move: pick([-2, -1, -1, 1, 1, 2, 0, 3, -3]), len: pick([1, 2, 2, 3]) });
    }
    return notes;
  }
  function melodyNote(S, chord, move, strong) {
    const scale = [], key = S.key % 12 + 60;
    for (let o = -1; o <= 1; o++) for (const iv of S.scale) scale.push(key + o * 12 + iv);
    let i = scale.indexOf(lastNote); if (i < 0) i = Math.floor(scale.length / 2);
    i = Math.max(2, Math.min(scale.length - 3, i + move));
    let n = scale[i];
    if (strong) { const tones = chordNotes(chord, 60).concat(chordNotes(chord, 72)); n = tones.reduce((b, x) => Math.abs(x - n) < Math.abs(b - n) ? x : b, tones[0]); }
    lastNote = n; return n;
  }
  function play(S, i, t) {
    const per = S.div * 4, bar = Math.floor(i / per), s = i % per, beat = Math.floor(s / S.div), sub = s % S.div;
    const chord = S.prog[bar % S.prog.length], spb = 60 / S.bpm, stepLen = spb / S.div;
    const ch = chordNotes(chord, 52), root = chordNotes(chord, 36)[0], fifth = root + 7;
    // bass
    if (sub === 0) {
      if (S.bass === 'boomchick') INST.bass(beat % 2 ? fifth : root, t, beat % 2 ? .7 : 1, spb * .8);
      if (S.bass === 'stride' && beat % 2 === 0) INST.bass(beat === 0 ? root : fifth - 12, t, 1, spb * .7);
      if (S.bass === 'walk') { const walk = [root, root + pick([2, 4]), fifth, pick([fifth + 2, root + 11, root - 1])]; INST.bass(walk[beat], t, .9, spb * .9); }
      if (S.bass === 'half' && beat % 2 === 0) INST.bass(beat === 0 ? root : fifth - 12, t, .9, spb * 1.8);
    }
    // chords
    const k = INST[S.keys];
    if (S.comp === 'offbeat' && sub === 0 && beat % 2 === 1) ch.forEach(n => k(n, t, .7));
    if (S.comp === 'stride' && sub === 0 && beat % 2 === 1) ch.forEach(n => k(n + 12, t, .65));
    if (S.comp === 'charleston' && ((beat === 0 && sub === 0) || (beat === 1 && sub === 2))) ch.forEach(n => k(n + 12, t, .55));
    if (S.comp === 'pad' && s === 0) ch.forEach((n, j) => k(n + 12, t + j * .03, .5));
    if (S.comp === 'triplets') ch.slice(0, 3).forEach(n => k(n + 12, t, sub === 0 ? .4 : .28));
    // drums
    if (S.drums === 'brushback') { if (sub === 0 && beat % 2 === 1) noise(t, 3000, .05, .12); if (sub === S.div - 1) noise(t, 6000, .02, .04); if (sub === 0 && beat % 2 === 0) kick(t, .6); }
    if (S.drums === 'ride') { if (sub === 0 || sub === 2 && beat % 2 === 1) noise(t, 7000, .022, .18); if (sub === 0 && beat % 2 === 1) noise(t, 2500, .025, .15); }
    if (S.drums === 'softride' && sub === 0) noise(t, 8000, .012, .3);
    // melody: a phrase is motif A, A again, A varied, then a cadence bar
    if (bar % 4 === 0 && s === 0) motif = newMotif(S);
    const pos = (bar % 2) * per + s, phraseBar = bar % 4;
    if (phraseBar === 3 && s > per / 2) return;  // breathe at the end of a phrase
    for (const n of motif || []) {
      if (n.s !== pos) continue;
      if (phraseBar === 2 && Math.random() < .35) continue;
      const strong = s % (S.div * 2) === 0, m = melodyNote(S, chord, phraseBar === 2 ? -n.move : n.move, strong);
      INST[S.lead](m + (S.lead === 'vibes' || S.lead === 'piano' ? 12 : 0), t, .9, n.len * stepLen * 1.6);
    }
  }
  function schedule() {
    if (!style || !ac) return;
    const S = STYLES[style], stepLen = 60 / S.bpm / S.div;
    while (nextT < ac.currentTime + .25) {
      // a gentle swing on straight-feel styles
      const swing = S.div === 4 && step % 2 === 1 ? stepLen * .12 : 0;
      play(S, step, nextT + swing);
      nextT += stepLen; step++;
    }
  }
  function setStyle(want) {
    if (want === style) return;
    if (out) { const old = out; old.gain.setTargetAtTime(0.0001, ac.currentTime, .5); setTimeout(() => { try { old.disconnect(); } catch (e) { } }, 2500); out = null; }
    style = want;
    if (!want || !ac) return;
    out = ac.createGain(); out.gain.value = 0.0001; out.connect(ac.destination);
    out.gain.setTargetAtTime(1.1 * STYLES[want].gain, ac.currentTime, 1.2);
    step = 0; nextT = ac.currentTime + .15; motif = null; lastNote = STYLES[want].key + 12;
  }
  // which band is playing where you are
  function where() {
    const st = App.state, scr = Router.screen; if (!st) return '';
    if (scr === 'reality') return R3.area && R3.area !== 'eye' ? 'reality' : '';
    if (App.inReality() && (scr === 'table' || scr === 'slots')) return '';
    if (scr === 'world') {
      const w = World.where(); if (!w) return '';
      if (w.map.startsWith('v:')) return STYLES[w.map.slice(2)] ? w.map.slice(2) : '';
      if (w.map === 'r:diner') return 'diner';
      return '';
    }
    if (scr === 'table' && Router.table && Router.table.ctx) return Router.table.ctx.venueId || 'spur';
    if (scr === 'slots') return STYLES[Router.arg] ? Router.arg : (STYLES[st.venue] ? st.venue : 'spur');
    if (scr === 'poker' || scr === 'pokertable') return 'salon';
    if (scr === 'darts') return 'spur';
    return '';
  }
  const on = () => App.state && App.state.settings.sound !== false && App.state.settings.music !== false && !document.hidden;
  function tick() { setStyle(on() ? where() : ''); schedule(); }
  return {
    STYLES,
    start() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      Music._noise = b;
      tick(); timer = setInterval(tick, 90);
    },
    refresh() { const s = style; setStyle(''); if (s) tick(); },
    get style() { return style; },
  };
})();
document.addEventListener('pointerdown', () => Music.start(), true);
document.addEventListener('keydown', () => Music.start(), true);
