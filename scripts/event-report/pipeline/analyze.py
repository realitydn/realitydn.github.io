"""
Analysis layer for the REALITY event overview.

Takes the processed events array from process_events.py and derives every
layer the report renders. Nothing here touches presentation.

The unit of analysis is the rolling 30-day window, not the calendar month:
months differ in length and in how many Saturdays they contain, which is
enough to swamp a real 10% change in programming volume.
"""

from collections import Counter, defaultdict
from datetime import date, timedelta
from statistics import median

from categories import CATEGORY_MAP, CATEGORY_ORDER

DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

TIME_BUCKETS = [
    ('Daytime', 0, 12),      # opens 11:00 — anything before noon
    ('Afternoon', 12, 17),
    ('Evening', 17, 21),
    ('Late', 21, 24),
]


def _d(s):
    return date.fromisoformat(s)


def bucket_of(time_str):
    if not time_str:
        return 'Daytime'
    hour = int(time_str[:2])
    for name, lo, hi in TIME_BUCKETS:
        if lo <= hour < hi:
            return name
    return 'Late'


# ──────────────────────────────────────────────────────────────────────
# WINDOWS
# ──────────────────────────────────────────────────────────────────────

def window(events, start, end):
    """Events with start <= date <= end."""
    return [e for e in events if start <= _d(e['date']) <= end]


def rolling_counts(events, cutoff, span=30):
    """Daily series of 'events in the trailing `span` days', across the history."""
    by_date = Counter(e['date'] for e in events)
    first = min(_d(e['date']) for e in events)
    start = first + timedelta(days=span - 1)
    out = []
    day = start
    while day <= cutoff:
        total = sum(by_date.get((day - timedelta(days=i)).isoformat(), 0) for i in range(span))
        out.append((day.isoformat(), total))
        day += timedelta(days=1)
    return out


def compare_windows(events, cutoff, span=30):
    """The last `span` days against every baseline worth having."""
    cur_start = cutoff - timedelta(days=span - 1)
    prev_start = cur_start - timedelta(days=span)
    prev_end = cur_start - timedelta(days=1)
    yr_start = cur_start - timedelta(days=364)
    yr_end = cutoff - timedelta(days=364)

    cur = window(events, cur_start, cutoff)
    prev = window(events, prev_start, prev_end)
    yr = window(events, yr_start, yr_end)

    # trailing 12-month average window, excluding the current one
    roll = rolling_counts(events, prev_end, span)
    last_year = [v for d, v in roll if _d(d) > prev_end - timedelta(days=365)]
    baseline = sum(last_year) / len(last_year) if last_year else 0

    # all-time average window
    all_roll = rolling_counts(events, cutoff, span)
    alltime = sum(v for _, v in all_roll) / len(all_roll) if all_roll else 0

    def delta(a, b):
        return None if not b else (a - b) / b * 100

    return {
        'span': span,
        'current': {'start': cur_start.isoformat(), 'end': cutoff.isoformat(),
                    'count': len(cur), 'events': cur},
        'previous': {'start': prev_start.isoformat(), 'end': prev_end.isoformat(),
                     'count': len(prev), 'events': prev},
        'year_ago': {'start': yr_start.isoformat(), 'end': yr_end.isoformat(),
                     'count': len(yr), 'events': yr},
        'baseline_12mo': round(baseline, 1),
        'baseline_alltime': round(alltime, 1),
        'vs_previous': delta(len(cur), len(prev)),
        'vs_year_ago': delta(len(cur), len(yr)),
        'vs_baseline': delta(len(cur), baseline),
    }


# ──────────────────────────────────────────────────────────────────────
# CATEGORY MIX
# ──────────────────────────────────────────────────────────────────────

def category_mix(subset, all_events):
    """Share of a window by category, and how it indexes against the whole history."""
    sub = Counter(e['category'] for e in subset)
    base = Counter(e['category'] for e in all_events)
    n_sub, n_base = len(subset) or 1, len(all_events) or 1
    rows = []
    for cat in CATEGORY_ORDER:
        s_share = sub.get(cat, 0) / n_sub * 100
        b_share = base.get(cat, 0) / n_base * 100
        rows.append({
            'category': cat,
            'count': sub.get(cat, 0),
            'share': round(s_share, 1),
            'baseline_share': round(b_share, 1),
            'index': round(s_share / b_share * 100) if b_share else None,
        })
    return rows


def category_by_month(events, months):
    out = {}
    for m in months:
        c = Counter(e['category'] for e in events if e['date'][:7] == m)
        out[m] = {cat: c.get(cat, 0) for cat in CATEGORY_ORDER}
    return out


# ──────────────────────────────────────────────────────────────────────
# THE SLOT GRID — day of week x time of day
# ──────────────────────────────────────────────────────────────────────

def slot_grid(subset):
    """7 days x 4 time bands. Where the calendar is saturated and where it is empty."""
    grid = {d: {b[0]: 0 for b in TIME_BUCKETS} for d in DOW}
    detail = {d: {b[0]: Counter() for b in TIME_BUCKETS} for d in DOW}
    for e in subset:
        d = DOW[_d(e['date']).weekday()]
        b = bucket_of(e.get('time', ''))
        grid[d][b] += 1
        detail[d][b][e['series']] += 1
    return {
        'grid': grid,
        'top': {d: {b: (detail[d][b].most_common(1)[0] if detail[d][b] else None)
                    for b in [x[0] for x in TIME_BUCKETS]} for d in DOW},
    }


# ──────────────────────────────────────────────────────────────────────
# SERIES HEALTH — the roster
# ──────────────────────────────────────────────────────────────────────

CADENCE_BANDS = [
    (0, 9, 'weekly'),
    (9, 18, 'fortnightly'),
    (18, 45, 'monthly'),
    (45, 120, 'occasional'),
]


def cadence_label(gap):
    if gap is None:
        return 'one-off'
    for lo, hi, name in CADENCE_BANDS:
        if lo <= gap < hi:
            return name
    return 'rare'


def series_health(events, cutoff):
    """Per-series lifecycle: cadence, streak, and whether it is still running."""
    by_series = defaultdict(list)
    for e in events:
        by_series[e['series']].append(_d(e['date']))

    rows = []
    for name, dates in by_series.items():
        dates.sort()
        gaps = [(b - a).days for a, b in zip(dates, dates[1:])]
        typical = median(gaps) if gaps else None
        since = (cutoff - dates[-1]).days
        age = (cutoff - dates[0]).days

        if len(dates) == 1:
            status = 'one-off'
        elif typical is None:
            status = 'one-off'
        elif since <= max(typical * 1.6, 10):
            status = 'active'
        elif since <= max(typical * 3.5, 35):
            status = 'slowing'
        elif since <= 120:
            status = 'dormant'
        else:
            status = 'retired'

        rows.append({
            'series': name,
            'category': CATEGORY_MAP.get(name, 'Uncategorized'),
            'runs': len(dates),
            'first': dates[0].isoformat(),
            'last': dates[-1].isoformat(),
            'days_since': since,
            'age_days': age,
            'typical_gap': typical,
            'cadence': cadence_label(typical),
            'status': status,
        })
    rows.sort(key=lambda r: (-r['runs'], r['series']))
    return rows


def roster_movement(health, events, cutoff, span=30):
    """What arrived, what came back, and what stopped — within the window."""
    cur_start = cutoff - timedelta(days=span - 1)
    prior = {e['series'] for e in events if _d(e['date']) < cur_start}
    in_window = {e['series'] for e in events if _d(e['date']) >= cur_start}
    by_name = {h['series']: h for h in health}

    debut = sorted(in_window - prior)
    returning = sorted(
        s for s in in_window & prior
        if by_name[s]['runs'] > 1
        and (cur_start - max(
            _d(e['date']) for e in events
            if e['series'] == s and _d(e['date']) < cur_start)).days >= 60
    )
    stalled = sorted(
        (h for h in health
         if h['series'] not in in_window and h['runs'] >= 3
         and h['status'] in ('slowing', 'dormant')),
        key=lambda h: -h['runs'])
    return {'debut': debut, 'returning': returning, 'stalled': stalled}


# ──────────────────────────────────────────────────────────────────────
# CHURN, CONCENTRATION, SURVIVAL
# ──────────────────────────────────────────────────────────────────────

def churn_by_month(events, months, mature_days=180):
    """
    How much of each month came from long-established series versus newer ones.
    A calendar that is all veterans has stopped experimenting; one that is all
    newcomers has nothing people can rely on.
    """
    first_seen = {}
    for e in sorted(events, key=lambda x: x['date']):
        first_seen.setdefault(e['series'], _d(e['date']))
    out = {}
    for m in months:
        month_events = [e for e in events if e['date'][:7] == m]
        if not month_events:
            continue
        veteran = sum(1 for e in month_events
                      if (_d(e['date']) - first_seen[e['series']]).days >= mature_days)
        debut = sum(1 for e in month_events
                    if first_seen[e['series']].isoformat()[:7] == m)
        total = len(month_events)
        out[m] = {
            'total': total,
            'veteran': veteran,
            'veteran_pct': round(veteran / total * 100),
            'debut': debut,
            'debut_pct': round(debut / total * 100),
        }
    return out


def concentration_by_month(events, months, top_n=10):
    """Top-N share and HHI. Rising concentration means fewer series carry more nights."""
    out = {}
    for m in months:
        counts = Counter(e['series'] for e in events if e['date'][:7] == m)
        total = sum(counts.values())
        if not total:
            continue
        top = sum(c for _, c in counts.most_common(top_n))
        hhi = sum((c / total) ** 2 for c in counts.values())
        out[m] = {
            'top_share': round(top / total * 100),
            'hhi': round(hhi * 10000),
            'distinct': len(counts),
            'total': total,
        }
    return out


def survival(events, cutoff, horizon=90):
    """
    Of the series that debuted in a month, what share were still running
    `horizon` days later. The hit rate on new programming.
    """
    first_seen = defaultdict(list)
    for e in sorted(events, key=lambda x: x['date']):
        first_seen[e['series']].append(_d(e['date']))

    cohorts = defaultdict(lambda: {'debuts': 0, 'survived': 0})
    for name, dates in first_seen.items():
        debut = dates[0]
        if (cutoff - debut).days < horizon:
            continue  # not enough time to judge
        cohort = debut.isoformat()[:7]
        cohorts[cohort]['debuts'] += 1
        if any((d - debut).days >= horizon for d in dates):
            cohorts[cohort]['survived'] += 1
    out = {}
    for m, v in sorted(cohorts.items()):
        out[m] = {**v, 'rate': round(v['survived'] / v['debuts'] * 100) if v['debuts'] else 0}
    return out


def agenda(subset):
    """The window as a schedule: every event, grouped by day, in running order."""
    days = defaultdict(list)
    for e in sorted(subset, key=lambda e: (e['date'], e.get('time') or '99')):
        days[e['date']].append(e)
    return [{'date': d, 'dow': DOW[_d(d).weekday()], 'events': days[d]}
            for d in sorted(days)]


def build_view(events, cutoff, span, health):
    """Everything that is scoped to a trailing window of `span` days."""
    w = compare_windows(events, cutoff, span)
    sub = w['current']['events']
    return {
        'span': span,
        'windows': w,
        'rolling': rolling_counts(events, cutoff, span),
        'mix': category_mix(sub, events),
        'movement': roster_movement(health, events, cutoff, span),
        'slots': slot_grid(sub),
        'agenda': agenda(sub),
        'top_series': Counter(e['series'] for e in sub).most_common(12),
        'by_dow': {d: sum(1 for e in sub if e['dow'] == d) for d in DOW},
        'distinct_series': len({e['series'] for e in sub}),
    }


# ──────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ──────────────────────────────────────────────────────────────────────

def analyse(data):
    events = [dict(e) for e in data['events']]
    for e in events:
        e['category'] = CATEGORY_MAP.get(e['series'], 'Uncategorized')
        e['dow'] = DOW[_d(e['date']).weekday()]
        e['bucket'] = bucket_of(e.get('time', ''))

    cutoff = _d(data['meta']['cutoff_date'])
    months = sorted({e['date'][:7] for e in events})
    health = series_health(events, cutoff)
    w30 = compare_windows(events, cutoff, 30)
    w90_start = cutoff - timedelta(days=89)

    uncategorized = sorted({e['series'] for e in events if e['category'] == 'Uncategorized'})

    return {
        'views': {
            'week': build_view(events, cutoff, 7, health),
            'month': build_view(events, cutoff, 30, health),
        },
        'meta': data['meta'],
        'events': events,
        'months': months,
        'cutoff': cutoff.isoformat(),
        'uncategorized': uncategorized,

        'windows': w30,
        'rolling30': rolling_counts(events, cutoff, 30),
        'top_series_all': Counter(e['series'] for e in events).most_common(25),

        'mix_window': category_mix(w30['current']['events'], events),
        'mix_prev': category_mix(w30['previous']['events'], events),
        'mix_year_ago': category_mix(w30['year_ago']['events'], events),
        'category_by_month': category_by_month(events, months),
        'category_totals': dict(Counter(e['category'] for e in events)),

        'slots_all': slot_grid(events),
        'slots_90': slot_grid(window(events, w90_start, cutoff)),

        'health': health,
        'movement': roster_movement(health, events, cutoff, 30),

        'churn': churn_by_month(events, months),
        'concentration': concentration_by_month(events, months),
        'survival': survival(events, cutoff),

        'by_month': {m: sum(1 for e in events if e['date'][:7] == m) for m in months},
        'by_dow': {d: sum(1 for e in events if e['dow'] == d) for d in DOW},
    }
