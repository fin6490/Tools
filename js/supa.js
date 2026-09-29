// supa.js — a tiny, dependency-free Supabase client for SpinDecks.
// Just fetch() against the Auth (GoTrue), REST (PostgREST) and RPC endpoints —
// no SDK, in keeping with the project's zero-deps rule. Only what we need:
// email magic-link sign-in, session persistence/refresh, and a few table calls.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED } from "./supa-config.js?v=20260916q";

const SESSION_KEY = "spindeck.supa.session";
let session = load();

function load() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function store(s) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export const enabled = SUPABASE_ENABLED;
export const getSession = () => session;
export const isSignedIn = () => !!(session && session.access_token);

// Keep the session shape small: access_token, refresh_token, and an absolute
// expiry (ms) so we can refresh proactively.
function saveTokens(t) {
  if (!t || !t.access_token) return null;
  const expires_at = Date.now() + (Number(t.expires_in || 3600) - 60) * 1000;
  const s = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at, user: t.user || null };
  store(s);
  return s;
}

async function refresh() {
  if (!session || !session.refresh_token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!res.ok) { store(null); return null; }
  return saveTokens(await res.json());
}

async function accessToken() {
  if (!session) return null;
  if (session.expires_at && Date.now() > session.expires_at) await refresh();
  return session ? session.access_token : null;
}

function authHeaders(token) {
  const h = { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// A REST/RPC call as the signed-in user, retrying once after a token refresh.
async function apiFetch(path, { method = "GET", body, headers = {}, retry = true } = {}) {
  const token = await accessToken();
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { ...authHeaders(token), ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && retry && session) { await refresh(); return apiFetch(path, { method, body, headers, retry: false }); }
  return res;
}

/* ---------- auth ---------- */

// Send a magic link. The email link returns to `redirectTo` with tokens in the
// URL hash, which handleRedirect() picks up on the next page load.
export async function signInWithEmail(email, redirectTo) {
  const q = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp${q}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!res.ok) { let m = "Couldn't send the sign-in email."; try { m = (await res.json()).msg || (await res.json()).error_description || m; } catch {} throw new Error(m); }
  return true;
}

// If we've just come back from a magic link, capture the tokens from the hash.
export function handleRedirect() {
  const h = location.hash || "";
  if (!/access_token=/.test(h)) return false;
  const p = new URLSearchParams(h.replace(/^#/, ""));
  const access_token = p.get("access_token");
  if (!access_token) return false;
  saveTokens({
    access_token,
    refresh_token: p.get("refresh_token"),
    expires_in: p.get("expires_in"),
  });
  // Clean the tokens out of the URL.
  try { history.replaceState(null, "", location.pathname + location.search); } catch {}
  return true;
}

export async function fetchUser() {
  const token = await accessToken();
  if (!token) return null;
  const res = await apiFetch("/auth/v1/user");
  if (!res.ok) return null;
  const u = await res.json();
  if (session) { session.user = u; store(session); }
  return u;
}

export async function signOut() {
  try { await apiFetch("/auth/v1/logout", { method: "POST" }); } catch {}
  store(null);
}

/* ---------- profile / plan ---------- */

export async function getProfile() {
  const res = await apiFetch("/rest/v1/profiles?select=plan,premium_since,branding&limit=1");
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export async function saveBranding(branding) {
  const uid = session && session.user && session.user.id;
  if (!uid) throw new Error("Not signed in");
  const res = await apiFetch(`/rest/v1/profiles?id=eq.${uid}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: { branding, updated_at: new Date().toISOString() },
  });
  return res.ok;
}

// Start a Stripe Checkout session via the Edge Function; returns { url }.
export async function createCheckout(plan) {
  const res = await apiFetch("/functions/v1/create-checkout", { method: "POST", body: { plan, origin: location.origin } });
  let data = {}; try { data = await res.json(); } catch {}
  if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start checkout.");
  return data;
}

export async function redeemCode(code) {
  const res = await apiFetch("/rest/v1/rpc/redeem_premium_code", { method: "POST", body: { p_code: code } });
  if (!res.ok) { try { return await res.json(); } catch { return { ok: false, message: "Redeem failed." }; } }
  return await res.json();
}

/* ---------- cloud state (whole SpinDecks blob) ---------- */

export async function getCloudState() {
  const res = await apiFetch("/rest/v1/user_state?select=data,updated_at&limit=1");
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null; // { data, updated_at } or null
}

export async function putCloudState(data) {
  const uid = session && session.user && session.user.id;
  if (!uid) throw new Error("Not signed in");
  const res = await apiFetch("/rest/v1/user_state", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: { user_id: uid, data, updated_at: new Date().toISOString() },
  });
  return res.ok;
}
