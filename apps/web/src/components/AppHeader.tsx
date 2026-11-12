import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useFx } from '../lib/fx';
import { Button } from './Button';
import { Logo } from './Logo';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-md border-2 px-3 text-sm font-bold tracking-wide uppercase ${
    isActive ? 'border-cyan text-cyan' : 'border-transparent text-muted hover:text-ink'
  }`;

const toggleClass = (on: boolean) =>
  `inline-flex h-11 min-w-11 items-center justify-center rounded-md border-2 px-2 text-sm font-bold ${
    on ? 'border-gold text-gold' : 'border-line text-muted hover:text-ink'
  }`;

function Nav() {
  return (
    <>
      <NavLink to="/" end className={linkClass}>
        Quest Log
      </NavLink>
      <NavLink to="/istoric" className={linkClass}>
        Istoric
      </NavLink>
    </>
  );
}

export function AppHeader() {
  const { logout } = useAuth();
  const { settings, setSettings } = useFx();
  return (
    <header className="sticky top-0 z-20 border-b-2 border-line bg-void/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-4">
          <Logo />
          <nav aria-label="Navigare principală" className="hidden gap-1 sm:flex">
            <Nav />
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={toggleClass(settings.sound && !settings.calm)}
            aria-pressed={settings.sound}
            aria-label="Sunet"
            title={settings.sound ? 'Oprește sunetul' : 'Pornește sunetul'}
            onClick={() => setSettings({ sound: !settings.sound })}
          >
            {settings.sound ? '♪' : '♪̸'}
          </button>
          <button
            type="button"
            className={toggleClass(settings.calm)}
            aria-pressed={settings.calm}
            title="Mod calm: fără animații, fără sunete"
            onClick={() => setSettings({ calm: !settings.calm })}
          >
            Calm
          </button>
          <Button variant="ghost" onClick={() => void logout()}>
            Ieși
          </Button>
        </div>
      </div>
      <nav aria-label="Navigare principală" className="flex gap-1 border-t border-line px-4 py-1 sm:hidden">
        <Nav />
      </nav>
    </header>
  );
}
