/**
 * Date formatting and calculation helpers for MiniLedger Mobile.
 */

/**
 * Returns today's date plus `days` in YYYY-MM-DD format.
 * Defaults to 7 days from now for loan due date default.
 */
export function getDefaultDueDate(daysAhead: number = 7): string {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  return formatDateToISOString(target);
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatDateToISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD string into a friendly readable string, e.g. "15 Nov 2026".
 */
export function formatFriendlyDate(isoDateString: string): string {
  if (!isoDateString) return '';
  const parts = isoDateString.split('-');
  if (parts.length !== 3) return isoDateString;

  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return `${day} ${months[monthIndex]} ${year}`;
}

/**
 * Parses a YYYY-MM-DD string as a local calendar date (midnight).
 */
function parseLocalDate(isoDateString: string): Date {
  const [y, m, d] = isoDateString.split('-').map((p) => parseInt(p, 10));
  return new Date(y, m - 1, d);
}

/**
 * Whole days from today until the given YYYY-MM-DD date (negative if past).
 */
export function daysUntil(isoDateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(isoDateString);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Human-friendly due text for a pending loan, e.g. "Due today", "Due in 3 days".
 */
export function describeDueIn(isoDateString: string): string {
  const days = daysUntil(isoDateString);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1 && days <= 30) return `Due in ${days} days`;
  return `Due ${formatFriendlyDate(isoDateString)}`;
}

/**
 * Adds `days` to a Date and returns a new Date (does not mutate input).
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Formats an ISO timestamp (e.g. repaidAt) as "12 Oct 2026".
 */
export function formatTimestamp(isoTimestamp: string): string {
  return formatFriendlyDate(formatDateToISOString(new Date(isoTimestamp)));
}
