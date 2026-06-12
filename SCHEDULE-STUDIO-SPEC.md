# REALITY Schedule Studio — Spec v2

*The Schedule Generator. Drafted June 2026 against Design System Year 2.1. Revised after review — v2 decisions:*

- *Notion database becomes the event **source of truth** (replaces the Google Calendar pull); CSV import added as the simple/bridge path.*
- *The current AC Weekly Schedule is a **Year 1 artifact** — it informs content and grammar, not the design. The Year 2 schedule should look better than it's ever been.*
- *Schedules can **start on any day**, controlled by a day-strip range slider that also sets carousel splits.*
- *Outputs are **channel presets** (IG, FB, Stories, WhatsApp, print…), each with its own dimensions, safe zones, and furniture — not a generic format list.*
- *Bilingual day labels / event lines: dropped.*
- *Curated **style variations ("Looks")** added — meaningful range without poster-level fine-grained control.*

## 1. Goal

Replace the manual weekly-schedule workflow with a small in-house tool that:

1. Holds the schedule as **structured data** — ~30 events per week, entered once or pulled from Notion.
2. **Renders every channel automatically** from that one source: print, IG feed carousel, Stories, WhatsApp, daily cards, and whatever comes next. No per-format rearranging by hand.
3. Treats this as a **Year 2 design project**, not a port: locked palette, canonical wordmark SVG, real QR, hard corners, flat down-shadows, riso DNA — composed fresh, aiming above the Year 1 sheet.
4. Makes readability at 30 events/week a *system property* — auto-fit ladder, capacity meters, auto-legend — not something to eyeball every week.

**Design center: data-driven, not canvas-driven.** A schedule is the same system every week with different rows — so the tool is an *event-list editor with live, deterministic previews*. Variation comes from **Looks** (curated style presets, §8), never from dragging text boxes.

## 2. The Year 1 sheet — reference, not template

What carries over from the current AC Weekly Schedule is the *information design* that works:

- Row grammar: time · title · location codes · flag glyphs (`17:00: How to DJ 2E $`).
- Day blocks color-coded on a fixed weekday mapping; date range in the header.
- Location codes (`1L 2L 2E 3P`) with a legend; `*` pre-registration / `$` fee flags.
- Day-level statuses (`CLOSED FOR STAFF TRIP`), the support-note box, wifi + pass on print only.

Everything visual is up for redesign under Year 2 rules. Concretely better than Year 1: aligned tabular time columns, a real type hierarchy from the token sheet, day blocks that sit on the paper (down-shadow, ink structure) instead of floating flat fills, the canonical wordmark instead of set text, a real QR, auto-legend instead of a fixed one, and channel-correct sizing instead of one image cropped everywhere.

## 3. Data model

One document per schedule range. Autosaved to localStorage, exportable/importable as JSON (the archive format).

```js
{
  version: 2,
  range: { start: '2026-06-08', days: 7 },   // start = ANY day of week; days 1–10
  header: { title: 'PUBLIC EVENTS' },          // editable for special weeks
  days: {                                      // per-date status overrides
    '2026-06-14': { status: 'closed', note: 'CLOSED FOR STAFF TRIP' }
    // default: open
  },
  events: [{
    id: 'ev_x1',
    date: '2026-06-11',                        // ISO date within range
    start: '17:00',                            // 24h HH:MM
    end: '21:00',                              // null | HH:MM | 'late' → "ALL NIGHT"
    title: 'Spill It w/Dr. Steph: Desire, Intimacy',
    titleShort: null,                          // optional, used when a row must shrink
    locations: ['2L'],                         // 0..n codes from the registry
    flags: { prereg: false, fee: false },
    emphasis: 'none',                          // 'none' | 'bold' | 'banner' (§8)
    hide: [],                                  // channel ids to omit from
    notionId: null                             // set by Notion import; powers re-pull diff
  }],
  splits: ['2026-06-11'],                      // carousel part boundaries (split AFTER this date)
  footer: {
    supportNote: true,
    supportText: 'While many of our events are free…',   // editable, has default
    wifi: 'auto'                               // auto = channel preset decides (print: on)
  },
  style: {
    look: 'ledger',                            // see §8
    theme: 'day',                              // day | night (print always day/white)
    inkSaver: false                            // print option: outlined day blocks
  }
}
```

**Location registry** (tool-level config, editable, drives the auto-legend):
`1L` 1st-Floor Lounge · `2L` 2nd-Floor Lounge · `2E` Event Space · `3P` 3rd-Floor Patio.
Adding/renaming a code is config, not code.

**Sorting is derived**: events always render in start-time order within a day. Moving an event = changing its `date` or `start`. No manual ordering state.

## 4. Getting events in

Five paths, and they compose:

1. **Start from last range** — one click clones the most recent document onto the next dates (recurring events barely change week to week). The default Monday-morning move until Notion lands.
2. **Quick-add line** — one text input per day speaking the legacy grammar:
   `17:00 - 21:00: Happy Hour: Buy1Get1 Cocktails 1L/2E *` → parsed into a row. Also accepts a whole pasted block with `MON`/`TUE`… or date headers, mapped onto the visible range — the day-one migration path from the old file.
3. **CSV import** — flexible column mapper (remembered once configured). The pinned interchange format (`Schedule Studio CSV v1`) is what Claude or any script should emit:

   ```csv
   date,start,end,title,title_short,locations,flags,emphasis
   2026-06-08,17:00,21:00,Happy Hour: Buy1Get1 Cocktails,,1L/2E,,
   2026-06-08,19:00,late,Board Game Night,,1L/2L/2E/3P,,
   2026-06-13,20:30,,REALITY 1-Year Anniversary Party,,2E,prereg fee,banner
   ```

   `date` ISO · `start` 24h HH:MM · `end` empty / HH:MM / `late` (renders ALL NIGHT) · `locations` slash-separated registry codes · `flags` any of `prereg fee` (or `*` `$`) · `emphasis` empty / `bold` / `banner`. Unknown columns are ignored; header names are case-insensitive; closed-day statuses are set in-app, not in CSV. Notion's native **Export → CSV** maps onto this with the column mapper, so CSV is also the zero-setup Notion bridge.
   *Interim workflow while the Notion DB catches up:* ask Claude to pull a week from the REALITY Google Calendar (MCP) and emit a `Schedule Studio CSV v1` file — drop it into the importer. The format is documented in project memory so any session produces it correctly.
4. **Notion pull** *(the source-of-truth integration, Phase 2)* — the schedule database lives in Notion; the Studio pulls a date range and maps rows to events.
   - *Transport:* the Notion API forbids browser CORS, so the pull runs through the **local launcher's server** (`serve-schedule.cjs` gains a `/api/notion` proxy; integration token lives in a gitignored `tools/schedule-notion.config.json`). The deployed copy at realitydn.com/schedule keeps CSV/paste/clone; if pull-from-anywhere ever matters, the existing `worker/` is the natural home for a token-secured endpoint (Phase 3).
   - *Mapping (property names configurable):* Title ← title prop · Date ← date prop (start[/end] times) · Locations ← multi-select · Flags ← `Pre-reg` / `Fee` checkboxes or multi-select · Emphasis ← checkbox · cancelled/draft statuses excluded by a Status select filter.
   - *Diff view:* re-pull any time; rows match on `notionId` and show **added / changed / removed**, approved per row. Local edits you've made (e.g. `titleShort`) survive a re-pull.
   - *Schema note:* the database doesn't exist yet — defining it is part of Phase 2, and the mapper should tolerate renames so the DB can evolve.
5. **Manual row editor** — always available (§9).

## 5. Channels

One layout engine; a **channel preset registry** layers on top. A preset = dimensions, safe areas, background, furniture rules, part behavior, filename suffix. Adding a channel is config + a preview tab, not a new renderer.

| Channel | Canvas | Bg | Notes |
|---|---|---|---|
| **IG feed** | 4:5 · 1080×1350 · @2× PNG (2160×2700) | Cream | Carousel; parts from the day-strip splits. Part 1 carries header/wordmark; final part carries legend, support note, site + address, swipe-back arrow. |
| **FB feed** | 4:5 · 1080×1350 · @2× PNG | Cream | Same geometry as IG today — separate preset slot so FB can diverge later without touching IG. |
| **Stories / WhatsApp status** | 9:16 · 1080×1920 · @2× PNG | Cream | Safe zones 140px top / 160px bottom; type scaled up (~1.2×) so the story fills its space. **No arrows** — stories sequence automatically. |
| **WhatsApp share card** | 1:1 · 1080×1080 · @2× PNG | Cream | Squares preview best in chat threads; condensed week or single-part summary. Must read at ~300px thumbnail. |
| **Print — weekly** | A4 landscape · 1123×794 css px · @3× (≈288 DPI) → PDF | White | Full furniture: legends, wifi + pass, support note, wordmark, address, site, QR. Ink-saver option (§8). |
| **Print — counter card** | A5 portrait → PDF @3× | White | Daily card at the bar. *(Phase 2)* |
| **Daily — story** | 9:16 · 1080×1920 · @2× PNG | Cream | "Today at REALITY." **Export all open days → ZIP** for batch posting. |
| **Daily — feed** | 4:5 · 1080×1350 · @2× PNG | Cream | Same daily document, feed geometry. Dailies travel alone → always full mandatory footer (wordmark, address, site, QR). |
| **Screen / TV** | 16:9 · 1920×1080 PNG | Cream or Night | Whole range on one landscape frame for an in-bar display. *(Phase 3)* |

Furniture rules live in the preset (wifi: print only; legend: final carousel part + all print; QR: everywhere except mid-carousel parts), with per-document overrides when needed. Exports: per-channel, or **Export All → ZIP**.

**File naming:** `reality-schedule-2026-06-08-ig-1.png`, `-stories-2.png`, `-wa.png`, `-print.pdf`, `reality-daily-2026-06-11-story.png`, archive `reality-schedule-2026-06-08.json`, bundle `reality-schedule-2026-06-08.zip`.

## 6. Layout engine — readability at 30 events

The renderer owns arrangement. Its contract: **never overflow silently, never shrink below the legibility floor.**

**Row anatomy** (weekly surfaces):
```
17:00          Spill It w/Dr. Steph: Desire, Intimacy   2L *
└ time col      └ title (Space Grotesk 600, ink)        └ codes + flags
  Space Grotesk 500, tabular figures,                     Space Grotesk 500,
  fixed-width column — colons align                       --fg-dim
  down the whole day stack
```
- `emphasis` rows: Montserrat 700 UPPERCASE with a day-accent underline bar. The editor hints past two per range.
- Closed/note days: quiet ink-on-cream strip, Montserrat 600 caps.

**Auto-fit density ladder — estimated, then measured.** Each part is first sized by estimate (leading → type steps → title wrap with `titleShort` → floor ≈26px digital / ≈9pt print; WhatsApp gets one extra step). The rendered DOM is then **measured for real**: if the estimate missed, the part bumps itself down the remaining ladder, then down the **footer ladder** (full → compact → minimal), before flagging **over capacity** in the editor with suggested moves: shift a split handle, shorten titles, or hide a row from that channel. The preview reports its measured truth back to the capacity bar, so the bar never contradicts the canvas. Two-column surfaces (print, WhatsApp) additionally fall back from the carousel split to a **balanced split** when the carousel's heavy side won't fit a column.

**Footer density** (`auto` / full / compact / minimal, in document settings): full = stacked legend + dashed support box + meta; compact = single-line legend + plain support line + meta; minimal = legend line + meta. Auto compacts only when a heavy week needs the room.

**Splits per channel.** The day strip's split handles (§9) set the global carousel parts. Channels resolve against capacity independently — Stories fit fewer rows than feed, so a range that's 2 parts on IG may auto-suggest 3 on Stories; suggestions are accepted, never silently applied.

**Capacity meters.** Every day in the editor carries a fits / tight / over indicator per active channel — Thursday goes amber as you add its eighth event, before you ever open a preview.

**Auto-legend.** Legends list only codes/flags present in the rendered part's source. No `$` events → no `$` line.

**Thumb check.** Preview toggle rendering the active part at ~300px wide (WhatsApp/IG thumbnail). Day blocks and date range must read at thumb; rows read at full size.

## 7. Day colors — the locked palette, glued to weekdays

Year 2 locks 7 accents; the mapping is **keyed to the weekday, not the position** — a range starting Thursday reorders the sequence but THU stays THU-colored. Regulars learn the code; that recurring mapping *is* the navigation aid.

| MON | TUE | WED | THU | FRI | SAT | SUN |
|---|---|---|---|---|---|---|
| yellow `#fddf00` | green `#43b02a` | blue `#18a7e0` | purple `#6e3179` | pink `#ed1b72` | red `#ed2224` | amber `#fdb515` |

Ink text on all blocks except purple (Thursday), which takes cream (`--on-ink` logic); Night theme uses the lifted purple (`#9a4faa`). Mapping is overridable per document but the default should almost never move.

This is a deliberate, documented exception to the poster system's category-coding: on schedule surfaces, color codes **days**, not event categories.

## 8. Looks — the style system

Curated variation without poster-level control: a **Look** is a named preset bundling layout architecture, day-block treatment, type scale relationships, and footer composition — every Look defined for every channel, all token-true (palette, type roles, hard corners, down-shadows are never optional). Looks live in one config module (`schedule-looks.jsx`); adding one touches nothing else.

All weekly surfaces share the Year 2 **masthead**: canonical wordmark + ĐÀ NẴNG eyebrow, the header title as a tracked Montserrat label, the date range as a **stamped chip** (2px ink border, paper fill, down-shadow), under a **3px masthead rule**; footers sit on a 3px rule of their own. Carousel arrows are a consistent ink pair (forward right, back left) — feed only.

Launch set — four Looks spanning the brand's energy spectrum (**Ledger, Stack, and Grid shipped in v1**; Marquee is Phase 3):

- **Ledger** *(default — structured)*: the refined time-table. Day rail left, aligned time column, generous cream, quiet footer. The everyday workhorse; closest in spirit to what regulars know, executed properly.
- **Stack** *(structured-plus)*: full-width day banners — each day a color bar spanning the canvas with its date, events beneath. Bolder color presence, strong vertical rhythm; reads beautifully as a carousel where each part is a wall of color-coded bands.
- **Grid** *(modular)*: the brand's square-cell grid made literal — bordered day cells with color-strip headers (4×2 on landscape print, 2-up on digital), the odd cell carrying legend + wordmark + QR. Strongest on print and TV where the whole range shows at once; a cell that truly can't fit its day shows an ink **+ MORE** tab rather than hiding the cut silently.
- **Marquee** *(expressive — special weeks)*: oversized day typography as structure — Montserrat Thin 100 day names at display scale, ghosted behind or interlocked with the event stack, color blocking with multiply interactions. Anniversary weeks, festival runs, holiday programming.

Global style dials (the only ones — deliberately few):
- **Theme** *(shipped)*: Day (cream) / Night (cream-on-ink, purple lifts to `#9a4faa`) for digital channels; print always Day on white.
- **Footer density** *(shipped)*: auto / full / compact / minimal (§6).
- **Ink-saver** (print): day blocks render as 2px ink outlines with an accent edge instead of solid fills — toner-friendly A4 runs. *(Phase 2)*
- **Type density**: handled by the auto-fit ladder, surfaced read-only — not a knob to fiddle.

Per-event appearance is a three-step **emphasis ladder**, honored by every Look so a big party stands out in Ledger and Stack alike:
- `none` — standard row.
- `bold` — Montserrat 700 UPPERCASE row with a day-accent underline bar.
- `banner` — the row becomes a full-width day-accent block (ink text, stamped shadow) — the ANNIVERSARY PARTY treatment.

Beyond that ladder, per-event styling deliberately doesn't exist. If a week needs more art than Marquee provides, that's a Poster Studio job.

## 9. Interface

Three panes plus the day strip, same chrome family as Poster Studio (`rs-*` skin), desktop-first (≥1024px full editor; below that, read-only preview + export still work).

```
┌──────────────────────────────────────────────────────────────────────┐
│ TOPBAR  Reality SCHEDULE STUDIO · ‹ Jun 8 – Jun 14 › · Look: Ledger  │
│         [Last range ⟳] [Paste] [CSV] [Notion ⇣]    Export: PNG PDF ALL│
├──────────────────────────────────────────────────────────────────────┤
│ DAY STRIP  ◄█ MON █ TUE █ WED █ THU ║ FRI █ SAT █ SUN █►            │
│            drag ends = range (any start day, 1–10 days)              │
│            drag ║ handles = carousel splits · per-day capacity dots  │
├──────────────┬───────────────────────────────────┬───────────────────┤
│ DAYS (left)  │ PREVIEW (center)                  │ INSPECTOR (right) │
│              │                                   │                   │
│ ▾ MON 8.6 ●  │ tabs: IG · FB · Stories · WA ·    │ Selected event:   │
│   17:00 How  │       Print · Daily ▾ · (TV)      │  date · start·end │
│   19:00 Boa  │                                   │  title (+short)   │
│   + quick add│ [ live render of active channel,  │  locations chips  │
│ ▾ TUE 9.6 ●  │   part pager when carousel ]      │  flags · emphasis │
│   …          │                                   │  hide-on channels │
│ ▸ SUN 14.6 ⊘ │ zoom · thumb-check · capacity bar │ ── no selection:  │
│   CLOSED…    │ safe-zone overlay (Stories)       │ channel settings, │
│              │                                   │ theme, footer     │
└──────────────┴───────────────────────────────────┴───────────────────┘
```

- **Day strip — the range slider.** The whole range as a row of color-coded day chips: drag the ends to set start/length (any weekday, 1–10 days), drag the split handles between chips to set carousel parts. Capacity dots per chip, per active channel. This one control answers "start from any day" and "where does part 2 begin" in the same gesture.
- **Left — days as a list.** Status toggle (open/closed + note), event rows, quick-add input per day speaking the §4 grammar. Click to select; drag a row onto another day to move it.
- **Center — live preview** of the active channel at fit-to-stage scale, with part pager for carousels, safe-zone overlay on Stories, thumb-check toggle, capacity meter. Clicking an event in the preview selects it (interactive, not a drag canvas).
- **Right — inspector.** Selected event → full row editor. Nothing selected → active channel's settings + document style (Look, theme, footer toggles).
- **Keyboard path:** enter the whole week without the mouse — quick-add per day, `Tab` between fields, `Enter` commits, `Delete` removes selection (guarded while typing).
- Motion per tokens: parts stamp in with `--ease-stamp`/`--stagger`; `prefers-reduced-motion` ships end-states.

## 10. Architecture & delivery

Sibling of Poster Studio, same zero-build philosophy:

```
public/schedule/
  index.html             ← React 18 UMD + Babel standalone + CDN libs (noindex, like /studio)
  schedule-data.jsx      ← model, parsers (quick-add/paste/CSV), registry, defaults
  schedule-import.jsx    ← CSV mapper UI, Notion pull + diff view
  schedule-layout.jsx    ← measuring/auto-fit engine + part renderers
  schedule-looks.jsx     ← the Look definitions (Ledger/Stack/Grid/Marquee)
  schedule-channels.jsx  ← channel preset registry + per-channel frames
  schedule-app.jsx       ← shell: day strip, panes, inspector, export
  schedule.css           ← rs-* chrome + reality-tokens.css
tools/serve-schedule.cjs ← static server (port 4502) + /api/notion proxy
tools/schedule-notion.config.json  ← integration token + DB id (gitignored)
Schedule Studio.bat      ← launcher, clone of Poster Studio.bat
```

- **Deploys for free**: under `public/`, ships with the site build to `realitydn.com/schedule` (noindex/nofollow). The deployed copy has everything except Notion pull (local-proxy-only until/unless a `worker/` endpoint is wanted — Phase 3).
- **Shared brand assets**: `reality-tokens.css`, `reality-wordmark.svg`, real QR (matrix JS/SVG) — copied in, with a future `public/brand/` dedupe noted.
- **Export pipeline reused verbatim** from the Studio: html-to-image (`pixelRatio` 2 digital / 3 print), jsPDF (px_scaling), JSZip, the render-settle-capture loop for multi-part exports.
- **Persistence**: localStorage autosave (`reality-schedule-doc-v2`) + recent-ranges list (~12, capped) + explicit JSON download/upload as the permanent archive.
- **Not in scope**: publishing schedule data into the site's pages. The document format + layout engine are the obvious feed/component if a styled site schedule is ever wanted (Phase 3+).

## 11. Phasing

**Phase 1 — shipped (replaces the current workflow end-to-end):**
data model + editor + day strip (any-start range, splits) · **Ledger / Stack / Grid** looks · Year 2 masthead + 3px rules + date stamp · **Day / Night theme** · IG/FB feed carousel (ink arrow pair) · Stories (filled, no arrows) · **WhatsApp share card** · print A4 PDF · daily story + feed cards · emphasis ladder · measured auto-fit + footer density ladder + balanced-column fallback + capacity meters + auto-legend · quick-add/paste + CSV import + last-range clone · PNG/PDF/ZIP export · localStorage + JSON archive · launcher + deploy.

**Phase 2 — the automation dividend:**
Notion pull via local proxy + diff view (schema mapping against the existing DB) · counter card A5 · thumb-check · per-channel split suggestions · ink-saver print.

**Phase 3 — reach:**
**Marquee** look · TV 16:9 · worker-based Notion endpoint for the deployed copy · shared `public/brand/` dedupe · site schedule page fed by the same documents.

## 12. Status

- **Notion** — DB exists but isn't fully current yet. Interim: Claude pulls from Google Calendar and emits `Schedule Studio CSV v1` (§4) for import. Phase 2 maps the pull against the real DB schema.
- **WhatsApp** — confirmed priority channel; the 1:1 share card is Phase 1.
- **Looks** — Ledger / Stack / Grid / Marquee direction approved; per-event emphasis ladder (`bold` / `banner`) works in every Look. Ledger ships in v1.
