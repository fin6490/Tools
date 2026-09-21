// gridclaim.js — Grid claim: a two-team connect game (Blockbusters style).
// Teams take turns picking a tile and answering; a correct answer claims it in
// their colour. Team 1 tries to connect left↔right, Team 2 top↔bottom. First to
// bridge their sides wins; if the grid fills, most tiles wins. Reuses Dojo sets.
import { mathHtml, escapeHtml, shuffle, allSets, el, makeGenerateRow } from "./quizkit.js?v=20260916h";
import { getState, save } from "./storage.js?v=20260916h";
import * as sound from "./sound.js?v=20260916h";

export function initGridClaim(root) {
  const panel = root.querySelector(".gridclaim-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState();
    if (!s.gridclaim) s.gridclaim = { activeSetId: null, size: 5 };
    return s.gridclaim;
  };
  const activeSet = () => { const sets = allSets(); return sets.find((x) => x.id === cfg().activeSetId) || sets[0]; };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const answersOf = (q) => (Array.isArray(q.answers) && q.answers.length) ? q.answers : [q.a];

  let size = 5, grid = [], turn = 1, queue = [], qi = 0, selected = -1, over = false;
  const TEAM = { 1: { name: "Team 1", goal: "left to right" }, 2: { name: "Team 2", goal: "top to bottom" } };

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "gridclaim-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Two-team connect game"));
    card.appendChild(el("h2", "dojo-title", "Grid claim"));
    card.appendChild(el("p", "dojo-lede", "Two teams take turns answering to claim tiles. Team 1 tries to build a path from left to right, Team 2 from top to bottom. Answer correctly to claim a tile and block your rivals."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const sets = allSets();
    const setRow = el("div", "dojo-field");
    setRow.appendChild(el("label", "dojo-lbl", "Question set"));
    const sel = el("select", "dojo-select");
    sets.forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${s.questions.length})`; if (s.id === (cfg().activeSetId || sets[0].id)) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { cfg().activeSetId = sel.value; save(); });
    setRow.appendChild(sel);
    card.appendChild(setRow);

    card.appendChild(makeGenerateRow((set) => { cfg().activeSetId = set.id; save(); renderLobby(`Generated “${set.name}” — ready.`); }));

    const szRow = el("div", "dojo-field dojo-field-inline");
    szRow.appendChild(el("label", "dojo-lbl", "Grid size"));
    const szSel = el("select", "dojo-select dojo-select-sm");
    [[4, "4 × 4"], [5, "5 × 5"], [6, "6 × 6"]].forEach(([n, t]) => { const o = el("option"); o.value = n; o.textContent = t; if (n === (cfg().size || 5)) o.selected = true; szSel.appendChild(o); });
    szSel.addEventListener("change", () => { cfg().size = +szSel.value; save(); });
    szRow.appendChild(szSel);
    card.appendChild(szRow);

    const go = el("button", "btn primary dojo-begin", "Start");
    go.addEventListener("click", () => { cfg().activeSetId = sel.value; cfg().size = +szSel.value; save(); start(); });
    card.appendChild(go);
    card.appendChild(el("p", "dojo-hint", "Tip: pick tiles that build your own line and cut across your rivals' path. A correct answer claims the tile; a miss leaves it open and passes over."));
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function start() {
    const set = activeSet();
    if (!set || !set.questions.length) return;
    size = cfg().size || 5;
    grid = new Array(size * size).fill(0);
    turn = 1; queue = shuffle(set.questions); qi = 0; selected = -1; over = false;
    buildShell();
    paint();
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "gridclaim-game", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="gcSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="gcMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="gcQuit">End</button>
        </span>
      </div>
      <p class="gridclaim-turn" id="gcTurn"></p>
      <div class="gridclaim-boardwrap">
        <div class="gridclaim-board" id="gcBoard"></div>
      </div>
      <div class="gridclaim-overlay" id="gcOverlay" hidden></div>`));
    panel.querySelector("#gcSet").textContent = activeSet().name;
    updateMute();
    panel.querySelector("#gcMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#gcQuit").addEventListener("click", () => renderLobby());
    const board = panel.querySelector("#gcBoard");
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    for (let i = 0; i < size * size; i++) {
      const b = el("button", "gridclaim-tile", "");
      b.dataset.i = i;
      b.addEventListener("click", () => onTile(i));
      board.appendChild(b);
    }
  }
  function updateMute() { const b = panel.querySelector("#gcMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function paint() {
    const board = panel.querySelector("#gcBoard");
    [...board.children].forEach((b, i) => {
      b.classList.toggle("t1", grid[i] === 1);
      b.classList.toggle("t2", grid[i] === 2);
      b.classList.toggle("open", grid[i] === 0);
      b.disabled = over || grid[i] !== 0;
    });
    const t = panel.querySelector("#gcTurn");
    if (t) t.innerHTML = `<span class="gridclaim-dot t${turn}"></span> ${TEAM[turn].name}'s turn — connect <strong>${TEAM[turn].goal}</strong>`;
  }

  function onTile(i) {
    if (over || grid[i] !== 0) return;
    selected = i;
    const q = queue[qi % queue.length]; qi++;
    const ov = panel.querySelector("#gcOverlay");
    ov.hidden = false;
    ov.innerHTML = "";
    const box = el("div", "gridclaim-qbox");
    box.appendChild(el("p", "gridclaim-qteam", `${TEAM[turn].name} — answer to claim this tile`));
    box.appendChild(el("div", "bingo-q", mathHtml(q.q)));
    const ans = el("div", "bingo-ans"); ans.hidden = true; box.appendChild(ans);
    const reveal = el("button", "btn primary bingo-reveal", "Reveal answer");
    const acts = el("div", "gridclaim-qacts");
    reveal.addEventListener("click", () => {
      ans.innerHTML = answersOf(q).map(mathHtml).join(' <span class="muted">/</span> '); ans.hidden = false;
      reveal.hidden = true; fx(sound.beep);
      const got = el("button", "btn primary", "Claimed it ✓");
      got.addEventListener("click", () => resolve(true));
      const miss = el("button", "btn ghost", "Missed — pass ✗");
      miss.addEventListener("click", () => resolve(false));
      acts.append(got, miss);
    });
    acts.appendChild(reveal);
    box.appendChild(acts);
    ov.appendChild(box);
    fx(sound.tick);
  }

  function resolve(correct) {
    const ov = panel.querySelector("#gcOverlay");
    ov.hidden = true; ov.innerHTML = "";
    if (correct) {
      grid[selected] = turn; fx(sound.fanfare);
      if (connected(turn)) { paint(); return win(turn); }
      if (!grid.includes(0)) { paint(); return decideFull(); }
      // Neither side can still reach across their edges → the game is decided.
      if (!canConnect(1) && !canConnect(2)) { paint(); return decideFull(); }
    }
    turn = turn === 1 ? 2 : 1;
    paint();
  }

  // Flood-fill: is `owner` connected across their two goal edges?
  function connected(owner) {
    const n = size, seen = new Set(), stack = [];
    for (let i = 0; i < n; i++) {
      const cell = owner === 1 ? i * n : i; // team1 starts on the left column, team2 on the top row
      if (grid[cell] === owner) { seen.add(cell); stack.push(cell); }
    }
    while (stack.length) {
      const c = stack.pop(), r = Math.floor(c / n), col = c % n;
      if (owner === 1 && col === n - 1) return true;
      if (owner === 2 && r === n - 1) return true;
      const nb = [];
      if (r > 0) nb.push(c - n);
      if (r < n - 1) nb.push(c + n);
      if (col > 0) nb.push(c - 1);
      if (col < n - 1) nb.push(c + 1);
      for (const x of nb) if (grid[x] === owner && !seen.has(x)) { seen.add(x); stack.push(x); }
    }
    return false;
  }

  // Could `owner` still connect if they claimed all the open cells they need?
  // (BFS treating their own tiles AND open cells as passable.)
  function canConnect(owner) {
    const n = size, seen = new Set(), stack = [];
    const passable = (i) => grid[i] === owner || grid[i] === 0;
    for (let i = 0; i < n; i++) { const cell = owner === 1 ? i * n : i; if (passable(cell)) { seen.add(cell); stack.push(cell); } }
    while (stack.length) {
      const c = stack.pop(), r = Math.floor(c / n), col = c % n;
      if (owner === 1 && col === n - 1) return true;
      if (owner === 2 && r === n - 1) return true;
      const nb = [];
      if (r > 0) nb.push(c - n); if (r < n - 1) nb.push(c + n);
      if (col > 0) nb.push(c - 1); if (col < n - 1) nb.push(c + 1);
      for (const x of nb) if (passable(x) && !seen.has(x)) { seen.add(x); stack.push(x); }
    }
    return false;
  }

  // The actual chain of the winner's tiles that bridges their two edges.
  function winningPath(owner) {
    const n = size, prev = new Map(), q = [];
    for (let i = 0; i < n; i++) { const cell = owner === 1 ? i * n : i; if (grid[cell] === owner) { prev.set(cell, -1); q.push(cell); } }
    let end = -1;
    for (let h = 0; h < q.length && end < 0; h++) {
      const c = q[h], r = Math.floor(c / n), col = c % n;
      if ((owner === 1 && col === n - 1) || (owner === 2 && r === n - 1)) { end = c; break; }
      const nb = [];
      if (r > 0) nb.push(c - n); if (r < n - 1) nb.push(c + n);
      if (col > 0) nb.push(c - 1); if (col < n - 1) nb.push(c + 1);
      for (const x of nb) if (grid[x] === owner && !prev.has(x)) { prev.set(x, c); q.push(x); }
    }
    const path = [];
    for (let c = end; c >= 0; c = prev.get(c)) path.push(c);
    return path;
  }

  function counts() { let a = 0, b = 0; grid.forEach((v) => { if (v === 1) a++; else if (v === 2) b++; }); return [a, b]; }

  function win(owner) {
    over = true; paint();
    const board = panel.querySelector("#gcBoard");
    if (board) winningPath(owner).forEach((i) => board.children[i] && board.children[i].classList.add("win"));
    fx(sound.fanfare);
    setTimeout(() => renderDone(`${TEAM[owner].name} connects ${TEAM[owner].goal} — wins!`), 1500);
  }
  function decideFull() {
    over = true;
    const [a, b] = counts();
    const msg = a === b ? "Grid full — it's a tie!" : `Grid full — ${a > b ? "Team 1" : "Team 2"} wins on tiles!`;
    renderDone(msg);
  }

  function renderDone(msg) {
    const [a, b] = counts();
    panel.innerHTML = "";
    const card = el("div", "gridclaim-lobby");
    card.appendChild(el("h2", "dojo-title", "Game over"));
    card.appendChild(el("p", "dojo-res-name", msg));
    card.appendChild(el("p", "dojo-lede", `Tiles claimed — Team 1: ${a} · Team 2: ${b}`));
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "Play again"); again.addEventListener("click", () => start());
    const back = el("button", "btn ghost", "Change set"); back.addEventListener("click", () => renderLobby());
    row.append(again, back);
    card.appendChild(row);
    panel.appendChild(card);
  }

  renderLobby();
}
