// class-live.js — SpinDecks Live: a whole-class, Kahoot-style quiz. The teacher
// hosts on the whiteboard and students join from their own devices with a PIN.
// Everything runs through the live-game Edge Function (polling, no sign-in).
// Reuses the shared question packs (GCSE maths and any topic). Zero deps.
import { el, shuffle, mathHtml, escapeHtml, norm, answersOf, allSets } from "./quizkit.js?v=20261126a";
import { getState, save } from "./storage.js?v=20261126a";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supa-config.js?v=20261126a";
import * as sound from "./sound.js?v=20261126a";

const FN = `${SUPABASE_URL}/functions/v1/live-game`;
const SHAPES = ["▲", "◆", "●", "■", "★", "✚"];
const JOIN_HOST = "spindecks.app/class-live";

async function api(action, body = {}) {
  const res = await fetch(FN, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  let j = {}; try { j = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(j.error || "error"), { code: j.error, status: res.status });
  return j;
}

const panel = () => document.querySelector(".cl-panel");
let soundOn = getState().soundOn !== false;
const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

// ---- theme toggle (this page has no app.js) ----
(() => {
  const s = getState();
  const apply = () => { document.documentElement.dataset.theme = s.theme || "dark"; };
  apply();
  const t = document.querySelector("#themeToggle");
  if (t) t.addEventListener("click", () => { s.theme = s.theme === "dark" ? "light" : "dark"; apply(); save(); });
})();

// ---- a single poll loop ----
let pollTimer = null;
function stopPoll() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }
function loopPoll(fn, ms) {
  stopPoll();
  const tick = async () => { try { await fn(); } catch {} if (pollTimer !== null) pollTimer = setTimeout(tick, ms); };
  pollTimer = setTimeout(tick, 0);
}

// ---- session persistence (survive a refresh) ----
const HKEY = "spindeck.cl.host", PKEY = "spindeck.cl.player";
const load = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch { return null; } };
const store = (k, v) => { try { v ? sessionStorage.setItem(k, JSON.stringify(v)) : sessionStorage.removeItem(k); } catch {} };

/* ===================== HOME ===================== */
function renderHome() {
  stopPoll();
  const p = panel(); p.innerHTML = "";
  const card = el("div", "cl-card");
  card.appendChild(el("p", "dojo-eyebrow", "Whole-class live quiz"));
  card.appendChild(el("h1", "dojo-title", "SpinDecks Live"));
  card.appendChild(el("p", "dojo-lede", "Host a quiz on the board; your class joins from their own phones or laptops with a PIN and races to answer. Works with every SpinDecks question pack — GCSE maths and any topic."));
  const row = el("div", "cl-homebtns");
  const host = el("button", "btn primary cl-bigbtn", "Host a game");
  host.addEventListener("click", renderHostSetup);
  const join = el("button", "btn cl-bigbtn", "Join a game");
  join.addEventListener("click", () => renderJoin());
  row.append(host, join);
  card.appendChild(row);
  card.appendChild(el("p", "dojo-hint", "Teacher: tap “Host a game”, pick a question set, and show the PIN on the board. Students: tap “Join a game” and type the PIN."));
  p.appendChild(card);
}

/* ===================== HOST ===================== */
let H = null; // { gameId, pin, hostToken, nQ, _key, ui, timer }

function renderHostSetup() {
  stopPoll();
  const p = panel(); p.innerHTML = "";
  const card = el("div", "cl-card");
  card.appendChild(el("h2", "dojo-title", "Host a live game"));
  const sets = allSets();
  const field = el("div", "dojo-field");
  field.appendChild(el("label", "dojo-lbl", "Question set"));
  const sel = el("select", "dojo-select");
  sets.forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${s.questions.length})`; sel.appendChild(o); });
  field.appendChild(sel);
  card.appendChild(field);

  // Starter size: a short 4–10 question game, or all (up to 20).
  const live = getState().live || (getState().live = { count: "all" });
  const cntField = el("div", "dojo-field dojo-field-inline");
  cntField.appendChild(el("label", "dojo-lbl", "How many questions"));
  const cntSel = el("select", "dojo-select dojo-select-sm");
  [["all", "All (max 20)"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["10", "10"]].forEach(([v, t]) => { const o = el("option"); o.value = v; o.textContent = t; if (String(live.count) === v) o.selected = true; cntSel.appendChild(o); });
  cntSel.addEventListener("change", () => { live.count = cntSel.value; save(); });
  cntField.appendChild(cntSel);
  card.appendChild(cntField);

  card.appendChild(el("p", "dojo-hint", "Each question becomes four answer tiles. Students see the tiles on their own screen; the question shows big on the board."));
  const btns = el("div", "dojo-editbtns");
  const go = el("button", "btn primary", "Create game");
  const back = el("button", "btn ghost", "Back");
  back.addEventListener("click", renderHome);
  go.addEventListener("click", async () => {
    const set = sets.find((x) => x.id === sel.value) || sets[0];
    const questions = buildQuestions(set, parseInt(cntSel.value, 10));
    if (!questions.length) { alert("That set has no usable questions."); return; }
    go.disabled = true; go.textContent = "Creating…";
    try {
      const res = await api("create", { setName: set.name, questions });
      H = { gameId: res.gameId, pin: res.pin, hostToken: res.hostToken, nQ: questions.length, _key: "", ui: null, timer: null };
      store(HKEY, { gameId: H.gameId, pin: H.pin, hostToken: H.hostToken, nQ: H.nQ });
      loopPoll(hostPoll, 1500);
    } catch (e) { go.disabled = false; go.textContent = "Create game"; alert("Couldn't create the game — check your connection and try again."); }
  });
  btns.append(go, back);
  card.appendChild(btns);
  p.appendChild(card);
}

// Build [{q, options:[4], correct}] snapshots from a question set. A live game
// uses a shuffled subset (big banks like times tables would run far too long),
// but distractors are still drawn from the whole set.
const MAX_LIVE_Q = 20;
function buildQuestions(set, count) {
  const cap = Number.isFinite(count) && count > 0 ? Math.min(count, MAX_LIVE_Q) : MAX_LIVE_Q;
  const pool = []; const seenPool = new Set();
  set.questions.forEach((q) => [...answersOf(q), ...(q.distractors || [])].forEach((v) => { const k = norm(v); if (v != null && v !== "" && !seenPool.has(k)) { seenPool.add(k); pool.push(String(v)); } }));
  const usable = set.questions.filter((q) => q && q.q && answersOf(q)[0] != null);
  return shuffle(usable).slice(0, cap).map((q) => {
    const correctVal = String(answersOf(q)[0]);
    const accepted = new Set(answersOf(q).map(norm));
    const opts = [correctVal]; const used = new Set([norm(correctVal)]);
    (q.distractors || []).forEach((d) => { const k = norm(d); if (d != null && d !== "" && !used.has(k) && !accepted.has(k) && opts.length < 4) { used.add(k); opts.push(String(d)); } });
    for (const v of shuffle(pool)) { if (opts.length >= 4) break; const k = norm(v); if (!used.has(k) && !accepted.has(k)) { used.add(k); opts.push(v); } }
    const options = shuffle(opts);
    return { q: q.q, options, correct: options.findIndex((o) => norm(o) === norm(correctVal)) };
  }).filter((q) => q.options.length >= 2 && q.correct >= 0);
}

async function hostControl(op) { try { await api("host", { gameId: H.gameId, hostToken: H.hostToken, op }); await hostPoll(); } catch {} }

async function hostPoll() {
  if (!H) return;
  const st = await api("state", { gameId: H.gameId });
  const key = st.state + ":" + st.currentQ;
  if (key !== H._key) { H._key = key; H.autoRevealed = false; renderHostFor(st); }
  else if (H.ui && H.ui.update) H.ui.update(st);
}

function hostTop() {
  const bar = el("div", "dojo-toprow");
  bar.innerHTML = `<span class="dojo-set">SpinDecks Live · PIN ${H.pin}</span>`;
  const right = el("span", "dojo-topbtns");
  const quit = el("button", "btn ghost", "End session");
  quit.addEventListener("click", async () => { if (confirm("End this game for everyone?")) { try { await api("host", { gameId: H.gameId, hostToken: H.hostToken, op: "end" }); } catch {} store(HKEY, null); H = null; renderHome(); } });
  right.appendChild(quit); bar.appendChild(right);
  return bar;
}

function renderHostFor(st) {
  const p = panel(); p.innerHTML = "";
  const wrap = el("div", "cl-host");
  wrap.appendChild(hostTop());
  if (st.state === "lobby") hostLobby(wrap, st);
  else if (st.state === "question") hostQuestion(wrap, st);
  else if (st.state === "reveal") hostReveal(wrap, st);
  else if (st.state === "ended") hostEnd(wrap, st);
  p.appendChild(wrap);
}

function hostLobby(wrap, st) {
  const join = el("div", "cl-join-hero");
  join.innerHTML = `<p class="cl-join-line">Join at <b>${JOIN_HOST}</b></p><p class="cl-pin-big">${H.pin}</p><p class="cl-join-sub">Game PIN</p>`;
  wrap.appendChild(join);
  const count = el("p", "cl-lobcount");
  wrap.appendChild(count);
  const players = el("div", "cl-players");
  wrap.appendChild(players);
  const btns = el("div", "dojo-editbtns cl-hostctrl");
  const start = el("button", "btn primary cl-bigbtn", "Start game");
  start.addEventListener("click", () => { fx(sound.fanfare); hostControl("next"); });
  btns.appendChild(start);
  wrap.appendChild(btns);
  H.ui = { update(s) {
    count.textContent = s.total ? `${s.total} player${s.total === 1 ? "" : "s"} in` : "Waiting for players to join…";
    players.innerHTML = "";
    s.players.forEach((pl) => players.appendChild(el("span", "cl-pchip", escapeHtml(pl.name))));
    start.disabled = !s.total;
  } };
  H.ui.update(st);
}

function optionTiles(st, { onPick, correctIndex, tally } = {}) {
  const grid = el("div", "cl-optgrid");
  const opts = st.question.options;
  opts.forEach((o, i) => {
    const tile = el("button", "cl-opt cl-opt-" + i);
    tile.innerHTML = `<span class="cl-opt-shape">${SHAPES[i] || ""}</span><span class="cl-opt-text">${mathHtml(String(o))}</span>`;
    if (correctIndex != null) {
      if (i === correctIndex) tile.classList.add("is-correct");
      else tile.classList.add("is-dim");
      if (tally) { const b = el("span", "cl-opt-count", String(tally[i] ?? 0)); tile.appendChild(b); }
    }
    if (onPick) tile.addEventListener("click", () => onPick(i, tile));
    else tile.disabled = true;
    grid.appendChild(tile);
  });
  return grid;
}

function hostQuestion(wrap, st) {
  const head = el("div", "cl-qhead");
  head.innerHTML = `<span class="cl-qnum">Question ${st.question.index + 1} of ${st.question.count}</span>`;
  wrap.appendChild(head);
  wrap.appendChild(el("div", "cl-qtext cl-qtext-big", mathHtml(st.question.q)));
  const timerBar = el("div", "cl-timer"); const timerFill = el("div", "cl-timer-fill"); timerBar.appendChild(timerFill);
  wrap.appendChild(timerBar);
  wrap.appendChild(optionTiles(st)); // no picking on the board
  const status = el("p", "cl-answered");
  wrap.appendChild(status);
  const btns = el("div", "dojo-editbtns cl-hostctrl");
  const reveal = el("button", "btn primary", "Reveal answers");
  reveal.addEventListener("click", () => { fx(sound.beep); hostControl("reveal"); });
  btns.appendChild(reveal);
  wrap.appendChild(btns);

  // client-side 20s countdown, anchored so re-renders stay in sync
  const DUR = 20000;
  if (!H.timer || H.timer.q !== st.question.index) H.timer = { q: st.question.index, start: Date.now() };
  const tickTimer = () => {
    const left = Math.max(0, DUR - (Date.now() - H.timer.start));
    timerFill.style.width = (left / DUR * 100) + "%";
    if (left <= 0 && !H.autoRevealed) { H.autoRevealed = true; hostControl("reveal"); }
  };
  tickTimer(); H.timer.raf = setInterval(tickTimer, 100);

  H.ui = { update(s) {
    status.textContent = `${s.answered} of ${s.total} answered`;
    // auto-reveal once everyone is in
    if (s.total > 0 && s.answered >= s.total && !H.autoRevealed) { H.autoRevealed = true; hostControl("reveal"); }
  }, cleanup() { clearInterval(H.timer.raf); } };
  H.ui.update(st);
}

function hostReveal(wrap, st) {
  if (H.ui && H.ui.cleanup) H.ui.cleanup();
  fx(sound.fanfare);
  wrap.appendChild(el("div", "cl-qtext", mathHtml(st.question.q)));
  wrap.appendChild(optionTiles(st, { correctIndex: st.correctIndex, tally: st.tally }));
  wrap.appendChild(leaderboard(st.players, 5));
  const btns = el("div", "dojo-editbtns cl-hostctrl");
  const last = st.question.index + 1 >= st.question.count;
  const next = el("button", "btn primary", last ? "Final scores" : "Next question");
  next.addEventListener("click", () => hostControl("next"));
  btns.appendChild(next);
  wrap.appendChild(btns);
  H.ui = { update() {} };
}

function hostEnd(wrap, st) {
  fx(sound.fanfare);
  wrap.appendChild(el("h2", "dojo-title", "Final scores"));
  wrap.appendChild(podium(st.players));
  wrap.appendChild(leaderboard(st.players.slice(3), 10, 4));
  const btns = el("div", "dojo-editbtns cl-hostctrl");
  const again = el("button", "btn primary", "New game");
  again.addEventListener("click", () => { store(HKEY, null); H = null; renderHostSetup(); });
  const home = el("button", "btn ghost", "Home");
  home.addEventListener("click", () => { store(HKEY, null); H = null; renderHome(); });
  btns.append(again, home);
  wrap.appendChild(btns);
  H.ui = { update() {} };
  store(HKEY, null); // game's done
}

function leaderboard(players, n = 5, startRank = 1) {
  const box = el("div", "cl-board");
  players.slice(0, n).forEach((pl, i) => {
    const row = el("div", "cl-brow");
    row.innerHTML = `<span class="cl-brank">${startRank + i}</span><span class="cl-bname">${escapeHtml(pl.name)}</span><span class="cl-bscore">${pl.score}</span>`;
    box.appendChild(row);
  });
  if (!players.length) box.appendChild(el("p", "muted", "No scores yet."));
  return box;
}

function podium(players) {
  const box = el("div", "cl-podium");
  const order = [1, 0, 2]; // silver, gold, bronze visual order
  order.forEach((idx) => {
    const pl = players[idx];
    const col = el("div", "cl-podcol cl-pod-" + (idx + 1));
    if (pl) col.innerHTML = `<span class="cl-podname">${escapeHtml(pl.name)}</span><span class="cl-podblock">${idx + 1}</span><span class="cl-podscore">${pl.score}</span>`;
    else col.classList.add("cl-pod-empty");
    box.appendChild(col);
  });
  return box;
}

/* ===================== STUDENT ===================== */
let P = null; // { gameId, playerId, playerToken, name, answeredQ, _key }

function renderJoin(prefillPin) {
  stopPoll();
  const p = panel(); p.innerHTML = "";
  const card = el("div", "cl-card");
  card.appendChild(el("h2", "dojo-title", "Join a game"));
  const f1 = el("div", "dojo-field"); f1.appendChild(el("label", "dojo-lbl", "Game PIN"));
  const pin = el("input", "dojo-input cl-pin-input"); pin.inputMode = "numeric"; pin.maxLength = 6; pin.placeholder = "123456"; if (prefillPin) pin.value = prefillPin;
  f1.appendChild(pin); card.appendChild(f1);
  const f2 = el("div", "dojo-field"); f2.appendChild(el("label", "dojo-lbl", "Your name"));
  const name = el("input", "dojo-input"); name.maxLength = 20; name.placeholder = "e.g. Sam";
  f2.appendChild(name); card.appendChild(f2);
  const note = el("p", "dojo-flash"); note.hidden = true; card.appendChild(note);
  const btns = el("div", "dojo-editbtns");
  const go = el("button", "btn primary", "Join");
  const back = el("button", "btn ghost", "Back");
  back.addEventListener("click", renderHome);
  const doJoin = async () => {
    const pv = pin.value.trim(), nv = name.value.trim();
    if (!/^[0-9]{6}$/.test(pv)) { note.hidden = false; note.textContent = "Enter the 6-digit PIN from the board."; return; }
    if (!nv) { name.focus(); return; }
    go.disabled = true; go.textContent = "Joining…"; note.hidden = true;
    try {
      const res = await api("join", { pin: pv, name: nv });
      P = { gameId: res.gameId, playerId: res.playerId, playerToken: res.playerToken, name: res.name, answeredQ: -1, _key: "" };
      store(PKEY, { gameId: P.gameId, playerId: P.playerId, playerToken: P.playerToken, name: P.name });
      fx(sound.beep);
      loopPoll(studentPoll, 1300);
    } catch (e) {
      go.disabled = false; go.textContent = "Join"; note.hidden = false;
      note.textContent = e.code === "no_game" ? "No game with that PIN — check the board." : e.code === "full" ? "That game is full." : "Couldn't join — try again.";
    }
  };
  go.addEventListener("click", doJoin);
  name.addEventListener("keydown", (e) => { if (e.key === "Enter") doJoin(); });
  btns.append(go, back); card.appendChild(btns);
  p.appendChild(card);
}

async function studentPoll() {
  if (!P) return;
  const st = await api("state", { gameId: P.gameId });
  const key = st.state + ":" + st.currentQ;
  const changed = key !== P._key;
  P._key = key;
  studentRender(st, changed);
}

function studentTop(extra) {
  const bar = el("div", "dojo-toprow");
  bar.innerHTML = `<span class="dojo-set">${escapeHtml(P.name)}</span><span class="dojo-topbtns">${extra || ""}</span>`;
  return bar;
}
const myRank = (players) => { const i = players.findIndex((p) => p.name === P.name); return i < 0 ? null : i + 1; };
const myScore = (players) => { const p = players.find((p) => p.name === P.name); return p ? p.score : 0; };

function studentRender(st, changed) {
  const p = panel();
  if (st.state === "lobby") { if (!changed && p.querySelector(".cl-wait")) return; studentWait(); return; }
  if (st.state === "question") { studentQuestion(st, changed); return; }
  if (st.state === "reveal") { if (!changed && p.querySelector(".cl-sreveal")) return; studentReveal(st); return; }
  if (st.state === "ended") { if (!changed && p.querySelector(".cl-send")) return; studentEnd(st); }
}

function studentShell(cls) {
  const p = panel(); p.innerHTML = "";
  const wrap = el("div", "cl-student " + cls);
  wrap.appendChild(studentTop());
  p.appendChild(wrap);
  return wrap;
}

function studentWait() {
  const wrap = studentShell("cl-wait");
  wrap.appendChild(el("div", "cl-big-emoji", "✓"));
  wrap.appendChild(el("p", "cl-wait-title", `You're in, ${escapeHtml(P.name)}!`));
  wrap.appendChild(el("p", "dojo-lede", "Look up at the board. The game will start soon…"));
}

function studentQuestion(st, changed) {
  const answered = P.answeredQ === st.question.index;
  // Only (re)build when the question changes or when we need to switch to the locked view.
  const p = panel();
  if (!changed && p.querySelector(".cl-squestion") && (answered === !!p.querySelector(".cl-locked"))) return;
  const wrap = studentShell("cl-squestion");
  wrap.appendChild(el("p", "cl-qnum", `Question ${st.question.index + 1} of ${st.question.count}`));
  wrap.appendChild(el("div", "cl-qtext", mathHtml(st.question.q)));
  if (answered) {
    const lock = el("div", "cl-locked");
    lock.innerHTML = `<p class="cl-locked-title">Answer locked in ✓</p><p class="muted">Waiting for the others…</p>`;
    wrap.appendChild(lock);
    return;
  }
  P.lastCorrect = null; // fresh question — clear the previous result
  wrap.appendChild(optionTiles(st, { onPick: async (i, tile) => {
    [...wrap.querySelectorAll(".cl-opt")].forEach((b) => (b.disabled = true));
    tile.classList.add("is-picked");
    try {
      const r = await api("answer", { gameId: P.gameId, playerId: P.playerId, playerToken: P.playerToken, qIndex: st.question.index, choice: i });
      P.answeredQ = st.question.index; P.lastCorrect = !!r.correct;
      fx(r.correct ? sound.fanfare : sound.tick);
    } catch (e) { P.answeredQ = st.question.index; } // already/closed — treat as locked
    // swap to the locked view
    studentQuestion(st, true);
  } }));
}

function studentReveal(st) {
  const wrap = studentShell("cl-sreveal");
  const mine = st.players.find((pl) => pl.name === P.name);
  // did I get it right? ask by checking my last answer is unknown client-side; infer from correctIndex via a stored pick
  const gotIt = P.lastCorrect;
  wrap.appendChild(el("div", "cl-big-emoji", gotIt == null ? "—" : gotIt ? "✓" : "✗"));
  wrap.appendChild(el("p", "cl-reveal-title", gotIt == null ? "Here's the answer" : gotIt ? "Correct!" : "Not this time"));
  wrap.appendChild(el("p", "cl-reveal-ans", "Answer: " + mathHtml(String(st.question.options[st.correctIndex]))));
  const rank = myRank(st.players);
  wrap.appendChild(el("p", "cl-reveal-score", `${mine ? mine.score : 0} points${rank ? ` · ${ordinal(rank)} of ${st.players.length}` : ""}`));
}

function studentEnd(st) {
  const wrap = studentShell("cl-send");
  const rank = myRank(st.players), score = myScore(st.players);
  wrap.appendChild(el("div", "cl-big-emoji", rank === 1 ? "🏆" : "🎉"));
  wrap.appendChild(el("p", "cl-reveal-title", rank ? `You finished ${ordinal(rank)}` : "Game over"));
  wrap.appendChild(el("p", "cl-reveal-score", `${score} points`));
  const again = el("button", "btn ghost", "Leave");
  again.addEventListener("click", () => { store(PKEY, null); P = null; stopPoll(); renderHome(); });
  wrap.appendChild(again);
  store(PKEY, null);
}

function ordinal(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

/* ===================== INIT (with refresh-resume) ===================== */
function init() {
  if (!panel()) return;
  const ph = load(PKEY);
  if (ph && ph.gameId) { P = { ...ph, answeredQ: -1, _key: "" }; loopPoll(studentPoll, 1300); return; }
  const hh = load(HKEY);
  if (hh && hh.gameId) { H = { ...hh, _key: "", ui: null, timer: null }; loopPoll(hostPoll, 1500); return; }
  renderHome();
}
init();
