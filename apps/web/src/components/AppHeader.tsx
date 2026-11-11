import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from './Button';
import { Logo } from './Logo';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${
    isActive ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
  }`;

export function AppHeader({ nickname }: { nickname: string }) {
  const { logout } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-4">
          <Logo />
          <nav aria-label="Navigare principală" className="hidden gap-1 sm:flex">
            <NavLink to="/" end className={linkClass}>
              Quest Log
            </NavLink>
            <NavLink to="/istoric" className={linkClass}>
              Istoric
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-600 md:inline dark:text-slate-400">{nickname}</span>
          <Button variant="secondary" onClick={() => void logout()}>
            Ieși
          </Button>
        </div>
      </div>
      <nav aria-label="Navigare principală" className="flex gap-1 border-t border-slate-100 px-4 py-1 sm:hidden dark:border-slate-800">
        <NavLink to="/" end className={linkClass}>
          Quest Log
        </NavLink>
        <NavLink to="/istoric" className={linkClass}>
          Istoric
        </NavLink>
      </nav>
    </header>
  );
}
