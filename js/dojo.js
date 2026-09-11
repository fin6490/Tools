// dojo.js — The BT Dojo: a head-to-head classroom quiz game for the whiteboard.
// Two players race to find the correct answer on their own shuffled board;
// winner stays on as champion, a new challenger steps up. Points, lives,
// a bigger power-up set, an on-screen "spin the wheel" picker for the class,
// and per-class + overall leaderboards. Works for any subject. Zero deps —
// no KaTeX, a tiny maths renderer instead.
import { getState, save } from "./storage.js?v=20260911b";
import { STARTER_PACKS } from "./dojo-packs.js?v=20260911b";
import { parseEntries } from "./wheel.js?v=20260911b";
import { SUPPORT } from "./support.js?v=20260911b";
import * as sound from "./sound.js?v=20260911b";

/* ---------- crypto randomness ---------- */
function rint(n) { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const norm = (s) => String(s).trim().toLowerCase();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "s" + Math.random().toString(36).slice(2));

/* ---------- tiny maths markup renderer (no KaTeX) ---------- */
function mathHtml(str) {
  let s = String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,
    '<span class="mfrac"><span class="mnum">$1</span><span class="mden">$2</span></span>');
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '<span class="msqrt">$1</span>');
  s = s.replace(/\^\{([^{}]*)\}/g, "<sup>$1</sup>").replace(/_\{([^{}]*)\}/g, "<sub>$1</sub>");
  s = s.replace(/\^(-?[0-9A-Za-z])/g, "<sup>$1</sup>").replace(/_(-?[0-9A-Za-z])/g, "<sub>$1</sub>");
  s = s.replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\pm/g, "±")
       .replace(/\\le\b/g, "≤").replace(/\\ge\b/g, "≥").replace(/\\ne\b/g, "≠")
       .replace(/\\cdot/g, "·").replace(/\\pi\b/g, "π").replace(/\\theta\b/g, "θ")
       .replace(/\\deg\b/g, "°").replace(/\\%/g, "%");
  return s;
}

/* ---------- inline SVG icons (no emoji) ---------- */
const SVG = {
  heart: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 21s-6.8-4.35-9.2-8.6C1 9.3 2.5 5.5 6 5.5c2 0 3.3 1.2 4 2.5.7-1.3 2-2.5 4-2.5 3.5 0 5 3.8 3.2 6.9C18.8 16.65 12 21 12 21z"/></svg>',
  fifty: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  heal: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  steal: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  freeze: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3l7 3v5c0 4.3-3 7.8-7 9-4-1.2-7-4.7-7-9V6l7-3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  poison: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3a6 6 0 0 0-4 10.5V17a4 4 0 0 0 8 0v-3.5A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9.7" cy="11" r="1.3" fill="currentColor"/><circle cx="14.3" cy="11" r="1.3" fill="currentColor"/></svg>',
  jumble: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h4l9 10h3M4 17h4l3-3.3M17 4l3 3-3 3M17 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  timebomb: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="14" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10v4l3 2M9 2h6M18.5 6.5l2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v18" stroke="currentColor" stroke-width="2" stroke-dasharray="2 3"/><path d="M8 8L4 12l4 4M16 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  focus: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  crown: '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M3 8l4 3 5-7 5 7 4-3-2 11H5L3 8z" fill="currentColor"/></svg>',
  swords: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 4h3l9 9-3 3-9-9V4zm16 0h-3l-4 4 3 3 4-4V4zM3 18l4-4 3 3-4 4H3v-3zm14-1l3 3v1h-1l-3-3 1-1z" fill="currentColor"/></svg>',
  flame: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.6.7-2.8 1.4-3.6C8.6 8.9 9 9.8 10 10c-.3-2 .8-4.6 2-8z" fill="currentColor"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9a3 3 0 0 1 0 6M18.5 7a6 6 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

// Power-up catalogue. Each player is granted 3 at random per round, but only
// ONE may be used per round — so it's a choice, not a free-for-all at the start.
const POWERS = {
  fifty:  { name: "50:50",  label: "50:50 — clear half your wrong answers", icon: SVG.fifty },
  heal:   { name: "Heal",   label: "Heal — restore one life", icon: SVG.heal },
  shield: { name: "Shield", label: "Shield — block your next wrong answer", icon: SVG.shield },
  steal:  { name: "Steal",  label: "Steal — take a life from your opponent", icon: SVG.steal },
  freeze: { name: "Freeze", label: "Freeze — freeze your opponent for 3 seconds", icon: SVG.freeze },
  poison: { name: "Poison", label: "Poison — your opponent loses a life over time", icon: SVG.poison },
  jumble: { name: "Jumble", label: "Jumble — shuffle your opponent's answers", icon: SVG.jumble },
  timebomb: { name: "Time bomb", label: "Time bomb — the opponent loses a life if they don't answer in 5s", icon: SVG.timebomb },
  mirror: { name: "Mirror", label: "Mirror — reflect the opponent's next power-up back at them", icon: SVG.mirror },
  focus: { name: "Focus", label: "Focus — your next correct answer scores double", icon: SVG.focus },
};
const POWER_KEYS = Object.keys(POWERS);

export function initDojo(root) {
  const panel = root.querySelector(".dojo-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState();
    if (!s.dojo) s.dojo = {};
    const d = s.dojo;
    if (typeof d.lives !== "number") d.lives = 3;
    if (!Array.isArray(d.sets)) d.sets = [];
    if (!d.leaderboards) {
      d.leaderboards = {};
      // migrate the old single flat leaderboard into an "ad-hoc" bucket
      if (d.leaderboard && Object.keys(d.leaderboard).length) {
        const b = {};
        for (const [n, v] of Object.entries(d.leaderboard)) b[n] = { wins: v.wins || 0, games: v.games || 0, best: v.best || 0, points: 0 };
        d.leaderboards.adhoc = b;
      }
    }
    return d;
  };
  const allSets = () => [...STARTER_PACKS, ...cfg().sets];
  const activeSet = () => allSets().find((x) => x.id === cfg().activeSetId) || STARTER_PACKS[0];
  const wheels = () => getState().wheels || [];
  const roster = () => {
    const w = wheels().find((x) => x.id === cfg().rosterWheelId);
    return w ? parseEntries(w.text).map((s) => s.label).filter(Boolean) : [];
  };
  const randomName = (exclude) => {
    const pool = roster().filter((n) => norm(n) !== norm(exclude || ""));
    return pool.length ? pool[rint(pool.length)] : "";
  };

  /* ---------- leaderboard storage (per class + overall) ---------- */
  const classKeyNow = () => cfg().rosterWheelId || "adhoc";
  const classLabel = (key) => key === "adhoc" ? "Ad-hoc games" : (wheels().find((w) => w.id === key)?.name || "Former class");
  function bucket(key) { const b = cfg().leaderboards; if (!b[key]) b[key] = {}; return b[key]; }
  function lbRow(store, name) { if (!store[name]) store[name] = { wins: 0, games: 0, best: 0, points: 0 }; return store[name]; }
  function overallRows() {
    const merged = {};
    for (const b of Object.values(cfg().leaderboards)) {
      for (const [name, v] of Object.entries(b)) {
        const m = merged[name] || (merged[name] = { wins: 0, games: 0, best: 0, points: 0 });
        m.wins += v.wins || 0; m.games += v.games || 0; m.points += v.points || 0; m.best = Math.max(m.best, v.best || 0);
      }
    }
    return merged;
  }
  const hasAnyBoard = () => Object.values(cfg().leaderboards).some((b) => Object.keys(b).length);

  let soundOn = getState().soundOn !== false;
  let live = null;
  let blockTimer = null;
  let poisonTimers = [];
  let bombTimers = [];

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    clearTimers();
    const sets = allSets();
    if (!cfg().activeSetId || !sets.find((x) => x.id === cfg().activeSetId)) cfg().activeSetId = sets[0].id;

    panel.innerHTML = "";
    const card = el("div", "dojo-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Classroom quiz duel"));
    card.appendChild(el("h2", "dojo-title", "The BT Dojo"));
    card.appendChild(el("p", "dojo-lede", "Two students race to answer on their own board. Winner stays on as champion — a new challenger steps up. Best on an interactive whiteboard."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    // Type a topic → generate a set with AI (works once the hosted generator is set up).
    const genRow = el("div", "dojo-field");
    genRow.appendChild(el("label", "dojo-lbl", "Generate a set — type a topic"));
    const genWrap = el("div", "dojo-genrow");
    const topicIn = el("input", "dojo-input"); topicIn.placeholder = "e.g. Year 8 solving equations, KS2 homophones…"; topicIn.maxLength = 120;
    const genBtn = el("button", "btn primary", "Generate");
    genWrap.append(topicIn, genBtn);
    genRow.appendChild(genWrap);
    const genNote = el("p", "dojo-hint dojo-gennote"); genNote.hidden = true; genRow.appendChild(genNote);
    const doGen = async () => {
      const t = topicIn.value.trim();
      if (!t) return;
      if (!SUPPORT.dojoGenerateEndpoint) { genNote.hidden = false; genNote.textContent = "AI generation isn't switched on for this site yet — pick or make a set below."; return; }
      genBtn.disabled = true; const orig = genBtn.textContent; genBtn.textContent = "Generating…"; genNote.hidden = true;
      try {
        const headers = { "Content-Type": "application/json" };
        if (SUPPORT.dojoGenerateToken) headers["x-dojo-token"] = SUPPORT.dojoGenerateToken;
        const res = await fetch(SUPPORT.dojoGenerateEndpoint, { method: "POST", headers, body: JSON.stringify({ topic: t, count: 12 }) });
        if (!res.ok) throw new Error("status " + res.status);
        const data = await res.json();
        const qs = Array.isArray(data.questions) ? data.questions.filter((q) => q && q.q && q.a).map((q) => ({ q: String(q.q), a: String(q.a), distractors: Array.isArray(q.distractors) ? q.distractors.map(String) : [] })) : [];
        if (qs.length < 2) throw new Error("empty");
        const id = uid(); cfg().sets.push({ id, name: (data.name || t).slice(0, 60), questions: qs }); cfg().activeSetId = id; save();
        renderLobby(`Generated ${qs.length} questions on “${t}” — ready to play.`);
      } catch {
        genBtn.disabled = false; genBtn.textContent = orig;
        genNote.hidden = false; genNote.textContent = "Couldn't generate that just now — try again, or make a set in the editor.";
      }
    };
    genBtn.addEventListener("click", doGen);
    topicIn.addEventListener("keydown", (e) => { if (e.key === "Enter") doGen(); });
    card.appendChild(genRow);

    const setRow = el("div", "dojo-field");
    setRow.appendChild(el("label", "dojo-lbl", "Or pick a saved set"));
    const sel = el("select", "dojo-select");
    sets.forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${s.questions.length})`; if (s.id === cfg().activeSetId) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { cfg().activeSetId = sel.value; save(); });
    setRow.appendChild(sel);
    const setBtns = el("div", "dojo-setbtns");
    const editBtn = el("button", "btn ghost", "Edit / new set");
    editBtn.addEventListener("click", () => renderEditor(null));
    setBtns.appendChild(editBtn);
    setRow.appendChild(setBtns);
    card.appendChild(setRow);

    const livesRow = el("div", "dojo-field dojo-field-inline");
    livesRow.appendChild(el("label", "dojo-lbl", "Lives each"));
    const livesSel = el("select", "dojo-select dojo-select-sm");
    [1, 2, 3, 4, 5].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === (cfg().lives || 3)) o.selected = true; livesSel.appendChild(o); });
    livesSel.addEventListener("change", () => { cfg().lives = +livesSel.value; save(); });
    livesRow.appendChild(livesSel);
    card.appendChild(livesRow);

    // Optional: pull the class roster from one of the user's saved wheels.
    const classRow = el("div", "dojo-field");
    classRow.appendChild(el("label", "dojo-lbl", "Class (optional — from a saved wheel)"));
    const clsSel = el("select", "dojo-select");
    const none = el("option"); none.value = ""; none.textContent = "— none —"; clsSel.appendChild(none);
    wheels().forEach((w) => { const o = el("option"); o.value = w.id; o.textContent = `${w.name} (${parseEntries(w.text).length})`; if (w.id === cfg().rosterWheelId) o.selected = true; clsSel.appendChild(o); });
    clsSel.addEventListener("change", () => { cfg().rosterWheelId = clsSel.value || null; save(); renderLobby(); });
    classRow.appendChild(clsSel);
    card.appendChild(classRow);

    const list = roster();
    const names = el("div", "dojo-names");
    const p1 = el("input", "dojo-input"); p1.placeholder = "Champion name"; p1.maxLength = 24;
    const p2 = el("input", "dojo-input"); p2.placeholder = "Challenger name"; p2.maxLength = 24;
    const p1w = el("div", "dojo-nameentry"); p1w.appendChild(p1);
    const p2w = el("div", "dojo-nameentry"); p2w.appendChild(p2);
    if (list.length) {
      const dl = el("datalist"); dl.id = "djRoster"; list.forEach((n) => { const o = el("option"); o.value = n; dl.appendChild(o); });
      card.appendChild(dl);
      p1.setAttribute("list", "djRoster"); p2.setAttribute("list", "djRoster");
      const r1 = el("button", "btn ghost dojo-rand", "Random"); r1.type = "button"; r1.addEventListener("click", () => { p1.value = randomName(p2.value); });
      const r2 = el("button", "btn ghost dojo-rand", "Random"); r2.type = "button"; r2.addEventListener("click", () => { p2.value = randomName(p1.value); });
      p1w.appendChild(r1); p2w.appendChild(r2);
    }
    names.append(p1w, p2w);
    card.appendChild(names);

    // Spin the class wheel to choose both players.
    if (list.length) {
      const spinBtn = el("button", "btn dojo-spinbtn", "Spin the wheel for players");
      spinBtn.type = "button";
      spinBtn.addEventListener("click", async () => {
        spinBtn.disabled = true;
        const c = await spinPick({ label: "Champion" }); if (c) p1.value = c;
        const ch = await spinPick({ exclude: c, label: "Challenger" }); if (ch) p2.value = ch;
        spinBtn.disabled = false;
      });
      card.appendChild(spinBtn);
    }

    const go = el("button", "btn primary dojo-begin", "Begin duel");
    go.addEventListener("click", () => {
      const n1 = p1.value.trim() || "Player 1";
      const n2 = p2.value.trim() || "Player 2";
      if (!activeSet().questions.length) return;
      startDuel(n1, n2);
    });
    card.appendChild(go);

    const foot = el("div", "dojo-lobbyfoot");
    if (hasAnyBoard()) { const lb = el("button", "btn ghost", "Leaderboards"); lb.addEventListener("click", () => renderLeaderboard()); foot.appendChild(lb); }
    card.appendChild(foot);
    card.appendChild(el("p", "dojo-hint", "Tip: pick a class (a saved wheel) to spin for players and keep a per-class leaderboard. Ask for a ready-made set on any topic, or type one in the editor."));
    panel.appendChild(card);
  }

  /* ================= EDITOR ================= */
  function renderEditor(setId) {
    const existing = cfg().sets.find((s) => s.id === setId);
    const builtin = STARTER_PACKS.find((s) => s.id === setId);
    const editing = existing || null;
    const seed = existing || builtin || null;

    panel.innerHTML = "";
    const card = el("div", "dojo-editor");
    card.appendChild(el("h2", "dojo-title", editing ? "Edit set" : "New question set"));
    card.appendChild(el("p", "dojo-lede", "One question per line: <code>question | answer | wrong, wrong</code>. Wrong answers are optional — the board fills the rest from the other answers in the set."));

    const nameIn = el("input", "dojo-input"); nameIn.placeholder = "Set name";
    nameIn.value = seed ? (existing ? seed.name : seed.name + " (copy)") : "";
    card.appendChild(nameIn);

    const ta = el("textarea", "dojo-textarea");
    ta.spellcheck = false;
    ta.value = seed ? toLines(seed.questions) : "12 \\times 7 | 84\n\\frac{3}{4} of 20 | 15 | 5, 16, 12\nCapital of France | Paris | Lyon, Nice";
    card.appendChild(ta);

    const preview = el("div", "dojo-preview");
    const renderPreview = () => {
      const qs = parseLines(ta.value);
      preview.innerHTML = qs.length
        ? `<span class="dojo-lbl">Preview (${qs.length}) </span>` + mathHtml(qs[0].q) + ' <span class="muted">→</span> ' + mathHtml(qs[0].a)
        : '<span class="muted">Add at least one line.</span>';
    };
    ta.addEventListener("input", renderPreview); renderPreview();

    const row = el("div", "dojo-editbtns");
    const saveBtn = el("button", "btn primary", "Save set");
    saveBtn.addEventListener("click", () => {
      const qs = parseLines(ta.value);
      if (!qs.length) return;
      const name = nameIn.value.trim() || "My set";
      if (editing) { editing.name = name; editing.questions = qs; cfg().activeSetId = editing.id; }
      else { const id = uid(); cfg().sets.push({ id, name, questions: qs }); cfg().activeSetId = id; }
      save(); renderLobby();
    });
    const cancel = el("button", "btn ghost", "Cancel");
    cancel.addEventListener("click", () => renderLobby());
    row.append(saveBtn, cancel);
    if (editing) {
      const del = el("button", "btn ghost dojo-danger", "Delete set");
      del.addEventListener("click", () => {
        cfg().sets = cfg().sets.filter((s) => s.id !== editing.id);
        if (cfg().activeSetId === editing.id) cfg().activeSetId = null;
        save(); renderLobby();
      });
      row.appendChild(del);
    }
    card.appendChild(row);

    const io = el("details", "dojo-io");
    io.innerHTML = "<summary>Import / export as JSON</summary>";
    const jsonTa = el("textarea", "dojo-textarea dojo-json");
    jsonTa.spellcheck = false; jsonTa.placeholder = '{"name":"My set","questions":[{"q":"...","a":"...","distractors":["..."]}]}';
    const ioRow = el("div", "dojo-editbtns");
    const loadJson = el("button", "btn ghost", "Load JSON into editor");
    loadJson.addEventListener("click", () => {
      try {
        const obj = JSON.parse(jsonTa.value);
        if (obj.name) nameIn.value = obj.name;
        if (Array.isArray(obj.questions)) { ta.value = toLines(obj.questions); renderPreview(); }
      } catch { jsonTa.value = "That isn't valid JSON — check the braces and quotes."; }
    });
    const copyJson = el("button", "btn ghost", "Copy current as JSON");
    copyJson.addEventListener("click", () => {
      const obj = { name: nameIn.value.trim() || "My set", questions: parseLines(ta.value) };
      jsonTa.value = JSON.stringify(obj);
      jsonTa.focus(); jsonTa.select();
      navigator.clipboard?.writeText(jsonTa.value).catch(() => {});
    });
    ioRow.append(loadJson, copyJson);
    io.append(jsonTa, ioRow);
    card.appendChild(io);

    panel.appendChild(card);
  }

  function parseLines(text) {
    return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const distractors = (parts[2] || "").split(",").map((d) => d.trim()).filter(Boolean);
      return { q: parts[0] || "", a: parts[1] || "", distractors };
    }).filter((x) => x.q && x.a);
  }
  function toLines(questions) {
    return questions.map((x) => `${x.q} | ${x.a}${x.distractors && x.distractors.length ? " | " + x.distractors.join(", ") : ""}`).join("\n");
  }

  /* ================= SPIN THE WHEEL (class picker) ================= */
  function spinPick({ exclude = "", label = "Next up" } = {}) {
    return new Promise((resolve) => {
      const pool = roster().filter((n) => norm(n) !== norm(exclude));
      if (!pool.length) return resolve("");
      const target = pool[rint(pool.length)];
      const ov = el("div", "dojo-spinner", `<p class="dojo-spin-label">${escapeHtml(label)}</p><div class="dojo-spin-name" id="djSpinName">${escapeHtml(pool[0])}</div>`);
      document.body.appendChild(ov);
      const nameEl = ov.querySelector("#djSpinName");
      const done = () => { nameEl.textContent = target; nameEl.classList.add("landed"); fx(sound.fanfare); setTimeout(() => { ov.remove(); resolve(target); }, 850); };
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || pool.length === 1) { setTimeout(done, 250); return; }
      const start = performance.now(), total = 1800;
      const step = () => {
        nameEl.textContent = pool[rint(pool.length)];
        fx(sound.tick);
        const elapsed = performance.now() - start;
        if (elapsed >= total) return done();
        setTimeout(step, 55 + (elapsed / total) * 230); // ease-out
      };
      setTimeout(step, 60);
    });
  }

  /* ================= DUEL / ROUNDS ================= */
  function poolFor(set) {
    const seen = new Set(), pool = [];
    set.questions.forEach((q) => [q.a, ...(q.distractors || [])].forEach((v) => { if (v && !seen.has(norm(v))) { seen.add(norm(v)); pool.push(v); } }));
    return pool;
  }
  function buildOptions(q, pool) {
    const opts = [q.a, ...(q.distractors || [])];
    const seen = new Set(opts.map(norm));
    for (const x of shuffle(pool)) { if (opts.length >= 10) break; if (!seen.has(norm(x))) { seen.add(norm(x)); opts.push(x); } }
    return shuffle(opts).slice(0, 10);
  }

  function startDuel(champ, chal) {
    live = { champion: champ, challenger: chal, streak: 0, classKey: classKeyNow(), questions: shuffle(activeSet().questions), qi: 0 };
    buildBattleShell();
    startRound();
  }

  function startRound() {
    clearTimers();
    const maxLives = cfg().lives || 3;
    if (live.qi >= live.questions.length) { live.questions = shuffle(activeSet().questions); live.qi = 0; }
    const q = live.questions[live.qi];
    const pool = poolFor(activeSet());
    const mk = (name, side) => {
      const granted = shuffle(POWER_KEYS).slice(0, 3);
      const powers = {}; granted.forEach((k) => (powers[k] = 1));
      return { name, side, lives: maxLives, opts: buildOptions(q, pool), granted, powers, powerUsed: false, shield: false, mirror: false, focus: false, blockedUntil: 0, poisoned: false, over: false };
    };
    live.q = q;
    live.p1 = mk(live.champion, "p1");
    live.p2 = mk(live.challenger, "p2");
    live.roundOver = false;
    paintRound();
  }

  function buildBattleShell() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "dojo-battle", `
      <div class="dojo-toprow">
        <span class="dojo-set" id="djSet"></span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="djMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="djQuit">End session</button>
        </span>
      </div>
      <div class="dojo-hud">
        <div class="dojo-hud-side dojo-hud-champ"><span class="dojo-role">${SVG.crown}</span><span class="dojo-pname" id="djName1"></span><span class="dojo-badges"><span class="dojo-badge dojo-badge-shield" id="djShield1" hidden title="Shield armed">${SVG.shield}</span><span class="dojo-badge dojo-badge-mirror" id="djMirror1" hidden title="Mirror armed">${SVG.mirror}</span><span class="dojo-badge dojo-badge-focus" id="djFocus1" hidden title="Focus armed">${SVG.focus}</span></span></div>
        <div class="dojo-hud-center">
          <span class="dojo-lives" id="djLives1"></span>
          <span class="dojo-streakbadge" id="djStreak">${SVG.flame}<b>0</b></span>
          <span class="dojo-lives" id="djLives2"></span>
        </div>
        <div class="dojo-hud-side dojo-hud-chal"><span class="dojo-badges"><span class="dojo-badge dojo-badge-shield" id="djShield2" hidden title="Shield armed">${SVG.shield}</span><span class="dojo-badge dojo-badge-mirror" id="djMirror2" hidden title="Mirror armed">${SVG.mirror}</span><span class="dojo-badge dojo-badge-focus" id="djFocus2" hidden title="Focus armed">${SVG.focus}</span></span><span class="dojo-pname" id="djName2"></span><span class="dojo-role">${SVG.swords}</span></div>
      </div>
      <div class="dojo-qbar"><p class="dojo-race">Race to solve</p><div class="dojo-q" id="djQ"></div></div>
      <div class="dojo-arena">
        <div class="dojo-side dojo-p1">
          <div class="dojo-boardwrap"><div class="dojo-grid" id="djGrid1"></div><div class="dojo-blocked" id="djBlock1" hidden><span>FROZEN</span></div><div class="dojo-bomb" id="djBomb1" hidden><span class="dojo-bombnum">5</span></div></div>
          <div class="dojo-powers" id="djPow1"></div>
        </div>
        <div class="dojo-side dojo-p2">
          <div class="dojo-boardwrap"><div class="dojo-grid" id="djGrid2"></div><div class="dojo-blocked" id="djBlock2" hidden><span>FROZEN</span></div><div class="dojo-bomb" id="djBomb2" hidden><span class="dojo-bombnum">5</span></div></div>
          <div class="dojo-powers" id="djPow2"></div>
        </div>
      </div>
      <div class="dojo-result" id="djResult" hidden></div>`));

    panel.querySelector("#djSet").textContent = activeSet().name;
    updateMute();
    panel.querySelector("#djMute").addEventListener("click", () => { soundOn = !soundOn; updateMute(); });
    panel.querySelector("#djQuit").addEventListener("click", () => { live = null; renderLobby(); });
  }
  function updateMute() {
    const b = panel.querySelector("#djMute");
    if (b) { b.innerHTML = soundOn ? SVG.soundOn : SVG.soundOff; b.classList.toggle("is-off", !soundOn); }
  }

  function paintRound() {
    panel.querySelector("#djQ").innerHTML = mathHtml(live.q.q);
    const badge = panel.querySelector("#djStreak");
    badge.querySelector("b").textContent = live.streak;
    badge.classList.toggle("hot", live.streak > 0);
    panel.querySelector("#djName1").textContent = live.p1.name;
    panel.querySelector("#djName2").textContent = live.p2.name;
    panel.querySelector("#djResult").hidden = true;
    ["p1", "p2"].forEach((side) => {
      buildGrid(side); renderLives(side); renderPowers(side); renderBadges(side); markPoison(side, false);
      panel.querySelector(side === "p1" ? "#djBlock1" : "#djBlock2").hidden = true;
      panel.querySelector(side === "p1" ? "#djBomb1" : "#djBomb2").hidden = true;
    });
  }

  function markPoison(side, on) {
    const wrap = panel.querySelector((side === "p1" ? ".dojo-p1" : ".dojo-p2") + " .dojo-boardwrap");
    if (wrap) wrap.classList.toggle("poisoned", on);
  }

  function buildGrid(side) {
    const p = live[side];
    const grid = panel.querySelector(side === "p1" ? "#djGrid1" : "#djGrid2");
    grid.innerHTML = "";
    p.opts.forEach((val) => {
      const b = el("button", "dojo-opt", mathHtml(val));
      b.dataset.val = val;
      b.addEventListener("click", () => onPick(side, val, b));
      grid.appendChild(b);
    });
  }

  function renderLives(side) {
    const p = live[side];
    const box = panel.querySelector(side === "p1" ? "#djLives1" : "#djLives2");
    const max = cfg().lives || 3;
    box.innerHTML = "";
    for (let i = 0; i < max; i++) { const h = el("span", "dojo-heart" + (i < p.lives ? " on" : ""), SVG.heart); box.appendChild(h); }
  }
  function renderBadges(side) {
    const p = live[side], n = side === "p1" ? "1" : "2";
    const set = (id, on) => { const e = panel.querySelector(id); if (e) e.hidden = !on; };
    set("#djShield" + n, p.shield);
    set("#djMirror" + n, p.mirror);
    set("#djFocus" + n, p.focus);
  }
  const renderShield = renderBadges; // shields, mirror and focus all live in the same badge row

  function renderPowers(side) {
    const p = live[side];
    const wrap = panel.querySelector(side === "p1" ? "#djPow1" : "#djPow2");
    wrap.innerHTML = "";
    p.granted.forEach((type) => {
      const b = el("button", "dojo-pow dojo-pow-" + type, POWERS[type].icon + `<span class="dojo-pow-name">${POWERS[type].name}</span>`);
      b.title = POWERS[type].label; b.setAttribute("aria-label", POWERS[type].label);
      b.disabled = !p.powers[type] || p.powerUsed || live.roundOver;
      b.addEventListener("click", () => usePower(side, type));
      wrap.appendChild(b);
    });
  }

  function usePower(side, type) {
    const p = live[side];
    if (live.roundOver || p.over || p.powerUsed || !p.powers[type] || Date.now() < p.blockedUntil) return;
    p.powers[type] = 0;
    p.powerUsed = true; // one power-up per round — locks the rest
    const grid = panel.querySelector(side === "p1" ? "#djGrid1" : "#djGrid2");
    const o = live[side === "p1" ? "p2" : "p1"];
    const max = cfg().lives || 3;

    // Offensive powers target the opponent — unless they've armed a Mirror, which
    // bounces the power straight back onto the caster (and is spent doing so).
    const offensive = type === "steal" || type === "freeze" || type === "poison" || type === "jumble" || type === "timebomb";
    let victim = o, benef = p;
    if (offensive && o.mirror) {
      o.mirror = false; renderBadges(o.side);
      victim = p; benef = o;
      const back = panel.querySelector(side === "p1" ? "#djGrid1" : "#djGrid2");
      back.classList.remove("reflected"); void back.offsetWidth; back.classList.add("reflected");
      fx(sound.swoosh);
    }

    if (type === "fifty") {
      const wrong = [...grid.querySelectorAll(".dojo-opt")].filter((b) => !b.disabled && norm(b.dataset.val) !== norm(live.q.a));
      shuffle(wrong).slice(0, Math.ceil(wrong.length / 2)).forEach((b) => { b.disabled = true; b.classList.add("smoked"); });
      fx(sound.swoosh);
    } else if (type === "heal") { p.lives = Math.min(max, p.lives + 1); renderLives(side); fx(sound.beep); }
    else if (type === "shield") { p.shield = true; renderBadges(side); fx(sound.beep); }
    else if (type === "mirror") { p.mirror = true; renderBadges(side); fx(sound.beep); }
    else if (type === "focus") { p.focus = true; renderBadges(side); fx(sound.beep); }
    else if (type === "steal") {
      if (victim.lives > 1) { victim.lives -= 1; benef.lives = Math.min(max, benef.lives + 1); renderLives(victim.side); renderLives(benef.side); }
      fx(sound.swoosh);
    } else if (type === "freeze") {
      victim.blockedUntil = Date.now() + 3000;
      const ov = panel.querySelector(victim.side === "p1" ? "#djBlock1" : "#djBlock2");
      ov.hidden = false; fx(sound.swoosh);
      clearTimeout(blockTimer);
      blockTimer = setTimeout(() => { if (live && !live.roundOver) { victim.blockedUntil = 0; ov.hidden = true; } }, 3000);
    } else if (type === "poison") {
      const killer = victim.side === "p1" ? "p2" : "p1";
      victim.poisoned = true; markPoison(victim.side, true); fx(sound.buzz);
      const tick = (n) => {
        if (!live || live.roundOver || victim.over || !victim.poisoned) return;
        victim.lives--; renderLives(victim.side); fx(sound.buzz);
        if (victim.lives <= 0) { victim.over = true; markPoison(victim.side, false); return winRound(killer); }
        if (n > 0) poisonTimers.push(setTimeout(() => tick(n - 1), 2200));
        else { victim.poisoned = false; markPoison(victim.side, false); }
      };
      poisonTimers.push(setTimeout(() => tick(1), 2200)); // two ticks, ~2.2s apart
    } else if (type === "jumble") {
      const og = panel.querySelector(victim.side === "p1" ? "#djGrid1" : "#djGrid2");
      shuffle([...og.children]).forEach((c) => og.appendChild(c));
      og.classList.remove("jumbling"); void og.offsetWidth; og.classList.add("jumbling");
      fx(sound.swoosh);
    } else if (type === "timebomb") {
      startBomb(victim, 5);
    }
    renderPowers(side);
  }

  // Time bomb — the victim has `secs` seconds to win the round, or loses a life.
  function startBomb(v, secs) {
    const killer = v.side === "p1" ? "p2" : "p1";
    const ov = panel.querySelector(v.side === "p1" ? "#djBomb1" : "#djBomb2");
    const num = ov.querySelector(".dojo-bombnum");
    ov.hidden = false; num.textContent = secs; fx(sound.tick);
    const tick = (n) => {
      if (!live || live.roundOver || v.over) { ov.hidden = true; return; }
      if (n <= 0) {
        ov.hidden = true;
        v.lives--; renderLives(v.side); fx(sound.buzz);
        if (v.lives <= 0) { v.over = true; winRound(killer); }
        return;
      }
      num.textContent = n; fx(sound.tick);
      bombTimers.push(setTimeout(() => tick(n - 1), 1000));
    };
    bombTimers.push(setTimeout(() => tick(secs - 1), 1000));
  }

  function onPick(side, val, btn) {
    const p = live[side];
    if (live.roundOver || p.over || btn.disabled || Date.now() < p.blockedUntil) return;
    if (norm(val) === norm(live.q.a)) { btn.classList.add("correct"); return winRound(side); }
    btn.classList.add("wrong"); btn.disabled = true;
    if (p.shield) { p.shield = false; renderShield(side); fx(sound.tick); return; } // shield absorbs the mistake
    p.lives--; renderLives(side); fx(sound.buzz);
    if (p.lives <= 0) { p.over = true; winRound(side === "p1" ? "p2" : "p1"); }
  }

  function winRound(side) {
    live.roundOver = true;
    clearTimeout(blockTimer);
    poisonTimers.forEach((t) => clearTimeout(t)); poisonTimers = [];
    bombTimers.forEach((t) => clearTimeout(t)); bombTimers = [];
    const winner = live[side].name;
    const loser = live[side === "p1" ? "p2" : "p1"].name;
    ["#djGrid1", "#djGrid2"].forEach((g) => panel.querySelectorAll(g + " .dojo-opt").forEach((b) => {
      b.disabled = true; if (norm(b.dataset.val) === norm(live.q.a)) b.classList.add("correct");
    }));
    renderPowers("p1"); renderPowers("p2");

    const prevStreak = live.streak;
    live.streak = side === "p1" ? live.streak + 1 : 1; // champion defended, or challenger dethroned
    live.pendingChampion = winner;
    // Points: base + streak bonus. Toppling a champion mid-streak is worth more.
    // Focus doubles the winner's points for the round they banked it.
    let pts = 10 + (side === "p1" ? 2 * prevStreak : 5 * prevStreak);
    const focused = !!live[side].focus;
    if (focused) pts *= 2;

    const badge = panel.querySelector("#djStreak");
    if (badge) { badge.querySelector("b").textContent = live.streak; badge.classList.toggle("hot", live.streak > 0); }

    const store = bucket(live.classKey);
    const w = lbRow(store, winner), l = lbRow(store, loser);
    w.wins++; w.games++; w.points += pts; w.best = Math.max(w.best, live.streak);
    l.games++;
    save();
    fx(sound.fanfare);
    showResult(winner, pts, focused);
  }

  function showResult(winner, pts, focused) {
    const box = panel.querySelector("#djResult");
    box.hidden = false;
    box.innerHTML = "";
    box.appendChild(el("p", "dojo-res-eyebrow", "Round won"));
    box.appendChild(el("p", "dojo-res-name", winner));
    box.appendChild(el("p", "dojo-res-streak", `+${pts} points${focused ? " (Focus ×2)" : ""} · ${live.streak > 1 ? "streak of " + live.streak : "new champion!"}`));
    const form = el("div", "dojo-res-form");
    const inp = el("input", "dojo-input"); inp.placeholder = "Next challenger name"; inp.maxLength = 24;
    const list = roster();
    if (list.length) {
      const dl = el("datalist"); dl.id = "djRoster2"; list.forEach((n) => { const o = el("option"); o.value = n; dl.appendChild(o); });
      box.appendChild(dl); inp.setAttribute("list", "djRoster2");
    }
    const next = el("button", "btn primary", "Next challenger");
    const go = (name) => { live.champion = live.pendingChampion; live.challenger = (name || inp.value.trim() || "Challenger"); live.qi++; startRound(); };
    next.addEventListener("click", () => go());
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    form.append(inp, next);
    if (list.length) {
      const spin = el("button", "btn dojo-spinbtn", "Spin for challenger"); spin.type = "button";
      spin.addEventListener("click", async () => { const ch = await spinPick({ exclude: live.pendingChampion, label: "Next challenger" }); if (ch) go(ch); });
      form.append(spin);
    }
    box.appendChild(form);
    const fin = el("button", "btn ghost dojo-res-fin", "Finish — show leaderboard");
    fin.addEventListener("click", () => renderLeaderboard(live.classKey));
    box.appendChild(fin);
    setTimeout(() => inp.focus(), 30);
  }

  /* ================= LEADERBOARDS (per class + overall) ================= */
  function renderLeaderboard(scope) {
    clearTimers();
    const boards = cfg().leaderboards;
    const keysWithData = Object.keys(boards).filter((k) => Object.keys(boards[k]).length);
    if (scope == null) scope = live ? live.classKey : "overall";
    if (scope !== "overall" && !keysWithData.includes(scope)) scope = "overall";

    const src = scope === "overall" ? overallRows() : boards[scope] || {};
    const rows = Object.entries(src).map(([name, v]) => ({ name, wins: v.wins || 0, games: v.games || 0, best: v.best || 0, points: v.points || 0 }))
      .sort((a, b) => b.points - a.points || b.best - a.best || a.games - b.games || a.name.localeCompare(b.name));

    panel.innerHTML = "";
    const card = el("div", "dojo-lbcard");
    card.appendChild(el("h2", "dojo-title", "Leaderboard"));

    const scopeRow = el("div", "dojo-field dojo-field-inline");
    scopeRow.appendChild(el("label", "dojo-lbl", "Show"));
    const scopeSel = el("select", "dojo-select");
    const oOverall = el("option"); oOverall.value = "overall"; oOverall.textContent = "Overall (all classes)"; if (scope === "overall") oOverall.selected = true; scopeSel.appendChild(oOverall);
    keysWithData.forEach((k) => { const o = el("option"); o.value = k; o.textContent = classLabel(k); if (k === scope) o.selected = true; scopeSel.appendChild(o); });
    scopeSel.addEventListener("change", () => renderLeaderboard(scopeSel.value));
    scopeRow.appendChild(scopeSel);
    card.appendChild(scopeRow);

    if (!rows.length) card.appendChild(el("p", "dojo-lede", "No rounds played yet."));
    else {
      const table = el("table", "dojo-lbtable", "<thead><tr><th>#</th><th class='l'>Student</th><th>Points</th><th>Wins</th><th>Best</th><th>Rounds</th></tr></thead>");
      const tb = el("tbody");
      rows.forEach((r, i) => {
        const medal = i < 3 ? ` medal m${i + 1}` : "";
        tb.appendChild(el("tr", (i === 0 ? "top" : "") + medal, `<td>${i + 1}</td><td class='l'>${escapeHtml(r.name)}</td><td class='dojo-pts'>${r.points}</td><td>${r.wins}</td><td>${r.best}</td><td>${r.games}</td>`));
      });
      table.appendChild(tb); card.appendChild(table);
    }

    const row = el("div", "dojo-editbtns");
    const back = el("button", "btn primary", live ? "Back to duel" : "New duel");
    back.addEventListener("click", () => { if (live && !live.roundOver) paintRound(); else renderLobby(); });
    const reset = el("button", "btn ghost dojo-danger", scope === "overall" ? "Reset all boards" : "Reset this class");
    reset.addEventListener("click", () => {
      if (scope === "overall") cfg().leaderboards = {};
      else delete cfg().leaderboards[scope];
      save(); renderLeaderboard("overall");
    });
    row.append(back, reset);
    card.appendChild(row);
    panel.appendChild(card);
  }

  function clearTimers() {
    clearTimeout(blockTimer); blockTimer = null;
    poisonTimers.forEach((t) => clearTimeout(t)); poisonTimers = [];
    bombTimers.forEach((t) => clearTimeout(t)); bombTimers = [];
  }
  function escapeHtml(s) { return String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])); }

  renderLobby();
}
