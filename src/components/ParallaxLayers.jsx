import React, { useEffect, useState, useRef } from 'react';

/**
 * ParallaxLayers — the deepest planes of the page, in the poster language.
 *
 * Riso logic: most blocks are flat single-color rectangles ("solid"); a few
 * carry a misregistered echo — an offset outline copy of themselves, like a
 * second screen-print pass that missed ("echo"); a few are outline-only
 * ghost frames ("ghost"). Paper islands float above with hairline frames.
 * Balance over busy-ness: echoes and ghosts are rationed, everything else
 * stays flat.
 *
 * Color hierarchy: the majors (blue / yellow / red) carry the background;
 * minors appear roughly 1-in-4 as seasoning.
 */
const COLORS = {
  blue: 'var(--blue)',
  yellow: 'var(--yellow)',
  red: 'var(--red)',
  pink: 'var(--pink)',
  amber: 'var(--amber)',
  green: 'var(--green)',
  purple: 'var(--purple)',
};

// Surfaces ride the theme: paper base, paper islands.
const BASE = 'var(--bg)';
const ISLAND = 'var(--surface)';
// Flat riso down-shadows (invert to cream in Night via the tokens).
const SH = 'var(--sh-default)';

// Misregistration offset for echo blocks — straight down-right, like the
// second pass slipped on the press.
const ECHO_X = 14;
const ECHO_Y = 18;

// Grid configuration
const GRID = {
  cellSize: 120,
  gutter: 24,
  cols: 12,
};

const gridToPixel = (gridUnits) => {
  return gridUnits * (GRID.cellSize + GRID.gutter);
};

// Desktop layout. c = color, v = variant (solid | echo | ghost).
// 24 blocks: 17 majors (6 blue / 6 yellow / 5 red), 7 minors.
const ACCENT_LAYOUT = [
  { col: 0,  row: 0,  colSpan: 3, rowSpan: 2, c: 'yellow', v: 'solid' },
  { col: 4,  row: 1,  colSpan: 2, rowSpan: 3, c: 'blue',   v: 'echo'  },
  { col: 8,  row: 0,  colSpan: 4, rowSpan: 2, c: 'red',    v: 'solid' },
  { col: 1,  row: 4,  colSpan: 2, rowSpan: 2, c: 'pink',   v: 'solid' },
  { col: 6,  row: 3,  colSpan: 3, rowSpan: 2, c: 'yellow', v: 'ghost' },
  { col: 10, row: 4,  colSpan: 2, rowSpan: 3, c: 'blue',   v: 'solid' },
  { col: 0,  row: 7,  colSpan: 4, rowSpan: 2, c: 'red',    v: 'echo'  },
  { col: 5,  row: 6,  colSpan: 2, rowSpan: 2, c: 'green',  v: 'solid' },
  { col: 8,  row: 8,  colSpan: 3, rowSpan: 2, c: 'yellow', v: 'solid' },
  { col: 2,  row: 10, colSpan: 3, rowSpan: 2, c: 'blue',   v: 'solid' },
  { col: 6,  row: 11, colSpan: 2, rowSpan: 3, c: 'amber',  v: 'solid' },
  { col: 9,  row: 10, colSpan: 3, rowSpan: 2, c: 'red',    v: 'ghost' },
  { col: 0,  row: 13, colSpan: 2, rowSpan: 2, c: 'yellow', v: 'solid' },
  { col: 4,  row: 14, colSpan: 3, rowSpan: 2, c: 'blue',   v: 'echo'  },
  { col: 8,  row: 13, colSpan: 4, rowSpan: 3, c: 'purple', v: 'solid' },
  { col: 1,  row: 17, colSpan: 3, rowSpan: 2, c: 'red',    v: 'solid' },
  { col: 5,  row: 16, colSpan: 2, rowSpan: 2, c: 'yellow', v: 'ghost' },
  { col: 9,  row: 17, colSpan: 2, rowSpan: 2, c: 'blue',   v: 'solid' },
  { col: 0,  row: 20, colSpan: 4, rowSpan: 2, c: 'green',  v: 'solid' },
  { col: 6,  row: 19, colSpan: 3, rowSpan: 3, c: 'yellow', v: 'echo'  },
  { col: 10, row: 20, colSpan: 2, rowSpan: 2, c: 'red',    v: 'solid' },
  { col: 2,  row: 23, colSpan: 2, rowSpan: 2, c: 'blue',   v: 'ghost' },
  { col: 5,  row: 22, colSpan: 3, rowSpan: 2, c: 'amber',  v: 'solid' },
  { col: 9,  row: 23, colSpan: 3, rowSpan: 2, c: 'pink',   v: 'solid' },
];

const CREAM_LAYOUT = [
  { col: 0, row: 0, colSpan: 5, rowSpan: 3 },
  { col: 6, row: 0, colSpan: 6, rowSpan: 2 },
  { col: 0, row: 4, colSpan: 4, rowSpan: 3 },
  { col: 5, row: 3, colSpan: 4, rowSpan: 3 },
  { col: 10, row: 3, colSpan: 2, rowSpan: 2 },
  { col: 1, row: 8, colSpan: 5, rowSpan: 2 },
  { col: 7, row: 7, colSpan: 5, rowSpan: 3 },
  { col: 0, row: 11, colSpan: 4, rowSpan: 3 },
  { col: 5, row: 10, colSpan: 3, rowSpan: 2 },
  { col: 9, row: 11, colSpan: 3, rowSpan: 2 },
  { col: 1, row: 15, colSpan: 5, rowSpan: 2 },
  { col: 7, row: 14, colSpan: 5, rowSpan: 3 },
  { col: 0, row: 18, colSpan: 4, rowSpan: 2 },
  { col: 5, row: 17, colSpan: 4, rowSpan: 3 },
  { col: 10, row: 18, colSpan: 2, rowSpan: 2 },
  { col: 1, row: 21, colSpan: 5, rowSpan: 3 },
  { col: 7, row: 20, colSpan: 5, rowSpan: 3 },
  { col: 0, row: 24, colSpan: 6, rowSpan: 2 },
  { col: 7, row: 24, colSpan: 5, rowSpan: 2 },
];

// Mobile: simple static blocks peeking from the edges. Majors-led; one echo.
const MOBILE_ACCENTS = [
  { top: '5%',  left: '-10%',  width: '50%', height: '120px', c: 'yellow', v: 'solid' },
  { top: '15%', right: '-5%',  width: '40%', height: '100px', c: 'blue',   v: 'echo'  },
  { top: '30%', left: '-15%',  width: '45%', height: '140px', c: 'red',    v: 'solid' },
  { top: '45%', right: '-10%', width: '55%', height: '110px', c: 'blue',   v: 'ghost' },
  { top: '60%', left: '-8%',   width: '48%', height: '130px', c: 'pink',   v: 'solid' },
  { top: '75%', right: '-12%', width: '50%', height: '120px', c: 'yellow', v: 'solid' },
  { top: '88%', left: '-5%',   width: '42%', height: '100px', c: 'green',  v: 'solid' },
];

// One background block in its riso variant. `box` carries position/size
// styles; the variant decides fills, frames, and the misregistered echo.
function RisoBlock({ box, c, v }) {
  const color = COLORS[c] || COLORS.blue;

  if (v === 'ghost') {
    return (
      <div
        className="absolute"
        style={{
          ...box,
          backgroundColor: 'transparent',
          border: `3px solid ${color}`,
          boxShadow: 'var(--sh-light)',
        }}
      />
    );
  }

  if (v === 'echo') {
    return (
      <div className="absolute" style={box}>
        {/* the slipped second pass — outline copy, down-right */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${ECHO_X}px, ${ECHO_Y}px)`,
            border: `3px solid ${color}`,
            opacity: 0.65,
          }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: color, boxShadow: SH }}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute"
      style={{ ...box, backgroundColor: color, boxShadow: SH }}
    />
  );
}

export default function ParallaxLayers() {
  const [scrollY, setScrollY] = useState(0);
  const [pageHeight, setPageHeight] = useState(5000);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);

  const speeds = {
    accentLayer: 0.08,
    creamLayer: 0.18,
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const updatePageHeight = () => {
      setPageHeight(document.documentElement.scrollHeight);
    };

    const onResize = () => {
      checkMobile();
      updatePageHeight();
    };

    checkMobile();
    updatePageHeight();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // ResizeObserver fires when <body> actually changes height (lazy images
    // loading, font swap, calendar hydrating, etc.).
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updatePageHeight());
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
    };
  }, []);

  const layerHeight = pageHeight * 1.3;

  // Mobile: Simple static background
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: -1 }}
      >
        {/* Paper base */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: BASE }}
        />

        {/* Accent blocks peeking from the edges */}
        {MOBILE_ACCENTS.map((block, i) => (
          <RisoBlock
            key={`mobile-accent-${i}`}
            box={{
              top: block.top,
              left: block.left,
              right: block.right,
              width: block.width,
              height: block.height,
            }}
            c={block.c}
            v={block.v}
          />
        ))}
      </div>
    );
  }

  // Desktop: Full parallax system
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {/* Layer 4 (bottom): Full paper base */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: BASE }}
      />

      {/* Layer 3: riso color planes — gridded, mostly flat, a few echoes */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${-scrollY * speeds.accentLayer}px) translateZ(0)`,
          willChange: 'transform',
          height: layerHeight,
        }}
      >
        {ACCENT_LAYOUT.map((rect, i) => (
          <RisoBlock
            key={`accent-${i}`}
            box={{
              left: gridToPixel(rect.col),
              top: gridToPixel(rect.row),
              width: gridToPixel(rect.colSpan) - GRID.gutter,
              height: gridToPixel(rect.rowSpan) - GRID.gutter,
            }}
            c={rect.c}
            v={rect.v}
          />
        ))}
      </div>

      {/* Layer 2: paper islands — printed sheets with hairline frames */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${-scrollY * speeds.creamLayer}px) translateZ(0)`,
          willChange: 'transform',
          height: layerHeight,
        }}
      >
        {CREAM_LAYOUT.map((island, i) => (
          <div
            key={`cream-${i}`}
            className="absolute"
            style={{
              left: gridToPixel(island.col),
              top: gridToPixel(island.row),
              width: gridToPixel(island.colSpan) - GRID.gutter,
              height: gridToPixel(island.rowSpan) - GRID.gutter,
              backgroundColor: ISLAND,
              border: '2px solid var(--hairline)',
              boxShadow: SH,
            }}
          />
        ))}
      </div>
    </div>
  );
}
