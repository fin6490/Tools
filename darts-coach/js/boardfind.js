// boardfind.js — find a dartboard in a camera frame, from any reasonable angle.
//
// The double and treble rings are the only strongly red and green things on a
// board, and a circle seen at an angle is an ellipse. So:
//  1. Label every pixel red / green / other, and pick the blob of red+green that
//     looks like a ring (both colours, biggest footprint).
//  2. Fit an ellipse to its outer edge (the outer double wire). That gives the
//     board up to its spin.
//  3. Read the colours round the double ring and slide the 20-segment pattern
//     until it fits; of the 10 colour-identical spins, put 20 nearest the top.
//  4. Refine to a full perspective mapping. Under the current guess, look for
//     where the colour changes along circles (the spoke wires) and along rays
//     (the ring wires); each found point must lie on a known board line or circle.
//     Gauss–Newton on the 8 homography numbers, then look again, tighter.
// Pure functions on ImageData-like {data, width, height}; no DOM.

const SEGS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const D2R = Math.PI / 180;
const bdir = (a) => [Math.sin(a * D2R), -Math.cos(a * D2R)]; // board angle (deg, clockwise from 20) -> unit vector, y down

/* ---------- 3x3 helpers (row-major arrays of 9) ---------- */
export function apply(M, x, y) { const w = M[6] * x + M[7] * y + M[8]; return [(M[0] * x + M[1] * y + M[2]) / w, (M[3] * x + M[4] * y + M[5]) / w]; }
export function mul(A, B) { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; }
export function inv(M) {
  const [a, b, c, d, e, f, g, h, i] = M, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-18) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
const norm9 = (M) => M.map((v) => v / M[8]);
function solveN(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-14) return null;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
// rotation of the board by deg (clockwise), as a 3x3 acting on board coords
export function boardRot(deg) { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return [c, -s, 0, s, c, 0, 0, 0, 1]; }

/* ---------- pixel labels ---------- */
export function classify(img) {
  const { data, width: w, height: h } = img, n = w * h;
  const lab = new Uint8Array(n), lum = new Uint8Array(n);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    lum[j] = (r * 77 + g * 150 + b * 29) >> 8;
    const mx = r > g ? (r > b ? r : b) : (g > b ? g : b), mn = r < g ? (r < b ? r : b) : (g < b ? g : b), d = mx - mn;
    if (mx < 45 || d < 24 || d < 0.3 * mx) continue;
    let hue = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
    if (hue <= 18 || hue >= 330) lab[j] = 1;
    else if (hue >= 75 && hue <= 175) lab[j] = 2;
  }
  // drop specks: keep a coloured pixel only if 3+ of its 8 neighbours share its colour
  const keep = new Uint8Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, v = lab[i]; if (!v) continue;
    const k = (lab[i - 1] === v) + (lab[i + 1] === v) + (lab[i - w] === v) + (lab[i + w] === v) + (lab[i - w - 1] === v) + (lab[i - w + 1] === v) + (lab[i + w - 1] === v) + (lab[i + w + 1] === v);
    if (k >= 3) keep[i] = v;
  }
  return { lab: keep, lum, w, h };
}

/* ---------- step 1: the ring blob ---------- */
function findRingBlob({ lab, w, h }) {
  const n = w * h, R = Math.max(2, Math.round(w / 300));
  // dilate (separable box) so the wires between segments don't split the ring
  const tmp = new Uint8Array(n), dil = new Uint8Array(n);
  for (let y = 0; y < h; y++) { let run = 0; const o = y * w;
    for (let x = 0; x < w; x++) { if (lab[o + x]) run = R + 1; if (run > 0) { tmp[o + x] = 1; run--; } }
    run = 0; for (let x = w - 1; x >= 0; x--) { if (lab[o + x]) run = R + 1; if (run > 0) { tmp[o + x] = 1; run--; } } }
  for (let x = 0; x < w; x++) { let run = 0;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) run = R + 1; if (run > 0) { dil[y * w + x] = 1; run--; } }
    run = 0; for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) run = R + 1; if (run > 0) { dil[y * w + x] = 1; run--; } } }
  const comp = new Int32Array(n).fill(-1), q = new Int32Array(n), stats = [];
  for (let s = 0; s < n; s++) {
    if (!dil[s] || comp[s] >= 0) continue;
    const id = stats.length, st = { id, red: 0, green: 0, x0: w, x1: 0, y0: h, y1: 0 };
    let qh = 0, qt = 0; q[qt++] = s; comp[s] = id;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i / w) | 0;
      if (lab[i] === 1) st.red++; else if (lab[i] === 2) st.green++;
      if (lab[i]) { if (x < st.x0) st.x0 = x; if (x > st.x1) st.x1 = x; if (y < st.y0) st.y0 = y; if (y > st.y1) st.y1 = y; }
      if (x > 0 && dil[i - 1] && comp[i - 1] < 0) { comp[i - 1] = id; q[qt++] = i - 1; }
      if (x < w - 1 && dil[i + 1] && comp[i + 1] < 0) { comp[i + 1] = id; q[qt++] = i + 1; }
      if (y > 0 && dil[i - w] && comp[i - w] < 0) { comp[i - w] = id; q[qt++] = i - w; }
      if (y < h - 1 && dil[i + w] && comp[i + w] < 0) { comp[i + w] = id; q[qt++] = i + w; }
    }
    stats.push(st);
  }
  let best = null;
  for (const st of stats) {
    const c = st.red + st.green; if (c < n * 0.0008) continue;
    const bw = st.x1 - st.x0 + 1, bh = st.y1 - st.y0 + 1; if (bw < 24 || bh < 24) continue;
    if (Math.min(st.red, st.green) / c < 0.18) continue;
    if (c / (bw * bh) > 0.5) continue; // a solid patch, not a ring
    st.area = bw * bh; st.c = c;
    if (!best || c > best.c) best = st;
  }
  return best ? { comp, best } : null;
}

/* ---------- step 2: ellipse on the outer edge ---------- */
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function fitEllipse(pts) {
  let mx = 0, my = 0; for (const [x, y] of pts) { mx += x; my += y; } mx /= pts.length; my /= pts.length;
  let s = 0; for (const [x, y] of pts) s += Math.hypot(x - mx, y - my); s /= pts.length;
  const A = [...Array(5)].map(() => new Array(5).fill(0)), b = new Array(5).fill(0);
  for (const [X, Y] of pts) { const x = (X - mx) / s, y = (Y - my) / s, r = [x * x, x * y, y * y, x, y];
    for (let i = 0; i < 5; i++) { b[i] += r[i]; for (let j = 0; j < 5; j++) A[i][j] += r[i] * r[j]; } }
  const c = solveN(A, b); if (!c) return null;
  const [a, bb, cc, d, e] = c, f = -1;
  const det = 4 * a * cc - bb * bb; if (det <= 0) return null; // not an ellipse
  const xc = (bb * e - 2 * cc * d) / det, yc = (bb * d - 2 * a * e) / det;
  const F = a * xc * xc + bb * xc * yc + cc * yc * yc + d * xc + e * yc + f;
  // eigen of [[a, bb/2],[bb/2, cc]]
  const tr = a + cc, dif = Math.sqrt((a - cc) ** 2 + bb * bb), l1 = (tr + dif) / 2, l2 = (tr - dif) / 2;
  if (l1 <= 0 || l2 <= 0 || F >= 0) return null;
  let v1 = Math.abs(bb) > 1e-12 ? [bb / 2, l1 - a] : (a >= cc ? [1, 0] : [0, 1]);
  const L = Math.hypot(...v1); v1 = [v1[0] / L, v1[1] / L];
  let v2 = [-v1[1], v1[0]]; // det(V) = +1
  const a1 = Math.sqrt(-F / l1) * s, a2 = Math.sqrt(-F / l2) * s;
  return { c: [xc * s + mx, yc * s + my], M: [v1[0] * a1, v2[0] * a2, v1[1] * a1, v2[1] * a2], ax: [a1, a2] };
}

/* ---------- sampling helpers ---------- */
function sampler(L) {
  const { lab, lum, w, h } = L;
  const at = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); return xi < 0 || yi < 0 || xi >= w || yi >= h ? -1 : yi * w + xi; };
  return {
    col(x, y) { const i = at(x, y); return i < 0 ? 0 : lab[i]; },
    lum(x, y) { const i = at(x, y); return i < 0 ? -1 : lum[i]; },
  };
}
const segOf = (a) => Math.floor((((a + 9) % 360) + 360) % 360 / 18); // board angle -> segment index (0 = 20)
const expCol = (i) => ((i % 20) + 20) % 20 % 2 === 0 ? 1 : 2;           // treble/double colour: 20 is red
const expDark = (i) => ((i % 20) + 20) % 20 % 2 === 0;                  // single colour: 20 is black

// best split of a sequence into "left value" then "right value"; returns fractional index or null
function bestSplit(vals, left, right, minQ) {
  const n = vals.length; if (n < 6) return null;
  const sc = (v, want) => (v === want ? 1 : v === null ? 0 : -1);
  const pre = new Float64Array(n + 1), suf = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + sc(vals[i], left);
  for (let i = n - 1; i >= 0; i--) suf[i] = suf[i + 1] + sc(vals[i], right);
  let best = -1e9, lo = -1, hi = -1;
  for (let j = 1; j < n; j++) { const s = pre[j] + suf[j]; if (s > best + 1e-9) { best = s; lo = hi = j; } else if (Math.abs(s - best) < 1e-9) hi = j; }
  if (best / n < minQ) return null;
  // both sides must actually contain their colour
  const lm = vals.slice(0, lo).filter((v) => v === left).length, rm = vals.slice(hi).filter((v) => v === right).length;
  if (lm < 2 || rm < 2) return null;
  return (lo + hi) / 2 - 0.5;
}
function otsuMid(vs) { const s = vs.filter((v) => v >= 0).sort((a, b) => a - b); if (s.length < 10) return 128; return (s[Math.floor(s.length * 0.25)] + s[Math.floor(s.length * 0.75)]) / 2; }

/* ---------- step 4: measurements under the current guess ---------- */
// B: board->pixel homography. Returns [{p:[x,y], kind:"spoke", beta} | {p, kind:"ring", r}]
function measure(B, S, win) {
  const out = [];
  const P = (r, a) => { const [x, y] = bdir(a); return apply(B, r * x, r * y); };
  // spoke wires, crossing circles in the coloured rings and in the singles
  const circles = [[164.5, "col"], [167.5, "col"], [101.5, "col"], [104.5, "col"], [150, "lum"], [138, "lum"], [124, "lum"], [85, "lum"], [65, "lum"], [45, "lum"]];
  for (const [R, kind] of circles) {
    let thr = 0;
    if (kind === "lum") { const all = []; for (let a = 0; a < 360; a += 1) all.push(S.lum(...P(R, a))); thr = otsuMid(all); }
    const step = Math.max(0.15, Math.min(1, 40 / R));
    for (let k = 0; k < 20; k++) {
      const beta = k * 18 - 9, vals = [], angs = [];
      for (let a = beta - win; a <= beta + win + 1e-9; a += step) {
        const [x, y] = P(R, a);
        if (kind === "col") { const c = S.col(x, y); vals.push(c === 0 ? null : c); }
        else { const l = S.lum(x, y); vals.push(l < 0 ? null : l < thr); }
        angs.push(a);
      }
      const left = kind === "col" ? expCol(k - 1) : expDark(k - 1), right = kind === "col" ? expCol(k) : expDark(k);
      const j = bestSplit(vals, left, right, kind === "col" ? 0.35 : 0.45);
      if (j === null) continue;
      const a = angs[0] + (j + 0.5) * step;
      out.push({ p: P(R, a), kind: "spoke", beta, w: kind === "col" ? 1 : 0.7 });
    }
  }
  // ring wires, crossing rays: inside/outside coloured or not
  const rings = [[170, true], [162, false], [107, true], [99, false], [15.9, true]];
  const rwin = Math.max(2.2, win * 0.6);
  for (let k = 0; k < 20; k++) for (const off of [-6, -3, 0, 3, 6]) {
    const a = k * 18 + off;
    for (const [r, inside] of rings) {
      const ww = r < 20 ? Math.min(rwin, 4) : rwin, step = 0.2, vals = [], rs = [];
      if (r < 20 && off !== 0) continue;
      for (let rr = r - ww; rr <= r + ww + 1e-9; rr += step) { const c = S.col(...P(rr, a)); vals.push(c !== 0); rs.push(rr); }
      const j = bestSplit(vals, inside, !inside, 0.4);
      if (j === null) continue;
      const pr = rs[0] + (j + 0.5) * step, p0 = P(pr - 0.5, a), p1 = P(pr + 0.5, a);
      // colour bleeds a little past its edge on camera images: model it as a shift of d pixels out of the coloured side
      const darkSide = r > 168 || expDark(segOf(a)); // the uncoloured side is the black number ring or a black single, else a cream single
      out.push({ p: P(pr, a), kind: "ring", r, sgn: inside ? 1 : -1, dark: darkSide, pxmm: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), w: r < 20 ? 0.6 : 1 });
    }
  }
  return out;
}

/* ---------- Gauss–Newton on image->board ---------- */
// params: 8 homography numbers (image->board, last fixed at 1) + colour bleed in pixels into black and into cream
function residuals(P9, ms, out) {
  const G = [...P9.slice(0, 8), 1];
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i], [x, y] = apply(G, m.p[0], m.p[1]);
    if (m.kind === "spoke") { const [ux, uy] = bdir(m.beta); out[i] = x * uy - y * ux; }
    else out[i] = Math.hypot(x, y) - (m.r + m.sgn * (m.dark ? P9[8] : P9[9]) / m.pxmm);
  }
  return out;
}
function refine(G0, ms, iters = 8) {
  let G = [...norm9(G0).slice(0, 8), 0, 0]; const n = ms.length; if (n < 12) return null;
  const f = new Float64Array(n), f2 = new Float64Array(n);
  let mu = 1e-3;
  for (let it = 0; it < iters; it++) {
    residuals(G, ms, f);
    const wts = Array.from(f, (r, i) => ms[i].w * (Math.abs(r) < 2 ? 1 : 2 / Math.abs(r)));
    const J = [];
    const NP = 10;
    for (let k = 0; k < NP; k++) { const e = 1e-6 * Math.max(1, Math.abs(G[k])), Gk = G.slice(); Gk[k] += e; residuals(Gk, ms, f2); J.push(Array.from(f2, (v, i) => (v - f[i]) / e)); }
    const A = [...Array(NP)].map(() => new Array(NP).fill(0)), b = new Array(NP).fill(0);
    for (let i = 0; i < n; i++) { const w = wts[i]; for (let a = 0; a < NP; a++) { const ja = J[a][i] * w; b[a] -= ja * f[i]; for (let c = a; c < NP; c++) A[a][c] += ja * J[c][i]; } }
    for (let a = 0; a < NP; a++) { for (let c = 0; c < a; c++) A[a][c] = A[c][a]; A[a][a] = A[a][a] * (1 + mu) + 1e-12; }
    const d = solveN(A, b); if (!d) break;
    const Gn = G.slice(); for (let k = 0; k < NP; k++) Gn[k] += d[k];
    const cost = (g) => { residuals(g, ms, f2); let s = 0; for (let i = 0; i < n; i++) { const r = Math.abs(f2[i]); s += ms[i].w * (r < 2 ? r * r : 4 * r - 4); } return s; };
    if (cost(Gn) < cost(G)) { G = Gn; mu = Math.max(1e-6, mu / 3); } else mu *= 10;
  }
  residuals(G, ms, f);
  const good = Array.from(f).filter((r) => Math.abs(r) < 3).length;
  let ss = 0; for (const r of f) ss += Math.min(r * r, 9);
  return { G: [...G.slice(0, 8), 1], bleed: [G[8], G[9]], rms: Math.sqrt(ss / n), inl: good / n };
}

/* ---------- final check: do the board's colours sit where this mapping says? ---------- */
function agreement(B, S) {
  let ok = 0, all = 0;
  const P = (r, a) => { const [x, y] = bdir(a); return apply(B, r * x, r * y); };
  for (let a = 0; a < 360; a += 2) {
    const k = segOf(a), mid = Math.abs(((a + 9) % 18) - 9) < 6.5; if (!mid) continue;
    for (const r of [103, 166]) { const c = S.col(...P(r, a)); all++; if (c === expCol(k)) ok++; }
    for (const r of [60, 135, 185]) { const c = S.col(...P(r, a)); all++; if (c === 0) ok++; }
  }
  return ok / all;
}

/* ---------- the whole thing ---------- */
// img: {data, width, height}. Returns {Hi, H, score, rms} with Hi: board mm -> normalised image (0..1), or {error}.
export function findBoard(img, { rot = 0 } = {}) {
  const L = classify(img), { w, h } = L, S = sampler(L);
  const blob = findRingBlob(L); if (!blob) return { error: "no_ring" };
  const { comp, best } = blob;
  // outer edge points of the blob: leftmost/rightmost per row, top/bottom per column
  const pts = [], { lab } = L;
  for (let y = best.y0; y <= best.y1; y++) {
    let lx = -1, rx = -1; for (let x = best.x0; x <= best.x1; x++) { const i = y * w + x; if (lab[i] && comp[i] === best.id) { if (lx < 0) lx = x; rx = x; } }
    if (lx >= 0) { pts.push([lx, y]); pts.push([rx + 1, y]); }
  }
  for (let x = best.x0; x <= best.x1; x++) {
    let ty = -1, by = -1; for (let y = best.y0; y <= best.y1; y++) { const i = y * w + x; if (lab[i] && comp[i] === best.id) { if (ty < 0) ty = y; by = y; } }
    if (ty >= 0) { pts.push([x, ty]); pts.push([x, by + 1]); }
  }
  const hv = hull(pts); if (hv.length < 8) return { error: "no_ring" };
  const el = fitEllipse(hv); if (!el) return { error: "no_ellipse" };
  if (Math.min(...el.ax) < 20) return { error: "too_small" };
  // affine board->pixel: c + M q / 170
  const affine = (psi) => mul([el.M[0] / 170, el.M[1] / 170, el.c[0], el.M[2] / 170, el.M[3] / 170, el.c[1], 0, 0, 1], boardRot(psi));
  // step 3: spin
  const B0 = affine(0), samp = [];
  for (let a = 0; a < 360; a += 0.5) { const [x, y] = bdir(a); samp.push([a, S.col(...apply(B0, 166 * x, 166 * y))]); }
  let bestPsi = 0, bestSc = -1;
  for (let psi = 0; psi < 36; psi += 0.25) {
    let sc = 0; for (const [a, c] of samp) if (c) sc += c === expCol(segOf(a - psi)) ? 1 : -1;
    if (sc > bestSc) { bestSc = sc; bestPsi = psi; }
  }
  if (bestSc < samp.length * 0.15) return { error: "no_pattern", dbg: { c: el.c, ax: el.ax, M: el.M, bestSc, n: samp.length, blob: [best.x0, best.y0, best.x1, best.y1], hull: hv.length } };
  let psi = bestPsi, up = -2;
  for (let m = 0; m < 10; m++) { const ps = bestPsi + 36 * m, [x, y] = apply(affine(ps), 0, -170); const dx = x - el.c[0], dy = y - el.c[1]; const u = -dy / Math.hypot(dx, dy); if (u > up) { up = u; psi = ps; } }
  // step 4: refine in normalised pixel coords for conditioning
  const s = (el.ax[0] + el.ax[1]) / 2, T = [1 / s, 0, -el.c[0] / s, 0, 1 / s, -el.c[1] / s, 0, 0, 1], Ti = inv(T);
  let B = affine(psi), G = norm9(mul(inv(B), Ti)), fit = null; // G: normalised pixel -> board
  for (const win of [8.5, 6, 4, 3, 2.5, 2.5]) {
    const ms = measure(B, S, win).map((m) => ({ ...m, p: apply(T, m.p[0], m.p[1]) }));
    const r = refine(G, ms); if (!r) return { error: "no_fit" };
    fit = r; G = r.G; B = inv(mul(G, T));
  }
  const score = agreement(B, S);
  // to normalised image coords (0..1)
  let Hi = norm9(mul([1 / w, 0, 0, 0, 1 / h, 0, 0, 0, 1], B));
  if (rot) Hi = norm9(mul(Hi, boardRot(36 * rot)));
  const H = norm9(inv(Hi));
  const ok = score > 0.72 && fit.inl > 0.6 && fit.rms < 2.2;
  return { ok, Hi, H, score, rms: fit.rms, inl: fit.inl, bleed: fit.bleed, error: ok ? null : "low_confidence" };
}

/* ---------- which way does a dart stick out, from the board's pose ---------- */
// Assumes a phone camera of ~68° field of view on its long side. Returns fn(u,v) -> unit pixel-space vector
// from a dart's tip towards its flight, at normalised image position (u,v).
export function dartDirFn(Hi, aspect) {
  const W = aspect >= 1 ? 1000 : 1000 * aspect, Hh = W / aspect, f = 0.74 * Math.max(W, Hh);
  const Hp = mul([W, 0, 0, 0, Hh, 0, 0, 0, 1], Hi);
  const Ki = [1 / f, 0, -W / 2 / f, 0, 1 / f, -Hh / 2 / f, 0, 0, 1];
  const Bm = mul(Ki, Hp), col = (j) => [Bm[j], Bm[3 + j], Bm[6 + j]];
  let b1 = col(0), b2 = col(1), b3 = col(2);
  const n1 = Math.hypot(...b1), n2 = Math.hypot(...b2), lam = 2 / (n1 + n2);
  let r1 = b1.map((v) => v / n1), r2 = b2.map((v) => v * lam), t = b3.map((v) => v * lam);
  const dp = r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2]; r2 = r2.map((v, i) => v - dp * r1[i]); const m2 = Math.hypot(...r2); r2 = r2.map((v) => v / m2);
  if (t[2] < 0) { r1 = r1.map((v) => -v); r2 = r2.map((v) => -v); t = t.map((v) => -v); }
  let r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
  if (-(r3[0] * t[0] + r3[1] * t[1] + r3[2] * t[2]) < 0) r3 = r3.map((v) => -v); // point it towards the camera
  const ax = [0, -0.3, 0.95]; // darts sit tail-up a little
  const axis = [0, 1, 2].map((i) => r1[i] * ax[0] + r2[i] * ax[1] + r3[i] * ax[2]);
  const proj = (X) => [f * X[0] / X[2] + W / 2, f * X[1] / X[2] + Hh / 2];
  const H = inv(Hi);
  return (u, v) => {
    const [bx, by] = apply(H, u, v);
    const X0 = [0, 1, 2].map((i) => r1[i] * bx + r2[i] * by + t[i]);
    const X1 = X0.map((x, i) => x + 40 * axis[i]);
    if (X1[2] <= 1) return [0, 1];
    const [x0, y0] = proj(X0), [x1, y1] = proj(X1), L = Math.hypot(x1 - x0, y1 - y0);
    return L < 1e-6 ? [0, 1] : [(x1 - x0) / L, (y1 - y0) / L];
  };
}
export { SEGS };
