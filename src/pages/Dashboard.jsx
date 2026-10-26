import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Dialog';
import { DEFAULT_LETTER, formatWhen } from '../lib/format';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const [sites, setSites] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { api('/sites').then((d) => setSites(d.sites)).catch((e) => { toast(e.message); setSites([]); }); }, [toast]);

  async function create() {
    setCreating(true);
    try {
      const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(0, 0, 0, 0);
      const { site } = await api('/sites', { method: 'POST', body: { yourName: user.name, unlockAt: d.toISOString(), letter: DEFAULT_LETTER } });
      nav(`/edit/${site._id}`);
    } catch (e) { toast(e.message); setCreating(false); }
  }

  async function remove(site) {
    const ok = await confirm({
      title: `Delete ${site.herName ? site.herName + '’s surprise' : 'this draft'}?`,
      message: 'Her link will stop working and the photos, magazine and song are removed. This can’t be undone.',
      confirmText: 'Delete', cancelText: 'Keep it', danger: true,
    });
    if (!ok) return;
    try { await api(`/sites/${site._id}`, { method: 'DELETE' }); setSites((s) => s.filter((x) => x._id !== site._id)); toast('Surprise deleted'); }
    catch (e) { toast(e.message); }
  }

  return (
    <>
      <header className="topbar">
        <p className="brand">Dear Her</p>
        <span className="save-state">{user.name}</span>
        <div className="actions"><button className="btn" type="button" onClick={logout}>Log out</button></div>
      </header>
      <main className="dash">
        <div className="intro">
          <h1>Your surprises</h1>
          <p>Each one gets its own link that unlocks at the moment you choose.</p>
        </div>
        <button className="btn primary" type="button" onClick={create} disabled={creating}>
          {creating ? 'Creating…' : 'Create a new surprise'}
        </button>

        {sites === null && <p className="dash-empty">Loading…</p>}
        {sites?.length === 0 && <p className="dash-empty">No surprises yet. Create one and it’s ready in a few minutes.</p>}
        {sites?.length > 0 && (
          <ul className="site-list">
            {sites.map((s) => (
              <li key={s._id} className="site-row">
                <div className="swatch-dot" data-tpl={s.template}><span>{(s.herName || '?')[0]}</span></div>
                <div className="site-main">
                  <p className="site-name"><Link className="site-open" to={`/edit/${s._id}`}>{s.herName || 'Untitled surprise'}</Link></p>
                  <p className="site-meta">
                    <span className={`chip ${s.status}`}>{s.status === 'published' ? 'Published' : 'Draft'}</span>
                    Opens {formatWhen(s.unlockAt)}
                    {s.status === 'published' && <> · <a href={`/for/${s.slug}`} target="_blank" rel="noreferrer">/for/{s.slug}</a></>}
                  </p>
                </div>
                <div className="site-actions">
                  <Link className="btn" to={`/edit/${s._id}`}>Edit</Link>
                  <button className="btn ghost-danger" type="button" onClick={() => remove(s)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
