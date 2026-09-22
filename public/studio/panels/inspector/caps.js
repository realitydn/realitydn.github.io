/* ============================================================
   REALITY POSTER STUDIO — inspector capabilities
   Which shared dials each element type exposes, and the presets they offer.
   ============================================================ */
/* ============================================================
   PER-TYPE CAPABILITIES — the single source of truth for which shared
   dials an element exposes. The Inspector renders a FIXED canonical
   order of sections (Content → Type → Subtitle → Appearance → Shadow →
   Transform → This-format) and consults this map to decide what shows,
   so parity + ordering can't drift as new features land. Bespoke content
   (text fields, item editors, the photo panel) still lives inline; this
   governs the shared controls only.
     text/font  — text element + its weight set ('mont' | 'grot')
     size·weight·tracking·align·orient·lineHeight — which type dials show
     sizePreset — host's Standard/Compact quick toggle
     subtitle   — title's stacked subtitle group
     tag        — a centred chip (no align; gains a height dial)
     rowSize    — list block with Auto/S/M/L row sizing
     surface    — the shared Surface + colour block
     kickerColor— host's separate "Hosted by" colour
     fillOwn    — element owns its fill (weekly/block) — skip shared block
     media      — photo/logo (own panel)
     shadow     — every element now has a shadow control
     height     — expose a height dial + the shared tag-height presets
     widthPreset— weekly's grid width presets
   ============================================================ */
const TYPE_CAPS = {
  title:    { text:true, font:'mont', size:true, weight:true, tracking:true, align:true, orient:true, lineHeight:{ def:0.84, min:0.7, max:1.5 }, subtitle:true, surface:true, shadow:true },
  tagline:  { text:true, font:'grot', size:true, weight:true, tracking:true, align:true, orient:true, surface:true, shadow:true },
  info:     { text:true, font:'grot', size:true, weight:true, tracking:true, align:true, lineHeight:{ def:1.4, min:1, max:2 }, surface:true, shadow:true },
  /* when + cost are FACT chips — Space Grotesk (canon M1), so their weight
     picker is the Grotesk set, not Montserrat's. */
  when:     { text:true, font:'grot', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  cost:     { text:true, font:'grot', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  stamp:    { text:true, font:'mont', size:true, weight:true, tracking:true, tag:true, align:true, surface:true, shadow:true, height:true },
  /* The whole host credit is Grotesk (24.08) — lead-in AND name — so its
     weight picker is the Grotesk set, which tops out at 700. */
  host:     { text:true, font:'grot', size:true, sizePreset:true, weight:true, tracking:true, align:true, surface:true, kickerColor:true, shadow:true },
  ticket:   { align:true, surface:true, shadow:true },
  qr:       { align:true, surface:true, shadow:true },
  lineup:   { list:true, rowSize:true, align:true, surface:true, shadow:true },
  specials: { list:true, rowSize:true, align:true, surface:true, shadow:true },
  sessions: { list:true, rowSize:true, align:true, surface:true, shadow:true },
  agenda:   { list:true, rowSize:true, align:true, surface:true, shadow:true },
  badge:    { align:true, surface:true, shadow:true },
  wordmark: { surface:true, shadow:true },
  /* weekly owns its accent bar, so it takes textColor WITHOUT surface — the
     bar text needs the same Auto/override swatch every accent fill gets. */
  weekly:   { fillOwn:true, shadow:true, height:true, widthPreset:true, textColor:true },
  matchup:  { align:true, surface:true, shadow:true },
  block:    { fillOwn:true, shadow:true },
  /* ink mark — fixed canon palette: no surface, no fill, no shadow (the spec
     bans cell shadows and the whole mark stays flat). Its own panel only. */
  inkmark:  {},
  /* graphical family — each owns its fill (and its own bespoke panel above),
     so they skip the shared Surface block and keep the shadow control */
  shape:    { fillOwn:true, shadow:true },
  icon:     { fillOwn:true, shadow:true },
  rule:     { fillOwn:true, shadow:true },
  burst:    { fillOwn:true, shadow:true },
  photo:    { media:true, shadow:true },
  logo:     { media:true, shadow:true },
};
const ROW_SIZES = [{v:0,l:'Auto fit'},{v:16,l:'S'},{v:21,l:'M'},{v:26,l:'L'}];
/* Shared height vocabulary for chip/tag-shaped elements (when · stamp · weekly)
   so a Weekly tag and a When chip can be dialled to the SAME height and sit in a
   row at uniform height — no more delicate per-element resizing.
   Rungs are MODULE multiples (1 · 1.5 · 2 · 2.5) rather than the old
   84/120/162/220, so a tag set from this list already sits on the grid and
   Snap doesn't shift it the moment you drag it. */
const TAG_HEIGHTS = [{v:90,l:'S'},{v:135,l:'M'},{v:180,l:'L'},{v:225,l:'XL'}];

/* Reality-ticket formats — picked from the details panel (not separate
   sidebar items). Each sets the size + what's shown; content is preserved.

   The BANNER is the full-width closing band and the poster's brand carrier,
   so it comes up complete: QR shown, the canon ink SQUARE in FULL ink, and
   the column aligned right with the mark block opposite (see the banner
   renderer). markForm is pinned to 'square' rather than left on 'auto' so
   the square survives the QR being switched off — 'auto' only picks the
   square *because* a QR is there. The two slim variants stay bare; they
   exist for sheets that already carry a ticket elsewhere. */
const TICKET_FORMATS = {
  banner:   { variant:'banner',   x:0, w:1080, h:270, surface:'paper', showQR:true,
              align:'right', mark:'on', markForm:'square', markMode:'full' },
  standard: { variant:'standard',      w:900,  h:180, surface:'paper', showQR:true  },
  slim:     { variant:'slim',          w:675,  h:135, surface:'paper', showQR:false },
  mini:     { variant:'mini',          w:450,  h:90,  surface:'paper', showQR:false },
};

export { TYPE_CAPS, ROW_SIZES, TAG_HEIGHTS, TICKET_FORMATS };
