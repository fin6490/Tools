// confetti.js — lightweight canvas confetti burst. Respects reduced-motion.
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");
let pieces = [];
let raf = null;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const COLORS = ["#6c8bff", "#b06cff", "#37d9a0", "#ffca5c", "#ff6b7a", "#ffffff"];

export function burst(count = 160) {
  if (reduce) return;
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 240,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -16 - 4,
      size: Math.random() * 8 + 4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pieces.forEach((p) => {
    p.vy += 0.35; // gravity
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.99;
    p.rot += p.vr;
    p.life -= 0.008;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  });
  pieces = pieces.filter((p) => p.life > 0 && p.y < canvas.height + 40);
  if (pieces.length) {
    raf = requestAnimationFrame(tick);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    raf = null;
  }
}
