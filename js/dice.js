// dice.js — a dice roller with standard notation (3d6+2, 4d6kh3, 2d20kl1, d%).
// No eval — a real parser. Rolls use crypto.getRandomValues for fair, uniform
// results. History persists in localStorage.
import { getState, save } from "./storage.js?v=20260801r";

const MAX_DICE = 100; // per term
const MAX_TERMS = 20;
const MIN_SIDES = 2;
const MAX_SIDES = 1000;

// Uniform integer in 1..sides with no modulo bias.
function rollDie(sides) {
  const range = 2 ** 32;
  const limit = range - (range % sides);
  const a = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(a);
    x = a[0];
  } while (x >= limit);
  return (x % sides) + 1;
}

class DiceError extends Error {}

// Parse notation into a list of signed terms: {sign, kind:"dice"|"int", …}.
export function parseNotation(input) {
  const s = String(input).replace(/\s+/g, "").toLowerCase();
  if (!s) throw new DiceError("Enter some dice, e.g. 3d6+2");

  const re = /^([+-]?)(?:(\d*)d(\d+|%)(kh|kl|dh|dl)?(\d*)|(\d+))/;
  const terms = [];
  let i = 0;
  while (i < s.length) {
    const m = re.exec(s.slice(i));
    if (!m) throw new DiceError(`Can't read “${s.slice(i)}” — try 3d6+2 or 2d20kh1`);
    const [full, sign, count, sidesRaw, op, opN, intVal] = m;
    const mul = sign === "-" ? -1 : 1;

    if (sidesRaw !== undefined) {
      const n = count === "" ? 1 : parseInt(count, 10);
      const sides = sidesRaw === "%" ? 100 : parseInt(sidesRaw, 10);
      if (n < 1 || n > MAX_DICE) throw new DiceError(`Dice count must be 1–${MAX_DICE}`);
      if (sides < MIN_SIDES || sides > MAX_SIDES) throw new DiceError(`Sides must be ${MIN_SIDES}–${MAX_SIDES}`);
      let keepOp = null, keepN = 0;
      if (op) {
        keepOp = op;
        keepN = opN === "" ? 1 : parseInt(opN, 10);
        if (keepN < 1) throw new DiceError("Keep/drop count must be at least 1");
      }
      terms.push({ sign: mul, kind: "dice", count: n, sides, keepOp, keepN });
    } else {
      terms.push({ sign: mul, kind: "int", value: parseInt(intVal, 10) });
    }
    i += full.length;
    if (terms.length > MAX_TERMS) throw new DiceError(`Too many terms (max ${MAX_TERMS})`);
  }
  if (!terms.some((t) => t.kind === "dice")) throw new DiceError("Add at least one die, e.g. d20");
  return terms;
}

// Which dice to keep given a keep/drop op (returns a boolean mask in roll order).
function keepMask(values, op, n) {
  const mask = values.map(() => true);
  const byValAsc = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const k = Math.min(n, values.length);
  if (op === "kh") for (let j = 0; j < values.length - k; j++) mask[byValAsc[j]] = false; // drop lowest
  else if (op === "kl") for (let j = 0; j < values.length - k; j++) mask[byValAsc[values.length - 1 - j]] = false;
  else if (op === "dh") for (let j = 0; j < k; j++) mask[byValAsc[values.length - 1 - j]] = false;
  else if (op === "dl") for (let j = 0; j < k; j++) mask[byValAsc[j]] = false;
  return mask;
}

// Roll parsed terms → { total, terms:[{…, dice:[{value,kept}], value}] }.
export function rollTerms(terms) {
  let total = 0;
  const out = terms.map((t) => {
    if (t.kind === "int") {
      total += t.sign * t.value;
      return { ...t };
    }
    const values = Array.from({ length: t.count }, () => rollDie(t.sides));
    const mask = t.keepOp ? keepMask(values, t.keepOp, t.keepN) : values.map(() => true);
    const dice = values.map((value, i) => ({ value, kept: mask[i] }));
    const sum = dice.reduce((s, d) => s + (d.kept ? d.value : 0), 0);
    total += t.sign * sum;
    return { ...t, dice, value: sum };
  });
  return { total, terms: out };
}

export function initDice(root) {
  const input = root.querySelector("#diceNotation");
  const rollBtn = root.querySelector("#diceRoll");
  const errEl = root.querySelector("#diceError");
  const resultEl = root.querySelector("#diceResult");
  const historyEl = root.querySelector("#diceHistory");
  const clearBtn = root.querySelector("#diceClear");
  if (!input) return; // tool not on this page

  const cfg = () => {
    const s = getState();
    if (!s.dice) s.dice = { notation: "", history: [] };
    return s.dice;
  };

  input.value = cfg().notation || "";
  renderHistory();

  // Live validation as you type (doesn't roll).
  input.addEventListener("input", () => {
    cfg().notation = input.value;
    save();
    if (!input.value.trim()) { errEl.hidden = true; return; }
    try { parseNotation(input.value); errEl.hidden = true; }
    catch (e) { errEl.hidden = false; errEl.textContent = e.message; }
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") roll(input.value); });

  function roll(notation) {
    let terms;
    try { terms = parseNotation(notation); }
    catch (e) { errEl.hidden = false; errEl.textContent = e.message; return; }
    errEl.hidden = true;
    input.value = notation;
    cfg().notation = notation;
    const { total, terms: rolled } = rollTerms(terms);
    renderResult(notation, total, rolled);
    record(notation, total);
  }

  let rollGen = 0; // guards against overlapping animations

  function renderResult(notation, total, terms) {
    const gen = ++rollGen;
    resultEl.innerHTML = "";
    const totalEl = document.createElement("div");
    totalEl.className = "dice-total";
    resultEl.appendChild(totalEl);

    const breakdown = document.createElement("div");
    breakdown.className = "dice-breakdown";
    const anim = []; // { el, sides, value, kept } per die, for the tumble
    terms.forEach((t, idx) => {
      if (idx > 0 || t.sign < 0) {
        const op = document.createElement("span");
        op.className = "dice-op";
        op.textContent = t.sign < 0 ? "−" : "+";
        breakdown.appendChild(op);
      }
      if (t.kind === "int") {
        const n = document.createElement("span");
        n.className = "dice-mod";
        n.textContent = t.value;
        breakdown.appendChild(n);
      } else {
        const grp = document.createElement("span");
        grp.className = "dice-group";
        t.dice.forEach((d) => {
          const c = document.createElement("span");
          c.className = "die-chip";
          c.textContent = d.value;
          grp.appendChild(c);
          anim.push({ el: c, sides: t.sides, value: d.value, kept: d.kept });
        });
        breakdown.appendChild(grp);
      }
    });
    resultEl.appendChild(breakdown);

    const settle = () => {
      anim.forEach((d) => {
        d.el.textContent = d.value;
        d.el.classList.toggle("dropped", !d.kept);
        d.el.classList.remove("rolling");
      });
      totalEl.textContent = total;
      totalEl.classList.remove("pop"); void totalEl.offsetWidth; totalEl.classList.add("pop");
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !anim.length) { settle(); return; }

    // Brief tumble: cycle random faces, then settle on the real result.
    anim.forEach((d) => d.el.classList.add("rolling"));
    const duration = 600, start = performance.now();
    const frame = () => {
      if (gen !== rollGen) return; // a newer roll superseded this one
      if (performance.now() - start >= duration) { settle(); return; }
      anim.forEach((d) => { d.el.textContent = 1 + Math.floor(Math.random() * d.sides); });
      totalEl.textContent = anim.reduce((s, d) => s + Number(d.el.textContent), 0);
      setTimeout(frame, 55);
    };
    frame();
  }

  function record(notation, total) {
    const h = cfg().history;
    h.unshift({ notation, total, at: Date.now() });
    if (h.length > 20) h.length = 20;
    save();
    renderHistory();
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    cfg().history.forEach((r) => {
      const li = document.createElement("li");
      const n = document.createElement("span");
      n.textContent = r.notation;
      const t = document.createElement("span");
      t.className = "h-time";
      t.textContent = r.total;
      li.append(n, t);
      historyEl.appendChild(li);
    });
  }

  rollBtn.addEventListener("click", () => roll(input.value));
  root.querySelectorAll("[data-die]").forEach((b) =>
    b.addEventListener("click", () => roll("1d" + b.dataset.die))
  );
  root.querySelectorAll("[data-dice]").forEach((b) =>
    b.addEventListener("click", () => roll(b.dataset.dice))
  );
  clearBtn.addEventListener("click", () => { cfg().history = []; save(); renderHistory(); });
}
