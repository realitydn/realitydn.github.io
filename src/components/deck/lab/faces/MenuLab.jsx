import React, { useEffect, useMemo, useRef, useState } from 'react';
import DeckCard from '../../DeckCard';
import { useMenu } from '../../../../data/menu-i18n';
import useFeed from '../../../../hooks/useFeed';
import { nextDealToday } from '../../../../data/cal-feed';
import { isDealEvent } from '../../../../data/event-category';
import { fmtTime, pickTitle } from '../../../../data/feed-helpers';
import { vnd } from '../../../../data/deck/fundraisers';
import { ambientStill, useBeat } from '../ambient';

// 03 · Our menu — the face of faces/MenuFace.jsx (same drinks, same order).
//   off  the first drink, still
//   cur  what the card does today: a new drink rises in every 4.2 s, on its
//        own clock (not on the table's turns)
//   a    re-stamped: the name lands turned and oversized, the price pops after
//   b    rolled: the drink rolls up and out, the next rolls in under it
//   c    colour separation: two plates out of register slide together, then
//        the ink name lands on top
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

function Drink({ drink, cls = '' }) {
  return (
    <span className={`dk-roll-i ${cls}`}>
      <span className="dk-t dkm-name" data-t={drink.name}>{drink.name}</span>
      <span className="dk-fact dk-x dk-clamp2 dkm-tag">{drink.tag}</span>
      <b className="dk-fact dk-price dkm-price">{vnd(Number(drink.price) * 1000)}</b>
    </span>
  );
}

export default function MenuLab({ card, no, t, lang, v }) {
  const menu = useMenu(lang);
  const drinks = useMemo(() => pickDrinks(menu), [menu]);
  const { beat, ref } = useBeat({ on: v === 'a' || v === 'b' || v === 'c' });

  // cur: the card's own clock, exactly as the live face runs it.
  const [tick, setTick] = useState(0);
  const held = useRef(false);
  useEffect(() => {
    if (v !== 'cur' || drinks.length < 2) {
      setTick(0);
      return undefined;
    }
    const id = window.setInterval(() => {
      if (held.current || document.hidden || ambientStill()) return;
      setTick((n) => n + 1);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [v, drinks.length]);

  const i = v === 'cur' ? tick : beat;
  const len = Math.max(drinks.length, 1);
  const drink = drinks[i % len];
  const before = i > 0 ? drinks[(i - 1) % len] : null;
  const inCls = i === 0 ? '' : v === 'cur' ? 'dk-roll-in' : `dkm-drink-${v}`;

  const { events } = useFeed();
  const deal = useMemo(() => nextDealToday(events, isDealEvent), [events]);
  const hold = (x) => () => { held.current = x; };

  return (
    <DeckCard card={card} no={no} t={t} meta={t.use('deck.menu.now')}>
      <span ref={ref} className="dk-roll dkm-roll" onMouseEnter={hold(true)} onMouseLeave={hold(false)}>
        {drink ? <Drink key={i} drink={drink} cls={inCls} /> : null}
        {/* b: the drink that is leaving, on its way up and out */}
        {v === 'b' && before ? <Drink key={`out${i}`} drink={before} cls="dkm-drink-out" /> : null}
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
