interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: 'xp' | 'hp';
}

const FILL = { xp: 'bg-xp', hp: 'bg-hp' };

/** Bară de progres pentru XP și HP; valoarea apare și ca text, nu doar prin culoare. */
export function StatBar({ label, value, max, color }: StatBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-slate-600 dark:text-slate-400">
          {value} / {max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${FILL[color]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
