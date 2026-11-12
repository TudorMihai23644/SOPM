import type { RewardDto, TaskActionResponse, TaskDto, TaskStatus } from '@deadlinehero/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { api, ApiRequestError } from '../lib/api';
import { useFx } from '../lib/fx';
import { markSilentUpdate } from '../lib/player';
import { activeTasksQuery } from '../lib/queries';
import { emitScene } from '../scene/events';
import { Button } from './Button';
import { Modal } from './Modal';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { UndoToast } from './UndoToast';

const CLOSED: TaskStatus[] = ['COMPLETED', 'CANCELLED'];

type Dialog = { kind: 'create' } | { kind: 'edit'; task: TaskDto } | { kind: 'delete'; task: TaskDto } | null;
type ActionKind = 'complete' | 'cancel' | 'undo';

export function QuestLog() {
  const queryClient = useQueryClient();
  const fx = useFx();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [undo, setUndo] = useState<TaskDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista activă se reîmprospătează la un minut, ca misiunile ratate să treacă singure în Restant.
  const active = useQuery(activeTasksQuery);
  // Citirea listei poate trece misiuni în Restant (și scădea HP), deci profilul se reîncarcă după ea.
  useEffect(() => {
    if (active.dataUpdatedAt) void queryClient.invalidateQueries({ queryKey: ['me'] });
  }, [active.dataUpdatedAt, queryClient]);

  const closed = useQuery({
    queryKey: ['tasks', 'closed'],
    queryFn: () => api.tasks.list({ status: CLOSED, sort: 'recent', limit: 20 }),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ predicate: (q) => ['tasks', 'history', 'me'].includes(String(q.queryKey[0])) });

  function celebrate(reward: RewardDto, task: TaskDto) {
    emitScene({ type: 'attack', late: task.status === 'OVERDUE', taskId: task.id });
    if (reward.tooFast) {
      fx.float('Prea grăbit: fără răsplată', 'info');
      fx.sfx('denied');
      return;
    }
    if (reward.xp > 0) fx.float(`+${reward.xp} XP`, 'xp');
    if (reward.coins > 0) fx.float(`+${reward.coins} ◈ aur`, 'coin');
    if (reward.hp > 0) fx.float(`+${reward.hp} viață`, 'hp');
    if (reward.multiplier > 1) fx.float(`🔥 Serie ×${reward.multiplier.toFixed(2)}`, 'combo');
    if (reward.staminaCapped) fx.float(reward.xp > 0 ? 'Stamina epuizată' : 'Stamina epuizată: fără experiență', 'info');
    if (reward.levelsGained > 0) {
      emitScene({ type: 'cheer' });
      setTimeout(() => fx.levelUp(reward.level, reward.levelsGained * 25), 1400);
    }
    else fx.sfx(reward.xp > 0 ? 'coin' : 'denied');
  }

  const action = useMutation({
    mutationFn: ({ kind, task }: { kind: ActionKind; task: TaskDto }) => api.tasks[kind](task.id),
    onMutate: () => setError(null),
    onSuccess: ({ task, user, reward }: TaskActionResponse, { kind, task: before }) => {
      if (kind === 'undo') {
        markSilentUpdate();
        fx.float('Anulat', 'info');
        fx.sfx('undo');
      }
      queryClient.setQueryData(['me'], user);
      if (reward) celebrate(reward, before);
      setUndo(kind === 'complete' && task.undoAvailableUntil ? task : null);
    },
    onError: (err) => {
      fx.sfx('denied');
      setError(err instanceof ApiRequestError ? err.message : 'Acțiunea nu a reușit.');
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (task: TaskDto) => api.tasks.remove(task.id),
    onSuccess: () => setDialog(null),
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Ștergerea nu a reușit.'),
    onSettled: refresh,
  });

  const items = active.data?.items ?? [];
  const overdue = items.filter((t) => t.status === 'OVERDUE');
  const upcoming = items.filter((t) => t.status === 'UPCOMING');
  const completed = (closed.data?.items ?? []).filter((t) => t.status === 'COMPLETED');
  const cancelled = (closed.data?.items ?? []).filter((t) => t.status === 'CANCELLED');

  const card = (task: TaskDto) => (
    <TaskCard
      key={task.id}
      task={task}
      busy={action.isPending && action.variables?.task.id === task.id}
      onComplete={() => action.mutate({ kind: 'complete', task })}
      onCancel={() => action.mutate({ kind: 'cancel', task })}
      onEdit={() => setDialog({ kind: 'edit', task })}
      onDelete={() => setDialog({ kind: 'delete', task })}
    />
  );

  return (
    <section aria-labelledby="quests-title" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="quests-title" className="glow-gold font-display text-2xl font-bold text-gold">
          Tabla de misiuni
        </h2>
        <Button onClick={() => setDialog({ kind: 'create' })}>+ Misiune nouă</Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border-2 border-blood bg-blood/10 px-3 py-2 text-sm text-blood">
          {error}
        </p>
      )}

      {active.isPending ? (
        <p role="status" className="font-display text-muted">
          Se aprind torțele…
        </p>
      ) : active.isError ? (
        <p role="alert" className="text-blood">
          Misiunile nu s-au putut încărca.{' '}
          <button type="button" className="underline" onClick={() => void active.refetch()}>
            Încearcă din nou
          </button>
        </p>
      ) : items.length === 0 ? (
        <div className="panel border-dashed p-10 text-center">
          <p className="font-display text-xl text-gold">Tabla e goală</p>
          <p className="mt-3 text-muted">
            Scrie o misiune cu termen și dificultate. Îndeplinește-o la timp ca să câștigi experiență și aur și să-ți ții seria.
          </p>
          <Button className="mt-5" onClick={() => setDialog({ kind: 'create' })}>
            Prima misiune
          </Button>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <TaskGroup title="☠ Monștri" count={overdue.length} tone="text-blood" hint="Misiuni ratate care te-au rănit. Le poți termina și acum, pentru 25% experiență.">
              {overdue.map(card)}
            </TaskGroup>
          )}
          {upcoming.length > 0 && (
            <TaskGroup title="⚔ Misiuni în curs" count={upcoming.length} tone="text-ink">
              {upcoming.map(card)}
            </TaskGroup>
          )}
        </>
      )}

      {completed.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-display font-bold text-heal">
            ✓ Îndeplinite ({completed.length})
          </summary>
          <ul className="mt-2 space-y-3">{completed.map(card)}</ul>
        </details>
      )}
      {cancelled.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-display font-bold text-muted">
            ✕ Abandonate ({cancelled.length})
          </summary>
          <ul className="mt-2 space-y-3">{cancelled.map(card)}</ul>
        </details>
      )}

      <Modal
        open={dialog?.kind === 'create' || dialog?.kind === 'edit'}
        title={dialog?.kind === 'edit' ? 'Rescrie misiunea' : 'Misiune nouă'}
        onClose={() => setDialog(null)}
      >
        {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
          <TaskForm
            task={dialog.kind === 'edit' ? dialog.task : undefined}
            onCancel={() => setDialog(null)}
            onSubmit={async (values) => {
              if (dialog.kind === 'edit') await api.tasks.update(dialog.task.id, values);
              else await api.tasks.create(values as Parameters<typeof api.tasks.create>[0]);
              fx.sfx('click');
              setDialog(null);
              await refresh();
            }}
          />
        )}
      </Modal>

      <Modal open={dialog?.kind === 'delete'} title="Arzi sulul misiunii?" onClose={() => setDialog(null)}>
        {dialog?.kind === 'delete' && (
          <>
            <p className="text-ink">
              „{dialog.task.title}” se șterge definitiv. XP-ul deja primit rămâne, iar în Istoric se păstrează doar titlul.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Renunță
              </Button>
              <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(dialog.task)}>
                Șterge
              </Button>
            </div>
          </>
        )}
      </Modal>

      {undo?.undoAvailableUntil && (
        <UndoToast
          message={`„${undo.title}” îndeplinită!`}
          until={undo.undoAvailableUntil}
          onExpire={() => setUndo(null)}
          onUndo={() => {
            action.mutate({ kind: 'undo', task: undo });
            setUndo(null);
          }}
        />
      )}
    </section>
  );
}

function TaskGroup({ title, count, hint, tone, children }: { title: string; count: number; hint?: string; tone: string; children: ReactNode }) {
  return (
    <div>
      <h3 className={`ornament font-display text-lg font-bold ${tone}`}>
        <span>
          {title} <span className="text-muted">({count})</span>
        </span>
      </h3>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <ul className="mt-3 space-y-3">{children}</ul>
    </div>
  );
}
