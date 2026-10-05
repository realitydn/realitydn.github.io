# Canon revision 5.10.26 — Night v2 "Cream Tickets" + the text-on-fill rule

This revision SUPERSEDES the 19.08.26 bundle (`design_handoff_reality_system/`) and the
22.08.26 ink pass (`design_handoff_web_app_ink_pass/`) wherever they disagree. Those bundles
stay as dated records; read them, then apply this page on top. Decided by Donald on
5.10.26 while reviewing the Night v2 handoff (`README.md` in this folder) on the
`claude/night-cream-tickets` branches.

## 1 · Text on a colour fill — one rule, measured with APCA

| Fill | Text | APCA \|Lc\| cream / ink |
|---|---|---|
| yellow `#fddf00` | **ink** | 16 / 87 |
| amber `#fdb515` | **ink** | 34 / 71 |
| red `#ed2224` | **cream** | 71 / 36 |
| pink `#ed1b72` | **cream** | 70 / 37 |
| blue `#18a7e0` | **cream** | 55 / 51 |
| green `#43b02a` | **cream** | 56 / 50 |
| purple `#6e3179` (Day) | **cream** | 92 / 14 |
| purple `#9a4faa` (Night lift) | **cream** | 78 / 29 |

**Ink on the two light fills (yellow, amber); cream on every other hue — Day and Night.**
WCAG 2's ratio prefers ink on red, pink, blue and green, but it is known to misjudge saturated
mid-tones; APCA (the WCAG 3 draft) matches what people actually read — Donald kept flipping
ink to cream on accent blocks in Poster Studio, which is what started this. Consequences:

- Cream on red is no longer "the one knowing AA exception" — it is simply the rule (canon F2
  stands; the Night v2 handoff's ink-on-red was reverted).
- The old Night flip of Wednesday/purple to ink is gone.
- `day-colours.json` (rev 5.10.26) carries the new `on` values + an `onRule` note; every copy
  is identical. Code: app `src/lib/on-color.ts` (`apcaLc`, `textOn`), site
  `public/studio-shared/brand.js` (`apcaLc`, `contrastInk` → APCA). Tests pin the table
  (app `scripts/test-on-color.ts`, site `tools/verify-day-colours.mjs`).
- Coloured TEXT on cream (amber/green words) is a separate question — decision pending.

## 2 · Accent pair

`--accent` = **blue**, `--accent-2` = **red**, in BOTH themes (Night used to lead pink). Pink is
not banned — minors stay welcome in their jobs (day-code, menu categories, section colours,
artwork, the landing highlight's print) — but the MAJORS keep the lead roles: blue = lead
(selected, active nav, focus, eyebrows), red = action (the one converting button), yellow =
deal / progress.

## 3 · Surfaces — one dark + cream tickets (both themes)

- Night: `--surface` = `--bg` = `#0a0703`; `--hairline` cream .22; `--fg-dim` .62; night
  down-shadows retired (a list-safe `0 0 0 transparent`, never `none`).
- Reading surfaces are TICKETS in both themes: cream, ink type, a hard offset PRINT
  (`7/6/4/3px`) in the category colour (neutral = ink .20 by Day, cream .28 at night). Outer
  edge `--tk-edge`: ink on the Day paper, cream on the Night ink. Chrome/navigation stays on
  the page (3px cream rules + cream active plates at night).
- The print replaces the two-plate hero misregister on tickets.

## 4 · Event categories → colour

**Six guest-facing groups (Donald 6.10.26):** Games + Social (`social`) → red · Arts, Film,
Music (`arts`) → blue · Talk Events (`language`) → pink · Wellness → amber · Tech, Other →
neutral ink. Names use pluses, never ampersands. They grew out of the event-analysis rubric's
ten (+ Drinks): games, parties and drinks folded into Games + Social; film and music into
Arts, Film, Music. Drinks is cut "for now" — the finer keys stay STORED (`event_series.category`
/ `member_events.category`, migration 0090) and are folded on every read (`FOLDED_CATEGORIES` /
`normalizeCategory` in the app, `FOLDED` in the site's port), so a split can come back by
editing the map — no migration. The feed only ever publishes the six. A deal (Happy Hour) is
yellow's JOB, not a category: the site's menu deal ticket finds it by title (`isDealEvent`).
The category replaces the weekday hue on EVENT UI (the `.d-*` day-code stays for posters,
print and non-event surfaces).

## 5 · Kept from the house canon (the handoff's prototype differs)

Names keep their own case (M4); dates are d.m with no leading zeros; facts (dates, times,
prices) stay Space Grotesk; focus is the misregister plate (G1), never an outline ring; the
bottom nav keeps its tabs; posters are never cropped.

## 6 · Favicon = the ink square (6.10.26)

Donald: "Looks like the Favicon is still the R in the black square. I'd rather use the ink
square logo-thing." The browser-tab mark (16–64px, `.ico`, `favicon.svg`) is now the canon
INK SQUARE, full mode (`ink-strip.json` → `forms.square`): red / blue / yellow quadrants in Z
order, then stock · pink · purple · amber in the fourth. Integer modules (16px = 4px cells),
drawn at size — never resampled; no baked clear space (the tab strip is the clear space);
in the SVG, purple lifts to `#9a4faa` on a dark tab strip. This supersedes "the favicon is the
R" (wordmark-assets.html, REVISION.md, the skill). The R stays the lettermark and lives on in
the app-icon lockup (home screen, install prompt, apple-touch), unchanged. Generated by the app
repo's `scripts/build-app-icons.mjs` for the app, the site and the Expo app.
