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
│   ├── components/      # Header, Hero, Calendar (feed), EventOverlay, EventsSchema (JSON-LD),
│   │                    # MenuSection, VisitSection, GallerySection, InfoHostSection,
│   │                    # EventProposalForm, ArtExhibitionForm, GetAppStrip, LangMenu,
│   │                    # ThemeToggle, DarkCTA, Footer, SEO, …
│   ├── data/
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

## Forms

Proposal forms POST to the REALITY app hub (`app.realitydn.com/api/proposals`) — the Control Room inbox is the review surface. The same-origin Worker (`/api/event-proposal`, `/api/art-exhibition`) remains a fire-and-forget backup writing Notion/Sheets/Resend. See the app repo's `docs/WEBSITE_APP_INTEGRATION.md` for the sunset plan.

## Deep links (anchors)

The homepage honours these hashes on every language route (`/#proposal`,
`/vn/#proposal`, …). The app's "hold an event" button links `#proposal`;
posters, QR codes and the guidelines page can use the rest. Query strings
before the hash (UTMs) are fine.

| Hash | Lands on |
|------|----------|
| `#events` (`#calendar`, `#schedule`, `#whatson`) | the schedule |
| `#info` | Info & Host, welcome panel |
| `#rules` | Info & Host, house rules panel |
| `#host` (`#hosting`) | Info & Host, host panel |
| `#proposal` (`#propose`) | host panel with the proposal form open |
| `#menus` (`#menu`, `#food`, `#drinks`) | menus |
| `#visit` (`#location`, `#find`) | visit / find us |
| `#gallery` (`#photos`) | gallery |

On touch (and under 768px) the schedule flows with the page: five poster
cards, six rows, then **See all N events in the app** — the rest of the
calendar lives in the app, so that button is the app door, not an expander.
On mouse at 768px+ the feed keeps its self-scrolling pane and shows every row.

`src/hooks/useHashLanding.js` does the landing: it waits for the target to
exist (the form only renders after the panel switches), then re-anchors once
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
