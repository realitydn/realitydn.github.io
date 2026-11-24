import React from 'react';
import DeckSection from '../DeckSection';
import { fill } from '../parts';
import Expand from '../Expand';
import InfoHostSection from '../../InfoHostSection';
import { HERO_PHOTOS } from '../../../data/hero-photos';

// 02 · First time here?, opened — the steps and the photo of the front (so you
// know the door when you see it). The site's own answer to "do I need to know
// anyone?" (the welcome panel of InfoHostSection, unchanged) is a fold, under
// its own question. A page loaded on /#info arrives with it open.
//
// The steps are copy: deck.first.steps in src/data/locales/*.js. Add or drop
// one there and the card and this section follow.

// One print colour per step, in turn.
const PRINTS = ['var(--blue)', 'var(--yellow)', 'var(--red)', 'var(--pink)'];

export default function FirstSection({ card, no, t, lang }) {
  const steps = t.use('deck.first.steps');
  const list = Array.isArray(steps) ? steps : [];
  const photo = HERO_PHOTOS[0];
  return (
    <DeckSection card={card} no={no} t={t} live={fill(t.use('deck.first.count'), { n: list.length })}>
      <div className="dk-first">
        <ol className="dk-stepgrid">
          {list.map((s, i) => (
            <li key={i} className="tkt dk-step" style={{ '--print': PRINTS[i % PRINTS.length] }}>
              <b aria-hidden="true">{i + 1}</b>
              <h3 className="dk-name">{s.t}</h3>
              <p className="dk-small">{s.b}</p>
            </li>
          ))}
        </ol>
        {photo ? (
          <figure className="dk-photo">
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ) : null}
      </div>
      <Expand id="first-more" label={t.use('infoHost.welcomeTitle')}>
        <InfoHostSection t={t} lang={lang} only="welcome" titled={false} />
      </Expand>
    </DeckSection>
  );
}
