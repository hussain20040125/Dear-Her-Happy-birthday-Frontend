import { useState } from 'react';
import { api } from '../api';
import { useToast } from './Toast';
import AudioPlayer from './AudioPlayer';

const MAX_SONG_MB = 15;

export default function SongUpload({ song, setSong }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function addFile(f) {
    if (!f) return;
    if (!f.type.startsWith('audio/')) { toast('Choose an MP3 or other audio file.'); return; }
    if (f.size > MAX_SONG_MB * 1024 * 1024) { toast(`That song is over ${MAX_SONG_MB} MB. Choose a smaller one.`); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('song', f, f.name);
      const next = await api('/upload/song', { method: 'POST', form });
      if (song?.publicId) api('/upload', { method: 'DELETE', body: { publicId: song.publicId, kind: 'song' } }).catch(() => {});
      setSong(next);
    } catch (e) {
      toast(e.status ? e.message : `Couldn’t upload ${f.name}. Try again.`);
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    if (song?.publicId) api('/upload', { method: 'DELETE', body: { publicId: song.publicId, kind: 'song' } }).catch(() => {});
    setSong(null);
  }

  return (
    <div className="song">
      {song && !uploading && (
        <div className="song-row">
          <AudioPlayer src={song.url} name={song.name} start={song.start || 0} end={song.end || 0}
            onTrim={(start, end) => setSong({ ...song, start, end })} />
          <button className="btn ghost-danger" type="button" onClick={remove}>Remove</button>
        </div>
      )}
      <label className={`song-add ${uploading ? 'uploading' : ''}`}>
        <strong>{uploading ? 'Uploading…' : song ? 'Change song' : '+ Upload a song'}</strong>
        <small>MP3, M4A or WAV, up to {MAX_SONG_MB} MB</small>
        <input type="file" accept="audio/*" disabled={uploading}
          onChange={(e) => { addFile(e.target.files[0]); e.target.value = ''; }} />
      </label>
    </div>
  );
}
