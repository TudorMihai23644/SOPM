import { HISTORY_EVENT_LABELS, type HistoryEntryDto, type HistoryEvent } from '@deadlinehero/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Empty, Loading, Title } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { formatDateTime } from '../../src/lib/time';
import { radius, space, useTheme, type Palette } from '../../src/lib/theme';

const EVENT_TONE: Record<HistoryEvent, keyof Palette> = {
  CREATED: 'ink',
  COMPLETED: 'heal',
  COMPLETED_LATE: 'gold',
  CANCELLED: 'muted',
  OVERDUE: 'blood',
  UNDONE: 'arcane',
  POSTPONED: 'gold',
  DELETED: 'muted',
};

const NOTES: Record<string, string> = {
  TOO_FAST: 'prea rapid, fără recompensă',
  KO: 'eroul a căzut',
};

function describe(entry: HistoryEntryDto): string {
  const label = HISTORY_EVENT_LABELS[entry.event];
  return entry.note && NOTES[entry.note] ? `${label} · ${NOTES[entry.note]}` : label;
}

/** Cronica eroului: lista paginată a evenimentelor, cea mai nouă prima. */
export default function HistoryScreen() {
  const { colors } = useTheme();
  const history = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => api.history(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = history.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: space.xxl * 2 }}
        refreshing={history.isRefetching && !history.isFetchingNextPage}
        onRefresh={() => void history.refetch()}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={{ gap: space.xs, marginBottom: space.md }}>
            <Title size={26}>Cronica eroului</Title>
            <Body muted>Tot ce s-a întâmplat cu misiunile tale, cea mai nouă faptă prima.</Body>
          </View>
        }
        ListEmptyComponent={
          history.isPending ? (
            <Loading text="Se deschide cronica…" />
          ) : history.isError ? (
            <Empty text="Cronica nu s-a putut încărca." action={<Button title="Încearcă din nou" onPress={() => void history.refetch()} />} />
          ) : (
            <Empty text="Cronica e încă goală. Scrie prima misiune pe tabla de misiuni." />
          )
        }
        ListFooterComponent={history.isFetchingNextPage ? <Loading /> : undefined}
        renderItem={({ item }) => (
          <View
            accessible
            accessibilityLabel={`${item.taskTitle}: ${describe(item)}, ${formatDateTime(item.at)}`}
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.line,
              borderWidth: 2,
              borderRadius: radius.md,
              padding: space.md,
              gap: 2,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16, flex: 1 }}>{item.taskTitle}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontVariant: ['tabular-nums'] }}>{formatDateTime(item.at)}</Text>
            </View>
            <Text style={{ color: colors[EVENT_TONE[item.event]], fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }}>
              {describe(item)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
