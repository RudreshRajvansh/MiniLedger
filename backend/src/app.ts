import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import loansRoutes from './modules/loans/loans.routes';
import summaryRoutes from './modules/summary/summary.routes';

const logger = pino({ level: 'info' });
const app = express();

// --- Security & parsing middleware ---
// crossOriginResourcePolicy set to cross-origin so mobile clients can load uploaded receipts
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());

// Skip noisy logging during automated tests
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// --- Static file serving for receipt uploads ---
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// --- Health check ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/summary', summaryRoutes);

// --- Centralized error handler (must be registered LAST) ---
app.use(errorHandler);

export { app, logger };
