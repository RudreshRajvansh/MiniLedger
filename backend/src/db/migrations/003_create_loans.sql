-- Loans table: each row is money lent to a friend.
--
-- Design decisions:
-- • amount uses NUMERIC(12,2) — exact decimal arithmetic, no floating-point rounding.
-- • "overdue" is NOT stored as a column. It's computed at query time:
--     status = 'pending' AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date
--   Why? Because overdue status changes every day at midnight IST. Storing it would
--   require a daily cron job to update rows — fragile and error-prone. Computing it
--   is cheap and always correct.
-- • Past due dates ARE allowed on insert, so users can log older loans retroactively.

CREATE TABLE IF NOT EXISTS loans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name  TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date     DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'repaid')),
  repaid_at    TIMESTAMPTZ,
  receipt_path TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the most common query: "show me my pending/overdue loans sorted by due date"
CREATE INDEX IF NOT EXISTS idx_loans_user_status_due
  ON loans (user_id, status, due_date);
