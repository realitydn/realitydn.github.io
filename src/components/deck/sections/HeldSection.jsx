import React from 'react';
import DeckSection from '../DeckSection';
import Expand from '../Expand';
import { fill, decimal } from '../parts';
import { AUDIT, dmy } from '../../../data/deck/event-audit';

// 04 · Events we've held, opened.
//
// WHO IT IS FOR: someone deciding whether to come for the first time, or
// whether to host here. The card answers three questions, in this order:
//   Is it a living place?   the count since the doors opened
//   Is it busy NOW?         events a week over the last three months (a
//                           running average: it says what a week is like
//                           today, which the all-time average does not)
//   Is there room for me?   how many series are running, how many different
//                           ones there have been, and how many started in
//                           the last 30 days
// beside the chart of how the pace has grown (Donald, 25.11.26: "I like the
// timeline--I'm missing the graphical element to this slide": the chart is in
// the main view, not behind the fold).
//
// "More figures" holds the series that have run most (the regulars a newcomer
// can count on), the series that ran only once, the span the count covers,
// where the numbers come from, and the door to the full Event Audit page. It
// is a fold on a phone and a tablet; on a desktop it is laid out in the card
// (Expand flatFrom="l"). The count by day of the week is on the audit page.
//
// THE FIGURES are the weekly event report's (public/event-report/stats.json),
// read when the site is built: data/deck/event-audit.js. They are a week old
// at most, not live, and the page says so: "as of" in the header and beside
// the figures. Series names are printed as the report gives them, which is
// as the webapp has them.

// The audit page exists in English and Vietnamese; the other languages read
// the English one.
const REPORT = { VN: '/event-report/vn/' };

// The trend as plain bars: one per sample of "events in the trailing 30
// days", a gridline every 50, four dates along the foot. HTML, not SVG, so
// the numbers stay readable when the chart is 330px wide.
function TrendChart({ label, alt }) {
  const data = AUDIT.trend30;
  const top = Math.ceil(Math.max(...data) / 50) * 50;
  // each count's own date, as the report gives it
  const dateAt = (i) => dmy(AUDIT.trendDates[i]);
  const last = data.length - 1;
  const ticks = [0, Math.round(last / 3), Math.round((last * 2) / 3), last];
  const lines = [];
  for (let v = 50; v <= top; v += 50) lines.push(v);
  return (
    <figure className="dk-chart" style={{ margin: 0 }}>
      <figcaption className="dk-label">{label}</figcaption>
      <div className="dk-trend" role="img" aria-label={alt}>
        <div className="dk-trend-plot">
          {lines.map((v) => (
            <div key={v} className="dk-trend-gl" style={{ bottom: `${(v / top) * 100}%` }}>
              <span>{v}</span>
            </div>
          ))}
          {data.map((v, i) => (
            <i key={i} className={i === last ? 'last' : undefined} style={{ height: `${(v / top) * 100}%` }} />
          ))}
        </div>
        <div className="dk-trend-x" aria-hidden="true">
          {ticks.map((i) => <span key={i}>{dateAt(i)}</span>)}
        </div>
      </div>
    </figure>
  );
}

export default function HeldSection({ card, no, t, lang }) {
  const S = (k) => t.use(`deck.held.${k}`);
  const asOf = fill(S('asOf'), { date: dmy(AUDIT.asOf) });
  const row = (label, value) => (
    <div className="dk-rl">
      <span>{label}</span>
      <u aria-hidden="true" />
      <b>{value}</b>
    </div>
  );
  return (
    <DeckSection card={card} no={no} t={t} live={`${AUDIT.total} · ${asOf}`}>
      <p className="dk-lede">{S('intro')}</p>
      <div className="dk-held">
        <div className="dk-rc">
          <div className="dk-nums">
            <div>
              <p className="dk-num">{AUDIT.total}</p>
              <p className="dk-fact">
                {S('events')} · {fill(S('since'), { date: dmy(AUDIT.from) })}
              </p>
            </div>
            <div>
              <p className="dk-num">{decimal(AUDIT.perWeek90, lang)}</p>
              <p className="dk-fact">{S('rowWeek90')}</p>
            </div>
          </div>
          <hr />
          {row(S('rowRunning'), AUDIT.running)}
          {row(S('rowSeries'), AUDIT.series)}
          {row(S('rowNew'), AUDIT.debuted30)}
          <p className="dk-small dk-dim dk-rc-asof">{asOf}</p>
        </div>

        <div className="dk-held-chart">
          <TrendChart
            label={S('trend')}
            alt={fill(S('trendAlt'), {
              first: AUDIT.trend30[0],
              last: AUDIT.trend30[AUDIT.trend30.length - 1],
              date: dmy(AUDIT.to),
            })}
          />
          <p className="dk-fact dk-dim">
            {fill(S('peak'), { n: AUDIT.trendPeak.value, date: dmy(AUDIT.trendPeak.on) })}
          </p>
        </div>
      </div>

      <Expand id="held-more" label={S('more')} flatFrom="l">
        <div className="dk-held dk-held-more">
          <div className="dk-rc">
            <h3 className="dk-label">{S('mostRun')}</h3>
            {/* Series names are names: printed as the audit prints them. */}
            {AUDIT.mostRun.map((m) => (
              <React.Fragment key={m.name}>{row(m.name, m.runs)}</React.Fragment>
            ))}
          </div>
          <div className="dk-rc">
            {row(S('rowOnce'), AUDIT.oneOffs)}
            {row(S('rowSpan'), `${dmy(AUDIT.from)} – ${dmy(AUDIT.to)}`)}
            {row(S('rowWeeks'), decimal(AUDIT.weeks, lang))}
            <p className="dk-small dk-dim dk-gap-top">{S('source')}</p>
            <p>
              <a className="dk-lk" href={REPORT[lang] || '/event-report/'}>{S('link')}</a>
            </p>
          </div>
        </div>
      </Expand>
    </DeckSection>
  );
}
