import { useEffect, useRef, useState } from 'react';
import { MagPage } from '../lib/magazine';

const TURN_MS = 1100;

// Page size from the screen: a two-page spread when there's room, one page on phones
// z: the stage zoom, so sizes are in the zoomed space the pages render in
function measure(z = 1) {
  const vv = window.visualViewport;
  const W = Math.min(innerWidth, vv?.width || innerWidth) / z, H = Math.min(innerHeight, vv?.height || innerHeight) / z;
  const tall = (H - (H < 600 ? 170 : 290)) * .7;
  const spreadW = Math.min(W >= 1600 ? 520 : 440, (W - 56) / 2, tall);
  if (W >= 720 && spreadW >= 250) return { spread: true, pw: Math.floor(spreadW) };
  return { spread: false, pw: Math.floor(Math.max(170, Math.min(420, W - 40, tall))) };
}

/**
 * The birthday-issue magazine she flips through. Pages turn over the spine like a real magazine.
 * pages: resolved page data (see lib/magazine), always an even count
 */
export default function Magazine({ pages, info, active, onDone, zoom = 1 }) {
  const [size, setSize] = useState(() => measure(zoom));
  const [flipped, setFlipped] = useState(0);
  const [moving, setMoving] = useState(-1);
  const moveT = useRef(), swipe = useRef(null);

  const rendered = pages.map((p) => <MagPage key={p.id} page={p} info={info} />);
  // a spread turns two pages per leaf (front + back); a phone turns one
  const leaves = size.spread
    ? Array.from({ length: rendered.length / 2 }, (_, i) => [rendered[2 * i], rendered[2 * i + 1]])
    : rendered.map((p) => [p, null]);
  const L = leaves.length;
  const done = size.spread ? flipped >= L : flipped >= L - 1;

  useEffect(() => {
    const onResize = () => setSize((old) => {
      const next = measure(zoom);
      if (next.spread !== old.spread) setFlipped((f) => (next.spread ? Math.ceil(f / 2) : Math.max(0, f * 2 - 1)));
      return next;
    });
    onResize();
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, [zoom]);
  useEffect(() => () => clearTimeout(moveT.current), []);

  function go(d) {
    const max = size.spread ? L : L - 1;
    const f = flipped + d;
    if (f < 0 || f > max) return;
    setMoving(d > 0 ? flipped : f);
    setFlipped(f);
    clearTimeout(moveT.current);
    moveT.current = setTimeout(() => setMoving(-1), TURN_MS);
  }

  useEffect(() => {
    if (!active) return;
    const k = (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });

  function down(e) { swipe.current = { x: e.clientX, y: e.clientY }; }
  function up(e) {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) { go(dx < 0 ? 1 : -1); return; }
    const r = e.currentTarget.getBoundingClientRect();
    go(e.clientX - r.left > r.width * (size.spread ? .5 : .3) ? 1 : -1);
  }

  const total = pages.length;
  let label;
  if (flipped === 0) label = 'Your very own magazine. Tap to turn the page';
  else if (done) label = 'Back cover';
  else if (size.spread) label = `Pages ${flipped * 2}–${flipped * 2 + 1} of ${total}`;
  else label = `Page ${flipped + 1} of ${total}`;

  // a closed magazine sits centered on its cover; an open one centers on the spine
  const shift = !size.spread ? 0 : flipped === 0 ? -25 : flipped >= L ? 25 : 0;

  return (
    <>
      <p className="x-sub" aria-live="polite">{label}</p>
      <div className="mag-stage" onPointerDown={down} onPointerUp={up} role="group" aria-roledescription="magazine" aria-label="The birthday issue">
        <div className={`book ${size.spread ? 'spread' : 'single'}`}
          style={{ '--pw': size.pw + 'px', width: size.spread ? size.pw * 2 : size.pw, height: Math.round(size.pw / .7), transform: `translateX(${shift}%)` }}>
          {leaves.map(([front, back], i) => {
            const turned = i < flipped;
            return (
              <div key={i} className={`leaf ${turned ? 'turned' : ''} ${moving === i ? 'moving' : ''}`}
                style={{ zIndex: moving === i ? 500 : turned ? i + 1 : L - i }}>
                <div className="face front" aria-hidden={turned}>{front}</div>
                <div className="face back" aria-hidden={!turned}>{back || <div className="mg mg-blank" />}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mg-nav">
        <button className="x-link" type="button" onClick={() => go(-1)} disabled={flipped === 0}>Previous</button>
        {done
          ? <button className="x-btn" type="button" onClick={onDone}>One last thing</button>
          : <button className="x-link" type="button" onClick={() => go(1)}>Next page</button>}
      </div>
    </>
  );
}
