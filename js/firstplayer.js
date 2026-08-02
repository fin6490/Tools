// firstplayer.js — "who goes first?" Ruthlessly simple: an answer in one tap.
// Count mode (default), Names mode, a full turn-order list, and a multi-touch
// "everyone hold a finger" picker. All picks use crypto randomness.
import { getState, save } from "./storage.js?v=20260801k";

function randInt(n) {
  const range = 2 ** 32, limit = range - (range % n), a = new Uint32Array(1);
  let x;
  do { crypto.getRandomValues(a); x = a[0]; } while (x >= limit);
  return x % n;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const RING_COLORS = ["#ff5b52", "#33d6c0", "#ffc23c", "#8b7bd8", "#4bc0e0", "#56c596", "#ff8a63", "#f2545b"];

export function initFirstPlayer(root) {
  const panel = root.querySelector(".fp-panel");
  if (!panel) return; // not on this page

  const modeBtns = root.querySelectorAll("[data-fp-mode]");
  const countBox = root.querySelector("#fpCount");
  const namesBox = root.querySelector("#fpNames");
  const touchBox = root.querySelector("#fpTouch");
  const numEl = root.querySelector("#fpNum");
  const nameList = root.querySelector("#fpNameList");
  const pickBtn = root.querySelector("#fpPick");
  const orderBtn = root.querySelector("#fpOrder");
  const resultEl = root.querySelector("#fpResult");
  const orderList = root.querySelector("#fpOrderList");
  const pad = root.querySelector("#fpTouchPad");

  const cfg = () => {
    const s = getState();
    if (!s.firstPlayer) s.firstPlayer = { mode: "count", count: 4, names: "" };
    return s.firstPlayer;
  };

  // ---- players from the current mode ----
  function players() {
    const c = cfg();
    if (c.mode === "names") {
      return (c.names || "").split("\n").map((l) => l.trim()).filter(Boolean);
    }
    return Array.from({ length: c.count }, (_, i) => `Player ${i + 1}`);
  }

  // ---- restore + mode switching ----
  function applyMode(mode) {
    cfg().mode = mode;
    modeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.fpMode === mode));
    countBox.hidden = mode !== "count";
    namesBox.hidden = mode !== "names";
    touchBox.hidden = mode !== "touch";
    // The button pair only applies to count/names; the touch pad is self-driving.
    pickBtn.hidden = mode === "touch";
    orderBtn.hidden = mode === "touch";
    resultEl.textContent = "";
    orderList.hidden = true;
    save();
  }
  numEl.textContent = cfg().count;
  nameList.value = cfg().names || "";
  applyMode(cfg().mode || "count");

  modeBtns.forEach((b) => b.addEventListener("click", () => applyMode(b.dataset.fpMode)));

  root.querySelector("#fpMinus").addEventListener("click", () => setCount(cfg().count - 1));
  root.querySelector("#fpPlus").addEventListener("click", () => setCount(cfg().count + 1));
  function setCount(n) {
    cfg().count = Math.max(2, Math.min(12, n));
    numEl.textContent = cfg().count;
    save();
  }
  nameList.addEventListener("input", () => { cfg().names = nameList.value; save(); });

  // ---- pick / order ----
  function bigResult(text) {
    resultEl.innerHTML = "";
    const d = document.createElement("div");
    d.className = "fp-winner";
    d.textContent = text;
    resultEl.appendChild(d);
    d.classList.remove("pop"); void d.offsetWidth; d.classList.add("pop");
  }

  pickBtn.addEventListener("click", () => {
    const list = players();
    orderList.hidden = true;
    if (list.length < 2) { bigResult("Add at least 2 players"); return; }
    bigResult(`${list[randInt(list.length)]} goes first`);
  });

  orderBtn.addEventListener("click", () => {
    const list = players();
    if (list.length < 2) { bigResult("Add at least 2 players"); return; }
    resultEl.textContent = "";
    orderList.innerHTML = "";
    shuffle(list).forEach((name, i) => {
      const li = document.createElement("li");
      const rank = document.createElement("span");
      rank.className = "fp-rank";
      rank.textContent = "#" + (i + 1);
      const n = document.createElement("span");
      n.textContent = name;
      li.append(rank, n);
      orderList.appendChild(li);
    });
    orderList.hidden = false;
  });

  // ---- multi-touch picker ----
  const pointers = new Map(); // pointerId -> { el }
  let countdown = null, resolved = false;

  function padHint(text) {
    let h = pad.querySelector(".fp-touch-hint");
    if (h) h.textContent = text;
  }
  function clearRings() {
    pointers.forEach((p) => p.el.remove());
    pointers.clear();
  }
  function reset() {
    if (countdown) { clearTimeout(countdown); countdown = null; }
    resolved = false;
    clearRings();
    pad.classList.remove("counting");
    padHint("Everyone press and hold a finger here");
  }
  function place(el, e) {
    const r = pad.getBoundingClientRect();
    el.style.left = e.clientX - r.left + "px";
    el.style.top = e.clientY - r.top + "px";
  }
  function addPointer(e) {
    e.preventDefault();
    if (resolved) reset();
    const el = document.createElement("div");
    el.className = "fp-ring";
    el.style.setProperty("--ring", RING_COLORS[pointers.size % RING_COLORS.length]);
    place(el, e);
    pad.appendChild(el);
    pointers.set(e.pointerId, { el });
    if (pointers.size >= 2 && !countdown) startCountdown();
  }
  function movePointer(e) {
    const p = pointers.get(e.pointerId);
    if (p) place(p.el, e);
  }
  function removePointer(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (!resolved) { p.el.remove(); pointers.delete(e.pointerId); }
    if (pointers.size < 2 && !resolved) { // not enough fingers → cancel
      if (countdown) { clearTimeout(countdown); countdown = null; }
      pad.classList.remove("counting");
      padHint(pointers.size ? "Add another finger…" : "Everyone press and hold a finger here");
    }
  }
  function startCountdown() {
    pad.classList.add("counting");
    padHint("Hold still…");
    countdown = setTimeout(() => {
      countdown = null;
      if (pointers.size < 2) return reset();
      resolved = true;
      pad.classList.remove("counting");
      const ids = [...pointers.keys()];
      const winnerId = ids[randInt(ids.length)];
      pointers.forEach((p, id) => p.el.classList.toggle("chosen", id === winnerId));
      pointers.forEach((p, id) => p.el.classList.toggle("faded", id !== winnerId));
      padHint("This player goes first! Tap to go again.");
    }, 2500);
  }

  if (pad) {
    pad.addEventListener("pointerdown", addPointer);
    pad.addEventListener("pointermove", movePointer);
    pad.addEventListener("pointerup", removePointer);
    pad.addEventListener("pointercancel", removePointer);
    pad.addEventListener("pointerleave", removePointer);
  }
}
