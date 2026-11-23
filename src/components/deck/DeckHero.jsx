import React from 'react';
import { DECK, cardNo } from './deck';
import { fill, Pulse, isStill } from './parts';
import useNow from '../../hooks/useNow';
import { openNow } from '../../data/deck/open-hours';

// DeckHero — the first screen: the three words, whether we're open, one red
// action, and THE TABLE: every card in the deck, face up, each a link to its
// section. The wordmark in its box is the masthead directly above (Header).
//
// On a phone the table comes straight after the three words, so all the cards
// are on the first screen; the sentence and the buttons follow it.
export default function DeckHero({ t, lang }) {
  const now = useNow();
  const { open, until } = openNow(now);
  const S = (k) => t.use(`deck.${k}`);
  // The buttons point at cards by name, so reordering the deck can't break them.
  const building = DECK.find((c) => c.key === 'building') || DECK[0];
  const first = DECK.find((c) => c.key === 'first');

  // "coffee / cocktails / community" → one line each, the last one slammed
  // (the Year 2 display pair: Montserrat Thin, then 800).
  const title = t.use('heroTitle');
  const words = typeof title === 'string' ? title.split(' / ') : [String(title)];

  return (
    <section className="dk-hero" aria-labelledby="dk-hero-h">
      <div className="dk-hero-top">
        <h1 id="dk-hero-h" className="dk-hero-h1">
          {/* Screen-reader/crawler lead, so the page's one H1 reads
              "REALITY Đà Nẵng — coffee / cocktails / community". */}
          <span className="sr-only">{t.use('heroPrefix')} </span>
          {words.map((w, i) => (
            <span key={i} className={i === words.length - 1 ? 'font-display-bold' : 'font-display'}>
              {w}{i < words.length - 1 ? ' /' : ''}{' '}
            </span>
          ))}
        </h1>
        {/* "Open now" is only true at the moment it's read: the static
            HTML (isStill) states the hours instead. */}
        <p className="dk-hero-status dk-fact">
          {isStill() ? (
            t.use('hours')
          ) : (
            <>
              <Pulse off={!open} />
              {open ? S('status.open') : S('status.closed')}
              {' · '}
              {fill(open ? S('status.till') : S('status.opens'), { time: until })}
            </>
          )}
          <span className="dk-hero-addr"> · 86 Mai Thúc Lân, Đà Nẵng</span>
        </p>
      </div>

      <div className="dk-table">
        {DECK.map((card, i) => (
          <card.Face key={card.key} card={card} no={cardNo(i)} t={t} lang={lang} />
        ))}
      </div>

      <div className="dk-hero-more">
        <p className="dk-hero-lede">{t.use('heroSub')}</p>
        <div className="dk-hero-acts">
          {/* The one red action on this screen. */}
          <a className="btn-action dk-btn" href={`#${building.id}`}>{S('tonightCta')}</a>
          {first ? (
            <a className="btn-secondary dk-btn" href={`#${first.id}`}>
              {t.use(`deck.cards.${first.key}.title`)}
            </a>
          ) : null}
        </div>
        <p className="dk-hero-hint">{fill(S('hint'), { n: DECK.length })}</p>
      </div>
    </section>
  );
}
