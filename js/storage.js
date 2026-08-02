// storage.js — everything persists in localStorage. No server, no accounts.
const KEY = "spindeck.v1";

const DEFAULT_WHEEL = () => ({
  id: crypto.randomUUID(),
  name: "My Wheel",
  text: "Alice\nBob\nCharlie\nDiana\nEvan\nFiona",
  removeWinner: false,
  elimination: false,
  style: "wheel", // "wheel" | "reel"
  images: {}, // { label: dataURL }
  history: [], // { name, at }
});

const DEFAULTS = () => ({
  theme: "dark",
  soundOn: true,
  confettiOn: true,
  spinLen: 5,
  greenScreen: false,
  activeWheelId: null,
  wheels: [DEFAULT_WHEEL()],
  counters: [{ id: crypto.randomUUID(), name: "Spins", value: 0, step: 1 }],
  groups: { text: "", mode: "count", num: 4 },
  players: [], // { id, name, score, step }
  slots: { count: 3, sources: [], history: [] },
  numbers: { min: 1, max: 100, count: 1, unique: false },
  dice: { notation: "", history: [] },
  firstPlayer: { mode: "count", count: 4, names: "" },
  scorepad: { games: [], activeId: null },
  chessclock: { count: 2, baseMin: 5, incSec: 0 },
  bracket: { format: "knockout", entrants: "", seed: "order", groupCount: 2, qualify: 2, points: { win: 3, draw: 1, loss: 0 }, competitors: [], ko: {}, league: {}, groups: {} },
  scoring: {
    mode: "free", // free | target | golf | rounds | darts | cricket
    target: 50,
    rounds: { total: 5, current: 1 },
    darts: { start: 501, doubleOut: false, active: 0, winnerId: null, undo: [], p: {} },
    cricket: { winnerId: null, marks: {}, points: {}, undo: [] },
  },
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const parsed = JSON.parse(raw);
    // merge with defaults so new fields never come back undefined
    const base = DEFAULTS();
    const merged = { ...base, ...parsed };
    if (!Array.isArray(merged.wheels) || merged.wheels.length === 0) merged.wheels = base.wheels;
    if (!Array.isArray(merged.counters)) merged.counters = base.counters;
    return merged;
  } catch {
    return DEFAULTS();
  }
}

let saveTimer = null;
function writeNow() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
export function save() {
  // debounce — the editor can fire on every keystroke
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 150);
}
// Write immediately, cancelling any pending debounce.
export function flush() {
  clearTimeout(saveTimer);
  writeNow();
}
// Never lose a pending change when the tab is closed/hidden or reloaded.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function getState() { return state; }

export function activeWheel() {
  let w = state.wheels.find((x) => x.id === state.activeWheelId);
  if (!w) { w = state.wheels[0]; state.activeWheelId = w.id; }
  return w;
}

export function newWheel(name = "New Wheel") {
  const w = { ...DEFAULT_WHEEL(), name, text: "", history: [] };
  state.wheels.push(w);
  state.activeWheelId = w.id;
  save();
  return w;
}

export function deleteWheel(id) {
  if (state.wheels.length <= 1) return false; // always keep one
  state.wheels = state.wheels.filter((w) => w.id !== id);
  if (state.activeWheelId === id) state.activeWheelId = state.wheels[0].id;
  save();
  return true;
}

export function exportAll() {
  return JSON.stringify(state, null, 2);
}

export function importAll(json) {
  const parsed = JSON.parse(json);
  if (!parsed || !Array.isArray(parsed.wheels)) throw new Error("Not a SpinDecks file");
  state = { ...DEFAULTS(), ...parsed };
  save();
  return state;
}

export function resetAll() {
  state = DEFAULTS();
  save();
  return state;
}

// --- Share via URL: encode a single wheel into the hash ---
export function encodeWheel(w) {
  const payload = { n: w.name, t: w.text };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodeWheel(str) {
  const payload = JSON.parse(decodeURIComponent(escape(atob(str))));
  return { ...DEFAULT_WHEEL(), name: payload.n || "Shared Wheel", text: payload.t || "" };
}

export function addSharedWheel(w) {
  state.wheels.push(w);
  state.activeWheelId = w.id;
  save();
  return w;
}
