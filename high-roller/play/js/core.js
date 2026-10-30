/* Core utilities: DOM helpers, RNG, card shoe, money formatting, sound. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// h('div.cls#id', {attrs}, ...children) — tiny DOM builder
function h(tag, attrs, ...kids) {
  const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][\w-]+/g) || []).forEach(t => t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1)));
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = c => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

const RNG = {
  // uniform integer in [0, n) from crypto, rejection-sampled to avoid modulo bias
  int(n) {
    const buf = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n;
    let x; do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
    return x % n;
  },
  float() { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] / 0x100000000; },
  pick(arr) { return arr[RNG.int(arr.length)]; },
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = RNG.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  chance(p) { return RNG.float() < p; },
};

const SUIT_SYM = ['♠', '♥', '♦', '♣'];
const SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const rankLabel = r => RANK_LABEL[r] || String(r);
const isRed = s => s === 1 || s === 2;
const cardName = c => rankLabel(c.r) + SUIT_SYM[c.s];

class Shoe {
  constructor(decks = 6, penetration = 0.75) {
    this.decks = decks; this.pen = penetration; this.shuffle();
  }
  shuffle() {
    this.cards = [];
    for (let d = 0; d < this.decks; d++) for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) this.cards.push({ r, s });
    RNG.shuffle(this.cards);
    this.cut = Math.floor(this.cards.length * this.pen);
    this.dealt = 0; this.running = 0; this.justShuffled = true;
  }
  draw() {
    if (this.dealt >= this.cards.length) this.shuffle();
    const c = this.cards[this.dealt++];
    return { r: c.r, s: c.s };
  }
  // Hi-Lo count is updated when a card becomes visible, not when drawn (hole cards!)
  see(c) { if (c.r >= 2 && c.r <= 6) this.running++; else if (c.r >= 10) this.running--; }
  get remaining() { return this.cards.length - this.dealt; }
  get needsShuffle() { return this.dealt >= this.cut; }
  get trueCount() { return this.running / Math.max(0.5, this.remaining / 52); }
}

// Money: whole dollars show without cents; payouts like 3:2 or 0.95 can leave cents.
let CUR = '$'; // Level 3 is in pounds: the Router sets this
function fmt(n, opts = {}) {
  const neg = n < 0; n = Math.abs(n);
  const cents = Math.round(n * 100) % 100 !== 0;
  let s;
  if (opts.short && n >= 1e6) s = CUR + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M';
  else if (opts.short && n >= 1e4) s = CUR + (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
  else s = CUR + n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
  return (neg ? '-' : '') + (opts.sign && !neg ? '+' : '') + s;
}
const round2 = x => Math.round(x * 100) / 100;
const pctStr = (x, d = 2) => (x * 100).toFixed(d) + '%';
const sleep = ms => new Promise(r => setTimeout(r, ms * (typeof App !== 'undefined' && App.speedFactor ? App.speedFactor() : 1)));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* Sound: small synthesized effects so the app needs no audio files. */
const SFX = (() => {
  let ctx = null;
  const ac = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const on = () => typeof App === 'undefined' || !App.state || App.state.settings.sound;
  function noise(dur, freq, q, gain) {
    const c = ac(); if (!c || !on()) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }
  function tone(freq, dur, type = 'sine', gain = 0.12, when = 0) {
    const c = ac(); if (!c || !on()) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  // running water and the like: noise through a filter that sweeps from f0 to f1, faded in over `att` seconds
  function wash(dur, f0, f1, gain, att = 0.1, type = 'lowpass', q = 0.7, when = 0) {
    const c = ac(); if (!c || !on()) return;
    const t = c.currentTime + when, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + att); g.gain.setValueAtTime(gain, t + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t); src.stop(t + dur + 0.05);
  }
  return {
    chip() { noise(0.06, 3200, 3, 0.5); setTimeout(() => noise(0.04, 4200, 4, 0.3), 35); },
    card() { noise(0.09, 1800, 0.8, 0.35); },
    flip() { noise(0.05, 2600, 1.2, 0.3); },
    dice() { for (let i = 0; i < 5; i++) setTimeout(() => noise(0.05, 900 + Math.random() * 900, 2, 0.5), i * 70); },
    win() { [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.08)); },
    big() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, i * 0.09)); },
    lose() { tone(220, 0.25, 'sine', 0.07); tone(180, 0.3, 'sine', 0.06, 0.1); },
    click() { tone(900, 0.04, 'square', 0.03); },
    cash() { [880, 1320].forEach((f, i) => tone(f, 0.12, 'square', 0.05, i * 0.07)); },
    // the roulette ball: quick clicks round the rim that slow down, then a rattle into the pocket
    wheel(ms = 3600) {
      let t = 0, gap = 45;
      while (t < ms * .85) { const at = t; setTimeout(() => noise(0.025, 3800, 6, 0.18), at); t += gap; gap *= 1.045; }
      [0, 90, 150, 230].forEach((d, i) => setTimeout(() => noise(0.04, 2600 - i * 300, 4, 0.4), ms * .85 + d));
    },
    reel() { noise(0.02, 2200, 5, 0.08); },
    // the bedsit's own: water, a door, the toilet, a strip of pills
    flush() { wash(2.6, 260, 1300, 0.32, 0.12); wash(1.4, 500, 220, 0.18, 0.05, 'bandpass', 2, 1.9); wash(3.2, 2600, 2200, 0.035, 0.6, 'bandpass', 3, 2.4); },
    trickle() { wash(2.4, 2800, 2300, 0.06, 0.25, 'bandpass', 5); },
    shower() { wash(1.6, 3000, 2600, 0.08, 0.2, 'highpass', 0.7); },
    creak() { const c = ac(); if (!c || !on()) return; const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(140 + Math.sin(i * 1.7) * 40 + i * 6, t + i * 0.09); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 6; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.08); g.gain.linearRampToValueAtTime(0.0001, t + 0.8); o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + 0.85); },
    latch() { tone(1500, 0.04, 'square', 0.03); noise(0.04, 2400, 3, 0.25); },
    pills() { for (let i = 0; i < 7; i++) setTimeout(() => noise(0.03, 3200 + Math.random() * 1500, 6, 0.25), i * 45 + Math.random() * 20); },
    reelStop() { tone(110, 0.09, 'sine', 0.12); noise(0.05, 900, 1.5, 0.25); },
  };
})();

// Game modules register themselves here: GAMES[id] = { id, name, icon, blurb, mount(table, ctx) }
const GAMES = {};
