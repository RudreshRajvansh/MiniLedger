import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

/**
 * Simple migration runner: executes all .sql files in the migrations/ directory
 * in alphabetical order (001_, 002_, ...).
 *
 * No rollback support — for this project size, dropping and re-creating is fine.
 * Production apps would use a tool like node-pg-migrate that tracks which
 * migrations have already run.
 */
async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // alphabetical = execution order (001_, 002_, ...)

  console.log(`Running ${files.length} migration(s)...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`  ▸ ${file}`);
    await pool.query(sql);
  }

  console.log('✅ All migrations complete');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
