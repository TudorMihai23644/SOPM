import { DIFFICULTY_LABELS, TASK_STATUS_LABELS, type TaskDto, type TaskStatus } from '@deadlinehero/shared';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Swipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { formatDateTime, formatRemaining } from '../lib/time';
import { font, radius, space, TOUCH, useTheme, type Palette } from '../lib/theme';
import { Badge, Button } from './ui';

const STATUS_STYLE: Record<TaskStatus, { icon: string; color: keyof Palette }> = {
  UPCOMING: { icon: '⚔', color: 'ink' },
  OVERDUE: { icon: '☠', color: 'blood' },
  COMPLETED: { icon: '✓', color: 'heal' },
  CANCELLED: { icon: '✕', color: 'muted' },
};

export interface TaskRowActions {
  complete: (task: TaskDto) => void;
  cancel: (task: TaskDto) => void;
  remove: (task: TaskDto) => void;
  edit: (task: TaskDto) => void;
}

function Remaining({ deadline }: { deadline: string }) {
  const { colors } = useTheme();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const text = formatRemaining(deadline, now);
  const ms = new Date(deadline).getTime() - now;
  const color = !text ? colors.blood : ms < 3_600_000 ? colors.blood : ms < 86_400_000 ? colors.ember : colors.muted;
  return <Text style={[font.label, { color, fontVariant: ['tabular-nums'] }]}>{text ? `⧗ ${text}` : 'Timpul a expirat'}</Text>;
}

/**
 * O activitate din Quest Log. Swipe la dreapta: Completă (cu vibrație). Swipe la stânga:
 * Anulează / Șterge. Fiecare gest are și un buton echivalent (apăsare pe rând), pentru accesibilitate.
 */
export function TaskRow({ task, actions, haptics }: { task: TaskDto; actions: TaskRowActions; haptics: boolean }) {
  const { colors } = useTheme();
  const swipe = useRef<SwipeableMethods>(null);
  const [expanded, setExpanded] = useState(false);
  const active = task.status === 'UPCOMING' || task.status === 'OVERDUE';
  const style = STATUS_STYLE[task.status];

  const confirmDelete = () =>
    Alert.alert('Ștergi activitatea?', `„${task.title}” dispare definitiv. XP-ul deja primit rămâne.`, [
      { text: 'Renunță', style: 'cancel', onPress: () => swipe.current?.close() },
      { text: 'Șterge', style: 'destructive', onPress: () => actions.remove(task) },
    ]);

  const complete = () => {
    if (haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.complete(task);
  };

  const rightActions = () => (
    <View style={{ flexDirection: 'row' }}>
      {active && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Anulează activitatea"
          onPress={() => {
            swipe.current?.close();
            actions.cancel(task);
          }}
          style={[actionStyle, { backgroundColor: colors.panel2 }]}
        >
          <Text style={[font.label, { color: colors.ink }]}>Anulează</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Șterge activitatea"
        onPress={confirmDelete}
        style={[actionStyle, { backgroundColor: colors.blood }]}
      >
        <Text style={[font.label, { color: '#fff7ee' }]}>Șterge</Text>
      </Pressable>
    </View>
  );

  const leftActions = () => (
    <View style={[actionStyle, { backgroundColor: colors.heal, flex: 1, alignItems: 'flex-start', paddingLeft: space.xl }]}>
      <Text style={[font.label, { color: '#0b0907', fontSize: 14 }]}>✓ Completă</Text>
    </View>
  );

  return (
    <Swipeable
      ref={swipe}
      friction={1.5}
      leftThreshold={90}
      rightThreshold={40}
      overshootLeft={false}
      enabled={task.status !== 'CANCELLED'}
      renderLeftActions={active ? leftActions : undefined}
      renderRightActions={rightActions}
      onSwipeableWillOpen={(direction) => {
        if (haptics && direction === SwipeDirection.RIGHT) void Haptics.selectionAsync();
      }}
      onSwipeableOpen={(direction) => {
        // Panoul din stânga apare la swipe spre dreapta: activitatea devine Completă.
        if (direction === SwipeDirection.LEFT && active) {
          swipe.current?.close();
          complete();
        }
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}, ${TASK_STATUS_LABELS[task.status]}, ${DIFFICULTY_LABELS[task.difficulty]}`}
        accessibilityHint="Apasă pentru acțiuni. Glisează la dreapta pentru Completă, la stânga pentru Anulează sau Șterge."
        accessibilityActions={
          active
            ? [{ name: 'complete', label: 'Completă' }, { name: 'cancel', label: 'Anulează' }, { name: 'delete', label: 'Șterge' }]
            : [{ name: 'delete', label: 'Șterge' }]
        }
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'complete') complete();
          if (e.nativeEvent.actionName === 'cancel') actions.cancel(task);
          if (e.nativeEvent.actionName === 'delete') confirmDelete();
        }}
        onPress={() => setExpanded((x) => !x)}
        style={{
          backgroundColor: colors.panel,
          borderColor: task.status === 'OVERDUE' ? colors.blood : colors.line,
          borderWidth: 2,
          borderRadius: radius.md,
          padding: space.md,
          gap: space.sm,
          opacity: task.status === 'CANCELLED' ? 0.7 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700', flex: 1 }}>{task.title}</Text>
          {active ? <Remaining deadline={task.deadlineAt} /> : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
          <Badge icon={style.icon} text={TASK_STATUS_LABELS[task.status]} color={colors[style.color]} />
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {task.difficulty === 'HARD' ? '♛ Boss' : DIFFICULTY_LABELS[task.difficulty]} · {formatDateTime(task.deadlineAt)}
          </Text>
          {task.postponeCount > 0 && <Text style={{ color: colors.ember, fontSize: 13 }}>amânată ×{task.postponeCount}</Text>}
        </View>
        {expanded && (
          <View style={{ gap: space.sm }}>
            {task.description ? <Text style={{ color: colors.ink, fontSize: 15 }}>{task.description}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {active && <Button title="✓ Completă" onPress={complete} />}
              {task.status === 'UPCOMING' && <Button title="Editează" variant="secondary" onPress={() => actions.edit(task)} />}
              {active && <Button title="Anulează" variant="secondary" onPress={() => actions.cancel(task)} />}
              <Button title="Șterge" variant="ghost" onPress={confirmDelete} />
            </View>
          </View>
        )}
      </Pressable>
    </Swipeable>
  );
}

const actionStyle = {
  minWidth: 96,
  minHeight: TOUCH,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  borderRadius: radius.md,
  marginLeft: space.xs,
};
