# The Riso Press — build plan

Rev 1, 21.09.26. Written to be executed by a session that was not present for
the design conversation. Everything it needs is in this directory or named by
path below; nothing depends on chat history.

---

## Rev 2 — built, 22.09.26. What changed from the plan, and where things are

Executed in one pass across Poster Studio, Print Studio and the app's
Darkroom. The plan below is kept as written; this section is what was done
differently and why, and is the part to read first now.

**One core, not three engines.** The plan ported the prototype into
`riso-engine.js` (Phase 1) and then again into `riso-photo.ts` (Phase 5),
and left Print Studio's June fork alone. Instead the physics — separation,
screening, tone transfer, the press, the run — is ONE pure file,
`public/studio-shared/riso-press.js` (pixels in, pixels out, no canvas, no
DOM, UMD). `riso-engine.js` moved next to it and is the canvas engine over
it; Poster and Print load the same two files and Print's white paper is the
`white` stock. The app vendors the core verbatim as
`src/lib/vendor/riso-press.cjs` (`npm run sync:riso`; the prebuild fails on
drift; `.cjs` because that package is `"type":"module"`). Worker-safety fell
out of this: the core never touches a canvas, so the plan's `makeCanvas`
note applies only to the hosts, which already had it.

**Two faults in the prototype, fixed in the core.** (1) The GCR term had the
wrong sign — `+ λ·a` in the coordinate step rewards ink; it is `− λ·a`.
(2) The solver separated in Beer-Lambert density (T^a) but the press stacked
plates by area coverage ((1−a)+a·T). Those disagree hard at low coverage —
14 % black is a mid grey in one model and a pale tint in the other — so every
tone printed light and the 1.45 chroma boost was compensating. The solver
now inverts exactly the model the press applies (Gauss-Newton on the log of
the product form; the opaque path is affine per plate), a 50 % grey lands at
L\* 56, black through cream+black+pink reaches L\* 4, and `sepBoost` is 1.15.
The measured L\* table in §1 is therefore superseded by the core's own
comment block.

**WYSIWYG on the grain.** The prototype's stochastic screen hashed every
device pixel, so an export printed finer grain than the preview. The core
thresholds against an embedded 64×64 blue-noise tile (void-and-cluster —
interleaved-gradient noise streaks diagonally at grain scale) sampled on a
design-resolution grid, `grainPitch` design px per cell.

**Night resolves in the defaults, not in a look.** `stock:null` is cream on
either theme; `inks:null` is accent + partner on day and black + accent +
partner on night; `sepGCR`/`tac` null = 0.2 / 2.2 on day, 0.12 / 2.8 on
night. So "follow poster accent" keeps working and the plan's Night look is
what the default already does.

**Phase 3, the retrofit, is one mechanism plus four hand rebuilds.** Every
treatment still decides WHAT prints; then `pressThrough()` in
`riso-engine.js` separates the finished picture back into plates for the
inks that treatment used (the black drum among them) and presses it FLAT —
no second screen — so the press curve, the registration miss, the drum, the
run, the proof view and the pull index apply to all fourteen through one
seam, and Print Studio inherits them. Four were rebuilt by hand as the plan
asked: halftone's basic dots are the press's per-pixel chain dot and its
`two` mode is a real two-ink separation; off-register and overprint stack
transmittances with real registration (and an opt-in `sep` flag); the
copier got the xerography. Drum order matters now that wet-on-wet exists —
the main ink prints first on translucent stock and last on an opaque one —
and that is what keeps off-register's blue-with-pink-fringe signature.

**Option D on the fourteen.** On a night poster every press treatment
prints on cream with day polarity; the black drum is in the plate set, and
the treatments whose print does not already carry the shadows in ink (the
screens, the hatch, the line treatments, the two-colour misprints) get the
photograph's shadows printed under them in black — `nightPlate`, a dial.
The duotone's night ramp is black → accent → cream. The opaque path is the
`Screenprint` look (`stock:'night'`).

**Where things are.**
- `harness-diff.cjs` — the zero-pixel gate (232 renders, old = a git ref).
  `harness-compare.cjs --all-looks` — old-vs-new contact sheets, under
  `shots/` (gitignored). Both load the shared files from either side.
- `tokens/stocks.json` — the stock canon; `tools/verify-day-colours.mjs` §8
  guards the core's PAL / PAPER / INK / PARTNER tables and refuses a
  reappearing engine fork under `public/studio/` or `public/print/`.
- Poster Studio: `TREATS` (Press first), `TREAT_PRESETS.separation`,
  `TREAT_LOOKS.separation`, `SepControls` / `SepPressFold` / `SepProofFold`
  in `studio-app.jsx`; `OPT_KEYS` carries every dial; `engineRev` is stamped
  on every save by `stampEngine()`.
- Print Studio: `PressControls` in `print-app.jsx`; `risoOpts` passes
  `stock:'white'` and the press dials.
- App: `docs/VIDEO_DARKROOM_PLAN.md` §13; `verify:riso-press --render` is
  the gate (27 checks); the seven game treatments are pinned by
  `verify:riso` and deliberately not retrofitted there.

**Not done, on purpose.** Schedule Studio has no photograph and no engine;
its cover "halftone" is a CSS dot field. The only thing it shares with the
press is the stock table, and its `paper` theme is a cover palette, not a
sheet — left alone. Print Studio's vector separations (one greyscale PDF
page per drum) are still a different output path; the proof view
(`proofPlate` + `proofGrey`) is the same plate, on screen.

**What this is.** Poster Studio's riso engine currently *tints* a photograph:
all fourteen treatments start at `lumBuffer()` — one greyscale channel — and map
it onto colour. A risograph *separates* one: a colour image becomes N greyscale
plates, one per drum, each screened at its own angle, each printed in its own
translucent ink, in its own pass, with its own registration error. This plan
replaces the tinting model with the separation model, makes it the default, and
retrofits the parts that are generic back into the existing treatments.

**Decisions already taken by Donald — do not re-open these.**

| | |
|---|---|
| Separation is the **default** treatment for photos | not an option alongside Duotone |
| **Retrofit the existing fourteen.** Fidelity to already-printed posters is explicitly *not* a requirement | old posters get re-rendered and that is fine |
| Night = **riso on cream with a black plate** (option D) | the opaque/screenprint path stays as a selectable option, not the default |
| **Cream and black are pickable plates** | nine inks, not seven |
| **More stocks** — the eight below, extensible | |
| **The pull number ships**, and the poster stores it | |
| **Store engine-version metadata** on the doc | cheap now, impossible retroactively |

---

## 0 · Read these first

**In this directory**

| File | What it is |
|---|---|
| `prototype-separation.js` | The working separation engine. Exposes `window.LAB.render(cv, opts)`. **This is the reference implementation** — Phase 1 is largely porting it into `riso-engine.js`. Every physical constant in it is sourced and deliberate; read its comments before changing a number. |
| `prototype-retrofit.js` | Four existing treatments (halftone, off-register, overprint, photocopy) with the new parts swapped in. Exposes `window.RETRO.render(cv, name, opts)`. **This is the reference for Phase 3.** |
| `harness-sheet.cjs` | Renders a labelled contact sheet from a JSON job. `node harness-sheet.cjs job.json` |
| `harness-tiles.cjs` | Same but one PNG per shot. |
| `harness-bench.cjs` | Per-frame timings at video resolutions. |

All three harnesses need `puppeteer` (already a devDependency of this repo) and
run from this directory. See §8 for job-file shape.

**In the repo**

- `public/studio/riso-engine.js` — the engine. One IIFE, `window.RISO`.
  Treatments are registered in the `TREATMENTS` map (~line 891); defaults live
  in `RENDER_DEFAULTS` (~line 1329); `render()` is the entry point.
- `public/studio/studio-element.jsx` — `OPT_KEYS` (line 106) is the allow-list
  of element fields forwarded to the engine. **A new option that is not in
  `OPT_KEYS` silently does nothing.** `drawPhotoPress()` (line 169) is the one
  place the engine's globals are set.
- `public/studio/studio-app.jsx` — `TREATS` (line 331), `TREAT_PRESETS` (426),
  `TREAT_LOOKS` (454), the inspector folds (`<Fold id="ph-…">`, from line 831).
- `public/studio/studio-data.jsx` — `INK_CHOICES` (line 17) already equals
  `ACCENTS.concat(['ink','cream'])`, so the nine plates exist in the data layer
  already.
- `public/tokens/day-colours.json` — the partner map and the never-pair
  advisory. Canon; renderers read it directly.

**Build note.** The Studios are classic scripts, not modules. `.jsx` is the
source of truth; `scripts/build-studios.mjs` transpiles each to a sibling `.js`
at build time, and `tools/serve-studio.cjs` does the same on the fly locally.
Edit `.jsx` only. Run `npm run dev`-style preview via the `poster-studio` entry
in `.claude/launch.json` (port 4503 is Print; Poster is 4501).

---

## 1 · The physics, in one page

Do not skip this. Several of the numbers look arbitrary and are not, and a
couple of them were got wrong once already.

**An ink is a translucent film.** At full coverage it passes a fraction of the
light reaching the paper — its *transmittance*, one number per channel, which is
just its hex value over 255. Stacked inks multiply transmittances. That is why
pink over blue goes navy and pink over yellow goes red.

**Density is linear in coverage** (Beer-Lambert), where density = −ln
transmittance. So "what mix of these inks on this paper makes this colour" is a
least-squares problem in three equations and N unknowns, solved by clamped
coordinate descent. An L2 term acts as GCR: of two mixes that hit the same
colour it takes the one laying down less ink.

**Dark stock inverts the problem.** A translucent ink cannot print light on
black. Only an opaque one can, which is a silkscreen. So on dark stock the
matrix changes, not the solver: coverage becomes how much of the pixel each ink
*covers*, the mix is linear in RGB against the stock, and Σa ≤ 1.

**Screen angles are ordered by ink brightness, not by the offset convention.**
45° is the angle the eye notices least, so it goes to the ink carrying the most
contrast; 0° — the worst — goes to the one nobody can see. Darkest gets 45, then
75, 15, 0.

**Dot gain is enormous and defines the look.** ISO 12647-3: a 50 % dot prints at
76 % on newsprint, and riso is at least newsprint-class. The TVI table is in
`prototype-separation.js`. A RIP compensates by pulling the plate down by
exactly what the press adds back (`gainInverse`), so **simulate the gain and
compensate the plate** — skip the compensation and you count it twice, which is
what an uncompensated riso file looks like off the machine. Keep it a switch.

**Three separate ceilings. Do not fuse them** — fusing them was a real bug that
made it impossible for anything to print dark:

- `ceiling` ≈ 0.98 — what the *plate* can carry. A master is a sheet of holes
  and the last few per cent close up.
- `solidity` ≈ 0.97 — how completely ink covers where it lands. The few per cent
  of stock showing through is where a riso flat gets its life.
- `floodCap` — **off by default.** The 75–85 % studios quote is *design advice
  about large flood areas* sticking to the drum. It is a rule for the artwork,
  not a property of the press.

**Tone floor 0.10, hard clip.** Below ~10 % the master has no hole at all, so
light tone does not fade out — it stops.

**Measured, for reference.** Darkest printable through each path (L\*):
cream + black 10.8 · cream + black + pink 6.5 · cream + black + pink + blue
**4.7** · kraft + black + pink 7.7 · black stock opaque 2.0. REALITY's Night
surface `#0a0703` is L\* 2.0. Real Riso Black ink measures L\* 15–25, so the
model runs about a stop dark at the extreme — treat these as the optimistic end.

---

## 2 · Phase 1 — the separation core

**File:** `public/studio/riso-engine.js`. Additive; nothing existing changes yet.

Port from `prototype-separation.js`, keeping its structure and its comments.
Everything below already exists there and works.

1. **Stocks.** Extend the `PAPER` map from `{day, night}` to the eight in the
   prototype: `day #fffbf1`, `night #0a0703`, `kraft #d8c3a0`, `news #e8e2d2`,
   `grey #b9b4ac`, `straw #e9dcae`, `flint #9c9a90`, `salmon #e8b9a0`,
   `steel #5d6a73`. Keep `day`/`night` as the keys the theme maps to.
2. **Ink physics** — `inkTrans()`, `inkDensity()`, `EPS = 0.02`.
3. **The separation** — `solveClamped()`, `sepLUT()` (24³ cube, cached per ink
   set + paper + params), and the per-pixel trilinear fetch.
4. **Screening** — the tabled cosine (`COS_T`, 512 samples), the chain/Euclidean
   spot plus line/square/diamond, and `ign()` for the stochastic screen.
5. **Tone transfer** — `TVI`, `dotGain()`, `gainInverse()`.
6. **Angles** — `RISO_ANGLES = [45, 75, 15, 0, 30]`, assigned by ink luminance
   ascending.
7. **The press** — per-plate registration (`dx`, `dy`, `rot`, `skew`, and
   `sy` elongation along the feed axis *only*), dual-drum slop, drum banding,
   axial streaks, ink starvation, wet-on-wet transfer.
8. **The run model** — `pull` drives ink-up, widening miss, master wear and
   accumulating track marks. `pull: 0` = the idealised print; `run: false`
   disables the shape and reseeds only.
9. **Split fountain**, per-plate screen/pitch overrides, `only`/`plateGrey` for
   the proof view, `invertSource`.
10. **Register** `separation` in `TREATMENTS`.

**Worker-safety, do it now not later.** Replace `document.createElement('canvas')`
in the ported code with a `makeCanvas(w, h)` helper that returns an
`OffscreenCanvas` when `document` is undefined. Phase 5 depends on this and it
is free to do up front. (`REALITYApp/src/lib/riso-photo.ts` already has exactly
this helper — mirror its shape.)

**Defaults** (add to `RENDER_DEFAULTS`):

```
inks:['pink','blue'], stock:null, screen:'fm', shape:'chain', pitch:9,
gain:0.8, linear:true, solidity:0.97, ceiling:0.98, floor:0.10, floodCap:0,
levels:0, sepGCR:0.2, sepBoost:1.45, tac:2.2, opaque:null,
drift:0, skew:0, stretch:0, duo:true, band:0, bandPeriod:90, streak:0,
starve:0, wet:0.25, pull:0, run:true, invertSource:false,
fountain:null, screens:null, pitches:null, only:null, plateGrey:false
```

**Gate.** Render the existing fourteen treatments before and after the edit and
diff the `ImageData`. **Zero differing pixels**, or something non-additive got
touched. `harness-tiles.cjs` renders both sides; compare with a pixel diff.

---

## 3 · Phase 2 — Poster Studio UI

**Files:** `studio-element.jsx`, `studio-app.jsx`.

1. **`OPT_KEYS`** (`studio-element.jsx:106`) — append every new option name from
   §2. This is the single most likely thing to be forgotten; a missing key fails
   silently by falling back to the default.
2. **`TREATS`** (`studio-app.jsx:331`) — add `separation` **first in the array**,
   since it becomes the default. Follow the existing shape: `{v, l, tag, best,
   avoid}`. Suggested copy:
   - `tag`: `'real separation · the press'`
   - `best`: `'Anything. This is what the machine does — start here and reach for the others when you want a specific effect.'`
   - `avoid`: `'You want one flat graphic move rather than a photograph.'`
3. **`TREAT_PRESETS`** — a `separation` entry carrying the defaults above.
4. **`TREAT_LOOKS`** — named looks. Suggested set:
   - *Grain* — `{screen:'fm', inks:['pink','blue'], drift:3, skew:5, stretch:7, starve:0.2}`
   - *Four colour* — `{inks:['ink','pink','blue','yellow'], tac:2.2, sepGCR:0.2}`
   - *Screen 43* — `{screen:'am', pitch:13, levels:195}`
   - *Screen 71* — `{screen:'am', pitch:8, levels:72}`
   - *Night* — `{inks:['ink','pink','blue'], stock:'day', tac:2.8, sepGCR:0.12}`
   - *On kraft* — `{stock:'kraft', inks:['ink','pink']}`
   - *Mis-fed* — `{drift:8, skew:9, stretch:12, starve:0.35, streak:0.3}`
5. **The inspector.** Add a `<Fold id="ph-sep">` inside the existing treatment
   panel, only when `el.treatment === 'separation'`. Per the house pattern the
   panel is capability-driven — extend `TYPE_CAPS` rather than scattering
   `treatment === 'separation'` branches. Controls:
   - **Inks** — an ordered multi-pick of 2–4 from `AP_INKS` (which already
     includes `ink` and `cream`). Order matters: it is drum order. Warn past 3
     (studios cap at 2–4 passes) and honour the never-pair advisory in
     `tokens/day-colours.json` as a warning, never a block.
   - **Stock** — a picker over the `PAPER` keys, defaulting to the theme.
   - **Screen** — `Grain / 43 / 71 / 106` as chips, plus shape when not Grain.
   - **Separation** — GCR, chroma boost, ink limit.
   - **Press** — a nested fold: drift, skew, stretch, streaks, band, starve,
     wet, and the pull number.
   - **Proof** — a toggle that renders one plate at a time (`only`, `plateGrey`).
6. **Default for new photo elements** — `studio-app.jsx:27`, change
   `treatment:'duotone'` to `treatment:'separation'`.

**Gate.** Open Poster Studio, drop a photo, confirm the strip renders all
fifteen treatments and that every control in the new fold moves the render.

---

## 4 · Phase 3 — retrofit the fourteen

**Reference:** `prototype-retrofit.js`. Its four treatments are drop-in
demonstrations of each change.

The generic parts and where they go:

| Part | Into |
|---|---|
| Press curve (`press()`: floor, ceiling, gain, linearise, solidity) | halftone, dither, hatch, contour, edges, posterize, mosaic, cutout, overprint, off-register |
| Chain dot (per-pixel spot function) | halftone — **replaces `drawDot`'s per-cell `arc()`/`fillRect()` loops** (riso-engine.js ~line 205). Faster, antialiased, links at 50 %, any angle costs the same. Also makes dither's `cluster` mode rotatable, which it cannot be today. |
| Transmittance stacking | off-register, overprint, halftone `two`, spot's second band — everywhere two inks currently meet through canvas `multiply` |
| Registration model | off-register, overprint, the finish stack's `misprint`, and the `cutSlip` / `contourSlip` / `edgeSlip` controls |
| Riso angles | halftone, hatch |
| Two-ink separation | halftone `two` (**do this — it is the worst-looking mode in the engine**), off-register and overprint as an opt-in `sep` flag, duotone on day stock as a true two-ink ramp alongside the current black-plate behaviour |
| Pull index | **all fourteen** — the engine already seeds every random through `mulberry32` with fixed constants (grain, dust, `bandJitter`, `mosaicJitter`, `fieldTexture`, photocopy streaks). Add `+ pull * K` to each seed. One line per call site. |
| Xerography physics | `photocopy` — self-contained, depends on none of the above. Edge enhancement from fringe fields, hollow solids (big blacks develop grey-centred with a hard rim), satellite scatter, drum banding at a fixed period. See `prototype-retrofit.js`. |

**Then re-tune.** Every `TREAT_PRESETS` entry and every `TREAT_LOOKS` patch was
tuned against linear behaviour. A real press curve shifts all of them — mostly
lighter, since the floor and ceiling take the extremes off. In the prototype the
retrofitted off-register needed contrast 1.55 to land where the old one landed
at 1.25. Work through them treatment by treatment with the harness, rendering
the named looks side by side old-vs-new and matching intent, not numbers.

**No fidelity gate on this phase.** Donald has explicitly accepted that saved
posters re-render differently.

---

## 5 · Phase 4 — night, stock, metadata

1. **Night.** The Night theme's photo path becomes option D: riso on cream with
   a black plate — `inks:['ink', …]`, `stock:'day'`, translucent physics. This
   reaches L\* 4.7 in the shadows, which is the Night surface. Note the
   difference that remains and is correct: darkness now tracks the darkness of
   the *subject*, where the Night theme previously made it a property of the
   page. Expect to re-shoot some posters; that is the accepted trade.
2. **Keep the opaque path** selectable (`opaque: true` + a dark stock) as a
   named look, not the default.
3. **Metadata on the doc.** Add, and make the store round-trip them:
   - `engineRev` — an integer bumped whenever the engine's output changes.
     Stamped on save. Nothing reads it yet; it exists so a future reprint can
     tell which press made a poster.
   - `pull` — per photo element, already in `OPT_KEYS` from §3.
   Both are additive; absent means "before this shipped", which renders as today.

---

## 6 · Phase 5 — the app (REALITYApp)

**Different repo:** `C:\Users\donal\Documents\Claude\Projects\REALITYApp`.
Read `docs/VIDEO_DARKROOM_PLAN.md` first — the video bench is built and
shipping, and this phase adds to it rather than designing it.

1. **Port the separation into `src/lib/riso-photo.ts`.** `makeCanvas()` (line
   ~959) and `srcSize()` (~987) already exist for exactly this. The engine's
   byte-identical regression harness is already the gate.
2. **No temporal lock needed.** The plan's hardest-won fix is `lockedRange`,
   because `stretch()` normalises to each frame's own min/max and the picture
   breathes. **The separation never calls `stretch()`** — it maps absolute RGB
   through a cube built once per ink set, so frames agree by construction. Do
   not add a lock; do not wire `lockedRange` into it.
3. **Pull becomes a three-way on clips**: `held` (default — one printed sheet,
   filmed), `advancing` (a new sheet every frame; reads as animation shot off a
   stack of prints), `slow` (one sheet per second or so).
4. **Press artifacts go in the `full` slot**, not `draft`. The worker protocol
   (`src/lib/riso-worker-protocol.ts`) already distinguishes them. Playback then
   stays real-time and the press appears when the playhead stops and on export.
5. **Grain is close to mandatory on video.** An AM screen beats against
   compression macroblocks and fine moving detail, and the moiré crawls. Flag
   the dot screens as a deliberate choice.

**Measured cost** (headless, software raster — pessimistic):

| Per frame | 640×360 | 1080×1080 | 1920×1080 |
|---|---|---|---|
| Separation · 2 ink grain | 22 ms | 104 ms | 186 ms |
| Separation · 2 ink + full press | 46 ms | 146 ms | 357 ms |
| Separation · 3 ink grain | 56 ms | 268 ms | 488 ms |
| Separation · 4 ink screen 71 | 50 ms | 238 ms | 431 ms |
| *Engine · overprint (today's dearest)* | *13 ms* | *59 ms* | *162 ms* |

2–4× the dearest existing treatment. Eight lanes at 1080² gives 30–77 fps of
throughput, so a 15 s clip treats in 6–15 s. Preview at 640×360 is genuinely
real-time for 2-ink grain (45 fps); the full press halves it, which is why it
belongs in `full`.

---

## 7 · Order, and what to skip

Phases are in dependency order. 1 → 2 gives a working default; 3 is the long
one; 4 is small; 5 is a different repo and can run in parallel with 3.

**Explicitly out of scope:**

- ICC / spectral colour. The density model is accurate enough and the cube
  builds in 7 ms. A real profile needs a physical press to measure.
- Letterpress / offset / newsprint modes. Different product.
- Print Studio (`public/print/`). Vector-first CMYK; separations there need a
  different output path. Later, if at all.

---

## 8 · Using the harnesses

Job file shape for `harness-sheet.cjs` / `harness-tiles.cjs`:

```json
{
  "out": "shots/compare.png",
  "outDir": "tiles",
  "photo": "public/images/gallery/c.jpg",
  "tile": { "w": 330, "h": 420 },
  "cols": 4,
  "extras": ["/abs/path/to/prototype-separation.js"],
  "shots": [
    { "label": "engine", "treatment": "halftone", "opts": { "ink": "pink" } },
    { "label": "lab",    "treatment": "lab",      "opts": { "inks": ["pink","blue"] } },
    { "label": "retro",  "treatment": "retro:halftone", "opts": { "ink": "pink" } }
  ]
}
```

`treatment` dispatches three ways: a bare name goes to `window.RISO`, `"lab"`
goes to `window.LAB` (the separation prototype), and `"retro:<name>"` goes to
`window.RETRO` (the retrofit prototype). Load whichever prototypes a job needs
via `extras`.

Good test photos in `public/images/gallery/`: `c.jpg` (faces, party — the
hardest test), `g.jpg` (crowd, coloured light), `b.jpg` (bar interior, strong
tonal structure), `a.jpg` (the building at night), `h.jpg` (dark room).

---

## 9 · Sources

[Exploriso](https://en.exploriso.info/) — screen width, angles, colour order ·
[stencil.wiki](https://stencil.wiki/) — ink database with CIELab, machine
calibration · [RISOTTO advanced setup](https://risottostudio.com/pages/advanced-print-setup) ·
[ECUAD, five ways to separate a 2-ink riso poster](https://palette.ecuad.ca/comdtech/2025/10/01/five-ways-to-separate-a-poster-design-for-a-2-ink-riso-print/) ·
ISO 12647-3 via WAN-IFRA (dot gain curve, newsprint gamut) ·
[Spectrolite](https://spectrolite.app/) — the closest existing tool; does
separation and halftone, no press simulation.
