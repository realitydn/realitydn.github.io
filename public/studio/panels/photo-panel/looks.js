/* ============================================================
   REALITY POSTER STUDIO — photo panel · the presses and their looks
   TREATS (the strip's order and copy), how the ink sits, the named finishes,
   each treatment's baseline (TREAT_PRESETS) and its named looks. Plain data;
   the studio test suite reads TREAT_PRESETS / FINISH_* / TREAT_LOOKS from here.
   ============================================================ */
/* Every press, in the canon order, each carrying the Photo Guidance's own
   three lines. `tag` is what the treatment IS in four words; best/avoid are
   transcribed from the guidance card, not written here — they are what makes
   the strip teachable to somebody who has never heard of a riso. Keep them in
   step with the card if it revs. */
const TREATS = [
  {v:'separation',l:'Press',tag:'real separation · the press',
   best:'Anything. This is what the machine does — start here and reach for the others when you want a specific effect.',
   avoid:'You want one flat graphic move rather than a photograph.'},
  {v:'duotone',l:'Duotone',tag:'two-colour tint',
   best:'Faces, portraits, anything that has to stay readable.',
   avoid:'You want maximum graphic punch — go louder below.'},
  {v:'offregister',l:'Off-Reg',tag:'the signature',
   best:'Hero DJ / party shots, movement, big sizes.',
   avoid:'The photo is text-dense or printed small — fringing muddies it.'},
  {v:'halftone',l:'Halftone',tag:'newsprint grit',
   best:'Live music, crowds, high-contrast images.',
   avoid:'The photo is soft and flat — the dots vanish.'},
  {v:'posterize',l:'Banded',tag:'silkscreen flatness',
   best:'Bold, simple compositions with one clear subject.',
   avoid:'The scene is detailed — fine detail collapses.'},
  {v:'cutout',l:'Cutout',tag:'max punch',
   best:'One clear subject on a dark background; loud headlines.',
   avoid:"The background is busy — the subject won't separate."},
  {v:'overprint',l:'Overprint',tag:'wet overlap',
   best:'Texture / abstract shots, covers, two-colour richness.',
   avoid:'Literal clarity matters — it abstracts the image.'},
  {v:'spot',l:'Spot',tag:'one tone floods',
   best:'A single flare, face or lamp you want to pick out in flat ink.',
   avoid:'The tone you want is spread across the frame — it floods everything.'},
  {v:'dither',l:'Dither',tag:'1-bit zine screen',
   best:'Photocopied-flyer energy; anything that wants to look duplicated.',
   avoid:'The subject reads by colour rather than shape — there is no colour left.'},
  {v:'hatch',l:'Hatch',tag:'engraved lines',
   best:'Portraits and objects with real form — the strokes follow the light.',
   avoid:'The photo is flat or busy; the lines have nothing to describe.'},
  {v:'photocopy',l:'Copier',tag:'toner-crushed mono',
   best:'Grit, urgency, gig-poster feel. Faces survive it well.',
   avoid:'You need the midtones — this treatment is mostly about losing them.'},
  {v:'contour',l:'Contour',tag:'topographic map',
   best:'Landscapes, crowds, anything with broad tonal shapes to trace.',
   avoid:'The scene is fine-grained — smooth it hard first or it turns to noise.'},
  {v:'edges',l:'Outline',tag:'the drawing under the photo',
   best:'Strong silhouettes and architecture; anything that reads as a drawing.',
   avoid:'The light is soft — there are no edges to find.'},
  {v:'mosaic',l:'Mosaic',tag:'tiled to the ramp',
   best:'Abstraction, backgrounds, covering a photo that is not quite good enough.',
   avoid:'Anyone needs to be recognisable.'},
  {v:'none',l:'None',tag:'no plate — the photo as shot',
   best:'Checking the frame before you print it.',
   avoid:'It is going on a poster — a raw photo breaks the palette.'}
];

/* ============================================================
   HOW THE INK SITS — the press composited onto the photograph.
   ============================================================
   Strength only ever FADES a print towards the picture underneath.
   These change what the print IS: a halftone multiplied over a
   photograph keeps the photograph's own tone under the screen
   instead of replacing it, which is what a screen printed over a
   photograph actually does — and no strength setting gets there.

   Every one is a real ink behaviour before it is a compositing
   formula, and the copy says which. Ported from the app's Darkroom
   (src/lib/riso-presets.ts). */
const PRESS_BLENDS = [
  { v:'normal',     l:'Opaque',   note:'The print covers the photo. Opaque ink — the classic riso.' },
  { v:'multiply',   l:'Multiply', note:'Transparent ink over the photograph — the picture reads THROUGH the screen. The one to reach for on a halftone.' },
  { v:'screen',     l:'Screen',   note:'Ink that only ever lightens. Glows on night stock; nearly invisible on day.' },
  { v:'overlay',    l:'Overlay',  note:'Multiplies the shadows and screens the lights at once — contrast without losing either end.' },
  { v:'soft-light', l:'Soft',     note:'The gentlest of them. A tint of the treatment rather than a print of it.' },
  { v:'hard-light', l:'Hard',     note:"Overlay's opposite — the PRINT decides. Hard, poster-ish, unsubtle." },
  { v:'darken',     l:'Darken',   note:'Keeps whichever is darker. Ink lands only where it would be seen.' },
  { v:'lighten',    l:'Lighten',  note:'Keeps whichever is lighter. The night-stock twin of Darken.' }
];

/* ============================================================
   NAMED FINISHES — in the order a print acquires wear.
   ============================================================
   Named for the object, not the sliders: nobody wants "grain 0.6,
   dust 0.3, contrast 1.45", they want "off a photocopier". Each
   look is applied over the neutral stack, so switching between two
   of them can never accumulate — picking Clean really is clean.
   Ported from the app's Darkroom, which named these while this
   engine only ever had the dials. */
const FINISH_NEUTRAL = {
  finBright:0, finContrast:1, finSat:1,
  blurOver:0, blurOverType:'gauss', blurOverAngle:0, blurOverX:0, blurOverY:0, blurOverPos:0.5, blurOverWidth:0.3,
  grain:0, grainSize:2, grainInk:null, grainBlend:'soft',
  vignette:0, vignetteSoft:0.6, paperTex:0, inkBleed:0, dust:0, misprint:0, misprintAngle:-35
};
const FINISH_LOOKS = [
  { v:'clean',   l:'Clean',    p:{}, note:'No finishing — a digital print of a riso.' },
  { v:'stock',   l:'On stock', p:{ paperTex:0.45, grain:0.18 },
    note:'Paper tooth and a breath of grain. The one for anything published.' },
  { v:'pressed', l:'Pressed',  p:{ paperTex:0.5, grain:0.25, inkBleed:0.3, vignette:0.35 },
    note:'Stock, plus wet ink and an edge falloff — a print still in the room.' },
  { v:'handled', l:'Handled',  p:{ paperTex:0.55, grain:0.35, grainSize:2.5, inkBleed:0.25, vignette:0.4, dust:0.4, misprint:5 },
    note:'Dust, scratches and a mis-registered pull. A print that has been somewhere.' },
  { v:'copier',  l:'Copied',   p:{ finContrast:1.45, finSat:0.35, grain:0.6, grainSize:1.5, grainBlend:'dirty', dust:0.3, paperTex:0.3 },
    note:'Blown contrast, dirty toner grain, no subtlety left.' }
];
/* recommended defaults applied when a treatment is chosen — each looks good out of the box.
   cutout, posterize, spot, mosaic and photocopy render byte-identically on day and night:
   by design — press treatments print on cream stock whichever theme the poster is. */
const TREAT_PRESETS = {
  /* the press: null = the paper decides (inks: accent + partner, night adds
     the black plate first; stock: cream on either theme; GCR / ink limit:
     day 0.2 / 2.2, night 0.12 / 2.8). See riso-press.js DEFAULTS. */
  separation: { contrast:1.08, brightness:0, saturation:1, inks:null, stock:null, opaque:null, invertSource:false,
                screen:'fm', sepShape:'chain', pitch:9, grainPitch:0.5, levels:0, sepGCR:null, sepBoost:1.15, tac:null,
                gain:0.8, linear:true, solidity:0.97, ceiling:0.98, floor:0.10, floodCap:0,
                drift:0, skew:0, stretch:0, duo:true, drumStreak:0, drumBand:0, starve:0, wet:0.25,
                pull:0, pressRun:true, fountainTo:null, proofPlate:null, proofGrey:false },
  duotone:    { contrast:1.18, balance:0.5,  shadowTint:0.18, invert:false, midInk:null, hiTint:0, splitTone:false },
  offregister:{ contrast:1.25, offset:13,    angle:47,        spread:1.25, ink3:null, ghost:0, sep:false },
  halftone:   { contrast:1.2,  dot:9,        angle:15,        shape:'circle', inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30, field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, invert:false },
  posterize:  { contrast:1.25, bands:4, bandJitter:0, toneSmooth:0, splitTone:false },
  cutout:     { contrast:1.3,  threshold:0.52, softness:0.12, invert:false, cutEdge:0, cutSlip:0, toneSmooth:0 },
  overprint:  { contrast:1.2,  offset:8,     angle:45,        split:0.16, ink3:null, fieldTexture:0, toneSmooth:0, sep:false },
  spot:       { contrast:1.2,  spotLo:0.35,  spotHi:0.65,     spotSoft:0.08, spotInvert:false, spotBase:'duotone', balance:0.5, shadowTint:0.18, spotMode:'tone', spot2:false, toneSmooth:0 },
  dither:     { contrast:1.25, ditherMode:'bayer', ditherScale:3, ditherAngle:0, invert:false, inkMode:'single', gradMode:'tone', gradA:null, gradB:null, gradAngle:90, field:'paper', fieldInk:null, fieldStrength:0.12 },
  hatch:      { contrast:1.25, hatchSpacing:9, angle:-22, hatchWeight:1, hatchCross:false, hatchWobble:0.15, inkMode:'single', toneSmooth:0, gradMode:'tone', gradA:null, gradB:null, gradAngle:90, field:'paper', fieldInk:null, fieldStrength:0.12 },
  photocopy:  { contrast:1.15, toner:0.55, copyNoise:0.35, streaks:0.25, generations:2, inkMode:'black', field:'paper', fieldInk:null, fieldStrength:0.18,
                copyEdge:0.45, copyHollow:0.35, copySatellites:0.3, copyDrum:0.06, copyDrumPeriod:150 },
  contour:    { contrast:1.2,  bands:5, contourWeight:2, contourFill:'tint', contourSmooth:2.2, contourTint:0.19, contourLine:'auto', contourInk:null, contourSlip:0, contourSlipAngle:45, contourEcho:0, contourEchoAngle:45, contourEchoInk:null },
  edges:      { contrast:1.2,  edgeDetail:0.3, edgeThick:2, edgeBackdrop:'paper', inkMode:'single', edgeSmooth:1.6, edgeClean:0, edgeInk:null, edgeWash:null, fieldInk:null, edgeEcho:0, edgeEchoAngle:45, edgeEchoInk:null, edgeSlip:0, edgeSlipAngle:45 },
  mosaic:     { contrast:1.2,  cellSize:16, mosaicDepth:4, mosaicGap:0.08, mosaicShape:'square', mosaicBond:'grid', mosaicJitter:0, mosaicGrout:'paper' },
  none:       { contrast:1.1,  brightness:0 }
};
/* ============================================================
   NAMED LOOKS — the presets you actually reach for.
   ============================================================
   A treatment like Halftone exposes fourteen dials. Nobody sets
   a poster by moving fourteen dials; you want "newsprint" or
   "coarse" and then maybe a nudge. Each look is a patch applied
   on top of the treatment's own TREAT_PRESETS baseline, so the
   dials underneath stay honest — a look is a starting point, not
   a mode, and tuning one afterwards is expected.

   `look` is stored on the element only so the chip shows which
   one you picked; nothing renders from it. */
const TREAT_LOOKS = {
  /* the press's looks — each is a real job a shop would quote */
  separation: [
    { v:'grain',   l:'Grain',        p:{ screen:'fm', inks:null, stock:null, opaque:null, drift:3, skew:5, stretch:7, starve:0.2, drumStreak:0, pull:0 } },
    { v:'four',    l:'Four colour',  p:{ screen:'fm', inks:['ink','pink','blue','yellow'], stock:null, opaque:null, tac:2.2, sepGCR:0.2, drift:0, skew:0, stretch:0, starve:0 } },
    { v:'s43',     l:'Screen 43',    p:{ screen:'am', pitch:13, levels:195, sepShape:'chain' } },
    { v:'s71',     l:'Screen 71',    p:{ screen:'am', pitch:8,  levels:72,  sepShape:'chain' } },
    { v:'night',   l:'Night',        p:{ inks:['ink','pink','blue'], stock:null, opaque:null, tac:2.8, sepGCR:0.12 } },
    { v:'kraft',   l:'On kraft',     p:{ stock:'kraft', opaque:null, inks:['ink','pink'] } },
    { v:'misfed',  l:'Mis-fed',      p:{ drift:8, skew:9, stretch:12, starve:0.35, drumStreak:0.3, pull:40 } },
    { v:'screen',  l:'Screenprint',  p:{ stock:'night', opaque:true, inks:null, drift:0, skew:0, stretch:0 } },
  ],
  duotone: [
    { v:'soft',    l:'Soft',        p:{ balance:0.5,  shadowTint:0.18, contrast:1.18, invert:false, hiTint:0 } },
    { v:'deep',    l:'Deep',        p:{ balance:0.38, shadowTint:0.34, contrast:1.38, invert:false, hiTint:0 } },
    { v:'split',   l:'Split tone',  p:{ balance:0.5,  shadowTint:0.2,  contrast:1.2,  hiTint:0.3, hiInk:null } },
    { v:'flip',    l:'Inverted',    p:{ balance:0.5,  shadowTint:0.18, contrast:1.18, invert:true } },
  ],
  halftone: [
    { v:'news',    l:'Newsprint',   p:{ dot:7,  angle:15, shape:'circle', dotGain:1.15, jitter:0,    field:'paper', inkMode:'single' } },
    { v:'coarse',  l:'Coarse',      p:{ dot:17, angle:45, shape:'circle', dotGain:1.2,  jitter:0,    field:'paper', inkMode:'single' } },
    { v:'ring',    l:'Ring screen', p:{ dot:13, angle:0,  shape:'ring',   dotGain:1,    jitter:0,    field:'paper', inkMode:'single' } },
    { v:'handset', l:'Hand-set',    p:{ dot:11, angle:22, shape:'square', dotGain:1.1,  jitter:0.45, field:'paper', inkMode:'single' } },
    { v:'twoink',  l:'Two-ink',     p:{ dot:9,  angle:15, shape:'circle', inkMode:'two', screenOffset:30, dotGain:1, jitter:0 } },
  ],
  offregister: [
    { v:'slip',    l:'Slip',        p:{ offset:8,  angle:45, spread:1.2,  ghost:0 } },
    { v:'miss',    l:'Wide miss',   p:{ offset:27, angle:20, spread:1.45, ghost:0 } },
    { v:'ghost',   l:'Double feed', p:{ offset:12, angle:47, spread:1.25, ghost:0.55 } },
  ],
  posterize: [
    { v:'four',    l:'Four bands',  p:{ bands:4, bandJitter:0,   toneSmooth:0 } },
    { v:'two',     l:'Two-tone',    p:{ bands:2, bandJitter:0,   toneSmooth:0 } },
    { v:'six',     l:'Six bands',   p:{ bands:6, bandJitter:0,   toneSmooth:1.4 } },
    { v:'torn',    l:'Torn',        p:{ bands:4, bandJitter:0.5, toneSmooth:3 } },
  ],
  cutout: [
    { v:'clean',   l:'Clean',       p:{ threshold:0.52, softness:0.04, cutEdge:0,    invert:false } },
    { v:'soft',    l:'Soft',        p:{ threshold:0.52, softness:0.3,  cutEdge:0,    invert:false } },
    { v:'outline', l:'Outlined',    p:{ threshold:0.52, softness:0.08, cutEdge:0.06, cutSlip:0, invert:false } },
    { v:'ground',  l:'Background',  p:{ threshold:0.52, softness:0.12, cutEdge:0,    invert:true } },
  ],
  overprint: [
    { v:'classic', l:'Classic',     p:{ offset:8,  angle:45, split:0.16, fieldTexture:0 } },
    { v:'wide',    l:'Wide split',  p:{ offset:14, angle:30, split:0.34, fieldTexture:0 } },
    { v:'rough',   l:'Textured',    p:{ offset:8,  angle:45, split:0.2,  fieldTexture:0.55 } },
  ],
  spot: [
    { v:'tone',    l:'Tone pop',    p:{ spotMode:'tone', spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotBase:'duotone' } },
    { v:'hue',     l:'Colour pop',  p:{ spotMode:'hue',  spotHue:340, spotHueRange:45, spotSoft:0.1, spotBase:'duotone' } },
    { v:'raw',     l:'On the photo',p:{ spotMode:'tone', spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotBase:'image' } },
  ],
  dither: [
    { v:'bayer',   l:'Bayer',       p:{ ditherMode:'bayer', ditherScale:3, ditherAngle:0 } },
    { v:'noise',   l:'Noise',       p:{ ditherMode:'noise', ditherScale:2, ditherAngle:0 } },
    { v:'coarse',  l:'Coarse',      p:{ ditherMode:'bayer', ditherScale:6, ditherAngle:0 } },
  ],
  hatch: [
    { v:'fine',    l:'Fine',        p:{ hatchSpacing:6,  hatchWeight:0.8, hatchCross:false, hatchWobble:0.1,  angle:-22 } },
    { v:'cross',   l:'Cross',       p:{ hatchSpacing:10, hatchWeight:1,   hatchCross:true,  hatchWobble:0.15, angle:-22 } },
    { v:'sketch',  l:'Sketch',      p:{ hatchSpacing:11, hatchWeight:1.4, hatchCross:false, hatchWobble:0.5,  angle:-35 } },
  ],
  photocopy: [
    { v:'clean',   l:'First gen',   p:{ toner:0.55, copyNoise:0.2,  streaks:0.12, generations:1, copyEdge:0.35, copyHollow:0.2,  copySatellites:0.12, copyDrum:0.03 } },
    { v:'worn',    l:'Third gen',   p:{ toner:0.42, copyNoise:0.45, streaks:0.35, generations:3, copyEdge:0.5,  copyHollow:0.4,  copySatellites:0.4,  copyDrum:0.08 } },
    { v:'blown',   l:'Blown out',   p:{ toner:0.75, copyNoise:0.5,  streaks:0.5,  generations:4, copyEdge:0.7,  copyHollow:0.55, copySatellites:0.55, copyDrum:0.1 } },
  ],
  contour: [
    { v:'map',     l:'Map',         p:{ bands:5, contourWeight:2,   contourFill:'tint', contourTint:0.19, contourSmooth:2.2 } },
    { v:'line',    l:'Line only',   p:{ bands:6, contourWeight:1.6, contourFill:'none', contourSmooth:2.6 } },
    { v:'bold',    l:'Bold',        p:{ bands:4, contourWeight:4,   contourFill:'tint', contourTint:0.26, contourSmooth:3 } },
  ],
  edges: [
    { v:'fine',    l:'Fine',        p:{ edgeDetail:0.22, edgeThick:1.4, edgeSmooth:1.6, edgeClean:0.2, edgeBackdrop:'paper' } },
    { v:'bold',    l:'Bold',        p:{ edgeDetail:0.4,  edgeThick:3,   edgeSmooth:2,   edgeClean:0.3, edgeBackdrop:'paper' } },
    { v:'onink',   l:'On ink',      p:{ edgeDetail:0.3,  edgeThick:2,   edgeSmooth:1.6, edgeClean:0.2, edgeBackdrop:'ink' } },
  ],
  mosaic: [
    { v:'tile',    l:'Tile',        p:{ cellSize:16, mosaicDepth:4, mosaicShape:'square', mosaicGap:0.08, mosaicBond:'grid' } },
    { v:'glass',   l:'Stained glass', p:{ cellSize:26, mosaicDepth:5, mosaicShape:'circle', mosaicGap:0.18, mosaicGrout:'ink' } },
    { v:'brick',   l:'Brick',       p:{ cellSize:20, mosaicDepth:4, mosaicShape:'square', mosaicGap:0.1,  mosaicBond:'brick' } },
  ],
};

export { TREATS, PRESS_BLENDS, FINISH_NEUTRAL, FINISH_LOOKS, TREAT_PRESETS, TREAT_LOOKS };
