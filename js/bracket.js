// bracket.js — a tournament generator with three formats:
//   knockout — single-elimination bracket (byes handled, tap to advance)
//   league   — round-robin fixtures + a live standings table
//   groups   — round-robin groups, top N qualify, then build a knockout
// State (entrants, seeds, results) persists in localStorage.
import { getState, save } from "./storage.js?v=20260801o";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id" + Math.random().toString(36).slice(2));
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const r = new Uint32Array(1); crypto.getRandomValues(r); const j = r[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const nextPow2 = (n) => 1 << Math.ceil(Math.log2(Math.max(2, n)));

// Round-robin fixtures (circle method). Returns rounds of [aId,bId] pairs.
function roundRobin(ids) {
  const a = ids.slice();
  if (a.length % 2) a.push(null); // bye marker
  const n = a.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) pairs.push([a[i], a[n - 1 - i]]);
    rounds.push(pairs);
    a.splice(1, 0, a.pop());
  }
  return rounds;
}

// Standings from fixtures {key,a,b} + results {key:"H"|"D"|"A"}. 3/1/0 points.
function standings(ids, fixtures, results) {
  const t = new Map(ids.map((id) => [id, { id, P: 0, W: 0, D: 0, L: 0, Pts: 0 }]));
  fixtures.forEach(({ key, a, b }) => {
    const res = results[key];
    if (!res || !a || !b) return;
    const ra = t.get(a), rb = t.get(b); ra.P++; rb.P++;
    if (res === "H") { ra.W++; rb.L++; ra.Pts += 3; }
    else if (res === "A") { rb.W++; ra.L++; rb.Pts += 3; }
    else { ra.D++; rb.D++; ra.Pts++; rb.Pts++; }
  });
  return [...t.values()].sort((x, y) => y.Pts - x.Pts || y.W - x.W);
}

export function initBracket(root) {
  const panel = root.querySelector(".bracket-panel");
  if (!panel) return;

  const formatBtns = root.querySelectorAll("[data-bk-format]");
  const seedBtns = root.querySelectorAll("[data-bk-seed]");
  const entrantsEl = root.querySelector("#bkEntrants");
  const groupsOpt = root.querySelector("#bkGroupsOpt");
  const qualOpt = root.querySelector("#bkQualOpt");
  const groupCountEl = root.querySelector("#bkGroupCount");
  const qualifyEl = root.querySelector("#bkQualify");
  const genBtn = root.querySelector("#bkGenerate");
  const resultEl = root.querySelector("#bkResult");

  const cfg = () => {
    const s = getState();
    if (!s.bracket) s.bracket = { format: "knockout", entrants: "", seed: "order", groupCount: 2, qualify: 2, competitors: [], ko: {}, league: {}, groups: {} };
    return s.bracket;
  };
  const name = (id) => (cfg().competitors.find((c) => c.id === id) || {}).name || "—";

  // ---- restore ----
  const c = cfg();
  entrantsEl.value = c.entrants || "";
  groupCountEl.value = c.groupCount; qualifyEl.value = c.qualify;
  applyFormat(c.format);
  applySeed(c.seed);
  render();

  function applyFormat(f) {
    cfg().format = f;
    formatBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.bkFormat === f));
    groupsOpt.hidden = f !== "groups";
    qualOpt.hidden = f !== "groups";
    save();
  }
  function applySeed(s) {
    cfg().seed = s;
    seedBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.bkSeed === s));
    save();
  }
  formatBtns.forEach((b) => b.addEventListener("click", () => { applyFormat(b.dataset.bkFormat); render(); }));
  seedBtns.forEach((b) => b.addEventListener("click", () => applySeed(b.dataset.bkSeed)));
  entrantsEl.addEventListener("input", () => { cfg().entrants = entrantsEl.value; save(); });
  groupCountEl.addEventListener("input", () => { cfg().groupCount = Math.max(2, Math.min(8, +groupCountEl.value || 2)); save(); });
  qualifyEl.addEventListener("input", () => { cfg().qualify = Math.max(1, Math.min(4, +qualifyEl.value || 1)); save(); });

  // ---- generate (freeze entrants + reset results) ----
  genBtn.addEventListener("click", () => {
    let list = entrantsEl.value.split("\n").map((l) => l.trim()).filter(Boolean);
    if (cfg().seed === "random") list = shuffle(list);
    cfg().competitors = list.map((nm) => ({ id: uid(), name: nm }));
    cfg().ko = {}; cfg().league = {}; cfg().groups = {};
    save(); render();
  });

  function note(msg) { resultEl.innerHTML = `<p class="muted bk-note">${msg}</p>`; }

  // ---- render dispatch ----
  function render() {
    const g = cfg();
    if (!g.competitors.length) { note("Add at least two names, then press Generate."); return; }
    if (g.competitors.length < 2) { note("Add at least two names."); return; }
    resultEl.innerHTML = "";
    if (g.format === "knockout") renderKnockout(g.competitors);
    else if (g.format === "league") renderLeague();
    else renderGroups();
  }

  /* ================= KNOCKOUT ================= */
  // Standard bracket seed order for a given size, e.g. 4 -> [1,4,3,2]. Placing
  // entrants by seed means byes (the highest seed numbers) face the top seeds,
  // so byes are spread out and never paired against each other.
  function seedPositions(size) {
    let s = [1, 2];
    while (s.length < size) { const m = s.length * 2 + 1; const n = []; for (const x of s) n.push(x, m - x); s = n; }
    return s;
  }
  function koRounds(comp, results) {
    const size = nextPow2(comp.length);
    let cur = seedPositions(size).map((seed) => (seed <= comp.length ? comp[seed - 1].id : null));
    const rounds = []; let r = 0;
    while (cur.length > 1) {
      const matches = [];
      for (let i = 0; i < cur.length; i += 2) {
        const a = cur[i], b = cur[i + 1], key = `r${r}m${i / 2}`;
        let winner = null;
        if (a && !b) winner = a; else if (b && !a) winner = b; else if (a && b) winner = results[key] || null;
        matches.push({ key, a, b, winner });
      }
      rounds.push(matches);
      cur = matches.map((m) => m.winner);
      r++;
    }
    return rounds;
  }
  function setKoWinner(round, key, id) {
    const g = cfg();
    g.ko[key] = id;
    // Clear downstream results (they may reference a competitor who no longer advances).
    Object.keys(g.ko).forEach((k) => { if (+k.match(/^r(\d+)/)[1] > round) delete g.ko[k]; });
    save(); render();
  }
  function renderKnockout(comp) {
    const rounds = koRounds(comp, cfg().ko);
    const champ = rounds[rounds.length - 1][0].winner;
    const wrap = document.createElement("div");
    wrap.className = "bk-knockout";
    rounds.forEach((matches, ri) => {
      const col = document.createElement("div");
      col.className = "bk-round";
      const h = document.createElement("div");
      h.className = "bk-round-title";
      h.textContent = ri === rounds.length - 1 ? "Final" : rounds.length - ri === 2 ? "Semis" : `Round ${ri + 1}`;
      col.appendChild(h);
      const body = document.createElement("div");
      body.className = "bk-round-body"; // spaced separately from the title so matches line up across rounds
      matches.forEach((m) => body.appendChild(koMatch(m, ri)));
      col.appendChild(body);
      wrap.appendChild(col);
    });
    resultEl.appendChild(wrap);
    if (champ) {
      const c = document.createElement("p");
      c.className = "bk-champion";
      c.innerHTML = `<span class="bk-champion-label">Champion</span> ${escapeHtml(name(champ))}`;
      resultEl.appendChild(c);
    }
  }
  function koMatch(m, ri) {
    const el = document.createElement("div");
    el.className = "bk-match";
    [m.a, m.b].forEach((id) => {
      const slot = document.createElement("button");
      // A null slot in round 0 is a genuine bye; in later rounds it's a winner
      // that hasn't been decided yet (TBD), so label the two cases differently.
      const pending = !id && ri > 0;
      slot.className = "bk-slot" + (id && m.winner === id ? " won" : "") + (!id ? (pending ? " tbd" : " bye") : "");
      slot.textContent = id ? name(id) : pending ? "—" : "bye";
      slot.disabled = !id || !m.a || !m.b;
      if (id && m.a && m.b) slot.addEventListener("click", () => setKoWinner(ri, m.key, id));
      el.appendChild(slot);
    });
    return el;
  }

  /* ================= LEAGUE ================= */
  function renderLeague() {
    resultEl.innerHTML = ""; // called directly on result clicks — avoid appending duplicates
    const ids = cfg().competitors.map((c) => c.id);
    const rr = roundRobin(ids);
    const fixtures = [];
    rr.forEach((pairs, ri) => pairs.forEach(([a, b], i) => fixtures.push({ key: `l${ri}m${i}`, a, b, round: ri })));
    resultEl.appendChild(standingsTable(ids, fixtures, cfg().league));
    resultEl.appendChild(fixtureList(fixtures, cfg().league, (key, res) => { cfg().league[key] = res; save(); renderLeague(); }, "league"));
  }

  /* ================= GROUPS ================= */
  function renderGroups() {
    resultEl.innerHTML = ""; // called directly on result clicks — avoid appending duplicates
    const g = cfg();
    const count = Math.min(g.groupCount, Math.floor(g.competitors.length / 2) || 1);
    const groups = Array.from({ length: count }, () => []);
    g.competitors.forEach((c, i) => groups[i % count].push(c));
    if (!g.groups.results) g.groups.results = {};
    const qualifiers = [];

    groups.forEach((members, gi) => {
      if (members.length < 2) return;
      const ids = members.map((m) => m.id);
      const rr = roundRobin(ids);
      const fixtures = [];
      rr.forEach((pairs, ri) => pairs.forEach(([a, b], i) => fixtures.push({ key: `g${gi}r${ri}m${i}`, a, b, round: ri })));
      const box = document.createElement("div");
      box.className = "bk-group";
      const h = document.createElement("h3"); h.className = "bk-group-title"; h.textContent = `Group ${String.fromCharCode(65 + gi)}`;
      box.appendChild(h);
      const table = standingsTable(ids, fixtures, g.groups.results, g.qualify);
      box.appendChild(table);
      box.appendChild(fixtureList(fixtures, g.groups.results, (key, res) => { g.groups.results[key] = res; save(); renderGroups(); }, "g" + gi));
      resultEl.appendChild(box);
      standings(ids, fixtures, g.groups.results).slice(0, g.qualify).forEach((row, pos) => qualifiers.push({ id: row.id, pos, gi }));
    });

    // Build-knockout button (seeds qualifiers so group winners are separated).
    const btn = document.createElement("button");
    btn.className = "btn primary bk-build";
    btn.textContent = "Build knockout from qualifiers";
    btn.addEventListener("click", () => {
      const seeded = [];
      for (let pos = 0; pos < g.qualify; pos++) qualifiers.filter((q) => q.pos === pos).forEach((q) => seeded.push(q.id));
      g.competitors = seeded.map((id) => ({ id, name: name(id) }));
      g.ko = {}; applyFormat("knockout"); render();
    });
    resultEl.appendChild(btn);
  }

  /* ================= shared UI ================= */
  function standingsTable(ids, fixtures, results, qualify) {
    const table = document.createElement("table");
    table.className = "bk-standings";
    table.innerHTML = "<thead><tr><th>#</th><th class='bk-team'>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>";
    const tb = document.createElement("tbody");
    standings(ids, fixtures, results).forEach((row, i) => {
      const tr = document.createElement("tr");
      if (qualify && i < qualify) tr.className = "bk-qualify";
      tr.innerHTML = `<td>${i + 1}</td><td class='bk-team'>${escapeHtml(name(row.id))}</td><td>${row.P}</td><td>${row.W}</td><td>${row.D}</td><td>${row.L}</td><td class='bk-pts'>${row.Pts}</td>`;
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    return table;
  }
  function fixtureList(fixtures, results, onSet, ns) {
    const wrap = document.createElement("div");
    wrap.className = "bk-fixtures";
    fixtures.forEach(({ key, a, b }) => {
      if (!a || !b) return; // bye
      const row = document.createElement("div");
      row.className = "bk-fixture";
      const res = results[key];
      const mk = (label, code, cls) => {
        const btn = document.createElement("button");
        btn.className = "bk-res" + (res === code ? " sel " + cls : "");
        btn.textContent = label;
        btn.addEventListener("click", () => onSet(key, res === code ? undefined : code));
        return btn;
      };
      const an = document.createElement("span"); an.className = "bk-fx-name" + (res === "H" ? " win" : ""); an.textContent = name(a);
      const bn = document.createElement("span"); bn.className = "bk-fx-name" + (res === "A" ? " win" : ""); bn.textContent = name(b);
      const ctrl = document.createElement("span"); ctrl.className = "bk-res-group";
      ctrl.append(mk("W", "H", "h"), mk("D", "D", "d"), mk("W", "A", "a"));
      row.append(an, ctrl, bn);
      wrap.appendChild(row);
    });
    return wrap;
  }
  function escapeHtml(s) { return s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])); }
}
