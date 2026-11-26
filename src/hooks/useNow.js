import { useEffect, useState } from 'react';

// useNow — the current time, re-read at the top of every minute, so anything
// that says "now" (rooms in use, open/closed, the clock on a card) stays true
// while the page sits open. One shared ticker for every consumer; it sleeps
// while the tab is hidden and catches up the moment it is shown again.
//
// The first render — and so the prerendered HTML — carries the time the page
// was built or loaded. The effect corrects it straight after mount.
const listeners = new Set();
let timer = null;

function tick() {
  const now = Date.now();
  listeners.forEach((fn) => fn(now));
  schedule();
}

function schedule() {
  clearTimeout(timer);
  timer = null;
  if (!listeners.size || document.hidden) return;
  timer = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
}

function onVisibility() {
  if (!document.hidden) tick();
  else schedule();
}

export default function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!listeners.size) document.addEventListener('visibilitychange', onVisibility);
    listeners.add(setNow);
    setNow(Date.now());
    schedule();
    return () => {
      listeners.delete(setNow);
      if (!listeners.size) {
        document.removeEventListener('visibilitychange', onVisibility);
        clearTimeout(timer);
        timer = null;
      }
    };
  }, []);
  return now;
}
