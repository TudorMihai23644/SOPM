import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { font, radius, space, TOUCH, useTheme } from '../lib/theme';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.gold} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'blood' | 'mana' | 'gold' }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: tone ? colors[tone] : colors.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children, size = 22 }: { children: ReactNode; size?: number }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[font.display, { color: colors.gold, fontSize: size }]}>
      {children}
    </Text>
  );
}

export function Label({ children, color }: { children: ReactNode; color?: string }) {
  const { colors } = useTheme();
  return <Text style={[font.label, { color: color ?? colors.muted }]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[{ color: muted ? colors.muted : colors.ink, fontSize: 16, lineHeight: 22 }, style]}>{children}</Text>;
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  accessibilityLabel,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const palette: Record<Variant, { bg: string; border: string; fg: string }> = {
    primary: { bg: colors.gold, border: colors.gold, fg: colors.onGold },
    secondary: { bg: colors.panel2, border: colors.line, fg: colors.ink },
    danger: { bg: colors.blood, border: colors.blood, fg: '#fff7ee' },
    ghost: { bg: 'transparent', border: 'transparent', fg: colors.gold },
  };
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: p.bg, borderColor: p.border, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={p.fg} /> : <Text style={[font.label, { color: p.fg, fontSize: 14 }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, hint, ...input }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { color: colors.ink, backgroundColor: colors.bg, borderColor: error ? colors.blood : colors.line },
          input.multiline ? { minHeight: 88, textAlignVertical: 'top' } : null,
        ]}
        {...input}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.blood, fontSize: 14 }}>
          ✖ {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.muted, fontSize: 14 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function FormError({ message }: { message?: string }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={[styles.alert, { borderColor: colors.blood }]}>
      <Text style={{ color: colors.blood, fontSize: 15 }}>{message}</Text>
    </View>
  );
}

export function Notice({ message, tone = 'heal' }: { message?: string | null; tone?: 'heal' | 'gold' | 'mana' }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.alert, { borderColor: colors[tone] }]}>
      <Text style={{ color: colors[tone], fontSize: 15 }}>{message}</Text>
    </View>
  );
}

const BAR_COLORS = { xp: 'gold', hp: 'blood', stamina: 'mana' } as const;

/** Bară de progres; valoarea apare și ca text, nu doar prin culoare. */
export function StatBar({ label, value, max, kind }: { label: string; value: number; max: number; kind: keyof typeof BAR_COLORS }) {
  const { colors } = useTheme();
  const color = colors[BAR_COLORS[kind]];
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value, text: `${value} din ${max}` }}
      style={{ gap: 4 }}
    >
      <View style={styles.row}>
        <Label color={color}>{label}</Label>
        <Text style={{ color: colors.ink, fontSize: 13, fontVariant: ['tabular-nums'] }}>
          {value} / {max}
        </Text>
      </View>
      <View style={[styles.track, { borderColor: colors.line, backgroundColor: colors.bg }]}>
        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Stare cu pictogramă și text (nu doar culoare). */
export function Badge({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[font.label, { color, fontSize: 11 }]}>
        {icon} {text}
      </Text>
    </View>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.line }]}>
      <Body muted style={{ textAlign: 'center' }}>
        {text}
      </Body>
      {action}
    </View>
  );
}

export function Loading({ text = 'Se încarcă…' }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
      <ActivityIndicator color={colors.gold} />
      <Body muted>{text}</Body>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: radius.md, padding: space.lg, gap: space.md },
  button: {
    minHeight: TOUCH,
    minWidth: TOUCH,
    paddingHorizontal: space.lg,
    borderWidth: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { minHeight: TOUCH, borderWidth: 2, borderRadius: radius.sm, paddingHorizontal: space.md, fontSize: 16 },
  alert: { borderWidth: 2, borderRadius: radius.sm, padding: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  track: { height: 12, borderWidth: 1, borderRadius: 2, overflow: 'hidden' },
  badge: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  empty: { borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.md, padding: space.xl, gap: space.md, alignItems: 'center' },
});
