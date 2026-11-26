import type { QueryClient } from '@tanstack/react-query';

/** Cheile React Query folosite de mai multe ecrane. */
export const ACTIVE_TASKS_KEY = ['tasks', 'active'] as const;

/** După orice schimbare de activitate: listele, istoricul și profilul (XP, HP) se reîncarcă. */
export function refreshTaskData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ predicate: (q) => ['tasks', 'history', 'me'].includes(String(q.queryKey[0])) });
}

/** Termenul implicit pentru o misiune nouă: peste 3 zile, la oră fixă. */
export function defaultDeadline(days = 3): Date {
  const date = new Date(Date.now() + days * 86_400_000);
  date.setMinutes(0, 0, 0);
  return date;
}
