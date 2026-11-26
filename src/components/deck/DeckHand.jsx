import React, { useEffect, useRef, useState } from 'react';
import { DECK } from './deck';

// DeckHand — "the hand": every card, always within reach. A strip that sticks
// to the top of the screen once the table has scrolled away; on a phone it
// scrolls sideways. The card whose section is being read is marked
// (aria-current) and kept in view inside the strip.
//
// It is navigation, so it sits on the page (ink at night), not on a ticket.
export default function DeckHand({ t }) {
  const [active, setActive] = useState(null);
  const stripRef = useRef(null);

  // Scroll-spy: one IntersectionObserver on a thin reading line 30% down the
  // viewport; the section crossing it is current. No scroll listener.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const ids = DECK.map((c) => c.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;
    const on = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) on.add(e.target.id);
          else on.delete(e.target.id);
        });
        const hit = ids.filter((id) => on.has(id));
        setActive(hit.length ? hit[hit.length - 1] : null);
      },
      { rootMargin: '-30% 0px -69% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Keep the current card's tab visible in the strip. Scrolls the STRIP only
  // (scrollLeft) — scrollIntoView would also nudge the page.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !active) return;
    const tab = strip.querySelector(`[data-id="${active}"]`);
    if (!tab) return;
    const left = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
    strip.scrollLeft = Math.max(0, left);
  }, [active]);

  return (
    <nav className="dk-hand" aria-label={t.use('deck.nav')} ref={stripRef}>
      {DECK.map((card) => (
        <a
          key={card.key}
          href={`#${card.id}`}
          data-id={card.id}
          className={`dk-hand-a k-${card.color}`}
          aria-current={active === card.id ? 'true' : undefined}
        >
          <i aria-hidden="true" />
          {t.use(`deck.cards.${card.key}.short`)}
        </a>
      ))}
    </nav>
  );
}
