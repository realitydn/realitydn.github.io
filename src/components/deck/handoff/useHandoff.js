import { useEffect } from 'react';

// useHandoff — starts the hand-off experiment on the home page. DEV ONLY.
//
// In a production build `import.meta.env.DEV` is the literal `false`, so the
// export below is the empty function: no effect is registered, the dynamic
// import is dead code, and nothing in this folder is bundled.
//
// `dep` restarts it when the page is re-rendered for another language (the
// sections are new elements then).
function useHandoffDev(dep) {
  useEffect(() => {
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

const useHandoff = import.meta.env.DEV ? useHandoffDev : () => {};
export default useHandoff;
