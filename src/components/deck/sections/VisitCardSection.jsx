import React from 'react';
import DeckSection from '../DeckSection';
import { fill, Pulse, isStill } from '../parts';
import VisitSection from '../../VisitSection';
import useNow from '../../../hooks/useNow';
import { openNow } from '../../../data/deck/open-hours';

// 09 · Find us, opened — the address, whether we're open right now, the visit
// section the site has always had (the facts ticket, directions, the map),
// and the QR for realitydn.com. (The rules of the space moved to "First time
// here?" on 25.11.26, and #rules with them.)
export default function VisitCardSection({ card, no, t, lang }) {
  const now = useNow();
  const { open, until } = openNow(now);
  const S = (k) => t.use(`deck.status.${k}`);
  return (
    <DeckSection
      card={card}
      no={no}
      t={t}
      live={isStill() ? t.use('hours') : (
        <>
          <Pulse off={!open} />
          {open ? S('open') : S('closed')} · {fill(open ? S('till') : S('opens'), { time: until })}
        </>
      )}
    >
      <p className="dk-addr">86 Mai Thúc Lân, Đà Nẵng</p>
      <VisitSection lang={lang} t={t} embedded />
      <div className="dk-visit-more">
        <div className="dk-qr">
          {/* Ink modules on a cream tile, never inverted. The asset is the
              repo's own (brand-assets/qr/); it encodes https://realitydn.com. */}
          <img
            src="/images/reality-qr-ink.svg"
            alt={t.use('deck.visit.qrAlt')}
            width="132"
            height="132"
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className="dk-label">realitydn.com</p>
            <p className="dk-small">{t.use('faq.whereA')}</p>
            <p className="dk-small dk-dim">{t.use('faq.hoursA')}</p>
          </div>
        </div>
      </div>
    </DeckSection>
  );
}
