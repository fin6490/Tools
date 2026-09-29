// support.js — PWA install prompt, the "SpinDecks Pro" waitlist, and a tip jar.
// All zero-backend: the waitlist posts to a form service you own (e.g. Formspree)
// and the tip jar just links out to Ko-fi / Buy Me a Coffee / PayPal. Fill in the
// three values below to switch each feature on — until then the UI stays tidy
// (unconfigured actions simply show a friendly "coming soon" instead of breaking).
export const SUPPORT = {
  // Tip jar: paste a Ko-fi / Buy Me a Coffee / PayPal.me link to enable the button.
  // e.g. "https://ko-fi.com/spindeck"
  tipUrl: "https://ko-fi.com/spindecks",

  // Waitlist: paste a form endpoint that accepts a POST (Formspree, Getform, Basin…)
  // e.g. "https://formspree.io/f/abcdwxyz". Collects emails with no backend of your own.
  waitlistEndpoint: "https://formspree.io/f/xzdnlkjp",

  // Optional fallback: if there's no endpoint above, a contact email here turns the
  // waitlist button into a pre-filled mailto. Leave blank to just show "coming soon".
  contactEmail: "",

  // Footer "what else would you like to see?" box. Defaults to the waitlist
  // endpoint so it works with no extra setup; point it at a separate form if
  // you'd rather keep suggestions out of the waitlist inbox.
  suggestEndpoint: "",

  // The BT Dojo "type a topic → generate" feature. Paste the URL of the
  // Cloudflare Worker (or other proxy) that holds your Anthropic key and calls
  // Claude Haiku — see serverless/README.md for the 5-minute deploy. Until this
  // is set, the Dojo's Generate button explains it isn't switched on yet.
  // e.g. "https://bt-dojo-generate.<you>.workers.dev"
  dojoGenerateEndpoint: "https://bt-doj-generate.fin6490.workers.dev",
  // Optional light gate: if your Worker sets DOJO_TOKEN, put the same value here
  // so the site's requests carry it. (It's still public in the page — the real
  // protections are the Worker's origin check, output cap, and a Cloudflare
  // rate-limit rule; see the README.)
  dojoGenerateToken: "",
};

export function initSupport(root, { toast } = {}) {
  /* ---------- Install (PWA) ---------- */
  let deferredPrompt = null;
  const installBtn = root.querySelector("#installBtn");
  const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // stop Chrome's mini-infobar; we drive the prompt ourselves
    deferredPrompt = e;
    if (installBtn && !isStandalone()) installBtn.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
    toast?.("Installed — find SpinDecks on your home screen");
  });

  async function install() {
    if (!deferredPrompt) {
      toast?.(isStandalone() ? "Already installed" : "Use your browser's Install / Add to Home Screen");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
  }

  /* ---------- Support / Pro modal ---------- */
  const supportModal = root.querySelector("#supportModal");
  const tipBlock = root.querySelector("#tipBlock");
  const tipBtn = root.querySelector("#tipBtn");

  // Tip jar: only show when a link is configured.
  if (SUPPORT.tipUrl) {
    tipBtn.href = SUPPORT.tipUrl;
    tipBtn.target = "_blank";
    tipBtn.rel = "noopener";
    tipBlock.hidden = false;
  }

  // Top-bar "Buy me a coffee" CTA — same link, revealed only when configured.
  const tipTop = root.querySelector("#tipTopBtn");
  if (tipTop && SUPPORT.tipUrl) {
    tipTop.href = SUPPORT.tipUrl;
    tipTop.hidden = false;
  }

  // Upgrading now happens in the Account modal (account.js wires the
  // [data-open-account] button inside this modal).

  function open() {
    supportModal.hidden = false;
    supportModal.querySelector("#supportClose").focus();
  }
  function close() {
    supportModal.hidden = true;
  }
  root.querySelector("#supportClose").addEventListener("click", close);
  supportModal.addEventListener("click", (e) => {
    if (e.target === supportModal) close();
  });

  return { open, close, install, isOpen: () => !supportModal.hidden };
}
