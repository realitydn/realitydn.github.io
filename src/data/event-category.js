// event-category.js — event CATEGORY → one of the three majors (Night v2
// "Cream Tickets", handoff 5.10.26 — design-system-year2/
// design_handoff_night_cream_tickets/).
//
// A PORT of the hub's src/lib/event-category.ts — same rule table, same order,
// same fold. Change both together. Dependency-free like cal-feed.js so
// scripts/selftest.mjs can unit-test it without a DOM.
//
//   music  → blue    party → red    games / drinks → yellow
//   film / talk → NEUTRAL (an ink block on cream, no hue) — talk is the default
//
// STOPGAP: the feed carries no category (tags are [] or a price, 5.10.26), so
// the category is DERIVED from the title. If the hub's feed ever adds a
// `category` field, categoryOf() prefers it.

const RULES = [
  // Same family ORDER as the analytics registry's fallback_rules
  // (scripts/analytics/series-registry.json in the hub): specific parties
  // first, then film, games, music — the generic "party" last, so
  // "Hitster: The Music Party Game" lands on games. Dance is MUSIC there
  // ("Music + Dance + Performance"), so it is here.
  ['drinks', /\b(happy hour|cocktails?|wine|beer|tasting|bar crawl|mixology)\b/],
  ['party', /\b(farewell|birthday|going.away|leaving party|nye|new year.s eve|halloween|drinking practice|nhau)\b/],
  ['film', /\b(film|films|filmmakers?|movies?|screenings?|cinema|documentary|watch party|proshot)\b/],
  ['games', /\b(powerpoint karaoke|quiz|trivia|chess|board ?games?|geoguessr|shogi|tournament|game show|game night|party game|jackbox|video game|clocktower|hitster|poker|mahjong|bingo|werewolf|games?)\b/],
  ['music', /\b(dance|dancing|dj|karaoke|charaoke|singing|album|listening party|open mic|no mic|jam|jam session|concert|ballet|bachata|salsa|jive|band|musical|sing.?along|choir|orchestra|live music|acoustic|gig|vinyl|music)\b/],
  ['party', /\b(party|parties|celebration|festival|rave|disco)\b/],
];

const CATEGORIES = new Set(['music', 'party', 'games', 'drinks', 'film', 'talk']);
export const NEUTRAL_CATEGORIES = new Set(['film', 'talk']);

function fold(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// eventCategory(title, qualifier?) → 'music' | 'party' | 'games' | 'drinks' | 'film' | 'talk'
export function eventCategory(title, qualifier) {
  const hay = fold(`${title ?? ''} ${qualifier ?? ''}`);
  for (const [cat, re] of RULES) if (re.test(hay)) return cat;
  return 'talk';
}

// categoryOf(feedEvent) — a feed row's category: the feed's own field when it
// carries one, else derived from the ENGLISH title + qualifier (the rules are
// English; a VI title would fall through to talk).
export function categoryOf(ev) {
  if (ev && CATEGORIES.has(ev.category)) return ev.category;
  return eventCategory(ev?.title_en ?? ev?.title, ev?.qualifier_en ?? ev?.qualifier);
}

export function isNeutralCategory(cat) {
  return NEUTRAL_CATEGORIES.has(cat);
}
