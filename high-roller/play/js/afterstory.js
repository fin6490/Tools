/* After the story: side jobs for when the dream's story is over and you go back to the town (Level 1).
   With Kessler gone, the town breathes out, and everyone you know has one more thing to ask of you.
   They're ordinary side jobs (npcs.js runs them: the givers offer them when you talk), marked post,
   so they only appear once the story has an ending. Casino missions, the fragments, the people,
   business, darts and poker:
   - Vinnie: a victory lap of every casino in town, then going legit (two businesses that pay nightly)
   - Margot: the charity gala (a $25,000 day at the Palace), then a seat at the table (a stake in the
     Palace or the Grand Hotel)
   - Lou: the last run of the season (forty rounds on the Riverboat)
   - Doc: the final table (win a Back Room tournament), then the High Roller
   - Mick: Joost wants a rematch (win the Golden Arrow again), and a maximum (a 180)
   - Sparky: lost property (find all seventeen fragments)
   - Dolores: everybody's here (become good friends with five people in town), then Sal's wake, for
     real this time (put $20,000 behind the bar)
   - Sal: his last secret (salquest.js), the only job that opens a room you've never seen
   Jobs that count something from now on keep where the counter was when you took them (start),
   and jobs about what you own or know are checked when you talk to the giver (check). */
(() => {
  const base = (s, keys) => { s.base = {}; for (const k of keys) s.base[k] = App.counter(k); };
  const since = (s, keys) => keys.reduce((n, k) => n + App.counter(k) - ((s.base || {})[k] || 0), 0);
  const nightly = () => Object.keys(ITEMS).filter(k => App.has(k) && ITEMS[k].income > 0).length;
  const friends = () => Object.keys(REL_PEOPLE).filter(k => Rel.level(k) >= 2).length;
  Object.assign(QUESTS, {
    vinnieTour: { giver: 'vinnie', post: true, title: 'Victory Lap', desc: `Win a round at a table in every casino in town (${Object.keys(VENUES).length} of them), now nobody's rigging them.`, need: Object.keys(VENUES).length, reward: { cash: 10000, swagger: 5 },
      offer: 'Kessler\'s gone, the tables are straight for the first time in thirty years, and the whole town wants to see the kid who did it. Do a lap. Win somewhere in every joint. Let \'em see you.',
      on: (t, d, s) => { if (t !== 'round' || !(d.net > 0)) return false; s.v = s.v || {}; if (s.v[d.venue]) return false; s.v[d.venue] = 1; return true; } },
    vinnieLegit: { giver: 'vinnie', post: true, after: 'vinnieTour', title: 'Going Legit', desc: 'Own two businesses that pay you every night (Investments or Deeds at Lucky Strike Outfitters), then tell Vinnie.', reward: { cash: 25000, swagger: 6 },
      offer: 'Here\'s the thing about winning, kid: it stops. Businesses don\'t. Own two things that pay you while you sleep and I\'ll stop worrying about you. Mostly.',
      check: () => nightly() >= 2, done: 'Two businesses. Look at you. Sal would\'ve... *coughs* Sal would\'ve asked for a loan. Here\'s a little something for the books.' },
    margotGala: { giver: 'margot', post: true, title: 'The Charity Gala', desc: 'Finish a day $25,000 or more up while playing at the Gilded Palace (the gala money goes to the children\'s ward).', reward: { cash: 15000, swagger: 5 },
      offer: 'The Palace is holding a gala for the children\'s hospital, now that it\'s my Palace to hold one in. The house matches whatever you win. Win big, darling. Twenty-five thousand in a night. For the children.',
      on: (t, d) => t === 'round' && d.venue === 'palace' && App.state.today.net >= 25000 },
    margotBoard: { giver: 'margot', post: true, after: 'margotGala', title: 'A Seat at the Table', desc: 'Buy a controlling stake in the Gilded Palace or the Grand Hotel, then talk to Margot.', reward: { cash: 0, swagger: 10 },
      offer: 'I need someone on the board who isn\'t afraid of me. A controlling stake in the Palace, or the Grand, and you\'re in the room where it happens. I\'d like you in that room.',
      check: () => App.has('palaceDeed') || App.has('grandHotel'), done: 'Welcome to the board. Our first item of business is your chair, which I have already had re-upholstered. Our second is champagne.' },
    louLastRun: { giver: 'lou', post: true, title: 'The Last Run of the Season', desc: 'Play 40 rounds at the Riverboat\'s tables before the old boat goes in for the winter.', need: 40, reward: { cash: 5000, swagger: 3 },
      offer: 'She goes in for her refit at the end of the month, and I don\'t know how many more seasons either of us has. Make this run a good one. Keep my tables busy, would you? Forty hands. For the old girl.',
      on: (t, d) => t === 'round' && d.venue === 'riverboat' },
    docFinal: { giver: 'doc', post: true, title: 'The Final Table', desc: 'Win a Back Room poker tournament outright.', reward: { cash: 10000, swagger: 6 },
      offer: 'You\'ve cashed. Cashing\'s surviving. Now go and win one, all the way, every chip on the table in front of you. I want to hear about it from someone who isn\'t you.',
      on: (t, d) => t === 'poker' && d.place === 1 },
    docHighRoller: { giver: 'doc', post: true, after: 'docFinal', title: 'High Roller', desc: 'Win the High Roller or the Super High Roller tournament.', reward: { cash: 50000, swagger: 10 },
      offer: 'Sal played the High Roller once. Came second. Talked about the river card for twenty years. Win it, and give the old man a better story.',
      start: s => base(s, ['pokerWin_hr', 'pokerWin_shr']), check: s => since(s, ['pokerWin_hr', 'pokerWin_shr']) > 0, done: 'You won it. Sit down. Tell me about the river card. Slowly.' },
    mickRematch: { giver: 'mick', post: true, after: 'darts4', title: 'Joost Wants a Rematch', desc: 'Win the Golden Arrow again. Dutch Joost is back, and he\'s been practising.', reward: { cash: 10000, swagger: 5 },
      offer: 'Joost flew back. Says his loss was "a statistical aberration". He\'s entered the Golden Arrow again and he\'s been practising on a board in his hotel room. Shut him up, would you?',
      start: s => base(s, ['dartGAwin']), check: s => since(s, ['dartGAwin']) > 0, done: 'Statistical aberration, my eye. Twice is a pattern. He\'s already booked a flight for next year.' },
    mick180: { giver: 'mick', post: true, after: 'darts1', title: 'Maximum!', desc: 'Throw a 180 (three treble twenties) in any darts match.', reward: { cash: 3000, swagger: 4 },
      offer: 'In forty years behind this bar I\'ve called "one hundred and eighty" exactly eleven times. I\'d like to make it twelve before I retire. Three in the treble twenty, friend.',
      start: s => base(s, ['dart180']), check: s => since(s, ['dart180']) > 0, done: 'ONE HUNDRED AND EIGHTYYY! ...I\'ve been saving that. Twelve. Drinks are on me.' },
    sparkyFrags: { giver: 'sparky', post: true, title: 'Lost Property', desc: `Find all ${FRAGMENTS.length} fragments hidden around town and in its buildings, then talk to Sparky.`, reward: { cash: 5000, swagger: 5 },
      offer: 'Chief, weird thing. I keep finding stuff in the coin trays that doesn\'t belong to anybody. A kid\'s shoe. A seashell. A little hospital bracelet. Like the town\'s trying to give something back. Find the rest of it?',
      check: () => Fragments.count() >= FRAGMENTS.length, done: 'All of it. Huh. *he looks at you for a long moment* They\'re yours, aren\'t they. I won\'t ask. Here. For your trouble.' },
    dolFriends: { giver: 'dolores', post: true, title: 'Everybody\'s Here', desc: 'Become good friends with five people in town (talk, play with them, do their jobs), then talk to Dolores.', reward: { cash: 5000, swagger: 5 },
      offer: 'Sugar, you saved this town and half of it still only knows you as the kid at the tables. Go and actually know people. Five friends. Then come back and tell me about them.',
      check: () => friends() >= 5, done: 'Five! Look at you, with a whole life in this town. That\'s what Sal had, you know. Not the money. This.' },
    dolWake: { giver: 'dolores', post: true, after: 'dolFriends', title: 'Sal\'s Wake (For Real)', desc: 'Put $20,000 behind the Spur\'s bar for the party, then talk to Dolores on the night.', reward: { cash: 0, swagger: 8 },
      offer: 'We never had a proper wake for Sal, on account of him not being dead. Turns out a party\'s a party. Put twenty thousand behind the bar and we\'ll do it right: the band, the whole town, the good bottles.',
      check: () => App.state.bank >= 20000, pay: 20000, done: '*She rings the old brass bell behind the bar* Ladies and gentlemen: to Sal, who never could stay dead, and to the kid who came looking. Everybody drinks! ...You can have a soda, sugar. Nobody\'s counting but me.' },
    // Sal, back from the dead, has one last secret (salquest.js runs the steps)
    salKey: { giver: 'sal', post: true, title: 'Sal\'s Last Secret', desc: 'Sal left you something in Room 7 at the Starlite. Darlene won\'t open it for anybody... except whoever brings her a slice of Mel\'s cherry pie, the way Sal did every Sunday.', reward: { cash: 0, swagger: 3 },
      offer: 'Kid. Sit. *He lowers his voice.* When I was dead, I stayed in Room 7 at the Starlite for a month. I left something there for you, in case I stayed dead. Darlene won\'t open Seven for anybody. But she\'s got a weakness, and it\'s cherry, and it comes from Mel\'s.' },
    salDials: { giver: 'sal', post: true, after: 'salKey', title: 'The Combination', desc: 'Behind the longhorns on the Spur\'s back wall: a lock with three dials. "The year I won it all. The room I hid in. The number I never stopped betting." The answers are around town.', reward: { cash: 0, swagger: 4 },
      offer: 'You found the card. Good. No, I won\'t tell you the numbers, where\'s the fun in that? Everything you need is in this town. You know me better than you think, kid.' },
    salClub: { giver: 'sal', post: true, after: 'salDials', title: 'The Seventeen Club', desc: 'Go down the stairs behind the longhorns, find Sal at the bottom, and let him show you round.', reward: { cash: 0, swagger: 5 },
      offer: 'You opened it! Then what are you doing up here? Go on down. I\'ll put the coffee on.',
      check: () => (World.where() || {}).map === 'r:club',
      done: 'Welcome to the Seventeen Club, kid. Opened 1926, the year the town went dry. My granddad dealt faro at that table. Forty years I kept it to myself. Not even Dolores. *He spins the old safe\'s dial back to zero.* Seventeen, seventeen, seventeen. What\'s in there is yours.' },
  });
})();
