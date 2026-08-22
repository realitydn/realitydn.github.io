# Handoff: REALITY website + app — Year 2 ink-mark pass

**Rev 22.08.2026.** Self-sufficient: a developer who was not in the design
conversation should be able to build from this file alone.

---

## Overview

This package covers a design pass across two surfaces — the **REALITY
website** (`realitydn.com`) and the **REALITY app** (guest + staff) — adding
three things and fixing a fourth:

1. **The ink strip and square placed throughout.** REALITY's second mark, the
   locked palette printed as a grid. One per surface, form chosen by the
   frame, mode chosen by the job.
2. **Motion for the mark.** Two engines (arrival, change) plus idle life,
   retimed for screen instead of poster.
3. **The full layout of both surfaces** — every page, screen, popup, overlay,
   and the states nobody designs until they ship broken: empty, loading,
   error, offline, stale, permission-denied, end-of-list.
4. **Keyboard focus**, which had never been designed for the Year 2 system and
   was inheriting a rounded blue browser ring on every surface.

REALITY is a bar/cafe/community space in Đà Nẵng, Việt Nam — 86 Mai Thúc Lân,
open daily 11:00–02:00. The design system has a **silkscreen / riso** DNA:
cream paper, ink rectangles, hard flat down-shadows, misregistered colour, and
**zero border-radius anywhere**. It runs as one tokened theme flipping between
**Day** (ink-on-cream) and **Night** (cream-on-ink).

---

## About the design files

**The files in `prototypes/` are design references written in HTML. They are
not production code and should not be copied into the app.**

They are laid out as *canvas sheets* — many frames positioned absolutely on
one pannable surface — so that a whole surface can be reviewed at once. That
presentation is a review tool and has nothing to do with the product.

The task is to **recreate these designs in the target codebase's own
environment and patterns** — the website is React + CSS, the app is React
Native; use each one's established components, routing and styling approach.
Where no pattern exists yet, choose one appropriate to that codebase.

What to lift verbatim: **token values, geometry, type specs, motion
parameters, and the rules in this document.** What to rebuild: everything else.

**Vendored assets note.** `prototypes/treatment/image-slot.js` and
`doc-page.js` are review-harness components (drag-and-drop image placeholders,
print shell). They have no product equivalent — every `image-slot` in the
prototypes marks a spot where **client-supplied photography** goes.

---

## Fidelity

**High-fidelity.** Final colours, typography, spacing, geometry, motion
parameters and interaction states. Recreate the UI precisely, using the
codebase's existing libraries where they can hit these values and overriding
them where they cannot — in particular, **any base component library that
rounds corners must be overridden to 0**.

Two explicit exceptions to "final":

- **All brand copy is placeholder.** Every event title, qualifier, page body,
  menu description and quiz question in these files was written by the design
  agent as realistic-length filler. **Donald writes all real copy.** Treat the
  strings as lorem with good manners — correct in *shape* (length, wrapping
  behaviour, presence or absence of a qualifier), wrong in *content*.
- **The Vietnamese strings are typographic fixtures, not translations.** They
  exist to stress diacritic stacking, uppercase line-height and string length.

---

## The non-negotiables

These are the rules most often "corrected" by mistake. Full list in the
project's `CLAUDE.md`.

- **Zero border-radius. Everywhere. No exceptions.**
- **Borders carry structure, not fills.** 2px ink standard, 1.5px section
  rules, 3px mastheads/footers/plate edges.
- **Majors carry meaning, minors carry mood.** Blue takes eyebrows, links and
  wayfinding; yellow takes notices and deals; red takes the imperative. No
  minor takes a UI job — except the ratified quiz choice-hue case (G3 below).
- **The accent is theme-aware.** Day leads blue, Night leads pink. Never a
  fixed default, never hand-set per context.
- **Never hardcode a weekday hue.** Components read `--day` / `--on-day`.
  Renderers that cannot read CSS vars import `tokens/day-colours.json`.
- **Montserrat names, Space Grotesk states facts.**
- **Case is set by register, not element.** `.reg-far` (poster, banner,
  signage, TV) takes caps; `.reg-near` (app list, web body, menu, ticket)
  is sentence case.
- **12px is the informational floor** — anything you would act on: a time, a
  room, a price, a date. 11px is decorative labels only.
- **One ACTION (red) button per screen.** Touch targets ≥ 48px.
- **`--fg-faint` is .56 Day / .48 Night.** These are WCAG-corrected values;
  the older .45/.32 fail AA and are still live on the public site.
- **`--surface-2` `#f4ecd7` and `--paper-shade` `#ece2c9` are not tints** —
  they are two shades of unprinted stock. Collapsing them onto `--bg` makes
  every inset, skeleton and placeholder invisible in Day.
- **Day shadows are heavier than Night** (.10/.16/.23 vs .14/.18/.26). The
  asymmetry is deliberate; print is exempt.
- **No opacity-only fades. Stamp, don't fade.**
- **Never strip Vietnamese diacritics.** Uppercase VI needs line-height 1.3.
- **The wordmark is a mixed-font vector** — ship
  `assets/wordmark/reality-wordmark.svg`, never re-typeset from live text.
- **Site string on artwork is `realitydn.com`** — bare host.

---

## MIGRATION — do this first

**The `events` schema needs `name` and `qualifier` as separate fields.**

Every calendar row on both surfaces depends on it.

```
name       string   required   wraps to 4 lines · never truncated · never text-transformed
qualifier  string?  OPTIONAL   one line of detail · omitted ENTIRELY when absent
```

`qualifier` is genuinely optional — an absent qualifier must render **no
element at all** and the row closes up. Do not render an empty node; the
row's vertical rhythm depends on it collapsing. Three of the seven fixtures in
the prototypes have no qualifier on purpose: a calendar where every event has
a subtitle is not the calendar REALITY has.

The CSS pair ships as `.name-block` (the stack) / `.type-sub` (the qualifier).

---

## Screens / Views

### Website — `prototypes/Website - Full Layout.html`

Authored at **1200px**. Band-based: each page is a stack of full-width
`<section class="band">` with an inner `.band-in` (flex column, `gap: 24px`,
`padding: 76px 64px` at desktop).

Band backgrounds carry meaning and are the only place colour fills appear:

| Band | Background | Job |
|---|---|---|
| `.b-paper` | `--bg` cream | default |
| `.b-wayfind` | `--blue` `#18a7e0` | what/where/when — hero, visit, subscribe |
| `.b-notice` | `--yellow` `#fddf00` | notices and deals — happy hour, door times |
| `.b-act` | `--red` `#ed2224` | the imperative — one per page maximum |

Coloured bands re-declare `--fg: #0d0905` / `--bg: #fffbf1` so text on them is
always ink. `.b-act` inverts to cream-on-red.

**Pages (6):**

1. **Home** — hero (`.b-wayfind`, display type + room shot, 1.05fr/0.95fr),
   this-week calendar, happy-hour notice, FAQ (2-col), app CTA (`.b-act`),
   menus preview with tabs, visit + map (`.b-wayfind`), 5-slot gallery
   (3-col, first slot spans 2 at 8:3). Footer.
   *The only page with two ink marks* — hero strip + footer QR square, under
   the poster exception.
2. **Events** — filter chips, then a sticky left rail (200px) beside seven
   day-owned sections. Each section: day plate, date, a full-width `--day`
   swatch bar, and an event card (1fr / 220px poster at 4:5).
3. **Event detail** — 1.15fr/0.85fr hero with the title at display size, a
   5-item facts list, red RSVP + secondary calendar action; door-time notice;
   three more events; app CTA.
4. **Menus** — the nearest register on the site. Section head with a short ink
   strip, category tabs, 2-col drink rows (name / tagline / ingredients /
   price), happy-hour notice, coffee section, downloads.
5. **Visit** — address block + map (`.b-wayfind`), 4-col room list
   (1L / 2L / 2E / 3P), QR block, FAQ.
6. **Host an event** — 3-step process, restrictions notice, numbered rules
   list, 2-col proposal form (`.field.wide` spans both), red submit, WhatsApp
   CTA.

**Popups (6):** mobile nav drawer (full-surface), subscribe-to-calendar
dialog, RSVP dialog, gallery lightbox (ink plate on an 82% scrim, 32px inset),
community-join dialog with QR, and banners + toast.

### Website responsive — `prototypes/Website - Responsive.html`

Home and Events at **390 / 768 / 1200**. Each frame has a *"Show focus"*
toggle in its header, because focus is `:focus-visible` only and therefore
invisible in a static review.

- **768** — every 2-col split collapses; the events rail goes horizontal above
  the days; masthead nav wraps to its own rule below the wordmark; display
  type steps to 58px; hero image to 16:9.
- **390** — masthead collapses to wordmark + theme toggle + MENU (the nav
  lives in the drawer, already a designed popup). Display 38px. Buttons
  full-width. **The event row re-stacks rather than shrinking**: when / name /
  meta become three rows. `--dt` (facts label column) to 100px.
- **The phone hero is full-bleed** — it breaks the band padding
  (`width: calc(100% + 40px); margin: 0 -20px`), drops its border and shadow,
  and runs 4:3 edge to edge under the copy. A 5:4 bordered card beside display
  type works at 1200 and becomes a stamp at 390, so the *strategy* changes,
  not the size. Same move on the event poster and the Visit map.
- **Borders never thin.** 2px stays 2px; mastheads and footers stay 3px.
- **Nothing informational drops below 12px** at any width. The type ramp
  compresses from the top down.

### App — `prototypes/App - Full Layout.html`

390 × 844 phone frames, plus two 1000px "big screen" (TV) frames.

**Navigation: two three-tab sets, never four.** Backstage was a staff tool
sitting in a guest tab bar.

- Guest: **What's on** / **Menu** / **You**
- Staff: **Shift** / **Sidework** / **Games**

Tab bar: 60px min height, 24px icons, label always visible at 10px/700
Montserrat, `.is-on` marked by a 44px ink bar above the icon.

**Screens (15):** splash, now/tonight, calendar, event detail, RSVP'd plans,
menu, call staff, quick-fingers round, leaderboard, event check-in, you,
shift, sidework board, task detail, big-screen quiz, big-screen quick fingers.

**Night is the default on five of them** — quiz, quick fingers, leaderboard,
check-in and both big screens. A quiz runs in a dark room and the phone is the
brightest thing at the table. Each frame is labelled where this applies.

**Overlays (9):** RSVP sheet, reminder picker, calendar filter, member card,
call staff, void-a-task confirm, sign in, toast + offline banner,
notification permission. All share one plate vocabulary — see below.

### App states — `prototypes/App - States.html`

Eight states. The rule that decides all of them: **a state is a fact, not a
mood.** No illustration, no apologetic tone. An ink plate states what is true
and offers exactly one way out.

1. **Loading** — skeletons at the *exact geometry* of the real rows so nothing
   moves when data lands. Blocks are `--surface-2` / `--paper-shade`.
   *This is the pre-audit bug in the wild:* with `--surface-2` collapsed onto
   `--bg`, as the live site still has it, this screen renders blank.
2. **Empty — no events.** States the fact, gives the next real date, offers
   the action that fixes it. Does not apologise.
3. **Empty — filtered to nothing.** Filters stay visible and stay on; the way
   out is removing a filter, not a generic retry.
4. **Error — load failed.** Ink plate, **not red** — red is the imperative and
   a failed fetch commands nothing. Retry is the action. Keeps a quiet
   reference code because staff read these over the bar.
5. **Offline** — a banner, not a takeover, because the cached calendar is
   genuinely useful. Yellow with ink on it. Only freshness is qualified.
6. **Stale** — the one that matters most: an event detail the app can no
   longer verify. Content stays; the RSVP **drops to secondary** until data is
   fresh, so it never looks safe.
7. **Permission denied** — states what is lost, routes to the OS. No nagging,
   no second modal.
8. **End of list** — past events at `--fg-faint`, terminating with a fact
   instead of a spinner that never resolves.

Skeleton animation is a **re-stamp, not a shimmer**: `scaleY` 1 → .55 → 1.06 →
1 over 2.4s, staggered 180ms per row.

### Vietnamese — `prototypes/Vietnamese - Real Length.html`

Five cases: calendar at real VI length, uppercase display type, mixed VI/EN,
big screen, and a deliberate four-line overflow.

- Uppercase VI **line-height 1.3** (1.05 clips diacritics).
- Display **weight 200** under `:lang(vi)` — at 100 the hairline strokes on
  Đ, Ố and ậ disappear at distance.
- The when-column is sized for **Th 2 – CN**, which is *wider* than Mon–Sun.
  Size for VI and let English have room to spare, never the reverse.
- **Proper names keep their own capitalisation** inside VI sentences —
  REALITY, Cỏ Cây, Board Game, English. No string may be run through a blanket
  `text-transform`; the uppercase lives on the container, never the data.
- Plan for VI running **15–30% longer** than EN.

---

## Overlays — one vocabulary, both surfaces

A popup is the same object on the website and in the app.

```
.scrim     rgba(13,9,5,.66)   ·  .lit variant .82 (lightbox)
.plate     --bg, 3px ink border, box-shadow 0 13px 0 rgba(13,9,5,.30)
.plate-h   14px 18px, 3px bottom border, 12px/700 uppercase label + 44px ✕
.plate-b   20px 18px, flex column, gap 16px, items flex-start
.plate-f   16px 18px, 3px top border, buttons flex:1
```

Variants: `.sheet` (bottom, 56×5px grip), `.dlg` (centred, `min(560px, 100% −
64px)`), `.dlg-sm` (420px), `.drawer` (full surface, no border/shadow),
`.lbx` (lightbox — ink plate, 32px inset, caption row with tabular counter).

`.toast` — ink plate, cream text, `0 9px 0` shadow, one line of fact plus one
underlined action. **Never a colour.**
`.banner` — yellow with ink text for notices, `.is-ink` variant for failures.
Neither takes an ink mark: they are sentences, not surfaces.

---

## The ink mark — placement

Spec: `tokens/ink-strip.json`, `decisions/ink-strip.html`.

**One mark per surface.** The frame picks the form (long edge → strip, square
or tiny frame → square); the job picks the mode.

Forms: `strip-v`, `strip-h` (2×9), `strip-short-v`, `strip-short-h` (2×2),
`square` (4×4), `square-anchored`.
Modes: `full` (8 colours), `majors` (3 + neutral), `daycode` (1 hue), `ink`.

**Rules that were broken during this pass and are worth stating:**

- **Never a `full` mark on a field that owns one of its colours.** A full strip
  on the blue wayfinding band loses its blue cell and the silhouette opens.
  Use `ink` mode there.
- **Never a mark on a day-coded field** in `daycode` mode — the field is
  already the hue. Use `ink`.
- **No mark beside a decision.** RSVP, void, pay: the mark is either absent or
  `data-idle="off"` and static. A plate that recolours next to a decision
  reads as a status light.
- **No mark on photography.** In the lightbox the photo is the subject.
- **QR pairing is 1 : 8.25** — mark module = QR module × 8.25, which makes a
  4×4 square exactly as tall as the code. The code's four-module quiet zone
  *is* stock, so the square **butts flush**: no gap, no rule between them.
- **The mark is decorative.** It carries no information and no UI job. Ship
  `aria-hidden="true"`.
- **Cell order is fixed.** Recolouring is the parameter; reordering is not.
- **`isolation: isolate` for misregister plates must sit on a
  background-LESS ancestor.**

Component contract (data attributes in the prototypes; props in a real
component):

```
form   strip-v | strip-h | strip-short-v | strip-short-h | square | square-anchored
mode   full | majors | daycode | ink
day    mon..sun                    (daycode only — hue from day-colours.json)
module px                          (floors: strip 8, short 6, square 6)
substrate paper | lit | ink        (sets stock + purple; lit forces keylines)
pass   A1..A5                      arrival
swap   B1 | B3 | B4 | B5           change
idle   off | slow                  default on
chain  selector list               A4 only — outward, never inward
ground on                          opt-in; see G2
```

---

## Interactions & Behaviour

### Motion — the two engines

`prototypes/treatment/ink-motion.js` is the reference implementation; the
canon card is `decisions/ink-strip-motion-applied.html`.

**Engine A · press pass** (arrival). Cells scale 0 → 1 in token order.
`ink-stamp-in`: `0% scale(0) · 62% scale(1.11) · 100% scale(1)`.
**Scale only — never opacity.**

| Set | Stagger | Cell | Job |
|---|---|---|---|
| A1 | 95ms | 430ms | full pass — first contact only |
| A2 | 46ms | 300ms | quick pass — the in-product default |
| A3 | — | 420ms | single plate — short strips, small modules |
| A4 | 95ms | 430ms | chained — hands the stagger outward to type (+150ms/step) |
| A5 | 60ms | 260ms | exit — reverse token order |

**These are the screen numbers.** The canon card's sets (A1 60/260 etc.) are
**poster scale** — a mark read once at distance on paper. On screen they read
as a blip. Print and poster renderers keep the card's numbers.

**Engine B · mode swap** (change). A cell pulls to 0, re-inks, pops back;
unchanged cells never move. Out 240ms `ease-snap`, in 360ms `ease-stamp`,
stagger 40ms (0 when the swap must land as one event).

- **B1** day tick — day-code hue advances on a real trigger, never a timer.
- **B2** theme flip — automatic, inside the 700ms settle. No attribute needed.
- **B3** mode ladder — cycles full → majors → ink.
- **B4** section hue — crossing a section boundary re-plates the day cells.
  Driven by "topmost visible section owns the hue", plus hover.
- **B5** void sets — cells drop out and return.

**Idle life.** Every 5.2s ± 2.6s jitter (`slow`: 8.2s ± 3.4s) one cell lifts
(260ms) and re-prints (380ms). **It never recolours** — a cell re-inks in its
own colour and lands where it was. Cell order is fixed and every mode already
spends its palette, so a hue changing on a timer would be *saying* something.
Stops off-screen (IntersectionObserver). A pass or a swap always wins; a swap
on a mark that also arrives waits for the pass to land plus 400ms.

`prefers-reduced-motion` renders the finished mark at frame one and kills all
of the above.

### Focus — the misregister plate

Canon 22.08.26. Card: `decisions/focus.html`. Spec:
`tokens/reality-tokens.json → focus.decided`.

**Two impressions of the same shape, one slipped.** The control is two parts:
a solid accent **plate** that stays exactly where the button is and never
moves, and the **face** — border, fill, label — which slips 4px up-left off
that plate.

```css
:focus-visible {
  transform: translate(-4px, -4px);
  box-shadow: 4px 4px 0 0 var(--accent);   /* the plate */
}
```

- **The plate is a spread-less box-shadow, not a pseudo-element.** A
  box-shadow paints behind the element's own background by definition, so the
  face fill can never be covered and there is no stacking context to get
  wrong. A `::after` plate at `z-index: -1` requires `isolation: isolate` on a
  background-less ancestor; put `isolate` on the element carrying the fill and
  the plate paints *on top of* it. Both halves of that trap were hit here.
- **The face must be opaque** or the plate shows through and reads as a fill.
  Faces that already carry a fill keep it.
- **The plate never shares a family with the surface.** Day leads blue and the
  wayfinding band *is* blue, so `--accent` is re-declared per band:
  blue field → pink, notice yellow → red, action red → yellow, day-code
  field → ink.
- **Three controls take an outline instead** —
  `outline: 2px solid var(--fg); outline-offset: 3px`, no transform:
  **inputs** (a hole in the paper, not a plate lifted off it), **coloured
  choice plates** (already a colour field), **bare text links** (no box).
- `:focus-visible` only; bare `:focus` gets `outline: none`. **Never reused**
  for selected, active, hover or current. List rows need 4px trailing room.
- Transitions in over 200ms `ease-snap`, so focus is the moment the press
  slips out of register. Reduced motion keeps the offset, drops the transition.

### Other interaction states

- **Hover lifts** `translateY(-2px)` + shadow to `--sh-default`.
- **Active presses BELOW rest** — `translateY(2px)`, shadow removed.
- **Theme flip is 700ms** via `html.theme-settling`, transitioning every
  surface, border, shadow and fill together, then releasing to interaction
  timing. `--dur-settle` (350ms) is *not* the flip.
- **Misregister is static** — 13/6 hero, 6/3 card. The drifting 9s/13s loop
  was retired; keep the transforms, drop the keyframes.

---

## State Management

Nothing here needs a store; it is all local or already server state.

| State | Where | Notes |
|---|---|---|
| `theme` | global | `light` \| `dark`, persisted. Drives `data-theme` on the root and every scoped preview. Sets `.theme-settling` for 700ms on change. |
| `events[]` | server | `name`, `qualifier?`, `day`, `date`, `time`, `room`, `kind`. **Needs the schema migration above.** |
| `filters` | screen | kind chips + weekday toggles. Empty-result state must show the active filters. |
| `rsvps[]` | server | plus a per-event reminder offset (1h / 2h / 1d / none) and an anonymous flag. |
| `dataFreshness` | screen | `fresh` \| `stale` \| `offline` — drives the banner and demotes the RSVP to secondary when not `fresh`. |
| `notificationPermission` | OS | `granted` \| `denied` \| `default`. Our own prompt precedes the system one. |
| `activeDay` | screen | events index rail; owned by the topmost visible section. |
| quiz round | server, live | question, choice set, per-choice slot letter, timer, locked-in count. |
| sidework tasks | server | task, points, done-by, void state. |

Data fetching: the calendar is the only thing polled. Everything else is
request-response. The offline case is a cached calendar, so cache it
deliberately rather than relying on HTTP caching.

---

## Design Tokens

Authoritative: `tokens/reality-tokens.json` (values + *why* each corrected
value changed), `tokens/reality-tokens.css` (drop-in custom properties),
`tokens/day-colours.json` (weekday hues, ink partner map, print values —
import this in any renderer that cannot read CSS vars),
`tokens/ink-strip.json` (the mark).

### Colour — palette is locked

**Majors** (meaning): yellow `#fddf00` notices/deals · red `#ed2224`
imperative/alerts · blue `#18a7e0` eyebrows/links/wayfinding.

**Minors** (mood): pink `#ed1b72` Thu/parties · amber `#fdb515` Sat/warm-late ·
green `#43b02a` Mon/community · purple `#6e3179` Wed
(**`#9a4faa` in Night** — the one plate whose value changes on the flip).

**Weekday map:** Mon green · Tue blue · Wed purple · Thu pink · Fri red ·
Sat amber · Sun yellow. Read `--day` / `--on-day`; never name a hue.

**Accent:** Day lead blue / second pink · Night lead pink / second blue.

### Surfaces

| Token | Day | Night |
|---|---|---|
| `--bg` | `#fffbf1` | `#0a0703` |
| `--surface` | `#fffbf1` | `#171109` |
| `--surface-2` | `#f4ecd7` | `#241a10` |
| `--paper-shade` | `#ece2c9` | `#1c140b` |
| `--fg` | `#0d0905` | `#fffbf1` |
| `--fg-dim` | `rgba(13,9,5,.72)` 9.1:1 | `rgba(255,251,241,.60)` 7.2:1 |
| `--fg-faint` | `rgba(13,9,5,.56)` 4.53:1 | `rgba(255,251,241,.48)` 4.84:1 |
| `--hairline` | `rgba(13,9,5,.16)` | `#3a2c1c` |
| `--on-ink` | `#fffbf1` | `#fffbf1` |

`--hairline` is AA-exempt: decoration only, never carries text, never the sole
indicator.

### Shadows — flat down-shift, big offset, almost no blur, no spread

Day: light `0 4px 1px rgba(13,9,5,.10)` · default `0 8px 2px …16` ·
heavy `0 13px 3px …23`.
Night: light `0 4px 1px rgba(255,251,241,.14)` · default `0 9px 2px …18` ·
heavy `0 14px 3px …26`.
Print is exempt and keeps .08/.12/.18 with heavy at 12px.

### Spacing — 4px ramp

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64 · 96`.
Semantic: screen-pad 20 · section-gap 16 · card-pad 20 · row-y 12 ·
**tap-min 48** · 4 columns · 12px gutter.

### Type

Families: `--mont` Montserrat (names, headings, labels, controls) ·
`--grotesk` Space Grotesk (facts, figures, body) · Montserrat Alternates is
**wordmark only** and the wordmark ships as a vector.

Tracking ladder, baked per role — no size-derived formula:
display `.015em` · h1 `.025em` · h2 `.04em` · name `0` · label `.16em` ·
button `.11em`. Offsets: print `+.01em`, signage `+.02em` (and weight 700).

Floors: informational **12px**, decorative 11px.
Figures: tabular in any column, proportional in running text, money
`45.000₫` — dot thousands, currency trailing, no space.

### Motion

Eases: stamp `cubic-bezier(.2,1.4,.45,1)` · snap `cubic-bezier(.3,0,.2,1)` ·
out `cubic-bezier(.16,1,.3,1)`.
Durations: tap 120 · quick 200 · settle 350 · enter/flip **700** · stagger 90.

### Radius

**0. There is no radius token.**

---

## Assets

- `assets/wordmark/reality-wordmark.svg` — the wordmark. Montserrat with
  Alternates substituted for the **A, I and Y only**. Ship the file; never
  re-typeset from live text. `reality-mark-R.svg` is the standalone R.
- `assets/qr/reality-qr-ink-on-cream.png` + `.svg` — real and verified
  (v2, 25×25, EC-M, 4-module quiet zone, decodable from 120px). Encodes
  `https://realitydn.com`. **Never invert them.** See `assets/qr/README.md`.
- **Fonts are Google Fonts only** — Montserrat (200,500,600,700,800),
  Montserrat Alternates (600), Space Grotesk (400,500,600). No local files.
- **Icons** are vector with 2px ink strokes, `stroke-linecap: square`,
  `stroke-linejoin: miter`, 24×24 viewBox. The set used here is inline in
  `prototypes/treatment/app.js` (`ICON`); the project's full library is
  `icons/icons.jsx`.
- **All photography in the prototypes is a placeholder.** Every
  `<image-slot>` marks a spot for client-supplied imagery, which runs through
  the riso treatments.

---

## Decisions — four calls closed 22.08.2026

Rendered records: `decisions/Focus States - Options.html` (G1) and
`decisions/Open Decisions - G2 G3 G4.html`. Both keep the rejected options on
screen, which is what makes a decision record useful later.

**G1 · Focus → the misregister plate.** Chosen over an offset ink outline, an
inset ink ring, and an accent slab. See *Interactions* above.

**G2 · Stock landing on an outer corner → NEITHER FIX.** `majors`, `daycode`
and the short strip all terminate on stock, so on cream the mark's outer
corner opens. **This is correct on screen and is not to be patched.** It keeps
the mark reading as ink laid *on* the page rather than a badge sitting on it,
and it is what makes cell-switching legible — a cell pulling to zero at the
edge opens the silhouette further instead of punching a hole in a patch.
Canon's outer-corner rule holds for **print only**. Automatic grounding was
removed; `data-ground="on"` remains for a mark over photography or a print
export. **Do not restore the background-comparison test.**

**G3 · Quiz choice hues → RATIFIED, scoped.** The quick-fingers round gives
four options four hues — A blue, B yellow, C green, D pink, fixed slot order
like the weekday map. **The scope clause is the load-bearing part, not the
hues: quiz choice sets only.** It does not license colour-coding event
categories, menu sections, room codes or tags. Ink text and a 2px ink border
on every plate; letter, colour and words always travel together so the hue is
never the sole carrier; **no hue ever means right or wrong** — correct is a
filled ink plate, incorrect is an ink strike; answered/unanswered is an inset
ink ring.

**G4 · Screen motion timing + idle life → RATIFIED, both parts,** as separate
tokens so idle can be tuned or dropped without touching arrival.

---

## Three bug classes found building this

Each is silent — no console error, no visible failure at the width or state
you authored in. Worth a grep.

**1 · Setting a flex axis on a grid container does nothing.** `.ft`,
`.ft-nav`, `.dr`, `.rule-i` and `.form` are `display: grid`, so
`flex-direction: column` on them is a no-op — the tracks stay put and content
walks off the frame. Collapse `grid-template-columns` instead.

**2 · A negative-z plate needs `isolation: isolate` on a background-LESS
ancestor.** With `isolate` on the element carrying the fill, the plate paints
on top of that fill; without it, the plate falls behind the band background
and vanishes. Prefer a spread-less box-shadow wherever the plate is a solid
offset rectangle.

**3 · Container-width layouts do not fire viewport media queries.** In the
real site these are viewport widths and the media queries do fire — but any
component rendered at a *container* width (a preview, an embed, a studio
canvas) hits this. **Container queries are the correct answer in the
codebase.**

---

## Known drift in the shipped codebases

The token bundle is correct; these are pending sweeps.

1. **Website `src/index.css` is pre-audit** — `--fg-faint` .45/.32,
   `--surface-2` collapsed onto `--bg`, Day shadows .08/.12/.18@12px. **Two AA
   failures are live on the public site.** It also never re-declares
   `--accent` in dark, so the site's Night still leads blue.
   *Newly urgent:* every loading skeleton is a `--surface-2` block, so with
   `--surface-2` collapsed the loading state renders as a blank page.
2. **`www.realitydn.com` on artwork** — bare host is canon. Literals in
   `public/print/print-data` (~40 presets), `print-export`,
   `public/schedule/schedule-render`, `public/studio/studio-data`,
   `public/event-report`.
3. **Studios carry weekday hex literals** — should import `day-colours.json`.
4. **The site still animates the hero misregister** — `cal-echo-a/-b` and the
   `-lg` variants. Keep the transforms, drop the keyframes.
5. **Blue and yellow under-deployed** — button roles measure 53 / 4 / 2
   against 249 structural buttons.
6. **~90 app keyframes live only in app source.** The sets are canon; the
   bodies need one export pass.

---

## What this package does NOT answer

- **All brand copy**, in both languages. See *Fidelity*.
- **No auth, payment or ticketing flow.** Sign-in is one sheet — no code
  entry, no error, no rate limit.
- **No print surfaces this pass.** Schedule, poster and print studios are
  untouched and the ink mark has not been placed on any of them.
- **No page-transition or route-change motion** — only the mark and the
  existing component set.
- **Tablet is Home and Events only.** The other four pages have 1200 and 390
  rules but were not laid out at 768.
- **Data volume is untested.** Seven events, one week. Not a month view, not a
  day with five overlapping events, not a room with none.
- **The ink mark's perf ceiling.** Each idling mark holds a timer plus an
  IntersectionObserver; untested above ~6 marks on a page. The
  one-mark-per-surface rule should hold it there, but the studios could break
  it.

---

## Files in this package

```
README.md                     ← this file, self-sufficient
HANDOFF.md                    ← shorter checklist version

prototypes/
  Website - Full Layout.html    6 pages + 6 popups, 1200px
  Website - Responsive.html     Home + Events at 390 / 768 / 1200
  App - Full Layout.html        15 screens + 9 overlays
  App - States.html             8 empty / loading / error / offline states
  Vietnamese - Real Length.html 5 VI stress cases incl. overflow
  treatment/                    the shared CSS + JS the sheets are built from
    core.css                    tokens, bands, components, FOCUS CANON
    website.css  app.css        per-surface components
    overlays.css                sheets, dialogs, drawers, lightbox, toasts
    ink-mark.css  ink-mark.js   the mark renderer
    ink-motion.css  ink-motion.js  both engines + idle life
    ink-ground.css              opt-in ground (see G2)
    site-pages.js  app.js       page and screen content
    app-overlays.js  app-states.js  app-vi.js
    *-sheet.css                 review-canvas geometry only — NOT product
    image-slot.js  doc-page.js  review harness — no product equivalent
  assets/                       wordmark, QR, referenced by the sheets

decisions/
  Focus States - Options.html   G1 — four candidates, C marked canon
  Open Decisions - G2 G3 G4.html  G2/G3/G4 with rejected options rendered
  focus.html                    the focus canon card
  ink-strip.html                the mark: grid, modes, placement, Studio contract
  ink-strip-motion-applied.html the motion canon card (poster-scale numbers)
  decisions.css                 canon-card styling

tokens/
  reality-tokens.json           values + why each corrected value changed
  reality-tokens.css            drop-in custom properties, Day + Night
  day-colours.json              weekday hues, partner map, print values
  ink-strip.json                the mark spec

assets/
  wordmark/  qr/
```

**Not bundled, read in the project:** `CLAUDE.md` (the precedence chain and
the "six things corrected by mistake" list) and
`design_handoff_reality_system/README.md` (the full written spec for the
system this pass sits inside).

### Precedence when sources disagree

```
tokens/reality-tokens.json + day-colours.json + ink-strip.json   ← the contract
        ↓
this README  /  design_handoff_reality_system/README.md
        ↓
decisions/*.html — the canon cards
        ↓
prototypes/*.html — design references
        ↓
any shipped codebase — may be stale
```
