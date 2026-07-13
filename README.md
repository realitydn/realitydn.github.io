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
│   ├── studio/          # Poster Studio (standalone webapp, Babel-XHR JSX — hard-refresh after deploys)
│   ├── schedule/        # Schedule Studio (standalone webapp; auto-pulls the app feed)
│   ├── print/           # Print Studio (vector CMYK PDF, QR standees; preview via serve-print.cjs :4503)
│   ├── images/          # gallery/, hero.jpg, reality-logo.png, whatsapp-qr.png
│   ├── feed-snapshot.json  # build-time feed snapshot (prerender + runtime fallback)
│   ├── llms.txt         # AI-discoverability summary — keep current
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
└── .github/workflows/deploy.yml  # push to main = build + deploy (Cloudflare Pages)
```

## Forms

Proposal forms POST to the REALITY app hub (`app.realitydn.com/api/proposals`) — the Control Room inbox is the review surface. The same-origin Worker (`/api/event-proposal`, `/api/art-exhibition`) remains a fire-and-forget backup writing Notion/Sheets/Resend. See the app repo's `docs/WEBSITE_APP_INTEGRATION.md` for the sunset plan.

## Deployment

Cloudflare Pages (project `realitydn`). Every push to `main` triggers
`.github/workflows/deploy.yml`, which runs the full build (including the
Puppeteer pre-render, which refreshes `feed-snapshot.json`) and ships `dist/`
via `wrangler pages deploy`. There is no dashboard-connected build — the GitHub
Action is the whole pipeline, so build-time env vars (`VITE_*`) belong in the
workflow, not a hosting dashboard. (The site moved off Netlify in 2026 — see
MIGRATION-GUIDE.md.)

## Notes

- Six languages via URL prefix (`/`, `/vn`, `/ru`, `/uk`, `/ko`, `/ja`) — `languages.js` is the registry
- The old poster carousel + events-config.json + Poster Manager pipeline is retired (feed-driven since 2026-07-06)
- Studio JSX under public/ is Babel-XHR-cached: a studio tab needs Ctrl+Shift+R after any deploy
