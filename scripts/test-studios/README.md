# Studio test suites — the refactor safety net

Phase 0 of `docs/REFACTOR-PLAN.md`. Three suites that pin what the studios do
*today*, so the refactor can move every file and prove nothing changed.

```
npm run test:studios                 # everything (~2½ min)
npm run test:studios -- --only engine    # one suite: engine | smoke | exports (comma-separate for more)
npm run test:studios -- --grep halftone  # only cases whose name matches
npm run test:studios:update          # re-render goldens that moved (see below — look first)
npm run test:studios:ci              # engine + smoke, what CI runs
```

Other flags: `-v` prints every case with its match stats; `--loose` uses the
cross-platform tolerance even on the machine the goldens were made on;
`--record-fonts` fills the font cache from Google (the only network access
any suite ever makes).

Needs nothing new installed: puppeteer (already a devDependency), node's own
zlib for PNGs. The **exports** suite also needs Python with PyMuPDF and
OpenCV (`pip install pymupdf opencv-python`).

Ports: 4600 (engine harness), 4601 Poster, 4602 Schedule, 4603 Print — away
from the launchers' 4501-4503, so a studio you have open is never disturbed.
A run fails fast if one of those ports is taken.

## What each suite covers

### engine — `engine.mjs` (~12 s)

The riso press alone: `riso-press.js` + `riso-engine.js` in a blank harness
page (`harness/engine.html`), rendering the committed test photo
(`tests/fixtures/photo.jpg`, gallery `g.jpg` at 260×325) through

- every treatment (`RISO.TREATMENTS`) × day/night × pink/blue, at the
  treatment's `TREAT_PRESETS` baseline — 60 cases;
- every `FINISH_LOOKS` entry over separation (night) and duotone (day) — 10;
- eleven dial combinations the presets never reach: a mis-fed press
  (drift/skew/stretch/starve/pull), four colour, screen 43, kraft stock,
  proof plate 1, halftone two-ink and gradient, off-register ghost and
  separated, a multiply blend, typed blur.

`TREAT_PRESETS`, `FINISH_LOOKS`, `FINISH_NEUTRAL` and `TREAT_LOOKS` are read
out of the Poster Studio's own source (`lib/extract.mjs` finds the
`const NAME = …` wherever it lives under `public/studio/`), so the goldens
test what ships. If one is renamed the suite says so.

Before comparing, it renders the first case twice and fails if the two
differ — an unseeded random in the engine would make every golden noise.

### smoke — `smoke.mjs` (~25 s)

Each studio served by its own launcher (`tools/serve-*.cjs`, `PORT` env), at
1280, 1440 and 1920 wide:

- no page errors and no console errors, except the ones the offline network
  block causes (the feed, cloud sign-in, favicon);
- every control in the top bar (`.rs-top` / `.ps-top` / `.ss-top` — buttons,
  selects, inputs, swatches, anything `cursor:pointer`) hit-tests:
  `elementFromPoint` at its centre lands on it, and the centre is on screen;
- at 1440, the key panels: **Poster** — select the starter's photo, wait
  for all 15 treatment-strip tiles to paint, open *The press* and *Proof*;
  **Print** — render `ImageControls` (a window global — one of the test hooks
  `public/print/main.jsx` assigns) for every treatment and check the separation panel
  has its press + proof sections; **Schedule** (`?seed=stress`) — preview
  every output channel.

### exports — `exports.mjs` (~2 min, local only)

Through the real UI and the real export code, with the download caught at
the `<a download>` click:

- **Poster** — every built-in starter (19): click its card, switch to 4:5,
  press *Save Images*. The app's own export path runs (exporting flag,
  settle, html-to-image); only the capture's `pixelRatio` is pinned to 1.
- **Print** — every built-in template (19): click its card, press *Save PDF*.
  The real pdf-lib file is rasterised (page 1, 100 dpi, PyMuPDF) and **every
  QR code on it is decoded with OpenCV** and checked against the payload the
  template asked for (a `qr` part's `data`, or a part with `showQR`'s
  `qrData`). A QR that stops scanning fails even if the pixels are "close".
- **Schedule** — the `?seed=stress` week, *Export → Everything*: every feed,
  story, WhatsApp, daily story and FB cover PNG, the print PDF (rasterised),
  and the CSV (compared as text).

Poster and Schedule PNGs are compared at half size (2×2 box average) to keep
the goldens small; the engine suite already pins the press pixel for pixel.

## Determinism — how the runs are made repeatable

- **Randomness:** `Math.random` is a seeded mulberry32 in every page
  (`evaluateOnNewDocument`). The Poster's stand-in photos are drawn once per
  kind and cached, so the exports suite draws all three up front in a fixed
  order — a template's photo can't depend on which templates ran before it.
- **Clock:** `Date` starts at 2026-06-08 10:00 +07:00 (Monday of the stress
  week) and advances with real time; the page timezone is `Asia/Ho_Chi_Minh`,
  the locale `en-US`.
- **Network:** everything off-box is blocked by request interception. Google
  Fonts are answered from `tests/fixtures/fonts/` (the exact CSS + woff2 the
  studios ask for, every subset — html-to-image embeds all of them); a miss
  fails the suite and names the URL. Re-record with `--record-fonts` if a
  studio's font link changes.
- **Pixels:** Chrome runs with `--force-color-profile=srgb`,
  `--disable-lcd-text`, `--font-render-hinting=none`,
  `--disable-skia-runtime-opts` and no GPU. Goldens are written by our own PNG
  encoder (`lib/png.mjs`), so the bytes don't change with the Chrome build.

## Tolerance

Each golden folder records the OS + Chrome build it was rendered on
(`tests/golden/<suite>/_platform.json`).

- **Same platform:** the match must be **exact**. A single moved pixel fails.
  Repeated local runs have been bit-identical (max Δ0) for every case.
- **Anywhere else** (CI on Linux, a different Chrome), or with `--loose`:
  engine — each channel within 3 on ≥ 99.5% of pixels; exports — within 16
  on ≥ 99.5%. That absorbs another OS's Skia / text rasteriser, but it is
  coarse: a 0.01% contrast tweak passes it, a 1% one doesn't.

Another Windows machine with the same Chrome counts as "same platform". If
it disagrees by a hair on every case, that's CPU-level float noise — run with
`--loose` there rather than re-baselining.

## When a golden fails

The run writes, for every failing case, into `tests/out/<suite>/` (gitignored,
cleared at the start of each run):

- `<case>.actual.png` — what rendered now
- `<case>.golden.png` — the committed golden
- `<case>.diff.png` — the actual faded to grey, every pixel past tolerance in
  solid red
- (Print) `<case>.pdf` — the exported PDF itself

**If the change was not intended**, that's the bug.

**If it was intended** (a treatment was retuned, a template redesigned):
open the diffs and the actual renders and *look at them* — every red pixel
should be one you meant to move, and nothing else should be red. Then run
`npm run test:studios:update` (or `--update --only <suite> --grep <case>`)
and commit the changed goldens in the same commit as the change, saying why.
Per the plan's guardrails, no change to `riso-press.js` output lands without
a golden update Donald has looked at.

`--update` only rewrites goldens that moved beyond tolerance, and re-stamps
`_platform.json` for any folder it rewrote.

## CI

`.github/workflows/deploy.yml` runs **engine + smoke** (`npm run
test:studios:ci`) on every push, before the build; a failure stops the deploy
and uploads `tests/out/` as the `studio-test-diffs` artifact. It is skipped on
the nightly rebuild (no code changed).

- **engine** is pure pixel maths over a photo at its native size (no
  resampling, no fonts), so Linux should land within the cross-platform
  tolerance. This has **not yet been observed on Linux** — the first push is
  its check. If it fails there with small, uniform diffs across many cases
  (platform noise, not a regression), widen `TOL` in `engine.mjs` or give CI
  its own goldens; don't hide it.
- **smoke** has no goldens — layout, errors and hit-tests only — so it is
  platform-neutral.
- **exports** stays local: text rasterisation differs between Windows and
  Linux far beyond any useful tolerance, and it needs Python + PyMuPDF +
  OpenCV. Run it before merging any refactor branch.

## Files

```
scripts/test-studios/
  run.mjs            the entry point
  engine.mjs         engine goldens
  smoke.mjs          studio smoke
  exports.mjs        export goldens (Poster PNG, Print PDF + QR, Schedule)
  pdf_raster.py      PyMuPDF raster + OpenCV QR decode (exports)
  harness/engine.html
  lib/common.mjs     browser, determinism shims, network policy, servers, compare
  lib/png.mjs        dependency-free PNG encode/decode
  lib/extract.mjs    reads presets out of the studio sources
tests/
  fixtures/photo.jpg the engine's test photo
  fixtures/fonts/    cached Google Fonts CSS + woff2 (manifest.json maps them)
  golden/{engine,poster,print,schedule}/
  out/               failure renders + diffs (gitignored)
```

Still to do from Phase 0: item 3 of the plan — Donald's real library as
fixtures (a "Download my library" export per studio, run locally and
gitignored). The suites are written so a fixture loader can slot in beside
the built-in templates.
