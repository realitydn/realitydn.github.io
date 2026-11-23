// deck.js — THE DECK. The home page is this list, in this order.
//
// To reorder the cards, reorder the lines. To drop one, delete its line. The
// number on a card (01, 02 …) is its place in this list, so it renumbers
// itself. Nothing else needs to change: the table of cards in the hero, the
// sticky strip and the sections down the page are all drawn from here.
//
//   key      the card's name in the copy: deck.cards.<key>.title / .short
//            in src/data/locales/*.js
//   id       the anchor (realitydn.com/#id). Changing one changes a public
//            link; the old ones are listed in README.md ("Deep links")
//   aliases  extra anchors that land on this card (old links that must not
//            break). Anchors that land INSIDE a card are set in its section:
//            #rules (Find us), #proposal (Host an event)
//   color    the card's colour, one of:
//            ink · green · amber · blue · yellow · purple · red · pink · stock
//            (text on it is picked for you: ink on yellow, amber and stock,
//            cream on the rest)
//   Face     the small live card on the table        → ./faces/
//   Section  the opened card, further down the page  → ./sections/
import BuildingFace from './faces/BuildingFace';
import FirstFace from './faces/FirstFace';
import MenuFace from './faces/MenuFace';
import HeldFace from './faces/HeldFace';
import GivingFace from './faces/GivingFace';
import InsideFace from './faces/InsideFace';
import HostFace from './faces/HostFace';
import ConnectFace from './faces/ConnectFace';
import VisitFace from './faces/VisitFace';
import BuildingSection from './sections/BuildingSection';
import FirstSection from './sections/FirstSection';
import MenuCardSection from './sections/MenuCardSection';
import HeldSection from './sections/HeldSection';
import GivingSection from './sections/GivingSection';
import InsideSection from './sections/InsideSection';
import HostSection from './sections/HostSection';
import ConnectSection from './sections/ConnectSection';
import VisitCardSection from './sections/VisitCardSection';

export const DECK = [
  { key: 'building', id: 'events',  color: 'ink',    Face: BuildingFace, Section: BuildingSection },
  { key: 'first',    id: 'first',   color: 'green',  Face: FirstFace,    Section: FirstSection, aliases: ['info'] },
  { key: 'menu',     id: 'menus',   color: 'amber',  Face: MenuFace,     Section: MenuCardSection },
  { key: 'held',     id: 'held',    color: 'blue',   Face: HeldFace,     Section: HeldSection },
  { key: 'giving',   id: 'giving',  color: 'yellow', Face: GivingFace,   Section: GivingSection },
  { key: 'inside',   id: 'gallery', color: 'purple', Face: InsideFace,   Section: InsideSection },
  { key: 'host',     id: 'host',    color: 'red',    Face: HostFace,     Section: HostSection },
  { key: 'connect',  id: 'connect', color: 'pink',   Face: ConnectFace,  Section: ConnectSection },
  { key: 'visit',    id: 'visit',   color: 'stock',  Face: VisitFace,    Section: VisitCardSection },
];

// 0 → '01'
export const cardNo = (index) => String(index + 1).padStart(2, '0');

