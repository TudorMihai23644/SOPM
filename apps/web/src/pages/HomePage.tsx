import type { MeDto } from '@deadlinehero/shared';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../components/AppHeader';
import { Hud } from '../components/Hud';
import { QuestLog } from '../components/QuestLog';
import { api } from '../lib/api';

export function HomePage({ initialUser }: { initialUser: MeDto }) {
  // Profilul se reîmprospătează la un minut, ca HP-ul pierdut pe misiunile ratate să apară singur.
  const { data: me = initialUser } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    initialData: initialUser,
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen pb-28">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-6">
        <h1 className="sr-only">Quest Log</h1>
        <Hud me={me} />
        <QuestLog />
      </main>
    </div>
  );
}
