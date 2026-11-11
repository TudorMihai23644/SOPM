import type { MeDto } from '@deadlinehero/shared';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../components/AppHeader';
import { QuestLog } from '../components/QuestLog';
import { StatBar } from '../components/StatBar';
import { api } from '../lib/api';

export function HomePage({ initialUser }: { initialUser: MeDto }) {
  const { data: me = initialUser } = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser });

  return (
    <div className="min-h-screen pb-24">
      <AppHeader nickname={me.nickname} />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <section
          aria-labelledby="hero-title"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
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
        <QuestLog />
      </main>
    </div>
  );
}
