import type { MeDto, TaskActionResponse, TaskDto } from '@deadlinehero/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Hud } from '../../src/components/Hud';
import { TaskRow, type TaskRowActions } from '../../src/components/TaskRow';
import { Button, Empty, FormError, Label, Loading, Screen, Title } from '../../src/components/ui';
import { UndoToast, type UndoState } from '../../src/components/UndoToast';
import { api, ApiRequestError } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { ACTIVE_TASKS_KEY, refreshTaskData } from '../../src/lib/queries';
import { space, TOUCH, useTheme } from '../../src/lib/theme';

function Group({ title, color, hint, children }: { title: string; color: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Label color={color}>{title}</Label>
      {hint ? <Text style={{ color, opacity: 0.85, fontSize: 14 }}>{hint}</Text> : null}
      {children}
    </View>
  );
}

/** Secțiune pliabilă pentru activitățile închise. */
function Collapsible({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={{ minHeight: TOUCH, justifyContent: 'center' }}
      >
        <Text style={{ color, fontWeight: '800', fontSize: 16 }}>
          {open ? '▾' : '▸'} {title}
        </Text>
      </Pressable>
      {open && children}
    </View>
  );
}

export default function QuestLogScreen() {
  const { state } = useAuth();
  const { colors, settings, reduceMotion } = useTheme();
  const queryClient = useQueryClient();
  const initialUser = state.status === 'authenticated' ? state.user : undefined;
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profilul și lista se reîmprospătează la un minut: misiunile ratate trec singure în Restant.
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser, refetchInterval: 60_000 });
  const active = useQuery({
    queryKey: ACTIVE_TASKS_KEY,
    queryFn: () => api.tasks.list(['UPCOMING', 'OVERDUE']),
    refetchInterval: 60_000,
  });
  const closed = useQuery({ queryKey: ['tasks', 'closed'], queryFn: api.tasks.recent });

  // Citirea listei poate marca misiuni ca restante (și scădea HP), deci profilul se reîncarcă după ea.
  useEffect(() => {
    if (active.dataUpdatedAt) void queryClient.invalidateQueries({ queryKey: ['me'] });
  }, [active.dataUpdatedAt, queryClient]);

  const refresh = useCallback(() => refreshTaskData(queryClient), [queryClient]);

  const onResult = ({ user }: TaskActionResponse) => queryClient.setQueryData<MeDto>(['me'], user);
  const onError = (err: unknown) => setError(err instanceof ApiRequestError ? err.message : 'Acțiunea nu a reușit.');

  const complete = useMutation({
    mutationFn: (task: TaskDto) => api.tasks.complete(task.id),
    onMutate: () => setError(null),
    onSuccess: (result) => {
      onResult(result);
      const until = result.task.undoAvailableUntil;
      setUndo(until ? { taskId: result.task.id, title: result.task.title, until: new Date(until).getTime(), reward: result.reward } : null);
    },
    onError,
    onSettled: refresh,
  });
  const cancel = useMutation({
    mutationFn: (task: TaskDto) => api.tasks.cancel(task.id),
    onMutate: () => setError(null),
    onSuccess: onResult,
    onError,
    onSettled: refresh,
  });
  const undoMutation = useMutation({
    mutationFn: (taskId: string) => api.tasks.undo(taskId),
    onSuccess: onResult,
    onError,
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (task: TaskDto) => api.tasks.remove(task.id),
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Ștergerea nu a reușit.'),
    onSettled: refresh,
  });

  const actions: TaskRowActions = {
    complete: (task) => complete.mutate(task),
    cancel: (task) => cancel.mutate(task),
    remove: (task) => remove.mutate(task),
    edit: (task) => router.push({ pathname: '/task', params: { id: task.id } }),
  };
  const expireUndo = useCallback(() => setUndo(null), []);

  const items = active.data?.items ?? [];
  const overdue = items.filter((t) => t.status === 'OVERDUE');
  const upcoming = items.filter((t) => t.status === 'UPCOMING');
  const completed = (closed.data?.items ?? []).filter((t) => t.status === 'COMPLETED');
  const cancelled = (closed.data?.items ?? []).filter((t) => t.status === 'CANCELLED');
  const haptics = !settings.calm;
  const row = (task: TaskDto) => <TaskRow key={task.id} task={task} actions={actions} haptics={haptics} />;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={active.isRefetching} onRefresh={() => void refresh()}>
        {me.data && <Hud me={me.data} />}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
          <Title>Tabla de misiuni</Title>
          <Button title="+ Nouă" onPress={() => router.push('/task')} accessibilityLabel="Misiune nouă" />
        </View>

        <FormError message={error ?? undefined} />

        {active.isPending ? (
          <Loading text="Se aprind torțele…" />
        ) : active.isError ? (
          <Empty text="Misiunile nu s-au putut încărca." action={<Button title="Încearcă din nou" onPress={() => void active.refetch()} />} />
        ) : items.length === 0 ? (
          <Empty
            text="Tabla e goală. Scrie o misiune cu termen și dificultate și îndeplinește-o la timp ca să câștigi experiență și aur."
            action={<Button title="Prima misiune" onPress={() => router.push('/task')} />}
          />
        ) : (
          <>
            {overdue.length > 0 && (
              <Group
                title={`☠ Monștri (${overdue.length})`}
                color={colors.blood}
                hint="Misiuni ratate care te-au rănit. Le poți termina și acum, pentru 25% experiență."
              >
                {overdue.map(row)}
              </Group>
            )}
            {upcoming.length > 0 && (
              <Group title={`⚔ În curs (${upcoming.length})`} color={colors.ink}>
                {upcoming.map(row)}
              </Group>
            )}
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>
              Glisează la dreapta pentru Completă, la stânga pentru Anulează sau Șterge.
            </Text>
          </>
        )}

        {completed.length > 0 && (
          <Collapsible title={`✓ Îndeplinite (${completed.length})`} color={colors.heal}>
            {completed.map(row)}
          </Collapsible>
        )}
        {cancelled.length > 0 && (
          <Collapsible title={`✕ Abandonate (${cancelled.length})`} color={colors.muted}>
            {cancelled.map(row)}
          </Collapsible>
        )}
      </Screen>

      {undo && (
        <UndoToast
          state={undo}
          animate={!reduceMotion}
          onExpire={expireUndo}
          onUndo={() => {
            undoMutation.mutate(undo.taskId);
            setUndo(null);
          }}
        />
      )}
    </View>
  );
}
