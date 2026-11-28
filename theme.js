/* Israel · Gold Edition
 *
 * Everything here is local to the theme folder: no CDN, no network calls except
 * Spotify's own waveform metadata for the bass-reactive star.
 *
 * What it adds:
 *   - a custom control dock (star, palette, bass, spin, help)
 *   - keyboard shortcuts: Alt+I star, Alt+P palette, Alt+B bass, Alt+S spin, Alt+H help
 *   - settings that survive a Spotify restart
 *   - the startup star intro and the bass "slam" on the whole interface
 *
 * Nothing in here touches playback, playlists, likes or account data. It only
 * reads the current song and writes visual state into the DOM.
 */
(function israelTheme() {
  "use strict";

  // A previous copy (e.g. from a hot apply) gets a clean teardown first.
  if (window.israelGold && typeof window.israelGold.destroy === "function") {
    window.israelGold.destroy();
  }

  var STORE = "israel-theme:settings:v1";
  var DEFAULTS = {
    intro: true,       // star draws itself when Spotify starts
    star: true,        // star visible in the main view
    spin: true,        // star rotates slowly
    bass: true,        // slam on bass hits
    strict: 0.5,       // 0.35 = more hits, 0.65 = only the heaviest bass
    punch: 0.22,       // how far the star jumps on a full hit
    offsetMs: 0,       // raise if hits look early (Bluetooth), lower if late
    pausedSpeed: 0.2,  // spin speed while paused (1 = full)
    scheme: "gold"     // gold | blue | ivory
  };

  var SCHEMES = [
    { id: "gold",  label: "Gold",  accent: "#e8b923", bright: "#ffd54a", ink: "#171003" },
    { id: "blue",  label: "Blue",  accent: "#3c7df0", bright: "#a9ceff", ink: "#020a1c" },
    { id: "ivory", label: "Ivory", accent: "#e6dcc4", bright: "#fff6df", ink: "#1c1811" }
  ];

  var ICON = {
    star: '<svg viewBox="-100 -100 200 200" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="12"><path d="M0-80 69.3 40H-69.3Z"/><path d="M0 80 69.3-40H-69.3Z"/></g></svg>',
    palette: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/></svg>',
    bass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h2l2-7 3 14 3-11 2 7 2-4 2 1h4"/></svg>',
    spin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5V9H15"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.7" r="1.1" fill="currentColor" stroke="none"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  var sp = function () { return typeof window.Spicetify !== "undefined" ? window.Spicetify : null; };
  var player = function () { return sp()?.Player || null; };
  var isPlaying = function () {
    try { return !!player()?.isPlaying?.(); } catch { return false; }
  };
  var root = function () { return document.querySelector(".Root__main-view"); };

  /* ---------- Settings ---------- */

  function load() {
    try {
      var raw = sp()?.LocalStorage?.get(STORE) || window.localStorage.getItem(STORE);
      return Object.assign({}, DEFAULTS, raw ? JSON.parse(raw) : {});
    } catch {
      return Object.assign({}, DEFAULTS);
    }
  }

  var settings = load();

  function save() {
    var raw = JSON.stringify(settings);
    try { sp()?.LocalStorage?.set(STORE, raw); } catch { /* storage disabled */ }
    try { window.localStorage.setItem(STORE, raw); } catch { /* private mode */ }
  }

  function node(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function toast(text) {
    var t = node("div", "il-toast", text);
    t.setAttribute("role", "status");
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-in"); });
    setTimeout(function () {
      t.classList.remove("is-in");
      setTimeout(function () { t.remove(); }, 320);
    }, 1900);
  }

  /* ---------- Custom control dock ---------- */

  var buttons = {};
  var dock = node("aside", "il-dock");
  dock.id = "il-dock";
  dock.setAttribute("aria-label", "Israel theme controls");

  var actions = [
    { key: "star",   tip: "Star of David · Alt+I",  icon: ICON.star,    pressed: function () { return settings.star; } },
    { key: "scheme", tip: "Palette · Alt+P",        icon: ICON.palette },
    { key: "bass",   tip: "Bass hits · Alt+B",      icon: ICON.bass,   pressed: function () { return settings.bass; } },
    { key: "spin",   tip: "Star spin · Alt+S",      icon: ICON.spin,   pressed: function () { return settings.spin; } },
    { key: "info",   tip: "Shortcuts · Alt+H",      icon: ICON.info }
  ];

  actions.forEach(function (a) {
    var b = node("button", "il-dock-button", a.icon + '<span class="il-dock-tip">' + a.tip + "</span>");
    b.type = "button";
    b.dataset.ilAction = a.key;
    b.setAttribute("aria-label", a.tip.split(" · ")[0]);
    if (a.pressed) b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () { activate(a.key); });
    buttons[a.key] = b;
    dock.appendChild(b);
  });

  function refreshDock() {
    Object.keys(buttons).forEach(function (key) {
      var a = actions.find(function (x) { return x.key === key; });
      if (a && a.pressed) buttons[key].setAttribute("aria-pressed", settings[key] ? "true" : "false");
      if (key === "scheme") {
        var s = SCHEMES.find(function (x) { return x.id === settings.scheme; }) || SCHEMES[0];
        buttons[key].dataset.scheme = s.id;
        buttons[key].setAttribute("aria-label", "Palette: " + s.label);
      }
    });
  }

  function activate(key) {
    switch (key) {
      case "star":
        settings.star = !settings.star;
        toast(settings.star ? "Star of David on" : "Star of David off");
        break;
      case "bass":
        settings.bass = !settings.bass;
        if (!settings.bass) { song = { uri: song.uri, hits: [] }; index = -1; }
        else loadSong(true);
        toast(settings.bass ? "Bass hits on" : "Bass hits off");
        break;
      case "spin":
        settings.spin = !settings.spin;
        toast(settings.spin ? "Star spinning" : "Star held still");
        break;
      case "scheme": {
        var i = SCHEMES.findIndex(function (s) { return s.id === settings.scheme; });
        settings.scheme = SCHEMES[(i + 1) % SCHEMES.length].id;
        var s = SCHEMES.find(function (x) { return x.id === settings.scheme; });
        toast(s.label + " palette");
        break;
      }
      case "info":
        toggleHelp();
        return;
      default:
        return;
    }
    save();
    applySettings();
  }

  function onKey(e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var map = { i: "star", p: "scheme", b: "bass", s: "spin", h: "info" };
    var key = map[e.key.toLowerCase()];
    if (!key) return;
    e.preventDefault();
    activate(key);
  }

  /* ---------- Help panel ---------- */

  var help = node("div", "il-overlay");
  help.id = "il-help";
  help.hidden = true;
  help.innerHTML =
    '<section class="il-card" role="dialog" aria-modal="true" aria-label="Israel theme help">' +
      '<header class="il-card-head"><span class="il-card-star">' + ICON.star + "</span>" +
        "<div><h2>Israel · Gold Edition</h2><p>Every control is theme-only. Playback stays yours.</p></div>" +
        '<button class="il-card-close" type="button" data-il-close aria-label="Close">' + ICON.close + "</button>" +
      "</header>" +
      '<div class="il-card-grid">' +
        '<div><kbd>Alt</kbd> + <kbd>I</kbd><span>Star of David</span></div>' +
        '<div><kbd>Alt</kbd> + <kbd>P</kbd><span>Palette</span></div>' +
        '<div><kbd>Alt</kbd> + <kbd>B</kbd><span>Bass hits</span></div>' +
        '<div><kbd>Alt</kbd> + <kbd>S</kbd><span>Star spin</span></div>' +
        '<div><kbd>Alt</kbd> + <kbd>H</kbd><span>This panel</span></div>' +
        '<div><kbd>Esc</kbd><span>Close panel</span></div>' +
      "</div>" +
      '<p class="il-card-note">Palettes: Gold · Blue · Ivory. The controls in the corner save themselves automatically.</p>' +
      '<footer class="il-card-foot"><button type="button" data-il-reset>Reset theme settings</button>' +
        '<button type="button" class="il-primary" data-il-close>Done</button></footer>' +
    "</section>";

  function toggleHelp(force) {
    help.hidden = typeof force === "boolean" ? !force : !help.hidden;
    document.body.classList.toggle("il-help-open", !help.hidden);
  }

  help.addEventListener("click", function (e) {
    if (e.target === help || e.target.closest("[data-il-close]")) toggleHelp(false);
    if (e.target.closest("[data-il-reset]")) {
      settings = Object.assign({}, DEFAULTS);
      save();
      applySettings();
      toast("Theme settings reset");
    }
  });

  function onKeyDown(e) {
    if (e.key === "Escape" && !help.hidden) { toggleHelp(false); e.preventDefault(); }
  }

  /* ---------- Apply visual state ---------- */

  function syncSpeed() {
    var rate = isPlaying() ? 1 : settings.pausedSpeed;
    try {
      document.getAnimations().forEach(function (a) {
        if (a.animationName === "il-spin") a.updatePlaybackRate(rate);
      });
    } catch { /* older Chromium */ }
  }

  function applySettings() {
    var r = document.documentElement;
    r.dataset.ilScheme = settings.scheme;
    r.dataset.ilStar = settings.star ? "on" : "off";
    r.dataset.ilSpin = settings.spin ? "on" : "off";
    refreshDock();
    syncSpeed();
    if (!settings.bass) { song = { uri: song.uri, hits: [] }; index = -1; }
  }

  /* ---------- Startup intro ---------- */

  function intro() {
    if (!settings.intro || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.getElementById("il-intro")) return;
    var overlay = node("div");
    overlay.id = "il-intro";
    overlay.innerHTML =
      '<svg viewBox="-100 -100 200 200" fill="none">' +
        '<path pathLength="1" d="M0-80 69.3 40H-69.3Z"/><path pathLength="1" d="M0 80 69.3-40H-69.3Z"/>' +
      "</svg>";
    document.body.appendChild(overlay);
    setTimeout(function () { overlay.remove(); }, 2600);
  }

  /* ---------- Bass hits (reads waveform metadata only) ---------- */

  var WAVEFORM = 237; // Spotify metadata extension id for the 3-band waveform

  function bassMap(wave) {
    var w = wave.sampleWindowSizeMs, n = wave.lows.length;
    var span = Math.max(1, Math.round(60 / w));    // how far back an attack can start
    var near = Math.max(1, Math.round(70 / w));    // one hit per this neighbourhood
    var hold = Math.max(0, Math.round(20 / w) - 1); // hides the ripple of a bass note

    var scaled = function (band) {
      var top = Array.from(band).sort(function (a, b) { return a - b; })[Math.floor(n * 0.995)] || 1;
      return Array.from(band, function (v, i) {
        for (var j = Math.max(0, i - hold); j < i; j++) v = Math.max(v, band[j]);
        return Math.min(1, Math.max(0, v / top));
      });
    };
    var rises = function (band) {
      return band.map(function (v, i) {
        var floor = v;
        for (var j = Math.max(0, i - span); j < i; j++) floor = Math.min(floor, band[j]);
        return v - floor;
      });
    };
    var peak = function (band, i) {
      var m = 0;
      for (var j = Math.max(0, i - near); j <= Math.min(n - 1, i + near); j++) m = Math.max(m, band[j]);
      return m;
    };

    var low = scaled(wave.lows), rise = rises(low);
    var same = function (band) { return band?.length === n; };
    var others = [wave.mids, wave.highs].filter(same).map(function (b) { return rises(scaled(b)); });

    // 1. Every sharp rise in the lows.
    var found = [];
    for (var i = 1; i < n; i++) {
      if (rise[i] < 0.06 || rise[i] < peak(rise, i) || rise[i - 1] === rise[i]) continue;
      var other = Math.max.apply(null, [0].concat(others.map(function (b) { return peak(b, i); })));
      var pure = rise[i] / (rise[i] + other); // 1 = only bass moved
      found.push({ i: i, rise: rise[i], level: peak(low, i), other: other, weight: Math.pow(rise[i] * pure, 3) });
    }
    if (found.length < 8) return [];

    // 2. Learn what this song's kick/808 looks like; heavy bass-only rises
    //    outvote all the small rises made by snares, voices and noise.
    var typical = function (key) {
      var list = found.slice().sort(function (a, b) { return a[key] - b[key]; });
      var total = list.reduce(function (sum, f) { return sum + f.weight; }, 0);
      var sum = 0;
      for (var k = 0; k < list.length; k++) if ((sum += list[k].weight) >= total / 2) return list[k][key];
    };
    var bass = { rise: typical("rise"), level: typical("level") };

    // 3. Keep the rises that match.
    var hits = [];
    found.forEach(function (f) {
      if (f.rise < bass.rise * settings.strict || f.level < bass.level * 0.5) return;
      if (f.level < bass.level * 0.85 && f.rise < f.other) return;
      var start = f.i;
      var edge = low[f.i] - f.rise * 0.6;
      while (start > 0 && start > f.i - span && low[start - 1] > edge) start--;
      var t = (start + 0.5) * w;
      var weight = 0.6 * (f.rise / bass.rise) + 0.4 * (f.level / bass.level);
      var power = Math.min(1, Math.max(0.25, 0.25 + 0.75 * (weight - 0.5) / 0.55));
      var end = f.i;
      while (end < n - 1 && (end - f.i) * w < 700 && low[end + 1] > f.level * 0.45) end++;
      var hit = { t: t, power: power, length: Math.min(700, Math.max(180, (end - start + 1) * w * 1.4)) };
      var last = hits[hits.length - 1];
      if (!last || t - last.t >= 90) hits.push(hit);
      else if (power > last.power) hits[hits.length - 1] = hit;
    });
    // Settle before the next hit so every one reads as a separate beat.
    hits.forEach(function (h, k) {
      if (hits[k + 1]) h.length = Math.max(100, Math.min(h.length, hits[k + 1].t - h.t - 10));
    });
    return hits;
  }

  function metadata() {
    try { return sp()?.Platform?.Registry?.resolve(Symbol.for("MetadataExtensions")); }
    catch { return null; }
  }

  function timeout(promise, ms) {
    return Promise.race([promise, new Promise(function (_, no) {
      setTimeout(function () { no(new Error("timed out")); }, ms);
    })]);
  }

  async function readWave(uri) {
    var ext = metadata();
    if (!ext) return null;
    for (var attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise(function (ok) { setTimeout(ok, 2500); });
      try {
        var wave = (await timeout(ext.fetch([uri, WAVEFORM]), 8000))?.[uri]?.[WAVEFORM];
        if (wave?.lows?.length && wave.sampleWindowSizeMs > 0) return wave;
      } catch { /* try again */ }
    }
    return null;
  }

  var maps = new Map();
  function mapSong(uri) {
    if (!maps.has(uri)) {
      if (maps.size > 30) maps.delete(maps.keys().next().value);
      var job = readWave(uri).then(function (wave) {
        if (!wave || wave.sampleWindowSizeMs > 130) { maps.delete(uri); return { hits: [] }; }
        return { hits: bassMap(wave) };
      });
      maps.set(uri, job);
    }
    return maps.get(uri);
  }

  var isTrack = function (uri) => !!uri?.startsWith("spotify:track:");
  var song = { uri: null, hits: [] }, index = -1;

  async function loadSong(force) {
    var uri = player()?.data?.item?.uri;
    if (!uri || (!force && uri === song.uri)) return;
    song = { uri: uri, hits: [] };
    index = -1;
    if (!settings.bass || !isTrack(uri)) return;
    var found = await mapSong(uri);
    if (song.uri !== uri) return; // skipped meanwhile
    song = { uri: uri, hits: found.hits };
    var next = sp()?.Queue?.nextTracks?.[0]?.contextTrack?.uri;
    if (isTrack(next)) mapSong(next); // ready for the first hit of the next song
  }

  var lastHit = null, lastAt = 0, raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    var hits = song.hits;
    if (!settings.bass || !hits.length || document.hidden || !isPlaying()) return;
    // Half a frame ahead: what is drawn now reaches the screen on the next frame.
    var t = player().getProgress() - settings.offsetMs + 10;
    var lo = 0, hi = hits.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (hits[mid].t <= t) lo = mid + 1; else hi = mid;
    }
    if (lo - 1 === index) return;
    index = lo - 1;
    if (index < 0 || t - hits[index].t > 120) return; // old hit after a seek
    var now = performance.now();
    if (hits[index] === lastHit && now - lastAt < 400) return; // clock re-sync
    lastHit = hits[index];
    lastAt = now;
    slam(lastHit);
  }

  var running = [];
  function playAnimation(el, frames, options) {
    if (el) {
      try { running.push(el.animate(frames, options)); } catch { /* no WAAPI */ }
    }
  }

  function slam(hit) {
    running.forEach(function (a) { a.cancel(); });
    running = [];
    var punch = settings.punch * hit.power;
    var fall = function (from, to) {
      return [
        Object.assign({}, from, { easing: "linear" }),
        Object.assign({}, from, { offset: 0.1, easing: "cubic-bezier(.2,.6,.3,1)" }),
        to
      ];
    };
    var rest = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--il-star-opacity")) || 0.5;

    playAnimation(root(), fall(
      { scale: 1 + punch, opacity: Math.min(1, rest + 0.45 * hit.power) },
      { scale: 1, opacity: rest }
    ), { duration: hit.length, pseudoElement: "::before" });

    var thump = fall({ scale: "1 " + (1 + 1.4 * hit.power) }, { scale: "1 1" });
    playAnimation(document.querySelector(".Root__globalNav"), thump, { duration: hit.length, pseudoElement: "::after" });
    playAnimation(document.querySelector(".Root__nav-bar"), thump, { duration: hit.length, pseudoElement: "::before" });
    playAnimation(document.querySelector(".Root__now-playing-bar"), thump, { duration: hit.length, pseudoElement: "::before" });
    playAnimation(document.querySelector(".Root__now-playing-bar"), fall(
      { opacity: 0.35 + 0.5 * hit.power }, { opacity: 0.12 }
    ), { duration: hit.length, pseudoElement: "::after" });
    playAnimation(dock, fall(
      { scale: 1 + 0.08 * hit.power }, { scale: 1 }
    ), { duration: hit.length });
    playAnimation(document.querySelector('[data-testid="control-button-playpause"]'),
      fall({ scale: 1 + 0.14 * hit.power }, { scale: 1 }), { duration: hit.length });
  }

  /* ---------- Start / stop ---------- */

  var listening = false, ready = false;
  function start() {
    if (ready) return;
    ready = true;
    intro();
    var p = player();
    p.addEventListener("songchange", function () { loadSong(); syncSpeed(); });
    p.addEventListener("onplaypause", function () { setTimeout(syncSpeed, 60); });
    loadSong();
    syncSpeed();
    raf = requestAnimationFrame(frame);
  }

  function waitForPlayer() {
    if (!ready && player()?.addEventListener && root()) start();
    else if (!ready) setTimeout(waitForPlayer, 200);
  }

  // Native-feeling extras, added only when Spicetify exposes the APIs.
  var menuItem = null;
  try {
    var MenuItem = sp()?.ContextMenu?.Item;
    if (MenuItem) {
      menuItem = new MenuItem(
        "Toggle Israel star",
        function () { activate("star"); },
        function () { return true; },
        ICON.star
      );
      menuItem.register();
    }
  } catch { /* context menu API changed */ }

  document.body.appendChild(dock);
  document.body.appendChild(help);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keydown", onKeyDown);
  applySettings();
  waitForPlayer();

  window.israelGold = {
    settings: settings,
    SCHEMES: SCHEMES,
    bassMap: bassMap,
    toggle: activate,
    status: function () { return Object.assign({}, settings, { hits: song.hits.length }); },
    destroy: function () {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onKeyDown);
      running.forEach(function (a) { a.cancel(); });
      running = [];
      cancelAnimationFrame(raf);
      [dock, help, document.getElementById("il-intro")].forEach(function (n) { if (n) n.remove(); });
      document.body.classList.remove("il-help-open");
      try { menuItem?.deregister?.(); } catch { /* no longer available */ }
      ready = false;
    }
  };
})();
