import type { RewardDto } from '@deadlinehero/shared';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { font, radius, space, useTheme } from '../lib/theme';
import { Button } from './ui';

export interface UndoState {
  taskId: string;
  title: string;
  until: number;
  reward?: RewardDto;
}

function rewardText(reward?: RewardDto): string {
  if (!reward) return 'Activitate completă';
  if (reward.tooFast) return 'Prea rapid: fără recompensă (sub 60 s)';
  const parts = [`+${reward.xp} XP`];
  if (reward.coins > 0) parts.push(`◈ +${reward.coins}`);
  if (reward.hp > 0) parts.push(`+${reward.hp} HP`);
  if (reward.levelsGained > 0) parts.push(`Nivelul ${reward.level}!`);
  if (reward.staminaCapped) parts.push('plafon Stamina');
  return parts.join('  ');
}

/** Recompensa și butonul „Anulează”, vizibile 10 secunde după finalizare (o singură dată). */
export function UndoToast({ state, onUndo, onExpire, animate }: { state: UndoState; onUndo: () => void; onExpire: () => void; animate: boolean }) {
  const { colors } = useTheme();
  const [left, setLeft] = useState(() => Math.ceil((state.until - Date.now()) / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = Math.ceil((state.until - Date.now()) / 1000);
      setLeft(seconds);
      if (seconds <= 0) onExpire();
    }, 250);
    return () => clearInterval(timer);
  }, [state.until, onExpire]);

  return (
    <Animated.View
      entering={animate ? FadeInDown.springify() : undefined}
      exiting={animate ? FadeOutDown : undefined}
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: space.lg,
        right: space.lg,
        bottom: space.lg,
        backgroundColor: colors.panel2,
        borderColor: colors.gold,
        borderWidth: 2,
        borderRadius: radius.md,
        padding: space.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700' }}>
          ✓ {state.title}
        </Text>
        <Text style={[font.label, { color: colors.gold, fontSize: 13 }]}>{rewardText(state.reward)}</Text>
      </View>
      <Button title={`Anulează (${Math.max(0, left)})`} variant="secondary" onPress={onUndo} />
    </Animated.View>
  );
}
