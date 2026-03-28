// Shared utility functions used across multiple pages

/**
 * Format a date range as "start → end", or a fallback string if either date is missing.
 */
export function fmtRange(start, end, fallback = "") {
  return start && end ? `${start} → ${end}` : fallback;
}

/**
 * Clamp a string to maxLen characters, appending "…" if truncated.
 */
export function clamp(s, maxLen = 120) {
  const str = (s ?? "").toString();
  return str.length > maxLen ? `${str.slice(0, maxLen - 1)}…` : str;
}

/**
 * Ensure a value is an array; return [] otherwise.
 */
export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
