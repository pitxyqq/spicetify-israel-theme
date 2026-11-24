/* Israel: gold edition. Intro and bass hits.
 *
 * The star itself lives in user.css. This file plays the startup intro and slams
 * the star on every bass hit. It only reads song data and draws: playback and
 * account data are never changed.
 */
(function israelGold() {
  "use strict";
  if (window.israelGold) {  const old = document.getElementById("il-intro");  if (old) old.remove();  const el = document.createElement("div");  el.id = "il-intro";  el.innerHTML = '<svg viewBox="-100 -100 200 200" fill="none"><path pathLength="1" d="M0-80 69.3 40H-69.3Z"/><path pathLength="1" d="M0 80 69.3-40H-69.3Z"/></svg>';  document.body?.appendChild(el);  setTimeout(() => el.remove(), 2600);  return;}

  const SETTINGS = {
    intro: true,        // star draws itself when Spotify starts
    bass: true,         // slam on bass hits
    strict: 0.5,        // 0.35 = more hits, 0.65 = only the heaviest bass
    punch: 0.22,        // how far the star jumps on a full hit (0.22 = 22%)
    offsetMs: 0,        // raise this if hits look early (Bluetooth), lower if late
    pausedSpeed: 0.2,   // spin speed while music is paused (1 = full)
  };

  const WAVEFORM = 237; // Spotify's metadata extension id for the 3-band waveform
  const player = () => window.Spicetify?.Player;
  const isPlaying = () => {
    try { return !!player()?.isPlaying?.(); } catch { return false; }
  };
  const star = () => document.querySelector(".Root__main-view");

  /* ---------- Finding the hits ---------- */

  // Bass hits of a whole song. First collect every sharp rise in the lows, then
  // learn from all of them what this song's own kick or 808 looks like, and keep
  // only the ones that match. Parts without bass therefore stay completely still.
  function bassMap(wave) {
    const w = wave.sampleWindowSizeMs, n = wave.lows.length;
    const span = Math.max(1, Math.round(60 / w));   // how far back an attack can start
    const near = Math.max(1, Math.round(70 / w));   // one hit per this neighbourhood
    const hold = Math.max(0, Math.round(20 / w) - 1); // hides the ripple of a bass note

    const scaled = (band) => {
      const top = Array.from(band).sort((a, b) => a - b)[Math.floor(n * 0.995)] || 1;
      return Array.from(band, (v, i) => {
        for (let j = Math.max(0, i - hold); j < i; j++) v = Math.max(v, band[j]);
        return Math.min(1, Math.max(0, v / top));
      });
    };
    const rises = (band) => band.map((v, i) => {
      let floor = v;
      for (let j = Math.max(0, i - span); j < i; j++) floor = Math.min(floor, band[j]);
      return v - floor;
    });
    const peak = (band, i) => {
      let m = 0;
      for (let j = Math.max(0, i - near); j <= Math.min(n - 1, i + near); j++) m = Math.max(m, band[j]);
      return m;
    };

    const low = scaled(wave.lows), rise = rises(low);
    const same = (band) => band?.length === n;
    const others = [wave.mids, wave.highs].filter(same).map((b) => rises(scaled(b)));

    // 1. Every sharp rise in the lows
    const found = [];
    for (let i = 1; i < n; i++) {
      if (rise[i] < 0.06 || rise[i] < peak(rise, i) || rise[i - 1] === rise[i]) continue;
      const other = Math.max(0, ...others.map((b) => peak(b, i)));
      const pure = rise[i] / (rise[i] + other); // 1 = only bass moved
      found.push({ i, rise: rise[i], level: peak(low, i), other, weight: (rise[i] * pure) ** 3 });
    }
    if (found.length < 8) return [];

    // 2. What this song's bass looks like. Heavy, bass-only rises count most, so
    //    they outvote the many small ones made by snares, voices and noise.
    const typical = (key) => {
      const list = [...found].sort((a, b) => a[key] - b[key]);
      const total = list.reduce((sum, f) => sum + f.weight, 0);
      let sum = 0;
      for (const f of list) if ((sum += f.weight) >= total / 2) return f[key];
    };
    const bass = { rise: typical("rise"), level: typical("level") };

    // 3. Keep what matches
    const hits = [];
    for (const f of found) {
      if (f.rise < bass.rise * SETTINGS.strict || f.level < bass.level * 0.5) continue;
      // Mostly mids and highs: a snare, clap or voice with a bit of body
      if (f.level < bass.level * 0.85 && f.rise < f.other) continue;
      let start = f.i;
      const edge = low[f.i] - f.rise * 0.6; // where the attack is clearly under way
      while (start > 0 && start > f.i - span && low[start - 1] > edge) start--;
      const t = (start + 0.5) * w; // the attack lies somewhere inside that sample
      // Weight of this hit next to the song's usual bass: light taps stay small.
      const weight = 0.6 * (f.rise / bass.rise) + 0.4 * (f.level / bass.level);
      const power = Math.min(1, Math.max(0.25, 0.25 + 0.75 * (weight - 0.5) / 0.55));
      // How long the note rings, so a kick snaps and an 808 stays out longer.
      let end = f.i;
      while (end < n - 1 && (end - f.i) * w < 700 && low[end + 1] > f.level * 0.45) end++;
      const hit = { t, power, length: Math.min(700, Math.max(180, (end - start + 1) * w * 1.4)) };
      const last = hits[hits.length - 1];
      if (!last || t - last.t >= 90) hits.push(hit);
      else if (power > last.power) hits[hits.length - 1] = hit;
    }
    // Settle before the next hit, so every one of them reads as a separate beat.
    hits.forEach((h, k) => {
      if (hits[k + 1]) h.length = Math.max(100, Math.min(h.length, hits[k + 1].t - h.t - 10));
    });
    return hits;
  }

  /* ---------- Reading the song ---------- */

  function metadata() {
    try { return Spicetify.Platform.Registry.resolve(Symbol.for("MetadataExtensions")); } catch { return null; }
  }

  const timeout = (promise, ms) =>
    Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error("timed out")), ms))]);

  async function readWave(uri) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((ok) => setTimeout(ok, 2500));
      try {
        const wave = (await timeout(metadata().fetch([uri, WAVEFORM]), 8000))?.[uri]?.[WAVEFORM];
        if (wave?.lows?.length && wave.sampleWindowSizeMs > 0) return wave;
      } catch { /* try again */ }
    }
    return null;
  }

  // Only real bass counts. Without usable data there are no hits at all.
  const maps = new Map();
  function mapSong(uri) {
    if (!maps.has(uri)) {
      if (maps.size > 30) maps.delete(maps.keys().next().value);
      const job = readWave(uri).then((wave) => {
        if (!wave) { maps.delete(uri); return { hits: [] }; }
        const ms = wave.sampleWindowSizeMs;
        // Coarser than this, a hit can't be placed in time.
        if (ms > 130) return { hits: [] };
        const hits = bassMap(wave);
        return { hits };
      });
      maps.set(uri, job);
    }
    return maps.get(uri);
  }

  const isTrack = (uri) => !!uri?.startsWith("spotify:track:");
  let song = { uri: null, hits: [] }, index = -1;

  async function loadSong() {
    const uri = player()?.data?.item?.uri;
    if (!SETTINGS.bass || !uri || uri === song.uri) return;
    song = { uri, hits: [] };
    index = -1;
    if (!isTrack(uri)) return;
    const found = await mapSong(uri);
    if (song.uri !== uri) return; // skipped meanwhile
    song = { uri, ...found };
    // Map the next song early, so it is ready from its first bass hit.
    const next = window.Spicetify.Queue?.nextTracks?.[0]?.contextTrack?.uri;
    if (isTrack(next)) mapSong(next);
  }

  /* ---------- Hitting ---------- */

  let lastHit = null, lastAt = 0;
  function frame() {
    requestAnimationFrame(frame);
    const hits = song.hits;
    if (!hits.length || document.hidden || !isPlaying()) return;
    // Half a frame ahead: what is drawn now reaches the screen on the next frame.
    const t = player().getProgress() - SETTINGS.offsetMs + 10;
    let lo = 0, hi = hits.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (hits[mid].t <= t) lo = mid + 1; else hi = mid;
    }
    if (lo - 1 === index) return;
    index = lo - 1;
    // Ignore old hits, for example right after seeking.
    if (index < 0 || t - hits[index].t > 120) return;
    // Spotify re-syncs its clock now and then, which can replay the same hit.
    const now = performance.now();
    if (hits[index] === lastHit && now - lastAt < 400) return;
    lastHit = hits[index];
    lastAt = now;
    slam(lastHit);
  }

  let running = [];
  function play(el, frames, options) {
    if (el) running.push(el.animate(frames, options));
  }

  function slam({ power, length }) {
    for (const a of running) a.cancel();
    running = [];
    // Full size at once, held for an instant, then down with the bass itself.
    const fall = (from, to) => [
      { ...from, easing: "linear" },
      { ...from, offset: 0.1, easing: "cubic-bezier(.2,.6,.3,1)" },
      to,
    ];
    const rest = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--il-star-opacity")) || 0.5;
    play(star(), fall(
      { scale: 1 + SETTINGS.punch * power, opacity: Math.min(1, rest + 0.45 * power) },
      { scale: 1, opacity: rest }
    ), { duration: length, pseudoElement: "::before" });
    const thump = fall({ scale: `1 ${1 + 1.4 * power}` }, { scale: "1 1" });
    play(document.querySelector(".Root__globalNav"), thump, { duration: length, pseudoElement: "::after" });
    play(document.querySelector(".Root__now-playing-bar"), thump, { duration: length, pseudoElement: "::before" });
    play(document.querySelector('[data-testid="control-button-playpause"]'),
      fall({ scale: 1 + 0.14 * power }, { scale: 1 }), { duration: length });
  }

  function syncSpeed() {
    const rate = isPlaying() ? 1 : SETTINGS.pausedSpeed;
    for (const a of document.getAnimations()) {
      if (a.animationName === "il-spin") a.updatePlaybackRate(rate);
    }
  }

  /* ---------- Intro ---------- */

  function intro() {
    if (!SETTINGS.intro) return;
    const el = document.createElement("div");
    el.id = "il-intro";
    el.innerHTML =
      '<svg viewBox="-100 -100 200 200" fill="none">' +
      '<path pathLength="1" d="M0-80 69.3 40H-69.3Z"/><path pathLength="1" d="M0 80 69.3-40H-69.3Z"/></svg>';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ---------- Start ---------- */

  function start() {
    intro();
    player().addEventListener("songchange", () => { loadSong(); syncSpeed(); });
    player().addEventListener("onplaypause", () => setTimeout(syncSpeed, 60));
    syncSpeed();
    loadSong();
    requestAnimationFrame(frame);
  }

  window.israelGold = { SETTINGS, bassMap, status: () => ({ ...song, hits: song.hits.length }) };

  (function wait() {
    if (player()?.addEventListener && star()) start();
    else setTimeout(wait, 200);
  })();
})();
