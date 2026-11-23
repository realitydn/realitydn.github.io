import { useEffect } from 'react';

// useHandoff — starts the hand-off experiment on the home page. DEV ONLY: in a
// production build the branch below is dead code, so the dynamic import (and
// with it this whole folder) is left out of the bundle.
//
// `dep` restarts it when the page is re-rendered for another language (the
// sections are new elements then).
export default function useHandoff(dep) {
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    let stop = null;
    let dead = false;
    import('./index.js').then((m) => {
      if (!dead) stop = m.start();
    });
    return () => {
      dead = true;
      if (stop) stop();
    };
  }, [dep]);
}
