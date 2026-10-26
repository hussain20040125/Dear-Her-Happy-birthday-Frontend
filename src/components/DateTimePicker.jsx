import { useEffect, useRef, useState } from 'react';

const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmt = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).replace(/\s?(am|pm)/i, (m, p) => ' ' + p.toUpperCase());

/**
 * A number you can change with the arrows, the mouse wheel, a vertical swipe, or the ↑/↓ keys.
 * onStep(+1 | -1) wraps around in the parent.
 */
function Spin({ label, value, min, max, onStep }) {
  const ref = useRef();
  const step = useRef(onStep);
  step.current = onStep;

  useEffect(() => {
    const el = ref.current;
    let acc = 0, touchY = null;
    // native listeners: React's wheel/touch handlers are passive and can't stop the page from scrolling
    const wheel = (e) => {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) >= 40 || e.deltaMode !== 0) { step.current(acc < 0 ? 1 : -1); acc = 0; }
    };
    const tStart = (e) => { touchY = e.touches[0].clientY; };
    const tMove = (e) => {
      if (touchY === null) return;
      e.preventDefault();
      const dy = e.touches[0].clientY - touchY;
      if (Math.abs(dy) >= 18) { step.current(dy < 0 ? 1 : -1); touchY = e.touches[0].clientY; }
    };
    const tEnd = () => { touchY = null; };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('touchstart', tStart, { passive: true });
    el.addEventListener('touchmove', tMove, { passive: false });
    el.addEventListener('touchend', tEnd);
    return () => {
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('touchstart', tStart);
      el.removeEventListener('touchmove', tMove);
      el.removeEventListener('touchend', tEnd);
    };
  }, []);

  return (
    <div className="dtp-spin" ref={ref} title="Scroll or swipe to change">
      <button type="button" tabIndex={-1} onClick={() => onStep(1)} aria-label={`${label} up`}>▴</button>
      <b role="spinbutton" tabIndex={0} aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); onStep(1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onStep(-1); }
        }}>
        <span key={value} className="dtp-num">{String(value).padStart(2, '0')}</span>
      </b>
      <button type="button" tabIndex={-1} onClick={() => onStep(-1)} aria-label={`${label} down`}>▾</button>
    </div>
  );
}

function tomorrowMidnight() {
  const d = new Date();
  d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Themed date and time picker, replacing the browser's datetime-local input.
 * value: ISO string or ''; onChange(isoString)
 */
export default function DateTimePicker({ id, value, onChange, invalid }) {
  const date = value ? new Date(value) : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const d = date || tomorrowMidnight(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const rootRef = useRef();

  useEffect(() => {
    if (!open) return;
    const d = date || tomorrowMidnight();
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
    const away = (e) => { if (!rootRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    addEventListener('pointerdown', away);
    addEventListener('keydown', esc);
    return () => { removeEventListener('pointerdown', away); removeEventListener('keydown', esc); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = date || tomorrowMidnight();
  const set = (d) => onChange(d.toISOString());
  const withDay = (y, m, dd) => { const d = new Date(base); d.setFullYear(y, m, dd); return d; };
  const withTime = (h, min) => { const d = new Date(base); d.setHours(h, min, 0, 0); return d; };

  const h24 = base.getHours(), min = base.getMinutes();
  const h12 = h24 % 12 || 12, pm = h24 >= 12;
  const setH12 = (h) => set(withTime((h % 12) + (pm ? 12 : 0), min));
  const setMin = (m) => set(withTime(h24, (m + 60) % 60));
  const setPm = (v) => set(withTime((h24 % 12) + (v ? 12 : 0), min));

  const first = view.getDay();
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const shiftMonth = (d) => setView((v) => new Date(v.getFullYear(), v.getMonth() + d, 1));

  return (
    <div className={`dtp ${open ? 'open' : ''}`} ref={rootRef}>
      <button type="button" id={id} className={`dtp-btn ${invalid ? 'bad' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        {date ? <span><b>{fmt(date)}</b><em>{fmtTime(date)}</em></span> : <span className="ph">Pick a date and time</span>}
      </button>

      {open && (
        <div className="dtp-pop" role="dialog" aria-label="Choose when it unlocks">
          <div className="dtp-head">
            <button type="button" className="dtp-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
            <b>{view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b>
            <button type="button" className="dtp-nav" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          </div>
          <div className="dtp-grid" role="grid">
            {WEEK.map((w) => <span key={w} className="dtp-wk">{w}</span>)}
            {cells.map((dd, i) => {
              if (!dd) return <span key={'e' + i} />;
              const d = new Date(view.getFullYear(), view.getMonth(), dd);
              return (
                <button key={dd} type="button"
                  className={`dtp-day ${sameDay(d, date) ? 'on' : ''} ${sameDay(d, today) ? 'today' : ''} ${d < todayStart ? 'past' : ''}`}
                  aria-pressed={sameDay(d, date)} aria-label={fmt(d)}
                  onClick={() => set(withDay(view.getFullYear(), view.getMonth(), dd))}>{dd}</button>
              );
            })}
          </div>

          <div className="dtp-time">
            <span className="dtp-label">Time</span>
            <Spin label="Hour" value={h12} min={1} max={12}
              onStep={(d) => setH12(((h12 - 1 + d) % 12 + 12) % 12 + 1)} />
            <span className="dtp-colon">:</span>
            <Spin label="Minute" value={min} min={0} max={59} onStep={(d) => setMin(min + d)} />
            <div className="dtp-ampm" role="group" aria-label="AM or PM">
              <button type="button" aria-pressed={!pm} onClick={() => setPm(false)}>AM</button>
              <button type="button" aria-pressed={pm} onClick={() => setPm(true)}>PM</button>
            </div>
          </div>
          <div className="dtp-quick">
            <button type="button" onClick={() => set(withTime(0, 0))}>Midnight</button>
            <button type="button" onClick={() => set(withTime(9, 0))}>9 AM</button>
            <button type="button" onClick={() => set(withTime(19, 0))}>7 PM</button>
          </div>
          <div className="dtp-foot">
            <button type="button" className="linkbtn" onClick={() => { const d = tomorrowMidnight(); set(d); setView(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Tomorrow midnight</button>
            <button type="button" className="btn primary" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
