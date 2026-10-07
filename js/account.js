// account.js — optional SpinDecks accounts, premium and cloud sync.
// Everything here is ADDITIVE: signed out, the app behaves exactly as before
// (local-only, offline, no tracking). Signed in, you can unlock premium with a
// code and back your whole SpinDecks library up to your account and restore it
// on any device.
import { el } from "./quizkit.js?v=20260916v";
import { exportAll, importAll } from "./storage.js?v=20260916v";
import * as supa from "./supa.js?v=20260916v";
import { PAYMENTS_ENABLED, PRICE_LABELS, GOOGLE_ENABLED } from "./supa-config.js?v=20260916v";

const AUTOSYNC_KEY = "spindeck.supa.autosync";
const BRAND_KEY = "spindeck.brand";
const PENDING_KEY = "spindeck.pendingUpgrade";
let toast = () => {};
let profile = null;      // { plan, premium_since, branding }
let user = null;         // auth user
let modal = null;
let pushTimer = null;

// The published premium signal: the <html data-plan> attribute. Other modules
// read it (directly or via isPremium) to gate perks — no import of internals.
const planNow = () => (profile && profile.plan === "premium") ? "premium" : (user ? "free" : "guest");
export const isPremium = () => document.documentElement.dataset.plan === "premium";
export const openAccount = () => { ensureModal(); renderBody(); modal.hidden = false; };
// Prompt an upgrade: a toast plus the account modal (used by gated features).
export function upsell(msg) { try { toast(msg); } catch {} openAccount(); }
const autoSyncOn = () => { try { return localStorage.getItem(AUTOSYNC_KEY) !== "off"; } catch { return true; } };
const setAutoSync = (on) => { try { localStorage.setItem(AUTOSYNC_KEY, on ? "on" : "off"); } catch {} };

function setPlanAttr() { document.documentElement.dataset.plan = planNow(); }

/* ---------- custom branding (premium) ---------- */
const readBrand = () => { try { return JSON.parse(localStorage.getItem(BRAND_KEY) || "null"); } catch { return null; } };
const writeBrand = (b) => { try { b ? localStorage.setItem(BRAND_KEY, JSON.stringify(b)) : localStorage.removeItem(BRAND_KEY); } catch {} };
function hexParts(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "")); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(hex, amt) { const p = hexParts(hex); if (!p) return hex; const f = (c) => Math.max(0, Math.min(255, Math.round(c + 255 * amt))); return "#" + p.map((c) => f(c).toString(16).padStart(2, "0")).join(""); }
function contrast(hex) { const p = hexParts(hex); if (!p) return "#fff"; const lum = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255; return lum > 0.6 ? "#231015" : "#fff"; }
export function applyBranding(b) {
  const root = document.documentElement;
  if (b && b.accent && hexParts(b.accent)) {
    root.style.setProperty("--accent", b.accent);
    root.style.setProperty("--accent-press", shade(b.accent, -0.28));
    root.style.setProperty("--accent-ink", contrast(b.accent));
  } else {
    ["--accent", "--accent-press", "--accent-ink"].forEach((v) => root.style.removeProperty(v));
  }
  const name = b && b.name ? String(b.name).trim() : "";
  const logo = b && typeof b.logo === "string" && b.logo.startsWith("data:image/") ? b.logo : "";
  let stamp = document.getElementById("brandStamp");
  if (name || logo) {
    if (!stamp) { stamp = el("div", "brand-stamp"); stamp.id = "brandStamp"; (document.querySelector("#app") || document.body).appendChild(stamp); }
    stamp.innerHTML = (logo ? `<img class="brand-stamp-logo" alt="" src="${logo}">` : "") + (name ? `<span class="brand-stamp-name">${escapeHtml(name)}</span>` : "");
  } else if (stamp) { stamp.remove(); }
}

// Shrink an uploaded image to a small square-ish logo and return a data URL.
function resizeImage(file, maxDim = 160) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      let out = c.toDataURL("image/png");
      if (out.length > 60000) out = c.toDataURL("image/jpeg", 0.82); // keep it small for the profile row
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

export async function initAccount(doc, opts = {}) {
  toast = opts.toast || (() => {});
  if (!supa.enabled) return; // no backend configured → stay purely local

  // 0. Apply any cached branding instantly (before the network round-trip).
  applyBranding(readBrand());

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

  // Any element flagged data-open-account (e.g. the Pro modal's upgrade button)
  // opens the account modal.
  doc.querySelectorAll("[data-open-account]").forEach((elx) => elx.addEventListener("click", () => {
    const sm = doc.querySelector("#supportModal"); if (sm) sm.hidden = true;
    openModal();
  }));

  // 3. Restore any existing session (never let a network hiccup break the app).
  if (supa.isSignedIn()) {
    try {
      user = supa.getSession().user || (await supa.fetchUser());
      if (user) profile = await supa.getProfile();
      // Sync branding from the account onto this device.
      if (profile && profile.branding && Object.keys(profile.branding).length) {
        writeBrand(profile.branding); applyBranding(profile.branding);
      }
    } catch { /* offline or transient — stay in local mode */ }
  }
  setPlanAttr();
  updateBtn();
  if (justSignedIn) { toast("Signed in ✓"); openModal(); }

  // If they picked a plan before signing in, carry on to checkout now.
  maybeResumeUpgrade();

  // Returned from Stripe Checkout? The webhook grants premium server-side; poll
  // the profile briefly so the UI catches up.
  const sp = new URLSearchParams(location.search);
  if (sp.get("upgrade")) {
    try { history.replaceState(null, "", location.pathname); } catch {}
    if (sp.get("upgrade") === "success") {
      toast("Payment received — activating premium…");
      const refresh = async () => { try { profile = await supa.getProfile(); setPlanAttr(); updateBtn(); if (isPremium()) toast("Premium active ✓"); } catch {} };
      setTimeout(refresh, 3000); setTimeout(refresh, 9000);
    }
  }

  // 4. Auto-sync local changes to the cloud (premium only).
  window.addEventListener("spindeck:saved", () => {
    if (!isPremium() || !autoSyncOn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToCloud, 4000);
  });
  window.addEventListener("pagehide", () => { if (isPremium() && autoSyncOn()) pushToCloud(); });
}

// Resume a pre-sign-in plan choice: send the now-signed-in free user to checkout.
async function maybeResumeUpgrade() {
  let plan = null; try { plan = localStorage.getItem(PENDING_KEY); } catch {}
  if (!plan) return;
  if (!PAYMENTS_ENABLED || !user || isPremium()) { try { localStorage.removeItem(PENDING_KEY); } catch {} return; }
  try { localStorage.removeItem(PENDING_KEY); } catch {}
  try { toast("Taking you to checkout…"); const { url } = await supa.createCheckout(plan); location.href = url; }
  catch (e) { toast(e.message || "Couldn't start checkout"); }
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
  // Show the premium offer up front. Buying needs an account (so the purchase
  // can be tied to it), so a plan click stashes the choice and starts sign-in;
  // we resume straight to checkout once they're back (see maybeResumeUpgrade).
  if (PAYMENTS_ENABLED) {
    const up = el("div", "account-upgrade account-upsell");
    up.appendChild(el("p", "account-subhead", "Go Premium"));
    up.appendChild(el("p", "muted account-note", `Cloud sync, unlimited saved wheels & sets, custom branding and leaderboard export — ${PRICE_LABELS.monthly} or ${PRICE_LABELS.lifetime}.`));
    const row = el("div", "account-actions");
    const m = el("button", "btn primary", `Monthly — ${PRICE_LABELS.monthly}`);
    const l = el("button", "btn", `Lifetime — ${PRICE_LABELS.lifetime}`);
    const hint = el("p", "muted account-note"); hint.hidden = true;
    const startBuy = (plan) => {
      try { localStorage.setItem(PENDING_KEY, plan); } catch {}
      hint.hidden = false; hint.textContent = "Pop your email in below and open the sign-in link — we'll take you straight to checkout.";
      const em = modal.querySelector(".account-form input[type=email]"); if (em) em.focus();
    };
    m.addEventListener("click", () => startBuy("monthly"));
    l.addEventListener("click", () => startBuy("lifetime"));
    row.append(m, l); up.append(row, hint);
    up.appendChild(el("p", "account-or muted", "— sign in to continue —"));
    body.appendChild(up);
  }
  body.appendChild(el("p", "muted", "Sign in to unlock premium and save your wheels, quiz sets and dojo leaderboards to your account — then restore them on any device. It stays free and offline without an account."));
  if (GOOGLE_ENABLED) {
    const g = el("button", "btn account-google", "Continue with Google");
    g.addEventListener("click", () => supa.signInWithGoogle(location.origin + location.pathname));
    body.appendChild(g);
    body.appendChild(el("p", "account-or muted", "— or with email —"));
  }
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
    const since = profile && profile.premium_since ? new Date(profile.premium_since) : null;
    const thanks = el("p", "account-thanks");
    thanks.innerHTML = `<b>★ Premium</b> — thank you for supporting SpinDecks${since && !isNaN(since.getTime()) ? `, a member since ${since.toLocaleDateString()}` : ""}.`;
    body.appendChild(thanks);
    body.appendChild(el("p", "muted", "Your data syncs to your account, and donation prompts are off."));
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
    if (PAYMENTS_ENABLED) {
      const billing = el("button", "btn ghost account-billing", "Manage billing");
      billing.title = "Update your card or cancel";
      billing.addEventListener("click", async () => {
        billing.disabled = true; const t = billing.textContent; billing.textContent = "Opening…";
        try { const { url } = await supa.createPortal(); location.href = url; }
        catch (e) { toast(e.message || "Couldn't open billing"); billing.disabled = false; billing.textContent = t; }
      });
      body.appendChild(billing);
    }
    renderBranding(body);
  } else {
    body.appendChild(el("p", "muted", "You're on the free plan. Go premium for cloud sync, unlimited saved wheels & sets, custom branding and leaderboard export."));
    if (PAYMENTS_ENABLED) renderUpgrade(body);
    renderRedeem(body);
  }

  const foot = el("div", "account-foot");
  const out = el("button", "btn ghost", "Sign out");
  out.addEventListener("click", async () => { await supa.signOut(); user = null; profile = null; setPlanAttr(); updateBtn(); renderBody(); toast("Signed out"); });
  foot.appendChild(out);
  body.appendChild(foot);
}

function renderBranding(body) {
  const b = readBrand() || {};
  const wrap = el("div", "account-brand");
  wrap.appendChild(el("p", "account-subhead", "Custom branding"));
  wrap.appendChild(el("p", "muted account-note", "Set an accent colour and a name that shows on screen in fullscreen — great for classes and streams."));
  wrap.appendChild(el("p", "muted account-note", "Add a logo too — it shows with your name on screen in fullscreen."));
  const row = el("div", "account-form");
  const colour = el("input", "account-colour"); colour.type = "color"; colour.value = /^#[0-9a-f]{6}$/i.test(b.accent || "") ? b.accent : "#ff5b52";
  const name = el("input", "dojo-input"); name.placeholder = "Brand / class name (optional)"; name.maxLength = 40; name.value = b.name || "";
  row.append(colour, name);

  // Logo upload (resized client-side, stored in the profile).
  let currentLogo = typeof b.logo === "string" ? b.logo : "";
  const logoRow = el("div", "account-logo-row");
  const preview = el("img", "account-logo-preview"); if (currentLogo) preview.src = currentLogo; else preview.style.display = "none";
  const pick = el("label", "btn ghost account-logo-btn", "Add logo");
  const file = el("input"); file.type = "file"; file.accept = "image/*"; file.className = "account-logo-file";
  pick.appendChild(file);
  const rmLogo = el("button", "btn ghost", "Remove logo"); if (!currentLogo) rmLogo.style.display = "none";
  file.addEventListener("change", async () => {
    const f = file.files && file.files[0]; if (!f) return;
    try { currentLogo = await resizeImage(f); preview.src = currentLogo; preview.style.display = ""; rmLogo.style.display = ""; toast("Logo ready — tap Apply & save"); }
    catch { toast("Couldn't read that image"); }
    file.value = "";
  });
  rmLogo.addEventListener("click", () => { currentLogo = ""; preview.removeAttribute("src"); preview.style.display = "none"; rmLogo.style.display = "none"; });
  logoRow.append(pick, preview, rmLogo);

  const btns = el("div", "account-actions");
  const apply = el("button", "btn primary", "Apply & save");
  apply.addEventListener("click", async () => {
    const nb = { accent: colour.value, name: name.value.trim() };
    if (currentLogo) nb.logo = currentLogo;
    writeBrand(nb); applyBranding(nb);
    apply.disabled = true; try { await supa.saveBranding(nb); } catch {} apply.disabled = false;
    toast("Branding applied ✓");
  });
  const reset = el("button", "btn ghost", "Reset");
  reset.addEventListener("click", async () => {
    currentLogo = ""; writeBrand(null); applyBranding(null); colour.value = "#ff5b52"; name.value = "";
    preview.removeAttribute("src"); preview.style.display = "none"; rmLogo.style.display = "none";
    try { await supa.saveBranding({}); } catch {}
    toast("Branding reset");
  });
  btns.append(apply, reset);
  wrap.append(row, logoRow, btns);
  body.appendChild(wrap);
}

function renderUpgrade(body) {
  const wrap = el("div", "account-upgrade");
  const row = el("div", "account-actions");
  const monthly = el("button", "btn primary", `Go Premium — ${PRICE_LABELS.monthly}`);
  const lifetime = el("button", "btn", `Lifetime — ${PRICE_LABELS.lifetime}`);
  const note = el("p", "muted account-note"); note.hidden = true;
  const buy = async (plan, b) => {
    const label = b.textContent; b.disabled = true; b.textContent = "Starting checkout…";
    try { const { url } = await supa.createCheckout(plan); location.href = url; }
    catch (e) { note.hidden = false; note.textContent = e.message || "Couldn't start checkout."; b.disabled = false; b.textContent = label; }
  };
  monthly.addEventListener("click", () => buy("monthly", monthly));
  lifetime.addEventListener("click", () => buy("lifetime", lifetime));
  row.append(monthly, lifetime);
  wrap.append(row, note, el("p", "muted account-note", "Secure checkout by Stripe. Cancel anytime."));
  body.appendChild(wrap);
  body.appendChild(el("p", "account-or muted", "— or —"));
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
