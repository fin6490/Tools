// lobster.js — Lobster Pots: a print-and-play classroom economics game.
//  • Each fisher runs a lobster business over a run of days on a printed log
//    sheet: split pots between Inshore (safe, low) and Offshore (risky, high),
//    survive the weather, buy pots, bank cash and chase the biggest balance.
//  • Teacher tools screen: roll the daily weather, draw a random event card
//    (Biscoes Bank, Dodgy Dave, the Inspector…), draw the lottery number and
//    roll a die for stock clearance / fish toss.
// Print-and-play like Maths Pirates. Zero deps. All original code.
import { el, shuffle } from "./quizkit.js?v=20260916a";
import { getState, save } from "./storage.js?v=20260916a";
import * as sound from "./sound.js?v=20260916a";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
const d6 = () => 1 + rint(6);

/* ---------- icons (no emoji; print-friendly) ---------- */
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

/* ---------- event cards (drawn one at a time by the teacher) ---------- */
const EVENTS = [
  { name: "Biscoes Bank", cls: "bank", icon: IC.bank, tag: "Loan shark",
    rule: "Need cash for pots? Borrow £40 from Biscoes now. Repay £15 a day for the next 3 days (£45 back). Miss a payment and the debt doubles." },
  { name: "Fisherman's Lottery", cls: "lott", icon: IC.ticket, tag: "Pick a number",
    rule: "Everyone writes a number 1–10 on their sheet. The teacher draws the winning number — match it and win £100!" },
  { name: "Dodgy Dave", cls: "dodgy", icon: IC.tag, tag: "Cheap pots",
    rule: "Dave sells pots at £3 each instead of the £5 market price. Buy as many as you dare — but write down how many, because they might be dodgy…" },
  { name: "Black Market Burt", cls: "burt", icon: IC.cash, tag: "Triple price",
    rule: "Burt buys your next day's catch at TRIPLE the price. Very tempting — but if the Inspector calls, you're in trouble." },
  { name: "The Inspector", cls: "insp", icon: IC.badge, tag: "Fines",
    rule: "Pot inspection! Any pots bought from Dodgy Dave or Burt cost a fine of £5 × dodgy pots. Caught cheating the books? Lose 50% of your bank balance." },
  { name: "Skilled Sally", cls: "sally", icon: IC.fish, tag: "Skill bonus",
    rule: "Sally sets a quick skill challenge. Bonus = (your Wins ÷ Attempts) × your current balance, added on top." },
  { name: "Stock Clearance", cls: "stock", icon: IC.dice, tag: "Sell pots",
    rule: "Sell spare pots at auction. Roll a die: sale price = dice roll × number of pots sold." },
  { name: "Fish Toss", cls: "toss", icon: IC.coin, tag: "Coin game",
    rule: "Toss a coin for each pot: heads lands a lobster worth £2, tails is a miss. Count your wins and add them up." },
];

export function initLobster(root) {
  const panel = root.querySelector(".lobster-panel");
  if (!panel) return;
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const cfg = () => {
    const s = getState(); if (!s.lobster) s.lobster = {};
    const d = s.lobster;
    if (typeof d.days !== "number") d.days = 10;
    if (typeof d.startPots !== "number") d.startPots = 5;
    if (typeof d.startCash !== "number") d.startCash = 0;
    if (typeof d.printCount !== "number") d.printCount = 8;
    if (typeof d.fairPct !== "number") d.fairPct = 75;
    return d;
  };

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    panel.innerHTML = "";
    const card = el("div", "lobster-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Print & play"));
    card.appendChild(el("h2", "dojo-title", "Lobster Pots"));
    card.appendChild(el("p", "dojo-lede", "Run a lobster-fishing business over a run of days. Each fisher gets a printed log sheet — split your pots between the safe inshore and the risky offshore, survive the weather, buy pots and bank your cash. The teacher rolls the weather and draws the event cards for the whole class."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const row = (label, sel) => { const f = el("div", "dojo-field dojo-field-inline"); f.appendChild(el("label", "dojo-lbl", label)); f.appendChild(sel); card.appendChild(f); };
    const daysSel = el("select", "dojo-select dojo-select-sm");
    [7, 10, 12, 14].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n + " days"; if (n === cfg().days) o.selected = true; daysSel.appendChild(o); });
    daysSel.addEventListener("change", () => { cfg().days = +daysSel.value; save(); });
    row("Days", daysSel);

    const potsSel = el("select", "dojo-select dojo-select-sm");
    [3, 5, 8, 10].forEach((n) => { const o = el("option"); o.value = n; o.textContent = n; if (n === cfg().startPots) o.selected = true; potsSel.appendChild(o); });
    potsSel.addEventListener("change", () => { cfg().startPots = +potsSel.value; save(); });
    row("Starting pots", potsSel);

    const cashSel = el("select", "dojo-select dojo-select-sm");
    [0, 20, 50, 100].forEach((n) => { const o = el("option"); o.value = n; o.textContent = "£" + n; if (n === cfg().startCash) o.selected = true; cashSel.appendChild(o); });
    cashSel.addEventListener("change", () => { cfg().startCash = +cashSel.value; save(); });
    row("Starting cash", cashSel);

    const btns = el("div", "dojo-editbtns");
    const printBtn = el("button", "btn primary dojo-begin", "Print log sheets");
    printBtn.addEventListener("click", () => renderPrint());
    const callBtn = el("button", "btn ghost", "Teacher tools");
    callBtn.addEventListener("click", () => startCaller());
    btns.append(printBtn, callBtn);
    card.appendChild(btns);
    card.appendChild(rulesBox());
    panel.appendChild(card);
  }

  function rulesBox() {
    const box = el("div", "lobster-legend");
    box.appendChild(el("p", "lobster-legend-title", "How it works"));
    const grid = el("div", "lobster-legend-grid");
    const items = [
      [IC.sun, "sun", "Lovely day: each inshore pot catches £1, each offshore pot £6. Offshore is the big earner."],
      [IC.storm, "storm", "Storm: each inshore pot catches £3 — but every offshore pot is DESTROYED and earns nothing."],
      [IC.boat, "boat", "Each day, split your pots between inshore (safe) and offshore (risky) before the weather is rolled."],
      [IC.cash, "cash", "New pots cost £5 each from the market. Bank your cash to keep a safe balance."],
    ];
    items.forEach(([ic, cls, txt]) => {
      const rowEl = el("div", "lobster-legend-item");
      const i = el("span", "lobster-ic " + cls); i.innerHTML = ic; rowEl.appendChild(i);
      rowEl.appendChild(el("span", "lobster-legend-name", txt));
      grid.appendChild(rowEl);
    });
    box.appendChild(grid);
    box.appendChild(el("p", "dojo-hint", `Weather each day: about ${cfg().fairPct}% lovely, ${100 - cfg().fairPct}% storm. The teacher rolls it in “Teacher tools”, then draws any event card.`));
    return box;
  }

  /* ================= TEACHER TOOLS (caller) ================= */
  let day = 1;
  function startCaller() { day = 1; renderCaller(); }
  function renderCaller() {
    panel.innerHTML = "";
    panel.appendChild(el("div", "lobster-game", `
      <div class="dojo-toprow">
        <span class="dojo-set">Lobster Pots — teacher tools</span>
        <span class="dojo-topbtns">
          <button class="icon-btn dojo-icobtn" id="loMute" title="Toggle sound" aria-label="Toggle sound"></button>
          <button class="btn ghost" id="loBack">Back</button>
        </span>
      </div>
      <div class="lobster-daybar">
        <button class="btn ghost lobster-daybtn" id="loPrev">‹</button>
        <span class="lobster-day" id="loDay"></span>
        <button class="btn ghost lobster-daybtn" id="loNext">›</button>
      </div>
      <div class="lobster-weather" id="loWeather"></div>
      <div class="lobster-toolgrid">
        <button class="btn primary lobster-tool" id="loRoll">Roll the weather</button>
        <button class="btn ghost lobster-tool" id="loEvent">Draw an event card</button>
        <button class="btn ghost lobster-tool" id="loLotto">Draw lottery number</button>
        <button class="btn ghost lobster-tool" id="loDice">Roll a die</button>
      </div>
      <div class="lobster-out" id="loOut"></div>`));
    const mute = panel.querySelector("#loMute"); mute.textContent = soundOn ? "♪" : "✕";
    mute.addEventListener("click", () => { soundOn = !soundOn; mute.textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#loBack").addEventListener("click", () => renderLobby());
    const setDay = () => { panel.querySelector("#loDay").textContent = `Day ${day} of ${cfg().days}`; panel.querySelector("#loPrev").disabled = day <= 1; panel.querySelector("#loNext").disabled = day >= cfg().days; };
    panel.querySelector("#loPrev").addEventListener("click", () => { if (day > 1) { day--; setDay(); } });
    panel.querySelector("#loNext").addEventListener("click", () => { if (day < cfg().days) { day++; setDay(); } });
    panel.querySelector("#loRoll").addEventListener("click", rollWeather);
    panel.querySelector("#loEvent").addEventListener("click", drawEvent);
    panel.querySelector("#loLotto").addEventListener("click", drawLotto);
    panel.querySelector("#loDice").addEventListener("click", rollDie);
    setDay();
  }

  function rollWeather() {
    const wEl = panel.querySelector("#loWeather");
    const btn = panel.querySelector("#loRoll"); btn.disabled = true;
    let n = 0;
    const spin = setInterval(() => {
      const roll = 1 + rint(100), fair = roll <= cfg().fairPct;
      wEl.className = "lobster-weather " + (fair ? "fair" : "storm");
      wEl.innerHTML = `<span class="lobster-wic">${fair ? IC.sun : IC.storm}</span><span class="lobster-wtext">${fair ? "Lovely" : "Storm"}</span><span class="lobster-wroll">${roll}</span>`;
      fx(sound.tick);
      if (++n >= 12) {
        clearInterval(spin);
        const roll2 = 1 + rint(100), fair2 = roll2 <= cfg().fairPct;
        wEl.className = "lobster-weather show " + (fair2 ? "fair" : "storm");
        wEl.innerHTML = `<span class="lobster-wic">${fair2 ? IC.sun : IC.storm}</span>
          <span class="lobster-wtext">${fair2 ? "Lovely day" : "Storm!"}</span>
          <span class="lobster-wroll">rolled ${roll2} / ${cfg().fairPct}</span>
          <span class="lobster-wnote">${fair2 ? "Inshore £1 · Offshore £6 a pot" : "Inshore £3 a pot · offshore pots DESTROYED"}</span>`;
        btn.disabled = false; fx(fair2 ? sound.fanfare : sound.buzz);
      }
    }, 70);
  }

  function drawEvent() {
    const ev = EVENTS[rint(EVENTS.length)];
    const out = panel.querySelector("#loOut");
    out.innerHTML = "";
    const cardEl = el("div", "lobster-eventcard " + ev.cls);
    cardEl.innerHTML = `<div class="lobster-evhead"><span class="lobster-evic">${ev.icon}</span>
        <span class="lobster-evtitles"><span class="lobster-evname">${ev.name}</span><span class="lobster-evtag">${ev.tag}</span></span></div>
      <p class="lobster-evrule">${ev.rule}</p>`;
    const row = el("div", "dojo-editbtns");
    const again = el("button", "btn ghost", "Draw another"); again.addEventListener("click", drawEvent);
    row.appendChild(again); cardEl.appendChild(row);
    out.appendChild(cardEl); fx(sound.beep);
  }

  function drawLotto() {
    const out = panel.querySelector("#loOut");
    out.innerHTML = "";
    const box = el("div", "lobster-draw");
    box.appendChild(el("p", "lobster-drawlbl", "Winning lottery number"));
    const num = el("p", "lobster-drawnum", "…"); box.appendChild(num);
    box.appendChild(el("p", "dojo-hint", "Anyone with this number on their sheet wins £100."));
    out.appendChild(box);
    let n = 0;
    const spin = setInterval(() => { num.textContent = String(1 + rint(10)); fx(sound.tick); if (++n >= 14) { clearInterval(spin); num.textContent = String(1 + rint(10)); fx(sound.fanfare); } }, 70);
  }

  function rollDie() {
    const out = panel.querySelector("#loOut");
    out.innerHTML = "";
    const box = el("div", "lobster-draw");
    box.appendChild(el("p", "lobster-drawlbl", "Dice roll"));
    const num = el("p", "lobster-drawnum", "…"); box.appendChild(num);
    box.appendChild(el("p", "dojo-hint", "For Stock Clearance (price = roll × pots sold) or any other roll."));
    out.appendChild(box);
    let n = 0;
    const spin = setInterval(() => { num.textContent = String(d6()); fx(sound.tick); if (++n >= 12) { clearInterval(spin); num.textContent = String(d6()); fx(sound.beep); } }, 70);
  }

  /* ================= PRINTABLE LOG SHEETS ================= */
  function renderPrint() {
    const count = Math.min(40, Math.max(1, cfg().printCount || 8));
    panel.innerHTML = "";
    const bar = el("div", "dojo-editbtns lobster-noprint lobster-print-bar");
    const back = el("button", "btn ghost", "← Back"); back.addEventListener("click", () => renderLobby());
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
    cardEl.appendChild(el("p", "lobster-printset", `Name: ________________   Start: ${cfg().startPots} pots · £${cfg().startCash}`));

    // Log table
    const table = el("table", "lobster-logtable");
    table.innerHTML = `<thead><tr>
      <th>Day</th><th>Pots</th><th>In</th><th>Off</th><th>Weather</th><th>Catch £</th><th>Buy</th><th>Total pots</th><th>Bank £</th><th>Balance £</th>
    </tr></thead>`;
    const tb = el("tbody");
    for (let dnum = 1; dnum <= days; dnum++) {
      const tr = el("tr");
      tr.innerHTML = `<td class="lobster-daycell">${dnum}</td>` + "<td></td>".repeat(9);
      tb.appendChild(tr);
    }
    table.appendChild(tb);

    // Rules column beside the table
    const leg = el("div", "lobster-plegend");
    leg.appendChild(el("p", "lobster-plegtitle", "The rules"));
    const legItems = [
      [IC.sun, "sun", "Lovely: inshore £1, offshore £6 a pot"],
      [IC.storm, "storm", "Storm: inshore £3 — offshore DESTROYED"],
      [IC.boat, "boat", "Choose inshore/offshore before weather"],
      [IC.cash, "cash", "Buy pots £5 each · bank to stay safe"],
      [IC.ticket, "lott", "Lottery: match the number, win £100"],
      [IC.badge, "insp", "Inspector fines dodgy pots"],
    ];
    legItems.forEach(([ic, cls, txt]) => { const s = el("span", "lobster-plegitem"); s.innerHTML = `<span class="lobster-pic ${cls}">${ic}</span> ${txt}`; leg.appendChild(s); });

    const top = el("div", "lobster-ptop");
    const tWrap = el("div", "lobster-tablewrap"); tWrap.appendChild(table);
    top.append(tWrap, leg);
    cardEl.appendChild(top);

    // Loan + lottery + notes boxes
    const foot = el("div", "lobster-pfoot");
    foot.innerHTML = `
      <div class="lobster-loanbox">
        <p class="lobster-boxlbl">Bank loan (Biscoes)</p>
        <table class="lobster-loantable"><tr><th>Borrowed</th><th>Repay/day</th><th>Days</th><th>Still owed</th></tr>
          <tr><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td></tr></table>
      </div>
      <div class="lobster-lottobox">
        <p class="lobster-boxlbl">My lottery number</p>
        <span class="lobster-lottonum"></span>
      </div>`;
    cardEl.appendChild(foot);

    const notes = el("div", "lobster-pnotes");
    notes.appendChild(el("p", "lobster-boxlbl", "Working out"));
    cardEl.appendChild(notes);

    const fin = el("div", "lobster-final");
    fin.innerHTML = `<span class="lobster-finlbl">FINAL BALANCE</span> <span class="lobster-finline"></span>`;
    cardEl.appendChild(fin);
    return cardEl;
  }

  renderLobby();
}
