// menu-picks.js — which drinks stand for the menu where the whole menu is not
// shown: the rolling drink on the "Our menu" card.
//
// Nothing is written here. A drink's name, its kind and its line are the menu
// itself (src/data/menu.js, generated from the app), in the visitor's
// language.
//
// THE WHOLE MENU, NOT JUST THE COCKTAILS (Donald, 25.11.26: "the menu card
// should advertise cocktails, yes, but also coffee, matcha, fresh oj, danh
// thanh … our signature cocktails are just confusing without context, and
// there are plenty of non-drinkers as well"). So the card moves between
// coffee, cocktails, matcha, juice, beer, tea and water, and every drink
// says what kind of drink it is.
//
// TO CHANGE THE DRINKS: edit PICKS. One row per drink, in the order they are
// shown: the menu chapter it is in, and its name exactly as the ENGLISH menu
// prints it (src/data/menu.js, `nameEN`). The first row is the one the static
// page and a reduced-motion visitor see. A row whose drink is no longer on
// the menu is skipped, and `npm run selftest` says which.
//   chapters: cocktails · spirits · beerwine · table · zeroproof · cafe
export const PICKS = [
  ['cafe', 'Salt Coffee'],
  ['cocktails', 'Mỹ An Colada'],
  ['cafe', 'Matcha Latte (hot/cold)'],
  ['zeroproof', 'Fresh-Squeezed Orange Juice'],
  ['cocktails', 'Mojito'],
  ['cafe', 'Black Coldbrew Coffee'],
  ['zeroproof', 'Safe Word'],
  ['beerwine', 'Peaches + Cream NW IPA'],
  ['cafe', 'Oolong Tea'],
  ['zeroproof', 'Đảnh Thạnh Mineral Water'],
  ['cocktails', 'Espresso Martini'],
  ['cafe', 'Coconut Cream Coffee'],
  ['cafe', 'Fresh Ginger Tea'],
  ['cocktails', 'Whiskey Sour'],
  ['cafe', 'Matcha Coconut Cloud'],
  ['zeroproof', 'Good Girl Mojito'],
  ['beerwine', 'Sauvignon Blanc'],
  ['cafe', 'Cold-Brew Jasmine Green'],
];

// WHAT KIND OF DRINK IT IS: the label of the menu section it sits in ("Phin
// Coffee", "Matcha", "Soda + juice", "Craft Beer"). The chapters listed here
// are the exception: their sections are moods, not kinds ("Sweet + Creamy",
// "Spiced + Smoky"), so their drinks take the chapter's own name
// ("Cocktails").
const KIND_IS_CHAPTER = ['cocktails'];

// The same helpers read the menu one language at a time (menu-i18n.js:
// `name`, `label`) and the generated file as it is (`nameEN`, `labelEN`),
// which is what the selftest checks the rows against.
const nameOf = (it) => it.name || it.nameEN;
const labelOf = (x) => x.label || x.labelEN;

// Where a row's drink is on the English menu: { c, s, i } (chapter, section
// and item, by position), or null when it is not there.
export function locate(menuEN, [key, name]) {
  const c = menuEN.findIndex((cat) => cat.key === key);
  if (c < 0) return null;
  const sections = menuEN[c].sections;
  for (let s = 0; s < sections.length; s++) {
    const i = sections[s].items.findIndex((it) => nameOf(it) === name);
    if (i >= 0) return { c, s, i };
  }
  return null;
}

// pickDrinks(menu, menuEN) → [{ name, kind, line }], in the visitor's
// language. `menu` is that language's menu, `menuEN` the English one (the
// rows are found by their English names; both menus are the same shape).
//   name   the drink
//   kind   what kind of drink it is (above)
//   line   the menu's one-liner for it (its `tag`), or its ingredients line
//          (`desc`) when it has no one-liner; '' when the menu gives neither
export function pickDrinks(menu, menuEN = menu) {
  const out = [];
  for (const pick of PICKS) {
    const at = locate(menuEN, pick);
    const cat = at && menu[at.c];
    const section = cat && cat.sections[at.s];
    const item = section && section.items[at.i];
    if (!item) continue;
    out.push({
      name: nameOf(item),
      kind: labelOf(KIND_IS_CHAPTER.includes(cat.key) ? cat : section),
      line: item.tag || item.desc || '',
    });
  }
  return out;
}
