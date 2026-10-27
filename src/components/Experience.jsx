import { useCallback, useEffect, useRef, useState } from 'react';
import { startStars } from '../lib/stars';
import { confetti } from '../lib/confetti';
import { createMusic } from '../lib/music';
import Magazine from './Magazine';
import HeartTree from './HeartTree';
import { magInfo, resolvePages } from '../lib/magazine';
import { formatWhen, initial, pad, reducedMotion } from '../lib/format';

const CANDLES = [
  { x: 92, top: 22, body: 50, h: 40, hit: [78, 16, 74] },
  { x: 120, top: 14, body: 42, h: 48, hit: [106, 8, 82] },
  { x: 148, top: 22, body: 50, h: 40, hit: [134, 16, 74] },
];

// Steady per-photo wobble in [-1, 1], so the scatter looks hand-placed but stays the same
const wob = (i, k) => (((i + 1) * k) % 13) / 6 - 1;

// Scatter the photos across the screen in loose rows, above the caption and button
// Big screens scale the whole experience up, as if it were designed for them (phones and laptops stay at 1)
const viewW = () => Math.min(innerWidth, window.visualViewport?.width || innerWidth);
const stageZoom = () => Math.min(2.4, Math.max(1, Math.min(viewW() / 1280, innerHeight / 760)));

// z: the stage zoom; rects come back in screen pixels, positions are set in zoomed pixels
function scatter(stackEl, belowEl, n, z = 1) {
  if (!stackEl || !belowEl || !n) return [];
  const st = stackEl.getBoundingClientRect();
  const cardW = st.width / z, cardH = st.height / z;
  const W = viewW() / z, top = 64, bottom = belowEl.getBoundingClientRect().top / z - 12;
  const H = Math.max(160, bottom - top);
  // pick the column count that lets the cards be biggest
  let best = { s: 0, cols: 1 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const s = Math.min(.64, (W / cols) * .86 / cardW, (H / rows) * 1.02 / cardH);
    if (s > best.s) best = { s, cols };
  }
  const { s, cols } = best;
  const rows = Math.ceil(n / cols);
  const cw = W / cols, ch = H / rows;
  const cx = st.left / z + cardW / 2, cy = st.top / z + cardH / 2;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? n - row * cols : cols; // center a short last row
    const col = i % cols + (cols - inRow) / 2;
    return {
      x: (col + .5) * cw + wob(i, 5) * cw * .08 - cx,
      y: top + (row + .5) * ch + wob(i, 7) * ch * .1 - cy,
      r: wob(i, 3) * 7,
      s,
    };
  });
}

/**
 * The full surprise she opens.
 * preview: creator mode (shows Exit + Skip the wait)
 * onUnlock: called when the countdown hits zero on a locked public site, so the parent can refetch content
 * celebrate: she was watching the countdown when it reached zero, so play the unlock moment
 */
export default function Experience({ site, preview = false, onExit, onUnlock, celebrate = false }) {
  const rootRef = useRef(), starsRef = useRef(), confRef = useRef(), letterRef = useRef();
  const musicRef = useRef(null), typeT = useRef(), unlockCalled = useRef(false), timers = useRef([]);

  // dev only: ?scene=mag (etc.) jumps straight to a scene for layout checks
const [scene, setScene] = useState(() => (import.meta.env.DEV && new URLSearchParams(location.search).get('scene')) || 'lock');
  const [now, setNow] = useState(Date.now());
  const [envOpen, setEnvOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [typing, setTyping] = useState(false);
  const [letterDone, setLetterDone] = useState(false);
  const [gi, setGi] = useState(0);
  const [fanned, setFanned] = useState(false);
  const [pos, setPos] = useState({});
  const [z, setZ] = useState({});
  const [tossDir, setTossDir] = useState({});
  const [dragI, setDragI] = useState(-1);
  const drag = useRef(null), zTop = useRef(100), stackRef = useRef(), countRef = useRef();
  const [spread, setSpread] = useState([]);
  const [zoom, setZoom] = useState(stageZoom);
  const [out, setOut] = useState([false, false, false]);
  const [hbd, setHbd] = useState(false);
  const [replay, setReplay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [needTap, setNeedTap] = useState(false);
  const userPaused = useRef(false), openRef = useRef(false);
  const [magKey, setMagKey] = useState(0);
  const [burst, setBurst] = useState(false);
  const lockedAtStart = useRef(new Date(site.unlockAt) > Date.now());

  const her = (site.herName || '').trim();
  const him = (site.yourName || '').trim();
  const photos = site.photos || [];
  const n = photos.length;
  const letter = site.letter || '';
  const magPages = resolvePages(site);
  const hasMag = magPages.length > 0;
  const diff = new Date(site.unlockAt) - now;
  const unlocked = diff <= 0;
  openRef.current = unlocked;
  const hasMusic = site.music !== 'none' && (site.music !== 'custom' || !!site.song?.url);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  // countdown clock
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // midnight arrived on a locked public page: fetch the real content
  useEffect(() => {
    if (unlocked && site.locked && onUnlock && !unlockCalled.current) { unlockCalled.current = true; onUnlock(); }
  }, [unlocked, site.locked, onUnlock]);
  // the unlock moment: a flash of light, confetti, and her name blooming in
  useEffect(() => {
    if (!unlocked || site.locked || burst) return;
    if (!celebrate && !lockedAtStart.current) return;
    setBurst(true);
    later(() => confetti(confRef.current, rootRef.current), 350);
  }, [unlocked, site.locked, celebrate, burst]); // eslint-disable-line react-hooks/exhaustive-deps
  // lay the photos out across the screen once she has seen them all
  useEffect(() => {
    if (!fanned) return;
    const lay = () => setSpread(scatter(stackRef.current, countRef.current, n, zoom));
    lay();
    addEventListener('resize', lay);
    return () => removeEventListener('resize', lay);
  }, [fanned, n, zoom]);
  useEffect(() => {
    const r = () => setZoom(stageZoom());
    addEventListener('resize', r);
    return () => removeEventListener('resize', r);
  }, []);
  useEffect(() => startStars(starsRef.current, rootRef.current), [site.template]);
  useEffect(() => {
    const m = createMusic(site.music, setPlaying, site.song);
    musicRef.current = m;
    if (!hasMusic) return () => m.destroy();
    // the song plays from the moment it's open (or the moment the countdown ends). Browsers block sound
    // until her first tap, so during the countdown that tap only unlocks audio, ready for zero.
    const go = () => { if (!userPaused.current) (openRef.current ? m.start() : m.prime()); };
    go();
    const retry = setTimeout(go, 2000);
    const ask = setTimeout(() => { if (!navigator.userActivation?.hasBeenActive) setNeedTap(true); }, 450);
    const kick = (e) => { if (!e.target.closest?.('.x-music')) { go(); setNeedTap(false); } };
    const evs = ['pointerdown', 'keydown', 'touchstart'];
    evs.forEach((n) => addEventListener(n, kick, true));
    return () => { clearTimeout(retry); clearTimeout(ask); evs.forEach((n) => removeEventListener(n, kick, true)); m.destroy(); };
  }, [site.music, site.song?.url, site.song?.start, site.song?.end]); // eslint-disable-line react-hooks/exhaustive-deps
  // the countdown just hit zero: start the song right now
  useEffect(() => {
    if (!unlocked || !hasMusic || !lockedAtStart.current) return;
    if (!userPaused.current) musicRef.current?.start();
    const t = setTimeout(() => setNeedTap(true), 900); // only shows if sound is still blocked
    return () => clearTimeout(t);
  }, [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; timers.current.forEach(clearTimeout); clearTimeout(typeT.current); };
  }, []);
  useEffect(() => {
    if (!preview) return;
    const k = (e) => e.key === 'Escape' && onExit?.();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [preview, onExit]);

  const finishType = useCallback(() => {
    clearTimeout(typeT.current);
    setTyped(letter); setTyping(false); setLetterDone(true);
  }, [letter]);

  function startTyping() {
    setTyped(''); setLetterDone(false); setTyping(true);
    if (reducedMotion()) { finishType(); return; }
    let i = 0;
    const step = () => {
      i++;
      setTyped(letter.slice(0, i));
      const ch = letter[i - 1];
      if (ch === '\n') letterRef.current?.scrollTo({ top: letterRef.current.scrollHeight, behavior: 'smooth' });
      let d = 24;
      if ('.!?'.includes(ch)) d = 300; else if (ch === ',') d = 140; else if (ch === '\n') d = 220;
      if (i < letter.length) typeT.current = setTimeout(step, d); else finishType();
    };
    typeT.current = setTimeout(step, 500);
  }

  function openEnvelope() {
    if (envOpen) return;
    setEnvOpen(true);
    if (!userPaused.current) musicRef.current.start();
    later(() => { setScene('letter'); startTyping(); }, 1900);
  }

  function toss(i, dir) {
    if (i !== gi) return;
    const next = gi + 1;
    setGi(next);
    setTossDir((d) => ({ ...d, [i]: dir || (i % 2 ? 'l' : 'r') }));
    setPos((p) => ({ ...p, [i]: { x: 0, y: 0 } }));
    if (next >= n) later(() => setFanned(true), 450);
  }

  // Drag: flick the top photo away while flipping; once fanned, move any photo around
  function dragStart(e, i) {
    if (!fanned && i !== gi) return;
    const p = pos[i] || { x: 0, y: 0 };
    drag.current = { i, sx: e.clientX / zoom - p.x, sy: e.clientY / zoom - p.y, ox: p.x, oy: p.y, x: p.x, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragI(i);
    if (fanned) setZ((z) => ({ ...z, [i]: ++zTop.current }));
  }

  function dragMove(e) {
    const d = drag.current;
    if (!d) return;
    const x = e.clientX / zoom - d.sx, y = e.clientY / zoom - d.sy;
    if (Math.hypot(x - d.ox, y - d.oy) > 6) d.moved = true;
    d.x = x;
    setPos((p) => ({ ...p, [d.i]: { x, y } }));
  }

  function dragEnd() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragI(-1);
    if (fanned) return;
    if (!d.moved) toss(d.i);
    else if (Math.abs(d.x) > 90) toss(d.i, d.x > 0 ? 'r' : 'l');
    else setPos((p) => ({ ...p, [d.i]: { x: 0, y: 0 } }));
  }

  function blow(i) {
    if (out[i]) return;
    const next = out.map((v, k) => (k === i ? true : v));
    setOut(next);
    if (next.every(Boolean)) {
      later(() => { confetti(confRef.current, rootRef.current); setHbd(true); }, 500);
      later(() => setReplay(true), 2200);
    }
  }

  function restart() {
    timers.current.forEach(clearTimeout); clearTimeout(typeT.current);
    setEnvOpen(false); setTyped(''); setTyping(false); setLetterDone(false);
    setGi(0); setFanned(false); setPos({}); setZ({}); setTossDir({}); setOut([false, false, false]); setHbd(false); setReplay(false);
    setMagKey((k) => k + 1);
    setScene('lock');
  }

  const cls = (id, extra = '') => `scene ${id === 'lock' ? '' : 'enter'} ${extra} ${scene === id ? 'active' : ''}`;
  const s = Math.max(0, Math.floor(diff / 1000));
  const allOut = out.every(Boolean);
  const final = !unlocked && s <= 10;
  const rise = (i) => ({ animationDelay: `${(burst ? 1.1 : .2) + i * .25}s` });

  return (
    <div className="exp on" data-tpl={site.template} ref={rootRef} role="dialog" aria-modal="true" aria-label={`Birthday surprise for ${her}`}>
      <canvas ref={starsRef} />
      <canvas ref={confRef} id="xConfetti" />
      {burst && <div className="x-flash" aria-hidden="true" />}
      {preview && <button className="x-top" style={{ scale: zoom }} type="button" onClick={onExit}>Exit preview</button>}
      {site.music !== 'none' && (site.music !== 'custom' || site.song?.url) && (
        <button className="x-music" style={{ scale: zoom }} type="button" aria-pressed={playing} aria-label={playing ? 'Pause music' : 'Play music'}
          onClick={() => { userPaused.current = playing; musicRef.current.toggle(); }}>
          <svg viewBox="0 0 20 20" className="bars" fill="currentColor"><rect x="3" y="6" width="3" height="11" rx="1" /><rect x="8.5" y="3" width="3" height="14" rx="1" /><rect x="14" y="8" width="3" height="9" rx="1" /></svg>
        </button>
      )}

      {/* browsers block sound until the first tap; this makes that tap part of the surprise */}
      {needTap && !playing && !userPaused.current && hasMusic && (
        <button type="button" className="x-gate" onClick={() => setNeedTap(false)}>
          <span className="x-gate-in" style={{ zoom }}>
            <span className="x-gate-seal">{initial(her)}</span>
            <span className="x-gate-k">Something made just for you{her ? ', ' + her : ''}</span>
            <span className="x-gate-t">Tap to begin</span>
            <span className="x-gate-s">{unlocked ? 'Turn your sound up' : 'Music starts the moment it opens'}</span>
          </span>
        </button>
      )}

      <div className="stage" style={{ zoom }}>
        {/* 1. Lock screen */}
        <section className={cls('lock', `${unlocked ? 'lock-open' : ''} ${burst ? 'burst' : ''}`)}>
          {unlocked && !site.locked && <HeartTree active={scene === 'lock'} delay={burst ? 1 : .2} />}
          <div className="lock-text">
          <p className="x-k">{unlocked ? 'Happy birthday,' : 'A surprise for'}</p>
          <h2 className="x-name">{her}</h2>
          <div className="x-orn" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2.1 0 3.7 1.2 4.6 2.7h2C13.9 6.2 15.5 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" /></svg>
          </div>
          {!unlocked && (
            <>
              <p className="x-sub">{final ? 'Almost there…' : 'Opens ' + formatWhen(site.unlockAt)}</p>
              <div className={`count ${final ? 'final' : ''}`} role="timer" aria-label="Time until it opens">
                <div className="unit"><b>{Math.floor(s / 86400)}</b><span>days</span></div>
                <div className="unit"><b>{pad(Math.floor((s % 86400) / 3600))}</b><span>hours</span></div>
                <div className="unit"><b>{pad(Math.floor((s % 3600) / 60))}</b><span>minutes</span></div>
                <div className="unit"><b key={s} className={final ? 'tick' : ''}>{pad(s % 60)}</b><span>seconds</span></div>
              </div>
              <p className="x-tease">Something special is waiting for you{him ? `, from ${him}` : ''}.</p>
            </>
          )}
          {unlocked && (
            <>
              <p className="rise x-wish" style={rise(0)}>It’s your day. Someone made you something.</p>
              <button className="rise x-btn" style={rise(1)} type="button" disabled={site.locked} onClick={() => setScene('env')}>
                {site.locked ? 'Opening…' : 'Open your surprise'}
              </button>
              <p className="rise x-tease" style={rise(2)}>
                {him ? `With love, from ${him}` : 'With love'}
                {site.music !== 'none' && <><span aria-hidden="true"> · </span>best with sound on</>}
              </p>
            </>
          )}
          {!unlocked && preview && (
            <button className="x-link" type="button" onClick={() => setScene('env')}>Skip the wait (preview only)</button>
          )}
          </div>
        </section>

        {/* 2. Envelope */}
        <section className={cls('env')}>
          <p className={`x-sub env-hint ${envOpen ? 'gone' : ''}`}>Tap the seal to open</p>
          <button className={`envelope ${envOpen ? 'open' : ''}`} type="button" aria-label="Open the envelope" onClick={openEnvelope}>
            <span className="env-back" />
            <span className="env-letter">{her}</span>
            <span className="env-front" />
            <span className="env-flap" />
            <span className="seal">{initial(her)}</span>
          </button>
          <p className="x-from">{him ? `From ${him}, with love` : 'With love'}</p>
        </section>

        {/* 3. Letter */}
        <section className={cls('letter', 'scroll')} ref={letterRef}>
          <article className={`paper ${typing ? 'typing' : ''} ${letterDone ? 'done' : ''}`} aria-live="polite"
            onClick={() => typing && finishType()}>
            <p className="greet">My dearest {her},</p>
            <p className="lbody">{typed}</p>
            <p className="sign">Forever yours,<b>{him || 'Me'}</b></p>
          </article>
          {!letterDone && <p className="tapnote">Tap the letter to show it all</p>}
          {letterDone && (
            <button className="x-btn" type="button" onClick={() => setScene(n ? 'gal' : hasMag ? 'mag' : 'final')}>
              {n ? 'See our moments' : 'One last thing'}
            </button>
          )}
        </section>

        {/* 4. Polaroid gallery */}
        <section className={cls('gal')}>
          {gi < n && <p className="x-sub">Tap or swipe a photo to see the next one</p>}
          <div className={`stack ${fanned && spread.length ? 'fanned' : ''}`} ref={stackRef}>
            {photos.map((p, i) => (
              <button
                key={p.url + i} type="button"
                className={`polaroid ${i < gi && !fanned ? 'toss-' + (tossDir[i] || 'r') : ''} ${dragI === i ? 'dragging' : ''}`}
                tabIndex={fanned || i === gi ? 0 : -1}
                aria-label={`Photo ${i + 1} of ${n}${p.caption ? ': ' + p.caption : ''}.${fanned ? '' : ' Tap for the next one.'}`}
                style={{
                  zIndex: z[i] || n - i,
                  '--r': `${(i % 2 ? 1 : -1) * (2 + ((i * 37) % 5))}deg`,
                  '--fx': `${spread[i]?.x || 0}px`,
                  '--fy': `${spread[i]?.y || 0}px`,
                  '--fr': `${spread[i]?.r || 0}deg`,
                  '--fs': spread[i]?.s || .64,
                  transitionDelay: fanned && dragI === -1 ? `${i * 70}ms` : '0ms',
                  '--dx': `${pos[i]?.x || 0}px`,
                  '--dy': `${pos[i]?.y || 0}px`,
                }}
                onPointerDown={(e) => dragStart(e, i)}
                onPointerMove={dragMove}
                onPointerUp={dragEnd}
                onPointerCancel={dragEnd}
                onClick={(e) => e.detail === 0 && !fanned && toss(i)}
              >
                <img src={p.url} alt="" draggable={false} />
                <span className="cap">{p.caption}</span>
                {i % 3 !== 2 && <span className={`tape tape-${i % 2 ? 'b' : 'a'}`} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p className="x-count" ref={countRef}>{gi < n ? `${gi + 1} of ${n}` : 'That’s us. Move them around.'}</p>
          {gi >= n && n > 0 && <button className="x-btn" type="button" onClick={() => setScene(hasMag ? 'mag' : 'final')}>{hasMag ? 'Turn the page' : 'One last thing'}</button>}
        </section>

        {/* 5. Moments magazine */}
        <section className={cls('mag')}>
          {hasMag && (
            <Magazine key={magKey} zoom={zoom} pages={magPages} info={magInfo(site)}
              active={scene === 'mag'} onDone={() => setScene('final')} />
          )}
        </section>

        {/* 6. Cake finale */}
        <section className={cls('final')}>
          {!allOut && <p className="x-sub">Make a wish, then tap each candle to blow it out</p>}
          <svg className="cake" viewBox="0 0 240 230" aria-label="Birthday cake with three candles">
            <ellipse cx="120" cy="206" rx="108" ry="13" fill="var(--x-gold)" opacity=".45" />
            <rect x="32" y="134" width="176" height="68" rx="12" fill="var(--x-rose)" />
            <rect x="32" y="134" width="176" height="18" rx="9" fill="var(--x-paper)" />
            <g fill="var(--x-paper)"><circle cx="50" cy="152" r="6" /><circle cx="78" cy="154" r="7" /><circle cx="108" cy="151" r="5" /><circle cx="136" cy="155" r="7" /><circle cx="166" cy="152" r="6" /><circle cx="192" cy="154" r="5" /></g>
            <g fill="var(--x-gold)"><circle cx="64" cy="180" r="3" /><circle cx="96" cy="184" r="3" /><circle cx="128" cy="180" r="3" /><circle cx="160" cy="184" r="3" /><circle cx="188" cy="180" r="3" /></g>
            <rect x="62" y="88" width="116" height="50" rx="10" fill="var(--x-rose)" opacity=".92" />
            <rect x="62" y="88" width="116" height="15" rx="7.5" fill="var(--x-paper)" />
            <g fill="var(--x-paper)"><circle cx="76" cy="103" r="5" /><circle cx="100" cy="105" r="6" /><circle cx="126" cy="102" r="5" /><circle cx="150" cy="105" r="6" /><circle cx="168" cy="102" r="4" /></g>
            {CANDLES.map((c, i) => (
              <g key={i} className={`candle ${out[i] ? 'out' : ''}`} tabIndex={0} role="button"
                aria-label={out[i] ? 'Candle blown out' : `Blow out candle ${i + 1}`}
                onClick={() => blow(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); blow(i); } }}>
                <rect className="wick-hit" x={c.hit[0]} y={c.hit[1]} width="28" height={c.hit[2]} fill="transparent" />
                <rect x={c.x - 4} y={c.body} width="8" height={c.h} rx="3" fill="var(--x-gold)" />
                <circle className="glow" cx={c.x} cy={c.top + 14} r="16" fill="#FFD27A" opacity=".25" />
                <g className="flame">
                  <path d={`M${c.x} ${c.top} C${c.x + 7} ${c.top + 10} ${c.x + 7} ${c.top + 18} ${c.x} ${c.top + 22} C${c.x - 7} ${c.top + 18} ${c.x - 7} ${c.top + 10} ${c.x} ${c.top}Z`} fill="#FFB547" />
                  <path d={`M${c.x} ${c.top + 9} C${c.x + 3} ${c.top + 14} ${c.x + 3} ${c.top + 18} ${c.x} ${c.top + 20} C${c.x - 3} ${c.top + 18} ${c.x - 3} ${c.top + 14} ${c.x} ${c.top + 9}Z`} fill="#FFF3C4" />
                </g>
                <circle className="smoke" cx={c.x} cy={c.top + 18} r="5" fill="var(--x-soft)" />
              </g>
            ))}
          </svg>
          <div className={`hbd ${hbd ? 'show' : ''}`} aria-live="polite">
            <h2 className="x-name">Happy birthday, {her}</h2>
            <p>Make a wish. I’m right here.</p>
            {him && <p>Love, {him}</p>}
          </div>
          {replay && <button className="x-link" type="button" onClick={restart}>Watch it again</button>}
        </section>
      </div>
    </div>
  );
}
