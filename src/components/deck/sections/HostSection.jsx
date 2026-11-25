import React from 'react';
import DeckSection from '../DeckSection';
import { fill } from '../parts';
import InfoHostSection from '../../InfoHostSection';
import { lowestRoomRate } from '../faces/HostFace';
import { vnd } from '../../../data/deck/fundraisers';

// 06 · Host an event, opened — the host panel of InfoHostSection, unchanged:
// public / private + paid / art show, the rate card, the event proposal form
// and the art exhibition form.
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
      <p className="dk-lede">{t.use('infoHost.hostIntro')}</p>
      <InfoHostSection t={t} lang={lang} only="host" />
    </DeckSection>
  );
}
