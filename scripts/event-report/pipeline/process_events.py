#!/usr/bin/env python3
"""
REALITY Event Overview — Processing Script

Takes raw Google Calendar event data (JSON) and produces:
  1. A clean, deduplicated JSON dataset with series tags
  2. Aggregate counts by series, month, and day of week
  3. A last-month focus with comparison to historical months

Usage:
    python3 process_events.py <input.json> <output.json> [--cutoff YYYY-MM-DD]

Input format:
    A JSON array of event objects, each with at minimum:
      { "id": "...", "summary": "...", "date": "YYYY-MM-DD", "time": "HH:MM" }

    The fetch step (handled by Claude before calling this script) should
    extract these fields from the raw GCal API responses and save them
    as a flat array.

Output:
    A JSON object with keys: meta, by_series, by_month, by_day_of_week,
    last_month, comparison, events
"""

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta


# ──────────────────────────────────────────────────────────────────────
# EXCLUSION PATTERNS
# Calendar entries that are not actual events. Case-insensitive.
# ──────────────────────────────────────────────────────────────────────

EXCLUDE_PATTERNS = [
    r'(?i)happy hour',
    r'(?i)buy 1 get 1',
    r'(?i)^closed',
    r'(?i)getting ready',
    r'(?i)\(CANCELED',
    r'(?i)\[CANCELED',
    r'(?i)CANCELLED',
    r'(?i)POSTPONED',
    r'(?i)^D meet',
    r'(?i)half-price',
    r'(?i)monday happy hour',
    r'(?i)^Staff ',
    r'(?i)^Team ',
    r'(?i)^Internal',
    r'(?i)^CANCELED',
    r'^\s*$',
]


def is_excluded(summary: str) -> bool:
    return any(re.search(p, summary) for p in EXCLUDE_PATTERNS)


# ──────────────────────────────────────────────────────────────────────
# SERIES NORMALIZATION MAP
# Maps raw calendar event names to canonical series names.
# Order matters: first match wins. Each entry is (regex, canonical_name).
#
# To add a new recurring event: add a line to this list.
# To rename a series: change the canonical_name string.
# ──────────────────────────────────────────────────────────────────────

NORMALIZATION_RULES = [
    # --- High-volume weekly series ---
    (r'(?i)(FILM CLUB|Film Club|Movie Club)', 'Film Club'),
    (r'(?i)Monday Board Games', 'Monday Board Games'),
    (r'(?i)Coffee \+ Conversation', 'Coffee + Conversation'),
    (r'(?i)(REALITY Pub Quiz|Pub Quiz)', 'Pub Quiz'),
    (r'(?i)(Software Developers|AI Meetup)', 'AI / Dev Meetup'),
    (r'(?i)(Karaoke|Actual Karaoke)', 'Karaoke'),
    (r'(?i)Create in Community', 'Create in Community'),
    (r'(?i)Speak Easy', 'Speak Easy English'),
    (r'(?i)(Authentic Relating|Circling)', 'Authentic Relating / Circling'),
    (r'(?i)GeoGuessr', 'GeoGuessr'),
    (r'(?i)No Mic Open Mic', 'No Mic Open Mic'),
    (r'(?i)(Beginner Vietnamese|Vietnamese Language|Vietnamese Pronunciation|Practice Vietnamese)', 'Vietnamese Language'),

    # --- Chess (must match before generic "Da Nang" / "Đà Nẵng" entries) ---
    (r'(?i)(Da Nang|Đà Nẵng).*Chess', 'Chess Club'),
    (r'(?i)Chess (Tournament|CUP|Cup)', 'Chess Tournament'),

    # --- Film / creative ---
    (r'(?i)Indie Shorts', 'Indie Shorts Film Forum'),
    (r'(?i)Filmmakers Meetup', 'Filmmakers Meetup'),
    (r'(?i)Filmmaking Workshop', 'Filmmaking Workshop'),
    (r'(?i)Short Film Focus', 'Indie Shorts Film Forum'),
    (r'(?i)Normal People Poetry', 'Normal People Poetry Clique'),
    (r'(?i)Writing Workshop', 'Writing Workshop Group'),
    (r'(?i)Writing Stories', 'Writing Stories for Stage + Screen'),
    (r'(?i)Page to Stage', 'Page to Stage'),
    (r'(?i)Open Art Circle', 'Open Art Circle'),
    (r'(?i)(Painting|Sip & Paint|Watercolor|Acrylic)', 'Painting / Art Workshop'),
    (r'(?i)Art Opening', 'Art Opening / Exhibition'),
    (r'(?i)Inter-[Aa]ction', 'Inter-Action: Paint-Jam'),
    (r'(?i)(PowerPoint Karaoke|Anti-TED)', 'PowerPoint Karaoke'),
    (r'(?i)Pecha Kucha', 'Pecha Kucha'),
    (r'(?i)Prototype Radio', 'Prototype Radio'),
    (r'(?i)Book Club', 'Book Club'),

    # --- Movement / body ---
    (r'(?i)(LearnToDance|Learn To Dance)', 'LearnToDance / Jive Social'),
    (r'(?i)Latin Dance', 'Latin Dance Playground'),
    (r'(?i)(Beginner Bachata|Bachata|Beginning Bachata)', 'Bachata Workshop'),
    (r'(?i)Bollywood', 'Bollywood Dance Workshop'),
    (r'(?i)Ecstatic Dance', 'Ecstatic Dance'),
    (r'(?i)Intro to Tai Chi', 'Tai Chi / Qi Gong'),
    (r'(?i)Yin Yoga', 'Yin Yoga + Sound Healing'),

    # --- Discussion / talk ---
    (r'(?i)Talk Circle', 'Talk Circle'),
    (r'(?i)IRL.*Passion', 'IRL Passion Projects'),
    (r'(?i)Real Talk Philos', 'Real Talk Philosophy'),
    (r'(?i)Vietnam Talk', 'Vietnam Talk'),
    (r'(?i)FIRE Weekly', 'FIRE Weekly'),
    (r'(?i)Trader Talk', 'Trader Talk'),
    (r'(?i)Personal Growth', 'Personal Growth Meetup'),
    (r'(?i)Culture C[àa]', 'Culture Ca Phe'),
    (r'(?i)Vietnam Unfiltered', 'Vietnam Unfiltered'),

    # --- Business / tech ---
    (r'(?i)(Problem-Solving Business|Business Clinic)', 'Business Clinic'),
    (r'(?i)(Networking|Connect\+|Working Networking)', 'Networking / Workshop'),
    (r'(?i)(Online Coaches)', 'Online Coaches Club'),
    (r'(?i)Startup ABC', 'Startup ABC'),
    (r'(?i)(Coding with LLMs|60-Minute MVP)', 'Buildathon'),
    (r'(?i)Vibe Coding', 'Vibe Coding'),
    (r'(?i)LinkedIn', 'LinkedIn Workshop'),
    (r'(?i)GameDev', 'GameDev Meetup'),

    # --- Social / games ---
    (r'(?i)Friday Party Game', 'Friday Party Games'),
    (r'(?i)(Hitster|Hitster!|Hitster:)', 'Hitster'),
    (r'(?i)Speed Friending', 'Speed Friending'),
    (r'(?i)(Dating Event|Find Your Valentine|No More Bad Dates)', 'Dating Event'),
    (r'(?i)(Drinking Games|Social Party)', 'Social / Party Games'),
    (r'(?i)(Gameshow|Game Show|Minute to Win|Drunk Debates|Compatibility Quiz)', 'Game Show'),
    (r'(?i)Truth or Dare', 'Truth or Dare'),
    (r'(?i)Retro Games', 'Retro Games'),
    (r'(?i)GeekON', 'GeekON (Ukrainian Pub Quiz)'),
    (r'(?i)Intro to Shogi', 'Intro to Shogi'),
    (r'(?i)Improv Comedy', 'Improv Comedy Workshop'),

    # --- Wellness / workshop ---
    (r'(?i).*Practical Happiness', 'Practical Happiness'),
    (r'(?i).*Somatic Therapy', 'Somatic Therapy Workshop'),
    (r'(?i).*Assertiveness', 'Assertiveness Training'),
    (r'(?i).*Calming Anxiety', 'Calming Anxiety Workshop'),
    (r'(?i).*Stress Hacking', 'Stress Hacking Workshop'),
    (r'(?i).*Purposeful Emotions', 'Workshop: Purposeful Emotions'),
    (r'(?i).*Rewarding.*Relationships', 'Relationships Workshop'),
    (r'(?i).*Reflective Listening', 'Reflective Listening Workshop'),
    (r'(?i).*Authentic Self.*Survival', 'Authentic Self Workshop'),
    (r'(?i).*Values.*Visions', 'Values + Visions Workshop'),
    (r'(?i)Energy Workshop', 'Energy Workshop'),

    # --- Other recurring ---
    (r'(?i)Women of REALITY', 'Women of REALITY'),
    (r'(?i)Crochet', 'Crocheting Circle'),
    (r'(?i)Shibari (Course|Training)', 'Shibari'),
    (r'(?i)Shibari Master', 'Shibari'),
    (r'(?i)(Da Nang|Đà Nẵng).*Kink|.*Kink Group', 'Kink Group Munch'),
    (r'(?i)Slow Sunday', 'Slow Sunday + Book Chat'),
    (r'(?i)Acoustic (Moment|Jam)', 'Acoustic Jam Session'),
    (r'(?i)Chinese Language', 'Chinese Language Club'),
    (r'(?i)(Business Breakfast.*Russian|Russian.*Business Breakfast|Business [Bb]reakfast Da Nang|Бизнес|Da Nang Business Breakfast|\(Russian\) Business)', 'Russian Business Breakfast'),
    (r'(?i)Russian Poetry', 'Russian Poetry Club'),
    (r'(?i)Language Exchange.*Flirting', 'Language Exchange: Flirting Edition'),
    (r'(?i)DNBoardgame', 'DNBoardgame.com Meetup'),

    # --- Parties / one-off categories ---
    (r'(?i)Spring Fling', 'Spring Fling Party'),
    (r'(?i)New Year', 'New Years Eve Party'),
    (r'(?i)(Valentine|White Valentine)', "Valentine's Event"),
    (r'(?i).*Erosa Chocolate', 'Erosa Chocolate Tasting'),
    (r'(?i)Dom Venice', 'Listening Party'),
    (r'(?i).*Network States', 'Network States Talk'),
    (r'(?i).*Hidden Patterns', 'Hidden Patterns Talk'),

    # --- Series that emerged over 2026 (added Sept 2026) ---
    (r'(?i)(Mandarin Fun Club|MANDARIN FUN CLUB|Chinese Calligraphy Experience)', 'Mandarin Fun Club'),
    (r'(?i)Philosophy Caf[eé]', 'Philosophy Café'),
    (r'(?i).*Spill It', 'Spill It with Dr. Steph'),
    (r'(?i)(DNF Skill-Sharing|Digital Nomad Fest Skill-Sharing)', 'DNF Skill-Sharing Sundays'),
    (r'(?i)P[Uu][Ll][Ss][Ee] Session', 'PULSE Sessions'),
    (r'(?i)WALKABOUT', 'WALKABOUT Public Speaking Series'),
    (r'(?i)Storyteller', 'Storyteller'),
    (r'(?i)(Nutrition Workshop|Workshop: Nutrition)', 'Nutrition Workshop'),
    (r'(?i).*Dating Redesign', 'Dating Redesign'),
    (r'(?i)TA \+ T[ÂAâa]Y', 'TA + TÂY: Vietnamese - Foreigner Social'),
    (r'(?i)Modern Jive', 'Modern Jive Dancing for Beginners'),
    (r'(?i)Let.s Talk Taoism', "Let's Talk Taoism"),
    (r'(?i)Entrepreneurs-Only', 'Entrepreneurs-Only Meetup'),
    (r'(?i)How to DJ', 'How to DJ'),
    (r'(?i)Open Shelf Book Club', 'Book Club'),
    (r'(?i)FIFA', 'FIFA World Cup Screening'),
    (r'(?i)Persuasion in Practice', 'Persuasion in Practice'),
    (r'(?i)(Kink 101|.*Kink Munch)', 'Kink Group Munch'),
    (r'(?i)[“"”]?Awareness Itself', 'Awareness Itself: Nondual Meditation'),
    (r'(?i)Short Films Talk', 'Indie Shorts Film Forum'),
    (r'(?i)The AI Dojo', 'The AI Dojo'),
    (r'(?i)(Da Nang Content Creators|Danang Content Creators|Content Creator Meetup)', 'Da Nang Content Creators Meetup'),
    (r'(?i)48h Startup Challenge', '48h Startup Challenge'),
    (r'(?i)Core Values Discovery', 'Core Values Discovery Workshop'),
    (r'(?i)Grounded: A Men', 'Grounded: A Men’s Wellness Talk'),
    (r'(?i)(Let.s Chat: Sisterhood|Sisterhood Circle)', 'Sisterhood Circle'),
    (r'(?i)AI & Us', 'AI & Us: Understanding Our Changing World'),
    # --- Sweep: title variants of one series (added Sept 2026) ---
    (r'(?i).*Short Film', 'Indie Shorts Film Forum'),
    (r'(?i).*Shibari', 'Shibari'),
    (r'(?i).*Writing Stories', 'Writing Stories for Stage + Screen'),
    (r'(?i)(Tearoom|Open Decks)', 'Tearoom - DJ Open Decks'),
    (r'(?i).*Truth or Dare', 'Truth or Dare'),
    (r'(?i).*Chess (Tournament|Championship)', 'Chess Tournament'),
    (r'(?i)Board Game Monday', 'Monday Board Games'),
    (r'(?i)Language Mixer', 'Language Mixer'),
    (r'(?i).*GameDev', 'GameDev Meetup'),
    (r'(?i).*Game (Design|Jam)', 'Game Design Workshop + Game Jam'),
    (r'(?i).*LinkedIn', 'LinkedIn Workshop'),
    (r'(?i)Wildcats', 'Wildcats Networking'),
    (r'(?i)(Startup ABC|Sales ABC)', 'Startup / Sales ABC'),
    (r'(?i).*Clothes Swap', 'Clothes Swap'),
    (r'(?i)small things, mostly', 'small things, mostly'),
    (r'(?i)\(Re\)Birth', '(Re)Birth'),
    (r'(?i)ADHD', 'ADHD Talk'),
    (r'(?i)Interactive [Ll]ecture', 'Interactive Lecture Series'),
    (r'(?i)(Opening Reception|Photography Opening|.*Exhibition Opening|Jeffrey Hessing|Last Call: Jeffrey|Subconscious Color|For Creation)', 'Art Opening / Exhibition'),
    (r'(?i)Workshop: I Fear Making Art', 'Workshop: I Fear Making Art'),
    (r'(?i)Workshop: (Procrastination|Goals)', 'Workshop: Goals, Habits + Procrastination'),
    (r'(?i)Workshop: Stress, Cortisol', 'Workshop: Stress + Cortisol'),
    (r'(?i)Workshop: Developing.*Self-Care', 'Workshop: Self-Care Plan'),
    (r'(?i)Workshop: (Unconditional Acceptance|S\u1ef1 Ch\u1ea5p Nh\u1eadn)', 'Workshop: Unconditional Acceptance'),
    (r'(?i)Workshop: Relationship', 'Relationships Workshop'),
]


def normalize(name: str) -> str:
    """Map a raw calendar event name to its canonical series name."""
    n = name.strip()
    for pattern, canonical in NORMALIZATION_RULES:
        if re.match(pattern, n):
            return canonical
    return n  # no match → keep original


# ──────────────────────────────────────────────────────────────────────
# MAIN PROCESSING
# ──────────────────────────────────────────────────────────────────────

def process(input_path: str, output_path: str, cutoff_date: str = None):
    with open(input_path) as f:
        raw_events = json.load(f)

    # Default cutoff: today
    if cutoff_date is None:
        cutoff_date = datetime.now().strftime('%Y-%m-%d')

    # REALITY opened late May 2025
    start_date = '2025-05-25'

    # Step 1: Filter
    filtered = [
        e for e in raw_events
        if start_date <= e['date'] <= cutoff_date
        and not is_excluded(e['summary'])
    ]

    # Step 2: Normalize
    for e in filtered:
        e['series'] = normalize(e['summary'])

    # Step 3: Deduplicate (same series + date + time = one event)
    seen = set()
    deduped = []
    for e in filtered:
        key = (e['series'], e['date'], e.get('time', ''))
        if key not in seen:
            seen.add(key)
            deduped.append(e)

    deduped.sort(key=lambda x: (x['date'], x.get('time', '')))

    # Step 4: Aggregate
    series_counts = Counter(e['series'] for e in deduped)
    month_counts = Counter(e['date'][:7] for e in deduped)

    dow_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dow_counts = Counter()
    for e in deduped:
        try:
            d = datetime.strptime(e['date'], '%Y-%m-%d')
            dow_counts[d.strftime('%A')] += 1
        except ValueError:
            pass

    # Step 5: Last-month focus
    cutoff_dt = datetime.strptime(cutoff_date, '%Y-%m-%d')
    # "Last month" = the most recent full calendar month before cutoff
    if cutoff_dt.month == 1:
        last_month_year = cutoff_dt.year - 1
        last_month_num = 12
    else:
        last_month_year = cutoff_dt.year
        last_month_num = cutoff_dt.month - 1
    last_month_key = f"{last_month_year}-{last_month_num:02d}"

    last_month_events = [e for e in deduped if e['date'][:7] == last_month_key]
    lm_series = Counter(e['series'] for e in last_month_events)
    lm_dow = Counter()
    for e in last_month_events:
        try:
            d = datetime.strptime(e['date'], '%Y-%m-%d')
            lm_dow[d.strftime('%A')] += 1
        except ValueError:
            pass

    # Step 6: Month-over-month comparison
    # Get all full months (exclude the current partial month)
    current_month_key = cutoff_dt.strftime('%Y-%m')
    full_months = {k: v for k, v in month_counts.items() if k != current_month_key}
    if full_months:
        avg_per_month = sum(full_months.values()) / len(full_months)
        max_month = max(full_months, key=full_months.get)
        min_month = min(full_months, key=full_months.get)
    else:
        avg_per_month = 0
        max_month = min_month = None

    # Which series are new in last month (didn't exist before)?
    prior_events = [e for e in deduped if e['date'][:7] < last_month_key]
    prior_series = set(e['series'] for e in prior_events)
    new_series = [s for s in lm_series if s not in prior_series]

    # Which series appeared before but not in last month?
    lm_series_set = set(lm_series.keys())
    # Only flag series that appeared in the 2 months before last month
    two_months_ago = last_month_num - 2 if last_month_num > 2 else last_month_num + 10
    two_months_ago_year = last_month_year if last_month_num > 2 else last_month_year - 1
    recent_prior_key_start = f"{two_months_ago_year}-{two_months_ago:02d}"
    recent_prior = [
        e for e in deduped
        if recent_prior_key_start <= e['date'][:7] < last_month_key
    ]
    recent_prior_series = set(e['series'] for e in recent_prior)
    missing_series = [s for s in recent_prior_series if s not in lm_series_set and series_counts[s] >= 3]

    # Step 7: Build output
    # Calculate weeks active for sanity context
    first_event_date = deduped[0]['date'] if deduped else start_date
    last_event_date = deduped[-1]['date'] if deduped else cutoff_date
    days_active = (datetime.strptime(last_event_date, '%Y-%m-%d') - datetime.strptime(first_event_date, '%Y-%m-%d')).days
    weeks_active = max(1, days_active / 7)

    recurring = [(k, v) for k, v in series_counts.most_common() if v >= 3]
    oneoff = [(k, v) for k, v in series_counts.most_common() if v < 3]

    output = {
        'meta': {
            'period_start': first_event_date,
            'period_end': last_event_date,
            'cutoff_date': cutoff_date,
            'days_active': days_active,
            'weeks_active': round(weeks_active, 1),
            'total_raw_entries': len(raw_events),
            'excluded': len(raw_events) - len(filtered),
            'duplicates_removed': len(filtered) - len(deduped),
            'total_unique_events': len(deduped),
            'distinct_event_types': len(series_counts),
            'recurring_series_count': len(recurring),
            'oneoff_count': len(oneoff),
            'avg_per_week': round(len(deduped) / weeks_active, 1),
            'avg_per_month': round(avg_per_month, 1) if full_months else 0,
        },
        'by_series': dict(series_counts.most_common()),
        'by_month': dict(sorted(month_counts.items())),
        'by_day_of_week': {d: dow_counts.get(d, 0) for d in dow_names},
        'last_month': {
            'month': last_month_key,
            'total_events': len(last_month_events),
            'distinct_types': len(lm_series),
            'by_series': dict(lm_series.most_common()),
            'by_day_of_week': {d: lm_dow.get(d, 0) for d in dow_names},
            'vs_average': round(len(last_month_events) - avg_per_month, 1) if avg_per_month else 0,
            'vs_average_pct': round((len(last_month_events) / avg_per_month - 1) * 100, 1) if avg_per_month else 0,
        },
        'comparison': {
            'busiest_month': max_month,
            'busiest_month_count': full_months.get(max_month, 0) if max_month else 0,
            'quietest_month': min_month,
            'quietest_month_count': full_months.get(min_month, 0) if min_month else 0,
            'new_series_last_month': new_series,
            'missing_series_last_month': missing_series,
        },
        'events': [
            {
                'series': e['series'],
                'date': e['date'],
                'time': e.get('time', ''),
                'original_name': e['summary'],
            }
            for e in deduped
        ],
    }

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # Print human-readable summary to stdout
    print(f"REALITY EVENT OVERVIEW")
    print(f"Period: {first_event_date} to {last_event_date} ({days_active} days, {weeks_active:.0f} weeks)")
    print(f"{'='*65}")
    print(f"Total unique events: {len(deduped)}")
    print(f"  Raw calendar entries: {len(raw_events)}")
    print(f"  Excluded (non-events): {len(raw_events) - len(filtered)}")
    print(f"  Duplicates removed: {len(filtered) - len(deduped)}")
    print(f"Distinct event types: {len(series_counts)}")
    print(f"Average: ~{len(deduped)/weeks_active:.0f}/week, ~{avg_per_month:.0f}/month")
    print()

    print(f"RECURRING SERIES (3+ instances): {len(recurring)} series")
    print(f"{'-'*65}")
    for i, (name, count) in enumerate(recurring, 1):
        freq = count / weeks_active
        label = ""
        if freq > 0.85:
            label = " (weekly)"
        elif freq > 0.4:
            label = " (biweekly)"
        elif freq > 0.2:
            label = " (monthly)"
        print(f"  {i:2d}. {name}: {count}{label}")

    print()
    print(f"ONE-OFF / LOW-FREQUENCY: {len(oneoff)} types, {sum(v for _,v in oneoff)} instances")
    print()

    print(f"LAST MONTH: {last_month_key}")
    print(f"{'-'*65}")
    print(f"  Events: {len(last_month_events)} ({output['last_month']['vs_average_pct']:+.0f}% vs avg)")
    print(f"  Distinct types: {len(lm_series)}")
    if new_series:
        print(f"  New series: {', '.join(new_series)}")
    if missing_series:
        print(f"  Missing (were recent): {', '.join(missing_series)}")
    print(f"  Top 10:")
    for name, count in lm_series.most_common(10):
        print(f"    {name}: {count}")
    print()

    print(f"BY MONTH:")
    print(f"{'-'*65}")
    for m in sorted(month_counts.keys()):
        bar = '#' * (month_counts[m] // 3)
        marker = " <-- last month" if m == last_month_key else ""
        print(f"  {m}: {month_counts[m]:3d} {bar}{marker}")
    print()

    print(f"BY DAY OF WEEK:")
    print(f"{'-'*65}")
    for d in dow_names:
        c = dow_counts.get(d, 0)
        bar = '#' * (c // 3)
        print(f"  {d:>9s}: {c:3d} {bar}")

    print(f"\nOutput saved to: {output_path}")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 process_events.py <input.json> <output.json> [--cutoff YYYY-MM-DD]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    cutoff = None
    if '--cutoff' in sys.argv:
        idx = sys.argv.index('--cutoff')
        if idx + 1 < len(sys.argv):
            cutoff = sys.argv[idx + 1]

    process(input_path, output_path, cutoff)