// axiom.js — Axiom: a daily maths crossword with five difficulty levels.
// Easy: a four-equation ring. Medium: an interlocking 3×3 crossword (six lines).
// Hard: the same 3×3 crossword mixing + − × ÷. Expert: a 4×4 crossword on a 7×7
// grid — eight lines of three-number sums. Genius: a six-line crossword that
// mixes all four operations, allows negative numbers, and carries two inequality
// lines (< or >) as well as equalities. A few numbers are removed to a rack;
// place them so every line reads true across and down. One puzzle per day per
// level, seeded from the date. Self-checking. Zero deps.
import { el } from "./quizkit.js?v=20260915y";
import { getState, save } from "./storage.js?v=20260915y";
import * as sound from "./sound.js?v=20260915y";

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
const apply = (op, x, y) => op === "+" ? x + y : op === "−" ? x - y : op === "×" ? x * y : x / y;
const shuf = (a, rand) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Easy: a ring of four equations sharing its corners ---------- */
const RING = {
  dim: 5,
  dead: [6, 7, 8, 11, 12, 13, 16, 17, 18],
  numCells: [0, 2, 4, 10, 14, 20, 22, 24],
  lanes: [[0, 1, 2, 3, 4], [20, 21, 22, 23, 24], [0, 5, 10, 15, 20], [4, 9, 14, 19, 24]],
  blanks: 3,
  generate(rand) {
    const ri = (n) => Math.floor(rand() * n), pick = (a) => a[ri(a.length)];
    for (let t = 0; t < 500; t++) {
      const a = 2 + ri(9), b = 2 + ri(9), op1 = pick(["+", "−", "×"]);
      const c = apply(op1, a, b); if (c <= 1 || c > 99) continue;
      const op3 = pick(["+", "−"]), g = 2 + ri(9), d = apply(op3, a, g); if (d <= 1 || d > 99) continue;
      const f = Math.max(c, d) + 2 + ri(14), e = f - d, h = f - c; if (e <= 1 || h <= 1 || f > 99) continue;
      const v = {}; v[0] = a; v[2] = b; v[4] = c; v[10] = g; v[14] = h; v[20] = d; v[22] = e; v[24] = f;
      v[1] = op1; v[21] = "+"; v[5] = op3; v[9] = "+"; v[3] = v[15] = v[19] = v[23] = "="; return v;
    }
    return null;
  },
};

/* ---------- Interlocking crossword shapes (numbers at even rows/cols) ---------- */
function crossword(dim) {
  const m = (dim + 1) / 2, dead = [], numCells = [], lanes = [];
  for (let r = 0; r < dim; r++) for (let c = 0; c < dim; c++) if (r % 2 && c % 2) dead.push(r * dim + c);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) numCells.push((2 * i) * dim + (2 * j));
  for (let i = 0; i < m; i++) { const R = 2 * i, l = []; for (let c = 0; c < dim; c++) l.push(R * dim + c); lanes.push(l); }
  for (let j = 0; j < m; j++) { const C = 2 * j, l = []; for (let r = 0; r < dim; r++) l.push(r * dim + C); lanes.push(l); }
  return { dim, m, dead, numCells, lanes };
}
const XW5 = crossword(5), XW7 = crossword(7);

// All-addition grid: every row and column reads left1 + left2 (+ …) = last.
function fillAdd(shape, rand) {
  const m = shape.m, ri = (n) => Math.floor(rand() * n);
  for (let t = 0; t < 800; t++) {
    const g = Array.from({ length: m }, () => Array(m).fill(0));
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < m - 1; j++) g[i][j] = 2 + ri(9);
    for (let i = 0; i < m - 1; i++) { let s = 0; for (let j = 0; j < m - 1; j++) s += g[i][j]; g[i][m - 1] = s; }
    for (let j = 0; j < m - 1; j++) { let s = 0; for (let i = 0; i < m - 1; i++) s += g[i][j]; g[m - 1][j] = s; }
    let tot = 0; for (let i = 0; i < m - 1; i++) for (let j = 0; j < m - 1; j++) tot += g[i][j]; g[m - 1][m - 1] = tot;
    let good = true; for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (g[i][j] < 1 || g[i][j] > 99) good = false;
    if (!good) continue;
    const v = {};
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) v[(2 * i) * shape.dim + (2 * j)] = g[i][j];
    shape.lanes.forEach((l) => l.forEach((cell, idx) => { if (idx % 2 === 1) v[cell] = (idx === shape.dim - 2) ? "=" : "+"; }));
    return v;
  }
  return null;
}

// Mixed-op 3×3 crossword (+ − × ÷) built by search, deriving the last op to close it.
function fillMixed5(rand) {
  const ri = (n) => Math.floor(rand() * n);
  const pool = ["+", "−", "×", "÷", "+", "−"], pick = () => pool[ri(pool.length)];
  const ok = (x) => Number.isInteger(x) && x >= 1 && x <= 99;
  for (let t = 0; t < 6000; t++) {
    const a = 2 + ri(9), b = 2 + ri(9), opR0 = pick(), c = apply(opR0, a, b); if (!ok(c)) continue;
    const d = 2 + ri(9), e = 2 + ri(9), opR1 = pick(), f = apply(opR1, d, e); if (!ok(f)) continue;
    const opC0 = pick(), n40 = apply(opC0, a, d); if (!ok(n40)) continue;
    const opC1 = pick(), n42 = apply(opC1, b, e); if (!ok(n42)) continue;
    const opR2 = pick(), n44 = apply(opR2, n40, n42); if (!ok(n44)) continue;
    const opC2 = ["+", "−", "×", "÷"].find((op) => { const r = apply(op, c, f); return Number.isInteger(r) && r === n44; });
    if (!opC2) continue;
    const v = {};
    v[0] = a; v[2] = b; v[4] = c; v[10] = d; v[12] = e; v[14] = f; v[20] = n40; v[22] = n42; v[24] = n44;
    v[1] = opR0; v[11] = opR1; v[21] = opR2; v[5] = opC0; v[7] = opC1; v[9] = opC2;
    v[3] = v[13] = v[23] = v[15] = v[17] = v[19] = "="; return v;
  }
  return fillAdd(XW5, rand);
}

const MEDIUM = Object.assign({}, XW5, { blanks: 4, generate: (rand) => fillAdd(XW5, rand) });
const HARD = Object.assign({}, XW5, { blanks: 5, generate: (rand) => fillMixed5(rand) });
const EXPERT = Object.assign({}, XW7, { blanks: 7, generate: (rand) => fillAdd(XW7, rand) });

/* ---------- Genius: a 3×3 ring-cross with negatives and two inequalities ----------
   Four equality lanes form the outer ring; two more lanes run through the middle
   and read as inequalities (< or >). Numbers may be negative and every operation
   is in play, so it's the hardest board. Layout (5×5):
     row0  a op b  = c        col0  a op g  = d
     row4  d op e  = f        col4  c op h  = f
     midR  g op k <>  h       midC  b op k <>  e   (k is the shared centre)     */
const GENIUS_LAYOUT = {
  dim: 5,
  dead: [6, 8, 16, 18],
  numCells: [0, 2, 4, 10, 12, 14, 20, 22, 24],
  lanes: [
    [0, 1, 2, 3, 4], [20, 21, 22, 23, 24],   // rows 0 and 4 (equalities)
    [0, 5, 10, 15, 20], [4, 9, 14, 19, 24],   // cols 0 and 4 (equalities)
    [10, 11, 12, 13, 14],                     // middle row (inequality)
    [2, 7, 12, 17, 22],                       // middle col (inequality)
  ],
  blanks: 6,
};
function fillGenius(rand) {
  const NP = [-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9];
  const OPS = ["+", "−", "×", "÷"];
  const ri = (n) => Math.floor(rand() * n);
  const pn = () => NP[ri(NP.length)], po = () => OPS[ri(OPS.length)];
  const ok = (x) => Number.isInteger(x) && x >= -50 && x <= 99;
  // e such that (d op e) === f, or null when it can't be made an integer.
  const closeE = (op, d, f) => {
    if (op === "+") return f - d;
    if (op === "−") return d - f;
    if (op === "×") return d !== 0 && f % d === 0 ? f / d : null;
    return f !== 0 && d % f === 0 ? d / f : null; // ÷ : d / e = f  →  e = d / f
  };
  for (let t = 0; t < 8000; t++) {
    const a = pn(), b = pn(), op1 = po(), c = apply(op1, a, b); if (!ok(c)) continue;
    const g = pn(), op2 = po(), d = apply(op2, a, g); if (!ok(d)) continue;
    const h = pn(), op3 = po(), f = apply(op3, c, h); if (!ok(f)) continue;
    const op4 = po(), e = closeE(op4, d, f); if (e == null || !ok(e) || apply(op4, d, e) !== f) continue;
    const k = pn();
    const op5 = po(), lhsR = apply(op5, g, k); if (!ok(lhsR) || lhsR === h) continue;
    const op6 = po(), lhsC = apply(op6, b, k); if (!ok(lhsC) || lhsC === e) continue;
    const v = {};
    v[0] = a; v[2] = b; v[4] = c; v[10] = g; v[12] = k; v[14] = h; v[20] = d; v[22] = e; v[24] = f;
    v[1] = op1; v[21] = op4; v[5] = op2; v[9] = op3; v[11] = op5; v[7] = op6;
    v[3] = v[23] = v[15] = v[19] = "=";
    v[13] = lhsR < h ? "<" : ">";
    v[17] = lhsC < e ? "<" : ">";
    return v;
  }
  return null;
}
const GENIUS = Object.assign({}, GENIUS_LAYOUT, { generate: fillGenius });

const LEVELS = { easy: RING, medium: MEDIUM, hard: HARD, expert: EXPERT, genius: GENIUS };
const LEVEL_ORDER = ["easy", "medium", "hard", "expert", "genius"];
const LEVEL_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert", genius: "Genius" };

export function initAxiom(root) {
  const panel = root.querySelector(".axiom-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.axiom) s.axiom = { lastSolved: 0, streak: 0, level: "medium" }; if (!LEVELS[s.axiom.level]) s.axiom.level = "medium"; return s.axiom; };

  let layout = MEDIUM, solution = null, blanks = [], rack = [], fill = {}, held = -1, daily = true, solved = false;

  function build(seed, isDaily) {
    layout = LEVELS[cfg().level] || MEDIUM;
    const rand = mulberry32(seed);
    solution = layout.generate(rand);
    const order = shuf(layout.numCells, rand);
    blanks = order.slice(0, layout.blanks);
    rack = shuf(blanks.map((idx, i) => ({ id: i, value: solution[idx] })), rand);
    fill = {}; held = -1; daily = isDaily; solved = false;
  }
  const dailySeed = () => dateKey() * 10 + LEVEL_ORDER.indexOf(cfg().level);

  /* ================= RENDER ================= */
  function render() {
    panel.innerHTML = "";
    const wrap = el("div", "axiom-wrap");
    wrap.appendChild(el("p", "dojo-eyebrow", daily ? "Daily maths puzzle" : "Practice puzzle"));
    wrap.appendChild(el("h2", "dojo-title", "Axiom"));
    wrap.appendChild(el("p", "dojo-lede", "Place the number tiles so every line reads as a true equation — across and down. Shared cells have to work in both directions at once."));

    const levels = el("div", "axiom-levels");
    LEVEL_ORDER.forEach((lv) => {
      const b = el("button", "axiom-level" + (cfg().level === lv ? " on" : ""), LEVEL_LABEL[lv]);
      b.addEventListener("click", () => { if (cfg().level === lv) return; cfg().level = lv; save(); build(dailySeed(), true); render(); });
      levels.appendChild(b);
    });
    wrap.appendChild(levels);

    const dim = layout.dim;
    const board = el("div", "axiom-board" + (dim >= 7 ? " dim7" : "")); board.id = "axBoard";
    board.style.gridTemplateColumns = `repeat(${dim}, 1fr)`;
    for (let i = 0; i < dim * dim; i++) {
      if (layout.dead.includes(i)) { board.appendChild(el("div", "axiom-cell dead")); continue; }
      const v = solution[i];
      if (typeof v === "string") { board.appendChild(el("div", "axiom-cell op", v)); continue; }
      if (blanks.includes(i)) {
        const cell = el("button", "axiom-cell blank", fill[i] != null ? String(rack[fill[i]].value) : "");
        cell.dataset.i = i; cell.addEventListener("click", () => onCell(i)); board.appendChild(cell);
      } else {
        board.appendChild(el("div", "axiom-cell num", String(v)));
      }
    }
    wrap.appendChild(board);

    const rackEl = el("div", "axiom-rack");
    rack.forEach((t, i) => {
      const used = Object.values(fill).includes(i);
      const b = el("button", "axiom-tile" + (used ? " used" : "") + (held === i ? " held" : ""), String(t.value));
      b.disabled = used; b.addEventListener("click", () => onTile(i)); rackEl.appendChild(b);
    });
    wrap.appendChild(rackEl);

    wrap.appendChild(el("p", "axiom-status", "")).id = "axStatus";

    const ctrls = el("div", "dojo-editbtns axiom-ctrls");
    const clear = el("button", "btn ghost", "Clear"); clear.addEventListener("click", () => { fill = {}; held = -1; solved = false; render(); });
    const practice = el("button", "btn ghost", daily ? "Practice puzzle" : "Back to today's");
    practice.addEventListener("click", () => { if (daily) build((Math.random() * 1e9) | 0, false); else build(dailySeed(), true); render(); });
    ctrls.append(clear, practice);
    wrap.appendChild(ctrls);

    if (cfg().level === "genius") wrap.appendChild(el("p", "dojo-hint", "Genius mixes every operation, uses negative numbers, and two lines read as inequalities — the middle across and down must be less-than (<) or greater-than (>), not equal."));
    const cs = cfg();
    if (cs.streak > 0) wrap.appendChild(el("p", "dojo-hint", `Daily streak: ${cs.streak} ${cs.streak === 1 ? "day" : "days"}. A new Axiom every day, at each level.`));
    panel.appendChild(wrap);
    updateStatus();
  }

  function onTile(i) { if (solved || Object.values(fill).includes(i)) return; held = held === i ? -1 : i; fx(sound.tick); render(); }
  function onCell(i) {
    if (solved) return;
    if (fill[i] != null) { delete fill[i]; fx(sound.tick); return render(); }
    if (held < 0) return;
    fill[i] = held; held = -1; fx(sound.tick); render();
  }

  const valueAt = (i) => blanks.includes(i) ? (fill[i] != null ? rack[fill[i]].value : null) : solution[i];
  const RELS = { "=": (x, y) => x === y, "<": (x, y) => x < y, ">": (x, y) => x > y, "≤": (x, y) => x <= y, "≥": (x, y) => x >= y };
  // Evaluate a lane left-to-right: num (op num)* <rel> num, where <rel> is one of = < > ≤ ≥.
  function laneOk(lane) {
    let acc = null, op = null, target = null, rel = null;
    for (const cell of lane) {
      const raw = solution[cell];
      if (RELS[raw]) { rel = raw; continue; }
      if (typeof raw === "string") { op = raw; continue; }
      const val = valueAt(cell); if (val == null) return null;
      if (rel != null) target = val;
      else if (acc == null) acc = val;
      else acc = apply(op, acc, val);
    }
    if (acc == null || target == null) return null;
    return RELS[rel](acc, target);
  }

  function updateStatus() {
    const results = layout.lanes.map(laneOk);
    const filledAll = Object.keys(fill).length === blanks.length;
    const board = panel.querySelector("#axBoard");
    layout.lanes.forEach((lane, li) => {
      const ok = results[li];
      lane.filter((c) => typeof solution[c] !== "string").forEach((idx) => {
        const cell = board.children[idx]; if (!cell) return;
        cell.classList.remove("good", "bad");
        if (ok === true) cell.classList.add("good");
        else if (ok === false && filledAll) cell.classList.add("bad");
      });
    });
    const status = panel.querySelector("#axStatus");
    if (!filledAll) { status.textContent = `Place all ${blanks.length} tiles.`; status.className = "axiom-status"; return; }
    const right = results.filter((r) => r === true).length;
    if (right === layout.lanes.length && !solved) return solve();
    status.textContent = `${right} of ${layout.lanes.length} lines correct — keep trying.`;
    status.className = "axiom-status";
  }

  function solve() {
    solved = true; fx(sound.fanfare);
    const status = panel.querySelector("#axStatus");
    status.textContent = "Solved! Every line checks out.";
    status.className = "axiom-status solved";
    if (daily) {
      const cs = cfg(), today = dateKey();
      if (cs.lastSolved !== today) { cs.streak = cs.lastSolved === prevKey(today) ? (cs.streak || 0) + 1 : 1; cs.lastSolved = today; save(); }
    }
  }

  build(dailySeed(), true);
  render();
}
