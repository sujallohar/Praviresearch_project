/**
 * Form and Email Validation Utility for GovAsset 360
 * Prevents dummy/malformed emails, validates domains, and ensures data hygiene.
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates email addresses against standard RFC 5322 structure,
 * verifies proper domain extensions (TLD), and rejects bogus numeric-only domains.
 */
export const isValidEmail = (emailStr: string): ValidationResult => {
  const email = emailStr.trim().toLowerCase();
  
  if (!email) {
    return { valid: false, reason: 'Email address is required.' };
  }

  // 1. General RFC 5322 regex
  const generalRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!generalRegex.test(email)) {
    return { 
      valid: false, 
      reason: 'Please enter a valid email format (e.g., name@organization.gov or name@domain.com).' 
    };
  }

  // 2. Separate local part and domain
  const parts = email.split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Email must contain exactly one "@" character.' };
  }

  const [localPart, domain] = parts;
  if (localPart.length < 2 || localPart.length > 64) {
    return { valid: false, reason: 'Email username must be between 2 and 64 characters long.' };
  }

  // 3. Domain segment analysis
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { valid: false, reason: 'Email must contain a complete domain and extension.' };
  }

  const tld = domainParts[domainParts.length - 1];
  // TLD must only be letters, minimum 2 characters (e.g. com, gov, in, org, io, net)
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return { 
      valid: false, 
      reason: `The domain extension ".${tld}" is invalid. Top-level domains must contain only alphabetic characters.` 
    };
  }

  // 4. Reject numeric-only domain labels (e.g., 34234.com, 12345.net)
  const mainDomain = domainParts[domainParts.length - 2];
  if (/^\d+$/.test(mainDomain)) {
    return { 
      valid: false, 
      reason: `Invalid email domain "${mainDomain}.${tld}". Numeric-only domains are not permitted.` 
    };
  }

  // 5. Reject common disposable test prefixes if needed or invalid characters
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, reason: 'Email address cannot start or end with a period.' };
  }

  return { valid: true };
};
