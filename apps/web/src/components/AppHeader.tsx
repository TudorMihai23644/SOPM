import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useFx } from '../lib/fx';
import { Button } from './Button';
import { Logo } from './Logo';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center border-b-2 px-3 font-display text-sm font-bold tracking-wider uppercase ${
    isActive ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-ink'
  }`;

const toggleClass = (on: boolean) =>
  `inline-flex h-11 min-w-11 items-center justify-center rounded-[3px] border-2 px-2 text-sm font-bold ${
    on ? 'border-gold text-gold' : 'border-line text-muted hover:text-ink'
  }`;

function Nav() {
  return (
    <>
      <NavLink to="/" end className={linkClass}>
        Misiuni
      </NavLink>
      <NavLink to="/istoric" className={linkClass}>
        Cronică
      </NavLink>
    </>
  );
}

export function AppHeader() {
  const { logout } = useAuth();
  const { settings, setSettings } = useFx();
  return (
    <header className="sticky top-0 z-20 border-b-2 border-line bg-abyss/95 shadow-[0_6px_20px_rgb(0_0_0/0.6)] backdrop-blur">
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
      <nav aria-label="Navigare principală" className="flex gap-1 border-t border-line px-4 sm:hidden">
        <Nav />
      </nav>
    </header>
  );
}
