import React from 'react';
import DeckSection from '../DeckSection';
import { fill, Gap } from '../parts';
import useFundraisers from '../../../hooks/useFundraisers';
import { vnd, rowText } from '../../../data/deck/fundraisers';
import { dmy } from '../../../data/deck/event-audit';

// 07 · Charitable giving, opened — one ticket per fundraiser, newest first:
// when it was, what it raised (in full), who it went to, when it was handed
// over and what it became.
//
// From the app's fundraisers feed (read when the site is built, and again in
// the browser). With no rows from either: the stand-in list
// (data/deck/fundraisers.js), which carries the owner's exact figures. A fact
// a row doesn't have prints as a dashed GAP tag, never as a guess.
export default function GivingSection({ card, no, t, lang }) {
  const { live, rows, totalVnd, page } = useFundraisers();
  const S = (k) => t.use(`deck.giving.${k}`);
  const day = (iso) => dmy(String(iso).slice(0, 10));
  return (
    <DeckSection card={card} no={no} t={t} live={fill(S('raised'), { total: vnd(totalVnd) })}>
      <p className="dk-lede">{S('lede')}</p>
      <div className="dk-g3">
        {rows.map((r, i) => {
          const title = rowText(r, 'title', lang);
          const recipient = rowText(r, 'recipient', lang);
          const summary = rowText(r, 'summary', lang);
          return (
            <article key={`${r.title}-${r.heldOn || i}`} className="tkt dk-fund">
              <div className="tkt-top">
                <span>{S('fundraiser')}</span>
                <span>{r.heldOn ? day(r.heldOn) : <Gap>{S('gapDate')}</Gap>}</span>
              </div>
              <div className="dk-pad">
                <h3 className="dk-name">
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{title}</a> : title}
                </h3>
                <p className="dk-amt">{vnd(r.amountVnd)}</p>
                <p className="dk-small">
                  {S('givenTo')}: {recipient || <Gap>{S('gapRecipient')}</Gap>}
                </p>
                {r.handedOverOn ? (
                  <p className="dk-small dk-dim">{fill(S('handedOver'), { date: day(r.handedOverOn) })}</p>
                ) : null}
                {summary ? <p className="dk-small dk-dim">{summary}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
      {live && page ? (
        <p className="dk-gap-top">
          <a className="dk-lk" href={page} target="_blank" rel="noreferrer">{S('all')}</a>
        </p>
      ) : null}
    </DeckSection>
  );
}
