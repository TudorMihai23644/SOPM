import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { playSfx, type Sfx } from './sound';

type Tone = 'xp' | 'coin' | 'hp' | 'damage' | 'combo' | 'info';

interface FloatingText {
  id: number;
  text: string;
  tone: Tone;
  offset: number;
}

type Overlay = { kind: 'levelUp'; level: number; coins: number } | { kind: 'ko'; coinsLost: number } | null;

interface Settings {
  sound: boolean;
  calm: boolean;
}

interface FxContextValue {
  settings: Settings;
  setSettings: (next: Partial<Settings>) => void;
  /** Text care sare din HUD: „+26 XP”, „−15 HP”. */
  float: (text: string, tone: Tone) => void;
  sfx: (name: Sfx) => void;
  levelUp: (level: number, coins: number) => void;
  ko: (coinsLost: number) => void;
  /** Crește la fiecare lovitură, ca HUD-ul să tremure. */
  hitCount: number;
  hit: () => void;
}

const FxContext = createContext<FxContextValue | null>(null);
const STORAGE_KEY = 'deadlinehero.settings';

function loadSettings(): Settings {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return { sound: saved.sound ?? true, calm: saved.calm ?? Boolean(reduceMotion) };
  } catch {
    return { sound: true, calm: Boolean(reduceMotion) };
  }
}

const TONES: Record<Tone, string> = {
  xp: 'text-gold glow-gold',
  coin: 'text-gold glow-gold',
  hp: 'text-heal glow-heal',
  damage: 'text-blood glow-blood',
  combo: 'text-ember glow-ember',
  info: 'text-ink',
};

export function FxProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [hitCount, setHitCount] = useState(0);
  const nextId = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.calm = String(settings.calm);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Stocarea locală poate lipsi (mod privat); setările rămân doar pentru sesiunea curentă.
    }
  }, [settings]);

  const setSettings = useCallback((next: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...next })), []);

  const sfx = useCallback(
    (name: Sfx) => {
      if (settings.sound && !settings.calm) playSfx(name);
    },
    [settings.sound, settings.calm],
  );

  const float = useCallback((text: string, tone: Tone) => {
    const id = (nextId.current += 1);
    setFloats((items) => [...items, { id, text, tone, offset: items.length }]);
    setTimeout(() => setFloats((items) => items.filter((item) => item.id !== id)), 1700);
  }, []);

  const value = useMemo<FxContextValue>(
    () => ({
      settings,
      setSettings,
      float,
      sfx,
      levelUp: (level, coins) => {
        setOverlay({ kind: 'levelUp', level, coins });
        sfx('levelUp');
      },
      ko: (coinsLost) => {
        setOverlay({ kind: 'ko', coinsLost });
        sfx('ko');
      },
      hitCount,
      hit: () => setHitCount((n) => n + 1),
    }),
    [settings, setSettings, float, sfx, hitCount],
  );

  return (
    <FxContext.Provider value={value}>
      {children}
      {/* Anunțurile apar și pentru cititoarele de ecran. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[32vh] z-40 flex flex-col items-center gap-1">
        {floats.map((item) => (
          <span
            key={item.id}
            className={`animate-float-up font-display text-lg font-bold sm:text-xl ${TONES[item.tone]}`}
            style={{ animationDelay: `${item.offset * 120}ms` }}
          >
            {item.text}
          </span>
        ))}
      </div>
      {overlay && <OverlayScreen overlay={overlay} onClose={() => setOverlay(null)} />}
    </FxContext.Provider>
  );
}

function OverlayScreen({ overlay, onClose }: { overlay: NonNullable<Overlay>; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, overlay.kind === 'levelUp' ? 2600 : 3200);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [overlay, onClose]);

  const levelUp = overlay.kind === 'levelUp';
  return (
    <div
      role="alertdialog"
      aria-label={levelUp ? `Nivel nou: ${overlay.level}` : 'Ai căzut'}
      onClick={onClose}
      className={`fixed inset-0 z-[60] flex cursor-pointer items-center justify-center px-4 ${
        levelUp ? 'bg-abyss/80' : 'bg-black/85'
      } animate-fade-in`}
    >
      <div className="w-full text-center">
        {levelUp ? (
          <>
            <p className="ornament mx-auto max-w-md font-display text-sm tracking-[0.4em] text-gold uppercase">
              <span>◆</span>
            </p>
            <p className="glow-gold mt-4 animate-pop font-display text-4xl font-black tracking-wider text-gold uppercase sm:text-6xl">
              Ai avansat
            </p>
            <p className="mt-4 font-display text-2xl text-ink sm:text-3xl">Nivelul {overlay.level}</p>
            <p className="mt-3 text-lg text-muted">
              +{overlay.coins} <span className="text-gold">◈</span> aur
            </p>
          </>
        ) : (
          <div className="border-y border-blood/40 bg-gradient-to-r from-transparent via-black to-transparent py-10">
            <p className="glow-blood animate-pop font-display text-5xl font-medium tracking-[0.15em] text-blood uppercase sm:text-7xl">
              Ai căzut
            </p>
            <p className="mt-6 text-lg text-ink">Viața ta a ajuns la zero.</p>
            <p className="text-lg text-muted">
              Ai pierdut <strong className="text-gold">{overlay.coinsLost} aur</strong> și te ridici cu 50 de puncte de viață.
            </p>
          </div>
        )}
        <p className="mt-8 text-sm text-muted">Apasă oriunde pentru a continua</p>
      </div>
    </div>
  );
}

export function useFx(): FxContextValue {
  const context = useContext(FxContext);
  if (!context) throw new Error('useFx trebuie folosit în FxProvider');
  return context;
}
