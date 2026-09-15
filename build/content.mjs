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
  token: "20260915e",
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
  {
    slug: "chess-clock",
    view: "chessclock",
    nav: "Chess clock",
    title: "Online Chess Clock — Free 2-Player & Multiplayer Timer | SpinDecks",
    description:
      "A free online chess clock and game timer for two players or up to six. Each player gets a time bank; tap your area to end your turn, with optional Fischer increment. No ads, no sign-up, works offline.",
    h1: "Online chess clock & multiplayer timer",
    intro:
      "A free online chess timer for two players — or a shared game clock for up to six. Give everyone a time bank, put the phone or laptop in the middle, and each player taps their own area to end their turn. Optional Fischer increment adds time after each move. It runs entirely in your browser with nothing to download, and works offline once loaded.",
    steps: [
      "Set the number of players (2 for a classic chess clock, up to 6), minutes each, and any increment in seconds.",
      "Press “Start clock” — the first player's timer counts down.",
      "Each player taps their own area to end their turn and start the next player's clock.",
      "Pause or reset any time; turn on “Keep screen awake” so it doesn't sleep mid-game.",
    ],
    whoFor: [
      ["Chess players", "a proper two-player chess clock with Fischer increment — online, free, and nothing to install."],
      ["Board gamers", "put every player on a clock to speed up a slow game — up to six at once."],
      ["Anyone", "a shared, fair turn timer or stopwatch for any game where people take turns."],
    ],
    faq: [
      ["Is it a free online chess timer?", "Yes — it's completely free, with no ads and no sign-up. It runs in your browser, and once loaded it keeps working offline."],
      ["Can I use it as a simple 2-player chess clock?", "Yes. Set it to 2 players for a classic two-player chess clock — each side taps their own area to pass the turn, exactly like a physical clock."],
      ["How many players does it support?", "From 2 up to 6, each with their own time bank. The phone sits in the middle and everyone taps their area to pass the turn."],
      ["Does it support increment (Fischer timing)?", "Yes — set an increment in seconds and that time is added to a player's bank after each move they make."],
      ["Do I need to download or install anything?", "No — it's just a web page. Open it in any browser on your phone, tablet or computer, or add it to your home screen to use it like an app."],
      ["What happens when a player runs out of time?", "Their clock flags at zero and the turn passes on to the next player who still has time."],
      ["Is it accurate?", "Yes — it's timestamp-based, so it stays accurate even if the tab is briefly in the background, with no drift."],
    ],
  },
  {
    slug: "tournament-bracket",
    view: "bracket",
    nav: "Bracket",
    title: "Tournament Bracket Generator — Knockout, League & Groups | SpinDecks",
    description:
      "Free tournament bracket generator: single-elimination knockout, round-robin league tables, or group stages into a knockout. Random or ordered seeding. No ads, no sign-up.",
    h1: "Tournament bracket generator",
    intro:
      "Make a tournament in seconds. Paste your players or teams and pick a format — a single-elimination <strong>knockout</strong> bracket, a round-robin <strong>league</strong> with a live standings table, or <strong>group stages</strong> that feed into a knockout. Seed by order or at random, then tap winners and results as you play.",
    steps: [
      "Type one player or team per line, and choose Keep order or Random seeds.",
      "Pick a format: Knockout, League, or Groups.",
      "Press Generate — for a knockout, tap a name in each match to advance them; for a league or groups, tap W / D / W to record results and the table updates.",
      "In Groups, set how many teams qualify, then “Build knockout from qualifiers” to play it out.",
    ],
    whoFor: [
      ["Games nights & clubs", "run a quick knockout or a full round-robin for any number of players."],
      ["Esports & sports", "seed a bracket, track a league table, or do groups-then-knockout like a real cup."],
      ["Classrooms", "organise a fair class tournament without drawing brackets by hand."],
    ],
    faq: [
      ["What tournament formats are supported?", "Single-elimination <strong>knockout</strong> (with byes when the count isn't a power of two), round-robin <strong>league</strong> with a points table, and <strong>group stages</strong> — round-robin groups where the top teams qualify for a knockout."],
      ["Can I seed randomly?", "Yes — choose “Random seeds” before generating and the draw is shuffled with your browser's cryptographic random source, or “Keep order” to seed by the order you typed."],
      ["How do I record results?", "In a knockout, tap the name that won each match to advance them. In a league or group, tap W (home), D, or W (away) on each fixture and the standings recalculate instantly."],
      ["Does it handle odd numbers of teams?", "Yes. Knockouts add byes to reach a full bracket, and leagues/groups add a rest week so everyone plays a full round-robin."],
      ["Are my brackets saved?", "Yes — the entrants, format and results stay in your browser, and it all works offline."],
    ],
  },
  {
    slug: "bt-dojo",
    view: "dojo",
    nav: "Dojo",
    title: "The BT Dojo — Head-to-Head Classroom Quiz Game | SpinDecks",
    description:
      "A fast two-player classroom quiz game for the interactive whiteboard. Winner stays on, lives and powerups, a class leaderboard, and any question set you choose. Free, no sign-up, works offline.",
    h1: "The BT Dojo — classroom quiz duel",
    intro:
      "A head-to-head quiz game built for the interactive whiteboard. Two students race to find the correct answer on their own board; the winner stays on as champion and a new challenger steps up. Lives, powerups and a class leaderboard keep the whole room in it — and you can load any question set you like: maths, spelling, science, vocabulary, history, anything.",
    steps: [
      "Pick a question set — use a built-in one or make your own in the editor (one line per question: <code>question | answer | wrong, wrong</code>).",
      "Type the first two students' names and press “Begin duel”.",
      "Both players race to tap the correct answer on their own board. A wrong tap costs a life; run out and you forfeit.",
      "The winner stays on as champion; enter the next challenger's name and play on. Check the leaderboard any time to rank the class.",
    ],
    whoFor: [
      ["Teachers", "a fast, high-energy starter or plenary for the whiteboard — on any topic, with the whole class cheering the duel."],
      ["Tutors & clubs", "quick-fire recall practice with a bit of friendly competition and powerups to keep it fun."],
      ["Anyone", "a two-player quiz duel for revision, family quiz night or a team ice-breaker."],
    ],
    faq: [
      ["Is it just for maths?", "No — it works for any subject. It ships with maths sets (times tables, fractions, BIDMAS…) plus a capital-cities example, and you can add your own set on any topic in the editor."],
      ["How do I make my own question set?", "Open the editor and type one question per line as <code>question | answer | wrong answers</code>. Wrong answers are optional — the board fills the rest from the other answers in your set. You can also import a set as JSON."],
      ["Can it show maths properly?", "Yes — a light markup renders fractions (<code>\\frac{3}{4}</code>), powers (<code>x^2</code>), roots and symbols like <code>\\times</code> and <code>\\div</code>, with no plugins to install."],
      ["What are the powerups?", "Each round a player can use a Smoke bomb (removes four wrong answers from their own board), Heal (restores a life), and sometimes Block (freezes the opponent's board for three seconds)."],
      ["How does ranking work?", "The champion builds a streak by staying on, and every student's wins and best streak are tracked in a leaderboard you can display at the end of the session."],
      ["Is it free and private?", "Completely — no ads, no sign-up, and your question sets and leaderboard stay in your browser. It works offline once loaded."],
    ],
  },
  {
    slug: "reveal-cards",
    view: "reveal",
    nav: "Reveal cards",
    title: "Reveal Cards — Free Classroom Flashcards for the Whiteboard | SpinDecks",
    description:
      "A teacher-paced flashcard runner for the interactive whiteboard. Show a question, reveal the answer when the class is ready, move on. Uses any question set. Free, no sign-up, works offline.",
    h1: "Reveal cards — classroom flashcards",
    intro:
      "A dead-simple flashcard tool for the whiteboard. Show a question big on the board, reveal the answer when the class is ready, then move to the next card. Perfect as a low-stakes starter, recap or plenary — and it uses the same question sets as The BT Dojo, so anything you've made or generated is ready to go.",
    steps: [
      "Pick a question set — a built-in one, or one you made or generated in The BT Dojo.",
      "Choose whether to shuffle, then press “Start”.",
      "Read the question with the class. Click the card (or press Space) to reveal the answer.",
      "Press Next (or →) for the next card. Go back with ← at any time.",
    ],
    whoFor: [
      ["Teachers", "a no-fuss starter or plenary — key terms, times tables, definitions, vocabulary — paced by you."],
      ["Tutors", "quick recall practice one card at a time, with the answer hidden until you're ready."],
      ["Anyone", "revision flashcards on any topic, straight on the big screen."],
    ],
    faq: [
      ["Where do the questions come from?", "The same sets as The BT Dojo — built-in packs plus any set you make in the editor or generate with AI. Make it once, use it in both games."],
      ["Can it show maths properly?", "Yes — fractions, powers, roots and symbols render with a light markup, no plugins needed."],
      ["Can I use the keyboard?", "Yes — Space (or Enter) reveals the answer, → moves to the next card, and ← goes back. Ideal for a clicker or whiteboard pen."],
      ["Is it free and private?", "Completely — no ads, no sign-up, and your sets stay in your browser. It works offline once loaded."],
    ],
  },
  {
    slug: "pairs",
    view: "pairs",
    nav: "Pairs",
    title: "Pairs — Free Classroom Matching & Memory Game | SpinDecks",
    description:
      "A match-the-answer memory game for the whiteboard. Flip cards to pair each question with its answer, solo or in two teams. Uses any question set. Free, no sign-up, works offline.",
    h1: "Pairs — classroom matching game",
    intro:
      "A memory-and-matching game for the whiteboard. Flip two cards to match each question with its answer — perfect for key terms, vocabulary and definitions. Play as a whole class or split into two teams, and it uses the same question sets as The BT Dojo.",
    steps: [
      "Pick a question set and how many pairs to play with.",
      "Choose whole-class or two-team mode, then press “Start”.",
      "Tap two cards to flip them — a question and its matching answer stay face-up.",
      "In team mode a match keeps your turn; a miss passes over. Most pairs wins.",
    ],
    whoFor: [
      ["Teachers", "a matching starter for terms and definitions, played as a class or as teams."],
      ["Tutors", "recall and pairing practice — vocabulary, translations, formulae."],
      ["Anyone", "a quick memory game on any topic."],
    ],
    faq: [
      ["Where do the questions come from?", "The same sets as The BT Dojo — built-in packs plus anything you make in the editor or generate with AI."],
      ["How are the cards matched?", "Each question card pairs with its answer card. Only questions with distinct answers are used, so there are no ambiguous duplicates on the board."],
      ["Can two teams play?", "Yes — switch to two-team mode. A match scores a point and keeps your turn; a miss passes to the other team."],
      ["Is it free and private?", "Completely — no ads, no sign-up, and your sets stay in your browser. It works offline once loaded."],
    ],
  },
  {
    slug: "bingo",
    view: "bingo",
    nav: "Bingo",
    title: "Classroom Bingo — Free Question Bingo Caller & Card Maker | SpinDecks",
    description:
      "Whole-class bingo for the whiteboard. You call the questions, students mark the answers on their cards. Print cards from any question set and reveal answers one at a time. Free, no sign-up, works offline.",
    h1: "Classroom bingo",
    intro:
      "Whole-class bingo built from your questions. Print a set of cards for the class (or have students fill a blank grid from the answer pool), then call questions one at a time — the class works out each answer and marks it off. First to a line or full house wins. It uses the same question sets as The BT Dojo.",
    steps: [
      "Pick a question set and a card size (3×3, 4×4 or 5×5).",
      "Print cards for the class, or show the answer pool so students fill their own grid.",
      "Press “Start calling”, read the question, then “Reveal answer” when the class is ready.",
      "Students mark the answer if it's on their card. Keep calling until someone shouts bingo.",
    ],
    whoFor: [
      ["Teachers", "a whole-class recap where everyone plays at once — times tables, vocabulary, key facts."],
      ["Tutors", "a relaxed group game that still drills recall."],
      ["Anyone", "quiz bingo for a club or family night on any topic."],
    ],
    faq: [
      ["Where do the questions come from?", "The same sets as The BT Dojo — built-in packs plus anything you make in the editor or generate with AI."],
      ["How do students get cards?", "Print a batch of randomly generated cards from the “Print cards” button, or show the answer pool on the board and have students copy any answers they like into a blank grid."],
      ["How does the caller work?", "It shows one question at a time. You reveal the answer when the class is ready, and each revealed answer is added to a “called” list so you can check a winning card."],
      ["Is it free and private?", "Completely — no ads, no sign-up, and your sets stay in your browser. It works offline once loaded."],
    ],
  },
  {
    slug: "class-quiz",
    view: "classquiz",
    nav: "Class quiz",
    title: "Class Quiz — Free Team Quiz Game for the Whiteboard | SpinDecks",
    description:
      "Run a team quiz on the whiteboard. Split the class into teams (from a saved wheel if you like), reveal each answer and tap the team that got it — scores keep themselves. Free, no sign-up, works offline.",
    h1: "Class quiz — team quiz game",
    intro:
      "A team quiz for the whole class, run from the board. Split students into teams — from one of your saved wheels or just numbered teams — then work through a question set. Reveal each answer, tap the team that got it, and the scoreboard updates itself. It uses the same question sets as The BT Dojo.",
    steps: [
      "Pick a question set and how many teams to play with.",
      "Optionally choose a saved class wheel — students are split into balanced teams automatically.",
      "Press “Start quiz”, read the question, then “Reveal answer”.",
      "Tap the team that got it right (or “No one”) and the score updates. Finish any time for the final standings.",
    ],
    whoFor: [
      ["Teachers", "a whole-class team quiz for recap or revision, with automatic scoring."],
      ["Tutors & clubs", "a group quiz where everyone's involved and the scores keep themselves."],
      ["Anyone", "a pub-style team quiz on any topic."],
    ],
    faq: [
      ["Where do the questions come from?", "The same sets as The BT Dojo — built-in packs plus anything you make in the editor or generate with AI."],
      ["How are teams made?", "Choose a saved wheel and the class is split into balanced teams automatically (sizes differ by at most one), or just play with numbered teams. Re-shuffle before you start if you like."],
      ["How is scoring handled?", "After you reveal each answer, tap the team that got it right to add a point. The scoreboard is always on screen, and the final standings show at the end."],
      ["Is it free and private?", "Completely — no ads, no sign-up, and your sets stay in your browser. It works offline once loaded."],
    ],
  },
  {
    slug: "grid-claim",
    view: "gridclaim",
    nav: "Grid claim",
    title: "Grid Claim — Free Two-Team Connect Quiz Game | SpinDecks",
    description:
      "A two-team connect game for the whiteboard. Answer questions to claim tiles — one team joins left to right, the other top to bottom. First to bridge their sides wins. Free, no sign-up, works offline.",
    h1: "Grid claim — connect quiz game",
    intro:
      "A two-team strategy quiz for the board. Teams take turns answering to claim tiles on a grid: Team 1 tries to build an unbroken path from left to right, Team 2 from top to bottom. Answer correctly to claim a tile — and block your rivals' route. It uses the same question sets as The BT Dojo.",
    steps: [
      "Pick a question set and a grid size (4×4, 5×5 or 6×6).",
      "On your turn, tap an open tile and read the question that appears.",
      "Reveal the answer — if the team got it, claim the tile in your colour; a miss leaves it open and passes over.",
      "First team to connect their two sides wins. If the grid fills up, the most tiles wins.",
    ],
    whoFor: [
      ["Teachers", "a tactical whole-class team game where answering and blocking both matter."],
      ["Tutors & clubs", "a connect-four-meets-quiz for two teams on any topic."],
      ["Anyone", "a strategic quiz duel for revision or a games night."],
    ],
    faq: [
      ["Where do the questions come from?", "The same sets as The BT Dojo — built-in packs plus anything you make in the editor or generate with AI."],
      ["How do you win?", "Team 1 wins by connecting the left and right sides with their tiles; Team 2 by connecting top and bottom. If the whole grid is claimed with no path, whoever has the most tiles wins."],
      ["What happens on a wrong answer?", "The tile stays open and it becomes the other team's turn, so a miss can hand your rivals the tile you wanted."],
      ["Is it free and private?", "Completely — no ads, no sign-up, and your sets stay in your browser. It works offline once loaded."],
    ],
  },
  {
    slug: "countdown",
    view: "countdown",
    nav: "Countdown",
    title: "Countdown Game — Free Letters, Numbers & Conundrum | SpinDecks",
    description:
      "The classic letters, numbers and conundrum game for the whiteboard. Pick your letters, reach the target number, or crack the nine-letter conundrum — each with a 30-second clock. Free, no sign-up, works offline.",
    h1: "Countdown — letters, numbers & conundrum",
    intro:
      "The classic letters-and-numbers game as a classroom starter. In the letters round, choose vowels and consonants and make the longest word. In the numbers round, pick your six numbers and reach the target. Or crack the nine-letter conundrum. Each round has its own 30-second clock. A great warm-up — no question set needed.",
    steps: [
      "Choose a round: Letters, Numbers or Conundrum.",
      "Letters: tap Vowel or Consonant nine times, then start the 30-second clock and find the longest word.",
      "Numbers: choose how many large numbers, deal your six and a target, then race the clock to reach it.",
      "Conundrum: unscramble the nine-letter word before the clock runs out, then reveal the answer.",
    ],
    whoFor: [
      ["Teachers", "a quick literacy or numeracy starter that needs no set-up or content."],
      ["Tutors", "mental-maths and vocabulary practice with a bit of time pressure."],
      ["Anyone", "a solo or team brain-teaser in the style of the TV show."],
    ],
    faq: [
      ["Does it need a question set?", "No — Countdown is self-contained. It deals random letters, numbers and conundrums, so you can start straight away."],
      ["How are the letters and numbers chosen?", "Letters are drawn from weighted vowel and consonant pools like the show; numbers come from the four large tiles (25, 50, 75, 100) and two sets of 1–10, with a random three-digit target."],
      ["Does it check my word or solution?", "No — the class or teacher judges the best word or the closest number, just like the show. The clock and the puzzle are what it provides."],
      ["Is it free and private?", "Completely — no ads, no sign-up, and it works offline once loaded."],
    ],
  },
  {
    slug: "axiom",
    view: "axiom",
    nav: "Axiom",
    title: "Axiom — Free Daily Maths Puzzle | SpinDecks",
    description:
      "A daily maths crossword. Place the number tiles so every line reads as a true equation, across and down. One puzzle a day, the same for everyone, self-checking. Free, no sign-up, works offline.",
    h1: "Axiom — daily maths puzzle",
    intro:
      "A daily maths puzzle for a starter or a brain-break, at three difficulty levels. Numbers and operators sit in a grid; a few numbers are missing. Place the tiles from the rack so every line reads correctly across and down — shared cells have to work in both directions at once. Easy is a four-equation ring; Medium and Hard are fully interlocking crosswords (six lines), with Hard mixing add, subtract and multiply. A new puzzle every day at each level, the same for the whole class, and it checks itself.",
    steps: [
      "Choose a level — Easy, Medium or Hard — then look at the grid and its shared cells.",
      "Tap a number tile in the rack, then tap the blank cell you want it in (tap a placed tile to take it back).",
      "Fill every blank so all the lines are true — lines you've completed turn green.",
      "Solve it to keep your daily streak going, or hit “Practice puzzle” for an extra one.",
    ],
    whoFor: [
      ["Teachers", "a daily number starter that runs itself — put it on the board as students come in."],
      ["Tutors", "quick arithmetic and reasoning practice, one short puzzle at a time."],
      ["Anyone", "a bite-sized daily maths challenge, like a numbers crossword."],
    ],
    faq: [
      ["Is it the same puzzle for everyone?", "Yes — each level's daily puzzle is seeded from the date, so everyone gets the same one each day. Want more? “Practice puzzle” deals a fresh random one that doesn't affect your streak."],
      ["What are the difficulty levels?", "Easy is a four-equation ring; Medium is an interlocking crossword of six addition lines; Hard is the same six-line crossword but mixes add, subtract and multiply with more blanks to fill."],
      ["How does it check itself?", "Every line is a real equation. Complete lines turn green and you've solved it when they're all correct — no marking needed."],
      ["Do I need an account?", "No — your streak is stored in your own browser. There's no sign-up and it works offline once loaded."],
      ["Is it free?", "Completely — no ads, no sign-up, ever."],
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
