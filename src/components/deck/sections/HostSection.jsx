import React from 'react';
import DeckSection from '../DeckSection';
import { fill } from '../parts';
import InfoHostSection from '../../InfoHostSection';
import { lowestRoomRate } from '../faces/HostFace';
import { vnd } from '../../../data/deck/fundraisers';

// 06 · Host an event, opened — the host panel of InfoHostSection: public /
// private + paid / art show, the rate card, the event proposal form and the
// art exhibition form.
//
// The card OPENS on its action (25.11.26): the invitation and a red "Propose
// an event" button, above the rules, on screen as soon as the card lands at
// every width. Before that the button was at the foot of the card, where the
// next card covered it as the page scrolled. (InfoHostSection.jsx, "THE HOST
// CARD'S RED ACTION".)
//
// #proposal lands on the form inside this card, already open — it is the link
// the app's "hold an event" button uses, so it must keep working.
export default function HostSection({ card, no, t, lang }) {
  return (
    <DeckSection
      card={card}
      no={no}
      t={t}
      live={fill(t.use('deck.host.live'), { price: vnd(lowestRoomRate()) })}
    >
      <InfoHostSection
        t={t}
        lang={lang}
        only="host"
        intro={<p className="dk-lede">{t.use('infoHost.hostIntro')}</p>}
      />
    </DeckSection>
  );
}
