// axiom.js — Axiom: a 2–4 player equation board game, pass-and-play on one
// shared screen. Build true equations/inequalities from your hand onto an 8×8
// board to score. Hands are open (visible to everyone). Rules engine lives in
// axiom-engine.js (pure, unit-tested); this file is the UI + turn flow.
//
// Cards: number cards (−5…12); operation cards (+ − × ÷); relation cards
// (< ≤ > ≥ ≠) — everyone also has a free =; modifiers (×2, Gift) applied to a
// line; and actions (Draw +1, Extra play, Swap a board card, Skip a player,
// Block). Score the value an = line equals, or a flat "X" for a true
// inequality, or 5 for a true ≠. First to the target score — or the top score
// when the board fills — wins. Zero deps.
import { el } from "./quizkit.js?v=20261019b";
import { getState, save } from "./storage.js?v=20261019b";
import * as sound from "./sound.js?v=20261019b";
import { OPS, RELS, parseLine, scoreLine, canAppend, isComplete, relTrue } from "./axiom-engine.js?v=20261019b";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const COLS = 8, ROWS = 8;
const PLAYER_CLASS = ["p1", "p2", "p3", "p4"];

// Pretty labels for non-number cards.
const ACT_LABEL = { draw: "Draw +1", extra: "Extra play", swap: "Swap board card", skip: "Skip a player", block: "Block" };
const ACT_DESC = {
  draw: "Draw one extra card now (keep playing this turn).",
  extra: "Build a second line this turn.",
  swap: "Replace one card already on the board with one from your hand; if that breaks its line, the line is removed.",
  skip: "Choose an opponent — their next turn is skipped and their hand is discarded and redrawn. (A Block cancels it.)",
  block: "Reactive: cancel a Skip or a Gift aimed at you. Kept until needed.",
};
const MOD_LABEL = { x2: "×2", gift: "Gift" };

// Display helpers.
const numLabel = (v) => (v < 0 ? "−" + Math.abs(v) : String(v));
function cardLabel(c) {
  if (c.kind === "num") return numLabel(c.v);
  if (c.kind === "op") return c.v;
  if (c.kind === "rel") return c.v;
  if (c.kind === "mod") return MOD_LABEL[c.v];
  if (c.kind === "act") return ACT_LABEL[c.v];
  return "?";
}

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
    if (typeof d.ineqScore !== "number") d.ineqScore = 5;
    if (!d.game || typeof d.game !== "object") d.game = null;
    return d;
  };
  const G = () => cfg().game;
  const persist = () => save();

  /* ---------- decks ---------- */
  function buildNumberDeck() {
    const cards = [];
    for (let v = -5; v <= 12; v++) { const copies = v >= 1 && v <= 9 ? 4 : 3; for (let k = 0; k < copies; k++) cards.push({ kind: "num", v }); }
    return shuffle(cards);
  }
  function buildOpDeck() {
    const cards = [];
    const add = (spec, n, kind) => { for (let k = 0; k < n; k++) cards.push({ kind, v: spec }); };
    OPS.forEach((o) => add(o, 8, "op"));
    ["<", "≤", ">", "≥"].forEach((r) => add(r, 3, "rel"));
    add("≠", 4, "rel");
    add("x2", 4, "mod"); add("gift", 3, "mod");
    add("draw", 4, "act"); add("extra", 3, "act"); add("swap", 3, "act"); add("skip", 3, "act"); add("block", 4, "act");
    return shuffle(cards);
  }
  // Draw from a deck, reshuffling its discard pile when empty.
  function drawFrom(which) {
    const g = G();
    let deck = g.decks[which], disc = g.decks[which + "Disc"];
    if (!deck.length && disc.length) { g.decks[which] = deck = shuffle(disc.splice(0)); }
    return deck.length ? deck.pop() : null;
  }
  function refill(pi) {
    const h = G().hands[pi];
    while (h.num.length < 5) { const c = drawFrom("num"); if (!c) break; h.num.push(c); }
    while (h.op.length < 3) { const c = drawFrom("op"); if (!c) break; h.op.push(c); }
  }

  /* ---------- lobby ---------- */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "axiom-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "2–4 players · pass & play"));
    card.appendChild(el("h2", "dojo-title", "Axiom"));
    card.appendChild(el("p", "dojo-lede", "Build true equations and inequalities from your cards onto the shared board. An = line scores the value it equals; a true inequality scores a flat “X”; a true ≠ scores 5. Use ×2, Gift a score to a rival (dump a negative on them!), draw and swap, or skip a player. First to the target score — or the top score when the board fills — wins."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const d = cfg();
    const rowF = (label, node) => { const f = el("div", "dojo-field dojo-field-inline"); f.appendChild(el("label", "dojo-lbl", label)); f.appendChild(node); card.appendChild(f); };

    const pSel = el("select", "dojo-select dojo-select-sm");
    [2, 3, 4].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " players"; if (n === d.players) o.selected = true; pSel.appendChild(o); });
    pSel.addEventListener("change", () => { d.players = +pSel.value; persist(); renderLobby(); });
    rowF("Players", pSel);

    // Names
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
      ["+ − × ÷", "Operations — expressions are worked left to right (no BIDMAS)."],
      ["= ", "Free for everyone — score the value both sides equal."],
      ["< ≤ > ≥", "Relation cards — a true inequality scores X."],
      ["≠", "Not-equal — a true ≠ scores 5."],
      ["×2", "Double this line's score."],
      ["Gift", "Send this line's score to another player (great for dumping a negative!)."],
      ["Draw +1", "Draw an extra card and keep playing."],
      ["Extra play", "Build a second line this turn."],
      ["Swap", "Swap a card already on the board; a broken line is removed."],
      ["Skip", "Skip a rival's next turn (they discard & redraw). Block cancels it."],
      ["Block", "Cancel a Skip or Gift aimed at you."],
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
      players: d.players, names,
      scores: Array(d.players).fill(0),
      board: Array(ROWS).fill(null),
      decks: { num: buildNumberDeck(), numDisc: [], op: buildOpDeck(), opDisc: [] },
      hands: Array.from({ length: d.players }, () => ({ num: [], op: [] })),
      turn: 0, placementsLeft: 1, skipNext: Array(d.players).fill(false),
      over: false, winner: null, log: [],
    };
    cfg().game = g;
    for (let i = 0; i < d.players; i++) refill(i);
    persist();
    build = freshBuild();
    renderGame();
  }

  function logLine(msg) { const g = G(); g.log.unshift(msg); if (g.log.length > 8) g.log.length = 8; }

  /* ---------- the composer (line builder) ---------- */
  // build = { cells:[{kind,v, src}], x2:cardRef|null, giftTo:playerIndex|null, giftCard:ref|null }
  let build = freshBuild();
  function freshBuild() { return { cells: [], x2: null, giftTo: null }; }

  function renderGame() {
    const g = G();
    if (!g) return renderLobby();
    if (g.over) return renderOver();
    panel.innerHTML = "";
    const wrap = el("div", "axiom-game");

    wrap.appendChild(el("div", "dojo-toprow", `
      <span class="dojo-set">Axiom</span>
      <span class="dojo-topbtns">
        <button class="icon-btn dojo-icobtn" id="axMute" title="Toggle sound" aria-label="Toggle sound">${soundOn ? "♪" : "✕"}</button>
        <button class="btn ghost" id="axRestart">Restart</button>
        <button class="btn ghost" id="axQuit">Lobby</button>
      </span>`));

    // Scoreboard
    const sb = el("div", "axiom-scoreboard");
    g.names.forEach((nm, i) => {
      const chip = el("div", "axiom-scorechip " + PLAYER_CLASS[i] + (i === g.turn ? " turn" : ""));
      chip.innerHTML = `<span class="axiom-scname">${escapeH(nm)}</span><span class="axiom-scval">${g.scores[i]}</span>`;
      sb.appendChild(chip);
    });
    sb.appendChild(el("span", "axiom-target muted", `target ${cfg().target}`));
    wrap.appendChild(sb);

    wrap.appendChild(el("p", "axiom-turnbanner", `${escapeH(g.names[g.turn])}'s turn${g.placementsLeft > 1 ? ` · ${g.placementsLeft} plays left` : ""}`));

    // Board
    const boardWrap = el("div", "axiom-boardwrap");
    const grid = el("div", "axiom-board");
    for (let r = 0; r < ROWS; r++) {
      const line = g.board[r];
      for (let c = 0; c < COLS; c++) {
        const cell = el("div", "axiom-cell");
        if (line && c < line.cells.length) {
          const tc = line.cells[c];
          cell.classList.add("filled", PLAYER_CLASS[line.player]);
          if (tc.kind !== "num") cell.classList.add("sym");
          cell.textContent = cardLabel(tc);
          cell.dataset.row = r; cell.dataset.col = c;
          if (swapMode) { cell.classList.add("swaptarget"); cell.addEventListener("click", () => chooseSwapCell(r, c)); }
        } else {
          cell.classList.add("empty");
        }
        grid.appendChild(cell);
      }
    }
    boardWrap.appendChild(grid);
    wrap.appendChild(boardWrap);

    // Composer
    wrap.appendChild(renderComposer());

    // Hand (active player)
    wrap.appendChild(renderHand());

    // Actions
    wrap.appendChild(renderActions());

    // Opponents (open hands) + log
    wrap.appendChild(renderSide());

    panel.appendChild(wrap);

    panel.querySelector("#axMute").addEventListener("click", () => { soundOn = !soundOn; panel.querySelector("#axMute").textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#axQuit").addEventListener("click", () => { build = freshBuild(); renderLobby(); });
    panel.querySelector("#axRestart").addEventListener("click", () => { if (confirm("Restart with the same players?")) startGame(); });
  }

  const escapeH = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

  function builderCells() { return build.cells.map((c) => ({ kind: c.kind, v: c.v })); }

  function renderComposer() {
    const box = el("div", "axiom-composer");
    const strip = el("div", "axiom-build");
    if (!build.cells.length) strip.appendChild(el("span", "muted axiom-buildhint", "Tap cards below to build a line, e.g. 3 + 4 = 7"));
    build.cells.forEach((c, i) => {
      const t = el("button", "axiom-buildtok" + (c.kind !== "num" ? " sym" : ""), cardLabel(c));
      t.title = "Remove from here";
      t.addEventListener("click", () => { build.cells.splice(i); renderGame(); });
      strip.appendChild(t);
    });
    box.appendChild(strip);

    // modifiers + feedback
    const parsed = parseLine(builderCells());
    const complete = isComplete(builderCells());
    const trueScore = (complete && parsed.ok) ? scoreLine(parsed, { x2: !!build.x2, ineqScore: cfg().target && cfg().ineqScore }) : null;
    const isTrue = complete && parsed.ok && relTrue(parsed.leftVal, parsed.rel, parsed.rightVal);

    const fb = el("div", "axiom-feedback");
    if (!build.cells.length) { /* nothing */ }
    else if (!complete) fb.appendChild(el("span", "muted", "Keep going — finish both sides of the relation."));
    else if (!parsed.ok) fb.appendChild(el("span", "axiom-bad", parsed.reason));
    else if (!isTrue) fb.appendChild(el("span", "axiom-bad", "That statement isn't true — adjust it."));
    else {
      const sc = trueScore.score;
      const who = build.giftTo != null ? ` → ${escapeH(G().names[build.giftTo])}` : "";
      fb.appendChild(el("span", "axiom-good", `True! Scores ${sc >= 0 ? sc : "−" + Math.abs(sc)}${build.x2 ? " (×2)" : ""}${who}`));
    }
    box.appendChild(fb);

    const tools = el("div", "axiom-comptools");
    // free equals
    const eqBtn = el("button", "chip axiom-eq", "="); eqBtn.disabled = !canAppend(builderCells(), "rel");
    eqBtn.addEventListener("click", () => { if (canAppend(builderCells(), "rel")) { build.cells.push({ kind: "rel", v: "=", free: true }); renderGame(); } });
    tools.appendChild(eqBtn);

    // ×2 toggle (needs a held x2 card)
    const x2card = handFind("mod", "x2");
    const x2btn = el("button", "chip" + (build.x2 ? " on" : ""), "×2");
    x2btn.disabled = !x2card && !build.x2;
    x2btn.title = x2card || build.x2 ? "Double this line's score" : "No ×2 card in hand";
    x2btn.addEventListener("click", () => { if (build.x2) build.x2 = null; else if (x2card) build.x2 = x2card; renderGame(); });
    tools.appendChild(x2btn);

    // Gift toggle (needs a held gift card)
    const giftcard = handFind("mod", "gift");
    const giftbtn = el("button", "chip" + (build.giftTo != null ? " on" : ""), build.giftTo != null ? `Gift → ${escapeH(G().names[build.giftTo])}` : "Gift");
    giftbtn.disabled = !giftcard && build.giftTo == null;
    giftbtn.title = giftcard || build.giftTo != null ? "Give this line's score to another player" : "No Gift card in hand";
    giftbtn.addEventListener("click", () => {
      if (build.giftTo != null) { build.giftTo = null; renderGame(); return; }
      if (!giftcard) return;
      pickPlayer("Give this line's score to:", (pi) => { build.giftTo = pi; renderGame(); }, G().turn);
    });
    tools.appendChild(giftbtn);

    const clear = el("button", "btn ghost", "Clear"); clear.addEventListener("click", () => { build = freshBuild(); renderGame(); });
    tools.appendChild(clear);

    const place = el("button", "btn primary", "Place line");
    place.disabled = !isTrue || !boardHasRoom();
    place.title = !boardHasRoom() ? "The board is full" : "";
    place.addEventListener("click", () => placeLine());
    tools.appendChild(place);

    box.appendChild(tools);
    return box;
  }

  function handFind(kind, v) { const h = G().hands[G().turn].op; return h.find((c) => c.kind === kind && c.v === v) || null; }
  function boardHasRoom() { return G().board.some((r) => r === null); }

  function renderHand() {
    const g = G(); const h = g.hands[g.turn];
    const box = el("div", "axiom-hand");
    box.appendChild(el("p", "axiom-handlbl", "Your cards"));
    const nums = el("div", "axiom-handrow");
    h.num.forEach((c, i) => {
      const b = el("button", "axiom-card num");
      b.textContent = numLabel(c.v);
      b.disabled = !canAppend(builderCells(), "num") || buildUses("num", i);
      b.addEventListener("click", () => { build.cells.push({ kind: "num", v: c.v, src: "num", idx: i }); renderGame(); });
      nums.appendChild(b);
    });
    box.appendChild(nums);
    const ops = el("div", "axiom-handrow");
    h.op.forEach((c, i) => {
      const placeable = c.kind === "op" || c.kind === "rel";
      const b = el("button", "axiom-card " + c.kind);
      b.textContent = cardLabel(c);
      if (placeable) {
        b.disabled = !canAppend(builderCells(), c.kind) || buildUses("op", i);
        b.addEventListener("click", () => { build.cells.push({ kind: c.kind, v: c.v, src: "op", idx: i }); renderGame(); });
      } else {
        // mod / act cards aren't placed in the strip; show as info
        b.classList.add("info");
        b.title = c.kind === "mod" ? "Use the " + MOD_LABEL[c.v] + " button in the composer" : ACT_DESC[c.v];
      }
      ops.appendChild(b);
    });
    box.appendChild(ops);
    return box;
  }
  // Is hand card (which list, idx) already used in the current builder?
  function buildUses(src, idx) { return build.cells.some((c) => c.src === src && c.idx === idx); }

  function renderActions() {
    const g = G();
    const box = el("div", "axiom-actions");
    const has = (v) => g.hands[g.turn].op.some((c) => c.kind === "act" && c.v === v);
    const mk = (v, label, onClick) => { const b = el("button", "btn ghost axiom-actbtn", label); b.disabled = !has(v) || swapMode; b.title = ACT_DESC[v]; b.addEventListener("click", onClick); return b; };
    box.appendChild(mk("draw", "Draw +1", doDraw));
    box.appendChild(mk("extra", "Extra play", doExtra));
    box.appendChild(mk("swap", "Swap board card", startSwap));
    box.appendChild(mk("skip", "Skip a player", doSkip));
    const pass = el("button", "btn ghost axiom-actbtn", "Discard & redraw"); pass.disabled = swapMode;
    pass.title = "Can't move? Discard your hand and redraw, ending your turn.";
    pass.addEventListener("click", doPass);
    box.appendChild(pass);
    if (swapMode) { const cancel = el("button", "btn ghost axiom-actbtn", "Cancel swap"); cancel.addEventListener("click", () => { swapMode = false; swapCard = null; renderGame(); }); box.appendChild(cancel); }
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
    if (g.log.length) {
      const log = el("div", "axiom-log");
      g.log.forEach((m) => log.appendChild(el("p", "axiom-logline", m)));
      box.appendChild(log);
    }
    return box;
  }

  /* ---------- placing a line ---------- */
  function placeLine() {
    const g = G();
    const cells = builderCells();
    const parsed = parseLine(cells);
    if (!parsed.ok || !relTrue(parsed.leftVal, parsed.rel, parsed.rightVal)) return;
    const sc = scoreLine(parsed, { x2: !!build.x2, ineqScore: cfg().ineqScore });
    // consume the placed cards from hand
    const h = g.hands[g.turn];
    const usedNum = build.cells.filter((c) => c.src === "num").map((c) => c.idx);
    const usedOp = build.cells.filter((c) => c.src === "op").map((c) => c.idx);
    // free '=' cells have no src → nothing to consume
    removeIdx(h.num, usedNum, g.decks.numDisc);
    removeIdx(h.op, usedOp, g.decks.opDisc);
    if (build.x2) { pull(h.op, build.x2, g.decks.opDisc); }
    const giftTo = build.giftTo;
    let giftCard = null;
    if (giftTo != null) { giftCard = handFind("mod", "gift"); if (giftCard) pull(h.op, giftCard, g.decks.opDisc); }

    // place on the first empty row
    const row = g.board.findIndex((r) => r === null);
    g.board[row] = { player: g.turn, cells, rel: parsed.rel, score: sc.score };

    const recipient = giftTo != null ? giftTo : g.turn;
    g.scores[recipient] += sc.score;
    const exprStr = cells.map(cardLabel).join(" ");
    logLine(`${g.names[g.turn]}: ${exprStr} → ${sc.score >= 0 ? "" : "−"}${Math.abs(sc.score)}${giftTo != null ? ` to ${g.names[giftTo]}` : ""}`);
    fx(sc.score >= 0 ? sound.fanfare : sound.buzz);

    build = freshBuild();
    g.placementsLeft--;
    persist();

    if (checkEnd()) return;
    if (g.placementsLeft > 0) { renderGame(); return; } // Extra play: go again
    endTurn();
  }

  function removeIdx(list, idxs, disc) {
    const set = new Set(idxs);
    const keep = [];
    list.forEach((c, i) => { if (set.has(i)) disc.push(c); else keep.push(c); });
    list.length = 0; keep.forEach((c) => list.push(c));
  }
  function pull(list, card, disc) { const i = list.indexOf(card); if (i >= 0) { disc.push(list.splice(i, 1)[0]); } }

  function endTurn() {
    const g = G();
    refill(g.turn);
    // advance, skipping anyone flagged
    let next = g.turn;
    for (let step = 0; step < g.players; step++) {
      next = (next + 1) % g.players;
      if (g.skipNext[next]) { g.skipNext[next] = false; // consume the skip: discard & redraw their hand
        const h = g.hands[next]; g.decks.numDisc.push(...h.num); g.decks.opDisc.push(...h.op); h.num = []; h.op = []; refill(next);
        logLine(`${g.names[next]} is skipped (hand redrawn).`);
        continue;
      }
      break;
    }
    g.turn = next; g.placementsLeft = 1;
    build = freshBuild();
    persist();
    renderGame();
  }

  function checkEnd() {
    const g = G();
    const hiScore = Math.max(...g.scores);
    if (hiScore >= cfg().target || !boardHasRoom()) {
      g.over = true;
      // winner = highest score (ties: earliest player)
      g.winner = g.scores.indexOf(hiScore);
      persist();
      renderOver();
      return true;
    }
    return false;
  }

  /* ---------- actions ---------- */
  function doDraw() {
    const g = G();
    if (!spend("draw")) return;
    pickDraw((which) => {
      const c = drawFrom(which); if (c) g.hands[g.turn][which === "num" ? "num" : "op"].push(c);
      logLine(`${g.names[g.turn]} drew an extra card.`);
      persist(); renderGame();
    });
  }
  function doExtra() {
    const g = G();
    if (!spend("extra")) return;
    g.placementsLeft++;
    logLine(`${g.names[g.turn]} plays an extra line this turn.`);
    persist(); renderGame();
  }
  function doPass() {
    const g = G();
    const h = g.hands[g.turn];
    if (!confirm("Discard your whole hand, redraw, and end your turn?")) return;
    g.decks.numDisc.push(...h.num); g.decks.opDisc.push(...h.op); h.num = []; h.op = [];
    logLine(`${g.names[g.turn]} discarded and redrew.`);
    build = freshBuild();
    g.placementsLeft = 0;
    endTurn();
  }
  function doSkip() {
    const g = G();
    pickPlayer("Skip whose next turn?", (pi) => {
      if (!spend("skip")) return;
      // Block check: target may cancel
      if (holds(pi, "block")) {
        if (confirm(`${g.names[pi]} holds a Block. Use it to cancel the skip?`)) {
          spendFrom(pi, "block");
          logLine(`${g.names[pi]} blocked the skip!`);
          persist(); renderGame(); return;
        }
      }
      g.skipNext[pi] = true;
      logLine(`${g.names[g.turn]} will skip ${g.names[pi]}'s next turn.`);
      g.placementsLeft = 0; endTurn();
    }, g.turn);
  }

  // Swap-a-board-card flow.
  let swapMode = false, swapCard = null;
  function startSwap() {
    if (!spend("swap")) return;
    swapMode = true; swapCard = null;
    logLine(`${G().names[G().turn]} is swapping a board card…`);
    persist(); renderGame();
  }
  function chooseSwapCell(r, c) {
    const g = G(); const line = g.board[r]; if (!line) return;
    const target = line.cells[c];
    // pick a compatible hand card
    const h = g.hands[g.turn];
    const sameKind = (card) => card.kind === target.kind || (target.kind === "num" && card.kind === "num");
    const pool = target.kind === "num" ? h.num.map((card, i) => ({ card, list: "num", i })) : h.op.filter((card) => card.kind === target.kind).map((card) => ({ card, list: "op", i: h.op.indexOf(card) }));
    if (!pool.length) { alert(`You have no ${target.kind === "num" ? "number" : target.v + "-type"} card to swap in.`); return; }
    pickFromPool(pool, (sel) => {
      // swap
      const oldCard = line.cells[c];
      const newCard = { kind: sel.card.kind, v: sel.card.v };
      // remove sel from hand, put oldCard-as-card into discard appropriate
      if (sel.list === "num") { g.decks.numDisc.push(g.hands[g.turn].num.splice(sel.i, 1)[0]); }
      else { g.decks.opDisc.push(g.hands[g.turn].op.splice(sel.i, 1)[0]); }
      line.cells[c] = newCard;
      // revalidate the line
      const parsed = parseLine(line.cells.map((x) => ({ kind: x.kind, v: x.v })));
      const ok = parsed.ok && relTrue(parsed.leftVal, parsed.rel, parsed.rightVal);
      if (!ok) {
        // dissolve the line (cells cleared, cards discarded; scored points stay)
        line.cells.forEach((x) => { (x.kind === "num" ? g.decks.numDisc : g.decks.opDisc).push({ kind: x.kind, v: x.v }); });
        g.board[r] = null;
        logLine(`${g.names[g.turn]} broke a line with a swap — it's removed.`);
      } else {
        logLine(`${g.names[g.turn]} swapped a card on the board.`);
      }
      swapMode = false; swapCard = null;
      g.placementsLeft = 0;
      endTurn();
    });
  }

  function spend(v) { const g = G(); return spendFrom(g.turn, v); }
  function spendFrom(pi, v) { const h = G().hands[pi].op; const i = h.findIndex((c) => c.kind === "act" && c.v === v); if (i < 0) return false; G().decks.opDisc.push(h.splice(i, 1)[0]); return true; }
  function holds(pi, v) { return G().hands[pi].op.some((c) => c.kind === "act" && c.v === v); }

  /* ---------- small overlays ---------- */
  function overlay(title, bodyNodes) {
    const ov = el("div", "axiom-overlay");
    const card = el("div", "axiom-ovcard");
    card.appendChild(el("p", "axiom-ovtitle", title));
    (Array.isArray(bodyNodes) ? bodyNodes : [bodyNodes]).forEach((n) => card.appendChild(n));
    ov.appendChild(card); ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    panel.appendChild(ov);
    return ov;
  }
  function pickPlayer(title, cb, exclude) {
    const g = G();
    const row = el("div", "axiom-ovbtns");
    g.names.forEach((nm, i) => { if (i === exclude) return; const b = el("button", "btn " + PLAYER_CLASS[i], escapeH(nm)); b.addEventListener("click", () => { ov.remove(); cb(i); }); row.appendChild(b); });
    const ov = overlay(title, row);
  }
  function pickDraw(cb) {
    const row = el("div", "axiom-ovbtns");
    const a = el("button", "btn primary", "Number card"); a.addEventListener("click", () => { ov.remove(); cb("num"); });
    const b = el("button", "btn", "Operation card"); b.addEventListener("click", () => { ov.remove(); cb("op"); });
    row.append(a, b);
    const ov = overlay("Draw which kind of card?", row);
  }
  function pickFromPool(pool, cb) {
    const row = el("div", "axiom-ovbtns");
    pool.forEach((p) => { const b = el("button", "btn", cardLabel(p.card)); b.addEventListener("click", () => { ov.remove(); cb(p); }); row.appendChild(b); });
    const cancel = el("button", "btn ghost", "Cancel"); cancel.addEventListener("click", () => { ov.remove(); swapMode = true; renderGame(); });
    row.appendChild(cancel);
    const ov = overlay("Swap in which card?", row);
  }

  /* ---------- game over ---------- */
  function renderOver() {
    const g = G();
    panel.innerHTML = "";
    const wrap = el("div", "axiom-game");
    wrap.appendChild(el("div", "dojo-toprow", `<span class="dojo-set">Axiom — final</span><span class="dojo-topbtns"><button class="btn ghost" id="axAgain">Play again</button><button class="btn ghost" id="axLobby">Lobby</button></span>`));
    const ranked = g.names.map((nm, i) => ({ nm, i, s: g.scores[i] })).sort((a, b) => b.s - a.s);
    wrap.appendChild(el("p", "axiom-winner", `🏆 ${escapeH(ranked[0].nm)} wins with ${ranked[0].s}!`));
    const list = el("ol", "axiom-finallist");
    ranked.forEach((r) => { const li = el("li", "axiom-finalrow " + PLAYER_CLASS[r.i]); li.innerHTML = `<span>${escapeH(r.nm)}</span><span class="axiom-finalscore">${r.s}</span>`; list.appendChild(li); });
    wrap.appendChild(list);
    panel.appendChild(wrap);
    panel.querySelector("#axAgain").addEventListener("click", () => startGame());
    panel.querySelector("#axLobby").addEventListener("click", () => { build = freshBuild(); renderLobby(); });
  }

  // Boot: resume a live game or show the lobby.
  if (G() && !G().over) renderGame(); else renderLobby();
}
