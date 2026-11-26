import type { MeDto } from '@deadlinehero/shared';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPages';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { TeamPage } from './pages/TeamPage';

function Loading() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center font-display text-gold">
      Se aprind torțele…
    </div>
  );
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'authenticated') return <Navigate to="/" replace />;
  return children;
}

function Protected({ children }: { children: (user: MeDto) => ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'anonymous') return <Navigate to="/autentificare" replace />;
  return children(state.user);
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Protected>{(user) => <HomePage initialUser={user} />}</Protected>} />
      <Route path="/istoric" element={<Protected>{() => <HistoryPage />}</Protected>} />
      <Route path="/echipa" element={<Protected>{(user) => <TeamPage initialUser={user} />}</Protected>} />
      <Route path="/profil" element={<Protected>{(user) => <ProfilePage initialUser={user} />}</Protected>} />
      <Route path="/parola-uitata" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/resetare-parola" element={<ResetPasswordPage />} />
      <Route path="/autentificare" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/inregistrare" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
