import { HISTORY_EVENT_LABELS, type HistoryEntryDto } from '@deadlinehero/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/time';

const EVENT_TONE: Record<string, string> = {
  CREATED: 'text-cyan',
  COMPLETED: 'text-lime',
  COMPLETED_LATE: 'text-gold',
  CANCELLED: 'text-muted',
  OVERDUE: 'text-danger',
  UNDONE: 'text-violet',
  POSTPONED: 'text-gold',
  DELETED: 'text-muted',
};

const NOTES: Record<string, string> = {
  TOO_FAST: 'prea rapid, fără recompensă',
  KO: 'K.O.!',
};

function describe(entry: HistoryEntryDto): string {
  const label = HISTORY_EVENT_LABELS[entry.event];
  return entry.note && NOTES[entry.note] ? `${label} · ${NOTES[entry.note]}` : label;
}

export function HistoryPage() {
  const history = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => api.history(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = history.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="pixel glow-cyan text-base text-cyan">ISTORIC</h1>
        <p className="mt-3 text-muted">Fiecare schimbare de stare a misiunilor tale, cea mai nouă prima.</p>

        {history.isPending ? (
          <p role="status" className="pixel mt-6 text-xs text-muted">
            LOADING…
          </p>
        ) : entries.length === 0 ? (
          <p className="panel mt-6 border-dashed p-10 text-center text-muted">
            Încă nu s-a întâmplat nimic. Creează o misiune din Quest Log.
          </p>
        ) : (
          <ol className="panel mt-6 divide-y-2 divide-line">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold break-words text-ink">{entry.taskTitle}</p>
                  <p className={`text-sm font-semibold uppercase ${EVENT_TONE[entry.event] ?? 'text-muted'}`}>{describe(entry)}</p>
                </div>
                <time dateTime={entry.at} className="text-sm text-muted tabular-nums">
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
