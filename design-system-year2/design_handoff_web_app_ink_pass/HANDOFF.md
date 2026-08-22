# HANDOFF — REALITY website + app, Year 2 ink-mark pass

Rev 22.08.2026 (updated after the focus decision). Read `CLAUDE.md` first;
this document does not repeat it.

This is the packing list for taking the prototypes at the project root into
the real codebases. It covers four things: what to migrate, what is still
undecided, what to sweep, and what the prototypes deliberately do not answer.

---

## 1 · What was built

| File | Contains |
|---|---|
| `Website - Full Layout.html` | 6 pages + 6 popups, 1200px |
| `Website - Responsive.html` | Home + Events at 390 / 768 / 1200 |
| `App - Full Layout.html` | 15 screens + 9 overlays |
| `App - States.html` | 8 empty / loading / error / offline / denied states |
| `Vietnamese - Real Length.html` | 5 VI stress cases incl. overflow |
| `Focus States - Options.html` | 4 focus candidates, Day + Night — **C is canon** |
| `guidelines/focus.html` | The focus canon card — mechanic, exceptions, plate-partner rule |

Shared implementation, all under `treatment/`:

- `ink-motion.css` / `ink-motion.js` — both mark engines, idle life, the
  `data-pass` / `data-swap` / `data-idle` / `data-chain` contract.
- `ink-ground.css` — the stock-on-stock ground patch.
- `overlays.css` — sheets, dialogs, drawers, lightbox, toasts, banners.
- `states-sheet.css`, `responsive-sheet.css`, `vi-sheet.css` — the rules
  that were never designed at 1200px-desktop-English.

These are **prototypes**. Recreate them in each codebase's own patterns; do
not port the files.

---

## 2 · Migrate first — the schema

**`events` needs `name` + `qualifier` as separate nullable fields.**

Every calendar row on both surfaces now depends on it, and `qualifier` is
**optional** — three of the seven fixtures have none, which is the mixed case
the real calendar has to survive. An empty qualifier renders no line and the
row closes up; it must not render an empty element.

```
name       string   required  wraps to 4 lines, never truncated, never text-transformed
qualifier  string?  optional  one line of detail, omitted entirely when absent
```

The CSS pair already ships as `.name-block` / `.type-sub`. This was already
on CLAUDE.md's drift list; it is now blocking.

---

## 3 · Four decisions, all closed 22.08.26

Recorded in `tokens/reality-tokens.json` under `openCalls` as G1–G4. The
alternatives stay rendered in `Open Decisions - G2 G3 G4.html` and
`Focus States - Options.html` — that is the decision record.

**G1 · Focus — CLOSED 22.08.26.** Candidate C, the misregister plate. Spec in
`tokens/reality-tokens.json → focus.decided`, card at `guidelines/focus.html`,
implementation at the end of `treatment/core.css`. Two properties:
`transform: translate(-4px,-4px); box-shadow: 4px 4px 0 0 var(--accent)`.
Three things not to undo: the plate is a **box-shadow, not a pseudo-element**
(see §7); the plate takes the accent's **partner** on any coloured field; and
inputs, coloured choice plates and bare links take a 2px ink outline instead.

**G2 · Open silhouette — NEITHER FIX.** A strip terminating on stock lets its
outer corner open, and that is correct on screen: it reads as ink laid *on*
the page rather than a badge sitting on it, and it is what makes cell-switching
legible. Canon's outer-corner rule holds for **print** only. Automatic
grounding has been removed from `ink-motion.js`; `data-ground="on"` remains
for a mark over photography or a print export. **Do not restore the
background-comparison test.**

**G3 · Choice hue — RATIFIED, scoped.** Four hues for the quiz quick-fingers
choices (A blue, B yellow, C green, D pink). The scope clause is the
load-bearing part: **quiz choice sets only**. It does not license colour-coding
event categories, menu sections, room codes or tags. A weekday hue stays the
only other identifying colour in the system. Ink text on every plate; letter,
colour and words always travel together; no hue ever means right or wrong.

**G4 · Product motion — RATIFIED, both parts.** Screen timing is canon
(A1 95/430, A2 46/300, A3 420, swap 240/360); the motion card's sets are the
print and poster numbers. Idle life is ratified as a **separate token** so it
can be tuned or dropped without touching arrival. Idle re-stamps a cell in its
own colour and never recolours.

---

## 4 · For Fable — the ink mark as a component

Unresolved engineering, flagged rather than decided:

- **The mark is decorative.** It carries no UI job and no information. It
  ships `aria-hidden="true"` in the prototypes; keep that.
- **Reduced motion** must render the finished mark at frame one. Handled in
  `ink-motion.css`, but idle life needs the same guard in any reimplementation.
- **Props vs. attributes.** Prototypes use data attributes
  (`data-form`, `data-mode`, `data-day`, `data-pass`, `data-swap`, `data-idle`,
  `data-chain`). A React component should take these as props.
- **Colour source.** The renderer reads CSS vars; canvas/PDF renderers must
  import `tokens/ink-strip.json` and `tokens/day-colours.json` instead. Never
  a hex literal.
- **Perf ceiling.** Each idling mark holds a timer plus an
  IntersectionObserver. Untested above roughly six marks on a page, and the
  one-mark-per-surface rule should keep it there — but the studios could
  break it.
- **`isolation: isolate` on a background-less ancestor** is required wherever
  misregister plates are used. This has silently broken twice.

---

## 5 · The sweeps

From CLAUDE.md, still pending, in the order I would do them:

1. **Website `src/index.css` is pre-audit** — `--fg-faint` .45/.32,
   `--surface-2` collapsed onto `--bg`, Day shadows .08/.12/.18@12px. Two AA
   failures live on the public site. Also never re-declares `--accent` in
   dark, so the site's Night still leads blue.
   *Newly urgent:* every skeleton in `App - States.html` is a `--surface-2`
   block. With `--surface-2` collapsed, the loading state renders as a blank
   page — that bug is live.
2. **`www.realitydn.com` → `realitydn.com`** on artwork. A literal in
   `public/print/print-data` (~40 presets), `print-export`,
   `public/schedule/schedule-render`, `public/studio/studio-data`,
   `public/event-report`.
3. **Studios carry weekday hex literals** — import `day-colours.json`.
4. **Site still animates the hero misregister** — `cal-echo-a/-b` and the
   `-lg` variants. Keep the transforms, drop the keyframes.
5. **Blue and yellow under-deployed** — button roles measure 53 / 4 / 2
   against 249 structural buttons.
6. **~90 app keyframes live only in app source.** The sets are canon
   (`guidelines/motion-index.html`); the bodies need one export pass.

---

## 6 · Three bug classes found building this

Each one is silent — no console error, no visible failure at the width or
state you authored in. Worth a grep in the target codebase.

**Setting a flex axis on a grid container does nothing.** `.ft`, `.ft-nav`,
`.dr`, `.rule-i` and `.form` are all `display: grid` in `website.css`, so
`flex-direction: column` on them is a no-op — the tracks stay put and the
content walks off the frame. Collapse `grid-template-columns` instead.

**A negative-z plate needs `isolation: isolate` on a background-LESS
ancestor.** Put `isolate` on the element carrying the fill and the plate
paints on top of that fill; omit it and the plate falls behind the band
background and vanishes. CLAUDE.md flags this for `.misreg`; it bit twice
more here. Prefer a spread-less box-shadow wherever the plate is a solid
offset rectangle — it paints behind the background by definition.

**Container-width layouts do not fire viewport media queries.** The
responsive sheet renders 390 and 768 frames inside a wide viewport, so
`@media(max-width:900px)` never applies and every collapse has to be written
against the frame. In the real site these are viewport widths and the media
queries do fire — but any component rendered at a container width (a preview,
an embed, a studio canvas) will hit exactly this. Container queries are the
correct answer in the codebase.

---

## 7 · What these prototypes do NOT answer

Say so out loud rather than letting Code guess:

- **All brand copy is placeholder.** Donald writes it. Every event title,
  qualifier, page body and quiz question in these files was generated and
  should be treated as lorem with good manners. The Vietnamese strings in
  `Vietnamese - Real Length.html` are typographic fixtures, not translations.
- **No auth, payment, or ticketing flow.** Sign-in is one sheet with no code
  entry, no error, no rate limit.
- **No print surfaces this pass.** Schedule, poster and print studios are
  untouched; the ink mark has not been placed on any of them.
- **No motion for page transitions or route changes** — only the mark and the
  existing component set.
- **Tablet is Home and Events only.** The other four pages have 1200 and 390
  rules but were not laid out at 768.
- **Data volume is untested.** Seven events, one week. Not a month view, not
  a day with five overlapping events, not a room with none.
