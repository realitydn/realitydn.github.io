# Studio system refactor — plan

Written 23.09.26, after the review + fix pass (commits 2e726e5 … db937ce). Nothing
here was started then. Each phase is a branch that lands on its own, with the studios
working at every step — Donald uses them every week, so there is no "big bang"
moment and no phase that leaves a studio half-moved.

## Where it stands

| Studio | Sources (lines) | Biggest file |
|---|---|---|
| Poster | studio-app 4,732 · element 1,358 · data 1,285 · canvas 397 · store 487 · cloud 409 · css 376 | `studio-app.jsx` — one `App` of ~1,900 lines plus every panel |
| Print | app 1,652 · data 1,459 · export 828 · element 597 · canvas 276 · store 179 · css 324 | `print-app.jsx` |
| Schedule | render 2,514 · app 1,297 · data 893 · cloud 446 · css 209 | `schedule-render.jsx` |
| Shared | riso-engine 1,804 · riso-press 854 · studio-ui 422 | — |

How they hold together today:

- **Globals by script order.** Every file is a classic `<script>`; they share state through
  `window.*` and top-level declarations, in the order `index.html` lists them. A file that
  loads early can't see a later one; a rename breaks another studio silently. `build-studios.mjs`
  compiles JSX file-by-file (esbuild `transform`), so nothing checks the wiring.
- **Print is a fork of Poster that kept drifting.** ~620 lines are identical after renaming
  class prefixes (shape paths, bursts, rules, icon layout, contrast, image intake, undo, swatches);
  some copies have already diverged (Poster's `shapePath` has additions Print lacks).
- **Three of a lot of things:** three undo systems (Schedule got one on 23.09), three storage
  layers (Poster RStore/IDB, Print print-store/IDB, Schedule localStorage), two cloud clients
  (Schedule's = Poster's + `putDigestStory`), three copies of the palette / ink mark / wordmark,
  three stylesheets that overlap 52–70% under three prefixes (`rs-`, `ps-`, `ss-`) with three
  slightly different darks. Schedule doesn't use the shared UI kit (`RUI`) at all. Poster loads
  `../print/print-icons.js` across folders.
- **Photos live inline** as data URLs in docs, templates, undo history and cloud payloads —
  a template is ~2.5 MB, which is why cloud pushes downscale to 860 px.

What is already right and must not be disturbed: `riso-press.js` (pure, one copy, vendored into
the app via `sync:riso`), the engine's registries (treatments, blurs, finish stack, `platesFor`),
TYPE_CAPS-driven inspectors, `window.shadowModel`, the day-colour verifier.

## Phase 0 — Safety net (first, always)

Nothing moves until these exist and pass on `main`:

1. **Golden renders for the engine.** A node/puppeteer script renders a fixed set — every
   treatment × day/night × 2 inks, plus each finish look — from a committed sample photo at
   520 px, and compares against committed PNGs with a small per-pixel tolerance. Catches any
   refactor that changes a pixel of the press. (The measuring harness from 23.09 —
   `grain.cjs` in the session scratchpad — is the seed.)
2. **Studio smoke suite.** For each studio: loads with no console errors; every toolbar control
   hit-tests at 1280/1440/1920; apply N templates → export → compare to committed exports
   (Poster PNG, Print PDF rasterised with PyMuPDF + QR decoded, Schedule PNG). Print already has
   `verify2.cjs` / `check_pdf.py` in scratch; promote them into `scripts/`.
3. **Donald's real library as fixtures.** Export his Poster templates + Print templates +
   the current Schedule doc (a "Download my library" button in each studio, one JSON) so the
   suite runs against real work, not just the starters. Anonymise nothing — it stays local,
   gitignored, run on demand.
4. Both suites in CI (`deploy.yml` already runs the self-tests before build).

Exit: a deliberate one-pixel change to a treatment fails the golden test.

## Phase 1 — Modules + a real bundle

Switch the studios from ordered globals to ES modules, bundled by esbuild.

- `build-studios.mjs` goes from `transform` to `build({ bundle:true, format:'iife',
  splitting:false, entryNames:'[name]-[hash]' })` with one entry per studio
  (`studio/main.jsx`, `print/main.jsx`, `schedule/main.jsx`) and `studio-shared/` as imports.
  Output lands in `dist/` only; the `?v=` stamping plugin becomes unnecessary (hashed names).
- **Migration adapter:** each module still assigns its old `window.X` for the length of this
  phase, so files can move one at a time and anything not yet converted keeps working. The last
  step of the phase deletes the adapter lines and the `index.html` script lists.
- Local servers (`tools/serve-*.cjs`) bundle on request (esbuild is ~50 ms) so there is still
  no build step to remember.
- React stays vendored (`vendor/react*.js`), now imported rather than global.

Exit: `index.html` of each studio has one script tag; the smoke suite is unchanged; no `window.`
assignments left except the ones the app or hosts rely on (RISO, RCloud, RStore, documented).

**Done (branch `refactor/studios`).** As built, where it differs from the sketch above:
- Bundles keep **stable names** beside each `index.html` (`public/<studio>/<studio>.bundle.js`
  + `.map`, gitignored), written by `build-studios.mjs` in prebuild, so the `?v=` stamping plugin
  stays and stamps them. The recipe (IIFE, es2019, classic JSX) is `tools/studio-bundle.cjs`,
  shared with the local servers, which bundle on request.
- React/ReactDOM and the export libraries stay **vendored globals** (not imported), and
  `riso-press.js` + `riso-engine.js` stay **classic scripts** loaded before the bundle
  (`riso-press.js` must remain the standalone UMD file the app vendors; the engine goldens load
  both directly). So each `index.html` is vendor scripts + the two riso files + one bundle.
- `print-icons.js` moved to `studio-shared/` (an ES module both studios import).
- Globals still set on purpose, listed in each `main.jsx`: RISO, RisoPress (riso files), RStore,
  RCloud, RUI, shadowModel, and the test suite's hooks (TEMPLATES, TEMPLATE_GROUPS, getSample;
  Print adds makeElement, buildTemplate, ImageControls, IMG_TREATS, IMG_TREAT_PRESETS).

## Phase 2 — One shared core

Move the duplicated pieces into `studio-shared/` modules, one PR each, each covered by Phase 0:

| Module | Takes over |
|---|---|
| `brand.js` | PALETTE, ink hexes (the print ink stays its own canon value, #111111), INK_MARK + wordmark paths, `contrastInk` (Poster's contrast-ratio rule), day colours **generated from `public/tokens/day-colours.json`** so the verifier checks one source |
| `cloud.js` | the single cloud client (Schedule's `putDigestStory` as an extra), hub allowlist, timeout |
| `store.js` | one IndexedDB layer: working doc, templates, images; Schedule moves onto it (it is the last on localStorage) |
| `history.js` | one undo/redo hook (Print's 80-step model, Schedule's coalescing, Poster's quiet flips) |
| `image-intake.js` | file/clipboard/drop → sized image, HEIC message, one cap per host |
| `shapes.js` | shapePath, burstRays, ruleLayout, iconLayout (+ `print-icons.js` moves here) |
| `qr.js` | the UTF-8 QR encoder + square-eye geometry (Poster's QR becomes a real code) |
| `press-panels.jsx` | Stock / The press / Proof folds, today written twice (Poster + Print) |

Rule for each move: port the *most correct* copy, diff behaviour against the others, and write
down any deliberate difference (e.g. Print's white stock) as a parameter, not a fork.

Exit: `grep` finds no second definition of any of the above; Print and Poster share every
primitive they both use.

**First half done (branch `refactor/studios`)** — the stateless modules, one commit each:
`brand.js` (+ `wordmark.jsx`), `shapes.js`, `qr.js` (+ `vendor/qrcode.cjs`, bundled, no global),
`image-intake.jsx`, `press-panels.jsx`, `util.js` (+ `RUI.Swatches`). As built:
- Day hexes are derived from `day-colours.json` in `brand.js`; the verifier evaluates `brand.js`
  and fails on any Studio source that defines an owned name again (module → names map).
- Differences kept as parameters: the substrate pair (`NEUTRALS.artwork` vs `NEUTRALS.print`,
  passed to `contrastInk` and the ink-mark cells), `ImageIntake.configure` (Poster 2000 px / JPEG
  .82, Print 3500 px / .86), `PressPanels.configure` (Poster cream + Auto stock, Print white; Print
  shows a subset of the press dials as a section), id prefix (`e`/`p`), each Studio's type ladder,
  Swatches' fixed set, RUI `swatchBorder`.
- The Poster's QR now encodes the element's own Website text (`qrTarget`: a bare host gains
  https://). Schedule keeps its pinned app.realitydn.com matrix (goldened; the live encoder picks a
  different mask) — switch it to the encoder with a golden update if wanted.
- Left for the second half: `cloud.js`, `store.js`, `history.js`.

**Follow-up — Schedule localStorage copy.** Schedule's working doc moved to IndexedDB
(`reality-schedule`) on 23.09.26 but still writes the old `reality-schedule-doc-v2` localStorage
copy on every save, and load adopts whichever copy is newer, so a tab still running the old code
and the new code never lose each other's edits. Once every Schedule tab has reloaded onto the new
code — at the earliest the release after this branch ships — drop the `storeDoc()` write in
`saveStoredDoc` and the `readLSDoc()` fallback in `loadStoredDoc` (schedule-data.jsx), and remove
the key from localStorage.

## Phase 3 — Split the big files

With modules in place, split along the seams that already exist:

- **Poster `studio-app.jsx` (4,732)** → `app.jsx` (shell + layout only) and hooks:
  `useDoc` (doc + overrides + formats), `useHistory` (shared), `useAutosave`, `useCloud`,
  `useKeys`, `useViewport` (zoom + the missing pan), `useLibrary`, `useQueue`, `useExport`;
  panels: `inspector/` (one file per TYPE_CAPS family: text, photo, graphics, ticket, layout),
  `photo-panel/` (treatment strip, tune, press, finish, mask), `library.jsx`, `event-picker.jsx`,
  `topbar.jsx`. Target: no file over ~600 lines.
- **Schedule `schedule-render.jsx` (2,514)** → one module per output (story, feed, day card,
  print sheet) over a shared layout kernel.
- **Print `print-app.jsx`** → the same hook set as Poster (most come from Phase 2 directly).

Exit: the smoke suite is unchanged; every file ≤ ~600 lines (engine + press excepted).

## Phase 4 — One look

- `studio-shared/studio-base.css` with tokens (`--st-bg`, `--st-ink`, `--st-accent`,
  `--st-select` = the out-of-palette cyan, type scale with a 10 px floor) and the shared
  components (folds, chips, sliders, swatches, toolbars, chips-as-status).
- Per-studio CSS shrinks to layout only. Prefixes stay per studio only where the markup
  truly differs.
- **Decision for Donald first:** the studio chrome uses 6–12 px rounded corners, which the
  brand's square-corner rule contradicts. Square it, or keep the tool chrome distinct from
  the brand on purpose?
- Schedule adopts `RUI` (folds, hints, the palette).

## Phase 5 — Photos by reference

Store each image once as a Blob keyed by content hash (IDB locally, R2 via the app for cloud);
docs, templates and undo history keep only the hash. Templates drop from MBs to KBs, undo becomes
cheap, cloud sync stops downscaling (the 860 px cloud cap goes away), and dedupe is free.
Migration is additive: write the blob, keep the data URL until the round trip is verified, then
drop it — the same never-destructive pattern RStore's first migration used.

## Phase 6 — The website (separate track, can run in parallel)

- Load locale files per route (`import()`): the five locales a visitor isn't reading are
  ~177 KB of source (~50 KB gzipped) in the main bundle; the six-language `menu.js` (64 KB)
  can split the same way.
- Prune `index.css` (~45 dead selectors found in the review).
- Finish the forms merge (both forms onto `useProposalForm` + `FormFields` completely).
- `hydrateRoot` once the known mismatches (theme, dates, BandField, footer year) render the
  same on server and client — the inline feed seed already removes the biggest one.

## Order and size

| Phase | Depends on | Size (sessions) | Risk |
|---|---|---|---|
| 0 Safety net | — | 1–2 | low |
| 1 Modules + bundle | 0 | 2 | medium — touches every file, but mechanically |
| 2 Shared core | 1 | 3–4 (one module per PR) | medium — behaviour diffs between copies |
| 3 Split files | 1 (2 helps) | 2–3 | low with Phase 0 |
| 4 One look | 2 | 1–2 | low; one design decision |
| 5 Photos by reference | 2 (store.js) | 2 | medium — data migration |
| 6 Website | — | 1–2 | low |

Guardrails for every phase: a branch per PR; Phase 0 suites green before merge; Donald's library
fixtures exported before any storage change; no change to `riso-press.js` output without a
golden-render update he has looked at.
