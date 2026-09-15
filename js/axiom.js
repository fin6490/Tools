// axiom.js — Axiom: a daily maths crossword with three difficulty levels.
// Easy is a four-equation ring; Medium and Hard are fully interlocking 3×3
// crosswords (six lines — three across, three down) with Hard mixing +, − and ×.
// A few numbers are removed to a rack; place them so every line reads true.
// One puzzle per day per level, seeded from the date. Self-checking. Zero deps.
import { el } from "./quizkit.js?v=20260915e";
import { getState, save } from "./storage.js?v=20260915e";
import * as sound from "./sound.js?v=20260915e";

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
const apply = (op, x, y) => op === "+" ? x + y : op === "−" ? x - y : x * y;
const shuf = (a, rand) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Easy: a ring of four equations sharing its corners ---------- */
// cells: A=0 op 2=B =3 C=4 ; left col 0 op5 10=G =15 20=D ; bottom 20 op21 22=E =23 24=F ; right 4 op9 14=H =19 24
const RING = {
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

/* ---------- Medium/Hard: an interlocking 3×3 crossword ---------- */
// numbers at even rows/cols; 3 across lanes + 3 down lanes, all sharing cells.
const XW_BASE = {
  dead: [6, 8, 16, 18],
  numCells: [0, 2, 4, 10, 12, 14, 20, 22, 24],
  lanes: [
    [0, 1, 2, 3, 4], [10, 11, 12, 13, 14], [20, 21, 22, 23, 24], // across
    [0, 5, 10, 15, 20], [2, 7, 12, 17, 22], [4, 9, 14, 19, 24],  // down
  ],
};
function xwBuild(v, cells, rowOps, colOps) {
  // cells = [n00,n02,n04,n20,n22,n24,n40,n42,n44]; rowOps/colOps length 3
  const [n00, n02, n04, n20, n22, n24, n40, n42, n44] = cells;
  v[0] = n00; v[2] = n02; v[4] = n04; v[10] = n20; v[12] = n22; v[14] = n24; v[20] = n40; v[22] = n42; v[24] = n44;
  v[1] = rowOps[0]; v[11] = rowOps[1]; v[21] = rowOps[2];
  v[5] = colOps[0]; v[7] = colOps[1]; v[9] = colOps[2];
  v[3] = v[13] = v[23] = v[15] = v[17] = v[19] = "=";
  return v;
}
const MEDIUM = Object.assign({}, XW_BASE, {
  blanks: 4,
  generate(rand) {
    const ri = (n) => Math.floor(rand() * n);
    for (let t = 0; t < 500; t++) {
      const a = 2 + ri(11), b = 2 + ri(11), d = 2 + ri(11), e = 2 + ri(11); // all-addition grid
      const cells = [a, b, a + b, d, e, d + e, a + d, b + e, a + b + d + e];
      if (cells.some((x) => x > 99)) continue;
      return xwBuild({}, cells, ["+", "+", "+"], ["+", "+", "+"]);
    }
    return null;
  },
});
const HARD = Object.assign({}, XW_BASE, {
  blanks: 5,
  generate(rand) {
    const ri = (n) => Math.floor(rand() * n);
    const pool = ["+", "−", "+", "−", "×"]; // weight away from × (keeps numbers small)
    const pick = () => pool[ri(pool.length)];
    const ok = (x) => x >= 1 && x <= 99;
    for (let t = 0; t < 4000; t++) {
      const a = 2 + ri(9), b = 2 + ri(9), opR0 = pick(), c = apply(opR0, a, b); if (!ok(c)) continue;
      const d = 2 + ri(9), e = 2 + ri(9), opR1 = pick(), f = apply(opR1, d, e); if (!ok(f)) continue;
      const opC0 = pick(), n40 = apply(opC0, a, d); if (!ok(n40)) continue;
      const opC1 = pick(), n42 = apply(opC1, b, e); if (!ok(n42)) continue;
      const opR2 = pick(), n44 = apply(opR2, n40, n42); if (!ok(n44)) continue;
      const opC2 = ["+", "−", "×"].find((op) => apply(op, c, f) === n44); if (!opC2) continue;
      return xwBuild({}, [a, b, c, d, e, f, n40, n42, n44], [opR0, opR1, opR2], [opC0, opC1, opC2]);
    }
    return MEDIUM.generate(rand); // fall back to an all-addition grid
  },
});

const LEVELS = { easy: RING, medium: MEDIUM, hard: HARD };
const LEVEL_ORDER = ["easy", "medium", "hard"];
const LEVEL_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

export function initAxiom(root) {
  const panel = root.querySelector(".axiom-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.axiom) s.axiom = { lastSolved: 0, streak: 0, level: "medium" }; if (!s.axiom.level) s.axiom.level = "medium"; return s.axiom; };

  let layout = MEDIUM, solution = null, blanks = [], rack = [], fill = {}, held = -1, daily = true, solved = false;

  function build(seed, isDaily) {
    const level = cfg().level;
    layout = LEVELS[level] || MEDIUM;
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

    // Difficulty selector.
    const levels = el("div", "axiom-levels");
    LEVEL_ORDER.forEach((lv) => {
      const b = el("button", "axiom-level" + (cfg().level === lv ? " on" : ""), LEVEL_LABEL[lv]);
      b.addEventListener("click", () => { if (cfg().level === lv) return; cfg().level = lv; save(); build(dailySeed(), true); render(); });
      levels.appendChild(b);
    });
    wrap.appendChild(levels);

    const board = el("div", "axiom-board"); board.id = "axBoard";
    for (let i = 0; i < 25; i++) {
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
  function laneOk(lane) {
    const a = valueAt(lane[0]), b = valueAt(lane[2]), c = valueAt(lane[4]);
    if (a == null || b == null || c == null) return null;
    return apply(solution[lane[1]], a, b) === c;
  }

  function updateStatus() {
    const results = layout.lanes.map(laneOk);
    const filledAll = Object.keys(fill).length === blanks.length;
    const board = panel.querySelector("#axBoard");
    layout.lanes.forEach((lane, li) => {
      const ok = results[li];
      [lane[0], lane[2], lane[4]].forEach((idx) => {
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
    status.textContent = "Solved! Every line adds up.";
    status.className = "axiom-status solved";
    if (daily) {
      const cs = cfg(), today = dateKey();
      if (cs.lastSolved !== today) { cs.streak = cs.lastSolved === prevKey(today) ? (cs.streak || 0) + 1 : 1; cs.lastSolved = today; save(); }
    }
  }

  build(dailySeed(), true);
  render();
}
