// wheel.js — the spinning wheel: parsing, drawing, weighted spin, easing.
import * as sound from "./sound.js";

const TAU = Math.PI * 2;
const POINTER = -Math.PI / 2; // pointer sits at the top (12 o'clock)

// Harmonious auto palette (golden-angle hue rotation).
function colorFor(i, total) {
  const hue = (i * 137.508) % 360;
  const light = i % 2 ? 62 : 54;
  return `hsl(${hue}, 70%, ${light}%)`;
}

// Pick readable label text (dark or white) for a given hex slice color.
function textOn(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#12142b" : "#ffffff";
}

// Parse one line into its label, weight and optional custom colour.
// Trailing "*N" (weight) and "#hex" (colour) tokens may appear in any order:
//   "Alice"            -> label Alice, weight 1
//   "Alice*3"          -> weight 3
//   "Alice #ff0000"    -> custom red
//   "Alice *2 #0af"    -> weight 2, custom colour
export function parseLine(raw) {
  let label = raw.trim();
  let weight = 1;
  let color = null;
  let changed = true;
  while (changed && label) {
    changed = false;
    let m = label.match(/\*\s*(\d+)\s*$/);
    if (m && Number(m[1]) > 0) {
      weight = Number(m[1]);
      label = label.slice(0, m.index).trim();
      changed = true;
      continue;
    }
    m = label.match(/(?:^|\s)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))$/);
    if (m) {
      color = m[1].toLowerCase();
      label = label.slice(0, m.index).trim();
      changed = true;
    }
  }
  return { label, weight, color };
}

// Parse the textarea into weighted segments. Blank lines ignored;
// duplicates keep their own slice.
export function parseEntries(text) {
  const segs = [];
  text.split("\n").forEach((raw) => {
    if (!raw.trim()) return;
    const { label, weight, color } = parseLine(raw);
    if (!label) return;
    segs.push({ label, weight, custom: color });
  });
  const total = segs.reduce((s, x) => s + x.weight, 0) || 1;
  let acc = 0;
  segs.forEach((s, i) => {
    s.color = s.custom || colorFor(i, segs.length);
    s.textColor = s.custom ? textOn(s.custom) : "#12142b";
    s.a0 = (acc / total) * TAU;
    acc += s.weight;
    s.a1 = (acc / total) * TAU;
    s.mid = (s.a0 + s.a1) / 2;
  });
  return segs;
}

export class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.segments = [];
    this.rotation = 0;
    this.spinning = false;
    this.lastTickBoundary = null;
    this.onWinner = null;
    this.soundOn = true;
    this._fitToDisplay();
    window.addEventListener("resize", () => { this._fitToDisplay(); this.draw(); });
  }

  _fitToDisplay() {
    // Match backing store to the CSS box for crisp text on HiDPI.
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.max(200, Math.min(rect.width || 600, rect.height || 600));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._size = size;
  }

  setSegments(segs) {
    this.segments = segs;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const size = this._size;
    const cx = size / 2, cy = size / 2, r = size / 2 - 6;
    ctx.clearRect(0, 0, size, size);

    if (!this.segments.length) {
      ctx.save();
      ctx.fillStyle = "rgba(124,133,189,.9)";
      ctx.font = `600 ${Math.round(size * 0.045)}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Add names on the left →", cx, cy);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);

    this.segments.forEach((s) => {
      // slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, s.a0, s.a1);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // label
      ctx.save();
      ctx.rotate(s.mid);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = s.textColor || "#12142b";
      const slice = s.a1 - s.a0;
      const fontSize = Math.max(10, Math.min(size * 0.04, (slice * r) * 0.6));
      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
      const maxChars = Math.max(4, Math.floor((r - 44) / (fontSize * 0.58)));
      let label = s.label;
      if (label.length > maxChars) label = label.slice(0, maxChars - 1) + "…";
      ctx.fillText(label, r - 16, 0);
      ctx.restore();
    });

    ctx.restore();

    // hub ring
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.135, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0,.15)";
    ctx.fill();
  }

  // Weighted random winner index.
  _pickWinner() {
    const total = this.segments.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < this.segments.length; i++) {
      roll -= this.segments[i].weight;
      if (roll <= 0) return i;
    }
    return this.segments.length - 1;
  }

  spin(durationSec = 5) {
    if (this.spinning || !this.segments.length) return;
    this.spinning = true;
    const winnerIdx = this._pickWinner();
    const win = this.segments[winnerIdx];

    // Land a random point inside the winning slice under the pointer.
    const slice = win.a1 - win.a0;
    const jitter = win.a0 + slice * (0.15 + Math.random() * 0.7);
    const turns = 6 + Math.floor(Math.random() * 3);
    // Solve rotation so (jitter + Rf) == POINTER (mod TAU), plus full turns.
    const base = POINTER - jitter;
    const startRot = this.rotation % TAU;
    const targetRot = base + turns * TAU;

    const dur = durationSec * 1000;
    const start = performance.now();
    const from = startRot;
    const delta = targetRot - from;
    this.lastTickBoundary = null;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const frame = (now) => {
      const t = Math.min(1, (now - start) / dur);
      this.rotation = from + delta * easeOutQuart(t);
      this._maybeTick();
      this.draw();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        this.spinning = false;
        this.rotation = ((targetRot % TAU) + TAU) % TAU;
        this.draw();
        if (this.onWinner) this.onWinner(win.label, winnerIdx);
      }
    };
    requestAnimationFrame(frame);
  }

  // Play a tick each time a slice boundary crosses the pointer.
  _maybeTick() {
    if (!this.soundOn || this.segments.length > 60) return;
    // Which slice is at the pointer right now?
    const local = (((POINTER - this.rotation) % TAU) + TAU) % TAU;
    let idx = 0;
    for (let i = 0; i < this.segments.length; i++) {
      if (local >= this.segments[i].a0 && local < this.segments[i].a1) { idx = i; break; }
    }
    if (this.lastTickBoundary !== idx) {
      if (this.lastTickBoundary !== null) sound.tick();
      this.lastTickBoundary = idx;
    }
  }
}
