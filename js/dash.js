// dash.js — Quiz Dash: a geometry-dash-style auto-runner with quiz gates.
// Type a topic; maths topics (times tables, +, −, ÷, squares…) are generated
// locally so the answers are always correct, and everything else is written by
// the Dojo generator (Claude via the Worker). Run and jump the spikes; at each
// glowing gate answer a multiple-choice question — a right answer builds your
// streak and earns powerups, a wrong one (or a spike) costs a heart. Levels get
// faster and busier the further you go, and there's a global high-score board.
// Zero deps, canvas 2D.
import { el, shuffle, escapeHtml, mathHtml, generateSet, allSets } from "./quizkit.js?v=20261019h";
import { SUPPORT } from "./support.js?v=20261019h";
import { getState, save } from "./storage.js?v=20261019h";
import { SUPABASE_ENABLED } from "./supa-config.js?v=20261019h";
import { topDashScores, submitDashScore } from "./supa.js?v=20261019h";
import * as sound from "./sound.js?v=20261019h";

const rint = (n) => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };

// Difficulty presets: starting speed, speed ramp, spike gap [base,min], gate gap
// [base,rand], the speed ceiling, and the level from which double spikes appear.
const DIFF = {
  chill:  { label: "Chill",  speed: 200, maxSpeed: 360, spikeGap: [230, 150], gateGap: [700, 260], doubleFrom: 99 },
  normal: { label: "Normal", speed: 245, maxSpeed: 480, spikeGap: [185, 115], gateGap: [600, 240], doubleFrom: 4 },
  hard:   { label: "Hard",   speed: 300, maxSpeed: 580, spikeGap: [150, 90],  gateGap: [540, 200], doubleFrom: 2 },
};
const LEVEL_M = 220;   // metres per level
const MAX_HEARTS = 5;

export function initDash(root) {
  const panel = root.querySelector(".dash-panel");
  if (!panel) return;

  const cfg = () => {
    const s = getState(); if (!s.dash) s.dash = {};
    const d = s.dash;
    if (typeof d.topic !== "string") d.topic = "";
    if (typeof d.best !== "number") d.best = 0;
    if (!DIFF[d.difficulty]) d.difficulty = "normal";
    if (typeof d.name !== "string") d.name = "";
    return d;
  };
  let soundOn = getState().soundOn !== false;
  const fx = (fn) => { if (soundOn) try { fn(); } catch {} };
  const answersOf = (q) => (Array.isArray(q.answers) && q.answers.length) ? q.answers : [q.a];

  let raf = null, keyHandler = null;
  const stopLoop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };
  const disarmKeys = () => { if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; } };

  /* ================= LOCAL MATHS GENERATOR =================
     The AI writer hallucinates on arithmetic, so recognisable maths topics are
     built here with guaranteed-correct answers and near-miss distractors. */
  function localMathSet(topic) {
    const t = String(topic || "").toLowerCase();
    const N = 18;
    const rnd = (lo, hi) => lo + rint(hi - lo + 1);
    const mk = (q, a, distractors) => ({ q, a: String(a), distractors: distractors.map(String) });
    const numDistract = (ans, extra = []) => {
      const cand = [...extra, ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + 5, ans - 5];
      const out = [], seen = new Set([ans]);
      for (const c of cand) { if (Number.isFinite(c) && c >= 0 && !seen.has(c)) { seen.add(c); out.push(c); } if (out.length >= 3) break; }
      let k = ans + 3; while (out.length < 3) { if (k >= 0 && !seen.has(k)) { seen.add(k); out.push(k); } k++; }
      return out.slice(0, 3);
    };
    const has = (re) => re.test(t);
    let name = null, make = null;

    const tbl = t.match(/(\d{1,2})\s*(?:times?\s*table|x\b|×)/) || t.match(/times?\s*table[s]?\s*(?:of|for)\s*(\d{1,2})/);
    if (has(/times?\s*table/) || has(/multiplicat/) || has(/\btimes\b/)) {
      const n = tbl ? Math.max(1, Math.min(20, +tbl[1])) : null;
      if (n) { name = `${n} times table`; make = () => { const a = rnd(1, 12), ans = a * n; return mk(`${a} \\times ${n}`, ans, numDistract(ans, [a * (n + 1), a * (n - 1), (a + 1) * n, a + n])); }; }
      else { name = "Times tables"; make = () => { const a = rnd(2, 12), b = rnd(2, 12), ans = a * b; return mk(`${a} \\times ${b}`, ans, numDistract(ans, [a * (b + 1), (a + 1) * b, a + b, ans + a])); }; }
    } else if (has(/divi|÷/)) {
      name = "Division"; make = () => { const b = rnd(2, 12), q = rnd(2, 12), a = b * q; return mk(`${a} \\div ${b}`, q, numDistract(q, [q + 1, q - 1, b, a - b])); };
    } else if (has(/add|plus|\bsum|bond/)) {
      name = "Addition"; make = () => { const a = rnd(2, 50), b = rnd(2, 50), ans = a + b; return mk(`${a} + ${b}`, ans, numDistract(ans, [ans + 10, ans - 10, Math.abs(a - b)])); };
    } else if (has(/subtr|minus|take\s*away|difference/)) {
      name = "Subtraction"; make = () => { const a = rnd(10, 60), b = rnd(1, a), ans = a - b; return mk(`${a} − ${b}`, ans, numDistract(ans, [a + b, ans + 10, Math.abs(ans - 2)])); };
    } else if (has(/square/)) {
      name = "Square numbers"; make = () => { const n = rnd(2, 15), ans = n * n; return mk(`${n}^2`, ans, numDistract(ans, [n * 2, (n + 1) * (n + 1), (n - 1) * (n - 1)])); };
    } else if (has(/double|doubling/)) {
      name = "Doubling"; make = () => { const n = rnd(2, 50), ans = n * 2; return mk(`double ${n}`, ans, numDistract(ans, [n, ans + 2, Math.round(n / 2)])); };
    } else if (has(/halv|half/)) {
      name = "Halving"; make = () => { const n = rnd(1, 40) * 2, ans = n / 2; return mk(`half of ${n}`, ans, numDistract(ans, [n, ans + 1, ans - 1])); };
    }
    if (!make) return null;
    const qs = [], seenQ = new Set(); let guard = 0;
    while (qs.length < N && guard++ < N * 14) { const q = make(); if (seenQ.has(q.q)) continue; seenQ.add(q.q); qs.push(q); }
    return { id: "math-local", name, questions: qs };
  }

  /* ================= LOBBY ================= */
  function renderLobby(flash) {
    stopLoop(); disarmKeys();
    panel.innerHTML = "";
    const card = el("div", "dash-lobby");
    card.appendChild(el("p", "dojo-eyebrow", "Solo quiz runner"));
    card.appendChild(el("h2", "dojo-title", "Quiz Dash"));
    card.appendChild(el("p", "dojo-lede", "Pick a topic and we'll generate the questions. Run and jump the spikes — at each gate, answer to keep going. Build a streak for shields and extra hearts; the further you get, the faster and busier it becomes."));
    if (flash) card.appendChild(el("p", "dojo-flash", flash));

    const aiOn = !!SUPPORT.dojoGenerateEndpoint;
    const form = el("div", "dash-form");
    const topic = el("input", "dojo-input"); topic.placeholder = "Topic — e.g. 7 times table, Year 8 fractions, WW2"; topic.maxLength = 80; topic.value = cfg().topic || "";
    const go = el("button", "btn primary", "Generate & play");
    const note = el("p", "muted dash-note"); note.hidden = true;
    const play = async () => {
      const t = topic.value.trim();
      if (!t) { topic.focus(); return; }
      cfg().topic = t; save();
      const local = localMathSet(t);
      if (local) { startGame(local.questions, local.name); return; }
      if (!aiOn) { note.hidden = false; note.textContent = "AI generation isn't switched on for this site — try a maths topic (e.g. “8 times table”) or pick a saved set below."; return; }
      go.disabled = true; go.textContent = "Writing questions…"; note.hidden = true;
      try { const set = await generateSet(t, 12); startGame(set.questions, t); }
      catch { note.hidden = false; note.textContent = "Couldn't generate that one — try a maths topic, or pick a saved set below."; go.disabled = false; go.textContent = "Generate & play"; }
    };
    go.addEventListener("click", play);
    topic.addEventListener("keydown", (e) => { if (e.key === "Enter") play(); });
    form.append(topic, go);
    card.append(form, note);

    // Instant, always-correct maths quick-picks.
    const quick = el("div", "dash-quick");
    quick.appendChild(el("span", "muted dash-quicklbl", "Quick maths:"));
    [["Times tables", "times tables"], ["Addition", "addition"], ["Subtraction", "subtraction"], ["Division", "division"], ["Squares", "square numbers"], ["Doubling", "doubling"]]
      .forEach(([label, t]) => { const b = el("button", "chip dash-chip", label); b.addEventListener("click", () => { const s = localMathSet(t); if (s) { cfg().topic = t; save(); startGame(s.questions, s.name); } }); quick.appendChild(b); });
    card.appendChild(quick);

    // Difficulty.
    const diffRow = el("div", "dash-diffrow");
    diffRow.appendChild(el("span", "muted", "Difficulty:"));
    const seg = el("div", "seg-toggle dash-diff");
    Object.keys(DIFF).forEach((k) => { const b = el("button", "seg" + (cfg().difficulty === k ? " is-active" : ""), DIFF[k].label); b.addEventListener("click", () => { cfg().difficulty = k; save(); [...seg.children].forEach((c) => c.classList.remove("is-active")); b.classList.add("is-active"); }); seg.appendChild(b); });
    diffRow.appendChild(seg);
    card.appendChild(diffRow);

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

    // Global leaderboard.
    if (SUPABASE_ENABLED) {
      const board = el("div", "dash-board");
      board.innerHTML = `<p class="dash-boardttl">🏆 Global high scores</p><p class="muted dash-boardload">Loading…</p>`;
      card.appendChild(board);
      fillBoard(board);
    }
    panel.appendChild(card);
  }

  // Render the top runs into a container (used in the lobby and on game over).
  async function fillBoard(container, highlight) {
    const rows = await topDashScores(12);
    container.querySelector(".dash-boardload")?.remove();
    const old = container.querySelector(".dash-boardlist"); if (old) old.remove();
    const list = el("ol", "dash-boardlist");
    if (!rows.length) { list.appendChild(el("li", "muted", "No scores yet — be the first!")); }
    rows.forEach((r) => {
      const li = el("li", "dash-boardrow");
      const hit = highlight && r.name === highlight.name && r.score === highlight.score;
      if (hit) li.classList.add("you");
      li.innerHTML = `<span class="dash-brank"></span><span class="dash-bname">${escapeHtml(r.name)}</span><span class="dash-btopic muted">${escapeHtml(r.topic || "")}</span><span class="dash-bscore">${r.score} m</span>`;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  /* ================= GAME ================= */
  function optionsFor(q, pool) {
    const correct = answersOf(q)[0];
    const norm = (s) => String(s).trim().toLowerCase();
    const seen = new Set([norm(correct)]);
    const opts = [correct];
    (q.distractors || []).forEach((d) => { if (d != null && !seen.has(norm(d))) { seen.add(norm(d)); opts.push(d); } });
    for (const other of shuffle(pool)) { if (opts.length >= 4) break; const v = answersOf(other)[0]; if (v != null && !seen.has(norm(v))) { seen.add(norm(v)); opts.push(v); } }
    return shuffle(opts).slice(0, 4);
  }

  function startGame(questions, topicName) {
    stopLoop(); disarmKeys();
    const qs = questions.filter((q) => q && q.q && answersOf(q)[0] != null);
    if (!qs.length) return renderLobby("That set had no usable questions.");
    const diff = DIFF[cfg().difficulty] || DIFF.normal;

    panel.innerHTML = "";
    const wrap = el("div", "dash-game");
    wrap.innerHTML = `
      <div class="dojo-toprow">
        <span class="dojo-set">${escapeHtml(topicName).slice(0, 40)}</span>
        <span class="dojo-topbtns">
          <span class="dash-hud" id="dashHud"></span>
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
    const hudEl = panel.querySelector("#dashHud");
    const stageEl = panel.querySelector(".dash-stage");

    const W = 800, H = 320, GROUND = H - 54;
    function fit() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const cw = Math.max(280, rect.width), ch = Math.round(cw * (H / W));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      ctx.setTransform((cw * dpr) / W, 0, 0, (ch * dpr) / H, 0, 0);
    }
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    const state = {
      x: 120, y: GROUND, vy: 0, onGround: true,
      speed: diff.speed, dist: 0, hearts: 3, shield: false, over: false, paused: false,
      spikes: [], gate: null, nextSpike: 360, nextGate: 680,
      qi: 0, streak: 0, bestStreak: 0, level: 1, t: 0, invuln: 0, submitted: false,
    };
    const GRAV = 1750, JUMP = -620;
    const qIndex = shuffle(qs.map((_, i) => i));

    function renderHud() {
      const hearts = "♥".repeat(Math.max(0, state.hearts)).split("").map(() => '<span class="dash-heart">♥</span>').join("");
      const shield = state.shield ? '<span class="dash-shield" title="Shield — absorbs one hit">🛡</span>' : "";
      const streak = state.streak >= 2 ? `<span class="dash-streak" title="Answer streak">🔥${state.streak}</span>` : "";
      hudEl.innerHTML = `<span class="dash-lvl">Lv ${state.level}</span>${streak}${shield}<span class="dash-hearts">${hearts}</span><span class="dash-score" id="dashScore">${Math.floor(state.dist / 10)} m</span>`;
    }
    renderHud();
    const setScore = () => { const s = panel.querySelector("#dashScore"); if (s) s.textContent = Math.floor(state.dist / 10) + " m"; };

    function flash(msg, cls) {
      const f = el("div", "dash-flash " + (cls || "")); f.textContent = msg; stageEl.appendChild(f);
      setTimeout(() => f.remove(), 850);
    }

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

    // One unit of damage: a shield soaks it, otherwise a heart.
    function damage() {
      if (state.invuln > 0) return;
      if (state.shield) { state.shield = false; state.invuln = 1.1; renderHud(); flash("🛡 Shield used!", "warn"); fx(sound.buzz); return; }
      state.hearts--; state.invuln = 1.1; renderHud(); fx(sound.buzz);
      if (state.hearts <= 0) gameOver();
    }

    // Reward the current streak with shields / hearts.
    function rewardStreak() {
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      if (state.streak % 5 === 0 && state.hearts < MAX_HEARTS) { state.hearts++; flash("+1 heart!", "good"); fx(sound.fanfare); }
      else if (state.streak % 3 === 0 && !state.shield) { state.shield = true; flash("🛡 Shield earned!", "good"); fx(sound.fanfare); }
      renderHud();
    }

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
          if (ok) { state.streak++; state.dist += 50 + 15 * Math.min(state.streak, 8); rewardStreak(); fx(sound.fanfare); }
          else { state.streak = 0; renderHud(); damage(); }
          setTimeout(() => {
            overlay.hidden = true; overlay.innerHTML = "";
            if (!state.over) { state.paused = false; state.gate = null; state.speed = Math.min(diff.maxSpeed, state.speed + 14); state.nextGate = state.dist + diff.gateGap[0] + Math.random() * diff.gateGap[1]; }
          }, ok ? 420 : 820);
        });
        opts.appendChild(b);
      });
      box.appendChild(opts);
      overlay.appendChild(box);
    }

    function gameOver() {
      state.over = true; stopLoop(); disarmKeys(); window.removeEventListener("resize", onResize);
      const m = Math.floor(state.dist / 10);
      const isBest = m > (cfg().best || 0);
      if (isBest) { cfg().best = m; save(); }
      overlay.hidden = false;
      overlay.innerHTML = `<div class="dash-qbox dash-gameover">
        <p class="dash-qlabel">Run over${isBest ? " · new best!" : ""}</p>
        <p class="dash-finalscore">${m} m</p>
        <p class="muted">Best ${cfg().best} m · Level ${state.level} · Longest streak ${state.bestStreak}</p>
        <div class="dash-submit" id="dashSubmit"></div>
        <div class="dojo-editbtns"></div></div>`;
      const row = overlay.querySelector(".dojo-editbtns");
      const again = el("button", "btn primary", "Run again"); again.addEventListener("click", () => startGame(questions, topicName));
      const back = el("button", "btn ghost", "New topic"); back.addEventListener("click", () => renderLobby());
      row.append(again, back);

      // Leaderboard submit + board.
      if (SUPABASE_ENABLED && m > 0) {
        const sub = overlay.querySelector("#dashSubmit");
        const nameIn = el("input", "dojo-input dash-nameinput"); nameIn.placeholder = "Your name"; nameIn.maxLength = 24; nameIn.value = cfg().name || "";
        const send = el("button", "btn", "Add to leaderboard");
        const board = el("div", "dash-board");
        const doSubmit = async () => {
          const nm = nameIn.value.trim(); if (!nm) { nameIn.focus(); return; }
          cfg().name = nm; save();
          send.disabled = true; nameIn.disabled = true; send.textContent = "Posting…";
          try {
            await submitDashScore({ name: nm, score: m, topic: topicName, level: state.level });
            if (!state.submitted) state.submitted = true;
            send.textContent = "Posted ✓";
            board.innerHTML = `<p class="dash-boardttl">🏆 Global high scores</p>`;
            fillBoard(board, { name: nm, score: m });
          } catch (e) { send.disabled = false; nameIn.disabled = false; send.textContent = "Add to leaderboard"; flash("Couldn't post — try again", "warn"); }
        };
        send.addEventListener("click", doSubmit);
        nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") doSubmit(); });
        const r = el("div", "dash-submitrow"); r.append(nameIn, send);
        sub.append(r, board);
      }
    }

    let last = performance.now();
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!canvas.isConnected) { stopLoop(); return; }
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
      if (!state.paused && !state.over) step(dt);
      draw();
    }
    function step(dt) {
      state.t += dt;
      state.dist += state.speed * dt;
      setScore();
      if (state.invuln > 0) state.invuln -= dt;

      // Level up on distance.
      const lvl = 1 + Math.floor(Math.floor(state.dist / 10) / LEVEL_M);
      if (lvl > state.level) { state.level = lvl; state.speed = Math.min(diff.maxSpeed, state.speed + 12); renderHud(); flash("Level " + lvl + "!", "good"); fx(sound.sunny); }

      // player physics
      state.vy += GRAV * dt; state.y += state.vy * dt;
      if (state.y >= GROUND) { state.y = GROUND; state.vy = 0; state.onGround = true; }

      // spikes (busier with level; clusters of 2 at higher levels)
      state.spikes.forEach((s) => { s.x -= state.speed * dt; });
      state.spikes = state.spikes.filter((s) => s.x > -40);
      if (state.dist > state.nextSpike && !state.gate) {
        const cluster = (state.level >= diff.doubleFrom && Math.random() < 0.33) ? 2 : 1;
        for (let k = 0; k < cluster; k++) state.spikes.push({ x: W + 20 + k * 30, w: 24 + Math.random() * 12 });
        const gap = Math.max(diff.spikeGap[1], diff.spikeGap[0] - state.level * 8);
        state.nextSpike = state.dist + gap + Math.random() * 110;
      }

      // gate
      if (!state.gate && state.dist > state.nextGate) state.gate = { x: W + 20 };
      if (state.gate) { state.gate.x -= state.speed * dt; if (state.gate.x <= state.x) askQuestion(); }

      // spike collisions
      if (state.invuln <= 0) {
        for (const s of state.spikes) {
          const px = state.x, pw = 30;
          if (s.x < px + pw && s.x + s.w > px && state.y > GROUND - 26) { damage(); break; }
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      // Sky tints a touch warmer as levels climb.
      const warm = Math.min(5, state.level - 1);
      g.addColorStop(0, `rgb(${27 + warm * 6},${18 + warm * 2},${48})`); g.addColorStop(1, `rgb(${42 + warm * 8},${27 + warm * 3},${74})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#120b22"; ctx.fillRect(0, GROUND + 26, W, H - GROUND - 26);
      ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, GROUND + 26); ctx.lineTo(W, GROUND + 26); ctx.stroke();
      if (state.gate) {
        ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = "#ffcf4d";
        ctx.fillRect(state.gate.x, 40, 8, GROUND - 14); ctx.restore();
        ctx.fillStyle = "rgba(255,207,77,.18)"; ctx.fillRect(state.gate.x - 6, 40, 20, GROUND - 14);
      }
      ctx.fillStyle = "#ff5b52";
      state.spikes.forEach((s) => { ctx.beginPath(); ctx.moveTo(s.x, GROUND + 26); ctx.lineTo(s.x + s.w / 2, GROUND - 2); ctx.lineTo(s.x + s.w, GROUND + 26); ctx.closePath(); ctx.fill(); });
      // player (with shield ring)
      const blink = state.invuln > 0 && Math.floor(state.t * 12) % 2 === 0;
      const px = state.x, py = state.y;
      if (state.shield) { ctx.save(); ctx.strokeStyle = "#3fd0c9"; ctx.globalAlpha = 0.8; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 15, py - 15, 26, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = blink ? "#6b4bd8" : "#3fd0c9";
      roundRect(ctx, px, py - 30, 30, 30, 7); ctx.fill();
      ctx.fillStyle = "#06231f"; ctx.fillRect(px + 19, py - 22, 5, 5);
    }
    function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

    raf = requestAnimationFrame(loop);
  }

  renderLobby();
}
