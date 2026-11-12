import { DEFAULT_GAME_CONFIG, DIFFICULTY_LABELS, type Difficulty, type TaskDto } from '@deadlinehero/shared';
import { formatDateTime, formatRelative } from '../lib/time';
import { Countdown } from './Countdown';
import { MonsterIcon } from './Portrait';
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
  EASY: { tag: 'border-heal/60 text-heal', accent: 'before:bg-heal/70' },
  MEDIUM: { tag: 'border-gold/60 text-gold', accent: 'before:bg-gold/70' },
  HARD: { tag: 'border-blood text-blood', accent: 'before:bg-blood' },
};

const actionClass =
  'inline-flex min-h-11 items-center px-3 font-display text-xs font-bold tracking-wider text-muted uppercase hover:text-gold disabled:opacity-50';

export function TaskCard({ task, busy, onComplete, onEdit, onCancel, onDelete }: TaskCardProps) {
  const active = task.status === 'UPCOMING' || task.status === 'OVERDUE';
  const overdue = task.status === 'OVERDUE';
  const boss = task.difficulty === 'HARD';
  const values = DEFAULT_GAME_CONFIG.difficulty[task.difficulty];
  const style = DIFFICULTY_STYLE[task.difficulty];

  return (
    <li
      className={`panel relative overflow-hidden p-4 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${style.accent} ${
        overdue ? 'animate-pulse-blood border-blood' : ''
      } ${!active ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3">
        {active && (
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            aria-label={`Marchează „${task.title}” ca finalizată`}
            title="Misiune îndeplinită"
            className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[3px] border-2 border-line bg-abyss text-xl text-muted/50 shadow-[inset_0_2px_6px_rgb(0_0_0/0.8)] transition hover:border-gold hover:text-gold disabled:opacity-50"
          >
            ✓
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-[2px] border bg-abyss/60 px-1.5 py-0.5 font-display text-[11px] font-bold tracking-wider uppercase ${style.tag}`}>
              {boss ? '♛ Boss' : DIFFICULTY_LABELS[task.difficulty]}
            </span>
            <StatusBadge status={task.status} />
            {active && <Countdown deadline={task.deadlineAt} />}
          </div>
          <h3 className={`mt-2 font-display text-lg font-bold break-words ${active ? 'text-ink' : 'text-muted line-through'}`}>
            {task.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {task.status === 'COMPLETED' && task.completedAt ? (
              <>Îndeplinită {formatRelative(task.completedAt)}</>
            ) : (
              <>
                Termen <time dateTime={task.deadlineAt}>{formatDateTime(task.deadlineAt)}</time>
              </>
            )}
            {task.postponeCount > 0 && <> · amânată {task.postponeCount === 1 ? 'o dată' : `de ${task.postponeCount} ori`}</>}
          </p>
          {task.description && <p className="mt-2 text-sm whitespace-pre-line text-ink/85">{task.description}</p>}

          {active && (
            <p className="mt-2 text-sm">
              {overdue ? (
                <span className="text-blood">Monstrul te-a lovit: −{values.hpLoss} viață. Încă o poți termina pentru 25% experiență.</span>
              ) : (
                <>
                  <span className="text-gold">Răsplată: {values.xp} XP · ◈ {values.coins} aur</span>
                  <span className="text-muted"> · dacă o ratezi: </span>
                  <span className="text-blood">−{values.hpLoss} viață</span>
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
            <button type="button" className={`${actionClass} hover:text-blood`} onClick={onDelete} disabled={busy}>
              Șterge
            </button>
          </div>
        </div>

        {overdue && (
          <div className="hidden shrink-0 self-center sm:block" aria-hidden="true">
            <MonsterIcon boss={boss} />
          </div>
        )}
      </div>
    </li>
  );
}
