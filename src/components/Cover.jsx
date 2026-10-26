import { formatWhen, initial } from '../lib/format';

// The small phone preview: first screen she sees
export default function Cover({ site }) {
  return (
    <div className="phone">
      <div className="cover" data-tpl={site.template}>
        <p className="k">A surprise for</p>
        <p className="n">{site.herName.trim() || 'Her name'}</p>
        <p className="o">{site.unlockAt ? 'Opens ' + formatWhen(site.unlockAt) : 'Pick an unlock time'}</p>
        <div className="mini-env"><i>{initial(site.herName)}</i></div>
        <p className="f">{site.yourName.trim() ? 'From ' + site.yourName.trim() : ''}</p>
      </div>
    </div>
  );
}
