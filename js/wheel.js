// wheel.js — the spinning wheel: parsing, drawing, weighted spin, easing.
import * as sound from "./sound.js?v=20260801i";

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
    this.images = {};             // label -> dataURL
    this._imgCache = new Map();   // dataURL -> HTMLImageElement
    this.mode = "wheel";          // "wheel" (round) | "reel" (horizontal strip)
    this.reelOffset = 0;
    this._cells = [];
    this._fitToDisplay();
    window.addEventListener("resize", () => { this._fitToDisplay(); this.draw(); });
  }

  // Switch between the round wheel and the horizontal "reel" (Wheel of
  // Fortune) style, which uses a rectangle so it fits far more entries.
  setMode(mode) {
    this.mode = mode === "reel" ? "reel" : "wheel";
    this._fitToDisplay();
    this.draw();
  }

  // Expand segments into per-cell entries (weight = repeats) for the reel.
  _buildCells() {
    const cells = [];
    this.segments.forEach((s, i) => {
      const n = Math.min(Math.max(1, s.weight | 0), 20);
      for (let k = 0; k < n; k++) cells.push({ seg: s, idx: i });
    });
    this._cells = cells;
  }

  _cellW() { return Math.max(90, Math.min(170, this._w / 5)); }

  // Associate label -> image dataURL. Preloads so slices redraw when ready.
  setImages(map) {
    this.images = map || {};
    Object.values(this.images).forEach((src) => {
      if (src && !this._imgCache.has(src)) {
        const img = new Image();
        img.onload = () => this.draw();
        img.src = src;
        this._imgCache.set(src, img);
      }
    });
  }

  _imageFor(label) {
    const src = this.images[label];
    if (!src) return null;
    const img = this._imgCache.get(src);
    return img && img.complete && img.naturalWidth ? img : null;
  }

  _fitToDisplay() {
    // Match backing store to the CSS box for crisp text on HiDPI.
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (this.mode === "reel") {
      const w = Math.max(200, rect.width || 600);
      const h = Math.max(80, rect.height || 150);
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._w = w; this._h = h;
    } else {
      const size = Math.max(200, Math.min(rect.width || 600, rect.height || 600));
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._size = size;
    }
  }

  setSegments(segs) {
    this.segments = segs;
    this._buildCells();
    this.draw();
  }

  draw() {
    if (this.mode === "reel") return this.drawReel();
    const ctx = this.ctx;
    const size = this._size;
    const cx = size / 2, cy = size / 2, r = size / 2 - 6;
    ctx.clearRect(0, 0, size, size);

    if (!this.segments.length) {
      ctx.save();
      ctx.fillStyle = "rgba(124,133,189,.9)";
      ctx.font = `600 ${Math.round(size * 0.045)}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Add some names to spin", cx, cy);
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

      // label (+ optional slice image)
      ctx.save();
      ctx.rotate(s.mid);
      const slice = s.a1 - s.a0;

      const img = this._imageFor(s.label);
      let labelEndX = r - 16;
      if (img) {
        // Circular-cropped image near the rim; label pulled inward.
        const imgSize = Math.max(20, Math.min(slice * r * 0.85, r * 0.26));
        const imgCx = r - imgSize / 2 - 10;
        ctx.save();
        ctx.beginPath();
        ctx.arc(imgCx, 0, imgSize / 2, 0, TAU);
        ctx.closePath();
        ctx.clip();
        const ar = img.naturalWidth / img.naturalHeight;
        let dw = imgSize, dh = imgSize;
        if (ar > 1) dw = imgSize * ar; else dh = imgSize / ar; // cover
        ctx.drawImage(img, imgCx - dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(imgCx, 0, imgSize / 2, 0, TAU);
        ctx.strokeStyle = "rgba(0,0,0,.25)";
        ctx.lineWidth = 2;
        ctx.stroke();
        labelEndX = imgCx - imgSize / 2 - 8;
      }

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = s.textColor || "#12142b";
      const fontSize = Math.max(10, Math.min(size * 0.04, (slice * r) * 0.6));
      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
      const maxChars = Math.max(3, Math.floor((labelEndX - 28) / (fontSize * 0.58)));
      let label = s.label;
      if (label.length > maxChars) label = label.slice(0, maxChars - 1) + "…";
      ctx.fillText(label, labelEndX, 0);
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

  // ===== Reel (horizontal Wheel-of-Fortune) rendering =====
  drawReel() {
    const ctx = this.ctx;
    const w = this._w, h = this._h;
    ctx.clearRect(0, 0, w, h);

    if (!this._cells.length) {
      ctx.fillStyle = "rgba(124,133,189,.9)";
      ctx.font = `600 ${Math.round(h * 0.16)}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Add some names to spin", w / 2, h / 2);
      return;
    }

    const cells = this._cells;
    const cellW = this._cellW();
    const start = Math.floor(this.reelOffset / cellW) - 1;
    const end = start + Math.ceil(w / cellW) + 2;
    const fontSize = Math.min(h * 0.16, cellW * 0.24, 22);

    for (let p = start; p <= end; p++) {
      const cell = cells[((p % cells.length) + cells.length) % cells.length];
      const s = cell.seg;
      const x = p * cellW - this.reelOffset;
      ctx.fillStyle = s.color;
      ctx.fillRect(x, 0, cellW, h);
      ctx.strokeStyle = "rgba(0,0,0,.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, 0.5, cellW - 1, h - 1);

      ctx.save();
      ctx.beginPath(); ctx.rect(x + 2, 0, cellW - 4, h); ctx.clip();
      ctx.fillStyle = s.textColor || "#12142b";
      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let label = s.label;
      const maxChars = Math.max(3, Math.floor((cellW - 12) / (fontSize * 0.56)));
      if (label.length > maxChars) label = label.slice(0, maxChars - 1) + "…";
      ctx.fillText(label, x + cellW / 2, h / 2);
      ctx.restore();
    }

    // Edge fades for depth.
    const fadeW = Math.min(90, w * 0.16);
    const lg = ctx.createLinearGradient(0, 0, fadeW, 0);
    lg.addColorStop(0, "rgba(10,12,30,.55)"); lg.addColorStop(1, "rgba(10,12,30,0)");
    ctx.fillStyle = lg; ctx.fillRect(0, 0, fadeW, h);
    const rg = ctx.createLinearGradient(w - fadeW, 0, w, 0);
    rg.addColorStop(0, "rgba(10,12,30,0)"); rg.addColorStop(1, "rgba(10,12,30,.55)");
    ctx.fillStyle = rg; ctx.fillRect(w - fadeW, 0, fadeW, h);

    // Center pointer.
    const cxp = w / 2;
    ctx.strokeStyle = "rgba(255,202,92,.95)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cxp, 6); ctx.lineTo(cxp, h - 6); ctx.stroke();
    ctx.fillStyle = "#ffca5c";
    ctx.beginPath(); ctx.moveTo(cxp - 11, -1); ctx.lineTo(cxp + 11, -1); ctx.lineTo(cxp, 17); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cxp - 11, h + 1); ctx.lineTo(cxp + 11, h + 1); ctx.lineTo(cxp, h - 17); ctx.closePath(); ctx.fill();
  }

  _spinReel(durationSec) {
    const cells = this._cells;
    const cellW = this._cellW();
    const winSeq = Math.floor(Math.random() * cells.length);
    const winnerIdx = cells[winSeq].idx;
    const win = this.segments[winnerIdx];

    const loops = 8 + Math.floor(Math.random() * 4);
    const jitter = (Math.random() * 0.6 - 0.3) * cellW;
    const targetSeq = winSeq + loops * cells.length;
    const target = targetSeq * cellW + cellW / 2 - this._w / 2 + jitter;
    const from = this.reelOffset;
    const delta = target - from;
    const dur = durationSec * 1000;
    const start = performance.now();
    this._lastReelCell = null;
    const ease = (t) => 1 - Math.pow(1 - t, 4);

    const frame = (now) => {
      const t = Math.min(1, (now - start) / dur);
      this.reelOffset = from + delta * ease(t);
      this._maybeTickReel(cellW);
      this.drawReel();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        this.spinning = false;
        const span = cells.length * cellW;
        this.reelOffset = ((this.reelOffset % span) + span) % span;
        this.drawReel();
        if (this.onWinner) this.onWinner(win.label, winnerIdx);
      }
    };
    requestAnimationFrame(frame);
  }

  _maybeTickReel(cellW) {
    if (!this.soundOn) return;
    const centerP = Math.floor((this.reelOffset + this._w / 2) / cellW);
    if (this._lastReelCell !== centerP) {
      if (this._lastReelCell !== null) sound.tick();
      this._lastReelCell = centerP;
    }
  }

  spin(durationSec = 5) {
    if (this.spinning || !this.segments.length) return;
    this.spinning = true;
    if (this.mode === "reel") { this._spinReel(durationSec); return; }
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
