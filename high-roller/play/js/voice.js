/* Voice chat: speak to characters with the microphone and hear them answer.
   Two ways to hear them:
   - Device voices (free): the voices built into this phone or browser. Each character is cast to a
     different installed voice that fits their accent, and novelty voices are skipped. When the
     browser won't list its voices (common in iPhone home-screen apps), each character still gets
     their own accent by language, so they don't all share one default voice.
   - Natural voices (optional): OpenAI's text-to-speech with your own key, with acting directions
     per character (accent, age, mood). The key stays in this browser only.
   Story dialogs can be read aloud too. Settings live in this browser only. */
const VOICE_KEY = 'highroller.voice', TTS_KEY = 'highroller.openaiKey';
// how each character sounds. g: 'f'/'m'; acc: accents in order of preference; pitch/rate for device
// voices; nv/how: natural voice and acting directions
const CAST = {
  narrator: { g: 'm', acc: ['en-US', 'en-GB'], pitch: .9, rate: .95, nv: 'onyx', how: 'Film noir narrator. Low, unhurried, a little world-weary, like a late-night radio drama.' },
  dolores: { g: 'f', acc: ['en-US'], pitch: .95, rate: .95, nv: 'coral', how: 'Warm, husky Texan bartender in her fifties. Slow drawl, teasing, kind, calls people sugar.' },
  doc: { g: 'm', acc: ['en-US', 'en-GB'], pitch: .8, rate: .85, nv: 'fable', how: 'Elderly retired card counter. Gentle, gravelly, wry, a little short of breath, fond of the listener.' },
  lou: { g: 'm', acc: ['en-US'], pitch: 1.05, rate: 1.05, nv: 'ash', how: 'Jolly old Cajun riverboat captain with a Louisiana accent and a booming laugh. Hiding guilt.' },
  vinnie: { g: 'm', acc: ['en-US'], pitch: .75, rate: 1, nv: 'onyx', how: 'Brooklyn loan shark. Low, smooth, friendly on the surface with menace underneath. New York accent.' },
  nico: { g: 'm', acc: ['en-US', 'en-AU'], pitch: .6, rate: .88, nv: 'echo', how: 'Huge slow-talking enforcer. Flat, few words, surprisingly soft.' },
  margot: { g: 'f', acc: ['fr', 'en-GB'], pitch: 1.1, rate: 1, nv: 'shimmer', how: 'Glamorous French casino owner. Silky, amused, a hint of danger. Light French accent.' },
  kessler: { g: 'm', acc: ['en-GB'], pitch: .7, rate: .85, nv: 'ballad', how: 'Cultured old-money British villain. Precise, cold, velvet-voiced, never hurried, faintly amused.' },
  sal: { g: 'm', acc: ['en-US'], pitch: .75, rate: .9, nv: 'verse', how: 'Old Italian-American gambler from New Jersey. Warm, raspy, emotional, a father figure who has missed you.' },
  mick: { g: 'm', acc: ['en-IE', 'en-GB'], pitch: 1, rate: 1.05, nv: 'echo', how: 'Cheeky Irish darts hustler from Dublin. Quick, playful, a strong Irish accent.' },
  sparky: { g: 'm', acc: ['en-US'], pitch: 1.15, rate: 1.15, nv: 'alloy', how: 'Excitable, nerdy slot-machine technician. Fast, enthusiastic, slightly conspiratorial.' },
  tex: { g: 'm', acc: ['en-US'], pitch: .85, rate: 1, nv: 'ash', how: 'Loud Texan cowboy. Brash, big laugh, thick Texas drawl.' },
  mei: { g: 'f', acc: ['en-US', 'en-AU'], pitch: 1.05, rate: 1.1, nv: 'sage', how: 'Precise, cool-headed investigator who counts everything. Crisp, dry, quietly confident.' },
  baron: { g: 'm', acc: ['en-GB', 'de'], pitch: .8, rate: .9, nv: 'ballad', how: 'Pompous German aristocrat. Haughty, nasal, clipped German accent, bored by everyone.' },
  rico: { g: 'm', acc: ['en-US'], pitch: 1, rate: 1.1, nv: 'verse', how: 'Smooth Puerto Rican showman. Playful, charming, energetic, a light Latino accent.' },
  mel: { g: 'f', acc: ['en-US', 'en-AU'], pitch: .85, rate: 1, nv: 'coral', how: 'Gruff, motherly diner owner in her sixties. Midwestern, no-nonsense, calls people hon.' },
  raj: { g: 'm', acc: ['en-IN', 'en-GB'], pitch: 1, rate: 1, nv: 'echo', how: 'Deadpan philosophy student working a night shift. Dry wit, British-Indian accent.' },
  philippe: { g: 'm', acc: ['fr', 'en-GB'], pitch: 1.05, rate: .95, nv: 'fable', how: 'Snobbish French maître d\'. Exaggerated French accent, disdainful, theatrical.' },
  skip: { g: 'm', acc: ['en-US', 'en-AU'], pitch: .9, rate: 1, nv: 'ash', how: 'Easygoing Cajun bartender. Laid back, slow, full of river stories.' },
  vivienne: { g: 'f', acc: ['en-GB', 'en-US'], pitch: 1.1, rate: 1, nv: 'shimmer', how: 'Glamorous, sharp-tongued bartender. Smoky, knowing, quick.' },
  ash: { g: 'm', acc: ['en-GB'], pitch: .7, rate: .85, nv: 'onyx', how: 'Silver-haired, utterly discreet British bartender. Hushed, formal, few words.' },
  darlene: { g: 'f', acc: ['en-US', 'en-AU'], pitch: .8, rate: .95, nv: 'sage', how: 'Chain-smoking Southern motel manager. Raspy, warm, seen it all.' },
  pemberton: { g: 'm', acc: ['en-GB'], pitch: .9, rate: .9, nv: 'fable', how: 'Fastidious English concierge. Received pronunciation, impeccably polite.' },
  rosa: { g: 'f', acc: ['en-US', 'it'], pitch: 1.05, rate: 1.15, nv: 'nova', how: 'Fast-talking, warm Italian-American shop owner. Enthusiastic, a salesperson to the bone.' },
};
const FEMALE_NAMES = ['Marge Pettibone', 'Dot Kowalski', 'Priya Shah', 'Rhonda Biggs', 'Fanny Mae Dupree', 'Agnes Pruitt', 'Madame Zora', 'Barbara Glass', 'The Countess', 'Lady Ashcombe', 'Shotgun Sheila', 'Lady Bullseye',
  'Bonnie', 'Lupe', 'Delia', 'Junebug', 'Mae', 'Odette', 'Celeste', 'Ines', 'Yvette', 'Anouk', 'Ivory', 'Lark', 'Wren', 'Mirelle', 'Grandma Rose', 'Jenny Jacks', 'Nadia'];
const NATURAL = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];
const NAT_F = ['coral', 'nova', 'sage', 'shimmer'], NAT_M = ['ash', 'echo', 'onyx', 'verse', 'fable', 'ballad'];
// voices that would wreck the mood, and how to guess a device voice's gender from its name
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|junior|kathy|ralph|princess|fred|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;
const F_NAMES = /female|woman|samantha|victoria|karen|moira|tessa|fiona|serena|zira|hazel|susan|allison|ava|kate|veena|isha|sangeeta|catherine|joanna|salli|kimberly|libby|sonia|jenny|aria|emma|amy|olivia|natasha|amelie|amélie|aurelie|aurélie|marie|martha|nicky|zoe|joelle|noelle|stephanie|kendra|ivy|ruth|nora|michelle|ana|clara|alice|amelia|matilda|siri female/i;
const M_NAMES = /\bmale\b|daniel|alex\b|arthur|rishi|aaron|gordon|tom\b|david|mark|george|james|oliver|thomas|ryan|guy|brian|matthew|joey|justin|liam|william|eric|christopher|evan|nathan|lee\b|malcolm|ralph|thomas|jacques|reed|siri male/i;
const QUALITY = /premium|enhanced|neural|natural|siri|google|online/i;

const Voice = {
  prefs() { try { return Object.assign({ speak: false, handsFree: false, story: true, engine: 'device', cast: {} }, JSON.parse(localStorage.getItem(VOICE_KEY) || '{}')); } catch (e) { return { speak: false, handsFree: false, story: true, engine: 'device', cast: {} }; } },
  save(p) { try { localStorage.setItem(VOICE_KEY, JSON.stringify(p)); } catch (e) { } },
  ttsKey() { try { return localStorage.getItem(TTS_KEY) || ''; } catch (e) { return ''; } },
  setTtsKey(k) { try { k ? localStorage.setItem(TTS_KEY, k.trim()) : localStorage.removeItem(TTS_KEY); } catch (e) { } },
  canSpeak: () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined',
  canListen: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  natural() { const p = this.prefs(); return p.engine === 'openai' && !!this.ttsKey(); },

  /* ---------- who sounds like what ---------- */
  key(sp) { const id = String((sp && sp.id) || ''); return id.replace(/^staff:/, '') || (sp && sp.name) || 'narrator'; },
  role(sp) {
    const k = this.key(sp); if (CAST[k]) return { k, ...CAST[k] };
    const name = (sp.name || '').replace(/^.*"(.+)".*$/, '$1');
    const f = FEMALE_NAMES.some(n => sp.name === n || name === n);
    const h = [...k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const dealer = k.startsWith('dealer:');
    return { k, g: f ? 'f' : 'm', acc: [['en-US', 'en-GB', 'en-AU', 'en-US', 'en-IE'][h % 5], 'en-US', 'en-GB'], pitch: .88 + (h % 25) / 100, rate: .93 + (h % 15) / 100,
      nv: (f ? NAT_F : NAT_M)[h % (f ? NAT_F.length : NAT_M.length)], how: dealer ? 'Professional casino dealer. Friendly, crisp, a little showbiz.' : 'A local in a small casino town. Natural, conversational, full of character.' };
  },
  voices() {
    if (!this.canSpeak()) return [];
    return speechSynthesis.getVoices().filter(v => /^(en|fr|de|it)/i.test(v.lang) && !NOVELTY.test(v.name));
  },
  gender(v) { return F_NAMES.test(v.name) && !/\bmale\b/i.test(v.name.replace(/female/i, '')) ? 'f' : M_NAMES.test(v.name) ? 'm' : 'u'; },
  // give every main character a different installed voice that fits them, best voices first
  castDevice() {
    const vs = this.voices(), sig = vs.map(v => v.name).join('|');
    if (this._sig === sig && this._cast) return this._cast;
    const used = new Map(), out = {};
    const rank = (r, v) => {
      const ai = r.acc.findIndex(a => v.lang.toLowerCase().startsWith(a.toLowerCase()));
      const g = this.gender(v);
      let s = (ai < 0 ? (/^en-in/i.test(v.lang) && !r.acc.includes('en-IN') ? 60 : /^en/i.test(v.lang) ? 25 : 80) : ai * 8);
      s += g === r.g ? 0 : g === 'u' ? 15 : 90;
      s += QUALITY.test(v.name) ? -6 : 0;
      s += (used.get(v.name) || 0) * 22;
      return s;
    };
    for (const k of Object.keys(CAST)) {
      const r = CAST[k]; let best = null, bs = 1e9;
      for (const v of vs) { const sc = rank(r, v); if (sc < bs) { bs = sc; best = v; } }
      if (best) { out[k] = best; used.set(best.name, (used.get(best.name) || 0) + 1); }
    }
    this._sig = sig; this._cast = out; this._rank = rank;
    return out;
  },
  pickDevice(sp) {
    const r = this.role(sp), p = this.prefs(), vs = this.voices();
    const forced = p.cast && p.cast[r.k] && vs.find(v => v.name === p.cast[r.k]);
    if (forced) return { r, voice: forced };
    if (CAST[r.k]) { const c = this.castDevice()[r.k]; if (c) return { r, voice: c }; }
    if (!vs.length) return { r, voice: null };
    this.castDevice();
    const h = [...r.k].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5);
    const sorted = vs.map(v => [this._rank({ ...r }, v), v]).sort((a, b) => a[0] - b[0]).slice(0, 4).map(x => x[1]);
    return { r, voice: sorted[h % sorted.length] };
  },
  // drop stage directions and emoji so the voice reads only what they say
  clean: t => String(t || '').replace(/\*[^*]*\*/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim(),

  /* ---------- speaking ---------- */
  say(sp, text, onEnd) {
    const done = () => { onEnd && onEnd(); onEnd = null; };
    if (!this.prefs().speak) return done();
    const words = this.clean(text); if (!words) return done();
    this.stop();
    const seq = this._seq = (this._seq || 0) + 1;
    if (this.natural()) return this.sayNatural(sp, words, seq, done);
    this.sayDevice(sp, words, done);
  },
  sayDevice(sp, words, done) {
    if (!this.canSpeak()) return done();
    const u = new SpeechSynthesisUtterance(words), { r, voice } = this.pickDevice(sp);
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    else u.lang = r.acc[0].length === 2 ? r.acc[0] + (r.acc[0] === 'fr' ? '-FR' : '') : r.acc[0]; // no voice list: at least pick the accent
    u.pitch = r.pitch; u.rate = r.rate;
    u.onend = u.onerror = () => done();
    speechSynthesis.speak(u);
  },
  audio() {
    if (!this._audio) { this._audio = new Audio(); this._audio.preload = 'auto'; }
    return this._audio;
  },
  async sayNatural(sp, words, seq, done) {
    const r = this.role(sp), p = this.prefs(), voice = (p.ncast && p.ncast[r.k]) || r.nv;
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST', headers: { Authorization: 'Bearer ' + this.ttsKey(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: words.slice(0, 1800), instructions: r.how, response_format: 'mp3' }),
      });
      if (!res.ok) throw { status: res.status };
      const blob = await res.blob();
      if (seq !== this._seq) return; // something newer started talking
      const a = this.audio(), url = URL.createObjectURL(blob);
      a.onended = a.onerror = () => { URL.revokeObjectURL(url); done(); };
      a.src = url; await a.play();
    } catch (e) {
      if (seq !== this._seq) return;
      if (!this._warned) { this._warned = true; UI.toast(e && e.status === 401 ? '🔊 The OpenAI key was rejected; using device voices instead.' : '🔊 Natural voices are unavailable right now; using device voices.', 'warn'); }
      this.sayDevice(sp, words, done);
    }
  },
  stop() {
    this._seq = (this._seq || 0) + 1;
    if (this.canSpeak()) speechSynthesis.cancel();
    if (this._audio) { try { this._audio.pause(); } catch (e) { } }
  },
  // phones only allow sound after a tap: prime the audio player on the first one
  unlock() {
    const a = this.audio();
    const silent = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    try { a.src = silent; const pr = a.play(); pr && pr.catch(() => { }); } catch (e) { }
    if (this.canSpeak()) { try { speechSynthesis.getVoices(); } catch (e) { } }
  },

  /* ---------- listening ---------- */
  // resolves with what you said ('' if nothing); onPartial shows words as they're recognised
  listen(onPartial) {
    return new Promise((resolve, reject) => {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) return reject({ code: 'unsupported' });
      this.stop();
      const rec = new R(); this._rec = rec;
      rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      let final = '', partial = '';
      rec.onresult = e => {
        partial = '';
        for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) final += r[0].transcript; else partial += r[0].transcript; }
        onPartial && onPartial((final + ' ' + partial).trim());
      };
      rec.onerror = e => { this._rec = null; if (e.error === 'no-speech' || e.error === 'aborted') resolve(''); else reject({ code: e.error }); };
      rec.onend = () => { this._rec = null; resolve((final || partial).trim()); };
      try { rec.start(); } catch (e) { reject({ code: 'start' }); }
    });
  },
  stopListening() { if (this._rec) try { this._rec.stop(); } catch (e) { } },
  errorText(e) {
    const c = e && e.code;
    if (c === 'unsupported') return 'This browser can\'t do speech recognition. Try Chrome, Edge or Safari.';
    if (c === 'not-allowed' || c === 'service-not-allowed') return 'Microphone access is blocked. Allow it in your browser\'s site settings (inside claude.ai, the installed app works better for voice).';
    if (c === 'network') return 'Speech recognition needs an internet connection.';
    if (c === 'audio-capture') return 'No microphone found.';
    return 'Didn\'t catch that. Try again.';
  },

  /* ---------- settings (shown in ☰ → AI chat) ---------- */
  settingsRows() {
    const p = this.prefs();
    const row = (key, label, sub, ok) => h('label.vrow', h('input', { type: 'checkbox', checked: !!p[key], disabled: !ok, onchange: e => { p[key] = e.target.checked; this.save(p); if (key === 'speak' && e.target.checked) this.say({ id: 'dolores', name: 'Dolores' }, 'Well hey there, sugar. Now you can hear me.'); } }),
      h('span', h('b', label), h('small.muted', ok ? sub : 'Not supported in this browser')));
    const tts = h('input.field#tts-key', { type: 'password', placeholder: 'sk-…', value: this.ttsKey(), autocomplete: 'off' });
    const eng = h('select.field.sm#tts-engine', { onchange: e => { p.engine = e.target.value; this.save(p); } },
      h('option', { value: 'device', selected: p.engine !== 'openai' ? true : null }, 'Device voices (free)'),
      h('option', { value: 'openai', selected: p.engine === 'openai' ? true : null }, 'Natural voices (OpenAI key)'));
    return h('div.vrows', h('h4', '🎙️ Voice'),
      row('speak', 'Read replies aloud', 'Each character has their own voice and accent.', this.canSpeak() || !!this.ttsKey()),
      row('story', 'Read story scenes aloud too', 'Dolores, Sal, Kessler and the narrator voice their lines in cutscenes.', this.canSpeak() || !!this.ttsKey()),
      row('handsFree', 'Hands-free conversation', 'After they finish talking, the mic opens again so you can just keep chatting.', this.canListen()),
      h('label.lbl', { for: 'tts-engine' }, 'Voices'), eng,
      h('details.tts-more', h('summary', 'Natural voices: how to set up'),
        h('p.small', 'Natural voices sound like real actors: Kessler gets a cold British purr, Mick a Dublin accent, Margot a French one. They use OpenAI\'s text-to-speech with your own key, at roughly a cent per few replies.'),
        h('ol.steps', h('li', 'Go to ', h('a', { href: 'https://platform.openai.com/api-keys', target: '_blank', rel: 'noopener' }, 'platform.openai.com/api-keys'), ', add a little credit under Billing, and create a key.'),
          h('li', 'Paste it below, pick "Natural voices" above, and press Test.')),
        h('label.lbl', { for: 'tts-key' }, 'OpenAI API key'), tts,
        h('p.muted.small', 'Stored in this browser only, never in saves or exports. When natural voices are on, the words characters say are sent to OpenAI to be spoken.'),
        h('div.ev-row', h('button.btn.sm', { type: 'button', onclick: () => { this.setTtsKey(tts.value); UI.toast(tts.value ? 'Voice key saved' : 'Voice key removed', 'good'); } }, 'Save key'),
          h('button.btn.sm', { type: 'button', onclick: () => { this.setTtsKey(tts.value); const q = this.prefs(); q.speak = true; q.engine = 'openai'; this.save(q); eng.value = 'openai'; this._warned = false; this.say({ id: 'kessler', name: 'Kessler' }, 'Good evening. I do so enjoy a new voice at my table.'); } }, 'Test'))),
      h('button.btn.sm', { type: 'button', onclick: () => this.castEditor() }, '🎭 Voice cast: hear and choose each voice'),
      h('p.muted.small', this.canListen() ? 'Tap 🎤 in any chat to speak instead of typing.' : 'Voice input isn\'t available in this browser; you can still hear replies.'));
  },
  // pick and audition each character's voice
  castEditor() {
    const p = this.prefs(); p.cast = p.cast || {}; p.ncast = p.ncast || {};
    const nat = this.natural(), vs = this.voices(), cast = this.castDevice();
    const who = Object.keys(CAST);
    const list = h('div.cast-list');
    for (const k of who) {
      const ch = CHARACTERS[k] || (typeof STAFF !== 'undefined' && STAFF[k]) || { name: k === 'narrator' ? 'Narrator' : k };
      const sel = nat
        ? h('select.field.sm', { onchange: e => { e.target.value ? p.ncast[k] = e.target.value : delete p.ncast[k]; this.save(p); } },
          h('option', { value: '' }, `Auto (${CAST[k].nv})`), NATURAL.map(n => h('option', { value: n, selected: p.ncast[k] === n ? true : null }, n)))
        : h('select.field.sm', { disabled: !vs.length, onchange: e => { e.target.value ? p.cast[k] = e.target.value : delete p.cast[k]; this.save(p); } },
          h('option', { value: '' }, `Auto${cast[k] ? ` (${cast[k].name})` : ''}`), vs.map(v => h('option', { value: v.name, selected: p.cast[k] === v.name ? true : null }, `${v.name} · ${v.lang}`)));
      list.append(h('div.cast-row', h('span.cast-pt', Portrait.el(k === 'narrator' ? 'narrator' : k)), h('b', (ch.name || k).split(',')[0]), sel,
        h('button.btn.sm.ghost', { type: 'button', 'aria-label': 'Test voice', onclick: () => { const q = this.prefs(); if (!q.speak) { q.speak = true; this.save(q); } this.say({ id: k, name: ch.name }, RNG.pick(['Evening. You look like you\'re feeling lucky.', 'Seventeen. It\'s always seventeen.', 'Pull up a chair and tell me everything.'])); } }, '▶')));
    }
    const note = nat ? 'Natural voices: each character also gets acting directions for accent and mood.'
      : vs.length ? `This device offers ${vs.length} usable voices. For better ones on iPhone: Settings → Accessibility → Spoken Content → Voices → English, and download a few "Enhanced" or "Premium" voices in different accents (UK, Ireland, Australia, US). Then reopen the game.`
        : 'This browser isn\'t listing its voices (common in iPhone home-screen apps), so characters are told apart by accent only. For distinct voices, try natural voices, or play in Safari after downloading Enhanced voices in Settings → Accessibility → Spoken Content → Voices.';
    UI.modal({ title: '🎭 Voice cast', body: h('div', h('p.muted.small', note), list), wide: true });
  },
};
if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { Voice._cast = null; speechSynthesis.getVoices(); }; } catch (e) { } }
// phones only allow sound after a tap: prime the player once
document.addEventListener('pointerdown', function first() { Voice.unlock(); document.removeEventListener('pointerdown', first, true); }, true);
