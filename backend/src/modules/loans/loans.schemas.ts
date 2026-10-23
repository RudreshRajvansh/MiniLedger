import { z } from 'zod';

export const createLoanSchema = z.object({
  friendName: z
    .string()
    .trim()
    .min(1, 'Friend name is required')
    .max(100, 'Friend name must be at most 100 characters'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than zero')
    .max(10_000_000, 'Amount cannot exceed 10,000,000')
    .refine(
      (val) => Number(val.toFixed(2)) === val,
      'Amount can have at most 2 decimal places'
    ),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === val;
    }, 'Due date must be a valid calendar date'),
});

export const loanIdParamSchema = z.object({
  id: z.string().uuid('Invalid loan ID format (must be UUID)'),
});

export const getLoansQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'repaid', 'overdue']).default('all'),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type GetLoansQueryInput = z.infer<typeof getLoansQuerySchema>;
