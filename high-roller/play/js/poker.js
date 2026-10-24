/* Poker hand evaluation shared by the poker-style games (and the odds tooling in tools/).
   Cards are {r, s}: r = 2..14 (14 = Ace), s = 0..3 (♠ ♥ ♦ ♣). */
(function (root) {
  const HAND_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
    'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
  const CAT = { HIGH: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8, ROYAL: 9 };

  // Returns {cat, score, name, groups}. Higher score always wins; ties are exact splits.
  function eval5(c) {
    const r = [c[0].r, c[1].r, c[2].r, c[3].r, c[4].r].sort((a, b) => b - a);
    const flush = c[0].s === c[1].s && c[1].s === c[2].s && c[2].s === c[3].s && c[3].s === c[4].s;
    const distinct = r[0] !== r[1] && r[1] !== r[2] && r[2] !== r[3] && r[3] !== r[4];
    let straightHigh = 0;
    if (distinct) {
      if (r[0] - r[4] === 4) straightHigh = r[0];
      else if (r[0] === 14 && r[1] === 5) straightHigh = 5; // wheel A-2-3-4-5
    }
    if (straightHigh) {
      const cat = flush ? (straightHigh === 14 ? CAT.ROYAL : CAT.STRAIGHT_FLUSH) : CAT.STRAIGHT;
      return { cat, score: cat * 1048576 + straightHigh * 65536, name: HAND_NAMES[cat], groups: [straightHigh] };
    }
    if (flush) {
      return { cat: CAT.FLUSH, score: CAT.FLUSH * 1048576 + r[0] * 65536 + r[1] * 4096 + r[2] * 256 + r[3] * 16 + r[4], name: HAND_NAMES[CAT.FLUSH], groups: r };
    }
    // group ranks by multiplicity (count desc, then rank desc)
    const groups = [];
    for (let i = 0; i < 5;) {
      let j = i; while (j < 5 && r[j] === r[i]) j++;
      groups.push([j - i, r[i]]); i = j;
    }
    groups.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    let cat;
    const top = groups[0][0];
    if (top === 4) cat = CAT.QUADS;
    else if (top === 3) cat = groups[1][0] === 2 ? CAT.FULL_HOUSE : CAT.TRIPS;
    else if (top === 2) cat = groups[1][0] === 2 ? CAT.TWO_PAIR : CAT.PAIR;
    else cat = CAT.HIGH;
    let score = cat * 1048576, mul = 65536;
    for (const g of groups) { score += g[1] * mul; mul /= 16; }
    return { cat, score, name: HAND_NAMES[cat], groups: groups.map(g => g[1]) };
  }

  // Best 5-card hand from 5..7 cards. Returns eval5 result plus .cards (the five used).
  function best(cards) {
    const n = cards.length;
    if (n === 5) { const e = eval5(cards); e.cards = cards.slice(); return e; }
    let bestE = null, pick = [0, 0, 0, 0, 0];
    for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++) for (let c = b + 1; c < n - 2; c++)
      for (let d = c + 1; d < n - 1; d++) for (let e = d + 1; e < n; e++) {
        const h = [cards[a], cards[b], cards[c], cards[d], cards[e]];
        const ev = eval5(h);
        if (!bestE || ev.score > bestE.score) { bestE = ev; pick = h; }
      }
    bestE.cards = pick;
    return bestE;
  }

  // Three Card Poker ranking: SF > Trips > Straight > Flush > Pair > High.
  const TCP_NAMES = ['High Card', 'Pair', 'Flush', 'Straight', 'Three of a Kind', 'Straight Flush'];
  function eval3(c) {
    const r = [c[0].r, c[1].r, c[2].r].sort((a, b) => b - a);
    const flush = c[0].s === c[1].s && c[1].s === c[2].s;
    let straightHigh = 0;
    if (r[0] !== r[1] && r[1] !== r[2]) {
      if (r[0] - r[2] === 2) straightHigh = r[0];
      else if (r[0] === 14 && r[1] === 3 && r[2] === 2) straightHigh = 3;
    }
    let cat, k;
    if (straightHigh && flush) { cat = 5; k = [straightHigh]; }
    else if (r[0] === r[2]) { cat = 4; k = [r[0]]; }
    else if (straightHigh) { cat = 3; k = [straightHigh]; }
    else if (flush) { cat = 2; k = r; }
    else if (r[0] === r[1] || r[1] === r[2]) { cat = 1; const p = r[1]; k = [p, r[0] === p ? r[2] : r[0]]; }
    else { cat = 0; k = r; }
    let score = cat * 65536, mul = 4096;
    for (const x of k) { score += x * mul; mul /= 16; }
    const miniRoyal = cat === 5 && straightHigh === 14;
    return { cat, score, name: miniRoyal ? 'Mini Royal' : TCP_NAMES[cat], miniRoyal, high: r[0], ranks: r };
  }

  const api = { eval5, best, eval3, HAND_NAMES, TCP_NAMES, CAT };
  root.Poker = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
