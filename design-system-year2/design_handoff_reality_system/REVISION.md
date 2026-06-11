# REALITY Design System — Year 2 · Revision (June 2026)

This bundle was updated from production use: building **realitydn.com** on the
Year-2 tokens and hardening the **Poster Studio** into a daily tool. Nothing in
the locked foundations changed (palette, type, spacing, shadow, motion curves
are all the same). What changed is the **poster generator**, the **wordmark**,
the **QR**, and a few **conventions** worth carrying into the next project.

---

## New / updated assets

- **`assets/wordmark/reality-wordmark.svg`** — the canonical wordmark as vector
  (see "Wordmark" below). Posters and the site now use this, not live-font text.
- **`assets/qr/`** — real, scannable QR codes for `https://realitydn.com` (PNG at
  print res, SVG, the module matrix, and the generator). The Studio embeds the
  same matrix, so exported posters scan.
- **`design/studio-*.jsx` + `riso-engine.js`** — the upgraded Poster Studio (the
  HTML loader is unchanged; only the source it loads grew).

---

## Wordmark — corrected canon

The REALITY wordmark is **Montserrat**, with the **Montserrat Alternates** forms
substituted for the **A, I and Y only** (the R, E, L, T stay Montserrat).
Semi-Bold, all caps, tracked **0.1em**. (The earlier spec said "Montserrat
Alternates" for the whole word — that was wrong.)

**Ship the supplied SVG.** You can't get this mixed-font mark from one CSS
`font-family`, so the letterforms are baked into the vector. Don't re-typeset it.
The favicon is the "R" of that same vector.

---

## Poster Studio — what it does now

Authors at a **4:5 (1080×1350) master** (the primary feed format) and reflows to
5:7 / 1:1 / 9:16 / A4 with per-format layout overrides; `ALL` exports a zip.

- **Templates** (collapsible menu): 11 starting layouts — 5 single-talk, 3
  series, 3 nightlife. Each opens **full-bleed photo**; Talk/Series end with a
  **full-width REALITY banner** filling the bottom.
- **Parts:** Title · Tagline · When chip · **Host** (Standard/Compact in panel) ·
  **REALITY ticket** (one part; **Banner / Standard / Slim / Mini** in panel,
  renders the canonical wordmark SVG) · Lineup · Specials · QR · Stamp · Badge ·
  Photo.
- **Per element:** surface · **Ink / Cream / accent colour** (force text colour
  for legibility over a photo) · snapped font size · **letter-spacing** · weight ·
  align · orientation · tilt/rotation · width/height.
- **Photo:** six riso treatments · **main + accent ink** · **brightness** +
  contrast + per-treatment dials · **pan / zoom / rotate within the frame** ·
  bleed (default) vs ink-border · **faded preview of the cropped overflow** while
  selected.
- **Arranging:** **multi-select** (shift-click) → **alignment toolbar**
  (left/centre/right · top/middle/bottom) · **edge-snapping** to other elements,
  the spine and the safe zone while dragging · Delete/Backspace removes the
  selection · grid + safe-zone guides render **above** the artwork.

It's self-contained: open `design/REALITY Poster Studio.html` over **http** (not
`file://` — Babel fetches the `.jsx`). To productionise, bundle the deps (React,
Babel→build-time, html-to-image, jsPDF, JSZip) instead of the CDN prototype.

---

## Conventions learned (carry these forward)

1. **Major-color hierarchy.** On surfaces, lead with the three **majors —
   blue / yellow / red**; the minors (pink, amber, green, purple) play second
   fiddle. (Per-context accents still swap freely; `--accent` is just a default.)
2. **Full-bleed photography is the house default** for posters; text goes cream
   over the image, with a clean surface block when an image is busy.
3. **Talk/serious events get a bottom Reality banner** — a full-width wordmark
   band that fills the base. It reads bookish and editorial.
4. **Swiss / International alignment is core DNA** — boxes of different sizes
   share a vertical line. The Studio's multi-select align + edge-snapping exist
   to make this effortless; templates seed it (shared left line at x≈90).
5. **Day↔Night should _settle_, not snap.** When flipping the theme, transition
   every surface/border/shadow/fill together (~700ms) for the duration of the
   flip, then return to snappy interaction timings. Default to the visitor's OS
   setting until they choose explicitly.
6. **Motion = stamp, then settle.** Entrances drop in slightly oversized/tilted
   and land (the library's stampIn), or lay down staggered (chip-pop/riseIn).
   Arm scroll reveals just _before_ a block enters so visible content never
   blinks; always ship the end-state for prerender + reduced-motion.

---

## SEO / discovery notes (from the website build)

If the target is a public site: prerender routes (crawlers need real HTML),
ship `LocalBusiness` + `Menu` + `FAQ` JSON-LD, an `llms.txt`, and explicit
AI-crawler allowances in `robots.txt`. Capture the **Day** theme in the static
HTML (force `prefers-color-scheme: light` in the headless renderer) so a
machine reporting dark mode doesn't bake Night into the shipped markup.
