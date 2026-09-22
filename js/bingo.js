// bingo.js — Bingo: the teacher calls questions, students mark the answers on
// their cards. Auto-builds printable cards from a question set's answers and
// runs a caller that reveals one answer at a time. Reuses the Dojo sets.
import { mathHtml, escapeHtml, shuffle, allSets, el, makeGenerateRow, fitBlock } from "./quizkit.js?v=20260916j";
import { getState, save } from "./storage.js?v=20260916j";
import * as sound from "./sound.js?v=20260916j";

export function initBingo(root) {
  const panel = root.querySelector(".bingo-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState();
    if (!s.bingo) s.bingo = { activeSetId: null, size: 3 };
    return s.bingo;
  };
  const activeSet = () => { const sets = allSets(); return sets.find((x) => x.id === cfg().activeSetId) || sets[0]; };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  // Questions with distinct answers — the caller queue, and the card pool.
  function usable(set) {
    const seen = new Set(), out = [];
    (set.questions || []).forEach((q) => { const a = String(q.a).trim().toLowerCase(); if (q.q && q.a && !seen.has(a)) { seen.add(a); out.push(q); } });
    return out;
  }

  let queue = [], idx = -1, called = [], revealed = false;

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "bingo-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Whole-class caller"));
    card.appendChild(el("h2", "dojo-title", "Bingo"));
    card.appendChild(el("p", "dojo-lede", "You call the questions, the class marks the answers on their cards. Print cards for everyone, or have students fill a blank grid from the answer pool."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const sets = allSets();
    const setRow = el("div", "dojo-field");
    setRow.appendChild(el("label", "dojo-lbl", "Question set"));
    const sel = el("select", "dojo-select");
    sets.forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${usable(s).length} answers)`; if (s.id === (cfg().activeSetId || sets[0].id)) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { cfg().activeSetId = sel.value; save(); renderLobby(); });
    setRow.appendChild(sel);
    card.appendChild(setRow);

    card.appendChild(makeGenerateRow((set) => { cfg().activeSetId = set.id; save(); renderLobby(`Generated “${set.name}” — ready.`); }));

    const pool = usable(activeSet()).length;
    const sizeRow = el("div", "dojo-field dojo-field-inline");
    sizeRow.appendChild(el("label", "dojo-lbl", "Card size"));
    const sizeSel = el("select", "dojo-select dojo-select-sm");
    [[3, "3 × 3"], [4, "4 × 4"], [5, "5 × 5"]].forEach(([n, t]) => { if (n * n <= pool) { const o = el("option"); o.value = n; o.textContent = t; if (n === (cfg().size || 3)) o.selected = true; sizeSel.appendChild(o); } });
    sizeSel.addEventListener("change", () => { cfg().size = +sizeSel.value; save(); });
    sizeRow.appendChild(sizeSel);
    card.appendChild(sizeRow);

    if (pool < 9) {
      card.appendChild(el("p", "dojo-hint", "Bingo needs at least 9 questions with different answers. Pick another set or add more in The BT Dojo editor."));
      panel.appendChild(card);
      return;
    }

    const btns = el("div", "dojo-editbtns");
    const play = el("button", "btn primary dojo-begin", "Start calling");
    play.addEventListener("click", () => { cfg().activeSetId = sel.value; cfg().size = +sizeSel.value; save(); startCaller(); });
    const printBtn = el("button", "btn ghost", "Print cards");
    printBtn.addEventListener("click", () => { cfg().activeSetId = sel.value; cfg().size = +sizeSel.value; save(); renderPrint(); });
    const diyBtn = el("button", "btn ghost", "DIY cards");
    diyBtn.addEventListener("click", () => { cfg().activeSetId = sel.value; cfg().size = +sizeSel.value; save(); renderDIY(); });
    btns.append(play, printBtn, diyBtn);
    card.appendChild(btns);
    panel.appendChild(card);
  }

  /* ================= DIY CARDS (show all answers, students draw their own) ================= */
  function renderDIY() {
    const n = cfg().size || 3, pool = usable(activeSet()).map((q) => q.a);
    panel.innerHTML = "";
    const bar = el("div", "dojo-editbtns bingo-noprint bingo-print-bar");
    const back = el("button", "btn ghost", "← Back"); back.addEventListener("click", () => renderLobby());
    const print = el("button", "btn primary", "Print blank grids"); print.addEventListener("click", () => window.print());
    bar.append(back, print);
    panel.appendChild(bar);
    panel.appendChild(el("p", "dojo-hint bingo-noprint bingo-print-hint", `Students draw a ${n} × ${n} grid and fill it with any ${n * n} of these answers. Show this on the board, or print blank grids to hand out.`));

    // On-screen: all answers, big and readable for the board.
    const board = el("div", "bingo-diy bingo-noprint");
    board.appendChild(el("p", "bingo-diy-title", `Choose any ${n * n} — draw your own ${n} × ${n} grid`));
    const poolBox = el("div", "bingo-diy-pool");
    shuffle(pool).forEach((a) => poolBox.appendChild(el("span", "bingo-diy-item", mathHtml(a))));
    board.appendChild(poolBox);
    panel.appendChild(board);

    // Printable: the answer list once + a batch of blank grids to write in.
    const wrap = el("div", "bingo-print");
    const listCard = el("div", "bingo-printcard");
    listCard.appendChild(el("p", "bingo-printtitle", "BINGO"));
    listCard.appendChild(el("p", "bingo-printset", `${activeSet().name} — choose ${n * n}`));
    const list = el("div", "bingo-printlist");
    shuffle(pool).forEach((a) => list.appendChild(el("span", "bingo-listitem", mathHtml(a))));
    listCard.appendChild(list);
    wrap.appendChild(listCard);
    const blanks = Math.min(32, Math.max(1, cfg().printCount || 6));
    for (let c = 0; c < blanks; c++) {
      const cardEl = el("div", "bingo-printcard");
      cardEl.appendChild(el("p", "bingo-printtitle", "MY CARD"));
      cardEl.appendChild(el("p", "bingo-printset", "Name: ________________"));
      const grid = el("div", "bingo-printgrid");
      grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      for (let i = 0; i < n * n; i++) grid.appendChild(el("span", "bingo-cell bingo-cell-blank", ""));
      cardEl.appendChild(grid);
      wrap.appendChild(cardEl);
    }
    panel.appendChild(wrap);
  }

  /* ================= PRINTABLE CARDS ================= */
  function renderPrint() {
    const n = cfg().size || 3, pool = usable(activeSet()).map((q) => q.a);
    const count = Math.min(32, Math.max(1, cfg().printCount || 6));
    panel.innerHTML = "";
    const bar = el("div", "dojo-editbtns bingo-noprint bingo-print-bar");
    const back = el("button", "btn ghost", "← Back"); back.addEventListener("click", () => renderLobby());
    // How many cards to print — up to 32 (a full class).
    const cntWrap = el("label", "bingo-count-ctrl", "Cards ");
    const cntSel = el("select", "dojo-select dojo-select-sm");
    [6, 12, 16, 20, 24, 28, 32].forEach((v) => { const o = el("option"); o.value = v; o.textContent = v; if (v === count) o.selected = true; cntSel.appendChild(o); });
    cntSel.addEventListener("change", () => { cfg().printCount = +cntSel.value; save(); renderPrint(); });
    cntWrap.appendChild(cntSel);
    const again = el("button", "btn ghost", "Shuffle cards"); again.addEventListener("click", () => renderPrint());
    const print = el("button", "btn primary", "Print these"); print.addEventListener("click", () => window.print());
    bar.append(back, cntWrap, again, print);
    panel.appendChild(bar);
    panel.appendChild(el("p", "dojo-hint bingo-noprint bingo-print-hint", `${count} cards from “${escapeHtml(activeSet().name)}”. Use your browser's print dialog.`));

    const wrap = el("div", "bingo-print");
    for (let c = 0; c < count; c++) {
      const cardEl = el("div", "bingo-printcard");
      cardEl.appendChild(el("p", "bingo-printtitle", "BINGO"));
      cardEl.appendChild(el("p", "bingo-printset", activeSet().name));
      const grid = el("div", "bingo-printgrid");
      grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      shuffle(pool).slice(0, n * n).forEach((a) => grid.appendChild(el("span", "bingo-cell", mathHtml(a))));
      cardEl.appendChild(grid);
      wrap.appendChild(cardEl);
    }
    panel.appendChild(wrap);
  }

  /* ================= CALLER ================= */
  function startCaller() {
    queue = shuffle(usable(activeSet()));
    idx = -1; called = []; revealed = false;
    buildShell();
    nextQuestion();
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "bingo-caller", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="bgSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="bgMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="bgQuit">End</button>
        </span>
      </div>
      <div class="bingo-stage">
        <p class="bingo-count" id="bgCount"></p>
        <div class="bingo-q" id="bgQ"></div>
        <div class="bingo-ans" id="bgAns" hidden></div>
        <div class="bingo-actions">
          <button class="btn primary bingo-reveal" id="bgReveal">Reveal answer</button>
          <button class="btn primary bingo-next" id="bgNext" hidden>Next question →</button>
        </div>
      </div>
      <details class="bingo-called-wrap">
        <summary>Called answers (<span id="bgCalledN">0</span>)</summary>
        <div class="bingo-called" id="bgCalled"></div>
      </details>
      <details class="bingo-pool-wrap">
        <summary>Answer pool — for students filling their own cards</summary>
        <div class="bingo-pool" id="bgPool"></div>
      </details>`));
    panel.querySelector("#bgSet").textContent = activeSet().name;
    updateMute();
    panel.querySelector("#bgMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#bgQuit").addEventListener("click", () => renderLobby());
    panel.querySelector("#bgReveal").addEventListener("click", reveal);
    panel.querySelector("#bgNext").addEventListener("click", nextQuestion);
    const pool = panel.querySelector("#bgPool");
    shuffle(usable(activeSet()).map((q) => q.a)).forEach((a) => pool.appendChild(el("span", "bingo-pool-item", mathHtml(a))));
  }
  function updateMute() { const b = panel.querySelector("#bgMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function nextQuestion() {
    if (idx >= queue.length - 1) return renderDone();
    idx++; revealed = false;
    const q = queue[idx];
    panel.querySelector("#bgCount").textContent = `Question ${idx + 1} of ${queue.length}`;
    const qEl = panel.querySelector("#bgQ"); qEl.innerHTML = mathHtml(q.q); fitBlock(qEl, 0.42, 60, 22);
    const ans = panel.querySelector("#bgAns"); ans.hidden = true; ans.innerHTML = "";
    panel.querySelector("#bgReveal").hidden = false;
    panel.querySelector("#bgNext").hidden = true;
    fx(sound.tick);
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    const q = queue[idx];
    const ans = panel.querySelector("#bgAns");
    ans.innerHTML = mathHtml(q.a); ans.hidden = false; fitBlock(ans, 0.32, 54, 20);
    panel.querySelector("#bgReveal").hidden = true;
    panel.querySelector("#bgNext").hidden = false;
    called.push(q.a);
    const box = panel.querySelector("#bgCalled");
    box.appendChild(el("span", "bingo-called-item", mathHtml(q.a)));
    panel.querySelector("#bgCalledN").textContent = called.length;
    fx(sound.beep);
  }

  function renderDone() {
    panel.innerHTML = "";
    const card = el("div", "bingo-lobby");
    card.appendChild(el("h2", "dojo-title", "All questions called"));
    card.appendChild(el("p", "dojo-lede", `Every answer in “${escapeHtml(activeSet().name)}” has been called (${called.length}).`));
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "Play again"); again.addEventListener("click", () => startCaller());
    const back = el("button", "btn ghost", "Change set"); back.addEventListener("click", () => renderLobby());
    row.append(again, back);
    card.appendChild(row);
    panel.appendChild(card);
  }

  renderLobby();
}
