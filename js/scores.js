// scores.js — scoreboard with several modes:
//   free    — generic running score (highest leads)
//   target  — first to a target wins (presets incl. Cribbage 121)
//   golf    — lowest score leads / wins
//   rounds  — fixed number of rounds, highest total wins
//   darts   — X01 (501/301/701) countdown with bust + double-out
//   cricket — standard darts cricket (20..15 + bull), marks + points
import { getState, save } from "./storage.js?v=20260801f";
import { burst } from "./confetti.js?v=20260801f";

const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, "B"];
const CRICKET_VALUE = { 20: 20, 19: 19, 18: 18, 17: 17, 16: 16, 15: 15, B: 25 };
const MARK_SYMBOL = ["", "/", "X", "Ⓧ"];

export function initScores(root, { toast } = {}) {
  const grid = root.querySelector("#scoreGrid");
  const setup = root.querySelector("#scoreSetup");
  const hint = root.querySelector("#scoreHint");
  const modeBtns = root.querySelectorAll("[data-score-mode]");

  const players = () => getState().players;
  const cfg = () => {
    const s = getState();
    if (!s.scoring) s.scoring = {};
    const c = s.scoring;
    c.mode = c.mode || "free";
    c.target = c.target ?? 50;
    c.rounds = c.rounds || { total: 5, current: 1 };
    c.darts = c.darts || { start: 501, doubleOut: false, active: 0, winnerId: null, undo: [], p: {} };
    c.cricket = c.cricket || { winnerId: null, marks: {}, points: {}, undo: [] };
    return c;
  };

  function mkBtn(label, cls, fn) {
    const b = document.createElement("button");
    b.className = cls; b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  modeBtns.forEach((b) =>
    b.addEventListener("click", () => { cfg().mode = b.dataset.scoreMode; save(); render(); })
  );

  root.querySelector("#addPlayer").addEventListener("click", () => {
    const s = getState();
    const p = { id: crypto.randomUUID(), name: "Player " + (s.players.length + 1), score: 0, step: 1 };
    s.players.push(p);
    if (cfg().mode === "darts") cfg().darts.p[p.id] = { rem: cfg().darts.start, thrown: 0, scored: 0 };
    save(); render();
  });

  function removePlayer(id) {
    const s = getState();
    s.players = s.players.filter((x) => x.id !== id);
    delete cfg().darts.p[id];
    delete cfg().cricket.marks[id];
    delete cfg().cricket.points[id];
    save(); render();
  }

  function nameInput(p) {
    const name = document.createElement("input");
    name.className = "s-name"; name.value = p.name; name.setAttribute("aria-label", "Player name");
    name.addEventListener("input", () => { p.name = name.value; save(); });
    return name;
  }

  // ---------- dispatch ----------
  function render() {
    const mode = cfg().mode;
    modeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.scoreMode === mode));
    setup.innerHTML = ""; grid.innerHTML = ""; hint.textContent = ""; hint.innerHTML = "";
    grid.className = "score-grid";
    if (mode === "darts") renderDarts();
    else if (mode === "cricket") renderCricket();
    else renderCounter(mode); // free | target | golf | rounds
  }

  // ---------- counter-style modes: free / target / golf / rounds ----------
  function renderCounter(mode) {
    const ps = players();
    const c = cfg();
    const lowerWins = mode === "golf";
    const row = document.createElement("div");
    row.className = "score-setup-row";

    if (mode === "target") {
      const lbl = document.createElement("label");
      lbl.className = "score-setup-item"; lbl.append("Target ");
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = "1"; inp.value = c.target; inp.className = "setup-num";
      inp.addEventListener("input", () => { c.target = Math.max(1, Math.round(Number(inp.value) || 1)); save(); render(); });
      lbl.appendChild(inp);
      row.appendChild(lbl);
      [["100", 100], ["121 (Cribbage)", 121], ["250", 250], ["500", 500]].forEach(([label, v]) =>
        row.appendChild(mkBtn(label, "chip" + (c.target === v ? " is-active" : ""), () => { c.target = v; save(); render(); }))
      );
    }

    if (mode === "rounds") {
      const lbl = document.createElement("label");
      lbl.className = "score-setup-item"; lbl.append("Rounds ");
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = "1"; inp.value = c.rounds.total; inp.className = "setup-num";
      inp.addEventListener("input", () => { c.rounds.total = Math.max(1, Math.round(Number(inp.value) || 1)); save(); render(); });
      lbl.appendChild(inp);
      row.append(lbl,
        mkBtn("‹ Prev", "mini-btn", () => { c.rounds.current = Math.max(1, c.rounds.current - 1); save(); render(); }),
        mkBtn("Next ›", "mini-btn", () => { c.rounds.current = Math.min(c.rounds.total + 1, c.rounds.current + 1); save(); render(); })
      );
    }

    row.appendChild(mkBtn("Sort", "mini-btn", () => { getState().players.sort((a, b) => lowerWins ? a.score - b.score : b.score - a.score); save(); render(); }));
    row.appendChild(mkBtn("New game", "mini-btn", () => {
      if (!ps.length) return;
      if (!confirm("Reset every score to 0? (players are kept)")) return;
      ps.forEach((p) => (p.score = 0));
      if (mode === "rounds") c.rounds.current = 1;
      save(); render();
    }));
    setup.appendChild(row);

    const finished = mode === "rounds" && c.rounds.current > c.rounds.total;
    if (mode === "target") hint.textContent = `First to ${c.target} wins.`;
    else if (mode === "golf") hint.textContent = "Golf — lowest score leads.";
    else if (mode === "rounds") hint.textContent = finished ? "" : `Round ${c.rounds.current} of ${c.rounds.total} — highest total wins.`;
    else hint.textContent = "Highest score leads. Type a score directly, or use the buttons.";

    if (!ps.length) { grid.innerHTML = '<p class="muted">No players yet — add a few to start keeping score.</p>'; return; }

    const ordered = [...ps].sort((a, b) => lowerWins ? a.score - b.score : b.score - a.score);
    const best = ordered[0].score;
    const allEqual = ordered.every((p) => p.score === best);
    const rankOf = new Map(); ordered.forEach((p, i) => rankOf.set(p.id, i));

    if (finished) {
      const w = ordered[0];
      hint.innerHTML = `<strong>Game over — ${allEqual ? "it's a tie" : w.name + " wins"}.</strong> (${c.rounds.total} rounds)`;
    }

    ps.forEach((p) => grid.appendChild(counterCard(p, mode, rankOf.get(p.id), best, allEqual, lowerWins)));
  }

  function counterCard(p, mode, rank, best, allEqual, lowerWins) {
    const n = players().length;
    const c = cfg();
    const el = document.createElement("div");
    el.className = "score-card";
    const isBest = n > 1 && !allEqual && p.score === best;
    const reached = mode === "target" && p.score >= c.target;
    const roundsWin = mode === "rounds" && c.rounds.current > c.rounds.total && isBest;
    if (reached || roundsWin) el.classList.add("reached");
    else if (isBest) el.classList.add("leader");

    const head = document.createElement("div");
    head.className = "score-head";
    const badge = document.createElement("span");
    badge.className = "rank";
    badge.textContent = (reached || roundsWin) ? "WIN" : (n > 1 && !allEqual ? `#${rank + 1}` : "");
    head.append(badge, nameInput(p), mkBtn("remove", "link-btn", () => removePlayer(p.id)));

    const score = document.createElement("input");
    score.type = "number"; score.className = "s-score"; score.value = p.score; score.setAttribute("aria-label", "Score");
    score.addEventListener("input", () => { p.score = Math.round(Number(score.value) || 0); save(); render(); });

    const controls = document.createElement("div");
    controls.className = "s-controls";
    controls.append(
      mkBtn("−", "c-step", () => bump(p, -Math.abs(p.step || 1))),
      stepInput(p),
      mkBtn("＋", "c-step", () => bump(p, Math.abs(p.step || 1)))
    );

    const chips = document.createElement("div");
    chips.className = "s-chips";
    [1, 5, 10].forEach((v) => chips.appendChild(mkBtn("+" + v, "s-chip", () => bump(p, v))));

    el.append(head, score, controls, chips);
    return el;
  }

  function stepInput(p) {
    const step = document.createElement("input");
    step.type = "number"; step.min = "1"; step.value = p.step || 1; step.className = "s-step"; step.setAttribute("aria-label", "Step");
    step.addEventListener("input", () => { p.step = Math.max(1, Math.round(Number(step.value) || 1)); save(); });
    return step;
  }

  function bump(p, by) { p.score = Math.round(p.score + by); save(); render(); }

  // ---------- darts (X01) ----------
  function ensureDartsState() {
    const d = cfg().darts;
    players().forEach((p) => { if (!d.p[p.id]) d.p[p.id] = { rem: d.start, thrown: 0, scored: 0 }; });
    d.active = players().length ? d.active % players().length : 0;
  }
  function newLeg() {
    const d = cfg().darts;
    d.p = {};
    players().forEach((p) => (d.p[p.id] = { rem: d.start, thrown: 0, scored: 0 }));
    d.active = 0; d.winnerId = null; d.undo = [];
    save(); render();
  }
  function setStart(v) { cfg().darts.start = v; newLeg(); }
  function submitTurn(p, value) {
    const d = cfg().darts, ps = players();
    if (d.winnerId) return;
    const st = d.p[p.id];
    const total = Math.max(0, Math.min(180, Math.round(Number(value) || 0)));
    const newRem = st.rem - total;
    let busted = false, win = false;
    if (newRem < 0) busted = true;
    else if (newRem === 0) win = true;
    else if (newRem === 1 && d.doubleOut) busted = true;
    d.undo.push({ id: p.id, rem: st.rem, thrown: st.thrown, scored: st.scored, active: d.active, winnerId: d.winnerId });
    st.thrown += 3;
    if (busted) { toast && toast("Bust — score stays"); }
    else { st.rem = newRem; st.scored += total; if (win) d.winnerId = p.id; }
    if (!win && ps.length) d.active = (d.active + 1) % ps.length;
    save();
    if (win) burst(150);
    render();
  }
  function undoTurn() {
    const d = cfg().darts;
    const last = d.undo.pop();
    if (!last) return;
    const st = d.p[last.id];
    if (st) { st.rem = last.rem; st.thrown = last.thrown; st.scored = last.scored; }
    d.active = last.active; d.winnerId = last.winnerId;
    save(); render();
  }
  function renderDarts() {
    const d = cfg().darts, ps = players();
    ensureDartsState();
    const row = document.createElement("div");
    row.className = "score-setup-row";
    [301, 501, 701].forEach((v) => row.appendChild(mkBtn(String(v), "chip" + (d.start === v ? " is-active" : ""), () => setStart(v))));
    const custom = document.createElement("input");
    custom.type = "number"; custom.min = "2"; custom.value = d.start; custom.className = "setup-num"; custom.title = "Custom start";
    custom.addEventListener("change", () => setStart(Math.max(2, Math.round(Number(custom.value) || 501))));
    row.appendChild(custom);
    const dbl = document.createElement("label");
    dbl.className = "opt";
    const chk = document.createElement("input"); chk.type = "checkbox"; chk.checked = d.doubleOut;
    chk.addEventListener("change", () => { d.doubleOut = chk.checked; save(); render(); });
    dbl.append(chk, document.createTextNode(" Double out"));
    row.append(dbl, mkBtn("Undo", "mini-btn", undoTurn), mkBtn("New leg", "mini-btn", () => { if (confirm("Start a fresh leg?")) newLeg(); }));
    setup.appendChild(row);

    if (!ps.length) { grid.innerHTML = '<p class="muted">Add players, then throw. Enter each turn total (0–180); it counts down to zero.</p>'; return; }
    if (d.winnerId) {
      const w = ps.find((p) => p.id === d.winnerId);
      hint.innerHTML = `<strong>${w ? w.name : "Someone"} wins the leg.</strong> Start a new leg to play again.`;
    } else {
      const cur = ps[d.active];
      hint.textContent = `Enter ${cur ? cur.name : "the player"}'s turn total (0–180). Double out ${d.doubleOut ? "on" : "off"}.`;
    }
    const byRem = [...ps].sort((a, b) => d.p[a.id].rem - d.p[b.id].rem);
    const posOf = new Map(); byRem.forEach((p, i) => posOf.set(p.id, i));
    ps.forEach((p, idx) => grid.appendChild(dartsCard(p, idx, posOf.get(p.id))));
  }
  function dartsCard(p, idx, pos) {
    const d = cfg().darts, st = d.p[p.id];
    const isActive = !d.winnerId && idx === d.active;
    const isWinner = d.winnerId === p.id;
    const el = document.createElement("div");
    el.className = "score-card darts-card" + (isActive ? " active" : "") + (isWinner ? " winner" : "");
    const head = document.createElement("div"); head.className = "score-head";
    const badge = document.createElement("span"); badge.className = "rank"; badge.textContent = isWinner ? "WIN" : `#${pos + 1}`;
    head.append(badge, nameInput(p), mkBtn("remove", "link-btn", () => removePlayer(p.id)));
    const rem = document.createElement("div"); rem.className = "s-score darts-rem"; rem.textContent = st.rem;
    const meta = document.createElement("div"); meta.className = "darts-meta";
    meta.textContent = `avg ${st.thrown ? (st.scored / st.thrown * 3).toFixed(1) : "—"} · ${st.thrown} darts`;
    el.append(head, rem, meta);
    if (isActive) {
      const turn = document.createElement("div"); turn.className = "darts-turn";
      const input = document.createElement("input");
      input.type = "number"; input.min = "0"; input.max = "180"; input.className = "darts-input"; input.placeholder = "0–180"; input.setAttribute("aria-label", "Turn total");
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submitTurn(p, input.value); });
      turn.append(input, mkBtn("Enter", "btn primary", () => submitTurn(p, input.value)));
      el.appendChild(turn);
      requestAnimationFrame(() => input.focus());
    } else if (isWinner) {
      const badge2 = document.createElement("div"); badge2.className = "darts-badge"; badge2.textContent = "LEG WINNER";
      el.appendChild(badge2);
    }
    return el;
  }

  // ---------- cricket ----------
  function ensureCricket() {
    const ck = cfg().cricket;
    players().forEach((p) => {
      if (!ck.marks[p.id]) ck.marks[p.id] = {};
      CRICKET_TARGETS.forEach((t) => { if (ck.marks[p.id][t] == null) ck.marks[p.id][t] = 0; });
      if (ck.points[p.id] == null) ck.points[p.id] = 0;
    });
  }
  function cricketNewGame() {
    const ck = cfg().cricket;
    ck.marks = {}; ck.points = {}; ck.winnerId = null; ck.undo = [];
    ensureCricket(); save(); render();
  }
  function cricketAddMark(pid, t) {
    const ck = cfg().cricket;
    if (ck.winnerId) return;
    ck.undo.push({ pid, t, mark: ck.marks[pid][t], points: ck.points[pid] });
    if (ck.undo.length > 200) ck.undo.shift();
    if (ck.marks[pid][t] < 3) {
      ck.marks[pid][t] += 1;
    } else {
      // closed already — score if any opponent hasn't closed this number
      const open = players().some((o) => o.id !== pid && ck.marks[o.id][t] < 3);
      if (open) ck.points[pid] += CRICKET_VALUE[t];
    }
    checkCricketWin(pid);
    save(); render();
  }
  function cricketUndo() {
    const ck = cfg().cricket;
    const last = ck.undo.pop();
    if (!last) return;
    ck.marks[last.pid][last.t] = last.mark;
    ck.points[last.pid] = last.points;
    ck.winnerId = null;
    save(); render();
  }
  function checkCricketWin(pid) {
    const ck = cfg().cricket;
    const allClosed = CRICKET_TARGETS.every((t) => ck.marks[pid][t] >= 3);
    const leadOrTie = players().every((o) => o.id === pid || ck.points[pid] >= ck.points[o.id]);
    if (allClosed && leadOrTie) { ck.winnerId = pid; burst(150); }
  }
  function renderCricket() {
    const ck = cfg().cricket, ps = players();
    ensureCricket();
    const row = document.createElement("div");
    row.className = "score-setup-row";
    row.append(mkBtn("Undo", "mini-btn", cricketUndo), mkBtn("New game", "mini-btn", () => { if (confirm("Start a fresh cricket game?")) cricketNewGame(); }));
    setup.appendChild(row);

    if (!ps.length) { grid.innerHTML = '<p class="muted">Add players. Tap a number to add a mark (3 closes it); closed numbers score against anyone who hasn\'t closed them.</p>'; return; }
    if (ck.winnerId) {
      const w = ps.find((p) => p.id === ck.winnerId);
      hint.innerHTML = `<strong>${w ? w.name : "Someone"} wins.</strong> All numbers closed and ahead on points.`;
    } else {
      hint.textContent = "Tap a number to add a mark (3 = closed). Closed numbers score their value against players who haven't closed them.";
    }

    grid.className = "cricket-wrap";
    const table = document.createElement("table");
    table.className = "cricket-table";
    // header: blank + player names
    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    htr.appendChild(document.createElement("th"));
    ps.forEach((p) => {
      const th = document.createElement("th");
      const inp = nameInput(p); inp.classList.add("cricket-name");
      th.appendChild(inp);
      if (ck.winnerId === p.id) th.classList.add("winner");
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    CRICKET_TARGETS.forEach((t) => {
      const tr = document.createElement("tr");
      const label = document.createElement("th");
      label.className = "cricket-num";
      label.textContent = t === "B" ? "Bull" : t;
      tr.appendChild(label);
      ps.forEach((p) => {
        const td = document.createElement("td");
        const m = ck.marks[p.id][t];
        const cell = document.createElement("button");
        cell.className = "cricket-cell" + (m >= 3 ? " closed" : "");
        cell.textContent = MARK_SYMBOL[Math.min(3, m)];
        cell.setAttribute("aria-label", `${p.name} ${t === "B" ? "bull" : t}: ${m} marks`);
        cell.disabled = !!ck.winnerId;
        cell.addEventListener("click", () => cricketAddMark(p.id, t));
        td.appendChild(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    // points row
    const ptr = document.createElement("tr");
    ptr.className = "cricket-points-row";
    const plabel = document.createElement("th"); plabel.textContent = "Points"; ptr.appendChild(plabel);
    ps.forEach((p) => {
      const td = document.createElement("td");
      td.className = "cricket-points"; td.textContent = ck.points[p.id];
      ptr.appendChild(td);
    });
    tbody.appendChild(ptr);
    table.appendChild(tbody);
    grid.appendChild(table);
  }

  render();
}
