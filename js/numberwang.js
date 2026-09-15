// numberwang.js — Numberwang: a gloriously nonsensical maths "game show", an
// affectionate homage to the sketch. Players take turns choosing a number; the
// host declares whether it's Numberwang — on no discernible logic whatsoever,
// which is entirely the point. Now with extra pointless, confusing layers:
// meaningless meters, a shifting rulebook, silly round names, and zany events
// (Rotate the board! Diagonal board! Base 12! Recount! Wangernumb!).
// Zero deps. All original code; no assets or scripts are copied.
import { el } from "./quizkit.js?v=20260915m";
import { getState, save } from "./storage.js?v=20260915m";
import * as sound from "./sound.js?v=20260915m";

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
const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const pick = (a) => a[rint(a.length)];
const NONSENSE_LABELS = ["seven-ish", "a big one", "the blue number", "¾ish", "quite high", "Kevin", "a number", "borderline", "spicy 9", "not that one"];

export function initNumberwang(root) {
  const panel = root.querySelector(".numberwang-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.numberwang) s.numberwang = { target: 3, names: [] }; if (!Array.isArray(s.numberwang.names)) s.numberwang.names = []; return s.numberwang; };
  const nameOf = (i) => { const n = cfg().names; return (n[i] && n[i].trim()) ? n[i].trim() : "Player " + (i + 1); };

  let players, turn, target, over, busy, picks, roundIx;
  let mods; // cosmetic confusion layers

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
  // Cosmetic relabelling — the underlying pick is unchanged, of course.
  function displayLabel(n) {
    if (mods.nonsense && rint(2)) return pick(NONSENSE_LABELS);
    if (mods.base12) { const v = parseInt(n, 10); if (!isNaN(v) && v >= 0) return v.toString(12) + "₁₂"; }
    return n;
  }

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "nw-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Nonsense game show"));
    card.appendChild(el("h2", "dojo-title", "Numberwang"));
    card.appendChild(el("p", "dojo-lede", "The maths quiz that everyone loves to play! Take it in turns to choose a number, and find out if it's Numberwang. How is it decided? That's the fun of Numberwang — nobody knows. Mind the meters, obey the rulebook (it changes), and watch for Wangernumb. First to the target wins."));
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

    const go = el("button", "btn primary dojo-begin", "Let's play Numberwang!");
    go.addEventListener("click", () => { cfg().target = +tSel.value; save(); startGame(); });
    card.appendChild(go);
    card.appendChild(el("p", "dojo-hint", "Best on the big screen with the whole class calling out. Remember: it's a bit of nonsense — the numbers mean nothing, the meters mean less, and that's the joke."));
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function startGame() {
    target = cfg().target || 3;
    players = [{ name: nameOf(0), score: 0 }, { name: nameOf(1), score: 0 }];
    turn = 0; over = false; busy = false; picks = 0; roundIx = 0;
    mods = { rotate: false, diagonal: false, wangernumb: false, base12: false, nonsense: false };
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

  // Three utterly meaningless meters that jiggle every turn.
  function paintMeters() {
    const box = panel.querySelector("#nwMeters"); if (!box) return;
    const metrics = [
      ["Wangscore", rint(1000)],
      ["Confusion", rint(100) + "%"],
      ["Board temp", (rint(60) - 10) + "°"],
      ["Wang index", (rint(90) / 10).toFixed(1)],
    ];
    box.innerHTML = "";
    metrics.forEach(([k, v]) => box.appendChild(el("div", "nw-meter", `<span class="nw-mk">${k}</span><span class="nw-mv">${v}</span>`)));
  }

  function paintScores() {
    const box = panel.querySelector("#nwScores"); if (!box) return;
    box.innerHTML = "";
    players.forEach((p, i) => {
      const chip = el("div", "nw-score" + (turn === i && !over ? " on" : ""), `<span class="nw-pname">${p.name}</span><span class="nw-pscore">${p.score}</span>`);
      box.appendChild(chip);
    });
  }

  function applyMods() {
    const stage = panel.querySelector("#nwStage");
    if (!stage) return;
    stage.classList.toggle("rotate", mods.rotate);
    stage.classList.toggle("diagonal", mods.diagonal);
    stage.classList.toggle("wangernumb", mods.wangernumb);
  }

  function renderTurn() {
    paintScores(); paintMeters();
    const rule = panel.querySelector("#nwRule"); if (rule) rule.textContent = pick(RULES);
    const stage = panel.querySelector("#nwStage");
    stage.innerHTML = "";
    const round = ROUND_NAMES[roundIx % ROUND_NAMES.length];
    stage.appendChild(el("p", "nw-round", round + (mods.wangernumb ? " — WANGERNUMB" : "")));
    stage.appendChild(el("p", "nw-prompt", `${players[turn].name}, choose your number`));
    const wrap = el("div", "nw-tiles");
    dealTiles().forEach((n) => {
      const b = el("button", "nw-tile", displayLabel(n));
      b.addEventListener("click", () => choose(n, b));
      wrap.appendChild(b);
    });
    stage.appendChild(wrap);
    stage.appendChild(el("p", "dojo-hint nw-sub", "Tap the number you'd like to play. (The meters are watching.)"));
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
    // A few layers of pointless calculation before the host decides — on no logic.
    const steps = 2 + rint(2);
    let i = 0;
    const step = () => {
      if (i >= steps) return verdict();
      i++;
      announce(pick(CALC), "thinking", 620, step);
    };
    step();
  }

  function verdict() {
    const roll = rint(100);
    // In Wangernumb everything's backwards, allegedly — so the odds shuffle too.
    const wangChance = mods.wangernumb ? 55 : 42;
    if (roll < 8) {
      players[turn].score += 2; fx(sound.fanfare); paintScores();
      announce(pick(DOUBLE), "yes big", 1700, afterVerdict);
    } else if (roll < 16) {
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
    // Fire a zany, meaningless event now and then, then hand over.
    const ev = maybeEvent();
    turn = turn ? 0 : 1;
    busy = false;
    if (ev) announce(ev.text, ev.cls, 1500, () => { hideAnnounce(); renderTurn(); });
    else renderTurn();
  }

  // Returns an announcement to show, having tweaked the cosmetic mods. Never
  // touches the score, so the game always still ends.
  function maybeEvent() {
    if (rint(100) >= 55) return null; // most turns, nothing
    const roll = rint(6);
    if (roll === 0) { mods.rotate = !mods.rotate; return { text: "ROTATE THE BOARD!", cls: "event" }; }
    if (roll === 1) { mods.diagonal = !mods.diagonal; return { text: "THE BOARD IS NOW DIAGONAL!", cls: "event" }; }
    if (roll === 2) { mods.wangernumb = !mods.wangernumb; return { text: mods.wangernumb ? "IT'S TIME FOR WANGERNUMB!" : "Wangernumb is over. Probably.", cls: "wangernumb" }; }
    if (roll === 3) { mods.base12 = !mods.base12; return { text: mods.base12 ? "THE NUMBERS ARE NOW IN BASE 12!" : "Back to base 10. You're welcome.", cls: "event" }; }
    if (roll === 4) { mods.nonsense = !mods.nonsense; return { text: "THE NUMBERS HAVE GONE FUNNY!", cls: "event" }; }
    return { text: "RECOUNT! … (no change)", cls: "event" }; // pure theatre
  }

  function renderDone() {
    over = true;
    panel.innerHTML = "";
    const card = el("div", "nw-lobby");
    const champ = players[0].score > players[1].score ? players[0] : players[1];
    card.appendChild(el("h2", "dojo-title", "That's Numberwang!"));
    card.appendChild(el("p", "dojo-res-name", `${champ.name} is the Numberwang champion!`));
    card.appendChild(el("p", "dojo-lede", `Final: ${players[0].name} ${players[0].score} · ${players[1].name} ${players[1].score}. The meters, the rules and the numbers all meant nothing. As it should be.`));
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
