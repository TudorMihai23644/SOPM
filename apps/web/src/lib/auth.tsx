import type { LoginInput, MeDto, RegisterInput } from '@deadlinehero/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';

type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: MeDto };

interface AuthContextValue {
  state: AuthState;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const queryClient = useQueryClient();

  // La deschiderea aplicației, sesiunea se reia din cookie-ul de refresh, dacă există.
  useEffect(() => {
    let cancelled = false;
    api
      .refresh()
      .then(({ user }) => !cancelled && setState({ status: 'authenticated', user }))
      .catch(() => !cancelled && setState({ status: 'anonymous' }));
    return () => {
      cancelled = true;
    };
  }, []);

  const onSession = useCallback(
    (user: MeDto) => {
      queryClient.setQueryData(['me'], user);
      setState({ status: 'authenticated', user });
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login: async (input) => onSession((await api.login(input)).user),
      register: async (input) => onSession((await api.register(input)).user),
      logout: async () => {
        await api.logout().catch(() => undefined);
        queryClient.clear();
        setState({ status: 'anonymous' });
      },
    }),
    [state, onSession, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth trebuie folosit în AuthProvider');
  return context;
}
