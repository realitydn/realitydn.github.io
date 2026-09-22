import { useEffect } from 'react';
import useFeed from '../hooks/useFeed';
import { dedupeSeries, pickTitle, pickDescription } from '../data/feed-helpers';

/**
 * EventsSchema — emits schema.org/Event JSON-LD for the next N upcoming events so
 * search engines can surface them as rich results. Mirrors FAQSchema.jsx: an
 * imperative <script type="application/ld+json"> upsert in a useEffect, with its own
 * id so a language switch replaces (rather than stacks) the tag, and a cleanup on
 * unmount. Rendered inside HomePage next to <FAQSchema>.
 *
 * Sourced from useFeed() — during the Puppeteer prerender the same-origin snapshot
 * resolves before capture, so the JSON-LD bakes into the static HTML (good SEO).
 * Recurring series collapse to their soonest instance (one Event per series), and
 * anything already started is dropped — a baked page must never advertise an
 * expired event as EventScheduled (a daily rebuild keeps the list fresh).
 */
const MAX_EVENTS = 12;
const SITE = 'https://realitydn.com';
const BUSINESS_ID = `${SITE}/#business`;
// Street line only — the city lives in addressLocality, not repeated here.
const STREET = '86 Mai Thúc Lân';

// The feed's `cost` is a human string ("50k", "200k", "1.6 tr") or null. null
// means the event really is free (the site prints "Free" on that basis — see
// cal-feed.js costLabel). Returns { free, price } where price is whole VND, or
// { free: false, price: null } when the string can't be read confidently.
export function parseCost(cost) {
  if (cost == null || cost === '') return { free: true, price: 0 };
  let s = String(cost).trim().toLowerCase();
  // Vietnamese thousands grouping ("50.000đ", "1,600,000") → plain digits.
  s = s.replace(/^(\d{1,3}(?:[.,]\d{3})+)(?=\s*(?:đ|₫|vnd)?$)/, (g) => g.replace(/[.,]/g, ''));
  s = s.replace(/,/g, '.');
  if (/^(free|miễn phí|mien phi|0)$/.test(s)) return { free: true, price: 0 };
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(k|nghìn|ngàn|tr|triệu|trieu|m|đ|₫|vnd)?$/);
  if (!m) return { free: false, price: null };
  const n = Number(m[1]);
  const unit = m[2] || '';
  let price;
  if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') price = n * 1000;
  else if (unit === 'tr' || unit === 'triệu' || unit === 'trieu' || unit === 'm') price = n * 1000000;
  else if (n >= 1000) price = n; // a bare full-VND figure ("50000", "50000đ")
  else return { free: false, price: null }; // "50" alone is ambiguous
  return { free: false, price: Math.round(price) };
}

export default function EventsSchema({ lang = 'EN', id = 'events-schema' }) {
  const { events, venue } = useFeed();

  useEffect(() => {
    const now = Date.now();
    const upcoming = dedupeSeries(
      (events || []).filter((ev) => ev && ev.startsAt && Date.parse(ev.startsAt) >= now)
    )
      .slice()
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .slice(0, MAX_EVENTS);

    // Nothing to emit → make sure no stale tag lingers.
    if (upcoming.length === 0) {
      const stale = document.getElementById(id);
      if (stale) stale.remove();
      return;
    }

    const placeName = venue?.name || 'REALITY';

    const items = upcoming.map((ev) => {
      const name = pickTitle(ev, lang) || 'REALITY event';
      const description = pickDescription(ev, lang) || undefined;
      const locName = (lang === 'VN' ? ev.location?.name_vi : ev.location?.name_en) || ev.location?.name_en || placeName;
      // Every rendition the feed carries, largest-first; Google picks the
      // aspect it wants from the array.
      const posters = ev.posters || {};
      const images = [posters.poster4x5, posters.feed, posters.square1x1, posters.story]
        .filter((u, i, a) => u && a.indexOf(u) === i);
      const node = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name,
        startDate: ev.startsAt,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: locName,
          address: {
            '@type': 'PostalAddress',
            streetAddress: STREET,
            addressLocality: 'Đà Nẵng',
            addressCountry: 'VN',
          },
        },
        organizer: { '@id': BUSINESS_ID },
      };
      if (ev.endsAt) node.endDate = ev.endsAt;
      if (description) node.description = description;
      if (images.length === 1) node.image = images[0];
      else if (images.length > 1) node.image = images;
      if (ev.sourceUrl) node.url = ev.sourceUrl;

      // The feed's host is the person running the night; REALITY itself is
      // already the organizer, so it isn't repeated as a performer.
      const host = (ev.host || '').trim();
      if (host && !/^reality\b/i.test(host)) {
        node.performer = { '@type': 'Person', name: host };
      }

      const { free, price } = parseCost(ev.cost);
      if (free) node.isAccessibleForFree = true;
      if (price !== null) {
        node.offers = {
          '@type': 'Offer',
          price,
          priceCurrency: 'VND',
          availability: 'https://schema.org/InStock',
        };
        if (ev.sourceUrl) node.offers.url = ev.sourceUrl;
      }
      return node;
    });

    // One <script> carrying an array of Event nodes (valid JSON-LD).
    const payload = items.length === 1 ? items[0] : items;

    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement('script');
      tag.id = id;
      tag.type = 'application/ld+json';
      document.head.appendChild(tag);
    }
    // '<' escaped so no feed text can close the <script> in the baked HTML.
    tag.textContent = JSON.stringify(payload).replace(/</g, '\\u003c');

    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [events, venue, lang, id]);

  return null;
}
