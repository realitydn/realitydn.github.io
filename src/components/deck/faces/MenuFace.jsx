import React, { useMemo } from 'react';
import DeckCard from '../DeckCard';
import { useBeat } from '../ambient';
import { pickDrinks } from '../menu-picks';
import { useMenu } from '../../../data/menu-i18n';
import useFeed from '../../../hooks/useFeed';
import { nextDealToday } from '../../../data/cal-feed';
import { isDealEvent } from '../../../data/event-category';
import { fmtTime, pickTitle } from '../../../data/feed-helpers';

// 03 · Our menu — one drink at a time: what kind of drink it is, its name,
// and (wide card) the menu's line for it. The drinks come from the whole
// menu, coffee and juice as well as cocktails, and each says its kind:
// a cocktail's name alone means nothing to someone who has not been in, and
// plenty of guests don't drink (Donald, 25.11.26). On the phone card, where
// there is no room for the line, the kind is what explains the name.
// No price on the card; a photo of the drink may come later. Every word is
// the menu's own (src/data/menu.js, generated from the app): nothing here is
// written for the card. Which drinks, and what "kind" is: ../menu-picks.js.
//
// THE MOTION ("Rolled"): the drink rolls up and out and the next rolls in
// under it, like a line on a scoreboard. How often is not set here: this face
// keeps the pace FACES.menu names in src/lib/beat.js (a new drink every 3 s).

// `leaving`: the drink on its way out — decoration, not read out twice.
function Drink({ drink, cls = '', leaving = false }) {
  return (
    <span className={`dk-roll-i ${cls}`} aria-hidden={leaving ? 'true' : undefined}>
      <span className="dk-kind">{drink.kind}</span>
      <span className="dk-t">{drink.name}</span>
      {drink.line ? <span className="dk-fact dk-x dk-clamp3">{drink.line}</span> : null}
    </span>
  );
}

export default function MenuFace({ card, no, t, lang }) {
  const menu = useMenu(lang);
  // the rows in menu-picks.js name their drinks in English; the English menu
  // is always loaded (menu-i18n.js), so this never waits
  const menuEN = useMenu('EN');
  const drinks = useMemo(() => pickDrinks(menu, menuEN), [menu, menuEN]);
  // The beat counts the drinks: 0 is the first one — the still, which the
  // static HTML and a reduced-motion visitor keep.
  const { beat, ref } = useBeat({ face: 'menu', on: drinks.length > 1, order: Number(no) });

  // Today's drinks deal, when the feed has one today (the same rule as the
  // menu's own deal ticket): its name and hours come from the feed.
  const { events } = useFeed();
  const deal = useMemo(() => nextDealToday(events, isDealEvent), [events]);

  const len = Math.max(drinks.length, 1);
  const drink = drinks[beat % len];
  const before = beat > 0 ? drinks[(beat - 1) % len] : null;

  return (
    <DeckCard card={card} no={no} t={t} meta={t.use('deck.menu.now')}>
      <span ref={ref} className="dk-roll">
        {/* key: a new drink is a new element, so the roll plays on each swap
            (and not on the first one, which is the page's still). */}
        {drink ? <Drink key={beat} drink={drink} cls={beat > 0 ? 'dk-roll-in' : ''} /> : null}
        {before ? <Drink key={`out${beat}`} drink={before} cls="dk-roll-out" leaving /> : null}
      </span>
      {deal ? (
        <span className="dk-fact dk-x dk-clamp2">
          <span className="dk-mark" aria-hidden="true" />
          {fmtTime(deal.startsAt)}
          {deal.endsAt ? `–${fmtTime(deal.endsAt)}` : ''} · {pickTitle(deal, lang)}
        </span>
      ) : null}
    </DeckCard>
  );
}
