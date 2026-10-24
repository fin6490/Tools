/* Drawn crests for each table game, in place of the old emoji: used in the table header, the
   world's table signs and the interact prompt. 64x64 SVGs; GameArt.img() rasterises one for the
   canvas. */
const GameArt = (() => {
  const card = (x, y, rot, rank, suit, red) => `<g transform="rotate(${rot} ${x + 13} ${y + 36})"><rect x="${x}" y="${y}" width="26" height="36" rx="3.5" fill="#fdfaf2" stroke="#b9ad92" stroke-width=".8"/>`
    + `<text x="${x + 4}" y="${y + 11}" font-size="10" font-weight="800" font-family="Georgia,serif" fill="${red ? '#c0392b' : '#1b1b1b'}">${rank}</text>`
    + `<text x="${x + 13}" y="${y + 27}" font-size="15" text-anchor="middle" fill="${red ? '#c0392b' : '#1b1b1b'}">${suit}</text></g>`;
  const back = (x, y, rot) => `<g transform="rotate(${rot} ${x + 13} ${y + 36})"><rect x="${x}" y="${y}" width="26" height="36" rx="3.5" fill="#7a2131" stroke="#f1d38a" stroke-width="1.2"/><rect x="${x + 3.5}" y="${y + 3.5}" width="19" height="29" rx="2" fill="none" stroke="#f1d38a" stroke-width=".7" stroke-dasharray="2 1.5"/></g>`;
  const chip = (cx, cy, r, col) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>` + [0, 60, 120, 180, 240, 300].map(a => { const t = a * Math.PI / 180; return `<rect x="${cx + Math.sin(t) * r * .78 - 1.6}" y="${cy - Math.cos(t) * r * .78 - 2.6}" width="3.2" height="5.2" fill="#fff" transform="rotate(${a} ${cx + Math.sin(t) * r * .78} ${cy - Math.cos(t) * r * .78})"/>`; }).join('') + `<circle cx="${cx}" cy="${cy}" r="${r * .55}" fill="none" stroke="#fff" stroke-width=".8" stroke-dasharray="1.6 1.2"/>`;
  const die = (x, y, rot, n) => {
    const P = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[n];
    return `<g transform="rotate(${rot} ${x + 12} ${y + 12})"><rect x="${x}" y="${y}" width="24" height="24" rx="5" fill="#c62828" stroke="#7f1010"/>${P.map(([a, b]) => `<circle cx="${x + 6 + a * 6}" cy="${y + 6 + b * 6}" r="2.2" fill="#fff"/>`).join('')}</g>`;
  };
  const felt = c => `<circle cx="32" cy="32" r="31" fill="${c}"/><circle cx="32" cy="32" r="28.5" fill="none" stroke="#d4af37" stroke-width="1.2" opacity=".7"/>`;
  const ART = {
    bj: () => felt('#0f5a33') + card(12, 12, -12, 'A', '♠') + card(26, 14, 12, 'K', '♥', true),
    tcp: () => felt('#14507a') + card(8, 15, -18, 'Q', '♦', true) + card(19, 11, 0, 'K', '♦', true) + card(30, 15, 18, 'A', '♦', true),
    lir: () => felt('#4a2a6b') + card(20, 8, -6, '10', '♣') + chip(18, 46, 9, '#c0392b') + chip(32, 49, 9, '#1f5f8b') + chip(46, 46, 9, '#2e7d32'),
    ms: () => felt('#1b4f72') + `<path d="M8 44h48l-6 9H14z" fill="#f4f4f4"/><path d="M14 44V35h32v9" fill="#c0392b"/><rect x="22" y="27" width="4" height="8" fill="#222"/><rect x="34" y="27" width="4" height="8" fill="#222"/><circle cx="46" cy="40" r="7" fill="none" stroke="#8a5a2b" stroke-width="2"/><path d="M46 33v14M39 40h14M41 35l10 10M51 35l-10 10" stroke="#8a5a2b" stroke-width="1.2"/><path d="M6 55c6-3 10 3 16 0s10 3 16 0 10 3 16 0" stroke="#7fb3d5" stroke-width="2" fill="none"/>` + card(6, 6, -10, '7', '♠'),
    war: () => felt('#5b1f1f') + `<path d="M14 50L46 14M50 50L18 14" stroke="#cfd8dc" stroke-width="4" stroke-linecap="round"/><path d="M12 46l6 6M46 46l6 6" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/>` + card(20, 16, 0, 'J', '♣'),
    uth: () => felt('#0f5a33') + back(10, 14, -14) + card(24, 12, 10, 'A', '♥', true) + chip(46, 46, 10, '#1d1d1d') + `<text x="46" y="50" font-size="10" text-anchor="middle" fill="#f1c40f">★</text>`,
    bac: () => felt('#6b1a1a') + card(10, 12, -10, '9', '♥', true) + card(26, 12, 10, '8', '♠') + `<rect x="17" y="46" width="30" height="11" rx="5.5" fill="#d4af37"/><text x="32" y="54.5" text-anchor="middle" font-size="8" font-weight="800" fill="#3a2a10" font-family="sans-serif">BANKER</text>`,
    craps: () => felt('#0f5a33') + die(10, 14, -16, 5) + die(30, 22, 14, 2),
    roulette: () => {
      let s = `<circle cx="32" cy="32" r="31" fill="#5a3a22"/><circle cx="32" cy="32" r="27" fill="#3a2414"/>`;
      for (let i = 0; i < 18; i++) {
        const a0 = i / 18 * Math.PI * 2, a1 = (i + 1) / 18 * Math.PI * 2, R = 25, r = 13;
        const p = (a, rr) => `${32 + Math.sin(a) * rr} ${32 - Math.cos(a) * rr}`;
        s += `<path d="M${p(a0, r)}L${p(a0, R)}A${R} ${R} 0 0 1 ${p(a1, R)}L${p(a1, r)}A${r} ${r} 0 0 0 ${p(a0, r)}z" fill="${i === 0 ? '#1e8449' : i % 2 ? '#c0392b' : '#111'}"/>`;
      }
      return s + `<circle cx="32" cy="32" r="13" fill="#8a6a24"/><circle cx="32" cy="32" r="5" fill="#d4af37"/><path d="M32 22v20M22 32h20" stroke="#d4af37" stroke-width="2"/><circle cx="44" cy="15" r="3" fill="#fafafa"/>`;
    },
  };
  const svg = id => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${(ART[id] || ART.bj)()}</svg>`;
  const imgs = {};
  return {
    has: id => !!ART[id], svg,
    el(id, cls = '') { const e = document.createElement('span'); e.className = 'ga' + (cls ? ' ' + cls : ''); e.setAttribute('aria-hidden', 'true'); e.innerHTML = svg(id); return e; },
    // a ready-to-draw image for canvas, or null until it has loaded
    img(id) {
      if (!ART[id]) return null;
      if (!imgs[id]) { imgs[id] = new Image(); imgs[id].src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(id)); }
      return imgs[id].complete && imgs[id].naturalWidth ? imgs[id] : null;
    },
  };
})();
