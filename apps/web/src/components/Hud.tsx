import type { MeDto } from '@deadlinehero/shared';
import { useEffect, useRef, useState } from 'react';
import { useFx } from '../lib/fx';
import { consumeSilentUpdate } from '../lib/player';
import { Orb } from './Orb';
import { HeroPortrait, moodForHp } from './Portrait';
import { StatBar } from './StatBar';

/**
 * Panoul eroului. Compară profilul cu cel anterior: o scădere de HP produce
 * o lovitură pe ecran, iar revenirea la 50 HP cu monede pierdute înseamnă căderea eroului.
 */
export function Hud({ me }: { me: MeDto }) {
  const fx = useFx();
  const previous = useRef(me);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const before = previous.current;
    previous.current = me;
    if (consumeSilentUpdate() || before.id !== me.id) return;

    const lostHp = before.hp - me.hp;
    const ko = me.hp > before.hp && me.coins < before.coins && me.xpTotal === before.xpTotal;
    if (ko) {
      fx.ko(before.coins - me.coins);
      fx.hit();
    } else if (lostHp > 0) {
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

  return (
    <section aria-label="Starea eroului" className={`panel panel-ornate p-4 sm:p-6 ${shaking ? 'animate-shake border-blood' : ''}`}>
      <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
        <Orb label="Viață" value={me.hp} max={me.hpMax} kind="life" />

        <div className="order-first col-span-2 flex flex-col items-center gap-3 text-center sm:order-none sm:col-span-1">
          <div className="flex items-center gap-4">
            <HeroPortrait mood={moodForHp(me.hp)} />
            <div className="text-left">
              <p className="font-display text-xl font-bold break-all text-ink">{me.nickname}</p>
              <p className="font-display text-sm text-gold">Nivelul {me.level}</p>
              <p className="text-sm text-muted" aria-label={`${me.coins} monede de aur`}>
                <span className="text-gold">◈</span> {me.coins} aur
              </p>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <StatBar label={`Experiență · nivelul ${me.level + 1}`} value={me.xpInLevel} max={me.xpToNextLevel} color="xp" />
          </div>
          <p
            className={`font-display text-sm font-bold ${me.comboMultiplier > 1 ? 'glow-ember text-ember' : 'text-muted'}`}
            title="Seria: +5% experiență pentru fiecare zi la rând cu cel puțin o misiune terminată la timp (maximum ×1,5)"
          >
            🔥 Serie {me.streakDays} {me.streakDays === 1 ? 'zi' : 'zile'} · bonus ×{me.comboMultiplier.toFixed(2)}
          </p>
        </div>

        <Orb label="Stamina" value={me.staminaMax - me.staminaUsed} max={me.staminaMax} kind="stamina" />
      </div>
    </section>
  );
}
