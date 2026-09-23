// hangman.js — Hangman for the whiteboard. Pick a category (or type your own
// secret word) and the class guesses letters. Classic six-miss figure, drawn
// piece by piece. Zero deps.
import { el } from "./quizkit.js?v=20260916m";
import { getState, save } from "./storage.js?v=20260916m";
import * as sound from "./sound.js?v=20260916m";

const CATEGORIES = {
  animals:   { name: "Animals", words: ["ELEPHANT", "GIRAFFE", "DOLPHIN", "PENGUIN", "KANGAROO", "OCTOPUS", "CHEETAH", "HEDGEHOG", "TORTOISE", "SQUIRREL", "BUTTERFLY", "CROCODILE", "FLAMINGO", "RHINOCEROS", "CHIMPANZEE"] },
  countries: { name: "Countries", words: ["BRAZIL", "CANADA", "FRANCE", "GERMANY", "JAPAN", "KENYA", "MEXICO", "NORWAY", "PORTUGAL", "THAILAND", "AUSTRALIA", "ARGENTINA", "SCOTLAND", "MOROCCO", "VIETNAM"] },
  food:      { name: "Food", words: ["SANDWICH", "SPAGHETTI", "PANCAKE", "BROCCOLI", "PINEAPPLE", "CHOCOLATE", "STRAWBERRY", "OMELETTE", "LASAGNE", "CUCUMBER", "PORRIDGE", "AVOCADO", "DUMPLING", "MEATBALL", "CROISSANT"] },
  science:   { name: "Science", words: ["GRAVITY", "MOLECULE", "SKELETON", "VOLCANO", "MAGNET", "OXYGEN", "PLANET", "FRICTION", "ELECTRON", "BACTERIA", "NUCLEUS", "PHOTOSYNTHESIS", "EVAPORATION", "CIRCUIT", "PENDULUM"] },
  sport:     { name: "Sport", words: ["FOOTBALL", "CRICKET", "TENNIS", "SWIMMING", "ATHLETICS", "BASKETBALL", "ROUNDERS", "HOCKEY", "CYCLING", "GYMNASTICS", "BADMINTON", "NETBALL", "ROWING", "SNOOKER", "ARCHERY"] },
  space:     { name: "Space", words: ["GALAXY", "COMET", "ASTEROID", "SATURN", "JUPITER", "TELESCOPE", "ASTRONAUT", "METEOR", "NEBULA", "ECLIPSE", "ORBIT", "GRAVITY", "ROCKET", "CRATER", "UNIVERSE"] },
};

// The figure: gallows first, then six body parts as misses mount.
const FIGURE = [
  '<line x1="20" y1="230" x2="120" y2="230"/>',         // ground
  '<line x1="50" y1="230" x2="50" y2="20"/>',           // post
  '<line x1="50" y1="20" x2="140" y2="20"/>',           // beam
  '<line x1="140" y1="20" x2="140" y2="45"/>',          // rope
];
const PARTS = [
  '<circle cx="140" cy="60" r="16" class="hm-part"/>',                 // head
  '<line x1="140" y1="76" x2="140" y2="140" class="hm-part"/>',        // body
  '<line x1="140" y1="90" x2="115" y2="120" class="hm-part"/>',        // left arm
  '<line x1="140" y1="90" x2="165" y2="120" class="hm-part"/>',        // right arm
  '<line x1="140" y1="140" x2="118" y2="180" class="hm-part"/>',       // left leg
  '<line x1="140" y1="140" x2="162" y2="180" class="hm-part"/>',       // right leg
];

export function initHangman(root) {
  const panel = root.querySelector(".hangman-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => { const s = getState(); if (!s.hangman) s.hangman = { category: "animals", maxMiss: 6 }; return s.hangman; };

  let word = "", guessed = new Set(), misses = 0, over = false, category = "animals";
  const MAX = 6;

  const pickWord = (cat) => { const w = CATEGORIES[cat].words; return w[Math.floor(Math.random() * w.length)]; };
  const isLetter = (ch) => ch >= "A" && ch <= "Z";

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "hangman-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Word guessing"));
    card.appendChild(el("h2", "dojo-title", "Hangman"));
    card.appendChild(el("p", "dojo-lede", "Guess the hidden word one letter at a time before the drawing is complete. Pick a category for a random word, or type your own secret word for the class."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const catRow = el("div", "dojo-field");
    catRow.appendChild(el("label", "dojo-lbl", "Category"));
    const sel = el("select", "dojo-select");
    Object.entries(CATEGORIES).forEach(([k, c]) => { const o = el("option"); o.value = k; o.textContent = c.name; if (k === (cfg().category || "animals")) o.selected = true; sel.appendChild(o); });
    const own = el("option"); own.value = "own"; own.textContent = "Type my own word…"; sel.appendChild(own);
    catRow.appendChild(sel);
    card.appendChild(catRow);

    const ownRow = el("div", "dojo-field"); ownRow.hidden = true;
    ownRow.appendChild(el("label", "dojo-lbl", "Your secret word or short phrase"));
    const ownIn = el("input", "dojo-input hangman-secret"); ownIn.type = "password"; ownIn.autocomplete = "off"; ownIn.maxLength = 32;
    ownIn.placeholder = "letters and spaces only";
    ownRow.appendChild(ownIn);
    ownRow.appendChild(el("p", "dojo-hint", "It's masked as you type so the class can't peek."));
    card.appendChild(ownRow);
    sel.addEventListener("change", () => { const own = sel.value === "own"; ownRow.hidden = !own; if (!own) { cfg().category = sel.value; save(); } });

    const go = el("button", "btn primary dojo-begin", "Start");
    go.addEventListener("click", () => {
      if (sel.value === "own") {
        const w = ownIn.value.toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
        if (w.replace(/ /g, "").length < 2) { ownIn.focus(); return; }
        category = "own"; startGame(w);
      } else { category = sel.value; cfg().category = category; save(); startGame(pickWord(category)); }
    });
    card.appendChild(go);
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  function startGame(w) {
    word = w; guessed = new Set(); misses = 0; over = false;
    buildShell(); paint();
  }

  function buildShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "hangman-game", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="hmSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="hmMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="hmQuit">Change word</button>
        </span>
      </div>
      <div class="hangman-stage">
        <svg class="hangman-fig" id="hmFig" viewBox="0 0 200 240" aria-hidden="true"></svg>
        <div class="hangman-right">
          <p class="hangman-misses" id="hmMisses"></p>
          <div class="hangman-word" id="hmWord"></div>
        </div>
      </div>
      <p class="hangman-status" id="hmStatus"></p>
      <div class="hangman-keys" id="hmKeys"></div>`));
    panel.querySelector("#hmSet").textContent = category === "own" ? "Custom word" : CATEGORIES[category].name;
    updateMute();
    panel.querySelector("#hmMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#hmQuit").addEventListener("click", () => renderLobby());
    const keys = panel.querySelector("#hmKeys");
    for (let i = 65; i <= 90; i++) {
      const ch = String.fromCharCode(i);
      const b = el("button", "hangman-key", ch); b.dataset.k = ch;
      b.addEventListener("click", () => guess(ch));
      keys.appendChild(b);
    }
  }
  function updateMute() { const b = panel.querySelector("#hmMute"); if (b) b.textContent = soundOn ? "♪" : "✕"; }

  function paint() {
    // figure
    const shown = FIGURE.concat(PARTS.slice(0, misses));
    panel.querySelector("#hmFig").innerHTML = shown.join("");
    panel.querySelector("#hmMisses").textContent = `Misses: ${misses} / ${MAX}`;
    // word
    const wbox = panel.querySelector("#hmWord"); wbox.innerHTML = "";
    word.split("").forEach((ch) => {
      if (ch === " ") { wbox.appendChild(el("span", "hangman-space")); return; }
      const revealed = guessed.has(ch) || over;
      const slot = el("span", "hangman-slot" + (revealed ? " on" : ""), revealed ? ch : "");
      if (over && !guessed.has(ch)) slot.classList.add("missed");
      wbox.appendChild(slot);
    });
    // keys
    panel.querySelectorAll(".hangman-key").forEach((b) => {
      const ch = b.dataset.k, used = guessed.has(ch);
      b.classList.toggle("hit", used && word.includes(ch));
      b.classList.toggle("miss", used && !word.includes(ch));
      b.disabled = used || over;
    });
    const status = panel.querySelector("#hmStatus");
    if (over) {
      const won = word.split("").every((ch) => ch === " " || guessed.has(ch));
      status.textContent = won ? "Solved it!" : `Out of guesses — the word was ${word}.`;
      status.className = "hangman-status " + (won ? "won" : "lost");
    } else { status.textContent = ""; status.className = "hangman-status"; }
  }

  function guess(ch) {
    if (over || guessed.has(ch) || !isLetter(ch)) return;
    guessed.add(ch);
    if (word.includes(ch)) {
      fx(sound.beep);
      if (word.split("").every((c) => c === " " || guessed.has(c))) { over = true; paint(); fx(sound.fanfare); return; }
    } else {
      misses++; fx(sound.buzz);
      if (misses >= MAX) { over = true; paint(); fx(sound.buzz); return; }
    }
    paint();
  }

  // Physical keyboard support (only while a game panel is showing).
  document.addEventListener("keydown", (e) => {
    if (!panel.querySelector("#hmKeys")) return;
    if (panel.closest("[data-view-panel]") && panel.closest("[data-view-panel]").hidden) return;
    const ch = (e.key || "").toUpperCase();
    if (ch.length === 1 && isLetter(ch)) guess(ch);
  });

  renderLobby();
}
