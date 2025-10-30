// Utility functions for phone number normalization and formatting
// Supports Malaysian numbers primarily, with simple country code handling.

export type CountryCode = "+60" | "+65" | "+62" | string;

export interface ParsedPhone {
  countryCode: "+60" | "+65";
  national: string;
}

// Keep only digits
export const digitsOnly = (input: string) => (input || "").replace(/\D+/g, "");

// Normalize to E.164-like string with leading +countryCode
export function normalizePhone(input: string, countryCode: CountryCode = "+60"): string {
  const cc = countryCode.replace(/[^\d+]/g, ""); // Remove everything except digits and +
  const digits = digitsOnly(input);

  // Trust embedded country codes: if digits start with 60 or 65, use them directly
  if (digits.startsWith("60") || digits.startsWith("65")) {
    return `+${digits}`;
  }

  const ccNoPlus = cc.replace("+", "");

  // Handle local formats starting with 0 (e.g., 01112345678 => +60 1112345678)
  if (digits.startsWith("0")) {
    return `${cc}${digits.slice(1)}`;
  }

  // For Malaysian numbers: if 9-11 digits starting with "1" (e.g., 1111229611) and cc is +60
  if (cc === "+60" && digits.length >= 9 && digits.length <= 11 && digits.startsWith("1")) {
    return `${cc}${digits}`;
  }

  // Default: prepend country code
  return `${cc}${digits}`;
}

// Generate common variants to improve matching against previously stored values
export function generatePhoneVariants(input: string, countryCode: CountryCode = "+60"): string[] {
  const cc = countryCode.replace(/[^\d+]/g, ""); // Remove everything except digits and +
  const ccNoPlus = cc.replace("+", "");
  const digits = digitsOnly(input);

  const normalized = normalizePhone(input, countryCode); // +601112345678
  const noPlus = normalized.replace("+", "");           // 601112345678

  // Local form starting with 0
  let local = digits;
  if (digits.startsWith(ccNoPlus)) {
    local = `0${digits.slice(ccNoPlus.length)}`; // 01112345678
  } else if (!digits.startsWith("0")) {
    // Assume provided is local without 0
    local = `0${digits}`;
  }

  // Add variant with + prefix and raw digits to catch wrongly stored numbers (e.g., +1111229611)
  const plusDigits = `+${digits}`;

  // Unique list
  const set = new Set([normalized, noPlus, local, digits, plusDigits]);
  return Array.from(set).filter(Boolean);
}

// Format for display. For Malaysia (default), prefer +60 11-1234 5678 style for 011 prefix
export function formatDisplayPhone(e164: string, countryCode: CountryCode = "+60"): string {
  const cc = countryCode;
  const ccNoPlus = cc.replace("+", "");
  const digits = digitsOnly(e164);
  let national = digits.startsWith(ccNoPlus) ? digits.slice(ccNoPlus.length) : digits;

  // Special handling for Malaysia
  if (cc === "+60") {
    // 011 numbers typically 11 digits total after 0, i.e., 011-xxxx xxxx
    if (national.startsWith("11") && national.length >= 8) {
      const a = national.slice(0, 2); // 11
      const b = national.slice(2, 6); // 1234
      const c = national.slice(6);    // 5678
      return `+60 ${a}-${b} ${c}`.trim();
    }
    // Fallback grouping: XX-XXXX XXXX
    if (national.length >= 8) {
      const a = national.slice(0, 2);
      const b = national.slice(2, 6);
      const c = national.slice(6);
      return `+60 ${a}-${b} ${c}`.trim();
    }
  }

// Generic fallback: +CC [chunks of 3-4]
  if (national.length > 0) {
    return `+${ccNoPlus} ${national}`;
  }
  return e164;
}

/**
 * Parse an E.164 phone number into country code and national number
 * @param e164 - Phone number in E.164 format (e.g., "+6512345678")
 * @returns Parsed country code and national number
 */
export function parseE164(e164: string): ParsedPhone {
  const phone = (e164 || "").trim();
  
  if (!phone.startsWith("+")) {
    // If no leading +, assume +60
    return {
      countryCode: "+60",
      national: phone.replace(/\D/g, ""),
    };
  }
  
  // Check for known country codes
  if (phone.startsWith("+65")) {
    return {
      countryCode: "+65",
      national: phone.slice(3), // Everything after +65
    };
  }
  
  if (phone.startsWith("+60")) {
    return {
      countryCode: "+60",
      national: phone.slice(3), // Everything after +60
    };
  }
  
  // Unknown country code - default to +60 but keep all digits
  return {
    countryCode: "+60",
    national: phone.slice(1), // Remove + but keep all digits
  };
}

/**
 * Combined normalize and parse for consistency
 * @param input - Raw phone input
 * @param selectedCode - Selected country code from UI
 * @returns Both normalized E.164 and parsed components
 */
export function normalizeAndParse(input: string, selectedCode: "+60" | "+65") {
  const normalized = normalizePhone(input, selectedCode);
  const parsed = parseE164(normalized);
  return { normalized, ...parsed };
}
