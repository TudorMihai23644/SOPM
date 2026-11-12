import type { MeDto } from '@deadlinehero/shared';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFx } from '../lib/fx';
import { consumeSilentUpdate } from '../lib/player';
import { activeTasksQuery } from '../lib/queries';
import { emitScene, supportsWebGL } from '../scene/events';
import { Orb } from './Orb';
import { HeroPortrait, moodForHp } from './Portrait';
import { StatBar } from './StatBar';

// Scena 3D (Three.js) se încarcă separat, după restul paginii.
const HeroScene = lazy(() => import('../scene/HeroScene'));

/**
 * Panoul eroului. Compară profilul cu cel anterior: o scădere de viață produce
 * o lovitură, iar revenirea la 50 cu aur pierdut înseamnă căderea eroului.
 */
export function Hud({ me }: { me: MeDto }) {
  const fx = useFx();
  const previous = useRef(me);
  const [shaking, setShaking] = useState(false);
  const webgl = useMemo(supportsWebGL, []);
  const show3d = webgl && !fx.settings.calm;
  const { data } = useQuery(activeTasksQuery);
  const enemies = useMemo(
    () => (data?.items ?? []).filter((t) => t.status === 'OVERDUE').map((t) => ({ id: t.id, boss: t.difficulty === 'HARD' })),
    [data],
  );

  useEffect(() => {
    const before = previous.current;
    previous.current = me;
    if (consumeSilentUpdate() || before.id !== me.id) return;

    const lostHp = before.hp - me.hp;
    const ko = me.hp > before.hp && me.coins < before.coins && me.xpTotal === before.xpTotal;
    if (ko) {
      emitScene({ type: 'ko' });
      setTimeout(() => fx.ko(before.coins - me.coins), show3d ? 1500 : 0);
      fx.hit();
    } else if (lostHp > 0) {
      emitScene({ type: 'hit' });
      fx.float(`−${lostHp} viață`, 'damage');
      fx.sfx('damage');
      fx.hit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    if (fx.hitCount === 0) return;
    setShaking(true);
    const timer = setTimeout(() => setShaking(false), 500);
    return () => clearTimeout(timer);
  }, [fx.hitCount]);

  const portrait = (
    <div className="flex h-full items-center justify-center">
      <HeroPortrait mood={moodForHp(me.hp)} size={120} />
    </div>
  );

  return (
    <section aria-label="Starea eroului" className={`panel panel-ornate overflow-hidden ${shaking && !show3d ? 'animate-shake border-blood' : ''}`}>
      <div className="relative h-60 border-b-2 border-line sm:h-72">
        {show3d ? <Suspense fallback={portrait}>{<HeroScene enemies={enemies} />}</Suspense> : portrait}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-2 sm:p-3">
          <Orb label="Viață" value={me.hp} max={me.hpMax} kind="life" compact />
          <Orb label="Stamina" value={me.staminaMax - me.staminaUsed} max={me.staminaMax} kind="stamina" compact />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <div className="shrink-0">
          <p className="font-display text-xl font-bold break-all text-ink">{me.nickname}</p>
          <p className="font-display text-sm text-gold">
            Nivelul {me.level} <span className="text-muted">·</span>{' '}
            <span aria-label={`${me.coins} monede de aur`}>◈ {me.coins} aur</span>
          </p>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <StatBar label={`Experiență · nivelul ${me.level + 1}`} value={me.xpInLevel} max={me.xpToNextLevel} color="xp" />
          <p
            className={`font-display text-sm font-bold ${me.comboMultiplier > 1 ? 'glow-ember text-ember' : 'text-muted'}`}
            title="Seria: +5% experiență pentru fiecare zi la rând cu cel puțin o misiune terminată la timp (maximum ×1,5)"
          >
            🔥 Serie {me.streakDays} {me.streakDays === 1 ? 'zi' : 'zile'} · bonus ×{me.comboMultiplier.toFixed(2)}
          </p>
        </div>
      </div>
    </section>
  );
}
