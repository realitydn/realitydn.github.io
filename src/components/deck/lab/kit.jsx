import React, { createContext, useEffect, useState } from 'react';

// The small shared pieces of the card-motion variants.

// What the lab page hands every face on it.
//   demoNow  null = the real clock; a timestamp = "show the building at this
//            moment" (the busiest hour in the feed), so the rooms can be
//            judged at any time of day
export const LabCtx = createContext({ demoNow: null });

// useSteps(beat, n, ms) — after each beat, walk 0 → n-1, one step every `ms`.
// At rest (and before the first beat) it is n-1: the finished state.
export function useSteps(beat, n, ms = 240) {
  const [k, setK] = useState(n - 1);
  useEffect(() => {
    if (!beat || n < 2) {
      setK(n - 1);
      return undefined;
    }
    let i = 0;
    setK(0);
    const id = window.setInterval(() => {
      i += 1;
      setK(i);
      if (i >= n - 1) window.clearInterval(id);
    }, ms);
    return () => window.clearInterval(id);
  }, [beat, n, ms]);
  return Math.min(k, n - 1);
}

// Odo — SCORE COUNT: columns that roll like an odometer and pop as they land.
//   cols  one entry per character: a string (it stays put) or an array of the
//         characters that column rolls through, ending on the one that stays
//   beat  0 = the still (just the final characters); each new beat rolls once
// Screen readers get the final text once; the rolling columns are decoration.
export function Odo({ cols, beat, step = 70, dur = 760, className = '' }) {
  const final = cols.map((c) => (Array.isArray(c) ? c[c.length - 1] : c)).join('');
  if (!beat) return <span className={className}>{final}</span>;
  let rolling = 0;
  const cells = cols.map((c, i) => {
    if (!Array.isArray(c) || c.length < 2) {
      return <span key={i} className="dkm-odo-c"><span>{Array.isArray(c) ? c[0] : c}</span></span>;
    }
    const delay = rolling * step;
    rolling += 1;
    return (
      <span key={i} className="dkm-odo-c">
        <span
          key={beat}
          className="dkm-odo-s"
          style={{ '--n': c.length - 1, animationDuration: `${dur}ms`, animationDelay: `${delay}ms` }}
        >
          {c.map((ch, j) => <span key={j}>{ch}</span>)}
        </span>
      </span>
    );
  });
  const landed = dur + Math.max(0, rolling - 1) * step;
  return (
    <span className={className}>
      <span className="sr-only">{final}</span>
      <span key={beat} className="dkm-odo" aria-hidden="true" style={{ animationDelay: `${landed - 40}ms` }}>
        {cells}
      </span>
    </span>
  );
}

// countCols('1578', '1601') → the columns for Odo: a digit that changes rolls
// UP through every digit between (7 → 8 → 9 → 0), one that doesn't stays put.
export function countCols(from, to) {
  const a = String(from).padStart(String(to).length, ' ');
  return String(to).split('').map((ch, i) => {
    const f = a[i];
    if (f === ch || !/\d/.test(ch) || !/\d/.test(f)) return ch;
    const seq = [f];
    let d = Number(f);
    while (String(d) !== ch) {
      d = (d + 1) % 10;
      seq.push(String(d));
    }
    return seq;
  });
}

// A heart cut from squares — a glyph (it keeps its own colour), drawn hard-
// edged like everything else here rather than borrowed from a font.
export function PixelHeart({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 7 6" aria-hidden="true" shapeRendering="crispEdges">
      <path fill="currentColor" d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z" />
    </svg>
  );
}
