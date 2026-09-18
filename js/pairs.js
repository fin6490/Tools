// pairs.js — Pairs: a match-the-question-to-the-answer memory game for the board.
// Flip two cards; a question and its answer make a pair. Solo (whole class) or
// two teams taking turns. Reuses the Dojo's question sets. Zero deps.
import { mathHtml, escapeHtml, shuffle, allSets, el, makeGenerateRow, fitText } from "./quizkit.js?v=20260915y";
import { getState, save } from "./storage.js?v=20260915y";
import * as sound from "./sound.js?v=20260915y";

export function initPairs(root) {
  const panel = root.querySelector(".pairs-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState();
    if (!s.pairs) s.pairs = { activeSetId: null, count: 8, mode: "solo" };
    return s.pairs;
  };
  const activeSet = () => { const sets = allSets(); return sets.find((x) => x.id === cfg().activeSetId) || sets[0]; };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  let cards = [];        // { id, pairId, kind:'q'|'a', text, matched, up }
  let first = null;      // first flipped card index
  let busy = false;      // input locked during flip-back
  let moves = 0, matched = 0;
  let mode = "solo", turn = 0, scores = [0, 0];

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "pairs-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Memory match"));
    card.appendChild(el("h2", "dojo-title", "Pairs"));
    card.appendChild(el("p", "dojo-lede", "Flip two cards to match each question with its answer. Great for key terms, vocabulary and definitions — play as a class or as two teams."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const sets = allSets();
    const setRow = el("div", "dojo-field");
    setRow.appendChild(el("label", "dojo-lbl", "Question set"));
    const sel = el("select", "dojo-select");
    sets.forEach((s) => { const uniq = uniqueQuestions(s).length; const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${uniq} usable)`; if (s.id === (cfg().activeSetId || sets[0].id)) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { cfg().activeSetId = sel.value; save(); renderLobby(); });
    setRow.appendChild(sel);
    card.appendChild(setRow);

    card.appendChild(makeGenerateRow((set) => { cfg().activeSetId = set.id; save(); renderLobby(`Generated “${set.name}” — ready.`); }));

    const max = Math.min(12, uniqueQuestions(activeSet()).length);
    const cntRow = el("div", "dojo-field dojo-field-inline");
    cntRow.appendChild(el("label", "dojo-lbl", "Pairs"));
    const cntSel = el("select", "dojo-select dojo-select-sm");
    [4, 6, 8, 10, 12].filter((n) => n <= max).forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === Math.min(cfg().count || 8, max)) o.selected = true; cntSel.appendChild(o); });
    cntSel.addEventListener("change", () => { cfg().count = +cntSel.value; save(); });
    cntRow.appendChild(cntSel);
    card.appendChild(cntRow);

    const modeRow = el("div", "dojo-field dojo-field-inline");
    modeRow.appendChild(el("label", "dojo-lbl", "Mode"));
    const modeSel = el("select", "dojo-select dojo-select-sm");
    [["solo", "Whole class"], ["teams", "Two teams"]].forEach(([v, t]) => { const o = el("option"); o.value = v; o.textContent = t; if (v === (cfg().mode || "solo")) o.selected = true; modeSel.appendChild(o); });
    modeSel.addEventListener("change", () => { cfg().mode = modeSel.value; save(); });
    modeRow.appendChild(modeSel);
    card.appendChild(modeRow);

    const go = el("button", "btn primary dojo-begin", "Start");
    go.addEventListener("click", () => { cfg().activeSetId = sel.value; cfg().count = +cntSel.value; cfg().mode = modeSel.value; save(); start(); });
    card.appendChild(go);

    if (max < 4) card.appendChild(el("p", "dojo-hint", "This set needs at least 4 questions with different answers. Pick another set or add more in The BT Dojo editor."));
    panel.appendChild(card);
  }

  // Questions with distinct answers so the board has no ambiguous duplicate cards.
  function uniqueQuestions(set) {
    const seen = new Set(), out = [];
    (set.questions || []).forEach((q) => { const a = String(q.a).trim().toLowerCase(); if (q.q && q.a && !seen.has(a)) { seen.add(a); out.push(q); } });
    return out;
  }

  /* ================= GAME ================= */
  function start() {
    const n = Math.min(cfg().count || 8, uniqueQuestions(activeSet()).length);
    if (n < 2) return;
    const picks = shuffle(uniqueQuestions(activeSet())).slice(0, n);
    cards = [];
    picks.forEach((q, i) => {
      cards.push({ id: "q" + i, pairId: i, kind: "q", text: q.q, matched: false, up: false });
      cards.push({ id: "a" + i, pairId: i, kind: "a", text: q.a, matched: false, up: false });
    });
    cards = shuffle(cards);
    first = null; busy = false; moves = 0; matched = 0;
    mode = cfg().mode || "solo"; turn = 0; scores = [0, 0];
    buildShell(n);
    paintStatus();
  }

  function buildShell(n) {
    panel.innerHTML = "";
    panel.appendChild(el("div", "pairs-game", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="prSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="prMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="prQuit">End</button>
        </span>
      </div>
      <div class="pairs-status" id="prStatus"></div>
      <div class="pairs-grid" id="prGrid"></div>`));
    panel.querySelector("#prSet").textContent = activeSet().name;
    updateMute();
    panel.querySelector("#prMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#prQuit").addEventListener("click", () => renderLobby());
    const grid = panel.querySelector("#prGrid");
    cards.forEach((c, i) => {
      const b = el("button", "pairs-card", "");
      b.dataset.i = i;
      b.addEventListener("click", () => onFlip(i));
      grid.appendChild(b);
    });
    paintCards();
  }
  function updateMute() { const b = panel.querySelector("#prMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function paintCards() {
    const grid = panel.querySelector("#prGrid");
    [...grid.children].forEach((b, i) => {
      const c = cards[i];
      b.classList.toggle("up", c.up || c.matched);
      b.classList.toggle("matched", c.matched);
      b.classList.toggle("kind-q", (c.up || c.matched) && c.kind === "q");
      b.classList.toggle("kind-a", (c.up || c.matched) && c.kind === "a");
      b.innerHTML = (c.up || c.matched) ? `<span class="pairs-face">${mathHtml(c.text)}</span>` : `<span class="pairs-back"></span>`;
      if (c.up || c.matched) fitText(b, b.querySelector(".pairs-face"));
      b.disabled = c.matched;
    });
  }

  function paintStatus() {
    const s = panel.querySelector("#prStatus");
    if (!s) return;
    if (mode === "teams") {
      s.innerHTML = `<span class="pairs-team ${turn === 0 ? "on" : ""}">Team 1 · ${scores[0]}</span>
        <span class="pairs-vs">vs</span>
        <span class="pairs-team ${turn === 1 ? "on" : ""}">Team 2 · ${scores[1]}</span>`;
    } else {
      s.innerHTML = `<span class="pairs-moves">Matched ${matched} / ${cards.length / 2} · ${moves} moves</span>`;
    }
  }

  function onFlip(i) {
    if (busy) return;
    const c = cards[i];
    if (c.matched || c.up) return;
    c.up = true; paintCards(); fx(sound.tick);
    if (first === null) { first = i; return; }
    // second card flipped — evaluate
    moves++;
    const a = cards[first], b = cards[i];
    const isPair = a.pairId === b.pairId && a.kind !== b.kind;
    if (isPair) {
      a.matched = b.matched = true; matched++;
      if (mode === "teams") scores[turn]++;
      first = null;
      paintCards(); paintStatus(); fx(sound.beep);
      if (matched === cards.length / 2) return void setTimeout(renderDone, 500);
      // matcher keeps their turn (classic rules) — no turn switch
    } else {
      busy = true; paintStatus(); fx(sound.buzz);
      // Keep a wrong pair face-up long enough to actually read — longer for
      // wordy answers, so a written card doesn't vanish before you've seen it.
      const longest = Math.max(String(a.text).length, String(b.text).length);
      const delay = Math.min(5000, 1400 + longest * 45);
      setTimeout(() => {
        a.up = b.up = false; first = null; busy = false;
        if (mode === "teams") { turn = turn ? 0 : 1; }
        paintCards(); paintStatus();
      }, delay);
    }
  }

  function renderDone() {
    panel.innerHTML = "";
    const card = el("div", "pairs-lobby");
    card.appendChild(el("h2", "dojo-title", "All matched!"));
    if (mode === "teams") {
      const winner = scores[0] === scores[1] ? "It's a tie!" : (scores[0] > scores[1] ? "Team 1 wins!" : "Team 2 wins!");
      card.appendChild(el("p", "dojo-res-name", winner));
      card.appendChild(el("p", "dojo-lede", `Team 1 ${scores[0]} · Team 2 ${scores[1]}`));
    } else {
      card.appendChild(el("p", "dojo-lede", `Cleared ${cards.length / 2} pairs in ${moves} moves.`));
    }
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "Play again");
    again.addEventListener("click", () => start());
    const back = el("button", "btn ghost", "Change set");
    back.addEventListener("click", () => renderLobby());
    row.append(again, back);
    card.appendChild(row);
    panel.appendChild(card);
  }

  renderLobby();
}
