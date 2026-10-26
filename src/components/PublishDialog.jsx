import { useEffect, useRef } from 'react';
import { formatWhen } from '../lib/format';
import { useToast } from './Toast';

export default function PublishDialog({ open, link, when, onClose, onPreview }) {
  const ref = useRef();
  const inputRef = useRef();
  const toast = useToast();

  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function copy() {
    try { await navigator.clipboard.writeText(link); }
    catch { inputRef.current.select(); document.execCommand('copy'); }
    toast('Link copied');
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent('I made you something. Open it when it’s time 💌 ' + link)}`;

  return (
    <dialog className="dlg" ref={ref} onClose={onClose} aria-labelledby="pubTitle">
      <h2 id="pubTitle">Your surprise is ready</h2>
      <p>Send her this link. It stays locked until <b>{formatWhen(when)}</b>.</p>
      <div className="copyrow">
        <input className="input" ref={inputRef} readOnly value={link} />
        <button className="btn primary" type="button" onClick={copy}>Copy link</button>
      </div>
      <p className="fine"><a href={whatsapp} target="_blank" rel="noreferrer">Share on WhatsApp</a></p>
      <div className="dlg-actions">
        <button className="btn" type="button" onClick={onPreview}>Preview again</button>
        <button className="btn primary" type="button" onClick={onClose}>Done</button>
      </div>
    </dialog>
  );
}
