# Handoff: REALITY Night v2 — "Cream Tickets"

## Overview
A new **Night / dark theme** for every REALITY surface: guest app, staff sidework app, the Backstage desktop backend, and the public website. It replaces the current night look, where three stacked dark surfaces carry neon pink. In the new look:

- **Ink page.** One dark only.
- **Cream "tickets."** All reading content sits on cream cards with ink type.
- **Majors only.** Blue, red and yellow are the only accents, and each has one job.
- **Print offset shadows.** Each ticket gets a hard, unblurred offset "print" shadow in its category colour, drawn from the brand's riso misregistration.

## About the Design Files
The files in this bundle are **design references created in HTML**: static prototypes that show the intended look. They are **not production code to copy**. Recreate them in the target codebase (the shipped app at `app.realitydn.com`, `src/app/globals.css` and its components) using its existing patterns.

- **Tokens.** Lift the token layer in `tokens/night-cream-tickets.css` into the codebase's token system.
- **Layouts.** Rebuild the components and layouts natively.

## Fidelity
**High-fidelity.** Colours, type, borders and offsets are final. Layout and copy on the staff and Backstage screens are **representative**: the designer did not have the real sidework/backend feature list. Keep their real information architecture and apply this skin to it.

---

## Why the colours changed (rationale)

**1. Pink is retired as the lead.**
- **The contradiction.** The palette rule says "lead with the three majors," yet `--accent` defaulted to pink, a minor.
- **Its reach.** `--accent` is the most repeated colour signal in the product: every focus ring, the nav marker, eyebrows and the misregistration echo. That made a minor the brand's loudest voice at night.
- **The audit.** Minors took **63%** of on-palette colour on the app home page (see `guidelines/canon-open-questions`).
- **The change.** `--accent` now points to **blue**, and `--accent-2` to **red**. Pink, amber, green and purple remain in the palette for posters and day-coding but no longer appear in Night UI chrome.

**2. Each major gets exactly one job.** A colour that means one thing can be read at a glance in a dark bar.
- **Blue `#18a7e0` = lead.** Selected state, active nav, focus, eyebrows, live music, the default print shadow.
- **Red `#ed2224` = action.** The single converting button per screen ("Get ticket", "Clock in", "Submit count", "Publish"), plus genuine alarms: below par, an uncovered shift, notification counts. **Ink text on red**: cream-on-red measures 4.19:1 and fails AA; ink measures 4.6:1.
- **Yellow `#fddf00` = deal / progress.** Happy hour, drink deals, games, sidework completion.

**3. The dark stack collapses to one dark.**
- **Before.** `#0a0703` page → `#171109` surface → `#241a10` inset, plus cream down-shadows. Three near-identical darks offered no real hierarchy and made every edge glow.
- **After.** `--surface` equals `--bg` (`#0a0703`), and night down-shadows are retired (`none`).
- **Hierarchy now comes from cream.** The strongest contrast in the system, ink against cream, is spent only on what you read.

**4. Cream is the reading surface.**
- **What.** Cards, menus, forms, passes and the event editor are cream `#fffbf1` with ink `#0d0905` type: the Day palette, contained.
- **Why.** Body copy at 13–15px is far easier to read ink-on-cream than cream-on-ink at 1am. The ink page still reads as Night.
- **The test.** "Can I read this at the bar?" → it's on cream. "Is this chrome or navigation?" → it's on ink.

**5. The print offset replaces the glow.**
- **The rule.** Tickets cast a flat, unblurred offset shadow (`7px 7px 0`) in their category colour. This is DNA rule 3 (down-shadow) merged with the misregistration motif: a second ink layer printed slightly off.
- **Colour budget.** Most colour on screen comes from this offset, the ticket top bar and the date block: thin, deliberate strips rather than full fills.
- **Neutral tickets.** Menu, settings, stock and other non-event tickets use a faint cream offset (`rgba(255,251,241,.28)`).

**6. The day-of-week code is replaced on event UI by category → major.**
- **The problem.** Seven days in seven hues carried no rank, and four of the seven were minors, including the busiest night of the week.
- **The new mapping.**
  - Music → blue
  - Party → red
  - Games and Drinks → yellow
  - Film and Talk → **neutral**: an ink block on cream, no hue. Not everything needs colour, and that keeps the majors meaningful.
- **Out of scope.** The `.d-*` classes may stay for posters and print. They are no longer used in Night app UI.

**7. Staff roles reuse the majors.** In Backstage and sidework, the majors code staff role: **bar = blue, floor = red, café = yellow**. Uncovered or open shifts are **dashed red outlines**. Days off and drafts are **dashed cream outlines** with no fill.
- **Open decision.** This gives red a second meaning in staff tools. The alternative is neutral tickets with role initials only. Confirm with design.

---

## Design Tokens
See `tokens/night-cream-tickets.css` (additive; load after the existing `tokens/colors.css` and `tokens/shadow.css`).

**Base palette (unchanged, locked)**
- **Ink:** `#0d0905`
- **Night page:** `#0a0703`
- **Cream / paper:** `#fffbf1`
- **Cream-2:** `#f4ecd7`
- **Paper-shade:** `#ece2c9`
- **Majors:** blue `#18a7e0`, red `#ed2224`, yellow `#fddf00`

**Night role tokens**
- **Page and chrome:**
  - `--bg` / `--surface`: `#0a0703`
  - `--fg`: `#fffbf1`
  - `--fg-dim`: `rgba(255,251,241,.62)`
  - `--hairline`: `rgba(255,251,241,.22)`
- **Ticket surface:**
  - `--ticket`: `#fffbf1`
  - `--ticket-fg`: `#0d0905`
  - `--ticket-dim`: `rgba(13,9,5,.72)` (secondary text on a ticket)
  - `--ticket-line`: `#0d0905` (2px internal dividers)
  - `--ticket-hairline`: `rgba(13,9,5,.16)` (1.5px row rules)
- **Print offset:**
  - `--print`: set per ticket (category colour, or `--print-neutral` = `rgba(255,251,241,.28)`)
  - `--sh-print`: `7px 7px 0` (hero, pass, detail, profile)
  - `--sh-print-sm`: `6px 6px 0` (feed list tickets)
  - `--sh-print-xs`: `4px 4px 0` (calendar tickets)
  - `--sh-print-xxs`: `3px 3px 0` (roster blocks)
- **Riso photo placeholder on a ticket:** `repeating-linear-gradient(45deg, #f4ecd7 0 14px, #ece2c9 14px 28px)`

**Contrast (all pass AA for text)**
- Ink on cream: 18.9:1
- Cream on ink: 19.3:1
- Ink on blue: 7.6:1
- Ink on yellow: 15:1
- Ink on red: 4.6:1
- `--ticket-dim` on cream: ≈ 8:1

**Unchanged from the system:**
- **Type:** Montserrat 700 uppercase for UI, Montserrat 100/800 for website display, Space Grotesk for body, Montserrat Alternates 600 for the "REALITY" logo box only.
- **Spacing, corners, motion:** the 4px spacing ramp, `border-radius: 0` everywhere, and the motion tokens.

---

## Core component: the Ticket
- **Container:** background `#fffbf1`, `2px solid #fffbf1` border (the outer edge is the cream itself), `box-shadow: 7px 7px 0 <print colour>`, hard corners.
- **Top bar (optional):**
  - Background = category colour; text ink, Montserrat 700, 12px, letter-spacing .12em, uppercase.
  - Padding 10px 16px; label left, meta right (`justify-content: space-between`).
  - `border-bottom: 2px solid #0d0905`.
- **Body:** padding 16px 18px 18px.
  - Title: Montserrat 700 uppercase, 26px, line-height 1, letter-spacing .02em.
  - Body text: Space Grotesk 14.5px / 1.55 in `rgba(13,9,5,.72)`.
- **Rows inside a ticket:**
  - Padding 14px 16px, gap 14px, `border-top: 1.5px solid rgba(13,9,5,.16)` (none on the first row).
  - Key labels: Montserrat 700, 11px, .12em, uppercase, dim colour, 62px fixed width.
- **Photo slot:** riso stripes on cream.
  - Centred label chip: cream background, 2px ink border, Montserrat 700 10px .16em.
  - Mandatory **logo box** bottom-left: ink background, cream text, Montserrat Alternates 600 15px uppercase, padding 4px 9px.
- **List ticket (event row):** 60px grid column + `1fr`.
  - **Date block:** category fill with ink text (neutral = ink fill with cream text); weekday Montserrat 700 10px .12em; date number Montserrat 700 22px; `border-right: 2px solid #0d0905`.
  - **Body:** padding 13px 15px 14px.
  - **Meta line:** "19:00 · Games", Montserrat 700 11px .1em, dim colour.
  - **Title:** Montserrat 700 17px uppercase.
  - **Subtitle:** 13px / 1.5, dim colour.
  - **Spacing:** list gap 18px; the offset is `6px 6px 0`.

## Shared chrome (Night)
- **Phone frame:** 390×844 content area.
- **App bar:** padding 13px 18px; `border-bottom: 3px solid #fffbf1`; lettermark "R" 20×26 in cream on the left; 22px icons on the right, gap 14px.
- **Bottom nav:** 4 equal columns, `border-top: 3px solid #fffbf1`, ink background.
  - Tab: padding 10px 0 12px; 24px icon; label Montserrat 700 9px .08em uppercase.
  - **Active tab:** cream fill, ink content, **solid** icon variant.
- **Screen padding:** 20px.
- **Eyebrow:** Montserrat 700 11px .15em uppercase, **blue**.
- **H1:** Montserrat 700 34px, .04em tracking, line-height .95, uppercase, cream.
- **Section header** ("Coming up · All 14"):
  - Montserrat 700 11px .15em; dim label on the left, cream count on the right.
  - `border-bottom: 2px solid #fffbf1`; padding-bottom 9px; margin 26px 0 14px.
- **Day strip:** 7 columns, gap 5px. Each cell has a 2px cream border, transparent fill, weekday 9px dim, date 16px. **Selected** cell = cream fill with ink text.
- **Primary CTA:**
  - Full width, padding 14px.
  - Red fill with ink text, Montserrat 700 13px .14em uppercase, 18px icon, gap 9px.
  - 2px border: ink inside a ticket, cream on the page.
- **Secondary button (on ink):** transparent, 2px cream border, cream text, same type as the CTA.
- **Ghost square (on ink):** 52px wide, 2px cream border, icon only.
- **Filter tabs:** 2px cream border, Montserrat 700 11px .1em, padding 8px 12px, gap 6px. **Active** = cream fill with ink text.
- **Badge:** Montserrat 700 10px .12em, padding 4px 7px, 2px ink border, major fill with ink text.
- **Happy-hour strip:** yellow fill, ink text, 2px yellow border, padding 13px 16px, martini icon 28px.
- **Notes / bulletins on ink:** 2px cream border, padding 14px 16px. Title Montserrat 700 11px blue; body 13.5px cream.

## Screens / Views
Every screen is in `explorations/Night - Cream Tickets.html`. Open it and pan the canvas; it has three labelled rows.

**Guest app (phone)**
1. **Welcome:**
   - Cream wordmark (full width) on ink, under the eyebrow "Bar · Café · Community".
   - Lede in dim cream.
   - 230px photo ticket with a blue offset.
   - CTAs pinned to the bottom: red "Tonight at Reality" and outline "Browse the week".
2. **Home / This Week:**
   - Eyebrow "Mon 05.10 · Đà Nẵng", H1 "This Week", day strip.
   - **Tonight hero ticket:** blue top bar "Tonight · 20:30 / Live Music", 128px photo, title, copy, red "Get ticket".
   - Yellow happy-hour strip.
   - "Coming up" list of event tickets. Category colour sets the date block and the offset: Games → yellow, Film → neutral ink, Party → red.
3. **Event Detail:**
   - Back link.
   - One long ticket: top bar → 190px photo → 34px title and story → rows for When / Where / Entry, with a blue "18+" badge.
   - Then a red CTA and a ghost "save" square, and "Also this week" with one list ticket.
4. **Drinks:**
   - Filter tabs.
   - Happy-hour ticket: yellow top bar and yellow offset.
   - Menu = one neutral ticket with ruled rows (26px icon, name, note, optional yellow "Happy Hr" badge, price in Montserrat 700 15px).
5. **Entry Pass:**
   - Ticket with a blue top bar ("Member #0286 / Valid tonight").
   - 200×200 QR (`assets/qr-ink.svg`, ink on cream, 12px quiet zone, 2px ink frame).
   - "Reality" in Montserrat Alternates 26px, member line, a **dashed perforation** (`2px dashed rgba(13,9,5,.35)`), then rows for Tonight / Perks.
6. **You:**
   - Profile ticket: 64px avatar (blue fill, 2px ink border, initial).
   - 3-column stats strip with an ink top rule.
   - Theme ticket with an ink switch and a blue knob.
   - Settings ticket with ruled rows.

**Sidework / staff (phone).** The nav is Today / Shifts / Sidework / Stock, and the app bar adds a "Staff" tag (2px cream border, 10px).

7. **Today:**
   - Shift ticket (blue): time 30px, crew line, red "Clock in".
   - Sidework progress ticket (yellow offset): progress bar 12px tall, 2px ink border, yellow fill with an ink right edge.
   - Tonight's event as a list ticket.
   - Manager note box.
8. **Shifts:**
   - Filter tabs Mine / Team / Swaps.
   - **Own shifts** = cream tickets with a role-coloured date block and offset.
   - **Day off / open shift** = dashed cream outline on ink.
   - Two outline buttons: Request swap / Time off.
9. **Sidework:**
   - Tabs Opening / Pre-shift / Close; progress bar on ink (cream border).
   - Checklist tickets grouped by station.
   - **Row:** 22px checkbox (2px ink; checked = ink fill with a cream check), task name, time or note, and a 26px initials chip filled with the role colour.
   - **Done** rows are struck through at 50% ink.
   - Red "Sign off opening".
10. **Stock Count:**
   - Red "Below par" ticket.
   - Count ticket: rows with name, unit/par, a red "Low" badge, and a stepper (2px ink, 30px − / + cells, 38px value cell).
   - Red "Submit count".

**Backstage (desktop, 1280×800).** Keep this sidebar for every Backstage screen at ≥1024px.

- **Sidebar:**
  - 224px wide, `border-right: 3px solid #fffbf1`.
  - Header: lettermark + "Backstage" label (Montserrat 700 11px .14em dim).
  - Items: padding 11px 20px, 20px icon, Montserrat 700 12px .1em uppercase, gap 12px.
  - **Active item:** cream fill, ink text, `inset 5px 0 0 blue`.
  - **Count pill:** red fill, ink text, 10px.
  - **User block** pinned to the bottom above a hairline.
  - Items: Events, Roster, Sidework, Stock, Menu, Members, Reports.
- **Page header:**
  - Padding 22px 28px 18px, `border-bottom: 3px solid #fffbf1`; eyebrow + H1 30px.
  - Right-side tools: segmented control (2px cream; active = cream fill), outline icon button, red primary button.

11. **Events (week calendar):**
   - 7 columns with 1.5px hairline dividers. Today's header cell is cream with ink text.
   - **Calendar ticket:** category slot bar + title (Montserrat 700 12px) + room line (Grotesk 11.5px), offset `4px 4px 0`.
   - **Selected** ticket: `outline: 3px solid blue; outline-offset: 3px`.
   - **Draft** ticket: dashed cream outline, no fill.
   - **Right pane:** 310px, one editing ticket with fields.
     - Labels: Montserrat 700 10px .12em, dim ink.
     - Inputs: 2px ink border, padding 10px 12px, Grotesk 14px.
     - **Focused input:** blue border + `0 0 0 3px rgba(24,167,224,.25)` ring.
     - Category chips (selected = ink fill), poster drop slot, red "Publish changes".
12. **Roster:**
   - Table: a 170px team column + 7 day columns.
   - **Shift block:** mini cream ticket with a `3px 3px 0` role-coloured offset, time in Montserrat 700 11px, role note 10.5px.
   - **Uncovered shift:** dashed red outline with red text.
   - Coverage row at the bottom; any short day shows in red.
   - Header legend: Bar / Floor / Café swatches.

**Website (desktop).**

13. **Home:**
   - **Top nav:** lettermark, links Montserrat 700 12px .14em (active = blue 3px underline), red "Tonight" button, `border-bottom: 3px solid #fffbf1`.
   - **Hero:** 2 columns (1.1fr / .9fr, gap 48px).
     - Left: display headline Montserrat **100** 84px with the second word at **800**, line-height .9; lede 17px / 1.65 dim.
     - Right: tonight hero ticket.
   - Below: a 4-column row of event list tickets, gap 22px.

**Reference:** `explorations/Night Mode Variations.html` holds all 8 explored night directions plus the current shipped night theme. Cream Tickets is **variation 01**.

## Interactions & Behaviour
Keep the existing system motion and states. On tickets specifically:
- **Hover:** `translateY(-3px)` and the offset grows from 7px to 9px.
- **Press:** `translateY(2px)` and the offset shrinks to 3px. Use `--ease-stamp`, `--dur-tap` 120ms.
- **Theme flip:** cream tickets do not change between Day and Night (they are already "Day"). Only the page, chrome and offsets transition, using the shipped 700ms `theme-settling` behaviour.
- **Focus:** 3px blue outline with 2px offset on ink; on cream fields, a blue border plus the soft blue ring.
- **Checklist (sidework):** tapping toggles done (ink fill + check, struck-through name) and records the time and user initials. The progress bar updates.
- **Stepper:** − / + adjust the count; when the count is below par, a red "Low" badge appears.

## State (for the new staff/backend views)
- **Sidework:** `checklist[] { id, station, label, note, doneBy, doneAt }`; the active phase (opening / pre-shift / close); progress = done / total.
- **Shifts:** `shift { date, start, end, role, staffId | null }`; `null` = open shift (dashed). Swap requests count toward the badge.
- **Stock:** `item { name, unit, par, count }`; low = `count < par`.
- **Backstage events:** the selected event id drives the edit pane; drafts are unpublished events.

## Assets
- `assets/wordmark.svg`: the canonical REALITY mark (uses `currentColor`; inline it so it recolours to cream).
- `assets/lettermark-r.svg`: the "R" (uses `currentColor`).
- `assets/qr-ink.svg`: the real scannable QR (encodes realitydn.com). Always show it ink on cream inside a quiet zone.
- **Icons:** the REALITY 72-glyph set (`components/foundation/Icon.jsx` in the design system): 24×24 grid, 2px stroke, square caps, miter joins, solid variant for the active nav tab. The prototypes inline the paths they use.
- **Photos:** riso stripe placeholders only; real imagery should follow the Duotone photo treatment.

## Files
- `explorations/Night - Cream Tickets.html`: all 13 screens (open in a browser; pan the canvas).
- `explorations/Night Mode Variations.html`: the 8 explored directions plus the current night theme.
- `tokens/night-cream-tickets.css`: **the proposed token layer**, the main thing to implement.
- `styles.css`, `tokens/*.css`: the existing REALITY Year-2 tokens the prototypes load.
- `assets/`: logo and QR vectors.
