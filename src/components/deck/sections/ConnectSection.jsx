import React from 'react';
import DeckSection from '../DeckSection';
import { Icons } from '../../Icons';
import { URLS } from '../../../data/translations';

// 08 · Get connected, opened — every way to stay in touch, one ticket each,
// in this order (Donald, 25.11.26): the webapp, Instagram + Facebook, the
// WhatsApp community, email. The links are the ones the site already used
// (URLS in data/translations.js).
//
// THE WORD IS "WEBAPP", never just "app", anywhere on the home page: "app"
// reads as something to install, and that puts some people off.
// (The "add our calendar to yours" link was taken off this card on 25.11.26.)
const EMAIL = 'reality.dn@gmail.com';
const utm = (medium) => `${URLS.APP}/?utm_source=website&utm_medium=${medium}`;

export default function ConnectSection({ card, no, t }) {
  const S = (k) => t.use(`deck.connect.${k}`);
  return (
    <DeckSection card={card} no={no} t={t} live={`${S('app')} · Instagram · Facebook · WhatsApp`}>
      <div className="dk-connect">
      <div>
        <p className="dk-shout">{t.use('darkTitle')}</p>
        <p className="dk-lede">{t.use('hours')} · 86 Mai Thúc Lân, Đà Nẵng</p>
      </div>
      <div className="dk-g4 dk-ways">
        <article className="tkt dk-pad dk-way" style={{ '--print': 'var(--blue)' }}>
          <h3 className="dk-name">{S('webappTitle')}</h3>
          <p className="dk-small">{S('webapp')}</p>
          <a className="btn-info dk-btn" href={utm('deck_connect')} target="_blank" rel="noreferrer">
            {Icons.app()} {S('webappCta')}
          </a>
        </article>

        <article className="tkt dk-pad dk-way" style={{ '--print': 'var(--pink)' }}>
          <h3 className="dk-name">{S('social')}</h3>
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

        <article className="tkt dk-pad dk-way" style={{ '--print': 'var(--pink)' }}>
          <h3 className="dk-name">{t.use('joinWA')}</h3>
          <p className="dk-small">{t.use('waBlurb')}</p>
          <a className="btn-secondary dk-btn" href={URLS.WA} target="_blank" rel="noreferrer">
            {Icons.whatsapp()} WhatsApp
          </a>
        </article>

        <article className="tkt dk-pad dk-way">
          <h3 className="dk-name">{S('email')}</h3>
          <p className="dk-small">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
        </article>
      </div>
      </div>
    </DeckSection>
  );
}
