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
 * Recurring series collapse to their soonest instance (one Event per series).
 */
const MAX_EVENTS = 12;

export default function EventsSchema({ lang = 'EN', id = 'events-schema' }) {
  const { events, venue } = useFeed();

  useEffect(() => {
    const upcoming = dedupeSeries(events || [])
      .filter((ev) => ev && ev.startsAt)
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
    const placeAddress = venue?.address || '14 Đống Đa, Đà Nẵng';

    const items = upcoming.map((ev) => {
      const name = pickTitle(ev, lang) || 'REALITY event';
      const description = pickDescription(ev, lang) || undefined;
      const locName = (lang === 'VN' ? ev.location?.name_vi : ev.location?.name_en) || ev.location?.name_en || placeName;
      const image = ev.posters?.poster4x5 || ev.posters?.feed || undefined;
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
            streetAddress: placeAddress,
            addressLocality: 'Đà Nẵng',
            addressCountry: 'VN',
          },
        },
        organizer: { '@type': 'Organization', name: ev.host || placeName, url: 'https://realitydn.com' },
      };
      if (ev.endsAt) node.endDate = ev.endsAt;
      if (description) node.description = description;
      if (image) node.image = image;
      if (ev.sourceUrl) node.url = ev.sourceUrl;
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
    tag.textContent = JSON.stringify(payload);

    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [events, venue, lang, id]);

  return null;
}
