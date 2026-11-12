import type { TaskDto, TaskStatus } from '@deadlinehero/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiRequestError } from '../lib/api';
import { Button } from './Button';
import { Modal } from './Modal';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { UndoToast } from './UndoToast';

const ACTIVE: TaskStatus[] = ['UPCOMING', 'OVERDUE'];
const CLOSED: TaskStatus[] = ['COMPLETED', 'CANCELLED'];

type Dialog = { kind: 'create' } | { kind: 'edit'; task: TaskDto } | { kind: 'delete'; task: TaskDto } | null;

export function QuestLog() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [undo, setUndo] = useState<TaskDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista activă se reîmprospătează la un minut, ca activitățile să treacă singure în Restant.
  const active = useQuery({
    queryKey: ['tasks', 'active'],
    queryFn: () => api.tasks.list({ status: ACTIVE, sort: 'deadline' }),
    refetchInterval: 60_000,
  });
  const closed = useQuery({
    queryKey: ['tasks', 'closed'],
    queryFn: () => api.tasks.list({ status: CLOSED, sort: 'recent', limit: 20 }),
  });

  const refresh = () => queryClient.invalidateQueries({ predicate: (q) => ['tasks', 'history', 'me'].includes(String(q.queryKey[0])) });

  const action = useMutation({
    mutationFn: async ({ kind, task }: { kind: 'complete' | 'cancel' | 'undo'; task: TaskDto }) => api.tasks[kind](task.id),
    onMutate: () => setError(null),
    onSuccess: ({ task, user }, { kind }) => {
      queryClient.setQueryData(['me'], user);
      setUndo(kind === 'complete' && task.undoAvailableUntil ? task : null);
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Acțiunea nu a reușit.'),
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
        <h2 id="quests-title" className="text-xl font-bold">
          Quest Log
        </h2>
        <Button onClick={() => setDialog({ kind: 'create' })}>+ Activitate nouă</Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {active.isPending ? (
        <p role="status" className="text-slate-500">
          Se încarcă activitățile…
        </p>
      ) : active.isError ? (
        <p role="alert" className="text-red-600">
          Activitățile nu s-au putut încărca.{' '}
          <button type="button" className="underline" onClick={() => void active.refetch()}>
            Încearcă din nou
          </button>
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-semibold">Nicio misiune activă</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Adaugă o activitate cu termen și dificultate. Dacă o termini la timp, primești XP și monede.
          </p>
          <Button className="mt-4" onClick={() => setDialog({ kind: 'create' })}>
            Adaugă prima activitate
          </Button>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <TaskGroup title="Restant" count={overdue.length} hint="Le poți termina și acum, cu recompensă redusă.">
              {overdue.map(card)}
            </TaskGroup>
          )}
          {upcoming.length > 0 && (
            <TaskGroup title="Urmează" count={upcoming.length}>
              {upcoming.map(card)}
            </TaskGroup>
          )}
        </>
      )}

      {completed.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
            Completate recent ({completed.length})
          </summary>
          <ul className="mt-2 space-y-3">{completed.map(card)}</ul>
        </details>
      )}
      {cancelled.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Anulate ({cancelled.length})</summary>
          <ul className="mt-2 space-y-3">{cancelled.map(card)}</ul>
        </details>
      )}

      <Modal
        open={dialog?.kind === 'create' || dialog?.kind === 'edit'}
        title={dialog?.kind === 'edit' ? 'Editează activitatea' : 'Activitate nouă'}
        onClose={() => setDialog(null)}
      >
        {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
          <TaskForm
            task={dialog.kind === 'edit' ? dialog.task : undefined}
            onCancel={() => setDialog(null)}
            onSubmit={async (values) => {
              if (dialog.kind === 'edit') await api.tasks.update(dialog.task.id, values);
              else await api.tasks.create(values as Parameters<typeof api.tasks.create>[0]);
              setDialog(null);
              await refresh();
            }}
          />
        )}
      </Modal>

      <Modal open={dialog?.kind === 'delete'} title="Ștergi activitatea?" onClose={() => setDialog(null)}>
        {dialog?.kind === 'delete' && (
          <>
            <p className="text-slate-700 dark:text-slate-300">
              „{dialog.task.title}” se șterge definitiv. XP-ul deja primit rămâne, iar în Istoric se păstrează doar titlul.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Renunță
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" loading={remove.isPending} onClick={() => remove.mutate(dialog.task)}>
                Șterge
              </Button>
            </div>
          </>
        )}
      </Modal>

      {undo?.undoAvailableUntil && (
        <UndoToast
          message={`„${undo.title}” e gata!`}
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

function TaskGroup({ title, count, hint, children }: { title: string; count: number; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold">
        {title} <span className="font-normal text-slate-500">({count})</span>
      </h3>
      {hint && <p className="text-sm text-slate-600 dark:text-slate-400">{hint}</p>}
      <ul className="mt-2 space-y-3">{children}</ul>
    </div>
  );
}
