import { useId } from 'react';

/** Ilustrații vectoriale pentru erou și monștri (fără pixel art). */

export type HeroMood = 'vigorous' | 'steady' | 'wounded' | 'fallen';

/** Starea eroului după viață, ca în Specificații: energic, obișnuit, obosit, căzut. */
export function moodForHp(hp: number): HeroMood {
  if (hp <= 0) return 'fallen';
  if (hp < 30) return 'wounded';
  if (hp < 70) return 'steady';
  return 'vigorous';
}

const MOOD: Record<HeroMood, { label: string; caption: string; eyes: string; glow: number }> = {
  vigorous: { label: 'Cavalerul tău e plin de vigoare', caption: 'Plin de vigoare', eyes: '#f0c76c', glow: 1 },
  steady: { label: 'Cavalerul tău e în formă', caption: 'În formă', eyes: '#e07b2a', glow: 0.7 },
  wounded: { label: 'Cavalerul tău e rănit', caption: 'Rănit', eyes: '#8a7a66', glow: 0.25 },
  fallen: { label: 'Cavalerul tău a căzut', caption: 'Căzut', eyes: '#d0323b', glow: 0 },
};

export function HeroPortrait({ mood, size = 96 }: { mood: HeroMood; size?: number }) {
  const id = useId();
  const m = MOOD[mood];
  const fallen = mood === 'fallen';
  const wounded = mood === 'wounded' || fallen;

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={m.label}>
        <defs>
          <radialGradient id={`${id}-bg`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#3a2c1f" />
            <stop offset="100%" stopColor="#0b0907" />
          </radialGradient>
          <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e4e6ea" />
            <stop offset="45%" stopColor="#9aa1ad" />
            <stop offset="100%" stopColor="#3f444c" />
          </linearGradient>
          <linearGradient id={`${id}-plume`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5525a" />
            <stop offset="100%" stopColor="#6e141a" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        <circle cx="32" cy="32" r="31" fill={`url(#${id}-bg)`} stroke="#d9ab4a" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="#4a3a28" strokeWidth="1" />

        <g transform={fallen ? 'rotate(-14 32 40) translate(0 3)' : undefined} opacity={fallen ? 0.75 : 1}>
          {/* pana */}
          <path d="M32 7c7 1 12 6 11 13-3-4-7-6-11-6z" fill={`url(#${id}-plume)`} />
          {/* coiful */}
          <path
            d="M16 31c0-11 7-18 16-18s16 7 16 18v12c0 6-6 11-16 13-10-2-16-7-16-13z"
            fill={`url(#${id}-steel)`}
            stroke="#1e1b17"
            strokeWidth="1.2"
          />
          <path d="M32 13v13" stroke="#5a606a" strokeWidth="1.2" />
          {/* vizieră */}
          <rect x="19" y="29" width="26" height="5" rx="2.5" fill="#0b0907" />
          <rect x="30.6" y="26" width="2.8" height="18" rx="1.2" fill="#4b5059" />
          {/* ochii din vizieră */}
          {fallen ? (
            <g stroke={m.eyes} strokeWidth="1.3" strokeLinecap="round">
              <path d="M23 30l3 3M26 30l-3 3M38 30l3 3M41 30l-3 3" />
            </g>
          ) : (
            <g fill={m.eyes}>
              <ellipse cx="25" cy="31.5" rx="2.4" ry="1.1" filter={`url(#${id}-glow)`} opacity={m.glow} />
              <ellipse cx="39" cy="31.5" rx="2.4" ry="1.1" filter={`url(#${id}-glow)`} opacity={m.glow} />
              <ellipse cx="25" cy="31.5" rx="1.6" ry="0.7" opacity={Math.max(m.glow, 0.5)} />
              <ellipse cx="39" cy="31.5" rx="1.6" ry="0.7" opacity={Math.max(m.glow, 0.5)} />
            </g>
          )}
          {/* găurile de respirație */}
          <g fill="#1e1b17">
            {[24, 27, 37, 40].map((x) => (
              <circle key={x} cx={x} cy="44" r="0.9" />
            ))}
          </g>
          {/* zgârieturi și crăpături când e rănit */}
          {wounded && (
            <g stroke="#1a1612" strokeWidth="0.9" fill="none" strokeLinecap="round">
              <path d="M42 18l-3 5 2 3-3 4" />
              <path d="M20 38l4 2" />
            </g>
          )}
          {fallen && <path d="M18 22l6 4-2 4 5 3" stroke="#d0323b" strokeWidth="1" fill="none" />}
        </g>
      </svg>
      <figcaption className={`font-display text-xs font-bold tracking-wider uppercase ${fallen ? 'text-blood' : 'text-muted'}`}>
        {m.caption}
      </figcaption>
    </figure>
  );
}

/** Craniul unei misiuni ratate; cu coarne și ochi de jar pentru un Boss. */
export function MonsterIcon({ boss = false, size = 56 }: { boss?: boolean; size?: number }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={boss ? 'Demon' : 'Craniu'}>
      <defs>
        <radialGradient id={`${id}-bone`} cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor={boss ? '#b8434a' : '#efe6d2'} />
          <stop offset="70%" stopColor={boss ? '#6e141a' : '#b9ab8e'} />
          <stop offset="100%" stopColor={boss ? '#2a0608' : '#5e5340'} />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      {boss && (
        <g fill="#2a2018" stroke="#d9ab4a" strokeWidth="0.8">
          <path d="M17 22C9 16 8 8 12 3c1 7 5 11 11 13z" />
          <path d="M47 22c8-6 9-14 5-19-1 7-5 11-11 13z" />
        </g>
      )}
      <path
        d="M32 10c12 0 21 8 21 20 0 7-3 11-7 13v7c0 2-2 4-4 4H22c-2 0-4-2-4-4v-7c-4-2-7-6-7-13 0-12 9-20 21-20z"
        fill={`url(#${id}-bone)`}
        stroke="#1e1b17"
        strokeWidth="1.2"
      />
      <g fill="#0b0907">
        <path d="M19 31c0-4 3-6 6-6s6 3 5 7-4 5-7 5-4-3-4-6z" />
        <path d="M45 31c0-4-3-6-6-6s-6 3-5 7 4 5 7 5 4-3 4-6z" />
        <path d="M32 37l-3 6h6z" />
      </g>
      <g fill={boss ? '#ff8a2a' : '#d0323b'}>
        <circle cx="25" cy="31.5" r="2.6" filter={`url(#${id}-glow)`} />
        <circle cx="39" cy="31.5" r="2.6" filter={`url(#${id}-glow)`} />
        <circle cx="25" cy="31.5" r="1.2" />
        <circle cx="39" cy="31.5" r="1.2" />
      </g>
      <g stroke="#1e1b17" strokeWidth="1">
        {[24, 28, 32, 36, 40].map((x) => (
          <path key={x} d={`M${x} 47v6`} />
        ))}
      </g>
    </svg>
  );
}
