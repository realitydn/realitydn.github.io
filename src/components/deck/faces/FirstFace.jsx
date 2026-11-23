import React from 'react';
import DeckCard from '../DeckCard';
import { fill } from '../parts';

// 02 · First time here? — the steps, by name. On a phone: how many there are.
// The steps are copy: deck.first.steps in src/data/locales/*.js.
export default function FirstFace({ card, no, t }) {
  const steps = t.use('deck.first.steps');
  const list = Array.isArray(steps) ? steps : [];
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
      <span className="dk-num dk-only-compact" aria-hidden="true">{list.length}</span>
    </DeckCard>
  );
}
