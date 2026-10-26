import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import Experience from '../components/Experience';

// The page she opens from the link
export default function PublicSite() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(false);

  const load = useCallback(() => {
    api(`/public/${slug}`).then(({ site }) => setSite(site)).catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Countdown hit zero: the server needs a moment to agree, so retry until unlocked
  const onUnlock = useCallback(() => {
    let tries = 0;
    const attempt = () => api(`/public/${slug}`).then(({ site }) => {
      if (site.locked && tries++ < 10) setTimeout(attempt, 1500); else { setCelebrate(!site.locked); setSite(site); }
    }).catch(() => setTimeout(attempt, 3000));
    setTimeout(attempt, 800);
  }, [slug]);

  if (error) return (
    <div className="exp on public-msg" data-tpl="midnight">
      <div className="stage"><section className="scene active">
        <p className="x-k">Hmm</p><p className="x-sub">{error}</p>
      </section></div>
    </div>
  );
  if (!site) return <div className="exp on" data-tpl="midnight" aria-busy="true" />;

  return <Experience site={site} onUnlock={onUnlock} celebrate={celebrate} />;
}
