export function confetti(cv, styleEl) {
  const ctx = cv.getContext('2d'), d = devicePixelRatio || 1;
  cv.width = innerWidth * d; cv.height = innerHeight * d;
  const cs = getComputedStyle(styleEl);
  const cols = ['--x-rose', '--x-gold', '--x-name'].map((v) => cs.getPropertyValue(v).trim()).concat('#FFFFFF');
  const W = cv.width, H = cv.height;
  const parts = Array.from({ length: 190 }, (_, i) => ({
    x: W / 2 + (Math.random() - .5) * W * .25, y: H * .5,
    vx: (Math.random() - .5) * 16 * d, vy: -(Math.random() * 15 + 7) * d,
    w: (Math.random() * 6 + 5) * d, h: (Math.random() * 8 + 7) * d,
    rot: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length], heart: Math.random() < .3,
  }));
  const heart = (s) => {
    ctx.beginPath(); ctx.moveTo(0, s * .3);
    ctx.bezierCurveTo(0, 0, -s * .5, 0, -s * .5, s * .3); ctx.bezierCurveTo(-s * .5, s * .6, 0, s * .8, 0, s);
    ctx.bezierCurveTo(0, s * .8, s * .5, s * .6, s * .5, s * .3); ctx.bezierCurveTo(s * .5, 0, 0, 0, 0, s * .3); ctx.fill();
  };
  const start = performance.now();
  const tick = (now) => {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    parts.forEach((p) => {
      p.vy += .35 * d; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y < H + 40) alive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.heart) heart(p.w * 1.6); else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * .5);
      ctx.restore();
    });
    if (alive && now - start < 7000) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(tick);
}
