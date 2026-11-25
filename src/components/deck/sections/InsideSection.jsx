import React from 'react';
import DeckSection from '../DeckSection';
import { fill, Gap } from '../parts';
import GallerySection from '../../GallerySection';
import { GALLERY } from '../../../data/events';

// 05 · Inside, opened — what the building has (two paragraphs of copy:
// deck.inside.intro), the gallery the site has always had (the carousel and
// its lightbox, unchanged), and what is on the walls.
//
// ON THE WALLS is a marked GAP: nothing in this repo or in the public feeds
// says which show is hanging now, so the page does not say either. When
// there is a source (an exhibitions list in the app, or a data file here),
// replace the <Gap> with it.
//
// MUSIC: deliberately absent. The app has no public now-playing endpoint, and
// there is no playlist link anywhere in this repo to point at. If the house
// playlists get a real public link, it earns one quiet row here — not a card.
export default function InsideSection({ card, no, t }) {
  const S = (k) => t.use(`deck.inside.${k}`);
  const intro = S('intro');
  return (
    <DeckSection card={card} no={no} t={t} live={fill(S('photos'), { n: GALLERY.length })}>
      <div className="dk-intro">
        {(Array.isArray(intro) ? intro : []).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <GallerySection t={t} embedded />
      <div className="dk-walls">
        <h3 className="dk-label">{S('walls')}</h3>
        <p className="dk-small">
          <Gap>{S('gapWalls')}</Gap>
        </p>
        <p>
          <a className="dk-lk" href="#host">{t.use('infoHost.artCTA')}</a>
        </p>
      </div>
    </DeckSection>
  );
}
