// pirates.js — Maths Pirates: the classroom pirate coordinates game.
//  • Team board: a shared grid, teams take turns for gold and power-ups, with
//    banking, steal/sink/bomb/swap and shield/mirror. Live scores.
//  • Print & play: print a unique treasure map per pirate (gold values + power-up
//    icons, a "hands up" marker where you pick a target, tick boxes for held
//    tokens and boxes for running/banked gold). The board is a coordinate caller
//    plus two live tools: a Wheel of Names for the random bomb target, and a
//    5-category wheel + question generator for "answer a question to steal".
// Zero deps beyond the shared Wheel. All original code.
import { el, shuffle } from "./quizkit.js?v=20260916l";
import { getState, save } from "./storage.js?v=20260916l";
import { Wheel, parseEntries } from "./wheel.js?v=20260916l";
import { SUPPORT } from "./support.js?v=20260916l";
import * as sound from "./sound.js?v=20260916l";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const colLetter = (i) => String.fromCharCode(65 + i);

/* ---------- SVG icons for the power-ups (no emoji; print-friendly) ---------- */
const IC = {
  steal:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12V6a1.4 1.4 0 0 1 2.8 0v5M9.8 11V4.6a1.4 1.4 0 0 1 2.8 0V11M12.6 11V5.4a1.4 1.4 0 0 1 2.8 0V12m0-1a1.4 1.4 0 0 1 2.8 0v3.5A5.5 5.5 0 0 1 12.7 20H11a4 4 0 0 1-3.3-1.8L5 14a1.5 1.5 0 0 1 2.5-1.6L9 14"/></svg>',
  skull:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a7 7 0 0 0-7 7v3l-1 2v1a1 1 0 0 0 1 1h1.5V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2H19a1 1 0 0 0 1-1v-1l-1-2v-3a7 7 0 0 0-7-7Z"/><circle cx="9" cy="11" r="1.4" fill="currentColor"/><circle cx="15" cy="11" r="1.4" fill="currentColor"/></svg>',
  gift:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="1"/><path d="M3 10h18v3H3zM12 10v10M12 10c-2.2 0-4-.9-4-2.6A2 2 0 0 1 12 7a2 2 0 0 1 4-1.6C16 9 14.2 10 12 10Z"/></svg>',
  quiz:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.3 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.2-2.7 4"/><circle cx="12" cy="17.2" r="1" fill="currentColor"/></svg>',
  swap:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h13l-3.5-3.5M19 15H6l3.5 3.5"/></svg>',
  choose: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  ball:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="6.5"/><path d="M7 20h10M9 20l1-3M15 20l-1-3M9.6 8A2.5 2.5 0 0 1 12 6.2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6l7-3Z"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v5M9 21h6"/></svg>',
  bomb:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="14" r="7"/><path d="M16 9l2.5-2.5M18.5 6.5h2M18.5 6.5v-2"/></svg>',
  bank:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 12h2.4"/></svg>',
  hand:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12V4.6a1.3 1.3 0 0 1 2.6 0V11m0-1V3.6a1.3 1.3 0 0 1 2.6 0V11m0-.6a1.3 1.3 0 0 1 2.6 0V15a5 5 0 0 1-10 0v-2"/></svg>',
};

// The power-up squares (gold squares are handled separately by value). `hands`
// marks the ones where the pirate raises a hand to pick a target in class.
const POW = {
  x2:     { code: "×2",   name: "Double your unbanked gold", cls: "double", hands: false, icon: null },
  bank:   { code: "BANK", name: "Bank your gold — safe from attacks", cls: "bank", hands: false, icon: IC.bank },
  steal:  { code: "STEAL",name: "Steal someone's unbanked gold", cls: "steal", hands: true, icon: IC.steal },
  sink:   { code: "SINK", name: "Sink someone — their unbanked gold goes to 0", cls: "shark", hands: true, icon: IC.skull },
  bomb:   { code: "BOMB", name: "Bomb — a random pirate loses 2000, can't be blocked", cls: "cannon", hands: false, icon: IC.bomb },
  swap:   { code: "SWAP", name: "Swap total scores with someone", cls: "swap", hands: true, icon: IC.swap },
  gift:   { code: "GIFT", name: "Give 1000 gold to someone", cls: "chest", hands: true, icon: IC.gift },
  quiz:   { code: "?",    name: "Answer a question to steal gold", cls: "double", hands: true, icon: IC.quiz },
  choose: { code: "PICK", name: "Choose the next square", cls: "gold", hands: false, icon: IC.choose },
  shield: { code: "SHIELD", name: "Shield — blocks the next attack on you", cls: "shield", hands: false, icon: IC.shield },
  mirror: { code: "MIRROR", name: "Mirror — reflects the next attack back", cls: "swap", hands: false, icon: IC.mirror },
  mystic: { code: "BALL", name: "Crystal ball — look at someone's score", cls: "diamond", hands: false, icon: IC.ball },
};
// Short labels printed under the icon on the student sheets, so every action
// square is unmistakable — especially the random BOMB and the STEAL? question.
const PLAB = { x2: "×2", bank: "BANK", steal: "STEAL", sink: "SINK", bomb: "BOMB", swap: "SWAP", gift: "GIFT", quiz: "STEAL?", choose: "PICK", shield: "SHIELD", mirror: "MIRROR", mystic: "BALL" };
const SPECIALS = { x2: 2, bank: 3, steal: 2, sink: 1, bomb: 1, swap: 1, gift: 1, quiz: 1, choose: 1, shield: 1, mirror: 1, mystic: 1 };
const GOLD_W = [[200, 16], [1000, 12], [3000, 4], [5000, 1]];
const GW = GOLD_W.reduce((s, g) => s + g[1], 0);
function goldValue() { let r = rint(GW); for (const [v, w] of GOLD_W) { if (r < w) return v; r -= w; } return 200; }
function buildBoard(size) {
  const total = size * size, scale = total / 49, cells = [];
  for (const k in SPECIALS) { const n = Math.max(1, Math.round(SPECIALS[k] * scale)); for (let i = 0; i < n; i++) cells.push({ kind: k }); }
  while (cells.length < total) cells.push({ kind: "gold", value: goldValue() });
  return shuffle(cells).slice(0, total);
}

/* ---------- offline general-knowledge fallback bank ---------- */
const CAT_POOL = ["Sport", "Science", "History", "Geography", "Music", "Film & TV", "Animals", "Space", "Food", "Art", "Nature", "Technology", "Books", "Mythology"];
const BANK = {
  Sport: [["How many players are on a football team on the pitch?", "11"], ["In which sport would you perform a slam dunk?", "Basketball"], ["How many rings are on the Olympic flag?", "Five"], ["What sport is played at Wimbledon?", "Tennis"]],
  Science: [["What gas do plants breathe in?", "Carbon dioxide"], ["What is H2O commonly known as?", "Water"], ["How many legs does an insect have?", "Six"], ["What planet do we live on?", "Earth"]],
  History: [["Who was the first man on the Moon?", "Neil Armstrong"], ["In which country were the pyramids of Giza built?", "Egypt"], ["What was the name of the ship that sank in 1912?", "The Titanic"], ["Who was queen of the UK for over 70 years?", "Elizabeth II"]],
  Geography: [["What is the capital of France?", "Paris"], ["Which is the longest river in the world?", "The Nile"], ["How many continents are there?", "Seven"], ["What is the largest ocean?", "The Pacific"]],
  Entertainment: [["Which wizard studies at Hogwarts?", "Harry Potter"], ["What colour is SpongeBob?", "Yellow"], ["Which toy cowboy is in Toy Story?", "Woody"], ["Who lives in a pineapple under the sea?", "SpongeBob"]],
  Music: [["How many strings does a standard guitar have?", "Six"], ["What instrument has black and white keys?", "Piano"], ["Which band sang 'Hey Jude'?", "The Beatles"], ["What do you call a group singing together?", "A choir"]],
  Animals: [["What is the tallest animal?", "The giraffe"], ["Which animal is known as the king of the jungle?", "The lion"], ["How many legs does a spider have?", "Eight"], ["What is a baby kangaroo called?", "A joey"]],
  Space: [["Which planet is known as the Red Planet?", "Mars"], ["What is the closest star to Earth?", "The Sun"], ["What do we call a person who travels to space?", "An astronaut"], ["Which planet has famous rings?", "Saturn"]],
};

/* ---------- printable per-student map ---------- */
function buildMap(size) {
  const total = size * size, cells = [];
  const per = { x2: 2, bank: 2, steal: 1, sink: 1, bomb: 1, swap: 1, gift: 1, quiz: 1, choose: 1, shield: 1, mirror: 1, mystic: 1 };
  const scale = total / 49;
  for (const k in per) { const n = Math.max(1, Math.round(per[k] * scale)); for (let i = 0; i < n; i++) cells.push({ kind: k }); }
  while (cells.length < total) cells.push({ kind: "gold", value: goldValue() });
  return shuffle(cells).slice(0, total);
}

export function initPirates(root) {
  const panel = root.querySelector(".pirates-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.pirates) s.pirates = {}; const d = s.pirates; if (!Array.isArray(d.names)) d.names = []; if (typeof d.size !== "number") d.size = 7; if (typeof d.printCount !== "number") d.printCount = 12; if (typeof d.teamCount !== "number") d.teamCount = 4; if (typeof d.bombNames !== "string") d.bombNames = ""; if (typeof d.categories !== "string") d.categories = "Sport\nScience\nHistory\nGeography\nEntertainment"; return d; };
  const teamName = (i) => { const n = cfg().names; return (n[i] && n[i].trim()) ? n[i].trim() : "Team " + (i + 1); };

  let g = null, size = 7, called = new Set();

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "pirates-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Pirate coordinates"));
    card.appendChild(el("h2", "dojo-title", "Maths Pirates"));
    card.appendChild(el("p", "dojo-lede", "Play the pirate game on the board, or print a treasure map for every pirate and run it as the class caller — with a wheel for the random bomb and a general-knowledge wheel for the steal question."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const nRow = el("div", "dojo-field dojo-field-inline");
    nRow.appendChild(el("label", "dojo-lbl", "Teams (board game)"));
    const nSel = el("select", "dojo-select dojo-select-sm");
    [2, 3, 4, 5, 6].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === cfg().teamCount) o.selected = true; nSel.appendChild(o); });
    nSel.addEventListener("change", () => { cfg().teamCount = +nSel.value; save(); renderLobby(); });
    nRow.appendChild(nSel);
    card.appendChild(nRow);

    const namesRow = el("div", "dojo-field");
    namesRow.appendChild(el("label", "dojo-lbl", "Team names (optional)"));
    const grid = el("div", "pirates-names");
    for (let i = 0; i < cfg().teamCount; i++) {
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
    [[6, "6 × 6"], [7, "7 × 7"], [8, "8 × 8"]].forEach(([n, t]) => { const o = el("option"); o.value = n; o.textContent = t; if (n === cfg().size) o.selected = true; sizeSel.appendChild(o); });
    sizeSel.addEventListener("change", () => { cfg().size = +sizeSel.value; save(); });
    sizeRow.appendChild(sizeSel);
    card.appendChild(sizeRow);

    const btns = el("div", "dojo-editbtns");
    const play = el("button", "btn primary dojo-begin", "Play on the board");
    play.addEventListener("click", () => { cfg().teamCount = +nSel.value; cfg().size = +sizeSel.value; save(); startGame(); });
    const printBtn = el("button", "btn ghost", "Print maps");
    printBtn.addEventListener("click", () => { cfg().size = +sizeSel.value; save(); renderPrint(); });
    const callBtn = el("button", "btn ghost", "Caller + tools");
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
    const goldRow = el("div", "pirates-legend-item");
    goldRow.appendChild(el("span", "pirates-code gold", "200+"));
    goldRow.appendChild(el("span", "pirates-legend-name", "Gold — 200 / 1000 / 3000 / 5000, added to your unbanked pot"));
    grid.appendChild(goldRow);
    Object.values(POW).forEach((it) => {
      const row = el("div", "pirates-legend-item");
      const ic = el("span", "pirates-ic " + it.cls); ic.innerHTML = it.icon || `<b>${it.code}</b>`;
      row.appendChild(ic);
      row.appendChild(el("span", "pirates-legend-name", it.name + (it.hands ? " (hands up to pick a target)" : "")));
      grid.appendChild(row);
    });
    box.appendChild(grid);
    return box;
  }

  /* ================= TEAM BOARD GAME ================= */
  function startGame() {
    const n = cfg().teamCount || 4; size = cfg().size || 7;
    g = { teams: Array.from({ length: n }, (_, i) => ({ name: teamName(i), banked: 0, unbanked: 0, shield: false, mirror: false })), turn: 0, board: buildBoard(size), used: new Set(), phase: "pick", pending: null, status: "Team 1, choose a square.", busy: false };
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
    const sb = el("div", "pirates-teams");
    g.teams.forEach((t, i) => {
      const chip = el("div", "pirates-team" + (i === g.turn && g.phase !== "over" ? " on" : ""));
      chip.innerHTML = `<span class="pirates-tname">${t.name}${t.shield ? ' <span class="pirates-badge sh">shield</span>' : ""}${t.mirror ? ' <span class="pirates-badge mi">mirror</span>' : ""}</span>
        <span class="pirates-ttotal">${total(t)}</span><span class="pirates-tsplit">banked ${t.banked} · at risk ${t.unbanked}</span>`;
      sb.appendChild(chip);
    });
    wrap.appendChild(sb);
    wrap.appendChild(el("p", "pirates-status", g.status));
    const action = el("div", "pirates-action", ""); wrap.appendChild(action);
    const board = el("div", "pirates-board"); board.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    board.appendChild(el("div", "pirates-corner"));
    for (let c = 0; c < size; c++) board.appendChild(el("div", "pirates-head", colLetter(c)));
    for (let r = 0; r < size; r++) {
      board.appendChild(el("div", "pirates-head", String(r + 1)));
      for (let c = 0; c < size; c++) {
        const idx = r * size + c, cell = g.board[idx], usedUp = g.used.has(idx), isGold = cell.kind === "gold";
        const b = el("button", "pirates-gcell " + (isGold ? "gold" : POW[cell.kind].cls) + (usedUp ? " used" : ""));
        b.innerHTML = isGold ? String(cell.value) : (POW[cell.kind].icon ? `<span class="pirates-ic">${POW[cell.kind].icon}</span>` : POW[cell.kind].code);
        b.title = colLetter(c) + (r + 1);
        if (!usedUp && g.phase === "pick") b.addEventListener("click", () => choose(idx)); else b.disabled = true;
        board.appendChild(b);
      }
    }
    wrap.appendChild(board);
    const ctrls = el("div", "dojo-editbtns pirates-gctrls");
    const rnd = el("button", "btn ghost", "Pick a random square"); rnd.disabled = g.phase !== "pick"; rnd.addEventListener("click", pickRandomCell);
    ctrls.appendChild(rnd); wrap.appendChild(ctrls);
    panel.appendChild(wrap);
    updateMute("#piMute");
    panel.querySelector("#piMute").addEventListener("click", () => { soundOn = !soundOn; updateMute("#piMute"); });
    panel.querySelector("#piFinish").addEventListener("click", renderDone);
    if (g.phase === "target") renderTargets(action);
    else if (g.phase === "quiz") renderQuizStep(action);
  }
  function updateMute(sel) { const b = panel.querySelector(sel); if (b) b.textContent = soundOn ? "♪" : "✕"; }
  function pickRandomCell() { if (g.phase !== "pick") return; const free = g.board.map((_, i) => i).filter((i) => !g.used.has(i)); if (free.length) choose(free[rint(free.length)]); }

  function choose(idx) {
    if (g.phase !== "pick" || g.used.has(idx)) return;
    g.used.add(idx); const cell = g.board[idx], t = cur(); fx(sound.tick);
    if (cell.kind === "gold") { t.unbanked += cell.value; g.status = `${t.name} found ${cell.value} gold!`; fx(sound.beep); return finishTurn(false); }
    switch (cell.kind) {
      case "x2": t.unbanked *= 2; g.status = `×2! ${t.name}'s unbanked gold is now ${t.unbanked}.`; fx(sound.fanfare); return finishTurn(false);
      case "bank": { const a = t.unbanked; t.banked += a; t.unbanked = 0; g.status = `${t.name} banked ${a} gold — safe now.`; fx(sound.fanfare); return finishTurn(false); }
      case "shield": t.shield = true; g.status = `${t.name} takes a Shield.`; return finishTurn(false);
      case "mirror": t.mirror = true; g.status = `${t.name} takes a Mirror.`; return finishTurn(false);
      case "choose": g.status = `${t.name} may choose another square!`; return finishTurn(true);
      case "mystic": g.status = `${t.name} peers into the Crystal Ball… every score is on show.`; return finishTurn(false);
      case "bomb": { const others = g.teams.map((_, i) => i).filter((i) => i !== g.turn); const ti = others[rint(others.length)]; resolveTarget("bomb", ti); return; }
      case "gift": startTarget("gift"); break;
      case "steal": startTarget("steal"); break;
      case "sink": startTarget("sink"); break;
      case "swap": startTarget("swap"); break;
      case "quiz": startQuiz(); break;
    }
    renderGame();
  }
  const VERB = { gift: "give 1000 gold to", steal: "steal from", sink: "sink", swap: "swap scores with" };
  function startTarget(action) { g.phase = "target"; g.pending = { action }; g.status = `${cur().name}: choose a team to ${VERB[action]}.`; const ts = validTargets(action); if (ts.length === 1) return resolveTarget(action, ts[0]); }
  function validTargets(action) { return g.teams.map((_, i) => i).filter((i) => action === "gift" ? true : i !== g.turn); }
  function renderTargets(box) {
    box.innerHTML = ""; box.appendChild(el("span", "pirates-awardlbl", g.status));
    validTargets(g.pending.action).forEach((i) => { const b = el("button", "btn pirates-target", g.teams[i].name); b.addEventListener("click", () => resolveTarget(g.pending.action, i)); box.appendChild(b); });
  }
  function resolveTarget(action, ti) {
    const a = cur(), t = g.teams[ti];
    if (action === "gift") { t.unbanked += 1000; g.status = `${a.name} gives ${t.name} 1000 gold.`; fx(sound.beep); }
    else if (action === "swap") { const ab = a.banked, au = a.unbanked; a.banked = t.banked; a.unbanked = t.unbanked; t.banked = ab; t.unbanked = au; g.status = `${a.name} swaps scores with ${t.name}!`; fx(sound.beep); }
    else if (action === "bomb") { let loss = 2000; const u = Math.min(t.unbanked, loss); t.unbanked -= u; loss -= u; const bk = Math.min(t.banked, loss); t.banked -= bk; g.status = `BOMB! It lands on ${t.name} — 2000 gold gone, nothing can block it.`; fx(sound.buzz); }
    else if (action === "steal") { if (t.mirror) { t.mirror = false; const amt = a.unbanked; t.unbanked += amt; a.unbanked = 0; g.status = `${t.name}'s Mirror reflects it — ${a.name} loses ${amt} to ${t.name}!`; fx(sound.buzz); } else if (t.shield) { t.shield = false; g.status = `${t.name}'s Shield blocks the steal!`; fx(sound.buzz); } else { const amt = t.unbanked; a.unbanked += amt; t.unbanked = 0; g.status = `${a.name} steals ${amt} gold from ${t.name}!`; fx(sound.fanfare); } }
    else if (action === "sink") { if (t.mirror) { t.mirror = false; a.unbanked = 0; g.status = `${t.name}'s Mirror reflects it — ${a.name} is sunk instead!`; fx(sound.buzz); } else if (t.shield) { t.shield = false; g.status = `${t.name}'s Shield blocks the sinking!`; fx(sound.buzz); } else { t.unbanked = 0; g.status = `${a.name} sinks ${t.name}!`; fx(sound.buzz); } }
    g.phase = "pick"; g.pending = null; finishTurn(false);
  }
  function genSum() { const op = ["+", "−", "×"][rint(3)]; let x, y, ans; if (op === "+") { x = 10 + rint(90); y = 10 + rint(90); ans = x + y; } else if (op === "−") { x = 20 + rint(80); y = 1 + rint(x - 1); ans = x - y; } else { x = 2 + rint(11); y = 2 + rint(11); ans = x * y; } const opts = new Set([ans]); while (opts.size < 4) { const d = ans + (rint(11) - 5); if (d >= 0 && d !== ans) opts.add(d); } return { q: `${x} ${op} ${y}`, ans, options: shuffle([...opts]) }; }
  function startQuiz() { g.phase = "quiz"; g.pending = { q: genSum() }; g.status = `${cur().name}: answer to earn a steal!`; }
  function renderQuizStep(box) {
    box.innerHTML = ""; box.appendChild(el("span", "pirates-awardlbl", `${cur().name}: ${g.pending.q.q} = ?`));
    g.pending.q.options.forEach((opt) => { const b = el("button", "btn pirates-qopt", String(opt)); b.addEventListener("click", () => { if (opt === g.pending.q.ans) { fx(sound.beep); g.phase = "pick"; startTarget("steal"); renderGame(); } else { fx(sound.buzz); g.status = `${cur().name} got it wrong — no steal.`; g.phase = "pick"; g.pending = null; finishTurn(false); } }); box.appendChild(b); });
  }
  function finishTurn(goAgain) {
    if (g.used.size >= g.board.length) return renderDone();
    if (!goAgain) g.turn = (g.turn + 1) % g.teams.length;
    if (g.phase !== "target" && g.phase !== "quiz") { g.phase = "pick"; g.status += `  ${cur().name}, choose a square.`; }
    renderGame();
  }
  function renderDone() {
    panel.innerHTML = "";
    const card = el("div", "pirates-lobby");
    card.appendChild(el("h2", "dojo-title", "X marks the spot!"));
    const ranked = g.teams.slice().sort((a, b) => total(b) - total(a)), top = total(ranked[0]);
    const winners = ranked.filter((t) => total(t) === top).map((t) => t.name);
    card.appendChild(el("p", "dojo-res-name", winners.length > 1 ? winners.join(" & ") + " tie!" : winners[0] + " wins the treasure!"));
    const table = el("table", "dojo-lbtable");
    table.innerHTML = "<thead><tr><th>#</th><th class='l'>Team</th><th>Gold</th></tr></thead>";
    const tb = el("tbody"); ranked.forEach((t, i) => tb.appendChild(el("tr", i === 0 ? "top" : "", `<td>${i + 1}</td><td class='l'>${t.name}</td><td class='dojo-pts'>${total(t)}</td>`)));
    table.appendChild(tb); card.appendChild(table);
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "New game"); again.addEventListener("click", () => startGame());
    const back = el("button", "btn ghost", "Change teams / print"); back.addEventListener("click", () => renderLobby());
    row.append(again, back); card.appendChild(row); panel.appendChild(card); fx(sound.fanfare);
  }

  /* ================= CALLER + TOOLS (print & play) ================= */
  function startCaller() { size = cfg().size || 7; called = new Set(); renderCaller(); }
  function renderCaller(last) {
    panel.innerHTML = "";
    panel.appendChild(el("div", "pirates-game", `
      <div class="dojo-toprow">
        <span class="dojo-set">Pirate caller</span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="piMute2" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="piBack">Back</button>
        </span>
      </div>
      <div class="pirates-toolbtns">
        <button class="btn ghost" id="piBomb">Random bomb target</button>
        <button class="btn ghost" id="piQuiz">Question to steal</button>
      </div>
      <div class="pirates-callbar">
        <button class="btn primary pirates-pick" id="piPick">Pick a random square</button>
        <span class="pirates-call" id="piCall" aria-live="polite">${last || ""}</span>
      </div>
      <div class="pirates-board" id="piBoard"></div>
      <p class="pirates-calledlbl">Called: <span id="piCalledN">${called.size}</span></p>
      <div class="pirates-called" id="piCalled"></div>`));
    const mute = panel.querySelector("#piMute2"); mute.textContent = soundOn ? "♪" : "✕";
    mute.addEventListener("click", () => { soundOn = !soundOn; mute.textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#piBack").addEventListener("click", () => renderLobby());
    panel.querySelector("#piBomb").addEventListener("click", renderBombWheel);
    panel.querySelector("#piQuiz").addEventListener("click", renderQuizWheel);
    panel.querySelector("#piPick").addEventListener("click", callRandom);
    const board = panel.querySelector("#piBoard"); board.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    board.appendChild(el("div", "pirates-corner"));
    for (let c = 0; c < size; c++) board.appendChild(el("div", "pirates-head", colLetter(c)));
    for (let r = 0; r < size; r++) {
      board.appendChild(el("div", "pirates-head", String(r + 1)));
      for (let c = 0; c < size; c++) {
        const coord = colLetter(c) + (r + 1);
        const cell = el("button", "pirates-cell" + (called.has(coord) ? " called" : "")); cell.dataset.coord = coord; cell.title = coord; cell.disabled = called.has(coord);
        cell.addEventListener("click", () => callCoord(coord));
        board.appendChild(cell);
      }
    }
    const chips = panel.querySelector("#piCalled"); called.forEach((c) => chips.appendChild(el("span", "pirates-chip", c)));
  }
  const coordCell = (coord) => panel.querySelector(`.pirates-cell[data-coord="${coord}"]`);
  function allCoords() { const out = []; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) out.push(colLetter(c) + (r + 1)); return out; }
  function callCoord(coord) {
    if (called.has(coord)) return; called.add(coord);
    const cell = coordCell(coord); if (cell) { cell.classList.add("called"); cell.disabled = true; }
    const callEl = panel.querySelector("#piCall"); callEl.textContent = coord; callEl.style.animation = "none"; void callEl.offsetWidth; callEl.style.animation = "";
    panel.querySelector("#piCalledN").textContent = called.size;
    panel.querySelector("#piCalled").appendChild(el("span", "pirates-chip", coord)); fx(sound.fanfare);
  }
  function callRandom() {
    const free = allCoords().filter((c) => !called.has(c));
    if (!free.length) { panel.querySelector("#piCall").textContent = "All squares called!"; return; }
    const btn = panel.querySelector("#piPick"); btn.disabled = true; let n = 0, lastCell = null;
    const spin = setInterval(() => {
      if (lastCell) lastCell.classList.remove("flash");
      lastCell = coordCell(free[rint(free.length)]); if (lastCell) lastCell.classList.add("flash"); fx(sound.tick);
      if (++n >= 12) { clearInterval(spin); if (lastCell) lastCell.classList.remove("flash"); btn.disabled = false; callCoord(free[rint(free.length)]); }
    }, 70);
  }

  /* ---------- Random bomb target: embedded Wheel of Names ---------- */
  function renderBombWheel() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "pirates-game", `
      <div class="dojo-toprow"><span class="dojo-set">Random bomb target</span>
        <span class="dojo-topbtns"><button class="btn ghost" id="pwBack">← Caller</button></span></div>
      <p class="dojo-hint">Spin to choose who the unblockable bomb lands on.</p>
      <div class="pirates-wheelwrap"><div class="pirates-wheelinner"><div class="pirates-wpointer" aria-hidden="true"></div><canvas id="pwCanvas" class="pirates-wheelcanvas" width="480" height="480" aria-label="Wheel of names"></canvas></div></div>
      <div class="pirates-callbar"><button class="btn primary" id="pwSpin">Spin</button><span class="pirates-call" id="pwOut" aria-live="polite"></span></div>
      <div class="dojo-field"><label class="dojo-lbl">Names to spin (one per line) — or load a saved wheel</label>
        <div class="pirates-namesrc"><select class="dojo-select dojo-select-sm" id="pwWheelSel"></select></div>
        <textarea id="pwNames" class="entries pirates-namebox" spellcheck="false" placeholder="One name per line…"></textarea></div>`));
    panel.querySelector("#pwBack").addEventListener("click", () => renderCaller());
    const ta = panel.querySelector("#pwNames");
    const firstWheel = (getState().wheels || [])[0];
    ta.value = cfg().bombNames || (cfg().names.filter(Boolean).join("\n")) || (firstWheel ? firstWheel.text : "");
    const sel = panel.querySelector("#pwWheelSel");
    const none = el("option"); none.value = ""; none.textContent = "— load a saved wheel —"; sel.appendChild(none);
    (getState().wheels || []).forEach((w) => { const o = el("option"); o.value = w.id; o.textContent = `${w.name} (${parseEntries(w.text).length})`; sel.appendChild(o); });
    const canvas = panel.querySelector("#pwCanvas");
    const wheel = new Wheel(canvas); wheel.soundOn = soundOn;
    const setNames = () => { wheel.setSegments(parseEntries(ta.value)); };
    setNames();
    ta.addEventListener("input", () => { cfg().bombNames = ta.value; save(); setNames(); });
    sel.addEventListener("change", () => { const w = (getState().wheels || []).find((x) => x.id === sel.value); if (w) { ta.value = w.text; cfg().bombNames = w.text; save(); setNames(); } });
    wheel.onWinner = (label) => { const out = panel.querySelector("#pwOut"); out.textContent = label + " takes the bomb!"; out.style.animation = "none"; void out.offsetWidth; out.style.animation = ""; fx(sound.buzz); };
    panel.querySelector("#pwSpin").addEventListener("click", () => { wheel.soundOn = soundOn; wheel.spin(getState().spinLen || 5); });
  }

  /* ---------- Answer a question to steal: category wheel + generator ---------- */
  let quizCat = "";
  function renderQuizWheel() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "pirates-game", `
      <div class="dojo-toprow"><span class="dojo-set">Question to steal</span>
        <span class="dojo-topbtns"><button class="btn ghost" id="qwBack">← Caller</button></span></div>
      <p class="dojo-hint">Spin for a category, then get a general-knowledge question. Answer it right to steal.</p>
      <div class="pirates-wheelwrap"><div class="pirates-wheelinner"><div class="pirates-wpointer" aria-hidden="true"></div><canvas id="qwCanvas" class="pirates-wheelcanvas" width="480" height="480" aria-label="Category wheel"></canvas></div></div>
      <div class="pirates-callbar"><button class="btn primary" id="qwSpin">Spin the categories</button><span class="pirates-call" id="qwCat" aria-live="polite"></span></div>
      <div class="pirates-qbox" id="qwBox"></div>
      <div class="dojo-field"><label class="dojo-lbl">Categories (one per line)</label>
        <textarea id="qwCats" class="entries pirates-namebox" spellcheck="false"></textarea>
        <div class="dojo-editbtns"><button class="btn ghost" id="qwRandom">Random categories</button></div></div>`));
    panel.querySelector("#qwBack").addEventListener("click", () => renderCaller());
    const ta = panel.querySelector("#qwCats"); ta.value = cfg().categories;
    const canvas = panel.querySelector("#qwCanvas");
    const wheel = new Wheel(canvas); wheel.soundOn = soundOn;
    const setCats = () => wheel.setSegments(parseEntries(ta.value));
    setCats();
    ta.addEventListener("input", () => { cfg().categories = ta.value; save(); setCats(); });
    panel.querySelector("#qwRandom").addEventListener("click", () => { ta.value = shuffle(CAT_POOL).slice(0, 5).join("\n"); cfg().categories = ta.value; save(); setCats(); });
    wheel.onWinner = (label) => {
      quizCat = label; const c = panel.querySelector("#qwCat"); c.textContent = label; c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
      const box = panel.querySelector("#qwBox"); box.innerHTML = "";
      const getBtn = el("button", "btn primary", `Get a ${label} question`); getBtn.addEventListener("click", () => loadQuestion(label, box)); box.appendChild(getBtn);
      fx(sound.beep);
    };
    panel.querySelector("#qwSpin").addEventListener("click", () => { wheel.soundOn = soundOn; wheel.spin(getState().spinLen || 5); });
  }
  async function aiQuestion(cat) {
    if (!SUPPORT.dojoGenerateEndpoint) return null;
    try {
      const headers = { "Content-Type": "application/json" }; if (SUPPORT.dojoGenerateToken) headers["x-dojo-token"] = SUPPORT.dojoGenerateToken;
      const res = await fetch(SUPPORT.dojoGenerateEndpoint, { method: "POST", headers, body: JSON.stringify({ topic: "General knowledge quiz: " + cat, count: 6 }) });
      if (!res.ok) return null; const data = await res.json();
      const qs = (data.questions || []).filter((q) => q && q.q && q.a);
      if (!qs.length) return null; const q = qs[rint(qs.length)]; return { q: String(q.q), a: String(q.a) };
    } catch { return null; }
  }
  function bankQuestion(cat) {
    const key = Object.keys(BANK).find((k) => k.toLowerCase() === cat.trim().toLowerCase());
    const list = BANK[key] || BANK[Object.keys(BANK)[rint(Object.keys(BANK).length)]];
    const [q, a] = list[rint(list.length)]; return { q, a };
  }
  async function loadQuestion(cat, box) {
    box.innerHTML = ""; box.appendChild(el("p", "pirates-status", "Finding a question…"));
    const qa = (await aiQuestion(cat)) || bankQuestion(cat);
    box.innerHTML = "";
    box.appendChild(el("p", "pirates-qcat", cat));
    box.appendChild(el("p", "pirates-qtext", qa.q));
    const ans = el("p", "pirates-qans"); ans.hidden = true; ans.textContent = "Answer: " + qa.a; box.appendChild(ans);
    const row = el("div", "dojo-editbtns");
    const reveal = el("button", "btn primary", "Reveal answer"); reveal.addEventListener("click", () => { ans.hidden = false; reveal.hidden = true; fx(sound.beep); });
    const next = el("button", "btn ghost", "Another question"); next.addEventListener("click", () => loadQuestion(cat, box));
    row.append(reveal, next); box.appendChild(row);
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
    panel.appendChild(el("p", "dojo-hint pirates-noprint", `${count} unique treasure maps (${size} × ${size}). Each pirate gets a different arrangement — print and hand out.`));
    const wrap = el("div", "pirates-print");
    for (let m = 0; m < count; m++) wrap.appendChild(printMap());
    panel.appendChild(wrap);
  }
  function printMap() {
    const cardEl = el("div", "pirates-printcard");
    cardEl.appendChild(el("p", "pirates-printtitle", "TREASURE MAP"));
    cardEl.appendChild(el("p", "pirates-printset", "Name: ________________"));
    const map = buildMap(size);
    const grid = el("div", "pirates-printgrid"); grid.style.gridTemplateColumns = `auto repeat(${size}, minmax(0, 1fr))`;
    grid.appendChild(el("div", "pirates-pcorner"));
    for (let c = 0; c < size; c++) grid.appendChild(el("div", "pirates-phead", colLetter(c)));
    for (let r = 0; r < size; r++) {
      grid.appendChild(el("div", "pirates-phead", String(r + 1)));
      for (let c = 0; c < size; c++) {
        const it = map[r * size + c];
        if (it.kind === "gold") { grid.appendChild(el("div", "pirates-pcell gold", String(it.value))); continue; }
        const p = POW[it.kind];
        const cell = el("div", "pirates-pcell " + p.cls);
        cell.innerHTML = (p.icon ? `<span class="pirates-pic">${p.icon}</span>` : "") + `<span class="pirates-plab">${PLAB[it.kind]}</span>` + (p.hands ? `<span class="pirates-handbadge">${IC.hand}</span>` : "");
        grid.appendChild(cell);
      }
    }
    // Rules run down the right of the grid, so the space below is free for working out.
    const leg = el("div", "pirates-plegend");
    leg.appendChild(el("p", "pirates-plegtitle", "The rules"));
    leg.appendChild(el("span", "pirates-plegitem", `<b class="gold">200+</b> Collect gold`));
    Object.values(POW).forEach((it) => { const s = el("span", "pirates-plegitem"); s.innerHTML = `<span class="pirates-pic ${it.cls}">${it.icon || "<b>" + it.code + "</b>"}</span> ${it.name.split(" —")[0].split(" (")[0]}${it.hands ? ' <span class="pirates-pic pirates-plhand">' + IC.hand + "</span>" : ""}`; leg.appendChild(s); });
    // A Banked box sits under the rules — pirates bank many times, so give them
    // several lines and a running total rather than a single blank.
    const bank = el("div", "pirates-pbank");
    bank.innerHTML = `<p class="pirates-pbanklbl">Banked gold (safe)</p>
      <div class="pirates-pbanklines"></div>
      <p class="pirates-pbanktot">Total banked <span class="pirates-line"></span></p>`;
    const right = el("div", "pirates-pright");
    right.append(leg, bank);
    const top = el("div", "pirates-ptop");
    top.append(grid, right);
    cardEl.appendChild(top);
    // Room for working out the maths — full width, below the grid.
    const work = el("div", "pirates-pwork");
    work.appendChild(el("p", "pirates-pworklbl", "Working out"));
    cardEl.appendChild(work);
    // Held tokens + running gold total for the pirate to fill in.
    const foot = el("div", "pirates-pfoot");
    foot.innerHTML = `
      <div class="pirates-tokens">
        <span class="pirates-tok"><span class="pirates-pic">${IC.shield}</span><span class="pirates-box"></span> Shield</span>
        <span class="pirates-tok"><span class="pirates-pic">${IC.mirror}</span><span class="pirates-box"></span> Mirror</span>
        <span class="pirates-tok"><span class="pirates-pic">${IC.ball}</span><span class="pirates-box"></span> Crystal ball</span>
      </div>
      <div class="pirates-totals">
        <span class="pirates-total">Gold total <span class="pirates-line"></span></span>
      </div>`;
    cardEl.appendChild(foot);
    return cardEl;
  }

  renderLobby();
}
