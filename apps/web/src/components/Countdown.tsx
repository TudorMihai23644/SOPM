import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** Cronometru până la termen: „T-02:14:33” sub o zi, „3Z 05H” peste. */
export function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return <span className="pixel text-[10px] text-danger">TIMP EXPIRAT</span>;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const urgent = ms < 3_600_000;

  return (
    <span className={`pixel text-[10px] tabular-nums ${urgent ? 'animate-blink text-danger' : days === 0 ? 'text-gold' : 'text-cyan'}`}>
      {days > 0 ? `${days}Z ${pad(hours)}H` : `T-${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
    </span>
  );
}
