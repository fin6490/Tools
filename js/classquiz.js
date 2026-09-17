// classquiz.js — Class quiz: a teacher-run team quiz for the whiteboard.
// Split the class into teams (optionally from a saved wheel), then run the quiz
// straight through or in rounds — and each round can be a different type
// (mark as you go, a written round, or a double-points finale). Reuses the
// Dojo's question sets. Zero deps.
import { mathHtml, escapeHtml, shuffle, allSets, el, makeGenerateRow, fitBlock } from "./quizkit.js?v=20260915s";
import { parseEntries } from "./wheel.js?v=20260915s";
import { getState, save } from "./storage.js?v=20260915s";
import * as sound from "./sound.js?v=20260915s";

// The round types the teacher can pick before each round.
const ROUND_TYPES = {
  standard: { name: "Mark as you go", desc: "Reveal and mark each question one at a time.", flow: "mark", points: 1 },
  written:  { name: "Written round", desc: "Read all the questions first, teams write answers, then mark together.", flow: "written", points: 1 },
  double:   { name: "Double points", desc: "A written round worth double — great as a finale.", flow: "written", points: 2 },
  quickfire:{ name: "Quickfire", desc: "A 20-second clock on every question — beat the buzzer.", flow: "quick", points: 1 },
  bid:      { name: "Bonus bid", desc: "After the answer, the winning team bids 1, 2 or 3 points.", flow: "bid", points: 1 },
};

export function initClassQuiz(root) {
  const panel = root.querySelector(".classquiz-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState();
    if (!s.classquiz) s.classquiz = { activeSetId: null, teamCount: 2, rosterWheelId: null, roundSize: 5 };
    if (typeof s.classquiz.roundSize !== "number") s.classquiz.roundSize = 5;
    return s.classquiz;
  };
  const activeSet = () => { const sets = allSets(); return sets.find((x) => x.id === cfg().activeSetId) || sets[0]; };
  const wheels = () => getState().wheels || [];
  const roster = () => { const w = wheels().find((x) => x.id === cfg().rosterWheelId); return w ? parseEntries(w.text).map((s) => s.label).filter(Boolean) : []; };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  let live = null; // { teams, rounds:[[q..]], ri, rounded, type, phase, qi }
  let qTimer = null;
  const clearQTimer = () => { if (qTimer) { clearInterval(qTimer); qTimer = null; } };

  const answersOf = (q) => (Array.isArray(q.answers) && q.answers.length) ? q.answers : [q.a];
  // A team's display name — a custom one if set, else "Team N".
  const teamName = (i) => { const n = cfg().teamNames; return (n && n[i] && n[i].trim()) ? n[i].trim() : "Team " + (i + 1); };
  function splitTeams(names, n) {
    const teams = Array.from({ length: n }, (_, i) => ({ name: teamName(i), members: [], score: 0 }));
    shuffle(names).forEach((nm, i) => teams[i % n].members.push(nm));
    return teams;
  }
  function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "classquiz-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Team quiz"));
    card.appendChild(el("h2", "dojo-title", "Class quiz"));
    card.appendChild(el("p", "dojo-lede", "Split the class into teams and run a quiz on the board — straight through or in rounds. Reveal each answer, tap the team that got it, and the scores keep themselves."));
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

    const nRow = el("div", "dojo-field dojo-field-inline");
    nRow.appendChild(el("label", "dojo-lbl", "Teams"));
    const nSel = el("select", "dojo-select dojo-select-sm");
    [2, 3, 4, 5, 6, 7, 8].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === (cfg().teamCount || 2)) o.selected = true; nSel.appendChild(o); });
    nSel.addEventListener("change", () => { cfg().teamCount = +nSel.value; save(); renderLobby(); });
    nRow.appendChild(nSel);
    card.appendChild(nRow);

    // Optional custom team names — one input per team.
    const namesRow = el("div", "dojo-field");
    namesRow.appendChild(el("label", "dojo-lbl", "Team names (optional)"));
    const namesGrid = el("div", "classquiz-names");
    if (!Array.isArray(cfg().teamNames)) cfg().teamNames = [];
    for (let i = 0; i < (cfg().teamCount || 2); i++) {
      const inp = el("input", "dojo-input classquiz-nameinput");
      inp.placeholder = "Team " + (i + 1); inp.maxLength = 24;
      inp.value = cfg().teamNames[i] || "";
      inp.addEventListener("input", () => { cfg().teamNames[i] = inp.value; save(); });
      namesGrid.appendChild(inp);
    }
    namesRow.appendChild(namesGrid);
    card.appendChild(namesRow);

    // Rounds: 0 = straight through; otherwise questions per round.
    const rRow = el("div", "dojo-field dojo-field-inline");
    rRow.appendChild(el("label", "dojo-lbl", "Rounds"));
    const rSel = el("select", "dojo-select dojo-select-sm");
    [[0, "No rounds"], [3, "3 per round"], [5, "5 per round"], [8, "8 per round"], [10, "10 per round"]].forEach(([v, t]) => { const o = el("option"); o.value = v; o.textContent = t; if (v === cfg().roundSize) o.selected = true; rSel.appendChild(o); });
    rSel.addEventListener("change", () => { cfg().roundSize = +rSel.value; save(); });
    rRow.appendChild(rSel);
    card.appendChild(rRow);

    const clsRow = el("div", "dojo-field");
    clsRow.appendChild(el("label", "dojo-lbl", "Make teams from a class wheel (optional)"));
    const clsSel = el("select", "dojo-select");
    const none = el("option"); none.value = ""; none.textContent = "— named teams only —"; clsSel.appendChild(none);
    wheels().forEach((w) => { const o = el("option"); o.value = w.id; o.textContent = `${w.name} (${parseEntries(w.text).length})`; if (w.id === cfg().rosterWheelId) o.selected = true; clsSel.appendChild(o); });
    clsSel.addEventListener("change", () => { cfg().rosterWheelId = clsSel.value || null; save(); renderLobby(); });
    clsRow.appendChild(clsSel);
    card.appendChild(clsRow);

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
    go.addEventListener("click", () => { cfg().activeSetId = sel.value; cfg().teamCount = +nSel.value; cfg().roundSize = +rSel.value; save(); start(); });
    card.appendChild(go);
    if (cfg().roundSize > 0) card.appendChild(el("p", "dojo-hint", "With rounds on you'll pick a round type before each round — mark as you go, written, double points, quickfire or bonus bid."));
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function start() {
    const set = activeSet();
    if (!set || !set.questions.length) return;
    const names = roster();
    const teams = names.length ? splitTeams(names, cfg().teamCount || 2)
      : Array.from({ length: cfg().teamCount || 2 }, (_, i) => ({ name: teamName(i), members: [], score: 0 }));
    const all = shuffle(set.questions);
    const size = cfg().roundSize || 0;
    const rounds = size > 0 ? chunk(all, size) : [all];
    live = { teams, rounds, ri: 0, rounded: size > 0, type: "standard", phase: "mark", qi: 0 };
    buildShell();
    if (live.rounded) renderRoundIntro(); else beginRound("standard");
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
      <div class="classquiz-body" id="cqBody"></div>`));
    panel.querySelector("#cqSet").textContent = activeSet().name;
    updateMute();
    panel.querySelector("#cqMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#cqEnd").addEventListener("click", () => renderDone());
    paintScores();
  }
  function updateMute() { const b = panel.querySelector("#cqMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }
  const body = () => panel.querySelector("#cqBody");

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

  /* ---------- round intro: choose the type ---------- */
  function renderRoundIntro() {
    paintScores();
    const b = body(); b.innerHTML = "";
    b.appendChild(el("p", "bingo-count", `Round ${live.ri + 1} of ${live.rounds.length} · ${live.rounds[live.ri].length} questions`));
    b.appendChild(el("h3", "classquiz-roundtitle", "Choose the round type"));
    const opts = el("div", "classquiz-types");
    Object.entries(ROUND_TYPES).forEach(([k, t]) => {
      const btn = el("button", "classquiz-type", `<strong>${t.name}</strong><span>${t.desc}</span>`);
      btn.addEventListener("click", () => beginRound(k));
      opts.appendChild(btn);
    });
    b.appendChild(opts);
  }

  function beginRound(k) {
    live.type = k; live.qi = 0;
    live.phase = ROUND_TYPES[k].flow === "written" ? "ask" : "mark";
    renderPhase();
  }
  function renderPhase() { live.phase === "ask" ? renderAsk() : renderMark(); }

  /* ---------- written round: read all the questions first ---------- */
  function renderAsk() {
    paintScores();
    const round = live.rounds[live.ri], q = round[live.qi], b = body();
    b.innerHTML = "";
    b.appendChild(el("p", "bingo-count", `${ROUND_TYPES[live.type].name} · Question ${live.qi + 1} of ${round.length} — teams write your answer`));
    const stage = el("div", "classquiz-stage");
    const qEl = el("div", "bingo-q", mathHtml(q.q)); stage.appendChild(qEl);
    b.appendChild(stage);
    fitBlock(qEl, 0.34, 60, 22);
    const next = el("button", "btn primary bingo-next", live.qi < round.length - 1 ? "Next question →" : "Mark the round →");
    next.addEventListener("click", () => { if (live.qi < round.length - 1) { live.qi++; renderAsk(); } else { live.phase = "mark"; live.qi = 0; renderMark(); } });
    b.appendChild(next);
    fx(sound.tick);
  }

  /* ---------- mark: reveal answer, award the point ---------- */
  function renderMark() {
    clearQTimer();
    paintScores();
    const round = live.rounds[live.ri], q = round[live.qi], type = ROUND_TYPES[live.type], b = body();
    b.innerHTML = "";
    b.appendChild(el("p", "bingo-count", `${type.name} · Question ${live.qi + 1} of ${round.length}`));
    const stage = el("div", "classquiz-stage");
    const clockEl = type.flow === "quick" ? el("div", "classquiz-clock", "20") : null;
    if (clockEl) stage.appendChild(clockEl);
    const qEl = el("div", "bingo-q", mathHtml(q.q)); stage.appendChild(qEl);
    const ans = el("div", "bingo-ans"); ans.hidden = true; stage.appendChild(ans);
    const reveal = el("button", "btn primary bingo-reveal", "Reveal answer"); stage.appendChild(reveal);
    b.appendChild(stage);
    fitBlock(qEl, 0.34, 60, 22);
    const aw = el("div", "classquiz-award"); aw.hidden = true; b.appendChild(aw);

    const doReveal = () => {
      clearQTimer();
      ans.innerHTML = answersOf(q).map(mathHtml).join(' <span class="muted">/</span> '); ans.hidden = false;
      fitBlock(ans, 0.3, 54, 20);
      reveal.hidden = true; fx(sound.beep);
      aw.hidden = false; aw.innerHTML = "";
      if (type.flow === "bid") {
        // Tap the team that got it, then how many they bid (1–3).
        aw.appendChild(el("span", "classquiz-awardlbl", "Who got it?"));
        live.teams.forEach((t) => {
          const btn = el("button", "btn classquiz-awardbtn", escapeHtml(t.name));
          btn.addEventListener("click", () => askBid(t, aw));
          aw.appendChild(btn);
        });
        const skip = el("button", "btn ghost", "No one →"); skip.addEventListener("click", () => advanceMark());
        aw.appendChild(skip);
      } else {
        // Tap every team that got it right (tap again to undo), then Next —
        // more than one team can score on the same question.
        aw.appendChild(el("span", "classquiz-awardlbl", `Who got it? (+${type.points} each — tap all that did)`));
        const awarded = new Set();
        live.teams.forEach((t, i) => {
          const btn = el("button", "btn classquiz-awardbtn", `${escapeHtml(t.name)} +${type.points}`);
          btn.addEventListener("click", () => {
            if (awarded.has(i)) { awarded.delete(i); t.score -= type.points; btn.classList.remove("awarded"); }
            else { awarded.add(i); t.score += type.points; btn.classList.add("awarded"); fx(sound.fanfare); }
            paintScores();
          });
          aw.appendChild(btn);
        });
        const next = el("button", "btn primary classquiz-awardnext", "Next →");
        next.addEventListener("click", () => advanceMark());
        aw.appendChild(next);
      }
    };
    reveal.addEventListener("click", doReveal);

    if (type.flow === "quick") {
      let t = 20;
      qTimer = setInterval(() => {
        t--; if (clockEl) { clockEl.textContent = t; clockEl.classList.toggle("low", t <= 5); }
        if (t <= 5 && t > 0) fx(sound.tick);
        if (t <= 0) { clearQTimer(); fx(sound.buzz); if (!live.roundOver && ans.hidden) doReveal(); }
      }, 1000);
    }
    fx(sound.tick);
  }
  function askBid(team, aw) {
    aw.innerHTML = "";
    aw.appendChild(el("span", "classquiz-awardlbl", `${escapeHtml(team.name)} bids…`));
    [1, 2, 3].forEach((n) => {
      const btn = el("button", "btn classquiz-awardbtn", `+${n}`);
      btn.addEventListener("click", () => { team.score += n; paintScores(); fx(sound.fanfare); advanceMark(); });
      aw.appendChild(btn);
    });
  }
  function advanceMark() {
    clearQTimer();
    const round = live.rounds[live.ri];
    if (live.qi < round.length - 1) { live.qi++; renderMark(); } else endRound();
  }

  function endRound() {
    clearQTimer();
    if (!live.rounded || live.ri >= live.rounds.length - 1) return renderDone();
    paintScores();
    const b = body(); b.innerHTML = "";
    b.appendChild(el("h3", "classquiz-roundtitle", `End of round ${live.ri + 1}`));
    const ranked = live.teams.slice().sort((a, c) => c.score - a.score);
    b.appendChild(el("p", "dojo-lede", "Scores so far — " + ranked.map((t) => `${t.name} ${t.score}`).join(" · ")));
    const next = el("button", "btn primary", "Next round →");
    next.addEventListener("click", () => { live.ri++; renderRoundIntro(); });
    b.appendChild(next);
    fx(sound.fanfare);
  }

  /* ---------- final standings ---------- */
  function renderDone() {
    clearQTimer();
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
