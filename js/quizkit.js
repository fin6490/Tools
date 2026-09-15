// quizkit.js — shared helpers for the Play-tab quiz games (Reveal cards, Bingo,
// Pairs, Class quiz, Grid claim…). They all reuse the question sets that the
// BT Dojo editor + AI generator produce, plus a tiny maths renderer so fractions
// and powers show properly. The Dojo keeps its own copies; new games use these.
import { STARTER_PACKS } from "./dojo-packs.js?v=20260915b";
import { getState } from "./storage.js?v=20260915b";

export function rint(n) { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; }
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const norm = (s) => String(s).trim().toLowerCase();
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "s" + Math.random().toString(36).slice(2));
export const escapeHtml = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

// A question may accept more than one correct answer; `a` is the primary/display.
export const answersOf = (q) => (Array.isArray(q.answers) && q.answers.length) ? q.answers : [q.a];
export const isCorrect = (q, v) => new Set(answersOf(q).map(norm)).has(norm(v));

// Question sets shared with the Dojo: built-in starter packs + the teacher's saved sets.
export function allSets() {
  const d = getState().dojo;
  const saved = d && Array.isArray(d.sets) ? d.sets : [];
  return [...STARTER_PACKS, ...saved];
}
// The roster names from a saved wheel (for team/whole-class games).
export function rosterFromWheel(wheelId, parseEntries) {
  const w = (getState().wheels || []).find((x) => x.id === wheelId);
  return w ? parseEntries(w.text).map((s) => s.label).filter(Boolean) : [];
}

// Tiny maths markup renderer (no KaTeX): \frac{a}{b}, x^2, \sqrt{9}, \times etc.
export function mathHtml(str) {
  let s = String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '<span class="mfrac"><span class="mnum">$1</span><span class="mden">$2</span></span>');
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '<span class="msqrt">$1</span>');
  s = s.replace(/\^\{([^{}]*)\}/g, "<sup>$1</sup>").replace(/_\{([^{}]*)\}/g, "<sub>$1</sub>");
  s = s.replace(/\^(-?[0-9A-Za-z])/g, "<sup>$1</sup>").replace(/_(-?[0-9A-Za-z])/g, "<sub>$1</sub>");
  s = s.replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\pm/g, "±")
       .replace(/\\le\b/g, "≤").replace(/\\ge\b/g, "≥").replace(/\\ne\b/g, "≠")
       .replace(/\\cdot/g, "·").replace(/\\pi\b/g, "π").replace(/\\theta\b/g, "θ")
       .replace(/\\deg\b/g, "°").replace(/\\%/g, "%");
  return s;
}

export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
