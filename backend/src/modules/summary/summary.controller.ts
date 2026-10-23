import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as summaryService from './summary.service';

export const handleGetSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const summary = await summaryService.getSummary(userId);
  res.json(summary);
});
