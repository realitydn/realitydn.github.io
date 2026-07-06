# REALITY Website v3.0

A redesigned website for REALITY coffee/cocktails/community bar in Da Nang, Vietnam.

## Design System

### 4-Layer Parallax Depth System
1. **Top Layer** - Content cards (floating, interactive)
2. **Cream Layer** - Off-white background with occasional breaks
3. **Accent Layer** - Colored rectangles with multiply blend (40-60% coverage)
4. **Base Layer** - Solid cream foundation

### Visual Language
- **Corners:** Fully square (0px radius)
- **Shadows:** Pure south direction (Y-offset only)
- **Background:** Always cream (#FFFBF2), never white
- **Accents:** Bright palette used sparingly with multiply blend

### Typography
- **Titles/Headers:** Montserrat Semi-Bold, uppercase, wide tracking
- **Body/Details:** Space Grotesk, regular weight

### Color Palette
- Cream: #FFFBF2
- Ink: #0d0906
- Magenta: #C41E8C
- Red: #E63329
- Orange: #F58220
- Yellow: #FCAF17
- Lime: #8DC63F
- Green: #00A859
- Teal: #00AEB3
- Blue: #0077C0
- Purple: #5C4E9E
- Violet: #8E4585

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## File Structure

```
reality-site/
├── public/
│   ├── images/
│   │   ├── events/          # Event poster images (a.jpg, b.jpg, etc.)
│   │   ├── gallery/         # Gallery images
│   │   ├── hero.jpg         # Hero section image
│   │   ├── reality-logo.png # Logo
│   │   └── whatsapp-qr.png  # WhatsApp community QR code
│   ├── events-config.json   # Event poster configuration
│   ├── favicon.ico          # USER TO PROVIDE (16x16, 32x32)
│   ├── favicon.svg          # USER TO PROVIDE (optional)
│   └── apple-touch-icon.png # USER TO PROVIDE (180x180)
├── src/
│   ├── components/
│   │   ├── ParallaxLayers.jsx
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── EventsSection.jsx
│   │   ├── Calendar.jsx
│   │   ├── InfoSection.jsx
│   │   ├── DarkCTA.jsx
│   │   ├── MenuSection.jsx
│   │   ├── VisitSection.jsx
│   │   ├── GallerySection.jsx
│   │   ├── Footer.jsx
│   │   ├── CardsCarousel.jsx
│   │   └── Icons.jsx
│   ├── data/
│   │   ├── translations.js
│   │   ├── menu.js
│   │   └── events.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## User-Provided Assets

You need to add these files:

### Favicons (in /public/)
- `favicon.ico` - 16x16 and 32x32 combined
- `apple-touch-icon.png` - 180x180
- `favicon.svg` - Optional, for modern browsers

### Images (in /public/images/)
- `hero.jpg` - Hero section background
- `reality-logo.png` - Site logo
- `whatsapp-qr.png` - QR code for WhatsApp community
- `gallery/a.jpg` through `gallery/m.jpg` - Gallery images

### Event Posters
Add event poster images to `/public/images/events/` and update `events-config.json` with the filenames in display order.

## Deployment

Cloudflare Pages (project `realitydn`). Every push to `main` triggers
`.github/workflows/deploy.yml`, which runs the full build (including the
Puppeteer pre-render) and ships `dist/` via `wrangler pages deploy`. There is
no dashboard-connected build — the GitHub Action is the whole pipeline, so
build-time env vars (`VITE_*`) belong in the workflow, not a hosting dashboard.
(The site moved off Netlify in 2026 — see MIGRATION-GUIDE.md.)

## Notes

- Cards have hover states that lift and deepen shadows
- Lightbox modals for event posters and gallery images
- WhatsApp QR code in footer to help prevent bot joins
- Bilingual support (EN/VI)
