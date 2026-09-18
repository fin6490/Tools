// sound.js — tiny WebAudio helpers. No audio files to ship.
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Create/resume the audio context inside a user gesture so mobile
// (esp. iOS) allows sound that actually fires later, in a rAF callback.
export function unlock() {
  try { ac(); } catch {}
}

// Short "tick" as the wheel passes a peg.
export function tick(volume = 0.08) {
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "square";
    o.frequency.value = 900;
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.05);
  } catch {}
}

// Rising fanfare when a winner is picked.
export function fanfare() {
  try {
    const c = ac();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = c.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch {}
}

// Countdown-finished beep.
export function beep() {
  try {
    const c = ac();
    [0, 0.25, 0.5].forEach((delay) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      const t = c.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch {}
}

// Wrong-answer buzz (falling square tone).
export function buzz() {
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(200, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.22);
    g.gain.setValueAtTime(0.16, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.24);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.25);
  } catch {}
}

// Sunny, upbeat little riff for a lovely day (original — evokes the mood, not
// any particular song). A bright major phrase on a warm triangle tone.
export function sunny() {
  try {
    const c = ac();
    const seq = [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.48], [880, 0.66], [1046.5, 0.82]];
    seq.forEach(([f, delay]) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "triangle"; o.frequency.value = f;
      const t = c.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.45);
    });
  } catch {}
}

// Stormy weather: a roll of thunder (filtered noise) under a low, sad fall.
export function storm() {
  try {
    const c = ac();
    // thunder — a burst of low-passed noise that swells and fades
    const dur = 1.4;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource(); src.buffer = buf;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, c.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.32, c.currentTime + 0.25);
    ng.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.7);
    ng.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(lp).connect(ng).connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
    // a low, mournful two-note fall over the top
    [[196, 0.1], [146.83, 0.55]].forEach(([f, delay]) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = c.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.62);
    });
  } catch {}
}

// Whoosh for powerups (smoke bomb / block).
export function swoosh() {
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(600, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(160, c.currentTime + 0.3);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.1, c.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.32);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.33);
  } catch {}
}
