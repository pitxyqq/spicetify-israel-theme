# Israel · Gold Edition

This is a **custom interface layer** for Spotify, not a recolour. It keeps the
flag-inspired look (gold stripes, Star of David, dark panels) and adds real UI
that lives inside the client: a dashboard, custom controls, navigation entries,
a waveform visualizer and live theme tuning.

## What it actually adds

### Israel Hub (`Alt+U`)

A full custom dashboard, opened from the dock, the pinned sidebar entry, the
topbar star button, the right-click menu, or `Alt+U`. It contains:

- **Working transport** built from scratch: play/pause, previous, next,
  shuffle, repeat, like, seek bar and volume slider (these use Spotify normally).
- **Live track display**: artwork, title, artist, elapsed/total time.
- **Waveform visualizer**: 48 animated bars drawn from Spotify's own 3-band
  waveform metadata — lows are gold, mids and highs fill out the rest. It only
  draws when the hub is open and a song is playing.
- **Palette swatches**: Gold / Blue / Ivory, switched instantly.
- **Scene toggles**: star, bass hits, spin, visualizer.
- **Live sliders**: star opacity, star size, spin time, bass filter, hit strength
  and hit offset. Changes apply immediately and persist.
- **Quick navigation**: Home, Search, Liked Songs, and copy the current track
  link.

### Custom controls everywhere

- A six-button floating dock (hub, star, palette, bass, spin, help).
- A fixed "ISRAEL" brand chip in the top bar.
- A pinned "Israel Hub" sidebar entry with a shortcut hint.
- A star button in Spotify's native top bar plus two right-click menu entries
  ("Open Israel Hub", "Toggle Israel star") when those APIs are available.
- Custom tooltips, toasts and a help dialog.
- Restyled stock controls: circular gold play button, glowing active
  shuffle/repeat/like, gold sliders, star marker on the playing track row,
  shimmering cards, framed artwork, themed menus, dialogs and scrollbars.
- A drawn star intro at startup and bass-reactive pulses across the star,
  stripes, player, dock and hub.

## Install

Copy this folder into your Spicetify `Themes` directory and apply it:

```powershell
spicetify config current_theme Israel color_scheme base
spicetify apply
```

Make sure `inject_css = 1` and `inject_theme_js = 1` in `config-xpui.ini`. Both
`user.css` and `theme.js` load locally — no CDN, no separate extension.

Built-in Spicetify schemes: `base` (Gold), `blue`, `ivory`.

## Shortcuts

| Keys | Action |
| --- | --- |
| `Alt` + `U` | Open / close Israel Hub |
| `Alt` + `I` | Toggle the Star of David |
| `Alt` + `P` | Cycle Gold / Blue / Ivory |
| `Alt` + `B` | Toggle bass hits |
| `Alt` + `S` | Pause or resume the star spin |
| `Alt` + `H` | Open the help panel |
| `Esc` | Close the topmost panel |
| `Ctrl` + `Alt` + `←` / `→` | Seek 10 seconds |
| `Ctrl` + `Alt` + `↑` / `↓` | Change volume |

All theme settings save themselves; the help panel has a one-click reset.

## Tweak it

`user.css` starts with the visual tokens:

```css
:root {
  --il-star-opacity: 0.5;
  --il-star-size: 78vmin;
  --il-stripe: 6px;
  --il-spin-time: 30s;
}
```

`theme.js` starts with the behaviour defaults:

```js
strict: 0.5,       // bass filter: lower = more hits
punch: 0.22,       // hit strength
offsetMs: 0,       // shift hits earlier/later
pausedSpeed: 0.2   // spin speed while paused
```

The hub sliders override these at runtime and save the result.

## Files

| File | Purpose |
| --- | --- |
| `user.css` | Full skin plus all custom component CSS |
| `theme.js` | Hub, dock, visualizer, shortcuts, intro, bass engine |
| `color.ini` | Three Spicetify colour schemes |
| `manifest.json` | Theme metadata (JS loads locally) |
| `preview.svg` | Preview artwork |

## Notes

- Waveform data is only read. It never alters playback or account data.
- Transport controls in the hub are the only controls that act on playback, and
  they do exactly what Spotify's own buttons do.
- `prefers-reduced-motion` is respected: the intro is skipped and animations stop.
- After a Spotify update breaks a class name, run
  `spicetify restore backup apply`, then re-apply the theme.
