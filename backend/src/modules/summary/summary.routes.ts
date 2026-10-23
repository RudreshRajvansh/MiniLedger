import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { handleGetSummary } from './summary.controller';

const router = Router();

router.use(authenticate);
router.get('/', handleGetSummary);

export default router;
