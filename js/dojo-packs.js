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

export const STARTER_PACKS = [
  { id: "pk-times", name: "Times tables (2–12)", builtIn: true, questions: timesTables() },
  { id: "pk-powers", name: "Square & cube numbers", builtIn: true, questions: powers() },
  { id: "pk-fractions", name: "Fractions of amounts", builtIn: true, questions: fractions },
  { id: "pk-bidmas", name: "Order of operations (BIDMAS)", builtIn: true, questions: bidmas },
  { id: "pk-percent", name: "Percentages of amounts", builtIn: true, questions: percentages },
  { id: "pk-capitals", name: "Capital cities (example)", builtIn: true, questions: capitals },
];
