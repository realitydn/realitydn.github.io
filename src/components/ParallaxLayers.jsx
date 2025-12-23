import React, { useEffect, useState, useRef } from 'react';

// Official REALITY color palette
const ACCENT_COLORS = [
  '#E72D33', // red
  '#FD9D32', // orange
  '#FFE527', // yellow
  '#00AB4D', // green
  '#00AB8D', // teal
  '#0077A3', // blue
  '#403785', // purple
  '#A93397', // magenta
  '#E92775', // pink
];

const CREAM = '#FFFBF1';
const INK = '#0D0906';

// Grid configuration
const GRID = {
  cellSize: 120,
  gutter: 24,
  cols: 12,
};

const gridToPixel = (gridUnits) => {
  return gridUnits * (GRID.cellSize + GRID.gutter);
};

// Desktop: Full parallax layout
const ACCENT_LAYOUT = [
  { col: 0, row: 0, colSpan: 3, rowSpan: 2, colorIndex: 1 },
  { col: 4, row: 1, colSpan: 2, rowSpan: 3, colorIndex: 5 },
  { col: 8, row: 0, colSpan: 4, rowSpan: 2, colorIndex: 3 },
  { col: 1, row: 4, colSpan: 2, rowSpan: 2, colorIndex: 8 },
  { col: 6, row: 3, colSpan: 3, rowSpan: 2, colorIndex: 2 },
  { col: 10, row: 4, colSpan: 2, rowSpan: 3, colorIndex: 6 },
  { col: 0, row: 7, colSpan: 4, rowSpan: 2, colorIndex: 4 },
  { col: 5, row: 6, colSpan: 2, rowSpan: 2, colorIndex: 0 },
  { col: 8, row: 8, colSpan: 3, rowSpan: 2, colorIndex: 3 },
  { col: 2, row: 10, colSpan: 3, rowSpan: 2, colorIndex: 7 },
  { col: 6, row: 11, colSpan: 2, rowSpan: 3, colorIndex: 1 },
  { col: 9, row: 10, colSpan: 3, rowSpan: 2, colorIndex: 5 },
  { col: 0, row: 13, colSpan: 2, rowSpan: 2, colorIndex: 3 },
  { col: 4, row: 14, colSpan: 3, rowSpan: 2, colorIndex: 8 },
  { col: 8, row: 13, colSpan: 4, rowSpan: 3, colorIndex: 2 },
  { col: 1, row: 17, colSpan: 3, rowSpan: 2, colorIndex: 4 },
  { col: 5, row: 16, colSpan: 2, rowSpan: 2, colorIndex: 6 },
  { col: 9, row: 17, colSpan: 2, rowSpan: 2, colorIndex: 0 },
  { col: 0, row: 20, colSpan: 4, rowSpan: 2, colorIndex: 3 },
  { col: 6, row: 19, colSpan: 3, rowSpan: 3, colorIndex: 7 },
  { col: 10, row: 20, colSpan: 2, rowSpan: 2, colorIndex: 1 },
  { col: 2, row: 23, colSpan: 2, rowSpan: 2, colorIndex: 5 },
  { col: 5, row: 22, colSpan: 3, rowSpan: 2, colorIndex: 8 },
  { col: 9, row: 23, colSpan: 3, rowSpan: 2, colorIndex: 4 },
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

// Mobile: Simple static accent blocks (no parallax)
const MOBILE_ACCENTS = [
  { top: '5%', left: '-10%', width: '50%', height: '120px', colorIndex: 1 },
  { top: '15%', right: '-5%', width: '40%', height: '100px', colorIndex: 4 },
  { top: '30%', left: '-15%', width: '45%', height: '140px', colorIndex: 6 },
  { top: '45%', right: '-10%', width: '55%', height: '110px', colorIndex: 2 },
  { top: '60%', left: '-8%', width: '48%', height: '130px', colorIndex: 8 },
  { top: '75%', right: '-12%', width: '50%', height: '120px', colorIndex: 3 },
  { top: '88%', left: '-5%', width: '42%', height: '100px', colorIndex: 5 },
];

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
      if (!isMobile) {
        setScrollY(window.scrollY);
      }
    };
    
    const updatePageHeight = () => {
      setPageHeight(document.documentElement.scrollHeight);
    };
    
    checkMobile();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      checkMobile();
      updatePageHeight();
    });
    updatePageHeight();
    
    const interval = setInterval(updatePageHeight, 1000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
      clearInterval(interval);
    };
  }, [isMobile]);
  
  const layerHeight = pageHeight * 1.3;
  
  // Mobile: Simple static background
  if (isMobile) {
    return (
      <div 
        ref={containerRef}
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: -1 }}
      >
        {/* Cream base */}
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: CREAM }}
        />
        
        {/* Simple accent blocks peeking from edges */}
        {MOBILE_ACCENTS.map((block, i) => (
          <div
            key={`mobile-accent-${i}`}
            className="absolute"
            style={{
              top: block.top,
              left: block.left,
              right: block.right,
              width: block.width,
              height: block.height,
              backgroundColor: ACCENT_COLORS[block.colorIndex],
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}
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
      {/* Layer 4 (bottom): Full cream base */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: CREAM }}
      />
      
      {/* Layer 3: Accent color rectangles - gridded, with shadows */}
      <div 
        className="absolute inset-0"
        style={{ 
          transform: `translateY(${-scrollY * speeds.accentLayer}px) translateZ(0)`,
          willChange: 'transform',
          height: layerHeight,
        }}
      >
        {ACCENT_LAYOUT.map((rect, i) => (
          <div
            key={`accent-${i}`}
            className="absolute"
            style={{
              left: gridToPixel(rect.col),
              top: gridToPixel(rect.row),
              width: gridToPixel(rect.colSpan) - GRID.gutter,
              height: gridToPixel(rect.rowSpan) - GRID.gutter,
              backgroundColor: ACCENT_COLORS[rect.colorIndex],
              boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            }}
          />
        ))}
      </div>
      
      {/* Layer 2: Cream islands - gridded, with shadows */}
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
              backgroundColor: CREAM,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
