interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: 'xp' | 'hp' | 'stamina';
  segments?: number;
}

const FILL = {
  xp: 'bg-gold shadow-[0_0_6px_var(--color-gold)]',
  hp: 'bg-lime shadow-[0_0_6px_var(--color-lime)]',
  stamina: 'bg-cyan shadow-[0_0_6px_var(--color-cyan)]',
};
const LABEL = { xp: 'text-gold', hp: 'text-lime', stamina: 'text-cyan' };

/** Bară segmentată ca în jocurile arcade; valoarea apare și ca text, nu doar prin culoare. */
export function StatBar({ label, value, max, color, segments = 20 }: StatBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const filled = Math.round(ratio * segments);
  const low = color === 'hp' && ratio <= 0.3;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className={`pixel text-[10px] ${low ? 'text-danger' : LABEL[color]}`}>{label}</span>
        <span className="pixel text-[10px] text-ink tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="flex gap-[3px] rounded-sm border-2 border-line bg-void p-[3px]"
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-[1px] transition-colors duration-300 ${
              i < filled ? (low ? 'bg-danger shadow-[0_0_6px_var(--color-danger)]' : FILL[color]) : 'bg-panel-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
