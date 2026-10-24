// axiom.js — Axiom: a 2–4 player equation board game, pass-and-play on one
// shared screen, played like "maths Scrabble". Each turn you lay up to TWO
// cards from your hand (plus as many free = tiles as you like) into one row or
// column of
// the shared 8×8 board. When a contiguous run becomes a true equation or
// inequality it scores for whoever completed it and locks. Operation/action
// cards live in the operations deck (5 drawn each turn); using an action or a
// ×2 / Gift never uses up one of your two placements. Rules engine lives in
// axiom-engine.js (pure, unit-tested). Zero deps.
import { el } from "./quizkit.js?v=20261024a";
import { getState, save } from "./storage.js?v=20261024a";
import * as sound from "./sound.js?v=20261024a";
import { parseLine, scoreLine, relTrue, classifyLine } from "./axiom-engine.js?v=20261024a";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const COLS = 8, ROWS = 8;
const TILES_PER_TURN = 2;
const MULTI_BONUS = 5; // bonus points per extra calculation completed in one go
const PLAYER_CLASS = ["p1", "p2", "p3", "p4"];

const ACT_LABEL = { draw: "Draw +1", extra: "Extra tile", swap: "Swap board tile", skip: "Skip a player", block: "Block", del: "Delete tile" };
const ACT_DESC = {
  draw: "Draw one extra card now (free — doesn't use a placement).",
  extra: "Place one more tile this turn (free).",
  swap: "Swap an un-locked tile on the board with one from your hand (free).",
  skip: "Skip an opponent's next turn — they discard and redraw. A Block cancels it. (Free.)",
  block: "Reactive: cancel a Skip or a Gift aimed at you.",
  del: "Remove an un-locked tile from the board (free).",
};
const MOD_LABEL = { x2: "×2", gift: "Gift" };

const numLabel = (v) => (v < 0 ? "−" + Math.abs(v) : String(v));
function cardLabel(c) {
  if (c.kind === "num") return numLabel(c.v);
  if (c.kind === "op" || c.kind === "rel") return c.v;
  if (c.kind === "mod") return MOD_LABEL[c.v];
  if (c.kind === "act") return ACT_LABEL[c.v];
  return "?";
}
const escapeH = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

export function initAxiom(root) {
  const panel = root.querySelector(".axiom-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  const cfg = () => {
    const s = getState(); if (!s.axiom) s.axiom = {};
    const d = s.axiom;
    if (typeof d.players !== "number") d.players = 2;
    if (!Array.isArray(d.names)) d.names = [];
    if (typeof d.target !== "number") d.target = 30;
    if (typeof d.ineqScore !== "number") d.ineqScore = 3;
    if (!d.game || typeof d.game !== "object") d.game = null;
    // Drop any game saved under an older rules model (incompatible board shape).
    if (d.game && d.game.ver !== 3) d.game = null;
    return d;
  };
  const G = () => cfg().game;
  const persist = () => save();

  /* ---------- decks ----------
     Numbers skew strongly positive (small numbers are the most common), with
     only a few negatives for subtraction and the Gift tactic. The operations
     deck is mostly the four operations, then relation tiles, with power-ups and
     actions a small minority — so most of what you draw is maths, not gimmicks. */
  function buildNumberDeck() {
    const cards = [];
    const add = (v, n) => { for (let k = 0; k < n; k++) cards.push({ kind: "num", v }); };
    add(-5, 1); add(-4, 1); add(-3, 2); add(-2, 2); add(-1, 2); add(0, 2);   // ~13% negatives
    for (let v = 1; v <= 6; v++) add(v, 5);   // small positives: the bread and butter
    for (let v = 7; v <= 9; v++) add(v, 4);
    for (let v = 10; v <= 12; v++) add(v, 3);
    return shuffle(cards);
  }
  function buildOpDeck() {
    const cards = [];
    const add = (spec, n, kind) => { for (let k = 0; k < n; k++) cards.push({ kind, v: spec }); };
    // Operations dominate (~59%).
    add("+", 14, "op"); add("−", 11, "op"); add("×", 10, "op"); add("÷", 7, "op");
    // Relations for inequalities (~25%).
    add("<", 4, "rel"); add("≤", 3, "rel"); add(">", 4, "rel"); add("≥", 3, "rel"); add("≠", 4, "rel");
    // Power-ups & actions — a small minority (~15%), just for spice.
    add("x2", 2, "mod"); add("gift", 2, "mod");
    add("draw", 2, "act"); add("extra", 1, "act"); add("swap", 1, "act"); add("skip", 1, "act"); add("block", 1, "act"); add("del", 2, "act");
    return shuffle(cards);
  }
  function drawFrom(which) {
    const g = G();
    let deck = g.decks[which], disc = g.decks[which + "Disc"];
    if (!deck.length && disc.length) { g.decks[which] = deck = shuffle(disc.splice(0)); }
    return deck.length ? deck.pop() : null;
  }
  function refill(pi) {
    const h = G().hands[pi];
    while (h.num.length < 5) { const c = drawFrom("num"); if (!c) break; h.num.push(c); }
    while (h.op.length < 5) { const c = drawFrom("op"); if (!c) break; h.op.push(c); }
  }

  /* ---------- lobby ---------- */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "axiom-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "2–4 players · pass & play"));
    card.appendChild(el("h2", "dojo-title", "Axiom"));
    card.appendChild(el("p", "dojo-lede", "Maths Scrabble. Each turn, lay up to two cards from your hand (plus as many free = tiles as you like) into one row or column of the shared board. When a line of tiles — across or down — reads as a true equation or inequality it scores, and lines can cross: an = line scores the value it equals, a true inequality scores “X” plus a little more the wider the gap, a true ≠ scores 5. Operation and power-up cards come from the operations deck; using a power-up or action is free. First to the target score, or the top score when nobody can move, wins."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const d = cfg();
    const rowF = (label, node) => { const f = el("div", "dojo-field dojo-field-inline"); f.appendChild(el("label", "dojo-lbl", label)); f.appendChild(node); card.appendChild(f); };

    const pSel = el("select", "dojo-select dojo-select-sm");
    [2, 3, 4].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " players"; if (n === d.players) o.selected = true; pSel.appendChild(o); });
    pSel.addEventListener("change", () => { d.players = +pSel.value; persist(); renderLobby(); });
    rowF("Players", pSel);

    const namesWrap = el("div", "axiom-names");
    for (let i = 0; i < d.players; i++) {
      const inp = el("input", "dojo-input axiom-nameinput"); inp.maxLength = 16; inp.placeholder = `Player ${i + 1}`; inp.value = d.names[i] || "";
      inp.addEventListener("input", () => { d.names[i] = inp.value.slice(0, 16); persist(); });
      namesWrap.appendChild(inp);
    }
    card.appendChild(namesWrap);

    const tSel = el("select", "dojo-select dojo-select-sm");
    [20, 30, 50].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " points"; if (n === d.target) o.selected = true; tSel.appendChild(o); });
    tSel.addEventListener("change", () => { d.target = +tSel.value; persist(); });
    rowF("Target score", tSel);

    const xSel = el("select", "dojo-select dojo-select-sm");
    [3, 5, 8].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " points"; if (n === d.ineqScore) o.selected = true; xSel.appendChild(o); });
    xSel.addEventListener("change", () => { d.ineqScore = +xSel.value; persist(); });
    rowF("Inequality score (X)", xSel);

    const btns = el("div", "dojo-editbtns");
    const start = el("button", "btn primary dojo-begin", "Start game");
    start.addEventListener("click", () => startGame());
    btns.appendChild(start);
    if (G() && !G().over) { const resume = el("button", "btn ghost", "Resume game"); resume.addEventListener("click", () => renderGame()); btns.appendChild(resume); }
    card.appendChild(btns);
    card.appendChild(rulesBox());
    panel.appendChild(card);
  }

  function rulesBox() {
    const box = el("div", "axiom-legend");
    box.appendChild(el("p", "axiom-legend-title", "Card guide"));
    const grid = el("div", "axiom-legend-grid");
    const items = [
      ["+ − × ÷", "Operations — a line is worked left to right (no BIDMAS)."],
      ["=", "Free & unlimited for everyone — score the value both sides equal."],
      ["< ≤ > ≥", "Relation tiles — a true inequality scores X, plus a little more the wider the gap (capped at X)."],
      ["≠", "Not-equal — a true ≠ scores 5."],
      ["Connect up", "New tiles must touch the tiles already down (crossword-style), unless the board is empty or holds only completed sums."],
      ["No blocking", "Every placement must build toward or complete a real equation — you can't leave a false sum or an inert clump of digits just to wall off squares."],
      ["Make numbers", "Number tiles side by side combine into a multi-digit number (3,5 → 35; −2,0 → −20; a negative only leads). Two symbols still can't touch."],
      ["Longer lines", "+1 point for every tile past the minimum of five — build big and cross lines."],
      ["Multi bonus", "Complete more than one calculation in a single go for +5 points each extra."],
      ["×2", "Double your best scoring line this turn (free)."],
      ["Gift", "Give your best line's score to another player (dump a negative!)."],
      ["Draw +1 / Extra tile", "Draw a card, or place one more tile this turn (free)."],
      ["Swap / Delete", "Swap an un-locked board tile for one from your hand, or delete one outright."],
      ["Skip / Block", "Skip a rival's next turn; block a Skip or Gift aimed at you."],
      ["Stuck?", "If nothing obvious plays, the banner nudges you — Discard & redraw swaps your whole hand and ends your turn."],
    ];
    items.forEach(([k, txt]) => { const r = el("div", "axiom-legend-item"); r.appendChild(el("span", "axiom-legend-key", k)); r.appendChild(el("span", "axiom-legend-txt", txt)); grid.appendChild(r); });
    box.appendChild(grid);
    return box;
  }

  /* ---------- new game ---------- */
  function startGame() {
    const d = cfg();
    const names = [];
    for (let i = 0; i < d.players; i++) names.push((d.names[i] || `Player ${i + 1}`).trim() || `Player ${i + 1}`);
    const g = {
      ver: 3,
      players: d.players, names,
      scores: Array(d.players).fill(0),
      board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
      decks: { num: buildNumberDeck(), numDisc: [], op: buildOpDeck(), opDisc: [] },
      hands: Array.from({ length: d.players }, () => ({ num: [], op: [] })),
      turn: 0, over: false, winner: null, log: [], skipNext: Array(d.players).fill(false), passes: 0,
    };
    cfg().game = g;
    for (let i = 0; i < d.players; i++) refill(i);
    persist();
    resetTurn();
    renderGame();
  }

  function logLine(msg) { const g = G(); g.log.unshift(msg); if (g.log.length > 8) g.log.length = 8; }

  /* ---------- per-turn staging ---------- */
  let staged = [];      // [{ r, c, src:'num'|'op'|'eq', idx }]
  let sel = null;       // selected hand card: { src:'num'|'op', idx } | 'eq' | null
  let extraBonus = 0;   // extra tiles granted by "Extra tile" cards
  let useX2 = false, giftTo = null;
  let swapMode = false, delMode = false;
  let stuckNudge = false; // "nothing obvious to play" — set each render when the hand looks stuck
  const busy = () => swapMode || delMode;
  function resetTurn() { staged = []; sel = null; extraBonus = 0; useX2 = false; giftTo = null; swapMode = false; delMode = false; }
  const handPlaced = () => staged.filter((s) => s.src !== "eq").length;
  const tileLimit = () => TILES_PER_TURN + extraBonus;

  // The committed tile at r,c (or null) — ignoring staged overlay.
  const at = (r, c) => (c >= 0 && c < COLS && r >= 0 && r < ROWS ? G().board[r][c] : null);
  // Effective tile at r,c including this turn's staged placements.
  function eff(r, c) {
    const s = staged.find((x) => x.r === r && x.c === c);
    if (s) return stagedCard(s);
    return at(r, c);
  }
  function stagedCard(s) {
    if (s.src === "eq") return { kind: "rel", v: "=" };
    const h = G().hands[G().turn];
    const c = (s.src === "num" ? h.num : h.op)[s.idx];
    return c ? { kind: c.kind, v: c.v } : null;
  }
  // Category of the currently selected card: "num" or "sym" (operation/relation).
  function selCat() {
    if (sel === "eq") return "sym";
    if (!sel) return "sym";
    const h = G().hands[G().turn];
    const card = (sel.src === "num" ? h.num : h.op)[sel.idx];
    return card && card.kind === "num" ? "num" : "sym";
  }
  // Is the selected card a negative number tile?
  function selNeg() {
    if (!sel || sel === "eq" || sel.src !== "num") return false;
    const card = G().hands[G().turn].num[sel.idx];
    return !!card && card.v < 0;
  }

  // Must new tiles connect to what's already on the board? Yes, unless the
  // board is empty (first play) or every tile on it is part of a completed
  // (locked) sum — then you may open a fresh line anywhere.
  function connectRequired() {
    const b = G().board; let committed = 0, locked = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = b[r][c]; if (t) { committed++; if (t.hLock || t.vLock) locked++; } }
    return committed > 0 && locked < committed; // a loose (in-progress) tile exists
  }

  // Legal to drop the currently selected card into empty cell r,c?
  function canDropAt(r, c) {
    if (sel == null) return false;
    if (at(r, c) || staged.some((x) => x.r === r && x.c === c)) return false;
    // This turn's tiles must share a single line — all one row OR all one column.
    const rs = new Set([...staged.map((x) => x.r), r]);
    const cs = new Set([...staged.map((x) => x.c), c]);
    if (rs.size > 1 && cs.size > 1) return false;
    // Don't extend an already-scored run along its own axis (crossing it is fine).
    if ((at(r, c - 1) && at(r, c - 1).hLock) || (at(r, c + 1) && at(r, c + 1).hLock)) return false;
    if ((at(r - 1, c) && at(r - 1, c).vLock) || (at(r + 1, c) && at(r + 1, c).vLock)) return false;
    // Two symbols may never sit next to each other. Numbers MAY (they combine
    // into a multi-digit number), but a negative tile must lead its group.
    if (selCat() === "sym") {
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) { const e = eff(nr, nc); if (e && e.kind !== "num") return false; }
    } else {
      if (selNeg()) { // a negative must lead — nothing numeric immediately left or above it
        const L = eff(r, c - 1), U = eff(r - 1, c);
        if ((L && L.kind === "num") || (U && U.kind === "num")) return false;
      }
      // a number can't sit immediately before an existing negative (to its right/below)
      const R = eff(r, c + 1), D = eff(r + 1, c);
      if ((R && R.kind === "num" && R.v < 0) || (D && D.kind === "num" && D.v < 0)) return false;
    }
    // Tiles must connect to the existing cluster: the first one touches a
    // committed tile; later ones touch a committed or an already-staged tile.
    if (connectRequired()) {
      const adjCommitted = !!(at(r - 1, c) || at(r + 1, c) || at(r, c - 1) || at(r, c + 1));
      const adjStaged = staged.some((s) => Math.abs(s.r - r) + Math.abs(s.c - c) === 1);
      if (staged.length === 0 ? !adjCommitted : (!adjCommitted && !adjStaged)) return false;
    }
    if (sel !== "eq" && handPlaced() >= tileLimit()) return false;   // hand-card limit (= is free)
    return true;
  }

  // The maximal contiguous run of effective tiles through (r,c) along (dr,dc).
  function maximalRun(r, c, dr, dc) {
    let r0 = r, c0 = c;
    while (eff(r0 - dr, c0 - dc)) { r0 -= dr; c0 -= dc; }
    const cells = []; let rr = r0, cc = c0;
    while (eff(rr, cc)) { cells.push({ r: rr, c: cc, cell: eff(rr, cc) }); rr += dr; cc += dc; }
    return cells;
  }
  // Runs (horizontal and vertical) that would score on commit: true statements,
  // touched by a tile placed this turn, and not already locked on that axis.
  function scoringRuns() {
    if (!staged.length) return [];
    const out = [], seen = new Set();
    staged.forEach((s) => {
      [[0, 1], [1, 0]].forEach(([dr, dc]) => {
        const axis = dr === 0 ? "h" : "v";
        const cells = maximalRun(s.r, s.c, dr, dc);
        if (cells.length < 3) return;
        const key = axis + cells[0].r + "," + cells[0].c + ":" + cells.length;
        if (seen.has(key)) return; seen.add(key);
        const parsed = parseLine(cells.map((x) => ({ kind: x.cell.kind, v: x.cell.v })));
        if (!parsed.ok || !relTrue(parsed.leftVal, parsed.rel, parsed.rightVal)) return;
        const already = cells.every((x) => { const t = at(x.r, x.c); return t && (axis === "h" ? t.hLock : t.vLock); });
        if (already) return;
        const hasStaged = cells.some((x) => staged.some((y) => y.r === x.r && y.c === x.c));
        if (!hasStaged) return;
        // Length bonus: +1 for every tile beyond the 5-tile minimum, rewarding
        // longer lines and crossings over safe little inequalities.
        const bonus = Math.max(0, cells.length - 5);
        out.push({ cells, axis, base: scoreLine(parsed, { ineqScore: cfg().ineqScore }).score + bonus });
      });
    });
    return out;
  }
  // Every maximal run (across & down, length ≥ 2) that this turn's tiles touch,
  // classified by the engine — used to forbid pointless blocking.
  function touchedLines() {
    if (!staged.length) return [];
    const out = [], seen = new Set();
    staged.forEach((s) => {
      [[0, 1], [1, 0]].forEach(([dr, dc]) => {
        const axis = dr === 0 ? "h" : "v";
        const cells = maximalRun(s.r, s.c, dr, dc);
        if (cells.length < 2) return;
        const key = axis + cells[0].r + "," + cells[0].c + ":" + cells.length;
        if (seen.has(key)) return; seen.add(key);
        const cl = classifyLine(cells.map((x) => ({ kind: x.cell.kind, v: x.cell.v })));
        out.push({ cells, axis, ...cl });
      });
    });
    return out;
  }
  // Why a placement can't be committed yet (or null if it's fine). You may only
  // lay tiles that build or complete a real equation: no false sums, no broken
  // lines, and not just a blocking clump of digits with no operation.
  function placementIssue() {
    if (!staged.length) return null;
    const lines = touchedLines();
    if (lines.some((l) => l.status === "false")) return "That makes a false equation — fix it before you place.";
    if (lines.some((l) => l.status === "garbage")) return "That line doesn't work as a sum — check it over.";
    const building = lines.some((l) => l.status === "true") || lines.some((l) => l.status === "partial" && l.hasOp);
    if (!building) return "Place tiles that build or complete an equation — not just a blocking number.";
    return null;
  }

  // Is there at least one obvious legal placement — a single hand tile (or the
  // free =), or any opening on an empty board — that builds toward or completes
  // an equation? Used only to gently nudge a stuck player toward Discard &
  // redraw; phrased as "nothing obvious" so a missed tricky two-tile play is
  // no lie. Probes by temporarily driving sel/staged, then restores them.
  function hasEasyMove() {
    const g = G();
    let committed = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (at(r, c)) committed++;
    if (committed === 0) return true; // you can always open with two tiles
    const h = g.hands[g.turn];
    const seen = new Set(), cands = [];
    const addC = (src, idx, c) => { const k = c.kind + ":" + c.v; if (seen.has(k)) return; seen.add(k); cands.push({ src, idx }); };
    h.num.forEach((c, i) => addC("num", i, c));
    h.op.forEach((c, i) => { if (c.kind === "op" || c.kind === "rel") addC("op", i, c); });
    cands.push("eq");
    const savedSel = sel, savedStaged = staged;
    let ok = false;
    try {
      for (const cand of cands) {
        if (ok) break;
        sel = cand; staged = [];
        for (let r = 0; r < ROWS && !ok; r++) for (let c = 0; c < COLS; c++) {
          if (!canDropAt(r, c)) continue;
          staged = [{ r, c, src: cand === "eq" ? "eq" : cand.src, idx: cand === "eq" ? -1 : cand.idx }];
          if (placementIssue() === null) { ok = true; break; }
          staged = [];
        }
      }
    } finally { sel = savedSel; staged = savedStaged; }
    return ok;
  }

  const bestRun = (scoring) => scoring.reduce((b, r) => (!b || r.base > b.base ? r : b), null);
  // Total points a turn's placements would score: line scores, +X2 on the best
  // line, +MULTI_BONUS per extra calculation completed this go.
  function turnScore(scoring) {
    const base = scoring.reduce((a, r) => a + r.base, 0);
    const multi = scoring.length >= 2 ? (scoring.length - 1) * MULTI_BONUS : 0;
    const x2extra = (useX2 && handHas("mod", "x2") && bestRun(scoring)) ? bestRun(scoring).base : 0;
    return base + multi + x2extra;
  }

  /* ---------- render ---------- */
  let render = () => {};
  function renderGame() {
    const g = G();
    if (!g) return renderLobby();
    if (g.over) return renderOver();
    panel.innerHTML = "";
    const wrap = el("div", "axiom-game axiom-light");

    wrap.appendChild(el("div", "dojo-toprow", `
      <span class="dojo-set">Axiom</span>
      <span class="dojo-topbtns">
        <button class="icon-btn dojo-icobtn" id="axMute" title="Toggle sound" aria-label="Toggle sound">${soundOn ? "♪" : "✕"}</button>
        <button class="btn ghost" id="axRestart">Restart</button>
        <button class="btn ghost" id="axQuit">Lobby</button>
      </span>`));

    const sb = el("div", "axiom-scoreboard");
    g.names.forEach((nm, i) => {
      const chip = el("div", "axiom-scorechip " + PLAYER_CLASS[i] + (i === g.turn ? " turn" : ""));
      chip.innerHTML = `<span class="axiom-scname">${escapeH(nm)}</span><span class="axiom-scval">${g.scores[i]}</span>`;
      sb.appendChild(chip);
    });
    sb.appendChild(el("span", "axiom-target muted", `target ${cfg().target}`));
    wrap.appendChild(sb);

    const scoring = scoringRuns();
    const preview = turnScore(scoring);
    const issue = placementIssue();
    stuckNudge = !staged.length && !busy() && !hasEasyMove();
    const banner = el("p", "axiom-turnbanner",
      `${escapeH(g.names[g.turn])}'s turn — ${Math.max(0, tileLimit() - handPlaced())} tile${tileLimit() - handPlaced() === 1 ? "" : "s"} left`
      + (swapMode ? " · pick an un-locked board tile to swap" : delMode ? " · pick an un-locked board tile to delete" : (connectRequired() && !staged.length ? " · build onto existing tiles" : ""))
      + (scoring.length ? ` · this turn scores ${preview}${scoring.length >= 2 ? ` (${scoring.length} lines!)` : ""}${giftTo != null ? " → " + escapeH(g.names[giftTo]) : ""}` : ""));
    if (issue) { banner.appendChild(el("span", "axiom-issue", " · " + issue)); }
    else if (stuckNudge) { banner.appendChild(el("span", "axiom-nudge", " · nothing obvious to play — Discard & redraw for a fresh hand")); }
    wrap.appendChild(banner);

    // Board
    const boardWrap = el("div", "axiom-boardwrap");
    const grid = el("div", "axiom-board");
    const scoringCells = new Set(scoring.flatMap((run) => run.cells.map((x) => x.r + "," + x.c)));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const committed = at(r, c);
        const stagedHere = staged.find((x) => x.r === r && x.c === c);
        const locked = !!(committed && (committed.hLock || committed.vLock));
        const cell = el("div", "axiom-cell");
        if (committed) {
          cell.classList.add("filled");
          if (locked) cell.classList.add("locked", PLAYER_CLASS[committed.player]);
          if (committed.kind !== "num") cell.classList.add("sym");
          cell.textContent = cardLabel(committed);
          if (swapMode && !locked) { cell.classList.add("swaptarget"); cell.addEventListener("click", () => doSwapPick(r, c)); }
          if (delMode && !locked) { cell.classList.add("swaptarget"); cell.addEventListener("click", () => doDelPick(r, c)); }
        } else if (stagedHere) {
          cell.classList.add("filled", "staged");
          const sc = stagedCard(stagedHere);
          if (sc.kind !== "num") cell.classList.add("sym");
          cell.textContent = cardLabel(sc);
          cell.title = "Tap to take back";
          cell.addEventListener("click", () => { staged = staged.filter((x) => x !== stagedHere); fx(() => sound.tick(0.04)); render(); });
        } else {
          cell.classList.add("empty");
          if (canDropAt(r, c)) { cell.classList.add("drop"); cell.addEventListener("click", () => { staged.push({ r, c, src: sel === "eq" ? "eq" : sel.src, idx: sel === "eq" ? -1 : sel.idx }); sel = null; fx(sound.tick); render(); }); }
        }
        if (scoringCells.has(r + "," + c)) cell.classList.add("willscore");
        grid.appendChild(cell);
      }
    }
    boardWrap.appendChild(grid);
    wrap.appendChild(boardWrap);

    // Hand
    wrap.appendChild(renderHand());
    // Modifiers + commit
    wrap.appendChild(renderControls());
    // Actions
    wrap.appendChild(renderActions());
    // Opponents + log
    wrap.appendChild(renderSide());

    panel.appendChild(wrap);
    panel.querySelector("#axMute").addEventListener("click", () => { soundOn = !soundOn; panel.querySelector("#axMute").textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#axQuit").addEventListener("click", () => { resetTurn(); renderLobby(); });
    panel.querySelector("#axRestart").addEventListener("click", () => { if (confirm("Restart with the same players?")) startGame(); });
  }
  render = renderGame;

  function selected(src, idx) { return sel !== "eq" && sel && sel.src === src && sel.idx === idx; }
  function stagedUses(src, idx) { return staged.some((s) => s.src === src && s.idx === idx); }

  function renderHand() {
    const g = G(); const h = g.hands[g.turn];
    const box = el("div", "axiom-hand");
    box.appendChild(el("p", "axiom-handlbl", "Your cards — tap one, then tap a board square"));
    const nums = el("div", "axiom-handrow");
    h.num.forEach((c, i) => {
      const b = el("button", "axiom-card num" + (selected("num", i) ? " picked" : ""));
      b.textContent = numLabel(c.v);
      b.disabled = stagedUses("num", i) || (handPlaced() >= tileLimit() && !selected("num", i)) || busy();
      b.addEventListener("click", () => { sel = selected("num", i) ? null : { src: "num", idx: i }; render(); });
      nums.appendChild(b);
    });
    box.appendChild(nums);
    const ops = el("div", "axiom-handrow");
    // free equals tile first
    const eqb = el("button", "axiom-card rel free" + (sel === "eq" ? " picked" : ""));
    eqb.textContent = "="; eqb.title = "Free unlimited equals tile";
    eqb.disabled = busy();
    eqb.addEventListener("click", () => { sel = sel === "eq" ? null : "eq"; render(); });
    ops.appendChild(eqb);
    h.op.forEach((c, i) => {
      const placeable = c.kind === "op" || c.kind === "rel";
      const b = el("button", "axiom-card " + c.kind + (selected("op", i) ? " picked" : ""));
      b.textContent = cardLabel(c);
      if (placeable) {
        b.disabled = stagedUses("op", i) || (handPlaced() >= tileLimit() && !selected("op", i)) || busy();
        b.addEventListener("click", () => { sel = selected("op", i) ? null : { src: "op", idx: i }; render(); });
      } else {
        b.classList.add("info"); b.disabled = true;
        b.title = c.kind === "mod" ? "Use the " + MOD_LABEL[c.v] + " button below" : ACT_DESC[c.v];
      }
      ops.appendChild(b);
    });
    box.appendChild(ops);
    return box;
  }

  function handHas(kind, v) { return G().hands[G().turn].op.some((c) => c.kind === kind && c.v === v); }

  function renderControls() {
    const g = G();
    const box = el("div", "axiom-controls");
    const scoring = scoringRuns();

    const x2 = el("button", "chip" + (useX2 ? " on" : ""), "×2");
    x2.disabled = !handHas("mod", "x2") || !scoring.length;
    x2.title = handHas("mod", "x2") ? "Double your best scoring line this turn" : "No ×2 card in hand";
    x2.addEventListener("click", () => { useX2 = !useX2; if (useX2) fx(sound.swoosh); render(); });
    box.appendChild(x2);

    const gift = el("button", "chip" + (giftTo != null ? " on" : ""), giftTo != null ? `Gift → ${escapeH(g.names[giftTo])}` : "Gift");
    gift.disabled = !handHas("mod", "gift") || !scoring.length;
    gift.title = handHas("mod", "gift") ? "Give your best line's score to another player" : "No Gift card in hand";
    gift.addEventListener("click", () => { if (giftTo != null) { giftTo = null; render(); return; } pickPlayer("Give your best line's score to:", (pi) => { giftTo = pi; fx(sound.swoosh); render(); }, g.turn); });
    box.appendChild(gift);

    const clear = el("button", "btn ghost", "Take back"); clear.disabled = !staged.length;
    clear.addEventListener("click", () => { staged = []; sel = null; render(); });
    box.appendChild(clear);

    const issue = placementIssue();
    const end = el("button", "btn primary", staged.length ? (scoring.length ? `Place & score ${turnScore(scoring)}` : "Place tiles") : "End turn");
    end.disabled = !!issue;
    if (issue) end.title = issue;
    end.addEventListener("click", commitTurn);
    box.appendChild(end);
    return box;
  }

  function renderActions() {
    const g = G();
    const box = el("div", "axiom-actions");
    const has = (v) => g.hands[g.turn].op.some((c) => c.kind === "act" && c.v === v);
    const mk = (v, onClick) => { const b = el("button", "btn ghost axiom-actbtn", ACT_LABEL[v]); b.disabled = !has(v) || busy(); b.title = ACT_DESC[v]; b.addEventListener("click", onClick); return b; };
    box.appendChild(mk("draw", doDraw));
    box.appendChild(mk("extra", doExtra));
    box.appendChild(mk("swap", startSwap));
    box.appendChild(mk("del", startDelete));
    box.appendChild(mk("skip", doSkip));
    const pass = el("button", "btn ghost axiom-actbtn" + (stuckNudge ? " axiom-nudgebtn" : ""), "Discard & redraw"); pass.disabled = busy() || !!staged.length;
    pass.title = "Stuck? Discard your hand, redraw, and end your turn.";
    pass.addEventListener("click", doPass);
    box.appendChild(pass);
    if (swapMode) { const cx = el("button", "btn ghost axiom-actbtn", "Cancel swap"); cx.addEventListener("click", () => { swapMode = false; render(); }); box.appendChild(cx); }
    if (delMode) { const cx = el("button", "btn ghost axiom-actbtn", "Cancel delete"); cx.addEventListener("click", () => { delMode = false; render(); }); box.appendChild(cx); }
    return box;
  }

  function renderSide() {
    const g = G();
    const box = el("div", "axiom-side");
    const opp = el("div", "axiom-opps");
    g.names.forEach((nm, i) => {
      if (i === g.turn) return;
      const o = el("div", "axiom-opp " + PLAYER_CLASS[i]);
      o.appendChild(el("span", "axiom-oppname", `${escapeH(nm)} · ${g.scores[i]}`));
      const cards = el("span", "axiom-oppcards");
      g.hands[i].num.forEach((c) => cards.appendChild(el("span", "axiom-minic num", numLabel(c.v))));
      g.hands[i].op.forEach((c) => cards.appendChild(el("span", "axiom-minic " + c.kind, cardLabel(c))));
      o.appendChild(cards);
      opp.appendChild(o);
    });
    box.appendChild(opp);
    if (g.log.length) { const log = el("div", "axiom-log"); g.log.forEach((m) => log.appendChild(el("p", "axiom-logline", m))); box.appendChild(log); }
    return box;
  }

  /* ---------- commit a turn ---------- */
  function commitTurn() {
    const g = G();
    if (staged.length && placementIssue()) { render(); return; } // shouldn't happen (button disabled)
    if (staged.length) {
      const scoring = scoringRuns();
      // commit tiles to the board (un-locked for now)
      const usedNum = [], usedOp = [];
      staged.forEach((s) => {
        const sc = stagedCard(s);
        g.board[s.r][s.c] = { kind: sc.kind, v: sc.v, player: g.turn, hLock: false, vLock: false };
        if (s.src === "num") usedNum.push(s.idx); else if (s.src === "op") usedOp.push(s.idx);
      });
      removeIdx(g.hands[g.turn].num, usedNum, g.decks.numDisc);
      removeIdx(g.hands[g.turn].op, usedOp, g.decks.opDisc);

      // score + lock each completed run (on its own axis, so crossings can still form)
      let best = null;
      scoring.forEach((run) => {
        run.cells.forEach((x) => { const cell = g.board[x.r][x.c]; if (run.axis === "h") cell.hLock = true; else cell.vLock = true; cell.player = g.turn; });
        if (!best || run.base > best.base) best = run;
      });
      let gained = scoring.reduce((a, run) => a + run.base, 0);
      // Bonus for completing more than one calculation in a single go.
      const multiBonus = scoring.length >= 2 ? (scoring.length - 1) * MULTI_BONUS : 0;
      gained += multiBonus;
      // ×2 / Gift apply to the best line
      let x2Applied = false, gifted = null;
      if (best && useX2 && handHas("mod", "x2")) { gained += best.base; x2Applied = true; pullCard("mod", "x2"); }
      if (best && giftTo != null && handHas("mod", "gift")) { gifted = giftTo; pullCard("mod", "gift"); }

      if (gifted != null) {
        const giftScore = best.base * (x2Applied ? 2 : 1);
        const mine = gained - giftScore;
        g.scores[g.turn] += mine; g.scores[gifted] += giftScore;
      } else {
        g.scores[g.turn] += gained;
      }

      if (scoring.length) {
        const lines = scoring.map((run) => run.cells.map((x) => cardLabel(x.cell)).join(" ")).join("  &  ");
        logLine(`${g.names[g.turn]}: ${lines} → ${gained}${multiBonus ? ` (+${multiBonus} multi)` : ""}${x2Applied ? " (×2)" : ""}${gifted != null ? ` to ${g.names[gifted]}` : ""}`);
        fx(gained >= 0 ? sound.fanfare : sound.buzz);
        g.passes = 0;
      } else {
        logLine(`${g.names[g.turn]} built ${staged.length} tile${staged.length === 1 ? "" : "s"} toward an equation.`);
        fx(() => sound.tick(0.06));
        g.passes = 0; // a placement counts as progress
      }
    } else {
      // ended turn with no placement
      g.passes = (g.passes || 0) + 1;
      logLine(`${g.names[g.turn]} passed.`);
    }
    persist();
    if (checkEnd()) return;
    endTurn();
  }

  function removeIdx(list, idxs, disc) {
    const set = new Set(idxs); const keep = [];
    list.forEach((c, i) => { if (set.has(i)) disc.push(c); else keep.push(c); });
    list.length = 0; keep.forEach((c) => list.push(c));
  }
  function pullCard(kind, v) { const h = G().hands[G().turn].op; const i = h.findIndex((c) => c.kind === kind && c.v === v); if (i >= 0) G().decks.opDisc.push(h.splice(i, 1)[0]); }

  function endTurn() {
    const g = G();
    refill(g.turn);
    let next = g.turn;
    for (let step = 0; step < g.players; step++) {
      next = (next + 1) % g.players;
      if (g.skipNext[next]) { g.skipNext[next] = false; const h = g.hands[next]; g.decks.numDisc.push(...h.num); g.decks.opDisc.push(...h.op); h.num = []; h.op = []; refill(next); logLine(`${g.names[next]} is skipped (hand redrawn).`); continue; }
      break;
    }
    g.turn = next; resetTurn(); persist(); fx(() => sound.tick(0.05)); renderGame();
  }

  function checkEnd() {
    const g = G();
    const hi = Math.max(...g.scores);
    const boardFull = g.board.every((row) => row.every((c) => c));
    // Softer stall net: only end on no-progress after two full rounds of passes.
    if (hi >= cfg().target || boardFull || (g.passes || 0) >= g.players * 2) {
      g.over = true; g.winner = g.scores.indexOf(hi); persist(); fx(sound.fanfare); renderOver(); return true;
    }
    return false;
  }

  /* ---------- free actions ---------- */
  function spend(v) { const h = G().hands[G().turn].op; const i = h.findIndex((c) => c.kind === "act" && c.v === v); if (i < 0) return false; G().decks.opDisc.push(h.splice(i, 1)[0]); return true; }
  function holds(pi, v) { return G().hands[pi].op.some((c) => c.kind === "act" && c.v === v); }

  function doDraw() { const g = G(); if (!spend("draw")) return; pickDraw((which) => { const c = drawFrom(which); if (c) g.hands[g.turn][which].push(c); fx(sound.swoosh); logLine(`${g.names[g.turn]} drew a card.`); persist(); render(); }); }
  function doExtra() { const g = G(); if (!spend("extra")) return; extraBonus++; fx(sound.swoosh); logLine(`${g.names[g.turn]} may place an extra tile.`); persist(); render(); }
  function doPass() { const g = G(); const h = g.hands[g.turn]; if (!confirm("Discard your whole hand, redraw, and end your turn?")) return; g.decks.numDisc.push(...h.num); g.decks.opDisc.push(...h.op); h.num = []; h.op = []; fx(sound.swoosh); logLine(`${g.names[g.turn]} discarded and redrew.`); g.passes = (g.passes || 0) + 1; persist(); if (checkEnd()) return; endTurn(); }
  function doSkip() {
    const g = G();
    pickPlayer("Skip whose next turn?", (pi) => {
      if (!spend("skip")) return;
      if (holds(pi, "block") && confirm(`${g.names[pi]} holds a Block. Use it to cancel the skip?`)) { pullOpFrom(pi, "act", "block"); fx(sound.swoosh); logLine(`${g.names[pi]} blocked the skip!`); persist(); render(); return; }
      g.skipNext[pi] = true; fx(sound.buzz); logLine(`${g.names[g.turn]} will skip ${g.names[pi]}'s next turn.`); persist(); render();
    }, g.turn);
  }
  function pullOpFrom(pi, kind, v) { const h = G().hands[pi].op; const i = h.findIndex((c) => c.kind === kind && c.v === v); if (i >= 0) G().decks.opDisc.push(h.splice(i, 1)[0]); }

  function startSwap() { if (!G().hands[G().turn].op.some((c) => c.kind === "act" && c.v === "swap")) return; swapMode = true; render(); }
  function startDelete() { if (!G().hands[G().turn].op.some((c) => c.kind === "act" && c.v === "del")) return; delMode = true; render(); }
  function doDelPick(r, c) {
    const g = G(); const tile = g.board[r][c]; if (!tile || tile.hLock || tile.vLock) return;
    if (!spend("del")) return;
    (tile.kind === "num" ? g.decks.numDisc : g.decks.opDisc).push({ kind: tile.kind, v: tile.v });
    g.board[r][c] = null;
    delMode = false; fx(sound.swoosh); logLine(`${g.names[g.turn]} deleted a board tile.`); persist(); render();
  }
  function doSwapPick(r, c) {
    const g = G(); const tile = g.board[r][c]; if (!tile || tile.hLock || tile.vLock) return;
    const h = g.hands[g.turn];
    const pool = tile.kind === "num" ? h.num.map((card, i) => ({ card, list: "num", i })) : h.op.filter((card) => card.kind === "op" || card.kind === "rel").map((card) => ({ card, list: "op", i: h.op.indexOf(card) }));
    if (!pool.length) { alert("You have no matching card to swap in."); return; }
    pickFromPool(pool, (p) => {
      if (!spend("swap")) return;
      // put the board tile into hand, place the chosen card on the board
      const boardCard = { kind: tile.kind, v: tile.v };
      g.board[r][c] = { kind: p.card.kind, v: p.card.v, player: g.turn, hLock: false, vLock: false };
      if (p.list === "num") g.hands[g.turn].num.splice(p.i, 1, boardCard); else g.hands[g.turn].op.splice(p.i, 1, boardCard.kind === "num" ? { kind: "num", v: boardCard.v } : boardCard);
      swapMode = false; fx(sound.swoosh); logLine(`${g.names[g.turn]} swapped a board tile.`); persist(); render();
    });
  }

  /* ---------- overlays ---------- */
  function overlay(title, body) {
    const ov = el("div", "axiom-overlay"); const card = el("div", "axiom-ovcard");
    card.appendChild(el("p", "axiom-ovtitle", title)); (Array.isArray(body) ? body : [body]).forEach((n) => card.appendChild(n));
    ov.appendChild(card); ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); }); panel.appendChild(ov); return ov;
  }
  function pickPlayer(title, cb, exclude) {
    const g = G(); const row = el("div", "axiom-ovbtns");
    g.names.forEach((nm, i) => { if (i === exclude) return; const b = el("button", "btn " + PLAYER_CLASS[i], escapeH(nm)); b.addEventListener("click", () => { ov.remove(); cb(i); }); row.appendChild(b); });
    const ov = overlay(title, row);
  }
  function pickDraw(cb) {
    const row = el("div", "axiom-ovbtns");
    const a = el("button", "btn primary", "Number card"); a.addEventListener("click", () => { ov.remove(); cb("num"); });
    const b = el("button", "btn", "Operation card"); b.addEventListener("click", () => { ov.remove(); cb("op"); });
    row.append(a, b); const ov = overlay("Draw which kind?", row);
  }
  function pickFromPool(pool, cb) {
    const row = el("div", "axiom-ovbtns");
    pool.forEach((p) => { const b = el("button", "btn", cardLabel(p.card)); b.addEventListener("click", () => { ov.remove(); cb(p); }); row.appendChild(b); });
    const cx = el("button", "btn ghost", "Cancel"); cx.addEventListener("click", () => ov.remove()); row.appendChild(cx);
    const ov = overlay("Swap in which card?", row);
  }

  /* ---------- game over ---------- */
  function renderOver() {
    const g = G();
    panel.innerHTML = "";
    const wrap = el("div", "axiom-game axiom-light");
    wrap.appendChild(el("div", "dojo-toprow", `<span class="dojo-set">Axiom — final</span><span class="dojo-topbtns"><button class="btn ghost" id="axAgain">Play again</button><button class="btn ghost" id="axLobby">Lobby</button></span>`));
    const ranked = g.names.map((nm, i) => ({ nm, i, s: g.scores[i] })).sort((a, b) => b.s - a.s);
    wrap.appendChild(el("p", "axiom-winner", `🏆 ${escapeH(ranked[0].nm)} wins with ${ranked[0].s}!`));
    const list = el("ol", "axiom-finallist");
    ranked.forEach((r) => { const li = el("li", "axiom-finalrow " + PLAYER_CLASS[r.i]); li.innerHTML = `<span>${escapeH(r.nm)}</span><span class="axiom-finalscore">${r.s}</span>`; list.appendChild(li); });
    wrap.appendChild(list);
    panel.appendChild(wrap);
    panel.querySelector("#axAgain").addEventListener("click", () => startGame());
    panel.querySelector("#axLobby").addEventListener("click", () => { resetTurn(); renderLobby(); });
  }

  if (G() && !G().over) { resetTurn(); renderGame(); } else renderLobby();
}
