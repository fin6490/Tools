// lexicon.js — Lexicon: a five-letter word guessing game in the SpinDecks style
// (a "Wordle"-style puzzle). Six guesses; each letter turns green (right spot),
// amber (in the word, wrong spot) or grey (not in the word). A daily word the
// same for everyone, a practice mode, or a custom word a teacher sets for the
// class. Zero deps.
import { el } from "./quizkit.js?v=20260916l";
import { getState, save } from "./storage.js?v=20260916l";
import * as sound from "./sound.js?v=20260916l";

// A curated pool of common five-letter answers (used for daily + practice).
const WORDS = ["APPLE","BEACH","BRAIN","BREAD","BRUSH","CHAIR","CHEST","CHORD","CLICK","CLOCK","CLOUD","DANCE","DIARY","DRINK","EARTH","FLAME","FLOOR","FRUIT","GHOST","GLASS","GRAPE","GREEN","HEART","HORSE","HOUSE","JUICE","LIGHT","LEMON","MONEY","MONTH","MUSIC","NIGHT","OCEAN","PAINT","PAPER","PEACE","PIANO","PILOT","PIZZA","PLANT","PLATE","POWER","QUEEN","RADIO","RIVER","ROBOT","SHEEP","SHIRT","SMILE","SNAKE","SNOW","SOUND","SPACE","SPOON","STORM","STONE","SUGAR","TABLE","TIGER","TOAST","TOOTH","TOWER","TRAIN","TREE","TRUCK","WATCH","WATER","WHALE","WHEEL","WORLD","ZEBRA","BERRY","CANDY","CLOWN","CROWN","DREAM","EAGLE","FENCE","FIELD","FLOUR","FROST","GIANT","GLOVE","GRASS","HONEY","IGLOO","JELLY","KOALA","LEMON","MAGIC","MELON","MOUSE","NURSE","OLIVE","ONION","OTTER","PANDA","PEARL","PLUMB","PRIZE","QUILT","RIVER","SCARF","SHARK","SHELL","SHINE","SKATE","SLOTH","SPADE","SPARK","STAIR","STARK","SWORD","TEETH","THUMB","TOWEL","TRACK","TULIP","VOICE","WAGON","WITCH","WOMAN","WRIST"];
// De-dupe and keep only clean 5-letter entries.
const POOL = [...new Set(WORDS.filter((w) => /^[A-Z]{5}$/.test(w)))];

const dateKey = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
function prevKey(k) { const y = Math.floor(k / 10000), m = Math.floor(k / 100) % 100, d = k % 100; const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - 1); return dateKey(dt); }
const ROWS = 6, LEN = 5;
const KEYROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export function initLexicon(root) {
  const panel = root.querySelector(".lexicon-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.lexicon) s.lexicon = { lastSolved: 0, streak: 0 }; return s.lexicon; };

  let answer = "", guesses = [], current = "", over = false, won = false, mode = "daily";
  const keyState = {}; // letter -> "correct" | "present" | "absent"

  const dailyWord = () => POOL[dateKey() % POOL.length];
  const randWord = () => POOL[Math.floor(Math.random() * POOL.length)];

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "lexicon-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Word puzzle"));
    card.appendChild(el("h2", "dojo-title", "Lexicon"));
    card.appendChild(el("p", "dojo-lede", "Guess the five-letter word in six tries. Each guess shows which letters are right (green), in the word but misplaced (amber), or not in it (grey). One daily word for everyone, endless practice, or set your own for the class."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const modeRow = el("div", "dojo-field");
    modeRow.appendChild(el("label", "dojo-lbl", "Mode"));
    const opts = el("div", "lexicon-modes");
    const modes = [["daily", "Today's word", "Same for everyone, once a day"], ["practice", "Practice", "A fresh random word each time"], ["custom", "Set a word", "Type a word for the class to guess"]];
    let chosen = "daily";
    const customRow = el("div", "dojo-field"); customRow.hidden = true;
    modes.forEach(([v, t, d]) => {
      const b = el("button", "lexicon-mode" + (v === "daily" ? " on" : ""), `<strong>${t}</strong><span>${d}</span>`);
      b.addEventListener("click", () => { chosen = v; opts.querySelectorAll(".lexicon-mode").forEach((x) => x.classList.remove("on")); b.classList.add("on"); customRow.hidden = v !== "custom"; });
      opts.appendChild(b);
    });
    modeRow.appendChild(opts);
    card.appendChild(modeRow);

    customRow.appendChild(el("label", "dojo-lbl", "Your five-letter word"));
    const cin = el("input", "dojo-input lexicon-secret"); cin.type = "password"; cin.autocomplete = "off"; cin.maxLength = 5; cin.placeholder = "5 letters, masked";
    customRow.appendChild(cin);
    card.appendChild(customRow);

    const cs = cfg();
    if (cs.streak > 0) card.appendChild(el("p", "dojo-hint", `Daily streak: ${cs.streak} ${cs.streak === 1 ? "day" : "days"}.`));

    const go = el("button", "btn primary dojo-begin", "Start");
    go.addEventListener("click", () => {
      if (chosen === "custom") {
        const w = cin.value.toUpperCase().replace(/[^A-Z]/g, "");
        if (w.length !== 5) { cin.focus(); return; }
        mode = "custom"; startGame(w);
      } else if (chosen === "practice") { mode = "practice"; startGame(randWord()); }
      else { mode = "daily"; startGame(dailyWord()); }
    });
    card.appendChild(go);
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function startGame(w) {
    answer = w; guesses = []; current = ""; over = false; won = false;
    for (const k in keyState) delete keyState[k];
    buildShell(); paint();
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "lexicon-game", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="lxSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="lxMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="lxQuit">New game</button>
        </span>
      </div>
      <div class="lexicon-grid" id="lxGrid"></div>
      <p class="lexicon-status" id="lxStatus"></p>
      <div class="lexicon-keys" id="lxKeys"></div>`));
    panel.querySelector("#lxSet").textContent = mode === "daily" ? "Today's word" : mode === "custom" ? "Custom word" : "Practice";
    updateMute();
    panel.querySelector("#lxMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#lxQuit").addEventListener("click", () => renderLobby());
    const grid = panel.querySelector("#lxGrid");
    for (let r = 0; r < ROWS; r++) {
      const row = el("div", "lexicon-row"); row.dataset.r = r;
      for (let c = 0; c < LEN; c++) row.appendChild(el("div", "lexicon-tile"));
      grid.appendChild(row);
    }
    const keys = panel.querySelector("#lxKeys");
    KEYROWS.forEach((kr, ri) => {
      const row = el("div", "lexicon-keyrow");
      if (ri === 2) { const e = el("button", "lexicon-key wide", "Enter"); e.addEventListener("click", submit); row.appendChild(e); }
      kr.split("").forEach((ch) => { const b = el("button", "lexicon-key", ch); b.dataset.k = ch; b.addEventListener("click", () => typeCh(ch)); row.appendChild(b); });
      if (ri === 2) { const bk = el("button", "lexicon-key wide", "⌫"); bk.setAttribute("aria-label", "Backspace"); bk.addEventListener("click", backspace); row.appendChild(bk); }
      keys.appendChild(row);
    });
  }
  function updateMute() { const b = panel.querySelector("#lxMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  // Two-pass scoring so duplicate letters colour correctly.
  function score(guess) {
    const res = Array(LEN).fill("absent"), pool = {};
    for (let i = 0; i < LEN; i++) { if (guess[i] === answer[i]) res[i] = "correct"; else pool[answer[i]] = (pool[answer[i]] || 0) + 1; }
    for (let i = 0; i < LEN; i++) { if (res[i] === "correct") continue; const ch = guess[i]; if (pool[ch] > 0) { res[i] = "present"; pool[ch]--; } }
    return res;
  }
  const rank = { absent: 0, present: 1, correct: 2 };

  function paint() {
    const grid = panel.querySelector("#lxGrid");
    for (let r = 0; r < ROWS; r++) {
      const row = grid.children[r], tiles = row.children;
      const g = guesses[r];
      const res = g ? score(g) : null;
      for (let c = 0; c < LEN; c++) {
        const t = tiles[c];
        t.className = "lexicon-tile";
        if (g) { t.textContent = g[c]; t.classList.add(res[c], "filled"); }
        else if (r === guesses.length) { t.textContent = current[c] || ""; if (current[c]) t.classList.add("filled"); }
        else t.textContent = "";
      }
    }
    // keyboard states
    panel.querySelectorAll(".lexicon-key[data-k]").forEach((b) => {
      const st = keyState[b.dataset.k];
      b.classList.remove("correct", "present", "absent");
      if (st) b.classList.add(st);
    });
    const status = panel.querySelector("#lxStatus");
    if (over) {
      status.textContent = won ? "Solved it!" : `Out of guesses — the word was ${answer}.`;
      status.className = "lexicon-status " + (won ? "won" : "lost");
    } else { status.textContent = ""; status.className = "lexicon-status"; }
  }

  function typeCh(ch) { if (over || current.length >= LEN) return; current += ch; paint(); fx(sound.tick); }
  function backspace() { if (over || !current.length) return; current = current.slice(0, -1); paint(); }
  function submit() {
    if (over) return;
    if (current.length !== LEN) { flashRow(); return; }
    const guess = current;
    const res = score(guess);
    res.forEach((r, i) => { const ch = guess[i]; if (!keyState[ch] || rank[r] > rank[keyState[ch]]) keyState[ch] = r; });
    guesses.push(guess); current = "";
    if (guess === answer) { over = true; won = true; paint(); fx(sound.fanfare); recordDaily(true); return; }
    if (guesses.length >= ROWS) { over = true; paint(); fx(sound.buzz); recordDaily(false); return; }
    paint(); fx(sound.beep);
  }
  function flashRow() {
    const row = panel.querySelector(`.lexicon-row[data-r="${guesses.length}"]`);
    if (!row) return; row.classList.remove("shake"); void row.offsetWidth; row.classList.add("shake");
  }
  function recordDaily(solved) {
    if (mode !== "daily") return;
    const cs = cfg(), today = dateKey();
    if (cs.lastSolved === today) return;
    if (solved) { cs.streak = cs.lastSolved === prevKey(today) ? (cs.streak || 0) + 1 : 1; cs.lastSolved = today; }
    else { cs.streak = 0; cs.lastSolved = today; }
    save();
  }

  document.addEventListener("keydown", (e) => {
    if (!panel.querySelector("#lxGrid")) return;
    const host = panel.closest("[data-view-panel]");
    if (host && host.hidden) return;
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "Backspace") { e.preventDefault(); backspace(); }
    else { const ch = (e.key || "").toUpperCase(); if (ch.length === 1 && ch >= "A" && ch <= "Z") typeCh(ch); }
  });

  renderLobby();
}
