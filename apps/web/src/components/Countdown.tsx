import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** Timpul rămas până la termen: „02:14:33” sub o zi, „3z 05h” peste. */
export function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return <span className="font-display text-xs font-bold tracking-wider text-blood uppercase">Timpul a expirat</span>;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const urgent = ms < 3_600_000;

  return (
    <span
      className={`font-display text-xs font-bold tracking-wider tabular-nums ${urgent ? 'animate-flicker text-blood' : days === 0 ? 'text-ember' : 'text-muted'}`}
    >
      ⧗ {days > 0 ? `${days}z ${pad(hours)}h` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
    </span>
  );
}
