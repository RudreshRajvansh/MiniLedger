import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import * as loansService from './loans.service';
import { getLoansQuerySchema, loanIdParamSchema } from './loans.schemas';

export const handleCreateLoan = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const loan = await loansService.createLoan(userId, req.body);
  res.status(201).json(loan);
});

export const handleGetLoans = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const queryResult = getLoansQuerySchema.safeParse(req.query);
  const statusFilter = queryResult.success ? queryResult.data.status : 'all';

  const loans = await loansService.getLoans(userId, statusFilter);
  res.json(loans);
});

export const handleGetLoanById = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const paramResult = loanIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid loan ID format (must be UUID)');
  }

  const loan = await loansService.getLoanById(userId, paramResult.data.id);
  res.json(loan);
});

export const handleRepayLoan = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const paramResult = loanIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid loan ID format (must be UUID)');
  }

  const loan = await loansService.repayLoan(userId, paramResult.data.id);
  res.json(loan);
});

export const handleUploadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const paramResult = loanIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid loan ID format (must be UUID)');
  }

  if (req.fileValidationError) {
    throw new AppError(400, 'INVALID_FILE', req.fileValidationError);
  }

  if (!req.file) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Receipt image file is required');
  }

  const loan = await loansService.attachReceipt(
    userId,
    paramResult.data.id,
    req.file.filename,
  );

  res.json(loan);
});

export const handleDeleteLoan = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const paramResult = loanIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid loan ID format (must be UUID)');
  }

  const { receiptPath } = await loansService.deleteLoan(userId, paramResult.data.id);

  // Best-effort cleanup of the receipt file; the DB row is already gone
  if (receiptPath) {
    fs.promises
      .unlink(path.join(path.resolve(env.UPLOAD_DIR), path.basename(receiptPath)))
      .catch(() => undefined);
  }

  res.status(204).send();
});
