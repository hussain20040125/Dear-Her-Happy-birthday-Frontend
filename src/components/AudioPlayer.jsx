import { useEffect, useRef, useState } from 'react';

const clock = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');
const GAP = 1; // shortest clip, in seconds

/**
 * Themed player for the uploaded song, replacing the browser's audio controls.
 * With onTrim, two handles on the track pick the part she hears (start..end seconds; end 0 = to the end),
 * and the preview loops just that part.
 */
export default function AudioPlayer({ src, name, start = 0, end = 0, onTrim }) {
  const ref = useRef(), barRef = useRef(), drag = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(NaN);
  const [s, setS] = useState(start);
  const [e, setE] = useState(end);
  const [dragging, setDragging] = useState(null);

  useEffect(() => { setPlaying(false); setT(0); setDur(NaN); }, [src]);
  // follow saved values unless a handle is being dragged
  useEffect(() => { if (!drag.current) { setS(start); setE(end); } }, [start, end]);

  const ok = isFinite(dur) && dur > 0;
  const lo = Math.min(s, ok ? dur : s), hi = e > 0 && ok ? Math.min(e, dur) : ok ? dur : 0;
  const pct = (x) => (ok ? (x / dur) * 100 : 0);

  function toggle() {
    const a = ref.current;
    if (!a.paused) { a.pause(); return; }
    if (a.currentTime < lo || (hi && a.currentTime >= hi - .05)) a.currentTime = lo;
    a.play().catch(() => {});
  }

  function onTime(ev) {
    const a = ev.currentTarget;
    if (onTrim && hi && a.currentTime >= hi) a.currentTime = lo; // preview loops the chosen part
    setT(a.currentTime);
  }

  const timeAt = (clientX) => {
    const r = barRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur;
  };

  function save(ns, ne) {
    // end at (or very near) the real end is stored as 0, "to the end"
    onTrim?.(Math.round(ns * 10) / 10, ne >= dur - .25 ? 0 : Math.round(ne * 10) / 10);
  }

  function setHandle(which, x) {
    if (which === 's') setS(Math.max(0, Math.min(x, hi - GAP)));
    else setE(Math.min(dur, Math.max(x, lo + GAP)));
  }

  function down(ev) {
    if (!ok) return;
    const which = ev.target.dataset.h;
    if (which && onTrim) {
      drag.current = which;
      setDragging(which);
      ev.currentTarget.setPointerCapture(ev.pointerId);
      ev.preventDefault();
      return;
    }
    const x = timeAt(ev.clientX);
    ref.current.currentTime = x;
    setT(x);
  }
  function move(ev) { if (drag.current) setHandle(drag.current, timeAt(ev.clientX)); }
  function up() {
    if (!drag.current) return;
    const which = drag.current;
    drag.current = null;
    setDragging(null);
    save(lo, hi);
    if (which === 's') { ref.current.currentTime = lo; setT(lo); }
  }

  function key(which, ev) {
    const step = ev.shiftKey ? 5 : 1;
    let d = 0;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') d = step;
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') d = -step;
    if (!d) return;
    ev.preventDefault();
    const ns = which === 's' ? Math.max(0, Math.min(lo + d, hi - GAP)) : lo;
    const ne = which === 'e' ? Math.min(dur, Math.max(hi + d, lo + GAP)) : hi;
    setS(ns); setE(ne); save(ns, ne);
  }

  const atNow = (which) => {
    const now = ref.current.currentTime;
    if (which === 's') { const ns = Math.min(now, hi - GAP); setS(ns); save(ns, hi); }
    else { const ne = Math.max(now, lo + GAP); setE(ne); save(lo, ne); }
  };
  const trimmed = ok && (lo > 0 || hi < dur - .25);

  return (
    <div className={`ap ${playing ? 'playing' : ''} ${onTrim ? 'trim' : ''}`}>
      <audio ref={ref} src={src} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={onTime} onLoadedMetadata={(ev) => setDur(ev.currentTarget.duration)} />
      <button type="button" className="ap-play" onClick={toggle} aria-label={playing ? 'Pause song' : 'Play song'}>
        {playing
          ? <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.4" height="12" rx="1" /><rect x="11.6" y="4" width="3.4" height="12" rx="1" /></svg>
          : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 4.2v11.6a.8.8 0 001.2.7l9.2-5.8a.8.8 0 000-1.4L7.7 3.5a.8.8 0 00-1.2.7z" /></svg>}
      </button>
      <div className="ap-main">
        <div className="ap-top">
          <span className="ap-name" title={name}>{name || 'Your song'}</span>
          <span className="ap-eq" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>

        <div className={`ap-bar ${ok ? '' : 'off'}`} ref={barRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="ap-track" />
          {onTrim && <div className="ap-sel" style={{ left: pct(lo) + '%', width: pct(hi - lo) + '%' }} />}
          <div className="ap-prog" style={{ left: pct(onTrim ? lo : 0) + '%', width: Math.max(0, pct(t - (onTrim ? lo : 0))) + '%' }} />
          <div className="ap-head" style={{ left: pct(t) + '%' }} />
          {onTrim && ok && ['s', 'e'].map((h) => (
            <div key={h} data-h={h} className={`ap-handle ${h} ${dragging === h ? 'drag' : ''}`} style={{ left: pct(h === 's' ? lo : hi) + '%' }}
              role="slider" tabIndex={0} aria-label={h === 's' ? 'Song starts at' : 'Song ends at'}
              aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(h === 's' ? lo : hi)} aria-valuetext={clock(h === 's' ? lo : hi)}
              onKeyDown={(ev) => key(h, ev)}>
              <span className="ap-tip">{clock(h === 's' ? lo : hi)}</span>
            </div>
          ))}
        </div>
        <div className="ap-time"><span>{clock(t)}</span><span>{clock(dur)}</span></div>

        {onTrim && ok && (
          <div className="ap-trimrow">
            <span className="ap-range">She hears <b>{clock(lo)} → {clock(hi)}</b> <em>({Math.round(hi - lo)}s, on repeat)</em></span>
            <div className="ap-trimbtns">
              <button type="button" onClick={() => atNow('s')}>Start here</button>
              <button type="button" onClick={() => atNow('e')}>End here</button>
              {trimmed && <button type="button" onClick={() => { setS(0); setE(dur); save(0, dur); }}>Full song</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
