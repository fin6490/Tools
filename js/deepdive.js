// deepdive.js — Deep Dive: a Krillion-style maths game. Each dive is 7 prompts
// with many valid answers (factors, multiples, primes, ways to make a number…).
// Any correct answer scores, but the rarer / less obvious it is, the deeper you
// sink — six tiers from Plankton (10) to One in a krillion (100). Your score is
// your depth in metres. Rarity is worked out from the maths (how obvious the
// answer is), so it's deterministic and fair — no player base needed. A Daily
// dive gives everyone the same 7 prompts to compare. Zero deps, local only.
import { el, escapeHtml } from "./quizkit.js?v=20261126c";
import { getState, save } from "./storage.js?v=20261126c";
import * as sound from "./sound.js?v=20261126c";
import { SUPABASE_ENABLED } from "./supa-config.js?v=20261126c";
import { topDiveScores, submitDiveScore } from "./supa.js?v=20261126c";

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
const gcdN = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
// Normalise a typed answer: lowercase, trimmed, trailing full-stop/comma gone.
const normA = (s) => String(s).trim().toLowerCase().replace(/[.,]+$/g, "").replace(/\s+/g, " ");
// Curated "name one of these" prompt — rarity is how obscure the answer is, not
// how big. groups = [[tier, "comma,separated,accepted,answers"], …].
const L = (text, example, groups, extra = {}) => () => {
  const map = new Map();
  groups.forEach(([tier, words]) => words.split(",").forEach((w) => { const k = normA(w); if (k) map.set(k, tier); }));
  return { text, example, score: (raw) => { const v = map.get(normA(raw)); return v == null ? -1 : v; }, ...extra };
};

// True/false maths facts — [statement, isTrue, the fact to reveal afterwards].
const TF = [
  ["True or false: zero is an even number.", true, "True — zero is even. It's a multiple of 2 and sits between two odd numbers."],
  ["True or false: every prime number is odd.", false, "False — 2 is prime and even. It's the only even prime."],
  ["True or false: the angles inside a triangle always add up to 180°.", true, "True on flat paper — in ordinary (Euclidean) geometry a triangle's angles total 180°."],
  ["True or false: 1 is a prime number.", false, "False — a prime has exactly two factors. 1 has only one, so it's not prime."],
  ["True or false: 0.999… (going on forever) is exactly equal to 1.", true, "True — they are two ways of writing the very same number."],
  ["True or false: a square is also a rectangle.", true, "True — a square is a rectangle that happens to have all sides equal."],
  ["True or false: multiplying two negative numbers gives a negative.", false, "False — two negatives multiply to a positive."],
  ["True or false: pi is exactly equal to 22/7.", false, "False — 22/7 is just a handy approximation. Pi never ends or repeats."],
  ["True or false: there is a largest prime number.", false, "False — Euclid proved over 2000 years ago that the primes never run out."],
  ["True or false: all squares are rhombuses.", true, "True — a rhombus has four equal sides, and so does a square."],
  ["True or false: apart from 5 itself, a prime number can end in a 5.", false, "False — anything else ending in 5 divides by 5, so it can't be prime."],
  ["True or false: a googol (1 followed by 100 zeros) is bigger than the number of atoms in the observable universe.", true, "True — a googol is about 10^100, well past the roughly 10^80 atoms out there."],
];
// Quick recall — [question, [accepted answers], the fact, tier]. One shot.
const RECALL = [
  ["How many degrees are there in a full turn?", ["360"], "A full turn is 360°.", 2],
  ["How many sides does a hexagon have?", ["6", "six"], "A hexagon has 6 sides.", 1],
  ["What is pi to the nearest whole number?", ["3"], "Pi ≈ 3.14159…, which rounds to 3.", 2],
  ["Each angle of an equilateral triangle is how many degrees?", ["60"], "180 ÷ 3 = 60° in each corner.", 2],
  ["How many faces does a cube have?", ["6", "six"], "A cube has 6 square faces.", 1],
  ["What is the only even prime number?", ["2", "two"], "2 — every other even number divides by 2.", 2],
  ["The angles inside a quadrilateral add up to how many degrees?", ["360"], "Any four-sided shape's angles total 360°.", 2],
  ["How many millimetres are there in one metre?", ["1000"], "1000 mm make a metre.", 2],
  ["What is the name for the longest side of a right-angled triangle?", ["hypotenuse"], "The hypotenuse — always opposite the right angle.", 3],
  ["How many lines of symmetry does a regular pentagon have?", ["5", "five"], "A regular pentagon has 5 lines of symmetry.", 3],
];

/* ---------- prompt factories: rng -> { text, example, score(raw) -> tierIdx | -1 }
   The rarer / cleverer the answer, the deeper it sinks — and rarity is almost
   never just "the biggest number". Most prompts reward breadth of knowledge or a
   bit of insight; a couple are one-shot maths facts. ---------- */
const FACTORIES = [
  // ===== Breadth of knowledge — the deepest answer is the most obscure one =====
  L("Name a famous mathematician", "e.g. Pythagoras, Newton, Ada Lovelace…", [
    [0, "pythagoras, newton, isaac newton, einstein, albert einstein"],
    [1, "euclid, archimedes, galileo, fibonacci"],
    [2, "pascal, blaise pascal, descartes, rene descartes, ada lovelace, lovelace, alan turing, turing, florence nightingale, nightingale, katherine johnson"],
    [3, "gauss, carl gauss, euler, leonhard euler, leibniz, fermat, pierre de fermat, napier, john napier, mandelbrot, benoit mandelbrot, babbage, charles babbage"],
    [4, "hypatia, ramanujan, srinivasa ramanujan, cantor, georg cantor, riemann, bernhard riemann, al-khwarizmi, al khwarizmi, hilbert, david hilbert, bernoulli, laplace, sophie germain, germain"],
    [5, "emmy noether, noether, godel, gödel, kurt godel, maryam mirzakhani, mirzakhani, galois, evariste galois, andrew wiles, wiles, grothendieck"],
  ]),
  L("Name a 2D shape", "e.g. triangle, square, hexagon…", [
    [0, "triangle, square, circle"],
    [1, "rectangle, pentagon, hexagon, oval, star"],
    [2, "octagon, rhombus, trapezium, parallelogram, kite, ellipse, semicircle, diamond"],
    [3, "heptagon, nonagon, decagon, quadrilateral, trapezoid, crescent"],
    [4, "hendecagon, dodecagon, undecagon, scalene triangle, isosceles triangle, equilateral triangle"],
    [5, "icosagon, chiliagon, reuleaux triangle, annulus"],
  ]),
  L("Name a 3D shape (a solid)", "e.g. cube, sphere, cylinder…", [
    [0, "cube, sphere, cylinder"],
    [1, "cone, pyramid, cuboid, prism"],
    [2, "triangular prism, square-based pyramid, square based pyramid, hemisphere, tetrahedron"],
    [3, "octahedron, torus, pentagonal prism, hexagonal prism"],
    [4, "dodecahedron, icosahedron, frustum, ellipsoid"],
    [5, "icosidodecahedron, rhombicuboctahedron, stellated dodecahedron"],
  ]),
  L("Name a type of number", "e.g. even, odd, prime, square…", [
    [0, "even, odd, prime, whole"],
    [1, "square, negative, decimal, fraction, positive, integer, cube"],
    [2, "multiple, factor, rational, mixed number, improper fraction, natural, real"],
    [3, "irrational, triangular, fibonacci, factorial, surd, recurring, imaginary"],
    [4, "perfect, palindromic, abundant, deficient, complex, transcendental, happy"],
    [5, "mersenne, mersenne prime, amicable, narcissistic, catalan, pronic"],
  ]),
  L("Name a unit of length", "e.g. metre, centimetre, mile…", [
    [0, "metre, meter, centimetre, centimeter, cm, kilometre, kilometer, km"],
    [1, "millimetre, millimeter, mm, mile, inch, foot, feet"],
    [2, "yard, micrometre, micron, hand"],
    [3, "nanometre, nautical mile, light year, lightyear, chain"],
    [4, "furlong, fathom, cubit, league, rod, pole, perch"],
    [5, "angstrom, parsec, astronomical unit, planck length, picometre, femtometre"],
  ]),
  L("Name a maths symbol or operation", "e.g. plus, minus, equals…", [
    [0, "plus, +, minus, -, times, ×, multiply, divide, ÷, add, subtract"],
    [1, "equals, =, percent, %, percentage, square root, √, root, decimal point, point"],
    [2, "pi, π, infinity, ∞, degree, degrees, °, less than, <, greater than, >, squared, power, index"],
    [3, "sigma, σ, sum, factorial, !, plus minus, ±, plus-minus, theta, θ, delta, δ, not equal, ≠, approximately, ≈"],
    [4, "integral, ∫, therefore, ∴, proportional, ∝, congruent, ≅, intersection, ∩, union, ∪, nabla, ∇"],
    [5, "aleph, ℵ, partial, ∂, contour integral, ∮, for all, ∀, there exists, ∃"],
  ]),
  L("Name a branch of maths you could study", "e.g. algebra, geometry, statistics…", [
    [0, "algebra, geometry, arithmetic, fractions, shape"],
    [1, "trigonometry, statistics, probability, ratio, measures, number, graphs, data"],
    [2, "calculus, sequences, vectors, mensuration, coordinate geometry"],
    [3, "mechanics, matrices, differentiation, integration, logarithms, surds"],
    [4, "topology, number theory, set theory, combinatorics, game theory, graph theory"],
    [5, "group theory, chaos theory, cryptography, non-euclidean geometry, measure theory, abstract algebra"],
  ]),
  // ===== Insight-based numbers — the clever answer is NOT the biggest one =====
  (rng) => { const N = pick(rng, [16, 18, 20, 24, 28, 30, 36, 40, 42, 48, 60]); const facs = factorsOf(N);
    return { text: `Name a factor of ${N}`, example: `divides exactly into ${N} — the factors people forget run deepest`,
      score(raw) { const n = numOf(raw); if (!Number.isInteger(n) || n < 1 || N % n !== 0) return -1;
        if (n === 1 || n === 2) return 0;                 // everyone says these
        if (n === N || n === N / 2) return 1;             // the whole thing, and half — cheeky
        if (n === 3 || n === 5 || n === 10) return 2;     // the easy small ones
        const inner = facs.filter((f) => ![1, 2, 3, 5, 10, N, N / 2].includes(f)).sort((a, b) => Math.abs(a - Math.sqrt(N)) - Math.abs(b - Math.sqrt(N)));
        const i = inner.indexOf(n); if (i < 0) return 3;
        return Math.min(5, 3 + Math.round((i / Math.max(1, inner.length - 1)) * 2));
      } }; },
  (rng) => { const N = pick(rng, [12, 16, 20, 24, 36, 40, 48, 100]);
    return { text: `Make ${N} — type a calculation that equals ${N}`, example: "cleverer sums sink deeper: 2 × 3 × 4 beats 50 − 2",
      score(raw) { const v = evalExpr(raw); if (v === null || Math.abs(v - N) > 1e-9) return -1; const c = opCount(raw); let t = c <= 1 ? 0 : c === 2 ? 2 : c === 3 ? 3 : c === 4 ? 4 : 5; if (/[*/×÷]/.test(String(raw))) t = Math.min(5, t + 1); return t; } }; },
  () => ({ text: "Name a Pythagorean triple — whole numbers where a² + b² = c²", example: "3, 4, 5 is the famous one; the rarer triples go deeper",
    score(raw) { const parts = String(raw).split(/[\s,]+/).map(Number).filter((x) => Number.isInteger(x) && x > 0); if (parts.length !== 3) return -1; const s = parts.slice().sort((x, y) => x - y); const [a, b, c] = s; if (a * a + b * b !== c * c) return -1; const g = gcdN(a, gcdN(b, c)); if (a / g === 3 && b / g === 4 && c / g === 5) return g === 1 ? 0 : 1; return Math.min(5, 2 + Math.round(Math.min(1, (c / g - 13) / 30) * 3)); } }),
  () => { const m = new Map([[4, 0], [16, 1], [36, 2], [64, 4]]);
    return { text: "Name a number that is both square and even (under 100)", example: "e.g. 4, 16…",
      score(raw) { const n = numOf(raw); return m.has(n) ? m.get(n) : -1; } }; },
  () => { const m = new Map([[1, 1], [64, 3], [729, 5]]);
    return { text: "Name a number that is both a square and a cube (under 1000)", example: "trickier than it looks — e.g. 1, 64…",
      score(raw) { const n = numOf(raw); return m.has(n) ? m.get(n) : -1; } }; },
  () => { const m = new Map([[12, 0], [24, 1], [36, 2], [48, 2], [60, 3], [72, 3], [84, 4], [96, 5]]);
    return { text: "Name a number that is a multiple of both 3 and 4 (under 100)", example: "e.g. 12, 24…",
      score(raw) { const n = numOf(raw); return m.has(n) ? m.get(n) : -1; } }; },
  (rng) => { const K = pick(rng, [6, 8, 12, 18]); const vals = []; for (let n = 10; n <= 99; n++) { const t = Math.floor(n / 10), u = n % 10; if (t * u === K) vals.push(n); }
    const m = new Map(vals.map((v, i) => [v, Math.min(5, 1 + Math.round((i / Math.max(1, vals.length - 1)) * 4))]));
    return { text: `Name a 2-digit number whose digits multiply to ${K}`, example: `e.g. for 6: 16, 23, 32…`,
      score(raw) { const n = numOf(raw); return m.has(n) ? m.get(n) : -1; } }; },
  // ===== Maths facts — one guess, no second try =====
  (rng) => { const [q, ans, reveal] = pick(rng, TF);
    return { text: q, example: "Type true or false — one shot, so think it through", oneShot: true, reveal,
      score(raw) { const s = normA(raw); const t = s === "true" || s === "t" || s === "yes"; const f = s === "false" || s === "f" || s === "no"; if (!t && !f) return -2; return ((t && ans) || (f && !ans)) ? 2 : -1; } }; },
  (rng) => { const [q, ans, reveal, tier] = pick(rng, RECALL);
    return { text: q, example: "One answer — there's no second try", oneShot: true, reveal,
      score(raw) { const s = normA(raw).replace(/[°\s]/g, ""); return ans.some((a) => normA(a).replace(/[°\s]/g, "") === s) ? tier : -1; } }; },
];

// Exposed for unit tests (scoring correctness).
export const DD_TEST = { FACTORIES, TIERS, evalExpr, factorsOf, isPrime, mulberry32, gcdN, normA };

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
    card.appendChild(el("p", "dojo-lede", "Seven maths prompts, 25 seconds each — numbers, shapes, famous names, true-or-false facts and more. Every right answer scores, but the rarer and cleverer it is, the deeper you sink. Your score is your depth. How far down can you get?"));
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
    const finish = (res, msg, cls, hold) => {
      if (done) return; done = true; stopTimer();
      g.results.push(res); if (res.tier >= 0) g.depth += TIERS[res.tier].pts * 10;
      fb.className = "dd-feedback " + (cls || ""); fb.innerHTML = msg;
      input.disabled = dive.disabled = pass.disabled = true;
      const d = panel.querySelector("#ddDepth"); if (d) d.textContent = g.depth + " m";
      const wait = hold != null ? hold : (res.tier >= 0 ? 1250 : 850);
      setTimeout(() => { g.i++; if (g.i >= N_PROMPTS) renderResults(); else renderPrompt(); }, wait);
    };
    const submit = () => {
      if (done) return;
      const raw = input.value.trim(); if (!raw) { input.focus(); return; }
      const tier = p.score(raw);
      if (tier === -2) { // couldn't read the answer — let them retry, clock runs on
        fb.className = "dd-feedback bad"; fb.textContent = p.oneShot ? "Type “true” or “false”." : "Not a valid answer — try another.";
        input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); input.select(); fx(sound.buzz); return;
      }
      if (tier < 0) {
        if (p.oneShot) { // one guess only — a wrong answer is final, but we teach the fact
          finish({ answer: raw, tier: -1, prompt: p.text, reveal: p.reveal }, p.reveal ? `<b>Not this time.</b> ${escapeHtml(p.reveal)}` : "Not quite · 0 m", "dim", 2100);
          fx(sound.buzz); return;
        }
        // refused, not punished — clock keeps running
        fb.className = "dd-feedback bad"; fb.textContent = "Not a valid answer — the clock's still running, try another.";
        input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); input.select(); fx(sound.buzz); return;
      }
      const t = TIERS[tier];
      const extra = p.oneShot && p.reveal ? ` · <span class="muted">${escapeHtml(p.reveal)}</span>` : "";
      finish({ answer: raw, tier, prompt: p.text, reveal: p.reveal }, `<b class="dd-${t.cls}">${t.name}</b> · +${t.pts * 10} m${extra}`, t.cls, p.oneShot && p.reveal ? 2100 : undefined);
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
