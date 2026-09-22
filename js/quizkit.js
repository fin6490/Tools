// quizkit.js — shared helpers for the Play-tab quiz games (Reveal cards, Bingo,
// Pairs, Class quiz, Grid claim…). They all reuse the question sets that the
// BT Dojo editor + AI generator produce, plus a tiny maths renderer so fractions
// and powers show properly. The Dojo keeps its own copies; new games use these.
import { STARTER_PACKS } from "./dojo-packs.js?v=20260916j";
import { getState, save } from "./storage.js?v=20260916j";
import { SUPPORT } from "./support.js?v=20260916j";

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

// Shrink `face`'s font-size until it fits inside `box` (a fixed-size tile), so a
// wordy answer wraps and scales down instead of being clipped. Runs after the
// next layout pass so the box has real dimensions.
export function fitText(box, face, max = 26, min = 9) {
  if (!box || !face) return;
  requestAnimationFrame(() => {
    if (!box.clientHeight) return;
    let size = max;
    face.style.fontSize = size + "px";
    while (size > min && (box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1)) {
      size -= 1; face.style.fontSize = size + "px";
    }
  });
}

// Big on-board display text (Reveal / Bingo caller / Class quiz): keep the large
// readable size for normal answers, but scale a very long one down so it doesn't
// overrun the board. maxVh caps the block's height as a fraction of the viewport.
export function fitBlock(face, maxVh = 0.4, max = 60, min = 22) {
  if (!face) return;
  requestAnimationFrame(() => {
    const cap = Math.max(140, Math.round((window.innerHeight || 800) * maxVh));
    let size = max, guard = 0;
    face.style.fontSize = size + "px";
    while (size > min && face.scrollHeight > cap && guard++ < 200) { size -= 2; face.style.fontSize = size + "px"; }
  });
}

/* ---------- AI set generation (shared with the Dojo's hosted generator) ---------- */
// Calls the Cloudflare Worker, saves the new set into the shared dojo.sets store
// (so it shows up in every game), and returns it. Throws on failure.
export async function generateSet(topic, count = 12, tries = 3) {
  // The model occasionally returns output the Worker can't parse, so retry a few
  // times before giving up — most failures clear on the next attempt.
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (SUPPORT.dojoGenerateToken) headers["x-dojo-token"] = SUPPORT.dojoGenerateToken;
      const res = await fetch(SUPPORT.dojoGenerateEndpoint, { method: "POST", headers, body: JSON.stringify({ topic, count }) });
      if (!res.ok) throw new Error("status " + res.status);
      const data = await res.json();
      const qs = Array.isArray(data.questions) ? data.questions.filter((q) => q && q.q && q.a).map((q) => {
        const out = { q: String(q.q), a: String(q.a), distractors: Array.isArray(q.distractors) ? q.distractors.map(String) : [] };
        if (Array.isArray(q.answers) && q.answers.length > 1) out.answers = q.answers.map(String);
        return out;
      }) : [];
      if (qs.length < 2) throw new Error("empty");
      const s = getState();
      if (!s.dojo) s.dojo = {};
      if (!Array.isArray(s.dojo.sets)) s.dojo.sets = [];
      const set = { id: uid(), name: (data.name || topic).slice(0, 60), questions: qs };
      s.dojo.sets.push(set); save();
      return set;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// A ready-made "type a topic → Generate" row. onGenerated(newSet, flashMsg) fires
// on success (after the set is saved). Degrades gracefully when AI isn't set up.
// How many questions the generator can be asked for. The Worker clamps to this
// same ceiling, so keep the two in step.
export const GEN_COUNTS = [8, 10, 12, 16, 20, 25, 30];

export function makeGenerateRow(onGenerated) {
  const wrap = el("div", "dojo-field");
  wrap.appendChild(el("label", "dojo-lbl", "Generate a set with AI — type a topic"));
  const row = el("div", "dojo-genrow");
  const input = el("input", "dojo-input"); input.placeholder = "e.g. Year 8 equations, KS2 homophones…"; input.maxLength = 120;
  const count = el("select", "dojo-select dojo-select-sm dojo-gencount"); count.title = "How many questions";
  GEN_COUNTS.forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " Qs"; if (n === 12) o.selected = true; count.appendChild(o); });
  const btn = el("button", "btn primary", "Generate");
  row.append(input, count, btn); wrap.appendChild(row);
  const note = el("p", "dojo-hint dojo-gennote"); note.hidden = true; wrap.appendChild(note);
  const doGen = async () => {
    const t = input.value.trim(); if (!t) return;
    if (!SUPPORT.dojoGenerateEndpoint) { note.hidden = false; note.textContent = "AI generation isn't switched on for this site yet — pick or make a set below."; return; }
    btn.disabled = true; const orig = btn.textContent; btn.textContent = "Generating…"; note.hidden = true;
    try {
      const set = await generateSet(t, +count.value);
      onGenerated(set, `Generated ${set.questions.length} questions on “${t}” — ready to play.`);
    } catch {
      btn.disabled = false; btn.textContent = orig;
      note.hidden = false; note.textContent = "Couldn't generate that just now — try again, or pick a set below.";
    }
  };
  btn.addEventListener("click", doGen);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doGen(); });
  return wrap;
}
