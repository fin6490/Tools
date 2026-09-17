// pirates.js — Maths Pirates: a coordinate-reading treasure game for the class.
// The board is a labelled grid (columns A–…, rows 1–…). The teacher calls a
// square — at random or by clicking it — and every child checks that same
// coordinate on their OWN printed treasure map, which has the gold and power-ups
// in a different random arrangement, so the same call means different things
// around the room. Print a unique map per student. Zero deps.
import { el, shuffle } from "./quizkit.js?v=20260915t";
import { getState, save } from "./storage.js?v=20260915t";
import * as sound from "./sound.js?v=20260915t";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const colLetter = (i) => String.fromCharCode(65 + i);

// What can sit on a treasure square. `code` is what's printed in the cell; the
// legend spells each one out. No emoji — short codes read clearly in print too.
const ITEMS = {
  gold:    { code: "+1",  name: "Gold coin — +1 point", cls: "gold" },
  chest:   { code: "+5",  name: "Treasure chest — +5 points", cls: "chest" },
  diamond: { code: "+10", name: "Diamond — +10 points", cls: "diamond" },
  double:  { code: "×2",  name: "Double — double your score", cls: "double" },
  steal:   { code: "ST",  name: "Steal — take 3 points from another player", cls: "steal" },
  swap:    { code: "SW",  name: "Swap — swap scores with someone", cls: "swap" },
  shield:  { code: "SH",  name: "Shield — blocks the next steal or attack on you", cls: "shield" },
  cannon:  { code: "−3",  name: "Cannonball — lose 3 points", cls: "cannon" },
  shark:   { code: "−10", name: "Shark — lose 10 points", cls: "shark" },
  plank:   { code: "WP",  name: "Walk the plank — score back to zero", cls: "plank" },
};
// Relative likelihood of each item on a square (the rest of the grid is empty sea).
const WEIGHTS = [["gold", 30], ["chest", 12], ["diamond", 5], ["double", 8], ["steal", 8], ["swap", 4], ["shield", 5], ["cannon", 12], ["shark", 5], ["plank", 3]];
const WSUM = WEIGHTS.reduce((s, w) => s + w[1], 0);
function weightedItem() { let r = rint(WSUM); for (const [k, w] of WEIGHTS) { if (r < w) return k; r -= w; } return "gold"; }
// A single student's map: ~55% of squares carry something, arranged at random.
function buildMap(size) {
  const total = size * size, items = Math.round(total * 0.55);
  const cells = [];
  for (let i = 0; i < items; i++) cells.push(weightedItem());
  while (cells.length < total) cells.push(null); // empty sea
  return shuffle(cells);
}

export function initPirates(root) {
  const panel = root.querySelector(".pirates-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.pirates) s.pirates = { size: 8, printCount: 12 }; return s.pirates; };

  let size = 8, called = new Set(), lastCall = "";

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "pirates-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Coordinate treasure hunt"));
    card.appendChild(el("h2", "dojo-title", "Maths Pirates"));
    card.appendChild(el("p", "dojo-lede", "Print a unique treasure map for every pirate, then call the squares from the board — along the corridor and up the stairs. Everyone checks that coordinate on their own map to see what they've found."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const sizeRow = el("div", "dojo-field dojo-field-inline");
    sizeRow.appendChild(el("label", "dojo-lbl", "Grid size"));
    const sizeSel = el("select", "dojo-select dojo-select-sm");
    [[6, "6 × 6"], [8, "8 × 8"], [10, "10 × 10"]].forEach(([n, t]) => { const o = el("option"); o.value = n; o.textContent = t; if (n === (cfg().size || 8)) o.selected = true; sizeSel.appendChild(o); });
    sizeSel.addEventListener("change", () => { cfg().size = +sizeSel.value; save(); });
    sizeRow.appendChild(sizeSel);
    card.appendChild(sizeRow);

    const btns = el("div", "dojo-editbtns");
    const play = el("button", "btn primary dojo-begin", "Start calling");
    play.addEventListener("click", () => { cfg().size = +sizeSel.value; save(); startCaller(); });
    const printBtn = el("button", "btn ghost", "Print maps");
    printBtn.addEventListener("click", () => { cfg().size = +sizeSel.value; save(); renderPrint(); });
    btns.append(play, printBtn);
    card.appendChild(btns);
    card.appendChild(legendEl());
    panel.appendChild(card);
  }

  function legendEl() {
    const box = el("div", "pirates-legend");
    box.appendChild(el("p", "pirates-legend-title", "What's on the maps"));
    const grid = el("div", "pirates-legend-grid");
    Object.values(ITEMS).forEach((it) => {
      const row = el("div", "pirates-legend-item");
      row.appendChild(el("span", "pirates-code " + it.cls, it.code));
      row.appendChild(el("span", "pirates-legend-name", it.name));
      grid.appendChild(row);
    });
    box.appendChild(grid);
    return box;
  }

  /* ================= CALLER (on the board) ================= */
  function startCaller() {
    size = cfg().size || 8; called = new Set(); lastCall = "";
    panel.innerHTML = "";
    panel.appendChild(el("div", "pirates-game", `
      <div class="dojo-toprow">
        <span class="dojo-set">Maths Pirates — call the squares</span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="piMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="piBack">Change / print</button>
        </span>
      </div>
      <div class="pirates-callbar">
        <button class="btn primary pirates-pick" id="piPick">Pick a random square</button>
        <span class="pirates-call" id="piCall" aria-live="polite"></span>
      </div>
      <div class="pirates-board" id="piBoard"></div>
      <p class="pirates-calledlbl">Called: <span id="piCalledN">0</span></p>
      <div class="pirates-called" id="piCalled"></div>`));
    updateMute();
    panel.querySelector("#piMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#piBack").addEventListener("click", () => renderLobby());
    panel.querySelector("#piPick").addEventListener("click", pickRandom);
    buildBoard();
  }
  function updateMute() { const b = panel.querySelector("#piMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function buildBoard() {
    const board = panel.querySelector("#piBoard");
    board.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    board.innerHTML = "";
    board.appendChild(el("div", "pirates-corner"));               // top-left corner
    for (let c = 0; c < size; c++) board.appendChild(el("div", "pirates-head", colLetter(c)));
    for (let r = 0; r < size; r++) {
      board.appendChild(el("div", "pirates-head", String(r + 1))); // row number
      for (let c = 0; c < size; c++) {
        const coord = colLetter(c) + (r + 1);
        const cell = el("button", "pirates-cell"); cell.dataset.coord = coord; cell.title = coord;
        cell.addEventListener("click", () => call(coord));
        board.appendChild(cell);
      }
    }
  }

  const cellByCoord = (coord) => panel.querySelector(`.pirates-cell[data-coord="${coord}"]`);
  function allCoords() { const out = []; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) out.push(colLetter(c) + (r + 1)); return out; }

  function call(coord) {
    if (called.has(coord)) return;
    called.add(coord); lastCall = coord;
    const cell = cellByCoord(coord); if (cell) { cell.classList.add("called"); cell.disabled = true; }
    const callEl = panel.querySelector("#piCall");
    callEl.textContent = coord;
    callEl.style.animation = "none"; void callEl.offsetWidth; callEl.style.animation = "";
    panel.querySelector("#piCalledN").textContent = called.size;
    const chips = panel.querySelector("#piCalled");
    chips.appendChild(el("span", "pirates-chip", coord));
    fx(sound.fanfare);
  }

  function pickRandom() {
    const free = allCoords().filter((c) => !called.has(c));
    if (!free.length) { const callEl = panel.querySelector("#piCall"); callEl.textContent = "All squares called!"; return; }
    const pickBtn = panel.querySelector("#piPick"); pickBtn.disabled = true;
    let n = 0, last = null;
    const spin = setInterval(() => {
      if (last) last.classList.remove("flash");
      const c = free[rint(free.length)];
      last = cellByCoord(c); if (last) last.classList.add("flash");
      fx(sound.tick);
      if (++n >= 12) {
        clearInterval(spin);
        if (last) last.classList.remove("flash");
        pickBtn.disabled = false;
        call(free[rint(free.length)]);
      }
    }, 70);
  }

  /* ================= PRINTABLE STUDENT MAPS ================= */
  function renderPrint() {
    size = cfg().size || 8;
    const count = Math.min(40, Math.max(1, cfg().printCount || 12));
    panel.innerHTML = "";
    const bar = el("div", "dojo-editbtns pirates-noprint pirates-print-bar");
    const back = el("button", "btn ghost", "← Back"); back.addEventListener("click", () => renderLobby());
    const cntWrap = el("label", "pirates-count-ctrl", "Maps ");
    const cntSel = el("select", "dojo-select dojo-select-sm");
    [8, 12, 16, 20, 24, 30].forEach((v) => { const o = el("option"); o.value = v; o.textContent = v; if (v === count) o.selected = true; cntSel.appendChild(o); });
    cntSel.addEventListener("change", () => { cfg().printCount = +cntSel.value; save(); renderPrint(); });
    cntWrap.appendChild(cntSel);
    const again = el("button", "btn ghost", "Shuffle maps"); again.addEventListener("click", () => renderPrint());
    const print = el("button", "btn primary", "Print these"); print.addEventListener("click", () => window.print());
    bar.append(back, cntWrap, again, print);
    panel.appendChild(bar);
    panel.appendChild(el("p", "dojo-hint pirates-noprint", `${count} unique treasure maps (${size} × ${size}). Use your browser's print dialog — each pirate gets a different arrangement.`));

    const wrap = el("div", "pirates-print");
    for (let m = 0; m < count; m++) wrap.appendChild(printMap(m + 1));
    panel.appendChild(wrap);
  }

  function printMap(n) {
    const cardEl = el("div", "pirates-printcard");
    cardEl.appendChild(el("p", "pirates-printtitle", "TREASURE MAP"));
    cardEl.appendChild(el("p", "pirates-printset", "Name: ________________"));
    const map = buildMap(size);
    const grid = el("div", "pirates-printgrid");
    grid.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    grid.appendChild(el("div", "pirates-pcorner"));
    for (let c = 0; c < size; c++) grid.appendChild(el("div", "pirates-phead", colLetter(c)));
    for (let r = 0; r < size; r++) {
      grid.appendChild(el("div", "pirates-phead", String(r + 1)));
      for (let c = 0; c < size; c++) {
        const it = map[r * size + c];
        const cell = el("div", "pirates-pcell" + (it ? " " + ITEMS[it].cls : ""), it ? ITEMS[it].code : "");
        grid.appendChild(cell);
      }
    }
    cardEl.appendChild(grid);
    // Compact legend on each sheet.
    const leg = el("div", "pirates-plegend");
    Object.values(ITEMS).forEach((it) => leg.appendChild(el("span", "pirates-plegitem", `<b class="${it.cls}">${it.code}</b> ${it.name}`)));
    cardEl.appendChild(leg);
    return cardEl;
  }

  renderLobby();
}
