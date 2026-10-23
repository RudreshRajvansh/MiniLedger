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
