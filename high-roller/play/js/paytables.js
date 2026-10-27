/* Paytables for every side bet and progressive. These are deliberately generous:
   most side bets are tuned to ~99-101% return, and progressives start a little
   under break-even and go positive as their meters climb.
   `rtp` values are produced by tools/odds.js (run: node casino/tools/odds.js). */
(function (root) {
  const PAY = {
    bj: {
      perfectPairs: [
        { key: 'perfect', name: 'Perfect Pair (same suit)', pays: 28 },
        { key: 'colored', name: 'Colored Pair (same color)', pays: 13 },
        { key: 'mixed', name: 'Mixed Pair', pays: 6 },
      ],
      plus3: [
        { key: 'suitedTrips', name: 'Suited Trips', pays: 100 },
        { key: 'straightFlush', name: 'Straight Flush', pays: 40 },
        { key: 'trips', name: 'Three of a Kind', pays: 30 },
        { key: 'straight', name: 'Straight', pays: 11 },
        { key: 'flush', name: 'Flush', pays: 5 },
      ],
      prog: {
        key: 'bj', name: 'Blazing 7s Jackpot', cost: 5, seed: 15000,
        tiers: [
          { key: 's777', name: 'Three Suited 7s', pct: 1 },
          { key: '777', name: 'Three 7s', pct: 0.1 },
          { key: 's77', name: 'Two Suited 7s', amt: 750 },
          { key: '77', name: 'Two 7s', amt: 300 },
          { key: '7', name: 'One 7', amt: 13 },
        ],
      },
    },
    uth: {
      trips: [
        { key: 'royal', name: 'Royal Flush', pays: 100 },
        { key: 'sf', name: 'Straight Flush', pays: 50 },
        { key: 'quads', name: 'Four of a Kind', pays: 30 },
        { key: 'fh', name: 'Full House', pays: 9 },
        { key: 'flush', name: 'Flush', pays: 7 },
        { key: 'straight', name: 'Straight', pays: 4 },
        { key: 'trips', name: 'Three of a Kind', pays: 3 },
      ],
      blind: [
        { key: 'royal', name: 'Royal Flush', pays: 500 },
        { key: 'sf', name: 'Straight Flush', pays: 50 },
        { key: 'quads', name: 'Four of a Kind', pays: 10 },
        { key: 'fh', name: 'Full House', pays: 3 },
        { key: 'flush', name: 'Flush', pays: 1.5 },
        { key: 'straight', name: 'Straight', pays: 1 },
      ],
      pocket: [
        { key: 'AA', name: 'Pocket Aces', pays: 35 },
        { key: 'AKs', name: 'A-K Suited', pays: 25 },
        { key: 'AQJs', name: 'A-Q / A-J Suited', pays: 20 },
        { key: 'AKo', name: 'A-K Offsuit', pays: 15 },
        { key: 'AQJo', name: 'A-Q / A-J Offsuit', pays: 8 },
        { key: 'pair', name: 'Any Pair 2s-Ks', pays: 5 },
      ],
      prog: {
        key: 'uth', name: 'Hold\'em Jackpot', cost: 5, seed: 25000,
        tiers: [
          { key: 'royal', name: 'Royal Flush', pct: 1 },
          { key: 'sf', name: 'Straight Flush', pct: 0.1 },
          { key: 'quads', name: 'Four of a Kind', amt: 2000 },
          { key: 'fh', name: 'Full House', amt: 500 },
          { key: 'flush', name: 'Flush', amt: 400 },
          { key: 'straight', name: 'Straight', amt: 250 },
          { key: 'trips', name: 'Three of a Kind', amt: 90 },
        ],
      },
    },
    bac: {
      main: { player: 1, banker: 0.95, tie: 9 },
      pair: [
        { key: 'suited', name: 'Suited Pair', pays: 17 },
        { key: 'pair', name: 'Pair', pays: 11 },
      ],
      dragon7: 43, // banker wins with three-card 7
      panda8: 28,  // player wins with three-card 8
      prog: {
        key: 'bac', name: 'Four of a Kind Jackpot', cost: 5, seed: 50000,
        // judged on the first four cards dealt (Player 1-2, Banker 1-2)
        tiers: [
          { key: 'q4s', name: 'Four identical cards', pct: 1 },
          { key: 'q4', name: 'Four of a Kind', amt: 1000 },
          { key: 'n99', name: 'Both hands Natural 9', amt: 60 },
          { key: 'n88', name: 'Both hands Natural 8', amt: 40 },
          { key: 'n98', name: 'Natural 9 vs Natural 8', amt: 25 },
          { key: 'sn', name: 'Any Suited Natural', amt: 20 },
          { key: 'pair', name: 'Player or Banker Pair', amt: 12 },
        ],
      },
    },
    craps: {
      fire: [
        { pts: 6, name: '6 Points', pays: 1400 },
        { pts: 5, name: '5 Points', pays: 300 },
        { pts: 4, name: '4 Points', pays: 30 },
      ],
      ats: { small: 37, tall: 37, all: 189 },
      // one-roll and hardway props at true odds: zero house edge
      props: { hard4: 8, hard6: 10, any7: 5, anyCraps: 8, yo: 17, aceDeuce: 17, aces: 35, boxcars: 35 },
      place: { 4: 9 / 5, 5: 7 / 5, 6: 7 / 6, 8: 7 / 6, 9: 7 / 5, 10: 9 / 5 },
    },
    ms: {
      main: [
        { key: 'royal', name: 'Royal Flush', pays: 500 },
        { key: 'sf', name: 'Straight Flush', pays: 100 },
        { key: 'quads', name: 'Four of a Kind', pays: 40 },
        { key: 'fh', name: 'Full House', pays: 10 },
        { key: 'flush', name: 'Flush', pays: 6 },
        { key: 'straight', name: 'Straight', pays: 4 },
        { key: 'trips', name: 'Three of a Kind', pays: 3 },
        { key: 'twopair', name: 'Two Pair', pays: 2 },
        { key: 'highpair', name: 'Pair of Jacks or Better', pays: 1 },
        { key: 'midpair', name: 'Pair of 6s to 10s', pays: 0 },
      ],
      bonus3: [
        { key: 'mini', name: 'Mini Royal (A-K-Q suited)', pays: 100 },
        { key: 'sf', name: 'Straight Flush', pays: 40 },
        { key: 'trips', name: 'Three of a Kind', pays: 30 },
        { key: 'straight', name: 'Straight', pays: 6 },
        { key: 'flush', name: 'Flush', pays: 4 },
        { key: 'pair', name: 'Pair', pays: 1 },
      ],
      prog: {
        key: 'ms', name: 'Stud Jackpot', cost: 5, seed: 25000,
        tiers: [
          { key: 'royal', name: 'Royal Flush', pct: 1 },
          { key: 'sf', name: 'Straight Flush', pct: 0.1 },
          { key: 'quads', name: 'Four of a Kind', amt: 2000 },
          { key: 'fh', name: 'Full House', amt: 500 },
          { key: 'flush', name: 'Flush', amt: 400 },
          { key: 'straight', name: 'Straight', amt: 250 },
          { key: 'trips', name: 'Three of a Kind', amt: 90 },
        ],
      },
    },
    tcp: {
      anteBonus: [
        { key: 'sf', name: 'Straight Flush', pays: 5 },
        { key: 'trips', name: 'Three of a Kind', pays: 4 },
        { key: 'straight', name: 'Straight', pays: 1 },
      ],
      pairPlus: [
        { key: 'mini', name: 'Mini Royal', pays: 200 },
        { key: 'sf', name: 'Straight Flush', pays: 40 },
        { key: 'trips', name: 'Three of a Kind', pays: 30 },
        { key: 'straight', name: 'Straight', pays: 6 },
        { key: 'flush', name: 'Flush', pays: 4 },
        { key: 'pair', name: 'Pair', pays: 1 },
      ],
      six: [
        { key: 'royal', name: 'Royal Flush', pays: 1000 },
        { key: 'sf', name: 'Straight Flush', pays: 200 },
        { key: 'quads', name: 'Four of a Kind', pays: 100 },
        { key: 'fh', name: 'Full House', pays: 25 },
        { key: 'flush', name: 'Flush', pays: 20 },
        { key: 'straight', name: 'Straight', pays: 10 },
        { key: 'trips', name: 'Three of a Kind', pays: 7 },
      ],
      prog: {
        key: 'tcp', name: 'Mini Royal Jackpot', cost: 5, seed: 10000,
        tiers: [
          { key: 'spadeRoyal', name: 'A-K-Q of Spades', pct: 1 },
          { key: 'mini', name: 'Mini Royal (other suits)', pct: 0.1 },
          { key: 'sf', name: 'Straight Flush', amt: 500 },
          { key: 'trips', name: 'Three of a Kind', amt: 400 },
          { key: 'straight', name: 'Straight', amt: 50 },
          { key: 'flush', name: 'Flush', amt: 12 },
        ],
      },
    },
    c4: {
      // Super Bonus: paid on a straight or better whatever the dealer has; otherwise it pushes if you
      // beat or tie the dealer and loses if you don't (or fold)
      superBonus: [
        { key: 'aces4', name: 'Four Aces', pays: 200 },
        { key: 'sf', name: 'Straight Flush', pays: 50 },
        { key: 'quads', name: 'Four of a Kind', pays: 40 },
        { key: 'flush', name: 'Flush', pays: 2 },
        { key: 'straight', name: 'Straight', pays: 1 },
      ],
      queensUp: [
        { key: 'quads', name: 'Four of a Kind', pays: 50 },
        { key: 'sf', name: 'Straight Flush', pays: 40 },
        { key: 'trips', name: 'Three of a Kind', pays: 8 },
        { key: 'flush', name: 'Flush', pays: 5 },
        { key: 'straight', name: 'Straight', pays: 3 },
        { key: 'twopair', name: 'Two Pair', pays: 2 },
        { key: 'qup', name: 'Pair of Queens or better', pays: 1 },
      ],
    },
    lir: {
      main: [
        { key: 'royal', name: 'Royal Flush', pays: 1000 },
        { key: 'sf', name: 'Straight Flush', pays: 200 },
        { key: 'quads', name: 'Four of a Kind', pays: 50 },
        { key: 'fh', name: 'Full House', pays: 11 },
        { key: 'flush', name: 'Flush', pays: 8 },
        { key: 'straight', name: 'Straight', pays: 5 },
        { key: 'trips', name: 'Three of a Kind', pays: 3 },
        { key: 'twopair', name: 'Two Pair', pays: 2 },
        { key: 'tens', name: 'Pair of 10s or Better', pays: 1 },
      ],
      bonus3: [
        { key: 'mini', name: 'Mini Royal', pays: 100 },
        { key: 'sf', name: 'Straight Flush', pays: 40 },
        { key: 'trips', name: 'Three of a Kind', pays: 30 },
        { key: 'straight', name: 'Straight', pays: 6 },
        { key: 'flush', name: 'Flush', pays: 4 },
        { key: 'pair', name: 'Pair', pays: 1 },
      ],
    },
    war: {
      tie: 12, suitedTie: 14,
    },
  };
  root.PAY = PAY;
  if (typeof module !== 'undefined' && module.exports) module.exports = PAY;
})(typeof window !== 'undefined' ? window : globalThis);
