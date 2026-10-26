import { useEffect, useId, useRef, useState } from 'react';

/**
 * Themed dropdown that replaces the browser's <select>.
 * options: [{ value, label, group?, style? }]  (style lets an option preview itself, e.g. a font)
 */
export default function Select({ value, onChange, options, id, label }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const rootRef = useRef(), listRef = useRef();
  const listId = useId();
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const cur = options[idx];

  useEffect(() => {
    if (!open) return;
    const r = rootRef.current.getBoundingClientRect();
    setUp(innerHeight - r.bottom < 300 && r.top > innerHeight - r.bottom);
    setActive(idx);
    const away = (e) => { if (!rootRef.current.contains(e.target)) setOpen(false); };
    addEventListener('pointerdown', away);
    return () => removeEventListener('pointerdown', away);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function choose(i) {
    onChange(options[i].value);
    setOpen(false);
    rootRef.current.querySelector('button').focus();
  }

  function onKey(e) {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(last, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(last); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Tab') setOpen(false);
  }

  return (
    <div className={`sel ${open ? 'open' : ''}`} ref={rootRef}>
      <button type="button" id={id} className="sel-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        aria-label={label ? `${label}: ${cur?.label}` : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => setOpen((v) => !v)} onKeyDown={onKey}>
        <span style={cur?.style}>{cur?.label}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul className={`sel-list ${up ? 'up' : ''}`} role="listbox" id={listId} ref={listRef} tabIndex={-1}>
          {options.map((o, i) => (
            <li key={o.value} role="presentation">
              {o.group && o.group !== options[i - 1]?.group && <p className="sel-group">{o.group}</p>}
              <div role="option" id={`${listId}-${i}`} data-i={i} aria-selected={o.value === value}
                className={`sel-opt ${i === active ? 'active' : ''}`}
                onPointerEnter={() => setActive(i)} onClick={() => choose(i)}>
                <span style={o.style}>{o.label}</span>
                {o.value === value && <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
