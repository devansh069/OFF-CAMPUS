/**
 * Utility for validating official student college email IDs
 */

// List of popular free/personal public email provider domains to block
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.in',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'yandex.com',
  'yandex.ru',
  'mail.com',
  'email.com',
  'rediffmail.com',
  'aol.com',
]);

// Allowed educational TLD suffixes
const ALLOWED_EDUCATIONAL_SUFFIXES = [
  '.ac.in',
  '.edu',
  '.edu.in',
  '.res.in',
  '.net.in',
];

/**
 * Validates whether an email belongs to an official student college domain.
 * @param {string} email 
 * @returns {{ isValid: boolean, code: string, message: string, domain?: string }}
 */
function validateCollegeEmail(email) {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      code: 'INVALID_FORMAT',
      message: 'Please enter a valid email address.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(cleanEmail)) {
    return {
      isValid: false,
      code: 'INVALID_FORMAT',
      message: 'Please enter a valid email address format (e.g. student@iitd.ac.in).',
    };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      code: 'INVALID_FORMAT',
      message: 'Invalid email format.',
    };
  }

  const domain = parts[1];

  // 1. Check if domain is a personal/public free provider (Gmail, Yahoo, Outlook, etc.)
  if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      code: 'DISALLOWED_PUBLIC_EMAIL',
      message: `Personal email addresses (${domain}) are not permitted. Please enter your official college email ID.`,
      domain,
    };
  }

  // 2. Check if domain ends with an accepted educational suffix (.ac.in, .edu, .edu.in)
  const hasAllowedSuffix = ALLOWED_EDUCATIONAL_SUFFIXES.some(suffix => domain.endsWith(suffix));

  if (!hasAllowedSuffix) {
    return {
      isValid: false,
      code: 'INVALID_COLLEGE_DOMAIN',
      message: `The domain "@${domain}" is not a recognized college email. Your college email must end with .ac.in or .edu (e.g. student@college.ac.in).`,
      domain,
    };
  }

  return {
    isValid: true,
    code: 'OK',
    message: 'Official college email validated successfully.',
    domain,
  };
}

module.exports = {
  validateCollegeEmail,
  PUBLIC_EMAIL_DOMAINS,
  ALLOWED_EDUCATIONAL_SUFFIXES,
};
