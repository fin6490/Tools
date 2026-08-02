// generate.mjs — builds the static multi-page site from content.mjs.
// Run: `node build/generate.mjs` (from the repo root). It writes:
//   index.html (hub), <slug>/index.html per tool, privacy/terms/about pages,
//   404.html, sitemap.xml, robots.txt. Commit the output — the Pages deploy
//   uploads static files as-is, so there is no build step in CI.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, TOOLS, HUB, PAGES } from "./content.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const T = SITE.token;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- shared fragments ---------- */

// Favicon (inline SVG play-button mark) — same across all pages.
const FAVICON =
  `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1' y='1' width='30' height='30' rx='8' fill='%23ff5b52'/%3E%3Cpath d='M12 9L24 16L12 23Z' fill='%232b0b09'/%3E%3C/svg%3E" />`;

// Runs before CSS paints so the saved theme applies with no flash. No app.js needed.
const THEME_INIT =
  `<script>try{var s=JSON.parse(localStorage.getItem("spindeck.v1"));if(s&&s.theme)document.documentElement.dataset.theme=s.theme;}catch(e){}</script>`;

// SW registration (absolute path; works from any route).
const SW_REG =
  `<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});}</script>`;

function head({ title, description, canonicalPath, jsonld = [] }) {
  const url = SITE.origin + canonicalPath;
  const img = SITE.origin + "/assets/og-image.png?v=2";
  const ld = jsonld.map((o) => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`).join("\n");
  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="author" content="SpinDecks" />
<meta name="theme-color" content="#17131d" />
<link rel="canonical" href="${url}" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="SpinDecks" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${img}" />

<link rel="stylesheet" href="/css/styles.css?v=${T}" />
${FAVICON}
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
${THEME_INIT}
${ld}`;
}

// Nav tabs (real links). `active` = the view for the current page, or null.
function tabs(active) {
  const items = TOOLS.map((t) => {
    const on = t.view === active;
    return `      <a class="tab${on ? " is-active" : ""}" data-view-btn="${t.view}" href="/${t.slug}"${on ? ' aria-current="page"' : ""}>${t.nav}</a>`;
  }).join("\n");
  return `<nav class="tabs" role="tablist" aria-label="Tools">\n${items}\n    </nav>`;
}

const BRAND = `<a class="brand" href="/" aria-label="SpinDecks home">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="8" fill="#ff5b52"/><path d="M12 9L24 16L12 23Z" fill="#2b0b09"/></svg>
      </span>
      <span class="brand-name">SpinDecks</span>
    </a>`;

function topbar(active) {
  return `<header class="topbar">
    ${BRAND}
    ${tabs(active)}
    <div class="topbar-actions">
      <a id="tipTopBtn" class="tip-top" hidden target="_blank" rel="noopener" title="Support SpinDecks with a tip">
        <span class="tip-top-emoji" aria-hidden="true">🍺</span><span class="tip-top-label">Buy me a pint</span>
      </a>
      <button id="themeToggle" class="icon-btn" title="Toggle theme" aria-label="Toggle light/dark theme">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor"/></svg>
      </button>
      <button id="presentBtn" class="icon-btn" title="Fullscreen focus mode (F)" aria-label="Fullscreen focus mode">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
      </button>
      <div class="menu">
        <button id="menuBtn" class="icon-btn" title="More" aria-haspopup="true" aria-label="More options">⋯</button>
        <div id="menuPanel" class="menu-panel" hidden>
          <button id="installBtn" data-action="install" hidden>Install app</button>
          <button id="greenBtn" data-action="greenscreen" title="Solid green background for OBS chroma key — best with fullscreen (G)">Green screen (chroma key)</button>
          <button data-action="support">SpinDecks Pro &amp; support</button>
          <button data-action="export">Export all (JSON)</button>
          <button data-action="import">Import (JSON)</button>
          <button data-action="share">Copy share link (this wheel)</button>
          <button data-action="reset">Reset everything</button>
          <a href="/about">About / help</a>
        </div>
      </div>
    </div>
  </header>`;
}

// A slimmer header for the hub and legal pages (no app controls).
function simpleHeader() {
  return `<header class="topbar topbar-simple">
    ${BRAND}
    <nav class="tabs" aria-label="Tools">
${TOOLS.map((t) => `      <a class="tab" href="/${t.slug}">${t.nav}</a>`).join("\n")}
    </nav>
  </header>`;
}

function footer() {
  const toolLinks = TOOLS.map((t) => `<a href="/${t.slug}">${t.nav === "Numbers" ? "Random numbers" : t.nav === "Scores" ? "Darts scoreboard" : t.nav === "Teams" ? "Team generator" : t.nav === "Slots" ? "Slot reels" : t.nav === "Wheel" ? "Wheel of names" : t.nav === "Timer" ? "Countdown timer" : "Tally counter"}</a>`).join("\n        ");
  return `<footer class="site-footer">
    <div class="footer-cols">
      <div class="footer-col">
        <p class="footer-brand">SpinDecks</p>
        <p class="muted">Free, ad-free tools that run in your browser. No accounts, no tracking, works offline.</p>
      </div>
      <nav class="footer-col" aria-label="Tools">
        <p class="footer-head">Tools</p>
        ${toolLinks}
      </nav>
      <nav class="footer-col" aria-label="More">
        <p class="footer-head">More</p>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="https://ko-fi.com/spindecks" target="_blank" rel="noopener">Support / tip</a>
      </nav>
    </div>
    <p class="footer-legal muted">© ${new Date().getFullYear()} SpinDecks · no ads · no accounts · your data stays in your browser</p>
  </footer>`;
}

/* ---------- the app shell (all tool panels; app.js wires them) ---------- */

// Every tool page ships the full app so the existing app.js works unchanged.
// All panels carry `hidden`; the generator reveals the active one per route.
const PANELS = String.raw`  <!-- WHEEL -->
  <main class="view view-wheel" data-view-panel="wheel" hidden>
    <section class="panel editor" aria-label="Wheel entries and settings">
      <div class="wheel-switcher">
        <label class="sr-only" for="wheelSelect">Active wheel</label>
        <select id="wheelSelect" title="Switch wheel"></select>
        <button id="newWheelBtn" class="mini-btn" title="New wheel">New</button>
        <button id="renameWheelBtn" class="mini-btn" title="Rename wheel">Rename</button>
        <button id="deleteWheelBtn" class="mini-btn" title="Delete wheel">Delete</button>
      </div>
      <div class="editor-head">
        <span id="entryCount" class="entry-count">0 entries</span>
        <div class="editor-tools">
          <button id="imagesBtn" class="mini-btn" title="Add images to slices">Images</button>
          <button id="shuffleBtn" class="mini-btn" title="Shuffle order">Shuffle</button>
          <button id="sortBtn" class="mini-btn" title="Sort A to Z">Sort</button>
          <button id="dedupeBtn" class="mini-btn" title="Remove duplicates">Unique</button>
        </div>
      </div>
      <textarea id="entries" class="entries" spellcheck="false"
        placeholder="One name per line…&#10;&#10;Tips:&#10;Alice*3          weight (3× more likely)&#10;Bob #ff5a5f      custom colour&#10;Cara *2 #0af     both"></textarea>
      <div class="editor-options">
        <label class="opt"><input type="checkbox" id="eliminationMode" /> Elimination mode <span class="opt-hint">(spin to knock out — last one wins)</span></label>
        <label class="opt"><input type="checkbox" id="removeWinner" /> Remove winner after each spin</label>
        <label class="opt"><input type="checkbox" id="soundOn" checked /> Sound</label>
        <label class="opt"><input type="checkbox" id="confettiOn" checked /> Confetti</label>
        <label class="opt slider-opt">
          Spin length <output id="spinLenOut">5s</output>
          <input type="range" id="spinLen" min="2" max="12" step="1" value="5" />
        </label>
      </div>
    </section>
    <section class="panel stage" aria-label="The wheel">
      <div class="style-toggle seg-toggle" role="tablist" aria-label="Picker style">
        <button class="seg is-active" data-wheel-style="wheel" role="tab">Wheel</button>
        <button class="seg" data-wheel-style="reel" role="tab">Reel</button>
      </div>
      <div class="wheel-wrap">
        <canvas id="wheel" width="720" height="720" role="img" aria-label="Spinning wheel of names"></canvas>
        <div class="pointer" aria-hidden="true"></div>
        <button id="spinBtn" class="spin-hub" aria-label="Spin the wheel">SPIN</button>
      </div>
      <button id="spinReel" class="btn primary reel-spin" aria-label="Spin the reel">SPIN</button>
      <p class="hint">Press <kbd>Space</kbd> to spin · <kbd>F</kbd> for fullscreen</p>
    </section>
    <aside class="panel history" aria-label="Winner history">
      <div class="history-head">
        <h2>Results</h2>
        <button id="clearHistory" class="mini-btn" title="Clear results">clear</button>
      </div>
      <ol id="historyList" class="history-list" aria-live="polite"></ol>
    </aside>
  </main>

  <!-- SLOTS -->
  <main class="view view-slots" data-view-panel="slots" hidden>
    <section class="panel tool-panel slots-panel">
      <div class="slots-head"><h2>Slot reels</h2></div>
      <p class="muted">Several reels side by side — spin them all at once. Point each reel at any of your saved wheels.</p>
      <div class="slots-controls">
        <label>Reels <input type="number" id="slotCount" min="2" max="6" value="3" /></label>
        <button id="slotSameSource" class="mini-btn" title="Point every reel at the same wheel">Match all to first</button>
      </div>
      <div id="slotReels" class="slot-reels"></div>
      <div class="slots-footer">
        <button id="slotsSpin" class="btn primary slots-spin" aria-label="Spin all reels">Spin all</button>
      </div>
      <div class="slots-results">
        <div class="history-head">
          <h2>Results</h2>
          <button id="slotClear" class="mini-btn" title="Clear results">clear</button>
        </div>
        <ol id="slotHistory" class="history-list" aria-live="polite"></ol>
      </div>
    </section>
  </main>

  <!-- NUMBERS -->
  <main class="view view-numbers" data-view-panel="numbers" hidden>
    <section class="panel tool-panel numbers-panel">
      <div class="counter-head"><h2>Random numbers</h2></div>
      <p class="muted">Pick a range and how many to draw. Turn on “no repeats” for lottery-style draws.</p>
      <div class="numbers-controls">
        <label class="score-setup-item">Min <input type="number" id="numMin" class="setup-num" value="1" /></label>
        <label class="score-setup-item">Max <input type="number" id="numMax" class="setup-num" value="100" /></label>
        <label class="score-setup-item">How many <input type="number" id="numCount" class="setup-num" min="1" value="1" /></label>
        <label class="opt"><input type="checkbox" id="numUnique" /> No repeats</label>
      </div>
      <div class="numbers-presets">
        <button class="chip" data-preset="dice">Dice (1–6)</button>
        <button class="chip" data-preset="d20">D20</button>
        <button class="chip" data-preset="coin">Coin flip</button>
        <button class="chip" data-preset="h100">1–100</button>
        <button class="chip" data-preset="lottery">Lottery (6 of 49)</button>
      </div>
      <button id="numGenerate" class="btn primary numbers-go">Generate</button>
      <div id="numResult" class="numbers-result" aria-live="polite"></div>
      <div class="numbers-foot">
        <span id="numMeta" class="muted"></span>
        <button id="numCopy" class="mini-btn" hidden>Copy</button>
      </div>
    </section>
  </main>

  <!-- TIMER -->
  <main class="view view-timer" data-view-panel="timer" hidden>
    <section class="panel tool-panel timer-panel">
      <div class="seg-toggle" role="tablist" aria-label="Timer mode">
        <button class="seg is-active" data-timer-mode="countdown" role="tab">Countdown</button>
        <button class="seg" data-timer-mode="stopwatch" role="tab">Stopwatch</button>
      </div>
      <div id="timerDisplay" class="big-clock">05:00</div>
      <div id="countdownSetup" class="timer-setup">
        <div class="preset-row">
          <button class="chip" data-secs="60">1:00</button>
          <button class="chip" data-secs="180">3:00</button>
          <button class="chip" data-secs="300">5:00</button>
          <button class="chip" data-secs="600">10:00</button>
          <button class="chip" data-secs="900">15:00</button>
        </div>
        <div class="custom-time">
          <input type="number" id="mmIn" min="0" max="599" value="5" aria-label="Minutes" /> :
          <input type="number" id="ssIn" min="0" max="59" value="0" aria-label="Seconds" />
          <button id="setTimeBtn" class="mini-btn">Set</button>
        </div>
      </div>
      <div class="timer-controls">
        <button id="timerStart" class="btn primary">Start</button>
        <button id="timerPause" class="btn">Pause</button>
        <button id="timerReset" class="btn">Reset</button>
      </div>
      <label class="opt"><input type="checkbox" id="timerBeep" checked /> Beep when countdown ends</label>
    </section>
  </main>

  <!-- GROUPS -->
  <main class="view view-groups" data-view-panel="groups" hidden>
    <section class="panel tool-panel groups-panel">
      <div class="counter-head">
        <h2>Team / group maker</h2>
        <button id="loadFromWheel" class="mini-btn" title="Copy the current wheel's names in here">Load current wheel</button>
      </div>
      <p class="muted">Split a list of names into random, balanced teams.</p>
      <textarea id="groupNames" class="entries" spellcheck="false" placeholder="One name per line…"></textarea>
      <div class="groups-controls">
        <div class="seg-toggle" role="tablist" aria-label="Split mode">
          <button class="seg is-active" data-group-mode="count" role="tab">By number of teams</button>
          <button class="seg" data-group-mode="size" role="tab">By team size</button>
        </div>
        <label class="group-num">
          <span id="groupNumLabel">How many teams?</span>
          <input type="number" id="groupNum" min="1" max="100" value="4" />
        </label>
        <button id="makeGroups" class="btn primary">Make teams</button>
      </div>
      <div class="groups-result-head" hidden>
        <span id="groupsSummary" class="muted"></span>
        <div class="editor-tools">
          <button id="rerollGroups" class="mini-btn" title="Shuffle again">Re-roll</button>
          <button id="copyGroups" class="mini-btn" title="Copy result as text">Copy</button>
          <button id="sendToWheels" class="mini-btn" title="Create a wheel for each team">To wheels</button>
        </div>
      </div>
      <div id="groupsGrid" class="counter-grid" aria-live="polite"></div>
    </section>
  </main>

  <!-- SCORES -->
  <main class="view view-scores" data-view-panel="scores" hidden>
    <section class="panel tool-panel scores-panel">
      <div class="counter-head">
        <h2>Scoreboard</h2>
        <button id="addPlayer" class="btn primary">Add player</button>
      </div>
      <div class="seg-toggle scores-mode" role="tablist" aria-label="Scoring mode">
        <button class="seg is-active" data-score-mode="free" role="tab">Freeplay</button>
        <button class="seg" data-score-mode="target" role="tab">Race to target</button>
        <button class="seg" data-score-mode="golf" role="tab">Golf (low)</button>
        <button class="seg" data-score-mode="rounds" role="tab">Rounds</button>
        <button class="seg" data-score-mode="darts" role="tab">Darts (X01)</button>
        <button class="seg" data-score-mode="cricket" role="tab">Cricket</button>
      </div>
      <div id="scoreSetup" class="score-setup"></div>
      <p id="scoreHint" class="muted"></p>
      <div id="scoreGrid" class="score-grid"></div>
    </section>
  </main>

  <!-- COUNTER -->
  <main class="view view-counter" data-view-panel="counter" hidden>
    <section class="panel tool-panel counter-panel">
      <div class="counter-head">
        <h2>Counters</h2>
        <button id="addCounter" class="btn primary">New counter</button>
      </div>
      <p class="muted">Track spins, slot pulls, score, deaths — anything. Saved locally.</p>
      <div id="counterGrid" class="counter-grid"></div>
    </section>
  </main>`;

const MODALS = String.raw`  <div id="winnerModal" class="modal" hidden>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="winnerName">
      <p id="modalEyebrow" class="modal-eyebrow">Winner</p>
      <p id="winnerName" class="modal-winner"></p>
      <p id="modalSub" class="modal-sub" hidden></p>
      <div class="modal-actions">
        <button id="winnerRemove" class="btn">Remove from wheel</button>
        <button id="winnerClose" class="btn primary">Close</button>
      </div>
    </div>
  </div>
  <div id="imagesModal" class="modal" hidden>
    <div class="modal-card images-card" role="dialog" aria-modal="true" aria-labelledby="imagesTitle">
      <div class="images-head">
        <h2 id="imagesTitle">Slice images</h2>
        <button id="imagesClose" class="icon-btn" aria-label="Close">✕</button>
      </div>
      <p class="muted">Add a picture to any name — it shows on that slice. Stored locally in your browser.</p>
      <div id="imagesList" class="images-list"></div>
    </div>
  </div>
  <div id="supportModal" class="modal" hidden>
    <div class="modal-card support-card" role="dialog" aria-modal="true" aria-labelledby="supportTitle">
      <div class="images-head">
        <h2 id="supportTitle">SpinDecks <span class="pro-badge">Pro</span></h2>
        <button id="supportClose" class="icon-btn" aria-label="Close">✕</button>
      </div>
      <p class="muted support-lead">SpinDecks is free and ad-free, and always will be. An optional Pro tier is on the way for creators who want more — here's what's planned.</p>
      <ul class="pro-list">
        <li><span class="pro-soon">Soon</span> Cloud sync — your wheels on every device</li>
        <li><span class="pro-soon">Soon</span> Custom branding — your logo and colours on the wheel</li>
        <li><span class="pro-soon">Soon</span> Stream overlays — drop the wheel straight into OBS</li>
        <li><span class="pro-soon">Soon</span> Team wheels — shared lists for classrooms and teams</li>
      </ul>
      <form id="waitForm" class="wait-form">
        <label class="sr-only" for="waitEmail">Email for the Pro waitlist</label>
        <input id="waitEmail" class="wait-input" type="email" required placeholder="you@example.com" autocomplete="email" />
        <button type="submit" class="btn primary">Join the waitlist</button>
      </form>
      <p id="waitNote" class="muted wait-note" hidden></p>
      <div id="tipBlock" class="tip-block" hidden>
        <p class="muted">Enjoying it? A small tip keeps it running and ad-free — entirely optional.</p>
        <a id="tipBtn" class="btn tip-btn">Leave a tip</a>
      </div>
    </div>
  </div>
  <canvas id="confetti" class="confetti-canvas" aria-hidden="true"></canvas>
  <input type="file" id="importFile" accept="application/json" hidden />
  <input type="file" id="sliceImageFile" accept="image/*" hidden />
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`;

// Reveal the active panel by stripping its `hidden` attribute.
function activate(view) {
  return PANELS.replace(`data-view-panel="${view}" hidden`, `data-view-panel="${view}"`);
}

/* ---------- tool-page prose ---------- */

function toolCopy(t) {
  const steps = t.steps.map((s) => `<li>${s}</li>`).join("\n        ");
  const who = t.whoFor.map(([w, txt]) => `<li><strong>${w}:</strong> ${txt}</li>`).join("\n        ");
  const faq = t.faq
    .map(([q, a]) => `<details>\n          <summary>${q}</summary>\n          <p>${a}</p>\n        </details>`)
    .join("\n        ");
  return `<section class="tool-copy">
      <h1>${t.h1}</h1>
      <p class="tool-intro">${t.intro}</p>
      <h2>How to use it</h2>
      <ol class="tool-steps">
        ${steps}
      </ol>
      <h2>Who it's for</h2>
      <ul class="tool-who">
        ${who}
      </ul>
      <h2>FAQ</h2>
      <div class="tool-faq">
        ${faq}
      </div>
    </section>`;
}

function toolJsonLd(t) {
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.h1,
    url: `${SITE.origin}/${t.slug}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    publisher: { "@type": "Organization", name: "SpinDecks", url: SITE.origin + "/" },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") },
    })),
  };
  return [app, faq];
}

/* ---------- page assembly ---------- */

function write(path, html) {
  const full = resolve(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html.trimStart() + "\n");
  console.log("wrote", path);
}

function toolPage(t) {
  const h = head({ title: t.title, description: t.description, canonicalPath: "/" + t.slug, jsonld: toolJsonLd(t) });
  return `<!doctype html>
<html lang="en">
<head>
${h}
</head>
<body>
<div id="app" data-view="${t.view}">
  ${topbar(t.view)}
${activate(t.view)}
${MODALS}
</div>
${toolCopy(t)}
${footer()}
<script type="module" src="/js/app.js?v=${T}"></script>
${SW_REG}
</body>
</html>`;
}

function hubPage() {
  const cards = TOOLS.map((t) => `      <a class="hub-card" href="/${t.slug}">
        <span class="hub-card-title">${t.h1.replace(/ —.*/, "")}</span>
        <span class="hub-card-desc">${t.intro.split(". ")[0]}.</span>
      </a>`).join("\n");
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SpinDecks",
    url: SITE.origin + "/",
    description: HUB.description,
  };
  const h = head({ title: HUB.title, description: HUB.description, canonicalPath: "/", jsonld: [ld] });
  return `<!doctype html>
<html lang="en">
<head>
${h}
</head>
<body class="page-static">
${simpleHeader()}
<main class="static-main hub-main">
  <h1>${HUB.h1}</h1>
  <p class="lede">${HUB.intro}</p>
  <div class="hub-grid">
${cards}
  </div>
</main>
${footer()}
${SW_REG}
</body>
</html>`;
}

function staticPage({ slug, title, description, h1 }, bodyHtml, canonical = "/" + slug) {
  const h = head({ title, description, canonicalPath: canonical });
  return `<!doctype html>
<html lang="en">
<head>
${h}
</head>
<body class="page-static">
${simpleHeader()}
<main class="static-main prose">
  <h1>${h1}</h1>
${bodyHtml}
</main>
${footer()}
${SW_REG}
</body>
</html>`;
}

/* ---------- legal / info copy ---------- */

const PRIVACY_BODY = `  <p>SpinDecks is designed to collect as little about you as possible. In normal use it collects <strong>nothing at all</strong>: there are no accounts, no cookies, no analytics and no tracking, and your wheels, lists, scores and settings are stored only in your own browser (in <code>localStorage</code>). They never leave your device and we cannot see them.</p>
  <h2>The one thing we do collect</h2>
  <p>If you choose to join the <strong>Pro waitlist</strong>, you give us your email address. That address is sent to a third-party form provider (Formspree) purely so we can email you when the Pro tier launches. We do not sell it, share it, or use it for anything else, and you can ask us to delete it at any time.</p>
  <h2>Third-party links</h2>
  <p>If you tip via the “Leave a tip” button, you’re taken to Ko-fi, which has its own privacy policy. We don’t receive your payment details.</p>
  <h2>Your rights</h2>
  <p>Under UK GDPR you can ask what data we hold about you (only a waitlist email, if you joined), ask us to correct or delete it, or withdraw consent. To do any of these, email <a href="mailto:hello@spindecks.app">hello@spindecks.app</a>.</p>
  <h2>Who runs SpinDecks</h2>
  <p>SpinDecks is run by an individual (sole trader) in the UK, contactable at <a href="mailto:hello@spindecks.app">hello@spindecks.app</a>. This policy may be updated; the date below reflects the latest version.</p>
  <p class="muted">Last updated: ${new Date().toISOString().slice(0, 10)}.</p>`;

const TERMS_BODY = `  <p>SpinDecks is a free set of browser-based tools provided as-is. By using the site you agree to these simple terms.</p>
  <h2>Use of the tools</h2>
  <p>You can use SpinDecks for personal, classroom, and professional purposes free of charge. Please don’t attempt to disrupt the service or misuse it in ways that would harm others.</p>
  <h2>Your data</h2>
  <p>Your content (wheels, lists, scores, settings) is stored in your own browser. You are responsible for it — clearing your browser data, or using a different device, will not carry it across unless you export and import it yourself.</p>
  <h2>No warranty</h2>
  <p>The tools are provided “as is”, without warranties of any kind. Randomness is provided on a best-effort basis using your browser’s cryptographic random source. Don’t rely on SpinDecks for anything where an error would cause loss or harm; to the extent permitted by law, we accept no liability for such use.</p>
  <h2>Changes</h2>
  <p>We may update the tools and these terms over time. Continued use means you accept the current version.</p>
  <h2>Contact</h2>
  <p>Questions? Email <a href="mailto:hello@spindecks.app">hello@spindecks.app</a>.</p>`;

const ABOUT_BODY = `  <p class="lede">SpinDecks is a growing set of simple, fast, ad-free tools for teachers, streamers and board gamers — a wheel of names, a random team maker, a darts scoreboard, a number generator, a timer, tally counters and a slot-reel picker, all in one place.</p>
  <h2>The idea</h2>
  <p>The tools people reach for every day — a name picker, a timer, a score counter — are usually buried in ads or locked behind sign-ups. SpinDecks is the opposite: no ads, no accounts, no tracking. Everything runs in your browser and keeps working offline, so it’s fast, private and dependable in a classroom or on stream.</p>
  <h2>How it stays free</h2>
  <p>Because it’s a static site with no servers, SpinDecks costs almost nothing to run — which is what makes an honest “no ads, ever” promise possible. If it ever earns money, it’ll be through an optional Pro tier (extras like cloud sync and stream overlays), never ads.</p>
  <h2>Your data is yours</h2>
  <p>Your wheels, lists and settings live only in your browser. There’s one-tap export/import if you want to move them between devices, and shareable links that encode a wheel into the URL — no server involved.</p>
  <h2>Get in touch</h2>
  <p>Ideas, bugs or requests are welcome at <a href="mailto:hello@spindecks.app">hello@spindecks.app</a>. If SpinDecks saves you time, you can <a href="https://ko-fi.com/spindecks" target="_blank" rel="noopener">leave a tip</a> — entirely optional.</p>`;

function notFoundPage() {
  const h = head({ title: "Page not found | SpinDecks", description: "That page doesn’t exist. Head back to the SpinDecks tools.", canonicalPath: "/404" });
  return `<!doctype html>
<html lang="en">
<head>
${h}
</head>
<body class="page-static">
${simpleHeader()}
<main class="static-main prose notfound">
  <h1>Page not found</h1>
  <p>That page doesn’t exist or has moved. Try one of the tools instead:</p>
  <p><a class="btn primary" href="/">Back to all tools</a></p>
</main>
${footer()}
${SW_REG}
</body>
</html>`;
}

/* ---------- sitemap / robots ---------- */

function sitemap() {
  const urls = ["/", ...TOOLS.map((t) => "/" + t.slug), "/about", "/privacy", "/terms"];
  const body = urls
    .map((u) => `  <url>\n    <loc>${SITE.origin}${u === "/" ? "/" : u}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${u === "/" ? "1.0" : "0.8"}</priority>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

const ROBOTS = `User-agent: *\nAllow: /\n\nSitemap: ${SITE.origin}/sitemap.xml`;

/* ---------- run ---------- */

// Route map for the client router (single source of truth = content.mjs).
function routesJs() {
  const map = {};
  for (const t of TOOLS) map[t.view] = { slug: t.slug, title: t.title, description: t.description };
  return `// Generated by build/generate.mjs — do not edit by hand.\nexport const ROUTES = ${JSON.stringify(map, null, 2)};\n`;
}

write("index.html", hubPage());
write("js/routes.js", routesJs());
for (const t of TOOLS) write(`${t.slug}/index.html`, toolPage(t));
write("privacy/index.html", staticPage(PAGES.privacy, PRIVACY_BODY));
write("terms/index.html", staticPage(PAGES.terms, TERMS_BODY));
write("about/index.html", staticPage(PAGES.about, ABOUT_BODY));
write("404.html", notFoundPage());
write("sitemap.xml", sitemap());
write("robots.txt", ROBOTS);
write(".nojekyll", "");
console.log("\nDone. Regenerate with: node build/generate.mjs");
