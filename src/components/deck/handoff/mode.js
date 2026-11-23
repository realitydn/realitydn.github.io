// Which scroll hand-off is being tried out — DEV ONLY.
//
// The hand-offs (./index.js and the five option files beside it) are an
// experiment: five ways for one opened card to give way to the next, switchable
// so they can be compared on the real page. They exist only on the dev server
// (`npm run dev`). In a production build `import.meta.env.DEV` is the literal
// `false`, so HANDOFF is the constant null, nothing in this folder is bundled,
// and the page behaves exactly as it did before the folder existed.
//
//   /?handoff=overprint   (or the option's number: /?handoff=1)
//
// No option, or an unknown one: the page as it ships (the "Current" deal-in).
const BY_NUMBER = { 1: 'overprint', 2: 'drift', 3: 'handmedown', 4: 'spines', 7: 'seam' };
const KEYS = Object.values(BY_NUMBER);

function read() {
  try {
    const raw = (new URLSearchParams(window.location.search).get('handoff') || '').trim().toLowerCase();
    const key = BY_NUMBER[raw] || raw.replace(/[^a-z]/g, '');
    return KEYS.includes(key) ? key : null;
  } catch (e) {
    return null;
  }
}

export const HANDOFF = import.meta.env.DEV && typeof window !== 'undefined' ? read() : null;
