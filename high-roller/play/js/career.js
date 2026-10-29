/* Career mode: characters, venues, shop items, loans, goals, story chapters and the day cycle. */
const CHARACTERS = {
  narrator: { name: '', face: '🎲', color: '#334' },
  me: { name: 'You', face: '🙂', color: '#2a6' },
  vinnie: { name: 'Vinnie "The Vig" Moretti', face: '🦈', color: '#7a2131' },
  dolores: { name: 'Dolores, bartender at the Spur', face: '💁‍♀️', color: '#a0522d' },
  mick: { name: 'Mick "The Arrow" Doyle', face: '🎯', color: '#2e7d32' },
  sparky: { name: 'Ignatius "Sparky" Vance', face: '🔧', color: '#d35400' },
  doc: { name: '"Doc" Holloway', face: '🧓', color: '#3a5f8a' },
  margot: { name: 'Margot Laval', face: '💃', color: '#8a2be2' },
  kessler: { name: 'Augustus Kessler', face: '🎩', color: '#222' },
  nico: { name: 'Nico, Vinnie\'s muscle', face: '🦍', color: '#555' },
};

const VENUES = {
  spur: {
    name: 'The Rusty Spur', icon: '🤠', tag: 'Sticky floors, cheap beer, honest-ish dealers.',
    limits: { min: 5, max: 250 }, chips: [1, 5, 25, 100],
    games: ['bj', 'tcp', 'war', 'roulette', 'craps'],
    rules: {
      bj: { bjPays: 1.5, h17: true, das: false, surrender: false, maxHands: 3 },
      craps: { odds: 2, field2: 2, field12: 2 },
      roulette: { wheel: 'american' },
    },
    unlock: null,
  },
  riverboat: {
    name: "Lucky Lou's Riverboat", icon: '🛳️', tag: 'Paddle wheels, brass rails and a proper poker pit.',
    limits: { min: 10, max: 2000 }, chips: [5, 25, 100, 500],
    games: ['bj', 'uth', 'ms', 'tcp', 'lir', 'bac', 'craps', 'roulette', 'war'],
    rules: {
      bj: { bjPays: 1.5, h17: true, das: true, surrender: false, maxHands: 4 },
      craps: { odds: 345, field2: 2, field12: 3 },
      roulette: { wheel: 'american' },
      bac: { ez: false, commission: 0.05 },
    },
    unlock: { chapter: 1, item: 'suit', bank: 3000, text: 'Make Vinnie\'s first payment on Sal\'s marker, own a Decent Suit and carry $3,000.' },
  },
  palace: {
    name: 'The Gilded Palace', icon: '🏛️', tag: 'Chandeliers, champagne, and a dress code.',
    limits: { min: 25, max: 10000 }, chips: [25, 100, 500, 1000, 5000],
    games: ['bj', 'uth', 'ms', 'tcp', 'lir', 'bac', 'craps', 'roulette', 'war'],
    rules: {
      bj: { bjPays: 1.5, h17: false, das: true, surrender: true, maxHands: 4 },
      craps: { odds: 10, field2: 3, field12: 3 },
      roulette: { wheel: 'european' },
      bac: { ez: true },
    },
    unlock: { chapter: 2, item: 'tux', bank: 25000, swagger: 25, text: 'Reach chapter 3, own a Tailored Tuxedo, 25 swagger, carry $25,000.' },
  },
  salon: {
    name: 'Monte Royale Salon Privé', icon: '💎', tag: 'No windows, no clocks, no limits worth mentioning.',
    limits: { min: 100, max: 100000 }, chips: [100, 500, 1000, 5000, 25000],
    games: ['bj', 'uth', 'ms', 'tcp', 'lir', 'bac', 'craps', 'roulette', 'c4'], // Crazy 4 only plays in the Salon
    rules: {
      bj: { bjPays: 1.5, h17: false, das: true, surrender: true, maxHands: 4, rsa: true },
      craps: { odds: 100, field2: 3, field12: 3 },
      roulette: { wheel: 'french' },
      bac: { ez: false, commission: 0.04 },
    },
    unlock: { chapter: 3, item: 'platinum', bank: 250000, swagger: 60, text: 'Reach chapter 4, hold a Platinum Players Card, 60 swagger, carry $250,000.' },
  },
};

/* Shop items. swagger = reputation; perks unlock in-game helpers; stamina raises rounds per day;
   comp = cash-back on everything wagered, paid when you sleep; upkeep = cost per day. */
const ITEMS = {
  // Wardrobe
  blazer: { cat: 'Wardrobe', name: 'Thrift-Store Blazer', icon: '🧥', price: 150, swagger: 3, desc: 'Smells faintly of mothballs and ambition.' },
  shades: { cat: 'Wardrobe', name: 'Aviator Shades', icon: '🕶️', price: 400, swagger: 4, desc: 'Nobody can read your tells. You have so many tells.' },
  suit: { cat: 'Wardrobe', name: 'Decent Suit', icon: '👔', price: 1200, swagger: 6, desc: 'Required to board the Riverboat. Off the rack, but the right rack.' },
  fedora: { cat: 'Wardrobe', name: 'Felt Fedora', icon: '🎩', price: 900, swagger: 5, desc: 'Tip it to the dealer after a big hand.' },
  chain: { cat: 'Wardrobe', name: 'Gold Rope Chain', icon: '📿', price: 3500, swagger: 8, desc: 'Heavy enough to anchor the Riverboat.' },
  tux: { cat: 'Wardrobe', name: 'Tailored Tuxedo', icon: '🤵', price: 12000, swagger: 12, desc: 'The Gilded Palace dress code, and then some.' },
  watch: { cat: 'Wardrobe', name: 'Swiss Chronograph', icon: '⌚', price: 35000, swagger: 15, desc: 'Tells the time. Mostly tells everyone else you have money.' },
  ring: { cat: 'Wardrobe', name: 'Diamond Pinky Ring', icon: '💍', price: 90000, swagger: 20, desc: 'Catches the light on every double down.' },
  // Lifestyle
  apartment: { cat: 'Lifestyle', name: 'Downtown Apartment', icon: '🏢', price: 6000, swagger: 6, stamina: 30, upkeep: 60, desc: 'Better sleep than the motel. +30 stamina per day. $60/day rent.' },
  penthouse: { cat: 'Lifestyle', name: 'Strip Penthouse', icon: '🌆', price: 150000, swagger: 20, stamina: 80, upkeep: 600, requires: 'apartment', desc: 'Floor-to-ceiling neon. +80 stamina. $600/day upkeep.' },
  sedan: { cat: 'Lifestyle', name: 'Rusty Sedan', icon: '🚗', price: 2500, swagger: 3, stamina: 10, desc: 'Beats the bus. +10 stamina.' },
  muscle: { cat: 'Lifestyle', name: 'Cherry-Red Muscle Car', icon: '🏎️', price: 40000, swagger: 14, stamina: 10, requires: 'sedan', desc: 'Valet guys fight over it.' },
  limo: { cat: 'Lifestyle', name: 'Stretch Limo & Driver', icon: '🚙', price: 400000, swagger: 30, stamina: 30, upkeep: 300, requires: 'muscle', desc: 'Nap between casinos. +30 stamina. $300/day for the driver.' },
  // Gear (perks)
  meterReader: { cat: 'Gear', name: 'Slot Tech\'s Meter Reader', icon: '📟', price: 4000, requiresQuest: 'slots3', questHint: 'Ask Sparky at the Spur\'s slot row about this', desc: 'A handheld that reads the mystery jackpot triggers. At any slot machine, shows exactly what the next spin is worth.' },
  flights: { cat: 'Gear', name: 'Custom Dart Flights', icon: '🪶', price: 400, desc: 'Stiff kite flights and a proper case. Your darts fly straighter: a steadier sight at the Spur\'s board.' },
  salDarts: { cat: 'Gear', name: "Sal's Tungsten Darts", icon: '🎯', price: 3000, requiresQuest: 'darts3', questHint: 'Ask Mick Doyle at the Spur about these', desc: '23-gram tungsten, worn smooth where Sal\'s fingers held them. Much steadier at the board, and Mick will want to see them.' },
  stratcard: { cat: 'Gear', name: 'Basic Strategy Card', icon: '🃏', price: 200, perks: ['bjhint'], desc: 'Highlights the mathematically best blackjack play.' },
  oddsbook: { cat: 'Gear', name: 'Pit Boss Odds Book', icon: '📕', price: 600, perks: ['odds'], desc: 'Shows the exact return-to-player of every bet and side bet.' },
  pokerguide: { cat: 'Gear', name: "Doc's Poker Notebook", icon: '📓', price: 1500, perks: ['pokerhint'], desc: 'Strategy hints for Hold\'em, Mississippi Stud, Three Card Poker and Let It Ride.', requiresFlag: 'metDoc' },
  counting: { cat: 'Gear', name: "Doc's Card Counting Course", icon: '🧮', price: 5000, perks: ['count'], desc: 'Shows the Hi-Lo running and true count at blackjack.', requiresFlag: 'metDoc' },
  tracker: { cat: 'Gear', name: 'Jackpot Tracker App', icon: '📱', price: 2500, perks: ['tracker'], desc: 'Live return-to-player for every progressive meter. Bet when it goes green.' },
  silver: { cat: 'Gear', name: 'Silver Players Card', icon: '🥈', price: 800, comp: 0.0025, desc: '0.25% cash-back on everything you wager, paid nightly.' },
  gold: { cat: 'Gear', name: 'Gold Players Card', icon: '🥇', price: 15000, comp: 0.005, requires: 'silver', swagger: 5, desc: '0.5% cash-back on everything you wager.' },
  platinum: { cat: 'Gear', name: 'Platinum Players Card', icon: '💳', price: 120000, comp: 0.01, requires: 'gold', swagger: 10, desc: '1% cash-back on everything you wager. The Salon wants to see one.' },
  black: { cat: 'Gear', name: 'Black Card', icon: '🖤', price: 1500000, comp: 0.015, requires: 'platinum', swagger: 20, desc: '1.5% cash-back. They send a car.' },
  // Lucky charms (cosmetic swagger; the math does not care)
  rabbit: { cat: 'Charms', name: "Rabbit's Foot", icon: '🐇', price: 75, swagger: 1, desc: 'Statistically does nothing. You feel luckier anyway.' },
  dice: { cat: 'Charms', name: 'Fuzzy Dice', icon: '🎲', price: 120, swagger: 1, desc: 'For the rear-view mirror you do not have yet.' },
  cigar: { cat: 'Charms', name: 'Box of Havanas', icon: '🚬', price: 2000, swagger: 4, desc: 'Light one when the meter is green.' },
  // Table cosmetics
  feltBlue: { cat: 'Table Style', name: 'Royal Blue Felt', icon: '🟦', price: 300, felt: 'blue', desc: 'Swap the felt on every table you sit at.' },
  feltRed: { cat: 'Table Style', name: 'Crimson Felt', icon: '🟥', price: 300, felt: 'red', desc: 'Very Monte Carlo.' },
  feltBlack: { cat: 'Table Style', name: 'Black & Gold Felt', icon: '⬛', price: 5000, felt: 'black', desc: 'High-limit room energy.' },
  backBlue: { cat: 'Table Style', name: 'Blue Card Backs', icon: '🂠', price: 150, back: 'blue', desc: 'Classic blue diamond backs.' },
  backSal: { cat: 'Table Style', name: "Sal's Seventeen Backs", icon: '📼', price: 0, back: 'sal', award: 'tape', desc: 'Midnight blue with a gold 17. Only for the one who heard the tape.' },
  salWatch: { cat: 'Charms', name: "Sal's Pocket Watch", icon: '⌚', price: 0, swagger: 17, award: 'sal', desc: 'Gold, engraved: "Time is the only bank you can\'t beat. Spend it on people." From the safe in the Seventeen Club.' },
  backGold: { cat: 'Table Style', name: 'Gilded Card Backs', icon: '🌟', price: 4000, back: 'gold', desc: 'Gold leaf. Probably not real gold.' },
  // Deeds (story)
  spurDeed: { cat: 'Deeds', name: 'Deed to The Rusty Spur', icon: '📜', price: 1000000, swagger: 40, income: 8000, requiresChapter: 3, desc: 'Buy back the bar Sal lost. Pays $8,000 a day.' },
  trustee: { cat: 'Deeds', name: 'Trustee of the Monte Royale', icon: '⚖️', price: 0, swagger: 60, income: 300000, award: 'justice', desc: 'The Gaming Commission put you in charge of Kessler\'s casino while it is wound up, honestly this time. Pays $300,000 a day.' },
  palaceDeed: { cat: 'Deeds', name: 'Controlling Stake: The Gilded Palace', icon: '🏰', price: 25000000, swagger: 100, income: 350000, requires: 'spurDeed', desc: 'Margot will want a word. Pays $350,000 a day.' },
  // Investments: businesses that pay you every night (the road to a billion)
  backroom: { cat: 'Investments', name: 'Back Room Refit', icon: '♠️', price: 15000, swagger: 3, requiresQuest: 'pokerRoom', desc: 'New felt, a working jukebox and a lock Kessler doesn\'t have a key to. Reopens the Spur\'s poker room.' },
  dinerStake: { cat: 'Investments', name: "Partner in Mel's Diner", icon: '🍳', price: 250000, income: 2500, requiresChapter: 2, desc: 'Half the pie, literally. Pays $2,500 a day.' },
  quikstop: { cat: 'Investments', name: 'Quik-Stop Franchise', icon: '🏪', price: 1000000, income: 12000, requiresChapter: 3, desc: 'Twelve stores, one terrible coffee recipe. Pays $12,000 a day.' },
  pokerSeries: { cat: 'Investments', name: 'Back Room Poker Series', icon: '🏆', price: 3000000, income: 40000, requires: 'backroom', requiresChapter: 3, desc: 'Turn the back room into a televised tour stop. Pays $40,000 a day.' },
  grandHotel: { cat: 'Investments', name: 'The Grand Hotel', icon: '🏨', price: 25000000, income: 300000, requiresEnding: true, desc: 'Every room, every key, every minibar. Pays $300,000 a day.' },
  riverboatStake: { cat: 'Investments', name: "51% of Lucky Lou's Riverboat", icon: '🛳️', price: 80000000, income: 1000000, requiresEnding: true, desc: 'Lou keeps the captain\'s hat. You keep the profits. Pays $1,000,000 a day.' },
  salonDeed: { cat: 'Investments', name: 'The Monte Royale Salon Privé', icon: '💎', price: 400000000, income: 5500000, requiresEnding: true, desc: 'Kessler\'s old empire, at auction. Pays $5,500,000 a day.' },
  resort: { cat: 'Investments', name: 'The Seventeen Resort & Casino', icon: '🌟', price: 1500000000, swagger: 200, requiresEnding: true, desc: 'Seventeen towers on the river. Your name on the sign. Sal\'s silver dollar in the lobby. The last thing money can buy here.' },
};
/* Food and drink. hunger/thirst/energy are how much each bar refills (bars run 0-100). */
const MENU = {
  coffee: { name: 'Coffee', icon: '☕', price: 3, thirst: 20, energy: 12, drink: true, caf: true },
  water: { name: 'Bottled Water', icon: '💧', price: 2, thirst: 35, drink: true },
  soda: { name: 'Soda', icon: '🥤', price: 3, thirst: 30, energy: 4, drink: true, caf: true },
  energy: { name: 'Lightning Energy Drink', icon: '⚡', price: 6, thirst: 15, energy: 35, drink: true, caf: true },
  candy: { name: 'Candy Bar', icon: '🍫', price: 2, hunger: 12, energy: 4 },
  sandwich: { name: 'Gas-Station Sandwich', icon: '🥪', price: 7, hunger: 35 },
  breakfast: { name: 'Lumberjack Breakfast', icon: '🍳', price: 9, hunger: 45, thirst: 10, energy: 8 },
  burger: { name: 'Double Cheeseburger & Fries', icon: '🍔', price: 12, hunger: 60 },
  pie: { name: 'Slice of Cherry Pie', icon: '🥧', price: 5, hunger: 20 },
  shake: { name: 'Chocolate Milkshake', icon: '🥛', price: 6, hunger: 10, thirst: 25 },
  beer: { name: 'Draft Beer', icon: '🍺', price: 5, thirst: 30, energy: -3, drink: true },
  whiskey: { name: 'Whiskey, Neat', icon: '🥃', price: 9, thirst: 15, energy: -2, drink: true },
  nachos: { name: 'Loaded Nachos', icon: '🧀', price: 8, hunger: 35 },
  cocktail: { name: 'Riverboat Old Fashioned', icon: '🍹', price: 12, thirst: 30, drink: true },
  shrimp: { name: 'Shrimp Basket', icon: '🍤', price: 16, hunger: 45 },
  champagne: { name: 'Champagne', icon: '🥂', price: 35, thirst: 30, energy: 3, drink: true },
  espresso: { name: 'Double Espresso', icon: '☕', price: 8, thirst: 10, energy: 25, drink: true, caf: true },
  buffet: { name: 'Palace Buffet', icon: '🍽️', price: 55, hunger: 100, thirst: 20 },
  martini: { name: 'Vesper Martini', icon: '🍸', price: 60, thirst: 30, drink: true },
  caviar: { name: 'Caviar Service', icon: '🥄', price: 400, hunger: 35, energy: 10 },
  wagyu: { name: 'Wagyu Sliders', icon: '🍔', price: 150, hunger: 75 },
  steak: { name: '32oz Tomahawk Steak', icon: '🥩', price: 120, hunger: 100, energy: 15 },
  lobster: { name: 'Lobster Thermidor', icon: '🦞', price: 95, hunger: 70 },
  wine: { name: 'Glass of Bordeaux', icon: '🍷', price: 30, thirst: 25, drink: true },
};
// places you can eat/drink. comp: drinks are free once you've wagered 20x the venue minimum today.
const PLACES = {
  diner: { name: "Mel's Diner", icon: '🍳', who: 'Mel', line: 'Sit anywhere, hon. Coffee\'s fresh-ish.', items: ['coffee', 'breakfast', 'burger', 'pie', 'shake'] },
  store: { name: 'Quik-Stop', icon: '🏪', who: 'Clerk', line: 'Lottery tickets are behind the counter. Kidding. We\'re sold out.', items: ['water', 'soda', 'energy', 'candy', 'sandwich'] },
  steak: { name: 'Prime Cut Steakhouse', icon: '🥩', who: 'Maître d\'', line: 'Your table is ready. It has been ready since you walked in looking like money.', items: ['steak', 'lobster', 'wine', 'water'] },
  vending: { name: 'Vending machine', icon: '🥤', line: 'It hums. It accepts crumpled dollars, eventually.', items: ['soda', 'candy', 'water'] },
  bar_spur: { name: 'Spur Bar', icon: '🍺', npc: 'dolores', usual: true, venue: 'spur', comp: true, job: true, line: 'What\'ll it be, sugar?', items: ['beer', 'whiskey', 'soda', 'nachos', 'water'] },
  bar_riverboat: { name: 'Paddlewheel Lounge', icon: '🍹', venue: 'riverboat', comp: true, line: 'Welcome aboard. Drinks are on the house for players.', items: ['cocktail', 'beer', 'coffee', 'shrimp', 'water'] },
  bar_palace: { name: 'Chandelier Bar', icon: '🥂', venue: 'palace', comp: true, line: 'Champagne, darling?', items: ['champagne', 'espresso', 'buffet', 'water'] },
  bar_salon: { name: 'Salon Privé Bar', icon: '🍸', venue: 'salon', comp: true, line: 'Mr. Kessler insists you want for nothing. Within reason.', items: ['martini', 'espresso', 'wagyu', 'caviar', 'water'] },
};
// where you can sleep. energy: fraction of max restored. cost is per night. grace: hours you can stay
// up before tiredness starts creeping in; base: tiredness you wake up with (a bad night's sleep).
const LODGING = {
  motel: { name: 'Starlite Motel', icon: '🛏️', cost: 25, energy: 1, grace: 8, hours: 8, nap: 10, text: 'A bed, a buzzing sign, and a lock that mostly works.' },
  grand: { name: 'Grand Hotel Suite', icon: '🏨', cost: 350, energy: 1.25, grace: 10, hours: 8, nap: 60, hunger: 25, thirst: 25, text: 'Feather pillows and room-service breakfast. Wake up with extra energy, and stay sharp two hours longer.' },
  apartment: { name: 'Your Apartment', icon: '🏢', cost: 0, energy: 1.1, grace: 9, hours: 8, nap: 0, item: 'apartment', text: 'Your own place. Rent is paid daily.' },
  penthouse: { name: 'Your Penthouse', icon: '🌆', cost: 0, energy: 1.35, grace: 11, hours: 8, nap: 0, hunger: 20, thirst: 20, item: 'penthouse', text: 'The whole city glittering below. Wake up unstoppable.' },
  bench: { name: 'Park Bench', icon: '🪑', cost: 0, energy: 0.6, grace: 6, base: 25, hours: 6, risky: true, text: 'Free. Cold. Somebody might lift your wallet while you sleep.' },
};

const EVENTS = {
  doubleComps: { name: 'Double Comp Night', desc: 'Cash-back on wagers there counts double tonight.', comps: true },
  highLimit: { name: 'High-Limit Night', desc: 'Table maximums are doubled.', limits: 2 },
  meterNight: { name: 'Jackpot Fever', desc: 'Every progressive meter in town jumped 40% this morning.', meters: true },
};
const ACHIEVEMENTS = [
  { id: 'first', name: 'First Hand', desc: 'Play your first round', test: () => App.state.stats.rounds >= 1, reward: 25 },
  { id: 'bj', name: 'Natural', desc: 'Get a blackjack', test: () => App.counter('blackjacks') >= 1, reward: 50 },
  { id: 'bj10', name: 'Twenty-One Club', desc: 'Get 10 blackjacks', test: () => App.counter('blackjacks') >= 10, reward: 250, swagger: 2 },
  { id: 'spot1', name: 'Human Calculator', desc: 'Nail a perfect count for Doc\'s team', test: () => App.counter('spotPerfect') >= 1, reward: 100, swagger: 1 },
  { id: 'spot10', name: 'Team Player', desc: 'Ten perfect counts for Doc\'s team', test: () => App.counter('spotPerfect') >= 10, reward: 2500, swagger: 3 },
  { id: 'postcards', name: 'Seventeen Postcards', desc: 'Follow every postcard signed 17 and hear the tape', test: () => !!(App.state.mystery && App.state.mystery.pc && App.state.mystery.pc.heard), reward: 1717, swagger: 5 },
  { id: 'livingWell', name: 'Living Well', desc: 'Go to sleep with your mood at 90 or more', test: () => App.counter('livingWell') >= 1, reward: 500, swagger: 2 },
  { id: 'rockBottom', name: 'Rock Bottom', desc: 'Let your mood hit 5 or less. It can only go up from here.', test: () => App.counter('rockBottom') >= 1, reward: 0, swagger: 1 },
  { id: 'merry', name: 'One for the Road', desc: 'Get tipsy', test: () => App.counter('gotTipsy') >= 1, reward: 50 },
  { id: 'hangover', name: 'Hair of the Dog', desc: 'Wake up with a hangover', test: () => App.counter('hangovers') >= 1, reward: 25 },
  { id: 'jitters', name: 'Bean There', desc: 'Have six caffeinated drinks in one day', test: () => App.counter('beanSix') >= 1, reward: 25 },
  { id: 'fullDegen', name: 'Full Degen', desc: 'Max out the degen meter', test: () => App.counter('fullDegen') >= 1, reward: 0, swagger: 3 },
  { id: 'cleanWeek', name: 'Clean Living', desc: 'Seven nights in a row with the degen meter under 15', test: () => App.counter('cleanWeek') >= 1, reward: 2000, swagger: 3 },
  { id: 'clockwork', name: 'Like Clockwork', desc: 'Make ten weekly payments on Sal\'s marker on time', test: () => App.counter('vigPaid') >= 10, reward: 0, swagger: 3 },
  { id: 'freeClear', name: 'Free and Clear', desc: 'Pay off every cent of Uncle Sal\'s $500,000 marker', test: () => App.counter('salCleared') >= 1, reward: 0, swagger: 15 },
  { id: 'firstFriend', name: 'Regular', desc: 'Become friends with someone in town', test: () => App.counter('friends') >= 1, reward: 0, swagger: 2 },
  { id: 'innerCircle', name: 'Inner Circle', desc: 'Have three close friends in town', test: () => App.counter('closeFriends') >= 3, reward: 0, swagger: 5 },
  { id: 'family', name: 'Family', desc: 'Someone in town considers you family', test: () => App.counter('family') >= 1, reward: 0, swagger: 5 },
  { id: 'jobber', name: 'Odd Jobs', desc: 'Finish ten side jobs', test: () => Object.values((App.state.quests || {})).filter(q => q.s === 'done').length >= 10, reward: 2500, swagger: 4 },
  { id: 'fragment1', name: 'Something Familiar', desc: 'Find a fragment that doesn\'t belong in this town', test: () => App.counter('fragments') >= 1, reward: 0, swagger: 1 },
  { id: 'fragmentAll', name: 'Remember', desc: 'Find all seventeen fragments', test: () => App.counter('fragments') >= 17, reward: 0, swagger: 5 },
  { id: 'l2wake', name: 'Awake', desc: 'Wake up from the dream', test: () => !!(App.state.l2 && App.state.l2.flags.woke), reward: 0, swagger: 5 },
  { id: 'l2truth', name: 'Eyes Open', desc: 'Level 2: find out what happened, and make it count (the good ending)', test: () => App.counter('l2_good') + App.counter('l2_truth') > 0, reward: 0, swagger: 25 },
  { id: 'l2horror', name: 'The House Always Wins', desc: 'Level 2: the horror ending', test: () => App.counter('l2_horror') + App.counter('l2_hollow') + App.counter('l2_dark') > 0, reward: 0, swagger: 10 },
  { id: 'l2mystery', name: 'The Seventeenth Card', desc: 'Level 2: the mystery ending', test: () => App.counter('l2_mystery') > 0, reward: 0, swagger: 10 },
  { id: 'l2all', name: 'Every Path', desc: 'Level 2: see all three endings', test: () => { const e = (App.state.l2 && App.state.l2.endings) || {}; return !!(e.good && e.horror && e.mystery); }, reward: 0, swagger: 25 },
  { id: 'l2sober', name: 'One Day at a Time', desc: 'Level 2: get through the night without giving in to the bottle', test: () => App.counter('l2_sober') > 0, reward: 0, swagger: 20 },
  { id: 'l2death', name: 'Closing Time', desc: 'Level 2: let the Barman catch you one time too many', test: () => App.counter('l2_dead') > 0, reward: 0, swagger: 0 },
  { id: 'l2outran', name: 'Not Tonight', desc: 'Level 2: outrun the Barman', test: () => App.counter('l2_outran') > 0, reward: 0, swagger: 5 },
  { id: 'l2lastcall', name: 'Last Call', desc: 'Level 2: stop fighting the bottle', test: () => App.counter('l2_gavein') > 0, reward: 0, swagger: 0 },
  { id: 'l2eddie', name: 'The Man on Calder Street', desc: 'Level 2: find out who the man they blamed really was, and prove it', test: () => !!(App.state.whispers && App.state.whispers.call), reward: 0, swagger: 25 },
  { id: 'l2photo', name: 'Seventeen Pieces', desc: 'Level 2: put Nora\'s last photograph back together, every piece of it, front and back', test: () => !!(App.state.l2 && App.state.l2.flags && App.state.l2.flags.photoWhole), reward: 0, swagger: 15 },
  { id: 'l2ring', name: 'Eyes Open, N.', desc: 'Level 2: buy your wedding ring back from Sully\'s', test: () => App.counter('l2_ring') > 0, reward: 0, swagger: 15 },
  { id: 'l2stone', name: 'He Called for Help', desc: 'Level 2: pay for a headstone for Eddie Marsh', test: () => App.counter('l2_stone') > 0, reward: 0, swagger: 15 },
  { id: 'l2comped', name: 'Comped', desc: 'Level 2: claim every one of tonight\'s Meridian Rewards promotions', test: () => !!(App.state.l2 && App.state.l2.money && Object.keys(App.state.l2.money.promos).length >= 5), reward: 0, swagger: 10 },
  { id: 'l2kit', name: 'Ready for the Dark', desc: 'Level 2: own a torch, running shoes and a raincoat', test: () => !!(App.state.l2 && App.state.l2.money && ['torch', 'shoes', 'coat'].every(k => App.state.l2.money.kit[k])), reward: 0, swagger: 5 },
  { id: 'l2shift', name: 'Honest Work', desc: 'Level 2: wash up at Rosie\'s when you\'re broke', test: () => App.counter('l2_shift') > 0, reward: 0, swagger: 5 },
  { id: 'salClub', name: 'The Seventeen Club', desc: 'Find what Sal hid behind the longhorns', test: () => App.counter('salClub') > 0, reward: 0, swagger: 10 },
  { id: 'faroCall', name: 'Calling the Turn', desc: 'Call the last three cards at faro, in order', test: () => App.counter('faroCalls') > 0, reward: 0, swagger: 5 },
  { id: 'l2keeps', name: 'A Shoebox', desc: 'Level 2: find all ten keepsakes in the city', test: () => App.counter('l2_keeps') >= 10, reward: 0, swagger: 10 },
  { id: 'l2jobs', name: 'Good Neighbour', desc: 'Level 2: do four side jobs for people in the city', test: () => App.counter('l2_jobs') >= 4, reward: 0, swagger: 8 },
  { id: 'l2tulips', name: 'The Night Watch', desc: 'Level 2: find out who leaves the white tulips', test: () => App.counter('l2_tulips') > 0, reward: 0, swagger: 12 },
  { id: 'l2hope', name: 'Hopeful', desc: 'Level 2: lift your spirit all the way to Hopeful', test: () => App.counter('l2_hopeful') > 0, reward: 0, swagger: 6 },
  { id: 'l2jackpot', name: 'Meridian Jackpot', desc: 'Level 2: win the Major or the Grand on the Jackpot Wheel', test: () => App.counter('l2_jp_major') + App.counter('l2_jp_grand') > 0, reward: 0, swagger: 10 },
  { id: 'l2poker', name: 'The Thursday Game', desc: 'Level 2: win the card game in the back of Sully\'s', test: () => App.counter('l2_poker_harbour_win') > 0, reward: 0, swagger: 10 },
  { id: 'l2chen', name: 'Private Table', desc: 'Level 2: win Mr. Chen\'s private game in the Salon', test: () => App.counter('l2_poker_chen_win') > 0, reward: 0, swagger: 15 },
  { id: 'l2fever', name: 'Fever Dream', desc: 'Fall asleep in the Meridian and dream your way back to town', test: () => !!(App.state.l2 && App.state.l2.slept), reward: 0, swagger: 5 },
  { id: 'goodListener', name: 'Good Listener', desc: 'Hear your first whisper: ask someone about the right thing in chat', test: () => App.counter('whispers') >= 1, reward: 0, swagger: 2 },
  { id: 'allEars', name: 'All Ears', desc: 'Hear every whisper in town', test: () => App.counter('whispers') >= WHISPERS.length, reward: 0, swagger: 6 },
  { id: 'degenDiaries', name: 'In the Book', desc: 'Complete all four pages of Lonnie\'s Degen Diaries', test: () => App.counter('degenDiaries') >= 1, reward: 0, swagger: 4 },
  { id: 'side25', name: 'Side Hustle', desc: 'Win a side bet paying 25 to 1 or better', test: () => App.counter('bigSide') >= 1, reward: 100, swagger: 1 },
  { id: 'prog', name: 'On the Meter', desc: 'Win any progressive payout', test: () => App.counter('progHits') >= 1, reward: 100 },
  { id: 'jackpot', name: 'JACKPOT', desc: 'Hit a percentage jackpot tier', test: () => App.counter('jackpots') >= 1, reward: 5000, swagger: 10 },
  { id: 'streak5', name: 'Heater', desc: 'Win 5 rounds in a row', test: () => App.state.stats.bestStreak >= 5, reward: 150, swagger: 1 },
  { id: 'streak10', name: 'On Fire', desc: 'Win 10 rounds in a row', test: () => App.state.stats.bestStreak >= 10, reward: 1000, swagger: 3 },
  { id: 'fire4', name: 'Fire Starter', desc: 'Make 4 unique points on a Fire Bet', test: () => App.counter('firePoints') >= 4, reward: 500, swagger: 2 },
  { id: 'royal', name: 'Royalty', desc: 'Make a royal flush in any poker game', test: () => App.counter('royals') >= 1, reward: 2500, swagger: 5 },
  { id: 'allgames', name: 'Renaissance Gambler', desc: 'Play every game at least once', test: () => Object.keys(GAMES).every(g => App.state.stats.perGame[g]), reward: 500, swagger: 3 },
  { id: 'wag10k', name: 'Action Player', desc: 'Wager $10,000 total', test: () => App.state.stats.wagered >= 10000, reward: 200 },
  { id: 'wag1m', name: 'Whale', desc: 'Wager $1,000,000 total', test: () => App.state.stats.wagered >= 1e6, reward: 10000, swagger: 8 },
  { id: 'big1k', name: 'Big Hit', desc: 'Win $1,000+ in one round', test: () => App.state.stats.biggestWin >= 1000, reward: 100, swagger: 1 },
  { id: 'big50k', name: 'Monster Hit', desc: 'Win $50,000+ in one round', test: () => App.state.stats.biggestWin >= 50000, reward: 2500, swagger: 5 },
  { id: 'debtfree', name: 'Clean Slate', desc: 'Owe nobody anything', test: () => App.state.day > 1 && App.debt === 0, reward: 100, swagger: 2 },
  { id: 'mill', name: 'Millionaire', desc: 'Hold $1,000,000 in your bankroll', test: () => App.state.bank >= 1e6, reward: 0, swagger: 10 },
  // slots
  { id: 'sFS', name: 'Free Spins!', desc: 'Trigger free spins on a slot machine', test: () => App.counter('slotFS') >= 1, reward: 50 },
  { id: 'sHS', name: 'Hold Tight', desc: 'Trigger Hold & Spin', test: () => App.counter('slotHS') >= 1, reward: 100 },
  { id: 'sMystery', name: 'Mystery Money', desc: 'Win a slot mystery jackpot', test: () => MYSTERY.some(t => App.counter('slotMystery_' + t.key) >= 1), reward: 250, swagger: 1 },
  { id: 'sDiamond', name: 'Diamond Strike', desc: 'Win a Diamond mystery jackpot', test: () => App.counter('slotMystery_diamond') >= 1, reward: 0, swagger: 6 },
  { id: 'sEpic', name: 'Epic Win', desc: 'Win 100× your bet or more on one spin', test: () => App.counter('slotEpic') >= 1, reward: 500, swagger: 2 },
  { id: 'sGrand', name: 'Fill the Screen', desc: 'Fill all 15 spots in Hold & Spin for the GRAND', test: () => App.counter('slotGrand') >= 1, reward: 0, swagger: 8 },
  { id: 'sBonus', name: 'Bonus Round', desc: 'Trigger a slot bonus game (posters, wheel or vault)', test: () => App.counter('slotBonus') >= 1, reward: 150 },
  { id: 'sVault', name: 'Safecracker', desc: 'Crack the GRAND in Kessler\'s Vault', test: () => App.counter('slotVaultGrand') >= 1, reward: 0, swagger: 5 },
  { id: 's1000', name: 'Iron Butt', desc: 'Spin a slot machine 1,000 times', test: () => App.counter('slotSpins') >= 1000, reward: 300, swagger: 1 },
  // darts
  { id: 'dWin', name: 'On the Oche', desc: 'Win a darts match', test: () => App.counter('dartWins') >= 1, reward: 100, swagger: 1 },
  { id: 'dClock', name: 'Round the Clock', desc: 'Go Around the Clock in 35 darts or fewer', test: () => App.counter('dartATCfast') >= 1, reward: 150 },
  { id: 'dTon', name: 'Ton-Plus Finish', desc: 'Check out 100 or more', test: () => App.counter('dartTonOut') >= 1, reward: 500, swagger: 2 },
  { id: 'dBull', name: 'Bullseye Finish', desc: 'Win a leg on the bull', test: () => App.counter('dartBullOut') >= 1, reward: 300, swagger: 1 },
  { id: 'd180', name: 'One Hundred and Eighty!', desc: 'Three darts in the treble 20', test: () => App.counter('dart180') >= 1, reward: 1800, swagger: 3 },
  { id: 'd170', name: 'The Big Fish', desc: 'Check out 170: T20, T20, bull', test: () => App.counter('dart170') >= 1, reward: 17000, swagger: 5 },
  { id: 'dMick', name: 'Student Becomes Master', desc: 'Beat Mick Doyle for real money', test: () => App.counter('dartBeatMick') >= 1, reward: 1000, swagger: 3 },
  { id: 'dGold', name: 'The Golden Arrow', desc: 'Win the Golden Arrow knockout', test: () => App.counter('dartGAwin') >= 1, reward: 0, swagger: 6 },
  // poker
  { id: 'backroom', name: 'Shuffle Up', desc: 'Reopen the Spur\'s back poker room', test: () => !!App.state.flags.pokerRoom, reward: 500, swagger: 2 },
  { id: 'pkCash', name: 'In the Money', desc: 'Cash in a poker tournament', test: () => !!(App.state.stats.poker && App.state.stats.poker.cashes), reward: 250 },
  { id: 'pkWin', name: 'Ship It', desc: 'Win a poker tournament', test: () => !!(App.state.stats.poker && App.state.stats.poker.wins), reward: 1000, swagger: 2 },
  { id: 'pkFinal', name: 'Final Table Regular', desc: 'Make three multi-table final tables', test: () => App.counter('finalTables') >= 3, reward: 5000, swagger: 3 },
  { id: 'pkDaily', name: 'Daily Grinder', desc: 'Win The Spur Daily', test: () => App.counter('pokerWin_daily') >= 1, reward: 5000, swagger: 3 },
  { id: 'pkMajor', name: 'Major Champion', desc: 'Win the Tenth-Day Major', test: () => App.counter('pokerWin_major') >= 1, reward: 25000, swagger: 6 },
  { id: 'pkHR', name: 'High Roller', desc: 'Win the High Roller', test: () => App.counter('pokerWin_hr') >= 1, reward: 100000, swagger: 10 },
  { id: 'pkSHR', name: 'Poker Legend', desc: 'Win the Super High Roller', test: () => App.counter('pokerWin_shr') >= 1, reward: 1000000, swagger: 20 },
  // the road to a billion (businesses count at their price)
  { id: 'm10', name: 'Eight Figures', desc: 'Be worth $10,000,000', test: () => Career.empire() >= 1e7, reward: 0, swagger: 10, legend: true },
  { id: 'm100', name: 'Nine Figures', desc: 'Be worth $100,000,000', test: () => Career.empire() >= 1e8, reward: 0, swagger: 20, legend: true },
  { id: 'b1', name: 'Billionaire', desc: 'Be worth $1,000,000,000', test: () => Career.empire() >= 1e9, reward: 0, swagger: 40, legend: true },
  { id: 'b10', name: 'Untouchable', desc: 'Be worth $10,000,000,000', test: () => Career.empire() >= 1e10, reward: 0, swagger: 60, legend: true },
  { id: 'income1m', name: 'Money Never Sleeps', desc: 'Earn $1,000,000 a day from businesses', test: () => Career.income() >= 1e6, reward: 0, swagger: 15, legend: true },
  { id: 'mogul', name: 'Mogul', desc: 'Own every business in town', test: () => Object.keys(ITEMS).filter(k => ITEMS[k].income && !ITEMS[k].award).every(k => App.has(k)), reward: 0, swagger: 30, legend: true },
  { id: 'resort', name: 'The Seventeen', desc: 'Build The Seventeen Resort & Casino', test: () => App.has('resort'), reward: 0, swagger: 50, legend: true },
  { id: 'whale', name: 'Million-Dollar Hand', desc: 'Win $1,000,000 in a single round', test: () => App.state.stats.biggestWin >= 1e6, reward: 0, swagger: 10, legend: true },
];

/* Story chapters. goal() decides when the chapter is complete. */
const CHAPTERS = [
  {
    title: "Sal's Marker", goalText: "Uncle Sal left a $500,000 marker. Make Vinnie's first weekly payment ($1,500 by day 7).",
    goal: () => App.state.flags.firstVig || !App.state.loans.find(l => l.id === 'sal'),
    intro: [
      { who: 'narrator', text: 'Uncle Sal left you three things: a silver dollar, a dented flask, and a debt.' },
      { who: 'vinnie', text: () => `So you're Sal's kid. ${App.state.name}, right? Sal owed me **half a million dollars**. The bar tab, the boat, the bad nights. Sal's not around, so now you owe me $500,000.` },
      { who: 'vinnie', text: 'I\'m a reasonable guy. No interest, as long as you pay me every week: **$1,500 by day 7** to start, more as you come up in the world. Miss a week and Nico visits, and the marker gets bigger. Three visits and you leave town.' },
      { who: 'me', text: 'I\'ve got $500 to my name.' },
      { who: 'vinnie', text: 'Then I suggest you get lucky. The Rusty Spur is down the street. Tell Dolores I sent you. Actually, don\'t.' },
      { who: 'dolores', text: 'Sal\'s kid? He used to say the side bets here were the best-kept secret in town. Maybe the paytables are softer than they look, sugar.' },
    ],
    outro: [
      { who: 'vinnie', text: () => { const l = App.state.loans.find(x => x.id === 'sal'); return l ? `First payment, on time. Huh. Sal was always late. Only ${fmt(l.balance)} to go, kid. Same time next week.` : 'Paid in full. Huh. Sal never managed that. Maybe you\'re smarter than him.'; } },
      { who: 'vinnie', text: 'Word of advice: the Riverboat\'s where the real action is. They don\'t let you on in a sweatshirt, though. Get a **Decent Suit**.' },
      { who: 'dolores', text: 'Before you go: Sal had a friend on that boat. Old guy, sharp eyes. Calls himself **Doc**. Find him.' },
    ],
  },
  {
    title: 'Riverboat Gambler', goalText: 'Board the Riverboat, find Doc, and build your bankroll to $25,000.',
    goal: () => App.state.flags.metDoc && App.state.bank >= 25000,
    intro: [
      { who: 'narrator', text: 'The Riverboat smells like brass polish and diesel. Somewhere a craps table is screaming.' },
      { who: 'doc', text: 'You\'ve got Sal\'s nose. And his silver dollar, I see. Sit. Let an old man buy you a drink.' },
      { who: 'doc', text: 'Sal was good. Too good. He figured out the meters on the progressives run hot, and he only bet them when the math said so. Then somebody took his bar.' },
      { who: 'doc', text: 'I can teach you what he knew. My **Poker Notebook** and **Counting Course** are for sale in the shop. Friends-and-family price, which is to say full price.' },
      { who: 'me', text: 'Who took his bar?' },
      { who: 'doc', text: 'Make some real money first. **$25,000**. Then we\'ll talk about Kessler.' },
    ],
    outro: [
      { who: 'doc', text: 'Twenty-five grand. Sal\'d be proud. Alright: Augustus Kessler. Owns the Monte Royale, owns half the town. He won the Rusty Spur off Sal in a private game at his Salon. Sal never lost a bar in his life before that night.' },
      { who: 'margot', text: 'Talking about Augustus? Darling, everyone is. I\'m Margot. I run the floor at **The Gilded Palace**. You look like someone who could use a bigger table.' },
      { who: 'margot', text: 'Come by. Wear something worth looking at: a **Tailored Tuxedo**, at minimum. And bring a little swagger.' },
    ],
  },
  {
    title: 'The Gilded Palace', goalText: 'Take the Palace for $250,000, and earn a Platinum Players Card.',
    goal: () => App.state.bank >= 250000 && App.has('platinum'),
    intro: [
      { who: 'margot', text: 'Welcome to the Palace. S17, late surrender, 10x odds, and our craps field pays triple on the twelve. I spoil my players.' },
      { who: 'margot', text: 'Kessler only lets **Platinum** members into his Salon. Bank a quarter million and buy a card, and I\'ll make the introduction.' },
      { who: 'margot', text: 'Why help you? Let\'s just say Augustus and I have history. And I\'d love to see someone take a bite out of him.' },
    ],
    outro: [
      { who: 'margot', text: 'Platinum and a quarter million. I made the call. The Salon expects you.' },
      { who: 'kessler', text: 'So you\'re Sal\'s kid. Sal used to sit exactly where you\'re standing, right before he lost everything.' },
      { who: 'kessler', text: 'I\'ll sell you the Rusty Spur. For **one million dollars**. Or win it from me: I host the **Salon Invitational** on every night that ends in seven. Only the best players are invited.' },
      { who: 'narrator', text: 'Kessler\'s smile doesn\'t reach his eyes. Whatever happened to Sal at that table, the answer is somewhere in this town. (🔎 Case file.)' },
    ],
  },
  {
    title: 'The Salon Privé', goalText: 'End Kessler\'s reign: solve The Seventeenth Card (🔎 Case file) and survive the Salon Invitational. Buying the deed for $1,000,000 gets you the bar, but not the truth.',
    goal: () => !!App.state.ending,
    intro: [
      { who: 'narrator', text: 'No windows. No clocks. Every bet in the room could buy a house.' },
      { who: 'kessler', text: 'Welcome to my Salon. The Invitational is played on nights ending in seven. Do try to be... worthy.' },
    ],
    outro: [],
  },
  { title: 'Legend', goalText: 'Build an empire: $10 million, $100 million, then a billion. Buy businesses, win the poker series, and put your name on The Seventeen. (Status shows your Legend goals.)', goal: () => false, intro: [], outro: [] },
];

/* ---------- Career logic ---------- */
const Career = {
  swagger() {
    if (!App.state) return 0;
    let s = 0;
    for (const k in App.state.items) if (App.state.items[k] && ITEMS[k] && ITEMS[k].swagger) s += ITEMS[k].swagger;
    for (const a of ACHIEVEMENTS) if (App.state.achievements[a.id] && a.swagger) s += a.swagger;
    return s + (App.state.flags.bonusSwagger || 0) + Rel.swagger();
  },
  staminaMax() {
    let s = 100; for (const k in App.state.items) if (App.state.items[k] && ITEMS[k] && ITEMS[k].stamina) s += ITEMS[k].stamina;
    return s;
  },
  compRate() {
    let c = 0.001; for (const k in App.state.items) if (App.state.items[k] && ITEMS[k] && ITEMS[k].comp) c = Math.max(c, ITEMS[k].comp);
    return c;
  },
  income() { let u = Rel.income(); for (const k in App.state.items) if (App.state.items[k] && ITEMS[k] && ITEMS[k].income) u += ITEMS[k].income; return u; },
  // what you're worth with your businesses counted at their price
  empire() { let v = App.netWorth(); for (const k in App.state.items) if (App.state.items[k] && ITEMS[k] && ITEMS[k].cat === 'Investments' || (App.state.items[k] && ['spurDeed', 'palaceDeed'].includes(k))) v += ITEMS[k].price; return v; },
  upkeep() { let u = 0; for (const k in App.state.items) if (App.state.items[k] && ITEMS[k] && ITEMS[k].upkeep) u += ITEMS[k].upkeep; return u; },
  creditLimit() { return 1000 + Career.swagger() * 400 + App.state.chapter * 5000; },
  // what Vinnie wants each week on Sal's marker, by how far you've come
  weeklyFor(ch = App.state.chapter) { return [1500, 3000, 10000, 30000, 60000][Math.min(ch, 4)]; },
  vinnieRate() { return App.state.chapter >= 4 ? 0.01 : 0.04; },

  venueOpen(id) {
    const st = App.state; if (st.mode === 'free' || st.unlocked[id]) return true;
    return false;
  },
  venueReqs(id) { // list of [label, ok]
    const u = VENUES[id].unlock; if (!u) return [];
    const st = App.state, out = [];
    if (u.chapter) out.push([`Story: chapter ${u.chapter + 1}`, st.chapter >= u.chapter]);
    if (u.item) out.push([`Own ${ITEMS[u.item].name}`, App.has(u.item)]);
    if (u.bank) out.push([`Carry ${fmt(u.bank)}`, st.bank >= u.bank]);
    if (u.swagger) out.push([`${u.swagger} swagger`, Career.swagger() >= u.swagger]);
    return out;
  },
  tryUnlock(id) {
    const reqs = this.venueReqs(id);
    if (reqs.every(r => r[1])) { App.state.unlocked[id] = true; App.save(); return true; }
    return false;
  },

  checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (App.state.achievements[a.id]) continue;
      let ok = false; try { ok = a.test(); } catch (e) { }
      if (ok) {
        App.state.achievements[a.id] = App.state.day;
        if (a.reward) App.credit(a.reward);
        UI.toast(`🏅 Achievement: ${a.name}${a.reward ? ' · +' + fmt(a.reward) : ''}${a.swagger ? ' · ★ +' + a.swagger : ''}`, 'award', a.desc);
        SFX.cash();
      }
    }
  },

  afterRound() {
    this.checkAchievements();
    if (App.state.mode !== 'career' || App.inReality()) return;
    this.checkChapter();
  },

  async checkChapter() {
    const st = App.state, ch = CHAPTERS[st.chapter];
    if (!ch || this._busy || !ch.goal()) return;
    this._busy = true;
    try {
      if (ch.outro.length) await UI.dialog(ch.outro);
      st.chapter++;
      const next = CHAPTERS[st.chapter];
      if (next) {
        App.news(`📖 Chapter ${st.chapter + 1}: ${next.title}`);
        UI.toast(`📖 New chapter: ${next.title}`, 'big');
      }
      App.save(); Router.refresh();
    } finally { this._busy = false; }
  },

  // chapter intros play the first time you walk into the venue they happen in
  async enterVenue(id) {
    const st = App.state; if (st.mode !== 'career') return;
    const idx = { riverboat: 1, palace: 2, salon: 3 }[id];
    if (!idx || st.chapter < idx || st.flags['intro_' + id]) return;
    st.flags['intro_' + id] = true;
    if (id === 'riverboat') st.flags.metDoc = true;
    App.save();
    await UI.dialog(CHAPTERS[idx].intro);
  },

  /* ---------- loans ---------- */
  borrow(amount) {
    const st = App.state;
    let l = st.loans.find(l => l.id === 'vinnie');
    if (!l) { l = { id: 'vinnie', label: 'Vinnie\'s walking-around money', balance: 0, rate: this.vinnieRate(), due: null, strikes: 0 }; st.loans.push(l); }
    l.balance = round2(l.balance + amount); l.rate = this.vinnieRate();
    App.credit(amount); App.count('borrowed', amount); st.flags.borrowedToday = st.day; App.save();
  },
  repay(loanId, amount) {
    const l = App.state.loans.find(l => l.id === loanId); if (!l) return;
    amount = Math.min(amount, l.balance, App.state.bank);
    if (amount <= 0) return;
    App.debit(amount); l.balance = round2(l.balance - amount);
    if (l.weekly) {
      const before = l.paidWeek || 0; l.paidWeek = round2(before + amount);
      if (before < l.weekly && l.paidWeek >= l.weekly && l.balance > 0.005) {
        if (!App.state.flags.firstVig) App.state.flags.firstVig = App.state.day;
        UI.toast(`🦈 This week's payment is covered. Next one is due day ${l.due + 7}.`, 'good');
      }
    }
    if (l.balance <= 0.005) {
      if (l.id === 'sal' && l.weekly) { App.count('salCleared'); UI.toast('🦈 Sal\'s marker: paid in full. Vinnie tears it up in front of you.', 'big'); }
      App.state.loans = App.state.loans.filter(x => x !== l);
      if (l.id === 'sal' && l.due && App.state.day <= l.due - 5) App.state.flags.paidEarly = App.state.day;
    }
    App.save(); this.afterRound();
  },

  /* ---------- the day cycle ---------- */
  /* ---------- needs: hunger, thirst and energy (energy is state.stamina) ---------- */
  needsOn() { return App.state && App.state.mode === 'career' && !App.inReality(); },
  // tiredness 0-100 builds once you've been up longer than your bed allows; only sleep resets it
  tiredness() {
    const st = App.state; if (!this.needsOn()) return 0;
    const r = st.rest || { grace: 8, base: 0 }, awakeH = ((st.clock || 540) - (st.wokeAt || 540)) / 60;
    return clamp((r.base || 0) + Math.max(0, awakeH - r.grace) * 10, 0, 100);
  },
  // the most energy you can have right now: tiredness locks away the rest of the bar
  energyMax() { return Math.round(Math.max(App.state.restMax || 0, App.state.staminaMax)); },
  energyCap() { return Math.round(this.energyMax() * (1 - this.tiredness() / 100)); },
  tiredWarn() {
    const st = App.state, t = this.tiredness(), w = st.today.tiredWarn || 0;
    if (t >= 30 && w < 1) { st.today.tiredWarn = 1; UI.toast('🥱 You\'re starting to get tired. Coffee only fills the part of your energy bar that isn\'t locked.', 'warn'); }
    else if (t >= 70 && w < 2) { st.today.tiredWarn = 2; UI.toast('😴 You\'re running on fumes. Find a bed soon.', 'warn'); }
  },
  canPlay() {
    if (!this.needsOn()) return null;
    const st = App.state;
    if ((st.clock || 540) >= 1680) return 'It\'s 4 AM and the night is over. Get some sleep (motel, hotel, home or a park bench).';
    if (st.stamina <= 0) return this.tiredness() >= 50 ? 'You\'re exhausted, and no amount of coffee will fix it now. Get some sleep.' : 'You\'re exhausted. Get some sleep, or something with caffeine.';
    if (st.hunger <= 0) return 'You\'re starving. Go get something to eat.';
    if (st.thirst <= 0) return 'You\'re parched. Get a drink first.';
    return null;
  },
  // drain the bars. kind = 'round' (k = rounds) or 'step'
  drain(kind, k = 1) {
    if (App.inReality()) { if (typeof L2Bottle !== 'undefined') L2Bottle.roundNeeds(kind, k); return; } // the waking world keeps its own time
    const was = App.state ? (App.state.clock || 540) : 0;
    const mins = (kind === 'round' ? 4 : 0.25) * k;
    if (App.state) App.state.clock = (App.state.clock || 540) + mins;
    if (App.state) Mood.tick(mins);
    if (!this.needsOn()) return;
    if (was < 1560 && App.state.clock >= 1560) UI.toast('🌙 It\'s 2 AM. The night ends at 4: find a bed before then.', 'warn');
    const st = App.state, starving = st.hunger <= 0 || st.thirst <= 0;
    const r = kind === 'round' ? { h: 0.45, t: 0.6, e: 0.8 } : { h: 0.04, t: 0.05, e: 0.02 };
    const before = { hunger: st.hunger, thirst: st.thirst, stamina: st.stamina };
    st.hunger = Math.max(0, st.hunger - r.h * k);
    st.thirst = Math.max(0, st.thirst - r.t * k);
    st.stamina = Math.max(0, Math.min(this.energyCap(), st.stamina - r.e * k * (starving ? 3 : 1) * Mood.drainMult()));
    this.tiredWarn();
    const warn = { hunger: '🍔 You\'re getting hungry.', thirst: '💧 You\'re getting thirsty.', stamina: '⚡ You\'re getting tired.' };
    for (const key in warn) {
      const lim = key === 'stamina' ? st.staminaMax * 0.2 : 20;
      if (before[key] > lim && st[key] <= lim) UI.toast(warn[key], 'warn');
      if (before[key] > 0 && st[key] <= 0) UI.toast({ hunger: '🍔 Starving! You can\'t play until you eat.', thirst: '💧 Parched! You can\'t play until you drink.', stamina: '😴 Exhausted! Sleep or grab an energy drink.' }[key], 'warn');
    }
    Router.hud();
  },
  consume(id, placeId) {
    const m = MENU[id], st = App.state, place = PLACES[placeId];
    // a slice of pie for Doc's side job gets boxed up instead of eaten
    if (id === 'pie' && (Quests.status('docPie') === 'active' || Quests.status('salKey') === 'active') && !st.flags.hasPie) {
      if (!App.debit(m.price)) { UI.toast('Not enough cash', 'warn'); return false; }
      st.flags.hasPie = true; SFX.cash(); UI.toast(Quests.status('docPie') === 'active' ? '🥧 Boxed up a slice for Doc' : '🥧 Boxed up a slice of cherry for Darlene', 'good'); App.save(); return true;
    }
    const free = this.isComped(place, m) || (id === 'pie' && st.flags.freePie);
    if (!free && !App.debit(m.price)) { UI.toast('Not enough cash', 'warn'); return false; }
    if (m.hunger) st.hunger = clamp(st.hunger + m.hunger, 0, 100);
    if (m.thirst) st.thirst = clamp(st.thirst + m.thirst, 0, 100);
    if (m.energy) {
      let e = m.energy;
      if (e > 0) {
        // caffeine stacks badly: the first two of the day work, then each one does less
        if (m.caf) { const n = st.today.caf = (st.today.caf || 0) + 1; e = Math.round(e * ([1, 1, .5, .25, .1][n - 1] || 0)); if (n === 3) UI.toast('☕ The caffeine is wearing thin: each one does less from here.', 'warn'); if (n >= 6) UI.toast('😵 Jittery. Your heart is racing and you\'re no less tired.', 'warn'); }
        const cap = this.energyCap(), room = Math.max(0, cap - st.stamina);
        if (room <= 0) UI.toast(this.tiredness() >= 5 ? '🥱 You\'re too tired for that to help. Only sleep unlocks the rest of your energy.' : '⚡ You\'re already full of energy.', 'warn');
        e = Math.min(e, room);
        st.stamina = clamp(st.stamina + e, 0, cap);
      } else st.stamina = clamp(st.stamina + e, 0, this.energyCap());
    }
    SFX.cash(); UI.toast(`${m.icon} ${m.name}${free ? ' (comped)' : ''}`, 'good');
    Mood.consume(id, m);
    App.save(); Router.hud(); return true;
  },
  happyHour(venue) { const t = (App.state.clock || 540) % 1440; return venue === 'spur' && t >= 1020 && t < 1140; },
  isComped(place, m) {
    if (!place || !place.comp || !m.drink || !place.venue) return false;
    if (this.happyHour(place.venue) || Rel.comps(place, m)) return true;
    return App.state.today.wagered >= VENUES[place.venue].limits.min * 20;
  },

  /* ---------- the day cycle ---------- */
  async sleep(lodgingId) {
    const L = LODGING[lodgingId], st = App.state;
    if (L.cost && !App.debit(L.cost)) { UI.toast(`A night here costs ${fmt(L.cost)}`, 'warn'); return; }
    let robbed = 0;
    if (L.risky && st.bank > 20 && RNG.chance(0.3)) { robbed = round2(Math.min(st.bank * 0.15, 5000)); st.bank = round2(st.bank - robbed); }
    // once the dream's story is over, every bed is a door: stay asleep, or wake up in the Meridian
    // (the night here finishes when the fever brings you back)
    if (st.ending && typeof L2 !== 'undefined' && await L2.dreamChoice()) { st.pendingNight = { id: lodgingId, robbed }; App.save(); L2.wakeUp(); return; }
    await this.endDay({ ...L, id: lodgingId }, robbed);
  },
  // two hours' sleep without ending the day: takes about three hours of tiredness off, once a day
  async nap(lodgingId) {
    const L = LODGING[lodgingId], st = App.state;
    if (st.today.nap) { UI.toast('You already napped today. Your body wants a real night\'s sleep.', 'warn'); return; }
    if ((st.clock || 540) > 1680 - 120) { UI.toast('Too late for a nap: just go to bed.', 'warn'); return; }
    if (L.nap && !App.debit(L.nap)) { UI.toast(`A nap here costs ${fmt(L.nap)}`, 'warn'); return; }
    st.today.nap = true; st.clock = (st.clock || 540) + 120; st.wokeAt = (st.wokeAt || 540) + 300; // net: about 30% less tired
    st.hunger = Math.max(0, st.hunger - 5); st.thirst = Math.max(0, st.thirst - 8);
    st.stamina = Math.min(this.energyCap(), st.stamina + 30);
    App.save(); Router.hud();
    await UI.dialog([{ who: 'narrator', text: `You close your eyes for two hours. It's ${World.clockText()} when you wake, groggy but sharper.` }]);
  },
  // a proper bed only makes sense once the day is winding down, or when you're truly tired
  bedtimeOk() { const t = (App.state.clock || 540) % 1440; return !this.needsOn() || t >= 1080 || t < 360 || this.tiredness() >= 40; },
  // drunk: you wake up somewhere outside, with no memory of getting there
  async passOut(drunk) {
    const st = App.state;
    const robbed = st.bank > 20 ? round2(Math.min(st.bank * 0.2, 10000)) : 0;
    st.bank = round2(st.bank - robbed);
    const spot = drunk && typeof World !== 'undefined' && World.wakeSomewhere ? World.wakeSomewhere() : null;
    if (!spot) await UI.dialog([{ who: 'narrator', text: `You collapse on the sidewalk and sleep where you fall.${robbed ? ` When you wake up, **${fmt(robbed)}** is missing from your wallet.` : ''} Next time, find a bed before you hit empty.` }]);
    await this.endDay({ name: spot ? 'Somewhere outside' : 'The sidewalk', energy: 0.5, grace: 5, base: 35, hours: 7 }, 0);
    if (spot) {
      if (Router.screen === 'world') World.unmount();
      st.world = { map: 'town', x: spot.x, y: spot.y, dir: 'down' }; App.count('wokeOutside'); App.save();
      Router.go('world');
      await UI.dialog([{ who: 'narrator', text: `You wake up ${spot.text}. Your head is pounding and you have no idea how you got here.${robbed ? ` Your wallet is lighter by **${fmt(robbed)}**.` : ''}` }]);
    }
  },
  async endDay(L = LODGING.motel, robbed = 0) {
    const st = App.state, lines = [];
    lines.push(['Today\'s result', fmt(st.today.net, { sign: true })]);
    const byV = st.today.byVenue || {}, ev = st.event && EVENTS[st.event.id];
    let comp = round2(Object.keys(byV).reduce((a, v) => a + byV[v] * (ev && ev.comps && st.event.venue === v ? 2 : 1), 0) * this.compRate());
    if (!Object.keys(byV).length) comp = round2(st.today.wagered * this.compRate());
    const cap = 50 * Math.max(...Object.keys(VENUES).filter(v => this.venueOpen(v)).map(v => VENUES[v].limits.min));
    if (comp > cap) { lines.push(['(Cash-back is capped at ' + fmt(cap) + ' a night)', '']); comp = cap; }
    if (comp > 0) { App.credit(comp); lines.push(['Players club cash-back', fmt(comp, { sign: true })]); }
    if (L.cost) lines.push([L.name, fmt(-L.cost)]);
    const inc = this.income();
    if (inc) { App.credit(inc); lines.push(['Business income', fmt(inc, { sign: true })]); }
    const rent = this.upkeep();
    if (rent) { st.bank = round2(st.bank - Math.min(rent, st.bank)); lines.push(['Rent & staff', fmt(-rent)]); }
    if (robbed) lines.push(['Wallet lifted in your sleep', fmt(-robbed)]);
    let interest = 0;
    for (const l of st.loans) { const i = round2(l.balance * l.rate); l.balance = round2(l.balance + i); interest += i; }
    if (interest) lines.push(['Loan interest', fmt(-interest)]);
    for (const l of Mood.night(L)) lines.push(l);
    const bed = st.clock || 540, wake = Math.round(clamp(bed + (L.hours || 8) * 60 - 1440, 360, 840) / 15) * 15;
    st.day++; st.clock = wake; st.wokeAt = wake; st.rest = { grace: L.grace != null ? L.grace : 8, base: L.base || 0 };
    st.staminaMax = this.staminaMax(); st.restMax = Math.round(st.staminaMax * Math.max(1, L.energy || 1));
    st.stamina = Math.round(Math.min(st.staminaMax * (L.energy || 1), this.energyCap()));
    st.hunger = clamp(st.hunger - 20 + (L.hunger || 0), 0, 100);
    st.thirst = clamp(st.thirst - 25 + (L.thirst || 0), 0, 100);
    st.today = { wagered: 0, net: 0, rounds: 0 };
    Progressives.dailyGrowth();
    Slots.dailyGrowth();
    Rivals.newDay();
    this.rollEvent();
    this.randomNews();
    App.save(); Router.hud();
    await UI.modal({
      title: `🌙 Night ${st.day - 1} · ${L.name}`, buttons: [{ label: `Wake up: Day ${st.day}`, cls: 'primary' }],
      body: h('div', h('table.paytable', lines.map(r => h('tr', h('td', r[0]), h('td.num', r[1])))),
        h('p.muted.small', `You wake at ${World.clockText()}${wake >= 660 ? ' (a late night costs you the morning)' : wake <= 420 ? ', up with the sun' : ''}. Energy ${Math.round(st.stamina)}/${this.energyMax()}. ${(L.grace || 8) >= 10 ? 'Well rested: you\'ll stay sharp a couple of hours longer today. ' : L.base ? 'A rough night: you start the day already a bit tired. ' : ''}You wake up a little hungry and thirsty. Progressive meters grew overnight.`),
        h('button.btn.sm', { onclick: () => Chat.newspaper() }, '📰 Read the morning paper')),
    });
    await this.collections();
    await Postcards.morning();
    Router.refresh();
  },

  // one special night somewhere in town, announced each morning
  rollEvent() {
    const st = App.state, ids = Object.keys(EVENTS);
    const open = Object.keys(VENUES).filter(v => this.venueOpen(v));
    const id = RNG.pick(ids), venue = RNG.pick(open);
    st.event = { id, venue, day: st.day };
    if (EVENTS[id].meters) for (const k of Progressives.KEYS) st.progressives[k] *= 1.4;
    App.news(`🎉 Tonight: ${EVENTS[id].name} at ${VENUES[venue].name}. ${EVENTS[id].desc}`);
  },
  eventAt(venue) { const e = App.state.event; return e && e.day === App.state.day && e.venue === venue ? EVENTS[e.id] : null; },
  randomNews() {
    const st = App.state;
    const hot = Progressives.KEYS.filter(k => Progressives.rtp(k) >= 1);
    const opts = [
      () => `📰 "Local man insists rabbit's foot is 'basically a strategy'". Experts disagree.`,
      () => `📰 Riverboat reports record craps roll: shooter held the dice for 47 minutes.`,
      () => `📰 Kessler Holdings posts another record quarter. "The house always wins," says Kessler.`,
      () => `📰 Vinnie Moretti seen buying a third boat. Nobody knows where the money comes from.`,
      () => `📰 The Gilded Palace unveils a new chandelier. It is, somehow, even bigger.`,
    ];
    if (hot.length) App.news(`📈 Word on the street: the ${PAY[hot[0]].prog.name} meter is running hot.`);
    else App.news(RNG.pick(opts)());
  },

  // Vinnie checks on overdue markers and anyone over their credit limit
  // what still has to be paid on a loan before its due day
  owedNow(l) { return l.weekly ? Math.max(0, round2(Math.min(l.weekly, l.balance) - (l.paidWeek || 0))) : l.balance; },
  async collections() {
    const st = App.state;
    // a covered week rolls on to the next one
    for (const l of st.loans) {
      if (!l.weekly || !l.due || st.day <= l.due || (l.paidWeek || 0) < Math.min(l.weekly, l.balance)) continue;
      while (l.due < st.day) l.due += 7;
      l.paidWeek = 0; l.weekly = Math.min(this.weeklyFor(), Math.ceil(l.balance));
      App.count('vigPaid');
      UI.toast(`🦈 Paid up. Next payment on Sal's marker: ${fmt(l.weekly)} by day ${l.due}.`, 'good');
    }
    const overdue = st.loans.find(l => l.due && st.day > l.due);
    const vin = st.loans.find(l => l.id === 'vinnie');
    const over = vin && vin.balance > this.creditLimit() * 1.5;
    if (!overdue && !over) {
      const soon = st.loans.find(l => l.due && l.due - st.day <= 3 && l.due >= st.day && this.owedNow(l) > 0);
      if (soon) UI.toast(`⏰ ${soon.weekly ? 'This week\'s payment on ' + soon.label : soon.label} is due on day ${soon.due}: ${fmt(this.owedNow(soon))}`, 'warn');
      return;
    }
    const target = overdue || vin;
    target.strikes = (target.strikes || 0) + 1; st.flags.everStruck = st.day;
    if (target.strikes >= 3) {
      await UI.dialog([
        { who: 'nico', text: 'Vinnie says this is the third time. Vinnie says there won\'t be a fourth.' },
        { who: 'narrator', text: '💀 **Game over.** You wake up on a bus out of town with a black eye and Sal\'s silver dollar. Load a save or start a new career.' },
      ]);
      st.flags.gameOver = true; App.save(); Router.go('title'); return;
    }
    const take = round2(st.bank * 0.3);
    const ownedLoseable = Object.keys(st.items).filter(k => st.items[k] && ITEMS[k] && ['Wardrobe', 'Charms'].includes(ITEMS[k].cat) && !['suit', 'tux'].includes(k));
    const lost = ownedLoseable.length ? RNG.pick(ownedLoseable) : null;
    st.bank = round2(st.bank - take);
    if (take > 0) target.balance = round2(Math.max(0, target.balance - take));
    if (lost) delete st.items[lost];
    // the big marker grows by three missed payments; anything else takes a 15% late fee
    const fee = target.weekly ? `Three weeks' payments (${fmt(target.weekly * 3)}) go on the marker` : 'A 15% late fee goes on the balance';
    target.balance = round2(target.weekly ? target.balance + target.weekly * 3 : target.balance * 1.15);
    if (target.weekly) { target.paidWeek = 0; target.weekly = Math.min(this.weeklyFor(), Math.ceil(target.balance)); }
    if (target.due) target.due = st.day + 7;
    if (target.balance <= 0.005) st.loans = st.loans.filter(l => l !== target);
    await UI.dialog([
      { who: 'nico', text: `Vinnie\'s been patient. Vinnie is done being patient. (Strike ${target.strikes} of 3.)` },
      { who: 'narrator', text: `Nico "collects" **${fmt(take)}** from your wallet${lost ? ' and takes your **' + ITEMS[lost].name + '**' : ''}. ${fee}${target.due ? ', and the new due date is day ' + target.due : ''}.` },
    ]);
    App.save();
  },

  // if you're broke, Dolores always has a shift
  async oddJob() {
    const st = App.state;
    if (st.today.shift) { UI.toast('Dolores only has one shift a day, sugar. Come back tomorrow.', 'warn'); return; }
    if (st.stamina < 40) { UI.toast('You\'re too tired to work a shift', 'warn'); return; }
    if ((st.clock || 540) > 1680 - 480) { UI.toast('Too late to start an eight-hour shift tonight', 'warn'); return; }
    const pay = Math.round((120 + st.chapter * 80) * (Rel.close('dolores') ? 1.5 : 1));
    st.stamina -= 40; st.hunger = Math.max(0, st.hunger - 15); st.thirst = Math.max(0, st.thirst - 15);
    App.credit(pay); App.count('shifts'); st.today.shift = true; st.clock = (st.clock || 540) + 480;
    await UI.dialog([{ who: 'dolores', text: `Grab an apron, sugar. Eight hours of washing glasses: **${fmt(pay)}** cash, and your feet will hate you.` }]);
    Quests.event('shift'); App.save(); Router.hud();
  },

  buy(id) {
    const it = ITEMS[id], st = App.state;
    if (!it || st.items[id]) return;
    if (!App.debit(it.price)) { UI.toast('Not enough bankroll', 'warn'); return; }
    st.items[id] = st.day;
    if (it.felt) st.equipped.felt = it.felt;
    if (it.back) st.equipped.back = it.back;
    st.staminaMax = this.staminaMax();
    SFX.cash(); UI.toast(`${it.icon} Bought ${it.name}`, 'good');
    App.save(); this.afterRound();
  },
  itemAvailable(id) {
    const it = ITEMS[id], st = App.state;
    if (it.award) return st.items[id] ? null : it.award === 'tape' ? 'Somewhere in town, a tape is waiting for you' : it.award === 'sal' ? 'Sal keeps it somewhere safe. Ask him, once the story is over' : 'Earned in the Justice ending, not for sale';
    if (it.requires && !st.items[it.requires]) return `Requires ${ITEMS[it.requires].name}`;
    if (it.requiresFlag && !st.flags[it.requiresFlag] && st.mode === 'career') return 'Meet Doc on the Riverboat first';
    if (it.requiresChapter && st.chapter < it.requiresChapter && st.mode === 'career') return 'Not for sale yet (story)';
    if (it.requiresEnding && !st.ending && st.mode === 'career') return 'For sale once the story is over';
    if (it.requiresQuest && Quests.status(it.requiresQuest) !== 'active' && !st.items[id] && st.mode === 'career') return it.questHint || 'Ask Dolores at the Spur about the old back room';
    return null;
  },
};
