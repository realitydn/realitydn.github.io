// event-category.js — the event CATEGORY (Night v2 "Cream Tickets").
//
// A PORT of the hub's src/lib/event-category.ts — same keys, same fold, same
// rule table in the same order. Change both together. Dependency-free like
// cal-feed.js so scripts/selftest.mjs can unit-test it without a DOM.
//
// Six guest-facing groups since 6.10.26 (Donald: "Combine Games + Social +
// Parties · Rename Language to Talk Events · Cut Drinks for now · Combine
// Film + Arts + Music"):
//
//   social   (Games + Social)     → red
//   arts     (Arts, Film, Music)  → blue
//   language (Talk Events)        → pink
//   wellness                      → amber
//   tech / other                  → NEUTRAL (an ink block on cream, no hue)
//
// The colours live in index.css ([data-cat]); this file only names the key.
// The hub's feed publishes the resolved group (FeedEvent.category);
// categoryOf() reads it, folding any older finer key (FOLDED) for a cached
// feed, and falls back to the English title through the rule table, whose
// families are still the rubric's finer ones (each answering with its group).

export const CATEGORIES = ['social', 'arts', 'language', 'wellness', 'tech', 'other'];
const KNOWN = new Set(CATEGORIES);
// The finer keys the hub stored (migration 0090) and their group today.
export const FOLDED = { games: 'social', party: 'social', drinks: 'social', film: 'arts', music: 'arts' };
export const NEUTRAL_CATEGORIES = new Set(['tech', 'other']);

export function normalizeCategory(v) {
  if (typeof v !== 'string') return null;
  if (KNOWN.has(v)) return v;
  return FOLDED[v] || null;
}

// First match wins. Titles are folded first (accents stripped, lowercased) and
// every alternative is matched on WORD BOUNDARIES — \b(…)\b, the analytics
// registry's form (scripts/analytics/series-registry.json in the hub). Note
// that form makes a bare stem ("freelanc", "content strateg") match only when
// a non-word character follows it; kept as-is so the two ports agree.
const RULES = [
  // Donald 6.10.26: Walkabout is a talk, though its titles say "presentation"
  ['language', /\b(walkabout)\b/],
  ['drinks', /\b(happy hour|cocktails?|wine|beer|tasting|bar crawl|mixology)\b/],
  // the specific parties first, so "Farewell Party" never reads as a talk
  ['party', /\b(farewell|birthday|going.away|leaving party|nye|new year.s eve|halloween|drinking practice|nhau)\b/],
  ['film', /\b(film|films|filmmakers?|movies?|screenings?|cinema|documentary|watch party|proshot)\b/],
  // before music: "PowerPoint Karaoke" and "Hitster: The Music Party Game" are games
  ['games', /\b(powerpoint karaoke|quiz|trivia|chess|board ?games?|geoguessr|shogi|tournament|game show|game night|party game|jackbox|video game|clocktower|hitster|poker|mahjong|bingo|werewolf|games?)\b/],
  ['music', /\b(dance|dancing|dj|karaoke|charaoke|singing|album|listening party|open mic|no mic|jam|jam session|concert|ballet|bachata|salsa|jive|band|musical|sing.?along|choir|orchestra|live music|acoustic|gig|vinyl|music)\b/],
  ['wellness', /\b(therapy|healing|somatic|meditation|mindful\w*|wellbeing|wellness|nutrition|hormone|menstrual|longevity|self.care|boundaries|vulnerability|anxiety|adhd|burnout|breathwork|yoga|sleep|stress|journaling|life purpose|core values)\b/],
  ['tech', /\b(startups?|founders?|freelanc\w*|entrepreneurs?|business|marketing|linkedin|seo|client|pricing|invest\w*|compliance|crypto|coding|developer|ai|product|sprint|career|virality|organic growth|content strateg\w*|social media|copywriting|blockchain|web3|presentation|public speaking|skill.sharing|body doubling)\b/],
  ['arts', /\b(art|paint|drawing|craft|crochet|writing|poetry|photo|photography|design|architecture|lecture|book club|book launch|exhibition|storyteller|creative|sketch)\b/],
  ['language', /\b(language|conversation|talk circle|philosophy|exchange|vietnamese|english|mandarin|french|russian|debate|discussion|talk)\b/],
  // the generic party words last, so "Album Listening Party" stays music
  ['party', /\b(party|parties|celebration|festival|rave|disco)\b/],
  ['social', /\b(meet.?ups?|social|hangout|circle|community|chat|club|swap|munch)\b/],
  // last resort, as the analytics registry does it: a workshop or class
  // nothing above recognised is personal growth
  ['wellness', /\b(workshops?|class|classes|masterclass)\b/],
];

function fold(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// eventFamily(title, qualifier?) → the rubric's FINER family a title names
// (drinks, party, film, games, music, wellness, tech, arts, language, social,
// or 'other') — what the deal ticket needs, since Drinks is no longer a group.
export function eventFamily(title, qualifier) {
  const hay = fold(`${title ?? ''} ${qualifier ?? ''}`);
  for (const [cat, re] of RULES) if (re.test(hay)) return cat;
  return 'other';
}

// eventCategory(title, qualifier?) → one of CATEGORIES ('other' when nothing matches)
export function eventCategory(title, qualifier) {
  const fam = eventFamily(title, qualifier);
  return FOLDED[fam] || fam;
}

// isDealEvent(feedEvent) — a drinks deal (Happy Hour: Buy 1 Get 1…), by its
// title: the menu's deal ticket. A deal is yellow's JOB (deal/progress), not a
// category, so it survives Drinks being folded into Games + Social.
export function isDealEvent(ev) {
  return eventFamily(ev?.title_en ?? ev?.title, ev?.qualifier_en ?? ev?.qualifier) === 'drinks';
}

// categoryOf(feedEvent) — a feed row's category: the feed's own `category`
// (folded, if an older feed carries a finer key), else derived from the
// ENGLISH title + qualifier (the rules are English; a VI-only title falls
// through to other).
export function categoryOf(ev) {
  return normalizeCategory(ev && ev.category)
    || eventCategory(ev?.title_en ?? ev?.title, ev?.qualifier_en ?? ev?.qualifier);
}

export function isNeutralCategory(cat) {
  return NEUTRAL_CATEGORIES.has(cat);
}
