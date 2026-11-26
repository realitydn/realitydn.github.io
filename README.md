# REALITY Website

The marketing site for REALITY — coffee/cocktails/community bar at 86 Mai Thúc Lân, Đà Nẵng, Việt Nam. Live at **realitydn.com**. Six languages (EN/VN/RU/UK/KO/JA). The live What's-On section renders the REALITY app's public event feed; the app at **app.realitydn.com** is the ecosystem's front door.

## Design System

### Visual Language
- **Corners:** Fully square (0px radius)
- **Shadows:** Pure south direction (Y-offset only)
- **Background:** Always cream (#FFFBF2), never white
- **Accents:** Bright palette used sparingly with multiply blend

### Typography
- **Titles/Headers:** Montserrat Semi-Bold, uppercase, wide tracking
- **Body/Details:** Space Grotesk, regular weight

### Color Palette
- Cream: #FFFBF2 · Ink: #0d0906
- Magenta #C41E8C · Red #E63329 · Orange #F58220 · Yellow #FCAF17
- Lime #8DC63F · Green #00A859 · Teal #00AEB3 · Blue #0077C0
- Purple #5C4E9E · Violet #8E4585

## Setup / Build

```bash
npm install
npm run dev      # local dev server
npm run build    # vite build + Puppeteer prerender (all 6 locales)
```

## What lives where

```
├── public/
│   ├── studio/          # Poster Studio (standalone webapp; ES modules → one bundle — see Notes)
│   ├── schedule/        # Schedule Studio (standalone webapp; auto-pulls the app feed)
│   ├── print/           # Print Studio (vector CMYK PDF, QR standees; preview via serve-print.cjs :4503)
│   ├── studio-shared/   # shared by Poster + Print: riso press + engine (classic scripts), studio-ui.jsx (RUI), print-icons.js
│   ├── images/          # gallery/, hero.jpg, reality-logo.png, whatsapp-qr.png
│   ├── feed-snapshot.json  # build-time feed snapshot (prerender + runtime fallback)
│   ├── llms.txt, llms-full.txt, sitemap.xml  # GENERATED at prebuild by scripts/build-seo-files.mjs (gitignored) — edit the sources, not these
│   └── _headers         # Cloudflare Pages cache policy
├── src/
│   ├── components/      # Header, Calendar (feed), EventOverlay, EventsSchema (JSON-LD),
│   │                    # MenuSection, VisitSection, GallerySection, InfoHostSection,
│   │                    # EventProposalForm, ArtExhibitionForm, GetAppStrip, LangMenu,
│   │                    # ThemeToggle, Footer, SEO, …
│   │   └── deck/        # THE HOME PAGE — see "The home page: the deck" below
│   ├── deck.css         # the home page's styles (after index.css)
│   ├── data/
│   │   ├── deck/        # the home page's own data: event-audit.js (the event figures, read
│   │   │                # from public/event-report/stats.json when the site is built;
│   │   │                # event-stats.js has the fallback snapshot and the mapping),
│   │   │                # fundraisers.js (the stand-in list shown when the app's feed has no rows),
│   │   │                # building.js (rooms in use, from the feed; ROOM_HAS: what a
│   │   │                # free room says is in it), open-hours.js
│   │   ├── locales/     # six locale files (must keep key parity with en.js)
│   │   ├── languages.js # LANGS registry + pathFor/stripLangPrefix
│   │   ├── menu.js      # GENERATED from the app's src/lib/menu-data.ts — DO NOT EDIT HERE
│   │   ├── feed.js + cal-feed.js + feed-helpers.js  # app-feed consumption
│   │   └── translations.js, events.js (gallery only)
│   ├── hooks/useFeed.js # single shared feed fetch (live → snapshot fallback)
│   └── App.jsx          # routes ×6 locales; unknown paths redirect to /
├── worker/              # form-handler Worker — BACKUP lane only (hub is primary; see worker/README.md)
├── prerender.mjs        # static HTML for all locales × pages
└── .github/workflows/deploy.yml  # push to main / nightly / manual = selftest + build + deploy (Cloudflare Pages)
```

## The home page: the deck

The home page is a deck of cards (since 23.11.26). One list —
`src/components/deck/deck.js` — is drawn three times: face up on the table in
the hero, as the strip that sticks to the top, and opened, one section each,
down the page.

- **Reorder, drop or recolour a card:** edit the list in `deck.js`. The
  numbers, the strip and the page follow.
- **Change what a card shows:** each card is two small files —
  `deck/faces/<Name>Face.jsx` (the card on the table) and
  `deck/sections/<Name>Section.jsx` (the opened card).
- **Change the words:** every string written for the deck is in the `deck`
  block of `src/data/locales/en.js` (and mirrored in the other five).
- **What is live:** rooms in use, tonight/tomorrow, the calendar and the
  drinks deal come from the app's events feed; "open now" is worked out in
  Đà Nẵng time; the drink on the menu card is the menu itself.
- **The event figures are weekly, not live.** "Events we've held" reads
  `public/event-report/stats.json`, which `scripts/event-report/` rebuilds
  each week and pushes to `main`. The file is read when the site is built
  (the `reality-event-stats` plugin in `vite.config.js`), never in the
  browser, so the prerendered page and the running page show the same count,
  with its "as of" date. If the file is missing, unreadable or older than the
  bundled snapshot in `data/deck/event-stats.js`, the snapshot is shown; the
  build log says which was used.
- **The fundraisers** come from the app's fundraisers feed, read twice: when
  the site is built (the `reality-fundraisers` plugin in `vite.config.js`, so
  the prerendered page already shows the app's record) and once more in the
  browser. Until that feed has rows, or when it cannot be read, the card
  shows the stand-in list in `data/deck/fundraisers.js`: the three nights so
  far, with the owner's exact figures (26.11.26). The build never fails on
  the feed; its log says which was used. The same record is written into
  `llms.txt` and `llms-full.txt` (`scripts/build-seo-files.mjs`). A fact a
  row doesn't have is a `<Gap>` — a dashed tag on the page — never a guess.
- **The Our menu card** rolls through the whole menu, not only the cocktails
  (coffee, matcha, juice, beer, tea, water), and every drink says what kind
  it is, from the menu's own section labels. The drinks are the `PICKS` list
  in `deck/menu-picks.js`, one row each; `npm run selftest` fails if a row's
  drink has left the menu.
- **On a phone every card says what it is** (25.11.26): a figure has its word
  with it ("3 steps", "0₫ for public events", "73M₫ raised"), What's on has
  one line under its building ("2 on now" or "Next 11:00"), and Get connected
  lists its four names. The short strings are `deck.building.onShort` /
  `nextShort`, `deck.host.short` and `deck.giving.short` in the locale files.
- **What moves inside the cards (24.11.26):** six faces move on their own —
  the menu's drink rolls over, the event chart prints in once as its card
  arrives (on load; it is not on the clock), the giving total throws an echo, the photos re-register, 0₫ gets a
  highlighter pass, and the current open hour is stamped again. Each one
  starts on the second and keeps one of three paces, so the page has a rhythm
  that only repeats every 24 s. (The Inside card is one large photo, filling
  the card under its header. It opens on the shopfront in full colour; its
  colour is printed on about 8 s in, and only then does the photo start to
  change: `FULL_COLOUR_TURNS` in `deck/faces/InsideFace.jsx`. Its photos
  are 4:3 cuts at two sizes in `public/images/deck/`.)
  The paces:
  - **All the numbers are in `src/lib/beat.js`.** `PACES` is the three paces
    (3, 6 and 8 seconds). `FACES` says which card keeps which: the menu and
    the open hour every 3 s, the photo every 6 s, the giving total and 0₫
    every 8 s. Change either and nothing else needs touching:
    `deck/ambient.js` works out which second each card takes, so as few as
    possible start together (at 3, 6 and 8 the menu and the photo never do).
  - The open-now squares (one swell every 2 s) and the masthead's ink strip
    start on the same seconds.
  - **To stop a card moving,** remove its `useBeat(...)` call (or pass
    `on: false`); its face then stays on the still.
  - A card under the pointer sits its turn out. Under reduced motion, and in
    the static HTML, nothing moves.
  - `npm run dev` → `/deck-lab` is a dev-only bench for this: every option
    that was built, the first screen at both widths, a switch that tries
    other sets of paces, and a line that reads back who goes when. It is not
    in the production build.
- The sections the site already had (menu, rules, host + forms, visit,
  gallery) are the same components, rendered inside a card with their
  `embedded` / `only` prop. The old `Hero.jsx`, `DarkCTA.jsx` and, since
  25.11.26, `Calendar.jsx` (with `CardsCarousel.jsx`) are no longer rendered
  on the home page: the full calendar is in the webapp, and *What's
  happening* highlights the next few events and links there.
- **The word is "webapp" (25.11.26).** On the home page the app is always
  called the webapp, never just "the app": "app" reads as something to
  install, and that puts some people off.
- **Folds (24.11.26):** a card keeps what is long behind a bar: each chapter
  of the menu, *More figures*, *Can I just join in?* and the rules. The fold
  is `deck/Expand.jsx`, a real `<details>`: everything in it stays in the DOM
  and in the prerendered HTML. Its one motion is in `deck/fold.js` (the lower
  edge of the panel is an ink line that travels down and uncovers the
  content; no fade, no bounce; instant under reduced motion), its styles in
  block 9 of `deck.css`. To fold something else, wrap it in `<Expand id label>`.
- **How much a card shows depends on the screen (25.11.26).** A phone gets
  the short version; a larger screen has the room, so the same card shows
  more and keeps a fold only for what is really long. The aim on a desktop
  is a card about one screen full. Three sizes by width, in
  `deck/wide.js`: S up to 760px, M 761–1099px, L 1100px and up ("tall" is L
  with at least 1000px of height).

  | Card | S (phone) | M (tablet) | L (desktop) |
  |---|---|---|---|
  | 01 What's happening | building, 3 events, the webapp | 4 events from 900px | building + webapp beside 4 events (5 when tall) |
  | 02 First time here? | 3 steps, photo; folds: *Can I just join in?*, rules | the answer laid out; rules a fold | the same, the answer beside the photo; rules laid out when tall |
  | 03 Our menu | PDF line, 6 chapter folds | the same | chapters down the left (they stay in view), the one picked beside them in two columns, large type |
  | 04 Events we've held | figures, chart; fold: *More figures* | the same, chart beside the figures from 900px | everything laid out, no fold |
  | 05–09 | the same content at every size; only the columns change | | |

  Two cards lead with one thing at every size. **06 Host an event** opens on
  its action: the invitation and a red *Propose an event* button, above the
  rules (it opens the form further down the card and goes to it; `#proposal`
  still lands on the form). **01 What's happening**: a room with nothing on
  says what is in it (the pool table, the board games). Those lines are
  `ROOM_HAS` in `src/data/deck/building.js`, one row per room.

  How: `<Expand flatFrom="m|l|tall">` is a fold below that size and plain
  content from it up; the menu switches layout with `useWide('l')`; the
  rest is CSS (block 11 of `deck.css`). Block 12 is the smallest phones
  (up to 340px), where the cards on the first screen are drawn smaller. The
  static HTML, and a visitor with no JavaScript, get the S version at every
  width.
- **Now playing (on since 26.11.26).** *What's happening* shows the song
  playing in the bar, title and artists only: no link, and no word about
  where the music comes from. It reads the app's
  `/api/feed/v1/now-playing.json` (`src/data/deck/now-playing.js` has the
  address and the rules). The line is on the page only while the feed says a
  song is playing and its answer is under 3 minutes old; a failed request, a
  pause or a stale answer removes it. It asks every 30 s while the card is on
  screen and the tab is visible, and not otherwise. It sits in the bar's cell
  of the building on a tablet or desktop, and as a strip under the building
  on a phone. Never in the static HTML. In development,
  `?nowplaying=<url>` points it at a test document.
- **How the page scrolls: the seam (24.11.26).** The opened card's frame
  stays put on the screen and a hard line travels up through it: above the
  line the card leaving, below it the card arriving. The arriving card's
  banner (number, title, live figure) rides just under the line, then locks
  under the strip while its card is read. It lives in
  `src/components/deck/seam/` (`seam.js` what it does, `stage.js` the
  measuring and the landings, `seam.css` the look, `index.js` when it runs).
  - It is added by script once the page runs. With no JavaScript, in the
    prerendered HTML and under reduced motion the page is a plain scroll
    with every card in its end state.
  - A card taller than the screen leaves blank paper under a fold bar near
    its end (`TAIL` in `seam.js`), so the bar is not covered by the next card
    as soon as it appears.
  - Links and deep links land with the card at rest: its banner under the
    strip, the target clear of it.
  - To turn it off, remove the `useSeam()` call in `App.jsx`.
  - The four other hand-offs that were tried (Overprint, Drift,
    Hand-me-down, Spines) and the old dealt-in card are in git history on
    the branch `claude/deck-handoffs`.

## Forms

Proposal forms POST to the REALITY app hub (`app.realitydn.com/api/proposals`) — the Control Room inbox is the review surface. The same-origin Worker (`/api/event-proposal`, `/api/art-exhibition`) remains a fire-and-forget backup writing Notion/Sheets/Resend. See the app repo's `docs/WEBSITE_APP_INTEGRATION.md` for the sunset plan.

## Deep links (anchors)

The homepage honours these hashes on every language route (`/#proposal`,
`/vn/#proposal`, …). The app's "hold an event" button links `#proposal`;
posters, QR codes and the guidelines page can use the rest. Query strings
before the hash (UTMs) are fine.

| Hash | Lands on (card) |
|------|----------|
| `#events` (`#calendar`, `#schedule`, `#whatson`) | What's happening: the building, the next events, the webapp |
| `#first` | First time here?: the steps |
| `#info` | the same card, with *Can I just join in?* open |
| `#rules` | the house rules, at the foot of First time here?, open |
| `#host` (`#hosting`) | Host an event |
| `#proposal` (`#propose`) | Host an event, with the proposal form open |
| `#menus` (`#menu`, `#food`, `#drinks`) | Our menu: its chapters |
| `#menu-panel-cocktails` (`-spirits`, `-beerwine`, `-table`, `-zeroproof`, `-cafe`) | that chapter of the menu, showing (a fold on a phone, a tab on a desktop) |
| `#visit` (`#location`, `#find`) | Find us |
| `#gallery` (`#photos`) | Inside: the gallery |
| `#held` · `#giving` · `#connect` | Events we've held · Charitable giving · Get connected |

A card's own anchor is its `id` in `src/components/deck/deck.js`; `#rules` and
`#proposal` are set inside their sections.

Folds and links (`src/hooks/useHashLanding.js`): a link whose target is a
fold, or is inside one, opens it first, wherever the link is. A page *loaded*
on `#info` also opens that card's fold (the list is `OPENS_ON_LOAD`). A link
on the page itself to a card (the strip, the cards on the table) only goes to
the card: the short version is the point of it.

Events: tapping an event or a lit room opens it in an overlay, whose button
goes on to the event's page in the webapp. The overlay has no address of its
own: nothing (no poster, QR code, app link or query string) links into it, so
there is nothing to keep working there. `/events` redirects to the webapp
(`public/_redirects`).

`src/hooks/useHashLanding.js` does the landing: it waits for the target to
exist (the form only renders once it is opened), then re-anchors once
the calendar feed arrives and once fonts settle — unless the visitor has
already started scrolling. Add an alias there, not in the components.

## Deployment

Cloudflare Pages (project `realitydn`). Every push to `main` triggers
`.github/workflows/deploy.yml`, which runs the self-tests, then the full build
(including the Puppeteer pre-render, which refreshes `feed-snapshot.json`) and
ships `dist/` via `wrangler pages deploy`. It also runs nightly at 00:05
Đà Nẵng time (so the pre-rendered events and JSON-LD never go stale) and can be
started by hand from the Actions tab. A pre-render that misses any route now
fails the build instead of shipping a partial site; `ALLOW_PARTIAL_PRERENDER=1`
overrides, `SKIP_PRERENDER=1` skips pre-rendering entirely. There is no dashboard-connected build — the GitHub
Action is the whole pipeline, so build-time env vars (`VITE_*`) belong in the
workflow, not a hosting dashboard. (The site moved off Netlify in 2026 — see
MIGRATION-GUIDE.md.)

## Notes

- Six languages via URL prefix (`/`, `/vn`, `/ru`, `/uk`, `/ko`, `/ja`) — `languages.js` is the registry
- The old poster carousel + events-config.json + Poster Manager pipeline is retired (feed-driven since 2026-07-06)
- The Studios (Poster `public/studio/`, Print `public/print/`, Schedule `public/schedule/`) are ES modules, each with one entry (`main.jsx`) that esbuild bundles into a single classic script beside `index.html` (`studio.bundle.js`, `print.bundle.js`, `schedule.bundle.js` + `.map`, gitignored). `scripts/build-studios.mjs` (prebuild) writes them; locally, `tools/serve-*.cjs` bundle on each request, so the `.bat` launchers need no build step. One recipe for both, in `tools/studio-bundle.cjs`. Each `index.html` is the vendored libraries (`vendor/`, globals), the riso press (`studio-shared/riso-press.js` + `riso-engine.js`, classic scripts: `riso-press.js` must stay a standalone UMD file the app vendors) and the bundle. The few globals the bundles still set on purpose (`RStore`, `RCloud`, `RUI`, `shadowModel`, the test suite's hooks) are listed in each `main.jsx`. Edit the `.jsx`/`.js` sources, never a bundle.
- Studio cache-busting is automatic: at build time the `reality-studio-cache-bust` plugin in `vite.config.js` stamps every local `<script>`/stylesheet in the deployed studio HTML with `?v=<content hash>`, so a deploy can never pair a new file with a stale cached one — no hard refresh needed. It only rewrites the `dist/` copies; the tracked `public/*/index.html` stay unstamped.
- Studio third-party libraries (React, html-to-image, jsPDF, JSZip, pdf-lib, fontkit, qrcode) are self-hosted under each studio's `vendor/` — no CDN scripts.
