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
    'schedule',
    'duration',
    'cost',
    'language',
    'space',
    'equipment'
  ];

  const missingErrors = validateRequired(data, requiredFields);
  errors.push(...missingErrors);

  // Validate email format
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // Validate arrays
  if (!Array.isArray(data.language) || data.language.length === 0) {
    errors.push('Language must be a non-empty array');
  }
  if (!Array.isArray(data.space) || data.space.length === 0) {
    errors.push('Space must be a non-empty array');
  }
  if (!Array.isArray(data.equipment) || data.equipment.length === 0) {
    errors.push('Equipment must be a non-empty array');
  }

  // Check honeypot
  if (!validateHoneypot(data.honeypot)) {
    errors.push('Honeypot validation failed');
  }

  return errors;
}

export function validateArtExhibitionPayload(data) {
  const errors = [];

  // Check required fields
  const requiredFields = [
    'email',
    'name',
    'location',
    'contact',
    'bio',
    'portfolioLink',
    'showConcept',
    'spaceScale',
    'preferredDates',
    'flexibility',
    'groupShow'
  ];

  const missingErrors = validateRequired(data, requiredFields);
  errors.push(...missingErrors);

  // Validate email format
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // Validate portfolio link is a URL
  if (data.portfolioLink && !isValidUrl(data.portfolioLink)) {
    errors.push('Portfolio link must be a valid URL');
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
