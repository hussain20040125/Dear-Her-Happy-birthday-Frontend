import { useId, useMemo, useRef } from 'react';
import QRCode from 'qrcode';

const HEART = 'M0 -.28C0 -.62 -.5 -.62 -.5 -.26C-.5 .02 -.12 .2 0 .4C.12 .2 .5 .02 .5 -.26C.5 -.62 0 -.62 0 -.28Z';

/**
 * A romantic QR code for her link: heart-shaped dots, heart corner markers and her initial in the middle.
 * High error correction keeps it scannable with the heart covering the center.
 */
export default function LoveQR({ text, name = '' }) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef();
  const initial = (name.trim()[0] || '♥').toUpperCase();

  const qr = useMemo(() => QRCode.create(text, { errorCorrectionLevel: 'H' }), [text]);
  const n = qr.modules.size;
  const dark = (r, c) => qr.modules.data[r * n + c];
  const M = 2; // quiet zone, in modules
  const S = n + M * 2;
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const hole = n * .24; // center heart badge size, in modules
  const inHole = (r, c) => Math.abs(r - (n - 1) / 2) < hole / 2 + .6 && Math.abs(c - (n - 1) / 2) < hole / 2 + .6;

  const dots = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!dark(r, c) || finder(r, c) || inHole(r, c)) continue;
    dots.push(<path key={r * n + c} d={HEART} transform={`translate(${c + M + .5} ${r + M + .56}) scale(1.32)`} />);
  }

  const eye = (r, c) => (
    <g key={`${r}-${c}`} transform={`translate(${c + M} ${r + M})`}>
      <rect x=".5" y=".5" width="6" height="6" rx="2" fill="none" stroke={`url(#g${uid})`} strokeWidth="1" />
      <rect x="2" y="2" width="3" height="3" rx="1" fill={`url(#g${uid})`} />
    </g>
  );

  const fileName = `for-${(name || 'her').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`;

  // A keepsake card: the QR plus a script caption, drawn at print size
  async function toPng() {
    const svg = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const W = 1080, H = 1350, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#FFF3F6'); bg.addColorStop(1, '#F8CFDB');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.drawImage(img, 140, 150, 800, 800);
    await document.fonts.load('96px "Pinyon Script"').catch(() => {});
    g.textAlign = 'center';
    g.fillStyle = '#8A2C4D';
    g.font = '96px "Pinyon Script", cursive';
    g.fillText(name ? `Scan me, ${name}` : 'Scan me, love', W / 2, 1090);
    g.font = 'italic 34px "Newsreader", Georgia, serif';
    g.fillStyle = '#A3536F';
    g.fillText('Something is waiting for you', W / 2, 1160);
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }

  async function download() {
    const blob = await toPng();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function share() {
    const blob = await toPng();
    const file = new File([blob], fileName, { type: 'image/png' });
    try { await navigator.share({ files: [file], title: 'For you', text }); } catch { /* cancelled */ }
  }
  const canShare = typeof navigator !== 'undefined' && navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] });

  return (
    <figure className="lqr">
      <div className="lqr-card">
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="QR code for her link">
          <defs>
            <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#D2557C" />
              <stop offset="1" stopColor="#7A1F43" />
            </linearGradient>
          </defs>
          <g fill={`url(#g${uid})`}>{dots}</g>
          {eye(0, 0)}{eye(0, n - 7)}{eye(n - 7, 0)}
          <g transform={`translate(${S / 2} ${S / 2 + .3})`}>
            <path d={HEART} transform={`scale(${hole + 1.4})`} fill="#fff" />
            <path d={HEART} transform={`scale(${hole})`} fill={`url(#g${uid})`} />
            <text y={hole * .02} textAnchor="middle" dominantBaseline="middle" fontFamily="'Pinyon Script', cursive" fontSize={hole * .5} fill="#FFE9EF">{initial}</text>
          </g>
        </svg>
        <figcaption>{name ? `Scan me, ${name}` : 'Scan me, love'}</figcaption>
      </div>
      <div className="lqr-actions">
        <button type="button" className="btn" onClick={download}>Download QR</button>
        {canShare && <button type="button" className="btn" onClick={share}>Share QR</button>}
      </div>
    </figure>
  );
}
