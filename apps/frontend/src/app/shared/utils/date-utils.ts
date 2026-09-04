/**
 * Date and Time utilities enforcing America/Chihuahua (UTC-6) timezone.
 */

export const CHIHUAHUA_TIMEZONE = 'America/Chihuahua';

/**
 * Returns the current date in Chihuahua timezone as 'YYYY-MM-DD'.
 */
export function getChihuahuaCurrentDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHIHUAHUA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
  return parts; // 'en-CA' outputs 'YYYY-MM-DD'
}

/**
 * Returns the current full timestamp in Chihuahua timezone with -06:00 offset,
 * e.g., '2026-09-04T11:05:22-06:00'.
 */
export function getChihuahuaNowISO(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHIHUAHUA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  return `${map['year']}-${map['month']}-${map['day']}T${map['hour']}:${map['minute']}:${map['second']}-06:00`;
}

/**
 * Normalizes a date string so that date-only entries (or timestamps stored at UTC midnight)
 * are placed at noon in Chihuahua (12:00:00-06:00), preventing any 1-day rollback due to
 * UTC-to-local timezone conversion.
 */
export function normalizeProgressDate(rawDate: string | Date | null | undefined): string {
  if (!rawDate) return '';
  
  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return '';
    return rawDate.toISOString();
  }

  const trimmed = rawDate.trim();
  if (!trimmed) return '';

  // Case 1: Date only 'YYYY-MM-DD'
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00-06:00`;
  }

  // Case 2: UTC Midnight timestamp, e.g. 'YYYY-MM-DDT00:00:00...'
  if (/^\d{4}-\d{2}-\d{2}T00:00:00/.test(trimmed)) {
    const datePart = trimmed.substring(0, 10);
    return `${datePart}T12:00:00-06:00`;
  }

  return trimmed;
}

/**
 * Normalizes an entire progress record object to ensure its .date property is timezone-safe.
 */
export function normalizeProgressRecord<T extends { date?: any }>(record: T): T {
  if (!record || !record.date) return record;
  return {
    ...record,
    date: normalizeProgressDate(record.date)
  };
}

/**
 * Formats a Date or date string in Chihuahua timezone.
 */
export function formatChihuahuaDate(
  dateInput: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  locale: string = 'es-MX'
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(normalizeProgressDate(dateInput)) : dateInput;
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: CHIHUAHUA_TIMEZONE
  }).format(date);
}

/**
 * Formats time in 12-hour format (e.g. '10:00 AM') in Chihuahua timezone.
 */
export function formatChihuahuaTime(
  dateInput: Date | string | null | undefined,
  locale: string = 'es-MX'
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(normalizeProgressDate(dateInput)) : dateInput;
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: CHIHUAHUA_TIMEZONE
  }).format(date).toUpperCase();
}
