// counter.js — multiple named tally counters (spins, score, deaths, slot pulls…).
import { getState, save } from "./storage.js?v=20260730g";

export function initCounters(root) {
  const grid = root.querySelector("#counterGrid");
  const addBtn = root.querySelector("#addCounter");

  function render() {
    const { counters } = getState();
    grid.innerHTML = "";
    counters.forEach((c) => grid.appendChild(card(c)));
  }

  function card(c) {
    const el = document.createElement("div");
    el.className = "counter-card";

    const name = document.createElement("input");
    name.className = "c-name";
    name.value = c.name;
    name.setAttribute("aria-label", "Counter name");
    name.addEventListener("input", () => { c.name = name.value; save(); });

    const value = document.createElement("div");
    value.className = "counter-value";
    value.textContent = c.value;

    const btns = document.createElement("div");
    btns.className = "counter-btns";
    const minus = mkBtn("−", "c-step", () => bump(c, value, -c.step));
    const plus = mkBtn("+", "c-step big", () => bump(c, value, +c.step));
    btns.append(minus, plus);

    const foot = document.createElement("div");
    foot.className = "counter-foot";
    const stepWrap = document.createElement("label");
    stepWrap.className = "muted";
    stepWrap.style.fontSize = "12px";
    const step = document.createElement("input");
    step.type = "number"; step.min = "1"; step.value = c.step;
    step.style.width = "48px"; step.style.marginLeft = "4px";
    step.setAttribute("aria-label", "Step size");
    step.addEventListener("input", () => { c.step = Math.max(1, Number(step.value) || 1); save(); });
    stepWrap.append("step:", step);

    const reset = document.createElement("button");
    reset.className = "link-btn"; reset.textContent = "reset";
    reset.addEventListener("click", () => { c.value = 0; value.textContent = 0; save(); });

    const del = document.createElement("button");
    del.className = "link-btn"; del.textContent = "delete";
    del.addEventListener("click", () => remove(c.id));

    foot.append(stepWrap, reset, del);
    el.append(name, value, btns, foot);
    return el;
  }

  function mkBtn(label, cls, fn) {
    const b = document.createElement("button");
    b.className = cls; b.textContent = label; b.addEventListener("click", fn);
    return b;
  }

  function bump(c, valueEl, by) {
    c.value = Math.max(0, c.value + by);
    valueEl.textContent = c.value;
    save();
  }

  function remove(id) {
    const s = getState();
    s.counters = s.counters.filter((x) => x.id !== id);
    save(); render();
  }

  addBtn.addEventListener("click", () => {
    const s = getState();
    s.counters.push({ id: crypto.randomUUID(), name: "Counter " + (s.counters.length + 1), value: 0, step: 1 });
    save(); render();
  });

  render();

  // expose a hook so the wheel can auto-increment a "Spins" counter if present
  return {
    incrementSpins() {
      const s = getState();
      const spins = s.counters.find((c) => /spin/i.test(c.name));
      if (spins) { spins.value += 1; save(); render(); }
    },
  };
}
