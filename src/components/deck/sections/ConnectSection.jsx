import React from 'react';
import DeckSection from '../DeckSection';
import { Icons } from '../../Icons';
import { URLS } from '../../../data/translations';
import { FEED_ICS_URL } from '../../../data/feed';

// 08 · Get connected, opened — every way to stay in touch, one ticket each:
// the app, the WhatsApp community, Instagram + Facebook, the calendar feed
// and email. The links are the ones the site already used (URLS in
// data/translations.js, FEED_ICS_URL); the words are the site's own (the app
// strip, the WhatsApp call, the old "Come find out." band).
const EMAIL = 'reality.dn@gmail.com';
const utm = (medium) => `${URLS.APP}/?utm_source=website&utm_medium=${medium}`;

export default function ConnectSection({ card, no, t }) {
  return (
    <DeckSection card={card} no={no} t={t} live="The app · WhatsApp · Instagram · Facebook">
      <p className="dk-shout">{t.use('darkTitle')}</p>
      <p className="dk-lede">{t.use('hours')} · 86 Mai Thúc Lân, Đà Nẵng</p>
      <div className="dk-g4">
        <article className="tkt dk-pad dk-way" style={{ '--print': 'var(--blue)' }}>
          <h3 className="dk-name">{t.use('getApp.title')}</h3>
          <p className="dk-small">{t.use('getApp.blurb')}</p>
          <a className="btn-info dk-btn" href={utm('deck_connect')} target="_blank" rel="noreferrer">
            {Icons.app()} {t.use('getApp.cta')}
          </a>
        </article>

        <article className="tkt dk-pad dk-way" style={{ '--print': 'var(--pink)' }}>
          <h3 className="dk-name">{t.use('joinWA')}</h3>
          <p className="dk-small">{t.use('waBlurb')}</p>
          <a className="btn-secondary dk-btn" href={URLS.WA} target="_blank" rel="noreferrer">
            {Icons.whatsapp()} WhatsApp
          </a>
        </article>

        <article className="tkt dk-pad dk-way" style={{ '--print': 'var(--pink)' }}>
          <h3 className="dk-name">{t.use('deck.connect.social')}</h3>
          <p className="dk-small">@reality.dn</p>
          <div className="dk-row">
            <a
              className="btn-secondary dk-btn"
              href={URLS.IG}
              target="_blank"
              rel="noreferrer"
              aria-label={t.use('a11y.instagram')}
            >
              {Icons.instagram()} Instagram
            </a>
            <a
              className="btn-secondary dk-btn"
              href={URLS.FB}
              target="_blank"
              rel="noreferrer"
              aria-label={t.use('a11y.facebook')}
            >
              {Icons.facebook()} Facebook
            </a>
          </div>
        </article>

        <article className="tkt dk-pad dk-way">
          <h3 className="dk-name">{t.use('cal.addToCalendar')}</h3>
          <p className="dk-small">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
          <a className="btn-secondary dk-btn" href={FEED_ICS_URL}>{t.use('cal.addToCalendar')}</a>
        </article>
      </div>
    </DeckSection>
  );
}
