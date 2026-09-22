// Room rental rate card — per hour, thousands of VND (₫). null = that room is
// closed in that slot (the patio closes at midnight). Room ids and slot ids
// match the locale keys infoHost.pricing.spaces.* / slots.* / slotsLabel.*.
//
// NOTE: InfoHostSection.jsx's PricingTable still carries its own copy of this
// table; the FAQ JSON-LD (App.jsx) and the llms files (scripts/
// build-seo-files.mjs) read this one. Change both together until the table
// imports from here.
export const RATE_SLOTS = ['day', 'peak', 'night'];

export const ROOM_RATES = [
  { id: '2e', rates: { day: 300, peak: 500, night: 200 } },
  { id: '2l', rates: { day: 250, peak: 250, night: 200 } },
  { id: '1l', rates: { day: 200, peak: 200, night: 150 } },
  { id: '3p', rates: { day: 150, peak: 200, night: null } },
];
