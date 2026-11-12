interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: 'xp' | 'hp' | 'stamina';
}

const FILL = {
  xp: 'from-[#f0c76c] via-[#d9ab4a] to-[#8a5f1c]',
  hp: 'from-[#e5525a] via-[#d0323b] to-[#6e141a]',
  stamina: 'from-[#79b0ee] via-[#4f8fd6] to-[#1f4f8a]',
};
const LABEL = { xp: 'text-gold', hp: 'text-blood', stamina: 'text-mana' };

/** Bară de progres gravată; valoarea apare și ca text, nu doar prin culoare. */
export function StatBar({ label, value, max, color }: StatBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className={`font-display text-xs font-bold tracking-wider uppercase ${LABEL[color]}`}>{label}</span>
        <span className="font-display text-xs text-ink tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-3.5 overflow-hidden rounded-[2px] border border-line bg-abyss shadow-[inset_0_2px_4px_rgb(0_0_0/0.8)]"
      >
        <div
          className={`h-full bg-gradient-to-b ${FILL[color]} shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-[width] duration-700`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
