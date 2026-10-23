/**
 * Money helper — the ONE place where we convert DB strings to API numbers.
 *
 * PostgreSQL returns NUMERIC columns as strings (e.g. "12500.00") to avoid
 * JavaScript floating-point precision loss. This helper converts to a number
 * with exactly 2 decimal places for the JSON API response.
 *
 * All aggregation (SUM, etc.) happens in SQL using NUMERIC. We ONLY convert
 * at the API boundary. This means we never do float math on money in JS.
 */
export function toMoney(pgNumeric: string | null | undefined): number {
  if (!pgNumeric) return 0;
  return parseFloat(parseFloat(pgNumeric).toFixed(2));
}
