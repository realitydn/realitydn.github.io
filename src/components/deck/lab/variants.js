// variants.js — every ambient-motion option for the inside of the nine card
// faces, by card key (deck.js). The lab page lists these; the lab faces
// (./faces/*.jsx) take the chosen id as their `v` prop. 'off' is the face
// with nothing moving.
//
//   id    the letter in the summary Donald copies back ("01A 04B 09C")
//   name  what it's called on the lab page
//   what  one line: what moves, and when
//
// PICKS (Donald, 24.11.26) are the six that run on the home page. Those are
// built into the real faces (../faces/*.jsx + deck.css), and the lab draws a
// picked option with the REAL face, so what is judged here is what ships. The
// lab's own copies of those six branches (./faces/*Lab.jsx) are no longer drawn.
export const PICKS = { menu: 'b', held: 'b', giving: 'c', inside: 'a', host: 'c', visit: 'c' };

export const VARIANTS = {
  building: [
    { id: 'a', name: 'Re-print a room', what: 'One room that has an event in it right now is stamped again in its own red, a different room each turn. Nothing on: the bar, while we are open.' },
    { id: 'b', name: 'Lights up', what: 'The lit rooms go dark for a moment, then print back in floor by floor from the street up.' },
    { id: 'c', name: 'On the minute', what: 'Only when the clock turns a minute: the changed digits roll over and the lit rooms tick once. Still for the other 59 seconds.' },
  ],
  first: [
    { id: 'a', name: 'One, two, three, four', what: 'The four step numbers are daubed in order. Phone: the figure counts 1, 2, 3, 4.' },
    { id: 'b', name: 'One step at a time', what: 'One step steps forward and settles back, the next step on the next turn. Phone: the 4 presses.' },
    { id: 'c', name: 'Ticked off', what: 'Each turn ticks off one more step and leaves it ticked; after the fourth, the card clears and starts again. Phone: the ticks add up in place of the 4.' },
  ],
  menu: [
    { id: 'cur', name: 'As it was', what: 'What the card did before the picks: a new drink rises in every 4.2 seconds, on its own clock and off the beat.' },
    { id: 'a', name: 'Re-stamped', what: 'A new drink is stamped down: the name lands turned and oversized, the price pops in after it.' },
    { id: 'b', name: 'Rolled', what: 'The drink rolls up and out, the next rolls in under it, like a line on a scoreboard. Every 4 beats.' },
    { id: 'c', name: 'Colour separation', what: 'The next drink’s name arrives as two colour plates out of register that slide together, then the ink lands on top.' },
  ],
  held: [
    { id: 'a', name: 'Count up', what: 'The count rolls up to its number from one average week below it (1578 → 1601) and pops as it lands.' },
    { id: 'b', name: 'Chart prints', what: 'The bars print in left to right ONCE, when the card first comes on screen, and then the chart is still. “Play it now” repeats it here.' },
    { id: 'c', name: 'Latest bar', what: 'Only the newest bar is stamped again, and the count gives one small pop.' },
  ],
  giving: [
    { id: 'a', name: 'Heart daub', what: 'A small red heart sits by the total and is daubed again each turn, like a marker hitting paper.' },
    { id: 'b', name: 'Tally', what: 'The total adds up fundraiser by fundraiser (52M, 62M, 72M₫+), each amount stamped in turn.' },
    { id: 'c', name: 'Echo', what: 'Two colour plates shoot out from behind the total, hold as a misregistered print, and snap back: two beats long, every 8 beats.' },
  ],
  inside: [
    { id: 'a', name: 'Registration', what: 'A photo is replaced by the next of ten: printed in out of register, then slid into place. No two passes alike: the side it prints from, the slip, the plate colour and a second plate all change. Every 4 beats, the two frames in turn.' },
    { id: 'b', name: 'New ink', what: 'The same photos, printed again in another ink: purple, pink, blue, amber.' },
    { id: 'c', name: 'Dealt', what: 'The next gallery photo is dealt onto the old one from the right and lands square.' },
  ],
  host: [
    { id: 'a', name: 'Reel to zero', what: 'The figure rolls down 3, 2, 1 and lands on 0₫ with a pop.' },
    { id: 'b', name: 'Rubber stamp', what: '0₫ is lifted and stamped back down; a yellow print snaps in under it on landing, then goes.' },
    { id: 'c', name: 'Highlighter', what: 'A yellow plate is pulled across behind 0₫, holds, and is pulled off: three beats long, every 8 beats.' },
  ],
  connect: [
    { id: 'a', name: 'Chip pop', what: 'The four channels are stamped in turn, each kicking a blue print out behind it.' },
    { id: 'b', name: 'One at a time', what: 'One channel is pressed and prints solid for a second, the next channel on the next turn.' },
    { id: 'c', name: 'Ping', what: 'A small yellow square lands on one channel’s icon like a badge, stays a moment, and goes.' },
  ],
  visit: [
    { id: 'a', name: 'Radar ring', what: 'While we are open, two square rings go out from the open-now marker each turn. Closed: nothing moves.' },
    { id: 'b', name: 'Pin drop', what: 'A map pin sits by the address and drops onto it again each turn.' },
    { id: 'c', name: 'Hours strip', what: 'A strip of the fifteen open hours, 11:00 to 02:00, filled up to now; the current hour is stamped again every 4 beats.' },
  ],
};

export const variantOf = (key, id) => (VARIANTS[key] || []).find((v) => v.id === id) || null;
