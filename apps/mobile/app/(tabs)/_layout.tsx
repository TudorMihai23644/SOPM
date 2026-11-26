import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue } from 'react-native';
import { useTheme } from '../../src/lib/theme';

function icon(glyph: string) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.line, borderTopWidth: 2, minHeight: 60 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Misiuni', tabBarIcon: icon('⚔') }} />
      <Tabs.Screen name="team" options={{ title: 'Echipa', tabBarIcon: icon('⛨') }} />
      <Tabs.Screen name="history" options={{ title: 'Istoric', tabBarIcon: icon('📜') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('☰') }} />
    </Tabs>
  );
}
