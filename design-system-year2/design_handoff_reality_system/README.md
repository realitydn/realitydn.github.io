# Handoff: REALITY Design System — Year 2

The complete REALITY visual system: foundations (color, type, spacing, shadow, motion, icons), an app component set, a photo language, and a nightlife **poster system** with a working generator. Packaged for implementation across the REALITY surfaces — the **main website**, the **REALITY App**, and the **employee sidework app**.

REALITY is a bar in Đà Nẵng (86 Mai Thúc Lân, open daily 11:00–02:00). The system has a **silkscreen / riso** DNA — cream paper, ink rectangles, hard down-shadows, misregistered color — and runs as **one tokened theme** that flips between **Day** (ink-on-cream) and **Night** (cream-on-ink).

> **Revision — June 2026.** This bundle has been updated from production use building realitydn.com and the poster generator. The **Poster Studio is now a fully-featured editor** (templates, multi-format export, real QR, multi-select alignment, photo controls, and more), the **canonical wordmark** is included as vector, and **real QR assets** ship in `assets/`. See [`REVISION.md`](REVISION.md) for the full changelog and the new design conventions (major-color hierarchy, full-bleed + talk-banner posters, Swiss alignment).

---

## About the design files

The files in `design/` are **design references created in HTML** — prototypes that show the intended look, behavior, and motion. **They are not production code to copy verbatim.** The task is to **recreate these designs inside each target codebase's existing environment**, using its established patterns and libraries:

- **Main website** → whatever the site is built in (static/React/etc.). Use `tokens/reality-tokens.css` directly if it's CSS-based.
- **REALITY App** → its existing app framework (React/React-Native/etc.). Map tokens to its theme layer.
- **Employee sidework app** → same — pull in the tokens, rebuild the components against its own component primitives.

Where a codebase already has a theming/token layer, **feed it `reality-tokens.json`** rather than hand-copying hex values. The HTML/CSS in `design/` is the spec; the tokens are the source of truth.

## Fidelity

**High-fidelity.** Colors, typography, spacing, shadows, motion curves and durations are all final and tokenized. Recreate the UI faithfully using each codebase's primitives. The one deliberate exception: **photographs are striped placeholders** throughout — real photography gets dropped in per the Photo Guidance rules.

---

## Bundle contents

```
design_handoff_reality_system/
├── README.md                  ← this file (self-sufficient spec)
├── REVISION.md                ← June 2026 changelog + new design conventions
├── tokens/
│   ├── reality-tokens.css      ← drop-in CSS custom properties (day + night)
│   └── reality-tokens.json     ← same tokens, Style-Dictionary-style, for theme layers
├── assets/                     ← shippable brand assets (NEW)
│   ├── wordmark/
│   │   ├── reality-wordmark.svg    ← the canonical REALITY wordmark (vector — use this)
│   │   └── reality-mark-R.svg      ← the "R" lettermark (favicon)
│   └── qr/
│       ├── reality-qr-ink-on-white.png / -on-cream.png / -transparent.png
│       ├── reality-qr-ink.svg       ← vector QR (encodes https://realitydn.com)
│       ├── reality-qr-matrix.js     ← module matrix (powers the Studio's QR)
│       └── generate-qr.py           ← regenerate / make UTM variants
├── design/                     ← the HTML design references (open any in a browser)
│   ├── REALITY Design System.html        ← START HERE — master overview, live controls
│   ├── REALITY App Components.html
│   ├── REALITY Icon Library.html
│   ├── REALITY Iconography.html
│   ├── REALITY Motion.html
│   ├── REALITY Photo Guidance.html
│   ├── REALITY Photo Treatments.html
│   ├── REALITY Poster App - Feature Menu.html
│   ├── REALITY Poster App - Taxonomy.html
│   ├── REALITY Poster Grid System.html
│   ├── REALITY Poster Studio.html         ← working poster generator (React + export)
│   ├── REALITY Spacing & Layout.html
│   ├── reality-ds.css   reality-ds.js     ← the shared system stylesheet + theme/accent JS
│   ├── *.css  *.js  *.jsx                 ← per-doc styles, the riso engine, the studio app
│   └── anim/  components/  icons/  spacing/
└── screenshots/                ← rendered stills of the key pages
```

**To view:** open any file in `design/` directly in a browser. The React pages (App Components, Icon Library, Iconography, Spacing & Layout, Poster Studio) transpile in-browser via Babel and need a network connection for the CDN scripts and Google Fonts.

---

## Foundations

### Fonts
Three families, all on Google Fonts:

| Token | Family | Role | Weights |
|---|---|---|---|
| `--mont` | **Montserrat** | UI + display. Headings & buttons are UPPERCASE, wide letter-spacing. | 100, 500, 600, 700, 800 |
| `--alt` | **Montserrat Alternates** | Wordmark — supplies the **A / I / Y** in REALITY (the R, E, L, T stay Montserrat). The canonical mark ships as a baked **SVG**, tracked 0.1em; this font is the fallback for set-text "Reality" (e.g. the poster footer atom). | 600 |
| `--grotesk` | **Space Grotesk** | Body copy. | 400, 500, 600 |

Load: `https://fonts.googleapis.com/css2?family=Montserrat:wght@100;500;600;700;800&family=Montserrat+Alternates:wght@600&family=Space+Grotesk:wght@400;500;600&display=swap`

### Color — 3 majors + 4 minors (LOCKED)
The palette is fixed. Don't add or recolor. It doubles as **category-coding** in the poster system.

| Token | Hex | Tier | Category register |
|---|---|---|---|
| `--yellow` | `#fddf00` | major | drink deals / happy hour |
| `--red` | `#ed2224` | major | imperative / alerts |
| `--blue` | `#18a7e0` | major | live music |
| `--pink` | `#ed1b72` | minor | parties (default accent) |
| `--amber` | `#fdb515` | minor | warm / late |
| `--green` | `#43b02a` | minor | community / day |
| `--purple` | `#6e3179` → `#9a4faa` in Night | minor | after-dark (lifts on dark bg) |

**Accent slots:** `--accent` (default `--pink`) is the swappable lead; `--accent-2` (default `--blue`) is the second misregistration layer in posters.

### Surfaces — Day (default) / Night
Set `data-theme="dark"` on `<html>` to flip. Local `.scope-day` / `.scope-night` classes flip a single block (e.g. a Night poster previewed on a Day page).

| Token | Day | Night |
|---|---|---|
| `--bg` | `#fffbf1` | `#0a0703` |
| `--surface` | `#fffbf1` | `#171109` |
| `--surface-2` | `#fffbf1` | `#241a10` |
| `--fg` (text, 2px borders, fills) | `#0d0905` | `#fffbf1` |
| `--fg-dim` | `rgba(13,9,5,.72)` | `rgba(255,251,241,.60)` |
| `--fg-faint` | `rgba(13,9,5,.45)` | `rgba(255,251,241,.32)` |
| `--hairline` | `rgba(13,9,5,.16)` | `#3a2c1c` |
| `--on-ink` (text on an ink fill) | `#fffbf1` | `#fffbf1` |

Note that in Day, `--bg`, `--surface`, and `--surface-2` are **all the same cream** — cards are separated by **borders, not fills**. Depth comes from borders + the down-shadow, never from tints.

### Shadow — flat riso down-shadow
A straight-down offset with almost no blur, like ink leaking under a lifted edge. **Inverts to cream** in Night.

| Token | Day | Night |
|---|---|---|
| `--sh-light` | `0 4px 1px rgba(13,9,5,.08)` | `0 4px 1px rgba(255,251,241,.14)` |
| `--sh-default` | `0 8px 2px rgba(13,9,5,.12)` | `0 9px 2px rgba(255,251,241,.18)` |
| `--sh-heavy` | `0 12px 3px rgba(13,9,5,.18)` | `0 14px 3px rgba(255,251,241,.26)` |

### Spacing — 4px ramp
`--space-1…10` = **4, 8, 12, 16, 20, 24, 32, 48, 64, 96** px.

Semantic app-layout tokens (locked "Comfortable" density): `--screen-pad` 20 · `--section-gap` 16 · `--card-pad` 20 · `--row-y` 12 · `--tap-min` **48 (touch-target floor)** · `--grid-cols` 4 · `--grid-gutter` 12.

### Borders & corners
**Hard corners everywhere — `border-radius: 0`, no exceptions.** Standard stroke is **2px** ink (`--fg`); section rules **1.5px**; mastheads & footers **3px**.

### Type roles
| Role | Family / weight | Size | Tracking / transform |
|---|---|---|---|
| Display | Montserrat 100 | `clamp(40px, 7vw, 82px)` | `.05em` UPPERCASE, lh 1.05 |
| H1 | Montserrat 700 | `clamp(30px, 4vw, 46px)` | `.05em` UPPERCASE, lh 1.1 |
| H2 | Montserrat 600 | 24px | `.05em` UPPERCASE |
| Label / eyebrow | Montserrat 700 | 13px | `.15em` UPPERCASE, often `--accent` |
| Body | Space Grotesk 400 | 17px | lh 1.7 |
| Wordmark | Montserrat Alternates 600 | display | `.02em` UPPERCASE, lh 0.9 |

### Motion
**Easing:** `--ease-stamp` `cubic-bezier(.2,1.4,.45,1)` (overshoot punch) · `--ease-snap` `cubic-bezier(.3,0,.2,1)` (quick settle) · `--ease-out` `cubic-bezier(.16,1,.3,1)`.
**Durations:** `--dur-tap` 120ms · `--dur-quick` 200ms · `--dur-settle` 350ms (theme flip) · `--dur-enter` 700ms · `--stagger` 90ms between siblings.

---

## The DNA — four rules

1. **Ink & paper.** Two-color thinking. Cream + ink carry everything; the palette is an accent, not a background.
2. **Hard corners.** No radius, anywhere. Everything is a stamped rectangle.
3. **Down-shadow, not glow.** Flat offset shadow — objects sit *above* the paper. Inverts to cream after dark.
4. **Stamp, don't float.** Motion punches in with overshoot and settles. No slow fades from nowhere; no decorative loops on content.

---

## The pages (screens / views)

> **`REALITY Design System.html` is the master.** It carries live controls in the masthead — **Day/Night** toggle and a **category-accent** swatch row — that re-skin the whole page and every poster. Sections: **01 Color · 02 Type · 03 Shadow · 04 Components · 05 Motion · 06 Poster System · 07 DNA.** Read it first.

### App / product UI
- **REALITY App Components.html** — the component kit (React, source in `components/ui.jsx`): buttons (default, alt, and three semantic variants), chips, **input fields in default / focus / error / disabled states**, cards. Has its own Day/Night toggle. *This is the primary reference for the App and the sidework app.*
- **REALITY Icon Library.html** — the full icon set (React, source in `icons/icons.jsx`). 2px ink strokes, hard joints, same paper/ink logic.
- **REALITY Iconography.html** — construction guidance: grid, stroke weight, corner treatment, sizing.
- **REALITY Spacing & Layout.html** — the 4px ramp applied to a phone screen at the locked "Comfortable" density; shows `--screen-pad`, `--row-y`, `--tap-min`, the 4-column content grid.

### Component specs (from `reality-ds.css` / `components/ui.jsx`)
- **Button** — Montserrat 700, UPPERCASE, `.1em` tracking, 14px. `2px solid --fg`, padding `14px 26px`, fill `--fg` / text `--bg`, `--sh-default`. **Hover:** `translateY(-3px)` + `--sh-heavy` (120ms). **Active:** `translateY(2px)` + `--sh-light`. Variants: `.alt` (paper fill, ink text), `.action` (red, imperative), `.info` (blue), `.notice` (yellow).
- **Chip** — Montserrat 700, 11px, `.1em`. `2px solid --fg`, paper fill, padding `8px 14px`, optional 10px bordered dot.
- **Field** — `2px solid --fg`, paper surface, `--sh-light`, padding `14px 16px`, Space Grotesk 16px. Label above: Montserrat 700, 11px, `.12em`. **Focus:** border `--accent` + 3px translucent accent outline. **Error:** border + hint in `--red`. **Disabled:** transparent.
- **Card** — `2px solid --fg`, paper surface, `--sh-default`. Optional top bar in `--accent` with ink text (Montserrat 700, 11px, `.12em`).
- **Focus-visible (global):** `3px solid --accent`, `2px` offset.

### Motion — `REALITY Motion.html`
Sections: **01 Four rules · 02 Easing curves · 03 Duration scale · 04 Triggers · 05 Named animations · 06 Reduced motion.** Curves/durations are the tokens above. **Reduced-motion contract:** under `prefers-reduced-motion: reduce`, all transitions are disabled (`* { transition: none !important }`) and animated content shows its end-state — never a pre-animation `opacity:0`.

### Photo language
- **REALITY Photo Guidance.html** — **01 Pick a treatment** (start with Duotone) · **02 Day or night paper** (paper sets the mood; pick an accent from that side) · **03 The Reality logo box** (the wordmark never floats bare on a photo — it always sits in a box) · **04 Quick rules**.
- **REALITY Photo Treatments.html** — six riso photo treatments rendered live by the **riso engine** (`riso-engine.js` / `riso-app.js`): all six read one source photo + the poster's ink. Shows them on real poster layouts and how a **Photo element** would land in Poster Studio (drop an image → pick a treatment → it inherits the poster's ink).

### Poster system (the Year-2 expansion)
A generator language for nightlife posters — parties, DJ sets, live music, the bar. The palette becomes **category-coding** and the silkscreen "misregistered echo" becomes the layout engine.

- **REALITY Poster Grid System.html** — the **9-slot grid** and **four archetypes** (two Day, two Night). Photos are placeholders you supply.
- **REALITY Poster App - Taxonomy.html** — the grammar: **01 The Three Layers** (a poster = pick a **Frame** · fill the **Parts** · set the **Dials**) · **02 The Dials** (seven spectrums, calm-community → wild-nightlife) · **03 Color, With Reasons** (each accent's register) · **04 Archetypes Are Coordinates** (the four posters are just dial settings).
- **REALITY Poster App - Feature Menu.html** — the generator's feature menu / UI surface.
- **REALITY Poster Studio.html** — a **working, full-featured** poster editor (React; `studio-*.jsx` + `riso-engine.js`): canvas, draggable parts, a **master layout** that reflows to every output format, live theme/accent, and **export to PNG / JPG / PDF / zip** (jsPDF + html-to-image + JSZip). What it now does (this revision):
  - **Formats** — authors at the **4:5 (1080×1350) master** (the primary feed format) and reflows to 5:7, 1:1, 9:16, A4; per-format layout overrides. `ALL` exports the zip.
  - **Templates** — 11 starting layouts in a collapsible menu (5 single-talk, 3 series, 3 nightlife). Each opens **full-bleed photo**; Talk/Series end with a **full-width REALITY banner** filling the bottom (the bookish, serious read).
  - **Parts** — Title, Tagline, When chip, Host (Standard/Compact size in the panel), **REALITY ticket** (one item; **Banner / Standard / Slim / Mini** formats in the panel), Lineup, Specials, QR, Stamp, Badge, Photo. The ticket renders the **canonical wordmark SVG** (not set-text).
  - **Per-element** — surface, **Ink/Cream/accent colour** (forces text colour for legibility over a photo), font size (snapped scale), **letter-spacing**, weight, align, orient, tilt/rotation, width/height.
  - **Photo** — six riso treatments, **main + accent ink** pickers, **brightness/contrast** and per-treatment dials, **pan/zoom/rotate within the frame**, bleed vs ink-border (bleed default), and a **faded preview of the cropped overflow** while selected.
  - **Arranging** — **multi-select** (shift-click) with an **alignment toolbar** (left/centre/right · top/middle/bottom) and **edge-snapping** to other elements, the spine, and the safe zone while dragging. Delete/Backspace removes the selection. Grid + safe-zone guides render **above** the artwork.
  - **Shared poster atoms:** footer/banner wordmark (the canonical SVG) + meta + **real QR** (encodes `https://realitydn.com`, see `assets/qr/`); striped photo placeholders; `3px` rules.

---

## Implementation notes

- **Tokens first.** Wire `reality-tokens.css` (or `.json`) into each codebase before building components, so Day/Night and accent-swapping come for free. The whole system re-skins from `--fg`/`--bg` + the accent — keep that indirection.
- **Theme switch** = set `data-theme="dark"` on the root. Body transitions `background`/`color` at 350ms. Posters and scoped blocks can opt into the opposite theme with `.scope-day` / `.scope-night`.
- **No radius, ever.** If a codebase's base components round corners by default, override to 0.
- **Borders carry structure**, especially in Day where surfaces are all the same cream. Don't substitute drop shadows-as-cards or tinted fills for the 2px ink border + flat down-shadow.
- **Touch targets ≥ 48px** (`--tap-min`) in the App and sidework app.
- **Respect reduced motion** — ship the end-state, gate entrances on `prefers-reduced-motion: no-preference`.
- **Photography** is dropped in later via the Photo Guidance treatments; build photo containers to host the riso/duotone treatment + the mandatory logo box.

## Assets

- **Fonts:** Google Fonts only (Montserrat, Montserrat Alternates, Space Grotesk) — no local font files.
- **Icons:** vector, defined in `design/icons/icons.jsx` (2px ink strokes). Re-draw against each codebase's icon component, or export to SVG from the Icon Library page.
- **Photos:** none shipped — all striped placeholders. Real photography is client-supplied and runs through the Photo Treatments.
- **QR codes:** the posters render a stylized placeholder grid; swap for a real QR generator at build time.
- **Third-party (Poster Studio only):** React 18.3.1, Babel standalone, html-to-image, jsPDF, JSZip (all via CDN in the prototype; use real npm packages in production).

## Files

Everything in `design/` is the reference. The shared backbone is **`reality-ds.css`** (all tokens + base component styles) and **`reality-ds.js`** (theme toggle, accent swap, poster scaling, QR placeholder). Per-area styles: `components.css`, `guidance.css`, `riso.css` + `riso-engine.js`/`riso-app.js` (photo treatments), `motion-doc.css`/`motion-doc.js` (motion), `poster-grid.css` / `poster-app.css` / `poster-taxonomy.css` (poster system), `studio.css` + `studio-*.jsx` (the generator), and `anim/` (Design-System motion demos). `tokens/` is the distilled, framework-agnostic source of truth — start there.
