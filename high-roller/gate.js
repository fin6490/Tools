// gate.js — The Meridian's teaser page. High Roller is owner-only, so anyone
// who isn't the signed-in site owner is sent back to the home page; the owner
// sees the normal Play / sign-in CTA. Owner status is decided server-side
// (highroller-chat Edge Function), so no owner email ships in the browser.
import { isSiteOwner } from "/js/supa.js?v=20261117b";

const cta = document.querySelector("#hrCta");
const note = document.querySelector("#hrNote");
const render = () => {
  const plan = document.documentElement.dataset.plan || "guest";
  cta.innerHTML = "";
  const btn = document.createElement(plan === "premium" ? "a" : "button");
  btn.className = "btn primary hr-cta-btn";
  if (plan === "premium") { btn.href = "/high-roller/play/"; btn.textContent = "Play The Meridian"; note.textContent = "Premium is active. Your saves stay on this device."; }
  else {
    btn.type = "button";
    btn.textContent = plan === "free" ? "Go Premium to play" : "Sign in to play";
    note.textContent = plan === "free" ? "The Meridian is included with SpinDecks Premium, along with cloud sync and custom branding." : "Sign in with your email, then go Premium to unlock The Meridian.";
    btn.addEventListener("click", () => document.querySelector("#accountBtn")?.click());
  }
  cta.appendChild(btn);
  if (new URLSearchParams(location.search).get("from") === "play" && plan !== "premium") note.textContent = "The Meridian needs a SpinDecks Premium account. " + note.textContent;
};

// Only the owner may see this page; everyone else goes home.
isSiteOwner().then((owner) => {
  if (!owner) { location.replace("/"); return; }
  render();
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["data-plan"] });
}).catch(() => location.replace("/"));
