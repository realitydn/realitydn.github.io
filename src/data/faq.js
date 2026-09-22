// The FAQPage Q&As (FAQSchema JSON-LD on the home pages, and the FAQ in
// public/llms-full.txt via scripts/build-seo-files.mjs). Plain JS, no React,
// so the Node generator imports the very same function the page uses.
import { URLS } from './translations.js';
import { pathFor } from './languages.js';
import { ROOM_RATES, RATE_SLOTS } from './room-rates.js';

const SITE = 'https://realitydn.com';

// buildFaq(t, lang) — the FAQPage Q&As, as complete answers. Everything is
// assembled from locale strings the page already shows (welcome panel, rules,
// info items, rate card) plus the `faq` block for the answers that had no
// on-page copy yet — so each language answers in its own words, and nothing
// here is a fact the locale files don't state.
export function buildFaq(t, lang) {
  const ih = (k) => t.use('infoHost.' + k);
  const tidy = (str) => str.replace(/\s+([.,:;!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  const home = SITE + pathFor(lang, '/');
  const rules = ih('rules');

  // "You don't need to know anyone … 3 missions: 1. … 2. … 3. … Some events
  // have entry fees … join our WhatsApp Community or message our Instagram
  // or Facebook pages." — the whole welcome panel, not just its first line.
  const missions = ih('welcomeMissions').map((m, i) => `${i + 1}. ${m}`).join(' ');
  const welcomeA = tidy([
    ih('welcomeBody'), missions,
    ih('welcomeFooter'), ih('welcomeWA'), ih('welcomeOr'), ih('welcomeIG'),
    ih('welcomeFBOr'), ih('welcomeFB'), ih('welcomePages'),
  ].join(' '));

  // Rate card as prose: "Event Space (2E): Daytime (10:00 – 18:00) 300k/hr, …"
  const rateLines = ROOM_RATES.map(({ id, rates }) => {
    const cells = RATE_SLOTS.map((slot) =>
      `${ih(`pricing.slotsLabel.${slot}`)} (${ih(`pricing.slots.${slot}`)}) ${
        rates[slot] == null ? ih('pricing.unavailable') : rates[slot] + ih('pricing.unit')
      }`
    ).join(', ');
    return `${ih(`pricing.spaces.${id}`)}: ${cells}.`;
  }).join(' ');
  const rentA = tidy([t.use('faq.rentA'), rateLines, ...ih('pricing.notes'), home + '#proposal'].join(' '));

  const info = t.use('infoItems');
  const item = (icon) => info.find((it) => it.icon === icon) || {};

  return [
    { q: ih('welcomeTitle'), a: welcomeA },
    { q: t.use('faq.whatQ'), a: `${t.use('faq.whatA')} ${URLS.APP}/` },
    { q: t.use('faq.freeQ'), a: t.use('faq.freeA') },
    { q: t.use('faq.hoursQ'), a: t.use('faq.hoursA') },
    { q: t.use('faq.whereQ'), a: `${t.use('faq.whereA')} https://maps.google.com/?cid=9022999249739857995` },
    { q: item('laptop').q, a: item('laptop').a },
    { q: ih('hostTitle'), a: `${t.use('faq.hostA')} ${SITE + pathFor(lang, '/event-guidelines')} · ${home}#proposal` },
    { q: t.use('faq.rentQ'), a: rentA },
    { q: ih('rulesTitle'), a: rules.join(' ') },
    // The rules list is the current word on smoking (1st- and 3rd-floor
    // patios); the older info item's answer only names the 3rd floor.
    { q: item('smoke').q, a: rules[3] },
    { q: t.use('faq.petsQ'), a: rules[4] },
  ].filter((x) => x.q && x.a);
}
