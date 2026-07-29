// scores.js — scoreboard with three modes:
//   free   — generic running score (highest leads)
//   target — first to reach a target wins
//   darts  — X01 (501/301/701) countdown with bust + double-out, à la a darts counter
import { getState, save } from "./storage.js?v=20260730c";
import { burst } from "./confetti.js?v=20260730c";

export function initScores(root, { toast } = {}) {
  const grid = root.querySelector("#scoreGrid");
  const setup = root.querySelector("#scoreSetup");
  const hint = root.querySelector("#scoreHint");
  const modeBtns = root.querySelectorAll("[data-score-mode]");

  const players = () => getState().players;
  const cfg = () => {
    const s = getState();
    if (!s.scoring) s.scoring = { mode: "free", target: 50, darts: { start: 501, doubleOut: false, active: 0, winnerId: null, undo: [], p: {} } };
    return s.scoring;
  };

  function mkBtn(label, cls, fn) {
    const b = document.createElement("button");
    b.className = cls; b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  modeBtns.forEach((b) =>
    b.addEventListener("click", () => {
      cfg().mode = b.dataset.scoreMode;
      modeBtns.forEach((x) => x.classList.toggle("is-active", x === b));
      save(); render();
    })
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
    save(); render();
  }

  // ---------- dispatch ----------
  function render() {
    const mode = cfg().mode;
    modeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.scoreMode === mode));
    setup.innerHTML = ""; grid.innerHTML = ""; hint.textContent = "";
    if (mode === "darts") renderDarts();
    else renderCounter(mode);
  }

  // ---------- free / target ----------
  function renderCounter(mode) {
    const ps = players();
    const row = document.createElement("div");
    row.className = "score-setup-row";
    if (mode === "target") {
      const lbl = document.createElement("label");
      lbl.className = "score-setup-item";
      lbl.append("Target ");
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = "1"; inp.value = cfg().target; inp.className = "setup-num";
      inp.addEventListener("input", () => { cfg().target = Math.max(1, Math.round(Number(inp.value) || 1)); save(); render(); });
      lbl.appendChild(inp);
      row.appendChild(lbl);
    }
    row.appendChild(mkBtn("Sort", "mini-btn", () => { getState().players.sort((a, b) => b.score - a.score); save(); render(); }));
    row.appendChild(mkBtn("New game", "mini-btn", () => {
      if (!ps.length) return;
      if (!confirm("Reset every score to 0? (players are kept)")) return;
      ps.forEach((p) => (p.score = 0)); save(); render();
    }));
    setup.appendChild(row);

    hint.textContent = mode === "target"
      ? `First to ${cfg().target} wins.`
      : "Highest score leads. Type a score directly, or use the buttons.";

    if (!ps.length) { grid.innerHTML = '<p class="muted">No players yet — add a few to start keeping score.</p>'; return; }

    const sorted = [...ps].sort((a, b) => b.score - a.score);
    const top = sorted[0].score;
    const allEqual = sorted.every((p) => p.score === top);
    const rankOf = new Map(); sorted.forEach((p, i) => rankOf.set(p.id, i));
    ps.forEach((p) => grid.appendChild(counterCard(p, mode, rankOf.get(p.id), top, allEqual)));
  }

  function counterCard(p, mode, rank, top, allEqual) {
    const n = players().length;
    const el = document.createElement("div");
    el.className = "score-card";
    const reached = mode === "target" && p.score >= cfg().target;
    if (reached) el.classList.add("reached");
    else if (n > 1 && !allEqual && p.score === top) el.classList.add("leader");

    const head = document.createElement("div");
    head.className = "score-head";
    const badge = document.createElement("span");
    badge.className = "rank";
    badge.textContent = reached ? "WIN" : (n > 1 && !allEqual ? `#${rank + 1}` : "");
    const name = document.createElement("input");
    name.className = "s-name"; name.value = p.name; name.setAttribute("aria-label", "Player name");
    name.addEventListener("input", () => { p.name = name.value; save(); });
    const del = mkBtn("remove", "link-btn", () => removePlayer(p.id));
    head.append(badge, name, del);

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
    if (players().length) d.active = d.active % players().length; else d.active = 0;
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
    [301, 501, 701].forEach((v) => {
      const b = mkBtn(String(v), "chip" + (d.start === v ? " is-active" : ""), () => setStart(v));
      row.appendChild(b);
    });
    const custom = document.createElement("input");
    custom.type = "number"; custom.min = "2"; custom.value = d.start; custom.className = "setup-num"; custom.title = "Custom start";
    custom.addEventListener("change", () => setStart(Math.max(2, Math.round(Number(custom.value) || 501))));
    row.appendChild(custom);

    const dbl = document.createElement("label");
    dbl.className = "opt";
    const chk = document.createElement("input"); chk.type = "checkbox"; chk.checked = d.doubleOut;
    chk.addEventListener("change", () => { d.doubleOut = chk.checked; save(); render(); });
    dbl.append(chk, document.createTextNode(" Double out"));
    row.appendChild(dbl);

    row.appendChild(mkBtn("Undo", "mini-btn", undoTurn));
    row.appendChild(mkBtn("New leg", "mini-btn", () => { if (confirm("Start a fresh leg?")) newLeg(); }));
    setup.appendChild(row);

    if (!ps.length) { grid.innerHTML = '<p class="muted">Add players, then throw. Enter each turn total (0–180); it counts down to zero.</p>'; return; }

    if (d.winnerId) {
      const w = ps.find((p) => p.id === d.winnerId);
      hint.innerHTML = `<strong>${w ? w.name : "Someone"} wins the leg.</strong> Start a new leg to play again.`;
    } else {
      const cur = ps[d.active];
      hint.textContent = `Enter ${cur ? cur.name : "the player"}'s turn total (0–180). Double out ${d.doubleOut ? "on" : "off"}.`;
    }

    // rank by remaining (lowest closest to winning)
    const byRem = [...ps].sort((a, b) => d.p[a.id].rem - d.p[b.id].rem);
    const posOf = new Map(); byRem.forEach((p, i) => posOf.set(p.id, i));

    ps.forEach((p, idx) => grid.appendChild(dartsCard(p, idx, posOf.get(p.id))));
  }

  function dartsCard(p, idx, pos) {
    const d = cfg().darts;
    const st = d.p[p.id];
    const isActive = !d.winnerId && idx === d.active;
    const isWinner = d.winnerId === p.id;

    const el = document.createElement("div");
    el.className = "score-card darts-card" + (isActive ? " active" : "") + (isWinner ? " winner" : "");

    const head = document.createElement("div");
    head.className = "score-head";
    const badge = document.createElement("span");
    badge.className = "rank";
    badge.textContent = isWinner ? "WIN" : `#${pos + 1}`;
    const name = document.createElement("input");
    name.className = "s-name"; name.value = p.name; name.setAttribute("aria-label", "Player name");
    name.addEventListener("input", () => { p.name = name.value; save(); });
    const del = mkBtn("remove", "link-btn", () => removePlayer(p.id));
    head.append(badge, name, del);

    const rem = document.createElement("div");
    rem.className = "s-score darts-rem"; rem.textContent = st.rem;

    const meta = document.createElement("div");
    meta.className = "darts-meta";
    const avg = st.thrown ? (st.scored / st.thrown * 3).toFixed(1) : "—";
    meta.textContent = `avg ${avg} · ${st.thrown} darts`;

    el.append(head, rem, meta);

    if (isActive) {
      const turn = document.createElement("div");
      turn.className = "darts-turn";
      const input = document.createElement("input");
      input.type = "number"; input.min = "0"; input.max = "180"; input.className = "darts-input";
      input.placeholder = "0–180"; input.setAttribute("aria-label", "Turn total");
      const go = mkBtn("Enter", "btn primary", () => { submitTurn(p, input.value); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submitTurn(p, input.value); });
      turn.append(input, go);
      el.appendChild(turn);
      requestAnimationFrame(() => input.focus());
    } else if (isWinner) {
      const b = document.createElement("div");
      b.className = "darts-badge"; b.textContent = "LEG WINNER";
      el.appendChild(b);
    }
    return el;
  }

  render();
}
