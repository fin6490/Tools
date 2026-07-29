// groups.js — split a list of names into random, balanced teams.
import { getState, save } from "./storage.js?v=20260730a";

// Drop a trailing "*N" weight so wheel entries load cleanly as one person each.
const stripWeight = (line) => line.replace(/\s*\*\s*\d+\s*$/, "").trim();

function readNames(text) {
  return text.split("\n").map(stripWeight).filter(Boolean);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Round-robin deal into `count` buckets → sizes differ by at most 1 (balanced).
function partition(names, count) {
  const buckets = Array.from({ length: count }, () => []);
  shuffle(names).forEach((n, i) => buckets[i % count].push(n));
  return buckets;
}

export function initGroups(root, { getWheelText, onSendTeams } = {}) {
  const ta = root.querySelector("#groupNames");
  const numInput = root.querySelector("#groupNum");
  const numLabel = root.querySelector("#groupNumLabel");
  const modeBtns = root.querySelectorAll("[data-group-mode]");
  const makeBtn = root.querySelector("#makeGroups");
  const grid = root.querySelector("#groupsGrid");
  const resultHead = root.querySelector(".groups-result-head");
  const summary = root.querySelector("#groupsSummary");
  const copyBtn = root.querySelector("#copyGroups");
  const sendBtn = root.querySelector("#sendToWheels");

  const state = getState();
  if (!state.groups) state.groups = { text: "", mode: "count", num: 4 };
  const g = state.groups;

  ta.value = g.text || "";
  numInput.value = g.num || 4;
  applyMode(g.mode || "count");

  function applyMode(mode) {
    g.mode = mode;
    modeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.groupMode === mode));
    numLabel.textContent = mode === "count" ? "How many teams?" : "People per team?";
  }

  modeBtns.forEach((b) =>
    b.addEventListener("click", () => { applyMode(b.dataset.groupMode); save(); })
  );
  ta.addEventListener("input", () => { g.text = ta.value; save(); });
  numInput.addEventListener("input", () => {
    g.num = Math.max(1, Number(numInput.value) || 1);
    save();
  });

  root.querySelector("#loadFromWheel").addEventListener("click", () => {
    const text = getWheelText ? getWheelText() : "";
    ta.value = readNames(text).join("\n");
    g.text = ta.value;
    save();
  });

  function make() {
    const names = readNames(ta.value);
    if (names.length < 2) {
      grid.innerHTML = "";
      resultHead.hidden = true;
      summary.textContent = "";
      grid.appendChild(note("Add at least 2 names to make teams."));
      return;
    }
    const num = Math.max(1, Number(numInput.value) || 1);
    // Both modes reduce to "how many buckets", then deal evenly.
    const count = g.mode === "count" ? Math.min(num, names.length) : Math.ceil(names.length / num);
    render(partition(names, count), `${names.length} names → ${count} team${count === 1 ? "" : "s"}`);
  }

  function note(msg) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = msg;
    return p;
  }

  function render(buckets, summaryText) {
    grid.innerHTML = "";
    summary.textContent = summaryText;
    resultHead.hidden = false;
    buckets.forEach((members, i) => {
      const card = document.createElement("div");
      card.className = "counter-card group-card";

      const name = document.createElement("input");
      name.className = "c-name";
      name.value = `Team ${i + 1}`;
      name.setAttribute("aria-label", "Team name");

      const count = document.createElement("div");
      count.className = "muted group-count";
      count.textContent = `${members.length} ${members.length === 1 ? "member" : "members"}`;

      const ul = document.createElement("ul");
      ul.className = "group-members";
      members.forEach((m) => {
        const li = document.createElement("li");
        li.textContent = m;
        ul.appendChild(li);
      });

      card.append(name, count, ul);
      grid.appendChild(card);
    });
  }

  makeBtn.addEventListener("click", make);
  root.querySelector("#rerollGroups").addEventListener("click", make);

  // Read the (possibly renamed) teams currently on screen.
  function currentTeams() {
    return Array.from(grid.querySelectorAll(".group-card")).map((c) => ({
      name: c.querySelector(".c-name").value.trim() || "Team",
      members: Array.from(c.querySelectorAll("li")).map((li) => li.textContent),
    }));
  }

  function flash(btn, label) {
    const original = btn.textContent;
    btn.textContent = label;
    setTimeout(() => { btn.textContent = original; }, 1500);
  }

  copyBtn.addEventListener("click", () => {
    const teams = currentTeams();
    if (!teams.length) return;
    const text = teams
      .map((t) => `${t.name}\n${t.members.map((m) => "  - " + m).join("\n")}`)
      .join("\n\n");
    navigator.clipboard?.writeText(text);
    flash(copyBtn, "✓ Copied");
  });

  sendBtn.addEventListener("click", () => {
    const teams = currentTeams();
    if (!teams.length || !onSendTeams) return;
    onSendTeams(teams);
    flash(sendBtn, "✓ Sent");
  });
}
