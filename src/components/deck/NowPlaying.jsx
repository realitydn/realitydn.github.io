import React, { useEffect, useRef, useState } from 'react';
import { Pulse, isStill } from './parts';
import { FRESH_MS, POLL_MS, fetchNowPlaying, nowPlayingView } from '../../data/deck/now-playing';

// NowPlaying — the song playing in the bar, on the "What's happening" card.
//
// It is on the page ONLY while the now-playing feed has just said a song is
// playing (data/deck/now-playing.js has the feed and the rules). No stand-in,
// no skeleton, no "nothing playing" line, no link, and no word about where
// the music comes from. Never in the static HTML.
//
// WHERE: on a tablet or desktop, on the ground floor of the building, in the
// bar's own cell (place="bar"); on a phone, where that cell is too narrow, a
// strip under the building (the default). deck.css shows one or the other.
//
// A NEW SONG PRINTS IN: its words are wiped in from the left behind a hard
// edge (no fade). Under reduced motion they are simply there.

// Is any of this card on screen right now? Three points down the middle of
// the window are tested for what is actually painted there, because a card
// the seam is holding off stage still overlaps the window: it is clipped,
// not moved.
function onScreen(el) {
  const card = el && (el.closest('.dk-sec') || el);
  if (!card || typeof document.elementFromPoint !== 'function') return false;
  const r = card.getBoundingClientRect();
  const vh = window.innerHeight;
  if (r.bottom <= 0 || r.top >= vh) return false;
  return [0.3, 0.5, 0.7].some((f) => {
    const hit = document.elementFromPoint(window.innerWidth / 2, vh * f);
    return !!hit && card.contains(hit);
  });
}

// useNowPlaying() → { track, ref }. `ref` goes on something inside the card.
// `track` is { title, artist } or null.
//
// It asks every POLL_MS while the card is on screen and the tab is visible,
// and not at all otherwise: the timer is dropped, and a scroll or the tab
// coming back starts it again (at once if the last answer is older than
// POLL_MS). An answer too old to trust is cleared before the next one lands.
export function useNowPlaying() {
  const [track, setTrack] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (isStill()) return undefined;
    let alive = true;
    let timer = 0;
    let busy = false;
    let last = 0; // when the feed was last asked
    let throttle = 0;
    const seen = () => !document.hidden && onScreen(ref.current);

    const ask = async () => {
      window.clearTimeout(timer);
      timer = 0;
      if (!alive || busy || !seen()) return; // off screen or hidden: stop here
      busy = true;
      last = Date.now();
      const doc = await fetchNowPlaying();
      busy = false;
      if (!alive) return;
      setTrack(nowPlayingView(doc));
      timer = window.setTimeout(ask, POLL_MS);
    };
    // the card may have come (back) on screen
    const wake = () => {
      if (!alive || timer || busy || !seen()) return;
      if (last && Date.now() - last > FRESH_MS) setTrack(null);
      timer = window.setTimeout(ask, Math.max(0, POLL_MS - (Date.now() - last)));
    };
    const onScroll = () => {
      if (throttle) return;
      throttle = window.setTimeout(() => { throttle = 0; wake(); }, 250);
    };

    wake();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearTimeout(throttle);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return { track, ref };
}

// The line. `place`: 'strip' (under the building) or 'bar' (in the bar's cell).
export default function NowPlaying({ track, t, place = 'strip' }) {
  if (!track) return null;
  return (
    <p className={`dk-np dk-np-${place}`}>
      <span className="dk-np-l">
        <Pulse />
        {t.use('deck.building.playing')}
      </span>
      {/* key: a new song is a new element, so it prints in */}
      <span className="dk-np-s" key={`${track.title}|${track.artist}`}>
        <span className="dk-np-t">{track.title}</span>
        {track.artist ? <span className="dk-np-a">{track.artist}</span> : null}
      </span>
    </p>
  );
}
