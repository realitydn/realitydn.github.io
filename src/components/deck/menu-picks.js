// menu-picks.js — which drinks stand for the menu where the whole menu is not
// shown: the rolling drink on the "Our menu" card.
//
// Nothing is written for either place. The drinks, their one-liners and
// prices are the menu itself (src/data/menu.js, generated from the app).
//
// WHICH DRINKS: every item in these menu chapters that has a one-liner (its
// `tag`) and a price, taken a chapter at a time in turn, so the list moves
// between cocktails, zero proof and the café. Change ROLL_FROM to change the mix.
const ROLL_FROM = ['cocktails', 'zeroproof', 'cafe'];

export function pickDrinks(menu, max = 15) {
  const lanes = ROLL_FROM.map((key) => {
    const cat = menu.find((c) => c.key === key);
    return cat ? cat.sections.flatMap((s) => s.items).filter((it) => it.tag && it.price) : [];
  });
  const out = [];
  for (let i = 0; out.length < max && lanes.some((l) => i < l.length); i++) {
    for (const lane of lanes) if (lane[i] && out.length < max) out.push(lane[i]);
  }
  return out;
}
