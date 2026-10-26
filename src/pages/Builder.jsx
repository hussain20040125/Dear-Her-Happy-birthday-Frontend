import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import Cover from '../components/Cover';
import PhotoGrid from '../components/PhotoGrid';
import SongUpload from '../components/SongUpload';
import DateTimePicker from '../components/DateTimePicker';
import MagazineEditor from '../components/MagazineEditor';
import { defaultPages } from '../lib/magazine';
import Experience from '../components/Experience';
import PublishDialog from '../components/PublishDialog';
import { useToast } from '../components/Toast';
import { slugify } from '../lib/format';

const pick = (s) => ({
  herName: s.herName, yourName: s.yourName, unlockAt: s.unlockAt, letter: s.letter,
  photos: s.photos, template: s.template, music: s.music, song: s.song ?? null, magazine: s.magazine ?? null, slug: s.slug,
});

export default function Builder() {
  const { id } = useParams();
  const toast = useToast();
  const [site, setSite] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [saveState, setSaveState] = useState('Draft saved');
  const [errors, setErrors] = useState({});
  const [previewing, setPreviewing] = useState(false);
  const [pub, setPub] = useState({ open: false, link: '' });
  const slugTouched = useRef(false);
  const dirty = useRef(false);
  const saveTimer = useRef();

  useEffect(() => {
    api(`/sites/${id}`)
      .then(({ site }) => {
        setSite(site);
        slugTouched.current = !(site.slug.startsWith('surprise-') || site.slug === slugify(site.herName));
      })
      .catch((e) => setLoadErr(e.message));
  }, [id]);

  async function save(current) {
    try {
      await api(`/sites/${id}`, { method: 'PUT', body: pick(current) });
      dirty.current = false;
      setSaveState('Draft saved');
      setErrors((e) => ({ ...e, slug: undefined }));
      return true;
    } catch (e) {
      if (e.field === 'slug') { setErrors((er) => ({ ...er, slug: e.message })); setSaveState('Her link needs a change'); }
      else setSaveState('Couldn’t save. Check your connection.');
      return false;
    }
  }

  // autosave 600ms after the last change
  useEffect(() => {
    if (!site || !dirty.current) return;
    setSaveState('Saving…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(site), 600);
    return () => clearTimeout(saveTimer.current);
  }, [site]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch) => {
    dirty.current = true;
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; });
    setSite((s) => ({ ...s, ...patch }));
  };
  // null magazine = the ready-made issue built from her photos; the first edit makes it his own copy
  const setMagazine = (fn) => {
    dirty.current = true;
    setSite((s) => {
      const cur = s.magazine ?? { pages: defaultPages(s.photos) };
      return { ...s, magazine: typeof fn === 'function' ? fn(cur) : fn };
    });
  };
  const setPhotos = (fn) => { dirty.current = true; setSite((s) => ({ ...s, photos: typeof fn === 'function' ? fn(s.photos) : fn })); };

  function onHerName(v) {
    const patch = { herName: v };
    if (!slugTouched.current && slugify(v).length >= 3) patch.slug = slugify(v);
    update(patch);
  }

  function validate() {
    const e = {};
    if (!site.herName.trim()) e.herName = 'Add her name so the surprise can greet her.';
    if (!site.unlockAt) e.unlockAt = 'Pick the date and time it should open.';
    if (!site.letter.trim()) e.letter = 'Write a few lines before you publish.';
    setErrors((old) => ({ ...old, ...e }));
    const first = ['herName', 'unlockAt', 'letter'].find((k) => e[k]);
    if (first) document.getElementById('f-' + first)?.focus();
    return !first;
  }

  function preview() {
    if (validate()) setPreviewing(true);
    else toast('Add the missing details to preview.');
  }

  async function publish() {
    if (!validate()) { toast('A few details are missing.'); return; }
    clearTimeout(saveTimer.current);
    if (!(await save(site))) { toast('Fix the highlighted field, then publish.'); return; }
    try {
      const { site: saved, link } = await api(`/sites/${id}/publish`, { method: 'POST' });
      setSite((s) => ({ ...s, status: saved.status }));
      setPub({ open: true, link: `${window.location.origin}/for/${saved.slug}` });
    } catch (e) {
      if (e.field) setErrors((er) => ({ ...er, [e.field]: e.message }));
      toast(e.message);
    }
  }

  if (loadErr) return <main className="dash"><p className="dash-empty">{loadErr} <Link to="/">Back to your surprises</Link></p></main>;
  if (!site) return <main className="dash"><p className="dash-empty">Loading…</p></main>;

  const fieldCls = (k) => `field ${errors[k] ? 'invalid' : ''}`;

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Back to your surprises">Dear Her</Link>
        <span className="save-state" aria-live="polite"
          data-state={saveState === 'Saving…' ? 'saving' : saveState === 'Draft saved' ? 'saved' : 'error'}>{saveState}</span>
        <div className="actions">
          <button className="btn" type="button" onClick={preview}>Preview</button>
          <button className="btn primary" type="button" onClick={publish}>{site.status === 'published' ? 'Update' : 'Publish'}</button>
        </div>
      </header>

      <main className="layout">
        <div className="form">
          <div className="intro">
            <h1>Make her a birthday surprise</h1>
            <p>Write her a letter, add your photos, and get one link that unlocks at midnight on her birthday.</p>
          </div>

          <section className="block half" aria-labelledby="h-who">
            <h2 id="h-who">Who it’s for</h2>
            <p className="hint">Her name appears on the first screen she sees.</p>
            <div className="grid2">
              <div className={fieldCls('herName')}>
                <label htmlFor="f-herName">Her name</label>
                <input className="input" id="f-herName" autoComplete="off" maxLength={30} value={site.herName} onChange={(e) => onHerName(e.target.value)} />
                <span className="err">{errors.herName}</span>
              </div>
              <div className="field">
                <label htmlFor="f-yourName">Your name</label>
                <input className="input" id="f-yourName" autoComplete="off" maxLength={30} value={site.yourName} onChange={(e) => update({ yourName: e.target.value })} />
              </div>
              <div className={fieldCls('unlockAt')}>
                <label htmlFor="f-unlockAt">Unlocks on</label>
                <DateTimePicker id="f-unlockAt" value={site.unlockAt || ''} invalid={!!errors.unlockAt}
                  onChange={(iso) => update({ unlockAt: iso })} />
                <small>She sees a countdown until this moment.</small>
                <span className="err">{errors.unlockAt}</span>
              </div>
              <div className={fieldCls('slug')}>
                <label htmlFor="f-slug">Her link</label>
                <div className="linkgroup">
                  <span>{window.location.host}/for/</span>
                  <input id="f-slug" autoComplete="off" maxLength={40} spellCheck={false} value={site.slug}
                    onChange={(e) => { slugTouched.current = true; update({ slug: slugify(e.target.value) }); }} />
                </div>
                {!errors.slug && <small>Only people with this link can open it.</small>}
                <span className="err">{errors.slug}</span>
              </div>
            </div>
          </section>

          <section className="block half" aria-labelledby="h-letter">
            <h2 id="h-letter">Your letter</h2>
            <p className="hint">It types itself out for her, one letter at a time.</p>
            <div className={fieldCls('letter')}>
              <label htmlFor="f-letter" className="sr">Letter</label>
              <textarea className="input" id="f-letter" maxLength={2000} value={site.letter} onChange={(e) => update({ letter: e.target.value })} />
              <div className="rowmeta">
                <span>Opens with “My dearest {site.herName.trim() || 'her name'},”</span>
                <span>{site.letter.length} / 2000</span>
              </div>
              <span className="err">{errors.letter}</span>
            </div>
          </section>

          <section className="block" aria-labelledby="h-photos">
            <h2 id="h-photos">Photos</h2>
            <p className="hint">She flips through them one by one. Add up to 10, with a short caption for each.</p>
            <PhotoGrid photos={site.photos} setPhotos={setPhotos}
              isUsed={(url) => !!site.magazine && (site.magazine.library?.includes(url) || site.magazine.pages.some((p) => p.photos?.includes(url)))} />
          </section>

          <section className="block" aria-labelledby="h-mag">
            <h2 id="h-mag">Her magazine</h2>
            <p className="hint">A birthday issue starring her, ready to go. Swap in photos, rewrite any line, change fonts, and add or remove pages.</p>
            <MagazineEditor site={site} pages={site.magazine ? site.magazine.pages : defaultPages(site.photos)}
              magLibrary={site.magazine?.library || []} setMagazine={setMagazine} />
          </section>

          <section className="block" aria-labelledby="h-look">
            <h2 id="h-look">Look and music</h2>
            <p className="hint">Music starts when she opens the envelope.</p>
            <div className="tpls" role="radiogroup" aria-label="Template">
              {[['midnight', 'Midnight rose', 'Deep wine and candlelight'], ['blush', 'Blush dawn', 'Soft pink and morning light']].map(([v, name, desc]) => (
                <label className="tpl" data-tpl={v} key={v}>
                  <input type="radio" name="tpl" value={v} checked={site.template === v} onChange={() => update({ template: v })} />
                  <div className="swatch"><span>{(site.herName.trim()[0] || 'A').toUpperCase()}</span></div>
                  <b>{name}</b><em>{desc}</em>
                </label>
              ))}
            </div>
            <div className="pills" role="radiogroup" aria-label="Music">
              {[['box', 'Music box birthday tune'], ['piano', 'Soft piano'], ['custom', 'Your own song'], ['none', 'No music']].map(([v, label]) => (
                <label className="pill" key={v}>
                  <input type="radio" name="music" value={v} checked={site.music === v} onChange={() => update({ music: v })} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {site.music === 'custom' && <SongUpload song={site.song} setSong={(song) => update({ song })} />}
          </section>
        </div>

        <aside className="preview-col" aria-label="Live preview">
          <Cover site={site} />
          <p>This is the first thing she sees.</p>
          <button className="btn primary" type="button" onClick={preview}>Play the full surprise</button>
        </aside>
      </main>

      {previewing && <Experience site={site} preview onExit={() => setPreviewing(false)} />}

      <PublishDialog
        open={pub.open} link={pub.link} when={site.unlockAt} her={site.herName.trim()}
        onClose={() => setPub((p) => ({ ...p, open: false }))}
        onPreview={() => { setPub((p) => ({ ...p, open: false })); setPreviewing(true); }}
      />
    </>
  );
}
