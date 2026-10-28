/* Nora's last photograph. Every fragment you found in the dream (Level 1) has a torn square of it
   taped to the back: sixteen pieces of the picture, and one of its back. In the box in your car you
   put them together, tap a piece to pick it up (tap it again to turn it), then tap where it goes.
   The picture is what Nora saw through the front window at 9:38 that night, and the two pieces
   in the middle of the bottom half carry the car's number plate. You need that plate for the
   hidden story about Eddie Marsh, so if those two are missing, the notebook tells you where in the
   dream they are, and you can sleep and go and find them. */
const L2Photo = (() => {
  const N = 4, SIZE = 480, T = SIZE / N;
  // which fragment carries which square (left to right, top to bottom); the plate is on squares 9 and 10
  const FRAG_AT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 13, 10, 11, 12, 9, 14, 15], BACK = 16, PLATE = [9, 10];
  const PLACES = { town: 'out on the streets of the town', 'v:spur': 'the Rusty Spur', 'v:riverboat': 'Lucky Lou\'s Riverboat', 'v:palace': 'the Gilded Palace', 'v:salon': 'the Monte Royale\'s Salon', 'r:diner': 'Mel\'s Diner', 'r:motel': 'the Starlite Motel', 'r:pawn': 'Vinnie\'s Pawn & Loan', 'r:shop': 'Lucky Strike Outfitters', 'r:grand': 'the Grand Hotel', 'r:apts': 'the Downtown Apartments', 'r:store': 'the Quik-Stop' };
  const st = () => { const s = L2.state; if (!s.photo) s.photo = { placed: {}, rot: {} }; return s.photo; };
  const have = i => typeof Fragments !== 'undefined' && Fragments.has(i);
  const where = i => PLACES[FRAGMENTS[i].map] || 'somewhere in the town';
  const plateDone = () => PLATE.every(p => st().placed[p]);

  // the picture itself, painted once: a rainy street through a window at night
  let url = null;
  function picture() {
    if (url) return url;
    const c = document.createElement('canvas'); c.width = c.height = SIZE; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, SIZE); sky.addColorStop(0, '#0b0f1a'); sky.addColorStop(.55, '#1a1c26'); sky.addColorStop(1, '#0e0e12'); g.fillStyle = sky; g.fillRect(0, 0, SIZE, SIZE);
    // houses across the road, a lit window, the bus shelter
    g.fillStyle = '#14161e'; g.fillRect(0, 120, 200, 130); g.fillRect(300, 100, 180, 150); g.fillStyle = '#d9a94e'; g.fillRect(360, 150, 34, 40); g.fillStyle = '#1d2230'; g.fillRect(40, 190, 90, 60);
    g.strokeStyle = '#4a5a6e'; g.lineWidth = 3; g.strokeRect(40, 190, 90, 60); g.fillStyle = 'rgba(160,190,220,.15)'; g.fillRect(42, 192, 86, 56);
    g.fillStyle = '#c9d6e8'; g.font = 'bold 11px sans-serif'; g.fillText('CALDER ST', 54, 186);
    g.fillStyle = 'rgba(200,200,210,.55)'; g.beginPath(); g.ellipse(75, 228, 9, 16, 0, 0, 7); g.fill(); // someone sheltering
    // a streetlight and its pool of orange
    g.fillStyle = '#2a2a2a'; g.fillRect(232, 40, 5, 220); const lamp = g.createRadialGradient(236, 48, 2, 236, 48, 140); lamp.addColorStop(0, 'rgba(255,190,110,.9)'); lamp.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = lamp; g.fillRect(90, 0, 300, 200);
    // the road, wet
    const road = g.createLinearGradient(0, 250, 0, SIZE); road.addColorStop(0, '#26262c'); road.addColorStop(1, '#101014'); g.fillStyle = road; g.fillRect(0, 250, SIZE, SIZE - 250);
    g.fillStyle = 'rgba(255,170,90,.18)'; g.fillRect(180, 330, 110, 140);
    // the grey saloon at the kerb
    g.fillStyle = '#5c6068'; g.beginPath(); g.moveTo(120, 300); g.lineTo(150, 248); g.lineTo(330, 248); g.lineTo(368, 300); g.lineTo(380, 340); g.lineTo(108, 340); g.closePath(); g.fill();
    g.fillStyle = '#272b34'; g.beginPath(); g.moveTo(162, 256); g.lineTo(318, 256); g.lineTo(344, 296); g.lineTo(138, 296); g.closePath(); g.fill(); // windscreen
    g.fillStyle = '#e7c53a'; g.fillRect(292, 280, 34, 14); g.fillStyle = '#222'; g.font = 'bold 6px sans-serif'; g.fillText('MERIDIAN', 294, 287); g.fillText('STAFF', 300, 293); // the permit
    g.fillStyle = '#f2eedc'; g.beginPath(); g.ellipse(138, 316, 16, 9, 0, 0, 7); g.ellipse(350, 316, 16, 9, 0, 0, 7); g.fill(); // headlights
    g.fillStyle = '#111'; g.fillRect(118, 338, 50, 22); g.fillRect(320, 338, 50, 22); // tyres
    // the plate, split across two squares: VLH | 917
    g.fillStyle = '#efe9c8'; g.fillRect(168, 304, 144, 30); g.strokeStyle = '#222'; g.lineWidth = 2; g.strokeRect(168, 304, 144, 30);
    g.fillStyle = '#111'; g.font = 'bold 24px "Courier New", monospace'; g.textBaseline = 'middle'; g.fillText('VLH', 182, 320); g.fillText('917', 252, 320);
    // the big man in the dark coat, getting out
    g.fillStyle = '#07070a'; g.beginPath(); g.ellipse(92, 226, 15, 18, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(62, 248); g.lineTo(122, 248); g.lineTo(130, 380); g.lineTo(54, 380); g.closePath(); g.fill();
    // rain, the window frame, a reflection of the room, and the phone's timestamp
    g.strokeStyle = 'rgba(200,210,230,.18)'; g.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = Math.random() * SIZE, y = Math.random() * SIZE; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 14); g.stroke(); }
    g.fillStyle = 'rgba(255,230,200,.06)'; g.fillRect(300, 360, 140, 100);
    g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, SIZE, 10); g.fillRect(0, SIZE - 10, SIZE, 10); g.fillRect(0, 0, 10, SIZE); g.fillRect(SIZE - 10, 0, 10, SIZE); g.fillRect(SIZE / 2 - 4, 0, 8, 150); // the window
    g.fillStyle = '#ffb43a'; g.font = 'bold 16px monospace'; g.textBaseline = 'alphabetic'; g.fillText('17/10  21:38', 344, 460);
    return (url = c.toDataURL());
  }
  const tile = (pos, rot = 0) => h('span.ph-img', { style: `background-image:url(${picture()});background-size:${N * 100}% ${N * 100}%;background-position:${(pos % N) / (N - 1) * 100}% ${Math.floor(pos / N) / (N - 1) * 100}%;transform:rotate(${rot}deg)` });

  function open() {
    const s = st(), owned = FRAG_AT.map((f, pos) => ({ f, pos })).filter(x => have(x.f));
    // pieces start turned at random (but never upright), in a shuffled tray
    owned.forEach(x => { if (s.rot[x.pos] == null) s.rot[x.pos] = [90, 180, 270][Math.floor(Math.random() * 3)]; });
    const order = owned.filter(x => !s.placed[x.pos]).sort(() => Math.random() - .5);
    let sel = null, flipped = false;
    return L2.ui.panel('Nora\'s photograph', done => {
      const board = h('div.ph-board'), tray = h('div.ph-tray'), read = h('p.l2-read'), wrap = h('div.ph');
      const say = t => { read.textContent = t; };
      const paintBoard = () => {
        board.innerHTML = ''; board.classList.toggle('back', flipped);
        if (flipped) { board.append(h('div.ph-backside', h('p', 'This guy again?'), h('p', '9:38'), h('p.sig', '— N x'))); return; }
        for (let pos = 0; pos < N * N; pos++) {
          const f = FRAG_AT[pos], got = have(f);
          board.append(s.placed[pos] ? h('div.ph-slot.done', tile(pos)) : h('button.ph-slot' + (got ? '' : '.gone'), { 'aria-label': `Square ${pos + 1}`, title: got ? '' : 'Missing: still in the dream', onclick: () => place(pos) }, got ? '' : '?'));
        }
      };
      const paintTray = () => {
        tray.innerHTML = '';
        order.filter(x => !s.placed[x.pos]).forEach(x => tray.append(h('button.ph-piece' + (sel === x.pos ? '.sel' : ''), { 'aria-label': `A torn piece, turned ${s.rot[x.pos]} degrees`, onclick: () => pick(x.pos) }, tile(x.pos, s.rot[x.pos]))));
        if (!tray.children.length) tray.append(h('p.l2-hint', owned.length < 16 ? `That's every piece you have. ${16 - owned.length} ${16 - owned.length === 1 ? 'is' : 'are'} still in the dream.` : 'Every piece is in place.'));
      };
      const pick = pos => {
        if (sel === pos) { s.rot[pos] = (s.rot[pos] + 90) % 360; say('You turn it round in your fingers.'); }
        else { sel = pos; say('Tap it again to turn it. Then tap the square where it goes.'); }
        paintTray(); App.save();
      };
      const place = pos => {
        if (sel == null) return say(have(FRAG_AT[pos]) ? 'Pick up a piece first.' : 'That piece is still in the dream.');
        if (sel !== pos) { say('It doesn\'t fit there.'); board.children[pos].classList.add('no'); setTimeout(() => board.children[pos] && board.children[pos].classList.remove('no'), 400); return; }
        if (s.rot[pos] !== 0) return say('Right place, wrong way round. Turn it first.');
        s.placed[pos] = 1; sel = null; SFX.flip(); App.save(); paintBoard(); paintTray(); after();
      };
      const after = () => {
        if (plateDone() && !L2.state.clues.nora) { L2.clue('nora'); say('A grey car at the kerb, a big man getting out, a staff permit on the windscreen. And the plate, clear as day: VLH 917.'); }
        else if (PLATE.some(p => !have(FRAG_AT[p]))) say(`The middle of the bottom half is missing: the part with the car's number plate. You dreamed ${PLATE.filter(p => !have(FRAG_AT[p])).length === 1 ? 'that piece' : 'those pieces'}.`);
        if (Object.keys(s.placed).length === 16 && (!have(BACK) || L2.has('photoBack')) && !L2.has('photoWhole')) { L2.set('photoWhole'); Career.checkAchievements(); }
      };
      const flip = have(BACK) ? h('button.l2-btn.ghost', { onclick: () => { flipped = !flipped; if (flipped) { L2.set('photoBack'); say('Nora\'s writing. She took this, and then she called you.'); after(); } else say(''); paintBoard(); } }, '↻ Turn it over') : null;
      paintBoard(); paintTray();
      say(owned.length ? (Object.keys(s.placed).length ? 'Where you left it.' : `${owned.length} torn pieces, from the backs of the things you dreamed. Tap one to pick it up.`) : 'There are no pieces. They are all still in the dream.');
      if (plateDone()) say('VLH 917. A big man, a grey car, a staff permit. 9:38.');
      wrap.append(board, h('div.ph-side', tray, read, flip));
      return wrap;
    }, { wide: true });
  }

  // for the notebook: how far along the photograph is, and where the plate is if you haven't got it
  function status(closeNotebook) {
    const n = FRAG_AT.filter(have).length, missing = PLATE.filter(p => !have(FRAG_AT[p]));
    if (!L2.has('boxDone') && !n) return null;
    return h('div.l2-clue', h('b', '🧩 Nora\'s photograph'),
      h('p', `${Object.keys(st().placed).length} of 16 pieces in place${n < 16 ? `, ${16 - n} still in the dream` : ''}.${L2.state.clues.nora ? ' The plate reads VLH 917.' : ''}`),
      missing.length ? h('p.l2-mem', `${missing.length === 1 ? 'The piece with half the number plate is' : 'The pieces with the number plate are'} missing. Where you dreamed ${missing.length === 1 ? 'it' : 'them'}: ${missing.map(p => where(FRAG_AT[p])).join(', and ')}. Sleep (☰), find ${missing.length === 1 ? 'it' : 'them'}, and come back.`) : null,
      n ? h('button.l2-btn.ghost', { onclick: () => { if (closeNotebook) closeNotebook(); setTimeout(open, 350); } }, 'Open the photograph') : null);
  }

  return { open, status, picture, FRAG_AT, PLATE };
})();
