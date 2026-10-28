/* The Barman, up close. What the bottle sends after you in Level 2 isn't a man in an apron: it's the
   shape your craving takes when it has been screaming long enough. A starved, hunched thing taller
   than a door, with a barman's apron rotted to strips, arms that reach the floor, too many eyes and
   a jaw that opens further than a jaw should. It twitches, it lurches, it breathes.
   Everything it sounds like is made here with Web Audio (no files): a low drone that swells as it
   closes in, wet ragged breathing, scraping whispers, and a scream when it gets you. When it does
   get you there is a jump scare (its face, right in yours, a flash and that scream) before the words. */
const L2Demon = (() => {
  /* ---------- the body ---------- */
  function make() {
    const T = THREE, g = new T.Group(), parts = {};
    const skin = new T.MeshStandardMaterial({ color: '#0d0b0b', roughness: .5, metalness: .25, emissive: '#0a0101', emissiveIntensity: .5 });
    const bone = new T.MeshStandardMaterial({ color: '#8d8270', roughness: .5, emissive: '#160c08', emissiveIntensity: .5 });
    const rag = new T.MeshStandardMaterial({ color: '#4c443c', roughness: .95, side: T.DoubleSide, emissive: '#120808', emissiveIntensity: .4 });
    const glow = new T.MeshBasicMaterial({ color: '#ff2a1a', toneMapped: false }), gum = new T.MeshBasicMaterial({ color: '#3a0606' });
    const mesh = (geo, m, x = 0, y = 0, z = 0, p = g) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); p.add(o); return o; };
    const grp = (x, y, z, p) => { const o = new T.Group(); o.position.set(x, y, z); p.add(o); return o; };
    const limb = (r, len, m = skin) => new T.CapsuleGeometry(r, len, 3, 8);

    // legs bend the wrong way, like a dog's, and end in long toes
    parts.legs = [-1, 1].map(sx => {
      const hip = grp(sx * .13, 1.12, 0, g); hip.rotation.x = -.45;
      mesh(limb(.07, .48), skin, 0, -.28, 0, hip);
      const knee = grp(0, -.56, 0, hip); knee.rotation.x = 1.15;
      mesh(limb(.05, .5), skin, 0, -.27, 0, knee);
      const ankle = grp(0, -.56, 0, knee); ankle.rotation.x = -.7;
      for (const tx of [-.04, 0, .04]) { const toe = mesh(new T.ConeGeometry(.018, .2, 5), bone, tx, -.03, .09, ankle); toe.rotation.x = Math.PI / 2 + .2; }
      return { hip, knee, sx };
    });
    // the body hangs forward from the hips
    const body = parts.body = grp(0, 1.12, 0, g); body.rotation.x = .42;
    mesh(new T.SphereGeometry(.15, 12, 10), skin, 0, .02, 0, body).scale.set(1.2, .7, .9); // pelvis
    mesh(limb(.06, .7), skin, 0, .42, -.05, body); // spine
    for (let i = 0; i < 6; i++) { // ribs you can count
      const r = .19 - Math.abs(i - 2) * .018, rib = mesh(new T.TorusGeometry(r, .014, 5, 18, Math.PI * 1.25), bone, 0, .28 + i * .085, -.03, body);
      rib.rotation.set(Math.PI / 2 + .25, 0, -Math.PI * .125 + Math.PI / 2); rib.scale.set(1, .78, 1);
    }
    mesh(new T.CylinderGeometry(.11, .17, .55, 10, 1, true), skin, 0, .5, -.06, body).scale.z = .7; // skin stretched over the back of the ribs
    const shoulders = grp(0, .84, -.02, body);
    for (const sx of [-1, 1]) { const hump = mesh(new T.SphereGeometry(.12, 12, 10), skin, sx * .17, .07, -.04, shoulders); hump.scale.set(1, 1.25, .9); const bar = mesh(limb(.055, .14), skin, sx * .2, .02, 0, shoulders); bar.rotation.z = Math.PI / 2 - sx * .5; }
    mesh(new T.SphereGeometry(.14, 12, 10), skin, 0, .1, -.08, shoulders).scale.set(1.3, .9, 1); // the hump of its back
    // the apron, rotted to strips, still tied at the waist
    parts.rags = [];
    for (let i = 0; i < 5; i++) { const s = mesh(new T.PlaneGeometry(.075, .55 + (i % 2) * .22), rag, -.15 + i * .075, -.32 - (i % 2) * .1, .14, body); s.rotation.x = -.42; parts.rags.push(s); }
    mesh(new T.TorusGeometry(.16, .012, 4, 16), rag, 0, .04, 0, body).rotation.x = Math.PI / 2;
    // arms long enough to drag, hands with fingers like a fistful of nails
    parts.arms = [-1, 1].map(sx => {
      const sh = grp(sx * .27, .02, 0, shoulders); sh.rotation.set(-.2, 0, sx * .12);
      mesh(limb(.045, .62), skin, 0, -.36, 0, sh);
      const el = grp(0, -.72, 0, sh); el.rotation.x = -.25;
      mesh(limb(.036, .66), skin, 0, -.37, 0, el);
      const hand = grp(0, -.76, 0, el);
      mesh(new T.BoxGeometry(.09, .1, .04), skin, 0, -.02, 0, hand);
      for (let f = 0; f < 5; f++) { const fi = mesh(new T.ConeGeometry(.012, .3, 5), bone, -.045 + f * .022, -.2, .02, hand); fi.rotation.x = .25 + Math.random() * .2; fi.rotation.z = (f - 2) * .06; }
      return { sh, el, sx };
    });
    // a neck that juts forward, and the head
    const neck = grp(0, .88, .06, body); neck.rotation.x = 1.0;
    mesh(limb(.045, .3), skin, 0, .18, 0, neck);
    const head = parts.head = grp(0, .4, .02, neck); head.rotation.x = -1.3;
    const skull = mesh(new T.SphereGeometry(.16, 18, 14), skin, 0, .02, 0, head); skull.scale.set(.82, 1.28, 1.08);
    mesh(new T.BoxGeometry(.25, .035, .08), skin, 0, .09, .11, head).rotation.x = -.3; // brow ridge
    for (const [ex, ey, r] of [[-.055, .055, .015], [.055, .055, .015], [-.032, .128, .008], [.038, .138, .007]]) { // two eyes, and two more that shouldn't be there
      mesh(new T.SphereGeometry(r * 2.4, 8, 6), new T.MeshBasicMaterial({ color: '#050000' }), ex, ey, .13, head).scale.z = .45; // deep sockets
      mesh(new T.SphereGeometry(r, 8, 6), glow, ex, ey, .147, head);
    }
    const upper = grp(0, -.04, .1, head); // the upper teeth
    for (let i = 0; i < 11; i++) { const a = (i - 5) / 5, t = mesh(new T.ConeGeometry(.011, .06 + (1 - Math.abs(a)) * .06, 4), bone, a * .085, -.04, Math.cos(a) * .045 - .02, upper); t.rotation.x = Math.PI; }
    mesh(new T.SphereGeometry(.09, 12, 10), new T.MeshBasicMaterial({ color: '#070000' }), 0, -.08, .06, head).scale.set(.95, .9, .55); // the maw
    const jaw = parts.jaw = grp(0, -.06, -.04, head);
    mesh(new T.SphereGeometry(.12, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin, 0, -.02, .06, jaw).scale.set(.85, 1.3, 1.15);
    mesh(new T.CircleGeometry(.09, 14), gum, 0, -.02, .07, jaw).rotation.x = -Math.PI / 2;
    for (let i = 0; i < 9; i++) { const a = (i - 4) / 4; mesh(new T.ConeGeometry(.012, .08, 4), bone, a * .08, .02, .14 + Math.cos(a) * .02 - .02, jaw); }
    // lit from behind, a shape cut out of red light
    const l = new T.PointLight('#ff1a10', 2.6, 8, 2); l.position.set(0, 1.7, -1); g.add(l);
    const eyeL = parts.eyeLight = new T.PointLight('#ff2a1a', .9, 2.2, 2); eyeL.position.set(0, 0, .35); head.add(eyeL);
    const halo = new T.Mesh(new T.PlaneGeometry(1.8, 3), new T.MeshBasicMaterial({ map: R3.api.canvasTex('demonhalo', 64, 128, (c, w, hh) => { const gr = c.createRadialGradient(w / 2, hh * .45, 2, w / 2, hh * .45, w * .9); gr.addColorStop(0, 'rgba(255,30,20,.4)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, hh); }), transparent: true, depthWrite: false, toneMapped: false }));
    halo.position.set(0, 1.4, -.45); g.add(halo);
    g.scale.setScalar(1.22);
    let twitchAt = 0, tw = { x: 0, y: 0, z: 0 }, phase = 0;
    // walk, twitch, breathe; reach for you when you're close
    g.userData.animate = (t, dt, dist = 9, speed = 2) => {
      phase += dt * (2.2 + speed * 1.4);
      const s = Math.sin(phase), reach = Math.max(0, Math.min(1, (4.5 - dist) / 3));
      for (const L of parts.legs) { L.hip.rotation.x = -.45 + s * .45 * L.sx; L.knee.rotation.x = 1.15 + Math.max(0, -s * L.sx) * .6; }
      body.position.y = 1.12 + Math.abs(Math.cos(phase)) * .05; body.rotation.z = Math.sin(phase * .5) * .06;
      for (const A of parts.arms) { A.sh.rotation.x = -.2 - reach * 1.35 + Math.sin(phase + A.sx) * .25 * (1 - reach); A.el.rotation.x = -.25 - reach * .25 + Math.sin(t * 9 + A.sx) * .05 * reach; }
      if (t > twitchAt) { twitchAt = t + .25 + Math.random() * 1.2; tw = { x: (Math.random() - .5) * .5, y: (Math.random() - .5) * .9, z: (Math.random() - .5) * .9 }; }
      head.rotation.set(-1.3 + tw.x, tw.y, tw.z);
      jaw.rotation.x = .25 + (Math.sin(t * 1.7) * .5 + .5) * .45 + reach * .55 + Math.sin(t * 31) * .03;
      parts.rags.forEach((r, i) => { r.rotation.z = Math.sin(t * 6 + i * 1.7) * .25; });
      eyeL.intensity = .7 + Math.random() * .5;
    };
    parts.root = g; g.userData.parts = parts;
    R3.api.add(g); return g;
  }

  /* ---------- the sound of it ---------- */
  let ax = null, bus = null, drone = null, breathT = 0, whisperT = 0, near = 0;
  const on = () => App.state && App.state.settings.sound !== false;
  function ctx() {
    if (!ax) { ax = new (window.AudioContext || window.webkitAudioContext)(); bus = ax.createGain(); bus.gain.value = .9; bus.connect(ax.destination); }
    if (ax.state === 'suspended') ax.resume();
    return ax;
  }
  function noiseBuf(sec = 2) {
    const a = ctx(), b = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  const curve = k => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; };
  // a low, sour drone: detuned saws through a lowpass that opens as it closes in
  function startDrone() {
    if (!on() || drone) return;
    try {
      const a = ctx(), out = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.Q.value = 6;
      out.gain.value = 0; out.connect(bus); lp.connect(out);
      const oscs = [41, 43.6, 58.3, 82.4].map(f => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .23; lg.gain.value = 60; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      out.gain.linearRampToValueAtTime(.12, a.currentTime + 2);
      drone = { out, lp, oscs: [...oscs, lfo] };
    } catch (e) { drone = null; }
  }
  function stopDrone() {
    if (!drone) return; const d = drone; drone = null;
    try { const t = ax.currentTime; d.out.gain.cancelScheduledValues(t); d.out.gain.setValueAtTime(d.out.gain.value, t); d.out.gain.linearRampToValueAtTime(0, t + 1.2); d.oscs.forEach(o => o.stop(t + 1.3)); } catch (e) { }
  }
  // one ragged breath, in or out: filtered noise with a shaky envelope
  function breath(v, inhale) {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), len = inhale ? .9 : 1.3;
      src.buffer = noiseBuf(2); bp.type = 'bandpass'; bp.frequency.setValueAtTime(inhale ? 900 : 520, t); bp.frequency.linearRampToValueAtTime(inhale ? 1500 : 300, t + len); bp.Q.value = 2.5;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5 * v, t + len * .35);
      for (let k = 1; k < 6; k++) g.gain.setValueAtTime(.5 * v * (.55 + Math.random() * .45), t + len * (.35 + k * .1)); // the rattle in it
      g.gain.exponentialRampToValueAtTime(.0001, t + len);
      src.connect(bp); bp.connect(g); g.connect(bus); src.start(t); src.stop(t + len + .05);
      if (!inhale) { const o = a.createOscillator(), og = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(52, t + len); og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.09 * v, t + .3); og.gain.exponentialRampToValueAtTime(.0001, t + len); o.connect(og); og.connect(bus); o.start(t); o.stop(t + len); } // a growl under the out-breath
    } catch (e) { }
  }
  // a scrape, or a whisper you almost understand
  function whisper(v) {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, src = a.createBufferSource(), hp = a.createBiquadFilter(), g = a.createGain(), pan = a.createStereoPanner ? a.createStereoPanner() : null;
      src.buffer = noiseBuf(2); hp.type = 'bandpass'; hp.Q.value = 9; hp.frequency.setValueAtTime(2400 + Math.random() * 1800, t);
      for (let k = 0; k < 6; k++) hp.frequency.setValueAtTime(1600 + Math.random() * 3200, t + k * .12);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35 * v, t + .1); g.gain.exponentialRampToValueAtTime(.0001, t + .8);
      src.connect(hp); hp.connect(g);
      if (pan) { pan.pan.value = Math.random() * 2 - 1; g.connect(pan); pan.connect(bus); } else g.connect(bus);
      src.start(t); src.stop(t + .85);
    } catch (e) { }
  }
  // the scream: a cluster of detuned saws bending up and down, run through distortion, with a crack of noise
  function scream() {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, sh = a.createWaveShaper(), g = a.createGain(); sh.curve = curve(40); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .04); g.gain.setValueAtTime(.55, t + .9); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
      sh.connect(g); g.connect(bus);
      for (const [f, d] of [[340, 0], [361, 3], [452, -4], [610, 7], [173, 0]]) {
        const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .6, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + .18); o.frequency.exponentialRampToValueAtTime(f * .9 + d, t + 1.5);
        const v = a.createOscillator(), vg = a.createGain(); v.frequency.value = 11 + Math.random() * 6; vg.gain.value = f * .05; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t + 1.6);
        o.connect(sh); o.start(t); o.stop(t + 1.6);
      }
      const n = a.createBufferSource(), ng = a.createGain(); n.buffer = noiseBuf(1); ng.gain.setValueAtTime(.8, t); ng.gain.exponentialRampToValueAtTime(.0001, t + .5); n.connect(ng); ng.connect(bus); n.start(t); n.stop(t + .5);
    } catch (e) { }
  }
  // a stinger for the first glimpse: a dissonant cluster that swells and is cut off
  function sting() {
    if (!on()) return;
    try {
      const a = ctx(), t = a.currentTime, g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .9); g.gain.setValueAtTime(.0001, t + 1.05); g.connect(bus);
      for (const f of [196, 207.7, 277.2, 293.7, 415.3]) { const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 1.1); }
    } catch (e) { }
  }
  // called every frame of a hunt with how close it is (0 far, 1 on you)
  function tick(dt, v) {
    near = v; startDrone();
    if (drone) { try { const t = ax.currentTime; drone.out.gain.setTargetAtTime(.06 + v * .22, t, .3); drone.lp.frequency.setTargetAtTime(150 + v * 900, t, .3); } catch (e) { } }
    breathT -= dt; if (breathT <= 0) { breathT = 2.6 - v * 1.4; breath(.25 + v * .75, true); setTimeout(() => near > 0 && breath(.25 + near * .75, false), 950); }
    whisperT -= dt; if (whisperT <= 0) { whisperT = 1.6 + Math.random() * 3; whisper(.3 + v * .5); }
  }
  function quiet() { near = 0; stopDrone(); }

  /* ---------- when it gets you ---------- */
  // its face right in yours, a flash, the scream, the screen shaking, then black. Then the words.
  async function scare() {
    const P = R3.player, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    R3.freeze(true); quiet();
    const g = make(), fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    g.scale.setScalar(1.05); g.position.set(P.x + fx * 1.05, -.56, P.z + fz * 1.05); g.rotation.y = Math.atan2(-fx, -fz);
    const parts = g.userData.parts; P.pitch = 0;
    parts.body.rotation.x = .05; parts.head.rotation.set(-1.05, 0, 0); // face to face
    for (const A of parts.arms) { A.sh.rotation.set(-1.25, 0, A.sx * .75); A.el.rotation.x = -.5; } // reaching round you
    const flash = h('div.l2-scare'); document.body.append(flash);
    scream(); if (navigator.vibrate) try { navigator.vibrate([90, 40, 220]); } catch (e) { }
    R3.setFx({ shake: reduce ? 0 : .05, sway: 0, slow: 1 });
    let t0 = performance.now();
    const anim = () => { const k = (performance.now() - t0) / 1000; parts.jaw.rotation.x = Math.min(1.45, .2 + k * 4); parts.head.rotation.z = Math.sin(k * 40) * .06; if (k < 1.3) requestAnimationFrame(anim); };
    anim();
    await new Promise(r => setTimeout(r, 1150));
    flash.classList.add('black');
    await new Promise(r => setTimeout(r, 700));
    if (g.parent) g.parent.remove(g);
    R3.setFx(null);
    flash.classList.add('out'); setTimeout(() => flash.remove(), 600);
    R3.freeze(false);
  }

  return { make, tick, quiet, scream, sting, scare };
})();
