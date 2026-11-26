import React from 'react';
import DeckSection from '../DeckSection';
import { fill } from '../parts';
import Expand from '../Expand';
import InfoHostSection from '../../InfoHostSection';
import { HERO_PHOTOS } from '../../../data/hero-photos';
import { URLS } from '../../../data/translations';

// 02 · First time here?, opened (reworked 25.11.26).
//
//   THE STEPS             three, by name, each with one line
//   "CAN I JUST JOIN IN?" the answer, with the three missions, beside the
//                         photo of the front (so you know the door when you
//                         see it). A fold on a phone; laid out in the card
//                         from a tablet up (Expand flatFrom="m").
//   THE RULES             the rules of the space, all of them: a fold,
//                         except on a tall desktop screen, which has the
//                         room to lay them out (flatFrom="tall"). #rules IS
//                         this fold, so a link to it (the host panel's
//                         "general rules", an old /#rules) opens it and lands
//                         on it. (They were on "Find us" until 25.11.26.)
//
// A page loaded on /#info arrives with the answer open.
//
// The words are copy: deck.first in src/data/locales/*.js. Add or drop a step
// there and the card and this section follow. The three missions are the
// site's own (infoHost.welcomeMissions), not retyped here.

// One print colour per step, in turn.
const PRINTS = ['var(--blue)', 'var(--yellow)', 'var(--red)', 'var(--pink)'];

// "… check {calendar} … join {whatsapp} etc." → the sentence with its links.
function withLinks(str, links) {
  return String(str).split(/(\{\w+\})/).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    const link = m && links[m[1]];
    return link ? (
      <a key={i} href={link.href} target="_blank" rel="noreferrer">{link.text}</a>
    ) : part;
  });
}

export default function FirstSection({ card, no, t, lang }) {
  const S = (k) => t.use(`deck.first.${k}`);
  const steps = S('steps');
  const list = Array.isArray(steps) ? steps : [];
  const missions = t.use('infoHost.welcomeMissions');
  const photo = HERO_PHOTOS[0];
  return (
    <DeckSection card={card} no={no} t={t} live={fill(S('count'), { n: list.length })}>
      <ol className="dk-stepgrid">
        {list.map((s, i) => (
          <li key={i} className="tkt dk-step" style={{ '--print': PRINTS[i % PRINTS.length] }}>
            <b aria-hidden="true">{i + 1}</b>
            <h3 className="dk-name">{s.t}</h3>
            <p className="dk-small">{s.b}</p>
          </li>
        ))}
      </ol>

      <div className="dk-first">
        <Expand id="first-more" label={S('joinQ')} flatFrom="m" heading>
          <div className="dk-join">
            <p>{S('joinA')}</p>
            <ol className="dk-missions">
              {(Array.isArray(missions) ? missions : []).map((m, i) => <li key={i}>{m}</li>)}
            </ol>
            <p>{S('joinB')}</p>
            <p>
              {withLinks(S('joinC'), {
                calendar: { text: S('joinCalendar'), href: `${URLS.APP}/?utm_source=website&utm_medium=deck_first` },
                whatsapp: { text: S('joinWhatsApp'), href: URLS.WA },
              })}
            </p>
          </div>
        </Expand>
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

      <Expand id="rules" className="dk-rules" label={t.use('infoHost.rulesTitle')} flatFrom="tall" heading>
        <InfoHostSection t={t} lang={lang} only="rules" titled={false} />
      </Expand>
    </DeckSection>
  );
}
