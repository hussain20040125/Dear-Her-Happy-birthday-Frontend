import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { shrinkImage } from '../lib/format';
import { FONTS, TEMPLATES, MagPage, blankPage, magInfo } from '../lib/magazine';
import { useToast } from './Toast';
import Select from './Select';

const GROUPS = ['Covers', 'Inside', 'Endings'];

function Chip({ url, onPick }) {
  return (
    <button type="button" className="mz-chip" title="Drag onto the page, or tap to fill the selected spot"
      draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-dearher-photo', url); e.dataTransfer.setData('text/uri-list', url); }}
      onClick={() => onPick(url)}>
      <img src={url} alt="" />
    </button>
  );
}

/**
 * Build the magazine: pick page templates, drop photos into the photo spots,
 * click any text to rewrite it, and choose a font per page.
 * setMagazine(fn): fn receives the current { pages } (the ready-made issue if he hasn't edited yet)
 */
export default function MagazineEditor({ site, pages, magLibrary = [], setMagazine }) {
  const toast = useToast();
  const [sel, setSel] = useState(0);
  const [selSlot, setSelSlot] = useState(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState({}); // pageId -> [slot indexes uploading]
  const [libBusy, setLibBusy] = useState(0);
  const pickerRef = useRef();
  useEffect(() => {
    if (!picker) return;
    pickerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const k = (e) => e.key === 'Escape' && setPicker(false);
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [picker]);
  const info = magInfo(site);
  const gallery = (site.photos || []).map((p) => p.url);
  // photos for filling new pages: magazine uploads first, then the gallery
  const library = [...magLibrary, ...gallery.filter((u) => !magLibrary.includes(u))].map((url) => ({ url }));
  const cur = pages[Math.min(sel, pages.length - 1)];

  const edit = (fn) => setMagazine((m) => ({ ...m, pages: fn(m.pages) }));
  const addToLibrary = (url) => setMagazine((m) => ({ ...m, library: [...(m.library || []).filter((u) => u !== url), url] }));

  async function sendPhoto(file) {
    const blob = await shrinkImage(file);
    const form = new FormData();
    form.append('photo', blob, file.name.replace(/\.\w+$/, '') + '.jpg');
    const { url } = await api('/upload', { method: 'POST', form });
    return url;
  }

  // upload photos into the magazine's own library (separate from the gallery)
  async function uploadMany(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) { toast('Choose JPG or PNG photos.'); return; }
    setLibBusy((n) => n + files.length);
    for (const f of files) {
      try { addToLibrary(await sendPhoto(f)); }
      catch (e) { toast(e.status ? e.message : `Couldn’t read ${f.name}. Try a JPG or PNG.`); }
      finally { setLibBusy((n) => n - 1); }
    }
  }

  function unLibrary(url) {
    setMagazine((m) => ({ ...m, library: (m.library || []).filter((u) => u !== url) }));
    const used = gallery.includes(url) || pages.some((p) => p.photos?.includes(url));
    const id = (url.match(/\/upload\/(?:v\d+\/)?(dearher\/[^.]+)\.\w+$/) || [])[1];
    if (!used && id) api('/upload', { method: 'DELETE', body: { publicId: id } }).catch(() => {});
  }
  const updPage = (id, fn) => edit((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
  const setPhoto = (id, i, url) => updPage(id, (p) => {
    const photos = [...(p.photos || [])];
    while (photos.length <= i) photos.push('');
    photos[i] = url;
    return { ...p, photos };
  });

  async function upload(id, i, file) {
    if (!file?.type.startsWith('image/')) { toast('Choose a JPG or PNG photo.'); return; }
    setBusy((b) => ({ ...b, [id]: [...(b[id] || []), i] }));
    try {
      const url = await sendPhoto(file);
      setPhoto(id, i, url);
      addToLibrary(url);
    } catch (e) {
      toast(e.status ? e.message : `Couldn’t read ${file.name}. Try a JPG or PNG.`);
    } finally {
      setBusy((b) => ({ ...b, [id]: (b[id] || []).filter((x) => x !== i) }));
    }
  }

  function dropSlot(id, i, dt) {
    const url = dt.getData('application/x-dearher-photo') || (dt.getData('text/uri-list') || '').split('\n')[0].trim();
    if (url.startsWith('https://')) { setPhoto(id, i, url); return; }
    const file = [...dt.files].find((f) => f.type.startsWith('image/'));
    if (file) upload(id, i, file);
  }

  function pick(url) {
    if (!cur) return;
    const count = TEMPLATES[cur.tpl].photos;
    const i = selSlot ?? Array.from({ length: count }, (_, k) => k).find((k) => !cur.photos?.[k]);
    if (i === undefined) { toast('Tap a photo spot on the page first, then pick a photo.'); return; }
    setPhoto(cur.id, i, url);
    setSelSlot(i + 1 < count ? i + 1 : null);
  }

  function addPage(tpl) {
    const p = blankPage(tpl);
    p.photos = Array.from({ length: TEMPLATES[tpl].photos }, (_, k) => library[(pages.length + k) % (library.length || 1)]?.url || '');
    const at = pages.length ? Math.min(sel + 1, pages.length) : 0;
    edit((ps) => [...ps.slice(0, at), p, ...ps.slice(at)]);
    setSel(at); setSelSlot(null); setPicker(false);
  }

  function move(d) {
    const j = sel + d;
    if (j < 0 || j >= pages.length) return;
    edit((ps) => { const c = [...ps]; [c[sel], c[j]] = [c[j], c[sel]]; return c; });
    setSel(j);
  }

  function remove(k = sel) {
    edit((ps) => ps.filter((_, j) => j !== k));
    setSel((s) => Math.max(0, Math.min(k < s ? s - 1 : s, pages.length - 2)));
    setSelSlot(null);
  }

  const editCtx = cur && {
    setText: (k, v) => updPage(cur.id, (p) => ({ ...p, texts: { ...p.texts, [k]: v } })),
    selSlot,
    selectSlot: (i) => setSelSlot((s) => (s === i ? null : i)),
    dropSlot: (i, dt) => dropSlot(cur.id, i, dt),
    busy: new Set(busy[cur.id] || []),
  };

  return (
    <div className="mz">
      <div className="mz-strip" role="listbox" aria-label="Magazine pages">
        {pages.map((p, k) => (
          <div key={p.id} className={`mz-thumb ${k === sel ? 'on' : ''}`}>
            <button type="button" role="option" aria-selected={k === sel} aria-label={`Page ${k + 1}: ${TEMPLATES[p.tpl]?.name}`}
              onClick={() => { setSel(k); setSelSlot(null); }}>
              <div className="mz-mini"><MagPage page={p} info={info} /></div>
              <span>{k + 1}</span>
            </button>
            <button type="button" className="mz-x" aria-label={`Remove page ${k + 1}`} title="Remove page" onClick={() => remove(k)}>×</button>
          </div>
        ))}
        <button type="button" className="mz-add" onClick={() => setPicker((v) => !v)} aria-expanded={picker}>
          <strong>+</strong><span>Add page</span>
        </button>
      </div>

      {picker && (
        <div className="mz-picker" ref={pickerRef} role="dialog" aria-label="Choose a page layout">
          <div className="mz-pickhead">
            <p>Pick a layout for the new page</p>
            <button type="button" className="mz-close" aria-label="Close" onClick={() => setPicker(false)}>×</button>
          </div>
          {GROUPS.map((g) => (
            <div key={g}>
              <p className="mz-group">{g}</p>
              <div className="mz-tpls">
                {Object.entries(TEMPLATES).filter(([, t]) => t.group === g).map(([id, t]) => (
                  <button key={id} type="button" className="mz-tpl" onClick={() => addPage(id)}>
                    <div className="mz-mini big">
                      <MagPage info={info} page={{ id: 'pv' + id, tpl: id, texts: {}, photos: Array.from({ length: t.photos }, (_, k) => library[k % (library.length || 1)]?.url || '') }} />
                    </div>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!cur ? (
        <p className="mz-empty">No magazine for now. Add a page to start one, or <button type="button" className="linkbtn" onClick={() => setMagazine(null)}>use the ready-made issue</button>.</p>
      ) : (
        <div className="mz-main">
          <div className="mz-page" key={cur.id} onClick={() => setSelSlot(null)}>
            <MagPage page={cur} info={info} edit={editCtx} />
          </div>

          <div className="mz-tools">
            <p className="mz-tip">Click any text on the page to rewrite it. Drag a photo onto a photo spot, or tap a spot and then a photo below.</p>
            <div className="field">
              <span className="label">Layout</span>
              <Select label="Layout" value={cur.tpl} onChange={(v) => updPage(cur.id, (p) => ({ ...p, tpl: v }))}
                options={Object.entries(TEMPLATES).map(([id, t]) => ({ value: id, label: t.name, group: t.group }))} />
            </div>
            <div className="field">
              <span className="label">Font</span>
              <Select label="Font" value={cur.font || ''} onChange={(v) => updPage(cur.id, (p) => ({ ...p, font: v }))}
                options={[
                  { value: '', label: `Layout default (${FONTS[TEMPLATES[cur.tpl].font].name})`, style: { fontFamily: FONTS[TEMPLATES[cur.tpl].font].css } },
                  ...Object.entries(FONTS).map(([id, f]) => ({ value: id, label: f.name, style: { fontFamily: f.css } })),
                ]} />
            </div>
            {selSlot !== null && (
              <div className="mz-slotbar">
                <span>Photo spot {selSlot + 1} selected</span>
                <label className="btn">Upload<input type="file" accept="image/*" hidden onChange={(e) => { upload(cur.id, selSlot, e.target.files[0]); e.target.value = ''; }} /></label>
                {cur.photos?.[selSlot] && <button className="btn ghost-danger" type="button" onClick={() => setPhoto(cur.id, selSlot, '')}>Remove</button>}
              </div>
            )}
            <div className="mz-row">
              <button className="btn" type="button" onClick={() => move(-1)} disabled={sel === 0} aria-label="Move page earlier">←</button>
              <button className="btn" type="button" onClick={() => move(1)} disabled={sel === pages.length - 1} aria-label="Move page later">→</button>
              <button className="btn ghost-danger" type="button" onClick={() => remove()}>Delete page</button>
            </div>
            <div className="mz-row">
              <button className="btn primary" type="button" onClick={() => setPicker(true)}>+ Add a page after this</button>
            </div>
            {site.magazine && (
              <button type="button" className="linkbtn" onClick={() => { setMagazine(null); setSel(0); setSelSlot(null); }}>Start over with the ready-made issue</button>
            )}
          </div>
        </div>
      )}

      <div className="mz-tray" onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
        onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); uploadMany(e.dataTransfer.files); } }}>
        <div className="mz-trayhead">
          <p className="mz-group">Magazine photos</p>
          <label className="btn">+ Upload photos<input type="file" accept="image/*" multiple hidden onChange={(e) => { uploadMany(e.target.files); e.target.value = ''; }} /></label>
        </div>
        <p className="mz-tip">Upload any photos you want for the magazine, or drop them here. They don’t have to be the gallery photos.</p>
        <div className="mz-trayrow">
          {magLibrary.map((url) => (
            <div className="mz-chipwrap" key={url}>
              <Chip url={url} onPick={pick} />
              <button type="button" className="mz-x" aria-label="Remove photo from magazine photos" onClick={() => unLibrary(url)}>×</button>
            </div>
          ))}
          {Array.from({ length: libBusy }).map((_, i) => <div key={'b' + i} className="mz-chip busy" aria-label="Uploading" />)}
          {!magLibrary.length && !libBusy && <p className="mz-none">No magazine photos yet.</p>}
        </div>
        {gallery.length > 0 && (
          <>
            <p className="mz-group sub">From your gallery photos</p>
            <div className="mz-trayrow">{gallery.map((url) => <Chip key={url} url={url} onPick={pick} />)}</div>
          </>
        )}
      </div>
    </div>
  );
}
