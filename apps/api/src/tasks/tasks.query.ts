import { TASK_STATUSES } from '@deadlinehero/shared';
import { z } from 'zod';

export const listTasksQuerySchema = z.object({
  status: z
    .string()
    .transform((value) => value.split(',').map((s) => s.trim().toUpperCase()))
    .pipe(z.array(z.enum(TASK_STATUSES, { error: 'Stare necunoscută' })).min(1))
    .optional(),
  sort: z.enum(['deadline', 'recent']).default('deadline'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.uuid({ error: 'Cursor invalid' }).optional(),
});
export type ListTasksQuery = z.output<typeof listTasksQuerySchema>;

export const historyQuerySchema = z.object({
  taskId: z.uuid({ error: 'Id invalid' }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.uuid({ error: 'Cursor invalid' }).optional(),
});
export type HistoryQuery = z.output<typeof historyQuerySchema>;
