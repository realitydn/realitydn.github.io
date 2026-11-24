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
│   │   ├── deck/        # the home page's own data: event-audit.js (snapshot figures),
│   │   │                # fundraisers.js (stand-ins until the app's feed has rows),
│   │   │                # building.js (rooms in use, from the feed), open-hours.js
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
- **What is not live (yet):** the event count (`data/deck/event-audit.js`, a
  snapshot of `public/event-report/`, printed with its "as of" date) and the
  fundraisers (`data/deck/fundraisers.js`, marked stand-ins that give way to
  the app's fundraisers feed the moment it has rows). A fact we don't have is
  a `<Gap>` — a dashed tag on the page — never a guess.
- **What moves inside the cards (24.11.26):** six faces move on their own —
  the menu's drink rolls over, the event chart prints in once when the page
  opens, the giving total throws an echo, the photos re-register, 0₫ gets a
  highlighter pass, and the current open hour is stamped again. Everything
  starts on one clock:
  - **The pace of the whole page** is `BEAT_MS` in `src/lib/beat.js` (0.8 s).
    The open-now squares and the masthead's ink strip keep the same beat.
  - **How often one card goes** is `EVERY` at the top of its face file, in
    beats (4 = every 3.2 s). `deck/ambient.js` gives each card its own beat of
    the bar, so they start one after another, never together.
  - **To stop a card moving,** remove its `useBeat(...)` call (or pass
    `on: false`); its face then stays on the still.
  - Under reduced motion, and in the static HTML, nothing moves.
  - `npm run dev` → `/deck-lab` is a dev-only bench for this: every option
    that was built, the first screen at both widths, and a tempo switch. It
    is not in the production build.
- The sections the site already had (calendar, menu, info + host + forms,
  visit, gallery) are the same components, rendered inside a card with their
  `embedded` / `only` prop. The old `Hero.jsx` and `DarkCTA.jsx` are no longer
  rendered.

## Forms

Proposal forms POST to the REALITY app hub (`app.realitydn.com/api/proposals`) — the Control Room inbox is the review surface. The same-origin Worker (`/api/event-proposal`, `/api/art-exhibition`) remains a fire-and-forget backup writing Notion/Sheets/Resend. See the app repo's `docs/WEBSITE_APP_INTEGRATION.md` for the sunset plan.

## Deep links (anchors)

The homepage honours these hashes on every language route (`/#proposal`,
`/vn/#proposal`, …). The app's "hold an event" button links `#proposal`;
posters, QR codes and the guidelines page can use the rest. Query strings
before the hash (UTMs) are fine.

| Hash | Lands on (card) |
|------|----------|
| `#events` (`#calendar`, `#schedule`, `#whatson`) | What's happening: the building, tonight, the calendar |
| `#info` (`#first`) | First time here?: the steps and the welcome panel |
| `#rules` | the house rules, inside Find us |
| `#host` (`#hosting`) | Host an event |
| `#proposal` (`#propose`) | Host an event, with the proposal form open |
| `#menus` (`#menu`, `#food`, `#drinks`) | Our menu |
| `#visit` (`#location`, `#find`) | Find us |
| `#gallery` (`#photos`) | Inside: the gallery |
| `#held` · `#giving` · `#connect` | Events we've held · Charitable giving · Get connected |

A card's own anchor is its `id` in `src/components/deck/deck.js`; `#rules` and
`#proposal` are set inside their sections.

The schedule flows with the page: five poster cards, four rows, then **See
all N events in the app** — the rest of the calendar lives in the app, so
that button is the app door, not an expander.

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
