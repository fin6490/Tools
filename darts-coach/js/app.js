// app.js — Oche, a private darts coach on spindecks.app (/darts-coach/).
// Signed-in SpinDecks account + owner list (checked by the darts-coach Edge
// Function) → games, live camera scoring, stats and an AI coach. Finished games
// are stored in the darts_sessions table (RLS: own rows), cached on the device,
// and queued for upload when offline.
import * as supa from "/js/supa.js?v=20261109a";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "/js/supa-config.js?v=20261109a";
import * as E from "./engine.js?v=20261110a";
import { LiveCamera, Detector, calibrate, CAL_NAMES, dirFromBull, drawOverlay, nearWire } from "./vision.js?v=20261110a";

const FN = SUPABASE_URL + "/functions/v1/darts-coach";
const $ = (s) => document.querySelector(s);
const { esc, r2, GAMES, GORDER } = E;
const ls = {
  get(k, d = null) { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ---------- server ---------- */
async function call(body) {
  const tok = await supa.getAccessToken().catch(() => null);
  if (!tok) throw { code: "not_signed_in" };
  let res;
  try { res = await fetch(FN, { method: "POST", headers: { Authorization: "Bearer " + tok, apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch { throw { code: "offline" }; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: data.code || "http_" + res.status, status: res.status };
  return data;
}
async function rest(path, { method = "GET", body, prefer } = {}) {
  const tok = await supa.getAccessToken();
  const h = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + tok, "Content-Type": "application/json" };
  if (prefer) h.Prefer = prefer;
  return fetch(SUPABASE_URL + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
}

/* ---------- data ---------- */
const D = { sessions: ls.get("oche.sessions", []), queue: ls.get("oche.queue", []), dels: ls.get("oche.dels", []), synced: false };
const persist = () => { ls.set("oche.sessions", D.sessions); ls.set("oche.queue", D.queue); ls.set("oche.dels", D.dels); };
async function loadSessions() {
  try {
    const res = await rest("/rest/v1/darts_sessions?select=data&order=played_at.asc&limit=5000");
    if (!res.ok) return;
    const rows = (await res.json()).map((r) => r.data);
    const ids = new Set(rows.map((s) => s.id));
    D.sessions = [...rows, ...D.queue.filter((s) => !ids.has(s.id))].filter((s) => !D.dels.includes(s.id)).sort((a, b) => a.at - b.at);
    D.synced = true; persist();
  } catch {}
}
async function flush() {
  while (D.queue.length) {
    const s = D.queue[0];
    try {
      const res = await rest("/rest/v1/darts_sessions?on_conflict=id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: { id: s.id, game: s.g, played_at: new Date(s.at).toISOString(), data: s } });
      if (!res.ok) break;
      D.queue.shift(); persist();
    } catch { break; }
  }
  while (D.dels.length) {
    try { const res = await rest("/rest/v1/darts_sessions?id=eq." + encodeURIComponent(D.dels[0]), { method: "DELETE" }); if (!res.ok) break; D.dels.shift(); persist(); } catch { break; }
  }
  pill();
}
function saveSession(s) { D.sessions = [...D.sessions, s].sort((a, b) => a.at - b.at); D.queue.push(s); persist(); flush(); }
function deleteSession(id) { D.sessions = D.sessions.filter((s) => s.id !== id); D.queue = D.queue.filter((s) => s.id !== id); D.dels.push(id); persist(); flush(); }
addEventListener("online", flush);

/* ---------- settings + calibration ---------- */
const SET = Object.assign({ check: "unsure", call: true }, ls.get("oche.settings", {}));
const saveSet = () => ls.set("oche.settings", SET);
let CAL = ls.get("oche.cal"); // { pts: [[u,v] x4], dir: [dx,dy] | null, at }

/* ---------- speech caller ---------- */
const SAY = { T: "treble", D: "double", S: "" };
function sayDart(d) {
  if (!SET.call || !("speechSynthesis" in window)) return;
  const l = E.lab(d);
  const words = l === "MISS" ? "miss" : l === "BULL" ? "bull" : l === "25" ? "outer bull" : `${SAY[l[0]]} ${l.slice(1)}`.trim();
  speak(words);
}
function speak(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 1.05; u.lang = "en-GB"; speechSynthesis.speak(u); } catch {} }

/* ---------- toast ---------- */
let toastT;
function toast(msg, ms = 3200) { let el = $("#toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); } el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), ms); }

/* ---------- gate ---------- */
const ST = { status: null, offline: false, email: "" };
async function boot() {
  supa.handleRedirect();
  const tok = await supa.getAccessToken().catch(() => null);
  if (!tok) return gateSignIn();
  try { ST.status = await call({ kind: "status" }); ls.set("oche.ok", { at: Date.now(), owner: ST.status.owner }); }
  catch (e) {
    if (e.code === "not_signed_in" || e.status === 401) return gateSignIn();
    const c = ls.get("oche.ok");
    if (c && c.owner && Date.now() - c.at < 14 * 864e5) { ST.status = { owner: true, ai: false, left: 0 }; ST.offline = true; }
    else return gateMsg("Can't reach SpinDecks", "Check your connection and reload.");
  }
  if (!ST.status.owner) return gateMsg("This app is private", "Oche is only switched on for the site owner's account. If that's you, add your email to DARTS_OWNER_EMAILS in the Supabase function secrets.", true);
  try { const u = supa.getSession()?.user || (await supa.fetchUser()); ST.email = u?.email || ""; } catch {}
  $("#tabs").hidden = false; $("#setBtn").hidden = false; $("#pill").hidden = false;
  render();
  if (!ST.offline) { await loadSessions(); await flush(); render(); }
}
function gateSignIn() {
  $("#main").innerHTML = `<div class="gate"><form class="card" id="signin"><h2 style="margin-top:0">Sign in to Oche</h2><p class="muted">Use your SpinDecks email. We'll send you a sign-in link that brings you straight back here.</p>
    <label class="field"><span class="small">Email</span><input type="email" id="em" autocomplete="email" required></label>
    <button class="btn primary full" type="submit">Send sign-in link</button><p class="small muted" id="sMsg" style="margin-top:10px"></p></form></div>`;
  $("#signin").onsubmit = async (e) => {
    e.preventDefault(); const m = $("#sMsg");
    try { await supa.signInWithEmail($("#em").value.trim(), location.origin + "/darts-coach/"); m.textContent = "Check your email for the link. You can close this tab."; }
    catch (err) { m.textContent = err.message || "Couldn't send the email."; }
  };
}
function gateMsg(t, b, signOut) {
  $("#main").innerHTML = `<div class="gate"><div class="card"><h2 style="margin-top:0">${esc(t)}</h2><p class="muted">${esc(b)}</p><div class="row2"><a class="btn" href="/">SpinDecks home</a>${signOut ? `<button class="btn ghost" id="so">Sign out</button>` : `<button class="btn ghost" onclick="location.reload()">Reload</button>`}</div></div></div>`;
  const so = $("#so"); if (so) so.onclick = async () => { await supa.signOut(); location.reload(); };
}

/* ---------- shell ---------- */
let tab = "train";
document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; if (tab !== "train" && view === "setup") closeSetup(); render(); scrollTo(0, 0); }));
$("#setBtn").onclick = openSettings;
function pill() {
  const el = $("#pill"); if (!el) return;
  el.className = "pill" + (LIVE.on ? " live" : "");
  el.textContent = LIVE.on ? "Camera live" : ST.offline || D.queue.length ? `${D.queue.length ? D.queue.length + " to sync" : "Offline"}` : "Synced";
}
const park = Object.assign(document.createElement("div"), { id: "camPark" });
park.style.cssText = "position:fixed;left:-10000px;top:0;width:320px;pointer-events:none";
document.body.append(park);
function render() {
  if (LIVE.el && LIVE.el.parentNode !== park) park.append(LIVE.el);
  pill();
  document.querySelectorAll("#tabs button").forEach((x) => (x.dataset.tab === tab ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current")));
  const m = $("#main");
  if (view === "setup") return renderSetup(m);
  if (tab === "train") renderTrain(m); else if (tab === "stats") renderStats(m); else renderCoach(m);
}

/* ---------- train ---------- */
let view = "main", play = ls.get("oche.play"), lastResult = null, quitArm = false, msg = "", msgCls = "", sel = -1, showBoard = true, checking = false, commitAfterCheck = false;
const savePlay = () => ls.set("oche.play", play);
function bestOf(gid, list = D.sessions) { const G = GAMES[gid]; let b = null; for (const s of list) if (s.g === gid && (!b || (G.hi ? s.r[G.key] > b.r[G.key] : s.r[G.key] < b.r[G.key]))) b = s; return b; }
function setMsg(t, c = "") { msg = t; msgCls = c; }

function renderTrain(m) {
  if (lastResult) return renderResult(m);
  if (!play) {
    m.innerHTML = `<h2>Pick a game</h2>${liveIntro()}
      <div class="games" style="margin-top:12px">${GORDER.map((g) => { const G = GAMES[g], b = bestOf(g); return `<button class="game" data-g="${g}"><span class="ic">${G.ic}</span><span><span class="nm">${G.name}</span><br><span class="ds">${G.blurb}</span></span><span class="pb">${G.pbL}<b>${b ? G.fmt(b.r) : "–"}</b></span></button>`; }).join("")}</div>`;
    m.querySelectorAll(".game").forEach((b) => (b.onclick = () => startGame(b.dataset.g)));
    wireLiveIntro(m);
    return;
  }
  const G = GAMES[play.gid], { st, vd } = E.pv(play), isFull = st.vEnd || vd >= 3, tgt = isFull ? null : G.target(st, vd);
  const route = (play.gid === "x01" || play.gid === "c121") && !isFull ? E.checkout(st.rem, 3 - vd) : null;
  let mm = msg, mc = msgCls;
  if (!mm) {
    if (st.bust) { mm = `Bust. Back to ${st.rem}.`; mc = "bad"; }
    else if (st.done || st.hit) { mm = play.gid === "c121" ? "Checked out!" : "Game shot!"; mc = "good"; }
    else if (play.gid === "bobs" && vd === 3) { mm = st.hv ? `${st.hv} hit${st.hv > 1 ? "s" : ""}.` : `Blank visit: minus ${st.i < 20 ? 2 * (st.i + 1) : 50}.`; mc = st.hv ? "good" : "bad"; }
    else if (sel >= 0) mm = `Tap the board where dart ${sel + 1} really landed.`;
    else if (LIVE.on) mm = isFull ? (checking ? "Checking the visit with Claude…" : "Pull your darts to move on.") : "Watching for darts…";
  }
  const bl = typeof G.bigL === "function" ? G.bigL(st) : G.bigL;
  const slots = [0, 1, 2].map((i) => {
    const d = play.visit[i]; if (!d) return `<div class="slot"><span>Dart ${i + 1}</span></div>`;
    const tag = d.fix ? `<span class="tag fix">was ${esc(d.fix)}</span>` : d.c === "live" ? `<span class="tag live">${d.u ? "camera ?" : "camera"}</span>` : d.c ? `<span class="tag cam">photo</span>` : `<span>${E.val(d)} pts</span>`;
    return `<button class="slot f${E.hitT(d, d.t) ? " hit" : ""}${sel === i ? " sel" : ""}" data-slot="${i}" aria-label="Dart ${i + 1}: ${E.lab(d)}. Tap to correct."><b>${E.lab(d)}</b>${tag}</button>`;
  }).join("");
  const boardHidden = LIVE.on && !showBoard && sel < 0;
  m.innerHTML = `<div class="gamebar"><button class="iconbtn" id="quit" aria-label="Quit game"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div style="min-width:0"><div class="gname">${G.name}</div><div class="gsub">${G.sub(st)}</div></div>
    <div class="big"><b>${G.big(st)}</b><small>${bl}</small></div></div>
    ${quitArm ? `<div class="confirmq card"><span>Quit this game? It won't be saved.</span><button class="btn sm" id="qNo">Keep playing</button><button class="btn sm primary" id="qYes">Quit</button></div>` : ""}
    <div class="aimrow"><span class="lab">Aim</span><span class="aim">${tgt || "—"}</span>${route && route.length > 1 ? `<span class="route">Route: ${route.join(" · ")}</span>` : ""}</div>
    <div class="slots">${slots}</div>
    <div class="vmsg ${mc}" aria-live="polite">${esc(mm)}</div>
    <div id="liveSlot"></div>
    ${boardHidden ? `<button class="btn ghost full" id="showB">Score by hand</button>` : `<div class="boardwrap" id="bw">${E.boardSVG({ id: "board", target: tgt, dots: play.visit.filter((d) => d.x != null).map((d) => [d.x, d.y, "cur"]) })}<div class="loupe" id="loupe" hidden></div></div>`}
    <div class="actions">
      <button class="btn" id="bMiss" ${isFull ? "disabled" : ""}>Miss</button>
      <button class="btn" id="bUndo" ${play.visit.length ? "" : "disabled"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>Undo</button>
      <button class="btn" id="bCam" ${isFull || checking ? "disabled" : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>${LIVE.on ? "Check visit" : "Snap board"}</button>
    </div>
    <button class="btn full ${isFull ? "go" : ""}" id="bNext" ${isFull ? "" : "disabled"}>${isFull ? (st.done ? "Finish game" : "Next visit") : `Throw ${3 - vd} more`}</button>
    ${LIVE.on ? "" : `<p class="small muted" style="text-align:center;margin-top:8px">No camera running? <label for="picIn" class="linkish">Score from a photo</label></p>`}`;
  $("#quit").onclick = () => { quitArm = !quitArm; render(); };
  if (quitArm) { $("#qNo").onclick = () => { quitArm = false; render(); }; $("#qYes").onclick = () => { quitArm = false; play = null; setMsg(""); savePlay(); render(); }; }
  $("#bMiss").onclick = () => addDart({ s: 0, m: 0 });
  $("#bUndo").onclick = () => { play.visit.pop(); sel = -1; setMsg(""); savePlay(); render(); };
  $("#bCam").onclick = () => (LIVE.on ? checkVisit(true) : $("#camIn").click());
  $("#bNext").onclick = () => nextVisit();
  const sb = $("#showB"); if (sb) sb.onclick = () => { showBoard = true; render(); };
  m.querySelectorAll("[data-slot]").forEach((b) => (b.onclick = () => { sel = sel === +b.dataset.slot ? -1 : +b.dataset.slot; render(); }));
  mountLive($("#liveSlot"));
  wireBoard();
}
function startGame(g) { play = E.newPlay(g); lastResult = null; sel = -1; setMsg(""); savePlay(); tab = "train"; render(); scrollTo(0, 0); if (LIVE.on) LIVE.det?.resetEmpty(LIVE.cam.gray()); }
function rebuild(darts) { play.visit = []; for (const d of darts) { const c = { ...d }; delete c.t; delete c.v; if (!E.pushDart(play, c)) break; } }
function addDart(d) {
  if (!play) return;
  if (sel >= 0 && play.visit[sel]) {
    const old = play.visit[sel], darts = play.visit.slice(); darts[sel] = { ...d, fix: E.lab(old) };
    rebuild(darts); sel = -1; setMsg(""); savePlay(); render(); return;
  }
  if (E.pushDart(play, d)) { setMsg(""); savePlay(); render(); }
}
function fillMisses() { while (!E.full(play)) E.pushDart(play, { s: 0, m: 0 }); }
function nextVisit() {
  if (!play) return;
  if (!E.full(play)) fillMisses();
  setMsg(""); sel = -1;
  const total = play.visit.reduce((a, d) => a + E.val(d), 0);
  const done = E.commitVisit(play);
  if (SET.call && LIVE.on && (play.gid === "scoring" || play.gid === "x01")) speak(String(total));
  if (done) {
    const s = E.toSession(play), prevBest = bestOf(s.g), G = GAMES[s.g];
    const pb = prevBest && (G.hi ? s.r[G.key] > prevBest.r[G.key] : s.r[G.key] < prevBest.r[G.key]);
    lastResult = { s, pb, first: !prevBest };
    play = null; saveSession(s); coachAI = null;
  }
  savePlay(); render();
}
function renderResult(m) {
  const { s, pb, first } = lastResult, G = GAMES[s.g];
  m.innerHTML = `<div class="card result" style="margin-top:14px"><h3>${G.name}</h3>${pb ? '<span class="badge">Personal best</span>' : first ? '<span class="badge">First one logged</span>' : ""}
    <div class="hl">${G.head(s.r)}</div><div class="kv">${G.kv(s.r).map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join("")}</div>
    <div class="row2"><button class="btn primary" id="again">Play again</button><button class="btn" id="toStats">See stats</button></div>
    <button class="btn full ghost" id="toMenu">Back to games</button></div>`;
  $("#again").onclick = () => startGame(s.g);
  $("#toStats").onclick = () => { lastResult = null; tab = "stats"; render(); };
  $("#toMenu").onclick = () => { lastResult = null; render(); };
}
function wireBoard() {
  const svg = $("#board"), cross = $("#boardCross"), lp = $("#loupe"); if (!svg) return; let act = null;
  const toB = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); const off = e.pointerType === "touch" ? 48 * (424 / svg.getBoundingClientRect().width) : 0; return [q.x, q.y - off]; };
  const show = ([x, y]) => { const h = E.hitXY(x, y); cross.innerHTML = `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="var(--red)" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="1.6" fill="var(--red)"/>`; lp.hidden = false; lp.textContent = `${E.lab(h)} · ${E.val(h)}`; };
  svg.addEventListener("pointerdown", (e) => { if (E.full(play) && sel < 0) return; e.preventDefault(); svg.setPointerCapture(e.pointerId); act = toB(e); show(act); });
  svg.addEventListener("pointermove", (e) => { if (act) { act = toB(e); show(act); } });
  svg.addEventListener("pointerup", () => { if (!act) return; const [x, y] = act; act = null; cross.innerHTML = ""; lp.hidden = true; addDart({ ...E.hitXY(x, y), x: r2(x), y: r2(y) }); });
  svg.addEventListener("pointercancel", () => { act = null; cross.innerHTML = ""; lp.hidden = true; });
}

/* ---------- live camera ---------- */
const LIVE = { cam: null, det: null, on: false, starting: false, err: "", el: null, video: null, ov: null, info: null, wake: null, tips: [] };
function liveIntro() {
  if (LIVE.on) return `<div class="card liveoff"><span><b>Camera is live.</b><br><span class="small muted">Start a game and throw. Darts are scored as they land.</span></span><button class="btn sm ghost" id="liveStop">Stop</button></div>`;
  if (!CAL) return `<div class="card liveoff"><span><b>Live scoring</b><br><span class="small muted">Point your phone at the board and Oche scores each dart as it lands.</span></span><button class="btn sm go" id="liveSetup">Set up</button></div>`;
  return `<div class="card liveoff"><span><b>Live scoring</b><br><span class="small muted">Camera set up ${new Date(CAL.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}. Keep the phone where you calibrated it.</span></span><button class="btn sm go" id="liveGo">Start camera</button></div>${LIVE.err ? `<div class="banner">${esc(LIVE.err)}</div>` : ""}`;
}
function wireLiveIntro(m) {
  const a = m.querySelector("#liveSetup"), b = m.querySelector("#liveGo"), c = m.querySelector("#liveStop");
  if (a) a.onclick = openSetup; if (b) b.onclick = () => liveStart(); if (c) c.onclick = () => { liveStop(); render(); };
}
function ensureLiveEl() {
  if (LIVE.el) return LIVE.el;
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="live"><video playsinline muted autoplay></video><canvas></canvas></div><div class="livebar"><span class="st" id="liveSt">Starting camera…</span><button class="btn sm ghost" id="liveRecal">Recalibrate</button><button class="btn sm ghost" id="liveOff">Stop camera</button></div>`;
  LIVE.el = wrap; LIVE.video = wrap.querySelector("video"); LIVE.ov = wrap.querySelector("canvas");
  wrap.querySelector("#liveRecal").onclick = () => { liveStop(); openSetup(); };
  wrap.querySelector("#liveOff").onclick = () => { liveStop(); render(); };
  return wrap;
}
function mountLive(slot) {
  if (!slot) return;
  if (!LIVE.on) {
    slot.innerHTML = CAL ? `<div class="liveoff card" style="margin-top:10px"><span class="small"><b>Live scoring is off.</b> <span class="muted">Turn the camera on and darts score themselves.</span></span><button class="btn sm go" id="liveGo2">Start camera</button></div>` : "";
    const b = slot.querySelector("#liveGo2"); if (b) b.onclick = () => liveStart();
    return;
  }
  slot.append(ensureLiveEl()); LIVE.video.play().catch(() => {}); drawLiveOverlay(); liveStatus();
}
function liveStatus(t) { const el = document.getElementById("liveSt"); if (el) el.textContent = t || (checking ? "Checking with Claude…" : "Watching the board"); }
function drawLiveOverlay() {
  const c = LIVE.ov; if (!c || !CAL || !LIVE.info) return;
  const r = c.getBoundingClientRect(); const w = Math.round(r.width * devicePixelRatio), h = Math.round(r.height * devicePixelRatio); if (!w || !h) return;
  c.width = w; c.height = h; const ctx = c.getContext("2d"); ctx.clearRect(0, 0, w, h);
  const { Hi } = calibrate(CAL.pts);
  drawOverlay(ctx, Hi, w, h, { color: "rgba(255,255,255,.35)", tips: (play?.visit || []).filter((d) => d.tip).map((d) => d.tip) });
}
async function liveStart() {
  if (!CAL) return openSetup();
  if (LIVE.on || LIVE.starting) return;
  LIVE.starting = true; LIVE.err = "";
  try {
    ensureLiveEl(); if (!LIVE.cam) LIVE.cam = new LiveCamera(LIVE.video);
    ($("#liveSlot") || park).append(LIVE.el);
    LIVE.info = await LIVE.cam.start();
    const { H } = calibrate(CAL.pts);
    LIVE.det = new Detector({ w: LIVE.info.w, h: LIVE.info.h, H, dir: CAL.dir });
    LIVE.cam.loop(onFrame);
    LIVE.on = true; showBoard = false;
    try { LIVE.wake = await navigator.wakeLock?.request("screen"); } catch {}
  } catch (e) {
    LIVE.err = e?.name === "NotAllowedError" ? "Camera permission was refused. Allow it in your browser's site settings for spindecks.app." : "Couldn't start the camera on this device.";
    LIVE.cam?.stop(); LIVE.on = false;
  }
  LIVE.starting = false; render();
}
function liveStop() { LIVE.cam?.stop(); LIVE.on = false; LIVE.det = null; try { LIVE.wake?.release(); } catch {} LIVE.wake = null; LIVE.el?.remove(); pill(); }
document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible" && LIVE.on && !LIVE.wake) { try { LIVE.wake = await navigator.wakeLock?.request("screen"); } catch {} } });
let bigCount = 0;
function onFrame(g) {
  const ev = LIVE.det?.feed(g); if (!ev) return;
  if (ev.type === "dart") {
    bigCount = 0;
    if (!play || lastResult || view === "setup") return;
    if (E.full(play)) { liveStatus("Extra dart seen. Pull your darts to start the next visit."); return; }
    const [x, y] = ev.board;
    const d = { ...E.hitXY(x, y), x: r2(x), y: r2(y), c: "live", tip: ev.tip.map(r2) };
    if (nearWire(x, y)) d.u = 1;
    if (E.pushDart(play, d)) { sayDart(d); savePlay(); render(); if (E.full(play)) checkVisit(false); }
  } else if (ev.type === "takeout") {
    if (!play || lastResult || !play.visit.length) return;
    if (checking) { commitAfterCheck = true; return; }
    const n = play.visit.length; nextVisit();
    if (n < 3) toast(`Saw ${n} dart${n > 1 ? "s" : ""}, so ${3 - n > 1 ? "the other two" : "the third"} counted as a miss.`);
  } else if (ev.type === "big") {
    if (++bigCount >= 3) { toast("The picture keeps changing a lot. If the phone moved, recalibrate."); bigCount = 0; }
  }
}

/* ---------- Claude check of a visit ---------- */
const RINGM = { single: 1, double: 2, treble: 3 };
function fromClaude(x) { if (x.ring === "bull") return { s: 25, m: 2 }; if (x.ring === "outer_bull") return { s: 25, m: 1 }; return { s: x.segment, m: RINGM[x.ring] }; }
async function checkVisit(manual) {
  if (!play || checking || !LIVE.on) return;
  const need = manual || SET.check === "always" || (SET.check === "unsure" && play.visit.some((d) => d.u));
  if (!need) return;
  if (!ST.status?.ai) { if (manual) toast("Claude checks need the API key set on the server."); return; }
  checking = true; render();
  const snap = LIVE.cam.snapshot(1600), guesses = play.visit.map(E.lab);
  try {
    const r = await call({ kind: "read", image: snap, mediaType: "image/jpeg", expected: Math.max(1, play.visit.length), guesses });
    reconcile(r.darts.map(fromClaude), r.note);
  } catch (e) { toast(e.code === "cap" ? "Daily Claude limit reached." : e.code === "offline" ? "Offline, so this visit wasn't checked." : "Claude couldn't check this visit."); }
  checking = false;
  if (commitAfterCheck) { commitAfterCheck = false; if (play?.visit.length) nextVisit(); else render(); }
  else render();
}
// Match Claude's darts to the tracker's by board position, keep Claude's reading where they differ.
function reconcile(cd, note) {
  if (!play) return;
  const cur = play.visit.slice(), used = new Set(), out = [];
  let changed = 0;
  const pos = (d) => { if (!d.s) return null; if (d.s === 25) return d.m === 2 ? [0, 0] : [0, -11]; return E.pt(d.m === 3 ? 103 : d.m === 2 ? 166 : 120, E.SEGS.indexOf(d.s) * 18); };
  for (const d of cur) {
    let best = cd.findIndex((c, j) => !used.has(j) && c.s === d.s && c.m === d.m);
    if (best < 0) {
      const b = d.x != null ? [d.x, d.y] : pos(d); let bd = 70; // mm: further than this is a different dart
      cd.forEach((c, j) => { if (used.has(j)) return; const a = pos(c); if (!a || !b) return; const dist = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dist < bd) { bd = dist; best = j; } });
    }
    if (best >= 0) { used.add(best); const c = cd[best]; if (c.s !== d.s || c.m !== d.m) { out.push({ ...d, ...c, fix: E.lab(d), u: 0 }); changed++; } else out.push({ ...d, u: 0 }); }
    else out.push(d);
  }
  cd.forEach((c, j) => { if (!used.has(j) && out.length < 3) { out.push({ ...c, c: "cam" }); changed++; } });
  rebuild(out); savePlay();
  setMsg(changed ? `Claude corrected ${changed} dart${changed > 1 ? "s" : ""}.${note ? " " + note : ""}` : "Claude agrees with the camera.", changed ? "bad" : "good");
  if (changed) play.visit.forEach((d) => d.fix && sayDart(d));
}

/* ---------- photo fallback ---------- */
async function readPhoto(file) {
  if (!file || !play) return;
  const { st, vd } = E.pv(play), need = st.vEnd ? 0 : 3 - vd; if (!need) return;
  if (!ST.status?.ai) { toast("Photo scoring needs the API key set on the server."); return; }
  checking = true; setMsg("Reading the photo…"); render();
  try {
    const b64 = await shrink(file);
    const r = await call({ kind: "read", image: b64, mediaType: "image/jpeg", expected: need, guesses: [] });
    let n = 0; for (const x of r.darts.slice(0, need)) if (E.pushDart(play, { ...fromClaude(x), c: "cam" })) n++;
    setMsg(n ? `Read ${n} dart${n > 1 ? "s" : ""}. Tap any that look wrong to fix them${n < need ? ", and Miss for darts off the board" : ""}.` : "Couldn't spot darts in that photo. Try straighter on.");
  } catch (e) { setMsg(e.code === "cap" ? "Daily Claude limit reached." : "Couldn't read that photo.", "bad"); }
  checking = false; savePlay(); render();
}
function shrink(file) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL("image/jpeg", 0.85).split(",")[1]); }; img.onerror = rej; img.src = URL.createObjectURL(file); });
}
$("#camIn").onchange = (e) => { readPhoto(e.target.files[0]); e.target.value = ""; };
$("#picIn").onchange = (e) => { readPhoto(e.target.files[0]); e.target.value = ""; };

/* ---------- camera setup ---------- */
const SU = { step: 1, pts: null, frame: null, cam: null, video: null, det: null, drag: -1, info: null, msg: "" };
function openSetup() { view = "setup"; tab = "train"; SU.step = 1; SU.pts = CAL?.pts ? CAL.pts.map((p) => p.slice()) : [[0.5, 0.18], [0.78, 0.5], [0.5, 0.82], [0.22, 0.5]]; SU.frame = null; SU.msg = ""; render(); startSetupCam(); }
function closeSetup() { SU.cam?.stop(); SU.cam = null; view = "main"; }
async function startSetupCam() {
  if (!SU.video) { SU.video = document.createElement("video"); SU.video.playsInline = true; SU.video.muted = true; }
  if (!SU.cam) SU.cam = new LiveCamera(SU.video);
  try { SU.info = await SU.cam.start(); SU.msg = ""; }
  catch (e) { SU.msg = e?.name === "NotAllowedError" ? "Camera permission was refused. Allow it in your browser's site settings, then try again." : "Couldn't start the camera on this device."; }
  if (view === "setup") render();
}
function renderSetup(m) {
  const steps = `<div class="steps">${[1, 2, 3].map((i) => `<i class="${i <= SU.step ? "on" : ""}"></i>`).join("")}</div>`;
  if (SU.step === 1) {
    m.innerHTML = `<h2>Camera setup</h2>${steps}
      <div class="stack small">
        <div class="check"><b>1</b><span>Fix the phone so it can't move: a tripod or shelf about 1 to 1.5 m from the board, a little to one side, out of your throwing line.</span></div>
        <div class="check"><b>2</b><span>Fill most of the picture with the board, all 20 numbers visible. Light the board evenly; a ring light or lamp above it is ideal.</span></div>
        <div class="check"><b>3</b><span>Take the darts out, then freeze a frame.</span></div></div>
      <div class="stage" id="prev" style="margin-top:12px"></div>
      ${SU.msg ? `<div class="banner">${esc(SU.msg)}</div>` : ""}
      <div class="row2" style="margin-top:10px"><button class="btn ghost" id="suCancel">Cancel</button><button class="btn go" id="suFreeze" ${SU.info ? "" : "disabled"}>Freeze frame</button></div>`;
    if (SU.info) { const p = $("#prev"); SU.video.style.width = "100%"; SU.video.style.display = "block"; p.append(SU.video); SU.video.play().catch(() => {}); }
    $("#suCancel").onclick = () => { closeSetup(); render(); };
    $("#suFreeze").onclick = () => { const v = SU.video, c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); SU.frame = c; SU.step = 2; render(); };
    return;
  }
  if (SU.step === 2) {
    m.innerHTML = `<h2>Line up the wires</h2>${steps}
      <p class="small muted">Drag each handle onto the <b>outer edge of the double ring</b>, in the middle of the numbered segment. The drawn wires should then sit on the board's wires.</p>
      <div class="stage" id="stage"><canvas class="ov" id="suOv"></canvas><canvas class="zoom" id="suZoom" width="220" height="220" hidden></canvas></div>
      <div class="row2" style="margin-top:10px"><button class="btn ghost" id="suBack">Retake frame</button><button class="btn go" id="suOk">Looks right</button></div>`;
    const stage = $("#stage"), f = SU.frame; f.style.width = "100%"; f.style.display = "block"; stage.prepend(f);
    const handles = SU.pts.map((p, i) => { const h = document.createElement("div"); h.className = "handle"; h.innerHTML = `<span>${CAL_NAMES[i]}</span>`; stage.append(h); return h; });
    const place = () => handles.forEach((h, i) => { h.style.left = SU.pts[i][0] * 100 + "%"; h.style.top = SU.pts[i][1] * 100 + "%"; });
    const ov = $("#suOv"), zoom = $("#suZoom");
    const draw = () => {
      const r = stage.getBoundingClientRect(), w = Math.round(r.width * devicePixelRatio), h = Math.round(r.height * devicePixelRatio);
      ov.width = w; ov.height = h; const ctx = ov.getContext("2d"); ctx.clearRect(0, 0, w, h);
      const c = calibrate(SU.pts); if (c) drawOverlay(ctx, c.Hi, w, h, { color: "rgba(255,255,255,.9)" });
    };
    const drawZoom = (i) => {
      const [u, v] = SU.pts[i], zc = zoom.getContext("2d"), sx = u * f.width, sy = v * f.height, R = f.width / 14;
      zc.clearRect(0, 0, 220, 220); zc.drawImage(f, sx - R, sy - R, 2 * R, 2 * R, 0, 0, 220, 220);
      zc.strokeStyle = "#e35647"; zc.lineWidth = 2; zc.beginPath(); zc.moveTo(110, 90); zc.lineTo(110, 130); zc.moveTo(90, 110); zc.lineTo(130, 110); zc.stroke();
      zoom.style.left = u > 0.5 ? "8px" : "auto"; zoom.style.right = u > 0.5 ? "auto" : "8px";
    };
    place(); requestAnimationFrame(draw);
    handles.forEach((h, i) => {
      h.addEventListener("pointerdown", (e) => { e.preventDefault(); h.setPointerCapture(e.pointerId); SU.drag = i; zoom.hidden = false; drawZoom(i); });
      h.addEventListener("pointermove", (e) => { if (SU.drag !== i) return; const r = stage.getBoundingClientRect(); SU.pts[i] = [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; place(); draw(); drawZoom(i); });
      const end = () => { SU.drag = -1; zoom.hidden = true; };
      h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
    });
    $("#suBack").onclick = () => { SU.step = 1; render(); };
    $("#suOk").onclick = () => { if (!calibrate(SU.pts)) { toast("Those points don't make a board shape. Spread them out."); return; } SU.step = 3; SU.msg = ""; render(); startDirStep(); };
    return;
  }
  m.innerHTML = `<h2>Teach it your darts</h2>${steps}
    <p>Push one dart into the <b>bullseye</b> by hand, then step out of view.</p>
    <p class="small muted">Oche learns which way the barrel and flight point from the camera's angle, so it can find each dart's tip. Then pull the dart out.</p>
    <div class="stage" id="prev3"><canvas class="ov" id="suOv3"></canvas></div>
    <div class="vmsg ${SU.msg.startsWith("Got") ? "good" : ""}" aria-live="polite">${esc(SU.msg || "Waiting for a dart in the bull…")}</div>
    <div class="row2" style="margin-top:10px"><button class="btn ghost" id="suSkip">Skip this step</button><button class="btn go" id="suDone" ${SU.dir ? "" : "disabled"}>Save setup</button></div>`;
  const p = $("#prev3"); p.prepend(SU.video); SU.video.play().catch(() => {});
  requestAnimationFrame(() => { const ov = $("#suOv3"); if (!ov) return; const r = p.getBoundingClientRect(); ov.width = r.width * devicePixelRatio; ov.height = r.height * devicePixelRatio; const c = calibrate(SU.pts); if (c) drawOverlay(ov.getContext("2d"), c.Hi, ov.width, ov.height, { color: "rgba(255,255,255,.4)" }); });
  $("#suSkip").onclick = () => finishSetup(null);
  $("#suDone").onclick = () => finishSetup(SU.dir);
}
function startDirStep() {
  SU.dir = null;
  const { H, Hi } = calibrate(SU.pts);
  const det = new Detector({ w: SU.info.w, h: SU.info.h, H });
  SU.cam.loop((g) => {
    const ev = det.feed(g); if (!ev) return;
    if (ev.type === "dart" && !SU.dir) {
      const d = dirFromBull(ev, Hi, SU.info.w, SU.info.h);
      if (d) { SU.dir = d; SU.msg = "Got it. Pull the dart out, then save."; } else SU.msg = "That dart looks head-on to the camera. Move the phone a little more to the side, or skip.";
      if (view === "setup") render();
    }
  });
}
function finishSetup(dir) {
  CAL = { pts: SU.pts.map((p) => p.map(r2x)), dir, at: Date.now() }; ls.set("oche.cal", CAL);
  closeSetup(); toast("Camera set up. Starting live scoring."); render(); liveStart();
}
const r2x = (n) => Math.round(n * 10000) / 10000;

/* ---------- settings ---------- */
function openSettings() {
  const el = document.createElement("div"); el.className = "sheet";
  el.innerHTML = `<div class="in" role="dialog" aria-label="Settings"><h2 style="margin-top:0">Settings</h2>
    <div class="setrow"><span>Claude checks each visit<br><span class="small muted">Photo of the board after the third dart</span></span><select id="sChk"><option value="unsure">When a dart is near a wire</option><option value="always">Every visit</option><option value="off">Never</option></select></div>
    <div class="setrow"><span>Call out scores</span><button class="toggle" id="sCall" role="switch" aria-checked="${SET.call}" aria-label="Call out scores"></button></div>
    <div class="setrow"><span>Camera calibration<br><span class="small muted">${CAL ? "Set " + new Date(CAL.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + (CAL.dir ? "" : ", dart direction not learned") : "Not set up"}</span></span><button class="btn sm" id="sCal">${CAL ? "Redo" : "Set up"}</button></div>
    <div class="setrow"><span>Claude calls left today</span><b>${ST.status?.ai ? ST.status.left : "API key not set"}</b></div>
    <div class="setrow"><span class="small muted">Signed in as ${esc(ST.email || "you")}</span><button class="btn sm ghost" id="sOut">Sign out</button></div>
    <div class="row2" style="margin-top:14px"><a class="btn ghost" href="/">SpinDecks home</a><button class="btn" id="sClose">Done</button></div></div>`;
  document.body.append(el);
  const close = () => el.remove();
  el.addEventListener("click", (e) => { if (e.target === el) close(); });
  el.querySelector("#sChk").value = SET.check;
  el.querySelector("#sChk").onchange = (e) => { SET.check = e.target.value; saveSet(); };
  el.querySelector("#sCall").onclick = (e) => { SET.call = !SET.call; saveSet(); e.currentTarget.setAttribute("aria-checked", SET.call); };
  el.querySelector("#sCal").onclick = () => { close(); liveStop(); openSetup(); };
  el.querySelector("#sOut").onclick = async () => { liveStop(); await supa.signOut(); location.reload(); };
  el.querySelector("#sClose").onclick = close;
}

/* ---------- charts (plain SVG) ---------- */
function niceRange(min, max, n = 4) { if (min === max) { min -= 5; max += 5; } const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 5, 10].map((s) => s * mag).find((s) => s >= raw); return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step }; }
function lineChart(vals, labels, extra) {
  const W = 340, H = 180, L = 40, R = 10, T = 10, B = 24;
  const all = vals.concat(extra || []), { lo, hi, step } = niceRange(Math.min(...all), Math.max(...all));
  const x = (i) => L + (vals.length < 2 ? (W - L - R) / 2 : i * (W - L - R) / (vals.length - 1)), y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
  let g = ""; for (let v = lo; v <= hi + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${+v.toFixed(1)}</text>`;
  const path = (a) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const area = path(vals) + `L${x(vals.length - 1)} ${H - B}L${x(0)} ${H - B}Z`;
  const ticks = labels.map((l, i) => (i === 0 || i === labels.length - 1 || (labels.length > 4 && i === Math.floor(labels.length / 2))) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}">${esc(l)}</text>` : "").join("");
  const lv = vals[vals.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Average per session">${g}<path d="${area}" fill="var(--red)" fill-opacity=".12"/>${extra ? `<path d="${path(extra)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>` : ""}<path d="${path(vals)}" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linejoin="round"/>${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === vals.length - 1 ? 4.5 : 2.2}" fill="var(--red)"><title>${esc(labels[i])}: ${v.toFixed(1)}</title></circle>`).join("")}<text x="${x(vals.length - 1) - 6}" y="${y(lv) - 9}" text-anchor="end" style="fill:var(--ink);font-weight:700">${lv.toFixed(1)}</text>${ticks}</svg>`;
}
function barChart(vals, labels, colors, { pct = false, h = 170, fs = 11 } = {}) {
  const W = 340, H = h, L = 30, R = 6, T = 14, B = 22, n = vals.length, real = vals.filter((v) => v != null);
  const { hi, step } = niceRange(0, Math.max(pct ? 50 : 1, ...real)), y = (v) => T + (hi - v) / hi * (H - T - B), bw = (W - L - R) / n;
  let g = ""; for (let v = 0; v <= hi + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 5}" y="${y(v) + 4}" text-anchor="end">${+v.toFixed(0)}${pct ? "%" : ""}</text>`;
  const bars = vals.map((v, i) => { const x0 = L + i * bw + bw * 0.15, w = bw * 0.7; const lab = `<text x="${x0 + w / 2}" y="${H - 7}" text-anchor="middle" style="font-size:${fs}px">${esc(labels[i])}</text>`; if (v == null) return `<rect x="${x0}" y="${y(0) - 2}" width="${w}" height="2" fill="var(--line)"/>${lab}`; return `<rect x="${x0}" y="${y(v)}" width="${w}" height="${Math.max(0, y(0) - y(v))}" rx="2" fill="${colors[i]}"><title>${esc(labels[i])}: ${v}${pct ? "%" : ""}</title></rect>${lab}`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${g}${bars}</svg>`;
}

/* ---------- stats ---------- */
let statRange = "30", delArm = null;
function renderStats(m) {
  const all = D.sessions, list = E.inRange(all, statRange), A = E.analyse(list);
  const prev = E.analyse(statRange === "all" ? [] : all.filter((s) => s.at < Date.now() - (+statRange) * 864e5 && s.at >= Date.now() - 2 * (+statRange) * 864e5));
  const delta = (a, b, d = 1) => a == null || b == null ? "" : `<i class="${a >= b ? "up" : "down"}">${a >= b ? "▲" : "▼"} ${Math.abs(a - b).toFixed(d)}</i>`;
  const dblKeys = [...Array(20)].map((_, i) => "D" + (i + 1)).concat("BULL");
  const head = `<h2>Stats</h2><div class="seg" role="group" aria-label="Period">${[["7", "7 days"], ["30", "30 days"], ["all", "All time"]].map(([k, l]) => `<button data-r="${k}" aria-pressed="${statRange === k}">${l}</button>`).join("")}</div>`;
  if (!list.length) { m.innerHTML = head + `<div class="card" style="margin-top:12px"><p style="margin:0">${all.length ? "No games in this period." : "Finish your first game and your stats start here: averages, doubles, where your darts land, and records."}</p></div>`; wireStats(m); return; }
  const per = A.per, labs = per.map((p) => new Date(p.at).toLocaleDateString(undefined, { day: "numeric", month: "short" }));
  const roll = per.map((p, i) => { const w = per.slice(Math.max(0, i - 4), i + 1); return w.reduce((a, b) => a + b.avg, 0) / w.length; });
  const bins = [[0, 39, "0–39"], [40, 59, "40–59"], [60, 79, "60–79"], [80, 99, "80–99"], [100, 139, "100+"], [140, 179, "140+"], [180, 180, "180"]];
  const dp = dblKeys.map((k) => A.dbl[k] && A.dbl[k][0] >= 3 ? Math.round(A.dbl[k][1] / A.dbl[k][0] * 100) : null);
  m.innerHTML = head + `
  <div class="kpis">
    <div class="kpi"><span>3-dart avg</span><b>${A.avg != null ? A.avg.toFixed(1) : "–"}</b>${delta(A.avg, prev.avg)}</div>
    <div class="kpi"><span>First 9 avg</span><b>${A.f9avg != null ? A.f9avg.toFixed(1) : "–"}</b>${delta(A.f9avg, prev.f9avg)}</div>
    <div class="kpi"><span>Checkout %</span><b>${A.coPct != null ? A.coPct.toFixed(0) + "%" : "–"}</b>${delta(A.coPct, prev.coPct, 0)}</div>
    <div class="kpi"><span>Doubles %</span><b>${A.dPct != null ? A.dPct.toFixed(0) + "%" : "–"}</b>${delta(A.dPct, prev.dPct, 0)}</div>
    <div class="kpi"><span>Treble hit %</span><b>${A.tPct != null ? A.tPct.toFixed(0) + "%" : "–"}</b>${delta(A.tPct, prev.tPct, 0)}</div>
    <div class="kpi"><span>100+ / 140+ / 180</span><b>${A.ton} / ${A.t140} / ${A.t180}</b><i class="muted">${A.darts} darts thrown</i></div>
  </div>
  ${per.length ? `<h2>Scoring average</h2><div class="card chart">${lineChart(per.map((p) => p.avg), labs, per.length > 2 ? roll : null)}<div class="legend"><span><i style="background:var(--red)"></i>Session average</span>${per.length > 2 ? `<span><i style="background:var(--muted)"></i>Rolling 5</span>` : ""}</div></div>` : ""}
  ${A.visits.length ? `<h2>Visit scores</h2><div class="card chart">${barChart(bins.map(([a, b]) => A.visits.filter((v) => v >= a && v <= b).length), bins.map((b) => b[2]), bins.map((b) => (b[0] >= 100 ? "var(--green)" : "var(--muted)")))}</div>` : ""}
  ${A.dAtt ? `<h2>Doubles</h2><div class="card chart">${barChart(dp, dblKeys.map((k) => (k === "BULL" ? "B" : k.slice(1))), dp.map((p) => (p == null ? "var(--line)" : p >= 35 ? "var(--green)" : p >= 20 ? "var(--amber)" : "var(--red)")), { pct: true, h: 190, fs: 9 })}
    <div class="legend"><span><i style="background:var(--green)"></i>35%+</span><span><i style="background:var(--amber)"></i>20–35%</span><span><i style="background:var(--red)"></i>Under 20%</span><span>Needs 3+ darts at it</span></div></div>` : ""}
  <h2>Where your darts land</h2><div class="card"><div class="heatgrid">
    <div>${E.boardSVG({ heat: A.heat, dim: true })}<div class="cap">Every dart, by bed</div></div>
    <div>${E.boardSVG({ dots: A.bias.map((b) => [b[2].toFixed(1), b[3].toFixed(1)]), target: "T20", dim: true })}<div class="cap">Darts aimed at T20</div></div></div>
    ${A.bx != null ? `<p class="small muted" style="margin:10px 0 0">Average T20 dart: ${Math.abs(A.bx).toFixed(1)}mm ${A.bx < 0 ? "left" : "right"} and ${Math.abs(A.by).toFixed(1)}mm ${A.by < 0 ? "high" : "low"} of the bed centre. The treble bed is 8mm deep.</p>` : ""}</div>
  <h2>Records</h2><div class="card" style="padding-top:4px"><table><thead><tr><th>Game</th><th class="r">Played</th><th class="r">Best</th><th class="r">Last</th></tr></thead><tbody>
    ${GORDER.map((g) => { const G = GAMES[g], ls2 = list.filter((s) => s.g === g), b = bestOf(g, ls2); return `<tr><td>${G.name}</td><td class="r">${ls2.length}</td><td class="r">${b ? G.fmt(b.r) : "–"}</td><td class="r">${ls2.length ? G.fmt(ls2[ls2.length - 1].r) : "–"}</td></tr>`; }).join("")}</tbody></table></div>
  <h2>History</h2><div class="card" style="padding-block:0">${list.slice().reverse().slice(0, 60).map((s) => { const G = GAMES[s.g]; return `<div class="hrow"><div><span class="t">${G.name}</span><small>${new Date(s.at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${s.d.length} darts${s.d.some((d) => d.c === "live") ? " · camera" : ""}</small></div><b>${G.head(s.r)}</b><button class="del${delArm === s.id ? " arm" : ""}" data-id="${s.id}" aria-label="Delete this game">${delArm === s.id ? "Delete" : "···"}</button></div>`; }).join("")}</div>`;
  wireStats(m);
}
function wireStats(m) {
  m.querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { statRange = b.dataset.r; render(); }));
  m.querySelectorAll(".del").forEach((b) => (b.onclick = () => { if (delArm === b.dataset.id) { delArm = null; deleteSession(b.dataset.id); } else delArm = b.dataset.id; render(); }));
}

/* ---------- coach ---------- */
let coachAI = null, coachBusy = false;
function renderCoach(m) {
  const recent = E.inRange(D.sessions, "30"), list = recent.length ? recent : D.sessions, A = E.analyse(list), ins = E.insights(A);
  m.innerHTML = `<h2>What to work on</h2>${list.length ? "" : `<div class="banner">Play a few games and the coach starts spotting patterns in your throwing.</div>`}
  <div class="stack" style="margin-top:12px">${ins.slice(0, 4).map((x) => `<div class="ins"><span class="sv s${x.sev}"></span><div><h4>${esc(x.title)}</h4><p>${esc(x.body)}</p><div class="tip">${esc(x.tip)}</div><button class="chip" data-drill="${x.drill}">Drill: ${GAMES[x.drill].name}</button></div></div>`).join("")}</div>
  <h2>Ask the coach</h2>
  <div class="card ai stack">${coachBusy ? `<div class="thinking"><span class="dot"></span>Claude is going through ${list.length} sessions…</div>`
    : coachAI?.err ? `<p class="muted" style="margin:0">${esc(coachAI.err)}</p><button class="btn go" id="aiGo">Try again</button>`
    : coachAI ? aiView(coachAI)
    : `<p style="margin:0">Claude reads your averages, doubles table, grouping and recent results, then builds three priorities and a plan for the week.</p>${ST.status?.ai ? `<button class="btn go" id="aiGo" ${list.length ? "" : "disabled"}>Build my plan</button>` : `<p class="small muted" style="margin:0">Needs the Anthropic API key set on the server.</p>`}`}</div>`;
  m.querySelectorAll("[data-drill]").forEach((b) => (b.onclick = () => startGame(b.dataset.drill)));
  const go = $("#aiGo"); if (go) go.onclick = () => askCoach(A, ins, list.length);
}
function aiView(c) {
  return `<p class="sum" style="margin:0">${esc(c.summary)}</p>
  ${c.priorities.map((p) => `<div class="ins"><span class="sv s2"></span><div><h4>${esc(p.title)}</h4><p>${esc(p.why)}</p>${p.tip ? `<div class="tip">${esc(p.tip)}</div>` : ""}${p.drill ? `<button class="chip" data-drill="${p.drill}">Drill: ${GAMES[p.drill].name}</button>` : ""}</div></div>`).join("")}
  ${c.tips.length ? `<div><h3>Technique</h3><ul class="tips">${c.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}
  ${c.plan.length ? `<div><h3>This week</h3><div class="plan">${c.plan.map((p) => `<div><b>${esc(p.day)}</b><span>${esc(p.session)}</span></div>`).join("")}</div></div>` : ""}
  <button class="btn" id="aiGo">Ask again</button>`;
}
async function askCoach(A, ins, n) {
  coachBusy = true; coachAI = null; render();
  const dbl = Object.fromEntries(Object.entries(A.dbl).map(([k, v]) => [k, `${v[1]}/${v[0]}`]));
  const recs = Object.fromEntries(GORDER.map((g) => [GAMES[g].name, A.sessions.filter((s) => s.g === g).slice(-5).map((s) => GAMES[g].head(s.r))]));
  const data = {
    sessions: n, dartsThrown: A.darts, threeDartAvg: A.avg && r2(A.avg), first9Avg: A.f9avg && r2(A.f9avg), checkoutPct: A.coPct && r2(A.coPct), doublesPct: A.dPct && r2(A.dPct),
    doublesHitsOverAttempts: dbl, trebleBedHitPct: A.tPct && r2(A.tPct), rightNumberWhenAimingTreblePct: A.tNumPct && r2(A.tNumPct), t20MissesBySegment: A.nb,
    t20GroupingOffsetMm: A.bx != null ? { x: r2(A.bx), y: r2(A.by), note: "x negative = left towards 5, y negative = high" } : null,
    visits100plus: A.ton, visits140plus: A.t140, visits180: A.t180,
    recentSessionAverages: A.per.slice(-12).map((p) => ({ date: new Date(p.at).toISOString().slice(0, 10), game: p.g, avg: r2(p.avg) })),
    recentResultsByGame: recs, ruleBasedFlags: ins.map((i) => i.title),
  };
  try { coachAI = await call({ kind: "coach", data }); if (ST.status) ST.status.left = coachAI.left; }
  catch (e) { coachAI = { err: e.code === "cap" ? "Daily Claude limit reached. Try tomorrow." : e.code === "offline" ? "You're offline." : "The coach couldn't finish. Try again." }; }
  coachBusy = false; if (tab === "coach") render();
}

boot();
