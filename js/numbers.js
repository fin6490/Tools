// numbers.js — a random number generator (range, count, no-repeats, presets).
import { getState, save } from "./storage.js?v=20260801k";

const PRESETS = {
  dice:    { min: 1, max: 6,  count: 1, unique: false },
  d20:     { min: 1, max: 20, count: 1, unique: false },
  coin:    { min: 1, max: 2,  count: 1, unique: false }, // shown as Heads/Tails
  h100:    { min: 1, max: 100, count: 1, unique: false },
  lottery: { min: 1, max: 49, count: 6, unique: true },
};

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function initNumbers(root) {
  const minEl = root.querySelector("#numMin");
  const maxEl = root.querySelector("#numMax");
  const countEl = root.querySelector("#numCount");
  const uniqueEl = root.querySelector("#numUnique");
  const resultEl = root.querySelector("#numResult");
  const metaEl = root.querySelector("#numMeta");
  const copyBtn = root.querySelector("#numCopy");
  const genBtn = root.querySelector("#numGenerate");

  const cfg = () => {
    const s = getState();
    if (!s.numbers) s.numbers = { min: 1, max: 100, count: 1, unique: false };
    return s.numbers;
  };

  // restore
  const c = cfg();
  minEl.value = c.min; maxEl.value = c.max; countEl.value = c.count; uniqueEl.checked = c.unique;

  // Persist raw values as typed — do NOT reorder here (that fights typing).
  function persist() {
    Object.assign(cfg(), {
      min: Math.round(Number(minEl.value) || 0),
      max: Math.round(Number(maxEl.value) || 0),
      count: Math.max(1, Math.round(Number(countEl.value) || 1)),
      unique: uniqueEl.checked,
    });
    save();
  }
  [minEl, maxEl, countEl, uniqueEl].forEach((el) => el.addEventListener("input", persist));

  function generate() {
    // Normalise only now: swap if min > max, then reflect it in the fields.
    let min = Math.round(Number(minEl.value) || 0);
    let max = Math.round(Number(maxEl.value) || 0);
    if (min > max) { [min, max] = [max, min]; }
    minEl.value = min; maxEl.value = max;
    const count = Math.max(1, Math.round(Number(countEl.value) || 1));
    const unique = uniqueEl.checked;
    Object.assign(cfg(), { min, max, count, unique });
    save();
    const rangeSize = max - min + 1;
    let n = count;
    let note = "";
    let nums = [];

    if (unique) {
      if (n > rangeSize) { n = rangeSize; note = `only ${rangeSize} unique values in range`; }
      // partial Fisher–Yates over the range
      const pool = Array.from({ length: rangeSize }, (_, i) => min + i);
      for (let i = 0; i < n; i++) {
        const j = i + Math.floor(Math.random() * (rangeSize - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        nums.push(pool[i]);
      }
    } else {
      for (let i = 0; i < n; i++) nums.push(randInt(min, max));
    }

    renderResult(nums, note);
  }

  function renderResult(nums, note) {
    resultEl.innerHTML = "";
    const coin = cfg().min === 1 && cfg().max === 2; // friendly coin labels
    nums.forEach((v) => {
      const chip = document.createElement("span");
      chip.className = "num-chip" + (nums.length === 1 ? " solo" : "");
      chip.textContent = coin ? (v === 1 ? "Heads" : "Tails") : String(v);
      resultEl.appendChild(chip);
    });
    let meta = "";
    if (nums.length > 1) {
      const sum = nums.reduce((a, b) => a + b, 0);
      meta = `${nums.length} numbers · sum ${sum} · mean ${(sum / nums.length).toFixed(1)}`;
    }
    if (note) meta = meta ? `${meta} · ${note}` : note;
    metaEl.textContent = meta;
    copyBtn.hidden = !nums.length;
    copyBtn._value = nums.join(", ");
  }

  genBtn.addEventListener("click", generate);
  root.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      const preset = PRESETS[b.dataset.preset];
      if (!preset) return;
      minEl.value = preset.min; maxEl.value = preset.max;
      countEl.value = preset.count; uniqueEl.checked = preset.unique;
      generate();
    })
  );

  copyBtn.addEventListener("click", () => {
    navigator.clipboard?.writeText(copyBtn._value || "");
    const orig = copyBtn.textContent;
    copyBtn.textContent = "Copied";
    setTimeout(() => { copyBtn.textContent = orig; }, 1400);
  });
}
