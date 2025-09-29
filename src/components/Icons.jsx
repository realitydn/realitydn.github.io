import React from 'react';

const S = 1.9, LC = "round", LJ = "round";

const Svg = ({ label, size = 22, color = "#111", children }) => (
  <svg 
    role="img" 
    aria-label={label} 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth={S} 
    strokeLinecap={LC} 
    strokeLinejoin={LJ}
  >
    {children}
  </svg>
);

export const Icons = {
  laptop: (c = "#111") => (
    <Svg label="Laptop" color={c}>
      <rect x="3" y="5" width="18" height="12" rx="2"/>
      <path d="M2 19h20"/>
    </Svg>
  ),
  
  info: (c = "#111") => (
    <Svg label="Info" color={c}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 10v6"/>
      <path d="M12 7h.01"/>
    </Svg>
  ),
  
  pin: (c = "#111") => (
    <Svg label="Location" color={c}>
      <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </Svg>
  ),
  
  instagram: (c = "#111") => (
    <Svg label="Instagram" color={c}>
      <rect x="3" y="3" width="18" height="18" rx="4"/>
      <circle cx="12" cy="12" r="4"/>
      <path d="M16.5 7.5h.01"/>
    </Svg>
  ),
  
  whatsapp: (c = "#111") => (
    <Svg label="WhatsApp" color={c}>
      <rect x="3" y="3" width="18" height="18" rx="4"/>
      <path d="M9.5 9.2c.3-1 2-1.2 2.7-.2l.5.7c.2.3.2.7-.1 1l-.7.6c.8 1.2 1.8 2.2 3 3l.6-.7c.3-.3.7-.3 1 0l.7.5c1 .7.8 2.4-.2 2.7-1.7.6-4.6-.6-6.8-2.8-2.2-2.2-3.4-5.1-2.8-6.8z"/>
    </Svg>
  ),
  
  facebook: (c = "#111") => (
    <Svg label="Facebook" color={c}>
      <rect x="3" y="3" width="18" height="18" rx="4"/>
      <path d="M13 8h2v3h-2v7h-3v-7H8V8h2V7a3 3 0 0 1 3-3h2v3h-2a1 1 0 0 0-1 1z"/>
    </Svg>
  ),
  
  people: (c = "#111") => (
    <Svg label="People" color={c}>
      <path d="M8 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
      <path d="M16 13a3 3 0 1 0-3-3"/>
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5"/>
      <path d="M15 16c2 0 6 1 6 4"/>
    </Svg>
  ),
  
  buy: (c = "#111") => (
    <Svg label="Buy" color={c}>
      <path d="M6 6h14l-1.5 8H8L6 4H3"/>
      <circle cx="9" cy="20" r="1.5"/>
      <circle cx="17" cy="20" r="1.5"/>
    </Svg>
  ),
  
  lightbulb: (c = "#111") => (
    <Svg label="Ideas" color={c}>
      <path d="M12 2a6 6 0 0 1 6 6c0 2.2-1.2 3.8-2.8 4.9L15 15h-6l-.2-2.1A6 6 0 0 1 6 8a6 6 0 0 1 6-6z"/>
      <path d="M10 19h4M9 22h6"/>
    </Svg>
  ),
  
  rules: (c = "#111") => (
    <Svg label="Rules" color={c}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M7 7l10 10"/>
      <path d="M9 15l6-6"/>
    </Svg>
  ),
  
  smoke: (c = "#111") => (
    <Svg label="Smoking" color={c}>
      <path d="M17 12H3M20 16v-4M23 16v-4"/>
      <path d="M7 12v4M11 12v4"/>
    </Svg>
  ),
  
  menu: (c = "#111") => (
    <Svg label="Menu" color={c}>
      <path d="M3 12h18M3 6h18M3 18h18"/>
    </Svg>
  ),
  
  close: (c = "#111") => (
    <Svg label="Close" color={c}>
      <path d="M6 6l12 12M6 18L18 6"/>
    </Svg>
  ),
  
  arrow: (c = "#111", direction = "right") => {
    const paths = {
      right: "M5 12h14M13 6l6 6-6 6",
      left: "M19 12H5M11 18l-6-6 6-6",
      down: "M12 5v14M6 13l6 6 6-6",
      up: "M12 19V5M6 11l6-6 6 6"
    };
    return (
      <Svg label={`Arrow ${direction}`} color={c}>
        <path d={paths[direction]}/>
      </Svg>
    );
  }
};