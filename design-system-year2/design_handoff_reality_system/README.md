# Handoff: REALITY Design System — Year 2

The complete REALITY visual system: foundations (color, type, spacing, shadow, motion, icons), an app component set, a photo language, and a nightlife **poster system** with a working generator. Packaged for implementation across the REALITY surfaces — the **main website**, the **REALITY App**, and the **employee sidework app**.

REALITY is a bar in Đà Nẵng (86 Mai Thúc Lân, open daily 11:00–02:00). The system has a **silkscreen / riso** DNA — cream paper, ink rectangles, hard down-shadows, misregistered color — and runs as **one tokened theme** that flips between **Day** (ink-on-cream) and **Night** (cream-on-ink).

> **Revision — 19.08.2026 · canon rev · AUDIT CLOSED.** This bundle now carries the reconciled system. A full audit diffed this design system against the shipped app, the website and the three studios; **37 calls were made and written into the token layer.** Values corrected by accessibility audit and by measurement are marked in `tokens/reality-tokens.json` with their previous value and the reason. **If you are holding an older copy of this bundle, it is pre-audit** — its `--fg-faint`, `--surface-2` and Day shadow values are wrong, it calls pink the default accent, and it calls 350ms the theme flip.
>
> See [`REVISION.md`](REVISION.md) for the changelog and [`guidelines/canon-applied.html`](guidelines/canon-applied.html) for the decision record. **41 calls, all closed** — there are no open questions in this system.

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
│   ├── reality-tokens.json     ← same tokens + WHY each corrected value changed
│   └── day-colours.json        ← weekday hues, ink partner map, never-pair list,
│                                 per-theme accent, print values, site string
│                                 (canvas/PDF renderers import this directly)
├── guidelines/                 ← the canon cards (open in a browser)
│   ├── canon-applied.html          ← THE DECISION RECORD — read after the master
│   ├── decisions-final-four.html   ← the four calls still open, rendered live
│   ├── accessibility.html          ← every measured contrast pair + bilingual type
│   ├── buttons.html                ← four roles, one ACTION per screen
│   ├── calendar-family.html        ← the .cal-* set (most-seen components)
│   ├── primitives.html             ← the eight small parts + the isolation gotcha
│   ├── motion-index.html           ← curves, durations, named keyframe index
│   ├── wordmark-assets.html        ← the mark, the QR, the mandatory strings
│   ├── typography-merged-system.html
│   ├── day-coding.html   color-hierarchy.html   studios.html
│   └── canon-open-questions.html   ← the original audit, for provenance
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
| `--pink` | `#ed1b72` | minor | parties · Thursday |
| `--amber` | `#fdb515` | minor | warm / late |
| `--green` | `#43b02a` | minor | community / day |
| `--purple` | `#6e3179` → `#9a4faa` in Night | minor | after-dark (lifts on dark bg) |

**Tiers are jobs, not rank.** *Hierarchy* was retired 18.08.26: **majors carry meaning** (named UI jobs — blue takes eyebrows, links and wayfinding; yellow takes notices and deals; red takes the imperative) and **minors carry mood** (the day-code and artwork). **No minor takes a UI job.** The accent is the single exemption.

**Accent slots — theme-aware.** `--accent` **leads blue in Day and pink in Night**; `--accent-2` is the lead's partner from the ink partner map, and is the second misregistration plate. Each theme scope sets its own pair, so the app and the site no longer disagree. The partner map, the per-theme accent pair and the four never-pair combinations all ship as data in `tokens/day-colours.json` — canvas and PDF renderers import that file directly, since they cannot read CSS custom properties.

### Surfaces — Day (default) / Night
Set `data-theme="dark"` on `<html>` to flip. Local `.scope-day` / `.scope-night` classes flip a single block (e.g. a Night poster previewed on a Day page).

| Token | Day | Night |
|---|---|---|
| `--bg` | `#fffbf1` | `#0a0703` |
| `--surface` | `#fffbf1` | `#171109` |
| `--surface-2` (insets, day headers, skeletons) | `#f4ecd7` | `#241a10` |
| `--paper-shade` (poster placeholder, pre-load) | `#ece2c9` | `#1c140b` |
| `--fg` (text, 2px borders, fills) | `#0d0905` | `#fffbf1` |
| `--fg-dim` | `rgba(13,9,5,.72)` | `rgba(255,251,241,.60)` |
| `--fg-faint` | `rgba(13,9,5,.56)` | `rgba(255,251,241,.48)` |
| `--hairline` | `rgba(13,9,5,.16)` | `#3a2c1c` |
| `--on-ink` (text on an ink fill) | `#fffbf1` | `#fffbf1` |

`--bg` and `--surface` are the same cream — **cards are separated by borders, not fills**, and depth comes from the border plus the down-shadow. `--surface-2` and `--paper-shade` are the exception and are **not tints**: they are two shades of *unprinted stock*, used only to mark that nothing has been printed there yet (insets, day headers, skeletons, poster placeholders). They were collapsed onto `--bg` in the original spec, which made every one of those invisible in Day.

**`--fg-faint` carries real reading text** — bottom-nav labels, field hints, placeholders, timestamps — so it was corrected to pass AA: Day .45 → **.56** (3.15:1 → 4.53:1), Night .32 → **.48** (2.71:1 → 4.84:1). `--hairline` stays exempt; it is decoration only and never the sole indicator of anything.

### Shadow — flat riso down-shadow
A straight-down offset with almost no blur, like ink leaking under a lifted edge. **Inverts to cream** in Night.

| Token | Day | Night |
|---|---|---|
| `--sh-light` | `0 4px 1px rgba(13,9,5,.10)` | `0 4px 1px rgba(255,251,241,.14)` |
| `--sh-default` | `0 8px 2px rgba(13,9,5,.16)` | `0 9px 2px rgba(255,251,241,.18)` |
| `--sh-heavy` | `0 13px 3px rgba(13,9,5,.23)` | `0 14px 3px rgba(255,251,241,.26)` |

Day was corrected upward (from .08 / .12 / .18 at 12px) because the lighter set **washed out on cream** and cards did not read as lifted. Night was already right and is unchanged — the asymmetry is deliberate. **Print is explicitly exempt** and keeps .08 / .12 / .18 with heavy at 12px: white stock has more headroom and K prints heavier than it looks.

### Spacing — 4px ramp
`--space-1…10` = **4, 8, 12, 16, 20, 24, 32, 48, 64, 96** px.

Semantic app-layout tokens (locked "Comfortable" density): `--screen-pad` 20 · `--section-gap` 16 · `--card-pad` 20 · `--row-y` 12 · `--tap-min` **48 (touch-target floor)** · `--grid-cols` 4 · `--grid-gutter` 12.

### Borders & corners
**Hard corners everywhere — `border-radius: 0`, no exceptions.** Standard stroke is **2px** ink (`--fg`); section rules **1.5px**; mastheads & footers **3px**.

### Type roles
**Two independent axes** (merged 18.08.26 — this replaces the old single table):

**1 · Family is set by job.** **Montserrat names things; Space Grotesk states facts.** Times, prices, rooms, dates and capacities are Grotesk in *every* medium, including posters — at range only the size and weight rise (500 → 700), never the family.

**2 · Case is set by register, not by element.** Register is a **closed list**, never a distance estimate or a size threshold:

| Register | Surfaces | Case |
|---|---|---|
| `.reg-far` | poster · banner · signage · social thumbnail · projected/TV schedule · hero plate | UPPERCASE |
| `.reg-near` | app list · web body · printed schedule · menu · ticket · email · any body copy | Sentence case |

*The poster shouts the name; the app tells you about it.* Don't re-uppercase the feed.

| Class | Family / weight | Size | Tracking |
|---|---|---|---|
| `.type-display` | Montserrat 100 | `clamp(40px, 7vw, 82px)` | `.015em`, lh 1.05 |
| `.type-h1` | Montserrat 700 | `clamp(30px, 4vw, 46px)` | `.025em`, lh 1.1 |
| `.type-h2` | Montserrat 600 | 24px | `.04em` |
| `.type-h3` | Montserrat 600 | 17px | `0` |
| `.type-name` | Montserrat 600 | 15px | `0` — **never uppercased** |
| `.type-label` | Montserrat 700 | 13px | `.16em` UPPERCASE |
| `.type-button` | Montserrat 700 | 13px | `.11em` UPPERCASE |
| `.type-fact` | Grotesk 500 | 13px | `0`, tabular figures |
| `.type-fact-far` | Grotesk 700 | per medium | `0`, tabular figures |
| `.type-page` | Grotesk 400 | 17px | `0`, lh 1.7 |
| `.type-sub` | Grotesk 400 | 12px | `0`, `--fg-faint` |
| `.type-micro` | Grotesk 600 | 12px | `.12em` UPPERCASE — technical strings only |
| `.type-wordmark` | Alternates 600 | display | `.10em` — see the wordmark card first |

**One tracking ladder, two offsets:** `@media print` adds `.01em`; `.medium-signage` adds `.02em` and forces weight 700. Never a second table.

**12px is the informational floor.** Anything you would *act* on — a time, a room, a price, a date — sits at 12px or above. 11px is decorative labels only. The context is a dark bar.

**Long names split at the data layer**, never truncate: a row carries `name` + `qualifier` as two fields (`.name-block` + `.type-sub`).

**Vietnamese:** uppercase VI needs `line-height: 1.3` (stacked diacritics sit above cap height) and display steps to **weight 200** under `:lang(vi)`. Proper names keep their own capitalisation — *bảo anh* and *MIDNIGHT WOLVES* both render as written. Never strip diacritics. Money is `45.000₫` — dot thousands, currency trailing, no space.

### Motion
**Easing:** `--ease-stamp` `cubic-bezier(.2,1.4,.45,1)` (overshoot punch) · `--ease-snap` `cubic-bezier(.3,0,.2,1)` (quick settle) · `--ease-out` `cubic-bezier(.16,1,.3,1)`.
**Durations:** `--dur-tap` 120ms · `--dur-quick` 200ms · `--dur-settle` 350ms (**interaction settle — not the theme flip**) · `--dur-enter` 700ms (entrances **and the Day↔Night flip**) · `--stagger` 90ms between siblings.

**The theme flip is 700ms**, applied via an `html.theme-settling` class that transitions every surface, border, shadow and fill together, then releases back to interaction timing. Never animate the theme per component. (The old spec called this 350ms; that was wrong.)

---

## The DNA — four rules

1. **Ink & paper.** Two-color thinking. Cream + ink carry everything; the palette is an accent, not a background.
2. **Hard corners.** No radius, anywhere. Everything is a stamped rectangle.
3. **Down-shadow, not glow.** Flat offset shadow — objects sit *above* the paper. Inverts to cream after dark.
4. **Misregister.** Two offset accent plates behind a hero block — a print that didn't quite register. **Static offsets** (13/6 hero, 6/3 card) since 18.08.26; the drifting loop was retired. Requires `isolation: isolate` on a **background-less** ancestor or the negative-z plates vanish silently — this has bitten twice. Two plates, never three.
5. **Stamp, don't float.** Motion punches in with overshoot and settles. No slow fades from nowhere; no decorative loops on content.

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
  - **Formats** — authors at the **4:5 (1080×1350) master** (the primary feed format) and reflows to **1:1, 9:16, A4**; per-format layout overrides. `ALL` exports the zip. (5:7 and the FB cover were dropped — 4:5 serves FB events.)
  - **Templates** — 11 starting layouts in a collapsible menu (5 single-talk, 3 series, 3 nightlife). Each opens **full-bleed photo**; Talk/Series end with a **full-width REALITY banner** filling the bottom (the bookish, serious read).
  - **Parts** — Title, Tagline, When chip, Host (Standard/Compact size in the panel), **REALITY ticket** (one item; **Banner / Standard / Slim / Mini** formats in the panel), Lineup, Specials, QR, Stamp, Badge, Photo. The ticket renders the **canonical wordmark SVG** (not set-text).
  - **Per-element** — surface, **Ink/Cream/accent colour** (forces text colour for legibility over a photo), font size (snapped scale), **letter-spacing**, weight, align, orient, tilt/rotation, width/height.
  - **Photo** — six riso treatments, **main + accent ink** pickers, **brightness/contrast** and per-treatment dials, **pan/zoom/rotate within the frame**, bleed vs ink-border (bleed default), and a **faded preview of the cropped overflow** while selected.
  - **Arranging** — **multi-select** (shift-click) with an **alignment toolbar** (left/centre/right · top/middle/bottom) and **edge-snapping** to other elements, the spine, and the safe zone while dragging. Delete/Backspace removes the selection. Grid + safe-zone guides render **above** the artwork.
  - **Shared poster atoms:** footer/banner wordmark (the canonical SVG) + meta + **real QR** (encodes `https://realitydn.com`, see `assets/qr/`); striped photo placeholders; `3px` rules.

---

## Implementation notes

- **Tokens first.** Wire `reality-tokens.css` (or `.json`) into each codebase before building components, so Day/Night and accent-swapping come for free. The whole system re-skins from `--fg`/`--bg` + the accent — keep that indirection.
- **Theme switch** = set `data-theme="dark"` on the root, and add `html.theme-settling` for the duration of the flip so every surface, border, shadow and fill crosses together at **700ms**. Posters and scoped blocks can opt into the opposite theme with `.scope-day` / `.scope-night` — and those scopes carry their own accent pair.
- **No radius, ever.** If a codebase's base components round corners by default, override to 0.
- **Borders carry structure**, especially in Day where surfaces are all the same cream. Don't substitute drop shadows-as-cards or tinted fills for the 2px ink border + flat down-shadow.
- **Touch targets ≥ 48px** (`--tap-min`) in the App and sidework app.
- **Respect reduced motion** — ship the end-state, gate entrances on `prefers-reduced-motion: no-preference`.
- **Photography** is dropped in later via the Photo Guidance treatments; build photo containers to host the riso/duotone treatment + the mandatory logo box.

## Assets

- **Fonts:** Google Fonts only (Montserrat, Montserrat Alternates, Space Grotesk) — no local font files.
- **Icons:** vector, defined in `design/icons/icons.jsx` (2px ink strokes). Re-draw against each codebase's icon component, or export to SVG from the Icon Library page.
- **Photos:** none shipped — all striped placeholders. Real photography is client-supplied and runs through the Photo Treatments.
- **QR codes:** **real, verified assets ship** in `assets/qr/` — version 2, 25×25 modules, EC level M, 4-module quiet zone, decodable from 120px, encoding `https://realitydn.com`. The Studio embeds the same module matrix, so exported posters scan. **Never invert** (cream modules on ink) — many phone cameras refuse inverted codes; on night posters place the QR as a cream tile with ink modules.
- **Wordmark:** the mark is **Montserrat with Montserrat Alternates substituted for the A, I and Y only** — the R, E, L and T stay Montserrat. You cannot get this from one `font-family`, so **ship `assets/wordmark/reality-wordmark.svg`**. Never re-typeset it from live text. An earlier spec said "Alternates for the whole word"; that was wrong.
- **Third-party (Poster Studio only):** React 18.3.1, Babel standalone, html-to-image, jsPDF, JSZip (all via CDN in the prototype; use real npm packages in production).

## Files

Everything in `design/` is the reference. The shared backbone is **`reality-ds.css`** (all tokens + base component styles) and **`reality-ds.js`** (theme toggle, accent swap, poster scaling, QR placeholder). Per-area styles: `components.css`, `guidance.css`, `riso.css` + `riso-engine.js`/`riso-app.js` (photo treatments), `motion-doc.css`/`motion-doc.js` (motion), `poster-grid.css` / `poster-app.css` / `poster-taxonomy.css` (poster system), `studio.css` + `studio-*.jsx` (the generator), and `anim/` (Design-System motion demos). `tokens/` is the distilled, framework-agnostic source of truth — start there.


---

## Canon status — 19.08.2026

**The audit is closed.** 41 calls made; 19 landed in the token layer, 1 was cut (paper grain on screen surfaces — it didn't read at 4–6%; the texture survives in the poster engine where it prints at size), and **nothing is open**. The four final calls closed 19.08.26:

| Call | Decided | Effect |
|---|---|---|
| **F1** Day surface ladder | **Two steps off-paper** | No change — `--surface-2` `#f4ecd7` and `--paper-shade` `#ece2c9` stand. Not tints: two shades of unprinted stock. |
| **F2** ACTION button label | **Cream on red** | **4.19:1 — fails AA, accepted knowingly.** See the box below. |
| **F3** Accent pair + never-pair list | **Map canon, list advisory** | `day-colours.json` carries `neverPairEnforcement: "warn"`. The four discouraged combinations warn in a picker but stay authorable. |
| **F4** Tracking ladder | **Baked per role** | The six-number optical ladder is canon (`.015 / .025 / .04 / 0 / .16 / .11em`). No size-derived formula. |

> ### ⚠ The one deliberate AA exception — read before you "fix" it
>
> **`.btn-action` is cream on red at 4.19:1 and fails WCAG AA.** This was decided with the measurement in hand, on the one button that converts, because red reads as a filled ink button at distance in a dark bar. It is recorded in `tokens/reality-tokens.json` under `openCalls` for exactly this reason.
>
> **It does not generalise.** Every other coloured fill in the system takes ink — `.btn-info`, `.btn-notice`, and all seven day-code fills via `--on-day`. Red is the single exception. Anything *else* measuring under 4.5:1 is a bug, not a house style.
>
> Do not silently change it to ink, and do not use it as precedent for cream on any other colour.

### Known drift in the codebases (not decisions — pending sweeps)

These are places the shipped code disagrees with this bundle. This bundle is correct.

1. **Website `src/index.css` is pre-audit.** `--fg-faint` at .45 / .32, `--surface-2` collapsed onto `#fffbf1`, Day shadows at .08 / .12 / .18 with heavy at 12px. Two AA failures live on the public site. It also **never re-declares `--accent` in dark**, so the site's Night still leads blue instead of pink — the theme-aware accent is not implemented there at all.
2. **`www.realitydn.com` on artwork.** D5 made the bare host canon. The string is a literal in `public/print/print-data` (~40 document presets), `print-export`, `public/schedule/schedule-render` (4 places), `public/studio/studio-data` (ticket defaults) and `public/event-report`. The QR README also still asserts the `www.` form as mandatory. The **encoded** target is unaffected — it has always been the apex.
3. **Studios carry weekday hex literals.** All three should import `tokens/day-colours.json` instead. This is the file that makes "never hardcode a weekday hue" enforceable rather than aspirational.
4. **The site still animates the hero misregister** — `cal-echo-a` / `-b` and their `-lg` variants on desynced 9s / 13s loops. C1 retired the drift; the transforms stay as static offsets and the four keyframes come out.
5. **Blue and yellow are under-deployed.** Measured: the four button roles are used 53 / 4 / 2 against 249 structural buttons. Blue should take eyebrows, links and calendar-subscribe; yellow should take deals and notices. About a dozen components, no new colours.
6. **Events schema needs `name` + `qualifier`.** The CSS ships (`.name-block`, `.type-sub`); the data layer and a content pass do not.
7. **The app's ~90 named keyframes live only in app source.** The *sets* are canon (see `guidelines/motion-index.html`); the individual keyframe bodies should be dumped into `reality-ds.css` in one pass.

### Reading order

1. `design/REALITY Design System.html` — the master overview and live controls. **Note:** sections 01 Color, 05 Motion and 07 DNA on that page have not yet been rewritten to this rev; where it disagrees with this README or `tokens/`, **the tokens win**.
2. `guidelines/canon-applied.html` — what every decision changed and which file carries it.
3. `guidelines/accessibility.html` — the numbers you must not undo.
4. `guidelines/typography-merged-system.html` + the type section above — the two-axis type system.
5. The component cards: `buttons`, `calendar-family`, `primitives`, `motion-index`, `wordmark-assets`.
6. `guidelines/decisions-final-four.html` — the open calls, so you don't accidentally resolve one.

### Precedence

When two sources disagree: **`tokens/reality-tokens.json` + `day-colours.json`** beat this README, which beats the `guidelines/` cards, which beat the `design/` HTML pages, which beat any shipped codebase. The design pages are prototypes; the tokens are the contract.
