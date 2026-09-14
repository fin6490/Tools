// classquiz.js — Class quiz: a teacher-run team quiz for the whiteboard.
// Split the class into teams (optionally from a saved wheel), run through a
// question set, reveal each answer and award the point to the team that got it.
// Reuses the Dojo's question sets. Zero deps.
import { mathHtml, escapeHtml, shuffle, allSets, el } from "./quizkit.js?v=20260914g";
import { parseEntries } from "./wheel.js?v=20260914g";
import { getState, save } from "./storage.js?v=20260914g";
import * as sound from "./sound.js?v=20260914g";

export function initClassQuiz(root) {
  const panel = root.querySelector(".classquiz-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState();
    if (!s.classquiz) s.classquiz = { activeSetId: null, teamCount: 2, rosterWheelId: null };
    return s.classquiz;
  };
  const activeSet = () => { const sets = allSets(); return sets.find((x) => x.id === cfg().activeSetId) || sets[0]; };
  const wheels = () => getState().wheels || [];
  const roster = () => { const w = wheels().find((x) => x.id === cfg().rosterWheelId); return w ? parseEntries(w.text).map((s) => s.label).filter(Boolean) : []; };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  let live = null; // { teams:[{name,members,score}], queue, idx, revealed }

  const answersOf = (q) => (Array.isArray(q.answers) && q.answers.length) ? q.answers : [q.a];

  // Round-robin split of names into n teams (sizes differ by at most one).
  function splitTeams(names, n) {
    const teams = Array.from({ length: n }, (_, i) => ({ name: "Team " + (i + 1), members: [], score: 0 }));
    shuffle(names).forEach((nm, i) => teams[i % n].members.push(nm));
    return teams;
  }

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "classquiz-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Team quiz"));
    card.appendChild(el("h2", "dojo-title", "Class quiz"));
    card.appendChild(el("p", "dojo-lede", "Split the class into teams and run a quiz on the board. Reveal each answer, tap the team that got it, and the scores keep themselves. Uses any question set."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const sets = allSets();
    const setRow = el("div", "dojo-field");
    setRow.appendChild(el("label", "dojo-lbl", "Question set"));
    const sel = el("select", "dojo-select");
    sets.forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${s.questions.length})`; if (s.id === (cfg().activeSetId || sets[0].id)) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { cfg().activeSetId = sel.value; save(); });
    setRow.appendChild(sel);
    card.appendChild(setRow);

    const nRow = el("div", "dojo-field dojo-field-inline");
    nRow.appendChild(el("label", "dojo-lbl", "Teams"));
    const nSel = el("select", "dojo-select dojo-select-sm");
    [2, 3, 4, 5, 6].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === (cfg().teamCount || 2)) o.selected = true; nSel.appendChild(o); });
    nSel.addEventListener("change", () => { cfg().teamCount = +nSel.value; save(); renderLobby(); });
    nRow.appendChild(nSel);
    card.appendChild(nRow);

    // Optional: build teams from a saved class wheel.
    const clsRow = el("div", "dojo-field");
    clsRow.appendChild(el("label", "dojo-lbl", "Make teams from a class wheel (optional)"));
    const clsSel = el("select", "dojo-select");
    const none = el("option"); none.value = ""; none.textContent = "— named teams only —"; clsSel.appendChild(none);
    wheels().forEach((w) => { const o = el("option"); o.value = w.id; o.textContent = `${w.name} (${parseEntries(w.text).length})`; if (w.id === cfg().rosterWheelId) o.selected = true; clsSel.appendChild(o); });
    clsSel.addEventListener("change", () => { cfg().rosterWheelId = clsSel.value || null; save(); renderLobby(); });
    clsRow.appendChild(clsSel);
    card.appendChild(clsRow);

    // Preview the split so the teacher can read teams out.
    const names = roster();
    if (names.length) {
      const prev = splitTeams(names, cfg().teamCount || 2);
      const box = el("div", "classquiz-preview");
      prev.forEach((t) => box.appendChild(el("div", "classquiz-prevteam", `<strong>${t.name}</strong><br>${t.members.map(escapeHtml).join(", ") || "—"}`)));
      card.appendChild(box);
      const re = el("button", "btn ghost", "Re-shuffle teams"); re.addEventListener("click", () => renderLobby());
      card.appendChild(re);
    }

    const go = el("button", "btn primary dojo-begin", "Start quiz");
    go.addEventListener("click", () => { cfg().activeSetId = sel.value; cfg().teamCount = +nSel.value; save(); start(); });
    card.appendChild(go);
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function start() {
    const set = activeSet();
    if (!set || !set.questions.length) return;
    const names = roster();
    const teams = names.length ? splitTeams(names, cfg().teamCount || 2)
      : Array.from({ length: cfg().teamCount || 2 }, (_, i) => ({ name: "Team " + (i + 1), members: [], score: 0 }));
    live = { teams, queue: shuffle(set.questions), idx: -1, revealed: false };
    buildShell();
    nextQuestion();
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "classquiz-game", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="cqSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="cqMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="cqEnd">Finish</button>
        </span>
      </div>
      <div class="classquiz-scores" id="cqScores"></div>
      <div class="classquiz-stage">
        <p class="bingo-count" id="cqCount"></p>
        <div class="bingo-q" id="cqQ"></div>
        <div class="bingo-ans" id="cqAns" hidden></div>
        <button class="btn primary bingo-reveal" id="cqReveal">Reveal answer</button>
      </div>
      <div class="classquiz-award" id="cqAward" hidden></div>`));
    panel.querySelector("#cqSet").textContent = activeSet().name;
    updateMute();
    panel.querySelector("#cqMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#cqEnd").addEventListener("click", () => renderDone());
    panel.querySelector("#cqReveal").addEventListener("click", reveal);
    paintScores();
  }
  function updateMute() { const b = panel.querySelector("#cqMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function paintScores() {
    const box = panel.querySelector("#cqScores");
    if (!box) return;
    const lead = Math.max(...live.teams.map((t) => t.score));
    box.innerHTML = "";
    live.teams.forEach((t) => {
      const chip = el("div", "classquiz-score" + (t.score === lead && lead > 0 ? " lead" : ""), `<span class="classquiz-tname">${escapeHtml(t.name)}</span><span class="classquiz-tscore">${t.score}</span>`);
      box.appendChild(chip);
    });
  }

  function nextQuestion() {
    if (live.idx >= live.queue.length - 1) return renderDone();
    live.idx++; live.revealed = false;
    const q = live.queue[live.idx];
    panel.querySelector("#cqCount").textContent = `Question ${live.idx + 1} of ${live.queue.length}`;
    panel.querySelector("#cqQ").innerHTML = mathHtml(q.q);
    const ans = panel.querySelector("#cqAns"); ans.hidden = true; ans.innerHTML = "";
    panel.querySelector("#cqReveal").hidden = false;
    panel.querySelector("#cqAward").hidden = true;
    fx(sound.tick);
  }

  function reveal() {
    if (live.revealed) return;
    live.revealed = true;
    const q = live.queue[live.idx];
    const ans = panel.querySelector("#cqAns");
    ans.innerHTML = answersOf(q).map(mathHtml).join(' <span class="muted">/</span> ');
    ans.hidden = false;
    panel.querySelector("#cqReveal").hidden = true;
    fx(sound.beep);
    // Award row: tap the team that got it, or no one.
    const aw = panel.querySelector("#cqAward");
    aw.hidden = false; aw.innerHTML = "";
    aw.appendChild(el("span", "classquiz-awardlbl", "Who got it?"));
    live.teams.forEach((t, i) => {
      const b = el("button", "btn classquiz-awardbtn", escapeHtml(t.name) + " +1");
      b.addEventListener("click", () => { t.score++; paintScores(); fx(sound.fanfare); nextQuestion(); });
      aw.appendChild(b);
    });
    const skip = el("button", "btn ghost", "No one →");
    skip.addEventListener("click", () => nextQuestion());
    aw.appendChild(skip);
  }

  function renderDone() {
    panel.innerHTML = "";
    const card = el("div", "classquiz-lobby");
    card.appendChild(el("h2", "dojo-title", "Final scores"));
    const ranked = live.teams.slice().sort((a, b) => b.score - a.score);
    const top = ranked[0].score;
    const winners = ranked.filter((t) => t.score === top && top > 0).map((t) => t.name);
    card.appendChild(el("p", "dojo-res-name", winners.length ? (winners.length > 1 ? winners.join(" & ") + " tie!" : winners[0] + " wins!") : "No points scored"));
    const table = el("table", "dojo-lbtable");
    table.innerHTML = "<thead><tr><th>#</th><th class='l'>Team</th><th>Score</th></tr></thead>";
    const tb = el("tbody");
    ranked.forEach((t, i) => tb.appendChild(el("tr", i === 0 ? "top" : "", `<td>${i + 1}</td><td class='l'>${escapeHtml(t.name)}</td><td class='dojo-pts'>${t.score}</td>`)));
    table.appendChild(tb); card.appendChild(table);
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "New quiz"); again.addEventListener("click", () => renderLobby());
    row.appendChild(again);
    card.appendChild(row);
    panel.appendChild(card);
  }

  renderLobby();
}
