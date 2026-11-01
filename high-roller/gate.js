// gate.js — The Meridian's teaser page: shows the right button for guests, free
// accounts and premium accounts. The account UI itself comes from site.js.
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
render();
new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["data-plan"] });
