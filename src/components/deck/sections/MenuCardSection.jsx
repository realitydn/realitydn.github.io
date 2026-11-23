import React, { useMemo } from 'react';
import DeckSection from '../DeckSection';
import { fill } from '../parts';
import MenuSection from '../../MenuSection';
import { useMenu } from '../../../data/menu-i18n';
import useFeed from '../../../hooks/useFeed';
import { nextDealToday } from '../../../data/cal-feed';
import { isDealEvent } from '../../../data/event-category';
import { fmtTime, pickTitle } from '../../../data/feed-helpers';

// 03 · Our menu, opened — the menu section the site has always had: the PDF
// link, today's deal ticket when there is one, the six chapters. Unchanged
// inside; this only frames it.
//
// The header's figure is today's drinks deal when the feed has one today
// (its name and hours come from the feed — never typed here), otherwise how
// many chapters the menu has.
export default function MenuCardSection({ card, no, t, lang }) {
  const menu = useMenu(lang);
  const { events } = useFeed();
  const deal = useMemo(() => nextDealToday(events, isDealEvent), [events]);
  const live = deal
    ? `${fmtTime(deal.startsAt)}${deal.endsAt ? `–${fmtTime(deal.endsAt)}` : ''} · ${pickTitle(deal, lang)}`
    : fill(t.use('deck.menu.sections'), { n: menu.length });
  return (
    <DeckSection card={card} no={no} t={t} live={live}>
      <MenuSection lang={lang} t={t} embedded />
    </DeckSection>
  );
}
