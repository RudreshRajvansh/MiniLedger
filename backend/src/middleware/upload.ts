import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { env } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      fileValidationError?: string;
    }
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  },
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const uploadReceipt = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      req.fileValidationError = 'Only JPEG, PNG, and WebP images are allowed';
      return cb(null, false);
    }
    cb(null, true);
  },
});
