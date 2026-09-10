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

export const STARTER_PACKS = [
  { id: "pk-times", name: "Times tables (2–12)", builtIn: true, questions: timesTables() },
  { id: "pk-powers", name: "Square & cube numbers", builtIn: true, questions: powers() },
  { id: "pk-fractions", name: "Fractions of amounts", builtIn: true, questions: fractions },
  { id: "pk-bidmas", name: "Order of operations (BIDMAS)", builtIn: true, questions: bidmas },
  { id: "pk-percent", name: "Percentages of amounts", builtIn: true, questions: percentages },
  { id: "pk-rounding", name: "Rounding to the nearest 10", builtIn: true, questions: rounding },
  { id: "pk-homophones", name: "Homophones (English)", builtIn: true, questions: homophones },
  { id: "pk-wordclass", name: "Word classes (English)", builtIn: true, questions: wordClasses },
  { id: "pk-elements", name: "Element symbols (Science)", builtIn: true, questions: elements },
  { id: "pk-capitals", name: "Capital cities (Geography)", builtIn: true, questions: capitals },
];
