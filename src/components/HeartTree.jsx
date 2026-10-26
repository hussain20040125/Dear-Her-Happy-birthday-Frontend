import { useEffect, useRef } from 'react';
import { reducedMotion } from '../lib/format';

// Small seeded random, so the tree grows the same shape every time
function seeded(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeInOut = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
const easeOutBack = (p) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2);

// The big heart outline, in units of the canvas width (S). The canvas is 1.03 S tall.
const HX = .5, HY = .365, HK = .42 / 16;
const curve = (t) => [HX + 16 * Math.sin(t) ** 3 * HK, HY - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * HK];
const OUTLINE = Array.from({ length: 160 }, (_, i) => curve((i / 160) * Math.PI * 2));
const CENTER = [HX, HY + 2 * HK];
function inside([x, y], shrink = 1) {
  const px = CENTER[0] + (x - CENTER[0]) / shrink, py = CENTER[1] + (y - CENTER[1]) / shrink;
  let hit = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i], [xj, yj] = OUTLINE[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function build(n) {
  const rnd = seeded(21);
  const segs = [];
  const SPEED = .32; // canvas widths per second, so growth is one continuous motion

  // trunk: a gently curving column from the ground into the heart
  const trunk = [[.5, 1], [.506, .94], [.494, .87], [.502, .79], [.5, .72]];
  let dist = 0;
  for (let i = 0; i < trunk.length - 1; i++) {
    const [x, y] = trunk[i], [x2, y2] = trunk[i + 1];
    const len = Math.hypot(x2 - x, y2 - y);
    segs.push({ x, y, x2, y2, w: .066 - i * .009, t0: dist / SPEED, dur: len / SPEED });
    dist += len;
  }

  // branches stay inside the heart so the silhouette stays clean
  function branch(x, y, ang, len, w, depth, d0) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    if (!inside([x2, y2], .9)) return;
    segs.push({ x, y, x2, y2, w, t0: d0 / SPEED, dur: len / SPEED });
    if (depth <= 0) return;
    const kids = depth > 3 ? 2 : rnd() < .55 ? 2 : 3;
    for (let k = 0; k < kids; k++) {
      const side = k % 2 ? 1 : -1;
      const spread = kids === 3 && k === 2 ? (rnd() - .5) * .2 : side * (.28 + rnd() * .34);
      branch(x2, y2, ang + spread, len * (.7 + rnd() * .1), w * .68, depth - 1, d0 + len);
    }
  }
  [-.62, -.05, .55].forEach((a) => branch(.5, .72, -Math.PI / 2 + a, .13, .028, 5, dist));
  branch(.501, .77, -Math.PI / 2 - 1.05, .09, .016, 3, dist - .05);
  branch(.501, .76, -Math.PI / 2 + 1.0, .09, .016, 3, dist - .04);
  const grow = Math.max(...segs.map((s) => s.t0 + s.dur));

  // the canopy: little hearts packed into the big heart, with extra ones on the rim for a crisp outline
  const hearts = [];
  while (hearts.length < n) {
    const rim = hearts.length < n * .24;
    const [ex, ey] = curve(rnd() * Math.PI * 2);
    const r = rim ? .9 + rnd() * .1 : Math.sqrt(rnd()) * .95;
    const x = CENTER[0] + (ex - CENTER[0]) * r, y = CENTER[1] + (ey - CENTER[1]) * r;
    const d = Math.hypot(x - .5, y - .72) / .7;
    hearts.push({
      x, y,
      s: .017 + rnd() * .022,
      rot: (rnd() - .5) * .8,
      c: Math.floor(rnd() * 4),
      a: .72 + rnd() * .28,
      t0: grow * .72 + d * 2.6 + rnd() * .35,
      ph: rnd() * Math.PI * 2,
    });
  }
  hearts.sort((a, b) => a.s - b.s);
  return { segs, hearts, grow, full: Math.max(...hearts.map((h) => h.t0)) + .8 };
}

// Pre-drawn heart images, one per color: far cheaper to stamp than drawing hundreds of curves each frame
function sprite(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.translate(32, 34);
  g.scale(3.4, 3.4);
  g.beginPath();
  g.moveTo(0, -3);
  g.bezierCurveTo(0, -9, -8, -9, -8, -3.5);
  g.bezierCurveTo(-8, 1, -2, 4, 0, 7);
  g.bezierCurveTo(2, 4, 8, 1, 8, -3.5);
  g.bezierCurveTo(8, -9, 0, -9, 0, -3);
  g.fill();
  return c;
}

/**
 * A tree that grows from the ground and blooms into a heart made of little hearts,
 * then lets a few drift down. Colors come from the active template.
 * active: animate only while its scene is showing; delay: seconds before it starts growing
 */
export default function HeartTree({ active, delay = 0 }) {
  const ref = useRef();

  useEffect(() => {
    if (!active) return;
    const cv = ref.current, ctx = cv.getContext('2d');
    const css = getComputedStyle(cv);
    const col = (v, fb) => css.getPropertyValue(v).trim() || fb;
    const sprites = [col('--x-rose', '#E8A0B4'), col('--x-name', '#F2CF9C'), col('--x-gold', '#E9C58F'), col('--x-env3', '#A33A5E')].map(sprite);
    const bark = col('--x-soft', '#CFA3B3'), glow = col('--x-gold', '#E9C58F');
    const still = reducedMotion();

    let S = 0, tree = null, raf = 0, last = 0;
    const falling = [];
    let nextDrop = 0;
    const size = () => {
      const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
      S = cv.width;
      tree = tree || build(r.width < 300 ? 340 : r.width < 480 ? 520 : 700);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);

    const start = performance.now() + delay * 1000;
    const stamp = (img, x, y, s, rot, alpha) => {
      const k = s / 56, c = Math.cos(rot) * k, sn = Math.sin(rot) * k;
      ctx.globalAlpha = alpha;
      ctx.setTransform(c, sn, -sn, c, x, y);
      ctx.drawImage(img, -32, -32);
    };

    function frame(now) {
      const dt = Math.min(.05, (now - (last || now)) / 1000);
      last = now;
      const t = still ? 99 : Math.max(0, (now - start) / 1000);
      // growth follows one eased clock, so trunk and branches flow continuously instead of in steps
      const tg = t >= tree.grow ? t : tree.grow * easeInOut(t / tree.grow);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);

      // warm glow behind the canopy as it fills
      const g = Math.min(1, Math.max(0, (t - tree.grow) / 2.5));
      if (g > 0) {
        const rg = ctx.createRadialGradient(S * .5, S * .4, 0, S * .5, S * .4, S * .48);
        rg.addColorStop(0, glow + '30'); rg.addColorStop(.75, glow + '0c'); rg.addColorStop(1, glow + '00');
        ctx.globalAlpha = g;
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, S, cv.height);
      }

      // ground
      const gp = easeInOut(Math.min(1, t / .8));
      ctx.globalAlpha = .3 * gp;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(S * .5, S * 1.005, S * .26 * gp, S * .01, 0, 0, Math.PI * 2);
      ctx.fill();

      // trunk and branches
      ctx.globalAlpha = 1;
      ctx.strokeStyle = bark;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of tree.segs) {
        if (tg <= s.t0) continue;
        const p = Math.min(1, (tg - s.t0) / s.dur);
        ctx.lineWidth = Math.max(1, s.w * S * (.6 + .4 * p));
        ctx.beginPath();
        ctx.moveTo(s.x * S, s.y * S);
        ctx.lineTo((s.x + (s.x2 - s.x) * p) * S, (s.y + (s.y2 - s.y) * p) * S);
        ctx.stroke();
      }

      // hearts bloom, then sway a little more toward the top like leaves in a breeze
      for (const h of tree.hearts) {
        if (t <= h.t0) continue;
        const p = Math.min(1, (t - h.t0) / .75);
        const lift = 1 - h.y;
        const sway = Math.sin(t * 1.2 + h.ph) * S * .0035 * lift + Math.sin(t * .5) * S * .002 * lift;
        stamp(sprites[h.c], h.x * S + sway, h.y * S, h.s * S * easeOutBack(p), h.rot + Math.sin(t * .9 + h.ph) * .07, h.a * Math.min(1, p * 1.6));
      }

      // once in full bloom, a heart drifts down every so often
      if (!still && t > tree.full && now > nextDrop) {
        nextDrop = now + 350 + Math.random() * 450;
        const h = tree.hearts[Math.floor(Math.random() * tree.hearts.length)];
        falling.push({ x: h.x, y: h.y, s: h.s, c: h.c, rot: h.rot, vy: 0, ph: Math.random() * 6, spin: (Math.random() - .5) * 1.4, life: 1 });
      }
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i];
        f.vy = Math.min(.075, f.vy + .05 * dt);
        f.y += f.vy * dt;
        f.x += Math.sin(now / 700 + f.ph) * .035 * dt;
        f.rot += f.spin * dt;
        if (f.y > 1) { f.y = 1; f.life -= dt * 1.2; }
        if (f.life <= 0) { falling.splice(i, 1); continue; }
        stamp(sprites[f.c], f.x * S, f.y * S, f.s * S, f.rot, .9 * f.life);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      if (!still) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [active, delay]);

  return <canvas ref={ref} className="heart-tree" aria-hidden="true" />;
}
