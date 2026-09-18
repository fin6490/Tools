// noughts.js — Noughts & crosses (tic-tac-toe) for the whiteboard.
// Two players take turns, or play one player against a simple unbeatable
// computer. Running tally across rounds. Zero deps.
import { el } from "./quizkit.js?v=20260916a";
import { getState, save } from "./storage.js?v=20260916a";
import * as sound from "./sound.js?v=20260916a";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export function initNoughts(root) {
  const panel = root.querySelector(".noughts-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => {
    const s = getState();
    if (!s.noughts) s.noughts = { mode: "two", scores: { x: 0, o: 0, d: 0 } };
    if (!s.noughts.scores) s.noughts.scores = { x: 0, o: 0, d: 0 };
    return s.noughts;
  };

  let board, turn, over, starter, mode;

  function winnerLine(b, m) {
    return LINES.find((L) => L.every((i) => b[i] === m)) || null;
  }
  function full(b) { return b.every((c) => c); }

  /* ---------- minimax so "vs computer" plays perfectly ---------- */
  function bestMove(b, me, foe) {
    let bestScore = -Infinity, move = -1;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = me;
      const s = minimax(b, false, me, foe, 0);
      b[i] = "";
      if (s > bestScore) { bestScore = s; move = i; }
    }
    return move;
  }
  function minimax(b, maximizing, me, foe, depth) {
    if (winnerLine(b, me)) return 10 - depth;
    if (winnerLine(b, foe)) return depth - 10;
    if (full(b)) return 0;
    let best = maximizing ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = maximizing ? me : foe;
      const s = minimax(b, !maximizing, me, foe, depth + 1);
      b[i] = "";
      best = maximizing ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "noughts-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Two-player classic"));
    card.appendChild(el("h2", "dojo-title", "Noughts & crosses"));
    card.appendChild(el("p", "dojo-lede", "Take it in turns to get three in a row — as two players on the board, or one player against the computer. First to a line wins; the scores keep themselves."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const modeRow = el("div", "dojo-field dojo-field-inline");
    modeRow.appendChild(el("label", "dojo-lbl", "Players"));
    const sel = el("select", "dojo-select dojo-select-sm");
    [["two", "Two players"], ["cpu", "vs Computer"]].forEach(([v, t]) => { const o = el("option"); o.value = v; o.textContent = t; if (v === (cfg().mode || "two")) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { cfg().mode = sel.value; save(); });
    modeRow.appendChild(sel);
    card.appendChild(modeRow);

    const go = el("button", "btn primary dojo-begin", "Start game");
    go.addEventListener("click", () => {
      cfg().mode = sel.value; save();
      // Two players always open with crosses; vs the computer, toss for who
      // starts so the computer takes the first turn about half the time.
      starter = sel.value === "cpu" ? (Math.random() < 0.5 ? "o" : "x") : "x";
      startGame();
    });
    card.appendChild(go);
    card.appendChild(el("p", "dojo-hint", "You play as crosses (✕). In “vs Computer” the first turn is tossed for, and the computer plays a perfect game — so the best you can force is a draw."));
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function startGame() {
    board = Array(9).fill("");
    mode = cfg().mode || "two";
    turn = starter; over = false;
    buildShell();
    paint();
    // If the computer won the toss (or was dealt the opening round), it moves first.
    if (mode === "cpu" && turn === "o" && !over) {
      setTimeout(() => { const m = bestMove(board.slice(), "o", "x"); if (m >= 0) place(m); }, 420);
    }
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "noughts-game", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="ntSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="ntMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="ntQuit">Change mode</button>
        </span>
      </div>
      <div class="noughts-scores" id="ntScores"></div>
      <p class="noughts-turn" id="ntTurn"></p>
      <div class="noughts-board" id="ntBoard"></div>
      <div class="dojo-editbtns noughts-ctrls">
        <button class="btn primary" id="ntNew">New round</button>
        <button class="btn ghost" id="ntResetScores">Reset scores</button>
      </div>`));
    panel.querySelector("#ntSet").textContent = mode === "cpu" ? "You vs Computer" : "Two players";
    updateMute();
    panel.querySelector("#ntMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#ntQuit").addEventListener("click", () => renderLobby());
    panel.querySelector("#ntNew").addEventListener("click", () => { starter = starter === "x" ? "o" : "x"; startGame(); });
    panel.querySelector("#ntResetScores").addEventListener("click", () => { cfg().scores = { x: 0, o: 0, d: 0 }; save(); paintScores(); });
    const bd = panel.querySelector("#ntBoard");
    for (let i = 0; i < 9; i++) {
      const b = el("button", "noughts-cell"); b.dataset.i = i;
      b.addEventListener("click", () => onCell(i));
      bd.appendChild(b);
    }
  }
  function updateMute() { const b = panel.querySelector("#ntMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  const markGlyph = (m) => m === "x" ? "✕" : m === "o" ? "◯" : "";
  function labelFor(m) {
    if (mode === "cpu") return m === "x" ? "You" : "Computer";
    return m === "x" ? "Crosses" : "Noughts";
  }

  function paintScores() {
    const box = panel.querySelector("#ntScores"); if (!box) return;
    const s = cfg().scores;
    box.innerHTML = "";
    box.appendChild(el("div", "noughts-score sx", `<span class="noughts-sname">${labelFor("x")} (✕)</span><span class="noughts-sval">${s.x}</span>`));
    box.appendChild(el("div", "noughts-score sd", `<span class="noughts-sname">Draws</span><span class="noughts-sval">${s.d}</span>`));
    box.appendChild(el("div", "noughts-score so", `<span class="noughts-sname">${labelFor("o")} (◯)</span><span class="noughts-sval">${s.o}</span>`));
  }

  function paint(winLine) {
    paintScores();
    const bd = panel.querySelector("#ntBoard");
    [...bd.children].forEach((c, i) => {
      c.textContent = markGlyph(board[i]);
      c.classList.toggle("x", board[i] === "x");
      c.classList.toggle("o", board[i] === "o");
      c.classList.toggle("win", !!winLine && winLine.includes(i));
      c.disabled = over || !!board[i] || (mode === "cpu" && turn === "o");
    });
    const t = panel.querySelector("#ntTurn");
    if (over) {
      t.className = "noughts-turn done";
    } else {
      t.className = "noughts-turn";
      t.innerHTML = `<span class="noughts-dot ${turn}"></span> ${labelFor(turn)} to play`;
    }
  }

  function onCell(i) {
    if (over || board[i]) return;
    if (mode === "cpu" && turn === "o") return;
    place(i);
  }
  function place(i) {
    board[i] = turn; fx(sound.tick);
    const line = winnerLine(board, turn);
    if (line) return finish(turn, line);
    if (full(board)) return finish(null, null);
    turn = turn === "x" ? "o" : "x";
    paint();
    if (mode === "cpu" && turn === "o" && !over) {
      setTimeout(() => { const m = bestMove(board.slice(), "o", "x"); if (m >= 0) place(m); }, 420);
    }
  }

  function finish(winner, line) {
    over = true;
    const s = cfg().scores;
    if (winner === "x") s.x++; else if (winner === "o") s.o++; else s.d++;
    save();
    paint(line);
    const t = panel.querySelector("#ntTurn");
    if (winner) { t.textContent = `${labelFor(winner)} win${labelFor(winner) === "You" ? "" : "s"}!`; fx(sound.fanfare); }
    else { t.textContent = "It's a draw."; fx(sound.beep); }
  }

  renderLobby();
}
