// sound.js — tiny WebAudio helpers. No audio files to ship.
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
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
