import React from 'react';
import useDealIn from '../../hooks/useDealIn';

// DeckSection — the frame of one OPENED card: the same number, colour and
// title as its face on the table, one live figure, then the body on a cream
// ticket. Each section (./sections/*.jsx) wraps its content in one of these.
//
//   live      the one figure in the header ("MON 23.11 · 20:40 · 2 rooms on")
//   children  the body
//
// The card is dealt in the first time it scrolls into view (useDealIn). The
// body is a Day scope in both themes — a ticket is cream at night too — so
// everything nested resolves ink-on-cream without patches.
export default function DeckSection({ card, no, t, live, children }) {
  const [ref, dealing, landed] = useDealIn();
  const headingId = `dk-h-${card.key}`;
  return (
    <section id={card.id} className={`dk-sec k-${card.color}`} aria-labelledby={headingId}>
      {/* Old links that must keep landing here (deck.js `aliases`). */}
      {(card.aliases || []).map((a) => (
        <span key={a} id={a} className="dk-anchor" aria-hidden="true" />
      ))}
      <article ref={ref} className={`dk-open${dealing ? ' dk-deal' : ''}`} onAnimationEnd={landed}>
        <header className="dk-oh">
          <span className="dk-oh-no" aria-hidden="true">{no}</span>
          <h2 id={headingId}>{t.use(`deck.cards.${card.key}.title`)}</h2>
          {live ? <p className="dk-oh-live">{live}</p> : null}
        </header>
        <div className="dk-ob">{children}</div>
      </article>
    </section>
  );
}
