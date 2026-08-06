// suggest.js — the footer "what else would you like to see?" box. Posts a
// one-line suggestion to the same no-backend form service as the waitlist.
// Loaded on every page from the footer, so it self-initialises and quietly
// bails when the form isn't on the page.
import { SUPPORT } from "./support.js?v=20260801r";

const form = document.getElementById("suggestForm");
if (form) {
  const input = document.getElementById("suggestText");
  const note = document.getElementById("suggestNote");
  const endpoint = SUPPORT.suggestEndpoint || SUPPORT.waitlistEndpoint;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const suggestion = input.value.trim();
    if (!suggestion) return;

    // Nothing configured — degrade gracefully rather than erroring.
    if (!endpoint) {
      form.hidden = true;
      if (note) { note.hidden = false; note.textContent = "Suggestions open soon — thanks!"; }
      return;
    }

    const btn = form.querySelector("button");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ suggestion, source: "spindecks-suggestion", _subject: "SpinDecks suggestion" }),
      });
      if (!res.ok) throw new Error("bad status");
      form.hidden = true;
      if (note) { note.hidden = false; note.textContent = "Thanks — got it. New ideas go on the list."; }
    } catch {
      btn.disabled = false;
      btn.textContent = original;
      if (note) { note.hidden = false; note.textContent = "Couldn't send just now — please try again."; }
    }
  });
}
