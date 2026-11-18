// Tiny canvas confetti: burst(x, y, big) from a screen point.
let cv, ctx, parts = [], raf;
const COLORS = ["#7c5cff", "#22d3ee", "#ffd34d", "#ff5c8a", "#4ade80", "#fff"];
function loop() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.life > 0 && p.y < cv.height + 20);
  for (const p of parts) {
    p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr; p.life--;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
    ctx.globalAlpha = Math.min(1, p.life / 25);
    ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : (cancelAnimationFrame(raf), (raf = 0));
}
export function burst(x, y, big = false) {
  if (!cv) {
    cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99";
    document.body.appendChild(cv); ctx = cv.getContext("2d");
  }
  cv.width = innerWidth; cv.height = innerHeight;
  const n = big ? 220 : 26;
  for (let i = 0; i < n; i++) {
    const a = big ? Math.random() * 6.28 : -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const v = (big ? 6 : 3) + Math.random() * (big ? 9 : 5);
    parts.push({ x: big ? innerWidth / 2 : x, y: big ? innerHeight / 3 : y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: COLORS[(Math.random() * COLORS.length) | 0], life: 70 + Math.random() * 50 });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}
