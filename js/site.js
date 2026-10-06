// site.js — lightweight bootstrap for the hub and legal pages (which don't load
// the full app.js). Wires the theme toggle and mounts the optional Account UI so
// people can sign in and go premium from the landing page.
import { getState, save } from "./storage.js?v=20260916u";
import { initAccount } from "./account.js?v=20260916u";

const state = getState();
const applyTheme = () => { document.documentElement.dataset.theme = state.theme || "dark"; };
applyTheme();

const toggle = document.querySelector("#themeToggle");
if (toggle) toggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme(); save();
});

// A minimal toast (the hub has no #toast element of its own).
let toastTimer;
function toast(msg) {
  let t = document.querySelector("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

initAccount(document, { toast });
