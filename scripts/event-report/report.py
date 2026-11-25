"""The public cut of the event audit: what the page and stats.json show, and nothing else.

Takes the vendored pipeline's analysis (pipeline/analyze.py) plus what the app feed says
about each event (its category and its series page), and derives only the approved
public sections. The internal sections the pipeline also computes (percent comparisons,
the category index, roster status, survival, churn, concentration) are never read here.
"""

import json
import re
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

from analyze import DOW, TIME_BUCKETS  # (vendored)

HERE = Path(__file__).parent
GROUPS = json.loads((HERE / 'assets' / 'categories.json').read_text(encoding='utf-8'))
GROUP_KEYS = [g['key'] for g in GROUPS['groups']]
FOLD = GROUPS['fold']

# The skill's nine categories, folded to the six guest-facing groups.
NINE_TO_SIX = {
    'Games + Trivia': 'social', 'Social + Community': 'social',
    'Parties + Special Events': 'social',
    'Creative Arts': 'arts', 'Music + Dance + Performance': 'arts', 'Film + Screenings': 'arts',
    'Language + Conversation': 'language',
    'Wellness + Growth': 'wellness',
    'Tech + Business': 'tech',
}

BUCKETS = [b[0] for b in TIME_BUCKETS]


def _d(s):
    return date.fromisoformat(s)


def fold(key):
    key = (key or '').strip().lower()
    key = FOLD.get(key, key)
    return key if key in GROUP_KEYS else 'other'


def is_private(name, patterns):
    return any(re.search(p, name) for p in patterns)


def build(a, feed_meta, private_patterns):
    """a: analyse() output. feed_meta: (original_name, date, time) -> feed facts."""
    events = a['events']
    cutoff = _d(a['cutoff'])
    opened = a['meta']['period_start']
    w30_start = cutoff - timedelta(days=29)
    w7_start = cutoff - timedelta(days=6)

    # ── per-series facts from the feed ──────────────────────────────────
    feed_cats = defaultdict(Counter)
    feed_runs = defaultdict(list)          # (date, time, url, title_en, title_vi)
    for e in events:
        fm = feed_meta.get((e['original_name'], e['date'], e.get('time', '')))
        if not fm:
            continue
        feed_cats[e['series']][fold(fm.get('category'))] += 1
        feed_runs[e['series']].append((e['date'], e.get('time', ''), fm.get('seriesUrl'),
                                       fm.get('title_en'), fm.get('title_vi')))

    def group_of(series, nine):
        c = feed_cats.get(series)
        if c:
            named = [(k, n) for k, n in c.most_common() if k != 'other']
            return named[0][0] if named else 'other'
        return NINE_TO_SIX.get(nine, 'other')

    nine_of = {}
    for e in events:
        nine_of.setdefault(e['series'], e['category'])
    group = {s: group_of(s, n) for s, n in nine_of.items()}
    private = {s for s in nine_of if is_private(s, private_patterns)}

    def latest_url(series):
        runs = sorted(feed_runs.get(series, []))
        for r in reversed(runs):
            if r[2]:
                return r[2]
        return None

    def display(series):
        """The webapp's own title when its last four runs all carried it, else the series name.

        So a series renamed in the app (Chess Club -> Chess Night) shows the name a visitor
        will find there. Episode titles vary run to run ("Film Club: School of Rock"), so
        the series name wins for those. A series that hasn't run for 45 days keeps its
        series name too: an old run of one repeated episode is not what it was called.
        """
        runs = sorted(feed_runs.get(series, []))[-4:]
        out = {'en': series, 'vi': series}
        if not runs or _d(runs[-1][0]) < cutoff - timedelta(days=45):
            return out

        def steady(i):
            vals = {(r[i] or '').strip() for r in runs}
            return vals.pop() if len(runs) >= 2 and len(vals) == 1 else ''

        if steady(3):
            out['en'] = out['vi'] = steady(3)
            out['vi'] = steady(4) or out['vi']
        return out

    def card(series, extra=None):
        d = {'series': series, 'name': display(series), 'group': group[series],
             'url': latest_url(series)}
        d.update(extra or {})
        return d

    # ── headline numbers ────────────────────────────────────────────────
    runs_by = Counter(e['series'] for e in events)
    last30 = [e for e in events if _d(e['date']) >= w30_start]
    last90 = [[e for e in events if cutoff - timedelta(days=30 * (i + 1) - 1)
               <= _d(e['date']) <= cutoff - timedelta(days=30 * i)] for i in range(3)]
    n90 = sum(len(x) for x in last90)
    # "Running now": the pipeline's active status, and a rhythm of at least monthly. Active
    # alone also catches a party held twice a year apart ("Halloween Party!"), which isn't
    # something a visitor can come back to next week.
    running = [h for h in a['health'] if h['status'] == 'active' and h['series'] not in private
               and h['cadence'] in ('weekly', 'fortnightly', 'monthly')]

    # ── the regulars: running now, by the day they usually meet ─────────
    dates_by = defaultdict(list)
    for e in events:
        dates_by[e['series']].append((e['date'], e.get('time', '')))
    regulars = []
    for h in running:
        recent = sorted(dates_by[h['series']])[-6:]
        dow = Counter(DOW[_d(d).weekday()] for d, _t in recent).most_common(1)[0][0]
        times = [t for d, t in recent if t and DOW[_d(d).weekday()] == dow]
        regulars.append(card(h['series'], {
            'dow': dow,
            'time': Counter(times).most_common(1)[0][0] if times else '',
            'cadence': h['cadence'],
            'first': h['first'],
            'runs': h['runs'],
        }))
    regulars.sort(key=lambda r: (DOW.index(r['dow']), r['time'] or '99', r['name']['en'].lower()))

    # ── new this month ──────────────────────────────────────────────────
    first_seen = {}
    for e in events:
        first_seen.setdefault(e['series'], e['date'])
    debuts = sorted(
        (card(s, {'first': first_seen[s], 'runs': runs_by[s]})
         for s in first_seen if _d(first_seen[s]) >= w30_start and s not in private),
        key=lambda r: (r['first'], r['name']['en'].lower()))

    # ── the grid: last 30 days, day x time band ─────────────────────────
    grid = {d: {b: 0 for b in BUCKETS} for d in DOW}
    lead = {d: {b: Counter() for b in BUCKETS} for d in DOW}
    for e in last30:
        grid[e['dow']][e['bucket']] += 1
        if e['series'] not in private:
            lead[e['dow']][e['bucket']][e['series']] += 1
    top = {d: {b: (card(lead[d][b].most_common(1)[0][0]) if lead[d][b] else None)
               for b in BUCKETS} for d in DOW}
    open_slots = [(d, b) for b in BUCKETS for d in DOW if grid[d][b] == 0]

    # ── a bit of everything: lifetime by group ──────────────────────────
    totals = Counter(group[e['series']] for e in events)
    top_by_group = defaultdict(list)
    for s, n in runs_by.most_common():
        if s in private:
            continue
        g = group[s]
        if len(top_by_group[g]) < 3:
            top_by_group[g].append(card(s, {'runs': n}))
    mix = [{'key': g['key'], 'group': g, 'events': totals.get(g['key'], 0),
            'top': top_by_group.get(g['key'], [])} for g in GROUPS['groups']]

    # ── the line: trailing-30 count for every day ───────────────────────
    rolling = a['rolling30']

    # ── the last seven days ─────────────────────────────────────────────
    week = defaultdict(list)
    for e in sorted(events, key=lambda e: (e['date'], e.get('time') or '99')):
        if _d(e['date']) >= w7_start and e['series'] not in private:
            week[e['date']].append(card(e['series'], {'time': e.get('time', '')}))

    uncategorised = sorted(s for s, g in group.items() if g == 'other' and s not in feed_cats)

    return {
        'cutoff': cutoff.isoformat(),
        'opened': opened,
        'weeks': a['meta']['weeks_active'],
        'total': len(events),
        'series': len(runs_by),
        'repeated': sum(1 for n in runs_by.values() if n > 1),
        'one_offs': sum(1 for n in runs_by.values() if n == 1),
        'last30': len(last30),
        'last30_from': w30_start.isoformat(),
        'active_days': len({e['date'] for e in last30}),
        'last90': [len(x) for x in last90],
        'per_week90': round(n90 / (90 / 7), 1),
        'per_week30': round(len(last30) / (30 / 7), 1),
        'running': len(regulars),
        'regulars': regulars,
        'debuts': debuts,
        'grid': grid,
        'grid_top': top,
        'open_slots': open_slots,
        'mix': mix,
        'rolling': rolling,
        'week': [{'date': d, 'dow': DOW[_d(d).weekday()], 'events': week[d]} for d in sorted(week)],
        'most_run': [card(s, {'runs': n}) for s, n in runs_by.most_common() if s not in private][:7],
        'uncategorised': uncategorised,
    }


def stats_json(p, urls):
    """The small, stable public file. Add fields; never rename or remove one."""
    roll = p['rolling']
    step = 14
    pts = [roll[i] for i in range(len(roll) - 1, -1, -step)][::-1]
    peak_v = max(v for _d0, v in roll)
    peak_on = max(d for d, v in roll if v == peak_v)
    return {
        'version': 1,
        'asOf': p['cutoff'],
        'openedOn': p['opened'],
        'url': urls,
        'totals': {
            'events': p['total'],
            'series': p['series'],
            'seriesRepeated': p['repeated'],
            'oneOffs': p['one_offs'],
            'weeks': p['weeks'],
        },
        'last30': {'from': p['last30_from'], 'to': p['cutoff'], 'events': p['last30'],
                   'daysWithEvents': p['active_days']},
        'last90': p['last90'],
        'perWeek90': p['per_week90'],
        'perWeek30': p['per_week30'],
        'seriesRunning': p['running'],
        'debuted30': len(p['debuts']),
        'mostRun': [{'name': c['name']['en'], 'runs': c['runs']} for c in p['most_run']],
        'growth': {
            'span': 30,
            'stepDays': step,
            'points': [{'date': d, 'events': v} for d, v in pts],
            'peak': {'events': peak_v, 'on': peak_on},
        },
        'categories': [{
            'key': m['key'],
            'name': m['group'].get('nameLong', m['group']['name']),
            'nameVi': m['group'].get('nameViLong', m['group']['nameVi']),
            'hex': m['group']['hex'],
            'events': m['events'],
        } for m in p['mix']],
    }
