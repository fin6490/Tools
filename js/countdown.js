// countdown.js — Countdown: the classic letters, numbers and conundrum starter,
// built for the whiteboard. Deal the puzzle, run the 30-second clock, reveal.
// Standalone (no question set needed). Zero deps.
import { rint, shuffle, el } from "./quizkit.js?v=20260916d";
import * as sound from "./sound.js?v=20260916d";

// Weighted letter bags (roughly the show's mix) and the numbers stacks.
const VOWELS = "AAAAAAAAAAAAAAAEEEEEEEEEEEEEEEEEEEEEIIIIIIIIIIIIIOOOOOOOOOOOOOUUUUU".split("");
const CONS = "BBCCCDDDDDDFFGGGHHJKLLLLLMMMMNNNNNNNNPPPPQRRRRRRRRRSSSSSSSSSTTTTTTTTTVVWWXYYZ".split("");
const LARGE = [25, 50, 75, 100];
const CONUNDRUMS = [
  "BREAKFAST", "CHAMPIONS", "DANGEROUS", "EDUCATION", "FANTASTIC", "GENERATOR",
  "HAPPINESS", "IMPORTANT", "JOURNEYED", "KNOWLEDGE", "LANDSCAPE", "MECHANISM",
  "NEWSPAPER", "OPERATION", "PAINTINGS", "QUESTIONS", "RASPBERRY", "SCIENTIST",
  "TELEPHONE", "UMBRELLAS", "VEGETABLE", "WORKSHOPS", "CHOCOLATE", "DISCOVERY",
  "ADVENTURE", "BUTTERFLY", "CLASSROOM", "DIRECTION", "EXCELLENT", "FURNITURE",
  "GRADUALLY", "HURRICANE", "IMAGINARY", "LIGHTNING", "MOUNTAINS", "NARRATIVE",
];

export function initCountdown(root) {
  const panel = root.querySelector(".countdown-panel");
  if (!panel) return;
  let soundOn = getSound();
  function getSound() { try { return JSON.parse(localStorage.getItem("spindeck.v1"))?.soundOn !== false; } catch { return true; } }
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  let timer = null, remain = 0;

  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

  /* ================= LOBBY ================= */
  function renderLobby() {
    clearTimer();
    panel.innerHTML = "";
    const card = el("div", "countdown-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Numbers, letters & conundrum"));
    card.appendChild(el("h2", "dojo-title", "Countdown"));
    card.appendChild(el("p", "dojo-lede", "The classic starter for the board — pick your letters and make the longest word, reach the target number, or crack the nine-letter conundrum. Each round has its own 30-second clock."));
    const grid = el("div", "countdown-modes");
    [["Letters", "Make the longest word from nine letters", renderLetters],
     ["Numbers", "Reach the target with six numbers", renderNumbers],
     ["Conundrum", "Unscramble the nine-letter word", renderConundrum]].forEach(([t, d, fn]) => {
      const b = el("button", "countdown-mode", `<strong>${t}</strong><span>${d}</span>`);
      b.addEventListener("click", fn);
      grid.appendChild(b);
    });
    card.appendChild(grid);
    panel.appendChild(card);
  }

  // Shared shell: title, a slot area, the clock, and the controls row.
  function shell(title) {
    clearTimer();
    panel.innerHTML = "";
    const wrap = el("div", "countdown-round");
    wrap.appendChild(el("div", "dojo-toprow", `<span class="dojo-set">${title}</span><span class="dojo-topbtns"><button class="btn ghost" id="cdBack">← Back</button></span>`));
    const slots = el("div", "countdown-slots"); slots.id = "cdSlots"; wrap.appendChild(slots);
    const clock = el("div", "countdown-clock"); clock.id = "cdClock"; clock.textContent = "30"; wrap.appendChild(clock);
    const ctrls = el("div", "countdown-ctrls"); ctrls.id = "cdCtrls"; wrap.appendChild(ctrls);
    panel.appendChild(wrap);
    panel.querySelector("#cdBack").addEventListener("click", renderLobby);
    return { slots, clock, ctrls };
  }

  function runClock(secs, onDone) {
    clearTimer();
    remain = secs;
    const clock = panel.querySelector("#cdClock");
    clock.textContent = remain; clock.classList.remove("low");
    timer = setInterval(() => {
      remain--;
      if (clock) clock.textContent = remain;
      if (remain <= 5 && remain > 0) { clock.classList.add("low"); fx(sound.tick); }
      if (remain <= 0) { clearTimer(); clock.classList.remove("low"); fx(sound.buzz); if (onDone) onDone(); }
    }, 1000);
  }

  /* ================= LETTERS ================= */
  function renderLetters() {
    const { slots, ctrls } = shell("Letters round");
    let picked = [];
    // Tiles lay out in a single horizontal row (wraps on narrow screens).
    const draw = () => {
      slots.innerHTML = "";
      const row = el("div", "countdown-numrow countdown-letterrow");
      for (let i = 0; i < 9; i++) row.appendChild(el("span", "countdown-tile" + (picked[i] ? "" : " empty"), picked[i] || ""));
      slots.appendChild(row);
    };
    draw();
    const vowel = el("button", "btn ghost", "Vowel");
    const cons = el("button", "btn ghost", "Consonant");
    const start = el("button", "btn primary", "Start 30s"); start.disabled = true;
    const solBtn = el("button", "btn ghost", "Reveal words"); solBtn.disabled = true;
    const reset = el("button", "btn ghost", "New round");
    const pick = (bag) => { if (picked.length >= 9) return; picked.push(bag[rint(bag.length)]); draw(); fx(sound.tick); if (picked.length >= 9) { vowel.disabled = cons.disabled = true; start.disabled = false; solBtn.disabled = false; } };
    vowel.addEventListener("click", () => pick(VOWELS));
    cons.addEventListener("click", () => pick(CONS));
    start.addEventListener("click", () => { start.disabled = true; runClock(30, () => fx(sound.fanfare)); });
    solBtn.addEventListener("click", () => revealWords(picked, slots));
    reset.addEventListener("click", renderLetters);
    ctrls.append(vowel, cons, start, solBtn, reset);
  }

  // Lazy-load the word lists only when solutions are first requested.
  let WORDLIST = null, RANK = null, wordLoad = null;
  function loadWords() {
    if (WORDLIST) return Promise.resolve(WORDLIST);
    if (!wordLoad) wordLoad = import("./countdown-words.js?v=20260916d").then((m) => {
      WORDLIST = m.WORDS.split("\n");
      RANK = new Map();
      m.COMMON.split("\n").forEach((w, i) => RANK.set(w, i)); // lower index = more common
      return WORDLIST;
    });
    return wordLoad;
  }
  // Which words can be spelt from these nine letters (each tile used once)?
  // Rank by length, then by how everyday the word is, so recognisable answers
  // surface ahead of obscure (but valid) ones.
  function findWords(letters, words) {
    const avail = new Array(26).fill(0);
    for (const c of letters) avail[c.charCodeAt(0) - 65]++;
    const out = [];
    for (const w of words) {
      if (w.length > letters.length) continue;
      const need = new Array(26).fill(0);
      let ok = true;
      for (let i = 0; i < w.length; i++) { const x = w.charCodeAt(i) - 65; if (++need[x] > avail[x]) { ok = false; break; } }
      if (ok) out.push(w);
    }
    const rankOf = (w) => (RANK && RANK.has(w)) ? RANK.get(w) : Infinity;
    out.sort((a, b) => b.length - a.length || rankOf(a) - rankOf(b) || (a < b ? -1 : 1));
    return out;
  }
  async function revealWords(letters, slots) {
    if (letters.length < 9) return;
    clearTimer();
    let box = slots.querySelector(".countdown-solution"); if (box) box.remove();
    box = el("div", "countdown-solution");
    box.appendChild(el("p", "countdown-solhead", "Finding the best words…"));
    slots.appendChild(box);
    let words;
    try { words = await loadWords(); } catch { box.innerHTML = ""; box.appendChild(el("p", "countdown-solhead", "Couldn't load the word list (offline?).")); return; }
    const found = findWords(letters, words);
    box.innerHTML = "";
    if (!found.length) { box.appendChild(el("p", "countdown-solhead", "No words found from those letters.")); return; }
    const top = found[0].length;
    box.appendChild(el("p", "countdown-solhead ok", `Best: ${top} letters · ${found.length} word${found.length === 1 ? "" : "s"} in total`));
    const list = el("div", "countdown-wordlist");
    found.slice(0, 30).forEach((w) => list.appendChild(el("span", "countdown-word" + (w.length === top ? " top" : ""), w)));
    box.appendChild(list);
    fx(sound.fanfare);
  }

  /* ================= NUMBERS ================= */
  function renderNumbers() {
    const { slots, ctrls } = shell("Numbers round");
    slots.innerHTML = "";
    let dealt = null, target = 0;
    const setup = el("div", "countdown-setup");
    setup.appendChild(el("label", "dojo-lbl", "How many large numbers?"));
    const sel = el("select", "dojo-select dojo-select-sm");
    [0, 1, 2, 3, 4].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === 2) o.selected = true; sel.appendChild(o); });
    setup.appendChild(sel);
    slots.appendChild(setup);
    const deal = el("button", "btn primary", "Deal");
    const start = el("button", "btn primary", "Start 30s"); start.disabled = true;
    const solBtn = el("button", "btn ghost", "Reveal solution"); solBtn.disabled = true;
    const again = el("button", "btn ghost", "New round"); again.addEventListener("click", renderNumbers);
    deal.addEventListener("click", () => {
      const large = shuffle(LARGE).slice(0, +sel.value);
      const smallBag = []; for (let v = 1; v <= 10; v++) { smallBag.push(v, v); }
      const small = shuffle(smallBag).slice(0, 6 - large.length);
      dealt = shuffle([...large, ...small]);
      target = 100 + rint(900);
      slots.innerHTML = "";
      slots.appendChild(el("p", "countdown-target", `Target <b>${target}</b>`));
      const row = el("div", "countdown-numrow");
      dealt.forEach((n) => row.appendChild(el("span", "countdown-numtile", String(n))));
      slots.appendChild(row);
      deal.disabled = true; start.disabled = false; solBtn.disabled = false; fx(sound.fanfare);
    });
    start.addEventListener("click", () => { start.disabled = true; runClock(30, () => fx(sound.fanfare)); });
    solBtn.addEventListener("click", () => {
      if (!dealt) return;
      clearTimer();
      const best = solveNumbers(dealt, target);
      slots.querySelectorAll(".countdown-solution").forEach((n) => n.remove());
      const box = el("div", "countdown-solution");
      if (best.value === target) box.appendChild(el("p", "countdown-solhead ok", "Solution — spot on!"));
      else box.appendChild(el("p", "countdown-solhead", `Best possible: ${best.value} (${Math.abs(best.value - target)} away)`));
      best.steps.forEach((s) => box.appendChild(el("p", "countdown-solstep", s)));
      slots.appendChild(box);
      fx(sound.fanfare);
    });
    ctrls.append(deal, start, solBtn, again);
  }

  // Countdown numbers solver — reach the target (or get closest) with + − × ÷.
  function solveNumbers(nums, target) {
    let best = null;
    const consider = (val, steps) => {
      const d = Math.abs(val - target);
      if (!best || d < best.diff || (d === best.diff && steps.length < best.steps.length)) best = { diff: d, value: val, steps: steps.slice() };
    };
    nums.forEach((n) => consider(n, []));
    (function rec(arr, steps) {
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j], rest = arr.filter((_, k) => k !== i && k !== j);
        const ops = [[a + b, `${a} + ${b} = ${a + b}`], [a * b, `${a} × ${b} = ${a * b}`]];
        if (a - b > 0) ops.push([a - b, `${a} − ${b} = ${a - b}`]);
        else if (b - a > 0) ops.push([b - a, `${b} − ${a} = ${b - a}`]);
        if (b !== 0 && a % b === 0) ops.push([a / b, `${a} ÷ ${b} = ${a / b}`]);
        else if (a !== 0 && b % a === 0) ops.push([b / a, `${b} ÷ ${a} = ${b / a}`]);
        for (const [val, expr] of ops) {
          const steps2 = [...steps, expr];
          consider(val, steps2);
          if (best.diff === 0) return;
          if (rest.length) rec([...rest, val], steps2);
        }
      }
    })(nums.slice(), []);
    return best;
  }

  /* ================= CONUNDRUM ================= */
  function renderConundrum() {
    const { slots, ctrls } = shell("Conundrum");
    const word = CONUNDRUMS[rint(CONUNDRUMS.length)];
    let scram = word;
    while (scram === word) scram = shuffle(word.split("")).join("");
    slots.innerHTML = "";
    const row = el("div", "countdown-numrow");
    scram.split("").forEach((c) => row.appendChild(el("span", "countdown-tile", c)));
    slots.appendChild(row);
    const answer = el("p", "countdown-answer"); answer.hidden = true; answer.textContent = word; slots.appendChild(answer);
    const start = el("button", "btn primary", "Start 30s");
    const reveal = el("button", "btn ghost", "Reveal answer");
    const again = el("button", "btn ghost", "New conundrum"); again.addEventListener("click", renderConundrum);
    start.addEventListener("click", () => { start.disabled = true; runClock(30, () => fx(sound.buzz)); });
    reveal.addEventListener("click", () => { clearTimer(); answer.hidden = false; fx(sound.fanfare); });
    ctrls.append(start, reveal, again);
  }

  renderLobby();
}
