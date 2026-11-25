import React, { useEffect, useState } from 'react';
import { Pulse, isStill } from './parts';
import { POLL_MS, fetchNowPlaying, hasNowPlayingSource, nowPlayingView } from '../../data/deck/now-playing';

// NowPlaying — the track playing in the bar, on the "What's happening" card.
//
// It renders NOTHING unless the now-playing feed has just said a track is
// playing (data/deck/now-playing.js has the rules, and the switch: today
// there is no feed, so this is never on the page). No stand-in, no skeleton,
// no "nothing playing" line. Never in the static HTML.
export default function NowPlaying({ t }) {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    if (isStill() || !hasNowPlayingSource()) return undefined;
    let alive = true;
    let timer = 0;
    const ask = async () => {
      window.clearTimeout(timer);
      if (document.hidden) return; // asked again when the tab comes back
      const doc = await fetchNowPlaying();
      if (!alive) return;
      setTrack(nowPlayingView(doc));
      timer = window.setTimeout(ask, POLL_MS);
    };
    const onVisible = () => { if (!document.hidden) ask(); };
    ask();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!track) return null;
  const S = (k) => t.use(`deck.building.${k}`);
  const body = (
    <>
      <span className="dk-np-l">
        <Pulse />
        {S('playing')}
      </span>
      <span className="dk-np-t">{track.title}</span>
      {track.artist ? <span className="dk-np-a">{track.artist}</span> : null}
    </>
  );
  return track.url ? (
    <a className="dk-np" href={track.url} target="_blank" rel="noreferrer" title={S('playingLink')}>{body}</a>
  ) : (
    <p className="dk-np">{body}</p>
  );
}
