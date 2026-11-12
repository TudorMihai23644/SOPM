import { TASK_STATUS_LABELS, type TaskStatus } from '@deadlinehero/shared';

const STYLES: Record<TaskStatus, { icon: string; className: string }> = {
  UPCOMING: { icon: '⚔', className: 'border-line text-ink' },
  OVERDUE: { icon: '☠', className: 'border-blood text-blood' },
  COMPLETED: { icon: '✓', className: 'border-heal/60 text-heal' },
  CANCELLED: { icon: '✕', className: 'border-line text-muted' },
};

/** Starea are mereu pictogramă și text, nu doar culoare. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const { icon, className } = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-[2px] border bg-abyss/60 px-1.5 py-0.5 font-display text-[11px] font-bold tracking-wider uppercase ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
