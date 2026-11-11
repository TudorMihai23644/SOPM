import { TASK_STATUS_LABELS, type TaskStatus } from '@deadlinehero/shared';

const STYLES: Record<TaskStatus, { icon: string; className: string }> = {
  UPCOMING: { icon: '⏳', className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200' },
  OVERDUE: { icon: '⚠', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
  COMPLETED: { icon: '✓', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  CANCELLED: { icon: '✕', className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

/** Starea are mereu pictogramă și text, nu doar culoare. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const { icon, className } = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
