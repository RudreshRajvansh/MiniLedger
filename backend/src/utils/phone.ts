/**
 * Normalizes Indian phone numbers to E.164 format (+91XXXXXXXXXX).
 *
 * Accepts:
 *   "9876543210"      → "+919876543210"
 *   "+919876543210"   → "+919876543210"
 *   "919876543210"    → "+919876543210"
 *
 * Returns null if the input is not a valid 10-digit Indian mobile number.
 */
export function normalizePhone(raw: string): string | null {
  // Strip all whitespace, dashes, and dots
  const cleaned = raw.replace(/[\s\-().]/g, '');

  let digits: string;

  if (cleaned.startsWith('+91')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    digits = cleaned.slice(2);
  } else {
    digits = cleaned;
  }

  // Indian mobile numbers: exactly 10 digits, starting with 6-9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return null;
  }

  return `+91${digits}`;
}
