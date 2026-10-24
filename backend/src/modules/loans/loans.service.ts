import { query } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { toMoney } from '../../utils/money';
import { CreateLoanInput } from './loans.schemas';

export interface LoanResponse {
  id: string;
  friendName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'repaid';
  isOverdue: boolean;
  daysOverdue: number;
  repaidAt: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

interface RawLoanRow {
  id: string;
  friend_name: string;
  amount: string;
  due_date: string;
  status: 'pending' | 'repaid';
  repaid_at: Date | null;
  receipt_path: string | null;
  created_at: Date;
  is_overdue: boolean;
  days_overdue: number;
}

/**
 * Transforms a raw database row (snake_case) into the camelCase API response contract.
 * Also builds the absolute receipt URL if an image was uploaded.
 */
function mapLoanRow(row: RawLoanRow): LoanResponse {
  const receiptUrl = row.receipt_path
    ? `${env.PUBLIC_BASE_URL}/uploads/${row.receipt_path}`
    : null;

  return {
    id: row.id,
    friendName: row.friend_name,
    amount: toMoney(row.amount),
    dueDate: row.due_date,
    status: row.status,
    isOverdue: Boolean(row.is_overdue),
    daysOverdue: Number(row.days_overdue || 0),
    repaidAt: row.repaid_at ? row.repaid_at.toISOString() : null,
    receiptUrl,
    createdAt: row.created_at.toISOString(),
  };
}

// ─── SQL fragment for computed overdue status ───────────────────
// We use Asia/Kolkata (IST) because due date boundary is midnight local time.
// Overdue is computed dynamically: status = 'pending' AND due_date < today's date in IST.
const LOAN_SELECT_FIELDS = `
  id,
  friend_name,
  amount,
  to_char(due_date, 'YYYY-MM-DD') AS due_date,
  status,
  repaid_at,
  receipt_path,
  created_at,
  (status = 'pending' AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date) AS is_overdue,
  CASE
    WHEN status = 'pending' AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date
      THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date - due_date)
    ELSE 0
  END AS days_overdue
`;

// ─── Create Loan ────────────────────────────────────────────────

export async function createLoan(
  userId: string,
  input: CreateLoanInput,
): Promise<LoanResponse> {
  const result = await query<RawLoanRow>(
    `WITH inserted AS (
       INSERT INTO loans (user_id, friend_name, amount, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *
     )
     SELECT ${LOAN_SELECT_FIELDS}
     FROM inserted`,
    [userId, input.friendName, input.amount, input.dueDate],
  );

  return mapLoanRow(result.rows[0]);
}

// ─── Get Loans (with status filter and multi-tier sorting) ───────

export async function getLoans(
  userId: string,
  statusFilter: 'all' | 'pending' | 'repaid' | 'overdue' = 'all',
): Promise<LoanResponse[]> {
  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];

  // Apply status filter based on computed overdue logic
  if (statusFilter === 'pending') {
    conditions.push(
      "status = 'pending' AND due_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date",
    );
  } else if (statusFilter === 'overdue') {
    conditions.push(
      "status = 'pending' AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date",
    );
  } else if (statusFilter === 'repaid') {
    conditions.push("status = 'repaid'");
  }

  // Sort order requirement:
  // 1. Overdue first (ordered by largest days overdue, i.e. oldest due date first)
  // 2. Pending next (ordered by soonest due date)
  // 3. Repaid last (ordered by most recently repaid)
  const sql = `
    SELECT ${LOAN_SELECT_FIELDS}
    FROM loans
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE
        WHEN status = 'pending' AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 1
        WHEN status = 'pending' THEN 2
        ELSE 3
      END ASC,
      CASE
        WHEN status = 'pending' THEN due_date
      END ASC,
      repaid_at DESC NULLS LAST,
      created_at DESC
  `;

  const result = await query<RawLoanRow>(sql, params);
  return result.rows.map(mapLoanRow);
}

// ─── Get Single Loan ────────────────────────────────────────────

export async function getLoanById(
  userId: string,
  loanId: string,
): Promise<LoanResponse> {
  const result = await query<RawLoanRow>(
    `SELECT ${LOAN_SELECT_FIELDS}
     FROM loans
     WHERE id = $1 AND user_id = $2`,
    [loanId, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Loan not found');
  }

  return mapLoanRow(result.rows[0]);
}

// ─── Atomic Repay ───────────────────────────────────────────────

export async function repayLoan(
  userId: string,
  loanId: string,
): Promise<LoanResponse> {
  // Single atomic update: only updates if current status is 'pending'
  const updateResult = await query<RawLoanRow>(
    `WITH updated AS (
       UPDATE loans
       SET status = 'repaid', repaid_at = now(), updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *
     )
     SELECT ${LOAN_SELECT_FIELDS}
     FROM updated`,
    [loanId, userId],
  );

  if (updateResult.rows.length > 0) {
    return mapLoanRow(updateResult.rows[0]);
  }

  // If no row was updated, check if the loan exists at all to return 404 vs 409
  const checkResult = await query<{ status: string }>(
    'SELECT status FROM loans WHERE id = $1 AND user_id = $2',
    [loanId, userId],
  );

  if (checkResult.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Loan not found');
  }

  // If it exists, status was already 'repaid'
  throw new AppError(409, 'ALREADY_REPAID', 'Loan has already been marked as repaid');
}

// ─── Attach Receipt ─────────────────────────────────────────────

export async function attachReceipt(
  userId: string,
  loanId: string,
  filename: string,
): Promise<LoanResponse> {
  // First ensure loan exists and belongs to this user
  const checkResult = await query<{ id: string }>(
    'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
    [loanId, userId],
  );

  if (checkResult.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Loan not found');
  }

  const result = await query<RawLoanRow>(
    `WITH updated AS (
       UPDATE loans
       SET receipt_path = $1, updated_at = now()
       WHERE id = $2 AND user_id = $3
       RETURNING *
     )
     SELECT ${LOAN_SELECT_FIELDS}
     FROM updated`,
    [filename, loanId, userId],
  );

  return mapLoanRow(result.rows[0]);
}

// ─── Delete Loan ────────────────────────────────────────────────

/**
 * Permanently deletes a loan owned by the user (e.g. an entry logged by mistake).
 * Returns the stored receipt filename (if any) so the caller can remove the file.
 */
export async function deleteLoan(
  userId: string,
  loanId: string,
): Promise<{ receiptPath: string | null }> {
  // Single atomic delete scoped to the owner; no row means not found (or not theirs)
  const result = await query<{ receipt_path: string | null }>(
    'DELETE FROM loans WHERE id = $1 AND user_id = $2 RETURNING receipt_path',
    [loanId, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Loan not found');
  }

  return { receiptPath: result.rows[0].receipt_path };
}
