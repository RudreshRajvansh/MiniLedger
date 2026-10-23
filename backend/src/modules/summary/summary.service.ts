import { query } from '../../config/db';
import { toMoney } from '../../utils/money';

export interface SummaryResponse {
  totalLent: number;
  totalRepaid: number;
  totalPending: number;
  overdueAmount: number;
  counts: {
    total: number;
    repaid: number;
    pending: number;
    overdue: number;
  };
}

interface RawSummaryRow {
  total_lent: string;
  total_repaid: string;
  overdue_amount: string;
  total_count: string;
  repaid_count: string;
  pending_count: string;
  overdue_count: string;
}

/**
 * Calculates loan totals and counts for the authenticated user in ONE SQL query.
 *
 * Why in SQL?
 * 1. Postgres NUMERIC provides exact decimal arithmetic, avoiding JS floating-point issues.
 * 2. Database handles aggregations orders of magnitude faster than pulling rows to Node.js.
 * 3. Atomic snapshot at the database query time.
 */
export async function getSummary(userId: string): Promise<SummaryResponse> {
  const sql = `
    SELECT
      COALESCE(SUM(amount), 0)::text AS total_lent,
      COALESCE(SUM(amount) FILTER (WHERE status = 'repaid'), 0)::text AS total_repaid,
      COALESCE(
        SUM(amount) FILTER (
          WHERE status = 'pending'
            AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date
        ),
        0
      )::text AS overdue_amount,
      COUNT(*)::text AS total_count,
      COUNT(*) FILTER (WHERE status = 'repaid')::text AS repaid_count,
      COUNT(*) FILTER (WHERE status = 'pending')::text AS pending_count,
      COUNT(*) FILTER (
        WHERE status = 'pending'
          AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date
      )::text AS overdue_count
    FROM loans
    WHERE user_id = $1
  `;

  const result = await query<RawSummaryRow>(sql, [userId]);
  const row = result.rows[0];

  const totalLent = toMoney(row.total_lent);
  const totalRepaid = toMoney(row.total_repaid);
  const overdueAmount = toMoney(row.overdue_amount);

  // totalPending = totalLent - totalRepaid (kept exact to 2 decimals)
  const totalPending = parseFloat((totalLent - totalRepaid).toFixed(2));

  return {
    totalLent,
    totalRepaid,
    totalPending,
    overdueAmount,
    counts: {
      total: parseInt(row.total_count, 10) || 0,
      repaid: parseInt(row.repaid_count, 10) || 0,
      pending: parseInt(row.pending_count, 10) || 0,
      overdue: parseInt(row.overdue_count, 10) || 0,
    },
  };
}
