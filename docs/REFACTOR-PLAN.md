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
  https://). Schedule kept its pinned app.realitydn.com matrix here (goldened; the live encoder picks a
  different mask) — switched to the encoder in the second half.
- Left for the second half: `cloud.js`, `store.js`, `history.js`.

**Second half done (branch `refactor/studios`)** — the stateful modules, one commit each, plus
the Schedule QR:
- `cloud.js` — the two `cloud-client.js` files (identical but for Schedule's `putDigestStory`)
  as one superset, verbatim: hub allowlist, 20 s timeout, the `reality-hub-token-v1` token, the
  `/studio-auth` popup + origin check, every method's name and return shape. `window.RCloud` is
  still set (an earlier one on the page is kept). Print can import it; it doesn't yet.
- `store.js` — the IndexedDB plumbing only: `openDB({ name, version, upgrade, blockedMessage,
  errorEvent })` → get / getAll / getAllKeys / put / putMany / delete / `tx` / report, plus
  `describeStoreError`, `persistStorage`, `makeWriter` (Print's queued writer) and
  `watchOtherTabs` (Print's BroadcastChannel). Each Studio keeps its own schema file and its exact
  database: Poster `reality-studio` v1 (templates, meta), Print `reality-print` v2 (images, kv),
  and now Schedule `reality-schedule` v1 (kv `doc`). No record changed shape; old-branch code and
  new code were run against the same profile both ways (see the commit).
- Schedule's working doc moved to IndexedDB with a coexistence period — see the follow-up below.
- `history.js` — `useHistory(doc, { limit, coalesceMs, apply })` → undo / redo / canUndo /
  canRedo / `quiet()` / `record()` / `snapshots()`, and `historyKey` (the shortcut, ignored while
  typing). Parameters kept: Poster 80 × 350 ms, Print 80 × 350 ms, Schedule 60 × 500 ms; quiet
  changes stay a call (`quiet()`), not a doc predicate — only the caller knows an export's format
  flip from a click on the same tab.
- Schedule's QR encodes live through `qr.js` (same URL, 25 modules, EC M, new mask); the ten
  Schedule goldens that carry it were updated after checking the diffs and decoding every code.
- The verifier's shared-name guard covers the cloud, store and history names, and fails any
  Studio that opens IndexedDB itself.

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

**Done (24.09.26, three parallel branches merged).** As built:
- **Poster:** `studio-app.jsx` is gone — `app.jsx` (166) over `hooks/` (useDoc, useArrange, useAutosave, useCloud, useLibrary, useQueue, useExport, useKeys, useImageDrop, useViewport, useSpawn, useToast) and `panels/` (topbar, queue, library, event-picker, `inspector/` by TYPE_CAPS family, `photo-panel/` incl. `looks.js` = TREATS/TREAT_PRESETS/FINISH_*/TREAT_LOOKS). `elements/` holds photo + graphics renderers; `catalog.js`, `templates.jsx` split out of studio-data.
- **Print:** flat folder of hooks (`use-*.js`), panels (`inspector-*.jsx`, `image-controls.jsx`, `topbar`, `library`, `preflight-chip`), and data split into paper / layout / templates / preflight / pdf / imposition.
- **Schedule:** `data-*` (model, parse, feed, edit, store, brand), `render-*` (a layout kernel + one module per output), `app-*` (hooks + panels); the three old files are thin re-export shells so the selftest and imports stay stable.
- **Panning** in Poster and Print: space/middle-drag, Ctrl/⌘-wheel zooms at the pointer, fit re-centres; exports ignore the view (byte-identical).
- **Over ~600 on purpose:** Poster `studio-element.jsx` (840) and Print `print-export.jsx`/`print-element.jsx` (~590–600) keep the renderers `tools/verify-day-colours.mjs` reads by path; Print's `renderElement` stays one function (its branches share closure helpers). The verifier now walks every studio source recursively for its shared-name and site-string guards.

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

**Done for Poster (24.09.26, branch `refactor/phase5-photos`).** As built:
- **Reference form:** `el.src` / `el.src2` = `'ref:sha256:<64 hex>'` — the same fields, so every
  renderer stays one code path: `loadCachedImage` (elements/photo.jsx) resolves a reference through
  the blob store (`url(ref)` → objectURL, LRU of 40, revoked on eviction) and still takes an inline
  data URL, forever (old docs, template files, cloud drafts). The press, the bleed preview, the
  treatment strip and the library thumbnails all go through it; exports see real pixels.
- **Blob layer:** `studio-shared/blobs.js` — `makeBlobStore({ owner })` → adopt / put / get / url /
  toDataUrl / gc / stats, in its OWN database `reality-blobs` v1, store `images` keyed by the
  SHA-256 of the bytes: `{ hash, blob, head, size, at, created, owners }`. `head` is the data URL's
  header, so a blob turns back into exactly the data URL it came in as. `at` = last stored (a
  re-paste refreshes it). `owners` lets another Studio share an image later; a sweep only drops
  its own claim.
- **Poster's library moved, v1 left alone:** `reality-studio` v1 (the old build's) is only ever
  READ; this build writes `reality-studio-v2` v1 (same stores, keys and shapes — `doc:working`,
  `bin:`, `thumb:` — photos as references). `RStore.migrate()` runs every load: the first run copies
  every v1 template, Recently deleted and card picture (and, on a profile the old build never moved,
  the localStorage list), interning photos; every later run takes what an OLD-build tab saved since
  (`v1sync` remembers each id's savedAt·name·archived·eventId; a changed v1 record at least as new as
  its v2 twin replaces it, the twin going to Recently deleted first). `docGet` takes the v1 working
  doc when its `at` is newer and files it in v2 under the same `at`. Deletes in an old tab are not
  carried across (a missing record is too weak a signal to delete on). `retireLegacyTpls` is gone
  from this build (it wrote v1).
- **Intake:** upload, paste and drop go through `photos.js takePhoto` / `adoptResult` — the photo is
  stored and the element gets the reference; every store write (`docPut`, `tplPut`, `tplBulkPut`,
  `tplApply`, `binPut`) interns as a safety net; a photo the blob store refuses stays inline.
- **Cloud unchanged on the wire:** `slimDocForCloud` turns each reference back into its original data
  URL and re-cuts it to 860 px exactly as before; pulls (templates, the working draft) intern.
  The template export file is written inline, full size; import interns.
- **Undo** holds references (a few dozen bytes per photo).
- **Sweep** (`hooks/usePhotoSweep.js`): once per load, only when the working doc and the library
  (incl. the v1 pick-up) read cleanly and no other Poster tab of this build answers on the
  `reality-poster-studio` BroadcastChannel; keeps everything referenced by the working doc, the
  localStorage fallback copy, this tab's undo/redo, every v2 template and Recently deleted, and only
  deletes images not stored for a day. (Old-build tabs don't announce themselves, and don't need to:
  they never read the blob store.) `watchOtherTabs` now takes its tab id from `crypto.randomUUID`
  — with Math.random seeded (the test suites), two tabs drew the same id and ignored each other.
- **Print needs nothing:** its photos were already by reference (`imgId` → its own `images` store
  in `reality-print` v2, with the same one-day, clean-load, no-other-tab sweep). Moving them onto
  `reality-blobs` would need its own coexistence period (an old Print tab reads `reality-print`), so
  it stays where it is — see the follow-ups.
- **Verified** (scratch harness, not committed: the old build served from `git archive main` and this
  one on the SAME origin, fresh profile): old-build working doc + 3 templates (two sharing a photo)
  → new build shows all of them, photos pixel-identical, 3 blobs for 3 distinct photos, template
  records 330 KB → 4.5 KB each (test photos ~245 KB; a real 2000 px photo is ~1 MB, so ~2.5 MB →
  ~5 KB), v1 byte-identical afterwards; an old tab's later template save and working-doc edits are
  picked up (the replaced copy lands in Recently deleted); the old build still opens, draws and saves
  afterwards; cloud PUT payloads identical to the old build's for the working doc and every template
  (inline, 860 px); an inline cloud draft and a cloud-only template come in as references (one blob
  for the shared photo); the sweep deletes an orphan over a day old, keeps a young orphan, a
  referenced old blob and another owner's, and does nothing while a second tab is open; replace a
  photo → undo restores the reference and the pixels; exports after reload are byte-identical to the
  old build's; library card pictures shot from referenced templates match the old build's.
  `npm run test:studios` passes with no golden changes.
- **Still true:** the 2000 px intake cap (ImageIntake.configure) — raising it is its own decision
  now that a bigger photo costs one blob rather than a copy per template and per undo step.

**Follow-ups.**
- **Retire v1** (`reality-studio`). Once every Poster tab has reloaded onto this build — at the
  earliest the release after this ships, and after Donald has opened the Studio once on each machine
  he uses (that run does the copy) — drop the `V1` handle, `migrate()`'s pick-up and `docGet`'s v1
  branch (studio-store.js), then delete the database (`indexedDB.deleteDatabase('reality-studio')`,
  behind a `migrated_v2` check). Until then it costs one full read of the old library per load —
  the same read the old build did every load.
- **Cloud: upload blobs to R2 via the app, send refs.** Needs an image endpoint on the app/hub
  (PUT by hash, GET by hash). Then pushes send references (and upload any blob the hub hasn't got),
  pulls fetch missing blobs, and the 860 px cloud cut goes away. Until then the hub keeps inline,
  860 px copies — readable by old builds.
- **Print onto `reality-blobs`** (optional): dedupe and one sweep; needs the same v1/v2 coexistence
  as Poster (new images to the blob store, old `imgId` records read-through), so only worth it if
  Print's image store becomes a problem.
- **The localStorage fallback** (autosave's last resort when IndexedDB refuses a write) now holds
  references; an old-build tab reading that copy would draw the stand-in photo. Only reachable when
  IndexedDB is refusing writes, and gone with v1's retirement.

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
