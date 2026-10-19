// elf.js — The Great Elf Game: a print-and-play Christmas accounting game.
//  • Run a Christmas-tree business over the 24 days of advent with a team of elves.
//  • Each day send elves to the Nearby Woods (£10/tree, always), the Faraway
//    Forest (£20, but £0 in a blizzard) and — once the Mountain Pass opens on
//    the 17th — the Forest Far Beyond (£50, but a blizzard loses those elves).
//  • Weather is a d6: 1–4 sunny, 5–6 blizzard (a 1/3 chance of a blizzard).
//  • Event cards fire on a timetable: Mutiny, the Tax Man, the Christmas
//    Lottery, the Mountain Pass, elves off the back of a truck / by Amazon
//    drone, and the Moment of Truth. A deck of random surprise cards spices
//    things up, and Biscoes Bank lends to anyone who loses all their elves.
//  • Teacher plays along on a live accounts spreadsheet; each pupil fills a
//    printed sheet. Biggest running total wins.
// Reuses the lobster-* styling for a consistent print-and-play look. Zero deps.
import { el } from "./quizkit.js?v=20261019e";
import { getState, save } from "./storage.js?v=20261019e";
import * as sound from "./sound.js?v=20261019e";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };

/* ---------- icons ---------- */
const IC = {
  sun:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>',
  snow:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19M12 5l-2.5 2.5M12 5l2.5 2.5M12 19l-2.5-2.5M12 19l2.5-2.5M5 12l2.5-2.5M5 12l2.5 2.5M19 12l-2.5-2.5M19 12l-2.5 2.5"/></svg>',
  tree:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L6 11h3l-4 6h14l-4-6h3L12 3Z"/><path d="M11 17v4h2v-4"/></svg>',
  elf:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l5 5h-10l5-5Z"/><circle cx="12" cy="14" r="4"/><path d="M8 21c0-2 1.8-3 4-3s4 1 4 3"/></svg>',
  coin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.2a2.4 2.4 0 0 1 4.2.3M14.5 14.8a2.4 2.4 0 0 1-4.2-.3"/></svg>',
  dice:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/></svg>',
  ticket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M12 6v2M12 11v2M12 16v2"/></svg>',
  tax:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 20V8l8-5 8 5v12M4 20h16M9 20v-5h6v5"/></svg>',
  mountain:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 19h18L14 6l-3 5-2-3-6 11Z"/></svg>',
  flag:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 3 2 3H5"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
  drone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h4M16 6h4M6 6v2M18 6v2M9 10h6l1 4H8l1-4ZM10 14v3h4v-3M9 20h6"/></svg>',
  gift:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 11h16v9H4zM4 7h16v4H4zM12 7v13M12 7S10 3 8 4.2 9 7 12 7ZM12 7s2-4 4-2.8S15 7 12 7Z"/></svg>',
  bank:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 9l9-5 9 5M5 9v9h14V9M9 12v3M15 12v3M3 20h18"/></svg>',
};

/* ---------- destinations & prices ---------- */
const DEST = { nw: { label: "Nearby Woods", price: 10 }, ff: { label: "Faraway Forest", price: 20 }, ffb: { label: "Forest Far Beyond", price: 50 } };
const TRUCK_PRICE = 75;   // elves off the back of a truck — regular price
const DRONE_PRICE = 150;  // Amazon drone express — double price, Pass only

/* ---------- scheduled event cards (fire at the end of a timetabled day) ---------- */
const EVENTS = {
  mutiny:   { name: "Mutiny in the Ranks", cls: "dodgy", icon: IC.elf, tag: "Day off?", tool: "strike",
    rule: "Your elves want a day off after a week's work. Give them the day off and they're happy. Make them work and that evening they vote — roll the die: ODD and they strike for the next two days (all your elves earn nothing); EVEN and they grumble but carry on." },
  tax1:     { name: "The Tax Man Cometh", cls: "insp", icon: IC.tax, tag: "Pay or gamble", tool: "tax10",
    rule: "Pay your taxes now — 10% of your running total — or gamble that he'll call a tax holiday. If he doesn't, you'll pay 20% of your total when he returns. Decide now; if you pay, put it in Extras as a minus and take it off your total." },
  lottery:  { name: "Grand Christmas Lottery", cls: "lott", icon: IC.ticket, tag: "Pick a number", tool: "lotto",
    rule: "Write your company name and a number 2–12. The winning number is two dice added together — match it and share the jackpot!" },
  tax2:     { name: "The Tax Man Returns", cls: "insp", icon: IC.tax, tag: "Holiday?", tool: "tax2",
    rule: "Did he call a tax holiday? Roll the die: EVEN = holiday, pay nothing! ODD = pay 20% of your running total (gamblers only). Put any tax in Extras as a minus and take it off your total." },
  mountain: { name: "The Mountain Pass Opens", cls: "stock", icon: IC.mountain, tag: "New forest",
    rule: "The Big Mountain Pass is complete — from now on you can send elves to the Forest Far Beyond, where trees are worth £50! But beware: if there's a blizzard, every elf you sent there is lost for the rest of the season. (The drone-delivery elf service also opens today.)" },
  truck:    { name: "Elves off the Back of a Truck", cls: "dodgy", icon: IC.truck, tag: "£75 each", tool: "truck",
    rule: "A lorry pulls up round the back of the workshop — elves going cheap, no questions asked, £75 a head for the rest of December. One of only two such visits all season. Hire as many as you dare (don't go into debt). Put the cost in Extras as a minus and add the elves to your workforce." },
  drone:    { name: "Amazon Drone Express", cls: "burt", icon: IC.drone, tag: "£150 each", tool: "drone",
    rule: "Need elves in a hurry now the Pass is open? An Amazon drone will air-drop a crate of them onto your yard — express delivery at £150 a head (double price — you're paying for the convenience). Put the cost in Extras as a minus and add the elves to your workforce." },
  truth:    { name: "The Moment of Truth", cls: "sally", icon: IC.flag, tag: "Final total",
    rule: "Advent is over! Take off anything still owed to Biscoes Bank. Whoever's running total is biggest wins the Great Elf Game." },
};
const EVENT_ORDER = ["mutiny", "tax1", "lottery", "tax2", "mountain", "truck", "drone", "truth"];
// Two truck visits at the regular price (days 5 & 20); the drone opens with the
// Pass on the 17th and is timetabled on the 21st.
const DEFAULT_SCHEDULE = { 5: "truck", 7: "mutiny", 10: "tax1", 12: "lottery", 14: "tax2", 17: "mountain", 20: "truck", 21: "drone", 24: "truth" };
const SCHED_VER = 2;

/* ---------- random "surprise" cards (teacher draws on demand) ----------
   Festive one-offs the teacher reads out; classes settle them in the Extras
   column (or by adjusting elves), so they stay print-and-play friendly. */
const SURPRISE = [
  { name: "Reindeer Delivery Boost", icon: IC.tree, tag: "+£5 a Nearby tree", cls: "lovely",
    rule: "A reindeer team is running deliveries today — every tree from the Nearby Woods sells for £15 instead of £10. Work out the extra £5 per Nearby tree and add it to Extras." },
  { name: "Christmas Market Rush", icon: IC.coin, tag: "Faraway +£10", cls: "burt",
    rule: "The Christmas market is desperate for posh trees — if it's a sunny day, every Faraway Forest tree sells for £30 instead of £20. Add the extra £10 per Faraway tree to Extras." },
  { name: "Elf Flu", icon: IC.elf, tag: "Half off sick", cls: "dodgy",
    rule: "A nasty cold sweeps the workshop. Half your elves (rounded down) are off sick TODAY — only the working half earn anything. Recalculate today's takings with half your elves." },
  { name: "Frostbite", icon: IC.snow, tag: "Roll: lose an elf?", cls: "insp", tool: "d6",
    rule: "The cold bites. Roll a die: ODD and one of your elves is sent home with frostbite — cross an elf off your workforce. EVEN and everyone's fine." },
  { name: "Generous Customer", icon: IC.gift, tag: "+£100 tip", cls: "stock",
    rule: "A kindly customer loves your trees and leaves a £100 tip. Add £100 to Extras." },
  { name: "Grumpy Return", icon: IC.coin, tag: "−£50 refund", cls: "insp",
    rule: "A customer brings a wonky tree back for a refund. Take £50 off in Extras (as a minus)." },
  { name: "Golden Tree", icon: IC.tree, tag: "Teacher picks one", cls: "lott", tool: "wheelhint",
    rule: "Somewhere in the woods grows a single golden tree worth £200! The teacher picks one company at random (spin a name) — they add £200 to Extras." },
  { name: "Sugar Rush", icon: IC.elf, tag: "One wood counts double", cls: "lovely",
    rule: "Mince pies all round — the elves work like mad! Pick ONE wood you used today; its takings count double. Add the doubled amount to Extras." },
  { name: "Tool Breakdown", icon: IC.dice, tag: "Roll: lose takings?", cls: "insp", tool: "d6",
    rule: "A saw snaps. Roll a die: 1–2 and today's Faraway Forest takings are lost; 3–6 and a spare is found in time. Adjust in Extras if caught out." },
  { name: "Snowball Truce", icon: IC.snow, tag: "No work today", cls: "stock",
    rule: "The whole workshop downs tools for an epic snowball fight. No elves earn today — but there are no costs either. Today's takings are £0." },
];

export function initElf(root) {
  const panel = root.querySelector(".elf-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };

  const cfg = () => {
    const s = getState(); if (!s.elf) s.elf = {};
    const d = s.elf;
    if (typeof d.days !== "number") d.days = 24;
    if (typeof d.elves !== "number") d.elves = 12;
    if (typeof d.printCount !== "number") d.printCount = 8;
    if (typeof d.physicalDice !== "boolean") d.physicalDice = false;
    if (typeof d.jackpot !== "number") d.jackpot = 1000;
    if (!d.schedule || typeof d.schedule !== "object") d.schedule = { ...DEFAULT_SCHEDULE };
    if (d.schedVer !== SCHED_VER) { d.schedule = { ...DEFAULT_SCHEDULE }; d.schedVer = SCHED_VER; }
    if (!Array.isArray(d.ledger)) d.ledger = [];
    if (!d.demo || typeof d.demo !== "object") d.demo = null;
    return d;
  };

  // The day the Forest Far Beyond opens = the first day timetabled as "mountain"
  // (default 17). If the Mountain Pass is never scheduled, the forest and the
  // drone service stay shut all season.
  const mountainDay = () => {
    let best = Infinity;
    for (const [day, ev] of Object.entries(cfg().schedule)) if (ev === "mountain") best = Math.min(best, +day);
    return best;
  };

  // Bank ledger refresh — hoisted so advancing the day recomputes the interest.
  let refreshBank = () => {};

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "lobster-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Print & play · Christmas"));
    card.appendChild(el("h2", "dojo-title", "The Great Elf Game"));
    card.appendChild(el("p", "dojo-lede", "Run a Christmas-tree business through the 24 days of advent. Each day, send your elves to the Nearby Woods (safe £10 a tree), the risky Faraway Forest (£20 — but nothing in a blizzard) or, once the Mountain Pass opens, the Forest Far Beyond (£50 — but a blizzard loses those elves). The teacher rolls the weather, fires the event cards and can draw surprise cards; each pupil keeps a printed accounts sheet. Biggest running total wins."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const rowF = (label, node) => { const f = el("div", "dojo-field dojo-field-inline"); f.appendChild(el("label", "dojo-lbl", label)); f.appendChild(node); card.appendChild(f); };
    const daysSel = el("select", "dojo-select dojo-select-sm");
    [12, 18, 24].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " days"; if (n === cfg().days) o.selected = true; daysSel.appendChild(o); });
    daysSel.addEventListener("change", () => { cfg().days = +daysSel.value; save(); renderLobby(); });
    rowF("Days of advent", daysSel);

    const elvesSel = el("select", "dojo-select dojo-select-sm");
    [8, 10, 12, 15].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === cfg().elves) o.selected = true; elvesSel.appendChild(o); });
    elvesSel.addEventListener("change", () => { cfg().elves = +elvesSel.value; save(); });
    rowF("Elves per company", elvesSel);

    const jackIn = el("input", "dojo-input dojo-select-sm lobster-scnum"); jackIn.type = "number"; jackIn.min = "0"; jackIn.value = cfg().jackpot;
    jackIn.addEventListener("input", () => { cfg().jackpot = Math.max(0, +jackIn.value || 0); save(); });
    rowF("Lottery jackpot (£)", jackIn);

    const diceRow = el("label", "lobster-check");
    const cb = el("input"); cb.type = "checkbox"; cb.checked = !!cfg().physicalDice;
    cb.addEventListener("change", () => { cfg().physicalDice = cb.checked; save(); });
    diceRow.append(cb, document.createTextNode(" Use physical dice in class (I'll type in the rolls)"));
    card.appendChild(diceRow);

    const btns = el("div", "dojo-editbtns");
    const play = el("button", "btn primary dojo-begin", "Play on the board");
    play.addEventListener("click", () => startBoard(false));
    const printBtn = el("button", "btn ghost", "Print accounts sheets");
    printBtn.addEventListener("click", () => renderPrint());
    const schedBtn = el("button", "btn ghost", "Edit timetable");
    schedBtn.addEventListener("click", () => renderSchedule());
    btns.append(play, printBtn, schedBtn);
    card.appendChild(btns);
    card.appendChild(rulesBox());
    panel.appendChild(card);
  }

  function rulesBox() {
    const box = el("div", "lobster-legend");
    box.appendChild(el("p", "lobster-legend-title", "How it works"));
    const grid = el("div", "lobster-legend-grid");
    const items = [
      [IC.sun, "sun", "Sunny day (die 1–4): Nearby £10, Faraway £20, Far Beyond £50 a tree."],
      [IC.snow, "storm", "Blizzard (die 5–6): Nearby £10, Faraway £0 — and Far Beyond elves are lost!"],
      [IC.mountain, "stock", "The Forest Far Beyond stays shut until the Mountain Pass opens on the 17th."],
      [IC.truck, "dodgy", "Buy elves off a truck twice (£75) — or by Amazon drone (£150) once the Pass is open."],
      [IC.bank, "cash", "Lost all your elves? Borrow from Biscoes Bank on the board — 50% interest a day."],
      [IC.gift, "lott", "The teacher can draw surprise cards any day to shake things up."],
    ];
    items.forEach(([ic, cls, txt]) => {
      const rowEl = el("div", "lobster-legend-item");
      const i = el("span", "lobster-ic " + cls); i.innerHTML = ic; rowEl.appendChild(i);
      rowEl.appendChild(el("span", "lobster-legend-name", txt));
      grid.appendChild(rowEl);
    });
    box.appendChild(grid);
    return box;
  }

  /* ================= EDIT TIMETABLE ================= */
  function renderSchedule() {
    panel.innerHTML = "";
    const card = el("div", "lobster-lobby");
    card.appendChild(el("h2", "dojo-title", "Event timetable"));
    card.appendChild(el("p", "dojo-lede", "Choose which event fires at the end of each day. The Forest Far Beyond opens on the day you set “The Mountain Pass Opens”."));
    const grid = el("div", "lobster-sched");
    for (let dnum = 1; dnum <= cfg().days; dnum++) {
      const rowEl = el("div", "lobster-schedrow");
      rowEl.appendChild(el("span", "lobster-schedday", "Day " + dnum));
      const sel = el("select", "dojo-select dojo-select-sm");
      const none = el("option"); none.value = ""; none.textContent = "— none —"; sel.appendChild(none);
      EVENT_ORDER.forEach((k) => { const o = el("option"); o.value = k; o.textContent = EVENTS[k].name; if (cfg().schedule[dnum] === k) o.selected = true; sel.appendChild(o); });
      sel.addEventListener("change", () => { if (sel.value) cfg().schedule[dnum] = sel.value; else delete cfg().schedule[dnum]; save(); });
      rowEl.appendChild(sel);
      grid.appendChild(rowEl);
    }
    card.appendChild(grid);
    const btns = el("div", "dojo-editbtns");
    const back = el("button", "btn primary", "Done"); back.addEventListener("click", () => renderLobby());
    const reset = el("button", "btn ghost", "Reset to default"); reset.addEventListener("click", () => { cfg().schedule = { ...DEFAULT_SCHEDULE }; save(); renderSchedule(); });
    btns.append(back, reset); card.appendChild(btns);
    panel.appendChild(card);
  }

  /* ================= TEACHER BOARD ================= */
  let demo = null; // { day, rows:[{elves,nw,ff,ffb,extra,weather}] }
  function freshDemo() {
    return { day: 1, rows: Array.from({ length: cfg().days }, () => ({ elves: cfg().elves, nw: 0, ff: 0, ffb: 0, extra: 0, weather: "" })) };
  }
  function startBoard(fresh) {
    demo = (!fresh && cfg().demo && Array.isArray(cfg().demo.rows) && cfg().demo.rows.length === cfg().days) ? cfg().demo : freshDemo();
    cfg().demo = demo; save();
    renderBoard();
  }
  const persistDemo = () => { cfg().demo = demo; save(); };

  function compute() {
    const open = mountainDay();
    let running = 0;
    return demo.rows.map((r, i) => {
      const day = i + 1;
      const nw = +r.nw || 0, ff = +r.ff || 0, ffb = +r.ffb || 0, extra = +r.extra || 0;
      const sunny = r.weather === "sunny";
      const ffbOpen = day >= open;
      const eNw = nw * DEST.nw.price;
      const eFf = sunny ? ff * DEST.ff.price : 0;
      const eFfb = (ffbOpen && sunny) ? ffb * DEST.ffb.price : 0;
      // Elves lost to a blizzard in the (open) Forest Far Beyond.
      const ffbLost = (ffbOpen && r.weather === "blizzard") ? ffb : 0;
      const dayTot = eNw + eFf + eFfb + extra;
      running += dayTot;
      return { eNw, eFf, eFfb, extra, day: dayTot, running, ffbOpen, ffbLost };
    });
  }

  let recompute = () => {};
  function renderBoard() {
    panel.innerHTML = "";
    const wrap = el("div", "lobster-game");
    wrap.appendChild(el("div", "dojo-toprow", `
      <span class="dojo-set">The Great Elf Game — board</span>
      <span class="dojo-topbtns">
        <label class="lobster-diceflag"><input type="checkbox" id="elfPhys" ${cfg().physicalDice ? "checked" : ""}> Physical dice</label>
        <button class="icon-btn dojo-icobtn" id="elfMute" title="Toggle sound" aria-label="Toggle sound"></button>
        <button class="btn ghost" id="elfReset">Reset</button>
        <button class="btn ghost" id="elfBack">Back</button>
      </span>`));

    const bar = el("div", "lobster-daybar");
    bar.innerHTML = `<button class="btn ghost lobster-daybtn" id="elfPrev">‹</button>
      <span class="lobster-day" id="elfDay"></span>
      <button class="btn ghost lobster-daybtn" id="elfNext">›</button>
      <button class="btn primary" id="elfRoll">Roll the weather</button>
      <button class="btn ghost" id="elfSurprise" title="Draw a random surprise card">🎁 Surprise card</button>`;
    wrap.appendChild(bar);
    const weather = el("div", "lobster-weather", ""); weather.id = "elfWeather"; wrap.appendChild(weather);
    const evbox = el("div", "lobster-eventslot"); evbox.id = "elfEventSlot"; wrap.appendChild(evbox);
    const surpriseBox = el("div", "lobster-eventslot"); surpriseBox.id = "elfSurpriseSlot"; wrap.appendChild(surpriseBox);

    const tableWrap = el("div", "lobster-boardtablewrap");
    const table = el("table", "lobster-boardtable");
    table.innerHTML = `<thead><tr>
      <th>Day</th><th>Elves</th><th>Nearby</th><th>Faraway</th><th>Far Beyond</th><th>Weather</th><th>£ NW</th><th>£ FF</th><th>£ FFB</th><th>Extras</th><th>Day £</th><th>Running £</th>
    </tr></thead>`;
    const tb = el("tbody");
    const cells = [];
    demo.rows.forEach((r, i) => {
      const tr = el("tr"); tr.dataset.row = i;
      const dCell = el("td", "lobster-bd-day", String(i + 1));
      const mk = (key, cls) => { const td = el("td"); const inp = el("input", "lobster-cellinput" + (cls ? " " + cls : "")); inp.type = "number"; inp.min = "0"; inp.value = r[key] || (key === "elves" ? cfg().elves : ""); inp.addEventListener("input", () => { r[key] = key === "extra" ? (+inp.value || 0) : Math.max(0, +inp.value || 0); persistDemo(); recompute(); }); td.appendChild(inp); return { td, inp }; };
      const elvesC = mk("elves"), nwC = mk("nw"), ffC = mk("ff"), ffbC = mk("ffb");
      const wthrCell = el("td", "lobster-bd-weather");
      wthrCell.addEventListener("click", () => { r.weather = r.weather === "sunny" ? "blizzard" : r.weather === "blizzard" ? "" : "sunny"; persistDemo(); recompute(); });
      const nwE = el("td", "lobster-bd-catch"), ffE = el("td", "lobster-bd-catch"), ffbE = el("td", "lobster-bd-catch");
      const extraTd = el("td"); const extraInp = el("input", "lobster-cellinput"); extraInp.type = "number"; extraInp.value = r.extra || ""; extraInp.placeholder = "0"; extraInp.addEventListener("input", () => { r.extra = +extraInp.value || 0; persistDemo(); recompute(); }); extraTd.appendChild(extraInp);
      const dayE = el("td", "lobster-bd-total"), runE = el("td", "lobster-bd-bal");
      tr.append(dCell, elvesC.td, nwC.td, ffC.td, ffbC.td, wthrCell, nwE, ffE, ffbE, extraTd, dayE, runE);
      tb.appendChild(tr);
      cells.push({ tr, ffbInp: ffbC.inp, wthrCell, nwE, ffE, ffbE, dayE, runE });
    });
    table.appendChild(tb); tableWrap.appendChild(table); wrap.appendChild(tableWrap);

    // Biscoes Bank ledger.
    wrap.appendChild(renderBankPanel());
    panel.appendChild(wrap);

    const mute = panel.querySelector("#elfMute"); mute.textContent = soundOn ? "♪" : "✕";
    mute.addEventListener("click", () => { soundOn = !soundOn; mute.textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#elfBack").addEventListener("click", () => renderLobby());
    panel.querySelector("#elfReset").addEventListener("click", () => { if (confirm("Clear the board and start a fresh game?")) { demo = freshDemo(); persistDemo(); renderBoard(); } });
    panel.querySelector("#elfPhys").addEventListener("change", (e) => { cfg().physicalDice = e.target.checked; save(); });
    panel.querySelector("#elfSurprise").addEventListener("click", drawSurprise);
    const setDay = () => { panel.querySelector("#elfDay").textContent = `Day ${demo.day} of ${cfg().days}`; panel.querySelector("#elfPrev").disabled = demo.day <= 1; panel.querySelector("#elfNext").disabled = demo.day >= cfg().days; showEventSlot(); highlightDay(); refreshBank(); };
    panel.querySelector("#elfPrev").addEventListener("click", () => { if (demo.day > 1) { demo.day--; persistDemo(); setDay(); } });
    panel.querySelector("#elfNext").addEventListener("click", () => { if (demo.day < cfg().days) { demo.day++; persistDemo(); setDay(); } });
    panel.querySelector("#elfRoll").addEventListener("click", rollWeather);

    recompute = () => {
      const open = mountainDay();
      const rows = compute();
      rows.forEach((d, i) => {
        const c = cells[i]; const w = demo.rows[i].weather;
        // Lock the Far Beyond column until the Mountain Pass opens.
        const locked = (i + 1) < open;
        c.ffbInp.disabled = locked;
        c.ffbInp.classList.toggle("locked", locked);
        c.ffbInp.title = locked ? `Opens when the Mountain Pass opens (day ${open === Infinity ? "—" : open})` : "";
        c.wthrCell.innerHTML = w === "sunny" ? `<span class="lobster-wtag lovely">${IC.sun} Sunny</span>` : w === "blizzard" ? `<span class="lobster-wtag storm">${IC.snow} Blizzard</span>` : `<span class="lobster-wtag none">—</span>`;
        c.nwE.textContent = d.eNw ? d.eNw : "";
        c.ffE.textContent = demo.rows[i].weather ? d.eFf : "";
        c.ffbE.innerHTML = !d.ffbOpen ? `<span class="lobster-wtag none">shut</span>` : (d.ffbLost ? `<span class="lobster-bd-lost">0 (−${d.ffbLost} elves!)</span>` : (demo.rows[i].weather ? String(d.eFfb) : ""));
        c.dayE.textContent = d.day;
        c.runE.textContent = d.running; c.runE.classList.toggle("neg", d.running < 0);
      });
    };
    function highlightDay() { cells.forEach((c, i) => c.tr.classList.toggle("today", i + 1 === demo.day)); }
    recompute(); setDay();
  }

  // Fire the event timetabled for the current day.
  function showEventSlot() {
    const slot = panel.querySelector("#elfEventSlot"); if (!slot) return;
    slot.innerHTML = "";
    const key = cfg().schedule[demo.day]; if (!key || !EVENTS[key]) return;
    const ev = EVENTS[key];
    const ruleText = key === "lottery" ? `Write your company name and a number 2–12. The winning number is two dice added together — match it and share the £${cfg().jackpot} jackpot!` : ev.rule;
    const cardEl = el("div", "lobster-eventcard " + ev.cls);
    cardEl.innerHTML = `<div class="lobster-evhead"><span class="lobster-evic">${ev.icon}</span>
        <span class="lobster-evtitles"><span class="lobster-evname">End of day ${demo.day}: ${ev.name}</span><span class="lobster-evtag">${ev.tag}</span></span></div>
      <p class="lobster-evrule">${ruleText}</p>`;
    if (ev.tool === "strike") { const b = el("button", "btn ghost", "Roll the strike vote"); b.addEventListener("click", () => drawNumber(cardEl, 6, "Strike vote", "ODD = strike for 2 days (no pay). EVEN = elves carry on.")); cardEl.appendChild(b); }
    if (ev.tool === "tax2") { const b = el("button", "btn ghost", "Roll for a tax holiday"); b.addEventListener("click", () => drawNumber(cardEl, 6, "Tax Man", "EVEN = tax holiday, pay nothing. ODD = pay 20% of your total.")); cardEl.appendChild(b); }
    if (ev.tool === "lotto") { const b = el("button", "btn ghost", "Draw the winning number"); b.addEventListener("click", () => drawTwoDice(cardEl, cfg().jackpot)); cardEl.appendChild(b); }
    if (ev.tool === "tax10") cardEl.appendChild(taxCalc(10));
    if (ev.tool === "tax20") cardEl.appendChild(taxCalc(20));
    if (ev.tool === "truck") cardEl.appendChild(buyCalc(TRUCK_PRICE, "off the truck"));
    if (ev.tool === "drone") cardEl.appendChild(buyCalc(DRONE_PRICE, "by drone"));
    slot.appendChild(cardEl); fx(sound.beep);
  }

  // Draw a random surprise card into its own slot.
  function drawSurprise() {
    const slot = panel.querySelector("#elfSurpriseSlot"); if (!slot) return;
    const ev = SURPRISE[rint(SURPRISE.length)];
    slot.innerHTML = "";
    const cardEl = el("div", "lobster-eventcard " + (ev.cls || "lott"));
    cardEl.innerHTML = `<div class="lobster-evhead"><span class="lobster-evic">${ev.icon}</span>
        <span class="lobster-evtitles"><span class="lobster-evname">Surprise! ${ev.name}</span><span class="lobster-evtag">${ev.tag}</span></span></div>
      <p class="lobster-evrule">${ev.rule}</p>`;
    if (ev.tool === "d6") { const b = el("button", "btn ghost", "Roll the die"); b.addEventListener("click", () => drawNumber(cardEl, 6, "Surprise roll", "Follow the card.")); cardEl.appendChild(b); }
    if (ev.tool === "wheelhint") cardEl.appendChild(el("p", "dojo-hint", "Tip: use the Wheel of Names to pick the lucky company."));
    const again = el("button", "btn ghost", "Draw another"); again.addEventListener("click", drawSurprise); cardEl.appendChild(again);
    slot.appendChild(cardEl); fx(sound.beep);
  }

  // A quick percentage calculator for the Tax Man.
  function taxCalc(pct) {
    const box = el("div", "lobster-prizeedit");
    box.appendChild(el("label", "lobster-prizelbl", `Your running total £`));
    const inp = el("input", "dojo-input lobster-scnum"); inp.type = "number"; inp.min = "0"; inp.placeholder = "0";
    const out = el("span", "lobster-evrule lobster-taxout"); out.style.marginLeft = "8px";
    const calc = () => { const t = Math.max(0, +inp.value || 0); out.textContent = `${pct}% tax = £${Math.round(t * pct / 100)} to take off`; };
    inp.addEventListener("input", calc); calc();
    box.append(inp, out);
    return box;
  }
  // Elf-purchase cost calculator (truck £75 / drone £150).
  function buyCalc(price, how) {
    const box = el("div", "lobster-prizeedit");
    box.appendChild(el("label", "lobster-prizelbl", `Buy how many? ×£${price}`));
    const inp = el("input", "dojo-input lobster-scnum"); inp.type = "number"; inp.min = "0"; inp.placeholder = "0";
    const out = el("span", "lobster-evrule lobster-taxout"); out.style.marginLeft = "8px";
    const calc = () => { const n = Math.max(0, +inp.value || 0); out.textContent = `Cost ${how} = £${n * price} (and +${n} elves)`; };
    inp.addEventListener("input", calc); calc();
    box.append(inp, out);
    return box;
  }

  /* ---------- weather roll (d6) ---------- */
  function applyWeather(die) {
    const sunny = die <= 4;
    const r = demo.rows[demo.day - 1]; r.weather = sunny ? "sunny" : "blizzard"; persistDemo(); recompute();
    const ffbOpen = demo.day >= mountainDay();
    const lostNote = (!sunny && ffbOpen && (+r.ffb || 0) > 0) ? ` — ${+r.ffb} Far Beyond elf${(+r.ffb === 1) ? "" : "s"} lost!` : "";
    const w = panel.querySelector("#elfWeather");
    w.className = "lobster-weather show " + (sunny ? "fair" : "storm");
    w.innerHTML = `<span class="lobster-wic">${sunny ? IC.sun : IC.snow}</span>
      <span class="lobster-wtext">${sunny ? "Sunny day" : "Blizzard!"}</span>
      <span class="lobster-wroll">die: ${die} ${sunny ? "(1–4)" : "(5–6)"}</span>
      <span class="lobster-wnote">${sunny ? "Nearby £10 · Faraway £20 · Far Beyond £50 a tree" : "Nearby £10 · Faraway £0 · Far Beyond elves LOST" + lostNote}</span>`;
    fx(sunny ? sound.sunny : sound.storm);
  }
  function rollWeather() {
    if (cfg().physicalDice) return askPhysical(6, "Weather die (1–6)", applyWeather);
    const btn = panel.querySelector("#elfRoll"); btn.disabled = true;
    const w = panel.querySelector("#elfWeather");
    let n = 0;
    const spin = setInterval(() => {
      const die = 1 + rint(6), sunny = die <= 4;
      w.className = "lobster-weather show " + (sunny ? "fair" : "storm");
      w.innerHTML = `<span class="lobster-wic">${sunny ? IC.sun : IC.snow}</span><span class="lobster-wtext">${sunny ? "Sunny" : "Blizzard"}</span><span class="lobster-wroll">${die}</span>`;
      fx(sound.tick);
      if (++n >= 12) { clearInterval(spin); btn.disabled = false; applyWeather(1 + rint(6)); }
    }, 70);
  }
  function askPhysical(max, label, cb) {
    const slot = panel.querySelector("#elfEventSlot") || panel.querySelector("#elfWeather");
    slot.innerHTML = "";
    const box = el("div", "lobster-draw");
    box.appendChild(el("p", "lobster-drawlbl", label));
    const btns = el("div", "lobster-numpad");
    for (let i = 1; i <= max; i++) { const b = el("button", "btn ghost lobster-numbtn", String(i)); b.addEventListener("click", () => { slot.innerHTML = ""; cb(i); }); btns.appendChild(b); }
    box.appendChild(btns); slot.appendChild(box);
  }

  /* ---------- dice / lottery draws ---------- */
  function drawNumber(host, max, label, hint) {
    let holder = host.querySelector(".lobster-drawn"); if (!holder) { holder = el("div", "lobster-drawn"); host.appendChild(holder); }
    if (cfg().physicalDice) {
      holder.innerHTML = "";
      const box = el("div", "lobster-draw"); box.appendChild(el("p", "lobster-drawlbl", label));
      const pad = el("div", "lobster-numpad");
      for (let i = 1; i <= max; i++) { const b = el("button", "btn ghost lobster-numbtn", String(i)); b.addEventListener("click", () => { box.innerHTML = `<p class="lobster-drawlbl">${label}</p><p class="lobster-drawnum">${i}</p><p class="dojo-hint">${hint}</p>`; fx(sound.beep); }); pad.appendChild(b); }
      box.appendChild(pad); holder.innerHTML = ""; holder.appendChild(box); return;
    }
    holder.innerHTML = `<p class="lobster-drawlbl">${label}</p><p class="lobster-drawnum" id="elfDrawN">…</p><p class="dojo-hint">${hint}</p>`;
    const num = holder.querySelector("#elfDrawN");
    let n = 0; const spin = setInterval(() => { num.textContent = String(1 + rint(max)); fx(sound.tick); if (++n >= 13) { clearInterval(spin); num.textContent = String(1 + rint(max)); fx(sound.fanfare); } }, 70);
  }
  function drawTwoDice(host, prize) {
    let holder = host.querySelector(".lobster-drawn"); if (!holder) { holder = el("div", "lobster-drawn"); host.appendChild(holder); }
    const reveal = (a, b) => { holder.innerHTML = `<p class="lobster-drawlbl">Winning number</p><p class="lobster-drawnum">${a + b}</p><p class="dojo-hint">${a} + ${b} — companies with ${a + b} share the £${prize} jackpot.</p>`; fx(sound.fanfare); };
    if (cfg().physicalDice) {
      holder.innerHTML = `<p class="lobster-drawlbl">Tap your two dice</p>`;
      const state = []; const pad = el("div", "lobster-numpad");
      for (let i = 1; i <= 6; i++) { const b = el("button", "btn ghost lobster-numbtn", String(i)); b.addEventListener("click", () => { state.push(i); fx(sound.tick); if (state.length === 2) reveal(state[0], state[1]); else holder.querySelector(".lobster-drawlbl").textContent = "Tap the second die"; }); pad.appendChild(b); }
      holder.appendChild(pad); return;
    }
    holder.innerHTML = `<p class="lobster-drawlbl">Winning number (two dice)</p><p class="lobster-drawnum" id="elfDrawN">…</p>`;
    const num = holder.querySelector("#elfDrawN");
    let n = 0; const spin = setInterval(() => { num.textContent = String(2 + rint(11)); fx(sound.tick); if (++n >= 14) { clearInterval(spin); reveal(1 + rint(6), 1 + rint(6)); } }, 70);
  }

  /* ---------- Biscoes Bank ledger (ported from Lobster Pots) ----------
     Emergency loans for anyone who kills off all their elves. Interest is 50% a
     day and the debt grows automatically as the board's day advances; whatever
     is still owed at the end comes off the final running total. */
  const owedOf = (L) => {
    const cur = demo ? demo.day : (L.dayTaken || 1);
    const days = Math.max(0, cur - (L.dayTaken || 1));
    return Math.round((+L.principal || 0) * Math.pow(1.5, days));
  };
  function renderBankPanel() {
    const box = el("div", "lobster-bankpanel");
    box.innerHTML = `<div class="lobster-bankhead"><span class="lobster-ic bank">${IC.bank}</span><span>Biscoes Bank <span class="lobster-banksub">— lost all your elves? Borrow here to buy more. Interest is 50% a day and the debt grows automatically as the days pass; whatever's still owed at the end comes off the final total.</span></span></div>`;
    const form = el("div", "lobster-bankform");
    const nameIn = el("input", "dojo-input lobster-bankname"); nameIn.placeholder = "Company name"; nameIn.maxLength = 24;
    const amtIn = el("input", "dojo-input lobster-bankamt"); amtIn.type = "number"; amtIn.min = "1"; amtIn.placeholder = "£ borrowed";
    const add = el("button", "btn primary", "Lend");
    const doAdd = () => { const nm = nameIn.value.trim(), amt = Math.max(0, +amtIn.value || 0); if (!nm || !amt) return; cfg().ledger.push({ name: nm, principal: amt, dayTaken: demo ? demo.day : 1 }); save(); nameIn.value = ""; amtIn.value = ""; fx(sound.beep); refreshLedger(); };
    add.addEventListener("click", doAdd);
    amtIn.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });
    form.append(nameIn, amtIn, add);
    box.appendChild(form);
    const list = el("div", "lobster-ledger"); list.id = "elfLedger"; box.appendChild(list);
    const refreshLedger = () => {
      list.innerHTML = "";
      if (!cfg().ledger.length) { list.appendChild(el("p", "dojo-hint", "No loans yet.")); return; }
      const curDay = demo ? demo.day : 1;
      const table = el("table", "lobster-ledgertable");
      table.innerHTML = `<thead><tr><th class='l'>Company</th><th>Borrowed</th><th>Day taken</th><th>Owed now (day ${curDay})</th><th></th></tr></thead>`;
      const tbody = el("tbody");
      cfg().ledger.forEach((L, idx) => {
        const tr = el("tr");
        const nameTd = el("td", "l", L.name);
        const borrowedTd = el("td");
        const borrowedIn = el("input", "dojo-input lobster-owedinput"); borrowedIn.type = "number"; borrowedIn.min = "0"; borrowedIn.value = L.principal;
        borrowedIn.addEventListener("input", () => { L.principal = Math.max(0, +borrowedIn.value || 0); save(); owedCell.textContent = "£" + owedOf(L); });
        borrowedTd.appendChild(borrowedIn);
        const dayTd = el("td");
        const dayIn = el("input", "dojo-input lobster-dayinput"); dayIn.type = "number"; dayIn.min = "1"; dayIn.max = String(cfg().days); dayIn.value = L.dayTaken;
        dayIn.addEventListener("input", () => { L.dayTaken = Math.min(cfg().days, Math.max(1, +dayIn.value || 1)); save(); owedCell.textContent = "£" + owedOf(L); });
        dayTd.appendChild(dayIn);
        const owedTd = el("td");
        const owedCell = el("span", "lobster-owed"); owedCell.textContent = "£" + owedOf(L);
        owedTd.appendChild(owedCell);
        const actTd = el("td", "lobster-ledgeract");
        const del = el("button", "btn ghost lobster-minibtn", "✕"); del.title = "Remove"; del.addEventListener("click", () => { cfg().ledger.splice(idx, 1); save(); refreshLedger(); });
        actTd.appendChild(del);
        tr.append(nameTd, borrowedTd, dayTd, owedTd, actTd);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); list.appendChild(table);
    };
    refreshBank = refreshLedger;
    refreshLedger();
    return box;
  }

  /* ================= PRINTABLE ACCOUNTS SHEETS ================= */
  function renderPrint() {
    const count = Math.min(40, Math.max(1, cfg().printCount || 8));
    panel.innerHTML = "";
    const bar = el("div", "dojo-editbtns lobster-noprint lobster-print-bar");
    const back = el("button", "btn ghost", "Back"); back.addEventListener("click", () => renderLobby());
    const cntWrap = el("label", "lobster-count-ctrl", "Sheets ");
    const cntSel = el("select", "dojo-select dojo-select-sm");
    [6, 8, 12, 16, 20, 30].forEach((v) => { const o = el("option"); o.value = v; o.textContent = v; if (v === count) o.selected = true; cntSel.appendChild(o); });
    cntSel.addEventListener("change", () => { cfg().printCount = +cntSel.value; save(); renderPrint(); });
    cntWrap.appendChild(cntSel);
    const print = el("button", "btn primary", "Print these"); print.addEventListener("click", () => window.print());
    bar.append(back, cntWrap, print);
    panel.appendChild(bar);
    panel.appendChild(el("p", "dojo-hint lobster-noprint", `${count} accounts sheets (${cfg().days} days, ${cfg().elves} elves). Print one per company.`));
    const wrap = el("div", "lobster-print");
    for (let m = 0; m < count; m++) wrap.appendChild(printSheet());
    panel.appendChild(wrap);
  }

  function printSheet() {
    const days = cfg().days;
    const open = mountainDay();
    const cardEl = el("div", "lobster-printcard");
    cardEl.appendChild(el("p", "lobster-printtitle", "THE GREAT ELF GAME"));
    cardEl.appendChild(el("p", "lobster-printset", `Company: ________________   Elves: ${cfg().elves}   ·   Lottery number (2–12): ______`));

    const table = el("table", "lobster-logtable");
    table.innerHTML = `<thead><tr>
      <th>Day</th><th>Elves</th><th>Near</th><th>Far</th><th>Beyond</th><th>Weather</th><th>£ NW</th><th>£ FF</th><th>£ FFB</th><th>Extras</th><th>Day £</th><th>Running £</th>
    </tr></thead>`;
    const tb = el("tbody");
    for (let dnum = 1; dnum <= days; dnum++) {
      const tr = el("tr");
      const ev = cfg().schedule[dnum];
      const beyondShut = dnum < open;
      tr.innerHTML = `<td class="lobster-daycell">${dnum}${ev ? `<span class="lobster-dayev">${EVENTS[ev].name}</span>` : ""}</td>` +
        `<td></td><td></td><td></td><td class="${beyondShut ? "lobster-cellshut" : ""}">${beyondShut ? "✕" : ""}</td>` +
        "<td></td>".repeat(7);
      tb.appendChild(tr);
    }
    table.appendChild(tb);

    const leg = el("div", "lobster-plegend");
    leg.appendChild(el("p", "lobster-plegtitle", "The rules"));
    const legItems = [
      [IC.sun, "sun", "Sunny (die 1–4): Near £10, Far £20, Beyond £50 a tree"],
      [IC.snow, "storm", "Blizzard (die 5–6): Near £10, Far £0, Beyond elves LOST"],
      [IC.mountain, "stock", "Forest Far Beyond opens on day " + (open === Infinity ? "—" : open) + " (£50 a tree)"],
      [IC.truck, "dodgy", "Buy elves off a truck (£75) ×2, or by drone (£150) once the Pass opens"],
      [IC.tax, "insp", "Tax Man: 10% now or gamble for 20% later"],
      [IC.bank, "cash", "Biscoes Bank: emergency loans at 50% interest a day"],
      [IC.ticket, "lott", `Lottery: match the two-dice number to share the £${cfg().jackpot} jackpot`],
    ];
    legItems.forEach(([ic, cls, txt]) => { const s = el("span", "lobster-plegitem"); s.innerHTML = `<span class="lobster-pic ${cls}">${ic}</span> ${txt}`; leg.appendChild(s); });

    const top = el("div", "lobster-ptop");
    const tWrap = el("div", "lobster-tablewrap"); tWrap.appendChild(table);
    top.append(tWrap, leg);
    cardEl.appendChild(top);

    const notes = el("div", "lobster-pnotes");
    notes.appendChild(el("p", "lobster-boxlbl", "Working out / Biscoes Bank loan"));
    cardEl.appendChild(notes);
    return cardEl;
  }

  renderLobby();
}
