import React from 'react';
import DeckCard from '../DeckCard';
import { fill } from '../parts';

// 02 · First time here? — the steps, by name. On a phone: how many there
// are, as a figure WITH its word ("3 steps": a bare "3" said nothing; Donald,
// 25.11.26). The word is the same string as the wide card's corner
// (deck.first.count, "{n} steps"), set round the figure.
// The steps are copy: deck.first.steps in src/data/locales/*.js.
export default function FirstFace({ card, no, t }) {
  const steps = t.use('deck.first.steps');
  const list = Array.isArray(steps) ? steps : [];
  const [before = '', after = ''] = String(t.use('deck.first.count')).split('{n}');
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.first.count'), { n: list.length })}>
      <span className="dk-steps dk-x">
        {list.map((s, i) => (
          <span key={i}>
            <b>{i + 1}</b>
            {s.t}
          </span>
        ))}
      </span>
      <span className="dk-fig dk-only-compact" aria-hidden="true">
        {before}
        <b className="dk-num">{list.length}</b>
        {after}
      </span>
    </DeckCard>
  );
}
