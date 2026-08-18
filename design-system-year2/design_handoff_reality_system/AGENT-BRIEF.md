# Agent brief — REALITY Design System, Year 2

*(Copy this to `CLAUDE.md` at the root of the target repo.)*

Read this first. It is the entry point for any agent working on REALITY
surfaces: the website, the REALITY app, the sidework app, and the three
generators (Poster, Schedule, Print Studio).

## What this project is

The complete REALITY visual system. REALITY is a bar/cafe/community space in
Đà Nẵng, Việt Nam (86 Mai Thúc Lân, daily 11:00–02:00). The system has a
**silkscreen / riso** DNA — cream paper, ink rectangles, hard down-shadows,
misregistered colour — and runs as **one tokened theme** flipping between
**Day** (ink-on-cream) and **Night** (cream-on-ink).

## Precedence — when sources disagree

```
tokens/reality-tokens.json  +  day-colours.json     ← the contract
        ↓
design_handoff_reality_system/README.md              ← the written spec
        ↓
guidelines/*.html                                    ← the canon cards
        ↓
*.html design pages at the project root              ← prototypes
        ↓
any shipped codebase                                 ← may be stale
```

The design pages are **prototypes**, not production code. Recreate them in the
target codebase's own environment and patterns. `REALITY Design System.html`
is still the best overview, but its **01 Color, 05 Motion and 07 DNA sections
predate the 19.08.26 canon rev** — where it disagrees with the tokens, the
tokens win.

## Status: audit closed, 19.08.2026

41 calls decided. The token layer is current. **There are no open design
questions.** `guidelines/canon-applied.html` is the decision record;
`guidelines/decisions-final-four.html` holds the last four with their
alternatives still rendered.

## Six things that get "corrected" by mistake

Each of these looks like a bug and is not. Do not revert them.

1. **`--fg-faint` is .56 (Day) / .48 (Night).** Corrected from .45 / .32, which
   failed WCAG AA. It carries nav labels, hints, placeholders and timestamps.
2. **`--surface-2` `#f4ecd7` and `--paper-shade` `#ece2c9` are not tints.**
   They are two shades of unprinted stock. Collapsed onto `--bg` — as the
   original spec had it, and as the website still has it — every inset, day
   header, image placeholder and skeleton is invisible in Day.
3. **Day shadows are heavier than Night** (.10/.16/.23 vs Night's .14/.18/.26
   pattern, heavy at 13px). The lighter set washed out on cream. The asymmetry
   is deliberate. **Print is exempt** and keeps .08/.12/.18 at 12px.
4. **`--dur-settle` (350ms) is NOT the theme flip.** The flip is 700ms via
   `html.theme-settling`, which transitions every surface, border, shadow and
   fill together, then releases to interaction timing.
5. **`.btn-action` is cream on red at 4.19:1 and fails AA — knowingly.** The
   system's one deliberate accessibility exception, taken on the button that
   converts because red reads as a filled ink button at distance in a dark bar.
   Recorded in `tokens/reality-tokens.json` under `openCalls`. **It does not
   generalise** — every other coloured fill takes ink. Anything else under
   4.5:1 is a bug.
6. **Misregister is static** (13/6 hero, 6/3 card). The drifting 9s/13s loop
   was retired. `.misreg` needs `isolation: isolate` on a **background-less**
   ancestor or the negative-z plates vanish silently — this has bitten twice.

## The rules most likely to be broken

- **Zero border-radius. Everywhere. No exceptions.** If a base component
  library rounds corners, override to 0.
- **Borders carry structure, not fills.** 2px ink standard, 1.5px section
  rules, 3px mastheads and footers.
- **Majors carry meaning, minors carry mood.** Blue takes eyebrows, links and
  wayfinding; yellow takes notices and deals; red takes the imperative. **No
  minor takes a UI job.** The accent is the one exemption. "Hierarchy" is a
  retired framing — do not reintroduce it.
- **The accent is theme-aware:** Day leads blue, Night leads pink. Never a
  fixed default, never per-context hand-setting.
- **Never hardcode a weekday hue.** Components read `--day` / `--on-day`;
  renderers that cannot read CSS vars import `day-colours.json`.
- **Montserrat names, Space Grotesk states facts.** Facts are Grotesk in every
  medium including posters — at range only size and weight rise.
- **Case is set by register, not element.** `.reg-far` (poster, banner,
  signage, social thumb, TV schedule, hero plate) takes caps; `.reg-near` (app
  list, web body, printed schedule, menu, ticket, email, body copy) is sentence
  case. *The poster shouts the name; the app tells you about it.*
- **12px is the informational floor.** Anything you would act on — a time, a
  room, a price, a date. 11px is decorative labels only.
- **One ACTION button per screen.**
- **Touch targets ≥ 48px** (`--tap-min`).
- **The wordmark is a mixed-font vector.** Montserrat with Alternates
  substituted for the **A, I and Y only**. Ship
  `assets/wordmark/reality-wordmark.svg`; never re-typeset from live text.
- **Site string on artwork is `realitydn.com`** — bare host. The QR encodes
  `https://realitydn.com`.
- **Never strip Vietnamese diacritics.** Uppercase VI needs line-height 1.3;
  display steps to weight 200 under `:lang(vi)`. Proper names keep their own
  capitalisation.
- **No opacity-only fades.** Stamp, don't fade. A silkscreen either printed or
  it didn't.

## Known drift in the shipped codebases

The bundle is correct; these are pending sweeps.

1. **Website `src/index.css` is pre-audit** — `--fg-faint` .45/.32,
   `--surface-2` collapsed, Day shadows .08/.12/.18@12px. Two AA failures live
   on the public site. It also never re-declares `--accent` in dark, so the
   site's Night still leads blue.
2. **`www.realitydn.com` on artwork** — a literal in `public/print/print-data`
   (~40 presets), `print-export`, `public/schedule/schedule-render`,
   `public/studio/studio-data`, `public/event-report`. Bare host is canon.
3. **Studios carry weekday hex literals** — should import `day-colours.json`.
4. **The site still animates the hero misregister** — `cal-echo-a/-b` and
   their `-lg` variants. Drift retired; keep the transforms, drop the
   keyframes.
5. **Blue and yellow under-deployed** — button roles measure 53 / 4 / 2 against
   249 structural buttons.
6. **Events schema needs `name` + `qualifier`** — the CSS ships
   (`.name-block`, `.type-sub`), the data layer doesn't.
7. **~90 app keyframes live only in app source** — the *sets* are canon (see
   `guidelines/motion-index.html`); the bodies need one export pass.

## Reading order

1. `design_handoff_reality_system/README.md` — the self-sufficient spec.
2. `guidelines/canon-applied.html` — what each decision changed and where.
3. `guidelines/accessibility.html` — the numbers not to undo.
4. `guidelines/typography-merged-system.html` — the two-axis type system.
5. Component cards: `buttons`, `calendar-family`, `primitives`,
   `motion-index`, `wordmark-assets`.

## Assets

Fonts are Google Fonts only (Montserrat, Montserrat Alternates, Space Grotesk)
— no local files. Icons are vector in `icons/icons.jsx`, 2px ink strokes. QR
assets in `assets/qr/` are real and verified (v2, 25×25, EC-M, 4-module quiet
zone, decodable from 120px); **never invert them**. Photography is
client-supplied and runs through the riso treatments — all imagery in the
prototypes is a striped placeholder.

## Voice

Donald writes all copy. Do not generate or rewrite brand copy, event
descriptions, or Vietnamese translations unless explicitly asked.
