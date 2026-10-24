/* Drawn portraits: a little vector bust for everyone in town, built from a "look" (skin, hair,
   hat, glasses, collar...). Story characters and staff have hand-picked looks; everyone else gets
   one from hints in their old emoji and a hash of their name, so the same person always looks the
   same. Your own portrait comes from Looks (the mirror at Lucky Strike Outfitters). */
const Portrait = (() => {
  const SKIN = ['#f6d7bf', '#f0c19a', '#e0ac69', '#c68863', '#a5714a', '#7b4a2c', '#5a3622'];
  const HAIR = ['#111', '#2b1d14', '#5a3a22', '#8a5a2b', '#c8913f', '#e6c56a', '#a0522d', '#999', '#ddd'];
  const SHIRT = ['#2f3e5c', '#6b4f3a', '#2e7d32', '#7a2131', '#34495e', '#8a6a24', '#5b2c6f', '#1f5f8b', '#444'];

  // hand-picked looks; keys are character ids, staff ids or names
  const LOOKS = {
    vinnie: { skin: '#e0ac69', hair: '#111', style: 'slick', shades: true, chain: true, stubble: true, shirt: '#1d1d1d', collar: 'open' },
    dolores: { skin: '#f0c19a', hair: '#6b2e1a', style: 'long', lips: true, earrings: true, shirt: '#f4f4f4', collar: 'vest', vest: '#3a2418' },
    mick: { skin: '#f0c19a', hair: '#ccc', style: 'short', beard: 'stache', age: true, shirt: '#2e7d32', collar: 'open' },
    sparky: { skin: '#e0ac69', hair: '#5a3a22', style: 'curly', hat: 'cap', hatCol: '#d35400', glasses: true, shirt: '#d35400', collar: 'open' },
    doc: { skin: '#e8c4a0', hair: '#e8e8e8', style: 'receding', glasses: true, beard: 'full', age: true, shirt: '#3a5f8a', collar: 'bow' },
    margot: { skin: '#f3d1b5', hair: '#111', style: 'bun', lips: true, earrings: true, pearls: true, shirt: '#8a2be2', collar: 'gown' },
    kessler: { skin: '#f0d0b0', hair: '#bbb', style: 'slick', hat: 'top', age: true, shirt: '#1a1a1a', collar: 'bow' },
    nico: { skin: '#c68863', hair: '#222', style: 'buzz', stubble: true, big: true, shirt: '#555', collar: 'turtle' },
    sal: { skin: '#e8b58f', hair: '#bbb', style: 'short', hat: 'fedora', hatCol: '#4b3b33', beard: 'stache', age: true, shirt: '#6b4a12', collar: 'tie' },
    lou: { skin: '#f0c19a', hair: '#e8e8e8', style: 'short', hat: 'captain', beard: 'full', age: true, shirt: '#1f5f8b', collar: 'open' },
    tex: { skin: '#e0ac69', hair: '#5a3a22', style: 'short', hat: 'cowboy', hatCol: '#8a5a2b', beard: 'stache', shirt: '#9a5b2a', collar: 'bolo' },
    mei: { skin: '#f0c19a', hair: '#111', style: 'bob', shades: true, lips: true, shirt: '#2c7a7b', collar: 'turtle' },
    baron: { skin: '#f0d0b0', hair: '#ccc', style: 'slick', monocle: true, beard: 'curl', age: true, shirt: '#5b2c6f', collar: 'bow' },
    rico: { skin: '#c68863', hair: '#111', style: 'pomp', chain: true, beard: 'goatee', shirt: '#c0392b', collar: 'open' },
    oscar: { skin: '#e0ac69', hair: '#2b1d14', style: 'short', glasses: true, shirt: '#f4f4f4', collar: 'vest', vest: '#111' },
    mel: { skin: '#f0c19a', hair: '#9a9a9a', style: 'bun', age: true, lips: true, shirt: '#b5651d', collar: 'apron' },
    raj: { skin: '#a5714a', hair: '#111', style: 'short', glasses: true, stubble: true, shirt: '#2e86c1', collar: 'open' },
    philippe: { skin: '#f3d1b5', hair: '#2b1d14', style: 'slick', beard: 'thin', shirt: '#111', collar: 'bow' },
    skip: { skin: '#e0ac69', hair: '#6b4a2a', style: 'curly', beard: 'full', shirt: '#1f5f8b', collar: 'open' },
    vivienne: { skin: '#d9a37b', hair: '#e6c56a', style: 'long', lips: true, earrings: true, shirt: '#8a6a24', collar: 'gown' },
    ash: { skin: '#f0d0b0', hair: '#cfcfcf', style: 'slick', age: true, shirt: '#1d1a14', collar: 'bow' },
    darlene: { skin: '#f0c19a', hair: '#d8d8e8', style: 'beehive', lips: true, earrings: true, age: true, shirt: '#7d3c98', collar: 'open' },
    pemberton: { skin: '#f3d1b5', hair: '#777', style: 'receding', beard: 'stache', glasses: true, shirt: '#34495e', collar: 'tie' },
    rosa: { skin: '#e0ac69', hair: '#2b1d14', style: 'long', lips: true, earrings: true, glasses: true, shirt: '#c0392b', collar: 'open' },
  };
  // what the old emoji said about someone, so the drawing keeps their character
  const HINTS = {
    '👵': { style: 'bun', age: true, glasses: true, hair: '#d8d8d8', fem: true }, '👨‍🍳': { hat: 'chef', beard: 'stache', collar: 'apron' },
    '🙍‍♀️': { style: 'long', fem: true }, '🎲': { hat: 'cap' }, '🧓': { style: 'receding', age: true, hair: '#ccc', beard: 'full' },
    '🧳': { hat: 'cap', glasses: true }, '⚓': { hat: 'captain', beard: 'full', age: true, hair: '#ddd' }, '👩‍⚕️': { hat: 'nurse', style: 'pony', fem: true },
    '🤠': { hat: 'cowboy', beard: 'stache' }, '💅': { style: 'beehive', fem: true, earrings: true }, '🧢': { hat: 'cap' },
    '🐻': { style: 'short', beard: 'full', big: true }, '🎖️': { style: 'receding', beard: 'stache', age: true, hair: '#eee', shirt: '#eee', collar: 'tie' },
    '👒': { hat: 'sun', style: 'long', fem: true }, '😎': { shades: true, style: 'slick' }, '📿': { style: 'bun', glasses: true, age: true, fem: true },
    '🛥️': { style: 'pomp', shades: true, collar: 'open' }, '🔮': { hat: 'scarf', style: 'long', earrings: true, fem: true }, '🍸': { style: 'bob', earrings: true, fem: true },
    '🧑‍💼': { style: 'short', glasses: true, collar: 'tie' }, '👑': { hat: 'tiara', pearls: true, age: true, style: 'bun', fem: true, hair: '#ddd' },
    '🕴️': { hat: 'fedora', shades: true, collar: 'tie', shirt: '#555' }, '🥃': { style: 'short', beard: 'full' }, '🦢': { style: 'long', pearls: true, fem: true, hair: '#e6c56a' },
    '🧔': { beard: 'full' }, '💁‍♀️': { style: 'long', fem: true }, '💃': { style: 'bun', fem: true, collar: 'gown' }, '🤵': { style: 'slick', collar: 'bow' },
    '👩‍🦳': { style: 'beehive', fem: true, age: true, hair: '#ddd' }, '👩‍🍳': { hat: 'chef', fem: true, collar: 'apron' }, '🎩': { hat: 'top', collar: 'bow' },
  };

  const hash = s => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const shade = (hex, k) => {
    const n = parseInt(hex.replace('#', '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(c => c.toString(16).padStart(2, '0')).join('');
  };

  // build a full look for anyone, from a hand-picked look, emoji hints or their name
  function lookFor(spec) {
    if (spec.look && spec.look.style) return spec.look;
    const key = spec.key, named = LOOKS[key] || LOOKS[spec.name];
    if (named) return named;
    const r = hash(spec.name || key || '?'), hint = HINTS[spec.face] || {};
    const fem = hint.fem != null ? hint.fem : /(rose|marge|dot|priya|rhonda|fanny|agnes|barbara|zora|countess|lady|grandma|mae|mei|calc)/i.test(spec.name || '');
    const base = {
      skin: SKIN[r % SKIN.length], hair: HAIR[(r >> 3) % (HAIR.length - 2)], shirt: SHIRT[(r >> 7) % SHIRT.length],
      style: fem ? ['long', 'bob', 'bun', 'pony'][(r >> 11) % 4] : ['short', 'slick', 'curly', 'buzz', 'receding'][(r >> 11) % 5],
      collar: ['open', 'tie', 'turtle'][(r >> 14) % 3], lips: fem, earrings: fem && (r >> 16) % 2 === 0,
      stubble: !fem && (r >> 17) % 3 === 0, glasses: (r >> 19) % 5 === 0,
    };
    // the old sprite colours, where someone has them (rivals and walking story characters)
    if (spec.look) Object.assign(base, { skin: spec.look.skin || base.skin, hair: spec.look.hair || base.hair, shirt: spec.look.shirt || base.shirt, shades: spec.look.shades, chain: spec.look.chain });
    return Object.assign(base, hint);
  }

  function hairBack(L, c) {
    if (L.style === 'long') return `<path d="M17 28c-2 10-1 18 1 22h28c2-4 3-12 1-22z" fill="${c}"/>`;
    if (L.style === 'bob') return `<path d="M17 27c-1 6 0 11 2 13h26c2-2 3-7 2-13z" fill="${c}"/>`;
    if (L.style === 'pony') return `<path d="M44 22c6 4 7 14 3 22-1-8-3-12-6-15z" fill="${c}"/>`;
    if (L.style === 'bun') return `<circle cx="32" cy="10" r="6.5" fill="${c}"/>`;
    if (L.style === 'beehive') return `<ellipse cx="32" cy="11" rx="13" ry="11" fill="${c}"/>`;
    return '';
  }
  function hairFront(L, c) {
    const hi = shade(c, .25);
    switch (L.style) {
      case 'bald': return `<ellipse cx="27" cy="17" rx="4" ry="2" fill="#fff" opacity=".25"/>`;
      case 'buzz': return `<path d="M19 25c0-9 6-12 13-12s13 3 13 12c-3-5-8-7-13-7s-10 2-13 7z" fill="${c}" opacity=".85"/>`;
      case 'receding': return `<path d="M18.5 28c-1-6 0-9 3-11-1 4-1 7 0 10zM45.5 28c1-6 0-9-3-11 1 4 1 7 0 10z" fill="${c}"/>`;
      case 'curly': return [[20, 21], [24, 16], [29, 14], [35, 14], [40, 16], [44, 21], [19, 26], [45, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${c}"/>`).join('');
      case 'slick': return `<path d="M18.5 27c-1-10 6-15 14-15 8 0 14 5 13 15-2-6-6-9-12-9-7 0-11 3-15 9z" fill="${c}"/><path d="M24 15c4-2 10-2 14 0" stroke="${hi}" stroke-width="1.4" fill="none" opacity=".7"/>`;
      case 'pomp': return `<path d="M18.5 27c-1-9 3-16 13-17 6-1 12 0 14 5 1 3 0 8 0 12-2-6-6-9-12-9-6 0-11 3-15 9z" fill="${c}"/><path d="M26 12c5-2 11-1 15 2" stroke="${hi}" stroke-width="1.5" fill="none" opacity=".7"/>`;
      case 'long': case 'bob': return `<path d="M18 30c-2-11 5-17 14-17s16 6 14 17c-2-5-5-8-9-10-5 3-12 4-19 10z" fill="${c}"/>`;
      case 'pony': case 'bun': case 'beehive': return `<path d="M18.5 28c-1-10 5-15 13.5-15s14.5 5 13.5 15c-3-6-8-8-13.5-8s-10.5 2-13.5 8z" fill="${c}"/>`;
      default: return `<path d="M18.5 27c-1-9 5-14 13.5-14s14.5 5 13.5 14c-2-4-4-6-6-7-3 1-12 1-16 0-2 1-4 3-5 7z" fill="${c}"/>`;
    }
  }
  function beard(L, c) {
    switch (L.beard) {
      case 'full': return `<path d="M19 29c0 12 6 17 13 17s13-5 13-17c-2 5-4 6-6 6-2-2-4-2-7-2s-5 0-7 2c-2 0-4-1-6-6z" fill="${c}"/>`;
      case 'goatee': return `<path d="M28 39c1 4 7 4 8 0-1 1-3 1.5-4 1.5s-3-.5-4-1.5zM28 35.5c2-1 6-1 8 0" stroke="${c}" stroke-width="1.6" fill="${c}"/>`;
      case 'curl': return `<path d="M24 35c3-2 5-2 8-1 3-1 5-1 8 1 1 1 2 0 2-1M24 35c-1 1-2 0-2-1" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      case 'thin': return `<path d="M27 35.2c2-.8 8-.8 10 0" stroke="${c}" stroke-width="1" fill="none"/>`;
      case 'stache': return `<path d="M25.5 35.5c2-2.5 4.5-2.5 6.5-1.5 2-1 4.5-1 6.5 1.5-2 .5-4.5.5-6.5-.5-2 1-4.5 1-6.5.5z" fill="${c}"/>`;
      default: return '';
    }
  }
  function hat(L) {
    const c = L.hatCol;
    switch (L.hat) {
      case 'fedora': return `<ellipse cx="32" cy="18" rx="19" ry="3.6" fill="${c || '#3b2f2a'}"/><path d="M21 18c0-7 2-11 11-11s11 4 11 11z" fill="${c ? shade(c, .1) : '#4b3b33'}"/><path d="M21.3 15h21.4v2.6H21.3z" fill="#1d1715"/><path d="M28 8c2 2 6 2 8 0" stroke="#000" stroke-opacity=".25" fill="none"/>`;
      case 'cowboy': return `<path d="M8 18c6 4 42 4 48 0-2 5-10 6-24 6S10 23 8 18z" fill="${c || '#8a5a2b'}"/><path d="M21 19c-1-8 2-13 6-13 2 0 3 2 5 2s3-2 5-2c4 0 7 5 6 13z" fill="${shade(c || '#8a5a2b', .12)}"/><path d="M21 17h22v2.2H21z" fill="#3a2418"/>`;
      case 'top': return `<ellipse cx="32" cy="17" rx="16" ry="3" fill="#111"/><path d="M22 17V3h20v14z" fill="#1c1c1c"/><path d="M22 13h20v2.6H22z" fill="#7a2131"/>`;
      case 'cap': return `<path d="M19 21c0-9 6-12 13-12s13 3 13 12z" fill="${c || '#1f5f8b'}"/><path d="M19 21c8-2 22-2 26 0l9 2c-10 2-26 1-35-2z" fill="${shade(c || '#1f5f8b', -.25)}"/><circle cx="32" cy="9.5" r="1.3" fill="${shade(c || '#1f5f8b', -.3)}"/>`;
      case 'captain': return `<path d="M19 19c0-6 4-10 13-10s13 4 13 10z" fill="#f4f4f4"/><path d="M19 19h26v3H19z" fill="#111"/><path d="M19 22c6 2 20 2 26 0l2 2c-8 2-22 2-30 0z" fill="#1a1a1a"/><circle cx="32" cy="15" r="2.2" fill="#f1c40f"/>`;
      case 'chef': return `<path d="M21 20V12c-4-2-3-8 2-8 1-3 7-4 9-1 2-3 8-2 9 1 5 0 6 6 2 8v8z" fill="#fafafa" stroke="#ddd"/><path d="M21 17h22v3H21z" fill="#e8e8e8"/>`;
      case 'sun': return `<ellipse cx="32" cy="18" rx="22" ry="5" fill="#f5deb3"/><path d="M22 18c0-6 3-9 10-9s10 3 10 9z" fill="#f0d29a"/><path d="M22 15.5h20v2.5H22z" fill="#e05a8a"/>`;
      case 'nurse': return `<path d="M23 16c0-4 4-6 9-6s9 2 9 6z" fill="#fff" stroke="#ddd"/><path d="M31 11.5h2v3h-2zM30 12.5h4v1h-4z" fill="#c0392b"/>`;
      case 'tiara': return `<path d="M23 15l3-5 3 4 3-6 3 6 3-4 3 5z" fill="#f1c40f" stroke="#b8860b" stroke-width=".6"/><circle cx="32" cy="9" r="1.2" fill="#e74c3c"/>`;
      case 'scarf': return `<path d="M17 27c-1-11 6-17 15-17s16 6 15 17c-3-5-8-8-15-8s-12 3-15 8z" fill="#6b2a8a"/><circle cx="32" cy="13" r="2" fill="#f1c40f"/>`;
      default: return '';
    }
  }
  function body(L) {
    const sh = L.shirt || '#2f3e5c', w = L.big ? 4 : 0, skin = L.skin;
    let s = `<path d="M${4 - w} 64c1-12 10-17 18-18.5h20c8 1.5 17 6.5 18 18.5z" fill="${sh}"/>`;
    s += `<path d="M26.5 37h11v10c-2 2-9 2-11 0z" fill="${shade(skin, -.12)}"/>`; // neck
    switch (L.collar) {
      case 'tie': s += `<path d="M25 45.5l7 7 7-7-3-1-4 4-4-4z" fill="#f4f4f4"/><path d="M30.6 50h2.8l1.3 10-2.7 3-2.7-3z" fill="#a3242e"/>`; break;
      case 'bow': s += `<path d="M25 45.5l7 7 7-7-3-1-4 4-4-4z" fill="#f4f4f4"/><path d="M26 47.5l6 2-6 2.5zM38 47.5l-6 2 6 2.5z" fill="#111"/><circle cx="32" cy="49.6" r="1.3" fill="#111"/>`; break;
      case 'turtle': s += `<path d="M25 44h14c1 2 1 4 0 5H25c-1-1-1-3 0-5z" fill="${shade(sh, -.18)}"/>`; break;
      case 'apron': s += `<path d="M24 50h16l2 14H22z" fill="#f4f4f4"/><path d="M24 50l-4-4M40 50l4-4" stroke="#f4f4f4" stroke-width="1.6"/>`; break;
      case 'vest': s += `<path d="M18 64c0-8 2-14 6-17l8 10 8-10c4 3 6 9 6 17z" fill="${L.vest || '#222'}"/><path d="M27 45.5l5 6 5-6" stroke="#111" stroke-width="1.6" fill="none"/>`; break;
      case 'gown': s = `<path d="M${4 - w} 64c1-12 10-17 18-18.5h20c8 1.5 17 6.5 18 18.5z" fill="${skin}"/><path d="M26.5 37h11v10c-2 2-9 2-11 0z" fill="${shade(skin, -.12)}"/><path d="M12 64c2-6 6-10 10-10 4 3 16 3 20 0 4 0 8 4 10 10z" fill="${sh}"/>`; break;
      case 'bolo': s += `<path d="M27 45.5l5 5 5-5" stroke="${shade(sh, -.3)}" stroke-width="1.4" fill="none"/><path d="M32 50v10" stroke="#222" stroke-width=".9"/><circle cx="32" cy="51" r="1.8" fill="#bfc9d1" stroke="#7a8a96" stroke-width=".5"/>`; break;
      default: s += `<path d="M26 45.5l6 7 6-7z" fill="${skin}"/><path d="M24.5 45l7.5 8-3 2zM39.5 45l-7.5 8 3 2z" fill="${shade(sh, .18)}"/>`;
    }
    if (L.chain) s += `<path d="M24.5 47c2 6 13 6 15 0" stroke="#f5c542" stroke-width="1.5" fill="none"/>`;
    if (L.pearls) s += [24, 26.5, 29, 32, 35, 37.5, 40].map((x, i) => `<circle cx="${x}" cy="${46.5 + [0, 1.8, 3, 3.4, 3, 1.8, 0][i]}" r="1.1" fill="#fbf7ee" stroke="#d8cfba" stroke-width=".3"/>`).join('');
    return s;
  }
  function face(L) {
    const sk = L.skin, dk = shade(sk, -.2), hairC = L.hair || '#2b1d14', brow = shade(hairC === '#ddd' || hairC === '#e8e8e8' ? '#999' : hairC, -.1);
    let s = `<ellipse cx="18.5" cy="29" rx="2.6" ry="3.6" fill="${dk}"/><ellipse cx="45.5" cy="29" rx="2.6" ry="3.6" fill="${dk}"/>`;
    s += `<ellipse cx="32" cy="27" rx="13.5" ry="15" fill="${sk}"/>`;
    s += `<ellipse cx="32" cy="38" rx="9" ry="4" fill="${dk}" opacity=".18"/>`; // jaw shadow
    if (L.stubble && !L.beard) s += `<path d="M20 31c1 9 6 12 12 12s11-3 12-12c-2 5-6 7-12 7s-10-2-12-7z" fill="${hairC}" opacity=".22"/>`;
    // eyes and brows
    s += `<ellipse cx="26.5" cy="27.5" rx="1.6" ry="1.9" fill="#1d1d1d"/><ellipse cx="37.5" cy="27.5" rx="1.6" ry="1.9" fill="#1d1d1d"/><circle cx="27" cy="27" r=".5" fill="#fff"/><circle cx="38" cy="27" r=".5" fill="#fff"/>`;
    if (L.lips) s += `<path d="M24.3 26.3l-1.3-.8M39.7 26.3l1.3-.8" stroke="#1d1d1d" stroke-width=".8"/>`;
    s += `<path d="M23.5 23.6c1.6-1.2 4.4-1.4 5.8-.4M34.7 23.2c1.4-1 4.2-.8 5.8.4" stroke="${brow}" stroke-width="${L.lips ? 1 : 1.5}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M32 28.5c-.6 2.5-1.6 4-2.4 4.8.9.6 2.6.6 3.6 0" stroke="${dk}" stroke-width="1" fill="none" stroke-linecap="round"/>`; // nose
    s += L.lips ? `<path d="M28.5 36.2c2-1 5-1 7 0-1.2 1.6-5.8 1.6-7 0z" fill="#b8434e"/>` : `<path d="M28.3 36.3c2 1.4 5.4 1.4 7.4 0" stroke="#7a3b2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    if (L.age) s += `<path d="M26 19.5c3-.8 9-.8 12 0M22.5 29.5l-1.5 1M41.5 29.5l1.5 1M26.5 33.5c-.5 1.5-.5 2.5 0 3.5M37.5 33.5c.5 1.5.5 2.5 0 3.5" stroke="${dk}" stroke-width=".7" fill="none" opacity=".8"/>`;
    if (L.earrings) s += `<circle cx="18.5" cy="33.5" r="1.4" fill="#f1c40f"/><circle cx="45.5" cy="33.5" r="1.4" fill="#f1c40f"/>`;
    return s;
  }
  function eyewear(L) {
    if (L.shades) return `<path d="M21.5 25.5h8.5c.5 3-1 5.5-4 5.5s-4.8-2.5-4.5-5.5zM34 25.5h8.5c.3 3-1.5 5.5-4.5 5.5s-4.5-2.5-4-5.5z" fill="#111"/><path d="M30 26.3h4M21.5 25.6l-2.6-.8M42.5 25.6l2.6-.8" stroke="#111" stroke-width="1.1"/><path d="M23 26.5l2 0" stroke="#fff" stroke-opacity=".4" stroke-width=".8"/>`;
    if (L.monocle) return `<circle cx="37.5" cy="27.5" r="3.6" fill="#fff" fill-opacity=".15" stroke="#d4af37" stroke-width="1"/><path d="M40.5 30c2 4 3 9 2 14" stroke="#d4af37" stroke-width=".5" fill="none"/>`;
    if (L.glasses) return `<circle cx="26.5" cy="27.5" r="3.6" fill="#fff" fill-opacity=".12" stroke="#2b2b2b" stroke-width="1"/><circle cx="37.5" cy="27.5" r="3.6" fill="#fff" fill-opacity=".12" stroke="#2b2b2b" stroke-width="1"/><path d="M30.1 27.2h3.8M22.9 27l-4-1M41.1 27l4-1" stroke="#2b2b2b" stroke-width="1"/>`;
    return '';
  }

  // the narrator gets a dealer's chip rather than a face
  function chip(bg) {
    const spots = [0, 60, 120, 180, 240, 300].map(a => { const r = a * Math.PI / 180; return `<rect x="${32 + Math.sin(r) * 23 - 3}" y="${32 - Math.cos(r) * 23 - 5}" width="6" height="10" rx="1" fill="#f4e3b5" transform="rotate(${a} ${32 + Math.sin(r) * 23} ${32 - Math.cos(r) * 23})"/>`; }).join('');
    return `<circle cx="32" cy="32" r="30" fill="${bg}"/>${spots}<circle cx="32" cy="32" r="17" fill="none" stroke="#f4e3b5" stroke-width="1.5" stroke-dasharray="3 2.5"/><text x="32" y="39" text-anchor="middle" font-size="20" font-family="Georgia,serif" font-weight="700" fill="#d4af37">17</text>`;
  }

  let uid = 0;
  function svg(spec) {
    const bg = spec.color || '#334';
    if (spec.key === 'narrator') return `<svg viewBox="0 0 64 64" aria-hidden="true">${chip(bg)}</svg>`;
    const L = lookFor(spec), hc = L.hair || '#2b1d14', id = 'pt' + (++uid);
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="32" cy="32" r="32"/></clipPath><radialGradient id="${id}g" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${shade(bg, .28)}"/><stop offset="1" stop-color="${shade(bg, -.2)}"/></radialGradient></defs>`
      + `<g clip-path="url(#${id})"><rect width="64" height="64" fill="url(#${id}g)"/>${hairBack(L, hc)}${body(L)}${face(L)}${hairFront(L, hc)}${beard(L, hc === '#ddd' ? '#e8e8e8' : hc)}${eyewear(L)}${hat(L)}</g></svg>`;
  }

  // who is this? accepts a character id, a CHARACTERS/STAFF entry, or a chat spec
  function resolve(x) {
    if (typeof x === 'string') {
      if (x === 'me' || x === 'you') return { key: 'me', ...CHARACTERS.me };
      return { key: x, ...(CHARACTERS[x] || (typeof STAFF !== 'undefined' && STAFF[x]) || { name: x }) };
    }
    if (!x) return { key: 'narrator', ...CHARACTERS.narrator };
    if (x.me) return { key: 'me', ...CHARACTERS.me, ...x, name: 'You' };
    let key = x.key || x.rival || null;
    if (!key && x.id) { const id = String(x.id); key = id.startsWith('staff:') ? id.slice(6) : !id.includes(':') ? id : null; }
    if (!key) key = Object.keys(CHARACTERS).find(k => CHARACTERS[k] === x || (x.name && CHARACTERS[k].name === x.name)) || (typeof STAFF !== 'undefined' && Object.keys(STAFF).find(k => STAFF[k] === x)) || null;
    const base = key && CHARACTERS[key] ? CHARACTERS[key] : {};
    return { ...base, ...x, key, look: x.look || (key && RIVALS_LOOK(key)) };
  }
  const RIVALS_LOOK = k => (typeof RIVALS !== 'undefined' && RIVALS[k] && RIVALS[k].look) || null;

  return {
    LOOKS, lookFor, svg: x => { const s = resolve(x); return s.key === 'me' && typeof Looks !== 'undefined' ? Looks.svg() : svg(s); }, _raw: svg,
    // an element: <span class="pt"> holding the drawing, labelled for screen readers
    el(x, cls = '') {
      const s = resolve(x), e = document.createElement('span');
      e.className = 'pt' + (cls ? ' ' + cls : ''); e.setAttribute('role', 'img'); e.setAttribute('aria-label', s.key === 'me' ? 'You' : (s.name || 'Portrait'));
      e.innerHTML = s.key === 'me' && typeof Looks !== 'undefined' ? Looks.svg() : svg(s);
      return e;
    },
  };
})();
