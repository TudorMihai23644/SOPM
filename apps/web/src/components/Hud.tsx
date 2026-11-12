import type { MeDto } from '@deadlinehero/shared';
import { useEffect, useRef, useState } from 'react';
import { useFx } from '../lib/fx';
import { consumeSilentUpdate } from '../lib/player';
import { HeroSprite, moodForHp } from './Sprite';
import { StatBar } from './StatBar';

/**
 * HUD-ul jucătorului. Compară profilul cu cel anterior: o scădere de HP produce
 * o lovitură pe ecran, iar revenirea la 50 HP cu monede pierdute înseamnă K.O.
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
      fx.float(`−${lostHp} HP`, 'damage');
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

  const mood = moodForHp(me.hp);
  return (
    <section
      aria-label="Starea eroului"
      className={`panel relative overflow-hidden p-4 sm:p-5 ${shaking ? 'animate-shake border-danger' : ''}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
          <div className="rounded-md border-2 border-line bg-void p-2">
            <HeroSprite mood={mood} />
          </div>
          <div className="sm:text-center">
            <p className="pixel text-[10px] text-muted">PLAYER 1</p>
            <p className="font-bold break-all text-ink">{me.nickname}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="pixel glow-cyan text-sm text-cyan">LVL {String(me.level).padStart(2, '0')}</p>
            <p className="pixel glow-gold text-sm text-gold" aria-label={`${me.coins} monede`}>
              ◇ {String(me.coins).padStart(4, '0')}
            </p>
            <p
              className={`pixel text-sm ${me.comboMultiplier > 1 ? 'glow-pink text-pink' : 'text-muted'}`}
              title="COMBO: +5% XP pentru fiecare zi la rând cu cel puțin o misiune terminată la timp (maximum ×1,5)"
            >
              COMBO ×{me.comboMultiplier.toFixed(2)}
            </p>
            <p className="text-sm text-muted">
              Serie: <strong className="text-ink">{me.streakDays}</strong> {me.streakDays === 1 ? 'zi' : 'zile'}
            </p>
          </div>
          <StatBar label="HP" value={me.hp} max={me.hpMax} color="hp" />
          <StatBar label={`XP → LVL ${me.level + 1}`} value={me.xpInLevel} max={me.xpToNextLevel} color="xp" />
          <StatBar label="STAMINA AZI" value={me.staminaUsed} max={me.staminaMax} color="stamina" segments={15} />
        </div>
      </div>
    </section>
  );
}
