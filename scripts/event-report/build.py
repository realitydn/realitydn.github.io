"""Build the public event report: realitydn.com/event-report/ (EN), /event-report/vn/ (VI)
and /event-report/stats.json.

    python -X utf8 scripts/event-report/build.py [--cutoff YYYY-MM-DD] [--out DIR]

--cutoff  the last day counted (default: yesterday in Đà Nẵng, UTC+7)
--out     where to write (default: public/event-report in this repo)

History before 8.6.26 is the frozen Google Calendar pull beside this file. From 8.6.26
on, the app's public events feed is the calendar (published events only). No secrets.

Fails safe: if the feed is unreachable, returns too little, or the count drops well
below the last published total, it stops with a non-zero exit and writes nothing, so
the previous pages stay up. See README.md.
"""

import argparse
import contextlib
import io
import json
import os
import re
import subprocess
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

# The pipeline reads and writes with the platform's default encoding; on Windows that
# is cp1252, which can't hold Vietnamese or Russian titles. Re-run in UTF-8 mode.
if not sys.flags.utf8_mode:
    sys.exit(subprocess.call([sys.executable, '-X', 'utf8', __file__, *sys.argv[1:]]))

sys.path.insert(0, str(HERE / 'pipeline'))
sys.path.insert(0, str(HERE))

import categories  # noqa: E402  (vendored)
import process_events  # noqa: E402  (vendored)
from analyze import analyse  # noqa: E402  (vendored)

import render  # noqa: E402
import report  # noqa: E402
from supplement import ALIASES, CATEGORIES, PRIVATE  # noqa: E402

APP_FROM = '2026-06-08'
FEED = 'https://app.realitydn.com/api/feed/v1/events.json?from={f}&to={t}'
SITE = 'https://realitydn.com'
URLS = {'en': SITE + '/event-report/', 'vi': SITE + '/event-report/vn/',
        'stats': SITE + '/event-report/stats.json'}
MIN_APP_EVENTS = 100      # the feed has carried 150+ a month since mid-2026
MAX_DROP = 0.05           # a total can't fall: deleted history, not a quiet week


def alias(title):
    for pat, target in ALIASES:
        if re.match(pat, title):
            return target
    return title


def fetch_feed(cutoff):
    # Ask for a day past the cutoff and filter here: don't depend on whether `to` is inclusive.
    to = (date.fromisoformat(cutoff) + timedelta(days=1)).isoformat()
    req = urllib.request.Request(FEED.format(f=APP_FROM, t=to),
                                 headers={'User-Agent': 'realitydn-event-report'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode('utf-8'))['events']


def raw_events(cutoff):
    hist = json.loads((HERE / 'history-gcal-before-8.6.26.json').read_text(encoding='utf-8'))['events']
    app, meta = [], {}
    for e in fetch_feed(cutoff):
        if e.get('status', 'published') != 'published':
            continue
        s = e['startsAt']
        if s[:10] < APP_FROM or s[:10] > cutoff:
            continue
        title = alias((e.get('title_en') or e.get('title_vi') or '').strip())
        ev = {'id': e['id'], 'summary': title, 'date': s[:10], 'time': s[11:16]}
        app.append(ev)
        meta[(title, ev['date'], ev['time'])] = {
            'category': e.get('category'), 'seriesUrl': e.get('seriesUrl'),
            'title_en': e.get('title_en'), 'title_vi': e.get('title_vi')}
    for e in hist:
        e['summary'] = alias(e['summary'])
    print(f'history {len(hist)} + app feed {len(app)} = {len(hist) + len(app)} raw entries, cutoff {cutoff}')
    if len(app) < MIN_APP_EVENTS:
        sys.exit(f'STOP: the app feed returned only {len(app)} events since {APP_FROM}; nothing written.')
    return hist + app, meta


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ict_today = datetime.now(timezone(timedelta(hours=7))).date()
    ap.add_argument('--cutoff', default=(ict_today - timedelta(days=1)).isoformat())
    ap.add_argument('--out', default=str(ROOT / 'public' / 'event-report'))
    args = ap.parse_args()
    cutoff = date.fromisoformat(args.cutoff).isoformat()
    out = Path(args.out)

    raw, feed_meta = raw_events(cutoff)

    # supplement: categories the skill doesn't know yet (nine-way; folded to six later)
    tmp = out / '.raw_events.json'
    out.mkdir(parents=True, exist_ok=True)
    tmp.write_text(json.dumps(raw, ensure_ascii=False), encoding='utf-8')
    processed = out / '.events.json'
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            process_events.process(str(tmp), str(processed), cutoff)
        data = json.loads(processed.read_text(encoding='utf-8'))
    finally:
        for f in (tmp, processed):
            if f.exists():
                f.unlink()

    for s in sorted({e['series'] for e in data['events']} - set(categories.CATEGORY_MAP)):
        cat = next((c for pat, c in CATEGORIES if re.search(pat, s)), None)
        if cat:
            categories.CATEGORY_MAP[s] = cat

    p = report.build(analyse(data), feed_meta, PRIVATE)

    prev = out / 'stats.json'
    if prev.exists():
        try:
            before = json.loads(prev.read_text(encoding='utf-8'))['totals']['events']
            if p['total'] < before * (1 - MAX_DROP) and not os.environ.get('EVENT_REPORT_FORCE'):
                sys.exit(f'STOP: {p["total"]} events is well below the last published {before}. '
                         'History went missing; nothing written. (EVENT_REPORT_FORCE=1 overrides.)')
        except (KeyError, ValueError):
            pass

    stats = report.stats_json(p, URLS)
    (out / 'vn').mkdir(parents=True, exist_ok=True)
    (out / 'index.html').write_text(render.page(p, 'en', URLS), encoding='utf-8', newline='\n')
    (out / 'vn' / 'index.html').write_text(render.page(p, 'vi', URLS), encoding='utf-8', newline='\n')
    (out / 'stats.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2) + '\n',
                                    encoding='utf-8', newline='\n')

    print(f'{p["total"]} events since {p["opened"]} · {p["last30"]} in the last 30 days · '
          f'{p["per_week90"]}/week over 90 days · {p["series"]} series ({p["repeated"]} repeated) · '
          f'{p["running"]} running · {len(p["debuts"])} new this month · '
          f'{len(p["open_slots"])} open slots')
    print('wrote', out / 'index.html', out / 'vn' / 'index.html', out / 'stats.json')
    if p['uncategorised']:
        print('UNCATEGORISED (shown as Other; add to supplement.py CATEGORIES):',
              ', '.join(p['uncategorised']))


if __name__ == '__main__':
    main()
