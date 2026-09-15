// reveal.js — Reveal cards: a teacher-paced flashcard runner for the whiteboard.
// Pick a question set, show a question big, click to reveal the answer, next.
// Reuses the Dojo's question sets (starter packs + your saved sets). Zero deps.
import { mathHtml, escapeHtml, shuffle, allSets, el } from "./quizkit.js?v=20260915b";
import { getState, save } from "./storage.js?v=20260915b";
import * as sound from "./sound.js?v=20260915b";

export function initReveal(root) {
  const panel = root.querySelector(".reveal-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState();
    if (!s.reveal) s.reveal = { activeSetId: null, shuffle: true };
    return s.reveal;
  };
  const activeSet = () => {
    const sets = allSets();
    return sets.find((x) => x.id === cfg().activeSetId) || sets[0];
  };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  let deck = [];   // questions in play order
  let idx = 0;     // current card
  let shown = false; // is the answer revealed

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "reveal-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Flashcards"));
    card.appendChild(el("h2", "dojo-title", "Reveal cards"));
    card.appendChild(el("p", "dojo-lede", "Show a question on the board, reveal the answer when the class is ready, then move on. A quick, low-stakes starter or plenary — works with any question set."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const sets = allSets();
    const setRow = el("div", "dojo-field");
    setRow.appendChild(el("label", "dojo-lbl", "Question set"));
    const sel = el("select", "dojo-select");
    sets.forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${s.questions.length})`; if (s.id === (cfg().activeSetId || sets[0].id)) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { cfg().activeSetId = sel.value; save(); });
    setRow.appendChild(sel);
    card.appendChild(setRow);

    const shufRow = el("label", "reveal-check");
    const cb = el("input"); cb.type = "checkbox"; cb.checked = cfg().shuffle !== false;
    cb.addEventListener("change", () => { cfg().shuffle = cb.checked; save(); });
    shufRow.append(cb, document.createTextNode(" Shuffle the order"));
    card.appendChild(shufRow);

    const go = el("button", "btn primary dojo-begin", "Start");
    go.addEventListener("click", () => { cfg().activeSetId = sel.value; save(); startRun(); });
    card.appendChild(go);

    card.appendChild(el("p", "dojo-hint", "Tip: make sets in The BT Dojo editor (or generate one with AI) and they appear here too. On the whiteboard: Space reveals, → next, ← back."));
    panel.appendChild(card);
  }

  /* ================= RUNNER ================= */
  function startRun() {
    const set = activeSet();
    if (!set || !set.questions.length) return;
    deck = cfg().shuffle !== false ? shuffle(set.questions) : set.questions.slice();
    idx = 0; shown = false;
    buildShell();
    paint();
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "reveal-run", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="rvSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="rvMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="rvQuit">End</button>
        </span>
      </div>
      <div class="reveal-stage" id="rvStage">
        <p class="reveal-count" id="rvCount"></p>
        <div class="reveal-q" id="rvQ"></div>
        <div class="reveal-a" id="rvA" hidden></div>
        <button class="btn primary reveal-flip" id="rvFlip">Reveal answer</button>
      </div>
      <div class="reveal-nav">
        <button class="btn ghost" id="rvPrev">← Back</button>
        <button class="btn ghost" id="rvShuffle">Shuffle</button>
        <button class="btn primary" id="rvNext">Next →</button>
      </div>`));
    panel.querySelector("#rvSet").textContent = activeSet().name;
    updateMute();
    panel.querySelector("#rvMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#rvQuit").addEventListener("click", () => renderLobby());
    panel.querySelector("#rvFlip").addEventListener("click", flip);
    panel.querySelector("#rvStage").addEventListener("click", (e) => { if (e.target.closest("button")) return; if (!shown) flip(); });
    panel.querySelector("#rvNext").addEventListener("click", next);
    panel.querySelector("#rvPrev").addEventListener("click", prev);
    panel.querySelector("#rvShuffle").addEventListener("click", () => { deck = shuffle(deck); idx = 0; shown = false; paint(); });
    document.addEventListener("keydown", onKey);
  }
  function updateMute() {
    const b = panel.querySelector("#rvMute");
    if (b) b.textContent = soundOn ? "♪" : "✕";
  }

  function onKey(e) {
    if (!panel.querySelector("#rvStage")) { document.removeEventListener("keydown", onKey); return; }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); shown ? next() : flip(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  }

  function paint() {
    const q = deck[idx];
    panel.querySelector("#rvCount").textContent = `${idx + 1} / ${deck.length}`;
    panel.querySelector("#rvQ").innerHTML = mathHtml(q.q);
    const a = panel.querySelector("#rvA");
    a.innerHTML = answersHtml(q);
    a.hidden = !shown;
    panel.querySelector("#rvFlip").hidden = shown;
    panel.querySelector("#rvPrev").disabled = idx === 0;
  }
  function answersHtml(q) {
    const list = (Array.isArray(q.answers) && q.answers.length) ? q.answers : [q.a];
    return list.map((x) => mathHtml(x)).join(' <span class="muted">/</span> ');
  }

  function flip() { if (shown) return; shown = true; paint(); fx(sound.beep); }
  function next() {
    if (idx >= deck.length - 1) { renderDone(); return; }
    idx++; shown = false; paint(); fx(sound.tick);
  }
  function prev() { if (idx === 0) return; idx--; shown = false; paint(); }

  function renderDone() {
    document.removeEventListener("keydown", onKey);
    panel.innerHTML = "";
    const card = el("div", "reveal-lobby");
    card.appendChild(el("h2", "dojo-title", "Deck complete"));
    card.appendChild(el("p", "dojo-lede", `You went through all ${deck.length} cards in “${escapeHtml(activeSet().name)}”.`));
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "Go again");
    again.addEventListener("click", () => startRun());
    const back = el("button", "btn ghost", "Choose another set");
    back.addEventListener("click", () => renderLobby());
    row.append(again, back);
    card.appendChild(row);
    panel.appendChild(card);
  }

  renderLobby();
}
