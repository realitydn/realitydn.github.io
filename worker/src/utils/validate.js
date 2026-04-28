/**
 * Validation utilities for form submissions
 */

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateHoneypot(honeypotValue) {
  // Honeypot field should be empty; if it has a value, reject the submission
  return !honeypotValue || honeypotValue.trim() === '';
}

export function validateEventProposalPayload(data) {
  const errors = [];

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
