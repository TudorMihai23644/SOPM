import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading } from '../src/components/ui';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { ThemeProvider, useTheme } from '../src/lib/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

// Datele se reîmprospătează când aplicația revine în prim-plan.
AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));

function RootStack() {
  const { state } = useAuth();
  const { colors, name } = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <Loading text="Se aprind torțele…" />
      </View>
    );
  }

  const authed = state.status === 'authenticated';
  const modal = {
    presentation: 'modal' as const,
    headerShown: true,
    headerStyle: { backgroundColor: colors.panel },
    headerTintColor: colors.gold,
    headerTitleStyle: { color: colors.ink },
  };

  return (
    <>
      <StatusBar style={name === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={authed}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task" options={{ ...modal, title: 'Misiune' }} />
          <Stack.Screen name="quest-new" options={{ ...modal, title: 'Shared Quest nou' }} />
        </Stack.Protected>
        <Stack.Protected guard={!authed}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot" options={{ ...modal, title: 'Parolă uitată' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <RootStack />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
