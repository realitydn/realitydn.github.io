# Night v2 "Cream Tickets": website implementation notes

Branch `claude/night-cream-tickets-site`, 5.10.26. Built for local review only. **Not deployed, not pushed.**
Spec: `design-system-year2/design_handoff_night_cream_tickets/` (README + `tokens/night-cream-tickets.css`; website = screen 13).

**To preview:** run `npm run dev` and press the theme toggle in the masthead. To open the site straight in Night, run `localStorage.setItem('reality-theme','dark')` in the console and reload. The theme follows the OS setting when nothing is saved.

## The idea in one paragraph

Night is one ink page. Anything you read sits on a **cream ticket** with ink type: event cards, the event overlay, the menu, the info panels, the visit facts and gallery cards. Chrome stays on ink: the masthead, tabs, section headings and the footer. Only the three majors carry colour, and each has one job:

- **Blue (lead):** active nav, focus, eyebrows, music.
- **Red (action):** the one converting button; party.
- **Yellow (deal):** drinks and games.

Most of that colour reaches the screen as a ticket's **top bar**, its **date block** and its hard **print offset**, not as full-bleed fills. Day is unchanged apart from the two token changes the handoff declares for both themes (see "What changed in Day").

## Tokens (`src/index.css`)

| Token | Old | New | Scope |
|---|---|---|---|
| `--accent` | Day blue / Night **pink** | **blue** | both themes + `.scope-night` |
| `--accent-2` | Day **pink** / Night blue | **red** | both themes + `.scope-night` |
| `--surface` (night) | `#171109` | `#0a0703` (= `--bg`, one dark) | night + `.scope-night` |
| `--fg-dim` (night) | `rgba(255,251,241,.60)` | `.62` | night + `.scope-night` |
| `--hairline` (night) | `#3a2c1c` | `rgba(255,251,241,.22)` | night + `.scope-night` |
| `--sh-light/-default/-heavy` (night) | cream down-shadows `.14/.18/.26` | `0 0 0 transparent` | night + `.scope-night` |
| `--print-neutral` | — | `rgba(13,9,5,.20)`; night `rgba(255,251,241,.28)` | new |
| `--lead --action --action-fg --deal --deal-fg` | — | `#18a7e0 #ed2224 #0d0905 #fddf00 #0d0905` | new, `:root` |
| `--ticket --ticket-fg --ticket-dim --ticket-line --ticket-hairline --ticket-inset --ticket-inset-2 --ticket-neutral --ticket-neutral-fg` | — | per the handoff | new, `:root` |
| `--print-lg/-md/-sm/-xs` | — | `7px / 6px / 4px / 3px` | new, `:root` |

Notes on how the tokens are built:

- **Night shadows use a list-safe zero.** They are `0 0 0 transparent`, never `none`. The tokens are used inside comma lists, and `none` there invalidates the whole declaration.
- **There is no `--sh-print` token at `:root`.** A custom property resolves `var(--print)` where it is declared, so a ticket's own `--print` would never reach it. Instead, each ticket rule writes the shadow itself: `box-shadow: var(--px) var(--px) 0 var(--print, var(--print-neutral))`.
- **Category colours are set per element.** `[data-cat]` sets `--cat`, `--on-cat` and `--print` for every event element, and the rules exist in both themes. Only Night consumes them. At night, `[data-cat]` also re-points `--day`/`--on-day` to the category, so anything still reading the weekday colour reads the category instead. The `.d-*` weekday classes stay as they were, for Day, posters, print and the selftest.

## What changed in Day (deliberately), and the proof

I pixel-diffed Day against **realitydn.com** at 1440px and 390px (home and full page, reduced motion). The diff images are in `shots/site/day-*-PROD.png` vs `day-*.png`. The 1440 and 390 home viewports are identical: 0 differing pixels. The full pages differ in exactly these places:

1. **The red act band's heading "Come find out." is now ink, not cream.** This is exception (b): a red ACTION fill takes ink, because cream on red is 4.19:1 and fails AA. On the band, the actual cream-on-red was the `.reg-far` display heading. The `btn-primary` there was already a cream button with an ink label, so it is unchanged. While the band animation is running, the heading already dropped to ink, so in practice most visitors saw ink anyway.
2. **The footer QR box's cream down-shadow is gone.** The footer ticket strip is `.scope-night`, which takes the new night tokens as instructed, and night shadows are now zero.
3. **The scroll-spy underline** (below). It shows in Day too, as the brief allowed. It is only visible after you scroll into a section, so the top-of-page diff is still 0.

Everything else in Day is unchanged:

- Exception (a), `--accent-2` going from pink to red, has no visible Day consumer on the site.
- Inline styles that Night needed to override were moved into classes with the **same Day values**: `.hero-h1`, `.cal-card`, `.cal-card-n`, `.cal-card-p`, `.menu-panels`, `.ih-panels`.

## Section by section

### Masthead
- **Scroll-spy (NEW).** `Header.jsx`, `useScrollSpy`. One IntersectionObserver watches a 1% "reading line" 35% down the viewport. The link whose section crosses it gets `aria-current="true"` and a 3px `var(--accent)` underline, drawn absolutely so the layout doesn't shift. Mapping: `#events`→`#calendar`, `#info`, `#menus`, `#visit`. The hero, gallery and footer have no active link. The nav links are now rendered from one `SPY` list, with the same four links, order and classes.
- **App CTA.** At night the "Get the app" button (desktop, the mobile icon and the mobile-menu button) becomes the red ACTION: red fill, ink label, 2px cream border (class `act-night`).
- **Small chrome changes at night.** Nav tracking widens to .14em. Eyebrows turn blue (`--blue-text`), and inside tickets they use the AA blue print.

### Bands (hero, visit, act band)
- **Bands are ink at night.** `.b-wayfind` (blue) and `.b-act` (red) become the ink page at night. Both halves of the token pair are re-declared, like the Day band rules do, and the 3px cream seams stay. **Why:** full-bleed major fields contradict "majors as thin strips, not full fills".
- **BandField sits out at night.** `BandField.jsx` uses `useNight`. At night there is no rig and no animation frames, and it resumes when you flip back to Day. I checked: band-live is 3 in Day, 0 at night, and 3 again after flipping back.

### Hero (STRUCTURE: Night only)
- **Layout.** At ≥768px the grid is 1.1fr / .9fr with a 48px gap. The display line is the real copy: "COFFEE / COCKTAILS /" in Montserrat 100 and "COMMUNITY" in 800, at `clamp(40px, 5.8vw, 84px)` with .95 leading. Vietnamese keeps its 1.3 leading. The lede is 17/1.65 dim. The two buttons stay: Events (cream solid) and Menus (cream outline).
- **TONIGHT ticket (NEW).** In `Hero.jsx` the photo column is replaced by a ticket built from the live feed. It uses `pickTonight`: the next event to start today, else one still running today, else the next upcoming event. The ticket has:
  - a category top bar ("TONIGHT · 19:00 / GAMES", or "TUE 6.10 · 19:00" when the event isn't today);
  - the poster at its native 4:5 on riso stripes, or the stripes plus the logo box;
  - the title and one meta line (qualifier · room · price);
  - a red **Details →** ACTION. It is a real link to the event, and a plain click opens the same EventOverlay the calendar uses (a second instance, portalled).

  It reads the shared feed load, so there is no extra request. If the feed has nothing left, the original photo shows inside a neutral ticket frame.
- **Static HTML is unchanged.** The prerender is always Day, so the static HTML keeps the photo. The ticket only exists in the client at night.

### Calendar
- **UP NEXT: wall cards become tickets.**
  - NEW in the markup: a category **top bar** spanning the card (`.cal-card-top`: when/date · time on the left, category on the right).
  - NEW, lead card only: a **clamped story**, the description in 14.5/1.55 dim, up to 6 lines.
  - The Day plate row and spine step aside. The poster keeps its native 4:5, flush in the ticket behind a 2px ink rule.
  - On phones the lead stacks as bar → poster → text, and two-up cards use a 128px poster column.
  - All the new pieces are `display:none` in Day.
- **COMING UP: rows become list tickets.**
  - NEW in the markup: a **date block** (`.ev-dblock`: weekday 10px over a big day number with a small `.month`, e.g. **6**.10, never zero-padded), a **meta line** (`.ev-mline`, "TOMORROW · 19:00 · GAMES") and a **subtitle** (`.ev-sub`, room · price).
  - The Day plate/time/room/arrow columns are hidden at night.
  - The grid is 4-up from 1024px, 2-up from 768px and 1-up below, with 22px / 18px gaps.
- **Other calendar changes at night:**
  - The sticky section labels get a 2px cream rule under them.
  - The pane gains right padding so prints and the hover lift aren't clipped.
  - A ticket focused from the keyboard scrolls in below the sticky label.
  - Events without a poster get riso stripes, the date and the logo box.
- **Every card and row** carries `data-cat` from `categoryOf(ev)`.

### Event overlay (STRUCTURE: Night only)
- **The plate is one long cream ticket**, with a 7px print in the category colour.
- **NEW: top bar.** The header becomes a category bar (`.ev-dlg-bar`: date · time / category) and the title moves to the body. The close square is transparent, with its border and X in the colour of the text on the bar.
- **Poster.** Riso stripes sit behind the poster.
- **NEW: ruled rows.** **When / Where / Entry** rows (`.ev-dlg-rows`) replace the date tab and the one-line facts.
- **Action.** The "Open in the REALITY app" footer button is the red ACTION, with an ink border inside the ticket.

### Menu
- **The panel is one neutral ticket** with ruled rows:
  - item names in Montserrat 700 caps 14px;
  - prices in Montserrat 700 15px;
  - notes at 13px dim;
  - section headings dim over a 2px ink rule.
- **NEW: deal ticket (Night only).** `DealTicket` in `MenuSection.jsx` is a yellow-top-bar ticket with a yellow print, built from the feed's next **drinks**-category event (today: "Happy Hour: Buy 1 Get 1 Cocktails", Mondays 17:00–21:00). Its bar reads "DRINKS / TONIGHT · 17:00–21:00". Nothing is invented: if no drinks event is coming up, it renders nothing. Clicking it opens the overlay.
- **No "Happy Hr" badges.** The menu data marks no item as a deal, so none are added.
- **Category tabs.** They become filter tabs: 2px cream outline, and ACTIVE = cream fill with ink text. The category-accent swatches and the echo shadow fold to neutral.

### Info / Host
- **Panels.** The panels container is a neutral cream ticket. Lists, the pricing table and the proposal forms all resolve to the Day look inside it, without patches.
- **Tabs.** The main tabs and the event-type sub-tabs are cream-outline filter tabs on ink.
- **Swatches.** Every decorative swatch (tab dots, panel-title squares, list bullets, room keys, the fine-print bullets) folds to neutral (`.sw`, which takes `currentColor`). The pricing table's slot headers keep their yellow/red/blue fills with ink text, because those are majors labelling facts.

### Visit, act band, gallery, footer, language menu
- **Visit.** The facts and buttons column is a cream ticket with the **blue** (wayfinding) print. The map frame is a ticket edge with a blue print.
- **Act band.** It is the ink page, and its app button is the red ACTION. The secondary buttons are cream outlines.
- **Gallery.** The cards (`.card`) are neutral tickets with a faint cream print. The carousel slides gained padding so the print isn't clipped.
- **Footer.** It stays chrome on ink.
- **Language menu.** The dropdown is a small cream ticket.
- **`.lbx` lightbox: a pre-existing night bug, fixed.** It is pinned to literal ink in both themes. It used to paint `var(--fg)`, which made the caption cream-on-cream at night. Day values are identical.

### Tickets: interaction and focus
- **Hover and press.** Hover lifts the ticket 3px and grows the print by 2px. Press drops it 2px and shrinks the print to 3px. Both use `--ease-stamp` at 120ms. Reduced motion zeroes the transitions, as before.
- **Focus.** It uses the canon misregister plate. The face slips 4px up-left and the print is replaced by an accent-blue plate, offset by the print plus 4px. Tickets with a blue print (music) take the partner colour, red, so the plate never reads as the print. Focus is never an outline ring.
- **Nested tickets** get an ink border and a small ink-wash print.

## Deviations from the handoff, and why
- **Logo box.** It uses the baked wordmark **vector** (`Logo.jsx`, cream) inside the ink box, not live Montserrat Alternates text. Canon says the wordmark is never re-typeset from a web font.
- **Date numbers.** They are house d.m without leading zeros ("6.10", "TUE 6.10"), not "06". The date block shows the day big and `.month` small, so the month is never lost: the feed runs about 60 days ahead.
- **Wall cards keep the Day composition.** The text sits beside the native 4:5 poster rather than a short cropped photo band, because posters are never cropped.
- **The hero ticket's poster slot** shows the poster centred at 4:5 on stripes, for the same reason.
- **Copy stays the site's own.** The hero headline is the real "coffee / cocktails / community", not "AFTER DARK". The hero action is "Details" (existing `cal.details` string) and opens the overlay. The site sells no tickets, so there is no "Get ticket".
- **Hero layout.** The hero keeps its Events and Menus buttons under the lede. Screen 13 has none.
- **Ticket labels are English only for now.** That covers the category words on bars and meta lines and the When/Where/Entry row keys. They live in `cal-feed.js` `NIGHT_STR` with a per-key EN fallback, because canon says Donald writes the copy (no generated VI/RU/UK/KO/JA). On /vn/ etc. these few labels show in English until translated.
- **Font sizes below the 12px floor.** Following the handoff, the date-block weekday is 10px and the list-ticket meta line and row keys are 11px. That is below the canon "12px for anything you act on" floor; contrast is high (ink .72 on cream, about 8:1).
- **Primary buttons at night.** Plain `btn-primary` buttons (hero Events, Get-app strip, footer, WhatsApp) are a **cream** solid on ink, not red. "One ACTION per screen" keeps red for the masthead CTA, the hero ticket, the overlay and the act band.
- **The masthead ink strip and the footer QR square keep their canon cell colours.** The footer square includes the minors. They are the brand mark, not UI chrome, and the cell order is fixed.

## Open decisions for Donald
1. **The act band heading in Day** ("Come find out.") is now ink on red, following rule (b). The old cream heading was a sanctioned display-size exception. Keep it ink, or restore the exception for Day?
2. **The `.scope-night` footer strip** took the new night tokens in Day, so the QR box lost its cream down-shadow. Is that OK, or should `.scope-night` keep the old shadows?
3. **Is the scroll-spy underline wanted in Day too?** It is on now, as the brief allowed. It is one selector to limit it to Night.
4. **Translations needed** for the category words (Music/Party/Games/Drinks/Film/Talk) and When/Where/Entry in VI/RU/UK/KO/JA (`NIGHT_STR` in `src/data/cal-feed.js`).
5. **Category rules.** Titles that classify questionably are listed below. The rules are a port of the hub's table, so fix them in both places.
6. **The deal ticket** appears whenever the feed has an upcoming drinks event. Should it show only on the day itself, or only for "Happy Hour"?
7. **"Talk" is the default category,** and about 85 of 119 distinct titles land there, so most list tickets are neutral ink blocks. That is by design ("not everything needs colour"), but it is worth a look in the review.
8. **Event Guidelines / Host Guide pages** at night are cream-on-ink reading pages, not tickets. They were not in scope this pass.

### Category classifications to review (live feed, 5.10.26)
- "Charaoke - Singing to Support the Elderly Loving Home": **talk**. Probably music; "singing" isn't a rule word.
- "ALBUM LISTENING PARTY: DOM VENICE": **party**. Probably music.
- "Hadestown Proshot Watch Party": **party**. A filmed musical, so film or music.
- "Ghosted: A Halloween Talk Circle": **party**, because Halloween beats talk.
- "PowerPoint Karaoke": **music**. It is really a comedy talk game.
- "Andre + Lena, Come Back Soon!": **talk**. Probably a farewell, which would be party.

## Verification
- `npm run selftest`: 84 checks pass, including the new category pins (Modern Jive → music; Farewell Party for Mai and Mid-Autumn Festival → party) and the d.m / tonight helpers.
- `npm run build`: passes, including prebuild, day-colours verification and the prerender of all 19 routes. The prerendered HTML is the Day structure, with no hero ticket and no `data-theme`. The build rewrites `public/feed-snapshot.json`; I reverted that and did not commit it.
- **Headless Chrome** (reduced motion) at 1440px, 820px and 390px in both themes, plus:
  - the overlay, the menu, the info/host panels with the pricing table and form, the language menu and the mobile menu;
  - keyboard focus on a ticket;
  - the no-poster fallback (feed intercepted with posters stripped).
- **A live theme-flip test** (Day → Night → Day) found no console errors. The hero ticket mounts and unmounts, BandField stops and resumes, and the overlay opens and closes from the hero ticket. The scroll-spy marks Events, Info, Menus and Visit in turn and nothing over the gallery.
- **/vn/ at night** (390px and 1440px) was checked: diacritics and the 1.3 leading hold, and the category words show in English as expected.
- **Not verified:**
  - real devices and Safari;
  - RU/UK/KO/JA pages at night;
  - the Google map iframe, which doesn't load in headless.
