// numberwang.js — Numberwang: a gloriously nonsensical maths "game show", an
// affectionate homage to the sketch. Players take turns choosing a number; the
// host declares whether it's Numberwang — on no discernible logic whatsoever.
//
// It opens straight, like the sketch (just "choose a number" → "Is it
// Numberwang?"), and builds in the chaos as the game goes on: a shifting
// rulebook, meaningless meters, silly round names, and zany events (Rotate the
// board! Diagonal! Base 12! Wangernumb!). An optional Maths mode makes players
// solve a real question — auto arithmetic or one of your Dojo sets — to unlock
// their pick. Zero deps. All original code; no assets or scripts are copied.
import { el, mathHtml, allSets, isCorrect, answersOf, shuffle } from "./quizkit.js?v=20260916k";
import { getState, save } from "./storage.js?v=20260916k";
import * as sound from "./sound.js?v=20260916k";

const YES = ["That's NUMBERWANG!", "NUMBERWANG!", "Ooh — NUMBERWANG!", "Why, that's NUMBERWANG!", "Stone me, it's NUMBERWANG!", "Get in — NUMBERWANG!"];
const DOUBLE = ["DOUBLE NUMBERWANG!", "It's a DOUBLE NUMBERWANG!!", "Twice the wang — DOUBLE NUMBERWANG!"];
const SILENT = ["…(that's a Silent Numberwang)", "shhh — Silent Numberwang", "a quiet little Numberwang"];
const NO = ["That's not Numberwang.", "No, sorry.", "Afraid not.", "Not this time.", "Nope — not Numberwang.", "Mmm, no.", "That's just a number.", "Ooh, so close. No."];
const CALC = [
  "Consulting the Numberwang matrix…", "Carrying the 3…", "Inverting the wang…",
  "Cross-referencing the Wangernumb tables…", "Applying Rule 7…", "Dividing by the board temperature…",
  "Asking the studio audience…", "Rounding to the nearest wang…", "Checking with the adjudicator…",
  "Reticulating splines…", "Comparing against yesterday's numbers…", "Warming up the buzzer…",
];
const ROUND_NAMES = ["Round 1", "Round 2", "Round 2 (again)", "Round 7", "Round π", "The Golden Round", "Bonus Round", "Round √-1", "Round 2 (b)", "The Quiet Round", "Round 40", "The Wanger Round"];
const RULES = [
  "Rule 7: even numbers are twice as odd today.",
  "Rule 12: the number 8 is on holiday.",
  "Rule 3: diagonal numbers count double, except when they don't.",
  "Rule 40: no primes after teatime.",
  "Rule 1: there are no rules. Except Rule 1.",
  "Rule 9: Wangernumb is always closer than it appears.",
  "Rule 22: a chosen number may not be un-chosen. Or may it.",
  "Rule 5: numbers ending in 5 are simply showing off.",
  "Rule ∞: consult Rule ∞.",
  "Rule 6: the board is legally a triangle.",
];
const NONSENSE_LABELS = ["seven-ish", "a big one", "the blue number", "¾ish", "quite high", "Kevin", "a number", "borderline", "spicy 9", "not that one"];
const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const pick = (a) => a[rint(a.length)];

export function initNumberwang(root) {
  const panel = root.querySelector(".numberwang-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => {
    const s = getState();
    if (!s.numberwang) s.numberwang = { target: 3, names: [], maths: false, mathSet: "auto" };
    if (!Array.isArray(s.numberwang.names)) s.numberwang.names = [];
    return s.numberwang;
  };
  const nameOf = (i) => { const n = cfg().names; return (n[i] && n[i].trim()) ? n[i].trim() : "Player " + (i + 1); };

  let players, turn, target, over, busy, picks, roundIx, maths, mathSet, mods;

  // The chaos ramps up with each pick: 0 = straight sketch, 3 = full mania.
  const chaos = () => (picks < 2 ? 0 : picks < 4 ? 1 : picks < 7 ? 2 : 3);

  function dealTiles() {
    const out = new Set();
    while (out.size < 6) {
      const roll = rint(10);
      if (roll < 6) out.add(String(1 + rint(99)));
      else if (roll < 8) out.add(String((1 + rint(20)) + "." + rint(10)));
      else if (roll < 9) out.add(String(-(1 + rint(12))));
      else out.add(pick(["42", "0", "7", "88", "3.14", "1,000", "½", "173"]));
    }
    return [...out];
  }
  function displayLabel(n) {
    if (mods.nonsense && rint(2)) return pick(NONSENSE_LABELS);
    if (mods.base12) { const v = parseInt(n, 10); if (!isNaN(v) && v >= 0) return v.toString(12) + "₁₂"; }
    return n;
  }

  /* ---------- maths questions (real skill layer) ---------- */
  function genSum() {
    const op = pick(["+", "−", "×", "÷"]);
    let a, b, ans;
    if (op === "+") { a = 10 + rint(90); b = 10 + rint(90); ans = a + b; }
    else if (op === "−") { a = 20 + rint(80); b = 1 + rint(a - 1); ans = a - b; }
    else if (op === "×") { a = 2 + rint(11); b = 2 + rint(11); ans = a * b; }
    else { b = 2 + rint(11); ans = 2 + rint(11); a = b * ans; }
    const opts = new Set([ans]);
    while (opts.size < 4) { const d = ans + (rint(11) - 5); if (d >= 0 && d !== ans) opts.add(d); }
    return { q: `${a} ${op} ${b}`, ans: String(ans), options: shuffle([...opts].map(String)) };
  }
  function setQuestion() {
    const set = allSets().find((s) => s.id === mathSet);
    if (!set || !set.questions.length) return genSum();
    const q = pick(set.questions);
    const correct = answersOf(q).map(String);
    const opts = new Set(correct.slice(0, 1));
    (q.distractors || []).forEach((d) => opts.add(String(d)));
    // pad from other questions if we don't have enough options
    for (const other of shuffle(set.questions)) { if (opts.size >= 4) break; opts.add(String(other.a)); }
    return { q: q.q, check: (v) => isCorrect(q, v), options: shuffle([...opts]).slice(0, 4) };
  }
  const nextQuestion = () => (mathSet === "auto" ? genSum() : setQuestion());

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "nw-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Nonsense game show"));
    card.appendChild(el("h2", "dojo-title", "Numberwang"));
    card.appendChild(el("p", "dojo-lede", "The maths quiz that everyone loves to play!"));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const namesRow = el("div", "dojo-field");
    namesRow.appendChild(el("label", "dojo-lbl", "Contestants (optional names)"));
    const grid = el("div", "nw-names");
    for (let i = 0; i < 2; i++) {
      const inp = el("input", "dojo-input nw-nameinput"); inp.placeholder = "Player " + (i + 1); inp.maxLength = 20;
      inp.value = cfg().names[i] || "";
      inp.addEventListener("input", () => { cfg().names[i] = inp.value; save(); });
      grid.appendChild(inp);
    }
    namesRow.appendChild(grid);
    card.appendChild(namesRow);

    const tRow = el("div", "dojo-field dojo-field-inline");
    tRow.appendChild(el("label", "dojo-lbl", "Numberwangs to win"));
    const tSel = el("select", "dojo-select dojo-select-sm");
    [3, 5, 7].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === (cfg().target || 3)) o.selected = true; tSel.appendChild(o); });
    tSel.addEventListener("change", () => { cfg().target = +tSel.value; save(); });
    tRow.appendChild(tSel);
    card.appendChild(tRow);

    // Optional real-maths twist.
    const mRow = el("label", "nw-check");
    const cb = el("input"); cb.type = "checkbox"; cb.checked = !!cfg().maths;
    mRow.append(cb, document.createTextNode(" Maths mode"));
    card.appendChild(mRow);

    const srcRow = el("div", "dojo-field"); srcRow.hidden = !cfg().maths;
    srcRow.appendChild(el("label", "dojo-lbl", "Questions from"));
    const srcSel = el("select", "dojo-select");
    const auto = el("option"); auto.value = "auto"; auto.textContent = "Auto arithmetic (+ − × ÷)"; srcSel.appendChild(auto);
    allSets().forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${s.questions.length})`; if (s.id === cfg().mathSet) o.selected = true; srcSel.appendChild(o); });
    srcSel.addEventListener("change", () => { cfg().mathSet = srcSel.value; save(); });
    srcRow.appendChild(srcSel);
    card.appendChild(srcRow);
    cb.addEventListener("change", () => { cfg().maths = cb.checked; save(); srcRow.hidden = !cb.checked; });

    const go = el("button", "btn primary dojo-begin", "Let's play Numberwang!");
    go.addEventListener("click", () => { cfg().target = +tSel.value; cfg().maths = cb.checked; cfg().mathSet = srcSel.value; save(); startGame(); });
    card.appendChild(go);
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function startGame() {
    target = cfg().target || 3;
    maths = !!cfg().maths; mathSet = cfg().mathSet || "auto";
    players = [{ name: nameOf(0), score: 0 }, { name: nameOf(1), score: 0 }];
    turn = 0; over = false; busy = false; picks = 0; roundIx = 0;
    mods = { flip: false, diagonal: false, wangernumb: false, base12: false, nonsense: false };
    buildShell();
    renderTurn();
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "nw-game", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="nwSet">Numberwang</span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="nwMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="nwQuit">Finish</button>
        </span>
      </div>
      <div class="nw-meters" id="nwMeters"></div>
      <div class="nw-scores" id="nwScores"></div>
      <div class="nw-stage" id="nwStage"></div>
      <p class="nw-rule" id="nwRule"></p>
      <div class="nw-announce" id="nwAnnounce" hidden></div>`));
    updateMute();
    panel.querySelector("#nwMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#nwQuit").addEventListener("click", () => renderLobby());
    paintScores();
  }
  function updateMute() { const b = panel.querySelector("#nwMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function paintMeters(c) {
    const box = panel.querySelector("#nwMeters"); if (!box) return;
    box.innerHTML = "";
    if (c < 2) return; // meters only once the chaos gets going
    [["Wangscore", rint(1000)], ["Confusion", rint(100) + "%"], ["Board temp", (rint(60) - 10) + "°"], ["Wang index", (rint(90) / 10).toFixed(1)]]
      .forEach(([k, v]) => box.appendChild(el("div", "nw-meter", `<span class="nw-mk">${k}</span><span class="nw-mv">${v}</span>`)));
  }
  function paintRule(c) {
    const r = panel.querySelector("#nwRule"); if (!r) return;
    r.textContent = c >= 1 ? pick(RULES) : "";
  }
  function paintScores() {
    const box = panel.querySelector("#nwScores"); if (!box) return;
    box.innerHTML = "";
    players.forEach((p, i) => box.appendChild(el("div", "nw-score" + (turn === i && !over ? " on" : ""), `<span class="nw-pname">${p.name}</span><span class="nw-pscore">${p.score}</span>`)));
  }
  function applyMods() {
    const stage = panel.querySelector("#nwStage"); if (!stage) return;
    stage.classList.toggle("flip", mods.flip);
    stage.classList.toggle("diagonal", mods.diagonal);
    stage.classList.toggle("wangernumb", mods.wangernumb);
  }

  function renderTurn() {
    const c = chaos();
    paintScores(); paintMeters(c); paintRule(c);
    if (maths) renderQuestion(); else renderBoard();
  }

  /* ---------- maths phase ---------- */
  function renderQuestion() {
    const c = chaos();
    const stage = panel.querySelector("#nwStage");
    stage.className = "nw-stage"; stage.innerHTML = "";
    if (c >= 1) stage.appendChild(el("p", "nw-round", ROUND_NAMES[roundIx % ROUND_NAMES.length] + (mods.wangernumb ? " — WANGERNUMB" : "")));
    stage.appendChild(el("p", "nw-prompt", `${players[turn].name}, your question`));
    const q = nextQuestion();
    stage.appendChild(el("div", "nw-question", mathHtml(q.q)));
    const wrap = el("div", "nw-qopts");
    q.options.forEach((opt) => {
      const b = el("button", "nw-qopt", mathHtml(opt));
      b.addEventListener("click", () => {
        if (busy) return;
        const ok = q.check ? q.check(opt) : String(opt) === q.ans;
        if (ok) { fx(sound.beep); busy = true; wrap.querySelectorAll("button").forEach((x) => x.disabled = true); b.classList.add("right"); setTimeout(() => { busy = false; renderBoard(); }, 450); }
        else { fx(sound.buzz); b.classList.add("wrong"); b.disabled = true; }
      });
      wrap.appendChild(b);
    });
    stage.appendChild(wrap);
    applyMods();
  }

  /* ---------- number phase ---------- */
  function renderBoard() {
    const c = chaos();
    const stage = panel.querySelector("#nwStage");
    stage.className = "nw-stage"; stage.innerHTML = "";
    if (c >= 1) stage.appendChild(el("p", "nw-round", ROUND_NAMES[roundIx % ROUND_NAMES.length] + (mods.wangernumb ? " — WANGERNUMB" : "")));
    stage.appendChild(el("p", "nw-prompt", `${players[turn].name}, choose your number`));
    const wrap = el("div", "nw-tiles");
    dealTiles().forEach((n) => {
      const b = el("button", "nw-tile", displayLabel(n));
      b.addEventListener("click", () => choose(n, b));
      wrap.appendChild(b);
    });
    stage.appendChild(wrap);
    applyMods();
  }

  function announce(text, cls, ms, cb) {
    const a = panel.querySelector("#nwAnnounce");
    a.className = "nw-announce " + cls; a.innerHTML = text; a.hidden = false;
    a.style.animation = "none"; void a.offsetWidth; a.style.animation = "";
    setTimeout(() => { if (cb) cb(); }, ms);
  }
  const hideAnnounce = () => { const a = panel.querySelector("#nwAnnounce"); if (a) a.hidden = true; };

  function choose(n, btn) {
    if (busy || over) return;
    busy = true; fx(sound.tick);
    panel.querySelectorAll(".nw-tile").forEach((b) => { b.disabled = true; if (b !== btn) b.classList.add("dim"); });
    btn.classList.add("chosen");
    const c = chaos();
    // Level 0 keeps it straight, like the sketch. Higher levels pile on the
    // pointless "calculating" steps.
    const steps = c === 0 ? 1 : c === 1 ? 1 : 2 + rint(2);
    let i = 0;
    const step = () => {
      if (i >= steps) return verdict();
      const phrase = (c === 0) ? "Is it Numberwang?" : pick(CALC);
      i++;
      announce(phrase, "thinking", c === 0 ? 800 : 600, step);
    };
    step();
  }

  function verdict() {
    const c = chaos();
    const roll = rint(100);
    const wangChance = mods.wangernumb ? 55 : 42;
    // Double / Silent Numberwang only turn up once the chaos is under way.
    if (c >= 2 && roll < 8) {
      players[turn].score += 2; fx(sound.fanfare); paintScores();
      announce(pick(DOUBLE), "yes big", 1700, afterVerdict);
    } else if (c >= 2 && roll < 16) {
      players[turn].score += 1; fx(sound.beep); paintScores();
      announce(pick(SILENT), "silent", 1400, afterVerdict);
    } else if (roll < wangChance) {
      players[turn].score += 1; fx(sound.fanfare); paintScores();
      announce(pick(YES), "yes", 1500, afterVerdict);
    } else {
      fx(sound.buzz);
      announce(pick(NO), "no", 1300, afterVerdict);
    }
  }

  function afterVerdict() {
    hideAnnounce();
    if (players[turn].score >= target) return renderDone();
    picks++;
    if (picks % 3 === 0) roundIx++;
    const ev = maybeEvent(chaos());
    turn = turn ? 0 : 1;
    busy = false;
    if (ev) {
      // A full, slow, utterly pointless 360° spin of the whole board — it ends
      // up exactly where it started, of course.
      if (ev.spin) { const st = panel.querySelector("#nwStage"); if (st) { st.classList.remove("spin"); void st.offsetWidth; st.classList.add("spin"); } }
      announce(ev.text, ev.cls, ev.spin ? 1750 : 1500, () => { hideAnnounce(); renderTurn(); });
    } else renderTurn();
  }

  // Cosmetic-only events; they never touch the score, so the game always ends.
  // They unlock in waves as the chaos level climbs.
  function maybeEvent(c) {
    if (c === 0) return null;                 // pure sketch — no gags yet
    if (rint(100) >= (c === 1 ? 35 : 60)) return null;
    const roll = c === 1 ? rint(2) : rint(7); // level 1 only gets the gentle ones
    if (roll === 0) { return { text: "ROTATE THE BOARD!", cls: "event", spin: true }; } // full pointless 360
    if (roll === 1) { mods.wangernumb = !mods.wangernumb; return { text: mods.wangernumb ? "IT'S TIME FOR WANGERNUMB!" : "Wangernumb is over. Probably.", cls: "wangernumb" }; }
    if (roll === 2) { mods.diagonal = !mods.diagonal; return { text: "THE BOARD IS NOW DIAGONAL!", cls: "event" }; }
    if (roll === 3) { mods.base12 = !mods.base12; return { text: mods.base12 ? "THE NUMBERS ARE NOW IN BASE 12!" : "Back to base 10. You're welcome.", cls: "event" }; }
    if (roll === 4) { mods.nonsense = !mods.nonsense; return { text: "THE NUMBERS HAVE GONE FUNNY!", cls: "event" }; }
    if (roll === 5) { mods.flip = !mods.flip; return { text: mods.flip ? "FLIP THE BOARD!" : "The board is the right way up again.", cls: "event" }; } // persistent 180
    return { text: "RECOUNT! … (no change)", cls: "event" };
  }

  function renderDone() {
    over = true;
    panel.innerHTML = "";
    const card = el("div", "nw-lobby");
    const champ = players[0].score > players[1].score ? players[0] : players[1];
    card.appendChild(el("h2", "dojo-title", "That's Numberwang!"));
    card.appendChild(el("p", "dojo-res-name", `${champ.name} is the Numberwang champion!`));
    card.appendChild(el("p", "dojo-lede", `${players[0].name} ${players[0].score} · ${players[1].name} ${players[1].score}`));
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", "Play again"); again.addEventListener("click", () => startGame());
    const back = el("button", "btn ghost", "New game"); back.addEventListener("click", () => renderLobby());
    row.append(again, back);
    card.appendChild(row);
    panel.appendChild(card);
    fx(sound.fanfare);
  }

  renderLobby();
}
