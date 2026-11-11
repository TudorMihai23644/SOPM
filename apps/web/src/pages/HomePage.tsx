import type { MeDto } from '@deadlinehero/shared';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { StatBar } from '../components/StatBar';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function HomePage({ initialUser }: { initialUser: MeDto }) {
  const { logout } = useAuth();
  const { data: me = initialUser } = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser });

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline dark:text-slate-400">{me.nickname}</span>
            <Button variant="secondary" onClick={() => void logout()}>
              Ieși
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <section aria-labelledby="hero-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="hero-title" className="text-2xl font-bold">
              Salut, {me.nickname}!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nivelul <strong className="text-slate-900 dark:text-slate-100">{me.level}</strong> ·{' '}
              <strong className="text-slate-900 dark:text-slate-100">{me.coins}</strong> monede
            </p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <StatBar label="XP până la nivelul următor" value={me.xpInLevel} max={me.xpToNextLevel} color="xp" />
            <StatBar label="HP" value={me.hp} max={me.hpMax} color="hp" />
          </div>
        </section>

        <section aria-labelledby="quests-title" className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <h2 id="quests-title" className="text-lg font-semibold">
            Quest Log
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Aici vor apărea activitățile tale. Finalizează-le la timp ca să câștigi XP și monede.
          </p>
        </section>
      </main>
    </div>
  );
}
