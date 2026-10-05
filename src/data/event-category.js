// event-category.js — the event CATEGORY (Night v2 "Cream Tickets", round 2,
// 5.10.26 — design-system-year2/design_handoff_night_cream_tickets/).
//
// A PORT of the hub's src/lib/event-category.ts — same ten keys, same rule
// table, same order, same fold. Change both together. Dependency-free like
// cal-feed.js so scripts/selftest.mjs can unit-test it without a DOM.
//
// The ten keys are the event-analysis skill's categories (its names are the
// label copy — see CAT_STR in cal-feed.js), plus `other` for the rest:
//
//   music    → blue     party  → red      games / drinks → yellow
//   language → pink     social → green    arts → purple   wellness → amber
//   film / tech / other → NEUTRAL (an ink block on cream, no hue)
//
// The colours live in index.css ([data-cat]); this file only names the key.
//
// SOURCE ORDER: the hub's feed is adding a `category` field (additive) —
// categoryOf() prefers it whenever it is one of the ten keys. Until the hub
// deploys (and for any row it leaves blank), the category is DERIVED from the
// English title + qualifier by the rule table below.

export const CATEGORIES = [
  'music', 'party', 'games', 'drinks', 'language',
  'social', 'arts', 'wellness', 'film', 'tech', 'other',
];
const KNOWN = new Set(CATEGORIES);
export const NEUTRAL_CATEGORIES = new Set(['film', 'tech', 'other']);

// First match wins. Titles are folded first (accents stripped, lowercased) and
// every alternative is matched on WORD BOUNDARIES — \b(…)\b, the analytics
// registry's form (scripts/analytics/series-registry.json in the hub). Note
// that form makes a bare stem ("freelanc", "content strateg") match only when
// a non-word character follows it; kept as-is so the two ports agree.
const RULES = [
  ['drinks', /\b(happy hour|cocktails?|wine|beer|tasting|bar crawl|mixology)\b/],
  // the specific parties first, so "Farewell Party" never reads as a talk
  ['party', /\b(farewell|birthday|going.away|leaving party|nye|new year.s eve|halloween|drinking practice|nhau)\b/],
  ['film', /\b(film|films|filmmakers?|movies?|screenings?|cinema|documentary|watch party|proshot)\b/],
  // before music: "PowerPoint Karaoke" and "Hitster: The Music Party Game" are games
  ['games', /\b(powerpoint karaoke|quiz|trivia|chess|board ?games?|geoguessr|shogi|tournament|game show|game night|party game|jackbox|video game|clocktower|hitster|poker|mahjong|bingo|werewolf|games?)\b/],
  ['music', /\b(dance|dancing|dj|karaoke|charaoke|singing|album|listening party|open mic|no mic|jam|jam session|concert|ballet|bachata|salsa|jive|band|musical|sing.?along|choir|orchestra|live music|acoustic|gig|vinyl|music)\b/],
  ['wellness', /\b(therapy|healing|somatic|meditation|mindful|wellbeing|wellness|nutrition|hormone|menstrual|longevity|self.care|boundaries|vulnerability|anxiety|adhd|burnout|breathwork|yoga|sleep|stress|journaling|body doubling|life purpose|core values)\b/],
  ['tech', /\b(startup|founder|freelanc|entrepreneur|business|marketing|linkedin|seo|client|pricing|invest|crypto|coding|developer|ai|product|sprint|career|virality|organic growth|content strateg|social media|copywriting|blockchain|web3|presentation|public speaking|skill.sharing)\b/],
  ['arts', /\b(art|paint|drawing|craft|crochet|writing|poetry|photo|photography|design|architecture|lecture|book club|book launch|exhibition|storyteller|creative|sketch)\b/],
  ['language', /\b(language|conversation|talk circle|philosophy|exchange|vietnamese|english|mandarin|french|russian|debate|discussion|talk)\b/],
  // the generic party words last, so "Album Listening Party" stays music
  ['party', /\b(party|parties|celebration|festival|rave|disco)\b/],
  ['social', /\b(meet.?up|social|hangout|circle|community|chat|club)\b/],
];

function fold(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// eventCategory(title, qualifier?) → one of CATEGORIES ('other' when nothing matches)
export function eventCategory(title, qualifier) {
  const hay = fold(`${title ?? ''} ${qualifier ?? ''}`);
  for (const [cat, re] of RULES) if (re.test(hay)) return cat;
  return 'other';
}

// categoryOf(feedEvent) — a feed row's category: the feed's own `category`
// when it is one of the ten keys, else derived from the ENGLISH title +
// qualifier (the rules are English; a VI-only title falls through to other).
export function categoryOf(ev) {
  if (ev && typeof ev.category === 'string' && KNOWN.has(ev.category)) return ev.category;
  return eventCategory(ev?.title_en ?? ev?.title, ev?.qualifier_en ?? ev?.qualifier);
}

export function isNeutralCategory(cat) {
  return NEUTRAL_CATEGORIES.has(cat);
}
