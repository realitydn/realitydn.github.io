import React from 'react';
import Logo from './Logo';

// Night v2 "Cream Tickets" (handoff 5.10.26; both themes since round 2) — the
// small shared pieces of a ticket. The ticket itself is CSS (.tkt in
// index.css): any element can be one. These are the bits with markup.

// The REALITY logo box — mandatory on a ticket's photo slot when the slot
// shows the riso placeholder instead of a poster. Ink box, cream mark. The
// handoff draws it as live Montserrat Alternates text; this uses the baked
// wordmark vector instead (canon: the wordmark is never re-typeset from a
// web font — Logo.jsx).
export function LogoBox({ className = '' }) {
  return (
    <span className={`tkt-logo ${className}`} aria-hidden="true">
      <Logo className="tkt-logo-mark" color="#fffbf1" />
    </span>
  );
}

// The photo slot: riso stripes on cream, the event's poster at its NATIVE
// 4:5 centred on them (never cropped to the slot), else the logo box.
export function TicketPhoto({ img, alt, className = '' }) {
  return (
    <span className={`tkt-photo ${className}`}>
      {img ? (
        <img
          className="tkt-photo-img"
          src={img}
          alt={alt}
          loading="eager"
          decoding="async"
        />
      ) : (
        <LogoBox />
      )}
    </span>
  );
}
