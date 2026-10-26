// Magazine page templates. Every page renders the same in the editor (editable)
// and in the flip-book she reads, sized in container units so it scales to any page width.

export const FONTS = {
  classic: { name: 'Classic serif', css: '"Playfair Display", Georgia, serif' },
  fashion: { name: 'Fashion', css: '"Bodoni Moda", "Playfair Display", serif' },
  poster: { name: 'Bold poster', css: 'Anton, Impact, sans-serif' },
  modern: { name: 'Modern', css: 'Figtree, system-ui, sans-serif' },
  romantic: { name: 'Romantic script', css: '"Pinyon Script", cursive' },
  hand: { name: 'Handwritten', css: 'Caveat, "Comic Sans MS", cursive' },
};

const issueDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const fill = (s, info) => s.replace(/\{(\w+)\}/g, (m, k) => (info[k] ?? m));

// A ragged "torn paper" edge along the bottom of an element
const TORN = `polygon(0 0,100% 0,${Array.from({ length: 26 }, (_, i) => {
  const x = 100 - i * 4;
  return `${x}% ${86 + ((i * 7) % 5) * 3.2}%`;
}).join(',')},0 92%)`;

function T({ k, as: Tag = 'span', className = '', ctx }) {
  const val = ctx.text(k);
  if (!ctx.editable) return <Tag className={`mg-t ${className}`}>{val}</Tag>;
  return (
    // keyed on the value so a saved edit remounts cleanly instead of React patching typed-in DOM
    <Tag
      key={ctx.pageId + k + val}
      className={`mg-t mg-edit ${className}`}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      title="Click to edit"
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => ctx.setText(k, e.currentTarget.innerText.replace(/\n{3,}/g, '\n\n').trim())}
    >{val}</Tag>
  );
}

function Slot({ i, className = '', ctx }) {
  const url = ctx.photo(i);
  const busy = ctx.busy?.has(i);
  if (!ctx.editable) return <div className={`mg-slot ${className} ${url ? '' : 'empty'}`}>{url && <img src={url} alt="" draggable={false} />}</div>;
  return (
    <div
      className={`mg-slot ${className} ${url ? '' : 'empty'} ${ctx.selSlot === i ? 'sel' : ''} ${busy ? 'busy' : ''}`}
      role="button" tabIndex={0} aria-label={`Photo spot ${i + 1}${url ? '' : ', empty'}`}
      onClick={(e) => { e.stopPropagation(); ctx.selectSlot(i); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.selectSlot(i); } }}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('over')}
      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); ctx.dropSlot(i, e.dataTransfer); }}
    >
      {url && <img src={url} alt="" draggable={false} />}
      {!url && !busy && <span className="mg-drop">Drop a photo</span>}
      {busy && <span className="mg-drop">Uploading…</span>}
    </div>
  );
}

const Heart = (p) => <svg viewBox="0 0 24 24" {...p}><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2.1 0 3.7 1.2 4.6 2.7h2C13.9 6.2 15.5 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" /></svg>;
const Star = (p) => <svg viewBox="0 0 24 24" {...p}><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.4 5.8 21.1l1.6-7L2 9.3l7.1-.7z" /></svg>;
const Barcode = ({ ctx }) => <div className="mg-barcode" aria-hidden="true"><i /><T k="issue" ctx={ctx} /></div>;

export const TEMPLATES = {
  endless: {
    name: 'Endless cover', group: 'Covers', photos: 4, font: 'classic',
    texts: { title: 'Endless us', sub: 'Stories, memories, and the magic of being in love', badge: 'Birthday edition {year}', lines: 'From the first hello\nto every inside joke.\nThe {her} issue.' },
    render: (ctx) => (
      <div className="mg t-endless">
        <Slot i={0} ctx={ctx} className="t-fill" />
        <div className="t-endless-top" style={{ clipPath: TORN }}>
          <T k="title" ctx={ctx} className="t-endless-title" />
          <T k="sub" ctx={ctx} className="t-endless-sub" />
        </div>
        <T k="badge" ctx={ctx} className="t-badge" />
        <T k="lines" ctx={ctx} className="t-coverlines" />
        <div className="t-film">{[1, 2, 3].map((i) => <Slot key={i} i={i} ctx={ctx} />)}</div>
      </div>
    ),
  },
  birthday: {
    name: 'Birthday cover', group: 'Covers', photos: 1, font: 'fashion',
    texts: { happy: 'Happy', big: 'Birthday', name: '{her}', vol: 'Vol. 01', date: '{date}', est: 'Est. {year}' },
    render: (ctx) => (
      <div className="mg t-bday">
        <Slot i={0} ctx={ctx} className="t-fill" />
        <div className="t-shade-top" />
        <T k="vol" ctx={ctx} className="t-bday-vol" />
        <div className="t-bday-head">
          <T k="happy" ctx={ctx} className="t-bday-happy" />
          <T k="big" ctx={ctx} className="t-bday-big" />
          <T k="name" ctx={ctx} className="t-bday-name" />
        </div>
        <T k="date" ctx={ctx} className="t-bday-date" />
        <T k="est" ctx={ctx} className="t-bday-est" />
      </div>
    ),
  },
  soft: {
    name: 'Soft cover', group: 'Covers', photos: 1, font: 'fashion',
    texts: { title: 'Happy\nbirthday', note: 'beautiful {her}', side: 'Best\nhuman' },
    render: (ctx) => (
      <div className="mg t-soft">
        <Slot i={0} ctx={ctx} className="t-soft-photo" />
        <T k="title" ctx={ctx} className="t-soft-title" />
        <div className="t-soft-note">
          <T k="note" ctx={ctx} />
          <svg viewBox="0 0 60 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 4c4 18 16 30 40 36M40 32l8 8-10 4" /></svg>
        </div>
        <T k="side" ctx={ctx} className="t-soft-side" />
      </div>
    ),
  },
  favourite: {
    name: 'My favourite', group: 'Inside', photos: 1, font: 'modern',
    texts: { word: 'my Favourite', label: 'The {her} podcast', date: '{date}' },
    render: (ctx) => (
      <div className="mg t-fav">
        <div className="t-fav-torn" style={{ clipPath: TORN }} />
        <T k="label" ctx={ctx} className="t-fav-label" />
        <T k="date" ctx={ctx} className="t-fav-date" />
        <div className="t-fav-words">
          <T k="word" ctx={ctx} className="t-fav-word" />
          {[1, 2, 3, 4, 5].map((r) => <span key={r} className="t-fav-word" aria-hidden="true">{ctx.text('word')}</span>)}
        </div>
        <Slot i={0} ctx={ctx} className="t-fav-photo" />
      </div>
    ),
  },
  bw: {
    name: 'Just the way', group: 'Inside', photos: 4, font: 'classic',
    texts: { cap: 'Just the way\nyou are!' },
    render: (ctx) => (
      <div className="mg t-bw">
        <div className="t-bw-grid">{[0, 1, 2, 3].map((i) => <Slot key={i} i={i} ctx={ctx} className="gray" />)}</div>
        <T k="cap" ctx={ctx} className="t-bw-cap" />
      </div>
    ),
  },
  scrapbook: {
    name: 'Scrapbook', group: 'Inside', photos: 2, font: 'hand',
    texts: {
      quote: 'you’re my person.',
      lyrics: 'Only you understand how I’m feeling now, yeah\nAnd I know, I can tell you anything\nYou won’t judge, you’re just listening',
      note: 'i ♡ U to\nthe moon\nand back.',
    },
    render: (ctx) => (
      <div className="mg t-scrap">
        <div className="t-scrap-in" />
        <T k="quote" ctx={ctx} className="t-scrap-quote" />
        <span className="t-scrap-eye" aria-hidden="true" />
        <Slot i={0} ctx={ctx} className="framed t-scrap-p1" />
        <T k="lyrics" ctx={ctx} className="t-scrap-lyrics" />
        <Slot i={1} ctx={ctx} className="framed t-scrap-p2" />
        <T k="note" ctx={ctx} className="t-scrap-note" />
        <Star className="t-scrap-star" aria-hidden="true" />
        <Star className="t-scrap-star b" aria-hidden="true" />
      </div>
    ),
  },
  collage: {
    name: 'Love collage', group: 'Inside', photos: 3, font: 'romantic',
    texts: { love: 'love', xo: 'XOXO' },
    render: (ctx) => (
      <div className="mg t-col">
        <Slot i={0} ctx={ctx} className="t-col-a" />
        <Slot i={1} ctx={ctx} className="framed t-col-b" />
        <Slot i={2} ctx={ctx} className="t-col-c" />
        <T k="love" ctx={ctx} className="t-col-love" />
        <T k="xo" ctx={ctx} className="t-col-xo" />
        <Heart className="t-doodle d1" aria-hidden="true" />
        <Heart className="t-doodle d2" aria-hidden="true" />
        <Star className="t-doodle d3" aria-hidden="true" />
        <svg className="t-doodle d4" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 20c0-3 4-3 4 0s-6 6-8 0 6-10 12-4 0 18-10 14" /></svg>
      </div>
    ),
  },
  song: {
    name: 'Our song', group: 'Inside', photos: 1, font: 'modern',
    texts: { title: 'What Makes You Beautiful', artist: 'One Direction', t1: '0:38', t2: '-3:16' },
    render: (ctx) => (
      <div className="mg t-song">
        <Slot i={0} ctx={ctx} className="t-song-art" />
        <div className="t-song-row">
          <div><T k="title" ctx={ctx} className="t-song-title" /><T k="artist" ctx={ctx} className="t-song-artist" /></div>
          <Heart className="t-song-heart" aria-hidden="true" />
        </div>
        <div className="t-song-bar"><i /></div>
        <div className="t-song-times"><T k="t1" ctx={ctx} /><T k="t2" ctx={ctx} /></div>
        <svg className="t-song-ctrl" viewBox="0 0 200 40" aria-hidden="true">
          <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M8 14h6l10 12h6M8 26h6l3-4M24 14h6M27 11l3 3-3 3M27 23l3 3-3 3" /></g>
          <path d="M58 12v16M74 12l-14 8 14 8z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="100" cy="20" r="17" fill="#fff" /><path d="M95 13v14M105 13v14" stroke="#1A2036" strokeWidth="4" strokeLinecap="round" />
          <path d="M142 12v16M126 12l14 8-14 8z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <g fill="none" stroke="#1ED760" strokeWidth="2" strokeLinecap="round"><path d="M172 22v-4a4 4 0 014-4h14M186 10l4 4-4 4M192 18v4a4 4 0 01-4 4h-14M178 30l-4-4 4-4" /></g>
        </svg>
      </div>
    ),
  },
  comic: {
    name: 'Comic strip', group: 'Inside', photos: 6, font: 'hand',
    texts: { b0: 'Hi! I’m {her}.', b1: 'And I’m the lucky one.', b2: 'Coffee?', b3: 'Always.', b4: 'Remember this day?', b5: 'Every single bit.' },
    render: (ctx) => (
      <div className="mg t-comic">
        <div className="t-comic-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="t-panel" key={i}>
              <Slot i={i} ctx={ctx} className="t-fill" />
              <T k={'b' + i} ctx={ctx} className={`t-bubble ${i % 2 ? 'r' : ''}`} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  story: {
    name: 'Story', group: 'Inside', photos: 1, font: 'classic',
    texts: { kick: 'Feature', head: 'The day it all began', body: 'Some days just stay with you. This is one of them, and I still smile every time I see it.', by: 'Words by {him}' },
    render: (ctx) => (
      <div className="mg t-story">
        <p className="mg-run"><span>Moments</span><span>The birthday issue</span></p>
        <Slot i={0} ctx={ctx} className="t-story-photo" />
        <T k="kick" ctx={ctx} className="mg-kick" />
        <T k="head" ctx={ctx} className="mg-head" />
        <T k="body" ctx={ctx} className="mg-body" />
        <T k="by" ctx={ctx} className="mg-by" />
      </div>
    ),
  },
  ad: {
    name: 'Hugs ad', group: 'Inside', photos: 0, font: 'classic',
    texts: { label: 'Advertisement', head: 'Hugs.\nUnlimited.', sub: 'No expiry date. No terms and conditions.\nRedeemable any time with {him}.', fine: 'Offer valid for {her} only. Side effects include smiling.' },
    render: (ctx) => (
      <div className="mg mg-ad">
        <T k="label" ctx={ctx} className="mg-adlabel" />
        <Heart className="mg-heart" aria-hidden="true" />
        <T k="head" ctx={ctx} className="mg-adhead" />
        <T k="sub" ctx={ctx} className="mg-adsub" />
        <T k="fine" ctx={ctx} className="mg-adfine" />
      </div>
    ),
  },
  letter: {
    name: 'Editor’s letter', group: 'Endings', photos: 0, font: 'romantic',
    texts: {
      kick: 'Editor’s letter', dear: 'Dear {her},',
      body: 'Every page of this issue is you. The laughs, the quiet days, the ones I still replay in my head. I made this so you’d have them all in one place.\n\nHere’s to a whole year of new moments. I can’t wait to fill the next issue with you.',
      sign: '{him}', role: 'Editor in chief',
    },
    render: (ctx) => (
      <div className="mg mg-letter">
        <p className="mg-run"><span>Moments</span><span>The birthday issue</span></p>
        <T k="kick" ctx={ctx} className="mg-kick" />
        <T k="dear" ctx={ctx} className="mg-dear" />
        <T k="body" ctx={ctx} className="mg-body" />
        <T k="sign" ctx={ctx} className="mg-sign" />
        <T k="role" ctx={ctx} className="mg-by" />
      </div>
    ),
  },
  back: {
    name: 'Back cover', group: 'Endings', photos: 0, font: 'classic',
    texts: { mast: 'Moments', cont: 'To be\ncontinued…', next: 'Next issue: every day after this one', issue: 'Issue No. 01 · Priceless' },
    render: (ctx) => (
      <div className="mg mg-back">
        <T k="mast" ctx={ctx} className="mg-backmast" />
        <T k="cont" ctx={ctx} className="mg-cont" />
        <T k="next" ctx={ctx} className="mg-kick" />
        <Barcode ctx={ctx} />
      </div>
    ),
  },
};

export const newId = () => Math.random().toString(36).slice(2, 9);

export const blankPage = (tpl) => ({ id: newId(), tpl, font: '', photos: [], texts: {} });

// The ready-made issue, filled with her photos in order
export function defaultPages(photos = []) {
  const order = ['endless', 'favourite', 'bw', 'scrapbook', 'collage', 'song', 'letter', 'back'];
  let k = 0;
  const next = () => (photos.length ? photos[k++ % photos.length].url : '');
  return order.map((tpl, i) => ({
    id: 'd' + i, tpl, font: '', texts: {},
    photos: Array.from({ length: TEMPLATES[tpl].photos }, next),
  }));
}

// What she reads: his pages, or the ready-made issue. Kept to an even count so the back cover lands alone.
export function resolvePages(site) {
  const pages = site.magazine ? site.magazine.pages || [] : (site.photos?.length ? defaultPages(site.photos) : []);
  const valid = pages.filter((p) => TEMPLATES[p.tpl]);
  if (valid.length % 2) valid.splice(Math.max(1, valid.length - 1), 0, { id: 'pad', tpl: 'ad', photos: [], texts: {} });
  return valid;
}

export function magInfo(site) {
  const when = site.unlockAt || Date.now();
  return {
    her: (site.herName || '').trim() || 'you', him: (site.yourName || '').trim() || 'me',
    date: issueDate(when), year: new Date(when).getFullYear(),
  };
}

/**
 * One magazine page.
 * edit (editor only): { setText(k, v), selSlot, selectSlot(i), dropSlot(i, dataTransfer), busy:Set }
 */
export function MagPage({ page, info, edit }) {
  const tpl = TEMPLATES[page.tpl] || TEMPLATES.story;
  const ctx = {
    pageId: page.id,
    editable: !!edit,
    text: (k) => page.texts?.[k] ?? fill(tpl.texts[k] ?? '', info),
    photo: (i) => page.photos?.[i] || '',
    ...edit,
  };
  return (
    <div className="mg-root" style={{ '--mg-d': (FONTS[page.font] || FONTS[tpl.font]).css }}>
      {tpl.render(ctx)}
    </div>
  );
}
