import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../Header';
import { DECK, cardNo } from '../deck';
import { fill, Pulse } from '../parts';
import { STR } from '../../../data/translations';
import useFeed from '../../../hooks/useFeed';
import useNow from '../../../hooks/useNow';
import { buildingNow } from '../../../data/deck/building';
import { ictClock, openNow } from '../../../data/deck/open-hours';
import { isDealEvent } from '../../../data/event-category';
import { dmy } from '../../../data/deck/event-audit';
import { AmbientTable, playEverything, setLabAmbient } from './ambient';
import { LabCtx } from './kit';
import { VARIANTS, variantOf } from './variants';
import { encodeSel, pick, setLab, useLab } from './labStore';
import BuildingLab from './faces/BuildingLab';
import FirstLab from './faces/FirstLab';
import MenuLab from './faces/MenuLab';
import HeldLab from './faces/HeldLab';
import GivingLab from './faces/GivingLab';
import InsideLab from './faces/InsideLab';
import HostLab from './faces/HostLab';
import ConnectLab from './faces/ConnectLab';
import VisitLab from './faces/VisitLab';
import './motion.css';
import './lab.css';

// DeckLab — /deck-lab. DEV ONLY (the route in App.jsx exists only under
// `import.meta.env.DEV`): nothing here is built, prerendered, linked or in
// the sitemap. It is where the ambient motion for the INSIDE of the nine card
// faces is compared and picked:
//
//   1  each card on its own, at its real desktop size, with its options
//   2  the first screen as the home page draws it, with the same switches,
//      to judge which few cards moving together feel alive without being busy
//   3  the same first screen at phone width (an iframe of this page, so the
//      phone layout's own media queries apply)
//
// The options are in ./variants.js, the faces in ./faces/, the keyframes in
// ./motion.css, and the turn-taking in ./ambient.js.
const FACES = {
  building: BuildingLab, first: FirstLab, menu: MenuLab, held: HeldLab, giving: GivingLab,
  inside: InsideLab, host: HostLab, connect: ConnectLab, visit: VisitLab,
};

// The lab is English only: the same lookup App.jsx builds for a page.
const t = {
  use: (k) => {
    const v = k.split('.').reduce((a, c) => (a && a[c] !== undefined ? a[c] : undefined), STR.EN);
    return v !== undefined ? v : k;
  },
};
const titleOf = (card) => t.use(`deck.cards.${card.key}.title`);

// The busiest moment in the feed: the most separate events running at once
// (then the most rooms lit, then a drinks deal on). Real events at a real
// time — only the "now" is moved.
function busiestMoment(events) {
  let best = null;
  for (const ev of events || []) {
    const start = ev && ev.startsAt ? Date.parse(ev.startsAt) : NaN;
    if (Number.isNaN(start)) continue;
    const at = start + 5 * 60000;
    if (!openNow(at).open) continue;
    const s = buildingNow(events, { now: at, isDeal: isDealEvent });
    const score = s.nowEvents.length * 10 + s.onCount + (s.deal ? 1 : 0);
    if (score > 0 && (!best || score > best.score)) best = { at, score };
  }
  return best ? best.at : null;
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
const YMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const whenLabel = (ms) => `${WEEKDAY.format(ms).toUpperCase()} ${dmy(YMD.format(ms)).replace(/\.\d+$/, '')} · ${ictClock(ms).hhmm}`;

function Face({ card, index, sel }) {
  const Comp = FACES[card.key];
  return <Comp card={card} no={cardNo(index)} t={t} lang="EN" v={sel[card.key] || 'off'} />;
}

// A card is a link to its section on the home page; here it goes nowhere.
const stay = (e) => {
  if (e.target.closest && e.target.closest('a.dk-card')) e.preventDefault();
};

// ── The first screen, as the home page draws it (DeckHero.jsx), with the
// lab's faces on the table. The masthead is the real one: its ink strip is
// already moving up there, and that is part of what the cards sit next to.
function FirstScreen({ sel, now }) {
  const { open, until } = openNow(now);
  const S = (k) => t.use(`deck.${k}`);
  const words = String(t.use('heroTitle')).split(' / ');
  return (
    <div onClickCapture={stay}>
      <Header lang="EN" mobileOpen={false} setMobileOpen={() => {}} t={t} deck={DECK} />
      <div className="dk">
        <section className="dk-hero">
          <div className="dk-hero-top">
            <p className="dk-hero-h1" role="presentation">
              {words.map((w, i) => (
                <span key={i} className={i === words.length - 1 ? 'font-display-bold' : 'font-display'}>
                  {w}{i < words.length - 1 ? ' /' : ''}{' '}
                </span>
              ))}
            </p>
            <p className="dk-hero-status dk-fact">
              <Pulse off={!open} />
              {open ? S('status.open') : S('status.closed')}
              {' · '}
              {fill(open ? S('status.till') : S('status.opens'), { time: until })}
              <span className="dk-hero-addr"> · 86 Mai Thúc Lân, Đà Nẵng</span>
            </p>
          </div>
          <AmbientTable>
            <div className="dk-table">
              {DECK.map((card, i) => <Face key={card.key} card={card} index={i} sel={sel} />)}
            </div>
          </AmbientTable>
          <div className="dk-hero-more">
            <p className="dk-hero-lede">{t.use('heroSub')}</p>
            <div className="dk-hero-acts">
              <span className="btn-action dk-btn">{S('tonightCta')}</span>
              <span className="btn-secondary dk-btn">{titleOf(DECK[1])}</span>
            </div>
            <p className="dk-hero-hint">{fill(S('hint'), { n: DECK.length })}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── One card on its own, with its options.
function Solo({ card, index, sel }) {
  const table = useRef(null);
  const chosen = sel[card.key] || 'off';
  const info = variantOf(card.key, chosen);
  // Picking an option here plays it straight away (once the face has taken it).
  const choose = (id) => {
    pick(card.key, id);
    if (id !== 'off' && id !== 'cur') window.setTimeout(() => table.current && table.current.playAll(), 160);
  };
  return (
    <div className="dkl-solo">
      <div className="dkl-solo-card" onClickCapture={stay}>
        <AmbientTable handle={table}>
          <Face card={card} index={index} sel={sel} />
        </AmbientTable>
      </div>
      <div className="dkl-solo-ctl">
        <div className="dkl-opts" role="radiogroup" aria-label={`${cardNo(index)} ${titleOf(card)}`}>
          <button type="button" role="radio" aria-checked={chosen === 'off'} className="dkl-opt" onClick={() => choose('off')}>
            Off
          </button>
          {VARIANTS[card.key].map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={chosen === v.id}
              className="dkl-opt"
              onClick={() => choose(v.id)}
            >
              <b>{v.id === 'cur' ? 'Now' : v.id.toUpperCase()}</b> {v.name}
            </button>
          ))}
        </div>
        <p className="dkl-what">{info ? info.what : 'Nothing moves on this card.'}</p>
        <button type="button" className="dkl-btn" disabled={chosen === 'off'} onClick={() => table.current && table.current.playAll()}>
          Play it now
        </button>
      </div>
    </div>
  );
}

function Seg({ label, value, options, onChange }) {
  return (
    <div className="dkl-seg" role="group" aria-label={label}>
      <span className="dkl-seg-l">{label}</span>
      {options.map(([val, text]) => (
        <button key={String(val)} type="button" aria-pressed={value === val} onClick={() => onChange(val)}>{text}</button>
      ))}
    </div>
  );
}

function summaryOf(sel) {
  const parts = DECK.map((card, i) => {
    const v = variantOf(card.key, sel[card.key]);
    return v ? `${cardNo(i)}${v.id === 'cur' ? ' as now' : v.id.toUpperCase()} ${titleOf(card)}: ${v.name}` : null;
  }).filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nothing picked: every card is still.';
}

export default function DeckLab() {
  const lab = useLab();
  const { sel, night, quick, still, demo } = lab;
  const view = new URLSearchParams(window.location.search).get('view');
  const { events } = useFeed();
  const realNow = useNow();
  const busiest = useMemo(() => busiestMoment(events), [events]);
  const demoNow = demo ? busiest : null;
  const ctx = useMemo(() => ({ demoNow }), [demoNow]);
  const [copied, setCopied] = useState(false);

  // Day / Night: the page's own switch (data-theme on <html>), put back as
  // it was on the way out. The site's saved theme is not touched.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.getAttribute('data-theme');
    if (night) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    return () => {
      if (before) root.setAttribute('data-theme', before);
      else root.removeAttribute('data-theme');
    };
  }, [night]);

  useEffect(() => {
    setLabAmbient({ tempo: quick ? 3 : 1, still });
  }, [quick, still]);

  // A handle for checking the lab from the console or a script:
  //   __deckLab.setLab({ sel: { held: 'a' }, night: true }); __deckLab.play()
  useEffect(() => {
    window.__deckLab = { setLab, pick, play: playEverything };
    return () => { delete window.__deckLab; };
  }, []);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const title = document.title;
    document.title = 'Deck lab · card motion';
    return () => {
      meta.remove();
      document.title = title;
    };
  }, []);

  // The phone-width frame: just the first screen.
  if (view === 'phone') {
    return (
      <LabCtx.Provider value={ctx}>
        <div className={`dkl dkl-frame${still ? ' dkl-still' : ''}`}>
          <FirstScreen sel={sel} now={demoNow || realNow} />
        </div>
      </LabCtx.Provider>
    );
  }

  const moving = Object.keys(sel).length;
  const summary = summaryOf(sel);
  const code = encodeSel(sel).toUpperCase().replace(/CUR/g, 'cur').split('.').join(' ');
  const copy = () => {
    const text = moving ? `Deck motion picks (${code}): ${summary}` : 'Deck motion picks: none.';
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
  };

  return (
    <LabCtx.Provider value={ctx}>
      <div className={`dkl${still ? ' dkl-still' : ''}`}>
        <div className="dkl-bar">
          <div className="dkl-bar-row">
            <strong className="dkl-title">Deck lab · card motion</strong>
            <Seg label="Theme" value={night} options={[[false, 'Day'], [true, 'Night']]} onChange={(v) => setLab({ night: v })} />
            <Seg label="Timing" value={quick} options={[[false, 'Real'], [true, 'Quick look ×3']]} onChange={(v) => setLab({ quick: v })} />
            <Seg label="Motion" value={still} options={[[false, 'On'], [true, 'Reduced (still)']]} onChange={(v) => setLab({ still: v })} />
            <Seg
              label="Building"
              value={demo}
              options={[[false, 'Right now'], [true, busiest ? `Busiest hour (${whenLabel(busiest)})` : 'Busiest hour']]}
              onChange={(v) => setLab({ demo: v })}
            />
          </div>
          <div className="dkl-bar-row dkl-picks">
            {DECK.map((card, i) => (
              <label key={card.key} className={`dkl-pick k-${card.color}${sel[card.key] ? ' is-on' : ''}`}>
                <i aria-hidden="true" />
                <span>{cardNo(i)}</span>
                <select value={sel[card.key] || 'off'} onChange={(e) => pick(card.key, e.target.value)} aria-label={`${cardNo(i)} ${titleOf(card)}`}>
                  <option value="off">Off</option>
                  {VARIANTS[card.key].map((v) => (
                    <option key={v.id} value={v.id}>{v.id === 'cur' ? 'Now' : v.id.toUpperCase()} · {v.name}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="dkl-bar-row dkl-sum">
            <span className="dkl-count">{moving} of {DECK.length} moving</span>
            <span className="dkl-sum-t">{summary}</span>
            <button type="button" className="dkl-btn" onClick={copy}>{copied ? 'Copied' : 'Copy picks'}</button>
            <button type="button" className="dkl-btn dkl-btn-alt" onClick={() => setLab({ sel: {} })}>All off</button>
          </div>
        </div>

        <section className="dkl-sec">
          <h2 className="dkl-h">1 · Each card, on its own</h2>
          <p className="dkl-p">
            Real desktop size. On its own a card takes a turn about every ten seconds (every three on Quick look); “Play it now” skips the wait.
            Hold the pointer over a card and it waits.
          </p>
          <div className="dkl-solos">
            {DECK.map((card, i) => <Solo key={card.key} card={card} index={i} sel={sel} />)}
          </div>
        </section>

        <section className="dkl-sec dkl-sec-wide">
          <h2 className="dkl-h">2 · Together: the first screen</h2>
          <p className="dkl-p">
            As the home page draws it, masthead included (its ink strip already performs every five seconds or so). The cards take turns: one
            every three to five seconds, never two at once, so the more cards are moving the longer each one rests.
          </p>
          <div className="dkl-stage">
            <FirstScreen sel={sel} now={demoNow || realNow} />
          </div>
        </section>

        <section className="dkl-sec">
          <h2 className="dkl-h">3 · Together: the phone</h2>
          <p className="dkl-p">390 px wide. The same switches drive it.</p>
          <iframe className="dkl-phone" title="The first screen at phone width" src="/deck-lab?view=phone" />
        </section>
      </div>
    </LabCtx.Provider>
  );
}
