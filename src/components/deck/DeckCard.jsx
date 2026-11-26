import React from 'react';

// DeckCard — the frame of one face-up card on the table: the colour, the
// number, the title, and a link to the card's section. Each face
// (./faces/*.jsx) wraps its own live content in one of these.
//
//   meta      the small fact at the top right ("20:40", "4 steps")
//   children  the face itself
//   flush     the face runs to the card's edges (a photo: InsideFace)
//
// On a phone the nine cards sit as a compact 3×3: the header keeps only the
// number, the title moves to the foot in its short form, and each face shows
// just its one figure — anything marked .dk-x ("extra") is dropped there.
export default function DeckCard({ card, no, t, meta, flush = false, children }) {
  const title = t.use(`deck.cards.${card.key}.title`);
  const short = t.use(`deck.cards.${card.key}.short`);
  return (
    <a className={`dk-card k-${card.color}`} href={`#${card.id}`}>
      <span className="dk-ch">
        <span>
          <span className="dk-ch-no">{no}</span>
          <span className="dk-ch-title"> · {title}</span>
        </span>
        {meta ? <span className="dk-ch-meta">{meta}</span> : null}
      </span>
      <span className={`dk-cb${flush ? ' dk-cb-flush' : ''}`}>{children}</span>
      {/* Exactly one of the two titles is displayed at any width (the full one
          in the head, or this short one on the compact card), so the link
          always has its name and never says it twice. */}
      <span className="dk-cf">{short}</span>
    </a>
  );
}
