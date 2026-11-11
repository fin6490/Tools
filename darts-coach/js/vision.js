// vision.js — live dart detection for Oche from a single fixed phone camera.
//
// How it works:
//  1. Calibration maps the camera image onto the board: you drag four handles to
//     the outer double wire at 20, 6, 3 and 11, which fixes a homography from
//     normalised image coords (0..1) to board millimetres.
//  2. Each frame is shrunk to ~320px grayscale. While anything moves (a dart in
//     flight, your hand) we wait. Once the picture has been still for a few frames
//     we compare it with the last settled picture:
//       small change  -> nothing happened (noise)
//       dart-sized    -> a new dart: take the changed blob and find its tip
//       board-sized   -> darts pulled out, if the board now matches the empty
//                        board again; otherwise a lighting or camera change
//  3. The dart's barrel and flight stick out towards the camera, so they show up
//     displaced from the tip in a fixed image direction. Calibration learns that
//     direction from one dart pushed into the bull; the tip is the end of the
//     blob facing the other way.
// The Detector is pure (frames in, events out) so it can be tested without a camera.

/* ---------- homography ---------- */
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) if (r !== c) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i], [x, y] = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}
export function project(H, u, v) {
  const w = H[6] * u + H[7] * v + H[8];
  return [(H[0] * u + H[1] * v + H[2]) / w, (H[3] * u + H[4] * v + H[5]) / w];
}
// Board-mm targets for the four calibration handles: outer double wire, middle of 20, 6, 3, 11.
export const CAL_BOARD = [[0, -170], [170, 0], [0, 170], [-170, 0]];
export const CAL_NAMES = ["20", "6", "3", "11"];
export function calibrate(imgPts) {
  const H = homography(imgPts, CAL_BOARD), Hi = homography(CAL_BOARD, imgPts);
  return H && Hi ? { H, Hi } : null;
}

/* ---------- how sure are we about a board position ---------- */
const RINGS_MM = [6.35, 15.9, 99, 107, 162, 170];
export function nearWire(x, y, mm = 3) {
  const r = Math.hypot(x, y);
  if (RINGS_MM.some((R) => Math.abs(r - R) < mm)) return true;
  if (r < 15.9) return false;
  let a = ((Math.atan2(x, -y) * 180 / Math.PI) + 369) % 18; // degrees past the last wire
  const arc = Math.min(a, 18 - a) * Math.PI / 180 * r;      // mm to the nearest spoke
  return arc < mm;
}

/* ---------- the detector ---------- */
export class Detector {
  // roi: the part of the full frame this detector sees, in normalised coords; dirFn(u,v): tip->flight direction
  constructor({ w, h, H, dir = null, dirFn = null, roi = null, opts = {} }) {
    this.w = w; this.h = h; this.H = H; this.n = w * h;
    this.dir = dir; this.dirFn = dirFn;
    this.roi = roi || { x0: 0, y0: 0, x1: 1, y1: 1 };
    this.o = { diff: 24, stableFrames: 3, ...opts };
    this.mask0 = new Uint8Array(this.n);
    let c = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [bx, by] = project(H, ...this.norm(x + 0.5, y + 0.5));
      if (Math.hypot(bx, by) <= 182) { this.mask0[y * w + x] = 1; c++; }
    }
    this.roiCount = c;
    this.minDart = Math.max(10, c * 0.0004);
    this.maxDart = c * 0.06;
    this.motionPx = Math.max(6, c * 0.0015);
    this.prev = this.ref = this.empty = null;
    this.still = 0; this.moving = false; this.quiet = 0;
  }
  norm(x, y) { const r = this.roi; return [r.x0 + x / this.w * (r.x1 - r.x0), r.y0 + y / this.h * (r.y1 - r.y0)]; }
  setDir(d) { this.dir = d; }
  resetEmpty(g) { this.empty = g.slice(); this.ref = g.slice(); }
  count(a, b) {
    const T = this.o.diff, roi = this.mask0; let c = 0;
    for (let i = 0; i < this.n; i++) if (roi[i] && Math.abs(a[i] - b[i]) > T) c++;
    return c;
  }
  // changed pixels, with isolated specks removed (each must touch at least two changed neighbours)
  mask(a, b) {
    const { w, h, n } = this, roi = this.mask0, T = this.o.diff, m = new Uint8Array(n), out = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (roi[i] && Math.abs(a[i] - b[i]) > T) m[i] = 1;
    let c = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (!m[i]) continue;
      const k = m[i - 1] + m[i + 1] + m[i - w] + m[i + w] + m[i - w - 1] + m[i - w + 1] + m[i + w - 1] + m[i + w + 1];
      if (k >= 2) { out[i] = 1; c++; }
    }
    return { m: out, c };
  }
  largestBlob(m) {
    const { w, h, n } = this, seen = new Uint8Array(n); let best = null;
    const q = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      if (!m[s] || seen[s]) continue;
      let qh = 0, qt = 0; q[qt++] = s; seen[s] = 1; const px = [];
      while (qh < qt) {
        const i = q[qh++]; px.push(i);
        const x = i % w, y = (i / w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx; if (m[j] && !seen[j]) { seen[j] = 1; q[qt++] = j; }
        }
      }
      if (!best || px.length > best.length) best = px;
    }
    return best || [];
  }
  centroid(px) {
    let sx = 0, sy = 0; for (const i of px) { sx += i % this.w; sy += (i / this.w) | 0; }
    return [sx / px.length + 0.5, sy / px.length + 0.5];
  }
  // All the changed blobs that belong to the dart: the biggest, plus any near it (the shaft often
  // vanishes against black, splitting barrel from flight).
  dartPixels(m) {
    const { w, h, n } = this, seen = new Uint8Array(n), q = new Int32Array(n), blobs = [];
    for (let s = 0; s < n; s++) {
      if (!m[s] || seen[s]) continue;
      let qh = 0, qt = 0; q[qt++] = s; seen[s] = 1; const px = [];
      while (qh < qt) {
        const i = q[qh++]; px.push(i); const x = i % w, y = (i / w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx; if (m[j] && !seen[j]) { seen[j] = 1; q[qt++] = j; }
        }
      }
      if (px.length >= 3) blobs.push(px);
    }
    if (!blobs.length) return [];
    blobs.sort((a, b) => b.length - a.length);
    const [cx, cy] = this.centroid(blobs[0]), R = 0.4 * Math.max(w, h);
    let out = blobs[0];
    for (const b of blobs.slice(1)) { const [bx, by] = this.centroid(b); if (Math.hypot(bx - cx, by - cy) < R) out = out.concat(b); }
    return out;
  }
  axis(px) {
    const w = this.w, [cx, cy] = this.centroid(px);
    let d = this.dir;
    if (this.dirFn) d = this.dirFn(...this.norm(cx, cy));
    if (!d) d = [0, 1]; // no idea: assume the camera is below the board, so flights hang below their tips
    // a long thin blob gives its own axis; keep the predicted sense
    let sxx = 0, syy = 0, sxy = 0;
    for (const i of px) { const x = (i % w) + 0.5 - cx, y = ((i / w) | 0) + 0.5 - cy; sxx += x * x; syy += y * y; sxy += x * y; }
    const tr = sxx + syy, df = Math.sqrt((sxx - syy) ** 2 + 4 * sxy * sxy), l1 = (tr + df) / 2, l2 = (tr - df) / 2;
    if (l2 > 0 && l1 / l2 > 6) {
      let e = Math.abs(sxy) > 1e-9 ? [sxy, l1 - sxx] : (sxx >= syy ? [1, 0] : [0, 1]);
      const L = Math.hypot(...e); e = [e[0] / L, e[1] / L];
      if (e[0] * d[0] + e[1] * d[1] < 0) e = [-e[0], -e[1]];
      if (e[0] * d[0] + e[1] * d[1] > 0.6) d = e; // only if it roughly agrees with the board's pose
    }
    return d;
  }
  tip(px, g) {
    const w = this.w, d = this.axis(px);
    let min = Infinity, max = -Infinity; const pr = px.map((i) => { const p = (i % w) * d[0] + ((i / w) | 0) * d[1]; if (p < min) min = p; if (p > max) max = p; return p; });
    let sx = 0, sy = 0, k = 0;
    px.forEach((i, j) => { if (pr[j] <= min + 1.5) { sx += i % w; sy += (i / w) | 0; k++; } });
    let tx = sx / k + 0.5, ty = sy / k + 0.5;
    // the steel point is thin and often low-contrast: follow the dart's line on past the blob while anything changed
    if (g && this.ref) {
      const lim = Math.max(4, 0.35 * (max - min)), T = Math.max(8, this.o.diff * 0.45), pxv = [-d[1], d[0]];
      let miss = 0, last = 0;
      for (let s = 1; s <= lim; s++) {
        let hit = false;
        for (const o of [-1, 0, 1]) {
          const x = Math.floor(tx - d[0] * s + pxv[0] * o), y = Math.floor(ty - d[1] * s + pxv[1] * o);
          if (x < 0 || y < 0 || x >= w || y >= this.h) continue;
          const i = y * w + x; if (Math.abs(g[i] - this.ref[i]) > T) { hit = true; break; }
        }
        if (hit) { last = s; miss = 0; } else if (++miss > 2) break;
      }
      tx -= d[0] * last; ty -= d[1] * last;
    }
    return [tx, ty];
  }
  // Feed one grayscale frame (Uint8Array, w*h). Returns an event or null.
  feed(g) {
    if (!this.prev) { this.prev = g.slice(); this.ref = g.slice(); this.empty = g.slice(); return { type: "ready" }; }
    const motion = this.count(g, this.prev);
    this.prev = g.slice();
    if (motion > this.motionPx) { this.still = 0; this.moving = true; return null; }
    this.still++;
    if (this.still < this.o.stableFrames) return null;
    if (!this.moving) {
      // settled and quiet: slowly follow lighting drift when nothing has changed
      if (++this.quiet % 40 === 0 && this.count(g, this.ref) < this.minDart) this.ref = g.slice();
      return null;
    }
    this.moving = false; this.quiet = 0;
    const { m, c } = this.mask(g, this.ref);
    if (c < this.minDart) return { type: "none" };
    // back to (nearly) the empty board, having had darts in it: the darts were pulled
    const e0 = this.count(g, this.empty), refE = this.count(this.ref, this.empty);
    if (e0 < Math.max(this.minDart * 3, this.maxDart * 0.08) && refE > e0 * 2) { this.ref = g.slice(); this.empty = g.slice(); return { type: "takeout" }; }
    if (c > this.maxDart) {
      // something big is in the way (a hand, a person) or the camera moved: keep the old reference,
      // so the next settled picture is still compared with the board as it was. The app re-finds the board if this persists.
      const e = this.count(g, this.empty);
      if (e < this.maxDart * 0.25) { this.ref = g.slice(); this.empty = g.slice(); return { type: "takeout" }; }
      return { type: "big", changed: c };
    }
    const blob = this.dartPixels(m);
    if (blob.length < this.minDart) { this.ref = g.slice(); return { type: "none" }; }
    const [tx, ty] = this.tip(blob, g);
    const [cx, cy] = this.centroid(blob);
    this.ref = g.slice();
    const [u, v] = this.norm(tx, ty);
    const [bx, by] = project(this.H, u, v);
    return { type: "dart", tip: [u, v], centroid: this.norm(cx, cy), board: [bx, by], size: blob.length };
  }
}
// Direction (pixel space, tip -> flight) from a dart pushed into the bull.
export function dirFromBull(ev, Hi, w, h) {
  const [bu, bv] = project(Hi, 0, 0);
  const dx = (ev.centroid[0] - bu) * w, dy = (ev.centroid[1] - bv) * h, L = Math.hypot(dx, dy); // w,h: frame aspect
  return L > 1.5 ? [dx / L, dy / L] : null;
}

/* ---------- the browser side: camera, frames, snapshots ---------- */
export class LiveCamera {
  constructor(video) { this.video = video; this.stream = null; this.cv = document.createElement("canvas"); this.cx = this.cv.getContext("2d", { willReadFrequently: true }); this.timer = null; }
  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no camera"), { code: "unsupported" });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    this.video.srcObject = this.stream; this.video.muted = true; this.video.setAttribute("playsinline", "");
    await this.video.play();
    await new Promise((r) => (this.video.videoWidth ? r() : this.video.addEventListener("loadedmetadata", r, { once: true })));
    // lock exposure/focus drift where the browser allows it, so frames compare cleanly
    try {
      const t = this.stream.getVideoTracks()[0], caps = t.getCapabilities?.() || {}, adv = {};
      if (caps.exposureMode?.includes("continuous")) adv.exposureMode = "continuous";
      if (caps.focusMode?.includes("continuous")) adv.focusMode = "continuous";
      if (Object.keys(adv).length) await t.applyConstraints({ advanced: [adv] });
    } catch {}
    this.crop = null;
    this.w = 320; this.h = Math.round(320 * this.video.videoHeight / this.video.videoWidth);
    this.cv.width = this.w; this.cv.height = this.h;
    return { w: this.w, h: this.h, aspect: this.video.videoWidth / this.video.videoHeight, vw: this.video.videoWidth, vh: this.video.videoHeight };
  }
  // Watch only the board: crop to roi (normalised) at native resolution, capped at maxPx on the long side.
  setROI(roi, maxPx = 560) {
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    if (!roi) roi = { x0: 0, y0: 0, x1: 1, y1: 1 };
    const sw = (roi.x1 - roi.x0) * vw, sh = (roi.y1 - roi.y0) * vh, k = Math.min(1, maxPx / Math.max(sw, sh));
    this.crop = { sx: roi.x0 * vw, sy: roi.y0 * vh, sw, sh };
    this.w = Math.max(16, Math.round(sw * k)); this.h = Math.max(16, Math.round(sh * k));
    this.cv.width = this.w; this.cv.height = this.h;
    return { w: this.w, h: this.h, roi };
  }
  // The whole frame as ImageData, up to maxW wide (for finding the board).
  image(maxW = 1920) {
    const vw = this.video.videoWidth, vh = this.video.videoHeight, k = Math.min(1, maxW / vw);
    const c = this.full || (this.full = document.createElement("canvas")); c.width = Math.round(vw * k); c.height = Math.round(vh * k);
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(this.video, 0, 0, c.width, c.height);
    return x.getImageData(0, 0, c.width, c.height);
  }
  gray() {
    const cr = this.crop;
    if (cr) this.cx.drawImage(this.video, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, this.w, this.h);
    else this.cx.drawImage(this.video, 0, 0, this.w, this.h);
    const d = this.cx.getImageData(0, 0, this.w, this.h).data, g = new Uint8Array(this.w * this.h);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    return g;
  }
  loop(fn, ms = 90) { this.stopLoop(); this.timer = setInterval(() => { if (this.video.readyState >= 2) fn(this.gray()); }, ms); }
  stopLoop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  // A still at up to maxW wide, as base64 JPEG (no data: prefix).
  snapshot(maxW = 1600) {
    const vw = this.video.videoWidth, vh = this.video.videoHeight, s = Math.min(1, maxW / vw);
    const c = document.createElement("canvas"); c.width = Math.round(vw * s); c.height = Math.round(vh * s);
    c.getContext("2d").drawImage(this.video, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  }
  stop() { this.stopLoop(); this.stream?.getTracks().forEach((t) => t.stop()); this.stream = null; this.video.srcObject = null; }
  get on() { return !!this.stream; }
}

// Draw the calibrated board's wires over an image area of size w x h.
export function drawOverlay(ctx, Hi, w, h, { color = "rgba(255,255,255,.85)", accent = "#e35647", tips = [] } = {}) {
  const P = (x, y) => { const [u, v] = project(Hi, x, y); return [u * w, v * h]; };
  const SEG = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  ctx.save(); ctx.lineWidth = 1.2; ctx.strokeStyle = color;
  for (const r of [6.35, 15.9, 99, 107, 162, 170]) {
    ctx.beginPath();
    for (let k = 0; k <= 96; k++) { const a = k / 96 * 2 * Math.PI, [x, y] = P(r * Math.sin(a), -r * Math.cos(a)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 20; i++) { const a = (i * 18 - 9) * Math.PI / 180; const [x0, y0] = P(15.9 * Math.sin(a), -15.9 * Math.cos(a)), [x1, y1] = P(170 * Math.sin(a), -170 * Math.cos(a)); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
  ctx.stroke();
  ctx.fillStyle = color; ctx.font = `700 ${Math.max(11, w / 32)}px system-ui,sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  SEG.forEach((s, i) => { const a = i * 18 * Math.PI / 180, [x, y] = P(188 * Math.sin(a), -188 * Math.cos(a)); ctx.fillText(String(s), x, y); });
  for (const [u, v] of tips) { ctx.beginPath(); ctx.arc(u * w, v * h, Math.max(5, w / 70), 0, 2 * Math.PI); ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.lineWidth = 1.6; ctx.strokeStyle = accent; ctx.stroke(); }
  ctx.restore();
}

// The part of the frame the board (out to the number ring) covers, padded, in normalised coords.
export function boardROI(Hi, pad = 0.02) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (let a = 0; a < 360; a += 6) { const t = a * Math.PI / 180, [u, v] = project(Hi, 195 * Math.sin(t), -195 * Math.cos(t)); x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
  return { x0: Math.max(0, x0 - pad), y0: Math.max(0, y0 - pad), x1: Math.min(1, x1 + pad), y1: Math.min(1, y1 + pad) };
}
