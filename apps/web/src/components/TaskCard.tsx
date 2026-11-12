import { DEFAULT_GAME_CONFIG, DIFFICULTY_LABELS, type Difficulty, type TaskDto } from '@deadlinehero/shared';
import { formatDateTime, formatRelative } from '../lib/time';
import { Countdown } from './Countdown';
import { MonsterSprite } from './Sprite';
import { StatusBadge } from './StatusBadge';

interface TaskCardProps {
  task: TaskDto;
  busy: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const DIFFICULTY_STYLE: Record<Difficulty, { tag: string; accent: string }> = {
  EASY: { tag: 'border-lime text-lime', accent: 'before:bg-lime' },
  MEDIUM: { tag: 'border-gold text-gold', accent: 'before:bg-gold' },
  HARD: { tag: 'border-pink text-pink', accent: 'before:bg-pink' },
};

const actionClass =
  'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-bold tracking-wide text-muted uppercase hover:bg-panel-2 hover:text-ink disabled:opacity-50';

export function TaskCard({ task, busy, onComplete, onEdit, onCancel, onDelete }: TaskCardProps) {
  const active = task.status === 'UPCOMING' || task.status === 'OVERDUE';
  const overdue = task.status === 'OVERDUE';
  const boss = task.difficulty === 'HARD';
  const values = DEFAULT_GAME_CONFIG.difficulty[task.difficulty];
  const style = DIFFICULTY_STYLE[task.difficulty];

  return (
    <li
      className={`panel relative overflow-hidden p-4 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${style.accent} ${
        overdue ? 'animate-glow border-danger' : ''
      } ${!active ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3">
        {active && (
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            aria-label={`Marchează „${task.title}” ca finalizată`}
            title="Misiune îndeplinită!"
            className="group mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-lime text-xl text-lime/40 transition hover:bg-lime hover:text-void hover:shadow-[0_0_14px_var(--color-lime)] disabled:opacity-50"
          >
            ✓
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-sm border px-1.5 py-0.5 text-[11px] font-bold uppercase ${style.tag}`}>
              {boss ? '☠ Boss' : DIFFICULTY_LABELS[task.difficulty]}
            </span>
            <StatusBadge status={task.status} />
            {active && <Countdown deadline={task.deadlineAt} />}
          </div>
          <h3 className={`mt-2 text-lg font-bold break-words ${active ? 'text-ink' : 'text-muted line-through'}`}>
            {task.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {task.status === 'COMPLETED' && task.completedAt ? (
              <>Terminată {formatRelative(task.completedAt)}</>
            ) : (
              <>
                Termen <time dateTime={task.deadlineAt}>{formatDateTime(task.deadlineAt)}</time>
              </>
            )}
            {task.postponeCount > 0 && <> · amânată {task.postponeCount === 1 ? 'o dată' : `de ${task.postponeCount} ori`}</>}
          </p>
          {task.description && <p className="mt-2 text-sm whitespace-pre-line text-ink/85">{task.description}</p>}

          {active && (
            <p className="mt-2 text-xs font-semibold tracking-wide uppercase">
              {overdue ? (
                <span className="text-danger">Te-a lovit: −{values.hpLoss} HP · încă o poți termina pentru 25% XP</span>
              ) : (
                <>
                  <span className="text-gold">Recompensă: {values.xp} XP</span>
                  <span className="text-muted"> · </span>
                  <span className="text-cyan">◇ {values.coins}</span>
                  <span className="text-muted"> · </span>
                  <span className="text-danger">Ratezi: −{values.hpLoss} HP</span>
                </>
              )}
            </p>
          )}

          <div className="mt-2 -ml-3 flex flex-wrap">
            {task.status === 'UPCOMING' && (
              <button type="button" className={actionClass} onClick={onEdit} disabled={busy}>
                Editează
              </button>
            )}
            {active && (
              <button type="button" className={actionClass} onClick={onCancel} disabled={busy}>
                Abandonează
              </button>
            )}
            <button type="button" className={`${actionClass} hover:text-danger`} onClick={onDelete} disabled={busy}>
              Șterge
            </button>
          </div>
        </div>

        {overdue && (
          <div className="hidden shrink-0 self-center sm:block" aria-hidden="true">
            <MonsterSprite boss={boss} />
          </div>
        )}
      </div>
    </li>
  );
}
