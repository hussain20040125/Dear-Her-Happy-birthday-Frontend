// Music made in the browser with Web Audio, so no audio files to host.
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const m = n.match(/^([A-G]#?)(\d)$/);
  return 440 * Math.pow(2, ((+m[2] + 1) * 12 + NOTE[m[1]] - 69) / 12);
};

const SONGS = {
  box: {
    beat: 0.5,
    seq: [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2], ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
      ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2], ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 2], ['', 2]],
  },
  piano: {
    beat: 0.42,
    seq: (() => {
      const ch = [['C3', 'C4', 'E4', 'G4', 'C5', 'E5'], ['A2', 'A3', 'C4', 'E4', 'A4', 'C5'], ['F2', 'F3', 'A3', 'C4', 'F4', 'A4'], ['G2', 'G3', 'B3', 'D4', 'G4', 'B4']];
      const out = [];
      ch.forEach((c) => { out.push([c[0] + ' ' + c[1], 1]); [2, 3, 4, 5, 4, 3].forEach((k) => out.push([c[k], .5])); out.push([c[2], 1]); });
      return out;
    })(),
  },
};

// The creator's uploaded song, looping only the part he picked (from..to seconds; to 0 = the end)
function createTrack(src, onChange, from = 0, to = 0) {
  const audio = src ? new Audio(src) : null;
  if (audio) {
    audio.preload = 'auto';
    audio.loop = !to && !from;
    audio.addEventListener('timeupdate', () => { if (to && audio.currentTime >= to) audio.currentTime = from; });
    audio.addEventListener('ended', () => { if (!audio.loop) { audio.currentTime = from; audio.play().catch(() => {}); } });
  }
  let playing = false;
  function start() {
    if (!audio || playing) return;
    playing = true;
    if (audio.currentTime < from || (to && audio.currentTime >= to)) audio.currentTime = from;
    audio.play().then(() => onChange?.(true)).catch(() => { playing = false; });
  }
  function prime() {
    if (!audio || playing) return;
    audio.muted = true;
    audio.play().then(() => { if (!playing) { audio.pause(); audio.currentTime = from; } audio.muted = false; })
      .catch(() => { audio.muted = false; });
  }
  function stop() { playing = false; audio?.pause(); onChange?.(false); }
  function destroy() { playing = false; if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } }
  return { start, stop, destroy, prime, toggle: () => (playing ? stop() : start()) };
}

export function createMusic(type, onChange, song) {
  if (type === 'custom') return createTrack(song?.url, onChange, song?.start || 0, song?.end || 0);
  let ac, master, sched, nextT = 0, step = 0, playing = false;

  function init() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.22; master.connect(ac.destination);
    const dl = ac.createDelay(); dl.delayTime.value = 0.32;
    const fb = ac.createGain(); fb.gain.value = 0.32;
    const wet = ac.createGain(); wet.gain.value = 0.3;
    master.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(ac.destination);
  }

  function pluck(f, t, vol) {
    [[1, 'sine', vol], [2, 'triangle', vol * .18], [3, 'sine', vol * .06]].forEach(([mul, wave, v]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = wave; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + 1.8);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.9);
    });
  }

  function start() {
    if (type === 'none' || !SONGS[type]) return;
    try {
      init();
      ac.resume().then(() => { if (playing) onChange?.(true); }).catch(() => {});
      if (playing) return;
      playing = true; step = 0; nextT = ac.currentTime + .15;
      const song = SONGS[type];
      sched = setInterval(() => {
        while (nextT < ac.currentTime + .25) {
          const [n, b] = song.seq[step];
          if (n) n.split(' ').forEach((x, k) => pluck(freq(x), nextT, k === 0 && n.includes(' ') ? .5 : .75));
          nextT += b * song.beat; step = (step + 1) % song.seq.length;
        }
      }, 60);
      onChange?.(ac.state === 'running');
    } catch { /* audio not available */ }
  }

  function stop() { playing = false; clearInterval(sched); onChange?.(false); }
  function destroy() { playing = false; clearInterval(sched); ac?.close().catch(() => {}); }
  // wake the audio engine inside her tap, without playing anything yet
  function prime() {
    if (type === 'none' || !SONGS[type]) return;
    try { init(); ac.resume().catch(() => {}); } catch { /* audio not available */ }
  }

  return { start, stop, destroy, prime, toggle: () => (playing ? stop() : start()) };
}
