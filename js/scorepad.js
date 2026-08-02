// scorepad.js — a generic multi-player, multi-round score pad for board games.
// Players are columns, rounds are rows, totals stick to the bottom. Built for
// a phone at the table: a big custom keypad, undo, screen wake-lock, and
// multiple saved games. Everything persists in localStorage.
import { getState, save } from "./storage.js?v=20260801p";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id" + Math.random().toString(36).slice(2));

function newGame(name) {
  return {
    id: uid(),
    name: name || "New game",
    lowWins: false,
    players: [
      { id: uid(), name: "Player 1" },
      { id: uid(), name: "Player 2" },
    ],
    rounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function initScorepad(root, { toast } = {}) {
  const panel = root.querySelector(".scorepad-panel");
  if (!panel) return; // not on this page

  const gameSel = root.querySelector("#spGame");
  const tableWrap = root.querySelector("#spTableWrap");
  const table = root.querySelector("#spTable");
  const lowWins = root.querySelector("#spLowWins");
  const wakeToggle = root.querySelector("#spWake");
  const keypad = root.querySelector("#spKeypad");
  const keypadVal = root.querySelector("#spKeypadValue");
  const keypadWho = root.querySelector("#spKeypadWho");

  const store = () => {
    const s = getState();
    if (!s.scorepad) s.scorepad = { games: [], activeId: null };
    if (!s.scorepad.games.length) {
      const g = newGame("Game 1");
      s.scorepad.games.push(g);
      s.scorepad.activeId = g.id;
    }
    if (!s.scorepad.games.some((g) => g.id === s.scorepad.activeId)) {
      s.scorepad.activeId = s.scorepad.games[0].id;
    }
    return s.scorepad;
  };
  const game = () => store().games.find((g) => g.id === store().activeId);

  // ---- undo ----
  let undoStack = [];
  function snapshot() {
    undoStack.push(JSON.stringify(game()));
    if (undoStack.length > 40) undoStack.shift();
  }
  function mutate(fn) {
    snapshot();
    fn(game());
    game().updatedAt = Date.now();
    save();
    render();
  }
  root.querySelector("#spUndo").addEventListener("click", () => {
    const prev = undoStack.pop();
    if (!prev) { toast?.("Nothing to undo"); return; }
    const g = JSON.parse(prev);
    const sp = store();
    const i = sp.games.findIndex((x) => x.id === g.id);
    if (i !== -1) sp.games[i] = g;
    save();
    render();
  });

  // ---- totals ----
  const total = (g, pid) => g.rounds.reduce((s, r) => s + (Number(r.scores[pid]) || 0), 0);

  // ---- render ----
  function render() {
    // game picker
    const sp = store();
    gameSel.innerHTML = "";
    sp.games.forEach((g) => {
      const o = document.createElement("option");
      o.value = g.id; o.textContent = g.name;
      if (g.id === sp.activeId) o.selected = true;
      gameSel.appendChild(o);
    });
    const g = game();
    lowWins.checked = !!g.lowWins;

    const totals = g.players.map((p) => total(g, p.id));
    const best = g.rounds.length ? (g.lowWins ? Math.min(...totals) : Math.max(...totals)) : null;

    // build table
    table.innerHTML = "";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    hr.appendChild(cornerTh());
    g.players.forEach((p, i) => hr.appendChild(playerTh(p, g.players.length)));
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    g.rounds.forEach((r, ri) => {
      const tr = document.createElement("tr");
      const rl = document.createElement("th");
      rl.className = "sp-rowlabel"; rl.scope = "row"; rl.textContent = "R" + (ri + 1);
      tr.appendChild(rl);
      g.players.forEach((p) => {
        const td = document.createElement("td");
        td.className = "sp-cell";
        const v = r.scores[p.id];
        td.textContent = v === undefined || v === "" ? "·" : v;
        td.addEventListener("click", () => openKeypad(ri, p));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const tfoot = document.createElement("tfoot");
    const tr = document.createElement("tr");
    const tl = document.createElement("th");
    tl.className = "sp-rowlabel"; tl.textContent = "Total";
    tr.appendChild(tl);
    g.players.forEach((p, i) => {
      const td = document.createElement("td");
      td.className = "sp-total" + (best !== null && totals[i] === best ? " leader" : "");
      td.textContent = totals[i];
      tr.appendChild(td);
    });
    tfoot.appendChild(tr);
    table.appendChild(tfoot);
  }

  function cornerTh() {
    const th = document.createElement("th");
    th.className = "sp-corner";
    return th;
  }
  function playerTh(p, count) {
    const th = document.createElement("th");
    th.className = "sp-playerhead";
    const input = document.createElement("input");
    input.className = "sp-playername";
    input.value = p.name;
    input.setAttribute("aria-label", "Player name");
    input.addEventListener("change", () => mutate((g) => {
      const pl = g.players.find((x) => x.id === p.id); if (pl) pl.name = input.value.trim() || pl.name;
    }));
    th.appendChild(input);
    if (count > 2) {
      const rm = document.createElement("button");
      rm.className = "sp-remove"; rm.textContent = "×"; rm.title = "Remove player";
      rm.addEventListener("click", () => mutate((g) => {
        g.players = g.players.filter((x) => x.id !== p.id);
        g.rounds.forEach((r) => delete r.scores[p.id]);
      }));
      th.appendChild(rm);
    }
    return th;
  }

  // ---- keypad ----
  let editing = null; // { roundIdx, player, buffer, neg }
  function openKeypad(roundIdx, player) {
    const cur = game().rounds[roundIdx].scores[player.id];
    editing = { roundIdx, player, buffer: cur === undefined ? "" : String(cur).replace("-", ""), neg: String(cur).startsWith("-") };
    keypadWho.textContent = `${player.name} · R${roundIdx + 1}`;
    updateKeypad();
    keypad.hidden = false;
  }
  function updateKeypad() {
    keypadVal.textContent = (editing.neg ? "−" : "") + (editing.buffer || "0");
  }
  function commitKeypad(advance) {
    if (!editing) return;
    const { roundIdx, player, buffer, neg } = editing;
    const val = buffer === "" ? "" : (neg ? -Number(buffer) : Number(buffer));
    mutate((g) => { g.rounds[roundIdx].scores[player.id] = val; });
    if (advance) {
      const g = game();
      const i = g.players.findIndex((p) => p.id === player.id);
      const next = g.players[i + 1];
      if (next) { openKeypad(roundIdx, next); return; }
    }
    closeKeypad();
  }
  function closeKeypad() { editing = null; keypad.hidden = true; }

  keypad.addEventListener("click", (e) => {
    const k = e.target.dataset.key;
    if (k === undefined || !editing) return;
    if (/^[0-9]$/.test(k)) { if (editing.buffer.length < 5) editing.buffer += k; }
    else if (k === "back") editing.buffer = editing.buffer.slice(0, -1);
    else if (k === "clear") editing.buffer = "";
    else if (k === "sign") editing.neg = !editing.neg;
    else if (k === "done") return commitKeypad(false);
    else if (k === "next") return commitKeypad(true);
    updateKeypad();
  });

  // ---- game / player / round actions ----
  gameSel.addEventListener("change", () => { store().activeId = gameSel.value; undoStack = []; save(); render(); });
  root.querySelector("#spNewGame").addEventListener("click", () => {
    const name = prompt("Name this game:", "Game " + (store().games.length + 1));
    if (name === null) return;
    const g = newGame(name.trim() || "Game");
    store().games.push(g); store().activeId = g.id; undoStack = []; save(); render();
  });
  root.querySelector("#spRenameGame").addEventListener("click", () => {
    const g = game(); const name = prompt("Rename game:", g.name);
    if (name === null) return;
    mutate((gg) => { gg.name = name.trim() || gg.name; });
  });
  root.querySelector("#spDupGame").addEventListener("click", () => {
    const copy = JSON.parse(JSON.stringify(game()));
    copy.id = uid(); copy.name = game().name + " copy"; copy.rounds = [];
    copy.players.forEach((p) => (p.id = uid()));
    copy.createdAt = copy.updatedAt = Date.now();
    store().games.push(copy); store().activeId = copy.id; undoStack = []; save(); render();
    toast?.("Duplicated with the same players");
  });
  root.querySelector("#spDeleteGame").addEventListener("click", () => {
    if (store().games.length <= 1) { toast?.("Can't delete your only game"); return; }
    if (!confirm(`Delete "${game().name}"?`)) return;
    const sp = store();
    sp.games = sp.games.filter((g) => g.id !== sp.activeId);
    sp.activeId = sp.games[0].id; undoStack = []; save(); render();
  });
  root.querySelector("#spAddPlayer").addEventListener("click", () => mutate((g) => {
    if (g.players.length >= 12) return;
    g.players.push({ id: uid(), name: "Player " + (g.players.length + 1) });
  }));
  root.querySelector("#spAddRound").addEventListener("click", () => {
    mutate((g) => g.rounds.push({ id: uid(), scores: {} }));
    tableWrap.scrollTop = tableWrap.scrollHeight;
  });
  lowWins.addEventListener("change", () => mutate((g) => { g.lowWins = lowWins.checked; }));

  // ---- export ----
  root.querySelector("#spExport").addEventListener("click", () => {
    const g = game();
    const head = ["Round", ...g.players.map((p) => p.name)];
    const rows = g.rounds.map((r, i) => ["R" + (i + 1), ...g.players.map((p) => r.scores[p.id] ?? "")]);
    rows.push(["Total", ...g.players.map((p) => total(g, p.id))]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = (g.name || "scorepad").replace(/[^\w-]+/g, "_") + ".csv";
    a.click();
    toast?.("Exported CSV");
  });

  // ---- screen wake lock ----
  let wakeLock = null;
  const wakeSupported = "wakeLock" in navigator;
  if (!wakeSupported) { wakeToggle.closest(".opt")?.setAttribute("hidden", ""); }
  async function acquireWake() {
    try { wakeLock = await navigator.wakeLock.request("screen"); } catch { wakeToggle.checked = false; }
  }
  wakeToggle.addEventListener("change", () => {
    if (wakeToggle.checked) acquireWake();
    else { wakeLock?.release(); wakeLock = null; }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wakeToggle.checked && !wakeLock) acquireWake();
  });

  render();
}
