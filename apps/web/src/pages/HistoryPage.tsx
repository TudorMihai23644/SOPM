import { HISTORY_EVENT_LABELS, type MeDto } from '@deadlinehero/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/time';

export function HistoryPage({ initialUser }: { initialUser: MeDto }) {
  const { data: me = initialUser } = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser });
  const history = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => api.history(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = history.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader nickname={me.nickname} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Istoric</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Fiecare schimbare de stare a activităților tale, cea mai nouă prima.</p>

        {history.isPending ? (
          <p role="status" className="mt-6 text-slate-500">
            Se încarcă…
          </p>
        ) : entries.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Încă nu s-a întâmplat nimic. Creează o activitate din Quest Log.
          </p>
        ) : (
          <ol className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">{entry.taskTitle}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{HISTORY_EVENT_LABELS[entry.event]}</p>
                </div>
                <time dateTime={entry.at} className="text-sm text-slate-500 tabular-nums">
                  {formatDateTime(entry.at)}
                </time>
              </li>
            ))}
          </ol>
        )}

        {history.hasNextPage && (
          <Button variant="secondary" className="mt-4" loading={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
            Încarcă mai multe
          </Button>
        )}
      </main>
    </div>
  );
}
