# Event report: realitydn.com/event-report/

The public "REALITY in numbers" page, in English (`/event-report/`) and Vietnamese
(`/event-report/vn/`), plus `stats.json`, the same figures as data. This folder builds all
three from REALITY's calendar. It needs Python 3.10+ and nothing else: no packages, no
secrets.

## Run it

```
python -X utf8 scripts/event-report/build.py
```

That counts every event up to **yesterday** (Đà Nẵng time) and rewrites:

- `public/event-report/index.html` (EN)
- `public/event-report/vn/index.html` (VI)
- `public/event-report/stats.json`

Options: `--cutoff YYYY-MM-DD` counts up to another day; `--out DIR` writes somewhere
else (handy for a dry run). It takes a couple of seconds. The last lines print the
headline figures and any series that still has no category.

## Where the numbers come from

- **Before 8.6.26:** `history-gcal-before-8.6.26.json`, a frozen Google Calendar pull
  (1,076 events, deduplicated 2.10.26). It never changes.
- **From 8.6.26 on:** the app's public events feed,
  `https://app.realitydn.com/api/feed/v1/events.json`, published events only. That is
  the canonical calendar now.

Then the event-overview pipeline (in `pipeline/`) drops non-events (happy hours,
closures, cancellations), folds title variants into one series and removes stacked
duplicates. `report.py` takes only the public sections from its analysis, and
`render.py` draws the page.

| File | What it is |
|---|---|
| `build.py` | the one command: fetch, merge, count, write |
| `supplement.py` | **the file you edit**: renames, categories, private parties |
| `report.py` | the public cut: which figures, which series, nothing internal |
| `render.py` | the HTML: Year 2 tokens, Day/Night, tickets |
| `strings.py` | every word on the page, EN + VI |
| `pipeline/` | `process_events.py`, `analyze.py`, `categories.py` from the `event-overview` skill, **unchanged** (copied 25.11.26 from the installed skill) |
| `assets/` | `reality-tokens.css`, `reality-wordmark.svg`, `categories.json` from the `reality-brand` skill (rev 6.10.26) |

## Adding renames, categories and private parties

Everything week-to-week lives in **`supplement.py`**. Leave `pipeline/` alone, so it can
be swapped for a newer copy of the skill.

- **A series was renamed** (in the app or on the calendar): add a line to `ALIASES`, the
  new title's pattern pointing at the old name, e.g.
  `(r'(?i)^Chess Night', 'Chess Club')`. Both names then count as one history. The page
  shows the name the webapp uses now, so visitors find the same thing there.
- **Episodes of one series carry their own titles** ("Book Club: Kafka"): same thing,
  an alias from the pattern to the series name.
- **A series has no category:** the build prints `UNCATEGORISED (shown as Other …)`. Add
  it to `CATEGORIES` using one of the nine names at the top of the list. Most of the time
  you won't need to: any series the app has carried takes the app's own category (folded
  to the six guest-facing groups from `assets/categories.json`). `CATEGORIES` only decides
  the Google Calendar history.
- **A private party** (a birthday, a send-off): `PRIVATE` already catches
  birthday / send-off / farewell / going away / come back soon / sinh nhật / chia tay. Add
  a pattern for anything else personal. Those events still count in every total; they are
  never named on the page or in `stats.json`.

The hub's internal report (RealityHQ `jobs/event-audit`) keeps its own copy of
`supplement.py`. When you add a rule in one place, copy it to the other.

## What is public and what isn't

Approved 25.11.26. The page shows: the big numbers (events since opening, the last 30
days, different series and one-offs, series running now, the weekly average over 90
days, new series), the trailing-30-day line, lifetime totals by category, the regulars
(with cadence, "since", times run and a link to each series' webapp page), new this
month, the day × time grid with its open slots, and the last seven days in a fold.

It never shows: percent comparisons of any kind, the category index ("ran hot / went
quiet"), roster status (slowing / dormant / retired) or any "went quiet" list, the
survival rate, the veteran/newcomer mix, concentration, the method appendix, or private
parties by name. Those stay in the hub's internal report. `report.py` doesn't read them.

"Running now" means the pipeline calls the series active **and** it meets at least
monthly. Active alone also catches an annual party that happened recently.

## `stats.json`

A small file for anything else that wants the figures (the home page's "Events we've
held" card). **Fields are only ever added, never renamed or removed.**

```
version          1
asOf             last day counted, YYYY-MM-DD
openedOn         2025-05-26
url              { en, vi, stats }
totals           { events, series, seriesRepeated, oneOffs, weeks }
last30           { from, to, events, daysWithEvents }
last90           [ last 30 days, the 30 before, the 30 before that ]   newest first
perWeek90        events a week over the last 90 days (one decimal)
perWeek30        the same over the last 30 days
seriesRunning    the count of "the regulars"
debuted30        series whose first night was in the last 30 days
mostRun          [ { name, runs } ] x7, all time, private parties left out
growth           { span: 30, stepDays: 14, points: [ { date, events } ], peak: { events, on } }
                 trailing-30-day count every 14 days back from asOf, oldest first
categories       [ { key, name, nameVi, hex, events } ]  the six groups, lifetime
```

## Safety: it stops rather than publish something wrong

`build.py` exits non-zero and **writes nothing** when:

- the feed can't be reached or isn't JSON;
- the feed returns fewer than 100 events since 8.6.26 (it has carried 150+ a month);
- the all-time total comes out more than 5% below the last published `stats.json`.
  Totals can't fall in a quiet week; a drop like that means history went missing. If a
  real clean-up removed events, rerun with `EVENT_REPORT_FORCE=1`.

The previous pages stay up untouched.

## The weekly rerun

Two ways to keep it current. Either is fine; both together are fine too, since the build
is deterministic for a given cutoff and feed.

### A. The site's own deploy (proposed, not wired in)

The deploy workflow already rebuilds the site every night at 00:05 Đà Nẵng time
(`.github/workflows/deploy.yml`) and on every push. One step before
`Build (with pre-rendering)` would refresh the report each time, so it would never be
more than a day old and nothing would need to be committed:

```yaml
      # Refresh the public event report (scripts/event-report). Fail-soft: if the feed
      # is down, the committed pages ship as they are.
      - name: Event report
        run: python3 scripts/event-report/build.py || echo "event report not rebuilt; shipping the committed pages"
```

`ubuntu-latest` has Python 3 already; the step takes a few seconds. It has to run before
`npm run build`, because the build's `prebuild` step (`build-seo-files.mjs`) reads
`stats.json` for the sitemap date and the figures in `llms.txt`. The committed files then
act as the floor if a night's fetch fails. **This needs Donald's OK before it goes into
the workflow.**

### B. An unattended job that commits (the hub's Thursday 4am job)

**Yes, an unattended weekly job may commit the regenerated files straight to `main` and
push**, on these conditions:

1. Start from a clean, up-to-date checkout of `main` (`git pull --ff-only`). Stop if
   that fails.
2. Run `python -X utf8 scripts/event-report/build.py`. If it exits non-zero, stop.
   Commit nothing, push nothing; report the error.
3. Stage **only** `public/event-report/index.html`, `public/event-report/vn/index.html`
   and `public/event-report/stats.json`. Never `git add -A`.
4. If nothing changed, stop: no empty commits.
5. Commit as `Event report: figures to d.m.yy`, then `git push origin main`. If the push
   is rejected, stop; don't force-push and don't retry in a loop.

A push to `main` deploys the site (about two minutes), so the page updates on its own.
The job never edits anything else in this repo: code, `supplement.py` and the Vietnamese
strings change through a normal pull request.

If option A is switched on, the job can stop committing every week. The committed pages
are then only a fallback, and a monthly refresh is plenty.

## Vietnamese

`strings.py` holds every Vietnamese line on the page. They were drafted 25.11.26 for
Donald to correct. Keep the diacritics. Series names aren't translated: the Vietnamese
page uses the app's own `title_vi` where a series has one, otherwise its English name.
