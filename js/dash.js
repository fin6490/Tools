// dash.js — Quiz Dash: a geometry-dash-style auto-runner with AI question gates.
// You type a topic; the Dojo generator (Claude via the Worker) writes the
// questions. Run and jump the spikes; at each glowing gate the game pauses for
// a multiple-choice question — right keeps your streak, wrong costs a heart.
// Zero deps, canvas 2D. Solo revision that's actually fun.
import { el, shuffle, escapeHtml, mathHtml, generateSet, allSets } from "./quizkit.js?v=20261017a";
import { SUPPORT } from "./support.js?v=20261017a";
import { getState, save } from "./storage.js?v=20261017a";
import * as sound from "./sound.js?v=20261017a";

export function initDash(root) {
  const panel = root.querySelector(".dash-panel");
  if (!panel) return;

  const cfg = () => { const s = getState(); if (!s.dash) s.dash = { topic: "", best: 0 }; if (typeof s.dash.best !== "number") s.dash.best = 0; return s.dash; };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const answersOf = (q) => (Array.isArray(q.answers) && q.answers.length) ? q.answers : [q.a];

  let raf = null, keyHandler = null;
  const stopLoop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };
  const disarmKeys = () => { if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; } };

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    stopLoop(); disarmKeys();
    panel.innerHTML = "";
    const card = el("div", "dash-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Solo quiz runner"));
    card.appendChild(el("h2", "dojo-title", "Quiz Dash"));
    card.appendChild(el("p", "dojo-lede", "Pick a topic and we'll generate the questions. Run and jump the spikes — at each gate, answer to keep going. A right answer builds your streak; a wrong one costs a heart. How far can you get?"));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const aiOn = !!SUPPORT.dojoGenerateEndpoint;
    const form = el("div", "dash-form");
    const topic = el("input", "dojo-input"); topic.placeholder = "Topic — e.g. Year 8 fractions, WW2, the water cycle"; topic.maxLength = 80; topic.value = cfg().topic || "";
    const go = el("button", "btn primary", "Generate & play");
    const note = el("p", "muted dash-note"); note.hidden = true;
    const play = async () => {
      const t = topic.value.trim();
      if (!aiOn) { note.hidden = false; note.textContent = "AI generation isn't switched on for this site — pick a saved set below instead."; return; }
      if (!t) { topic.focus(); return; }
      cfg().topic = t; save();
      go.disabled = true; go.textContent = "Writing questions…"; note.hidden = true;
      try {
        const set = await generateSet(t, 12);
        startGame(set.questions, t);
      } catch {
        note.hidden = false; note.textContent = "Couldn't generate that one — try a simpler topic, or pick a saved set below.";
        go.disabled = false; go.textContent = "Generate & play";
      }
    };
    go.addEventListener("click", play);
    topic.addEventListener("keydown", (e) => { if (e.key === "Enter") play(); });
    form.append(topic, go);
    card.append(form, note);

    // Fallback / offline: play from a saved quiz set.
    const sets = allSets();
    if (sets.length) {
      const or = el("div", "dash-orrow");
      or.appendChild(el("span", "muted", "or play a saved set:"));
      const sel = el("select", "dojo-select dojo-select-sm");
      sets.forEach((s) => { const o = el("option"); o.value = s.id; o.textContent = `${s.name} (${s.questions.length})`; sel.appendChild(o); });
      const b = el("button", "btn ghost", "Play set");
      b.addEventListener("click", () => { const s = sets.find((x) => x.id === sel.value) || sets[0]; if (s && s.questions.length) startGame(s.questions, s.name); });
      or.append(sel, b);
      card.appendChild(or);
    }

    card.appendChild(el("p", "dojo-hint", `Controls: Space, tap or click to jump. Best run: ${cfg().best || 0} m.`));
    panel.appendChild(card);
  }

  /* ================= GAME ================= */
  // Build a 4-way multiple choice for a question (correct + distractors, padded
  // from other questions' answers if needed).
  function optionsFor(q, pool) {
    const correct = answersOf(q)[0];
    const norm = (s) => String(s).trim().toLowerCase();
    const seen = new Set([norm(correct)]);
    const opts = [correct];
    (q.distractors || []).forEach((d) => { if (d && !seen.has(norm(d))) { seen.add(norm(d)); opts.push(d); } });
    for (const other of shuffle(pool)) { if (opts.length >= 4) break; const v = answersOf(other)[0]; if (v && !seen.has(norm(v))) { seen.add(norm(v)); opts.push(v); } }
    return shuffle(opts).slice(0, 4);
  }

  function startGame(questions, topicName) {
    stopLoop(); disarmKeys();
    const qs = questions.filter((q) => q && q.q && answersOf(q)[0]);
    if (!qs.length) return renderLobby("That set had no usable questions.");

    panel.innerHTML = "";
    const wrap = el("div", "dash-game");
    wrap.innerHTML = `
      <div class="dojo-toprow">
        <span class="dojo-set">${escapeHtml(topicName).slice(0, 40)}</span>
        <span class="dojo-topbtns">
          <span class="dash-hud"><span id="dashHearts" class="dash-hearts"></span><span id="dashScore" class="dash-score">0 m</span></span>
          <button class="icon-btn dojo-icobtn" id="dashMute" title="Toggle sound" aria-label="Toggle sound">${soundOn ? "♪" : "✕"}</button>
          <button class="btn ghost" id="dashQuit">Quit</button>
        </span>
      </div>
      <div class="dash-stage">
        <canvas id="dashCanvas" class="dash-canvas"></canvas>
        <div class="dash-overlay" id="dashOverlay" hidden></div>
      </div>
      <p class="dojo-hint dash-foot">Space / tap / click to jump.</p>`;
    panel.appendChild(wrap);
    panel.querySelector("#dashMute").addEventListener("click", () => { soundOn = !soundOn; panel.querySelector("#dashMute").textContent = soundOn ? "♪" : "✕"; });
    panel.querySelector("#dashQuit").addEventListener("click", () => renderLobby());

    const canvas = panel.querySelector("#dashCanvas");
    const ctx = canvas.getContext("2d");
    const overlay = panel.querySelector("#dashOverlay");
    const heartsEl = panel.querySelector("#dashHearts");
    const scoreEl = panel.querySelector("#dashScore");

    // World (logical units; we scale to the canvas size).
    const W = 800, H = 320, GROUND = H - 54;
    function fit() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const cw = Math.max(280, rect.width), ch = Math.round(cw * (H / W));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      ctx.setTransform((cw * dpr) / W, 0, 0, (ch * dpr) / H, 0, 0); // draw in W×H logical space
    }
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    const state = {
      x: 120, y: GROUND, vy: 0, onGround: true,
      speed: 230, dist: 0, hearts: 3, over: false, paused: false,
      spikes: [], gate: null, nextSpike: 400, nextGate: 700,
      qi: 0, streak: 0, invuln: 0, t: 0,
    };
    const GRAV = 1750, JUMP = -620;
    const qIndex = shuffle(qs.map((_, i) => i)); // question order

    function renderHearts() { heartsEl.innerHTML = "♥".repeat(Math.max(0, state.hearts)).split("").map(() => '<span class="dash-heart">♥</span>').join(""); }
    renderHearts();

    function jump() {
      if (state.over || state.paused) return;
      if (state.onGround) { state.vy = JUMP; state.onGround = false; fx(sound.tick); }
    }
    canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); jump(); });
    keyHandler = (e) => {
      if (e.key !== " " && e.code !== "Space" && e.key !== "ArrowUp") return;
      const tag = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag)) return;
      e.preventDefault(); jump();
    };
    document.addEventListener("keydown", keyHandler);

    function askQuestion() {
      state.paused = true;
      const q = qs[qIndex[state.qi % qIndex.length]]; state.qi++;
      overlay.hidden = false; overlay.innerHTML = "";
      const box = el("div", "dash-qbox");
      box.appendChild(el("p", "dash-qlabel", "Question gate — answer to pass"));
      box.appendChild(el("div", "dash-q", mathHtml(q.q)));
      const opts = el("div", "dash-opts");
      optionsFor(q, qs).forEach((opt) => {
        const b = el("button", "btn dash-opt", mathHtml(String(opt)));
        b.addEventListener("click", () => {
          const ok = answersOf(q).map((a) => String(a).trim().toLowerCase()).includes(String(opt).trim().toLowerCase());
          [...opts.children].forEach((c) => (c.disabled = true));
          b.classList.add(ok ? "right" : "wrong");
          if (ok) { state.streak++; state.dist += 60; fx(sound.fanfare); }
          else { state.streak = 0; loseHeart(); fx(sound.buzz); }
          setTimeout(() => {
            overlay.hidden = true; overlay.innerHTML = "";
            if (!state.over) { state.paused = false; state.gate = null; state.speed = Math.min(430, state.speed + 14); state.nextGate = state.dist + 620 + Math.random() * 260; }
          }, ok ? 450 : 900);
        });
        opts.appendChild(b);
      });
      box.appendChild(opts);
      overlay.appendChild(box);
    }

    function loseHeart() {
      state.hearts--; renderHearts(); state.invuln = 1.1;
      if (state.hearts <= 0) gameOver();
    }
    function gameOver() {
      state.over = true; stopLoop(); disarmKeys(); window.removeEventListener("resize", onResize);
      const m = Math.floor(state.dist / 10);
      if (m > (cfg().best || 0)) { cfg().best = m; save(); }
      overlay.hidden = false;
      overlay.innerHTML = `<div class="dash-qbox dash-gameover">
        <p class="dash-qlabel">Run over</p>
        <p class="dash-finalscore">${m} m</p>
        <p class="muted">Best: ${cfg().best} m</p>
        <div class="dojo-editbtns"></div></div>`;
      const row = overlay.querySelector(".dojo-editbtns");
      const again = el("button", "btn primary", "Run again"); again.addEventListener("click", () => startGame(questions, topicName));
      const back = el("button", "btn ghost", "New topic"); back.addEventListener("click", () => renderLobby());
      row.append(again, back);
    }

    let last = performance.now();
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!canvas.isConnected) { stopLoop(); return; }
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; // clamp after tab-switch
      if (!state.paused && !state.over) step(dt);
      draw();
    }
    function step(dt) {
      state.t += dt;
      state.dist += state.speed * dt;
      scoreEl.textContent = Math.floor(state.dist / 10) + " m";
      if (state.invuln > 0) state.invuln -= dt;
      // player physics
      state.vy += GRAV * dt; state.y += state.vy * dt;
      if (state.y >= GROUND) { state.y = GROUND; state.vy = 0; state.onGround = true; }
      // spikes
      state.spikes.forEach((s) => { s.x -= state.speed * dt; });
      state.spikes = state.spikes.filter((s) => s.x > -40);
      if (state.dist > state.nextSpike && !state.gate) {
        state.spikes.push({ x: W + 20, w: 26 + Math.random() * 14 });
        state.nextSpike = state.dist + 180 + Math.random() * 220;
      }
      // gate
      if (!state.gate && state.dist > state.nextGate) { state.gate = { x: W + 20 }; }
      if (state.gate) {
        state.gate.x -= state.speed * dt;
        if (state.gate.x <= state.x) { askQuestion(); } // reached the gate → quiz
      }
      // collisions with spikes
      if (state.invuln <= 0) {
        for (const s of state.spikes) {
          const px = state.x, pw = 30;
          if (s.x < px + pw && s.x + s.w > px && state.y > GROUND - 26) { loseHeart(); break; }
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      // sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1b1230"); g.addColorStop(1, "#2a1b4a"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // ground
      ctx.fillStyle = "#120b22"; ctx.fillRect(0, GROUND + 26, W, H - GROUND - 26);
      ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, GROUND + 26); ctx.lineTo(W, GROUND + 26); ctx.stroke();
      // gate
      if (state.gate) {
        ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = "#ffcf4d";
        ctx.fillRect(state.gate.x, 40, 8, GROUND - 14); ctx.restore();
        ctx.fillStyle = "rgba(255,207,77,.18)"; ctx.fillRect(state.gate.x - 6, 40, 20, GROUND - 14);
      }
      // spikes
      ctx.fillStyle = "#ff5b52";
      state.spikes.forEach((s) => { ctx.beginPath(); ctx.moveTo(s.x, GROUND + 26); ctx.lineTo(s.x + s.w / 2, GROUND - 2); ctx.lineTo(s.x + s.w, GROUND + 26); ctx.closePath(); ctx.fill(); });
      // player
      const blink = state.invuln > 0 && Math.floor(state.t * 12) % 2 === 0;
      ctx.fillStyle = blink ? "#6b4bd8" : "#3fd0c9";
      const px = state.x, py = state.y;
      roundRect(ctx, px, py - 30, 30, 30, 7); ctx.fill();
      ctx.fillStyle = "#06231f"; ctx.fillRect(px + 19, py - 22, 5, 5); // eye
    }
    function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

    raf = requestAnimationFrame(loop);
  }

  renderLobby();
}
