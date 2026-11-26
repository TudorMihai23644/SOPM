import { DEFAULT_GAME_CONFIG, DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '@deadlinehero/shared';
import { Pressable, Text, View } from 'react-native';
import { radius, space, TOUCH, useTheme } from '../lib/theme';
import { Label } from './ui';

/** Alegerea dificultății, cu recompensa afișată pentru fiecare variantă. */
export function DifficultyPicker({ value, onChange, error }: { value: Difficulty; onChange: (d: Difficulty) => void; error?: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Dificultate" style={{ gap: space.xs }}>
      <Label>Dificultate</Label>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {DIFFICULTIES.map((difficulty) => {
          const selected = value === difficulty;
          const reward = DEFAULT_GAME_CONFIG.difficulty[difficulty];
          return (
            <Pressable
              key={difficulty}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${DIFFICULTY_LABELS[difficulty]}: ${reward.xp} XP, ${reward.coins} monede`}
              onPress={() => onChange(difficulty)}
              style={{
                flex: 1,
                minHeight: TOUCH,
                borderWidth: 2,
                borderRadius: radius.sm,
                borderColor: selected ? colors.gold : colors.line,
                backgroundColor: selected ? colors.panel2 : colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: space.sm,
              }}
            >
              <Text style={{ color: selected ? colors.gold : colors.ink, fontWeight: '800' }}>
                {difficulty === 'HARD' ? '♛ ' : ''}
                {DIFFICULTY_LABELS[difficulty]}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {reward.xp} XP · ◈ {reward.coins}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={{ color: colors.blood, fontSize: 14 }}>✖ {error}</Text>}
    </View>
  );
}
