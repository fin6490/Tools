// scores.js — a multiplayer scoreboard for board games, darts, card nights, etc.
// Players + running scores, editable directly or via +/- (custom step).
import { getState, save } from "./storage.js?v=20260730b";

export function initScores(root) {
  const grid = root.querySelector("#scoreGrid");

  const players = () => getState().players;

  function render() {
    const ps = players();
    grid.innerHTML = "";
    if (!ps.length) {
      grid.innerHTML = '<p class="muted">No players yet — add a few to start keeping score.</p>';
      return;
    }
    // Live ranks (without reordering the cards, so editing stays stable).
    const sorted = [...ps].sort((a, b) => b.score - a.score);
    const rankOf = new Map();
    sorted.forEach((p, i) => rankOf.set(p.id, i));
    const top = sorted[0].score;
    const allEqual = sorted.every((p) => p.score === top);
    ps.forEach((p) => grid.appendChild(card(p, rankOf.get(p.id), top, ps.length, allEqual)));
  }

  function medal(rank) { return `#${rank + 1}`; }

  function card(p, rank, top, n, allEqual) {
    const el = document.createElement("div");
    el.className = "score-card";
    const isLeader = n > 1 && !allEqual && p.score === top;
    if (isLeader) el.classList.add("leader");

    const head = document.createElement("div");
    head.className = "score-head";
    const badge = document.createElement("span");
    badge.className = "rank";
    badge.textContent = n > 1 && !allEqual ? medal(rank) : "";
    const name = document.createElement("input");
    name.className = "s-name";
    name.value = p.name;
    name.setAttribute("aria-label", "Player name");
    name.addEventListener("input", () => { p.name = name.value; save(); });
    const del = document.createElement("button");
    del.className = "link-btn"; del.textContent = "remove";
    del.addEventListener("click", () => {
      const s = getState();
      s.players = s.players.filter((x) => x.id !== p.id);
      save(); render();
    });
    head.append(badge, name, del);

    const score = document.createElement("input");
    score.type = "number";
    score.className = "s-score";
    score.value = p.score;
    score.setAttribute("aria-label", "Score");
    score.addEventListener("input", () => {
      p.score = Math.round(Number(score.value) || 0);
      save();
      // refresh only the leader/rank chrome, keep focus in the field
      updateChrome();
    });

    const controls = document.createElement("div");
    controls.className = "s-controls";
    const minus = stepBtn("−", () => bump(p, -Math.abs(p.step || 1)));
    const step = document.createElement("input");
    step.type = "number"; step.min = "1"; step.value = p.step || 1;
    step.className = "s-step";
    step.setAttribute("aria-label", "Step");
    step.addEventListener("input", () => { p.step = Math.max(1, Math.round(Number(step.value) || 1)); save(); });
    const plus = stepBtn("＋", () => bump(p, Math.abs(p.step || 1)));
    controls.append(minus, step, plus);

    const chips = document.createElement("div");
    chips.className = "s-chips";
    [1, 5, 10].forEach((v) => {
      const c = document.createElement("button");
      c.className = "s-chip"; c.textContent = "+" + v;
      c.addEventListener("click", () => bump(p, v));
      chips.appendChild(c);
    });

    el.append(head, score, controls, chips);
    return el;
  }

  function stepBtn(label, fn) {
    const b = document.createElement("button");
    b.className = "c-step"; b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  function bump(p, by) {
    p.score = Math.round(p.score + by);
    save();
    render(); // re-render so ranks/leader update
  }

  // Update just leader highlight + rank badges after a direct score edit.
  function updateChrome() {
    const ps = players();
    if (!ps.length) return;
    const sorted = [...ps].sort((a, b) => b.score - a.score);
    const top = sorted[0].score;
    const allEqual = sorted.every((p) => p.score === top);
    const rankOf = new Map();
    sorted.forEach((p, i) => rankOf.set(p.id, i));
    [...grid.children].forEach((el, i) => {
      const p = ps[i];
      if (!p) return;
      const isLeader = ps.length > 1 && !allEqual && p.score === top;
      el.classList.toggle("leader", isLeader);
      const badge = el.querySelector(".rank");
      if (badge) badge.textContent = ps.length > 1 && !allEqual ? medal(rankOf.get(p.id)) : "";
    });
  }

  root.querySelector("#addPlayer").addEventListener("click", () => {
    const s = getState();
    s.players.push({ id: crypto.randomUUID(), name: "Player " + (s.players.length + 1), score: 0, step: 1 });
    save(); render();
  });

  root.querySelector("#newGame").addEventListener("click", () => {
    const s = getState();
    if (!s.players.length) return;
    if (!confirm("Reset every score to 0? (players are kept)")) return;
    s.players.forEach((p) => (p.score = 0));
    save(); render();
  });

  root.querySelector("#sortScores").addEventListener("click", () => {
    const s = getState();
    s.players.sort((a, b) => b.score - a.score);
    save(); render();
  });

  render();
}
