import React from 'react';
import DeckSection from '../DeckSection';
import { fill, Gap } from '../parts';
import useFundraisers from '../../../hooks/useFundraisers';
import { vnd, vndShort, amountLabel } from '../../../data/deck/fundraisers';
import { dmy } from '../../../data/deck/event-audit';

// 07 · Charitable giving, opened — one ticket per fundraiser: when it was,
// what it raised, who it went to.
//
// From the app's fundraisers feed once it has rows. Until then: the marked
// stand-in list (data/deck/fundraisers.js). A fact that list doesn't have
// prints as a dashed GAP tag, never as a guess, and a short note says the
// figures are rounded.
export default function GivingSection({ card, no, t, lang }) {
  const { live, rows, totalVnd, totalApprox, page } = useFundraisers();
  const S = (k) => t.use(`deck.giving.${k}`);
  const total = `${vndShort(totalVnd)}${totalApprox ? '+' : ''}`;
  const title = (r) => (lang === 'VN' && r.title_vi) || r.title;
  return (
    <DeckSection card={card} no={no} t={t} live={fill(S('raised'), { total })}>
      <p className="dk-lede">{S('lede')}</p>
      <div className="dk-g3">
        {rows.map((r, i) => (
          <article key={`${r.title}-${r.heldOn || i}`} className="tkt dk-fund">
            <div className="tkt-top">
              <span>{S('fundraiser')}</span>
              <span>{r.heldOn ? dmy(String(r.heldOn).slice(0, 10)) : <Gap>{S('gapDate')}</Gap>}</span>
            </div>
            <div className="dk-pad">
              <h3 className="dk-name">
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{title(r)}</a> : title(r)}
              </h3>
              {/* From the feed the amount is exact; a stand-in carries its
                  own honesty mark (≈ rounded, + at least). */}
              <p className="dk-amt">{live ? vnd(r.amountVnd) : amountLabel(r)}</p>
              <p className="dk-small">
                {S('givenTo')}: {r.recipient ? r.recipient : <Gap>{S('gapRecipient')}</Gap>}
              </p>
              {r.summary ? <p className="dk-small dk-dim">{r.summary}</p> : null}
            </div>
          </article>
        ))}
      </div>
      {!live ? <p className="dk-small dk-dim dk-gap-top">{S('standIn')}</p> : null}
      {live && page ? (
        <p className="dk-gap-top">
          <a className="dk-lk" href={page} target="_blank" rel="noreferrer">{S('all')}</a>
        </p>
      ) : null}
    </DeckSection>
  );
}
