// bridge.js — connects The Meridian (/high-roller/play/) to SpinDecks accounts.
// The game defines window.HR_HOST before its own scripts run; this fills it in:
// who's signed in, whether they're premium (and the site owner), and how many AI
// chats they have left today. AI chat goes through the highroller-chat Edge Function,
// which holds the Anthropic key. Non-premium visitors are sent back to the teaser page.
import * as supa from "/js/supa.js?v=20261024a";

const H = window.HR_HOST;
const OK_KEY = "spindeck.hr.ok"; // last confirmed premium check, for playing offline
const back = () => location.replace("/high-roller/?from=play");

H.token = () => supa.getAccessToken();
H.ready = (async () => {
  const tok = await supa.getAccessToken().catch(() => null);
  if (!tok) return back();
  let s = null;
  try {
    const res = await fetch(H.chatUrl, { method: "POST", headers: { Authorization: "Bearer " + tok, apikey: H.anon, "Content-Type": "application/json" }, body: JSON.stringify({ kind: "status" }) });
    if (res.ok) s = await res.json();
    else if (res.status === 401) return back();
  } catch {
    // offline: let a recently confirmed premium player keep playing (without AI chat)
    try { const c = JSON.parse(localStorage.getItem(OK_KEY) || "null"); if (c && Date.now() - c.at < 7 * 864e5) s = { premium: true, owner: c.owner, left: 0, cap: c.cap, chat: false, offline: true }; } catch {}
  }
  if (!s || !s.premium) return back();
  Object.assign(H, { pending: false, premium: s.chat !== false && !s.offline, owner: !!s.owner, left: s.left, cap: s.cap });
  if (!s.offline) try { localStorage.setItem(OK_KEY, JSON.stringify({ at: Date.now(), owner: !!s.owner, cap: s.cap })); } catch {}
  // the owner's personal story layer switches on once we know it's them
  if (H.owner && typeof Me !== "undefined" && Me.apply) Me.apply();
})();
