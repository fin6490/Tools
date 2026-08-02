// chessclock.js — a multi-player game clock (2–6 players). Each player has a
// time bank; tap your zone to end your turn (with optional Fischer increment).
// Timestamp-based so it never drifts. Config persists; live game is in memory.
import { getState, save } from "./storage.js?v=20260801n";

const now = () => performance.now();

function fmt(ms) {
  ms = Math.max(0, ms);
  if (ms >= 10000) {
    const t = Math.ceil(ms / 1000); // whole seconds remaining
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  }
  return (ms / 1000).toFixed(1); // final 10s show tenths
}

export function initChessClock(root) {
  const panel = root.querySelector(".cc-panel");
  if (!panel) return; // not on this page

  const setup = root.querySelector("#ccSetup");
  const board = root.querySelector("#ccBoard");
  const controls = root.querySelector("#ccControls");
  const countEl = root.querySelector("#ccCount");
  const minEl = root.querySelector("#ccMin");
  const incEl = root.querySelector("#ccInc");
  const startBtn = root.querySelector("#ccStart");
  const pauseBtn = root.querySelector("#ccPause");
  const resetBtn = root.querySelector("#ccReset");
  const wakeToggle = root.querySelector("#ccWake");

  const cfg = () => {
    const s = getState();
    if (!s.chessclock) s.chessclock = { count: 2, baseMin: 5, incSec: 0 };
    return s.chessclock;
  };
  const c = cfg();
  countEl.value = c.count; minEl.value = c.baseMin; incEl.value = c.incSec;

  let players = []; // { name, remaining, zone, timeEl }
  let active = 0, incMs = 0, running = false, turnStart = 0, ticker = null;

  function persistCfg() {
    cfg().count = clamp(+countEl.value, 2, 6);
    cfg().baseMin = clamp(+minEl.value, 1, 180);
    cfg().incSec = clamp(+incEl.value, 0, 60);
    save();
  }
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n || 0)));
  [countEl, minEl, incEl].forEach((el) => el.addEventListener("input", persistCfg));

  function start() {
    persistCfg();
    const n = cfg().count, base = cfg().baseMin * 60000;
    incMs = cfg().incSec * 1000;
    players = Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, remaining: base }));
    active = 0; running = true; turnStart = now();
    buildBoard();
    setup.hidden = true; board.hidden = false; controls.hidden = false;
    board.dataset.count = n;
    startTicker();
  }

  function buildBoard() {
    board.innerHTML = "";
    players.forEach((p, i) => {
      const zone = document.createElement("button");
      zone.className = "cc-zone";
      zone.type = "button";
      const name = document.createElement("span");
      name.className = "cc-name"; name.textContent = p.name;
      const t = document.createElement("span");
      t.className = "cc-time"; t.textContent = fmt(p.remaining);
      zone.append(name, t);
      zone.addEventListener("click", () => onZone(i));
      board.appendChild(zone);
      p.zone = zone; p.timeEl = t;
    });
    paint();
  }

  function onZone(i) {
    if (!running) return;      // paused → ignore
    if (i !== active) return;  // only the player on the clock can pass
    commit(now());
    players[active].remaining += incMs; // Fischer increment for the move made
    advance();
    turnStart = now();
    paint();
  }

  function commit(t) {
    if (!running) return;
    players[active].remaining = Math.max(0, players[active].remaining - (t - turnStart));
    turnStart = t;
  }

  function advance() {
    for (let k = 0; k < players.length; k++) {
      const n = (active + 1 + k) % players.length;
      if (players[n].remaining > 0) { active = n; return; }
    }
    // Everyone flagged — stop.
    running = false;
  }

  function paint() {
    players.forEach((p, i) => {
      p.zone.classList.toggle("active", i === active && running);
      p.zone.classList.toggle("flagged", p.remaining <= 0);
      p.timeEl.textContent = fmt(p.remaining);
    });
    pauseBtn.textContent = running ? "Pause" : "Resume";
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(() => {
      if (!running) return;
      const t = now();
      const disp = players[active].remaining - (t - turnStart);
      if (disp <= 0) {
        players[active].remaining = 0;
        players[active].timeEl.textContent = fmt(0);
        players[active].zone.classList.add("flagged");
        advance();
        turnStart = now();
        paint();
      } else {
        players[active].timeEl.textContent = fmt(disp);
      }
    }, 100);
  }
  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", () => {
    if (running) { commit(now()); running = false; }
    else { turnStart = now(); running = true; }
    paint();
  });
  resetBtn.addEventListener("click", () => {
    running = false; stopTicker();
    setup.hidden = false; board.hidden = true; controls.hidden = true;
    releaseWake();
    if (wakeToggle) wakeToggle.checked = false;
  });

  // ---- screen wake lock ----
  let wakeLock = null;
  if (!("wakeLock" in navigator)) wakeToggle?.closest(".opt")?.setAttribute("hidden", "");
  async function acquireWake() { try { wakeLock = await navigator.wakeLock.request("screen"); } catch { if (wakeToggle) wakeToggle.checked = false; } }
  function releaseWake() { wakeLock?.release?.(); wakeLock = null; }
  wakeToggle?.addEventListener("change", () => { wakeToggle.checked ? acquireWake() : releaseWake(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wakeToggle?.checked && !wakeLock) acquireWake();
  });
}
