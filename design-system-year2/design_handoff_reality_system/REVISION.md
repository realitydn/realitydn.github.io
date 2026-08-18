# REALITY Design System — Year 2 · Revision

## Rev 19.08.2026 — the canon reconciliation

The system was diffed against everything shipped: the app (in production since
08.07.26, 1,707 lines of `globals.css`), the website and its three generators
(Poster, Schedule, Print Studio). **37 calls were made.** This rev is the result.

### What changed in the foundations

- **The accent is theme-aware.** Day leads **blue**, Night leads **pink**; each
  theme scope sets its own pair. The app and the site had shipped it inverted and
  both described it as "swappable" while neither overrode it anywhere.
- **Tiers are jobs, not rank.** "Hierarchy" is retired. **Majors carry meaning**
  (named UI jobs), **minors carry mood** (day-code + artwork). No minor takes a
  UI job; the accent is the one exemption. Measured, minors were taking 63% of
  the on-palette colour in the app and 54% on the site — because the day-code
  outweighs everything else, which is now stated as a **separate axis** that
  carries no rank.
- **Three tokens corrected by accessibility audit or measurement:**
  `--fg-faint` (.45→.56 Day, .32→.48 Night — both had failed AA),
  `--surface-2` (was collapsed onto `--bg`, making every inset, day header,
  placeholder and skeleton invisible in Day), and the **Day shadow ladder**
  (.08/.12/.18 → .10/.16/.23, heavy 12→13px — the lighter set washed out on
  cream). `--paper-shade` was shipping in the app and had never been recorded.
- **Print is explicitly exempt** from the shadow correction and keeps
  .08/.12/.18 at 12px. White stock has more headroom and K prints heavier than
  it looks. Recorded as an exemption so it stops reading as drift.
- **Substrate rule.** Screen values are cream-paper *simulations*. On press, ink
  is `#111111`, the sheet is white stock, and cream is never laid down as a
  fill. Both were correct press decisions that looked like mistakes to anyone
  diffing hexes.
- **Misregister is static.** The drifting two-layer loop is retired in favour of
  `.misreg` / `.misreg-hero` at 6/3 and 13/6, with the `isolation: isolate`
  requirement written where it cannot be missed.
- **Theme flip is 700ms**, via `html.theme-settling`. `--dur-settle` (350ms) is
  the *interaction* settle and stops being described as the theme duration.
- **Paper grain is cut** from all screen surfaces — it didn't read at 4–6%. It
  survives in the poster engine, where it prints at size.
- **Type: two axes.** Family by job (**Montserrat names, Grotesk states facts**)
  and case by **register** — a closed list of far and near surfaces, never a
  distance estimate or a size threshold. New classes: `.type-fact`,
  `.type-fact-far`, `.type-sub`, `.type-micro`, `.name-block`. One tracking
  ladder with two offsets (print +.01em, signage +.02em and weight 700).
  **12px is the informational floor.** Long names split at the data layer.
- **Vietnamese rules are in the token layer**: uppercase VI at line-height 1.3,
  display steps to weight 200 under `:lang(vi)`, proper names never normalised.
- **`day-colours.json` is new** and is now the single source for weekday hues,
  the ink **partner map** (seven warm/cool pairs — the token sheet had said the
  second layer "defaults to blue", which was true for two of seven), the
  never-pair list, the per-theme accent pair, the print values and the site
  string. Canvas and PDF renderers import it directly, because they cannot read
  CSS custom properties — which is what made "never hardcode a weekday hue"
  unenforceable before.
- **Site string on artwork is `realitydn.com`** — bare host. The QR still
  encodes the apex, as it always did.
- **The wordmark spec is corrected** and now lives in the system rather than in
  this file: Montserrat with Alternates substituted for the **A, I and Y only**.
  Ship the SVG.

### New cards

`accessibility` (every measured contrast pair, the 12px floor, focus, targets,
reduced motion, and the bilingual typographic rules) · `buttons` (four roles,
one ACTION per screen) · `calendar-family` (the nine `.cal-*` classes) ·
`primitives` (the eight small parts, the view-transition hooks, the isolation
gotcha) · `motion-index` (curves, durations, naming convention, keyframe index) ·
`wordmark-assets` (the mark, the QR spec, the mandatory strings) ·
`canon-applied` (the decision record) · `decisions-final-four` (what's open).

### The final four — closed 19.08.26

- **Day surface ladder → two steps off-paper.** The revert is withdrawn;
  `--surface-2` and `--paper-shade` stand as shipped.
- **ACTION button → cream on red, knowingly.** 4.19:1, fails AA, accepted
  because red reads as a filled ink button at distance. **The system's one
  deliberate AA exception**, recorded in `tokens/reality-tokens.json` under
  `openCalls`. It does not generalise — every other coloured fill takes ink.
- **Partner map canon, never-pair list advisory.** The seven pairs are the
  enforced derivation; the four discouraged combinations warn rather than block
  (`neverPairEnforcement: "warn"`), keeping a deliberate near-tonal overprint
  available at poster scale.
- **Tracking ladder baked per role.** The six-number optical ladder is
  ratified; print +.01em and signage +.02em ride on top. No formula.

**There are no open questions left in this system.**

### Pending code sweeps

The website token patch, the `www.` → bare-host sweep (wider than first
recorded: `print-data`, `print-export`, `schedule-render`, `studio-data`,
`event-report`, plus the QR README), pointing the three studios at
`day-colours.json`, removing the site's drifting `cal-echo-*` keyframes, the
blue/yellow deployment pass, and the events `name` + `qualifier` field.

---

## Rev June 2026 — the studio era

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
1:1 / 9:16 / A4 with per-format layout overrides; `ALL` exports a zip. (5:7 and the
FB cover were since dropped — 4:5 serves FB events. A1, the 60×120…80×200 standee
family and A5/A6 handouts are on-demand print views, never in the bundle.)

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

1. ~~**Major-color hierarchy.**~~ **Superseded 18.08.26.** This read "lead with
   the three majors; the minors play second fiddle", with `--accent` as a
   free-floating default. Replaced by **majors carry meaning, minors carry
   mood**: each major owns named UI jobs, no minor takes a UI job, the day-code
   is a separate axis carrying no rank, and `--accent` is theme-aware (Day blue,
   Night pink) rather than a default anyone may swap.
2. **Full-bleed photography is the house default** for posters; text goes cream
   over the image, with a clean surface block when an image is busy.
3. **Talk/serious events get a bottom Reality banner** — a full-width wordmark
   band that fills the base. It reads bookish and editorial.
4. **Swiss / International alignment is core DNA** — boxes of different sizes
   share a vertical line. The Studio's multi-select align + edge-snapping exist
   to make this effortless; templates seed it (shared left line at x≈90).
5. **Day↔Night should _settle_, not snap.** When flipping the theme, transition
   every surface/border/shadow/fill together for the duration of the flip, then
   return to snappy interaction timings. Default to the visitor's OS setting
   until they choose explicitly. **Ratified 18.08.26 at 700ms** via
   `html.theme-settling` — `--dur-settle` (350ms) is the interaction settle and
   was never the theme duration, despite what the old Surfaces card said.
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
