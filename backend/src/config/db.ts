import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

const connectionString =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL ||
      env.DATABASE_URL.replace(/\/miniledger(\?.*)?$/, '/miniledger_test$1')
    : env.DATABASE_URL;

/**
 * Single shared connection pool for the entire app.
 * Automatically points to miniledger_test when running tests.
 */
export const pool = new Pool({
  connectionString,
});

/**
 * Typed query helper — saves us from importing Pool everywhere.
 * Always use parameterized queries ($1, $2...) to prevent SQL injection.
 *
 * Usage: const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
