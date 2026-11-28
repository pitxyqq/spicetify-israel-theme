/* Israel · Gold Edition — custom interface layer
 *
 * This is not just a colour patch. It builds real UI inside Spotify:
 *   - the Israel Hub: a custom dashboard with working transport, waveform
 *     visualizer, live theme sliders, palette swatches and quick navigation
 *   - a custom topbar button, a pinned sidebar entry and a brand chip
 *   - a custom control dock, keyboard shortcuts, toasts and context menus
 *   - the startup intro and bass-reactive animation across the whole client
 *
 * All of it is local to the theme folder. Waveform data is read from Spotify's
 * own metadata extension; nothing changes playlists, likes or account data
 * except where a control is explicitly a transport button (play, skip, seek,
 * shuffle, repeat, volume, like).
 */
(function israelTheme() {
  "use strict";

  // A previous copy (hot apply, CDN duplicate) gets a clean teardown first.
  if (window.israelGold && typeof window.israelGold.destroy === "function") {
    window.israelGold.destroy();
  }

  var STORE = "israel-theme:settings:v2";
  var DEFAULTS = {
    intro: true,        // star draws itself when Spotify starts
    star: true,         // star visible in the main view
    spin: true,         // star rotates slowly
    bass: true,         // slam on bass hits
    viz: true,          // waveform bars inside the hub
    pausedSpeed: 0.2,   // spin speed while paused (1 = full)
    scheme: "gold",     // gold | blue | ivory
    starOpacity: 0.5,   // 0..1
    starSize: 78,       // vmin
    spinTime: 30,       // seconds per turn
    strict: 0.5,        // 0.35 = more bass hits, 0.65 = only the heaviest
    punch: 0.22,        // how far the star jumps on a full hit
    offsetMs: 0         // raise if hits look early (Bluetooth), lower if late
  };

  var SCHEMES = [
    { id: "gold",  label: "Gold",  accent: "#e8b923", bright: "#ffd54a", ink: "#171003" },
    { id: "blue",  label: "Blue",  accent: "#3c7df0", bright: "#a9ceff", ink: "#020a1c" },
    { id: "ivory", label: "Ivory", accent: "#e6dcc4", bright: "#fff6df", ink: "#1c1811" }
  ];

  var ICON = {
    star: '<svg viewBox="-100 -100 200 200" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="12"><path d="M0-80 69.3 40H-69.3Z"/><path d="M0 80 69.3-40H-69.3Z"/></g></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    palette: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/></svg>',
    bass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h2l2-7 3 14 3-11 2 7 2-4 2 1h4"/></svg>',
    spin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5V9H15"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.7" r="1.1" fill="currentColor" stroke="none"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M19 5 9 12l10 7Z" fill="currentColor" stroke="none"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M5 5l10 7L5 19Z" fill="currentColor" stroke="none"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 19.5 12 7 19.5Z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h4v15H7zM13 4.5h4v15h-4z" fill="currentColor" stroke="none"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h3c5 0 6 12 12 12h3M18 4l3 3-3 3M3 18h3c2 0 3-2 4-4M14 9c1-2 2-3 4-3h3M18 16l3 2-3 2"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V7a3 3 0 0 1 3-3h12l-3-3M20 15v2a3 3 0 0 1-3 3H5l3 3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-8-4.8-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.2-8 10-8 10Z"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5"/></svg>'
  };

  var sp = function () { return typeof window.Spicetify !== "undefined" ? window.Spicetify : null; };
  var player = function () { return sp()?.Player || null; };
  var isPlaying = function () {
    try { return !!player()?.isPlaying?.(); } catch { return false; }
  };
  var mainView = function () { return document.querySelector(".Root__main-view"); };

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

  function currentScheme() {
    return SCHEMES.find(function (s) { return s.id === settings.scheme; }) || SCHEMES[0];
  }

  /* ---------- Custom control dock ---------- */

  var buttons = {};
  var dock = node("aside", "il-dock");
  dock.id = "il-dock";
  dock.setAttribute("aria-label", "Israel theme controls");

  var actions = [
    { key: "hub",    tip: "Israel Hub · Alt+U",   icon: ICON.grid },
    { key: "star",   tip: "Star of David · Alt+I", icon: ICON.star,   pressed: function () { return settings.star; } },
    { key: "scheme", tip: "Palette · Alt+P",      icon: ICON.palette },
    { key: "bass",   tip: "Bass hits · Alt+B",    icon: ICON.bass,   pressed: function () { return settings.bass; } },
    { key: "spin",   tip: "Star spin · Alt+S",    icon: ICON.spin,   pressed: function () { return settings.spin; } },
    { key: "info",   tip: "Shortcuts · Alt+H",    icon: ICON.info }
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
    actions.forEach(function (a) {
      var b = buttons[a.key];
      if (a.pressed) b.setAttribute("aria-pressed", settings[a.key] ? "true" : "false");
      if (a.key === "scheme") {
        b.dataset.scheme = settings.scheme;
        b.setAttribute("aria-label", "Palette: " + currentScheme().label);
      }
    });
  }

  /* ---------- Brand chip and sidebar entry ---------- */

  var brand = node("button", "il-brand", ICON.star + "<span>ISRAEL</span>");
  brand.id = "il-brand";
  brand.type = "button";
  brand.title = "Open Israel Hub (Alt+U)";
  brand.addEventListener("click", function () { toggleHub(); });

  var nav = node("button", "il-nav", ICON.star + "<span>Israel Hub</span><kbd>Alt+U</kbd>");
  nav.id = "il-nav";
  nav.type = "button";
  nav.addEventListener("click", function () { toggleHub(); });

  function addNav() {
    var bar = document.querySelector(".Root__nav-bar");
    if (bar && !document.body.contains(nav)) bar.appendChild(nav);
  }

  /* ---------- Israel Hub ---------- */

  var hub = node("div", "il-overlay il-hub");
  hub.id = "il-hub";
  hub.hidden = true;

  var swatchHTML = SCHEMES.map(function (s) {
    return '<button class="il-swatch" data-palette="' + s.id + '" title="' + s.label +
      '" style="--swatch:' + s.accent + '" aria-label="' + s.label + ' palette"><span></span><em>' + s.label + "</em></button>";
  }).join("");

  var toggleHTML = [
    { key: "star", label: "Star of David" },
    { key: "bass", label: "Bass hits" },
    { key: "spin", label: "Star spin" },
    { key: "viz",  label: "Visualizer" }
  ].map(function (t) {
    return '<button class="il-toggle" data-toggle="' + t.key + '" aria-pressed="false">' +
      "<span>" + t.label + "</span><i></i></button>";
  }).join("");

  var RANGES = [
    { key: "starOpacity", label: "Star opacity", min: 0, max: 1, step: 0.05, fmt: function (v) { return Math.round(v * 100) + "%"; } },
    { key: "starSize",    label: "Star size",    min: 30, max: 120, step: 1, fmt: function (v) { return v + "vmin"; } },
    { key: "spinTime",    label: "Spin time",    min: 8, max: 90, step: 1, fmt: function (v) { return v + "s"; } },
    { key: "strict",      label: "Bass filter",  min: 0.3, max: 0.7, step: 0.05, fmt: function (v) { return v.toFixed(2); } },
    { key: "punch",       label: "Hit strength", min: 0, max: 0.5, step: 0.02, fmt: function (v) { return Math.round(v * 100) + "%"; } },
    { key: "offsetMs",    label: "Hit offset",   min: -300, max: 300, step: 20, fmt: function (v) { return v + "ms"; } }
  ];

  var sliderHTML = RANGES.map(function (r) {
    return '<label class="il-slider"><span>' + r.label + ' <em data-val="' + r.key + '"></em></span>' +
      '<input type="range" data-setting="' + r.key + '" min="' + r.min + '" max="' + r.max + '" step="' + r.step + '" aria-label="' + r.label + '" /></label>';
  }).join("");

  var linksHTML = [
    { path: "/", label: "Home" },
    { path: "/search", label: "Search" },
    { path: "/collection/tracks", label: "Liked Songs" }
  ].map(function (l) {
    return '<button class="il-link" data-nav="' + l.path + '">' + l.label + "</button>";
  }).join("") + '<button class="il-link" data-hub="copy">' + ICON.link + " Copy track link</button>";

  hub.innerHTML =
    '<section class="il-hub-panel" role="dialog" aria-modal="true" aria-label="Israel Hub">' +
      '<header class="il-hub-head">' +
        '<span class="il-hub-mark">' + ICON.star + "</span>" +
        "<div><h2>Israel Hub</h2><p>Gold Edition · your Spotify, your skin</p></div>" +
        '<button class="il-hub-close" data-hub="close" aria-label="Close hub">' + ICON.close + "</button>" +
      "</header>" +
      '<div class="il-hub-body">' +
        '<div class="il-hub-stage">' +
          '<div class="il-hub-star"></div>' +
          '<canvas id="il-viz"></canvas>' +
          '<img id="il-cover" alt="Current artwork" />' +
          '<div class="il-hub-meta"><h3 id="il-title">Nothing playing</h3><p id="il-artist">Pick a track in Spotify</p></div>' +
          '<div class="il-hub-transport">' +
            '<button data-hub="shuffle" aria-label="Shuffle">' + ICON.shuffle + "</button>" +
            '<button data-hub="prev" aria-label="Previous track">' + ICON.prev + "</button>" +
            '<button data-hub="play" class="il-hub-play" aria-label="Play or pause">' + ICON.play + "</button>" +
            '<button data-hub="next" aria-label="Next track">' + ICON.next + "</button>" +
            '<button data-hub="repeat" aria-label="Repeat">' + ICON.repeat + "</button>" +
            '<button data-hub="heart" aria-label="Like this track">' + ICON.heart + "</button>" +
          "</div>" +
          '<div class="il-hub-times"><span id="il-elapsed">0:00</span><span id="il-total">0:00</span></div>' +
          '<input id="il-seek" class="il-range" type="range" min="0" max="1000" value="0" aria-label="Seek within track" />' +
          '<div class="il-hub-volume">' + ICON.volume +
            '<input id="il-volume" class="il-range" type="range" min="0" max="100" value="70" aria-label="Volume" />' +
            '<span id="il-volval">70%</span>' +
          "</div>" +
        "</div>" +
        '<div class="il-hub-side">' +
          "<h4>Palette</h4>" +
          '<div class="il-swatches">' + swatchHTML + "</div>" +
          "<h4>Scene</h4>" +
          '<div class="il-hub-toggles">' + toggleHTML + "</div>" +
          "<h4>Tune the star</h4>" +
          '<div class="il-sliders">' + sliderHTML + "</div>" +
          "<h4>Jump to</h4>" +
          '<div class="il-hub-links">' + linksHTML + "</div>" +
          '<p class="il-hub-note">Transport buttons use Spotify normally. Everything else is theme-only.</p>' +
        "</div>" +
      "</div>" +
      "<footer class=\"il-hub-foot\">Alt+U hub · Alt+I star · Alt+P palette · Alt+B bass · Alt+S spin · Alt+H help · Ctrl+Alt+←/→ seek · Ctrl+Alt+↑/↓ volume</footer>" +
    "</section>";

  var hubVisible = function () { return !hub.hidden; };

  function toggleHub(force) {
    var open = typeof force === "boolean" ? force : hub.hidden;
    hub.hidden = !open;
    document.body.classList.toggle("il-hub-open", open);
    if (open) { updateHub(); startHubLoop(); }
    else stopHubLoop();
  }

  function updateHub() {
    var p = player(), item = p?.data?.item;
    var title = document.getElementById("il-title");
    var artist = document.getElementById("il-artist");
    var cover = document.getElementById("il-cover");
    var play = hub.querySelector('[data-hub="play"]');
    if (!title || !artist || !cover || !play) return;

    if (item) {
      title.textContent = item.name || "Untitled";
      artist.textContent = (item.artists || []).map(function (a) { return a.name; }).join(", ") || "Unknown artist";
      var img = (item.album?.images || item.images || [])[0]?.url;
      if (img) { cover.src = img; cover.style.opacity = "1"; }
      else { cover.removeAttribute("src"); cover.style.opacity = "0"; }
    } else {
      title.textContent = "Nothing playing";
      artist.textContent = "Pick a track in Spotify";
      cover.removeAttribute("src");
      cover.style.opacity = "0";
    }

    play.innerHTML = isPlaying() ? ICON.pause : ICON.play;
    play.dataset.icon = isPlaying() ? ICON.pause : ICON.play;
    play.setAttribute("aria-label", isPlaying() ? "Pause" : "Play");
    hub.querySelector('[data-hub="shuffle"]')?.setAttribute("aria-pressed", p?.getShuffle?.() ? "true" : "false");
    hub.querySelector('[data-hub="repeat"]')?.setAttribute("aria-pressed", p?.getRepeat?.() ? "true" : "false");
    hub.querySelector('[data-hub="heart"]')?.setAttribute("aria-pressed", p?.getHeart?.() ? "true" : "false");
    var vol = Math.round((p?.getVolume?.() ?? 0.7) * 100);
    var volEl = document.getElementById("il-volume");
    if (volEl) volEl.value = vol;
    var volVal = document.getElementById("il-volval");
    if (volVal) volVal.textContent = vol + "%";
  }

  hub.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t === hub) { toggleHub(false); return; }

    var pal = t.dataset.palette;
    if (pal) {
      settings.scheme = pal;
      save(); applySettings();
      toast(currentScheme().label + " palette");
      return;
    }
    var tg = t.dataset.toggle;
    if (tg) { activate(tg); return; }

    var nav2 = t.dataset.nav;
    if (nav2) {
      try { sp()?.Platform?.History?.push(nav2); toggleHub(false); }
      catch { toast("Navigation unavailable"); }
      return;
    }

    switch (t.dataset.hub) {
      case "close": toggleHub(false); break;
      case "copy": {
        var uri = player()?.data?.item?.uri || "";
        var id = uri.split(":").pop();
        var url = id ? "https://open.spotify.com/track/" + id : "";
        if (url && sp()?.Platform?.ClipboardAPI?.copy) {
          try {
            sp().Platform.ClipboardAPI.copy(url).then(
              function () { toast("Track link copied"); },
              function () { toast("Could not copy link"); }
            );
          } catch { toast("Could not copy link"); }
        } else toast("No track to copy");
        break;
      }
      case "play": player()?.togglePlay?.(); setTimeout(updateHub, 60); break;
      case "prev": player()?.back?.(); break;
      case "next": player()?.next?.(); break;
      case "shuffle": player()?.toggleShuffle?.(); setTimeout(updateHub, 60); break;
      case "repeat": player()?.toggleRepeat?.(); setTimeout(updateHub, 60); break;
      case "heart": player()?.toggleHeart?.(); setTimeout(updateHub, 60); break;
    }
  });

  hub.addEventListener("input", function (e) {
    var input = e.target;
    if (input.id === "il-seek") {
      var dur = player()?.getDuration?.() || 0;
      if (dur) player()?.seek?.(Number(input.value) / 1000);
    } else if (input.id === "il-volume") {
      var v = Number(input.value) / 100;
      player()?.setVolume?.(v);
      var label = document.getElementById("il-volval");
      if (label) label.textContent = input.value + "%";
    } else if (input.dataset.setting) {
      settings[input.dataset.setting] = Number(input.value);
      save(); applySettings();
    }
  });

  hub.addEventListener("click", function (e) {
    if (e.target === hub) toggleHub(false);
  });

  function syncControlUI() {
    hub.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", settings[b.dataset.toggle] ? "true" : "false");
    });
    hub.querySelectorAll("[data-palette]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.palette === settings.scheme);
    });
    RANGES.forEach(function (r) {
      var input = hub.querySelector('[data-setting="' + r.key + '"]');
      var label = hub.querySelector('[data-val="' + r.key + '"]');
      if (input) input.value = settings[r.key];
      if (label) label.textContent = r.fmt(settings[r.key]);
    });
  }

  /* ---------- Waveform visualizer ---------- */

  var WAVEFORM = 237; // Spotify metadata extension id for the 3-band waveform
  var waves = new Map();     // uri -> Promise<wave|null>
  var waveCache = new Map(); // uri -> resolved wave
  var maps = new Map();      // uri -> Promise<{hits}>

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

  function waveFor(uri) {
    if (!waves.has(uri)) {
      if (waves.size > 30) { var old = waves.keys().next().value; waves.delete(old); waveCache.delete(old); }
      waves.set(uri, readWave(uri).then(function (w) {
        if (w) waveCache.set(uri, w);
        return w;
      }));
    }
    return waves.get(uri);
  }

  var vizVals = new Array(48).fill(0);

  function drawViz() {
    var canvas = document.getElementById("il-viz");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, cssW, cssH);
    var wave = waveCache.get(song.uri);
    if (!settings.viz || !wave || !isPlaying()) return;

    var idx = Math.max(0, Math.floor((player()?.getProgress?.() || 0) / wave.sampleWindowSizeMs));
    var bands = [wave.lows, wave.mids, wave.highs];
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--il-bright").trim() || "#ffd54a";
    var barW = cssW / vizVals.length;
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;

    vizVals.forEach(function (_, j) {
      var band = bands[Math.floor(j / (vizVals.length / 3))] || wave.lows;
      var at = Math.min(band.length - 1, idx + ((j * 7) % 11));
      var target = Math.max(0, Math.min(1, band[at] || 0));
      vizVals[j] += (target - vizVals[j]) * 0.28;
      var h = Math.max(2, vizVals[j] * cssH * 0.68);
      ctx.globalAlpha = 0.28 + 0.72 * vizVals[j];
      ctx.fillRect(j * barW + 1, cssH - h, Math.max(1, barW - 2), h);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  var hubRaf = 0, lastHubTick = 0;
  function hubFrame(ts) {
    hubRaf = requestAnimationFrame(hubFrame);
    drawViz();
    if (ts - lastHubTick < 120) return;
    lastHubTick = ts;
    var p = player();
    if (!p) return;
    var dur = p.getDuration?.() || 0, pos = p.getProgress?.() || 0;
    var seek = document.getElementById("il-seek");
    var elapsed = document.getElementById("il-elapsed");
    var total = document.getElementById("il-total");
    var vol = document.getElementById("il-volume");
    if (seek) seek.value = dur ? Math.round((pos / dur) * 1000) : 0;
    if (elapsed) elapsed.textContent = p.formatTime?.(pos) || "0:00";
    if (total) total.textContent = p.formatTime?.(dur) || "0:00";
    if (vol && document.activeElement !== vol) vol.value = Math.round((p.getVolume?.() ?? 0.7) * 100);
    var playing = isPlaying();
    var play = hub.querySelector('[data-hub="play"]');
    var want = playing ? ICON.pause : ICON.play;
    if (play && play.dataset.icon !== want) {
      play.innerHTML = want;
      play.dataset.icon = want;
      play.setAttribute("aria-label", playing ? "Pause" : "Play");
    }
  }

  function startHubLoop() {
    if (!hubRaf) hubRaf = requestAnimationFrame(hubFrame);
  }
  function stopHubLoop() {
    if (hubRaf) cancelAnimationFrame(hubRaf);
    hubRaf = 0;
  }

  /* ---------- Interaction ---------- */

  function activate(key) {
    switch (key) {
      case "hub": toggleHub(); return;
      case "star": settings.star = !settings.star; toast(settings.star ? "Star of David on" : "Star of David off"); break;
      case "bass":
        settings.bass = !settings.bass;
        if (!settings.bass) { song = { uri: song.uri, hits: [] }; index = -1; }
        else loadSong(true);
        toast(settings.bass ? "Bass hits on" : "Bass hits off");
        break;
      case "spin": settings.spin = !settings.spin; toast(settings.spin ? "Star spinning" : "Star held still"); break;
      case "viz": settings.viz = !settings.viz; toast(settings.viz ? "Visualizer on" : "Visualizer off"); break;
      case "scheme": {
        var i = SCHEMES.findIndex(function (s) { return s.id === settings.scheme; });
        settings.scheme = SCHEMES[(i + 1) % SCHEMES.length].id;
        toast(currentScheme().label + " palette");
        break;
      }
      case "info": toggleHelp(); return;
      default: return;
    }
    save();
    applySettings();
  }

  function onKey(e) {
    if (e.ctrlKey && e.altKey && !e.metaKey && !e.shiftKey && player()) {
      var step = e.key === "ArrowRight" || e.key === "ArrowLeft";
      var volKey = e.key === "ArrowUp" || e.key === "ArrowDown";
      if (step) {
        e.preventDefault();
        var delta = e.key === "ArrowRight" ? 10000 : -10000;
        player()?.seek?.(Math.max(0, (player().getProgress?.() || 0) + delta));
        return;
      }
      if (volKey) {
        e.preventDefault();
        var level = player().getVolume?.() ?? 0.5;
        player()?.setVolume?.(Math.min(1, Math.max(0, level + (e.key === "ArrowUp" ? 0.1 : -0.1))));
        return;
      }
    }
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var map = { u: "hub", i: "star", p: "scheme", b: "bass", s: "spin", h: "info" };
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
        "<div><h2>Israel · Gold Edition</h2><p>A whole custom layer on top of Spotify.</p></div>" +
        '<button class="il-card-close" type="button" data-il-close aria-label="Close">' + ICON.close + "</button></header>" +
      '<div class="il-card-grid">' +
        "<div><kbd>Alt</kbd>+<kbd>U</kbd><span>Israel Hub</span></div>" +
        "<div><kbd>Alt</kbd>+<kbd>I</kbd><span>Star of David</span></div>" +
        "<div><kbd>Alt</kbd>+<kbd>P</kbd><span>Palette</span></div>" +
        "<div><kbd>Alt</kbd>+<kbd>B</kbd><span>Bass hits</span></div>" +
        "<div><kbd>Alt</kbd>+<kbd>S</kbd><span>Star spin</span></div>" +
        "<div><kbd>Alt</kbd>+<kbd>H</kbd><span>This panel</span></div>" +
        "<div><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>←→</kbd><span>Seek 10s</span></div>" +
        "<div><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>↑↓</kbd><span>Volume</span></div>" +
      "</div>" +
      '<p class="il-card-note">The hub has its own transport, visualizer, palette swatches and live sliders. Palettes: Gold · Blue · Ivory.</p>' +
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
      save(); applySettings(); updateHub();
      toast("Theme settings reset");
    }
  });

  function onKeyDown(e) {
    if (e.key !== "Escape") return;
    if (!help.hidden) { toggleHelp(false); e.preventDefault(); }
    else if (hubVisible()) { toggleHub(false); e.preventDefault(); }
  }

  /* ---------- Apply visual state ---------- */

  function syncSpeed() {
    var rate = isPlaying() ? 1 : settings.spin ? settings.pausedSpeed || 0.2 : 0;
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
    r.dataset.ilViz = settings.viz ? "on" : "off";
    r.style.setProperty("--il-star-opacity", String(settings.starOpacity));
    r.style.setProperty("--il-star-size", settings.starSize + "vmin");
    r.style.setProperty("--il-spin-time", settings.spinTime + "s");
    refreshDock();
    syncControlUI();
    syncSpeed();
    if (window.israelGold) window.israelGold.settings = settings;
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

  /* ---------- Bass hits ---------- */

  function bassMap(wave) {
    var w = wave.sampleWindowSizeMs, n = wave.lows.length;
    var span = Math.max(1, Math.round(60 / w));
    var near = Math.max(1, Math.round(70 / w));
    var hold = Math.max(0, Math.round(20 / w) - 1);

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

    var found = [];
    for (var i = 1; i < n; i++) {
      if (rise[i] < 0.06 || rise[i] < peak(rise, i) || rise[i - 1] === rise[i]) continue;
      var other = Math.max.apply(null, [0].concat(others.map(function (b) { return peak(b, i); })));
      var pure = rise[i] / (rise[i] + other);
      found.push({ i: i, rise: rise[i], level: peak(low, i), other: other, weight: Math.pow(rise[i] * pure, 3) });
    }
    if (found.length < 8) return [];

    var typical = function (key) {
      var list = found.slice().sort(function (a, b) { return a[key] - b[key]; });
      var total = list.reduce(function (sum, f) { return sum + f.weight; }, 0);
      var sum = 0;
      for (var k = 0; k < list.length; k++) if ((sum += list[k].weight) >= total / 2) return list[k][key];
    };
    var bass = { rise: typical("rise"), level: typical("level") };

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
    hits.forEach(function (h, k) {
      if (hits[k + 1]) h.length = Math.max(100, Math.min(h.length, hits[k + 1].t - h.t - 10));
    });
    return hits;
  }

  function mapSong(uri) {
    if (!maps.has(uri)) {
      if (maps.size > 30) maps.delete(maps.keys().next().value);
      maps.set(uri, waveFor(uri).then(function (wave) {
        if (!wave || wave.sampleWindowSizeMs > 130) { maps.delete(uri); return { hits: [] }; }
        return { hits: bassMap(wave) };
      }));
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
    if (song.uri !== uri) return;
    song = { uri: uri, hits: found.hits };
    var next = sp()?.Queue?.nextTracks?.[0]?.contextTrack?.uri;
    if (isTrack(next)) mapSong(next);
    if (hubVisible()) updateHub();
  }

  var lastHit = null, lastAt = 0, songRaf = 0;
  function frame() {
    songRaf = requestAnimationFrame(frame);
    var hits = song.hits;
    if (!settings.bass || !hits.length || document.hidden || !isPlaying()) return;
    var t = player().getProgress() - settings.offsetMs + 10;
    var lo = 0, hi = hits.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (hits[mid].t <= t) lo = mid + 1; else hi = mid;
    }
    if (lo - 1 === index) return;
    index = lo - 1;
    if (index < 0 || t - hits[index].t > 120) return;
    var now = performance.now();
    if (hits[index] === lastHit && now - lastAt < 400) return;
    lastHit = hits[index];
    lastAt = now;
    slam(lastHit);
  }

  var running = [];
  function playAnimation(el, frames, options) {
    if (!el) return;
    try { running.push(el.animate(frames, options)); } catch { /* no WAAPI */ }
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
    var rest = settings.starOpacity;
    playAnimation(mainView(), fall(
      { scale: 1 + punch, opacity: Math.min(1, rest + 0.45 * hit.power) },
      { scale: 1, opacity: rest }
    ), { duration: hit.length, pseudoElement: "::before" });
    playAnimation(hub.querySelector(".il-hub-star"), fall(
      { scale: 1 + punch * 1.5 }, { scale: 1 }
    ), { duration: hit.length });

    var thump = fall({ scale: "1 " + (1 + 1.4 * hit.power) }, { scale: "1 1" });
    playAnimation(document.querySelector(".Root__globalNav"), thump, { duration: hit.length, pseudoElement: "::after" });
    playAnimation(document.querySelector(".Root__nav-bar"), thump, { duration: hit.length, pseudoElement: "::before" });
    playAnimation(document.querySelector(".Root__now-playing-bar"), thump, { duration: hit.length, pseudoElement: "::before" });
    playAnimation(document.querySelector(".Root__now-playing-bar"), fall(
      { opacity: 0.35 + 0.5 * hit.power }, { opacity: 0.12 }
    ), { duration: hit.length, pseudoElement: "::after" });
    playAnimation(dock, fall({ scale: 1 + 0.08 * hit.power }, { scale: 1 }), { duration: hit.length });
    playAnimation(document.querySelector('[data-testid="control-button-playpause"]'),
      fall({ scale: 1 + 0.14 * hit.power }, { scale: 1 }), { duration: hit.length });
  }

  /* ---------- Start / stop ---------- */

  var ready = false;
  var handlers = {
    song: function () { loadSong(); syncSpeed(); updateHub(); },
    playpause: function () { setTimeout(function () { syncSpeed(); updateHub(); }, 60); }
  };

  function start() {
    if (ready) return;
    ready = true;
    intro();
    var p = player();
    p.addEventListener("songchange", handlers.song);
    p.addEventListener("onplaypause", handlers.playpause);
    addNav();
    loadSong();
    updateHub();
    syncSpeed();
    songRaf = requestAnimationFrame(frame);
  }

  function waitForPlayer() {
    if (!ready && player()?.addEventListener && mainView()) start();
    else if (!ready) setTimeout(waitForPlayer, 200);
  }

  /* ---------- Native extras ---------- */

  var menuItems = [], topItem = null;
  try {
    var Item = sp()?.ContextMenu?.Item;
    if (Item) {
      var openItem = new Item("Open Israel Hub", function () { toggleHub(true); }, function () { return true; }, ICON.grid);
      var starItem = new Item("Toggle Israel star", function () { activate("star"); }, function () { return true; }, ICON.star);
      openItem.register(); starItem.register();
      menuItems = [openItem, starItem];
    }
  } catch { /* context menu API changed */ }

  try {
    var TopButton = sp()?.Topbar?.Button;
    if (TopButton) {
      topItem = new TopButton("Israel Hub", ICON.star, function () { toggleHub(); });
      if (topItem.register) topItem.register();
    }
  } catch { /* topbar API changed */ }

  /* ---------- Mount ---------- */

  [dock, help, hub, brand].forEach(function (n) { document.body.appendChild(n); });
  window.addEventListener("keydown", onKey);
  window.addEventListener("keydown", onKeyDown);
  applySettings();
  waitForPlayer();

  window.israelGold = {
    settings: settings,
    SCHEMES: SCHEMES,
    bassMap: bassMap,
    toggle: activate,
    hub: function (open) { toggleHub(open); },
    status: function () { return Object.assign({}, settings, { hits: song.hits.length, hub: hubVisible() }); },
    destroy: function () {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onKeyDown);
      running.forEach(function (a) { a.cancel(); });
      running = [];
      cancelAnimationFrame(songRaf);
      cancelAnimationFrame(hubRaf);
      [dock, help, hub, brand, nav, document.getElementById("il-intro")].forEach(function (n) { if (n) n.remove(); });
      document.body.classList.remove("il-help-open", "il-hub-open");
      try { menuItems.forEach(function (m) { m?.deregister?.(); }); } catch { /* unavailable */ }
      try { topItem?.deregister?.(); } catch { /* unavailable */ }
      try {
        if (ready) {
          player()?.removeEventListener?.("songchange", handlers.song);
          player()?.removeEventListener?.("onplaypause", handlers.playpause);
        }
      } catch { /* unavailable */ }
      ready = false;
    }
  };
})();
