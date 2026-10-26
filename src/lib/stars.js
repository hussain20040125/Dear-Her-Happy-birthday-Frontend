import { reducedMotion } from './format';

// Twinkling stars + drifting petals. Returns a stop function.
export function startStars(cv, styleEl) {
  const ctx = cv.getContext('2d');
  const reduce = reducedMotion();
  const cs = getComputedStyle(styleEl);
  const starCol = cs.getPropertyValue('--x-star').trim();
  const petalCol = cs.getPropertyValue('--x-rose').trim();
  let raf, stopped = false;

  const size = () => { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; };
  size(); addEventListener('resize', size);

  const stars = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .3, a: Math.random() * .6 + .3, p: Math.random() * 6.28, sp: Math.random() * 1.5 + .5 }));
  const petals = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), vy: Math.random() * .0007 + .0004, p: Math.random() * 6.28, s: Math.random() * 5 + 5, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .02 }));

  const frame = (t) => {
    if (stopped) return;
    const W = cv.width, H = cv.height, d = devicePixelRatio || 1;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = starCol;
    stars.forEach((s) => {
      ctx.globalAlpha = reduce ? s.a : s.a * (.55 + .45 * Math.sin(t / 900 * s.sp + s.p));
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r * d, 0, 6.283); ctx.fill();
    });
    ctx.fillStyle = petalCol;
    petals.forEach((p) => {
      if (!reduce) { p.y += p.vy; p.x += Math.sin(t / 1600 + p.p) * .0005; p.rot += p.vr; if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); } }
      ctx.globalAlpha = .45; ctx.save(); ctx.translate(p.x * W, p.y * H); ctx.rotate(p.rot);
      ctx.beginPath(); ctx.ellipse(0, 0, p.s * d, p.s * .55 * d, 0, 0, 6.283); ctx.fill(); ctx.restore();
    });
    ctx.globalAlpha = 1;
    if (!reduce) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => { stopped = true; cancelAnimationFrame(raf); removeEventListener('resize', size); };
}
