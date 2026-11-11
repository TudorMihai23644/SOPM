import { DIFFICULTY_LABELS, type TaskDto } from '@deadlinehero/shared';
import { formatDateTime, formatRelative } from '../lib/time';
import { StatusBadge } from './StatusBadge';

interface TaskCardProps {
  task: TaskDto;
  busy: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const DIFFICULTY_STYLE = {
  EASY: 'text-emerald-700 dark:text-emerald-400',
  MEDIUM: 'text-amber-700 dark:text-amber-400',
  HARD: 'text-red-700 dark:text-red-400',
};

const actionClass =
  'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800';

export function TaskCard({ task, busy, onComplete, onEdit, onCancel, onDelete }: TaskCardProps) {
  const active = task.status === 'UPCOMING' || task.status === 'OVERDUE';
  const closed = !active;

  return (
    <li
      className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
        task.status === 'OVERDUE' ? 'border-red-300 dark:border-red-900' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {active && (
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            aria-label={`Marchează „${task.title}” ca finalizată`}
            title="Marchează ca finalizată"
            className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-lg text-transparent transition hover:border-emerald-500 hover:text-emerald-500 disabled:opacity-50 dark:border-slate-600"
          >
            ✓
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-semibold break-words ${closed ? 'text-slate-500 line-through dark:text-slate-400' : ''}`}>
              {task.title}
            </h3>
            <StatusBadge status={task.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className={`font-medium ${DIFFICULTY_STYLE[task.difficulty]}`}>{DIFFICULTY_LABELS[task.difficulty]}</span>
            {' · '}
            {task.status === 'COMPLETED' && task.completedAt ? (
              <>Finalizată {formatRelative(task.completedAt)}</>
            ) : (
              <>
                Termen <time dateTime={task.deadlineAt}>{formatDateTime(task.deadlineAt)}</time>
                {active && <> ({formatRelative(task.deadlineAt)})</>}
              </>
            )}
            {task.postponeCount > 0 && <> · amânată {task.postponeCount === 1 ? 'o dată' : `de ${task.postponeCount} ori`}</>}
          </p>
          {task.description && (
            <p className="mt-2 text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{task.description}</p>
          )}
          <div className="mt-2 -ml-3 flex flex-wrap">
            {task.status === 'UPCOMING' && (
              <button type="button" className={actionClass} onClick={onEdit} disabled={busy}>
                Editează
              </button>
            )}
            {active && (
              <button type="button" className={actionClass} onClick={onCancel} disabled={busy}>
                Anulează
              </button>
            )}
            <button type="button" className={`${actionClass} text-red-700 dark:text-red-400`} onClick={onDelete} disabled={busy}>
              Șterge
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
