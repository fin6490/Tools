// numberwang.js — Numberwang: a gloriously nonsensical maths "game show", an
// affectionate homage to the sketch. Players take turns choosing a number; the
// host declares whether it's Numberwang — on no discernible logic whatsoever,
// which is entirely the point. Rotate the board! And of course, Wangernumb.
// Zero deps. All original code; no assets or scripts are copied.
import { el } from "./quizkit.js?v=20260915l";
import { getState, save } from "./storage.js?v=20260915l";
import * as sound from "./sound.js?v=20260915l";

const YES = ["That's NUMBERWANG!", "NUMBERWANG!", "Ooh — NUMBERWANG!", "Why, that's NUMBERWANG!", "Stone me, it's NUMBERWANG!"];
const NO = ["That's not Numberwang.", "No, sorry.", "Afraid not.", "Not this time.", "Nope — not Numberwang.", "Mmm, no."];
const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const pick = (a) => a[rint(a.length)];

export function initNumberwang(root) {
  const panel = root.querySelector(".numberwang-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.numberwang) s.numberwang = { target: 3, names: [] }; if (!Array.isArray(s.numberwang.names)) s.numberwang.names = []; return s.numberwang; };
  const nameOf = (i) => { const n = cfg().names; return (n[i] && n[i].trim()) ? n[i].trim() : "Player " + (i + 1); };

  let players, turn, target, over, busy, picks, wangernumb, wangered;

  // A round of gently absurd "maths" numbers to choose from.
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

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "nw-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Nonsense game show"));
    card.appendChild(el("h2", "dojo-title", "Numberwang"));
    card.appendChild(el("p", "dojo-lede", "The maths quiz that everyone loves to play! Take it in turns to choose a number, and find out if it's Numberwang. How is it decided? That's the fun of Numberwang — nobody knows. First to the target wins."));
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
    card.appendChild(el("p", "dojo-hint", "Best on the big screen with the whole class calling out. Remember: it's a bit of nonsense — the numbers mean nothing, and that's the joke."));
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function startGame() {
    target = cfg().target || 3;
    players = [{ name: nameOf(0), score: 0 }, { name: nameOf(1), score: 0 }];
    turn = 0; over = false; busy = false; picks = 0; wangernumb = false; wangered = false;
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
      <div class="nw-scores" id="nwScores"></div>
      <div class="nw-stage" id="nwStage"></div>
      <div class="nw-announce" id="nwAnnounce" hidden></div>`));
    updateMute();
    panel.querySelector("#nwMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#nwQuit").addEventListener("click", () => renderLobby());
    paintScores();
  }
  function updateMute() { const b = panel.querySelector("#nwMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function paintScores() {
    const box = panel.querySelector("#nwScores"); if (!box) return;
    box.innerHTML = "";
    players.forEach((p, i) => {
      const chip = el("div", "nw-score" + (turn === i && !over ? " on" : ""), `<span class="nw-pname">${p.name}</span><span class="nw-pscore">${p.score}</span>`);
      box.appendChild(chip);
    });
  }

  function renderTurn() {
    paintScores();
    const stage = panel.querySelector("#nwStage");
    stage.innerHTML = "";
    stage.classList.toggle("wangernumb", wangernumb);
    stage.appendChild(el("p", "nw-prompt", `${players[turn].name}, choose your number` + (wangernumb ? " (it's Wangernumb!)" : "")));
    const wrap = el("div", "nw-tiles");
    dealTiles().forEach((n) => {
      const b = el("button", "nw-tile", n);
      b.addEventListener("click", () => choose(n, b));
      wrap.appendChild(b);
    });
    stage.appendChild(wrap);
    stage.appendChild(el("p", "dojo-hint nw-sub", "Tap the number you'd like to play."));
  }

  function announce(text, cls, ms, cb) {
    const a = panel.querySelector("#nwAnnounce");
    a.className = "nw-announce " + cls; a.textContent = text; a.hidden = false;
    // retrigger the pop animation
    a.style.animation = "none"; void a.offsetWidth; a.style.animation = "";
    setTimeout(() => { a.hidden = true; if (cb) cb(); }, ms);
  }

  function choose(n, btn) {
    if (busy || over) return;
    busy = true; fx(sound.tick);
    panel.querySelectorAll(".nw-tile").forEach((b) => { b.disabled = true; if (b !== btn) b.classList.add("dim"); });
    btn.classList.add("chosen");
    // A moment of suspense, then the host decides — on no logic at all.
    announce("Is it Numberwang?", "thinking", 900, () => {
      const isWang = rint(100) < 38;
      if (isWang) {
        players[turn].score++; fx(sound.fanfare); paintScores();
        announce(pick(YES), "yes", 1600, afterVerdict);
      } else {
        fx(sound.buzz);
        announce(pick(NO), "no", 1300, afterVerdict);
      }
    });
  }

  function afterVerdict() {
    busy = false;
    if (players[turn].score >= target) return renderDone();
    picks++;
    // The running gags.
    if (!wangered && picks >= 5) { wangered = true; wangernumb = true; turn = turn ? 0 : 1;
      return announce("IT'S TIME FOR WANGERNUMB!", "wangernumb", 1700, renderTurn); }
    if (picks % 4 === 0) {
      const stage = panel.querySelector("#nwStage"); if (stage) stage.classList.add("rotate");
      turn = turn ? 0 : 1;
      return announce("ROTATE THE BOARD!", "rotate", 1500, () => { const s = panel.querySelector("#nwStage"); if (s) s.classList.remove("rotate"); renderTurn(); });
    }
    turn = turn ? 0 : 1;
    renderTurn();
  }

  function renderDone() {
    over = true;
    panel.innerHTML = "";
    const card = el("div", "nw-lobby");
    const champ = players[0].score > players[1].score ? players[0] : players[1];
    card.appendChild(el("h2", "dojo-title", "That's Numberwang!"));
    card.appendChild(el("p", "dojo-res-name", `${champ.name} is the Numberwang champion!`));
    card.appendChild(el("p", "dojo-lede", `Final: ${players[0].name} ${players[0].score} · ${players[1].name} ${players[1].score}. As ever, the numbers meant nothing.`));
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
