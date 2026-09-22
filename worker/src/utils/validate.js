/**
 * Validation utilities for form submissions
 */

/*
 * Field length caps.
 *
 * Two jobs: keep this public endpoint from being a free "send any wall of text
 * from hello@realitydn.com" service, and keep every value inside what the
 * downstream APIs accept. Notion rejects a rich_text/title block over 2000
 * characters with a 400, which createNotionPage turns into a 500 — and because
 * the site fires this backup and forgets it, that silently lost the Notion copy
 * of any long pitch.
 *
 * So over-long values are CLAMPED (clampPayload), not rejected: a real person
 * who writes a long description still gets a backup copy, just trimmed. Only
 * payloads far past any human form (HARD_LIMIT_FACTOR × the cap) are refused
 * outright as abuse. Long text is capped at Notion's own block limit, so it
 * always fits a single rich_text block.
 */
export const MAX_SHORT = 200;   // names, contact, titles, select values
export const MAX_LONG = 2000;   // free text — Notion's per-block maximum
export const MAX_EMAIL = 254;   // RFC 5321 path limit
export const MAX_URL = 1000;    // portfolio link — Notion url props cap at 2000
export const MAX_ARRAY_ITEMS = 20;
export const MAX_ARRAY_ITEM = 100; // Notion select/multi_select option names cap at 100
const HARD_LIMIT_FACTOR = 5;

// Free-text fields across both forms; anything else string-valued is "short".
const LONG_FIELDS = new Set([
  // event proposal
  'eventDescription',
  'daysAndTimes',
  'duration',
  'eventCost',
  'anythingElse',
  // art exhibition
  'basedWhere',
  'artistBio',
  'showDescription',
  'spaceAmount',
  'technicalNeeds',
  'preferredDate',
  'curatorInfo',
]);

function capFor(field) {
  if (field === 'email') return MAX_EMAIL;
  if (field === 'workLink') return MAX_URL;
  return LONG_FIELDS.has(field) ? MAX_LONG : MAX_SHORT;
}

function clampString(value, max) {
  // Array.from splits by code point, so a Vietnamese diacritic or an emoji is
  // never cut in half. The ellipsis counts toward the cap.
  const chars = Array.from(value);
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : value;
}

/**
 * Return a copy of the payload with every string trimmed to its cap and every
 * array reduced to at most MAX_ARRAY_ITEMS strings of MAX_ARRAY_ITEM chars.
 * Run AFTER validation (which has already refused wrong types and absurd
 * sizes). Everything downstream — Notion, Sheets, the email — sees only the
 * clamped copy.
 */
export function clampPayload(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      out[key] = clampString(value, capFor(key));
    } else if (Array.isArray(value)) {
      out[key] = value
        .filter((v) => typeof v === 'string')
        .slice(0, MAX_ARRAY_ITEMS)
        .map((v) => clampString(v, MAX_ARRAY_ITEM));
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Type + size checks shared by both forms. Every field the forms send is a
 * string or an array of strings; anything else (objects, nested arrays) is not
 * something our own form can produce, so it's refused rather than coerced.
 */
export function validateShapeAndLength(data) {
  const errors = [];
  for (const [key, value] of Object.entries(data)) {
    if (value == null || typeof value === 'number' || typeof value === 'boolean') continue;
    if (typeof value === 'string') {
      if (value.length > capFor(key) * HARD_LIMIT_FACTOR) {
        errors.push(`Field too long: ${key}`);
      }
    } else if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_ITEMS * HARD_LIMIT_FACTOR) {
        errors.push(`Too many values: ${key}`);
      } else if (value.some((v) => typeof v !== 'string' || v.length > MAX_ARRAY_ITEM * HARD_LIMIT_FACTOR)) {
        errors.push(`Invalid values in: ${key}`);
      }
    } else {
      errors.push(`Invalid type for field: ${key}`);
    }
  }
  return errors;
}

export function validateRequired(data, requiredFields) {
  const errors = [];
  for (const field of requiredFields) {
    if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  return errors;
}

export function validateEmail(email) {
  // This address is where the confirmation email is SENT, so it must be exactly
  // one plain address: a string, sane length, no whitespace, and none of the
  // characters that let a mail API read it as a list or a display-name form
  // ("a@x.com, b@y.com", "Name <a@x.com>").
  if (typeof email !== 'string' || email.length > MAX_EMAIL) return false;
  const emailRegex = /^[^\s@<>,;:"()[\]\\]+@[^\s@<>,;:"()[\]\\]+\.[^\s@<>,;:"()[\]\\]+$/;
  return emailRegex.test(email);
}

export function validateHoneypot(honeypotValue) {
  // Honeypot field should be empty; if it has a value, reject the submission.
  // String() so a non-string honeypot can't throw on .trim() and 500 the request.
  return !honeypotValue || String(honeypotValue).trim() === '';
}

export function validateEventProposalPayload(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['Payload must be a JSON object'];
  }

  errors.push(...validateShapeAndLength(data));

  // Check required fields
  const requiredFields = [
    'email',
    'hostName',
    'contact',
    'eventDescription',
    'recurrence',
    'daysAndTimes',
    'duration',
    'eventCost',
    'languages',
    'preferredSpace',
  ];

  const missingErrors = validateRequired(data, requiredFields);
  errors.push(...missingErrors);

  // Validate email format
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // Validate arrays
  if (!Array.isArray(data.languages) || data.languages.length === 0) {
    errors.push('Languages must be a non-empty array');
  }
  if (!Array.isArray(data.preferredSpace) || data.preferredSpace.length === 0) {
    errors.push('Preferred space must be a non-empty array');
  }

  // Check honeypot
  if (!validateHoneypot(data.honeypot)) {
    errors.push('Honeypot validation failed');
  }

  return errors;
}

export function validateArtExhibitionPayload(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['Payload must be a JSON object'];
  }

  errors.push(...validateShapeAndLength(data));

  // Check required fields — names must match the React form's state keys
  const requiredFields = [
    'email',
    'name',
    'basedWhere',
    'contact',
    'artistBio',
    'workLink',
    'showDescription',
    'spaceAmount',
    'preferredDate',
    'flexibility',
    'isGroupShow'
  ];

  const missingErrors = validateRequired(data, requiredFields);
  errors.push(...missingErrors);

  // Validate email format
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // Check honeypot
  if (!validateHoneypot(data.honeypot)) {
    errors.push('Honeypot validation failed');
  }

  return errors;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
