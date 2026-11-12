import { useId } from 'react';

interface OrbProps {
  label: string;
  value: number;
  max: number;
  kind: 'life' | 'stamina';
}

const COLORS = {
  life: { light: '#ff6b6b', mid: '#c0242c', dark: '#4a0a0e', text: 'text-blood' },
  stamina: { light: '#8ec5ff', mid: '#3b78c4', dark: '#0c2343', text: 'text-mana' },
};

/** Glob de viață sau de Stamina, ca în RPG-urile dark fantasy; umplerea arată proporția. */
export function Orb({ label, value, max, kind, compact = false }: OrbProps & { compact?: boolean }) {
  const id = useId();
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const c = COLORS[kind];
  const level = 100 - ratio * 100;

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 100"
        className={`drop-shadow-[0_4px_10px_rgb(0_0_0/0.8)] ${compact ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-24 w-24 sm:h-28 sm:w-28'}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <defs>
          <radialGradient id={`${id}-fill`} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="55%" stopColor={c.mid} />
            <stop offset="100%" stopColor={c.dark} />
          </radialGradient>
          <radialGradient id={`${id}-glass`} cx="35%" cy="25%" r="40%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <circle cx="50" cy="50" r="42" />
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="#120d0a" stroke="#4a3a28" strokeWidth="4" />
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y={8 + (84 * level) / 100} width="100" height="100" fill={`url(#${id}-fill)`} className="transition-[y] duration-700" />
        </g>
        <circle cx="50" cy="50" r="42" fill={`url(#${id}-glass)`} />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#d9ab4a" strokeOpacity="0.55" strokeWidth="1.5" />
        <text x="50" y="56" textAnchor="middle" className="font-display" fontSize="18" fontWeight="700" fill="#ecdfc4" stroke="#000" strokeWidth="0.6" paintOrder="stroke">
          {value}
        </text>
      </svg>
      <figcaption className={`font-display text-xs font-bold tracking-wider uppercase [text-shadow:0_1px_3px_#000] ${c.text}`}>
        {label} <span className="text-muted">/ {max}</span>
      </figcaption>
    </figure>
  );
}
