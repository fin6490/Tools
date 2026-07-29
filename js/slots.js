// slots.js — multiple vertical reels side by side, spun together (slot machine).
import { parseEntries } from "./wheel.js?v=20260730e";
import { getState, save } from "./storage.js?v=20260730e";
import * as sound from "./sound.js?v=20260730e";
import { burst } from "./confetti.js?v=20260730e";

class SlotReel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.items = [];
    this.offset = 0;
    this.spinning = false;
    this.soundOn = true;
    this.fit();
  }

  fit() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this._w = Math.max(80, rect.width || 150);
    this._h = Math.max(120, rect.height || 300);
    this.canvas.width = this._w * dpr;
    this.canvas.height = this._h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setItems(segs) {
    this.items = segs || [];
    this.offset = 0;
    this.draw();
  }

  _cellH() { return Math.max(52, this._h / 4); }

  draw() {
    const ctx = this.ctx, w = this._w, h = this._h;
    ctx.clearRect(0, 0, w, h);
    if (!this.items.length) {
      ctx.fillStyle = "rgba(141,130,153,.9)";
      ctx.font = `600 13px ui-monospace, monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("empty", w / 2, h / 2);
      return;
    }
    const cells = this.items, cellH = this._cellH();
    const start = Math.floor(this.offset / cellH) - 1;
    const end = start + Math.ceil(h / cellH) + 2;
    const fontSize = Math.min(cellH * 0.34, 20);
    for (let p = start; p <= end; p++) {
      const c = cells[((p % cells.length) + cells.length) % cells.length];
      const y = p * cellH - this.offset;
      ctx.fillStyle = c.color;
      ctx.fillRect(0, y, w, cellH);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, y + 0.5, w - 1, cellH - 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(2, y, w - 4, cellH); ctx.clip();
      ctx.fillStyle = c.textColor || "#12142b";
      ctx.font = `700 ${fontSize}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let label = c.label;
      const maxChars = Math.max(3, Math.floor((w - 12) / (fontSize * 0.62)));
      if (label.length > maxChars) label = label.slice(0, maxChars - 1) + "…";
      ctx.fillText(label, w / 2, y + cellH / 2);
      ctx.restore();
    }
    // edge fades
    const fade = Math.min(46, h * 0.16);
    let g = ctx.createLinearGradient(0, 0, 0, fade);
    g.addColorStop(0, "rgba(8,6,12,.85)"); g.addColorStop(1, "rgba(8,6,12,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, fade);
    g = ctx.createLinearGradient(0, h - fade, 0, h);
    g.addColorStop(0, "rgba(8,6,12,0)"); g.addColorStop(1, "rgba(8,6,12,.85)");
    ctx.fillStyle = g; ctx.fillRect(0, h - fade, w, fade);
    // center payline
    const cy = h / 2;
    ctx.strokeStyle = "rgba(255,194,60,.9)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.fillStyle = "#ffc23c";
    ctx.beginPath(); ctx.moveTo(0, cy - 9); ctx.lineTo(14, cy); ctx.lineTo(0, cy + 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, cy - 9); ctx.lineTo(w - 14, cy); ctx.lineTo(w, cy + 9); ctx.closePath(); ctx.fill();
  }

  spin(durationSec, delaySec, onDone) {
    if (!this.items.length) { onDone && onDone(null); return; }
    this.spinning = true;
    const cells = this.items, cellH = this._cellH();
    const winSeq = Math.floor(Math.random() * cells.length);
    const winner = cells[winSeq];
    const loops = 6 + Math.floor(Math.random() * 4);
    const jitter = (Math.random() * 0.5 - 0.25) * cellH;
    const target = (winSeq + loops * cells.length) * cellH + cellH / 2 - this._h / 2 + jitter;
    const from = this.offset;
    const delta = target - from;
    const dur = durationSec * 1000;
    const startAt = performance.now() + delaySec * 1000;
    let lastCell = null;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const frame = (now) => {
      if (now < startAt) { requestAnimationFrame(frame); return; }
      const t = Math.min(1, (now - startAt) / dur);
      this.offset = from + delta * ease(t);
      if (this.soundOn) {
        const cp = Math.floor((this.offset + this._h / 2) / cellH);
        if (lastCell !== cp) { if (lastCell !== null) sound.tick(0.05); lastCell = cp; }
      }
      this.draw();
      if (t < 1) requestAnimationFrame(frame);
      else {
        this.spinning = false;
        const span = cells.length * cellH;
        this.offset = ((this.offset % span) + span) % span;
        this.draw();
        onDone && onDone(winner.label);
      }
    };
    requestAnimationFrame(frame);
  }
}

export function initSlots(root, { soundOn = () => true } = {}) {
  const reelsWrap = root.querySelector("#slotReels");
  const countInput = root.querySelector("#slotCount");
  const spinBtn = root.querySelector("#slotsSpin");
  let reels = []; // { reel, sourceId, resultEl }

  function state() {
    const s = getState();
    if (!s.slots) s.slots = { count: 3, sources: [] };
    return s.slots;
  }
  const wheels = () => getState().wheels;
  const wheelById = (id) => wheels().find((w) => w.id === id) || wheels()[0];

  function itemsFor(id) {
    const w = wheelById(id);
    return w ? parseEntries(w.text) : [];
  }

  function build() {
    const cfg = state();
    const ws = wheels();
    countInput.value = cfg.count;
    reelsWrap.innerHTML = "";
    reels = [];
    for (let i = 0; i < cfg.count; i++) {
      const sourceId = (cfg.sources[i] && ws.some((w) => w.id === cfg.sources[i]))
        ? cfg.sources[i] : ws[0].id;
      cfg.sources[i] = sourceId;

      const slot = document.createElement("div");
      slot.className = "slot";

      const src = document.createElement("div");
      src.className = "slot-source";
      const sel = document.createElement("select");
      sel.setAttribute("aria-label", "Reel source wheel");
      ws.forEach((w) => {
        const o = document.createElement("option");
        o.value = w.id; o.textContent = w.name;
        if (w.id === sourceId) o.selected = true;
        sel.appendChild(o);
      });
      src.appendChild(sel);

      const frame = document.createElement("div");
      frame.className = "slot-frame";
      frame.title = "Click to spin just this reel";
      const canvas = document.createElement("canvas");
      frame.appendChild(canvas);

      const result = document.createElement("div");
      result.className = "slot-result";

      const spinOneBtn = document.createElement("button");
      spinOneBtn.className = "mini-btn slot-spin-one";
      spinOneBtn.textContent = "Spin";

      slot.append(src, frame, result, spinOneBtn);
      reelsWrap.appendChild(slot);

      const reel = new SlotReel(canvas);
      const entry = { reel, sourceId, resultEl: result, sel };
      reel.setItems(itemsFor(sourceId));

      // Spin just this one reel (click the reel or its Spin button).
      frame.addEventListener("click", () => spinOne(entry));
      spinOneBtn.addEventListener("click", () => spinOne(entry));

      sel.addEventListener("change", () => {
        entry.sourceId = sel.value;
        cfg.sources[i] = sel.value;
        save();
        reel.fit();
        reel.setItems(itemsFor(sel.value));
        result.textContent = "";
      });

      reels.push(entry);
    }
    save();
    // reels need a real size once laid out
    requestAnimationFrame(relayout);
  }

  function relayout() {
    reels.forEach((r) => { r.reel.fit(); r.reel.setItems(itemsFor(r.sourceId)); });
  }

  function spinOne(entry) {
    if (entry.reel.spinning) return;
    entry.resultEl.textContent = "";
    entry.reel.soundOn = soundOn();
    entry.reel.spin(2.6, 0, (label) => {
      entry.resultEl.textContent = label || "—";
      if (label) burst(60);
    });
  }

  function spinAll() {
    if (reels.some((r) => r.reel.spinning)) return;
    let remaining = reels.length;
    let anyWinner = false;
    reels.forEach((r, i) => {
      r.resultEl.textContent = "";
      r.reel.soundOn = soundOn();
      r.reel.spin(2.4 + i * 0.35, i * 0.18, (label) => {
        r.resultEl.textContent = label || "—";
        if (label) anyWinner = true;
        if (--remaining === 0 && anyWinner) burst(90);
      });
    });
  }

  countInput.addEventListener("change", () => {
    const n = Math.max(2, Math.min(6, Number(countInput.value) || 3));
    state().count = n;
    save();
    build();
  });

  root.querySelector("#slotSameSource").addEventListener("click", () => {
    if (!reels.length) return;
    const first = reels[0].sourceId;
    const cfg = state();
    reels.forEach((r, i) => {
      r.sourceId = first; cfg.sources[i] = first; r.sel.value = first;
      r.reel.setItems(itemsFor(first));
      r.resultEl.textContent = "";
    });
    save();
  });

  spinBtn.addEventListener("click", spinAll);

  build();
  return { relayout, spinAll, rebuild: build };
}
