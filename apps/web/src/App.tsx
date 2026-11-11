import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function Loading() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center text-slate-500">
      Se încarcă…
    </div>
  );
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'authenticated') return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'anonymous') return <Navigate to="/autentificare" replace />;
  return <HomePage initialUser={state.user} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/autentificare" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/inregistrare" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
