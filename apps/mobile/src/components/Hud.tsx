import type { MeDto } from '@deadlinehero/shared';
import { Text, View } from 'react-native';
import { font, space, useTheme } from '../lib/theme';
import { Card, StatBar } from './ui';

/** Avatarul simplificat: expresia după HP, ca în specificații (70–100 energic … 0 KO). */
function mood(hp: number): { face: string; label: string } {
  if (hp >= 70) return { face: '😄', label: 'Energic' };
  if (hp >= 30) return { face: '😐', label: 'Obișnuit' };
  if (hp > 0) return { face: '😩', label: 'Obosit' };
  return { face: '💫', label: 'KO' };
}

export function Hud({ me }: { me: MeDto }) {
  const { colors } = useTheme();
  const m = mood(me.hp);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text accessibilityLabel={`Starea eroului: ${m.label}`} style={{ fontSize: 40 }}>
          {m.face}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={[font.display, { color: colors.gold, fontSize: 20 }]}>{me.nickname}</Text>
          <Text style={{ color: colors.muted }}>
            Nivelul {me.level} · {m.label}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text accessibilityLabel={`${me.coins} monede`} style={[font.display, { color: colors.gold, fontSize: 20 }]}>
            ◈ {me.coins}
          </Text>
          {me.streakDays > 0 && (
            <Text style={{ color: colors.ember, fontWeight: '700' }}>
              🔥 {me.streakDays} zile · ×{me.comboMultiplier.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
      <StatBar label={`XP · nivelul ${me.level}`} value={me.xpInLevel} max={me.xpToNextLevel} kind="xp" />
      <StatBar label="Viață (HP)" value={me.hp} max={me.hpMax} kind="hp" />
      <StatBar label="Stamina azi" value={me.staminaMax - me.staminaUsed} max={me.staminaMax} kind="stamina" />
    </Card>
  );
}
