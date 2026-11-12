import { TASK_STATUS_LABELS, type TaskStatus } from '@deadlinehero/shared';

const STYLES: Record<TaskStatus, { icon: string; className: string }> = {
  UPCOMING: { icon: '▶', className: 'border-cyan text-cyan' },
  OVERDUE: { icon: '!', className: 'border-danger text-danger' },
  COMPLETED: { icon: '✓', className: 'border-lime text-lime' },
  CANCELLED: { icon: '✕', className: 'border-muted text-muted' },
};

/** Starea are mereu pictogramă și text, nu doar culoare. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const { icon, className } = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-bold uppercase ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
