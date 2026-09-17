// pirates.js — Maths Pirates: the classic classroom pirate coordinates game.
// Two ways to play:
//  • Team board (main): one shared grid on the whiteboard. Teams take turns
//    choosing a square to reveal gold or a power-up. Gold sits "unbanked" (at
//    risk) until a Bank square makes it safe. Steal, Sink, Bomb, Swap, Gift,
//    Shield, Mirror and more make it strategic. Live scores; highest total wins.
//  • Printable maps + caller: print a unique treasure map per pirate, then call
//    coordinates from the board (random or click) for everyone to check.
// Zero deps. All original code; no assets from any other game are used.
import { el, shuffle } from "./quizkit.js?v=20260915u";
import { getState, save } from "./storage.js?v=20260915u";
import * as sound from "./sound.js?v=20260915u";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const colLetter = (i) => String.fromCharCode(65 + i);

/* ---------- Team board: gold amounts + power-ups (the original game) ---------- */
const POW = {
  x2:     { code: "×2",   name: "Double your unbanked gold", cls: "double" },
  bank:   { code: "BANK", name: "Bank your gold — safe from attacks", cls: "bank" },
  steal:  { code: "STEAL",name: "Steal another team's unbanked gold", cls: "steal" },
  sink:   { code: "SINK", name: "Sink a team — their unbanked gold goes to 0", cls: "shark" },
  bomb:   { code: "BOMB", name: "Bomb a team for 2000 — can't be blocked", cls: "cannon" },
  swap:   { code: "SWAP", name: "Swap total scores with a team", cls: "swap" },
  gift:   { code: "GIFT", name: "Give 1000 gold to any team", cls: "chest" },
  shield: { code: "SHIELD", name: "Hold a shield — blocks the next attack on you", cls: "shield" },
  mirror: { code: "MIRROR", name: "Hold a mirror — reflects the next attack back", cls: "swap" },
  mystic: { code: "MYSTIC", name: "Mystic ball — a peek at fate", cls: "diamond" },
  quiz:   { code: "?",    name: "Answer a question to steal gold", cls: "double" },
  again:  { code: "AGAIN",name: "Choose another square — go again", cls: "gold" },
};
// Rough counts for a 7×7 board (scaled for other sizes); the rest is gold.
const SPECIALS = { x2: 2, bank: 3, steal: 2, sink: 1, bomb: 1, swap: 1, gift: 1, shield: 1, mirror: 1, mystic: 1, quiz: 1, again: 1 };
const GOLD_W = [[200, 16], [1000, 12], [3000, 4], [5000, 1]];
const GW = GOLD_W.reduce((s, g) => s + g[1], 0);
function goldValue() { let r = rint(GW); for (const [v, w] of GOLD_W) { if (r < w) return v; r -= w; } return 200; }
function buildBoard(size) {
  const total = size * size, scale = total / 49, cells = [];
  for (const k in SPECIALS) { const n = Math.max(1, Math.round(SPECIALS[k] * scale)); for (let i = 0; i < n; i++) cells.push({ kind: k }); }
  while (cells.length < total) cells.push({ kind: "gold", value: goldValue() });
  return shuffle(cells).slice(0, total);
}

/* ---------- Printable per-student maps (kept from the map version) ---------- */
const MAP_ITEMS = {
  gold:    { code: "+1",  name: "Gold coin — +1 point", cls: "gold" },
  chest:   { code: "+5",  name: "Treasure chest — +5 points", cls: "chest" },
  diamond: { code: "+10", name: "Diamond — +10 points", cls: "diamond" },
  double:  { code: "×2",  name: "Double — double your score", cls: "double" },
  steal:   { code: "ST",  name: "Steal — take 3 points from another player", cls: "steal" },
  swap:    { code: "SW",  name: "Swap — swap scores with someone", cls: "swap" },
  shield:  { code: "SH",  name: "Shield — blocks the next steal or attack", cls: "shield" },
  cannon:  { code: "−3",  name: "Cannonball — lose 3 points", cls: "cannon" },
  shark:   { code: "−10", name: "Shark — lose 10 points", cls: "shark" },
  plank:   { code: "WP",  name: "Walk the plank — score back to zero", cls: "plank" },
};
const MAP_W = [["gold", 30], ["chest", 12], ["diamond", 5], ["double", 8], ["steal", 8], ["swap", 4], ["shield", 5], ["cannon", 12], ["shark", 5], ["plank", 3]];
const MWSUM = MAP_W.reduce((s, w) => s + w[1], 0);
function mapItem() { let r = rint(MWSUM); for (const [k, w] of MAP_W) { if (r < w) return k; r -= w; } return "gold"; }
function buildMap(size) {
  const total = size * size, items = Math.round(total * 0.55), cells = [];
  for (let i = 0; i < items; i++) cells.push(mapItem());
  while (cells.length < total) cells.push(null);
  return shuffle(cells);
}

export function initPirates(root) {
  const panel = root.querySelector(".pirates-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.pirates) s.pirates = { size: 7, printCount: 12, teamCount: 4, names: [] }; if (!Array.isArray(s.pirates.names)) s.pirates.names = []; return s.pirates; };
  const teamName = (i) => { const n = cfg().names; return (n[i] && n[i].trim()) ? n[i].trim() : "Team " + (i + 1); };

  let g = null; // team-game state
  let size = 7, called = new Set(), lastCall = "";

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "pirates-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Pirate coordinates"));
    card.appendChild(el("h2", "dojo-title", "Maths Pirates"));
    card.appendChild(el("p", "dojo-lede", "Play the pirate game on the board: teams take turns choosing squares for gold and power-ups — bank it before it's stolen! Or print a treasure map for every pirate and call the coordinates."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    // Teams for the board game.
    const nRow = el("div", "dojo-field dojo-field-inline");
    nRow.appendChild(el("label", "dojo-lbl", "Teams"));
    const nSel = el("select", "dojo-select dojo-select-sm");
    [2, 3, 4, 5, 6].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === (cfg().teamCount || 4)) o.selected = true; nSel.appendChild(o); });
    nSel.addEventListener("change", () => { cfg().teamCount = +nSel.value; save(); renderLobby(); });
    nRow.appendChild(nSel);
    card.appendChild(nRow);

    const namesRow = el("div", "dojo-field");
    namesRow.appendChild(el("label", "dojo-lbl", "Team names (optional)"));
    const grid = el("div", "pirates-names");
    for (let i = 0; i < (cfg().teamCount || 4); i++) {
      const inp = el("input", "dojo-input pirates-nameinput"); inp.placeholder = "Team " + (i + 1); inp.maxLength = 20;
      inp.value = cfg().names[i] || "";
      inp.addEventListener("input", () => { cfg().names[i] = inp.value; save(); });
      grid.appendChild(inp);
    }
    namesRow.appendChild(grid);
    card.appendChild(namesRow);

    const sizeRow = el("div", "dojo-field dojo-field-inline");
    sizeRow.appendChild(el("label", "dojo-lbl", "Grid size"));
    const sizeSel = el("select", "dojo-select dojo-select-sm");
    [[6, "6 × 6"], [7, "7 × 7"], [8, "8 × 8"]].forEach(([n, t]) => { const o = el("option"); o.value = n; o.textContent = t; if (n === (cfg().size || 7)) o.selected = true; sizeSel.appendChild(o); });
    sizeSel.addEventListener("change", () => { cfg().size = +sizeSel.value; save(); });
    sizeRow.appendChild(sizeSel);
    card.appendChild(sizeRow);

    const btns = el("div", "dojo-editbtns");
    const play = el("button", "btn primary dojo-begin", "Play on the board");
    play.addEventListener("click", () => { cfg().teamCount = +nSel.value; cfg().size = +sizeSel.value; save(); startGame(); });
    const printBtn = el("button", "btn ghost", "Print maps");
    printBtn.addEventListener("click", () => { cfg().size = +sizeSel.value; save(); renderPrint(); });
    const callBtn = el("button", "btn ghost", "Coordinate caller");
    callBtn.addEventListener("click", () => { cfg().size = +sizeSel.value; save(); startCaller(); });
    btns.append(play, printBtn, callBtn);
    card.appendChild(btns);
    card.appendChild(powLegend());
    panel.appendChild(card);
  }

  function powLegend() {
    const box = el("div", "pirates-legend");
    box.appendChild(el("p", "pirates-legend-title", "Squares & power-ups"));
    const grid = el("div", "pirates-legend-grid");
    grid.appendChild(legItem("gold", "GOLD", "200 / 1000 / 3000 / 5000 gold — added to your unbanked pot"));
    Object.values(POW).forEach((it) => grid.appendChild(legItem(it.cls, it.code, it.name)));
    box.appendChild(grid);
    return box;
  }
  function legItem(cls, code, name) {
    const row = el("div", "pirates-legend-item");
    row.appendChild(el("span", "pirates-code " + cls, code));
    row.appendChild(el("span", "pirates-legend-name", name));
    return row;
  }

  /* ================= TEAM BOARD GAME ================= */
  function startGame() {
    const n = cfg().teamCount || 4;
    size = cfg().size || 7;
    g = {
      teams: Array.from({ length: n }, (_, i) => ({ name: teamName(i), banked: 0, unbanked: 0, shield: false, mirror: false })),
      turn: 0, board: buildBoard(size), used: new Set(), phase: "pick", pending: null,
      status: "Team 1, choose a square.", busy: false,
    };
    renderGame();
  }

  const cur = () => g.teams[g.turn];
  const total = (t) => t.banked + t.unbanked;

  function renderGame() {
    panel.innerHTML = "";
    const wrap = el("div", "pirates-game");
    wrap.appendChild(el("div", "dojo-toprow", `
      <span class="dojo-set">Maths Pirates</span>
      <span class="dojo-topbtns">
        <button class="icon-btn dojo-icobtn" id="piMute" title="Toggle sound" aria-label="Toggle sound"></button>
        <button class="btn ghost" id="piFinish">Finish</button>
      </span>`));
    // scoreboard
    const sb = el("div", "pirates-teams");
    g.teams.forEach((t, i) => {
      const chip = el("div", "pirates-team" + (i === g.turn && g.phase !== "over" ? " on" : ""));
      chip.innerHTML = `<span class="pirates-tname">${t.name}${t.shield ? ' <span class="pirates-badge sh">shield</span>' : ""}${t.mirror ? ' <span class="pirates-badge mi">mirror</span>' : ""}</span>
        <span class="pirates-ttotal">${total(t)}</span>
        <span class="pirates-tsplit">banked ${t.banked} · at risk ${t.unbanked}</span>`;
      sb.appendChild(chip);
    });
    wrap.appendChild(sb);
    // status + action area
    wrap.appendChild(el("p", "pirates-status", g.status));
    const action = el("div", "pirates-action", "");
    wrap.appendChild(action);
    // board
    const board = el("div", "pirates-board");
    board.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    board.appendChild(el("div", "pirates-corner"));
    for (let c = 0; c < size; c++) board.appendChild(el("div", "pirates-head", colLetter(c)));
    for (let r = 0; r < size; r++) {
      board.appendChild(el("div", "pirates-head", String(r + 1)));
      for (let c = 0; c < size; c++) {
        const idx = r * size + c, cell = g.board[idx], usedUp = g.used.has(idx);
        const isGold = cell.kind === "gold";
        const label = isGold ? String(cell.value) : POW[cell.kind].code;
        const clsExtra = isGold ? "gold" : POW[cell.kind].cls;
        const b = el("button", "pirates-gcell " + clsExtra + (usedUp ? " used" : ""), label);
        b.title = colLetter(c) + (r + 1);
        if (!usedUp && g.phase === "pick") b.addEventListener("click", () => choose(idx));
        else b.disabled = true;
        board.appendChild(b);
      }
    }
    wrap.appendChild(board);
    // controls
    const ctrls = el("div", "dojo-editbtns pirates-gctrls");
    const rnd = el("button", "btn ghost", "Pick a random square");
    rnd.disabled = g.phase !== "pick";
    rnd.addEventListener("click", pickRandomCell);
    ctrls.appendChild(rnd);
    wrap.appendChild(ctrls);
    panel.appendChild(wrap);

    updateMute();
    panel.querySelector("#piMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#piFinish").addEventListener("click", renderDone);
    if (g.phase === "target") renderTargets(action);
    else if (g.phase === "quiz") renderQuiz(action);
  }
  function updateMute() { const b = panel.querySelector("#piMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function pickRandomCell() {
    if (g.phase !== "pick") return;
    const free = g.board.map((_, i) => i).filter((i) => !g.used.has(i));
    if (!free.length) return;
    choose(free[rint(free.length)]);
  }

  function choose(idx) {
    if (g.phase !== "pick" || g.used.has(idx)) return;
    g.used.add(idx);
    const cell = g.board[idx], t = cur();
    fx(sound.tick);
    if (cell.kind === "gold") { t.unbanked += cell.value; g.status = `${t.name} found ${cell.value} gold!`; fx(sound.beep); return finishTurn(false); }
    switch (cell.kind) {
      case "x2": t.unbanked *= 2; g.status = `×2! ${t.name}'s unbanked gold is now ${t.unbanked}.`; fx(sound.fanfare); return finishTurn(false);
      case "bank": { const a = t.unbanked; t.banked += a; t.unbanked = 0; g.status = `${t.name} banked ${a} gold — safe now.`; fx(sound.fanfare); return finishTurn(false); }
      case "shield": t.shield = true; g.status = `${t.name} takes a Shield.`; return finishTurn(false);
      case "mirror": t.mirror = true; g.status = `${t.name} takes a Mirror.`; return finishTurn(false);
      case "again": g.status = `${t.name} may choose again!`; return finishTurn(true);
      case "mystic": g.status = `${t.name} peers into the Mystic Ball… the treasure awaits.`; return finishTurn(false);
      case "gift": startTarget("gift"); break;
      case "steal": startTarget("steal"); break;
      case "sink": startTarget("sink"); break;
      case "bomb": startTarget("bomb"); break;
      case "swap": startTarget("swap"); break;
      case "quiz": startQuiz(); break;
    }
    renderGame();
  }

  const VERB = { gift: "give 1000 gold to", steal: "steal from", sink: "sink", bomb: "bomb", swap: "swap scores with" };
  function startTarget(action) {
    g.phase = "target"; g.pending = { action };
    g.status = `${cur().name}: choose a team to ${VERB[action]}.`;
    // auto-resolve if only one valid target
    const targets = validTargets(action);
    if (targets.length === 1) return resolveTarget(action, targets[0]);
  }
  function validTargets(action) {
    return g.teams.map((_, i) => i).filter((i) => action === "gift" ? true : i !== g.turn);
  }
  function renderTargets(action) {
    const box = action; box.innerHTML = "";
    box.appendChild(el("span", "pirates-awardlbl", g.status));
    validTargets(g.pending.action).forEach((i) => {
      const b = el("button", "btn pirates-target", g.teams[i].name);
      b.addEventListener("click", () => resolveTarget(g.pending.action, i));
      box.appendChild(b);
    });
  }

  function resolveTarget(action, ti) {
    const a = cur(), t = g.teams[ti];
    if (action === "gift") { t.unbanked += 1000; g.status = `${a.name} gives ${t.name} 1000 gold.`; fx(sound.beep); }
    else if (action === "swap") {
      const ab = a.banked, au = a.unbanked; a.banked = t.banked; a.unbanked = t.unbanked; t.banked = ab; t.unbanked = au;
      g.status = `${a.name} swaps scores with ${t.name}!`; fx(sound.swoosh || sound.beep);
    } else if (action === "bomb") {
      let loss = 2000; const u = Math.min(t.unbanked, loss); t.unbanked -= u; loss -= u; const bk = Math.min(t.banked, loss); t.banked -= bk;
      g.status = `BOMB! ${t.name} loses 2000 gold — nothing can block it.`; fx(sound.buzz);
    } else if (action === "steal") {
      if (t.mirror) { t.mirror = false; const amt = a.unbanked; t.unbanked += amt; a.unbanked = 0; g.status = `${t.name}'s Mirror reflects it — ${a.name} loses ${amt} gold to ${t.name}!`; fx(sound.buzz); }
      else if (t.shield) { t.shield = false; g.status = `${t.name}'s Shield blocks the steal!`; fx(sound.buzz); }
      else { const amt = t.unbanked; a.unbanked += amt; t.unbanked = 0; g.status = `${a.name} steals ${amt} gold from ${t.name}!`; fx(sound.fanfare); }
    } else if (action === "sink") {
      if (t.mirror) { t.mirror = false; a.unbanked = 0; g.status = `${t.name}'s Mirror reflects it — ${a.name} is sunk instead!`; fx(sound.buzz); }
      else if (t.shield) { t.shield = false; g.status = `${t.name}'s Shield blocks the sinking!`; fx(sound.buzz); }
      else { t.unbanked = 0; g.status = `${a.name} sinks ${t.name} — their unbanked gold is gone!`; fx(sound.buzz); }
    }
    g.phase = "pick"; g.pending = null;
    finishTurn(false);
  }

  /* answer a question to steal */
  function genSum() {
    const op = ["+", "−", "×"][rint(3)]; let x, y, ans;
    if (op === "+") { x = 10 + rint(90); y = 10 + rint(90); ans = x + y; }
    else if (op === "−") { x = 20 + rint(80); y = 1 + rint(x - 1); ans = x - y; }
    else { x = 2 + rint(11); y = 2 + rint(11); ans = x * y; }
    const opts = new Set([ans]); while (opts.size < 4) { const d = ans + (rint(11) - 5); if (d >= 0 && d !== ans) opts.add(d); }
    return { q: `${x} ${op} ${y}`, ans, options: shuffle([...opts]) };
  }
  function startQuiz() { g.phase = "quiz"; g.pending = { q: genSum() }; g.status = `${cur().name}: answer to earn a steal!`; }
  function renderQuiz(action) {
    const box = action; box.innerHTML = "";
    box.appendChild(el("span", "pirates-awardlbl", `${cur().name}: ${g.pending.q.q} = ?`));
    g.pending.q.options.forEach((opt) => {
      const b = el("button", "btn pirates-qopt", String(opt));
      b.addEventListener("click", () => {
        if (opt === g.pending.q.ans) { fx(sound.beep); g.phase = "pick"; startTarget("steal"); if (g.phase === "target") renderGame(); }
        else { fx(sound.buzz); g.status = `${cur().name} got it wrong — no steal.`; g.phase = "pick"; g.pending = null; finishTurn(false); }
      });
      box.appendChild(b);
    });
  }

  function finishTurn(goAgain) {
    if (g.used.size >= g.board.length) return renderDone();
    if (!goAgain) g.turn = (g.turn + 1) % g.teams.length;
    if (g.phase !== "target" && g.phase !== "quiz") {
      g.phase = "pick";
      g.status += `  ${cur().name}, choose a square.`;
    }
    renderGame();
  }

  function renderDone() {
    panel.innerHTML = "";
    const card = el("div", "pirates-lobby");
    card.appendChild(el("h2", "dojo-title", "X marks the spot!"));
    const ranked = g.teams.slice().sort((a, b) => total(b) - total(a));
    const top = total(ranked[0]);
    const winners = ranked.filter((t) => total(t) === top).map((t) => t.name);
    card.appendChild(el("p", "dojo-res-name", winners.length > 1 ? winners.join(" & ") + " tie!" : winners[0] + " wins the treasure!"));
    const table = el("table", "dojo-lbtable");
    table.innerHTML = "<thead><tr><th>#</th><th class='l'>Team</th><th>Gold</th></tr></thead>";
    const tb = el("tbody");
    ranked.forEach((t, i) => tb.appendChild(el("tr", i === 0 ? "top" : "", `<td>${i + 1}</td><td class='l'>${t.name}</td><td class='dojo-pts'>${total(t)}</td>`)));
    table.appendChild(tb); card.appendChild(table);
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "New game"); again.addEventListener("click", () => startGame());
    const back = el("button", "btn ghost", "Change teams / print"); back.addEventListener("click", () => renderLobby());
    row.append(again, back); card.appendChild(row);
    panel.appendChild(card);
    fx(sound.fanfare);
  }

  /* ================= COORDINATE CALLER (for printed maps) ================= */
  function startCaller() {
    size = cfg().size || 7; called = new Set(); lastCall = "";
    panel.innerHTML = "";
    panel.appendChild(el("div", "pirates-game", `
      <div class="dojo-toprow">
        <span class="dojo-set">Coordinate caller</span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="piMute2" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="piBack">Back</button>
        </span>
      </div>
      <div class="pirates-callbar">
        <button class="btn primary pirates-pick" id="piPick">Pick a random square</button>
        <span class="pirates-call" id="piCall" aria-live="polite"></span>
      </div>
      <div class="pirates-board" id="piBoard"></div>
      <p class="pirates-calledlbl">Called: <span id="piCalledN">0</span></p>
      <div class="pirates-called" id="piCalled"></div>`));
    const b = panel.querySelector("#piMute2"); b.textContent = soundOn ? "♪" : "✕";
    b.addEventListener("click", () => { soundOn = !soundOn; b.textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#piBack").addEventListener("click", () => renderLobby());
    panel.querySelector("#piPick").addEventListener("click", callRandom);
    const board = panel.querySelector("#piBoard");
    board.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    board.appendChild(el("div", "pirates-corner"));
    for (let c = 0; c < size; c++) board.appendChild(el("div", "pirates-head", colLetter(c)));
    for (let r = 0; r < size; r++) {
      board.appendChild(el("div", "pirates-head", String(r + 1)));
      for (let c = 0; c < size; c++) {
        const coord = colLetter(c) + (r + 1);
        const cell = el("button", "pirates-cell"); cell.dataset.coord = coord; cell.title = coord;
        cell.addEventListener("click", () => callCoord(coord));
        board.appendChild(cell);
      }
    }
  }
  const coordCell = (coord) => panel.querySelector(`.pirates-cell[data-coord="${coord}"]`);
  function allCoords() { const out = []; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) out.push(colLetter(c) + (r + 1)); return out; }
  function callCoord(coord) {
    if (called.has(coord)) return;
    called.add(coord); lastCall = coord;
    const cell = coordCell(coord); if (cell) { cell.classList.add("called"); cell.disabled = true; }
    const callEl = panel.querySelector("#piCall"); callEl.textContent = coord;
    callEl.style.animation = "none"; void callEl.offsetWidth; callEl.style.animation = "";
    panel.querySelector("#piCalledN").textContent = called.size;
    panel.querySelector("#piCalled").appendChild(el("span", "pirates-chip", coord));
    fx(sound.fanfare);
  }
  function callRandom() {
    const free = allCoords().filter((c) => !called.has(c));
    if (!free.length) { panel.querySelector("#piCall").textContent = "All squares called!"; return; }
    const btn = panel.querySelector("#piPick"); btn.disabled = true;
    let n = 0, last = null;
    const spin = setInterval(() => {
      if (last) last.classList.remove("flash");
      last = coordCell(free[rint(free.length)]); if (last) last.classList.add("flash");
      fx(sound.tick);
      if (++n >= 12) { clearInterval(spin); if (last) last.classList.remove("flash"); btn.disabled = false; callCoord(free[rint(free.length)]); }
    }, 70);
  }

  /* ================= PRINTABLE STUDENT MAPS ================= */
  function renderPrint() {
    size = cfg().size || 7;
    const count = Math.min(40, Math.max(1, cfg().printCount || 12));
    panel.innerHTML = "";
    const bar = el("div", "dojo-editbtns pirates-noprint pirates-print-bar");
    const back = el("button", "btn ghost", "← Back"); back.addEventListener("click", () => renderLobby());
    const cntWrap = el("label", "pirates-count-ctrl", "Maps ");
    const cntSel = el("select", "dojo-select dojo-select-sm");
    [8, 12, 16, 20, 24, 30].forEach((v) => { const o = el("option"); o.value = v; o.textContent = v; if (v === count) o.selected = true; cntSel.appendChild(o); });
    cntSel.addEventListener("change", () => { cfg().printCount = +cntSel.value; save(); renderPrint(); });
    cntWrap.appendChild(cntSel);
    const again = el("button", "btn ghost", "Shuffle maps"); again.addEventListener("click", () => renderPrint());
    const print = el("button", "btn primary", "Print these"); print.addEventListener("click", () => window.print());
    bar.append(back, cntWrap, again, print);
    panel.appendChild(bar);
    panel.appendChild(el("p", "dojo-hint pirates-noprint", `${count} unique treasure maps (${size} × ${size}). Use your browser's print dialog — each pirate gets a different arrangement.`));
    const wrap = el("div", "pirates-print");
    for (let m = 0; m < count; m++) wrap.appendChild(printMap());
    panel.appendChild(wrap);
  }
  function printMap() {
    const cardEl = el("div", "pirates-printcard");
    cardEl.appendChild(el("p", "pirates-printtitle", "TREASURE MAP"));
    cardEl.appendChild(el("p", "pirates-printset", "Name: ________________"));
    const map = buildMap(size);
    const grid = el("div", "pirates-printgrid");
    grid.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    grid.appendChild(el("div", "pirates-pcorner"));
    for (let c = 0; c < size; c++) grid.appendChild(el("div", "pirates-phead", colLetter(c)));
    for (let r = 0; r < size; r++) {
      grid.appendChild(el("div", "pirates-phead", String(r + 1)));
      for (let c = 0; c < size; c++) {
        const it = map[r * size + c];
        grid.appendChild(el("div", "pirates-pcell" + (it ? " " + MAP_ITEMS[it].cls : ""), it ? MAP_ITEMS[it].code : ""));
      }
    }
    cardEl.appendChild(grid);
    const leg = el("div", "pirates-plegend");
    Object.values(MAP_ITEMS).forEach((it) => leg.appendChild(el("span", "pirates-plegitem", `<b class="${it.cls}">${it.code}</b> ${it.name}`)));
    cardEl.appendChild(leg);
    return cardEl;
  }

  renderLobby();
}
