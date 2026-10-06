import React from 'react';
import { URLS } from '../data/translations';
import { cfStr } from '../data/cal-feed';

// RSVP notice — LIMITED-SPOT events (the feed's rsvpCapacity; needsRsvp in
// feed-helpers.js). Donald's rule: "This event requires RSVP with a free
// REALITY account." is prominent in EVERY listing of such an event, with a
// clear way to the event's app page, where the RSVP is made.
//
// It is a NOTICE, so it is yellow's job (canon B3b: yellow takes notices and
// deals) — the yellow fill with INK type in both themes (the APCA fill rule),
// via the --deal / --deal-fg role pair; zero radius; nothing under 12px.
// Callers render these ONLY when needsRsvp(ev), so an ordinary event's markup
// is untouched.
//
//   RsvpStub — the ticket STUB: a yellow strip across the foot of a card or
//              row ticket. Full sentence on cards; the short label on the
//              dense rows (compact), with the full sentence as its title and
//              its screen-reader text. Then the door, "RSVP in the app →".
//   RsvpBar  — the overlay's notice, pinned under its top bar.
//
// Cards and rows are themselves links (to the event's app page, a plain
// click opening the overlay), and a link can't hold a link. So the stub is a
// span marked data-rsvp-door, and openRsvpDoor() — called first in the
// ticket's click handler — sends a plain click on it straight to the app
// page in a new tab (like every other app door on the site), skipping the
// overlay. A modified click (new tab / window) falls through to the ticket's
// own href, which is the same app page. Keyboard: Enter opens the overlay,
// which carries the notice and the RSVP door.

// The event's app page, tagged for the app's analytics like the overlay's
// door (utm_source=website). sourceUrl first; the canonical /events/:id
// otherwise. A URL that won't parse is returned as-is.
export function rsvpHref(ev, medium = 'rsvp_notice') {
  const base = (ev && ev.sourceUrl) || `${URLS.APP}/events/${ev && ev.id}`;
  try {
    const u = new URL(base);
    u.searchParams.set('utm_source', 'website');
    u.searchParams.set('utm_medium', medium);
    return u.toString();
  } catch {
    return base;
  }
}

// Returns true when it handled the click (the caller then does nothing else).
export function openRsvpDoor(e, ev) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const t = e.target;
  if (!t || typeof t.closest !== 'function' || !t.closest('[data-rsvp-door]')) return false;
  e.preventDefault();
  window.open(rsvpHref(ev), '_blank', 'noopener,noreferrer');
  return true;
}

export function RsvpStub({ lang, compact = false }) {
  const CF = cfStr(lang);
  return (
    <span className="rsvp-stub" data-rsvp-door="" title={compact ? CF.rsvpRequired : undefined}>
      {compact ? (
        <>
          <span className="rsvp-stub-t rsvp-stub-short" aria-hidden="true">{CF.rsvpShort}</span>
          <span className="sr-only">{CF.rsvpRequired}</span>
        </>
      ) : (
        <span className="rsvp-stub-t">{CF.rsvpRequired}</span>
      )}
      {/* Label + arrow in ONE span: on a phone the door wraps, and a sibling
          arrow would strand itself (the cal-more lesson). */}
      <span className="rsvp-stub-go">
        {CF.rsvpInApp}{' '}
        <span aria-hidden="true">→</span>
      </span>
    </span>
  );
}

// `id` lets the dialog name it as its description (aria-describedby), so a
// screen reader announces the notice as the overlay opens.
export function RsvpBar({ lang, id }) {
  return <p className="rsvp-bar" id={id}>{cfStr(lang).rsvpRequired}</p>;
}
