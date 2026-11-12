import { useEffect, useState } from 'react';

interface UndoToastProps {
  message: string;
  until: string;
  onUndo: () => void;
  onExpire: () => void;
}

/** Mesajul „Anulează”, vizibil cât timp Undo mai e posibil (10 secunde). */
export function UndoToast({ message, until, onUndo, onExpire }: UndoToastProps) {
  const remaining = () => Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = remaining();
      setSeconds(left);
      if (left <= 0) onExpire();
    }, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  return (
    <div
      role="status"
      className="panel fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between gap-4 border-lime px-4 py-3 shadow-[0_0_20px_color-mix(in_srgb,var(--color-lime)_30%,transparent)]"
    >
      <span className="text-ink">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 shrink-0 rounded-md border-2 border-gold px-3 font-bold text-gold uppercase hover:bg-gold/10"
      >
        Anulează · {seconds}s
      </button>
    </div>
  );
}
