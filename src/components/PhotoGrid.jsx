import { useState } from 'react';
import { api } from '../api';
import { MAX_PHOTOS, shrinkImage } from '../lib/format';
import { useToast } from './Toast';

export default function PhotoGrid({ photos, setPhotos, isUsed }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(0);
  const total = photos.length + uploading;
  const full = total >= MAX_PHOTOS;

  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    const room = MAX_PHOTOS - total;
    const take = files.slice(0, room);
    if (files.length > room) toast(`Only ${room} more photo${room === 1 ? '' : 's'} fit. Adding the first ${take.length}.`);
    setUploading((u) => u + take.length);
    for (const f of take) {
      try {
        const blob = await shrinkImage(f);
        const form = new FormData();
        form.append('photo', blob, f.name.replace(/\.\w+$/, '') + '.jpg');
        const { url, publicId } = await api('/upload', { method: 'POST', form });
        setPhotos((p) => [...p, { url, publicId, caption: '' }]);
      } catch (e) {
        toast(e.status ? e.message : `Couldn’t read ${f.name}. Try a JPG or PNG.`);
      } finally {
        setUploading((u) => u - 1);
      }
    }
  }

  function remove(i) {
    const p = photos[i];
    setPhotos((list) => list.filter((_, k) => k !== i));
    // still on a magazine page: keep the file
    if (p.publicId && !isUsed?.(p.url)) api('/upload', { method: 'DELETE', body: { publicId: p.publicId } }).catch(() => {});
  }

  return (
    <div className="photos">
      {photos.map((p, i) => (
        <figure className="ptile" key={p.url}>
          <img src={p.url} alt="" />
          <input
            className="input" maxLength={28} placeholder="Add a caption" aria-label={`Caption for photo ${i + 1}`}
            value={p.caption}
            onChange={(e) => setPhotos((list) => list.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))}
          />
          <button className="rm" type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(i)}>×</button>
        </figure>
      ))}
      {Array.from({ length: uploading }).map((_, i) => (
        <figure className="ptile" key={'up' + i}>
          <div className="addtile uploading"><small>Uploading…</small></div>
        </figure>
      ))}
      <label className={`addtile ${full ? 'disabled' : ''}`}>
        <strong>+ Add photos</strong>
        <small>{photos.length} of {MAX_PHOTOS} added</small>
        <input type="file" accept="image/*" multiple disabled={full}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </label>
    </div>
  );
}
