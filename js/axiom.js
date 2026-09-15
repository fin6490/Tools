// axiom.js — Axiom: a daily maths crossword. A ring of four equations shares its
// corners; some numbers are removed to a rack and you place them back so every
// line (across and down) reads true. One puzzle per day, seeded from the date,
// so the whole class gets the same challenge. Self-checking. Zero deps.
import { el } from "./quizkit.js?v=20260915d";
import { getState, save } from "./storage.js?v=20260915d";
import * as sound from "./sound.js?v=20260915d";

// Seeded PRNG so a given day always produces the same puzzle.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dateKey = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
function prevKey(k) { const y = Math.floor(k / 10000), m = Math.floor(k / 100) % 100, d = k % 100; const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - 1); return dateKey(dt); }

// The 5×5 ring layout. Indices are r*5+c. Middle cells are dead (unused).
const A = 0, C = 4, G = 10, H = 14, D = 20, F = 24, B = 2, E = 22;
const OP1 = 1, EQ_T = 3, OP3 = 5, OP4 = 9, EQ_L = 15, EQ_R = 19, OP2 = 21, EQ_B = 23;
const NUM_CELLS = [A, B, C, D, E, F, G, H];
const LANES = [
  [A, OP1, B, EQ_T, C],   // top:    A op1 B = C
  [D, OP2, E, EQ_B, F],   // bottom: D op2 E = F
  [A, OP3, G, EQ_L, D],   // left:   A op3 G = D
  [C, OP4, H, EQ_R, F],   // right:  C op4 H = F
];
const DEAD = [6, 7, 8, 11, 12, 13, 16, 17, 18];

function apply(op, x, y) { return op === "+" ? x + y : op === "−" ? x - y : x * y; }

// Build a valid filled grid (a ring of four true equations).
function generate(rand) {
  const ri = (n) => Math.floor(rand() * n);
  const pick = (arr) => arr[ri(arr.length)];
  for (let attempt = 0; attempt < 500; attempt++) {
    const a = 2 + ri(9), b = 2 + ri(9);
    const op1 = pick(["+", "−", "×"]);
    const c = apply(op1, a, b);
    if (c <= 1 || c > 99) continue;
    const op3 = pick(["+", "−"]), g = 2 + ri(9);
    const d = apply(op3, a, g);
    if (d <= 1 || d > 99) continue;
    const f = Math.max(c, d) + 2 + ri(14);
    const e = f - d, h = f - c;         // op2 and op4 are "+"
    if (e <= 1 || h <= 1 || f > 99) continue;
    const vals = {};
    vals[A] = a; vals[B] = b; vals[C] = c; vals[D] = d; vals[E] = e; vals[F] = f; vals[G] = g; vals[H] = h;
    vals[OP1] = op1; vals[OP2] = "+"; vals[OP3] = op3; vals[OP4] = "+";
    vals[EQ_T] = vals[EQ_B] = vals[EQ_L] = vals[EQ_R] = "=";
    return vals;
  }
  return null;
}

export function initAxiom(root) {
  const panel = root.querySelector(".axiom-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  const cfg = () => { const s = getState(); if (!s.axiom) s.axiom = { lastSolved: 0, streak: 0 }; return s.axiom; };

  let solution = null, blanks = [], rack = [], fill = {}, held = -1, daily = true, solved = false;

  function build(seed, isDaily) {
    const rand = mulberry32(seed);
    solution = generate(rand);
    // Choose 4 number cells to remove into the rack (seeded shuffle).
    const order = NUM_CELLS.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    blanks = order.slice(0, 4);
    rack = blanks.map((idx, i) => ({ id: i, value: solution[idx] }));
    for (let i = rack.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [rack[i], rack[j]] = [rack[j], rack[i]]; }
    fill = {}; held = -1; daily = isDaily; solved = false;
  }

  /* ================= RENDER ================= */
  function render(flash) {
    panel.innerHTML = "";
    const wrap = el("div", "axiom-wrap");
    wrap.appendChild(el("p", "dojo-eyebrow", daily ? "Daily maths puzzle" : "Practice puzzle"));
    wrap.appendChild(el("h2", "dojo-title", "Axiom"));
    wrap.appendChild(el("p", "dojo-lede", "Place the number tiles so every line reads as a true equation — across and down. The corners are shared, so each tile has to work two ways."));
    if (flash) wrap.appendChild(el("p", "dojo-flash", flash));

    const board = el("div", "axiom-board"); board.id = "axBoard";
    for (let i = 0; i < 25; i++) {
      if (DEAD.includes(i)) { board.appendChild(el("div", "axiom-cell dead")); continue; }
      const v = solution[i];
      if (typeof v === "string") { board.appendChild(el("div", "axiom-cell op", v)); continue; }
      if (blanks.includes(i)) {
        const cell = el("button", "axiom-cell blank", fill[i] != null ? String(rack[fill[i]].value) : "");
        cell.dataset.i = i;
        cell.addEventListener("click", () => onCell(i));
        board.appendChild(cell);
      } else {
        board.appendChild(el("div", "axiom-cell num", String(v)));
      }
    }
    wrap.appendChild(board);

    const rackEl = el("div", "axiom-rack"); rackEl.id = "axRack";
    rack.forEach((t, i) => {
      const used = Object.values(fill).includes(i);
      const b = el("button", "axiom-tile" + (used ? " used" : "") + (held === i ? " held" : ""), String(t.value));
      b.dataset.r = i;
      b.disabled = used;
      b.addEventListener("click", () => onTile(i));
      rackEl.appendChild(b);
    });
    wrap.appendChild(rackEl);

    const status = el("p", "axiom-status"); status.id = "axStatus"; wrap.appendChild(status);

    const ctrls = el("div", "dojo-editbtns axiom-ctrls");
    const clear = el("button", "btn ghost", "Clear"); clear.addEventListener("click", () => { fill = {}; held = -1; solved = false; render(); });
    const practice = el("button", "btn ghost", daily ? "Practice puzzle" : "Back to today's");
    practice.addEventListener("click", () => { if (daily) { build((Math.random() * 1e9) | 0, false); } else { build(dateKey(), true); } render(); });
    ctrls.append(clear, practice);
    wrap.appendChild(ctrls);

    const cs = cfg();
    if (cs.streak > 0) wrap.appendChild(el("p", "dojo-hint", `Daily streak: ${cs.streak} ${cs.streak === 1 ? "day" : "days"}. A new Axiom every day.`));
    panel.appendChild(wrap);
    updateStatus();
  }

  function onTile(i) {
    if (solved || Object.values(fill).includes(i)) return;
    held = held === i ? -1 : i;
    fx(sound.tick);
    render();
  }
  function onCell(i) {
    if (solved) return;
    if (fill[i] != null) { // clear this cell back to the rack
      delete fill[i]; fx(sound.tick); render(); return;
    }
    if (held < 0) return;
    fill[i] = held; held = -1; fx(sound.tick);
    render();
  }

  function valueAt(i) { return blanks.includes(i) ? (fill[i] != null ? rack[fill[i]].value : null) : solution[i]; }
  function laneOk(lane) {
    const [a, op, b, , c] = lane.map(valueAt);
    if (a == null || b == null || c == null) return null;
    return apply(solution[lane[1]], a, b) === c;
  }

  function updateStatus() {
    const results = LANES.map(laneOk);
    const filledAll = Object.keys(fill).length === blanks.length;
    const status = panel.querySelector("#axStatus");
    // tint the number cells of complete lanes
    const board = panel.querySelector("#axBoard");
    LANES.forEach((lane, li) => {
      const ok = results[li];
      [lane[0], lane[2], lane[4]].forEach((idx) => {
        const cell = board.children[idx];
        cell.classList.remove("good", "bad");
        if (ok === true) cell.classList.add("good");
        else if (ok === false && filledAll) cell.classList.add("bad");
      });
    });
    if (!filledAll) { status.textContent = `Place all ${blanks.length} tiles.`; status.className = "axiom-status"; return; }
    const right = results.filter((r) => r === true).length;
    if (right === 4 && !solved) return solve();
    status.textContent = `${right} of 4 lines correct — keep trying.`;
    status.className = "axiom-status";
  }

  function solve() {
    solved = true;
    fx(sound.fanfare);
    const status = panel.querySelector("#axStatus");
    status.textContent = "Solved! Every line adds up.";
    status.className = "axiom-status solved";
    if (daily) {
      const cs = cfg(), today = dateKey();
      if (cs.lastSolved !== today) {
        cs.streak = cs.lastSolved === prevKey(today) ? (cs.streak || 0) + 1 : 1;
        cs.lastSolved = today; save();
      }
    }
  }

  build(dateKey(), true);
  render();
}
