import React, { useEffect, useMemo, useRef, useState } from 'react';
import DeckCard from '../DeckCard';
import { isStill } from '../parts';
import { useMenu } from '../../../data/menu-i18n';
import useFeed from '../../../hooks/useFeed';
import { prefersReducedMotion } from '../../../hooks/motion';
import { nextDealToday } from '../../../data/cal-feed';
import { isDealEvent } from '../../../data/event-category';
import { fmtTime, pickTitle } from '../../../data/feed-helpers';
import { vnd } from '../../../data/deck/fundraisers';

// 03 · Our menu — one drink at a time, changing every few seconds. The
// drinks, their one-liners and prices are the menu itself (src/data/menu.js,
// generated from the app): nothing here is written for the card.
//
// WHICH DRINKS: every item in these menu chapters that has a one-liner (its
// `tag`) and a price, taken a chapter at a time in turn so the card moves
// between cocktails, zero proof and the café. Change ROLL_FROM to change the mix.
const ROLL_FROM = ['cocktails', 'zeroproof', 'cafe'];
const ROLL_MAX = 15;
const HOLD_MS = 4200;

function pickDrinks(menu) {
  const lanes = ROLL_FROM.map((key) => {
    const cat = menu.find((c) => c.key === key);
    return cat ? cat.sections.flatMap((s) => s.items).filter((it) => it.tag && it.price) : [];
  });
  const out = [];
  for (let i = 0; out.length < ROLL_MAX && lanes.some((l) => i < l.length); i++) {
    for (const lane of lanes) if (lane[i] && out.length < ROLL_MAX) out.push(lane[i]);
  }
  return out;
}

export default function MenuFace({ card, no, t, lang }) {
  const menu = useMenu(lang);
  const drinks = useMemo(() => pickDrinks(menu), [menu]);
  const [i, setI] = useState(0);
  const held = useRef(false);

  // The roll. It holds while the pointer is over it, sleeps while the
  // tab is hidden, and never starts under reduced motion or in the static
  // capture — the first drink is the still.
  useEffect(() => {
    if (drinks.length < 2 || isStill() || prefersReducedMotion()) return undefined;
    const id = window.setInterval(() => {
      if (held.current || document.hidden) return;
      setI((n) => (n + 1) % drinks.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [drinks.length]);

  // Today's drinks deal, when the feed has one today (the same rule as the
  // menu's own deal ticket): its name and hours come from the feed.
  const { events } = useFeed();
  const deal = useMemo(() => nextDealToday(events, isDealEvent), [events]);

  const drink = drinks[i % Math.max(drinks.length, 1)];
  const hold = (v) => () => { held.current = v; };

  return (
    <DeckCard card={card} no={no} t={t} meta={t.use('deck.menu.now')}>
      <span
        className="dk-roll"
        onMouseEnter={hold(true)}
        onMouseLeave={hold(false)}
      >
        {drink ? (
          // key: a new drink is a new element, so the stamp plays on each swap
          // (and not on the first one, which is the page's still).
          <span key={i} className={`dk-roll-i${i > 0 ? ' dk-roll-in' : ''}`}>
            <span className="dk-t">{drink.name}</span>
            <span className="dk-fact dk-x dk-clamp2">{drink.tag}</span>
            <b className="dk-fact dk-price">{vnd(Number(drink.price) * 1000)}</b>
          </span>
        ) : null}
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
