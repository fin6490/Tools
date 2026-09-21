// lobster.js — Lobster Pots: a print-and-play classroom economics game.
//  • Print & play: each fisher gets a printed 14-day log sheet — split pots
//    between the safe Inshore and the risky Offshore, survive the weather,
//    buy pots and bank cash for the biggest balance.
//  • Teacher board: a live "spreadsheet" the teacher plays along on to model
//    exactly how students fill their sheet — roll the daily weather (d6:
//    1–4 lovely, 5–6 storm, with sound), watch the catch and balance compute,
//    fire the timetabled event cards, and run the class Bank so anyone who
//    goes bust can borrow — all tracked centrally on the board.
// Zero deps. All original code.
import { el } from "./quizkit.js?v=20260916h";
import { getState, save } from "./storage.js?v=20260916h";
import * as sound from "./sound.js?v=20260916h";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const YT_LOVELY = "https://www.youtube.com/results?search_query=bill+withers+lovely+day";

/* ---------- icons ---------- */
const IC = {
  sun:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>',
  storm:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6-1.3A3.8 3.8 0 0 1 17.5 16"/><path d="M12 13l-2 4h3l-2 4"/></svg>',
  boat:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15h16l-2 4H6l-2-4Z"/><path d="M12 3v9M12 5l5 2-5 2M6 12V8"/></svg>',
  bank:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 9l9-5 9 5M5 9v9h14V9M9 12v3M15 12v3M3 20h18"/></svg>',
  ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M12 6v2M12 11v2M12 16v2"/></svg>',
  badge:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2l2.4 1.8 3 .1 1 2.8 2.2 2-1 2.8 1 2.8-2.2 2-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.4 15l1-2.8-1-2.8 2.2-2 1-2.8 3-.1Z"/><path d="M9.5 12l1.8 1.8 3.4-3.6"/></svg>',
  dice:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/></svg>',
  coin:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.2a2.4 2.4 0 0 1 4.2.3M14.5 14.8a2.4 2.4 0 0 1-4.2-.3"/></svg>',
  tag:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 12l8-8h7v7l-8 8-7-7Z"/><circle cx="15" cy="9" r="1.4"/></svg>',
  cash:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v6M18 9v6"/></svg>',
  fish:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z"/><circle cx="15" cy="11" r="1" fill="currentColor"/></svg>',
};

/* ---------- event cards (fired at the end of timetabled days) ---------- */
const EVENTS = {
  lottery: { name: "Fisherman's Lottery", cls: "lott", icon: IC.ticket, tag: "Pick a number",
    rule: "Everyone writes a number 1–10 on their sheet. Draw the winning number — match it and win £100!", tool: "lotto" },
  dodgy:   { name: "Dodgy Dave", cls: "dodgy", icon: IC.tag, tag: "Cheap pots",
    rule: "Dave sells pots at £3 each instead of the £5 market price. Buy as many as you dare — write down how many, because they might be dodgy…" },
  burt:    { name: "Black Market Burt", cls: "burt", icon: IC.cash, tag: "Triple price",
    rule: "Burt buys your next day's catch at TRIPLE the price. Very tempting — but if the Inspector calls, you're in trouble." },
  inspect: { name: "The Inspector", cls: "insp", icon: IC.badge, tag: "Fines",
    rule: "Pot inspection! Any pots bought from Dodgy Dave or Burt cost a fine of £5 × dodgy pots. Caught cheating the books? Lose 50% of your bank balance." },
  sally:   { name: "Skilled Sally", cls: "sally", icon: IC.fish, tag: "Skill bonus",
    rule: "Sally sets a quick skill challenge. Bonus = (your Wins ÷ Attempts) × your current balance, added on top." },
  stock:   { name: "Stock Clearance", cls: "stock", icon: IC.dice, tag: "Sell pots",
    rule: "Sell spare pots at auction. Roll a die: sale price = dice roll × number of pots sold.", tool: "dice" },
  toss:    { name: "Fish Toss", cls: "toss", icon: IC.coin, tag: "Coin game", skill: true,
    rule: "Toss a coin for each pot: heads lands a lobster worth £2, tails is a miss. Count your wins and add them up." },
};
const EVENT_ORDER = ["lottery", "dodgy", "burt", "inspect", "sally", "stock", "toss"];
// Default timetable — which event fires at the END of each day. Fully editable.
const DEFAULT_SCHEDULE = { 2: "toss", 3: "lottery", 5: "dodgy", 7: "inspect", 8: "lottery", 10: "burt", 12: "inspect", 13: "sally", 14: "stock" };

export function initLobster(root) {
  const panel = root.querySelector(".lobster-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => {
    const s = getState(); if (!s.lobster) s.lobster = {};
    const d = s.lobster;
    if (typeof d.days !== "number") d.days = 14;
    if (typeof d.startPots !== "number") d.startPots = 5;
    if (typeof d.startCash !== "number") d.startCash = 0;
    if (typeof d.printCount !== "number") d.printCount = 8;
    if (typeof d.physicalDice !== "boolean") d.physicalDice = false;
    if (typeof d.fishToss !== "boolean") d.fishToss = false;
    if (typeof d.lottoPrize !== "number") d.lottoPrize = 100;
    if (!d.schedule || typeof d.schedule !== "object") d.schedule = { ...DEFAULT_SCHEDULE };
    if (!Array.isArray(d.ledger)) d.ledger = [];
    if (!Array.isArray(d.scoreboard)) d.scoreboard = [];
    if (!d.demo || typeof d.demo !== "object") d.demo = null;
    return d;
  };

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "lobster-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Print & play"));
    card.appendChild(el("h2", "dojo-title", "Lobster Pots"));
    card.appendChild(el("p", "dojo-lede", "Run a lobster-fishing business over 14 days. Each fisher fills a printed log sheet; the teacher plays along on the board — rolling the daily weather, working the catch and balance live, firing the timetabled events and running the class Bank so anyone who goes bust can borrow."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const rowF = (label, node) => { const f = el("div", "dojo-field dojo-field-inline"); f.appendChild(el("label", "dojo-lbl", label)); f.appendChild(node); card.appendChild(f); };
    const daysSel = el("select", "dojo-select dojo-select-sm");
    [10, 12, 14].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " days"; if (n === cfg().days) o.selected = true; daysSel.appendChild(o); });
    daysSel.addEventListener("change", () => { cfg().days = +daysSel.value; save(); renderLobby(); });
    rowF("Days", daysSel);

    const potsSel = el("select", "dojo-select dojo-select-sm");
    [3, 5, 8, 10].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === cfg().startPots) o.selected = true; potsSel.appendChild(o); });
    potsSel.addEventListener("change", () => { cfg().startPots = +potsSel.value; save(); });
    rowF("Starting pots", potsSel);

    const cashSel = el("select", "dojo-select dojo-select-sm");
    [0, 20, 50, 100].forEach((n) => { const o = el("option"); o.value = n; o.textContent = "£" + n; if (n === cfg().startCash) o.selected = true; cashSel.appendChild(o); });
    cashSel.addEventListener("change", () => { cfg().startCash = +cashSel.value; save(); });
    rowF("Starting cash", cashSel);

    const diceRow = el("label", "lobster-check");
    const cb = el("input"); cb.type = "checkbox"; cb.checked = !!cfg().physicalDice;
    cb.addEventListener("change", () => { cfg().physicalDice = cb.checked; save(); });
    diceRow.append(cb, document.createTextNode(" Use physical dice in class (I'll type in the rolls)"));
    card.appendChild(diceRow);

    const prizeIn = el("input", "dojo-input dojo-select-sm lobster-scnum"); prizeIn.type = "number"; prizeIn.min = "0"; prizeIn.value = cfg().lottoPrize;
    prizeIn.addEventListener("input", () => { cfg().lottoPrize = Math.max(0, +prizeIn.value || 0); save(); });
    rowF("Lottery prize (£)", prizeIn);

    const fishRow = el("label", "lobster-check");
    const fcb = el("input"); fcb.type = "checkbox"; fcb.checked = !!cfg().fishToss;
    fcb.addEventListener("change", () => { cfg().fishToss = fcb.checked; save(); });
    fishRow.append(fcb, document.createTextNode(" Fish Toss skill bonus (optional rule — an on-screen skill game for an end-game multiplier)"));
    card.appendChild(fishRow);

    const btns = el("div", "dojo-editbtns");
    const play = el("button", "btn primary dojo-begin", "Play on the board");
    play.addEventListener("click", () => startBoard(false));
    const printBtn = el("button", "btn ghost", "Print log sheets");
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
      [IC.sun, "sun", "Lovely day (die 1–4): each inshore pot catches £1, each offshore pot £6."],
      [IC.storm, "storm", "Storm (die 5–6): inshore catches £3, but every offshore pot is DESTROYED."],
      [IC.boat, "boat", "Each day, split your pots between inshore (safe) and offshore (risky)."],
      [IC.cash, "cash", "New pots cost £5 each. Go bust? Borrow from the Bank on the board."],
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
    card.appendChild(el("p", "dojo-lede", "Choose which event fires at the end of each day. This runs the same on the board and is a handy reminder when playing."));
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

  /* ================= TEACHER BOARD (play-along spreadsheet) ================= */
  let demo = null; // { rows: [{inn,off,buy,bank,weather}], day }
  function freshDemo() {
    return { day: 1, rows: Array.from({ length: cfg().days }, () => ({ inn: 0, off: 0, buy: 0, bank: 0, weather: "" })) };
  }
  function startBoard(fresh) {
    demo = (!fresh && cfg().demo && Array.isArray(cfg().demo.rows) && cfg().demo.rows.length === cfg().days) ? cfg().demo : freshDemo();
    cfg().demo = demo; save();
    renderBoard();
  }
  const persistDemo = () => { cfg().demo = demo; save(); };

  // Work out every derived column from the inputs.
  function compute() {
    let pots = cfg().startPots, bal = cfg().startCash;
    return demo.rows.map((r) => {
      const potsStart = pots;
      const inn = +r.inn || 0, off = +r.off || 0, buy = +r.buy || 0;
      let catchV = null;
      if (r.weather === "lovely") catchV = inn * 1 + off * 6;
      else if (r.weather === "storm") catchV = inn * 3;
      const lost = r.weather === "storm" ? off : 0;
      const totalPots = potsStart - lost + buy;
      const cost = buy * 5;
      bal = bal + (catchV || 0) - cost;
      pots = totalPots;
      return { potsStart, catchV, lost, totalPots, cost, balance: bal };
    });
  }

  let recompute = () => {};
  function renderBoard() {
    panel.innerHTML = "";
    const wrap = el("div", "lobster-game");
    wrap.appendChild(el("div", "dojo-toprow", `
      <span class="dojo-set">Lobster Pots — board</span>
      <span class="dojo-topbtns">
        <label class="lobster-diceflag"><input type="checkbox" id="loPhys" ${cfg().physicalDice ? "checked" : ""}> Physical dice</label>
        <button class="icon-btn dojo-icobtn" id="loMute" title="Toggle sound" aria-label="Toggle sound"></button>
        <button class="btn ghost" id="loScore">Scoreboard</button>
        <button class="btn ghost" id="loReset">Reset</button>
        <button class="btn ghost" id="loBack">Back</button>
      </span>`));

    // Day bar + weather
    const bar = el("div", "lobster-daybar");
    bar.innerHTML = `<button class="btn ghost lobster-daybtn" id="loPrev">‹</button>
      <span class="lobster-day" id="loDay"></span>
      <button class="btn ghost lobster-daybtn" id="loNext">›</button>
      <button class="btn primary" id="loRoll">Roll the weather</button>`;
    wrap.appendChild(bar);
    const weather = el("div", "lobster-weather", ""); weather.id = "loWeather"; wrap.appendChild(weather);
    const evbox = el("div", "lobster-eventslot"); evbox.id = "loEventSlot"; wrap.appendChild(evbox);

    // Spreadsheet
    const tableWrap = el("div", "lobster-boardtablewrap");
    const table = el("table", "lobster-boardtable");
    table.innerHTML = `<thead><tr>
      <th>Day</th><th>Pots</th><th>Inshore</th><th>Offshore</th><th>Weather</th><th>Catch £</th><th>Buy pots</th><th>Total pots</th><th>Balance £</th>
    </tr></thead>`;
    const tb = el("tbody");
    const derivedCells = []; // per row references
    demo.rows.forEach((r, i) => {
      const tr = el("tr"); tr.dataset.row = i;
      const dCell = el("td", "lobster-bd-day", String(i + 1));
      const potsCell = el("td", "lobster-bd-pots");
      const innTd = el("td"), offTd = el("td"), buyTd = el("td");
      const mkInput = (key) => { const inp = el("input", "lobster-cellinput"); inp.type = "number"; inp.min = "0"; inp.value = r[key] || ""; inp.addEventListener("input", () => { r[key] = Math.max(0, +inp.value || 0); persistDemo(); recompute(); }); return inp; };
      innTd.appendChild(mkInput("inn")); offTd.appendChild(mkInput("off")); buyTd.appendChild(mkInput("buy"));
      const wthrCell = el("td", "lobster-bd-weather");
      wthrCell.addEventListener("click", () => { r.weather = r.weather === "lovely" ? "storm" : r.weather === "storm" ? "" : "lovely"; persistDemo(); recompute(); });
      const catchCell = el("td", "lobster-bd-catch");
      const totalCell = el("td", "lobster-bd-total");
      const balCell = el("td", "lobster-bd-bal");
      tr.append(dCell, potsCell, innTd, offTd, wthrCell, catchCell, buyTd, totalCell, balCell);
      tb.appendChild(tr);
      derivedCells.push({ tr, potsCell, wthrCell, catchCell, totalCell, balCell });
    });
    table.appendChild(tb);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    // Board bank
    wrap.appendChild(renderBankPanel());
    panel.appendChild(wrap);

    // wire header
    const mute = panel.querySelector("#loMute"); mute.textContent = soundOn ? "♪" : "✕";
    mute.addEventListener("click", () => { soundOn = !soundOn; mute.textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#loBack").addEventListener("click", () => renderLobby());
    panel.querySelector("#loScore").addEventListener("click", renderScoreboard);
    panel.querySelector("#loReset").addEventListener("click", () => { if (confirm("Clear the board and start a fresh game?")) { demo = freshDemo(); persistDemo(); renderBoard(); } });
    panel.querySelector("#loPhys").addEventListener("change", (e) => { cfg().physicalDice = e.target.checked; save(); });
    const setDay = () => { panel.querySelector("#loDay").textContent = `Day ${demo.day} of ${cfg().days}`; panel.querySelector("#loPrev").disabled = demo.day <= 1; panel.querySelector("#loNext").disabled = demo.day >= cfg().days; showEventSlot(); highlightDay(); };
    panel.querySelector("#loPrev").addEventListener("click", () => { if (demo.day > 1) { demo.day--; persistDemo(); setDay(); } });
    panel.querySelector("#loNext").addEventListener("click", () => { if (demo.day < cfg().days) { demo.day++; persistDemo(); setDay(); } });
    panel.querySelector("#loRoll").addEventListener("click", rollWeather);

    recompute = () => {
      const rows = compute();
      rows.forEach((d, i) => {
        const c = derivedCells[i];
        c.potsCell.textContent = d.potsStart;
        const w = demo.rows[i].weather;
        c.wthrCell.innerHTML = w === "lovely" ? `<span class="lobster-wtag lovely">${IC.sun} Lovely</span>` : w === "storm" ? `<span class="lobster-wtag storm">${IC.storm} Storm</span>` : `<span class="lobster-wtag none">—</span>`;
        c.catchCell.textContent = d.catchV == null ? "" : d.catchV;
        c.totalCell.textContent = d.totalPots + (d.lost ? ` (−${d.lost})` : "");
        c.balCell.textContent = d.balance;
        c.balCell.classList.toggle("neg", d.balance < 0);
      });
    };
    function highlightDay() { derivedCells.forEach((c, i) => c.tr.classList.toggle("today", i + 1 === demo.day)); }
    recompute(); setDay();
  }

  function highlightRowRecompute() { recompute(); }

  // Fire (or remind of) the event timetabled for the current day.
  function showEventSlot() {
    const slot = panel.querySelector("#loEventSlot"); if (!slot) return;
    const key = cfg().schedule[demo.day];
    slot.innerHTML = "";
    if (!key || !EVENTS[key]) return;
    const ev = EVENTS[key];
    const ruleText = key === "lottery"
      ? `Everyone writes a number 2–12 on their sheet. The winning number is two dice added together — match it and win £${cfg().lottoPrize}!`
      : ev.rule;
    const cardEl = el("div", "lobster-eventcard " + ev.cls);
    cardEl.innerHTML = `<div class="lobster-evhead"><span class="lobster-evic">${ev.icon}</span>
        <span class="lobster-evtitles"><span class="lobster-evname">End of day ${demo.day}: ${ev.name}</span><span class="lobster-evtag">${ev.tag}</span></span></div>
      <p class="lobster-evrule">${ruleText}</p>`;
    if (ev.tool === "lotto") { const b = el("button", "btn ghost", "Draw the winning number"); b.addEventListener("click", () => drawTwoDice(cardEl, cfg().lottoPrize)); cardEl.appendChild(b); }
    if (ev.tool === "dice") { const b = el("button", "btn ghost", "Roll the die"); b.addEventListener("click", () => drawNumber(cardEl, 6, "Dice roll", "Sale price = roll × pots sold.")); cardEl.appendChild(b); }
    if (ev.skill && cfg().fishToss) {
      cardEl.appendChild(el("p", "lobster-evrule", "Optional skill bonus: flip the coin, then the teacher sends fishers up one at a time to throw a fish into the bucket — a success or a miss. Everyone tallies their own goes on their sheet; at the very end, work out each fisher's multiplier (1 + successes ÷ goes × a dice roll) and multiply their final balance by it."));
      const b = el("button", "btn primary", "Open the skill game"); b.addEventListener("click", () => { const host = el("div", "lobster-fishslot"); cardEl.appendChild(host); playFishToss(host); b.disabled = true; }); cardEl.appendChild(b);
    }
    slot.appendChild(cardEl); fx(sound.beep);
  }

  /* ---------- Fish Toss skill game (optional rule) ----------
     A coin the teacher can flip (they decide who comes up), then a fish-into-a-
     bucket toss — time the power into the green and the fish arcs to the bucket.
     A clean success or miss the fisher tallies on their own sheet; the separate
     end-of-game calculator turns each fisher's tally into the multiplier. */
  function playFishToss(host) {
    let raf = null;
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

    /* -- start screen: a coin to flip + the actions -- */
    function renderStart() {
      stop(); if (keyHandler) disarmKeys();
      host.innerHTML = `<p class="lobster-fishstep">Fish Toss — the teacher picks who comes up</p>
        <div class="lobster-cointools">
          <div class="lobster-fishcoin" id="ftCoin">?</div>
          <button class="btn ghost" id="ftFlip">Flip the coin</button>
        </div>
        <p class="dojo-hint">Each go is a success or a miss — fishers tally their own on their sheet. Final scores (selling pots and the multiplier) are worked out on the Scoreboard at the end.</p>
        <div class="dojo-editbtns"><button class="btn primary" id="ftGo">Throw a fish</button></div>`;
      host.querySelector("#ftFlip").addEventListener("click", flip);
      host.querySelector("#ftGo").addEventListener("click", renderThrow);
    }
    function flip() {
      const coin = host.querySelector("#ftCoin"); coin.className = "lobster-fishcoin";
      const btn = host.querySelector("#ftFlip"); btn.disabled = true;
      let n = 0;
      const spin = setInterval(() => {
        coin.textContent = n % 2 ? "HEADS" : "TAILS"; fx(sound.tick);
        if (++n >= 11) { clearInterval(spin); const res = rint(2) === 0 ? "HEADS" : "TAILS"; coin.textContent = res; coin.classList.add(res.toLowerCase()); btn.disabled = false; fx(sound.beep); }
      }, 70);
    }

    /* -- the fish toss --
       Difficulty is pure luck of the draw, re-rolled every go: a wildly
       varying bucket size and power speed, from a huge slow SITTER to a tiny
       lightning-fast BRUTAL. The bucket width == the success zone, so the fish
       only counts as IN when it actually lands inside the bucket. */
    let power = 0, pdir = 1, center = 0.6, half = 0.07, speed = 0.012;
    const lerp = (a, b, t) => a + (b - a) * t;
    function tierOf(d) {
      if (d < 0.16) return { name: "SITTER", cls: "t1" };
      if (d < 0.34) return { name: "EASY", cls: "t2" };
      if (d < 0.54) return { name: "FAIR", cls: "t3" };
      if (d < 0.72) return { name: "TRICKY", cls: "t4" };
      if (d < 0.88) return { name: "TOUGH", cls: "t5" };
      return { name: "BRUTAL", cls: "t6" };
    }
    let keyHandler = null;
    const disarmKeys = () => { if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; } };
    function armThrowKey() {
      disarmKeys();
      keyHandler = (e) => {
        if (e.key !== " " && e.code !== "Space" && e.key !== "Enter") return;
        const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        const btn = host.querySelector("#ftThrow"); if (!btn || btn.disabled) return;
        e.preventDefault(); throwFish();
      };
      document.addEventListener("keydown", keyHandler);
    }
    function renderThrow() {
      stop();
      const d = Math.random();                         // luck of the draw
      const tier = tierOf(d);
      half = lerp(0.17, 0.022, d);                     // bucket half-width: 34% … 4.4%
      speed = lerp(0.008, 0.028, d);                   // power sweep speed
      const margin = 0.14;
      center = lerp(margin + half, 1 - margin - half, Math.random());
      host.innerHTML = `<p class="lobster-fishstep">Time the power into the green, then throw the fish into the bucket!</p>
        <div class="lobster-diffbadge ${tier.cls}">Luck of the draw — <b>${tier.name}</b></div>
        <div class="lobster-tossscene" id="ftScene">
          <div class="lobster-water"></div>
          <div class="lobster-thrower">${IC.boat}</div>
          <div class="lobster-bucketshadow" id="ftShadow"></div>
          <div class="lobster-bucket" id="ftBucket"><span class="lobster-bucketrim"></span></div>
          <div class="lobster-fish" id="ftFish" hidden>${IC.fish}</div>
          <div class="lobster-fishresult" id="ftResult" hidden aria-live="polite"></div>
        </div>
        <div class="lobster-powerwrap"><div class="lobster-powerband ${tier.cls}" id="ftBand"></div><div class="lobster-powerfill" id="ftFill"></div></div>
        <p class="dojo-hint lobster-throwhint">Press the button or the spacebar to throw.</p>
        <div class="dojo-editbtns"><button class="btn primary lobster-throwbtn" id="ftThrow">THROW!</button><button class="btn ghost" id="ftDone2">Back</button></div>`;
      const L = (center - half) * 100, W = half * 2 * 100;
      const bucket = host.querySelector("#ftBucket"); bucket.style.left = L + "%"; bucket.style.width = W + "%";
      const shadow = host.querySelector("#ftShadow"); shadow.style.left = L + "%"; shadow.style.width = W + "%";
      const bandEl = host.querySelector("#ftBand"); bandEl.style.left = L + "%"; bandEl.style.width = W + "%";
      power = 0; pdir = 1;
      runPower();
      host.querySelector("#ftThrow").addEventListener("click", throwFish);
      host.querySelector("#ftDone2").addEventListener("click", renderStart);
      armThrowKey();
    }
    function runPower() {
      stop();
      const step = () => {
        const fill = host.querySelector("#ftFill");
        if (!fill || !host.isConnected) { stop(); return; }
        power += pdir * speed; if (power >= 1) { power = 1; pdir = -1; } if (power <= 0) { power = 0; pdir = 1; }
        fill.style.width = (power * 100) + "%";
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    function ripple(scene, xFrac) {
      const r = el("span", "lobster-ripple"); r.style.left = (xFrac * 100) + "%"; scene.appendChild(r);
      setTimeout(() => r.remove(), 750);
    }
    function throwFish() {
      stop(); disarmKeys();
      const p = power, success = p >= center - half && p <= center + half;
      host.querySelector("#ftThrow").disabled = true;
      const scene = host.querySelector("#ftScene"), fish = host.querySelector("#ftFish");
      fish.hidden = false;
      // On a hit the fish lands dead-centre in the bucket; on a miss it lands
      // where it was thrown — always outside the bucket — so what you see is
      // always what you score.
      const startX = 0.09, endX = success ? center : Math.min(0.94, Math.max(0.06, p)), peak = (scene.clientHeight || 170) * 0.72;
      const t0 = performance.now(), dur = 640;
      const arc = (now) => {
        let t = (now - t0) / dur; if (t > 1) t = 1;
        fish.style.left = ((startX + (endX - startX) * t) * 100) + "%";
        fish.style.bottom = (18 + 4 * peak * t * (1 - t)) + "px";
        fish.style.transform = `rotate(${Math.round(t * 500)}deg)`;
        if (t < 1) requestAnimationFrame(arc); else { ripple(scene, endX); finishThrow(success); }
      };
      requestAnimationFrame(arc);
    }
    function finishThrow(success) {
      fx(success ? sound.fanfare : sound.buzz);
      const fish = host.querySelector("#ftFish"); if (fish) fish.classList.add(success ? "in" : "out");
      const bucket = host.querySelector("#ftBucket"); if (bucket && success) bucket.classList.add("splash");
      const res = host.querySelector("#ftResult");
      if (res) { res.hidden = false; res.className = "lobster-fishresult " + (success ? "ok" : "no"); res.textContent = success ? "IN THE BUCKET!" : "MISSED!"; }
      const row = el("div", "dojo-editbtns lobster-fishafter");
      const next = el("button", "btn primary", "Throw again"); next.addEventListener("click", renderThrow);
      const done = el("button", "btn ghost", "Back"); done.addEventListener("click", renderStart);
      row.append(next, done); host.appendChild(row);
    }

    renderStart();
  }

  /* ---------- weather roll (d6) ---------- */
  function applyWeather(die) {
    const fair = die <= 4;
    const r = demo.rows[demo.day - 1]; r.weather = fair ? "lovely" : "storm"; persistDemo(); recompute();
    const w = panel.querySelector("#loWeather");
    w.className = "lobster-weather show " + (fair ? "fair" : "storm");
    w.innerHTML = `<span class="lobster-wic">${fair ? IC.sun : IC.storm}</span>
      <span class="lobster-wtext">${fair ? "Lovely day" : "Storm!"}</span>
      <span class="lobster-wroll">die: ${die} ${fair ? "(1–4)" : "(5–6)"}</span>
      <span class="lobster-wnote">${fair ? "Inshore £1 · Offshore £6 a pot" : "Inshore £3 a pot · offshore pots DESTROYED"}</span>
      ${fair ? `<a class="lobster-ytlink" href="${YT_LOVELY}" target="_blank" rel="noopener">♪ Play “Lovely Day” (Bill Withers)</a>` : ""}`;
    fx(fair ? sound.sunny : sound.storm);
  }
  function rollWeather() {
    if (cfg().physicalDice) return askPhysical(6, "Weather die (1–6)", applyWeather);
    const btn = panel.querySelector("#loRoll"); btn.disabled = true;
    const w = panel.querySelector("#loWeather");
    let n = 0;
    const spin = setInterval(() => {
      const die = 1 + rint(6), fair = die <= 4;
      w.className = "lobster-weather show " + (fair ? "fair" : "storm");
      w.innerHTML = `<span class="lobster-wic">${fair ? IC.sun : IC.storm}</span><span class="lobster-wtext">${fair ? "Lovely" : "Storm"}</span><span class="lobster-wroll">${die}</span>`;
      fx(sound.tick);
      if (++n >= 12) { clearInterval(spin); btn.disabled = false; applyWeather(1 + rint(6)); }
    }, 70);
  }

  // Physical-dice prompt: teacher taps the number they actually rolled.
  function askPhysical(max, label, cb) {
    const w = panel.querySelector("#loWeather") || panel.querySelector("#loEventSlot");
    const slot = panel.querySelector("#loEventSlot") || w;
    slot.innerHTML = "";
    const box = el("div", "lobster-draw");
    box.appendChild(el("p", "lobster-drawlbl", label));
    const btns = el("div", "lobster-numpad");
    for (let i = 1; i <= max; i++) { const b = el("button", "btn ghost lobster-numbtn", String(i)); b.addEventListener("click", () => { slot.innerHTML = ""; cb(i); }); btns.appendChild(b); }
    box.appendChild(btns); slot.appendChild(box);
  }

  /* ---------- lottery / dice draws (used by event cards) ---------- */
  function drawNumber(host, max, label, hint) {
    if (cfg().physicalDice) {
      let holder = host.querySelector(".lobster-drawn"); if (!holder) { holder = el("div", "lobster-drawn"); host.appendChild(holder); }
      holder.innerHTML = "";
      const box = el("div", "lobster-draw"); box.appendChild(el("p", "lobster-drawlbl", label));
      const pad = el("div", "lobster-numpad");
      for (let i = 1; i <= max; i++) { const b = el("button", "btn ghost lobster-numbtn", String(i)); b.addEventListener("click", () => { box.innerHTML = `<p class="lobster-drawlbl">${label}</p><p class="lobster-drawnum">${i}</p><p class="dojo-hint">${hint}</p>`; fx(sound.beep); }); pad.appendChild(b); }
      box.appendChild(pad); holder.appendChild(box); return;
    }
    let holder = host.querySelector(".lobster-drawn"); if (!holder) { holder = el("div", "lobster-drawn"); host.appendChild(holder); }
    holder.innerHTML = `<p class="lobster-drawlbl">${label}</p><p class="lobster-drawnum" id="loDrawN">…</p><p class="dojo-hint">${hint}</p>`;
    const num = holder.querySelector("#loDrawN");
    let n = 0; const spin = setInterval(() => { num.textContent = String(1 + rint(max)); fx(sound.tick); if (++n >= 13) { clearInterval(spin); num.textContent = String(1 + rint(max)); fx(sound.fanfare); } }, 70);
  }
  // Lottery: winning number = two dice added together (2–12).
  function drawTwoDice(host, prize) {
    let holder = host.querySelector(".lobster-drawn"); if (!holder) { holder = el("div", "lobster-drawn"); host.appendChild(holder); }
    const reveal = (a, b) => { holder.innerHTML = `<p class="lobster-drawlbl">Winning number</p><p class="lobster-drawnum">${a + b}</p><p class="dojo-hint">${a} + ${b} — anyone with ${a + b} on their sheet wins £${prize}.</p>`; fx(sound.fanfare); };
    if (cfg().physicalDice) {
      holder.innerHTML = `<p class="lobster-drawlbl">Tap your two dice</p>`;
      const state = [];
      const pad = el("div", "lobster-numpad");
      for (let i = 1; i <= 6; i++) { const b = el("button", "btn ghost lobster-numbtn", String(i)); b.addEventListener("click", () => { state.push(i); fx(sound.tick); if (state.length === 2) reveal(state[0], state[1]); else holder.querySelector(".lobster-drawlbl").textContent = "Tap the second die"; }); pad.appendChild(b); }
      holder.appendChild(pad); return;
    }
    holder.innerHTML = `<p class="lobster-drawlbl">Winning number (two dice)</p><p class="lobster-drawnum" id="loDrawN">…</p>`;
    const num = holder.querySelector("#loDrawN");
    let n = 0; const spin = setInterval(() => { num.textContent = String(2 + rint(11)); fx(sound.tick); if (++n >= 14) { clearInterval(spin); reveal(1 + rint(6), 1 + rint(6)); } }, 70);
  }

  /* ================= FINAL SCOREBOARD =================
     End of the game: enter each fisher's pots, money and any loan still owed,
     roll a die to sell their pots (die × pots), apply the Fish Toss multiplier
     (1 + wins ÷ goes × the same die) when that rule is on, and take off the
     loan owed. Anyone who took a dodgy deal faces the "CIA — open up!" roll:
     odd and they're jailed and out of the game. Ranks everyone by final score. */
  const scoreRow = (r) => {
    const pots = Math.max(0, +r.pots || 0), money = Math.max(0, +r.money || 0), owed = Math.max(0, +r.owed || 0);
    const die = r.die || null, cia = r.cia == null ? null : r.cia;
    const jailed = !!(r.dodgy && cia != null && cia % 2 === 1);
    const goes = Math.max(0, +r.goes || 0), wins = Math.min(goes, Math.max(0, +r.wins || 0));
    const mult = cfg().fishToss && goes > 0 && die ? 1 + (wins / goes) * die : 1;
    const sale = die ? die * pots : 0;
    const needCia = !!(r.dodgy && cia == null);
    let final = null;
    if (jailed) final = "JAIL";
    else if (die && !needCia) final = Math.round((money + sale) * mult - owed);
    return { pots, money, owed, die, cia, jailed, needCia, mult, sale, final };
  };
  const sortKey = (d) => d.jailed ? -1e12 : (typeof d.final === "number" ? d.final : -1e11);
  function renderScoreboard() {
    panel.innerHTML = "";
    const F = cfg().fishToss;
    const wrap = el("div", "lobster-game");
    wrap.appendChild(el("div", "dojo-toprow", `<span class="dojo-set">Final scoreboard</span>
      <span class="dojo-topbtns"><button class="btn ghost" id="scClear">Clear all</button><button class="btn ghost" id="scBack">← Board</button></span>`));
    wrap.appendChild(el("p", "dojo-lede", `Enter each fisher's pots, money and any loan still owed${F ? ", plus their Fish Toss wins/goes" : ""}. Roll to sell their pots (die × pots)${F ? ", apply the multiplier" : ""} and take off the loan. Flag anyone who took a dodgy deal — they must survive the “CIA, open up!” roll (odd = jail).`));

    // add-player form
    const form = el("div", "lobster-scform");
    const nameIn = el("input", "dojo-input"); nameIn.placeholder = "Name"; nameIn.maxLength = 24;
    const potsIn = el("input", "dojo-input lobster-scnum"); potsIn.type = "number"; potsIn.min = "0"; potsIn.placeholder = "Pots";
    const moneyIn = el("input", "dojo-input lobster-scnum"); moneyIn.type = "number"; moneyIn.min = "0"; moneyIn.placeholder = "£ money";
    let winsIn, goesIn;
    form.append(nameIn, potsIn, moneyIn);
    if (F) {
      winsIn = el("input", "dojo-input lobster-scnum"); winsIn.type = "number"; winsIn.min = "0"; winsIn.placeholder = "Wins";
      goesIn = el("input", "dojo-input lobster-scnum"); goesIn.type = "number"; goesIn.min = "0"; goesIn.placeholder = "Goes";
      form.append(winsIn, goesIn);
    }
    const owedIn = el("input", "dojo-input lobster-scnum"); owedIn.type = "number"; owedIn.min = "0"; owedIn.placeholder = "Loan owed";
    form.append(owedIn);
    const dodgyLbl = el("label", "lobster-scdodgy"); const dodgyCb = el("input"); dodgyCb.type = "checkbox"; dodgyLbl.append(dodgyCb, document.createTextNode(" Dodgy"));
    form.append(dodgyLbl);
    const add = el("button", "btn primary", "Add");
    const doAdd = () => {
      const nm = nameIn.value.trim(); if (!nm) { nameIn.focus(); return; }
      const row = { name: nm, pots: +potsIn.value || 0, money: +moneyIn.value || 0, owed: +owedIn.value || 0, dodgy: dodgyCb.checked, die: null, cia: null };
      if (F) { row.wins = +winsIn.value || 0; row.goes = +goesIn.value || 0; }
      cfg().scoreboard.push(row); save();
      [nameIn, potsIn, moneyIn, owedIn, winsIn, goesIn].forEach((i) => i && (i.value = "")); dodgyCb.checked = false;
      nameIn.focus(); fx(sound.beep); renderScoreboard();
    };
    add.addEventListener("click", doAdd);
    [nameIn, potsIn, moneyIn, owedIn, winsIn, goesIn].forEach((i) => i && i.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); }));
    form.append(add);
    wrap.appendChild(form);

    // table
    const rows = cfg().scoreboard.map((r, i) => ({ r, i, d: scoreRow(r) }));
    const ranked = rows.slice().sort((a, b) => sortKey(b.d) - sortKey(a.d));
    const cols = ["#", "Fisher", "Pots", "£", ...(F ? ["Wins/Goes"] : []), "Loan", "Die", "Pot sale", ...(F ? ["× Mult"] : []), "CIA", "Final", ""];
    const table = el("table", "lobster-sctable");
    table.innerHTML = `<thead><tr>${cols.map((c) => `<th class="${c === "Fisher" ? "l" : ""}">${c}</th>`).join("")}</tr></thead>`;
    const tb = el("tbody");
    if (!rows.length) { tb.innerHTML = `<tr><td colspan="${cols.length}" class="lobster-scempty">Add fishers above to build the scoreboard.</td></tr>`; }
    ranked.forEach((row, rank) => {
      const { r, i, d } = row;
      const scored = typeof d.final === "number";
      const tr = el("tr", d.jailed ? "jailed" : (scored && rank === 0 ? "top" : ""));
      const ciaCell = !r.dodgy ? "–" : (d.cia == null ? '<span class="lobster-ciaq">?</span>' : `${d.cia} ${d.jailed ? '<b class="lobster-jail">JAIL</b>' : '<b class="lobster-free">free</b>'}`);
      let cells = `<td>${scored ? rank + 1 : "–"}</td><td class="l">${r.name}${r.dodgy ? ' <span class="lobster-dodgytag">dodgy</span>' : ""}</td><td>${d.pots}</td><td>£${d.money}</td>`;
      if (F) cells += `<td>${r.wins || 0}/${r.goes || 0}</td>`;
      cells += `<td>${d.owed ? "£" + d.owed : "–"}</td><td class="lobster-scdie">${r.die || "–"}</td><td>${r.die ? "£" + d.sale : "–"}</td>`;
      if (F) cells += `<td>${r.die ? "×" + d.mult.toFixed(2) : "–"}</td>`;
      cells += `<td>${ciaCell}</td><td class="lobster-scfinal">${d.jailed ? "JAILED" : (d.final == null ? "–" : d.final)}</td>`;
      tr.innerHTML = cells;
      const actTd = el("td", "lobster-scact");
      const rollBtn = el("button", "btn ghost lobster-minibtn", r.die ? "Re-roll" : "Roll"); rollBtn.addEventListener("click", () => rollFor(i, "die"));
      actTd.appendChild(rollBtn);
      if (r.dodgy) { const cia = el("button", "btn ghost lobster-minibtn lobster-ciabtn", d.cia == null ? "CIA!" : "Re-CIA"); cia.addEventListener("click", () => rollFor(i, "cia")); actTd.appendChild(cia); }
      const del = el("button", "btn ghost lobster-minibtn", "✕"); del.title = "Remove"; del.addEventListener("click", () => { cfg().scoreboard.splice(i, 1); save(); renderScoreboard(); });
      actTd.appendChild(del); tr.appendChild(actTd);
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(el("div", "lobster-sctablewrap")).appendChild(table);
    panel.appendChild(wrap);

    panel.querySelector("#scBack").addEventListener("click", () => { demo = cfg().demo || freshDemo(); renderBoard(); });
    panel.querySelector("#scClear").addEventListener("click", () => { if (!cfg().scoreboard.length || confirm("Clear the whole scoreboard?")) { cfg().scoreboard = []; save(); renderScoreboard(); } });
  }
  // kind: "die" (sell pots) or "cia" (CIA — open up! jail roll)
  function rollFor(idx, kind) {
    const r = cfg().scoreboard[idx]; if (!r) return;
    const cia = kind === "cia";
    const set = (v) => { r[cia ? "cia" : "die"] = v; save(); fx(cia && v % 2 === 1 ? sound.buzz : sound.fanfare); renderScoreboard(); };
    if (cfg().physicalDice) {
      const box = el("div", "lobster-scpad"); box.innerHTML = `<p class="lobster-drawlbl">${r.name} — ${cia ? "CIA, open up! Tap the die (odd = jail)" : "tap the die you rolled"}</p>`;
      const pad = el("div", "lobster-numpad");
      for (let i = 1; i <= 6; i++) { const b = el("button", "btn ghost lobster-numbtn", String(i)); b.addEventListener("click", () => { overlay.remove(); set(i); }); pad.appendChild(b); }
      box.appendChild(pad);
      const overlay = el("div", "lobster-scoverlay"); overlay.appendChild(box);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
      panel.appendChild(overlay); return;
    }
    fx(sound.tick); set(1 + rint(6));
  }

  /* ---------- board Bank ledger (Biscoes Bank) ----------
     Loans charge 50% interest a day: tap "+ day" to grow the debt. Whatever is
     still owed at the end is taken off that fisher's final score. */
  const owedOf = (L) => Math.max(0, L.owed != null ? +L.owed : (+L.borrowed || 0) - (+L.repaid || 0));
  function renderBankPanel() {
    const box = el("div", "lobster-bankpanel");
    box.innerHTML = `<div class="lobster-bankhead"><span class="lobster-ic bank">${IC.bank}</span><span>Biscoes Bank <span class="lobster-banksub">— gone bust? Borrow here. Interest 50% a day; whatever's still owed comes off the final score.</span></span></div>`;
    const form = el("div", "lobster-bankform");
    const nameIn = el("input", "dojo-input lobster-bankname"); nameIn.placeholder = "Fisher's name"; nameIn.maxLength = 24;
    const amtIn = el("input", "dojo-input lobster-bankamt"); amtIn.type = "number"; amtIn.min = "1"; amtIn.placeholder = "£ borrowed";
    const add = el("button", "btn primary", "Lend");
    const doAdd = () => { const nm = nameIn.value.trim(), amt = Math.max(0, +amtIn.value || 0); if (!nm || !amt) return; cfg().ledger.push({ name: nm, owed: amt }); save(); nameIn.value = ""; amtIn.value = ""; fx(sound.beep); refreshLedger(); };
    add.addEventListener("click", doAdd);
    amtIn.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });
    form.append(nameIn, amtIn, add);
    box.appendChild(form);
    const list = el("div", "lobster-ledger"); list.id = "loLedger"; box.appendChild(list);
    const refreshLedger = () => {
      list.innerHTML = "";
      if (!cfg().ledger.length) { list.appendChild(el("p", "dojo-hint", "No loans yet.")); return; }
      const table = el("table", "lobster-ledgertable");
      table.innerHTML = "<thead><tr><th class='l'>Fisher</th><th>Owed now</th><th></th></tr></thead>";
      const tbody = el("tbody");
      cfg().ledger.forEach((L, idx) => {
        const tr = el("tr");
        const nameTd = el("td", "l", L.name);
        const owedTd = el("td");
        const owedIn = el("input", "dojo-input lobster-owedinput"); owedIn.type = "number"; owedIn.min = "0"; owedIn.value = owedOf(L);
        owedIn.addEventListener("input", () => { L.owed = Math.max(0, +owedIn.value || 0); delete L.borrowed; delete L.repaid; save(); });
        owedTd.appendChild(owedIn);
        const actTd = el("td", "lobster-ledgeract");
        const day = el("button", "btn ghost lobster-minibtn", "+ day (×1.5)"); day.title = "Add a day's 50% interest"; day.addEventListener("click", () => { L.owed = Math.round(owedOf(L) * 1.5); delete L.borrowed; delete L.repaid; save(); fx(sound.tick); refreshLedger(); });
        const del = el("button", "btn ghost lobster-minibtn", "✕"); del.title = "Remove"; del.addEventListener("click", () => { cfg().ledger.splice(idx, 1); save(); refreshLedger(); });
        actTd.append(day, del);
        tr.append(nameTd, owedTd, actTd);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); list.appendChild(table);
    };
    refreshLedger();
    return box;
  }

  /* ================= PRINTABLE LOG SHEETS ================= */
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
    panel.appendChild(el("p", "dojo-hint lobster-noprint", `${count} log sheets (${cfg().days} days, start ${cfg().startPots} pots, £${cfg().startCash}). Print one per fisher.`));
    const wrap = el("div", "lobster-print");
    for (let m = 0; m < count; m++) wrap.appendChild(printSheet());
    panel.appendChild(wrap);
  }

  function printSheet() {
    const days = cfg().days;
    const cardEl = el("div", "lobster-printcard");
    cardEl.appendChild(el("p", "lobster-printtitle", "LOBSTER POTS"));
    cardEl.appendChild(el("p", "lobster-printset", `Name: ________________   Start: ${cfg().startPots} pots · £${cfg().startCash}   ·   Lottery number (2–12): ______`));

    const table = el("table", "lobster-logtable");
    table.innerHTML = `<thead><tr>
      <th>Day</th><th>Pots</th><th>In</th><th>Off</th><th>Weather</th><th>Catch £</th><th>Buy</th><th>Total pots</th><th>Bank £</th><th>Balance £</th>
    </tr></thead>`;
    const tb = el("tbody");
    for (let dnum = 1; dnum <= days; dnum++) {
      const tr = el("tr");
      const ev = cfg().schedule[dnum];
      tr.innerHTML = `<td class="lobster-daycell">${dnum}${ev ? `<span class="lobster-dayev">${EVENTS[ev].name}</span>` : ""}</td>` + "<td></td>".repeat(9);
      tb.appendChild(tr);
    }
    table.appendChild(tb);

    const leg = el("div", "lobster-plegend");
    leg.appendChild(el("p", "lobster-plegtitle", "The rules"));
    const legItems = [
      [IC.sun, "sun", "Lovely (die 1–4): inshore £1, offshore £6"],
      [IC.storm, "storm", "Storm (die 5–6): inshore £3 — offshore DESTROYED"],
      [IC.boat, "boat", "Choose inshore/offshore before the weather"],
      [IC.cash, "cash", "Buy pots £5 each · bank to stay safe"],
      [IC.ticket, "lott", `Lottery: match the two-dice number, win £${cfg().lottoPrize}`],
      [IC.badge, "insp", "Inspector fines dodgy pots · loans cost 50%/day"],
    ];
    legItems.forEach(([ic, cls, txt]) => { const s = el("span", "lobster-plegitem"); s.innerHTML = `<span class="lobster-pic ${cls}">${ic}</span> ${txt}`; leg.appendChild(s); });

    const top = el("div", "lobster-ptop");
    const tWrap = el("div", "lobster-tablewrap"); tWrap.appendChild(table);
    top.append(tWrap, leg);
    cardEl.appendChild(top);

    const notes = el("div", "lobster-pnotes");
    notes.appendChild(el("p", "lobster-boxlbl", "Working out"));
    cardEl.appendChild(notes);

    // Fish Toss tally (only when the optional rule is on) — record every go.
    if (cfg().fishToss) {
      const fishBox = el("div", "lobster-fishbox");
      fishBox.innerHTML = `
        <p class="lobster-boxlbl">Fish Toss — tally each go</p>
        <div class="lobster-tallyrow"><span class="lobster-tallylbl">Wins</span><span class="lobster-tallyspace"></span></div>
        <div class="lobster-tallyrow"><span class="lobster-tallylbl">Misses</span><span class="lobster-tallyspace"></span></div>`;
      cardEl.appendChild(fishBox);
    }

    // End-of-game working: sell pots, take off any loan, apply the multiplier.
    const endBox = el("div", "lobster-endbox");
    let end = `<p class="lobster-boxlbl">End of the game</p>
      <p class="lobster-fishcalc">Sell pots: pots <span class="lobster-uline sm"></span> × dice <span class="lobster-uline xs"></span> = £ <span class="lobster-uline sm"></span></p>
      <p class="lobster-fishcalc">Money <span class="lobster-uline sm"></span> + pot sale <span class="lobster-uline sm"></span> − loan owed <span class="lobster-uline sm"></span> = <span class="lobster-uline sm"></span></p>`;
    if (cfg().fishToss) end += `<p class="lobster-fishcalc">Multiplier = wins <span class="lobster-uline sm"></span> ÷ goes <span class="lobster-uline sm"></span> × dice <span class="lobster-uline xs"></span> + 1 = <span class="lobster-uline sm"></span></p>`;
    end += `<p class="lobster-fishcalc lobster-finalrow"><b>FINAL SCORE</b> ${cfg().fishToss ? "= subtotal <span class=\"lobster-uline sm\"></span> × multiplier <span class=\"lobster-uline sm\"></span> " : ""}= <span class="lobster-uline"></span></p>
      <p class="lobster-fishcalc lobster-ciarow">Took a dodgy deal? Roll a dice — <b>ODD = JAIL</b> (out of the game!): <span class="lobster-uline xs"></span></p>`;
    endBox.innerHTML = end;
    cardEl.appendChild(endBox);
    return cardEl;
  }

  renderLobby();
}
