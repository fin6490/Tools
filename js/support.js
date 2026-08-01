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
  const waitForm = root.querySelector("#waitForm");
  const waitEmail = root.querySelector("#waitEmail");
  const waitNote = root.querySelector("#waitNote");

  // Tip jar: only show when a link is configured.
  if (SUPPORT.tipUrl) {
    tipBtn.href = SUPPORT.tipUrl;
    tipBtn.target = "_blank";
    tipBtn.rel = "noopener";
    tipBlock.hidden = false;
  }

  // Waitlist: real submit when an endpoint exists, mailto fallback, else "coming soon".
  const canPost = !!SUPPORT.waitlistEndpoint;
  const canMail = !SUPPORT.waitlistEndpoint && !!SUPPORT.contactEmail;
  if (!canPost && !canMail) {
    waitForm.hidden = true;
    waitNote.hidden = false;
    waitNote.textContent = "The Pro waitlist opens soon — check back shortly.";
  }

  waitForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = waitEmail.value.trim();
    if (!email) return;

    if (canMail) {
      const subject = encodeURIComponent("SpinDecks Pro waitlist");
      const body = encodeURIComponent(`Please add me to the SpinDecks Pro waitlist: ${email}`);
      window.location.href = `mailto:${SUPPORT.contactEmail}?subject=${subject}&body=${body}`;
      return;
    }

    const btn = waitForm.querySelector("button");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      const res = await fetch(SUPPORT.waitlistEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, source: "spindeck-pro-waitlist" }),
      });
      if (!res.ok) throw new Error("bad status");
      waitForm.hidden = true;
      waitNote.hidden = false;
      waitNote.textContent = "You're on the list — thanks! We'll email you when Pro lands.";
    } catch {
      btn.disabled = false;
      btn.textContent = original;
      toast?.("Couldn't join the waitlist just now — please try again.");
    }
  });

  function open() {
    supportModal.hidden = false;
    (waitForm.hidden ? supportModal.querySelector("#supportClose") : waitEmail).focus();
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
