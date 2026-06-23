# REALITY — Year 2 · Claude Design package

A drop-in **Claude Design** design-system project for the REALITY Year-2 visual
system (silkscreen / riso DNA · one tokened theme, Day ⇄ Night).

Every file here is a **self-contained preview card** — tokens and component CSS
are inlined, so each renders standalone in the Claude Design pane with no shared
stylesheet or build step. The only external dependency is Google Fonts
(Montserrat, Montserrat Alternates, Space Grotesk), loaded over the network.

> Source of truth lives one level up in `design_handoff_reality_system/`. These
> cards are **generated** from it by `../claude-design-build.mjs` — edit the
> builder and re-run, don't hand-edit the HTML (it'll be overwritten).

---

## The cards (22)

| File | Group | Card |
|---|---|---|
| `00-overview.html`        | Overview    | REALITY — Year 2 (wordmark + four DNA rules + house conventions) |
| `10-color.html`           | Foundations | Colour & Palette (3 majors lead + 4 minors, category register) |
| `11-surfaces.html`        | Foundations | Surfaces — Day ⇄ Night (settle-don't-snap, default to OS) |
| `12-typography.html`      | Foundations | Typography (Montserrat / Alternates / Space Grotesk) |
| `13-shadow.html`          | Foundations | Shadow — flat riso down-shadow |
| `14-spacing.html`         | Foundations | Spacing & Layout (4px ramp + semantic tokens) |
| `15-motion.html`          | Foundations | Motion (easing + durations + named animations) |
| `20-buttons.html`         | Components  | Buttons (roles default/ghost/action/info/notice · sizes · states) |
| `21-chips.html`           | Components  | Chips (category dots) |
| `22-fields.html`          | Components  | Input Fields (default / focus / error / disabled) |
| `23-cards.html`           | Components  | Cards (accent top-bar) |
| `24-controls.html`        | Components  | Controls (Switch · Checkbox · Radio) |
| `25-indicators.html`      | Components  | Indicators (Avatar · Badge · Dot · Progress · Stepper · Timer) |
| `26-feedback.html`        | Components  | Toast & Alert (four kinds + inline alert) |
| `27-navigation.html`      | Components  | Bottom Navigation (5 tabs, raised Scan) |
| `28-leaderboard.html`     | Components  | Leaderboard (ranked rows, leader inverts) |
| `29-icons.html`           | Components  | Icon Library (all 72 glyphs, 11 categories, 4 treatments) |
| `30-wordmark.html`        | Brand       | Wordmark & Lettermark (canonical vector, A/I/Y only) |
| `40-photo.html`           | Photo       | Photo Language (6 riso treatments + logo box + full-bleed) |
| `50-posters.html`         | Posters     | Poster Archetypes (Pub Quiz · Acoustic · Pulse · After Dark) |
| `51-poster-grid.html`     | Posters     | Poster Grid System (5:7 · 108px module · ticket variants) |
| `52-poster-grammar.html`  | Posters     | Poster Grammar (Frame · Parts · the 7 dials) |

Also included: `reality-tokens.css` / `reality-tokens.json` (the framework-agnostic
token source for wiring into real codebases) and `index.html` (a local contact
sheet — open it in a browser to see every card at once; it is **not** a card).

Most foundation/component cards show **Day and Night side by side** via the
`.scope-day` / `.scope-night` local theme scopes.

---

## How Claude Design reads these

The pane builds its card index from the **first line** of each HTML file:

```html
<!-- @dsCard group="Components" name="Buttons" subtitle="…" w="1100" h="540" -->
```

`group` sets the section the card lands in; `name` / `subtitle` label it;
`w` / `h` are the card viewport. The app compiles these markers into
`_ds_manifest.json` on its self-check, so no manual registration is needed.

---

## Importing into Claude Design

The target project must be of type **Design System** (immutable at creation —
pushing to a regular project won't convert it).

### Option A — let Claude push it (recommended)

1. In this session, run **`/design-login`** to authorize design-system access on
   your claude.ai account (works even when the session uses an API key).
2. Ask Claude to **sync this folder to Claude Design** (the `/design-sync` flow).
   Claude will `list_projects`, either reuse your existing REALITY project or
   `create_project`, show you the exact write plan for approval, then upload all
   16 cards + the manifest in one step.

If the auto-index ever misses a card, the cards can also be registered
explicitly via DesignSync `register_assets` (name / path / group / viewport) —
the marker data above maps 1:1 to that schema.

### Option B — import manually

Create a Design System project in Claude Design and upload the contents of this
folder (the `*.html` cards; `index.html` and the token files are optional
extras). The `@dsCard` markers do the rest.

---

## Regenerating

```bash
cd design-system-year2
node claude-design-build.mjs
```

Rewrites every card from `design_handoff_reality_system/`. Bump or add cards by
editing the `cards` array in the builder.
