// app.js — wires the UI to storage, wheel, timer and counters.
import * as store from "./storage.js?v=20260801k";
import { Wheel, parseEntries, parseLine } from "./wheel.js?v=20260801k";
import * as sound from "./sound.js?v=20260801k";
import { burst } from "./confetti.js?v=20260801k";
import { initTimer } from "./timer.js?v=20260801k";
import { initCounters } from "./counter.js?v=20260801k";
import { initGroups } from "./groups.js?v=20260801k";
import { initImages } from "./images.js?v=20260801k";
import { initScores } from "./scores.js?v=20260801k";
import { initSlots } from "./slots.js?v=20260801k";
import { initNumbers } from "./numbers.js?v=20260801k";
import { initDice } from "./dice.js?v=20260801k";
import { initFirstPlayer } from "./firstplayer.js?v=20260801k";
import { initSupport } from "./support.js?v=20260801k";
import { ROUTES } from "./routes.js?v=20260801k";

const $ = (sel) => document.querySelector(sel);
const app = $("#app");
const state = store.getState();

/* ---------- Theme ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
}
$("#themeToggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme(); store.save(); wheel.draw();
});
applyTheme();

/* ---------- View tabs / client routing ----------
   Each tool has its own real URL (/wheel-of-names, /darts-scoreboard, …) and
   ships a full static page. The tabs are genuine <a href> links, so they work
   with JS off and middle-click; with JS on we soft-navigate between the tools
   that are already in this page's DOM, updating the URL, title and canonical
   without a full reload. The generator set the starting view on #app. */
const INITIAL_VIEW = app.dataset.view || "wheel";
const VIEW_BY_SLUG = Object.fromEntries(Object.entries(ROUTES).map(([v, r]) => [r.slug, v]));

function applyHead(view) {
  const r = ROUTES[view];
  if (!r) return;
  document.title = r.title;
  const canon = $('link[rel="canonical"]');
  if (canon) canon.href = location.origin + "/" + r.slug + "/";
  const desc = $('meta[name="description"]');
  if (desc) desc.content = r.description;
}

function showView(view) {
  app.dataset.view = view;
  document.querySelectorAll("[data-view-btn]").forEach((b) => {
    const on = b.dataset.viewBtn === view;
    b.classList.toggle("is-active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-view-panel]").forEach((p) => {
    p.hidden = p.dataset.viewPanel !== view;
  });
  // The SEO prose only matches the page you actually landed on; hide it once
  // you soft-navigate elsewhere (a reload/deep-link shows the right copy).
  const copy = document.querySelector(".tool-copy");
  if (copy) copy.hidden = view !== INITIAL_VIEW;
  if (view === "wheel") wheel.draw();
  if (view === "slots" && slots) slots.relayout(); // reels need sizing once visible
}

function navigate(view, push) {
  if (!ROUTES[view]) return;
  showView(view);
  applyHead(view);
  if (push) history.pushState({ view }, "", "/" + ROUTES[view].slug + "/");
  window.scrollTo(0, 0);
}

document.querySelectorAll("a[data-view-btn]").forEach((a) => {
  a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // let new-tab / new-window through
    const view = a.dataset.viewBtn;
    if (!ROUTES[view]) return;
    e.preventDefault();
    navigate(view, true);
  });
});
window.addEventListener("popstate", () => {
  const slug = location.pathname.replace(/^\/|\/$/g, "");
  navigate(VIEW_BY_SLUG[slug] || INITIAL_VIEW, false);
});

/* ---------- Wheel ---------- */
const wheel = new Wheel($("#wheel"));
const entriesEl = $("#entries");
const wheelSelect = $("#wheelSelect");

function refreshWheel() {
  const w = store.activeWheel();
  wheel.soundOn = state.soundOn;
  wheel.setImages(w.images || {});
  wheel.setSegments(parseEntries(w.text));
  updateEntryCount(w.text);
}

function updateEntryCount(text) {
  const segs = parseEntries(text);
  const names = segs.length;
  const slices = segs.reduce((s, x) => s + x.weight, 0);
  $("#entryCount").textContent =
    names === slices ? `${names} entries` : `${names} entries · ${slices} slices`;
}

function populateWheelSelect() {
  wheelSelect.innerHTML = "";
  state.wheels.forEach((w) => {
    const o = document.createElement("option");
    o.value = w.id; o.textContent = w.name;
    if (w.id === state.activeWheelId) o.selected = true;
    wheelSelect.appendChild(o);
  });
}

function loadActiveWheelIntoEditor() {
  const w = store.activeWheel();
  entriesEl.value = w.text;
  $("#removeWinner").checked = !!w.removeWinner;
  $("#eliminationMode").checked = !!w.elimination;
  applyStyle(w.style || "wheel");
  refreshWheel();
  renderHistory();
}

// Switch the picker between round wheel and horizontal reel.
function applyStyle(style) {
  const s = style === "reel" ? "reel" : "wheel";
  app.dataset.wheelstyle = s;
  document.querySelectorAll("[data-wheel-style]").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.wheelStyle === s)
  );
  wheel.setMode(s);
}
document.querySelectorAll("[data-wheel-style]").forEach((b) =>
  b.addEventListener("click", () => {
    store.activeWheel().style = b.dataset.wheelStyle;
    store.save();
    applyStyle(b.dataset.wheelStyle);
    refreshWheel();
  })
);

wheelSelect.addEventListener("change", () => {
  state.activeWheelId = wheelSelect.value;
  store.save();
  loadActiveWheelIntoEditor();
});

$("#newWheelBtn").addEventListener("click", () => {
  const name = prompt("Name this wheel:", "Wheel " + (state.wheels.length + 1));
  if (name === null) return;
  store.newWheel(name.trim() || "Untitled");
  populateWheelSelect();
  loadActiveWheelIntoEditor();
});

$("#renameWheelBtn").addEventListener("click", () => {
  const w = store.activeWheel();
  const name = prompt("Rename wheel:", w.name);
  if (name === null) return;
  w.name = name.trim() || w.name;
  store.save();
  populateWheelSelect();
});

$("#deleteWheelBtn").addEventListener("click", () => {
  const w = store.activeWheel();
  if (state.wheels.length <= 1) return toast("Can't delete your only wheel");
  if (!confirm(`Delete "${w.name}"?`)) return;
  store.deleteWheel(w.id);
  populateWheelSelect();
  loadActiveWheelIntoEditor();
});

entriesEl.addEventListener("input", () => {
  const w = store.activeWheel();
  w.text = entriesEl.value;
  store.save();
  refreshWheel();
});

/* editor tools */
function setText(lines) {
  const w = store.activeWheel();
  w.text = lines.join("\n");
  entriesEl.value = w.text;
  store.save();
  refreshWheel();
}
function currentLines() {
  return entriesEl.value.split("\n").map((l) => l.trim()).filter(Boolean);
}
$("#shuffleBtn").addEventListener("click", () => {
  const a = currentLines();
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  setText(a);
});
$("#sortBtn").addEventListener("click", () => setText(currentLines().sort((a, b) => a.localeCompare(b))));
$("#dedupeBtn").addEventListener("click", () => {
  const seen = new Set(); const out = [];
  currentLines().forEach((l) => { const k = l.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(l); } });
  setText(out);
});

/* options */
$("#removeWinner").addEventListener("change", (e) => {
  store.activeWheel().removeWinner = e.target.checked; store.save();
});
$("#eliminationMode").addEventListener("change", (e) => {
  store.activeWheel().elimination = e.target.checked; store.save();
});
$("#soundOn").addEventListener("change", (e) => { state.soundOn = e.target.checked; wheel.soundOn = state.soundOn; store.save(); });
$("#confettiOn").addEventListener("change", (e) => { state.confettiOn = e.target.checked; store.save(); });
const spinLen = $("#spinLen");
spinLen.value = state.spinLen;
$("#spinLenOut").textContent = state.spinLen + "s";
spinLen.addEventListener("input", () => {
  state.spinLen = Number(spinLen.value);
  $("#spinLenOut").textContent = state.spinLen + "s";
  store.save();
});
$("#soundOn").checked = state.soundOn;
$("#confettiOn").checked = state.confettiOn;

/* ---------- Spin + winner ---------- */
// Unlock audio on the very first interaction anywhere (mobile autoplay policy).
["pointerdown", "keydown"].forEach((ev) =>
  window.addEventListener(ev, () => sound.unlock(), { once: true })
);

let counters; // set after init
let slots;    // set after init
let support;  // set after init
function doSpin() {
  if (wheel.spinning) return;
  const w = store.activeWheel();
  if (!parseEntries(w.text).length) return toast("Add some names first");
  sound.unlock(); // start audio within this gesture (mobile needs this)
  wheel.spin(state.spinLen);
  if (counters) counters.incrementSpins();
}
$("#spinBtn").addEventListener("click", doSpin);
$("#spinReel").addEventListener("click", doSpin);

wheel.onWinner = (name) => {
  const w = store.activeWheel();
  w.history.unshift({ name, at: Date.now() });
  if (w.history.length > 100) w.history.length = 100;
  store.save();
  renderHistory();

  if (w.elimination) {
    handleElimination(w, name);
  } else {
    if (state.confettiOn) burst();
    if (state.soundOn) sound.fanfare();
    showResult("winner", name);
    if (w.removeWinner) setTimeout(() => removeFromWheel(name), 50);
  }
};

// Elimination mode: each spin knocks out the pick; the last one standing wins.
function handleElimination(w, name) {
  const remainingAfter = parseEntries(w.text).length - 1;
  removeFromWheel(name);
  if (remainingAfter <= 1) {
    // With one (or none) left, crown the survivor without another spin.
    const survivors = parseEntries(store.activeWheel().text);
    const champ = survivors.length ? survivors[0].label : name;
    if (state.confettiOn) burst();
    if (state.soundOn) sound.fanfare();
    showResult("champion", champ);
  } else {
    if (state.soundOn) sound.tick();
    showResult("eliminated", name, remainingAfter);
  }
}

const modal = $("#winnerModal");
const winnerRemoveBtn = $("#winnerRemove");
const winnerCloseBtn = $("#winnerClose");

function showResult(kind, name, remaining) {
  const eyebrow = $("#modalEyebrow");
  const sub = $("#modalSub");
  const card = modal.querySelector(".modal-card");
  card.classList.remove("champion", "eliminated");
  $("#winnerName").textContent = name;

  if (kind === "eliminated") {
    card.classList.add("eliminated");
    eyebrow.textContent = "Eliminated";
    sub.hidden = false;
    sub.textContent = `${remaining} still in the running`;
    winnerRemoveBtn.hidden = true;
    winnerCloseBtn.textContent = "Keep going";
  } else if (kind === "champion") {
    card.classList.add("champion");
    eyebrow.textContent = "Champion";
    sub.hidden = false;
    sub.textContent = "last one standing";
    winnerRemoveBtn.hidden = true;
    winnerCloseBtn.textContent = "Done";
  } else {
    eyebrow.textContent = "Winner";
    sub.hidden = true;
    winnerRemoveBtn.hidden = false;
    winnerCloseBtn.textContent = "Close";
  }
  modal.hidden = false;
  winnerCloseBtn.focus();
}

winnerCloseBtn.addEventListener("click", () => { modal.hidden = true; });
winnerRemoveBtn.addEventListener("click", () => {
  removeFromWheel($("#winnerName").textContent);
  modal.hidden = true;
});
modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

function removeFromWheel(name) {
  const w = store.activeWheel();
  const lines = w.text.split("\n");
  const idx = lines.findIndex((l) => l.trim() && parseLine(l).label === name);
  if (idx !== -1) lines.splice(idx, 1);
  w.text = lines.join("\n");
  entriesEl.value = w.text;
  store.save();
  refreshWheel();
}

/* ---------- History ---------- */
function renderHistory() {
  const w = store.activeWheel();
  const list = $("#historyList");
  list.innerHTML = "";
  w.history.forEach((h, i) => {
    const li = document.createElement("li");
    if (i === 0) li.className = "latest";
    const name = document.createElement("span");
    name.textContent = h.name;
    const time = document.createElement("span");
    time.className = "h-time";
    time.textContent = new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.append(name, time);
    list.appendChild(li);
  });
}
$("#clearHistory").addEventListener("click", () => {
  store.activeWheel().history = [];
  store.save(); renderHistory();
});

/* ---------- Fullscreen / focus mode (works on any tab) ---------- */
function togglePresent(force) {
  const on = force !== undefined ? force : app.dataset.present !== "true";
  app.dataset.present = on ? "true" : "false";

  // Real browser fullscreen (best-effort — needs a user gesture; CSS focus
  // mode still applies if it's blocked).
  if (on) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }

  if (on && !$("#present-exit")) {
    const b = document.createElement("button");
    b.id = "present-exit"; b.className = "icon-btn"; b.textContent = "✕";
    b.title = "Exit fullscreen (Esc)";
    b.addEventListener("click", () => togglePresent(false));
    app.appendChild(b);
  } else if (!on && $("#present-exit")) {
    $("#present-exit").remove();
  }

  // Canvases need to re-measure for their new size.
  requestAnimationFrame(() => {
    wheel._fitToDisplay(); wheel.draw();
    if (slots && app.dataset.view === "slots") slots.relayout();
  });
}
$("#presentBtn").addEventListener("click", () => togglePresent());
// Keep our state in sync if the user leaves fullscreen via Esc / browser UI.
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && app.dataset.present === "true") togglePresent(false);
});

/* ---------- Green screen (OBS chroma key) ---------- */
function applyGreenLabel() {
  const b = $("#greenBtn");
  if (b) b.textContent = app.dataset.greenscreen === "true" ? "Green screen: on" : "Green screen (chroma key)";
}
function toggleGreen(force) {
  const on = force !== undefined ? force : app.dataset.greenscreen !== "true";
  app.dataset.greenscreen = on ? "true" : "false";
  state.greenScreen = on;
  store.save();
  applyGreenLabel();
}

/* ---------- Keyboard ---------- */
document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (e.code === "Space" && !typing && app.dataset.view === "wheel") {
    e.preventDefault(); doSpin();
  } else if (e.key.toLowerCase() === "f" && !typing) {
    togglePresent();
  } else if (e.key.toLowerCase() === "g" && !typing) {
    toggleGreen();
  } else if (e.key === "Escape") {
    const imagesModal = $("#imagesModal");
    if (!modal.hidden) modal.hidden = true;
    else if (support && support.isOpen()) support.close();
    else if (!imagesModal.hidden) imagesModal.hidden = true;
    else if (app.dataset.present === "true") togglePresent(false);
    else closeMenu();
  }
});

/* ---------- Menu / import / export / share ---------- */
const menuPanel = $("#menuPanel");
function closeMenu() { menuPanel.hidden = true; }
$("#menuBtn").addEventListener("click", (e) => { e.stopPropagation(); menuPanel.hidden = !menuPanel.hidden; });
document.addEventListener("click", (e) => { if (!e.target.closest(".menu")) closeMenu(); });

menuPanel.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  closeMenu();
  if (action === "install") {
    support.install();
  } else if (action === "greenscreen") {
    toggleGreen();
  } else if (action === "support") {
    support.open();
  } else if (action === "export") {
    download("spindeck-backup.json", store.exportAll());
    toast("Backup downloaded");
  } else if (action === "import") {
    $("#importFile").click();
  } else if (action === "share") {
    const url = location.origin + location.pathname + "#w=" + store.encodeWheel(store.activeWheel());
    navigator.clipboard?.writeText(url).then(
      () => toast("Share link copied to clipboard"),
      () => prompt("Copy this link:", url)
    );
  } else if (action === "reset") {
    if (confirm("Erase all wheels, counters and settings?")) {
      store.resetAll();
      location.reload();
    }
  }
});
$("#importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { store.importAll(reader.result); location.reload(); }
    catch { toast("That doesn't look like a SpinDecks backup"); }
  };
  reader.readAsText(file);
});

function download(filename, text) {
  const a = document.createElement("a");
  a.href = "data:application/json;charset=utf-8," + encodeURIComponent(text);
  a.download = filename; a.click();
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- Shared wheel from URL ---------- */
function loadFromHash() {
  const m = location.hash.match(/#w=([^&]+)/);
  if (!m) return;
  try {
    const w = store.decodeWheel(m[1]);
    store.addSharedWheel(w);
    history.replaceState(null, "", location.pathname);
    toast(`Loaded shared wheel: ${w.name}`);
  } catch { /* ignore bad hash */ }
}

/* ---------- Init ---------- */
app.dataset.greenscreen = state.greenScreen ? "true" : "false";
applyGreenLabel();
loadFromHash();
populateWheelSelect();
loadActiveWheelIntoEditor();
initTimer(document);
counters = initCounters(document);
initScores(document, { toast });
initNumbers(document);
initDice(document);
initFirstPlayer(document);
slots = initSlots(document, { soundOn: () => state.soundOn });
support = initSupport(document, { toast });
initImages(document, {
  getLabels: () => parseEntries(store.activeWheel().text).map((s) => s.label),
  getMap: () => (store.activeWheel().images ||= {}),
  persist: () => store.save(),
  onChange: () => refreshWheel(),
  toast,
});
initGroups(document, {
  getWheelText: () => store.activeWheel().text,
  onSendTeams: (teams) => {
    // Turn each team into its own saved wheel, then jump to the Wheel view.
    teams.forEach((t) => {
      const w = store.newWheel(t.name);
      w.text = t.members.join("\n");
    });
    store.save();
    populateWheelSelect();
    loadActiveWheelIntoEditor();
    navigate("wheel", true);
    toast(`Created ${teams.length} wheel${teams.length === 1 ? "" : "s"} — one per team`);
  },
});

// Activate whichever view this page loaded as (generator set #app data-view).
showView(INITIAL_VIEW);
