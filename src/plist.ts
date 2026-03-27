import plist from "plist";
import { PlistParseError } from "./errors.js";

/**
 * Parse an XML plist string into a JavaScript value.
 */
export function parsePlist(xml: string): unknown {
  try {
    return plist.parse(xml);
  } catch (e) {
    throw new PlistParseError(
      e instanceof Error ? e.message : "Invalid XML plist",
    );
  }
}

/**
 * Format a Date or ISO string into YYYY-MM-DD. Returns undefined for
 * falsy, invalid, or unrecognised values.
 */
export function formatDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return undefined;
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "string") return value.split("T")[0];
  return undefined;
}

const IBAN_RE = /^[A-Z]{2}\d/;
const ACCOUNT_NUMBER_RE = /^\d[\d\s\-\/]{6,}/;
const CARD_PREFIX_RE = /^\d{4}/;
const NON_DIGIT_RE = /\D/g;

/**
 * Mask an IBAN or numeric account number. Only masks values that look
 * like financial identifiers (start with 2 letters + digits, or are purely
 * numeric/alphanumeric with 8+ chars). Non-financial labels like "Main"
 * are returned as-is.
 */
export function maskSensitive(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const isIban = IBAN_RE.test(value);
  const isAccountNumber = ACCOUNT_NUMBER_RE.test(value);
  const isCardNumber = CARD_PREFIX_RE.test(value) && value.replace(NON_DIGIT_RE, "").length >= 8;

  if (!isIban && !isAccountNumber && !isCardNumber) return value;

  if (value.length <= 4) return "*".repeat(value.length);
  // Mask only 4 characters in the middle, show the rest
  const maskLen = Math.min(4, value.length - 4);
  const prefixLen = Math.floor((value.length - maskLen) / 2);
  return value.slice(0, prefixLen) + "*".repeat(maskLen) + value.slice(prefixLen + maskLen);
}
