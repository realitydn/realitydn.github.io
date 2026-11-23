import React from 'react';
import DeckSection from '../DeckSection';
import { fill, decimal } from '../parts';
import { AUDIT, dmy } from '../../../data/deck/event-audit';
import { weekdayName } from '../../../data/cal-feed';

// 04 · Events we've held, opened — the count as a receipt, the series that
// have run most, how the pace has grown, which days are busiest, and the door
// to the full Event Audit page.
//
// NOT LIVE. Every figure is a snapshot copied from public/event-report/
// (data/deck/event-audit.js says where each one comes from), and the page
// says so: "as of" in the header, and the note under the chart.

// The audit page exists in English and Vietnamese; the other languages read
// the English one.
const REPORT = { VN: '/event-report/vn/' };

// Monday 5.10.26 at noon in Đà Nẵng — only used to get each weekday's name in
// the visitor's language (Mon, Thứ 2, пн, 月 …).
const A_MONDAY = Date.parse('2026-10-05T12:00:00+07:00');
const DAY_CLASS = ['d-mon', 'd-tue', 'd-wed', 'd-thu', 'd-fri', 'd-sat', 'd-sun'];

// The trend as plain bars: one per sample of "events in the trailing 30
// days", a gridline every 50, four dates along the foot. HTML, not SVG, so
// the numbers stay readable when the chart is 330px wide.
function TrendChart({ label, alt }) {
  const data = AUDIT.trend30;
  const top = Math.ceil(Math.max(...data) / 50) * 50;
  const ms = Date.parse(`${AUDIT.to}T12:00:00+07:00`);
  const dateAt = (i) => {
    const d = new Date(ms - (data.length - 1 - i) * AUDIT.trendStepDays * 86400000);
    return dmy(d.toISOString().slice(0, 10));
  };
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
  const dayMax = Math.max(...AUDIT.byWeekday);
  const row = (label, value) => (
    <div className="dk-rl">
      <span>{label}</span>
      <u aria-hidden="true" />
      <b>{value}</b>
    </div>
  );
  return (
    <DeckSection card={card} no={no} t={t} live={`${AUDIT.total} · ${asOf}`}>
      <div className="dk-held">
        <div className="dk-rc">
          <p className="dk-num">{AUDIT.total}</p>
          <p className="dk-fact">
            {S('events')} · {dmy(AUDIT.from)} – {dmy(AUDIT.to)} · {fill(S('weeks'), { n: decimal(AUDIT.weeks, lang) })}
          </p>
          <hr />
          {row(S('rowWeek'), decimal(AUDIT.perWeek, lang))}
          {row(S('rowSeries'), AUDIT.series)}
          {row(S('rowRunning'), AUDIT.running)}
          {row(S('rowOnce'), AUDIT.oneOffs)}
          <hr />
          <h3 className="dk-label">{S('mostRun')}</h3>
          {/* Series names are names: printed as the audit prints them. */}
          {AUDIT.mostRun.map((m) => (
            <React.Fragment key={m.name}>{row(m.name, m.runs)}</React.Fragment>
          ))}
        </div>

        <div>
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

          <h3 className="dk-label dk-gap-top">{S('weekdays')}</h3>
          <div className="dk-days">
            {AUDIT.byWeekday.map((v, i) => (
              <div key={i} className={DAY_CLASS[i]}>
                <b>{v}</b>
                <i style={{ height: `${Math.round((v / dayMax) * 96)}px` }} aria-hidden="true" />
                <span>{weekdayName(new Date(A_MONDAY + i * 86400000).toISOString(), lang)}</span>
              </div>
            ))}
          </div>

          <p className="dk-small dk-dim dk-gap-top">{asOf}. {S('source')}</p>
          <p className="dk-gap-top">
            <a className="dk-lk" href={REPORT[lang] || '/event-report/'}>{S('link')}</a>
          </p>
        </div>
      </div>
    </DeckSection>
  );
}
