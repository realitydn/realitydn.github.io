// The hero's photos (Donald 5.10.26: "the hero should still be the pic of the
// front. We'll get more pics of the space to do an auto-forward carousel").
//
// The FIRST photo is the one that always shows first — it's the page's LCP
// image (index.html preloads it) and what the prerender captures, so keep the
// front of the building there. Add more below and the hero becomes an
// auto-advancing carousel by itself (HeroPhotos.jsx): a new photo every 6s,
// paused on hover/focus, never moving under reduced motion, with a pause
// button and dots. With one photo it is just the photo.
//
// Files go in public/images/. Portrait or landscape both work — the frame is
// 4:5 on phones, 5:4 on tablets, 4:3 on desktop, and each photo is cropped to
// fill it (object-fit: cover), so keep the subject near the centre. ~1600px on
// the long edge, JPEG, under ~300 KB. `alt` says what's in the picture.
export const HERO_PHOTOS = [
  {
    src: '/images/hero.jpg',
    alt: 'The front of REALITY at 86 Mai Thúc Lân, Đà Nẵng — the REALITY sign over a pink shopfront under the trees',
    width: 800,
    height: 1067,
  },
];
