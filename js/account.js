// account.js — optional SpinDecks accounts, premium and cloud sync.
// Everything here is ADDITIVE: signed out, the app behaves exactly as before
// (local-only, offline, no tracking). Signed in, you can unlock premium with a
// code and back your whole SpinDecks library up to your account and restore it
// on any device.
import { el } from "./quizkit.js?v=20260916o";
import { exportAll, importAll } from "./storage.js?v=20260916o";
import * as supa from "./supa.js?v=20260916o";

const AUTOSYNC_KEY = "spindeck.supa.autosync";
let toast = () => {};
let profile = null;      // { plan, premium_since, branding }
let user = null;         // auth user
let modal = null;
let pushTimer = null;

export const isPremium = () => !!(profile && profile.plan === "premium");
const autoSyncOn = () => { try { return localStorage.getItem(AUTOSYNC_KEY) !== "off"; } catch { return true; } };
const setAutoSync = (on) => { try { localStorage.setItem(AUTOSYNC_KEY, on ? "on" : "off"); } catch {} };

function setPlanAttr() {
  document.documentElement.dataset.plan = isPremium() ? "premium" : (user ? "free" : "guest");
}

export async function initAccount(doc, opts = {}) {
  toast = opts.toast || (() => {});
  if (!supa.enabled) return; // no backend configured → stay purely local

  // 1. Returning from a magic link? Capture the session.
  const justSignedIn = supa.handleRedirect();

  // 2. Add the header button (topbar only).
  const actions = doc.querySelector(".topbar-actions");
  let btn = doc.querySelector("#accountBtn");
  if (!btn && actions) {
    btn = el("button", "icon-btn", "");
    btn.id = "accountBtn"; btn.title = "Account"; btn.setAttribute("aria-label", "Account");
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>`;
    actions.insertBefore(btn, actions.firstChild);
  }
  if (btn) btn.addEventListener("click", openModal);

  // 3. Restore any existing session (never let a network hiccup break the app).
  if (supa.isSignedIn()) {
    try {
      user = supa.getSession().user || (await supa.fetchUser());
      if (user) profile = await supa.getProfile();
    } catch { /* offline or transient — stay in local mode */ }
  }
  setPlanAttr();
  updateBtn();
  if (justSignedIn) { toast("Signed in ✓"); openModal(); }

  // 4. Auto-sync local changes to the cloud (premium only).
  window.addEventListener("spindeck:saved", () => {
    if (!isPremium() || !autoSyncOn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToCloud, 4000);
  });
  window.addEventListener("pagehide", () => { if (isPremium() && autoSyncOn()) pushToCloud(); });
}

function updateBtn() {
  const btn = document.querySelector("#accountBtn");
  if (!btn) return;
  btn.classList.toggle("is-premium", isPremium());
  btn.classList.toggle("is-in", !!user);
}

/* ---------- cloud sync ---------- */

async function pushToCloud() {
  if (!isPremium()) return false;
  try {
    const data = JSON.parse(exportAll());
    const ok = await supa.putCloudState(data);
    return ok;
  } catch { return false; }
}

async function restoreFromCloud() {
  const row = await supa.getCloudState();
  if (!row || !row.data) { toast("No cloud backup yet"); return; }
  if (!confirm("Replace the data on this device with your cloud backup? This can't be undone.")) return;
  try {
    importAll(JSON.stringify(row.data));
    toast("Restored from cloud — reloading…");
    setTimeout(() => location.reload(), 700);
  } catch { toast("Couldn't read the cloud backup"); }
}

/* ---------- modal UI ---------- */

function ensureModal() {
  if (modal) return modal;
  modal = el("div", "modal");
  modal.id = "accountModal";
  modal.hidden = true;
  modal.innerHTML = `<div class="modal-card account-card" role="dialog" aria-modal="true" aria-labelledby="accTitle">
      <div class="images-head">
        <h2 id="accTitle">Account</h2>
        <button class="icon-btn" data-acc="close" aria-label="Close">✕</button>
      </div>
      <div class="account-body"></div>
    </div>`;
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.dataset.acc === "close") modal.hidden = true; });
  (document.querySelector("#app") || document.body).appendChild(modal);
  return modal;
}

function openModal() {
  ensureModal();
  renderBody();
  modal.hidden = false;
}

function renderBody() {
  const body = modal.querySelector(".account-body");
  body.innerHTML = "";
  if (!user) return renderSignedOut(body);
  return renderSignedIn(body);
}

function renderSignedOut(body) {
  body.appendChild(el("p", "muted", "Sign in to unlock premium and save your wheels, quiz sets and dojo leaderboards to your account — then restore them on any device. It stays free and offline without an account."));
  const form = el("div", "account-form");
  const email = el("input", "dojo-input"); email.type = "email"; email.placeholder = "you@school.org"; email.autocomplete = "email";
  const send = el("button", "btn primary", "Email me a sign-in link");
  const note = el("p", "muted account-note"); note.hidden = true;
  const doSend = async () => {
    const v = email.value.trim();
    if (!/.+@.+\..+/.test(v)) { email.focus(); return; }
    send.disabled = true; send.textContent = "Sending…";
    try {
      await supa.signInWithEmail(v, location.origin + location.pathname);
      note.hidden = false; note.textContent = "Check your inbox for a sign-in link, then open it on this device.";
    } catch (e) {
      note.hidden = false; note.textContent = e.message || "Couldn't send the email.";
    }
    send.disabled = false; send.textContent = "Email me a sign-in link";
  };
  send.addEventListener("click", doSend);
  email.addEventListener("keydown", (e) => { if (e.key === "Enter") doSend(); });
  form.append(email, send);
  body.append(form, note);
}

function renderSignedIn(body) {
  const head = el("div", "account-status");
  head.innerHTML = `<span class="account-email">${escapeHtml(user.email || "Signed in")}</span>
    <span class="plan-badge ${isPremium() ? "is-premium" : ""}">${isPremium() ? "Premium" : "Free"}</span>`;
  body.appendChild(head);

  if (isPremium()) {
    body.appendChild(el("p", "muted", "Premium is active. Your data can sync to your account and back."));
    const row = el("div", "account-actions");
    const saveBtn = el("button", "btn primary", "Save to cloud now");
    saveBtn.addEventListener("click", async () => { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; const ok = await pushToCloud(); toast(ok ? "Saved to your account ✓" : "Save failed"); saveBtn.disabled = false; saveBtn.textContent = "Save to cloud now"; });
    const restoreBtn = el("button", "btn", "Restore from cloud");
    restoreBtn.addEventListener("click", restoreFromCloud);
    row.append(saveBtn, restoreBtn);
    body.appendChild(row);

    const auto = el("label", "opt account-auto");
    const cb = el("input"); cb.type = "checkbox"; cb.checked = autoSyncOn();
    cb.addEventListener("change", () => { setAutoSync(cb.checked); toast(cb.checked ? "Auto-sync on" : "Auto-sync off"); });
    auto.append(cb, document.createTextNode(" Auto-save changes to the cloud"));
    body.appendChild(auto);
    showCloudInfo(body);
  } else {
    body.appendChild(el("p", "muted", "You're on the free plan. Enter an unlock code to switch on premium — cloud sync, higher limits, custom branding and leaderboard history."));
    renderRedeem(body);
  }

  const foot = el("div", "account-foot");
  const out = el("button", "btn ghost", "Sign out");
  out.addEventListener("click", async () => { await supa.signOut(); user = null; profile = null; setPlanAttr(); updateBtn(); renderBody(); toast("Signed out"); });
  foot.appendChild(out);
  body.appendChild(foot);
}

function renderRedeem(body) {
  const form = el("div", "account-form");
  const code = el("input", "dojo-input"); code.placeholder = "Unlock code"; code.autocomplete = "off";
  const go = el("button", "btn primary", "Unlock premium");
  const note = el("p", "muted account-note"); note.hidden = true;
  const doRedeem = async () => {
    const v = code.value.trim();
    if (!v) { code.focus(); return; }
    go.disabled = true; go.textContent = "Checking…";
    try {
      const r = await supa.redeemCode(v);
      note.hidden = false; note.textContent = r.message || (r.ok ? "Premium unlocked!" : "That code didn't work.");
      if (r.ok) { profile = await supa.getProfile(); setPlanAttr(); updateBtn(); toast("Premium unlocked ✓"); setTimeout(renderBody, 900); }
    } catch { note.hidden = false; note.textContent = "Something went wrong — try again."; }
    go.disabled = false; go.textContent = "Unlock premium";
  };
  go.addEventListener("click", doRedeem);
  code.addEventListener("keydown", (e) => { if (e.key === "Enter") doRedeem(); });
  form.append(code, go);
  body.append(form, note);
}

async function showCloudInfo(body) {
  const info = el("p", "muted account-cloudinfo"); info.textContent = "Checking cloud backup…";
  body.appendChild(info);
  try {
    const row = await supa.getCloudState();
    if (row && row.updated_at) info.textContent = "Last cloud backup: " + new Date(row.updated_at).toLocaleString();
    else info.textContent = "No cloud backup yet — use “Save to cloud now”.";
  } catch { info.textContent = ""; }
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
