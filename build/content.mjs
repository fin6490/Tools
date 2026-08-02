// content.mjs — the source of truth for every route's metadata and prose.
// The generator (generate.mjs) turns this into static HTML pages. Editing copy
// or meta here and re-running `node build/generate.mjs` regenerates the site.
// NB: no gambling/casino/betting language anywhere (school web filters classify
// by domain — a gambling category would block the whole site across schools).

export const SITE = {
  origin: "https://spindecks.app",
  name: "SpinDecks",
  contactEmail: "hello@spindecks.app",
  // Bump alongside the JS import token when shipping JS/CSS changes.
  token: "20260801l",
};

// The seven existing tools, in nav order. `view` matches app.js data-view names.
export const TOOLS = [
  {
    slug: "wheel-of-names",
    view: "wheel",
    nav: "Wheel",
    title: "Wheel of Names — Free Random Name Picker | SpinDecks",
    description:
      "Spin a free wheel of names with no ads and no sign-up. Multiple wheels, images, weighted entries, elimination mode and fair no-repeat picking. Works offline.",
    h1: "Wheel of Names — free random name picker",
    intro:
      "A fast, ad-free wheel of names for picking a winner, a volunteer or whose turn it is. Paste your list, hit spin, and let the wheel decide — everything runs in your browser, with nothing to install and no account to create.",
    steps: [
      "Paste or type one name per line into the editor on the left.",
      "Press <kbd>Space</kbd> or the SPIN button — the wheel spins and lands on a winner.",
      "Turn on “Remove winner after each spin” for fair, no-repeat picking, or “Elimination mode” to knock names out until one is left.",
      "Save as many named wheels as you like; they’re stored in your browser and reload instantly.",
    ],
    whoFor: [
      ["Teachers", "cold-call a student, pick a group, or choose who reads next — without repeating the same names."],
      ["Streamers", "run giveaways and viewer picks live on stream, in fullscreen with a green-screen background for OBS."],
      ["Anyone", "settle “who goes first”, pick a restaurant, or draw a raffle winner in seconds."],
    ],
    faq: [
      ["Is the wheel of names free?", "Yes — completely free and ad-free, with no sign-up. There’s an optional Pro tier planned for extras like cloud sync, but the wheel itself will always be free."],
      ["Can I weight some names more than others?", "Yes. Add <code>*3</code> after a name (e.g. <code>Alice*3</code>) to make it three times as likely. You can also set a custom colour with a hex code, like <code>Bob #ff5a5f</code>."],
      ["Can I stop the same name being picked twice?", "Yes. Turn on “Remove winner after each spin” and each pick is taken off the wheel, so nobody repeats until you reset."],
      ["Does my list get uploaded anywhere?", "No. Your wheels are stored only in your own browser (localStorage). There are no servers, accounts or tracking, and it works offline after the first visit."],
      ["Can I add pictures to the wheel?", "Yes — the Images button lets you attach a picture to any name, which is drawn on that slice. Images are shrunk and stored locally."],
    ],
  },
  {
    slug: "random-team-generator",
    view: "groups",
    nav: "Teams",
    title: "Random Team Generator — Free Group Maker | SpinDecks",
    description:
      "Split a list into random teams or groups instantly. Set team size or team count, reuse your saved lists, and re-roll for a fresh shuffle. Free, ad-free, no login.",
    h1: "Random team generator",
    intro:
      "Turn any list of names into random, balanced teams in one tap. Choose how many teams you want or how big each team should be, and SpinDecks deals everyone out evenly — team sizes never differ by more than one.",
    steps: [
      "Paste your names, one per line, or load them straight from your current wheel.",
      "Pick a mode: “By number of teams” or “By team size”.",
      "Press “Make teams” — re-roll as many times as you like for a different shuffle.",
      "Rename teams, copy the result as text, or send each team to its own wheel.",
    ],
    whoFor: [
      ["Teachers", "split a class into project groups or house teams fairly, without the arguments."],
      ["Coaches & clubs", "divide players into balanced sides for training or a quick tournament."],
      ["Games nights", "sort everyone into teams for a quiz, charades or a party game."],
    ],
    faq: [
      ["How does it keep teams balanced?", "Names are shuffled and dealt round-robin into the teams, so the sizes differ by at most one person. Re-roll for a completely fresh split."],
      ["Can I choose team size instead of team count?", "Yes. Switch to “By team size” and set how many people you want per team — SpinDecks works out how many teams that makes."],
      ["Can I reuse a list I already typed?", "Yes — “Load current wheel” pulls in the names from your active wheel, so you don’t have to type them twice."],
      ["Is it random and fair?", "Yes. The shuffle uses your browser’s cryptographic random source, so every arrangement is equally likely."],
      ["Do the teams save?", "Your name list is saved in your browser. Each re-roll makes a new random split you can copy or turn into wheels."],
    ],
  },
  {
    slug: "darts-scoreboard",
    view: "scores",
    nav: "Darts",
    title: "Darts Scoreboard — Free Online 501 & Cricket Scorer | SpinDecks",
    description:
      "Free online darts scoreboard for 501 and cricket. Track multiple players, bust handling and running totals on any device. No ads, no sign-up, works offline.",
    h1: "Online darts scoreboard",
    intro:
      "A free darts scoreboard for 501, 301, 701 and cricket, built for phones at the oche. Add your players, tap in each turn, and SpinDecks counts you down, handles busts and double-out, tracks your three-dart average and crowns the leg winner.",
    steps: [
      "Add your players and choose a mode — Darts (X01) for 501/301/701, or Cricket.",
      "For X01, pick your start score and turn double-out on or off.",
      "Enter each player’s turn total (0–180); SpinDecks subtracts it, reverts busts, and advances to the next player.",
      "Use Undo for mistakes and “New leg” to start again with the same players.",
    ],
    whoFor: [
      ["Pub & home players", "keep score for a proper game of 501 without pen and paper."],
      ["Darts streamers", "show a clean, readable scoreboard on stream in fullscreen or with a green-screen background."],
      ["Clubs", "run legs quickly with automatic totals, averages and bust handling."],
    ],
    faq: [
      ["What darts games does it support?", "X01 (501, 301, 701 or a custom start) with optional double-out, and Cricket (20–15 plus the bull). For any other game, use the <a href=\"/scorepad/\">score pad</a> — a general players-and-rounds scorer."],
      ["Does it handle busts and double-out?", "Yes. Going below zero — or leaving 1, or finishing on a non-double when double-out is on — reverts the turn automatically."],
      ["Does it show my average?", "Yes — it tracks your three-dart average and darts thrown as you play, and ranks players by remaining score."],
      ["Is it free and ad-free?", "Completely. No sign-up, no ads, and it works offline once loaded."],
      ["Can I use it on my phone?", "Yes — it’s designed to work one-handed on a phone, and the display is big enough to read across a room."],
    ],
  },
  {
    slug: "random-number-generator",
    view: "numbers",
    nav: "Numbers",
    title: "Random Number Generator — Pick a Number in a Range | SpinDecks",
    description:
      "Generate random numbers in any range, with or without repeats. Draw one or many at once, flip a coin or roll dice. Free, ad-free, no sign-up, works offline.",
    h1: "Random number generator",
    intro:
      "Pick a random number in any range, or draw several at once. Set a minimum and maximum, choose how many numbers to draw, and turn on “no repeats” for lottery-style draws. One-tap presets cover dice, a coin flip and a 6-of-49 lottery.",
    steps: [
      "Set the minimum and maximum for your range.",
      "Choose how many numbers to draw, and tick “no repeats” if each should be unique.",
      "Press Generate — or tap a preset like Dice, D20 or Coin flip.",
      "For multiple draws you’ll see the sum and mean, and a copy button for the results.",
    ],
    whoFor: [
      ["Teachers", "pick a random question number, page or seat in seconds."],
      ["Prize draws", "draw random ticket numbers with no repeats for a fair raffle."],
      ["Games", "roll dice, flip a coin or generate lottery numbers without any physical kit."],
    ],
    faq: [
      ["Can I draw numbers without repeats?", "Yes — tick “no repeats” and every number in the draw will be unique, ideal for raffles and lotteries."],
      ["Is the randomness fair?", "Yes. It uses your browser’s cryptographic random source, so every number in the range is equally likely."],
      ["Can I flip a coin or roll dice?", "Yes — one-tap presets cover a coin flip (Heads/Tails), a six-sided die, a D20, 1–100 and a 6-of-49 lottery."],
      ["Can I draw lots of numbers at once?", "Yes — set “how many” to draw a batch, and you’ll get the sum and mean alongside the numbers."],
      ["Does it work offline?", "Yes. Once the page has loaded once, it keeps working with no connection."],
    ],
  },
  {
    slug: "countdown-timer",
    view: "timer",
    nav: "Timer",
    title: "Countdown Timer — Free Classroom & Stream Timer | SpinDecks",
    description:
      "A big, clear countdown timer for lessons, tasks and streams. Quick presets, custom times, stopwatch mode and an optional end beep. Free, ad-free, no login.",
    h1: "Countdown timer",
    intro:
      "A big, clear countdown timer for lessons, tasks, games and streams. Pick a preset or set a custom time, and watch a giant, readable clock count down — with an optional beep when it hits zero. There’s a stopwatch mode too.",
    steps: [
      "Choose a preset (1, 3, 5, 10, 15 minutes) or type a custom time.",
      "Press Start — the clock is large enough to read from across a room.",
      "Pause, resume or reset at any time; switch to Stopwatch to count up instead.",
      "Go fullscreen for a distraction-free display on a projector or second screen.",
    ],
    whoFor: [
      ["Teachers", "time a starter, a task or a test with a clock the whole class can see from the back."],
      ["Streamers", "run a “starting soon” or break countdown, in fullscreen or on a green-screen background for OBS."],
      ["Anyone", "time a workout, a presentation or a game round without hunting for your phone."],
    ],
    faq: [
      ["Is the timer accurate?", "Yes — it’s timestamp-based, so it stays accurate even if the tab is in the background, with no drift."],
      ["Can the class see it from a distance?", "Yes. The clock is deliberately huge, and fullscreen mode makes it fill the screen for projectors."],
      ["Does it beep when it finishes?", "It can — there’s an optional end beep you can switch on or off."],
      ["Is there a stopwatch too?", "Yes — switch to Stopwatch mode to count up from zero."],
      ["Do I need to install anything?", "No. It runs in your browser, free and ad-free, and works offline after the first visit."],
    ],
  },
  {
    slug: "tally-counter",
    view: "counter",
    nav: "Counters",
    title: "Tally Counter — Free Online Click Counter | SpinDecks",
    description:
      "Free online tally counter. Run several counters at once, set custom steps, and reset with one tap. Ad-free, no sign-up, works offline on phone or desktop.",
    h1: "Tally counter",
    intro:
      "A free online tally counter for keeping count of, well, anything — reps, laps, stock, attendance, spins or deaths. Run several named counters side by side, set a custom step for each, and reset with one tap. Everything saves automatically.",
    steps: [
      "Add a counter and give it a name.",
      "Tap + or − to count; set a custom step if you count in fives or tens.",
      "Add as many counters as you need — they all save on their own.",
      "Reset any counter individually when you’re done.",
    ],
    whoFor: [
      ["Teachers", "tally house points, correct answers or who’s spoken, on a phone or the board."],
      ["Streamers", "count deaths, wins or attempts live — a counter named “Spins” even ticks up when you spin the wheel."],
      ["Everyday", "count stock, steps, laps, people through a door, or anything else you’d use a clicker for."],
    ],
    faq: [
      ["Can I run more than one counter?", "Yes — add as many named counters as you like and they all keep their own totals."],
      ["Can I count in steps other than one?", "Yes. Each counter has a custom step, so you can count up (or down) in fives, tens or any value."],
      ["Do my counts save if I close the tab?", "Yes — everything is stored in your browser and reloads exactly as you left it, and it works offline."],
      ["Is it free?", "Completely free and ad-free, with no account required."],
      ["Does the spin counter update automatically?", "A counter named “Spins” auto-increments each time you spin the wheel, so you don’t have to tap it yourself."],
    ],
  },
  {
    slug: "slot-machine",
    view: "slots",
    nav: "Slots",
    title: "Slot Reels — Random Picker with Spinning Reels | SpinDecks",
    description:
      "A slot-reel style random picker. Feed it your own list and let the reels decide. Free, ad-free and offline — a fun alternative to a spinning wheel.",
    h1: "Slot reels picker",
    intro:
      "A slot-reel style random picker: a row of reels that spin and stop on a pick from your own lists. It’s a fun, playful alternative to the wheel — feed each reel a list of names, prompts or challenges and let the reels decide the combo.",
    steps: [
      "Choose how many reels you want (2–6).",
      "Point each reel at any of your saved wheels — the same list for repeat picks, or different lists for a combo.",
      "Press “Spin all”, or spin a single reel on its own.",
      "Each spin is logged in the results list with a timestamp.",
    ],
    whoFor: [
      ["Streamers", "pick a random challenge, character or loadout combo live on stream."],
      ["Teachers", "mix a random name with a random task or prompt for a bit of fun."],
      ["Games nights", "generate a random combo — who, what and where — to kick off a round."],
    ],
    faq: [
      ["What is the slot reels picker?", "It’s a random picker styled like spinning reels. Each reel draws from a list you choose, so it’s just a playful way to pick names, prompts or challenges — not a casino game."],
      ["Can each reel use a different list?", "Yes. Point each reel at any of your saved wheels to build a combo — for example a name, a challenge and a number."],
      ["Can I spin one reel at a time?", "Yes — spin them all together, or click a single reel (or its Spin button) to spin just that one."],
      ["Does it keep a history?", "Yes — every spin is recorded in a results log with a timestamp, which you can clear any time."],
      ["Is it free?", "Yes — free, ad-free and offline-capable, like the rest of SpinDecks."],
    ],
  },
  {
    slug: "dice-roller",
    view: "dice",
    nav: "Dice",
    title: "Dice Roller — Roll 3d6, d20 & Any Dice Notation | SpinDecks",
    description:
      "Free online dice roller with standard notation: 3d6+2, 4d6kh3, 2d20kh1. Roll any dice for RPGs and board games. Fair, fast, ad-free, works offline.",
    h1: "Dice roller",
    intro:
      "A free online dice roller that understands standard dice notation — type something like <code>3d6+2</code>, <code>4d6kh3</code> or <code>2d20kh1</code> and it rolls fairly using your browser’s cryptographic random source. Or just tap a die. Great for D&D, RPGs and board games.",
    steps: [
      "Type dice notation in the box (e.g. <code>2d6+4</code>), or tap a quick die like d20.",
      "Press Roll or hit Enter — you’ll see each die, the total, and any dropped dice struck through.",
      "Use the presets: Stat roll (<code>4d6kh3</code>), Advantage (<code>2d20kh1</code>) and Disadvantage (<code>2d20kl1</code>).",
      "Your last 20 rolls are kept in the history below.",
    ],
    whoFor: [
      ["RPG players", "roll stats, attacks and saves with proper notation, keep/drop and advantage."],
      ["Board gamers", "roll any dice you’re missing from the box, on the phone at the table."],
      ["Teachers", "demonstrate probability with a fair, transparent roller that shows every die."],
    ],
    faq: [
      ["What dice notation is supported?", "Standard notation: a count and die size like <code>3d6</code>, an optional modifier like <code>+2</code>, and keep/drop such as <code>kh</code> (keep highest), <code>kl</code> (keep lowest), <code>dh</code> and <code>dl</code>. You can combine terms, e.g. <code>1d8+2d6-1</code>. <code>d%</code> is percentile (d100)."],
      ["How do I roll with advantage?", "Roll <code>2d20kh1</code> for advantage (keep the highest of two d20) or <code>2d20kl1</code> for disadvantage (keep the lowest)."],
      ["How do I roll D&D stats?", "Use <code>4d6kh3</code> — it rolls four six-sided dice and keeps the highest three, showing the dropped die struck through."],
      ["Is the roller fair?", "Yes. Every die uses <code>crypto.getRandomValues</code> with bias removed, so all faces are equally likely."],
      ["Does it work offline?", "Yes — once loaded it works with no connection, and your roll history is stored only in your browser."],
    ],
  },
  {
    slug: "first-player-picker",
    view: "firstplayer",
    nav: "First player",
    title: "Who Goes First? Free First Player Picker | SpinDecks",
    description:
      "Decide who goes first in seconds. Tap for a random player, or generate a full random turn order. Multi-touch “finger” picker for phones at the table. Free, ad-free.",
    h1: "Who goes first?",
    intro:
      "Settle who goes first in seconds. Pick a random player by number or by name, generate a full random turn order, or use the multi-touch picker — everyone holds a finger on the screen and one is chosen at random. Built for phones at the table.",
    steps: [
      "Choose a mode: Count (just how many players), Names, or Touch.",
      "In Count mode, set the number of players and tap “Pick first player”.",
      "In Touch mode, everyone presses and holds a finger on the pad — after a moment, one is chosen.",
      "Tap “…and full turn order” for a complete random running order.",
    ],
    whoFor: [
      ["Board gamers", "decide the start player without arguing — or roll a full turn order for the round."],
      ["Families & parties", "let the phone pick fairly with the finger-on-screen game everyone knows."],
      ["Teachers", "pick who goes first for a game or activity in one tap."],
    ],
    faq: [
      ["How does the finger picker work?", "Switch to Touch mode and everyone holds a finger on the pad. Once two or more are held, a short countdown runs and one finger is chosen at random. Lift and tap to go again."],
      ["Can I use names instead of “Player 1”?", "Yes — switch to Names mode, enter one name per line, and the picker chooses a name. Your list is saved for next time."],
      ["Can it give a full turn order?", "Yes — tap “…and full turn order” for a complete random running order, not just the first player."],
      ["Is it fair?", "Yes. Every pick uses your browser’s cryptographic random source, so each player is equally likely."],
      ["Does it work on a phone?", "It’s designed for phones — big buttons, one-handed, and the touch picker uses multi-touch. It works on desktop too via Count and Names modes."],
    ],
  },
  {
    slug: "scorepad",
    view: "scorepad",
    nav: "Score pad",
    title: "Score Pad — Free Board Game Score Keeper | SpinDecks",
    description:
      "A free score pad for any board or card game. Add players, score by round, see running totals. Big keypad for phones, undo, and screen-awake. No ads, no login.",
    h1: "Board game score pad",
    intro:
      "A free, general-purpose score pad for any board or card game — players across the top, rounds down the side, running totals that keep themselves. Tap a cell to enter a score on a big keypad, undo mistakes, and keep the screen awake at the table. Save as many games as you like.",
    steps: [
      "Add your players (rename them by tapping the name).",
      "Tap “Add round”, then tap any cell to enter that player’s score on the keypad.",
      "Running totals update at the bottom; the leader is highlighted — flip “Lowest wins” for golf-style games.",
      "Save multiple games, duplicate one to replay with the same players, and export a game as CSV.",
    ],
    whoFor: [
      ["Board gamers", "keep score for Wingspan, Catan, rummy or any game — on the phone at the table."],
      ["Card players", "track rounds and running totals without pen and paper."],
      ["Families", "a simple, shared score sheet everyone can see, that survives a screen lock."],
    ],
    faq: [
      ["What games is the score pad for?", "Any game where you total points across players and rounds — board games, card games, quizzes. For darts specifically, use the <a href=\"/darts-scoreboard/\">darts scoreboard</a>."],
      ["Can the highest or lowest score win?", "Both. Tick “Lowest wins” for golf-style games and the lowest total is highlighted as the leader instead of the highest."],
      ["Will my scores stay on my phone if the screen locks?", "Turn on “Keep screen awake” to stop the screen sleeping during a game (where your browser supports it). Everything is also saved automatically in your browser."],
      ["Can I keep more than one game going?", "Yes — save as many games as you like and switch between them, or duplicate a finished game to replay with the same players."],
      ["Can I get the scores out?", "Yes — “Export CSV” downloads the whole game (players, rounds and totals) as a spreadsheet-friendly file."],
    ],
  },
];

// The hub (/) — not a tool, a landing page linking to everything.
export const HUB = {
  title: "SpinDecks — Free Ad-Free Random Pickers, Timers & Scoreboards",
  description:
    "Free tools that just work: wheel of names, dice roller, random team maker, darts scoreboard, number generator, timer, counters and more. No ads, no login, works offline.",
  h1: "Free, ad-free tools that just work",
  intro:
    "SpinDecks is a set of simple, fast tools for whatever you need to pick, time or count. No ads, no accounts, no tracking — everything runs in your browser and works offline. Pick a tool to get started.",
};

// Legal / info pages. Sole trader; contact via hello@spindecks.app.
export const PAGES = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy | SpinDecks",
    description: "How SpinDecks handles your data: it doesn’t. No accounts, no tracking, no analytics. Everything stays in your browser.",
    h1: "Privacy policy",
  },
  terms: {
    slug: "terms",
    title: "Terms of Use | SpinDecks",
    description: "The simple terms for using SpinDecks — a free, ad-free set of browser tools provided as-is.",
    h1: "Terms of use",
  },
  about: {
    slug: "about",
    title: "About SpinDecks | Free Ad-Free Creator & Classroom Tools",
    description: "What SpinDecks is, who it’s for, and the principles behind it: no ads, no accounts, no tracking, works offline.",
    h1: "About SpinDecks",
  },
};
