import { app, logger } from './app';
import { env } from './config/env';
import { pool } from './config/db';

/**
 * Entry point — starts the HTTP server.
 * Separated from app.ts so tests can import the app without side effects.
 *
 * env.ts already validated all environment variables (it runs on import).
 * If validation fails, the process exits before reaching this code.
 */

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 MiniLedger API running on http://localhost:${env.PORT}`);
  logger.info(`📋 Health check: http://localhost:${env.PORT}/health`);
});

// --- Graceful shutdown ---
// When the process receives a termination signal (Ctrl+C, Docker stop),
// we close the HTTP server first (stop accepting new requests),
// then close the database pool (finish in-flight queries and disconnect).
async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');
    pool.end().then(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
