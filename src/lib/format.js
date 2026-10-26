export const MAX_PHOTOS = 10;
export const pad = (n) => String(n).padStart(2, '0');

export const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function formatWhen(value) {
  const d = new Date(value);
  if (isNaN(d)) return '';
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  const time = d
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    .replace(/\s?(am|pm)/i, (m, p) => ' ' + p.toUpperCase());
  return `${date}, ${time}`;
}

export const slugify = (s = '') =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 40);

export const initial = (s = '') => (s.trim()[0] || '♥').toUpperCase();

export const DEFAULT_LETTER =
  'Another year of you, and somehow I’m still finding new things to love. The way you laugh at your own jokes before you finish them. The way you remember everyone’s chai order. The way you turn an ordinary Tuesday into something worth keeping.\n\nThank you for every late-night call, every silly fight we laughed about later, and every quiet moment that felt like home.\n\nToday is all yours. I hope this year is as kind to you as you are to everyone around you.';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Resize a photo in the browser before upload (faster uploads on mobile data)
export function shrinkImage(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('read')); };
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * sc);
      cv.height = Math.round(img.height * sc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85);
    };
    img.src = url;
  });
}
