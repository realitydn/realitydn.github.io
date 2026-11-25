"""Series aliases, categories and private parties: the hand-kept rules on top of the pipeline.

The one file to edit by hand. The vendored pipeline in pipeline/ stays as the
event-overview skill shipped it; everything REALITY-specific that changes week to
week lives here.

ALIASES rewrite a title before the pipeline sees it (first match wins), so a series
that was renamed when it moved into the app keeps one history. The target must be a
title the pipeline already folds into the canonical series.

CATEGORIES fill in series missing from the skill's CATEGORY_MAP (first match wins).
The public page shows the six guest-facing groups (assets/categories.json). A series
the app's feed has seen takes the feed's own category; these nine-way names only
decide series the feed never carried (the Google Calendar history), folded to six.
Anything still uncategorised is printed by build.py and counts as "Other"; add a line.
When the skill's own rules catch up, lines here become no-ops and can go.

PRIVATE marks personal parties (birthdays, send-offs). They count in every total
but are never named on the public page: not in the regulars, the debuts, the
grid's labels or the week list. Matched against the series name (first match wins).

This file is shared with the hub's internal report (RealityHQ jobs/event-audit).
When you add a rule in one place, copy it to the other.
"""

ALIASES = [
    # renamed in the app (8.6.26 on): same night, same slot
    (r'(?i)^Chess Night', 'Chess Club'),
    (r'(?i)^(Monday Board Game Night|Board Game Night|Board Game \(Monday Make-Up\) Night)', 'Monday Board Games'),
    (r'(?i)^Speak-?Easy English', 'Speak Easy English'),
    (r'(?i)^FIRE Meetup', 'FIRE Weekly'),
    (r'(?i)^Đà Nẵng Film Forum Filmmakers Meetup', 'Filmmakers Meetup'),
    # series whose episodes carry their own subtitle
    (r'(?i)^(REALITY|Reality) Book Club', 'Book Club'),
    (r'(?i)^JUST BETWEEN US', 'Just Between Us'),
    (r'(?i)^Charaoke', 'Charaoke'),
    (r'(?i).*(Late Night Mafia|Ночная Мафия)', 'Late Night Mafia'),
    (r'(?i).*(Photography Workshop|Mobile Photography|Creative Photography|фотограф|Глазами великих)', 'Photography Workshop'),
    (r'(?i)^Мастер-класс по диджеингу', 'DJ Masterclass'),
    (r'(?i)^Da Nang Comedy: Open Mic', 'Comedy Open Mic'),
    (r'(?i)^REALITY SPEEDFRIENDING', 'Speed Friending'),
    (r'(?i)^Free Clothing Swap', 'Clothes Swap'),
    (r'(?i)^Halloween Party', 'Halloween Party!'),
]

G, L, A, M, W, T, F, S, P = (
    'Games + Trivia', 'Language + Conversation', 'Creative Arts',
    'Music + Dance + Performance', 'Wellness + Growth', 'Tech + Business',
    'Film + Screenings', 'Social + Community', 'Parties + Special Events',
)

CATEGORIES = [
    # named series
    (r'^Just Between Us$', L),
    (r'^Charaoke$', M),
    (r'^Late Night Mafia$', G),
    (r'^Photography Workshop$', A),
    (r'^DJ Masterclass$', M),
    (r'^Comedy Open Mic$', M),
    (r'^Book Club$', A),
    (r'(?i)^Blood on the Clocktower|^Jackbox|^Retro Game Club|^Improv Games|^Photogame|^The Hitster House|^Fun with Math', G),
    (r'(?i)^DJ PRACTICE LAB|^Scarioke|^Danang Classical Night|^ALBUM LISTENING|^Ecstatic Rave|^Da Nang Comedy', M),
    (r'(?i)^Creative Writing|^Workshop: Stop Chasing Virality|STREET ART|^The Naked Truth|^Rina Art Opening|^Pensieve|^Da Nang, Pixel by Pixel|^"For Creation', A),
    (r'(?i)^Hadestown|^KONIMA|^FILMMAKERS MEET-UP', F),
    (r'(?i)AI Agents|^Beyond ChatGPT|BUILDATHON|^REAL AI SYSTEMS|^SHIP FAST|^Greed > Fear', T),
    (r'(?i)^Talkshow|TALK CIRCLE|^Ghosted: A Halloween Talk Circle|^Open Talk|^BRIDGEWORK', L),
    (r'(?i)^Workshop:|^Journaling|^Procrastination|^BODY DOUBLING|^Men.s Health|^Nutrition|^Yoni|^The Egg Freezing|^Group Facilitation|^Halloween Tarot', W),
    (r'(?i)^Wine & Cheese|^Seeds for Humanity|^Boys. Drinking Practice|^Clothes Swap', S),
    (r'(?i)Party|Birthday|Anniversary|Sendoff|Hasta La Vista', P),
]

PRIVATE = [
    r'(?i)birthday|b-?day\b|sinh nh[ậa]t',
    r'(?i)send-?off|farewell|going away|come back soon|hasta la vista|chia tay',
]
