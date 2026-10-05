# Night v2 "Cream Tickets": website implementation notes

Branch `claude/night-cream-tickets-site`, 5.10.26. Built for local review only. **Not deployed, not pushed.**
Spec: `design-system-year2/design_handoff_night_cream_tickets/` (README + `tokens/night-cream-tickets.css`; website = screen 13).

**To preview:** run `npm run dev` and press the theme toggle in the masthead. To open the site straight in Night, run `localStorage.setItem('reality-theme','dark')` in the console and reload. The theme follows the OS setting when nothing is saved.

> **Round 2 (5.10.26 evening) supersedes round 1 wherever they disagree.** Read the Round 2 section first. The round-1 notes below it are kept as history: they still describe the ticket anatomy, but several of their "Day is unchanged", "ink on red" and "minors fold to neutral" statements no longer hold.

## Round 2 (5.10.26 evening)

Donald reviewed round 1. Round 2 does three things:
- It puts the tickets in **both** themes.
- It switches every coloured fill to the **APCA text rule**.
- It replaces the six categories with the **ten real ones**.

### What changed, and why

1. **Tickets render in Day too.** Donald noticed that flipping to Day "erases the ticket boxes".
   - **What is now a ticket in both themes:**
     - the wall cards (category top bar, poster on a 2px ink rule, clamped story on the lead);
     - the list tickets (date block, meta line, name, qualifier, room · price);
     - the hero's Tonight ticket;
     - the event overlay (top bar, ruled When / Where / Entry rows, red ACTION);
     - the menu ticket and the deal ticket;
     - the info, visit and gallery tickets;
     - the language list;
     - the error and empty calendar cards;
     - nested tickets;
     - hover, press and focus.
   - **What differs by theme:** only the page and the ticket's outer edge.
     - **Day:** a 2px **ink** edge; neutral print `rgba(13,9,5,.20)`.
     - **Night:** a 2px **cream** edge; neutral print `rgba(255,251,241,.28)`.
     - These are two new theme-scoped tokens, `--tkt-edge` and `--print-neutral`. A ticket never re-declares them, so it reads the page's values.
   - **What stays the same:** everything inside a ticket is identical in both themes.
   - **The bands:**
     - Day keeps the blue hero and visit bands and the red act band as **fields**. The Tonight ticket sits on the blue field by Day and on the ink page at Night.
     - Full-bleed bands still go ink at night.
     - On the blue field, a blue print would vanish. So the visit card, the map frame and a music-category hero ticket fall back to the neutral ink print by Day.
   - **Night-only gating is gone.** `useNight` now drives only `BandField`.
2. **The text colour on every palette fill (Donald, settled by APCA).** **Ink on yellow and amber. Cream `#fffbf1` on red, pink, blue, green and purple, in both themes.**
   - The APCA |Lc| scores, cream vs ink:

     | Fill | Cream | Ink |
     |---|---|---|
     | yellow | 16 | 87 |
     | amber | 34 | 71 |
     | red | 71 | 36 |
     | pink | 70 | 37 |
     | blue | 55 | 51 |
     | green | 56 | 50 |
     | purple, Day | 92 | 14 |
     | purple, Night | 78 | 29 |

   - Where the rule is applied:
     - `--action-fg` is cream. The red ACTION buttons (masthead and act band at night, hero Details, overlay "Open in the app") are red with a cream label. The border is cream on the ink page and ink inside a ticket.
     - **The act band (`.b-act`):** everything on the flat red field is cream, heading included. The primary button is a cream plate with an ink label; the secondary buttons are cream outlines.
     - **The blue bands (`.b-wayfind`, hero and visit):** these are now cream-on-blue. The token pair is re-declared (`--fg` cream, `--bg` ink, cream hairline and surface washes), so the hero's buttons resolve to a cream plate and a cream outline without patches.
     - **Exception: the live band field.** When `BandField` is running (Day, motion allowed), the band is unprinted stock with blue, red and yellow blocks under the type. Cream would vanish on the stock and the yellow, so a live band takes the **ink** pair back. That is exactly the pre-round-1 live look; see `day-1440-*-liveband.png`. The type therefore flips cream → ink at the moment the field starts. That is the same moment the flat blue steps back to stock.
     - `.btn-info` is cream on blue.
     - `.alert-success` (green) and `.alert-error` (red) are cream.
     - The pricing table's Peak (red) and Late night (blue) headers are cream; Daytime (yellow) stays ink.
     - **The `.d-*` weekday pairs:** mon, tue, wed, thu and fri are cream; sat and sun are ink. The night override that flipped Wednesday's purple to ink is removed.
     - **Category fills:** see the table below.
   - **Not done here:** the studios (`public/**`), `day-colours.json` and `tools/verify-day-colours.mjs` belong to a second agent.
3. **The minors are back at night, and the majors keep their jobs.** Blue still leads (accent, active nav, eyebrows, focus), red is the action and yellow is the deal. Round 1's night fold of the minors is removed:
   - the menu category swatches, section swatches and active-tab echo shadows;
   - the InfoHost tab dots, panel-title squares, list bullets, room keys and sub-tab tints.

   They now render at night exactly as by Day, flipped by the tokens. The `.sw` / `.ftab` override classes are deleted.
4. **Ten real categories** (see the table). `categoryOf(ev)` prefers the feed's `category` when it is one of the keys, which covers the hub's additive field once it ships. Otherwise it derives the category from the EN title and qualifier with the new rule table. `src/data/event-category.js` is a faithful port of that table, with the same order and the same `\b(…)\b` form.
5. **Labels are the event-analysis skill's names** in EN and VI. RU, UK, KO and JA fall back to EN per key, as the skill's rule says. `other` has no label: the bar or meta line just omits it.
   - Long names wrap, and nothing truncates. The top bar is `flex-wrap`; when the date and the category don't fit on one line, the category drops to its own line, flush right.
   - The overlay's row keys have a 62px *minimum* (VI "THỜI GIAN" grows instead of wrapping).
6. **The deal ticket appears only on the day.** `nextDealToday()` takes the next drinks-category event that hasn't ended, and shows it only if it starts today (ICT). It shows in both themes. Today, the 5.10 Happy Hour ended at 21:00, so the live page shows no deal; the `*-menu-deal.png` shots fake one by moving it to "now".
7. **The footer strip (your call).** The QR box is now a small **cream ticket**: a cream edge on the always-ink strip and the faint neutral print (4px, `rgba(255,251,241,.28)`). It reads as part of the ticket system rather than a missing shadow, and because the strip is always `.scope-night`, it is identical by Day and at Night.
8. **The scroll-spy underline stays on in Day** (unchanged).

### Structure changes
- **Calendar (`Calendar.jsx`).** The Day-only row and card markup is deleted: the day plate, spine, `ev-when`, `ev-meta` / time / room / arrow, and the when-chip. Its CSS (`.day-plate`, `.day-spine`, `.when-chip`, `.ev-when`, `.ev-meta`, `.ev-time`, `.ev-room`, `.ev-go`, `.ev-date`) is gone too. Cards and rows carry `data-cat`, not the `.d-*` weekday class. List tickets gain an `sr-only` weekday and date, because the date block is `aria-hidden`; at night in round 1, the date wasn't announced at all.
- **Overlay (`EventOverlay.jsx`).** The header title (`.plate-t`), the date tab (`.cal-datetab`, with its CSS) and the one-line facts are deleted, so the top bar and the ruled rows are the only versions. Entry prints the price or "Free". The app button is `.btn-action`.
- **Hero (`Hero.jsx`).**
  - The Tonight ticket renders in both themes and in the prerender. The static HTML now carries the ticket (Day), fed by the build's feed; the shipped page's inline seed feeds the first client render, and `main.jsx` uses `createRoot`, so there is no hydration to mismatch.
  - The hero poster is now the LCP image, with `fetchpriority="high"` via `TicketPhoto priority`.
  - When nothing is left in the feed, the hero photo shows as a neutral ticket.
  - The hero layout (1.1fr / .9fr, the 84px display line, the dim lede) is now both themes.
- **Menu (`MenuSection.jsx`).** The deal ticket and its overlay are no longer gated on the theme.
- **CSS (`src/index.css`).** The round-1 `[data-theme="dark"]` ticket block is now an unscoped **TICKETS** block, followed by a short **NIGHT v2 deltas** block: the bands go ink, blue eyebrows, nav tracking, and the masthead and act-band ACTION. The `[data-cat]` table now lives in TICKETS.
- **Specificity.** Tailwind emits its responsive variants (`md:`/`lg:`) at the **end** of the stylesheet, so they beat same-specificity rules in `index.css`. Round 1 hid this behind the `[data-theme]` prefix. A few unscoped rules are therefore doubled or prefixed: `.hero-grid.hero-grid > *`, `.cal-wall.cal-wall`, and `.menu-panels .menu-item-n` etc.

### The category table

| key | EN label | VI label | fill | text on it | print |
|---|---|---|---|---|---|
| music | Music + Dance + Performance | Âm nhạc + Nhảy + Trình diễn | blue #18a7e0 | cream | blue (neutral on the Day blue field) |
| party | Parties + Special Events | Tiệc + Sự kiện đặc biệt | red #ed2224 | cream | red |
| games | Games + Trivia | Trò chơi + Đố vui | yellow #fddf00 | ink | yellow |
| drinks | Drinks + Deals | Đồ uống + Ưu đãi | yellow #fddf00 | ink | yellow |
| language | Language + Conversation | Ngôn ngữ + Trò chuyện | pink #ed1b72 | cream | pink |
| social | Social + Community | Giao lưu + Cộng đồng | green #43b02a | cream | green |
| arts | Creative Arts | Nghệ thuật sáng tạo | purple: Day #6e3179, Night #9a4faa | cream (both) | the same per-theme purple |
| wellness | Wellness + Growth | Sức khoẻ + Phát triển bản thân | amber #fdb515 | ink | amber |
| film | Film + Screenings | Phim + Chiếu phim | neutral (ink #0d0905) | cream | neutral |
| tech | Tech + Business | Công nghệ + Kinh doanh | neutral | cream | neutral |
| other | (none, so the label is omitted) | (none) | neutral | cream | neutral |

The overlay's row keys:
- **When:** EN "When". There was no site string for it in any language.
- **Where:** EN "Where". There was no site string for it in any language.
- **Entry:** reuses the site's existing six-language `Entry: {cost}` line from `cal-feed.js` `CF_STR.entry`, minus the cost slot. That gives VN "Vé vào", RU "Вход", UK "Вхід", KO "입장료" and JA "入場料".

### Vietnamese introduced in round 2 (draft: Donald corrects all Vietnamese)
- Category names, from the event-analysis skill's VI draft: Âm nhạc + Nhảy + Trình diễn · Tiệc + Sự kiện đặc biệt · Trò chơi + Đố vui · Đồ uống + Ưu đãi · Ngôn ngữ + Trò chuyện · Giao lưu + Cộng đồng · Nghệ thuật sáng tạo · Sức khoẻ + Phát triển bản thân · Phim + Chiếu phim · Công nghệ + Kinh doanh
- Overlay row keys: **Thời gian** (When) · **Địa điểm** (Where)
- (Entry "Vé vào" was already on the site.)

All of these are in `TICKET_STR` in `src/data/cal-feed.js`.

### The live feed under the new rules (69 distinct titles, 5.10.26)
- **The split:** arts 12 · language 12 · games 7 · film 7 · tech 6 · wellness 5 · music 5 · social 3 · party 3 · drinks 1 · other 8.
- **Obvious misfires (fix in both ports):**
  - **"Entrepreneurs-Only Meetup" → social.** The rule word is `entrepreneur`, and `\b…\b` doesn't match the plural; it should be tech. The same `\b` trap means the stems `freelanc` and `content strateg` can never match ("freelancer", "content strategy"). Suggestion: `entrepreneurs?`, `freelanc\w*`, `content strateg\w*`, in the hub's table too.
  - **The "Workshop: …" series → other:**
    - "Emotions Decoded"
    - "The Authentic Self and The Survival Self"
    - "The Hidden Patterns Holding You Back"

    The analytics registry's last rule (`workshop|class|course|talk|seminar` → Wellness) isn't in the new table. These are wellness.
  - **"WALKABOUT PRESENCE – Workshop 7: Audience Engagement & Interaction" → other**, while its "PHASE II: Presentation Skills…" sibling is tech (via `presentation`). The series splits.
  - **"SHIP FAST WITHOUT CREATING A COMPLIANCE TIME BOMB" → other.** Probably tech.
  - **"Free Clothing Swap at REALITY" and "Da Nang + Hoi An Kink Munch" → other.** Probably social.
  - **"Fun with Math: The Monty Hall Problem" → other.** Language/talk, or games.
  - **"Ghosted: A Halloween Talk Circle" → party.** `halloween` beats `talk circle`; defensible.
- **The rest:** these read right, including:
  - Pub Quiz, Clocktower and PowerPoint Karaoke → games;
  - Karaoke! and Modern Jive → music;
  - Philosophy Café and Coffee + Conversation → language;
  - Book Club and Storyteller → arts;
  - AI Dojo → tech;
  - Body Doubling and Journaling → wellness.
- **The feed carries no `category` field yet.**

### Verification (round 2)
- **`npm run selftest`:** 108 checks pass, including:
  - the 22 category pins from the brief, plus round-1 regressions;
  - `categoryOf` preferring the feed's key;
  - the labels: the EN and VN names, the RU→EN fallback, `other` with no label, and Entry reused in EN/VN/JA;
  - `nextDealToday` (today / another day / ended), and `isTodayICT` across the ICT midnight.
- **`npm run build`:** passes, including prebuild, verify-day-colours and all 19 prerendered routes. `public/feed-snapshot.json` was reverted afterwards.
  - The prerendered `dist/index.html` is Day (no `data-theme`) and carries the hero ticket ("Tonight · 19:00 | Games + Trivia | Monday Board Game Night …") with `fetchpriority="high"` on its poster, plus the inline seed.
  - `/vn/` prints the VI category names; `/ja/` prints the EN fallback.
- **Theme flip** (Day → Night → Day, `flip2.mjs` on the production preview :4660):
  - The hero ticket is present in all three states.
  - The band field runs at 3 → 0 → 3.
  - The overlay opens and closes from the hero ticket.
  - The scroll-spy marks Events / Info / Menus / Visit and nothing over the gallery.
  - The only console errors are the expected CORS refusals of the live feed from `localhost`; the page falls back to the snapshot.
- **Screenshots** are in `C:/Users/donal/AppData/Local/Temp/nct/shots/site2/`, taken from the production build under reduced motion.
  - **Each theme × 1440 / 390 has:** `home`, `calendar` (up next), `rows`, `overlay`, `hero-overlay`, `menu`, `menu-deal` (faked today), `info`, `host-pricing`, `host-form`, `visit`, `gallery`, `footer`, `cta`, `focus` and `lang`.
  - **Day 1440 only, with motion on (the live band field):** `day-1440-home-liveband` and `day-1440-cta-liveband`.
- **Not verified:**
  - real devices and Safari;
  - RU/UK/KO/JA pages beyond the prerender text;
  - the no-poster fallbacks in round 2 (only incidentally: the overlay and wall stripes render);
  - the Event Guidelines / Host Guide pages beyond a Day 390 glance. They have no tickets, but they use `.alert-*`, which is now cream on green and red.

---

# Round 1 notes (history)

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
- **Hero photo — the front, as a carousel-ready ticket (5.10.26).** Round 2 had replaced the photo column with a TONIGHT ticket from the feed; Donald: "The hero on the website should still be the pic of the front. We'll get more pics of the space to do an auto-forward carousel there." So the column is the shopfront photo again (`public/images/hero.jpg`, still the LCP preload), framed as a neutral ticket (7px print, both themes). The photos live in `src/data/hero-photos.js`; add entries and `HeroPhotos.jsx` turns into an auto-advancing carousel by itself — a cross-fade every 6s, holding still on hover/focus, while the tab is hidden and under reduced motion, with a pause button and one dot per photo (WCAG 2.2.2). With one photo it renders just the photo, no controls. The TONIGHT ticket, `pickTonight` and its self-tests are gone (the calendar right below the hero does that job; git has them if wanted back).

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

## Text on fills (APCA rule): the Studios (5.10.26)

**The rule** (canon `day-colours.json` rev 5.10.26, its `onRule` note): **ink on yellow and amber; cream on red, pink, blue, green and purple.** It holds in Day and Night, and the lifted Night purple #9a4faa takes cream too. It is measured with APCA (WCAG 3 draft), which models saturated hues and agrees with Donald's eye. WCAG 2 ratios put ink on red, pink, blue and green, which is why he kept switching ink to cream on accent blocks in Poster Studio.

| Fill | Artwork cream / ink, \|Lc\| | Print white / #111111, \|Lc\| | Text |
|---|---|---|---|
| yellow #fddf00 | 16 / 87 | 19 / 87 | ink |
| amber #fdb515 | 34 / 71 | 36 / 71 | ink |
| red #ed2224 | 71 / 36 | 73 / 36 | cream / white |
| pink #ed1b72 | 70 / 37 | 72 / 37 | cream / white |
| blue #18a7e0 | 55 / 51 | 58 / 51 | cream / white |
| green #43b02a | 56 / 50 | 59 / 50 | cream / white |
| purple #6e3179 | 92 / 14 | 94 / 14 | cream / white |
| Night purple #9a4faa | 78 / 29 | 80 / 28 | cream / white |

**One function.** `contrastInk(hex, pair)` in `public/studio-shared/brand.js` is now APCA (APCA-W3 0.0.98G): the neutral with the larger |Lc| wins, and a true tie goes to ink. The new `apcaLc(txt, bg)` export does the measuring. Both substrate pairs give the rule on all eight fills, so nothing had to be forced. Schedule's `DAY_TEXT` comes from canon `on`, so its day blocks follow too.

**What flips by itself** (computed colours, so saved docs change on the next open):
- **Poster:**
  - When and Cost chips, Stamp and Specials (all default Accent surfaces);
  - any text element set to an Accent surface with Auto text colour;
  - the Weekly bar's price and time, the Matchup VS coin, and the agenda day chips.
  - Accent-coloured highlight text sitting on its *own* Accent surface used to vanish. That covers list headings, the headliner, the host kicker on Auto, the badge's big word and the QR site line. It now takes the surface's text colour.
- **Print:**
  - Auto ink on Accent surfaces, and the punch card's bonus label;
  - the coupon chip's lettering, which is now contrast-picked;
  - QR modules, which never take the white;
  - list and coupon headings on their own Accent surface.
- **Schedule:** every day block, strip, cover and daily card for Mon, Tue, Thu and Fri. Wed was already cream; Sat and Sun stay ink.
- **Studio UI chrome:** the pink UI accent (on-chips, Save, fold badges) carries cream. Schedule's amber accent and Poster's amber Master keep ink.

**What does not flip:**
- A Poster element with an explicit Ink or Cream text colour keeps it.
- A Print doc with an explicit `ink` keeps it. That includes docs made earlier from the green check-in, red rooftop and red happy-hour templates, which carried `ink:"ink"` on the flood. The templates themselves now say `white`. Re-apply the template, or pick White, to update an old copy.
- The Three-ink bands template dropped its explicit cream on the red action band, because Auto gives cream now.

**Guard.** `tools/verify-day-colours.mjs` (prebuild) checks four things:
- it states the rule for all eight fills on both pairs;
- it holds canon `on` and `hexNight` to the rule;
- it pins APCA's reference values;
- it requires both `design-system-year2/*/tokens/day-colours.json` copies to match `public/tokens/day-colours.json`.

A negative test (canon red set back to ink) fails five ways.

**Proof.**
- 31 goldens were re-rendered: 13 Poster, 4 Print and 14 Schedule. Every diff is a text flip on a fill, and every Print QR still decodes.
- Before and after sheets (seven accents per starter) are in `%TEMP%/nct/shots/studio/`, with the golden montages in `goldens/`.
- Commit `5a4e4b5`. Not pushed or deployed.
