import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadReceipt } from '../../middleware/upload';
import { createLoanSchema } from './loans.schemas';
import {
  handleCreateLoan,
  handleGetLoans,
  handleGetLoanById,
  handleRepayLoan,
  handleUploadReceipt,
  handleDeleteLoan,
} from './loans.controller';

const router = Router();

// All loans routes require valid JWT authentication
router.use(authenticate);

router.post('/', validate(createLoanSchema), handleCreateLoan);
router.get('/', handleGetLoans);
router.get('/:id', handleGetLoanById);
router.patch('/:id/repay', handleRepayLoan);
router.post('/:id/receipt', uploadReceipt.single('receipt'), handleUploadReceipt);
router.delete('/:id', handleDeleteLoan);

export default router;
