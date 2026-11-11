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
      className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md items-center justify-between gap-4 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-amber-300 hover:bg-white/10 dark:text-brand-700 dark:hover:bg-slate-900/10"
      >
        Anulează ({seconds} s)
      </button>
    </div>
  );
}
