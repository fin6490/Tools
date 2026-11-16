// dojo-packs.js — starter question sets for Mr BT's Maths Dojo.
// Each question is { q, a, distractors? }. q and a accept a light maths markup
// (\frac{a}{b}, x^2, \sqrt{9}, \times \div \pm …) rendered by dojo.js — no KaTeX.
// Built mostly in code so the file stays small; teachers add their own in the
// editor, or import sets handed over as JSON.

const rng = () => Math.random();

// Build a few plausible near-miss distractors for an integer answer.
function nearInts(n, extras = []) {
  const set = new Set([n]);
  const out = [];
  const cands = [...extras, n + 1, n - 1, n + 2, n - 2, n + 10, n - 10];
  for (const x of cands) {
    if (x > 0 && !set.has(x)) { set.add(x); out.push(String(x)); }
    if (out.length >= 5) break;
  }
  return out;
}

// ---- Times tables (2–12) ----
function timesTables() {
  const qs = [];
  for (let a = 2; a <= 12; a++) {
    for (let b = a; b <= 12; b++) {
      const c = a * b;
      qs.push({ q: `${a} \\times ${b}`, a: String(c), distractors: nearInts(c, [c + a, c - a, c + b, (a + 1) * b]) });
    }
  }
  return qs;
}

// ---- Square & cube numbers ----
function powers() {
  const qs = [];
  for (let n = 2; n <= 15; n++) {
    const c = n * n;
    qs.push({ q: `${n}^2`, a: String(c), distractors: nearInts(c, [n * 2, (n + 1) * (n + 1), (n - 1) * (n - 1)]) });
  }
  for (let n = 2; n <= 8; n++) {
    const c = n * n * n;
    qs.push({ q: `${n}^3`, a: String(c), distractors: nearInts(c, [n * n, n * 3, (n + 1) ** 3]) });
  }
  return qs;
}

// ---- Fractions of amounts ----
const fractions = [
  { q: "\\frac{1}{2} of 18", a: "9", distractors: ["6", "12", "36"] },
  { q: "\\frac{3}{4} of 20", a: "15", distractors: ["5", "16", "12"] },
  { q: "\\frac{2}{3} of 15", a: "10", distractors: ["5", "9", "12"] },
  { q: "\\frac{1}{4} of 32", a: "8", distractors: ["16", "4", "12"] },
  { q: "\\frac{3}{5} of 25", a: "15", distractors: ["5", "10", "20"] },
  { q: "\\frac{2}{5} of 40", a: "16", distractors: ["8", "20", "10"] },
  { q: "\\frac{5}{6} of 30", a: "25", distractors: ["5", "6", "20"] },
  { q: "\\frac{3}{8} of 24", a: "9", distractors: ["3", "8", "12"] },
  { q: "\\frac{7}{10} of 50", a: "35", distractors: ["5", "7", "40"] },
  { q: "\\frac{2}{7} of 49", a: "14", distractors: ["7", "21", "12"] },
];

// ---- Order of operations (BIDMAS) ----
const bidmas = [
  { q: "3 + 4 \\times 2", a: "11", distractors: ["14", "10", "9"] },
  { q: "10 - 2 \\times 3", a: "4", distractors: ["24", "18", "6"] },
  { q: "(5 + 3) \\times 2", a: "16", distractors: ["11", "13", "10"] },
  { q: "20 \\div 4 + 1", a: "6", distractors: ["4", "5", "20"] },
  { q: "2 \\times 3^2", a: "18", distractors: ["36", "12", "6"] },
  { q: "6 + 8 \\div 2", a: "10", distractors: ["7", "14", "12"] },
  { q: "12 - (3 + 4)", a: "5", distractors: ["13", "11", "9"] },
  { q: "4 \\times 5 - 6", a: "14", distractors: ["-4", "26", "20"] },
  { q: "18 \\div (1 + 2)", a: "6", distractors: ["19", "9", "3"] },
  { q: "3^2 + 4^2", a: "25", distractors: ["49", "14", "24"] },
];

// ---- Percentages of amounts ----
const percentages = [
  { q: "10\\% of 80", a: "8", distractors: ["80", "18", "16"] },
  { q: "25\\% of 60", a: "15", distractors: ["25", "20", "12"] },
  { q: "50\\% of 44", a: "22", distractors: ["88", "11", "24"] },
  { q: "20\\% of 90", a: "18", distractors: ["20", "9", "45"] },
  { q: "75\\% of 40", a: "30", distractors: ["10", "20", "35"] },
  { q: "5\\% of 200", a: "10", distractors: ["5", "20", "100"] },
  { q: "30\\% of 50", a: "15", distractors: ["20", "35", "150"] },
  { q: "40\\% of 25", a: "10", distractors: ["15", "40", "12"] },
  { q: "15\\% of 60", a: "9", distractors: ["15", "6", "12"] },
  { q: "60\\% of 35", a: "21", distractors: ["14", "6", "25"] },
];

// ---- A non-maths example so it's clear the Dojo works for any subject ----
const capitals = [
  { q: "Capital of France", a: "Paris", distractors: ["Lyon", "Marseille", "Nice"] },
  { q: "Capital of Japan", a: "Tokyo", distractors: ["Osaka", "Kyoto", "Nagoya"] },
  { q: "Capital of Australia", a: "Canberra", distractors: ["Sydney", "Melbourne", "Perth"] },
  { q: "Capital of Canada", a: "Ottawa", distractors: ["Toronto", "Montreal", "Vancouver"] },
  { q: "Capital of Spain", a: "Madrid", distractors: ["Barcelona", "Seville", "Valencia"] },
  { q: "Capital of Egypt", a: "Cairo", distractors: ["Alexandria", "Giza", "Luxor"] },
  { q: "Capital of Brazil", a: "Brasília", distractors: ["Rio de Janeiro", "São Paulo", "Salvador"] },
  { q: "Capital of Kenya", a: "Nairobi", distractors: ["Mombasa", "Kisumu", "Nakuru"] },
  { q: "Capital of Norway", a: "Oslo", distractors: ["Bergen", "Stavanger", "Trondheim"] },
  { q: "Capital of New Zealand", a: "Wellington", distractors: ["Auckland", "Christchurch", "Dunedin"] },
];

// ---- Rounding to the nearest 10 (maths) ----
const rounding = [
  { q: "Round 47 to the nearest 10", a: "50", distractors: ["40", "45", "100"] },
  { q: "Round 23 to the nearest 10", a: "20", distractors: ["30", "25", "24"] },
  { q: "Round 68 to the nearest 10", a: "70", distractors: ["60", "65", "80"] },
  { q: "Round 12 to the nearest 10", a: "10", distractors: ["20", "15", "11"] },
  { q: "Round 85 to the nearest 10", a: "90", distractors: ["80", "100", "95"] },
  { q: "Round 34 to the nearest 10", a: "30", distractors: ["40", "35", "33"] },
  { q: "Round 56 to the nearest 10", a: "60", distractors: ["50", "55", "66"] },
  { q: "Round 91 to the nearest 10", a: "90", distractors: ["100", "95", "80"] },
  { q: "Round 45 to the nearest 10", a: "50", distractors: ["40", "44", "55"] },
  { q: "Round 9 to the nearest 10", a: "10", distractors: ["0", "5", "20"] },
];

// ---- Homophones — choose the correct word (English) ----
const homophones = [
  { q: "The dog wagged ___ tail", a: "its", distractors: ["it's", "its'", "it is"] },
  { q: "___ going to be late", a: "They're", distractors: ["Their", "There", "Theyre"] },
  { q: "Put the book over ___", a: "there", distractors: ["their", "they're", "thare"] },
  { q: "I can't find ___ shoes", a: "their", distractors: ["there", "they're", "thier"] },
  { q: "___ too cold today", a: "It's", distractors: ["Its", "Its'", "It"] },
  { q: "We walked ___ the park", a: "to", distractors: ["too", "two", "tow"] },
  { q: "I want ___ slices", a: "two", distractors: ["to", "too", "tue"] },
  { q: "That's ___ much sugar", a: "too", distractors: ["to", "two", "tow"] },
  { q: "___ book is this?", a: "Whose", distractors: ["Who's", "Whos", "Whose'"] },
  { q: "___ at the door?", a: "Who's", distractors: ["Whose", "Whos", "Who"] },
];

// ---- Word classes (English) ----
const wordClasses = [
  { q: "‘quickly’ is a…", a: "Adverb", distractors: ["Adjective", "Noun", "Verb"] },
  { q: "‘happy’ is a…", a: "Adjective", distractors: ["Adverb", "Noun", "Verb"] },
  { q: "‘run’ is a…", a: "Verb", distractors: ["Noun", "Adjective", "Adverb"] },
  { q: "‘dog’ is a…", a: "Noun", distractors: ["Verb", "Adjective", "Pronoun"] },
  { q: "‘she’ is a…", a: "Pronoun", distractors: ["Noun", "Verb", "Adverb"] },
  { q: "‘and’ is a…", a: "Conjunction", distractors: ["Preposition", "Noun", "Verb"] },
  { q: "‘under’ is a…", a: "Preposition", distractors: ["Adverb", "Conjunction", "Noun"] },
  { q: "‘beautiful’ is a…", a: "Adjective", distractors: ["Adverb", "Noun", "Verb"] },
  { q: "‘slowly’ is a…", a: "Adverb", distractors: ["Adjective", "Verb", "Noun"] },
  { q: "‘jump’ is a…", a: "Verb", distractors: ["Noun", "Adjective", "Adverb"] },
];

// ---- Element symbols (science) ----
const elements = [
  { q: "Symbol for Oxygen", a: "O", distractors: ["Ox", "O2", "Om"] },
  { q: "Symbol for Sodium", a: "Na", distractors: ["So", "Sd", "S"] },
  { q: "Symbol for Hydrogen", a: "H", distractors: ["Hy", "Hg", "H2"] },
  { q: "Symbol for Carbon", a: "C", distractors: ["Ca", "Cb", "Co"] },
  { q: "Symbol for Iron", a: "Fe", distractors: ["Ir", "Fr", "In"] },
  { q: "Symbol for Gold", a: "Au", distractors: ["Go", "Gd", "Ag"] },
  { q: "Symbol for Potassium", a: "K", distractors: ["Po", "P", "Pt"] },
  { q: "Symbol for Helium", a: "He", distractors: ["H", "Hm", "Hl"] },
  { q: "Symbol for Nitrogen", a: "N", distractors: ["Ni", "Ng", "Nt"] },
  { q: "Symbol for Calcium", a: "Ca", distractors: ["C", "Cl", "Cm"] },
];

/* ===================== GCSE secondary-maths packs =====================
   Answers are computed from the maths wherever possible, so they're correct
   by construction; the hand-written ones are individually verified. All use
   the same light markup (\times \div \frac ^ \pi \deg) rendered without KaTeX. */

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
// Near-miss distractors that may be negative (nearInts is positive-only).
function nearN(n, extras = []) {
  const set = new Set([n]); const out = [];
  for (const x of [...extras, n + 1, n - 1, n + 2, n - 2, -n, n + 10, n - 10]) {
    if (!set.has(x)) { set.add(x); out.push(String(x)); }
    if (out.length >= 4) break;
  }
  return out;
}
const notAns = (arr, ans) => [...new Set(arr)].filter((d) => d !== ans);

// ---- HCF & LCM ----
function hcfLcm() {
  const qs = [];
  [[12, 18], [8, 12], [20, 30], [6, 9], [15, 25], [24, 36], [10, 15], [14, 21], [16, 24], [9, 12]].forEach(([a, b]) => {
    const h = gcd(a, b), l = a * b / h;
    qs.push({ q: `HCF of ${a} and ${b}`, a: String(h), distractors: nearInts(h, [l, a, b, h * 2]) });
    qs.push({ q: `LCM of ${a} and ${b}`, a: String(l), distractors: nearInts(l, [h, a + b, a, b]) });
  });
  return qs;
}

// ---- Simplify a ratio ----
function simplifyRatio() {
  return [[4, 6], [9, 12], [10, 15], [8, 20], [12, 18], [6, 9], [15, 25], [14, 21], [16, 24], [20, 30]].map(([a, b]) => {
    const g = gcd(a, b), ans = `${a / g}:${b / g}`;
    return { q: `Simplify the ratio ${a}:${b}`, a: ans, distractors: notAns([`${a / g + 1}:${b / g}`, `${b / g}:${a / g}`, `${a}:${b}`], ans) };
  });
}

// ---- Sharing in a ratio (larger share) ----
function ratioShare() {
  return [[40, 3, 1], [60, 2, 1], [45, 2, 3], [100, 3, 2], [24, 1, 2], [50, 3, 2], [36, 5, 1], [90, 4, 5], [32, 3, 1], [48, 5, 3]].map(([total, r1, r2]) => {
    const one = total / (r1 + r2), bigger = one * Math.max(r1, r2);
    return { q: `Share ${total} in the ratio ${r1}:${r2} — larger share`, a: String(bigger), distractors: nearInts(bigger, [one * Math.min(r1, r2), total, one]) };
  });
}

// ---- Percentage increase / decrease ----
function percentChange() {
  return [[80, 10, 1], [50, 20, 1], [200, 15, 0], [60, 25, 1], [40, 10, 0], [120, 50, 0], [90, 30, 1], [150, 20, 0], [70, 10, 1], [250, 40, 0]].map(([amt, pct, up]) => {
    const ch = amt * pct / 100, val = up ? amt + ch : amt - ch;
    return { q: `${up ? "Increase" : "Decrease"} ${amt} by ${pct}\\%`, a: String(val), distractors: nearInts(val, [ch, amt, up ? amt - ch : amt + ch]) };
  });
}

// ---- Fractions ↔ decimals ↔ percentages (verified) ----
const fdp = [
  { q: "0.25 as a percentage", a: "25\\%", distractors: ["2.5\\%", "250\\%", "0.025\\%"] },
  { q: "\\frac{1}{2} as a decimal", a: "0.5", distractors: ["0.2", "0.25", "0.05"] },
  { q: "\\frac{3}{4} as a percentage", a: "75\\%", distractors: ["34\\%", "7.5\\%", "0.75\\%"] },
  { q: "0.2 as a fraction (simplest)", a: "\\frac{1}{5}", distractors: ["\\frac{1}{2}", "\\frac{1}{20}", "\\frac{2}{5}"] },
  { q: "40\\% as a decimal", a: "0.4", distractors: ["4", "0.04", "0.004"] },
  { q: "\\frac{1}{4} as a percentage", a: "25\\%", distractors: ["14\\%", "4\\%", "40\\%"] },
  { q: "0.75 as a fraction (simplest)", a: "\\frac{3}{4}", distractors: ["\\frac{7}{5}", "\\frac{3}{5}", "\\frac{1}{4}"] },
  { q: "0.1 as a percentage", a: "10\\%", distractors: ["1\\%", "100\\%", "0.1\\%"] },
  { q: "\\frac{1}{5} as a percentage", a: "20\\%", distractors: ["15\\%", "5\\%", "50\\%"] },
  { q: "30\\% as a decimal", a: "0.3", distractors: ["3", "0.03", "0.003"] },
];

// ---- Standard form (verified) ----
const standardForm = [
  { q: "Write 3400 in standard form", a: "3.4 \\times 10^3", distractors: ["34 \\times 10^2", "3.4 \\times 10^4", "0.34 \\times 10^4"] },
  { q: "Write 52000 in standard form", a: "5.2 \\times 10^4", distractors: ["52 \\times 10^3", "5.2 \\times 10^3", "5.2 \\times 10^5"] },
  { q: "Write 0.006 in standard form", a: "6 \\times 10^{-3}", distractors: ["6 \\times 10^3", "6 \\times 10^{-2}", "0.6 \\times 10^{-2}"] },
  { q: "Write 720000 in standard form", a: "7.2 \\times 10^5", distractors: ["72 \\times 10^4", "7.2 \\times 10^4", "7.2 \\times 10^6"] },
  { q: "Write 0.00041 in standard form", a: "4.1 \\times 10^{-4}", distractors: ["4.1 \\times 10^4", "41 \\times 10^{-5}", "4.1 \\times 10^{-3}"] },
  { q: "2.5 \\times 10^3 as an ordinary number", a: "2500", distractors: ["250", "25000", "253"] },
  { q: "1.2 \\times 10^{-2} as an ordinary number", a: "0.012", distractors: ["0.12", "0.0012", "120"] },
  { q: "Write 9100 in standard form", a: "9.1 \\times 10^3", distractors: ["91 \\times 10^2", "9.1 \\times 10^2", "9.1 \\times 10^4"] },
  { q: "Write 0.08 in standard form", a: "8 \\times 10^{-2}", distractors: ["8 \\times 10^2", "8 \\times 10^{-1}", "0.8 \\times 10^{-1}"] },
  { q: "Write 640 in standard form", a: "6.4 \\times 10^2", distractors: ["64 \\times 10", "6.4 \\times 10^3", "0.64 \\times 10^3"] },
];

// ---- Laws of indices ----
function indices() {
  const out = [];
  [[3, 4], [2, 5], [6, 2], [3, 3], [4, 2], [5, 1]].forEach(([a, b]) => { const ans = `x^${a + b}`; out.push({ q: `x^${a} \\times x^${b}`, a: ans, distractors: notAns([`x^${a * b}`, `x^${Math.abs(a - b) || 1}`, `x^${a + b + 1}`], ans) }); });
  [[7, 3], [8, 2], [6, 4], [9, 5], [5, 2]].forEach(([a, b]) => { const ans = `x^${a - b}`; out.push({ q: `x^${a} \\div x^${b}`, a: ans, distractors: notAns([`x^${a + b}`, `x^${a}`, `x^${a - b + 1}`], ans) }); });
  [[2, 3], [3, 2], [4, 2], [2, 5], [5, 2]].forEach(([a, b]) => { const ans = `x^${a * b}`; out.push({ q: `(x^${a})^${b}`, a: ans, distractors: notAns([`x^${a + b}`, `x^${a * b + 1}`, `x^${Math.abs(a - b) || 1}`], ans) }); });
  return out;
}

// ---- Expand single brackets: a(x + b) ----
function expandSingle() {
  return [[3, 4], [2, 5], [5, 1], [4, 3], [2, 7], [6, 2], [3, 6], [7, 1], [5, 4], [4, 5]].map(([a, b]) => {
    const ans = `${a}x + ${a * b}`;
    return { q: `${a}(x + ${b})`, a: ans, distractors: notAns([`${a}x + ${b}`, `${a + b}x`, `${a}x + ${a + b}`], ans) };
  });
}

// ---- Expand double brackets: (x + a)(x + b) ----
function expandDouble() {
  return [[2, 3], [1, 4], [3, 5], [2, 6], [4, 1], [5, 2], [3, 3], [1, 7], [2, 8], [4, 4]].map(([a, b]) => {
    const s = a + b, p = a * b, ans = `x^2 + ${s}x + ${p}`;
    return { q: `(x + ${a})(x + ${b})`, a: ans, distractors: notAns([`x^2 + ${p}x + ${s}`, `x^2 + ${s}x + ${s}`, `2x + ${p}`], ans) };
  });
}

// ---- Factorise: x^2 + bx + c ----
function factorise() {
  return [[2, 3], [1, 4], [3, 5], [2, 6], [4, 5], [1, 6], [2, 5], [3, 4], [1, 9], [2, 7]].map(([p, q]) => {
    const b = p + q, c = p * q, ans = `(x + ${p})(x + ${q})`;
    return { q: `Factorise x^2 + ${b}x + ${c}`, a: ans, distractors: notAns([`(x + ${b})(x + ${c})`, `(x + ${p})(x - ${q})`, `(x + ${p + 1})(x + ${q})`], ans) };
  });
}

// ---- Solve linear: ax + b = c ----
function solveLinear() {
  return [[2, 3, 11], [3, 1, 10], [4, 2, 14], [5, -3, 12], [2, 7, 19], [3, 6, 24], [6, 2, 20], [4, 5, 21], [2, -1, 9], [5, 4, 24]].map(([a, b, c]) => {
    const x = (c - b) / a, bs = b < 0 ? `- ${-b}` : `+ ${b}`;
    return { q: `Solve ${a}x ${bs} = ${c}`, a: String(x), distractors: nearInts(x, [c - b, c + b, x + a, x + 2]) };
  });
}

// ---- nth term of a linear sequence ----
function nthTerm() {
  return [[2, 1], [3, -1], [5, 2], [4, 3], [2, 5], [6, -4], [3, 2], [10, -5], [7, 1], [4, -3]].map(([a, b]) => {
    const seq = [1, 2, 3, 4].map((n) => a * n + b).join(", ");
    const bs = b > 0 ? ` + ${b}` : ` - ${-b}`, ans = `${a}n${bs}`;
    return { q: `nth term of ${seq}, …`, a: ans, distractors: notAns([`${a + 1}n${bs}`, `n${bs}`, `${a}n${b > 0 ? ` - ${b}` : ` + ${-b}`}`], ans) };
  });
}

// ---- Substitution: ax + b at x = v ----
function substitution() {
  return [[3, 2, 4], [2, 5, 3], [4, -1, 5], [5, 2, 2], [2, 3, 6], [6, -2, 3], [3, 4, 1], [4, 1, 5], [2, -3, 4], [5, 1, 3]].map(([a, b, v]) => {
    const val = a * v + b, bs = b < 0 ? `- ${-b}` : `+ ${b}`;
    return { q: `If x = ${v}, find ${a}x ${bs}`, a: String(val), distractors: nearInts(val, [a * v, a + b + v, v + b]) };
  });
}

// ---- Pythagoras: hypotenuse from a right triangle ----
function pythagoras() {
  return [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 16, 20], [10, 24, 26]].map(([a, b, c]) => (
    { q: `Right triangle, legs ${a} and ${b}. Hypotenuse?`, a: String(c), distractors: nearInts(c, [a + b, c - 1, a + b - 1]) }
  ));
}

// ---- Circles in terms of π ----
function circles() {
  const qs = [];
  [3, 4, 5, 6, 7, 8, 10].forEach((r) => {
    qs.push({ q: `Area of a circle, radius ${r} (in terms of \\pi)`, a: `${r * r}\\pi`, distractors: notAns([`${2 * r}\\pi`, `${r}\\pi`, `${r * r * r}\\pi`], `${r * r}\\pi`) });
    qs.push({ q: `Circumference of a circle, radius ${r} (in terms of \\pi)`, a: `${2 * r}\\pi`, distractors: notAns([`${r * r}\\pi`, `${r}\\pi`, `${4 * r}\\pi`], `${2 * r}\\pi`) });
  });
  return qs;
}

// ---- Area of rectangles & triangles ----
function areas() {
  const qs = [];
  [[5, 8], [6, 7], [9, 4], [12, 3], [10, 10], [7, 6]].forEach(([l, w]) => qs.push({ q: `Area of a rectangle ${l} by ${w}`, a: String(l * w), distractors: nearInts(l * w, [2 * (l + w), l + w, l * w + l]) }));
  [[8, 6], [10, 4], [12, 5], [9, 8], [14, 3]].forEach(([b, h]) => { const ar = b * h / 2; qs.push({ q: `Area of a triangle, base ${b}, height ${h}`, a: String(ar), distractors: nearInts(ar, [b * h, b + h, ar + b]) }); });
  return qs;
}

// ---- Angles (triangle / straight line / point) ----
function angles() {
  const qs = [];
  [[60, 70, 50], [90, 40, 50], [45, 55, 80], [30, 100, 50], [72, 53, 55], [20, 120, 40]].forEach(([a, b, c]) => qs.push({ q: `Triangle angles ${a}\\deg and ${b}\\deg. Third angle?`, a: `${c}\\deg`, distractors: notAns([`${180 - a}\\deg`, `${a + b}\\deg`, `${c + 10}\\deg`], `${c}\\deg`) }));
  [[110, 70], [35, 145], [125, 55], [48, 132], [160, 20]].forEach(([a, b]) => qs.push({ q: `Angles on a straight line: one is ${a}\\deg. The other?`, a: `${b}\\deg`, distractors: notAns([`${360 - a}\\deg`, `${a}\\deg`, `${b + 10}\\deg`], `${b}\\deg`) }));
  [[120, 240], [90, 270], [150, 210], [200, 160]].forEach(([a, b]) => qs.push({ q: `Angles around a point: one is ${a}\\deg. The rest total?`, a: `${b}\\deg`, distractors: notAns([`${180 - a}\\deg`, `${a}\\deg`, `${b + 20}\\deg`], `${b}\\deg`) }));
  return qs;
}

// ---- Averages (mean / median / mode / range) ----
function averages() {
  const lists = [[4, 4, 6, 7, 9], [2, 5, 5, 8, 10], [3, 6, 6, 6, 9], [1, 4, 4, 7, 9], [1, 2, 2, 7, 8], [5, 5, 6, 10, 14], [3, 3, 7, 8, 9], [4, 6, 6, 9, 10]];
  const qs = [];
  lists.forEach((L) => {
    const s = [...L].sort((a, b) => a - b), sum = L.reduce((t, x) => t + x, 0), mean = sum / L.length, median = s[2], range = s[4] - s[0];
    const counts = {}; L.forEach((x) => (counts[x] = (counts[x] || 0) + 1));
    let mode = L[0], best = 0; for (const k in counts) if (counts[k] > best) { best = counts[k]; mode = +k; }
    const str = L.join(", ");
    qs.push({ q: `Mean of ${str}`, a: String(mean), distractors: nearInts(mean, [median, mode, range]) });
    qs.push({ q: `Median of ${str}`, a: String(median), distractors: nearInts(median, [mean, mode, range]) });
    qs.push({ q: `Range of ${str}`, a: String(range), distractors: nearInts(range, [mean, median, mode]) });
    qs.push({ q: `Mode of ${str}`, a: String(mode), distractors: nearInts(mode, [mean, median, range]) });
  });
  return qs;
}

// ---- Negative numbers (directed arithmetic) ----
const negatives = [
  ["-5 + 8", 3], ["-3 - 4", -7], ["2 - 9", -7], ["-6 + 1", -5], ["-4 \\times 3", -12],
  ["-12 \\div 4", -3], ["-2 \\times (-5)", 10], ["7 - (-3)", 10], ["-8 + (-2)", -10], ["5 \\times (-4)", -20],
  ["-15 \\div (-3)", 5], ["-1 - 6", -7],
].map(([q, ans]) => ({ q, a: String(ans), distractors: nearN(ans) }));

// ---- Probability (verified) ----
const probability = [
  { q: "P(even) on a fair die", a: "\\frac{1}{2}", distractors: ["\\frac{1}{6}", "\\frac{1}{3}", "\\frac{2}{3}"] },
  { q: "P(rolling a 5) on a fair die", a: "\\frac{1}{6}", distractors: ["\\frac{1}{5}", "\\frac{5}{6}", "\\frac{1}{2}"] },
  { q: "P(red) from 3 red, 2 blue", a: "\\frac{3}{5}", distractors: ["\\frac{2}{5}", "\\frac{3}{2}", "\\frac{1}{3}"] },
  { q: "P(a vowel) in the letters of CAT", a: "\\frac{1}{3}", distractors: ["\\frac{2}{3}", "\\frac{1}{2}", "\\frac{1}{4}"] },
  { q: "P(heads) on a fair coin", a: "\\frac{1}{2}", distractors: ["\\frac{1}{4}", "\\frac{1}{3}", "1"] },
  { q: "P(not a 6) on a fair die", a: "\\frac{5}{6}", distractors: ["\\frac{1}{6}", "\\frac{4}{6}", "\\frac{6}{5}"] },
  { q: "P(multiple of 3) on a fair die", a: "\\frac{1}{3}", distractors: ["\\frac{1}{6}", "\\frac{1}{2}", "\\frac{2}{3}"] },
  { q: "P(blue) from 1 red, 3 blue, 4 green", a: "\\frac{3}{8}", distractors: ["\\frac{1}{8}", "\\frac{4}{8}", "\\frac{3}{4}"] },
  { q: "A certain event has probability…", a: "1", distractors: ["0", "\\frac{1}{2}", "100"] },
  { q: "An impossible event has probability…", a: "0", distractors: ["1", "\\frac{1}{2}", "-1"] },
];

// ---- Rounding: decimal places & significant figures (verified) ----
const roundingGCSE = [
  { q: "Round 3.47 to 1 decimal place", a: "3.5", distractors: ["3.4", "3.47", "4"] },
  { q: "Round 12.83 to 1 decimal place", a: "12.8", distractors: ["12.9", "13", "12.83"] },
  { q: "Round 0.0456 to 2 decimal places", a: "0.05", distractors: ["0.04", "0.046", "0.5"] },
  { q: "Round 487 to 1 significant figure", a: "500", distractors: ["400", "490", "480"] },
  { q: "Round 3621 to 2 significant figures", a: "3600", distractors: ["3700", "3620", "3500"] },
  { q: "Round 0.00812 to 1 significant figure", a: "0.008", distractors: ["0.009", "0.08", "0.0081"] },
  { q: "Round 7.96 to 1 decimal place", a: "8.0", distractors: ["7.9", "7.96", "8.96"] },
  { q: "Round 149 to 1 significant figure", a: "100", distractors: ["200", "150", "140"] },
  { q: "Round 2.345 to 2 decimal places", a: "2.35", distractors: ["2.34", "2.3", "2.4"] },
  { q: "Round 68500 to 2 significant figures", a: "69000", distractors: ["68000", "70000", "68500"] },
];

export const STARTER_PACKS = [
  { id: "pk-times", name: "Times tables (2–12)", builtIn: true, questions: timesTables() },
  { id: "pk-powers", name: "Square & cube numbers", builtIn: true, questions: powers() },
  { id: "pk-fractions", name: "Fractions of amounts", builtIn: true, questions: fractions },
  { id: "pk-bidmas", name: "Order of operations (BIDMAS)", builtIn: true, questions: bidmas },
  { id: "pk-percent", name: "Percentages of amounts", builtIn: true, questions: percentages },
  { id: "pk-rounding", name: "Rounding to the nearest 10", builtIn: true, questions: rounding },

  // ---- GCSE secondary maths ----
  { id: "pk-hcflcm", name: "GCSE: HCF & LCM", builtIn: true, questions: hcfLcm() },
  { id: "pk-neg", name: "GCSE: Negative numbers", builtIn: true, questions: negatives },
  { id: "pk-stdform", name: "GCSE: Standard form", builtIn: true, questions: standardForm },
  { id: "pk-fdp", name: "GCSE: Fractions, decimals & percentages", builtIn: true, questions: fdp },
  { id: "pk-pctchange", name: "GCSE: Percentage increase & decrease", builtIn: true, questions: percentChange() },
  { id: "pk-ratiosimp", name: "GCSE: Simplifying ratio", builtIn: true, questions: simplifyRatio() },
  { id: "pk-ratioshare", name: "GCSE: Sharing in a ratio", builtIn: true, questions: ratioShare() },
  { id: "pk-rounding2", name: "GCSE: Rounding (d.p. & sig figs)", builtIn: true, questions: roundingGCSE },
  { id: "pk-indices", name: "GCSE: Laws of indices", builtIn: true, questions: indices() },
  { id: "pk-expand1", name: "GCSE: Expanding single brackets", builtIn: true, questions: expandSingle() },
  { id: "pk-expand2", name: "GCSE: Expanding double brackets", builtIn: true, questions: expandDouble() },
  { id: "pk-factorise", name: "GCSE: Factorising quadratics", builtIn: true, questions: factorise() },
  { id: "pk-solve", name: "GCSE: Solving linear equations", builtIn: true, questions: solveLinear() },
  { id: "pk-nth", name: "GCSE: nth term of a sequence", builtIn: true, questions: nthTerm() },
  { id: "pk-subst", name: "GCSE: Substitution", builtIn: true, questions: substitution() },
  { id: "pk-pythag", name: "GCSE: Pythagoras", builtIn: true, questions: pythagoras() },
  { id: "pk-circles", name: "GCSE: Circles (in terms of π)", builtIn: true, questions: circles() },
  { id: "pk-area", name: "GCSE: Area of rectangles & triangles", builtIn: true, questions: areas() },
  { id: "pk-angles", name: "GCSE: Angles (lines, triangles, points)", builtIn: true, questions: angles() },
  { id: "pk-averages", name: "GCSE: Averages & range", builtIn: true, questions: averages() },
  { id: "pk-prob", name: "GCSE: Probability", builtIn: true, questions: probability },

  { id: "pk-homophones", name: "Homophones (English)", builtIn: true, questions: homophones },
  { id: "pk-wordclass", name: "Word classes (English)", builtIn: true, questions: wordClasses },
  { id: "pk-elements", name: "Element symbols (Science)", builtIn: true, questions: elements },
  { id: "pk-capitals", name: "Capital cities (Geography)", builtIn: true, questions: capitals },
];
