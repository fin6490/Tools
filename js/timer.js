// timer.js — countdown + stopwatch. Drift-free (uses timestamps, not tick sums).
import * as sound from "./sound.js?v=20260729b";

export function initTimer(root) {
  const display = root.querySelector("#timerDisplay");
  const startBtn = root.querySelector("#timerStart");
  const pauseBtn = root.querySelector("#timerPause");
  const resetBtn = root.querySelector("#timerReset");
  const setupBox = root.querySelector("#countdownSetup");
  const beepChk = root.querySelector("#timerBeep");
  const modeBtns = root.querySelectorAll("[data-timer-mode]");

  let mode = "countdown";
  let targetSecs = 300; // configured countdown length
  let remaining = 300;  // countdown seconds left
  let elapsed = 0;      // stopwatch seconds
  let running = false;
  let anchor = 0;       // performance.now() at last start
  let raf = null;

  function fmt(total) {
    total = Math.max(0, Math.floor(total));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function render() {
    const val = mode === "countdown" ? remaining : elapsed;
    display.textContent = fmt(val);
    display.classList.toggle("ending", mode === "countdown" && remaining <= 10 && remaining > 0 && running);
  }

  function loop(now) {
    if (!running) return;
    const dt = (now - anchor) / 1000;
    anchor = now;
    if (mode === "countdown") {
      remaining -= dt;
      if (remaining <= 0) {
        remaining = 0; running = false;
        render();
        if (beepChk.checked) sound.beep();
        return;
      }
    } else {
      elapsed += dt;
    }
    render();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    if (mode === "countdown" && remaining <= 0) remaining = targetSecs;
    running = true;
    anchor = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); }
  function reset() {
    pause();
    if (mode === "countdown") remaining = targetSecs;
    else elapsed = 0;
    render();
  }

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", pause);
  resetBtn.addEventListener("click", reset);

  modeBtns.forEach((b) =>
    b.addEventListener("click", () => {
      modeBtns.forEach((x) => x.classList.toggle("is-active", x === b));
      mode = b.dataset.timerMode;
      setupBox.style.display = mode === "countdown" ? "" : "none";
      pause();
      if (mode === "countdown") remaining = targetSecs; else elapsed = 0;
      render();
    })
  );

  root.querySelectorAll(".preset-row .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      targetSecs = Number(chip.dataset.secs);
      remaining = targetSecs;
      root.querySelector("#mmIn").value = Math.floor(targetSecs / 60);
      root.querySelector("#ssIn").value = targetSecs % 60;
      pause(); render();
    })
  );

  root.querySelector("#setTimeBtn").addEventListener("click", () => {
    const mm = Math.max(0, Number(root.querySelector("#mmIn").value) || 0);
    const ss = Math.min(59, Math.max(0, Number(root.querySelector("#ssIn").value) || 0));
    targetSecs = mm * 60 + ss;
    remaining = targetSecs;
    pause(); render();
  });

  render();
}
