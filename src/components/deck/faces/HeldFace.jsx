import React, { useEffect, useRef, useState } from 'react';
import DeckCard from '../DeckCard';
import { ambientStill } from '../ambient';
import { fill, decimal } from '../parts';
import { AUDIT, dmy } from '../../../data/deck/event-audit';

// 04 · Events we've held — the count, a small chart of how it has grown, and
// the date the count was taken. Not live: the figures are the weekly event
// report's, read when the site is built (data/deck/event-audit.js), so the
// card says "as of".
//
// THE MOTION ("Chart prints"): the bars print in left to right ONCE, as the
// card arrives: on load when the card is on the first screen, otherwise the
// first time it scrolls into view. Then the chart is still for good.
//
// (Fixed 25.11.26. It used to wait its turn on the table's clock, up to four
// seconds after the page opened, with the finished chart already showing:
// the chart sat still, then blanked and drew itself. Now the bars are down
// until the card is seen and print in straight away, so it reads as the card
// loading in. It is not on the clock at all: lib/beat.js has no entry for it.)
//
// The static HTML and a reduced-motion visitor get the finished chart.
const BAR_STEP_MS = 18; // the gap between one bar and the next
const LAND_MS = 240; //    a moment for the card itself to land first

export default function HeldFace({ card, no, t, lang }) {
  const S = (k) => t.use(`deck.held.${k}`);
  const max = Math.max(...AUDIT.trend30);
  // 'still'  the finished chart, no motion (static HTML, reduced motion)
  // 'wait'   the page is running and the card has not been seen: bars down
  // 'go'     printing in, and standing from then on
  const [phase, setPhase] = useState(() => (ambientStill() ? 'still' : 'wait'));
  const ref = useRef(null);

  useEffect(() => {
    if (phase !== 'wait') return undefined;
    const el = ref.current && (ref.current.closest('.dk-card') || ref.current);
    if (!el || !('IntersectionObserver' in window)) {
      setPhase('go');
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      setPhase('go');
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [phase]);

  return (
    <DeckCard card={card} no={no} t={t} meta={fill(S('asOf'), { date: dmy(AUDIT.asOf) })}>
      <span className="dk-num">{AUDIT.total}</span>
      <span ref={ref} className="dk-spark" aria-hidden="true">
        {AUDIT.trend30.map((v, i) => {
          const style = { height: `${Math.max(3, Math.round((v / max) * 100))}%` };
          if (phase === 'go') style.animationDelay = `${LAND_MS + i * BAR_STEP_MS}ms`;
          const cls = phase === 'go' ? 'dk-spark-in' : phase === 'wait' ? 'dk-spark-wait' : undefined;
          return <i key={i} className={cls} style={style} />;
        })}
      </span>
      <span className="dk-fact dk-x">
        {fill(S('perWeek90'), { n: decimal(AUDIT.perWeek90, lang) })}
      </span>
    </DeckCard>
  );
}
