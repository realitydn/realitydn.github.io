// THE HAND-OFFS — five ways for one opened card to give way to the next,
// switchable so they can be compared on the real page. DEV ONLY (see mode.js).
//
//   Current         the page as it ships: each card is dealt in (useDealIn)
//   1 Overprint     ./overprint.js   + overprint.css
//   2 Drift         ./drift.js       + drift.css
//   3 Hand-me-down  ./handmedown.js  + handmedown.css
//   4 Spines        ./spines.js      + spines.css
//   7 Seam          ./seam.js        + seam.css
//
// TO DROP A LOSER: delete its two files and its line in OPTIONS below.
// TO KEEP A WINNER: its two files are the whole of it, plus what it uses from
// stage.js (the measuring) and, if it says `head: true`, the "header rides
// under the strip" block in handoff.css.
//
// Switching reloads the page with ?handoff=<key>, so every option starts
// clean and a choice can be opened on a phone by its URL. The place you were
// reading is kept across the reload.
import './handoff.css';
import { HANDOFF } from './mode';
import { createStage } from './stage';
import { mountSwitch } from './switch';
import { prefersReducedMotion } from '../../../hooks/motion';
import { landingTarget } from '../../../hooks/useHashLanding';
import overprint from './overprint';
import drift from './drift';
import handmedown from './handmedown';
import spines from './spines';
import seam from './seam';

export const OPTIONS = [
  { key: null, no: '', name: 'Current' },
  { key: 'overprint', no: '1', name: 'Overprint', impl: overprint },
  { key: 'drift', no: '2', name: 'Drift', impl: drift },
  { key: 'handmedown', no: '3', name: 'Hand-me-down', impl: handmedown },
  { key: 'spines', no: '4', name: 'Spines', impl: spines },
  { key: 'seam', no: '7', name: 'Seam', impl: seam },
];

const KEEP = 'ho-keep';

export function start() {
  const option = OPTIONS.find((o) => o.key === HANDOFF) || OPTIONS[0];
  const reduced = prefersReducedMotion();
  // Reduced motion: no hand-off at all — the cards simply sit in place. An
  // option may still show its resting look (`still`), if it has one.
  const runs = !!option.impl && !reduced;
  const stage = createStage(runs ? option.impl : {});
  if (!stage) return () => {};

  if (runs) stage.start();
  else if (option.impl && option.impl.still) option.impl.still(stage);

  // Land where the last option was being read (the switch stored it), or, on
  // a deep link, where the hash points: the option may have moved things
  // since the browser's own jump.
  let spot = null;
  try {
    spot = JSON.parse(window.sessionStorage.getItem(KEEP) || 'null');
    window.sessionStorage.removeItem(KEEP);
  } catch (e) { /* private window: start at the top */ }
  const hashEl = () => {
    const t = landingTarget(window.location.hash);
    return t ? document.getElementById(t.id) : null;
  };
  const land = () => {
    if (stage.touched) return;
    if (spot) stage.goTo(spot);
    else if (runs && hashEl()) {
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      hashEl().scrollIntoView({ block: 'start' });
      root.style.scrollBehavior = prev;
    }
  };
  land();
  // …and again once the feed and the fonts have settled the heights.
  const timers = [400, 1200].map((ms) => window.setTimeout(land, ms));

  const unmountSwitch = mountSwitch({
    options: OPTIONS,
    current: option.key,
    reduced: reduced && !!option.impl,
    pick(key) {
      try { window.sessionStorage.setItem(KEEP, JSON.stringify(stage.place())); } catch (e) { /* fine */ }
      const url = new URL(window.location.href);
      if (key) url.searchParams.set('handoff', key);
      else url.searchParams.delete('handoff');
      url.hash = '';
      window.location.assign(url.toString());
    },
  });

  return () => {
    timers.forEach((id) => window.clearTimeout(id));
    unmountSwitch();
    if (runs) stage.stop();
    else if (option.impl && option.impl.unstill) option.impl.unstill(stage);
  };
}
