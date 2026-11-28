# Israel · Gold Edition

A complete Spicetify skin built around the Israeli flag: a bright stripe under the
top bar, another above the player, and a slowly turning Star of David behind the
content. Every part of Spotify is restyled — sidebar, headers, cards, track list,
transport buttons, sliders, lyrics, queue, menus, dialogs, tooltips and scrollbars.

## What's included

- **Custom control dock** in the bottom-right corner with five buttons:
  - Star of David on/off
  - Palette: Gold → Blue → Ivory
  - Bass-reactive hits on/off
  - Star spin on/off
  - Shortcuts panel (and a reset button)
- **Custom look everywhere**
  - Gold/blue/ivory buttons, circular play button, glowing active shuffle/repeat/like
  - Gold progress and volume sliders, scrubber thumb and selection colour
  - Gold sidebar navigation with active rail, hover shift and star watermark
  - Framed artwork, shimmering card hovers, gold track rows and headers
  - Star-animated intro at startup
- **Bass-reactive visuals** that read Spotify's own waveform metadata and pulse the
  star, stripes, player and controls on real bass hits. Quiet passages stay still.
- **Three colour schemes** in `color.ini` (`base` = Gold, `blue`, `ivory`).
- Everything is local to this folder. No CDN and no account/playlist changes.

## Install

Copy this folder into your Spicetify `Themes` directory and apply it:

```powershell
spicetify config current_theme Israel color_scheme base
spicetify apply
```

Optional built-in schemes:

```powershell
spicetify config current_theme Israel color_scheme blue
spicetify config current_theme Israel color_scheme ivory
spicetify apply
```

Make sure `inject_css = 1` and `inject_theme_js = 1` in `config-xpui.ini` so both
`user.css` and `theme.js` are loaded. No separate extension is needed.

## Shortcuts

| Keys | Action |
| --- | --- |
| `Alt` + `I` | Toggle the Star of David |
| `Alt` + `P` | Cycle Gold / Blue / Ivory |
| `Alt` + `B` | Toggle bass hits |
| `Alt` + `S` | Pause or resume the star spin |
| `Alt` + `H` | Open the shortcuts panel |
| `Esc` | Close the panel |

Settings are saved automatically and restored on the next Spotify start. The panel
also has a one-click reset.

## Tweak it

Open `user.css` and edit the tokens at the top:

```css
:root {
  --il-star-opacity: 0.5; /* 0 = hidden, 1 = solid */
  --il-star-size: 78vmin;
  --il-stripe: 6px;
  --il-spin-time: 30s;    /* lower = faster */
}
```

`theme.js` keeps its own tunables at the top:

```js
strict: 0.5,  // 0.35 = more bass hits, 0.65 = only the heaviest
punch: 0.22,  // how far the star jumps on a full hit
offsetMs: 0,  // raise if hits look early (Bluetooth), lower if late
```

## Files

| File | Purpose |
| --- | --- |
| `user.css` | The full visual skin and custom UI components |
| `theme.js` | Control dock, shortcuts, intro and bass-reactive animation |
| `color.ini` | The three Spicetify colour schemes |
| `manifest.json` | Theme metadata (JS is loaded locally from `theme.js`) |
| `preview.svg` | Marketplace/preview artwork |

## Notes

- The animation only **reads** song metadata; it never changes playback, likes or
  account data.
- `prefers-reduced-motion` is respected: the intro is skipped and animations stop.
- If Spotify changes a class name after an update, run `spicetify restore backup apply`
  and re-apply the theme.
