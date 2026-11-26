// deepdive.js — Deep Dive: a Krillion-style maths game. Each dive is 7 prompts
// with many valid answers (factors, multiples, primes, ways to make a number…).
// Any correct answer scores, but the rarer / less obvious it is, the deeper you
// sink — six tiers from Plankton (10) to One in a krillion (100). Your score is
// your depth in metres. Rarity is worked out from the maths (how obvious the
// answer is), so it's deterministic and fair — no player base needed. A Daily
// dive gives everyone the same 7 prompts to compare. Zero deps, local only.
import { el, escapeHtml } from "./quizkit.js?v=20261126b";
import { getState, save } from "./storage.js?v=20261126b";
import * as sound from "./sound.js?v=20261126b";
import { SUPABASE_ENABLED } from "./supa-config.js?v=20261126b";
import { topDiveScores, submitDiveScore } from "./supa.js?v=20261126b";

const N_PROMPTS = 7, SECS = 25;

// Our Lobster Pots mascot, drawn as an inline SVG so we can animate and tint it.
const LOBSTER = `<svg viewBox="0 0 72 88" class="dd-lob-svg" aria-hidden="true">
  <path d="M30 22 C22 10 16 6 11 3" fill="none" stroke="#b5392c" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M42 22 C50 10 56 6 61 3" fill="none" stroke="#b5392c" stroke-width="2.6" stroke-linecap="round"/>
  <g fill="#e2574c" stroke="#9e2b22" stroke-width="2" stroke-linejoin="round">
    <path d="M26 33 C15 30 5 34 5 42 C5 50 13 52 20 49 L24 41 Z"/>
    <path d="M46 33 C57 30 67 34 67 42 C67 50 59 52 52 49 L48 41 Z"/>
  </g>
  <path d="M5 42 l-3 -4 M5 42 l-4 4" fill="none" stroke="#9e2b22" stroke-width="2" stroke-linecap="round"/>
  <path d="M67 42 l3 -4 M67 42 l4 4" fill="none" stroke="#9e2b22" stroke-width="2" stroke-linecap="round"/>
  <path d="M36 15 C44 15 49 21 49 29 C49 37 46 41 45 49 C44 57 47 63 43 71 C41 78 31 78 29 71 C25 63 28 57 27 49 C26 41 23 37 23 29 C23 21 28 15 36 15 Z" fill="#e2574c" stroke="#9e2b22" stroke-width="2"/>
  <path d="M29 41 H43 M28 49 H44 M29 57 H43 M30 65 H42" fill="none" stroke="#9e2b22" stroke-width="1.5" stroke-linecap="round" opacity=".45"/>
  <path d="M29 71 C27 79 25 82 23 85 M43 71 C45 79 47 82 49 85 M36 73 V86" fill="none" stroke="#c0392b" stroke-width="2.2" stroke-linecap="round"/>
  <g stroke="#9e2b22" stroke-width="1.6" stroke-linecap="round"><path d="M27 44 l-6 3M27 52 l-6 4M45 44 l6 3M45 52 l6 4"/></g>
  <circle cx="31" cy="25" r="3.3" fill="#fff" stroke="#9e2b22" stroke-width="1"/><circle cx="41" cy="25" r="3.3" fill="#fff" stroke="#9e2b22" stroke-width="1"/>
  <circle cx="31" cy="25.6" r="1.4" fill="#2b0b09"/><circle cx="41" cy="25.6" r="1.4" fill="#2b0b09"/>
</svg>`;

// Little maths facts & history, shown while you dive and on the results screen.
const FACTS = [
  "The equals sign (=) was invented in 1557 by Welsh mathematician Robert Recorde — two parallel lines, because “no two things can be more equal”.",
  "Zero was first used as a number in India, around 628 AD, by the mathematician Brahmagupta.",
  "A “googol” is 1 followed by 100 zeros. The search engine Google is named after a misspelling of it.",
  "Our number symbols (0–9) are called Hindu-Arabic numerals — they reached Europe from India via the Arab world.",
  "A prime number has exactly two factors: 1 and itself. That's why 1 isn't prime — it only has one factor.",
  "0.999… recurring is exactly equal to 1. Not nearly — exactly.",
  "The angles inside any triangle always add up to 180°, no matter its shape.",
  "π (pi) is the ratio of a circle's circumference to its diameter — about 3.14159, and the digits never repeat.",
  "A “googolplex” is 1 followed by a googol of zeros — more zeros than there are atoms in the universe.",
  "The Fibonacci sequence (1, 1, 2, 3, 5, 8, 13…) appears in sunflowers, pinecones and spiral shells.",
  "Any even number bigger than 2 can (it's believed) be written as the sum of two primes — this is Goldbach's conjecture, still unproven.",
  "A number is divisible by 3 if its digits add up to a multiple of 3. Try it: 1+2+3 = 6, and 123 ÷ 3 = 41.",
  "The Ancient Egyptians were using fractions over 3,600 years ago — but only ones like 1/2, 1/3 and 1/4.",
  "A “perfect number” equals the sum of its factors (not itself). 6 = 1 + 2 + 3. The next one is 28.",
  "Multiplying any number by 9, the digits of the answer add up to 9 (or a multiple of it). 9×7 = 63, 6+3 = 9.",
  "In a room of just 23 people, there's a better-than-even chance two share a birthday.",
  "A “prime” that's one less than a power of two (like 3, 7, 31) is called a Mersenne prime — the biggest known has over 41 million digits.",
  "The number 1,000,000,000,000 is a trillion in the UK and US today — but it used to mean different things on each side of the Atlantic.",
  "Negative numbers were once called “absurd” by European mathematicians — they only became accepted a few hundred years ago.",
  "A “right angle” is 90°. Four of them make 360° — all the way around a point.",
  "The word “algebra” comes from the Arabic “al-jabr”, meaning “the reunion of broken parts”.",
  "There are more ways to shuffle a deck of 52 cards than there are atoms on Earth — about 8 × 10^67.",
  "Squared numbers are the gaps between them: the difference between consecutive squares goes 3, 5, 7, 9… the odd numbers.",
  "Roman numerals have no symbol for zero — which made arithmetic with them famously painful.",
];
// Six rarity tiers (points; depth = points × 10 m).
const TIERS = [
  { name: "Plankton", pts: 10, cls: "t0" },
  { name: "Too clever", pts: 15, cls: "t1" },
  { name: "Schooler", pts: 30, cls: "t2" },
  { name: "Rare", pts: 60, cls: "t3" },
  { name: "Deep cut", pts: 85, cls: "t4" },
  { name: "One in a krillion", pts: 100, cls: "t5" },
];
const ZONES = [
  { m: 0, name: "Sunlit shallows" }, { m: 200, name: "Twilight zone" }, { m: 1000, name: "Midnight zone" },
  { m: 3800, name: "The wreck" }, { m: 6000, name: "Hadal zone" }, { m: 7000, name: "Trench floor" },
];
const zoneFor = (m) => ZONES.reduce((z, x) => (m >= x.m ? x : z), ZONES[0]);

/* ---------- seeded RNG so a Daily dive is the same for everyone ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rint = (rng, n) => Math.floor(rng() * n);
const pick = (rng, arr) => arr[rint(rng, arr.length)];
function shuffleR(rng, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const dateSeed = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

/* ---------- maths helpers ---------- */
const rankTier = (frac) => { frac = Math.max(0, Math.min(0.999, frac)); return frac < 0.14 ? 0 : frac < 0.28 ? 1 : frac < 0.5 ? 2 : frac < 0.72 ? 3 : frac < 0.9 ? 4 : 5; };
const spread = (i, n) => 2 + Math.round((i / Math.max(1, n - 1)) * 3); // inner factors: schooler(2)…one-in-krillion(5)
const factorsOf = (N) => { const f = []; for (let i = 1; i <= N; i++) if (N % i === 0) f.push(i); return f; };
const isPrime = (n) => { if (!Number.isInteger(n) || n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const primesUnder = (lim) => { const p = []; for (let i = 2; i < lim; i++) if (isPrime(i)) p.push(i); return p; };
const numOf = (raw) => { const s = String(raw).replace(/[\s,]/g, ""); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN; };
function evalExpr(raw) {
  const s = String(raw).replace(/×/g, "*").replace(/÷/g, "/").trim();
  if (!/^[-+*/(). 0-9]+$/.test(s) || !/[-+*/]/.test(s)) return null;
  try { const v = Function('"use strict";return (' + s + ")")(); return typeof v === "number" && isFinite(v) ? v : null; } catch { return null; }
}
const opCount = (raw) => (String(raw).match(/[-+*/×÷]/g) || []).length;

/* ---------- prompt factories: rng -> { text, example, score(raw) -> tierIdx | -1 } ---------- */
const FACTORIES = [
  (rng) => { const N = pick(rng, [12, 18, 20, 24, 28, 30, 36, 40, 48, 60]); const inner = factorsOf(N).filter((f) => f !== 1 && f !== 2 && f !== N).sort((a, b) => a - b);
    return { text: `Name a factor of ${N}`, example: `a whole number that divides exactly into ${N}`,
      score(raw) { const n = numOf(raw); if (!Number.isInteger(n) || n < 1 || N % n !== 0) return -1; if (n === 1 || n === 2) return 0; if (n === N) return 1; return spread(inner.indexOf(n), inner.length); } }; },
  (rng) => { const N = pick(rng, [3, 4, 6, 7, 8, 9, 11, 12]); const LIM = 100, count = Math.floor(LIM / N);
    return { text: `Name a multiple of ${N} (up to ${LIM})`, example: `e.g. ${N}, ${2 * N}, ${3 * N}…`,
      score(raw) { const n = numOf(raw); if (!Number.isInteger(n) || n < N || n > LIM || n % N !== 0) return -1; return rankTier((n / N - 1) / Math.max(1, count - 1)); } }; },
  (rng) => { const N = pick(rng, [6, 7, 8, 9, 12]); const LIM = 12 * N;
    return { text: `Name a number in the ${N} times table`, example: `e.g. ${N}, ${2 * N}, … up to ${LIM}`,
      score(raw) { const n = numOf(raw); if (!Number.isInteger(n) || n < N || n > LIM || n % N !== 0) return -1; return rankTier((n / N - 1) / 11); } }; },
  (rng) => { const LIM = pick(rng, [50, 60, 100]); const primes = primesUnder(LIM);
    return { text: `Name a prime number under ${LIM}`, example: "e.g. 2, 3, 5, 7, 11…",
      score(raw) { const n = numOf(raw); if (!isPrime(n) || n >= LIM) return -1; return rankTier(primes.indexOf(n) / Math.max(1, primes.length - 1)); } }; },
  (rng) => { const LIM = pick(rng, [144, 200, 400]); const sq = []; for (let i = 1; i * i <= LIM; i++) sq.push(i * i);
    return { text: `Name a square number (up to ${LIM})`, example: "e.g. 1, 4, 9, 16, 25…",
      score(raw) { const n = numOf(raw); const r = Math.round(Math.sqrt(n)); if (n < 1 || n > LIM || r * r !== n) return -1; return rankTier(sq.indexOf(n) / Math.max(1, sq.length - 1)); } }; },
  () => { const cu = []; for (let i = 1; i * i * i <= 1000; i++) cu.push(i * i * i);
    return { text: "Name a cube number (up to 1000)", example: "e.g. 1, 8, 27, 64…",
      score(raw) { const n = numOf(raw); const r = Math.round(Math.cbrt(n)); if (n < 1 || n > 1000 || r * r * r !== n) return -1; return rankTier(cu.indexOf(n) / Math.max(1, cu.length - 1)); } }; },
  (rng) => { const N = pick(rng, [12, 16, 20, 24, 30, 36, 48, 100]);
    return { text: `Make ${N} — type a calculation that equals ${N}`, example: "e.g. 6 + 6, 3 × 8, 2 × 3 × 4",
      score(raw) { const v = evalExpr(raw); if (v === null || Math.abs(v - N) > 1e-9) return -1; const c = opCount(raw); let t = c <= 1 ? 0 : c === 2 ? 2 : c === 3 ? 3 : c === 4 ? 4 : 5; if (/[*/×÷]/.test(String(raw))) t = Math.min(5, t + 1); return t; } }; },
  () => ({ text: "Name a Pythagorean triple — three whole numbers where a² + b² = c²", example: "e.g. 3, 4, 5",
    score(raw) { const parts = String(raw).split(/[\s,]+/).map(Number).filter((x) => Number.isInteger(x) && x > 0); if (parts.length !== 3) return -1; const [a, b, c] = parts.slice().sort((x, y) => x - y); if (a * a + b * b !== c * c) return -1; return rankTier(Math.min(1, (c - 5) / 26)); } }),
  (rng) => { const K = pick(rng, [7, 8, 9, 10, 11]); const valid = []; for (let n = 10; n <= 99; n++) if (Math.floor(n / 10) + n % 10 === K) valid.push(n);
    return { text: `Name a 2-digit number whose digits add up to ${K}`, example: `e.g. for 9: 18, 27, 36…`,
      score(raw) { const n = numOf(raw); const i = valid.indexOf(n); return i < 0 ? -1 : rankTier(i / Math.max(1, valid.length - 1)); } }; },
  (rng) => { const N = pick(rng, [24, 36, 60, 72, 90, 120]); const pf = primesUnder(N + 1).filter((p) => N % p === 0).sort((a, b) => a - b);
    return { text: `Name a prime factor of ${N}`, example: `a prime number that divides into ${N}`,
      score(raw) { const n = numOf(raw); const i = pf.indexOf(n); return i < 0 ? -1 : rankTier(i / Math.max(1, pf.length - 1)); } }; },
  () => ({ text: "Name a fraction equal to a half — type it as a/b", example: "e.g. 2/4, 3/6, 50/100",
    score(raw) { const m = String(raw).trim().match(/^(\d+)\s*\/\s*(\d+)$/); if (!m) return -1; const a = +m[1], b = +m[2]; if (a < 1 || a * 2 !== b || a === 1) return -1; return rankTier(Math.min(1, (b - 4) / 96)); } }),
  () => { const map = new Map([["square", 0], ["rectangle", 0], ["oblong", 1], ["rhombus", 2], ["diamond", 1], ["parallelogram", 2], ["trapezium", 3], ["trapezoid", 3], ["kite", 3], ["quadrilateral", 1], ["arrowhead", 4], ["delta", 4]]);
    return { text: "Name a quadrilateral — a 2D shape with four straight sides", example: "e.g. square, rhombus, kite…",
      score(raw) { const s = String(raw).trim().toLowerCase(); return map.has(s) ? map.get(s) : -1; } }; },
];

// Exposed for unit tests (scoring correctness).
export const DD_TEST = { FACTORIES, TIERS, evalExpr, factorsOf, isPrime, mulberry32 };

export function initDeepDive(root) {
  const panel = root.querySelector(".deepdive-panel");
  if (!panel) return;
  const cfg = () => { const s = getState(); if (!s.deepdive) s.deepdive = { best: 0, daily: true, name: "" }; if (typeof s.deepdive.best !== "number") s.deepdive.best = 0; if (typeof s.deepdive.daily !== "boolean") s.deepdive.daily = true; if (typeof s.deepdive.name !== "string") s.deepdive.name = ""; return s.deepdive; };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const randFact = () => FACTS[Math.floor(Math.random() * FACTS.length)];

  // Global leaderboard (deepest dives). Fails quietly so the game works offline.
  async function fillBoard(container, highlight) {
    const rows = await topDiveScores(12);
    container.querySelector(".dd-boardload")?.remove();
    const old = container.querySelector(".dd-boardlist"); if (old) old.remove();
    const list = el("ol", "dd-boardlist");
    if (!rows.length) list.appendChild(el("li", "muted", "No dives yet — be the first!"));
    rows.forEach((r) => {
      const li = el("li", "dd-boardrow");
      if (highlight && r.name === highlight.name && r.depth === highlight.depth) li.classList.add("you");
      li.innerHTML = `<span class="dd-brank"></span><span class="dd-bname">${escapeHtml(r.name)}</span><span class="dd-bmode muted">${r.mode === "daily" ? "daily" : ""}</span><span class="dd-bdepth">${r.depth} m</span>`;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  let game = null, timer = null;
  const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };

  function buildDive(daily) {
    const seed = daily ? dateSeed() : (Math.floor(Math.random() * 2 ** 32) >>> 0) || 1;
    const rng = mulberry32(seed);
    const prompts = shuffleR(rng, FACTORIES).slice(0, N_PROMPTS).map((f) => f(rng));
    return { daily, seed, prompts, i: 0, results: [], depth: 0 };
  }

  /* ---------- lobby ---------- */
  function renderLobby(flash) {
    stopTimer(); game = null;
    panel.innerHTML = "";
    const card = el("div", "dd-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Maths · Krillion-style"));
    card.appendChild(el("h2", "dojo-title", "Deep Dive"));
    card.appendChild(el("p", "dojo-lede", "Seven maths prompts, 25 seconds each. Every correct answer scores — but the rarer and less obvious it is, the deeper you sink. Your score is your depth. How far down can you get?"));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const modeRow = el("div", "dojo-field dojo-field-inline");
    modeRow.appendChild(el("label", "dojo-lbl", "Mode"));
    const seg = el("div", "seg-toggle");
    const mk = (on, label, title) => { const b = el("button", "seg" + (cfg().daily === on ? " is-active" : ""), label); b.title = title; b.addEventListener("click", () => { cfg().daily = on; save(); [...seg.children].forEach((c) => c.classList.remove("is-active")); b.classList.add("is-active"); }); return b; };
    seg.append(mk(true, "Daily dive", "The same 7 prompts for everyone today"), mk(false, "Random dive", "7 fresh prompts every time"));
    modeRow.appendChild(seg);
    card.appendChild(modeRow);

    const go = el("button", "btn primary dojo-begin", "▼ Begin descent ▼");
    go.addEventListener("click", () => { game = buildDive(cfg().daily); fx(sound.beep); renderIntro(renderPrompt); });
    card.appendChild(go);

    card.appendChild(el("p", "dojo-hint", `Best depth: ${cfg().best} m. There's always more than one right answer — reach for the one no one else would.`));

    const leg = el("div", "dd-legend");
    leg.appendChild(el("p", "dd-legend-ttl", "The deeper, the rarer"));
    TIERS.forEach((t) => { const r = el("div", "dd-leg " + t.cls); r.innerHTML = `<span class="dd-leg-name">${t.name}</span><span class="dd-leg-pts">${t.pts * 10} m</span>`; leg.appendChild(r); });
    card.appendChild(leg);

    if (SUPABASE_ENABLED) {
      const board = el("div", "dd-board");
      board.innerHTML = `<p class="dd-board-ttl">🏆 Deepest dives</p><p class="muted dd-boardload">Loading…</p>`;
      card.appendChild(board);
      fillBoard(board);
    }
    panel.appendChild(card);
  }

  /* ---------- the dive animation (lobster + a maths fact) ---------- */
  function renderIntro(then) {
    stopTimer();
    panel.innerHTML = "";
    const sc = el("div", "dd-intro");
    sc.innerHTML = `
      <div class="dd-intro-sea">
        <div class="dd-bubbles">${"<span></span>".repeat(7)}</div>
        <div class="dd-intro-lob">${LOBSTER}</div>
      </div>
      <p class="dd-intro-ttl">Down we go…</p>
      <p class="dd-fact"><b>Did you know?</b> ${escapeHtml(randFact())}</p>`;
    const skip = el("button", "btn ghost dd-skip", "Start diving ▸");
    sc.appendChild(skip);
    panel.appendChild(sc);
    let went = false;
    const go = () => { if (went) return; went = true; clearTimeout(t); then(); };
    skip.addEventListener("click", go);
    const t = setTimeout(go, 2300);
  }

  /* ---------- a prompt ---------- */
  function renderPrompt() {
    stopTimer();
    const g = game, p = g.prompts[g.i];
    panel.innerHTML = "";
    const wrap = el("div", "dd-dive");
    wrap.appendChild(el("div", "dojo-toprow", `
      <span class="dojo-set">${g.daily ? "Daily dive #" + g.seed : "Deep Dive"}</span>
      <span class="dojo-topbtns">
        <span class="dd-depth" id="ddDepth">${g.depth} m</span>
        <button class="btn ghost" id="ddQuit">End</button>
      </span>`));
    wrap.appendChild(el("p", "dd-count", `Prompt ${g.i + 1} of ${N_PROMPTS}`));
    const bar = el("div", "dd-timer"); const fill = el("div", "dd-timer-fill"); bar.appendChild(fill); wrap.appendChild(bar);
    wrap.appendChild(el("div", "dd-prompt", escapeHtml(p.text)));
    wrap.appendChild(el("p", "dd-example muted", escapeHtml(p.example)));

    const form = el("div", "dd-inputrow");
    const input = el("input", "dojo-input dd-input"); input.type = "text"; input.autocomplete = "off"; input.placeholder = "Type your answer…"; input.setAttribute("autocapitalize", "off"); input.spellcheck = false;
    const dive = el("button", "btn primary", "Dive");
    const pass = el("button", "btn ghost", "Pass");
    form.append(input, dive, pass);
    wrap.appendChild(form);
    const fb = el("p", "dd-feedback"); wrap.appendChild(fb);
    panel.appendChild(wrap);

    panel.querySelector("#ddQuit").addEventListener("click", () => { if (confirm("End this dive?")) renderLobby(); });
    setTimeout(() => input.focus(), 30);

    let done = false; // locked once this prompt is scored/passed
    const finish = (res, msg, cls) => {
      if (done) return; done = true; stopTimer();
      g.results.push(res); if (res.tier >= 0) g.depth += TIERS[res.tier].pts * 10;
      fb.className = "dd-feedback " + (cls || ""); fb.innerHTML = msg;
      input.disabled = dive.disabled = pass.disabled = true;
      const d = panel.querySelector("#ddDepth"); if (d) d.textContent = g.depth + " m";
      setTimeout(() => { g.i++; if (g.i >= N_PROMPTS) renderResults(); else renderPrompt(); }, res.tier >= 0 ? 1250 : 850);
    };
    const submit = () => {
      if (done) return;
      const raw = input.value.trim(); if (!raw) { input.focus(); return; }
      const tier = p.score(raw);
      if (tier < 0) { // refused, not punished — clock keeps running
        fb.className = "dd-feedback bad"; fb.textContent = "Not a valid answer — the clock's still running, try another.";
        input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); input.select(); fx(sound.buzz); return;
      }
      const t = TIERS[tier];
      finish({ answer: raw, tier, prompt: p.text }, `<b class="dd-${t.cls}">${t.name}</b> · +${t.pts * 10} m`, t.cls);
      fx(tier >= 3 ? sound.fanfare : sound.beep);
    };
    dive.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
    pass.addEventListener("click", () => finish({ answer: null, tier: -1, prompt: p.text }, "Passed · 0 m", "dim"));

    // 25-second clock
    const start = Date.now();
    timer = setInterval(() => {
      const left = Math.max(0, SECS * 1000 - (Date.now() - start));
      fill.style.width = (left / (SECS * 1000) * 100) + "%";
      fill.classList.toggle("low", left < 6000);
      if (left <= 0) { fx(sound.buzz); finish({ answer: input.value.trim() || null, tier: -1, prompt: p.text }, "Out of time · 0 m", "dim"); }
    }, 100);
  }

  /* ---------- results ---------- */
  function renderResults() {
    stopTimer();
    const g = game, m = g.depth, zone = zoneFor(m);
    const best = cfg().best, isBest = m > best;
    if (isBest) { cfg().best = m; save(); }
    panel.innerHTML = "";
    const wrap = el("div", "dd-results");
    wrap.appendChild(el("p", "dd-count", g.daily ? "Daily dive #" + g.seed : "Deep Dive"));
    wrap.appendChild(el("p", "dd-final", `${m} m`));
    wrap.appendChild(el("p", "dd-zone", `${zone.name}${isBest ? " · new personal best!" : ""}`));

    // depth map — the lobster sinks to your depth
    const map = el("div", "dd-map");
    const target = Math.max(2, Math.min(100, m / 7000 * 100));
    map.innerHTML = `<div class="dd-map-fill"></div><div class="dd-diver">${LOBSTER}</div>`;
    ZONES.forEach((z) => { const tick = el("div", "dd-map-tick"); tick.style.top = (z.m / 7000 * 100) + "%"; tick.innerHTML = `<span>${z.m} m</span>`; map.appendChild(tick); });
    const mapWrap = el("div", "dd-mapwrap"); mapWrap.appendChild(map); wrap.appendChild(mapWrap);
    const fill = map.querySelector(".dd-map-fill"), diver = map.querySelector(".dd-diver");
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.height = target.toFixed(1) + "%"; diver.style.top = `calc(${target.toFixed(1)}% - 16px)`; }));

    wrap.appendChild(el("p", "dd-fact", `<b>Did you know?</b> ${escapeHtml(randFact())}`));

    const list = el("div", "dd-breakdown");
    g.results.forEach((r, i) => {
      const t = r.tier >= 0 ? TIERS[r.tier] : null;
      const row = el("div", "dd-brow");
      row.innerHTML = `<span class="dd-bnum">${i + 1}</span><span class="dd-bq">${escapeHtml(g.prompts[i].text)}</span>`
        + `<span class="dd-ba">${r.answer ? escapeHtml(r.answer) : "<i>—</i>"}</span>`
        + `<span class="dd-bt ${t ? "dd-" + t.cls : "dim"}">${t ? t.name + " · +" + t.pts * 10 + " m" : "0 m"}</span>`;
      list.appendChild(row);
    });
    wrap.appendChild(list);

    // global leaderboard — post your dive and see the deepest
    if (SUPABASE_ENABLED && m > 0) {
      const sub = el("div", "dd-submit");
      const nameIn = el("input", "dojo-input dd-nameinput"); nameIn.placeholder = "Your name"; nameIn.maxLength = 24; nameIn.value = cfg().name || "";
      const send = el("button", "btn", "Add to leaderboard");
      const board = el("div", "dd-board");
      const doSubmit = async () => {
        const nm = nameIn.value.trim(); if (!nm) { nameIn.focus(); return; }
        cfg().name = nm; save(); send.disabled = true; nameIn.disabled = true; send.textContent = "Posting…";
        try {
          await submitDiveScore({ name: nm, depth: m, mode: g.daily ? "daily" : "random" });
          send.textContent = "Posted ✓";
          board.innerHTML = `<p class="dd-board-ttl">🏆 Deepest dives</p>`;
          fillBoard(board, { name: nm, depth: m });
        } catch (e) { send.disabled = false; nameIn.disabled = false; send.textContent = "Add to leaderboard"; }
      };
      send.addEventListener("click", doSubmit);
      nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") doSubmit(); });
      const r = el("div", "dd-submitrow"); r.append(nameIn, send);
      sub.append(r, board);
      wrap.appendChild(sub);
    }

    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn primary", g.daily ? "Random dive" : "Dive again");
    again.addEventListener("click", () => { game = buildDive(g.daily ? false : false); fx(sound.beep); renderPrompt(); });
    const back = el("button", "btn ghost", "Back");
    back.addEventListener("click", () => renderLobby());
    row.append(again, back);
    wrap.appendChild(row);
    panel.appendChild(wrap);
    fx(sound.fanfare);
  }

  renderLobby();
}
