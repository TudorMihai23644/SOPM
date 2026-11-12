import type { TaskStatus } from '@deadlinehero/shared';
import { api } from './api';

const ACTIVE: TaskStatus[] = ['UPCOMING', 'OVERDUE'];

/** Misiunile active; folosite de Tabla de misiuni și de scena 3D (aceeași cache). */
export const activeTasksQuery = {
  queryKey: ['tasks', 'active'] as const,
  queryFn: () => api.tasks.list({ status: ACTIVE, sort: 'deadline' }),
  refetchInterval: 60_000,
};
